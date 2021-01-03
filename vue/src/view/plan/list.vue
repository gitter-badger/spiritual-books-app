
<template>
<section>
  <v-tabs class="flex-grow-0" dark grow hide-slider show-arrows v-model="tab" background-color="info">
    <v-tab>进行中</v-tab>
    <v-tab>已完成</v-tab>
  </v-tabs>
  <v-tabs-items v-model="tab">
    <v-tab-item>
      <v-list tile flat>
        <v-list-item-group color="primary" v-model="selected" multiple>
          <v-list-item>
            <template v-slot:default="{active,toggle}">
            <v-list-item-content>
              <v-list-item-title>马太福音</v-list-item-title>
              <v-list-item-subtitle class="my-1">2019-12-01 ~ 2019-12-02</v-list-item-subtitle>
              <v-list-item-subtitle>剩余80天</v-list-item-subtitle>
            </v-list-item-content>
            <v-list-item-action>
              <v-checkbox v-if="active" :input-value="active" color="info" @click="toggle"></v-checkbox>
              <v-progress-circular v-else
                :size="60"
                :width="8"
                :value="20"
                color="primary"
              >
                <span class="caption">第20天</span>
              </v-progress-circular>
            </v-list-item-action>
            </template>
          </v-list-item>
          <v-divider></v-divider>
          <v-list-item>
            <template v-slot:default="{active,toggle}">
            <v-list-item-content>
              <v-list-item-title>马太福音</v-list-item-title>
              <v-list-item-subtitle class="my-1">2019-12-01 ~ 2019-12-02</v-list-item-subtitle>
              <v-list-item-subtitle>剩余80天</v-list-item-subtitle>
            </v-list-item-content>
            <v-list-item-action>
              <v-checkbox v-if="active" :input-value="active" color="info" @click="toggle"></v-checkbox>
              <v-progress-circular v-else
                :size="60"
                :width="8"
                :value="20"
                color="primary"
              >
                <span class="caption">第20天</span>
              </v-progress-circular>
            </v-list-item-action>
            </template>
          </v-list-item>
          <v-divider></v-divider>
        </v-list-item-group>
      </v-list>
    </v-tab-item>
    <v-tab-item>
      <v-list tile flat>
        <v-list-item>
          <v-list-item-content>
            <v-list-item-title>马太福音</v-list-item-title>
            <v-list-item-subtitle>2019-12-01 至 2019-12-01</v-list-item-subtitle>
            <v-list-item-subtitle>实际完成日期: 2019-12-08</v-list-item-subtitle>
          </v-list-item-content>
          <v-list-item-action>
            <v-rating dense small half-increments readonly
              v-model="rating"
              length="4"
              color="yellow darken-3"
              background-color="grey darken-1"
            ></v-rating>
          </v-list-item-action>
        </v-list-item>
        <v-divider></v-divider>
        <v-list-item>
          <v-list-item-content>
            <v-list-item-title>马太福音</v-list-item-title>
            <v-list-item-subtitle>2019-12-01 至 2019-12-01</v-list-item-subtitle>
            <v-list-item-subtitle>实际完成日期: 2019-12-08</v-list-item-subtitle>
          </v-list-item-content>
          <v-list-item-action>
            <v-rating dense small half-increments readonly
              v-model="rating"
              length="4"
              color="yellow darken-3"
              background-color="grey darken-1"
            ></v-rating>
          </v-list-item-action>
        </v-list-item>
        <v-divider></v-divider>
      </v-list>
    </v-tab-item>
  </v-tabs-items>
  <v-bottom-sheet :value="tab===0&&selected.length!==0" no-click-animation hide-overlay persistent>
    <center class="py-2">
      <v-btn dark depressed rounded color="#FF5252">删除</v-btn>
    </center>
  </v-bottom-sheet>
</section>
</template>

<script>

export default {
  name: 'App',
  data() {
    return {
      tab: 0,
      rating: 3.2,
      selected: []
    }
  }
}
</script>
