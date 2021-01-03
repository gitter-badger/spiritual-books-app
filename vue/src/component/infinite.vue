<template>
  <div class="infinite">
    <div class="content" :class="{'is-dropped':topDropped||bottomDropped}" :style="{'transform':transform}">
      <slot name="top">
        <div class="top" v-if="reload">
          <svg class="arrow" v-show="topStatus!=='loading'" :class="{active:topStatus==='drop'}" :fill="tipColor" viewBox="0 0 63.657 63.657" style="enable-background:new 0 0 63.657 63.657;" xml:space="preserve">
            <g><polygon points="31.891,63.657 0.012,35.835 2.642,32.821 31.886,58.343 61.009,32.824 63.645,35.832" /></g>
            <g><rect x="29.827" width="4" height="60" /></g>
          </svg>
          <span class="text" :style="{color:tipColor}" v-text="topText"></span>
          <svg class="spinner" v-show="topStatus==='loading'" style="width:32px;height:32px;" :stroke="spinnerColor" viewBox="0 0 64 64">
            <g stroke-width="7" stroke-linecap="round">
              <line x1="10" x2="10" y1="27.3836" y2="36.4931">
                <animate attributeName="y1" dur="750ms" values="16;18;28;18;16;16" repeatCount="indefinite"></animate>
                <animate attributeName="y2" dur="750ms" values="48;46;36;44;48;48" repeatCount="indefinite"></animate>
                <animate attributeName="stroke-opacity" dur="750ms" values="1;.4;.5;.8;1;1" repeatCount="indefinite"></animate>
              </line>
              <line x1="24" x2="24" y1="18.6164" y2="45.3836">
                <animate attributeName="y1" dur="750ms" values="16;16;18;28;18;16" repeatCount="indefinite"></animate>
                <animate attributeName="y2" dur="750ms" values="48;48;46;36;44;48" repeatCount="indefinite"></animate>
                <animate attributeName="stroke-opacity" dur="750ms" values="1;1;.4;.5;.8;1" repeatCount="indefinite"></animate>
              </line>
              <line x1="38" x2="38" y1="16.1233" y2="47.8767">
                <animate attributeName="y1" dur="750ms" values="18;16;16;18;28;18" repeatCount="indefinite"></animate>
                <animate attributeName="y2" dur="750ms" values="44;48;48;46;36;44" repeatCount="indefinite"></animate>
                <animate attributeName="stroke-opacity" dur="750ms" values=".8;1;1;.4;.5;.8" repeatCount="indefinite"></animate>
              </line>
              <line x1="52" x2="52" y1="16" y2="48">
                <animate attributeName="y1" dur="750ms" values="28;18;16;16;18;28" repeatCount="indefinite"></animate>
                <animate attributeName="y2" dur="750ms" values="36;44;48;48;46;36" repeatCount="indefinite"></animate>
                <animate attributeName="stroke-opacity" dur="750ms" values=".5;.8;1;1;.4;.5" repeatCount="indefinite"></animate>
              </line>
            </g>
          </svg>
          <!-- <div class="nodata" v-show="topStatus==='loading'"></div> -->
        </div>
      </slot>
      <slot></slot>
      <slot name="bottom">
        <loading :state="state" :color="tipColor" :text="nodataText" class="spinner"></loading>
        <div class="bottom" v-show="infinite&&bottomStatus!==''">
          <span class="text" :style="{color:tipColor}" v-text="bottomText"></span>
          <svg class="arrow" v-show="bottomStatus!=='loading'" :class="{active:bottomStatus==='drop'}" :fill="tipColor" viewBox="0 0 63.657 63.657" style="enable-background:new 0 0 63.657 63.657;" xml:space="preserve">
            <g><polygon points="31.891,63.657 0.012,35.835 2.642,32.821 31.886,58.343 61.009,32.824 63.645,35.832" /></g>
            <g><rect x="29.827" width="4" height="60" /></g>
          </svg>
        </div>
      </slot>
    </div>
  </div>
</template>

