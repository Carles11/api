import Document from './teamModel'

export const list = async (req, res, next) => {
  try {
    const members = await Document.find({})
    console.log('MMMememememem', members)
    res.status(200).json({
      success: true,
      data: [
        {
          firstName: 'Carles',
          lastName: 'del Río',
          email: 'contact@dev-punk.com',
          position: 'CTO & Founder',
          twitterUrl: '',
          linkedInUrl: '',
        },
        {
          firstName: 'Xavi',
          lastName: 'del Río',
          email: 'contact@dev-punk.com',
          position: 'CEO & Founder',
          twitterUrl: '',
          linkedInUrl: '',
        },
      ],
    })
  } catch (err) {
    res.status(500).json({ success: false, data: err })
  }
}
