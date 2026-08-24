import starlight from '@astrojs/starlight';
import { defineConfig } from 'astro/config';
import starlightLinksValidator from 'starlight-links-validator';
import starlightLlmsTxt from 'starlight-llms-txt';

export default defineConfig({
  site: 'https://dscheck.dev',
  // Q6: inbound links never break — moved pages get a redirect here, forever.
  redirects: {
    '/guides/getting-started/': '/guides/eslint/',
  },
  integrations: [
    starlight({
      plugins: [
        starlightLinksValidator({ errorOnInvalidHashes: true }),
        starlightLlmsTxt({
          projectName: 'dscheck',
          description: 'The linter that knows your design system.',
        }),
      ],
      title: 'dscheck',
      description: 'The linter that knows your design system.',
      lastUpdated: true,
      head: [
        { tag: 'meta', attrs: { property: 'og:image', content: 'https://dscheck.dev/social.png' } },
        { tag: 'meta', attrs: { name: 'twitter:card', content: 'summary_large_image' } },
        {
          tag: 'meta',
          attrs: { name: 'twitter:image', content: 'https://dscheck.dev/social.png' },
        },
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
            { slug: 'guides/why' },
            { slug: 'guides/adoption' },
            { slug: 'guides/agent-guardrail' },
            { slug: 'guides/eslint' },
            { slug: 'guides/stylelint' },
            { slug: 'guides/ci' },
            { slug: 'guides/css-in-js' },
            { slug: 'guides/troubleshooting' },
          ],
        },
        { label: 'Rules', items: [{ autogenerate: { directory: 'rules' } }] },
        { label: 'Recipes', items: [{ autogenerate: { directory: 'recipes' } }] },
        { label: 'Reference', items: [{ autogenerate: { directory: 'reference' } }] },
      ],
    }),
  ],
});
