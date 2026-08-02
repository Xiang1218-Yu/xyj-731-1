// 生物信息面板：追踪模式下实时展示选中生物的能量、年龄、状态等数据
import { Crosshair, Moon, Sun, Activity, Heart, Clock, Target } from 'lucide-react';
import { useEcoStore } from '@/store/ecoStore';
import { SPECIES, TROPHIC_COLORS, TROPHIC_LABELS } from '@/simulation/species';
import { energyPercent } from '@/simulation/format';
import { Badge, Button } from './primitives';

export function InfoPanel() {
  const inspectingId = useEcoStore((s) => s.inspectingCreatureId);
  const liveCreatures = useEcoStore((s) => s.creatures);
  const liveEnv = useEcoStore((s) => s.env);
  const snapshots = useEcoStore((s) => s.snapshots);
  const viewingIndex = useEcoStore((s) => s.viewingIndex);
  const trackCreature = useEcoStore((s) => s.trackCreature);

  // 回看模式下从对应快照中读取生物与环境，实时模式下使用当前状态
  const activeSnapshot = viewingIndex !== null ? snapshots[viewingIndex] ?? null : null;
  const creatures = activeSnapshot?.creatures ?? liveCreatures;
  const env = activeSnapshot?.env ?? liveEnv;

  const creature = inspectingId
    ? creatures.find((c) => c.id === inspectingId)
    : undefined;

  if (!creature) {
    return (
      <div className="panel-card relative w-80 overflow-hidden p-5">
        {/* 脉冲引导条，提示下方有可交互的追踪面板 */}
        <div className="absolute inset-x-0 top-0 h-1 animate-pulse bg-gradient-to-r from-glow-500 via-aqua-500 to-glow-500" />
        <div className="flex flex-col items-center gap-3 pt-2 text-center">
          <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-aqua-500/10 text-aqua-600">
            <Crosshair size={26} />
            <span className="absolute inset-0 animate-ping rounded-full bg-aqua-500/20" />
          </div>
          <div>
            <h3 className="font-display text-[16px] font-semibold text-pine-950">
              未追踪生物
            </h3>
            <p className="mt-1 text-[11.5px] leading-relaxed text-pine-900/55">
              点击生态缸中的任意生物，即可进入追踪模式。
            </p>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-aqua-500/10 px-3 py-1.5 text-[10.5px] font-semibold text-aqua-600">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-aqua-500 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-aqua-500" />
            </span>
            相机跟随 · 光环高亮 · 实时数据
          </div>
          <p className="text-[10px] leading-relaxed text-pine-900/40">
            追踪后本面板会实时刷新该生物的能量、年龄、状态与捕食目标
          </p>
        </div>
      </div>
    );
  }

  const sp = SPECIES[creature.speciesId];
  if (!sp) return null;

  const energyPct = energyPercent(creature.energy, sp.maxEnergy);
  const targetCreature = creature.targetId
    ? creatures.find((c) => c.id === creature.targetId)
    : undefined;
  const targetName = targetCreature ? SPECIES[targetCreature.speciesId]?.name : undefined;

  return (
    <div className="panel-card relative w-80 animate-fadeIn overflow-hidden p-4 ring-2 ring-glow-500/60 shadow-[0_0_24px_-6px_rgba(110,231,214,0.6)]">
      {/* 顶部高亮条，强化"正在追踪"的视觉反馈 */}
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-glow-500 via-aqua-500 to-glow-500" />
      <div className="flex items-start justify-between gap-2 pt-1">
        <div className="flex items-center gap-2.5">
          <span
            className="h-4 w-4 rounded-full ring-2 ring-paper-200"
            style={{ backgroundColor: sp.color }}
          />
          <div>
            <h3 className="font-display text-[17px] font-600 leading-tight text-pine-950">
              {sp.name}
            </h3>
            {sp.latin && (
              <p className="text-[10.5px] italic text-pine-900/45">{sp.latin}</p>
            )}
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={() => trackCreature(null)} title="退出追踪">
          ✕
        </Button>
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        <Badge color={TROPHIC_COLORS[sp.trophic]}>{TROPHIC_LABELS[sp.trophic]}</Badge>
        {creature.resting ? (
          <Badge color="#1b2a4a">
            <Moon size={9} /> 休眠
          </Badge>
        ) : (
          <Badge color="#2e8b8b">
            <Sun size={9} /> 活跃
          </Badge>
        )}
        {sp.nocturnalGlow && env.isNight && (
          <Badge color="#c9a24b">发光</Badge>
        )}
      </div>

      {/* 能量条 */}
      <div className="mt-3">
        <div className="mb-1 flex items-center justify-between text-[10.5px]">
          <span className="flex items-center gap-1 font-600 text-pine-900/70">
            <Heart size={11} /> 能量
          </span>
          <span className="font-mono text-pine-950">
            {Math.round(creature.energy)} / {sp.maxEnergy}
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-pine-900/10">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${energyPct}%`,
              background:
                energyPct > 40
                  ? 'linear-gradient(90deg, #3fa86a, #6ee7d6)'
                  : energyPct > 15
                    ? 'linear-gradient(90deg, #c9a24b, #e8c069)'
                    : 'linear-gradient(90deg, #cf5a36, #f08a66)',
            }}
          />
        </div>
      </div>

      {/* 数据网格 */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <DataCell icon={<Clock size={12} />} label="年龄" value={`${creature.age.toFixed(1)} 秒`} />
        <DataCell icon={<Activity size={12} />} label="速度" value={`${sp.moveSpeed.toFixed(1)}`} />
        <DataCell
          icon={<Target size={12} />}
          label="当前目标"
          value={targetName ?? '游荡中'}
        />
        <DataCell
          icon={<span className="text-[10px]">⏳</span>}
          label="寿命"
          value={`${sp.lifespan}s`}
        />
      </div>

      <p className="mt-3 border-t border-pine-900/10 pt-2 text-[11px] leading-relaxed text-pine-900/60">
        {sp.description}
      </p>
    </div>
  );
}

function DataCell({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg bg-pine-900/5 px-2 py-1.5">
      <div className="flex items-center gap-1 text-[9.5px] uppercase tracking-wide text-pine-900/50">
        {icon}
        {label}
      </div>
      <div className="mt-0.5 truncate font-mono text-[12px] font-600 text-pine-950">
        {value}
      </div>
    </div>
  );
}
