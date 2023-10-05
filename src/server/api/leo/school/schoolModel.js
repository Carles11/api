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
  },
  category: {
    type: Array,
  },
  interestCheckbox: {
    type: Boolean,
  },
  bases_consent: {
    type: Boolean,
  },
  image_consent: {
    type: Boolean,
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
