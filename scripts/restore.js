import dotenv from 'dotenv'
import mongoose from 'mongoose'
import fs from 'fs'
import path from 'path'

dotenv.config()

const COLLECTIONS = ['leo_schools', 'leo_documents', 'leo_images', 'leo_users']

async function run() {
  const targetUri = process.env.RESTORE_TARGET_URI
  if (!targetUri) {
    /* eslint-disable no-console */
    console.error(
      'RESTORE_TARGET_URI is not set. '
      + 'Restoring requires an explicit target — refusing.',
    )
    /* eslint-enable no-console */
    process.exit(1)
  }

  if (targetUri === process.env.MONGODB_URI) {
    /* eslint-disable no-console */
    console.error(
      'RESTORE_TARGET_URI is identical to MONGODB_URI — '
      + 'restoring into the production database is not allowed.',
    )
    /* eslint-enable no-console */
    process.exit(1)
  }

  const backupFolder = process.argv[2]
  if (!backupFolder) {
    /* eslint-disable no-console */
    console.error('Usage: babel-node scripts/restore.js <backup-folder> [--confirm]')
    /* eslint-enable no-console */
    process.exit(1)
  }

  const dir = path.resolve(backupFolder)
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
    /* eslint-disable no-console */
    console.error(`Backup folder not found: ${dir}`)
    /* eslint-enable no-console */
    process.exit(1)
  }

  await mongoose.connect(targetUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })

  let host = 'unknown'
  try {
    const url = new URL(targetUri)
    host = url.hostname
  } catch (e) {
    // keep default
  }

  const jsonFiles = fs.readdirSync(dir)
    .filter(f => f.endsWith('.json'))
    .filter(f => COLLECTIONS.includes(path.basename(f, '.json')))

  // Guard 3: refuse collections that already contain documents
  const checks = await Promise.all(
    jsonFiles.map(async file => {
      const name = path.basename(file, '.json')
      const existing = await mongoose.connection.db
        .collection(name)
        .countDocuments()

      if (existing > 0) {
        /* eslint-disable no-console */
        console.error(
          `REFUSE ${name}: target collection already contains `
          + `${existing} documents — skipping to avoid duplicates.`,
        )
        /* eslint-enable no-console */
        return null
      }

      const filePath = path.join(dir, file)
      const docs = JSON.parse(fs.readFileSync(filePath, 'utf8'))
      return { name, docs, count: docs.length }
    }),
  )

  const toRestore = checks.filter(Boolean)

  if (toRestore.length === 0) {
    /* eslint-disable no-console */
    console.error(
      'Nothing to restore — all collections already contain data '
      + 'or no valid backup files were found.',
    )
    /* eslint-enable no-console */
    await mongoose.disconnect()
    process.exit(1)
  }

  /* eslint-disable no-console */
  console.log(`Target host: ${host}`)

  const confirm = process.argv.includes('--confirm')
  if (!confirm) {
    console.log('Dry run — the following would be restored:\n')
    toRestore.forEach(({ name, count }) => {
      console.log(`  ${name}: ${count} documents`)
    })
    console.log('\nRe-run with --confirm to execute.')
    await mongoose.disconnect()
    process.exit(0)
  }

  // Guard 4 confirmed — execute the restore
  await Promise.all(
    toRestore.map(async ({ name, docs }) => {
      await mongoose.connection.db.collection(name).insertMany(docs)
      console.log(`${name}: ${docs.length} documents inserted`)
    }),
  )
  /* eslint-enable no-console */

  await mongoose.disconnect()
  process.exit(0)
}

run().catch(err => {
  console.error(err) // eslint-disable-line no-console
  process.exit(1)
})
