import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { PortalCollector } from '../src/scraper.mjs';
import { PORTAL_ORIGIN, PORTAL_URL } from '../src/extract.mjs';

// Every request is intercepted, including popups: no real account or portal is used.
const browser = await chromium.launch({channel:process.env.BROWSER_CHANNEL || 'msedge',headless:true});

async function scenario(entries, pageSize, simulateMissing = false) {
  const context = await browser.newContext();
  const visits = [];
  try {
    await context.route('**/*', async route => {
      const url = new URL(route.request().url());
      assert.equal(url.origin,PORTAL_ORIGIN);
      visits.push(url.pathname + url.search);
      let html;
      if (url.pathname.endsWith('/demandes-admission')) {
        const page = Number(url.searchParams.get('page') || 1);
        const rows = entries.slice((page-1)*pageSize,page*pageSize).map((entry,index)=>`<tr data-row-key-value="${entry.id}"><td>${entry.daycare}</td><td>${entry.child}</td><td><button title="Afficher actions" onclick="document.getElementById('menu-${index}').hidden=!document.getElementById('menu-${index}').hidden"><svg aria-hidden="true" width="16" height="16"><path d="m0 0 8 8 8-8"/></svg></button><div id="menu-${index}" hidden><a role="menuitem" href="/parent/s/consulter-demande-admission?demandeAdmissionId=${entry.id}">Consulter la demande d’inscription</a></div></td></tr>`).join('');
        const next = page*pageSize<entries.length ? `<a role="button" href="/parent/s/demandes-admission?page=${page+1}">Suivant</a>` : '<button disabled>Suivant</button>';
        html = `<h1>Mes demandes d’admission</h1><table><thead><tr><th>Service de garde</th><th>Enfant</th><th>Actions</th></tr></thead><tbody>${rows}</tbody></table>${next}`;
      } else {
        const id = url.searchParams.get('demandeAdmissionId');
        const entry = entries.find(item=>item.id===id);
        assert.ok(entry);
        if (url.pathname.endsWith('/consulter-demande-admission')) {
          const target = `/parent/s/indicateur-rang?demandeAdmissionId=${id}`;
          const rankControl = id.endsWith('1') ? `<a href="${target}">Voir l’indicateur de rang</a>` : `<span onclick="location.href='${target}'">Voir l’indicateur de rang</span>`;
          html = `<h1>Demande d’admission</h1><dl><dt>Service de garde</dt><dd>${entry.daycare}</dd><dt>Nom de l’enfant</dt><dd>${entry.child}</dd></dl>${entry.missing ? '<p>Aucun indicateur disponible pour ce service.</p>' : rankControl}`;
        } else if (url.pathname.endsWith('/indicateur-rang')) {
          html = `<h1>Indicateur de rang</h1><p>${entry.range} enfants devant le vôtre.</p><p>Projection pour le 1 janvier 2027</p><p>Tranche d’âge de ${entry.child} à cette date : ${entry.ageGroup}</p>`;
        } else throw new Error(`Unexpected fixture path: ${url.pathname}`);
      }
      await route.fulfill({contentType:'text/html; charset=utf-8',body:`<!doctype html><html lang="fr"><meta charset="utf-8"><body>${html}</body></html>`});
    });
    const saved = [];
    const collector = new PortalCollector('.local/test-browser', { save: async (readings,warnings) => saved.push({readings,warnings}) });
    collector.context = context;
    collector.page = await context.newPage();
    // Simulate unreadable indicators without spending time on normal retry delays.
    // The collection loop, row navigation, and successful indicator reading stay real.
    if (simulateMissing) {
      const readIndicator = collector.readIndicator.bind(collector);
      collector.readIndicator = async (page,entry) => {
        if (await page.getByText('Aucun indicateur disponible pour ce service.',{exact:true}).count()) throw new Error('Indicateur indisponible pour ce service.');
        return readIndicator(page,entry);
      };
    }
    await collector.page.goto(PORTAL_URL);
    await collector.collect();
    assert.equal(saved.length,1);
    return { ...saved[0], visits, state: collector.state };
  } finally { await context.close(); }
}

try {
  const result = await scenario([
    {id:'app-1',daycare:'CPE des étoiles',child:'Alex',range:'11–50',ageGroup:'0–18 mois'},
    {id:'app-2',daycare:'CPE des étoiles',child:'Camille',range:'51–100',ageGroup:'18–24 mois'},
  ],1);
  assert.equal(result.readings.length,2);
  assert.equal(result.readings[0].daycare,result.readings[1].daycare);
  assert.equal(result.readings[0].child,'Alex');
  assert.equal(result.readings[1].child,'Camille');
  assert.equal(result.readings[0].sourceKey,'admission:app-1');
  assert.notEqual(result.readings[0].sourceKey,result.readings[1].sourceKey);
  assert.equal(result.readings[0].ahead.min,11);
  assert.equal(result.readings[1].ahead.max,100);
  assert.equal(result.readings[0].ageGroup,'0–18 mois');
  assert.equal(result.readings[1].ageGroup,'18–24 mois');
  assert.equal(result.readings[0].projection,'1 janvier 2027');
  assert.deepEqual(result.warnings,[]);
  for (const id of ['app-1','app-2']) assert.ok(result.visits.some(value=>value.includes(`indicateur-rang?demandeAdmissionId=${id}`)));
  console.log('Browser collection passed: row menus, text controls, pagination, and two children registered at the same service.');

  const partial = await scenario([
    ...[1,2,3].map(index=>({id:`missing-${index}`,daycare:`Service fictif ${index}`,child:'Alex',missing:true})),
    {id:'readable-4',daycare:'CPE du jardin',child:'Camille',range:'0–10',ageGroup:'18–24 mois'},
  ],4,true);
  assert.equal(partial.readings.length,1);
  assert.equal(partial.readings[0].sourceKey,'admission:readable-4');
  assert.equal(partial.readings[0].ahead.max,10);
  assert.equal(partial.warnings.length,3);
  assert.equal(partial.state.progress,4);
  assert.equal(partial.state.phase,'done');
  console.log('Browser regression passed: three unreadable registrations do not prevent the fourth indicator from being collected.');
} finally { await browser.close(); }
