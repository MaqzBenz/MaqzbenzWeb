/**
 * MaqzbenzWeb - GPX Player Module
 * Parse GPX files and synchronize with video playback
 */

class GPXPlayer {
    constructor() {
        this.points = [];
        this.totalDistance = 0;
        this.totalDuration = 0;
        this.elevationGain = 0;
        this.elevationLoss = 0;
        this.maxSpeed = 0;
        this.maxAltitude = 0;
        this.minAltitude = Infinity;
    }

    /**
     * Parse GPX XML data
     */
    async parseGPX(gpxData) {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(gpxData, 'text/xml');

        // Check for parsing errors
        const parserError = xmlDoc.querySelector('parsererror');
        if (parserError) {
            throw new Error('Invalid GPX file format');
        }

        // Get track points
        const trkpts = xmlDoc.querySelectorAll('trkpt');
        
        if (trkpts.length === 0) {
            throw new Error('No track points found in GPX file');
        }

        this.points = [];
        let prevPoint = null;

        trkpts.forEach((trkpt, index) => {
            const lat = parseFloat(trkpt.getAttribute('lat'));
            const lon = parseFloat(trkpt.getAttribute('lon'));
            const ele = parseFloat(trkpt.querySelector('ele')?.textContent || 0);
            const timeElement = trkpt.querySelector('time');
            const time = timeElement ? new Date(timeElement.textContent) : null;

            const point = {
                index,
                lat,
                lon,
                ele,
                time,
                distance: 0, // Distance from start
                speed: 0, // km/h
                grade: 0 // %
            };

            // Calculate distance from previous point
            if (prevPoint) {
                const segmentDistance = this.calculateDistance(
                    prevPoint.lat, prevPoint.lon,
                    lat, lon
                );
                point.distance = prevPoint.distance + segmentDistance;

                // Calculate speed if we have time data
                if (time && prevPoint.time) {
                    const timeDiff = (time - prevPoint.time) / 1000; // seconds
                    if (timeDiff > 0) {
                        point.speed = (segmentDistance / timeDiff) * 3600; // km/h
                        this.maxSpeed = Math.max(this.maxSpeed, point.speed);
                    }
                }

                // Calculate grade
                const elevDiff = ele - prevPoint.ele;
                if (segmentDistance > 0) {
                    point.grade = (elevDiff / (segmentDistance * 1000)) * 100;
                }

                // Track elevation gain/loss
                if (elevDiff > 0) {
                    this.elevationGain += elevDiff;
                } else {
                    this.elevationLoss += Math.abs(elevDiff);
                }
            }

            // Track altitude extremes
            this.maxAltitude = Math.max(this.maxAltitude, ele);
            this.minAltitude = Math.min(this.minAltitude, ele);

            this.points.push(point);
            prevPoint = point;
        });

        // Calculate total distance
        if (this.points.length > 0) {
            this.totalDistance = this.points[this.points.length - 1].distance;
        }

        // Calculate total duration if we have time data
        if (this.points[0]?.time && this.points[this.points.length - 1]?.time) {
            this.totalDuration = 
                (this.points[this.points.length - 1].time - this.points[0].time) / 1000;
        }

        return this.getStatistics();
    }

