// Supabase Yapılandırması
const SUPABASE_URL = 'https://bsalbxbljkhwgemsexpb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzYWxieGJsamtod2dlbXNleHBiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczMTgwMzksImV4cCI6MjA3Mjg5NDAzOX0.kBWeMPRjgCk50LpMWWr4GqrSD23_rjQbDNG17EhwaK4';

// Supabase istemcisini oluştur
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Supabase'i global olarak kullanılabilir yap
window.supabase = supabase;

console.log('Supabase bağlantısı kuruldu');
