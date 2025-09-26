import { ReactNode } from "react";
import { cn } from "@/lib/utils";

type CardProps = {
  title: string;
  description?: string;
  className?: string;
  children: ReactNode;
};

export function Card({ title, description, className, children }: CardProps) {
  return (
    <section className={cn("rounded-lg border border-slate-200 bg-white p-4 shadow-sm", className)}>
      <header className="space-y-1 border-b border-slate-200 pb-3">
        <h2 className="text-base font-semibold">{title}</h2>
        {description ? (
          <p className="text-sm text-slate-500">{description}</p>
        ) : null}
      </header>
      <div className="pt-3 space-y-3">{children}</div>
    </section>
  );
}
