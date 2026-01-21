import { describe, it, expect } from 'vitest'
import CryptoJS from 'crypto-js'
import worker from '../src/index.js'

const TEST_SECRET = 'unit-test-secret-1234567890'

function makeRequest(url, bodyObj) {
  return new Request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Origin': 'http://localhost:3000' },
    body: JSON.stringify(bodyObj),
  })
}

describe('Worker decryption end-to-end', () => {
  it('returns ok with decrypted data', async () => {
    const sample = {
      title: 'Sample Course',
      cube_type: '3x3',
      difficulty: 'Beginner',
      steps: [
        { title: 'Step 1', description: 'Do this', algorithm: ['R', 'U', "R'", "U'"], target_state: 'scrambled' },
      ],
    }
    const encryptedData = CryptoJS.AES.encrypt(JSON.stringify(sample), TEST_SECRET).toString()

    const req = makeRequest('https://example.test/', { encryptedData })
    const env = { COURSE_SECRET_KEY: TEST_SECRET }

    const resp = await worker.fetch(req, env)
    expect(resp.status).toBe(200)
    const json = await resp.json()
    expect(json.ok).toBe(true)
    expect(json.data.title).toBe(sample.title)
    expect(json.data.cube_type).toBe(sample.cube_type)
    expect(Array.isArray(json.data.steps)).toBe(true)
  })

  it('rejects invalid payload', async () => {
    const req = makeRequest('https://example.test/', { encryptedData: 'invalid-b64' })
    const env = { COURSE_SECRET_KEY: TEST_SECRET }
    const resp = await worker.fetch(req, env)
    expect(resp.status).toBe(400)
  })
})
