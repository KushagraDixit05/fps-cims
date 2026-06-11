"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  Shield,
  Key,
  ClipboardCheck,
  BarChart3,
  ScrollText,
  LogOut,
  Sprout,
  Store,
  FlaskConical,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { initials } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/users", label: "Users", icon: Users },
  { href: "/roles", label: "Roles", icon: Shield },
  { href: "/permissions", label: "Permissions", icon: Key },
  { href: "/approvals", label: "Approvals", icon: ClipboardCheck },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/audit", label: "Audit Log", icon: ScrollText },
];

function NavItem({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  active: boolean;
}) {
  return (
    <Link href={href} className="block">
      <div
        className={cn(
          "relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
          active
            ? "bg-white/10 text-white"
            : "text-white/55 hover:bg-white/8 hover:text-white/80"
        )}
      >
        {active && (
          <motion.div
            layoutId="sidebar-active"
            className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-white rounded-r-full"
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          />
        )}
        <Icon className="h-4.5 w-4.5 shrink-0" strokeWidth={1.75} />
        <span>{label}</span>
      </div>
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

  function isActive(href: string): boolean {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col bg-fps-primary select-none">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white overflow-hidden">
          <Image src="/fps-logo.jpeg" alt="FPS Logo" width={36} height={36} className="object-cover w-full h-full" />
        </div>
        <div>
          <p className="text-[15px] font-bold text-white leading-tight">FPS Admin</p>
          <p className="text-[10px] text-white/50 font-medium uppercase tracking-wider">
            Farm Prosperity Solutions
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 px-3 mb-2">
          Operations
        </p>
        {NAV_ITEMS.map((item) => (
          <NavItem key={item.href} {...item} active={isActive(item.href)} />
        ))}

        <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 px-3 mt-4 mb-2">
          Field Data
        </p>
        <NavItem href="/field-data/visits" label="Farmer Visits" icon={Sprout} active={isActive("/field-data/visits")} />
        <NavItem href="/field-data/mandi" label="Mandi Arrivals" icon={Store} active={isActive("/field-data/mandi")} />
        <NavItem href="/field-data/demos" label="Product Demos" icon={FlaskConical} active={isActive("/field-data/demos")} />
      </nav>

      {/* User footer */}
      <div className="border-t border-white/10 px-3 py-3">
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-white/8 transition-colors">
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarFallback className="bg-white/20 text-white text-xs font-bold">
              {initials(user?.full_name ?? user?.username ?? "A")}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-white truncate">
              {user?.full_name ?? user?.username}
            </p>
            <p className="text-[10px] text-white/50 capitalize truncate">
              {user?.role?.replace(/_/g, " ")}
            </p>
          </div>
          <button
            onClick={logout}
            className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Logout"
          >
            <LogOut className="h-3.5 w-3.5" strokeWidth={1.75} />
          </button>
        </div>
      </div>
    </aside>
  );
}
