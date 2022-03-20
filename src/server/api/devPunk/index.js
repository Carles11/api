// @flow

import { Router } from 'express'

import members from './team/teamRoutes'

const router = Router()

router.use('/team', members)

export default router
