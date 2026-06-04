import { useCallback, useEffect, useState } from 'react';
import {
  X,
  Loader2,
  RefreshCw,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Flag,
  Lightbulb,
  FileWarning,
  EyeOff,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import {
  audit as auditApi,
  ApiError,
  type AuditHealthScore,
  type AuditStalePage,
  type AuditUnansweredGroup,
  type AuditUnindexedPage,
  type AuditFlaggedPage,
  type AuditMissingKnowledge,
} from '@/lib/api';

interface AuditDashboardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenPage: (id: string) => void;
}

interface AuditState {
  health: AuditHealthScore | null;
  stale: AuditStalePage[];
  unanswered: AuditUnansweredGroup[];
  unindexed: AuditUnindexedPage[];
  flagged: AuditFlaggedPage[];
  missing: AuditMissingKnowledge[];
}

const EMPTY: AuditState = {
  health: null,
  stale: [],
  unanswered: [],
  unindexed: [],
  flagged: [],
  missing: [],
};

function healthColor(score: number): string {
  if (score >= 80) return 'text-emerald-500';
  if (score >= 60) return 'text-amber-500';
  return 'text-red-500';
}

function healthRing(score: number): string {
  if (score >= 80) return 'stroke-emerald-500';
  if (score >= 60) return 'stroke-amber-500';
  return 'stroke-red-500';
}

const PRIORITY_BADGE: Record<string, string> = {
  high: 'bg-red-500/15 text-red-600',
  medium: 'bg-amber-500/15 text-amber-600',
  low: 'bg-sky-500/15 text-sky-600',
};

const PRIORITY_LABEL: Record<string, string> = {
  high: 'Haute',
  medium: 'Moyenne',
  low: 'Basse',
};

