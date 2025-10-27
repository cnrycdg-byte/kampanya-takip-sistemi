// Global Loading Sistemi
class LoadingSystem {
    constructor() {
        this.activeLoadings = new Set();
        this.loadingOverlay = null;
        this.createLoadingOverlay();
    }

    createLoadingOverlay() {
        if (this.loadingOverlay) return;

        this.loadingOverlay = document.createElement('div');
        this.loadingOverlay.id = 'loading-overlay';
        this.loadingOverlay.innerHTML = `
            <div class="loading-content">
                <div class="loading-spinner"></div>
                <div class="loading-text">Yükleniyor...</div>
                <div class="loading-details"></div>
            </div>
        `;
        
        const style = document.createElement('style');
        style.textContent = `
            #loading-overlay {
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                width: 100vw !important;
                height: 100vh !important;
                background: rgba(0, 0, 0, 0.9) !important;
                display: flex !important;
                justify-content: center !important;
                align-items: center !important;
                z-index: 999999 !important;
                backdrop-filter: blur(5px) !important;
                font-family: Arial, sans-serif !important;
                pointer-events: all !important;
            }
            
            #loading-overlay.hidden {
                display: none !important;
            }
            
            .loading-content {
                background: white;
                padding: 30px;
                border-radius: 10px;
                text-align: center;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
                min-width: 200px;
            }
            
            .loading-spinner {
                width: 40px;
                height: 40px;
                border: 4px solid #f3f3f3;
                border-top: 4px solid #3498db;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin: 0 auto 15px;
            }
            
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            
            .loading-text {
                font-size: 16px;
                font-weight: bold;
                color: #333;
                margin-bottom: 10px;
            }
            
            .loading-details {
                font-size: 14px;
                color: #666;
                min-height: 20px;
            }
        `;
        
        document.head.appendChild(style);
        document.body.appendChild(this.loadingOverlay);
    }

    show(message = 'Yükleniyor...', details = '') {
        const loadingId = Date.now() + Math.random();
        this.activeLoadings.add(loadingId);
        
        if (this.loadingOverlay) {
            this.loadingOverlay.querySelector('.loading-text').textContent = message;
            this.loadingOverlay.querySelector('.loading-details').textContent = details;
            this.loadingOverlay.style.display = 'flex';
            this.loadingOverlay.classList.remove('hidden');
            console.log('🔍 Loading gösteriliyor:', message, details);
        }
        
        return loadingId;
    }

    update(loadingId, message, details = '') {
        if (this.activeLoadings.has(loadingId) && this.loadingOverlay) {
            this.loadingOverlay.querySelector('.loading-text').textContent = message;
            this.loadingOverlay.querySelector('.loading-details').textContent = details;
            console.log('🔍 Loading güncelleniyor:', message, details);
        }
    }

    hide(loadingId) {
        this.activeLoadings.delete(loadingId);
        
        if (this.activeLoadings.size === 0 && this.loadingOverlay) {
            this.loadingOverlay.style.display = 'none';
            this.loadingOverlay.classList.add('hidden');
            console.log('🔍 Loading gizleniyor');
        }
    }
}

// Global loading sistemi
window.loadingSystem = new LoadingSystem();
window.showLoading = (message, details) => window.loadingSystem.show(message, details);
window.hideLoading = (loadingId) => window.loadingSystem.hide(loadingId);
window.updateLoading = (loadingId, message, details) => window.loadingSystem.update(loadingId, message, details);

// Test fonksiyonu
window.testLoading = function() {
    console.log('🧪 Loading sistemi test ediliyor...');
    const loadingId = showLoading('Test Loading', 'Bu bir test mesajıdır...');
    setTimeout(() => {
        updateLoading(loadingId, 'Test Loading', 'Güncelleniyor...');
        setTimeout(() => {
            hideLoading(loadingId);
            console.log('✅ Loading sistemi test tamamlandı');
        }, 2000);
    }, 2000);
};

console.log('✅ Global Loading sistemi yüklendi');