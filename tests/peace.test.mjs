import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const html = fs.readFileSync(new URL('../peace.html', import.meta.url), 'utf8');
test('names reject null and generated timestamps without rejecting real names', () => {
  const start = html.indexOf('        function getJoinNameError(');
  assert.notEqual(start, -1, 'Shared name validation is required');
  const source = html.slice(start, html.indexOf('        function ensureJoinName(', start));
  const context = vm.createContext({});
  vm.runInContext(source, context);
  for (const name of [null, undefined, '', '   ', 'null', ' NULL ', 'undefined', 'Invalid Date', 'Nov 03, 01:53 AM', '03 Nov, 13:53', '2026-11-03', '11/03/2026']) {
    assert.ok(context.getJoinNameError(name), `Must reject ${JSON.stringify(name)}`);
  }
  for (const name of ['Alice', '  Jane Doe  ', '李明', 'José', 'Anne-Marie']) assert.equal(context.getJoinNameError(name), '');
});
test('Settings contains a name editor and launch starts blank', () => {
  assert.match(html, /id="config-name-input"/);
  assert.match(html, /input.value = '';/);
  assert.doesNotMatch(html, /requestAutoReload\('name-update'\)/);
});
test('invalid saved names require re-entry even when previously confirmed', () => {
  const start = html.indexOf('        function getJoinNameError(');
  const source = html.slice(start, html.indexOf('        const joinState', start));
  for (const name of ['Nov 03, 01:53 AM', 'null', 'NULL', '   ']) {
    const stored = new Map([['relax_join_name', name], ['relax_name_confirmed', '1']]);
    const context = vm.createContext({ JOIN_NAME_STORAGE_KEY: 'relax_join_name', localStorage: {
      getItem: key => stored.get(key) ?? null, removeItem: key => stored.delete(key)
    } });
    vm.runInContext(source, context);
    assert.equal(context.ensureJoinName(), '');
    assert.equal(stored.has('relax_join_name'), false);
    assert.equal(stored.has('relax_name_confirmed'), false);
  }
});
test('transcript is not capped or bulk cleared', () => {
  assert.doesNotMatch(html, /slice\(-ALTAR_CHAT_MAX_ENTRIES\)/);
  assert.doesNotMatch(html, /id="peer-chat-clear"/);
});
test('watch layout fits below 320px and uses full viewport', () => {
  assert.match(html, /@media\s*\(max-width: 480px\)/);
  assert.match(html, /min-width: 0 !important/);
});
test('specialized links retain existing rendering', () => {
  const source = html.slice(html.indexOf('        function escapeHtml('), html.indexOf('        function queueChatTranslation('));
  const context = vm.createContext({});
  vm.runInContext(source, context);
  for (const [input, href] of [['yo--google','https://google.com'],['yo -- example.org','https://example.org'],['yo--https://example.org/path','https://example.org/path'],['yo--example.org/path?q=1#x','https://example.org/path?q=1#x']]) {
    const output = context.renderMarkdown(input);
    assert.ok(output.includes(`href="${href}"`), output);
    assert.ok(output.includes('<strong>yo</strong>'), output);
    assert.ok(output.includes('target="_blank" rel="noopener noreferrer"'));
    assert.equal(context.renderMarkdown(context.normalizeChatMessage(input)), output);
  }
  assert.match(context.renderMarkdown('[hello](https://example.org)'), /<a href="https:\/\/example.org"/);
  assert.match(context.renderMarkdown('**bold** *italic* `code`'), /<strong>bold<\/strong>/);
});
