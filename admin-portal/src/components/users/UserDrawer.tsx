"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetBody,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateUser, useUpdateUser } from "@/hooks/useUsers";
import { useRoles } from "@/hooks/useRoles";
import type { User } from "@/types/models";

interface UserDrawerProps {
  open: boolean;
  onClose: () => void;
  user?: User | null;
}

export function UserDrawer({ open, onClose, user }: UserDrawerProps) {
  const isEdit = !!user;
  const { data: roles } = useRoles();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser(user?.id ?? 0);

  const [form, setForm] = useState({
    username: "",
    password: "",
    full_name: "",
    phone_number: "",
    employee_id: "",
    state: "",
    primary_role_code: "",
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setForm({
        username: user.username,
        password: "",
        full_name: user.full_name ?? `${user.first_name} ${user.last_name}`.trim(),
        phone_number: user.phone_number ?? "",
        employee_id: user.employee_id ?? "",
        state: user.state ?? "",
        primary_role_code: user.primary_role?.code ?? "",
      });
    } else {
      setForm({ username: "", password: "", full_name: "", phone_number: "", employee_id: "", state: "", primary_role_code: "" });
    }
    setError(null);
  }, [user, open]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function handleSubmit() {
    setError(null);
    try {
      if (isEdit) {
        const payload: Record<string, unknown> = { ...form };
        delete payload.password;
        delete payload.username;
        await updateUser.mutateAsync(payload as Partial<User>);
      } else {
        await createUser.mutateAsync({ ...form, password: form.password } as Parameters<typeof createUser.mutateAsync>[0]);
      }
      onClose();
    } catch (err: unknown) {
      const e = err as { response?: { data?: Record<string, string[]> } };
      const msg = e?.response?.data
        ? Object.values(e.response.data).flat().join(", ")
        : "Failed to save user";
      setError(msg);
    }
  }

  const loading = createUser.isPending || updateUser.isPending;

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{isEdit ? "Edit User" : "Create User"}</SheetTitle>
          <SheetDescription>
            {isEdit ? "Update user details and role assignment." : "Add a new field executive or admin to the platform."}
          </SheetDescription>
        </SheetHeader>

        <SheetBody className="space-y-4">
          {error && (
            <div className="rounded-xl bg-status-error-bg border border-[#D63333]/20 px-4 py-3 text-sm text-status-error-text">
              {error}
            </div>
          )}

          {!isEdit && (
            <div className="space-y-1.5">
              <Label htmlFor="username">Username *</Label>
              <Input id="username" value={form.username} onChange={set("username")} placeholder="e.g. rahul_fe" />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="full_name">Full Name</Label>
            <Input id="full_name" value={form.full_name} onChange={set("full_name")} placeholder="Rahul Sharma" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="phone_number">Phone Number</Label>
            <Input id="phone_number" value={form.phone_number} onChange={set("phone_number")} placeholder="+91 98765 43210" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="employee_id">Employee ID</Label>
            <Input id="employee_id" value={form.employee_id} onChange={set("employee_id")} placeholder="EMP001" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="state">State</Label>
            <Input id="state" value={form.state} onChange={set("state")} placeholder="Maharashtra" />
          </div>

          <div className="space-y-1.5">
            <Label>Role</Label>
            <Select
              value={form.primary_role_code}
              onValueChange={(v) => setForm((f) => ({ ...f, primary_role_code: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                {roles?.map((r) => (
                  <SelectItem key={r.id} value={r.code}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!isEdit && (
            <div className="space-y-1.5">
              <Label htmlFor="password">Password *</Label>
              <Input id="password" type="password" value={form.password} onChange={set("password")} placeholder="Min 8 characters" />
            </div>
          )}
        </SheetBody>

        <SheetFooter>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : isEdit ? "Save Changes" : "Create User"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
