import rateLimit from 'express-rate-limit'

// Cloudflare sits in front of DigitalOcean App Platform (confirmed: responses carry
// `Server: cloudflare` and a CF-RAY header). cf-connecting-ip is the true client IP and
// cannot be spoofed from outside, so prefer it over req.ip.
const keyGenerator = (req) => req.headers['cf-connecting-ip'] || req.ip

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  keyGenerator,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, data: 'Demasiados intentos. Inténtelo de nuevo más tarde.' },
})

export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  keyGenerator,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, data: 'Demasiados registros desde esta red. Inténtelo más tarde.' },
})
