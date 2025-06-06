import adapter from '@sveltejs/adapter-node';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  kit: {
    adapter: adapter({
      out: 'build' // importante: esse é o diretório que o Azure vai executar com `node build`
    })
  }
};

export default config;
