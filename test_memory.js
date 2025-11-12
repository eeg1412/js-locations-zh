const translations = require('./translations.js')

// 获取内存使用情况
const memUsage = process.memoryUsage()

console.log('内存使用情况 (单位: 字节):')
console.log(
  `RSS (Resident Set Size): ${memUsage.rss} bytes (${(
    memUsage.rss /
    1024 /
    1024
  ).toFixed(2)} MB)`
)
console.log(
  `堆总大小 (Heap Total): ${memUsage.heapTotal} bytes (${(
    memUsage.heapTotal /
    1024 /
    1024
  ).toFixed(2)} MB)`
)
console.log(
  `堆使用大小 (Heap Used): ${memUsage.heapUsed} bytes (${(
    memUsage.heapUsed /
    1024 /
    1024
  ).toFixed(2)} MB)`
)
console.log(
  `外部内存 (External): ${memUsage.external} bytes (${(
    memUsage.external /
    1024 /
    1024
  ).toFixed(2)} MB)`
)

// 计算Map的大小（估算）
let totalEntries = 0
for (const [country, countryMap] of translations) {
  totalEntries++ // 国家
  for (const [key, value] of countryMap) {
    if (key === 'translation') continue
    totalEntries++ // 省
    for (const [cityKey, cityValue] of value) {
      if (cityKey !== 'translation') totalEntries++ // 城市
    }
  }
}

console.log(`\n数据统计:`)
console.log(`总条目数: ${totalEntries}`)
console.log(`国家数: ${translations.size}`)

// 估算内存占用（粗略）
const estimatedMemory = totalEntries * 100 // 假设每个条目平均100字节
console.log(`估算内存占用: ${(estimatedMemory / 1024 / 1024).toFixed(2)} MB`)
