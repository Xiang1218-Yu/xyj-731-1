/**
 * 生态系统模拟引擎（纯 TypeScript，不依赖 React / three）
 * 固定步长推进：代谢、捕食、繁殖、死亡、昼夜作息、生产者产能
 */
import { SPECIES, SPECIES_IDS } from '@/data/species';
import type {
  Creature,
  DayPhase,
  PresetScene,
  Snapshot,
  SpeciesId,
  Vec3,
} from '@/types/ecosystem';
import { SnapshotHistory } from './history';

/** 缸体内部边界（与 3D 场景保持一致） */
export const TANK_BOUNDS = {
  x: 5.4,   // 半宽
  yMin: 0.35,
  yMax: 6.1,
  z: 3.0,   // 半深
} as const;

/** 单个昼夜周期时长（模拟秒） */
export const DAY_CYCLE_SECONDS = 120;
/** 每个 tick 对应的模拟秒数 */
export const TICK_SECONDS = 0.1;
/** 每隔多少个 tick 写入一次历史快照（10 tick = 1 秒） */
export const SNAPSHOT_INTERVAL_TICKS = 10;
/** 缸内生物总数上限（性能与生态双重约束） */
export const MAX_CREATURES = 150;
/** 每个物种的数量上限（防止单种暴发撑爆系统） */
const SPECIES_CAP = 24;

/** 简易伪随机（带种子的个体漫游轨迹使用，保证每只生物轨迹不同） */
function seededNoise(seed: number, t: number): number {
  // 经典 hash 噪声：返回 -1 ~ 1 平滑波动值
  return Math.sin(seed * 12.9898 + t * 0.7) * Math.cos(seed * 4.1414 + t * 0.43);
}

/** 在缸内按物种水层偏好生成出生位置 */
function spawnPosition(speciesId: SpeciesId): Vec3 {
  const rand = (min: number, max: number) => min + Math.random() * (max - min);
  const x = rand(-TANK_BOUNDS.x, TANK_BOUNDS.x);
  const z = rand(-TANK_BOUNDS.z, TANK_BOUNDS.z);
  switch (speciesId) {
    case 'elodea':
      return [x, 0.35, z]; // 水草扎根底砂
    case 'snail':
      return [x, rand(0.4, 1.5), z]; // 螺类贴底
    case 'shrimp':
      return [x, rand(0.5, 2.0), z]; // 虾在底层活动
    case 'diving-beetle':
      return [x, rand(1.0, 3.0), z]; // 龙虱中下层的伏击者
    case 'algae':
      return [x, rand(0.8, 4.5), z]; // 藻类水中漂浮
    case 'minnow':
      return [x, rand(2.5, 4.5), z]; // 中层鱼类
    case 'medaka':
      return [x, rand(3.5, 5.5), z]; // 中上层鱼类
    case 'noctiluca':
      return [x, rand(4.0, 5.8), z]; // 浮游生物聚于上层
  }
}

/** 根据昼夜周期进度计算相位 */
function phaseOf(progress: number): DayPhase {
  if (progress < 0.05) return 'dawn';
  if (progress < 0.65) return 'day';
  if (progress < 0.7) return 'dusk';
  return 'night';
}

/** 根据昼夜进度计算光照强度 0-1（白天 1，夜晚 0.12，晨昏线性过渡） */
export function lightLevelOf(progress: number): number {
  if (progress < 0.05) return 0.12 + (progress / 0.05) * 0.88; // 黎明渐亮
  if (progress < 0.65) return 1;                               // 白天全亮
  if (progress < 0.7) return 1 - ((progress - 0.65) / 0.05) * 0.88; // 黄昏渐暗
  return 0.12;                                                 // 夜晚昏暗
}

/** 生态引擎主类 */
export class SimulationEngine {
  creatures: Creature[] = [];
  simTime = 0;
  tickCount = 0;
  waterQuality = 0.9;
  history = new SnapshotHistory(600);
  /** 最近一次发生的事件文本（用于时间轴事件提示，可选展示） */
  lastEvent = '';

