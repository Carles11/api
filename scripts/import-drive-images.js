import dotenv from 'dotenv'
import mongoose from 'mongoose'
import { google } from 'googleapis'

dotenv.config()

/* eslint-disable no-console */

const IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/bmp',
])

const DIMENSION_CACHE = new Map()

// ---- arg parsing -----------------------------------------------------------

function parseArgs(argv) {
  const get = flag => {
    const i = argv.indexOf(flag)
    return i === -1 ? undefined : argv[i + 1]
  }

  const env = get('--env') || 'dev'
  if (env !== 'dev' && env !== 'prod') {
    throw new Error(`--env must be "dev" or "prod", got "${env}".`)
  }

  const year = Number(get('--year'))
  if (!Number.isInteger(year) || year <= 0) {
    throw new Error('A valid --year (positive integer) is required.')
  }

  const limit = Number(get('--limit'))
  if (get('--limit') !== undefined && (!Number.isInteger(limit) || limit <= 0)) {
    throw new Error('--limit must be a positive integer.')
  }

  return {
    folder: get('--folder'),
    year,
    env,
    dryRun: argv.includes('--dry-run'),
    limit,
  }
}

// ---- folder id -------------------------------------------------------------

function extractFolderId(folder) {
  if (!folder) throw new Error('--folder is required (a Drive folder URL or folder id).')
  const urlMatch = folder.match(/\/folders\/([A-Za-z0-9_-]+)/)
  if (urlMatch) return urlMatch[1]
  const idMatch = folder.match(/^[A-Za-z0-9_-]{8,}$/)
  if (idMatch) return folder
  throw new Error(`Could not extract a Drive folder id from: ${folder}`)
}

// ---- pure-JS image dimension parsers ---------------------------------------

function readU32LE(buf, off) {
  return buf[off] | (buf[off + 1] << 8) | (buf[off + 2] << 16) | (buf[off + 3] << 24)
}

function readU32BE(buf, off) {
  return (buf[off] << 24) | (buf[off + 1] << 16) | (buf[off + 2] << 8) | buf[off + 3]
}

function readU16BE(buf, off) {
  return (buf[off] << 8) | buf[off + 1]
}

function readU16LE(buf, off) {
  return buf[off] | (buf[off + 1] << 8)
}

function detectDimensions(buf) {
  if (!buf || buf.length < 16) return null

  // PNG — IHDR at offset 16 (after 8-byte signature): width, height (big-endian)
  if (
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47
    && buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a
  ) {
    return { width: readU32BE(buf, 16), height: readU32BE(buf, 20) }
  }

  // GIF — bytes 0-5 "GIF87a"/"GIF89a", logical screen width/height at 6 and 8 (little-endian)
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) {
    return { width: readU16LE(buf, 6), height: readU16LE(buf, 8) }
  }

  // BMP — header at offset 18 (width, height as signed 32-bit LE); height may be negative
  if (buf[0] === 0x42 && buf[1] === 0x4d) {
    const width = readU32LE(buf, 18)
    const rawHeight = readU32LE(buf, 22)
    return { width, height: Math.abs(rawHeight) }
  }

  // WebP — "RIFF....WEBP"; find VP8/VP8L/VP8X chunk (8-byte chunk headers from offset 12)
  if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46) {
    let off = 12
    while (off + 8 <= buf.length) {
      const fourcc = String.fromCharCode(buf[off], buf[off + 1], buf[off + 2], buf[off + 3])
      const size = readU32LE(buf, off + 4)
      const payload = off + 8
      if (fourcc === 'VP8X') {
        if (payload + 10 <= buf.length) {
          return {
            width: 1 + ((buf[payload + 4] | (buf[payload + 5] << 8) | (buf[payload + 6] << 16)) & 0xffffff),
            height: 1 + ((buf[payload + 7] | (buf[payload + 8] << 8) | (buf[payload + 9] << 16)) & 0xffffff),
          }
        }
        return null
      }
      if (fourcc === 'VP8 ') {
        if (payload + 10 <= buf.length) {
          return {
            width: readU16LE(buf, payload + 6) & 0x3fff,
            height: readU16LE(buf, payload + 8) & 0x3fff,
          }
        }
        return null
      }
      if (fourcc === 'VP8L') {
        if (payload + 5 <= buf.length) {
          const b1 = buf[payload + 1]
          const b2 = buf[payload + 2]
          const b3 = buf[payload + 3]
          const b4 = buf[payload + 4]
          const width = 1 + (((b2 & 0x3f) << 8) | b1)
          const height = 1 + (((b4 & 0x0f) << 10) | (b3 << 2) | ((b2 & 0xc0) >> 6))
          return { width, height }
        }
        return null
      }
      off = payload + size + (size % 2)
      if (size === 0) return null
    }
    return null
  }

  // JPEG — scan markers for SOF0..SOF15 (not DHT 0xC4, JPG 0xC8, DAC 0xCC)
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let off = 2
    while (off + 9 <= buf.length) {
      if (buf[off] !== 0xff) {
        off += 1
        continue
      }
      const marker = buf[off + 1]
      // standalone markers with no length
      if (
        marker === 0xd8 || marker === 0xd9 || marker === 0x01
        || (marker >= 0xd0 && marker <= 0xd7)
      ) {
        off += 2
        continue
      }
      if (off + 4 > buf.length) break
      const len = readU16BE(buf, off + 2)
      const sof = marker >= 0xc0 && marker <= 0xcf
        && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc
      if (sof) {
        const height = readU16BE(buf, off + 5)
        const width = readU16BE(buf, off + 7)
        return { width, height }
      }
      off += 2 + len
    }
    return null
  }

  return null
}

