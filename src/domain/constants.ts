/**
 * 生态缸全局常量
 */

/** 缸体半尺寸（以原点为中心的立方体，范围为 [-HALF, HALF]） */
export const TANK_HALF = {
  x: 8,
  y: 5,
  z: 8,
} as const;

/** 一个完整昼夜的真实时长（秒）。模拟时间按此循环。 */
export const DAY_LENGTH_SECONDS = 60;

/** 白天所占的时钟比例：clock ∈ [0.25, 0.75) 记为白天 */
export const DAY_START = 0.25;
export const DAY_END = 0.75;

/** 历史快照采样间隔（秒） */
export const SNAPSHOT_INTERVAL = 0.5;

/** 历史快照最大保留数量（约对应最近的一段时间） */
export const MAX_SNAPSHOTS = 1200;

/** 单物种数量上限，防止指数爆炸导致卡顿 */
export const MAX_PER_SPECIES = 120;
