<template>
<section>
  <v-app-bar fixed short tile dense flat dark color="info">
    <v-app-bar-nav-icon @click="drawer=true"></v-app-bar-nav-icon>
    <v-toolbar-title>书刊</v-toolbar-title>
  </v-app-bar>
  <v-row dense align="center" class="book-list">
    <v-col v-for="(e,i) in data" :key="i" cols="3" @click="handleRouter(e)">
      <v-img :src="e.cover" aspect-ratio="1" class="grey lighten-2">
      <template v-slot:placeholder>
        <v-row class="fill-height ma-0" align="center" justify="center">
          <v-progress-circular indeterminate color="grey lighten-5"></v-progress-circular>
        </v-row>
      </template>
      </v-img>
    </v-col>
  </v-row>
  <v-navigation-drawer fixed touchless floating v-model="drawer">
    <v-text-field v-model="keyword" dense solo-inverted rounded flat hide-details class="px-4 my-4" label="关键字" append-icon="search" @click:append="handleSearch"></v-text-field>
    <v-list nav dense tile flat class="px-1 py-0">
      <v-list-item-group mandatory dense color="primary" v-model="typ">
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
    </v-list>
  </v-navigation-drawer>
</section>
</template>
<script>
import bible from '@as/img/bible.png'
export default {
  name: 'app',
  data() {
    return {
      bible,
      drawer: false,
      typ: null,
      keyword: null,
      data: [
        { id: 1, name: '圣经', cover: 'https://loremflickr.com/600/400?image=1', isBook: false },
        { id: 2, name: '生命读经', cover: 'https://loremflickr.com/600/400?image=2', isBook: false },
        { id: 3, name: '倪柝声文集', cover: 'https://loremflickr.com/600/400?image=3', isBook: false },
        { id: 4, name: '神圣启示的先见', cover: 'https://loremflickr.com/600/400?image=4', isBook: false },
        { id: 5, name: '保罗万有的基督', cover: 'https://loremflickr.com/600/400?image=5', isBook: true },
        { id: 6, name: '申命记概论', cover: 'https://loremflickr.com/600/400?image=6', isBook: false },
        { id: 7, name: '神圣启示的高峰信息合辑', cover: 'https://loremflickr.com/600/400?image=7', isBook: false },
        { id: 8, name: '读经之路', cover: 'https://loremflickr.com/600/400?image=8', isBook: false },
        { id: 9, name: '工作的再思', cover: 'https://loremflickr.com/600/400?image=9', isBook: false },
        { id: 10, name: '圣经', cover: 'https://loremflickr.com/600/400?image=10', isBook: false },
        { id: 11, name: '生命读经', cover: 'https://loremflickr.com/600/400?image=11', isBook: false },
        { id: 12, name: '倪柝声文集', cover: 'https://loremflickr.com/600/400?image=12', isBook: false },
        { id: 13, name: '神圣启示的先见', cover: 'https://loremflickr.com/600/400?image=13', isBook: false },
        { id: 14, name: '保罗万有的基督', cover: 'https://loremflickr.com/600/400?image=14', isBook: true },
        { id: 15, name: '申命记概论', cover: 'https://loremflickr.com/600/400?image=15', isBook: false },
        { id: 16, name: '神圣启示的高峰信息合辑', cover: 'https://loremflickr.com/600/400?image=16', isBook: false },
        { id: 17, name: '读经之路', cover: 'https://loremflickr.com/600/400?image=17', isBook: false },
        { id: 18, name: '工作的再思', cover: 'https://loremflickr.com/600/400?image=18', isBook: false },
        { id: 19, name: '读经之路', cover: 'https://loremflickr.com/600/400?image=19', isBook: false },
        { id: 20, name: '工作的再思', cover: 'https://loremflickr.com/600/400?image=20', isBook: false },
        { id: 21, name: '圣经', cover: 'https://loremflickr.com/600/400?image=21', isBook: false },
        { id: 22, name: '生命读经', cover: 'https://loremflickr.com/600/400?image=22', isBook: false },
        { id: 23, name: '倪柝声文集', cover: 'https://loremflickr.com/600/400?image=23', isBook: false },
        { id: 24, name: '神圣启示的先见', cover: 'https://loremflickr.com/600/400?image=24', isBook: false },
        { id: 25, name: '保罗万有的基督', cover: 'https://loremflickr.com/600/400?image=25', isBook: true },
        { id: 26, name: '申命记概论', cover: 'https://loremflickr.com/600/400?image=26', isBook: false },
        { id: 27, name: '神圣启示的高峰信息合辑', cover: 'https://loremflickr.com/600/400?image=27', isBook: false },
        { id: 28, name: '读经之路', cover: 'https://loremflickr.com/600/400?image=28', isBook: false },
        { id: 29, name: '工作的再思', cover: 'https://loremflickr.com/600/400?image=29', isBook: false }
      ],
      cate: ['真理', '辨析', '福音', '造就', '事奉', '教会', '家庭']
    }
  },
  activated() {
    console.log('activated')
  },
  created() {
  },
  methods: {
    handlePlateSubmit(v) {
      this.sel.PlateNumber = v
    },
    handleFocus() {
      document.activeElement.blur()
    },
    handleRouter(e) {
      location.assign(encodeURI(`book.html?id=${e.id}&name=${e.name}&isBook=${e.isBook}`))
    },
    handleSearch() {
      alert(this.keyword)
    }
  }
}
</script>

<style lang="scss" scoped>
section {
  overflow-x: hidden;
  ::v-deep .book-list {
    padding: 8px;
    margin-top: 42px;
    .v-image {
      border-radius: 0.28rem
    }
  }
}
</style>
