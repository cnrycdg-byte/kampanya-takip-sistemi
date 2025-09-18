const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// CORS ayarları - Supabase ile çalışabilmesi için
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'apikey', 'x-client-info']
}));

// JSON ve URL encoded verileri işleme
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static dosyaları servis et (HTML, CSS, JS, resimler)
app.use(express.static(path.join(__dirname)));

// Ana sayfa yönlendirmesi
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// API endpoint'leri (gerekirse)
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'Kampanya Takip Sistemi localhost sunucusu çalışıyor',
        timestamp: new Date().toISOString()
    });
});

// Tüm diğer istekleri index.html'e yönlendir (SPA routing için)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Sunucuyu başlat
app.listen(PORT, () => {
    console.log('🚀 Kampanya Takip Sistemi localhost sunucusu başlatıldı!');
    console.log(`📱 Ana sayfa: http://localhost:${PORT}`);
    console.log(`🔧 Admin paneli: http://localhost:${PORT}/admin-dashboard.html`);
    console.log(`👥 Çalışan paneli: http://localhost:${PORT}/employee-dashboard.html`);
    console.log(`🏪 Mağaza seçimi: http://localhost:${PORT}/store-selection.html`);
    console.log(`📊 Oyun planları: http://localhost:${PORT}/oyun-planlari-test.html`);
    console.log('');
    console.log('💡 Test için kullanabileceğiniz sayfalar:');
    console.log('   - Giriş sayfası: http://localhost:${PORT}');
    console.log('   - Admin paneli: http://localhost:${PORT}/admin-dashboard.html');
    console.log('   - Çalışan paneli: http://localhost:${PORT}/employee-dashboard.html');
    console.log('   - Mağaza seçimi: http://localhost:${PORT}/store-selection.html');
    console.log('   - Debug sayfası: http://localhost:${PORT}/debug.html');
    console.log('   - Test sayfaları: http://localhost:${PORT}/test-*.html');
    console.log('');
    console.log('🛑 Sunucuyu durdurmak için Ctrl+C tuşlarına basın');
});

// Hata yakalama
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
