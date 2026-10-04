# Vansita Addanki · Portfolio

**Product design, brought to life in code.**

[Visit the live portfolio →](https://vansita.design) · [Explore the playground](https://vansita.design/playground) · [View my resume](https://vansita.design/assets/vansita-addanki-resume.pdf)

I'm Vansita, a product designer working across AI-native products and B2B SaaS. I take ideas from product direction and UX through visual design, motion, and frontend implementation. This repository contains the source for my personal portfolio.

## What's inside

- **Selected work:** ten case studies across product design, brand, and complex workflows.
- **Interactive flower hero:** a custom WebGL animation alongside accessible HTML content.
- **A day at my desk:** a scroll-controlled day-to-night scene that transitions into a readable About section.
- **Playground:** a draggable gallery of interface and visual experiments, with keyboard navigation and a mobile layout.
- **Responsive details:** lightweight phone covers, deferred video loading, testimonials, and a dynamic navigation menu.

## Built with

Astro, TypeScript, CSS, GSAP, WebGL, and Sharp. The site builds to static HTML; Vercel hosts the live portfolio. Content and case studies live in local JSON files, with no CMS or API keys required to run it.

## Run locally

Use Node.js 22 and npm.

```sh
git clone https://github.com/Vansita19/vansita-portfolio.git
cd vansita-portfolio
npm ci
npm run dev
```

Open **http://127.0.0.1:4324**. The repository includes the portfolio's media, so the initial clone is larger than a code-only project.

```sh
npm run build    # Generate static pages and responsive images
npm run verify   # Check routes, asset references, and mobile media budgets
npm run preview  # Preview the production build locally
```

Image optimization runs during the build and can take a few minutes.

## A few implementation decisions

**Readable HTML throughout.** Headings, project descriptions, and the About section remain real page content rather than flattened screenshots.

**Motion with a lighter mobile path.** Desktop gets the interactive desk and laptop transition. Phones use a single foreground image over a video, avoiding the cost and alignment problems of many animated layers.

**Video prepared for scrolling.** The desktop day-to-night video uses independently seekable frames. Seeking is quantized to the video frame rate, with one seek in flight at a time.

**Media sized for its context.** Phone project covers use 400px and 640px WebP variants at quality 40. Featured videos load when they enter view; build-time image processing generates responsive variants for other images.

## Find your way around

| Location | Purpose |
| --- | --- |
| `src/pages/` | Homepage, playground, and case study routes |
| `src/components/BloomHome.astro` | Main homepage composition |
| `src/components/AnimatedAboutDesk.astro` | Desk scene and About content |
| `src/scripts/portfolio-about-zoom.ts` | Scroll, video seeking, and laptop transition |
| `src/scripts/bloom.ts` | Flower rendering and interaction |
| `src/data/` | Project copy, gallery items, and media mappings |
| `src/styles/` | Shared typography and layouts |
| `integrations/optimized-images.mjs` | Build-time responsive image generation |
| `scripts/` | Media preparation and verification |
| `public/assets/` | Images, fonts, videos, and resume |

GitHub Actions builds and verifies changes. Publishing the live site is managed separately.

## Content and credits

This is my personal portfolio, shared for reviewing my design and implementation work. Client work, project imagery, personal photography, fonts, and third-party assets retain their respective ownership and licenses. Their inclusion here does not grant permission to reuse them. Third-party license notices are retained with the assets.
