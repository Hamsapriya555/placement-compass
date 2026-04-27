import { Link } from "@tanstack/react-router";
import { ArrowUpRight, TrendingUp, Users, MapPin } from "lucide-react";
import { CompanyLogoImage } from "@/components/CompanyLogoImage";
import { Badge } from "@/components/ui/badge";
import { fmtText, getLocation, getValue, fmtNumber } from "@/lib/format";
import type { CompanyListItem } from "@/lib/company-types";
import { cn } from "@/lib/utils";

export function CompanyCard({ c }: { c: CompanyListItem }) {
  return (
    <Link
      to="/company/$companyId"
      params={{ companyId: c.id }}
      className={cn(
        "group relative flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5",
        "transition-all duration-300 ease-out",
        "hover:-translate-y-1.5 hover:border-accent/40 hover:shadow-xl hover:shadow-accent/5",
        "active:scale-[0.98]"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <CompanyLogoImage
            company={c}
            className="h-12 w-12 rounded-xl border border-border/50 bg-white object-contain p-1.5 shadow-sm shrink-0 ring-4 ring-secondary/30"
          />
          <div className="min-w-0">
            <h3 className="truncate font-display text-base font-bold tracking-tight text-foreground group-hover:text-accent transition-colors">
              {c.name}
            </h3>
            <p className="truncate text-xs font-medium text-muted-foreground/80">
              {getValue(c.category, "Category not specified")}
            </p>
          </div>
        </div>
        <div className="rounded-full bg-secondary/50 p-1.5 text-muted-foreground group-hover:bg-accent group-hover:text-accent-foreground transition-colors">
          <ArrowUpRight className="h-4 w-4" />
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {(() => {
          const raw = c.focus_sectors;
          const sectors = Array.isArray(raw)
            ? raw
            : typeof raw === "string"
              ? raw.split(/[;,]/).map((s) => s.trim()).filter(Boolean)
              : [];
          return (
            <>
              {sectors.slice(0, 2).map((s) => (
                <Badge key={s} variant="secondary" className="font-medium bg-secondary/40 text-[10px] px-2 py-0">
                  {s}
                </Badge>
              ))}
              {sectors.length > 2 && (
                <Badge variant="outline" className="font-normal text-[10px] px-2 py-0">
                  +{sectors.length - 2}
                </Badge>
              )}
            </>
          );
        })()}
      </div>

      <div className="mt-auto grid grid-cols-2 gap-3 border-t border-border/50 pt-4 text-[11px]">
        <div className="flex items-center gap-2 text-muted-foreground/90 font-medium">
          <Users className="h-3.5 w-3.5 text-accent/70" />
          <span className="truncate">
            {getValue(
              c.employee_count ? fmtNumber(c.employee_count) : c.employee_size,
              "Data not available",
            )}
          </span>
        </div>

        <div className="flex items-center gap-2 text-muted-foreground/90 font-medium">
          <TrendingUp className="h-3.5 w-3.5 text-success/70" />
          <span className="truncate">{getValue(c.hiring_velocity, "Data not available")}</span>
        </div>
        <div className="col-span-2 flex items-center gap-2 text-muted-foreground/90 font-medium">
          <MapPin className="h-3.5 w-3.5 text-info/70" />
          <span className="truncate">{getLocation(c)}</span>
        </div>
      </div>
    </Link>
  );
}

