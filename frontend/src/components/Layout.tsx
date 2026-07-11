import { NavLink, useLocation } from "react-router-dom";
import { Upload, AlertTriangle, FileText, BarChart3, ChevronLeft, ChevronRight, Activity, GitBranch } from "lucide-react";
import { cn } from "@claims/ui";
import { useUIStore } from "@/store/uiStore";
import { ProcessingQueue } from "@/components/ProcessingQueue";

const navItems = [
  { to: "/", label: "Pipeline", icon: Activity },
  { to: "/graph", label: "Cases", icon: GitBranch },
  { to: "/discrepancies", label: "Discrepancies", icon: AlertTriangle },
  { to: "/claims", label: "Claims", icon: FileText },
  { to: "/ledger", label: "Ledger", icon: BarChart3 },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const location = useLocation();

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--color-background)]">
      <aside
        className={cn(
          "flex flex-col bg-[var(--color-surface)] border-r border-[var(--color-border)] z-10",
          sidebarCollapsed ? "w-16" : "w-60"
        )}
        style={{
          width: sidebarCollapsed ? "4rem" : "15rem",
          transition: "width 460ms cubic-bezier(0.22, 1, 0.36, 1)",
          willChange: "width",
        }}
      >
        <div className="flex h-16 items-center border-b border-[var(--color-border)] px-4">
          <div
            className="flex min-w-0 overflow-hidden whitespace-nowrap"
            style={{
              maxWidth: sidebarCollapsed ? "0px" : "10rem",
              opacity: sidebarCollapsed ? 0 : 1,
              transform: sidebarCollapsed ? "translateX(-0.25rem)" : "translateX(0)",
              transition: "max-width 220ms cubic-bezier(0.22, 1, 0.36, 1), opacity 140ms ease, transform 220ms cubic-bezier(0.22, 1, 0.36, 1)",
              transitionDelay: sidebarCollapsed ? "0ms" : "120ms",
            }}
          >
            <span className="text-[13px] font-[var(--font-display)] font-semibold text-[var(--color-foreground)]">
              Claims<span className="text-[var(--color-primary)]">Recovery</span>
            </span>
          </div>
          <button
            onClick={toggleSidebar}
            className={cn(
              "text-[var(--color-foreground-subtle)] hover:text-[var(--color-foreground)] transition-colors duration-150",
              sidebarCollapsed ? "mx-auto" : "ml-auto"
            )}
          >
            {sidebarCollapsed ? (
              <ChevronRight className="h-3.5 w-3.5" />
            ) : (
              <ChevronLeft className="h-3.5 w-3.5" />
            )}
          </button>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {navItems.map((item) => {
            const isActive =
              item.to === "/"
                ? location.pathname === "/"
                : location.pathname.startsWith(item.to);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 text-xs font-medium tracking-[0.05em] rounded-md transition-all duration-150",
                  isActive
                    ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)]"
                    : "text-[var(--color-foreground-subtle)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-surface-hover)]"
                )}
              >
                <item.icon className={cn("h-4 w-4 shrink-0", isActive && "text-[var(--color-primary-foreground)]")} />
                <span
                  className="overflow-hidden whitespace-nowrap"
                  style={{
                    maxWidth: sidebarCollapsed ? "0px" : "7rem",
                    opacity: sidebarCollapsed ? 0 : 1,
                    transform: sidebarCollapsed ? "translateX(-0.25rem)" : "translateX(0)",
                    transition: "max-width 220ms cubic-bezier(0.22, 1, 0.36, 1), opacity 140ms ease, transform 220ms cubic-bezier(0.22, 1, 0.36, 1)",
                    transitionDelay: sidebarCollapsed ? "0ms" : "120ms",
                  }}
                >
                  {item.label}
                </span>
              </NavLink>
            );
          })}
        </nav>

        <div className="border-t border-[var(--color-border)] p-4">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-success)]" />
            <span className="text-[9px] font-[var(--font-mono)] tracking-[0.1em] text-[var(--color-success)]">
              SYSTEM ACTIVE
            </span>
          </div>
          <p
            className="mt-2 overflow-hidden whitespace-nowrap text-[10px] leading-relaxed text-[var(--color-foreground-subtle)] font-[var(--font-mono)]"
            style={{
              maxHeight: sidebarCollapsed ? "0px" : "2.5rem",
              opacity: sidebarCollapsed ? 0 : 1,
              transform: sidebarCollapsed ? "translateY(-0.25rem)" : "translateY(0)",
              transition: "max-height 180ms cubic-bezier(0.22, 1, 0.36, 1), opacity 130ms ease, transform 180ms cubic-bezier(0.22, 1, 0.36, 1)",
              transitionDelay: sidebarCollapsed ? "0ms" : "120ms",
            }}
          >
            RECOVERY ENGINE v1.0
            <br />
            AMD HACKATHON ACT-II
          </p>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
      <ProcessingQueue />
    </div>
  );
}
