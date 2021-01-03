import Mock from './mock'
import { Message } from 'element-ui'

const mockData = (url) => {
  switch (url) {
    case 'test/mock':
      const data = { code: 100, data: [] }
      for (let i = 0; i < 20; i++) {
        data.data.push(Mock.mock({
          id: Mock.Random.guid(),
          name: Mock.Random.cname(),
          constellation: '@constellation',
          avatar: Mock.Random.image(),
          sex: '@sex',
          'experience|1-5': [function() {
            return Mock.mock({
              'company|1': [
                '欢恩宝',
                '阿里巴巴',
                '腾讯',
                '华为',
                '360'
              ],
              'position|1': [
                'CTO', 'CEO', '开发工程师', '首席架构师'
              ],
              'employment|1-20': 1,
              address: Mock.Random.county(true)
            })
          }]
        }))
      }
      return data
    case 'captcha':
      return { code: 100, data: Mock.Random.image() }
    case 'login':
      return Mock.mock({
        code: 100,
        data: {
          token: Mock.Random.guid(),
          name: Mock.Random.cname(),
          owner: Mock.Random.cname(),
          'role|1': [
            '超级管理员', '系部负责人', '班主任', '企业负责人', '企业导师', '学生', '家长'
          ],
          menu: [
            { id: '1', name: '权限控制', pid: null, path: '/Home', icon: 'fa fa-table' },
            { id: '2', name: '用户管理', pid: '1', path: '/ca/user', icon: '' },
            { id: '3', name: '角色管理', pid: '1', path: '/ca/role', icon: '' },
            { id: '4', name: '资源管理', pid: '1', path: '/ca/resource', icon: '' },
            { id: '5', name: '组织架构', pid: '1', path: '/ca/organization', icon: '' }
          ]
        }
      })
    case 'logout':
      return { code: 100 }
    case 'listCaUser':
      return {
        code: 100,
        count: 2,
        data: [
          { 'id': '1', 'status': 1, 'creator': null, 'modifier': '欧阳佳丽', 'modifyTime': '2018-07-25 15:34:51', 'createTime': null, 'version': 'dc6d70317e8743f68b7b1c9902e3af6e', 'name': '欧阳佳丽', 'openId': null, 'email': 'CZK.XU@QQ.COM', 'mobile': '13498098765', 'userType': 1, 'owner': '陈默', 'gender': true, 'salt': '123', 'password': null, 'avatar': null, 'remark': '' },
          { 'id': 'WE', 'status': 1, 'creator': '欧阳佳丽', 'modifier': null, 'modifyTime': null, 'createTime': '2018-05-25 11:58:54', 'version': 'af47fe0133174224a8d9a2cbb811786a', 'name': '微信统一用户', 'openId': null, 'email': 'weixin@tentent.com', 'mobile': '18788902334', 'userType': 1, 'owner': '微信统一用户', 'gender': true, 'salt': 'cb43742d', 'password': null, 'avatar': null, 'remark': null }
        ]
      }
    case 'listCaRole':
      return {
        'code': 100,
        'count': 4,
        'data': [
          { 'id': '1', 'status': 1, 'creator': '欧阳佳丽', 'modifier': null, 'modifyTime': null, 'createTime': '2018-05-30 10:17:17', 'version': '1', 'name': '系统管理员', 'sign': 'ADMIN', 'roleType': null, 'remark': null },
          { 'id': '2', 'status': 1, 'creator': '欧阳佳丽', 'modifier': null, 'modifyTime': null, 'createTime': '2018-05-30 10:17:18', 'version': '1', 'name': '班主任', 'sign': 'OPERATOR', 'roleType': null, 'remark': null },
          { 'id': '3', 'status': 1, 'creator': '欧阳佳丽', 'modifier': null, 'modifyTime': null, 'createTime': '2018-05-30 10:17:19', 'version': '1', 'name': '企业负责人', 'sign': 'LOGISTICS', 'roleType': null, 'remark': null },
          { 'id': '4', 'status': 1, 'creator': '欧阳佳丽', 'modifier': null, 'modifyTime': null, 'createTime': '2018-05-25 12:41:12', 'version': '1', 'name': '学生', 'sign': 'AGENT', 'roleType': 3, 'remark': null }
        ]
      }
    case 'listCaResource':
      return {
        'code': 100,
        'count': 4,
        'data': [
          { 'id': '1', 'status': 1, 'creator': null, 'modifier': null, 'modifyTime': null, 'createTime': null, 'version': '1', 'name': '权限控制', 'sign': null, 'layer': null, 'path': '/Home', 'icon': 'fa fa-table', 'pid': null, 'resType': 1, 'remark': null },
          { 'id': '2', 'status': 1, 'creator': null, 'modifier': null, 'modifyTime': null, 'createTime': null, 'version': '1', 'name': '用户管理', 'sign': null, 'layer': null, 'path': '/ca/user', 'icon': null, 'pid': '1', 'resType': 1, 'remark': null },
          { 'id': '3', 'status': 1, 'creator': null, 'modifier': null, 'modifyTime': null, 'createTime': null, 'version': null, 'name': '身份认证', 'sign': 'we:certificate', 'layer': null, 'path': 'we/certificate', 'icon': null, 'pid': '2', 'resType': 2, 'remark': null },
          { 'id': '4', 'status': 1, 'creator': null, 'modifier': '欧阳佳丽', 'modifyTime': '2018-03-23 16:15:03', 'createTime': null, 'version': '3f5b38924d9c4b43894e14a78c134654', 'name': '角色管理', 'sign': null, 'layer': null, 'path': '/ca/role', 'icon': null, 'pid': '1', 'resType': 1, 'remark': null }
        ]
      }
    case 'listCaRoleResource':
      return {
        'code': 100,
        'count': 3,
        'data': [
          { 'id': '1fd8af062ad247718abde58aedf4f660', 'status': null, 'creator': null, 'modifier': null, 'modifyTime': null, 'createTime': null, 'version': null, 'roleId': '2', 'resId': '89' },
          { 'id': '2fa73f7c08b44dd8b11aed2a55f87f2d', 'status': null, 'creator': null, 'modifier': null, 'modifyTime': null, 'createTime': null, 'version': null, 'roleId': '2', 'resId': '2' },
          { 'id': 'd59bffcf66224378b07ead5dcb9a4c34', 'status': null, 'creator': null, 'modifier': null, 'modifyTime': null, 'createTime': null, 'version': null, 'roleId': '2', 'resId': '3' }
        ]
      }
    case 'listCaUserRole':
      return {
        'code': 100,
        'count': 3,
        'data': [
          { 'id': '23bd688601ba4dc6bf362e851d04026b', 'status': null, 'creator': null, 'modifier': null, 'modifyTime': null, 'createTime': null, 'version': null, 'userId': '1', 'roleId': '4' },
          { 'id': '584d00924c6d41a0b9b8940bb9e391d6', 'status': null, 'creator': null, 'modifier': null, 'modifyTime': null, 'createTime': null, 'version': null, 'userId': '1', 'roleId': '1' },
          { 'id': 'e89bcd94d51244efb452be73244435bb', 'status': null, 'creator': null, 'modifier': null, 'modifyTime': null, 'createTime': null, 'version': null, 'userId': '1', 'roleId': '2' }
        ]
      }
    case 'listCaOrganization':
      return {
        code: 100,
        data: [
          { id: '1', name: '永康市高级技工学校', pid: null },
          { id: '2', name: '机电', pid: '1' },
          { id: '3', name: '会计', pid: '1' },
          { id: '4', name: '模具', pid: '1' },
          { id: '5', name: '汽修', pid: '1' }
        ]
      }
    default:
      return { code: 400, message: 'found nothing' }
  }
}
export default {
  /**
   * Vue插件默认安装方法
   * @param {Object} Vue 当前vue实例对象
   * @param {Object} options 插件参数
   */
  install: (Vue, option) => {
    /**
     * @param {String} api 接口地址
     */
    Vue.prototype.$get = async(api, params) => {
      return new Promise((resolve, reject) => {
        const data = mockData(api)
        if (data.code === 100) {
          resolve(data)
        } else {
          Message.error(data.message)
          reject(data)
        }
      })
    }
    Vue.prototype.$post = async(api, params) => {
      return new Promise((resolve, reject) => {
        const data = mockData(api)
        if (data.code === 100) {
          resolve(data)
        } else {
          Message.error(data.message)
          reject(data)
        }
      })
    }
  }
}
