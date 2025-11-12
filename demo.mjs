import { getCountryData, getAllCountries } from './dist/index.es.js.mjs'

async function demo() {
  console.log('Demo: Testing dynamic loading of country translation data')
  console.log('Available countries:', getAllCountries().slice(0, 5), '...') // 显示前5个

  // 测试加载澳大利亚的翻译数据
  console.log('\nLoading Australia translation data...')
  const australiaModule = await getCountryData('Australia')
  const australiaData = australiaModule.default

  console.log('Australia translation structure:')
  console.log('Country translation:', australiaData.get('translation'))
  console.log('Provinces:', Array.from(australiaData.keys()).filter(k => k !== 'translation'))

  // 显示一个省份的翻译
  const queensland = australiaData.get('Queensland')
  console.log('Queensland translation:', queensland.get('translation'))
  console.log('Queensland cities (first 5):', Array.from(queensland.keys()).filter(k => k !== 'translation').slice(0, 5))

  // 模拟使用完毕，清理内存
  console.log('\nCleaning up memory...')
  // 在实际使用中，这里会释放引用
  // australiaData = null

  console.log('Demo completed successfully!')
}

demo().catch(console.error)