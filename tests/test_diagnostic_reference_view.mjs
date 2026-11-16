/**
 * DELTA-067 / Q7-R8 — Test du rendu du bloc « capteur de référence » de
 * `diagnostic_view.js`.
 *
 * Vérifie que les candidats retenus ET les motifs de rejet sont affichés :
 * sans cela, l'utilisateur ne peut pas comprendre pourquoi son Linky
 * n'est pas proposé.
 *
 * Lancer : node tests/test_diagnostic_reference_view.mjs
 */
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { strict as assert } from 'node:assert';

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = join(HERE, '..', 'custom_components', 'hse', 'web_static', 'panel',
  'features', 'diagnostic', 'diagnostic_view.js');

class FakeEl {
  constructor() {
    this.className = '';
    this.dataset = {};
    this._html = '';
  }
  set innerHTML(v) { this._html = v; }
  get innerHTML() { return this._html; }
  querySelector() { return null; }
}

globalThis.document = {
  getElementById: () => null,
  createElement: () => new FakeEl(),
  head: { appendChild() {} },
};
globalThis.AbortController = class { constructor() { this.signal = {}; } abort() {} };
globalThis.setInterval = () => 0;
globalThis.clearInterval = () => {};

const { DiagnosticView } = await import(new URL(`file://${SRC}`).href);

function render(reference) {
  const view = new DiagnosticView();
  const box = new FakeEl();
  view._els = { ref: box };
  view._renderReference(reference);
  return box;
}

let passed = 0;
function check(name, fn) {
  try { fn(); passed++; console.log(`  ok  ${name}`); }
  catch (e) { console.error(`  KO  ${name}\n      ${e.message}`); process.exitCode = 1; }
}

const REF = {
  candidates: [{ entity_id: 'sensor.linky_index', name: 'Index Linky', score: 90, verdict: 'propose' }],
  rejected: [
    { entity_id: 'sensor.buanderie_aspirateur_total_energy', name: 'Aspirateur', score: 60, verdict: 'rejete_device', reasons: ['indice d\'appareil'] },
    { entity_id: 'sensor.linky_index_jour', name: 'Linky jour', score: 70, verdict: 'rejete_periodique', reasons: ['cumul journalier'] },
  ],
  counts: { propose: 1, rejete_device: 1, rejete_periodique: 1 },
};

check('sans bloc reference, le conteneur reste vide', () => {
  assert.equal(render(undefined).innerHTML, '');
});

check('sans candidat retenu, rien ne s affiche', () => {
  assert.equal(render({ candidates: [], rejected: [], counts: {} }).innerHTML, '');
});

check('les candidats retenus sont comptes', () => {
  const html = render(REF).innerHTML;
  assert.ok(html.includes('1</strong> candidat'), 'nombre de candidats');
  assert.ok(html.includes('3</strong> entité'), 'nombre total évalué');
});

check('le rappel sur le caractère cumulatif est affiché', () => {
  const html = render(REF).innerHTML;
  assert.ok(html.includes('cumulatif'), 'rappel cumulatif attendu');
  assert.ok(html.includes('base de facturation'), 'rôle de la référence rappelé');
});

check('les entités rejetées sont listées avec leur motif', () => {
  const html = render(REF).innerHTML;
  assert.ok(html.includes('sensor.buanderie_aspirateur_total_energy'), 'entité rejetée 1');
  assert.ok(html.includes('sensor.linky_index_jour'), 'entité rejetée 2');
  // L'apostrophe est échappée par escHtml : c'est voulu (anti-XSS).
  assert.ok(html.includes('indice d&#39;appareil'), 'libellé de verdict');
  assert.ok(html.includes('cumul journalier'), 'motif de rejet affiché');
});

check('le tableau comporte les bonnes colonnes', () => {
  const html = render(REF).innerHTML;
  for (const h of ['<th>Entité</th>', '<th>Nom</th>', '<th>Score</th>', '<th>Verdict</th>', '<th>Motif</th>']) {
    assert.ok(html.includes(h), `colonne manquante: ${h}`);
  }
});

check('un verdict inconnu ne casse pas le rendu', () => {
  const box = render({
    candidates: [{ entity_id: 'sensor.x', score: 1, verdict: 'propose' }],
    rejected: [{ entity_id: 'sensor.y', name: 'Y', score: 1, verdict: 'surprise', reasons: [] }],
    counts: {},
  });
  assert.ok(box.innerHTML.includes('surprise'), 'verdict brut affiché');
});

check('sans champ rejected, le tableau est omis sans erreur', () => {
  const box = render({ candidates: [{ entity_id: 'sensor.x', score: 1, verdict: 'propose' }] });
  assert.ok(box.innerHTML.includes('candidat'), 'bloc tout de même rendu');
  assert.ok(!box.innerHTML.includes('<table>'), 'pas de tableau sans rejet');
});

console.log(`\n${passed} vérifications passées.`);
if (process.exitCode) process.exit(process.exitCode);