import { create } from 'zustand';
import type {
  Organism,
  EcoTime,
  Snapshot,
  PresetScene
} from '../types';
import { SceneType } from '../types';
import { SPECIES } from '../data/species';
import { getPresetById } from '../data/presets';

// ============================================================
// 生态仿真常量
// ============================================================

/** 生态缸边界（半尺寸），生物在此范围内活动 */
export const TANK_BOUNDS = { x: 6, y: 4, z: 6 };

/** 仿真一天对应现实秒数 */
const DAY_DURATION_SEC = 60;

/** 历史快照最大数量（避免内存溢出） */
const MAX_SNAPSHOTS = 200;

/** 每隔多少仿真秒记录一次快照 */
const SNAPSHOT_INTERVAL = 2;

// ============================================================
// Store 类型定义
// ============================================================

interface EcoStoreState {
  // ---- 场景 ----
  currentScene: PresetScene;

  // ---- 生物集合 ----
  organisms: Organism[];

  // ---- 时间 ----
  ecoTime: EcoTime;
  isPaused: boolean;
  /** 仿真速度倍率 */
  timeScale: number;

  // ---- 追踪模式 ----
  trackedOrganismId: string | null;

  // ---- 食物链面板交互 ----
  highlightedSpeciesId: string | null;
  hoveredSpeciesId: string | null;

  // ---- 历史时间轴 ----
  snapshots: Snapshot[];
  /** 正在回看的快照时间戳；null 表示实时模式 */
  viewingTimestamp: number | null;
  /** 上次记录快照的仿真时间 */
  lastSnapshotTime: number;

  // ---- 待放置的物种（用户从面板点击后等待在3D中放置） ----
  pendingPlacementSpeciesId: string | null;
}

interface EcoStoreActions {
  /** 加载预设场景 */
  loadPreset: (sceneId: SceneType) => void;

  /** 每帧推进仿真 */
  tick: (deltaSec: number) => void;

  /** 暂停/继续 */
  togglePause: () => void;
  setTimeScale: (scale: number) => void;

  /** 添加一个生物（随机位置或指定位置） */
  addOrganism: (speciesId: string, position?: [number, number, number]) => void;

  /** 移除一个生物 */
  removeOrganism: (id: string) => void;

  /** 设置待放置物种 */
  setPendingPlacement: (speciesId: string | null) => void;

  /** 设置追踪的生物 */
  setTrackedOrganism: (id: string | null) => void;

  /** 设置食物链高亮物种 */
  setHighlightedSpecies: (id: string | null) => void;
  setHoveredSpecies: (id: string | null) => void;

  /** 时间轴回看 */
  setViewingTimestamp: (ts: number | null) => void;
  /** 根据回看时间戳获取对应的快照状态 */
  getViewingSnapshot: () => Snapshot | null;

  /** 清空生态缸 */
  clearTank: () => void;
}

export type EcoStore = EcoStoreState & EcoStoreActions;

// ============================================================
// 辅助函数
// ============================================================

let organismIdCounter = 0;
function genOrganismId(): string {
  organismIdCounter += 1;
  return `org_${Date.now()}_${organismIdCounter}`;
}

function randomPosition(bounds: { x: number; y: number; z: number }): [number, number, number] {
  return [
    (Math.random() * 2 - 1) * bounds.x * 0.85,
    (Math.random() * 2 - 1) * bounds.y * 0.7,
    (Math.random() * 2 - 1) * bounds.z * 0.85
  ];
}

function createOrganism(speciesId: string, position?: [number, number, number]): Organism {
  const species = SPECIES[speciesId];
  const pos = position ?? randomPosition(TANK_BOUNDS);
  return {
    id: genOrganismId(),
    speciesId,
    position: pos,
    rotation: Math.random() * Math.PI * 2,
    energy: species.maxEnergy * 0.7,
    alive: true,
    resting: false,
    age: 0,
    targetPosition: null,
    lastFeedTime: 0
  };
}

function computeLightIntensity(hourOfDay: number): number {
  // 6点日出，18点日落；使用平滑余弦曲线
  if (hourOfDay >= 6 && hourOfDay <= 18) {
    const t = (hourOfDay - 6) / 12;
    return Math.sin(t * Math.PI) * 0.8 + 0.2;
  }
  return 0.08; // 夜晚微弱月光
}

function isDaytime(hourOfDay: number): boolean {
  return hourOfDay >= 6 && hourOfDay <= 18;
}

