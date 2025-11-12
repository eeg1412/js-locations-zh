import { defineConfig } from 'vite'
import fs from 'fs'
import path from 'path'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)

function mapToString(map) {
  const entries = []
  for (const [key, value] of map) {
    if (value instanceof Map) {
      entries.push(`[${JSON.stringify(key)}, ${mapToString(value)}]`)
    } else {
      entries.push(`[${JSON.stringify(key)}, ${JSON.stringify(value)}]`)
    }
  }
  return `new Map([${entries.join(', ')}])`
}

const translations = require('./translations.js')
const countriesDir = 'countries'

if (!fs.existsSync(countriesDir)) {
  fs.mkdirSync(countriesDir)
}

// 生成每个国家的翻译模块文件
for (const [country, countryMap] of translations) {
  const sanitized = country.replace(/[^a-zA-Z0-9]/g, '_')
  const filePath = path.join(countriesDir, `${sanitized}.js`)
  const content = `export default ${mapToString(countryMap)};\n`
  fs.writeFileSync(filePath, content)
}

// 生成主入口文件，提供动态加载功能
const mainContent = `export function getCountryData(country) {
  const sanitized = country.replace(/[^a-zA-Z0-9]/g, '_');
  return import(\`./countries/\${sanitized}.js\`);
}

export function getAllCountries() {
  return ${JSON.stringify(Array.from(translations.keys()))};
}
`
fs.writeFileSync('main.js', mainContent)

export default defineConfig({
  build: {
    lib: {
      entry: 'main.js',
      name: 'js-locations-zh',
      formats: ['es'],
      fileName: 'index.es.js'
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: false
      }
    },
    minify: 'terser'
  }
})
