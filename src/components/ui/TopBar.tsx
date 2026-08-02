// 顶部状态栏：标题、各营养级数量、天数、重置
import { RotateCcw, FlaskConical } from 'lucide-react';
import { useEcoStore } from '@/store/ecoStore';
import { TROPHIC_COLORS, TROPHIC_LABELS } from '@/simulation/species';
import type { TrophicLevel } from '@/simulation/types';
import { SIM } from '@/simulation/types';
import { Button } from './primitives';

const TROPHIC_ORDER: TrophicLevel[] = ['producer', 'primary', 'secondary', 'apex', 'decomposer'];

export function TopBar() {
  const populations = useEcoStore((s) => s.populations);
  const species = useEcoStore((s) => s.species);
  const simTime = useEcoStore((s) => s.simTime);
  const reset = useEcoStore((s) => s.reset);
  const sceneName = useEcoStore((s) => s.currentSceneId);

  // 按营养级汇总数量
  const countsByTrophic = TROPHIC_ORDER.reduce(
    (acc, level) => {
      let sum = 0;
      for (const sp of Object.values(species)) {
        if (sp.trophic === level) sum += populations[sp.id] ?? 0;
      }
      acc[level] = sum;
      return acc;
    },
    {} as Record<TrophicLevel, number>,
  );

  const total = Object.values(populations).reduce((a, b) => a + b, 0);
  // 响应式订阅 simTime，倍速推进时日期也会实时更新
  const day = Math.floor(simTime / SIM.DAY_LENGTH) + 1;

  return (
    <header className="pointer-events-none absolute left-0 right-0 top-0 z-20 flex items-center justify-between gap-4 p-4">
      {/* 标题 */}
      <div className="pointer-events-auto panel-card flex items-center gap-3 px-4 py-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-pine-900 text-glow-400">
          <FlaskConical size={18} />
        </div>
        <div className="leading-tight">
          <h1 className="font-display text-[17px] font-600 text-pine-950">
            EcoSphere Lab
          </h1>
          <p className="text-[11px] text-pine-900/60">3D 虚拟生态缸 · {sceneLabel(sceneName)}</p>
        </div>
      </div>

      {/* 营养级数量胶囊 */}
      <div className="pointer-events-auto panel-card hidden items-center gap-2 px-3 py-2 md:flex">
        {TROPHIC_ORDER.map((level) => (
          <div
            key={level}
            className="flex items-center gap-1.5 rounded-lg px-2 py-1"
            title={TROPHIC_LABELS[level]}
          >
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: TROPHIC_COLORS[level] }}
            />
            <span className="font-mono text-[13px] font-600 text-pine-950">
              {countsByTrophic[level]}
            </span>
            <span className="hidden text-[10px] text-pine-900/50 lg:inline">
              {TROPHIC_LABELS[level]}
            </span>
          </div>
        ))}
        <div className="mx-1 h-5 w-px bg-pine-900/15" />
        <div className="flex items-center gap-1.5 px-1">
          <span className="text-[10px] text-pine-900/60">总个体</span>
          <span className="font-mono text-[13px] font-700 text-pine-950">{total}</span>
        </div>
      </div>

      {/* 天数与重置 */}
      <div className="pointer-events-auto flex items-center gap-2">
        <div className="panel-card flex items-center gap-2 px-4 py-2.5">
          <span className="text-[11px] text-pine-900/60">已模拟</span>
          <span className="font-mono text-[15px] font-bold text-pine-950">
            第 {day} 天
          </span>
        </div>
        <Button variant="outline" size="icon" onClick={reset} title="重置当前场景">
          <RotateCcw size={16} />
        </Button>
      </div>
    </header>
  );
}

function sceneLabel(id: string): string {
  switch (id) {
    case 'freshwater':
      return '淡水湖泊';
    case 'rainforest':
      return '热带雨林微缩';
    case 'polluted':
      return '污染水域';
    default:
      return id;
  }
}
