import { useStore } from '../state/store';
import { useDisplayClock } from '../state/selectors';

/** 将归一化时钟转换为 24 小时制的时间字符串 */
function clockToTime(clock: number): string {
  const totalMinutes = Math.floor(clock * 24 * 60);
  const hh = Math.floor(totalMinutes / 60);
  const mm = totalMinutes % 60;
  return `${hh.toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')}`;
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

  const maxIndex = Math.max(0, history.length - 1);
  // 时间轴当前值：回看时取 reviewIndex，否则指向最新
  const sliderValue = reviewIndex !== null ? reviewIndex : maxIndex;

  const handleSlider = (value: number): void => {
    // 拖到最新帧则回到实时，否则进入回看
    if (value >= maxIndex) {
      resumeLive();
    } else {
      reviewAt(value);
    }
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

      {/* 历史时间轴 */}
      <div className="timeline">
        <span className="timeline-label">
          {reviewing ? '🕐 回看历史' : '🔴 实时'}
        </span>
        <input
          type="range"
          min={0}
          max={maxIndex}
          value={sliderValue}
          step={1}
          disabled={history.length < 2}
          onChange={(e) => handleSlider(Number(e.target.value))}
          className="timeline-slider"
        />
        {reviewing && (
          <button className="btn small" onClick={resumeLive}>
            回到实时
          </button>
        )}
      </div>
    </div>
  );
}
