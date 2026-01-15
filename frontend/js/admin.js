/**
 * MaqzbenzWeb - Admin Dashboard Module
 * CRUD operations for memories and tours
 */

class AdminDashboard {
    constructor() {
        this.currentSection = 'overview';
        this.init();
    }

    async init() {
        // Check admin auth
        if (!auth.requireAdmin()) {
            return;
        }

        // Load dashboard data
        await this.loadDashboardData();
        
        // Setup navigation
        this.setupNavigation();
        
        // Setup forms
        this.setupForms();
    }

    async loadDashboardData() {
        try {
            const [memoriesResponse, toursResponse] = await Promise.all([
                MaqzbenzWeb.API.get('/memories'),
                MaqzbenzWeb.API.get('/tours360')
            ]);

            this.renderOverview(memoriesResponse.memories, toursResponse.tours);
        } catch (error) {
            console.error('Error loading dashboard:', error);
            MaqzbenzWeb.Toast.error('Erreur lors du chargement du dashboard');
        }
    }

    renderOverview(memories, tours) {
        const overviewSection = document.getElementById('overview-section');
        if (!overviewSection) return;

        const publicMemories = memories.filter(m => m.visibility === 'public').length;
        const privateMemories = memories.filter(m => m.visibility === 'private').length;

        overviewSection.innerHTML = `
            <h2>Vue d'ensemble</h2>
            <div class="grid grid-3">
                <div class="card">
                    <h3>${memories.length}</h3>
                    <p>Souvenirs totaux</p>
                    <small>${publicMemories} publics, ${privateMemories} privés</small>
                </div>
                <div class="card">
                    <h3>${tours.length}</h3>
                    <p>Parcours 360°</p>
                </div>
                <div class="card">
                    <h3>${memories.reduce((sum, m) => sum + (m.media?.length || 0), 0)}</h3>
                    <p>Médias totaux</p>
                </div>
            </div>
            
            <h3 class="mt-xl">Actions rapides</h3>
            <div class="grid grid-3">
                <button class="btn btn-primary" onclick="adminDashboard.showSection('memories')">
                    <i class="fas fa-map-marked-alt"></i> Gérer les souvenirs
                </button>
                <button class="btn btn-primary" onclick="adminDashboard.showSection('tours')">
                    <i class="fas fa-street-view"></i> Gérer les parcours 360°
                </button>
                <button class="btn btn-secondary" onclick="window.location.href='/map.html'">
                    <i class="fas fa-map"></i> Voir la carte
                </button>
            </div>
        `;
    }

