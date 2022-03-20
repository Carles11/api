import Document from './teamModel'

export const list = async (req, res, next) => {
  try {
    const members = await Document.find({})
    res.status(201).json({ success: true, data: members })
  } catch (err) {
    res.status(500).json({ success: false, data: err })
  }
}
