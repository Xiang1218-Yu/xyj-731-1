/**
 * 生态系统全局类型定义
 * 说明：全项目禁止使用 any，所有模拟数据均在此建模
 */

/** 物种唯一标识（联合字面量类型，新增物种需先扩展此处） */
export type SpeciesId =
  | 'elodea'        // 水草（生产者）
  | 'algae'         // 绿藻（生产者）
  | 'noctiluca'     // 夜光藻（生产者，夜晚发光）
  | 'snail'         // 苹果螺（初级消费者）
  | 'shrimp'        // 米虾（初级消费者，夜行）
  | 'minnow'        // 食蚊鱼（初级消费者）
  | 'medaka'        // 青鳉鱼（次级消费者）
  | 'diving-beetle'; // 龙虱（顶级消费者，夜行）

/** 营养级：1 生产者 / 2 初级消费者 / 3 次级及以上消费者 */
export type TrophicLevel = 1 | 2 | 3;

/** 作息类型：昼行 / 夜行 / 全天活动 */
export type CircadianType = 'diurnal' | 'nocturnal' | 'cathemeral';

/** 昼夜相位：黎明 / 白天 / 黄昏 / 夜晚 */
export type DayPhase = 'dawn' | 'day' | 'dusk' | 'night';

/** 生物存活状态 */
export type CreatureStatus = 'active' | 'sleeping' | 'dead';

/** 三维坐标（元组类型，避免引入 three 依赖到模拟层） */
export type Vec3 = [number, number, number];

/** 物种静态定义表 */
export interface SpeciesDef {
  id: SpeciesId;
  name: string;               // 中文名
  emoji: string;              // 面板展示图标
  trophicLevel: TrophicLevel; // 营养级
  diet: SpeciesId[];          // 捕食对象（生产者为空）
  circadian: CircadianType;   // 作息
  bioluminescent: boolean;    // 夜晚是否生物发光
  baseSpeed: number;          // 基础游动速度（单位/秒）
  maxEnergy: number;          // 能量上限
  lifespan: number;           // 寿命（模拟秒）
  reproduceThreshold: number; // 繁殖所需能量阈值
  bodySize: number;           // 3D 体型缩放系数
  color: string;              // 3D 主体颜色
}

/** 单个生物个体实例 */
export interface Creature {
  id: string;                 // 个体 id（自增编号）
  speciesId: SpeciesId;
  position: Vec3;             // 缸内坐标
  velocity: Vec3;             // 当前速度向量
  energy: number;             // 当前能量
  hunger: number;             // 饥饿度 0-100（越高越饿）
  age: number;                // 年龄（模拟秒）
  status: CreatureStatus;
  glowing: boolean;           // 当前是否正在发光
  wanderSeed: number;         // 漫游随机种子（驱动各自不同的游动轨迹）
}

/** 历史快照：记录某一时刻的完整生态状态 */
export interface Snapshot {
  index: number;              // 快照序号
  simTime: number;            // 模拟内时间（秒）
  phase: DayPhase;            // 当时昼夜相位
  dayProgress: number;        // 昼夜周期进度 0-1
  counts: Partial<Record<SpeciesId, number>>; // 各物种存活数
  creatures: Creature[];      // 个体深拷贝
}

/** 预设生态场景 */
export interface PresetScene {
  id: 'freshwater-lake' | 'rainforest' | 'polluted-water';
  name: string;
  description: string;
  waterQuality: number;       // 水质 0-1，乘算于生产者效率并影响寿命
  initialStock: Array<{ speciesId: SpeciesId; count: number }>;
}

/** 播放速度档位 */
export type PlaySpeed = 1 | 2 | 4;

/** 食物网悬停详情（面板展示用） */
export interface DietDetail {
  preys: SpeciesId[];         // 该物种捕食的对象
  predators: SpeciesId[];     // 捕食该物种的天敌
}
