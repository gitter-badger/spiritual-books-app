<template>
<div id="app">
  <v-app>
    <router-view />
  </v-app>
</div>
</template>

<script>
export default {
  name: 'App'
}
</script>
<style lang="scss">
.v-menu__content {
  .v-list {
    padding: 0;
    .v-list-item {
      padding: 0 14px;
      .v-list-item__icon:first-child {
        margin-right: 8px;
      }
      .v-list-item__icon {
        align-self: flex-start;
        margin: 10px 0;
      }
      .v-list-item__content {
        padding: 0px;
      }
    }
  }
}
</style>
