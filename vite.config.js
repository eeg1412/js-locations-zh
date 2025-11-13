import { defineConfig } from 'vite'
import fs from 'fs'
import path from 'path'
import { createRequire } from 'module'

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

// 检查是否有翻译的辅助函数
function hasTranslations(countryMap) {
  // 检查国家翻译
  if (countryMap.get('translation')) return true
  // 检查省份和城市翻译
  for (const [key, value] of countryMap) {
    if (key === 'translation') continue
    if (value instanceof Map) {
      if (value.get('translation')) return true
      for (const [cityKey, cityValue] of value) {
        if (cityKey !== 'translation' && cityValue) return true
      }
    }
  }
  return false
}

// 过滤有翻译的国家
const filteredTranslations = new Map()
for (const [country, countryMap] of translations) {
  if (hasTranslations(countryMap)) {
    filteredTranslations.set(country, countryMap)
  }
}

// 生成每个国家的翻译模块文件
for (const [country, countryMap] of filteredTranslations) {
  const sanitized = country.replace(/[^a-zA-Z0-9]/g, '_')
  const filePath = path.join(countriesDir, `${sanitized}.js`)
  const content = `export default ${mapToString(countryMap)};\n`
  fs.writeFileSync(filePath, content)
}

// 生成主入口文件，提供动态加载功能
const mainContent = `const allCountries = new Set(${JSON.stringify(
  Array.from(filteredTranslations.keys())
)});

export function getCountryData(country) {
  if (!allCountries.has(country)) {
    throw new Error(\`Country '\${country}' not found in translations\`);
  }
  const sanitized = country.replace(/[^a-zA-Z0-9]/g, '_');
  return import(\`./countries/\${sanitized}.js\`);
}

export function getAllCountries() {
  return Array.from(allCountries);
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
