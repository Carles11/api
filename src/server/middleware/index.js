// @flow

import express from 'express'
import favicon from 'serve-favicon'
import morgan from 'morgan'
import compression from 'compression'
import cors from 'cors'
import path from 'path'
import override from 'method-override'
import bodyParser from 'body-parser'

import config from '../config'

export default (app: Object) => {
  if (config.env === 'development') {
    app.use(morgan('dev'))
  } else {
    app.use(compression())
  }

  app.use(cors())
  app.use(override())

  app.use(bodyParser.json({ limit: '10mb' }))
  app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }))

  app.use('/static', express.static(path.join(__dirname, 'public')))
  app.use(favicon('./public/favicon.ico'))
}
