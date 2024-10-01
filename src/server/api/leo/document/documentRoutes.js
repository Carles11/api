import { Router } from 'express'
import * as ctrl from './documentController'

const router = Router()

router.route('/').get(ctrl.list)

export default router