// ---- fetching ---------------------------------------------------------------

async function fetchImageBytes(source) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 30000)
  try {
    const res = await fetch(source, { signal: controller.signal })
    if (res.ok) {
      const arr = await res.arrayBuffer()
      return Buffer.from(arr)
    }
    return null
  } catch (e) {
    return null
  } finally {
    clearTimeout(timer)
  }
}

async function getImageBytes(drive, fileId, src) {
  try {
    const res = await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'arraybuffer' },
    )
    return Buffer.from(res.data)
  } catch (e) {
    // fall back to the public lh3 CDN URL
    return fetchImageBytes(src)
  }
}

async function detectViaDrive(drive, fileId, src) {
  if (DIMENSION_CACHE.has(fileId)) return DIMENSION_CACHE.get(fileId)
  const bytes = await getImageBytes(drive, fileId, src)
  const dims = bytes ? detectDimensions(bytes) : null
  DIMENSION_CACHE.set(fileId, dims)
  return dims
}

// ---- main -------------------------------------------------------------------

async function run() {
  const args = parseArgs(process.argv.slice(2))
  const folderId = extractFolderId(args.folder)

  const uri = args.env === 'prod'
    ? process.env.MONGODB_URI
    : (process.env.MONGODB_DEV || process.env.MONGODB_URI)

  if (!uri) {
    console.error('No MONGODB_DEV / MONGODB_URI found in .env — exiting.')
    process.exit(1)
  }

  const apiKey = process.env.GOOGLE_DRIVE_API_KEY
  if (!apiKey) {
    console.error('GOOGLE_DRIVE_API_KEY is missing from .env — exiting.')
    process.exit(1)
  }

  let host = 'unknown'
  try { host = new URL(uri).hostname } catch (e) { /* keep default */ }

  console.log(`Folder id: ${folderId}`)
  console.log(`Year: ${args.year} | env: ${args.env} | host: ${host}`)
  console.log(`Mode: ${args.dryRun ? 'DRY-RUN (no writes)' : 'WRITE'}`)

  if (args.env === 'prod') {
    console.error(
      '\nYou are about to write to PRODUCTION (' + host + ').\n'
      + 'Type "confirm" to continue, or anything else to abort:',
    )
    const answer = await readLine()
    if (answer.trim().toLowerCase() !== 'confirm') {
      console.error('Aborted — no write to production.')
      process.exit(0)
    }
  }

  await mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })

  const drive = google.drive({ version: 'v3', auth: apiKey })

  // 1. list files, paginated
  const files = []
  let pageToken = null
  do {
    const params = {
      q: `'${folderId}' in parents`,
      fields: 'nextPageToken, files(id, name, mimeType)',
      pageSize: 100,
    }
    if (pageToken) params.pageToken = pageToken
    const res = await drive.files.list(params)
    files.push(...(res.data.files || []))
    pageToken = res.data.nextPageToken || null
  } while (pageToken)

  const images = files.filter(f => IMAGE_MIME_TYPES.has(f.mimeType))
  console.log(`\nFound ${files.length} items, ${images.length} images.`)
  if (args.limit) console.log(`Processing limit: ${args.limit}`)

  const slice = args.limit ? images.slice(0, args.limit) : images

  const Image = mongoose.model(
    'leo_Image',
    new mongoose.Schema({
      src: { type: String, required: true, unique: true },
      width: { type: Number, required: true },
      height: { type: Number, required: true },
      year: { type: Number, required: true },
      caption: { type: String },
      created: { type: Date, default: Date.now },
    }),
  )

  let inserted = 0
  let skipped = 0
  let errors = 0

  for (const file of slice) {
    const src = `https://lh3.googleusercontent.com/d/${file.id}`

    // 2. dimension detection
    const dims = await detectViaDrive(drive, file.id, src)
    if (!dims) {
      console.log(`  [skip] ${file.name} — could not read dimensions`)
      skipped += 1
      continue
    }

    // 3. validate src returns 200
    const check = await fetch(src)
    if (!check.ok) {
      console.log(`  [skip] ${file.name} — src HTTP ${check.status}: ${src}`)
      check.body?.cancel()
      skipped += 1
      continue
    }
    check.body?.cancel()

    if (args.dryRun) {
      console.log(`  [would insert] ${file.name} — ${dims.width}x${dims.height} ${src}`)
      inserted += 1
      continue
    }

    try {
      await Image.findOneAndUpdate(
        { src },
        { $setOnInsert: {
            src,
            width: dims.width,
            height: dims.height,
            year: args.year,
            caption: '',
          } },
        { upsert: true },
      )
      console.log(`  [inserted] ${file.name} — ${dims.width}x${dims.height} ${src}`)
      inserted += 1
    } catch (e) {
      console.error(`  [error] ${file.name} — ${e.message}`)
      errors += 1
    }
  }

  console.log(`\nDone. ${inserted} ${args.dryRun ? 'would be inserted' : 'inserted'}, `
    + `${skipped} skipped, ${errors} errors.`)

  await mongoose.disconnect()
  process.exit(0)
}

function readLine() {
  return new Promise(resolve => {
    process.stdin.resume()
    process.stdin.setEncoding('utf8')
    process.stdin.once('data', data => {
      process.stdin.pause()
      resolve(String(data))
    })
  })
}

run().catch(err => {
  console.error(err)
  process.exit(1)
})
