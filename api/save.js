// GET /api/save : lit la partie du joueur connecté · POST /api/save { save } : l'enregistre
const { redis, currentUser, handler, HttpError } = require('./_lib');

const MAX_SIZE = 200 * 1024;

module.exports = handler(async (req, res) => {
  const user = await currentUser(req);
  if (!user) throw new HttpError(401, 'Session expirée, reconnecte-toi.');
  const key = `save:${user.toLowerCase()}`;

  if (req.method === 'GET') {
    const raw = await redis('GET', key);
    return res.json({ save: raw ? JSON.parse(raw) : null });
  }
  if (req.method === 'POST') {
    const save = req.body && req.body.save;
    const str = JSON.stringify(save);
    if (!save || typeof save !== 'object' || !Array.isArray(save.team)) throw new HttpError(400, 'Sauvegarde invalide.');
    if (str.length > MAX_SIZE) throw new HttpError(413, 'Sauvegarde trop grosse.');
    await redis('SET', key, str);
    return res.json({ ok: true });
  }
  throw new HttpError(405, 'Méthode non autorisée.');
});
