import { useRef, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useEcoStore } from '../../store/ecoStore';

// ============================================================
// 追踪模式相机
// 当用户点击生物进入追踪模式后，相机平滑跟随该生物
// ============================================================

export default function TrackingCamera() {
  const { camera } = useThree();
  const trackedOrganismId = useEcoStore(s => s.trackedOrganismId);
  const organisms = useEcoStore(s => s.organisms);

  const targetPos = useRef(new THREE.Vector3(8, 6, 10));
  const lookAt = useRef(new THREE.Vector3(0, 0, 0));
  const isTracking = useRef(false);

  useEffect(() => {
    isTracking.current = trackedOrganismId !== null;
    if (!trackedOrganismId) {
      // 退出追踪时回到默认视角
      targetPos.current.set(10, 7, 12);
      lookAt.current.set(0, 0, 0);
    }
  }, [trackedOrganismId]);

  useFrame((_state, delta) => {
    const trackedOrg = trackedOrganismId
      ? organisms.find(o => o.id === trackedOrganismId)
      : null;

    if (trackedOrg && trackedOrg.alive) {
      // 相机位于生物后上方
      const followDist = 3;
      const height = 2.5;
      targetPos.current.set(
        trackedOrg.position[0] - Math.sin(trackedOrg.rotation) * followDist,
        trackedOrg.position[1] + height,
        trackedOrg.position[2] - Math.cos(trackedOrg.rotation) * followDist
      );
      lookAt.current.set(
        trackedOrg.position[0],
        trackedOrg.position[1],
        trackedOrg.position[2]
      );
    }

    // 平滑插值
    const lerpFactor = 1 - Math.pow(0.001, delta);
    camera.position.lerp(targetPos.current, lerpFactor);
    const currentLookAt = new THREE.Vector3();
    camera.getWorldDirection(currentLookAt);
    currentLookAt.add(camera.position);
    currentLookAt.lerp(lookAt.current, lerpFactor);
    camera.lookAt(currentLookAt);
  });

  return null;
}
