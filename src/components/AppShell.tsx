import { Link, useRouterState } from "@tanstack/react-router";
import { Users, BookOpen, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { label: "Students", to: "/students", icon: Users },
  { label: "Sessions", to: "/sessions", icon: BookOpen },
  { label: "Skills",   to: "/progress", icon: Layers },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = useRouterState({ select: (r) => r.location.pathname });

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "#F8FAFC" }}>
      {/* Sidebar */}
      <aside
        className="flex flex-col shrink-0"
        style={{
          width: 220,
          height: "100vh",
          position: "fixed",
          top: 0,
          left: 0,
          background: "#FFFFFF",
          borderRight: "1px solid var(--border)",
          zIndex: 40,
        }}
      >
        {/* Logo */}
        <div className="px-5 pt-6 pb-5" style={{ borderBottom: "1px solid var(--border)" }}>
          <Link to="/" className="block">
            <div className="text-[28px] font-bold tracking-tight leading-none" style={{ color: "#5334C7" }}>
              AH
            </div>
            <div className="text-[11px] mt-1.5 whitespace-nowrap overflow-hidden text-ellipsis" style={{ color: "#667085", fontWeight: 500 }}>
              Numeracy Learning Intelligence
            </div>
            <div className="text-[10px] mt-2.5 leading-snug" style={{ color: "#98A2B3", maxWidth: 150 }}>
              Understand what changed in every learning session.
            </div>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex flex-col gap-0.5 px-3 pt-4 flex-1">
          {NAV.map(({ label, to, icon: Icon }) => {
            const active = path === to || path.startsWith(to + "/");
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md text-[13px] font-medium transition-colors relative",
                  active
                    ? "text-[#7C4DFF]"
                    : "text-[#101828] hover:bg-[rgba(124,77,255,0.05)]",
                )}
                style={
                  active
                    ? {
                        background: "rgba(124,77,255,0.08)",
                        boxShadow: "inset 3px 0 0 #7C4DFF",
                      }
                    : undefined
                }
              >
                <Icon className="h-[16px] w-[16px] shrink-0" />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main content */}
      <main
        className="flex-1 overflow-y-auto"
        style={{ marginLeft: 220, background: "#F8FAFC" }}
      >
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
