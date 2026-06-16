"use client";
import { motion, AnimatePresence } from 'framer-motion';
import { X, TrendingUp, Users, Leaf, BarChart2 } from 'lucide-react';
import { PieChart, Pie, Cell, AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts';
import { useMapStore } from '@/store/mapStore';
import { useGeoRegionSummary } from '@/hooks/useGeoData';
import { SPRING } from '@/lib/mapMotion';
import type { RegionSummary } from '@/types/geo';

function KpiCard({ label, value, icon: Icon }: { label: string; value: string | number; icon: React.ElementType }) {
  return (
    <div className="flex items-center gap-2.5 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--glass-stroke)' }}>
      <div className="p-1.5 rounded-lg" style={{ background: 'rgba(52,224,138,.12)' }}>
        <Icon className="h-3.5 w-3.5" style={{ color: 'var(--accent)' }} strokeWidth={1.75} />
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-lo)' }}>{label}</p>
        <p className="text-sm font-bold" style={{ color: 'var(--text-hi)' }}>{value}</p>
      </div>
    </div>
  );
}

const PIE_COLORS = ['#34E08A', '#F5C542', '#22D3EE', '#FB6A6A', '#A78BFA', '#F97316', '#10B981', '#6366F1'];

export function InsightPanel() {
  const revealStage       = useMapStore((s) => s.revealStage);
  const selectedId        = useMapStore((s) => s.selectedFeatureId);
  const selectedLevel     = useMapStore((s) => s.selectedLevel);
  const setSelectedFeature = useMapStore((s) => s.setSelectedFeature);

  const { data: rawData, isLoading } = useGeoRegionSummary(selectedLevel, selectedId);
  const data = rawData as RegionSummary | undefined;

  if (revealStage < 2) return null;

  return (
    <AnimatePresence>
      {selectedId && (
        <motion.aside
          key="insight"
          initial={{ x: 360, opacity: 0 }}
          animate={{ x: 0,   opacity: 1 }}
          exit={{ x: 360, opacity: 0 }}
          transition={SPRING.panel}
          className="absolute right-3 top-16 bottom-24 z-40 w-80 flex flex-col overflow-hidden rounded-2xl"
          style={{
            background:     'var(--glass-fill)',
            border:         '1px solid var(--glass-stroke)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            boxShadow:      '0 8px 48px rgba(0,0,0,.5)',
          }}
        >
          {/* Header */}
          <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: 'var(--glass-stroke)' }}>
            <div className="flex-1">
              <p className="text-xs font-bold truncate" style={{ color: 'var(--text-hi)' }}>{selectedId}</p>
              <p className="text-[10px] capitalize" style={{ color: 'var(--text-lo)' }}>{selectedLevel}</p>
            </div>
            <button
              onClick={() => setSelectedFeature(null)}
              className="p-1.5 rounded-lg transition-colors"
              style={{ color: 'var(--text-lo)' }}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
            {isLoading && (
              <div className="space-y-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-14 rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.05)' }} />
                ))}
              </div>
            )}

            {data && (
              <>
                {/* KPIs */}
                <div className="grid grid-cols-2 gap-2">
                  <KpiCard label="Visits"   value={data.kpis.total_visits} icon={TrendingUp} />
                  <KpiCard label="Demos"    value={data.kpis.total_demos}  icon={Leaf} />
                  <KpiCard label="Score"    value={`${Math.round(data.kpis.score * 100)}%`} icon={BarChart2} />
                  <KpiCard label="Execs"    value={data.top_execs.length}  icon={Users} />
                </div>

                {/* Condition breakdown */}
                <div>
                  <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: 'var(--text-lo)' }}>Condition</p>
                  <div className="flex gap-2 text-xs" style={{ color: 'var(--text-mid)' }}>
                    {[
                      { label: 'Good',    count: data.kpis.good,    color: '#34E08A' },
                      { label: 'Average', count: data.kpis.average, color: '#F5C542' },
                      { label: 'Poor',    count: data.kpis.poor,    color: '#FB6A6A' },
                    ].map(({ label, count, color }) => (
                      <div key={label} className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full" style={{ background: color }} />
                        <span>{count} {label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Crop split donut */}
                {data.crop_split.length > 0 && (
                  <div>
                    <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: 'var(--text-lo)' }}>Crop Split</p>
                    <div className="flex items-center gap-3">
                      <PieChart width={80} height={80}>
                        <Pie
                          data={data.crop_split}
                          dataKey="count"
                          nameKey="crop_name"
                          innerRadius={24}
                          outerRadius={36}
                          strokeWidth={0}
                        >
                          {data.crop_split.map((_item: { crop_name: string; count: number }, i: number) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                      </PieChart>
                      <div className="flex-1 space-y-0.5">
                        {data.crop_split.slice(0, 4).map((c: { crop_name: string; count: number }, i: number) => (
                          <div key={c.crop_name} className="flex items-center justify-between text-[11px]">
                            <div className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                              <span style={{ color: 'var(--text-mid)' }}>{c.crop_name}</span>
                            </div>
                            <span style={{ color: 'var(--text-lo)' }}>{c.count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Trend sparkline */}
                {data.trend.length > 0 && (
                  <div>
                    <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: 'var(--text-lo)' }}>30-day Trend</p>
                    <ResponsiveContainer width="100%" height={56}>
                      <AreaChart data={data.trend} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                        <defs>
                          <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor="#34E08A" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#34E08A" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <Tooltip
                          contentStyle={{ background: 'var(--glass-fill)', border: '1px solid var(--glass-stroke)', borderRadius: 8, fontSize: 11 }}
                          labelStyle={{ color: 'var(--text-lo)' }}
                          itemStyle={{ color: 'var(--accent)' }}
                        />
                        <Area type="monotone" dataKey="count" stroke="#34E08A" strokeWidth={1.5} fill="url(#trendGrad)" dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Top execs */}
                {data.top_execs.length > 0 && (
                  <div>
                    <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: 'var(--text-lo)' }}>Top Executives</p>
                    <div className="space-y-2">
                      {data.top_execs.map((exec: { id: number; name: string; count: number }, i: number) => {
                        const pct = Math.round((exec.count / data.top_execs[0].count) * 100);
                        return (
                          <div key={exec.id} className="space-y-0.5">
                            <div className="flex justify-between text-xs">
                              <span style={{ color: 'var(--text-mid)' }}>{exec.name || 'Unknown'}</span>
                              <span style={{ color: 'var(--text-lo)' }}>{exec.count}</span>
                            </div>
                            <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                              <motion.div
                                className="h-full rounded-full"
                                style={{ background: 'var(--accent)' }}
                                initial={{ width: 0 }}
                                animate={{ width: `${pct}%` }}
                                transition={{ ...SPRING.counter, delay: i * 0.05 }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
