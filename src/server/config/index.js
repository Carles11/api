// @flow

import dotenv from 'dotenv'
dotenv.config()

const config = {
  dev: 'development',
  test: 'test',
  prod: 'production',
  port: process.env.PORT,
  expireTime: 24 * 60 * 10,
  secrets: {
    jwt: process.env.JWT,
  },
  env: '',
}

process.env.NODE_ENV = process.env.NODE_ENV || config.dev
config.env = process.env.NODE_ENV

let envConfig

try {
  if (config.env === 'test') {
    // eslint-disable-next-line
    envConfig = require('./testing.js')
  } else {
    // $FlowFixMe: suppressing this error until we can refactor
    envConfig = require(`./${config.env}.js`)
  }
} catch (e) {
  envConfig = {}
}

module.exports = Object.assign({}, config, envConfig)
