"use client";

import { usePathname } from "next/navigation";
import { Bell } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { initials } from "@/lib/utils";

const PAGE_TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/users": "User Management",
  "/roles": "Role Management",
  "/permissions": "Permission Catalogue",
  "/approvals": "Approval Queue",
  "/analytics": "Analytics",
  "/audit": "Audit Log",
};

function getBreadcrumb(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return "Dashboard";
  const base = "/" + segments[0];
  const title = PAGE_TITLES[base] ?? segments[0];
  if (segments.length > 1) return `${title} / ${segments[1]}`;
  return title;
}

export function TopBar() {
  const pathname = usePathname();
  const { user } = useAuthStore();

  return (
    <header className="h-14 border-b border-fps-border bg-white flex items-center justify-between px-6 shrink-0">
      <div>
        <p className="text-[15px] font-semibold text-fps-ink">{getBreadcrumb(pathname)}</p>
      </div>
      <div className="flex items-center gap-3">
        <button className="relative p-2 rounded-xl text-fps-secondary hover:bg-fps-canvas hover:text-fps-ink transition-colors cursor-pointer">
          <Bell className="h-4.5 w-4.5" strokeWidth={1.75} />
        </button>
        <div className="flex items-center gap-2 pl-2 border-l border-fps-divider">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs font-bold">
              {initials(user?.full_name ?? user?.username ?? "A")}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-[13px] font-semibold text-fps-ink leading-tight">
              {user?.full_name ?? user?.username}
            </p>
            <p className="text-[10px] text-fps-muted capitalize">
              {user?.role?.replace(/_/g, " ")}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
