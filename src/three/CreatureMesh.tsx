/**
 * 单个生物的 3D 表现
 * 全部使用程序化几何体（无外部模型），按物种拼装不同造型
 * 位置/朝向在 useFrame 中命令式写入，避免每帧触发 React 重渲染
 */
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Creature } from '@/types/ecosystem';
import { SPECIES } from '@/data/species';

interface CreatureMeshProps {
  /** 引擎/快照中的生物对象（可变引用，逐帧读取最新数值） */
  creature: Creature;
  /** 高亮类型：追踪光环 / 物种高亮环 / 无 */
  highlight: 'tracked' | 'species' | 'none';
  /** 点击选中该个体（进入追踪模式） */
  onSelect: () => void;
}

/** 按物种返回对应的程序化几何体组合 */
function SpeciesBody({ creature }: { creature: Creature }) {
  const def = SPECIES[creature.speciesId];
  const glowing = creature.glowing;
  // 发光材质：夜晚发光时启用强自发光，供 Bloom 后处理拾取
  const emissiveColor = glowing ? def.color : '#000000';
  const emissiveIntensity = glowing ? 2.4 : 0;

  switch (creature.speciesId) {
    case 'elodea':
      // 水草：三根错落的锥形茎叶
      return (
        <group>
          {[-0.25, 0, 0.25].map((offset, i) => (
            <mesh key={i} position={[offset, 0.9 + i * 0.15, 0]} rotation={[0, 0, offset * 0.4]}>
              <coneGeometry args={[0.09, 1.8 + i * 0.3, 5]} />
              <meshStandardMaterial color={def.color} emissive={emissiveColor} emissiveIntensity={emissiveIntensity} />
            </mesh>
          ))}
        </group>
      );
    case 'algae':
      // 绿藻：不规则小球团
      return (
        <group>
          <mesh>
            <icosahedronGeometry args={[0.22, 0]} />
            <meshStandardMaterial color={def.color} roughness={0.9} emissive={emissiveColor} emissiveIntensity={emissiveIntensity} />
          </mesh>
          <mesh position={[0.15, 0.12, 0.08]}>
            <icosahedronGeometry args={[0.14, 0]} />
            <meshStandardMaterial color={def.color} roughness={0.9} emissive={emissiveColor} emissiveIntensity={emissiveIntensity} />
          </mesh>
        </group>
      );
    case 'noctiluca':
      // 夜光藻：微小半透明球体，夜晚发出强荧光
      return (
        <mesh>
          <sphereGeometry args={[0.12, 12, 12]} />
          <meshStandardMaterial
            color={def.color}
            transparent
            opacity={0.85}
            emissive={def.color}
            emissiveIntensity={glowing ? 3.5 : 0.15}
          />
        </mesh>
      );
    case 'snail':
      // 苹果螺：扁平身体 + 螺旋壳
      return (
        <group>
          <mesh scale={[1, 0.5, 0.8]}>
            <sphereGeometry args={[0.28, 12, 12]} />
            <meshStandardMaterial color="#8a6a4a" emissive={emissiveColor} emissiveIntensity={emissiveIntensity} />
          </mesh>
          <mesh position={[0, 0.18, 0]}>
            <torusGeometry args={[0.16, 0.1, 8, 16]} />
            <meshStandardMaterial color={def.color} emissive={emissiveColor} emissiveIntensity={emissiveIntensity} />
          </mesh>
        </group>
      );
    case 'shrimp':
      // 米虾：弯曲身体 + 尾扇
      return (
        <group>
          <mesh rotation={[0, 0, Math.PI / 2.4]} scale={[1, 0.45, 0.45]}>
            <capsuleGeometry args={[0.16, 0.4, 4, 8]} />
            <meshStandardMaterial color={def.color} transparent opacity={0.9} emissive={emissiveColor} emissiveIntensity={emissiveIntensity} />
          </mesh>
          <mesh position={[-0.32, 0.12, 0]} rotation={[0, 0, -0.6]}>
            <coneGeometry args={[0.12, 0.25, 6]} />
            <meshStandardMaterial color={def.color} transparent opacity={0.9} emissive={emissiveColor} emissiveIntensity={emissiveIntensity} />
          </mesh>
        </group>
      );
    case 'minnow':
    case 'medaka':
      // 鱼类：纺锤身体 + 三角尾鳍 + 眼睛
      return (
        <group>
          <mesh scale={[1.6, 0.55, 0.4]}>
            <sphereGeometry args={[0.3, 14, 14]} />
            <meshStandardMaterial color={def.color} emissive={emissiveColor} emissiveIntensity={emissiveIntensity} />
          </mesh>
          <mesh position={[-0.55, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <coneGeometry args={[0.18, 0.35, 4]} />
            <meshStandardMaterial color={def.color} emissive={emissiveColor} emissiveIntensity={emissiveIntensity} />
          </mesh>
          <mesh position={[0.3, 0.08, 0.12]}>
            <sphereGeometry args={[0.045, 8, 8]} />
            <meshStandardMaterial color="#111111" />
          </mesh>
          <mesh position={[0.3, 0.08, -0.12]}>
            <sphereGeometry args={[0.045, 8, 8]} />
            <meshStandardMaterial color="#111111" />
          </mesh>
        </group>
      );
    case 'diving-beetle':
      // 龙虱：深色椭圆甲壳 + 鞘翅中缝
      return (
        <group>
          <mesh scale={[1.3, 0.55, 0.85]}>
            <sphereGeometry args={[0.32, 14, 14]} />
            <meshStandardMaterial color={def.color} roughness={0.35} metalness={0.4} emissive={emissiveColor} emissiveIntensity={emissiveIntensity} />
          </mesh>
          <mesh position={[0, 0.1, 0]} scale={[1.2, 0.35, 0.05]}>
            <boxGeometry args={[0.3, 0.3, 0.3]} />
            <meshStandardMaterial color="#3a2d1f" roughness={0.4} metalness={0.3} />
          </mesh>
        </group>
      );
  }
}

export function CreatureMesh({ creature, highlight, onSelect }: CreatureMeshProps) {
  const outerRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const def = SPECIES[creature.speciesId];
  // 每只生物动画相位错开，避免整齐划一
  const animSeed = useMemo(() => Math.random() * Math.PI * 2, []);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime + animSeed;
    // 命令式写入最新位置（引擎每 tick 更新 creature.position）
    if (outerRef.current) {
      outerRef.current.position.set(
        creature.position[0],
        creature.position[1],
        creature.position[2]
      );
      // 朝向：朝速度方向偏转（静止时保持原朝向）
      const [vx, , vz] = creature.velocity;
      if (Math.abs(vx) + Math.abs(vz) > 0.01) {
        outerRef.current.rotation.y = Math.atan2(vx, vz) - Math.PI / 2;
      }
      // 尸体倾倒，直观表现死亡
      outerRef.current.rotation.z = creature.status === 'dead' ? Math.PI * 0.45 : 0;
    }
    // 游动时的轻微起伏与摇摆（休眠个体几乎静止，体现"游动减速"）
    if (bodyRef.current) {
      const amp = creature.status === 'sleeping' ? 0.02 : 0.06;
      bodyRef.current.position.y = Math.sin(t * 2.2) * amp;
      bodyRef.current.rotation.z = Math.sin(t * 1.6) * amp;
    }
    // 光环呼吸动画
    if (ringRef.current) {
      const scale = 1 + Math.sin(t * 3) * 0.12;
      ringRef.current.scale.setScalar(scale);
      (ringRef.current.material as THREE.MeshBasicMaterial).opacity =
        0.55 + Math.sin(t * 3) * 0.25;
    }
  });

  return (
    <group ref={outerRef}>
      <group ref={bodyRef} scale={def.bodySize}>
        {/* 隐形命中球：放大点选区域，方便中小学生点击 */}
        <mesh
          visible={false}
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
        >
          <sphereGeometry args={[1.0, 8, 8]} />
        </mesh>
        <SpeciesBody creature={creature} />
      </group>
      {/* 高亮光环：追踪金色 / 物种高亮青色 */}
      {highlight !== 'none' && (
        <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.4, 0]}>
          <ringGeometry args={[0.55, 0.75, 32]} />
          <meshBasicMaterial
            color={highlight === 'tracked' ? '#ffd166' : '#3ee6c4'}
            transparent
            opacity={0.7}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      )}
    </group>
  );
}
