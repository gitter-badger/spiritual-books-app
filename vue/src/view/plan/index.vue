<template>
<section>
  <v-toolbar fixed short tile dense flat color="info" dark>
    <v-spacer></v-spacer>
    <v-btn icon small @click="prev">
      <v-icon>skip_previous</v-icon>
    </v-btn>
    <v-toolbar-title>{{title}}</v-toolbar-title>
    <v-btn icon small @click="next">
      <v-icon>skip_next</v-icon>
    </v-btn>
    <v-spacer></v-spacer>
    <v-menu left top transition="slide-y-transition">
      <template v-slot:activator="{on}">
        <v-btn icon small v-on="on">
          <v-icon>more_vert</v-icon>
        </v-btn>
      </template>
      <v-list tile flat>
        <v-list-item to="/list">
          <v-list-item-title>计划列表</v-list-item-title>
        </v-list-item>
        <v-list-item to="/add">
          <v-list-item-title>创建计划</v-list-item-title>
        </v-list-item>
      </v-list>
    </v-menu>
  </v-toolbar>
  <v-calendar
    ref="calendar"
    :locale="lang"
    v-model="focus"
    color="primary"
    :events="events"
    :event-color="getEventColor"
    type="month"
    @click:event="showEvent"
    @click:more="viewDay"
    @change="updateRange"
  ></v-calendar>
  <v-menu v-model="selectedOpen" :close-on-content-click="false" :activator="selectedElement" offset-x>
    <v-card flat min-width="240px">
      <v-card-title class="subtitle-2 grey lighten-2 py-1 px-2" primary-title>
        <span v-text="plan"></span>
        <v-spacer></v-spacer>
        <v-btn icon small @click="selectedOpen=false">
          <v-icon>close</v-icon>
        </v-btn>
      </v-card-title>
      <v-card-text class="pa-2">
        <span v-html="selectedEvent.name+selectedEvent.name+selectedEvent.name+selectedEvent.name"></span>
      </v-card-text>
      <v-divider></v-divider>
      <v-card-actions class="justify-end">
        <v-btn icon small color="primary">
          <v-icon>arrow_forward</v-icon>
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-menu>
</section>
</template>
<script>
import { stg } from '@/util/index'
export default {
  name: 'App',
  data() {
    return {
      focus: '',
      lang: stg().getItem('lang'),
      start: null,
      end: null,
      selectedEvent: {},
      selectedElement: null,
      selectedOpen: false,
      plan: null,
      events: [],
      status: null,
      colors: ['blue', 'indigo', 'deep-purple', 'cyan', 'green', 'orange', 'grey darken-1'],
      names: ['Meeting', 'Holiday', 'PTO', 'Travel', 'Event', 'Birthday', 'Conference', 'Party']
    }
  },
  computed: {
    title() {
      const { start, end } = this
      if (!start || !end) {
        return ''
      }

      const startMonth = this.monthFormatter(start)

      const startYear = start.year
      return `${startMonth} ${startYear}`
    },
    monthFormatter() {
      return this.$refs.calendar.getFormatter({
        timeZone: 'UTC', month: 'long'
      })
    }
  },
  methods: {
    viewDay({ date }) {
      this.focus = date
    },
    getEventColor(event) {
      return event.state ? 'green' : 'orange'
    },
    prev() {
      this.$refs.calendar.prev()
    },
    next() {
      this.$refs.calendar.next()
    },
    showEvent({ nativeEvent, event }) {
      const open = () => {
        this.selectedEvent = event
        this.selectedElement = nativeEvent.target
        setTimeout(() => {
          this.selectedOpen = true
        }, 10)
      }

      if (this.selectedOpen) {
        this.selectedOpen = false
        setTimeout(open, 10)
      } else {
        open()
      }

      nativeEvent.stopPropagation()
    },
    updateRange({ start, end }) {
      this.start = start
      this.end = end
      const events = []
      const min = new Date(`${start.date}T00:00:00`)
      const max = new Date(`${start.date}T23:59:59`)
      // const days = (max.getTime() - min.getTime()) / 86400000
      for (let i = 0; i < 21; i++) {
        min.setDate(min.getDate() + i)
        max.setDate(max.getDate() + i)
        events.push({
          name: `马太福音第${i + 0}章`,
          start: this.formatDate(min),
          end: this.formatDate(max),
          state: Boolean(Math.round(Math.random()))
        })
      }
      this.events = events
    },
    nth(d) {
      return d > 3 && d < 21
        ? 'th'
        : ['th', 'st', 'nd', 'rd', 'th', 'th', 'th', 'th', 'th', 'th'][d % 10]
    },
    rnd(a, b) {
      return Math.floor((b - a + 1) * Math.random()) + a
    },
    formatDate(a) {
      return `${a.getFullYear()}-${a.getMonth() + 1}-${a.getDate()}`
    }
  }
}
</script>
