import { Router } from 'express'
import * as ctrl from './schoolController'
import * as auth from '../../../auth'

const checkUser = [auth.decodeToken(), auth.getFreshUser('leo')]
const router = Router()

router.route('/').get(ctrl.list).post(ctrl.create)

router.route('/:schoolId').put(checkUser, ctrl.update).delete(checkUser, ctrl.remove)

router.param('schoolId', ctrl.schoolById)

export default router
