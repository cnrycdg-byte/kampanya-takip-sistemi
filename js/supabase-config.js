// Supabase Yapılandırması
const SUPABASE_URL = 'https://bsalbxbljkhwgemsexpb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzYWxieGJsamtod2dlbXNleHBiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczMTgwMzksImV4cCI6MjA3Mjg5NDAzOX0.kBWeMPRjgCk50LpMWWr4GqrSD23_rjQbDNG17EhwaK4';

// Eski Supabase auth token'larını temizle (v2 default anahtar yapısı: sb-<ref>-auth-token)
try {
	Object.keys(localStorage).forEach((key) => {
		if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
			localStorage.removeItem(key);
		}
	});
} catch (e) {
	console.warn('Supabase auth token temizleme hatası:', e);
}

// Supabase istemcisini oluştur (kalıcı oturum kapalı, auto refresh kapalı)
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
	auth: {
		persistSession: false,
		autoRefreshToken: false
	}
});

// Güvenlik: Mevcut bir oturum kalmışsa sonlandır
if (supabase && supabase.auth) {
	supabase.auth.signOut().catch(() => {});
}

// Supabase'i global olarak kullanılabilir yap
window.supabase = supabase;

console.log('Supabase bağlantısı kuruldu (persistSession=false, autoRefreshToken=false)');
