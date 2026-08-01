// 渲染循环驱动：每一帧把真实增量时间交给 store 推进模拟
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { useEcoStore } from '@/store/ecoStore';

export function useSimulationLoop(): void {
  const advance = useEcoStore((s) => s.advance);
  // 防止标签页切回后一次性累积过大 dt
  const last = useRef<number | null>(null);

  useFrame((_, delta) => {
    if (last.current === null) {
      last.current = delta;
      return;
    }
    const clamped = Math.min(delta, 0.05);
    advance(clamped);
    last.current = delta;
  });
}
