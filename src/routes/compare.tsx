import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { useCompanies, useCompany } from "@/hooks/use-companies";
import { CompanyLogoImage } from "@/components/CompanyLogoImage";
import { EmptyState } from "@/components/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { fmtPercent, fmtRating, fmtText, isEmpty } from "@/lib/format";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowRightLeft } from "lucide-react";
import type { CompanyListItem, CompanyRow } from "@/lib/company-types";

const searchSchema = z.object({
  a: fallback(z.string().optional(), undefined),
  b: fallback(z.string().optional(), undefined),
});

export const Route = createFileRoute("/compare")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    meta: [
      { title: "Compare · SRM Placement Intelligence" },
      {
        name: "description",
        content:
          "Side-by-side comparison of two companies across culture, compensation, learning, financials and technology.",
      },
    ],
  }),
  component: ComparePage,
});

const NONE = "__none__";

interface Row {
  label: string;
  group: string;
  pick: (c: CompanyRow) => string;
}

const ROWS: Row[] = [
  // Culture
  { group: "Culture", label: "Hiring velocity", pick: (c) => fmtText(c.hiring_velocity) },
  { group: "Culture", label: "Employee turnover", pick: (c) => fmtText(c.employee_turnover) },
  { group: "Culture", label: "Avg retention tenure", pick: (c) => fmtText(c.avg_retention_tenure) },
  { group: "Culture", label: "Manager quality", pick: (c) => fmtText(c.manager_quality) },
  { group: "Culture", label: "Psychological safety", pick: (c) => fmtText(c.psychological_safety) },
  { group: "Culture", label: "Burnout risk", pick: (c) => fmtText(c.burnout_risk) },
  { group: "Culture", label: "D&I score", pick: (c) => fmtRating(c.diversity_inclusion_score) },
  // Comp
  {
    group: "Compensation",
    label: "Fixed vs variable",
    pick: (c) => fmtText(c.fixed_vs_variable_pay),
  },
  {
    group: "Compensation",
    label: "Bonus predictability",
    pick: (c) => fmtText(c.bonus_predictability),
  },
  { group: "Compensation", label: "ESOPs / incentives", pick: (c) => fmtText(c.esops_incentives) },
  {
    group: "Compensation",
    label: "Lifestyle benefits",
    pick: (c) => fmtText(c.lifestyle_benefits),
  },
  // Growth
  {
    group: "Learning & growth",
    label: "Learning culture",
    pick: (c) => fmtText(c.learning_culture),
  },
  {
    group: "Learning & growth",
    label: "Mentorship availability",
    pick: (c) => fmtText(c.mentorship_availability),
  },
  {
    group: "Learning & growth",
    label: "Internal mobility",
    pick: (c) => fmtText(c.internal_mobility),
  },
  { group: "Learning & growth", label: "Early ownership", pick: (c) => fmtText(c.early_ownership) },
  {
    group: "Learning & growth",
    label: "Exit opportunities",
    pick: (c) => fmtText(c.exit_opportunities),
  },
  // Financials
  { group: "Financials", label: "Annual revenue", pick: (c) => fmtText(c.annual_revenue) },
  { group: "Financials", label: "Profitability", pick: (c) => fmtText(c.profitability_status) },
  { group: "Financials", label: "YoY growth", pick: (c) => fmtPercent(c.yoy_growth_rate) },
  { group: "Financials", label: "Valuation", pick: (c) => fmtText(c.valuation) },
  {
    group: "Financials",
    label: "Runway (months)",
    pick: (c) => fmtText(c.runway_months?.toString() ?? null),
  },
  // Tech
  { group: "Technology", label: "AI/ML adoption", pick: (c) => fmtText(c.ai_ml_adoption_level) },
  {
    group: "Technology",
    label: "Tech adoption rating",
    pick: (c) => fmtRating(c.tech_adoption_rating),
  },
  {
    group: "Technology",
    label: "Cybersecurity posture",
    pick: (c) => fmtText(c.cybersecurity_posture),
  },
  { group: "Technology", label: "Automation level", pick: (c) => fmtText(c.automation_level) },
  // Career signal
  { group: "Career signal", label: "Skill relevance", pick: (c) => fmtText(c.skill_relevance) },
  { group: "Career signal", label: "Network strength", pick: (c) => fmtText(c.network_strength) },
  { group: "Career signal", label: "Global exposure", pick: (c) => fmtText(c.global_exposure) },
  {
    group: "Career signal",
    label: "External recognition",
    pick: (c) => fmtText(c.external_recognition),
  },
];

