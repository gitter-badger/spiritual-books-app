<template>
  <div class="wrapper">
    <div @click="cancel()" v-if="visible" class="back-bord" />
    <!--支持插槽-->
    <!-- <slot></slot> -->

    <!--默认输入框-->
    <div ref="inputBlock" @click="visible=true" v-if="defaultType" class="data-show">
      <div :class="['data-show-block',{active:inputValue.length===n-1}]" :style="{'borderColor':isErr?'#ff5252':'#87909b'}" v-for="n in 7" :key="n">
        {{ inputValue[n - 1] }}
      </div>
    </div>
    <div v-if="isErr" class="data-error">请输入正确车牌号</div>
    <!--键盘-->
    <transition name="keybordSlide">
      <div v-if="visible" class="keybord-wrap">
        <header class="keybord-header">
          <span @click.stop="cancel()">取消</span>
          <span :class="[{ gray: inputValue.length !== 7 }]" @click.stop="submit()">完成</span>
        </header>
        <div class="keybord-keys">
          <ul class="keybord-keys-word-wrap" v-if="keybordType === '字'">
            <li @click.stop="inputWord(item)" class="button" v-for="item in wordList.slice(0, 30)" :key="item">
              {{ item }}
            </li>
          </ul>
          <div v-else>
            <ul class="keybord-keys-abc-wrap">
              <li
                @click.stop="inputWord(item)"
                class="button"
                v-for="item in abcList.slice(0, 10)"
                :key="item"
              >
                {{ item }}
              </li>
            </ul>
            <ul class="keybord-keys-abc-wrap">
              <li
                @click.stop="inputWord(item)"
                class="button"
                v-for="item in abcList.slice(10, 20)"
                :key="item"
              >
                {{ item }}
              </li>
            </ul>
            <ul class="keybord-keys-abc-wrap-short">
              <li
                @click.stop="inputWord(item)"
                class="button"
                v-for="item in abcList.slice(20, 29)"
                :key="item"
              >
                {{ item }}
              </li>
            </ul>
          </div>

          <div class="keybord-keys-bottom">
            <div @click.stop="toggle()" class="big-button">
              {{ keybordType }}
            </div>
            <ul class="keybord-keys-bottom-line">
              <li class="button" v-for="item in judgeList" :key="item">
                {{ item }}
              </li>
            </ul>
            <div @click.stop="deleteOne()" class="big-button">
              <i class="material-icons md-36">backspace</i>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script>
