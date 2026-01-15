/**
 * MaqzbenzWeb - 360° Viewer Module
 * Pannellum integration with GPX synchronization
 */

class Viewer360 {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        this.viewer = null;
        this.gpxPlayer = new MaqzbenzWeb.GPXPlayer();
        this.miniMap = null;
        this.currentPath = null;
        this.currentMarker = null;
        this.tourData = null;
        this.isPlaying = false;
        this.playbackSpeed = 1;
        this.currentTime = 0;
        this.duration = 0;
        this.animationFrame = null;
        
        this.options = {
            autoLoad: true,
            compass: true,
            showControls: true,
            ...options
        };
    }

    /**
     * Initialize viewer with tour ID
     */
    async init(tourId) {
        try {
            // Load tour data
            await this.loadTour(tourId);
            
            // Initialize Pannellum viewer
            this.initViewer();
            
            // Initialize mini map
            this.initMiniMap();
            
            // Load GPX data
            await this.loadGPX();
            
            // Setup controls
            this.setupControls();
            
            // Setup timeline
            this.setupTimeline();
            
        } catch (error) {
            console.error('Error initializing viewer:', error);
            MaqzbenzWeb.Toast.error('Erreur lors du chargement du viewer 360°');
        }
    }

    /**
     * Load tour data from API
     */
    async loadTour(tourId) {
        const response = await MaqzbenzWeb.API.get(`/tours360/${tourId}`);
        this.tourData = response.tour;
        this.duration = this.tourData.duration_seconds || 0;
        
        // Update title
        const titleElement = document.querySelector('.viewer-title');
        if (titleElement) {
            titleElement.textContent = this.tourData.title;
        }
    }

    /**
     * Initialize Pannellum viewer
     */
    initViewer() {
        this.viewer = pannellum.viewer(this.container, {
            type: 'video',
            video: this.tourData.video_path,
            autoLoad: this.options.autoLoad,
            compass: this.options.compass,
            showControls: this.options.showControls,
            hfov: 100,
            pitch: 0,
            yaw: 0
        });

        // Video events
        const video = this.viewer.getVideo();
        if (video) {
            video.addEventListener('timeupdate', () => {
                this.currentTime = video.currentTime;
                this.updateTimeline();
                this.updateMiniMap();
                this.updateStats();
            });

            video.addEventListener('ended', () => {
                this.isPlaying = false;
                this.updatePlayButton();
            });
        }
    }

    /**
     * Initialize mini map
     */
    initMiniMap() {
        this.miniMap = L.map('miniMap', {
            zoomControl: false,
            attributionControl: false
        }).setView([46.603354, 1.888334], 13);

        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            maxZoom: 19
        }).addTo(this.miniMap);

        // Toggle mini map
        const toggle = document.querySelector('.mini-map-toggle');
        const container = document.querySelector('.mini-map-container');
        if (toggle && container) {
            toggle.addEventListener('click', () => {
                container.classList.toggle('collapsed');
                setTimeout(() => this.miniMap.invalidateSize(), 300);
            });
        }
    }

    /**
     * Load and parse GPX data
     */
    async loadGPX() {
        if (!this.tourData.gpx_path) return;

        try {
            const response = await MaqzbenzWeb.API.get(`/tours360/${this.tourData.id}/gpx`);
            
            if (response.gpxData && response.gpxData.points) {
                this.gpxPlayer.points = response.gpxData.points;
                this.gpxPlayer.totalDistance = response.statistics?.distance || 0;
                this.gpxPlayer.totalDuration = response.statistics?.duration || 0;
                this.gpxPlayer.elevationGain = response.statistics?.elevationGain || 0;
                this.gpxPlayer.maxSpeed = response.statistics?.maxSpeed || 0;
                this.gpxPlayer.maxAltitude = response.statistics?.maxAltitude || 0;

                // Draw path on mini map
                this.drawGPXPath();
                
                // Update stats
                this.updateStats();
            }
        } catch (error) {
            console.error('Error loading GPX:', error);
        }
    }

    /**
     * Draw GPX path on mini map
     */
    drawGPXPath() {
        const coordinates = this.gpxPlayer.getPathCoordinates();
        if (coordinates.length === 0) return;

        // Draw polyline
        this.currentPath = L.polyline(coordinates, {
            color: '#8b5cf6',
            weight: 3,
            opacity: 0.8
        }).addTo(this.miniMap);

        // Add current position marker
        this.currentMarker = L.circleMarker(coordinates[0], {
            radius: 8,
            fillColor: '#ec4899',
            fillOpacity: 1,
            color: '#fff',
            weight: 2
        }).addTo(this.miniMap);

        // Fit bounds
        this.miniMap.fitBounds(this.currentPath.getBounds(), { padding: [20, 20] });
    }

    /**
     * Setup playback controls
     */
    setupControls() {
        const playBtn = document.querySelector('.play-btn');
        if (playBtn) {
            playBtn.addEventListener('click', () => this.togglePlay());
        }

        // Speed controls
        document.querySelectorAll('.speed-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const speed = parseFloat(e.target.dataset.speed);
                this.setPlaybackSpeed(speed);
            });
        });

        // Toggle stats panel
        const statsToggle = document.querySelector('.stats-toggle');
        const statsPanel = document.querySelector('.stats-panel');
        if (statsToggle && statsPanel) {
            statsToggle.addEventListener('click', () => {
                statsPanel.classList.toggle('collapsed');
            });
        }
    }

    /**
     * Setup timeline slider
     */
    setupTimeline() {
        const slider = document.querySelector('.timeline-slider');
        if (!slider) return;

        slider.max = this.duration;
        slider.value = 0;

        slider.addEventListener('input', (e) => {
            const time = parseFloat(e.target.value);
            this.seekTo(time);
        });
    }

    /**
     * Toggle play/pause
     */
    togglePlay() {
        const video = this.viewer.getVideo();
        if (!video) return;

        if (this.isPlaying) {
            video.pause();
            this.isPlaying = false;
        } else {
            video.play();
            this.isPlaying = true;
        }

        this.updatePlayButton();
    }

    /**
     * Update play button icon
     */
    updatePlayButton() {
        const playBtn = document.querySelector('.play-btn i');
        if (playBtn) {
            playBtn.className = this.isPlaying ? 'fas fa-pause' : 'fas fa-play';
        }
    }

    /**
     * Set playback speed
     */
    setPlaybackSpeed(speed) {
        this.playbackSpeed = speed;
        const video = this.viewer.getVideo();
        if (video) {
            video.playbackRate = speed;
        }

        // Update active button
        document.querySelectorAll('.speed-btn').forEach(btn => {
            btn.classList.toggle('active', parseFloat(btn.dataset.speed) === speed);
        });
    }

    /**
     * Seek to specific time
     */
    seekTo(time) {
        const video = this.viewer.getVideo();
        if (video) {
            video.currentTime = time;
        }
        this.currentTime = time;
        this.updateTimeline();
        this.updateMiniMap();
        this.updateStats();
    }

    /**
     * Update timeline UI
     */
    updateTimeline() {
        const slider = document.querySelector('.timeline-slider');
        const progress = document.querySelector('.timeline-progress');
        const timeDisplay = document.querySelector('.timeline-time');

        if (slider) {
            slider.value = this.currentTime;
        }

        if (progress) {
            const percentage = (this.currentTime / this.duration) * 100;
            progress.style.width = `${percentage}%`;
        }

        if (timeDisplay) {
            timeDisplay.textContent = `${MaqzbenzWeb.GPXPlayer.formatTime(this.currentTime)} / ${MaqzbenzWeb.GPXPlayer.formatTime(this.duration)}`;
        }
    }

    /**
     * Update mini map with current position
     */
    updateMiniMap() {
        if (!this.currentMarker || this.gpxPlayer.points.length === 0) return;

        const point = this.gpxPlayer.getPointAtTime(this.currentTime, this.duration);
        if (point) {
            this.currentMarker.setLatLng([point.lat, point.lon]);
            
            // Update distance display
            const distanceDisplay = document.querySelector('.timeline-distance');
            if (distanceDisplay) {
                distanceDisplay.textContent = `${MaqzbenzWeb.GPXPlayer.formatDistance(point.distance)} / ${MaqzbenzWeb.GPXPlayer.formatDistance(this.gpxPlayer.totalDistance)}`;
            }
        }
    }

    /**
     * Update stats panel
     */
    updateStats() {
        const point = this.gpxPlayer.getPointAtTime(this.currentTime, this.duration);
        if (!point) return;

        // Update each stat
        this.updateStat('current-speed', MaqzbenzWeb.GPXPlayer.formatSpeed(point.speed));
        this.updateStat('current-altitude', MaqzbenzWeb.GPXPlayer.formatElevation(point.ele));
        this.updateStat('total-distance', MaqzbenzWeb.GPXPlayer.formatDistance(this.gpxPlayer.totalDistance));
        this.updateStat('elevation-gain', MaqzbenzWeb.GPXPlayer.formatElevation(this.gpxPlayer.elevationGain));
        this.updateStat('max-speed', MaqzbenzWeb.GPXPlayer.formatSpeed(this.gpxPlayer.maxSpeed));
        this.updateStat('max-altitude', MaqzbenzWeb.GPXPlayer.formatElevation(this.gpxPlayer.maxAltitude));
    }

    /**
     * Update individual stat value
     */
    updateStat(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }
}

// Export to window
window.MaqzbenzWeb.Viewer360 = Viewer360;
