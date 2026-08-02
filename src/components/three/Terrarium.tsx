import { useMemo } from 'react';
import * as THREE from 'three';
import { TANK_BOUNDS } from '../../store/ecoStore';
import { useEcoStore } from '../../store/ecoStore';

// ============================================================
// 生态缸容器：玻璃箱 + 地面/水体 + 装饰物
// ============================================================

interface TerrariumProps {
  isWaterScene: boolean;
}

export default function Terrarium({ isWaterScene }: TerrariumProps) {
  const currentScene = useEcoStore(s => s.currentScene);
  const lightIntensity = useEcoStore(s => s.ecoTime.lightIntensity);

  // 地面颜色受场景和光照影响
  const groundColor = useMemo(() => {
    const base = new THREE.Color(currentScene.groundColor);
    return base.multiplyScalar(0.3 + lightIntensity * 0.7);
  }, [currentScene.groundColor, lightIntensity]);

  const glassOpacity = isWaterScene ? 0.15 : 0.08;

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
            color={currentScene.groundColor}
            transparent
            opacity={0.25 + (1 - lightIntensity) * 0.15}
            roughness={0.1}
            metalness={0}
            transmission={0.6}
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

      {/* ---- 玻璃边框 ---- */}
      {/* 底部边框 */}
      <mesh position={[0, -TANK_BOUNDS.y, 0]}>
        <boxGeometry args={[TANK_BOUNDS.x * 2 + 0.2, 0.2, TANK_BOUNDS.z * 2 + 0.2]} />
        <meshStandardMaterial color="#2c2c2c" metalness={0.8} roughness={0.3} />
      </mesh>

      {/* ---- 装饰物：石头 ---- */}
      {[
        [-3, -TANK_BOUNDS.y + 0.3, -2],
        [2.5, -TANK_BOUNDS.y + 0.25, 3],
        [-1, -TANK_BOUNDS.y + 0.2, 2],
        [3.5, -TANK_BOUNDS.y + 0.35, -3.5]
      ].map((pos, i) => (
        <mesh key={`rock-${i}`} position={pos as [number, number, number]} castShadow>
          <dodecahedronGeometry args={[0.3 + Math.random() * 0.2, 0]} />
          <meshStandardMaterial color="#5d4e37" roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}
