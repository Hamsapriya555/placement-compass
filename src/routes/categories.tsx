import { createFileRoute, Link } from "@tanstack/react-router";
import { useCompanyStats } from "@/hooks/use-companies";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import { Layers } from "lucide-react";

export const Route = createFileRoute("/categories")({
  head: () => ({
    meta: [
      { title: "Categories · SRM Placement Intelligence" },
      {
        name: "description",
        content: "Browse hiring companies grouped by category, with live counts from the database.",
      },
    ],
  }),
  component: CategoriesPage,
});

function CategoriesPage() {
  const stats = useCompanyStats();

  return (
    <div className="mx-auto max-w-screen-2xl px-4 py-8 sm:px-6">
      <span className="label-eyebrow">Categories</span>
      <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
        Companies by category
      </h1>
      <p className="text-sm text-muted-foreground">
        Counts derived live from the{" "}
        <code className="rounded bg-secondary px-1 font-mono">category</code> column.
      </p>

      <div className="mt-6">
        {stats.isLoading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        ) : (stats.data?.byCategory.length ?? 0) === 0 ? (
          <EmptyState
            title="No categories yet"
            description="Once company records exist, this view will group them automatically."
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {stats.data!.byCategory.map((c) => (
              <Link
                key={c.label}
                to="/explore"
                className="group flex items-center gap-4 rounded-xl border border-border bg-surface p-4 transition-all hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-md"
              >
                <div className="grid h-12 w-12 place-items-center rounded-lg bg-secondary text-primary">
                  <Layers className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-display font-semibold">{c.label}</div>
                  <div className="text-xs text-muted-foreground">
                    {c.count} {c.count === 1 ? "company" : "companies"}
                  </div>
                </div>
                <span className="font-mono text-2xl font-semibold tabular-nums text-muted-foreground group-hover:text-accent">
                  {c.count}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
