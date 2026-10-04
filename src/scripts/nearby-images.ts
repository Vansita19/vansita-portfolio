// Let native lazy loading remain the fallback; request nearby imagery before arrival.
const nearby = new IntersectionObserver(entries => {
  for (const entry of entries) {
    if (!entry.isIntersecting) continue;
    const image = entry.target as HTMLImageElement;
    if (!image.getClientRects().length || image.hidden) continue;
    image.loading = 'eager';
    nearby.unobserve(image);
  }
}, { rootMargin: '1800px 0px' });
document.querySelectorAll<HTMLImageElement>('img[loading="lazy"]:not([hidden])').forEach(image => nearby.observe(image));
