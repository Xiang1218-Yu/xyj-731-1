import { useRef, useMemo } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import type { Organism } from '../../types';
import { SPECIES } from '../../data/species';
import { useEcoStore } from '../../store/ecoStore';

// ============================================================
// 单个生物的3D渲染组件
// 根据物种类型选择不同的几何体和材质
// ============================================================

interface OrganismMeshProps {
  organism: Organism;
}

export default function OrganismMesh({ organism }: OrganismMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  const species = SPECIES[organism.speciesId];
  const trackedOrganismId = useEcoStore(s => s.trackedOrganismId);
  const highlightedSpeciesId = useEcoStore(s => s.highlightedSpeciesId);
  const hoveredSpeciesId = useEcoStore(s => s.hoveredSpeciesId);
  const setTrackedOrganism = useEcoStore(s => s.setTrackedOrganism);
  const setHighlightedSpecies = useEcoStore(s => s.setHighlightedSpecies);
  const isNight = !useEcoStore(s => s.ecoTime.isDaytime);

  const isTracked = trackedOrganismId === organism.id;
  const isHighlighted =
    highlightedSpeciesId === organism.speciesId ||
    hoveredSpeciesId === organism.speciesId;

  // 根据物种移动类型决定基础几何体
  const geometry = useMemo(() => {
    switch (species.movementType) {
      case 'swim':
        // 鱼形：纺锤状
        return <sphereGeometry args={[1, 16, 12]} />;
      case 'fly':
        // 飞虫：小球
        return <sphereGeometry args={[1, 12, 8]} />;
      case 'walk':
        // 爬行动物：扁圆
        return <capsuleGeometry args={[1, 0.5, 8, 12]} />;
      case 'float':
        // 漂浮植物：扁球
        return <sphereGeometry args={[1, 8, 6]} />;
      case 'static':
      default:
        // 静态植物：锥形/圆锥
        return <coneGeometry args={[1, 2, 8]} />;
    }
  }, [species.movementType]);

  // 颜色：夜晚休眠时变暗，发光物种夜晚发光
  const baseColor = useMemo(() => {
    const c = new THREE.Color(species.color);
    if (organism.resting) {
      c.multiplyScalar(0.4);
    }
    return c;
  }, [species.color, organism.resting]);

  // 缩放
  const scale = species.size;

  useFrame((state, delta) => {
    if (!meshRef.current) return;

    // 平滑插值位置
    meshRef.current.position.lerp(
      new THREE.Vector3(...organism.position),
      Math.min(1, delta * 8)
    );

    // 旋转朝向
    if (species.movementType !== 'static') {
      meshRef.current.rotation.y = organism.rotation;
    }

    // 静态植物缓慢摇摆
    if (species.movementType === 'static') {
      meshRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.8 + organism.position[0]) * 0.08;
    }

    // 鱼形生物游动时身体摆动
    if (species.movementType === 'swim') {
      meshRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 6) * 0.15;
    }

    // 飞虫上下浮动
    if (species.movementType === 'fly') {
      meshRef.current.position.y += Math.sin(state.clock.elapsedTime * 3 + organism.id.charCodeAt(0)) * 0.003;
    }

    // 光环动画
    if (glowRef.current) {
      if (isTracked) {
        const pulse = 1 + Math.sin(state.clock.elapsedTime * 4) * 0.1;
        glowRef.current.scale.setScalar(pulse);
        glowRef.current.visible = true;
      } else if (isHighlighted) {
        glowRef.current.scale.setScalar(1.3);
        glowRef.current.visible = true;
      } else {
        glowRef.current.visible = false;
      }
    }
  });

  // 点击进入追踪模式
  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (isTracked) {
      setTrackedOrganism(null);
      setHighlightedSpecies(null);
    } else {
      setTrackedOrganism(organism.id);
      setHighlightedSpecies(organism.speciesId);
    }
  };

  // 发光强度
  const emissiveIntensity = useMemo(() => {
    if (species.glowColor && isNight && !organism.resting) {
      return 0.8;
    }
    return 0;
  }, [species.glowColor, isNight, organism.resting]);

  return (
    <group>
      <mesh
        ref={meshRef}
        position={organism.position}
        scale={[
          scale * (species.movementType === 'swim' ? 1.4 : 1),
          scale * (species.movementType === 'walk' ? 0.6 : 1),
          scale
        ]}
        castShadow
        onClick={handleClick}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'auto';
        }}
      >
        {geometry}
        <meshStandardMaterial
          color={baseColor}
          emissive={species.glowColor ? new THREE.Color(species.glowColor) : new THREE.Color('#000000')}
          emissiveIntensity={emissiveIntensity}
          roughness={species.trophicLevel === 'producer' ? 0.8 : 0.4}
          metalness={species.trophicLevel === 'tertiary' ? 0.3 : 0.1}
        />
      </mesh>

      {/* 追踪/高亮光环 */}
      <mesh ref={glowRef} position={organism.position} visible={false}>
        <ringGeometry args={[scale * 1.8, scale * 2.2, 32]} />
        <meshBasicMaterial
          color={isTracked ? '#00ffff' : '#ffff00'}
          transparent
          opacity={0.6}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* 夜行生物点光源（微弱照亮周围） */}
      {species.glowColor && isNight && !organism.resting && (
        <pointLight
          position={organism.position}
          color={species.glowColor}
          intensity={0.5}
          distance={2}
        />
      )}
    </group>
  );
}
