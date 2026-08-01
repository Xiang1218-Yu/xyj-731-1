/**
 * 模拟驱动循环：挂在 Canvas 内，用 requestAnimationFrame 节奏推进生态引擎
 * 播放时按速度档位以固定步长累积推进，并在每帧结束后同步 UI 状态
 */
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { TICK_SECONDS } from '@/engine/simulation';
import { useEcosystemStore } from '@/store/ecosystemStore';

export function SimulationLoop() {
  // tick 累积器：保证模拟以固定步长推进，与帧率解耦
  const accumulator = useRef(0);

  useFrame((_, delta) => {
    const { engine, playing, speed, syncFromEngine } = useEcosystemStore.getState();
    if (playing) {
      // delta 是真实秒数，换算成模拟秒并按 TICK_SECONDS 切片推进
      accumulator.current += delta * speed;
      let guard = 0; // 防止极端卡顿下一帧补算过多导致死循环
      while (accumulator.current >= TICK_SECONDS && guard < 40) {
        engine.tick();
        accumulator.current -= TICK_SECONDS;
        guard++;
      }
    }
    // 无论播放与否都同步一次（暂停时拖动时间轴也需要刷新面板）
    syncFromEngine();
  });

  return null;
}
