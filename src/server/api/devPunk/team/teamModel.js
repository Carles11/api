import mongoose, { Schema } from 'mongoose'

const TeamSchema = new Schema({
  firstname: {
    type: String,
    required: true,
  },
  lastname: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  img: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  twitter_url: {
    type: String,
    required: true,
  },
  linkedin_url: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    required: true,
  },
  created: {
    type: Date,
    default: Date.now,
  },
})

module.exports = mongoose.model('devPunk_Member', TeamSchema)
