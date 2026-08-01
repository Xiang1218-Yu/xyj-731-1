import type {
  DayPhase,
  EcosystemSnapshot,
  Organism,
  ScenePreset,
  Species,
  SpeciesId,
  Vec3,
} from '../domain/types';
import { SPECIES_CATALOG, getSpecies } from '../domain/species';
import {
  DAY_END,
  DAY_LENGTH_SECONDS,
  DAY_START,
  MAX_PER_SPECIES,
  TANK_HALF,
} from '../domain/constants';
import {
  add,
  clamp,
  distance,
  normalize,
  randomVec,
  scale,
  sub,
} from './vector';

/** 生态缸的可变运行状态 */
export interface EcosystemState {
  /** 当前所有生物 */
  organisms: Organism[];
  /** 模拟累计时间（秒） */
  time: number;
  /** 当前场景的污染程度 [0,1] */
  pollution: number;
}

let idCounter = 0;
/** 生成全局唯一个体 ID */
function nextId(): string {
  idCounter += 1;
  return `org-${idCounter}`;
}

/** 生成缸体内的随机位置 */
function randomPosition(): Vec3 {
  return {
    x: (Math.random() * 2 - 1) * TANK_HALF.x * 0.9,
    y: (Math.random() * 2 - 1) * TANK_HALF.y * 0.9,
    z: (Math.random() * 2 - 1) * TANK_HALF.z * 0.9,
  };
}

/**
 * 创建一个生物个体。
 * 生产者（固着型）会被放置在缸体底部附近，速度为零。
 */
export function createOrganism(speciesId: SpeciesId, position?: Vec3): Organism {
  const species = getSpecies(speciesId);
  const isFixedProducer = species.role === 'producer' && species.baseSpeed === 0;
  const pos = position ?? randomPosition();
  if (isFixedProducer) {
    // 固着生产者贴近缸底
    pos.y = -TANK_HALF.y * 0.85 + Math.random() * 1.5;
  }
  return {
    id: nextId(),
    speciesId,
    position: pos,
    velocity: species.baseSpeed > 0 ? randomVec(species.baseSpeed) : { x: 0, y: 0, z: 0 },
    energy: species.initialEnergy,
    alive: true,
    asleep: false,
    age: 0,
    reproduceCooldown: Math.random() * 5,
  };
}

/** 根据场景预设创建初始生态状态 */
export function createStateFromScene(scene: ScenePreset): EcosystemState {
  const organisms: Organism[] = [];
  for (const [speciesId, count] of Object.entries(scene.initialPopulation)) {
    for (let i = 0; i < count; i += 1) {
      organisms.push(createOrganism(speciesId));
    }
  }
  return {
    organisms,
    time: 0,
    pollution: scene.pollution,
  };
}

/** 由累计时间计算归一化时钟 [0,1)，0=午夜，0.5=正午 */
export function computeClock(time: number): number {
  return (time % DAY_LENGTH_SECONDS) / DAY_LENGTH_SECONDS;
}

/** 由时钟判断昼夜阶段 */
export function computePhase(clock: number): DayPhase {
  return clock >= DAY_START && clock < DAY_END ? 'day' : 'night';
}

/**
 * 计算光照强度 [0,1]：正午最强、午夜最弱，用于生产者产能与场景光照。
 * 使用平滑的正弦曲线模拟太阳高度角。
 */
export function computeLight(clock: number): number {
  // 将 clock 映射：0.5（正午）为峰值，0/1（午夜）为谷值
  const s = Math.sin((clock - 0.25) * Math.PI * 2);
  return clamp((s + 1) / 2, 0, 1);
}

/**
 * 判断某物种在给定阶段是否应处于休眠状态。
 * - 昼行性：夜晚休眠
 * - 夜行性：白天休眠
 * - 全天性：不休眠
 */
function shouldSleep(species: Species, phase: DayPhase): boolean {
  if (species.chronotype === 'diurnal') return phase === 'night';
  if (species.chronotype === 'nocturnal') return phase === 'day';
  return false;
}

/** 将位置限制在缸体内，并在触壁时反弹速度 */
function boundPosition(org: Organism): void {
  (['x', 'y', 'z'] as const).forEach((axis) => {
    const half = TANK_HALF[axis];
    if (org.position[axis] > half) {
      org.position[axis] = half;
      org.velocity[axis] *= -1;
    } else if (org.position[axis] < -half) {
      org.position[axis] = -half;
      org.velocity[axis] *= -1;
    }
  });
}

/**
 * 为单个生物寻找最近的猎物个体。
 * 返回猎物索引，找不到返回 -1。
 */
function findNearestPrey(
  hunter: Organism,
  species: Species,
  organisms: Organism[],
): number {
  if (species.preyOf.length === 0) return -1;
  const preySet = new Set(species.preyOf);
  let bestIdx = -1;
  let bestDist = Infinity;
  for (let i = 0; i < organisms.length; i += 1) {
    const other = organisms[i];
    if (!other.alive || other.id === hunter.id) continue;
    if (!preySet.has(other.speciesId)) continue;
    const d = distance(hunter.position, other.position);
    if (d < bestDist) {
      bestDist = d;
      bestIdx = i;
    }
  }
  return bestIdx;
}

/**
 * 推进生态系统一个时间步。
 * 该函数会原地修改并返回新的组织数组，遵循以下顺序：
 * 1. 计算昼夜与光照
 * 2. 逐个更新生物：代谢、休眠、觅食移动、光合作用
 * 3. 处理捕食
 * 4. 处理繁殖与死亡
 */
