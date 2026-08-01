// 食物网节点的分层布局：按营养级从高到低排列，同级横向均分
import { SPECIES_LIST } from './species';
import type { FoodWebNode, TrophicLevel } from './types';

/** 营养级从上到下（顶级捕食者在顶部）的排列顺序 */
const LEVEL_ORDER: TrophicLevel[] = ['apex', 'secondary', 'primary', 'decomposer', 'producer'];

/** SVG 画布尺寸 */
export const FOOD_WEB_WIDTH = 340;
export const FOOD_WEB_HEIGHT = 460;

interface Positioned {
  speciesId: string;
  trophic: TrophicLevel;
  x: number;
  y: number;
}

function layoutNodes(): Positioned[] {
  const nodes: Positioned[] = [];
  const rowHeight = FOOD_WEB_HEIGHT / (LEVEL_ORDER.length + 1);

  LEVEL_ORDER.forEach((level, rowIdx) => {
    const inLevel = SPECIES_LIST.filter((s) => s.trophic === level);
    const y = rowHeight * (rowIdx + 1);
    const slot = FOOD_WEB_WIDTH / (inLevel.length + 1);
    inLevel.forEach((sp, i) => {
      nodes.push({
        speciesId: sp.id,
        trophic: level,
        x: slot * (i + 1),
        y,
      });
    });
  });
  return nodes;
}

const positioned = layoutNodes();

export const FOOD_WEB_NODES: FoodWebNode[] = positioned.map((p) => ({
  speciesId: p.speciesId,
  x: p.x,
  y: p.y,
}));

const NODE_MAP = new Map(positioned.map((p) => [p.speciesId, p]));

export function getNodePosition(speciesId: string): FoodWebNode | undefined {
  return NODE_MAP.get(speciesId);
}

/** 食物网中的有向边：从猎物指向捕食者（能量流动方向） */
export interface FoodWebEdge {
  from: string;
  to: string;
}

export const FOOD_WEB_EDGES: FoodWebEdge[] = SPECIES_LIST.flatMap((predator) =>
  predator.prey.map((preyId) => ({ from: preyId, to: predator.id })),
);
