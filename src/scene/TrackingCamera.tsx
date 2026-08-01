import { useThree, useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { useStore, useDisplayedOrganisms } from '../state/store';

interface TrackingCameraProps {
  /** OrbitControls 引用，用于在追踪时接管 target */
  controlsRef: React.RefObject<OrbitControlsImpl>;
}

/**
 * 追踪相机控制器。
 * 当存在被追踪生物时，相机平滑跟随该生物，并将 OrbitControls 的
 * 目标点锁定到生物位置；未追踪时不干预用户自由视角。
 */
export function TrackingCamera({ controlsRef }: TrackingCameraProps): null {
  const { camera } = useThree();
  const trackedId = useStore((s) => s.trackedId);
  const organisms = useDisplayedOrganisms();

  // 复用向量对象，避免每帧分配
  const desiredCamPos = useRef(new THREE.Vector3());
  const targetPos = useRef(new THREE.Vector3());

  useFrame(() => {
    if (trackedId === null) return;
    const target = organisms.find((o) => o.id === trackedId);
    if (!target) return;

    targetPos.current.set(
      target.position.x,
      target.position.y,
      target.position.z,
    );

    // 期望相机位置：在目标身后上方一段距离
    desiredCamPos.current.copy(targetPos.current).add(new THREE.Vector3(4, 3, 4));

    // 平滑插值跟随（lerp）
    camera.position.lerp(desiredCamPos.current, 0.08);

    const controls = controlsRef.current;
    if (controls) {
      controls.target.lerp(targetPos.current, 0.15);
      controls.update();
    } else {
      camera.lookAt(targetPos.current);
    }
  });

  return null;
}
