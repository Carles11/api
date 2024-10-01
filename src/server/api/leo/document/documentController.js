import Document from './documentModel'

export const list = async (req, res, next) => {
  try {
    const documents = await Document.find({})
    res.status(201).json({ success: true, data: documents })
  } catch (err) {
    res.status(500).json({ success: false, data: err })
  }
}
