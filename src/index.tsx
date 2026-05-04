import { ButtonItem, PanelSection, PanelSectionRow, staticClasses } from "@decky/ui";
import { definePlugin, toaster, executeInTab } from "@decky/api";
import { useCallback, useState } from "react";
import { FaDownload } from "react-icons/fa";

// All DOM manipulation runs inside the "SP" tab (main Steam UI context) via executeInTab.
// The plugin itself runs in an isolated Decky context and cannot access the Steam DOM directly.

const SP_TAB = "SP";

// Injected once at plugin load: sets up a MutationObserver in the Steam UI
// that shows/hides the footer button as the user navigates to/from the downloads page.
const SETUP_SCRIPT = `(function() {
  const BTN_ID = 'decky-nqueue-btn';
  const OBS_KEY = '__nqueue_obs__';

  window[OBS_KEY]?.disconnect();
  document.getElementById(BTN_ID)?.remove();

  function clickDownloads() {
    const arrows = document.querySelectorAll('[data-rbd-droppable-id] path.DownloadArrow');
    let n = 0;
    for (const a of arrows) {
      const btn = a.closest('button');
      if (btn && !btn.disabled) { btn.click(); n++; }
    }
    return n;
  }

  function ensureButton() {
    if (document.getElementById(BTN_ID)) return;
    const footer = document.getElementById('Footer');
    if (!footer) return;
    if (!document.querySelector('[data-rbd-droppable-id]')) return;

    const btn = document.createElement('button');
    btn.id = BTN_ID;
    btn.textContent = '\\u2193 Queue All';
    btn.style.cssText = [
      'margin-left:10px',
      'padding:4px 14px',
      'border-radius:6px',
      'border:1px solid rgba(255,255,255,.3)',
      'background:rgba(27,40,56,.95)',
      'color:#fff',
      'font-weight:700',
      'font-size:13px',
      'cursor:pointer',
      'height:32px',
      'z-index:9999',
      'align-self:center',
      'flex-shrink:0',
    ].join(';');
    btn.onclick = () => clickDownloads();
    footer.appendChild(btn);
  }

  function refresh() {
    if (document.querySelector('[data-rbd-droppable-id]')) {
      ensureButton();
    } else {
      document.getElementById(BTN_ID)?.remove();
    }
  }

  const obs = new MutationObserver(refresh);
  obs.observe(document.body, { childList: true, subtree: true });
  window[OBS_KEY] = obs;
  refresh();
  return 'ok';
})()`;

const CLEANUP_SCRIPT = `(function() {
  window['__nqueue_obs__']?.disconnect();
  delete window['__nqueue_obs__'];
  document.getElementById('decky-nqueue-btn')?.remove();
})()`;

const ENQUEUE_SCRIPT = `(function() {
  const arrows = document.querySelectorAll('[data-rbd-droppable-id] path.DownloadArrow');
  let n = 0;
  for (const a of arrows) {
    const btn = a.closest('button');
    if (btn && !btn.disabled) { btn.click(); n++; }
  }
  return n;
})()`;

const DEBUG_SCRIPT = `(function() {
  const lists = Array.from(document.querySelectorAll('[data-rbd-droppable-id]'));
  return JSON.stringify({
    url: window.location.href,
    hasFooter: !!document.getElementById('Footer'),
    hasPopupTarget: !!document.getElementById('popup_target'),
    droppableLists: lists.map(l => ({
      id: l.getAttribute('data-rbd-droppable-id'),
      listitems: l.querySelectorAll('[role="listitem"]').length,
      downloadArrows: l.querySelectorAll('path.DownloadArrow').length,
    })),
  }, null, 2);
})()`;

async function runInSP(code: string): Promise<{ success: boolean; result: unknown }> {
  return executeInTab(SP_TAB, false, code);
}

async function enqueuePlannedDownloads(): Promise<void> {
  const res = await runInSP(ENQUEUE_SCRIPT);
  if (!res.success) {
    toaster.toast({ title: "NQueue", body: "Fehler: Steam-Tab nicht erreichbar.", duration: 5000 });
    return;
  }
  const count = res.result as number;
  toaster.toast({
    title: "NQueue",
    body: count > 0
      ? `${count} geplante Downloads eingereiht.`
      : "Keine geplanten Downloads gefunden.",
    duration: 5000,
  });
}

function Content() {
  const [debugText, setDebugText] = useState<string>("Noch kein Debug-Output.");

  const onRun = useCallback(async () => {
    await enqueuePlannedDownloads();
  }, []);

  const onDebug = useCallback(async () => {
    const res = await runInSP(DEBUG_SCRIPT);
    const text = res.success
      ? `Tab erreichbar.\n${res.result as string}`
      : `Tab NICHT erreichbar.\n${JSON.stringify(res)}`;
    setDebugText(text);
    toaster.toast({ title: "NQueue", body: "Debug aktualisiert.", duration: 3000 });
  }, []);

  return (
    <PanelSection title="NQueue">
      {__SHOW_BUILD_DATE__ && (
        <PanelSectionRow>
          <div style={{ fontSize: "10px", opacity: 0.5, fontFamily: "monospace" }}>
            Build: {__BUILD_DATE__}
          </div>
        </PanelSectionRow>
      )}
      <PanelSectionRow>
        <ButtonItem layout="below" onClick={onRun}>
          Alle geplanten Updates einreihen
        </ButtonItem>
      </PanelSectionRow>
      <PanelSectionRow>
        <ButtonItem layout="below" onClick={onDebug}>
          Debug-Analyse
        </ButtonItem>
      </PanelSectionRow>
      <PanelSectionRow>
        <div
          style={{
            width: "100%",
            minHeight: "220px",
            maxHeight: "360px",
            overflowY: "auto",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            background: "rgba(0,0,0,0.35)",
            border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: "8px",
            padding: "10px",
            fontFamily: "monospace",
            fontSize: "11px",
            lineHeight: 1.35,
          }}
        >
          {debugText}
        </div>
      </PanelSectionRow>
    </PanelSection>
  );
}

export default definePlugin(() => {
  // Inject button + observer into the Steam UI tab
  runInSP(SETUP_SCRIPT).catch((e) =>
    console.error("[NQueue] setup failed", e)
  );

  return {
    name: "NQueue",
    titleView: <div className={staticClasses.Title}>NQueue</div>,
    content: <Content />,
    icon: <FaDownload />,
    onDismount() {
      runInSP(CLEANUP_SCRIPT).catch((e) =>
        console.error("[NQueue] cleanup failed", e)
      );
    },
  };
});
