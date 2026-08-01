import { EcosystemCanvas } from './scene/EcosystemCanvas';
import { ControlBar } from './ui/ControlBar';
import { ScenePicker } from './ui/ScenePicker';
import { SpeciesPalette } from './ui/SpeciesPalette';
import { InfoPanel } from './ui/InfoPanel';
import { FoodWebPanel } from './ui/FoodWebPanel';
import { PopulationTrendChart } from './ui/PopulationTrendChart';
import { EventLog } from './ui/EventLog';
import { EcosystemReport } from './ui/EcosystemReport';

/**
 * 应用根组件。
 * 布局：顶部标题 + 控制条 + 三栏主体。
 * - 左栏：场景选择、物种投放、生态系统报告
 * - 中栏：3D 生态缸
 * - 右栏：追踪信息、食物网、种群趋势、捕食事件日志
 * 左右栏均可独立纵向滚动，避免内容被截断。
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
        {/* 左侧栏：场景 / 物种 / 报告 */}
        <aside className="sidebar left">
          <ScenePicker />
          <SpeciesPalette />
          <EcosystemReport />
        </aside>

        {/* 中央：3D 生态缸 */}
        <main className="canvas-area">
          <EcosystemCanvas />
        </main>

        {/* 右侧栏：追踪 / 食物网 / 趋势 / 事件日志 */}
        <aside className="sidebar right">
          <InfoPanel />
          <FoodWebPanel />
          <PopulationTrendChart />
          <EventLog />
        </aside>
      </div>
    </div>
  );
}
