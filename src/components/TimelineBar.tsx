/**
 * 底部时间轴（历史回看）
 * 暂停后拖动滑块回看任意时刻的生态快照；恢复播放自动回到实时模式
 * 同时展示各营养级生物量的迷你统计条
 */
import { History, Leaf, Fish, UtensilsCrossed } from 'lucide-react';
import { useEcosystemStore } from '@/store/ecosystemStore';
import { SPECIES_IDS, SPECIES } from '@/data/species';
import type { Snapshot } from '@/types/ecosystem';

/** 格式化快照时间 mm:ss */
function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** 统计某一时刻各营养级的存活总数 */
function trophicCounts(snapshot: Snapshot | null): [number, number, number] {
  const result: [number, number, number] = [0, 0, 0];
  if (!snapshot) return result;
  for (const sid of SPECIES_IDS) {
    const count = snapshot.counts[sid] ?? 0;
    result[SPECIES[sid].trophicLevel - 1] += count;
  }
  return result;
}

export function TimelineBar() {
  // version 驱动快照数量与统计实时刷新
  useEcosystemStore((s) => s.version);
  const engine = useEcosystemStore((s) => s.engine);
  const playing = useEcosystemStore((s) => s.playing);
  const reviewIndex = useEcosystemStore((s) => s.reviewIndex);
  const setReviewIndex = useEcosystemStore((s) => s.setReviewIndex);

  const snapshotCount = engine.history.length;
  const reviewing = reviewIndex !== null;
  // 当前显示的快照：回看模式取指定快照，实时模式取最新
  const currentIndex = reviewing ? reviewIndex : snapshotCount - 1;
  const currentSnapshot = engine.history.at(Math.max(0, currentIndex));
  const [producers, primary, secondary] = trophicCounts(currentSnapshot);

  return (
    <div className="glass-panel pointer-events-auto absolute inset-x-4 bottom-4 z-10 flex items-center gap-4 px-4 py-3">
      {/* 标题与状态 */}
      <div className="flex w-24 items-center gap-2">
        <History size={15} className={reviewing ? 'text-amber-300' : 'text-teal-300'} />
        <div>
          <div className="text-xs font-semibold text-teal-100">{reviewing ? '回看模式' : '实时'}</div>
          <div className="font-mono text-[10px] text-teal-100/45">
            {currentSnapshot ? formatTime(currentSnapshot.simTime) : '--:--'}
          </div>
        </div>
      </div>

      {/* 时间轴滑块 */}
      <div className="relative flex-1">
        <input
          type="range"
          aria-label="历史时间轴"
          min={0}
          max={Math.max(0, snapshotCount - 1)}
          value={Math.max(0, currentIndex)}
          disabled={playing || snapshotCount <= 1}
          onChange={(e) => setReviewIndex(Number(e.target.value))}
          className="timeline-slider w-full"
        />
        <div className="mt-1 flex justify-between font-mono text-[10px] text-teal-100/35">
          <span>{snapshotCount > 0 ? formatTime(engine.history.at(0)?.simTime ?? 0) : '--:--'}</span>
          <span>{playing ? '暂停后可拖动回看' : `${snapshotCount} 个快照`}</span>
          <span>{snapshotCount > 0 ? formatTime(engine.history.latest()?.simTime ?? 0) : '--:--'}</span>
        </div>
      </div>

      {/* 营养级生物量统计 */}
      <div className="flex items-center gap-3 text-[11px]">
        <span className="flex items-center gap-1 text-teal-200" title="生产者">
          <Leaf size={13} />
          <span className="font-mono">{producers}</span>
        </span>
        <span className="flex items-center gap-1 text-amber-200" title="初级消费者">
          <Fish size={13} />
          <span className="font-mono">{primary}</span>
        </span>
        <span className="flex items-center gap-1 text-red-300" title="次级消费者">
          <UtensilsCrossed size={13} />
          <span className="font-mono">{secondary}</span>
        </span>
      </div>
    </div>
  );
}
