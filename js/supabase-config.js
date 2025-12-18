// Supabase Yapılandırması
// NOT: Bu dosya tüm sayfalarda Supabase client'ının **tek ve doğru şekilde**
// oluşturulmasını garanti eder. Bazı cihazlarda "supabase.from is not a function"
// hatası alınmasının sebebi, Supabase kütüphanesinin (CDN) yüklenip client'ın
// oluşturulamaması veya yanlış sırada yüklenmesiydi.

const SUPABASE_URL = 'https://bsalbxbljkhwgemsexpb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzYWxieGJsamtod2dlbXNleHBiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczMTgwMzksImV4cCI6MjA3Mjg5NDAzOX0.kBWeMPRjgCk50LpMWWr4GqrSD23_rjQbDNG17EhwaK4';

// URL ve key'i globalde de sakla ki gerektiğinde diğer script'ler erişebilsin
window.SUPABASE_URL = SUPABASE_URL;
window.SUPABASE_ANON_KEY = SUPABASE_ANON_KEY;

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

// Supabase istemcisini güvenli şekilde oluştur (kalıcı oturum kapalı, auto refresh kapalı)
let supabase = null;

try {
	// Bazı tarayıcılarda global obje `supabase`, bazılarında `window.supabase` üzerinden geliyor.
	const supabaseLib =
		(typeof window !== 'undefined' && window.supabase && typeof window.supabase.createClient === 'function')
			? window.supabase
			: (typeof supabase !== 'undefined' && typeof supabase.createClient === 'function'
				? supabase
				: null);

	if (!supabaseLib) {
		console.error('Supabase kütüphanesi (CDN) yüklenemedi!');
	} else {
		supabase = supabaseLib.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
			auth: {
				persistSession: false,
				autoRefreshToken: false
			}
		});
	}
} catch (e) {
	console.error('Supabase client oluşturulurken hata oluştu:', e);
}

// Güvenlik: Mevcut bir oturum kalmışsa sonlandır
if (supabase && supabase.auth) {
	supabase.auth.signOut().catch(() => {});
}

// Supabase client başarıyla oluşturulduysa global olarak kullanılabilir yap
if (supabase) {
	window.supabase = supabase;
	console.log('Supabase bağlantısı kuruldu (persistSession=false, autoRefreshToken=false)');
} else {
	console.error('Supabase client oluşturulamadı, bazı fonksiyonlar çalışmayabilir!');
}
