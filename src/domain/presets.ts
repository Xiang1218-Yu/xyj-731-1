import type { FoodWebEdge, ScenePreset, SpeciesId } from './types';
import { SPECIES_CATALOG, ALL_SPECIES_IDS } from './species';

/**
 * 预设生态场景
 * 说明：每个场景定义了初始投放的物种数量、环境色与污染程度，
 * 用户可一键加载后观察其自然演化。
 */
export const SCENE_PRESETS: ScenePreset[] = [
  {
    id: 'freshwater-lake',
    name: '淡水湖泊',
    description:
      '典型的平衡淡水生态：水草与藻类作为生产者，水蚤、螺为初级消费者，小鱼、大鱼构成完整食物链。',
    ambientColor: '#1e88e5',
    pollution: 0.1,
    initialPopulation: {
      waterweed: 6,
      algae: 20,
      waterflea: 25,
      snail: 6,
      smallfish: 8,
      bigfish: 2,
      bacteria: 4,
    },
  },
  {
    id: 'rainforest-micro',
    name: '热带雨林微缩',
    description:
      '潮湿的雨林微景观：蕨类与藻类供能，毛虫取食植物，树蛙与萤火虫在夜晚活跃，展现昼夜交替的生命节律。',
    ambientColor: '#2e7d32',
    pollution: 0.05,
    initialPopulation: {
      rainforestPlant: 8,
      algae: 12,
      caterpillar: 16,
      frog: 5,
      firefly: 18,
      bacteria: 5,
    },
  },
  {
    id: 'polluted-water',
    name: '污染水域',
    description:
      '富营养化的失衡水体：藻类异常暴发、分解菌群大量繁殖，消费者数量偏低，用于观察污染如何破坏生态平衡。',
    ambientColor: '#6d4c41',
    pollution: 0.75,
    initialPopulation: {
      algae: 45,
      bacteria: 20,
      waterweed: 2,
      waterflea: 8,
      snail: 3,
      smallfish: 2,
    },
  },
];

/** 根据 ID 获取场景 */
export function getScene(id: string): ScenePreset {
  const scene = SCENE_PRESETS.find((s) => s.id === id);
  if (!scene) {
    throw new Error(`未知场景: ${id}`);
  }
  return scene;
}

/**
 * 由物种目录的 preyOf 关系推导完整食物网边集合。
 * 每条边表示：predator 捕食 prey。
 */
export function buildFoodWeb(speciesIds: SpeciesId[]): FoodWebEdge[] {
  const idSet = new Set(speciesIds);
  const edges: FoodWebEdge[] = [];
  for (const id of speciesIds) {
    const species = SPECIES_CATALOG[id];
    if (!species) continue;
    for (const preyId of species.preyOf) {
      // 仅保留场景中确实存在的物种之间的关系
      if (idSet.has(preyId)) {
        edges.push({ predator: id, prey: preyId });
      }
    }
  }
  return edges;
}

/** 获取全量食物网（所有物种） */
export function buildFullFoodWeb(): FoodWebEdge[] {
  return buildFoodWeb(ALL_SPECIES_IDS);
}
