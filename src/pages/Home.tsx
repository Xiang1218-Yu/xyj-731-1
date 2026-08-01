/**
 * 主观察页：3D 视口全屏铺底，四周悬浮玻璃面板
 * 默认自动加载「淡水湖泊」场景，打开即可观察
 */
import { useEffect } from 'react';
import { TankScene } from '@/three/TankScene';
import { Toolbar } from '@/components/Toolbar';
import { SpeciesPanel } from '@/components/SpeciesPanel';
import { InfoPanel } from '@/components/InfoPanel';
import { FoodWebPanel } from '@/components/FoodWebPanel';
import { TimelineBar } from '@/components/TimelineBar';
import { PRESETS } from '@/data/presets';
import { useEcosystemStore } from '@/store/ecosystemStore';

export default function Home() {
  const panels = useEcosystemStore((s) => s.panels);

  // 首次进入自动加载淡水湖泊场景，让学生立刻看到完整生态
  useEffect(() => {
    const { engine, loadPreset } = useEcosystemStore.getState();
    if (engine.creatures.length === 0) {
      loadPreset(PRESETS[0]);
    }
  }, []);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#06232b]">
      {/* 3D 生态缸视口（全屏铺底） */}
      <div className="absolute inset-0">
        <TankScene />
      </div>

      {/* 悬浮 UI 层 */}
      <Toolbar />
      {panels.species && <SpeciesPanel />}
      <InfoPanel />
      {panels.foodWeb && <FoodWebPanel />}
      {panels.timeline && <TimelineBar />}
    </div>
  );
}
