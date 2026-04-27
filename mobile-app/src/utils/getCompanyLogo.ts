// Single source of truth for company logos in mobile app
import { CompanyListItem } from "../types/company";

function isValidLogoUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  const clean = url.trim();
  if (
    clean === "" ||
    /^n\/?a$/i.test(clean) ||
    clean === "null" ||
    clean === "undefined" ||
    clean.includes(" ") ||
    clean.includes(";")
  ) {
    return false;
  }
  try {
    const parsed = new URL(clean.startsWith("http") ? clean : "https://" + clean);
    return parsed.protocol.startsWith("http");
  } catch {
    return false;
  }
}

function getDomainFromUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  try {
    let clean = url.toLowerCase().trim();
    clean = clean.replace(/^https?:\/\//, "");
    clean = clean.replace(/^www\./, "");
    clean = clean.split(/[/?#]/)[0];
    clean = clean.replace(/[^a-z0-9.-]/g, "");
    return clean || undefined;
  } catch {
    return undefined;
  }
}

export function getCompanyLogo(company: CompanyListItem): string {
  if (!company) return "https://placehold.co/72x72?text=Logo";
  if (isValidLogoUrl(company.logo_url)) {
    return company.logo_url!.trim();
  }
  const domain = company.domain || getDomainFromUrl(company.website_url);
  if (domain) {
    return `https://logo.clearbit.com/${domain}`;
  }
  return "https://placehold.co/72x72?text=Logo";
}