function ComparePage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const all = useCompanies({ sort: "name", limit: 500 });
  const a = useCompany(search.a);
  const b = useCompany(search.b);

  const setSide = (side: "a" | "b", value: string) =>
    navigate({
      search: (prev) => ({ ...prev, [side]: value === NONE ? undefined : value }),
    });

  return (
    <div className="mx-auto max-w-screen-2xl px-4 py-8 sm:px-6">
      <span className="label-eyebrow">Comparison</span>
      <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
        Compare two companies
      </h1>
      <p className="text-sm text-muted-foreground">
        Strengths, trade-offs and risk areas across culture, compensation, learning, financials and
        technology — only fields with values are highlighted.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_1fr]">
        <PickerCard side="A" id={search.a} all={all.data ?? []} onChange={(v) => setSide("a", v)} />
        <div className="hidden items-center justify-center sm:flex">
          <ArrowRightLeft className="h-5 w-5 text-muted-foreground" />
        </div>
        <PickerCard side="B" id={search.b} all={all.data ?? []} onChange={(v) => setSide("b", v)} />
      </div>

      {a.data && b.data ? (
        <div className="mt-6 overflow-hidden rounded-xl border border-border bg-surface">
          {Array.from(new Set(ROWS.map((r) => r.group))).map((group) => (
            <div key={group}>
              <div className="border-y border-border bg-secondary/40 px-4 py-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                {group}
              </div>
              {ROWS.filter((r) => r.group === group).map((r) => {
                const va = r.pick(a.data!);
                const vb = r.pick(b.data!);
                return (
                  <div
                    key={r.label}
                    className="grid grid-cols-[1fr_2fr_2fr] items-start gap-3 border-b border-border px-4 py-2.5 text-sm last:border-0"
                  >
                    <div className="text-xs font-medium text-muted-foreground">{r.label}</div>
                    <Cell value={va} highlight={va !== vb && !isEmpty(va)} />
                    <Cell value={vb} highlight={va !== vb && !isEmpty(vb)} />
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-6">
          {a.isLoading || b.isLoading ? (
            <Skeleton className="h-96 rounded-xl" />
          ) : (
            <EmptyState
              title="Pick two companies to compare"
              description="Select Company A and Company B above. Differences will be highlighted automatically."
            />
          )}
        </div>
      )}
    </div>
  );
}

function Cell({ value, highlight }: { value: string; highlight: boolean }) {
  return (
    <div
      className={
        highlight
          ? "rounded-md bg-accent/10 px-2 py-1 text-foreground ring-1 ring-accent/30"
          : "px-2 py-1 text-foreground"
      }
    >
      {value}
    </div>
  );
}

function PickerCard({
  side,
  id,
  all,
  onChange,
}: {
  side: string;
  id: string | undefined;
  all: CompanyListItem[];
  onChange: (value: string) => void;
}) {
  const selected = all.find((c) => c.id === id);
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <span className="field-label">Company {side}</span>
      <Select value={id ?? NONE} onValueChange={onChange}>
        <SelectTrigger className="mt-2">
          <SelectValue placeholder="Select a company" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>None</SelectItem>
          {all.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {selected && (
        <div className="mt-3 flex items-center gap-3 border-t border-border pt-3">
          <CompanyLogoImage
            company={selected}
            className="h-9 w-9 rounded-lg border border-border/50 bg-white object-contain p-1 shadow-sm shrink-0"
          />
          <div className="min-w-0">
            <div className="truncate font-display font-semibold">{selected.name}</div>
            <div className="truncate text-xs text-muted-foreground">
              {fmtText(selected.category)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
