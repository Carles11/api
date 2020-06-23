import Project from './projectModel'

export const list = async (req, res, next) => {
  try {
    const projects = await Project.find({})
    return res.status(201).json({ success: true, data: projects })
  } catch (err) {
    return res.status(500).json({ success: false, data: err })
  }
}

export const read = (req, res) => res.status(200).json({ success: true, data: req.project })

export const projectById = async (req, res, next, id) => {
  try {
    req.project = await Project.findById(id)
    next()
  } catch (err) {
    return res.status(404).json({ success: false, data: err })
  }
}
