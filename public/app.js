// Translate messages kept by an existing server session or earlier saved readings.
const legacyMessages = [
  [
    "No consultation links were found. If the portal uses row menus, open a registration and its Indicateur de rang, then use Read open indicator.",
    "Aucun lien de consultation n’a été trouvé. Ouvrez une demande et son indicateur de rang, puis utilisez « Lire l’indicateur ouvert »."
  ],
  [
    "The indicator was not readable, or it contains multiple counts. Open the rank page and use Read open indicator to choose the correct value.",
    "L’indicateur est illisible ou contient plusieurs valeurs. Ouvrez sa page, puis utilisez « Lire l’indicateur ouvert » pour choisir la bonne valeur."
  ],
  [
    "Sign in in the portal browser, open Mes demandes d’admission, then click Refresh from portal here.",
    "Connectez-vous dans le navigateur du portail, ouvrez « Mes demandes d’admission », puis cliquez sur « Actualiser » ici."
  ],
  [
    "Stopped after three unreadable registrations. Check the open indicator before trying again.",
    "Arrêt après trois demandes illisibles. Vérifiez l’indicateur ouvert avant de réessayer."
  ],
  [
    "Your portal session needs a sign-in. Finish signing in in the browser, then refresh again.",
    "Votre session a expiré. Connectez-vous dans le navigateur du portail, puis actualisez de nouveau."
  ],
  [
    "Sign in and open a registration’s Indicateur de rang page in the connected browser first.",
    "Connectez-vous et ouvrez d’abord l’indicateur de rang d’une demande dans le navigateur du portail."
  ],
  [
    "This snapshot contains a single reading. Other registrations were not refreshed.",
    "Ce relevé contient une seule demande. Les autres demandes n’ont pas été actualisées."
  ],
  [
    "Finish signing in in the portal browser, then click Refresh from portal.",
    "Terminez votre connexion dans le navigateur du portail, puis cliquez sur « Actualiser »."
  ],
  [
    "Pagination repeated a page. Remaining registrations were not collected.",
    "Une page a été répétée. Les demandes restantes n’ont pas été relevées."
  ],
  [
    "Duplicate registration detected. History has not been changed.",
    "Une demande en double a été détectée. L’historique n’a pas été modifié."
  ],
  [
    "The registration list changed while collecting. Refresh again.",
    "La liste des demandes a changé pendant la collecte. Veuillez actualiser de nouveau."
  ],
  [
    "No registrations were read. Existing history has been kept.",
    "Aucune demande n’a pu être relevée. L’historique existant a été conservé."
  ],
  [
    "Stopped after 50 list pages. More registrations may remain.",
    "Arrêt après 50 pages. Certaines demandes n’ont peut-être pas été relevées."
  ],
  [
    "Invalid waiting-list count. History has not been changed.",
    "Le nombre d’enfants est invalide. L’historique n’a pas été modifié."
  ],
  [
    "Browser closed. Your saved history is still available.",
    "Le navigateur est fermé. Votre historique enregistré reste accessible."
  ],
  [
    "Use a count or range, for example 42, 11–50, or 201+.",
    "Saisissez un nombre ou un intervalle, par exemple 42, 11–50 ou 201+."
  ],
  [
    "Portal connected. Refresh to read your registrations.",
    "Connexion au portail établie. Cliquez sur « Actualiser » pour relever vos demandes."
  ],
  [
    "Connect to the portal to collect your first reading.",
    "Connectez-vous au portail pour effectuer votre premier relevé."
  ],
  [
    "The next page had no readable consultation controls.",
    "La page suivante ne contient aucune commande de consultation lisible."
  ],
  [
    "The row menu did not contain a consultation action.",
    "Le menu de la demande ne contient aucune action de consultation."
  ],
  [
    "The reading must come from the childcare portal.",
    "Le relevé doit provenir du portail des services de garde."
  ],
  [
    "A collection or connection is already running.",
    "Une collecte ou une connexion est déjà en cours."
  ],
  [
    "Open the local dashboard to use this action.",
    "Ouvrez le tableau de bord local pour utiliser cette action."
  ],
  [
    "Wait for the current collection to finish.",
    "Veuillez attendre la fin de la collecte en cours."
  ],
  [
    "Enter the service de garde name.",
    "Saisissez le nom du service de garde."
  ],
  [
    "A collection is already running.",
    "Une collecte est déjà en cours."
  ],
  [
    "Wait for collection to finish.",
    "Veuillez attendre la fin de la collecte."
  ],
  [
    "The browser is already busy.",
    "Le navigateur est déjà occupé."
  ],
  [
    "Opening your portal browser…",
    "Ouverture du navigateur du portail…"
  ],
  [
    "Sign in to the portal first.",
    "Connectez-vous d’abord au portail."
  ],
  [
    "Finding your registrations…",
    "Recherche de vos demandes…"
  ],
  [
    "No indicators were read.",
    "Aucun indicateur n’a pu être relevé."
  ],
  [
    "Request is too large.",
    "La demande est trop volumineuse."
  ],
  [
    "Method not allowed.",
    "Méthode non autorisée."
  ],
  [
    "Garderie dashboard:",
    "Tableau de bord des services de garde :"
  ],
  [
    "Local access only.",
    "Accès local uniquement."
  ],
  [
    "Unknown action.",
    "Action inconnue."
  ],
  [
    "Expected JSON.",
    "Des données au format JSON sont requises."
  ],
  [
    "Not found.",
    "Ressource introuvable."
  ]
];

