/**
 * MaqzbenzWeb - Main JavaScript
 * Global utilities and navigation
 */

// ========== Configuration ==========
const CONFIG = {
    API_BASE_URL: '/api',
    STORAGE_KEY_AUTH: 'maqzbenz_auth_token',
    STORAGE_KEY_USER: 'maqzbenz_user'
};

// ========== Mobile Navigation ==========
class Navigation {
    constructor() {
        this.hamburger = document.querySelector('.hamburger');
        this.navLinks = document.querySelector('.nav-links');
        this.init();
    }

    init() {
        if (this.hamburger && this.navLinks) {
            this.hamburger.addEventListener('click', () => this.toggle());
            
            // Close menu when clicking on a link
            const links = this.navLinks.querySelectorAll('a');
            links.forEach(link => {
                link.addEventListener('click', () => this.close());
            });
            
            // Close menu when clicking outside
            document.addEventListener('click', (e) => {
                if (!this.hamburger.contains(e.target) && !this.navLinks.contains(e.target)) {
                    this.close();
                }
            });
        }
        
        // Set active link based on current page
        this.setActiveLink();
    }

    toggle() {
        this.hamburger.classList.toggle('active');
        this.navLinks.classList.toggle('active');
    }

    close() {
        this.hamburger.classList.remove('active');
        this.navLinks.classList.remove('active');
    }

    setActiveLink() {
        const currentPath = window.location.pathname;
        const links = document.querySelectorAll('.nav-links a');
        
        links.forEach(link => {
            const linkPath = new URL(link.href).pathname;
            if (linkPath === currentPath) {
                link.classList.add('active');
            }
        });
    }
}

// ========== Scroll Animations ==========
class ScrollAnimations {
    constructor() {
        this.elements = document.querySelectorAll('.fade-in-up, .fade-in');
        this.init();
    }

    init() {
        if (!this.elements.length) return;

        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }
            });
        }, observerOptions);

        this.elements.forEach(el => {
            el.style.opacity = '0';
            if (el.classList.contains('fade-in-up')) {
                el.style.transform = 'translateY(30px)';
            }
            el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
            observer.observe(el);
        });
    }
}

