import type { Vec3 } from '../domain/types';

/** 向量工具函数集合（纯函数，返回新对象，避免副作用） */

export function add(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

export function sub(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

export function scale(a: Vec3, s: number): Vec3 {
  return { x: a.x * s, y: a.y * s, z: a.z * s };
}

export function length(a: Vec3): number {
  return Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z);
}

export function distance(a: Vec3, b: Vec3): number {
  return length(sub(a, b));
}

/** 归一化向量；零向量返回自身 */
export function normalize(a: Vec3): Vec3 {
  const len = length(a);
  if (len < 1e-6) return { x: 0, y: 0, z: 0 };
  return scale(a, 1 / len);
}

/** 生成范围 [-mag, mag] 的随机向量 */
export function randomVec(mag: number): Vec3 {
  return {
    x: (Math.random() * 2 - 1) * mag,
    y: (Math.random() * 2 - 1) * mag,
    z: (Math.random() * 2 - 1) * mag,
  };
}

/** 将数值限制在 [min, max] 区间 */
export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
