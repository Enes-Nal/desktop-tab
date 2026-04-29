const SYSTEM_FONT_STACK = "'Segoe UI', -apple-system, BlinkMacSystemFont, system-ui, sans-serif";
const FONT_LINK_ID = 'desktop-google-font';

export function applyDesktopFont(fontFamily: string) {
  const font = fontFamily === 'system' ? '' : fontFamily.trim();
  const existing = document.getElementById(FONT_LINK_ID);

  if (!font) {
    existing?.remove();
    document.documentElement.style.setProperty('--desktop-font-family', SYSTEM_FONT_STACK);
    return;
  }

  let link = existing as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement('link');
    link.id = FONT_LINK_ID;
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }

  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(font).replace(/%20/g, '+')}&display=swap`;
  document.documentElement.style.setProperty('--desktop-font-family', `'${font.replace(/'/g, "\\'")}', ${SYSTEM_FONT_STACK}`);
}
