import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TANK_BOUNDS } from '../../store/ecoStore';
import { useEcoStore } from '../../store/ecoStore';

// ============================================================
// 生态缸容器：玻璃箱（四壁+顶盖+底座）+ 地面/水体 + 装饰物
// 污染场景下水体浑浊度增加
// ============================================================

interface TerrariumProps {
  isWaterScene: boolean;
}

export default function Terrarium({ isWaterScene }: TerrariumProps) {
  const currentScene = useEcoStore(s => s.currentScene);
  const lightIntensity = useEcoStore(s => s.ecoTime.lightIntensity);
  const pollutionLevel = currentScene.pollutionLevel;

  const groundColor = useMemo(() => {
    const base = new THREE.Color(currentScene.groundColor);
    return base.multiplyScalar(0.3 + lightIntensity * 0.7);
  }, [currentScene.groundColor, lightIntensity]);

  const glassOpacity = isWaterScene ? 0.15 : 0.08;

  // 污染水体颜色和透明度
  const waterColor = useMemo(() => {
    const base = new THREE.Color(currentScene.groundColor);
    if (pollutionLevel > 0) {
      // 污染水偏暗绿褐色
      const polluted = new THREE.Color('#3a2f1a');
      base.lerp(polluted, pollutionLevel * 0.7);
    }
    return base;
  }, [currentScene.groundColor, pollutionLevel]);

  const waterOpacity = 0.25 + (1 - lightIntensity) * 0.15 + pollutionLevel * 0.35;

  return (
    <group>
      {/* ---- 底部地面/水体底板 ---- */}
      <mesh position={[0, -TANK_BOUNDS.y, 0]} receiveShadow>
        <boxGeometry args={[TANK_BOUNDS.x * 2, 0.3, TANK_BOUNDS.z * 2]} />
        <meshStandardMaterial
          color={groundColor}
          roughness={isWaterScene ? 0.2 : 0.9}
          metalness={isWaterScene ? 0.3 : 0}
        />
      </mesh>

      {/* ---- 水体（淡水/污染场景） ---- */}
      {isWaterScene && (
        <mesh position={[0, -TANK_BOUNDS.y * 0.3, 0]}>
          <boxGeometry args={[TANK_BOUNDS.x * 1.98, TANK_BOUNDS.y * 1.3, TANK_BOUNDS.z * 1.98]} />
          <meshPhysicalMaterial
            color={waterColor}
            transparent
            opacity={waterOpacity}
            roughness={0.1 + pollutionLevel * 0.4}
            metalness={0}
            transmission={Math.max(0.1, 0.6 - pollutionLevel * 0.5)}
            thickness={2}
          />
        </mesh>
      )}

      {/* ---- 顶部土壤层（雨林场景） ---- */}
      {!isWaterScene && (
        <mesh position={[0, -TANK_BOUNDS.y + 0.15, 0]} receiveShadow>
          <boxGeometry args={[TANK_BOUNDS.x * 1.96, 0.2, TANK_BOUNDS.z * 1.96]} />
          <meshStandardMaterial color={currentScene.groundColor} roughness={1} />
        </mesh>
      )}

      {/* ---- 玻璃四壁 ---- */}
      {/* 前壁 */}
      <mesh position={[0, 0, TANK_BOUNDS.z]}>
        <planeGeometry args={[TANK_BOUNDS.x * 2, TANK_BOUNDS.y * 2]} />
        <meshPhysicalMaterial
          color="#ffffff"
          transparent
          opacity={glassOpacity}
          roughness={0}
          metalness={0}
          transmission={0.9}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* 后壁 */}
      <mesh position={[0, 0, -TANK_BOUNDS.z]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[TANK_BOUNDS.x * 2, TANK_BOUNDS.y * 2]} />
        <meshPhysicalMaterial
          color="#ffffff"
          transparent
          opacity={glassOpacity}
          roughness={0}
          transmission={0.9}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* 左壁 */}
      <mesh position={[-TANK_BOUNDS.x, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[TANK_BOUNDS.z * 2, TANK_BOUNDS.y * 2]} />
        <meshPhysicalMaterial
          color="#ffffff"
          transparent
          opacity={glassOpacity}
          roughness={0}
          transmission={0.9}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* 右壁 */}
      <mesh position={[TANK_BOUNDS.x, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[TANK_BOUNDS.z * 2, TANK_BOUNDS.y * 2]} />
        <meshPhysicalMaterial
          color="#ffffff"
          transparent
          opacity={glassOpacity}
          roughness={0}
          transmission={0.9}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* ---- 玻璃顶盖 ---- */}
      <mesh position={[0, TANK_BOUNDS.y, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[TANK_BOUNDS.x * 2, TANK_BOUNDS.z * 2]} />
        <meshPhysicalMaterial
          color="#ffffff"
          transparent
          opacity={glassOpacity * 0.7}
          roughness={0}
          metalness={0}
          transmission={0.85}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* ---- 玻璃边框 ---- */}
      {/* 底部边框 */}
      <mesh position={[0, -TANK_BOUNDS.y, 0]}>
        <boxGeometry args={[TANK_BOUNDS.x * 2 + 0.2, 0.2, TANK_BOUNDS.z * 2 + 0.2]} />
        <meshStandardMaterial color="#2c2c2c" metalness={0.8} roughness={0.3} />
      </mesh>
      {/* 顶部边框 */}
      <mesh position={[0, TANK_BOUNDS.y, 0]}>
        <boxGeometry args={[TANK_BOUNDS.x * 2 + 0.2, 0.15, TANK_BOUNDS.z * 2 + 0.2]} />
        <meshStandardMaterial color="#2c2c2c" metalness={0.8} roughness={0.3} />
      </mesh>
      {/* 四个垂直边框柱 */}
      {[
        [TANK_BOUNDS.x, 0, TANK_BOUNDS.z],
        [-TANK_BOUNDS.x, 0, TANK_BOUNDS.z],
        [TANK_BOUNDS.x, 0, -TANK_BOUNDS.z],
        [-TANK_BOUNDS.x, 0, -TANK_BOUNDS.z]
      ].map((pos, i) => (
        <mesh key={`pillar-${i}`} position={pos as [number, number, number]}>
          <boxGeometry args={[0.12, TANK_BOUNDS.y * 2 + 0.3, 0.12]} />
          <meshStandardMaterial color="#2c2c2c" metalness={0.8} roughness={0.3} />
        </mesh>
      ))}

      {/* ---- 装饰物：石头 ---- */}
      {[
        [-3, -TANK_BOUNDS.y + 0.3, -2],
        [2.5, -TANK_BOUNDS.y + 0.25, 3],
        [-1, -TANK_BOUNDS.y + 0.2, 2],
        [3.5, -TANK_BOUNDS.y + 0.35, -3.5]
      ].map((pos, i) => (
        <mesh key={`rock-${i}`} position={pos as [number, number, number]} castShadow>
          <dodecahedronGeometry args={[0.3 + (i % 3) * 0.1, 0]} />
          <meshStandardMaterial color="#5d4e37" roughness={0.9} />
        </mesh>
      ))}

      {/* ---- 污染颗粒效果（污染场景） ---- */}
      {pollutionLevel > 0.3 && (
        <PollutionParticles pollutionLevel={pollutionLevel} />
      )}
    </group>
  );
}

// ============================================================
// 污染颗粒：在污染水体中漂浮的微小颗粒
// ============================================================
function PollutionParticles({ pollutionLevel }: { pollutionLevel: number }) {
  const ref = useRef<THREE.Points>(null);
  const count = Math.floor(80 * pollutionLevel);

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() * 2 - 1) * TANK_BOUNDS.x * 0.9;
      arr[i * 3 + 1] = -TANK_BOUNDS.y + Math.random() * TANK_BOUNDS.y * 1.5;
      arr[i * 3 + 2] = (Math.random() * 2 - 1) * TANK_BOUNDS.z * 0.9;
    }
    return arr;
  }, [count]);

  useFrame((_, delta) => {
    if (!ref.current) return;
    const positions = ref.current.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < count; i++) {
      positions[i * 3 + 1] += Math.sin(Date.now() * 0.001 + i) * delta * 0.1;
      positions[i * 3] += delta * 0.05;
      if (positions[i * 3] > TANK_BOUNDS.x) positions[i * 3] = -TANK_BOUNDS.x;
    }
    ref.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#4a3520"
        size={0.08}
        transparent
        opacity={pollutionLevel * 0.6}
        sizeAttenuation
      />
    </points>
  );
}
