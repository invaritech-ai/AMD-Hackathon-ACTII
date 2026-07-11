import { cn } from "@claims/ui";

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
}

/** Single layout shell for every route — no width jumping between pages */
export function PageContainer({ children, className }: PageContainerProps) {
  return (
    <div className={cn("mx-auto w-full min-w-0 max-w-[1400px] px-5 py-8 sm:px-8 lg:px-10 xl:py-10", className)}>
      {children}
    </div>
  );
}
