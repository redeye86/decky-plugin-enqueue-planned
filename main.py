import asyncio
import json
import urllib.request
import decky

# JavaScript executed inside Big-Picture-Modus to click all scheduled download buttons.
_CLICK_SCRIPT = """
(function() {
    const arrows = document.querySelectorAll('[data-rbd-droppable-id="2"] path.DownloadArrow');
    let n = 0;
    for (const a of arrows) {
        const btn = a.closest('button');
        if (btn && !btn.disabled) {
            btn.dispatchEvent(new MouseEvent('click', {bubbles: true, cancelable: true}));
            n++;
        }
    }
    return n;
})()
"""

# JavaScript that injects a persistent "Queue All" button into #Footer
# and keeps it alive via MutationObserver while on the downloads page.
_SETUP_SCRIPT = """
(function() {
    const BTN_ID = 'decky-nqueue-btn';
    const OBS_KEY = '__nqueue_obs__';

    window[OBS_KEY]?.disconnect();
    document.getElementById(BTN_ID)?.remove();

    function clickAll() {
        const arrows = document.querySelectorAll('[data-rbd-droppable-id="2"] path.DownloadArrow');
        let n = 0;
        for (const a of arrows) {
            const btn = a.closest('button');
            if (btn && !btn.disabled) {
                btn.dispatchEvent(new MouseEvent('click', {bubbles: true, cancelable: true}));
                n++;
            }
        }
        return n;
    }

    function ensureButton() {
        if (document.getElementById(BTN_ID)) return;
        if (!document.querySelector('[data-rbd-droppable-id]')) return;
        const btn = document.createElement('button');
        btn.id = BTN_ID;
        const lang = (new URLSearchParams(window.location.search).get('LANGUAGE') || 'english').toLowerCase();
        const labels = {
            german:'\\u2193 Alle geplanten Updates einreihen',
            french:'\\u2193 Mettre en file d\\u2019attente',
            spanish:'\\u2193 Poner en cola las actualizaciones',
            italian:'\\u2193 Metti in coda gli aggiornamenti',
            portuguese:'\\u2193 Adicionar \\u00e0 fila de espera',
            russian:'\\u2193 \\u0414\\u043e\\u0431\\u0430\\u0432\\u0438\\u0442\\u044c \\u0432 \\u043e\\u0447\\u0435\\u0440\\u0435\\u0434\\u044c',
            schinese:'\\u2193 \\u5c06\\u6240\\u6709\\u8ba1\\u5212\\u66f4\\u65b0\\u52a0\\u5165\\u961f\\u5217',
            tchinese:'\\u2193 \\u5c07\\u6240\\u6709\\u8a08\\u756b\\u66f4\\u65b0\\u52a0\\u5165\\u4f47\\u5217',
            japanese:'\\u2193 \\u30ad\\u30e5\\u30fc\\u306b\\u8ffd\\u52a0',
            koreana:'\\u2193 \\ub300\\uae30\\uc5f4\\uc5d0 \\ucd94\\uac00',
            dutch:'\\u2193 Alles in de wachtrij',
            polish:'\\u2193 Dodaj do kolejki',
            turkish:'\\u2193 S\\u0131raya ekle',
            czech:'\\u2193 P\\u0159idat do fronty',
            hungarian:'\\u2193 Sor\\u00e1llj\\u00e1k mind',
            romanian:'\\u2193 Adaug\\u0103 \\u00een coad\\u0103',
            ukrainian:'\\u2193 \\u0414\\u043e\\u0434\\u0430\\u0442\\u0438 \\u0434\\u043e \\u0447\\u0435\\u0440\\u0433\\u0438',
            finnish:'\\u2193 Lis\\u00e4\\u00e4 jonoon',
            swedish:'\\u2193 L\\u00e4gg i k\\u00f6',
            norwegian:'\\u2193 Legg i k\\u00f8',
            danish:'\\u2193 L\\u00e6g i k\\u00f8',
            greek:'\\u2193 \\u03a0\\u03c1\\u03bf\\u03c3\\u03b8\\u03ae\\u03ba\\u03b7 \\u03c3\\u03c4\\u03b7\\u03bd \\u03bf\\u03c5\\u03c1\\u03ac',
            bulgarian:'\\u2193 \\u0414\\u043e\\u0431\\u0430\\u0432\\u044f\\u043d\\u0435 \\u0432 \\u043e\\u043f\\u0430\\u0448\\u043a\\u0430\\u0442\\u0430',
            thai:'\\u2193 \\u0e40\\u0e1e\\u0e34\\u0e48\\u0e21\\u0e43\\u0e19\\u0e04\\u0e34\\u0e27',
        };
        btn.textContent = labels[lang] || '\\u2193 Queue All Planned Updates';
        btn.style.cssText = [
            'position:fixed',
            'bottom:60px',
            'left:50%',
            'transform:translateX(-50%)',
            'z-index:9999',
            'padding:8px 20px',
            'border-radius:8px',
            'border:1px solid rgba(255,255,255,.3)',
            'background:rgba(27,40,56,.97)',
            'color:#fff',
            'font-weight:700',
            'font-size:14px',
            'cursor:pointer',
            'white-space:nowrap',
            'box-shadow:0 2px 12px rgba(0,0,0,.5)',
        ].join(';');
        btn.onclick = () => clickAll();
        document.body.appendChild(btn);
    }

    function refresh() {
        if (document.querySelector('[data-rbd-droppable-id]')) ensureButton();
        else document.getElementById(BTN_ID)?.remove();
    }

    const obs = new MutationObserver(refresh);
    obs.observe(document.body, { childList: true, subtree: true });
    window[OBS_KEY] = obs;
    refresh();
    return 'ok';
})()
"""

