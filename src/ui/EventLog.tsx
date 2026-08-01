import { useStore } from '../state/store';
import { SPECIES_CATALOG } from '../domain/species';

/** 将归一化时钟转为 HH:MM 文本 */
function clockToTime(clock: number): string {
  const totalMinutes = Math.floor(clock * 24 * 60);
  const hh = Math.floor(totalMinutes / 60);
  const mm = totalMinutes % 60;
  return `${hh.toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')}`;
}

/**
 * 捕食事件日志。
 * 实时滚动展示最近发生的「谁吃了谁」，帮助学生观察食物链的动态互动。
 */
export function EventLog(): JSX.Element {
  const events = useStore((s) => s.events);
  // 逆序：最新事件显示在最上方，最多展示 30 条
  const recent = events.slice(-30).reverse();

  return (
    <div className="panel event-log-panel">
      <h2 className="panel-title">📜 捕食事件日志</h2>
      {recent.length === 0 ? (
        <p className="hint">当生物之间发生捕食时，事件会实时记录在这里。</p>
      ) : (
        <ul className="event-list">
          {recent.map((ev) => {
            const predator = SPECIES_CATALOG[ev.predator];
            const prey = SPECIES_CATALOG[ev.prey];
            return (
              <li key={ev.id} className="event-item">
                <span className="event-time">{clockToTime(ev.clock)}</span>
                <span className="event-desc">
                  {predator.icon} {predator.name}
                  <span className="event-arrow"> 捕食 </span>
                  {prey.icon} {prey.name}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