<script type="text/babel">
import loading from './loading'
export default {
  name: 'infinite',
  components: { loading },
  props: {
    maxDistance: {
      type: Number,
      default: 0
    },
    autoFill: {
      type: Boolean,
      default: true
    },
    distanceIndex: {
      type: Number,
      default: 2
    },
    topPullText: {
      type: String,
      default: '下拉刷新'
    },
    topDropText: {
      type: String,
      default: '释放更新'
    },
    topLoadingText: {
      type: String,
      default: '加载中...'
    },
    topDistance: {
      type: Number,
      default: 70
    },
    reload: {
      type: Function
    },
    bottomPullText: {
      type: String,
      default: '上拉加载'
    },
    bottomDropText: {
      type: String,
      default: '释放加载'
    },
    bottomLoadingText: {
      type: String,
      default: '加载中...'
    },
    bottomDistance: {
      type: Number,
      default: 70
    },
    nodataText: {
      type: String,
      default: '-- 没有更多 --'
    },
    infinite: {
      type: Function
    },
    bottomAllLoaded: {
      type: Boolean,
      default: false
    },
    spinnerColor: {
      type: String,
      default: '#4b8bf4'
    },
    tipColor: {
      type: String,
      default: '#aaa'
    }
  },
  data() {
    return {
      translate: 0,
      scrollEventTarget: null,
      containerFilled: false,
      topText: '',
      topDropped: false,
      bottomText: '',
      bottomDropped: false,
      bottomReached: false,
      direction: '',
      startY: 0,
      startScrollTop: 0,
      currentY: 0,
      topStatus: '',
      bottomStatus: ''
    }
  },
  computed: {
    transform() {
      return this.translate === 0 ? null : `translate3d(0,${this.translate}px, 0)`
    },
    state() {
      if (this.bottomAllLoaded) {
        console.log(this.bottomAllLoaded)
        return 0
      } else if (this.bottomStatus === 'loading') {
        return 1
      } else {
        return null
      }
    }
  },
  watch: {
    topStatus(val) {
      // this.$emit('top-status-change', val)
      switch (val) {
        case 'pull':
          this.topText = this.topPullText
          break
        case 'drop':
          this.topText = this.topDropText
          break
        case 'loading':
          this.topText = ''
          break
      }
    },
    bottomStatus(val) {
      switch (val) {
        case 'pull':
          this.bottomText = this.bottomPullText
          break
        case 'drop':
          this.bottomText = this.bottomDropText
          break
        case 'loading':
          this.bottomText = ''
          break
      }
    }
  },
  methods: {
    onTopLoaded() {
      this.translate = 0
      setTimeout(() => {
        this.topStatus = 'pull'
      }, 200)
    },
    onBottomLoaded() {
      this.bottomStatus = ''
      this.bottomDropped = false
      this.$nextTick(() => {
        // if (this.scrollEventTarget === window) {
        //   document.body.scrollTop += 50
        // } else {
        //   this.scrollEventTarget.scrollTop += 50
        // }
        this.translate = 0
      })
      if (!this.bottomAllLoaded && !this.containerFilled) {
        this.fillContainer()
      }
    },
    getScrollEventTarget(element) {
      let currentNode = element
      let overflowY
      while (currentNode && currentNode.tagName !== 'HTML' &&
        currentNode.tagName !== 'BODY' && currentNode.nodeType === 1) {
        overflowY = document.defaultView.getComputedStyle(currentNode).overflowY
        if (overflowY === 'scroll' || overflowY === 'auto') {
          return currentNode
        }
        currentNode = currentNode.parentNode
      }
      return window
    },
    getScrollTop(element) {
      if (element === window) {
        return Math.max(window.pageYOffset || 0, document.documentElement.scrollTop)
      } else {
        return element.scrollTop
      }
    },
    bindTouchEvents() {
      this.$el.addEventListener('touchstart', this.handleTouchStart)
      this.$el.addEventListener('touchmove', this.handleTouchMove)
      this.$el.addEventListener('touchend', this.handleTouchEnd)
    },
    init() {
      this.topStatus = 'pull'
      this.bottomStatus = 'pull'
      this.topText = this.topPullText
      this.scrollEventTarget = this.getScrollEventTarget(this.$el)
      if (typeof this.infinite === 'function') {
        this.fillContainer()
        this.bindTouchEvents()
      }
      if (typeof this.reload === 'function') {
        this.bindTouchEvents()
      }
    },
    fillContainer() {
      if (this.autoFill) {
        this.$nextTick(() => {
          if (this.scrollEventTarget === window) {
            this.containerFilled = this.$el.getBoundingClientRect().bottom >= document.documentElement.getBoundingClientRect().bottom
          } else {
            this.containerFilled = this.$el.getBoundingClientRect().bottom >= this.scrollEventTarget.getBoundingClientRect().bottom
          }
          if (!this.containerFilled) {
            this.bottomStatus = 'loading'
            this.infinite()
          }
        })
      }
    },
    checkBottomReached() {
      if (this.scrollEventTarget === window) {
        /**
         * fix:scrollTop===0
         */
        return document.documentElement.scrollTop || document.body.scrollTop + document.documentElement.clientHeight >= document.body.scrollHeight
      } else {
        return parseInt(this.$el.getBoundingClientRect().bottom) <= parseInt(this.scrollEventTarget.getBoundingClientRect().bottom) + 1
      }
    },
    handleTouchStart(event) {
      this.startY = event.touches[0].clientY
      this.startScrollTop = this.getScrollTop(this.scrollEventTarget)
      this.bottomReached = false
      if (this.topStatus !== 'loading') {
        this.topStatus = 'pull'
        this.topDropped = false
      }
      if (this.bottomStatus !== 'loading') {
        this.bottomStatus = ''
        this.bottomDropped = false
      }
    },
    handleTouchMove(event) {
      if (this.startY < this.$el.getBoundingClientRect().top && this.startY > this.$el.getBoundingClientRect().bottom) {
        return
      }
      this.currentY = event.touches[0].clientY
      const distance = (this.currentY - this.startY) / this.distanceIndex
      this.direction = distance > 0 ? 'down' : 'up'
      if (typeof this.reload === 'function' && this.direction === 'down' &&
        this.getScrollTop(this.scrollEventTarget) === 0 && this.topStatus !== 'loading') {
        event.cancelable && event.preventDefault()
        event.stopPropagation()
        if (this.maxDistance > 0) {
          this.translate = distance <= this.maxDistance ? distance - this.startScrollTop : this.translate
        } else {
          this.translate = distance - this.startScrollTop
        }
        if (this.translate < 0) {
          this.translate = 0
        }
        this.topStatus = this.translate >= this.topDistance ? 'drop' : 'pull'
      }
      if (this.direction === 'up') {
        this.bottomReached = this.bottomReached || this.checkBottomReached()
      }
      if (typeof this.infinite === 'function' && this.direction === 'up' && this.bottomReached && this.bottomStatus !== 'loading' && !this.bottomAllLoaded) {
        event.cancelable && event.preventDefault()
        event.stopPropagation()
        if (this.maxDistance > 0) {
          this.translate = Math.abs(distance) <= this.maxDistance
            ? this.getScrollTop(this.scrollEventTarget) - this.startScrollTop + distance : this.translate
        } else {
          this.translate = this.getScrollTop(this.scrollEventTarget) - this.startScrollTop + distance
        }
        if (this.translate > 0) {
          this.translate = 0
        }
        this.bottomStatus = -this.translate >= this.bottomDistance ? 'drop' : 'pull'
      }
    },
    handleTouchEnd() {
      if (this.direction === 'down' && this.getScrollTop(this.scrollEventTarget) === 0 && this.translate > 0) {
        this.topDropped = true
        if (this.topStatus === 'drop') {
          this.translate = 50
          this.topStatus = 'loading'
          this.reload()
        } else {
          this.translate = 0
          this.topStatus = 'pull'
        }
      } else if (this.direction === 'up' && this.bottomReached && this.translate < 0) {
        this.bottomDropped = true
        this.bottomReached = false
        if (this.bottomStatus === 'drop') {
          this.translate = -50
          this.bottomStatus = 'loading'
          this.infinite()
        } else {
          this.translate = 0
          this.bottomStatus = ''
        }
      }
      this.direction = ''
    }
  },
  mounted() {
    this.init()
  }
}
</script>
<style lang="scss" scoped>
.infinite {
  overflow: hidden;
  .content {
    padding: 10px;
    .is-dropped {
      transition: .2s;
    }
    .spinner {
      // display: inline-block;
      margin-right: 5px;
      margin-bottom: -15px;
      vertical-align: middle;
    }
    .top, .bottom {
      text-align: center;
      height: 50px;
      line-height: 50px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-direction: column;
      .text {
        font-size: 14px;
        line-height: 20px;
      }
      .arrow {
        width: 34px;
        height: 30px;
        margin: 4px auto 0 auto;
      }
    }
    .top {
      margin-top: -60px;
      margin-bottom: 10px;
      .arrow {
        -webkit-transform: translate3d(0,0,0) rotate(0deg);
        transform: translate3d(0,0,0) rotate(0deg);
        -webkit-transition: -webkit-transform .2s linear;
        transition: transform .2s linear;
      }
      .active.arrow {
        -webkit-transform: translate3d(0,0,0) rotate(180deg);
        transform: translate3d(0,0,0) rotate(180deg);
      }
    }
    .bottom {
      // margin-bottom: -50px;
      .arrow {
        -webkit-transform: translate3d(0,0,0) rotate(180deg);
        transform: translate3d(0,0,0) rotate(180deg);
        -webkit-transition: -webkit-transform .2s linear;
        transition: transform .2s linear;
      }
      .active.arrow {
        -webkit-transform: translate3d(0,0,0) rotate(0deg);
        transform: translate3d(0,0,0) rotate(0deg);
      }
    }
  }
}
</style>
