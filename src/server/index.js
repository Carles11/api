// @flow

import express from 'express'
import cors from 'cors' // Import CORS
import api from './api'
import auth from './auth/routes'
import mongoose from './config/mongoose'
import middleware from './middleware'
import root from './root'

const app = express()
mongoose()
middleware(app)

// CORS Middleware
app.use(
  cors({
    origin: 'https://www.leo-leo-hessen.com', // Replace with your actual frontend URL
    methods: ['GET', 'POST', 'PUT', 'DELETE'], // Allowed HTTP methods
    allowedHeaders: ['Content-Type', 'Authorization'], // Allowed headers
  }),
)

// Middleware for cache control
app.use((req, res, next) => {
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
