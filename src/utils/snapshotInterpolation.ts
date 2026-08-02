import type { Organism, Snapshot, EcoTime } from '../types';

// ============================================================
// 快照插值工具：在两个历史快照之间进行线性插值
// 支持精确到任意时刻的回看
// ============================================================

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpAngle(a: number, b: number, t: number): number {
  // 处理角度环绕（-PI 到 PI）
  let diff = b - a;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return a + diff * t;
}

function lerpPosition(
  a: [number, number, number],
  b: [number, number, number],
  t: number
): [number, number, number] {
  return [
    lerp(a[0], b[0], t),
    lerp(a[1], b[1], t),
    lerp(a[2], b[2], t)
  ];
}

/** 找到包围给定时间戳的两个快照 */
export function findBracketingSnapshots(
  snapshots: Snapshot[],
  timestamp: number
): { before: Snapshot | null; after: Snapshot | null; t: number } {
  if (snapshots.length === 0) {
    return { before: null, after: null, t: 0 };
  }

  // 时间早于第一个快照
  if (timestamp <= snapshots[0].timestamp) {
    return { before: null, after: snapshots[0], t: 0 };
  }
  // 时间晚于最后一个快照
  if (timestamp >= snapshots[snapshots.length - 1].timestamp) {
    return {
      before: snapshots[snapshots.length - 1],
      after: null,
      t: 0
    };
  }

  // 二分查找
  let lo = 0;
  let hi = snapshots.length - 1;
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1;
    if (snapshots[mid].timestamp <= timestamp) {
      lo = mid;
    } else {
      hi = mid;
    }
  }

  const before = snapshots[lo];
  const after = snapshots[hi];
  const duration = after.timestamp - before.timestamp;
  const t = duration > 0 ? (timestamp - before.timestamp) / duration : 0;

  return { before, after, t: Math.max(0, Math.min(1, t)) };
}

/** 在两个快照之间插值得到该时刻的生物列表 */
export function interpolateOrganisms(
  before: Snapshot | null,
  after: Snapshot | null,
  t: number
): Organism[] {
  if (!before && !after) return [];
  if (!before && after) return after.organisms;
  if (before && !after) return before.organisms;
  if (!before || !after) return [];

  const beforeMap = new Map<string, Organism>();
  for (const o of before.organisms) {
    beforeMap.set(o.id, o);
  }
  const afterMap = new Map<string, Organism>();
  for (const o of after.organisms) {
    afterMap.set(o.id, o);
  }

  const result: Organism[] = [];
  const allIds = new Set<string>([...beforeMap.keys(), ...afterMap.keys()]);

  for (const id of allIds) {
    const b = beforeMap.get(id);
    const a = afterMap.get(id);

    if (b && a) {
      // 两个快照中都存在：插值
      result.push({
        ...b,
        position: lerpPosition(b.position, a.position, t),
        rotation: lerpAngle(b.rotation, a.rotation, t),
        energy: lerp(b.energy, a.energy, t),
        age: lerp(b.age, a.age, t),
        resting: t < 0.5 ? b.resting : a.resting
      });
    } else if (b && !a) {
      // 仅在 before 中存在（在 after 之前死亡）：在前半段显示，后半段淡出
      if (t < 0.5) {
        result.push({
          ...b,
          energy: b.energy * (1 - t * 2)
        });
      }
    } else if (!b && a) {
      // 仅在 after 中存在（在 before 之后出生）：在后半段淡入
      if (t >= 0.5) {
        result.push({
          ...a,
          energy: a.energy * ((t - 0.5) * 2)
        });
      }
    }
  }

  return result;
}

/** 插值生态时间 */
export function interpolateEcoTime(
  before: Snapshot | null,
  after: Snapshot | null,
  t: number,
  targetTimestamp: number
): EcoTime {
  if (!before && after) return { ...after.ecoTime };
  if (before && !after) return { ...before.ecoTime };
  if (!before || !after) {
    return {
      elapsed: targetTimestamp,
      hourOfDay: (targetTimestamp / 60) * 24 % 24,
      isDaytime: false,
      lightIntensity: 0.1
    };
  }

  return {
    elapsed: targetTimestamp,
    hourOfDay: lerp(before.ecoTime.hourOfDay, after.ecoTime.hourOfDay, t),
    isDaytime: t < 0.5 ? before.ecoTime.isDaytime : after.ecoTime.isDaytime,
    lightIntensity: lerp(before.ecoTime.lightIntensity, after.ecoTime.lightIntensity, t)
  };
}
