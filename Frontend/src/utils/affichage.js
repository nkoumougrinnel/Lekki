const LABELS_CATEGORIE = {
  rh: 'RH',
  technique: 'Technique',
  commercial: 'Commercial',
  guides: 'Guides',
};

const LABELS_ROLE = {
  admin: 'Administrateur',
  editor: 'Éditeur',
  reader: 'Lecteur',
};

export const libelleCategorie = (category) =>
  LABELS_CATEGORIE[category] ?? category ?? '—';

export const libelleRole = (role) => LABELS_ROLE[role] ?? role ?? '—';

export const formaterDateRelative = (iso) => {
  if (!iso) return '—';
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "À l'instant";
  if (diffMin < 60) return `Il y a ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `Il y a ${diffH} h`;
  const diffJ = Math.floor(diffH / 24);
  if (diffJ < 7) return `Il y a ${diffJ} j`;
  return date.toLocaleDateString('fr-FR');
};

/** Normalise les messages API (role + content + sources JSON) vers le modèle UI. */
export const normaliserMessage = (msg) => {
  let sourcesBrutes = [];
  if (msg.sources) {
    try {
      const parsed = typeof msg.sources === 'string' ? JSON.parse(msg.sources) : msg.sources;
      sourcesBrutes = Array.isArray(parsed) ? parsed : [];
    } catch {
      sourcesBrutes = [];
    }
  }
  const score = sourcesBrutes[0]?.score ?? msg.score_confiance;
  const sources = sourcesBrutes.map((s) =>
    typeof s === 'string' ? s : (s.excerpt ?? s.title ?? s.page_id ?? String(s))
  );
  return {
    id: msg.id,
    role: msg.role,
    content: msg.content,
    sources,
    score_confiance:
      score != null && score <= 1 ? Math.round(score * 100) : score ?? null,
  };
};
