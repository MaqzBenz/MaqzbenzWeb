const db = require('./db');
const crypto = require('crypto');

class Memory {
  // Create a new memory
  static async create(data) {
    const { title, description, latitude, longitude, location_name, visibility, tags } = data;
    
    const query = `
      INSERT INTO memories (title, description, latitude, longitude, location_name, visibility, tags)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    
    const result = await db.query(query, [
      title,
      description,
      latitude,
      longitude,
      location_name,
      visibility || 'private',
      tags ? JSON.stringify(tags) : null
    ]);
    
    return result.rows[0];
  }

  // Get all memories (filtered by visibility)
  static async getAll(userRole = null) {
    let query;
    
    if (userRole === 'admin') {
      // Admins can see all memories
      query = 'SELECT * FROM memories ORDER BY created_at DESC';
    } else {
      // Public users only see public memories
      query = "SELECT * FROM memories WHERE visibility = 'public' ORDER BY created_at DESC";
    }
    
    const result = await db.query(query);
    return result.rows;
  }

  // Get memory by ID
  static async getById(id, userRole = null) {
    let query;
    
    if (userRole === 'admin') {
      query = 'SELECT * FROM memories WHERE id = $1';
    } else {
      query = "SELECT * FROM memories WHERE id = $1 AND visibility = 'public'";
    }
    
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  // Get memory by share token
  static async getByShareToken(token) {
    const query = 'SELECT * FROM memories WHERE share_token = $1';
    const result = await db.query(query, [token]);
    return result.rows[0];
  }

  // Update memory
  static async update(id, data) {
    const { title, description, latitude, longitude, location_name, visibility, tags } = data;
    
    const query = `
      UPDATE memories 
      SET title = COALESCE($1, title),
          description = COALESCE($2, description),
          latitude = COALESCE($3, latitude),
          longitude = COALESCE($4, longitude),
          location_name = COALESCE($5, location_name),
          visibility = COALESCE($6, visibility),
          tags = COALESCE($7, tags),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $8
      RETURNING *
    `;
    
    const result = await db.query(query, [
      title,
      description,
      latitude,
      longitude,
      location_name,
      visibility,
      tags ? JSON.stringify(tags) : null,
      id
    ]);
    
    return result.rows[0];
  }

  // Delete memory
  static async delete(id) {
    const query = 'DELETE FROM memories WHERE id = $1 RETURNING *';
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  // Generate share token for memory
  static async generateShareToken(id) {
    const token = crypto.randomBytes(32).toString('hex');
    
    const query = `
      UPDATE memories 
      SET share_token = $1, visibility = 'shared', updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;
    
    const result = await db.query(query, [token, id]);
    return result.rows[0];
  }

  // Add media to memory
  static async addMedia(memoryId, filePath, mediaType, thumbnailPath = null, exifDate = null, sortOrder = 0) {
    const query = `
      INSERT INTO memory_media (memory_id, file_path, media_type, thumbnail_path, exif_date, sort_order)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    
    const result = await db.query(query, [memoryId, filePath, mediaType, thumbnailPath, exifDate, sortOrder]);
    return result.rows[0];
  }

  // Get media for memory
  static async getMedia(memoryId) {
    const query = 'SELECT * FROM memory_media WHERE memory_id = $1 ORDER BY sort_order, created_at';
    const result = await db.query(query, [memoryId]);
    return result.rows;
  }

  // Delete media
  static async deleteMedia(mediaId) {
    const query = 'DELETE FROM memory_media WHERE id = $1 RETURNING *';
    const result = await db.query(query, [mediaId]);
    return result.rows[0];
  }
}

module.exports = Memory;
