import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    lib: {
      entry: 'translations.js',
      name: 'js-locations-zh',
      formats: ['es', 'cjs'],
      fileName: format => `translations.${format}.js`
    },
    minify: 'terser'
  }
})
