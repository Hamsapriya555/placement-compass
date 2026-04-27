const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://hkwessehtaonqaakzyvj.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhrd2Vzc2VodGFvbnFhYWt6eXZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzMTEwMzksImV4cCI6MjA5MTg4NzAzOX0.4w-K12jyYlGT3dDXNa6ypRyhzheM2FkG5VLmmeB7GN8';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ─── Known city → country mappings for companies with bad address parsing ───
const CITY_COUNTRY_MAP = {
  // US cities
  'San Francisco': 'USA', 'Mountain View': 'USA', 'Palo Alto': 'USA',
  'Seattle': 'USA', 'New York': 'USA', 'Austin': 'USA', 'Ashburn': 'USA',
  'Arlington': 'USA', 'Norwalk': 'USA', 'Bowie': 'USA', 'Kent': 'USA',
  'California': 'USA', 'Bellevue': 'USA',
  // India cities
  'Bengaluru': 'India', 'Bangalore': 'India', 'Hyderabad': 'India',
  'Noida': 'India', 'Gurugram': 'India', 'Pune': 'India', 'Mumbai': 'India',
  'Chennai': 'India',
  // Europe
  'London': 'UK', 'Stuttgart': 'Germany', 'Tallinn': 'Estonia',
  'Dublin': 'Ireland',
  // Others
  'Ottawa': 'Canada', 'Toronto': 'Canada',
  'United States': 'USA',
};

// ─── Normalize sentinel values to null ───
function clean(val) {
  if (val === undefined || val === null) return null;
  const s = String(val).trim();
  if (['', 'NA', 'N/A', 'n/a', 'Not Found', 'undefined', 'null', 'None'].includes(s)) return null;
  return s;
}

// ─── Extract a clean city name from a messy address string ───
function extractCity(raw) {
  if (!raw) return null;
  const s = raw.trim();

  // If it's a full US address like "2261 Market Street #4235 San Francisco CA 94114 USA"
  // Try to find a known city name within it
  for (const city of Object.keys(CITY_COUNTRY_MAP)) {
    if (s.includes(city)) return city;
  }

  // If it's a comma-separated address like "Austin, Texas, USA"
  const parts = s.split(',').map(p => p.trim());
  if (parts.length >= 2) return parts[0];

  // If it's a simple "City State Country" like "Bengaluru Karnataka India"
  const words = s.split(/\s+/);
  if (words.length >= 2) {
    // Check if the last word is a known country
    const lastWord = words[words.length - 1];
    if (['India', 'USA', 'Germany', 'UK', 'Canada', 'Estonia', 'Ireland'].includes(lastWord)) {
      return words[0]; // Return first word as city
    }
  }

  return s; // Return as-is if we can't parse
}

// ─── Extract country from an address ───
function extractCountry(raw) {
  if (!raw) return null;
  const s = raw.trim();

  // Check for known country names at end
  const countries = ['India', 'USA', 'United States', 'Germany', 'UK', 'United Kingdom',
    'Canada', 'Estonia', 'Ireland', 'France', 'Japan', 'Singapore', 'Australia',
    'Netherlands', 'Thailand', 'China', 'Israel', 'South Korea'];
  for (const c of countries) {
    if (s.endsWith(c) || s.includes(`, ${c}`) || s.includes(`; ${c}`)) {
      return c === 'United States' ? 'USA' : c === 'United Kingdom' ? 'UK' : c;
    }
  }

  // Check if the city is in our map
  for (const [city, country] of Object.entries(CITY_COUNTRY_MAP)) {
    if (s.includes(city)) return country;
  }

  return null;
}

// ─── Parse employee_size into a number ───
function parseEmployeeCount(size) {
  if (!size) return null;
  const s = clean(size);
  if (!s) return null;
  // Extract first number
  const match = s.replace(/,/g, '').match(/\d+/);
  return match ? Number(match[0]) : null;
}

// ─── Normalize focus_sectors to an array of strings ───
function normalizeSectors(val) {
  if (!val) return null;
  if (Array.isArray(val)) return val.filter(Boolean);
  const s = String(val).trim();
  if (!s || s === 'null') return null;
  // Split on semicolons, commas, or periods followed by space+capital
  return s.split(/[;,]|\.\s+(?=[A-Z])/).map(v => v.trim()).filter(Boolean);
}

