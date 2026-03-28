import express from 'express';
import { body } from 'express-validator';

import { chat, recommendQuestions } from '../../controllers/front/ai.controller.js';
import { validateRequest } from '../../middlewares/validate-request.js';

const router = express.Router();

router.get('/recommend-questions', recommendQuestions);
router.post(
  '/chat',
  [
    body('question')
      .isString()
      .withMessage('question must be a string')
      .trim()
      .notEmpty()
      .withMessage('question is required')
      .isLength({ max: 200 })
      .withMessage('question is too long'),
    validateRequest
  ],
  chat
);

export default router;
