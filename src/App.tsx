import Scene from './components/three/Scene';
import TopBar from './components/ui/TopBar';
import SpeciesPanel from './components/ui/SpeciesPanel';
import FoodChainPanel from './components/ui/FoodChainPanel';
import TrackingPanel from './components/ui/TrackingPanel';
import Timeline from './components/ui/Timeline';
import SceneInfo from './components/ui/SceneInfo';
import './App.css';

// ============================================================
// 应用根组件
// 布局：
//   ┌─────────────────────────────────────┐
//   │            顶部工具栏                │
//   ├──────┬──────────────────────┬───────┤
//   │      │                      │       │
//   │ 物种 │                      │ 食物链│
//   │ 面板 │      3D 生态缸       │ 追踪  │
//   │      │                      │ 面板  │
//   │      ├──────────────────────┤       │
//   │      │      时间轴          │       │
//   └──────┴──────────────────────┴───────┘
// ============================================================

export default function App() {
  return (
    <div className="app-container">
      {/* 3D 画布 */}
      <div className="canvas-wrapper">
        <Scene />
      </div>

      {/* UI 覆盖层 */}
      <div className="ui-overlay">
        <TopBar />
        <SceneInfo />
        <SpeciesPanel />
        <FoodChainPanel />
        <TrackingPanel />
        <Timeline />
      </div>
    </div>
  );
}
