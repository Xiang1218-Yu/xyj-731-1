// 底部时间轴：播放/暂停、倍速、可拖动回看历史快照、昼夜指示、迷你种群图
import { Play, Pause, FastForward, History, Sun, Moon } from 'lucide-react';
import { useEcoStore } from '@/store/ecoStore';
import { SIM } from '@/simulation/types';
import { formatSimClock } from '@/simulation/format';
import { SPECIES_LIST } from '@/simulation/species';
import { Button } from './primitives';
import type { Speed } from '@/store/ecoStore';

const SPEEDS: Speed[] = [1, 2, 4];

export function Timeline() {
  const playing = useEcoStore((s) => s.playing);
  const speed = useEcoStore((s) => s.speed);
  const liveSimTime = useEcoStore((s) => s.simTime);
  const snapshots = useEcoStore((s) => s.snapshots);
  const viewingIndex = useEcoStore((s) => s.viewingIndex);
  const togglePlay = useEcoStore((s) => s.togglePlay);
  const setSpeed = useEcoStore((s) => s.setSpeed);
  const seekSnapshot = useEcoStore((s) => s.seekSnapshot);
  const env = useEcoStore((s) => s.env);

  const maxIndex = Math.max(0, snapshots.length - 1);
  // 将回看索引归一化到有效范围：快照数组丢弃旧帧后也不会越界
  const safeViewingIndex =
    viewingIndex !== null ? Math.min(Math.max(0, viewingIndex), maxIndex) : null;
  const sliderValue = safeViewingIndex ?? maxIndex;
  const isViewing = safeViewingIndex !== null;

  // 回看时显示所查看快照自己的时间，实时时显示当前 simTime
  const viewedSnap = isViewing ? snapshots[safeViewingIndex] : undefined;
  const displayTime = viewedSnap?.simTime ?? liveSimTime;
  const displayPhase = viewedSnap?.env.phase ?? env.phase;
  const displayIsNight = viewedSnap?.env.isNight ?? env.isNight;

  function handleScrub(e: React.ChangeEvent<HTMLInputElement>) {
    const idx = Number(e.target.value);
    if (idx >= maxIndex) {
      seekSnapshot(null);
    } else {
      seekSnapshot(idx);
    }
  }

  const phaseLabel =
    displayPhase === 'day'
      ? '白天'
      : displayPhase === 'dawn'
        ? '黎明'
        : displayPhase === 'dusk'
          ? '黄昏'
          : '夜晚';

  return (
    <div className="pointer-events-auto absolute bottom-0 left-0 right-0 z-20 p-4">
      <div className="panel-card mx-auto flex max-w-5xl flex-col gap-2 p-3">
        <div className="flex items-center gap-3">
          {/* 播放控制 */}
          <Button
            variant={playing ? 'outline' : 'primary'}
            size="icon"
            onClick={togglePlay}
            title={playing ? '暂停' : '播放'}
          >
            {playing ? <Pause size={16} /> : <Play size={16} />}
          </Button>

          {/* 倍速 */}
          <div className="flex items-center gap-1 rounded-xl bg-pine-900/5 p-0.5">
            {SPEEDS.map((s) => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className={`flex items-center gap-0.5 rounded-lg px-2 py-1 text-[11px] font-700 transition-all ${
                  speed === s
                    ? 'bg-pine-900 text-paper-50 shadow-soft'
                    : 'text-pine-900/60 hover:text-pine-900'
                }`}
              >
                {s}x
                {s > 1 && <FastForward size={10} />}
              </button>
            ))}
          </div>

          {/* 时间轴滑轨 */}
          <div className="relative flex-1">
            <div
              className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 rounded-full"
              style={{
                background:
                  'linear-gradient(90deg, #1b2a4a 0%, #f2c97a 25%, #6fd3e8 50%, #f2c97a 75%, #1b2a4a 100%)',
                opacity: 0.85,
              }}
            />
            <input
              type="range"
              className="eco-range relative z-10 w-full"
              min={0}
              max={maxIndex}
              value={sliderValue}
              onChange={handleScrub}
            />
            {/* 快照刻度 */}
            <div className="pointer-events-none absolute inset-x-0 top-1/2 flex -translate-y-1/2 justify-between px-0.5">
              {snapshots.map((_, i) =>
                i % 20 === 0 ? (
                  <span
                    key={i}
                    className="h-1 w-px bg-pine-950/40"
                    style={{ marginLeft: i === 0 ? 0 : undefined }}
                  />
                ) : null,
              )}
            </div>
          </div>

          {/* 时间显示 */}
          <div className="flex items-center gap-2">
            {displayIsNight ? (
              <Moon size={14} className="text-night-700" />
            ) : (
              <Sun size={14} className="text-sand-500" />
            )}
            <div className="text-right leading-tight">
              <div className="font-mono text-[12px] font-semibold text-pine-950">
                {formatSimClock(displayTime, SIM.DAY_LENGTH)}
              </div>
              <div className="text-[9.5px] text-pine-900/50">{phaseLabel}</div>
            </div>
          </div>
        </div>

        {/* 迷你种群面积图 */}
        <MiniPopulationChart />

        {/* 回看提示 */}
        {isViewing && (
          <div className="flex items-center justify-center gap-1.5 rounded-lg bg-coral-500/10 py-1 text-[11px] font-600 text-coral-600">
            <History size={12} />
            快照回看模式 · 第 {sliderValue + 1} / {snapshots.length} 帧 · 点击播放回到实时
          </div>
        )}
      </div>
    </div>
  );
}

function MiniPopulationChart() {
  const snapshots = useEcoStore((s) => s.snapshots);
  // 取最近 60 个快照，统计总量曲线
  const recent = snapshots.slice(-60);
  if (recent.length < 2) {
    return <div className="h-8" />;
  }
  const totals = recent.map((s) =>
    Object.values(s.populations).reduce((a, b) => a + b, 0),
  );
  const max = Math.max(...totals, 1);
  const w = 100;
  const h = 28;
  const points = totals
    .map((v, i) => {
      const x = (i / (totals.length - 1)) * w;
      const y = h - (v / max) * h;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  const area = `0,${h} ${points} ${w},${h}`;

  return (
    <div className="flex items-center gap-2">
      <span className="text-[9px] text-pine-900/40">种群</span>
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="h-7 flex-1">
        <polygon points={area} fill="#2e8b8b" opacity={0.18} />
        <polyline points={points} fill="none" stroke="#2e8b8b" strokeWidth={1} />
      </svg>
      <span className="font-mono text-[10px] text-pine-900/60">
        {totals[totals.length - 1] ?? 0}
      </span>
      <span className="hidden text-[9px] text-pine-900/40 sm:inline">
        {SPECIES_LIST.length} 物种
      </span>
    </div>
  );
}
