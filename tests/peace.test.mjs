import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const html = fs.readFileSync(new URL('../peace.html', import.meta.url), 'utf8');
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
