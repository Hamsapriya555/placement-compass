
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://hkwessehtaonqaakzyvj.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhrd2Vzc2VodGFvbnFhYWt6eXZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzMTEwMzksImV4cCI6MjA5MTg4NzAzOX0.4w-K12jyYlGT3dDXNa6ypRyhzheM2FkG5VLmmeB7GN8';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function dumpData() {
  const { data, error } = await supabase.from('company_json').select('*').limit(5);
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  data.forEach(row => {
    const sj = row.short_json || {};
    const fj = row.full_json || {};
    console.log(`\nCompany ID: ${row.company_id}`);
    console.log(`Name: ${sj.name || fj.name}`);
    console.log(`City: ${sj.city || fj.city}`);
    console.log(`Country: ${sj.country || fj.country}`);
    console.log(`Employee Count: ${sj.employee_count || fj.employee_count}`);
    console.log(`Category: ${sj.category || fj.category}`);
  });
}

dumpData();
