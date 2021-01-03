'use strict'
const path = require('path')
const webpack = require('webpack')
const SizePlugin = require('size-plugin') // 打印Webpack资产的gzip大小
const CompressionWebpackPlugin = require('compression-webpack-plugin')
// const TerserPlugin = require('terser-webpack-plugin')
// const VuetifyLoaderPlugin = require('vuetify-loader/lib/plugin')
const productionGzipExtensions = ['js', 'css']
const IS_PROD = ['production', 'prod'].includes(process.env.NODE_ENV)
const entries = require('./entry')

function resolve(dir) {
  return path.join(__dirname, dir)
}

const cdn = {
  css: [
    'https://cdn.jsdelivr.net/npm/google-material-design-icons@1.0.0/icons.min.css',
    'https://cdn.jsdelivr.net/npm/vuetify@2.2.19/dist/vuetify.min.css'
  ],
  js: [
    'https://cdn.jsdelivr.net/npm/vue@2.6.10/dist/vue.min.js',
    'https://cdn.jsdelivr.net/npm/vue-router@3.1.3/dist/vue-router.min.js',
    'https://cdn.jsdelivr.net/npm/vuex@3.1.2/dist/vuex.min.js',
    'https://cdn.jsdelivr.net/npm/axios@0.19.0/dist/axios.min.js',
    'https://cdn.jsdelivr.net/npm/vuetify@2.2.19/dist/vuetify.min.js'
    // 'https://cdn.jsdelivr.net/npm/shaka-player@2.5.9/dist/shaka-player.compiled.min.js'
  ]
}

module.exports = {
  // publicPath: '/res',
  // assetsDir: './',
  pages: entries,
  productionSourceMap: false,
  devServer: {
    proxy: {
      '/api': {
        target: 'http://localhost:8010',
        changeOrigin: true,
        pathRewrite: {
          '^/api': ''
        }
      },
      '/html': {
        target: 'http://localhost/bible',
        changeOrigin: true,
        pathRewrite: {
          '^/html': ''
        }
      },
      '/asset': {
        target: 'http://localhost/asset',
        changeOrigin: true,
        pathRewrite: {
          '^/asset': ''
        }
      },
      '/lyric': {
        target: 'http://localhost/svg',
        changeOrigin: true,
        pathRewrite: {
          '^/lyric': ''
        }
      }
    },
    open: true, // 自动打开浏览器
    disableHostCheck: true
  },
  css: {
    extract: false,
    sourceMap: false
  },
  configureWebpack: {
    resolve: {
      extensions: ['.js', '.vue', '.json'],
      alias: {
        '@': resolve('src'),
        '@as': resolve('src/asset'),
        '@v': resolve('src/view')
      }
    },
    externals: {
      vue: 'Vue',
      'vue-router': 'VueRouter',
      vuex: 'Vuex',
      axios: 'axios',
      vuetify: 'Vuetify'
      // 'shaka-player': 'shaka'
    },
    // 去掉console
    // optimization: {
    //   minimizer: [
    //     new TerserPlugin({
    //       test: /\.js(\?.*)?$/i,
    //       terserOptions: {
    //         compress: {
    //           drop_console: true
    //           // pure_funcs: ['console.log', 'console.info']
    //         }
    //       }
    //     })
    //   ]
    // },
    plugins: [
      // new VuetifyLoaderPlugin(),
      // Ignore all locale files of moment.js
      new webpack.IgnorePlugin(/^\.\/locale$/, /moment$/),
      IS_PROD ? new SizePlugin() : () => {},
      // 配置compression-webpack-plugin压缩
      new CompressionWebpackPlugin({
        algorithm: 'gzip',
        test: new RegExp('\\.(' + productionGzipExtensions.join('|') + ')$'),
        threshold: 1024,
        minRatio: 0.8
      })
    ]
  },
  chainWebpack: config => {
    // 防止多页面打包卡顿
    config.plugins.delete('named-chunks')
    // 修复HMR
    config.resolve.symlinks(true)
    // 多页面cdn添加
    Object.keys(entries).forEach(page => {
      config.plugin(`html-${page}`).tap(args => {
        // html中添加cdn
        args[0].cdn = cdn
        // 修复 Lazy loading routes Error
        args[0].chunksSortMode = 'none'
        args[0].favicon = resolve('src/favicon.png')
        return args
      })
    })

    config.module
      .rule('svg')
      .exclude.add(resolve('src/icons'))
      .end()
    config.module
      .rule('icons')
      .test(/\.svg$/)
      .include.add(resolve('src/icons'))
      .end()
      .use('svg-sprite-loader')
      .loader('svg-sprite-loader')
      .options({
        symbolId: 'icon-[name]'
      })
      .end()
  }
}
