import { mkdir, rename, writeFile } from 'node:fs/promises';

// Refresh saved cards, so profile visitors always receive the last valid SVG.
const common = {
  username: 'Pablo-Rf8',
  locale: 'es',
  bg_color: '0D1117',
  title_color: '38BDF8',
  text_color: 'C9D1D9',
  border_color: '243B53',
  border_radius: '16',
  card_width: '440',
};
const cards = [
  {
    path: 'assets/github-stats.svg',
    endpoint: 'https://github-readme-stats.vercel.app/api',
    options: {
      ...common,
      show_icons: 'true',
      hide_rank: 'true',
      hide: 'contribs',
      icon_color: '5EEAD4',
      custom_title: 'Actividad de Pablo-Rf8',
    },
  },
  {
    path: 'assets/top-languages.svg',
    endpoint: 'https://github-readme-stats.vercel.app/api/top-langs/',
    options: {
      ...common,
      layout: 'compact',
      langs_count: '6',
      custom_title: 'Lenguajes en mis repositorios',
    },
  },
];

const failedCard = /something went wrong|could not fetch|api rate limit|maximum retries|could not resolve|resource not accessible|please deploy your own/i;

async function refresh(card) {
  const url = new URL(card.endpoint);
  url.search = new URLSearchParams(card.options).toString();
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { Accept: 'image/svg+xml', 'User-Agent': 'Pablo-Rf8-profile-cards' },
        signal: AbortSignal.timeout(20000),
      });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const svg = (await response.text()).replace(/[ \t]+$/gm, '').trimEnd() + '\n';
      if (!/<svg\b/.test(svg) || !/<text\b/.test(svg) || svg.length < 1000 || failedCard.test(svg)) {
        throw new Error('The service returned an invalid or error SVG');
      }
      const temporaryPath = card.path + '.tmp';
      await writeFile(temporaryPath, svg, 'utf8');
      await rename(temporaryPath, card.path);
      console.log('Updated ' + card.path);
      return true;
    } catch (error) {
      console.warn(card.path + ' attempt ' + attempt + ': ' + error.message);
      if (attempt < 3) await new Promise(resolve => setTimeout(resolve, attempt * 1500));
    }
  }
  console.warn('Keeping the last successful version of ' + card.path);
  return false;
}

await mkdir('assets', { recursive: true });
const results = await Promise.all(cards.map(refresh));
if (!results.some(Boolean)) {
  throw new Error('Neither public card could be refreshed; saved cards were preserved');
}
