/**
 * Robust utilities for handling company logos and URL validation.
 * NOTE: Clearbit Logo API was shut down Dec 1, 2025.
 * Using Google's Favicon API as the domain-based fallback.
 */

const GOOGLE_FAVICON_API = "https://www.google.com/s2/favicons";
const DEFAULT_LOGO = "/default-company-logo.svg";

/**
 * Extracts the domain from a URL string.
 * Handles subdomains and cleanups.
 */
export function getDomainFromUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  
  try {
    let clean = url.toLowerCase().trim();
    // Remove protocol
    clean = clean.replace(/^https?:\/\//, '');
    // Remove www.
    clean = clean.replace(/^www\./, '');
    // Take only the hostname part (before first / or ?)
    clean = clean.split(/[/?#]/)[0];
    // Remove any remaining garbage (only allow a-z, 0-9, dots, hyphens)
    clean = clean.replace(/[^a-z0-9.-]/g, '');
    
    return clean || undefined;
  } catch {
    return undefined;
  }
}

/**
 * Generates a Google Favicon API URL for a given domain.
 * Returns a 128px favicon — free, no API key required.
 * @deprecated Use getGoogleFaviconUrl instead. Kept for backwards compatibility.
 */
export function getClearbitLogoUrl(domain?: string | null): string | null {
  return getGoogleFaviconUrl(domain);
}

/**
 * Generates a Google Favicon API URL for a given domain.
 */
export function getGoogleFaviconUrl(domain?: string | null): string | null {
  if (!domain) return null;
  return `${GOOGLE_FAVICON_API}?domain=${encodeURIComponent(domain)}&sz=128`;
}

function isHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function normalizeLogoCandidate(raw?: string | null): string | null {
  if (!raw) return null;
  const clean = raw.trim();
  if (!clean) return null;

  // Already absolute URL
  if (isHttpUrl(clean)) return clean;

  // Common case from dataset: plain domain in logo_url ("ibm.com")
  const derivedDomain = getDomainFromUrl(clean);
  if (derivedDomain && !clean.includes("/")) {
    return getGoogleFaviconUrl(derivedDomain);
  }

  // "www.company.com" without protocol
  const withProtocol = `https://${clean}`;
  if (isHttpUrl(withProtocol)) return withProtocol;

  return null;
}

/**
 * Validates if a string is a potentially valid image URL.
 * Also rejects fragile corporate CMS paths that often fail due to CORS or rot.
 */
export function isValidLogoUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  
  const clean = url.trim();
  if (clean === "" || /^n\/?a$/i.test(clean) || clean === "null" || clean === "undefined") {
    return false;
  }

  // Reject URLs pointing to defunct Clearbit API
  if (clean.includes("logo.clearbit.com")) {
    return false;
  }

  // Reject fragile CMS assets or extremely long paths that are likely to break
  const fragilePatterns = [
    '/wp-content/uploads/',
    '/content/dam/',
    '/assets/images/logo',
    'static/images/logo',
    'brand.cohere.com',
    'rupeek.com/assets',
    'accenture.com/_acnmedia'
  ];
  
  if (fragilePatterns.some(p => clean.toLowerCase().includes(p.toLowerCase()))) {
    return false;
  }

  // Check for multi-url garbage (common in some datasets)
  if (clean.includes(' ') || clean.includes(';')) {
    return false;
  }

  try {
    const parsed = new URL(clean.startsWith('http') ? clean : 'https://' + clean);
    return parsed.protocol.startsWith('http') && parsed.hostname.includes('.');
  } catch {
    return false;
  }
}


/**
 * Orchestrates the "best" logo URL selection.
 */
export function resolveBestLogoUrl(
  currentLogo: string | null | undefined,
  websiteUrl: string | null | undefined
): string | null {
  if (isValidLogoUrl(currentLogo)) {
    return currentLogo!.trim();
  }
  
  const domain = getDomainFromUrl(websiteUrl);
  if (domain) {
    return getGoogleFaviconUrl(domain);
  }
  
  return null;
}

/**
 * Single source of truth for company logos.
 * Returns a reliable URL (logo_url, Google Favicon, or local fallback).
 */
export function getCompanyLogo(company: any): string {
  if (!company) return DEFAULT_LOGO;

  // 1. Prefer explicit logo_url from data source (skip dead clearbit URLs).
  if (isValidLogoUrl(company.logo_url)) {
    const normalized = normalizeLogoCandidate(company.logo_url);
    if (normalized) return normalized;
  }

  // 2. Fallback to Google Favicon API when logo_url is unavailable.
  const domain = getDomainFromUrl(company.domain) || getDomainFromUrl(company.website_url);
  if (domain) {
    return `${GOOGLE_FAVICON_API}?domain=${encodeURIComponent(domain)}&sz=128`;
  }

  // 3. Final local fallback
  return DEFAULT_LOGO;
}