_CLEANUP_SCRIPT = """
(function() {
    window['__nqueue_obs__']?.disconnect();
    delete window['__nqueue_obs__'];
    document.getElementById('decky-nqueue-btn')?.remove();
})()
"""


def _find_bigpicture_tab():
    """Find Big-Picture-Modus tab by URL signature — language-independent."""
    try:
        raw = urllib.request.urlopen("http://localhost:8080/json", timeout=3).read()
        tabs = json.loads(raw)
        for t in tabs:
            url = t.get("url", "")
            # The Big Picture window always has this useragent in its URL params
            if "useragent=Valve%20Steam%20Gamepad" in url or "browserType=4" in url:
                return t.get("webSocketDebuggerUrl", "").replace("localhost", "127.0.0.1")
    except Exception as e:
        decky.logger.error(f"[NQueue] tab discovery failed: {e}")
    return None


async def _cdp_eval(ws_url: str, expression: str):
    """Evaluate JavaScript in a tab via CDP WebSocket (uses aiohttp)."""
    try:
        import aiohttp
    except ImportError:
        decky.logger.error("[NQueue] aiohttp not available")
        return None

    try:
        async with aiohttp.ClientSession() as session:
            async with session.ws_connect(ws_url) as ws:
                cmd = json.dumps({"id": 1, "method": "Runtime.evaluate",
                                  "params": {"expression": expression,
                                             "awaitPromise": False,
                                             "returnByValue": True}})
                await ws.send_str(cmd)
                while True:
                    msg = await asyncio.wait_for(ws.receive(), timeout=5)
                    data = json.loads(msg.data)
                    if data.get("id") == 1:
                        result = data.get("result", {}).get("result", {})
                        return result.get("value")
    except Exception as e:
        decky.logger.error(f"[NQueue] CDP eval failed: {e}")
        return None


class Plugin:
    _ws_url: str | None = None

    async def _main(self):
        decky.logger.info("[NQueue] loaded")
        # Give Steam a moment to finish initializing, then inject the footer button.
        await asyncio.sleep(5)
        await self._refresh_ws_url()
        if self._ws_url:
            result = await _cdp_eval(self._ws_url, _SETUP_SCRIPT)
            decky.logger.info(f"[NQueue] setup script result: {result}")

    async def _refresh_ws_url(self):
        self._ws_url = _find_bigpicture_tab()
        decky.logger.info(f"[NQueue] Big-Picture ws_url: {self._ws_url}")

    # Called from frontend: clicks all scheduled download buttons.
    async def enqueue_planned_downloads(self) -> int:
        await self._refresh_ws_url()
        if not self._ws_url:
            decky.logger.error("[NQueue] Big-Picture tab not found")
            return -1
        result = await _cdp_eval(self._ws_url, _CLICK_SCRIPT)
        count = int(result) if isinstance(result, (int, float)) else 0
        decky.logger.info(f"[NQueue] enqueued {count} downloads")
        return count

    # Called from frontend: re-injects the footer button (e.g. after navigation).
    async def setup_footer_button(self) -> bool:
        await self._refresh_ws_url()
        if not self._ws_url:
            return False
        result = await _cdp_eval(self._ws_url, _SETUP_SCRIPT)
        return result == "ok"

    async def _unload(self):
        if self._ws_url:
            await _cdp_eval(self._ws_url, _CLEANUP_SCRIPT)
        decky.logger.info("[NQueue] unloaded")

    async def _uninstall(self):
        decky.logger.info("[NQueue] uninstalled")

    async def _migration(self):
        decky.logger.info("[NQueue] migration")
