import { useState } from 'react';
import { useEcoStore } from '../../store/ecoStore';
import { SPECIES, ALL_SPECIES_IDS } from '../../data/species';
import { TrophicLevel } from '../../types';
import type { SpeciesTemplate } from '../../types';
import './SpeciesPanel.css';

// ============================================================
// 物种放置面板：按营养级分类，点击物种后在生态缸中放置
// ============================================================

const TROPHIC_LABELS: Record<TrophicLevel, string> = {
  [TrophicLevel.Producer]: '生产者',
  [TrophicLevel.PrimaryConsumer]: '初级消费者',
  [TrophicLevel.SecondaryConsumer]: '次级消费者',
  [TrophicLevel.TertiaryConsumer]: '三级消费者',
  [TrophicLevel.Decomposer]: '分解者'
};

const TROPHIC_ORDER: TrophicLevel[] = [
  TrophicLevel.Producer,
  TrophicLevel.PrimaryConsumer,
  TrophicLevel.SecondaryConsumer,
  TrophicLevel.TertiaryConsumer,
  TrophicLevel.Decomposer
];

export default function SpeciesPanel() {
  const currentScene = useEcoStore(s => s.currentScene);
  const pendingPlacementSpeciesId = useEcoStore(s => s.pendingPlacementSpeciesId);
  const setPendingPlacement = useEcoStore(s => s.setPendingPlacement);
  const addOrganism = useEcoStore(s => s.addOrganism);
  const organisms = useEcoStore(s => s.organisms);

  const [collapsed, setCollapsed] = useState(false);

  // 只显示当前场景中的适存物种
  const sceneSpecies = ALL_SPECIES_IDS
    .map(id => SPECIES[id])
    .filter(s => s.habitat.includes(currentScene.id));

  const grouped = TROPHIC_ORDER.map(level => ({
    level,
    label: TROPHIC_LABELS[level],
    species: sceneSpecies.filter(s => s.trophicLevel === level)
  })).filter(g => g.species.length > 0);

  const countBySpecies = organisms.reduce<Record<string, number>>((acc, o) => {
    acc[o.speciesId] = (acc[o.speciesId] ?? 0) + 1;
    return acc;
  }, {});

  const handleSpeciesClick = (species: SpeciesTemplate) => {
    if (pendingPlacementSpeciesId === species.id) {
      setPendingPlacement(null);
    } else {
      setPendingPlacement(species.id);
    }
  };

  const handleQuickAdd = (e: React.MouseEvent, species: SpeciesTemplate) => {
    e.stopPropagation();
    addOrganism(species.id);
  };

  return (
    <div className={`species-panel ${collapsed ? 'collapsed' : ''}`}>
      <div className="panel-header" onClick={() => setCollapsed(!collapsed)}>
        <h3>🦎 物种库</h3>
        <span className="collapse-btn">{collapsed ? '◀' : '▶'}</span>
      </div>

      {!collapsed && (
        <div className="panel-body">
          {pendingPlacementSpeciesId && (
            <div className="placement-hint">
              👆 请在生态缸中点击位置放置
              <strong>{SPECIES[pendingPlacementSpeciesId].name}</strong>
              <button
                className="cancel-placement"
                onClick={() => setPendingPlacement(null)}
              >
                取消
              </button>
            </div>
          )}

          {grouped.map(group => (
            <div key={group.level} className="trophic-group">
              <div className="trophic-label">{group.label}</div>
              <div className="species-grid">
                {group.species.map(species => (
                  <div
                    key={species.id}
                    className={`species-card ${pendingPlacementSpeciesId === species.id ? 'selected' : ''}`}
                    onClick={() => handleSpeciesClick(species)}
                    title={species.description}
                  >
                    <div
                      className="species-color"
                      style={{ background: species.color }}
                    />
                    <div className="species-info">
                      <div className="species-name">
                        {species.name}
                        <span className="species-count">×{countBySpecies[species.id] ?? 0}</span>
                      </div>
                      <div className="species-sci">{species.scientificName}</div>
                    </div>
                    <button
                      className="quick-add-btn"
                      onClick={(e) => handleQuickAdd(e, species)}
                      title="快速添加一个"
                    >
                      +
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
