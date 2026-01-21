import CryptoJS from 'crypto-js';

const ALLOWED_ORIGINS = [
  // Replace with your production origins
  'https://ac5cb599.toaster-builder.pages.dev',
  'https://builder.toaster.cloustan.org',
  'http://localhost:5173',
  'http://localhost:3000',
];

function isAllowedOrigin(origin) {
  if (!origin) return false;
  return ALLOWED_ORIGINS.includes(origin);
}

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin || 'null',
    'Vary': 'Origin',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

function json(obj, status, origin) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...corsHeaders(origin), 'content-type': 'application/json' },
  });
}

function sanitizeString(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/<script/gi, '&lt;script').replace(/on[a-z]+=/gi, 'x-attr=');
}

function validateCourseSchema(data) {
  const issues = [];
  if (!data || typeof data !== 'object') issues.push('Payload must be an object');
  if (!data.title || typeof data.title !== 'string') issues.push('Missing title');
  const cubeTypes = ['3x3', '2x2', '4x4'];
  if (!cubeTypes.includes(data.cube_type)) issues.push('Invalid cube_type');
  const diffs = ['Beginner', 'Intermediate', 'Advanced'];
  if (!diffs.includes(data.difficulty)) issues.push('Invalid difficulty');
  if (!Array.isArray(data.steps)) issues.push('steps must be an array');
  if (Array.isArray(data.steps)) {
    data.steps.forEach((s, i) => {
      if (!s || typeof s !== 'object') issues.push(`step ${i + 1} invalid`);
      if (s.title && typeof s.title !== 'string') issues.push(`step ${i + 1} title invalid`);
      if (s.description && typeof s.description !== 'string') issues.push(`step ${i + 1} description invalid`);
      if (s.algorithm && !Array.isArray(s.algorithm)) issues.push(`step ${i + 1} algorithm invalid`);
      if (s.visual_aid && typeof s.visual_aid !== 'string') issues.push(`step ${i + 1} visual_aid invalid`);
    });
  }
  return { ok: issues.length === 0, issues };
}

function scrubData(data) {
  const out = { ...data };
  out.title = sanitizeString(out.title);
  out.difficulty = sanitizeString(out.difficulty);
  out.cube_type = sanitizeString(out.cube_type);
  if (Array.isArray(out.steps)) {
    out.steps = out.steps.map((s) => {
      const t = { ...s };
      t.title = sanitizeString(t.title);
      t.description = sanitizeString(t.description);
      if (Array.isArray(t.algorithm)) {
        t.algorithm = t.algorithm.map((m) => sanitizeString(String(m)).toUpperCase());
      }
      return t;
    });
  }
  return out;
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const allowOrigin = isAllowedOrigin(origin) ? origin : '';

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders(allowOrigin) });
    }

    if (request.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405, allowOrigin);
    }

    try {
      const ctype = request.headers.get('content-type') || '';
      if (!ctype.includes('application/json')) {
        return json({ error: 'Content-Type must be application/json' }, 415, allowOrigin);
      }

      const len = parseInt(request.headers.get('content-length') || '0', 10);
      if (len && len > 5_000_000) {
        return json({ error: 'Payload too large' }, 413, allowOrigin);
      }

      const body = await request.json();
      const encryptedData = body.encryptedData || body.ciphertext || body.ct;
      if (!encryptedData || typeof encryptedData !== 'string') {
        return json({ error: 'Missing encryptedData' }, 400, allowOrigin);
      }

      const passphrase = env.COURSE_SECRET_KEY;
      if (!passphrase) return json({ error: 'Server not configured' }, 500, allowOrigin);

      // Decrypt using CryptoJS (passphrase-based, OpenSSL format compatible)
      let plaintext;
      try {
        const bytes = CryptoJS.AES.decrypt(encryptedData, passphrase);
        plaintext = bytes.toString(CryptoJS.enc.Utf8);
      } catch (e) {
        return json({ error: 'Decryption error' }, 400, allowOrigin);
      }

      if (!plaintext) return json({ error: 'Decryption failed' }, 400, allowOrigin);

      let data;
      try {
        data = JSON.parse(plaintext);
      } catch {
        return json({ error: 'Decrypted data is not valid JSON' }, 400, allowOrigin);
      }

      const scrubbed = scrubData(data);
      const validation = validateCourseSchema(scrubbed);
      if (!validation.ok) {
        return json({ error: 'Schema validation failed', issues: validation.issues }, 422, allowOrigin);
      }

      return new Response(JSON.stringify({ ok: true, data: scrubbed }), {
        status: 200,
        headers: { ...corsHeaders(allowOrigin), 'content-type': 'application/json' },
      });
    } catch (err) {
      return json({ error: 'Bad request' }, 400, allowOrigin);
    }
  },
};
