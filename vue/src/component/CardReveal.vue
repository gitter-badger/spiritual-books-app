<template>
<div class="reveal" :style="style">
  <i class="material-icons" v-text="icon">backspace</i> <span v-text="msg"></span>
</div>
</template>

<script>
export default {
  props: {
    icon: String,
    msg: String,
    float: {
      type: String,
      default: 'left'
    }
  },
  computed: {
    style() {
      const style = {}
      style[this.float] = 0
      style[`margin-${this.float}`] = '4px'
      return style
    }
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style lang="scss" scoped>
.reveal {
  position: absolute;
  bottom: 4px;
  z-index: 5;
  // height: 18px;
  // line-height: 18px;
  // min-width: 14px;
  display: flex;
  // justify-content: space-between;
  align-items: center;
  padding: 2px 6px;
  border-radius: 0.488rem;
  background: rgba(0,0,0,0.4);
  font-size: 9pt;
  color: #fff;
  i {
    font-size: 11pt;
    margin-right: 2px;
  }
}
</style>
