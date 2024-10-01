// @flow

import { Router } from 'express'

import users from './user/userRoutes'
import projects from './project/projectRouter'

const router = Router()

router.use('/users', users)
router.use('/projects', projects)

export default router
