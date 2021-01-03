<template>
<section>
  <v-app-bar fixed short tile dense flat color="info" dark>
    <v-app-bar-nav-icon @click="drawer=true"></v-app-bar-nav-icon>
    <v-toolbar-title v-text="language.Declaration"></v-toolbar-title>
    <v-spacer></v-spacer>
    <v-menu left top transition="slide-y-transition">
      <template v-slot:activator="{on}">
        <v-btn icon v-on="on">
          <v-icon>language</v-icon>
        </v-btn>
      </template>
      <v-list dense tile flat class="pa-0">
        <v-list-item-group mandatory dense color="primary" v-model="lang">
          <v-list-item value="zh-cn">
            <template v-slot:default="{active}">
              <v-list-item-icon>
                <v-icon v-if="active">arrow_right</v-icon>
              </v-list-item-icon>
              <v-list-item-title>简体中文</v-list-item-title>
            </template>
          </v-list-item>
          <v-list-item value="zh-tw">
            <template v-slot:default="{active}">
              <v-list-item-icon>
                <v-icon v-if="active">arrow_right</v-icon>
              </v-list-item-icon>
              <v-list-item-title>繁體中文</v-list-item-title>
            </template>
          </v-list-item>
          <v-list-item value="en-us">
            <template v-slot:default="{active}">
              <v-list-item-icon>
                <v-icon v-if="active">arrow_right</v-icon>
              </v-list-item-icon>
              <v-list-item-title>English</v-list-item-title>
            </template>
          </v-list-item>
        </v-list-item-group>
      </v-list>
    </v-menu>
  </v-app-bar>
  <v-carousel class="mt-12" cycle v-model="index" height="230" :touch="{left:()=>index++,right:()=>index--}" :show-arrows="false" hide-delimiter-background hide-delimiters>
    <v-carousel-item  :ripple="false"
      href="http://www.baidu.com"
      v-for="(e,i) in items"
      :key="i"
      :src="e.src"
    >
      <div class="v-carousel__controls">
        <span class="text-truncate">图片说明图片说明图片说明图片说明图片说明图片说明图片说明图片说明图片说明图片说明图片说明图片说明图片说明图片说明</span>
      </div>
    </v-carousel-item>
  </v-carousel>
  <v-container id="new-container" fluid v-touch="{up:()=>alert=false}">
    <v-alert
      dense
      v-model="alert"
      type="info "
      elevation="2"
      transition="scale-transition"
    >
      韩国基督教监理会在2014年认定该教会为“异端”，韩国基督教联合会也在2016年发布公告，要求信众警惕该教会的“侵蚀”。
    </v-alert>
    <outline1 :title="language.New" />
    <v-list subheader tile flat three-line>
      <subheader :title="language.Article" path="/"></subheader>
      <template v-for="(e,i) in texts">
        <v-list-item :key="i">
          <v-list-item-content>
            <v-list-item-subtitle class="primary--text" v-text="e.title"></v-list-item-subtitle>
            <div style="height:10px"></div>
            <v-list-item-subtitle>
              <span class="mr-4">5小时前</span>
              <v-icon small>remove_red_eye</v-icon>
              <span class="mr-4">100</span>
              <v-icon small>bookmark</v-icon>100
            </v-list-item-subtitle>
          </v-list-item-content>
          <v-list-item-action>
            <v-img :src="e.cover" width="140"></v-img>
          </v-list-item-action>
        </v-list-item>
        <v-divider v-if="texts[i+1]" :key="i"></v-divider>
      </template>
    </v-list>
    <v-list subheader tile flat three-line  class="song-list mt-2">
      <subheader :title="language.Hymn" path="/"></subheader>
      <v-row dense v-for="(e,i) in texts" :key="i">
        <v-col
          v-for="n in 9"
          :key="n"
          class="child-flex"
          cols="4"
        >
          <v-card flat tile @click="isPlaying=true" :ripple="false">
            <v-img
              :src="`https://loremflickr.com/600/400?image=${n * 5 + 10}`"
              aspect-ratio="1"
              class="grey lighten-2"
            >
            <card-reveal msg="14.99k" icon="headset"></card-reveal>
            <template v-slot:placeholder>
              <v-row
                class="fill-height ma-0"
                align="center"
                justify="center"
              >
                <v-progress-circular indeterminate color="grey lighten-5"></v-progress-circular>
              </v-row>
            </template>
            </v-img>
          </v-card>
        </v-col>
      </v-row>
    </v-list>
    <v-card flat tile class="video-list mt-2" :ripple="false">
      <subheader :title="language.Video" path="/"></subheader>
      <v-row dense>
        <v-col v-for="(e,i) in video" :key="i" cols="6">
          <v-card elevation="1" :ripple="false">
            <v-img :src="e.cover"
              class="white--text align-end"
              gradient="to bottom, rgba(0,0,0,.1), rgba(0,0,0,.5)"
              height="120">
              <card-reveal msg="14.99k" icon="play_circle_outline"></card-reveal>
              <card-reveal msg="3:20" icon="query_builder" float="right"></card-reveal>
            </v-img>
            <v-card-actions>
              <span class="video-title" v-text="e.title"></span>
            </v-card-actions>
          </v-card>
        </v-col>
      </v-row>
    </v-card>
    <outline2 :title="language.Motto" />
    <v-card flat tile class="mt-2" :ripple="false">
      <v-card-actions @click="showImg=true">
        <v-img
         contain
          src="https://loremflickr.com/350/165?random"
          height="460"
        ></v-img>
      </v-card-actions>
    </v-card>
  </v-container>
  <v-overlay :value="showImg||showAlert">
    <img v-if="showImg" @click="showImg=false" src="https://loremflickr.com/350/165?random" alt="">
    <v-alert v-if="showAlert" class="mx-auto py-4" dense width="80%" color="warning">
      <span class="title">確定退出嗎？</span>
      <v-row class="mt-4" justify="end" no-gutters>
          <v-btn color="white" outlined small @click="showAlert=false">
            取消
          </v-btn>
          <v-btn class="ml-4" color="primary" depressed small @click="handleLogout">
            確定
          </v-btn>
      </v-row>
    </v-alert>
  </v-overlay>
  <v-navigation-drawer fixed touchless floating v-model="drawer">
    <v-list nav dense subheader>
      <template v-if="userInfo.Id">
      <v-list-item>
        <v-list-item-avatar>
          <img src="https://randomuser.me/api/portraits/men/81.jpg">
        </v-list-item-avatar>
        <v-list-item-content>
          <v-list-item-title v-text="userInfo.Id"></v-list-item-title>
        </v-list-item-content>
        <v-list-item-action>
          <v-btn icon @click="drawer=false;showAlert=true">
            <v-icon color="#ff5252">power_settings_new</v-icon>
          </v-btn>
        </v-list-item-action>
      </v-list-item>
      <v-divider></v-divider>
      <v-list-item @click="handleTheme">
        <template v-if="dark">
          <v-list-item-icon>
            <v-icon>wb_sunny</v-icon>
          </v-list-item-icon>
          <v-list-item-title v-text="language.DayMode">白昼模式</v-list-item-title>
        </template>
        <template v-else>
          <v-list-item-icon>
            <v-icon>brightness_4</v-icon>
          </v-list-item-icon>
          <v-list-item-title v-text="language.NightMode">黑夜模式</v-list-item-title>
        </template>
      </v-list-item>
      <v-list-item href="plan.html">
        <v-list-item-icon>
          <v-icon>event_available</v-icon>
        </v-list-item-icon>
        <v-list-item-title class="plan-badge">
          <v-badge color="#FF5252" content="6888">{{language.Plan}}</v-badge>
        </v-list-item-title>
      </v-list-item>
      <v-list-item @click="drawer=false;modal=true">
        <v-list-item-icon>
          <v-icon>info_outline</v-icon>
        </v-list-item-icon>
        <v-list-item-title v-text="language.Feedback">关于本站</v-list-item-title>
      </v-list-item>
      <v-divider></v-divider>
      <v-subheader v-text="language.RecentRecord">最近观看</v-subheader>
      <v-list-item inactive>
        <v-list-item-title class="text-truncate" v-text="history"></v-list-item-title>
        <v-list-item-icon>
          <v-icon>import_contacts</v-icon>
        </v-list-item-icon>
      </v-list-item>
      <v-list-item inactive>
        <v-list-item-title class="text-truncate" v-text="history"></v-list-item-title>
        <v-list-item-icon>
          <v-icon>headset</v-icon>
        </v-list-item-icon>
      </v-list-item>
      <v-list-item inactive>
        <v-list-item-title class="text-truncate" v-text="history"></v-list-item-title>
        <v-list-item-icon>
          <v-icon>chrome_reader_mode</v-icon>
        </v-list-item-icon>
      </v-list-item>
      <v-list-item inactive>
        <v-list-item-title class="text-truncate" v-text="history"></v-list-item-title>
        <v-list-item-icon>
          <v-icon>play_circle_outline</v-icon>
        </v-list-item-icon>
      </v-list-item>
      <v-divider></v-divider>
      <div class="d-flex justify-space-between align-center">
        <v-subheader v-text="language.Mark">我的收藏</v-subheader>
        <v-btn style="margin-right:6px" icon small href="mark.html">
          <v-icon>settings</v-icon>
        </v-btn>
      </div>
      <v-treeview ref="treeView" dense open-on-click selected-color="indigo" class="text-truncate" :items="bookmark" item-key="id" item-text="title">
        <template v-slot:prepend="{item,open}">
          <v-icon v-if="item.type===0">{{open?'folder_open':'folder'}}</v-icon>
          <!-- <div v-else style="margin-left:0px"></div> -->
          <!-- <v-icon v-else v-text="fileType[item.type]"></v-icon> -->
        </template>
      </v-treeview>
      </template>
      <template v-else>
        <v-list-item class="mt-4" @click="handleSign">
          <v-list-item-title class="text-center">
            <span class="sign" v-text="language.Register"></span>
          </v-list-item-title>
        </v-list-item>
      </template>
    </v-list>
  </v-navigation-drawer>
  <v-bottom-sheet v-model="isPlaying" hide-overlay attach="#new-container">
    <v-card flat tile>
      <v-progress-linear :value="50" class="my-0" height="3" ></v-progress-linear>
      <v-row dense align="center">
        <v-col cols="2" class="text-left">
          <div class="song-turn">
            <v-avatar>
              <img :style="{animationPlayState}" src="https://cdn.vuetifyjs.com/images/cards/sunshine.jpg">
                <v-btn small class="song-btn" icon @click="isPlaying=!isPlaying">
              <v-icon>
                {{isPlaying?'pause':'play_arrow'}}
              </v-icon>
            </v-btn>
            </v-avatar>
          </div>
        </v-col>
        <v-col cols="10" class="song-info">
          <span class="song-title">让我爱而不受感戴让我爱而不受感戴让我爱而不受感戴让我爱而不受感戴让我爱而不受感戴让我爱而不受感戴</span>
          <span class="song-subtitle">台湾福音书房 • 倪柝声</span>
          <!-- <v-marquee :animationPlayState="animationPlayState" text="作者: 倪柝声 1915年狱中之作"></v-marquee> -->
          <!-- <span class="song-duration">00:00:00 / 01:12:20</span> -->
        </v-col>
      </v-row>
    </v-card>
  </v-bottom-sheet>
  <v-dialog v-model="modal" persistent>
      <v-card>
        <v-card-title>
          <span class="title">建议反馈</span>
        </v-card-title>
        <v-card-text>
          <v-textarea counter auto-grow outlined shaped
            v-model.trim="feedback.Content"
            label="改进建议或Bug反馈"
            rows="3"
            row-height="25"
            maxlength="200"
          ></v-textarea>
          <!-- <v-row no-gutters align="center">
            <v-col cols="8" class="text-left">
              <v-img contain width="80" src="https://loremflickr.com/80/35"></v-img>
            </v-col>
            <v-col cols="4" class="text-right">
              <v-text-field dark dense solo-inverted hide-details v-model.trim="feedback.Code" label="验证码"></v-text-field>
            </v-col>
          </v-row> -->
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="blue darken-1" text @click="modal=false">关闭</v-btn>
          <v-btn color="blue darken-1" text @click="modal=false">确定</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  <v-footer tile padless>
    <v-col class="text-center" cols="12">
      © 浙ICP备16048035号{{ new Date().getFullYear() }}
    </v-col>
  </v-footer>
