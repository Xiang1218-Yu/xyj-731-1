/**
 * 生态缸静态场景：玻璃缸体、水体、底砂、造景石、上升气泡
 * 水体颜色随水质变化（污染场景发绿浑浊），光照由 DayNightLighting 控制
 */
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useEcosystemStore } from '@/store/ecosystemStore';

/** 缸体尺寸（与引擎 TANK_BOUNDS 对齐，留出缸壁厚度） */
const TANK = { w: 12, h: 7, d: 7 };

/** 底砂造景石：确定性随机分布，避免每次渲染抖动 */
function useRocks() {
  return useMemo(() => {
    const rocks: Array<{ position: [number, number, number]; scale: number; rot: number }> = [];
    let seed = 42;
    const rand = () => {
      // 线性同余伪随机，保证每次渲染结果一致
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    for (let i = 0; i < 14; i++) {
      rocks.push({
        position: [(rand() - 0.5) * 10.4, 0.1, (rand() - 0.5) * 5.6],
        scale: 0.2 + rand() * 0.45,
        rot: rand() * Math.PI,
      });
    }
    return rocks;
  }, []);
}

/** 上升气泡：InstancedMesh 循环上浮 */
function Bubbles() {
  const COUNT = 40;
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const seeds = useMemo(
    () =>
      Array.from({ length: COUNT }, (_, i) => ({
        x: ((i * 7.13) % 10) - 5,
        z: ((i * 3.71) % 5.4) - 2.7,
        speed: 0.35 + ((i * 0.37) % 0.5),
        offset: (i * 1.618) % 6,
        size: 0.02 + ((i * 0.11) % 0.05),
      })),
    []
  );
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame(({ clock }) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const t = clock.elapsedTime;
    seeds.forEach((s, i) => {
      // 气泡从底部升到水面后循环
      const y = ((t * s.speed + s.offset) % 5.8) + 0.2;
      dummy.position.set(s.x + Math.sin(t + i) * 0.15, y, s.z);
      dummy.scale.setScalar(s.size);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, COUNT]}>
      <sphereGeometry args={[1, 6, 6]} />
      <meshStandardMaterial color="#bfeaff" transparent opacity={0.45} />
    </instancedMesh>
  );
}

export function TankGlass() {
  const rocks = useRocks();
  const waterRef = useRef<THREE.Mesh>(null);

  // 水体颜色随水质变化：清澈偏蓝 / 污染偏绿褐
  useFrame(() => {
    const { engine } = useEcosystemStore.getState();
    const mat = (waterRef.current?.material ?? null) as THREE.MeshPhysicalMaterial | null;
    if (!mat) return;
    const clean = new THREE.Color('#1a5f7a');
    const dirty = new THREE.Color('#4a5a2a');
    mat.color = clean.lerp(dirty, 1 - engine.waterQuality);
    mat.opacity = 0.1 + (1 - engine.waterQuality) * 0.22; // 污染更浑浊
  });

  return (
    <group>
      {/* 底砂 */}
      <mesh position={[0, 0, 0]} receiveShadow>
        <boxGeometry args={[TANK.w - 0.2, 0.3, TANK.d - 0.2]} />
        <meshStandardMaterial color="#b8a67a" roughness={1} />
      </mesh>

      {/* 造景石 */}
      {rocks.map((r, i) => (
        <mesh key={i} position={r.position} rotation={[0, r.rot, 0]} scale={r.scale}>
          <dodecahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color={i % 3 === 0 ? '#6b6f72' : '#8a8d8f'} roughness={0.9} />
        </mesh>
      ))}

      {/* 水体（半透明体积块，颜色随水质变化） */}
      <mesh ref={waterRef} position={[0, TANK.h / 2 - 0.15, 0]}>
        <boxGeometry args={[TANK.w - 0.3, TANK.h - 0.6, TANK.d - 0.3]} />
        <meshPhysicalMaterial color="#1a5f7a" transparent opacity={0.1} roughness={0.1} depthWrite={false} />
      </mesh>

      {/* 玻璃缸壁（透明物理材质 + 边框线） */}
      <mesh position={[0, TANK.h / 2 - 0.15, 0]}>
        <boxGeometry args={[TANK.w, TANK.h, TANK.d]} />
        <meshPhysicalMaterial
          color="#cfefff"
          transparent
          opacity={0.07}
          roughness={0.05}
          metalness={0}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <lineSegments position={[0, TANK.h / 2 - 0.15, 0]}>
        <edgesGeometry args={[new THREE.BoxGeometry(TANK.w, TANK.h, TANK.d)]} />
        <lineBasicMaterial color="#3ee6c4" transparent opacity={0.5} />
      </lineSegments>

      <Bubbles />
    </group>
  );
}
