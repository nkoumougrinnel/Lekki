import { Router, Request, Response } from "express";
import { GoogleGenAI } from "@google/genai";
import {
  INITIAL_USERS,
  INITIAL_WORKSPACES,
  INITIAL_MEMBERS,
  INITIAL_FOLDERS,
  INITIAL_FILES,
  INITIAL_WIKI_PAGES,
  ApiUser,
  Workspace,
  WorkspaceMember,
  DriveFolder,
  DriveFile,
  WikiPage,
  USER_GRINNEL_ID,
  WS_SUPPTIC_ID,
} from "./seedData.js";

export const apiRouter = Router();

// In-memory data state
let users: ApiUser[] = [...INITIAL_USERS];
let workspaces: Workspace[] = [...INITIAL_WORKSPACES];
let members: WorkspaceMember[] = [...INITIAL_MEMBERS];
let folders: DriveFolder[] = [...INITIAL_FOLDERS];
let files: DriveFile[] = [...INITIAL_FILES];
let wikiPages: WikiPage[] = [...INITIAL_WIKI_PAGES];

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  sources?: Array<{
    type: "document" | "wiki";
    title: string;
    detail?: string;
    location?: string;
    file_extension?: string;
    size_bytes?: number;
    excerpt: string;
    score: number;
    id: string;
  }>;
  contradiction?: string | null;
}

let chatHistory: ChatMessage[] = [
  {
    id: "msg-init-1",
    role: "assistant",
    content: `Bonjour ! Je suis **Lekki AI**, votre assistant de recherche et de compréhension documentaire.

Mon périmètre d'action est strictement aligné sur **vos accès actuels** :
- 📁 Vos documents personnels & partagés
- 🔗 Les fichiers partagés avec vous
- ▣ Le Workspace actif (**SUP'PTIC — 3A IR**) : fichiers originaux et fiches Wiki

Posez-moi une question sur vos cours, demandez un comparatif (ex: *TCP vs UDP*), ou interrogez le calcul de coût OSPF !`,
    timestamp: new Date().toISOString(),
  },
];

// Helper: Get Current User (defaults to Grinnel as primary demo persona)
function getCurrentUser(req: Request): ApiUser {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    const found = users.find((u) => u.id === token || u.username === token);
    if (found) return found;
  }
  return users.find((u) => u.id === USER_GRINNEL_ID) || users[0];
}

// ── Auth & Users Routes ─────────────────────────────────────────────────────
apiRouter.get("/auth/me", (req: Request, res: Response) => {
  const user = getCurrentUser(req);
  return res.json(user);
});

apiRouter.post("/auth/login", (req: Request, res: Response) => {
  const username = String(req.body.username || "grinnel").toLowerCase();
  let user = users.find((u) => u.username.toLowerCase() === username);
  if (!user) {
    user = {
      id: `u-${Date.now()}`,
      username,
      name: username.charAt(0).toUpperCase() + username.slice(1),
      email: `${username}@lekki.io`,
      role: "editor",
    };
    users.push(user);
  }
  return res.json({
    access_token: user.id,
    token_type: "bearer",
    user,
  });
});

apiRouter.get("/users", (_req: Request, res: Response) => {
  return res.json(users);
});

// ── Workspaces Routes ───────────────────────────────────────────────────────
apiRouter.get("/workspaces", (req: Request, res: Response) => {
  const user = getCurrentUser(req);
  // Return workspaces where user is member or owner
  const userWsIds = members
    .filter((m) => m.user_id === user.id)
    .map((m) => m.workspace_id);
  const userWorkspaces = workspaces.filter(
    (w) => w.owner_id === user.id || userWsIds.includes(w.id)
  );
  return res.json(userWorkspaces.length > 0 ? userWorkspaces : workspaces);
});

apiRouter.get("/workspaces/:id", (req: Request, res: Response) => {
  const ws = workspaces.find((w) => w.id === req.params.id);
  if (!ws) return res.status(404).json({ detail: "Workspace introuvable" });
  return res.json(ws);
});

