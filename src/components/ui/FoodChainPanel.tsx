import { useState, useMemo, useRef, useLayoutEffect, useCallback } from 'react';
import { useEcoStore } from '../../store/ecoStore';
import { SPECIES } from '../../data/species';
import { TrophicLevel } from '../../types';
import type { SpeciesTemplate } from '../../types';
import './FoodChainPanel.css';

// ============================================================
// 食物链面板：以营养级分层展示食物网，含SVG连线
// 连线始终可见，悬停/选中时高亮相关路径
// ============================================================

const TROPHIC_LABELS: Record<TrophicLevel, string> = {
  [TrophicLevel.Producer]: '生产者',
  [TrophicLevel.PrimaryConsumer]: '初级消费者',
  [TrophicLevel.SecondaryConsumer]: '次级消费者',
  [TrophicLevel.TertiaryConsumer]: '顶级捕食者',
  [TrophicLevel.Decomposer]: '分解者'
};

const TROPHIC_ORDER: TrophicLevel[] = [
  TrophicLevel.Producer,
  TrophicLevel.PrimaryConsumer,
  TrophicLevel.SecondaryConsumer,
  TrophicLevel.TertiaryConsumer,
  TrophicLevel.Decomposer
];

interface NodePosition {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface EdgeData {
  from: string;
  to: string;
  active: boolean;
}

export default function FoodChainPanel() {
  const organisms = useEcoStore(s => s.organisms);
  const highlightedSpeciesId = useEcoStore(s => s.highlightedSpeciesId);
  const hoveredSpeciesId = useEcoStore(s => s.hoveredSpeciesId);
  const setHighlightedSpecies = useEcoStore(s => s.setHighlightedSpecies);
  const setHoveredSpecies = useEcoStore(s => s.setHoveredSpecies);
  const setTrackedOrganism = useEcoStore(s => s.setTrackedOrganism);
  const [collapsed, setCollapsed] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const presentSpeciesRef = useRef<SpeciesTemplate[]>([]);
  const [positions, setPositions] = useState<Record<string, NodePosition>>({});
  const [svgSize, setSvgSize] = useState({ width: 0, height: 0 });

  // 当前缸中存在的物种
  const presentSpeciesIds = useMemo(() => {
    const ids = new Set<string>();
    organisms.forEach(o => {
      if (o.alive) ids.add(o.speciesId);
    });
    return ids;
  }, [organisms]);

  const presentSpecies = useMemo(
    () =>
      Array.from(presentSpeciesIds)
        .map(id => SPECIES[id])
        .filter((s): s is SpeciesTemplate => s !== undefined),
    [presentSpeciesIds]
  );

  presentSpeciesRef.current = presentSpecies;

  // 按营养级分组
  const grouped = useMemo(
    () =>
      TROPHIC_ORDER.map(level => ({
        level,
        label: TROPHIC_LABELS[level],
        species: presentSpecies.filter(s => s.trophicLevel === level)
      })).filter(g => g.species.length > 0),
    [presentSpecies]
  );

  // 计算食物网边
  const edges = useMemo<EdgeData[]>(() => {
    const result: EdgeData[] = [];
    const activeId = hoveredSpeciesId ?? highlightedSpeciesId;
    for (const species of presentSpecies) {
      for (const preyId of species.preyIds) {
        if (presentSpeciesIds.has(preyId)) {
          const isActive =
            activeId !== null &&
            (species.id === activeId || preyId === activeId);
          result.push({ from: preyId, to: species.id, active: isActive });
        }
      }
    }
    return result;
  }, [presentSpecies, presentSpeciesIds, hoveredSpeciesId, highlightedSpeciesId]);

  // 测量节点位置（含宽高，用于连线端点计算）
  const measurePositions = useCallback(() => {
    if (!containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const newPositions: Record<string, NodePosition> = {};
    for (const species of presentSpeciesRef.current) {
      const el = nodeRefs.current[species.id];
      if (el) {
        const rect = el.getBoundingClientRect();
        newPositions[species.id] = {
          x: rect.left - containerRect.left + rect.width / 2,
          y: rect.top - containerRect.top + rect.height / 2,
          w: rect.width,
          h: rect.height
        };
      }
    }
    setPositions(newPositions);
    setSvgSize({ width: containerRect.width, height: containerRect.height });
  }, []);

  const speciesKey = presentSpecies.map(s => s.id).sort().join(',');
  useLayoutEffect(() => {
    // 双重 rAF 确保 DOM 完全布局后再测量
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => measurePositions());
    });
    window.addEventListener('resize', measurePositions);
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      window.removeEventListener('resize', measurePositions);
    };
  }, [speciesKey, collapsed, measurePositions]);

  // 计算捕食关系
  const getRelations = (speciesId: string) => {
    const species = SPECIES[speciesId];
    if (!species) return { predators: [] as string[], prey: [] as string[] };
    const predators = presentSpecies
      .filter(s => s.preyIds.includes(speciesId))
      .map(s => s.id);
    const prey = species.preyIds.filter(id => presentSpeciesIds.has(id));
    return { predators, prey };
  };

  const activeId = hoveredSpeciesId ?? highlightedSpeciesId;
  const activeRelations = activeId ? getRelations(activeId) : null;

  const isRelated = (speciesId: string): boolean => {
    if (!activeId) return false;
    if (speciesId === activeId) return true;
    if (!activeRelations) return false;
    return activeRelations.predators.includes(speciesId) || activeRelations.prey.includes(speciesId);
  };

  const handleNodeClick = (speciesId: string) => {
    if (highlightedSpeciesId === speciesId) {
      setHighlightedSpecies(null);
      setTrackedOrganism(null);
    } else {
      setHighlightedSpecies(speciesId);
      const org = organisms.find(o => o.speciesId === speciesId && o.alive);
      if (org) {
        setTrackedOrganism(org.id);
      }
    }
  };

  const countBySpecies = organisms.reduce<Record<string, number>>((acc, o) => {
    if (o.alive) acc[o.speciesId] = (acc[o.speciesId] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className={`foodchain-panel ${collapsed ? 'collapsed' : ''}`}>
      <div className="panel-header" onClick={() => setCollapsed(!collapsed)}>
        <h3>🔗 食物网</h3>
        <span className="collapse-btn">{collapsed ? '▶' : '◀'}</span>
      </div>

      {!collapsed && (
        <div className="panel-body">
          {grouped.length === 0 ? (
            <div className="empty-hint">生态缸中暂无生物</div>
          ) : (
            <div className="foodchain-container" ref={containerRef}>
              {/* SVG 连线层 —— 始终绘制食物网箭头 */}
              <svg
                className="foodchain-svg"
                width={svgSize.width}
                height={svgSize.height}
              >
                <defs>
                  {/* 默认箭头（青绿色，始终可见） */}
                  <marker
                    id="arrow-default"
                    markerWidth="10"
                    markerHeight="8"
                    refX="9"
                    refY="4"
                    orient="auto"
                  >
                    <polygon points="0 0, 10 4, 0 8" fill="#4dd0e1" />
                  </marker>
                  {/* 高亮箭头（金黄色） */}
                  <marker
                    id="arrow-active"
                    markerWidth="10"
                    markerHeight="8"
                    refX="9"
                    refY="4"
                    orient="auto"
                  >
                    <polygon points="0 0, 10 4, 0 8" fill="#ffc107" />
                  </marker>
                </defs>
                {edges.map((edge, i) => {
                  const from = positions[edge.from];
                  const to = positions[edge.to];
                  if (!from || !to) return null;

                  // 从猎物节点底边到捕食者节点顶边
                  const startX = from.x;
                  const startY = from.y + from.h / 2;
                  const endX = to.x;
                  const endY = to.y - to.h / 2;
                  const midY = (startY + endY) / 2;
                  const path = `M ${startX} ${startY} C ${startX} ${midY}, ${endX} ${midY}, ${endX} ${endY}`;

                  const dimmed = activeId !== null && !edge.active;

                  return (
                    <path
                      key={`edge-${i}`}
                      d={path}
                      fill="none"
                      stroke={edge.active ? '#ffc107' : '#4dd0e1'}
                      strokeWidth={edge.active ? 2 : 1.3}
                      strokeOpacity={dimmed ? 0.12 : edge.active ? 0.95 : 0.55}
                      markerEnd={edge.active ? 'url(#arrow-active)' : 'url(#arrow-default)'}
                    />
                  );
                })}
              </svg>

              {/* 节点层 */}
              <div className="foodchain-layers">
                {grouped.map(group => (
                  <div key={group.level} className="trophic-layer">
                    <div className="layer-label">{group.label}</div>
                    <div className="layer-nodes">
                      {group.species.map(species => {
                        const related = isRelated(species.id);
                        const dimmed = activeId !== null && !related;
                        const isActive = activeId === species.id;
                        return (
                          <div
                            key={species.id}
                            ref={el => { nodeRefs.current[species.id] = el; }}
                            className={`species-node ${isActive ? 'active' : ''} ${dimmed ? 'dimmed' : ''} ${related && !isActive ? 'related' : ''}`}
                            onClick={() => handleNodeClick(species.id)}
                            onMouseEnter={() => setHoveredSpecies(species.id)}
                            onMouseLeave={() => setHoveredSpecies(null)}
                            style={{
                              '--node-color': species.color
                            } as React.CSSProperties}
                          >
                            <span
                              className="node-dot"
                              style={{ background: species.color }}
                            />
                            <span className="node-name">{species.name}</span>
                            <span className="node-count">×{countBySpecies[species.id] ?? 0}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 悬停关系详情 */}
          {activeId && activeRelations && (
            <div className="relation-tooltip">
              <div className="relation-title">
                <strong>{SPECIES[activeId]?.name}</strong> 的食物关系
              </div>
              {activeRelations.prey.length > 0 && (
                <div className="relation-row">
                  <span className="relation-label prey">捕食 →</span>
                  <span className="relation-names">
                    {activeRelations.prey.map(id => SPECIES[id]?.name).join('、')}
                  </span>
                </div>
              )}
              {activeRelations.predators.length > 0 && (
                <div className="relation-row">
                  <span className="relation-label predator">天敌 ←</span>
                  <span className="relation-names">
                    {activeRelations.predators.map(id => SPECIES[id]?.name).join('、')}
                  </span>
                </div>
              )}
              {activeRelations.prey.length === 0 && activeRelations.predators.length === 0 && (
                <div className="relation-row">
                  <span className="relation-names">当前缸中无捕食关系</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
