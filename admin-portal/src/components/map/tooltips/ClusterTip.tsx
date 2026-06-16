interface ClusterFeature {
  properties: { cluster: boolean; point_count?: number; module?: string };
}

export function ClusterTip({ feature }: { feature: ClusterFeature }) {
  const p = feature.properties;
  return (
    <div className="glass-tip">
      {p.cluster ? (
        <>
          <p className="tip-title">{p.point_count} records</p>
          <p className="tip-stat">Click to expand</p>
        </>
      ) : (
        <>
          <p className="tip-title">Record</p>
          <p className="tip-stat capitalize">{p.module}</p>
        </>
      )}
    </div>
  );
}
