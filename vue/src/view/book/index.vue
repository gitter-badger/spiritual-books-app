<template>
<section>
  <v-app-bar fixed short tile dense flat dark color="info">
    <v-spacer></v-spacer>
    <v-toolbar-title v-text="uPara.name"></v-toolbar-title>
    <v-spacer></v-spacer>
  </v-app-bar>
  <div style="height:48px"></div>
  <v-list dense tile flat class="py-0">
    <template v-for="(e,i) in data">
      <v-list-item :key="i" @click="handleRouter(e)">
        <v-list-item-title v-text="e.name"></v-list-item-title>
        <v-list-item-icon>
          <v-icon color="grey lighten-1">keyboard_arrow_right</v-icon>
        </v-list-item-icon>
      </v-list-item>
      <v-divider :key="i"></v-divider>
    </template>
  </v-list>
</section>
</template>
<script>
import { getUrlParam } from '@/util/index'
export default {
  name: 'app',
  data() {
    return {
      uPara: {},
      data: []
    }
  },
  activated() {
    this.uPara = getUrlParam(location.search)
    console.log(this.uPara)
  },
  created() {
    this.data = [
      { id: 1, name: '马太福音', isBook: true },
      { id: 2, name: '马可福音', isBook: true },
      { id: 3, name: '路加福音', isBook: true },
      { id: 4, name: '约翰福音', isBook: true },
      { id: 5, name: '使徒行传', isBook: true },
      { id: 6, name: '罗马书', isBook: true },
      { id: 7, name: '林前', isBook: true },
      { id: 8, name: '林后', isBook: true },
      { id: 9, name: '提摩太', isBook: true }
    ]
  },
  methods: {
    handleRouter(e) {
      if (e.isBook) {
        this.$router.push({
          name: 'bookDetail',
          params: {
            id: e.id
          }
        })
      } else {
        // this.data = []
      }
    }
  }
}
</script>

<style lang="scss" scoped>
section {
  overflow-x: hidden;
  .v-list-item {
    padding-right: 0px;
    padding-left: 16px;
    min-height: auto;
  }
}
</style>
