/**
 * 左侧物种放置面板
 * 按营养级分组展示物种卡片，点击投放到缸中；徽标显示当前存活数量
 */
import { Plus } from 'lucide-react';
import { SPECIES, SPECIES_IDS, TROPHIC_COLORS, TROPHIC_NAMES } from '@/data/species';
import { useEcosystemStore } from '@/store/ecosystemStore';
import type { TrophicLevel } from '@/types/ecosystem';

/** 营养级展示顺序：从生产者到顶级消费者 */
const LEVEL_ORDER: TrophicLevel[] = [1, 2, 3];

export function SpeciesPanel() {
  // version 驱动数量徽标实时刷新
  useEcosystemStore((s) => s.version);
  const engine = useEcosystemStore((s) => s.engine);
  const addCreature = useEcosystemStore((s) => s.addCreature);

  /** 统计某物种当前存活数量 */
  const countOf = (speciesId: (typeof SPECIES_IDS)[number]): number =>
    engine.creatures.filter((c) => c.speciesId === speciesId && c.status !== 'dead').length;

  return (
    <aside className="glass-panel pointer-events-auto absolute left-4 top-20 z-10 flex max-h-[calc(100%-12rem)] w-52 flex-col overflow-hidden">
      <div className="border-b border-white/10 px-4 py-3">
        <h2 className="font-display text-sm font-bold text-teal-100">物种库</h2>
        <p className="mt-0.5 text-[11px] text-teal-100/45">点击卡片投放到生态缸</p>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-2">
        {LEVEL_ORDER.map((level) => (
          <div key={level} className="mb-3">
            {/* 营养级分组标题 */}
            <div className="mb-1.5 flex items-center gap-2 px-1">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: TROPHIC_COLORS[level] }}
              />
              <span className="text-[11px] font-semibold tracking-wide text-teal-100/60">
                {TROPHIC_NAMES[level]}
              </span>
            </div>
            {SPECIES_IDS.filter((sid) => SPECIES[sid].trophicLevel === level).map((sid) => {
              const def = SPECIES[sid];
              const count = countOf(sid);
              return (
                <button
                  key={sid}
                  className="group mb-1 flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition hover:bg-teal-400/10"
                  onClick={() => addCreature(sid)}
                >
                  <span className="text-xl leading-none">{def.emoji}</span>
                  <span className="flex-1">
                    <span className="block text-sm text-teal-50">{def.name}</span>
                    <span className="block text-[10px] text-teal-100/40">
                      {def.circadian === 'nocturnal' ? '夜行' : def.circadian === 'diurnal' ? '昼行' : '全天'}
                      {def.bioluminescent ? ' · 发光' : ''}
                    </span>
                  </span>
                  {/* 存活数量徽标 */}
                  {count > 0 && (
                    <span className="rounded-full bg-teal-400/20 px-1.5 py-0.5 font-mono text-[10px] text-teal-200">
                      {count}
                    </span>
                  )}
                  <Plus
                    size={14}
                    className="text-teal-300 opacity-0 transition group-hover:opacity-100"
                  />
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </aside>
  );
}