function KpiCard({
  icon,
  label,
  value,
  tone = 'default',
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  tone?: 'default' | 'warn' | 'danger';
}) {
  const toneClass =
    tone === 'danger'
      ? 'bg-red-500/10 text-red-500'
      : tone === 'warn'
        ? 'bg-amber-500/10 text-amber-500'
        : 'bg-primary/10 text-primary';
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0 ${toneClass}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-foreground leading-tight">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

function HealthGauge({ score }: { score: number }) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - score / 100);
  return (
    <div className="relative w-[140px] h-[140px] flex-shrink-0">
      <svg width="140" height="140" className="-rotate-90">
        <circle cx="70" cy="70" r={radius} className="stroke-secondary" strokeWidth="12" fill="none" />
        <circle
          cx="70"
          cy="70"
          r={radius}
          className={healthRing(score)}
          strokeWidth="12"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-3xl font-bold ${healthColor(score)}`}>{score}</span>
        <span className="text-xs text-muted-foreground">/ 100</span>
      </div>
    </div>
  );
}

export function AuditDashboard({ open, onOpenChange, onOpenPage }: AuditDashboardProps) {
  const { user } = useAuth();
  const { activeWorkspaceId, activeWorkspace } = useWorkspace();
  const isGlobalAdmin = user?.role === 'admin';

  const [scope, setScope] = useState<'global' | 'workspace'>(
    isGlobalAdmin ? 'global' : 'workspace',
  );
  const [data, setData] = useState<AuditState>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const ws = scope === 'workspace' ? activeWorkspaceId ?? undefined : undefined;
      const [health, stale, unanswered, unindexed, flagged, missing] = await Promise.all([
        auditApi.health(ws),
        auditApi.stalePages(ws, 20),
        auditApi.unanswered(ws, 20),
        auditApi.unindexed(ws, 50),
        auditApi.flagged(ws, 50),
        auditApi.missingTopics(ws, 8),
      ]);
      setData({ health, stale, unanswered, unindexed, flagged, missing });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Impossible de charger l'audit.");
    } finally {
      setLoading(false);
    }
  }, [scope, activeWorkspaceId]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onOpenChange]);

  const resolveFlag = async (pageId: string) => {
    try {
      await auditApi.unflag(pageId);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Action impossible.');
    }
  };

  const openPage = (id: string) => {
    onOpenPage(id);
    onOpenChange(false);
  };

  if (!open) return null;

  const health = data.health;

  return (
    <div className="fixed inset-0 z-[60] bg-background flex flex-col">
      {/* En-tête */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <ShieldCheck className="text-primary" size={20} />
          <div>
            <h2 className="text-base font-semibold text-foreground">Audit de connaissance</h2>
            <p className="text-xs text-muted-foreground">
              {scope === 'global'
                ? 'Vue globale (Super Admin)'
                : `Workspace : ${activeWorkspace?.name ?? '—'}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isGlobalAdmin && (
            <div className="flex items-center rounded-lg border border-border overflow-hidden text-sm">
              <button
                onClick={() => setScope('global')}
                className={`px-3 py-1.5 ${scope === 'global' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-secondary'}`}
              >
                Global
              </button>
              <button
                onClick={() => setScope('workspace')}
                disabled={!activeWorkspaceId}
                className={`px-3 py-1.5 ${scope === 'workspace' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-secondary'} disabled:opacity-40`}
              >
                Workspace
              </button>
            </div>
          )}
          <Button variant="ghost" size="sm" onClick={load} title="Rafraîchir">
            <RefreshCw size={16} />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} title="Fermer">
            <X size={18} />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-primary" size={28} />
          </div>
        )}

        {error && !loading && (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
            <p className="text-muted-foreground">{error}</p>
            <Button variant="outline" onClick={load}>Réessayer</Button>
          </div>
        )}

        {!loading && !error && health && (
          <>
            {/* Santé + KPI */}
            <div className="grid lg:grid-cols-3 gap-4">
              <div className="bg-card border border-border rounded-xl p-5 flex items-center gap-5">
                <HealthGauge score={health.score} />
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-2">Knowledge Health Score</h3>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>{health.details.stale_pages} pages obsolètes</li>
                    <li>{health.details.unindexed_pages} pages non indexées</li>
                    <li>{health.details.unanswered_questions} questions sans réponse</li>
                    <li>{health.details.flagged_pages} pages signalées</li>
                  </ul>
                </div>
              </div>

              <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-4">
                <KpiCard
                  icon={<AlertTriangle size={20} />}
                  label="Questions sans réponse"
                  value={health.details.unanswered_questions}
                  tone="warn"
                />
                <KpiCard
                  icon={<Clock size={20} />}
                  label="Pages obsolètes"
                  value={health.details.stale_pages}
                  tone="warn"
                />
                <KpiCard
                  icon={<Flag size={20} />}
                  label="Pages signalées"
                  value={health.details.flagged_pages}
                  tone="danger"
                />
                <KpiCard
                  icon={<FileWarning size={20} />}
                  label="Pages non indexées"
                  value={health.details.unindexed_pages}
                  tone="danger"
                />
                <KpiCard
                  icon={<EyeOff size={20} />}
                  label="Sujets manquants"
                  value={data.missing.length}
                />
              </div>
            </div>

            {/* Sujets manquants (fonctionnalité principale) */}
            <div className="rounded-xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-transparent p-5">
              <div className="flex items-center gap-2 mb-1">
                <Lightbulb className="text-emerald-500" size={20} />
                <h3 className="text-base font-semibold text-foreground">Connaissances manquantes</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Sujets fréquemment demandés mais non documentés — à rédiger en priorité.
              </p>
              {data.missing.length > 0 ? (
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {data.missing.map((topic, i) => (
                    <div key={topic.topic} className="bg-card border border-border rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-foreground">
                          {i + 1}. {topic.topic}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${PRIORITY_BADGE[topic.priority] ?? PRIORITY_BADGE.low}`}>
                          {PRIORITY_LABEL[topic.priority] ?? topic.priority}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{topic.requests} demande(s)</p>
                      <p className="text-xs text-muted-foreground/80 mt-1 italic truncate" title={topic.sample_question}>
                        « {topic.sample_question} »
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  Aucune lacune détectée — votre base couvre bien les questions posées.
                </p>
              )}
            </div>

            {/* Tables : obsolètes + non indexées */}
            <div className="grid lg:grid-cols-2 gap-4">
              {/* Documents obsolètes */}
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-border flex items-center gap-2">
                  <Clock size={16} className="text-amber-500" />
                  <h3 className="text-sm font-semibold text-foreground">Documents obsolètes</h3>
                </div>
                <div className="divide-y divide-border max-h-72 overflow-y-auto">
                  {data.stale.length > 0 ? (
                    data.stale.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => openPage(p.id)}
                        className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-secondary transition-colors gap-3"
                      >
                        <span className="truncate text-sm text-foreground">{p.page}</span>
                        <span className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-[11px] text-muted-foreground">
                            {p.never_viewed ? 'jamais vu' : p.last_viewed ?? ''}
                          </span>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${p.staleness_score >= 80 ? 'bg-red-500/15 text-red-600' : 'bg-amber-500/15 text-amber-600'}`}>
                            {p.staleness_score}
                          </span>
                        </span>
                      </button>
                    ))
                  ) : (
                    <p className="px-4 py-6 text-sm text-muted-foreground text-center">Aucun document obsolète</p>
                  )}
                </div>
              </div>

              {/* Documents non indexés */}
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-border flex items-center gap-2">
                  <FileWarning size={16} className="text-red-500" />
                  <h3 className="text-sm font-semibold text-foreground">Documents non indexés</h3>
                </div>
                <div className="divide-y divide-border max-h-72 overflow-y-auto">
                  {data.unindexed.length > 0 ? (
                    data.unindexed.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => openPage(p.id)}
                        className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-secondary transition-colors gap-3"
                      >
                        <span className="truncate text-sm text-foreground">{p.page}</span>
                        <span className="text-[11px] text-muted-foreground flex-shrink-0">{p.reason}</span>
                      </button>
                    ))
                  ) : (
                    <p className="px-4 py-6 text-sm text-muted-foreground text-center">Tout est indexé 🎉</p>
                  )}
                </div>
              </div>
            </div>

            {/* Tables : questions sans réponse + pages signalées */}
            <div className="grid lg:grid-cols-2 gap-4">
              {/* Questions fréquentes sans réponse */}
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-border flex items-center gap-2">
                  <AlertTriangle size={16} className="text-amber-500" />
                  <h3 className="text-sm font-semibold text-foreground">Questions fréquentes sans réponse</h3>
                </div>
                <div className="divide-y divide-border max-h-72 overflow-y-auto">
                  {data.unanswered.length > 0 ? (
                    data.unanswered.map((g, i) => (
                      <div key={i} className="px-4 py-2.5">
                        <div className="flex items-center justify-between gap-3">
                          <span className="truncate text-sm font-medium text-foreground">{g.topic}</span>
                          <span className="text-xs text-muted-foreground flex-shrink-0">{g.occurrences}×</span>
                        </div>
                        <p className="text-xs text-muted-foreground italic truncate" title={g.sample_question}>
                          « {g.sample_question} »
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="px-4 py-6 text-sm text-muted-foreground text-center">Aucune question sans réponse 🎉</p>
                  )}
                </div>
              </div>

              {/* Pages signalées */}
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-border flex items-center gap-2">
                  <Flag size={16} className="text-red-500" />
                  <h3 className="text-sm font-semibold text-foreground">Pages signalées</h3>
                </div>
                <div className="divide-y divide-border max-h-72 overflow-y-auto">
                  {data.flagged.length > 0 ? (
                    data.flagged.map((p) => (
                      <div key={p.id} className="flex items-center justify-between px-4 py-2.5 gap-3">
                        <button
                          onClick={() => openPage(p.id)}
                          className="truncate text-sm text-foreground text-left hover:underline"
                        >
                          {p.page}
                        </button>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-[11px] text-muted-foreground">
                            {Object.keys(p.flag_types).join(', ')}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-emerald-600"
                            title="Marquer comme résolu"
                            onClick={() => resolveFlag(p.id)}
                          >
                            <CheckCircle2 size={15} />
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="px-4 py-6 text-sm text-muted-foreground text-center">Aucune page signalée</p>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
