const path = require('path')
const glob = require('glob')

// 约定构建出的页面用folder名字，默认入口为每个页面的main.js
const viewPath = glob.sync(path.resolve(__dirname, './src/view/*/'))
const entry = {}
// const titleMap = {
//   index: '圣经真理'
// }

viewPath.forEach((filePath) => {
  const filename = filePath.match(/([^/]+)$/)[1]
  entry[filename] = {
    entry: `${filePath}/main.js`,
    template: `${filePath}/index.html`,
    filename: `${filename}.html`,
    // title可不传，每个页面单独设置
    title: '圣经真理',
    // title: titleMap[filename],
    chunks: ['chunk-vendors', 'chunk-common', filename]
  }
})

module.exports = entry
// exports.entries = () => {}