function shouldRest(
  activityPattern: Organism['resting'] extends never ? never : string,
  daytime: boolean
): boolean {
  switch (activityPattern) {
    case 'diurnal':
      return !daytime; // 昼行性夜晚休息
    case 'nocturnal':
      return daytime; // 夜行性白天休息
    case 'crepuscular':
      return false;   // 晨昏型全天可活动（简化）
    case 'always':
    default:
      return false;
  }
}

function makeSnapshot(
  timestamp: number,
  ecoTime: EcoTime,
  organisms: Organism[]
): Snapshot {
  const speciesCount: Record<string, number> = {};
  let totalEnergy = 0;
  for (const o of organisms) {
    if (!o.alive) continue;
    speciesCount[o.speciesId] = (speciesCount[o.speciesId] ?? 0) + 1;
    totalEnergy += o.energy;
  }
  return {
    timestamp,
    ecoTime: { ...ecoTime },
    organisms: organisms.map(o => ({
      ...o,
      position: [...o.position] as [number, number, number],
      targetPosition: o.targetPosition
        ? [...o.targetPosition] as [number, number, number]
        : null
    })),
    totalEnergy,
    speciesCount
  };
}

function createInitialEcoTime(): EcoTime {
  return {
    elapsed: 0,
    hourOfDay: 8,
    isDaytime: true,
    lightIntensity: computeLightIntensity(8)
  };
}

// ============================================================
// Store 实现
// ============================================================

const defaultScene = getPresetById(SceneType.FreshwaterLake)!;

function createInitialOrganisms(scene: PresetScene): Organism[] {
  const result: Organism[] = [];
  for (const [speciesId, count] of Object.entries(scene.initialPopulations)) {
    for (let i = 0; i < count; i++) {
      result.push(createOrganism(speciesId));
    }
  }
  return result;
}

