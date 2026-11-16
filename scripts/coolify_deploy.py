import urllib.request
import urllib.parse
import http.cookiejar
import json
import re
import time

def deploy_coolify():
    print("🚀 Connecting to Coolify at http://187.7.72.245:8000...")
    cj = http.cookiejar.CookieJar()
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))

    # 1. Login page
    login_page = opener.open('http://187.7.72.245:8000/login').read().decode()
    xsrf = None
    for c in cj:
        if c.name == 'XSRF-TOKEN':
            xsrf = urllib.parse.unquote(c.value)
    
    csrf_match = re.search(r'name=\"csrf-token\"\s+content=\"([^\"]+)\"', login_page)
    csrf_token = csrf_match.group(1) if csrf_match else xsrf

    # 2. Perform Login
    login_data = urllib.parse.urlencode({
        '_token': csrf_token,
        'email': 'yasynnadw2@gmail.com',
        'password': 'YokaStore@2026'
    }).encode()

    req = urllib.request.Request(
        'http://187.7.72.245:8000/login',
        data=login_data,
        headers={
            'X-XSRF-TOKEN': xsrf or '',
            'X-CSRF-TOKEN': csrf_token,
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    )
    login_resp = opener.open(req)
    print("✓ Logged into Coolify successfully (HTTP", login_resp.getcode(), ")")

    # 3. Get Application page
    app_url = 'http://187.7.72.245:8000/project/vep3gznj54pydh1firs1kzvm/environment/cv3pahwgwvxm8txzpl3ag0ty/application/yz5zagja8i9lxsnvbuuufcp8'
    app_html = opener.open(app_url).read().decode()

    # Extract page CSRF
    app_csrf_match = re.search(r'name=\"csrf-token\"\s+content=\"([^\"]+)\"', app_html)
    page_csrf = app_csrf_match.group(1) if app_csrf_match else csrf_token

    # Extract heading snapshot
    heading_snap = None
    for s in re.findall(r'wire:snapshot=\"([^\"]+)\"', app_html):
        raw = s.replace('&quot;', '\"')
        try:
            data = json.loads(raw)
            if data.get('memo', {}).get('name') == 'project.application.heading':
                heading_snap = raw
                break
        except:
            pass

    if not heading_snap:
        print("❌ Could not find project.application.heading snapshot.")
        return False

    print("✓ Found application heading component snapshot (ID:", json.loads(heading_snap)['memo']['id'], ")")

    # Update XSRF from cookies
    for c in cj:
        if c.name == 'XSRF-TOKEN':
            xsrf = urllib.parse.unquote(c.value)

    # 4. Send Livewire 'deploy' call
    payload = json.dumps({
        '_token': page_csrf,
        'components': [
            {
                'snapshot': heading_snap,
                'updates': {},
                'calls': [
                    {
                        'path': '',
                        'method': 'deploy',
                        'params': []
                    }
                ]
            }
        ]
    }).encode('utf-8')

    update_req = urllib.request.Request(
        'http://187.7.72.245:8000/livewire/update',
        data=payload,
        headers={
            'X-CSRF-TOKEN': page_csrf,
            'X-XSRF-TOKEN': xsrf or '',
            'Content-Type': 'application/json',
            'X-Livewire': 'true',
            'Accept': 'application/json'
        }
    )

    try:
        resp = opener.open(update_req)
        res_data = json.loads(resp.read().decode('utf-8'))
        print("✓ Livewire Deploy triggered successfully (HTTP", resp.getcode(), ")")
        
        # Check effects or redirect
        effects = res_data.get('components', [{}])[0].get('effects', {})
        redirect = effects.get('redirect')
        dispatches = effects.get('dispatches', [])
        print("✓ Deployment Details:")
        if redirect:
            print("  - Deployment URL:", redirect)
        if dispatches:
            print("  - Dispatched Events:", [d.get('name') for d in dispatches])
        return True
    except urllib.error.HTTPError as e:
        print("❌ Livewire call failed (HTTP", e.code, "):", e.read().decode('utf-8')[:300])
        return False

if __name__ == '__main__':
    deploy_coolify()