apiRouter.post("/workspaces", (req: Request, res: Response) => {
  const user = getCurrentUser(req);
  const { name, description, icon = "Folder" } = req.body;
  const newWs: Workspace = {
    id: `ws-${Date.now()}`,
    name: name || "Nouveau Workspace",
    description: description || null,
    owner_id: user.id,
    icon,
    created_at: new Date().toISOString(),
  };
  workspaces.push(newWs);
  members.push({
    id: `m-${Date.now()}`,
    workspace_id: newWs.id,
    user_id: user.id,
    role: "owner",
    joined_at: new Date().toISOString(),
  });
  return res.status(201).json(newWs);
});

apiRouter.get("/workspaces/:id/members", (req: Request, res: Response) => {
  const wsMembers = members
    .filter((m) => m.workspace_id === req.params.id)
    .map((m) => {
      const u = users.find((usr) => usr.id === m.user_id);
      return {
        ...m,
        user_name: u?.name || u?.username || "Utilisateur",
        user_email: u?.email || "",
      };
    });
  return res.json(wsMembers);
});

apiRouter.post("/workspaces/:id/members", (req: Request, res: Response) => {
  const { user_id, role = "member" } = req.body;
  const newMember: WorkspaceMember = {
    id: `m-${Date.now()}`,
    workspace_id: req.params.id,
    user_id,
    role,
    joined_at: new Date().toISOString(),
  };
  members.push(newMember);
  return res.status(201).json(newMember);
});

// ── Drive: Folders Routes ───────────────────────────────────────────────────
apiRouter.get("/drive/folders", (req: Request, res: Response) => {
  const user = getCurrentUser(req);
  const { workspace_id, scope } = req.query;

  let result = folders.filter((f) => !f.is_deleted);

  if (scope === "personal") {
    result = result.filter((f) => !f.workspace_id && f.owner_id === user.id);
  } else if (workspace_id) {
    result = result.filter((f) => f.workspace_id === workspace_id);
  } else {
    // Default to active workspace or personal
    result = result.filter(
      (f) => (!f.workspace_id && f.owner_id === user.id) || f.workspace_id === WS_SUPPTIC_ID
    );
  }

  return res.json(result);
});

apiRouter.post("/drive/folders", (req: Request, res: Response) => {
  const user = getCurrentUser(req);
  const { name, workspace_id, parent_id } = req.body;

  const newFolder: DriveFolder = {
    id: `f-${Date.now()}`,
    name: name || "Nouveau dossier",
    workspace_id: workspace_id || null,
    parent_id: parent_id || null,
    owner_id: user.id,
    created_at: new Date().toISOString(),
  };
  folders.push(newFolder);
  return res.status(201).json(newFolder);
});

apiRouter.put("/drive/folders/:id", (req: Request, res: Response) => {
  const folder = folders.find((f) => f.id === req.params.id);
  if (!folder) return res.status(404).json({ detail: "Dossier introuvable" });

  if (req.body.name) folder.name = req.body.name;
  if (req.body.parent_id !== undefined) folder.parent_id = req.body.parent_id;
  return res.json(folder);
});

apiRouter.delete("/drive/folders/:id", (req: Request, res: Response) => {
  folders = folders.filter((f) => f.id !== req.params.id);
  return res.status(204).send();
});

