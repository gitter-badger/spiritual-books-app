import lan from '@/lang'
export function hasSuffix(str, target) {
  const start = str.length - target.length
  const arr = str.substr(start, target.length)
  if (arr === target) {
    return true
  }
  return false
}

export function parseTime(time, cFormat) {
  if (arguments.length === 0) {
    return null
  }
  const format = cFormat || '{y}-{m}-{d} {h}:{i}:{s}'
  let date
  if (typeof time === 'object') {
    date = time
  } else {
    if (('' + time).length === 10) time = parseInt(time) * 1000
    date = new Date(time)
  }
  const formatObj = {
    y: date.getFullYear(),
    m: date.getMonth() + 1,
    d: date.getDate(),
    h: date.getHours(),
    i: date.getMinutes(),
    s: date.getSeconds(),
    a: date.getDay()
  }
  const time_str = format.replace(/{(y|m|d|h|i|s|a)+}/g, (result, key) => {
    let value = formatObj[key]
    if (key === 'a') return ['一', '二', '三', '四', '五', '六', '日'][value - 1]
    if (result.length > 0 && value < 10) {
      value = '0' + value
    }
    return value || 0
  })
  return time_str
}

export function formatTime(time, option) {
  time = time * 1000
  const d = new Date(time)
  const now = Date.now()

  const diff = (now - d) / 1000

  if (diff < 30) {
    return '刚刚'
  } else if (diff < 3600) { // less 1 hour
    return Math.ceil(diff / 60) + '分钟前'
  } else if (diff < 3600 * 24) {
    return Math.ceil(diff / 3600) + '小时前'
  } else if (diff < 3600 * 24 * 2) {
    return '1天前'
  }
  if (option) {
    return parseTime(time, option)
  } else {
    return d.getMonth() + 1 + '月' + d.getDate() + '日' + d.getHours() + '时' + d.getMinutes() + '分'
  }
}

export function dateFormater(t, hms = false, onlyTime = false) {
  if (t !== 0) {
    const now = new Date(t * 1000)
    if (onlyTime) {
      let hour = now.getHours()
      let minute = now.getMinutes()
      let second = now.getSeconds()
      hour = ('' + hour).length === 1 ? '0' + hour : '' + hour
      minute = ('' + minute).length === 1 ? '0' + minute : '' + minute
      second = ('' + second).length === 1 ? '0' + second : '' + second
      return hour + ':' + minute + ':' + second
    } else {
      const year = now.getFullYear()
      const month = now.getMonth() + 1
      const date = now.getDate()
      if (hms) {
        let hour = now.getHours()
        let minute = now.getMinutes()
        let second = now.getSeconds()
        hour = ('' + hour).length === 1 ? '0' + hour : '' + hour
        minute = ('' + minute).length === 1 ? '0' + minute : '' + minute
        second = ('' + second).length === 1 ? '0' + second : '' + second
        return year + '-' + month + '-' + date + ' ' + hour + ':' + minute + ':' + second
      }
      return year + '-' + month + '-' + date
    }
  }
}

export function getUrlParam(url) {
  url = decodeURI(url) // 获取url中"?"符后的字串
  const res = {}
  if (url.indexOf('?') !== -1) {
    url = url.split('?')[1]
    const str = url.split('&')
    let param = []
    for (var i = 0; i < str.length; i++) {
      param = str[i].split('=')
      res[param[0]] = unescape(param[1])
    }
  }
  return res
}

const rolemap = {
  'sa': '超级管理员',
  'COMMON': '普通用户',
  'DEALER': '代理经销商'
}

export const roleFormatter = (role) => {
  return rolemap[role]
}

export const sleep = (delay) => {
  var start = (new Date()).getTime()
  while ((new Date()).getTime() - start < delay) {
    continue
  }
}

export const referToMap = (data, k = 'K', v = 'V') => {
  const referMap = {}
  data.forEach(item => {
    referMap[item[k]] = item[v]
  })
  return referMap
}