    /**
     * Load GPX from URL
     */
    async loadFromURL(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error('Failed to load GPX file');
            }
            const gpxData = await response.text();
            return await this.parseGPX(gpxData);
        } catch (error) {
            console.error('Error loading GPX:', error);
            throw error;
        }
    }

    /**
     * Calculate distance between two coordinates (Haversine formula)
     * Returns distance in kilometers
     */
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Earth's radius in km
        const dLat = this.toRadians(lat2 - lat1);
        const dLon = this.toRadians(lon2 - lon1);
        
        const a = 
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    /**
     * Convert degrees to radians
     */
    toRadians(degrees) {
        return degrees * (Math.PI / 180);
    }

    /**
     * Get statistics
     */
    getStatistics() {
        return {
            totalPoints: this.points.length,
            totalDistance: this.totalDistance,
            totalDuration: this.totalDuration,
            elevationGain: this.elevationGain,
            elevationLoss: this.elevationLoss,
            maxSpeed: this.maxSpeed,
            maxAltitude: this.maxAltitude,
            minAltitude: this.minAltitude,
            averageSpeed: this.totalDuration > 0 
                ? (this.totalDistance / this.totalDuration) * 3600 
                : 0
        };
    }

    /**
     * Synchronize GPX data with video duration
     * Returns points with normalized time (0-1) for video sync
     */
    synchronizeWithVideo(videoDuration) {
        if (this.points.length === 0) {
            return [];
        }

        // If we have time data in GPX, use it
        if (this.totalDuration > 0) {
            const startTime = this.points[0].time;
            
            return this.points.map(point => ({
                ...point,
                videoTime: ((point.time - startTime) / 1000 / this.totalDuration) * videoDuration,
                normalizedTime: (point.time - startTime) / 1000 / this.totalDuration
            }));
        }
        
        // Otherwise, distribute evenly based on distance
        return this.points.map(point => ({
            ...point,
            videoTime: (point.distance / this.totalDistance) * videoDuration,
            normalizedTime: point.distance / this.totalDistance
        }));
    }

    /**
     * Get point at specific video time
     */
    getPointAtTime(videoTime, videoDuration) {
        if (this.points.length === 0) return null;

        const syncedPoints = this.synchronizeWithVideo(videoDuration);
        
        // Find closest point
        let closestPoint = syncedPoints[0];
        let minDiff = Math.abs(syncedPoints[0].videoTime - videoTime);

        for (const point of syncedPoints) {
            const diff = Math.abs(point.videoTime - videoTime);
            if (diff < minDiff) {
                minDiff = diff;
                closestPoint = point;
            }
        }

        return closestPoint;
    }

    /**
     * Get path coordinates for drawing on map
     */
    getPathCoordinates() {
        return this.points.map(point => [point.lat, point.lon]);
    }

    /**
     * Get elevation profile data for charts
     */
    getElevationProfile() {
        return this.points.map(point => ({
            distance: point.distance,
            elevation: point.ele,
            grade: point.grade
        }));
    }

    /**
     * Get speed profile data for charts
     */
    getSpeedProfile() {
        return this.points.map(point => ({
            distance: point.distance,
            speed: point.speed,
            time: point.time
        }));
    }

    /**
     * Get bounds for map
     */
    getBounds() {
        if (this.points.length === 0) return null;

        let minLat = Infinity;
        let maxLat = -Infinity;
        let minLon = Infinity;
        let maxLon = -Infinity;

        this.points.forEach(point => {
            minLat = Math.min(minLat, point.lat);
            maxLat = Math.max(maxLat, point.lat);
            minLon = Math.min(minLon, point.lon);
            maxLon = Math.max(maxLon, point.lon);
        });

        return {
            southwest: [minLat, minLon],
            northeast: [maxLat, maxLon]
        };
    }

    /**
     * Export as GeoJSON
     */
    toGeoJSON() {
        return {
            type: 'Feature',
            geometry: {
                type: 'LineString',
                coordinates: this.points.map(p => [p.lon, p.lat, p.ele])
            },
            properties: {
                ...this.getStatistics()
            }
        };
    }

    /**
     * Format time as HH:MM:SS
     */
    static formatTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);

        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }

    /**
     * Format distance
     */
    static formatDistance(km) {
        if (km < 1) {
            return `${Math.round(km * 1000)} m`;
        }
        return `${km.toFixed(2)} km`;
    }

    /**
     * Format speed
     */
    static formatSpeed(kmh) {
        return `${kmh.toFixed(1)} km/h`;
    }

    /**
     * Format elevation
     */
    static formatElevation(meters) {
        return `${Math.round(meters)} m`;
    }
}

// Export to window
window.MaqzbenzWeb.GPXPlayer = GPXPlayer;
