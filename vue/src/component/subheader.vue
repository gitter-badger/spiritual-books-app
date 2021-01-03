<template>
<section>
  <div class="wrapper">
    <section class="sub-container">
      <section class="sub-decoration">
        <div class="decoration">
          <br class="decoration">
        </div>
      </section>
      <section class="sub-title">
        <div class="decoration" v-text="title"></div>
      </section>
    </section>
    <v-btn class="my-1" icon :to="path">
      <v-icon small>arrow_forward</v-icon>
    </v-btn>
  </div>
  <v-divider></v-divider>
</section>
</template>

<script>
export default {
  props: {
    title: String,
    path: String
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style lang="scss" scoped>
.wrapper {
  display: flex;
  justify-content: space-between;
  align-items: center;
  .sub-container {
    border-bottom: 1px solid rgb(50, 53, 53, 0.6);
    display: inline-block;
    box-sizing: border-box;
    .sub-decoration {
      display: inline-block;
      line-height: 1.3;
      padding-right: 0.2em;
      padding-left: 0.2em;
      background-color: rgb(50, 53, 53, 0.6);
      font-size: 18px;
      color: rgb(255, 255, 255);
      box-sizing: border-box;
    }
    .sub-title {
      display: inline-block;
      padding-right: 0.5em;
      padding-left: 0.5em;
      font-size: 16px;
      // color: rgb(50, 53, 53);
      box-sizing: border-box;
    }
    .decoration {
      box-sizing: border-box;
    }
  }
}
</style>
