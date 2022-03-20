import { Router } from 'express'
import * as ctrl from './teamController'

const router = Router()

router.route('/').get(ctrl.list)

export default router
