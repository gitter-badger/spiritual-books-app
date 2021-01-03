<template>
<section class="marquee" :style="{width,color,backgroundColor,borderRadius}">
<span v-text="text"></span>
</section>
</template>
<script>
export default {
  props: {
    width: {
      type: String,
      default: '100%'
    },
    rounded: {
      type: Boolean,
      default: false
    },
    color: {
      type: String,
      default: '#fff'
    },
    backgroundColor: {
      type: String,
      default: 'unset'
    },
    text: String
  },
  data() {
    return {
      borderRadius: null
    }
  },
  beforeMount() {
    if (this.rounded) {
      this.borderRadius = '8px'
    } else {
      this.borderRadius = 'unset'
    }
  }
}
</script>
<style lang="scss" scoped>
.marquee {
  margin: 0 auto;
  white-space: nowrap;
  overflow: hidden;
  box-sizing: border-box;
  span {
    display: inline-block;
    // padding-left: 100%;
    animation: marquee 25s linear infinite;
    font-size: 0.765rem;
    &:hover {
      animation-play-state: paused;
    }
  }
  @keyframes marquee {
    0% {
      transform: translate(0, 0);
    }
    100% {
      transform: translate(-100%, 0);
    }
  }
}
</style>
