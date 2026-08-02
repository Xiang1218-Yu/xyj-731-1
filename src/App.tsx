// 应用根组件：3D Canvas 全屏铺底，UI 面板浮层叠加
import { Canvas } from '@react-three/fiber';
import { Scene } from '@/components/three/Scene';
import { TopBar } from '@/components/ui/TopBar';
import { LeftPanel } from '@/components/ui/LeftPanel';
import { FoodWebPanel } from '@/components/ui/FoodWebPanel';
import { InfoPanel } from '@/components/ui/InfoPanel';
import { Timeline } from '@/components/ui/Timeline';

export default function App() {
  return (
    <div className="relative h-full w-full overflow-hidden bg-[#0b1f1a] font-sans text-pine-950">
      {/* 3D 画布全屏 */}
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [12, 9, 14], fov: 45, near: 0.1, far: 100 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
      >
        <Scene />
      </Canvas>

      {/* 顶部渐变遮罩，让状态栏更清晰 */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-24 bg-gradient-to-b from-black/25 to-transparent" />

      {/* UI 浮层 */}
      <TopBar />
      <div className="pointer-events-none absolute bottom-40 left-4 right-4 top-20 z-20 flex justify-between gap-4">
        {/* 左侧面板容器，留出底部空间避免遮挡时间轴 */}
        <div className="pointer-events-auto flex max-h-full flex-col">
          <LeftPanel />
        </div>
        {/* 右侧面板容器：食物网 + 生物追踪，底部留白避免被时间轴遮挡 */}
        <div className="pointer-events-none flex max-h-full flex-col gap-3 overflow-y-auto pr-1">
          <div className="pointer-events-auto">
            <FoodWebPanel />
          </div>
          <div className="pointer-events-auto">
            <InfoPanel />
          </div>
        </div>
      </div>

      <Timeline />
    </div>
  );
}
