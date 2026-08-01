import { useDisplayClock } from '../state/selectors';
import * as THREE from 'three';
import { useMemo } from 'react';
import { getScene } from '../domain/presets';
import { useStore } from '../state/store';
import { TANK_HALF } from '../domain/constants';

/**
 * 场景光照：模拟昼夜变化。
 * - 白天：明亮的方向光（阳光）+ 较强环境光
 * - 夜晚：昏暗的冷色调环境光 + 微弱月光
 * 通过 useDisplayClock 的光照强度平滑过渡。
 */
export function Lighting(): JSX.Element {
  const { light } = useDisplayClock();
  const sceneId = useStore((s) => s.sceneId);
  const scene = getScene(sceneId);

  // 环境光颜色：白天暖白，夜晚偏冷蓝
  const ambientColor = useMemo(() => {
    const day = new THREE.Color('#fff6e0');
    const night = new THREE.Color('#1a2a55');
    return night.clone().lerp(day, light);
  }, [light]);

  // 太阳/月亮方向光颜色
  const sunColor = useMemo(() => {
    const day = new THREE.Color('#ffffff');
    const moon = new THREE.Color('#7f8fd0');
    return moon.clone().lerp(day, light);
  }, [light]);

  // 场景色调作为极弱的补光，强化场景辨识度
  const tintColor = useMemo(() => new THREE.Color(scene.ambientColor), [
    scene.ambientColor,
  ]);

  return (
    <>
      {/* 环境光：夜晚保持一定基础亮度，避免全黑看不清 */}
      <ambientLight color={ambientColor} intensity={0.25 + light * 0.6} />

      {/* 主方向光：太阳高度随时钟变化 */}
      <directionalLight
        color={sunColor}
        intensity={0.2 + light * 1.1}
        position={[TANK_HALF.x * 1.5, TANK_HALF.y * 3, TANK_HALF.z * 1.5]}
        castShadow
      />

      {/* 场景色调补光 */}
      <hemisphereLight color={tintColor} groundColor="#20180f" intensity={0.2} />
    </>
  );
}
