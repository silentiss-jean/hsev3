/**
 * DELTA-067 — Test du rendu de `costs_view.js::_renderReference` (Q7).
 *
 * Aucun framework de test JS n'est disponible sur ce dépôt : on charge le
 * module tel quel dans Node, avec une doublure minimale de `document`, puis on
 * vérifie le HTML produit pour chaque état de `reference.status`.
 *
 * Lancer : node tests/test_costs_reference_view.mjs
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { strict as assert } from 'node:assert';

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = join(HERE, '..', 'custom_components', 'hse', 'web_static', 'panel', 'features', 'costs', 'costs_view.js');

// ── Doublure de document (juste ce que _renderReference touche) ────────────
class FakeEl {
  constructor() {
    this.className = '';
    this.dataset = {};
    this._html = '';
  }
  set innerHTML(v) { this._html = v; }
  get innerHTML() { return this._html; }
  set textContent(v) { this._text = v; }
  get textContent() { return this._text; }
  classList = { _on: false, add(c) { this._on = true; }, remove() { this._on = false; }, contains() { return this._on; } };
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

const mod = await import(new URL(`file://${SRC}`).href);
const { CostsView } = mod;

function render(reference) {
  const view = new CostsView();
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

// ── 1. Sans référence configurée : bloc masqué ─────────────────────────────
check('no_reference masque le bloc', () => {
  const box = render({ status: 'no_reference', reference_kwh: 0 });
  assert.equal(box.innerHTML, '', 'le HTML doit être vidé');
  assert.ok(!box.classList.contains('is-on'), 'is-on ne doit pas être posé');
});

check('reference absente de la réponse ne plante pas', () => {
  const box = render(undefined);
  assert.equal(box.innerHTML, '');
});

check('reference_kwh null masque le bloc', () => {
  const box = render({ status: 'ok', reference_kwh: null, tracked_kwh: 10 });
  assert.equal(box.innerHTML, '');
});

// ── 2. Cas nominal ─────────────────────────────────────────────────────────
const OK_REF = {
  entity_id: 'sensor.linky_index',
  status: 'ok',
  reference_kwh: 400.0,
  reference_eur: 130.0,
  tracked_kwh: 380.0,
  delta_kwh: 20.0,
  surplus_kwh: 0,
  untracked_kwh: 0,
  coverage_pct: 100,
  quality: { level: 'ok', notes: [] },
};

check('cas ok affiche le niveau ok et le badge Conforme', () => {
  const box = render(OK_REF);
  assert.equal(box.dataset.level, 'ok');
  assert.ok(box.innerHTML.includes('Conforme'), 'badge attendu');
  assert.ok(box.innerHTML.includes('Réconciliation avec la référence'));
});

check('cas ok affiche reference, suivi et ecart signe', () => {
  const html = render(OK_REF).innerHTML;
  assert.ok(html.includes('400.0 kWh'), 'référence');
  assert.ok(html.includes('380.0 kWh'), 'suivi');
  assert.ok(html.includes('+20.0 kWh'), 'écart positif préfixé +');
  assert.ok(html.includes('sensor.linky_index'), 'entity_id affiché');
});

check('cas ok n affiche pas le message d erreur', () => {
  const html = render(OK_REF).innerHTML;
  assert.ok(!html.includes('doublons'), 'aucun avertissement en cas conforme');
});

// ── 3. Dépassement : niveau error ──────────────────────────────────────────
const EXCEED_REF = {
  ...OK_REF,
  status: 'tracked_exceeds_ref',
  reference_kwh: 300.0,
  tracked_kwh: 380.0,
  delta_kwh: -80.0,
  surplus_kwh: 80.0,
  quality: { level: 'error', notes: ['tracked_exceeds_reference'] },
};

check('depassement passe le bloc en niveau error', () => {
  const box = render(EXCEED_REF);
  assert.equal(box.dataset.level, 'error');
  assert.ok(box.innerHTML.includes('Dépasse la référence'));
});

check('depassement affiche un delta negatif et le surplus', () => {
  const html = render(EXCEED_REF).innerHTML;
  assert.ok(html.includes('-80.0 kWh'), `delta négatif attendu, got: ${html.includes('-80.0 kWh')}`);
  assert.ok(html.includes('80.0 kWh'), 'surplus');
});

check('depassement affiche le message doublons/conversion', () => {
  const html = render(EXCEED_REF).innerHTML;
  assert.ok(html.includes('doublons'), 'avertissement attendu');
  assert.ok(html.includes('plus de 10 %'), 'seuil 10 % rappelé');
});

check('quality.level error suffit a passer en erreur', () => {
  const box = render({ ...OK_REF, quality: { level: 'error', notes: [] } });
  assert.equal(box.dataset.level, 'error');
});

// ── 4. Référence trop basse / indisponible : niveau warn ───────────────────
check('reference_too_low passe en warn', () => {
  const box = render({ ...OK_REF, status: 'reference_too_low', quality: { level: 'ok', notes: [] } });
  assert.equal(box.dataset.level, 'warn');
  assert.ok(box.innerHTML.includes('Référence trop basse'));
});

check('reference_unavailable passe en warn', () => {
  const box = render({ ...OK_REF, status: 'reference_unavailable', quality: { level: 'ok', notes: [] } });
  assert.equal(box.dataset.level, 'warn');
});

// ── 5. Notes de qualité affichées ─────────────────────────────────────────
check('les notes de qualite sont affichees', () => {
  const box = render({ ...OK_REF, quality: { level: 'ok', notes: ['tracked_exceeds_reference'] } });
  assert.ok(box.innerHTML.includes('tracked_exceeds_reference'));
});

check('statut inconnu ne casse pas le rendu', () => {
  const box = render({ ...OK_REF, status: 'surprise' });
  assert.ok(box.innerHTML.length > 0);
  assert.ok(box.innerHTML.includes('surprise'), 'le statut brut est affiché');
});

console.log(`\n${passed} vérifications passées.`);
if (process.exitCode) process.exit(process.exitCode);