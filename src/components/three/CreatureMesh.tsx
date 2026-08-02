// 单个生物的程序化低多边形网格：根据 shape 组合几何体，带尾部摆动与发光
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { SpeciesDef } from '@/simulation/types';
import { SPECIES } from '@/simulation/species';

interface CreatureMeshProps {
  species: SpeciesDef;
  position: [number, number, number];
  heading: number;
  scale: number;
  seed: number;
  phase: number;
  energy: number;
  resting: boolean;
  isNight: boolean;
  highlighted: boolean;
  selected: boolean;
  onClick: () => void;
}

export function CreatureMesh({
  species,
  position,
  heading,
  scale,
  seed,
  phase,
  resting,
  isNight,
  highlighted,
  selected,
  onClick,
}: CreatureMeshProps) {
  const groupRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Group>(null);

  const glow = Boolean(species.nocturnalGlow && isNight);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    // 平滑位置插值
    groupRef.current.position.lerp(
      new THREE.Vector3(position[0], position[1], position[2]),
      0.3,
    );
    // 平滑朝向
    const targetRot = heading;
    groupRef.current.rotation.y = THREE.MathUtils.lerp(
      groupRef.current.rotation.y,
      targetRot,
      0.2,
    );
    if (bodyRef.current) {
      // 尾部/身体摆动，休眠时幅度减小
      const amp = resting ? 0.05 : 0.18;
      bodyRef.current.rotation.y = Math.sin(t * 6 + phase + seed) * amp;
      if (species.shape === 'fish' || species.shape === 'leech' || species.shape === 'worm') {
        bodyRef.current.rotation.z = Math.sin(t * 4 + seed) * amp * 0.4;
      }
    }
  });

  return (
    <group ref={groupRef} scale={scale}>
      <group
        ref={bodyRef}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'auto';
        }}
      >
        <ShapeBody
          shape={species.shape}
          color={highlighted ? '#fff3b0' : glow ? '#f6e88a' : species.color}
          glow={glow}
          dim={resting}
        />
      </group>

      {/* 发光生物的点光源 */}
      {glow && (
        <pointLight color="#bff0d0" intensity={1.2} distance={3} decay={2} />
      )}

      {/* 选中 / 高亮光环 */}
      {(selected || highlighted) && (
        <SelectionRing color={selected ? '#6ee7d6' : '#ffd166'} pulse={selected} />
      )}
    </group>
  );
}

