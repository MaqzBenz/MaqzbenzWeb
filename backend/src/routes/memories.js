const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Memory = require('../models/Memory');
const { authenticateToken, requireAdmin, optionalAuth } = require('../middleware/auth');

// Get all memories (public or all if admin)
router.get('/', optionalAuth, async (req, res) => {
  try {
    const userRole = req.user ? req.user.role : null;
    const memories = await Memory.getAll(userRole);
    
    // Include media for each memory
    const memoriesWithMedia = await Promise.all(
      memories.map(async (memory) => {
        const media = await Memory.getMedia(memory.id);
        return { ...memory, media };
      })
    );
    
    res.json({ memories: memoriesWithMedia });
  } catch (error) {
    console.error('Get memories error:', error);
    res.status(500).json({ error: 'Failed to get memories' });
  }
});

// Get single memory by ID
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userRole = req.user ? req.user.role : null;
    
    const memory = await Memory.getById(id, userRole);
    
    if (!memory) {
      return res.status(404).json({ error: 'Memory not found' });
    }
    
    const media = await Memory.getMedia(id);
    
    res.json({ memory: { ...memory, media } });
  } catch (error) {
    console.error('Get memory error:', error);
    res.status(500).json({ error: 'Failed to get memory' });
  }
});

// Get memory by share token
router.get('/shared/:token', async (req, res) => {
  try {
    const { token } = req.params;
    
    const memory = await Memory.getByShareToken(token);
    
    if (!memory) {
      return res.status(404).json({ error: 'Shared memory not found' });
    }
    
    const media = await Memory.getMedia(memory.id);
    
    res.json({ memory: { ...memory, media } });
  } catch (error) {
    console.error('Get shared memory error:', error);
    res.status(500).json({ error: 'Failed to get shared memory' });
  }
});

// Create new memory (admin only)
router.post('/',
  authenticateToken,
  requireAdmin,
  [
    body('title').notEmpty().trim(),
    body('latitude').isFloat({ min: -90, max: 90 }),
    body('longitude').isFloat({ min: -180, max: 180 }),
    body('visibility').optional().isIn(['public', 'private', 'shared'])
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const memory = await Memory.create(req.body);
      
      res.status(201).json({ 
        message: 'Memory created successfully',
        memory 
      });
    } catch (error) {
      console.error('Create memory error:', error);
      res.status(500).json({ error: 'Failed to create memory' });
    }
  }
);

// Update memory (admin only)
router.put('/:id',
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;
      
      const memory = await Memory.update(id, req.body);
      
      if (!memory) {
        return res.status(404).json({ error: 'Memory not found' });
      }
      
      res.json({ 
        message: 'Memory updated successfully',
        memory 
      });
    } catch (error) {
      console.error('Update memory error:', error);
      res.status(500).json({ error: 'Failed to update memory' });
    }
  }
);

// Delete memory (admin only)
router.delete('/:id',
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;
      
      const memory = await Memory.delete(id);
      
      if (!memory) {
        return res.status(404).json({ error: 'Memory not found' });
      }
      
      res.json({ 
        message: 'Memory deleted successfully',
        memory 
      });
    } catch (error) {
      console.error('Delete memory error:', error);
      res.status(500).json({ error: 'Failed to delete memory' });
    }
  }
);

// Generate share token (admin only)
router.post('/:id/share',
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;
      
      const memory = await Memory.generateShareToken(id);
      
      if (!memory) {
        return res.status(404).json({ error: 'Memory not found' });
      }
      
      const shareUrl = `${req.protocol}://${req.get('host')}/api/memories/shared/${memory.share_token}`;
      
      res.json({ 
        message: 'Share link generated successfully',
        memory,
        shareUrl
      });
    } catch (error) {
      console.error('Generate share token error:', error);
      res.status(500).json({ error: 'Failed to generate share link' });
    }
  }
);

// Add media to memory (admin only)
router.post('/:id/media',
  authenticateToken,
  requireAdmin,
  [
    body('file_path').notEmpty(),
    body('media_type').isIn(['image', 'video'])
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { file_path, media_type, thumbnail_path, exif_date, sort_order } = req.body;
      
      const media = await Memory.addMedia(
        id,
        file_path,
        media_type,
        thumbnail_path,
        exif_date,
        sort_order
      );
      
      res.status(201).json({ 
        message: 'Media added successfully',
        media 
      });
    } catch (error) {
      console.error('Add media error:', error);
      res.status(500).json({ error: 'Failed to add media' });
    }
  }
);

// Get media for memory
router.get('/:id/media', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userRole = req.user ? req.user.role : null;
    
    // Check if user has access to this memory
    const memory = await Memory.getById(id, userRole);
    if (!memory) {
      return res.status(404).json({ error: 'Memory not found' });
    }
    
    const media = await Memory.getMedia(id);
    
    res.json({ media });
  } catch (error) {
    console.error('Get media error:', error);
    res.status(500).json({ error: 'Failed to get media' });
  }
});

// Delete media (admin only)
router.delete('/media/:mediaId',
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const { mediaId } = req.params;
      
      const media = await Memory.deleteMedia(mediaId);
      
      if (!media) {
        return res.status(404).json({ error: 'Media not found' });
      }
      
      res.json({ 
        message: 'Media deleted successfully',
        media 
      });
    } catch (error) {
      console.error('Delete media error:', error);
      res.status(500).json({ error: 'Failed to delete media' });
    }
  }
);

module.exports = router;
