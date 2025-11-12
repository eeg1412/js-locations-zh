const fs = require('fs')
const csv = require('csv-parser')

// 使用Map来存储国家 -> 省 -> 城市 的层次结构
const locationTree = new Map()

console.log('开始处理CSV文件...')

fs.createReadStream('IP2LOCATION-LITE-DB3.CSV')
  .pipe(
    csv({
      skipEmptyLines: true,
      headers: false // 没有头部，使用索引
    })
  )
  .on('data', row => {
    // D列: 索引3 (国家), E列: 索引4 (省), F列: 索引5 (市)
    const country = row[3]?.trim()
    const province = row[4]?.trim()
    const city = row[5]?.trim()

    // 跳过空值
    if (!country || !province || !city) return

    // 初始化国家
    if (!locationTree.has(country)) {
      locationTree.set(country, new Map())
    }

    const provinces = locationTree.get(country)

    // 初始化省
    if (!provinces.has(province)) {
      provinces.set(province, new Set())
    }

    // 添加城市
    provinces.get(province).add(city)
  })
  .on('end', () => {
    console.log('CSV处理完成，开始生成JSON...')

    // 转换为普通对象
    const result = {}
    for (const [country, provinces] of locationTree) {
      result[country] = {}
      for (const [province, cities] of provinces) {
        result[country][province] = Array.from(cities).sort()
      }
    }

    // 写入JSON文件
    fs.writeFileSync('location_tree.json', JSON.stringify(result, null, 2))
    console.log('树状结构JSON已生成: location_tree.json')

    // 输出统计信息
    const countryCount = Object.keys(result).length
    const provinceCount = Object.values(result).reduce(
      (sum, provinces) => sum + Object.keys(provinces).length,
      0
    )
    const cityCount = Object.values(result).reduce(
      (sum, provinces) =>
        sum +
        Object.values(provinces).reduce(
          (citySum, cities) => citySum + cities.length,
          0
        ),
      0
    )

    console.log(
      `统计: ${countryCount} 个国家, ${provinceCount} 个省/地区, ${cityCount} 个城市`
    )
  })
  .on('error', error => {
    console.error('处理过程中出错:', error)
  })
