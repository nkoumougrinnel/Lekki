import { useCallback, useEffect, useState } from 'react';
import {
  X,
  Loader2,
  RefreshCw,
  FileText,
  MessageSquare,
  Users,
  Layers,
  Lightbulb,
  TrendingUp,
  AlertTriangle,
  Eye,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import {
  analytics as analyticsApi,
  ApiError,
  type AnalyticsOverview,
  type AnalyticsTopPage,
  type AnalyticsTopUser,
  type AnalyticsTopQuestion,
  type AnalyticsFailedQuestion,
  type AnalyticsMissingTopic,
  type AnalyticsQuestionsPerDay,
} from '@/lib/api';

interface AnalyticsDashboardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenPage: (id: string) => void;
}

const PROVIDER_COLORS = ['#6366f1', '#0ea5e9', '#f59e0b', '#10b981', '#ef4444', '#a855f7'];

interface AnalyticsState {
  overview: AnalyticsOverview | null;
  topPages: AnalyticsTopPage[];
  topUsers: AnalyticsTopUser[];
  topQuestions: AnalyticsTopQuestion[];
  failed: AnalyticsFailedQuestion[];
  missing: AnalyticsMissingTopic[];
  perDay: AnalyticsQuestionsPerDay[];
  providers: Record<string, number>;
}

const EMPTY: AnalyticsState = {
  overview: null,
  topPages: [],
  topUsers: [],
  topQuestions: [],
  failed: [],
  missing: [],
  perDay: [],
  providers: {},
};

function KpiCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  hint?: string;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
      <div className="w-11 h-11 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-foreground leading-tight">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
        {hint && <p className="text-[11px] text-muted-foreground/70">{hint}</p>}
      </div>
    </div>
  );
}

