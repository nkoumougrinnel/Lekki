import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireUser } from "@/lib/auth-middleware";

const MAX_CONTENT = 24000;

async function assertEspace(base44, espaceId) {
  const espace = await base44.entities.Espace.get(espaceId);
  if (!espace) throw Object.assign(new Error("Espace introuvable"), { status: 404 });
  return espace;
}

function truncate(value, max = MAX_CONTENT) {
  const text = String(value || "");
  return text.length > max ? `${text.slice(0, max)}\n\n[…extrait tronqué…]` : text;
}

function sourceBlock(source, index) {
  const chapters = (source.chapters || [])
    .map((chapter) => `${chapter.title}${chapter.page ? ` (p. ${chapter.page})` : ""}`)
    .join(" · ");
  return [
    `### [S${index + 1}] id=${source.id} — ${source.name}`,
    `Type: ${source.kind || "document"}${source.page_count ? ` · ${source.page_count} pages` : ""}`,
    `Résumé: ${source.summary || "—"}`,
    `Chapitres: ${chapters || "—"}`,
    `Contenu:`,
    truncate(source.content, 6000),
  ].join("\n");
}

function buildContext(sources, budget = 40000) {
  let total = 0;
  const blocks = [];
  for (let index = 0; index < sources.length; index += 1) {
    const block = sourceBlock(sources[index], index);
    if (total + block.length > budget) break;
    blocks.push(block);
    total += block.length;
  }
  return blocks.join("\n\n");
}

async function loadSources(base44, espaceId, sourceIds) {
  const admin = base44.asServiceRole;
  const page =
    Array.isArray(sourceIds) && sourceIds.length
      ? await admin.entities.Source.filter(
          { espace_id: espaceId, id: { $in: sourceIds } },
          { limit: 40 },
        )
      : await admin.entities.Source.filter({ espace_id: espaceId }, { limit: 40 });
  return page.items || [];
}

export const extractSource = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(
    z.object({
      espaceId: z.string().min(1),
      name: z.string().min(1).max(200),
      fileUri: z.string().max(3000).optional(),
      text: z.string().max(120000).optional(),
    }),
  )
  .handler(async ({ data, context }) => {
    const base44 = context.getBase44();
    await assertEspace(base44, data.espaceId);
    const core = base44.asServiceRole.integrations.Core;

    let fileUrls;
    if (data.fileUri) {
      const { signed_url } = await core.CreateFileSignedUrl({ file_uri: data.fileUri, expires_in: 900 });
      fileUrls = [signed_url];
    }

    const prompt = `Tu prépares un document de cours pour un assistant qui répond en citant ses sources.
Analyse ${data.fileUri ? "le fichier joint" : "le texte fourni"} et renvoie uniquement les champs demandés, en français.
- summary : 3 à 5 phrases qui disent de quoi parle le document.
- content : le contenu fidèle et structuré en markdown (titres, listes, définitions, formules), sans rien inventer, en conservant les numéros de page quand ils apparaissent. Maximum 15000 caractères.
- key_points : 5 à 8 notions clés, une phrase chacune.
- chapters : les chapitres ou parties détectés, avec leur page de début si elle est visible (sinon 0).
- page_count : nombre de pages estimé.
${data.text ? `\nTexte fourni :\n${truncate(data.text, 60000)}` : ""}`;

    const result = await core.InvokeLLM({
      prompt,
      file_urls: fileUrls,
      response_json_schema: {
        type: "object",
        properties: {
          summary: { type: "string" },
          content: { type: "string" },
          key_points: { type: "array", items: { type: "string" } },
          chapters: {
            type: "array",
            items: {
              type: "object",
              properties: { title: { type: "string" }, page: { type: "number" } },
            },
          },
          page_count: { type: "number" },
        },
        required: ["summary", "content"],
      },
    });

    return {
      summary: result.summary || "",
      content: truncate(result.content),
      key_points: Array.isArray(result.key_points) ? result.key_points.slice(0, 10) : [],
      chapters: Array.isArray(result.chapters) ? result.chapters.slice(0, 20) : [],
      page_count: Number(result.page_count) || 0,
    };
  });

