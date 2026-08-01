// 昼夜光照系统：太阳沿天空弧线移动，夜间切换为冷色月光
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { EnvironmentState } from '@/simulation/types';
import { SIM } from '@/simulation/types';

interface LightsProps {
  env: EnvironmentState;
}

export function Lights({ env }: LightsProps) {
  const sunRef = useRef<THREE.DirectionalLight>(null);
  const moonRef = useRef<THREE.DirectionalLight>(null);
  const targetRef = useRef<THREE.Object3D>(null);

  useFrame(() => {
    // 太阳角度：timeOfDay 0=午夜, 0.25=日出, 0.5=正午, 0.75=日落
    const angle = env.timeOfDay * Math.PI * 2 - Math.PI / 2;
    const sunX = Math.cos(angle) * 18;
    const sunY = Math.sin(angle) * 14;
    const sunHeight = Math.sin(angle);

    if (sunRef.current) {
      sunRef.current.position.set(sunX, sunY, 6);
      sunRef.current.intensity = Math.max(0, sunHeight) * 1.6 * (1 - env.pollution * 0.3);
      // 白天偏暖白，黄昏偏橙
      const warmth = 1 - Math.abs(sunHeight);
      sunRef.current.color.setRGB(
        1,
        0.95 - warmth * 0.25,
        0.85 - warmth * 0.4,
      );
    }
    if (moonRef.current) {
      // 月亮位于太阳对面
      moonRef.current.position.set(-sunX, -sunY, 6);
      moonRef.current.intensity = Math.max(0, -sunHeight) * 0.5;
      moonRef.current.color.setRGB(0.6, 0.72, 1);
    }
  });

  const ambient = 0.28 + env.sunIntensity * 0.5;

  return (
    <>
      <ambientLight intensity={ambient} color={env.isNight ? '#3a5a8a' : '#fff4e0'} />
      <hemisphereLight
        args={[env.isNight ? '#2a3a6a' : '#bfe3ff', '#3a2a1a', env.isNight ? 0.25 : 0.5]}
      />
      <directionalLight
        ref={sunRef}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-SIM.TANK.width / 2}
        shadow-camera-right={SIM.TANK.width / 2}
        shadow-camera-top={SIM.TANK.height / 2}
        shadow-camera-bottom={-SIM.TANK.height / 2}
      />
      <directionalLight ref={moonRef} />
      <object3D ref={targetRef} position={[0, 3, 0]} />
    </>
  );
}
