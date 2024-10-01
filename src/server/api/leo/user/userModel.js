import mongoose, { Schema } from 'mongoose'
import bcrypt from 'bcrypt'

const UserSchema = new Schema({
  firstname: {
    type: String,
    required: true,
  },
  lastname: {
    type: String,
    required: true,
  },
  username: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  admin: {
    type: Boolean,
    default: false,
  },
  created: {
    type: Date,
    default: Date.now,
  },
})

UserSchema.pre('save', function (next) {
  if (!this.isModified('password')) return next()
  this.password = this.encryptPassword(this.password)
  return next()
})

UserSchema.methods = {
  // eslint-disable-next-line object-shorthand
  authenticate: function (plainTextPword) {
    const salt = bcrypt.genSaltSync(10)
    return bcrypt.compareSync(plainTextPword, this.password)
  },
  // eslint-disable-next-line object-shorthand
  encryptPassword: function (plainTextPword) {
    if (!plainTextPword) {
      return ''
    }
    const salt = bcrypt.genSaltSync(10)
    return bcrypt.hashSync(plainTextPword, salt)
  },
}

module.exports = mongoose.model('leo_User', UserSchema)
