/**
 * 预设生态场景：一键加载不同初始种群与水质参数
 */
import type { PresetScene } from '@/types/ecosystem';

export const PRESETS: PresetScene[] = [
  {
    id: 'freshwater-lake',
    name: '淡水湖泊',
    description: '物种均衡的健康湖泊：水草丰茂，鱼虾成群，适合观察完整食物链。',
    waterQuality: 0.9,
    initialStock: [
      { speciesId: 'elodea', count: 4 },
      { speciesId: 'algae', count: 6 },
      { speciesId: 'noctiluca', count: 5 },
      { speciesId: 'snail', count: 3 },
      { speciesId: 'shrimp', count: 5 },
      { speciesId: 'minnow', count: 4 },
      { speciesId: 'medaka', count: 2 },
    ],
  },
  {
    id: 'rainforest',
    name: '热带雨林微缩',
    description: '高温高湿的雨林水潭：植被茂密、物种丰富，顶级捕食者龙虱潜伏其中。',
    waterQuality: 0.8,
    initialStock: [
      { speciesId: 'elodea', count: 6 },
      { speciesId: 'algae', count: 4 },
      { speciesId: 'noctiluca', count: 4 },
      { speciesId: 'snail', count: 3 },
      { speciesId: 'shrimp', count: 6 },
      { speciesId: 'minnow', count: 4 },
      { speciesId: 'medaka', count: 3 },
      { speciesId: 'diving-beetle', count: 1 },
    ],
  },
  {
    id: 'polluted-water',
    name: '污染水域',
    description: '富营养化污染水体：藻类暴发、水质浑浊，观察生态失衡与物种消亡。',
    waterQuality: 0.35,
    initialStock: [
      { speciesId: 'algae', count: 12 },
      { speciesId: 'noctiluca', count: 2 },
      { speciesId: 'snail', count: 2 },
      { speciesId: 'shrimp', count: 2 },
      { speciesId: 'minnow', count: 3 },
    ],
  },
];
