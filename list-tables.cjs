
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://hkwessehtaonqaakzyvj.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhrd2Vzc2VodGFvbnFhYWt6eXZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzMTEwMzksImV4cCI6MjA5MTg4NzAzOX0.4w-K12jyYlGT3dDXNa6ypRyhzheM2FkG5VLmmeB7GN8';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function listTables() {
  const { data, error } = await supabase.rpc('get_tables'); // This might not work if rpc not defined
  if (error) {
    console.log('RPC get_tables failed, trying direct select from pg_catalog...');
    const { data: tables, error: tableError } = await supabase.from('company').select('*').limit(1);
    if (tableError) {
      console.log('company table error:', tableError.message);
    } else {
      console.log('company table exists');
    }
  } else {
    console.log('Tables:', data);
  }
}

listTables();
