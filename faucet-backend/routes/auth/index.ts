import { Router } from 'express';
import messageRouter from './message';
import signinRouter from './signin';

const router = Router();

router.use('/message', messageRouter);
router.use('/signin', signinRouter);

export default router;