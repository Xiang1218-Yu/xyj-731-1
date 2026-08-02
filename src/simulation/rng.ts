// 带种子的伪随机数生成器（Mulberry32），保证预设场景可复现

export type RNG = () => number;

/** 创建一个 Mulberry32 随机数生成器 */
export function createRng(seed: number): RNG {
  let a = seed >>> 0;
  return function rng(): number {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 在 [min, max) 区间取浮点随机数 */
export function randRange(rng: RNG, min: number, max: number): number {
  return min + rng() * (max - min);
}

/** 在 [min, max] 区间取整数随机数 */
export function randInt(rng: RNG, min: number, max: number): number {
  return Math.floor(randRange(rng, min, max + 1));
}

/** 从数组中随机取一个元素 */
export function pick<T>(rng: RNG, arr: readonly T[]): T {
  const idx = Math.floor(rng() * arr.length);
  // noUncheckedIndexedAccess 下需保证非空
  const item = arr[idx];
  if (item === undefined) {
    throw new Error('pick: 数组为空');
  }
  return item;
}
