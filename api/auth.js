// POST /api/auth  { action: 'register' | 'login' | 'logout' | 'me', username, password }
const { crypto, redis, hashPassword, tokenFrom, currentUser, handler, HttpError } = require('./_lib');

const USERNAME = /^[a-zA-Z0-9_-]{3,16}$/;
const SESSION_TTL = 60 * 60 * 24 * 30; // 30 jours
const MAX_TRIES = 10;                  // essais de connexion par pseudo...
const TRIES_WINDOW = 15 * 60;          // ...toutes les 15 minutes

async function openSession(username) {
  const token = crypto.randomBytes(32).toString('hex');
  await redis('SET', `sess:${token}`, username, 'EX', SESSION_TTL);
  return { token, username };
}

module.exports = handler(async (req, res) => {
  if (req.method !== 'POST') throw new HttpError(405, 'Méthode non autorisée.');
  const { action, username = '', password = '' } = req.body || {};

  if (action === 'me') {
    const user = await currentUser(req);
    if (!user) throw new HttpError(401, 'Session expirée, reconnecte-toi.');
    return res.json({ username: user });
  }
  if (action === 'logout') {
    const t = tokenFrom(req);
    if (t) await redis('DEL', `sess:${t}`);
    return res.json({ ok: true });
  }

  const name = String(username).trim();
  const key = name.toLowerCase();
  if (!USERNAME.test(name)) throw new HttpError(400, 'Pseudo : 3 à 16 caractères (lettres, chiffres, - ou _).');
  if (typeof password !== 'string' || password.length < 6 || password.length > 100) {
    throw new HttpError(400, 'Mot de passe : 6 caractères minimum.');
  }

  if (action === 'register') {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = await hashPassword(password, salt);
    const ok = await redis('SET', `user:${key}`, JSON.stringify({ name, salt, hash, created: Date.now() }), 'NX');
    if (ok !== 'OK') throw new HttpError(409, 'Ce pseudo est déjà pris.');
    return res.json(await openSession(name));
  }

  if (action === 'login') {
    const tries = await redis('INCR', `tries:${key}`);
    if (tries === 1) await redis('EXPIRE', `tries:${key}`, TRIES_WINDOW);
    if (tries > MAX_TRIES) throw new HttpError(429, 'Trop d\'essais. Réessaie dans 15 minutes.');
    const raw = await redis('GET', `user:${key}`);
    const user = raw ? JSON.parse(raw) : null;
    // On calcule le hash même si le pseudo n'existe pas, pour ne pas révéler les pseudos par le temps de réponse
    const hash = await hashPassword(password, user ? user.salt : '0'.repeat(32));
    const good = user && crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(user.hash, 'hex'));
    if (!good) throw new HttpError(401, 'Pseudo ou mot de passe incorrect.');
    await redis('DEL', `tries:${key}`);
    return res.json(await openSession(user.name));
  }

  throw new HttpError(400, 'Action inconnue.');
});
