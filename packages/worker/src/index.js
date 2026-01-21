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

function sanitizeUrl(url) {
  if (typeof url !== 'string') return url;
  const trimmed = url.trim();
  if (/^javascript:/i.test(trimmed)) return '';
  return trimmed;
}

function isAllowedDataMime(mime) {
  const allowed = [
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/gif',
    'video/mp4',
    'video/webm',
  ];
  return allowed.includes(mime.toLowerCase());
}

function isSafeSrc(src) {
  if (typeof src !== 'string') return false;
  if (/^https?:\/\//i.test(src)) return true;
  const m = src.match(/^data:([^;]+);base64,[a-z0-9+/=\s]+$/i);
  if (!m) return false;
  return isAllowedDataMime(m[1]);
}

function isAllowedModelUrl(src) {
  if (typeof src !== 'string') return false;
  if (!/^https?:\/\//i.test(src)) return false;
  return /\.(glb|gltf)(\?|#|$)/i.test(src);
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
      if (s.images) {
        if (!Array.isArray(s.images)) issues.push(`step ${i + 1} images must be an array`);
        if (Array.isArray(s.images)) {
          if (s.images.length > 30) issues.push(`step ${i + 1} images too many`);
          s.images.forEach((img, j) => {
            if (!img || typeof img !== 'object') issues.push(`step ${i + 1} image ${j + 1} invalid`);
            if (img && typeof img === 'object') {
              if (!img.src || typeof img.src !== 'string') issues.push(`step ${i + 1} image ${j + 1} src invalid`);
              if (img.src && !isSafeSrc(img.src)) issues.push(`step ${i + 1} image ${j + 1} src not allowed`);
              if (img.alt && typeof img.alt !== 'string') issues.push(`step ${i + 1} image ${j + 1} alt invalid`);
            }
          });
        }
      }
      if (s.videos) {
        if (!Array.isArray(s.videos)) issues.push(`step ${i + 1} videos must be an array`);
        if (Array.isArray(s.videos)) {
          if (s.videos.length > 20) issues.push(`step ${i + 1} videos too many`);
          s.videos.forEach((vid, j) => {
            if (!vid || typeof vid !== 'object') issues.push(`step ${i + 1} video ${j + 1} invalid`);
            if (vid && typeof vid === 'object') {
              if (!vid.src || typeof vid.src !== 'string') issues.push(`step ${i + 1} video ${j + 1} src invalid`);
              if (vid.src && !isSafeSrc(vid.src)) issues.push(`step ${i + 1} video ${j + 1} src not allowed`);
              if (vid.poster && typeof vid.poster !== 'string') issues.push(`step ${i + 1} video ${j + 1} poster invalid`);
              if (vid.poster && !isSafeSrc(vid.poster)) issues.push(`step ${i + 1} video ${j + 1} poster not allowed`);
              if (typeof vid.duration !== 'undefined') {
                if (typeof vid.duration !== 'number' || !Number.isFinite(vid.duration) || vid.duration < 0) {
                  issues.push(`step ${i + 1} video ${j + 1} duration invalid`);
                } else if (vid.duration > 20.0001) {
                  issues.push(`step ${i + 1} video ${j + 1} duration exceeds 20s`);
                }
              }
            }
          });
        }
      }
      if (s.annotations) {
        if (!Array.isArray(s.annotations)) issues.push(`step ${i + 1} annotations must be an array`);
        if (Array.isArray(s.annotations)) {
          if (s.annotations.length > 100) issues.push(`step ${i + 1} annotations too many`);
          s.annotations.forEach((ann, j) => {
            if (!ann || typeof ann !== 'object') issues.push(`step ${i + 1} annotation ${j + 1} invalid`);
            if (ann && typeof ann === 'object') {
              if (ann.type && typeof ann.type !== 'string') issues.push(`step ${i + 1} annotation ${j + 1} type invalid`);
              if (ann.text && typeof ann.text !== 'string') issues.push(`step ${i + 1} annotation ${j + 1} text invalid`);
            }
          });
        }
      }
      if (s.model_3d) {
        if (typeof s.model_3d !== 'object') issues.push(`step ${i + 1} model_3d invalid`);
        if (s.model_3d && typeof s.model_3d === 'object') {
          if (!s.model_3d.src || typeof s.model_3d.src !== 'string') issues.push(`step ${i + 1} model_3d src invalid`);
          if (s.model_3d.src && !isAllowedModelUrl(s.model_3d.src)) issues.push(`step ${i + 1} model_3d src not allowed`);
        }
      }
      if (s.scramble && typeof s.scramble !== 'string') issues.push(`step ${i + 1} scramble invalid`);
      if (s.theme && s.theme !== 'milky_white') issues.push(`step ${i + 1} theme unsupported`);
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
      if (typeof t.visual_aid === 'string' && !Array.isArray(t.images) && t.visual_aid) {
        const src = sanitizeUrl(t.visual_aid);
        t.images = [{ src, alt: '' }];
      }
      if (Array.isArray(t.images)) {
        t.images = t.images
          .filter((img) => img && typeof img === 'object')
          .map((img) => ({ src: sanitizeUrl(img.src), alt: sanitizeString(img.alt || '') }))
          .filter((img) => !!img.src);
      }
      if (Array.isArray(t.videos)) {
        t.videos = t.videos
          .filter((vid) => vid && typeof vid === 'object')
          .map((vid) => ({
            src: sanitizeUrl(vid.src),
            poster: sanitizeUrl(vid.poster || ''),
            duration: (typeof vid.duration === 'number' && Number.isFinite(vid.duration)) ? vid.duration : undefined,
          }))
          .filter((vid) => !!vid.src);
      }
      if (Array.isArray(t.annotations)) {
        t.annotations = t.annotations
          .filter((ann) => ann && typeof ann === 'object')
          .map((ann) => ({
            type: sanitizeString(ann.type || ''),
            text: sanitizeString(ann.text || ''),
            x: typeof ann.x === 'number' ? ann.x : undefined,
            y: typeof ann.y === 'number' ? ann.y : undefined,
          }));
      }
      if (t.model_3d && typeof t.model_3d === 'object') {
        const src = sanitizeUrl(t.model_3d.src);
        t.model_3d = src ? { src } : undefined;
      }
      if (typeof t.scramble === 'string') {
        t.scramble = sanitizeString(t.scramble);
      }
      if (!t.theme) {
        t.theme = 'milky_white';
      } else {
        t.theme = sanitizeString(t.theme);
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
