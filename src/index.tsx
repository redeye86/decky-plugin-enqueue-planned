import { PanelSection, PanelSectionRow, staticClasses } from "@decky/ui";
import { call, definePlugin, routerHook } from "@decky/api";
import { ReactElement } from "react";

// Three stacked download arrows: front solid, middle semi-transparent, back outline.
function NQueueIcon() {
  const arrow = "M16 7L16 18L12 18L18 25L24 18L20 18L20 7Z";
  const base  = "M10 27L26 27L26 30L10 30Z";
  return (
    <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Back — outline only */}
      <g transform="translate(0,-8)" opacity="0.35"
         stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round">
        <path d={arrow}/><path d={base}/>
      </g>
      {/* Middle — semi-transparent fill */}
      <g transform="translate(0,-4)" opacity="0.6" fill="currentColor">
        <path d={arrow}/><path d={base}/>
      </g>
      {/* Front — solid */}
      <g fill="currentColor">
        <path d={arrow}/><path d={base}/>
      </g>
    </svg>
  );
}

// Re-injects the footer button via backend (e.g. after navigation).
async function setupFooterButton(): Promise<void> {
  await call<[], boolean>("setup_footer_button");
}

// Patches the downloads route so we can trigger footer-button setup on navigation.
// The visual button lives in Big-Picture-Modus (injected via Python/CDP backend).
function patchDownloadsPage(): () => void {
  const routePatch = routerHook.addPatch(
    "/library/downloads",
    (props: { path: string; children: ReactElement } & Record<string, unknown>) => {
      // Route became active — ask backend to ensure the footer button exists.
      setupFooterButton().catch((e) => console.warn("[NQueue] setup footer failed", e));
      return props;
    }
  );
  return () => routerHook.removePatch("/library/downloads", routePatch);
}

function Content() {
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
        <div style={{ fontSize: "13px", lineHeight: 1.5, opacity: 0.85 }}>
          Öffne die <strong>Download-Seite</strong> in Steam — dort erscheint ein schwebender Button, um alle geplanten Updates auf einmal in die Warteschlange einzureihen.
        </div>
      </PanelSectionRow>
    </PanelSection>
  );
}

export default definePlugin(() => {
  const unpatch = patchDownloadsPage();
  return {
    name: "NQueue",
    titleView: <div className={staticClasses.Title}>NQueue</div>,
    content: <Content />,
    icon: <NQueueIcon />,
    onDismount() {
      unpatch();
    },
  };
});
