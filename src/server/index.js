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
const allowedOrigins =
  process.env.NODE_ENV === 'development' ? ['http://localhost:3000'] : ['https://www.leo-leo-hessen.com']

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or Postman)
      if (!origin || allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true)
      } else {
        callback(new Error('Not allowed by CORS'))
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
)

// Middleware for cache control
app.use((req, res, next) => {
  const maxAgeSeconds = 3600 // Shortened to 1 hour or adjust as needed
  res.setHeader('Cache-Control', `public, max-age=${maxAgeSeconds}`)
  next()
})

// Disable cache for specific routes (like DELETE or GET on lists)
app.use('/api/schools/:id', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store')
  next()
})

app.get('/api/schools', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store')
  next()
})

app.use('/api', api)
app.use('/auth', auth)
app.use('/', root)

export default app
