// 相机控制系统：自由视角用 OrbitControls，追踪模式下平滑跟随目标生物
import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useEcoStore } from '@/store/ecoStore';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { SIM } from '@/simulation/types';

export function CameraRig() {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const { camera } = useThree();
  const inspectingId = useEcoStore((s) => s.inspectingCreatureId);
  const creatures = useEcoStore((s) => s.creatures);
  const viewingIndex = useEcoStore((s) => s.viewingIndex);
  const snapshots = useEcoStore((s) => s.snapshots);

  const target = useRef(new THREE.Vector3(0, 3, 0));
  const desired = useRef(new THREE.Vector3(10, 8, 12));

  // 进入追踪时记录初始相机偏移，避免跳变
  useEffect(() => {
    if (!inspectingId) return;
    const list = viewingIndex !== null ? snapshots[viewingIndex]?.creatures : creatures;
    const c = list?.find((x) => x.id === inspectingId);
    if (c) {
      desired.current.set(
        c.position[0] + 5,
        c.position[1] + 3.5,
        c.position[2] + 6,
      );
    }
  }, [inspectingId, viewingIndex, snapshots, creatures]);

  useFrame(() => {
    if (inspectingId) {
      const list = viewingIndex !== null ? snapshots[viewingIndex]?.creatures : creatures;
      const c = list?.find((x) => x.id === inspectingId);
      if (c) {
        // 目标位置 + 固定侧向偏移，保持生物在画面略偏处
        desired.current.set(
          c.position[0] + 5,
          c.position[1] + 3.5,
          c.position[2] + 6,
        );
        target.current.set(c.position[0], c.position[1], c.position[2]);
        camera.position.lerp(desired.current, 0.06);
        camera.lookAt(target.current);
        if (controlsRef.current) {
          controlsRef.current.target.copy(target.current);
          controlsRef.current.update();
        }
      }
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enabled={!inspectingId}
      target={[0, 3, 0]}
      enableDamping
      dampingFactor={0.08}
      minDistance={6}
      maxDistance={30}
      maxPolarAngle={Math.PI / 2.05}
      minPolarAngle={0.2}
    />
  );
}

/** 给场景用的缸体中心 */
export const TANK_CENTER: [number, number, number] = [
  0,
  SIM.TANK.height / 2,
  0,
];