function ShapeBody({
  shape,
  color,
  glow,
  dim,
}: {
  shape: SpeciesDef['shape'];
  color: string;
  glow: boolean;
  dim: boolean;
}) {
  const emissive = glow ? '#f6e88a' : '#000000';
  const emissiveIntensity = glow ? 1.2 : 0;
  const mat = (
    <meshStandardMaterial
      color={dim ? new THREE.Color(color).multiplyScalar(0.55) : color}
      emissive={emissive}
      emissiveIntensity={emissiveIntensity}
      roughness={0.45}
      metalness={0.1}
    />
  );

  switch (shape) {
    case 'fish':
      return (
        <group>
          {/* 身体 */}
          <mesh castShadow scale={[1, 0.6, 0.45]}>
            <sphereGeometry args={[0.7, 12, 10]} />
            {mat}
          </mesh>
          {/* 尾巴 */}
          <mesh position={[-0.6, 0, 0]} rotation={[0, 0, Math.PI / 4]}>
            <coneGeometry args={[0.32, 0.55, 4]} />
            {mat}
          </mesh>
          {/* 眼睛 */}
          <mesh position={[0.45, 0.12, 0.22]}>
            <sphereGeometry args={[0.09, 6, 6]} />
            <meshStandardMaterial color="#0a0a0a" />
          </mesh>
        </group>
      );
    case 'plankton':
      return (
        <group>
          <mesh>
            <sphereGeometry args={[0.45, 8, 8]} />
            {mat}
          </mesh>
          {/* 小触须 */}
          <mesh position={[0, 0.4, 0]}>
            <cylinderGeometry args={[0.02, 0.01, 0.4, 4]} />
            {mat}
          </mesh>
        </group>
      );
    case 'plant':
      return (
        <group position={[0, 0.6, 0]}>
          <mesh>
            <coneGeometry args={[0.2, 1.4, 6]} />
            {mat}
          </mesh>
        </group>
      );
    case 'snail':
      return (
        <group>
          {/* 壳 */}
          <mesh position={[0, 0.25, 0]} scale={[0.7, 0.7, 0.7]}>
            <sphereGeometry args={[0.5, 10, 8]} />
            <meshStandardMaterial color={color} roughness={0.6} />
          </mesh>
          {/* 身体 */}
          <mesh position={[0.25, 0.05, 0]} scale={[0.8, 0.3, 0.5]}>
            <sphereGeometry args={[0.5, 8, 6]} />
            <meshStandardMaterial color="#c9b48a" roughness={0.8} />
          </mesh>
        </group>
      );
    case 'insect':
      return (
        <group>
          <mesh scale={[0.7, 0.4, 0.4]}>
            <sphereGeometry args={[0.4, 8, 6]} />
            {mat}
          </mesh>
          {/* 翅膀 */}
          <mesh position={[0, 0.2, 0]} rotation={[0.3, 0, 0]}>
            <boxGeometry args={[0.1, 0.04, 0.7]} />
            <meshStandardMaterial color="#ffffff" transparent opacity={0.4} />
          </mesh>
          <mesh position={[0, 0.2, 0]} rotation={[-0.3, 0, 0]}>
            <boxGeometry args={[0.1, 0.04, 0.7]} />
            <meshStandardMaterial color="#ffffff" transparent opacity={0.4} />
          </mesh>
        </group>
      );
    case 'bird':
      return (
        <group>
          <mesh scale={[0.7, 0.5, 0.5]}>
            <sphereGeometry args={[0.5, 10, 8]} />
            {mat}
          </mesh>
          {/* 喙 */}
          <mesh position={[0.45, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
            <coneGeometry args={[0.1, 0.3, 4]} />
            <meshStandardMaterial color="#e8a04a" />
          </mesh>
          {/* 翅膀 */}
          <mesh position={[0, 0.1, 0.5]} rotation={[0.2, 0, 0]}>
            <boxGeometry args={[0.9, 0.06, 0.4]} />
            {mat}
          </mesh>
          <mesh position={[0, 0.1, -0.5]} rotation={[-0.2, 0, 0]}>
            <boxGeometry args={[0.9, 0.06, 0.4]} />
            {mat}
          </mesh>
        </group>
      );
    case 'worm':
      return (
        <group>
          {[0, 1, 2].map((i) => (
            <mesh key={i} position={[0, 0, (i - 1) * 0.25]} scale={[0.6 - i * 0.1, 0.6 - i * 0.1, 0.6 - i * 0.1]}>
              <sphereGeometry args={[0.3, 8, 6]} />
              {mat}
            </mesh>
          ))}
        </group>
      );
    case 'leech':
      return (
        <group>
          <mesh scale={[1.4, 0.35, 0.35]}>
            <capsuleGeometry args={[0.3, 0.8, 4, 8]} />
            {mat}
          </mesh>
        </group>
      );
  }
}

/** 选中 / 高亮时的地面光环 */
function SelectionRing({ color, pulse }: { color: string; pulse: boolean }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    if (pulse) {
      const s = 1 + Math.sin(t * 3) * 0.12;
      ref.current.scale.set(s, s, s);
    }
  });
  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
      <ringGeometry args={[0.7, 0.95, 24]} />
      <meshBasicMaterial color={color} transparent opacity={0.85} side={THREE.DoubleSide} />
    </mesh>
  );
}

/** 工具：按 speciesId 取物种定义（供外部组件便捷使用） */
export function getSpecies(speciesId: string): SpeciesDef {
  const def = SPECIES[speciesId];
  if (!def) throw new Error(`未知物种: ${speciesId}`);
  return def;
}
