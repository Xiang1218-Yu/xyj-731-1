// 全局生态状态管理（Zustand）。UI 与 3D 渲染层均从此读取状态。
import { create } from 'zustand';
import { SPECIES } from '@/simulation/species';
import { getPreset, DEFAULT_PRESET_ID, PRESETS } from '@/simulation/presets';
import {
  countPopulations,
  createCreature,
  initialEnvironment,
  spawnPopulation,
  tickSimulation,
} from '@/simulation/engine';
import { createRng } from '@/simulation/rng';
import type { Creature, EnvironmentState, Snapshot } from '@/simulation/types';
import { SIM } from '@/simulation/types';

export type Speed = 1 | 2 | 4;

interface EcoState {
  /** 当前物种表（静态，便于 UI 访问） */
  species: typeof SPECIES;

  /** 当前场景 id */
  currentSceneId: string;
  /** 当前生物 */
  creatures: Creature[];
  /** 当前环境 */
  env: EnvironmentState;
  /** 种群数量统计 */
  populations: Record<string, number>;

  /** 时间控制 */
  playing: boolean;
  speed: Speed;
  tick: number;
  simTime: number;

  /** 交互状态 */
  selectedCreatureId: string | null;
  inspectingCreatureId: string | null;
  trackedSpeciesId: string | null;
  hoveredSpeciesId: string | null;

  /** 历史快照 */
  snapshots: Snapshot[];
  /** 正在回看的快照下标；非 null 时渲染该快照而非实时状态 */
  viewingIndex: number | null;

  // —— actions ——
  loadScene: (id: string) => void;
  addSpecies: (speciesId: string, count?: number) => void;
  removeCreature: (id: string) => void;
  selectCreature: (id: string | null) => void;
  trackCreature: (id: string | null) => void;
  setHoveredSpecies: (id: string | null) => void;
  setTrackedSpecies: (id: string | null) => void;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  setSpeed: (s: Speed) => void;
  seekSnapshot: (index: number | null) => void;
  reset: () => void;
  /** 由渲染循环调用，推进模拟 dt 秒（已乘 speed） */
  advance: (realDt: number) => void;
}

let simRng = createRng(Date.now() >>> 0);
let snapshotAccumulator = 0;

/** 初始时刻对应清晨 06:00（timeOfDay = 0.26），使 simTime 与 env 一致 */
const INITIAL_SIM_TIME = 0.26 * SIM.DAY_LENGTH;

function buildSceneState(sceneId: string): {
  creatures: Creature[];
  env: EnvironmentState;
  populations: Record<string, number>;
  simTime: number;
} {
  const preset = getPreset(sceneId);
  const creatures = spawnPopulation(preset.populations, (Date.now() >>> 0) % 100000);
  const env = initialEnvironment(preset.pollution);
  env.waterTint = preset.waterTint;
  env.fogTint = preset.fogTint;
  return {
    creatures,
    env,
    populations: countPopulations(creatures),
    simTime: INITIAL_SIM_TIME,
  };
}

/** 完整深拷贝单个生物，确保快照与实时状态完全独立 */
export function cloneCreature(c: Creature): Creature {
  return {
    id: c.id,
    speciesId: c.speciesId,
    position: [c.position[0], c.position[1], c.position[2]],
    velocity: [c.velocity[0], c.velocity[1], c.velocity[2]],
    energy: c.energy,
    age: c.age,
    alive: c.alive,
    targetId: c.targetId,
    seed: c.seed,
    scale: c.scale,
    heading: c.heading,
    phase: c.phase,
    resting: c.resting,
  };
}

/** 完整深拷贝环境，逐字段复制保证独立 */
function cloneEnvironment(env: EnvironmentState): EnvironmentState {
  return {
    timeOfDay: env.timeOfDay,
    dayCount: env.dayCount,
    phase: env.phase,
    sunIntensity: env.sunIntensity,
    ambientIntensity: env.ambientIntensity,
    waterTint: env.waterTint,
    fogTint: env.fogTint,
    isNight: env.isNight,
    pollution: env.pollution,
  };
}

/** 从快照恢复一份完全独立的实时状态 */
function restoreFromSnapshot(snap: Snapshot): {
  creatures: Creature[];
  env: EnvironmentState;
  populations: Record<string, number>;
  tick: number;
  simTime: number;
} {
  return {
    creatures: snap.creatures.map(cloneCreature),
    env: cloneEnvironment(snap.env),
    populations: { ...snap.populations },
    tick: snap.tick,
    simTime: snap.simTime,
  };
}

/** 深拷贝一份当前状态用于快照，逐字段复制保证历史状态完全独立 */
function takeSnapshot(
  creatures: Creature[],
  env: EnvironmentState,
  tick: number,
  simTime: number,
): Snapshot {
  return {
    tick,
    simTime,
    creatures: creatures.map(cloneCreature),
    env: cloneEnvironment(env),
    populations: countPopulations(creatures),
  };
}

