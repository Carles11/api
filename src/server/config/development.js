// @flow

module.exports = {
  logging: true,
  db: {
    url: process.env.MONGODB_DEV,
  },
  mail: {
    user: process.env.USER_MAIL,
    pass: process.env.PASS_MAIL,
  },
  secret: 'something secret',
}
