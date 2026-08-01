// 生态模拟核心类型定义 —— 全项目禁止使用 any，所有结构在此集中定义

/** 营养级分类 */
export type TrophicLevel =
  | 'producer'
  | 'primary'
  | 'secondary'
  | 'apex'
  | 'decomposer';

/** 昼夜节律类型：日行 / 夜行 / 任意 */
export type CircadianType = 'diurnal' | 'nocturnal' | 'any';

/** 栖息水层：水体中 / 水底 / 水面以上空气层 / 水面 */
export type Habitat = 'water' | 'bottom' | 'air' | 'surface';

/** 一天中的时段 */
export type PhaseName = 'dawn' | 'day' | 'dusk' | 'night';

/** 三维向量，以元组形式存储，便于序列化与快照 */
export type Vec3 = [number, number, number];

/** 物种静态定义（模板，模拟过程中不变） */
export interface SpeciesDef {
  id: string;
  name: string;
  latin?: string;
  trophic: TrophicLevel;
  color: string;
  /** 渲染外形类型，由 3D 层决定如何组合几何体 */
  shape: 'fish' | 'plankton' | 'plant' | 'snail' | 'insect' | 'bird' | 'worm' | 'leech';
  emoji?: string;
  /** 可捕食的物种 id 列表 */
  prey: string[];
  /** 捕食 / 光合一次获得的能量 */
  energyGain: number;
  maxEnergy: number;
  moveSpeed: number;
  sizeRange: [number, number];
  /** 寿命（模拟秒） */
  lifespan: number;
  /** 达到该能量值且附近有同种时可繁殖 */
  reproductionThreshold: number;
  reproductionCost: number;
  circadian: CircadianType;
  /** 夜间是否发光 */
  nocturnalGlow?: boolean;
  habitat: Habitat;
  /** 耐污能力 0..1，越高越能在污染水域存活 */
  pollutionTolerance: number;
  description: string;
}

/** 单个生物的运行时状态 */
export interface Creature {
  id: string;
  speciesId: string;
  position: Vec3;
  velocity: Vec3;
  energy: number;
  age: number;
  alive: boolean;
  /** 当前捕食目标的实例 id */
  targetId?: string;
  /** 渲染用：个体随机种子 */
  seed: number;
  /** 渲染用：体型缩放 */
  scale: number;
  /** 渲染用：朝向（绕 Y 轴弧度） */
  heading: number;
  /** 尾部摆动相位 */
  phase: number;
  /** 是否处于休眠（夜间） */
  resting: boolean;
}

/** 环境状态 */
export interface EnvironmentState {
  /** 一天内的位置 0..1 */
  timeOfDay: number;
  dayCount: number;
  phase: PhaseName;
  /** 太阳光强 0..1 */
  sunIntensity: number;
  ambientIntensity: number;
  waterTint: string;
  fogTint: string;
  isNight: boolean;
  /** 污染度 0..1 */
  pollution: number;
}

/** 某一时刻的完整生态快照（用于历史回放） */
export interface Snapshot {
  tick: number;
  simTime: number;
  creatures: Creature[];
  env: EnvironmentState;
  populations: Record<string, number>;
}

/** 预设场景 */
export interface PresetScene {
  id: string;
  name: string;
  description: string;
  gradient: [string, string];
  waterTint: string;
  fogTint: string;
  populations: Record<string, number>;
  pollution: number;
}

/** 食物网节点坐标（在 SVG 画布中） */
export interface FoodWebNode {
  speciesId: string;
  x: number;
  y: number;
}

/** 模拟常量 */
export const SIM = {
  /** 缸体内尺寸：宽 x 高 z 深 */
  TANK: { width: 16, height: 10, depth: 10 },
  /** 水面高度 */
  WATER_LEVEL: 6,
  /** 一个昼夜周期的模拟秒数 */
  DAY_LENGTH: 120,
  /** 逻辑步长（模拟秒） */
  FIXED_DT: 0.1,
  /** 快照存储间隔（模拟秒） */
  SNAPSHOT_INTERVAL: 1,
  /** 快照上限 */
  MAX_SNAPSHOTS: 240,
  /** 同屏生物软上限 */
  MAX_CREATURES: 140,
} as const;