// ── Drive: Files Routes ─────────────────────────────────────────────────────
apiRouter.get("/drive/files", (req: Request, res: Response) => {
  const user = getCurrentUser(req);
  const { scope = "all", workspace_id, folder_id, search } = req.query;

  let result = [...files];

  if (scope === "trash") {
    result = result.filter((f) => f.is_deleted && f.owner_id === user.id);
  } else {
    // Exclude deleted
    result = result.filter((f) => !f.is_deleted);

    if (scope === "personal") {
      // User's personal files (not in a workspace)
      result = result.filter((f) => !f.workspace_id && f.owner_id === user.id);
    } else if (scope === "shared_with_me") {
      // Files shared specifically with this user
      result = result.filter((f) => f.shared_with.includes(user.id));
    } else if (scope === "starred") {
      result = result.filter((f) => f.is_starred);
    } else if (scope === "workspace") {
      const wsId = String(workspace_id || WS_SUPPTIC_ID);
      result = result.filter((f) => f.workspace_id === wsId);
    } else if (workspace_id) {
      result = result.filter((f) => f.workspace_id === String(workspace_id));
    }
  }

  if (folder_id !== undefined) {
    if (folder_id === "root" || folder_id === "") {
      result = result.filter((f) => !f.folder_id);
    } else {
      result = result.filter((f) => f.folder_id === folder_id);
    }
  }

  if (search) {
    const q = String(search).toLowerCase();
    result = result.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        (f.summary && f.summary.toLowerCase().includes(q)) ||
        f.content.toLowerCase().includes(q)
    );
  }

  // Attach owner name
  const enriched = result.map((f) => {
    const owner = users.find((u) => u.id === f.owner_id);
    return {
      ...f,
      owner_name: owner?.name || owner?.username || "Inconnu",
      is_owner: f.owner_id === user.id,
      is_shared: f.shared_with.length > 0,
    };
  });

  return res.json(enriched);
});

apiRouter.post("/drive/files", (req: Request, res: Response) => {
  const user = getCurrentUser(req);
  const {
    name,
    content,
    extension = "pdf",
    workspace_id,
    folder_id,
    summary,
  } = req.body;

  const ext = (extension || "pdf").replace(".", "") as "pdf" | "docx" | "pptx" | "txt" | "md";

  const newFile: DriveFile = {
    id: `file-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: name || `Nouveau_document.${ext}`,
    extension: ext,
    size_bytes: Buffer.byteLength(content || "", "utf8") || 128000,
    mime_type:
      ext === "pdf"
        ? "application/pdf"
        : ext === "docx"
        ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        : ext === "pptx"
        ? "application/vnd.openxmlformats-officedocument.presentationml.presentation"
        : "text/plain",
    page_count: Math.max(1, Math.ceil((content?.length || 500) / 1200)),
    is_starred: false,
    is_deleted: false,
    owner_id: user.id,
    workspace_id: workspace_id || null,
    folder_id: folder_id || null,
    shared_with: [],
    content: content || `# ${name || "Document"}\n\nDocument ajouté le ${new Date().toLocaleDateString("fr-FR")}.`,
    summary: summary || (content ? content.slice(0, 160) + "..." : "Document Lekki Drive."),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  files.unshift(newFile);
  return res.status(201).json(newFile);
});

apiRouter.get("/drive/files/:id", (req: Request, res: Response) => {
  const file = files.find((f) => f.id === req.params.id);
  if (!file) return res.status(404).json({ detail: "Fichier introuvable" });
  const owner = users.find((u) => u.id === file.owner_id);
  return res.json({
    ...file,
    owner_name: owner?.name || owner?.username || "Inconnu",
  });
});

apiRouter.put("/drive/files/:id", (req: Request, res: Response) => {
  const file = files.find((f) => f.id === req.params.id);
  if (!file) return res.status(404).json({ detail: "Fichier introuvable" });

  const { name, is_starred, is_deleted, folder_id, content } = req.body;
  if (name !== undefined) file.name = name;
  if (is_starred !== undefined) file.is_starred = Boolean(is_starred);
  if (is_deleted !== undefined) file.is_deleted = Boolean(is_deleted);
  if (folder_id !== undefined) file.folder_id = folder_id;
  if (content !== undefined) {
    file.content = content;
    file.size_bytes = Buffer.byteLength(content, "utf8");
  }
  file.updated_at = new Date().toISOString();

  return res.json(file);
});

apiRouter.get("/drive/files/:id/download", (req: Request, res: Response) => {
  const file = files.find((f) => f.id === req.params.id);
  if (!file) return res.status(404).json({ detail: "Fichier introuvable" });

  res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(file.name)}"`);
  res.setHeader("Content-Type", file.mime_type || "application/octet-stream");
  return res.send(file.content || `Fichier Lekki: ${file.name}`);
});

