import Image from './imageModel'

/**
 * List all the images
 * @param {*} req
 * @param {*} res
 */
export const list = async (req, res) => {
  try {
    const images = await Image.find({})
    return res.status(200).json({ success: true, data: images })
  } catch (err) {
    return res.status(500).json({ success: false, data: err })
  }
}

/**
 * Create and save a new Image Item
 * @param {*} req
 * @param {*} res
 */
export const create = async (req, res) => {
  try {
    const newImage = new Image(req.body)
    await newImage.save()
    const images = await Image.find({})
    return res.status(201).json({ success: true, data: images })
  } catch (err) {
    return res.status(500).json({ success: false, data: err })
  }
}

/**
 * Return an specific image by id
 * @param {*} req
 * @param {*} res
 */
export const read = (req, res) => res.status(200).json({ success: true, data: req.image })

/**
 * Return a collection of Images by year
 * @param {*} req
 * @param {*} res
 */
export const yearList = (req, res) => res.status(200).json({ success: true, data: req.image })

/**
 * Update Image Model data
 * @param {*} req
 * @param {*} res
 */
export const update = async (req, res) => {
  try {
    const updateImage = Object.assign(req.image, req.body)
    await updateImage.save()
    const images = await Image.find({})
    return res.status(200).json({ success: true, data: images })
  } catch (err) {
    return res.status(500).json({ success: false, data: err })
  }
}

/**
 * Filter by Id
 * @param {*} req
 * @param {*} res
 * @param {*} next
 * @param {*} id
 */
export const imageById = async (req, res, next, id) => {
  try {
    req.image = await Image.findById(id)
    next()
  } catch (err) {
    return res.status(404).json({ success: false, data: err })
  }
}

/**
 * Filter by year
 * @param {*} req
 * @param {*} res
 * @param {*} next
 * @param {*} year
 */
export const imageByYear = async (req, res, next, year) => {
  try {
    req.image = await Image.find({ year: year })
    next()
  } catch (err) {
    return res.status(404).json({ success: false, data: err })
  }
}
