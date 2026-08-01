/**
 * 底部食物链面板（食物网）
 * SVG 分层节点图：左→右为能量流动方向（生产者 → 初级消费者 → 次级消费者）
 * 点击节点高亮 3D 场景中对应物种；悬停节点显示捕食/被捕食详情
 */
import { useMemo, useState } from 'react';
import { SPECIES, SPECIES_IDS, TROPHIC_COLORS, getDietDetail } from '@/data/species';
import { useEcosystemStore } from '@/store/ecosystemStore';
import type { SpeciesId } from '@/types/ecosystem';

/** 节点布局坐标 */
interface NodeLayout {
  id: SpeciesId;
  x: number;
  y: number;
}

const VIEW_W = 560;
const VIEW_H = 168;
const COLUMN_X: Record<number, number> = { 1: 90, 2: 280, 3: 470 };

/** 按营养级分列、列内均匀排布 */
function computeLayout(): NodeLayout[] {
  const layout: NodeLayout[] = [];
  for (const level of [1, 2, 3]) {
    const ids = SPECIES_IDS.filter((sid) => SPECIES[sid].trophicLevel === level);
    ids.forEach((sid, i) => {
      const gap = VIEW_H / (ids.length + 1);
      layout.push({ id: sid, x: COLUMN_X[level], y: gap * (i + 1) });
    });
  }
  return layout;
}

export function FoodWebPanel() {
  const layout = useMemo(computeLayout, []);
  const nodeOf = useMemo(() => {
    const map = new Map<SpeciesId, NodeLayout>();
    layout.forEach((n) => map.set(n.id, n));
    return map;
  }, [layout]);

  const highlightedSpecies = useEcosystemStore((s) => s.highlightedSpecies);
  const setHighlightedSpecies = useEcosystemStore((s) => s.setHighlightedSpecies);
  const [hovered, setHovered] = useState<SpeciesId | null>(null);

  /** 所有捕食关系边：prey → predator（能量流动方向） */
  const edges = useMemo(() => {
    const list: Array<{ from: SpeciesId; to: SpeciesId }> = [];
    for (const sid of SPECIES_IDS) {
      for (const prey of SPECIES[sid].diet) {
        list.push({ from: prey, to: sid });
      }
    }
    return list;
  }, []);

  /** 悬停节点的食性详情 */
  const hoverDetail = hovered ? getDietDetail(hovered) : null;
  const hoverNode = hovered ? nodeOf.get(hovered) : undefined;

  return (
    <div className="glass-panel pointer-events-auto absolute bottom-24 left-1/2 z-10 w-[600px] -translate-x-1/2 px-4 pb-2 pt-3">
      <div className="mb-1 flex items-center justify-between">
        <h2 className="font-display text-sm font-bold text-teal-100">食物网</h2>
        <span className="text-[10px] text-teal-100/40">
          点击节点高亮物种 · 悬停查看捕食关系 · 箭头指向捕食者
        </span>
      </div>

      <div className="relative">
        <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="w-full">
          <defs>
            {/* 箭头标记 */}
            <marker id="arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0,0 L8,4 L0,8 z" fill="#5f8a94" />
            </marker>
            <marker id="arrow-hl" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0,0 L8,4 L0,8 z" fill="#3ee6c4" />
            </marker>
          </defs>

          {/* 边：带箭头的平滑曲线 */}
          {edges.map((e) => {
            const a = nodeOf.get(e.from);
            const b = nodeOf.get(e.to);
            if (!a || !b) return null;
            const midX = (a.x + b.x) / 2;
            const isActive =
              highlightedSpecies !== null && (e.from === highlightedSpecies || e.to === highlightedSpecies);
            const isHover = hovered !== null && (e.from === hovered || e.to === hovered);
            return (
              <path
                key={`${e.from}-${e.to}`}
                d={`M ${a.x + 26} ${a.y} C ${midX} ${a.y}, ${midX} ${b.y}, ${b.x - 28} ${b.y}`}
                fill="none"
                stroke={isHover || isActive ? '#3ee6c4' : '#5f8a94'}
                strokeWidth={isHover || isActive ? 2 : 1}
                strokeOpacity={isHover || isActive ? 0.95 : 0.45}
                markerEnd={isHover || isActive ? 'url(#arrow-hl)' : 'url(#arrow)'}
              />
            );
          })}

          {/* 物种节点 */}
          {layout.map((n) => {
            const def = SPECIES[n.id];
            const active = highlightedSpecies === n.id;
            return (
              <g
                key={n.id}
                transform={`translate(${n.x}, ${n.y})`}
                className="cursor-pointer"
                onClick={() => setHighlightedSpecies(active ? null : n.id)}
                onMouseEnter={() => setHovered(n.id)}
                onMouseLeave={() => setHovered(null)}
              >
                {/* 选中态外圈 */}
                {active && (
                  <circle r="24" fill="none" stroke="#3ee6c4" strokeWidth="2" strokeDasharray="4 3" opacity="0.9" />
                )}
                <circle
                  r="18"
                  fill={active ? 'rgba(62,230,196,0.22)' : 'rgba(10,40,52,0.85)'}
                  stroke={TROPHIC_COLORS[def.trophicLevel]}
                  strokeWidth="1.5"
                />
                <text textAnchor="middle" dy="-1" fontSize="13">
                  {def.emoji}
                </text>
                <text textAnchor="middle" dy="13" fontSize="8" fill="#cfe8ec">
                  {def.name}
                </text>
              </g>
            );
          })}
        </svg>

        {/* 悬停详情浮层 */}
        {hovered && hoverDetail && hoverNode && (
          <div
            className="glass-panel pointer-events-none absolute z-20 w-52 px-3 py-2 text-[11px] leading-relaxed"
            style={{
              left: `${(hoverNode.x / VIEW_W) * 100}%`,
              top: 0,
              transform: hoverNode.x > VIEW_W / 2 ? 'translateX(-105%)' : 'translateX(5%)',
            }}
          >
            <div className="mb-1 font-semibold text-teal-100">
              {SPECIES[hovered].emoji} {SPECIES[hovered].name}
            </div>
            <p className="text-teal-100/60">
              <span className="text-amber-300">捕食 → </span>
              {hoverDetail.preys.length > 0
                ? hoverDetail.preys.map((p) => SPECIES[p].name).join('、')
                : '光合作用自养（不捕食）'}
            </p>
            <p className="mt-1 text-teal-100/60">
              <span className="text-red-300">被捕食 ← </span>
              {hoverDetail.predators.length > 0
                ? hoverDetail.predators.map((p) => SPECIES[p].name).join('、')
                : '无天敌（顶级消费者）'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