export const useEcoStore = create<EcoStore>((set, get) => ({
  currentScene: defaultScene,
  organisms: createInitialOrganisms(defaultScene),
  ecoTime: createInitialEcoTime(),
  isPaused: false,
  timeScale: 1,
  trackedOrganismId: null,
  highlightedSpeciesId: null,
  hoveredSpeciesId: null,
  snapshots: [],
  viewingTimestamp: null,
  lastSnapshotTime: 0,
  pendingPlacementSpeciesId: null,

  loadPreset: (sceneId) => {
    const scene = getPresetById(sceneId);
    if (!scene) return;
    set({
      currentScene: scene,
      organisms: createInitialOrganisms(scene),
      ecoTime: createInitialEcoTime(),
      snapshots: [],
      viewingTimestamp: null,
      lastSnapshotTime: 0,
      trackedOrganismId: null,
      highlightedSpeciesId: null,
      pendingPlacementSpeciesId: null
    });
  },

  tick: (deltaSec) => {
    const state = get();
    if (state.isPaused || state.viewingTimestamp !== null) return;

    const scaledDelta = deltaSec * state.timeScale;
    const newElapsed = state.ecoTime.elapsed + scaledDelta;
    const newHour = (newElapsed / DAY_DURATION_SEC) * 24;
    const hourOfDay = newHour % 24;
    const daytime = isDaytime(hourOfDay);
    const lightIntensity = computeLightIntensity(hourOfDay);

    const newEcoTime: EcoTime = {
      elapsed: newElapsed,
      hourOfDay,
      isDaytime: daytime,
      lightIntensity
    };

    // 更新每个生物
    const newOrganisms = state.organisms.map(org => {
      if (!org.alive) return org;
      const species = SPECIES[org.speciesId];
      if (!species) return org;

      // 判断是否休眠
      const resting = shouldRest(species.activityPattern, daytime);

      // 移动逻辑
      let position = org.position;
      let rotation = org.rotation;
      let targetPosition = org.targetPosition;
      const speedFactor = resting ? 0.2 : 1.0; // 休眠时减速
      const actualSpeed = species.speed * speedFactor;

      if (species.movementType !== 'static' && actualSpeed > 0) {
        // 如果没有目标，或已到达目标，选一个新目标
        const needsNewTarget =
          !targetPosition ||
          Math.hypot(
            targetPosition[0] - position[0],
            targetPosition[1] - position[1],
            targetPosition[2] - position[2]
          ) < 0.3;

        if (needsNewTarget) {
          targetPosition = randomPosition(TANK_BOUNDS);
        }

        // 向目标移动（targetPosition 此时一定非空）
        const target = targetPosition!;
        const dx = target[0] - position[0];
        const dy = target[1] - position[1];
        const dz = target[2] - position[2];
        const dist = Math.hypot(dx, dy, dz);
        if (dist > 0.01) {
          const move = Math.min(actualSpeed * scaledDelta, dist);
          position = [
            position[0] + (dx / dist) * move,
            position[1] + (dy / dist) * move,
            position[2] + (dz / dist) * move
          ];
          rotation = Math.atan2(dx, dz);
        }
      }

      // 能量变化：生产者白天光合，消费者缓慢消耗
      let energy = org.energy;
      if (species.trophicLevel === 'producer') {
        if (daytime) {
          energy = Math.min(species.maxEnergy, energy + 5 * scaledDelta);
        }
      } else {
        energy = Math.max(0, energy - 1.5 * scaledDelta);
      }

      return {
        ...org,
        position,
        rotation,
        targetPosition,
        energy,
        resting,
        age: org.age + scaledDelta
      };
    });

    // 简单捕食检测：消费者靠近猎物时获取能量
    const predationRadius = 0.8;
    const organismsAfterPredation = [...newOrganisms];
    for (let i = 0; i < organismsAfterPredation.length; i++) {
      const predator = organismsAfterPredation[i];
      if (!predator.alive || predator.resting) continue;
      const predSpecies = SPECIES[predator.speciesId];
      if (!predSpecies || predSpecies.preyIds.length === 0) continue;

      for (let j = 0; j < organismsAfterPredation.length; j++) {
        if (i === j) continue;
        const prey = organismsAfterPredation[j];
        if (!prey.alive) continue;
        if (!predSpecies.preyIds.includes(prey.speciesId)) continue;

        const dist = Math.hypot(
          predator.position[0] - prey.position[0],
          predator.position[1] - prey.position[1],
          predator.position[2] - prey.position[2]
        );
        if (dist < predationRadius) {
          const preySpecies = SPECIES[prey.speciesId];
          organismsAfterPredation[j] = { ...prey, alive: false };
          organismsAfterPredation[i] = {
            ...predator,
            energy: Math.min(predSpecies.maxEnergy, predator.energy + preySpecies.maxEnergy * 0.5),
            lastFeedTime: newElapsed
          };
          break;
        }
      }
    }

    // 移除死亡生物（保留短暂，但这里直接清理）
    const aliveOrganisms = organismsAfterPredation.filter(o => o.alive);

    // 记录历史快照
    let snapshots = state.snapshots;
    let lastSnapshotTime = state.lastSnapshotTime;
    if (newElapsed - lastSnapshotTime >= SNAPSHOT_INTERVAL) {
      const snap = makeSnapshot(newElapsed, newEcoTime, aliveOrganisms);
      snapshots = [...snapshots, snap];
      if (snapshots.length > MAX_SNAPSHOTS) {
        snapshots = snapshots.slice(snapshots.length - MAX_SNAPSHOTS);
      }
      lastSnapshotTime = newElapsed;
    }

    set({
      organisms: aliveOrganisms,
      ecoTime: newEcoTime,
      snapshots,
      lastSnapshotTime
    });
  },

  togglePause: () => set(s => ({ isPaused: !s.isPaused })),
  setTimeScale: (scale) => set({ timeScale: scale }),

  addOrganism: (speciesId, position) => {
    const org = createOrganism(speciesId, position);
    set(s => ({ organisms: [...s.organisms, org] }));
  },

  removeOrganism: (id) => {
    set(s => ({
      organisms: s.organisms.filter(o => o.id !== id),
      trackedOrganismId: s.trackedOrganismId === id ? null : s.trackedOrganismId
    }));
  },

  setPendingPlacement: (speciesId) => set({ pendingPlacementSpeciesId: speciesId }),

  setTrackedOrganism: (id) => set({ trackedOrganismId: id }),

  setHighlightedSpecies: (id) => set({ highlightedSpeciesId: id }),
  setHoveredSpecies: (id) => set({ hoveredSpeciesId: id }),

  setViewingTimestamp: (ts) => set({ viewingTimestamp: ts, isPaused: ts !== null ? true : get().isPaused }),

  getViewingSnapshot: () => {
    const { viewingTimestamp, snapshots } = get();
    if (viewingTimestamp === null) return null;
    // 找最接近的快照
    let closest: Snapshot | null = null;
    let minDiff = Infinity;
    for (const snap of snapshots) {
      const diff = Math.abs(snap.timestamp - viewingTimestamp);
      if (diff < minDiff) {
        minDiff = diff;
        closest = snap;
      }
    }
    return closest;
  },

  clearTank: () => {
    set({
      organisms: [],
      ecoTime: createInitialEcoTime(),
      snapshots: [],
      viewingTimestamp: null,
      lastSnapshotTime: 0,
      trackedOrganismId: null,
      highlightedSpeciesId: null
    });
  }
}));
