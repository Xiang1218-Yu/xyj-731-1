import { useState, useRef, useEffect, useMemo } from 'react';
import { useEcoStore } from '../../store/ecoStore';
import type { Snapshot } from '../../types';
import './Timeline.css';

// ============================================================
// 时间轴组件：记录历史快照，支持暂停后拖动回看
// ============================================================

export default function Timeline() {
  const snapshots = useEcoStore(s => s.snapshots);
  const ecoTime = useEcoStore(s => s.ecoTime);
  const viewingTimestamp = useEcoStore(s => s.viewingTimestamp);
  const setViewingTimestamp = useEcoStore(s => s.setViewingTimestamp);
  const isPaused = useEcoStore(s => s.isPaused);
  const togglePause = useEcoStore(s => s.togglePause);
  const setTrackedOrganism = useEcoStore(s => s.setTrackedOrganism);

  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const minTime = snapshots.length > 0 ? snapshots[0].timestamp : 0;
  const maxTime = ecoTime.elapsed;
  const currentTime = viewingTimestamp ?? ecoTime.elapsed;

  const progress = maxTime > minTime
    ? ((currentTime - minTime) / (maxTime - minTime)) * 100
    : 0;

  // 找到当前查看的快照
  const currentSnapshot = useMemo<Snapshot | null>(() => {
    if (viewingTimestamp === null || snapshots.length === 0) return null;
    return snapshots.reduce<Snapshot | null>((acc, snap) => {
      if (!acc) return snap;
      return Math.abs(snap.timestamp - viewingTimestamp) <
        Math.abs(acc.timestamp - viewingTimestamp)
        ? snap
        : acc;
    }, null);
  }, [viewingTimestamp, snapshots]);

  // 拖动逻辑
  const handleTrackInteraction = (clientX: number) => {
    if (!trackRef.current || snapshots.length < 2) return;
    const rect = trackRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const ts = minTime + ratio * (maxTime - minTime);
    setViewingTimestamp(ts);
    setTrackedOrganism(null);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isPaused) togglePause();
    setIsDragging(true);
    handleTrackInteraction(e.clientX);
  };

  useEffect(() => {
    if (!isDragging) return;
    const handleMove = (e: MouseEvent) => handleTrackInteraction(e.clientX);
    const handleUp = () => setIsDragging(false);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [isDragging, minTime, maxTime]);

  const formatTime = (sec: number): string => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // 总能量曲线数据点
  const energyPoints = snapshots.map(s => s.totalEnergy);
  const maxEnergy = Math.max(...energyPoints, 1);

  return (
    <div className={`timeline-panel ${viewingTimestamp !== null ? 'viewing' : ''}`}>
      <div className="timeline-header">
        <div className="timeline-info">
          <span className="timeline-label">
            {viewingTimestamp !== null ? '⏪ 回看模式' : '⏱ 实时仿真'}
          </span>
          {currentSnapshot && (
            <span className="snapshot-info">
              | 生物数: {currentSnapshot.organisms.length} |
              总能量: {Math.round(currentSnapshot.totalEnergy)} |
              时间: {Math.floor(currentSnapshot.ecoTime.hourOfDay)}:
              {Math.floor((currentSnapshot.ecoTime.hourOfDay % 1) * 60).toString().padStart(2, '0')}
              {currentSnapshot.ecoTime.isDaytime ? ' ☀️' : ' 🌙'}
            </span>
          )}
        </div>
        <div className="timeline-time">
          {formatTime(currentTime)} / {formatTime(maxTime)}
        </div>
      </div>

      <div className="timeline-track-wrapper">
        {/* 能量曲线背景 */}
        <svg className="energy-chart" viewBox={`0 0 ${snapshots.length} 100`} preserveAspectRatio="none">
          {snapshots.length > 1 && (
            <path
              d={snapshots
                .map((s, i) => {
                  const x = (i / (snapshots.length - 1)) * 100;
                  const y = 100 - (s.totalEnergy / maxEnergy) * 90 - 5;
                  return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                })
                .join(' ')}
              fill="none"
              stroke="rgba(76, 175, 80, 0.5)"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          )}
        </svg>

        <div
          ref={trackRef}
          className="timeline-track"
          onMouseDown={handleMouseDown}
        >
          {/* 快照刻度 */}
          {snapshots.map((snap, i) => {
            const pos = snapshots.length > 1
              ? (i / (snapshots.length - 1)) * 100
              : 0;
            return (
              <div
                key={snap.timestamp}
                className="snapshot-tick"
                style={{
                  left: `${pos}%`,
                  height: `${Math.max(4, (snap.organisms.length / 30) * 20)}px`,
                  opacity: snap.ecoTime.isDaytime ? 1 : 0.5
                }}
                title={`时间: ${formatTime(snap.timestamp)}, 生物: ${snap.organisms.length}`}
              />
            );
          })}

          {/* 进度条 */}
          <div
            className="timeline-progress"
            style={{ width: `${progress}%` }}
          />

          {/* 播放头 */}
          <div
            className="timeline-playhead"
            style={{ left: `${progress}%` }}
          >
            <div className="playhead-line" />
            <div className="playhead-handle" />
          </div>
        </div>
      </div>

      {viewingTimestamp !== null && (
        <div className="timeline-actions">
          <button
            className="resume-btn"
            onClick={() => {
              setViewingTimestamp(null);
            }}
          >
            ▶ 返回实时
          </button>
        </div>
      )}
    </div>
  );
}
