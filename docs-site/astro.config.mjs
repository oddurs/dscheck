import starlight from '@astrojs/starlight';
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://dscheck.dev',
  integrations: [
    starlight({
      title: 'dscheck',
      description: 'The linter that knows your design system.',
      customCss: ['./src/styles/tokens.css', './src/styles/custom.css'],
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
