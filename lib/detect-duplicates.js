import fs from 'fs'
import { numContactPages, callCUDatabaseApi } from './internals/call-api.js'

(async () => {
  let numDuplicates = 0, numNew = 0, duplicates = []
  for (let page = 0; page < numContactPages; page++) {
    console.log(`Page ${page}`)
    const contacts = JSON.parse(fs.readFileSync(`./artifacts/contacts-${page * 20}-${page * 20 + 20}.json`, "utf-8"))
    for (let contact of contacts) {
      const cuDatabaseDuplicates = await detectDuplicate(contact)
      if (cuDatabaseDuplicates.length > 0) {
        numDuplicates++
        duplicates.push({
          name: contact.name_value_list.name.value.trim(),
          cuDatabaseDuplicates
        })
      } else {
        numNew++
      }
    }
  }

  console.log('duplicates:', numDuplicates)
  console.log('new:', numNew)
  fs.writeFileSync('./artifacts/duplicates.json', JSON.stringify(duplicates, null, 2), 'utf-8')
})()

async function detectDuplicate(contact) {
  let name = contact.name_value_list.name.value.trim()
  let [firstName, ...otherNames] = name.split(/\s/)
  firstName = firstName.trim()

  if (otherNames.length === 0) {
    otherNames.push("(Unknown)")
  }

  let duplicates = []

  for (let lastName of otherNames) {
    if (!lastName || lastName.trim() === '') {
      lastName = '(Unknown)'
    }
    const url = `/api/client-duplicates?firstName=${encodeURIComponent(firstName)}&lastName=${encodeURIComponent(lastName)}`
    const duplicatesResult = await callCUDatabaseApi(url)
    duplicates.push(...duplicatesResult.clientDuplicates.filter(dup => dup.firstName === firstName && dup.lastName === lastName))
  }

  console.log(name, duplicates.length > 0)
  return duplicates
}