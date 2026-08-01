/**
 * 顶部工具栏：场景预设、播放控制、速度档位、昼夜指示器、面板开关
 */
import {
  Play,
  Pause,
  Sun,
  Moon,
  Sunrise,
  Sunset,
  Fish,
  Network,
  History,
  Eraser,
  ChevronDown,
} from 'lucide-react';
import { useState } from 'react';
import { PRESETS } from '@/data/presets';
import { DAY_CYCLE_SECONDS } from '@/engine/simulation';
import { useEcosystemStore } from '@/store/ecosystemStore';
import type { DayPhase, PlaySpeed } from '@/types/ecosystem';

/** 相位对应的中文名与图标 */
const PHASE_META: Record<DayPhase, { label: string; icon: typeof Sun }> = {
  dawn: { label: '黎明', icon: Sunrise },
  day: { label: '白天', icon: Sun },
  dusk: { label: '黄昏', icon: Sunset },
  night: { label: '夜晚', icon: Moon },
};

/** 格式化模拟时间为 mm:ss */
function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function Toolbar() {
  // version 驱动每帧刷新昼夜读数
  useEcosystemStore((s) => s.version);
  const engine = useEcosystemStore((s) => s.engine);
  const playing = useEcosystemStore((s) => s.playing);
  const speed = useEcosystemStore((s) => s.speed);
  const sceneName = useEcosystemStore((s) => s.sceneName);
  const panels = useEcosystemStore((s) => s.panels);
  const { setPlaying, setSpeed, loadPreset, resetTank, togglePanel } =
    useEcosystemStore.getState();
  const [presetOpen, setPresetOpen] = useState(false);

  const phase = engine.phase;
  const PhaseIcon = PHASE_META[phase].icon;

  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center gap-3 px-4 py-3">
      {/* 标题 */}
      <div className="glass-panel pointer-events-auto flex items-center gap-2 px-4 py-2">
        <span className="text-lg">🔬</span>
        <h1 className="font-display text-base font-bold tracking-wide text-teal-100">
          虚拟生态缸
        </h1>
      </div>

      {/* 场景预设下拉 */}
      <div className="glass-panel pointer-events-auto relative">
        <button
          className="flex items-center gap-2 px-4 py-2 text-sm text-teal-50 transition hover:text-teal-200"
          onClick={() => setPresetOpen((v) => !v)}
        >
          <span className="text-teal-300">{sceneName}</span>
          <ChevronDown size={14} className={presetOpen ? 'rotate-180 transition' : 'transition'} />
        </button>
        {presetOpen && (
          <div className="glass-panel absolute left-0 top-full mt-2 w-72 overflow-hidden">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                className="block w-full px-4 py-3 text-left transition hover:bg-teal-400/10"
                onClick={() => {
                  loadPreset(p);
                  setPresetOpen(false);
                }}
              >
                <div className="text-sm font-semibold text-teal-100">{p.name}</div>
                <div className="mt-0.5 text-xs leading-relaxed text-teal-100/50">
                  {p.description}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 播放控制 */}
      <div className="glass-panel pointer-events-auto flex items-center gap-1 px-2 py-1.5">
        <button
          aria-label={playing ? '暂停' : '播放'}
          className="rounded-lg p-1.5 text-teal-100 transition hover:bg-teal-400/15"
          onClick={() => setPlaying(!playing)}
        >
          {playing ? <Pause size={17} /> : <Play size={17} />}
        </button>
        {([1, 2, 4] as PlaySpeed[]).map((sp) => (
          <button
            key={sp}
            className={`rounded-lg px-2 py-1 text-xs font-semibold transition ${
              speed === sp
                ? 'bg-teal-400/25 text-teal-100'
                : 'text-teal-100/50 hover:text-teal-100'
            }`}
            onClick={() => setSpeed(sp)}
          >
            {sp}x
          </button>
        ))}
        <button
          aria-label="清空生态缸"
          title="清空生态缸"
          className="rounded-lg p-1.5 text-teal-100/60 transition hover:bg-red-400/15 hover:text-red-300"
          onClick={resetTank}
        >
          <Eraser size={15} />
        </button>
      </div>

      {/* 昼夜指示器 */}
      <div className="glass-panel pointer-events-auto ml-auto flex items-center gap-3 px-4 py-2">
        <PhaseIcon
          size={16}
          className={phase === 'day' ? 'text-amber-300' : phase === 'night' ? 'text-indigo-300' : 'text-orange-300'}
        />
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="text-teal-100/80">{PHASE_META[phase].label}</span>
            <span className="font-mono text-teal-100/50">{formatTime(engine.simTime)}</span>
          </div>
          {/* 昼夜周期进度条 */}
          <div className="h-1 w-28 overflow-hidden rounded-full bg-white/10">
            <div
              className={`h-full rounded-full transition-none ${
                phase === 'night' ? 'bg-indigo-400' : 'bg-amber-300'
              }`}
              style={{ width: `${(engine.dayProgress * 100).toFixed(1)}%` }}
            />
          </div>
        </div>
        <span className="text-[10px] text-teal-100/35">周期{DAY_CYCLE_SECONDS}s</span>
      </div>

      {/* 面板开关 */}
      <div className="glass-panel pointer-events-auto flex items-center gap-1 px-2 py-1.5">
        <button
          title="物种面板"
          className={`rounded-lg p-1.5 transition ${panels.species ? 'bg-teal-400/20 text-teal-100' : 'text-teal-100/40 hover:text-teal-100'}`}
          onClick={() => togglePanel('species')}
        >
          <Fish size={16} />
        </button>
        <button
          title="食物链面板"
          className={`rounded-lg p-1.5 transition ${panels.foodWeb ? 'bg-teal-400/20 text-teal-100' : 'text-teal-100/40 hover:text-teal-100'}`}
          onClick={() => togglePanel('foodWeb')}
        >
          <Network size={16} />
        </button>
        <button
          title="时间轴"
          className={`rounded-lg p-1.5 transition ${panels.timeline ? 'bg-teal-400/20 text-teal-100' : 'text-teal-100/40 hover:text-teal-100'}`}
          onClick={() => togglePanel('timeline')}
        >
          <History size={16} />
        </button>
      </div>
    </header>
  );
}
