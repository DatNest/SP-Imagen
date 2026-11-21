import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createSpImagenProgress } from '../progress-ui.js';

class FakeElement {
 constructor(tag) {
  this.tag = tag;
  this.textContent = '';
  this.className = '';
  this.children = [];
  this.dataset = {};
  this.attributes = {};
  this.hidden = false;
  this.disabled = false;
  this.classList = { toggle() {} };
 }
 append(...nodes) {
  for (const node of nodes) { this.children.push(node); node.parentNode = this; }
 }
 appendChild(node) { this.append(node); }
 setAttribute(key, value) { this.attributes[key] = String(value); }
 remove() {
  if (this.parentNode) this.parentNode.children = this.parentNode.children.filter(x => x !== this);
 }
}

// Test the actual progress widget with a tiny DOM and clock, without SillyTavern.
function withProgress(run) {
 const original = {
  document: globalThis.document,
  interval: globalThis.setInterval,
  clearInterval: globalThis.clearInterval,
  timeout: globalThis.setTimeout,
  now: Date.now,
 };
 const html = new FakeElement('html');
 let now = 1000, tick = null, stopped = false;
 globalThis.document = {
  body: new FakeElement('body'),
  documentElement: html,
  createElement: name => new FakeElement(name),
  querySelectorAll: () => [],
 };
 globalThis.setInterval = fn => { tick = fn; return 17; };
 globalThis.clearInterval = id => { if (id === 17) stopped = true; };
 globalThis.setTimeout = () => 18; // Keep the finished card inspectable.
 Date.now = () => now;
 try {
  const progress = createSpImagenProgress();
  const root = html.children[0];
  const pill = root.children[0];
  const [heading, detail, elapsed, actions] = root.children[1].children;
  run({
   progress, root, pill, heading, detail, elapsed, actions,
   advance(ms) { now += ms; tick?.(); },
   stopped: () => stopped,
   html,
  });
  progress.close();
 } finally {
  globalThis.document = original.document;
  globalThis.setInterval = original.interval;
  globalThis.clearInterval = original.clearInterval;
  globalThis.setTimeout = original.timeout;
  Date.now = original.now;
 }
}

test('mobile timer stays compact and counts continuously across progress stages', () => {
 withProgress(({ progress, root, pill, elapsed, advance, html }) => {
  assert.equal(html.children[0], root);
  assert.equal(root.dataset.mobileExpanded, 'false');
  assert.equal(pill.attributes['aria-expanded'], 'false');
  assert.equal(pill.children[1].textContent, '0:00');
  advance(61000);
  assert.equal(elapsed.textContent, 'Прошло 1:01');
  progress.set('Проверка сцены', 'Проверь персонажей.');
  assert.equal(pill.children[1].textContent, '1:01');
  assert.equal(pill.children[2].textContent, 'Проверка сцены');
  pill.onclick();
  assert.equal(root.dataset.mobileExpanded, 'true');
  assert.equal(pill.attributes['aria-expanded'], 'true');
  pill.onclick();
  assert.equal(root.dataset.mobileExpanded, 'false');
 });
});

test('the same mobile timer persists after submission and expands on failure', () => {
 withProgress(({ progress, root, pill, detail, actions, stopped, advance }) => {
  advance(9000);
  progress.submitted();
  assert.equal(pill.children[1].textContent, '0:09');
  assert.equal(actions.children[0].hidden, true); // Don't promise cancellation after sending.
  progress.fail(new Error('Проверочная ошибка'));
  assert.equal(root.dataset.mobileExpanded, 'true');
  assert.equal(root.dataset.finished, 'true');
  assert.equal(detail.textContent, 'Проверочная ошибка');
  assert.ok(stopped());
 });
});

test('mobile layout keeps the timer above dialogs and maintenance buttons readable', () => {
 const css = readFileSync(new URL('../style.css', import.meta.url), 'utf8');
 assert.match(css, /\.spi-generation-progress\[data-mobile-expanded="false"\]/);
 assert.match(css, /\.spi-generation-progress\[data-mobile-expanded="false"\] \.spi-generation-progress-body\{display:none;\}/);
 assert.match(css, /z-index:2147483400/);
 assert.match(css, /\.spi-prompt-center>\.spi-profile-maintenance>\.spi-dialog-actions\{[\s\S]*?display:grid!important/);
 assert.match(css, /@media\(max-width:620px\)\{[\s\S]*?\.spi-prompt-center>\.spi-profile-maintenance>\.spi-dialog-actions\{grid-template-columns:minmax\(0,1fr\)!important/);
});
