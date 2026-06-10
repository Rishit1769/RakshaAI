import { Router } from 'express';
import { downloadMobileApp } from '../controllers/app.controller';

const router = Router();

router.get('/download', downloadMobileApp);

export default router;
