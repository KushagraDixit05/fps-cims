"use client";

import { use } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, MapPin, Phone, Briefcase, Shield } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/common/PageHeader";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useUser } from "@/hooks/useUsers";
import { useUserPermissions } from "@/hooks/usePermissions";
import { formatDate, initials } from "@/lib/utils";

export default function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: user, isLoading } = useUser(Number(id));
  const { data: overrides } = useUserPermissions(Number(id));

  if (isLoading) {
    return <div className="animate-pulse h-96 rounded-2xl bg-fps-border/40" />;
  }
  if (!user) return <div className="text-fps-muted">User not found</div>;

  const name = user.full_name ?? (`${user.first_name} ${user.last_name}`.trim() || user.username);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-5 max-w-4xl mx-auto"
    >
      <div className="flex items-center gap-3 mb-1">
        <Button variant="ghost" size="icon-sm" asChild>
          <Link href="/users">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <span className="text-sm text-fps-muted">Users</span>
      </div>

      <PageHeader title={name} description={`@${user.username} · Employee ID: ${user.employee_id ?? "—"}`} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Profile Card */}
        <Card className="lg:col-span-1">
          <CardContent className="pt-6 flex flex-col items-center text-center gap-3">
            <Avatar className="h-20 w-20">
              <AvatarFallback className="text-2xl font-bold">{initials(name)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-[17px] font-bold text-fps-ink">{name}</p>
              <p className="text-sm text-fps-muted">@{user.username}</p>
            </div>
            <StatusBadge status={user.is_active ? "active" : "inactive"} />

            <div className="w-full space-y-2.5 pt-3 border-t border-fps-divider text-left">
              {user.phone_number && (
                <div className="flex items-center gap-2 text-sm text-fps-secondary">
                  <Phone className="h-3.5 w-3.5 text-fps-muted shrink-0" />
                  {user.phone_number}
                </div>
              )}
              {user.state && (
                <div className="flex items-center gap-2 text-sm text-fps-secondary">
                  <MapPin className="h-3.5 w-3.5 text-fps-muted shrink-0" />
                  {user.state}
                </div>
              )}
              {user.employee_id && (
                <div className="flex items-center gap-2 text-sm text-fps-secondary">
                  <Briefcase className="h-3.5 w-3.5 text-fps-muted shrink-0" />
                  {user.employee_id}
                </div>
              )}
              <div className="flex items-center gap-2 text-sm text-fps-secondary">
                <Shield className="h-3.5 w-3.5 text-fps-muted shrink-0" />
                {user.primary_role?.name ?? user.role ?? "No role"}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Details */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Account Details</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              {[
                { label: "Email", value: user.email ?? "—" },
                { label: "Joined", value: formatDate(user.date_joined) },
                { label: "Last Login", value: user.last_login ? formatDate(user.last_login) : "Never" },
                { label: "Districts", value: user.districts?.join(", ") || "—" },
              ].map((item) => (
                <div key={item.label}>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-fps-muted mb-0.5">{item.label}</p>
                  <p className="text-sm font-medium text-fps-ink">{item.value}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Permission Overrides</CardTitle>
            </CardHeader>
            <CardContent>
              {!overrides || overrides.length === 0 ? (
                <p className="text-sm text-fps-muted">No individual permission overrides</p>
              ) : (
                <div className="space-y-2">
                  {overrides.map((o) => (
                    <div key={o.id} className="flex items-center justify-between py-2 border-b border-fps-divider last:border-0">
                      <div>
                        <p className="text-sm font-medium text-fps-ink">
                          {o.permission_label ?? o.permission_codename ?? o.permission}
                        </p>
                        <p className="text-xs text-fps-muted">{o.reason}</p>
                      </div>
                      <Badge variant={o.effect === "allow" ? "good" : "error"}>
                        {o.effect}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </motion.div>
  );
}
