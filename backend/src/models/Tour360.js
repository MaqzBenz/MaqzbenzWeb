const db = require('./db');
const crypto = require('crypto');

class Tour360 {
  // Create a new 360° tour
  static async create(data) {
    const {
      title,
      description,
      activity_type,
      video_path,
      gpx_path,
      thumbnail_path,
      distance_km,
      elevation_gain,
      duration_seconds,
      max_speed,
      max_altitude,
      recorded_at,
      visibility
    } = data;
    
    const query = `
      INSERT INTO tours_360 (
        title, description, activity_type, video_path, gpx_path, thumbnail_path,
        distance_km, elevation_gain, duration_seconds, max_speed, max_altitude,
        recorded_at, visibility
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `;
    
    const result = await db.query(query, [
      title,
      description,
      activity_type,
      video_path,
      gpx_path,
      thumbnail_path,
      distance_km,
      elevation_gain,
      duration_seconds,
      max_speed,
      max_altitude,
      recorded_at,
      visibility || 'private'
    ]);
    
    return result.rows[0];
  }

  // Get all tours
  static async getAll(userRole = null) {
    let query;
    
    if (userRole === 'admin') {
      query = 'SELECT * FROM tours_360 ORDER BY created_at DESC';
    } else {
      query = "SELECT * FROM tours_360 WHERE visibility = 'public' ORDER BY created_at DESC";
    }
    
    const result = await db.query(query);
    return result.rows;
  }

  // Get tour by ID
  static async getById(id, userRole = null) {
    let query;
    
    if (userRole === 'admin') {
      query = 'SELECT * FROM tours_360 WHERE id = $1';
    } else {
      query = "SELECT * FROM tours_360 WHERE id = $1 AND visibility = 'public'";
    }
    
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  // Get tour by share token
  static async getByShareToken(token) {
    const query = 'SELECT * FROM tours_360 WHERE share_token = $1';
    const result = await db.query(query, [token]);
    return result.rows[0];
  }

  // Update tour
  static async update(id, data) {
    const {
      title,
      description,
      activity_type,
      visibility,
      thumbnail_path
    } = data;
    
    const query = `
      UPDATE tours_360 
      SET title = COALESCE($1, title),
          description = COALESCE($2, description),
          activity_type = COALESCE($3, activity_type),
          visibility = COALESCE($4, visibility),
          thumbnail_path = COALESCE($5, thumbnail_path),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
      RETURNING *
    `;
    
    const result = await db.query(query, [
      title,
      description,
      activity_type,
      visibility,
      thumbnail_path,
      id
    ]);
    
    return result.rows[0];
  }

  // Delete tour
  static async delete(id) {
    const query = 'DELETE FROM tours_360 WHERE id = $1 RETURNING *';
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  // Generate share token
  static async generateShareToken(id) {
    const token = crypto.randomBytes(32).toString('hex');
    
    const query = `
      UPDATE tours_360 
      SET share_token = $1, visibility = 'shared', updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;
    
    const result = await db.query(query, [token, id]);
    return result.rows[0];
  }

  // Add hotspot to tour
  static async addHotspot(tourId, timestampSeconds, pitch, yaw, title, description, icon = 'info') {
    const query = `
      INSERT INTO tour_hotspots (tour_id, timestamp_seconds, pitch, yaw, title, description, icon)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    
    const result = await db.query(query, [tourId, timestampSeconds, pitch, yaw, title, description, icon]);
    return result.rows[0];
  }

  // Get hotspots for tour
  static async getHotspots(tourId) {
    const query = 'SELECT * FROM tour_hotspots WHERE tour_id = $1 ORDER BY timestamp_seconds';
    const result = await db.query(query, [tourId]);
    return result.rows;
  }

  // Delete hotspot
  static async deleteHotspot(hotspotId) {
    const query = 'DELETE FROM tour_hotspots WHERE id = $1 RETURNING *';
    const result = await db.query(query, [hotspotId]);
    return result.rows[0];
  }
}

module.exports = Tour360;
