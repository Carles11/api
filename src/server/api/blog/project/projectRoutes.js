// @flow

import { Router } from 'express'
import multer from 'multer'
import cloudinary from 'cloudinary'
import cloudinaryStorage from 'multer-storage-cloudinary'
import * as ctrl from './projectController'
import * as auth from '../../../auth'

// $FlowFixMe: suppressing this error until we can refactor
const checkUser = [auth.decodeToken(), auth.getFreshUser()]

cloudinary.config({
  cloud_name: process.env.BLOG_CLOUD_NAME,
  api_key: process.env.BLOG_API_KEY,
  api_secret: process.env.BLOG_API_SECRET,
})

const storage = cloudinaryStorage({
  cloudinary: cloudinary,
  folder: 'xaviervila.tech',
  allowedFormats: ['jpg', 'png'],
  transformation: [{ width: 800, height: 800, crop: 'limit' }],
})

const upload = multer({ storage })
const router = Router()

router.route('/').get(ctrl.list).post(checkUser, upload.single('file'), ctrl.create)

router
  .route('/:projectId')
  .get(ctrl.read)
  .put(checkUser, upload.single('file'), ctrl.update)
  .delete(checkUser, ctrl.remove)

router.param('projectId', ctrl.projectById)

export default router
