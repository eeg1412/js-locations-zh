const fs = require('fs')

// 读取树状JSON文件
console.log('读取location_tree.json...')
const locationTree = JSON.parse(fs.readFileSync('location_tree.json', 'utf8'))

// 构建翻译映射树状结构，使用Map提高效率
console.log('构建翻译映射...')

// 辅助函数：生成Map的字符串表示
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

const translations = new Map()

for (const country in locationTree) {
  const countryMap = new Map()
  countryMap.set('translation', '') // 国家的中文翻译

  for (const province in locationTree[country]) {
    const provinceMap = new Map()
    provinceMap.set('translation', '') // 省的中文翻译

    for (const city of locationTree[country][province]) {
      provinceMap.set(city, '') // 城市的中文翻译
    }

    countryMap.set(province, provinceMap)
  }

  translations.set(country, countryMap)
}

// 生成JS文件内容
const jsContent = `// 英文到中文翻译映射树状结构 (使用Map提高效率)
// 目前中文翻译全部为空字符串，后续可手动填充或通过API获取
// 结构: 国家 -> { translation: "", 省: { translation: "", 城市: "" } }

const translations = ${mapToString(translations)};

module.exports = translations;

`

// 写入JS文件
fs.writeFileSync('translations.js', jsContent)
console.log('翻译映射JS文件已更新: translations.js')

// 输出统计信息
const countryCount = translations.size
let provinceCount = 0
let cityCount = 0

for (const countryMap of translations.values()) {
  for (const [key, value] of countryMap) {
    if (key === 'translation') continue
    provinceCount++
    for (const [cityKey, cityValue] of value) {
      if (cityKey !== 'translation') cityCount++
    }
  }
}

console.log(
  `统计: ${countryCount} 个国家, ${provinceCount} 个省/地区, ${cityCount} 个城市映射`
)
