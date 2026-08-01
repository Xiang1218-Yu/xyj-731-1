// 三个预设生态场景的初始种群与环境配置
import type { PresetScene } from './types';

export const PRESETS: PresetScene[] = [
  {
    id: 'freshwater',
    name: '淡水湖泊',
    description: '清澈宁静的淡水湖泊，物种层次完整，是观察食物链的经典场景。',
    gradient: ['#5fb3b3', '#1f6f78'],
    waterTint: '#3a8f95',
    fogTint: '#2a6f76',
    pollution: 0,
    populations: {
      phytoplankton: 22,
      watergrass: 8,
      zooplankton: 12,
      minnow: 10,
      snail: 6,
      carp: 3,
      dragonfly: 3,
      snakehead: 1,
      waterbird: 1,
    },
  },
  {
    id: 'rainforest',
    name: '热带雨林微缩',
    description: '湿热繁茂的雨林水洼，物种最丰富，夜晚有萤火虫发光。',
    gradient: ['#7bc47f', '#1e5631'],
    waterTint: '#2f7d4f',
    fogTint: '#1f5a38',
    pollution: 0.05,
    populations: {
      phytoplankton: 18,
      watergrass: 14,
      zooplankton: 10,
      minnow: 10,
      snail: 8,
      firefly: 8,
      carp: 3,
      dragonfly: 4,
      snakehead: 1,
      waterbird: 2,
    },
  },
  {
    id: 'polluted',
    name: '污染水域',
    description: '受污染的浑浊水域，耐污物种泛滥，清水物种难以生存，观察环境压力。',
    gradient: ['#8a7a4a', '#3a3a2a'],
    waterTint: '#5a4a2a',
    fogTint: '#2e2a1c',
    pollution: 0.7,
    populations: {
      phytoplankton: 28,
      watergrass: 2,
      zooplankton: 6,
      larva: 16,
      leech: 8,
      snail: 5,
      minnow: 4,
      carp: 1,
    },
  },
];

export const DEFAULT_PRESET_ID = 'freshwater';

export function getPreset(id: string): PresetScene {
  const found = PRESETS.find((p) => p.id === id);
  if (!found) {
    throw new Error(`未知预设场景: ${id}`);
  }
  return found;
}
