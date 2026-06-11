"use client";

import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface KPICardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  trend?: { value: number; label: string };
  index?: number;
  className?: string;
}

export function KPICard({
  label,
  value,
  subtext,
  icon: Icon,
  iconColor = "#1A4A2E",
  iconBg = "#E1F2E8",
  trend,
  index = 0,
  className,
}: KPICardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.06, ease: "easeOut" }}
    >
      <Card className={cn("p-5 cursor-default", className)}>
        <CardContent className="p-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wider text-fps-muted mb-2">
                {label}
              </p>
              <p className="text-3xl font-extrabold text-fps-ink leading-none">{value}</p>
              {subtext && (
                <p className="text-xs text-fps-secondary mt-1.5">{subtext}</p>
              )}
              {trend && (
                <p
                  className={cn(
                    "text-xs font-semibold mt-1.5",
                    trend.value >= 0 ? "text-status-good-text" : "text-status-error-text"
                  )}
                >
                  {trend.value >= 0 ? "↑" : "↓"} {Math.abs(trend.value)}% {trend.label}
                </p>
              )}
            </div>
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
              style={{ background: iconBg }}
            >
              <Icon className="h-5 w-5" style={{ color: iconColor }} strokeWidth={1.75} />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
