import { useMemo } from 'react';
import { useStore } from '../state/store';
import { SPECIES_CATALOG } from '../domain/species';
import type { EcosystemSnapshot, SpeciesId } from '../domain/types';

/** 图表尺寸常量 */
const WIDTH = 300;
const HEIGHT = 150;
const PAD_LEFT = 28;
const PAD_BOTTOM = 18;
const PAD_TOP = 8;
const PAD_RIGHT = 8;

/** 单条物种的折线数据 */
interface SeriesPoint {
  x: number;
  y: number;
}

/**
 * 种群趋势图。
 * 将历史快照中各物种数量随时间的变化绘制为多条折线，
 * 直观展示食物链的动态演化（生产者/消费者此消彼长）。
 * 回看模式下显示一条竖直游标标记当前回看时刻。
 */
export function PopulationTrendChart(): JSX.Element {
  const history = useStore((s) => s.history);
  const reviewIndex = useStore((s) => s.reviewIndex);

  // 参与绘制的物种：取历史中出现过的所有物种
  const speciesIds = useMemo<SpeciesId[]>(() => {
    const set = new Set<SpeciesId>();
    for (const snap of history) {
      for (const id of Object.keys(snap.population)) {
        if ((snap.population[id] ?? 0) > 0) set.add(id);
      }
    }
    return Array.from(set);
  }, [history]);

  // 计算 y 轴最大值（各时刻各物种数量的最大值）
  const maxCount = useMemo(() => {
    let max = 1;
    for (const snap of history) {
      for (const id of Object.keys(snap.population)) {
        max = Math.max(max, snap.population[id] ?? 0);
      }
    }
    return max;
  }, [history]);

  // 为每个物种生成折线路径
  const lines = useMemo(() => {
    if (history.length < 2) return [];
    const plotW = WIDTH - PAD_LEFT - PAD_RIGHT;
    const plotH = HEIGHT - PAD_TOP - PAD_BOTTOM;
    const n = history.length;
    return speciesIds.map((id) => {
      const points: SeriesPoint[] = history.map((snap: EcosystemSnapshot, i) => {
        const x = PAD_LEFT + (i / (n - 1)) * plotW;
        const count = snap.population[id] ?? 0;
        const y = PAD_TOP + plotH - (count / maxCount) * plotH;
        return { x, y };
      });
      const d = points
        .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
        .join(' ');
      return { id, d, color: SPECIES_CATALOG[id].color };
    });
  }, [history, speciesIds, maxCount]);

  // 回看游标 x 坐标
  const cursorX = useMemo(() => {
    if (reviewIndex === null || history.length < 2) return null;
    const plotW = WIDTH - PAD_LEFT - PAD_RIGHT;
    return PAD_LEFT + (reviewIndex / (history.length - 1)) * plotW;
  }, [reviewIndex, history.length]);

  return (
    <div className="panel trend-panel">
      <h2 className="panel-title">📈 种群趋势</h2>
      {history.length < 2 ? (
        <p className="hint">模拟运行片刻后，这里将实时绘制各物种数量的变化曲线。</p>
      ) : (
        <>
          <svg
            width="100%"
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            className="trend-svg"
            role="img"
            aria-label="种群数量随时间变化趋势图"
          >
            {/* 坐标轴 */}
            <line
              x1={PAD_LEFT}
              y1={PAD_TOP}
              x2={PAD_LEFT}
              y2={HEIGHT - PAD_BOTTOM}
              stroke="#4a5a75"
              strokeWidth={1}
            />
            <line
              x1={PAD_LEFT}
              y1={HEIGHT - PAD_BOTTOM}
              x2={WIDTH - PAD_RIGHT}
              y2={HEIGHT - PAD_BOTTOM}
              stroke="#4a5a75"
              strokeWidth={1}
            />
            {/* y 轴刻度：0 与最大值 */}
            <text x={PAD_LEFT - 4} y={PAD_TOP + 6} textAnchor="end" fontSize="9" fill="#9fb0cc">
              {maxCount}
            </text>
            <text
              x={PAD_LEFT - 4}
              y={HEIGHT - PAD_BOTTOM}
              textAnchor="end"
              fontSize="9"
              fill="#9fb0cc"
            >
              0
            </text>
            <text
              x={(WIDTH + PAD_LEFT) / 2}
              y={HEIGHT - 4}
              textAnchor="middle"
              fontSize="9"
              fill="#9fb0cc"
            >
              时间 →
            </text>

            {/* 折线 */}
            {lines.map((line) => (
              <path
                key={line.id}
                d={line.d}
                fill="none"
                stroke={line.color}
                strokeWidth={1.6}
                opacity={0.9}
              />
            ))}

            {/* 回看游标 */}
            {cursorX !== null && (
              <line
                x1={cursorX}
                y1={PAD_TOP}
                x2={cursorX}
                y2={HEIGHT - PAD_BOTTOM}
                stroke="#ffd54f"
                strokeWidth={1.2}
                strokeDasharray="3 2"
              />
            )}
          </svg>

          {/* 图例 */}
          <div className="trend-legend">
            {speciesIds.map((id) => (
              <span key={id} className="legend-item">
                <span
                  className="legend-dot"
                  style={{ background: SPECIES_CATALOG[id].color }}
                />
                {SPECIES_CATALOG[id].name}
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
