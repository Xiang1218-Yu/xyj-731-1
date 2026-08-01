import { useStore } from './store';
import { computeClock, computeLight, computePhase } from '../simulation/engine';
import type { DayPhase } from '../domain/types';

/** 当前展示帧的时钟/昼夜信息（兼容实时与回看两种模式） */
export interface DisplayClock {
  /** 归一化时钟 [0,1) */
  clock: number;
  /** 昼夜阶段 */
  phase: DayPhase;
  /** 光照强度 [0,1] */
  light: number;
  /** 模拟累计时间（秒） */
  time: number;
  /** 是否处于回看模式 */
  reviewing: boolean;
}

/**
 * Hook：返回当前应展示的时钟信息。
 * 回看模式取历史帧的时钟；否则由实时模拟时间计算。
 */
export function useDisplayClock(): DisplayClock {
  return useStore((s) => {
    if (s.reviewIndex !== null && s.history[s.reviewIndex]) {
      const snap = s.history[s.reviewIndex];
      return {
        clock: snap.clock,
        phase: snap.phase,
        light: computeLight(snap.clock),
        time: snap.time,
        reviewing: true,
      };
    }
    const clock = computeClock(s.sim.time);
    return {
      clock,
      phase: computePhase(clock),
      light: computeLight(clock),
      time: s.sim.time,
      reviewing: false,
    };
  });
}
