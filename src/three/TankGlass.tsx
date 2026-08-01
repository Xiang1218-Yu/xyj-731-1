/**
 * 生态缸静态场景：玻璃缸体、水体、底砂、造景石、焦散光斑、上升气泡
 * 水体颜色随水质变化（污染场景发绿浑浊）；装饰元素随预设场景差异化：
 * 淡水湖泊=浮萍 / 热带雨林=沉木 / 污染水域=悬浮碎屑
 * 所有 Color 对象模块级复用，避免每帧分配
 */
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { lightLevelOf } from '@/engine/simulation';
import { useEcosystemStore } from '@/store/ecosystemStore';

/** 缸体尺寸（与引擎 TANK_BOUNDS 对齐，留出缸壁厚度） */
const TANK = { w: 12, h: 7, d: 7 };

// 模块级常量色：水体清澈/污染插值复用
const WATER_CLEAN = new THREE.Color('#1a5f7a');
const WATER_DIRTY = new THREE.Color('#4a5a2a');

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

/** 程序化焦散纹理：模拟阳光穿过水面在底砂上形成的光斑 */
function useCausticsTexture() {
  return useMemo(() => {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, size, size);
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      // 绘制多层随机弧线，形成网状光斑
      let seed = 7;
      const rand = () => {
        seed = (seed * 16807) % 2147483647;
        return seed / 2147483647;
      };
      for (let i = 0; i < 60; i++) {
        ctx.lineWidth = 1 + rand() * 2.5;
        ctx.beginPath();
        ctx.arc(rand() * size, rand() * size, 6 + rand() * 22, rand() * Math.PI, rand() * Math.PI + Math.PI * (0.4 + rand() * 0.6));
        ctx.stroke();
      }
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(3, 2);
    return texture;
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

/** 淡水湖泊装饰：水面浮萍 */
function Duckweed() {
  const pads = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => ({
        x: ((i * 3.3) % 10) - 5,
        z: ((i * 2.7) % 5) - 2.5,
        s: 0.12 + ((i * 0.07) % 0.15),
      })),
    []
  );
  return (
    <group>
      {pads.map((p, i) => (
        <mesh key={i} position={[p.x, 6.15, p.z]} rotation={[-Math.PI / 2, 0, i]}>
          <circleGeometry args={[p.s, 8]} />
          <meshStandardMaterial color="#4a9e4f" />
        </mesh>
      ))}
    </group>
  );
}

/** 热带雨林装饰：底部沉木 */
function Driftwood() {
  return (
    <group>
      <mesh position={[-3.2, 0.5, -1.5]} rotation={[0.2, 0.6, Math.PI / 2.2]}>
        <cylinderGeometry args={[0.28, 0.38, 4.2, 8]} />
        <meshStandardMaterial color="#5d4a2f" roughness={0.95} />
      </mesh>
      <mesh position={[3.6, 0.4, 1.2]} rotation={[-0.15, -0.4, Math.PI / 1.9]}>
        <cylinderGeometry args={[0.2, 0.3, 3.2, 8]} />
        <meshStandardMaterial color="#6b5537" roughness={0.95} />
      </mesh>
      <mesh position={[-3.2, 1.4, -1.5]} rotation={[0.9, 0.3, 0.4]}>
        <cylinderGeometry args={[0.12, 0.2, 1.8, 6]} />
        <meshStandardMaterial color="#54432b" roughness={0.95} />
      </mesh>
    </group>
  );
}

/** 污染水域装饰：水中悬浮碎屑颗粒 */
function Debris() {
  const groupRef = useRef<THREE.Group>(null);
  const flecks = useMemo(
    () =>
      Array.from({ length: 26 }, (_, i) => ({
        x: ((i * 4.7) % 10.5) - 5.25,
        y: 0.8 + ((i * 1.3) % 5),
        z: ((i * 2.9) % 5.6) - 2.8,
        s: 0.04 + ((i * 0.03) % 0.06),
      })),
    []
  );
  // 碎屑整体缓慢旋转漂移，营造污水悬浮感
  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(clock.elapsedTime * 0.05) * 0.15;
    }
  });
  return (
    <group ref={groupRef}>
      {flecks.map((f, i) => (
        <mesh key={i} position={[f.x, f.y, f.z]}>
          <tetrahedronGeometry args={[f.s]} />
          <meshStandardMaterial color="#5a5a3a" roughness={1} />
        </mesh>
      ))}
    </group>
  );
}

export function TankGlass() {
  const rocks = useRocks();
  const caustics = useCausticsTexture();
  const waterRef = useRef<THREE.Mesh>(null);
  const causticsRef = useRef<THREE.Mesh>(null);
  const presetId = useEcosystemStore((s) => s.presetId);

  useFrame((_, delta) => {
    const { engine, reviewIndex } = useEcosystemStore.getState();

    // 水体颜色随水质变化：清澈偏蓝 / 污染偏绿褐（复用模块级 Color，无每帧分配）
    const waterMat = (waterRef.current?.material ?? null) as THREE.MeshPhysicalMaterial | null;
    if (waterMat) {
      waterMat.color.copy(WATER_CLEAN).lerp(WATER_DIRTY, 1 - engine.waterQuality);
      waterMat.opacity = 0.1 + (1 - engine.waterQuality) * 0.22; // 污染更浑浊
    }

    // 光照强度（回看模式取快照时刻）
    const progress =
      reviewIndex !== null
        ? engine.history.at(reviewIndex)?.dayProgress ?? engine.dayProgress
        : engine.dayProgress;
    const level = lightLevelOf(progress);

    // 焦散光斑：白天清晰可见，夜晚隐没；纹理缓慢流动
    const causticsMat = (causticsRef.current?.material ?? null) as THREE.MeshBasicMaterial | null;
    if (causticsMat) {
      causticsMat.opacity = level * 0.4 * engine.waterQuality; // 污染水体焦散也衰减
      caustics.offset.x += delta * 0.015;
      caustics.offset.y += delta * 0.008;
    }
  });

  return (
    <group>
      {/* 底砂 */}
      <mesh position={[0, 0, 0]} receiveShadow>
        <boxGeometry args={[TANK.w - 0.2, 0.3, TANK.d - 0.2]} />
        <meshStandardMaterial color="#b8a67a" roughness={1} />
      </mesh>

      {/* 底砂焦散光斑层（叠加混合，随昼夜明暗） */}
      <mesh ref={causticsRef} position={[0, 0.17, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[TANK.w - 0.3, TANK.d - 0.3]} />
        <meshBasicMaterial
          map={caustics}
          transparent
          opacity={0.3}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* 造景石 */}
      {rocks.map((r, i) => (
        <mesh key={i} position={r.position} rotation={[0, r.rot, 0]} scale={r.scale}>
          <dodecahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color={i % 3 === 0 ? '#6b6f72' : '#8a8d8f'} roughness={0.9} />
        </mesh>
      ))}

      {/* 场景差异化装饰 */}
      {presetId === 'freshwater-lake' && <Duckweed />}
      {presetId === 'rainforest' && <Driftwood />}
      {presetId === 'polluted-water' && <Debris />}

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
