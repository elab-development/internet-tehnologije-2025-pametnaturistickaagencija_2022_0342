const jwt = require('jsonwebtoken')

function auth(req, res, next) {
  try {
    const header = req.headers.authorization
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Niste autentifikovani (nema tokena).' })
    }

    const token = header.substring('Bearer '.length)
    const payload = jwt.verify(token, process.env.JWT_SECRET)

    req.user = payload

    return next()
  } catch (e) {
    return res.status(401).json({ message: 'Nevalidan ili istekao token.' })
  }
}

module.exports = auth
