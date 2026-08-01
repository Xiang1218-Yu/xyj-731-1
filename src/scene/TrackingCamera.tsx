import { useThree, useFrame } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { useStore, useDisplayedOrganisms } from '../state/store';

interface TrackingCameraProps {
  /** OrbitControls 引用，用于在追踪时接管 target */
  controlsRef: React.RefObject<OrbitControlsImpl>;
}

/**
 * 追踪相机控制器。
 * 采用「位移跟随」策略而非强制回到固定机位：
 * - 相机与控制目标点都按生物本帧的位移量平移，从而始终跟随生物移动；
 * - 用户仍可自由旋转 / 缩放（保留自己设定的观察角度与距离），
 *   因为我们不会每帧把相机拉回某个固定偏移，避免与手动操控相互拉扯导致抖动；
 * - 目标点额外做一次很轻的校正插值，缓慢纠正累计漂移，保持生物居中。
 * 未追踪时完全不干预相机。
 */
export function TrackingCamera({ controlsRef }: TrackingCameraProps): null {
  const { camera } = useThree();
  const trackedId = useStore((s) => s.trackedId);
  const organisms = useDisplayedOrganisms();

  // 上一帧目标位置，用于计算位移量；hasPrev 表示是否已建立参考。
  const prevTarget = useRef(new THREE.Vector3());
  const hasPrev = useRef(false);
  // 用户是否正在拖拽/缩放（拖拽期间不做校正插值，避免争抢）。
  const userInteracting = useRef(false);

  // 复用临时向量，避免每帧分配。
  const curTarget = useRef(new THREE.Vector3());
  const delta = useRef(new THREE.Vector3());

  // 追踪目标切换时重置参考，防止用位移做跳变。
  useEffect(() => {
    hasPrev.current = false;
  }, [trackedId]);

  // 监听 OrbitControls 交互开始/结束。
  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    const onStart = (): void => {
      userInteracting.current = true;
    };
    const onEnd = (): void => {
      userInteracting.current = false;
    };
    controls.addEventListener('start', onStart);
    controls.addEventListener('end', onEnd);
    return () => {
      controls.removeEventListener('start', onStart);
      controls.removeEventListener('end', onEnd);
    };
  }, [controlsRef]);

  useFrame(() => {
    if (trackedId === null) return;
    const target = organisms.find((o) => o.id === trackedId);
    if (!target) return;

    curTarget.current.set(target.position.x, target.position.y, target.position.z);
    const controls = controlsRef.current;

    if (hasPrev.current) {
      // 生物本帧位移量
      delta.current.subVectors(curTarget.current, prevTarget.current);
      // 相机与目标点一起平移，保留用户设定的相对角度与距离
      camera.position.add(delta.current);
      if (controls) {
        controls.target.add(delta.current);
        // 轻微校正插值，缓慢把目标点拉回生物中心（拖拽时跳过，避免争抢）
        if (!userInteracting.current) {
          controls.target.lerp(curTarget.current, 0.05);
        }
        controls.update();
      } else {
        camera.lookAt(curTarget.current);
      }
    } else if (controls) {
      // 首帧：把目标点对准生物，作为后续位移跟随的基准
      controls.target.copy(curTarget.current);
      controls.update();
    }

    prevTarget.current.copy(curTarget.current);
    hasPrev.current = true;
  });

  return null;
}
