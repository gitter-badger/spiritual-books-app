<template>
<div id="app">
  <v-app style="background-color:#F1F1F1">
    <v-tabs class="flex-grow-0" dark grow hide-slider show-arrows background-color="info">
      <v-tab>书刊</v-tab>
      <v-tab>诗歌</v-tab>
      <v-tab>文章</v-tab>
      <v-tab>视频</v-tab>
    </v-tabs>
    <v-list dense tile flat class="pa-0">
      <v-list-item-group color="primary" v-model="selected" multiple>
        <v-list-item class="px-2">
          <template v-slot:default="{active,toggle}">
            <v-list-item-avatar>
              <v-img src="https://loremflickr.com/500/300" />
            </v-list-item-avatar>
            <v-list-item-content>
              <v-list-item-title>第一章</v-list-item-title>
              <v-list-item-subtitle>马太福音</v-list-item-subtitle>
            </v-list-item-content>
            <v-list-item-action>
              <v-checkbox :input-value="active" color="info" @click="toggle"></v-checkbox>
            </v-list-item-action>
          </template>
        </v-list-item>
        <v-divider></v-divider>
        <v-list-item class="px-2">
          <template v-slot:default="{active,toggle}">
            <v-list-item-avatar>
              <v-img src="https://loremflickr.com/500/300" />
            </v-list-item-avatar>
            <v-list-item-content>
              <v-list-item-title>第二章</v-list-item-title>
              <v-list-item-subtitle>马太福音</v-list-item-subtitle>
            </v-list-item-content>
            <v-list-item-action>
              <v-checkbox :input-value="active" color="info" @click="toggle"></v-checkbox>
            </v-list-item-action>
          </template>
        </v-list-item>
      </v-list-item-group>
    </v-list>
    <v-bottom-sheet :value="selected.length!==0" no-click-animation hide-overlay persistent>
      <center class="py-2">
        <v-btn dark depressed rounded color="#FF5252">删除</v-btn>
      </center>
    </v-bottom-sheet>
  </v-app>
</div>
</template>

<script>

export default {
  name: 'App',
  data() {
    return {
      sheet: false,
      selected: []
    }
  }
}
</script>
