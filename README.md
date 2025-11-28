# js-locations-zh

AI 生成的地理位置中文翻译 JS 对照表

## 项目描述

这是一个用于提供地理位置英文到中文翻译对照表的 JavaScript 项目，主要功能包括：

- 基于 IP2Location 数据提取地理位置英文名称
- 生成英文地理位置名称到中文翻译的对照表（目前翻译内容为空，待完善）
- 使用高效的 Map 数据结构存储翻译映射，支持快速查询

**注意：** 该项目目前尚未完成，中文翻译部分需要手动填充或通过 AI/API 自动生成。

⚠️ **重要提醒：** AI 翻译可能存在不准确或错误的情况，请在使用前仔细验证翻译结果的正确性。

## 功能特性

- **翻译对照**：提供英文地理位置名称到中文翻译的对照表
- **高效查询**：使用 Map 数据结构实现快速的翻译查找
- **数据来源**：地理位置英文名称来源于 IP2Location 数据
- **内存优化**：使用 Map 和 Set 数据结构，减少内存占用
- **IndexedDB 缓存**：支持浏览器端 IndexedDB 缓存，加速数据加载并节约内存

## 安装

1. 克隆项目：

```bash
git clone https://github.com/eeg1412/js-locations-zh.git
cd js-locations-zh
```

2. 安装依赖：

```bash
npm install
```

