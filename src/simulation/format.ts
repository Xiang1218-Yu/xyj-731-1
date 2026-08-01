// 数值与时间格式化辅助函数

/** 把模拟秒数格式化为 "第 N 天 HH:MM" */
export function formatSimClock(simTime: number, dayLength: number): string {
  const day = Math.floor(simTime / dayLength) + 1;
  const intoDay = simTime % dayLength;
  const hoursFloat = (intoDay / dayLength) * 24;
  const hours = Math.floor(hoursFloat);
  const minutes = Math.floor((hoursFloat - hours) * 60);
  return `第 ${day} 天 ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/** 保留一位小数 */
export function round1(v: number): string {
  return (Math.round(v * 10) / 10).toFixed(1);
}

/** 能量百分比 0..100 */
export function energyPercent(energy: number, max: number): number {
  return Math.max(0, Math.min(100, (energy / max) * 100));
}
