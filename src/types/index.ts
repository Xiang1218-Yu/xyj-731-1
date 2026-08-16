// ============================================================
// 生态缸核心类型定义
// ============================================================

/** 物种营养级分类 */
export enum TrophicLevel {
  Producer = 'producer',       // 生产者（植物、藻类）
  PrimaryConsumer = 'primary', // 初级消费者（草食动物）
  SecondaryConsumer = 'secondary', // 次级消费者（小型肉食动物）
  TertiaryConsumer = 'tertiary',   // 三级消费者（顶级捕食者）
  Decomposer = 'decomposer'    // 分解者
}

/** 生物的作息类型 */
export enum ActivityPattern {
  Diurnal = 'diurnal',     // 昼行性
  Nocturnal = 'nocturnal', // 夜行性
  Crepuscular = 'crepuscular', // 晨昏性
  Always = 'always'        // 全天候活动
}

/** 生物在3D空间中的移动方式 */
export enum MovementType {
  Static = 'static',       // 静止（植物）
  Swim = 'swim',           // 游泳
  Walk = 'walk',           // 行走/爬行
  Float = 'float',         // 漂浮
  Fly = 'fly'              // 飞行（热带雨林中）
}

/** 生态场景类型 */
export enum SceneType {
  FreshwaterLake = 'freshwater_lake',
  TropicalRainforest = 'tropical_rainforest',
  PollutedWater = 'polluted_water',
  Custom = 'custom'
}

/** 物种静态定义（模板） */
export interface SpeciesTemplate {
  id: string;
  name: string;
  scientificName: string;
  trophicLevel: TrophicLevel;
  activityPattern: ActivityPattern;
  movementType: MovementType;
  /** 该物种可捕食的其他物种ID列表 */
  preyIds: string[];
  /** 基础颜色（用于3D渲染） */
  color: string;
  /** 发光颜色（夜行性生物夜晚发光用），null表示不发光 */
  glowColor: string | null;
  /** 生物体型大小（3D缩放） */
  size: number;
  /** 正常移动速度 */
  speed: number;
  /** 能量最大值 */
  maxEnergy: number;
  /** 生物描述 */
  description: string;
  /** 适存场景 */
  habitat: SceneType[];
  /** 污染耐受度 0-1：0=极敏感，1=完全耐受（在污染水中正常生存） */
  pollutionTolerance: number;
  /** 繁殖所需的最小年龄（秒） */
  maturityAge: number;
  /** 繁殖所需的能量阈值占比（0-1） */
  reproductionEnergyThreshold: number;
  /** 繁殖冷却时间（秒） */
  reproductionCooldown: number;
}

/** 生态缸中单个生物的运行时状态 */
export interface Organism {
  id: string;
  speciesId: string;
  /** 当前3D位置 */
  position: [number, number, number];
  /** 当前朝向（弧度） */
  rotation: number;
  /** 当前能量值 */
  energy: number;
  /** 是否存活 */
  alive: boolean;
  /** 是否处于休眠/休息状态 */
  resting: boolean;
  /** 当前年龄（秒） */
  age: number;
  /** 移动目标点 */
  targetPosition: [number, number, number] | null;
  /** 上次进食时间 */
  lastFeedTime: number;
  /** 上次繁殖时间 */
  lastReproduceTime: number;
  /** 污染伤害累积（0-1，达到1时死亡） */
  pollutionDamage: number;
}

/** 生态系统时间状态 */
export interface EcoTime {
  /** 仿真总经过时间（秒） */
  elapsed: number;
  /** 一天中的小时（0-24） */
  hourOfDay: number;
  /** 是白天还是夜晚 */
  isDaytime: boolean;
  /** 0-1 之间的光照强度（用于昼夜过渡） */
  lightIntensity: number;
}

/** 单一历史快照 */
export interface Snapshot {
  /** 快照对应的仿真时间（秒） */
  timestamp: number;
  /** 当时的生态时间 */
  ecoTime: EcoTime;
  /** 当时所有生物状态的深拷贝 */
  organisms: Organism[];
  /** 当时的总能量 */
  totalEnergy: number;
  /** 当时的物种数量 */
  speciesCount: Record<string, number>;
}

/** 预设场景定义 */
export interface PresetScene {
  id: SceneType;
  name: string;
  description: string;
  /** 场景中的初始生物配置：物种ID -> 数量 */
  initialPopulations: Record<string, number>;
  /** 环境色调 */
  ambientColor: string;
  /** 水体/地面颜色 */
  groundColor: string;
  /** 雾色 */
  fogColor: string;
  /** 污染程度（0-1），影响生物存活 */
  pollutionLevel: number;
}

/** 食物链节点 */
export interface FoodChainNode {
  speciesId: string;
  name: string;
  trophicLevel: TrophicLevel;
  x: number;
  y: number;
}

/** 食物链连接关系 */
export interface FoodChainEdge {
  from: string; // 猎物
  to: string;   // 捕食者
}
