/**
 * 昼夜光照系统
 * 每帧读取引擎光照强度：白天暖阳高照，夜晚切换冷蓝月光并压低环境光
 * 色温三段过渡：黎明/黄昏暖橙 → 正午白金色 → 夜晚冷蓝
 * Fog / Color 对象全部持久复用，避免每帧分配产生 GC 压力
 */
import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { lightLevelOf } from '@/engine/simulation';
import { useEcosystemStore } from '@/store/ecosystemStore';

// 模块级常量色：避免每帧 new Color
const NIGHT_MOON = new THREE.Color('#7fa8ff');
const WARM_LOW = new THREE.Color('#ffc97a');   // 黎明/黄昏暖橙
const DAY_SUN = new THREE.Color('#fff4de');    // 正午白金色
const DAY_BG = new THREE.Color('#17607a');
const NIGHT_BG = new THREE.Color('#02090f');
const DAY_AMBIENT = new THREE.Color('#d8edf4');
const NIGHT_AMBIENT = new THREE.Color('#24344f');

export function DayNightLighting() {
  const sunRef = useRef<THREE.DirectionalLight>(null);
  const ambientRef = useRef<THREE.AmbientLight>(null);
  const { scene } = useThree();

  // 持久复用：背景色、雾、各色温插值中间色（整个生命周期只创建一次）
  const scratch = useMemo(
    () => ({
      sun: new THREE.Color(),
      bg: new THREE.Color(),
      amb: new THREE.Color(),
      fog: new THREE.Fog(NIGHT_BG.getHex(), 18, 42),
    }),
    []
  );

  // 雾对象只挂载一次，后续每帧仅修改其属性
  useEffect(() => {
    scene.fog = scratch.fog;
    scene.background = scratch.bg;
    return () => {
      scene.fog = null;
      scene.background = null;
    };
  }, [scene, scratch]);

  useFrame(() => {
    const { engine, reviewIndex } = useEcosystemStore.getState();
    // 回看模式下按快照时刻的昼夜进度打光，保证回放氛围一致
    const progress =
      reviewIndex !== null
        ? engine.history.at(reviewIndex)?.dayProgress ?? engine.dayProgress
        : engine.dayProgress;
    const level = lightLevelOf(progress);

    if (sunRef.current) {
      // 白天暖阳 2.1 → 夜晚月光 0.35
      sunRef.current.intensity = 0.35 + level * 1.75;
      // 色温三段过渡：夜蓝 →(level 0.5)→ 暖橙 →(level 1)→ 白金色
      if (level < 0.5) {
        scratch.sun.copy(NIGHT_MOON).lerp(WARM_LOW, level * 2);
      } else {
        scratch.sun.copy(WARM_LOW).lerp(DAY_SUN, (level - 0.5) * 2);
      }
      sunRef.current.color = scratch.sun;
    }
    if (ambientRef.current) {
      ambientRef.current.intensity = 0.3 + level * 1.1;
      ambientRef.current.color = scratch.amb.copy(NIGHT_AMBIENT).lerp(DAY_AMBIENT, level);
    }
    // 背景与雾同步昼夜渐变（复用持久对象，仅修改属性）
    scratch.bg.copy(NIGHT_BG).lerp(DAY_BG, level);
    scratch.fog.color.copy(scratch.bg);
    scratch.fog.near = 20;
    scratch.fog.far = 50 - level * 14; // 夜晚雾更浓，营造水下昏暗纵深
  });

  return (
    <group>
      {/* 主光源：白天的太阳 / 夜晚的月光 */}
      <directionalLight ref={sunRef} position={[6, 12, 8]} intensity={1.75} />
      {/* 环境天光 */}
      <ambientLight ref={ambientRef} intensity={1.0} />
      {/* 顶部补光：让水面区域更通透 */}
      <pointLight position={[0, 9, 0]} intensity={12} color="#bfeaff" distance={20} />
    </group>
  );
}
