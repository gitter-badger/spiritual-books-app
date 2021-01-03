<template>
<section>
  <svg v-show="state===1" viewBox="0 0 64 64" style="width:52px;height:52px;">
    <g>
      <circle cx="16" cy="32" stroke-width="0" r="3" fill="#f3b72e">
        <animate attributeName="fill-opacity" dur="750ms" values=".5;.6;.8;1;.8;.6;.5;.5" repeatCount="indefinite"></animate>
        <animate attributeName="r" dur="750ms" values="3;3;4;5;6;5;4;3" repeatCount="indefinite"></animate>
      </circle>
      <circle cx="32" cy="32" stroke-width="0" r="3.09351" fill="#E8574E">
        <animate attributeName="fill-opacity" dur="750ms" values=".5;.5;.6;.8;1;.8;.6;.5" repeatCount="indefinite">
        </animate><animate attributeName="r" dur="750ms" values="4;3;3;4;5;6;5;4" repeatCount="indefinite"></animate>
      </circle>
      <circle cx="48" cy="32" stroke-width="0" r="4.09351" fill="#43A976">
        <animate attributeName="fill-opacity" dur="750ms" values=".6;.5;.5;.6;.8;1;.8;.6" repeatCount="indefinite"></animate>
        <animate attributeName="r" dur="750ms" values="5;4;3;3;4;5;6;5" repeatCount="indefinite"></animate>
      </circle>
    </g>
  </svg>
  <span :style="{color}" v-show="state===0" v-text="text"></span>
</section>

</template>
<script>
export default {
  props: {
    state: Number,
    text: {
      type: String,
      default: '-- 没有更多 --'
    },
    color: {
      type: String,
      default: '#aaa'
    }
  }
}
</script>
<style scoped>
section {
  width: 100%;
  text-align: center;
  height: 2.25rem;
  /* line-height: 2.6rem; */
}
</style>
