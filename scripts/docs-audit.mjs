// P1: the docs-surface audit — every key surface, both themes, three widths.
// Usage: node scripts/docs-audit.mjs [baseUrl]   (default http://localhost:4322)
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(new URL('../docs-site/package.json', import.meta.url));
const { chromium } = require('playwright');

const base = process.argv[2] ?? 'http://localhost:4322';
const PAGES = [
  ['landing', '/'],
  ['guide', '/guides/agent-guardrail/'],
  ['rule', '/rules/no-raw-color/'],
  ['reference', '/reference/config/'],
  ['brand', '/reference/brand/'],
  ['404', '/definitely-missing/'],
];
const WIDTHS = [['desktop', 1280], ['tablet', 768], ['phone', 390]];

mkdirSync('fixtures/docs-ui', { recursive: true });
const browser = await chromium.launch();
for (const theme of ['light', 'dark']) {
  for (const [wname, width] of WIDTHS) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    await page.emulateMedia({ colorScheme: theme });
    for (const [name, path] of PAGES) {
      await page.goto(`${base}${path}`, { waitUntil: 'networkidle' });
      await page.evaluate((t) => {
        document.documentElement.dataset.theme = t;
        localStorage.setItem('starlight-theme', t);
      }, theme);
      await page.waitForTimeout(150);
      await page.screenshot({
        path: `fixtures/docs-ui/${name}-${theme}-${wname}.png`,
        fullPage: name === 'landing',
      });
    }
    // search modal, desktop only
    if (wname === 'desktop') {
      await page.goto(`${base}/`, { waitUntil: 'networkidle' });
      await page.keyboard.press(process.platform === 'darwin' ? 'Meta+k' : 'Control+k');
      await page.waitForTimeout(300);
      await page.keyboard.type('unknown token');
      await page.waitForTimeout(600);
      await page.screenshot({ path: `fixtures/docs-ui/search-${theme}-desktop.png` });
    }
    await page.close();
  }
}
await browser.close();
console.log('audit screenshots written to fixtures/docs-ui/');
