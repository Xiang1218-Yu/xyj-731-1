import { useRef, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useEcoStore } from '../../store/ecoStore';

// ============================================================
// 追踪模式相机
// 当用户点击生物进入追踪模式后，相机平滑跟随该生物
// 使用阻尼系数实现流畅跟随，避免抖动
// ============================================================

const FOLLOW_DISTANCE = 3.5;
const FOLLOW_HEIGHT = 2.8;
// 位置阻尼：越小越平滑（帧率无关）
const POSITION_DAMPING = 3.0;
// 注视点阻尼
const LOOKAT_DAMPING = 5.0;

export default function TrackingCamera() {
  const { camera } = useThree();
  const trackedOrganismId = useEcoStore(s => s.trackedOrganismId);
  const organisms = useEcoStore(s => s.organisms);

  // 平滑后的相机目标位置
  const smoothedCamPos = useRef(new THREE.Vector3(10, 7, 12));
  // 平滑后的注视点
  const smoothedLookAt = useRef(new THREE.Vector3(0, 0, 0));
  // 标记是否刚进入追踪，需要快速定位
  const justActivated = useRef(false);

  useEffect(() => {
    if (trackedOrganismId) {
      justActivated.current = true;
    }
  }, [trackedOrganismId]);

  // 初始化平滑值
  useEffect(() => {
    smoothedCamPos.current.copy(camera.position);
  }, [camera]);

  useFrame((_state, delta) => {
    if (!trackedOrganismId) {
      // 非追踪模式不做任何相机控制，交给 OrbitControls
      return;
    }

    const trackedOrg = organisms.find(o => o.id === trackedOrganismId);
    if (!trackedOrg || !trackedOrg.alive) return;

    // 计算理想相机位置（生物后上方）
    const idealPos = new THREE.Vector3(
      trackedOrg.position[0] - Math.sin(trackedOrg.rotation) * FOLLOW_DISTANCE,
      trackedOrg.position[1] + FOLLOW_HEIGHT,
      trackedOrg.position[2] - Math.cos(trackedOrg.rotation) * FOLLOW_DISTANCE
    );

    const idealLookAt = new THREE.Vector3(
      trackedOrg.position[0],
      trackedOrg.position[1] + 0.3,
      trackedOrg.position[2]
    );

    // 刚激活时快速到位，之后平滑跟随
    const posDamping = justActivated.current
      ? 1.0
      : 1 - Math.exp(-POSITION_DAMPING * delta);
    const lookDamping = justActivated.current
      ? 1.0
      : 1 - Math.exp(-LOOKAT_DAMPING * delta);

    smoothedCamPos.current.lerp(idealPos, posDamping);
    smoothedLookAt.current.lerp(idealLookAt, lookDamping);

    camera.position.copy(smoothedCamPos.current);
    camera.lookAt(smoothedLookAt.current);

    justActivated.current = false;
  });

  return null;
}