3. 下载 IP2Location 数据：
   - 从 [IP2Location](https://www.ip2location.com/) 下载 LITE DB3 CSV 数据库
   - 将文件重命名为 `IP2LOCATION-LITE-DB3.CSV` 并放置在项目根目录

## 使用方法

### 生成位置树结构

运行以下命令处理 CSV 数据并生成位置层次结构：

```bash
npm start
# 或者直接运行
node process_ip.js
```

这将生成 `location_tree.json` 文件。

### 生成翻译映射文件

运行以下命令生成翻译映射：

```bash
node generate_translations.js
```

这将生成 `translations.js` 文件，其中包含所有地理位置的英文名称，中文翻译字段为空。

### 测试内存使用

运行以下命令查看加载翻译文件后的内存使用情况：

```bash
node test_memory.js
```

## 文件结构

- `process_ip.js` - 主程序，处理 IP2Location CSV 数据
- `generate_translations.js` - 生成翻译映射文件
- `translations.js` - 翻译对照表（英文 -> 中文）
- `location_tree.json` - 地理位置层次结构 JSON
- `test_memory.js` - 内存使用测试脚本
- `package.json` - 项目配置和依赖

## 数据格式

### location_tree.json 格式

```json
{
  "Country": {
    "Province": ["City1", "City2", "City3"]
  }
}
```

### translations.js 格式

```javascript
const translations = new Map([
  [
    'Country',
    new Map([
      ['translation', '国家中文名'],
      [
        'Province',
        new Map([
          ['translation', '省份中文名'],
          ['City1', '城市1中文名'],
          ['City2', '城市2中文名']
        ])
      ]
    ])
  ]
])
```

## 使用方法

本项目提供两种使用方式：直接引用文件和通过 npm 包安装。

### 方式一：直接引用 translations.js 文件

如果您直接克隆或下载了项目文件，可以直接引用 `translations.js` 文件进行翻译查询。

#### 基本用法

```javascript
const translations = require('./translations.js')

// 查询国家翻译
const countryMap = translations.get('China')
const countryTranslation = countryMap.get('translation') // 获取"中国"的翻译

// 查询省份翻译
const provinceMap = countryMap.get('Beijing')
const provinceTranslation = provinceMap.get('translation') // 获取"北京市"的翻译

// 查询城市翻译
const cityTranslation = provinceMap.get('Beijing') // 获取"北京"的翻译
```

#### 完整示例

```javascript
const translations = require('./translations.js')

function getLocationTranslation(country, province, city) {
  const countryMap = translations.get(country)
  if (!countryMap) return { country: '', province: '', city: '' }

  const provinceMap = countryMap.get(province)
  if (!provinceMap) {
    return {
      country: countryMap.get('translation') || '',
      province: '',
      city: ''
    }
  }

  return {
    country: countryMap.get('translation') || '',
    province: provinceMap.get('translation') || '',
    city: provinceMap.get(city) || ''
  }
}

// 使用示例
const result = getLocationTranslation('Australia', 'Queensland', 'Brisbane')
console.log(result) // { country: '澳大利亚', province: '昆士兰州', city: '布里斯班' }
```

### 方式二：通过 npm 包使用

安装包后，可以使用提供的函数进行动态加载，避免一次性加载所有翻译数据。

```bash
npm install js-locations-zh
```

#### 基本用法

```javascript
import { getCountryData, getAllCountries } from 'js-locations-zh'

// 获取所有国家列表
const countries = getAllCountries()

// 动态加载特定国家的翻译数据
const countryData = await getCountryData('China')
const translations = countryData.default

// 查询翻译
const countryTranslation = translations.get('translation') // 国家翻译
const provinceMap = translations.get('Beijing')
const provinceTranslation = provinceMap.get('translation') // 省份翻译
const cityTranslation = provinceMap.get('Beijing') // 城市翻译
```

#### HTML 中的使用示例

```html
<!DOCTYPE html>
<html>
  <head>
    <title>地理位置翻译示例</title>
  </head>
  <body>
    <script type="module">
      import { getCountryData, getAllCountries } from 'js-locations-zh'

      // 获取国家列表
      const countries = getAllCountries()
      console.log('可用国家:', countries)

      // 加载中国数据
      const chinaData = await getCountryData('China')
      const translations = chinaData.default

      // 查询北京的翻译
      const beijingMap = translations.get('Beijing')
      const beijingTranslation = beijingMap.get('translation')
      console.log('北京市翻译:', beijingTranslation)
    </script>
  </body>
</html>
```

### 注意事项

- 如果翻译字段为空字符串，表示该位置的中文翻译尚未填充
- Map 结构支持高效的查找操作
- 建议在使用前检查翻译是否存在（非空字符串）
- npm 方式支持动态加载，适合需要按需加载的场景

### IndexedDB 缓存功能

从版本 1.0.9 开始，本库支持 IndexedDB 缓存功能，可以在浏览器端缓存已加载的翻译数据，提升后续加载速度并节约内存。

#### 缓存特性

- **自动启用**：默认情况下 IndexedDB 缓存已启用
- **版本管理**：缓存版本与包版本挂钩，版本更新时自动清除旧缓存
- **内存优化**：数据写入 IndexedDB 后会自动清理内存中的引用
- **异步处理**：缓存写入在后台异步执行，不影响主线程性能
- **并发控制**：内置防重复加载和写入机制

#### 缓存 API

```javascript
import { 
  getCountryData,
  getAllCountries,
  setUseIndexedDB,
  getUseIndexedDB,
  clearTranslationCache,
  clearAllCache,
  getCacheVersionInfo,
  closeCache,
  preloadCountries
} from 'js-locations-zh'

// 禁用/启用 IndexedDB 缓存
setUseIndexedDB(false) // 禁用
setUseIndexedDB(true)  // 启用

// 检查缓存是否启用
console.log('缓存启用:', getUseIndexedDB())

// 获取缓存版本
console.log('缓存版本:', getCacheVersionInfo())

// 清除翻译缓存（保留版本信息）
await clearTranslationCache()

// 清除所有缓存（包括版本信息）
await clearAllCache()

// 预加载多个国家到缓存
const result = await preloadCountries(['China', 'Japan', 'Australia'])
console.log('成功:', result.success)
console.log('失败:', result.failed)

// 关闭缓存连接（清理资源）
closeCache()
```

#### 缓存工作流程

1. 调用 `getCountryData(country)` 时，首先检查 IndexedDB 缓存
2. 如果缓存命中，直接返回缓存数据
3. 如果缓存未命中，通过动态导入加载模块
4. 加载完成后，在后台异步将数据写入 IndexedDB
5. 写入完成后自动清理内存中的引用

## 待完善功能

- [ ] 填充中文翻译内容（目前全部为空字符串）
- [ ] 集成 AI 翻译 API 自动生成翻译
- [ ] 添加翻译验证和纠错功能（验证 AI 翻译准确性）
- [ ] 支持增量更新翻译
- [ ] 添加搜索和查询功能

## 贡献

欢迎提交 Issue 和 Pull Request 来完善中文翻译内容！

## 许可证

请查看 [LICENSE](LICENSE) 文件了解许可证信息。

## 相关链接

- [IP2Location](https://www.ip2location.com/) - IP 地理位置数据库提供商
