/**
 * 领域核心类型定义
 * 说明：整个生态缸系统的数据模型集中在此，禁止使用 any。
 */

/** 三维向量（用于位置与速度） */
export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** 营养级 / 生态角色 */
export type TrophicRole =
  | 'producer' // 生产者（水草、藻类、植物）
  | 'herbivore' // 初级消费者（食草）
  | 'carnivore' // 次级/高级消费者（食肉）
  | 'omnivore' // 杂食者
  | 'decomposer'; // 分解者

/** 昼夜作息类型：决定夜晚的行为特性 */
export type Chronotype =
  | 'diurnal' // 昼行性：夜晚休眠、游动减速
  | 'nocturnal' // 夜行性：夜晚活跃，可能发光
  | 'cathemeral'; // 全天活动：昼夜差异较小

/** 物种唯一标识 */
export type SpeciesId = string;

/**
 * 物种定义（静态模板）
 * 描述某一物种的通用生物学与行为参数。
 */
export interface Species {
  /** 物种 ID */
  id: SpeciesId;
  /** 物种中文名 */
  name: string;
  /** emoji 图标，用于 UI 展示 */
  icon: string;
  /** 营养级 / 角色 */
  role: TrophicRole;
  /** 昼夜作息类型 */
  chronotype: Chronotype;
  /** 渲染基础颜色（十六进制字符串） */
  color: string;
  /** 渲染尺寸（半径，单位与缸体一致） */
  size: number;
  /** 基础移动速度（单位/秒） */
  baseSpeed: number;
  /** 可捕食的物种 ID 列表（食物来源） */
  preyOf: SpeciesId[];
  /** 初始能量值 */
  initialEnergy: number;
  /** 每秒基础代谢消耗的能量 */
  metabolism: number;
  /** 生产者每秒通过光合作用产出的能量（仅生产者有效，白天生效） */
  photosynthesis: number;
  /** 达到该能量阈值可繁殖 */
  reproduceThreshold: number;
  /** 夜晚是否发光（如萤火虫、发光水母） */
  glowsAtNight: boolean;
  /** 简短的科普描述 */
  description: string;
}

/**
 * 生物个体实例（动态运行时对象）
 */
export interface Organism {
  /** 个体唯一 ID */
  id: string;
  /** 所属物种 ID */
  speciesId: SpeciesId;
  /** 当前位置 */
  position: Vec3;
  /** 当前速度向量 */
  velocity: Vec3;
  /** 当前能量 */
  energy: number;
  /** 是否存活 */
  alive: boolean;
  /** 是否处于休眠（夜晚昼行性生物） */
  asleep: boolean;
  /** 年龄（秒） */
  age: number;
  /** 距离上次繁殖的冷却时间（秒） */
  reproduceCooldown: number;
}

/** 昼夜阶段 */
export type DayPhase = 'day' | 'night';

/**
 * 某一时刻的生态系统完整快照（用于历史回看）
 */
export interface EcosystemSnapshot {
  /** 模拟经过的总时间（秒） */
  time: number;
  /** 归一化的一天时钟 [0,1)，0=午夜 0.5=正午 */
  clock: number;
  /** 昼夜阶段 */
  phase: DayPhase;
  /** 该时刻所有存活生物 */
  organisms: Organism[];
  /** 各物种当前数量统计 */
  population: Record<SpeciesId, number>;
}

/** 食物网中的一条捕食关系边：predator 捕食 prey */
export interface FoodWebEdge {
  predator: SpeciesId;
  prey: SpeciesId;
}

/**
 * 预设生态场景
 */
export interface ScenePreset {
  /** 场景 ID */
  id: string;
  /** 场景名称，如“淡水湖泊” */
  name: string;
  /** 场景说明 */
  description: string;
  /** 场景主题色（用于水体/环境着色） */
  ambientColor: string;
  /** 水体浑浊度 / 污染程度 [0,1]，影响可视化与生产者产能 */
  pollution: number;
  /** 初始投放：物种 ID -> 数量 */
  initialPopulation: Record<SpeciesId, number>;
}
