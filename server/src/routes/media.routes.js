import { Router } from 'express';
import { getInfo, download } from '../controllers/media.controller.js';

const router = Router();

router.get('/info', getInfo);
router.get('/download', download);

export default router;