export function AnalyticsDashboard({ open, onOpenChange, onOpenPage }: AnalyticsDashboardProps) {
  const { user } = useAuth();
  const { activeWorkspaceId, activeWorkspace } = useWorkspace();
  const isGlobalAdmin = user?.role === 'admin';

  const [scope, setScope] = useState<'global' | 'workspace'>(
    isGlobalAdmin ? 'global' : 'workspace',
  );
  const [data, setData] = useState<AnalyticsState>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const effectiveWorkspaceId = scope === 'workspace' ? activeWorkspaceId ?? undefined : undefined;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const ws = scope === 'workspace' ? activeWorkspaceId ?? undefined : undefined;
      const [overview, topPages, topUsers, topQuestions, failed, missing, perDay, providers] =
        await Promise.all([
          analyticsApi.overview(ws),
          analyticsApi.topPages(ws),
          analyticsApi.topUsers(ws),
          analyticsApi.topQuestions(ws),
          analyticsApi.failedQuestions(ws),
          analyticsApi.missingTopics(ws),
          analyticsApi.questionsPerDay(ws),
          analyticsApi.providers(ws),
        ]);
      setData({ overview, topPages, topUsers, topQuestions, failed, missing, perDay, providers });
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Impossible de charger les statistiques.',
      );
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

  if (!open) return null;

  const providerData = Object.entries(data.providers).map(([name, value]) => ({ name, value }));

  return (
    <div className="fixed inset-0 z-[60] bg-background flex flex-col">
      {/* En-tête */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border">
        <div>
          <h2 className="text-base font-semibold text-foreground">Analytics d'usage</h2>
          <p className="text-xs text-muted-foreground">
            {scope === 'global'
              ? 'Vue globale (Super Admin)'
              : `Workspace : ${activeWorkspace?.name ?? '—'}`}
          </p>
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

        {!loading && !error && data.overview && (
          <>
            {/* KPI */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard icon={<FileText size={20} />} label="Documents" value={data.overview.documents} hint={`${data.overview.never_viewed_pages} jamais consultés`} />
              <KpiCard icon={<MessageSquare size={20} />} label="Questions IA" value={data.overview.questions} />
              <KpiCard icon={<Users size={20} />} label="Utilisateurs" value={data.overview.users} />
              <KpiCard icon={<Layers size={20} />} label="Workspaces" value={data.overview.workspaces} />
            </div>

            {/* Fonctionnalité différenciante : sujets manquants */}
            <div className="rounded-xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-transparent p-5">
              <div className="flex items-center gap-2 mb-1">
                <Lightbulb className="text-emerald-500" size={20} />
                <h3 className="text-base font-semibold text-foreground">
                  Ce qui manque dans votre base documentaire
                </h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Ces sujets sont fréquemment recherchés mais ne sont pas documentés.
              </p>
              {data.missing.length > 0 ? (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {data.missing.map((topic, i) => (
                    <div key={topic.topic} className="bg-card border border-border rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-foreground">
                          {i + 1}. {topic.topic}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600">
                          {topic.occurrences}×
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 italic truncate" title={topic.sample_question}>
                        « {topic.sample_question} »
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  Aucun sujet manquant détecté — votre base couvre bien les questions posées.
                </p>
              )}
            </div>

            {/* Graphiques */}
            <div className="grid lg:grid-cols-2 gap-4">
              <div className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp size={16} className="text-muted-foreground" />
                  <h3 className="text-sm font-semibold text-foreground">Questions par jour</h3>
                </div>
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={data.perDay} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
                    <defs>
                      <linearGradient id="qpd" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#94a3b833" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d) => String(d).slice(5)} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Area type="monotone" dataKey="count" stroke="#6366f1" fill="url(#qpd)" name="Questions" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-card border border-border rounded-xl p-4">
                <h3 className="text-sm font-semibold text-foreground mb-3">Utilisation des fournisseurs IA</h3>
                {providerData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie data={providerData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85} label>
                        {providerData.map((_, i) => (
                          <Cell key={i} fill={PROVIDER_COLORS[i % PROVIDER_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[240px] flex items-center justify-center text-sm text-muted-foreground">
                    Aucune donnée fournisseur
                  </div>
                )}
              </div>
            </div>

            {/* Tableaux */}
            <div className="grid lg:grid-cols-2 gap-4">
              {/* Top pages */}
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-border flex items-center gap-2">
                  <Eye size={16} className="text-muted-foreground" />
                  <h3 className="text-sm font-semibold text-foreground">Top pages consultées</h3>
                </div>
                <div className="divide-y divide-border">
                  {data.topPages.length > 0 ? (
                    data.topPages.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => {
                          onOpenPage(p.id);
                          onOpenChange(false);
                        }}
                        className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-secondary transition-colors"
                      >
                        <span className="truncate text-sm text-foreground">{p.title}</span>
                        <span className="text-xs text-muted-foreground ml-3 flex-shrink-0">{p.view_count} vues</span>
                      </button>
                    ))
                  ) : (
                    <p className="px-4 py-6 text-sm text-muted-foreground text-center">Aucune donnée</p>
                  )}
                </div>
              </div>

              {/* Utilisateurs actifs */}
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-border flex items-center gap-2">
                  <Users size={16} className="text-muted-foreground" />
                  <h3 className="text-sm font-semibold text-foreground">Utilisateurs les plus actifs</h3>
                </div>
                <div className="divide-y divide-border">
                  {data.topUsers.length > 0 ? (
                    data.topUsers.map((u) => (
                      <div key={u.user_id} className="flex items-center justify-between px-4 py-2.5">
                        <span className="truncate text-sm text-foreground">{u.username}</span>
                        <span className="text-xs text-muted-foreground ml-3 flex-shrink-0">{u.question_count} questions</span>
                      </div>
                    ))
                  ) : (
                    <p className="px-4 py-6 text-sm text-muted-foreground text-center">Aucune donnée</p>
                  )}
                </div>
              </div>
            </div>

            {/* Questions sans réponse */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-border flex items-center gap-2">
                <AlertTriangle size={16} className="text-amber-500" />
                <h3 className="text-sm font-semibold text-foreground">Questions sans réponse</h3>
              </div>
              <div className="divide-y divide-border">
                {data.failed.length > 0 ? (
                  data.failed.map((f, i) => (
                    <div key={i} className="flex items-center justify-between px-4 py-2.5 gap-3">
                      <span className="truncate text-sm text-foreground">{f.question}</span>
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        {f.had_results ? `confiance ${(f.confidence ?? 0).toFixed(2)}` : 'aucun résultat'}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="px-4 py-6 text-sm text-muted-foreground text-center">
                    Aucune question sans réponse 🎉
                  </p>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
