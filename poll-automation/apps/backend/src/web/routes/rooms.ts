import { Router } from 'express';
import {
  createOrUpdateRoom,
  getRoomDetails,
  getRoomQuestions,
  addManualQuestion,
  addAiQuestions,
  updateQuestionStatus,
  updateRoomStatus,
  deleteQuestion,
} from '../controllers/roomController';

const router = Router();

router.post('/', createOrUpdateRoom);
router.get('/:code/questions', getRoomQuestions);
router.post('/:code/questions/manual', addManualQuestion);
router.post('/:code/questions/ai', addAiQuestions);
router.patch('/:code/questions/:questionId/status', updateQuestionStatus);
router.delete('/:code/questions/:questionId', deleteQuestion);
router.patch('/:code/status', updateRoomStatus);
router.get('/:code', getRoomDetails);

export default router;
