export const PORTAL_URL = 'https://www.portail-servicesgarde.gouv.qc.ca/parent/s/demandes-admission';
export const PORTAL_ORIGIN = new URL(PORTAL_URL).origin;

export function registrationKey(url, fallback = '') {
  const parsed = new URL(url, PORTAL_URL);
  const record = parsed.searchParams.get('demandeAdmissionId') || parsed.searchParams.get('recordId') || (/indicateur-de-rang/.test(parsed.pathname) ? parsed.searchParams.get('id') : null);
  return record ? `admission:${record}` : fallback;
}

export function normalize(value = '') {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[’‘]/g, "'").replace(/[\u00a0\u202f]/g, ' ').toLowerCase();
}

const number = '(\\d+(?:[ \\u00a0\\u202f]\\d{3})*)';
const integer = value => Number(value.replace(/\s/g, ''));

// Only parse a whole value. Dates, ages and category numbers must never become a count.
export function parseQuantity(value) {
  let text = normalize(value).trim().replace(/[.!;:]$/, '').replace(/\s+enfants?$/, '').trim();
  let m = text.match(new RegExp(`^(?:entre\\s+)?${number}\\s*(?:[-–—]|a|et)\\s*${number}$`));
  if (m) {
    const min = integer(m[1]), max = integer(m[2]);
    return min <= max ? { min, max, kind: min === max ? 'exact' : 'range', label: min === max ? `${min}` : `${min}–${max}` } : null;
  }
  m = text.match(new RegExp(`^(?:plus de|plus que)\\s+${number}$`));
  if (m) return { min: integer(m[1]) + 1, max: null, kind: 'lower-bound', label: `${integer(m[1]) + 1}+` };
  m = text.match(new RegExp(`^${number}\\s*(?:\\+|et plus|ou plus)$`));
  if (m) return { min: integer(m[1]), max: null, kind: 'lower-bound', label: `${integer(m[1])}+` };
  m = text.match(new RegExp(`^(?:moins de)\\s+${number}$`));
  if (m && integer(m[1]) > 0) return { min: 0, max: integer(m[1]) - 1, kind: 'range', label: `0–${integer(m[1]) - 1}` };
  m = text.match(new RegExp(`^${number}$`));
  if (m) return { min: integer(m[1]), max: integer(m[1]), kind: 'exact', label: String(integer(m[1])) };
  if (/^(aucun|aucun enfant|zero)$/.test(text)) return { min: 0, max: 0, kind: 'exact', label: '0' };
  return null;
}

export function extractIndicator(rawText) {
  const text = normalize(rawText);
  const quantities = `(?:entre\\s+)?${number}(?:\\s*(?:[-–—]|a|et)\\s*${number}|\\s*(?:\\+|et plus|ou plus))?`;
  const patterns = [
    new RegExp(`((?:(?:plus|moins) de\\s+)?${quantities})\\s+enfants?(?:\\(s\\))?\\s+(?:de la meme tranche d'age\\s+)?(?:se trouvent?|sont)\\s+(?:avant|devant)`, 'g'),
    new RegExp(`((?:(?:plus|moins) de\\s+)?${quantities})\\s+enfants?\\s+(?:(?:se trouvent?|sont|est|places?|situes?)\\s+)?(?:avant|devant|precedent)\\s+(?:le|la|votre|ton|mon|vous|l[' ])`, 'g'),
    new RegExp(`(?:nombre d'enfants?\\s+(?:places?\\s+)?(?:avant|devant)[^\\n:]{0,65}|enfants?\\s+(?:avant|devant)[^\\n:]{0,50})\\s*[:：]?\\s*\\n?\\s*((?:(?:plus|moins) de\\s+)?${quantities})(?=\\s*(?:enfants?|[.\\n]|$))`, 'g'),
  ];
  const candidates = [];
  for (const pattern of patterns) for (const match of text.matchAll(pattern)) {
    const result = parseQuantity(match[1]);
    if (result) candidates.push({ ...result, evidence: rawText.slice(match.index, match.index + match[0].length).trim() });
  }
  const unique = [...new Map(candidates.map(item => [`${item.min}:${item.max}`, item])).values()];
  // Ambiguous pages are left unread rather than silently selecting another age group's count.
  if (unique.length === 1) return unique[0];
  return null;
}

export function extractLabels(text, fallback = {}) {
  const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
  function after(pattern) {
    for (let i = 0; i < lines.length; i++) {
      if (pattern.test(normalize(lines[i]))) {
        const inline = lines[i].split(/\s*:\s*/).slice(1).join(': ').trim();
        return inline || lines[i + 1] || '';
      }
    }
    return '';
  }
  return {
    daycare: after(/^(?:nom du )?service de garde(?:\s*:.*)?$/) || fallback.daycare || '',
    child: after(/^(?:nom (?:de l'|du ))?enfant(?:\s*:.*)?$/) || fallback.child || '',
    ageGroup: after(/^(?:tranche|groupe) d'age(?:\s*:.*)?$/) || text.match(/Tranche d[’']âge[^\n:]*:\s*([^\n]+)/i)?.[1]?.trim() || '',
  };
}

export function extractProjection(text) {
  return text.match(/Projection pour le\s+(\d{1,2}\s+[^\s]+\s+\d{4})/i)?.[1] || '';
}
