import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useEcoStore, TANK_BOUNDS } from '../../store/ecoStore';

// ============================================================
// 昼夜循环光照系统
// 根据 ecoTime 动态调整：环境光、太阳方向光、月光、雾色
// ============================================================

export default function DayNightCycle() {
  const directionalRef = useRef<THREE.DirectionalLight>(null);
  const ambientRef = useRef<THREE.AmbientLight>(null);
  const hemisphereRef = useRef<THREE.HemisphereLight>(null);

  const ecoTime = useEcoStore(s => s.ecoTime);
  const currentScene = useEcoStore(s => s.currentScene);

  useFrame(() => {
    if (!directionalRef.current || !ambientRef.current || !hemisphereRef.current) return;

    const intensity = ecoTime.lightIntensity;
    const isDay = ecoTime.isDaytime;

    // 太阳位置随时间变化（从东到西画弧线）
    const sunAngle = ((ecoTime.hourOfDay - 6) / 12) * Math.PI;
    const sunX = Math.cos(sunAngle) * TANK_BOUNDS.x * 2;
    const sunY = Math.sin(sunAngle) * TANK_BOUNDS.y * 2.5;
    directionalRef.current.position.set(sunX, Math.max(sunY, 2), 5);

    // 白天暖白光，夜晚冷蓝月光
    if (isDay) {
      directionalRef.current.color.setHSL(0.12, 0.5, 0.6 + intensity * 0.3);
      directionalRef.current.intensity = intensity * 1.2;
    } else {
      directionalRef.current.color.setHSL(0.6, 0.4, 0.5);
      directionalRef.current.intensity = 0.15;
    }

    ambientRef.current.intensity = 0.2 + intensity * 0.4;
    hemisphereRef.current.intensity = 0.3 + intensity * 0.3;
  });

  // 场景背景色随昼夜变化
  const bgColor = isDayTimeBgColor(ecoTime.lightIntensity, currentScene.fogColor);

  return (
    <>
      <color attach="background" args={[bgColor]} />
      <fog attach="fog" args={[bgColor, 15, 35]} />

      <ambientLight ref={ambientRef} intensity={0.5} />
      <hemisphereLight
        ref={hemisphereRef}
        args={['#87ceeb', currentScene.groundColor, 0.5]}
      />
      <directionalLight
        ref={directionalRef}
        position={[10, 15, 10]}
        intensity={1}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-TANK_BOUNDS.x}
        shadow-camera-right={TANK_BOUNDS.x}
        shadow-camera-top={TANK_BOUNDS.y}
        shadow-camera-bottom={-TANK_BOUNDS.y}
        shadow-camera-near={0.5}
        shadow-camera-far={50}
      />
    </>
  );
}

function isDayTimeBgColor(lightIntensity: number, fogColor: string): string {
  const dayColor = new THREE.Color('#1a2a3a');
  const nightColor = new THREE.Color('#050810');
  const sceneTint = new THREE.Color(fogColor);
  const blended = dayColor.clone().lerp(nightColor, 1 - lightIntensity);
  blended.lerp(sceneTint, 0.15);
  return `#${blended.getHexString()}`;
}
