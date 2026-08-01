/**
 * 生态缸全局状态仓库（zustand）
 * 引擎实例以非响应式方式持有，UI 通过 version 计数器感知数据刷新
 */
import { create } from 'zustand';
import { SimulationEngine } from '@/engine/simulation';
import type { PresetScene, SpeciesId, PlaySpeed } from '@/types/ecosystem';

/** 面板可见性（整洁布局：各面板可独立折叠） */
interface PanelVisibility {
  species: boolean;   // 左侧物种放置面板
  foodWeb: boolean;   // 底部食物链面板
  timeline: boolean;  // 底部时间轴
}

interface EcosystemStore {
  /** 模拟引擎（可变对象，不触发响应式；配合 version 使用） */
  engine: SimulationEngine;
  /** 每次同步递增，驱动依赖实时数据的组件重渲染 */
  version: number;
  playing: boolean;
  speed: PlaySpeed;
  /** 追踪目标个体 id（null = 未追踪） */
  trackedId: string | null;
  /** 食物链面板选中的物种（3D 中高亮该物种全部个体） */
  highlightedSpecies: SpeciesId | null;
  /** 时间轴回看的快照序号（null = 实时模式） */
  reviewIndex: number | null;
  /** 当前场景名（顶部展示） */
  sceneName: string;
  panels: PanelVisibility;

  /** 从引擎同步轻量状态（每帧调用一次） */
  syncFromEngine: () => void;
  setPlaying: (playing: boolean) => void;
  setSpeed: (speed: PlaySpeed) => void;
  setTrackedId: (id: string | null) => void;
  setHighlightedSpecies: (id: SpeciesId | null) => void;
  setReviewIndex: (index: number | null) => void;
  togglePanel: (key: keyof PanelVisibility) => void;
  /** 加载预设场景并重置交互状态 */
  loadPreset: (preset: PresetScene) => void;
  /** 用户放置一个物种个体 */
  addCreature: (speciesId: SpeciesId) => void;
  /** 清空生态缸 */
  resetTank: () => void;
}

export const useEcosystemStore = create<EcosystemStore>((set, get) => ({
  engine: new SimulationEngine(),
  version: 0,
  playing: true,
  speed: 1,
  trackedId: null,
  highlightedSpecies: null,
  reviewIndex: null,
  sceneName: '空白生态缸',
  panels: { species: true, foodWeb: true, timeline: true },

  syncFromEngine: () => set((s) => ({ version: s.version + 1 })),

  setPlaying: (playing) => {
    // 恢复播放时退出回看模式，回到实时画面
    if (playing) set({ reviewIndex: null });
    set({ playing });
  },
  setSpeed: (speed) => set({ speed }),

  setTrackedId: (id) => set({ trackedId: id }),

  setHighlightedSpecies: (id) => set({ highlightedSpecies: id }),

  setReviewIndex: (index) => set({ reviewIndex: index }),

  togglePanel: (key) =>
    set((s) => ({ panels: { ...s.panels, [key]: !s.panels[key] } })),

  loadPreset: (preset) => {
    const { engine } = get();
    engine.loadPreset(preset);
    set({
      sceneName: preset.name,
      trackedId: null,
      highlightedSpecies: null,
      reviewIndex: null,
      playing: true,
    });
    get().syncFromEngine();
  },

  addCreature: (speciesId) => {
    const { engine } = get();
    engine.spawnCreature(speciesId);
    get().syncFromEngine();
  },

  resetTank: () => {
    const { engine } = get();
    engine.clear();
    engine.writeSnapshotPublic();
    set({
      sceneName: '空白生态缸',
      trackedId: null,
      highlightedSpecies: null,
      reviewIndex: null,
    });
    get().syncFromEngine();
  },
}));
