// Supabase Yapılandırması
// NOT: Bu dosya tüm sayfalarda Supabase client'ının **tek ve doğru şekilde**
// oluşturulmasını garanti eder. Bazı cihazlarda "supabase.from is not a function"
// veya "Veritabanı bağlantısı kurulamadı" hatası alınmasının en yaygın sebebi,
// Supabase kütüphanesinin (CDN) cihazdan ulaşılamaması (ör. jsDelivr engelli)
// veya client'ın hiç oluşturulamamasıdır.

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

// Supabase client oluşturmayı fonksiyon haline getirelim ki
// CDN yedeği (fallback) yüklendiğinde tekrar çağırabilelim
let supabase = null;

function initSupabaseClient() {
	try {
		// Bazı tarayıcılarda global obje `supabase`, bazılarında `window.supabase` üzerinden geliyor.
		const supabaseLib =
			(typeof window !== 'undefined' && window.supabase && typeof window.supabase.createClient === 'function')
				? window.supabase
				: (typeof supabase !== 'undefined' && typeof supabase.createClient === 'function'
					? supabase
					: null);

		if (!supabaseLib) {
			console.error('Supabase kütüphanesi (CDN) yüklenemedi veya createClient bulunamadı.');
			return null;
		}

		const client = supabaseLib.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
			auth: {
				persistSession: false,
				autoRefreshToken: false
			}
		});

		return client;
	} catch (e) {
		console.error('Supabase client oluşturulurken hata oluştu:', e);
		return null;
	}
}

// Önce mevcut (jsDelivr üzerinden gelen) kütüphane ile client oluşturmaya çalış
supabase = initSupabaseClient();

// Eğer başarısız olursa, alternatif bir CDN'den (unpkg) Supabase kütüphanesini
// tekrar yükleyip client'ı o şekilde oluşturmaya çalışalım.
if (!supabase) {
	try {
		console.warn('jsDelivr üzerinden Supabase yüklenemedi. Yedek CDN (unpkg) denenecek...');

		const existingFallback = document.getElementById('supabase-fallback-cdn');
		if (!existingFallback) {
			const script = document.createElement('script');
			script.id = 'supabase-fallback-cdn';
			script.src = 'https://unpkg.com/@supabase/supabase-js@2';
			script.async = true;

			script.onload = function () {
				console.log('Yedek Supabase CDN (unpkg) yüklendi, client yeniden oluşturuluyor...');
				// Yedek CDN yüklendikten sonra tekrar dene
				supabase = initSupabaseClient();
				if (supabase) {
					window.supabase = supabase;
					console.log('Supabase bağlantısı (fallback CDN) başarıyla kuruldu.');
				} else {
					console.error('Fallback CDN yüklendi ama Supabase client yine oluşturulamadı.');
				}
			};

			script.onerror = function () {
				console.error('Yedek Supabase CDN (unpkg) yüklenirken hata oluştu.');
			};

			document.head.appendChild(script);
		}
	} catch (e) {
		console.error('Supabase fallback CDN kurulurken hata oluştu:', e);
	}
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
	console.error('Supabase client şu anda oluşturulamadı, bazı fonksiyonlar çalışmayabilir!');
}