export const distinctArray = (arr, key) => {
  var tmap = {}
  var result = []
  arr.forEach(function(e) {
    if (!tmap[e[key]]) {
      tmap[e[key]] = true
      result.push(e)
    }
  })
  return result
}

export const getUserInfo = () => {
  if (stg().getItem('role') === '') {
    throw 'Login failed, please login again'
  }
  return JSON.parse(stg().getItem('user'))
}

export const hasLogin = () => {
  return stg().getItem('role') !== ''
}

export const stg = () => {
  return sessionStorage || window.sessionStorage
  // return localStorage || window.localStorage
}

export const removeToken = () => {
  stg().clear()
}

export const jsonValidator = str => {
  try {
    JSON.parse(str)
    return true
  } catch (err) {
    return false
  }
}

export const getPname = (data, pid, label = 'Name') => {
  if (data && pid && pid !== '') {
    const name = []
    const ids = toIntArray(pid)
    let items = data
    for (let i = 0, len = ids.length; i < len; i++) {
      for (let j = 0; j < items.length; j++) {
        if (ids[i] === items[j]['Id']) {
          name.push(items[j][label])
          if (i === len - 1) {
            return name
          }
          items = items[j]['children']
          j = 0
          continue
        }
      }
    }
  }
  return []
}

export const getSinglePname = (data, pid, label = 'Name') => {
  if (pid && pid !== '') {
    const ids = toIntArray(pid)
    let items = data
    for (let i = 0, len = ids.length; i < len; i++) {
      for (let j = 0; j < items.length; j++) {
        if (ids[i] === items[j]['Id']) {
          if (i === len - 1) {
            return items[j][label]
          }
          items = items[j]['children']
          j = 0
          continue
        }
      }
    }
  }
  return ''
}

export const getSPname = (data, ids, label = 'Name') => {
  if (ids.length !== 0) {
    let items = data
    for (let i = 0, len = ids.length; i < len; i++) {
      for (let j = 0; j < items.length; j++) {
        if (ids[i] === items[j]['Id']) {
          if (i === len - 1) {
            return items[j][label]
          }
          items = items[j]['children']
          j = 0
          continue
        }
      }
    }
  }
  return ''
}

export const getYearMonth = (n) => {
  const date = []
  const month = [
    { Id: '01', Name: '一月' },
    { Id: '02', Name: '二月' },
    { Id: '03', Name: '三月' },
    { Id: '04', Name: '四月' },
    { Id: '05', Name: '五月' },
    { Id: '06', Name: '六月' },
    { Id: '07', Name: '七月' },
    { Id: '08', Name: '八月' },
    { Id: '09', Name: '九月' },
    { Id: '10', Name: '十月' },
    { Id: '11', Name: '十一月' },
    { Id: '12', Name: '十一月' }
  ]
  const now = new Date()
  // const year = now.getFullYear() - n
  // for (let i = 0; i < 2 * n + 1; i++) {
  //   date.push({ Id: year + i + '', Name: year + i + '年', children: month })
  // }
  const year = now.getFullYear() - n
  for (let i = 0; i < n + 1; i++) {
    date.push({ Id: year + i + '', Name: year + i + '年', children: month })
  }
  return date
}

export const underline = (str) => {
  if (str.length > 2) {
    return str.replace(/\B([A-Z])/g, '_$1').toLowerCase()
  }
  return str
}

export const fanFilterFormatter = (v) => {
  switch (v) {
    case '1':
      return '开'
    case '0':
      return '关'
    case '2':
      return '未连接'
    default:
      return v
  }
}

export const toIntArray = (str) => {
  if (typeof str === 'string') {
    return str.substring(1, str.length - 1).split('/').map((data) => {
      return +data
    })
  }
}

export const ifNull = (str, sep = '/') => {
  if (str !== '') {
    return str
  }
  return sep
}

