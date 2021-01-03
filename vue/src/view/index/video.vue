<template>
<section>
  <video id="video" width="100%" poster="https://shengjingzhenli.com/res/imagecover/video/fa19edff-241b-422e-88a0-6cf2673b2a09.png" controls autoplay></video>
</section>
</template>
<script>

import videoUri from '@as/video/h264.mp4'
import Player from '@/plugin/video'
export default {
  data() {
    return {
      video: null,
      duration: 0,
      currentTime: 0,
      tracks: null
    }
  },
  beforeMount() {
    // console.log(shaka)
  },
  mounted() {
    // Check to see if the browser supports the basic APIs shaka needs.
    if (Player.isBrowserSupported()) {
      // Everything looks good!
      this.initPlayer(videoUri)
    } else {
      // This browser does not have the minimum set of APIs we need.
      console.error('Browser not supported!')
    }
  },
  created() {
    // location.assign('404.html')
  },
  methods: {
    initPlayer(manifestUri) {
      // Create a Player instance.
      const video = document.getElementById('video')
      const player = new Player(video)
      // shaka.ui.configure({
      //   addSeekBar: false,
      //   controlPanelElements: ['rewind', 'fast_forward']
      // })
      // Listen for error events.
      player.addEventListener('error', this.onErrorEvent)

      // Try to load a manifest.
      // This is an asynchronous process.
      player.load(manifestUri).then(function() {
        // This runs if the asynchronous load is successful.
        console.log('The video has now been loaded!')
        console.log(player.video_.currentTime = 100)
      }).catch(this.onError) // onError is executed if the asynchronous load fails.
    },
    onErrorEvent(event) {
      // Extract the shaka.util.Error object from the event.
      this.onError(event.detail)
    },
    onError(error) {
      // Log the error.
      console.error('Error code', error.code, 'object', error)
    }
  }
}
</script>

<style lang="scss" scoped>
</style>
