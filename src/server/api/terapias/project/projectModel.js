import mongoose, { Schema } from 'mongoose'

const ProjectSchema = new Schema({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: Array,
    required: true,
  },
  images: {
    type: Array,
    required: true,
  },
  year: {
    type: Number,
    required: true,
  },
  location: {
    type: String,
    required: true,
  },
  documents: {
    type: Array,
  },
  video: {
    type: Array,
  },
  created: {
    type: Date,
    default: Date.now,
  },
})

module.exports = mongoose.model('Project', ProjectSchema)
