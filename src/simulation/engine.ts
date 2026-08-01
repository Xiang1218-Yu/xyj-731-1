// 生态模拟引擎：纯函数式的逻辑步进，便于快照与回放
import { SPECIES } from './species';
import type {
  Creature,
  EnvironmentState,
  Habitat,
  PhaseName,
  Vec3,
} from './types';
import { SIM } from './types';
import { createRng, randRange, pick } from './rng';
import type { RNG } from './rng';

/** 缸体可活动范围 */
const BOUNDS = {
  minX: -SIM.TANK.width / 2 + 0.4,
  maxX: SIM.TANK.width / 2 - 0.4,
  minZ: -SIM.TANK.depth / 2 + 0.4,
  maxZ: SIM.TANK.depth / 2 - 0.4,
  minY: 0.4,
  maxY: SIM.WATER_LEVEL - 0.3,
  surfaceY: SIM.WATER_LEVEL + 0.2,
  airMaxY: SIM.TANK.height - 0.6,
};

let creatureSeq = 0;
/** 生成全局唯一生物 id */
function nextCreatureId(): string {
  creatureSeq += 1;
  return `c-${creatureSeq}-${Math.floor(Math.random() * 1e6)}`;
}

/** 根据栖息水层返回随机生成位置与活动 y 范围 */
function habitatRange(habitat: Habitat, rng: RNG): { pos: Vec3; y: number } {
  const x = randRange(rng, BOUNDS.minX, BOUNDS.maxX);
  const z = randRange(rng, BOUNDS.minZ, BOUNDS.maxZ);
  switch (habitat) {
    case 'bottom':
      return { pos: [x, 0.35, z], y: 0.35 };
    case 'water':
      return { pos: [x, randRange(rng, 1.2, BOUNDS.maxY), z], y: BOUNDS.maxY };
    case 'surface':
      return { pos: [x, BOUNDS.surfaceY, z], y: BOUNDS.surfaceY };
    case 'air':
      return {
        pos: [x, randRange(rng, 7.2, BOUNDS.airMaxY), z],
        y: BOUNDS.airMaxY,
      };
  }
}

/** 创建单个生物实例 */
export function createCreature(speciesId: string, rng: RNG): Creature {
  const def = SPECIES[speciesId];
  if (!def) throw new Error(`未知物种: ${speciesId}`);
  const { pos } = habitatRange(def.habitat, rng);
  const scale = randRange(rng, def.sizeRange[0], def.sizeRange[1]);
  return {
    id: nextCreatureId(),
    speciesId: def.id,
    position: pos,
    velocity: [randRange(rng, -0.5, 0.5), 0, randRange(rng, -0.5, 0.5)],
    energy: def.maxEnergy * randRange(rng, 0.55, 0.9),
    age: 0,
    alive: true,
    seed: Math.floor(rng() * 1e9),
    scale,
    heading: rng() * Math.PI * 2,
    phase: rng() * Math.PI * 2,
    resting: false,
  };
}

/** 初始环境（从清晨 06:00 开始，便于观察） */
export function initialEnvironment(pollution = 0): EnvironmentState {
  return computeEnvironment(0.26, 1, pollution);
}

/** 根据 timeOfDay 计算光照、时段、水色 */
export function computeEnvironment(
  timeOfDay: number,
  dayCount: number,
  pollution: number,
): EnvironmentState {
  const t = ((timeOfDay % 1) + 1) % 1;
  // 太阳高度角：0=午夜，0.25=日出，0.5=正午，0.75=日落
  const sunAngle = t * Math.PI * 2 - Math.PI / 2;
  const sunHeight = Math.sin(sunAngle);
  // 光强：白天高、夜间低，用光滑的正弦曲线
  const sunIntensity = Math.max(0, sunHeight) * (1 - pollution * 0.35);
  const ambient = 0.22 + Math.max(0, sunHeight) * 0.55 - pollution * 0.08;

  let phase: PhaseName;
  if (t >= 0.2 && t < 0.32) phase = 'dawn';
  else if (t >= 0.32 && t < 0.7) phase = 'day';
  else if (t >= 0.7 && t < 0.82) phase = 'dusk';
  else phase = 'night';

  const isNight = phase === 'night' || phase === 'dusk' || sunHeight < -0.1;

  // 水色随昼夜与污染混合
  const dayWater = pollution > 0.4 ? '#5a4a2a' : '#3a8f95';
  const nightWater = pollution > 0.4 ? '#1e1a10' : '#123a4a';
  const dayFog = pollution > 0.4 ? '#2e2a1c' : '#2a6f76';
  const nightFog = pollution > 0.4 ? '#0e0c08' : '#0c2230';
  const nightFactor = Math.max(0, -sunHeight);
  const waterTint = lerpColor(dayWater, nightWater, Math.min(1, nightFactor * 1.4));
  const fogTint = lerpColor(dayFog, nightFog, Math.min(1, nightFactor * 1.4));

  return {
    timeOfDay: t,
    dayCount,
    phase,
    sunIntensity,
    ambientIntensity: ambient,
    waterTint,
    fogTint,
    isNight,
    pollution,
  };
}

