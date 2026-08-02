import { useEcoStore } from '../../store/ecoStore';
import { PRESET_SCENES } from '../../data/presets';
import { SceneType } from '../../types';
import './TopBar.css';

// ============================================================
// 顶部工具栏：场景预设、播放控制、时间显示
// ============================================================
export default function TopBar() {
  const currentScene = useEcoStore(s => s.currentScene);
  const loadPreset = useEcoStore(s => s.loadPreset);
  const isPaused = useEcoStore(s => s.isPaused);
  const togglePause = useEcoStore(s => s.togglePause);
  const timeScale = useEcoStore(s => s.timeScale);
  const setTimeScale = useEcoStore(s => s.setTimeScale);
  const ecoTime = useEcoStore(s => s.ecoTime);
  const clearTank = useEcoStore(s => s.clearTank);
  const viewingTimestamp = useEcoStore(s => s.viewingTimestamp);
  const setViewingTimestamp = useEcoStore(s => s.setViewingTimestamp);

  const formatTime = (hour: number): string => {
    const h = Math.floor(hour);
    const m = Math.floor((hour - h) * 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  return (
    <div className="top-bar">
      <div className="top-bar-left">
        <div className="logo">
          <span className="logo-icon">🌿</span>
          <span className="logo-text">3D虚拟生态缸</span>
        </div>

        <div className="preset-buttons">
          {PRESET_SCENES.map(scene => (
            <button
              key={scene.id}
              className={`preset-btn ${currentScene.id === scene.id ? 'active' : ''}`}
              onClick={() => {
                loadPreset(scene.id);
              }}
              title={scene.description}
            >
              {scene.id === SceneType.FreshwaterLake && '💧 '}
              {scene.id === SceneType.TropicalRainforest && '🌴 '}
              {scene.id === SceneType.PollutedWater && '☣️ '}
              {scene.name}
            </button>
          ))}
        </div>
      </div>

      <div className="top-bar-center">
        <div className="time-display">
          <span className="time-icon">{ecoTime.isDaytime ? '☀️' : '🌙'}</span>
          <span className="time-text">{formatTime(ecoTime.hourOfDay)}</span>
          <span className="time-date">第 {Math.floor(ecoTime.elapsed / 60) + 1} 天</span>
        </div>
      </div>

      <div className="top-bar-right">
        {/* 速度控制 */}
        <div className="speed-control">
          {[0.5, 1, 2, 4].map(scale => (
            <button
              key={scale}
              className={`speed-btn ${timeScale === scale ? 'active' : ''}`}
              onClick={() => setTimeScale(scale)}
            >
              {scale}x
            </button>
          ))}
        </div>

        {/* 播放/暂停 */}
        <button
          className="play-btn"
          onClick={() => {
            if (viewingTimestamp !== null) {
              setViewingTimestamp(null);
            }
            togglePause();
          }}
        >
          {isPaused || viewingTimestamp !== null ? '▶ 继续' : '⏸ 暂停'}
        </button>

        <button className="clear-btn" onClick={clearTank}>
          🗑 清空
        </button>
      </div>
    </div>
  );
}
