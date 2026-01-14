const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Tour360 = require('../models/Tour360');
const GPXService = require('../services/gpxParser');
const { authenticateToken, requireAdmin, optionalAuth } = require('../middleware/auth');
const path = require('path');

// Get all tours
router.get('/', optionalAuth, async (req, res) => {
  try {
    const userRole = req.user ? req.user.role : null;
    const tours = await Tour360.getAll(userRole);
    
    res.json({ tours });
  } catch (error) {
    console.error('Get tours error:', error);
    res.status(500).json({ error: 'Failed to get tours' });
  }
});

// Get single tour by ID
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userRole = req.user ? req.user.role : null;
    
    const tour = await Tour360.getById(id, userRole);
    
    if (!tour) {
      return res.status(404).json({ error: 'Tour not found' });
    }
    
    const hotspots = await Tour360.getHotspots(id);
    
    res.json({ tour: { ...tour, hotspots } });
  } catch (error) {
    console.error('Get tour error:', error);
    res.status(500).json({ error: 'Failed to get tour' });
  }
});

// Get tour by share token
router.get('/shared/:token', async (req, res) => {
  try {
    const { token } = req.params;
    
    const tour = await Tour360.getByShareToken(token);
    
    if (!tour) {
      return res.status(404).json({ error: 'Shared tour not found' });
    }
    
    const hotspots = await Tour360.getHotspots(tour.id);
    
    res.json({ tour: { ...tour, hotspots } });
  } catch (error) {
    console.error('Get shared tour error:', error);
    res.status(500).json({ error: 'Failed to get shared tour' });
  }
});

// Get GPX data for a tour
router.get('/:id/gpx', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userRole = req.user ? req.user.role : null;
    
    const tour = await Tour360.getById(id, userRole);
    
    if (!tour) {
      return res.status(404).json({ error: 'Tour not found' });
    }
    
    // Parse GPX file
    const gpxPath = path.join(__dirname, '../../', tour.gpx_path);
    const gpxData = await GPXService.parseGPXFile(gpxPath);
    
    // Get synchronized data if video duration is known
    let synchronizedData = null;
    if (tour.duration_seconds) {
      synchronizedData = GPXService.synchronizeWithVideo(gpxData, tour.duration_seconds);
    }
    
    res.json({ 
      gpxData,
      synchronizedData,
      statistics: GPXService.calculateStatistics(gpxData)
    });
  } catch (error) {
    console.error('Get GPX data error:', error);
    res.status(500).json({ error: 'Failed to get GPX data' });
  }
});

// Create new tour (admin only)
router.post('/',
  authenticateToken,
  requireAdmin,
  [
    body('title').notEmpty().trim(),
    body('video_path').notEmpty(),
    body('gpx_path').notEmpty(),
    body('visibility').optional().isIn(['public', 'private', 'shared'])
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // If GPX path is provided, parse it to get statistics
      let tourData = { ...req.body };
      
      if (req.body.gpx_path) {
        try {
          const gpxPath = path.join(__dirname, '../../', req.body.gpx_path);
          const gpxData = await GPXService.parseGPXFile(gpxPath);
          const stats = GPXService.calculateStatistics(gpxData);
          
          // Update tour data with GPX statistics
          tourData = {
            ...tourData,
            distance_km: stats.distance,
            elevation_gain: stats.elevationGain,
            duration_seconds: stats.duration,
            max_speed: stats.maxSpeed,
            max_altitude: stats.maxAltitude
          };
        } catch (gpxError) {
          console.error('GPX parsing error:', gpxError);
          // Continue without GPX stats
        }
      }

      const tour = await Tour360.create(tourData);
      
      res.status(201).json({ 
        message: 'Tour created successfully',
        tour 
      });
    } catch (error) {
      console.error('Create tour error:', error);
      res.status(500).json({ error: 'Failed to create tour' });
    }
  }
);

// Update tour (admin only)
router.put('/:id',
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;
      
      const tour = await Tour360.update(id, req.body);
      
      if (!tour) {
        return res.status(404).json({ error: 'Tour not found' });
      }
      
      res.json({ 
        message: 'Tour updated successfully',
        tour 
      });
    } catch (error) {
      console.error('Update tour error:', error);
      res.status(500).json({ error: 'Failed to update tour' });
    }
  }
);

// Delete tour (admin only)
router.delete('/:id',
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;
      
      const tour = await Tour360.delete(id);
      
      if (!tour) {
        return res.status(404).json({ error: 'Tour not found' });
      }
      
      res.json({ 
        message: 'Tour deleted successfully',
        tour 
      });
    } catch (error) {
      console.error('Delete tour error:', error);
      res.status(500).json({ error: 'Failed to delete tour' });
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
      
      const tour = await Tour360.generateShareToken(id);
      
      if (!tour) {
        return res.status(404).json({ error: 'Tour not found' });
      }
      
      const shareUrl = `${req.protocol}://${req.get('host')}/api/tours360/shared/${tour.share_token}`;
      
      res.json({ 
        message: 'Share link generated successfully',
        tour,
        shareUrl
      });
    } catch (error) {
      console.error('Generate share token error:', error);
      res.status(500).json({ error: 'Failed to generate share link' });
    }
  }
);

// Add hotspot to tour (admin only)
router.post('/:id/hotspots',
  authenticateToken,
  requireAdmin,
  [
    body('timestamp_seconds').isInt({ min: 0 }),
    body('title').notEmpty().trim()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { timestamp_seconds, pitch, yaw, title, description, icon } = req.body;
      
      const hotspot = await Tour360.addHotspot(
        id,
        timestamp_seconds,
        pitch,
        yaw,
        title,
        description,
        icon
      );
      
      res.status(201).json({ 
        message: 'Hotspot added successfully',
        hotspot 
      });
    } catch (error) {
      console.error('Add hotspot error:', error);
      res.status(500).json({ error: 'Failed to add hotspot' });
    }
  }
);

// Get hotspots for tour
router.get('/:id/hotspots', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userRole = req.user ? req.user.role : null;
    
    // Check if user has access to this tour
    const tour = await Tour360.getById(id, userRole);
    if (!tour) {
      return res.status(404).json({ error: 'Tour not found' });
    }
    
    const hotspots = await Tour360.getHotspots(id);
    
    res.json({ hotspots });
  } catch (error) {
    console.error('Get hotspots error:', error);
    res.status(500).json({ error: 'Failed to get hotspots' });
  }
});

// Delete hotspot (admin only)
router.delete('/hotspots/:hotspotId',
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const { hotspotId } = req.params;
      
      const hotspot = await Tour360.deleteHotspot(hotspotId);
      
      if (!hotspot) {
        return res.status(404).json({ error: 'Hotspot not found' });
      }
      
      res.json({ 
        message: 'Hotspot deleted successfully',
        hotspot 
      });
    } catch (error) {
      console.error('Delete hotspot error:', error);
      res.status(500).json({ error: 'Failed to delete hotspot' });
    }
  }
);

module.exports = router;
