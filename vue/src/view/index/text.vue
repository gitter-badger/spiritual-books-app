<template>
<section>
  <v-app-bar dense flat prominent tile
      absolute
      color="indigo darken-2"
      dark
      shrink-on-scroll
      scroll-target="#scrolling-techniques"
    >
      <v-app-bar-nav-icon></v-app-bar-nav-icon>
      <v-spacer></v-spacer>
      <v-text-field
        hide-details
        append-icon="search"
        single-line
      ></v-text-field>
    </v-app-bar>
    <v-sheet id="scrolling-techniques" class="overflow-y-auto" max-height="600">
      <v-container style="height: 1000px;">
        fsdfsdfsdf
      </v-container>
    </v-sheet>
</section>
</template>
<script>

export default {
  name: 'app',
  data() {
    return {
      index: 0,
      cate: ['真理', '辨析', '福音', '造就', '事奉', '教会', '家庭']
    }
  },
  activated() {
    console.log('activated')
  },
  created() {
  },
  methods: {
    handlePay() {
      if (this.sel.PlateNumber) {
        location.assign(encodeURI(`pay.html?PlateNumber=${this.sel.PlateNumber}&PlateColor=${this.sel.PlateColor}`))
      } else {
        this.$warning('请输入车牌号及类型')
      }
    },
    handlePlateSubmit(v) {
      this.sel.PlateNumber = v
    },
    handleFocus() {
      document.activeElement.blur()
    }
  }
}
</script>

<style lang="scss" scoped>
.v-tab {
  min-width: 40px;
  .v-tabs-slider-wrapper {
    width: 40px;
  }
}
</style>
