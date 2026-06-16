import type { GeoAggregateFeature } from '@/types/geo';

export function HeatTip({ feature }: { feature: GeoAggregateFeature }) {
  const p = feature.properties;
  return (
    <div className="glass-tip">
      <p className="tip-title">{p.name}</p>
      <p className="tip-stat">{p.count} records</p>
      <div className="tip-row">
        <span style={{ color: '#34E08A' }}>●</span> {p.good} good
        <span className="tip-sep" />
        <span style={{ color: '#F5C542' }}>●</span> {p.average} avg
        <span className="tip-sep" />
        <span style={{ color: '#FB6A6A' }}>●</span> {p.poor} poor
      </div>
    </div>
  );
}
