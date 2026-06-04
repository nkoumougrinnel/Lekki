import { useCallback, useEffect, useRef, useState } from 'react';
import { X, Loader2, Maximize2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { knowledgeMap, ApiError, type KnowledgeMap } from '@/lib/api';
import { useWorkspace } from '@/contexts/WorkspaceContext';

// Dialogue plein écran accessible (focus-trap + ARIA via Radix).
const FULLSCREEN_DIALOG =
  'flex h-screen max-h-screen w-screen max-w-none top-0 left-0 translate-x-0 translate-y-0 flex-col gap-0 rounded-none border-0 p-0 shadow-none sm:max-w-none';

interface KnowledgeMapDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenPage: (id: string) => void;
}

interface Transform {
  x: number;
  y: number;
  k: number;
}

const NODE_W = 170;
const NODE_H = 40;

// Palette de marque Lekki (cf. index.css).
const BRAND_EMERALD = '#00C896';
const BRAND_INK = '#0D0F12';
const BRAND_WHITE = '#F8F9FA';
const EDGE_NEUTRAL = '#8892A4';

export function KnowledgeMapDialog({ open, onOpenChange, onOpenPage }: KnowledgeMapDialogProps) {
  const { activeWorkspaceId } = useWorkspace();
  const [data, setData] = useState<KnowledgeMap | null>(null);
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeCluster, setActiveCluster] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [transform, setTransform] = useState<Transform>({ x: 0, y: 0, k: 1 });

  const svgRef = useRef<HTMLDivElement>(null);
  const panRef = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);
  const dragRef = useRef<{ id: string; x: number; y: number; nx: number; ny: number } | null>(null);

  const fitView = useCallback(
    (map: KnowledgeMap, pos: Record<string, { x: number; y: number }>) => {
      const el = svgRef.current;
      if (!el || map.nodes.length === 0) {
        setTransform({ x: 0, y: 0, k: 1 });
        return;
      }
      const xs = map.nodes.map((n) => pos[n.id]?.x ?? 0);
      const ys = map.nodes.map((n) => pos[n.id]?.y ?? 0);
      const minX = Math.min(...xs) - NODE_W;
      const maxX = Math.max(...xs) + NODE_W;
      const minY = Math.min(...ys) - NODE_H;
      const maxY = Math.max(...ys) + NODE_H;
      const w = maxX - minX || 1;
      const h = maxY - minY || 1;
      const rect = el.getBoundingClientRect();
      const k = Math.min(rect.width / w, rect.height / h, 1.5) * 0.9;
      const cx = (minX + maxX) / 2;
      const cy = (minY + maxY) / 2;
      setTransform({ x: rect.width / 2 - cx * k, y: rect.height / 2 - cy * k, k });
    },
    [],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const map = await knowledgeMap.get({
        workspaceId: activeWorkspaceId ?? undefined,
      });
      const pos: Record<string, { x: number; y: number }> = {};
      for (const n of map.nodes) pos[n.id] = { x: n.position.x, y: n.position.y };
      setData(map);
      setPositions(pos);
      requestAnimationFrame(() => fitView(map, pos));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Impossible de charger la carte.');
    } finally {
      setLoading(false);
    }
  }, [activeWorkspaceId, fitView]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  // ── Interactions (zoom / pan / drag) ───────────────────────────────────────
  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const el = svgRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    setTransform((t) => {
      const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
      const k = Math.max(0.15, Math.min(2.5, t.k * factor));
      // Zoom centré sur le curseur.
      const wx = (mx - t.x) / t.k;
      const wy = (my - t.y) / t.k;
      return { k, x: mx - wx * k, y: my - wy * k };
    });
  };

  const onPointerDownBg = (e: React.PointerEvent) => {
    if (dragRef.current) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    panRef.current = { x: e.clientX, y: e.clientY, tx: transform.x, ty: transform.y };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (dragRef.current) {
      const d = dragRef.current;
      const dx = (e.clientX - d.x) / transform.k;
      const dy = (e.clientY - d.y) / transform.k;
      setPositions((prev) => ({ ...prev, [d.id]: { x: d.nx + dx, y: d.ny + dy } }));
      return;
    }
    if (panRef.current) {
      const p = panRef.current;
      setTransform((t) => ({ ...t, x: p.tx + (e.clientX - p.x), y: p.ty + (e.clientY - p.y) }));
    }
  };

  const endInteraction = () => {
    panRef.current = null;
    dragRef.current = null;
  };

  const onNodePointerDown = (e: React.PointerEvent, id: string) => {
    e.stopPropagation();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const p = positions[id] ?? { x: 0, y: 0 };
    dragRef.current = { id, x: e.clientX, y: e.clientY, nx: p.x, ny: p.y };
  };

  const onNodePointerUp = (e: React.PointerEvent, id: string) => {
    e.stopPropagation();
    const d = dragRef.current;
    const moved = d && (Math.abs(e.clientX - d.x) > 4 || Math.abs(e.clientY - d.y) > 4);
    dragRef.current = null;
    if (!moved) {
      onOpenPage(id);
      onOpenChange(false);
    }
  };

  const dimmed = (cluster: string) => activeCluster != null && cluster !== activeCluster;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={FULLSCREEN_DIALOG} showCloseButton={false}>
      {/* Barre supérieure */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border">
        <div>
          <DialogTitle className="text-base font-semibold text-foreground">
            Carte des connaissances
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {data
              ? `${data.nodes.length} pages · ${data.edges.length} liens · ${data.clusters.length} thématiques`
              : 'Graphe interactif de la base documentaire'}
          </DialogDescription>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => data && fitView(data, positions)} title="Recentrer">
            <Maximize2 size={16} />
          </Button>
          <Button variant="ghost" size="sm" onClick={load} title="Recalculer">
            <RefreshCw size={16} />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} title="Fermer">
            <X size={18} />
          </Button>
        </div>
      </div>

      <div className="relative flex-1 overflow-hidden">
        {/* Légende des clusters */}
        {data && data.clusters.length > 0 && (
          <div className="absolute top-4 left-4 z-10 bg-card/90 backdrop-blur border border-border rounded-lg p-3 shadow-sm max-w-[220px]">
            <p className="text-xs font-semibold text-muted-foreground mb-2">Thématiques</p>
            <div className="flex flex-col gap-1">
              {data.clusters.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setActiveCluster((prev) => (prev === c.id ? null : c.id))}
                  className={`flex items-center gap-2 text-xs px-2 py-1 rounded transition-colors text-left ${
                    activeCluster === c.id ? 'bg-secondary' : 'hover:bg-secondary/60'
                  }`}
                >
                  <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: c.color }} />
                  <span className="truncate text-foreground">{c.label}</span>
                  <span className="ml-auto text-muted-foreground">{c.count}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="animate-spin text-primary" size={28} />
          </div>
        )}

        {error && !loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center p-8">
            <p className="text-muted-foreground">{error}</p>
            <Button variant="outline" onClick={load}>Réessayer</Button>
          </div>
        )}

        {data && !loading && data.nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
            Aucune page indexée pour générer la carte.
          </div>
        )}

        {data && data.nodes.length > 0 && (
          <div
            ref={svgRef}
            className="w-full h-full cursor-grab active:cursor-grabbing"
            onWheel={onWheel}
            onPointerDown={onPointerDownBg}
            onPointerMove={onPointerMove}
            onPointerUp={endInteraction}
            onPointerLeave={endInteraction}
          >
            <svg className="w-full h-full select-none" style={{ touchAction: 'none' }}>
              <g transform={`translate(${transform.x},${transform.y}) scale(${transform.k})`}>
                {/* Arêtes */}
                {data.edges.map((edge) => {
                  const a = positions[edge.source];
                  const b = positions[edge.target];
                  if (!a || !b) return null;
                  const srcNode = data.nodes.find((n) => n.id === edge.source);
                  const dstNode = data.nodes.find((n) => n.id === edge.target);
                  const isDim =
                    dimmed(srcNode?.data.cluster ?? '') && dimmed(dstNode?.data.cluster ?? '');
                  const isHi =
                    hovered != null && (edge.source === hovered || edge.target === hovered);
                  return (
                    <line
                      key={edge.id}
                      x1={a.x}
                      y1={a.y}
                      x2={b.x}
                      y2={b.y}
                      stroke={isHi ? BRAND_EMERALD : EDGE_NEUTRAL}
                      strokeWidth={(isHi ? 2 : 1) + 2 * (edge.data?.score ?? 0)}
                      strokeOpacity={isDim ? 0.08 : isHi ? 0.9 : 0.35}
                    />
                  );
                })}

                {/* Nœuds */}
                {data.nodes.map((node) => {
                  const p = positions[node.id];
                  if (!p) return null;
                  const color = (node.style?.background as string) ?? BRAND_EMERALD;
                  const isDim = dimmed(node.data.cluster);
                  const isHi = hovered === node.id;
                  return (
                    <g
                      key={node.id}
                      transform={`translate(${p.x - NODE_W / 2},${p.y - NODE_H / 2})`}
                      style={{ cursor: 'pointer', opacity: isDim ? 0.2 : 1 }}
                      onPointerDown={(e) => onNodePointerDown(e, node.id)}
                      onPointerUp={(e) => onNodePointerUp(e, node.id)}
                      onPointerEnter={() => setHovered(node.id)}
                      onPointerLeave={() => setHovered((h) => (h === node.id ? null : h))}
                    >
                      <rect
                        width={NODE_W}
                        height={NODE_H}
                        rx={10}
                        fill={color}
                        stroke={isHi ? BRAND_INK : 'transparent'}
                        strokeWidth={2}
                      />
                      <text
                        x={NODE_W / 2}
                        y={NODE_H / 2}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fontSize={12}
                        fill={BRAND_WHITE}
                        style={{ pointerEvents: 'none' }}
                      >
                        {node.data.label.length > 24
                          ? `${node.data.label.slice(0, 23)}…`
                          : node.data.label}
                      </text>
                    </g>
                  );
                })}
              </g>
            </svg>
          </div>
        )}

        <div className="absolute bottom-3 right-4 text-[11px] text-muted-foreground">
          Molette : zoom · Glisser le fond : déplacer · Cliquer un nœud : ouvrir la page
        </div>
      </div>
      </DialogContent>
    </Dialog>
  );
}
