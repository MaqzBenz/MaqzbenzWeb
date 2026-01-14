/**
 * MaqzbenzWeb - Authentication Module
 * Handles login, logout, token management
 */

class Auth {
    constructor() {
        this.token = null;
        this.user = null;
        this.init();
    }

    init() {
        // Load token and user from localStorage
        this.token = localStorage.getItem(MaqzbenzWeb.CONFIG.STORAGE_KEY_AUTH);
        const userStr = localStorage.getItem(MaqzbenzWeb.CONFIG.STORAGE_KEY_USER);
        if (userStr) {
            try {
                this.user = JSON.parse(userStr);
            } catch (e) {
                console.error('Error parsing user data:', e);
                this.clearAuth();
            }
        }

        // Verify token on init if it exists
        if (this.token) {
            this.verifyToken().catch(() => {
                this.clearAuth();
            });
        }
    }

    /**
     * Login with email and password
     */
    async login(email, password) {
        try {
            const response = await MaqzbenzWeb.API.post('/auth/login', {
                email,
                password
            });

            if (response.token && response.user) {
                this.setAuth(response.token, response.user);
                return response.user;
            } else {
                throw new Error('Invalid response from server');
            }
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    }

    /**
     * Logout and clear authentication
     */
    logout() {
        this.clearAuth();
        // Redirect to login page
        window.location.href = '/login.html';
    }

    /**
     * Verify if current token is valid
     */
    async verifyToken() {
        if (!this.token) {
            return false;
        }

        try {
            const response = await MaqzbenzWeb.API.get('/auth/verify');
            if (response.valid && response.user) {
                // Update user info
                this.user = response.user;
                localStorage.setItem(MaqzbenzWeb.CONFIG.STORAGE_KEY_USER, JSON.stringify(response.user));
                return true;
            }
            return false;
        } catch (error) {
            console.error('Token verification failed:', error);
            return false;
        }
    }

    /**
     * Get current user info
     */
    async getCurrentUser() {
        if (!this.token) {
            return null;
        }

        try {
            const response = await MaqzbenzWeb.API.get('/auth/me');
            if (response.user) {
                this.user = response.user;
                localStorage.setItem(MaqzbenzWeb.CONFIG.STORAGE_KEY_USER, JSON.stringify(response.user));
                return response.user;
            }
            return null;
        } catch (error) {
            console.error('Get user error:', error);
            return null;
        }
    }

    /**
     * Change password
     */
    async changePassword(currentPassword, newPassword) {
        try {
            const response = await MaqzbenzWeb.API.post('/auth/change-password', {
                currentPassword,
                newPassword
            });
            return response;
        } catch (error) {
            console.error('Change password error:', error);
            throw error;
        }
    }

    /**
     * Set authentication data
     */
    setAuth(token, user) {
        this.token = token;
        this.user = user;
        localStorage.setItem(MaqzbenzWeb.CONFIG.STORAGE_KEY_AUTH, token);
        localStorage.setItem(MaqzbenzWeb.CONFIG.STORAGE_KEY_USER, JSON.stringify(user));
    }

    /**
     * Clear authentication data
     */
    clearAuth() {
        this.token = null;
        this.user = null;
        localStorage.removeItem(MaqzbenzWeb.CONFIG.STORAGE_KEY_AUTH);
        localStorage.removeItem(MaqzbenzWeb.CONFIG.STORAGE_KEY_USER);
    }

    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        return this.token !== null && this.user !== null;
    }

    /**
     * Check if user is admin
     */
    isAdmin() {
        return this.isAuthenticated() && this.user && this.user.role === 'admin';
    }

    /**
     * Get current user
     */
    getUser() {
        return this.user;
    }

    /**
     * Get current token
     */
    getToken() {
        return this.token;
    }

    /**
     * Require authentication - redirect to login if not authenticated
     */
    requireAuth() {
        if (!this.isAuthenticated()) {
            // Save current location for redirect after login
            const returnUrl = window.location.pathname + window.location.search;
            localStorage.setItem('auth_return_url', returnUrl);
            window.location.href = '/login.html';
            return false;
        }
        return true;
    }

    /**
     * Require admin - redirect to home if not admin
     */
    requireAdmin() {
        if (!this.requireAuth()) {
            return false;
        }
        
        if (!this.isAdmin()) {
            MaqzbenzWeb.Toast.error('Accès non autorisé - Admin requis');
            setTimeout(() => {
                window.location.href = '/index.html';
            }, 2000);
            return false;
        }
        return true;
    }

    /**
     * Get return URL after login
     */
    getReturnUrl() {
        const returnUrl = localStorage.getItem('auth_return_url');
        localStorage.removeItem('auth_return_url');
        return returnUrl || '/index.html';
    }
}

// ========== Login Form Handler ==========
class LoginForm {
    constructor(formElement) {
        this.form = formElement;
        this.emailInput = formElement.querySelector('#email');
        this.passwordInput = formElement.querySelector('#password');
        this.submitBtn = formElement.querySelector('button[type="submit"]');
        this.errorDiv = formElement.querySelector('.login-error');
        this.init();
    }

