// @flow

import colors from 'colors/safe'
import mongoose from 'mongoose'
import config from './index'

export default () => {
  // config.db.url does not work — see task A-19 (config/production.js throws on two
  // undeclared Babel 6 requires and the error is swallowed by a catch).
  const uri =
    process.env.NODE_ENV === 'production'
      ? process.env.MONGODB_URI
      : process.env.MONGODB_DEV || process.env.MONGODB_URI

  mongoose.Promise = global.Promise
  mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })

  const db = mongoose.connection

  if (config.env !== 'test') {
    /* eslint-disable no-console */
    db.on('connected', () => {
      const varName =
        process.env.NODE_ENV === 'production' ? 'MONGODB_URI' : (process.env.MONGODB_DEV ? 'MONGODB_DEV' : 'MONGODB_URI')
      console.log(colors.green(`[  DB  ]: connected via ${varName}`))
    })
    db.on('error', (err) => console.error(colors.red(err)))
    db.on('disconnected', () => console.log(colors.red('[  DB disconnected.  ]')))
    /* eslint-enable no-console */
  }
}