  private nextId = 1;

  /** 当前昼夜周期进度 0-1 */
  get dayProgress(): number {
    return (this.simTime % DAY_CYCLE_SECONDS) / DAY_CYCLE_SECONDS;
  }

  /** 当前昼夜相位 */
  get phase(): DayPhase {
    return phaseOf(this.dayProgress);
  }

  /** 当前光照强度 0-1 */
  get lightLevel(): number {
    return lightLevelOf(this.dayProgress);
  }

  /** 加载预设场景：清空现有生态并投放初始种群 */
  loadPreset(preset: PresetScene): void {
    this.clear();
    this.waterQuality = preset.waterQuality;
    for (const stock of preset.initialStock) {
      for (let i = 0; i < stock.count; i++) {
        this.spawnCreature(stock.speciesId);
      }
    }
    this.lastEvent = `已加载场景「${preset.name}」`;
    this.writeSnapshot();
  }

  /** 清空生态缸 */
  clear(): void {
    this.creatures = [];
    this.simTime = 0;
    this.tickCount = 0;
    this.history.clear();
  }

  /** 投放一个新个体（用户点击物种面板时调用） */
  spawnCreature(speciesId: SpeciesId, position?: Vec3): Creature | null {
    if (this.creatures.filter((c) => c.status !== 'dead').length >= MAX_CREATURES) return null;
    const def = SPECIES[speciesId];
    const creature: Creature = {
      id: `c${this.nextId++}`,
      speciesId,
      position: position ?? spawnPosition(speciesId),
      velocity: [0, 0, 0],
      energy: def.maxEnergy * 0.7,
      hunger: 30,
      age: 0,
      status: 'active',
      glowing: false,
      wanderSeed: Math.random() * 100,
    };
    this.creatures.push(creature);
    return creature;
  }

  /** 对外暴露的手动快照（清空场景后立即记录一条初始状态） */
  writeSnapshotPublic(): void {
    this.writeSnapshot();
  }

  /** 推进一个 tick（0.1 模拟秒） */
  tick(): void {
    this.tickCount++;
    this.simTime += TICK_SECONDS;
    const dt = TICK_SECONDS;
    const light = this.lightLevel;
    const phase = this.phase;

    for (const c of this.creatures) {
      if (c.status === 'dead') {
        this.updateCorpse(c, dt);
        continue;
      }
      const def = SPECIES[c.speciesId];
      c.age += dt;

      // 1. 作息：按昼夜相位决定活动/休眠
      this.updateCircadian(c, phase);
      // 2. 能量收支：生产者光合产能，所有生物基础代谢
      this.updateMetabolism(c, dt, light);
      // 3. 死亡判定：饿死或寿终（水质差会缩短寿命）
      if (c.energy <= 0 || c.age > def.lifespan * (0.5 + this.waterQuality * 0.5)) {
        c.status = 'dead';
        this.lastEvent = `一只${def.name}${c.energy <= 0 ? '饿死了' : '寿终正寝'}`;
        continue;
      }
      // 4. 移动与捕食（休眠个体仅缓慢漂移）
      if (c.status === 'active') {
        this.updateMovement(c, dt);
        if (def.diet.length > 0) this.updateHunting(c, dt);
      } else {
        this.updateDrift(c, dt);
      }
      // 5. 繁殖：能量充足且未超种群雄厚上限时分裂
      this.updateReproduction(c);
    }

    // 清理已完全沉底消散的尸体
    this.creatures = this.creatures.filter(
      (c) => !(c.status === 'dead' && c.position[1] <= TANK_BOUNDS.yMin)
    );

    // 周期性写入历史快照
    if (this.tickCount % SNAPSHOT_INTERVAL_TICKS === 0) {
      this.writeSnapshot();
    }
  }

