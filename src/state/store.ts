import { create } from 'zustand';
import type {
  EcosystemSnapshot,
  Organism,
  PredationEvent,
  SpeciesId,
} from '../domain/types';
import { SCENE_PRESETS, getScene } from '../domain/presets';
import {
  MAX_SNAPSHOTS,
  SNAPSHOT_INTERVAL,
} from '../domain/constants';
import {
  createOrganism,
  createStateFromScene,
  makeSnapshot,
  step,
  type EcosystemState,
} from '../simulation/engine';

/** 捕食事件日志最大保留条数 */
const MAX_EVENTS = 200;

/**
 * 全局应用状态（Zustand）。
 * 同时管理：实时模拟状态、历史快照、播放/回看时间轴、选中与追踪。
 */
interface AppState {
  /** 当前实时模拟状态 */
  sim: EcosystemState;
  /** 当前加载的场景 ID */
  sceneId: string;
  /** 模拟是否运行中（false = 暂停） */
  running: boolean;
  /** 模拟速度倍率 */
  speed: number;

  /** 历史快照序列 */
  history: EcosystemSnapshot[];
  /** 自上次采样以来累计的时间 */
  sinceLastSnapshot: number;
  /** 捕食事件日志（最新的在数组末尾） */
  events: PredationEvent[];
  /**
   * 回看索引：null 表示跟随实时；否则指向 history 中的某一帧。
   * 处于回看模式时不推进模拟。
   */
  reviewIndex: number | null;

  /** 当前选中/追踪的生物 ID（null 表示未选中） */
  trackedId: string | null;
  /** 食物网中被高亮的物种（点击节点） */
  highlightedSpecies: SpeciesId | null;

  // ---- actions ----
  /** 推进模拟（由渲染循环调用），dt 为秒 */
  advance: (dt: number) => void;
  /** 加载指定预设场景 */
  loadScene: (sceneId: string) => void;
  /** 在随机位置投放一个指定物种个体 */
  addOrganism: (speciesId: SpeciesId) => void;
  /** 设置运行/暂停 */
  setRunning: (running: boolean) => void;
  /** 设置速度倍率 */
  setSpeed: (speed: number) => void;
  /** 选中并追踪某个生物 */
  trackOrganism: (id: string | null) => void;
  /** 高亮食物网物种 */
  setHighlightedSpecies: (id: SpeciesId | null) => void;
  /** 进入/更新回看某一帧（同时会暂停模拟） */
  reviewAt: (index: number | null) => void;
  /** 退出回看，回到实时 */
  resumeLive: () => void;
}

const INITIAL_SCENE = SCENE_PRESETS[0];

export const useStore = create<AppState>((set, get) => ({
  sim: createStateFromScene(INITIAL_SCENE),
  sceneId: INITIAL_SCENE.id,
  running: true,
  speed: 1,
  history: [],
  sinceLastSnapshot: 0,
  events: [],
  reviewIndex: null,
  trackedId: null,
  highlightedSpecies: null,

  advance: (dt: number) => {
    const state = get();
    // 回看模式或暂停时不推进模拟
    if (!state.running || state.reviewIndex !== null) return;

    const scaledDt = dt * state.speed;
    const { state: nextSim, events: newEvents } = step(state.sim, scaledDt);

    // 快照采样
    let sinceLast = state.sinceLastSnapshot + scaledDt;
    let history = state.history;
    if (sinceLast >= SNAPSHOT_INTERVAL) {
      sinceLast = 0;
      const snapshot = makeSnapshot(nextSim);
      history = state.history.concat(snapshot);
      // 限制历史长度，滚动丢弃最旧的
      if (history.length > MAX_SNAPSHOTS) {
        history = history.slice(history.length - MAX_SNAPSHOTS);
      }
    }

    // 追加捕食事件日志（滚动保留最近若干条）
    let events = state.events;
    if (newEvents.length > 0) {
      events = state.events.concat(newEvents);
      if (events.length > MAX_EVENTS) {
        events = events.slice(events.length - MAX_EVENTS);
      }
    }

    // 若被追踪个体已死亡/消失，则自动结束追踪
    let trackedId = state.trackedId;
    if (trackedId !== null) {
      const stillAlive = nextSim.organisms.some(
        (o) => o.id === trackedId && o.alive,
      );
      if (!stillAlive) trackedId = null;
    }

    set({ sim: nextSim, sinceLastSnapshot: sinceLast, history, events, trackedId });
  },

  loadScene: (sceneId: string) => {
    const scene = getScene(sceneId);
    set({
      sim: createStateFromScene(scene),
      sceneId,
      history: [],
      sinceLastSnapshot: 0,
      events: [],
      reviewIndex: null,
      trackedId: null,
      highlightedSpecies: null,
      running: true,
    });
  },

  addOrganism: (speciesId: SpeciesId) => {
    const state = get();
    const organism: Organism = createOrganism(speciesId);
    set({
      sim: {
        ...state.sim,
        organisms: state.sim.organisms.concat(organism),
      },
    });
  },

  setRunning: (running: boolean) => set({ running }),

  setSpeed: (speed: number) => set({ speed }),

  trackOrganism: (id: string | null) => set({ trackedId: id }),

  setHighlightedSpecies: (id: SpeciesId | null) =>
    set({ highlightedSpecies: id }),

  reviewAt: (index: number | null) => {
    if (index === null) {
      set({ reviewIndex: null });
      return;
    }
    // 将索引夹紧到当前历史的有效范围，避免历史滚动裁剪后越界，
    // 造成回看崩溃或显示错误数据。历史为空时直接忽略。
    const { history } = get();
    if (history.length === 0) {
      set({ reviewIndex: null });
      return;
    }
    const clamped = Math.max(0, Math.min(index, history.length - 1));
    // 进入回看即暂停模拟
    set({ reviewIndex: clamped, running: false });
  },

  resumeLive: () => set({ reviewIndex: null, running: true }),
}));

// 开发环境下将 store 暴露到 window，便于调试与自动化测试（生产构建不包含）
if (import.meta.env.DEV) {
  (window as unknown as { __ecoStore?: typeof useStore }).__ecoStore = useStore;
}

/**
 * 选择器：返回当前应展示的生物列表。
 * 回看模式下返回历史帧，否则返回实时状态。
 */
export function useDisplayedOrganisms(): Organism[] {
  return useStore((s) => {
    if (s.reviewIndex !== null && s.history[s.reviewIndex]) {
      return s.history[s.reviewIndex].organisms;
    }
    return s.sim.organisms;
  });
}
