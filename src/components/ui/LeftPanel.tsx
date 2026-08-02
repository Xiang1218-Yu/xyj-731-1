// 左侧面板：预设场景卡片 + 物种库（按营养级分组，点击放置）
import { Plus, Leaf, Bug, Fish, Skull, Recycle } from 'lucide-react';
import { useEcoStore } from '@/store/ecoStore';
import { PRESETS } from '@/simulation/presets';
import { SPECIES_BY_TROPHIC, TROPHIC_COLORS, TROPHIC_LABELS } from '@/simulation/species';
import type { TrophicLevel } from '@/simulation/types';
import { SIM } from '@/simulation/types';
import { Card } from './primitives';

const TROPHIC_ICONS: Record<TrophicLevel, typeof Leaf> = {
  producer: Leaf,
  primary: Bug,
  secondary: Fish,
  apex: Skull,
  decomposer: Recycle,
};

const ORDER: TrophicLevel[] = ['producer', 'primary', 'secondary', 'apex', 'decomposer'];

export function LeftPanel() {
  const loadScene = useEcoStore((s) => s.loadScene);
  const addSpecies = useEcoStore((s) => s.addSpecies);
  const currentSceneId = useEcoStore((s) => s.currentSceneId);
  const creatureCount = useEcoStore((s) => s.creatures.length);

  return (
    <aside className="flex w-72 max-h-full flex-col gap-3">
      {/* 预设场景 */}
      <Card className="p-3">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="panel-title">预设生态场景</h2>
          <span className="text-[10px] text-pine-900/50">一键加载</span>
        </div>
        <div className="flex flex-col gap-2">
          {PRESETS.map((p) => {
            const active = p.id === currentSceneId;
            return (
              <button
                key={p.id}
                onClick={() => loadScene(p.id)}
                className={`group relative overflow-hidden rounded-xl border p-2.5 text-left transition-all ${
                  active
                    ? 'border-pine-900 ring-2 ring-pine-900/30'
                    : 'border-pine-900/15 hover:border-pine-900/40 hover:shadow-soft'
                }`}
                style={{
                  background: `linear-gradient(135deg, ${p.gradient[0]}, ${p.gradient[1]})`,
                }}
              >
                <div className="relative z-10">
                  <div className="font-display text-[14px] font-600 text-white drop-shadow">
                    {p.name}
                  </div>
                  <div className="mt-0.5 line-clamp-2 text-[10.5px] leading-snug text-white/85">
                    {p.description}
                  </div>
                </div>
                {active && (
                  <div className="absolute right-2 top-2 rounded-full bg-white/90 px-1.5 py-0.5 text-[9px] font-700 text-pine-900">
                    当前
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </Card>

      {/* 物种库 */}
      <Card className="flex min-h-0 flex-1 flex-col p-3">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="panel-title">物种库</h2>
          <span className="font-mono text-[10px] text-pine-900/50">
            {creatureCount}/{SIM.MAX_CREATURES}
          </span>
        </div>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
          {ORDER.map((level) => {
            const list = SPECIES_BY_TROPHIC[level];
            if (list.length === 0) return null;
            const Icon = TROPHIC_ICONS[level];
            return (
              <div key={level}>
                <div className="mb-1.5 flex items-center gap-1.5">
                  <Icon size={12} style={{ color: TROPHIC_COLORS[level] }} />
                  <span
                    className="text-[10.5px] font-700 uppercase tracking-wider"
                    style={{ color: TROPHIC_COLORS[level] }}
                  >
                    {TROPHIC_LABELS[level]}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  {list.map((sp) => (
                    <button
                      key={sp.id}
                      onClick={() => addSpecies(sp.id, 1)}
                      disabled={creatureCount >= SIM.MAX_CREATURES}
                      className="group flex items-center gap-2.5 rounded-lg border border-transparent bg-paper-50/60 px-2.5 py-1.5 text-left transition-all hover:border-pine-900/20 hover:bg-paper-200/70 disabled:opacity-40"
                      title={sp.description}
                    >
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: sp.color }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[12.5px] font-600 text-pine-950">
                          {sp.name}
                        </div>
                        {sp.latin && (
                          <div className="truncate text-[9.5px] italic text-pine-900/45">
                            {sp.latin}
                          </div>
                        )}
                      </div>
                      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-pine-900/5 text-pine-900/60 transition-all group-hover:bg-pine-900 group-hover:text-paper-50">
                        <Plus size={13} />
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </aside>
  );
}
