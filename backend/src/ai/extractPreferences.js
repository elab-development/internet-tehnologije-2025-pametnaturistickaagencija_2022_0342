function extractPreferences(text) {
  const t = (text || '').toLowerCase()
  const prefs = {}

  const daysMatch = t.match(/(\d+)\s*(dan|dana|days)/)
  if (daysMatch) prefs.days = Number(daysMatch[1])

  const budgetMatch = t.match(/(\d+)\s*(€|eur|eura)/)
  if (budgetMatch) prefs.budget_eur = Number(budgetMatch[1])

  const peopleMatch = t.match(/(\d+)\s*(osobe|osoba|people|person)/)
  if (peopleMatch) prefs.people = Number(peopleMatch[1])
  if (t.includes('nas dvoje') || t.includes('dvoje')) prefs.people = prefs.people || 2

  const destMatch = t.match(/\bu\s+([a-zčćđšž]+)\b/i)
  if (destMatch) prefs.destination = destMatch[1][0].toUpperCase() + destMatch[1].slice(1)

  const dateRange = t.match(/od\s*(\d{1,2})[./-](\d{1,2})\s*(do|-)\s*(\d{1,2})[./-](\d{1,2})/)
  if (dateRange) {
    const y = new Date().getFullYear()
    const d1 = String(dateRange[1]).padStart(2, '0')
    const m1 = String(dateRange[2]).padStart(2, '0')
    const d2 = String(dateRange[4]).padStart(2, '0')
    const m2 = String(dateRange[5]).padStart(2, '0')
    prefs.from = `${y}-${m1}-${d1}`
    prefs.to = `${y}-${m2}-${d2}`
  }

  if (t.includes('lagan') || t.includes('sporo')) prefs.pace = 'lagano'
  if (t.includes('srednji')) prefs.pace = 'srednje'
  if (t.includes('naporno') || t.includes('brzo')) prefs.pace = 'naporno'

  const interests = []
  if (t.includes('muzej') || t.includes('museum')) interests.push('muzeji')
  if (t.includes('hrana') || t.includes('food') || t.includes('tapas')) interests.push('hrana')
  if (t.includes('plaž')) interests.push('plaže')
  if (t.includes('noć') || t.includes('night')) interests.push('noćni život')
  if (t.includes('arhitekt')) interests.push('arhitektura')
  if (interests.length) prefs.interests = interests

  if (t.includes('city break')) prefs.type = 'city break'
  if (t.includes('spa')) prefs.type = 'spa'
  if (t.includes('planin')) prefs.type = 'planina'

  const diet = []
  if (t.includes('vegetarian')) diet.push('vegetarian')
  if (t.includes('vegan')) diet.push('vegan')
  if (t.includes('bez glutena')) diet.push('gluten-free')
  if (diet.length) prefs.diet = diet

  const avoid = []
  if (t.includes('bez gužve')) avoid.push('gužve')
  if (t.includes('bez muzeja')) avoid.push('muzeji')
  if (avoid.length) prefs.avoid = avoid

  if (t.includes('wheelchair') || t.includes('kolica')) prefs.accessibility = ['wheelchair']

  console.log(prefs)

  return prefs
}

module.exports = { extractPreferences }
