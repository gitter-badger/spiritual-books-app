<template>
<div id="app">
  <v-app>
    <keep-alive>
      <router-view />
    </keep-alive>
    <div style="height:42px"></div>
    <v-bottom-navigation fixed grow v-model="index" color="primary">
      <v-btn to="/" hide-details>
        <i class="material-icons" :style="{color:index===0?blue:grey}">home</i>
      </v-btn>
      <v-btn to="/book" hide-details>
        <i class="material-icons" :style="{color:index===1?blue:grey}">import_contacts</i>
      </v-btn>
      <v-btn to="/hymn" hide-details>
        <i class="material-icons" :style="{color:index===2?blue:grey}">music_video</i>
      </v-btn>
      <v-btn to="/audio" hide-details>
        <i class="material-icons" :style="{color:index===1?blue:grey}">chrome_reader_mode</i>
      </v-btn>
      <v-btn to="/video" hide-details>
        <i class="material-icons" :style="{color:index===3?blue:grey}">ondemand_video</i>
      </v-btn>
    </v-bottom-navigation>
  </v-app>
</div>
</template>
<script>
export default {
  data() {
    return {
      index: 0
    }
  }
}
</script>

<style lang="scss">
.v-menu__content {
  .v-list-item {
    .v-list-item__icon:first-child {
      margin-right: 8px;
    }
    .v-list-item__icon {
      align-self: flex-start;
      min-height: 36px;
      margin: 0;
    }
    .v-list-item__content {
      padding: 0px;
    }
  }
}
.v-navigation-drawer {
  .v-input__slot {
    padding: 0 12px !important;
    .v-icon {
      margin-top: 0px !important;
      margin-right: 0px !important;
    }
  }
  .v-list-item {
    .v-list-item__icon:first-child {
      margin-right: 8px;
    }
    .v-list-item__icon {
      align-self: flex-start;
      min-height: 36px;
      margin: 0 4px;
    }
  }
  .v-list-item:not(:last-child):not(:only-child) {
    // background-color: blueviolet;
    margin-bottom: 0px !important;
  }
}
</style>

<style scoped lang="scss">
#app {
  font-family: 'Avenir', Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
  /* margin-top: 60px; */
}
.v-item-group.v-bottom-navigation {
  align-items: center;
  height: 42px!important;
  .v-btn {
    min-width: auto;
  }
  .v-size--default {
    padding: 0;
  }
}
.required {
  label::after {
    content: "*";
    color: #FF5252;
  }
}
::v-deep .v-label {
  font-size: 9pt;
  color: #6A6A6A;
}
</style>
