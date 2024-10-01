import mongoose, { Schema } from 'mongoose'

const imageSchema = new Schema({
  src: {
    type: String,
    required: true,
    unique: true,
  },
  width: {
    type: Number,
    required: true,
  },
  height: {
    type: Number,
    required: true,
  },
  year: {
    type: Number,
    required: true,
  },
  caption: {
    type: String,
  },
  created: {
    type: Date,
    default: Date.now,
  },
})

module.exports = mongoose.model('leo_Image', imageSchema)
