// @flow

import { Router } from 'express'
import { verifyUser } from './index'
import signin from './controller'
import { authLimiter } from '../middleware/rateLimit'

const router = Router()

router.post('/signin', authLimiter, verifyUser(), signin)
router.post('/signin-leo', authLimiter, verifyUser('leo'), signin)

export default router
