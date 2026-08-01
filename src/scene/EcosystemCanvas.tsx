import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useRef } from 'react';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { Tank } from './Tank';
import { Lighting } from './Lighting';
import { OrganismMesh } from './OrganismMesh';
import { TrackingCamera } from './TrackingCamera';
import { SimulationDriver } from './SimulationDriver';
import { useDisplayedOrganisms, useStore } from '../state/store';
import { useDisplayClock } from '../state/selectors';
import { TANK_HALF } from '../domain/constants';

/** 背景色：根据昼夜光照在深空蓝与浅天蓝之间过渡 */
function useBackgroundColor(): string {
  const { light } = useDisplayClock();
  // 简单线性混合两个十六进制颜色
  const night = { r: 6, g: 12, b: 34 };
  const day = { r: 135, g: 190, b: 235 };
  const r = Math.round(night.r + (day.r - night.r) * light);
  const g = Math.round(night.g + (day.g - night.g) * light);
  const b = Math.round(night.b + (day.b - night.b) * light);
  return `rgb(${r}, ${g}, ${b})`;
}

/** 3D 生态缸场景根组件 */
export function EcosystemCanvas(): JSX.Element {
  const organisms = useDisplayedOrganisms();
  const { phase } = useDisplayClock();
  const background = useBackgroundColor();
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const trackOrganism = useStore((s) => s.trackOrganism);

  return (
    <Canvas
      camera={{ position: [TANK_HALF.x * 1.6, TANK_HALF.y * 1.2, TANK_HALF.z * 1.8], fov: 55 }}
      style={{ background }}
      // 点击空白处（未命中任何生物）取消追踪
      onPointerMissed={() => trackOrganism(null)}
    >
      <SimulationDriver />
      <Lighting />
      <Tank />

      {/* 渲染所有存活生物 */}
      {organisms
        .filter((o) => o.alive)
        .map((o) => (
          <OrganismMesh key={o.id} organism={o} phase={phase} />
        ))}

      <TrackingCamera controlsRef={controlsRef} />
      <OrbitControls
        ref={controlsRef}
        enablePan
        minDistance={3}
        maxDistance={40}
      />
    </Canvas>
  );
}
