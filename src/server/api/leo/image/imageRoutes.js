import { Router } from 'express'
import * as ctrl from './imageController'
import * as auth from '../../../auth'

const checkUser = [auth.decodeToken(), auth.getFreshUser('leo')]
const router = Router()

router.route('/').get(ctrl.list).post(checkUser, ctrl.create)

router.route('/:imageId').get(ctrl.read).put(checkUser, ctrl.update)

router.route('/year/:year').get(ctrl.yearList)

router.param('year', ctrl.imageByYear)
router.param('imageId', ctrl.imageById)

export default router
