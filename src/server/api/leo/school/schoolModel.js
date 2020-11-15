import mongoose, { Schema } from 'mongoose'

const currentYear = new Date().getFullYear() + 1

const SchoolSchema = Schema({
  name: {
    type: String,
    required: true,
  },
  phone: {
    type: String,
    required: true,
  },
  address: {
    type: String,
    required: true,
  },
  contact: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  category: {
    type: Array,
  },
  cp: {
    type: String,
  },
  city: {
    type: String,
  },
  year: {
    type: Number,
    default: currentYear,
  },
})
module.exports = mongoose.model('leo_schools', SchoolSchema)