export default {
  name: 'InputCar',
  props: {
    defaultType: {
      type: Boolean,
      default: true
    }
  },
  data: function() {
    return {
      placehoderDom: null,
      keybordType: '字',
      inputValue: [],
      visible: false,
      isErr: false,
      wordList: [
        '京',
        '津',
        '渝',
        '沪',
        '冀',
        '晋',
        '辽',
        '吉',
        '黑',
        '苏',
        '浙',
        '皖',
        '闽',
        '赣',
        '鲁',
        '豫',
        '鄂',
        '湘',
        '粤',
        '琼',
        '川',
        '贵',
        '云',
        '陕',
        '甘',
        '青',
        '蒙',
        '桂',
        '宁',
        '新',
        '藏',
        '使',
        '领',
        '警',
        '学',
        '港',
        '澳'
      ],
      abcList: [
        1,
        2,
        3,
        4,
        5,
        6,
        7,
        8,
        9,
        0,
        'Q',
        'W',
        'E',
        'R',
        'T',
        'Y',
        'U',
        'I',
        'O',
        'P',
        'A',
        'S',
        'D',
        'F',
        'G',
        'H',
        'J',
        'K',
        'L',
        'Z',
        'X',
        'C',
        'V',
        'B',
        'N',
        'M'
      ],
      reg: /^(([京津沪渝冀豫云辽黑湘皖鲁新苏浙赣鄂桂甘晋蒙陕吉闽贵粤青藏川宁琼使领][A-Z](([0-9]{5}[DF])|([DF]([A-HJ-NP-Z0-9])[0-9]{4})))|([京津沪渝冀豫云辽黑湘皖鲁新苏浙赣鄂桂甘晋蒙陕吉闽贵粤青藏川宁琼使领][A-Z][A-HJ-NP-Z0-9]{4}[A-HJ-NP-Z0-9挂学警港澳使领]))$/
    }
  },
  computed: {
    judgeList() {
      if (this.keybordType === 'ABC') {
        return this.abcList.slice(29, 36)
      } else {
        return this.wordList.slice(30, 37)
      }
    }
  },
  methods: {
    // 键盘类型切换
    toggle() {
      if (this.inputValue.length === 0 || (this.inputValue.length > 0 && this.inputValue.length < 6)) return
      this.keybordType = this.keybordType === 'ABC' ? '字' : 'ABC'
    },
    // 文字输入
    inputWord(word) {
      if (this.inputValue.length === 7) return
      this.inputValue.push(word)
    },
    // 删除一个字符
    deleteOne() {
      this.inputValue.pop()
    },
    // 取消
    cancel() {
      this.visible = false
      this.inputValue = []
      // this.$emit('submit', this.inputValue.join(''))
    },
    // 完成
    submit() {
      if (this.inputValue.length === 7) {
        if (this.reg.test(this.inputValue.join(''))) {
          this.$emit('submit', this.inputValue.join(''))
          this.visible = false
        } else {
          this.isErr = true
        }
      }
    },
    // 判断展示框是否被键盘挡住
    checkInputLocation() {
      const clientHeight = document.documentElement.clientHeight
      const scrollHeight = document.documentElement.scrollHeight
      const inputTopHeight = this.$refs.inputBlock.getBoundingClientRect().top
      const inputHeight = this.$refs.inputBlock.scrollHeight
      // 如果键盘被挡住，并且页面没有滚动条,返回true
      if (inputHeight + 250 + inputTopHeight >= clientHeight && scrollHeight === clientHeight) {
        return true
      } else {
        return false
      }
    }
  },
  created() {
    this.placehoderDom = document.createElement('div')
    this.placehoderDom.style.cssText = 'height: 260px;width: 100%;background: red;opacity:0'
    this.placehoderDom.style.display = 'none'
    document.body.appendChild(this.placehoderDom)
  },
  watch: {
    inputValue(key) {
      this.isErr = false
      if (this.inputValue.length === 0) this.keybordType = '字'
      if (this.inputValue.length > 0 && this.inputValue.length < 7) this.keybordType = 'ABC'
    },
    visible(type) {
      if (type) {
        // 键盘唤醒并且键盘挡住输入框,同时页面无滚动条时，占位块展示出来从而使页面可以通过scrllTo()来滚动
        if (this.checkInputLocation()) {
          this.placehoderDom.style.display = 'block'
        }
        window.scrollTo(0, 250)
      } else {
        // document.body.scrollIntoView({
        //   block: 'start',
        //   behavior: 'smooth'
        // })
        // this.placehoderDom.style.display = 'none'
      }
    }
  }
}
</script>
<style lang="scss" scoped>
.wrapper {
  // padding: 10px 10px 20px 10px;
  padding: 5px 0 10px 0;
  height: 50px;
  .data-show {
    position: relative;
    // z-index: 99;
    width: 100%;
    // padding: 15px 15px 0;
    column-count: 7;
    column-gap: 5px;
    min-width: 200px;
    .data-show-block {
      display: flex;
      height: 0;
      align-items: center;
      justify-content: center;
      border: 1px solid;
      padding: 50% 0;
      color: #87909b;
    }
    .active {
      border: 1px solid #4ad5c2;
    }
  }
  .data-error {
    position: relative;
    z-index: 99;
    width: 100%;
    color: #ff5252;
    font-size: 10pt;
    // padding: 0 15px 15px;
    -webkit-column-gap: 5px;
    -moz-column-gap: 5px;
    column-gap: 5px;
  }
}
.keybordSlide-enter-active,.keybordSlide-leave-active {
  transition: all 0.2s linear;
  transform: translateY(0px);
}
.keybordSlide-enter, .keybordSlide-leave-to {
  transform: translateY(250px);
}
.back-bord {
  width: 100vw;
  overflow-y: scroll;
  height: calc(100vh + 250px);
  position: fixed;
  top: 0;
  left: 0;
  z-index: 9;
}
.gray {
  color: rgb(173, 171, 171);
}
.keybord-wrap {
  padding-bottom: 0;
  position: fixed;
  z-index: 999;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 250px;
  background: rgb(192, 192, 196);
  .keybord-header {
    padding: 0 15px;
    height: 40px;
    line-height: 40px;
    display: flex;
    justify-content: space-between;
    background: rgb(240, 240, 240);
  }
  .keybord-keys {
    padding: 5px 5px 15px 5px;
    box-sizing: border-box;
    .keybord-keys-word-wrap {
      list-style: none;
      padding: 0;
      margin: 0;
      column-count: 10;
      column-gap: 5px;
    }
    .keybord-keys-abc-wrap {
      list-style: none;
      padding: 0;
      margin: 0;
      column-count: 10;
      column-gap: 5px;
    }
    .keybord-keys-abc-wrap-short {
      list-style: none;
      padding: 0;
      margin: 0;
      column-count: 9;
      column-gap: 5px;
      padding: 0 13px;
    }
    .keybord-keys-bottom {
      display: flex;
      justify-content: space-between;
      .keybord-keys-bottom-line {
        width: 100%;
        margin: 0;
        padding: 0 5px;
        list-style: none;
        column-count: 7;
        column-gap: 5px;
      }
    }
  }
}
.button {
  &:active {
    background: rgb(240, 237, 237);
  }
  text-align: center;
  line-height: 40px;
  height: 40px;
  border-radius: 5px;
  background: white;
  color: black;
  margin-bottom: 7px;
}
.big-button {
  &:active {
    background: white;
  }
  width: 15vw;
  height: 40px;
  background: rgb(139, 138, 138);
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 5px;
  color: white;
  img {
    width: 65%;
    height: 20px;
  }
}
</style>
