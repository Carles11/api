// @flow

import colors from 'colors/safe'
import mongoose from 'mongoose'
import config from './index'

export default () => {
  mongoose.Promise = global.Promise
  mongoose.connect(config.db.url, { useNewUrlParser: true })

  const db = mongoose.connection

  if (config.env !== 'test') {
    /* eslint-disable no-console */
    db.on('connected', () => console.log(colors.green('[  DB connected.  ]')))
    db.on('error', (err) => console.error(colors.red(err)))
    db.on('disconnected', () => console.log(colors.red('[  DB disconnected.  ]')))
    /* eslint-enable no-console */
  }
}
