<template>
  <v-snackbar
    :timeout="timeout"
    :color="color"
    v-model="active"
    class="v-application">
    {{ text }}
  </v-snackbar>
</template>
<script>
// 'success', 'info', 'error', 'warning'
export default {
  data() {
    return {
      active: false,
      text: '',
      y: 'top',
      color: 'cyan darken-2',
      timeout: 2000
    }
  },
  methods: {
    show(color, text) {
      if (this.active) {
        this.close()
        this.$nextTick(() => this.show(color, text))
        return
      }
      this.color = color
      this.text = text
      this.active = true
    },
    success(text) {
      this.show('success', text)
    },
    info(text) {
      this.show('cyan darken-2', text)
    },
    error(text) {
      this.show('error', text)
    },
    warning(text) {
      this.show('warning', text)
    },
    close() {
      this.active = false
    }
  }
}
</script>
<style lang="scss" scoped>
::v-deep.v-snack {
  width: 60%;
  left: 50%;
  bottom: 60%;
  transform: translateX(-50%);
  .v-snack__wrapper .v-snack__content {
    justify-content: center;
  }
}
</style>
