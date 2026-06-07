import type { NextRequest } from 'next/server'

export interface TrafficGeo {
  country_code: string | null
  region: string | null
  city: string | null
}

/** Normalize ISO country code from edge headers */
function normalizeCountryCode(raw: string | null): string | null {
  if (!raw?.trim()) return null
  const code = raw.trim().toUpperCase()
  if (code === 'XX' || code === 'T1') return null
  if (/^[A-Z]{2}$/.test(code)) return code
  return null
}

/**
 * Resolve visitor geography from deployment edge headers (Vercel / Cloudflare).
 * Local dev often returns null until deployed.
 */
export function resolveGeoFromRequest(request: NextRequest): TrafficGeo {
  const country =
    request.headers.get('x-vercel-ip-country') ||
    request.headers.get('cf-ipcountry') ||
    null
  const region =
    request.headers.get('x-vercel-ip-country-region') ||
    request.headers.get('cf-region') ||
    null
  const city = request.headers.get('x-vercel-ip-city') || null

  return {
    country_code: normalizeCountryCode(country),
    region: region?.trim() || null,
    city: city?.trim() || null,
  }
}

export function countryDisplayName(code: string, locale = 'en'): string {
  try {
    const dn = new Intl.DisplayNames([locale], { type: 'region' })
    return dn.of(code) ?? code
  } catch {
    return code
  }
}

export function formatGeoLabel(
  countryCode: string,
  region: string | null,
  groupBy: 'country' | 'region'
): string {
  const country = countryDisplayName(countryCode)
  if (groupBy === 'region' && region) {
    return `${country} — ${region}`
  }
  return country
}
