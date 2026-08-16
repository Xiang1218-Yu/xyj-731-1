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

/** 生态缸中生物总数上限，防止无限繁殖导致性能问题 */
const MAX_ORGANISMS = 120;

/** 繁殖时亲子代的能量分配比例 */
const REPRODUCTION_ENERGY_SPLIT = 0.4;

// ============================================================
// Store 类型定义
// ============================================================

interface EcoStoreState {
  currentScene: PresetScene;
  organisms: Organism[];
  ecoTime: EcoTime;
  isPaused: boolean;
  timeScale: number;
  trackedOrganismId: string | null;
  highlightedSpeciesId: string | null;
  hoveredSpeciesId: string | null;
  snapshots: Snapshot[];
  viewingTimestamp: number | null;
  lastSnapshotTime: number;
  pendingPlacementSpeciesId: string | null;
}

interface EcoStoreActions {
  loadPreset: (sceneId: SceneType) => void;
  tick: (deltaSec: number) => void;
  togglePause: () => void;
  setTimeScale: (scale: number) => void;
  addOrganism: (speciesId: string, position?: [number, number, number]) => void;
  removeOrganism: (id: string) => void;
  setPendingPlacement: (speciesId: string | null) => void;
  setTrackedOrganism: (id: string | null) => void;
  setHighlightedSpecies: (id: string | null) => void;
  setHoveredSpecies: (id: string | null) => void;
  setViewingTimestamp: (ts: number | null) => void;
  getViewingSnapshot: () => Snapshot | null;
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

/** 在父代附近生成子代位置 */
function offspringPosition(
  parentPos: [number, number, number],
  bounds: { x: number; y: number; z: number }
): [number, number, number] {
  const offset = 0.8;
  return [
    Math.max(-bounds.x + 0.3, Math.min(bounds.x - 0.3, parentPos[0] + (Math.random() * 2 - 1) * offset)),
    Math.max(-bounds.y + 0.3, Math.min(bounds.y - 0.3, parentPos[1] + (Math.random() * 2 - 1) * offset)),
    Math.max(-bounds.z + 0.3, Math.min(bounds.z - 0.3, parentPos[2] + (Math.random() * 2 - 1) * offset))
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
    lastFeedTime: 0,
    lastReproduceTime: 0,
    pollutionDamage: 0
  };
}

function computeLightIntensity(hourOfDay: number): number {
  if (hourOfDay >= 6 && hourOfDay <= 18) {
    const t = (hourOfDay - 6) / 12;
    return Math.sin(t * Math.PI) * 0.8 + 0.2;
  }
  return 0.08;
}

function isDaytime(hourOfDay: number): boolean {
  return hourOfDay >= 6 && hourOfDay <= 18;
}

function shouldRest(activityPattern: string, daytime: boolean): boolean {
  switch (activityPattern) {
    case 'diurnal':
      return !daytime;
    case 'nocturnal':
      return daytime;
    case 'crepuscular':
      return false;
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
    const pollutionLevel = state.currentScene.pollutionLevel;

    const newEcoTime: EcoTime = {
      elapsed: newElapsed,
      hourOfDay,
      isDaytime: daytime,
      lightIntensity
    };

    // 统计当前各物种数量（用于繁殖密度控制）
    const speciesPopulation: Record<string, number> = {};
    for (const o of state.organisms) {
      if (o.alive) {
        speciesPopulation[o.speciesId] = (speciesPopulation[o.speciesId] ?? 0) + 1;
      }
    }
    const totalPopulation = state.organisms.filter(o => o.alive).length;

    // 新生生物列表（繁殖产生）
    const newborns: Organism[] = [];

    // 更新每个生物
    const newOrganisms = state.organisms.map(org => {
      if (!org.alive) return org;
      const species = SPECIES[org.speciesId];
      if (!species) return org;

      const resting = shouldRest(species.activityPattern, daytime);

      // ---- 移动逻辑 ----
      let position = org.position;
      let rotation = org.rotation;
      let targetPosition = org.targetPosition;
      const speedFactor = resting ? 0.2 : 1.0;
      const actualSpeed = species.speed * speedFactor;

      if (species.movementType !== 'static' && actualSpeed > 0) {
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

      // ---- 能量变化 ----
      let energy = org.energy;
      if (species.trophicLevel === 'producer') {
        if (daytime) {
          // 生产者光合产能量；高污染抑制敏感植物光合，但藻类等耐污种不受影响甚至受益
          const pollutionPenalty = (1 - species.pollutionTolerance) * pollutionLevel * 0.7;
          const pollutionBonus = species.pollutionTolerance > 0.7 ? pollutionLevel * 3 : 0;
          const gain = (5 + pollutionBonus - pollutionPenalty * 5) * scaledDelta;
          energy = Math.min(species.maxEnergy, energy + Math.max(0, gain));
        }
      } else {
        // 消费者基础能量消耗
        let drain = 1.5 * scaledDelta;
        // 污染增加敏感生物的能量消耗
        if (pollutionLevel > 0) {
          const pollutionStress = (1 - species.pollutionTolerance) * pollutionLevel * 3;
          drain += pollutionStress * scaledDelta;
        }
        // 分解者从污染中获取能量
        if (species.trophicLevel === 'decomposer' && pollutionLevel > 0) {
          drain -= pollutionLevel * 4 * scaledDelta;
        }
        energy = Math.max(0, energy - drain);
      }

      // ---- 污染伤害 ----
      let pollutionDamage = org.pollutionDamage;
      if (pollutionLevel > 0 && species.pollutionTolerance < 1) {
        // 耐受度越低、污染越高，伤害累积越快
        const damageRate = (1 - species.pollutionTolerance) * pollutionLevel * 0.08;
        pollutionDamage = Math.min(1, pollutionDamage + damageRate * scaledDelta);
      } else if (pollutionLevel === 0 && pollutionDamage > 0) {
        // 清洁水中污染伤害缓慢恢复
        pollutionDamage = Math.max(0, pollutionDamage - 0.02 * scaledDelta);
      }

      // 污染伤害过高导致额外能量损耗
      if (pollutionDamage > 0.5) {
        energy = Math.max(0, energy - (pollutionDamage - 0.5) * 4 * scaledDelta);
      }

      // 判断是否因污染死亡
      let alive: boolean = org.alive;
      if (pollutionDamage >= 1) {
        alive = false;
      }

      // 能量耗尽死亡
      if (energy <= 0) {
        alive = false;
      }

      // ---- 繁殖判断 ----
      let lastReproduceTime = org.lastReproduceTime;
      if (
        alive &&
        totalPopulation + newborns.length < MAX_ORGANISMS &&
        org.age >= species.maturityAge &&
        newElapsed - org.lastReproduceTime >= species.reproductionCooldown &&
        energy >= species.maxEnergy * species.reproductionEnergyThreshold
      ) {
        // 密度抑制：同一物种数量越多，繁殖概率越低
        const currentSpeciesCount = (speciesPopulation[org.speciesId] ?? 0) + newborns.filter(n => n.speciesId === org.speciesId).length;
        const densityFactor = Math.max(0.05, 1 - currentSpeciesCount / 30);
        const reproduceChance = 0.15 * densityFactor * scaledDelta;

        if (Math.random() < reproduceChance) {
          // 分裂能量
          const offspringEnergy = energy * REPRODUCTION_ENERGY_SPLIT;
          energy = energy * (1 - REPRODUCTION_ENERGY_SPLIT);
          lastReproduceTime = newElapsed;

          newborns.push({
            id: genOrganismId(),
            speciesId: org.speciesId,
            position: offspringPosition(position, TANK_BOUNDS),
            rotation: Math.random() * Math.PI * 2,
            energy: offspringEnergy,
            alive: true,
            resting: false,
            age: 0,
            targetPosition: null,
            lastFeedTime: newElapsed,
            lastReproduceTime: newElapsed,
            pollutionDamage: 0
          });
        }
      }

      return {
        ...org,
        position,
        rotation,
        targetPosition,
        energy,
        resting,
        alive,
        age: org.age + scaledDelta,
        lastReproduceTime,
        pollutionDamage
      };
    });

    // ---- 捕食检测 ----
    const predationRadius = 0.8;
    const organismsAfterPredation = [...newOrganisms, ...newborns];
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

    const aliveOrganisms = organismsAfterPredation.filter(o => o.alive);

    // ---- 记录历史快照 ----
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

  setViewingTimestamp: (ts) => set({
    viewingTimestamp: ts,
    isPaused: ts !== null ? true : get().isPaused
  }),

  getViewingSnapshot: () => {
    const { viewingTimestamp, snapshots } = get();
    if (viewingTimestamp === null) return null;
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
