import express from 'express';
import { authenticateUser } from '../middleware/auth.js';
import { queueService } from '../services/queue.service.js';

const router = express.Router();

router.get('/', authenticateUser, async (req, res, next) => {
  try {
    const { status, limit, offset } = req.query;
    const result = await queueService.getQueue(req.user.id, {
      status,
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0
    });
    res.json({ success: true, data: result.jobs, total: result.total });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/cancel', authenticateUser, async (req, res, next) => {
  try {
    await queueService.cancelQueueJob(req.user.id, req.params.id);
    res.json({ success: true, message: 'Message job cancelled' });
  } catch (err) {
    next(err);
  }
});

router.post('/clear-completed', authenticateUser, async (req, res, next) => {
  try {
    await queueService.clearCompleted(req.user.id);
    res.json({ success: true, message: 'Completed and cancelled jobs cleared' });
  } catch (err) {
    next(err);
  }
});

export default router;
