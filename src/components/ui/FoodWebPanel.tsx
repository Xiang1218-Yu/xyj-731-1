// 右侧食物网面板：SVG 分层食物网，支持悬停查看捕食关系、点击高亮缸内物种
import { useState } from 'react';
import { Network, X } from 'lucide-react';
import { useEcoStore } from '@/store/ecoStore';
import { SPECIES, TROPHIC_COLORS, TROPHIC_LABELS, getPredatorsOf, isPreyOf } from '@/simulation/species';
import {
  FOOD_WEB_EDGES,
  FOOD_WEB_HEIGHT,
  FOOD_WEB_NODES,
  FOOD_WEB_WIDTH,
} from '@/simulation/foodWebLayout';
import { Card } from './primitives';

interface Tooltip {
  speciesId: string;
  x: number;
  y: number;
}

export function FoodWebPanel() {
  const hoveredSpecies = useEcoStore((s) => s.hoveredSpeciesId);
  const setHovered = useEcoStore((s) => s.setHoveredSpecies);
  const trackedSpecies = useEcoStore((s) => s.trackedSpeciesId);
  const setTracked = useEcoStore((s) => s.setTrackedSpecies);
  const [tooltip, setTooltip] = useState<Tooltip | null>(null);

  // 当前悬停节点关联的边
  const activeId = hoveredSpecies ?? trackedSpecies;

  function isEdgeActive(from: string, to: string): boolean {
    if (!activeId) return false;
    return from === activeId || to === activeId;
  }

  return (
    <Card className="flex w-80 flex-col gap-2 p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Network size={15} className="text-pine-900" />
          <h2 className="panel-title">食物网</h2>
        </div>
        {trackedSpecies && (
          <button
            onClick={() => setTracked(null)}
            className="flex items-center gap-1 rounded-md bg-coral-500/10 px-1.5 py-0.5 text-[10px] font-600 text-coral-600 hover:bg-coral-500/20"
          >
            取消高亮 <X size={10} />
          </button>
        )}
      </div>

      <div className="relative">
        <svg
          viewBox={`0 0 ${FOOD_WEB_WIDTH} ${FOOD_WEB_HEIGHT}`}
          className="w-full"
          onMouseLeave={() => {
            setHovered(null);
            setTooltip(null);
          }}
        >
          {/* 边（能量流动：猎物 -> 捕食者） */}
          {FOOD_WEB_EDGES.map((edge, i) => {
            const from = FOOD_WEB_NODES.find((n) => n.speciesId === edge.from);
            const to = FOOD_WEB_NODES.find((n) => n.speciesId === edge.to);
            if (!from || !to) return null;
            const active = isEdgeActive(edge.from, edge.to);
            const dimmed = activeId !== null && !active;
            return (
              <line
                key={i}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke={active ? '#e8704a' : '#0f3d33'}
                strokeWidth={active ? 2 : 1}
                strokeOpacity={dimmed ? 0.12 : active ? 0.9 : 0.3}
              />
            );
          })}

          {/* 节点 */}
          {FOOD_WEB_NODES.map((node) => {
            const sp = SPECIES[node.speciesId];
            if (!sp) return null;
            const active = activeId === node.speciesId;
            const related =
              activeId !== null &&
              (isPreyOf(activeId, node.speciesId) ||
                isPreyOf(node.speciesId, activeId) ||
                activeId === node.speciesId);
            const dimmed = activeId !== null && !related;
            const isTracked = trackedSpecies === node.speciesId;
            return (
              <g
                key={node.speciesId}
                transform={`translate(${node.x}, ${node.y})`}
                className="cursor-pointer"
                onMouseEnter={(e) => {
                  setHovered(node.speciesId);
                  const rect = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
                  const scaleX = rect.width / FOOD_WEB_WIDTH;
                  const scaleY = rect.height / FOOD_WEB_HEIGHT;
                  setTooltip({
                    speciesId: node.speciesId,
                    x: node.x * scaleX,
                    y: node.y * scaleY,
                  });
                }}
                onMouseLeave={() => setTooltip(null)}
                onClick={() =>
                  setTracked(isTracked ? null : node.speciesId)
                }
              >
                {isTracked && (
                  <circle r={15} fill="none" stroke="#6ee7d6" strokeWidth={2} className="animate-breathe" />
                )}
                <circle
                  r={active ? 11 : 9}
                  fill={sp.color}
                  fillOpacity={dimmed ? 0.3 : 1}
                  stroke={active ? '#0f3d33' : '#f4eee2'}
                  strokeWidth={active ? 2.5 : 2}
                />
                <text
                  y={22}
                  textAnchor="middle"
                  fontSize={9.5}
                  fontWeight={600}
                  fill={dimmed ? '#0f3d3366' : '#0f3d33'}
                >
                  {sp.name}
                </text>
              </g>
            );
          })}
        </svg>

        {tooltip && <FoodTooltip tooltip={tooltip} />}
      </div>

      {/* 图例 */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 border-t border-pine-900/10 pt-2">
        {(['producer', 'primary', 'secondary', 'apex', 'decomposer'] as const).map((level) => (
          <div key={level} className="flex items-center gap-1">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: TROPHIC_COLORS[level] }}
            />
            <span className="text-[9.5px] text-pine-900/60">{TROPHIC_LABELS[level]}</span>
          </div>
        ))}
      </div>
      <p className="text-[9.5px] leading-snug text-pine-900/45">
        悬停查看捕食 / 被捕食关系，点击节点高亮缸内对应物种。
      </p>
    </Card>
  );
}

function FoodTooltip({ tooltip }: { tooltip: Tooltip }) {
  const sp = SPECIES[tooltip.speciesId];
  if (!sp) return null;
  const predators = getPredatorsOf(tooltip.speciesId)
    .map((id) => SPECIES[id]?.name)
    .filter(Boolean);
  const preyNames = sp.prey.map((id) => SPECIES[id]?.name).filter(Boolean);

  return (
    <div
      className="pointer-events-none absolute z-10 w-44 -translate-x-1/2 animate-floatIn rounded-xl border border-pine-900/15 bg-paper-50/95 p-2.5 shadow-panel backdrop-blur"
      style={{ left: tooltip.x, top: tooltip.y - 8, transform: 'translate(-50%, -100%)' }}
    >
      <div className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: sp.color }} />
        <span className="text-[12px] font-700 text-pine-950">{sp.name}</span>
      </div>
      <div className="mt-1.5 space-y-1">
        <div>
          <span className="text-[9.5px] font-700 text-aqua-600">捕食：</span>
          <span className="text-[10.5px] text-pine-900/80">
            {preyNames.length > 0 ? preyNames.join('、') : '无（光合/腐食）'}
          </span>
        </div>
        <div>
          <span className="text-[9.5px] font-700 text-coral-500">天敌：</span>
          <span className="text-[10.5px] text-pine-900/80">
            {predators.length > 0 ? predators.join('、') : '无（顶级）'}
          </span>
        </div>
      </div>
    </div>
  );
}
