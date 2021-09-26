// @flow

import jwt from 'jsonwebtoken'
import expressJwt from 'express-jwt'
import config from '../config'
import User from '../api/blog/user/userModel'
import leo_User from '../api/leo/user/userModel'
import errorHandler from '../middleware/errorHandler'

const checkToken = expressJwt({ secret: config.secrets.jwt })

const getModel = (type: string = '') => {

  switch (type) {
    case 'leo': return leo_User
    default: return User
  }
}

export const decodeToken = () => (req: Object, res: Object, next: Function) => {
  if (req.headers && req.headers['access-token']) {
    req.headers.authorization = `Bearer ${req.headers['access-token']}`
  }
  console.log('DECODING-TOKEN', req.headers)
  checkToken(req, res, next)
}

export const getFreshUser = (type: string = '') => (req: Object, res: Object, next: Function) => {
  const currentUser = getModel(type)

  currentUser.findById(req.user._id)
    .then(user => {
      if (!user) {
        return res.status(401).json({ success: false, data: 'Unauthorized User' })
      }
      req.user = user
      next()
    }, err => {
      next(err)
    })
}


export const verifyUser = (type: string = '') => (req: Object, res: Object, next: Function) => {
  const currentUser = getModel(type)
  const username = req.body.username
  const password = req.body.password
 

  // if no username or password then send
  if (!username || !password) {
    return res.status(400).json({ success: false, data: 'You need a username and password' })
  }

  currentUser.findOne({ username })
    .then(user => {
      if (!user) {
        return res.status(401).json({ success: false, data: 'No user with the given username' })
      }

      if (!user.authenticate(password)) {
        return res.status(401).json({ success: false, data: 'Wrong password' })
      }

      req.user = user
      return next()
    }, err => next(err))
  return false
}

export const signToken = (id: string) =>
  jwt.sign(
    { _id: id },
    config.secrets.jwt,
    { expiresIn: config.expireTime },
  )