function frenchMessage(value = '') {
  let text = String(value);
  for (const [source, translation] of legacyMessages) text = text.split(source).join(translation);
  text = text.replace(/\bSaved (\d+) registrations?/g, (_, count) => count + ' demande' + (Number(count) > 1 ? 's' : '') + ' enregistrée' + (Number(count) > 1 ? 's' : ''));
  text = text.replace(/; (\d+) item\(s\) need attention/g, (_, count) => '; ' + count + ' élément' + (Number(count) > 1 ? 's' : '') + ' à vérifier');
  text = text.replace(/^Reading (.+) \(list page (\d+)\)…$/, (_, name, page) => 'Lecture de ' + name + ' (page ' + page + ')…');
  text = text.replace(/Registration (\d+)/g, 'Demande $1');
  if (/^(?:Could not open the portal browser|browserType\.|browserContext\.)/.test(text)) return 'Impossible d’ouvrir le navigateur du portail. Vérifiez que Microsoft Edge est installé, puis réessayez.';
  if (/Timeout|has been closed|net::ERR_|page\.[a-zA-Z]+:/.test(text)) return 'La lecture du portail a échoué. Vérifiez la connexion et la page ouverte, puis réessayez.';
  if (/Failed to fetch|fetch failed|NetworkError|Unexpected token|Unexpected end/.test(text)) return 'Impossible de communiquer avec le serveur local. Vérifiez que l’application est démarrée, puis réessayez.';
  if (/^(?:ENOENT|EACCES|EPERM|EBUSY|ENOSPC):/.test(text)) return 'Impossible de lire ou d’enregistrer les fichiers locaux. Vérifiez leur accès et l’espace disponible.';
  return text;
}


