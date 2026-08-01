import { useStore, useDisplayedOrganisms } from '../state/store';
import { getSpecies } from '../domain/species';
import type { Chronotype } from '../domain/types';

/** 作息类型中文标签 */
const CHRONO_LABEL: Record<Chronotype, string> = {
  diurnal: '昼行性',
  nocturnal: '夜行性',
  cathemeral: '全天活动',
};

/**
 * 追踪信息面板：展示当前被追踪生物的实时数据。
 * 数据随模拟每帧刷新（能量、位置、速度、状态等）。
 */
export function InfoPanel(): JSX.Element | null {
  const trackedId = useStore((s) => s.trackedId);
  const trackOrganism = useStore((s) => s.trackOrganism);
  const organisms = useDisplayedOrganisms();

  if (trackedId === null) {
    return (
      <div className="panel info-panel">
        <h2 className="panel-title">🔍 追踪模式</h2>
        <p className="hint">点击缸内任意生物即可进入追踪模式，相机将自动跟随。</p>
      </div>
    );
  }

  const org = organisms.find((o) => o.id === trackedId);
  if (!org) {
    return (
      <div className="panel info-panel">
        <h2 className="panel-title">🔍 追踪模式</h2>
        <p className="hint">该生物已离开生态缸（被捕食或能量耗尽）。</p>
        <button className="btn" onClick={() => trackOrganism(null)}>
          结束追踪
        </button>
      </div>
    );
  }

  const species = getSpecies(org.speciesId);
  const speed = Math.sqrt(
    org.velocity.x ** 2 + org.velocity.y ** 2 + org.velocity.z ** 2,
  );

  return (
    <div className="panel info-panel tracking-active">
      <h2 className="panel-title">
        🎯 正在追踪：{species.icon} {species.name}
      </h2>
      <div className="info-grid">
        <div className="info-row">
          <span className="info-label">作息</span>
          <span className="info-value">{CHRONO_LABEL[species.chronotype]}</span>
        </div>
        <div className="info-row">
          <span className="info-label">状态</span>
          <span className="info-value">
            {org.asleep ? '😴 休眠中' : '🟢 活跃'}
          </span>
        </div>
        <div className="info-row">
          <span className="info-label">能量</span>
          <span className="info-value">
            {org.energy.toFixed(1)} / {species.reproduceThreshold}
          </span>
        </div>
        <div className="info-row energy-bar-row">
          <div className="energy-bar">
            <div
              className="energy-bar-fill"
              style={{
                width: `${Math.min(100, (org.energy / species.reproduceThreshold) * 100)}%`,
                background: species.color,
              }}
            />
          </div>
        </div>
        <div className="info-row">
          <span className="info-label">年龄</span>
          <span className="info-value">{org.age.toFixed(1)} 秒</span>
        </div>
        <div className="info-row">
          <span className="info-label">速度</span>
          <span className="info-value">{speed.toFixed(2)} 单位/秒</span>
        </div>
        <div className="info-row">
          <span className="info-label">位置</span>
          <span className="info-value">
            ({org.position.x.toFixed(1)}, {org.position.y.toFixed(1)},{' '}
            {org.position.z.toFixed(1)})
          </span>
        </div>
      </div>
      <p className="species-desc-text">{species.description}</p>
      {species.nightBehavior && (
        <p className="night-behavior-text">🌙 夜间习性：{species.nightBehavior}</p>
      )}
      <button className="btn" onClick={() => trackOrganism(null)}>
        结束追踪
      </button>
    </div>
  );
}
