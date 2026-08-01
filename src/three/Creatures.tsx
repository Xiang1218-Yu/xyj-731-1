/**
 * 生物列表管理器
 * useFrame 中对比结构签名（id+物种+发光态），仅在出生/死亡/发光变化时重建列表，
 * 常规移动由 CreatureMesh 内部命令式完成，避免每帧重渲染
 */
import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Creature } from '@/types/ecosystem';
import { useEcosystemStore } from '@/store/ecosystemStore';
import { CreatureMesh } from './CreatureMesh';

export function Creatures() {
  const trackedId = useEcosystemStore((s) => s.trackedId);
  const highlightedSpecies = useEcosystemStore((s) => s.highlightedSpecies);
  const reviewIndex = useEcosystemStore((s) => s.reviewIndex);
  const setTrackedId = useEcosystemStore((s) => s.setTrackedId);
  // 当前渲染的生物列表（实时=引擎活体，回看=历史快照拷贝）
  const [list, setList] = useState<Creature[]>([]);
  const signatureRef = useRef('');

  useFrame(() => {
    const { engine, reviewIndex } = useEcosystemStore.getState();
    // 回看模式读取快照，实时模式读取引擎
    const source =
      reviewIndex !== null
        ? engine.history.at(reviewIndex)?.creatures ?? []
        : engine.creatures;
    // 结构签名：只有个体集合或发光状态变化才触发 React 重建
    const signature = source
      .map((c) => `${c.id}:${c.speciesId}:${c.glowing ? 1 : 0}:${c.status}`)
      .join('|');
    if (signature !== signatureRef.current) {
      signatureRef.current = signature;
      setList([...source]);
    }
  });

  return (
    <group>
      {list.map((c) => (
        <CreatureMesh
          key={c.id}
          creature={c}
          highlight={
            c.id === trackedId ? 'tracked' : c.speciesId === highlightedSpecies ? 'species' : 'none'
          }
          onSelect={() => {
            // 回看模式下禁止进入追踪：历史快照中的个体不可交互
            if (reviewIndex === null) setTrackedId(c.id);
          }}
        />
      ))}
    </group>
  );
}
