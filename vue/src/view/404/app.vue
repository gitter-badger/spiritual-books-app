<template>
  <section class="main">
    <img :src="p404" />
    <h3>出错啦 ～</h3>
    <span>开发小哥哥正在处理，感谢您的耐心等待！</span>
  </section>
</template>
<script>
import p404 from '@as/img/404.png'
export default {
  data() {
    return {
      p404
    }
  }
}
</script>
<style lang="scss" scoped>
.main {
  display: flex;
  height: 100%;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  img {
    width: 60%;
    margin-bottom: 20px;
  }
  span {
    font-size: 10pt;
    padding: 20px 40px;
    text-align: center;
  }
}
</style>
