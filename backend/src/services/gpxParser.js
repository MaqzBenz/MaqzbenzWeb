const gpxParser = require('gpxparser');
const fs = require('fs').promises;

class GPXService {
  // Parse GPX file and extract data
  static async parseGPXFile(filePath) {
    try {
      const gpxData = await fs.readFile(filePath, 'utf8');
      const gpx = new gpxParser();
      gpx.parse(gpxData);

      if (!gpx.tracks || gpx.tracks.length === 0) {
        throw new Error('No tracks found in GPX file');
      }

      const track = gpx.tracks[0];
      
      return {
        name: track.name || 'Unnamed Track',
        distance: track.distance?.total || 0, // meters
        elevationGain: track.elevation?.pos || 0,
        elevationLoss: track.elevation?.neg || 0,
        maxElevation: track.elevation?.max || 0,
        minElevation: track.elevation?.min || 0,
        avgElevation: track.elevation?.avg || 0,
        points: this.extractTrackPoints(track),
        bounds: {
          minLat: gpx.bounds?.minlat,
          maxLat: gpx.bounds?.maxlat,
          minLon: gpx.bounds?.minlon,
          maxLon: gpx.bounds?.maxlon
        },
        metadata: {
          author: gpx.metadata?.author?.name,
          link: gpx.metadata?.link?.href,
          time: gpx.metadata?.time
        }
      };
    } catch (error) {
      console.error('Error parsing GPX file:', error);
      throw new Error(`Failed to parse GPX file: ${error.message}`);
    }
  }

  // Extract track points with timestamps
  static extractTrackPoints(track) {
    const points = [];
    
    if (track.points && track.points.length > 0) {
      track.points.forEach((point, index) => {
        points.push({
          lat: point.lat,
          lon: point.lon,
          ele: point.ele,
          time: point.time,
          index: index
        });
      });
    }
    
    return points;
  }

  // Calculate statistics from GPX data
  static calculateStatistics(gpxData) {
    const points = gpxData.points;
    
    if (!points || points.length < 2) {
      return {
        distance: 0,
        duration: 0,
        avgSpeed: 0,
        maxSpeed: 0
      };
    }

    // Calculate duration
    const startTime = new Date(points[0].time);
    const endTime = new Date(points[points.length - 1].time);
    const durationSeconds = (endTime - startTime) / 1000;

    // Calculate speeds
    let maxSpeed = 0;
    let totalSpeed = 0;
    let speedCount = 0;

    for (let i = 1; i < points.length; i++) {
      const p1 = points[i - 1];
      const p2 = points[i];
      
      if (p1.time && p2.time) {
        const distance = this.calculateDistance(p1.lat, p1.lon, p2.lat, p2.lon);
        const time = (new Date(p2.time) - new Date(p1.time)) / 1000; // seconds
        
        if (time > 0) {
          const speed = (distance / time) * 3.6; // km/h
          totalSpeed += speed;
          speedCount++;
          
          if (speed > maxSpeed) {
            maxSpeed = speed;
          }
        }
      }
    }

    return {
      distance: gpxData.distance / 1000, // Convert to km
      duration: durationSeconds,
      avgSpeed: speedCount > 0 ? totalSpeed / speedCount : 0,
      maxSpeed: maxSpeed,
      elevationGain: gpxData.elevationGain,
      maxAltitude: gpxData.maxElevation
    };
  }

  // Calculate distance between two coordinates using Haversine formula
  static calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }

  // Synchronize GPX data with video timestamps
  static synchronizeWithVideo(gpxData, videoDuration) {
    const points = gpxData.points;
    
    if (!points || points.length === 0) {
      return [];
    }

    const startTime = new Date(points[0].time);
    const synchronized = [];

    points.forEach(point => {
      const pointTime = new Date(point.time);
      const elapsedSeconds = (pointTime - startTime) / 1000;
      
      // Only include points within video duration
      if (elapsedSeconds <= videoDuration) {
        synchronized.push({
          videoTimestamp: elapsedSeconds,
          lat: point.lat,
          lon: point.lon,
          ele: point.ele,
          originalTime: point.time
        });
      }
    });

    return synchronized;
  }
}

module.exports = GPXService;
