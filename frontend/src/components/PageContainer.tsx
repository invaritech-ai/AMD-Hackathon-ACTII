import { cn } from "@claims/ui";

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
}

/** Single layout shell for every route — no width jumping between pages */
export function PageContainer({ children, className }: PageContainerProps) {
  return (
    <div className={cn("mx-auto w-full max-w-5xl px-8 py-12", className)}>
      {children}
    </div>
  );
}
