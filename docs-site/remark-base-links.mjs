/**
 * GitHub Pages serves this project under /dscheck, but the docs are written
 * with root-relative links (/guides/…) so they stay readable as plain markdown
 * and keep working if the site later moves to its own domain. This prefixes
 * them at build time; with an empty base it does nothing.
 */
export function remarkBaseLinks({ base = '' } = {}) {
  const prefix = base.replace(/\/$/, '');
  return (tree) => {
    if (!prefix) return;
    const walk = (node) => {
      if ((node.type === 'link' || node.type === 'definition') && typeof node.url === 'string') {
        if (node.url.startsWith('/') && !node.url.startsWith(`${prefix}/`) && !node.url.startsWith('//')) {
          node.url = `${prefix}${node.url}`;
        }
      }
      for (const child of node.children ?? []) walk(child);
    };
    walk(tree);
  };
}
