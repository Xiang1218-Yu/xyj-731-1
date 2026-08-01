import { useMemo } from 'react';
import * as THREE from 'three';
import { TANK_HALF } from '../domain/constants';
import { useDisplayClock } from '../state/selectors';
import { useStore } from '../state/store';
import { getScene } from '../domain/presets';

/**
 * 生态缸容器：半透明玻璃立方体 + 水体 + 底沙。
 * 水体颜色随场景（污染程度）与昼夜光照变化。
 */
export function Tank(): JSX.Element {
  const { light } = useDisplayClock();
  const sceneId = useStore((s) => s.sceneId);
  const pollution = useStore((s) => s.sim.pollution);

  const scene = getScene(sceneId);

  // 水体颜色：以场景环境色为基，污染越重越偏浑浊；夜晚整体压暗
  const waterColor = useMemo(() => {
    const base = new THREE.Color(scene.ambientColor);
    const muddy = new THREE.Color('#5b4a32');
    base.lerp(muddy, pollution * 0.6);
    // 夜晚降低亮度
    const brightness = 0.35 + light * 0.65;
    base.multiplyScalar(brightness);
    return base;
  }, [scene.ambientColor, pollution, light]);

  const w = TANK_HALF.x * 2;
  const h = TANK_HALF.y * 2;
  const d = TANK_HALF.z * 2;

  return (
    <group>
      {/* 水体：半透明填充 */}
      <mesh>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial
          color={waterColor}
          transparent
          opacity={0.22 + pollution * 0.25}
          roughness={0.1}
          metalness={0.05}
        />
      </mesh>

      {/* 玻璃缸壁：线框边缘 */}
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(w, h, d)]} />
        <lineBasicMaterial color="#bfe6ff" transparent opacity={0.6} />
      </lineSegments>

      {/* 底沙 */}
      <mesh position={[0, -TANK_HALF.y, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial color="#c2a878" roughness={1} />
      </mesh>
    </group>
  );
}
