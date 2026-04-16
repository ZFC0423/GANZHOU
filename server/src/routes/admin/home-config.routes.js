import express from 'express';
import { body } from 'express-validator';
import { detail, update } from '../../controllers/admin/home-config.controller.js';
import { validateRequest } from '../../middlewares/validate-request.js';

const router = express.Router();

router.get('/detail', detail);
router.put(
  '/update',
  [
    body('siteName').optional({ nullable: true }).isString().withMessage('siteName must be a string'),
    body('siteDescription').optional({ nullable: true }).isString().withMessage('siteDescription must be a string'),
    body('homeHeroImage').optional({ nullable: true }).isString().withMessage('homeHeroImage must be a string'),
    body('homeHeroNote').optional({ nullable: true }).isString().withMessage('homeHeroNote must be a string'),
    body('chapterConfigs').optional().isArray().withMessage('chapterConfigs must be an array'),
    body('recommendEntries').optional().isArray().withMessage('recommendEntries must be an array'),
    validateRequest
  ],
  update
);

export default router;
