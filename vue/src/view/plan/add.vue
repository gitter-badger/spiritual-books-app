<template>
<v-container fluid class="py-4">
  <v-form ref="form" v-model="valid" lazy-validation>
    <v-text-field flat dense readonly class="required"
      :rules="[v => !!v || 'Item is required']"
      :value="formData.name"
      @click="sheet=true"
      label="选择书籍"
      append-icon="keyboard_arrow_right"
    ></v-text-field>
    <v-row no-gutters>
      <v-col cols="6">
        <v-text-field readonly
          v-model="formData.startAt"
          label="计划开始日期"
          prepend-icon="event"
          :rules="[v=>!!v&&v<=formData.endAt||'开始日期须小于结束日期']"
          @click="date='startAt';modal=true">
        </v-text-field>
      </v-col>
      <v-col cols="6">
        <v-text-field readonly
          v-model="formData.endAt"
          label="计划结束日期"
          prepend-icon="event"
          :rules="[v=>!!v&&v>=formData.startAt||'结束日期须大于开始日期']"
          @click="date='endAt';modal=true">
        </v-text-field>
      </v-col>
    </v-row>
    <v-chip-group v-model="formData.weekday" column multiple>
      <v-chip v-for="(v,k) in weekdays" filter pill small filter-icon="check_circle" color="info" :key="k" :value="k">{{v}}</v-chip>
    </v-chip-group>
  </v-form>
  <v-list v-if="selected.length" class="pa-0 mt-3" elevation="2" color="#F1F1F1">
    <v-list-item dense>
      <v-list-item-content>
        <v-list-item-title>书名</v-list-item-title>
      </v-list-item-content>
      <v-list-item-action>
        <v-list-item-title v-text="formData.name"></v-list-item-title>
      </v-list-item-action>
    </v-list-item>
    <v-divider></v-divider>
    <v-list-item dense>
      <v-list-item-content>
        <v-list-item-title>作者</v-list-item-title>
      </v-list-item-content>
      <v-list-item-action>
        <v-list-item-title v-text="formData.author"></v-list-item-title>
      </v-list-item-action>
    </v-list-item>
    <v-divider></v-divider>
    <v-list-item dense>
      <v-list-item-content>
        <v-list-item-title>篇/章</v-list-item-title>
      </v-list-item-content>
      <v-list-item-action>
        <v-list-item-title v-text="formData.chapters"></v-list-item-title>
      </v-list-item-action>
    </v-list-item>
    <v-divider></v-divider>
    <v-list-item dense>
      <v-list-item-content>
        <v-list-item-title>字</v-list-item-title>
      </v-list-item-content>
      <v-list-item-action>
        <v-list-item-title v-text="formData.words"></v-list-item-title>
      </v-list-item-action>
    </v-list-item>
    <v-divider></v-divider>
    <v-list-item dense>
      <v-list-item-content>
        <v-list-item-title>开始日期</v-list-item-title>
      </v-list-item-content>
      <v-list-item-action>
        <v-list-item-title v-text="formData.startAt"></v-list-item-title>
      </v-list-item-action>
    </v-list-item>
    <v-divider></v-divider>
    <v-list-item dense>
      <v-list-item-content>
        <v-list-item-title>结束日期</v-list-item-title>
      </v-list-item-content>
      <v-list-item-action>
        <v-list-item-title v-text="formData.endAt"></v-list-item-title>
      </v-list-item-action>
    </v-list-item>
    <v-divider></v-divider>
    <v-list-item dense>
      <v-list-item-content>
        <v-list-item-title>计划用时(天)</v-list-item-title>
      </v-list-item-content>
      <v-list-item-action>
        <v-list-item-title v-text="`${dateLen}天`"></v-list-item-title>
      </v-list-item-action>
    </v-list-item>
    <v-divider></v-divider>
    <v-list-item dense>
      <v-list-item-content>
        <v-list-item-title>日均阅读(字)</v-list-item-title>
      </v-list-item-content>
      <v-list-item-action>
        <v-list-item-title v-text="formData.words"></v-list-item-title>
      </v-list-item-action>
    </v-list-item>
  </v-list>
  <v-btn block rounded color="primary" class="mt-4" @click="handleSubmit" :disabled="dateLen===0">创建计划</v-btn>
  <v-dialog ref="dialog" v-model="modal" persistent>
    <v-date-picker v-model="formData[date]" scrollable :locale="lang" @input="modal=false"></v-date-picker>
  </v-dialog>
  <v-bottom-sheet scrollable v-model="sheet">
    <v-card>
      <v-card-title style="background-color:#F1F1F1" class="title py-1 px-2 justify-center align-center justify-space-between" >
        <span>选择书籍</span>
        <v-btn small depressed color="primary" @click="sheet=false">确定</v-btn>
      </v-card-title>
      <v-card-text class="px-0">
        <v-treeview dense open-on-click transition activatable
          ref="treeView"
          :active.sync="selected"
          selected-color="indigo"
          class="text-truncate"
          :items="books"
          return-object>
          <template v-slot:prepend="{item,open}">
            <v-icon v-if="!item.isLeaf">{{open?'folder_open':'folder'}}</v-icon>
          </template>
        </v-treeview>
      </v-card-text>
    </v-card>
  </v-bottom-sheet>
</v-container>
</template>

<script>
import { countBetweenDates, stg } from '@/util/index'
export default {
  data() {
    return {
      countBetweenDates,
      modal: false,
      sheet: false,
      date: null,
      lang: stg().getItem('lang'),
      selected: [],
      formData: {
        startAt: new Date().toISOString().substr(0, 10)
      },
      weekdays: {
        0: '周日',
        1: '周一',
        2: '周二',
        3: '周三',
        4: '周四',
        5: '周五',
        6: '周六'
      },
      books: [
        { id: 1, name: '圣经', isLeaf: false, children: [
          { id: 2, name: '马太', author: '马太', cover: 'https://loremflickr.com/350/165?random', words: 8000, chapters: 27, isLeaf: true },
          { id: 3, name: '马可', author: '马可', cover: 'https://loremflickr.com/350/165?random', words: 8000, chapters: 27, isLeaf: true }
        ] },
        { id: 4, name: '神圣启示的先见', author: '李', cover: 'https://loremflickr.com/350/165?random', words: 8000, chapters: 27, isLeaf: true }
      ]
    }
  },
  created() {
    // this.avatar = avatars[Math.floor(Math.random() * avatars.length)]
  },
  computed: {
    dateLen() {
      return countBetweenDates(this.formData.startAt, this.formData.endAt, this.formData.weekday)
    }
  },
  watch: {
    selected(v) {
      if (v.length !== 0) {
        this.formData.name = v[0].name
        this.formData.author = v[0].author
        this.formData.chapters = v[0].chapters
        this.formData.words = v[0].words
      }
    }
  },
  methods: {
    async fetchData(item) {
    },
    handleSubmit() {
      console.log(this.formData, (new Date(this.formData.endAt) - new Date(this.formData.startAt)) / 86400000 + 1)
    }
  }
}
</script>
<style lang="scss" scoped>
.v-treeview {
  ::v-deep .v-treeview-node__root {
    padding-left: 8px;
    .v-treeview-node__content .v-treeview-node__prepend:empty {
      display: none;
    }
  }
}
::v-deep .v-slide-group__content {
  flex-wrap: nowrap;
  justify-content: space-between;
  .v-chip {
    margin: 0px;
    padding: 0 8px;
    font-size: 3vw;
    .v-chip__filter.v-icon {
      margin-right: 2px;
      font-size: 4vw;
    }
  }
}
</style>
