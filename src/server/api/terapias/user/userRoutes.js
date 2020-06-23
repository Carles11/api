import { Router } from 'express'
import * as ctrl from './userController'

const router = Router()

router
  .route('/')
  .get(ctrl.list)
  
export default router