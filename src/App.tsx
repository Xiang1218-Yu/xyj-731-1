import { EcosystemCanvas } from './scene/EcosystemCanvas';
import { ControlBar } from './ui/ControlBar';
import { ScenePicker } from './ui/ScenePicker';
import { SpeciesPalette } from './ui/SpeciesPalette';
import { InfoPanel } from './ui/InfoPanel';
import { FoodWebPanel } from './ui/FoodWebPanel';

/**
 * 应用根组件。
 * 布局：顶部控制条 + 左侧（场景/物种）+ 中央 3D 缸体 + 右侧（追踪/食物网）。
 */
export function App(): JSX.Element {
  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">🐟 3D 虚拟生态缸</h1>
        <span className="app-subtitle">中小学自然观察课 · 生态系统模拟</span>
      </header>

      <ControlBar />

      <div className="app-body">
        {/* 左侧栏：场景与物种投放 */}
        <aside className="sidebar left">
          <ScenePicker />
          <SpeciesPalette />
        </aside>

        {/* 中央：3D 生态缸 */}
        <main className="canvas-area">
          <EcosystemCanvas />
        </main>

        {/* 右侧栏：追踪信息与食物网 */}
        <aside className="sidebar right">
          <InfoPanel />
          <FoodWebPanel />
        </aside>
      </div>
    </div>
  );
}