</section>
</template>
<script>
import videoUri from '@as/video/h264.mp4'
import subheader from '@/component/subheader'
import outline1 from '@/component/outline1'
import outline2 from '@/component/outline2'
import CardReveal from '@/component/CardReveal'
import { stg, fileType } from '@/util/index'

// import { mapState } from 'vuex'
// import VMarquee from '@/component/marquee'
export default {
  name: 'app',
  components: { subheader, outline1, outline2, CardReveal },
  data() {
    return {
      fileType,
      index: 0,
      modal: false,
      drawer: false,
      showImg: false,
      showAlert: false,
      alert: true,
      isPlaying: false,
      userInfo: {},
      lang: null,
      feedback: {},
      bookmark: [
        { id: 'article', type: 0, children: [
          { id: 1, title: '让我爱而不受感戴让我爱而不受感戴让我爱而不受感戴', type: 2 }
        ] },
        { id: 'hymn', type: 0 },
        { id: 'video', type: 0 },
        { id: 'book', type: 0 }
      ],
      history: '让我爱而不受感戴让我爱而不受感戴让我爱而不受感戴让我爱而不受感戴让我爱而不受感戴让我爱而不受感戴',
      items: [
        {
          src: 'https://placekitten.com/640/360?t=1'
        },
        {
          src: 'https://placekitten.com/640/360?t=2'
        },
        {
          src: 'https://placekitten.com/640/360?t=3'
        },
        {
          src: 'https://placekitten.com/640/360?t=4'
        }
      ],
      texts: [
        { title: '很长很长很长很长很长很长很长很长很长很长很长很长的文字', cover: 'https://loremflickr.com/350/165?random' },
        { title: '文章2', cover: 'https://loremflickr.com/350/165?random' }
      ],
      video: [
        { title: '躺着就是为国家做贡献躺着就是为国家做贡献躺着就是为国家做贡献躺着就是为国家做贡献躺着就是为国家做贡献', src: videoUri, cover: 'https://loremflickr.com/600/400?image=10' },
        { title: '躺着就是为国家做贡献', src: videoUri, cover: 'https://loremflickr.com/600/400?image=20' },
        { title: '躺着就是为国家做贡献', src: videoUri, cover: 'https://loremflickr.com/600/400?image=30' },
        { title: '躺着就是为国家做贡献', src: videoUri, cover: 'https://loremflickr.com/600/400?image=40' }
      ]
    }
  },
  activated() {
    this.userInfo = JSON.parse(stg().getItem('userInfo')) || {}
    console.log(this.userInfo)
    // console.log('activated')
  },
  deactivated() {
    // console.log('deactivated')
    // this.drawer = false
  },
  watch: {
    lang(v) {
      this.language = v
    }
  },
  computed: {
    language: {
      get() {
        return this.$store.state.language[this.$route.name]
      },
      set(v) {
        this.$store.dispatch('setLang', v)
      }
    },
    dark: {
      get() {
        return this.$store.state.dark
      },
      set(v) {
        this.$vuetify.theme.dark = v
        this.$store.dispatch('setDark', v)
      }
    },
    animationPlayState() {
      return this.isPlaying ? 'running' : 'paused'
    }
  },
  created() {
    this.language = this.$route.query.lang
    this.$vuetify.theme.dark = this.dark
    this.$getHtml('').then(res => {
      // console.log(res)
    })
  },
  beforeMount() {
    this.bookmark[0].title = this.language.Book
    this.bookmark[1].title = this.language.Hymn
    this.bookmark[2].title = this.language.Article
    this.bookmark[3].title = this.language.Video
  },
  methods: {
    handleTheme() {
      this.dark = !this.dark
    },
    handleSign() {
      location.assign('sign.html')
    },
    handleLogout() {
      this.userInfo = {}
      stg().removeItem('userInfo')
      this.showAlert = false
    }
  }
}
</script>

