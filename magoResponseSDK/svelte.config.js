
import adapter from '@sveltejs/adapter-static';

/** @type {import('@sveltejs/kit').Config} */
const config = {
   onwarn: (warning, handler) => {
    // suppress warnings on `vite dev` and `vite build`; but even without this, things still work
    if (warning.code === "a11y-click-events-have-key-events") return;
    if (warning.code === "a11y-no-static-element-interactions") return;
    handler(warning);
  },
  kit: {
    // adapter-auto only supports some environments, see https://kit.svelte.dev/docs/adapter-auto for a list.
    // If your environment is not supported, or you settled on a specific environment, switch out the adapter.
    // See https://kit.svelte.dev/docs/adapters for more information about adapters.
    adapter: adapter({
      pages: 'build',
      assets: 'build',
      fallback: 'index.html',  // this line tells Svelte to use `index.html` as a fallback for dynamic routes
      precompress: false,
      strict: true,
    }),
    paths: {
      base: '',  // Set base URL here : /svelte/ynex/preview
    },
  }
};

export default config;