export function step(state: EcosystemState, dt: number): EcosystemState {
  const time = state.time + dt;
  const clock = computeClock(time);
  const phase = computePhase(clock);
  const light = computeLight(clock);

  const organisms = state.organisms;

  // ---- 阶段一：个体行为更新 ----
  for (const org of organisms) {
    if (!org.alive) continue;
    const species = SPECIES_CATALOG[org.speciesId];
    if (!species) continue;

    org.age += dt;
    if (org.reproduceCooldown > 0) org.reproduceCooldown -= dt;

    // 休眠判定
    org.asleep = shouldSleep(species, phase);

    // 代谢消耗（休眠时代谢减半，体现节能）
    const metabolismRate = org.asleep ? species.metabolism * 0.5 : species.metabolism;
    org.energy -= metabolismRate * dt;

    // 生产者光合作用：仅白天有效，污染越重产能越低
    if (species.photosynthesis > 0) {
      const pollutionFactor =
        species.role === 'decomposer'
          ? 0.6 + state.pollution * 0.8 // 分解者在污染中反而更活跃
          : 1 - state.pollution * 0.6; // 普通生产者受污染抑制
      org.energy += species.photosynthesis * light * pollutionFactor * dt;
    }

    // 运动：休眠时游动减速，否则朝猎物或随机游走
    if (species.baseSpeed > 0) {
      const speedFactor = org.asleep ? 0.2 : 1;
      let desired: Vec3 = org.velocity;
      const preyIdx = findNearestPrey(org, species, organisms);
      if (preyIdx >= 0 && !org.asleep) {
        // 朝猎物方向加速
        const dir = normalize(sub(organisms[preyIdx].position, org.position));
        desired = scale(dir, species.baseSpeed);
      } else {
        // 随机游走：在当前速度上叠加扰动
        desired = add(org.velocity, randomVec(species.baseSpeed * 0.5));
      }
      // 平滑转向
      org.velocity = add(scale(org.velocity, 0.85), scale(desired, 0.15));
      // 限速
      const sp = Math.sqrt(
        org.velocity.x ** 2 + org.velocity.y ** 2 + org.velocity.z ** 2,
      );
      const maxSp = species.baseSpeed * speedFactor;
      if (sp > maxSp && sp > 1e-6) {
        org.velocity = scale(org.velocity, maxSp / sp);
      }
      org.position = add(org.position, scale(org.velocity, dt));
      boundPosition(org);
    }
  }

  // ---- 阶段二：捕食 ----
  for (const hunter of organisms) {
    if (!hunter.alive || hunter.asleep) continue;
    const species = SPECIES_CATALOG[hunter.speciesId];
    if (!species || species.preyOf.length === 0) continue;
    const preySet = new Set(species.preyOf);
    for (const target of organisms) {
      if (!target.alive || target.id === hunter.id) continue;
      if (!preySet.has(target.speciesId)) continue;
      // 进入捕食距离即捕食成功
      if (distance(hunter.position, target.position) < species.size + 0.4) {
        target.alive = false;
        // 能量按被捕食者剩余能量的一部分转移（生态学 ~10% 传递率的放大版）
        hunter.energy += Math.max(target.energy * 0.6, 8);
        break; // 每步每个捕食者只吃一次
      }
    }
  }

  // ---- 阶段三：繁殖与死亡 ----
  const offspring: Organism[] = [];
  const speciesCount = countBySpecies(organisms);
  for (const org of organisms) {
    if (!org.alive) continue;
    const species = SPECIES_CATALOG[org.speciesId];
    if (!species) continue;

    // 能量耗尽或过老死亡
    if (org.energy <= 0) {
      org.alive = false;
      continue;
    }

    // 繁殖：能量超阈值、冷却完毕、未超数量上限
    if (
      org.energy >= species.reproduceThreshold &&
      org.reproduceCooldown <= 0 &&
      (speciesCount[org.speciesId] ?? 0) + offspring.length < MAX_PER_SPECIES
    ) {
      org.energy *= 0.5; // 能量对半分给后代
      org.reproduceCooldown = 6 + Math.random() * 4;
      const childPos = add(org.position, randomVec(0.8));
      const child = createOrganism(org.speciesId, childPos);
      child.energy = org.energy;
      offspring.push(child);
    }
  }

  // 合并后代，移除死亡个体
  const survivors = organisms.filter((o) => o.alive);
  const nextOrganisms = survivors.concat(offspring);

  return {
    organisms: nextOrganisms,
    time,
    pollution: state.pollution,
  };
}

/** 统计各物种存活数量 */
export function countBySpecies(organisms: Organism[]): Record<SpeciesId, number> {
  const result: Record<SpeciesId, number> = {};
  for (const org of organisms) {
    if (!org.alive) continue;
    result[org.speciesId] = (result[org.speciesId] ?? 0) + 1;
  }
  return result;
}

/** 深拷贝生物数组（用于历史快照，避免引用共享） */
export function cloneOrganisms(organisms: Organism[]): Organism[] {
  return organisms.map((o) => ({
    ...o,
    position: { ...o.position },
    velocity: { ...o.velocity },
  }));
}

/** 由当前状态生成不可变快照 */
export function makeSnapshot(state: EcosystemState): EcosystemSnapshot {
  const clock = computeClock(state.time);
  return {
    time: state.time,
    clock,
    phase: computePhase(clock),
    organisms: cloneOrganisms(state.organisms),
    population: countBySpecies(state.organisms),
  };
}
