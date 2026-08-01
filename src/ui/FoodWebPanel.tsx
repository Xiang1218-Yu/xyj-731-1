import { useMemo, useState } from 'react';
import { useStore, useDisplayedOrganisms } from '../state/store';
import { getScene, buildFoodWeb } from '../domain/presets';
import { SPECIES_CATALOG } from '../domain/species';
import { countBySpecies } from '../simulation/engine';
import type { SpeciesId, TrophicRole } from '../domain/types';

/** 每个营养级对应的垂直层（0 在底部） */
const ROLE_LAYER: Record<TrophicRole, number> = {
  producer: 0,
  decomposer: 0,
  herbivore: 1,
  omnivore: 2,
  carnivore: 3,
};

interface NodeLayout {
  id: SpeciesId;
  x: number;
  y: number;
}

/**
 * 食物网面板。
 * - 以 SVG 绘制物种节点与捕食关系箭头
 * - 点击节点：高亮对应物种（同步高亮 3D 场景中的个体）
 * - 悬停节点：显示该物种的捕食/被捕食关系详情
 */
export function FoodWebPanel(): JSX.Element {
  const sceneId = useStore((s) => s.sceneId);
  const highlighted = useStore((s) => s.highlightedSpecies);
  const setHighlighted = useStore((s) => s.setHighlightedSpecies);
  const organisms = useDisplayedOrganisms();

  const [hovered, setHovered] = useState<SpeciesId | null>(null);

  const scene = getScene(sceneId);
  // 当前场景涉及的物种（初始投放集合）
  const speciesIds = useMemo(
    () => Object.keys(scene.initialPopulation),
    [scene],
  );
  const edges = useMemo(() => buildFoodWeb(speciesIds), [speciesIds]);

  // 实时种群数量
  const population = useMemo(() => countBySpecies(organisms), [organisms]);

  const width = 320;
  const height = 300;

  // 计算节点布局：按营养级分层，层内均匀分布
  const layout = useMemo<Record<SpeciesId, NodeLayout>>(() => {
    const layers: Record<number, SpeciesId[]> = {};
    for (const id of speciesIds) {
      const layer = ROLE_LAYER[SPECIES_CATALOG[id].role];
      layers[layer] = layers[layer] ?? [];
      layers[layer].push(id);
    }
    const result: Record<SpeciesId, NodeLayout> = {};
    const maxLayer = 3;
    Object.entries(layers).forEach(([layerStr, ids]) => {
      const layer = Number(layerStr);
      // 层从下往上：layer 0 在底部
      const y = height - 40 - (layer / maxLayer) * (height - 80);
      ids.forEach((id, i) => {
        const x = ((i + 1) / (ids.length + 1)) * width;
        result[id] = { id, x, y };
      });
    });
    return result;
  }, [speciesIds]);

  // 悬停/高亮物种的关系文本
  const focusId = hovered ?? highlighted;
  const relationInfo = useMemo(() => {
    if (!focusId) return null;
    const species = SPECIES_CATALOG[focusId];
    const eats = species.preyOf.filter((p) => speciesIds.includes(p));
    const eatenBy = speciesIds.filter((other) =>
      SPECIES_CATALOG[other].preyOf.includes(focusId),
    );
    return { species, eats, eatenBy };
  }, [focusId, speciesIds]);

  // 判断一条边是否与当前 focus 物种相关（用于高亮）
  const isEdgeActive = (predator: SpeciesId, prey: SpeciesId): boolean =>
    focusId !== null && (predator === focusId || prey === focusId);

  return (
    <div className="panel foodweb-panel">
      <h2 className="panel-title">🕸️ 食物网</h2>
      <svg
        width={width}
        height={height}
        className="foodweb-svg"
        role="img"
        aria-label="食物网关系图"
      >
        {/* 箭头标记定义 */}
        <defs>
          <marker
            id="arrow"
            markerWidth="8"
            markerHeight="8"
            refX="7"
            refY="3"
            orient="auto"
          >
            <path d="M0,0 L7,3 L0,6 Z" fill="#7a8aa0" />
          </marker>
          <marker
            id="arrow-active"
            markerWidth="8"
            markerHeight="8"
            refX="7"
            refY="3"
            orient="auto"
          >
            <path d="M0,0 L7,3 L0,6 Z" fill="#ffd54f" />
          </marker>
        </defs>

        {/* 捕食关系连线：prey -> predator（箭头指向捕食者，表示能量流向） */}
        {edges.map((edge) => {
          const from = layout[edge.prey];
          const to = layout[edge.predator];
          if (!from || !to) return null;
          const active = isEdgeActive(edge.predator, edge.prey);
          return (
            <line
              key={`${edge.predator}-${edge.prey}`}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke={active ? '#ffd54f' : '#7a8aa0'}
              strokeWidth={active ? 2.2 : 1}
              opacity={focusId && !active ? 0.2 : 0.8}
              markerEnd={active ? 'url(#arrow-active)' : 'url(#arrow)'}
            />
          );
        })}

        {/* 物种节点 */}
        {speciesIds.map((id) => {
          const node = layout[id];
          if (!node) return null;
          const s = SPECIES_CATALOG[id];
          const count = population[id] ?? 0;
          const isFocus = focusId === id;
          const dim = focusId !== null && !isFocus;
          return (
            <g
              key={id}
              transform={`translate(${node.x}, ${node.y})`}
              className="foodweb-node"
              onClick={() =>
                setHighlighted(highlighted === id ? null : id)
              }
              onMouseEnter={() => setHovered(id)}
              onMouseLeave={() => setHovered(null)}
              style={{ cursor: 'pointer', opacity: dim ? 0.35 : 1 }}
            >
              <circle
                r={isFocus ? 16 : 13}
                fill={s.color}
                stroke={highlighted === id ? '#ffd54f' : '#ffffff'}
                strokeWidth={highlighted === id ? 3 : 1.5}
              />
              <text
                textAnchor="middle"
                dy="4"
                fontSize="12"
                pointerEvents="none"
              >
                {s.icon}
              </text>
              {/* 名称与数量 */}
              <text
                textAnchor="middle"
                dy="26"
                fontSize="10"
                fill="#dfe7f2"
                pointerEvents="none"
              >
                {s.name}·{count}
              </text>
            </g>
          );
        })}
      </svg>

      {/* 关系详情 */}
      {relationInfo ? (
        <div className="relation-info">
          <div className="relation-title">
            {relationInfo.species.icon} {relationInfo.species.name}
          </div>
          <div className="relation-line">
            <span className="relation-label">捕食：</span>
            {relationInfo.eats.length > 0
              ? relationInfo.eats
                  .map((p) => `${SPECIES_CATALOG[p].icon}${SPECIES_CATALOG[p].name}`)
                  .join('、')
              : '无（位于食物链底端）'}
          </div>
          <div className="relation-line">
            <span className="relation-label">被捕食：</span>
            {relationInfo.eatenBy.length > 0
              ? relationInfo.eatenBy
                  .map((p) => `${SPECIES_CATALOG[p].icon}${SPECIES_CATALOG[p].name}`)
                  .join('、')
              : '无（位于食物链顶端）'}
          </div>
        </div>
      ) : (
        <p className="hint">点击节点高亮物种，悬停查看捕食关系。</p>
      )}
    </div>
  );
}
