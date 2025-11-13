import { Router } from 'express';
import { addManualQuestion, helpers } from '../controllers/roomController';

const router = Router();

router.post('/save_manual_poll', (req: any, res, next) => {
  const rawCode = typeof req.body?.roomCode === 'string' ? req.body.roomCode : '';
  const normalized = helpers.normalizeRoomCode(rawCode);
  if (!normalized) {
    res.status(400).json({ message: 'roomCode is required' });
    return;
  }
  req.params.code = normalized;
  addManualQuestion(req, res).catch(next);
});

export default router;
