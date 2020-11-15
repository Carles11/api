// @flow

import { Router } from 'express'

// import blog from './blog'
import leo from './leo'
// import abluelemon from './abluelemon'
import terapias from './terapias'

const router = Router()

// router.use('/blog', blog)
router.use('/leo', leo)
// router.use('/abluelemon', abluelemon)
// router.use('/terapias', terapias)

export default router
