/**
 * MaqzbenzWeb - Map Module
 * Leaflet integration for interactive memory map
 */

class MemoryMap {
    constructor(mapElementId, options = {}) {
        this.mapElement = document.getElementById(mapElementId);
        this.map = null;
        this.markers = [];
        this.markerCluster = null;
        this.memories = [];
        this.currentFilter = {
            year: 'all',
            type: 'all',
            visibility: 'all'
        };
        this.options = {
            center: [46.603354, 1.888334], // Center of France
            zoom: 6,
            ...options
        };
        
        this.init();
    }

    /**
     * Initialize map
     */
    init() {
        // Create map
        this.map = L.map(this.mapElement, {
            zoomControl: true
        }).setView(this.options.center, this.options.zoom);

        // Add dark tile layer
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            maxZoom: 19
        }).addTo(this.map);

        // Initialize marker cluster
        this.markerCluster = L.markerClusterGroup({
            iconCreateFunction: (cluster) => {
                const count = cluster.getChildCount();
                let size = 'small';
                if (count >= 10) size = 'medium';
                if (count >= 20) size = 'large';

                return L.divIcon({
                    html: `<div class="marker-cluster marker-cluster-${size}">${count}</div>`,
                    className: 'custom-cluster-icon',
                    iconSize: L.point(40, 40)
                });
            },
            spiderfyOnMaxZoom: true,
            showCoverageOnHover: false,
            zoomToBoundsOnClick: true
        });

        this.map.addLayer(this.markerCluster);

        // Load memories
        this.loadMemories();

        // Setup event listeners
        this.setupEventListeners();
    }

    /**
     * Load memories from API
     */
    async loadMemories() {
        try {
            MaqzbenzWeb.LoadingSpinner.show(document.querySelector('.memory-list'));
            
            const response = await MaqzbenzWeb.API.get('/memories');
            this.memories = response.memories || [];
            
            this.renderMemories();
            this.renderMemoryList();
            
            MaqzbenzWeb.LoadingSpinner.hide();
        } catch (error) {
            console.error('Error loading memories:', error);
            MaqzbenzWeb.Toast.error('Erreur lors du chargement des souvenirs');
            MaqzbenzWeb.LoadingSpinner.hide();
        }
    }

    /**
     * Render markers on map
     */
    renderMemories() {
        // Clear existing markers
        this.markerCluster.clearLayers();
        this.markers = [];

        // Filter memories
        const filteredMemories = this.getFilteredMemories();

        // Add markers
        filteredMemories.forEach(memory => {
            const marker = this.createMarker(memory);
            this.markers.push({ memory, marker });
            this.markerCluster.addLayer(marker);
        });

        // Fit bounds if we have markers
        if (filteredMemories.length > 0) {
            const bounds = this.markerCluster.getBounds();
            if (bounds.isValid()) {
                this.map.fitBounds(bounds, { padding: [50, 50] });
            }
        }
    }

    /**
     * Create custom marker for memory
     */
    createMarker(memory) {
        const icon = L.divIcon({
            html: `<div class="custom-marker">
                <i class="custom-marker-icon fas fa-map-marker-alt"></i>
            </div>`,
            className: '',
            iconSize: [30, 30],
            iconAnchor: [15, 30],
            popupAnchor: [0, -30]
        });

        const marker = L.marker([memory.latitude, memory.longitude], { icon });
        
        // Create popup
        const popupContent = this.createPopupContent(memory);
        marker.bindPopup(popupContent, {
            maxWidth: 300,
            className: 'custom-popup'
        });

        // Click event
        marker.on('click', () => {
            this.selectMemory(memory.id);
        });

        return marker;
    }

    /**
     * Create popup HTML content
     */
    createPopupContent(memory) {
        const date = memory.date ? MaqzbenzWeb.DateFormatter.formatDate(memory.date) : 'Date inconnue';
        
        let galleryHTML = '';
        if (memory.media && memory.media.length > 0) {
            const displayMedia = memory.media.slice(0, 4);
            galleryHTML = `
                <div class="popup-gallery">
                    ${displayMedia.map(media => `
                        <div class="popup-gallery-item" onclick="MaqzbenzWeb.Lightbox.open('${media.file_path}')">
                            <img src="${media.thumbnail_path || media.file_path}" alt="${memory.title}">
                        </div>
                    `).join('')}
                </div>
            `;
        }

        return `
            <div class="popup-header">
                <div class="popup-title">${this.escapeHtml(memory.title)}</div>
                <div class="popup-date">${date}</div>
            </div>
            <div class="popup-body">
                ${memory.description ? `<p class="popup-description">${this.escapeHtml(memory.description)}</p>` : ''}
                ${galleryHTML}
                ${memory.media && memory.media.length > 4 ? `<p class="text-muted">+${memory.media.length - 4} autres photos</p>` : ''}
            </div>
        `;
    }

    /**
     * Render memory list in sidebar
     */
    renderMemoryList() {
        const memoryListElement = document.querySelector('.memory-list');
        if (!memoryListElement) return;

        const filteredMemories = this.getFilteredMemories();

        if (filteredMemories.length === 0) {
            memoryListElement.innerHTML = `
                <div class="no-memories">
                    <i class="fas fa-map-marked-alt"></i>
                    <p>Aucun souvenir trouvé</p>
                </div>
            `;
            return;
        }

        memoryListElement.innerHTML = filteredMemories.map(memory => {
            const date = memory.date ? MaqzbenzWeb.DateFormatter.formatDate(memory.date) : '';
            return `
                <div class="memory-item" data-memory-id="${memory.id}">
                    <div class="memory-item-header">
                        <div>
                            <div class="memory-item-title">${this.escapeHtml(memory.title)}</div>
                            ${date ? `<div class="memory-item-date">${date}</div>` : ''}
                        </div>
                        ${memory.type ? `<span class="memory-item-type">${memory.type}</span>` : ''}
                    </div>
                    ${memory.description ? `<p class="memory-item-description">${this.escapeHtml(memory.description)}</p>` : ''}
                    <div class="memory-item-location">
                        <i class="fas fa-map-marker-alt"></i>
                        <span>${memory.location || `${memory.latitude.toFixed(4)}, ${memory.longitude.toFixed(4)}`}</span>
                    </div>
                </div>
            `;
        }).join('');

        // Add click events
        memoryListElement.querySelectorAll('.memory-item').forEach(item => {
            item.addEventListener('click', () => {
                const memoryId = parseInt(item.dataset.memoryId);
                this.selectMemory(memoryId);
            });
        });
    }

    /**
     * Select and zoom to memory
     */
    selectMemory(memoryId) {
        const memoryData = this.markers.find(m => m.memory.id === memoryId);
        if (!memoryData) return;

        const { memory, marker } = memoryData;

        // Zoom to marker
        this.map.setView([memory.latitude, memory.longitude], 15);
        
        // Open popup
        marker.openPopup();

        // Highlight in list
        document.querySelectorAll('.memory-item').forEach(item => {
            item.classList.remove('active');
            if (parseInt(item.dataset.memoryId) === memoryId) {
                item.classList.add('active');
                item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        });
    }

    /**
     * Get filtered memories
     */
    getFilteredMemories() {
        return this.memories.filter(memory => {
            // Year filter
            if (this.currentFilter.year !== 'all') {
                const memoryYear = memory.date ? new Date(memory.date).getFullYear().toString() : null;
                if (memoryYear !== this.currentFilter.year) return false;
            }

            // Type filter
            if (this.currentFilter.type !== 'all' && memory.type !== this.currentFilter.type) {
                return false;
            }

            // Visibility filter (only apply if not admin)
            if (!auth.isAdmin() && memory.visibility === 'private') {
                return false;
            }

            return true;
        });
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Filter changes
        const yearFilter = document.getElementById('year-filter');
        const typeFilter = document.getElementById('type-filter');

        if (yearFilter) {
            yearFilter.addEventListener('change', (e) => {
                this.currentFilter.year = e.target.value;
                this.renderMemories();
                this.renderMemoryList();
            });
        }

        if (typeFilter) {
            typeFilter.addEventListener('change', (e) => {
                this.currentFilter.type = e.target.value;
                this.renderMemories();
                this.renderMemoryList();
            });
        }

        // Sidebar toggle
        const sidebarToggle = document.querySelector('.sidebar-toggle');
        const sidebar = document.querySelector('.map-sidebar');
        
        if (sidebarToggle && sidebar) {
            sidebarToggle.addEventListener('click', () => {
                sidebar.classList.toggle('hidden');
            });
        }

        // Add memory button (admin only)
        const addMemoryBtn = document.querySelector('.add-memory-fab');
        if (addMemoryBtn && auth.isAdmin()) {
            addMemoryBtn.addEventListener('click', () => {
                this.showAddMemoryModal();
            });
        } else if (addMemoryBtn) {
            addMemoryBtn.style.display = 'none';
        }
    }

    /**
     * Show add memory modal (admin)
     */
    showAddMemoryModal() {
        // This would open a modal to add a new memory
        MaqzbenzWeb.Toast.info('Fonctionnalité d\'ajout disponible dans le dashboard admin');
        setTimeout(() => {
            window.location.href = '/admin.html';
        }, 1500);
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Export to window
window.MaqzbenzWeb.MemoryMap = MemoryMap;