/** 线性插值两个十六进制颜色 */
function lerpColor(a: string, b: string, t: number): string {
  const pa = hexToRgb(a);
  const pb = hexToRgb(b);
  const r = Math.round(pa[0] + (pb[0] - pa[0]) * t);
  const g = Math.round(pa[1] + (pb[1] - pa[1]) * t);
  const bl = Math.round(pa[2] + (pb[2] - pa[2]) * t);
  return `rgb(${r}, ${g}, ${bl})`;
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** 向量运算辅助 */
function sub(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}
function len(v: Vec3): number {
  return Math.hypot(v[0], v[1], v[2]);
}
function norm(v: Vec3): Vec3 {
  const l = len(v);
  if (l < 1e-6) return [0, 0, 0];
  return [v[0] / l, v[1] / l, v[2] / l];
}

/** 生物在某环境下是否处于休眠/减速状态 */
function isResting(speciesId: string, env: EnvironmentState): boolean {
  const def = SPECIES[speciesId];
  if (!def) return false;
  if (def.circadian === 'diurnal' && env.isNight) return true;
  if (def.circadian === 'nocturnal' && !env.isNight) return true;
  return false;
}

/** 模拟步进的输入：当前所有生物、环境、增量时间、随机源 */
export interface TickInput {
  creatures: Creature[];
  env: EnvironmentState;
  dt: number;
  rng: RNG;
}

/** 模拟步进输出 */
export interface TickResult {
  creatures: Creature[];
  env: EnvironmentState;
  events: SimEvent[];
}

export interface SimEvent {
  type: 'predation' | 'birth' | 'death';
  creatureId?: string;
  speciesId?: string;
}

/**
 * 推进一个逻辑帧。纯函数（除注入的 rng），返回全新数组。
 */
export function tickSimulation(input: TickInput): TickResult {
  const { dt } = input;
  const events: SimEvent[] = [];

  // 1. 推进昼夜
  let timeOfDay = input.env.timeOfDay + dt / SIM.DAY_LENGTH;
  let dayCount = input.env.dayCount;
  if (timeOfDay >= 1) {
    timeOfDay -= 1;
    dayCount += 1;
  }
  const env = computeEnvironment(timeOfDay, dayCount, input.env.pollution);

  // 用 Map 便于查找
  const alive = input.creatures.filter((c) => c.alive);
  const byId = new Map<string, Creature>();
  const newborns: Creature[] = [];

  for (const c of alive) byId.set(c.id, c);

  for (const c of alive) {
    const def = SPECIES[c.speciesId];
    if (!def) continue;
    const resting = isResting(c.speciesId, env);
    c.resting = resting;
    const speedFactor = resting ? 0.18 : 1;

    c.age += dt;
    c.phase += dt * (resting ? 1.5 : 4);

    // 2. 能量：生产者光合；消费者消耗；污染伤害
    if (def.trophic === 'producer') {
      if (!env.isNight && def.habitat !== 'air') {
        // 白天光合，污染降低效率
        c.energy += def.energyGain * dt * (1 - env.pollution * 0.4);
      }
      // 生产者不消耗移动能量
    } else {
      c.energy -= (resting ? 0.6 : 1.4) * dt;
    }

    // 污染对不耐污物种造成持续伤害
    const pollutionDamage = (1 - def.pollutionTolerance) * env.pollution * 2.2 * dt;
    c.energy -= pollutionDamage;

    // 3. 行为决策：寻找猎物或游荡
    let desiredVel = c.velocity;
    if (def.prey.length > 0 && c.energy < def.maxEnergy * 0.85 && !resting) {
      // 寻找最近的可食物种
      let nearest: Creature | null = null;
      let nearestDist = Infinity;
      for (const other of alive) {
        if (!other.alive) continue;
        if (!def.prey.includes(other.speciesId)) continue;
        if (other.id === c.id) continue;
        const d = len(sub(c.position, other.position));
        if (d < nearestDist) {
          nearestDist = d;
          nearest = other;
        }
      }
      if (nearest && nearestDist < 9) {
        c.targetId = nearest.id;
        const dir = norm(sub(nearest.position, c.position));
        desiredVel = [
          dir[0] * def.moveSpeed,
          dir[1] * def.moveSpeed,
          dir[2] * def.moveSpeed,
        ];
        // 接触到猎物 -> 捕食
        if (nearestDist < c.scale + nearest.scale + 0.35) {
          nearest.alive = false;
          c.energy = Math.min(def.maxEnergy, c.energy + def.energyGain);
          events.push({
            type: 'predation',
            creatureId: c.id,
            speciesId: c.speciesId,
          });
        }
      } else {
        c.targetId = undefined;
      }
    }

    // 无目标时随机游荡（生产者中水草不动）
    if (def.moveSpeed > 0 && (!c.targetId || resting)) {
      // 缓慢改变方向
      const wander = 0.6;
      desiredVel = [
        c.velocity[0] + (input.rng() - 0.5) * wander,
        c.velocity[1] + (input.rng() - 0.5) * wander * 0.4,
        c.velocity[2] + (input.rng() - 0.5) * wander,
      ];
      const nv = norm(desiredVel);
      const sp = def.moveSpeed * speedFactor;
      desiredVel = [nv[0] * sp, nv[1] * sp, nv[2] * sp];
    } else if (resting) {
      // 休眠：极大减速，基本悬停
      desiredVel = [c.velocity[0] * 0.85, c.velocity[1] * 0.85, c.velocity[2] * 0.85];
    }

    c.velocity = desiredVel;

    // 4. 移动与边界反弹
    const pos: Vec3 = [
      c.position[0] + c.velocity[0] * dt,
      c.position[1] + c.velocity[1] * dt,
      c.position[2] + c.velocity[2] * dt,
    ];
    const yMin =
      def.habitat === 'bottom' ? 0.3 : def.habitat === 'air' ? 6.8 : 0.5;
    const yMax =
      def.habitat === 'air'
        ? BOUNDS.airMaxY
        : def.habitat === 'surface'
          ? BOUNDS.surfaceY + 0.4
          : BOUNDS.maxY;
    if (pos[0] < BOUNDS.minX || pos[0] > BOUNDS.maxX) {
      pos[0] = clamp(pos[0], BOUNDS.minX, BOUNDS.maxX);
      c.velocity[0] *= -1;
    }
    if (pos[2] < BOUNDS.minZ || pos[2] > BOUNDS.maxZ) {
      pos[2] = clamp(pos[2], BOUNDS.minZ, BOUNDS.maxZ);
      c.velocity[2] *= -1;
    }
    if (pos[1] < yMin || pos[1] > yMax) {
      pos[1] = clamp(pos[1], yMin, yMax);
      c.velocity[1] *= -1;
    }
    c.position = pos;

    // 更新朝向（水平移动方向）
    if (Math.abs(c.velocity[0]) > 0.01 || Math.abs(c.velocity[2]) > 0.01) {
      c.heading = Math.atan2(c.velocity[0], c.velocity[2]);
    }
    c.energy = clamp(c.energy, 0, def.maxEnergy);

    // 5. 死亡判断
    if (c.energy <= 0 || c.age >= def.lifespan) {
      c.alive = false;
      events.push({ type: 'death', creatureId: c.id, speciesId: c.speciesId });
    }

    // 6. 繁殖：能量达阈值且附近有同种
    if (
      c.alive &&
      c.energy >= def.reproductionThreshold &&
      alive.length + newborns.length < SIM.MAX_CREATURES &&
      input.rng() < 0.012 // 每帧低概率，避免一帧全繁殖
    ) {
      const hasMate = alive.some(
        (o) => o.id !== c.id && o.speciesId === c.speciesId && o.alive,
      );
      if (hasMate || def.trophic === 'producer') {
        c.energy -= def.reproductionCost;
        const child = createCreature(c.speciesId, input.rng);
        // 出生在亲代附近
        child.position = [
          clamp(c.position[0] + randRange(input.rng, -1, 1), BOUNDS.minX, BOUNDS.maxX),
          c.position[1],
          clamp(c.position[2] + randRange(input.rng, -1, 1), BOUNDS.minZ, BOUNDS.maxZ),
        ];
        child.energy = def.maxEnergy * 0.4;
        newborns.push(child);
        events.push({ type: 'birth', creatureId: child.id, speciesId: c.speciesId });
      }
    }
  }

  const survivors = alive
    .filter((c) => c.alive)
    .concat(newborns);

  return { creatures: survivors, env, events };
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/** 统计各物种种群数量 */
export function countPopulations(
  creatures: Creature[],
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const c of creatures) {
    counts[c.speciesId] = (counts[c.speciesId] ?? 0) + 1;
  }
  return counts;
}

/** 由初始种群配置生成一批生物 */
export function spawnPopulation(
  populations: Record<string, number>,
  seed: number,
): Creature[] {
  const rng = createRng(seed);
  const result: Creature[] = [];
  for (const [speciesId, count] of Object.entries(populations)) {
    if (!SPECIES[speciesId]) continue;
    for (let i = 0; i < count; i += 1) {
      result.push(createCreature(speciesId, rng));
    }
  }
  return result;
}

export { pick };
