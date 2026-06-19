import { AuthGuard } from "@/components/layout/AuthGuard";

export const metadata = { title: "Agri Intelligence Map — FPS" };

export default function MapLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div
        style={{ background: "var(--map-bg-0)" }}
        className="fixed inset-0 w-screen h-screen overflow-hidden"
      >
        {children}
      </div>
    </AuthGuard>
  );
}
