import Team from './teamModel'

export const list = async (req, res, next) => {
  try {
    const members = await Team.find({})
    console.log('MMMememememem', members)
    res.status(200).json({
      success: true,
      data: [
        {
          firstName: 'Carles',
          lastName: 'del Río',
          email: 'contact@dev-punk.com',
          role: 'CTO & Founder',
          img: '',
          twitterUrl: '',
          linkedInUrl: '',
        },
        {
          firstName: 'Xavi',
          lastName: 'del Río',
          img: '',
          email: 'contact@dev-punk.com',
          role: 'CEO & Founder',
          twitterUrl: '',
          linkedInUrl: '',
        },
      ],
    })
  } catch (err) {
    res.status(500).json({ success: false, data: err })
  }
}
