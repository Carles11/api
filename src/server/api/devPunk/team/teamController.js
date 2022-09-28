/* eslint-disable import/prefer-default-export */
import Team from './teamModel'

export const list = async (req, res, next) => {
  try {
    const members = await Team.find({})
    res.status(200).json({
      success: true,
      data: members,
    })
  } catch (err) {
    res.status(500).json({ success: false, data: err })
  }
}
