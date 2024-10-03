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
  // Allow caching for up to 6 months
  const maxAgeSeconds = 15778463 // 6 months in seconds
  const maxAgeMilliseconds = maxAgeSeconds * 1000 // Convert to milliseconds
  const expiresDate = new Date(Date.now() + maxAgeMilliseconds).toUTCString()

  res.setHeader('Cache-Control', `public, max-age=${maxAgeSeconds}`)
  res.setHeader('Pragma', 'cache') // HTTP 1.0
  res.setHeader('Expires', expiresDate) // Expires after 6 months
  next()
})

app.use('/api', api)
app.use('/auth', auth)
app.use('/', root)

export default app
