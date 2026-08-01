/**
 * 追踪相机装置
 * 追踪模式下：相机目标点平滑跟随目标生物，用户仍可环绕观察；
 * 退出追踪时目标点平滑回到缸体中心
 */
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { useEcosystemStore } from '@/store/ecosystemStore';

interface TrackingRigProps {
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
}

/** 缸体中心（未追踪时的默认观察目标） */
const TANK_CENTER = new THREE.Vector3(0, 3, 0);

export function TrackingRig({ controlsRef }: TrackingRigProps) {
  // 平滑后的目标位置（阻尼插值中间态）
  const smoothTarget = useRef(new THREE.Vector3(0, 3, 0));
  const scratch = useRef(new THREE.Vector3());

  useFrame(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    const { engine, trackedId } = useEcosystemStore.getState();

    // 计算期望目标点：追踪生物位置 or 缸中心
    const desired = scratch.current;
    const tracked = trackedId ? engine.creatures.find((c) => c.id === trackedId) : undefined;
    if (tracked) {
      desired.set(tracked.position[0], tracked.position[1], tracked.position[2]);
    } else {
      desired.copy(TANK_CENTER);
    }

    // 阻尼插值，相机目标平滑移动
    const prevX = smoothTarget.current.x;
    const prevY = smoothTarget.current.y;
    const prevZ = smoothTarget.current.z;
    smoothTarget.current.lerp(desired, 0.08);

    // 目标点位移同步补偿到相机位置，实现"跟随"效果（保持相对环绕角）
    const dx = smoothTarget.current.x - prevX;
    const dy = smoothTarget.current.y - prevY;
    const dz = smoothTarget.current.z - prevZ;
    controls.target.copy(smoothTarget.current);
    controls.object.position.x += dx;
    controls.object.position.y += dy;
    controls.object.position.z += dz;
    controls.update();
  });

  return null;
}
