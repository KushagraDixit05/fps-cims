"use client";

import { Sprout, TrendingUp, FlaskConical, MapPin, Clock } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useRecentActivities } from "@/hooks/useAnalytics";
import { formatRelative } from "@/lib/utils";

const MODULE_CONFIG = {
  crops: { label: "Crop Intel", icon: Sprout, color: "#1A4A2E", bg: "#E1F2E8" },
  mandi: { label: "Market Intel", icon: TrendingUp, color: "#C8900A", bg: "#FEF3DA" },
  product_demo: { label: "Product Demo", icon: FlaskConical, color: "#185FA5", bg: "#E6F1FB" },
} as const;

export function ActivityFeed() {
  const { data: activities, isLoading } = useRecentActivities(15);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activities</CardTitle>
        <p className="text-xs text-fps-muted">Combined feed from all field intelligence modules</p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="h-8 w-8 rounded-lg bg-fps-canvas shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 bg-fps-canvas rounded w-1/2" />
                  <div className="h-2.5 bg-fps-canvas rounded w-1/3" />
                </div>
                <div className="h-3 w-16 bg-fps-canvas rounded" />
              </div>
            ))}
          </div>
        ) : !activities || activities.length === 0 ? (
          <div className="flex items-center justify-center text-fps-muted text-sm py-10">
            No recent activity
          </div>
        ) : (
          <div className="space-y-0">
            {activities.map((activity, i) => {
              const cfg = MODULE_CONFIG[activity.module];
              const Icon = cfg.icon;
              return (
                <div
                  key={activity.id}
                  className={`flex items-center gap-3 py-3 ${i < activities.length - 1 ? "border-b border-fps-divider" : ""}`}
                >
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                    style={{ background: cfg.bg }}
                  >
                    <Icon className="h-4 w-4" style={{ color: cfg.color }} strokeWidth={1.75} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: cfg.color }}>
                        {cfg.label}
                      </span>
                      <span className="text-[11px] text-fps-muted">·</span>
                      <span className="text-[13px] font-semibold text-fps-ink truncate">{activity.crop}</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5 text-xs text-fps-muted flex-wrap">
                      <span>{activity.user}</span>
                      {activity.farmer !== "—" && (
                        <>
                          <span>·</span>
                          <span>{activity.farmer}</span>
                        </>
                      )}
                      <span>·</span>
                      <span className="flex items-center gap-0.5">
                        <MapPin className="h-3 w-3" />
                        {activity.location}
                      </span>
                    </div>
                  </div>
                  <div className="shrink-0 flex items-center gap-1 text-[11px] text-fps-muted">
                    <Clock className="h-3 w-3" />
                    {formatRelative(activity.timestamp)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
