const asyncHandler = require('../utils/async-handler');
const sessionService = require('../services/session.service');
const { createToken } = require('../middleware/authentication');

module.exports = {
  create: asyncHandler(async (req, res) => {
    const user = await sessionService.verifyCredentials(req.body);
    res.json({ user, token: createToken(user) });
  })
};
