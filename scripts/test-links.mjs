// Fetches each link in tests/links.txt the same way the Mac app does and checks
// whether the recipe can be read from the page's recipe data (schema.org JSON-LD).
import { readFileSync } from 'node:fs';
const html = readFileSync('index.html', 'utf8');
const core = html.split('// ==CORE START==')[1].split('// ==CORE END==')[0];
const { recipesFromJsonLd, stripTags } = new Function(core + '\nreturn { recipesFromJsonLd, stripTags };')();
const links = readFileSync('tests/links.txt', 'utf8').split('\n').map(s => s.trim()).filter(Boolean);
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36';
for (const url of links) {
  const host = new URL(url).hostname;
  try {
    const r = await fetch(url, { redirect: 'follow', headers: { 'user-agent': UA, accept: 'text/html,application/xhtml+xml', 'accept-language': 'pl,en;q=0.8,da;q=0.6' } });
    const text = await r.text();
    const ld = r.ok ? recipesFromJsonLd(text) : [];
    const plain = stripTags(text.replace(/<(script|style|nav|footer|header)[\s\S]*?<\/\1>/gi, ' '));
    let msg = `HTTP ${r.status}, ${Math.round(text.length / 1024)} KB. `;
    if (ld.length) {
      const x = ld[0];
      msg += `Recipe data FOUND: "${x.title}", ${x.ingredients.length} ingredients, ${x.steps.length} steps, servings ${x.servings ?? '-'}, prep ${x.prepTime || '-'}, cook ${x.cookTime || '-'}. ` +
        `First ingredients: ${x.ingredients.slice(0, 3).map(i => [i.qty, i.unitRaw, i.item].filter(v => v !== null && v !== '').join(' ')).join(' | ')}. First step: ${(x.steps[0] || '').slice(0, 90)}`;
    } else {
      msg += `No recipe data. Page text for AI: ${plain.length} characters` + (r.ok ? '' : ' (page refused)');
    }
    console.log(`::notice title=${host}::${msg.replace(/\n/g, ' ')}`);
  } catch (e) {
    console.log(`::error title=${host}::Fetch failed: ${e.message}`);
  }
}
