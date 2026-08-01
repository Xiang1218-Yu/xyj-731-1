/**
 * 历史快照环形缓冲区
 * 固定容量，写满后覆盖最旧记录；支持按序号读取用于时间轴回看
 */
import type { Snapshot } from '@/types/ecosystem';

export class SnapshotHistory {
  /** 缓冲容量（约等于回放秒数，因为每 1 模拟秒写一条） */
  readonly capacity: number;
  private buffer: Snapshot[] = [];

  constructor(capacity = 600) {
    this.capacity = capacity;
  }

  /** 追加一条快照，超出容量时丢弃最旧的一条 */
  push(snapshot: Snapshot): void {
    if (this.buffer.length >= this.capacity) {
      this.buffer.shift();
    }
    this.buffer.push(snapshot);
  }

  /** 当前快照总数 */
  get length(): number {
    return this.buffer.length;
  }

  /** 按序号读取快照（0 = 最旧，length-1 = 最新） */
  at(index: number): Snapshot | null {
    if (index < 0 || index >= this.buffer.length) return null;
    return this.buffer[index];
  }

  /** 读取最新一条快照 */
  latest(): Snapshot | null {
    return this.buffer.length > 0 ? this.buffer[this.buffer.length - 1] : null;
  }

  /** 清空历史（加载新场景时调用） */
  clear(): void {
    this.buffer = [];
  }
}