apiRouter.post("/drive/files/:id/share", (req: Request, res: Response) => {
  const file = files.find((f) => f.id === req.params.id);
  if (!file) return res.status(404).json({ detail: "Fichier introuvable" });

  const { user_ids } = req.body;
  if (Array.isArray(user_ids)) {
    file.shared_with = user_ids;
  }
  file.updated_at = new Date().toISOString();
  return res.json(file);
});

apiRouter.delete("/drive/files/:id", (req: Request, res: Response) => {
  const permanent = req.query.permanent === "true";
  const fileIndex = files.findIndex((f) => f.id === req.params.id);
  if (fileIndex === -1) return res.status(404).json({ detail: "Fichier introuvable" });

  if (permanent) {
    files.splice(fileIndex, 1);
  } else {
    files[fileIndex].is_deleted = true;
    files[fileIndex].updated_at = new Date().toISOString();
  }
  return res.status(204).send();
});

// ── Wiki: Pages Routes ──────────────────────────────────────────────────────
apiRouter.get("/wiki/pages", (req: Request, res: Response) => {
  const { workspace_id, category, status, topic, section } = req.query;
  const wsId = String(workspace_id || WS_SUPPTIC_ID);

  let result = wikiPages.filter((p) => p.workspace_id === wsId);

  if (topic) {
    result = result.filter((p) => p.topic === topic);
  }
  if (section) {
    result = result.filter((p) => p.section === section);
  }
  if (category) {
    result = result.filter((p) => p.category === category);
  }
  if (status) {
    result = result.filter((p) => p.status === status);
  }

  const enriched = result.map((p) => {
    const creator = users.find((u) => u.id === p.creator_id);
    const editor = users.find((u) => u.id === p.last_editor_id);
    const relatedWikiPages = wikiPages
      .filter((wp) => (p.related_wiki_ids || []).includes(wp.id))
      .map((wp) => ({ id: wp.id, title: wp.title, topic: wp.topic, section: wp.section }));

    return {
      ...p,
      creator_name: creator?.name || creator?.username || "Membre",
      last_editor_name: editor?.name || editor?.username || "Membre",
      related_wiki_pages: relatedWikiPages,
      linked_documents: files
        .filter((f) => (p.related_document_ids || []).includes(f.id))
        .map((f) => ({ id: f.id, name: f.name, extension: f.extension })),
    };
  });

  return res.json(enriched);
});

apiRouter.get("/wiki/pages/:id", (req: Request, res: Response) => {
  const page = wikiPages.find((p) => p.id === req.params.id);
  if (!page) return res.status(404).json({ detail: "Page Wiki introuvable" });

  page.view_count = (page.view_count || 0) + 1;

  const creator = users.find((u) => u.id === page.creator_id);
  const editor = users.find((u) => u.id === page.last_editor_id);

  const linkedDocs = files
    .filter((f) => (page.related_document_ids || []).includes(f.id))
    .map((f) => ({
      id: f.id,
      name: f.name,
      extension: f.extension,
      size_bytes: f.size_bytes,
      summary: f.summary,
    }));

  const relatedWikiPages = wikiPages
    .filter((wp) => (page.related_wiki_ids || []).includes(wp.id))
    .map((wp) => ({ id: wp.id, title: wp.title, topic: wp.topic, section: wp.section }));

  return res.json({
    ...page,
    creator_name: creator?.name || creator?.username || "Membre",
    last_editor_name: editor?.name || editor?.username || "Membre",
    linked_documents: linkedDocs,
    related_wiki_pages: relatedWikiPages,
  });
});

