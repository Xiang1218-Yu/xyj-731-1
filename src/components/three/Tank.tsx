// 生态缸缸体、玻璃、水体、沙地与装饰物
import { useMemo } from 'react';
import * as THREE from 'three';
import { SIM } from '@/simulation/types';

const W = SIM.TANK.width;
const H = SIM.TANK.height;
const D = SIM.TANK.depth;
const WATER_Y = SIM.WATER_LEVEL;

interface TankProps {
  waterTint: string;
  fogTint: string;
  pollution: number;
}

export function Tank({ waterTint, fogTint, pollution }: TankProps) {
  // 水体与雾颜色随环境变化
  const waterColor = useMemo(() => new THREE.Color(waterTint), [waterTint]);
  const fogColor = useMemo(() => new THREE.Color(fogTint), [fogTint]);

  return (
    <group>
      {/* 缸底沙地 */}
      <mesh position={[0, -0.1, 0]} receiveShadow>
        <boxGeometry args={[W, 0.4, D]} />
        <meshStandardMaterial color={pollution > 0.4 ? '#4a4028' : '#d9c79a'} roughness={0.95} />
      </mesh>

      {/* 水本体（半透明体积块） */}
      <mesh position={[0, WATER_Y / 2, 0]}>
        <boxGeometry args={[W - 0.2, WATER_Y - 0.2, D - 0.2]} />
        <meshStandardMaterial
          color={waterColor}
          transparent
          opacity={0.22}
          roughness={0.15}
          metalness={0}
          depthWrite={false}
        />
      </mesh>

      {/* 水面（带轻微波动的平面） */}
      <mesh position={[0, WATER_Y, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[W - 0.2, D - 0.2, 24, 16]} />
        <meshStandardMaterial
          color={waterColor}
          transparent
          opacity={0.35}
          roughness={0.1}
          metalness={0.3}
        />
      </mesh>

      {/* 玻璃壁：用线框 + 半透明面表现缸体边界 */}
      <GlassWalls />

      {/* 装饰物：水草与岩石（根据污染度调整） */}
      <Decorations pollution={pollution} />

      {/* 场景雾，增强水体纵深 */}
      <fog attach="fog" args={[fogColor, 14, 34]} />
    </group>
  );
}

/** 玻璃壁与边框线 */
function GlassWalls() {
  const glassMat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: '#bfe6e3',
        transparent: true,
        opacity: 0.08,
        roughness: 0.05,
        metalness: 0,
        transmission: 0.9,
        side: THREE.DoubleSide,
      }),
    [],
  );

  return (
    <group>
      {/* 四壁 */}
      <mesh position={[0, H / 2, -D / 2]} material={glassMat}>
        <planeGeometry args={[W, H]} />
      </mesh>
      <mesh position={[0, H / 2, D / 2]} rotation={[0, Math.PI, 0]} material={glassMat}>
        <planeGeometry args={[W, H]} />
      </mesh>
      <mesh position={[-W / 2, H / 2, 0]} rotation={[0, Math.PI / 2, 0]} material={glassMat}>
        <planeGeometry args={[D, H]} />
      </mesh>
      <mesh position={[W / 2, H / 2, 0]} rotation={[0, -Math.PI / 2, 0]} material={glassMat}>
        <planeGeometry args={[D, H]} />
      </mesh>

      {/* 边框线 */}
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(W, H, D)]} />
        <lineBasicMaterial color="#0f3d33" transparent opacity={0.55} />
      </lineSegments>
    </group>
  );
}

function Decorations({ pollution }: { pollution: number }) {
  const rocks = useMemo<{ pos: [number, number, number]; scale: number }[]>(
    () => [
      { pos: [-5.5, 0.3, -2.5], scale: 0.9 },
      { pos: [5, 0.3, 2], scale: 1.2 },
      { pos: [-2, 0.3, 3], scale: 0.7 },
      { pos: [3.5, 0.3, -3], scale: 0.85 },
    ],
    [],
  );

  const plants = useMemo(() => {
    const seed = 42;
    const rng = mulberry(seed);
    return Array.from({ length: 10 }, (_, i) => ({
      id: i,
      x: (rng() - 0.5) * (W - 3),
      z: (rng() - 0.5) * (D - 3),
      h: 1.2 + rng() * 1.8,
      rot: rng() * Math.PI,
    }));
  }, []);

  return (
    <group>
      {rocks.map((r, i) => (
        <mesh key={i} position={[r.pos[0], r.pos[1], r.pos[2]]} scale={r.scale} castShadow>
          <dodecahedronGeometry args={[0.7, 0]} />
          <meshStandardMaterial color={pollution > 0.4 ? '#3a3526' : '#7d7468'} roughness={0.9} />
        </mesh>
      ))}
      {plants.map((p) => (
        <group key={p.id} position={[p.x, 0.1, p.z]} rotation={[0, p.rot, 0]}>
          <mesh position={[0, p.h / 2, 0]}>
            <coneGeometry args={[0.25, p.h, 6]} />
            <meshStandardMaterial
              color={pollution > 0.4 ? '#3a4a2a' : '#3f8a4f'}
              roughness={0.8}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** 装饰物用的轻量伪随机 */
function mulberry(seed: number): () => number {
  let a = seed >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
