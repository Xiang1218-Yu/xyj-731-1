import { useMemo } from 'react';
import * as THREE from 'three';
import type { Organism } from '../domain/types';
import { getSpecies } from '../domain/species';
import type { DayPhase } from '../domain/types';
import { useStore } from '../state/store';

interface OrganismMeshProps {
  organism: Organism;
  /** 当前昼夜阶段，用于夜晚发光效果 */
  phase: DayPhase;
}

/**
 * 单个生物的渲染体。
 * - 生产者渲染为暗绿色簇团，其余为球体
 * - 被追踪的生物显示环绕光环
 * - 夜行发光物种在夜晚发出自发光
 * - 休眠个体降低亮度并显示 "z" 提示（通过缩放脉冲省略，改用透明度）
 */
export function OrganismMesh({ organism, phase }: OrganismMeshProps): JSX.Element {
  const species = getSpecies(organism.speciesId);
  const trackedId = useStore((s) => s.trackedId);
  const highlightedSpecies = useStore((s) => s.highlightedSpecies);
  const trackOrganism = useStore((s) => s.trackOrganism);

  const isTracked = trackedId === organism.id;
  const isSpeciesHighlighted = highlightedSpecies === organism.speciesId;

  // 夜晚发光：夜行发光物种在夜晚点亮
  const glowing = species.glowsAtNight && phase === 'night' && !organism.asleep;

  // 自发光强度
  const emissiveIntensity = glowing ? 1.6 : isSpeciesHighlighted ? 0.6 : 0;

  // 休眠个体略微变暗
  const opacity = organism.asleep ? 0.55 : 1;

  const emissiveColor = useMemo(
    () => new THREE.Color(glowing ? species.color : '#ffffff'),
    [glowing, species.color],
  );

  const pos: [number, number, number] = [
    organism.position.x,
    organism.position.y,
    organism.position.z,
  ];

  return (
    <group position={pos}>
      {/* 主体 */}
      <mesh
        onClick={(e) => {
          e.stopPropagation();
          trackOrganism(organism.id);
        }}
      >
        <sphereGeometry args={[species.size, 16, 16]} />
        <meshStandardMaterial
          color={species.color}
          emissive={emissiveColor}
          emissiveIntensity={emissiveIntensity}
          transparent
          opacity={opacity}
          roughness={0.5}
        />
      </mesh>

      {/* 追踪光环：围绕生物的发光圆环 */}
      {isTracked && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[species.size + 0.5, 0.08, 12, 40]} />
          <meshStandardMaterial
            color="#ffd54f"
            emissive="#ffd54f"
            emissiveIntensity={2}
          />
        </mesh>
      )}

      {/* 发光物种在夜晚附加一个柔和点光源，照亮周围水体 */}
      {glowing && <pointLight color={species.color} intensity={1.2} distance={3} />}
    </group>
  );
}
