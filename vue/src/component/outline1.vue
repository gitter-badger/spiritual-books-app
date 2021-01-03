<template>
<section class="main">
  <section class="assistant">
    <section class="as-end"></section>
    <section class="as-middle"></section>
    <section class="as-end"></section>
  </section>
  <section class="title-wrapper">
    <section class="title" v-text="title"></section>
  </section>
  <section class="assistant">
    <section class="as-end"></section>
    <section class="as-middle"></section>
    <section class="as-end"></section>
  </section>
</section>
</template>

<script>
export default {
  props: {
    title: String
  }
}
</script>
<style lang="scss" scoped>
.main {
  display: flex;
  justify-content: center;
  align-items: center;
  margin:10px auto;
  .title-wrapper {
    background:#fec43f;
    color:#ffffff;
    .title {
      padding:2px 1em;
    }
  }
  .assistant {
    width:4em;
    .as-middle {
      width: 100%;
      height: 1px;
      background: #fed77f;
      margin:7px 0px;
    }
    .as-end {
      width: 100%;
      height: 1px;
      background: #fed77f;
    }
  }
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
  .t-title {
    height: 34px;
    background:#fec43f;
    line-height:35px;
    text-align: center;
    padding: 0px 1.6em;
    color: #fff;
    letter-spacing: 1.5px;
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
