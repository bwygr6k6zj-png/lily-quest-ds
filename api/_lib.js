// Outils partagés par les fonctions serveur (le « _ » empêche Vercel d'en faire une route).
const crypto = require('crypto');

// Base Redis (Upstash, ajoutée depuis l'onglet Storage de Vercel)
const DB_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const DB_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

async function redis(...cmd) {
  if (!DB_URL || !DB_TOKEN) throw new HttpError(503, 'Les comptes ne sont pas encore activés sur le serveur.');
  const r = await fetch(DB_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${DB_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmd),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || d.error) throw new Error(d.error || `Redis HTTP ${r.status}`);
  return d.result;
}

const hashPassword = (password, salt) => new Promise((resolve, reject) => {
  crypto.scrypt(password, salt, 64, (err, key) => (err ? reject(err) : resolve(key.toString('hex'))));
});

function tokenFrom(req) {
  const h = req.headers.authorization || '';
  const t = h.startsWith('Bearer ') ? h.slice(7) : '';
  return /^[a-f0-9]{64}$/.test(t) ? t : null;
}

// Renvoie le pseudo connecté, ou null
async function currentUser(req) {
  const t = tokenFrom(req);
  return t ? redis('GET', `sess:${t}`) : null;
}

function handler(fn) {
  return async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    try {
      await fn(req, res);
    } catch (e) {
      if (!(e instanceof HttpError)) console.error(e);
      res.status(e.status || 500).json({ error: e instanceof HttpError ? e.message : 'Erreur du serveur, réessaie plus tard.' });
    }
  };
}

module.exports = { crypto, redis, hashPassword, tokenFrom, currentUser, handler, HttpError };
