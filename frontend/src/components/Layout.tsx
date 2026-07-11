import { NavLink, useLocation } from "react-router-dom";
import { AlertTriangle, FileText, BarChart3, ChevronLeft, ChevronRight, Activity, GitBranch, type LucideIcon } from "lucide-react";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  SidebarRail,
  SidebarInset,
  useSidebar,
  cn,
} from "@claims/ui";
import { useUIStore } from "@/store/uiStore";
import { ProcessingQueue } from "@/components/ProcessingQueue";
import { useCases } from "@/hooks/useCases";
import { caseScopedPath, type CasePage } from "@/lib/caseRoutes";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  casePage?: CasePage;
}

const navItems: NavItem[] = [
  { to: "/", label: "Pipeline", icon: Activity },
  { to: "/graph", label: "Cases", icon: GitBranch },
  { to: "/discrepancies", label: "Discrepancies", icon: AlertTriangle, casePage: "discrepancies" },
  { to: "/claims", label: "Claims", icon: FileText, casePage: "claims" },
  { to: "/ledger", label: "Ledger", icon: BarChart3 },
];

function AppSidebarMenu({ pathname, defaultCaseId, casesLoading }: { pathname: string; defaultCaseId: string | null; casesLoading: boolean }) {
  const { isMobile, setOpenMobile } = useSidebar();

  return (
    <SidebarMenu>
      {navItems.map((item) => {
        const caseDependent = item.casePage !== undefined;
        const destination = item.casePage
          ? defaultCaseId
            ? caseScopedPath(defaultCaseId, item.casePage)
            : "/graph"
          : item.to;
        const isActive =
          item.to === "/"
            ? pathname === "/"
            : item.to === "/discrepancies"
              ? pathname.startsWith("/discrepancies") || /^\/cases\/[^/]+\/discrepancies(?:\/|$)/.test(pathname)
              : item.to === "/claims"
                ? pathname.startsWith("/claims") || /^\/cases\/[^/]+\/claims(?:\/|$)/.test(pathname)
            : pathname.startsWith(item.to);

        return (
          <SidebarMenuItem key={item.to}>
            <SidebarMenuButton
              asChild
              isActive={isActive}
              tooltip={item.label}
              className={cn(
                "px-3 text-[13px] font-medium tracking-[0.01em]",
                isActive
                  ? "font-semibold"
                  : "text-[var(--color-foreground-subtle)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-foreground)]"
              )}
            >
              <NavLink
                to={destination}
                aria-disabled={caseDependent && casesLoading}
                onClick={(event) => {
                  if (caseDependent && casesLoading) {
                    event.preventDefault();
                    return;
                  }
                  if (isMobile) {
                    setOpenMobile(false);
                  }
                }}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const { sidebarCollapsed, setSidebarCollapsed } = useUIStore();
  const location = useLocation();
  const casesQuery = useCases();
  const defaultCaseId = casesQuery.data?.[0]?.case_id ?? null;

  return (
    <SidebarProvider
      open={!sidebarCollapsed}
      onOpenChange={(open) => setSidebarCollapsed(!open)}
      className="h-dvh min-h-dvh overflow-hidden bg-[var(--color-background)]"
      style={
        {
          "--sidebar-width": "15rem",
          "--sidebar-width-icon": "4rem",
        } as React.CSSProperties
      }
    >
      <Sidebar collapsible="icon" className="md:z-10">
        <SidebarHeader className="h-16 flex-row items-center gap-2 border-b border-[var(--color-border)] px-4 py-0">
          <div className="min-w-0 flex-1 overflow-hidden group-data-[collapsible=icon]:hidden">
            <span className="text-[13px] font-[var(--font-display)] font-semibold text-[var(--color-foreground)]">
              Claims<span className="text-[var(--color-primary)]">Recovery</span>
            </span>
          </div>
          <SidebarTrigger className="hidden md:inline-flex group-data-[collapsible=icon]:mx-auto">
            {sidebarCollapsed ? (
              <ChevronRight className="h-3.5 w-3.5" />
            ) : (
              <ChevronLeft className="h-3.5 w-3.5" />
            )}
          </SidebarTrigger>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup className="p-3">
            <AppSidebarMenu pathname={location.pathname} defaultCaseId={defaultCaseId} casesLoading={casesQuery.isLoading} />
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="border-t border-[var(--color-border)] p-4">
          <div className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-success)]" />
            <span className="text-[9px] font-[var(--font-mono)] tracking-[0.1em] text-[var(--color-success)] group-data-[collapsible=icon]:hidden">
              SYSTEM ACTIVE
            </span>
          </div>
          <p className="mt-2 text-[10px] leading-relaxed text-[var(--color-foreground-subtle)] font-[var(--font-mono)] group-data-[collapsible=icon]:hidden">
            RECOVERY ENGINE v1.0
            <br />
            AMD HACKATHON ACT-II
          </p>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <SidebarInset className="min-w-0 overflow-hidden">
        <div className="flex h-14 items-center border-b border-[var(--color-border)] px-4 md:hidden">
          <SidebarTrigger />
        </div>
        <div className="min-w-0 flex-1 overflow-y-auto">
          {children}
        </div>
      </SidebarInset>
      <ProcessingQueue />
    </SidebarProvider>
  );
}