const $ = selector => document.querySelector(selector);
const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
let history = { snapshots: [] }, registrations = [], selected = '', lastSignature = '', openReading = null;
const date = value => new Intl.DateTimeFormat('fr-CA', { month: 'short', day: 'numeric', timeZone: 'America/Toronto' }).format(new Date(value));
const fullDate = value => new Intl.DateTimeFormat('fr-CA', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Toronto' }).format(new Date(value));
const number = value => new Intl.NumberFormat('fr-CA').format(value);
const range = ahead => ahead.max === null ? `${number(ahead.min)}+` : ahead.min === ahead.max ? number(ahead.min) : `${number(ahead.min)}–${number(ahead.max)}`;

async function api(path, data) {
  const response = await fetch(`/api/${path}`, data === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  const result = await response.json();
  if (!response.ok) throw new Error(frenchMessage(result.error || 'La demande a échoué.'));
  return result;
}
function notify(message) { $('#notice').textContent = frenchMessage(message || ''); $('#notice').classList.toggle('hidden', !message); }
function change(readings) {
  if (readings.length < 2) return { label: 'Premier relevé', kind: '' };
  if (readings.at(-1).projection !== readings.at(-2).projection || readings.at(-1).ageGroup !== readings.at(-2).ageGroup) return { label: 'Projection modifiée', kind: '' };
  const a = readings.at(-1).ahead, b = readings.at(-2).ahead;
  if (a.min === b.min && a.max === b.max) return { label: 'Aucun changement', kind: '' };
  if (a.kind === 'exact' && b.kind === 'exact') return { label: `${a.min < b.min ? '↓' : '↑'} ${number(Math.abs(a.min - b.min))} enfant${Math.abs(a.min - b.min) > 1 ? 's' : ''}`, kind: a.min < b.min ? 'improved' : 'worsened' };
  if (a.max !== null && b.max !== null && a.min <= b.min && a.max <= b.max) return { label: '↓ Intervalle inférieur', kind: 'improved' };
  if (a.min >= b.min && (a.max ?? Infinity) >= (b.max ?? Infinity)) return { label: '↑ Intervalle supérieur', kind: 'worsened' };
  return { label: 'Intervalle modifié', kind: '' };
}
async function loadHistory() {
  history = await api('history');
  const byId = new Map();
  for (const snapshot of history.snapshots) for (const reading of snapshot.readings) {
    if (!byId.has(reading.id)) byId.set(reading.id, []);
    byId.get(reading.id).push({ ...reading, collectedAt: snapshot.capturedAt });
  }
  registrations = [...byId].map(([id, readings]) => ({ id, readings, latest: readings.at(-1), delta: change(readings) }));
  registrations.sort((a,b) => a.latest.ahead.min - b.latest.ahead.min);
  const latest = history.snapshots.at(-1);
  $('#stat-count').textContent = number(registrations.length);
  $('#registration-count').textContent = number(registrations.length);
  $('#stat-count-note').textContent = `${number(new Set(registrations.map(row => row.latest.daycare)).size)} services de garde dans l’historique`;
  $('#stat-best').textContent = registrations.length ? range(registrations[0].latest.ahead) : '—';
  $('#stat-best-note').textContent = registrations[0]?.latest.daycare || 'Votre liste la mieux placée';
  const comparable = registrations.filter(row => row.readings.length > 1);
  $('#stat-improved').textContent = comparable.length ? number(comparable.filter(row => row.delta.kind === 'improved').length) : '—';
  $('#stat-improved-note').textContent = comparable.length ? `Sur ${comparable.length} listes ayant un relevé précédent` : 'Disponible après un deuxième relevé';
  $('#stat-last').textContent = latest ? date(latest.capturedAt) : 'Aucun relevé';
  $('#stat-last-note').textContent = latest ? `${latest.readings.length} demande${latest.readings.length > 1 ? 's' : ''} au dernier relevé` : 'À votre prochaine actualisation';
  $('#export-button').disabled = !registrations.length;
  const select = $('#chart-registration');
  select.innerHTML = registrations.length ? registrations.map(row => `<option value="${escape(row.id)}">${escape(row.latest.daycare)}${row.latest.child ? ` · ${escape(row.latest.child)}` : ''}</option>`).join('') : '<option value="">Choisissez une demande après la connexion</option>';
  if (!registrations.some(row => row.id === selected)) selected = registrations[0]?.id || '';
  select.value = selected;
  if (latest?.warnings?.length) notify(latest.warnings.join('\n'));
  renderTable(); renderChart();
}
function renderTable() {
  const query = $('#search').value.toLowerCase();
  const filtered = registrations.filter(row => `${row.latest.daycare} ${row.latest.child}`.toLowerCase().includes(query));
  const sort = $('#sort').value;
  filtered.sort((a,b) => sort === 'name' ? a.latest.daycare.localeCompare(b.latest.daycare, 'fr-CA') : sort === 'recent' ? new Date(b.latest.capturedAt) - new Date(a.latest.capturedAt) : a.latest.ahead.min - b.latest.ahead.min);
  const latestTime = history.snapshots.at(-1)?.capturedAt;
  $('#registration-rows').innerHTML = filtered.map(row => {
    const item = row.latest;
    const stale = row.latest.collectedAt !== latestTime;
    return `<tr data-id="${escape(row.id)}"><td><button class="text-button daycare-name" data-select="${escape(row.id)}">${escape(item.daycare)}</button><span class="daycare-child">${escape([item.child, item.ageGroup].filter(Boolean).join(' · ') || 'Demande sur liste d’attente')}${item.manual ? ' · relevé confirmé' : ''}</span>${item.projection ? `<span class="daycare-child">Projection : ${escape(item.projection)}</span>` : ''}</td><td><span class="number-pill">${escape(range(item.ahead))}</span></td><td><span class="change ${row.delta.kind}">${escape(row.delta.label)}</span></td><td title="${escape(fullDate(item.capturedAt))}">${escape(date(item.capturedAt))}${stale ? '<span class="daycare-child">Non actualisée à ce relevé</span>' : ''}</td><td><a href="${escape(item.sourceUrl)}" target="_blank" rel="noreferrer" aria-label="Ouvrir ${escape(item.daycare)} dans le portail">↗</a></td></tr>`;
  }).join('');
  $('#registration-empty').classList.toggle('hidden', registrations.length > 0);
  if (registrations.length && !filtered.length) $('#registration-rows').innerHTML = '<tr><td colspan="5">Aucune demande ne correspond à votre recherche.</td></tr>';
  $('#table-caption').textContent = registrations.length ? `${filtered.length} demande${filtered.length > 1 ? 's' : ''} sur ${registrations.length} · Sélectionnez un nom pour consulter son historique` : 'Aucun relevé pour le moment';
}
function renderChart() {
  const registration = registrations.find(row => row.id === selected);
  if (!registration) return;
  const readings = registration.readings;
  // Keep bounds visible; never substitute a midpoint or a guessed upper bound.
  const width = 650, height = 195, left = 38, right = 18, top = 16, bottom = 32;
  const maxValue = Math.max(10, ...readings.flatMap(reading => [reading.ahead.min, reading.ahead.max ?? reading.ahead.min]));
  const scaleMax = Math.ceil(maxValue * 1.15 / 10) * 10;
  const times = readings.map(row => new Date(row.capturedAt).getTime());
  const first = Math.min(...times), last = Math.max(...times);
  const x = index => readings.length === 1 || first === last ? width / 2 : left + ((times[index] - first) / (last - first)) * (width - left - right);
  const y = value => top + (1 - value / scaleMax) * (height - top - bottom);
  let svg = `<svg class="data-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="Historique de ${escape(registration.latest.daycare)} : ${readings.length} relevé${readings.length > 1 ? 's' : ''}. Plus la valeur est basse, moins il y a d’enfants devant le vôtre.">`;
  for (let index = 0; index <= 3; index++) { const value = Math.round(scaleMax * index / 3); svg += `<path class="grid" d="M${left} ${y(value)}H${width - right}"/><text x="${left - 9}" y="${y(value) + 3}" text-anchor="end">${number(value)}</text>`; }
  const lower = readings.map((row,i) => `${i ? 'L' : 'M'}${x(i)},${y(row.ahead.min)}`).join(' ');
  const bounded = readings.every(row => row.ahead.max !== null);
  if (bounded) {
    const upper = readings.map((row,i) => `${i ? 'L' : 'M'}${x(i)},${y(row.ahead.max)}`).join(' ');
    const back = readings.map((row,i) => [x(i), y(row.ahead.min)]).reverse().map(([a,b]) => `L${a},${b}`).join(' ');
    svg += `<path class="band" d="${upper} ${back} Z"/><path class="upper" d="${upper}"/>`;
  }
  svg += `<path class="lower" d="${lower}"/>`;
  for (const [index, row] of readings.entries()) {
    if (row.ahead.max !== null && row.ahead.max !== row.ahead.min) svg += `<path class="upper" d="M${x(index)},${y(row.ahead.min)}V${y(row.ahead.max)}"/>`;
    svg += `<circle cx="${x(index)}" cy="${y(row.ahead.min)}" r="4"><title>${escape(fullDate(row.capturedAt))}: ${escape(range(row.ahead))} enfants devant le vôtre</title></circle>`;
    if (readings.length < 5 || index === 0 || index === readings.length - 1) svg += `<text x="${x(index)}" y="${height - 7}" text-anchor="middle">${escape(date(row.capturedAt))}</text>`;
  }
  if (readings.length === 1) svg += `<text x="${width / 2}" y="${Math.max(top + 5, y(readings[0].ahead.min) - 14)}" text-anchor="middle">${escape(range(readings[0].ahead))} enfants devant le vôtre · premier relevé</text>`;
  svg += '</svg>';
  $('#history-chart').innerHTML = svg;
  $('#chart-footnote').textContent = !bounded ? 'Valeurs sans plafond : minimum affiché' : 'La zone ombragée indique l’intervalle';
}

async function poll() {
  try {
    const state = await api('status');
    const titles = { idle: 'Connectez vos listes d’attente', connecting: 'Ouverture du portail', 'awaiting-login': 'Le navigateur du portail est ouvert', ready: 'Connexion établie', scraping: 'Lecture de vos listes d’attente', done: 'Vos derniers relevés sont enregistrés', error: 'La collecte demande votre attention' };
    $('#status-title').textContent = titles[state.phase] || 'Connexion au portail';
    $('#status-message').textContent = frenchMessage(state.message);
    $('#status-label').textContent = state.busy ? `${state.progress} / ${state.total || '…'}` : state.phase === 'ready' || state.phase === 'done' ? 'CONNECTÉ' : state.phase === 'error' ? 'ATTENTION' : state.browserOpen ? 'NAVIGATEUR OUVERT' : 'NON CONNECTÉ';
    $('#status-symbol').textContent = state.busy ? '↻' : state.phase === 'done' ? '✓' : '↗';
    $('#refresh-button').disabled = state.busy || state.phase === 'connecting';
    $('#connect-button').disabled = state.busy || state.phase === 'connecting';
    $('#connect-button').textContent = state.browserOpen ? 'Voir le navigateur ↗' : 'Connexion au portail ↗';
    const signature = `${state.phase}:${state.message}`;
    if (signature !== lastSignature && state.phase === 'done') { await loadHistory(); if (!state.warnings?.length) notify(''); }
    lastSignature = signature;
  } catch { $('#status-title').textContent = 'Le serveur local ne répond pas'; $('#status-message').textContent = 'Démarrez l’application avec npm start dans le dossier du projet, puis rechargez cette page.'; }
}
async function connect() { try { notify(''); await api('connect', {}); await poll(); } catch (error) { notify(error.message); } }
$('#connect-button').addEventListener('click', connect);
$('#empty-connect').addEventListener('click', connect);
$('#refresh-button').addEventListener('click', async () => { try { notify(''); await api('collect', {}); await poll(); } catch (error) { notify(error.message); } });
$('#search').addEventListener('input', renderTable);
$('#sort').addEventListener('change', renderTable);
$('#chart-registration').addEventListener('change', event => { selected = event.target.value; renderChart(); });
$('#registration-rows').addEventListener('click', event => { if (event.target.closest('a')) return; const row = event.target.closest('tr[data-id]'); if (row) { selected = row.dataset.id; $('#chart-registration').value = selected; renderChart(); $('.evolution-panel').scrollIntoView({ behavior: 'smooth', block: 'center' }); } });
$('#export-button').addEventListener('click', () => {
  const cell = value => { const text = String(value ?? ''); return `"${text.replace(/"/g,'""').replace(/^[=+@\-\t\r]/, char => `'${char}`)}"`; };
  const rows = [['date_releve','service_de_garde','enfant','tranche_age','date_projection','minimum_enfants_devant','maximum_enfants_devant','valeur_affichee','url_source']];
  for (const snapshot of history.snapshots) for (const row of snapshot.readings) rows.push([row.capturedAt,row.daycare,row.child,row.ageGroup,row.projection,row.ahead.min,row.ahead.max,range(row.ahead),row.sourceUrl]);
  const url = URL.createObjectURL(new Blob(['\uFEFF' + rows.map(row => row.map(cell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a'); link.href = url; link.download = `listes-attente-${new Date().toISOString().slice(0,10)}.csv`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
});
$('#inspect-button').addEventListener('click', async () => {
  try {
    $('#inspect-button').disabled = true;
    openReading = await api('inspect', {});
    $('#reading-error').textContent = '';
    $('#daycare-input').value = openReading.daycare || '';
    $('#child-input').value = openReading.child || '';
    $('#quantity-input').value = openReading.ahead ? range(openReading.ahead) : '';
    $('#indicator-excerpt').textContent = openReading.excerpt || 'Aucune valeur n’a été détectée dans le texte. Consultez le graphique du portail et saisissez le nombre ou l’intervalle affiché.';
    $('#reading-dialog').showModal();
  } catch (error) { notify(error.message); } finally { $('#inspect-button').disabled = false; }
});
$('#close-dialog').addEventListener('click', () => $('#reading-dialog').close());
$('#reading-form').addEventListener('submit', async event => {
  event.preventDefault();
  try {
    $('#save-reading').disabled = true;
    await api('reading', { ...Object.fromEntries(new FormData(event.target)), sourceUrl: openReading.sourceUrl });
    $('#reading-dialog').close(); await loadHistory();
  } catch (error) { $('#reading-error').textContent = frenchMessage(error.message); } finally { $('#save-reading').disabled = false; }
});
for (const [selector, message] of [['#daycare-input', 'Veuillez saisir le nom du service de garde.'], ['#quantity-input', 'Veuillez saisir le nombre ou l’intervalle affiché.']]) {
  $(selector).addEventListener('invalid', event => { if (event.target.validity.valueMissing) event.target.setCustomValidity(message); });
  $(selector).addEventListener('input', event => event.target.setCustomValidity(''));
}
try { await loadHistory(); } catch (error) { notify(error.message); }
await poll(); setInterval(poll, 2000);
