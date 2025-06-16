import Hyperschema from 'hyperschema'
import Builder from 'hyperdb/builder'

const SCHEMA_DIR = './spec/schema'
const DB_DIR = './spec/db'

const schema = Hyperschema.from(SCHEMA_DIR, { versioned: false })
const doctorSchema = schema.namespace('doctor')

doctorSchema.register({
  name: 'checklist',
  fields: [
    {
      name: 'key',
      type: 'string',
      required: true
    },
    {
      name: 'value',
      type: 'string',
      required: true
    }
  ]
})

Hyperschema.toDisk(schema)

const db = Builder.from(SCHEMA_DIR, DB_DIR)
const doctorDB = db.namespace('doctor')

doctorDB.collections.register({
  name: 'checklist',
  schema: '@doctor/checklist',
  key: ['key']
})

Builder.toDisk(db)