export const join = (arr, sep = '/') => {
  if (arr.length === 0) {
    return ''
  }
  return sep + arr.join(sep) + sep
}

export const treeFilter = (data, id = 'Id', pid = 'Pid') => {
  const tree = []
  if (data) {
    const tmp = {}
    for (let i = 0, len = data.length; i < len; i++) {
      tmp[`${data[i][id]}`] = data[i]
      // tmp[data[i].Id].children = []
    }
    let arr
    data.forEach(item => {
      if (item[pid] !== '') {
        arr = item[pid].substring(1, item[pid].length - 1).split('/')
        const tid = arr[arr.length - 1]
        if (tmp[tid]) {
          if (tmp[tid].children === undefined) {
            tmp[tid].children = []
          }
          tmp[tid].children.push(item)
        } else {
          tree.push(item)
        }
      } else {
        tree.push(item)
      }
    })
  }
  return tree
}

export const paramFilter = (data) => {
  const tmp = {}
  const tree = []
  data.forEach(item => {
    if (tmp[item.Kind] === undefined) {
      tmp[item.Kind] = []
    }
    tmp[item.Kind].push({ Id: item.V })
  })
  for (var key in tmp) {
    tree.push({ Id: key, children: tmp[key] })
  }
  return tree
}

export const dataFormatter = (id, data, key = 'Id', label = 'Name') => {
  for (let i = 0, n = data.length; i < n; i++) {
    if (data[i][key] === id) {
      return data[i][label]
    }
  }
  return id
}

export const Base64 = {
  enKey: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',
  deKey: [
    -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
    -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
    -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, 62, -1, -1, -1, 63,
    52, 53, 54, 55, 56, 57, 58, 59, 60, 61, -1, -1, -1, -1, -1, -1,
    -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14,
    15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, -1, -1, -1, -1, -1,
    -1, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40,
    41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, -1, -1, -1, -1, -1
  ],
  encode: function(src) {
    // 用一个数组来存放编码后的字符，效率比用字符串相加高很多。
    var str = []
    var ch1, ch2, ch3
    var pos = 0
    // 每三个字符进行编码。
    while (pos + 3 <= src.length) {
      ch1 = src.charCodeAt(pos++)
      ch2 = src.charCodeAt(pos++)
      ch3 = src.charCodeAt(pos++)
      str.push(this.enKey.charAt(ch1 >> 2), this.enKey.charAt(((ch1 << 4) + (ch2 >> 4)) & 0x3f))
      str.push(this.enKey.charAt(((ch2 << 2) + (ch3 >> 6)) & 0x3f), this.enKey.charAt(ch3 & 0x3f))
    }
    // 给剩下的字符进行编码。
    if (pos < src.length) {
      ch1 = src.charCodeAt(pos++)
      str.push(this.enKey.charAt(ch1 >> 2))
      if (pos < src.length) {
        ch2 = src.charCodeAt(pos)
        str.push(this.enKey.charAt(((ch1 << 4) + (ch2 >> 4)) & 0x3f))
        str.push(this.enKey.charAt(ch2 << 2 & 0x3f), '=')
      } else {
        str.push(this.enKey.charAt(ch1 << 4 & 0x3f), '==')
      }
    }
    // 组合各编码后的字符，连成一个字符串。
    return str.join('')
  },
  decode: function(src) {
    // 用一个数组来存放解码后的字符。
    var str = []
    var ch1, ch2, ch3, ch4
    var pos = 0
    // 过滤非法字符，并去掉'='。
    src = src.replace(/[^A-Za-z0-9\+\/]/g, '')
    // decode the source string in partition of per four characters.
    while (pos + 4 <= src.length) {
      ch1 = this.deKey[src.charCodeAt(pos++)]
      ch2 = this.deKey[src.charCodeAt(pos++)]
      ch3 = this.deKey[src.charCodeAt(pos++)]
      ch4 = this.deKey[src.charCodeAt(pos++)]
      str.push(String.fromCharCode(
        (ch1 << 2 & 0xff) + (ch2 >> 4), (ch2 << 4 & 0xff) + (ch3 >> 2), (ch3 << 6 & 0xff) + ch4))
    }
    // 给剩下的字符进行解码。
    if (pos + 1 < src.length) {
      ch1 = this.deKey[src.charCodeAt(pos++)]
      ch2 = this.deKey[src.charCodeAt(pos++)]
      if (pos < src.length) {
        ch3 = this.deKey[src.charCodeAt(pos)]
        str.push(String.fromCharCode((ch1 << 2 & 0xff) + (ch2 >> 4), (ch2 << 4 & 0xff) + (ch3 >> 2)))
      } else {
        str.push(String.fromCharCode((ch1 << 2 & 0xff) + (ch2 >> 4)))
      }
    }
    // 组合各解码后的字符，连成一个字符串。
    return str.join('')
  }
}

