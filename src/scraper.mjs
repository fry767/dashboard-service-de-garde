import { chromium } from 'playwright';
import path from 'node:path';
import { frenchMessage } from '../public/messages.js';
import { stat } from 'node:fs/promises';
const extractorVersion = (await stat(new URL('./extract.mjs', import.meta.url))).mtimeMs;
const { PORTAL_URL, PORTAL_ORIGIN, extractIndicator, extractLabels, extractProjection, registrationKey, normalize } = await import(`./extract.mjs?v=${extractorVersion}`);

const CONSULT = /^(?:Consulter la demande d[’'](?:inscription|admission)|Afficher|Voir la demande(?: d[’'](?:inscription|admission))?)$/i;
const RANK = /^(?:(?:Voir|Afficher|Consulter|L[’'])\s*)?(?:l[’']\s*)?indicateur de rang(?:\s.*)?$/i;
const delay = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

export class PortalCollector {
  constructor(directory, store) {
    this.directory = directory;
    this.store = store;
    this.context = null;
    this.page = null;
    this.busy = false;
    this.state = { phase: 'idle', message: 'Connectez-vous au portail pour effectuer votre premier relevé.', progress: 0, total: 0 };
  }
  update(phase, message, extra = {}) { Object.assign(this.state, { phase, message, ...extra }); }
  async connect() {
    if (this.context && this.page && !this.page.isClosed()) { await this.page.bringToFront(); return; }
    this.update('connecting', 'Ouverture du navigateur du portail…');
    try {
      this.context = await chromium.launchPersistentContext(path.join(this.directory, 'browser'), {
        channel: process.env.BROWSER_CHANNEL || 'msedge', headless: false, viewport: null,
        acceptDownloads: false, locale: 'fr-CA',
      });
      this.context.on('close', () => { this.context = null; this.page = null; if (!this.busy) this.update('idle', 'Le navigateur est fermé. Votre historique enregistré reste accessible.'); });
      this.page = this.context.pages()[0] || await this.context.newPage();
      this.page.setDefaultTimeout(12000);
      await this.page.goto(PORTAL_URL, { waitUntil: 'domcontentloaded', timeout: 45000 });
      this.update('awaiting-login', 'Connectez-vous dans le navigateur du portail, ouvrez « Mes demandes d’admission », puis cliquez sur « Actualiser » ici.');
    } catch (error) {
      await this.context?.close().catch(() => {});
      this.update('error', 'Impossible d’ouvrir le navigateur du portail. Vérifiez que le navigateur choisi avec BROWSER_CHANNEL est installé, puis réessayez.');
      throw error;
    }
  }
  async status() {
    if ((this.state.phase === 'awaiting-login' || (this.state.phase === 'error' && /sign.in|connectez-vous|terminez votre connexion/i.test(this.state.message))) && !this.busy && this.page && !this.page.isClosed()) {
      const url = this.page.url();
      if (url.startsWith(PORTAL_ORIGIN) && !/\/login(?:\/|\?|$)/i.test(url)) {
        const controls = this.page.getByRole('link', { name: CONSULT }).or(this.page.getByRole('button', { name: CONSULT }));
        if (await controls.count() || await this.page.getByRole('heading', { name: /demandes d[’']admission/i }).count()) this.update('ready', 'Connexion au portail établie. Cliquez sur « Actualiser » pour relever vos demandes.');
      }
    }
    return { ...this.state, browserOpen: Boolean(this.page && !this.page.isClosed()), busy: this.busy };
  }
  async readonlyControl(page, pattern) {
    const controls = page.getByRole('link', { name: pattern }).or(page.getByRole('button', { name: pattern })).or(page.getByRole('menuitem', { name: pattern })).or(page.getByRole('tab', { name: pattern }));
    for (let index = 0; index < await controls.count(); index++) if (await controls.nth(index).isVisible()) return controls.nth(index);
    // Some portal Lightning components render clickable text without a link/button role.
    const textControls = page.getByText(pattern, { exact: true });
    for (let index = 0; index < await textControls.count(); index++) {
      const control = textControls.nth(index);
      if (await control.isVisible() && await control.evaluate(node => !node.matches('h1,h2,h3,h4,h5,h6,[role="heading"]'))) return control;
    }
    return null;
  }
  async follow(control, page = this.page) {
    const popup = page.context().waitForEvent('page', { timeout: 1800 }).catch(() => null);
    await control.click();
    const opened = await popup;
    const target = opened || page;
    await target.waitForLoadState('domcontentloaded').catch(() => {});
    await target.waitForTimeout(600);
    return target;
  }
  async listEntries() {
    // Playwright locators and evaluate pierce open Salesforce Lightning shadow roots.
    const direct = await this.page.locator('a,button,[role="button"]').evaluateAll(elements => {
      const norm = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[’‘]/g, "'").trim().toLowerCase();
      const matches = [];
      for (const element of elements) {
        const label = (element.innerText || element.getAttribute('aria-label') || element.getAttribute('title') || '').trim();
        if (!/^consulter la demande d'inscription|^consulter la demande d'admission|^voir la demande/.test(norm(label)) || !element.getClientRects().length) continue;
        let container = element.closest('tr,[role="row"],article,li,.slds-card');
        if (!container) { container = element.parentElement; for (let i = 0; i < 3 && container?.parentElement && container.innerText.length < 100; i++) container = container.parentElement; }
        const href = element.getAttribute('href');
        const text = (container?.innerText || label).trim();
        const lines = text.split('\n').map(value => value.trim()).filter(value => value && !/^consulter|^modifier|^retirer|^annuler/i.test(value));
        matches.push({ label, href, text, daycare: lines[0] || '', mode: 'direct', index: matches.filter(item => item.label === label).length });
      }
      return matches;
    });
    if (direct.length) return direct;
    const rows = this.page.getByRole('row');
    const headers = (await this.page.getByRole('columnheader').allTextContents()).map(normalize);
    const daycareColumn = headers.findIndex(value => /service de garde/.test(value));
    const childColumn = headers.findIndex(value => /enfant/.test(value));
    const entries = [];
    for (let index = 0; index < await rows.count(); index++) {
      const row = rows.nth(index);
      const menu = row.locator('button[aria-haspopup="true"],button[title*="action" i],lightning-button-menu button');
      if (!await menu.count() || !await menu.first().isVisible()) continue;
      const text = await row.innerText();
      const key = await row.getAttribute('data-row-key-value') || await row.getAttribute('data-record-id');
      const cells = await row.getByRole('cell').allTextContents();
      entries.push({ mode: 'menu', rowIndex: index, text, key, daycare: cells[daycareColumn]?.trim() || cells.find(value => value.trim())?.trim() || text.split('\n')[0], child: cells[childColumn]?.trim() || '' });
    }
    return entries;
  }
  async nextPage() {
    const control = await this.readonlyControl(this.page, /^(?:suivant|suivante|page suivante|next|next page)(?:\s.*)?$/i);
    return control && await control.isEnabled() && await control.getAttribute('aria-disabled') !== 'true' ? control : null;
  }
  async navigateList(pageNumber = 0) {
    await this.page.goto(PORTAL_URL, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await this.page.waitForTimeout(1200);
    if (!this.page.url().startsWith(PORTAL_ORIGIN) || /\/login(?:\/|\?|$)/i.test(this.page.url())) throw new Error('Votre session a expiré. Connectez-vous dans le navigateur du portail, puis actualisez de nouveau.');
    for (let index = 0; index < pageNumber; index++) {
      const next = await this.nextPage();
      if (!next) throw new Error('La liste des demandes a changé pendant la collecte. Veuillez actualiser de nouveau.');
      await next.click();
      await this.page.waitForTimeout(800);
    }
  }
  async readIndicator(page, entry) {
    // The rank is on a second page, reached from the consultation page.
    let rankControl = null;
    for (let attempt = 0; attempt < 12; attempt++) {
      rankControl = await this.readonlyControl(page, RANK);
      if (rankControl) break;
      await delay(350);
    }
    const detailText = await page.locator('body').innerText();
    const labels = extractLabels(detailText, entry);
    if (entry.mode === 'menu') { labels.daycare = entry.daycare || labels.daycare; labels.child = entry.child || labels.child; }
    const sourceKey = registrationKey(page.url(), entry.sourceKey);
    let rankPage = page;
    if (rankControl) rankPage = await this.follow(rankControl, page);
    let ahead = null;
    for (let attempt = 0; attempt < 15; attempt++) {
      const text = await rankPage.locator('body').innerText();
      ahead = extractIndicator(text);
      if (!ahead) {
        // Accessible SVG/image labels can hold the count when the chart has no visible text.
        const descriptions = await rankPage.locator('svg [aria-label],svg title,svg desc,img[alt],[role="img"][aria-label]').evaluateAll(nodes => nodes.map(node => node.getAttribute('aria-label') || node.getAttribute('alt') || node.textContent || '').join('\n'));
        ahead = extractIndicator(descriptions);
      }
      if (ahead) break;
      await delay(400);
    }
    const sourceUrl = rankPage.url();
    const indicatorText = await rankPage.locator('body').innerText();
    labels.ageGroup = extractLabels(indicatorText).ageGroup || labels.ageGroup;
    const projection = extractProjection(indicatorText);
    if (rankPage !== page) await rankPage.close();
    if (!ahead) throw new Error('L’indicateur est illisible ou contient plusieurs valeurs. Ouvrez sa page, puis utilisez « Lire l’indicateur ouvert » pour choisir la bonne valeur.');
    return { ...labels, daycare: labels.daycare || entry.daycare || 'Demande', ahead, sourceUrl, projection,
      sourceKey: sourceKey || `registration:${labels.daycare || entry.daycare}:${labels.child}`, capturedAt: new Date().toISOString() };
  }
  async collect() {
    if (this.busy) throw new Error('Une collecte est déjà en cours.');
    if (!this.page || this.page.isClosed()) { await this.connect(); return; }
    if (!this.page.url().startsWith(PORTAL_ORIGIN) || /\/login(?:\/|\?|$)/i.test(this.page.url())) throw new Error('Terminez votre connexion dans le navigateur du portail, puis cliquez sur « Actualiser ».');
    this.busy = true;
    this.update('scraping', 'Recherche de vos demandes…', { progress: 0, total: 0, warnings: [] });
    try {
      await this.navigateList();
      let entries = [];
      for (let attempt = 0; attempt < 15; attempt++) { entries = await this.listEntries(); if (entries.length) break; await delay(400); }
      if (!entries.length) throw new Error('Aucun lien de consultation n’a été trouvé. Ouvrez une demande et son indicateur de rang, puis utilisez « Lire l’indicateur ouvert ».');
      const readings = [], warnings = [];
      const pageSignatures = new Set();
      for (let pageNumber = 0; pageNumber < 50; pageNumber++) {
        const signature = JSON.stringify(entries.map(entry => entry.href || entry.key || entry.text));
        if (pageSignatures.has(signature)) { warnings.push('Une page a été répétée. Les demandes restantes n’ont pas été relevées.'); break; }
        pageSignatures.add(signature);
        this.state.total += entries.length;
        for (const [index, entry] of entries.entries()) {
          this.update('scraping', `Lecture de ${entry.daycare || 'la demande'} (page ${pageNumber + 1})…`);
          let detail;
          try {
            if (index > 0) await this.navigateList(pageNumber);
            const href = entry.href ? new URL(entry.href, PORTAL_URL) : null;
            if (entry.key) entry.sourceKey = `portal-record:${entry.key}`;
            if (href && href.origin === PORTAL_ORIGIN && !['#', 'javascript:'].some(prefix => entry.href.startsWith(prefix)) && href.pathname !== new URL(PORTAL_URL).pathname) {
              entry.sourceKey = `${href.origin}${href.pathname}${href.search}`;
              await this.page.goto(href.href, { waitUntil: 'domcontentloaded' });
              detail = this.page;
            } else if (entry.mode === 'menu') {
              const row = this.page.getByRole('row').nth(entry.rowIndex);
              await row.locator('button[aria-haspopup="true"],button[title*="action" i],lightning-button-menu button').first().click();
              const consult = await this.readonlyControl(this.page, CONSULT);
              if (!consult) throw new Error('Le menu de la demande ne contient aucune action de consultation.');
              detail = await this.follow(consult);
            } else {
              const controls = this.page.getByRole('link', { name: entry.label, exact: true }).or(this.page.getByRole('button', { name: entry.label, exact: true }));
              detail = await this.follow(controls.nth(entry.index));
            }
            readings.push(await this.readIndicator(detail, entry));
          } catch (error) { warnings.push(`${entry.daycare || `Demande ${index + 1}`} : ${frenchMessage(error.message.split('\n')[0])}`); }
          finally { if (detail && detail !== this.page) await detail.close().catch(() => {}); }
          this.state.progress++;
        }
        await this.navigateList(pageNumber);
        const next = await this.nextPage();
        if (!next) break;
        if (pageNumber === 49) { warnings.push('Arrêt après 50 pages. Certaines demandes n’ont peut-être pas été relevées.'); break; }
        await next.click();
        await this.page.waitForTimeout(1000);
        entries = await this.listEntries();
        if (!entries.length) { warnings.push('La page suivante ne contient aucune commande de consultation lisible.'); break; }
      }
      this.state.warnings = warnings;
      if (!readings.length) throw new Error(`Aucun indicateur n’a pu être relevé. ${warnings.slice(0,3).join(' ')}`);
      await this.store.save(readings, warnings);
      this.update('done', `${readings.length} demande${readings.length === 1 ? '' : 's'} enregistrée${readings.length === 1 ? '' : 's'}${warnings.length ? `; ${warnings.length} élément${warnings.length > 1 ? 's' : ''} à vérifier` : ''}.`, { warnings });
    } catch (error) { this.update('error', frenchMessage(error.message.split('\n')[0])); throw error; }
    finally { this.busy = false; }
  }
  async inspectOpen() {
    if (this.busy) throw new Error('Veuillez attendre la fin de la collecte en cours.');
    const page = this.context?.pages().filter(item => item.url().startsWith(PORTAL_ORIGIN)).at(-1);
    if (!page || /\/login(?:\/|\?|$)/i.test(page.url())) throw new Error('Connectez-vous et ouvrez d’abord l’indicateur de rang d’une demande dans le navigateur du portail.');
    const text = await page.locator('body').innerText();
    const ahead = extractIndicator(text);
    const labels = extractLabels(text);
    // Return only relevant short sections; never return the full account page or credentials.
    const lines = text.split('\n');
    const relevant = new Set();
    lines.forEach((line, index) => { if (/rang|devant|avant|enfants|indicateur/i.test(line)) for (let i = Math.max(0, index - 1); i <= Math.min(lines.length - 1, index + 2); i++) relevant.add(i); });
    return { ...labels, ahead, sourceUrl: page.url(), excerpt: [...relevant].sort((a,b) => a-b).map(index => lines[index]).join('\n').slice(0,5000) };
  }
  async close() { await this.context?.close(); }
}
