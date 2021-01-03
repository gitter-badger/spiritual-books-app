<template>
<div id="app">
  <v-app>
    <keep-alive>
      <router-view />
    </keep-alive>
  </v-app>
</div>
</template>

<script>

export default {
  name: 'App'
}
</script>
<style lang="scss">
.v-navigation-drawer {
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
}
</style>
