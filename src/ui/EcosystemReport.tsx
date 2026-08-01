import { useMemo } from 'react';
import { useStore, useDisplayedOrganisms } from '../state/store';
import { useDisplayClock } from '../state/selectors';
import { SPECIES_CATALOG } from '../domain/species';
import { countBySpecies } from '../simulation/engine';
import type { TrophicRole } from '../domain/types';

/** 营养级中文标签 */
const ROLE_LABEL: Record<TrophicRole, string> = {
  producer: '生产者',
  herbivore: '初级消费者',
  carnivore: '肉食消费者',
  omnivore: '杂食者',
  decomposer: '分解者',
};

/**
 * 生态系统汇总报告面板。
 * 汇总当前生态缸的整体指标：总生物数、各营养级占比、总能量、
 * 累计捕食次数、物种多样性等，形成一份可读的“演化报告”。
 */
export function EcosystemReport(): JSX.Element {
  const organisms = useDisplayedOrganisms();
  const events = useStore((s) => s.events);
  const { time, phase } = useDisplayClock();

  // 统计数据（随展示帧变化）
  const stats = useMemo(() => {
    const alive = organisms.filter((o) => o.alive);
    const population = countBySpecies(alive);
    const speciesCount = Object.keys(population).length;

    // 各营养级数量
    const byRole: Record<TrophicRole, number> = {
      producer: 0,
      herbivore: 0,
      carnivore: 0,
      omnivore: 0,
      decomposer: 0,
    };
    let totalEnergy = 0;
    for (const org of alive) {
      const species = SPECIES_CATALOG[org.speciesId];
      if (!species) continue;
      byRole[species.role] += 1;
      totalEnergy += org.energy;
    }

    // 找出数量最多的物种（优势种）
    let dominant: string | null = null;
    let dominantCount = 0;
    for (const id of Object.keys(population)) {
      if ((population[id] ?? 0) > dominantCount) {
        dominantCount = population[id] ?? 0;
        dominant = id;
      }
    }

    return {
      total: alive.length,
      speciesCount,
      byRole,
      totalEnergy,
      dominant,
      dominantCount,
    };
  }, [organisms]);

  const roleOrder: TrophicRole[] = [
    'producer',
    'herbivore',
    'omnivore',
    'carnivore',
    'decomposer',
  ];

  return (
    <div className="panel report-panel">
      <h2 className="panel-title">📊 生态系统报告</h2>

      {/* 概览指标卡片 */}
      <div className="report-cards">
        <div className="report-card">
          <span className="card-value">{stats.total}</span>
          <span className="card-label">生物总数</span>
        </div>
        <div className="report-card">
          <span className="card-value">{stats.speciesCount}</span>
          <span className="card-label">物种数</span>
        </div>
        <div className="report-card">
          <span className="card-value">{Math.round(stats.totalEnergy)}</span>
          <span className="card-label">总能量</span>
        </div>
        <div className="report-card">
          <span className="card-value">{events.length}</span>
          <span className="card-label">捕食次数</span>
        </div>
      </div>

      {/* 营养级金字塔（横向条形） */}
      <div className="pyramid">
        {roleOrder.map((role) => {
          const count = stats.byRole[role];
          const pct = stats.total > 0 ? (count / stats.total) * 100 : 0;
          return (
            <div key={role} className="pyramid-row">
              <span className="pyramid-label">{ROLE_LABEL[role]}</span>
              <div className="pyramid-bar-track">
                <div
                  className={`pyramid-bar role-${role}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="pyramid-count">{count}</span>
            </div>
          );
        })}
      </div>

      {/* 文字结论 */}
      <div className="report-summary">
        <p>
          当前为
          <strong>{phase === 'day' ? '白天' : '夜晚'}</strong>
          ，模拟已运行 <strong>{time.toFixed(0)}</strong> 秒。
        </p>
        {stats.dominant && (
          <p>
            优势物种：
            <strong>
              {SPECIES_CATALOG[stats.dominant].icon}
              {SPECIES_CATALOG[stats.dominant].name}
            </strong>
            （{stats.dominantCount} 只）。
          </p>
        )}
        <p className="report-hint">
          {stats.byRole.producer === 0
            ? '⚠️ 生产者已消失，生态系统能量来源中断，可能趋于崩溃。'
            : stats.byRole.carnivore + stats.byRole.omnivore === 0
              ? '🔎 缺少顶级捕食者，初级消费者可能过度繁殖。'
              : '✅ 各营养级均有分布，食物链结构相对完整。'}
        </p>
      </div>
    </div>
  );
}
