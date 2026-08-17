import { Router } from 'express'
import * as ctrl from './schoolController'
import * as auth from '../../../auth'
import { registerLimiter } from '../../../middleware/rateLimit'

const checkUser = [auth.decodeToken(), auth.getFreshUser('leo')]
const router = Router()

router.route('/').get(ctrl.listPublic).post(registerLimiter, ctrl.create)

router.route('/all').get(checkUser, ctrl.list)

router.route('/:schoolId').put(checkUser, ctrl.update).delete(checkUser, ctrl.remove)

router.param('schoolId', ctrl.schoolById)

export default router
