<template>
<section>
  <v-app-bar fixed short tile dense flat dark color="info">
    <v-btn icon small @click="drawer=true">
      <v-icon>menu</v-icon>
    </v-btn>
    <v-spacer></v-spacer>
    <v-btn icon small @click="next">
      <v-icon>headset</v-icon>
    </v-btn>
    <v-spacer></v-spacer>
    <v-menu left top transition="slide-y-transition">
      <template v-slot:activator="{on}">
        <v-btn icon small v-on="on">
          <v-icon>more_vert</v-icon>
        </v-btn>
      </template>
      <v-list tile flat>
        <v-list-item to="/">
          <v-list-item-title>回到分类</v-list-item-title>
        </v-list-item>
        <v-list-item href="index.html">
          <v-list-item-title>回到首页</v-list-item-title>
        </v-list-item>
        <v-list-item to="/add">
          <v-list-item-title>收藏</v-list-item-title>
        </v-list-item>
        <v-divider></v-divider>
        <v-list-item>
          <v-list-item-title>关闭</v-list-item-title>
        </v-list-item>
      </v-list>
    </v-menu>
  </v-app-bar>
  <div style="height:48px"></div>
  <v-frame :src="iframeSrc" :onload="handleOnload"></v-frame>
  <v-overlay :value="loading">
    <v-progress-circular indeterminate width="2" size="32"></v-progress-circular>
  </v-overlay>
  <v-dialog v-model="showComment" scrollable>
    <v-card>
      <v-card-title class="title grey lighten-2 py-0 px-2 justify-space-between" primary-title>
        <!-- <v-spacer></v-spacer> -->
        <span v-text="comment"></span>
        <v-btn icon small @click="showComment=false">
          <v-icon>close</v-icon>
        </v-btn>
      </v-card-title>
      <v-card-text class="px-3">
        Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
      </v-card-text>
    </v-card>
  </v-dialog>
  <v-navigation-drawer fixed touchless floating v-model="drawer">
    <div class="d-flex justify-space-between align-center py-1 px-8">
      <v-btn small icon @click="fontSize--">
        <v-icon>remove</v-icon>
      </v-btn>
      <span>字体</span>
      <v-btn small icon @click="fontSize++">
        <v-icon>add</v-icon>
      </v-btn>
    </div>
    <v-item-group mandatory v-model="theme">
      <v-row align="center" justify="center" no-gutters>
        <v-col cols="4" class="pa-1 ma-0 text-center" style="background-color:#F6F0DA">
          <v-item v-slot:default="{active,toggle}" value="theme1">
            <v-btn small icon @click="toggle">
              <v-icon small v-if="active">check_circle</v-icon>
            </v-btn>
          </v-item>
        </v-col>
        <v-col cols="4" class="pa-1 ma-0 text-center" style="background-color:#BECEC1">
          <v-item v-slot:default="{active,toggle}" value="theme2">
            <v-btn small dark icon @click="toggle">
              <v-icon small v-if="active">check_circle</v-icon>
            </v-btn>
          </v-item>
        </v-col>
        <v-col cols="4" class="pa-1 ma-0 text-center" style="background-color:#273830">
          <v-item v-slot:default="{active,toggle}" value="theme3">
            <v-btn small dark icon @click="toggle">
              <v-icon small v-if="active">check_circle</v-icon>
            </v-btn>
          </v-item>
        </v-col>
      </v-row>
    </v-item-group>
    <v-divider></v-divider>
    <v-list nav dense tile flat class="px-1">
      <v-list-item-group mandatory color="primary" v-model="iframeSrc">
        <v-divider></v-divider>
        <template v-for="(e,i) in data" :value="e.href">
          <v-list-item class="mb-0" :value="e.href" :key="i">
            <template v-slot:default="{active}">
              <v-list-item-icon>
                <v-icon v-if="active">arrow_right</v-icon>
              </v-list-item-icon>
              <v-list-item-title v-text="e.name"></v-list-item-title>
            </template>
          </v-list-item>
          <v-divider :key="i"></v-divider>
        </template>
      </v-list-item-group>
    </v-list>
  </v-navigation-drawer>
</section>
</template>
<script>
// import { getUrlParam } from '@/util/index'
// import conf from '@/config'
import VFrame from '@/component/iframe'
export default {
  name: 'app',
  components: { VFrame },
  data() {
    return {
      drawer: false,
      loading: true,
      isBible: true,
      showComment: false,
      iframeSrc: null,
      iframeDoc: null,
      comment: null,
      theme: 'theme1',
      fontSize: null,
      container: null,
      data: [
        { name: '第1章', href: 'html/01001.html' },
        { name: '第2章', href: 'html/01002.html' },
        { name: '第3章', href: 'html/01003.html' },
        { name: '第4章', href: 'html/01004.html' },
        { name: '第5章', href: 'html/01005.html' },
        { name: '第6章', href: 'html/01006.html' }
      ]
    }
  },
  activated() {
    // console.log('activated')
    this.iframeSrc = this.data[0].href
    console.log(this.$route.params)
  },
  created() {
  },
  watch: {
    theme(v) {
      this.iframeDoc.querySelector('body').setAttribute('data-theme', v)
    },
    fontSize(n, o) {
      if (n > o) {
        this.container.forEach(el => {
          // document.defaultView.getComputedStyle
          el.style.fontSize = `${parseInt(window.getComputedStyle(el).fontSize) + 1}px`
        })
      } else {
        this.container.forEach(el => {
          el.style.fontSize = `${parseInt(window.getComputedStyle(el).fontSize) - 1}px`
        })
      }
    }
  },
  methods: {
    handleOnload(iframeDoc) {
      const iframeBody = iframeDoc.querySelector('body')
      iframeBody.setAttribute('data-theme', this.theme)
      const link = iframeDoc.createElement('link')
      link.rel = 'stylesheet'
      link.type = 'text/css'
      if (this.isBible) {
        link.href = '/asset/css/bible.css'
        const eventMethod = window.addEventListener ? 'addEventListener' : 'attachEvent'
        iframeBody.querySelectorAll('sup').forEach(el => {
          el[eventMethod]('click', () => {
            this.comment = el.id
            this.showComment = true
          }, false)
        })
      }
      iframeDoc.head.appendChild(link)
      this.iframeDoc = iframeDoc
      this.container = iframeBody.querySelectorAll('div')
      this.loading = false
    }
  }
}
</script>

<style lang="scss" scoped>
// @import '~@as/css/bible.css';
section {
  overflow-x: hidden;
  height: 100%;
  .theme1 {
    background-color: blue !important;
    font-size: 300px;
  }
}
.v-menu__content {
  .v-list {
    padding: 0;
    .v-list-item {
      padding: 0 14px;
      min-height: 34px;
      .v-list-item__content {
        padding: 0px;
      }
    }
  }
}
</style>
