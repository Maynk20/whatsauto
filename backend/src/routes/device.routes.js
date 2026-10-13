import express from 'express';
import { authenticateUser } from '../middleware/auth.js';
import { deviceService } from '../services/device.service.js';

const router = express.Router();

router.get('/', authenticateUser, async (req, res, next) => {
  try {
    const devices = await deviceService.getDevices(req.user.id);
    res.json({ success: true, data: devices });
  } catch (err) {
    next(err);
  }
});

router.post('/connect', authenticateUser, async (req, res, next) => {
  try {
    const { deviceName, provider, phoneNumber } = req.body;
    const result = await deviceService.initiateConnection(req.user.id, {
      deviceName,
      provider,
      phoneNumber
    });
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', authenticateUser, async (req, res, next) => {
  try {
    await deviceService.disconnectDevice(req.user.id, req.params.id);
    res.json({ success: true, message: 'Device disconnected successfully' });
  } catch (err) {
    next(err);
  }
});

export default router;
