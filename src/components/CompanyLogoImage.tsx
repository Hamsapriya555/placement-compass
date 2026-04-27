import { getClearbitLogoUrl, getCompanyLogo, getDomainFromUrl } from "@/lib/logo-utils";

interface CompanyLike {
  name?: string | null;
  [key: string]: unknown;
}

interface CompanyLogoImageProps {
  company: CompanyLike;
  className: string;
  alt?: string;
}

export function CompanyLogoImage({ company, className, alt }: CompanyLogoImageProps) {
  const clearbitFallback =
    getClearbitLogoUrl(
      getDomainFromUrl((company.domain as string | undefined) ?? undefined) ||
        getDomainFromUrl((company.website_url as string | undefined) ?? undefined),
    ) ?? "/default-company-logo.svg";

  return (
    <img
      src={getCompanyLogo(company)}
      alt={alt ?? `${company?.name ?? "Company"} logo`}
      onError={(e) => {
        e.currentTarget.onerror = null;
        const currentSrc = e.currentTarget.src;
        const isFavicon = currentSrc.includes("google.com/s2/favicons") || currentSrc.includes("gstatic.com/favicon");
        
        if (!isFavicon && clearbitFallback) {
          e.currentTarget.src = clearbitFallback;
        } else {
          e.currentTarget.src = "/default-company-logo.svg";
        }
      }}
      className={className}
    />
  );
}
