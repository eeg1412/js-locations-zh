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

// 检查省份是否有翻译的辅助函数
function hasProvinceTranslations(provinceMap) {
  // 检查省份翻译
  if (provinceMap.get('translation')) return true
  // 检查城市翻译
  for (const [key, value] of provinceMap) {
    if (key !== 'translation' && value) return true
  }
  return false
}

// 过滤有翻译的国家和省份
const filteredTranslations = new Map()
const countryProvinces = new Map()

for (const [country, countryMap] of translations) {
  const provinces = new Map()
  for (const [key, value] of countryMap) {
    if (key === 'translation') continue
    if (value instanceof Map && hasProvinceTranslations(value)) {
      provinces.set(key, value)
    }
  }
  if (provinces.size > 0 || countryMap.get('translation')) {
    filteredTranslations.set(country, countryMap)
    countryProvinces.set(country, Array.from(provinces.keys()))
  }
}

// 生成每个国家的目录和省份模块文件
for (const [country, countryMap] of filteredTranslations) {
  const sanitizedCountry = country.replace(/[^a-zA-Z0-9]/g, '_')
  const countryDir = path.join(countriesDir, sanitizedCountry)
  if (!fs.existsSync(countryDir)) {
    fs.mkdirSync(countryDir, { recursive: true })
  }

  for (const [province, provinceMap] of countryMap) {
    if (province === 'translation') continue
    if (hasProvinceTranslations(provinceMap)) {
      const sanitizedProv = province.replace(/[^a-zA-Z0-9]/g, '_')
      const filePath = path.join(countryDir, `${sanitizedProv}.js`)
      const content = `export default ${mapToString(provinceMap)};\n`
      fs.writeFileSync(filePath, content)
    }
  }
}

// 生成主入口文件，提供动态加载功能
const mainContent = `const allCountries = new Set(${JSON.stringify(
  Array.from(filteredTranslations.keys())
)});
const countryProvinces = new Map(${JSON.stringify(
  Array.from(countryProvinces.entries())
)});
const countryTranslations = new Map(${JSON.stringify(
  Array.from(filteredTranslations.entries()).map(([c, m]) => [
    c,
    m.get('translation')
  ])
)});

export function getCountryData(country) {
  if (!allCountries.has(country)) {
    throw new Error(\`Country '\${country}' not found in translations\`);
  }
  const sanitized = country.replace(/[^a-zA-Z0-9]/g, '_');
  const provinces = countryProvinces.get(country);
  const promises = provinces.map(province => {
    const sanitizedProv = province.replace(/[^a-zA-Z0-9]/g, '_');
    return import(\`./countries/\${sanitized}/\${sanitizedProv}.js\`).then(module => [province, module.default]);
  });
  return Promise.all(promises).then(entries => {
    const countryMap = new Map();
    countryMap.set('translation', countryTranslations.get(country));
    entries.forEach(([prov, provMap]) => countryMap.set(prov, provMap));
    return { default: countryMap };
  });
}

export function getProvinceData(country, province) {
  if (!allCountries.has(country)) {
    throw new Error(\`Country '\${country}' not found in translations\`);
  }
  const provinces = countryProvinces.get(country);
  if (!provinces.includes(province)) {
    throw new Error(\`Province '\${province}' not found in country '\${country}'\`);
  }
  const sanitized = country.replace(/[^a-zA-Z0-9]/g, '_');
  const sanitizedProv = province.replace(/[^a-zA-Z0-9]/g, '_');
  return import(\`./countries/\${sanitized}/\${sanitizedProv}.js\`);
}

export function getAllCountries() {
  return Array.from(allCountries);
}

export function getAllProvinces(country) {
  if (!allCountries.has(country)) {
    throw new Error(\`Country '\${country}' not found in translations\`);
  }
  return Array.from(countryProvinces.get(country));
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
