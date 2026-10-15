const wrap = require('../utils/wrap');
const auth = require('../services/auth.service');
const { makeToken } = require('../middleware/access');
module.exports = { login: wrap(async (req, res) => { const user = await auth.login(req.body); res.json({ user, token: makeToken(user) }); }) };