    init() {
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
    }

    async handleSubmit(e) {
        e.preventDefault();
        
        const email = this.emailInput.value.trim();
        const password = this.passwordInput.value;

        // Validation
        if (!email || !password) {
            this.showError('Veuillez remplir tous les champs');
            return;
        }

        // Disable form
        this.setLoading(true);
        this.clearError();

        try {
            const user = await auth.login(email, password);
            
            MaqzbenzWeb.Toast.success(`Bienvenue ${user.username} !`);
            
            // Redirect after short delay
            setTimeout(() => {
                window.location.href = auth.getReturnUrl();
            }, 1000);
            
        } catch (error) {
            this.showError(error.message || 'Échec de la connexion');
            this.setLoading(false);
        }
    }

    showError(message) {
        if (this.errorDiv) {
            this.errorDiv.textContent = message;
            this.errorDiv.style.display = 'block';
        } else {
            MaqzbenzWeb.Toast.error(message);
        }
    }

    clearError() {
        if (this.errorDiv) {
            this.errorDiv.textContent = '';
            this.errorDiv.style.display = 'none';
        }
    }

    setLoading(loading) {
        this.submitBtn.disabled = loading;
        this.emailInput.disabled = loading;
        this.passwordInput.disabled = loading;
        this.submitBtn.innerHTML = loading 
            ? '<i class="fas fa-spinner fa-spin"></i> Connexion...' 
            : 'Se connecter';
    }
}

// ========== User Menu Component ==========
class UserMenu {
    constructor(containerElement) {
        this.container = containerElement;
        this.render();
    }

    render() {
        if (!auth.isAuthenticated()) {
            this.container.innerHTML = `
                <a href="/login.html" class="btn btn-primary">
                    <i class="fas fa-sign-in-alt"></i> Connexion
                </a>
            `;
            return;
        }

        const user = auth.getUser();
        this.container.innerHTML = `
            <div class="user-menu">
                <button class="user-menu-btn">
                    <i class="fas fa-user-circle"></i>
                    <span>${user.username}</span>
                    <i class="fas fa-chevron-down"></i>
                </button>
                <div class="user-menu-dropdown" style="display: none;">
                    ${user.role === 'admin' ? '<a href="/admin.html"><i class="fas fa-cog"></i> Admin</a>' : ''}
                    <a href="#" id="logout-btn"><i class="fas fa-sign-out-alt"></i> Déconnexion</a>
                </div>
            </div>
        `;

        // Toggle dropdown
        const menuBtn = this.container.querySelector('.user-menu-btn');
        const dropdown = this.container.querySelector('.user-menu-dropdown');
        
        menuBtn.addEventListener('click', () => {
            dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.container.contains(e.target)) {
                dropdown.style.display = 'none';
            }
        });

        // Logout
        const logoutBtn = this.container.querySelector('#logout-btn');
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            auth.logout();
        });
    }
}

// ========== Initialize Auth ==========
const auth = new Auth();

// Export to window
window.MaqzbenzWeb.Auth = Auth;
window.MaqzbenzWeb.LoginForm = LoginForm;
window.MaqzbenzWeb.UserMenu = UserMenu;
window.auth = auth;

// Add user menu styles
const style = document.createElement('style');
style.textContent = `
    .user-menu {
        position: relative;
    }
    
    .user-menu-btn {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        background: var(--bg-card);
        border: 1px solid rgba(139, 92, 246, 0.2);
        border-radius: var(--radius-md);
        padding: 0.5rem 1rem;
        color: var(--text-primary);
        cursor: pointer;
        transition: all var(--transition-base);
    }
    
    .user-menu-btn:hover {
        border-color: var(--accent-primary);
        box-shadow: var(--shadow-glow);
    }
    
    .user-menu-dropdown {
        position: absolute;
        top: calc(100% + 0.5rem);
        right: 0;
        background: var(--bg-card);
        border: 1px solid rgba(139, 92, 246, 0.2);
        border-radius: var(--radius-md);
        box-shadow: var(--shadow-glow);
        min-width: 200px;
        z-index: 1000;
    }
    
    .user-menu-dropdown a {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.75rem 1rem;
        color: var(--text-secondary);
        text-decoration: none;
        transition: all var(--transition-base);
        border-bottom: 1px solid rgba(139, 92, 246, 0.1);
    }
    
    .user-menu-dropdown a:last-child {
        border-bottom: none;
    }
    
    .user-menu-dropdown a:hover {
        background: rgba(139, 92, 246, 0.1);
        color: var(--accent-primary);
    }
    
    .login-error {
        background: rgba(236, 72, 153, 0.1);
        border: 1px solid var(--accent-pink);
        border-radius: var(--radius-md);
        padding: 0.75rem 1rem;
        color: var(--accent-pink);
        margin-bottom: 1rem;
        display: none;
    }
`;
document.head.appendChild(style);
