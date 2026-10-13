import express from 'express';
import { authenticateUser } from '../middleware/auth.js';
import { dashboardService } from '../services/dashboard.service.js';

const router = express.Router();

router.get('/stats', authenticateUser, async (req, res, next) => {
  try {
    const stats = await dashboardService.getStats(req.user.id);
    res.json({
      success: true,
      data: stats
    });
  } catch (err) {
    next(err);
  }
});

export default router;
