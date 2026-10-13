import express from 'express';
import { authenticateUser } from '../middleware/auth.js';
import { logsRepository } from '../repositories/logs.repository.js';

const router = express.Router();

router.get('/', authenticateUser, async (req, res, next) => {
  try {
    const { eventType, status, limit, offset } = req.query;
    const { data, count, error } = await logsRepository.listLogs(req.user.id, {
      eventType,
      status,
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0
    });

    if (error) throw { status: 500, message: error.message };

    res.json({
      success: true,
      data,
      total: count
    });
  } catch (err) {
    next(err);
  }
});

export default router;
