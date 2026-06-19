import type { GeoAggregateFeature } from '@/types/geo';

export function DistrictTip({ feature }: { feature: GeoAggregateFeature }) {
  const p = feature.properties;
  const score = Math.round((p.score ?? 0) * 100);
  return (
    <div className="glass-tip">
      <p className="tip-title">{p.name}</p>
      <div className="tip-row">
        <span className="tip-stat">{p.count} records</span>
        <span className="tip-sep" />
        <span className="tip-stat">Score {score}%</span>
      </div>
      <div className="tip-row" style={{ marginTop: 4 }}>
        <span style={{ color: '#34E08A' }}>{p.good}↑</span>
        <span style={{ color: '#F5C542', marginLeft: 8 }}>{p.average}~</span>
        <span style={{ color: '#FB6A6A', marginLeft: 8 }}>{p.poor}↓</span>
      </div>
      <p className="tip-label" style={{ marginTop: 4 }}>Click for full breakdown</p>
    </div>
  );
}
