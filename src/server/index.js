// @flow

import express from 'express'
import api from './api'
import auth from './auth/routes'
import mongoose from './config/mongoose'
import middleware from './middleware'
import root from './root'

const app = express()
mongoose()
middleware(app)

// Middleware para controlar el caché
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate') // HTTP 1.1
  res.setHeader('Pragma', 'no-cache') // HTTP 1.0
  res.setHeader('Expires', '0') // Proxies
  next()
})

app.use('/api', api)
app.use('/auth', auth)
app.use('/', root)

export default app
