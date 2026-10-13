import express from 'express';
import { authenticateUser } from '../middleware/auth.js';
import { campaignSubmissionLimiter } from '../middleware/rateLimiter.js';
import { campaignService } from '../services/campaign.service.js';
import { supabaseAdmin } from '../config/supabase.js';

const router = express.Router();

router.get('/', authenticateUser, async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('campaigns')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw { status: 500, message: error.message };
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.post('/', authenticateUser, campaignSubmissionLimiter, async (req, res, next) => {
  try {
    const { name, description, template, recipients, scheduledAt } = req.body;
    const result = await campaignService.createCampaign(req.user.id, {
      name,
      description,
      template,
      recipients,
      scheduledAt
    });

    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

export default router;
