
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://hkwessehtaonqaakzyvj.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhrd2Vzc2VodGFvbnFhYWt6eXZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzMTEwMzksImV4cCI6MjA5MTg4NzAzOX0.4w-K12jyYlGT3dDXNa6ypRyhzheM2FkG5VLmmeB7GN8';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function parseLocation(address) {
  if (!address) return { city: null, country: null };
  // Handle complex addresses like "World HQ: Dublin, Ireland; Operational HQ: Fremont, CA, USA"
  const mainPart = address.split(';')[0];
  const parts = mainPart.split(',').map(p => p.trim());
  if (parts.length >= 2) {
    const country = parts[parts.length - 1];
    const city = parts[parts.length - 2].replace(/.*:\s*/, '');
    return { city, country };
  }
  return { city: null, country: mainPart };
}

function parseEmployeeCount(size) {
  if (!size || size.toString().includes('N/A')) return null;
  const match = size.toString().replace(/,/g, '').match(/\d+/);
  return match ? Number(match[0]) : null;
}

async function backfill() {
  console.log('Fetching companies for enrichment...');
  const { data: companies, error: fetchError } = await supabase
    .from('companies')
    .select('company_id, name, headquarters_address, employee_size, category');

  if (fetchError) {
    console.error('Error fetching companies:', fetchError);
    return;
  }

  console.log(`Processing ${companies.length} companies...`);

  for (const c of companies) {
    const { city, country } = parseLocation(c.headquarters_address);
    const employee_count = parseEmployeeCount(c.employee_size);
    const category = c.category;

    // Fetch existing JSON row
    const { data: jsonRows, error: jsonError } = await supabase
      .from('company_json')
      .select('*')
      .eq('company_id', c.company_id);

    if (jsonError) {
      console.error(`Error fetching JSON for ${c.name}:`, jsonError);
      continue;
    }

    if (jsonRows.length === 0) {
      console.log(`No JSON row found for ${c.name} (ID: ${c.company_id})`);
      continue;
    }

    const row = jsonRows[0];
    const shortJson = row.short_json || {};
    const fullJson = row.full_json || {};

    // Update fields
    const updatedShort = {
      ...shortJson,
      city: city || shortJson.city,
      country: country || shortJson.country,
      employee_count: employee_count || shortJson.employee_count,
      category: category || shortJson.category,
      location: city && country ? `${city}, ${country}` : (country || city || shortJson.location)
    };

    const updatedFull = {
      ...fullJson,
      city: city || fullJson.city,
      country: country || fullJson.country,
      employee_count: employee_count || fullJson.employee_count,
      category: category || fullJson.category,
      location: city && country ? `${city}, ${country}` : (country || city || fullJson.location)
    };

    const { error: updateError } = await supabase
      .from('company_json')
      .update({
        short_json: updatedShort,
        full_json: updatedFull
      })
      .eq('company_id', c.company_id);

    if (updateError) {
      console.error(`Error updating ${c.name}:`, updateError);
    } else {
      console.log(`Updated ${c.name}`);
    }
  }

  console.log('Backfill complete!');
}

backfill();
