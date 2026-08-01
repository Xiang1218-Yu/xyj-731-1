import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
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
 * - 被追踪的生物显示醒目的双层旋转光环并放大高亮
 * - glowsAtNight 物种夜晚强烈自发光并投射点光源
 * - 其他夜行性物种夜晚以柔和自发光呈现“夜间活跃”状态
 * - 休眠个体降低亮度
 */
export function OrganismMesh({ organism, phase }: OrganismMeshProps): JSX.Element {
  const species = getSpecies(organism.speciesId);
  const trackedId = useStore((s) => s.trackedId);
  const highlightedSpecies = useStore((s) => s.highlightedSpecies);
  const trackOrganism = useStore((s) => s.trackOrganism);

  const isTracked = trackedId === organism.id;
  const isSpeciesHighlighted = highlightedSpecies === organism.speciesId;

  // 夜行性物种夜晚的行为表现
  const isNocturnal = species.chronotype === 'nocturnal';
  const nightActive = isNocturnal && phase === 'night' && !organism.asleep;
  // 强发光物种（萤火虫、树蛙）
  const strongGlow = species.glowsAtNight && phase === 'night' && !organism.asleep;
  // 其他夜行性物种（如螺）夜晚的柔和活跃光
  const softNightGlow = nightActive && !species.glowsAtNight;

  // 自发光强度：强发光 > 追踪 > 物种高亮 > 夜间柔光 > 无
  const emissiveIntensity = strongGlow
    ? 1.8
    : isTracked
      ? 1.2
      : isSpeciesHighlighted
        ? 0.8
        : softNightGlow
          ? 0.5
          : 0;

  // 休眠个体略微变暗
  const opacity = organism.asleep ? 0.5 : 1;

  const emissiveColor = useMemo(
    () =>
      new THREE.Color(
        strongGlow || softNightGlow ? species.color : isTracked ? '#ffd54f' : '#ffffff',
      ),
    [strongGlow, softNightGlow, isTracked, species.color],
  );

  // 追踪光环旋转动画
  const haloRef = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (haloRef.current) {
      haloRef.current.rotation.y += delta * 1.5;
      haloRef.current.rotation.z += delta * 0.8;
    }
  });

  // 记录本个体是否正处于悬停状态，用于在卸载时正确复位指针，
  // 避免生物在被悬停时死亡/卸载导致 onPointerOut 不触发、光标卡在 pointer。
  const hoveringRef = useRef(false);
  const setHovering = (hovering: boolean): void => {
    hoveringRef.current = hovering;
    document.body.style.cursor = hovering ? 'pointer' : 'auto';
  };

  // 卸载清理：若卸载时仍处于悬停，则复位光标，杜绝指针泄漏。
  useEffect(() => {
    return () => {
      if (hoveringRef.current) {
        document.body.style.cursor = 'auto';
      }
    };
  }, []);

  const pos: [number, number, number] = [
    organism.position.x,
    organism.position.y,
    organism.position.z,
  ];

  // 被追踪时整体放大，更易辨认
  const bodyScale = isTracked ? 1.25 : 1;

  return (
    <group position={pos}>
      {/* 不可见的放大点击热区，提升小型生物的可选中性 */}
      <mesh
        onClick={(e) => {
          e.stopPropagation();
          trackOrganism(organism.id);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovering(true);
        }}
        onPointerOut={() => {
          setHovering(false);
        }}
      >
        <sphereGeometry args={[Math.max(species.size * 1.8, 0.6), 12, 12]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* 主体（放大便于观察被追踪个体） */}
      <mesh
        scale={bodyScale}
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

      {/* 追踪高亮：双层旋转光环 + 半透明光晕球 */}
      {isTracked && (
        <>
          <group ref={haloRef}>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[species.size + 0.6, 0.09, 12, 48]} />
              <meshStandardMaterial
                color="#ffd54f"
                emissive="#ffd54f"
                emissiveIntensity={2.5}
              />
            </mesh>
            <mesh rotation={[0, 0, Math.PI / 2]}>
              <torusGeometry args={[species.size + 0.6, 0.06, 12, 48]} />
              <meshStandardMaterial
                color="#ffe082"
                emissive="#ffe082"
                emissiveIntensity={2}
              />
            </mesh>
          </group>
          {/* 柔和光晕 */}
          <mesh>
            <sphereGeometry args={[species.size + 0.9, 20, 20]} />
            <meshBasicMaterial
              color="#ffd54f"
              transparent
              opacity={0.12}
              depthWrite={false}
            />
          </mesh>
        </>
      )}

      {/* 强发光物种在夜晚附加点光源，照亮周围水体 */}
      {strongGlow && <pointLight color={species.color} intensity={1.4} distance={3.2} />}
    </group>
  );
}
