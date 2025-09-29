import { Router } from 'express';
import claimRouter from './claim';
import statusRouter from './status';

const router = Router();

router.use('/claim', claimRouter);
router.use('/status', statusRouter);

export default router;