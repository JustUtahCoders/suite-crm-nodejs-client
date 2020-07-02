import fs from 'fs'
import md5 from 'md5'
import dotenv from 'dotenv'
import path from 'path'
import fetch from 'node-fetch'
import btoa from 'btoa'

dotenv.config()

let session

export const numContactPages = 54

try {
  session = fs.readFileSync(path.resolve("./artifacts/session.txt"), "utf-8")
} catch {
  // ignore
}

// https://docs.suitecrm.com/developer/api/api-4_1/

export async function callSuiteCrmApi(method, data = {}, omitSession = false) {
  if (!omitSession) {
    await getSession()
  }

  // session MUST be the first property serialized in the json
  const restData = Object.assign({
    session,
  }, data)

  const body = `
-----------------------------4362456108880421411137113181
Content-Disposition: form-data; name="method"

${method}
-----------------------------4362456108880421411137113181
Content-Disposition: form-data; name="input_type"

JSON
-----------------------------4362456108880421411137113181
Content-Disposition: form-data; name="response_type"

JSON
-----------------------------4362456108880421411137113181
Content-Disposition: form-data; name="rest_data"

${JSON.stringify(restData)}
-----------------------------4362456108880421411137113181--

`.trimLeft()

  const response = await fetch(`${process.env.SCRM_BASE_URL}/service/v4_1/rest.php`, {
    method: 'POST',
    body,
    headers: {
      'Content-Type': 'multipart/form-data; boundary=---------------------------4362456108880421411137113181'
    }
  })

  if (!response.ok || !response.headers.get('content-type').startsWith('application/json')) {
    throw Error(`Invalid response calling ${method}. API returned status ${response.status} ${response.statusText} with content type ${response.headers.get('content-type')}`)
  }

  return await response.json()
}

export async function getSession() {
  if (!session) {
    const json = await callSuiteCrmApi('login', {
      auth_data: {
        user_name: process.env.SCRM_USERNAME,
        password: md5(process.env.SCRM_PASSWORD)
      }
    }, true)

    session = json.id

    fs.writeFileSync(path.resolve("./artifacts/session.txt"), session, "utf-8")
  }

  return session
}

export async function callCUDatabaseApi(url, opts = {}) {
  if (!process.env.CU_DATABASE_USERNAME || !process.env.CU_DATABASE_PASSWORD || !process.env.CU_DATABASE_URL) {
    throw Error(`CU_DATABASE_USERNAME, CU_DATABASE_PASSWORD, and CU_DATABASE_URL env vars are required`)
  }

  opts.headers = opts.headers || {}

  if (typeof opts.body === 'object') {
    opts.body = JSON.stringify(opts.body)
    opts.headers['Content-Type'] = 'application/json'
  }

  const authToken = btoa(process.env.CU_DATABASE_USERNAME + ":" + process.env.CU_DATABASE_PASSWORD)

  opts.headers.Authorization = `Basic ${authToken}`

  const response = await fetch(`${process.env.CU_DATABASE_URL}${url}`, opts)

  let body

  try {
    body = await response.json()
  } catch {
    try {
      body = await response.text()
    } catch {
    }
  }

  if (!response.ok) {
    console.log(body)
    throw Error('CU Database responded with HTTP status ' + response.status)
  }

  return body
}