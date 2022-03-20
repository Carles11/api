import mongoose, { Schema } from 'mongoose'

const TeamSchema = new Schema({
  title: {
    type: String,
    required: true,
  },
  members: [
    {
      title: {
        type: String,
        required: true,
      },
      items: [
        {
          title: {
            type: String,
            required: true,
          },
          url: {
            type: String,
            required: true,
          },
        },
      ],
    },
  ],

  created: {
    type: Date,
    default: Date.now,
  },
})

module.exports = mongoose.model('devPunk_Member', TeamSchema)
