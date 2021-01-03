<template>
<section class="main">
  <v-app-bar fixed short tile dense flat dark color="info">
    <v-btn icon small @click="drawer=true">
      <v-icon>menu</v-icon>
    </v-btn>
    <v-toolbar-title>诗歌</v-toolbar-title>
    <v-spacer></v-spacer>
    <v-btn icon small>
      <v-icon>sort</v-icon>
    </v-btn>
  </v-app-bar>
  <div style="height:48px"></div>
  <v-list dense tile flat class="pa-0">
    <template v-for="(e,i) in list">
      <v-list-item :key="i">
        <v-list-item-content>
          <v-list-item-title class="subtitle-1" v-text="e.name"></v-list-item-title>
          <v-list-item-subtitle style="margin-top:4px;margin-bottom:4px">
            <span class="mr-4">03:99</span>
            <span v-text="`${e.artist}•${e.album}`"></span>
          </v-list-item-subtitle>
          <v-list-item-title>
            <v-icon small>headset</v-icon>
            <span class="mr-4">100</span>
            <v-icon small>bookmark</v-icon>100
          </v-list-item-title>
        </v-list-item-content>
        <v-list-item-action>
          <v-btn icon color="#3f51b5" :href="`hymn.html?id=${e.id}&name=${e.name}`">
            <v-icon large>play_circle_filled</v-icon>
          </v-btn>
        </v-list-item-action>
      </v-list-item>
      <div style="height:4px;background-color:#F1F1F1" :key="i"></div>
    </template>
  </v-list>
  <v-navigation-drawer fixed touchless floating v-model="drawer">
    <v-text-field v-model="keyword" small dense solo-inverted rounded flat hide-details class="px-4 my-4" label="关键字" append-icon="search" @click:append="handleSearch"></v-text-field>
    <v-chip-group class="mx-2" mandatory active-class="primary" v-model="typ">
      <v-chip small v-for="(e,i) in cate" :key="i">
        {{ e }}
      </v-chip>
    </v-chip-group>
    <!-- <v-list nav dense tile flat class="px-1 py-0">
      <v-list-item-group mandatory dense color="info" v-model="typ">
        <v-divider :key="i"></v-divider>
        <template v-for="(e,i) in cate">
          <v-list-item dense :key="i" :value="i">
            <template v-slot:default="{active}">
              <v-list-item-icon>
                <v-icon v-if="active">arrow_right</v-icon>
              </v-list-item-icon>
              <v-list-item-title v-text="e"></v-list-item-title>
            </template>
          </v-list-item>
          <v-divider :key="i"></v-divider>
        </template>
      </v-list-item-group>
    </v-list> -->
  </v-navigation-drawer>
</section>
</template>
<script>

export default {
  data() {
    return {
      drawer: false,
      keyword: null,
      list: [
        {
          id: '1',
          'name': '让我爱而不受感戴',
          'artist': '倪柝声',
          'album': '补充本',
          'url': 'https://521dimensions.com/song/Terrain-pglost.mp3'
        },
        {
          id: '2',
          'name': 'Terrain',
          'artist': 'pg.lost',
          'album': 'Key',
          'url': 'https://521dimensions.com/song/Terrain-pglost.mp3'
        }
      ],
      cate: ['大本', '补充本', '新歌颂咏', '儿童诗歌', '青年诗歌']
    }
  },
  created() {
  },
  methods: {
    handlePlay(i) {
      this.list[i].state = true
    },
    handleSearch() {
      alert(this.keyword)
    }
  },
  watch: {
    showBind(v) {
      if (!v && this.count !== 0) {
        this.count = 0
        this.timerRecovery()
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.main {
  .v-list--dense {
    .v-list-item {
      .v-list-item__icon {
        align-self: center;
      }
    }
  }
}
</style>
