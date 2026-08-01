/**
 * 昼夜光照系统
 * 每帧读取引擎光照强度：白天暖阳高照，夜晚切换冷蓝月光并压低环境光
 * 同时驱动场景背景色，形成昼夜氛围过渡
 */
import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { lightLevelOf } from '@/engine/simulation';
import { useEcosystemStore } from '@/store/ecosystemStore';

// 白天/夜晚的配色常量
const DAY_SUN = new THREE.Color('#fff2d9');
const NIGHT_MOON = new THREE.Color('#7fa8ff');
const DAY_BG = new THREE.Color('#0a3242');
const NIGHT_BG = new THREE.Color('#02090f');
const DAY_AMBIENT = new THREE.Color('#bfd9e2');
const NIGHT_AMBIENT = new THREE.Color('#24344f');

export function DayNightLighting() {
  const sunRef = useRef<THREE.DirectionalLight>(null);
  const ambientRef = useRef<THREE.AmbientLight>(null);
  const { scene } = useThree();
  // 复用颜色对象，避免每帧分配
  const scratch = useMemo(
    () => ({ sun: new THREE.Color(), bg: new THREE.Color(), amb: new THREE.Color() }),
    []
  );

  useFrame(() => {
    const { engine, reviewIndex } = useEcosystemStore.getState();
    // 回看模式下按快照时刻的昼夜进度打光，保证回放氛围一致
    const progress =
      reviewIndex !== null
        ? engine.history.at(reviewIndex)?.dayProgress ?? engine.dayProgress
        : engine.dayProgress;
    const level = lightLevelOf(progress);

    if (sunRef.current) {
      // 白天暖阳 1.6 → 夜晚月光 0.35
      sunRef.current.intensity = 0.35 + level * 1.25;
      sunRef.current.color = scratch.sun.copy(NIGHT_MOON).lerp(DAY_SUN, level);
    }
    if (ambientRef.current) {
      ambientRef.current.intensity = 0.25 + level * 0.75;
      ambientRef.current.color = scratch.amb.copy(NIGHT_AMBIENT).lerp(DAY_AMBIENT, level);
    }
    // 背景色同步昼夜渐变
    scratch.bg.copy(NIGHT_BG).lerp(DAY_BG, level);
    scene.background = scratch.bg;
    // 雾效营造水下纵深，夜晚更浓
    scene.fog = new THREE.Fog(scratch.bg.getHex(), 18, 42 - level * 10);
  });

  return (
    <group>
      {/* 主光源：白天的太阳 / 夜晚的月光 */}
      <directionalLight ref={sunRef} position={[6, 12, 8]} intensity={1.6} />
      {/* 环境天光 */}
      <ambientLight ref={ambientRef} intensity={0.9} />
      {/* 顶部补光：让水面区域更通透 */}
      <pointLight position={[0, 9, 0]} intensity={12} color="#bfeaff" distance={20} />
    </group>
  );
}