export const askLekki = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(
    z.object({
      espaceId: z.string().min(1),
      question: z.string().min(1).max(2000),
      sourceIds: z.array(z.string()).max(40).default([]),
      conversationId: z.string().optional(),
    }),
  )
  .handler(async ({ data, context }) => {
    const base44 = context.getBase44();
    const espace = await assertEspace(base44, data.espaceId);
    const sources = await loadSources(base44, data.espaceId, data.sourceIds);

    if (!sources.length) {
      throw Object.assign(new Error("Ajoute au moins une source avant de poser une question."), {
        status: 400,
      });
    }

    const previous = data.conversationId
      ? (await base44.entities.Message.filter(
          { conversation_id: data.conversationId },
          { sort: "created_date", limit: 12 },
        )).items
      : [];

    const history = previous
      .map((message) => `${message.role === "user" ? "Étudiant" : "Lekki"}: ${truncate(message.content, 800)}`)
      .join("\n");

    const prompt = `Tu es Lekki, l'assistant de la promo « ${espace.name} ». Tu réponds UNIQUEMENT à partir des sources ci-dessous.
Règles :
- Si l'information n'est pas dans les sources, dis-le clairement au lieu d'inventer.
- Réponds en français, en markdown, de façon directe (5 à 12 lignes), avec les définitions et formules utiles.
- Chaque affirmation importante porte une citation : source_id EXACT (l'id fourni), source_name, location ("p. 12" ou "chap. 3 · p. 12"), quote (extrait court et fidèle).
- Termine par 3 questions de suivi courtes, utiles pour réviser.

SOURCES :
${buildContext(sources)}

${history ? `HISTORIQUE RÉCENT :\n${history}\n` : ""}
QUESTION DE L'ÉTUDIANT : ${data.question}`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          answer: { type: "string" },
          citations: {
            type: "array",
            items: {
              type: "object",
              properties: {
                source_id: { type: "string" },
                source_name: { type: "string" },
                location: { type: "string" },
                quote: { type: "string" },
              },
            },
          },
          follow_ups: { type: "array", items: { type: "string" } },
        },
        required: ["answer", "citations"],
      },
    });

    const citations = (Array.isArray(result.citations) ? result.citations : [])
      .slice(0, 6)
      .map((citation) => {
        const match =
          sources.find((source) => source.id === citation.source_id) ||
          sources.find((source) => source.name === citation.source_name) ||
          sources[0];
        return {
          source_id: match.id,
          source_name: citation.source_name || match.name,
          location: citation.location || "",
          quote: citation.quote || "",
        };
      });

    const followUps = (Array.isArray(result.follow_ups) ? result.follow_ups : []).slice(0, 4);
    const now = new Date().toISOString();

    let conversationId = data.conversationId;
    if (!conversationId) {
      const conversation = await base44.entities.Conversation.create({
        espace_id: data.espaceId,
        title: data.question.slice(0, 70),
        last_message_at: now,
      });
      conversationId = conversation.id;
    } else {
      await base44.entities.Conversation.update(conversationId, { last_message_at: now });
    }

    await base44.entities.Message.create({
      espace_id: data.espaceId,
      conversation_id: conversationId,
      role: "user",
      content: data.question,
    });

    const assistant = await base44.entities.Message.create({
      espace_id: data.espaceId,
      conversation_id: conversationId,
      role: "assistant",
      content: result.answer || "",
      citations,
      follow_ups: followUps,
    });

    return {
      conversationId,
      message: assistant,
      answer: result.answer || "",
      citations,
      follow_ups: followUps,
    };
  });

