import type { PresetScene } from '../types';
import { SceneType } from '../types';

// ============================================================
// 预设生态场景
// ============================================================

export const PRESET_SCENES: PresetScene[] = [
  {
    id: SceneType.FreshwaterLake,
    name: '淡水湖泊',
    description: '清澈的淡水湖泊生态系统，包含完整的水生食物链：藻类、水草→水蚤、田螺→小鱼、青蛙→狗鱼。物种丰富，生态平衡稳定。',
    initialPopulations: {
      duckweed: 6,
      waterweed: 5,
      algae: 8,
      waterFlea: 10,
      snail: 4,
      tadpole: 5,
      smallFish: 4,
      frog: 3,
      pike: 1,
      bacteria: 5
    },
    ambientColor: '#87CEEB',
    groundColor: '#4A6741',
    fogColor: '#B0E0E6',
    pollutionLevel: 0
  },
  {
    id: SceneType.TropicalRainforest,
    name: '热带雨林微缩',
    description: '湿热的热带雨林微缩景观，蕨类和苔藓覆盖地表，蝴蝶和甲虫白天飞舞，壁虎、萤火虫和绿树蟒夜晚活动，昼夜对比鲜明。',
    initialPopulations: {
      tropicalFern: 6,
      moss: 8,
      butterfly: 6,
      fruitBeetle: 5,
      frog: 3,
      gecko: 3,
      firefly: 6,
      treeSnake: 1,
      bacteria: 6
    },
    ambientColor: '#2E7D32',
    groundColor: '#1B3D1B',
    fogColor: '#1B5E20',
    pollutionLevel: 0
  },
  {
    id: SceneType.PollutedWater,
    name: '污染水域',
    description: '受污染的水体，藻类因富营养化大量繁殖，耐污物种（水蛭、鲶鱼、细菌）占主导，敏感物种消失。展示环境污染对生态链的破坏。',
    initialPopulations: {
      algae: 18,
      waterFlea: 5,
      leech: 6,
      catfish: 4,
      bacteria: 12
    },
    ambientColor: '#6B5B4F',
    groundColor: '#3E2723',
    fogColor: '#4E342E',
    pollutionLevel: 0.65
  }
];

export function getPresetById(id: SceneType): PresetScene | undefined {
  return PRESET_SCENES.find(s => s.id === id);
}
