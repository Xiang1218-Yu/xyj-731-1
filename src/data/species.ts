/**
 * 物种静态定义与食物网数据
 * 数值为教学模拟服务，力求体现真实生态关系（而非精确生物学数据）
 */
import type { SpeciesDef, SpeciesId, DietDetail, TrophicLevel } from '@/types/ecosystem';

/** 物种定义表：键即物种 id */
export const SPECIES: Record<SpeciesId, SpeciesDef> = {
  // ---------- 生产者 ----------
  elodea: {
    id: 'elodea',
    name: '水草',
    emoji: '🌿',
    trophicLevel: 1,
    diet: [],                    // 生产者不捕食
    circadian: 'diurnal',        // 白天光合作用，夜晚停止产能
    bioluminescent: false,
    baseSpeed: 0,                // 生产者固定不动
    maxEnergy: 100,
    lifespan: 600,
    reproduceThreshold: 85,
    bodySize: 1.2,
    color: '#2f9e5f',
  },
  algae: {
    id: 'algae',
    name: '绿藻',
    emoji: '🟢',
    trophicLevel: 1,
    diet: [],
    circadian: 'diurnal',
    bioluminescent: false,
    baseSpeed: 0.05,             // 随水流缓慢漂浮
    maxEnergy: 50,
    lifespan: 240,
    reproduceThreshold: 40,      // 繁殖快，是食物网底座
    bodySize: 0.58,
    color: '#7bc96f',
  },
  noctiluca: {
    id: 'noctiluca',
    name: '夜光藻',
    emoji: '✨',
    trophicLevel: 1,
    diet: [],
    circadian: 'cathemeral',
    bioluminescent: true,        // 标志性特性：夜晚发出蓝绿色荧光
    baseSpeed: 0.12,
    maxEnergy: 45,
    lifespan: 200,
    reproduceThreshold: 38,
    bodySize: 0.4,
    color: '#4de3c2',
  },
  // ---------- 初级消费者 ----------
  snail: {
    id: 'snail',
    name: '苹果螺',
    emoji: '🐌',
    trophicLevel: 2,
    diet: ['algae'],             // 刮食缸壁与叶片上的绿藻
    circadian: 'cathemeral',
    bioluminescent: false,
    baseSpeed: 0.08,             // 移动缓慢
    maxEnergy: 80,
    lifespan: 400,
    reproduceThreshold: 65,
    bodySize: 0.72,
    color: '#c98a5a',
  },
  shrimp: {
    id: 'shrimp',
    name: '米虾',
    emoji: '🦐',
    trophicLevel: 2,
    diet: ['algae', 'noctiluca'], // 夜间出来觅食藻类与浮游生物
    circadian: 'nocturnal',       // 夜行：白天躲在石缝休眠
    bioluminescent: false,
    baseSpeed: 0.55,
    maxEnergy: 70,
    lifespan: 320,
    reproduceThreshold: 58,
    bodySize: 0.66,
    color: '#e8836b',
  },
  minnow: {
    id: 'minnow',
    name: '食蚊鱼',
    emoji: '🐟',
    trophicLevel: 2,
    diet: ['noctiluca', 'algae'], // 小型鱼，滤食浮游生物
    circadian: 'diurnal',         // 昼行：夜晚悬停休眠
    bioluminescent: false,
    baseSpeed: 0.8,
    maxEnergy: 90,
    lifespan: 380,
    reproduceThreshold: 72,
    bodySize: 0.92,
    color: '#9fb6c3',
  },
  // ---------- 次级/顶级消费者 ----------
  medaka: {
    id: 'medaka',
    name: '青鳉鱼',
    emoji: '🐠',
    trophicLevel: 3,
    diet: ['shrimp', 'minnow'],  // 凶猛小型肉食鱼
    circadian: 'diurnal',
    bioluminescent: false,
    baseSpeed: 1.1,
    maxEnergy: 110,
    lifespan: 420,
    reproduceThreshold: 90,
    bodySize: 1.1,
    color: '#f2b84b',
  },
  'diving-beetle': {
    id: 'diving-beetle',
    name: '龙虱',
    emoji: '🪲',
    trophicLevel: 3,
    diet: ['minnow', 'snail', 'medaka'], // 顶级水生捕食者
    circadian: 'nocturnal',       // 夜间捕猎
    bioluminescent: false,
    baseSpeed: 0.95,
    maxEnergy: 120,
    lifespan: 460,
    reproduceThreshold: 95,
    bodySize: 0.98,
    color: '#5a4632',
  },
};

/** 全部物种 id 列表（保持定义顺序） */
export const SPECIES_IDS = Object.keys(SPECIES) as SpeciesId[];

/** 营养级配色（面板与 3D 高亮共用） */
export const TROPHIC_COLORS: Record<TrophicLevel, string> = {
  1: '#3ee6c4', // 生产者：荧光水绿
  2: '#ffb454', // 初级消费者：暖阳橙
  3: '#ff6b6b', // 次级消费者：警示红
};

/** 营养级中文名 */
export const TROPHIC_NAMES: Record<TrophicLevel, string> = {
  1: '生产者',
  2: '初级消费者',
  3: '次级消费者',
};

/**
 * 计算某物种的捕食/被捕食关系详情
 * @param id 目标物种
 * @returns preys 它吃谁；predators 谁吃它
 */
export function getDietDetail(id: SpeciesId): DietDetail {
  const preys = SPECIES[id].diet;
  const predators = SPECIES_IDS.filter((sid) => SPECIES[sid].diet.includes(id));
  return { preys, predators };
}
