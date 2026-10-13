import express from 'express';
import { authenticateUser } from '../middleware/auth.js';
import { storyService } from '../services/story.service.js';

const router = express.Router();

router.get('/', authenticateUser, async (req, res, next) => {
  try {
    const { limit, offset } = req.query;
    const stories = await storyService.listStories(req.user.id, {
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0
    });
    res.json({ success: true, data: stories });
  } catch (err) {
    next(err);
  }
});

router.post('/', authenticateUser, async (req, res, next) => {
  try {
    const { contentType, mediaPath, caption, bgColor, scheduledAt } = req.body;
    const story = await storyService.scheduleStory(req.user.id, {
      contentType,
      mediaPath,
      caption,
      bgColor,
      scheduledAt
    });
    res.status(201).json({ success: true, data: story });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/cancel', authenticateUser, async (req, res, next) => {
  try {
    const result = await storyService.cancelStory(req.user.id, req.params.id);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

export default router;
