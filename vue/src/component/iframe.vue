<template>
<section></section>
</template>

<script>
import { debounce } from '@/util/index'

export default {
  name: 'iframe-vue',
  props: {
    src: {
      type: String,
      required: true
    },
    target: {
      type: String,
      required: false,
      default: '_parent'
    },
    // className: {
    //   type: String,
    //   required: false
    // },
    allow: {
      type: String,
      required: false
    },
    onload: {
      type: Function,
      required: false
    }
  },
  data() {
    return {
      // bible
    }
  },
  watch: {
    src() {
      console.log('src reinitIframe')
      this.reinitIframe(this)
    }
  },
  mounted() {
    console.log('iframe mounted')
    // this.initIframe()
  },
  methods: {
    removeIframe() {
      if (this.iframeEl) {
        while (this.$el.firstChild) {
          this.$el.removeChild(this.$el.firstChild)
        }
      }
    },
    reinitIframe: debounce((vm) => {
      vm.removeIframe()
      vm.initIframe()
    }, 200),
    initIframe() {
      this.iframeEl = document.createElement('iframe')
      this.iframeEl.setAttribute('style', 'height:100%;width:100%;border:none')
      this.iframeEl.setAttribute('scrolling', 'auto')
      this.iframeEl.setAttribute('seamless', 'seamless')
      this.iframeEl.setAttribute('frameborder', '0')
      // this.iframeEl.setAttribute('crossorigin', this.crossorigin)
      this.iframeEl.setAttribute('src', this.src)
      this.iframeEl.setAttribute('target', this.target)
      // if (this.className) this.iframeEl.setAttribute('class', this.className)
      if (this.allow) this.iframeEl.setAttribute('allow', this.allow)
      this.$el.appendChild(this.iframeEl)
      const vm = this
      this.iframeEl.onload = function() {
        const doc = this.contentWindow.document
        const meta = doc.createElement('meta')
        meta.setAttribute('content', 'Content-Type')
        meta.setAttribute('httpEquiv', 'text/html;charset=utf-8')
        doc.head.appendChild(meta)
        vm.onload(doc)
      }
    }
  }
}
</script>
