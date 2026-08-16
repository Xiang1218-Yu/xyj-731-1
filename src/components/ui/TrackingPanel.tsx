import { useEcoStore } from '../../store/ecoStore';
import { SPECIES } from '../../data/species';
import { TrophicLevel, ActivityPattern, MovementType } from '../../types';
import './TrackingPanel.css';

// ============================================================
// 追踪信息面板：显示被追踪生物的实时数据
// ============================================================

const TROPHIC_NAMES: Record<TrophicLevel, string> = {
  [TrophicLevel.Producer]: '生产者',
  [TrophicLevel.PrimaryConsumer]: '初级消费者',
  [TrophicLevel.SecondaryConsumer]: '次级消费者',
  [TrophicLevel.TertiaryConsumer]: '顶级捕食者',
  [TrophicLevel.Decomposer]: '分解者'
};

const ACTIVITY_NAMES: Record<ActivityPattern, string> = {
  [ActivityPattern.Diurnal]: '昼行性',
  [ActivityPattern.Nocturnal]: '夜行性',
  [ActivityPattern.Crepuscular]: '晨昏性',
  [ActivityPattern.Always]: '全天候'
};

const MOVEMENT_NAMES: Record<MovementType, string> = {
  [MovementType.Static]: '固定',
  [MovementType.Swim]: '游泳',
  [MovementType.Walk]: '爬行',
  [MovementType.Float]: '漂浮',
  [MovementType.Fly]: '飞行'
};

export default function TrackingPanel() {
  const trackedOrganismId = useEcoStore(s => s.trackedOrganismId);
  const organisms = useEcoStore(s => s.organisms);
  const setTrackedOrganism = useEcoStore(s => s.setTrackedOrganism);
  const setHighlightedSpecies = useEcoStore(s => s.setHighlightedSpecies);
  const ecoTime = useEcoStore(s => s.ecoTime);

  if (!trackedOrganismId) return null;

  const organism = organisms.find(o => o.id === trackedOrganismId);
  if (!organism) {
    return (
      <div className="tracking-panel">
        <div className="tracking-header">
          <span>生物已不存在</span>
          <button
            onClick={() => {
              setTrackedOrganism(null);
              setHighlightedSpecies(null);
            }}
          >
            ✕
          </button>
        </div>
      </div>
    );
  }

  const species = SPECIES[organism.speciesId];
  if (!species) return null;

  const energyPercent = (organism.energy / species.maxEnergy) * 100;
  const energyColor =
    energyPercent > 60 ? '#4caf50' : energyPercent > 30 ? '#ff9800' : '#f44336';

  const preyNames = species.preyIds
    .map(id => SPECIES[id]?.name)
    .filter((n): n is string => !!n);

  // 污染耐受度描述
  const toleranceText =
    species.pollutionTolerance > 0.8 ? '强（耐污种）' :
    species.pollutionTolerance > 0.5 ? '中等' :
    species.pollutionTolerance > 0.25 ? '较弱' : '极敏感';
  const pollutionPercent = Math.round(organism.pollutionDamage * 100);
  const pollutionColor =
    pollutionPercent < 30 ? '#4caf50' :
    pollutionPercent < 70 ? '#ff9800' : '#f44336';

  return (
    <div className="tracking-panel">
      <div className="tracking-header">
        <div className="tracking-title">
          <span
            className="tracking-dot"
            style={{ background: species.color }}
          />
          <div>
            <div className="tracking-name">{species.name}</div>
            <div className="tracking-sci">{species.scientificName}</div>
          </div>
        </div>
        <button
          className="close-btn"
          onClick={() => {
            setTrackedOrganism(null);
            setHighlightedSpecies(null);
          }}
        >
          ✕
        </button>
      </div>

      <div className="tracking-body">
        {/* 状态标签 */}
        <div className="status-tags">
          <span className={`tag ${organism.resting ? 'resting' : 'active'}`}>
            {organism.resting ? '💤 休眠中' : '✨ 活动中'}
          </span>
          <span className="tag time-tag">
            {ecoTime.isDaytime ? '☀️ 白天' : '🌙 夜晚'}
          </span>
        </div>

        {/* 能量条 */}
        <div className="stat-row">
          <div className="stat-label">能量值</div>
          <div className="energy-bar">
            <div
              className="energy-fill"
              style={{
                width: `${energyPercent}%`,
                background: energyColor
              }}
            />
          </div>
          <div className="stat-value" style={{ color: energyColor }}>
            {Math.round(organism.energy)}/{species.maxEnergy}
          </div>
        </div>

        {/* 污染伤害条（仅在有污染伤害时显示） */}
        {organism.pollutionDamage > 0.05 && (
          <div className="stat-row">
            <div className="stat-label">污染伤</div>
            <div className="energy-bar">
              <div
                className="energy-fill"
                style={{
                  width: `${pollutionPercent}%`,
                  background: pollutionColor
                }}
              />
            </div>
            <div className="stat-value" style={{ color: pollutionColor }}>
              {pollutionPercent}%
            </div>
          </div>
        )}

        {/* 基本信息 */}
        <div className="info-grid">
          <div className="info-item">
            <span className="info-label">营养级</span>
            <span className="info-value">{TROPHIC_NAMES[species.trophicLevel]}</span>
          </div>
          <div className="info-item">
            <span className="info-label">作息</span>
            <span className="info-value">{ACTIVITY_NAMES[species.activityPattern]}</span>
          </div>
          <div className="info-item">
            <span className="info-label">运动方式</span>
            <span className="info-value">{MOVEMENT_NAMES[species.movementType]}</span>
          </div>
          <div className="info-item">
            <span className="info-label">年龄</span>
            <span className="info-value">{Math.floor(organism.age)}s</span>
          </div>
          <div className="info-item">
            <span className="info-label">坐标</span>
            <span className="info-value">
              ({organism.position[0].toFixed(1)}, {organism.position[1].toFixed(1)},{' '}
              {organism.position[2].toFixed(1)})
            </span>
          </div>
          {species.glowColor && (
            <div className="info-item">
              <span className="info-label">特性</span>
              <span className="info-value glow-tag">生物发光</span>
            </div>
          )}
          <div className="info-item">
            <span className="info-label">耐污性</span>
            <span className="info-value">{toleranceText}</span>
          </div>
        </div>

        {/* 猎物 */}
        {preyNames.length > 0 && (
          <div className="diet-section">
            <div className="diet-label">主要食物</div>
            <div className="diet-list">
              {preyNames.map(name => (
                <span key={name} className="diet-tag">{name}</span>
              ))}
            </div>
          </div>
        )}

        {/* 描述 */}
        <div className="description">{species.description}</div>
      </div>
    </div>
  );
}
