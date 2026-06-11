import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-[8px] px-2.5 py-0.5 text-xs font-semibold border transition-colors",
  {
    variants: {
      variant: {
        default: "bg-fps-primary-light text-fps-primary border-fps-primary/20",
        secondary: "bg-fps-canvas text-fps-secondary border-fps-border",
        good: "bg-status-good-bg text-status-good-text border-[#1A8A3A]/20",
        warn: "bg-status-warn-bg text-status-warn-text border-[#C8900A]/20",
        error: "bg-status-error-bg text-status-error-text border-[#D63333]/20",
        info: "bg-status-info-bg text-status-info-text border-[#185FA5]/20",
        preset: "bg-fps-primary text-white border-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
