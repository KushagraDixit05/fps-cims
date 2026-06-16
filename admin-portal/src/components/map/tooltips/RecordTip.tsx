import type { GeoPointFeature } from '@/types/geo';

const MODULE_LABEL: Record<string, string> = {
  visit: 'Farmer Visit',
  demo:  'Product Demo',
  mandi: 'Mandi Arrival',
};

export function RecordTip({ feature }: { feature: GeoPointFeature }) {
  const p = feature.properties;
  return (
    <div className="glass-tip">
      <p className="tip-label">{MODULE_LABEL[p.module] ?? p.module}</p>
      {p.farmer   && <p className="tip-title">{p.farmer}</p>}
      {p.mandi    && <p className="tip-title">{p.mandi}</p>}
      {p.district && <p className="tip-stat">{p.block ? `${p.block}, ` : ''}{p.district}</p>}
      {p.crop     && <p className="tip-stat">Crop: {p.crop}</p>}
      {p.commodity && <p className="tip-stat">Commodity: {p.commodity}</p>}
      {p.condition && (
        <span className={`tip-badge tip-badge--${p.condition}`}>{p.condition}</span>
      )}
    </div>
  );
}
