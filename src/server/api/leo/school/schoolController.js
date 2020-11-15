import School from './schoolModel'
import nodemailer from 'nodemailer'

export const list = async (req, res) => {
  try {
    const schools = await School.find({})
    console.log("GET_SCHOOOOOOOOOOOOOOOLS", schools)
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
    const emailExist = await School.find({ email: req.body.email })
    if (!!emailExist.length) {
      return res.status(409).json({
        success: false,
        data:
          'Esta dirección de correo ya existe. Para modificar su perfil, contacte con la administradora c.cid@hws.schule',
      })
    }
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
    await schoolToRemove.remove()
    const schools = await School.find({})
    return res.status(200).json({ success: true, data: schools })
  } catch (err) {
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

const setMail = school => {
  let transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      type: 'OAuth2',
      clientId: '1067546246706-mf3u14dfbl9lhrpqpl61nrq41lkrlico.apps.googleusercontent.com',
      clientSecret: '3Stb9mRd1vtrI0CcVarPAfGq',
    },
  })

  transporter.sendMail({
    from: 'leoleoconcurso@gmail.com', // sender address
    to: `carles@crix.design, ${school.email}`, // list of receivers
    subject: 'Nueva escuela registrada!!', // Subject line
    generateTextFromHTML: true,
    html: `
          <h1>${school.name} se ha registrado en el concurso leo, leo... ¿qué lees?</h1>
          <br />
          <h2><small>Persona de contacto: </small>${school.name}</h2>
          <h2><small>Persona de contacto: </small>${school.contact}</h2>
          <h2><small>Teléfono: </small>${school.phone}</h2>
          <h2><small>Email: </small>${school.email}</h2>  
          <br /><br />  
          <p>&copy; Leo, leo... ¿Qué lees?</p>
        `,
    auth: {
      user: 'leoleoconcurso@gmail.com',
      refreshToken: '1/cI5CXoe7cReWK3yUoZDbCX7otnqy2rPRPhkIB4rF1Po',
      accessToken:
        'ya29.GlsdBt6AJ_RQdPNQYb3ecuhtMVvPMD2hA_rmBX3hduB3SPkBAT9Wu5TWnvtxET81l6b1EHMZXkS9KG4A0Mm9RIE_ufyY51iWK7Xh9PNUv1pQ9wVfNsIWF16eXsMp',
      expires: 1484314697598,
    },
  })
}
