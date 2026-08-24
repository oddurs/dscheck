import starlight from '@astrojs/starlight';
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://dscheck.dev',
  integrations: [
    starlight({
      title: 'dscheck',
      description: 'The linter that knows your design system.',
      lastUpdated: true,
      editLink: { baseUrl: 'https://github.com/oddurs/dscheck/edit/main/docs-site/' },
      head: [
        { tag: 'meta', attrs: { property: 'og:image', content: 'https://dscheck.dev/social.png' } },
        { tag: 'meta', attrs: { name: 'twitter:card', content: 'summary_large_image' } },
        { tag: 'meta', attrs: { name: 'twitter:image', content: 'https://dscheck.dev/social.png' } },
      ],
      customCss: ['./src/styles/tokens.css', './src/styles/custom.css'],
      favicon: '/favicon.svg',
      logo: {
        light: './src/assets/wordmark-light.svg',
        dark: './src/assets/wordmark-dark.svg',
        replacesTitle: true,
        alt: 'dscheck',
      },
      social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/oddurs/dscheck' }],
      sidebar: [
        {
          label: 'Start here',
          items: [
            { slug: 'guides/agent-guardrail' },
            { slug: 'guides/eslint' },
            { slug: 'guides/stylelint' },
            { slug: 'guides/ci' },
          ],
        },
        { label: 'Rules', items: [{ autogenerate: { directory: 'rules' } }] },
        { label: 'Recipes', items: [{ autogenerate: { directory: 'recipes' } }] },
        { label: 'Reference', items: [{ autogenerate: { directory: 'reference' } }] },
      ],
    }),
  ],
});