const artefactPrompts = {
  fiche: (context, espace) => `À partir des sources de l'espace « ${espace.name} », écris une fiche de révision en français, en markdown.
Structure : un titre, l'essentiel en 3 phrases, puis des sections thématiques avec définitions, formules et points d'examen. Termine par « À retenir » avec 3 puces.
Reste fidèle aux sources, cite les pages entre parenthèses quand elles sont connues. Maximum 900 mots.

SOURCES :
${context}`,
  quiz: (context, espace) => `À partir des sources de l'espace « ${espace.name} », crée un quiz de révision en français.
10 questions à choix multiples, 4 options chacune, une seule bonne réponse, une explication courte et la source (nom + page si connue). Les questions doivent porter sur les notions réellement présentes dans les sources, du plus simple au plus difficile.

SOURCES :
${context}`,
  carte: (context, espace) => `À partir des sources de l'espace « ${espace.name} », construis une carte mentale en français.
Un titre central, puis 4 à 6 branches thématiques, chacune avec 2 à 5 notions courtes. Fidèle aux sources.

SOURCES :
${context}`,
  audio: (context, espace) => `Écris un script audio de révision en français (2 à 3 minutes, 1500 caractères maximum) à partir des sources de l'espace « ${espace.name} ».
Ton naturel et parlé, comme un camarade qui explique : une accroche, les 4 notions essentielles, un point d'examen, une phrase de fin. Pas de titres markdown, pas de symboles, uniquement du texte prononçable.

SOURCES :
${context}`,
};

const artefactSchemas = {
  quiz: {
    type: "object",
    properties: {
      questions: {
        type: "array",
        items: {
          type: "object",
          properties: {
            question: { type: "string" },
            options: { type: "array", items: { type: "string" } },
            answer_index: { type: "number" },
            explanation: { type: "string" },
            source: { type: "string" },
          },
          required: ["question", "options", "answer_index"],
        },
      },
    },
    required: ["questions"],
  },
  carte: {
    type: "object",
    properties: {
      title: { type: "string" },
      branches: {
        type: "array",
        items: {
          type: "object",
          properties: {
            title: { type: "string" },
            points: { type: "array", items: { type: "string" } },
          },
          required: ["title", "points"],
        },
      },
    },
    required: ["title", "branches"],
  },
};

export const generateArtefact = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(
    z.object({
      espaceId: z.string().min(1),
      type: z.enum(["fiche", "quiz", "carte", "audio"]),
      sourceIds: z.array(z.string()).max(40).default([]),
    }),
  )
  .handler(async ({ data, context }) => {
    const base44 = context.getBase44();
    const espace = await assertEspace(base44, data.espaceId);
    const sources = await loadSources(base44, data.espaceId, data.sourceIds);

    if (!sources.length) {
      throw Object.assign(new Error("Ajoute au moins une source avant de générer."), { status: 400 });
    }

    const core = base44.asServiceRole.integrations.Core;
    const contextText = buildContext(sources);
    const prompt = artefactPrompts[data.type](contextText, espace);

    if (data.type === "audio") {
      const script = await core.InvokeLLM({ prompt });
      const text = String(script || "").slice(0, 2200);
      const { url } = await core.GenerateSpeech({ text, voice: "river", language_code: "fr" });
      return {
        type: data.type,
        title: `Résumé audio · ${espace.name}`,
        content: text,
        audio_url: url,
      };
    }

    if (data.type === "fiche") {
      const markdown = await core.InvokeLLM({ prompt });
      return {
        type: data.type,
        title: `Fiche de révision · ${espace.name}`,
        content: String(markdown || ""),
        audio_url: "",
      };
    }

    const structured = await core.InvokeLLM({
      prompt,
      response_json_schema: artefactSchemas[data.type],
    });

    return {
      type: data.type,
      title:
        data.type === "quiz"
          ? `Quiz · ${espace.name}`
          : structured.title || `Carte mentale · ${espace.name}`,
      content: JSON.stringify(structured),
      audio_url: "",
    };
  });