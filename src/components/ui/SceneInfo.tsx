import { useEcoStore } from '../../store/ecoStore';
import './SceneInfo.css';

// ============================================================
// 场景信息面板：显示当前场景描述和生态统计
// ============================================================

export default function SceneInfo() {
  const currentScene = useEcoStore(s => s.currentScene);
  const organisms = useEcoStore(s => s.organisms);
  const ecoTime = useEcoStore(s => s.ecoTime);

  const aliveCount = organisms.filter(o => o.alive).length;
  const speciesCount = new Set(organisms.filter(o => o.alive).map(o => o.speciesId)).size;
  const totalEnergy = organisms
    .filter(o => o.alive)
    .reduce((sum, o) => sum + o.energy, 0);

  return (
    <div className="scene-info">
      <div className="scene-info-header">
        <span className="scene-title">{currentScene.name}</span>
        {currentScene.pollutionLevel > 0 && (
          <span className="pollution-badge">
            污染度 {Math.round(currentScene.pollutionLevel * 100)}%
          </span>
        )}
      </div>
      <div className="scene-stats">
        <div className="stat">
          <span className="stat-num">{speciesCount}</span>
          <span className="stat-name">物种</span>
        </div>
        <div className="stat">
          <span className="stat-num">{aliveCount}</span>
          <span className="stat-name">个体</span>
        </div>
        <div className="stat">
          <span className="stat-num">{Math.round(totalEnergy)}</span>
          <span className="stat-name">总能量</span>
        </div>
        <div className="stat">
          <span className="stat-num">
            {Math.floor(ecoTime.hourOfDay)}:
            {Math.floor((ecoTime.hourOfDay % 1) * 60).toString().padStart(2, '0')}
          </span>
          <span className="stat-name">{ecoTime.isDaytime ? '白天' : '夜晚'}</span>
        </div>
      </div>
    </div>
  );
}
