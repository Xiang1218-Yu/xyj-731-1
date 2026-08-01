import { useStore } from '../state/store';
import { SCENE_PRESETS } from '../domain/presets';

/**
 * 场景选择器：列出所有预设生态场景，一键加载。
 */
export function ScenePicker(): JSX.Element {
  const sceneId = useStore((s) => s.sceneId);
  const loadScene = useStore((s) => s.loadScene);

  return (
    <div className="panel scene-picker">
      <h2 className="panel-title">🌍 预设生态场景</h2>
      <div className="scene-list">
        {SCENE_PRESETS.map((scene) => (
          <button
            key={scene.id}
            className={`scene-card ${scene.id === sceneId ? 'active' : ''}`}
            onClick={() => loadScene(scene.id)}
            title={scene.description}
          >
            <span className="scene-name">{scene.name}</span>
            <span className="scene-desc">{scene.description}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
