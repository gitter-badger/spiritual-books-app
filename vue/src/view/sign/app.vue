<template>
<div id="app">
  <v-app>
    <div class="d-flex align-center justify-end my-4 px-4">
      <v-btn class="title" text small color="primary" href="index.html">首页</v-btn>
      <v-divider vertical></v-divider>
      <v-btn class="title" text small color="primary" @click="isLogin=!isLogin">{{isLogin?'注册':'登陆'}}</v-btn>
    </div>
    <v-form ref="form" v-model="valid" class="mx-4">
      <div v-if="isLogin">
        <div class="my-4 text-center headline white--text">用户登陆</div>
        <v-text-field dark dense solo-inverted prepend-inner-icon="account_circle" v-model.trim="formData.Id" label="手机号/邮箱"></v-text-field>
        <v-text-field dark dense solo-inverted prepend-inner-icon="vpn_key" :append-icon="showPass?'visibility':'visibility_off'" :type="showPass?'text':'password'" v-model.trim="formData.Pass" label="密码" @click:append="showPass=!showPass"></v-text-field>
        <v-row no-gutters align="center">
          <v-col cols="8" class="text-left">
            <v-img contain width="80" src="https://loremflickr.com/80/35"></v-img>
          </v-col>
          <v-col cols="4" class="text-right">
            <v-text-field dark dense solo-inverted hide-details v-model.trim="formData.Code" label="验证码"></v-text-field>
          </v-col>
        </v-row>
        <v-btn class="my-6" rounded block color="primary" @click="handleLogin">登陆</v-btn>
      </div>
      <div v-else>
        <v-btn-toggle class="my-4 headline" borderless tile dense v-model="isMobile" mandatory>
          <v-btn :value="true" depressed tile>手机号注册</v-btn>
          <v-btn :value="false" depressed tile>邮箱注册</v-btn>
        </v-btn-toggle>
        <v-file-input dark dense solo-inverted show-size label="上传头像"  :rules="[handleUpload]" accept="image/*" prepend-icon="camera_alt"></v-file-input>
        <v-text-field dark dense solo-inverted prepend-inner-icon="person" v-model.trim="formData.Nickname" label="昵称"></v-text-field>
        <v-text-field class="blur" dark dense solo-inverted :prepend-inner-icon="login.Icon" v-model.trim="formData.Id" :label="login.Name"></v-text-field>
        <v-text-field  dark dense solo-inverted :prepend-inner-icon="login.Icon" v-model.trim="formData[login.Id]" :label="`重复输入${login.Name}`"></v-text-field>
        <v-text-field dark dense solo-inverted prepend-inner-icon="vpn_key" type="password" v-model.trim="formData.pass" label="密码" @click:append="showPass=!showPass"></v-text-field>
        <v-text-field class="required" dark dense solo-inverted prepend-inner-icon="vpn_key" type="password" v-model.trim="formData.Pass" :rules="passRules" label="重复输入密码"></v-text-field>
        <v-row no-gutters align="center">
          <v-col cols="8" class="text-left">
            <v-img contain width="80" src="https://loremflickr.com/80/35"></v-img>
          </v-col>
          <v-col cols="4" class="text-right">
            <v-text-field dark dense solo-inverted hide-details v-model.trim="formData.Code" label="验证码"></v-text-field>
          </v-col>
        </v-row>
        <v-btn class="my-6" rounded block color="primary" @click="handleRegister">注册</v-btn>
      </div>
    </v-form>
  </v-app>
</div>
</template>
<script>
import { stg, getLanguage } from '@/util/index'
export default {
  name: 'app',
  data() {
    return {
      index: 0,
      valid: false,
      showPass: false,
      isLogin: true,
      isMobile: true,
      login: {
        Id: 'mobile',
        Name: '手机号',
        Icon: 'phone_android'
      },
      formData: {
        Id: 'Vector',
        Pass: '123456'
      },
      passRules: []
    }
  },
  computed: {
    rules() {
      return getLanguage().rules
    }
  },
  created() {
    this.passRules = [
      v => !!v || this.rules.required,
      v => (v && v.length >= 8) || this.rules.min,
      v => v === this.formData.pass || this.rules.twiceMatch
    ]
  },
  watch: {
    isMobile(v) {
      if (v) {
        this.login = {
          Id: 'mobile',
          Name: '手机号',
          Icon: 'phone_android'
        }
      } else {
        this.login = {
          Id: 'mail',
          Name: '邮箱',
          Icon: 'mail_outline'
        }
      }
    }
  },
  methods: {
    handleUpload(v) {
      if (v) {
        if (v.size < 2000000) {
          // 调用上传接口
          const formData = new FormData()
          formData.append('file', v)
          this.$post('upload/uploadToOss', formData).then(data => {
            this.formData.Avatar = data
          })
        } else {
          return '图片超过2MB，请重新上传!'
        }
      }
      return true
    },
    handleLogin() {
      stg().setItem('userInfo', JSON.stringify(this.formData))
      // this.$router.push('/')
      location.assign('index.html')
    },
    handleRegister() {
      // console.log(this.rules)
    }
  }
}
</script>

<style lang="scss" scoped>
::v-deep .v-application--wrap {
  // display: block;
  // height: 100%;
  // align-items: center;
  justify-content: center;
  background-position: top center;
  background-repeat: no-repeat;
  background-color: rgba(180,227,228, 0.7);
  background-image: url(~@as/img/dove.png);
  form {
    margin-bottom: 50px;
    border-radius: 10px;
    box-sizing: border-box;
    border: 6px solid #F5F3F0;
    text-align: center;
    padding: 15px;
    .v-item-group {
      display: flex;
      .v-btn {
        flex: 1;
      }
    }
    .blur input {
      color: transparent;
      text-shadow: 0 0 18px #000;
      user-select: none;
    }
    .col {
      padding: 0px;
      // .v-text-field--solo {
      //   border-radius: 1rem;
      // }
    }
    .v-label {
      font-size: 9pt;
      color: #6A6A6A;
    }
  }
}
</style>