export const useEcoStore = create<EcoState>((set, get) => ({
  species: SPECIES,
  currentSceneId: DEFAULT_PRESET_ID,
  ...buildSceneState(DEFAULT_PRESET_ID),

  playing: true,
  speed: 1,
  tick: 0,

  selectedCreatureId: null,
  inspectingCreatureId: null,
  trackedSpeciesId: null,
  hoveredSpeciesId: null,

  snapshots: [],
  viewingIndex: null,

  loadScene: (id) => {
    simRng = createRng((Date.now() >>> 0) + PRESETS.findIndex((p) => p.id === id));
    snapshotAccumulator = 0;
    const state = buildSceneState(id);
    set({
      currentSceneId: id,
      ...state,
      playing: true,
      tick: 0,
      selectedCreatureId: null,
      inspectingCreatureId: null,
      trackedSpeciesId: null,
      viewingIndex: null,
      snapshots: [takeSnapshot(state.creatures, state.env, 0, state.simTime)],
    });
  },

  addSpecies: (speciesId, count = 1) => {
    if (!SPECIES[speciesId]) return;
    const current = get().creatures;
    if (current.length >= SIM.MAX_CREATURES) return;
    const additions: Creature[] = [];
    const n = Math.min(count, SIM.MAX_CREATURES - current.length);
    for (let i = 0; i < n; i += 1) {
      additions.push(createCreature(speciesId, simRng));
    }
    set({ creatures: [...current, ...additions] });
  },

  removeCreature: (id) => {
    set({ creatures: get().creatures.filter((c) => c.id !== id) });
  },

  selectCreature: (id) => set({ selectedCreatureId: id }),

  // 点击生物进入追踪时，同步设置食物网高亮物种
  trackCreature: (id) => {
    if (!id) {
      set({ inspectingCreatureId: null, selectedCreatureId: null, trackedSpeciesId: null });
      return;
    }
    // 回看模式下从快照中查找，实时模式下从当前生物列表查找
    const state = get();
    const list =
      state.viewingIndex !== null
        ? state.snapshots[state.viewingIndex]?.creatures ?? state.creatures
        : state.creatures;
    const creature = list.find((c) => c.id === id);
    set({
      inspectingCreatureId: id,
      selectedCreatureId: id,
      trackedSpeciesId: creature ? creature.speciesId : null,
    });
  },

  setHoveredSpecies: (id) => set({ hoveredSpeciesId: id }),
  setTrackedSpecies: (id) => set({ trackedSpeciesId: id }),

  play: () => {
    const { viewingIndex, snapshots } = get();
    // 若处于回看状态，先回到实时（从最后一张快照继续）
    if (viewingIndex !== null) {
      const last = snapshots[snapshots.length - 1];
      if (last) {
        set({
          viewingIndex: null,
          ...restoreFromSnapshot(last),
          playing: true,
        });
        return;
      }
    }
    set({ playing: true });
  },
  pause: () => set({ playing: false }),
  togglePlay: () => {
    const { playing } = get();
    if (playing) get().pause();
    else get().play();
  },

  setSpeed: (s) => set({ speed: s }),

  seekSnapshot: (index) => {
    if (index === null) {
      // 回到实时
      const { snapshots } = get();
      const last = snapshots[snapshots.length - 1];
      if (last) {
        set({
          viewingIndex: null,
          ...restoreFromSnapshot(last),
        });
      } else {
        set({ viewingIndex: null });
      }
      return;
    }
    const snap = get().snapshots[index];
    if (!snap) return;
    // 使用 cloneCreature 逐字段深拷贝，保证回看状态与快照完全独立
    set({
      viewingIndex: index,
      playing: false,
      ...restoreFromSnapshot(snap),
    });
  },

  reset: () => {
    get().loadScene(get().currentSceneId);
  },

  advance: (realDt) => {
    const state = get();
    if (!state.playing || state.viewingIndex !== null) return;

    // 以固定逻辑步长推进，保证模拟稳定
    let remaining = realDt * state.speed;
    let creatures = state.creatures;
    let env = state.env;
    let tick = state.tick;
    let simTime = state.simTime;
    const maxSteps = 6;
    let steps = 0;

    while (remaining >= SIM.FIXED_DT && steps < maxSteps) {
      const result = tickSimulation({
        creatures,
        env,
        dt: SIM.FIXED_DT,
        rng: simRng,
      });
      creatures = result.creatures;
      env = result.env;
      tick += 1;
      simTime += SIM.FIXED_DT;
      remaining -= SIM.FIXED_DT;
      steps += 1;
    }

    // 若步数被截断（后台切回等），仍把剩余时间折算为 env 推进，避免时间轴错乱
    if (remaining > 0 && steps === maxSteps) {
      simTime += remaining;
    }

    snapshotAccumulator += realDt * state.speed;
    let snapshots = state.snapshots;
    if (snapshotAccumulator >= SIM.SNAPSHOT_INTERVAL) {
      snapshotAccumulator = 0;
      const newSnap = takeSnapshot(creatures, env, tick, simTime);
      snapshots = [...snapshots, newSnap];
      if (snapshots.length > SIM.MAX_SNAPSHOTS) {
        snapshots = snapshots.slice(snapshots.length - SIM.MAX_SNAPSHOTS);
      }
    }

    set({
      creatures,
      env,
      tick,
      simTime,
      populations: countPopulations(creatures),
      snapshots,
    });
  },
}));

/** 选择器：当前应渲染的快照（回看时用快照，否则 null） */
export function selectActiveSnapshot(state: EcoState): Snapshot | null {
  if (state.viewingIndex !== null) {
    return state.snapshots[state.viewingIndex] ?? null;
  }
  return null;
}
