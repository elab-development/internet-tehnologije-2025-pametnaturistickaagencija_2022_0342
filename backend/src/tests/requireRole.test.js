const requireRole = require('../middleware/requireRole')

function makeRes() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  }
}

describe('requireRole middleware', () => {
  test('vraca 401 ako req.user.role ne postoji', () => {
    const req = { user: null }
    const res = makeRes()
    const next = jest.fn()

    requireRole('ADMIN')(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalled()
    expect(next).not.toHaveBeenCalled()
  })

  test('vraca 403 ako korisnik nema trazenu ulogu', () => {
    const req = { user: { role: 'USER' } }
    const res = makeRes()
    const next = jest.fn()

    requireRole('ADMIN')(req, res, next)

    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalled()
    expect(next).not.toHaveBeenCalled()
  })

  test('poziva next ako korisnik ima trazenu ulogu', () => {
    const req = { user: { role: 'ADMIN' } }
    const res = makeRes()
    const next = jest.fn()

    requireRole('ADMIN')(req, res, next)

    expect(next).toHaveBeenCalled()
    expect(res.status).not.toHaveBeenCalled()
  })
})