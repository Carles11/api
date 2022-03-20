// @flow

import { Router } from 'express'

// import blog from './blog'
import leo from './leo'
import abluelemon from './abluelemon'
import devPunk from './devPunk'
// import terapias from './terapias'

const router = Router()

// router.use('/blog', blog)
router.use('/leo', leo)
router.use('/abluelemon', abluelemon)
router.use('/devPunk', devPunk)
// router.use('/terapias', terapias)

export default router