    setupNavigation() {
        document.querySelectorAll('[data-section]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const section = e.currentTarget.dataset.section;
                this.showSection(section);
            });
        });
    }

    showSection(sectionName) {
        this.currentSection = sectionName;
        
        // Hide all sections
        document.querySelectorAll('.admin-section').forEach(section => {
            section.style.display = 'none';
        });
        
        // Show selected section
        const section = document.getElementById(`${sectionName}-section`);
        if (section) {
            section.style.display = 'block';
        }
        
        // Update active nav
        document.querySelectorAll('[data-section]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.section === sectionName);
        });
        
        // Load section data
        if (sectionName === 'memories') {
            this.loadMemories();
        } else if (sectionName === 'tours') {
            this.loadTours();
        }
    }

    async loadMemories() {
        try {
            const response = await MaqzbenzWeb.API.get('/memories');
            this.renderMemoriesTable(response.memories);
        } catch (error) {
            console.error('Error loading memories:', error);
        }
    }

    renderMemoriesTable(memories) {
        const tableContainer = document.getElementById('memories-table');
        if (!tableContainer) return;

        tableContainer.innerHTML = `
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>Titre</th>
                        <th>Date</th>
                        <th>Type</th>
                        <th>Visibilité</th>
                        <th>Médias</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${memories.map(memory => `
                        <tr>
                            <td>${memory.title}</td>
                            <td>${memory.date ? MaqzbenzWeb.DateFormatter.formatDate(memory.date) : '-'}</td>
                            <td>${memory.type || '-'}</td>
                            <td><span class="badge badge-${memory.visibility}">${memory.visibility}</span></td>
                            <td>${memory.media?.length || 0}</td>
                            <td>
                                <button class="btn-icon" onclick="adminDashboard.editMemory(${memory.id})" title="Éditer">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn-icon" onclick="adminDashboard.deleteMemory(${memory.id})" title="Supprimer">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    async loadTours() {
        try {
            const response = await MaqzbenzWeb.API.get('/tours360');
            this.renderToursTable(response.tours);
        } catch (error) {
            console.error('Error loading tours:', error);
        }
    }

    renderToursTable(tours) {
        const tableContainer = document.getElementById('tours-table');
        if (!tableContainer) return;

        tableContainer.innerHTML = `
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>Titre</th>
                        <th>Date</th>
                        <th>Distance</th>
                        <th>Durée</th>
                        <th>Visibilité</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${tours.map(tour => `
                        <tr>
                            <td>${tour.title}</td>
                            <td>${tour.date ? MaqzbenzWeb.DateFormatter.formatDate(tour.date) : '-'}</td>
                            <td>${tour.distance_km ? tour.distance_km.toFixed(2) + ' km' : '-'}</td>
                            <td>${tour.duration_seconds ? MaqzbenzWeb.GPXPlayer.formatTime(tour.duration_seconds) : '-'}</td>
                            <td><span class="badge badge-${tour.visibility}">${tour.visibility}</span></td>
                            <td>
                                <button class="btn-icon" onclick="window.location.href='/viewer360.html?id=${tour.id}'" title="Voir">
                                    <i class="fas fa-eye"></i>
                                </button>
                                <button class="btn-icon" onclick="adminDashboard.editTour(${tour.id})" title="Éditer">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn-icon" onclick="adminDashboard.deleteTour(${tour.id})" title="Supprimer">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    setupForms() {
        // This would setup form handlers for adding/editing content
        // Simplified for MVP
    }

    editMemory(id) {
        MaqzbenzWeb.Toast.info('Édition disponible prochainement');
    }

    async deleteMemory(id) {
        if (!confirm('Êtes-vous sûr de vouloir supprimer ce souvenir ?')) return;

        try {
            await MaqzbenzWeb.API.delete(`/memories/${id}`);
            MaqzbenzWeb.Toast.success('Souvenir supprimé');
            this.loadMemories();
        } catch (error) {
            MaqzbenzWeb.Toast.error('Erreur lors de la suppression');
        }
    }

    editTour(id) {
        MaqzbenzWeb.Toast.info('Édition disponible prochainement');
    }

    async deleteTour(id) {
        if (!confirm('Êtes-vous sûr de vouloir supprimer ce parcours ?')) return;

        try {
            await MaqzbenzWeb.API.delete(`/tours360/${id}`);
            MaqzbenzWeb.Toast.success('Parcours supprimé');
            this.loadTours();
        } catch (error) {
            MaqzbenzWeb.Toast.error('Erreur lors de la suppression');
        }
    }
}

// Initialize on page load
let adminDashboard;
document.addEventListener('DOMContentLoaded', () => {
    adminDashboard = new AdminDashboard();
});

// Add admin styles
const style = document.createElement('style');
style.textContent = `
    .admin-table {
        width: 100%;
        border-collapse: collapse;
        background: var(--bg-card);
        border-radius: var(--radius-lg);
        overflow: hidden;
    }
    
    .admin-table th,
    .admin-table td {
        padding: 1rem;
        text-align: left;
        border-bottom: 1px solid rgba(139, 92, 246, 0.1);
    }
    
    .admin-table th {
        background: rgba(139, 92, 246, 0.1);
        color: var(--text-primary);
        font-weight: 600;
    }
    
    .admin-table td {
        color: var(--text-secondary);
    }
    
    .admin-table tr:last-child td {
        border-bottom: none;
    }
    
    .btn-icon {
        background: none;
        border: none;
        color: var(--text-secondary);
        cursor: pointer;
        padding: 0.5rem;
        transition: color var(--transition-base);
    }
    
    .btn-icon:hover {
        color: var(--accent-primary);
    }
    
    .badge {
        padding: 0.25rem 0.75rem;
        border-radius: var(--radius-sm);
        font-size: 0.875rem;
        font-weight: 500;
    }
    
    .badge-public {
        background: rgba(34, 197, 94, 0.2);
        color: #22c55e;
    }
    
    .badge-private {
        background: rgba(239, 68, 68, 0.2);
        color: #ef4444;
    }
    
    .badge-shared {
        background: rgba(139, 92, 246, 0.2);
        color: var(--accent-primary);
    }
    
    .admin-section {
        display: none;
    }
    
    .admin-section:first-child {
        display: block;
    }
`;
document.head.appendChild(style);