// ─── Main enrichment ───
async function enrichAll() {
  console.log('Fetching all company_json rows...');
  const { data: rows, error } = await supabase
    .from('company_json')
    .select('json_id,company_id,short_json,full_json');

  if (error) { console.error('Fetch error:', error); return; }
  console.log(`Processing ${rows.length} companies...`);

  let updated = 0, skipped = 0, errors = 0;

  for (const row of rows) {
    const sj = row.short_json || {};
    const fj = row.full_json || {};

    // ── 1. Fix city/country/location ──
    let city = clean(sj.city) || clean(fj.city);
    let country = clean(sj.country) || clean(fj.country);

    // If city looks like a full address, re-parse
    if (city && city.length > 30) {
      const rawAddr = city;
      city = extractCity(rawAddr);
      if (!country) country = extractCountry(rawAddr);
    }

    // If we still don't have country, try headquarters_address from full_json
    if (!country) {
      const hq = clean(fj.headquarters_address);
      if (hq) country = extractCountry(hq);
    }

    // Use city→country map as fallback
    if (!country && city && CITY_COUNTRY_MAP[city]) {
      country = CITY_COUNTRY_MAP[city];
    }

    // Build location string
    const location = city && country ? `${city}, ${country}` : (country || city || null);

    // ── 2. Employee count ──
    let employee_count = sj.employee_count || fj.employee_count;
    if (!employee_count || employee_count === 'undefined') {
      employee_count = parseEmployeeCount(sj.employee_size || fj.employee_size);
    }

    // ── 3. Pull critical fields from full_json → short_json ──
    const website_url = clean(sj.website_url) || clean(fj.website_url);
    const hiring_velocity = clean(sj.hiring_velocity) || clean(fj.hiring_velocity);
    const profitability_status = clean(sj.profitability_status) || clean(fj.profitability_status);
    const remote_policy_details = clean(sj.remote_policy_details) || clean(fj.remote_policy_details);
    const focus_sectors = normalizeSectors(sj.focus_sectors) || normalizeSectors(fj.focus_sectors);
    const brand_value = clean(sj.brand_value) || clean(fj.brand_value);
    const category = clean(sj.category) || clean(fj.category);
    const operating_countries = clean(sj.operating_countries) || clean(fj.operating_countries) || country;
    const office_locations = clean(sj.office_locations) || clean(fj.office_locations)
      || (fj.headquarters_address ? clean(fj.headquarters_address) : null);

    // ── 4. Build updated short_json ──
    const updatedShort = {
      ...sj,
      city: city || sj.city,
      country: country || sj.country,
      location,
      employee_count: typeof employee_count === 'number' ? employee_count : (employee_count || null),
      website_url,
      hiring_velocity,
      profitability_status,
      remote_policy_details,
      focus_sectors,
      brand_value,
      category,
      operating_countries,
      office_locations,
    };

    // ── 5. Build updated full_json ──
    const updatedFull = {
      ...fj,
      city: city || fj.city,
      country: country || fj.country,
      location,
      employee_count: typeof employee_count === 'number' ? employee_count : (employee_count || null),
      operating_countries: operating_countries || fj.operating_countries,
      office_locations: office_locations || fj.office_locations,
    };

    // ── 6. Clean NA/N/A values from both ──
    for (const obj of [updatedShort, updatedFull]) {
      for (const [k, v] of Object.entries(obj)) {
        if (typeof v === 'string') {
          const cleaned = clean(v);
          obj[k] = cleaned;
        }
      }
    }

    // ── 7. Write back ──
    const { error: updateError } = await supabase
      .from('company_json')
      .update({ short_json: updatedShort, full_json: updatedFull })
      .eq('company_id', row.company_id);

    if (updateError) {
      console.error(`  ✗ ${sj.name || fj.name} (${row.company_id}): ${updateError.message}`);
      errors++;
    } else {
      const name = updatedShort.name || updatedFull.name;
      console.log(`  ✓ ${name} → ${location || '?'} | emp:${employee_count || '?'} | sectors:${focus_sectors ? focus_sectors.length : 0}`);
      updated++;
    }
  }

  console.log(`\nDone: ${updated} updated, ${skipped} skipped, ${errors} errors`);
}

enrichAll();
