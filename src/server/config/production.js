// @flow

require('babel-core/register')
require('babel-polyfill')

module.exports = {
  logging: false,
  db: {
    url: process.env.MONGODB_URI,
  },
  mail: {
    user: process.env.USER_MAIL,
    pass: process.env.PASS_MAIL,
  },
}
