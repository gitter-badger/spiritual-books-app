<template>
<v-row dense justify="center">
  <section class="t-right">
    <section class="tr-top"></section>
    <section class="tr-bottom"></section>
  </section>
  <section class="title" v-text="title"></section>
  <section class="t-left">
    <section class="tl-top"></section>
    <section class="tl-bottom"></section>
  </section>
</v-row>
</template>

<script>
export default {
  props: {
    title: String
  }
}
</script>
<style lang="scss" scoped>
.row {
  margin:10px auto;
  .t-right {
    margin-right:-15px;
    transform:rotate(0deg);
    .tr-top {
      transform:scaleY(-1);
      width:0;
      height:0;
      border-width:0px 15px 17px 15px;
      border-style:none solid solid;
      border-color:transparent transparent #fed77f;
    }
    .tr-bottom {
      width:0;
      height:0;
      border-width:0px 15px 17px 15px;
      border-style:none solid solid;
      border-color:transparent transparent #fed77f;
    }
  }
  .title {
    height: 34px;
    background:#fec43f;
    line-height:35px;
    text-align: center;
    padding: 0px 1.6em;
    color: #fff;
  }
  .t-left {
    margin-left: -15px;
    transform:rotate(0deg);
    .tl-top {
      transform:scaleY(-1);
      width:0;
      height:1px;
      border-width:0px 15px 17px 15px;
      border-style:none solid solid;
      border-color:transparent transparent #fed77f;
    }
    .tl-bottom {
      width:0;
      height:1px;
      border-width:0px 15px 17px 15px;
      border-style:none solid solid;
      border-color:transparent transparent #fed77f;
    }
  }
}
</style>
