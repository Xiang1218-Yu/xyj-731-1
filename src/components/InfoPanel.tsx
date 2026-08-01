/**
 * 右侧生物信息面板（追踪模式）
 * 实时刷新被追踪个体的能量、饥饿、状态、年龄等数据
 */
import { X, Crosshair } from 'lucide-react';
import { SPECIES, getDietDetail } from '@/data/species';
import { useEcosystemStore } from '@/store/ecosystemStore';

/** 进度条小组件 */
function Meter({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div>
      <div className="mb-1 flex justify-between text-[11px]">
        <span className="text-teal-100/55">{label}</span>
        <span className="font-mono text-teal-100/80">{Math.round(value)}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full transition-none" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

/** 状态标签的中文与配色 */
const STATUS_META = {
  active: { label: '活动中', cls: 'bg-teal-400/20 text-teal-200' },
  sleeping: { label: '休眠中', cls: 'bg-indigo-400/20 text-indigo-200' },
  dead: { label: '已死亡', cls: 'bg-red-400/20 text-red-300' },
} as const;

export function InfoPanel() {
  // version 驱动实时刷新
  useEcosystemStore((s) => s.version);
  const engine = useEcosystemStore((s) => s.engine);
  const trackedId = useEcosystemStore((s) => s.trackedId);
  const setTrackedId = useEcosystemStore((s) => s.setTrackedId);

  const creature = trackedId ? engine.creatures.find((c) => c.id === trackedId) : undefined;

  // 未追踪时展示引导提示
  if (!creature) {
    return (
      <aside className="glass-panel pointer-events-auto absolute right-4 top-20 z-10 w-60 px-4 py-4">
        <div className="flex items-center gap-2 text-teal-100/70">
          <Crosshair size={15} />
          <h2 className="font-display text-sm font-bold">追踪模式</h2>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-teal-100/45">
          点击缸中的任意生物进入追踪模式：相机将自动跟随它移动，这里会实时显示它的生命数据。
        </p>
      </aside>
    );
  }

  const def = SPECIES[creature.speciesId];
  const diet = getDietDetail(creature.speciesId);
  const status = STATUS_META[creature.status];

  return (
    <aside className="glass-panel pointer-events-auto absolute right-4 top-20 z-10 w-60 px-4 py-4">
      {/* 头部：物种名 + 退出追踪 */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{def.emoji}</span>
          <div>
            <h2 className="font-display text-sm font-bold text-teal-50">{def.name}</h2>
            <span className="text-[10px] text-teal-100/40">个体编号 {creature.id}</span>
          </div>
        </div>
        <button
          aria-label="退出追踪"
          className="rounded-lg p-1 text-teal-100/50 transition hover:bg-white/10 hover:text-teal-100"
          onClick={() => setTrackedId(null)}
        >
          <X size={15} />
        </button>
      </div>

      {/* 状态标签 */}
      <div className="mt-3 flex gap-1.5">
        <span className={`rounded-full px-2 py-0.5 text-[11px] ${status.cls}`}>{status.label}</span>
        {creature.glowing && (
          <span className="rounded-full bg-cyan-400/20 px-2 py-0.5 text-[11px] text-cyan-200">
            ✨ 发光中
          </span>
        )}
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-teal-100/60">
          {def.circadian === 'nocturnal' ? '夜行' : def.circadian === 'diurnal' ? '昼行' : '全天'}
        </span>
      </div>

      {/* 实时数据 */}
      <div className="mt-4 flex flex-col gap-3">
        <Meter label="能量" value={creature.energy} max={def.maxEnergy} color="#3ee6c4" />
        <Meter label="饥饿度" value={creature.hunger} max={100} color="#ffb454" />
        <Meter label="年龄" value={creature.age} max={def.lifespan} color="#7fa8ff" />
      </div>

      {/* 食性关系 */}
      <div className="mt-4 border-t border-white/10 pt-3 text-[11px] leading-relaxed text-teal-100/55">
        <p>
          捕食：
          {diet.preys.length > 0
            ? diet.preys.map((p) => `${SPECIES[p].emoji}${SPECIES[p].name}`).join('、')
            : '光合作用自养'}
        </p>
        <p className="mt-1">
          天敌：
          {diet.predators.length > 0
            ? diet.predators.map((p) => `${SPECIES[p].emoji}${SPECIES[p].name}`).join('、')
            : '无（顶级消费者）'}
        </p>
      </div>
    </aside>
  );
}
