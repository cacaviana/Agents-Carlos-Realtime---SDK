import adapter from '@sveltejs/adapter-node';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter({
			out: 'build' // ou outro nome, mas 'build' é o mais comum no Azure
		})
	}
};

export default config;
