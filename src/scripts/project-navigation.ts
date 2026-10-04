// Prepare documents and render-blocking styles without intercepting native links.
const prepared = new Set<string>();
const styles = new Set<string>();
const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
const constrained = connection?.saveData || /(^|-)2g$/.test(connection?.effectiveType || '');
const selector = 'a[data-stack-card],a.more-card,a.case-related-link';
async function prepare(link: HTMLAnchorElement) {
  if (link.origin !== location.origin || prepared.has(link.href)) return;
  prepared.add(link.href);
  try {
    const response = await fetch(link.href, { priority: 'low' } as RequestInit);
    if (!response.ok) throw new Error('Page unavailable');
    const source = await response.text();
    // Parse only the head: never instantiate off-screen case-study images or videos.
    const html = new DOMParser().parseFromString(source.split('</head>')[0] + '</head>', 'text/html');
    for (const sheet of html.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"][href]')) {
      const href = new URL(sheet.getAttribute('href')!, link.href).href;
      if (new URL(href).origin !== location.origin || styles.has(href)) continue;
      styles.add(href);
      const preload = document.createElement('link');
      preload.rel = 'preload'; preload.as = 'style'; preload.href = href;
      document.head.append(preload);
    }
  } catch { prepared.delete(link.href); }
}
function intent(event: Event) {
  const link = (event.target as Element)?.closest<HTMLAnchorElement>(selector);
  if (link) void prepare(link);
}
// No preventDefault, artificial timer, or wait before following a clicked link.
for (const event of ['pointerover', 'focusin', 'pointerdown']) document.addEventListener(event, intent, { passive: true });
if (!constrained) {
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const link = entry.target as HTMLAnchorElement;
      // Overlapping desktop cards are not all visible just because their boxes intersect.
      if (getComputedStyle(link).opacity === '0') continue;
      void prepare(link);
      observer.unobserve(link);
    }
  }, { rootMargin: '120px' });
  document.querySelectorAll<HTMLAnchorElement>(selector).forEach(link => observer.observe(link));
}
