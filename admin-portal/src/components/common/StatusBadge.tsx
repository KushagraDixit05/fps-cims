import { Badge } from "@/components/ui/badge";
import type { VariantProps } from "class-variance-authority";
import type { badgeVariants } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Status =
  | "approved"
  | "active"
  | "submitted"
  | "under_review"
  | "resubmitted"
  | "escalated"
  | "rejected"
  | "inactive"
  | "cancelled"
  | "draft"
  | "revision_requested"
  | "pending"
  | string;

function statusToVariant(status: Status): VariantProps<typeof badgeVariants>["variant"] {
  switch (status) {
    case "approved":
    case "active":
      return "good";
    case "submitted":
    case "under_review":
    case "resubmitted":
    case "pending":
      return "warn";
    case "escalated":
      return "info";
    case "rejected":
    case "inactive":
    case "cancelled":
      return "error";
    default:
      return "secondary";
  }
}

function statusLabel(status: Status): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

interface StatusBadgeProps {
  status: Status;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <Badge variant={statusToVariant(status)} className={cn("capitalize", className)}>
      {statusLabel(status)}
    </Badge>
  );
}
