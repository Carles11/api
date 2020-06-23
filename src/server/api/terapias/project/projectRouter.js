import { Router } from 'express'
import * as ctrl from './projectController'

const router = Router()

router
  .route('/')
  .get(ctrl.list)

router
  .route('/:projectId')
  .get(ctrl.read)

router.param('projectId', ctrl.projectById)

export default router