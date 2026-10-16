import test from 'node:test';
import assert from 'node:assert/strict';
import { extractIndicator, extractLabels, parseQuantity, registrationKey } from '../src/extract.mjs';

test('preserves exact counts, intervals and open-ended values', () => {
  for (const [text, min, max] of [['0',0,0],['42',42,42],['11–50',11,50],['51 à 100',51,100],['entre 101 et 200',101,200],['201 et plus',201,null],['201+',201,null],['plus de 200',201,null],['moins de 5',0,4],['1\u202f234',1234,1234]]) {
    const actual = parseQuantity(text);
    assert.ok(actual, text);
    assert.equal(actual.min,min,text);
    assert.equal(actual.max,max,text);
  }
  for (const text of ['50–11','2026-10-14','0 à 18 mois','Catégorie 4','', '-3']) assert.equal(parseQuantity(text),null,text);
});
test('reads French sentences and labelled count values', () => {
  for (const text of ["Il y a entre 11 et 50 enfants devant le vôtre.","Nombre d’enfants devant votre enfant\n11 à 50", "Enfants devant le vôtre : 11–50"]) {
    const actual = extractIndicator(text);
    assert.ok(actual,text); assert.equal(actual.min,11); assert.equal(actual.max,50);
  }
  assert.equal(extractIndicator('42 enfants sont devant votre enfant.').min,42);
  assert.equal(extractIndicator('201 et plus enfants avant le vôtre').max,null);
});
test('ignores dates, ages, categories and chart axis ticks', () => {
  assert.equal(extractIndicator("Indicateur de rang\nGroupe d’âge 0 à 18 mois\nCatégorie 4\n2026-10-14\n0\n10\n50\n100"),null);
});
test('does not pick an arbitrary count from multiple age groups', () => {
  assert.equal(extractIndicator('11–50 enfants devant le vôtre\n51–100 enfants devant le vôtre'),null);
  assert.equal(extractIndicator('42 enfants devant le vôtre\n42 enfants devant le vôtre').min,42);
});
test('reads the portal SVG callout without choosing a chart-axis bucket', () => {
  const axis = 'Plus de 200 enfants\n101 à 200 enfants\n51 à 100 enfants\n11 à 50 enfants\n0 à 10 enfant(s)\n';
  for (const [callout,min,max] of [['11 à 50 enfants',11,50],['0 à 10 enfant(s)',0,10],['Plus de 200 enfants',201,null]]) {
    const actual = extractIndicator(axis + `${callout}\nde la même tranche d’âge\nse trouvent devant\nAlex\nProjection pour le 1 janvier 2027`);
    assert.ok(actual,callout); assert.equal(actual.min,min); assert.equal(actual.max,max);
  }
});
test('extracts labels without interpreting age or category as a count', () => {
  assert.deepEqual(extractLabels("Service de garde\nCPE des petits\nNom de l’enfant\nAlex\nTranche d’âge\n0–18 mois"), {daycare:'CPE des petits',child:'Alex',ageGroup:'0–18 mois'});
});
test('recognizes the same registration across consultation and rank URLs', () => {
  assert.equal(registrationKey('/parent/s/consulter-demande-admission?demandeAdmissionId=abc&modeList=true'),registrationKey('/parent/s/indicateur-rang?demandeAdmissionId=abc'));
  assert.equal(registrationKey('/parent/s/other','fallback'),'fallback');
});