  /** 作息更新：昼行种夜晚休眠，夜行种白天休眠；发光种仅夜晚发光 */
  private updateCircadian(c: Creature, phase: DayPhase): void {
    const def = SPECIES[c.speciesId];
    const isNight = phase === 'night';
    if (def.circadian === 'diurnal') {
      c.status = isNight ? 'sleeping' : 'active';
    } else if (def.circadian === 'nocturnal') {
      // 夜行种在整个白天（含黄昏）休眠，夜晚活跃
      c.status = isNight || phase === 'dawn' ? 'active' : 'sleeping';
    } else {
      c.status = 'active';
    }
    // 生物发光：只有夜晚且具备发光能力的物种点亮自己
    c.glowing = def.bioluminescent && isNight;
  }

  /** 能量收支：生产者白天产能夜晚消耗；消费者移动耗能、饥饿度累积 */
  private updateMetabolism(c: Creature, dt: number, light: number): void {
    const def = SPECIES[c.speciesId];
    if (def.trophicLevel === 1) {
      // 生产者：产能效率 = 光照 × 水质（污染显著抑制光合作用）
      const gain = 6 * light * this.waterQuality * dt;
      const drain = light < 0.5 ? 1.2 * dt : 0.3 * dt; // 夜间呼吸消耗大于白天
      c.energy = Math.min(def.maxEnergy, Math.max(0, c.energy + gain - drain));
      c.hunger = Math.max(0, c.hunger - 5 * dt); // 生产者不存在饥饿觅食
    } else {
      // 消费者：基础代谢 + 运动消耗（休眠时代谢减半）
      const moveCost = c.status === 'active' ? 1.0 : 0.4;
      c.energy = Math.max(0, c.energy - 0.65 * moveCost * dt);
      c.hunger = Math.min(100, c.hunger + 1.2 * moveCost * dt);
      // 饥饿时能量消耗加剧（觅食焦虑）
      if (c.hunger > 80) c.energy = Math.max(0, c.energy - 0.6 * dt);
    }
  }

  /** 主动移动：噪声漫游 + 边界回弹 */
  private updateMovement(c: Creature, dt: number): void {
    const def = SPECIES[c.speciesId];
    if (def.baseSpeed <= 0) return; // 水草等固定物种不移动
    const t = this.simTime;
    const speed = def.baseSpeed;
    // 由种子驱动的平滑随机方向
    const vx = seededNoise(c.wanderSeed, t) * speed;
    const vz = seededNoise(c.wanderSeed + 50, t) * speed;
    const vy = seededNoise(c.wanderSeed + 99, t * 0.6) * speed * 0.3;
    c.velocity = [vx, vy, vz];
    this.integrate(c, dt);
  }

  /** 休眠漂移：速度降至 20%，体现"游动减速" */
  private updateDrift(c: Creature, dt: number): void {
    const def = SPECIES[c.speciesId];
    if (def.baseSpeed <= 0) return;
    const t = this.simTime;
    const speed = def.baseSpeed * 0.2;
    const vx = seededNoise(c.wanderSeed, t) * speed;
    const vz = seededNoise(c.wanderSeed + 50, t) * speed;
    // 休眠个体缓慢下沉到栖息水层
    const vy = (0.8 - c.position[1]) * 0.05;
    c.velocity = [vx, vy, vz];
    this.integrate(c, dt);
  }

  /** 位置积分与缸壁碰撞 */
  private integrate(c: Creature, dt: number): void {
    let [x, y, z] = c.position;
    x += c.velocity[0] * dt;
    y += c.velocity[1] * dt;
    z += c.velocity[2] * dt;
    // 边界钳制并反转该轴速度（软回弹）
    if (x < -TANK_BOUNDS.x || x > TANK_BOUNDS.x) c.velocity[0] *= -1;
    if (z < -TANK_BOUNDS.z || z > TANK_BOUNDS.z) c.velocity[2] *= -1;
    x = Math.max(-TANK_BOUNDS.x, Math.min(TANK_BOUNDS.x, x));
    z = Math.max(-TANK_BOUNDS.z, Math.min(TANK_BOUNDS.z, z));
    y = Math.max(TANK_BOUNDS.yMin, Math.min(TANK_BOUNDS.yMax, y));
    c.position = [x, y, z];
  }

