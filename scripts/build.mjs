// Static site generator: content/*.json + content/*.html + src/ -> dist/
import { readFile, writeFile, mkdir, cp, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const read = (p) => readFile(path.join(root, p), 'utf8');
const readJson = async (p) => JSON.parse(await read(p));

const esc = (s) =>
  String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// 11.9 -> "11,9 €", 12.5 stays one decimal, 12.55 gets two
const euro = (n) => {
  const d = Math.round(n * 100) % 10 === 0 ? 1 : 2;
  return `${n.toFixed(d).replace('.', ',')} €`;
};

const leaf = (label) =>
  `<svg class="leaf" role="img" aria-label="${esc(label)}"><title>${esc(label)}</title><use href="#leaf"/></svg>`;

const renderItem = (item, legend) => `
        <li class="item">
          <div class="item-main">
            <h3>${esc(item.name)}${item.tag ? ` <small class="tag">(${esc(item.tag)})</small>` : ''}${item.veg ? leaf(legend.veg) : ''}</h3>
            ${item.description ? `<p class="desc">${esc(item.description)}</p>` : ''}
          </div>
          ${item.price != null ? `<div class="item-price">
            ${item.size ? `<span class="size">${esc(item.size)}</span>` : ''}
            <span class="price">${euro(item.price)}</span>
            ${item.extra ? `<span class="extra">${esc(item.extra)}</span>` : ''}
          </div>` : ''}
        </li>`;

const renderSection = (s, legend) => `
      <section class="menu-section" id="${esc(s.id)}" aria-labelledby="${esc(s.id)}-h">
        <h2 id="${esc(s.id)}-h">${esc(s.title)}</h2>
        ${s.items.length ? `<ul class="items${s.items.some((i) => i.size) ? ' has-size' : ''}">${s.items.map((i) => renderItem(i, legend)).join('')}
        </ul>` : ''}
        ${s.note ? `<p class="note">${esc(s.note)}</p>` : ''}
      </section>`;

const renderMenu = (menu) => {
  // Groups (food, drinks) stack on every screen size; columns only apply inside a group on wide screens.
  const groups = [...new Set(menu.sections.map((s) => s.group))];
  const col = (g, n) =>
    menu.sections.filter((s) => s.group === g && (s.column ?? 1) === n).map((s) => renderSection(s, menu.legend)).join('');
  const legend = `<p class="legend">${leaf(menu.legend.veg)} ${esc(menu.legend.veg)}</p>`;
  // The legend goes after the last group.
  return groups
    .map((g, i) => `<div class="menu-columns">
      <div class="menu-col">${col(g, 1)}</div>
      <div class="menu-col">${col(g, 2)}</div>
    </div>${i === groups.length - 1 ? '\n    ' + legend : ''}`)
    .join('\n    ');
};

const fill = (html, site) => html.replace(/\{\{(\w+)\}\}/g, (_, k) => esc(site[k] ?? ''));

const reloadSnippet = `<script>new EventSource('/__reload').onmessage=()=>location.reload()</script>`;

const shell = ({ site, title, description, body, home = false, dev }) => `<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  <meta name="theme-color" content="#fbf9f4">
  <link rel="icon" href="/img/favicon.svg" type="image/svg+xml">
  <link rel="preload" href="/fonts/poppins-latin-500-normal.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="/styles.css">
  ${home ? '' : '<meta name="robots" content="noindex">'}
</head>
<body${home ? ' class="home"' : ''}>
  <svg width="0" height="0" style="position:absolute" aria-hidden="true">
    <symbol id="leaf" viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="currentColor"/><path d="M7 17c0-6 3-9.500 10-10 0 6.500-3.500 10-9 10.200M7 17c2-3.500 4-5.500 6.500-7" fill="none" stroke="#fff" stroke-width="1.600" stroke-linecap="round" stroke-linejoin="round"/></symbol>
  </svg>
${body}
  <footer class="site-footer">
    <div class="rule"></div>
    <p>${esc(site.name)} ${esc(site.tagline)} · ${esc(site.street)} · ${esc(site.zip)} ${esc(site.city)}</p>
    <p class="footer-links"><a href="/impressum.html">Impressum</a> · <a href="/datenschutz.html">Datenschutz</a></p>
  </footer>
  ${dev ? reloadSnippet : ''}
</body>
</html>
`;

const logo = (cls = '') => `<img class="logo ${cls}" src="/img/logo.svg" alt="Amici – Pizza Napoletana" width="880" height="380">`;

const homePage = (site, menu, dev) => {
  const hours = site.hours.map((h) => `<tr><th scope="row">${esc(h.days)}</th><td>${esc(h.time)}</td></tr>`).join('');
  const body = `
  <header class="hero">
    <div class="rule"></div>
    <h1 class="sr-only">${esc(site.name)} – ${esc(site.tagline)}, ${esc(site.city)}</h1>
    ${logo('hero-logo')}
    <p class="hero-sub">Neapolitanische Pizza aus dem Steinofen<br>in ${esc(site.city)}</p>
  </header>
  <main>
    <div class="wrap" id="speisekarte">
    ${renderMenu(menu)}
    </div>
    <section class="info wrap" id="kontakt" aria-labelledby="kontakt-h">
      <div class="rule"></div>
      <div class="info-grid">
        <div>
          <h2 id="kontakt-h">Besuchen Sie uns</h2>
          <address>
            ${esc(site.name)} ${esc(site.tagline)}<br>
            ${esc(site.street)}<br>
            ${esc(site.zip)} ${esc(site.city)}<br><br>
            <a href="tel:${esc(site.phoneHref)}">${esc(site.phone)}</a><br>
            <a href="mailto:${esc(site.email)}">${esc(site.email)}</a>
          </address>
          <p><a class="btn" href="${esc(site.mapsUrl)}" rel="noopener" target="_blank">Anfahrt</a></p>
        </div>
        <div>
          <h2>Öffnungszeiten</h2>
          <table class="hours"><tbody>${hours}</tbody></table>
          ${site.hoursNote ? `<p class="note">${esc(site.hoursNote)}</p>` : ''}
        </div>
      </div>
    </section>
  </main>`;
  return shell({ site, title: `${site.name} – ${site.tagline} in ${site.city}`, description: `Speisekarte von ${site.name} – ${site.tagline} in ${site.city}: Pizze Rosse & Bianche, Vorspeisen, Getränke.`, body, home: true, dev });
};

const legalPage = async (site, file, title, dev) => {
  const content = fill(await read(`content/${file}`), site);
  const body = `
  <header class="legal-head">
    <div class="rule"></div>
    <a href="/" aria-label="Zur Startseite">${logo('small-logo')}</a>
  </header>
  <main class="wrap legal">
    <h1>${esc(title)}</h1>
    ${content}
    <p><a href="/">← Zurück zur Speisekarte</a></p>
  </main>`;
  return shell({ site, title: `${title} – ${site.name}`, description: title, body, dev });
};

export async function build({ dev = false } = {}) {
  const [site, menu] = await Promise.all([readJson('content/site.json'), readJson('content/menu.json')]);
  await rm(dist, { recursive: true, force: true });
  await mkdir(dist, { recursive: true });
  await cp(path.join(root, 'src'), dist, { recursive: true });
  const out = {
    'index.html': homePage(site, menu, dev),
    'impressum.html': await legalPage(site, 'impressum.html', 'Impressum', dev),
    'datenschutz.html': await legalPage(site, 'datenschutz.html', 'Datenschutzerklärung', dev),
  };
  await Promise.all(Object.entries(out).map(([f, c]) => writeFile(path.join(dist, f), c)));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await build();
  console.log('Built → dist/');
}