// ========== API Helper ==========
class API {
    static async request(endpoint, options = {}) {
        const url = `${CONFIG.API_BASE_URL}${endpoint}`;
        const token = localStorage.getItem(CONFIG.STORAGE_KEY_AUTH);

        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` })
            }
        };

        const mergedOptions = {
            ...defaultOptions,
            ...options,
            headers: {
                ...defaultOptions.headers,
                ...options.headers
            }
        };

        try {
            const response = await fetch(url, mergedOptions);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || data.message || 'Request failed');
            }

            return data;
        } catch (error) {
            console.error(`API Error (${endpoint}):`, error);
            throw error;
        }
    }

    static async get(endpoint) {
        return this.request(endpoint, { method: 'GET' });
    }

    static async post(endpoint, body) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(body)
        });
    }

    static async put(endpoint, body) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(body)
        });
    }

    static async delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }
}

// ========== Toast Notifications ==========
class Toast {
    static show(message, type = 'info', duration = 3000) {
        // Create toast container if it doesn't exist
        let container = document.querySelector('.toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container';
            container.style.cssText = `
                position: fixed;
                top: 100px;
                right: 20px;
                z-index: 10000;
                display: flex;
                flex-direction: column;
                gap: 10px;
            `;
            document.body.appendChild(container);
        }

        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.style.cssText = `
            background: var(--bg-card);
            border: 1px solid var(--accent-primary);
            border-radius: var(--radius-md);
            padding: 1rem 1.5rem;
            color: var(--text-primary);
            box-shadow: var(--shadow-glow);
            animation: slideInRight 0.3s ease;
            min-width: 250px;
            max-width: 400px;
        `;

        const colors = {
            success: 'var(--accent-primary)',
            error: 'var(--accent-pink)',
            warning: '#f59e0b',
            info: 'var(--accent-primary)'
        };

        toast.style.borderColor = colors[type] || colors.info;
        toast.textContent = message;

        container.appendChild(toast);

        // Remove toast after duration
        setTimeout(() => {
            toast.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    static success(message, duration) {
        this.show(message, 'success', duration);
    }

    static error(message, duration) {
        this.show(message, 'error', duration);
    }

    static warning(message, duration) {
        this.show(message, 'warning', duration);
    }

    static info(message, duration) {
        this.show(message, 'info', duration);
    }
}

// Add toast animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// ========== Loading Spinner ==========
class LoadingSpinner {
    static show(container = document.body) {
        const spinner = document.createElement('div');
        spinner.className = 'loading-container';
        spinner.innerHTML = '<div class="spinner"></div>';
        spinner.id = 'global-spinner';
        container.appendChild(spinner);
        return spinner;
    }

    static hide() {
        const spinner = document.getElementById('global-spinner');
        if (spinner) {
            spinner.remove();
        }
    }
}

// ========== Date Formatting ==========
class DateFormatter {
    static formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('fr-FR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    static formatDateTime(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('fr-FR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    static formatRelative(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return "Aujourd'hui";
        if (diffDays === 1) return "Hier";
        if (diffDays < 7) return `Il y a ${diffDays} jours`;
        if (diffDays < 30) return `Il y a ${Math.floor(diffDays / 7)} semaines`;
        if (diffDays < 365) return `Il y a ${Math.floor(diffDays / 30)} mois`;
        return `Il y a ${Math.floor(diffDays / 365)} ans`;
    }
}

// ========== Modal Helper ==========
class Modal {
    static create(title, content) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            padding: 20px;
        `;

        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';
        modalContent.style.cssText = `
            background: var(--bg-card);
            border: 1px solid var(--accent-primary);
            border-radius: var(--radius-lg);
            max-width: 600px;
            width: 100%;
            max-height: 90vh;
            overflow-y: auto;
            box-shadow: var(--shadow-glow);
        `;

        const modalHeader = document.createElement('div');
        modalHeader.style.cssText = `
            padding: 1.5rem;
            border-bottom: 1px solid rgba(139, 92, 246, 0.2);
            display: flex;
            justify-content: space-between;
            align-items: center;
        `;

        const modalTitle = document.createElement('h3');
        modalTitle.textContent = title;
        modalTitle.style.margin = '0';

        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '&times;';
        closeBtn.style.cssText = `
            background: none;
            border: none;
            color: var(--text-secondary);
            font-size: 2rem;
            cursor: pointer;
            line-height: 1;
        `;
        closeBtn.onclick = () => modal.remove();

        const modalBody = document.createElement('div');
        modalBody.style.cssText = 'padding: 1.5rem;';
        modalBody.innerHTML = content;

        modalHeader.appendChild(modalTitle);
        modalHeader.appendChild(closeBtn);
        modalContent.appendChild(modalHeader);
        modalContent.appendChild(modalBody);
        modal.appendChild(modalContent);

        // Close on overlay click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });

        // Close on Escape key
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                modal.remove();
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);

        document.body.appendChild(modal);
        return modal;
    }
}

// ========== Lightbox for Images ==========
class Lightbox {
    static open(imageSrc) {
        const lightbox = document.createElement('div');
        lightbox.className = 'lightbox-overlay';
        lightbox.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.95);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10001;
            cursor: zoom-out;
        `;

        const img = document.createElement('img');
        img.src = imageSrc;
        img.style.cssText = `
            max-width: 90%;
            max-height: 90%;
            object-fit: contain;
            border-radius: var(--radius-lg);
            box-shadow: 0 0 50px rgba(139, 92, 246, 0.5);
        `;

        lightbox.appendChild(img);
        lightbox.addEventListener('click', () => lightbox.remove());

        document.body.appendChild(lightbox);
    }
}

// ========== Initialize on DOM Load ==========
document.addEventListener('DOMContentLoaded', () => {
    // Initialize navigation
    new Navigation();
    
    // Initialize scroll animations
    new ScrollAnimations();
    
    // Add smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if (href !== '#') {
                e.preventDefault();
                const target = document.querySelector(href);
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            }
        });
    });

    // Update footer year
    const yearElement = document.getElementById('current-year');
    if (yearElement) {
        yearElement.textContent = new Date().getFullYear();
    }
});

// ========== Export for use in other modules ==========
window.MaqzbenzWeb = {
    API,
    Toast,
    LoadingSpinner,
    DateFormatter,
    Modal,
    Lightbox,
    CONFIG
};
