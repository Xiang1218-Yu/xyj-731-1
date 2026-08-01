/**
 * 3D 生态缸场景根组件
 * 组合：模拟循环、昼夜光照、缸体、生物群、追踪装置、轨道控制器、后处理
 */
import { useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { useEcosystemStore } from '@/store/ecosystemStore';
import { SimulationLoop } from './SimulationLoop';
import { DayNightLighting } from './DayNightLighting';
import { TankGlass } from './TankGlass';
import { Creatures } from './Creatures';
import { TrackingRig } from './TrackingRig';

export function TankScene() {
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const setTrackedId = useEcosystemStore((s) => s.setTrackedId);

  return (
    <Canvas
      camera={{ position: [0, 6, 13.5], fov: 45, near: 0.1, far: 100 }}
      // 点击空白处退出追踪模式
      onPointerMissed={() => setTrackedId(null)}
      dpr={[1, 2]}
    >
      {/* 模拟推进（必须挂在 Canvas 内以驱动 useFrame） */}
      <SimulationLoop />

      <DayNightLighting />
      <TankGlass />
      <Creatures />
      <TrackingRig controlsRef={controlsRef} />

      <OrbitControls
        ref={controlsRef}
        target={[0, 3, 0]}
        enablePan={false}
        minDistance={4}
        maxDistance={26}
        maxPolarAngle={Math.PI * 0.62}
        enableDamping
        dampingFactor={0.08}
      />

      {/* 后处理：Bloom 让夜光藻与光环发光，Vignette 聚焦视线 */}
      <EffectComposer>
        <Bloom intensity={0.85} luminanceThreshold={0.55} luminanceSmoothing={0.2} />
        <Vignette eskil={false} offset={0.18} darkness={0.72} />
      </EffectComposer>
    </Canvas>
  );
}
