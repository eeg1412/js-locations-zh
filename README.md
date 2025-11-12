# js-locations-zh

AI 生成的地理位置中文翻译 JS 对照表

## 项目描述

这是一个用于处理 IP2Location 数据的 JavaScript 项目，主要功能包括：

- 从 IP2Location CSV 数据库生成地理位置的层次结构 JSON 文件
- 生成英文地理位置名称到中文翻译的对照表（目前翻译内容为空，待完善）
- 使用高效的 Map 数据结构存储翻译映射

**注意：** 该项目目前尚未完成，中文翻译部分需要手动填充或通过 AI/API 自动生成。

⚠️ **重要提醒：** AI 翻译可能存在不准确或错误的情况，请在使用前仔细验证翻译结果的正确性。

## 功能特性

- **数据处理**：解析 IP2LOCATION-LITE-DB3.CSV 文件，提取国家、省份、城市信息
- **层次结构**：构建国家 -> 省份 -> 城市的树状结构
- **翻译映射**：生成英文到中文的翻译对照表，使用 Map 提高查找效率
- **内存优化**：使用 Map 和 Set 数据结构，减少内存占用

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

## 使用 translations.js

`translations.js` 文件导出了一个 Map 对象，您可以在代码中使用它来进行地理位置的中文翻译查询。

### 基本用法

```javascript
const translations = require('./translations.js')

// 查询国家翻译
const chinaMap = translations.get('China')
const chinaTranslation = chinaMap.get('translation') // 获取"中国"的翻译

// 查询省份翻译
const beijingMap = chinaMap.get('Beijing')
const beijingTranslation = beijingMap.get('translation') // 获取"北京市"的翻译

// 查询城市翻译
const cityTranslation = beijingMap.get('Beijing') // 获取"北京"的翻译
```

### 完整示例

```javascript
const translations = require('./translations.js')

function getLocationTranslation(country, province, city) {
  const countryMap = translations.get(country)
  if (!countryMap) return { country: '', province: '', city: '' }

  const provinceMap = countryMap.get(province)
  if (!provinceMap)
    return {
      country: countryMap.get('translation') || '',
      province: '',
      city: ''
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

### 注意事项

- 如果翻译字段为空字符串，表示该位置的中文翻译尚未填充
- Map 结构支持高效的查找操作
- 建议在使用前检查翻译是否存在（非空字符串）

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
