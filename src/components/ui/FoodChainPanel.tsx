import { useState, useMemo } from 'react';
import { useEcoStore } from '../../store/ecoStore';
import { SPECIES } from '../../data/species';
import { TrophicLevel } from '../../types';
import type { SpeciesTemplate } from '../../types';
import './FoodChainPanel.css';

// ============================================================
// 食物链面板：以营养级分层展示食物网
// 点击节点高亮对应物种，悬停显示捕食/被捕食关系
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

export default function FoodChainPanel() {
  const organisms = useEcoStore(s => s.organisms);
  const highlightedSpeciesId = useEcoStore(s => s.highlightedSpeciesId);
  const hoveredSpeciesId = useEcoStore(s => s.hoveredSpeciesId);
  const setHighlightedSpecies = useEcoStore(s => s.setHighlightedSpecies);
  const setHoveredSpecies = useEcoStore(s => s.setHoveredSpecies);
  const setTrackedOrganism = useEcoStore(s => s.setTrackedOrganism);
  const [collapsed, setCollapsed] = useState(false);

  // 当前缸中存在的物种
  const presentSpeciesIds = useMemo(() => {
    const ids = new Set<string>();
    organisms.forEach(o => {
      if (o.alive) ids.add(o.speciesId);
    });
    return ids;
  }, [organisms]);

  const presentSpecies = Array.from(presentSpeciesIds)
    .map(id => SPECIES[id])
    .filter((s): s is SpeciesTemplate => s !== undefined);

  // 按营养级分组
  const grouped = TROPHIC_ORDER.map(level => ({
    level,
    label: TROPHIC_LABELS[level],
    species: presentSpecies.filter(s => s.trophicLevel === level)
  })).filter(g => g.species.length > 0);

  // 计算每个物种的捕食关系（只包含缸中存在的物种）
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
      // 找到该物种的一个生物进行追踪
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
            <div className="foodchain-layers">
              {grouped.map(group => (
                <div key={group.level} className="trophic-layer">
                  <div className="layer-label">{group.label}</div>
                  <div className="layer-nodes">
                    {group.species.map(species => {
                      const related = isRelated(species.id);
                      const dimmed = activeId && !related;
                      const isActive = activeId === species.id;
                      return (
                        <div
                          key={species.id}
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