  /** 捕食：饥饿个体搜寻最近猎物，接近后捕食并转移能量 */
  private updateHunting(c: Creature, dt: number): void {
    if (c.hunger < 60) return; // 不饿不捕猎
    const def = SPECIES[c.speciesId];
    let target: Creature | null = null;
    let best = Infinity;
    for (const other of this.creatures) {
      if (other.status !== 'active' && other.status !== 'sleeping') continue;
      if (!def.diet.includes(other.speciesId)) continue;
      const d = distance(c.position, other.position);
      if (d < best) {
        best = d;
        target = other;
      }
    }
    if (!target) return;

    if (best < 0.5) {
      // 捕食成功：猎物死亡，能量转移 50%
      target.status = 'dead';
      const preyDef = SPECIES[target.speciesId];
      c.energy = Math.min(def.maxEnergy, c.energy + preyDef.maxEnergy * 0.5);
      c.hunger = Math.max(0, c.hunger - 55);
      this.lastEvent = `${def.name}捕食了${preyDef.name}`;
    } else if (best < 6) {
      // 追击：朝猎物方向加速
      const dir: Vec3 = [
        target.position[0] - c.position[0],
        target.position[1] - c.position[1],
        target.position[2] - c.position[2],
      ];
      const len = Math.hypot(dir[0], dir[1], dir[2]) || 1;
      const chase = def.baseSpeed * 1.4;
      c.velocity = [(dir[0] / len) * chase, (dir[1] / len) * chase, (dir[2] / len) * chase];
      this.integrate(c, dt);
    }
  }

  /** 繁殖：能量超阈值且物种未达上限，消耗一半能量产下后代 */
  private updateReproduction(c: Creature): void {
    const def = SPECIES[c.speciesId];
    if (c.energy < def.reproduceThreshold) return;
    const sameCount = this.creatures.filter(
      (x) => x.speciesId === c.speciesId && x.status !== 'dead'
    ).length;
    if (sameCount >= SPECIES_CAP) return;
    if (this.creatures.length >= MAX_CREATURES) return;
    // 小概率触发，避免同步爆炸式繁殖
    if (Math.random() > 0.006) return;
    c.energy *= 0.5;
    const child = this.spawnCreature(c.speciesId);
    if (child) {
      // 后代出生在亲代附近
      child.position = [
        c.position[0] + (Math.random() - 0.5),
        c.position[1] + (Math.random() - 0.5),
        c.position[2] + (Math.random() - 0.5),
      ];
      this.lastEvent = `${def.name}繁殖了新个体`;
    }
  }

  /** 尸体处理：缓慢下沉，沉底后由主循环移除 */
  private updateCorpse(c: Creature, dt: number): void {
    c.glowing = false;
    c.velocity = [0, -0.5, 0];
    c.position = [c.position[0], c.position[1] - 0.5 * dt, c.position[2]];
  }

  /** 写入一条历史快照（深拷贝个体数组） */
  private writeSnapshot(): void {
    const counts: Partial<Record<SpeciesId, number>> = {};
    for (const sid of SPECIES_IDS) counts[sid] = 0;
    for (const c of this.creatures) {
      if (c.status !== 'dead') counts[c.speciesId] = (counts[c.speciesId] ?? 0) + 1;
    }
    const snapshot: Snapshot = {
      index: this.history.length,
      simTime: this.simTime,
      phase: this.phase,
      dayProgress: this.dayProgress,
      counts,
      creatures: this.creatures.map((c) => ({
        ...c,
        position: [...c.position] as Vec3,
        velocity: [...c.velocity] as Vec3,
      })),
    };
    this.history.push(snapshot);
  }
}

/** 两点欧氏距离 */
function distance(a: Vec3, b: Vec3): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}
