import { useStore } from '../state/store';
import { useDisplayClock } from '../state/selectors';
import type { EcosystemSnapshot } from '../domain/types';

/** 将归一化时钟转换为 24 小时制的时间字符串 */
function clockToTime(clock: number): string {
  const totalMinutes = Math.floor(clock * 24 * 60);
  const hh = Math.floor(totalMinutes / 60);
  const mm = totalMinutes % 60;
  return `${hh.toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')}`;
}

/**
 * 在历史快照中找到"模拟时间最接近 targetTime"的帧索引。
 * 快照按时间单调递增，用线性扫描取最小时间差；历史为空返回 -1。
 */
function findNearestIndexByTime(
  history: EcosystemSnapshot[],
  targetTime: number,
): number {
  if (history.length === 0) return -1;
  let bestIdx = 0;
  let bestDiff = Infinity;
  for (let i = 0; i < history.length; i += 1) {
    const diff = Math.abs(history[i].time - targetTime);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestIdx = i;
    }
  }
  return bestIdx;
}

/**
 * 顶部控制条：昼夜指示、播放/暂停、速度、以及历史时间轴回看。
 */
export function ControlBar(): JSX.Element {
  const running = useStore((s) => s.running);
  const speed = useStore((s) => s.speed);
  const setRunning = useStore((s) => s.setRunning);
  const setSpeed = useStore((s) => s.setSpeed);
  const history = useStore((s) => s.history);
  const reviewIndex = useStore((s) => s.reviewIndex);
  const reviewAt = useStore((s) => s.reviewAt);
  const resumeLive = useStore((s) => s.resumeLive);

  const { clock, phase, time, reviewing } = useDisplayClock();

  // 时间轴以"真实模拟时间"为刻度，而非帧索引，方便定位到具体时刻。
  const startTime = history.length > 0 ? history[0].time : 0;
  const endTime = history.length > 0 ? history[history.length - 1].time : 0;
  // 滑块当前值：回看时取该帧真实时间，否则贴最新时间。
  const sliderTime =
    reviewIndex !== null && history[reviewIndex]
      ? history[reviewIndex].time
      : endTime;

  const handleSlider = (targetTime: number): void => {
    // 拖到（接近）最新时刻则回到实时，否则按时间定位到最近的历史帧。
    if (targetTime >= endTime - 1e-6) {
      resumeLive();
      return;
    }
    const idx = findNearestIndexByTime(history, targetTime);
    if (idx >= 0) reviewAt(idx);
  };

  return (
    <div className="control-bar">
      {/* 昼夜指示 */}
      <div className={`day-indicator ${phase}`}>
        <span className="day-icon">{phase === 'day' ? '☀️' : '🌙'}</span>
        <span className="day-text">
          {phase === 'day' ? '白天' : '夜晚'} · {clockToTime(clock)}
        </span>
      </div>

      {/* 播放控制 */}
      <div className="playback-controls">
        <button
          className="btn"
          onClick={() => setRunning(!running)}
          disabled={reviewing}
          title={reviewing ? '回看模式下已暂停' : ''}
        >
          {running ? '⏸ 暂停' : '▶ 播放'}
        </button>

        <div className="speed-controls">
          {[0.5, 1, 2, 4].map((sp) => (
            <button
              key={sp}
              className={`speed-btn ${speed === sp ? 'active' : ''}`}
              onClick={() => setSpeed(sp)}
            >
              {sp}×
            </button>
          ))}
        </div>

        <span className="sim-time">模拟时间 {time.toFixed(1)}s</span>
      </div>

      {/* 历史时间轴（以真实时间为刻度） */}
      <div className="timeline">
        <span className="timeline-label">
          {reviewing ? `🕐 回看 ${sliderTime.toFixed(1)}s` : '🔴 实时'}
        </span>
        <span className="timeline-tick">{startTime.toFixed(0)}s</span>
        <input
          type="range"
          min={startTime}
          max={endTime}
          value={sliderTime}
          step={0.1}
          disabled={history.length < 2}
          onChange={(e) => handleSlider(Number(e.target.value))}
          className="timeline-slider"
        />
        <span className="timeline-tick">{endTime.toFixed(0)}s</span>
        {reviewing && (
          <button className="btn small" onClick={resumeLive}>
            回到实时
          </button>
        )}
      </div>
    </div>
  );
}
