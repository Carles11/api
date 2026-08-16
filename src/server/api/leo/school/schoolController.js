import School from './schoolModel'

export const list = async (req, res) => {
  try {
    const schools = await School.find({})
    return res.status(200).json({ success: true, data: schools })
  } catch (err) {
    return res.status(500).json({ success: false, data: err })
  }
}

export const create = async (req, res) => {
  try {
    /**
     * @todo xvila - unique is not working in School
     * model bc it was added when the ddbb already had data
     */
    // const emailExist = await School.find({ email: req.body.email })
    // if (!!emailExist.length) {
    //   return res.status(409).json({
    //     success: false,
    //     data:
    //       'Esta dirección de correo ya existe. Para modificar su perfil, contacte con la administradora c.cid@hws.schule',
    //   })
    // }
    const newSchool = await new School(req.body)
    await newSchool.save()
    const schools = await School.find({})
    return res.status(201).json({ success: true, data: schools })
  } catch (err) {
    return res.status(500).json({ success: false, data: err })
  }
}

export const update = async (req, res) => {
  try {
    const updateSchool = Object.assign(req.school, req.body)
    await updateSchool.save()
    const schools = await School.find({})
    return res.status(200).json({ success: true, data: schools })
  } catch (err) {
    return res.status(500).json({ success: false, data: err })
  }
}

export const remove = async (req, res) => {
  try {
    const schoolToRemove = req.school
    await School.deleteOne({ _id: schoolToRemove._id })
    const schools = await School.find({})
    return res.status(200).json({ success: true, data: schools })
  } catch (err) {
    console.error('Error removing school:', err.message)
    return res.status(500).json({ success: false, data: err })
  }
}

export const schoolById = async (req, res, next, id) => {
  try {
    req.school = await School.findById(id)
    next()
  } catch (err) {
    return res.status(404).json({ success: false, data: err })
  }
}

