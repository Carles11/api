import { Router } from 'express'
import * as ctrl from './userController'
import * as auth from '../../../auth'

const checkUser = [auth.decodeToken(), auth.getFreshUser('leo')]
const router = Router()

router.route('/').get(checkUser, ctrl.list).post(checkUser, ctrl.create)

router.route('/:userId').get(checkUser, ctrl.read).put(checkUser, ctrl.update)

router.param('userId', ctrl.userById)

export default router
