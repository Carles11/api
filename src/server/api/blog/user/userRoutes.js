// @flow

import { Router } from 'express'
import * as ctrl from './userController'
import * as auth from '../../../auth'

// $FlowFixMe: suppressing this error until we can refactor
const checkUser = [auth.decodeToken(), auth.getFreshUser()]

const router = Router()

router.route('/').get(checkUser, ctrl.list)

router.route('/:userId').get(ctrl.read).put(checkUser, ctrl.update)

router.param('userId', ctrl.userById)

export default router
