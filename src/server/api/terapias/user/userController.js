import User from './userModel'

export const list = async (req, res, next) => {
  try {
    const users = await User.find({})
    return res.status(201).json({ success: true, data: users})
  } catch (err) {
    return res.status(500).json({ success: false, data: err })
  }
}