import { useFrame } from '@react-three/fiber';
import { useStore } from '../state/store';

/** 单帧最大步长（秒），防止切后台回来后一次跳变过大 */
const MAX_DT = 0.1;

/**
 * 模拟驱动器：挂载在 Canvas 内，每一渲染帧推进一次生态模拟。
 * 本身不渲染任何内容。
 */
export function SimulationDriver(): null {
  const advance = useStore((s) => s.advance);

  useFrame((_, delta) => {
    advance(Math.min(delta, MAX_DT));
  });

  return null;
}
