// Fetches each link in tests/links.txt the same way the Mac app does and checks
// whether the recipe can be read from the page's recipe data (JSON-LD or microdata).
import { readFileSync } from 'node:fs';
import { DOMParser } from 'linkedom';
const html = readFileSync('index.html', 'utf8');
const core = html.split('// ==CORE START==')[1].split('// ==CORE END==')[0];
const { recipesFromJsonLd, recipesFromMicrodata, stripTags } = new Function(core + '\nreturn { recipesFromJsonLd, recipesFromMicrodata, stripTags };')();
const links = readFileSync('tests/links.txt', 'utf8').split('\n').map(s => s.trim()).filter(Boolean);
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36';
const show = (x) => `"${x.title}", ${x.ingredients.length} ingredients, ${x.steps.length} steps, servings ${x.servings ?? '-'}, prep ${x.prepTime || '-'}, cook ${x.cookTime || '-'}. ` +
  `Ingredients: ${x.ingredients.slice(0, 3).map(i => [i.qty, i.unitRaw, i.item].filter(v => v !== null && v !== '').join(' ')).join(' | ')}. Step 1: ${(x.steps[0] || '').slice(0, 70)} || Step 2: ${(x.steps[1] || '').slice(0, 70)}`;
for (const url of links) {
  const host = new URL(url).hostname;
  try {
    const r = await fetch(url, { redirect: 'follow', headers: { 'user-agent': UA, accept: 'text/html,application/xhtml+xml', 'accept-language': 'pl,en;q=0.8,da;q=0.6' } });
    const text = await r.text();
    const ldTags = (text.match(/application\/ld\+json/gi) || []).length;
    const recipeWord = /"@type"\s*:\s*\[?\s*"Recipe"/.test(text);
    const micro = (text.match(/schema\.org\/Recipe/gi) || []).length;
    const ctx = (text.match(/.{0,120}schema\.org\/Recipe.{0,160}/i) || [''])[0].replace(/\s+/g, ' ');
    const ld = recipesFromJsonLd(text);
    const md = recipesFromMicrodata(text, DOMParser);
    let msg = `HTTP ${r.status}, ${Math.round(text.length / 1024)} KB. Diagnostics: ld+json tags ${ldTags}, "@type":"Recipe" ${recipeWord}, schema.org/Recipe mentions ${micro}. `;
    if (ld.length) msg += 'JSON-LD OK: ' + show(ld[0]);
    else if (md.length) msg += 'Microdata OK: ' + show(md[0]);
    else msg += `No recipe data parsed. Page text for AI: ${stripTags(text.replace(/<(script|style|nav|footer|header)[\s\S]*?<\/\1>/gi, ' ')).length} chars`;
    console.log(`::notice title=${host}::${msg.replace(/\n/g, ' ')}`);
    if (!ld.length && !md.length) console.log(`::warning title=${host} context::${ctx}`);
    if (!ld.length && recipeWord) {
      const m = text.match(/<script[^>]*ld\+json[^>]*>([\s\S]*?)<\/script>/gi) || [];
      const rec = m.find(x => /Recipe/.test(x)) || '';
      console.log(`::warning title=${host} raw::${rec.slice(0, 600).replace(/\s+/g, ' ')}`);
    }
  } catch (e) {
    console.log(`::error title=${host}::Fetch failed: ${e.message}`);
  }
}
