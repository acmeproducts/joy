"""Browser acceptance checks; uses real Tailwind and a deterministic relay stub.
Run: python tests/peace-browser.py (TAILWIND_SCRIPT may select a cached CDN script).
"""
import json, os, pathlib, uuid
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
HTML = (ROOT / 'peace.html').read_text()
TAILWIND = pathlib.Path(os.environ.get('TAILWIND_SCRIPT', '/tmp/peace-tailwind.js')).read_text()
records = {}
offline = False
REAL_SESSION = 'peace-test-' + uuid.uuid4().hex

def route_request(route):
    request = route.request
    if request.url == 'http://peace.test/peace.html':
        return route.fulfill(content_type='text/html', body=HTML)
    if 'cdn.tailwindcss.com' in request.url:
        return route.fulfill(content_type='text/javascript', body=TAILWIND)
    if '/signal' in request.url:
        if offline:
            return route.abort()
        if os.environ.get('REAL_WORKER') == '1':
            from urllib.parse import urlsplit, parse_qsl, urlencode
            url = urlsplit(request.url)
            query = dict(parse_qsl(url.query))
            query['session'] = REAL_SESSION
            options = {}
            if request.method == 'POST':
                options['post_data'] = {**request.post_data_json, 'session': REAL_SESSION}
            response = route.fetch(url='http://127.0.0.1:8787' + url.path + '?' + urlencode(query), **options)
            return route.fulfill(response=response)
        if request.method == 'POST':
            operation = request.post_data_json
            for entry in operation.get('entries', [operation]):
                key = entry.get('id')
                if not key: continue
                deleted = entry.get('deleted') or entry.get('type') == 'chat-room-delete'
                if records.get(key, {}).get('deleted'): continue
                if key in records and not deleted: continue
                records[key] = dict(entry, message='Post deleted.' if deleted else entry.get('text', entry.get('message','')), senderId=entry.get('senderId', entry.get('from')), deleted=bool(deleted))
            return route.fulfill(json={'ok': True}, headers={'Access-Control-Allow-Origin': '*'})
        return route.fulfill(json={'entries': list(records.values()), 'cursor': None} if 'chat=1' in request.url else [], headers={'Access-Control-Allow-Origin': '*'})
    return route.fulfill(status=404, body='')

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    context = browser.new_context(viewport={'width': 198, 'height': 242}, has_touch=True)
    context.add_init_script("""if (!localStorage.getItem('name-test-seeded')) {
        localStorage.setItem('relax_join_name', 'Nov 03, 01:53 AM');
        localStorage.setItem('relax_name_confirmed', '1');
        localStorage.setItem('name-test-seeded', '1');
    }""")
    context.route('**/*', route_request)
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto('http://peace.test/peace.html')
    assert page.locator('#launch-name').input_value() == ''
    for invalid in ['', '   ', 'null', 'Nov 03, 01:53 AM']:
        page.locator('#launch-name').fill(invalid)
        page.locator('#launch-name-dialog button').click()
        assert page.locator('#launch-name-dialog').is_visible()
        assert page.evaluate('joinState.name') == ''
        assert page.locator('#launch-name-status').inner_text()
    assert page.evaluate('updateLocalName(null)') is False
    page.locator('#launch-name').fill('  Alice  ')
    page.locator('#launch-name-dialog button').click()
    page.locator('#session-beacon').click()
    page.locator('#peer-chat-input').fill('yo--google')
    page.locator('#peer-chat-send').click()
    page.wait_for_function("document.querySelector('#peer-chat-sync-status').textContent === 'Saved'")
    assert page.locator('#peer-chat-history a').get_attribute('href') == 'https://google.com'
    assert page.locator('#peer-chat-history strong').inner_text() == 'yo'
    page.reload()
    assert page.locator('#launch-name-dialog').count() == 0
    page.locator('#session-beacon').click()
    assert page.locator('#peer-chat-history a').count() == 1
    assert page.evaluate('joinState.name') == 'Alice'
    assert page.locator('#peer-chat-local-name').count() == 0
    page.locator('#peer-chat-window-close').click()
    page.locator('#settings-trigger').click()
    config = page.locator('#config-name-input')
    assert config.input_value() == 'Alice'
    assert config.bounding_box()['x'] >= 0
    for invalid in ['', 'null', '2026-11-03']:
        config.fill(invalid)
        page.locator('#config-name-form button').click()
        assert page.evaluate('joinState.name') == 'Alice'
        assert page.locator('#config-name-status').inner_text() != 'Name saved.'
    config.fill('Alicia')
    config.blur()
    page.evaluate('updateLocalProfileUI()')
    assert config.input_value() == 'Alicia', 'Background refresh clobbered name draft'
    page.locator('#config-name-form button').click()
    assert page.evaluate('joinState.name') == 'Alicia'
    assert page.locator('#config-name-status').inner_text() == 'Name saved.'
    page.reload()
    assert page.locator('#launch-name-dialog').count() == 0
    assert page.evaluate('joinState.name') == 'Alicia'
    page.locator('#session-beacon').click()
    for width, height in [(162,197),(176,215),(198,242),(240,280),(390,844),(1280,800)]:
        page.set_viewport_size({'width': width, 'height': height})
        box = page.locator('#peer-chat-window').bounding_box()
        composer = page.locator('#peer-chat-input').bounding_box()
        assert box['x'] >= 0 and box['x'] + box['width'] <= width + 1, (width,box)
        assert composer['width'] >= 60, (width,composer)
        assert composer['y'] + composer['height'] <= height + 1, (width,composer)
        assert page.locator('#peer-chat-history').evaluate('(e) => e.scrollWidth <= e.clientWidth + 1')
        page.locator('#peer-chat-tools summary').click()
        assert page.locator('#peer-chat-export').is_visible()
        page.locator('#peer-chat-tools summary').click()
    page.set_viewport_size({'width':198,'height':242})
    page.screenshot(path='/tmp/peace-watch.png')
    # Offline scratch use and queued delivery survive a reload.
    offline = True
    page.wait_for_timeout(1100)
    page.locator('#peer-chat-input').fill('offline scratch')
    page.locator('#peer-chat-send').click()
    page.reload()
    page.locator('#session-beacon').click()
    assert 'offline scratch' in page.locator('#peer-chat-history').inner_text()
    offline = False
    page.evaluate('syncDurableChat()')
    # Fresh browser has no local transcript and recovers without any peers.
    fresh = browser.new_context(viewport={'width':176,'height':215})
    fresh.route('**/*', route_request)
    other = fresh.new_page()
    other.goto('http://peace.test/peace.html')
    other.locator('#launch-name').fill('Bob')
    other.locator('#launch-name-dialog button').click()
    other.locator('#session-beacon').click()
    other.wait_for_function("document.querySelector('#peer-chat-history').textContent.includes('offline scratch')")
    other.locator('#peer-chat-history button[title="Delete post"]').first.click()
    other.wait_for_function('!durableChatBusy && chatOutbox.length === 0')
    page.wait_for_function('!durableChatBusy')
    page.evaluate('syncDurableChat()')
    page.wait_for_function("document.querySelector('#peer-chat-history').textContent.includes('Post deleted')")
    # A delayed translation saving an older array must retain new posts and deletions.
    page.evaluate('''() => {
        const stale = structuredClone(loadAltarChat());
        const newest = { id: 'newest', from: 'local', message: 'newer note', ts: Date.now() + 1 };
        saveAltarChat([...loadAltarChat(), newest]);
        stale.forEach(entry => { entry.deleted = false; entry.message = 'stale translation'; });
        saveAltarChat(stale);
        if (!loadAltarChat().some(entry => entry.id === 'newest')) throw Error('new entry lost');
        if (!loadAltarChat().some(entry => entry.deleted)) throw Error('deleted entry resurrected');
        const many = Array.from({length:350}, (_,i) => ({id:'history-'+i, message:'note '+i, from:'peer', ts:i+1}));
        saveAltarChat(many);
        renderPeerChat();
        const box = document.querySelector('#peer-chat-history');
        box.scrollTop = 80;
        renderPeerChat();
        if (box.scrollTop !== 80) throw Error('reading position lost');
        if (loadAltarChat().length < 350) throw Error('history trimmed');
    }''')
    # Baseline also throws this unrelated session-telemetry error on pagehide.
    assert not [error for error in errors if error != 'splashSheetSource is not defined'], errors
    browser.close()
print('PASS: watch/phone/desktop geometry, invalid-name repair, Settings rename, draft preservation, identity, links, reload, offline queue, fresh-browser recovery, shared deletion')
