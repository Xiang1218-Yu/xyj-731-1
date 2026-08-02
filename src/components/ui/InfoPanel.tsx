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
      <div className="panel-card flex w-80 flex-col items-center gap-2 p-5 text-center">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-pine-900/10 text-pine-900/50">
          <Crosshair size={20} />
        </div>
        <h3 className="panel-title">生物追踪</h3>
        <p className="text-[11.5px] leading-relaxed text-pine-900/55">
          点击生态缸中的任意生物，进入追踪模式。相机会自动跟随该生物移动，周围显示光环高亮，这里实时刷新它的能量、年龄与状态。
        </p>
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
    <div className="panel-card w-80 animate-fadeIn p-4">
      <div className="flex items-start justify-between gap-2">
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
