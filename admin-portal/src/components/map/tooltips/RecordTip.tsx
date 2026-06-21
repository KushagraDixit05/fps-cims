import type { GeoPointFeature } from '@/types/geo';

const MODULE_LABEL: Record<string, string> = {
  visit: 'Crop Intelligence Module',
  demo:  'Product Performance Module',
  mandi: 'Market Intelligence Module',
};

export function RecordTip({ feature }: { feature: GeoPointFeature }) {
  const p = feature.properties;
  const locationParts = [p.village, p.block, p.district].filter(Boolean).join(', ');
  return (
    <div className="glass-tip">
      <p className="tip-label">{MODULE_LABEL[p.module] ?? p.module}</p>
      {p.farmer    && <p className="tip-title">{p.farmer}</p>}
      {p.mandi     && <p className="tip-title">{p.mandi}</p>}
      {locationParts && <p className="tip-stat">{locationParts}</p>}
      {p.crop      && <p className="tip-stat">Crop: {p.crop}</p>}
      {p.commodity && <p className="tip-stat">Commodity: {p.commodity}</p>}
      {p.date      && <p className="tip-stat">{p.date}</p>}
      {p.condition && (
        <span className={`tip-badge tip-badge--${p.condition}`}>{p.condition}</span>
      )}
    </div>
  );
}
