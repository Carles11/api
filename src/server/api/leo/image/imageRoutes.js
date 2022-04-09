import { Router } from 'express'
import * as ctrl from './imageController'

const router = Router()

router.route('/').get(ctrl.list).post(ctrl.create)

router.route('/:imageId').get(ctrl.read).put(ctrl.update)

router.route('/year/:year').get(ctrl.yearList)

router.param('year', ctrl.imageByYear)
router.param('imageId', ctrl.imageById)

export default router