<style lang="scss" scoped>
::v-deep .v-carousel__item {
  .v-carousel__controls {
    justify-content: flex-start;
    background: rgba(0,0,0,.3);
    color: #fff;
    padding: 0 15px;
  }
}
::v-deep .v-image__image--cover {
  background-size: 100% 100%;
  position:100% 100%
}
.video-list {
  // background-color: #fff;
  .v-card__actions {
    font-size: 10pt;
    height: 2.68rem;
    .video-title {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }
}
::v-deep .v-card__title {
  justify-content: center;
  padding: 8px;
}
.song-list {
  .v-sheet {
    border-radius: 0.28rem
  }
}
.v-navigation-drawer {
  .v-treeview {
    ::v-deep .v-treeview-node__root {
      padding-left: 0px;
      .v-treeview-node__content {
        margin-left: 0px;
        .v-treeview-node__prepend:empty {
          display: none;
        }
      }
    }
  }
  .plan-badge {
    overflow: visible;
    .v-badge {
      margin-top: 0;
    }
  }
  .sign {
    display: inline-block;
    border-radius: 4px;
    white-space: pre-wrap;
    font-size: 0.89rem;
    color: #FFFFFF;
    padding: 8px;
    background-color: #1867c0
  }
}

::v-deep .v-overlay__content {
  position: relative;
  width: 100%;
  text-align: center;
  img {
    width: 100%;
  }
}

.v-bottom-sheet {
  .v-card {
    margin: 0;
    background-color:rgba(0,0,0,0.6);
    .col {
      padding: 0 8px;
      .song-turn {
        display: inline-block;
        border-radius:50%;
        border: 2px solid rgba(53,53,53,0.6);
        .v-avatar {
          border: 6px solid #202020;
          img {
            animation: rotate 6s linear infinite;
            &:hover {
              animation-play-state: paused
            }
          }
          .song-btn {
            color: rgba(255,255,255,0.7);
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%,-50%);
          }
        }
      }
    }
    .song-info {
      padding-top: 8px;
      padding-bottom: 8px;
      color: #fff;
      .marquee {
        // max-width: calc(100% - 7.6rem);
        max-width: 100%;
        margin-right: 8px;
      }
      .song-title {
        padding-right: 8px;
        font-size: 0.975rem;
        display: inline-block;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        width: 100%;
      }
      .song-subtitle {
        font-size: 0.765rem;
      }
      // .song-duration {
      //   font-size: 0.765rem;
      //   width: 10rem;
      //   color: #fff;
      //   font-weight: 400;
      //   letter-spacing: 0.0333333333em;
      //   line-height: 1.25rem;
      //   font-family: "Roboto", sans-serif;
      //   white-space: nowrap;
      //   overflow: hidden;
      //   text-overflow: ellipsis;
      //   text-align: right;
      //   padding-right: 8px;
      // }
    }
  }
}
@keyframes rotate {
	from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
