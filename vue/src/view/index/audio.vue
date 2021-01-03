<template>
  <div class="text-center">
    <v-card
    class="mx-auto"
    max-width="600"
  >
    <v-card-text>
      <v-row
        class="mb-4"
        justify="space-between"
      >
        <v-col class="text-left">
          <v-container grid-list-xs>
            <v-btn
            color="indigo"
            dark
            depressed
            fab
            @click="toggle"
          >
            <v-icon large>
              {{ isPlaying ? 'pause' : 'play_arrow' }}
            </v-icon>
          </v-btn>
          </v-container>
        </v-col>
        <v-col class="text-right">
          <span
            class="display-3 font-weight-light"
            v-text="bpm"
          ></span>
          <span class="subheading font-weight-light mr-1">BPM</span>
        </v-col>
      </v-row>
      <v-slider
        style="font-size:0.65rem"
        v-model="bpm"
        color="indigo"
        track-color="grey"
        always-dirty
        inverse-label
        label="00 / 89"
        min="40"
        max="218"
      >
      </v-slider>
    </v-card-text>
  </v-card>
    <v-bottom-sheet inset>
      <template v-slot:activator="{ on }">
        <v-btn
          color="red"
          dark
          v-on="on"
        >
          Open Player
        </v-btn>
      </template>
      <v-card tile>
        <v-slider
          :max="sound.duration()"
          v-model="duration"
          @start="sound.pause()"
          @end="handleSlide"
        ></v-slider>
        <v-list>
          <v-list-item v-for="(e,i) in list" :key="i">
            <v-list-item-content>
              <v-list-item-title v-text="e.title">The Walker</v-list-item-title>
              <v-list-item-subtitle v-text="e.author">Fitz & The Trantrums</v-list-item-subtitle>
            </v-list-item-content>
            <v-spacer></v-spacer>
            <v-list-item-icon>
              <v-btn small icon fab>
                <v-icon>skip_previous</v-icon>
              </v-btn>
            </v-list-item-icon>
            <v-list-item-icon :class="{ 'mx-5': $vuetify.breakpoint.mdAndUp }">
              <v-btn small icon outlined fab color="384C46" @click="handlePlay(i)">
                <v-icon v-if="e.state">pause</v-icon>
                <v-icon v-else>play_arrow</v-icon>
              </v-btn>
            </v-list-item-icon>

            <v-list-item-icon
              class="ml-0"
              :class="{ 'mr-3': $vuetify.breakpoint.mdAndUp }"
            >
              <v-btn small icon fab>
                <v-icon>skip_next</v-icon>
              </v-btn>
            </v-list-item-icon>
          </v-list-item>
        </v-list>
      </v-card>
    </v-bottom-sheet>
  </div>
