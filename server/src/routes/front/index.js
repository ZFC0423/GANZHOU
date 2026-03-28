import express from 'express';
import homeRoutes from './home.routes.js';
import scenicRoutes from './scenic.routes.js';
import articleRoutes from './article.routes.js';
import aiRoutes from './ai.routes.js';

const router = express.Router();

router.use('/home', homeRoutes);
router.use('/scenic', scenicRoutes);
router.use('/article', articleRoutes);
router.use('/ai', aiRoutes);

export default router;
