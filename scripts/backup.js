import dotenv from 'dotenv'
import mongoose from 'mongoose'
import fs from 'fs'
import path from 'path'

dotenv.config()

const COLLECTIONS = ['leo_schools', 'leo_documents', 'leo_images', 'leo_users']

async function run() {
  await mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })

  const now = new Date()
  const stamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0'),
  ].join('-')

  const dir = path.resolve('backups', stamp)
  fs.mkdirSync(dir, { recursive: true })

  for (const name of COLLECTIONS) {
    const docs = await mongoose.connection.db
      .collection(name)
      .find({})
      .toArray()
    const file = path.join(dir, `${name}.json`)
    fs.writeFileSync(file, JSON.stringify(docs, null, 2))
    console.log(`${name}: ${docs.length} documents`) // eslint-disable-line no-console
  }

  await mongoose.disconnect()
  process.exit(0)
}

run().catch(err => {
  console.error(err) // eslint-disable-line no-console
  process.exit(1)
})