export function loadData(vm, func, typ) {
  switch (typ) {
    case 1:
      vm.$get('admin/listAllCustomer').then(res => {
        if (func) {
          func(res)
        }
      }).catch(() => {})
      break
    case 2:
      vm.$get('admin/listAllArea').then(res => {
        if (func) {
          func(res)
        }
      }).catch(() => {})
      break
    case 3:
      vm.$get('admin/listAllLocale').then(res => {
        if (func) {
          func(res)
        }
      }).catch(() => {})
      break
    case 4:
      vm.$get('admin/listAllUser').then(res => {
        if (func) {
          func(res)
        }
      }).catch(() => {})
      break
    default:
      vm.$get('admin/listBasicData').then(res => {
        vm.$store.dispatch('setData', res)
        if (func) {
          func()
        }
      }).catch(() => {})
  }
}

export const fileType = {
  1: 'import_contacts',
  2: 'music_note',
  3: 'chrome_reader_mode',
  4: 'ondemand_video'
}

export const getLanguage = () => {
  return lan[stg().getItem('lang')]
}

export const random = (min, max) => {
  return Math.floor(Math.random() * (max - min)) + min
}

/** 计算一段时间范围内，星期几有多少天
 * @param  {String} start 开始日期
 * @param  {String} end 截至日期
 * @param  {Array} weekdays 指定工作日
*/
export const countBetweenDates = (start, end, weekdays) => {
  if (start && end) {
    if (!weekdays || weekdays.length === 0 || weekdays.length === 7) {
      return (new Date(end) - new Date(start)) / 86400000 + 1
    } else {
      const d = new Date(start)
      const e = new Date(end)
      let result = 0
      let s
      weekdays.forEach(day => {
        s = new Date(d.valueOf())
        s.setDate(s.getDate() + (day - s.getDay() + 7) % 7)
        // eslint-disable-next-line
        while (s <= e) {
          result += 1
          s.setDate(s.getDate() + 7)
        }
      })
      return result
    }
  }
  return 0
}

/**
*
* @param fn {Function}   实际要执行的函数
* @param delay {Number}  延迟时间，也就是阈值，单位是毫秒（ms）
*
* @return {Function}     返回一个“去弹跳”了的函数
*/
export const debounce = (fn, delay) => {
  // 定时器，用来 setTimeout
  let timer

  // 返回一个函数，这个函数会在一个时间区间结束后的 delay 毫秒时执行 fn 函数
  return function() {
    // 保存函数调用时的上下文和参数，传递给 fn
    const context = this
    const args = arguments

    // 每次这个返回的函数被调用，就清除定时器，以保证不执行 fn
    clearTimeout(timer)

    // 当返回的函数被最后一次调用后（也就是用户停止了某个连续的操作），
    // 再过 delay 毫秒就执行 fn
    timer = setTimeout(function() {
      fn.apply(context, args)
    }, delay)
  }
}
