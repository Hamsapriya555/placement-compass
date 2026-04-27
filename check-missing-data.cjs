
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://hkwessehtaonqaakzyvj.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhrd2Vzc2VodGFvbnFhYWt6eXZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzMTEwMzksImV4cCI6MjA5MTg4NzAzOX0.4w-K12jyYlGT3dDXNa6ypRyhzheM2FkG5VLmmeB7GN8';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkMissingData() {
  console.log('Checking for missing company data...');
  
  const { data: companies, error } = await supabase
    .from('company')
    .select('id, name, website_url, city, country, employee_count, category');

  if (error) {
    console.error('Error fetching companies:', error);
    return;
  }

  const missing = companies.filter(c => 
    !c.city || !c.country || !c.employee_count || !c.category
  );

  console.log(`Total companies: ${companies.length}`);
  console.log(`Companies with missing data: ${missing.length}`);
  
  if (missing.length > 0) {
    console.log('\nSample missing data:');
    missing.slice(0, 10).forEach(c => {
      console.log(`- ${c.name} (${c.website_url}): ` + 
        [
          !c.city ? 'city' : '',
          !c.country ? 'country' : '',
          !c.employee_count ? 'employee_count' : '',
          !c.category ? 'category' : ''
        ].filter(Boolean).join(', ')
      );
    });
  }
}

checkMissingData();