</template>
<script>
import { Howl } from '@/plugin/player'
import audio from '@as/audio/FirstSnow-Emancipator.mp3'
export default {
  name: 'app',
  data() {
    return {
      src: audio,
      duration: 0,
      progresserID: null,
      sound: Object,
      list: [
        {
          'name': 'Terrain',
          'artist': 'pg.lost',
          'album': 'Key',
          'url': 'https://521dimensions.com/song/Terrain-pglost.mp3',
          'cover_art_url': 'https://521dimensions.com/img/open-source/amplitudejs/album-art/key.jpg'
        },
        {
          'name': 'Vorel',
          'artist': 'Russian Circles',
          'album': 'Guidance',
          'url': 'https://521dimensions.com/song/Vorel-RussianCircles.mp3',
          'cover_art_url': 'https://521dimensions.com/img/open-source/amplitudejs/album-art/guidance.jpg'
        },
        {
          'name': 'Intro / Sweet Glory',
          'artist': 'Jimkata',
          'album': 'Die Digital',
          'url': 'https://521dimensions.com/song/IntroSweetGlory-Jimkata.mp3',
          'cover_art_url': 'https://521dimensions.com/img/open-source/amplitudejs/album-art/die-digital.jpg'
        },
        {
          'name': 'Offcut #6',
          'artist': 'Little People',
          'album': 'We Are But Hunks of Wood Remixes',
          'url': 'https://521dimensions.com/song/Offcut6-LittlePeople.mp3',
          'cover_art_url': 'https://521dimensions.com/img/open-source/amplitudejs/album-art/we-are-but-hunks-of-wood.jpg'
        },
        {
          'name': 'Dusk To Dawn',
          'artist': 'Emancipator',
          'album': 'Dusk To Dawn',
          'url': 'https://521dimensions.com/song/DuskToDawn-Emancipator.mp3',
          'cover_art_url': 'https://521dimensions.com/img/open-source/amplitudejs/album-art/from-dusk-to-dawn.jpg'
        },
        {
          'name': 'Anthem',
          'artist': 'Emancipator',
          'album': 'Soon It Will Be Cold Enough',
          'url': 'https://521dimensions.com/song/Anthem-Emancipator.mp3',
          'cover_art_url': 'https://521dimensions.com/img/open-source/amplitudejs/album-art/soon-it-will-be-cold-enough.jpg'
        },
        {
          'name': 'Risin High (feat Raashan Ahmad)',
          'artist': 'Ancient Astronauts',
          'album': 'We Are to Answer',
          'url': 'https://521dimensions.com/song/Ancient Astronauts - Risin High (feat Raashan Ahmad).mp3',
          'cover_art_url': 'https://521dimensions.com/img/open-source/amplitudejs/album-art/we-are-to-answer.jpg'
        },
        {
          'name': 'The Gun',
          'artist': 'Lorn',
          'album': 'Ask The Dust',
          'url': 'https://521dimensions.com/song/08 The Gun.mp3',
          'cover_art_url': 'https://521dimensions.com/img/open-source/amplitudejs/album-art/ask-the-dust.jpg'
        },
        {
          'name': 'Anvil',
          'artist': 'Lorn',
          'album': 'Anvil',
          'url': 'https://521dimensions.com/song/LORN - ANVIL.mp3',
          'cover_art_url': 'https://521dimensions.com/img/open-source/amplitudejs/album-art/anvil.jpg'
        },
        {
          'name': 'I Came Running',
          'artist': 'Ancient Astronauts',
          'album': 'We Are to Answer',
          'url': 'https://521dimensions.com/song/ICameRunning-AncientAstronauts.mp3',
          'cover_art_url': 'https://521dimensions.com/img/open-source/amplitudejs/album-art/we-are-to-answer.jpg'
        },
        {
          'name': 'First Snow',
          'artist': 'Emancipator',
          'album': 'Soon It Will Be Cold Enough',
          'url': 'https://521dimensions.com/song/FirstSnow-Emancipator.mp3',
          'cover_art_url': 'https://521dimensions.com/img/open-source/amplitudejs/album-art/soon-it-will-be-cold-enough.jpg'
        }
      ]
    }
  },
  created() {
    const vm = this
    this.sound = new Howl({
      src: [this.src],
      // loop: true,
      volume: 1,
      onend() {
        cancelAnimationFrame(vm.progresserID)
        vm.duration = 0
      },
      onplay() {
        vm.progresser()
      },
      onpause() {
        cancelAnimationFrame(vm.progresserID)
      },
      onseek() {
        console.log('seek----')
      }
    })
  },
  methods: {
    progresser() {
      this.duration = this.sound.seek()
      this.progresserID = requestAnimationFrame(this.progresser)
    },
    handleSlide(v) {
      this.sound.seek(v)
      this.sound.play()
    },
    handlePlay(i) {
      if (this.list[i].state) {
        this.sound.pause()
      } else {
        this.sound.play()
      }
      this.$set(this.list, i, Object.assign(this.list[i], { state: !this.list[i].state }))
    }
  }
}
</script>
<style lang="scss" scoped>
::v-deep .v-card {
  .v-card__text .v-label {
    font-size: 0.68rem;
  }
}
</style>
