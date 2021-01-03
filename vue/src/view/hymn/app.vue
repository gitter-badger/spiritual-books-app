<template>
<div id="app">
  <v-app>
    <v-app-bar fixed short tile dense flat dark color="info">
      <v-btn icon small @click="handleRouter">
        <v-icon>arrow_back</v-icon>
      </v-btn>
      <v-toolbar-title v-text="uPara.name"></v-toolbar-title>
    </v-app-bar>
    <div style="height:48px"></div>
    <section class="player-container pa-2 ma-2">
      <div class="pa-1 d-flex justify-space-between align-center">
        <div class="player-progress mr-2">
          <div class="song-album">倪柝声•补充本</div>
          <v-progress-linear
            v-model="power"
            color="#DCDCDC"
            class="my-1"
            height="2"
            reactive
          ></v-progress-linear>
          <div class="d-flex justify-space-between">
            <span class="time-indicate">00:00</span>
            <span class="time-indicate">3:09</span>
          </div>
        </div>
        <v-btn icon @click="isPlaying=!isPlaying">
          <v-icon x-large>
            {{ isPlaying ? 'pause_circle_filled' : 'play_circle_filled' }}
          </v-icon>
        </v-btn>
      </div>
    </section>
<svg encoding="UTF-8" width="100.00%"  viewBox="0.00 0.00 640.00 360.00" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><path d="M100.00,250.00 A10.00,2.00 0.00 0 1 200.00,250.00" id="top" fill="none" stroke="red" /><text x="100.00" y="250.00" style="dominant-baseline:middle;text-anchor:middle;font-size:30px;fill:black" >Hello, SVG</text></svg>
    <embed :src="lyricSrc" />
    <!-- <v-menu transition="slide-y-transition">
      <template v-slot:activator="{on}">
        <v-btn icon v-on="on">
          <v-icon icon color="primary">
            volume_down
          </v-icon>
        </v-btn>
      </template>
      <v-slider dense
        v-model="value"
        vertical
      ></v-slider>
    </v-menu> -->
  </v-app>
</div>
</template>

<script>
import { getUrlParam } from '@/util/index'
export default {
  name: 'app',
  data() {
    return {
      uPara: {},
      isPlaying: false,
      lyricSrc: 'lyric/my_country.svg',
      value: 10
    }
  },
  created() {
    this.uPara = getUrlParam(location.search)
    console.log(this.uPara)
  },
  methods: {
    handleRouter() {
      history.back()
    }
  }
}
</script>
<style lang="scss" scoped>
.v-application--wrap {
  overflow-x: hidden;
  .player-container {
    border-radius: 0.35rem;
    background-color: #F7F7F7;
    .song-album {
      color: #828282;
      font-size: 10pt;
    }
    .player-progress {
      flex: 1 1 100%;
      .time-indicate {
        color: #828282;
        font-size: 10pt;
      }
    }
  }
  embed {
    background-color: #F6F0DA;
  }
}
</style>