apiRouter.post("/wiki/pages", (req: Request, res: Response) => {
  const user = getCurrentUser(req);
  const {
    title,
    content,
    topic = "Réseaux",
    section = "Général",
    category = "cours",
    parent_page_id = null,
    workspace_id = WS_SUPPTIC_ID,
    related_document_ids = [],
    related_wiki_ids = [],
  } = req.body;

  const newPage: WikiPage = {
    id: `wiki-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title: title || "Nouvelle page Wiki",
    content: content || `# ${title || "Page Wiki"}\n\nContenu en cours de rédaction...`,
    topic,
    section,
    parent_page_id,
    category,
    workspace_id,
    status: "draft", // 🟡 Toujours créé en Brouillon
    creator_id: user.id,
    last_editor_id: user.id,
    view_count: 1,
    related_document_ids: Array.isArray(related_document_ids) ? related_document_ids : [],
    related_wiki_ids: Array.isArray(related_wiki_ids) ? related_wiki_ids : [],
    history: [
      {
        version: 1,
        author_id: user.id,
        author_name: user.name || user.username,
        updated_at: new Date().toISOString(),
        comment: "Création initiale de la page",
        content: content || `# ${title}\n\n`,
      },
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  wikiPages.unshift(newPage);
  return res.status(201).json(newPage);
});

apiRouter.put("/wiki/pages/:id", (req: Request, res: Response) => {
  const user = getCurrentUser(req);
  const page = wikiPages.find((p) => p.id === req.params.id);
  if (!page) return res.status(404).json({ detail: "Page Wiki introuvable" });

  const { title, content, topic, section, category, related_document_ids, related_wiki_ids, comment } = req.body;

  if (title) page.title = title;
  if (topic) page.topic = topic;
  if (section) page.section = section;
  if (category) page.category = category;
  if (Array.isArray(related_document_ids)) page.related_document_ids = related_document_ids;
  if (Array.isArray(related_wiki_ids)) page.related_wiki_ids = related_wiki_ids;

  if (content && content !== page.content) {
    page.content = content;
    const newVersion = (page.history?.length || 0) + 1;
    page.history.unshift({
      version: newVersion,
      author_id: user.id,
      author_name: user.name || user.username,
      updated_at: new Date().toISOString(),
      comment: comment || `Mise à jour v${newVersion}`,
      content,
    });
    // Passer automatiquement de brouillon à communautaire après contribution
    if (page.status === "draft") {
      page.status = "community";
    }
  }

  page.last_editor_id = user.id;
  page.updated_at = new Date().toISOString();

  return res.json(page);
});

apiRouter.post("/wiki/pages/:id/status", (req: Request, res: Response) => {
  const user = getCurrentUser(req);
  const page = wikiPages.find((p) => p.id === req.params.id);
  if (!page) return res.status(404).json({ detail: "Page Wiki introuvable" });

  const { status } = req.body; // 'draft' | 'community' | 'verified'
  if (["draft", "community", "verified"].includes(status)) {
    page.status = status;
    if (status === "verified") {
      page.status_verified_by = `${user.name || user.username} (Référent)`;
      page.status_verified_at = new Date().toISOString();
    } else {
      page.status_verified_by = null;
      page.status_verified_at = null;
    }
    page.updated_at = new Date().toISOString();
  }

  return res.json(page);
});

apiRouter.post("/wiki/pages/:id/restore/:version", (req: Request, res: Response) => {
  const user = getCurrentUser(req);
  const page = wikiPages.find((p) => p.id === req.params.id);
  if (!page) return res.status(404).json({ detail: "Page Wiki introuvable" });

  const targetVersion = parseInt(req.params.version, 10);
  const historicEntry = page.history.find((h) => h.version === targetVersion);
  if (!historicEntry) return res.status(404).json({ detail: "Version introuvable" });

  page.content = historicEntry.content;
  const nextVer = page.history.length + 1;
  page.history.unshift({
    version: nextVer,
    author_id: user.id,
    author_name: user.name || user.username,
    updated_at: new Date().toISOString(),
    comment: `Restauration de la version v${targetVersion}`,
    content: historicEntry.content,
  });
  page.last_editor_id = user.id;
  page.updated_at = new Date().toISOString();

  return res.json(page);
});

apiRouter.delete("/wiki/pages/:id", (req: Request, res: Response) => {
  wikiPages = wikiPages.filter((p) => p.id !== req.params.id);
  return res.status(204).send();
});

// ── Unified Search (Section 15) ─────────────────────────────────────────────
// Returns partitioned results: DOCUMENTS, WIKI, PARTAGES
apiRouter.get("/search", (req: Request, res: Response) => {
  const user = getCurrentUser(req);
  const q = String(req.query.q || "").toLowerCase().trim();
  const workspaceId = String(req.query.workspace_id || WS_SUPPTIC_ID);

  if (!q) {
    return res.json({ documents: [], wiki: [], shared: [] });
  }

  const terms = q.split(/\s+/).filter(Boolean);

  const matchScore = (text: string) => {
    const lower = text.toLowerCase();
    let score = 0;
    for (const t of terms) {
      if (lower.includes(t)) score += 1;
    }
    return score;
  };

  // 1. Documents in workspace + personal
  const docResults = files
    .filter((f) => !f.is_deleted && (f.workspace_id === workspaceId || (!f.workspace_id && f.owner_id === user.id)))
    .map((f) => ({
      file: f,
      score: matchScore(f.name) * 4 + matchScore(f.summary || "") * 2 + matchScore(f.content),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((item) => ({
      id: item.file.id,
      title: item.file.name,
      extension: item.file.extension,
      type: "document" as const,
      category: item.file.workspace_id ? "Workspace" : "Personnel",
      excerpt: item.file.summary || item.file.content.slice(0, 140) + "...",
      workspace_id: item.file.workspace_id,
    }));

  // 2. Wiki pages in active workspace
  const wikiResults = wikiPages
    .filter((p) => p.workspace_id === workspaceId)
    .map((p) => ({
      page: p,
      score: matchScore(p.title) * 5 + matchScore(p.content),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((item) => ({
      id: item.page.id,
      title: item.page.title,
      type: "wiki" as const,
      status: item.page.status,
      category: item.page.category,
      excerpt: item.page.content.replace(/^[#\s>-]+/, "").slice(0, 140) + "...",
    }));

  // 3. Shared with me
  const sharedResults = files
    .filter((f) => !f.is_deleted && f.shared_with.includes(user.id))
    .map((f) => ({
      file: f,
      score: matchScore(f.name) * 4 + matchScore(f.content),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((item) => {
      const owner = users.find((u) => u.id === item.file.owner_id);
      return {
        id: item.file.id,
        title: item.file.name,
        extension: item.file.extension,
        type: "shared" as const,
        shared_by: owner?.name || owner?.username || "Collaborateur",
        excerpt: item.file.summary || item.file.content.slice(0, 140) + "...",
      };
    });

  return res.json({
    documents: docResults.slice(0, 8),
    wiki: wikiResults.slice(0, 8),
    shared: sharedResults.slice(0, 6),
  });
});

// ── Lekki AI / Ask (Section 10, 11, 14, 16) ─────────────────────────────────
apiRouter.post("/ask", async (req: Request, res: Response) => {
  const user = getCurrentUser(req);
  const { question, workspace_id = WS_SUPPTIC_ID } = req.body;

  if (!question || typeof question !== "string") {
    return res.status(400).json({ detail: "Question requise" });
  }

  // Define strict perimeter of knowledge (Section 4):
  // 1. Personal docs
  const personalDocs = files.filter((f) => !f.is_deleted && !f.workspace_id && f.owner_id === user.id);
  // 2. Shared with me docs
  const sharedWithMeDocs = files.filter((f) => !f.is_deleted && f.shared_with.includes(user.id));
  // 3. Active Workspace docs
  const workspaceDocs = files.filter((f) => !f.is_deleted && f.workspace_id === workspace_id);
  // 4. Active Workspace wiki pages
  const workspaceWiki = wikiPages.filter((p) => p.workspace_id === workspace_id);

  const qLower = question.toLowerCase();
  const qTerms = qLower.split(/\s+/).filter((w) => w.length > 2);

  interface ScoredSource {
    id: string;
    type: "document" | "wiki";
    title: string;
    detail: string;
    location?: string;
    file_extension?: string;
    size_bytes?: number;
    workspace_id?: string | null;
    excerpt: string;
    score: number;
    content: string;
  }

  const scoredSources: ScoredSource[] = [];

  // Score documents
  const allDocs = [...personalDocs, ...sharedWithMeDocs, ...workspaceDocs];
  for (const doc of allDocs) {
    const paragraphs = doc.content.split(/\n\s*\n/).filter((p) => p.trim().length > 15);
    for (const para of paragraphs) {
      const pLower = para.toLowerCase();
      let match = 0;
      for (const t of qTerms) {
        if (pLower.includes(t)) match++;
        if (doc.name.toLowerCase().includes(t)) match += 2;
      }
      if (match > 0) {
        let situatedLoc = "Document original";
        if (doc.key_passages && doc.key_passages.length > 0) {
          const matchedKp = doc.key_passages.find((kp) =>
            qTerms.some((t) => kp.label.toLowerCase().includes(t) || kp.excerpt.toLowerCase().includes(t))
          ) || doc.key_passages[0];
          situatedLoc = `${matchedKp.location} · ${matchedKp.label}`;
        } else if (doc.page_count) {
          situatedLoc = `p. 1–${Math.min(10, doc.page_count)}`;
        }

        scoredSources.push({
          id: doc.id,
          type: "document",
          title: doc.name,
          detail: `Document original (${doc.extension.toUpperCase()})`,
          location: situatedLoc,
          file_extension: doc.extension,
          size_bytes: doc.size_bytes,
          workspace_id: doc.workspace_id,
          excerpt: para.replace(/^[#\s>-]+/, "").slice(0, 300),
          score: Math.min(0.98, 0.6 + match * 0.1),
          content: para,
        });
      }
    }
  }

  // Score Wiki pages
  for (const wp of workspaceWiki) {
    const sections = wp.content.split(/\n##\s+/).filter((s) => s.trim().length > 15);
    for (const sec of sections) {
      const secLower = sec.toLowerCase();
      let match = 0;
      for (const t of qTerms) {
        if (secLower.includes(t)) match++;
        if (wp.title.toLowerCase().includes(t)) match += 2.5;
      }
      if (match > 0) {
        const statusLabel =
          wp.status === "verified"
            ? "Wiki • Vérifiée 🟢"
            : wp.status === "community"
            ? "Wiki • Communautaire 🔵"
            : "Wiki • Brouillon 🟡";

        const wikiLoc = `${wp.topic || "Général"} / ${wp.section || "Général"}`;

        scoredSources.push({
          id: wp.id,
          type: "wiki",
          title: wp.title,
          detail: statusLabel,
          location: wikiLoc,
          workspace_id: wp.workspace_id,
          excerpt: sec.replace(/^[#\s>-]+/, "").slice(0, 300),
          score: Math.min(0.99, 0.65 + match * 0.1),
          content: sec,
        });
      }
    }
  }

  scoredSources.sort((a, b) => b.score - a.score);
  const topSources = scoredSources.slice(0, 4);

  // Check for contradiction / nuance (Section 14)
  let contradictionNote: string | null = null;
  const isOspfQuery = qLower.includes("ospf") || qLower.includes("cout") || qLower.includes("coût") || qLower.includes("bande passante");
  if (isOspfQuery) {
    contradictionNote =
      "⚠️ **Nuance de provenance identifiée entre sources :**\n" +
      "- **Source documentaire** (`Cours Réseaux — Routage Dynamique & OSPF.pdf`, p. 42) : Le coût standard RFC 2328 utilise une bande passante de référence par défaut de **100 Mbps**.\n" +
      "- **Source Wiki** (`OSPF — Comprendre simplement`, statut Vérifiée) : La fiche précise qu'en environnement moderne (1G / 10G), ce calcul par défaut sature à 1 et nécessite d'ajuster manuellement la commande `auto-cost reference-bandwidth 1000`.";
  }

  let answer = "";
  let provider = "Lekki AI Engine (Grounded Local)";

  if (process.env.GEMINI_API_KEY) {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const contextBlocks = topSources
        .map((s) => `[${s.type.toUpperCase()}: ${s.title} (${s.detail})]\n${s.excerpt}`)
        .join("\n\n");

      const prompt = `Tu es Lekki AI, un assistant de connaissance documentaire d'entreprise et d'école d'ingénieurs.
Principes stricts :
1. Tu ne réponds QU'À PARTIR des sources accessibles ci-dessous.
2. Distingue explicitement les sources originales (documents) et la mémoire collective (Wiki).
3. Si une nuance ou contradiction existe, signale-la avec transparence.
4. Réponds en français clair, précis et structuré (Markdown).

SOURCES ACCESSIBLES :
${contextBlocks || "Aucune source directement liée."}

QUESTION DE L'UTILISATEUR :
${question}`;

      const resGen = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });

      if (resGen.text) {
        answer = resGen.text;
        provider = "Gemini 2.5 Flash + Lekki Grounding";
      }
    } catch {
      // Fallback below
    }
  }

  if (!answer) {
    if (topSources.length > 0) {
      const docSources = topSources.filter((s) => s.type === "document");
      const wikiSources = topSources.filter((s) => s.type === "wiki");

      let body = "";
      if (wikiSources.length > 0) {
        body += `### Synthèse issue du Wiki (${wikiSources[0].detail})\n${wikiSources[0].excerpt}\n\n`;
      }
      if (docSources.length > 0) {
        body += `### Référence documentaire originale (${docSources[0].detail})\n${docSources[0].excerpt}\n\n`;
      }
      if (contradictionNote) {
        body += `\n${contradictionNote}\n`;
      }
      answer = body.trim();
    } else {
      answer = `Je n'ai pas trouvé d'élément correspondant à votre demande dans votre périmètre documentaire accessible (${workspaces.find((w) => w.id === workspace_id)?.name || "Workspace actif"}).\n\nVérifiez que le document ou la fiche Wiki a bien été ajouté ou partagé avec vous.`;
    }
  }

  const assistantMessage: ChatMessage = {
    id: `msg-${Date.now()}`,
    role: "assistant",
    content: answer,
    timestamp: new Date().toISOString(),
    sources: topSources.map((s) => ({
      id: s.id,
      type: s.type,
      title: s.title,
      detail: s.detail,
      location: s.location,
      file_extension: s.file_extension,
      size_bytes: s.size_bytes,
      workspace_id: s.workspace_id,
      excerpt: s.excerpt,
      score: s.score,
    })),
    contradiction: contradictionNote,
  };

  chatHistory.push({
    id: `usr-${Date.now()}`,
    role: "user",
    content: question,
    timestamp: new Date().toISOString(),
  });
  chatHistory.push(assistantMessage);

  return res.json({
    message_id: assistantMessage.id,
    answer,
    sources: assistantMessage.sources,
    contradiction: contradictionNote,
    confidence: topSources.length > 0 ? topSources[0].score : 0.6,
    provider,
  });
});

apiRouter.get("/chats/history", (_req: Request, res: Response) => {
  return res.json(chatHistory);
});

apiRouter.delete("/chats/history", (_req: Request, res: Response) => {
  chatHistory = [
    {
      id: `msg-reset-${Date.now()}`,
      role: "assistant",
      content: "Historique réinitialisé. Comment puis-je vous aider dans vos documents et Wiki ?",
      timestamp: new Date().toISOString(),
    },
  ];
  return res.status(204).send();
});

// Backward compatibility for legacy endpoints
apiRouter.get("/pages", (req: Request, res: Response) => {
  // Maps to wiki pages
  const list = wikiPages.map((wp) => ({
    id: wp.id,
    title: wp.title,
    content: wp.content,
    category: wp.category,
    status: wp.status === "draft" ? "draft" : "published",
    view_count: wp.view_count,
    workspace_id: wp.workspace_id,
    created_at: wp.created_at,
    updated_at: wp.updated_at,
  }));
  return res.json(list);
});
