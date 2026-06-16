import type { FlowArc } from '@/types/geo';

export function FlowTip({ feature }: { feature: FlowArc }) {
  return (
    <div className="glass-tip">
      <p className="tip-title">{feature.label}</p>
      <p className="tip-stat">{feature.weight} arrivals</p>
    </div>
  );
}
