import fs from 'fs'
import { getSession } from './internals/call-api.js'
import { numContactPages } from './internals/call-api.js'
import fetch from 'node-fetch'
import mkdirp from 'mkdirp'

(async () => {
  for (let i=0; i < numContactPages; i++) {
    await downloadDocumentsForContactsPage(i)
  }
})()

async function downloadDocumentsForContactsPage(page) {
  console.log('downloading for contacts page ', page)
  const contacts = JSON.parse(fs.readFileSync(`./artifacts/contacts-${page * 20}-${page * 20 + 20}.json`, "utf-8"))
  for (let contact of contacts) {
    await downloadDocuments(contact)
  }
}

async function downloadDocuments(contact) {
  const session = await getSession()

  if (contact.links.documents.length > 0) {
    console.log(contact.name_value_list.name.value, ' - downloading documents')
  }

  for (let doc of contact.links.documents) {
    console.log(`--> ${doc.filename}`)
    const filepath = `./artifacts/files/${contact.id}/${doc.id}___${doc.filename}`

    if (fs.existsSync(filepath)) {
      continue;
    }

    const response = await fetch(`${process.env.SCRM_BASE_URL}/${doc.downloadUrl}`, {
      headers: {
        'Cookie': `sugar_user_theme=Suite7; PHPSESSID=${session}`
      }
    })

    if (!response.ok) {
      throw Error(`Could not fetch contact relationship json. Response status ${response.status} ${response.statusText}, content-type ${response.headers.get('content-type')}`)
    }

    mkdirp.sync(`./artifacts/files/${contact.id}/`)
    const dest = fs.createWriteStream(filepath)
    response.body.pipe(dest)
  }
}