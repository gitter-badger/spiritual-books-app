/* *
 * @summary Create an Event work-alike object based on the provided dictionary.
 * The event should contain all of the same properties from the dict.
 *
 * @extends {Event}
 */
class FakeEvent {
  /* *
   * @param {string} type
   * @param {Object=} dict
   */
  constructor(type, dict = {}) {
    // Take properties from dict if present.
    for (const key in dict) {
      Object.defineProperty(this, key, {
        value: dict[key],
        writable: true,
        enumerable: true
      })
    }

    // The properties below cannot be set by the dict.  They are all provided
    // for compatibility with native events.

    /* * @const {boolean} */
    this.bubbles = false

    /* * @type {boolean} */
    this.cancelable = false

    /* * @type {boolean} */
    this.defaultPrevented = false

    /* *
     * According to MDN, Chrome uses high-res timers instead of epoch time.
     * Follow suit so that timeStamps on FakeEvents use the same base as
     * on native Events.
     * @const {number}
     * @see https://developer.mozilla.org/en-US/docs/Web/API/Event/timeStamp
     */
    this.timeStamp = performance && performance.now
      ? performance.now() : Date.now()

    /* * @const {string} */
    this.type = type

    /* * @const {boolean} */
    this.isTrusted = false

    /* * @type {EventTarget} */
    this.currentTarget = null

    /* * @type {EventTarget} */
    this.target = null

    /* *
     * Non-standard property read by FakeEventTarget to stop processing
     * listeners.
     * @type {boolean}
     */
    this.stopped = false
  }

  /* *
   * Prevents the default action of the event.  Has no effect if the event isn't
   * cancellable.
   * @override
   */
  preventDefault() {
    if (this.cancelable) {
      this.defaultPrevented = true
    }
  }

  /* *
   * Stops processing event listeners for this event.  Provided for
   * compatibility with native Events.
   * @override
   */
  stopImmediatePropagation() {
    this.stopped = true
  }

  /* *
   * Does nothing, since FakeEvents do not bubble.  Provided for compatibility
   * with native Events.
   * @override
   */
  stopPropagation() {}
}

/* *
 * @summary A simple multimap template.
 * @template T
 */
class MultiMap {
  constructor() {
    /* * @private {!Object.<string, !Array.<T>>} */
    this.map_ = {}
  }
  /* *
   * Add a key, value pair to the map.
   * @param {string} key
   * @param {T} value
   */
  push(key, value) {
    if (Object.prototype.hasOwnProperty.call(this.map_, key)) {
      this.map_[key].push(value)
    } else {
      this.map_[key] = [value]
    }
  }
  /* *
   * Get a list of values by key.
   * @param {string} key
   * @return {Array.<T>} or null if no such key exists.
   */
  get(key) {
    const list = this.map_[key]
    // slice() clones the list so that it and the map can each be modified
    // without affecting the other.
    return list ? list.slice() : null
  }
  /* *
   * Get a list of all values.
   * @return {!Array.<T>}
   */
  getAll() {
    const list = []
    for (const key in this.map_) {
      list.push(...this.map_[key])
    }
    return list
  }
  /* *
   * Remove a specific value, if it exists.
   * @param {string} key
   * @param {T} value
   */
  remove(key, value) {
    if (!(key in this.map_)) {
      return
    }
    this.map_[key] = this.map_[key].filter((i) => i !== value)
  }
  /* *
   * Clear all keys and values from the multimap.
   */
  clear() {
    this.map_ = {}
  }
  /* *
   * @param {function(string, !Array.<T>)} callback
   */
  forEach(callback) {
    for (const key in this.map_) {
      callback(key, this.map_[key])
    }
  }
}

/* *
 * @summary A work-alike for EventTarget.  Only DOM elements may be true
 * EventTargets, but this can be used as a base class to provide event dispatch
 * to non-DOM classes.  Only FakeEvents should be dispatched.
 *
 * @implements {EventTarget}
 * @exportInterface
 */
class FakeEventTarget {
  constructor() {
    /* *
     * @private {!MultiMap.<FakeEventTarget.ListenerType>}
     */
    this.listeners_ = new MultiMap()

    /* *
     * The target of all dispatched events.  Defaults to |this|.
     * @type {EventTarget}
     */
    this.dispatchTarget = this
  }

  /* *
   * Add an event listener to this object.
   *
   * @param {string} type The event type to listen for.
   * @param {FakeEventTarget.ListenerType} listener The callback or
   *   listener object to invoke.
   * @param {(!AddEventListenerOptions|boolean)=} options Ignored.
   * @override
   * @exportInterface
   */
  addEventListener(type, listener, options) {
    this.listeners_.push(type, listener)
  }

  /* *
   * Remove an event listener from this object.
   *
   * @param {string} type The event type for which you wish to remove a
   *   listener.
   * @param {FakeEventTarget.ListenerType} listener The callback or
   *   listener object to remove.
   * @param {(EventListenerOptions|boolean)=} options Ignored.
   * @override
   * @exportInterface
   */
  removeEventListener(type, listener, options) {
    this.listeners_.remove(type, listener)
  }

  /* *
   * Dispatch an event from this object.
   *
   * @param {!Event} event The event to be dispatched from this object.
   * @return {boolean} True if the default action was prevented.
   * @override
   * @exportInterface
   */
  dispatchEvent(event) {
    // In many browsers, it is complex to overwrite properties of actual Events.
    // Here we expect only to dispatch FakeEvents, which are simpler.
    console.assert(event instanceof FakeEvent,
      'FakeEventTarget can only dispatch FakeEvents!')

    const listeners = this.listeners_.get(event.type) || []

    // Execute this event on listeners until the event has been stopped or we
    // run out of listeners.
    for (const listener of listeners) {
      // Do this every time, since events can be re-dispatched from handlers.
      event.target = this.dispatchTarget
      event.currentTarget = this.dispatchTarget

      try {
        // Check for the |handleEvent| member to test if this is a
        // |EventListener| instance or a basic function.
        if (listener.handleEvent) {
          listener.handleEvent(event)
        } else {
          // eslint-disable-next-line no-restricted-syntax
          listener.call(this, event)
        }
      } catch (exception) {
        // Exceptions during event handlers should not affect the caller,
        // but should appear on the console as uncaught, according to MDN:
        // https://mzl.la/2JXgwRo
        console.error('Uncaught exception in event handler', exception,
          exception ? exception.message : null,
          exception ? exception.stack : null)
      }

      if (event.stopped) {
        break
      }
    }

    return event.defaultPrevented
  }
}

// import IReleasable from '../util/i_releasable'

/* *
 * @summary
 * An EventManager maintains a collection of 'event
 * bindings' between event targets and event listeners.
 *
 * @implements {IReleasable}
 * @export
 */
class EventManager {
  constructor() {
    /* *
     * Maps an event type to an array of event bindings.
     * @private {MultiMap.<!EventManager.Binding_>}
     */
    this.bindingMap_ = new MultiMap()
  }
  /* *
   * Detaches all event listeners.
   * @override
   * @export
   */
  release() {
    this.removeAll()
    this.bindingMap_ = null
  }
  /* *
   * Attaches an event listener to an event target.
   * @param {EventTarget} target The event target.
   * @param {string} type The event type.
   * @param {EventManager.ListenerType} listener The event listener.
   * @param {(boolean|!AddEventListenerOptions)=} options An object that
   *    specifies characteristics about the event listener.
   *    The passive option, if true, indicates that this function will never
   *    call preventDefault(), which improves scrolling performance.
   * @export
   */
  listen(target, type, listener, options) {
    if (!this.bindingMap_) {
      return
    }

    const binding =
        new EventManager.Binding_(target, type, listener, options)
    this.bindingMap_.push(type, binding)
  }
  /* *
   * Attaches an event listener to an event target.  The listener will be
   * removed when the first instance of the event is fired.
   * @param {EventTarget} target The event target.
   * @param {string} type The event type.
   * @param {EventManager.ListenerType} listener The event listener.
   * @param {(boolean|!AddEventListenerOptions)=} options An object that
   *    specifies characteristics about the event listener.
   *    The passive option, if true, indicates that this function will never
   *    call preventDefault(), which improves scrolling performance.
   * @export
   */
  listenOnce(target, type, listener, options) {
    // Install a shim listener that will stop listening after the first event.
    const shim = (event) => {
      // Stop listening to this event.
      this.unlisten(target, type, shim)
      // Call the original listener.
      listener(event)
    }
    this.listen(target, type, shim, options)
  }
  /* *
   * Detaches an event listener from an event target.
   * @param {EventTarget} target The event target.
   * @param {string} type The event type.
   * @param {EventManager.ListenerType=} listener The event listener.
   * @export
   */
  unlisten(target, type, listener) {
    if (!this.bindingMap_) {
      return
    }

    const list = this.bindingMap_.get(type) || []

    for (const binding of list) {
      if (binding.target === target) {
        if (listener === binding.listener || !listener) {
          binding.unlisten()
          this.bindingMap_.remove(type, binding)
        }
      }
    }
  }
  /* *
   * Detaches all event listeners from all targets.
   * @export
   */
  removeAll() {
    if (!this.bindingMap_) {
      return
    }

    const list = this.bindingMap_.getAll()

    for (const binding of list) {
      binding.unlisten()
    }

    this.bindingMap_.clear()
  }
}
/* *
 * Creates a new Binding_ and attaches the event listener to the event target.
 *
 * @private
 */
EventManager.Binding_ = class {
  /* *
   * @param {EventTarget} target The event target.
   * @param {string} type The event type.
   * @param {EventManager.ListenerType} listener The event listener.
   * @param {(boolean|!AddEventListenerOptions)=} options An object that
   *    specifies characteristics about the event listener.
   *    The passive option, if true, indicates that this function will never
   *    call preventDefault(), which improves scrolling performance.
   */
  constructor(target, type, listener, options) {
    /* * @type {EventTarget} */
    this.target = target

    /* * @type {string} */
    this.type = type

    /* * @type {?EventManager.ListenerType} */
    this.listener = listener

    /* * @type {(boolean|!AddEventListenerOptions)} */
    this.options =
        EventManager.Binding_.convertOptions_(target, options)

    this.target.addEventListener(type, listener, this.options)
  }
  /* *
   * Detaches the event listener from the event target. This does nothing if
   * the event listener is already detached.
   * @export
   */
  unlisten() {
    console.assert(this.target, 'Missing target')
    this.target.removeEventListener(this.type, this.listener, this.options)

    this.target = null
    this.listener = null
    this.options = false
  }

  /* *
   * Converts the provided options value into a value accepted by the browser.
   * Some browsers (e.g. IE11 and Tizen) don't support passing options as an
   * object.  So this detects this case and converts it.
   *
   * @param {EventTarget} target
   * @param {(boolean|!AddEventListenerOptions)=} value
   * @return {(boolean|!AddEventListenerOptions)}
   * @private
   */
  static convertOptions_(target, value) {
    if (value === undefined) {
      return false
    } else if (typeof value === 'boolean') {
      return value
    } else {
      // Ignore the 'passive' option since it is just an optimization and
      // doesn't affect behavior.  Assert there aren't any other settings to
      // ensure we don't have different behavior on different browsers by
      // ignoring an important option.
      const ignored = new Set(['passive', 'capture'])
      const keys = Object.keys(value).filter((k) => !ignored.has(k))
      console.assert(
        keys.length === 0,
        'Unsupported flag(s) to addEventListener: ' + keys.join(','))

      const supports =
          EventManager.Binding_.doesSupportObject_(target)
      if (supports) {
        return value
      } else {
        return value['capture'] || false
      }
    }
  }

  /* *
   * Checks whether the browser supports passing objects as the third argument
   * to addEventListener.  This caches the result value in a static field to
   * avoid a bunch of checks.
   *
   * @param {EventTarget} target
   * @return {boolean}
   * @private
   */
  static doesSupportObject_(target) {
    // https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener#Safely_detecting_option_support
    let supports = EventManager.Binding_.supportsObject_
    if (supports === undefined) {
      supports = false
      try {
        const options = {}
        // This defines a getter that will set this variable if called.  So if
        // the browser gets this property, it supports using an object.  If the
        // browser doesn't get these fields, it won't support objects.
        const prop = {
          get: () => {
            supports = true
            return false
          }
        }
        Object.defineProperty(options, 'passive', prop)
        Object.defineProperty(options, 'capture', prop)

        const call = () => {}
        target.addEventListener('test', call, options)
        target.removeEventListener('test', call, options)
      } catch (e) {
        supports = false
      }
      EventManager.Binding_.supportsObject_ = supports
    }
    return supports || false // 'false' fallback needed for compiler.
  }
}

/* * @private {(boolean|undefined)} */
EventManager.Binding_.supportsObject_ = undefined

/* *
 * A structure used to track which streams were last used in any given period.
 *
 * @final
 */
class ActiveStreamMap {
  constructor() {
    /* *
     * A mapping between a period and the content last streamed in that period.
     *
     * @private {!Map.<shaka.extern.Period, !ActiveStreamMap.Frame>}
     */
    this.history_ = new Map()
  }

  /* *
   * Clear the history.
   */
  clear() {
    // Clear the map to release references to the periods (the key). This
    // assumes that the references will be broken by doing this.
    this.history_.clear()
  }

  /* *
   * Set the variant that was last playing in |period|. Setting it to |null| is
   * the same as saying 'we were playing no variant in this period'.
   *
   * @param {shaka.extern.Period} period
   * @param {?shaka.extern.Variant} variant
   */
  useVariant(period, variant) {
    this.getFrameFor_(period).variant = variant
  }

  /* *
   * Set the text stream that was last displayed in |period|. Setting it to
   * |null| is the same as saying 'we were displaying no text in this period'.
   *
   * @param {shaka.extern.Period} period
   * @param {?shaka.extern.Stream} stream
   */
  useText(period, stream) {
    this.getFrameFor_(period).text = stream
  }

  /* *
   * Get the variant that was playing in the given period. If no variant  was
   * playing this period or the period had not started playing, then |null| will
   * be returned.
   *
   * @param {shaka.extern.Period} period
   * @return {?shaka.extern.Variant}
   */
  getVariant(period) {
    return this.getFrameFor_(period).variant
  }

  /* *
   * Get the text stream that was playing in the given period. If no text
   * stream was playing this period or the period had not started playing, then
   * |null| will be returned.
   *
   * @param {shaka.extern.Period} period
   * @return {?shaka.extern.Stream}
   */
  getText(period) {
    return this.getFrameFor_(period).text
  }

  /* *
   * Get the frame for a period. This will ensure that a frame exists for the
   * given period.
   *
   * @param {shaka.extern.Period} period
   * @return {!ActiveStreamMap.Frame}
   * @private
   */
  getFrameFor_(period) {
    if (!this.history_.has(period)) {
      const frame = new ActiveStreamMap.Frame()
      this.history_.set(period, frame)
    }

    return this.history_.get(period)
  }
}

ActiveStreamMap.Frame = class {
  constructor() {
    /* * @type {?shaka.extern.Variant} */
    this.variant = null
    /* * @type {?shaka.extern.Stream} */
    this.text = null
  }
}

/* *
 * Recreations of Array-like functions so that they work on any iterable
 * type.
 * @final
 */
class Iterables {
  /* *
   * @param {!Iterable.<FROM>} iterable
   * @param {function(FROM):TO} mapping
   * @return {!Iterable.<TO>}
   * @template FROM,TO
   */
  static map(iterable, mapping) {
    const array = []
    for (const x of iterable) {
      array.push(mapping(x))
    }
    return array
  }

  /* *
   * @param {!Iterable.<T>} iterable
   * @param {function(T):boolean} test
   * @return {boolean}
   * @template T
   */
  static every(iterable, test) {
    for (const x of iterable) {
      if (!test(x)) {
        return false
      }
    }
    return true
  }

  /* *
   * @param {!Iterable.<T>} iterable
   * @param {function(T):boolean} test
   * @return {boolean}
   * @template T
   */
  static some(iterable, test) {
    for (const x of iterable) {
      if (test(x)) {
        return true
      }
    }
    return false
  }

  /* *
   * Iterate over an iterable object and return only the items that |filter|
   * returns true for.
   *
   * @param {!Iterable.<T>} iterable
   * @param {function(T):boolean} filter
   * @return {!Array.<T>}
   * @template T
   */
  static filter(iterable, filter) {
    const out = []
    for (const x of iterable) {
      if (filter(x)) {
        out.push(x)
      }
    }
    return out
  }

  /* *
   * Returns an iterable that contains numbers in the range [0, end).
   *
   * @param {number=} end The exclusive end of the list.
   * @return {!Iterable.<number>}
   */
  static * range(end) {
    for (let i = 0; i < end; i++) {
      yield i
    }
  }

  /* *
   * Iterates over an iterable object and includes additional info about each
   * item:
   * - The zero-based index of the element.
   * - The next item in the list, if it exists.
   * - The previous item in the list, if it exists.
   *
   * @param {!Iterable.<T>} iterable
   * @return {!Iterable.<
   *     {i: number, item: T, prev: (T|undefined), next: (T|undefined)}>}
   * @template T
   */
  static * enumerate(iterable) {
    // Since we want the 'next' item, we need to skip the first item and return
    // elements one in the past.  So as we iterate, we are getting the 'next'
    // element and yielding the one from the previous iteration.
    let i = -1
    let prev
    let item
    for (const next of iterable) {
      if (i >= 0) {
        yield { i, item, prev, next }
      }
      i++
      prev = item
      item = next
    }
    if (i !== -1) {
      // If it's still -1, there were no items.  Otherwise we need to yield
      // the last item.
      yield { i, prev, item, next: undefined }
    }
  }
}

/* *
 * @summary A set of BufferSource utility functions.
 * @exportInterface
 */
class BufferUtils {
  /* *
   * Compare two buffers for equality.  For buffers of different types, this
   * compares the underlying buffers as binary data.
   *
   * @param {?BufferSource} arr1
   * @param {?BufferSource} arr2
   * @return {boolean}
   * @export
   */
  static equal(arr1, arr2) {
    const BufferUtils = BufferUtils
    if (!arr1 && !arr2) {
      return true
    }
    if (!arr1 || !arr2) {
      return false
    }
    if (arr1.byteLength !== arr2.byteLength) {
      return false
    }

    // Quickly check if these are views of the same buffer.  An ArrayBuffer can
    // be passed but doesn't have a byteOffset field, so default to 0.
    if (BufferUtils.unsafeGetArrayBuffer_(arr1) ===
            BufferUtils.unsafeGetArrayBuffer_(arr2) &&
        (arr1.byteOffset || 0) === (arr2.byteOffset || 0)) {
      return true
    }

    const uint8A = BufferUtils.toUint8(arr1)
    const uint8B = BufferUtils.toUint8(arr2)
    for (const i of Iterables.range(arr1.byteLength)) {
      if (uint8A[i] !== uint8B[i]) {
        return false
      }
    }
    return true
  }

  /* *
   * Gets the underlying ArrayBuffer of the given view.  The caller needs to
   * ensure it uses the 'byteOffset' and 'byteLength' fields of the view to
   * only use the same 'view' of the data.
   *
   * @param {BufferSource} view
   * @return {!ArrayBuffer}
   * @private
   */
  static unsafeGetArrayBuffer_(view) {
    if (view instanceof ArrayBuffer) {
      return view
    } else {
      return view.buffer
    }
  }

  /* *
   * Gets an ArrayBuffer that contains the data from the given TypedArray.  Note
   * this will allocate a new ArrayBuffer if the object is a partial view of
   * the data.
   *
   * @param {!BufferSource} view
   * @return {!ArrayBuffer}
   * @export
   */
  static toArrayBuffer(view) {
    if (view instanceof ArrayBuffer) {
      return view
    } else {
      if (view.byteOffset === 0 && view.byteLength === view.buffer.byteLength) {
        // This is a TypedArray over the whole buffer.
        return view.buffer
      }
      // This is a 'view' on the buffer.  Create a new buffer that only contains
      // the data.  Note that since this isn't an ArrayBuffer, the 'new' call
      // will allocate a new buffer to hold the copy.
      return new Uint8Array(view).buffer
    }
  }

  /* *
   * Creates a new Uint8Array view on the same buffer.  This clamps the values
   * to be within the same view (i.e. you can't use this to move past the end
   * of the view, even if the underlying buffer is larger).  However, you can
   * pass a negative offset to access the data before the view.
   *
   * @param {BufferSource} data
   * @param {number=} offset The offset from the beginning of this data's view
   *   to start the new view at.
   * @param {number=} length The byte length of the new view.
   * @return {!Uint8Array}
   * @export
   */
  static toUint8(data, offset = 0, length = Infinity) {
    return BufferUtils.view_(data, offset, length, Uint8Array)
  }

  /* *
   * Creates a DataView over the given buffer.
   *
   * @see toUint8
   * @param {BufferSource} buffer
   * @param {number=} offset
   * @param {number=} length
   * @return {!DataView}
   * @export
   */
  static toDataView(buffer, offset = 0, length = Infinity) {
    return BufferUtils.view_(buffer, offset, length, DataView)
  }

  /* *
   * @param {BufferSource} data
   * @param {number} offset
   * @param {number} length
   * @param {function(new:T, ArrayBuffer, number, number)} Type
   * @return {!T}
   * @template T
   * @private
   */
  static view_(data, offset, length, Type) {
    const buffer = BufferUtils.unsafeGetArrayBuffer_(data)
    // Absolute end of the |data| view within |buffer|.
    const dataEnd = (data.byteOffset || 0) + data.byteLength
    // Absolute start of the result within |buffer|.
    const rawStart = (data.byteOffset || 0) + offset
    const start = Math.max(0, Math.min(rawStart, dataEnd))
    // Absolute end of the result within |buffer|.
    const end = Math.min(start + Math.max(length, 0), dataEnd)
    return new Type(buffer, start, end - start)
  }
}

class CaptionParser {
  /* *
   * Parser for CEA closed captions embedded in video streams for Dash.
   * @constructor
   * @struct
   */
  // constructor() {}

  /* * Initializes the closed caption parser. */
  init() {}

  /* *
   * Return true if a new video track is selected or if the timescale is
   * changed.
   * @param {!Array.<number>} videoTrackIds A list of video tracks found in the
   *    init segment.
   * @param {!Object.<number, number>} timescales The map of track Ids and the
   *    tracks' timescales in the init segment.
   * @return {boolean}
   */
  isNewInit(videoTrackIds, timescales) {}

  /* *
   * Parses embedded CEA closed captions and interacts with the underlying
   * CaptionStream, and return the parsed captions.
   * @param {!Uint8Array} segment The fmp4 segment containing embedded captions
   * @param {!Array.<number>} videoTrackIds A list of video tracks found in the
   *    init segment.
   * @param {!Object.<number, number>} timescales The timescales found in the
   *    init segment.
   * @return {muxjs.mp4.ParsedClosedCaptions}
   */
  parse(segment, videoTrackIds, timescales) {}

  /* * Clear the parsed closed captions data for new data. */
  clearParsedCaptions() {}

  /* * Reset the captions stream. */
  resetCaptionStream() {}
}

class probe {
  /* *
   * Parses an MP4 initialization segment and extracts the timescale
   * values for any declared tracks.
   *
   * @param {Uint8Array} init The bytes of the init segment
   * @return {!Object.<number, number>} a hash of track ids to timescale
   * values or null if the init segment is malformed.
   */
  static timescale(init) {}

  /* *
    * Find the trackIds of the video tracks in this source.
    * Found by parsing the Handler Reference and Track Header Boxes:
    *
    * @param {Uint8Array} init The bytes of the init segment for this source
    * @return {!Array.<number>} A list of trackIds
   **/
  static videoTrackIds(init) {}
}

class Transmuxer {
  /* * @param {Object=} options */
  // constructor(options) {}
  /* * @param {number} time */
  setBaseMediaDecodeTime(time) {}

  /* * @param {!Uint8Array} data */
  push(data) {}

  flush() {}

  /* *
   * Add a handler for a specified event type.
   * @param {string} type Event name
   * @param {Function} listener The callback to be invoked
   */
  on(type, listener) {}

  /* *
   * Remove a handler for a specified event type.
   * @param {string} type Event name
   * @param {Function} listener The callback to be removed
   */
  off(type, listener) {}

  /* * Remove all handlers and clean up. */
  dispose() {}
}

var muxjs = /* #__PURE__*/Object.freeze({
  __proto__: null,
  CaptionParser: CaptionParser,
  probe: probe,
  Transmuxer: Transmuxer
})

/* *
 * Closed Caption Parser provides all operations for parsing the closed captions
 * embedded in Dash videos streams.
 *
 * @implements {IClosedCaptionParser}
 * @final
 */
class MuxJSClosedCaptionParser {
  constructor() {
    /* * @private {muxjs.mp4.CaptionParser} */
    this.muxCaptionParser_ = new CaptionParser()

    /* * @private {!Array.<number>} */
    this.videoTrackIds_ = []

    /* *
     * Timescales from the init segments, used for mux.js CaptionParser.
     * @private {!Object.<number, number>}
     */
    this.timescales_ = {}
  }

  /* *
   * @override
   */
  init(data) {
    // Caption parser for Dash
    const initBytes = BufferUtils.toUint8(data)
    this.videoTrackIds_ = probe.videoTrackIds(initBytes)
    this.timescales_ = probe.timescale(initBytes)
    this.muxCaptionParser_.init()
  }

  /* *
   * @override
   */
  parseFrom(data, onCaptions) {
    const segmentBytes = BufferUtils.toUint8(data)
    const dashParsed = this.muxCaptionParser_.parse(
      segmentBytes, this.videoTrackIds_, this.timescales_)
    if (dashParsed && dashParsed.captions) {
      onCaptions(dashParsed.captions)
    }
    // ParsedCaptions is used by mux.js to store the captions parsed so far.
    // It should be reset every time some data is parsed, so as to store new
    // data.
    this.muxCaptionParser_.clearParsedCaptions()
  }

  /* *
   * @override
   */
  reset() {
    this.muxCaptionParser_.resetCaptionStream()
  }

  /* *
   * Check if the MuxJS closed caption parser is supported on this platform.
   *
   * @return {boolean}
   */
  static isSupported() {
    return !!window.muxjs
  }
}

/* *
 * Noop Caption Parser creates an empty caption parser object when mux.js is not
 * available.
 *
 * @implements {IClosedCaptionParser}
 * @final
 */
class NoopCaptionParser {
  /* *
   * @override
   */
  init(data) {}

  /* *
   * @override
   */
  parseFrom(data, onCaptions) {}

  /* *
   * @override
   */
  reset() {}
}

/* *
 * @summary A set of utility functions for dealing with MIME types.
 */
class MimeUtils {
  /* *
   * Takes a MIME type and optional codecs string and produces the full MIME
   * type.
   *
   * @param {string} mimeType
   * @param {string=} codecs
   * @return {string}
   */
  static getFullType(mimeType, codecs) {
    let fullMimeType = mimeType
    if (codecs) {
      fullMimeType += `; codecs='${codecs}'`
    }
    return fullMimeType
  }

  /* *
   * Takes a Stream object and produces an extended MIME type with information
   * beyond the container and codec type, when available.
   *
   * @param {shaka.extern.Stream} stream
   * @return {string}
   */
  static getExtendedType(stream) {
    const components = [stream.mimeType]

    const extendedMimeParams = MimeUtils.EXTENDED_MIME_PARAMETERS_
    extendedMimeParams.forEach((mimeKey, streamKey) => {
      const value = stream[streamKey]
      if (value) {
        components.push(`${mimeKey}='${value}'`)
      }
    })

    return components.join(';')
  }

  /* *
   * Split a list of codecs encoded in a string into a list of codecs.
   * @param {string} codecs
   * @return {!Array.<string>}
   */
  static splitCodecs(codecs) {
    return codecs.split(',')
  }

  /* *
   * Get the base codec from a codec string.
   *
   * @param {string} codecString
   * @return {string}
   */
  static getCodecBase(codecString) {
    const parts = MimeUtils.getCodecParts_(codecString)
    return parts[0]
  }

  /* *
   * Get the base and profile of a codec string. Where [0] will be the codec
   * base and [1] will be the profile.
   * @param {string} codecString
   * @return {!Array.<string>}
   * @private
   */
  static getCodecParts_(codecString) {
    const parts = codecString.split('.')

    const base = parts[0]

    parts.pop()
    const profile = parts.join('.')

    // Make sure that we always return a 'base' and 'profile'.
    return [base, profile]
  }
}
/* *
 * A map from Stream object keys to MIME type parameters.  These should be
 * ignored by platforms that do not recognize them.
 *
 * This initial set of parameters are all recognized by Chromecast.
 *
 * @const {!Map.<string, string>}
 * @private
 */
MimeUtils.EXTENDED_MIME_PARAMETERS_ = new Map()
  .set('codecs', 'codecs')
  .set('frameRate', 'framerate') // Ours is camelCase, theirs is lowercase.
  .set('bandwidth', 'bitrate') // They are in the same units: bits/sec.
  .set('width', 'width')
  .set('height', 'height')
  .set('channelsCount', 'channels')
/* *
 * A mimetype created for CEA closed captions.
 * @const {string}
 */
MimeUtils.CLOSED_CAPTION_MIMETYPE = 'application/cea-608'

/* *
 * A set of variants that we want to adapt between.
 *
 * @final
 */
class AdaptationSet {
  /* *
   * @param {shaka.extern.Variant} root
   *    The variant that all other variants will be tested against when being
   *    added to the adaptation set. If a variant is not compatible with the
   *    root, it will not be added.
   * @param {!Iterable.<shaka.extern.Variant>=} candidates
   *    Variants that may be compatible with the root and should be added if
   *    compatible. If a candidate is not compatible, it will not end up in the
   *    adaptation set.
   */
  constructor(root, candidates) {
    /* * @private {shaka.extern.Variant} */
    this.root_ = root
    /* * @private {!Set.<shaka.extern.Variant>} */
    this.variants_ = new Set([root])

    // Try to add all the candidates. If they cannot be added (because they
    // are not compatible with the root, they will be rejected by |add|.
    candidates = candidates || []
    for (const candidate of candidates) {
      this.add(candidate)
    }
  }

  /* *
   * @param {shaka.extern.Variant} variant
   * @return {boolean}
   */
  add(variant) {
    if (this.canInclude(variant)) {
      this.variants_.add(variant)
      return true
    }

    // To be nice, issue a warning if someone is trying to add something that
    // they shouldn't.
    console.warn('Rejecting variant - not compatible with root.')
    return false
  }

  /* *
   * Check if |variant| can be included with the set. If |canInclude| returns
   * |false|, calling |add| will result in it being ignored.
   *
   * @param {shaka.extern.Variant} variant
   * @return {boolean}
   */
  canInclude(variant) {
    return AdaptationSet.areAdaptable(this.root_, variant)
  }

  /* *
   * @param {shaka.extern.Variant} a
   * @param {shaka.extern.Variant} b
   * @return {boolean}
   */
  static areAdaptable(a, b) {
    const AdaptationSet = AdaptationSet

    // All variants should have audio or should all not have audio.
    if (!!a.audio !== !!b.audio) {
      return false
    }

    // All variants should have video or should all not have video.
    if (!!a.video !== !!b.video) {
      return false
    }

    // If the languages don't match, we should not adapt between them.
    if (a.language !== b.language) {
      return false
    }

    console.assert(
      !!a.audio === !!b.audio,
      'Both should either have audio or not have audio.')
    if (a.audio && b.audio &&
        !AdaptationSet.areAudiosCompatible_(a.audio, b.audio)) {
      return false
    }

    console.assert(
      !!a.video === !!b.video,
      'Both should either have video or not have video.')
    if (a.video && b.video &&
        !AdaptationSet.areVideosCompatible_(a.video, b.video)) {
      return false
    }

    return true
  }

  /* *
   * @return {!Iterable.<shaka.extern.Variant>}
   */
  values() {
    return this.variants_.values()
  }

  /* *
   * Check if we can switch between two audio streams.
   *
   * @param {shaka.extern.Stream} a
   * @param {shaka.extern.Stream} b
   * @return {boolean}
   * @private
   */
  static areAudiosCompatible_(a, b) {
    const AdaptationSet = AdaptationSet

    // Audio channel counts must not change between adaptations.
    if (a.channelsCount !== b.channelsCount) {
      return false
    }

    // We can only adapt between base-codecs.
    if (!AdaptationSet.canTransitionBetween_(a, b)) {
      return false
    }

    // Audio roles must not change between adaptations.
    if (!AdaptationSet.areRolesEqual_(a.roles, b.roles)) {
      return false
    }

    return true
  }

  /* *
   * Check if we can switch between two video streams.
   *
   * @param {shaka.extern.Stream} a
   * @param {shaka.extern.Stream} b
   * @return {boolean}
   * @private
   */
  static areVideosCompatible_(a, b) {
    const AdaptationSet = AdaptationSet

    // We can only adapt between base-codecs.
    if (!AdaptationSet.canTransitionBetween_(a, b)) {
      return false
    }

    // Video roles must not change between adaptations.
    if (!AdaptationSet.areRolesEqual_(a.roles, b.roles)) {
      return false
    }

    return true
  }

  /* *
   * Check if we can switch between two streams based on their codec and mime
   * type.
   *
   * @param {shaka.extern.Stream} a
   * @param {shaka.extern.Stream} b
   * @return {boolean}
   * @private
   */
  static canTransitionBetween_(a, b) {
    if (a.mimeType !== b.mimeType) {
      return false
    }
    // Get the base codec of each codec in each stream.
    const codecsA = MimeUtils.splitCodecs(a.codecs).map((codec) => {
      return MimeUtils.getCodecBase(codec)
    })
    const codecsB = MimeUtils.splitCodecs(b.codecs).map((codec) => {
      return MimeUtils.getCodecBase(codec)
    })

    // We don't want to allow switching between transmuxed and non-transmuxed
    // content so the number of codecs should be the same.
    //
    // To avoid the case where an codec is used for audio and video we will
    // codecs using arrays (not sets). While at this time, there are no codecs
    // that work for audio and video, it is possible for 'raw' codecs to be
    // which would share the same name.
    if (codecsA.length !== codecsB.length) {
      return false
    }

    // Sort them so that we can walk through them and compare them
    // element-by-element.
    codecsA.sort()
    codecsB.sort()

    for (const i of Iterables.range(codecsA.length)) {
      if (codecsA[i] !== codecsB[i]) {
        return false
      }
    }

    return true
  }

  /* *
   * Check if two role lists are the equal. This will take into account all
   * unique behaviours when comparing roles.
   *
   * @param {!Iterable.<string>} a
   * @param {!Iterable.<string>} b
   * @return {boolean}
   * @private
   */
  static areRolesEqual_(a, b) {
    const aSet = new Set(a)
    const bSet = new Set(b)

    // Remove the main role from the role lists (we expect to see them only
    // in dash manifests).
    const mainRole = 'main'
    aSet.delete(mainRole)
    bSet.delete(mainRole)

    // Make sure that we have the same number roles in each list. Make sure to
    // do it after correcting for 'main'.
    if (aSet.size !== bSet.size) {
      return false
    }

    // Because we know the two sets are the same size, if any item is missing
    // if means that they are not the same.
    for (const x of aSet) {
      if (!bSet.has(x)) {
        return false
      }
    }

    return true
  }
}

/* *
 * @summary
 * This class wraps a function so that we can defer executing the function by X
 * seconds.
 *
 * @final
 */
class DelayedTick {
  /* *
   * @param {function()} onTick
   */
  constructor(onTick) {
    /* * @private {function()} */
    this.onTick_ = onTick

    /* * @private {?function()} */
    this.cancelPending_ = null
  }

  /* *
   * Call |onTick| after |delayInSeconds| has elapsed. If there is already a
   * pending call to |onTick|, the pending call will be canceled.
   *
   * @param {number} delayInSeconds
   * @return {!DelayedTick}
   */
  tickAfter(delayInSeconds) {
    // We only want one timeout set at a time, so make sure no other timeouts
    // are running.
    this.stop()

    // We will wrap these values in a function to allow us to cancel the timeout
    // we are about to create.
    let alive = true
    let timeoutId = null

    this.cancelPending_ = () => {
      clearTimeout(timeoutId)
      alive = false
    }

    // For some reason, a timeout may still execute after we have cleared it in
    // our tests. We will wrap the callback so that we can double-check our
    // |alive| flag.
    const onTick = () => {
      if (alive) {
        this.onTick_()
      }
    }

    timeoutId = setTimeout(onTick, delayInSeconds * 1000)

    return this
  }

  /* *
   * Cancel any pending calls to |onTick|. If there are no pending calls to
   * |onTick|, this will be a no-op.
   */
  stop() {
    if (this.cancelPending_) {
      this.cancelPending_()
      this.cancelPending_ = null
    }
  }
}

/* *
 * A timer allows a single function to be executed at a later time or at
 * regular intervals.
 *
 * @final
 * @export
 */
class Timer {
  /* *
   * Create a new timer. A timer is committed to a single callback function.
   * While there is no technical reason to do this, it is far easier to
   * understand and use timers when they are connected to one functional idea.
   *
   * @param {function()} onTick
   */
  constructor(onTick) {
    /* *
     * Each time our timer 'does work', we call that a 'tick'. The name comes
     * from old analog clocks.
     *
     * @private {function()}
     */
    this.onTick_ = onTick

    /* * @private {DelayedTick} */
    this.ticker_ = null
  }

  /* *
   * Have the timer call |onTick| now.
   *
   * @return {!Timer}
   * @export
   */
  tickNow() {
    this.stop()
    this.onTick_()

    return this
  }

  /* *
   * Have the timer call |onTick| after |seconds| has elapsed unless |stop| is
   * called first.
   *
   * @param {number} seconds
   * @return {!Timer}
   * @export
   */
  tickAfter(seconds) {
    this.stop()

    this.ticker_ = new DelayedTick(() => {
      this.onTick_()
    }).tickAfter(seconds)

    return this
  }

  /* *
   * Have the timer call |onTick| every |seconds| until |stop| is called.
   *
   * @param {number} seconds
   * @return {!Timer}
   * @export
   */
  tickEvery(seconds) {
    this.stop()

    this.ticker_ = new DelayedTick(() => {
      // Schedule the timer again first. |onTick_| could cancel the timer and
      // rescheduling first simplifies the implementation.
      this.ticker_.tickAfter(seconds)
      this.onTick_()
    }).tickAfter(seconds)

    return this
  }

  /* *
   * Stop the timer and clear the previous behaviour. The timer is still usable
   * after calling |stop|.
   *
   * @export
   */
  stop() {
    if (this.ticker_) {
      this.ticker_.stop()
      this.ticker_ = null
    }
  }
}

/* *
 * A wrapper for platform-specific functions.
 *
 * @final
 */
class Platform {
  /* *
   * Check if the current platform supports media source. We assume that if
   * the current platform supports media source, then we can use media source
   * as per its design.
   *
   * @return {boolean}
   */
  static supportsMediaSource() {
    // Browsers that lack a media source implementation will have no reference
    // to |MediaSource|. Platforms that we see having problematic media
    // source implementations will have this reference removed via a polyfill.
    if (!MediaSource) {
      return false
    }

    // Some very old MediaSource implementations didn't have isTypeSupported.
    if (!MediaSource.isTypeSupported) {
      return false
    }

    return true
  }

  /* *
   * Returns true if the media type is supported natively by the platform.
   *
   * @param {string} mimeType
   * @return {boolean}
   */
  static supportsMediaType(mimeType) {
    const video = Platform.anyMediaElement()
    return video.canPlayType(mimeType) !== ''
  }

  /* *
   * Check if the current platform is MS Edge.
   *
   * @return {boolean}
   */
  static isEdge() {
    return Platform.userAgentContains_('Edge/')
  }

  /* *
   * Check if the current platform is MS IE.
   *
   * @return {boolean}
   */
  static isIE() {
    return Platform.userAgentContains_('Trident/')
  }

  /* *
   * Check if the current platform is a Tizen TV.
   *
   * @return {boolean}
   */
  static isTizen() {
    return Platform.userAgentContains_('Tizen')
  }

  /* *
   * Check if the current platform is a Tizen 3 TV.
   *
   * @return {boolean}
   */
  static isTizen3() {
    return Platform.userAgentContains_('Tizen 3')
  }

  /* *
   * Check if the current platform is a Video Futur.
   *
   * @return {boolean}
   */
  static isVideoFutur() {
    return Platform.userAgentContains_('VITIS')
  }

  /* *
   * Check if the current platform is a WebOS.
   *
   * @return {boolean}
   */
  static isWebOS() {
    return Platform.userAgentContains_('Web0S')
  }

  /* *
   * Check if the current platform is a Google Chromecast.
   *
   * @return {boolean}
   */
  static isChromecast() {
    return Platform.userAgentContains_('CrKey')
  }

  /* *
   * Check if the current platform is Google Chrome.
   *
   * @return {boolean}
   */
  static isChrome() {
    // The Edge user agent will also contain the 'Chrome' keyword, so we need
    // to make sure this is not Edge.
    return Platform.userAgentContains_('Chrome') &&
           !Platform.isEdge()
  }
  /* *
   * Check if the current platform is from Apple.
   *
   * Returns true on all iOS browsers and on desktop Safari.
   *
   * Returns false for non-Safari browsers on macOS, which are independent of
   * Apple.
   *
   * @return {boolean}
   */
  static isApple() {
    return !!navigator.vendor && navigator.vendor.includes('Apple')
  }

  /* *
   * Returns a major version number for Safari, or Safari-based iOS browsers.
   *
   * For example:
   *   - Safari 13.0.4 on macOS returns 13.
   *   - Safari on iOS 13.3.1 returns 13.
   *   - Chrome on iOS 13.3.1 returns 13 (since this is based on Safari/WebKit).
   *   - Chrome on macOS returns null (since this is independent of Apple).
   *
   * Returns null on Firefox on iOS, where this version information is not
   * available.
   *
   * @return {?number} A major version number or null if not iOS.
   */
  static safariVersion() {
    // All iOS browsers and desktop Safari will return true for isApple().
    if (!Platform.isApple()) {
      return null
    }

    // This works for iOS Safari and desktop Safari, which contain something
    // like 'Version/13.0' indicating the major Safari or iOS version.
    let match = navigator.userAgent.match(/Version\/(\d+)/)
    if (match) {
      return parseInt(match[1], /*  base= */ 10)
    }

    // This works for all other browsers on iOS, which contain something like
    // 'OS 13_3' indicating the major & minor iOS version.
    match = navigator.userAgent.match(/OS (\d+)(?:_\d+)?/)
    if (match) {
      return parseInt(match[1], /*  base= */ 10)
    }

    return null
  }

  /* *
   * Guesses if the platform is a mobile one (iOS or Android).
   *
   * @return {boolean}
   */
  static isMobile() {
    if (/(?:iPhone|iPad|iPod|Android)/.test(navigator.userAgent)) {
      // This is Android, iOS, or iPad < 13.
      return true
    }

    // Starting with iOS 13 on iPad, the user agent string no longer has the
    // word 'iPad' in it.  It looks very similar to desktop Safari.  This seems
    // to be intentional on Apple's part.
    // See: https://forums.developer.apple.com/thread/119186
    //
    // So if it's an Apple device with multi-touch support, assume it's a mobile
    // device.  If some future iOS version starts masking their user agent on
    // both iPhone & iPad, this clause should still work.  If a future
    // multi-touch desktop Mac is released, this will need some adjustment.
    //
    // As of January 2020, this is mainly used to adjust the default UI config
    // for mobile devices, so it's low risk if something changes to break this
    // detection.
    return Platform.isApple() && navigator.maxTouchPoints > 1
  }

  /* *
   * Check if the user agent contains a key. This is the best way we know of
   * right now to detect platforms. If there is a better way, please send a
   * PR.
   *
   * @param {string} key
   * @return {boolean}
   * @private
   */
  static userAgentContains_(key) {
    const userAgent = navigator.userAgent || ''
    return userAgent.includes(key)
  }

  /* *
   * For canPlayType queries, we just need any instance.
   *
   * First, use a cached element from a previous query.
   * Second, search the page for one.
   * Third, create a temporary one.
   *
   * Cached elements expire in one second so that they can be GC'd or removed.
   *
   * @return {!HTMLMediaElement}
   */
  static anyMediaElement() {
    if (Platform.cachedMediaElement_) {
      return Platform.cachedMediaElement_
    }

    if (!Platform.cacheExpirationTimer_) {
      Platform.cacheExpirationTimer_ = new Timer(() => {
        Platform.cachedMediaElement_ = null
      })
    }

    Platform.cachedMediaElement_ = /* * @type {HTMLMediaElement} */(
      document.querySelector('video') || document.querySelector('audio'))

    if (!Platform.cachedMediaElement_) {
      Platform.cachedMediaElement_ = /* * @type {!HTMLMediaElement} */(
        document.createElement('video'))
    }

    Platform.cacheExpirationTimer_.tickAfter(/*  seconds= */ 1)
    return Platform.cachedMediaElement_
  }
}

Platform.cachedMediaElement_ = null

Platform.cacheExpirationTimer_ = null

/* *
 * @summary A set of utility functions for dealing with TimeRanges objects.
 */
class TimeRangesUtils {
  /* *
   * Gets the first timestamp in the buffer.
   *
   * @param {TimeRanges} b
   * @return {?number} The first buffered timestamp, in seconds, if |buffered|
   *   is non-empty; otherwise, return null.
   */
  static bufferStart(b) {
    if (!b) {
      return null
    }
    // Workaround Safari bug: https://bit.ly/2trx6O8
    if (b.length === 1 && b.end(0) - b.start(0) < 1e-6) {
      return null
    }
    // Workaround Edge bug: https://bit.ly/2JYLPeB
    if (b.length === 1 && b.start(0) < 0) {
      return 0
    }
    return b.length ? b.start(0) : null
  }
  /* *
   * Gets the last timestamp in the buffer.
   *
   * @param {TimeRanges} b
   * @return {?number} The last buffered timestamp, in seconds, if |buffered|
   *   is non-empty; otherwise, return null.
   */
  static bufferEnd(b) {
    if (!b) {
      return null
    }
    // Workaround Safari bug: https://bit.ly/2trx6O8
    if (b.length === 1 && b.end(0) - b.start(0) < 1e-6) {
      return null
    }
    return b.length ? b.end(b.length - 1) : null
  }
  /* *
   * Determines if the given time is inside a buffered range.  This includes
   * gaps, meaning that if the playhead is in a gap, it is considered buffered.
   * If there is a small gap between the playhead and buffer start, consider it
   * as buffered.
   *
   * @param {TimeRanges} b
   * @param {number} time Playhead time
   * @param {number=} smallGapLimit Set in configuration
   * @return {boolean}
   */
  static isBuffered(b, time, smallGapLimit = 0) {
    if (!b || !b.length) {
      return false
    }
    // Workaround Safari bug: https://bit.ly/2trx6O8
    if (b.length === 1 && b.end(0) - b.start(0) < 1e-6) {
      return false
    }

    if (time > b.end(b.length - 1)) {
      return false
    }
    // Push the time forward by the gap limit so that it is more likely to be in
    // the range.
    return (time + smallGapLimit >= b.start(0))
  }
  /* *
   * Computes how far ahead of the given timestamp is buffered.  To provide
   * smooth playback while jumping gaps, we don't include the gaps when
   * calculating this.
   * This only includes the amount of content that is buffered.
   *
   * @param {TimeRanges} b
   * @param {number} time
   * @return {number} The number of seconds buffered, in seconds, ahead of the
   *   given time.
   */
  static bufferedAheadOf(b, time) {
    if (!b || !b.length) {
      return 0
    }
    // Workaround Safari bug: https://bit.ly/2trx6O8
    if (b.length === 1 && b.end(0) - b.start(0) < 1e-6) {
      return 0
    }

    // NOTE: On IE11, buffered ranges may show appended data before the
    // associated append operation is complete.

    // We calculate the buffered amount by ONLY accounting for the content
    // buffered (i.e. we ignore the times of the gaps).  We also buffer through
    // all gaps.
    // Therefore, we start at the end and add up all buffers until |time|.
    let result = 0
    for (const { start, end } of TimeRangesUtils.getBufferedInfo(b)) {
      if (end > time) {
        result += end - Math.max(start, time)
      }
    }

    return result
  }
  /* *
   * Determines if the given time is inside a gap between buffered ranges.  If
   * it is, this returns the index of the buffer that is *ahead* of the gap.
   *
   * @param {TimeRanges} b
   * @param {number} time
   * @return {?number} The index of the buffer after the gap, or null if not in
   *   a gap.
   */
  static getGapIndex(b, time) {
    const TimeRangesUtils = TimeRangesUtils

    if (!b || !b.length) {
      return null
    }
    // Workaround Safari bug: https://bit.ly/2trx6O8
    if (b.length === 1 && b.end(0) - b.start(0) < 1e-6) {
      return null
    }

    // Some browsers will stop earlier than others before a gap (e.g. IE/Edge
    // stops 0.5 seconds before a gap). So for some browsers we need to use a
    // larger threshold. See: https://bit.ly/2K5xmJO
    const useLargeThreshold = Platform.isEdge() ||
                              Platform.isIE() ||
                              Platform.isTizen() ||
                              Platform.isChromecast()

    const threshold = useLargeThreshold ? 0.5 : 0.1

    const idx = TimeRangesUtils.getBufferedInfo(b).findIndex((item, i, arr) => {
      return item.start > time &&
          (i === 0 || arr[i - 1].end - time <= threshold)
    })
    return idx >= 0 ? idx : null
  }
  /* *
   * @param {TimeRanges} b
   * @return {!Array.<shaka.extern.BufferedRange>}
   */
  static getBufferedInfo(b) {
    if (!b) {
      return []
    }
    const ret = []
    for (const i of Iterables.range(b.length)) {
      ret.push({ start: b.start(i), end: b.end(i) })
    }
    return ret
  }
}

/* *
 * @summary
 * Describes an error that happened.
 *
 * @description
 * This uses numerical codes to describe
 * which error happened.
 *
 * Some error are caused by errors from the browser.  In these cases, the error
 * object is provided as part of the <code>data</code> field.  System codes come
 * from the browser and may or may not be documented.  Here are some places
 * where the errors may be documented:
 * <ul>
 *   <li><a href='https://developer.mozilla.org/en-US/docs/Web/API/MediaError'>MediaError</a>
 *   <li><a href='https://developer.mozilla.org/en-US/docs/Web/HTTP/Status'>HTTP Codes</a>
 *   <li>
 *     <a href='https://docs.microsoft.com/en-us/windows/win32/wmdm/error-codes'>PlayReady errors</a>
 *     or
 *     <a href='https://github.com/tpn/winsdk-10/blob/master/Include/10.0.16299.0/winrt/Windows.Media.Protection.PlayReadyErrors.h'>more PlayReady errors</a>
 * </ul>
 *
 * @export
 * @implements {shaka.extern.Error}
 * @extends {Error}
 */
class Error$1 {
  /* *
   * @param {Error.Severity} severity
   * @param {Error.Category} category
   * @param {Error.Code} code
   * @param {...*} varArgs
   */
  constructor(severity, category, code, ...varArgs) {
    /* *
     * @override
     * @exportInterface
     */
    this.severity = severity
    /* *
     * @override
     * @exportInterface
     */
    this.category = category
    /* *
     * @override
     * @exportInterface
     */
    this.code = code
    /* *
     * @override
     * @exportInterface
     */
    this.data = varArgs
    /* *
     * @override
     * @exportInterface
     */
    this.handled = false
  }
  /* *
   * @return {string}
   * @override
   */
  toString() {
    return 'Error ' + JSON.stringify(this, null, '  ')
  }
}

/* *
 * @enum {number}
 * @export
 */
Error$1.Severity = {
  /* *
   * An error occurred, but the Player is attempting to recover from the error.
   *
   * If the Player cannot ultimately recover, it still may not throw a CRITICAL
   * error.  For example, retrying for a media segment will never result in
   * a CRITICAL error (the Player will just retry forever).
   */
  'RECOVERABLE': 1,

  /* *
   * A critical error that the library cannot recover from.  These usually cause
   * the Player to stop loading or updating.  A new manifest must be loaded
   * to reset the library.
   */
  'CRITICAL': 2
}
/* *
 * @enum {number}
 * @export
 */
Error$1.Category = {
  /* * Errors from the network stack. */
  'NETWORK': 1,

  /* * Errors parsing text streams. */
  'TEXT': 2,

  /* * Errors parsing or processing audio or video streams. */
  'MEDIA': 3,

  /* * Errors parsing the Manifest. */
  'MANIFEST': 4,

  /* * Errors related to streaming. */
  'STREAMING': 5,

  /* * Miscellaneous errors from the player. */
  'PLAYER': 7,

  /* * Errors related to cast. */
  'CAST': 8,

  /* * Errors in the database storage (offline). */
  'STORAGE': 9,

  /* * Errors related to ad insertion. */
  'ADS': 10
}
/* *
 * @enum {number}
 * @export
 */
Error$1.Code = {
  /* *
   * A network request was made using an unsupported URI scheme.
   * <br> error.data[0] is the URI.
   */
  'UNSUPPORTED_SCHEME': 1000,

  /* *
   * An HTTP network request returned an HTTP status that indicated a failure.
   * <br> error.data[0] is the URI.
   * <br> error.data[1] is the status code.
   * <br> error.data[2] is the response text, or null if the response could not
   *   be interpretted as text.
   * <br> error.data[3] is the map of response headers.
   * <br> error.data[4] is the NetworkingEngine.RequestType of the request,
   *   if one was provided.
   */
  'BAD_HTTP_STATUS': 1001,

  /* *
   * An HTTP network request failed with an error, but not from the server.
   * <br> error.data[0] is the URI.
   * <br> error.data[1] is the original error.
   * <br> error.data[2] is the NetworkingEngine.RequestType of the request.
   */
  'HTTP_ERROR': 1002,

  /* *
   * A network request timed out.
   * <br> error.data[0] is the URI.
   * <br> error.data[1] is the NetworkingEngine.RequestType of the request,
   *   if one was provided.
   */
  'TIMEOUT': 1003,

  /* *
   * A network request was made with a malformed data URI.
   * <br> error.data[0] is the URI.
   */
  'MALFORMED_DATA_URI': 1004,

  /* *
   * A network request was made with a data URI using an unknown encoding.
   * <br> error.data[0] is the URI.
   */
  'UNKNOWN_DATA_URI_ENCODING': 1005,

  /* *
   * A request filter threw an error.
   * <br> error.data[0] is the original error.
   */
  'REQUEST_FILTER_ERROR': 1006,

  /* *
   * A response filter threw an error.
   * <br> error.data[0] is the original error.
   */
  'RESPONSE_FILTER_ERROR': 1007,

  /* *
   * A testing network request was made with a malformed URI.
   * This error is only used by unit and integration tests.
   */
  'MALFORMED_TEST_URI': 1008,

  /* *
   * An unexpected network request was made to the FakeNetworkingEngine.
   * This error is only used by unit and integration tests.
   */
  'UNEXPECTED_TEST_REQUEST': 1009,

  /* *
   * The number of retry attempts have run out.
   * This is an internal error and shouldn't be propagated.
   */
  'ATTEMPTS_EXHAUSTED': 1010,
  /* * The text parser failed to parse a text stream due to an invalid header. */
  'INVALID_TEXT_HEADER': 2000,

  /* * The text parser failed to parse a text stream due to an invalid cue. */
  'INVALID_TEXT_CUE': 2001,

  // RETIRED: 'INVALID_TEXT_SETTINGS': 2002,

  /* *
   * Was unable to detect the encoding of the response text.  Suggest adding
   * byte-order-markings to the response data.
   */
  'UNABLE_TO_DETECT_ENCODING': 2003,

  /* * The response data contains invalid Unicode character encoding. */
  'BAD_ENCODING': 2004,

  /* *
   * The XML parser failed to parse an xml stream, or the XML lacks mandatory
   * elements for TTML.
   * <br> error.data[0] is extra context, if available.
   */
  'INVALID_XML': 2005,

  // RETIRED: 'INVALID_TTML': 2006,

  /* *
   * MP4 segment does not contain TTML.
   */
  'INVALID_MP4_TTML': 2007,

  /* *
   * MP4 segment does not contain VTT.
   */
  'INVALID_MP4_VTT': 2008,

  /* *
   * When examining media in advance, we were unable to extract the cue time.
   * This should only be possible with HLS, where we do not have explicit
   * segment start times.
   * <br> error.data[0] is the underlying exception or Error object.
   */
  'UNABLE_TO_EXTRACT_CUE_START_TIME': 2009,
  /* *
   * Some component tried to read past the end of a buffer.  The segment index,
   * init segment, or PSSH may be malformed.
   */
  'BUFFER_READ_OUT_OF_BOUNDS': 3000,

  /* *
   * Some component tried to parse an integer that was too large to fit in a
   * JavaScript number without rounding error.  JavaScript can only natively
   * represent integers up to 53 bits.
   */
  'JS_INTEGER_OVERFLOW': 3001,

  /* *
   * The EBML parser used to parse the WebM container encountered an integer,
   * ID, or other field larger than the maximum supported by the parser.
   */
  'EBML_OVERFLOW': 3002,

  /* *
   * The EBML parser used to parse the WebM container encountered a floating-
   * point field of a size not supported by the parser.
   */
  'EBML_BAD_FLOATING_POINT_SIZE': 3003,

  /* *
   * The MP4 SIDX parser found the wrong box type.
   * Either the segment index range is incorrect or the data is corrupt.
   */
  'MP4_SIDX_WRONG_BOX_TYPE': 3004,

  /* *
   * The MP4 SIDX parser encountered an invalid timescale.
   * The segment index data may be corrupt.
   */
  'MP4_SIDX_INVALID_TIMESCALE': 3005,

  /* * The MP4 SIDX parser encountered a type of SIDX that is not supported. */
  'MP4_SIDX_TYPE_NOT_SUPPORTED': 3006,

  /* *
   * The WebM Cues parser was unable to locate the Cues element.
   * The segment index data may be corrupt.
   */
  'WEBM_CUES_ELEMENT_MISSING': 3007,

  /* *
   * The WebM header parser was unable to locate the Ebml element.
   * The init segment data may be corrupt.
   */
  'WEBM_EBML_HEADER_ELEMENT_MISSING': 3008,

  /* *
   * The WebM header parser was unable to locate the Segment element.
   * The init segment data may be corrupt.
   */
  'WEBM_SEGMENT_ELEMENT_MISSING': 3009,

  /* *
   * The WebM header parser was unable to locate the Info element.
   * The init segment data may be corrupt.
   */
  'WEBM_INFO_ELEMENT_MISSING': 3010,

  /* *
   * The WebM header parser was unable to locate the Duration element.
   * The init segment data may be corrupt or may have been incorrectly encoded.
   * Shaka requires a duration in WebM DASH content.
   */
  'WEBM_DURATION_ELEMENT_MISSING': 3011,

  /* *
   * The WebM Cues parser was unable to locate the Cue Track Positions element.
   * The segment index data may be corrupt.
   */
  'WEBM_CUE_TRACK_POSITIONS_ELEMENT_MISSING': 3012,

  /* *
   * The WebM Cues parser was unable to locate the Cue Time element.
   * The segment index data may be corrupt.
   */
  'WEBM_CUE_TIME_ELEMENT_MISSING': 3013,

  /* *
   * A MediaSource operation failed.
   * <br> error.data[0] is a MediaError code from the video element.
   */
  'MEDIA_SOURCE_OPERATION_FAILED': 3014,

  /* *
   * A MediaSource operation threw an exception.
   * <br> error.data[0] is the exception that was thrown.
   */
  'MEDIA_SOURCE_OPERATION_THREW': 3015,

  /* *
   * The video element reported an error.
   * <br> error.data[0] is a MediaError code from the video element.
   * <br> On Edge & IE, error.data[1] is a Microsoft extended error code in hex.
   * <br> On Chrome, error.data[2] is a string with details on the error.
   * <br> See top of file for links to browser error codes.
   */
  'VIDEO_ERROR': 3016,

  /* *
   * A MediaSource operation threw QuotaExceededError and recovery failed. The
   * content cannot be played correctly because the segments are too large for
   * the browser/platform. This may occur when attempting to play very high
   * quality, very high bitrate content on low-end devices.
   * <br> error.data[0] is the type of content which caused the error.
   */
  'QUOTA_EXCEEDED_ERROR': 3017,

  /* *
   * Mux.js did not invoke the callback signifying successful transmuxing.
   */
  'TRANSMUXING_FAILED': 3018,
  /* *
   * The Player was unable to guess the manifest type based on file extension
   * or MIME type.  To fix, try one of the following:
   * <br><ul>
   *   <li>Rename the manifest so that the URI ends in a well-known extension.
   *   <li>Configure the server to send a recognizable Content-Type header.
   *   <li>Configure the server to accept a HEAD request for the manifest.
   * </ul>
   * <br> error.data[0] is the manifest URI.
   */
  'UNABLE_TO_GUESS_MANIFEST_TYPE': 4000,

  /* *
   * The DASH Manifest contained invalid XML markup.
   * <br> error.data[0] is the URI associated with the XML.
   */
  'DASH_INVALID_XML': 4001,

  /* *
   * The DASH Manifest contained a Representation with insufficient segment
   * information.
   */
  'DASH_NO_SEGMENT_INFO': 4002,

  /* * The DASH Manifest contained an AdaptationSet with no Representations. */
  'DASH_EMPTY_ADAPTATION_SET': 4003,

  /* * The DASH Manifest contained an Period with no AdaptationSets. */
  'DASH_EMPTY_PERIOD': 4004,

  /* *
   * The DASH Manifest does not specify an init segment with a WebM container.
   */
  'DASH_WEBM_MISSING_INIT': 4005,

  /* * The DASH Manifest contained an unsupported container format. */
  'DASH_UNSUPPORTED_CONTAINER': 4006,

  /* * The embedded PSSH data has invalid encoding. */
  'DASH_PSSH_BAD_ENCODING': 4007,

  /* *
   * There is an AdaptationSet whose Representations do not have any common
   * key-systems.
   */
  'DASH_NO_COMMON_KEY_SYSTEM': 4008,

  /* * Having multiple key IDs per Representation is not supported. */
  'DASH_MULTIPLE_KEY_IDS_NOT_SUPPORTED': 4009,

  /* * The DASH Manifest specifies conflicting key IDs. */
  'DASH_CONFLICTING_KEY_IDS': 4010,

  /* *
   * The manifest contains a period with no playable streams.
   * Either the period was originally empty, or the streams within cannot be
   * played on this browser or platform.
   */
  'UNPLAYABLE_PERIOD': 4011,

  /* *
   * There exist some streams that could be decoded, but restrictions imposed
   * by the application or the key system prevent us from playing.  This may
   * happen under the following conditions:
   * <ul>
   *   <li>The application has given restrictions to the Player that restrict
   *       at least one content type completely (e.g. no playable audio).
   *   <li>The manifest specifies different keys than were given to us from the
   *       license server.
   *   <li>The key system has imposed output restrictions that cannot be met
   *       (such as HDCP) and there are no unrestricted alternatives.
   * </ul>
   * <br> error.data[0] is a {@link shaka.extern.RestrictionInfo} object
   * describing the kinds of restrictions that caused this error.
   */
  'RESTRICTIONS_CANNOT_BE_MET': 4012,

  // RETIRED: 'INTERNAL_ERROR_KEY_STATUS': 4013,

  /* *
   * No valid periods were found in the manifest.  Please check that your
   * manifest is correct and free of typos.
   */
  'NO_PERIODS': 4014,

  /* *
   * HLS playlist doesn't start with a mandory #EXTM3U tag.
   */
  'HLS_PLAYLIST_HEADER_MISSING': 4015,

  /* *
   * HLS tag has an invalid name that doesn't start with '#EXT'
   * <br> error.data[0] is the invalid tag.
   */
  'INVALID_HLS_TAG': 4016,

  /* *
   * HLS playlist has both Master and Media/Segment tags.
   */
  'HLS_INVALID_PLAYLIST_HIERARCHY': 4017,

  /* *
   * A Representation has an id that is the same as another Representation in
   * the same Period.  This makes manifest updates impossible since we cannot
   * map the updated Representation to the old one.
   */
  'DASH_DUPLICATE_REPRESENTATION_ID': 4018,

  // RETIRED: 'HLS_MEDIA_INIT_SECTION_INFO_MISSING': 4019,

  /* *
   * HLS manifest has several #EXT-X-MAP tags. We can only
   * support one at the moment.
   */
  'HLS_MULTIPLE_MEDIA_INIT_SECTIONS_FOUND': 4020,

  /* *
   * HLS parser was unable to guess mime type of a stream.
   * <br> error.data[0] is the stream file's extension.
   */
  'HLS_COULD_NOT_GUESS_MIME_TYPE': 4021,

  /* *
   * No Master Playlist has been provided. Master playlist provides
   * vital information about the streams (like codecs) that is
   * required for MediaSource. We don't support directly providing
   * a Media Playlist.
   */
  'HLS_MASTER_PLAYLIST_NOT_PROVIDED': 4022,

  /* *
   * One of the required attributes was not provided, so the
   * HLS manifest is invalid.
   * <br> error.data[0] is the missing attribute's name.
   */
  'HLS_REQUIRED_ATTRIBUTE_MISSING': 4023,

  /* *
   * One of the required tags was not provided, so the
   * HLS manifest is invalid.
   * <br> error.data[0] is the missing tag's name.
   */
  'HLS_REQUIRED_TAG_MISSING': 4024,

  /* *
   * The HLS parser was unable to guess codecs of a stream.
   * <br> error.data[0] is the list of all codecs for the variant.
   */
  'HLS_COULD_NOT_GUESS_CODECS': 4025,

  /* *
   * The HLS parser has encountered encrypted content with unsupported
   * KEYFORMAT attributes.
   */
  'HLS_KEYFORMATS_NOT_SUPPORTED': 4026,

  /* *
   * The manifest parser only supports xlink links with xlink:actuate='onLoad'.
   */
  'DASH_UNSUPPORTED_XLINK_ACTUATE': 4027,

  /* *
   * The manifest parser has hit its depth limit on xlink link chains.
   */
  'DASH_XLINK_DEPTH_LIMIT': 4028,

  // RETIRED: 'HLS_LIVE_CONTENT_NOT_SUPPORTED': 4029,

  /* *
   * The HLS parser was unable to parse segment start time from the media.
   * <br> error.data[0] is the failed media playlist URI.
   * <br> error.data[1] is the failed media segment URI (if any).
   */
  'HLS_COULD_NOT_PARSE_SEGMENT_START_TIME': 4030,

  // RETIRED: 'HLS_MEDIA_SEQUENCE_REQUIRED_IN_LIVE_STREAMS': 4031,

  /* *
   * The content container or codecs are not supported by this browser. For
   * example, this could happen if the content is WebM, but your browser does
   * not support the WebM container, or if the content uses HEVC, but your
   * browser does not support the HEVC codec.  This can also occur for
   * multicodec or multicontainer manifests if none of the codecs or containers
   * are supported by the browser.
   *
   * To see what your browser supports, you can check the JSON data dumped by
   * http://support.shaka-player-demo.appspot.com/
   */
  'CONTENT_UNSUPPORTED_BY_BROWSER': 4032,

  /* *
   * External text tracks cannot be added to live streams.
   */
  'CANNOT_ADD_EXTERNAL_TEXT_TO_LIVE_STREAM': 4033,

  /* *
   * We do not support AES-128 encryption with HLS yet.
   */
  'HLS_AES_128_ENCRYPTION_NOT_SUPPORTED': 4034,

  /* *
   * An internal error code that should never be seen by applications, thrown
   * to force the HLS parser to skip an unsupported stream.
   */
  'HLS_INTERNAL_SKIP_STREAM': 4035,

  // RETIRED: 'INCONSISTENT_BUFFER_STATE': 5000,
  // RETIRED: 'INVALID_SEGMENT_INDEX': 5001,
  // RETIRED: 'SEGMENT_DOES_NOT_EXIST': 5002,
  // RETIRED: 'CANNOT_SATISFY_BYTE_LIMIT': 5003,
  // RETIRED: 'BAD_SEGMENT': 5004,

  /* *
   * The StreamingEngine called onChooseStreams() but the callback receiver
   * did not return the correct number or type of Streams.
   *
   * This can happen when there is multi-Period content where one Period is
   * video+audio and another is video-only or audio-only.  We don't support this
   * case because it is incompatible with MSE.  When the browser reaches the
   * transition, it will pause, waiting for the audio stream.
   */
  'INVALID_STREAMS_CHOSEN': 5005,
  /* *
   * The manifest indicated protected content, but the manifest parser was
   * unable to determine what key systems should be used.
   */
  'NO_RECOGNIZED_KEY_SYSTEMS': 6000,

  /* *
   * None of the requested key system configurations are available.  This may
   * happen under the following conditions:
   * <ul>
   *   <li> The key system is not supported.
   *   <li> The key system does not support the features requested (e.g.
   *        persistent state).
   *   <li> A user prompt was shown and the user denied access.
   *   <li> The key system is not available from unsecure contexts. (i.e.
            requires HTTPS) See https://bit.ly/2K9X1nY
   * </ul>
   */
  'REQUESTED_KEY_SYSTEM_CONFIG_UNAVAILABLE': 6001,

  /* *
   * The browser found one of the requested key systems, but it failed to
   * create an instance of the CDM for some unknown reason.
   * <br> error.data[0] is an error message string from the browser.
   */
  'FAILED_TO_CREATE_CDM': 6002,

  /* *
   * The browser found one of the requested key systems and created an instance
   * of the CDM, but it failed to attach the CDM to the video for some unknown
   * reason.
   * <br> error.data[0] is an error message string from the browser.
   */
  'FAILED_TO_ATTACH_TO_VIDEO': 6003,

  /* *
   * The CDM rejected the server certificate supplied by the application.
   * The certificate may be malformed or in an unsupported format.
   * <br> error.data[0] is an error message string from the browser.
   */
  'INVALID_SERVER_CERTIFICATE': 6004,

  /* *
   * The CDM refused to create a session for some unknown reason.
   * <br> error.data[0] is an error message string from the browser.
   */
  'FAILED_TO_CREATE_SESSION': 6005,

  /* *
   * The CDM was unable to generate a license request for the init data it was
   * given.  The init data may be malformed or in an unsupported format.
   * <br> error.data[0] is an error message string from the browser.
   * <br> error.data[1] is the error object from the browser.
   * <br> error.data[2] is a string with the extended error code, if available.
   * <br> See top of file for links to browser error codes.
   */
  'FAILED_TO_GENERATE_LICENSE_REQUEST': 6006,

  /* *
   * The license request failed.  This could be a timeout, a network failure, or
   * a rejection by the server.
   * <br> error.data[0] is a Error from the networking engine.
   */
  'LICENSE_REQUEST_FAILED': 6007,

  /* *
   * The license response was rejected by the CDM.  The server's response may be
   * invalid or malformed for this CDM.
   * <br> error.data[0] is an error message string from the browser.
   * <br> See top of file for links to browser error codes.
   */
  'LICENSE_RESPONSE_REJECTED': 6008,

  // RETIRED: 'NO_LICENSE_SERVER_SPECIFIED': 6009,

  // RETIRED: 'WRONG_KEYS': 6011,

  /* *
   * No license server was given for the key system signaled by the manifest.
   * A license server URI is required for every key system.
   * <br> error.data[0] is the key system identifier.
   */
  'NO_LICENSE_SERVER_GIVEN': 6012,

  /* *
   * A required offline session was removed.  The content is not playable.
   */
  'OFFLINE_SESSION_REMOVED': 6013,

  /* *
   * The license has expired.  This is triggered when all keys in the key
   * status map have a status of 'expired'.
   */
  'EXPIRED': 6014,

  /* *
   * A server certificate wasn't given when it is required.  FairPlay requires
   * setting an explicit server certificate in the configuration.
   */
  'SERVER_CERTIFICATE_REQUIRED': 6015,

  /* *
   * An error was thrown while executing the init data transformation.
   * <br> error.data[0] is the original error.
   */
  'INIT_DATA_TRANSFORM_ERROR': 6016,
  /* *
   * The call to Player.load() was interrupted by a call to Player.unload()
   * or another call to Player.load().
   */
  'LOAD_INTERRUPTED': 7000,

  /* *
   * An internal error which indicates that an operation was aborted.  This
   * should not be seen by applications.
   */
  'OPERATION_ABORTED': 7001,

  /* *
   * The call to Player.load() failed because the Player does not have a video
   * element.  The video element must either be provided to the constructor or
   * to Player.attach() before Player.load() is called.
   */
  'NO_VIDEO_ELEMENT': 7002,

  /* *
   * The operation failed because the object has been destroyed.
   */
  'OBJECT_DESTROYED': 7003,
  /* *
   * The Cast API is unavailable.  This may be because of one of the following:
   *  1. The browser may not have Cast support
   *  2. The browser may be missing a necessary Cast extension
   *  3. The Cast sender library may not be loaded in your app
   */
  'CAST_API_UNAVAILABLE': 8000,

  /* *
   * No cast receivers are available at this time.
   */
  'NO_CAST_RECEIVERS': 8001,

  /* *
   * The library is already casting.
   */
  'ALREADY_CASTING': 8002,

  /* *
   * A Cast SDK error that we did not explicitly plan for has occurred.
   * Check data[0] and refer to the Cast SDK documentation for details.
   * <br> error.data[0] is an error object from the Cast SDK.
   */
  'UNEXPECTED_CAST_ERROR': 8003,

  /* *
   * The cast operation was canceled by the user.
   * <br> error.data[0] is an error object from the Cast SDK.
   */
  'CAST_CANCELED_BY_USER': 8004,

  /* *
   * The cast connection timed out.
   * <br> error.data[0] is an error object from the Cast SDK.
   */
  'CAST_CONNECTION_TIMED_OUT': 8005,

  /* *
   * The requested receiver app ID does not exist or is unavailable.
   * Check the requested app ID for typos.
   * <br> error.data[0] is an error object from the Cast SDK.
   */
  'CAST_RECEIVER_APP_UNAVAILABLE': 8006,
  // RETIRED: CAST_RECEIVER_APP_ID_MISSING': 8007,
  /* *
   * Offline storage is not supported on this browser; it is required for
   * offline support.
   */
  'STORAGE_NOT_SUPPORTED': 9000,

  /* *
   * An unknown error occurred in the IndexedDB.
   * <br> On Firefox, one common source for UnknownError calls is reverting
   * Firefox to an old version. This makes the IndexedDB storage inaccessible
   * for older versions. The only way to fix this is to delete the storage
   * data in your profile. See https://mzl.la/2yCGWCm
   * <br> error.data[0] is the error object.
   */
  'INDEXED_DB_ERROR': 9001,

  /* *
   * The storage operation was aborted.  Deprecated in favor of more general
   * OPERATION_ABORTED.
   */
  'DEPRECATED_OPERATION_ABORTED': 9002,

  /* *
   * The specified item was not found in the IndexedDB.
   * <br> error.data[0] is the offline URI.
   */
  'REQUESTED_ITEM_NOT_FOUND': 9003,

  /* *
   * A network request was made with a malformed offline URI.
   * <br> error.data[0] is the URI.
   */
  'MALFORMED_OFFLINE_URI': 9004,

  /* *
   * The specified content is live or in-progress.
   * Live and in-progress streams cannot be stored offline.
   * <br> error.data[0] is the URI.
   */
  'CANNOT_STORE_LIVE_OFFLINE': 9005,

  /* *
   * There is already a store operation in-progress. Wait until it completes
   * before starting another.
   */
  'STORE_ALREADY_IN_PROGRESS': 9006,

  /* *
   * There was no init data available for offline storage.  This happens when
   * there is no init data in the manifest nor could we find any in the
   * segments.  We currently only support searching MP4 init segments for init
   * data.
   */
  'NO_INIT_DATA_FOR_OFFLINE': 9007,

  /* *
   * shaka.offline.Storage was constructed with a Player proxy instead of a
   * local player instance.  To fix this, use Player directly with Storage
   * instead of the results of CastProxy.prototype.getPlayer().
   */
  'LOCAL_PLAYER_INSTANCE_REQUIRED': 9008,

  // RETIRED/MOVED TO 4000's: 'CONTENT_UNSUPPORTED_BY_BROWSER': 9009,

  // RETIRED: 'UNSUPPORTED_UPGRADE_REQUEST': 9010,

  /* *
   * The storage cell does not allow new operations that require new keys.
   */
  'NEW_KEY_OPERATION_NOT_SUPPORTED': 9011,

  /* *
   * A key was not found in a storage cell.
   */
  'KEY_NOT_FOUND': 9012,

  /* *
   * A storage cell was not found.
   */
  'MISSING_STORAGE_CELL': 9013,

  /* *
   * CS IMA SDK, required for ad insertion, has not been included on the page.
   */
  'CS_IMA_SDK_MISSING': 10000,

  /* *
   * Client Side Ad Manager needs to be initialized to enable Client Side
   * Ad Insertion. Call adManager.initClientSide() to do it.
   */
  'CS_AD_MANAGER_NOT_INITIALIZED': 10001,

  /* *
   * SS IMA SDK, required for ad insertion, has not been included on the page.
   */
  'SS_IMA_SDK_MISSING': 10002,

  /* *
   * Server Side Ad Manager needs to be initialized to enable Server Side
   * Ad Insertion. Call adManager.initServerSide() to do it.
   */
  'SS_AD_MANAGER_NOT_INITIALIZED': 10003
}

function split(uri) {
  // See @return comment -- never null.
  return /* * @type {!Array.<string|undefined>} */ (uri.match(new RegExp(
    '^' +
    '(?:' +
        '([^:/?#.]+)' + // scheme - ignore special characters
    // used by other URL parts such as :,
    // ?, /, #, and .
    ':)?' +
    '(?://' +
        '(?:([^/?#]*)@)?' + // userInfo
        '([^/#?]*?)' + // domain
        '(?::([0-9]+))?' + // port
        '(?=[/#?]|$)' + // authority-terminating character
    ')?' +
    '([^?#]+)?' + // path
    '(?:\\?([^#]*))?' + // query
    '(?:#(.*))?' + // fragment
    '$')))
}

class Uri {
  constructor(uri) {
    // Parse in the uri string
    var m
    if (uri instanceof Uri) {
      this.setScheme(uri.getScheme())
      this.setUserInfo(uri.getUserInfo())
      this.setDomain(uri.getDomain())
      this.setPort(uri.getPort())
      this.setPath(uri.getPath())
      this.setQueryData(uri.getQueryData().clone())
      this.setFragment(uri.getFragment())
    } else if (uri && (m = split(String(uri)))) {
      // Set the parts -- decoding as we do so.
      // COMPATABILITY NOTE - In IE, unmatched fields may be empty strings,
      // whereas in other browsers they will be undefined.
      this.setScheme(m[Uri.ComponentIndex.SCHEME] || '', true)
      this.setUserInfo(m[Uri.ComponentIndex.USER_INFO] || '', true)
      this.setDomain(m[Uri.ComponentIndex.DOMAIN] || '', true)
      this.setPort(m[Uri.ComponentIndex.PORT])
      this.setPath(m[Uri.ComponentIndex.PATH] || '', true)
      this.setQueryData(m[Uri.ComponentIndex.QUERY_DATA] || '', true)
      this.setFragment(m[Uri.ComponentIndex.FRAGMENT] || '', true)
    } else {
      this.queryData_ = new Uri.QueryData(null, null)
    }
  }
  toString() {
    var out = []
    var scheme = this.getScheme()
    if (scheme) {
      out.push(Uri.encodeSpecialChars_(
        scheme, Uri.reDisallowedInSchemeOrUserInfo_, true), ':')
    }

    var domain = this.getDomain()
    if (domain) {
      out.push('//')

      var userInfo = this.getUserInfo()
      if (userInfo) {
        out.push(Uri.encodeSpecialChars_(
          userInfo, Uri.reDisallowedInSchemeOrUserInfo_, true), '@')
      }

      out.push(Uri.removeDoubleEncoding_(encodeURIComponent(domain)))

      var port = this.getPort()
      if (port !== null) {
        out.push(':', String(port))
      }
    }

    var path = this.getPath()
    if (path) {
      if (this.hasDomain() && path.charAt(0) !== '/') {
        out.push('/')
      }
      out.push(Uri.encodeSpecialChars_(
        path,
        path.charAt(0) === '/'
          ? Uri.reDisallowedInAbsolutePath_
          : Uri.reDisallowedInRelativePath_,
        true))
    }

    var query = this.getEncodedQuery()
    if (query) {
      out.push('?', query)
    }

    var fragment = this.getFragment()
    if (fragment) {
      out.push('#', Uri.encodeSpecialChars_(
        fragment, Uri.reDisallowedInFragment_))
    }
    return out.join('')
  }

  resolve(relativeUri) {
    var absoluteUri = this.clone()
    if (absoluteUri.scheme_ === 'data') {
      // Cannot have a relative URI to a data URI.
      absoluteUri = new Uri()
    }

    // we satisfy these conditions by looking for the first part of relativeUri
    // that is not blank and applying defaults to the rest

    var overridden = relativeUri.hasScheme()

    if (overridden) {
      absoluteUri.setScheme(relativeUri.getScheme())
    } else {
      overridden = relativeUri.hasUserInfo()
    }

    if (overridden) {
      absoluteUri.setUserInfo(relativeUri.getUserInfo())
    } else {
      overridden = relativeUri.hasDomain()
    }

    if (overridden) {
      absoluteUri.setDomain(relativeUri.getDomain())
    } else {
      overridden = relativeUri.hasPort()
    }

    var path = relativeUri.getPath()
    if (overridden) {
      absoluteUri.setPort(relativeUri.getPort())
    } else {
      overridden = relativeUri.hasPath()
      if (overridden) {
        // resolve path properly
        if (path.charAt(0) !== '/') {
          // path is relative
          if (this.hasDomain() && !this.hasPath()) {
            // RFC 3986, section 5.2.3, case 1
            path = '/' + path
          } else {
            // RFC 3986, section 5.2.3, case 2
            var lastSlashIndex = absoluteUri.getPath().lastIndexOf('/')
            if (lastSlashIndex !== -1) {
              path = absoluteUri.getPath().substr(0, lastSlashIndex + 1) + path
            }
          }
        }
        path = Uri.removeDotSegments(path)
      }
    }

    if (overridden) {
      absoluteUri.setPath(path)
    } else {
      overridden = relativeUri.hasQuery()
    }

    if (overridden) {
      absoluteUri.setQueryData(relativeUri.getQueryData().clone())
    } else {
      overridden = relativeUri.hasFragment()
    }

    if (overridden) {
      absoluteUri.setFragment(relativeUri.getFragment())
    }

    return absoluteUri
  }

  clone() {
    return new Uri(this)
  }

  getScheme() {
    return this.scheme_
  }

  setScheme(newScheme, decode) {
    this.scheme_ = decode ? Uri.decodeOrEmpty_(newScheme, true)
      : newScheme

    // remove an : at the end of the scheme so somebody can pass in
    // location.protocol
    if (this.scheme_) {
      this.scheme_ = this.scheme_.replace(/:$/, '')
    }
    return this
  }

  hasScheme() {
    return !!this.scheme_
  }

  getUserInfo() {
    return this.userInfo_
  }

  setUserInfo(newUserInfo, decode) {
    this.userInfo_ = decode ? Uri.decodeOrEmpty_(newUserInfo) : newUserInfo
    return this
  }

  hasUserInfo() {
    return !!this.userInfo_
  }

  getDomain() {
    return this.domain_
  }

  setDomain(newDomain, decode) {
    this.domain_ = decode ? Uri.decodeOrEmpty_(newDomain, true) : newDomain
    return this
  }

  hasDomain() {
    return !!this.domain_
  }

  getPort() {
    return this.port_
  }

  setPort(newPort) {
    if (newPort) {
      newPort = Number(newPort)
      if (isNaN(newPort) || newPort < 0) {
        throw Error('Bad port number ' + newPort)
      }
      this.port_ = newPort
    } else {
      this.port_ = null
    }

    return this
  }

  hasPort() {
    return this.port_ !== null
  }

  getPath() {
    return this.path_
  }

  /* *
   * Sets the path.
   * @param {string} newPath New path value.
   * @param {boolean=} decode Optional param for whether to decode new value.
   * @return {!goog.Uri} Reference to this URI object.
   */
  setPath(newPath, decode) {
    this.path_ = decode ? Uri.decodeOrEmpty_(newPath, true) : newPath
    return this
  }

  /* *
   * @return {boolean} Whether the path has been set.
   */
  hasPath() {
    return !!this.path_
  }

  /* *
   * @return {boolean} Whether the query string has been set.
   */
  hasQuery() {
    return this.queryData_.toString() !== ''
  }

  /* *
   * Sets the query data.
   * @param {static QueryData|string|undefined} queryData QueryData object.
   * @param {boolean=} decode Optional param for whether to decode new value.
   *     Applies only if queryData is a string.
   * @return {!goog.Uri} Reference to this URI object.
   */
  setQueryData(queryData, decode) {
    if (queryData instanceof Uri.QueryData) {
      this.queryData_ = queryData
    } else {
      if (!decode) {
        // QueryData accepts encoded query string, so encode it if
        // decode flag is not true.
        queryData = Uri.encodeSpecialChars_(queryData, Uri.reDisallowedInQuery_)
      }
      this.queryData_ = new Uri.QueryData(queryData, null)
    }
    return this
  }

  /* *
   * @return {string} The encoded URI query, not including the ?.
   */
  getEncodedQuery() {
    return this.queryData_.toString()
  }

  /* *
   * @return {string} The decoded URI query, not including the ?.
   */
  getDecodedQuery() {
    return this.queryData_.toDecodedString()
  }

  /* *
   * Returns the query data.
   * @return {!static QueryData} QueryData object.
   */
  getQueryData() {
    return this.queryData_
  }

  /* *
   * @return {string} The URI fragment, not including the #.
   */
  getFragment() {
    return this.fragment_
  }

  /* *
   * Sets the URI fragment.
   * @param {string} newFragment New fragment value.
   * @param {boolean=} decode Optional param for whether to decode new value.
   * @return {!goog.Uri} Reference to this URI object.
   */
  setFragment(newFragment, decode) {
    this.fragment_ = decode ? Uri.decodeOrEmpty_(newFragment) : newFragment
    return this
  }

  /* *
   * @return {boolean} Whether the URI has a fragment set.
   */
  hasFragment() {
    return !!this.fragment_
  }

  /* * Static members
   * Removes dot segments in given path component, as described in
   * RFC 3986, section 5.2.4.
   *
   * @param {string} path A non-empty path component.
   * @return {string} Path component with removed dot segments.
   */
  static removeDotSegments(path) {
    if (path === '..' || path === '.') {
      return ''
    } else if (path.indexOf('./') === -1 &&
               path.indexOf('/.') === -1) {
      // This optimization detects uris which do not contain dot-segments,
      // and as a consequence do not require any processing.
      return path
    } else {
      var leadingSlash = (path.lastIndexOf('/', 0) === 0)
      var segments = path.split('/')
      var out = []

      for (var pos = 0; pos < segments.length;) {
        var segment = segments[pos++]

        if (segment === '.') {
          if (leadingSlash && pos === segments.length) {
            out.push('')
          }
        } else if (segment === '..') {
          if (out.length > 1 || out.length === 1 && out[0] !== '') {
            out.pop()
          }
          if (leadingSlash && pos === segments.length) {
            out.push('')
          }
        } else {
          out.push(segment)
          leadingSlash = true
        }
      }

      return out.join('/')
    }
  }

  /* *
   * Decodes a value or returns the empty string if it isn't defined or empty.
   * @param {string|undefined} val Value to decode.
   * @param {boolean=} preserveReserved If true, restricted characters will
   *     not be decoded.
   * @return {string} Decoded value.
   * @private
   */
  static decodeOrEmpty_(val, preserveReserved) {
    // Don't use UrlDecode() here because val is not a query parameter.
    if (!val) {
      return ''
    }

    return preserveReserved ? decodeURI(val) : decodeURIComponent(val)
  }

  /* *
   * If unescapedPart is non null, then escapes any characters in it that aren't
   * valid characters in a url and also escapes any special characters that
   * appear in extra.
   *
   * @param {*} unescapedPart The string to encode.
   * @param {RegExp} extra A character set of characters in [\01-\177].
   * @param {boolean=} removeDoubleEncoding If true, remove double percent
   *     encoding.
   * @return {?string} null iff unescapedPart === null.
   * @private
   */
  static encodeSpecialChars_(unescapedPart, extra,
    removeDoubleEncoding) {
    if (typeof unescapedPart === 'string') {
      var encoded = encodeURI(unescapedPart)
        .replace(extra, Uri.encodeChar_)
      if (removeDoubleEncoding) {
        // encodeURI double-escapes %XX sequences used to represent restricted
        // characters in some URI components, remove the double escaping here.
        encoded = Uri.removeDoubleEncoding_(encoded)
      }
      return encoded
    }
    return null
  }

  /* *
   * Converts a character in [\01-\177] to its unicode character equivalent.
   * @param {string} ch One character string.
   * @return {string} Encoded string.
   * @private
   */
  static encodeChar_(ch) {
    var n = ch.charCodeAt(0)
    return '%' + ((n >> 4) & 0xf).toString(16) + (n & 0xf).toString(16)
  }

  /* *
   * Removes double percent-encoding from a string.
   * @param  {string} doubleEncodedString String
   * @return {string} String with double encoding removed.
   * @private
   */
  static removeDoubleEncoding_(doubleEncodedString) {
    return doubleEncodedString.replace(/%25([0-9a-fA-F]{2})/g, '%$1')
  }
}

// eslint-disable-next-line
Uri.reDisallowedInQuery_ = /[\#\?@]/g;

Uri.reDisallowedInRelativePath_ =
  // eslint-disable-next-line
  /[\#\?:]/g;

// eslint-disable-next-line
Uri.reDisallowedInSchemeOrUserInfo_ = /[#\/\?@]/g;

// eslint-disable-next-line
Uri.reDisallowedInAbsolutePath_ = /[\#\?]/g;

Uri.reDisallowedInFragment_ = /#/g

Uri.ComponentIndex = {
  SCHEME: 1,
  USER_INFO: 2,
  DOMAIN: 3,
  PORT: 4,
  PATH: 5,
  QUERY_DATA: 6,
  FRAGMENT: 7
}

Uri.QueryData = class {
  constructor(query, uri) {
    /* *
       * Encoded query string, or null if it requires computing from the key map.
       * @type {?string}
       * @private
       */
    this.encodedQuery_ = query || null
  }
  /* *
     * If the underlying key map is not yet initialized, it parses the
     * query string and fills the map with parsed data.
     * @private
     */
  ensureKeyMapInitialized_() {
    if (!this.keyMap_) {
      this.keyMap_ = {}
      this.count_ = 0

      if (this.encodedQuery_) {
        var pairs = this.encodedQuery_.split('&')
        for (var i = 0; i < pairs.length; i++) {
          var indexOfEquals = pairs[i].indexOf('=')
          var name = null
          var value = null
          if (indexOfEquals >= 0) {
            name = pairs[i].substring(0, indexOfEquals)
            value = pairs[i].substring(indexOfEquals + 1)
          } else {
            name = pairs[i]
          }
          name = decodeURIComponent(name.replace(/\+/g, ' '))
          value = value || ''
          this.add(name, decodeURIComponent(value.replace(/\+/g, ' ')))
        }
      }
    }
  }

  /* *
     * The map containing name/value or name/array-of-values pairs.
     * May be null if it requires parsing from the query string.
     *
     * We need to use a Map because we cannot guarantee that the key names will
     * not be problematic for IE.
     *
     * @type {Object.<string, !Array.<string>>}
     * @private
     */
  // eslint-disable-next-line
    // keyMap_ = null

  /* *
     * The number of params, or null if it requires computing.
     * @type {?number}
     * @private
     */
  // count_ = null

  /* *
     * @return {?number} The number of parameters.
     */
  getCount() {
    this.ensureKeyMapInitialized_()
    return this.count_
  }

  /* *
     * Adds a key value pair.
     * @param {string} key Name.
     * @param {*} value Value.
     * @return {!static QueryData} Instance of this object.
     */
  add(key, value) {
    this.ensureKeyMapInitialized_()
    // Invalidate the cache.
    this.encodedQuery_ = null
    var values = Object.prototype.hasOwnProperty.call(this.keyMap_, key) && this.keyMap_[key]
    if (!values) {
      this.keyMap_[key] = (values = [])
    }
    values.push(value)
    this.count_++
    return this
  }

  /* *
     * @return {string} Encoded query string.
     * @override
     */
  toString() {
    if (this.encodedQuery_) {
      return this.encodedQuery_
    }

    if (!this.keyMap_) {
      return ''
    }

    var sb = []

    for (var key in this.keyMap_) {
      var encodedKey = encodeURIComponent(key)
      var val = this.keyMap_[key]
      for (var j = 0; j < val.length; j++) {
        var param = encodedKey
        // Ensure that null and undefined are encoded into the url as
        // literal strings.
        if (val[j] !== '') {
          param += '=' + encodeURIComponent(val[j])
        }
        sb.push(param)
      }
    }
    this.encodedQuery_ = sb.join('&')
    return this.encodedQuery
  }

  /* *
     * @return {string} Decoded query string.
     */
  toDecodedString() {
    return Uri.decodeOrEmpty_(this.toString())
  }

  /* *
     * Clone the query data instance.
     * @return {!static QueryData} New instance of the QueryData object.
     */
  clone() {
    var rv = Uri.QueryData()
    rv.encodedQuery_ = this.encodedQuery_
    if (this.keyMap_) {
      var cloneMap = {}
      for (var key in this.keyMap_) {
        cloneMap[key] = this.keyMap_[key].concat()
      }
      rv.keyMap_ = cloneMap
      rv.count_ = this.count_
    }
    return rv
  }
}

// import Version from './version'
/* *
 * The enforcer's job is to call the correct callback when a feature will need
 * to be removed later or removed now.
 *
 * The 'what should be done' is not part of the enforcer, that must be provided
 * to the enforcer when it is created. This separation was created so that
 * testing and production could be equal users of the enforcer.
 *
 * @final
 */
class Enforcer {
  /* *
   * @param {!Version} libraryVersion
   * @param {Listener} onPending
   * @param {Listener} onExpired
   */
  constructor(libraryVersion, onPending, onExpired) {
    /* * @private {!Version} */
    this.libraryVersion_ = libraryVersion

    /* * @private {Listener} */
    this.onPending_ = onPending
    /* * @private {Listener} */
    this.onExpired_ = onExpired
  }

  /* *
   * Tell the enforcer that a feature will expire on |expiredOn| and that it
   * should notify the listeners if it is pending or expired.
   *
   * @param {!Version} expiresOn
   * @param {string} name
   * @param {string} description
   */
  enforce(expiresOn, name, description) {
    // If the expiration version is larger than the library version
    // (compareTo > 0), it means the expiration is in the future, and is still
    // pending.
    const isPending = expiresOn.compareTo(this.libraryVersion_) > 0

    // Find the right callback (pending or expired) for this enforcement request
    // call it to handle this features pending/expired removal.
    const callback = isPending ? this.onPending_ : this.onExpired_
    callback(this.libraryVersion_, expiresOn, name, description)
  }
}

/* *
 * A callback for listening to deprecation events.
 *
 * Parameters:
 *  libraryVersion: !Version
 *  featureVersion: !Version
 *  name: string
 *  description: string
 *
 * libraryVersion: The current version of the library.
 * featureVersion: The version of the library when the feature should be
 *                 removed.
 * name: The name of the feature that will/should be removed.
 * description: A description of what is changing.
 *
 * @typedef {function(
 *    !Version,
 *    !Version,
 *    string,
 *    string)}
 */
// Listener

/* *
 * A class that defines what a library version is within the deprecation
 * system. Within deprecation we only care about the major and minor versions.
 *
 * @final
 */
class Version {
  /* *
   * @param {number} major
   * @param {number} minor
   */
  constructor(major, minor) {
    this.major_ = major
    this.minor_ = minor
  }

  /* * @return {number} */
  major() { return this.major_ }

  /* * @return {number} */
  minor() { return this.minor_ }

  /* *
   * Returns:
   *  - positive if |this| > |other|
   *  - zero if |this| == |other|
   *  - negative if |this| < |other|
   *
   * @param {!Version} other
   * @return {number}
   */
  compareTo(other) {
    const majorCheck = this.major_ - other.major_
    const minorCheck = this.minor_ - other.minor_

    return majorCheck || minorCheck
  }

  /* * @override */
  toString() {
    return 'v' + this.major_ + '.' + this.minor_
  }

  /* *
   * Parse the major and minor values out of a version string that is assumed
   * to follow the grammar: 'vMAJOR.MINOR.'. What comes after the last '.' we
   * will ignore.
   *
   * @param {string} versionString
   * @return {!Version}
   */
  static parse(versionString) {
    // Make sure to drop the 'v' from the front. We limit the number of splits
    // to two as we don't care what happens after the minor version number.
    // For example: 'a.b.c.d'.split('.', 2) == ['a', 'b']
    const components = versionString.substring(1).split('.', /*  limit= */ 2)

    return new Version(
      Number(components[0]),
      Number(components[1]))
  }
}

/* *
 * |shaka.Deprecate| is the front-end of the deprecation system, allowing for
 * any part of the code to say that 'this block of code should be removed by
 * version X'.
 *
 * @final
 */
class Deprecate {
  /* *
   * Initialize the system. This must happen before any calls to |enforce|. In
   * our code base, |shaka.Player| will be the only one to call this (it has the
   * version string).
   *
   * If the |Deprecate| called |Player.version| to initialize itself, it would
   * mean that |Player| could not use |Deprecate| because it would create a
   * circular dependency. To work around this, we provide this method so that
   * |Player| can give us the version without us needing to know about |Player|.
   *
   * This will initialize the system to:
   *  - print warning messages when the feature is scheduled to be removed in a
   *    later version
   *  - print errors and fail assertions when the feature should be removed now
   *
   * @param {string} versionString
   */
  static init(versionString) {
    console.assert(Deprecate.enforcer_ == null, 'Deprecate.init should only be called once.')
    Deprecate.enforcer_ = new Enforcer(
      Version.parse(versionString),
      Deprecate.onPending_,
      Deprecate.onExpired_)
  }

  /* *
   * Ask the deprecation system to require this feature to be removed by the
   * given version.
   *
   * @param {number} major
   * @param {number} minor
   * @param {string} name
   * @param {string} description
   */
  static deprecateFeature(major, minor, name, description) {
    const enforcer = Deprecate.enforcer_
    console.assert(
      enforcer,
      'Missing deprecation enforcer. Was |init| called?')

    const expiresAt = new Version(major, minor)
    enforcer.enforce(expiresAt, name, description)
  }

  /* *
   * @param {!Version} libraryVersion
   * @param {!Version} featureVersion
   * @param {string} name
   * @param {string} description
   * @private
   */
  static onPending_(libraryVersion, featureVersion, name, description) {
    // If we were to pass each value to the log call, it would be printed as
    // a comma-separated list. To make the print state appear more natural to
    // the reader, create one string for the message.
    console.warn([
      name,
      'has been deprecated and will be removed in',
      featureVersion,
      '. We are currently at version',
      libraryVersion,
      '. Additional information:',
      description
    ].join(' '))
  }

  /* *
   * @param {!Version} libraryVersion
   * @param {!Version} featureVersion
   * @param {string} name
   * @param {string} description
   * @private
   */
  static onExpired_(libraryVersion, featureVersion, name, description) {
    // If we were to pass each value to the log call, it would be printed as
    // a comma-separated list. To make the print state appear more natural to
    // the reader, create one string for the message.
    const errorMessage = [
      name,
      'has been deprecated and has been removed in',
      featureVersion,
      '. We are now at version',
      libraryVersion,
      '. Additional information:',
      description
    ].join('')

    console.error(errorMessage)
    console.assert(false, errorMessage)
  }
}

Deprecate.enforcer_ = null

/* *
 * @summary A set of functional utility functions.
 */
class Functional {
  /* *
   * Creates a promise chain that calls the given callback for each element in
   * the array in a catch of a promise.
   *
   * e.g.:
   * Promise.reject().catch(callback(array[0])).catch(callback(array[1]))
   *
   * @param {!Array.<ELEM>} array
   * @param {function(ELEM):!Promise.<RESULT>} callback
   * @return {!Promise.<RESULT>}
   * @template ELEM,RESULT
   */
  static createFallbackPromiseChain(array, callback) {
    return array.reduce((promise, elem) => {
      return promise.catch(() => callback(elem))
    }, Promise.reject())
  }
  /* *
   * Returns the first array concatenated to the second; used to collapse an
   * array of arrays into a single array.
   *
   * @param {!Array.<T>} all
   * @param {!Array.<T>} part
   * @return {!Array.<T>}
   * @template T
   */
  static collapseArrays(all, part) {
    return all.concat(part)
  }

  /* *
   * A no-op function that ignores its arguments.  This is used to suppress
   * unused variable errors.
   * @param {...*} args
   */
  static ignored(...args) {}
  /* *
   * A no-op function.  Useful in promise chains.
   */
  static noop() {}
  /* *
   * Returns if the given value is not null; useful for filtering out null
   * values.
   *
   * @param {T} value
   * @return {boolean}
   * @template T
   */
  static isNotNull(value) {
    return value != null
  }

  /* *
   * Calls a factory function while allowing it to be a constructor for
   * reverse-compatibility.
   *
   * @param {function():!T} factory
   * @return {!T}
   * @template T
   */
  static callFactory(factory) {
    // See https://stackoverflow.com/q/10428603/1208502
    // eslint-disable-next-line no-restricted-syntax
    const obj = Object.create(factory.prototype || Object.prototype)
    // If this is a constructor, call it with our newly created object to
    // initialize it; if this isn't a constructor, the 'this' shouldn't be used
    // since it should be 'undefined'.
    let ret = factory.call(obj) // eslint-disable-line no-restricted-syntax
    // If it didn't return anything, assume it is a constructor and return our
    // 'this' value instead.
    if (!ret) {
      Deprecate.deprecateFeature(
        2, 7, 'Factories requiring new',
        'Factories should be plain functions')
      ret = obj
    }
    return ret
  }
}

/* *
 * @summary Utility functions for manifest parsing.
 */
class ManifestParserUtils {
  /* *
   * Resolves an array of relative URIs to the given base URIs. This will result
   * in M*N number of URIs.
   *
   * @param {!Array.<string>} baseUris
   * @param {!Array.<string>} relativeUris
   * @return {!Array.<string>}
   */
  static resolveUris(baseUris, relativeUris) {
    if (relativeUris.length === 0) {
      return baseUris
    }

    const relativeAsGoog = relativeUris.map((uri) => new Uri(uri))
    // Resolve each URI relative to each base URI, creating an Array of Arrays.
    // Then flatten the Arrays into a single Array.
    return baseUris.map((uri) => new Uri(uri))
      .map((base) => relativeAsGoog.map((i) => base.resolve(i)))
      .reduce(Functional.collapseArrays, [])
      .map((uri) => uri.toString())
  }
}
/* *
 * @enum {string}
 */
ManifestParserUtils.ContentType = {
  VIDEO: 'video',
  AUDIO: 'audio',
  TEXT: 'text',
  IMAGE: 'image',
  APPLICATION: 'application'
}
/* *
 * @enum {string}
 */
ManifestParserUtils.TextStreamKind = {
  SUBTITLE: 'subtitle',
  CLOSED_CAPTION: 'caption'
}
/* *
 * Specifies how tolerant the player is of inaccurate segment start times and
 * end times within a manifest. For example, gaps or overlaps between segments
 * in a SegmentTimeline which are greater than or equal to this value will
 * result in a warning message.
 *
 * @const {number}
 */
ManifestParserUtils.GAP_OVERLAP_TOLERANCE_SECONDS = 1 / 15

/* *
 * @summary
 * A utility to create Promises with convenient public resolve and reject
 * methods.
 *
 * @extends {Promise.<T>}
 * @template T
 */
class PublicPromise {
  /* *
   * @return {Promise.<T>}
   */
  constructor() {
    let resolvePromise
    let rejectPromise

    // Promise.call causes an error.  It seems that inheriting from a native
    // Promise is not permitted by JavaScript interpreters.

    // The work-around is to construct a Promise object, modify it to look like
    // the compiler's picture of PublicPromise, then return it.  The caller of
    // new PublicPromise will receive |promise| instead of |this|, and the
    // compiler will be aware of the additional properties |resolve| and
    // |reject|.

    const promise = new Promise((resolve, reject) => {
      resolvePromise = resolve
      rejectPromise = reject
    })

    // Now cast the Promise object to our subclass PublicPromise so that the
    // compiler will permit us to attach resolve() and reject() to it.
    const publicPromise = /* * @type {PublicPromise} */(promise)
    publicPromise.resolve = resolvePromise
    publicPromise.reject = rejectPromise

    return publicPromise
  }
  /* * @param {T=} value */
  resolve(value) {}
  /* * @param {*=} reason */
  reject(reason) {}
}

/* *
 * @summary
 * This contains a single value that is lazily generated when it is first
 * requested.  This can store any value except 'undefined'.
 *
 * @template T
 * @export
 */
class Lazy {
  /* * @param {function():T} gen */
  constructor(gen) {
    /* * @private {function():T} */
    this.gen_ = gen

    /* * @private {T|undefined} */
    this.value_ = undefined
  }

  /* *
   * @return {T}
   * @export
   */
  value() {
    if (this.value_ === undefined) {
      // Compiler complains about unknown fields without this cast.
      this.value_ = /* * @type {*} */ (this.gen_())
      console.assert(
        this.value_ !== undefined, 'Unable to create lazy value')
    }
    return this.value_
  }
}

/* *
 * @namespace StringUtils
 * @summary A set of string utility functions.
 * @export
 */
class StringUtils {
  /* *
   * Creates a string from the given buffer as UTF-8 encoding.
   *
   * @param {?BufferSource} data
   * @return {string}
   * @export
   */
  static fromUTF8(data) {
    if (!data) {
      return ''
    }

    let uint8 = BufferUtils.toUint8(data)
    // If present, strip off the UTF-8 BOM.
    if (uint8[0] === 0xef && uint8[1] === 0xbb && uint8[2] === 0xbf) {
      uint8 = uint8.subarray(3)
    }

    // http://stackoverflow.com/a/13691499
    const utf8 = StringUtils.fromCharCode(uint8)
    // This converts each character in the string to an escape sequence.  If the
    // character is in the ASCII range, it is not converted; otherwise it is
    // converted to a URI escape sequence.
    // Example: '\x67\x35\xe3\x82\xac' -> 'g#%E3%82%AC'
    const escaped = escape(utf8)
    // Decode the escaped sequence.  This will interpret UTF-8 sequences into
    // the correct character.
    // Example: 'g#%E3%82%AC' -> 'g#€'
    try {
      return decodeURIComponent(escaped)
    } catch (e) {
      throw new Error$1(
        Error$1.Severity.CRITICAL, Error$1.Category.TEXT,
        Error$1.Code.BAD_ENCODING)
    }
  }
  /* *
   * Creates a string from the given buffer as UTF-16 encoding.
   *
   * @param {?BufferSource} data
   * @param {boolean} littleEndian
         true to read little endian, false to read big.
   * @param {boolean=} noThrow true to avoid throwing in cases where we may
   *     expect invalid input.  If noThrow is true and the data has an odd
   *     length,it will be truncated.
   * @return {string}
   * @export
   */
  static fromUTF16(data, littleEndian, noThrow) {
    if (!data) {
      return ''
    }

    if (!noThrow && data.byteLength % 2 !== 0) {
      console.error('Data has an incorrect length, must be even.')
      throw new Error$1(
        Error$1.Severity.CRITICAL, Error$1.Category.TEXT,
        Error$1.Code.BAD_ENCODING)
    }

    // Use a DataView to ensure correct endianness.
    const length = Math.floor(data.byteLength / 2)
    const arr = new Uint16Array(length)
    const dataView = BufferUtils.toDataView(data)
    for (const i of Iterables.range(length)) {
      arr[i] = dataView.getUint16(i * 2, littleEndian)
    }
    return StringUtils.fromCharCode(arr)
  }
  /* *
   * Creates a string from the given buffer, auto-detecting the encoding that is
   * being used.  If it cannot detect the encoding, it will throw an exception.
   *
   * @param {?BufferSource} data
   * @return {string}
   * @export
   */
  static fromBytesAutoDetect(data) {
    const StringUtils = StringUtils
    if (!data) {
      return ''
    }

    const uint8 = BufferUtils.toUint8(data)
    if (uint8[0] === 0xef && uint8[1] === 0xbb && uint8[2] === 0xbf) {
      return StringUtils.fromUTF8(uint8)
    } else if (uint8[0] === 0xfe && uint8[1] === 0xff) {
      return StringUtils.fromUTF16(
        uint8.subarray(2), /*  littleEndian= */ false)
    } else if (uint8[0] === 0xff && uint8[1] === 0xfe) {
      return StringUtils.fromUTF16(uint8.subarray(2), /*  littleEndian= */ true)
    }

    const isAscii = (i) => {
      // arr[i] >= ' ' && arr[i] <= '~';
      return uint8.byteLength <= i || (uint8[i] >= 0x20 && uint8[i] <= 0x7e)
    }

    console.debug(
      'Unable to find byte-order-mark, making an educated guess.')
    if (uint8[0] === 0 && uint8[2] === 0) {
      return StringUtils.fromUTF16(data, /*  littleEndian= */ false)
    } else if (uint8[1] === 0 && uint8[3] === 0) {
      return StringUtils.fromUTF16(data, /*  littleEndian= */ true)
    } else if (isAscii(0) && isAscii(1) && isAscii(2) && isAscii(3)) {
      return StringUtils.fromUTF8(data)
    }

    throw new Error$1(
      Error$1.Severity.CRITICAL,
      Error$1.Category.TEXT,
      Error$1.Code.UNABLE_TO_DETECT_ENCODING)
  }
  /* *
   * Creates a ArrayBuffer from the given string, converting to UTF-8 encoding.
   *
   * @param {string} str
   * @return {!ArrayBuffer}
   * @export
   */
  static toUTF8(str) {
    // http://stackoverflow.com/a/13691499
    // Converts the given string to a URI encoded string.  If a character falls
    // in the ASCII range, it is not converted; otherwise it will be converted
    // to a series of URI escape sequences according to UTF-8.
    // Example: 'g#€' -> 'g#%E3%82%AC'
    const encoded = encodeURIComponent(str)
    // Convert each escape sequence individually into a character.  Each escape
    // sequence is interpreted as a code-point, so if an escape sequence happens
    // to be part of a multi-byte sequence, each byte will be converted to a
    // single character.
    // Example: 'g#%E3%82%AC' -> '\x67\x35\xe3\x82\xac'
    const utf8 = unescape(encoded)

    const result = new Uint8Array(utf8.length)
    const enumerate = (it) => Iterables.enumerate(it)
    for (const { i, item } of enumerate(utf8)) {
      result[i] = item.charCodeAt(0)
    }
    return BufferUtils.toArrayBuffer(result)
  }
  /* *
   * Creates a ArrayBuffer from the given string, converting to UTF-16 encoding.
   *
   * @param {string} str
   * @param {boolean} littleEndian
   * @return {!ArrayBuffer}
   * @export
   */
  static toUTF16(str, littleEndian) {
    const result = new ArrayBuffer(str.length * 2)
    const view = new DataView(result)
    const enumerate = (it) => Iterables.enumerate(it)
    for (const { i, item } of enumerate(str)) {
      const value = item.charCodeAt(0)
      view.setUint16(/*  position= */ i * 2, value, littleEndian)
    }
    return result
  }
  /* *
   * Creates a new string from the given array of char codes.
   *
   * Using String.fromCharCode.apply is risky because you can trigger stack
   * errors on very large arrays.  This breaks up the array into several pieces
   * to avoid this.
   *
   * @param {!TypedArray} array
   * @return {string}
   */
  static fromCharCode(array) {
    return StringUtils.fromCharCodeImpl_.value()(array)
  }
}
/* * @private {!Lazy.<function(!TypedArray):string>} */
StringUtils.fromCharCodeImpl_ = new Lazy(() => {
  /* * @param {number} size @return {boolean} */
  const supportsChunkSize = (size) => {
    try {
      // The compiler will complain about suspicious value if this isn't
      // stored in a variable and used.
      const buffer = new Uint8Array(size)

      // This can't use the spread operator, or it blows up on Xbox One.
      // So we use apply() instead, which is normally not allowed.
      // See issue #2186 for more details.
      // eslint-disable-next-line no-restricted-syntax
      const foo = String.fromCharCode.apply(null, buffer)
      console.assert(foo, 'Should get value')
      return true
    } catch (error) {
      return false
    }
  }

  // Different browsers support different chunk sizes; find out the largest
  // this browser supports so we can use larger chunks on supported browsers
  // but still support lower-end devices that require small chunks.
  // 64k is supported on all major desktop browsers.
  for (let size = 64 * 1024; size > 0; size /= 2) {
    if (supportsChunkSize(size)) {
      return (buffer) => {
        let ret = ''
        for (let i = 0; i < buffer.length; i += size) {
          const subArray = buffer.subarray(i, i + size)

          // This can't use the spread operator, or it blows up on Xbox One.
          // So we use apply() instead, which is normally not allowed.
          // See issue #2186 for more details.
          // eslint-disable-next-line no-restricted-syntax
          ret += String.fromCharCode.apply(null, subArray) // Issue #2186
        }
        return ret
      }
    }
  }
  console.assert(false, 'Unable to create a fromCharCode method')
  return null
})

/* *
 * @summary A set of Uint8Array utility functions.
 * @exportDoc
 */
class Uint8ArrayUtils {
  /* *
   * Convert a buffer to a base64 string. The output will be standard
   * alphabet as opposed to base64url safe alphabet.
   * @param {BufferSource} data
   * @return {string}
   * @export
   */
  static toStandardBase64(data) {
    const bytes = StringUtils.fromCharCode(
      BufferUtils.toUint8(data))
    return btoa(bytes)
  }

  /* *
   * Convert a buffer to a base64 string.  The output will always use the
   * alternate encoding/alphabet also known as 'base64url'.
   * @param {BufferSource} data
   * @param {boolean=} padding If true, pad the output with equals signs.
   *   Defaults to true.
   * @return {string}
   * @export
   */
  static toBase64(data, padding) {
    padding = (padding === undefined) ? true : padding
    const base64 = Uint8ArrayUtils.toStandardBase64(data)
      .replace(/\+/g, '-').replace(/\//g, '_')
    return padding ? base64 : base64.replace(/[=]*$/, '')
  }

  /* *
   * Convert a base64 string to a Uint8Array.  Accepts either the standard
   * alphabet or the alternate 'base64url' alphabet.
   * @param {string} str
   * @return {!Uint8Array}
   * @export
   */
  static fromBase64(str) {
    // atob creates a 'raw string' where each character is interpreted as a
    // byte.
    const bytes = atob(str.replace(/-/g, '+').replace(/_/g, '/'))
    const result = new Uint8Array(bytes.length)
    const enumerate = (it) => Iterables.enumerate(it)
    for (const { i, item } of enumerate(bytes)) {
      result[i] = item.charCodeAt(0)
    }
    return result
  }
  /* *
   * Convert a hex string to a Uint8Array.
   * @param {string} str
   * @return {!Uint8Array}
   * @export
   */
  static fromHex(str) {
    const size = str.length / 2
    const arr = new Uint8Array(size)
    for (const i of Iterables.range(size)) {
      arr[i] = parseInt(str.substr(i * 2, 2), 16)
    }
    return arr
  }
  /* *
   * Convert a buffer to a hex string.
   * @param {BufferSource} data
   * @return {string}
   * @export
   */
  static toHex(data) {
    const arr = BufferUtils.toUint8(data)
    let hex = ''
    for (let value of arr) {
      value = value.toString(16)
      if (value.length === 1) {
        value = '0' + value
      }
      hex += value
    }
    return hex
  }
  /* *
   * Concatenate buffers.
   * @param {...BufferSource} varArgs
   * @return {!Uint8Array}
   * @export
   */
  static concat(...varArgs) {
    let totalLength = 0
    for (const arr of varArgs) {
      totalLength += arr.byteLength
    }

    const result = new Uint8Array(totalLength)
    let offset = 0
    for (const arr of varArgs) {
      result.set(BufferUtils.toUint8(arr), offset)
      offset += arr.byteLength
    }
    return result
  }
}

/* *
 * Transmuxer provides all operations for transmuxing from Transport
 * Stream to MP4.
 *
 * @implements {IDestroyable}
 */
class Transmuxer$1 {
  constructor() {
    /* * @private {muxjs.Transmuxer} */
    this.muxTransmuxer_ = new Transmuxer({
      'keepOriginalTimestamps': true
    })

    /* * @private {PublicPromise} */
    this.transmuxPromise_ = null

    /* * @private {!Array.<!Uint8Array>} */
    this.transmuxedData_ = []

    /* * @private {!Array.<muxjs.ClosedCaption>} */
    this.captions_ = []

    /* * @private {boolean} */
    this.isTransmuxing_ = false

    this.muxTransmuxer_.on('data', (segment) => this.onTransmuxed_(segment))

    this.muxTransmuxer_.on('done', () => this.onTransmuxDone_())
  }

  /* *
   * @override
   */
  destroy() {
    this.muxTransmuxer_.dispose()
    this.muxTransmuxer_ = null
    return Promise.resolve()
  }

  /* *
   * Check if the content type is Transport Stream, and if muxjs is loaded.
   * @param {string} mimeType
   * @param {string=} contentType
   * @return {boolean}
   */
  static isSupported(mimeType, contentType) {
    if (!muxjs || !Transmuxer$1.isTsContainer(mimeType)) {
      return false
    }
    const convertTsCodecs = Transmuxer$1.convertTsCodecs
    if (contentType) {
      return MediaSource.isTypeSupported(
        convertTsCodecs(contentType, mimeType))
    }
    const ContentType = ManifestParserUtils.ContentType
    return MediaSource.isTypeSupported(
      convertTsCodecs(ContentType.AUDIO, mimeType)) ||
        MediaSource.isTypeSupported(
          convertTsCodecs(ContentType.VIDEO, mimeType))
  }
  /* *
   * Check if the mimetype contains 'mp2t'.
   * @param {string} mimeType
   * @return {boolean}
   */
  static isTsContainer(mimeType) {
    return mimeType.toLowerCase().split(';')[0].split('/')[1] === 'mp2t'
  }
  /* *
   * For transport stream, convert its codecs to MP4 codecs.
   * @param {string} contentType
   * @param {string} tsMimeType
   * @return {string}
   */
  static convertTsCodecs(contentType, tsMimeType) {
    const ContentType = ManifestParserUtils.ContentType
    let mp4MimeType = tsMimeType.replace(/mp2t/i, 'mp4')
    if (contentType === ContentType.AUDIO) {
      mp4MimeType = mp4MimeType.replace('video', 'audio')
    }

    // Handle legacy AVC1 codec strings (pre-RFC 6381).
    // Look for 'avc1.<profile>.<level>', where profile is:
    //   66 (baseline => 0x42)
    //   77 (main => 0x4d)
    //   100 (high => 0x64)
    // Reference: https://bit.ly/2K9JI3x
    const match = /avc1\.(66|77|100)\.(\d+)/.exec(mp4MimeType)
    if (match) {
      let newCodecString = 'avc1.'

      const profile = match[1]
      if (profile === '66') {
        newCodecString += '4200'
      } else if (profile === '77') {
        newCodecString += '4d00'
      } else {
        console.assert(profile === '100',
          'Legacy avc1 parsing code out of sync with regex!')
        newCodecString += '6400'
      }

      // Convert the level to hex and append to the codec string.
      const level = Number(match[2])
      console.assert(level < 256,
        'Invalid legacy avc1 level number!')
      newCodecString += (level >> 4).toString(16)
      newCodecString += (level & 0xf).toString(16)

      mp4MimeType = mp4MimeType.replace(match[0], newCodecString)
    }

    return mp4MimeType
  }
  /* *
   * Transmux from Transport stream to MP4, using the mux.js library.
   * @param {BufferSource} data
   * @return {!Promise.<{data: !Uint8Array,
   *                     captions: !Array.<!muxjs.ClosedCaption>}>}
   */
  transmux(data) {
    console.assert(!this.isTransmuxing_,
      'No transmuxing should be in progress.')
    this.isTransmuxing_ = true
    this.transmuxPromise_ = new PublicPromise()
    this.transmuxedData_ = []
    this.captions_ = []

    const dataArray = BufferUtils.toUint8(data)
    this.muxTransmuxer_.push(dataArray)
    this.muxTransmuxer_.flush()

    // Workaround for https://bit.ly/Shaka1449 mux.js not
    // emitting 'data' and 'done' events.
    // mux.js code is synchronous, so if onTransmuxDone_ has
    // not been called by now, it's not going to be.
    // Treat it as a transmuxing failure and reject the promise.
    if (this.isTransmuxing_) {
      this.transmuxPromise_.reject(new Error$1(
        Error$1.Severity.CRITICAL,
        Error$1.Category.MEDIA,
        Error$1.Code.TRANSMUXING_FAILED))
    }
    return this.transmuxPromise_
  }
  /* *
   * Handles the 'data' event of the transmuxer.
   * Extracts the cues from the transmuxed segment, and adds them to an array.
   * Stores the transmuxed data in another array, to pass it back to
   * MediaSourceEngine, and append to the source buffer.
   *
   * @param {muxjs.Transmuxer.Segment} segment
   * @private
   */
  onTransmuxed_(segment) {
    this.captions_ = segment.captions
    this.transmuxedData_.push(
      Uint8ArrayUtils.concat(segment.initSegment, segment.data))
  }
  /* *
   * Handles the 'done' event of the transmuxer.
   * Resolves the transmux Promise, and returns the transmuxed data.
   * @private
   */
  onTransmuxDone_() {
    const output = {
      data: Uint8ArrayUtils.concat(...this.transmuxedData_),
      captions: this.captions_
    }

    this.transmuxPromise_.resolve(output)
    this.isTransmuxing_ = false
  }
}

/* *
 * @implements {shaka.extern.Cue}
 * @export
 */
class Cue {
  /* *
   * @param {number} startTime
   * @param {number} endTime
   * @param {string} payload
   */
  constructor(startTime, endTime, payload) {
    /* *
     * @override
     * @exportInterface
     */
    this.startTime = startTime

    /* *
     * @override
     * @exportInterface
     */
    this.direction = Cue.direction.HORIZONTAL_LEFT_TO_RIGHT

    /* *
     * @override
     * @exportInterface
     */
    this.endTime = endTime

    /* *
     * @override
     * @exportInterface
     */
    this.payload = payload

    /* *
     * @override
     * @exportInterface
     */
    this.region = new CueRegion()

    /* *
     * @override
     * @exportInterface
     */
    this.position = null

    /* *
     * @override
     * @exportInterface
     */
    this.positionAlign = Cue.positionAlign.AUTO

    /* *
     * @override
     * @exportInterface
     */
    this.size = 100

    /* *
     * @override
     * @exportInterface
     */
    this.textAlign = Cue.textAlign.CENTER

    /* *
     * @override
     * @exportInterface
     */
    this.writingMode = Cue.writingMode.HORIZONTAL_TOP_TO_BOTTOM

    /* *
     * @override
     * @exportInterface
     */
    this.lineInterpretation = Cue.lineInterpretation.LINE_NUMBER

    /* *
     * @override
     * @exportInterface
     */
    this.line = null

    /* *
     * @override
     * @exportInterface
     */
    this.lineHeight = ''

    /* *
     * Line Alignment is set to start by default.
     * @override
     * @exportInterface
     */
    this.lineAlign = Cue.lineAlign.START

    /* *
     * Set the captions at the bottom of the text container by default.
     * @override
     * @exportInterface
     */
    this.displayAlign = Cue.displayAlign.AFTER

    /* *
     * @override
     * @exportInterface
     */
    this.color = ''

    /* *
     * @override
     * @exportInterface
     */
    this.backgroundColor = ''

    /* *
     * @override
     * @exportInterface
     */
    this.backgroundImage = ''

    /* *
     * @override
     * @exportInterface
     */
    this.border = ''

    /* *
     * @override
     * @exportInterface
     */
    this.fontSize = ''

    /* *
     * @override
     * @exportInterface
     */
    this.fontWeight = Cue.fontWeight.NORMAL

    /* *
     * @override
     * @exportInterface
     */
    this.fontStyle = Cue.fontStyle.NORMAL

    /* *
     * @override
     * @exportInterface
     */
    this.fontFamily = ''

    /* *
     * @override
     * @exportInterface
     */
    this.letterSpacing = ''

    /* *
     * @override
     * @exportInterface
     */
    this.opacity = 1

    /* *
     * @override
     * @exportInterface
     */
    this.textDecoration = []

    /* *
     * @override
     * @exportInterface
     */
    this.wrapLine = true

    /* *
     * @override
     * @exportInterface
     */
    this.id = ''

    /* *
     * @override
     * @exportInterface
     */
    this.nestedCues = []

    /* *
     * @override
     * @exportInterface
     */
    this.spacer = false

    /* *
     * @override
     * @exportInterface
     */
    this.cellResolution = {
      columns: 32,
      rows: 15
    }
  }
}
/* *
 * @enum {string}
 * @export
 */
Cue.positionAlign = {
  'LEFT': 'line-left',
  'RIGHT': 'line-right',
  'CENTER': 'center',
  'AUTO': 'auto'
}
/* *
 * @enum {string}
 * @export
 */
Cue.textAlign = {
  'LEFT': 'left',
  'RIGHT': 'right',
  'CENTER': 'center',
  'START': 'start',
  'END': 'end'
}
/* *
 * Vertical alignments of the cues within their extents.
 * 'BEFORE' means displaying at the top of the captions container box, 'CENTER'
 *  means in the middle, 'BOTTOM' means at the bottom.
 * @enum {string}
 * @export
 */
Cue.displayAlign = {
  'BEFORE': 'before',
  'CENTER': 'center',
  'AFTER': 'after'
}
/* *
 * @enum {string}
 * @export
 */
Cue.direction = {
  'HORIZONTAL_LEFT_TO_RIGHT': 'ltr',
  'HORIZONTAL_RIGHT_TO_LEFT': 'rtl'
}
/* *
 * @enum {string}
 * @export
 */
Cue.writingMode = {
  'HORIZONTAL_TOP_TO_BOTTOM': 'horizontal-tb',
  'VERTICAL_LEFT_TO_RIGHT': 'vertical-lr',
  'VERTICAL_RIGHT_TO_LEFT': 'vertical-rl'
}
/* *
 * @enum {number}
 * @export
 */
Cue.lineInterpretation = {
  'LINE_NUMBER': 0,
  'PERCENTAGE': 1
}
/* *
 * @enum {string}
 * @export
 */
Cue.lineAlign = {
  'CENTER': 'center',
  'START': 'start',
  'END': 'end'
}
/* *
 * In CSS font weight can be a number, where 400 is normal and 700 is bold.
 * Use these values for the enum for consistency.
 * @enum {number}
 * @export
 */
Cue.fontWeight = {
  'NORMAL': 400,
  'BOLD': 700
}
/* *
 * @enum {string}
 * @export
 */
Cue.fontStyle = {
  'NORMAL': 'normal',
  'ITALIC': 'italic',
  'OBLIQUE': 'oblique'
}
/* *
 * @enum {string}
 * @export
 */
Cue.textDecoration = {
  'UNDERLINE': 'underline',
  'LINE_THROUGH': 'lineThrough',
  'OVERLINE': 'overline'
}
/* *
 * @implements {shaka.extern.CueRegion}
 * @struct
 * @export
 */
class CueRegion {
  constructor() {
    const CueRegion = CueRegion

    /* *
     * @override
     * @exportInterface
     */
    this.id = ''

    /* *
     * @override
     * @exportInterface
     */
    this.viewportAnchorX = 0

    /* *
     * @override
     * @exportInterface
     */
    this.viewportAnchorY = 0

    /* *
     * @override
     * @exportInterface
     */
    this.regionAnchorX = 0

    /* *
     * @override
     * @exportInterface
     */
    this.regionAnchorY = 0

    /* *
     * @override
     * @exportInterface
     */
    this.width = 100

    /* *
     * @override
     * @exportInterface
     */
    this.height = 100

    /* *
     * @override
     * @exportInterface
     */
    this.heightUnits = CueRegion.units.PERCENTAGE

    /* *
     * @override
     * @exportInterface
     */
    this.widthUnits = CueRegion.units.PERCENTAGE

    /* *
     * @override
     * @exportInterface
     */
    this.viewportAnchorUnits = CueRegion.units.PERCENTAGE

    /* *
     * @override
     * @exportInterface
     */
    this.scroll = CueRegion.scrollMode.NONE
  }
}
/* *
 * @enum {number}
 * @export
 */
CueRegion.units = {
  'PX': 0,
  'PERCENTAGE': 1,
  'LINES': 2
}
/* *
 * @enum {string}
 * @export
 */
CueRegion.scrollMode = {
  'NONE': '',
  'UP': 'up'
}

/* *
 * @summary Manages text parsers and cues.
 * @implements {IDestroyable}
 */
class TextEngine {
  /* * @param {shaka.extern.TextDisplayer} displayer */
  constructor(displayer) {
    /* * @private {shaka.extern.TextParser} */
    this.parser_ = null

    /* * @private {shaka.extern.TextDisplayer} */
    this.displayer_ = displayer

    /* * @private {number} */
    this.timestampOffset_ = 0

    /* * @private {number} */
    this.appendWindowStart_ = 0

    /* * @private {number} */
    this.appendWindowEnd_ = Infinity

    /* * @private {?number} */
    this.bufferStart_ = null

    /* * @private {?number} */
    this.bufferEnd_ = null

    /* * @private {string} */
    this.selectedClosedCaptionId_ = ''

    /* *
     * The closed captions map stores the CEA closed captions by closed captions
     * id and start and end time.
     * It's used as the buffer of closed caption text streams, to show captions
     * when we start displaying captions or switch caption tracks, we need to be
     * able to get the cues for the other language and display them without
     * re-fetching the video segments they were embedded in.
     * Structure of closed caption map:
     * closed caption id -> {start and end time -> cues}
     * @private {!Map.<string, !Map.<string, !Array.<Cue>>>} */
    this.closedCaptionsMap_ = new Map()
  }

  /* *
   * @param {string} mimeType
   * @param {!shaka.extern.TextParserPlugin} plugin
   * @export
   */
  static registerParser(mimeType, plugin) {
    TextEngine.parserMap_[mimeType] = plugin
  }

  /* *
   * @param {string} mimeType
   * @export
   */
  static unregisterParser(mimeType) {
    delete TextEngine.parserMap_[mimeType]
  }

  /* *
   * @param {string} mimeType
   * @return {boolean}
   */
  static isTypeSupported(mimeType) {
    if (TextEngine.parserMap_[mimeType]) {
      // An actual parser is available.
      return true
    }
    if (window.muxjs && mimeType === MimeUtils.CLOSED_CAPTION_MIMETYPE) {
      // Will be handled by mux.js.
      return true
    }
    return false
  }

  /* * @override */
  destroy() {
    this.parser_ = null
    this.displayer_ = null
    this.closedCaptionsMap_.clear()

    return Promise.resolve()
  }

  /* *
   * @param {!shaka.extern.TextDisplayer} displayer
   */
  setDisplayer(displayer) {
    this.displayer_ = displayer
  }

  /* *
   * Initialize the parser.  This can be called multiple times, but must be
   * called at least once before appendBuffer.
   *
   * @param {string} mimeType
   */
  initParser(mimeType) {
    // No parser for CEA, which is extracted from video and side-loaded
    // into TextEngine and TextDisplayer.
    if (mimeType === MimeUtils.CLOSED_CAPTION_MIMETYPE) {
      return
    }

    const factory = TextEngine.parserMap_[mimeType]
    console.assert(
      factory, 'Text type negotiation should have happened already')
    this.parser_ = Functional.callFactory(factory)
  }

  /* *
   * @param {BufferSource} buffer
   * @param {?number} startTime relative to the start of the presentation
   * @param {?number} endTime relative to the start of the presentation
   * @return {!Promise}
   */
  async appendBuffer(buffer, startTime, endTime) {
    console.assert(
      this.parser_, 'The parser should already be initialized')

    // Start the operation asynchronously to avoid blocking the caller.
    await Promise.resolve()

    // Check that TextEngine hasn't been destroyed.
    if (!this.parser_ || !this.displayer_) {
      return
    }

    if (startTime == null || endTime == null) {
      this.parser_.parseInit(BufferUtils.toUint8(buffer))
      return
    }

    /* * @type {shaka.extern.TextParser.TimeContext} **/
    const time = {
      periodStart: this.timestampOffset_,
      segmentStart: startTime,
      segmentEnd: endTime
    }

    // Parse the buffer and add the new cues.
    const allCues = this.parser_.parseMedia(
      BufferUtils.toUint8(buffer), time)
    const cuesToAppend = allCues.filter((cue) => {
      return cue.startTime >= this.appendWindowStart_ &&
          cue.startTime < this.appendWindowEnd_
    })

    this.displayer_.append(cuesToAppend)

    // NOTE: We update the buffered range from the start and end times
    // passed down from the segment reference, not with the start and end
    // times of the parsed cues.  This is important because some segments
    // may contain no cues, but we must still consider those ranges
    // buffered.
    if (this.bufferStart_ == null) {
      this.bufferStart_ = Math.max(startTime, this.appendWindowStart_)
    } else {
      // We already had something in buffer, and we assume we are extending
      // the range from the end.
      console.assert(
        this.bufferEnd_ !== null,
        'There should already be a buffered range end.')
      console.assert(
        (startTime - this.bufferEnd_) <= 1,
        'There should not be a gap in text references >1s')
    }
    this.bufferEnd_ = Math.min(endTime, this.appendWindowEnd_)
  }

  /* *
   * @param {number} startTime relative to the start of the presentation
   * @param {number} endTime relative to the start of the presentation
   * @return {!Promise}
   */
  async remove(startTime, endTime) {
    // Start the operation asynchronously to avoid blocking the caller.
    await Promise.resolve()

    if (this.displayer_ && this.displayer_.remove(startTime, endTime)) {
      if (this.bufferStart_ == null) {
        console.assert(
          this.bufferEnd_ == null, 'end must be null if startTime is null')
      } else {
        console.assert(
          this.bufferEnd_ !== null,
          'end must be non-null if startTime is non-null')

        // Update buffered range.
        if (endTime <= this.bufferStart_ || startTime >= this.bufferEnd_) ; else if (startTime <= this.bufferStart_ &&
                   endTime >= this.bufferEnd_) {
          // We wiped out everything.
          this.bufferStart_ = this.bufferEnd_ = null
        } else if (startTime <= this.bufferStart_ &&
                   endTime < this.bufferEnd_) {
          // We removed from the beginning of the range.
          this.bufferStart_ = endTime
        } else if (startTime > this.bufferStart_ &&
                   endTime >= this.bufferEnd_) {
          // We removed from the end of the range.
          this.bufferEnd_ = startTime
        } else {
          // We removed from the middle?  StreamingEngine isn't supposed to.
          console.assert(
            false, 'removal from the middle is not supported by TextEngine')
        }
      }
    }
  }

  /* * @param {number} timestampOffset */
  setTimestampOffset(timestampOffset) {
    this.timestampOffset_ = timestampOffset
  }

  /* *
   * @param {number} appendWindowStart
   * @param {number} appendWindowEnd
   */
  setAppendWindow(appendWindowStart, appendWindowEnd) {
    this.appendWindowStart_ = appendWindowStart
    this.appendWindowEnd_ = appendWindowEnd
  }

  /* *
   * @return {?number} Time in seconds of the beginning of the buffered range,
   *   or null if nothing is buffered.
   */
  bufferStart() {
    return this.bufferStart_
  }

  /* *
   * @return {?number} Time in seconds of the end of the buffered range,
   *   or null if nothing is buffered.
   */
  bufferEnd() {
    return this.bufferEnd_
  }

  /* *
   * @param {number} t A timestamp
   * @return {boolean}
   */
  isBuffered(t) {
    if (this.bufferStart_ == null || this.bufferEnd_ == null) {
      return false
    }
    return t >= this.bufferStart_ && t < this.bufferEnd_
  }

  /* *
   * @param {number} t A timestamp
   * @return {number} Number of seconds ahead of 't' we have buffered
   */
  bufferedAheadOf(t) {
    if (this.bufferEnd_ == null || this.bufferEnd_ < t) {
      return 0
    }

    console.assert(
      this.bufferStart_ !== null,
      'start should not be null if end is not null')

    return this.bufferEnd_ - Math.max(t, this.bufferStart_)
  }

  /* *
   * Set the selected closed captions id.
   * Append the cues stored in the closed captions map until buffer end time.
   * This is to fill the gap between buffered and unbuffered captions, and to
   * avoid duplicates that would be caused by any future video segments parsed
   * for captions.
   *
   * @param {string} id
   * @param {number} bufferEndTime Load any stored cues up to this time.
   */
  setSelectedClosedCaptionId(id, bufferEndTime) {
    this.selectedClosedCaptionId_ = id

    const captionsMap = this.closedCaptionsMap_.get(id)
    if (captionsMap) {
      for (const startAndEndTime of captionsMap.keys()) {
        /* * @type {Array.<!Cue>} */
        const cues = captionsMap.get(startAndEndTime)
          .filter((c) => c.endTime <= bufferEndTime)
        if (cues) {
          this.displayer_.append(cues)
        }
      }
    }
  }

  /* *
   * Store the closed captions in the text engine, and append the cues to the
   * text displayer.  This is a side-channel used for embedded text only.
   *
   * @param {!Array.<muxjs.mp4.ClosedCaption>} closedCaptions
   * @param {?number} startTime relative to the start of the presentation
   * @param {?number} endTime relative to the start of the presentation
   * @param {number} videoTimestampOffset the timestamp offset of the video
   *   stream in which these captions were embedded
   */
  storeAndAppendClosedCaptions(
    closedCaptions, startTime, endTime, videoTimestampOffset) {
    const startAndEndTime = startTime + ' ' + endTime
    const captionsMap = new Map()

    for (const caption of closedCaptions) {
      const id = caption.stream
      if (!captionsMap.has(id)) {
        captionsMap.set(id, new Map())
      }
      if (!captionsMap.get(id).has(startAndEndTime)) {
        captionsMap.get(id).set(startAndEndTime, [])
      }

      // Adjust CEA captions with respect to the timestamp offset of the video
      // stream in which they were embedded.
      caption.startTime += videoTimestampOffset
      caption.endTime += videoTimestampOffset

      const keepThisCue =
          caption.startTime >= this.appendWindowStart_ &&
          caption.startTime < this.appendWindowEnd_
      if (!keepThisCue) {
        continue
      }
      /* * @type {!Cue} */
      const cue = new Cue(
        caption.startTime, caption.endTime, caption.text)
      captionsMap.get(id).get(startAndEndTime).push(cue)
      if (id === this.selectedClosedCaptionId_) {
        this.displayer_.append([cue])
      }
    }

    for (const id of captionsMap.keys()) {
      if (!this.closedCaptionsMap_.has(id)) {
        this.closedCaptionsMap_.set(id, new Map())
      }
      for (const startAndEndTime of captionsMap.get(id).keys()) {
        const cues = captionsMap.get(id).get(startAndEndTime)
        this.closedCaptionsMap_.get(id).set(startAndEndTime, cues)
      }
    }

    if (this.bufferStart_ == null) {
      this.bufferStart_ = Math.max(startTime, this.appendWindowStart_)
    } else {
      this.bufferStart_ = Math.min(
        this.bufferStart_, Math.max(startTime, this.appendWindowStart_))
    }

    this.bufferEnd_ = Math.max(
      this.bufferEnd_, Math.min(endTime, this.appendWindowEnd_))
  }

  /* *
   * Get the number of closed caption channels.
   *
   * This function is for TESTING ONLY. DO NOT USE in the library.
   *
   * @return {number}
   */
  getNumberOfClosedCaptionChannels() {
    return this.closedCaptionsMap_.size
  }

  /* *
   * Get the number of closed caption cues for a given channel. If there is
   * no channel for the given channel id, this will return 0.
   *
   * This function is for TESTING ONLY. DO NOT USE in the library.
   *
   * @param {string} channelId
   * @return {number}
   */
  getNumberOfClosedCaptionsInChannel(channelId) {
    const channel = this.closedCaptionsMap_.get(channelId)
    return channel ? channel.size : 0
  }
}

/* * @private {!Object.<string, !shaka.extern.TextParserPlugin>} */
TextEngine.parserMap_ = {}

/* *
 * @summary
 * A utility class to help work with |IDestroyable| objects.
 *
 * @final
 */
class Destroyer {
  /* *
   * @param {function():!Promise} callback
   *    A callback to destroy an object. This callback will only be called once
   *    regardless of how many times |destroy| is called.
   */
  constructor(callback) {
    /* * @private {boolean} */
    this.destroyed_ = false

    /* * @private {!PublicPromise} */
    this.waitOnDestroy_ = new PublicPromise()

    /* * @private {function():!Promise} */
    this.onDestroy_ = callback
  }

  /* *
   * Check if |destroy| has been called. This returning |true| does not mean
   * that the promise returned by |destroy| has resolved yet.
   *
   * @return {boolean}
   * @final
   */
  destroyed() {
    return this.destroyed_
  }

  /* *
   * Request that the destroy callback be called. Will return a promise that
   * will resolve once the callback terminates. The promise will never be
   * rejected.
   *
   * @return {!Promise}
   * @final
   */
  destroy() {
    if (this.destroyed_) {
      return this.waitOnDestroy_
    }

    // We have started destroying this object, so we should never get here
    // again.
    this.destroyed_ = true

    return this.onDestroy_().then(
      () => { this.waitOnDestroy_.resolve() },
      () => { this.waitOnDestroy_.resolve() })
  }

  /* *
   * Checks if the object is destroyed and throws an error if it is.
   * @param {*=} error The inner error, if any.
   */
  ensureNotDestroyed(error) {
    if (this.destroyed_) {
      if (error && error.code === Error.Code.OBJECT_DESTROYED) {
        throw error
      } else {
        throw Destroyer.destroyedError(error)
      }
    }
  }

  /* *
   * @param {*=} error The inner error, if any.
   * @return {!Error}
   */
  static destroyedError(error) {
    return new Error(
      Error.Severity.CRITICAL,
      Error.Category.PLAYER,
      Error.Code.OBJECT_DESTROYED,
      error)
  }
}

// import IClosedCaptionParser from './closed_caption_parser'

/* *
 * @summary
 * MediaSourceEngine wraps all operations on MediaSource and SourceBuffers.
 * All asynchronous operations return a Promise, and all operations are
 * internally synchronized and serialized as needed.  Operations that can
 * be done in parallel will be done in parallel.
 *
 * @implements {IDestroyable}
 */
class MediaSourceEngine {
  /* *
   * @param {HTMLMediaElement} video The video element, whose source is tied to
   *   MediaSource during the lifetime of the MediaSourceEngine.
   * @param {!IClosedCaptionParser} closedCaptionParser
   *    The closed caption parser that should be used to parser closed captions
   *    from the video stream. MediaSourceEngine takes ownership of the parser.
   *    When MediaSourceEngine is destroyed, it will destroy the parser.
   * @param {!shaka.extern.TextDisplayer} textDisplayer
   *    The text displayer that will be used with the text engine.
   *    MediaSourceEngine takes ownership of the displayer. When
   *    MediaSourceEngine is destroyed, it will destroy the displayer.
   */
  constructor(video, closedCaptionParser, textDisplayer) {
    /* * @private {HTMLMediaElement} */
    this.video_ = video

    /* * @private {shaka.extern.TextDisplayer} */
    this.textDisplayer_ = textDisplayer

    /* * @private {!Object.<ManifestParserUtils.ContentType,
                           SourceBuffer>} */
    this.sourceBuffers_ = {}

    /* * @private {TextEngine} */
    this.textEngine_ = null

    /* *
     * @private {!Object.<string,
     *                    !Array.<MediaSourceEngine.Operation>>}
     */
    this.queues_ = {}

    /* * @private {EventManager} */
    this.eventManager_ = new EventManager()

    /* * @private {!Object.<string, !Transmuxer>} */
    this.transmuxers_ = {}

    /* * @private {IClosedCaptionParser} */
    this.captionParser_ = closedCaptionParser

    /* * @private {!PublicPromise} */
    this.mediaSourceOpen_ = new PublicPromise()

    /* * @private {MediaSource} */
    this.mediaSource_ = this.createMediaSource(this.mediaSourceOpen_)

    /* * @type {!Destroyer} */
    this.destroyer_ = new Destroyer(() => this.doDestroy_())
  }

  /* *
   * Create a MediaSource object, attach it to the video element, and return it.
   * Resolves the given promise when the MediaSource is ready.
   *
   * Replaced by unit tests.
   *
   * @param {!PublicPromise} p
   * @return {!MediaSource}
   */
  createMediaSource(p) {
    const mediaSource = new MediaSource()

    // Set up MediaSource on the video element.
    this.eventManager_.listenOnce(mediaSource, 'sourceopen', p.resolve)
    this.video_.src =
        MediaSourceEngine.createObjectURL(mediaSource)

    return mediaSource
  }

  /* *
   * Checks if a certain type is supported.
   *
   * @param {shaka.extern.Stream} stream
   * @return {boolean}
   */
  static isStreamSupported(stream) {
    const fullMimeType = MimeUtils.getFullType(
      stream.mimeType, stream.codecs)
    const extendedMimeType = MimeUtils.getExtendedType(stream)
    return TextEngine.isTypeSupported(fullMimeType) ||
        MediaSource.isTypeSupported(extendedMimeType) ||
        Transmuxer$1.isSupported(fullMimeType, stream.type)
  }

  /* *
   * Returns a map of MediaSource support for well-known types.
   *
   * @return {!Object.<string, boolean>}
   */
  static probeSupport() {
    const testMimeTypes = [
      // MP4 types
      `video/mp4; codecs='avc1.42E01E'`,
      `video/mp4; codecs='avc3.42E01E'`,
      `video/mp4; codecs='hev1.1.6.L93.90'`,
      `video/mp4; codecs='hvc1.1.6.L93.90'`,
      `video/mp4; codecs='hev1.2.4.L153.B0'; eotf='smpte2084'`, // HDR HEVC
      `video/mp4; codecs='hvc1.2.4.L153.B0'; eotf='smpte2084'`, // HDR HEVC
      `video/mp4; codecs='vp9'`,
      `video/mp4; codecs='vp09.00.10.08'`,
      `video/mp4; codecs='av01.0.01M.08'`,
      `audio/mp4; codecs='mp4a.40.2'`,
      `audio/mp4; codecs='ac-3'`,
      `audio/mp4; codecs='ec-3'`,
      `audio/mp4; codecs='opus'`,
      `audio/mp4; codecs='flac'`,
      // WebM types
      `video/webm; codecs='vp8'`,
      `video/webm; codecs='vp9'`,
      `video/webm; codecs='vp09.00.10.08'`,
      `audio/webm; codecs='vorbis'`,
      `audio/webm; codecs='opus'`,
      // MPEG2 TS types (video/ is also used for audio: https://bit.ly/TsMse)
      `video/mp2t; codecs='avc1.42E01E'`,
      `video/mp2t; codecs='avc3.42E01E'`,
      `video/mp2t; codecs='hvc1.1.6.L93.90'`,
      `video/mp2t; codecs='mp4a.40.2'`,
      `video/mp2t; codecs='ac-3'`,
      `video/mp2t; codecs='ec-3'`,
      // WebVTT types
      'text/vtt',
      `application/mp4; codecs='wvtt'`,
      // TTML types
      'application/ttml+xml',
      `application/mp4; codecs='stpp'`
    ]

    const support = {}
    for (const type of testMimeTypes) {
      if (Platform.supportsMediaSource()) {
        // Our TextEngine is only effective for MSE platforms at the moment.
        if (TextEngine.isTypeSupported(type)) {
          support[type] = true
        } else {
          support[type] = MediaSource.isTypeSupported(type) ||
                          Transmuxer$1.isSupported(type)
        }
      } else {
        support[type] = Platform.supportsMediaType(type)
      }

      const basicType = type.split(';')[0]
      support[basicType] = support[basicType] || support[type]
    }

    return support
  }

  /* * @override */
  destroy() {
    return this.destroyer_.destroy()
  }

  /* * @private */
  async doDestroy_() {
    const cleanup = []

    for (const contentType in this.queues_) {
      // Make a local copy of the queue and the first item.
      const q = this.queues_[contentType]
      const inProgress = q[0]

      // Drop everything else out of the original queue.
      this.queues_[contentType] = q.slice(0, 1)

      // We will wait for this item to complete/fail.
      if (inProgress) {
        cleanup.push(inProgress.p.catch(Functional.noop))
      }

      // The rest will be rejected silently if possible.
      for (const item of q.slice(1)) {
        item.p.reject(Destroyer.destroyedError())
      }
    }

    if (this.textEngine_) {
      cleanup.push(this.textEngine_.destroy())
    }
    if (this.textDisplayer_) {
      cleanup.push(this.textDisplayer_.destroy())
    }

    for (const contentType in this.transmuxers_) {
      cleanup.push(this.transmuxers_[contentType].destroy())
    }
    await Promise.all(cleanup)
    if (this.eventManager_) {
      this.eventManager_.release()
      this.eventManager_ = null
    }

    if (this.video_) {
      // 'unload' the video element.
      this.video_.removeAttribute('src')
      this.video_.load()
      this.video_ = null
    }

    this.mediaSource_ = null
    this.textEngine_ = null
    this.textDisplayer_ = null
    this.sourceBuffers_ = {}
    this.transmuxers_ = {}
    this.captionParser_ = null
    this.queues_ = {}
  }

  /* *
   * @return {!Promise} Resolved when MediaSource is open and attached to the
   *   media element.  This process is actually initiated by the constructor.
   */
  open() {
    return this.mediaSourceOpen_
  }

  /* *
   * Initialize MediaSourceEngine.
   *
   * Note that it is not valid to call this multiple times, except to add or
   * reinitialize text streams.
   *
   * @param {!Map.<ManifestParserUtils.ContentType,
   *               shaka.extern.Stream>} streamsByType
   *   A map of content types to streams.  All streams must be supported
   *   according to MediaSourceEngine.isStreamSupported.
   * @param {boolean} forceTransmuxTS
   *   If true, this will transmux TS content even if it is natively supported.
   *
   * @return {!Promise}
   */
  async init(streamsByType, forceTransmuxTS) {
    const ContentType = ManifestParserUtils.ContentType

    await this.mediaSourceOpen_

    for (const contentType of streamsByType.keys()) {
      const stream = streamsByType.get(contentType)
      console.assert(
        MediaSourceEngine.isStreamSupported(stream),
        'Type negotiation should happen before MediaSourceEngine.init!')

      let mimeType = MimeUtils.getFullType(
        stream.mimeType, stream.codecs)
      if (contentType === ContentType.TEXT) {
        this.reinitText(mimeType)
      } else {
        if ((forceTransmuxTS || !MediaSource.isTypeSupported(mimeType)) &&
            Transmuxer$1.isSupported(mimeType, contentType)) {
          this.transmuxers_[contentType] = new Transmuxer$1()
          mimeType =
              Transmuxer$1.convertTsCodecs(contentType, mimeType)
        }
        const sourceBuffer = this.mediaSource_.addSourceBuffer(mimeType)
        this.eventManager_.listen(
          sourceBuffer, 'error',
          () => this.onError_(contentType))
        this.eventManager_.listen(
          sourceBuffer, 'updateend',
          () => this.onUpdateEnd_(contentType))
        this.sourceBuffers_[contentType] = sourceBuffer
        this.queues_[contentType] = []
      }
    }
  }

  /* *
   * Reinitialize the TextEngine for a new text type.
   * @param {string} mimeType
   */
  reinitText(mimeType) {
    if (!this.textEngine_) {
      this.textEngine_ = new TextEngine(this.textDisplayer_)
    }
    this.textEngine_.initParser(mimeType)
  }

  /* *
   * @return {boolean} True if the MediaSource is in an 'ended' state, or if the
   *   object has been destroyed.
   */
  ended() {
    return this.mediaSource_ ? this.mediaSource_.readyState === 'ended' : true
  }

  /* *
   * Gets the first timestamp in buffer for the given content type.
   *
   * @param {ManifestParserUtils.ContentType} contentType
   * @return {?number} The timestamp in seconds, or null if nothing is buffered.
   */
  bufferStart(contentType) {
    const ContentType = ManifestParserUtils.ContentType
    if (contentType === ContentType.TEXT) {
      return this.textEngine_.bufferStart()
    }
    return TimeRangesUtils.bufferStart(
      this.getBuffered_(contentType))
  }

  /* *
   * Gets the last timestamp in buffer for the given content type.
   *
   * @param {ManifestParserUtils.ContentType} contentType
   * @return {?number} The timestamp in seconds, or null if nothing is buffered.
   */
  bufferEnd(contentType) {
    const ContentType = ManifestParserUtils.ContentType
    if (contentType === ContentType.TEXT) {
      return this.textEngine_.bufferEnd()
    }
    return TimeRangesUtils.bufferEnd(
      this.getBuffered_(contentType))
  }

  /* *
   * Determines if the given time is inside the buffered range of the given
   * content type.
   *
   * @param {ManifestParserUtils.ContentType} contentType
   * @param {number} time Playhead time
   * @param {number=} smallGapLimit
   * @return {boolean}
   */
  isBuffered(contentType, time, smallGapLimit) {
    const ContentType = ManifestParserUtils.ContentType
    if (contentType === ContentType.TEXT) {
      return this.textEngine_.isBuffered(time)
    } else {
      const buffered = this.getBuffered_(contentType)
      return TimeRangesUtils.isBuffered(
        buffered, time, smallGapLimit)
    }
  }

  /* *
   * Computes how far ahead of the given timestamp is buffered for the given
   * content type.
   *
   * @param {ManifestParserUtils.ContentType} contentType
   * @param {number} time
   * @return {number} The amount of time buffered ahead in seconds.
   */
  bufferedAheadOf(contentType, time) {
    const ContentType = ManifestParserUtils.ContentType
    if (contentType === ContentType.TEXT) {
      return this.textEngine_.bufferedAheadOf(time)
    } else {
      const buffered = this.getBuffered_(contentType)
      return TimeRangesUtils.bufferedAheadOf(buffered, time)
    }
  }

  /* *
   * Returns info about what is currently buffered.
   * @return {shaka.extern.BufferedInfo}
   */
  getBufferedInfo() {
    const ContentType = ManifestParserUtils.ContentType

    const getBufferedInfo = TimeRangesUtils.getBufferedInfo
    const info = {
      total: getBufferedInfo(this.video_.buffered),
      audio: getBufferedInfo(this.getBuffered_(ContentType.AUDIO)),
      video: getBufferedInfo(this.getBuffered_(ContentType.VIDEO)),
      text: []
    }

    if (this.textEngine_) {
      const start = this.textEngine_.bufferStart()
      const end = this.textEngine_.bufferEnd()

      if (start != null && end != null) {
        info.text.push({ start: start, end: end })
      }
    }
    return info
  }

  /* *
   * @param {ManifestParserUtils.ContentType} contentType
   * @return {TimeRanges} The buffered ranges for the given content type, or
   *   null if the buffered ranges could not be obtained.
   * @private
   */
  getBuffered_(contentType) {
    try {
      return this.sourceBuffers_[contentType].buffered
    } catch (exception) {
      if (contentType in this.sourceBuffers_) {
        // Note: previous MediaSource errors may cause access to |buffered| to
        // throw.
        console.error('failed to get buffered range for ' + contentType,
          exception)
      }
      return null
    }
  }

  /* *
   * Enqueue an operation to append data to the SourceBuffer.
   * Start and end times are needed for TextEngine, but not for MediaSource.
   * Start and end times may be null for initialization segments; if present
   * they are relative to the presentation timeline.
   *
   * @param {ManifestParserUtils.ContentType} contentType
   * @param {BufferSource} data
   * @param {?number} startTime relative to the start of the presentation
   * @param {?number} endTime relative to the start of the presentation
   * @param {?boolean} hasClosedCaptions True if the buffer contains CEA closed
   * captions
   * @return {!Promise}
   */
  async appendBuffer(contentType, data, startTime, endTime, hasClosedCaptions) {
    const ContentType = ManifestParserUtils.ContentType

    if (contentType === ContentType.TEXT) {
      await this.textEngine_.appendBuffer(data, startTime, endTime)
    } else if (this.transmuxers_[contentType]) {
      const transmuxedData =
          await this.transmuxers_[contentType].transmux(data)
      // For HLS CEA-608/708 CLOSED-CAPTIONS, text data is embedded in
      // the video stream, so textEngine may not have been initialized.
      if (!this.textEngine_) {
        this.reinitText('text/vtt')
      }
      // This doesn't work for native TS support (ex. Edge/Chromecast),
      // since no transmuxing is needed for native TS.
      if (transmuxedData.captions && transmuxedData.captions.length) {
        const videoOffset =
        this.sourceBuffers_[ContentType.VIDEO].timestampOffset
        this.textEngine_.storeAndAppendClosedCaptions(
          transmuxedData.captions, startTime, endTime, videoOffset)
      }
      await this.enqueueOperation_(
        contentType, () => this.append_(contentType, transmuxedData.data))
    } else if (hasClosedCaptions && window.muxjs) {
      if (!this.textEngine_) {
        this.reinitText('text/vtt')
      }
      // If it is the init segment for closed captions, initialize the closed
      // caption parser.
      if (startTime === null && endTime === null) {
        this.captionParser_.init(data)
      } else {
        this.captionParser_.parseFrom(data, (captions) => {
          if (captions.length) {
            const videoOffset =
            this.sourceBuffers_[ContentType.VIDEO].timestampOffset
            this.textEngine_.storeAndAppendClosedCaptions(
              captions, startTime, endTime, videoOffset)
          }
        })
      }
      await this.enqueueOperation_(
        contentType,
        () => this.append_(contentType, data))
    } else {
      await this.enqueueOperation_(
        contentType,
        () => this.append_(contentType, data))
    }
  }

  /* *
   * Set the selected closed captions Id and language.
   *
   * @param {string} id
   */
  setSelectedClosedCaptionId(id) {
    const VIDEO = ManifestParserUtils.ContentType.VIDEO
    const videoBufferEndTime = this.bufferEnd(VIDEO) || 0
    this.textEngine_.setSelectedClosedCaptionId(id, videoBufferEndTime)
  }

  /* *
   * Enqueue an operation to remove data from the SourceBuffer.
   *
   * @param {ManifestParserUtils.ContentType} contentType
   * @param {number} startTime relative to the start of the presentation
   * @param {number} endTime relative to the start of the presentation
   * @return {!Promise}
   */
  async remove(contentType, startTime, endTime) {
    // On IE11, this operation would be permitted, but would have no effect!
    // See https://github.com/google/shaka-player/issues/251
    console.assert(endTime < Number.MAX_VALUE,
      'remove() with MAX_VALUE or Infinity is not IE-compatible!')
    const ContentType = ManifestParserUtils.ContentType
    if (contentType === ContentType.TEXT) {
      await this.textEngine_.remove(startTime, endTime)
    } else {
      await this.enqueueOperation_(
        contentType,
        () => this.remove_(contentType, startTime, endTime))
    }
  }

  /* *
   * Enqueue an operation to clear the SourceBuffer.
   *
   * @param {ManifestParserUtils.ContentType} contentType
   * @return {!Promise}
   */
  async clear(contentType) {
    const ContentType = ManifestParserUtils.ContentType
    if (contentType === ContentType.TEXT) {
      if (!this.textEngine_) {
        return
      }

      // CaptionParser tracks the latest timestamp and uses this to filter
      // for duplicate captions.  We do this ourselves, so we must reset
      // the CaptionParser when we seek.  The best indicator of an
      // unbuffered seek in MediaSourceEngine is clear().  This causes a
      // small glitch when we change languages (which also calls clear()),
      // where the first caption in the new language may be missing.
      // TODO: Ask mux.js for a switch to remove this timestamp-tracking
      // feature so that we can do away with these hacks.
      this.captionParser_.reset()

      await this.textEngine_.remove(0, Infinity)
    } else {
      // Note that not all platforms allow clearing to Infinity.
      await this.enqueueOperation_(
        contentType,
        () => this.remove_(contentType, 0, this.mediaSource_.duration))
    }
  }

  /* *
   * Enqueue an operation to flush the SourceBuffer.
   * This is a workaround for what we believe is a Chromecast bug.
   *
   * @param {ManifestParserUtils.ContentType} contentType
   * @return {!Promise}
   */
  async flush(contentType) {
    // Flush the pipeline.  Necessary on Chromecast, even though we have removed
    // everything.
    const ContentType = ManifestParserUtils.ContentType
    if (contentType === ContentType.TEXT) {
      // Nothing to flush for text.
      return
    }
    await this.enqueueOperation_(
      contentType,
      () => this.flush_(contentType))
  }

  /* *
   * Sets the timestamp offset and append window end for the given content type.
   *
   * @param {ManifestParserUtils.ContentType} contentType
   * @param {number} timestampOffset The timestamp offset.  Segments which start
   *   at time t will be inserted at time t + timestampOffset instead.  This
   *   value does not affect segments which have already been inserted.
   * @param {number} appendWindowStart The timestamp to set the append window
   *   start to.  For future appends, frames/samples with timestamps less than
   *   this value will be dropped.
   * @param {number} appendWindowEnd The timestamp to set the append window end
   *   to.  For future appends, frames/samples with timestamps greater than this
   *   value will be dropped.
   * @return {!Promise}
   */
  async setStreamProperties(
    contentType, timestampOffset, appendWindowStart, appendWindowEnd) {
    const ContentType = ManifestParserUtils.ContentType
    if (contentType === ContentType.TEXT) {
      this.textEngine_.setTimestampOffset(timestampOffset)
      this.textEngine_.setAppendWindow(appendWindowStart, appendWindowEnd)
      return
    }

    await Promise.all([
      // Queue an abort() to help MSE splice together overlapping segments.
      // We set appendWindowEnd when we change periods in DASH content, and the
      // period transition may result in overlap.
      //
      // An abort() also helps with MPEG2-TS.  When we append a TS segment, we
      // always enter a PARSING_MEDIA_SEGMENT state and we can't change the
      // timestamp offset.  By calling abort(), we reset the state so we can
      // set it.
      this.enqueueOperation_(
        contentType,
        () => this.abort_(contentType)),
      this.enqueueOperation_(
        contentType,
        () => this.setTimestampOffset_(contentType, timestampOffset)),
      this.enqueueOperation_(
        contentType,
        () => this.setAppendWindow_(
          contentType, appendWindowStart, appendWindowEnd))
    ])
  }

  /* *
   * @param {string=} reason Valid reasons are 'network' and 'decode'.
   * @return {!Promise}
   * @see http://w3c.github.io/media-source/#idl-def-EndOfStreamError
   */
  async endOfStream(reason) {
    await this.enqueueBlockingOperation_(() => {
      // If endOfStream() has already been called on the media source,
      // don't call it again.
      if (this.ended()) {
        return
      }
      // Tizen and IE11 won't let us pass undefined, but it will let us omit the
      // argument.
      if (reason) {
        this.mediaSource_.endOfStream(reason)
      } else {
        this.mediaSource_.endOfStream()
      }
    })
  }

  /* *
   * We only support increasing duration at this time.  Decreasing duration
   * causes the MSE removal algorithm to run, which results in an 'updateend'
   * event.  Supporting this scenario would be complicated, and is not currently
   * needed.
   *
   * @param {number} duration
   * @return {!Promise}
   */
  async setDuration(duration) {
    console.assert(
      isNaN(this.mediaSource_.duration) ||
            this.mediaSource_.duration <= duration,
      'duration cannot decrease: ' + this.mediaSource_.duration + ' -> ' +
            duration)
    await this.enqueueBlockingOperation_(() => {
      this.mediaSource_.duration = duration
    })
  }

  /* *
   * Get the current MediaSource duration.
   *
   * @return {number}
   */
  getDuration() {
    return this.mediaSource_.duration
  }

  /* *
   * Append data to the SourceBuffer.
   * @param {ManifestParserUtils.ContentType} contentType
   * @param {BufferSource} data
   * @private
   */
  append_(contentType, data) {
    // This will trigger an 'updateend' event.
    this.sourceBuffers_[contentType].appendBuffer(data)
  }

  /* *
   * Remove data from the SourceBuffer.
   * @param {ManifestParserUtils.ContentType} contentType
   * @param {number} startTime relative to the start of the presentation
   * @param {number} endTime relative to the start of the presentation
   * @private
   */
  remove_(contentType, startTime, endTime) {
    if (endTime <= startTime) {
      // Ignore removal of inverted or empty ranges.
      // Fake 'updateend' event to resolve the operation.
      this.onUpdateEnd_(contentType)
      return
    }

    // This will trigger an 'updateend' event.
    this.sourceBuffers_[contentType].remove(startTime, endTime)
  }

  /* *
   * Call abort() on the SourceBuffer.
   * This resets MSE's last_decode_timestamp on all track buffers, which should
   * trigger the splicing logic for overlapping segments.
   * @param {ManifestParserUtils.ContentType} contentType
   * @private
   */
  abort_(contentType) {
    // Save the append window, which is reset on abort().
    const appendWindowStart =
        this.sourceBuffers_[contentType].appendWindowStart
    const appendWindowEnd = this.sourceBuffers_[contentType].appendWindowEnd

    // This will not trigger an 'updateend' event, since nothing is happening.
    // This is only to reset MSE internals, not to abort an actual operation.
    this.sourceBuffers_[contentType].abort()

    // Restore the append
    this.sourceBuffers_[contentType].appendWindowStart = appendWindowStart
    this.sourceBuffers_[contentType].appendWindowEnd = appendWindowEnd

    // Fake an 'updateend' event to resolve the operation.
    this.onUpdateEnd_(contentType)
  }

  /* *
   * Nudge the playhead to force the media pipeline to be flushed.
   * This seems to be necessary on Chromecast to get new content to replace old
   * content.
   * @param {ManifestParserUtils.ContentType} contentType
   * @private
   */
  flush_(contentType) {
    // Never use flush_ if there's data.  It causes a hiccup in playback.
    console.assert(
      this.video_.buffered.length === 0, 'MediaSourceEngine.flush_ should ' +
        'only be used after clearing all data!')

    // Seeking forces the pipeline to be flushed.
    this.video_.currentTime -= 0.001

    // Fake an 'updateend' event to resolve the operation.
    this.onUpdateEnd_(contentType)
  }

  /* *
   * Set the SourceBuffer's timestamp offset.
   * @param {ManifestParserUtils.ContentType} contentType
   * @param {number} timestampOffset
   * @private
   */
  setTimestampOffset_(contentType, timestampOffset) {
    // Work around for https://github.com/google/shaka-player/issues/1281:
    // TODO(https://bit.ly/2ttKiBU): follow up when this is fixed in Edge
    if (timestampOffset < 0) {
      // Try to prevent rounding errors in Edge from removing the first
      // keyframe.
      timestampOffset += 0.001
    }

    this.sourceBuffers_[contentType].timestampOffset = timestampOffset

    // Fake an 'updateend' event to resolve the operation.
    this.onUpdateEnd_(contentType)
  }

  /* *
   * Set the SourceBuffer's append window end.
   * @param {ManifestParserUtils.ContentType} contentType
   * @param {number} appendWindowStart
   * @param {number} appendWindowEnd
   * @private
   */
  setAppendWindow_(contentType, appendWindowStart, appendWindowEnd) {
    // You can't set start > end, so first set start to 0, then set the new
    // end, then set the new start.  That way, there are no intermediate
    // states which are invalid.
    this.sourceBuffers_[contentType].appendWindowStart = 0
    this.sourceBuffers_[contentType].appendWindowEnd = appendWindowEnd
    this.sourceBuffers_[contentType].appendWindowStart = appendWindowStart

    // Fake an 'updateend' event to resolve the operation.
    this.onUpdateEnd_(contentType)
  }

  /* *
   * @param {ManifestParserUtils.ContentType} contentType
   * @private
   */
  onError_(contentType) {
    const operation = this.queues_[contentType][0]
    console.assert(operation, 'Spurious error event!')
    console.assert(!this.sourceBuffers_[contentType].updating,
      'SourceBuffer should not be updating on error!')
    const code = this.video_.error ? this.video_.error.code : 0
    operation.p.reject(new Error$1(
      Error$1.Severity.CRITICAL,
      Error$1.Category.MEDIA,
      Error$1.Code.MEDIA_SOURCE_OPERATION_FAILED,
      code))
    // Do not pop from queue.  An 'updateend' event will fire next, and to
    // avoid synchronizing these two event handlers, we will allow that one to
    // pop from the queue as normal.  Note that because the operation has
    // already been rejected, the call to resolve() in the 'updateend' handler
    // will have no effect.
  }

  /* *
   * @param {ManifestParserUtils.ContentType} contentType
   * @private
   */
  onUpdateEnd_(contentType) {
    const operation = this.queues_[contentType][0]
    console.assert(operation, 'Spurious updateend event!')
    if (!operation) {
      return
    }
    console.assert(!this.sourceBuffers_[contentType].updating,
      'SourceBuffer should not be updating on updateend!')
    operation.p.resolve()
    this.popFromQueue_(contentType)
  }

  /* *
   * Enqueue an operation and start it if appropriate.
   *
   * @param {ManifestParserUtils.ContentType} contentType
   * @param {function()} start
   * @return {!Promise}
   * @private
   */
  enqueueOperation_(contentType, start) {
    this.destroyer_.ensureNotDestroyed()

    const operation = {
      start: start,
      p: new PublicPromise()
    }
    this.queues_[contentType].push(operation)

    if (this.queues_[contentType].length === 1) {
      this.startOperation_(contentType)
    }
    return operation.p
  }

  /* *
   * Enqueue an operation which must block all other operations on all
   * SourceBuffers.
   *
   * @param {function()} run
   * @return {!Promise}
   * @private
   */
  async enqueueBlockingOperation_(run) {
    this.destroyer_.ensureNotDestroyed()

    /* * @type {Array.<!PublicPromise>} */
    const allWaiters = []

    // Enqueue a 'wait' operation onto each queue.
    // This operation signals its readiness when it starts.
    // When all wait operations are ready, the real operation takes place.
    for (const contentType in this.sourceBuffers_) {
      const ready = new PublicPromise()
      const operation = {
        start: () => ready.resolve(),
        p: ready
      }

      this.queues_[contentType].push(operation)
      allWaiters.push(ready)

      if (this.queues_[contentType].length === 1) {
        operation.start()
      }
    }
    // Return a Promise to the real operation, which waits to begin until
    // there are no other in-progress operations on any SourceBuffers.
    try {
      await Promise.all(allWaiters)
    } catch (error) {
      // One of the waiters failed, which means we've been destroyed.
      console.assert(
        this.destroyer_.destroyed(), 'Should be destroyed by now')
      // We haven't popped from the queue.  Canceled waiters have been removed
      // by destroy.  What's left now should just be resolved waiters.  In
      // uncompiled mode, we will maintain good hygiene and make sure the
      // assert at the end of destroy passes.  In compiled mode, the queues
      // are wiped in destroy.
      throw error
    }

    // Run the real operation, which is synchronous.
    try {
      run()
    } catch (exception) {
      throw new Error$1(
        Error$1.Severity.CRITICAL,
        Error$1.Category.MEDIA,
        Error$1.Code.MEDIA_SOURCE_OPERATION_THREW,
        exception)
    } finally {
      // Unblock the queues.
      for (const contentType in this.sourceBuffers_) {
        this.popFromQueue_(contentType)
      }
    }
  }

  /* *
   * Pop from the front of the queue and start a new operation.
   * @param {ManifestParserUtils.ContentType} contentType
   * @private
   */
  popFromQueue_(contentType) {
    // Remove the in-progress operation, which is now complete.
    this.queues_[contentType].shift()
    this.startOperation_(contentType)
  }

  /* *
   * Starts the next operation in the queue.
   * @param {ManifestParserUtils.ContentType} contentType
   * @private
   */
  startOperation_(contentType) {
    // Retrieve the next operation, if any, from the queue and start it.
    const next = this.queues_[contentType][0]
    if (next) {
      try {
        next.start()
      } catch (exception) {
        if (exception.name === 'QuotaExceededError') {
          next.p.reject(new Error$1(
            Error$1.Severity.CRITICAL,
            Error$1.Category.MEDIA,
            Error$1.Code.QUOTA_EXCEEDED_ERROR,
            contentType))
        } else {
          next.p.reject(new Error$1(
            Error$1.Severity.CRITICAL,
            Error$1.Category.MEDIA,
            Error$1.Code.MEDIA_SOURCE_OPERATION_THREW,
            exception))
        }
        this.popFromQueue_(contentType)
      }
    }
  }

  /* *
   * @return {!shaka.extern.TextDisplayer}
   */
  getTextDisplayer() {
    console.assert(
      this.textDisplayer_,
      'TextDisplayer should only be null when this is destroyed')

    return this.textDisplayer_
  }

  /* *
   * @param {!shaka.extern.TextDisplayer} textDisplayer
   */
  setTextDisplayer(textDisplayer) {
    const oldTextDisplayer = this.textDisplayer_
    this.textDisplayer_ = textDisplayer
    if (oldTextDisplayer) {
      textDisplayer.setTextVisibility(oldTextDisplayer.isTextVisible())
      oldTextDisplayer.destroy()
    }
    if (this.textEngine_) {
      this.textEngine_.setDisplayer(textDisplayer)
    }
  }
}
/* *
 * Internal reference to URL.createObjectURL function to avoid
 * compatibility issues with other libraries and frameworks such as React
 * Native. For use in unit tests only, not meant for external use.
 *
 * @type {function(?):string}
 */
MediaSourceEngine.createObjectURL = URL.createObjectURL

/* *
 * @summary A set of language utility functions.
 * @final
 */
class LanguageUtils {
  /* *
   * Check if |locale1| and |locale2| are locale-compatible.
   *
   * Locale-compatible is defined as all components in each locale match. Since
   * we only respect the language and region components, we only check that
   * the language and region components match.
   *
   * Examples:
   *  Locale A | Locale B | Locale Compatible
   *  ---------------------------------------
   *  en-US    | en-US    | true
   *  en       | en-US    | false
   *  en-US    | en-CA    | false
   *
   * @param {string} locale1
   * @param {string} locale2
   * @return {boolean}
   */
  static areLocaleCompatible(locale1, locale2) {
    // Even through they SHOULD already be normalized, let's just be safe and
    // do it again.
    locale1 = LanguageUtils.normalize(locale1)
    locale2 = LanguageUtils.normalize(locale2)

    return locale1 === locale2
  }

  /* *
   * Check if |locale1| and |locale2| are language-compatible.
   *
   * Language compatible is when the language component of each locale matches.
   * This means that no matter what region they have (or don't have) as long as
   * the language components match, they are language-compatible.
   *
   * Examples:
   *  Locale A | Locale B | Language-Compatible
   *  -----------------------------------------
   *  en-US    | en-US    | true
   *  en-US    | en       | true
   *  en-US    | en-CA    | true
   *  en-CA    | fr-CA    | false
   *
   * @param {string} locale1
   * @param {string} locale2
   * @return {boolean}
   */
  static areLanguageCompatible(locale1, locale2) {
    const LanguageUtils = LanguageUtils

    // Even through they SHOULD already be normalized, let's just be safe and
    // do it again.
    locale1 = LanguageUtils.normalize(locale1)
    locale2 = LanguageUtils.normalize(locale2)

    // Get all components. This should only be language and region
    // since we do not support dialect.
    /* * @type {!Array.<string>} */
    const locale1Components = LanguageUtils.disassembleLocale_(locale1)
    /* * @type {!Array.<string>} */
    const locale2Components = LanguageUtils.disassembleLocale_(locale2)

    // We are language compatible if we have the same language.
    return locale1Components[0] === locale2Components[0]
  }

  /* *
   * Check if |possibleParent| is the parent locale of |possibleChild|. Because
   * we do not support dialects, the parent-child relationship is a lot simpler.
   * In a parent child relationship:
   *    - The parent and child have the same language-component
   *    - The parent has no region-component
   *    - The child has a region-component
   *
   * Example:
   *  Locale A | Locale B | Is A The parent of B?
   *  --------------------------------------------
   *  en-US    | en-US    | no
   *  en-US    | en       | no
   *  en       | en-US    | yes
   *  en       | en       | no
   *  en       | fr       | no
   *
   * @param {string} possibleParent
   * @param {string} possibleChild
   * @return {boolean}
   */
  static isParentOf(possibleParent, possibleChild) {
    const LanguageUtils = LanguageUtils

    // Even through they SHOULD already be normalized, let's just be safe and
    // do it again.
    possibleParent = LanguageUtils.normalize(possibleParent)
    possibleChild = LanguageUtils.normalize(possibleChild)

    // Get all components. This should only be language and region
    // since we do not support dialect.
    /* * @type {!Array.<string>} */
    const possibleParentComponents =
        LanguageUtils.disassembleLocale_(possibleParent)
    /* * @type {!Array.<string>} */
    const possibleChildComponents =
        LanguageUtils.disassembleLocale_(possibleChild)

    return possibleParentComponents[0] === possibleChildComponents[0] &&
           possibleParentComponents.length === 1 &&
           possibleChildComponents.length === 2
  }

  /* *
   * Check if |localeA| shares the same parent with |localeB|. Since we don't
   * support dialect, we will only look at language and region. For two locales
   * to be siblings:
   *    - Both must have language-components
   *    - Both must have region-components
   *    - Both must have the same language-component
   *
   * Example:
   *  Locale A | Locale B | Siblings?
   *  --------------------------------------------
   *  en-US    | en-US    | yes
   *  en-US    | en-CA    | yes
   *  en-US    | en       | no
   *  en       | en-US    | no
   *  en       | en       | no
   *  en       | fr       | no
   *
   * @param {string} localeA
   * @param {string} localeB
   * @return {boolean}
   */
  static isSiblingOf(localeA, localeB) {
    const LanguageUtils = LanguageUtils

    // Even through they SHOULD already be normalized, let's just be safe and
    // do it again.
    localeA = LanguageUtils.normalize(localeA)
    localeB = LanguageUtils.normalize(localeB)

    // Get all components. This should only be language and region
    // since we do not support dialect.
    /* * @type {!Array.<string>} */
    const localeAComponents = LanguageUtils.disassembleLocale_(localeA)
    /* * @type {!Array.<string>} */
    const localeBComponents = LanguageUtils.disassembleLocale_(localeB)

    return localeAComponents.length === 2 &&
           localeBComponents.length === 2 &&
           localeAComponents[0] === localeBComponents[0]
  }

  /* *
   * Normalize a locale. This will take a locale and canonicalize it to a state
   * that we are prepared to work with.
   *
   * We only support with:
   *   - language
   *   - language-REGION
   *
   * If given a dialect, we will discard it. We will convert any 3-character
   * codes to 2-character codes. We will force language codes to lowercase and
   * region codes to uppercase.
   *
   * @param {string} locale
   * @return {string}
   */
  static normalize(locale) {
    const LanguageUtils = LanguageUtils

    const components = locale.split('-')

    // We are only going to use the language and the region. If there was
    // a dialect or anything else, we are throwing it a way.
    let language = components[0] || ''
    let region = components[1] || ''

    // Convert the language to lower case. It is standard for the language code
    // to be in lower case, but it will also make the map look-up easier.
    language = language.toLowerCase()
    language = LanguageUtils.isoMap_.get(language) || language

    // Convert the region to upper case. It is standard for the region to be in
    // upper case. If there is no upper code, then it will be an empty string
    // and this will be a no-op.
    region = region.toUpperCase()

    return region
      ? language + '-' + region
      : language
  }

  /* *
   * Check if two language codes are siblings. Language codes are siblings if
   * they share the same base language while neither one is the base language.
   *
   * For example, 'en-US' and 'en-CA' are siblings but 'en-US' and 'en' are not
   * siblings.
   *
   * @param {string} a
   * @param {string} b
   * @return {boolean}
   */
  static areSiblings(a, b) {
    const LanguageUtils = LanguageUtils

    const baseA = LanguageUtils.getBase(a)
    const baseB = LanguageUtils.getBase(b)

    return a !== baseA && b !== baseB && baseA === baseB
  }

  /* *
   * Get the normalized base language for a language code.
   *
   * @param {string} lang
   * @return {string}
   */
  static getBase(lang) {
    const LanguageUtils = LanguageUtils

    const splitAt = lang.indexOf('-')
    let major

    if (splitAt >= 0) {
      major = lang.substring(0, splitAt)
    } else {
      major = lang
    }

    // Convert the major code to lower case. It is standard for the major code
    // to be in lower case, but it will also make the map look-up easier.
    major = major.toLowerCase()
    major = LanguageUtils.isoMap_.get(major) || major

    return major
  }

  /* *
   * Get the normalized language of the given text stream. Will return 'und' if
   * a language is not found on the text stream.
   *
   * This should always be used to get the language from a text stream.
   *
   * @param {shaka.extern.Stream} stream
   * @return {string}
   */
  static getLocaleForText(stream) {
    const LanguageUtils = LanguageUtils

    const ContentType = ManifestParserUtils.ContentType
    console.assert(
      stream.type === ContentType.TEXT,
      'Can only get language from text streams')

    const language = stream.language || 'und'
    return LanguageUtils.normalize(language)
  }

  /* *
   * Get the normalized locale for the given variant. This will look through
   * the variant to find the locale that represents the content in the variant.
   * This will return 'und' if no language can be found.
   *
   * This should always be used to get the locale from a variant.
   *
   * @param {shaka.extern.Variant} variant
   * @return {string}
   */
  static getLocaleForVariant(variant) {
    const LanguageUtils = LanguageUtils

    // Our preference order is:
    //  1. Variant
    //  2. Audio Stream
    //  3. Video Stream
    //
    // We are going to consider all falsy strings to be invalid locales, this
    // will include empty strings.
    if (variant.language) {
      return LanguageUtils.normalize(variant.language)
    }

    if (variant.audio && variant.audio.language) {
      return LanguageUtils.normalize(variant.audio.language)
    }

    if (variant.video && variant.video.language) {
      return LanguageUtils.normalize(variant.video.language)
    }

    // No language was found, but we still want to return a valid string.
    return 'und'
  }

  /* *
   * Find the locale in |searchSpace| that comes closest to |target|. If no
   * locale is found to be close to |target|, then |null| will be returned.
   *
   * @param {string} target
   * @param {!Iterable.<string>} searchSpace
   * @return {?string}
   */
  static findClosestLocale(target, searchSpace) {
    const LanguageUtils = LanguageUtils

    /* * @type {string} */
    const safeTarget = LanguageUtils.normalize(target)
    /* * @type {!Set.<string>} */
    const safeSearchSpace = new Set()
    for (const option of searchSpace) {
      safeSearchSpace.add(LanguageUtils.normalize(option))
    }

    // Preference 1 - The option is an exact match. For example, 'en-US' is an
    //    exact match of 'en-US'. So if there is an option that is an exact
    //    match, it would be the best match possible.
    for (const option of safeSearchSpace) {
      if (option === safeTarget) {
        return option
      }
    }

    // Preference 2 - The option is the parent of the target. For example,
    //    'en' is the parent of 'en-US'. So if there is an option with
    //    'en', it should be good enough when our preference is 'en-US'.
    for (const option of safeSearchSpace) {
      if (LanguageUtils.isParentOf(option, safeTarget)) {
        return option
      }
    }

    // Preference 3 - The option is a sibling of the target. For example,
    //    'en-US' is a sibling of 'en-CA'. So if there is an option with
    //    'en_CA', it should be good enough when our preference is 'en-US'.
    for (const option of safeSearchSpace) {
      if (LanguageUtils.isSiblingOf(option, safeTarget)) {
        return option
      }
    }

    // Preference 4 - The option is a child of the target. For example,
    //    'en-US' is the child of 'en'. SO it there is an option with
    //    'en-US', it should be good enough when our preference is 'en'.
    for (const option of safeSearchSpace) {
      if (LanguageUtils.isParentOf(safeTarget, option)) {
        return option
      }
    }

    // Failed to find anything.
    return null
  }

  /* *
   * Take a locale string and break it into its component. Check that each
   * component matches what we would expect internally for locales. This
   * should ONLY be used to verify locales that have been normalized.
   *
   * @param {string} locale
   * @return {!Array.<string>}
   * @private
   */
  static disassembleLocale_(locale) {
    const components = locale.split('-')

    console.assert(
      components.length <= 2,
      [
        'Locales should not have more than 2 components. ',
        locale,
        ' has too many components.'
      ].join())

    return components
  }
}
/* *
 * A map from 3-letter language codes (ISO 639-2) to 2-letter language codes
 * (ISO 639-1) for all languages which have both in the registry.
 *
 * @const {!Map.<string, string>}
 * @private
 */
LanguageUtils.isoMap_ = new Map([
  ['aar', 'aa'], ['abk', 'ab'], ['afr', 'af'], ['aka', 'ak'], ['alb', 'sq'],
  ['amh', 'am'], ['ara', 'ar'], ['arg', 'an'], ['arm', 'hy'], ['asm', 'as'],
  ['ava', 'av'], ['ave', 'ae'], ['aym', 'ay'], ['aze', 'az'], ['bak', 'ba'],
  ['bam', 'bm'], ['baq', 'eu'], ['bel', 'be'], ['ben', 'bn'], ['bih', 'bh'],
  ['bis', 'bi'], ['bod', 'bo'], ['bos', 'bs'], ['bre', 'br'], ['bul', 'bg'],
  ['bur', 'my'], ['cat', 'ca'], ['ces', 'cs'], ['cha', 'ch'], ['che', 'ce'],
  ['chi', 'zh'], ['chu', 'cu'], ['chv', 'cv'], ['cor', 'kw'], ['cos', 'co'],
  ['cre', 'cr'], ['cym', 'cy'], ['cze', 'cs'], ['dan', 'da'], ['deu', 'de'],
  ['div', 'dv'], ['dut', 'nl'], ['dzo', 'dz'], ['ell', 'el'], ['eng', 'en'],
  ['epo', 'eo'], ['est', 'et'], ['eus', 'eu'], ['ewe', 'ee'], ['fao', 'fo'],
  ['fas', 'fa'], ['fij', 'fj'], ['fin', 'fi'], ['fra', 'fr'], ['fre', 'fr'],
  ['fry', 'fy'], ['ful', 'ff'], ['geo', 'ka'], ['ger', 'de'], ['gla', 'gd'],
  ['gle', 'ga'], ['glg', 'gl'], ['glv', 'gv'], ['gre', 'el'], ['grn', 'gn'],
  ['guj', 'gu'], ['hat', 'ht'], ['hau', 'ha'], ['heb', 'he'], ['her', 'hz'],
  ['hin', 'hi'], ['hmo', 'ho'], ['hrv', 'hr'], ['hun', 'hu'], ['hye', 'hy'],
  ['ibo', 'ig'], ['ice', 'is'], ['ido', 'io'], ['iii', 'ii'], ['iku', 'iu'],
  ['ile', 'ie'], ['ina', 'ia'], ['ind', 'id'], ['ipk', 'ik'], ['isl', 'is'],
  ['ita', 'it'], ['jav', 'jv'], ['jpn', 'ja'], ['kal', 'kl'], ['kan', 'kn'],
  ['kas', 'ks'], ['kat', 'ka'], ['kau', 'kr'], ['kaz', 'kk'], ['khm', 'km'],
  ['kik', 'ki'], ['kin', 'rw'], ['kir', 'ky'], ['kom', 'kv'], ['kon', 'kg'],
  ['kor', 'ko'], ['kua', 'kj'], ['kur', 'ku'], ['lao', 'lo'], ['lat', 'la'],
  ['lav', 'lv'], ['lim', 'li'], ['lin', 'ln'], ['lit', 'lt'], ['ltz', 'lb'],
  ['lub', 'lu'], ['lug', 'lg'], ['mac', 'mk'], ['mah', 'mh'], ['mal', 'ml'],
  ['mao', 'mi'], ['mar', 'mr'], ['may', 'ms'], ['mkd', 'mk'], ['mlg', 'mg'],
  ['mlt', 'mt'], ['mon', 'mn'], ['mri', 'mi'], ['msa', 'ms'], ['mya', 'my'],
  ['nau', 'na'], ['nav', 'nv'], ['nbl', 'nr'], ['nde', 'nd'], ['ndo', 'ng'],
  ['nep', 'ne'], ['nld', 'nl'], ['nno', 'nn'], ['nob', 'nb'], ['nor', 'no'],
  ['nya', 'ny'], ['oci', 'oc'], ['oji', 'oj'], ['ori', 'or'], ['orm', 'om'],
  ['oss', 'os'], ['pan', 'pa'], ['per', 'fa'], ['pli', 'pi'], ['pol', 'pl'],
  ['por', 'pt'], ['pus', 'ps'], ['que', 'qu'], ['roh', 'rm'], ['ron', 'ro'],
  ['rum', 'ro'], ['run', 'rn'], ['rus', 'ru'], ['sag', 'sg'], ['san', 'sa'],
  ['sin', 'si'], ['slk', 'sk'], ['slo', 'sk'], ['slv', 'sl'], ['sme', 'se'],
  ['smo', 'sm'], ['sna', 'sn'], ['snd', 'sd'], ['som', 'so'], ['sot', 'st'],
  ['spa', 'es'], ['sqi', 'sq'], ['srd', 'sc'], ['srp', 'sr'], ['ssw', 'ss'],
  ['sun', 'su'], ['swa', 'sw'], ['swe', 'sv'], ['tah', 'ty'], ['tam', 'ta'],
  ['tat', 'tt'], ['tel', 'te'], ['tgk', 'tg'], ['tgl', 'tl'], ['tha', 'th'],
  ['tib', 'bo'], ['tir', 'ti'], ['ton', 'to'], ['tsn', 'tn'], ['tso', 'ts'],
  ['tuk', 'tk'], ['tur', 'tr'], ['twi', 'tw'], ['uig', 'ug'], ['ukr', 'uk'],
  ['urd', 'ur'], ['uzb', 'uz'], ['ven', 've'], ['vie', 'vi'], ['vol', 'vo'],
  ['wel', 'cy'], ['wln', 'wa'], ['wol', 'wo'], ['xho', 'xh'], ['yid', 'yi'],
  ['yor', 'yo'], ['zha', 'za'], ['zho', 'zh'], ['zul', 'zu']
])

/**
 * @summary A set of utility functions for dealing with Streams and Manifests.
 */
class StreamUtils {
  /**
   * @param {shaka.extern.Variant} variant
   * @param {shaka.extern.Restrictions} restrictions
   *   Configured restrictions from the user.
   * @param {{width: number, height: number}} maxHwRes
   *   The maximum resolution the hardware can handle.
   *   This is applied separately from user restrictions because the setting
   *   should not be easily replaced by the user's configuration.
   * @return {boolean}
   */
  static meetsRestrictions(variant, restrictions, maxHwRes) {
    /** @type {function(number, number, number):boolean} */
    const inRange = (x, min, max) => {
      return x >= min && x <= max
    }

    const video = variant.video

    // |video.width| and |video.height| can be undefined, which breaks
    // the math, so make sure they are there first.
    if (video && video.width && video.height) {
      if (!inRange(video.width,
        restrictions.minWidth,
        Math.min(restrictions.maxWidth, maxHwRes.width))) {
        return false
      }

      if (!inRange(video.height,
        restrictions.minHeight,
        Math.min(restrictions.maxHeight, maxHwRes.height))) {
        return false
      }

      if (!inRange(video.width * video.height,
        restrictions.minPixels,
        restrictions.maxPixels)) {
        return false
      }
    }

    // |variant.frameRate| can be undefined, which breaks
    // the math, so make sure they are there first.
    if (variant && variant.frameRate) {
      if (!inRange(variant.frameRate,
        restrictions.minFrameRate,
        restrictions.maxFrameRate)) {
        return false
      }
    }

    if (!inRange(variant.bandwidth,
      restrictions.minBandwidth,
      restrictions.maxBandwidth)) {
      return false
    }

    return true
  }

  /**
   * @param {!Array.<shaka.extern.Variant>} variants
   * @param {shaka.extern.Restrictions} restrictions
   * @param {{width: number, height: number}} maxHwRes
   * @return {boolean} Whether the tracks changed.
   */
  static applyRestrictions(variants, restrictions, maxHwRes) {
    let tracksChanged = false

    for (const variant of variants) {
      const originalAllowed = variant.allowedByApplication
      variant.allowedByApplication = StreamUtils.meetsRestrictions(
        variant, restrictions, maxHwRes)

      if (originalAllowed !== variant.allowedByApplication) {
        tracksChanged = true
      }
    }

    return tracksChanged
  }

  /**
   * Alters the given Period to filter out any unplayable streams.
   *
   * @param {?shaka.extern.Stream} activeAudio
   * @param {?shaka.extern.Stream} activeVideo
   * @param {shaka.extern.Period} period
   */
  static filterNewPeriod(activeAudio, activeVideo, period) {
    const StreamUtils = StreamUtils

    if (activeAudio) {
      console.assert(StreamUtils.isAudio(activeAudio),
        'Audio streams must have the audio type.')
    }

    if (activeVideo) {
      console.assert(StreamUtils.isVideo(activeVideo),
        'Video streams must have the video type.')
    }

    // Filter variants.
    period.variants = period.variants.filter((variant) => {
      const audio = variant.audio
      const video = variant.video

      if (audio && !MediaSourceEngine.isStreamSupported(audio)) {
        console.debug('Dropping variant - audio not compatible with platform',
          StreamUtils.getStreamSummaryString_(audio))
        return false
      }

      if (video && !MediaSourceEngine.isStreamSupported(video)) {
        console.debug('Dropping variant - video not compatible with platform',
          StreamUtils.getStreamSummaryString_(video))
        return false
      }

      if (audio && activeAudio) {
        if (!StreamUtils.areStreamsCompatible_(audio, activeAudio)) {
          console.debug('Droping variant - not compatible with active audio',
            'active audio',
            StreamUtils.getStreamSummaryString_(activeAudio),
            'variant.audio',
            StreamUtils.getStreamSummaryString_(audio))
          return false
        }
      }

      if (video && activeVideo) {
        if (!StreamUtils.areStreamsCompatible_(video, activeVideo)) {
          console.debug('Droping variant - not compatible with active video',
            'active video',
            StreamUtils.getStreamSummaryString_(activeVideo),
            'variant.video',
            StreamUtils.getStreamSummaryString_(video))
          return false
        }
      }

      return true
    })

    // Filter text streams.
    period.textStreams = period.textStreams.filter((stream) => {
      const fullMimeType = MimeUtils.getFullType(
        stream.mimeType, stream.codecs)
      const keep = TextEngine.isTypeSupported(fullMimeType)

      if (!keep) {
        console.debug('Dropping text stream. Is not supported by the ' +
                        'platform.', stream)
      }

      return keep
    })
  }

  /**
   * @param {shaka.extern.Stream} s0
   * @param {shaka.extern.Stream} s1
   * @return {boolean}
   * @private
   */
  static areStreamsCompatible_(s0, s1) {
    // Basic mime types and basic codecs need to match.
    // For example, we can't adapt between WebM and MP4,
    // nor can we adapt between mp4a.* to ec-3.
    // We can switch between text types on the fly,
    // so don't run this check on text.
    if (s0.mimeType !== s1.mimeType) {
      return false
    }

    if (s0.codecs.split('.')[0] !== s1.codecs.split('.')[0]) {
      return false
    }

    return true
  }

  /**
   * @param {shaka.extern.Variant} variant
   * @return {shaka.extern.Track}
   */
  static variantToTrack(variant) {
    /** @type {?shaka.extern.Stream} */
    const audio = variant.audio
    /** @type {?shaka.extern.Stream} */
    const video = variant.video

    /** @type {?string} */
    const audioCodec = audio ? audio.codecs : null
    /** @type {?string} */
    const videoCodec = video ? video.codecs : null

    /** @type {!Array.<string>} */
    const codecs = []
    if (videoCodec) {
      codecs.push(videoCodec)
    }
    if (audioCodec) {
      codecs.push(audioCodec)
    }

    /** @type {!Array.<string>} */
    const mimeTypes = []
    if (video) {
      mimeTypes.push(video.mimeType)
    }
    if (audio) {
      mimeTypes.push(audio.mimeType)
    }
    /** @type {?string} */
    const mimeType = mimeTypes[0] || null

    /** @type {!Array.<string>} */
    const kinds = []
    if (audio) {
      kinds.push(audio.kind)
    }
    if (video) {
      kinds.push(video.kind)
    }
    /** @type {?string} */
    const kind = kinds[0] || null

    /** @type {!Set.<string>} */
    const roles = new Set()
    if (audio) {
      for (const role of audio.roles) {
        roles.add(role)
      }
    }
    if (video) {
      for (const role of video.roles) {
        roles.add(role)
      }
    }

    /** @type {shaka.extern.Track} */
    const track = {
      id: variant.id,
      active: false,
      type: 'variant',
      bandwidth: variant.bandwidth,
      language: variant.language,
      label: null,
      kind: kind,
      width: null,
      height: null,
      frameRate: null,
      pixelAspectRatio: null,
      mimeType: mimeType,
      codecs: codecs.join(', '),
      audioCodec: audioCodec,
      videoCodec: videoCodec,
      primary: variant.primary,
      roles: Array.from(roles),
      audioRoles: null,
      videoId: null,
      audioId: null,
      channelsCount: null,
      audioSamplingRate: null,
      audioBandwidth: null,
      videoBandwidth: null,
      originalVideoId: null,
      originalAudioId: null,
      originalTextId: null
    }

    if (video) {
      track.videoId = video.id
      track.originalVideoId = video.originalId
      track.width = video.width || null
      track.height = video.height || null
      track.frameRate = video.frameRate || null
      track.pixelAspectRatio = video.pixelAspectRatio || null
      track.videoBandwidth = video.bandwidth || null
    }

    if (audio) {
      track.audioId = audio.id
      track.originalAudioId = audio.originalId
      track.channelsCount = audio.channelsCount
      track.audioSamplingRate = audio.audioSamplingRate
      track.audioBandwidth = audio.bandwidth || null
      track.label = audio.label
      track.audioRoles = audio.roles
    }

    return track
  }

  /**
   * @param {shaka.extern.Stream} stream
   * @return {shaka.extern.Track}
   */
  static textStreamToTrack(stream) {
    const ContentType = ManifestParserUtils.ContentType

    /** @type {shaka.extern.Track} */
    const track = {
      id: stream.id,
      active: false,
      type: ContentType.TEXT,
      bandwidth: 0,
      language: stream.language,
      label: stream.label,
      kind: stream.kind || null,
      width: null,
      height: null,
      frameRate: null,
      pixelAspectRatio: null,
      mimeType: stream.mimeType,
      codecs: stream.codecs || null,
      audioCodec: null,
      videoCodec: null,
      primary: stream.primary,
      roles: stream.roles,
      audioRoles: null,
      videoId: null,
      audioId: null,
      channelsCount: null,
      audioSamplingRate: null,
      audioBandwidth: null,
      videoBandwidth: null,
      originalVideoId: null,
      originalAudioId: null,
      originalTextId: stream.originalId
    }

    return track
  }

  /**
   * Generate and return an ID for this track, since the ID field is optional.
   *
   * @param {TextTrack|AudioTrack} html5Track
   * @return {number} The generated ID.
   */
  static html5TrackId(html5Track) {
    if (!html5Track['__shaka_id']) {
      html5Track['__shaka_id'] = StreamUtils.nextTrackId_++
    }
    return html5Track['__shaka_id']
  }

  /**
   * @param {TextTrack} textTrack
   * @return {shaka.extern.Track}
   */
  static html5TextTrackToTrack(textTrack) {
    const CLOSED_CAPTION_MIMETYPE =
        MimeUtils.CLOSED_CAPTION_MIMETYPE
    const StreamUtils = StreamUtils

    /** @type {shaka.extern.Track} */
    const track = StreamUtils.html5TrackToGenericShakaTrack_(textTrack)
    track.active = textTrack.mode !== 'disabled'
    track.type = 'text'
    track.originalTextId = textTrack.id
    if (textTrack.kind === 'captions') {
      track.mimeType = CLOSED_CAPTION_MIMETYPE
    }

    return track
  }

  /**
   * @param {AudioTrack} audioTrack
   * @return {shaka.extern.Track}
   */
  static html5AudioTrackToTrack(audioTrack) {
    const StreamUtils = StreamUtils

    /** @type {shaka.extern.Track} */
    const track = StreamUtils.html5TrackToGenericShakaTrack_(audioTrack)
    track.active = audioTrack.enabled
    track.type = 'variant'
    track.originalAudioId = audioTrack.id

    if (audioTrack.kind === 'main') {
      track.primary = true
      track.roles = ['main']
      track.audioRoles = ['main']
    } else {
      track.audioRoles = []
    }

    return track
  }

  /**
   * Creates a Track object with non-type specific fields filled out.  The
   * caller is responsible for completing the Track object with any
   * type-specific information (audio or text).
   *
   * @param {TextTrack|AudioTrack} html5Track
   * @return {shaka.extern.Track}
   * @private
   */
  static html5TrackToGenericShakaTrack_(html5Track) {
    /** @type {shaka.extern.Track} */
    const track = {
      id: StreamUtils.html5TrackId(html5Track),
      active: false,
      type: '',
      bandwidth: 0,
      language: LanguageUtils.normalize(html5Track.language),
      label: html5Track.label,
      kind: html5Track.kind,
      width: null,
      height: null,
      frameRate: null,
      pixelAspectRatio: null,
      mimeType: null,
      codecs: null,
      audioCodec: null,
      videoCodec: null,
      primary: false,
      roles: [],
      audioRoles: null,
      videoId: null,
      audioId: null,
      channelsCount: null,
      audioSamplingRate: null,
      audioBandwidth: null,
      videoBandwidth: null,
      originalVideoId: null,
      originalAudioId: null,
      originalTextId: null
    }

    return track
  }

  /**
   * Determines if the given variant is playable.
   * @param {!shaka.extern.Variant} variant
   * @return {boolean}
   */
  static isPlayable(variant) {
    return variant.allowedByApplication && variant.allowedByKeySystem
  }

  /**
   * Filters out unplayable variants.
   * @param {!Array.<!shaka.extern.Variant>} variants
   * @return {!Array.<!shaka.extern.Variant>}
   */
  static getPlayableVariants(variants) {
    return variants.filter((variant) => {
      return StreamUtils.isPlayable(variant)
    })
  }

  /**
   * Filters variants according to the given audio channel count config.
   *
   * @param {!Array.<shaka.extern.Variant>} variants
   * @param {number} preferredAudioChannelCount
   * @return {!Array.<!shaka.extern.Variant>}
   */
  static filterVariantsByAudioChannelCount(
    variants, preferredAudioChannelCount) {
    // Group variants by their audio channel counts.
    const variantsWithChannelCounts =
        variants.filter((v) => v.audio && v.audio.channelsCount)

    /** @type {!Map.<number, !Array.<shaka.extern.Variant>>} */
    const variantsByChannelCount = new Map()
    for (const variant of variantsWithChannelCounts) {
      const count = variant.audio.channelsCount
      console.assert(count !== null, 'Must have count after filtering!')
      if (!variantsByChannelCount.has(count)) {
        variantsByChannelCount.set(count, [])
      }
      variantsByChannelCount.get(count).push(variant)
    }

    /** @type {!Array.<number>} */
    const channelCounts = Array.from(variantsByChannelCount.keys())

    // If no variant has audio channel count info, return the original variants.
    if (channelCounts.length === 0) {
      return variants
    }

    // Choose the variants with the largest number of audio channels less than
    // or equal to the configured number of audio channels.
    const countLessThanOrEqualtoConfig =
        channelCounts.filter((count) => count <= preferredAudioChannelCount)
    if (countLessThanOrEqualtoConfig.length) {
      return variantsByChannelCount.get(
        Math.max(...countLessThanOrEqualtoConfig))
    }

    // If all variants have more audio channels than the config, choose the
    // variants with the fewest audio channels.
    return variantsByChannelCount.get(Math.min(...channelCounts))
  }

  /**
   * Chooses streams according to the given config.
   *
   * @param {!Array.<shaka.extern.Stream>} streams
   * @param {string} preferredLanguage
   * @param {string} preferredRole
   * @return {!Array.<!shaka.extern.Stream>}
   */
  static filterStreamsByLanguageAndRole(
    streams, preferredLanguage, preferredRole) {
    const LanguageUtils = LanguageUtils

    /** @type {!Array.<!shaka.extern.Stream>} */
    let chosen = streams

    // Start with the set of primary streams.
    /** @type {!Array.<!shaka.extern.Stream>} */
    const primary = streams.filter((stream) => {
      return stream.primary
    })

    if (primary.length) {
      chosen = primary
    }

    // Now reduce the set to one language.  This covers both arbitrary language
    // choice and the reduction of the "primary" stream set to one language.
    const firstLanguage = chosen.length ? chosen[0].language : ''
    chosen = chosen.filter((stream) => {
      return stream.language === firstLanguage
    })

    // Find the streams that best match our language preference. This will
    // override previous selections.
    if (preferredLanguage) {
      const closestLocale = LanguageUtils.findClosestLocale(
        LanguageUtils.normalize(preferredLanguage),
        streams.map((stream) => stream.language))

      // Only replace |chosen| if we found a locale that is close to our
      // preference.
      if (closestLocale) {
        chosen = streams.filter((stream) => {
          const locale = LanguageUtils.normalize(stream.language)
          return locale === closestLocale
        })
      }
    }

    // Now refine the choice based on role preference.
    if (preferredRole) {
      const roleMatches = StreamUtils.filterTextStreamsByRole_(
        chosen, preferredRole)
      if (roleMatches.length) {
        return roleMatches
      } else {
        console.warning('No exact match for the text role could be found.')
      }
    } else {
      // Prefer text streams with no roles, if they exist.
      const noRoleMatches = chosen.filter((stream) => {
        return stream.roles.length === 0
      })
      if (noRoleMatches.length) {
        return noRoleMatches
      }
    }

    // Either there was no role preference, or it could not be satisfied.
    // Choose an arbitrary role, if there are any, and filter out any other
    // roles. This ensures we never adapt between roles.

    const allRoles = chosen.map((stream) => {
      return stream.roles
    }).reduce(Functional.collapseArrays, [])

    if (!allRoles.length) {
      return chosen
    }
    return StreamUtils.filterTextStreamsByRole_(chosen, allRoles[0])
  }

  /**
   * Filter text Streams by role.
   *
   * @param {!Array.<shaka.extern.Stream>} textStreams
   * @param {string} preferredRole
   * @return {!Array.<shaka.extern.Stream>}
   * @private
   */
  static filterTextStreamsByRole_(textStreams, preferredRole) {
    return textStreams.filter((stream) => {
      return stream.roles.includes(preferredRole)
    })
  }

  /**
   * Finds a Variant with given audio and video streams.
   * Returns null if no such Variant was found.
   *
   * @param {?shaka.extern.Stream} audio
   * @param {?shaka.extern.Stream} video
   * @param {!Array.<!shaka.extern.Variant>} variants
   * @return {?shaka.extern.Variant}
   */
  static getVariantByStreams(audio, video, variants) {
    if (audio) {
      console.assert(
        StreamUtils.isAudio(audio),
        'Audio streams must have the audio type.')
    }

    if (video) {
      console.assert(
        StreamUtils.isVideo(video),
        'Video streams must have the video type.')
    }

    for (const variant of variants) {
      if (variant.audio === audio && variant.video === video) {
        return variant
      }
    }

    return null
  }

  /**
   * Checks if the given stream is an audio stream.
   *
   * @param {shaka.extern.Stream} stream
   * @return {boolean}
   */
  static isAudio(stream) {
    const ContentType = ManifestParserUtils.ContentType
    return stream.type === ContentType.AUDIO
  }

  /**
   * Checks if the given stream is a video stream.
   *
   * @param {shaka.extern.Stream} stream
   * @return {boolean}
   */
  static isVideo(stream) {
    const ContentType = ManifestParserUtils.ContentType
    return stream.type === ContentType.VIDEO
  }

  /**
   * Get all non-null streams in the variant as an array.
   *
   * @param {shaka.extern.Variant} variant
   * @return {!Array.<shaka.extern.Stream>}
   */
  static getVariantStreams(variant) {
    const streams = []

    if (variant.audio) {
      streams.push(variant.audio)
    }
    if (variant.video) {
      streams.push(variant.video)
    }

    return streams
  }

  /**
   * @param {shaka.extern.Stream} stream
   * @return {string}
   * @private
   */
  static getStreamSummaryString_(stream) {
    // Accepted parameters for Chromecast can be found (internally) at
    // go/cast-mime-params

    if (StreamUtils.isAudio(stream)) {
      return 'type=audio' +
             ' codecs=' + stream.codecs +
             ' bandwidth=' + stream.bandwidth +
             ' channelsCount=' + stream.channelsCount +
             ' audioSamplingRate=' + stream.audioSamplingRate
    }

    if (StreamUtils.isVideo(stream)) {
      return 'type=video' +
             ' codecs=' + stream.codecs +
             ' bandwidth=' + stream.bandwidth +
             ' frameRate=' + stream.frameRate +
             ' width=' + stream.width +
             ' height=' + stream.height
    }

    return 'unexpected stream type'
  }
}

/** @private {number} */
StreamUtils.nextTrackId_ = 0

/* *
 * @implements {AdaptationSetCriteria}
 * @final
 */
class PreferenceBasedCriteria {
  /* *
   * @param {string} language
   * @param {string} role
   * @param {number} channelCount
   * @param {string=} label
   * @param {string=} type
   */
  constructor(language, role, channelCount, label = '', type = '') {
    /* * @private {string} */
    this.language_ = language
    /* * @private {string} */
    this.role_ = role
    /* * @private {number} */
    this.channelCount_ = channelCount
    /* * @private {string} */
    this.label_ = label
    /* * @private {string} */
    this.type_ = type
  }

  /* * @override */
  create(variants) {
    const Class = PreferenceBasedCriteria
    let current = []

    const byLanguage = Class.filterByLanguage_(variants, this.language_)
    const byPrimary = variants.filter((variant) => variant.primary)

    if (byLanguage.length) {
      current = byLanguage
    } else if (byPrimary.length) {
      current = byPrimary
    } else {
      current = variants
    }

    // Now refine the choice based on role preference.
    if (this.role_) {
      const byRole = Class.filterVariantsByRole_(current, this.role_,
        this.type_)
      if (byRole.length) {
        current = byRole
      } else {
        console.warn('No exact match for variant role could be found.')
      }
    }

    if (this.channelCount_) {
      const byChannel = StreamUtils.filterVariantsByAudioChannelCount(
        current, this.channelCount_)
      if (byChannel.length) {
        current = byChannel
      } else {
        console.warn(
          'No exact match for the channel count could be found.')
      }
    }

    if (this.label_) {
      const byLabel = Class.filterVariantsByLabel_(current, this.label_)
      if (byLabel.length) {
        current = byLabel
      } else {
        console.warn('No exact match for variant label could be found.')
      }
    }

    // Make sure we only return a valid adaptation set.
    const set = new AdaptationSet(current[0])
    for (const variant of current) {
      if (set.canInclude(variant)) {
        set.add(variant)
      }
    }

    return set
  }

  /* *
   * @param {!Array.<shaka.extern.Variant>} variants
   * @param {string} preferredLanguage
   * @return {!Array.<shaka.extern.Variant>}
   * @private
   */
  static filterByLanguage_(variants, preferredLanguage) {
    /* * @type {string} */
    const preferredLocale = LanguageUtils.normalize(preferredLanguage)

    /* * @type {?string} */
    const closestLocale = LanguageUtils.findClosestLocale(
      preferredLocale,
      variants.map((variant) => LanguageUtils.getLocaleForVariant(variant)))

    // There were no locales close to what we preferred.
    if (!closestLocale) {
      return []
    }

    // Find the variants that use the closest variant.
    return variants.filter((variant) => {
      return closestLocale === LanguageUtils.getLocaleForVariant(variant)
    })
  }

  /* *
   * Filter Variants by role.
   *
   * @param {!Array.<shaka.extern.Variant>} variants
   * @param {string} preferredRole
   * @param {string} type
   * @return {!Array.<shaka.extern.Variant>}
   * @private
   */
  static filterVariantsByRole_(variants, preferredRole, type) {
    return variants.filter((variant) => {
      if (type) {
        const stream = variant[type]
        return stream && stream.roles.includes(preferredRole)
      } else {
        const audio = variant.audio
        const video = variant.video
        return (audio && audio.roles.includes(preferredRole)) ||
               (video && video.roles.includes(preferredRole))
      }
    })
  }

  /* *
   * Filter Variants by label.
   *
   * @param {!Array.<shaka.extern.Variant>} variants
   * @param {string} preferredLabel
   * @return {!Array.<shaka.extern.Variant>}
   * @private
   */
  static filterVariantsByLabel_(variants, preferredLabel) {
    return variants.filter((variant) => {
      if (!variant.audio) {
        return false
      }

      const label1 = variant.audio.label.toLowerCase()
      const label2 = preferredLabel.toLowerCase()
      return label1 === label2
    })
  }
}

/* *
 * The buffering observer watches how much content has been buffered and raises
 * events when the state changes (enough => not enough or vice versa).
 *
 * @final
 */
class BufferingObserver {
  /* *
   * @param {number} thresholdWhenStarving
   * @param {number} thresholdWhenSatisfied
   */
  constructor(thresholdWhenStarving, thresholdWhenSatisfied) {
    const State = BufferingObserver.State

    /* * @private {BufferingObserver.State} */
    this.previousState_ = State.SATISFIED

    /* * @private {!Map.<BufferingObserver.State, number>} */
    this.thresholds_ = new Map()
      .set(State.SATISFIED, thresholdWhenSatisfied)
      .set(State.STARVING, thresholdWhenStarving)
  }

  /* *
   * @param {number} thresholdWhenStarving
   * @param {number} thresholdWhenSatisfied
   */
  setThresholds(thresholdWhenStarving, thresholdWhenSatisfied) {
    const State = BufferingObserver.State
    this.thresholds_
      .set(State.SATISFIED, thresholdWhenSatisfied)
      .set(State.STARVING, thresholdWhenStarving)
  }

  /* *
   * Update the observer by telling it how much content has been buffered (in
   * seconds) and if we are buffered to the end of the presentation. If the
   * controller believes the state has changed, it will return |true|.
   *
   * @param {number} bufferLead
   * @param {boolean} bufferedToEnd
   * @return {boolean}
   */
  update(bufferLead, bufferedToEnd) {
    const State = BufferingObserver.State

    /* *
     * Our threshold for how much we need before we declare ourselves as
     * starving is based on whether or not we were just starving. If we
     * were just starving, we are more likely to starve again, so we require
     * more content to be buffered than if we were not just starving.
     *
     * @type {number}
     */
    const threshold = this.thresholds_.get(this.previousState_)

    const oldState = this.previousState_
    const newState = (bufferedToEnd || bufferLead >= threshold)
      ? (State.SATISFIED)
      : (State.STARVING)

    // Save the new state now so that calls to |getState| from any callbacks
    // will be accurate.
    this.previousState_ = newState

    // Return |true| only when the state has changed.
    return oldState !== newState
  }

  /* *
   * Set which state that the observer should think playback was in.
   *
   * @param {BufferingObserver.State} state
   */
  setState(state) {
    this.previousState_ = state
  }

  /* *
   * Get the state that the observer last thought playback was in.
   *
   * @return {BufferingObserver.State}
   */
  getState() {
    return this.previousState_
  }
}

/* *
 * Rather than using booleans to communicate what state we are in, we have this
 * enum.
 *
 * @enum {number}
 */
BufferingObserver.State = {
  STARVING: 0,
  SATISFIED: 1
}

/* *
 * Backoff represents delay and backoff state.  This is used by NetworkingEngine
 * for individual requests and by StreamingEngine to retry streaming failures.
 *
 * @final
 */
class Backoff {
  /* *
   * @param {shaka.extern.RetryParameters} parameters
   * @param {boolean=} autoReset  If true, start at a 'first retry' state and
   *   and auto-reset that state when we reach maxAttempts.
   *   Default set to false.
   */
  constructor(parameters, autoReset = false) {
    // Set defaults as we unpack these, so that individual app-level requests in
    // NetworkingEngine can be missing parameters.

    const defaults = Backoff.defaultRetryParameters()

    /* *
     * @const
     * @private {number}
     */
    this.maxAttempts_ = (parameters.maxAttempts === null)
      ? defaults.maxAttempts : parameters.maxAttempts

    console.assert(this.maxAttempts_ >= 1, 'maxAttempts should be >= 1')

    /* *
     * @const
     * @private {number}
     */
    this.baseDelay_ = (parameters.baseDelay === null)
      ? defaults.baseDelay : parameters.baseDelay

    console.assert(this.baseDelay_ >= 0, 'baseDelay should be >= 0')

    /* *
     * @const
     * @private {number}
     */
    this.fuzzFactor_ = (parameters.fuzzFactor === null)
      ? defaults.fuzzFactor : parameters.fuzzFactor

    console.assert(this.fuzzFactor_ >= 0, 'fuzzFactor should be >= 0')

    /* *
     * @const
     * @private {number}
     */
    this.backoffFactor_ = (parameters.backoffFactor === null)
      ? defaults.backoffFactor : parameters.backoffFactor

    console.assert(
      this.backoffFactor_ >= 0, 'backoffFactor should be >= 0')

    /* * @private {number} */
    this.numAttempts_ = 0

    /* * @private {number} */
    this.nextUnfuzzedDelay_ = this.baseDelay_

    /* * @private {boolean} */
    this.autoReset_ = autoReset

    if (this.autoReset_) {
      // There is no delay before the first attempt.  In StreamingEngine (the
      // intended user of auto-reset mode), the first attempt was implied, so we
      // reset numAttempts to 1.  Therefore maxAttempts (which includes the
      // first attempt) must be at least 2 for us to see a delay.
      console.assert(this.maxAttempts_ >= 2,
        'maxAttempts must be >= 2 for autoReset === true')
      this.numAttempts_ = 1
    }
  }

  /* *
   * @return {!Promise} Resolves when the caller may make an attempt, possibly
   *   after a delay.  Rejects if no more attempts are allowed.
   */
  async attempt() {
    if (this.numAttempts_ >= this.maxAttempts_) {
      if (this.autoReset_) {
        this.reset_()
      } else {
        throw new Error(
          Error.Severity.CRITICAL,
          Error.Category.PLAYER,
          Error.Code.ATTEMPTS_EXHAUSTED)
      }
    }

    const currentAttempt = this.numAttempts_
    this.numAttempts_++

    if (currentAttempt === 0) {
      console.assert(!this.autoReset_, 'Failed to delay with auto-reset!')
      return
    }

    // We've already tried before, so delay the Promise.

    // Fuzz the delay to avoid tons of clients hitting the server at once
    // after it recovers from whatever is causing it to fail.
    const fuzzedDelayMs = Backoff.fuzz_(
      this.nextUnfuzzedDelay_, this.fuzzFactor_)

    await new Promise((resolve) => {
      Backoff.defer(fuzzedDelayMs, resolve)
    })

    // Update delay_ for next time.
    this.nextUnfuzzedDelay_ *= this.backoffFactor_
  }

  /* *
   * Gets a copy of the default retry parameters.
   *
   * @return {shaka.extern.RetryParameters}
   */
  static defaultRetryParameters() {
    // Use a function rather than a constant member so the calling code can
    // modify the values without affecting other call results.
    return {
      maxAttempts: 2,
      baseDelay: 1000,
      backoffFactor: 2,
      fuzzFactor: 0.5,
      timeout: 0
    }
  }

  /* *
   * Fuzz the input value by +/- fuzzFactor.  For example, a fuzzFactor of 0.5
   * will create a random value that is between 50% and 150% of the input value.
   *
   * @param {number} value
   * @param {number} fuzzFactor
   * @return {number} The fuzzed value
   * @private
   */
  static fuzz_(value, fuzzFactor) {
    // A random number between -1 and +1.
    const negToPosOne = (Math.random() * 2.0) - 1.0

    // A random number between -fuzzFactor and +fuzzFactor.
    const negToPosFuzzFactor = negToPosOne * fuzzFactor

    // The original value, fuzzed by +/- fuzzFactor.
    return value * (1.0 + negToPosFuzzFactor)
  }

  /* *
   * Reset state in autoReset mode.
   * @private
   */
  reset_() {
    console.assert(this.autoReset_, 'Should only be used for auto-reset!')
    this.numAttempts_ = 1
    this.nextUnfuzzedDelay_ = this.baseDelay_
  }

  /* *
   * This method is only public for testing. It allows us to intercept the
   * time-delay call.
   *
   * @param {number} delayInMs
   * @param {function()} callback
   */
  static defer(delayInMs, callback) {
    const timer = new Timer(callback)
    timer.tickAfter(delayInMs / 1000)
  }
}

/* *
 * A utility to wrap abortable operations.  Note that these are not cancelable.
 * Cancelation implies undoing what has been done so far, whereas aborting only
 * means that futher work is stopped.
 *
 * @implements {shaka.extern.IAbortableOperation.<T>}
 * @template T
 * @export
 */
class AbortableOperation {
  /* *
   * @param {!Promise.<T>} promise
   *   A Promise which represents the underlying operation.  It is resolved when
   *   the operation is complete, and rejected if the operation fails or is
   *   aborted.  Aborted operations should be rejected with a Error
   *   object using the error code OPERATION_ABORTED.
   * @param {function():!Promise} onAbort
   *   Will be called by this object to abort the underlying operation.
   *   This is not cancelation, and will not necessarily result in any work
   *   being undone.  abort() should return a Promise which is resolved when the
   *   underlying operation has been aborted.  The returned Promise should never
   *   be rejected.
   */
  constructor(promise, onAbort) {
    /* * @const {!Promise.<T>} */
    this.promise = promise

    /* * @private {function():!Promise} */
    this.onAbort_ = onAbort

    /* * @private {boolean} */
    this.aborted_ = false
  }

  /* *
   * @param {!Error} error
   * @return {!AbortableOperation} An operation which has already
   *   failed with the error given by the caller.
   * @export
   */
  static failed(error) {
    return new AbortableOperation(
      Promise.reject(error),
      () => Promise.resolve())
  }

  /* *
   * @return {!AbortableOperation} An operation which has already
   *   failed with the error OPERATION_ABORTED.
   * @export
   */
  static aborted() {
    const p = Promise.reject(new Error$1(
      Error$1.Severity.CRITICAL,
      Error$1.Category.PLAYER,
      Error$1.Code.OPERATION_ABORTED))
    // Silence uncaught rejection errors, which may otherwise occur any place
    // we don't explicitly handle aborted operations.
    p.catch(() => {})
    return new AbortableOperation(p, () => Promise.resolve())
  }

  /* *
   * @param {U} value
   * @return {!AbortableOperation.<U>} An operation which has already
   *   completed with the given value.
   * @template U
   * @export
   */
  static completed(value) {
    return new AbortableOperation(
      Promise.resolve(value),
      () => Promise.resolve())
  }

  /* *
   * @param {!Promise.<U>} promise
   * @return {!AbortableOperation.<U>} An operation which cannot be
   *   aborted.  It will be completed when the given Promise is resolved, or
   *   will be failed when the given Promise is rejected.
   * @template U
   * @export
   */
  static notAbortable(promise) {
    return new AbortableOperation(
      promise,
      // abort() here will return a Promise which is resolved when the input
      // promise either resolves or fails.
      () => promise.catch(() => {}))
  }

  /* *
   * @override
   * @export
   */
  abort() {
    this.aborted_ = true
    return this.onAbort_()
  }

  /* *
   * @param {!Array.<!AbortableOperation>} operations
   * @return {!AbortableOperation} An operation which is resolved
   *   when all operations are successful and fails when any operation fails.
   *   For this operation, abort() aborts all given operations.
   * @export
   */
  static all(operations) {
    return new AbortableOperation(
      Promise.all(operations.map((op) => op.promise)),
      () => Promise.all(operations.map((op) => op.abort())))
  }

  /* *
   * @override
   * @export
   */
  finally(onFinal) {
    this.promise.then((value) => onFinal(true), (e) => onFinal(false))
    return this
  }

  /* *
   * @param {(undefined|
   *          function(T):U|
   *          function(T):!Promise.<U>|
   *          function(T):!AbortableOperation.<U>)} onSuccess
   *   A callback to be invoked after this operation is complete, to chain to
   *   another operation.  The callback can return a plain value, a Promise to
   *   an asynchronous value, or another AbortableOperation.
   * @param {function(*)=} onError
   *   An optional callback to be invoked if this operation fails, to perform
   *   some cleanup or error handling.  Analogous to the second parameter of
   *   Promise.prototype.then.
   * @return {!AbortableOperation.<U>} An operation which is resolved
   *   when this operation and the operation started by the callback are both
   *   complete.
   * @template U
   * @export
   */
  chain(onSuccess, onError) {
    const newPromise = new PublicPromise()

    // If called before 'this' completes, just abort 'this'.
    let abort = () => {
      newPromise.reject(new Error$1(
        Error$1.Severity.CRITICAL,
        Error$1.Category.PLAYER,
        Error$1.Code.OPERATION_ABORTED))
      return this.abort()
    }

    this.promise.then((value) => {
      if (this.aborted_) {
        // If 'this' is not abortable(), or if abort() is called after 'this'
        // is complete but before the next stage in the chain begins, we should
        // stop right away.
        newPromise.reject(new Error$1(
          Error$1.Severity.CRITICAL,
          Error$1.Category.PLAYER,
          Error$1.Code.OPERATION_ABORTED))
        return
      }

      if (!onSuccess) {
        // No callback?  Pass the success along.
        newPromise.resolve(value)
        return
      }

      // Call the success callback, interpret the return value,
      // set the Promise state, and get the next abort function.
      abort = AbortableOperation.wrapChainCallback_(
        onSuccess, value, newPromise)
    }, (e) => {
      // 'This' failed or was aborted.

      if (!onError) {
        // No callback?  Pass the failure along.
        newPromise.reject(e)
        return
      }

      // Call the error callback, interpret the return value,
      // set the Promise state, and get the next abort function.
      abort = AbortableOperation.wrapChainCallback_(
        onError, e, newPromise)
    })

    return new AbortableOperation(
      newPromise,
      // By creating a closure around abort(), we can update the value of
      // abort() at various stages.
      () => abort())
  }

  /* *
   * @param {(function(T):U|
   *          function(T):!Promise.<U>|
   *          function(T):!AbortableOperation.<U>|
   *          function(*))} callback
   *   A callback to be invoked with the given value.
   * @param {T} value
   * @param {!PublicPromise} newPromise The promise for the next
   *   stage in the chain.
   * @return {function():!Promise} The next abort() function for the chain.
   * @private
   * @template T, U
   */
  static wrapChainCallback_(callback, value, newPromise) {
    try {
      const ret = callback(value)

      if (ret && ret.promise && ret.abort) {
        // This is an abortable operation, with its own abort() method.
        // After this point, abort() should abort the operation from the
        // callback, and the new promise should be tied to the promise
        // from the callback's operation.
        newPromise.resolve(ret.promise)
        // This used to say 'return ret.abort;', but it caused subtle issues by
        // unbinding part of the abort chain.  There is now a test to ensure
        // that we don't call abort with the wrong 'this'.
        return () => ret.abort()
      } else {
        // This is a Promise or a plain value, and this step cannot be aborted.
        newPromise.resolve(ret)
        // Abort is complete when the returned value/Promise is resolved or
        // fails, but never fails itself nor returns a value.
        return () => Promise.resolve(ret).then(() => {}).catch(() => {})
      }
    } catch (exception) {
      // The callback threw an exception or error.  Reject the new Promise and
      // resolve any future abort call right away.
      newPromise.reject(exception)
      return () => Promise.resolve()
    }
  }
}

/* *
 * @const {!Promise.<T>}
 * @exportInterface
 */
// eslint-disable-next-line no-restricted-syntax
AbortableOperation.prototype.promise

class ObjectUtils {
  /* *
   * Performs a deep clone of the given simple object.  This does not copy
   * prototypes, custom properties (e.g. read-only), or multiple references to
   * the same object.  If the caller needs these fields, it will need to set
   * them after this returns.
   *
   * @template T
   * @param {T} arg
   * @return {T}
   */
  static cloneObject(arg) {
    const seenObjects = new Set()
    // This recursively clones the value |val|, using the captured variable
    // |seenObjects| to track the objects we have already cloned.
    const clone = (val) => {
      switch (typeof val) {
        case 'undefined':
        case 'boolean':
        case 'number':
        case 'string':
        case 'symbol':
        case 'function':
          return val
        case 'object':
        default: {
          // typeof null ==== 'object'
          if (!val) {
            return val
          }

          // This covers Uint8Array and friends, even without a TypedArray
          // base-class constructor.
          const isTypedArray =
              val.buffer && val.buffer.constructor === ArrayBuffer
          if (isTypedArray) {
            return val
          }

          if (seenObjects.has(val)) {
            return null
          }

          const isArray = val.constructor === Array
          if (val.constructor !== Object && !isArray) {
            return null
          }

          seenObjects.add(val)
          const ret = isArray ? [] : {}
          // Note |name| will equal a number for arrays.
          for (const name in val) {
            ret[name] = clone(val[name])
          }

          // Length is a non-enumerable property, but we should copy it over in
          // case it is not the default.
          if (isArray) {
            ret.length = val.length
          }
          return ret
        }
      }
    }
    return clone(arg)
  }

  /* *
   * Performs a shallow clone of the given simple object.  This does not copy
   * prototypes or custom properties (e.g. read-only).
   *
   * @template T
   * @param {T} original
   * @return {T}
   */
  static shallowCloneObject(original) {
    const clone = /* * @type {?} */({})
    for (const k in original) {
      clone[k] = original[k]
    }
    return clone
  }
}

/* *
 * @namespace ArrayUtils
 * @summary Array utility functions.
 */

class ArrayUtils {
  /* *
   * Returns whether the two values contain the same value.  This correctly
   * handles comparisons involving NaN.
   * @param {T} a
   * @param {T} b
   * @return {boolean}
   * @template T
   */
  static defaultEquals(a, b) {
    // NaN !== NaN, so we need to special case it.
    if (typeof a === 'number' &&
        typeof b === 'number' && isNaN(a) && isNaN(b)) {
      return true
    }
    return a === b
  }
  /* *
   * Remove given element from array (assumes no duplicates).
   * @param {!Array.<T>} array
   * @param {T} element
   * @template T
   */
  static remove(array, element) {
    const index = array.indexOf(element)
    if (index > -1) {
      array.splice(index, 1)
    }
  }
  /* *
   * Count the number of items in the list that pass the check function.
   * @param {!Array.<T>} array
   * @param {function(T):boolean} check
   * @return {number}
   * @template T
   */
  static count(array, check) {
    let count = 0

    for (const element of array) {
      count += check(element) ? 1 : 0
    }

    return count
  }
  /* *
   * Determines if the given arrays contain the same elements.
   *
   * @param {!Array.<T>} a
   * @param {!Array.<T>} b
   * @param {function(T, T):boolean=} compareFn
   * @return {boolean}
   * @template T
   */
  static hasSameElements(a, b, compareFn) {
    if (!compareFn) {
      compareFn = ArrayUtils.defaultEquals
    }
    if (a.length !== b.length) {
      return false
    }

    const copy = b.slice()
    for (const item of a) {
      const idx = copy.findIndex((other) => compareFn(item, other))
      if (idx === -1) {
        return false
      }
      // Since order doesn't matter, just swap the last element with
      // this one and then drop the last element.
      copy[idx] = copy[copy.length - 1]
      copy.pop()
    }

    return copy.length === 0
  }
}

// import IDestroyable from './i_destroyable'
/* *
 * A utility for cleaning up AbortableOperations, to help simplify common
 * patterns and reduce code duplication.
 *
 * @implements {IDestroyable}
 */
class OperationManager {
  constructor() {
    /* * @private {!Array.<!shaka.extern.IAbortableOperation>} */
    this.operations_ = []
  }

  /* *
   * Manage an operation.  This means aborting it on destroy() and removing it
   * from the management set when it complete.
   *
   * @param {!shaka.extern.IAbortableOperation} operation
   */
  manage(operation) {
    this.operations_.push(operation.finally(() => {
      ArrayUtils.remove(this.operations_, operation)
    }))
  }

  /* * @override */
  destroy() {
    const cleanup = []
    for (const op of this.operations_) {
      // Catch and ignore any failures.  This silences error logs in the
      // JavaScript console about uncaught Promise failures.
      op.promise.catch(() => {})

      // Now abort the operation.
      cleanup.push(op.abort())
    }

    this.operations_ = []
    return Promise.all(cleanup)
  }
}

/* *
 * @event NetworkingEngine.RetryEvent
 * @description Fired when the networking engine receives a recoverable error
 *   and retries.
 * @property {string} type
 *   'retry'
 * @property {?Error} error
 *   The error that caused the retry. If it was a non-Shaka error, this is set
 *   to null.
 * @exportDoc
 */

/* *
 * NetworkingEngine wraps all networking operations.  This accepts plugins that
 * handle the actual request.  A plugin is registered using registerScheme.
 * Each scheme has at most one plugin to handle the request.
 *
 * @implements {IDestroyable}
 * @export
 */
class NetworkingEngine extends FakeEventTarget {
  /* *
   * @param {function(number, number)=} onProgressUpdated Called when a progress
   *   event is triggered. Passed the duration, in milliseconds, that the
   *   request took, and the number of bytes transferred.
   */
  constructor(onProgressUpdated) {
    super()

    /* * @private {boolean} */
    this.destroyed_ = false

    /* * @private {!OperationManager} */
    this.operationManager_ = new OperationManager()

    /* * @private {!Set.<shaka.extern.RequestFilter>} */
    this.requestFilters_ = new Set()

    /* * @private {!Set.<shaka.extern.ResponseFilter>} */
    this.responseFilters_ = new Set()

    /* * @private {?function(number, number)} */
    this.onProgressUpdated_ = onProgressUpdated || null
  }

  /* *
   * Registers a scheme plugin.  This plugin will handle all requests with the
   * given scheme.  If a plugin with the same scheme already exists, it is
   * replaced, unless the existing plugin is of higher priority.
   * If no priority is provided, this defaults to the highest priority of
   * APPLICATION.
   *
   * @param {string} scheme
   * @param {shaka.extern.SchemePlugin} plugin
   * @param {number=} priority
   * @export
   */
  static registerScheme(scheme, plugin, priority) {
    console.assert(
      priority === undefined || priority > 0, 'explicit priority must be > 0')
    priority =
        priority || NetworkingEngine.PluginPriority.APPLICATION
    const existing = NetworkingEngine.schemes_[scheme]
    if (!existing || priority >= existing.priority) {
      NetworkingEngine.schemes_[scheme] = {
        priority: priority,
        plugin: plugin
      }
    }
  }

  /* *
   * Removes a scheme plugin.
   *
   * @param {string} scheme
   * @export
   */
  static unregisterScheme(scheme) {
    delete NetworkingEngine.schemes_[scheme]
  }

  /* *
   * Registers a new request filter.  All filters are applied in the order they
   * are registered.
   *
   * @param {shaka.extern.RequestFilter} filter
   * @export
   */
  registerRequestFilter(filter) {
    this.requestFilters_.add(filter)
  }

  /* *
   * Removes a request filter.
   *
   * @param {shaka.extern.RequestFilter} filter
   * @export
   */
  unregisterRequestFilter(filter) {
    this.requestFilters_.delete(filter)
  }

  /* *
   * Clears all request filters.
   *
   * @export
   */
  clearAllRequestFilters() {
    this.requestFilters_.clear()
  }

  /* *
   * Registers a new response filter.  All filters are applied in the order they
   * are registered.
   *
   * @param {shaka.extern.ResponseFilter} filter
   * @export
   */
  registerResponseFilter(filter) {
    this.responseFilters_.add(filter)
  }

  /* *
   * Removes a response filter.
   *
   * @param {shaka.extern.ResponseFilter} filter
   * @export
   */
  unregisterResponseFilter(filter) {
    this.responseFilters_.delete(filter)
  }

  /* *
   * Clears all response filters.
   *
   * @export
   */
  clearAllResponseFilters() {
    this.responseFilters_.clear()
  }

  /* *
   * Gets a copy of the default retry parameters.
   *
   * @return {shaka.extern.RetryParameters}
   *
   * NOTE: The implementation moved to Backoff to avoid a circular
   * dependency between the two classes.
   *
   * @export
   */
  static defaultRetryParameters() {
    return Backoff.defaultRetryParameters()
  }

  /* *
   * Makes a simple network request for the given URIs.
   *
   * @param {!Array.<string>} uris
   * @param {shaka.extern.RetryParameters} retryParams
   * @return {shaka.extern.Request}
   * @export
   */
  static makeRequest(uris, retryParams) {
    return {
      uris: uris,
      method: 'GET',
      body: null,
      headers: {},
      allowCrossSiteCredentials: false,
      retryParameters: retryParams,
      licenseRequestType: null,
      sessionId: null
    }
  }

  /* *
   * @override
   * @export
   */
  destroy() {
    this.destroyed_ = true
    this.requestFilters_.clear()
    this.responseFilters_.clear()
    return this.operationManager_.destroy()
  }

  /* *
   * Makes a network request and returns the resulting data.
   *
   * @param {NetworkingEngine.RequestType} type
   * @param {shaka.extern.Request} request
   * @return {!PendingRequest}
   * @export
   */
  request(type, request) {
    const numBytesRemainingObj =
        new NetworkingEngine.NumBytesRemainingClass()

    // Reject all requests made after destroy is called.
    if (this.destroyed_) {
      const p = Promise.reject(new Error$1(
        Error$1.Severity.CRITICAL,
        Error$1.Category.PLAYER,
        Error$1.Code.OPERATION_ABORTED))
      // Silence uncaught rejection errors, which may otherwise occur any place
      // we don't explicitly handle aborted operations.
      p.catch(() => {})
      return new PendingRequest(
        p, () => Promise.resolve(), numBytesRemainingObj)
    }

    console.assert(
      request.uris && request.uris.length, 'Request without URIs!')

    // If a request comes from outside the library, some parameters may be left
    // undefined.  To make it easier for application developers, we will fill
    // them in with defaults if necessary.
    //
    // We clone retryParameters and uris so that if a filter modifies the
    // request, it doesn't contaminate future requests.
    request.method = request.method || 'GET'
    request.headers = request.headers || {}
    request.retryParameters = request.retryParameters
      ? ObjectUtils.cloneObject(request.retryParameters)
      : NetworkingEngine.defaultRetryParameters()
    request.uris = ObjectUtils.cloneObject(request.uris)

    // Apply the registered filters to the request.
    const requestFilterOperation = this.filterRequest_(type, request)
    const requestOperation = requestFilterOperation.chain(
      () => this.makeRequestWithRetry_(type, request, numBytesRemainingObj))
    const responseFilterOperation = requestOperation.chain(
      (responseAndGotProgress) =>
        this.filterResponse_(type, responseAndGotProgress))

    // Keep track of time spent in filters.
    const requestFilterStartTime = Date.now()
    let requestFilterMs = 0
    requestFilterOperation.promise.then(() => {
      requestFilterMs = Date.now() - requestFilterStartTime
    }, () => {}) // Silence errors in this fork of the Promise chain.

    let responseFilterStartTime = 0
    requestOperation.promise.then(() => {
      responseFilterStartTime = Date.now()
    }, () => {}) // Silence errors in this fork of the Promise chain.

    const op = responseFilterOperation.chain((responseAndGotProgress) => {
      const responseFilterMs = Date.now() - responseFilterStartTime
      const response = responseAndGotProgress.response
      response.timeMs += requestFilterMs
      response.timeMs += responseFilterMs
      if (!responseAndGotProgress.gotProgress &&
          this.onProgressUpdated_ &&
          !response.fromCache &&
          type === NetworkingEngine.RequestType.SEGMENT) {
        this.onProgressUpdated_(response.timeMs, response.data.byteLength)
      }
      return response
    }, (e) => {
      // Any error thrown from elsewhere should be recategorized as CRITICAL
      // here.  This is because by the time it gets here, we've exhausted
      // retries.
      if (e) {
        console.assert(e instanceof Error$1, 'Wrong error type')
        e.severity = Error$1.Severity.CRITICAL
      }

      throw e
    })

    // Return the pending request, which carries the response operation, and the
    // number of bytes remaining to be downloaded, updated by the progress
    // events.  Add the operation to the manager for later cleanup.
    const pendingRequest =
        new PendingRequest(
          op.promise, op.onAbort_, numBytesRemainingObj)
    this.operationManager_.manage(pendingRequest)
    return pendingRequest
  }

  /* *
   * @param {NetworkingEngine.RequestType} type
   * @param {shaka.extern.Request} request
   * @return {!shaka.extern.IAbortableOperation.<undefined>}
   * @private
   */
  filterRequest_(type, request) {
    let filterOperation = AbortableOperation.completed(undefined)

    for (const requestFilter of this.requestFilters_) {
      // Request filters are run sequentially.
      filterOperation = filterOperation.chain(() => {
        if (request.body) {
          // TODO: For v2.7 we should remove this or change to always pass a
          // Uint8Array.  To make it easier for apps to write filters, it may be
          // better to always pass a Uint8Array so they know what they are
          // getting; but we shouldn't use ArrayBuffer since that would require
          // copying buffers if this is a partial view.
          request.body = BufferUtils.toArrayBuffer(request.body)
        }
        return requestFilter(type, request)
      })
    }

    // Catch any errors thrown by request filters, and substitute
    // them with a Shaka-native error.
    return filterOperation.chain(undefined, (e) => {
      if (e && e.code === Error$1.Code.OPERATION_ABORTED) {
        // Don't change anything if the operation was aborted.
        throw e
      }

      throw new Error$1(
        Error$1.Severity.CRITICAL,
        Error$1.Category.NETWORK,
        Error$1.Code.REQUEST_FILTER_ERROR, e)
    })
  }

  /* *
   * @param {NetworkingEngine.RequestType} type
   * @param {shaka.extern.Request} request
   * @param {NetworkingEngine.NumBytesRemainingClass}
   *            numBytesRemainingObj
   * @return {!shaka.extern.IAbortableOperation.<
   *            NetworkingEngine.ResponseAndGotProgress>}
   * @private
   */
  makeRequestWithRetry_(type, request, numBytesRemainingObj) {
    const backoff = new Backoff(
      request.retryParameters, /*  autoReset= */ false)
    const index = 0
    return this.send_(
      type, request, backoff, index, /*  lastError= */ null,
      numBytesRemainingObj)
  }

  /* *
   * Sends the given request to the correct plugin and retry using Backoff.
   *
   * @param {NetworkingEngine.RequestType} type
   * @param {shaka.extern.Request} request
   * @param {!Backoff} backoff
   * @param {number} index
   * @param {?Error} lastError
   * @param {NetworkingEngine.NumBytesRemainingClass}
   *     numBytesRemainingObj
   * @return {!shaka.extern.IAbortableOperation.<
   *               NetworkingEngine.ResponseAndGotProgress>}
   * @private
   */
  send_(type, request, backoff, index, lastError, numBytesRemainingObj) {
    const uri = new Uri(request.uris[index])
    let scheme = uri.getScheme()
    // Whether it got a progress event.
    let gotProgress = false
    if (!scheme) {
      // If there is no scheme, infer one from the location.
      scheme = NetworkingEngine.getLocationProtocol_()
      console.assert(
        scheme[scheme.length - 1] === ':',
        'location.protocol expected to end with a colon!')
      // Drop the colon.
      scheme = scheme.slice(0, -1)

      // Override the original URI to make the scheme explicit.
      uri.setScheme(scheme)
      request.uris[index] = uri.toString()
    }

    // Schemes are meant to be case-insensitive.
    // See https://github.com/google/shaka-player/issues/2173
    // and https://tools.ietf.org/html/rfc3986#section-3.1
    scheme = scheme.toLowerCase()

    const object = NetworkingEngine.schemes_[scheme]
    const plugin = object ? object.plugin : null
    if (!plugin) {
      return AbortableOperation.failed(
        new Error$1(
          Error$1.Severity.CRITICAL,
          Error$1.Category.NETWORK,
          Error$1.Code.UNSUPPORTED_SCHEME,
          uri))
    }
    // Every attempt must have an associated backoff.attempt() call so that the
    // accounting is correct.
    const backoffOperation =
        AbortableOperation.notAbortable(backoff.attempt())

    let startTimeMs
    const sendOperation = backoffOperation.chain(() => {
      if (this.destroyed_) {
        return AbortableOperation.aborted()
      }

      startTimeMs = Date.now()
      const segment = NetworkingEngine.RequestType.SEGMENT

      return plugin(request.uris[index],
        request,
        type,
        // The following function is passed to plugin.
        (time, bytes, numBytesRemaining) => {
          if (this.onProgressUpdated_ && type === segment) {
            this.onProgressUpdated_(time, bytes)
            gotProgress = true
            numBytesRemainingObj.setBytes(numBytesRemaining)
          }
        })
    }).chain((response) => {
      if (response.timeMs === undefined) {
        response.timeMs = Date.now() - startTimeMs
      }
      const responseAndGotProgress = {
        response: response,
        gotProgress: gotProgress
      }

      return responseAndGotProgress
    }, (error) => {
      if (this.destroyed_) {
        return AbortableOperation.aborted()
      }

      if (error.code === Error$1.Code.OPERATION_ABORTED) {
        // Don't change anything if the operation was aborted.
        throw error
      } else if (error.code === Error$1.Code.ATTEMPTS_EXHAUSTED) {
        console.assert(lastError, 'Should have last error')
        throw lastError
      }

      if (error.severity === Error$1.Severity.RECOVERABLE) {
        // Don't pass in a non-shaka error, even if one is somehow thrown
        // instead, call the listener with a null error.
        const errorOrNull = error instanceof Error$1 ? error : null
        const event = new FakeEvent('retry', { 'error': errorOrNull })
        this.dispatchEvent(event)

        // Move to the next URI.
        index = (index + 1) % request.uris.length
        const shakaError = /* * @type {Error} */(error)
        return this.send_(
          type, request, backoff, index, shakaError, numBytesRemainingObj)
      }

      // The error was not recoverable, so do not try again.
      throw error
    })

    return sendOperation
  }

  /* *
   * @param {NetworkingEngine.RequestType} type
   * @param {NetworkingEngine.ResponseAndGotProgress}
   *        responseAndGotProgress
   * @return {!shaka.extern.IAbortableOperation.<
   *               NetworkingEngine.ResponseAndGotProgress>}
   * @private
   */
  filterResponse_(type, responseAndGotProgress) {
    let filterOperation = AbortableOperation.completed(undefined)
    for (const responseFilter of this.responseFilters_) {
      // Response filters are run sequentially.
      filterOperation = filterOperation.chain(() => {
        const resp = responseAndGotProgress.response
        if (resp.data) {
          // TODO: See TODO in filterRequest_.
          resp.data = BufferUtils.toArrayBuffer(resp.data)
        }
        return responseFilter(type, resp)
      })
    }
    // If successful, return the filtered response with whether it got
    // progress.
    return filterOperation.chain(() => {
      return responseAndGotProgress
    }, (e) => {
      // Catch any errors thrown by request filters, and substitute
      // them with a Shaka-native error.

      if (e && e.code === Error$1.Code.OPERATION_ABORTED) {
        // Don't change anything if the operation was aborted.
        throw e
      }

      // The error is assumed to be critical if the original wasn't a Shaka
      // error.
      let severity = Error$1.Severity.CRITICAL
      if (e instanceof Error$1) {
        severity = e.severity
      }

      throw new Error$1(
        severity,
        Error$1.Category.NETWORK,
        Error$1.Code.RESPONSE_FILTER_ERROR, e)
    })
  }

  /* *
   * This is here only for testability.  We can't mock location in our tests on
   * all browsers, so instead we mock this.
   *
   * @return {string} The value of location.protocol.
   * @private
   */
  static getLocationProtocol_() {
    return location.protocol
  }
}

/* *
 * A wrapper class for the number of bytes remaining to be downloaded for the
 * request.
 * Instead of using PendingRequest directly, this class is needed to be sent to
 * plugin as a parameter, and a Promise is returned, before PendingRequest is
 * created.
 *
 * @export
 */
NetworkingEngine.NumBytesRemainingClass = class {
  /* *
   * Constructor
   */
  constructor() {
    /* * @private {number} */
    this.bytesToLoad_ = 0
  }

  /* *
   * @param {number} bytesToLoad
   */
  setBytes(bytesToLoad) {
    this.bytesToLoad_ = bytesToLoad
  }

  /* *
   * @return {number}
   */
  getBytes() {
    return this.bytesToLoad_
  }
}

/* *
 * Request types.  Allows a filter to decide which requests to read/alter.
 *
 * @enum {number}
 * @export
 */
NetworkingEngine.RequestType = {
  'MANIFEST': 0,
  'SEGMENT': 1,
  'LICENSE': 2,
  'APP': 3,
  'TIMING': 4
}
/* *
 * Priority level for network scheme plugins.
 * If multiple plugins are provided for the same scheme, only the
 * highest-priority one is used.
 *
 * @enum {number}
 * @export
 */
NetworkingEngine.PluginPriority = {
  'FALLBACK': 1,
  'PREFERRED': 2,
  'APPLICATION': 3
}
/* *
 * Contains the scheme plugins.
 *
 * @private {!Object.<string, NetworkingEngine.SchemeObject>}
 */
NetworkingEngine.schemes_ = {}
/* *
 * A pending network request. This can track the current progress of the
 * download, and allows the request to be aborted if the network is slow.
 *
 * @implements {shaka.extern.IAbortableOperation.<shaka.extern.Response>}
 * @extends {AbortableOperation}
 * @export
 */
class PendingRequest extends AbortableOperation {
  /* *
       * @param {!Promise} promise
       *   A Promise which represents the underlying operation.  It is resolved
       *   when the operation is complete, and rejected if the operation fails
       *   or is aborted.  Aborted operations should be rejected with a
       *   Error object using the error code OPERATION_ABORTED.
       * @param {function():!Promise} onAbort
       *   Will be called by this object to abort the underlying operation.
       *   This is not cancelation, and will not necessarily result in any work
       *   being undone.  abort() should return a Promise which is resolved when
       *   the underlying operation has been aborted.  The returned Promise
       *   should never be rejected.
       * @param {NetworkingEngine.NumBytesRemainingClass}
       *   numBytesRemainingObj
       */
  constructor(promise, onAbort, numBytesRemainingObj) {
    super(promise, onAbort)

    /* * @private {NetworkingEngine.NumBytesRemainingClass} */
    this.bytesRemaining_ = numBytesRemainingObj
  }

  /* *
       * @return {number}
       */
  getBytesRemaining() {
    return this.bytesRemaining_.getBytes()
  }
}

/* *
 * @summary An interface to register manifest parsers.
 * @exportDoc
 */
class ManifestParser {
  /* *
   * Registers a manifest parser by file extension.
   *
   * @param {string} extension The file extension of the manifest.
   * @param {shaka.extern.ManifestParser.Factory} parserFactory The factory
   *   used to create parser instances.
   * @export
   */
  static registerParserByExtension(extension, parserFactory) {
    ManifestParser.parsersByExtension[extension] = parserFactory
  }

  /* *
   * Registers a manifest parser by MIME type.
   *
   * @param {string} mimeType The MIME type of the manifest.
   * @param {shaka.extern.ManifestParser.Factory} parserFactory The factory
   *   used to create parser instances.
   * @export
   */
  static registerParserByMime(mimeType, parserFactory) {
    ManifestParser.parsersByMime[mimeType] = parserFactory
  }

  /* *
   * Unregisters a manifest parser by MIME type.
   *
   * @param {string} mimeType The MIME type of the manifest.
   * @export
   */
  static unregisterParserByMime(mimeType) {
    delete ManifestParser.parsersByMime[mimeType]
  }
  /* *
   * Returns a map of manifest support for well-known types.
   *
   * @return {!Object.<string, boolean>}
   */
  static probeSupport() {
    const ManifestParser = ManifestParser
    const support = {}

    // Make sure all registered parsers are shown, but only for MSE-enabled
    // platforms where our parsers matter.
    if (Platform.supportsMediaSource()) {
      for (const type in ManifestParser.parsersByMime) {
        support[type] = true
      }
      for (const type in ManifestParser.parsersByExtension) {
        support[type] = true
      }
    }

    // Make sure all well-known types are tested as well, just to show an
    // explicit false for things people might be expecting.
    const testMimeTypes = [
      // DASH
      'application/dash+xml',
      // HLS
      'application/x-mpegurl',
      'application/vnd.apple.mpegurl',
      // SmoothStreaming
      'application/vnd.ms-sstr+xml'
    ]
    const testExtensions = {
      // DASH
      'mpd': 'application/dash+xml',
      // HLS
      'm3u8': 'application/x-mpegurl',
      // SmoothStreaming
      'ism': 'application/vnd.ms-sstr+xml'
    }

    for (const type of testMimeTypes) {
      // Only query our parsers for MSE-enabled platforms.  Otherwise, query a
      // temporary media element for native support for these types.
      if (Platform.supportsMediaSource()) {
        support[type] = !!ManifestParser.parsersByMime[type]
      } else {
        support[type] = Platform.supportsMediaType(type)
      }
    }

    for (const extension in testExtensions) {
      // Only query our parsers for MSE-enabled platforms.  Otherwise, query a
      // temporary media element for native support for these MIME type for the
      // extension.
      if (Platform.supportsMediaSource()) {
        support[extension] = !!ManifestParser.parsersByExtension[extension]
      } else {
        const type = testExtensions[extension]
        support[extension] = Platform.supportsMediaType(type)
      }
    }

    return support
  }
  /* *
   * Get a factory that can create a manifest parser that should be able to
   * parse the manifest at |uri|.
   *
   * @param {string} uri
   * @param {!NetworkingEngine} netEngine
   * @param {shaka.extern.RetryParameters} retryParams
   * @param {?string} mimeType
   * @return {!Promise.<shaka.extern.ManifestParser.Factory>}
   */
  static async getFactory(uri, netEngine, retryParams, mimeType) {
    const ManifestParser = ManifestParser

    // Try using the MIME type we were given.
    if (mimeType) {
      const factory = ManifestParser.parsersByMime[mimeType.toLowerCase()]
      if (factory) {
        return factory
      }

      console.warning(
        'Could not determine manifest type using MIME type ', mimeType)
    }

    const extension = ManifestParser.getExtension(uri)
    if (extension) {
      const factory = ManifestParser.parsersByExtension[extension]
      if (factory) {
        return factory
      }

      console.warning(
        'Could not determine manifest type for extension ', extension)
    } else {
      console.warning('Could not find extension for ', uri)
    }

    if (!mimeType) {
      mimeType = await ManifestParser.getMimeType(uri, netEngine, retryParams)

      if (mimeType) {
        const factory = ManifestParser.parsersByMime[mimeType]
        if (factory) {
          return factory
        }

        console.warning('Could not determine manifest type using MIME type',
          mimeType)
      }
    }

    throw new Error$1(
      Error$1.Severity.CRITICAL,
      Error$1.Category.MANIFEST,
      Error$1.Code.UNABLE_TO_GUESS_MANIFEST_TYPE,
      uri)
  }
  /* *
   * @param {string} uri
   * @param {!NetworkingEngine} netEngine
   * @param {shaka.extern.RetryParameters} retryParams
   * @return {!Promise.<string>}
   */
  static async getMimeType(uri, netEngine, retryParams) {
    const type = NetworkingEngine.RequestType.MANIFEST

    const request = NetworkingEngine.makeRequest([uri], retryParams)
    request.method = 'HEAD'

    const response = await netEngine.request(type, request).promise

    // https://bit.ly/2K9s9kf says this header should always be available,
    // but just to be safe:
    const mimeType = response.headers['content-type']
    return mimeType ? mimeType.toLowerCase().split(';').shift() : ''
  }
  /* *
   * @param {string} uri
   * @return {string}
   */
  static getExtension(uri) {
    const uriObj = new Uri(uri)
    const uriPieces = uriObj.getPath().split('/')
    const uriFilename = uriPieces.pop()
    const filenamePieces = uriFilename.split('.')

    // Only one piece means there is no extension.
    if (filenamePieces.length === 1) {
      return ''
    }

    return filenamePieces.pop().toLowerCase()
  }
  /* *
   * Determines whether or not this URI and MIME type are supported by our own
   * manifest parsers on this platform.  This takes into account whether or not
   * MediaSource is available, as well as which parsers are registered to the
   * system.
   *
   * @param {string} uri
   * @param {string} mimeType
   * @return {boolean}
   */
  static isSupported(uri, mimeType) {
    // Without MediaSource, our own parsers are useless.
    if (!Platform.supportsMediaSource()) {
      return false
    }

    if (mimeType in ManifestParser.parsersByMime) {
      return true
    }

    const extension = ManifestParser.getExtension(uri)
    if (extension in ManifestParser.parsersByExtension) {
      return true
    }

    return false
  }
}
/* *
 * Contains the parser factory functions indexed by MIME type.
 *
 * @type {!Object.<string, shaka.extern.ManifestParser.Factory>}
 */
ManifestParser.parsersByMime = {}
/* *
 * Contains the parser factory functions indexed by file extension.
 *
 * @type {!Object.<string, shaka.extern.ManifestParser.Factory>}
 */
ManifestParser.parsersByExtension = {}

// import IReleasable from '../util/i_releasable'

/* *
 * The region timeline is a set of unique timeline region info entries. When
 * a new entry is added, the |onAddRegion| callback will be called.
 *
 * @implements {IReleasable}
 * @final
 */
class RegionTimeline {
  constructor() {
    /* * @private {function(shaka.extern.TimelineRegionInfo)} */
    this.onAddRegion_ = (region) => {}
    /* * @private {!Set.<shaka.extern.TimelineRegionInfo>} */
    this.regions_ = new Set()
  }

  /* * @override */
  release() {
    // Prevent us from holding onto any external references via the callback.
    this.onAddRegion_ = (region) => {}
    this.regions_.clear()
  }

  /* *
   * Set the callbacks for events. This will override any previous calls to
   * |setListeners|.
   *
   * @param {function(shaka.extern.TimelineRegionInfo)} onAddRegion
   *    Set the callback for when we add a new region. This callback will only
   *    be called when a region is unique (we reject duplicate regions).
   */
  setListeners(onAddRegion) {
    this.onAddRegion_ = onAddRegion
  }

  /* *
   * @param {shaka.extern.TimelineRegionInfo} region
   */
  addRegion(region) {
    const similarRegion = this.findSimilarRegion_(region)

    // Make sure we don't add duplicate regions. We keep track of this here
    // instead of making the parser track it.
    if (similarRegion === null) {
      this.regions_.add(region)
      this.onAddRegion_(region)
    }
  }

  /* *
   * Find a region in the timeline that has the same scheme id uri, event id,
   * start time and end time. If these four parameters match, we assume it
   * to be the same region. If no similar region can be found, |null| will be
   * returned.
   *
   * @param {shaka.extern.TimelineRegionInfo} region
   * @return {?shaka.extern.TimelineRegionInfo}
   * @private
   */
  findSimilarRegion_(region) {
    for (const existing of this.regions_) {
      // The same scheme ID and time range means that it is similar-enough to
      // be the same region.
      const isSimilar = existing.schemeIdUri === region.schemeIdUri &&
                        existing.id === region.id &&
                        existing.startTime === region.startTime &&
                        existing.endTime === region.endTime

      if (isSimilar) {
        return existing
      }
    }

    return null
  }

  /* *
   * Get an iterable for all the regions in the timeline. This will allow
   * others to see what regions are in the timeline while not being able to
   * change the collection.
   *
   * @return {!Iterable.<shaka.extern.TimelineRegionInfo>}
   */
  regions() {
    return this.regions_
  }
}

// import StallDetector from './stall_detector'

/* *
 * GapJumpingController handles jumping gaps that appear within the content.
 * This will only jump gaps between two buffered ranges, so we should not have
 * to worry about the availability
 *
 * @implements {IReleasable}
 */
class GapJumpingController {
  /* *
   * @param {!HTMLMediaElement} video
   * @param {!PresentationTimeline} timeline
   * @param {shaka.extern.StreamingConfiguration} config
   * @param {StallDetector} stallDetector
   *   The stall detector is used to keep the playhead moving while in a
   *   playable region. The gap jumping controller takes ownership over the
   *   stall detector.
   *   If no stall detection logic is desired, |null| may be provided.
   * @param {function(!Event)} onEvent Called when an event is raised to be sent
   *   to the application.
   */
  constructor(video, timeline, config, stallDetector, onEvent) {
    /* * @private {HTMLMediaElement} */
    this.video_ = video

    /* * @private {?PresentationTimeline} */
    this.timeline_ = timeline

    /* * @private {?shaka.extern.StreamingConfiguration} */
    this.config_ = config

    /* * @private {?function(!Event)} */
    this.onEvent_ = onEvent

    /* * @private {EventManager} */
    this.eventManager_ = new EventManager()

    /* * @private {boolean} */
    this.seekingEventReceived_ = false

    /* * @private {number} */
    this.prevReadyState_ = video.readyState

    /* * @private {boolean} */
    this.didFireLargeGap_ = false

    /* *
     * The stall detector tries to keep the playhead moving forward. It is
     * managed by the gap-jumping controller to avoid conflicts. On some
     * platforms, the stall detector is not wanted, so it may be null.
     *
     * @private {StallDetector}
     */
    this.stallDetector_ = stallDetector

    /* * @private {boolean} */
    this.hadSegmentAppended_ = false

    this.eventManager_.listen(video, 'waiting', () => this.onPollGapJump_())

    /* *
     * We can't trust |readyState| or 'waiting' events on all platforms. To make
     * up for this, we poll the current time. If we think we are in a gap, jump
     * out of it.
     *
     * See: https://bit.ly/2McuXxm and https://bit.ly/2K5xmJO
     *
     * @private {?Timer}
     */
    this.gapJumpTimer_ = new Timer(() => {
      this.onPollGapJump_()
    }).tickEvery(/*  seconds= */ 0.25)
  }
  /* * @override */
  release() {
    if (this.eventManager_) {
      this.eventManager_.release()
      this.eventManager_ = null
    }

    if (this.gapJumpTimer_ !== null) {
      this.gapJumpTimer_.stop()
      this.gapJumpTimer_ = null
    }

    if (this.stallDetector_) {
      this.stallDetector_.release()
      this.stallDetector_ = null
    }

    this.onEvent_ = null
    this.timeline_ = null
    this.video_ = null
  }
  /* *
   * Called when a segment is appended by StreamingEngine, but not when a clear
   * is pending. This means StreamingEngine will continue buffering forward from
   * what is buffered.  So we know about any gaps before the start.
   */
  onSegmentAppended() {
    this.hadSegmentAppended_ = true
    this.onPollGapJump_()
  }
  /* * Called when a seek has started. */
  onSeeking() {
    this.seekingEventReceived_ = true
    this.hadSegmentAppended_ = false
    this.didFireLargeGap_ = false
  }
  /* *
   * Called on a recurring timer to check for gaps in the media.  This is also
   * called in a 'waiting' event.
   *
   * @private
   */
  onPollGapJump_() {
    // Don't gap jump before the video is ready to play.
    if (this.video_.readyState === 0) {
      return
    }
    // Do not gap jump if seeking has begun, but the seeking event has not
    // yet fired for this particular seek.
    if (this.video_.seeking) {
      if (!this.seekingEventReceived_) {
        return
      }
    } else {
      this.seekingEventReceived_ = false
    }
    // Don't gap jump while paused, so that you don't constantly jump ahead
    // while paused on a livestream.
    if (this.video_.paused) {
      return
    }
    // When the ready state changes, we have moved on, so we should fire the
    // large gap event if we see one.
    if (this.video_.readyState !== this.prevReadyState_) {
      this.didFireLargeGap_ = false
      this.prevReadyState_ = this.video_.readyState
    }

    const smallGapLimit = this.config_.smallGapLimit
    const currentTime = this.video_.currentTime
    const buffered = this.video_.buffered

    const gapIndex =
        TimeRangesUtils.getGapIndex(buffered, currentTime)

    // The current time is unbuffered or is too far from a gap.
    if (gapIndex === null) {
      if (this.stallDetector_) {
        this.stallDetector_.poll()
      }

      return
    }

    // If we are before the first buffered range, this could be an unbuffered
    // seek.  So wait until a segment is appended so we are sure it is a gap.
    if (gapIndex === 0 && !this.hadSegmentAppended_) {
      return
    }

    // StreamingEngine can buffer past the seek end, but still don't allow
    // seeking past it.
    const jumpTo = buffered.start(gapIndex)
    const seekEnd = this.timeline_.getSeekRangeEnd()
    if (jumpTo >= seekEnd) {
      return
    }

    const jumpSize = jumpTo - currentTime
    const isGapSmall = jumpSize <= smallGapLimit
    let jumpLargeGap = false

    // If we jump to exactly the gap start, we may detect a small gap due to
    // rounding errors or browser bugs.  We can ignore these extremely small
    // gaps since the browser should play through them for us.
    if (jumpSize < GapJumpingController.BROWSER_GAP_TOLERANCE) {
      return
    }

    if (!isGapSmall && !this.didFireLargeGap_) {
      this.didFireLargeGap_ = true

      // Event firing is synchronous.
      const event = new FakeEvent(
        'largegap', { 'currentTime': currentTime, 'gapSize': jumpSize })
      event.cancelable = true
      this.onEvent_(event)

      if (this.config_.jumpLargeGaps && !event.defaultPrevented) {
        jumpLargeGap = true
      } else {
        console.info('Ignoring large gap at', currentTime, 'size', jumpSize)
      }
    }

    if (isGapSmall || jumpLargeGap) {
      if (gapIndex === 0) {
        console.info(
          'Jumping forward', jumpSize,
          'seconds because of gap before start time of', jumpTo)
      } else {
        console.info(
          'Jumping forward', jumpSize, 'seconds because of gap starting at',
          buffered.end(gapIndex - 1), 'and ending at', jumpTo)
      }

      this.video_.currentTime = jumpTo
    }
  }
}
/* *
 * The limit, in seconds, for the gap size that we will assume the browser will
 * handle for us.
 * @const
 */
GapJumpingController.BROWSER_GAP_TOLERANCE = 0.001

/* *
 * Creates a new VideoWrapper that manages setting current time and playback
 * rate.  This handles seeks before content is loaded and ensuring the video
 * time is set properly.  This doesn't handle repositioning within the
 * presentation
 *
 * @implements {IReleasable}
 */
class VideoWrapper {
  /* *
   * @param {!HTMLMediaElement} video
   * @param {function()} onSeek Called when the video seeks.
   * @param {number} startTime The time to start at.
   */
  constructor(video, onSeek, startTime) {
    /* * @private {HTMLMediaElement} */
    this.video_ = video

    /* * @private {function()} */
    this.onSeek_ = onSeek

    /* * @private {number} */
    this.startTime_ = startTime

    /* * @private {boolean} */
    this.started_ = false

    /* * @private {EventManager} */
    this.eventManager_ = new EventManager()

    /* * @private {PlayheadMover} */
    this.mover_ = new PlayheadMover(
      /*  mediaElement= */ video,
      /*  maxAttempts= */ 10)

    // Before we can set the start time, we must check if the video element is
    // ready. If the video element is not ready, we cannot set the time. To work
    // around this, we will wait for the 'loadedmetadata' event which tells us
    // that the media element is now ready.
    if (video.readyState > 0) {
      this.setStartTime_(startTime)
    } else {
      this.delaySetStartTime_(startTime)
    }
  }
  /* * @override */
  release() {
    if (this.eventManager_) {
      this.eventManager_.release()
      this.eventManager_ = null
    }

    if (this.mover_ != null) {
      this.mover_.release()
      this.mover_ = null
    }

    this.onSeek_ = () => {}
    this.video_ = null
  }
  /* *
   * Gets the video's current (logical) position.
   *
   * @return {number}
   */
  getTime() {
    return this.started_ ? this.video_.currentTime : this.startTime_
  }
  /* *
   * Sets the current time of the video.
   *
   * @param {number} time
   */
  setTime(time) {
    if (this.video_.readyState > 0) {
      this.mover_.moveTo(time)
    } else {
      this.delaySetStartTime_(time)
    }
  }

  /* *
   * If the media element is not ready, we can't set |currentTime|. To work
   * around this we will listen for the 'loadedmetadata' event so that we can
   * set the start time once the element is ready.
   *
   * @param {number} startTime
   * @private
   */
  delaySetStartTime_(startTime) {
    const readyEvent = 'loadedmetadata'

    // Since we are going to override what the start time should be, we need to
    // save it so that |getTime| can return the most accurate start time
    // possible.
    this.startTime_ = startTime

    // The media element is not ready to accept changes to current time. We need
    // to cache them and then execute them once the media element is ready.
    this.eventManager_.unlisten(this.video_, readyEvent)

    this.eventManager_.listenOnce(this.video_, readyEvent, () => {
      this.setStartTime_(startTime)
    })
  }
  /* *
   * Set the start time for the content. The given start time will be ignored if
   * the content does not start at 0.
   *
   * @param {number} startTime
   * @private
   */
  setStartTime_(startTime) {
    // If we start close enough to our intended start time, then we won't do
    // anything special.
    if (Math.abs(this.video_.currentTime - startTime) < 0.001) {
      this.startListeningToSeeks_()
      return
    }

    // We will need to delay adding our normal seeking listener until we have
    // seen the first seek event. We will force the first seek event later in
    // this method.
    this.eventManager_.listenOnce(this.video_, 'seeking', () => {
      this.startListeningToSeeks_()
    })

    // If the currentTime != 0, it indicates that the user has seeked after
    // calling |Player.load|, meaning that |currentTime| is more meaningful than
    // |startTime|.
    //
    // Seeking to the current time is a work around for Issue 1298. If we don't
    // do this, the video may get stuck and not play.
    //
    // TODO: Need further investigation why it happens. Before and after
    // setting the current time, video.readyState is 1, video.paused is true,
    // and video.buffered's TimeRanges length is 0.
    // See: https://github.com/google/shaka-player/issues/1298
    this.mover_.moveTo(
      this.video_.currentTime === 0
        ? startTime
        : this.video_.currentTime)
  }
  /* *
   * Add the listener for seek-events. This will call the externally-provided
   * |onSeek| callback whenever the media element seeks.
   *
   * @private
   */
  startListeningToSeeks_() {
    console.assert(
      this.video_.readyState > 0,
      'The media element should be ready before we listen for seeking.')

    // Now that any startup seeking is complete, we can trust the video element
    // for currentTime.
    this.started_ = true

    this.eventManager_.listen(this.video_, 'seeking', () => this.onSeek_())
  }
}

/* *
 * A class used to move the playhead away from its current time.  Sometimes, IE
 * and Edge ignore re-seeks. After changing the current time, check every 100ms,
 * retrying if the change was not accepted.
 *
 * Delay stats over 100 runs of a re-seeking integration test:
 *   IE     -   0ms -  47%
 *   IE     - 100ms -  63%
 *   Edge   -   0ms -   2%
 *   Edge   - 100ms -  40%
 *   Edge   - 200ms -  32%
 *   Edge   - 300ms -  24%
 *   Edge   - 400ms -   2%
 *   Chrome -   0ms - 100%
 *
 * TODO: File a bug on IE/Edge about this.
 *
 * @implements {IReleasable}
 * @final
 */
class PlayheadMover {
  /* *
   * @param {!HTMLMediaElement} mediaElement
   *    The media element that the mover can manipulate.
   *
   * @param {number} maxAttempts
   *    To prevent us from infinitely trying to change the current time, the
   *    mover accepts a max attempts value. At most, the mover will check if the
   *    video moved |maxAttempts| times. If this is zero of negative, no
   *    attempts will be made.
   */
  constructor(mediaElement, maxAttempts) {
    /* * @private {HTMLMediaElement} */
    this.mediaElement_ = mediaElement

    /* * @private {number} */
    this.maxAttempts_ = maxAttempts

    /* * @private {number} */
    this.remainingAttempts_ = 0

    /* * @private {number} */
    this.originTime_ = 0

    /* * @private {number} */
    this.targetTime_ = 0

    /* * @private {Timer} */
    this.timer_ = new Timer(() => this.onTick_())
  }

  /* * @override */
  release() {
    if (this.timer_) {
      this.timer_.stop()
      this.timer_ = null
    }

    this.mediaElement_ = null
  }

  /* *
   * Try forcing the media element to move to |timeInSeconds|. If a previous
   * call to |moveTo| is still in progress, this will override it.
   *
   * @param {number} timeInSeconds
   */
  moveTo(timeInSeconds) {
    this.originTime_ = this.mediaElement_.currentTime
    this.targetTime_ = timeInSeconds

    this.remainingAttempts_ = this.maxAttempts_

    // Set the time and then start the timer. The timer will check if the set
    // was successful, and retry if not.
    this.mediaElement_.currentTime = timeInSeconds
    this.timer_.tickEvery(/*  seconds= */ 0.1)
  }

  /* *
   * @private
   */
  onTick_() {
    // Sigh... We ran out of retries...
    if (this.remainingAttempts_ <= 0) {
      console.warning([
        'Failed to move playhead from', this.originTime_,
        'to', this.targetTime_
      ].join(' '))

      this.timer_.stop()
      return
    }

    // Yay! We were successful.
    if (this.mediaElement_.currentTime !== this.originTime_) {
      this.timer_.stop()
      return
    }

    // Sigh... Try again...
    this.mediaElement_.currentTime = this.targetTime_
    this.remainingAttempts_--
  }
}

/* *
 * Some platforms/browsers can get stuck in the middle of a buffered range (e.g.
 * when seeking in a background tab). Detect when we get stuck so that the
 * player can respond.
 *
 * @implements {IReleasable}
 * @final
 */
class StallDetector {
  /* *
   * @param {StallDetector.Implementation} implementation
   * @param {number} stallThresholdSeconds
   */
  constructor(implementation, stallThresholdSeconds) {
    /* * @private {StallDetector.Implementation} */
    this.implementation_ = implementation

    /* * @private {boolean} */
    this.wasMakingProgress_ = implementation.shouldBeMakingProgress()
    /* * @private {number} */
    this.value_ = implementation.getPresentationSeconds()
    /* * @private {number} */
    this.lastUpdateSeconds_ = implementation.getWallSeconds()
    /* * @private {boolean} */
    this.didJump_ = false

    /* *
     * The amount of time in seconds that we must have the same value of
     * |value_| before we declare it as a stall.
     *
     * @private {number}
     */
    this.stallThresholdSeconds_ = stallThresholdSeconds

    /* * @private {function(number, number)} */
    this.onStall_ = () => {}
  }

  /* * @override */
  release() {
    // Drop external references to make things easier on the GC.
    this.implementation_ = null
    this.onStall_ = () => {}
  }

  /* *
   * Set the callback that should be called when a stall is detected. Calling
   * this will override any previous calls to |onStall|.
   *
   * @param {function(number, number)} doThis
   */
  onStall(doThis) {
    this.onStall_ = doThis
  }

  /* *
   * Have the detector update itself and fire the 'on stall' callback if a stall
   * was detected.
   */
  poll() {
    const impl = this.implementation_

    const shouldBeMakingProgress = impl.shouldBeMakingProgress()
    const value = impl.getPresentationSeconds()
    const wallTimeSeconds = impl.getWallSeconds()

    const acceptUpdate = this.value_ !== value ||
                         this.wasMakingProgress_ !== shouldBeMakingProgress

    if (acceptUpdate) {
      this.lastUpdateSeconds_ = wallTimeSeconds
      this.value_ = value
      this.wasMakingProgress_ = shouldBeMakingProgress
      this.didJump_ = false
    }

    const stallSeconds = wallTimeSeconds - this.lastUpdateSeconds_

    const triggerCallback = stallSeconds >= this.stallThresholdSeconds_ &&
                            shouldBeMakingProgress && !this.didJump_

    if (triggerCallback) {
      this.onStall_(this.value_, stallSeconds)
      this.didJump_ = true
      // If the onStall_ method updated the current time, update our stored
      // value so we don't think that was an update.
      this.value_ = impl.getPresentationSeconds()
    }
  }
}

/* *
 * A playhead implementation that only relies on the media element.
 *
 * @implements {Playhead}
 * @final
 */
class SrcEqualsPlayhead {
  /* *
   * @param {!HTMLMediaElement} mediaElement
   */
  constructor(mediaElement) {
    /* * @private {HTMLMediaElement} */
    this.mediaElement_ = mediaElement
    /* * @private {boolean} */
    this.started_ = false
    /* * @private {?number} */
    this.startTime_ = null

    /* * @private {EventManager} */
    this.eventManager_ = new EventManager()

    // We listen for the loaded-metadata-event so that we know when we can
    // interact with |currentTime|.
    const onLoaded = () => {
      if (this.startTime_ === null) {
        this.started_ = true
      } else {
        // Startup is complete only when the video element acknowledges the
        // seek.
        this.eventManager_.listenOnce(this.mediaElement_, 'seeking', () => {
          this.started_ = true
        })
        const currentTime = this.mediaElement_.currentTime
        // Using the currentTime allows using a negative number in Live HLS
        const newTime = Math.max(0, currentTime + this.startTime_)
        this.mediaElement_.currentTime = newTime
      }
    }
    if (this.mediaElement_.readyState === 0) {
      this.eventManager_.listenOnce(
        this.mediaElement_, 'loadeddata', onLoaded)
    } else {
      // It's already loaded.
      onLoaded()
    }
  }

  /* * @override */
  release() {
    if (this.eventManager_) {
      this.eventManager_.release()
      this.eventManager_ = null
    }

    this.mediaElement_ = null
  }

  /* * @override */
  setStartTime(startTime) {
    // If we have already started playback, ignore updates to the start time.
    // This is just to make things consistent.
    this.startTime_ = this.started_ ? this.startTime_ : startTime
  }

  /* * @override */
  getTime() {
    // If we have not started playback yet, return the start time. However once
    // we start playback we assume that we can always return the current time.
    const time = this.started_
      ? this.mediaElement_.currentTime
      : this.startTime_

    // In the case that we have not started playback, but the start time was
    // never set, we don't know what the start time should be. To ensure we
    // always return a number, we will default back to 0.
    return time || 0
  }

  /* * @override */
  notifyOfBufferingChange() {}
}
/* *
 * A playhead implementation that relies on the media element and a manifest.
 * When provided with a manifest, we can provide more accurate control than
 * the SrcEqualsPlayhead.
 *
 * TODO: Clean up and simplify Playhead.  There are too many layers of, methods
 *       for, and conditions on timestamp adjustment.
 *
 * @implements {Playhead}
 * @final
 */
class MediaSourcePlayhead {
  /* *
   * @param {!HTMLMediaElement} mediaElement
   * @param {shaka.extern.Manifest} manifest
   * @param {shaka.extern.StreamingConfiguration} config
   * @param {?number} startTime
   *     The playhead's initial position in seconds. If null, defaults to the
   *     start of the presentation for VOD and the live-edge for live.
   * @param {function()} onSeek
   *     Called when the user agent seeks to a time within the presentation
   *     timeline.
   * @param {function(!Event)} onEvent
   *     Called when an event is raised to be sent to the application.
   */
  constructor(mediaElement, manifest, config, startTime, onSeek, onEvent) {
    /* *
     * The seek range must be at least this number of seconds long. If it is
     * smaller than this, change it to be this big so we don't repeatedly seek
     * to keep within a zero-width
     *
     * This is 3s long, to account for the weaker hardware on platforms like
     * Chromecast.
     *
     * @private {number}
     */
    this.minSeekRange_ = 3.0

    /* * @private {HTMLMediaElement} */
    this.mediaElement_ = mediaElement

    /* * @private {PresentationTimeline} */
    this.timeline_ = manifest.presentationTimeline

    /* * @private {number} */
    this.minBufferTime_ = manifest.minBufferTime || 0

    /* * @private {?shaka.extern.StreamingConfiguration} */
    this.config_ = config

    /* * @private {function()} */
    this.onSeek_ = onSeek

    /* * @private {?number} */
    this.lastCorrectiveSeek_ = null

    /* * @private {GapJumpingController} */
    this.gapController_ = new GapJumpingController(
      mediaElement,
      manifest.presentationTimeline,
      config,
      this.createStallDetector_(mediaElement, config),
      onEvent)

    /* * @private {VideoWrapper} */
    this.videoWrapper_ = new VideoWrapper(
      mediaElement,
      () => this.onSeeking_(),
      this.getStartTime_(startTime))

    /* * @type {Timer} */
    this.checkWindowTimer_ = new Timer(() => {
      this.onPollWindow_()
    }).tickEvery(/*  seconds= */ 0.25)
  }

  /* * @override */
  release() {
    if (this.videoWrapper_) {
      this.videoWrapper_.release()
      this.videoWrapper_ = null
    }

    if (this.gapController_) {
      this.gapController_.release()
      this.gapController_ = null
    }

    if (this.checkWindowTimer_) {
      this.checkWindowTimer_.stop()
      this.checkWindowTimer_ = null
    }

    this.config_ = null
    this.timeline_ = null
    this.videoWrapper_ = null
    this.mediaElement_ = null

    this.onSeek_ = () => {}
  }

  /* * @override */
  setStartTime(startTime) {
    this.videoWrapper_.setTime(startTime)
  }

  /* * @override */
  getTime() {
    const time = this.videoWrapper_.getTime()

    // Although we restrict the video's currentTime elsewhere, clamp it here to
    // ensure timing issues don't cause us to return a time outside the segment
    // availability   E.g., the user agent seeks and calls this function
    // before we receive the 'seeking' event.
    //
    // We don't buffer when the livestream video is paused and the playhead time
    // is out of the seek range; thus, we do not clamp the current time when the
    // video is paused.
    // https://github.com/google/shaka-player/issues/1121
    if (this.mediaElement_.readyState > 0 && !this.mediaElement_.paused) {
      return this.clampTime_(time)
    }

    return time
  }

  /* *
   * Gets the playhead's initial position in seconds.
   *
   * @param {?number} startTime
   * @return {number}
   * @private
   */
  getStartTime_(startTime) {
    if (startTime === null) {
      if (this.timeline_.getDuration() < Infinity) {
        // If the presentation is VOD, or if the presentation is live but has
        // finished broadcasting, then start from the beginning.
        startTime = this.timeline_.getSeekRangeStart()
      } else {
        // Otherwise, start near the live-edge.
        startTime = this.timeline_.getSeekRangeEnd()
      }
    } else if (startTime < 0) {
      // For live streams, if the startTime is negative, start from a certain
      // offset time from the live edge.  If the offset from the live edge is
      // not available, start from the current available segment start point
      // instead, handled by clampTime_().
      startTime = this.timeline_.getSeekRangeEnd() + startTime
    }

    return this.clampSeekToDuration_(this.clampTime_(startTime))
  }

  /* * @override */
  notifyOfBufferingChange() {
    this.gapController_.onSegmentAppended()
  }

  /* *
   * Called on a recurring timer to keep the playhead from falling outside the
   * availability
   *
   * @private
   */
  onPollWindow_() {
    // Don't catch up to the seek range when we are paused or empty.
    // The definition of 'seeking' says that we are seeking until the buffered
    // data intersects with the playhead.  If we fall outside of the seek range,
    // it doesn't matter if we are in a 'seeking' state.  We can and should go
    // ahead and catch up while seeking.
    if (this.mediaElement_.readyState === 0 || this.mediaElement_.paused) {
      return
    }

    const currentTime = this.mediaElement_.currentTime
    let seekStart = this.timeline_.getSeekRangeStart()
    const seekEnd = this.timeline_.getSeekRangeEnd()

    if (seekEnd - seekStart < this.minSeekRange_) {
      seekStart = seekEnd - this.minSeekRange_
    }

    if (currentTime < seekStart) {
      // The seek range has moved past the playhead.  Move ahead to catch up.
      const targetTime = this.reposition_(currentTime)
      console.info('Jumping forward ' + (targetTime - currentTime) +
                     ' seconds to catch up with the seek range.')
      this.mediaElement_.currentTime = targetTime
    }
  }

  /* *
   * Handles when a seek happens on the video.
   *
   * @private
   */
  onSeeking_() {
    this.gapController_.onSeeking()
    const currentTime = this.videoWrapper_.getTime()
    const targetTime = this.reposition_(currentTime)

    const gapLimit = GapJumpingController.BROWSER_GAP_TOLERANCE
    if (Math.abs(targetTime - currentTime) > gapLimit) {
      // You can only seek like this every so often. This is to prevent an
      // infinite loop on systems where changing currentTime takes a significant
      // amount of time (e.g. Chromecast).
      const time = new Date().getTime() / 1000
      if (!this.lastCorrectiveSeek_ || this.lastCorrectiveSeek_ < time - 1) {
        this.lastCorrectiveSeek_ = time
        this.videoWrapper_.setTime(targetTime)
        return
      }
    }

    console.info('Seek to ' + currentTime)
    this.onSeek_()
  }

  /* *
   * Clamp seek times and playback start times so that we never seek to the
   * presentation duration.  Seeking to or starting at duration does not work
   * consistently across browsers.
   *
   * @see https://github.com/google/shaka-player/issues/979
   * @param {number} time
   * @return {number} The adjusted seek time.
   * @private
   */
  clampSeekToDuration_(time) {
    const duration = this.timeline_.getDuration()
    if (time >= duration) {
      console.assert(this.config_.durationBackoff >= 0,
        'Duration backoff must be non-negative!')
      return duration - this.config_.durationBackoff
    }
    return time
  }

  /* *
   * Computes a new playhead position that's within the presentation timeline.
   *
   * @param {number} currentTime
   * @return {number} The time to reposition the playhead to.
   * @private
   */
  reposition_(currentTime) {
    console.assert(
      this.config_,
      'Cannot reposition playhead when it has beeen destroyed')

    /* * @type {function(number)} */
    const isBuffered = (playheadTime) => TimeRangesUtils.isBuffered(
      this.mediaElement_.buffered, playheadTime)

    const rebufferingGoal = Math.max(
      this.minBufferTime_,
      this.config_.rebufferingGoal)

    const safeSeekOffset = this.config_.safeSeekOffset

    let start = this.timeline_.getSeekRangeStart()
    const end = this.timeline_.getSeekRangeEnd()
    const duration = this.timeline_.getDuration()

    if (end - start < this.minSeekRange_) {
      start = end - this.minSeekRange_
    }

    // With live content, the beginning of the availability window is moving
    // forward.  This means we cannot seek to it since we will 'fall' outside
    // the window while we buffer.  So we define a 'safe' region that is far
    // enough away.  For VOD, |safe === start|.
    const safe = this.timeline_.getSafeSeekRangeStart(rebufferingGoal)

    // These are the times to seek to rather than the exact destinations.  When
    // we seek, we will get another event (after a slight delay) and these steps
    // will run again.  So if we seeked directly to |start|, |start| would move
    // on the next call and we would loop forever.
    const seekStart = this.timeline_.getSafeSeekRangeStart(safeSeekOffset)
    const seekSafe = this.timeline_.getSafeSeekRangeStart(
      rebufferingGoal + safeSeekOffset)

    if (currentTime >= duration) {
      console.info('Playhead past duration.')
      return this.clampSeekToDuration_(currentTime)
    }

    if (currentTime > end) {
      console.info('Playhead past end.')
      return end
    }

    if (currentTime < start) {
      if (isBuffered(seekStart)) {
        console.info('Playhead before start & start is buffered')
        return seekStart
      } else {
        console.info('Playhead before start & start is unbuffered')
        return seekSafe
      }
    }

    if (currentTime >= safe || isBuffered(currentTime)) {
      console.info('Playhead in safe region or in buffered region.')
      return currentTime
    } else {
      console.info('Playhead outside safe region & in unbuffered region.')
      return seekSafe
    }
  }

  /* *
   * Clamps the given time to the seek range.
   *
   * @param {number} time The time in seconds.
   * @return {number} The clamped time in seconds.
   * @private
   */
  clampTime_(time) {
    const start = this.timeline_.getSeekRangeStart()
    if (time < start) {
      return start
    }

    const end = this.timeline_.getSeekRangeEnd()
    if (time > end) {
      return end
    }

    return time
  }

  /* *
   * Create and configure a stall detector using the player's streaming
   * configuration settings. If the player is configured to have no stall
   * detector, this will return |null|.
   *
   * @param {!HTMLMediaElement} mediaElement
   * @param {shaka.extern.StreamingConfiguration} config
   * @return {StallDetector}
   * @private
   */
  createStallDetector_(mediaElement, config) {
    if (!config.stallEnabled) {
      return null
    }

    // Cache the values from the config so that changes to the config won't
    // change the initialized behaviour.
    const threshold = config.stallThreshold
    const skip = config.stallSkip

    // When we see a stall, we will try to 'jump-start' playback by moving the
    // playhead forward.
    const detector = new StallDetector(
      new StallDetector.MediaElementImplementation(mediaElement),
      threshold)

    detector.onStall((at, duration) => {
      console.debug([
        'Stall detected at', at, 'for', duration, 'seconds. Seeking forward',
        skip, 'seconds.'
      ].join(' '))

      mediaElement.currentTime += skip
    })

    return detector
  }
}

// import IReleasable from '../util/i_releasable'

/* *
 * The play rate controller controls the playback rate on the media element.
 * This provides some missing functionality (e.g. negative playback rate). If
 * the playback rate on the media element can change outside of the controller,
 * the playback controller will need to be updated to stay in-sync.
 *
 * TODO: Try not to manage buffering above the browser with playbackRate=0.
 *
 * @implements {IReleasable}
 * @final
 */
class PlayRateController {
  /* *
   * @param {PlayRateController.Harness} harness
   */
  constructor(harness) {
    /* * @private {?PlayRateController.Harness} */
    this.harness_ = harness

    /* * @private {boolean} */
    this.isBuffering_ = false

    /* * @private {number} */
    this.rate_ = this.harness_.getRate()

    /* * @private {number} */
    this.pollRate_ = 0.25

    /* * @private {Timer} */
    this.timer_ = new Timer(() => {
      this.harness_.movePlayhead(this.rate_ * this.pollRate_)
    })
  }

  /* * @override */
  release() {
    if (this.timer_) {
      this.timer_.stop()
      this.timer_ = null
    }

    this.harness_ = null
  }

  /* *
   * Sets the buffering flag, which controls the effective playback rate.
   *
   * @param {boolean} isBuffering If true, forces playback rate to 0 internally.
   */
  setBuffering(isBuffering) {
    this.isBuffering_ = isBuffering
    this.apply_()
  }

  /* *
   * Set the playback rate. This rate will only be used as provided when the
   * player is not buffering. You should never set the rate to 0.
   *
   * @param {number} rate
   */
  set(rate) {
    console.assert(rate !== 0, 'Should never set rate of 0 explicitly!')
    this.rate_ = rate
    this.apply_()
  }

  /* *
   * Get the rate that the user will experience. This means that if we are using
   * trick play, this will report the trick play rate. If we are buffering, this
   * will report zero. If playback is occurring as normal, this will report 1.
   *
   * @return {number}
   */
  getActiveRate() {
    return this.calculateCurrentRate_()
  }
  /* *
   * Get the real rate of the playback. This means that if we are using trick
   * play, this will report the trick play rate. If playback is occurring as
   * normal, this will report 1.
   *
   * @return {number}
   */
  getRealRate() {
    return this.rate_
  }

  /* *
   * Reapply the effects of |this.rate_| and |this.active_| to the media
   * element. This will only update the rate via the harness if the desired rate
   * has changed.
   *
   * @private
   */
  apply_() {
    // Always stop the timer. We may not start it again.
    this.timer_.stop()

    /* * @type {number} */
    const rate = this.calculateCurrentRate_()

    console.info('Changing effective playback rate to', rate)

    if (rate >= 0) {
      try {
        this.applyRate_(rate)
        return
      } catch (e) {
        // Fall through to the next clause.
        //
        // Fast forward is accomplished through setting video.playbackRate.
        // If the play rate value is not supported by the browser (too big),
        // the browsers will throw.
        // Use this as a cue to fall back to fast forward through repeated
        // seeking, which is what we do for rewind as well.
      }
    }

    // When moving backwards or forwards in large steps,
    // set the playback rate to 0 so that we can manually
    // seek backwards with out fighting the playhead.
    this.timer_.tickEvery(this.pollRate_)
    this.applyRate_(0)
  }

  /* *
   * Calculate the rate that the controller wants the media element to have
   * based on the current state of the controller.
   *
   * @return {number}
   * @private
   */
  calculateCurrentRate_() {
    return this.isBuffering_ ? 0 : this.rate_
  }

  /* *
   * If the new rate is different than the media element's playback rate, this
   * will change the playback rate. If the rate does not need to change, it will
   * not be set. This will avoid unnecessary ratechange events.
   *
   * @param {number} newRate
   * @return {boolean}
   * @private
   */
  applyRate_(newRate) {
    const oldRate = this.harness_.getRate()

    if (oldRate !== newRate) {
      this.harness_.setRate(newRate)
    }

    return oldRate !== newRate
  }
}

/* *
 * This is a collection of period-focused utility methods.
 *
 * @final
 */
class Periods {
  /* *
   * Get all the variants across all periods.
   *
   * @param {!Iterable.<shaka.extern.Period>} periods
   * @return {!Array.<shaka.extern.Variant>}
   */
  static getAllVariantsFrom(periods) {
    const found = []

    for (const period of periods) {
      for (const variant of period.variants) {
        found.push(variant)
      }
    }

    return found
  }

  /* *
   * Find our best guess at which period contains the given time. If
   * |timeInSeconds| starts before the first period, then |null| will be
   * returned.
   *
   * @param {!Iterable.<shaka.extern.Period>} periods
   * @param {number} timeInSeconds
   * @return {?shaka.extern.Period}
   */
  static findPeriodForTime(periods, timeInSeconds) {
    let bestGuess = null

    // Go period-by-period and see if the period started before our current
    // time. If so, we could be in that period. Since periods are supposed to be
    // in order by start time, we can allow later periods to override our best
    // guess.
    for (const period of periods) {
      if (timeInSeconds >= period.startTime) {
        bestGuess = period
      }
    }

    return bestGuess
  }
}

// import IPlayheadObserver from './playhead_observer'

/* *
 * The period observer keeps track of which period we are in and calls the
 * |onPeriodChange| callback whenever we change periods.
 *
 * @implements {IPlayheadObserver}
 * @final
 */
class PeriodObserver {
  /* *
   * The period observer needs an always-up-to-date collection of periods,
   * and right now the only way to have that is to reference the manifest.
   *
   * @param {shaka.extern.Manifest} manifest
   */
  constructor(manifest) {
    /* * @private {?shaka.extern.Manifest} */
    this.manifest_ = manifest

    /* *
     * This will be which period we think the playhead is currently in. If it is
     * |null|, it means we don't know. We say 'we think' because this may become
     * out-of-date between updates.
     *
     * @private {?shaka.extern.Period}
     */
    this.currentPeriod_ = null

    /* *
     * The callback for when we change periods. To avoid null-checks, assign it
     * a no-op when there is no external callback assigned to it. When we move
     * into a new period, this callback will be called with the new period.
     *
     * @private {function(shaka.extern.Period)}
     */
    this.onChangedPeriods_ = (period) => {}
  }

  /* * @override */
  release() {
    // Break all internal references.
    this.manifest_ = null
    this.currentPeriod_ = null
    this.onChangedPeriods_ = (period) => {}
  }

  /* * @override */
  poll(positionInSeconds, wasSeeking) {
    // We detect changes in period by comparing where we think we are against
    // where we actually are.
    const expectedPeriod = this.currentPeriod_
    const actualPeriod = this.findCurrentPeriod_(positionInSeconds)
    if (expectedPeriod !== actualPeriod) {
      this.onChangedPeriods_(actualPeriod)
    }
    // Make sure we are up-to-date.
    this.currentPeriod_ = actualPeriod
  }

  /* *
   * Set all callbacks. This will override any previous calls to |setListeners|.
   *
   * @param {function(shaka.extern.Period)} onChangedPeriods
   *    The callback for when we move to a new period.
   */
  setListeners(onChangedPeriods) {
    this.onChangedPeriods_ = onChangedPeriods
  }

  /* *
   * Find which period we are most likely in based on the current manifest and
   * current time. The value here may be different than |this.currentPeriod_|,
   * if that is true, it means we changed periods since the last time we updated
   * |this.currentPeriod_|.
   *
   * @param {number} currentTimeSeconds
   * @return {shaka.extern.Period}
   * @private
   */
  findCurrentPeriod_(currentTimeSeconds) {
    const periods = this.manifest_.periods

    const found = Periods.findPeriodForTime(
      periods,
      currentTimeSeconds)

    // Fallback to periods[0] so that it can never be null. If we join a live
    // stream, periods[0].startTime may be non-zero. We can't guarantee that
    // video.currentTime will always be inside the seek range so it may be
    // possible to call findCurrentPeriod_(beforeFirstPeriod).
    return found || periods[0]
  }
}

// import RegionTimeline from './region_timeline'

/* *
 * The region observer watches a region timeline and playhead, and fires events
 * (onEnter, onExit, and onSkip) as the playhead moves.
 *
 * @implements {IPlayheadObserver}
 * @final
 */
class RegionObserver {
  /* *
   * Create a region observer for the given timeline. The observer does not
   * own the timeline, only uses it. This means that the observer should NOT
   * destroy the timeline.
   *
   * @param {!RegionTimeline} timeline
   */
  constructor(timeline) {
    /* * @private {RegionTimeline} */
    this.timeline_ = timeline

    /* *
     * A mapping between a region and where we previously were relative to it.
     * When the value here differs from what we calculate, it means we moved and
     * should fire an event.
     *
     * @private {!Map.<shaka.extern.TimelineRegionInfo,
     *                 RegionObserver.RelativePosition_>}
     */
    this.oldPosition_ = new Map()

    /* * @private {RegionObserver.EventListener} */
    this.onEnter_ = (region, seeking) => {}
    /* * @private {RegionObserver.EventListener} */
    this.onExit_ = (region, seeking) => {}
    /* * @private {RegionObserver.EventListener} */
    this.onSkip_ = (region, seeking) => {}

    // To make the rules easier to read, alias all the relative positions.
    const RelativePosition = RegionObserver.RelativePosition_
    const BEFORE_THE_REGION = RelativePosition.BEFORE_THE_REGION
    const IN_THE_REGION = RelativePosition.IN_THE_REGION
    const AFTER_THE_REGION = RelativePosition.AFTER_THE_REGION

    /* *
     * A read-only collection of rules for what to do when we change position
     * relative to a region.
     *
     * @private {!Iterable.<RegionObserver.Rule_>}
     */
    this.rules_ = [
      {
        weWere: null,
        weAre: IN_THE_REGION,
        invoke: (region, seeking) => this.onEnter_(region, seeking)
      },
      {
        weWere: BEFORE_THE_REGION,
        weAre: IN_THE_REGION,
        invoke: (region, seeking) => this.onEnter_(region, seeking)
      },
      {
        weWere: AFTER_THE_REGION,
        weAre: IN_THE_REGION,
        invoke: (region, seeking) => this.onEnter_(region, seeking)
      },
      {
        weWere: IN_THE_REGION,
        weAre: BEFORE_THE_REGION,
        invoke: (region, seeking) => this.onExit_(region, seeking)
      },
      {
        weWere: IN_THE_REGION,
        weAre: AFTER_THE_REGION,
        invoke: (region, seeking) => this.onExit_(region, seeking)
      },
      {
        weWere: BEFORE_THE_REGION,
        weAre: AFTER_THE_REGION,
        invoke: (region, seeking) => this.onSkip_(region, seeking)
      },
      {
        weWere: AFTER_THE_REGION,
        weAre: BEFORE_THE_REGION,
        invoke: (region, seeking) => this.onSkip_(region, seeking)
      }
    ]
  }

  /* * @override */
  release() {
    this.timeline_ = null

    // Clear our maps so that we are not holding onto any more information than
    // needed.
    this.oldPosition_.clear()

    // Clear the callbacks so that we don't hold onto any references external
    // to this class.
    this.onEnter_ = (region, seeking) => {}
    this.onExit_ = (region, seeking) => {}
    this.onSkip_ = (region, seeking) => {}
  }

  /* * @override */
  poll(positionInSeconds, wasSeeking) {
    const RegionObserver = RegionObserver

    for (const region of this.timeline_.regions()) {
      const previousPosition = this.oldPosition_.get(region)
      const currentPosition = RegionObserver.determinePositionRelativeTo_(
        region, positionInSeconds)

      // We will only use |previousPosition| and |currentPosition|, so we can
      // update our state now.
      this.oldPosition_.set(region, currentPosition)

      for (const rule of this.rules_) {
        if (rule.weWere === previousPosition && rule.weAre === currentPosition) {
          rule.invoke(region, wasSeeking)
        }
      }
    }
  }

  /* *
   * Set all the listeners. This overrides any previous calls to |setListeners|.
   *
   * @param {RegionObserver.EventListener} onEnter
   *    The callback for when we move from outside a region to inside a region.
   * @param {RegionObserver.EventListener} onExit
   *    The callback for when we move from inside a region to outside a region.
   * @param {RegionObserver.EventListener} onSkip
   *    The callback for when we move from before to after a region or from
   *    after to before a region.
   */
  setListeners(onEnter, onExit, onSkip) {
    this.onEnter_ = onEnter
    this.onExit_ = onExit
    this.onSkip_ = onSkip
  }

  /* *
   * Get the relative position of the playhead to |region| when the playhead is
   * at |seconds|. We treat the region's start and end times as inclusive
   * bounds.
   *
   * @param {shaka.extern.TimelineRegionInfo} region
   * @param {number} seconds
   * @return {RegionObserver.RelativePosition_}
   * @private
   */
  static determinePositionRelativeTo_(region, seconds) {
    const RelativePosition = RegionObserver.RelativePosition_

    if (seconds < region.startTime) {
      return RelativePosition.BEFORE_THE_REGION
    }

    if (seconds > region.endTime) {
      return RelativePosition.AFTER_THE_REGION
    }

    return RelativePosition.IN_THE_REGION
  }
}

/* *
 * An enum of relative positions between the playhead and a region. Each is
 * phrased so that it works in 'The playhead is X' where 'X' is any value in
 * the enum.
 *
 * @enum {number}
 * @private
 */
RegionObserver.RelativePosition_ = {
  BEFORE_THE_REGION: 1,
  IN_THE_REGION: 2,
  AFTER_THE_REGION: 3
}

// import IReleasable from '../util/i_releasable'
/* *
 * The playhead observer manager is responsible for owning playhead observer
 * instances and polling them when needed. Destroying the manager will destroy
 * all observers managed by the manager.
 *
 * @implements {IReleasable}
 * @final
 */
class PlayheadObserverManager {
  /* *
   * @param {!HTMLMediaElement} mediaElement
   */
  constructor(mediaElement) {
    /* * @private {HTMLMediaElement} */
    this.mediaElement_ = mediaElement

    /* *
     * The set of all observers that this manager is responsible for updating.
     * We are using a set to ensure that we don't double update an observer if
     * it is accidentally added twice.
     *
     * @private {!Set.<IPlayheadObserver>}
     */
    this.observers_ = new Set()

    /* *
     * To fire events semi-accurately, poll the observers 4 times a second. This
     * should be frequent enough to trigger an event close enough to its actual
     * occurrence without the user noticing a delay.
     *
     * @private {Timer}
     */
    this.pollingLoop_ = new Timer(() => {
      this.pollAllObservers_(/*  seeking= */ false)
    }).tickEvery(/*  seconds= */ 0.25)
  }

  /* * @override */
  release() {
    // We need to stop the loop or else we may try to use a released resource.
    this.pollingLoop_.stop()

    for (const observer of this.observers_) {
      observer.release()
    }

    this.observers_.clear()
  }

  /* *
   * Have the playhead observer manager manage a new observer. This will ensure
   * that observers are only tracked once within the manager. After this call,
   * the manager will be responsible for the life cycle of |observer|.
   *
   * @param {!IPlayheadObserver} observer
   */
  manage(observer) {
    this.observers_.add(observer)
  }

  /* *
   * Notify all the observers that we just seeked.
   */
  notifyOfSeek() {
    this.pollAllObservers_(/*  seeking= */ true)
  }

  /* *
   * @param {boolean} seeking
   * @private
   */
  pollAllObservers_(seeking) {
    for (const observer of this.observers_) {
      observer.poll(
        this.mediaElement_.currentTime,
        seeking)
    }
  }
}

/* *
  * @summary DataViewReader abstracts a DataView object.
  * @export
  */
class DataViewReader {
  /* *
   * @param {BufferSource} data
   * @param {DataViewReader.Endianness} endianness The endianness.
   */
  constructor(data, endianness) {
    /* * @private {!DataView} */
    this.dataView_ = BufferUtils.toDataView(data)

    /* * @private {boolean} */
    this.littleEndian_ =
        endianness === DataViewReader.Endianness.LITTLE_ENDIAN

    /* * @private {number} */
    this.position_ = 0
  }
  /* * @return {!DataView} The underlying DataView instance. */
  getDataView() {
    return this.dataView_
  }
  /* *
   * @return {boolean} True if the reader has more data, false otherwise.
   * @export
   */
  hasMoreData() {
    return this.position_ < this.dataView_.byteLength
  }
  /* *
   * Gets the current byte position.
   * @return {number}
   * @export
   */
  getPosition() {
    return this.position_
  }
  /* *
   * Gets the byte length of the DataView.
   * @return {number}
   * @export
   */
  getLength() {
    return this.dataView_.byteLength
  }
  /* *
   * Reads an unsigned 8 bit integer, and advances the reader.
   * @return {number} The integer.
   * @export
   */
  readUint8() {
    try {
      const value = this.dataView_.getUint8(this.position_)
      this.position_ += 1
      return value
    } catch (exception) {
      throw this.outOfBounds_()
    }
  }
  /* *
   * Reads an unsigned 16 bit integer, and advances the reader.
   * @return {number} The integer.
   * @export
   */
  readUint16() {
    try {
      const value =
          this.dataView_.getUint16(this.position_, this.littleEndian_)
      this.position_ += 2
      return value
    } catch (exception) {
      throw this.outOfBounds_()
    }
  }
  /* *
   * Reads an unsigned 32 bit integer, and advances the reader.
   * @return {number} The integer.
   * @export
   */
  readUint32() {
    try {
      const value =
          this.dataView_.getUint32(this.position_, this.littleEndian_)
      this.position_ += 4
      return value
    } catch (exception) {
      throw this.outOfBounds_()
    }
  }
  /* *
   * Reads a signed 32 bit integer, and advances the reader.
   * @return {number} The integer.
   * @export
   */
  readInt32() {
    try {
      const value = this.dataView_.getInt32(this.position_, this.littleEndian_)
      this.position_ += 4
      return value
    } catch (exception) {
      throw this.outOfBounds_()
    }
  }
  /* *
   * Reads an unsigned 64 bit integer, and advances the reader.
   * @return {number} The integer.
   * @export
   */
  readUint64() {
    /* * @type {number} */
    let low
    /* * @type {number} */
    let high

    try {
      if (this.littleEndian_) {
        low = this.dataView_.getUint32(this.position_, true)
        high = this.dataView_.getUint32(this.position_ + 4, true)
      } else {
        high = this.dataView_.getUint32(this.position_, false)
        low = this.dataView_.getUint32(this.position_ + 4, false)
      }
    } catch (exception) {
      throw this.outOfBounds_()
    }

    if (high > 0x1FFFFF) {
      throw new Error$1(
        Error$1.Severity.CRITICAL,
        Error$1.Category.MEDIA,
        Error$1.Code.JS_INTEGER_OVERFLOW)
    }

    this.position_ += 8

    // NOTE: This is subtle, but in JavaScript you can't shift left by 32
    // and get the full range of 53-bit values possible.
    // You must multiply by 2^32.
    return (high * Math.pow(2, 32)) + low
  }
  /* *
   * Reads the specified number of raw bytes.
   * @param {number} bytes The number of bytes to read.
   * @return {!Uint8Array}
   * @export
   */
  readBytes(bytes) {
    console.assert(bytes >= 0, 'Bad call to DataViewReader.readBytes')
    if (this.position_ + bytes > this.dataView_.byteLength) {
      throw this.outOfBounds_()
    }

    const value =
        BufferUtils.toUint8(this.dataView_, this.position_, bytes)
    this.position_ += bytes
    return value
  }
  /* *
   * Skips the specified number of bytes.
   * @param {number} bytes The number of bytes to skip.
   * @export
   */
  skip(bytes) {
    console.assert(bytes >= 0, 'Bad call to DataViewReader.skip')
    if (this.position_ + bytes > this.dataView_.byteLength) {
      throw this.outOfBounds_()
    }
    this.position_ += bytes
  }
  /* *
   * Rewinds the specified number of bytes.
   * @param {number} bytes The number of bytes to rewind.
   * @export
   */
  rewind(bytes) {
    console.assert(bytes >= 0, 'Bad call to DataViewReader.rewind')
    if (this.position_ < bytes) {
      throw this.outOfBounds_()
    }
    this.position_ -= bytes
  }
  /* *
   * Seeks to a specified position.
   * @param {number} position The desired byte position within the DataView.
   * @export
   */
  seek(position) {
    console.assert(position >= 0, 'Bad call to DataViewReader.seek')
    if (position < 0 || position > this.dataView_.byteLength) {
      throw this.outOfBounds_()
    }
    this.position_ = position
  }
  /* *
   * Keeps reading until it reaches a byte that equals to zero.  The text is
   * assumed to be UTF-8.
   * @return {string}
   * @export
   */
  readTerminatedString() {
    const start = this.position_
    while (this.hasMoreData()) {
      const value = this.dataView_.getUint8(this.position_)
      if (value === 0) {
        break
      }
      this.position_ += 1
    }

    const ret = BufferUtils.toUint8(
      this.dataView_, start, this.position_ - start)
    // Skip string termination.
    this.position_ += 1
    return StringUtils.fromUTF8(ret)
  }
  /* *
   * @return {!Error}
   * @private
   */
  outOfBounds_() {
    return new Error$1(
      Error$1.Severity.CRITICAL,
      Error$1.Category.MEDIA,
      Error$1.Code.BUFFER_READ_OUT_OF_BOUNDS)
  }
}

/* *
 * Endianness.
 * @enum {number}
 * @export
 */
DataViewReader.Endianness = {
  BIG_ENDIAN: 0,
  LITTLE_ENDIAN: 1
}

/* *
 * @export
 */
class Mp4Parser {
  constructor() {
    /* * @private {!Object.<number, Mp4Parser.BoxType_>} */
    this.headers_ = []

    /* * @private {!Object.<number, !Mp4Parser.CallbackType>} */
    this.boxDefinitions_ = []

    /* * @private {boolean} */
    this.done_ = false
  }
  /* *
   * Declare a box type as a Box.
   *
   * @param {string} type
   * @param {!Mp4Parser.CallbackType} definition
   * @return {!Mp4Parser}
   * @export
   */
  box(type, definition) {
    const typeCode = Mp4Parser.typeFromString_(type)
    this.headers_[typeCode] = Mp4Parser.BoxType_.BASIC_BOX
    this.boxDefinitions_[typeCode] = definition
    return this
  }
  /* *
   * Declare a box type as a Full Box.
   *
   * @param {string} type
   * @param {!Mp4Parser.CallbackType} definition
   * @return {!Mp4Parser}
   * @export
   */
  fullBox(type, definition) {
    const typeCode = Mp4Parser.typeFromString_(type)
    this.headers_[typeCode] = Mp4Parser.BoxType_.FULL_BOX
    this.boxDefinitions_[typeCode] = definition
    return this
  }
  /* *
   * Stop parsing.  Useful for extracting information from partial segments and
   * avoiding an out-of-bounds error once you find what you are looking for.
   *
   * @export
   */
  stop() {
    this.done_ = true
  }
  /* *
   * Parse the given data using the added callbacks.
   *
   * @param {!BufferSource} data
   * @param {boolean=} partialOkay If true, allow reading partial payloads
   *   from some boxes. If the goal is a child box, we can sometimes find it
   *   without enough data to find all child boxes.
   * @export
   */
  parse(data, partialOkay) {
    const reader = new DataViewReader(
      data, DataViewReader.Endianness.BIG_ENDIAN)

    this.done_ = false
    while (reader.hasMoreData() && !this.done_) {
      this.parseNext(0, reader, partialOkay)
    }
  }
  /* *
   * Parse the next box on the current level.
   *
   * @param {number} absStart The absolute start position in the original
   *   byte array.
   * @param {!DataViewReader} reader
   * @param {boolean=} partialOkay If true, allow reading partial payloads
   *   from some boxes. If the goal is a child box, we can sometimes find it
   *   without enough data to find all child boxes.
   * @export
   */
  parseNext(absStart, reader, partialOkay) {
    const start = reader.getPosition()

    let size = reader.readUint32()
    const type = reader.readUint32()
    const name = Mp4Parser.typeToString(type)
    console.info('Parsing MP4 box', name)

    switch (size) {
      case 0:
        size = reader.getLength() - start
        break
      case 1:
        size = reader.readUint64()
        break
    }

    const boxDefinition = this.boxDefinitions_[type]

    if (boxDefinition) {
      let version = null
      let flags = null

      if (this.headers_[type] === Mp4Parser.BoxType_.FULL_BOX) {
        const versionAndFlags = reader.readUint32()
        version = versionAndFlags >>> 24
        flags = versionAndFlags & 0xFFFFFF
      }

      // Read the whole payload so that the current level can be safely read
      // regardless of how the payload is parsed.
      let end = start + size
      if (partialOkay && end > reader.getLength()) {
        // For partial reads, truncate the payload if we must.
        end = reader.getLength()
      }
      const payloadSize = end - reader.getPosition()
      const payload =
      (payloadSize > 0) ? reader.readBytes(payloadSize) : new Uint8Array(0)

      const payloadReader = new DataViewReader(
        payload, DataViewReader.Endianness.BIG_ENDIAN)

      /* * @type {shaka.extern.ParsedBox} */
      const box = {
        parser: this,
        partialOkay: partialOkay || false,
        version: version,
        flags: flags,
        reader: payloadReader,
        size: size,
        start: start + absStart
      }

      boxDefinition(box)
    } else {
      // Move the read head to be at the end of the box.
      // If the box is longer than the remaining parts of the file, e.g. the
      // mp4 is improperly formatted, or this was a partial range request that
      // ended in the middle of a box, just skip to the end.
      const skipLength = Math.min(
        start + size - reader.getPosition(),
        reader.getLength() - reader.getPosition())
      reader.skip(skipLength)
    }
  }
  /* *
   * A callback that tells the Mp4 parser to treat the body of a box as a series
   * of boxes. The number of boxes is limited by the size of the parent box.
   *
   * @param {!shaka.extern.ParsedBox} box
   * @export
   */
  static children(box) {
    // The 'reader' starts at the payload, so we need to add the header to the
    // start position.  This is either 8 or 12 bytes depending on whether this
    // is a full box.
    const header = box.flags != null ? 12 : 8
    while (box.reader.hasMoreData() && !box.parser.done_) {
      box.parser.parseNext(box.start + header, box.reader, box.partialOkay)
    }
  }
  /* *
   * A callback that tells the Mp4 parser to treat the body of a box as a sample
   * description. A sample description box has a fixed number of children. The
   * number of children is represented by a 4 byte unsigned integer. Each child
   * is a box.
   *
   * @param {!shaka.extern.ParsedBox} box
   * @export
   */
  static sampleDescription(box) {
    // The 'reader' starts at the payload, so we need to add the header to the
    // start position.  This is either 8 or 12 bytes depending on whether this
    // is a full box.
    const header = box.flags != null ? 12 : 8
    const count = box.reader.readUint32()
    for (const _ of Iterables.range(count)) {
      Functional.ignored(_)
      box.parser.parseNext(box.start + header, box.reader, box.partialOkay)
      if (box.parser.done_) {
        break
      }
    }
  }
  /* *
   * Create a callback that tells the Mp4 parser to treat the body of a box as a
   * binary blob and to parse the body's contents using the provided callback.
   *
   * @param {function(!Uint8Array)} callback
   * @return {!Mp4Parser.CallbackType}
   * @export
   */
  static allData(callback) {
    return (box) => {
      const all = box.reader.getLength() - box.reader.getPosition()
      callback(box.reader.readBytes(all))
    }
  }
  /* *
   * Convert an ascii string name to the integer type for a box.
   *
   * @param {string} name The name of the box. The name must be four
   *                      characters long.
   * @return {number}
   * @private
   */
  static typeFromString_(name) {
    console.assert(
      name.length === 4,
      'Mp4 box names must be 4 characters long')

    let code = 0
    for (const chr of name) {
      code = (code << 8) | chr.charCodeAt(0)
    }
    return code
  }
  /* *
   * Convert an integer type from a box into an ascii string name.
   * Useful for debugging.
   *
   * @param {number} type The type of the box, a uint32.
   * @return {string}
   * @export
   */
  static typeToString(type) {
    const name = String.fromCharCode(
      (type >> 24) & 0xff,
      (type >> 16) & 0xff,
      (type >> 8) & 0xff,
      type & 0xff)
    return name
  }
}
/* *
 * An enum used to track the type of box so that the correct values can be
 * read from the header.
 *
 * @enum {number}
 * @private
 */
Mp4Parser.BoxType_ = {
  BASIC_BOX: 0,
  FULL_BOX: 1
}

/* *
 * A collection of shared utilities that bridge the gap between our networking
 * code and the other parts of our code base. This is to allow
 * |NetworkingEngine| to remain general.
 *
 * @final
 */
class Networking {
  /* *
   * Create a request message for a segment. Providing |start| and |end|
   * will set the byte range. A non-zero start must be provided for |end| to
   * be used.
   *
   * @param {!Array.<string>} uris
   * @param {?number} start
   * @param {?number} end
   * @param {shaka.extern.RetryParameters} retryParameters
   * @return {shaka.extern.Request}
   */
  static createSegmentRequest(uris, start, end, retryParameters) {
    const request = NetworkingEngine.makeRequest(
      uris, retryParameters)

    if (start === 0 && end === null) ; else {
      if (end) {
        request.headers['Range'] = 'bytes=' + start + '-' + end
      } else {
        request.headers['Range'] = 'bytes=' + start + '-'
      }
    }

    return request
  }
}

var conf = {
  EventName: {
    AbrStatusChanged: 'abrstatuschanged',
    Adaptation: 'adaptation',
    Buffering: 'buffering',
    Emsg: 'emsg',
    Error: 'error',
    ExpirationUpdated: 'expirationupdated',
    LargeGap: 'largegap',
    Loaded: 'loaded',
    Loading: 'loading',
    ManifestParsed: 'manifestparsed',
    OnStateChange: 'onstatechange',
    OnStateIdle: 'onstateidle',
    RateChange: 'ratechange',
    Streaming: 'streaming',
    TextChanged: 'textchanged',
    TextTrackVisibility: 'texttrackvisibility',
    TimelineRegionAdded: 'timelineregionadded',
    TimelineRegionEnter: 'timelineregionenter',
    TimelineRegionExit: 'timelineregionexit',
    TracksChanged: 'trackschanged',
    Unloading: 'unloading',
    VariantChanged: 'variantchanged'
  }
}

// import MediaSourceEngine from './media_source_engine'

/* *
 * @summary Creates a Streaming Engine.
 * The StreamingEngine is responsible for setting up the Manifest's Streams
 * (i.e., for calling each Stream's createSegmentIndex() function), for
 * downloading segments, for co-ordinating audio, video, and text buffering,
 * and for handling Period transitions. The StreamingEngine provides an
 * interface to switch between Streams, but it does not choose which Streams to
 * switch to.
 *
 * The StreamingEngine notifies its owner when it needs to buffer a new Period,
 * so its owner can choose which Streams within that Period to initially
 * buffer. Moreover, the StreamingEngine also notifies its owner when any
 * Stream within the current Period may be switched to, so its owner can switch
 * bitrates, resolutions, or languages.
 *
 * The StreamingEngine does not need to be notified about changes to the
 * Manifest's SegmentIndexes; however, it does need to be notified when new
 * Periods are added to the Manifest, so it can set up that Period's Streams.
 *
 * To start the StreamingEngine the owner must first call configure() followed
 * by init(). The StreamingEngine will then call onChooseStreams(p) when it
 * needs to buffer Period p; it will then switch to the Streams returned from
 * that function. The StreamingEngine will call onCanSwitch() when any
 * Stream within the current Period may be switched to.
 *
 * The owner must call seeked() each time the playhead moves to a new location
 * within the presentation timeline; however, the owner may forego calling
 * seeked() when the playhead moves outside the presentation timeline.
 *
 * @implements {IDestroyable}
 */
class StreamingEngine {
  /* *
   * @param {shaka.extern.Manifest} manifest
   * @param {StreamingEngine.PlayerInterface} playerInterface
   */
  constructor(manifest, playerInterface) {
    /* * @private {?StreamingEngine.PlayerInterface} */
    this.playerInterface_ = playerInterface

    /* * @private {?shaka.extern.Manifest} */
    this.manifest_ = manifest

    /* * @private {?shaka.extern.StreamingConfiguration} */
    this.config_ = null

    /* * @private {number} */
    this.bufferingGoalScale_ = 1

    /* *
     * Maps a content type, e.g., 'audio', 'video', or 'text', to a MediaState.
     *
     * @private {!Map.<ManifestParserUtils.ContentType,
                         !StreamingEngine.MediaState_>}
     */
    this.mediaStates_ = new Map()

    /* *
     * Set to true once one segment of each content type has been buffered.
     *
     * @private {boolean}
     */
    this.startupComplete_ = false

    /* *
     * Used for delay and backoff of failure callbacks, so that apps do not
     * retry instantly.
     *
     * @private {Backoff}
     */
    this.failureCallbackBackoff_ = null

    /* *
     * Set to true on fatal error.  Interrupts fetchAndAppend_().
     *
     * @private {boolean}
     */
    this.fatalError_ = false

    /* *
     * Set to true when a request to unload text stream comes in. This is used
     * since loading new text stream is async, the request of unloading text
     * stream might come in before setting up new text stream is finished.
     * @private {boolean}
     */
    this.unloadingTextStream_ = false

    /* * @private {number} */
    this.textStreamSequenceId_ = 0

    /* * @private {!Destroyer} */
    this.destroyer_ = new Destroyer(() => this.doDestroy_())
  }

  /* * @override */
  destroy() {
    return this.destroyer_.destroy()
  }

  /* *
   * @return {!Promise}
   * @private
   */
  doDestroy_() {
    for (const state of this.mediaStates_.values()) {
      this.cancelUpdate_(state)
    }

    this.mediaStates_.clear()

    this.playerInterface_ = null
    this.manifest_ = null
    this.config_ = null

    return Promise.resolve()
  }

  /* *
   * Called by the Player to provide an updated configuration any time it
   * changes. Must be called at least once before init().
   *
   * @param {shaka.extern.StreamingConfiguration} config
   */
  configure(config) {
    this.config_ = config

    // Create separate parameters for backoff during streaming failure.

    /* * @type {shaka.extern.RetryParameters} */
    const failureRetryParams = {
      // The term 'attempts' includes the initial attempt, plus all retries.
      // In order to see a delay, there would have to be at least 2 attempts.
      maxAttempts: Math.max(config.retryParameters.maxAttempts, 2),
      baseDelay: config.retryParameters.baseDelay,
      backoffFactor: config.retryParameters.backoffFactor,
      fuzzFactor: config.retryParameters.fuzzFactor,
      timeout: 0 // irrelevant
    }

    // We don't want to ever run out of attempts.  The application should be
    // allowed to retry streaming infinitely if it wishes.
    const autoReset = true
    this.failureCallbackBackoff_ =
        new Backoff(failureRetryParams, autoReset)
  }
  /* *
   * Initialize and start streaming.
   *
   * By calling this method, streaming engine will choose the initial streams by
   * calling out to |onChooseStreams| followed by |onCanSwitch|. When streaming
   * engine switches periods, it will call |onChooseStreams| followed by
   * |onCanSwitch|.
   *
   * Asking streaming engine to switch streams between |onChooseStreams| and
   * |onChangeSwitch| is not supported.
   *
   * After the StreamingEngine calls onChooseStreams(p) for the first time, it
   * will begin setting up the Streams returned from that function and
   * subsequently switch to them. However, the StreamingEngine will not begin
   * setting up any other Streams until at least one segment from each of the
   * initial set of Streams has been buffered (this reduces startup latency).
   *
   * After the StreamingEngine completes this startup phase it will begin
   * setting up each Period's Streams (while buffering in parrallel).
   *
   * When the StreamingEngine needs to buffer the next Period it will have
   * already set up that Period's Streams. So, when the StreamingEngine calls
   * onChooseStreams(p) after the first time, the StreamingEngine will
   * immediately switch to the Streams returned from that function.
   *
   * @return {!Promise}
   */
  async start() {
    console.assert(this.config_,
      'StreamingEngine configure() must be called before init()!')

    // Determine which Period we must buffer.
    const presentationTime = this.playerInterface_.getPresentationTime()
    const needPeriodIndex = this.findPeriodForTime_(presentationTime)

    // Get the initial set of Streams.
    const initialStreams = this.playerInterface_.onChooseStreams(
      this.manifest_.periods[needPeriodIndex])
    if (!initialStreams.variant && !initialStreams.text) {
      console.error('init: no Streams chosen')
      throw new Error$1(
        Error$1.Severity.CRITICAL,
        Error$1.Category.STREAMING,
        Error$1.Code.INVALID_STREAMS_CHOSEN)
    }

    // Setup the initial set of Streams and then begin each update cycle. After
    // startup completes onUpdate_() will set up the remaining Periods.
    await this.initStreams_(
      initialStreams.variant ? initialStreams.variant.audio : null,
      initialStreams.variant ? initialStreams.variant.video : null,
      initialStreams.text,
      presentationTime)
    this.destroyer_.ensureNotDestroyed()

    console.debug('init: completed initial Stream setup')

    // Subtlety: onInitialStreamsSetup() may call switch() or seeked(), so we
    // must schedule an update beforehand so |updateTimer| is set.
    if (this.playerInterface_ && this.playerInterface_.onInitialStreamsSetup) {
      console.info('init: calling onInitialStreamsSetup()...')
      this.playerInterface_.onInitialStreamsSetup()
    }
  }
  /* *
   * Gets the Period in which we are currently buffering.  This might be
   * different from the Period which contains the Playhead.
   * @return {?shaka.extern.Period}
   */
  getBufferingPeriod() {
    const ContentType = ManifestParserUtils.ContentType

    const video = this.mediaStates_.get(ContentType.VIDEO)
    if (video) {
      return this.manifest_.periods[video.needPeriodIndex]
    }

    const audio = this.mediaStates_.get(ContentType.AUDIO)
    if (audio) {
      return this.manifest_.periods[audio.needPeriodIndex]
    }

    return null
  }
  /* *
   * Get the audio stream which we are currently buffering.  Returns null if
   * there is no audio streaming.
   * @return {?shaka.extern.Stream}
   */
  getBufferingAudio() {
    const ContentType = ManifestParserUtils.ContentType
    return this.getStream_(ContentType.AUDIO)
  }
  /* *
   * Get the video stream which we are currently buffering.  Returns null if
   * there is no video streaming.
   * @return {?shaka.extern.Stream}
   */
  getBufferingVideo() {
    const ContentType = ManifestParserUtils.ContentType
    return this.getStream_(ContentType.VIDEO)
  }
  /* *
   * Get the text stream which we are currently buffering.  Returns null if
   * there is no text streaming.
   * @return {?shaka.extern.Stream}
   */
  getBufferingText() {
    const ContentType = ManifestParserUtils.ContentType
    return this.getStream_(ContentType.TEXT)
  }

  /* *
   * Get the stream of the given type which we are currently buffering.  Returns
   * null if there is no stream for the given type.
   * @param {ManifestParserUtils.ContentType} type
   * @return {?shaka.extern.Stream}
   * @private
  */
  getStream_(type) {
    const state = this.mediaStates_.get(type)

    if (state) {
      // Don't tell the caller about trick play streams.  If we're in trick
      // play, return the stream we will go back to after we exit trick play.
      return state.restoreStreamAfterTrickPlay || state.stream
    } else {
      return null
    }
  }

  /* *
   * Notifies StreamingEngine that a new text stream was added to the manifest.
   * This initializes the given stream. This returns a Promise that resolves
   * when the stream has been set up, and a media state has been created.
   *
   * @param {shaka.extern.Stream} stream
   * @return {!Promise}
   */
  async loadNewTextStream(stream) {
    const ContentType = ManifestParserUtils.ContentType

    // Clear MediaSource's buffered text, so that the new text stream will
    // properly replace the old buffered text.
    await this.playerInterface_.mediaSourceEngine.clear(ContentType.TEXT)

    // Since setupStreams_() is async, if the user hides/shows captions quickly,
    // there would be a race condition that a new text media state is created
    // but the old media state is not yet deleted.
    // The Sequence Id is to avoid that race condition.
    this.textStreamSequenceId_++
    this.unloadingTextStream_ = false
    const currentSequenceId = this.textStreamSequenceId_

    const mediaSourceEngine = this.playerInterface_.mediaSourceEngine

    const streamMap = new Map()
    const streamSet = new Set()

    streamMap.set(ContentType.TEXT, stream)
    streamSet.add(stream)

    await mediaSourceEngine.init(streamMap, /*  forceTansmuxTS= */ false)
    this.destroyer_.ensureNotDestroyed()

    const textDisplayer =
        this.playerInterface_.mediaSourceEngine.getTextDisplayer()

    const streamText =
        textDisplayer.isTextVisible() || this.config_.alwaysStreamText

    const presentationTime = this.playerInterface_.getPresentationTime()
    const needPeriodIndex = this.findPeriodForTime_(presentationTime)
    const state = this.createMediaState_(
      stream,
      needPeriodIndex,
      /*  resumeAt= */ 0)

    if ((this.textStreamSequenceId_ === currentSequenceId) &&
        !this.mediaStates_.has(ContentType.TEXT) &&
        !this.unloadingTextStream_ && streamText) {
      this.mediaStates_.set(ContentType.TEXT, state)
      this.scheduleUpdate_(state, 0)
    }
  }
  /* *
   * Stop fetching text stream when the user chooses to hide the captions.
   */
  unloadTextStream() {
    const ContentType = ManifestParserUtils.ContentType
    this.unloadingTextStream_ = true

    const state = this.mediaStates_.get(ContentType.TEXT)
    if (state) {
      this.cancelUpdate_(state)
      this.mediaStates_.delete(ContentType.TEXT)
    }
  }

  /* *
   * Set trick play on or off.
   * If trick play is on, related trick play streams will be used when possible.
   * @param {boolean} on
   */
  setTrickPlay(on) {
    const ContentType = ManifestParserUtils.ContentType

    const mediaState = this.mediaStates_.get(ContentType.VIDEO)
    if (!mediaState) {
      return
    }

    const stream = mediaState.stream
    if (!stream) {
      return
    }

    console.debug('setTrickPlay', on)
    if (on) {
      const trickModeVideo = stream.trickModeVideo
      if (!trickModeVideo) {
        return // Can't engage trick play.
      }

      const normalVideo = mediaState.restoreStreamAfterTrickPlay
      if (normalVideo) {
        return // Already in trick play.
      }

      console.debug('Engaging trick mode stream', trickModeVideo)
      this.switchInternal_(trickModeVideo, /*  clearBuffer= */ false,
        /*  safeMargin= */ 0, /*  force= */ false)

      mediaState.restoreStreamAfterTrickPlay = stream
    } else {
      const normalVideo = mediaState.restoreStreamAfterTrickPlay
      if (!normalVideo) {
        return
      }

      console.debug('Restoring non-trick-mode stream', normalVideo)
      mediaState.restoreStreamAfterTrickPlay = null
      this.switchInternal_(normalVideo, /*  clearBuffer= */ true,
        /*  safeMargin= */ 0, /*  force= */ false)
    }
  }
  /* *
   * @param {shaka.extern.Variant} variant
   * @param {boolean} clearBuffer
   * @param {number} safeMargin
   * @return {boolean} Whether we actually switched streams.
   */
  switchVariant(variant, clearBuffer, safeMargin) {
    let ret = false
    if (variant.video) {
      const changed = this.switchInternal_(
        variant.video, /*  clearBuffer= */ clearBuffer,
        /*  safeMargin= */ safeMargin, /*  force= */ false)
      ret = ret || changed
    }
    if (variant.audio) {
      const changed = this.switchInternal_(
        variant.audio, /*  clearBuffer= */ clearBuffer,
        /*  safeMargin= */ safeMargin, /*  force= */ false)
      ret = ret || changed
    }
    return ret
  }
  /* *
   * @param {shaka.extern.Stream} textStream
   * @return {boolean} Whether we actually switched streams.
   */
  switchTextStream(textStream) {
    const ContentType = ManifestParserUtils.ContentType
    console.assert(textStream && textStream.type === ContentType.TEXT,
      'Wrong stream type passed to switchTextStream!')
    return this.switchInternal_(
      textStream, /*  clearBuffer= */ true,
      /*  safeMargin= */ 0, /*  force= */ false)
  }
  /* * Reload the current text stream. */
  reloadTextStream() {
    const ContentType = ManifestParserUtils.ContentType
    const mediaState = this.mediaStates_.get(ContentType.TEXT)
    if (mediaState) { // Don't reload if there's no text to begin with.
      this.switchInternal_(
        mediaState.stream, /*  clearBuffer= */ true,
        /*  safeMargin= */ 0, /*  force= */ true)
    }
  }
  /* *
   * Switches to the given Stream. |stream| may be from any Variant or any
   * Period.
   *
   * @param {shaka.extern.Stream} stream
   * @param {boolean} clearBuffer
   * @param {number} safeMargin
   * @param {boolean} force
   *   If true, reload the text stream even if it did not change.
   * @return {boolean}
   * @private
   */
  switchInternal_(stream, clearBuffer, safeMargin, force) {
    const ContentType = ManifestParserUtils.ContentType
    const type = /* * @type {!ContentType} */(stream.type)
    const mediaState = this.mediaStates_.get(type)

    if (!mediaState && stream.type === ContentType.TEXT &&
        this.config_.ignoreTextStreamFailures) {
      this.loadNewTextStream(stream)
      return true
    }
    console.assert(mediaState, 'switch: expected mediaState to exist')
    if (!mediaState) {
      return false
    }

    // If we are selecting a stream from a different Period, then we need to
    // handle a Period transition. Simply ignore the given stream, assuming that
    // Player will select the same track in onChooseStreams.
    const periodIndex = this.findPeriodContainingStream_(stream)
    const mediaStates = Array.from(this.mediaStates_.values())
    const needSamePeriod = mediaStates.every((ms) => {
      return ms.needPeriodIndex === mediaState.needPeriodIndex
    })
    if (clearBuffer && periodIndex !== mediaState.needPeriodIndex &&
        needSamePeriod) {
      console.debug('switch: switching to stream in another Period; ' +
                      'clearing buffer and changing Periods')
      // handlePeriodTransition_ will be called on the next update because the
      // current Period won't match the playhead Period.
      for (const mediaState of this.mediaStates_.values()) {
        this.forceClearBuffer_(mediaState)
      }
      return true
    }

    if (mediaState.restoreStreamAfterTrickPlay) {
      console.debug('switch during trick play mode', stream)

      // Already in trick play mode, so stick with trick mode tracks if
      // possible.
      if (stream.trickModeVideo) {
        // Use the trick mode stream, but revert to the new selection later.
        mediaState.restoreStreamAfterTrickPlay = stream
        stream = stream.trickModeVideo
        console.debug('switch found trick play stream', stream)
      } else {
        // There is no special trick mode video for this stream!
        mediaState.restoreStreamAfterTrickPlay = null
        console.debug('switch found no special trick play stream')
      }
    }

    if (mediaState.stream === stream && !force) {
      const streamTag = StreamingEngine.logPrefix_(mediaState)
      console.debug('switch: Stream ' + streamTag + ' already active')
      return false
    }

    if (stream.type === ContentType.TEXT) {
      // Mime types are allowed to change for text streams.
      // Reinitialize the text parser, but only if we are going to fetch the
      // init segment again.
      const fullMimeType = MimeUtils.getFullType(
        stream.mimeType, stream.codecs)
      this.playerInterface_.mediaSourceEngine.reinitText(fullMimeType)
    }

    mediaState.stream = stream
    mediaState.needInitSegment = true

    const streamTag = StreamingEngine.logPrefix_(mediaState)
    console.debug('switch: switching to Stream ' + streamTag)

    if (clearBuffer) {
      if (mediaState.clearingBuffer) {
        // We are already going to clear the buffer, but make sure it is also
        // flushed.
        mediaState.waitingToFlushBuffer = true
      } else if (mediaState.performingUpdate) {
        // We are performing an update, so we have to wait until it's finished.
        // onUpdate_() will call clearBuffer_() when the update has finished.
        // We need to save the safe margin because its value will be needed when
        // clearing the buffer after the update.
        mediaState.waitingToClearBuffer = true
        mediaState.clearBufferSafeMargin = safeMargin
        mediaState.waitingToFlushBuffer = true
      } else {
        // Cancel the update timer, if any.
        this.cancelUpdate_(mediaState)
        // Clear right away.
        this.clearBuffer_(mediaState, /*  flush= */ true, safeMargin)
          .catch((error) => {
            if (this.playerInterface_) {
              this.playerInterface_.onError(error)
            }
          })
      }
    }

    this.makeAbortDecision_(mediaState).catch((error) => {
      if (this.playerInterface_) {
        this.playerInterface_.onError(error)
      }
    })
    return true
  }
  /* *
   * Decide if it makes sense to abort the current operation, and abort it if
   * so.
   *
   * @param {!StreamingEngine.MediaState_} mediaState
   * @private
   */
  async makeAbortDecision_(mediaState) {
    // If the operation is completed, it will be set to null, and there's no
    // need to abort the request.
    if (!mediaState.operation) {
      return
    }

    const originalStream = mediaState.stream
    const originalOperation = mediaState.operation

    if (!originalStream.segmentIndex) {
      await originalStream.createSegmentIndex()
    }

    if (mediaState.operation !== originalOperation) {
      // The original operation completed while we were getting a segment index,
      // so there's nothing to do now.
      return
    }

    if (mediaState.stream !== originalStream) {
      // The stream changed again while we were getting a segment index.  We
      // can't carry out this check, since another one might be in progress by
      // now.
      return
    }

    if (this.shouldAbortCurrentRequest_(mediaState)) {
      console.info('Aborting current segment request.')
      mediaState.operation.abort()
    }
  }

  /* *
   * Returns whether we should abort the current request.
   *
   * @param {!StreamingEngine.MediaState_} mediaState
   * @return {boolean}
   * @private
   */
  shouldAbortCurrentRequest_(mediaState) {
    console.assert(mediaState.operation,
      'Abort logic requires an ongoing operation!')

    const presentationTime = this.playerInterface_.getPresentationTime()
    const bufferEnd =
        this.playerInterface_.mediaSourceEngine.bufferEnd(mediaState.type)

    // The next segment to append from the current stream.  This doesn't
    // account for a pending network request and will likely be different from
    // that since we just switched.
    const newSegment = this.getSegmentReferenceNeeded_(
      mediaState, presentationTime, bufferEnd)
    let newSegmentSize = newSegment ? newSegment.getSize() : null
    if (newSegmentSize === null) {
      // compute approximate segment size using stream bandwidth
      const duration = newSegment.getEndTime() - newSegment.getStartTime()
      // bandwidth is in bits per second, and the size is in bytes
      newSegmentSize = duration * mediaState.stream.bandwidth / 8
    }

    if (isNaN(newSegmentSize)) {
      return false
    }

    // When switching, we'll need to download the init segment.
    const init = newSegment.initSegmentReference
    if (init) {
      newSegmentSize += init.getSize() || 0
    }

    const bandwidthEstimate = this.playerInterface_.getBandwidthEstimate()

    // The estimate is in bits per second, and the size is in bytes.  The time
    // remaining is in seconds after this calculation.
    const timeToFetchNewSegment = (newSegmentSize * 8) / bandwidthEstimate

    // If the new segment can be finished in time without risking a buffer
    // underflow, we should abort the old one and switch.
    const bufferedAhead = bufferEnd - presentationTime
    const safetyBuffer = Math.max(
      this.manifest_.minBufferTime || 0,
      this.config_.rebufferingGoal)
    const safeBufferedAhead = bufferedAhead - safetyBuffer
    if (timeToFetchNewSegment < safeBufferedAhead) {
      return true
    }

    // If the thing we want to switch to will be done more quickly than what
    // we've got in progress, we should abort the old one and switch.
    const bytesRemaining = mediaState.operation.getBytesRemaining()
    if (bytesRemaining > newSegmentSize) {
      return true
    }

    // Otherwise, complete the operation in progress.
    return false
  }
  /* *
   * Notifies the StreamingEngine that the playhead has moved to a valid time
   * within the presentation timeline.
   */
  seeked() {
    const presentationTime = this.playerInterface_.getPresentationTime()
    const smallGapLimit = this.config_.smallGapLimit
    const newTimeIsBuffered = (type) => {
      return this.playerInterface_.mediaSourceEngine.isBuffered(
        type, presentationTime, smallGapLimit)
    }

    let streamCleared = false
    const atPeriodIndex = this.findPeriodForTime_(presentationTime)
    const allSeekingWithinSamePeriod = Iterables.every(
      this.mediaStates_.values(),
      (state) => state.needPeriodIndex === atPeriodIndex)
    if (allSeekingWithinSamePeriod) {
      // If seeking to the same period you were in before, clear buffers
      // individually as desired.
      for (const type of this.mediaStates_.keys()) {
        const bufferEnd =
            this.playerInterface_.mediaSourceEngine.bufferEnd(type)
        const somethingBuffered = bufferEnd !== null
        // Don't clear the buffer unless something is buffered.  This extra
        // check prevents extra, useless calls to clear the buffer.
        if (somethingBuffered && !newTimeIsBuffered(type)) {
          // This stream exists, and isn't buffered.
          this.forceClearBuffer_(this.mediaStates_.get(type))
          streamCleared = true
        }
      }
    } else {
      // Only treat this as a buffered seek if every media state has a buffer.
      // For example, if we have buffered text but not video, we should still
      // clear every buffer so all media states need the same Period.
      const isAllBuffered = Iterables.every(
        this.mediaStates_.keys(), newTimeIsBuffered)
      if (!isAllBuffered) {
        // This was an unbuffered seek for at least one stream, so clear all
        // buffers.
        // Don't clear only some of the buffers because we can become stalled
        // since the media states are waiting for different Periods.
        console.debug('(all): seeked: unbuffered seek: clearing all buffers')
        for (const mediaState of this.mediaStates_.values()) {
          this.forceClearBuffer_(mediaState)
        }
        streamCleared = true
      }
    }

    if (!streamCleared) {
      console.debug(
        '(all): seeked: buffered seek: presentationTime=' + presentationTime)
    }
  }
  /* *
   * Clear the buffer for a given stream.  Unlike clearBuffer_, this will handle
   * cases where a MediaState is performing an update.  After this runs, every
   * MediaState will have a pending update.
   * @param {!StreamingEngine.MediaState_} mediaState
   * @private
   */
  forceClearBuffer_(mediaState) {
    const logPrefix = StreamingEngine.logPrefix_(mediaState)

    if (mediaState.clearingBuffer) {
      // We're already clearing the buffer, so we don't need to clear the
      // buffer again.
      console.debug(logPrefix, 'clear: already clearing the buffer')
      return
    }

    if (mediaState.waitingToClearBuffer) {
      // May not be performing an update, but an update will still happen.
      // See: https://github.com/google/shaka-player/issues/334
      console.debug(logPrefix, 'clear: already waiting')
      return
    }

    if (mediaState.performingUpdate) {
      // We are performing an update, so we have to wait until it's finished.
      // onUpdate_() will call clearBuffer_() when the update has finished.
      console.debug(logPrefix, 'clear: currently updating')
      mediaState.waitingToClearBuffer = true
      // We can set the offset to zero to remember that this was a call to
      // clearAllBuffers.
      mediaState.clearBufferSafeMargin = 0
      return
    }

    const type = mediaState.type
    if (this.playerInterface_.mediaSourceEngine.bufferStart(type) === null) {
      // Nothing buffered.
      console.debug(logPrefix, 'clear: nothing buffered')
      if (mediaState.updateTimer === null) {
        // Note: an update cycle stops when we buffer to the end of the
        // presentation or Period, or when we raise an error.
        this.scheduleUpdate_(mediaState, 0)
      }
      return
    }

    // An update may be scheduled, but we can just cancel it and clear the
    // buffer right away. Note: clearBuffer_() will schedule the next update.
    console.debug(logPrefix, 'clear: handling right now')
    this.cancelUpdate_(mediaState)
    this.clearBuffer_(mediaState, /*  flush= */ false, 0).catch((error) => {
      if (this.playerInterface_) {
        this.playerInterface_.onError(error)
      }
    })
  }
  /* *
   * Initializes the given streams and media states if required.  This will
   * schedule updates for the given types.
   *
   * @param {?shaka.extern.Stream} audio
   * @param {?shaka.extern.Stream} video
   * @param {?shaka.extern.Stream} text
   * @param {number} resumeAt
   * @return {!Promise}
   * @private
   */
  async initStreams_(audio, video, text, resumeAt) {
    console.assert(this.config_,
      'StreamingEngine configure() must be called before init()!')

    // Determine which Period we must buffer.
    const presentationTime = this.playerInterface_.getPresentationTime()
    const needPeriodIndex = this.findPeriodForTime_(presentationTime)

    // Init/re-init MediaSourceEngine. Note that a re-init is only valid for
    // text.
    const ContentType = ManifestParserUtils.ContentType

    /* *
     * @type {!Map.<ManifestParserUtils.ContentType,
     *              shaka.extern.Stream>}
     */
    const streamsByType = new Map()
    /* * @type {!Set.<shaka.extern.Stream>} */
    const streams = new Set()

    if (audio) {
      streamsByType.set(ContentType.AUDIO, audio)
      streams.add(audio)
    }

    if (video) {
      streamsByType.set(ContentType.VIDEO, video)
      streams.add(video)
    }

    if (text) {
      streamsByType.set(ContentType.TEXT, text)
      streams.add(text)
    }

    // Init MediaSourceEngine.
    const mediaSourceEngine = this.playerInterface_.mediaSourceEngine
    const forceTransmuxTS = this.config_.forceTransmuxTS

    await mediaSourceEngine.init(streamsByType, forceTransmuxTS)
    this.destroyer_.ensureNotDestroyed()

    this.setDuration_()

    for (const type of streamsByType.keys()) {
      const stream = streamsByType.get(type)
      if (!this.mediaStates_.has(type)) {
        const state = this.createMediaState_(
          stream, needPeriodIndex, resumeAt)
        this.mediaStates_.set(type, state)
        this.scheduleUpdate_(state, 0)
      }
    }
  }
  /* *
   * Creates a media state.
   *
   * @param {shaka.extern.Stream} stream
   * @param {number} needPeriodIndex
   * @param {number} resumeAt
   * @return {StreamingEngine.MediaState_}
   * @private
   */
  createMediaState_(stream, needPeriodIndex, resumeAt) {
    return /* * @type {StreamingEngine.MediaState_} */ ({
      stream: stream,
      type: stream.type,
      lastStream: null,
      lastSegmentReference: null,
      lastInitSegmentReference: null,
      restoreStreamAfterTrickPlay: null,
      needInitSegment: true,
      needPeriodIndex: needPeriodIndex,
      endOfStream: false,
      performingUpdate: false,
      updateTimer: null,
      waitingToClearBuffer: false,
      clearBufferSafeMargin: 0,
      waitingToFlushBuffer: false,
      clearingBuffer: false,
      recovering: false,
      hasError: false,
      resumeAt: resumeAt || 0,
      operation: null
    })
  }
  /* *
   * Sets the MediaSource's duration.
   * @private
   */
  setDuration_() {
    const duration = this.manifest_.presentationTimeline.getDuration()
    if (duration < Infinity) {
      this.playerInterface_.mediaSourceEngine.setDuration(duration)
    } else {
      // Not all platforms support infinite durations, so set a finite duration
      // so we can append segments and so the user agent can seek.
      this.playerInterface_.mediaSourceEngine.setDuration(Math.pow(2, 32))
    }
  }
  /* *
   * Called when |mediaState|'s update timer has expired.
   *
   * @param {!StreamingEngine.MediaState_} mediaState
   * @private
   */
  async onUpdate_(mediaState) {
    this.destroyer_.ensureNotDestroyed()

    const logPrefix = StreamingEngine.logPrefix_(mediaState)

    // Sanity check.
    console.assert(
      !mediaState.performingUpdate && (mediaState.updateTimer !== null),
      logPrefix + ' unexpected call to onUpdate_()')
    if (mediaState.performingUpdate || (mediaState.updateTimer === null)) {
      return
    }

    console.assert(
      !mediaState.clearingBuffer, logPrefix +
        ' onUpdate_() should not be called when clearing the buffer')
    if (mediaState.clearingBuffer) {
      return
    }

    mediaState.updateTimer = null

    // Handle pending buffer clears.
    if (mediaState.waitingToClearBuffer) {
      // Note: clearBuffer_() will schedule the next update.
      console.debug(logPrefix, 'skipping update and clearing the buffer')
      await this.clearBuffer_(
        mediaState, mediaState.waitingToFlushBuffer,
        mediaState.clearBufferSafeMargin)
      return
    }

    // Make sure the segment index exists.
    if (!mediaState.stream.segmentIndex) {
      const thisStream = mediaState.stream

      await mediaState.stream.createSegmentIndex()

      if (thisStream !== mediaState.stream) {
        // We switched streams while in the middle of this async call to
        // createSegmentIndex.  Abandon this update and schedule a new one if
        // there's not already one pending.
        if (mediaState.updateTimer === null) {
          this.scheduleUpdate_(mediaState, 0)
        }
        return
      }

      console.assert(mediaState.stream.segmentIndex,
        'Segment index should exist by now!')
    }

    // Update the MediaState.
    try {
      const delay = this.update_(mediaState)
      if (delay !== null) {
        this.scheduleUpdate_(mediaState, delay)
        mediaState.hasError = false
      }
    } catch (error) {
      this.handleStreamingError_(error)
      return
    }

    const mediaStates = Array.from(this.mediaStates_.values())

    // Check if we've buffered to the end of the Period.
    this.handlePeriodTransition_(mediaState)

    // Check if we've buffered to the end of the presentation.  We delay adding
    // the audio and video media states, so it is possible for the text stream
    // to be the only state and buffer to the end.  So we need to wait until we
    // have completed startup to determine if we have reached the end.
    if (this.startupComplete_ &&
        mediaStates.every((ms) => ms.endOfStream)) {
      console.info(logPrefix, 'calling endOfStream()...')
      await this.playerInterface_.mediaSourceEngine.endOfStream()
      this.destroyer_.ensureNotDestroyed()

      // If the media segments don't reach the end, then we need to update the
      // timeline duration to match the final media duration to avoid
      // buffering forever at the end.
      // We should only do this if the duration needs to shrink.
      // Growing it by less than 1ms can actually cause buffering on
      // replay, as in https://github.com/google/shaka-player/issues/979
      // On some platforms, this can spuriously be 0, so ignore this case.
      // https://github.com/google/shaka-player/issues/1967,
      const duration = this.playerInterface_.mediaSourceEngine.getDuration()
      if (duration !== 0 &&
          duration < this.manifest_.presentationTimeline.getDuration()) {
        this.manifest_.presentationTimeline.setDuration(duration)
      }
    }
  }
  /* *
   * Updates the given MediaState.
   *
   * @param {StreamingEngine.MediaState_} mediaState
   * @return {?number} The number of seconds to wait until updating again or
   *   null if another update does not need to be scheduled.
   * @private
   */
  update_(mediaState) {
    console.assert(this.manifest_, 'manifest_ should not be null')
    console.assert(this.config_, 'config_ should not be null')

    const ContentType = ManifestParserUtils.ContentType

    // If it's a text stream and the original id starts with 'CC', it's CEA
    // closed captions. Do not schedule update for closed captions text
    // mediastate, since closed captions are embedded in video streams.
    if (StreamingEngine.isEmbeddedText_(mediaState)) {
      this.playerInterface_.mediaSourceEngine.setSelectedClosedCaptionId(
        mediaState.stream.originalId || '')
      return null
    }

    const logPrefix = StreamingEngine.logPrefix_(mediaState)

    // Compute how far we've buffered ahead of the playhead.
    const presentationTime = this.playerInterface_.getPresentationTime()

    // Get the next timestamp we need.
    const timeNeeded = this.getTimeNeeded_(mediaState, presentationTime)
    console.info(logPrefix, 'timeNeeded=' + timeNeeded)

    const currentPeriodIndex =
        this.findPeriodContainingStream_(mediaState.stream)
    const needPeriodIndex = this.findPeriodForTime_(timeNeeded)

    // Get the amount of content we have buffered, accounting for drift.  This
    // is only used to determine if we have meet the buffering goal.  This
    // should be the same method that PlayheadObserver uses.
    const bufferedAhead =
        this.playerInterface_.mediaSourceEngine.bufferedAheadOf(
          mediaState.type, presentationTime)

    console.info(logPrefix,
      'update_:',
      'presentationTime=' + presentationTime,
      'bufferedAhead=' + bufferedAhead)

    const unscaledBufferingGoal = Math.max(
      this.manifest_.minBufferTime || 0,
      this.config_.rebufferingGoal,
      this.config_.bufferingGoal)

    const scaledBufferingGoal =
        unscaledBufferingGoal * this.bufferingGoalScale_

    // Check if we've buffered to the end of the presentation.
    if (timeNeeded >= this.manifest_.presentationTimeline.getDuration()) {
      // We shouldn't rebuffer if the playhead is close to the end of the
      // presentation.
      console.debug(logPrefix, 'buffered to end of presentation')
      mediaState.endOfStream = true

      if (mediaState.type === ContentType.VIDEO) {
        // Since the text stream of CEA closed captions doesn't have update
        // timer, we have to set the text endOfStream based on the video
        // stream's endOfStream state.
        const textState = this.mediaStates_.get(ContentType.TEXT)
        if (textState && textState.stream.mimeType ===
              MimeUtils.CLOSED_CAPTION_MIMETYPE) {
          textState.endOfStream = true
        }
      }
      return null
    }
    mediaState.endOfStream = false

    // Check if we've buffered to the end of the Period. This should be done
    // before checking segment availability because the new Period may become
    // available once it's switched to. Note that we don't use the non-existence
    // of SegmentReferences as an indicator to determine Period boundaries
    // because a SegmentIndex can provide SegmentReferences outside its Period.
    mediaState.needPeriodIndex = needPeriodIndex
    if (needPeriodIndex !== currentPeriodIndex) {
      console.debug(logPrefix,
        'need Period ' + needPeriodIndex,
        'presentationTime=' + presentationTime,
        'timeNeeded=' + timeNeeded,
        'currentPeriodIndex=' + currentPeriodIndex)
      return null
    }

    // If we've buffered to the buffering goal then schedule an update.
    if (bufferedAhead >= scaledBufferingGoal) {
      console.info(logPrefix, 'buffering goal met')

      // Do not try to predict the next update.  Just poll twice every second.
      // The playback rate can change at any time, so any prediction we make now
      // could be terribly invalid soon.
      return 0.5
    }

    const bufferEnd =
        this.playerInterface_.mediaSourceEngine.bufferEnd(mediaState.type)
    const reference = this.getSegmentReferenceNeeded_(
      mediaState, presentationTime, bufferEnd)
    if (!reference) {
      // The segment could not be found, does not exist, or is not available.
      // In any case just try again... if the manifest is incomplete or is not
      // being updated then we'll idle forever; otherwise, we'll end up getting
      // a SegmentReference eventually.
      return 1
    }

    // Do not let any one stream get far ahead of any other.
    let minTimeNeeded = Infinity
    const mediaStates = Array.from(this.mediaStates_.values())
    for (const otherState of mediaStates) {
      // Do not consider embedded captions in this calculation.  It could lead
      // to hangs in streaming.
      if (StreamingEngine.isEmbeddedText_(otherState)) {
        continue
      }

      const timeNeeded = this.getTimeNeeded_(otherState, presentationTime)
      minTimeNeeded = Math.min(minTimeNeeded, timeNeeded)
    }

    const maxSegmentDuration =
        this.manifest_.presentationTimeline.getMaxSegmentDuration()
    const maxRunAhead = maxSegmentDuration *
        StreamingEngine.MAX_RUN_AHEAD_SEGMENTS_
    if (timeNeeded >= minTimeNeeded + maxRunAhead) {
      // Wait and give other media types time to catch up to this one.
      // For example, let video buffering catch up to audio buffering before
      // fetching another audio segment.
      return 1
    }

    mediaState.resumeAt = 0
    const p = this.fetchAndAppend_(mediaState, presentationTime, reference)
    p.catch(() => {}) // TODO(#1993): Handle asynchronous errors.
    return null
  }
  /* *
   * Gets the next timestamp needed. Returns the playhead's position if the
   * buffer is empty; otherwise, returns the time at which the last segment
   * appended ends.
   *
   * @param {StreamingEngine.MediaState_} mediaState
   * @param {number} presentationTime
   * @return {number} The next timestamp needed.
   * @private
   */
  getTimeNeeded_(mediaState, presentationTime) {
    // Get the next timestamp we need. We must use |lastSegmentReference|
    // to determine this and not the actual buffer for two reasons:
    //   1. Actual segments end slightly before their advertised end times, so
    //      the next timestamp we need is actually larger than |bufferEnd|.
    //   2. There may be drift (the timestamps in the segments are ahead/behind
    //      of the timestamps in the manifest), but we need drift-free times
    //      when comparing times against presentation and Period boundaries.
    if (!mediaState.lastStream || !mediaState.lastSegmentReference) {
      return Math.max(presentationTime, mediaState.resumeAt)
    }

    return mediaState.lastSegmentReference.endTime
  }
  /* *
   * Gets the SegmentReference of the next segment needed.
   *
   * @param {StreamingEngine.MediaState_} mediaState
   * @param {number} presentationTime
   * @param {?number} bufferEnd
   * @return {SegmentReference} The SegmentReference of the
   *   next segment needed. Returns null if a segment could not be found, does
   *   not exist, or is not available.
   * @private
   */
  getSegmentReferenceNeeded_(mediaState, presentationTime, bufferEnd) {
    const logPrefix = StreamingEngine.logPrefix_(mediaState)

    if (mediaState.lastSegmentReference &&
        mediaState.stream === mediaState.lastStream) {
      // Something is buffered from the same Stream.
      const position = mediaState.lastSegmentReference.position + 1
      console.info(logPrefix, 'next position known:', 'position=' + position)

      return this.getSegmentReferenceIfAvailable_(mediaState, position)
    }

    /* * @type {?number} */
    let position

    if (mediaState.lastSegmentReference) {
      // Something is buffered from another Stream.
      console.assert(mediaState.lastStream,
        'lastStream should not be null')
      console.info(logPrefix, 'next position unknown: another Stream buffered')
      position = this.lookupSegmentPosition_(
        mediaState, mediaState.lastSegmentReference.endTime)
    } else {
      // Either nothing is buffered, or we have cleared part of the buffer.  If
      // we still have some buffered, use that time to find the segment,
      // otherwise start at the playhead time.
      console.assert(!mediaState.lastStream, 'lastStream should be null')
      console.info(logPrefix, 'next position unknown: nothing buffered')
      position = this.lookupSegmentPosition_(
        mediaState, bufferEnd || presentationTime)
    }

    if (position === null) {
      return null
    }

    let reference = this.getSegmentReferenceIfAvailable_(mediaState, position)
    if (bufferEnd === null) {
      // If there's positive drift then we need to get the previous segment.
      const maxDrift = this.config_.inaccurateManifestTolerance
      if (reference && reference.startTime + maxDrift > presentationTime) {
        console.info(
          logPrefix,
          'Going back one segment since we\'re close to segment start.')
        const optimalPosition = Math.max(0, position - 1)
        const prev =
            this.getSegmentReferenceIfAvailable_(mediaState, optimalPosition)
        if (prev) {
          reference = prev
        } else {
          console.info(logPrefix,
            'Previous segment not found.  Using exact segment requested.')
        }
      }
    }
    return reference
  }
  /* *
   * Looks up the position of the segment containing the given timestamp.
   *
   * @param {StreamingEngine.MediaState_} mediaState
   * @param {number} presentationTime The timestamp needed, relative to the
   *   start of the presentation.
   * @return {?number} A segment position, or null if a segment was not be
   *                   found.
   * @private
   */
  lookupSegmentPosition_(mediaState, presentationTime) {
    const logPrefix = StreamingEngine.logPrefix_(mediaState)

    console.debug(logPrefix,
      'looking up segment:',
      'presentationTime=' + presentationTime)

    const position = mediaState.stream.segmentIndex.find(presentationTime)

    if (position === null) {
      console.warning(logPrefix,
        'cannot find segment:',
        'presentationTime=' + presentationTime)
    }

    return position
  }
  /* *
   * Gets the SegmentReference at the given position if it's available.
   *
   * @param {StreamingEngine.MediaState_} mediaState
   * @param {number} position
   * @return {SegmentReference}
   *
   * @private
   */
  getSegmentReferenceIfAvailable_(mediaState, position) {
    const logPrefix = StreamingEngine.logPrefix_(mediaState)

    const reference = mediaState.stream.segmentIndex.get(position)
    if (!reference) {
      console.info(logPrefix,
        'segment does not exist:',
        'position=' + position)
      return null
    }

    const timeline = this.manifest_.presentationTimeline
    const availabilityStart = timeline.getSegmentAvailabilityStart()
    const availabilityEnd = timeline.getSegmentAvailabilityEnd()

    if (reference.endTime < availabilityStart ||
        reference.startTime > availabilityEnd) {
      console.info(logPrefix,
        'segment is not available:',
        'reference.startTime=' + reference.startTime,
        'reference.endTime=' + reference.endTime,
        'availabilityStart=' + availabilityStart,
        'availabilityEnd=' + availabilityEnd)
      return null
    }

    return reference
  }
  /* *
   * Fetches and appends the given segment. Sets up the given MediaState's
   * associated SourceBuffer and evicts segments if either are required
   * beforehand. Schedules another update after completing successfully.
   *
   * @param {!StreamingEngine.MediaState_} mediaState
   * @param {number} presentationTime
   * @param {!SegmentReference} reference
   * @private
   */
  async fetchAndAppend_(mediaState, presentationTime, reference) {
    const ContentType = ManifestParserUtils.ContentType
    const StreamingEngine = StreamingEngine
    const logPrefix = StreamingEngine.logPrefix_(mediaState)

    console.info(logPrefix,
      'fetchAndAppend_:',
      'presentationTime=' + presentationTime,
      'reference.position=' + reference.position,
      'reference.startTime=' + reference.startTime,
      'reference.endTime=' + reference.endTime)

    // Subtlety: The playhead may move while asynchronous update operations are
    // in progress, so we should avoid calling playhead.getTime() in any
    // callbacks. Furthermore, switch() may be called at any time, so we should
    // also avoid using mediaState.stream or mediaState.needInitSegment in any
    // callbacks.
    const stream = mediaState.stream

    const initSourceBuffer = this.initSourceBuffer_(mediaState, reference)

    mediaState.performingUpdate = true

    // We may set |needInitSegment| to true in switch(), so set it to false
    // here, since we want it to remain true if switch() is called.
    mediaState.needInitSegment = false

    console.info(logPrefix, 'fetching segment')
    const fetchSegment = this.fetch_(mediaState, reference)

    try {
      const results = await Promise.all([initSourceBuffer, fetchSegment])
      this.destroyer_.ensureNotDestroyed()
      if (this.fatalError_) {
        return
      }
      await this.append_(
        mediaState, presentationTime, stream, reference, results[1])
      this.destroyer_.ensureNotDestroyed()
      if (this.fatalError_) {
        return
      }

      mediaState.performingUpdate = false
      mediaState.recovering = false

      const info = this.playerInterface_.mediaSourceEngine.getBufferedInfo()
      const buffered = info[mediaState.type]
      console.info(logPrefix, 'finished fetch and append', buffered)

      if (!mediaState.waitingToClearBuffer) {
        this.playerInterface_.onSegmentAppended()
      }

      // Update right away.
      this.scheduleUpdate_(mediaState, 0)

      // Subtlety: handleStartup_() calls onStartupComplete() which may call
      // switch() or seeked(), so we must schedule an update beforehand so
      // |updateTimer| is set.
      this.handleStartup_(mediaState, stream)
    } catch (error) {
      this.destroyer_.ensureNotDestroyed(error)
      if (this.fatalError_) {
        return
      }
      console.assert(error instanceof Error$1,
        'Should only receive a Shaka error')

      mediaState.performingUpdate = false

      if (mediaState.type === ContentType.TEXT &&
          this.config_.ignoreTextStreamFailures) {
        if (error.code === Error$1.Code.BAD_HTTP_STATUS) {
          console.warning(logPrefix,
            'Text stream failed to download. Proceeding without it.')
        } else {
          console.warning(logPrefix,
            'Text stream failed to parse. Proceeding without it.')
        }
        this.mediaStates_.delete(ContentType.TEXT)
      } else if (error.code === Error$1.Code.OPERATION_ABORTED) {
        // If the network slows down, abort the current fetch request and start
        // a new one, and ignore the error message.
        mediaState.performingUpdate = false
        mediaState.updateTimer = null
        this.scheduleUpdate_(mediaState, 0)
      } else if (error.code === Error$1.Code.QUOTA_EXCEEDED_ERROR) {
        this.handleQuotaExceeded_(mediaState, error)
      } else {
        console.error(logPrefix, 'failed fetch and append: code=' +
            error.code)
        mediaState.hasError = true

        error.severity = Error$1.Severity.CRITICAL
        this.handleStreamingError_(error)
      }
    }
  }
  /* *
   * Clear per-stream error states and retry any failed streams.
   * @return {boolean} False if unable to retry.
   */
  retry() {
    if (this.destroyer_.destroyed()) {
      console.error('Unable to retry after StreamingEngine is destroyed!')
      return false
    }

    if (this.fatalError_) {
      console.error('Unable to retry after StreamingEngine encountered a ' +
                      'fatal error!')
      return false
    }

    for (const mediaState of this.mediaStates_.values()) {
      const logPrefix = StreamingEngine.logPrefix_(mediaState)
      if (mediaState.hasError) {
        console.info(logPrefix, 'Retrying after failure...')
        mediaState.hasError = false
        this.scheduleUpdate_(mediaState, 0.1)
      }
    }

    return true
  }
  /* *
   * Handles a QUOTA_EXCEEDED_ERROR.
   *
   * @param {StreamingEngine.MediaState_} mediaState
   * @param {!Error} error
   * @private
   */
  handleQuotaExceeded_(mediaState, error) {
    const logPrefix = StreamingEngine.logPrefix_(mediaState)

    // The segment cannot fit into the SourceBuffer. Ideally, MediaSource would
    // have evicted old data to accommodate the segment; however, it may have
    // failed to do this if the segment is very large, or if it could not find
    // a suitable time range to remove.
    //
    // We can overcome the latter by trying to append the segment again
    // however, to avoid continuous QuotaExceededErrors we must reduce the size
    // of the buffer going forward.
    //
    // If we've recently reduced the buffering goals, wait until the stream
    // which caused the first QuotaExceededError recovers. Doing this ensures
    // we don't reduce the buffering goals too quickly.

    const mediaStates = Array.from(this.mediaStates_.values())
    const waitingForAnotherStreamToRecover = mediaStates.some((ms) => {
      return ms !== mediaState && ms.recovering
    })

    if (!waitingForAnotherStreamToRecover) {
      // Reduction schedule: 80%, 60%, 40%, 20%, 16%, 12%, 8%, 4%, fail.
      // Note: percentages are used for comparisons to avoid rounding errors.
      const percentBefore = Math.round(100 * this.bufferingGoalScale_)
      if (percentBefore > 20) {
        this.bufferingGoalScale_ -= 0.2
      } else if (percentBefore > 4) {
        this.bufferingGoalScale_ -= 0.04
      } else {
        console.error(
          logPrefix, 'MediaSource threw QuotaExceededError too many times')
        mediaState.hasError = true
        this.fatalError_ = true
        this.playerInterface_.onError(error)
        return
      }
      const percentAfter = Math.round(100 * this.bufferingGoalScale_)
      console.warning(
        logPrefix,
        'MediaSource threw QuotaExceededError:',
        'reducing buffering goals by ' + (100 - percentAfter) + '%')
      mediaState.recovering = true
    } else {
      console.debug(
        logPrefix,
        'MediaSource threw QuotaExceededError:',
        'waiting for another stream to recover...')
    }

    // QuotaExceededError gets thrown if evication didn't help to make room
    // for a segment. We want to wait for a while (4 seconds is just an
    // arbitrary number) before updating to give the playhead a chance to
    // advance, so we don't immidiately throw again.
    this.scheduleUpdate_(mediaState, 4)
  }
  /* *
   * Sets the given MediaState's associated SourceBuffer's timestamp offset and
   * init segment if either are required. If an error occurs then neither the
   * timestamp offset or init segment are unset, since another call to switch()
   * will end up superseding them.
   *
   * @param {StreamingEngine.MediaState_} mediaState
   * @param {!SegmentReference} reference
   * @return {!Promise}
   * @private
   */
  async initSourceBuffer_(mediaState, reference) {
    const StreamingEngine = StreamingEngine
    const logPrefix = StreamingEngine.logPrefix_(mediaState)

    // Rounding issues can cause us to remove the first frame of the Period, so
    // reduce the window start time slightly.
    const appendWindowStart = Math.max(0,
      reference.appendWindowStart -
        StreamingEngine.APPEND_WINDOW_START_FUDGE_)
    const appendWindowEnd =
        reference.appendWindowEnd + StreamingEngine.APPEND_WINDOW_END_FUDGE_

    console.assert(
      reference.startTime <= appendWindowEnd,
      logPrefix + ' segment should start before append window end')

    // TODO: Remove needInitSegment.  Currently, this both signals the need for
    // a different init segment (switches, period transitions) and protects
    // against unnecessary calls to setStreamProperties.  If we can solve calls
    // to setStreamProperties another way, then we could finally drop
    // needInitSegment.
    if (!mediaState.needInitSegment) {
      return
    }

    // If we need an init segment, then the Stream switched, so we've either
    // changed bitrates, Periods, or both. If we've changed Periods then we must
    // set a new timestamp offset and append window end. Note that by setting
    // these values here, we avoid having to co-ordinate ongoing updates, which
    // we would have to do if we instead set them in switch().
    const timestampOffset = reference.timestampOffset
    console.info(logPrefix, 'setting timestamp offset to ' + timestampOffset)
    console.info(logPrefix,
      'setting append window start to ' + appendWindowStart)
    console.info(logPrefix, 'setting append window end to ' + appendWindowEnd)
    const setStreamProperties =
        this.playerInterface_.mediaSourceEngine.setStreamProperties(
          mediaState.type, timestampOffset, appendWindowStart,
          appendWindowEnd)

    if (reference.initSegmentReference === mediaState.lastInitSegmentReference) {
      // The SourceBuffer already has the correct init segment appended.
      await setStreamProperties
      return
    }

    mediaState.lastInitSegmentReference = reference.initSegmentReference

    if (!reference.initSegmentReference) {
      // The Stream is self initializing.
      await setStreamProperties
      return
    }

    console.info(logPrefix, 'fetching init segment')

    console.assert(
      reference.initSegmentReference, 'Should have init segment')
    const fetchInit =
        this.fetch_(mediaState, reference.initSegmentReference)
    const append = async() => {
      try {
        const initSegment = await fetchInit
        this.destroyer_.ensureNotDestroyed()
        console.info(logPrefix, 'appending init segment')
        const hasClosedCaptions = mediaState.stream.closedCaptions &&
            mediaState.stream.closedCaptions.size > 0
        await this.playerInterface_.mediaSourceEngine.appendBuffer(
          mediaState.type, initSegment, /*  startTime= */ null,
          /*  endTime= */ null, hasClosedCaptions)
      } catch (error) {
        mediaState.needInitSegment = true
        mediaState.lastInitSegmentReference = null
        throw error
      }
    }

    await Promise.all([setStreamProperties, append()])
  }
  /* *
   * Appends the given segment and evicts content if required to append.
   *
   * @param {!StreamingEngine.MediaState_} mediaState
   * @param {number} presentationTime
   * @param {shaka.extern.Stream} stream
   * @param {!SegmentReference} reference
   * @param {BufferSource} segment
   * @return {!Promise}
   * @private
   */
  async append_(mediaState, presentationTime, stream, reference,
    segment) {
    const logPrefix = StreamingEngine.logPrefix_(mediaState)

    const hasClosedCaptions = stream.closedCaptions &&
        stream.closedCaptions.size > 0
    if (stream.emsgSchemeIdUris !== null && stream.emsgSchemeIdUris.length > 0) {
      new Mp4Parser()
        .fullBox(
          'emsg',
          (box) => this.parseEMSG_(
            reference, stream.emsgSchemeIdUris, box))
        .parse(segment)
    }

    await this.evict_(mediaState, presentationTime)
    this.destroyer_.ensureNotDestroyed()
    console.info(logPrefix, 'appending media segment')

    await this.playerInterface_.mediaSourceEngine.appendBuffer(
      mediaState.type,
      segment,
      reference.startTime,
      reference.endTime,
      hasClosedCaptions)
    this.destroyer_.ensureNotDestroyed()
    console.info(logPrefix, 'appended media segment')

    // We must use |stream| because switch() may have been called.
    mediaState.lastStream = stream
    mediaState.lastSegmentReference = reference
  }
  /* *
   * Parse the EMSG box from a MP4 container.
   *
   * @param {!SegmentReference} reference
   * @param {?Array.<string>} emsgSchemeIdUris Array of emsg
   *     scheme_id_uri for which emsg boxes should be parsed.
   * @param {!shaka.extern.ParsedBox} box
   * @private
   */
  parseEMSG_(reference, emsgSchemeIdUris, box) {
    const schemeId = box.reader.readTerminatedString()
    // Read the rest of the data.
    const value = box.reader.readTerminatedString()
    const timescale = box.reader.readUint32()
    const presentationTimeDelta = box.reader.readUint32()
    const eventDuration = box.reader.readUint32()
    const id = box.reader.readUint32()
    const messageData = box.reader.readBytes(
      box.reader.getLength() - box.reader.getPosition())

    const startTime = reference.startTime + (presentationTimeDelta / timescale)

    // See DASH sec. 5.10.3.3.1
    // If a DASH client detects an event message box with a scheme that is not
    // defined in MPD, the client is expected to ignore it.
    if (emsgSchemeIdUris.includes(schemeId)) {
      // See DASH sec. 5.10.4.1
      // A special scheme in DASH used to signal manifest updates.
      if (schemeId === 'urn:mpeg:dash:event:2012') {
        this.playerInterface_.onManifestUpdate()
      } else {
        /* * @type {shaka.extern.EmsgInfo} */
        const emsg = {
          startTime: startTime,
          endTime: startTime + (eventDuration / timescale),
          schemeIdUri: schemeId,
          value: value,
          timescale: timescale,
          presentationTimeDelta: presentationTimeDelta,
          eventDuration: eventDuration,
          id: id,
          messageData: messageData
        }

        // Dispatch an event to notify the application about the emsg box.
        const event = new FakeEvent(conf.EventName.Emsg, { 'detail': emsg })
        this.playerInterface_.onEvent(event)
      }
    }
  }
  /* *
   * Evicts media to meet the max buffer behind limit.
   *
   * @param {StreamingEngine.MediaState_} mediaState
   * @param {number} presentationTime
   * @private
   */
  async evict_(mediaState, presentationTime) {
    const logPrefix = StreamingEngine.logPrefix_(mediaState)
    console.info(logPrefix, 'checking buffer length')

    // Use the max segment duration, if it is longer than the bufferBehind, to
    // avoid accidentally clearing too much data when dealing with a manifest
    // with a long keyframe interval.
    const bufferBehind = Math.max(this.config_.bufferBehind,
      this.manifest_.presentationTimeline.getMaxSegmentDuration())

    const startTime =
        this.playerInterface_.mediaSourceEngine.bufferStart(mediaState.type)
    if (startTime === null) {
      console.info(logPrefix,
        'buffer behind okay because nothing buffered:',
        'presentationTime=' + presentationTime,
        'bufferBehind=' + bufferBehind)
      return
    }
    const bufferedBehind = presentationTime - startTime

    const overflow = bufferedBehind - bufferBehind
    if (overflow <= 0) {
      console.info(logPrefix,
        'buffer behind okay:',
        'presentationTime=' + presentationTime,
        'bufferedBehind=' + bufferedBehind,
        'bufferBehind=' + bufferBehind,
        'underflow=' + (-overflow))
      return
    }

    console.info(logPrefix,
      'buffer behind too large:',
      'presentationTime=' + presentationTime,
      'bufferedBehind=' + bufferedBehind,
      'bufferBehind=' + bufferBehind,
      'overflow=' + overflow)

    await this.playerInterface_.mediaSourceEngine.remove(mediaState.type,
      startTime, startTime + overflow)

    this.destroyer_.ensureNotDestroyed()
    console.info(logPrefix, 'evicted ' + overflow + ' seconds')
  }
  /* *
   * Sets up all known Periods when startup completes; otherwise, does nothing.
   *
   * @param {StreamingEngine.MediaState_} mediaState The last
   *   MediaState updated.
   * @param {shaka.extern.Stream} stream
   * @private
   */
  handleStartup_(mediaState, stream) {
    const ContentType = ManifestParserUtils.ContentType
    if (this.startupComplete_) {
      return
    }

    const logPrefix = StreamingEngine.logPrefix_(mediaState)

    // If the only media state is text, then we may have loaded text before
    // any media content.  Marking as complete early will break MediaSource.
    // See #1696.
    const mediaStates = Array.from(this.mediaStates_.values())
    if (mediaStates.length !== 1 || mediaStates[0].type !== ContentType.TEXT) {
      this.startupComplete_ = mediaStates.every((ms) => {
        // Startup completes once we have buffered at least one segment from
        // each MediaState, not counting text.
        if (ms.type === ContentType.TEXT) {
          return true
        }
        return !ms.waitingToClearBuffer &&
               !ms.clearingBuffer &&
               ms.lastSegmentReference
      })
    }

    if (!this.startupComplete_) {
      return
    }

    console.debug(logPrefix, 'startup complete')

    // We must use |stream| because switch() may have been called.
    const currentPeriodIndex = this.findPeriodContainingStream_(stream)

    console.assert(
      mediaStates.every((ms) => {
        // It is possible for one stream (usually text) to buffer the whole
        // Period and need the next one.
        return ms.needPeriodIndex === currentPeriodIndex ||
              ms.needPeriodIndex === currentPeriodIndex + 1
      }),
      logPrefix + ' expected all MediaStates to need same Period')

    // Since period setup is no longer required, call onCanSwitch() once
    // startup is complete.
    this.playerInterface_.onCanSwitch()

    if (this.playerInterface_.onStartupComplete) {
      console.info(logPrefix, 'calling onStartupComplete()...')
      this.playerInterface_.onStartupComplete()
    }
  }
  /* *
   * Calls onChooseStreams() when necessary.
   *
   * @param {StreamingEngine.MediaState_} mediaState The last
   *   MediaState updated.
   * @private
   */
  handlePeriodTransition_(mediaState) {
    const logPrefix = StreamingEngine.logPrefix_(mediaState)
    const ContentType = ManifestParserUtils.ContentType

    const currentPeriodIndex =
        this.findPeriodContainingStream_(mediaState.stream)
    if (mediaState.needPeriodIndex === currentPeriodIndex) {
      return
    }

    const needPeriodIndex = mediaState.needPeriodIndex

    /* * @type {Array.<StreamingEngine.MediaState_>} */
    const mediaStates = Array.from(this.mediaStates_.values())

    // For a Period transition to work, all media states must need the same
    // Period.  If a stream needs a different Period than the one it currently
    // has, it will try to transition or stop updates assuming that another
    // streamwill handle it.
    // This only works when all streams either need the same Period or are still
    // performing updates.
    console.assert(
      mediaStates.every((ms) => {
        return ms.needPeriodIndex === needPeriodIndex || ms.hasError ||
              !StreamingEngine.isIdle_(ms) ||
              StreamingEngine.isEmbeddedText_(ms)
      }), 'All MediaStates should need the same Period or be performing' +
        'updates.')

    // Only call onChooseStreams() when all MediaStates need the same Period.
    const needSamePeriod = mediaStates.every((ms) => {
      // Ignore embedded text streams since they are based on the video stream.
      return ms.needPeriodIndex === needPeriodIndex ||
          StreamingEngine.isEmbeddedText_(ms)
    })
    if (!needSamePeriod) {
      console.debug(
        logPrefix, 'not all MediaStates need Period ' + needPeriodIndex)
      return
    }

    // Only call onChooseStreams() once per Period transition.
    const allAreIdle = mediaStates.every(StreamingEngine.isIdle_)
    if (!allAreIdle) {
      console.debug(
        logPrefix,
        'all MediaStates need Period ' + needPeriodIndex + ', ' +
          'but not all MediaStates are idle')
      return
    }

    console.debug(logPrefix, 'all need Period ' + needPeriodIndex)

    // Ensure the Period which we need to buffer is set up and then call
    // onChooseStreams().
    try {
      // If we seek during a Period transition, we can start another transition.
      // So we need to verify that:
      //  1. We are still in need of the same Period.
      //  2. All streams are still idle.
      //  3. The current stream is not in the needed Period (another transition
      //     handled it).
      const allReady = mediaStates.every((ms) => {
        const isIdle = StreamingEngine.isIdle_(ms)
        const currentPeriodIndex = this.findPeriodContainingStream_(ms.stream)
        if (StreamingEngine.isEmbeddedText_(ms)) {
          // Embedded text tracks don't do Period transitions.
          return true
        }
        return isIdle && ms.needPeriodIndex === needPeriodIndex &&
            currentPeriodIndex !== needPeriodIndex
      })
      if (!allReady) {
        // TODO: Write unit tests for this case.
        console.debug(logPrefix, 'ignoring transition to Period',
          needPeriodIndex, 'since another is happening')
        return
      }

      const needPeriod = this.manifest_.periods[needPeriodIndex]

      console.info(logPrefix, 'calling onChooseStreams()...')
      const chosenStreams = this.playerInterface_.onChooseStreams(needPeriod)

      /* * @type {!Map.<!ManifestParserUtils.ContentType,
        *              shaka.extern.Stream>} */
      const streamsByType = new Map()
      if (chosenStreams.variant && chosenStreams.variant.video) {
        streamsByType.set(ContentType.VIDEO, chosenStreams.variant.video)
      }
      if (chosenStreams.variant && chosenStreams.variant.audio) {
        streamsByType.set(ContentType.AUDIO, chosenStreams.variant.audio)
      }
      if (chosenStreams.text) {
        streamsByType.set(ContentType.TEXT, chosenStreams.text)
      }

      // Vet |streamsByType| before switching.
      for (const type of this.mediaStates_.keys()) {
        if (streamsByType.has(type) || type === ContentType.TEXT) {
          continue
        }

        console.error(logPrefix,
          'invalid Streams chosen: missing ' + type + ' Stream')
        this.playerInterface_.onError(new Error$1(
          Error$1.Severity.CRITICAL,
          Error$1.Category.STREAMING,
          Error$1.Code.INVALID_STREAMS_CHOSEN))
        return
      }

      // Because we are going to modify the map, we need to create a copy of the
      // keys, so copy the iterable to an array first.
      for (const type of Array.from(streamsByType.keys())) {
        if (this.mediaStates_.has(type)) {
          continue
        }

        if (type === ContentType.TEXT) {
          // initStreams_ will switch streams and schedule an update.
          this.initStreams_(
            /*  audio= */ null,
            /*  video= */ null,
            /*  text= */ streamsByType.get(ContentType.TEXT),
            needPeriod.startTime)
          streamsByType.delete(type)
          continue
        }

        console.error(logPrefix,
          'invalid Streams chosen: unusable ' + type + ' Stream')
        this.playerInterface_.onError(new Error$1(
          Error$1.Severity.CRITICAL,
          Error$1.Category.STREAMING,
          Error$1.Code.INVALID_STREAMS_CHOSEN))
        return
      }

      // Because we are going to modify the map, we need to create a copy of the
      // keys, so copy the iterable to an array first.
      const copyOfStateTypes = Array.from(this.mediaStates_.keys())
      for (const type of copyOfStateTypes) {
        const state = this.mediaStates_.get(type)
        const stream = streamsByType.get(type)
        if (stream) {
          const wasEmbeddedText =
              StreamingEngine.isEmbeddedText_(state)
          if (wasEmbeddedText) {
            // If this was an embedded text track, we'll need to update the
            // needPeriodIndex so it doesn't try to do a Period transition once
            // we switch.
            state.needPeriodIndex = needPeriodIndex
            state.resumeAt = needPeriod.startTime
          }

          this.switchInternal_(
            stream,
            /*  clearBuffer= */ false,
            /*  safeMargin= */ 0,
            /*  force= */ false)

          // Don't schedule an update when changing from embedded text to
          // another embedded text since the update will try to load existing
          // captions, which are already loaded.
          //
          // But we do want to schedule an update if we switch to a non-embedded
          // text track of if we didn't have an embedded text track before.
          if (!wasEmbeddedText ||
              !StreamingEngine.isEmbeddedText_(state)) {
            const mediaState = this.mediaStates_.get(type)
            this.scheduleUpdate_(mediaState, 0)
          }
        } else {
          console.assert(type === ContentType.TEXT,
            'Invalid streams chosen')
          this.mediaStates_.delete(type)
        }
      }

      // All streams for the new period are active, so call onCanSwitch().
      console.info(logPrefix, 'calling onCanSwitch()...')
      this.playerInterface_.onCanSwitch()
    } catch (e) {
      console.log(e)
    }
  }

  /* *
   * @param {StreamingEngine.MediaState_} mediaState
   * @return {boolean}
   * @private
   */
  static isEmbeddedText_(mediaState) {
    const MimeUtils = MimeUtils
    return mediaState &&
        mediaState.type === ManifestParserUtils.ContentType.TEXT &&
        mediaState.stream.mimeType === MimeUtils.CLOSED_CAPTION_MIMETYPE
  }
  /* *
   * @param {StreamingEngine.MediaState_} mediaState
   * @return {boolean} True if the given MediaState is idle; otherwise, return
   *   false.
   * @private
   */
  static isIdle_(mediaState) {
    return !mediaState.performingUpdate &&
           (mediaState.updateTimer === null) &&
           !mediaState.waitingToClearBuffer &&
           !mediaState.clearingBuffer
  }
  /* *
   * Get the index in the manifest of the period that contains the given
   * presentation time. If |time| is before all periods, this will default to
   * returning the first period.
   *
   * @param {number} time The presentation time in seconds.
   * @return {number}
   * @private
   */
  findPeriodForTime_(time) {
    const ManifestParserUtils = ManifestParserUtils
    const threshold = ManifestParserUtils.GAP_OVERLAP_TOLERANCE_SECONDS

    // The last segment may end right before the end of the Period because of
    // rounding issues so we bias forward a little.
    const adjustedTime = time + threshold

    const period = Periods.findPeriodForTime(
      /*  periods= */ this.manifest_.periods,
      /*  time= */ adjustedTime)

    return period ? this.manifest_.periods.indexOf(period) : 0
  }
  /* *
   * See if |stream| can be found in our manifest and return the period index.
   * If |stream| cannot be found, -1 will be returned.
   *
   * @param {!shaka.extern.Stream} stream
   * @return {number}
   * @private
   */
  findPeriodContainingStream_(stream) {
    return this.manifest_.periods.findIndex((period) => {
      for (const variant of period.variants) {
        if (variant.audio === stream || variant.video === stream) {
          return true
        }
        if (variant.video && variant.video.trickModeVideo === stream) {
          return true
        }
      }

      return period.textStreams.includes(stream)
    })
  }
  /* *
   * Fetches the given segment.
   *
   * @param {!StreamingEngine.MediaState_} mediaState
   * @param {(!InitSegmentReference|!SegmentReference)}
   *   reference
   *
   * @return {!Promise.<BufferSource>}
   * @private
   */
  async fetch_(mediaState, reference) {
    const requestType = NetworkingEngine.RequestType.SEGMENT

    const request = Networking.createSegmentRequest(
      reference.getUris(),
      reference.startByte,
      reference.endByte,
      this.config_.retryParameters)

    console.info('fetching: reference=', reference)

    const op = this.playerInterface_.netEngine.request(requestType, request)
    mediaState.operation = op
    const response = await op.promise
    mediaState.operation = null
    return response.data
  }
  /* *
   * Clears the buffer and schedules another update.
   * The optional parameter safeMargin allows to retain a certain amount
   * of buffer, which can help avoiding rebuffering events.
   * The value of the safe margin should be provided by the ABR manager.
   *
   * @param {!StreamingEngine.MediaState_} mediaState
   * @param {boolean} flush
   * @param {number} safeMargin
   * @private
   */
  async clearBuffer_(mediaState, flush, safeMargin) {
    const logPrefix = StreamingEngine.logPrefix_(mediaState)

    console.assert(
      !mediaState.performingUpdate && (mediaState.updateTimer === null),
      logPrefix + ' unexpected call to clearBuffer_()')

    mediaState.waitingToClearBuffer = false
    mediaState.waitingToFlushBuffer = false
    mediaState.clearBufferSafeMargin = 0
    mediaState.clearingBuffer = true

    console.debug(logPrefix, 'clearing buffer')

    if (safeMargin) {
      const presentationTime = this.playerInterface_.getPresentationTime()
      const duration = this.playerInterface_.mediaSourceEngine.getDuration()
      await this.playerInterface_.mediaSourceEngine.remove(
        mediaState.type, presentationTime + safeMargin, duration)
    } else {
      await this.playerInterface_.mediaSourceEngine.clear(mediaState.type)
      this.destroyer_.ensureNotDestroyed()

      if (flush) {
        await this.playerInterface_.mediaSourceEngine.flush(
          mediaState.type)
      }
    }
    this.destroyer_.ensureNotDestroyed()

    console.debug(logPrefix, 'cleared buffer')
    mediaState.lastStream = null
    mediaState.lastSegmentReference = null
    mediaState.clearingBuffer = false
    mediaState.endOfStream = false
    this.scheduleUpdate_(mediaState, 0)
  }
  /* *
   * Schedules |mediaState|'s next update.
   *
   * @param {!StreamingEngine.MediaState_} mediaState
   * @param {number} delay The delay in seconds.
   * @private
   */
  scheduleUpdate_(mediaState, delay) {
    const logPrefix = StreamingEngine.logPrefix_(mediaState)
    console.info(logPrefix, 'updating in ' + delay + ' seconds')
    console.assert(mediaState.updateTimer === null,
      logPrefix + ' did not expect update to be scheduled')

    mediaState.updateTimer = new DelayedTick(async() => {
      try {
        await this.onUpdate_(mediaState)
      } catch (error) {
        if (this.playerInterface_) {
          this.playerInterface_.onError(error)
        }
      }
    }).tickAfter(delay)
  }
  /* *
   * If |mediaState| is scheduled to update, stop it.
   *
   * @param {StreamingEngine.MediaState_} mediaState
   * @private
   */
  cancelUpdate_(mediaState) {
    if (mediaState.updateTimer === null) {
      return
    }

    mediaState.updateTimer.stop()
    mediaState.updateTimer = null
  }
  /* *
   * Handle streaming errors by delaying, then notifying the application by
   * error callback and by streaming failure callback.
   *
   * @param {!Error} error
   * @private
   */
  async handleStreamingError_(error) {
    // If we invoke the callback right away, the application could trigger a
    // rapid retry cycle that could be very unkind to the server.  Instead,
    // use the backoff system to delay and backoff the error handling.
    await this.failureCallbackBackoff_.attempt()
    this.destroyer_.ensureNotDestroyed()

    // First fire an error event.
    this.playerInterface_.onError(error)

    // If the error was not handled by the application, call the failure
    // callback.
    if (!error.handled) {
      this.config_.failureCallback(error)
    }
  }

  /* *
   * @param {StreamingEngine.MediaState_} mediaState
   * @return {string} A log prefix of the form ($CONTENT_TYPE:$STREAM_ID), e.g.,
   *   '(audio:5)' or '(video:hd)'.
   * @private
   */
  static logPrefix_(mediaState) {
    return '(' + mediaState.type + ':' + mediaState.stream.id + ')'
  }
}
/* *
 * The fudge factor for appendWindowStart.  By adjusting the window backward, we
 * avoid rounding errors that could cause us to remove the keyframe at the start
 * of the Period.
 *
 * NOTE: This was increased as part of the solution to
 * https://github.com/google/shaka-player/issues/1281
 *
 * @const {number}
 * @private
 */
StreamingEngine.APPEND_WINDOW_START_FUDGE_ = 0.1
/* *
 * The fudge factor for appendWindowEnd.  By adjusting the window backward, we
 * avoid rounding errors that could cause us to remove the last few samples of
 * the Period.  This rounding error could then create an artificial gap and a
 * stutter when the gap-jumping logic takes over.
 *
 * https://github.com/google/shaka-player/issues/1597
 *
 * @const {number}
 * @private
 */
StreamingEngine.APPEND_WINDOW_END_FUDGE_ = 0.01
/* *
 * The maximum number of segments by which a stream can get ahead of other
 * streams.
 *
 * Introduced to keep StreamingEngine from letting one media type get too far
 * ahead of another.  For example, audio segments are typically much smaller
 * than video segments, so in the time it takes to fetch one video segment, we
 * could fetch many audio segments.  This doesn't help with buffering, though,
 * since the intersection of the two buffered ranges is what counts.
 *
 * @const {number}
 * @private
 */
StreamingEngine.MAX_RUN_AHEAD_SEGMENTS_ = 1

/* *
 * @summary
 * This class computes an exponentionally-weighted moving average.
 */
class Ewma {
  /* *
   * @param {number} halfLife The quantity of prior samples (by weight) used
   *   when creating a new estimate.  Those prior samples make up half of the
   *   new estimate.
   */
  constructor(halfLife) {
    console.assert(halfLife > 0, 'expected halfLife to be positive')
    /* *
     * Larger values of alpha expire historical data more slowly.
     * @private {number}
     */
    this.alpha_ = Math.exp(Math.log(0.5) / halfLife)

    /* * @private {number} */
    this.estimate_ = 0

    /* * @private {number} */
    this.totalWeight_ = 0
  }

  /* *
   * Takes a sample.
   *
   * @param {number} weight
   * @param {number} value
   */
  sample(weight, value) {
    const adjAlpha = Math.pow(this.alpha_, weight)
    const newEstimate = value * (1 - adjAlpha) + adjAlpha * this.estimate_

    if (!isNaN(newEstimate)) {
      this.estimate_ = newEstimate
      this.totalWeight_ += weight
    }
  }

  /* *
   * @return {number}
   */
  getEstimate() {
    const zeroFactor = 1 - Math.pow(this.alpha_, this.totalWeight_)
    return this.estimate_ / zeroFactor
  }
}

/* * @license
 * Copyright 2016 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/* *
 * @summary
 * This class tracks bandwidth samples and estimates available bandwidth.
 * Based on the minimum of two exponentially-weighted moving averages with
 * different half-lives.
 *
 */
class EwmaBandwidthEstimator {
  constructor() {
    /* *
     * A fast-moving average.
     * Half of the estimate is based on the last 2 seconds of sample history.
     * @private {!Ewma}
     */
    this.fast_ = new Ewma(2)

    /* *
     * A slow-moving average.
     * Half of the estimate is based on the last 5 seconds of sample history.
     * @private {!Ewma}
     */
    this.slow_ = new Ewma(5)

    /* *
     * Number of bytes sampled.
     * @private {number}
     */
    this.bytesSampled_ = 0
    /* *
     * Minimum number of bytes sampled before we trust the estimate.  If we have
     * not sampled much data, our estimate may not be accurate enough to trust.
     * If bytesSampled_ is less than minTotalBytes_, we use defaultEstimate_.
     * This specific value is based on experimentation.
     *
     * @private {number}
     * @const
     */
    this.minTotalBytes_ = 128e3 // 128kB

    /* *
     * Minimum number of bytes, under which samples are discarded.  Our models
     * do not include latency information, so connection startup time (time to
     * first byte) is considered part of the download time.  Because of this, we
     * should ignore very small downloads which would cause our estimate to be
     * too low.
     * This specific value is based on experimentation.
     *
     * @private {number}
     * @const
     */
    this.minBytes_ = 16e3 // 16kB
  }

  /* *
   * Takes a bandwidth sample.
   *
   * @param {number} durationMs The amount of time, in milliseconds, for a
   *   particular request.
   * @param {number} numBytes The total number of bytes transferred in that
   *   request.
   */
  sample(
    durationMs, numBytes) {
    if (numBytes < this.minBytes_) {
      return
    }

    const bandwidth = 8000 * numBytes / durationMs
    const weight = durationMs / 1000

    this.bytesSampled_ += numBytes
    this.fast_.sample(weight, bandwidth)
    this.slow_.sample(weight, bandwidth)
  }
  /* *
   * Gets the current bandwidth estimate.
   *
   * @param {number} defaultEstimate
   * @return {number} The bandwidth estimate in bits per second.
   */
  getBandwidthEstimate(defaultEstimate) {
    if (this.bytesSampled_ < this.minTotalBytes_) {
      return defaultEstimate
    }

    // Take the minimum of these two estimates.  This should have the effect
    // of adapting down quickly, but up more slowly.
    return Math.min(this.fast_.getEstimate(), this.slow_.getEstimate())
  }
  /* *
   * @return {boolean} True if there is enough data to produce a meaningful
   *   estimate.
   */
  hasGoodEstimate() {
    return this.bytesSampled_ >= this.minTotalBytes_
  }
}

/* *
 * @summary
 * <p>
 * This defines the default ABR manager for the Player.  An instance of this
 * class is used when no ABR manager is given.
 * </p>
 * <p>
 * The behavior of this class is to take throughput samples using
 * segmentDownloaded to estimate the current network bandwidth.  Then it will
 * use that to choose the streams that best fit the current bandwidth.  It will
 * always pick the highest bandwidth variant it thinks can be played.
 * </p>
 * <p>
 * After initial choices are made, this class will call switchCallback() when
 * there is a better choice.  switchCallback() will not be called more than once
 * per ({@link shaka.abr.SimpleAbrManager.SWITCH_INTERVAL_MS}).
 * </p>
 *
 * @implements {shaka.extern.AbrManager}
 * @export
 */
class SimpleAbrManager {
  constructor() {
    /* * @private {?shaka.extern.AbrManager.SwitchCallback} */
    this.switch_ = null

    /* * @private {boolean} */
    this.enabled_ = false

    /* * @private {EwmaBandwidthEstimator} */
    this.bandwidthEstimator_ = new EwmaBandwidthEstimator()
    // TODO: Consider using NetworkInformation's change event to throw out an
    // old estimate based on changing network types, such as wifi => 3g.

    /* *
     * A filtered list of Variants to choose from.
     * @private {!Array.<!shaka.extern.Variant>}
     */
    this.variants_ = []

    /* * @private {number} */
    this.playbackRate_ = 1

    /* * @private {boolean} */
    this.startupComplete_ = false

    /* *
     * The last wall-clock time, in milliseconds, when streams were chosen.
     *
     * @private {?number}
     */
    this.lastTimeChosenMs_ = null

    /* * @private {?shaka.extern.AbrConfiguration} */
    this.config_ = null
  }
  /* *
   * @override
   * @export
   */
  stop() {
    this.switch_ = null
    this.enabled_ = false
    this.variants_ = []
    this.playbackRate_ = 1
    this.lastTimeChosenMs_ = null

    // Don't reset |startupComplete_|: if we've left the startup interval, we
    // can start using bandwidth estimates right away after init() is called.
  }
  /* *
   * @override
   * @export
   */
  init(switchCallback) {
    this.switch_ = switchCallback
  }
  /* *
   * @override
   * @export
   */
  chooseVariant() {
    const SimpleAbrManager = SimpleAbrManager

    // Get sorted Variants.
    let sortedVariants = SimpleAbrManager.filterAndSortVariants_(
      this.config_.restrictions, this.variants_)
    const currentBandwidth = this.bandwidthEstimator_.getBandwidthEstimate(
      this.config_.defaultBandwidthEstimate)

    if (this.variants_.length && !sortedVariants.length) {
      // If we couldn't meet the ABR restrictions, we should still play
      // something.
      // These restrictions are not 'hard' restrictions in the way that
      // top-level or DRM-based restrictions are.  Sort the variants without
      // restrictions and keep just the first (lowest-bandwidth) one.
      console.warning('No variants met the ABR restrictions. ' +
                        'Choosing a variant by lowest bandwidth.')
      sortedVariants = SimpleAbrManager.filterAndSortVariants_(
        /*  restrictions= */ null, this.variants_)
      sortedVariants = [sortedVariants[0]]
    }

    // Start by assuming that we will use the first Stream.
    let chosen = sortedVariants[0] || null

    const enumerate = (it) => Iterables.enumerate(it)
    for (const { item, next } of enumerate(sortedVariants)) {
      const playbackRate =
          !isNaN(this.playbackRate_) ? Math.abs(this.playbackRate_) : 1
      const itemBandwidth = playbackRate * item.bandwidth
      const minBandwidth =
          itemBandwidth / this.config_.bandwidthDowngradeTarget
      const nextBandwidth =
          playbackRate * (next || { bandwidth: Infinity }).bandwidth
      const maxBandwidth = nextBandwidth / this.config_.bandwidthUpgradeTarget
      console.info('Bandwidth ranges:',
        (itemBandwidth / 1e6).toFixed(3),
        (minBandwidth / 1e6).toFixed(3),
        (maxBandwidth / 1e6).toFixed(3))

      if (currentBandwidth >= minBandwidth &&
          currentBandwidth <= maxBandwidth) {
        chosen = item
      }
    }

    this.lastTimeChosenMs_ = Date.now()
    return chosen
  }

  /* *
   * @override
   * @export
   */
  enable() {
    this.enabled_ = true
  }
  /* *
   * @override
   * @export
   */
  disable() {
    this.enabled_ = false
  }
  /* *
   * @override
   * @export
   */
  segmentDownloaded(deltaTimeMs, numBytes) {
    console.info('Segment downloaded:',
      'deltaTimeMs=' + deltaTimeMs,
      'numBytes=' + numBytes,
      'lastTimeChosenMs=' + this.lastTimeChosenMs_,
      'enabled=' + this.enabled_)
    console.assert(deltaTimeMs >= 0, 'expected a non-negative duration')
    this.bandwidthEstimator_.sample(deltaTimeMs, numBytes)

    if ((this.lastTimeChosenMs_ != null) && this.enabled_) {
      this.suggestStreams_()
    }
  }
  /* *
   * @override
   * @export
   */
  getBandwidthEstimate() {
    return this.bandwidthEstimator_.getBandwidthEstimate(
      this.config_.defaultBandwidthEstimate)
  }
  /* *
   * @override
   * @export
   */
  setVariants(variants) {
    this.variants_ = variants
  }
  /* *
   * @override
   * @export
   */
  playbackRateChanged(rate) {
    this.playbackRate_ = rate
  }
  /* *
   * @override
   * @export
   */
  configure(config) {
    this.config_ = config
  }
  /* *
   * Calls switch_() with the variant chosen by chooseVariant().
   *
   * @private
   */
  suggestStreams_() {
    console.info('Suggesting Streams...')
    console.assert(this.lastTimeChosenMs_ != null,
      'lastTimeChosenMs_ should not be null')

    if (!this.startupComplete_) {
      // Check if we've got enough data yet.
      if (!this.bandwidthEstimator_.hasGoodEstimate()) {
        console.info('Still waiting for a good estimate...')
        return
      }
      this.startupComplete_ = true
    } else {
      // Check if we've left the switch interval.
      const now = Date.now()
      const delta = now - this.lastTimeChosenMs_
      if (delta < this.config_.switchInterval * 1000) {
        console.info('Still within switch interval...')
        return
      }
    }

    const chosenVariant = this.chooseVariant()
    const bandwidthEstimate = this.bandwidthEstimator_.getBandwidthEstimate(
      this.config_.defaultBandwidthEstimate)
    const currentBandwidthKbps = Math.round(bandwidthEstimate / 1000.0)

    console.debug(
      'Calling switch_(), bandwidth=' + currentBandwidthKbps + ' kbps')
    // If any of these chosen streams are already chosen, Player will filter
    // them out before passing the choices on to StreamingEngine.
    this.switch_(chosenVariant)
  }
  /* *
   * @param {?shaka.extern.Restrictions} restrictions
   * @param {!Array.<shaka.extern.Variant>} variants
   * @return {!Array.<shaka.extern.Variant>} variants filtered according to
   *   |restrictions| and sorted in ascending order of bandwidth.
   * @private
   */
  static filterAndSortVariants_(restrictions, variants) {
    if (restrictions) {
      variants = variants.filter((variant) => {
        // This was already checked in another scope, but the compiler doesn't
        // seem to understand that.
        console.assert(restrictions, 'Restrictions should exist!')

        return StreamUtils.meetsRestrictions(
          variant, restrictions,
          /*  maxHwRes= */ { width: Infinity, height: Infinity })
      })
    }

    return variants.sort((v1, v2) => {
      return v1.bandwidth - v2.bandwidth
    })
  }
}

class ConfigUtils {
  /* *
   * @param {!Object} destination
   * @param {!Object} source
   * @param {!Object} template supplies default values
   * @param {!Object} overrides
   *   Supplies override type checking.  When the current path matches
   *   the key in this object, each sub-value must match the type in this
   *   object. If this contains an Object, it is used as the template.
   * @param {string} path to this part of the config
   * @return {boolean}
   * @export
   */
  static mergeConfigObjects(destination, source, template, overrides, path) {
    console.assert(destination, 'Destination config must not be null!')

    /* *
     * @type {boolean}
     * If true, don't validate the keys in the next level.
     */
    const ignoreKeys = path in overrides

    let isValid = true

    for (const k in source) {
      const subPath = path + '.' + k
      const subTemplate = ignoreKeys ? overrides[path] : template[k]

      // The order of these checks is important.
      if (!ignoreKeys && !(k in template)) {
        console.error('Invalid config, unrecognized key ' + subPath)
        isValid = false
      } else if (source[k] === undefined) {
        // An explicit 'undefined' value causes the key to be deleted from the
        // destination config and replaced with a default from the template if
        // possible.
        if (subTemplate === undefined || ignoreKeys) {
          // There is nothing in the template, so delete.
          delete destination[k]
        } else {
          // There is something in the template, so go back to that.
          destination[k] = ObjectUtils.cloneObject(subTemplate)
        }
      } else if (subTemplate.constructor === Object &&
                 source[k] &&
                 source[k].constructor === Object) {
        // These are plain Objects with no other constructor.

        if (!destination[k]) {
          // Initialize the destination with the template so that normal
          // merging and type-checking can happen.
          destination[k] = ObjectUtils.cloneObject(subTemplate)
        }

        const subMergeValid = ConfigUtils.mergeConfigObjects(
          destination[k], source[k], subTemplate, overrides, subPath)
        isValid = isValid && subMergeValid
      } else if (typeof source[k] !== typeof subTemplate ||
                 source[k] == null ||
                 // Function cosntructors are not informative, and differ
                 // between sync and async functions.  So don't look at
                 // constructor for function types.
                 (typeof source[k] !== 'function' &&
                  source[k].constructor !== subTemplate.constructor)) {
        // The source is the wrong type.  This check allows objects to be
        // nulled, but does not allow null for any non-object fields.
        console.error('Invalid config, wrong type for ' + subPath)
        isValid = false
      } else if (typeof template[k] === 'function' &&
                 template[k].length !== source[k].length) {
        console.warn(
          'Unexpected number of arguments for ' + subPath)
        destination[k] = source[k]
      } else {
        destination[k] = source[k]
      }
    }

    return isValid
  }
  /* *
   * Convert config from ('fieldName', value) format to a partial config object.
   *
   * E. g. from ('manifest.retryParameters.maxAttempts', 1) to
   * { manifest: { retryParameters: { maxAttempts: 1 }}}.
   *
   * @param {string} fieldName
   * @param {*} value
   * @return {!Object}
   * @export
   */
  static convertToConfigObject(fieldName, value) {
    const configObject = {}
    let last = configObject
    let searchIndex = 0
    let nameStart = 0
    while (true) { // eslint-disable-line no-constant-condition
      const idx = fieldName.indexOf('.', searchIndex)
      if (idx < 0) {
        break
      }
      if (idx === 0 || fieldName[idx - 1] !== '\\') {
        const part = fieldName.substring(nameStart, idx).replace(/\\\./g, '.')
        last[part] = {}
        last = last[part]
        nameStart = idx + 1
      }
      searchIndex = idx + 1
    }

    last[fieldName.substring(nameStart).replace(/\\\./g, '.')] = value
    return configObject
  }
}

// TODO(vaage): Many times in our configs, we need to create an empty
//  implementation of a method, but to avoid closure from removing unused
//  parameters (and breaking our merge config code) we need to use each
//  parameter. Is there a better solution to this problem than what we are
//  doing now?
//
//  NOTE: Chrome App Content Security Policy prohibits usage of new Function()

/* *
 * @final
 * @export
 */
class PlayerConfiguration {
  /* * @return {shaka.extern.PlayerConfiguration} */
  static createDefault() {
    // This is a relatively safe default in the absence of clues from the
    // browser.  For slower connections, the default estimate may be too high.
    let bandwidthEstimate = 1e6 // 1Mbps

    let abrMaxHeight = Infinity

    // Some browsers implement the Network Information API, which allows
    // retrieving information about a user's network connection.
    if (navigator.connection) {
      // If it's available, get the bandwidth estimate from the browser (in
      // megabits per second) and use it as defaultBandwidthEstimate.
      bandwidthEstimate = navigator.connection.downlink * 1e6
      // TODO: Move this into AbrManager, where changes to the estimate can be
      // observed and absorbed.

      // If the user has checked a box in the browser to ask it to use less
      // data, the browser will expose this intent via connection.saveData.
      // When that is true, we will default the max ABR height to 360p. Apps
      // can override this if they wish.
      //
      // The decision to use 360p was somewhat arbitrary. We needed a default
      // limit, and rather than restrict to a certain bandwidth, we decided to
      // restrict resolution. This will implicitly restrict bandwidth and
      // therefore save data. We (Shaka+Chrome) judged that:
      //   - HD would be inappropriate
      //   - If a user is asking their browser to save data, 360p it reasonable
      //   - 360p would not look terrible on small mobile device screen
      // We also found that:
      //   - YouTube's website on mobile defaults to 360p (as of 2018)
      //   - iPhone 6, in portrait mode, has a physical resolution big enough
      //     for 360p widescreen, but a little smaller than 480p widescreen
      //     (https://apple.co/2yze4es)
      // If the content's lowest resolution is above 360p, AbrManager will use
      // the lowest resolution.
      if (navigator.connection.saveData) {
        abrMaxHeight = 360
      }
    }

    const manifest = {
      retryParameters: NetworkingEngine.defaultRetryParameters(),
      availabilityWindowOverride: NaN,
      disableAudio: false,
      disableVideo: false,
      disableText: false,
      dash: {
        // Reference node to keep closure from removing it.
        // If the argument is removed, it breaks our function length check
        // in mergeConfigObjects_().
        customScheme: (node) => {
          return node && null
        },
        clockSyncUri: '',
        xlinkFailGracefully: false,
        defaultPresentationDelay: 10,
        ignoreMinBufferTime: false,
        autoCorrectDrift: true,
        initialSegmentLimit: 1000,
        ignoreSuggestedPresentationDelay: false,
        ignoreEmptyAdaptationSet: false
      },
      hls: {
        ignoreTextStreamFailures: false
      }
    }

    const streaming = {
      retryParameters: NetworkingEngine.defaultRetryParameters(),
      // Need some operation in the callback or else closure may remove calls
      // to the function as it would be a no-op.  The operation can't just be a
      // log message, because those are stripped in the compiled build.
      failureCallback: (error) => {
        console.error('Unhandled streaming error', error)
        return [error]
      },
      rebufferingGoal: 2,
      bufferingGoal: 10,
      bufferBehind: 30,
      ignoreTextStreamFailures: false,
      alwaysStreamText: false,
      startAtSegmentBoundary: false,
      smallGapLimit: 0.5,
      jumpLargeGaps: false,
      durationBackoff: 1,
      forceTransmuxTS: false,
      // Offset by 5 seconds since Chromecast takes a few seconds to start
      // playing after a seek, even when buffered.
      safeSeekOffset: 5,
      stallEnabled: true,
      stallThreshold: 1 /*  seconds */,
      stallSkip: 0.1 /*  seconds */,
      useNativeHlsOnSafari: true,
      // If we are within 2 seconds of the start of a live segment, fetch the
      // previous one.  This allows for segment drift, but won't download an
      // extra segment if we aren't close to the start.
      inaccurateManifestTolerance: 2
    }

    // WebOS has a long hardware pipeline that responds slowly, making it easy
    // to misidentify stalls. To avoid this, by default disable stall detection
    // on WebOS.
    if (Platform.isWebOS()) {
      streaming.stallEnabled = false
    }

    const offline = {
      // We need to set this to a throw-away implementation for now as our
      // default implementation will need to reference other fields in the
      // config. We will set it to our intended implementation after we have
      // the top-level object created.
      // eslint-disable-next-line require-await
      trackSelectionCallback: async(tracks) => tracks,

      // Need some operation in the callback or else closure may remove calls
      // to the function as it would be a no-op.  The operation can't just be a
      // log message, because those are stripped in the compiled build.
      progressCallback: (content, progress) => {
        return [content, progress]
      }
    }

    const abr = {
      enabled: true,
      defaultBandwidthEstimate: bandwidthEstimate,
      switchInterval: 8,
      bandwidthUpgradeTarget: 0.85,
      bandwidthDowngradeTarget: 0.95,
      restrictions: {
        minWidth: 0,
        maxWidth: Infinity,
        minHeight: 0,
        maxHeight: abrMaxHeight,
        minPixels: 0,
        maxPixels: Infinity,
        minFrameRate: 0,
        maxFrameRate: Infinity,
        minBandwidth: 0,
        maxBandwidth: Infinity
      }
    }

    /* * @type {shaka.extern.PlayerConfiguration} */
    const config = {
      manifest: manifest,
      streaming: streaming,
      offline: offline,
      abrFactory: () => new SimpleAbrManager(),
      abr: abr,
      preferredAudioLanguage: '',
      preferredTextLanguage: '',
      preferredVariantRole: '',
      preferredTextRole: '',
      preferredAudioChannelCount: 2,
      restrictions: {
        minWidth: 0,
        maxWidth: Infinity,
        minHeight: 0,
        maxHeight: Infinity,
        minPixels: 0,
        maxPixels: Infinity,
        minFrameRate: 0,
        maxFrameRate: Infinity,
        minBandwidth: 0,
        maxBandwidth: Infinity
      },
      playRangeStart: 0,
      playRangeEnd: Infinity,
      textDisplayFactory: () => null
    }

    // Add this callback so that we can reference the preferred audio language
    // through the config object so that if it gets updated, we have the
    // updated value.
    // eslint-disable-next-line require-await
    offline.trackSelectionCallback = async(tracks) => {
      return PlayerConfiguration.defaultTrackSelect(
        tracks, config.preferredAudioLanguage)
    }

    return config
  }

  /* *
   * Merges the given configuration changes into the given destination.  This
   * uses the default Player configurations as the template.
   *
   * @param {shaka.extern.PlayerConfiguration} destination
   * @param {!Object} updates
   * @param {shaka.extern.PlayerConfiguration=} template
   * @return {boolean}
   * @export
   */
  static mergeConfigObjects(destination, updates, template) {
    return ConfigUtils.mergeConfigObjects(
      destination, updates,
      template || PlayerConfiguration.createDefault(), null,
      '')
  }

  /* *
   * @param {!Array.<shaka.extern.Track>} tracks
   * @param {string} preferredAudioLanguage
   * @return {!Array.<shaka.extern.Track>}
   */
  static defaultTrackSelect(tracks, preferredAudioLanguage) {
    const ContentType = ManifestParserUtils.ContentType
    const LanguageUtils = LanguageUtils

    /* * @type {!Array.<shaka.extern.Track>} */
    const allVariants = tracks.filter((track) => track.type === 'variant')

    /* * @type {!Array.<shaka.extern.Track>} */
    let selectedVariants = []

    // Find the locale that best matches our preferred audio locale.
    const closestLocale = LanguageUtils.findClosestLocale(
      preferredAudioLanguage,
      allVariants.map((variant) => variant.language))
    // If we found a locale that was close to our preference, then only use
    // variants that use that locale.
    if (closestLocale) {
      selectedVariants = allVariants.filter((variant) => {
        const locale = LanguageUtils.normalize(variant.language)
        return locale === closestLocale
      })
    }

    // If we failed to get a language match, go with primary.
    if (selectedVariants.length === 0) {
      selectedVariants = allVariants.filter((variant) => {
        return variant.primary
      })
    }

    // Otherwise, there is no good way to choose the language, so we don't
    // choose a language at all.
    if (selectedVariants.length === 0) {
      // Issue a warning, but only if the content has multiple languages.
      // Otherwise, this warning would just be noise.
      const languages = new Set(allVariants.map((track) => {
        return track.language
      }))

      if (languages.size > 1) {
        console.warning('Could not choose a good audio track based on ' +
                          'language preferences or primary tracks.  An ' +
                          'arbitrary language will be stored!')
      }

      // Default back to all variants.
      selectedVariants = allVariants
    }

    // From previously selected variants, choose the SD ones (height <= 480).
    const tracksByHeight = selectedVariants.filter((track) => {
      return track.height && track.height <= 480
    })

    // If variants don't have video or no video with height <= 480 was
    // found, proceed with the previously selected tracks.
    if (tracksByHeight.length) {
      // Sort by resolution, then select all variants which match the height
      // of the highest SD res.  There may be multiple audio bitrates for the
      // same video resolution.
      tracksByHeight.sort((a, b) => b.height - a.height)
      selectedVariants = tracksByHeight.filter((track) => {
        return track.height === tracksByHeight[0].height
      })
    }

    /* * @type {!Array.<shaka.extern.Track>} */
    const selectedTracks = []

    // If there are multiple matches at different audio bitrates, select the
    // middle bandwidth one.
    if (selectedVariants.length) {
      const middleIndex = Math.floor(selectedVariants.length / 2)
      selectedVariants.sort((a, b) => a.bandwidth - b.bandwidth)
      selectedTracks.push(selectedVariants[middleIndex])
    }

    // Since this default callback is used primarily by our own demo app and by
    // app developers who haven't thought about which tracks they want, we
    // should select all text tracks, regardless of language.  This makes for a
    // better demo for us, and does not rely on user preferences for the
    // unconfigured app.
    for (const track of tracks) {
      if (track.type === ContentType.TEXT) {
        selectedTracks.push(track)
      }
    }

    return selectedTracks
  }
}

/* *
 * @summary
 * This defines the default text displayer plugin. An instance of this
 * class is used when no custom displayer is given.
 *
 * This class simply converts Cue objects to
 * TextTrackCues and feeds them to the browser.
 *
 * @implements {shaka.extern.TextDisplayer}
 * @export
 */
class SimpleTextDisplayer {
  /* * @param {HTMLMediaElement} video */
  constructor(video) {
    /* * @private {TextTrack} */
    this.textTrack_ = null

    // TODO: Test that in all cases, the built-in CC controls in the video
    // element are toggling our TextTrack.

    // If the video element has TextTracks, disable them.  If we see one that
    // was created by a previous instance of Shaka Player, reuse it.
    for (const track of Array.from(video.textTracks)) {
      track.mode = 'disabled'

      if (track.label === SimpleTextDisplayer.TextTrackLabel_) {
        this.textTrack_ = track
      }
    }

    if (!this.textTrack_) {
      // As far as I can tell, there is no observable difference between setting
      // kind to 'subtitles' or 'captions' when creating the TextTrack object.
      // The individual text tracks from the manifest will still have their own
      // kinds which can be displayed in the app's UI.
      this.textTrack_ = video.addTextTrack(
        'subtitles', SimpleTextDisplayer.TextTrackLabel_)
    }
    this.textTrack_.mode = 'hidden'
  }

  /* *
   * @override
   * @export
   */
  remove(start, end) {
    // Check that the displayer hasn't been destroyed.
    if (!this.textTrack_) {
      return false
    }

    const removeInRange = (cue) => {
      const inside = cue.startTime < end && cue.endTime > start
      return inside
    }

    SimpleTextDisplayer.removeWhere_(this.textTrack_, removeInRange)

    return true
  }

  /* *
   * @override
   * @export
   */
  append(cues) {
    const convertToTextTrackCue =
        SimpleTextDisplayer.convertToTextTrackCue_

    // Convert cues.
    const textTrackCues = []
    for (const inCue of cues) {
      const cue = convertToTextTrackCue(inCue)
      if (cue) {
        textTrackCues.push(cue)
      }
    }

    // Sort the cues based on start/end times.  Make a copy of the array so
    // we can get the index in the original ordering.  Out of order cues are
    // rejected by IE/Edge.  See https://bit.ly/2K9VX3s
    const sortedCues = textTrackCues.slice().sort((a, b) => {
      if (a.startTime !== b.startTime) {
        return a.startTime - b.startTime
      } else if (a.endTime !== b.endTime) {
        return a.endTime - b.startTime
      } else {
        // The browser will display cues with identical time ranges from the
        // bottom up.  Reversing the order of equal cues means the first one
        // parsed will be at the top, as you would expect.
        // See https://github.com/google/shaka-player/issues/848 for more info.
        return textTrackCues.indexOf(b) - textTrackCues.indexOf(a)
      }
    })

    for (const cue of sortedCues) {
      this.textTrack_.addCue(cue)
    }
  }

  /* *
   * @override
   * @export
   */
  destroy() {
    if (this.textTrack_) {
      const removeIt = (cue) => true
      SimpleTextDisplayer.removeWhere_(this.textTrack_, removeIt)
    }

    this.textTrack_ = null
    return Promise.resolve()
  }

  /* *
   * @override
   * @export
   */
  isTextVisible() {
    return this.textTrack_.mode === 'showing'
  }

  /* *
   * @override
   * @export
   */
  setTextVisibility(on) {
    this.textTrack_.mode = on ? 'showing' : 'hidden'
  }

  /* *
   * @param {!shaka.extern.Cue} shakaCue
   * @return {TextTrackCue}
   * @private
   */
  static convertToTextTrackCue_(shakaCue) {
    if (shakaCue.startTime >= shakaCue.endTime) {
      // IE/Edge will throw in this case.
      // See issue #501
      console.warning('Invalid cue times: ' + shakaCue.startTime +
                        ' - ' + shakaCue.endTime)
      return null
    }

    /* * @type {VTTCue} */
    const vttCue = new VTTCue(shakaCue.startTime,
      shakaCue.endTime,
      shakaCue.payload)

    // NOTE: positionAlign and lineAlign settings are not supported by Chrome
    // at the moment, so setting them will have no effect.
    // The bug on chromium to implement them:
    // https://bugs.chromium.org/p/chromium/issues/detail?id=633690

    vttCue.lineAlign = shakaCue.lineAlign
    vttCue.positionAlign = shakaCue.positionAlign
    vttCue.size = shakaCue.size
    try {
      // Safari 10 seems to throw on align='center'.
      vttCue.align = shakaCue.textAlign
    } catch (exception) {
      console.log(exception)
    }

    if (shakaCue.textAlign === 'center' && vttCue.align !== 'center') {
      // We want vttCue.position = 'auto'. By default, |position| is set to
      // 'auto'. If we set it to 'auto' safari will throw an exception, so we
      // must rely on the default value.
      vttCue.align = 'middle'
    }

    if (shakaCue.writingMode ===
            Cue.writingMode.VERTICAL_LEFT_TO_RIGHT) {
      vttCue.vertical = 'lr'
    } else if (shakaCue.writingMode ===
             Cue.writingMode.VERTICAL_RIGHT_TO_LEFT) {
      vttCue.vertical = 'rl'
    }

    // snapToLines flag is true by default
    if (shakaCue.lineInterpretation === Cue.lineInterpretation.PERCENTAGE) {
      vttCue.snapToLines = false
    }

    if (shakaCue.line !== null) {
      vttCue.line = shakaCue.line
    }

    if (shakaCue.position !== null) {
      vttCue.position = shakaCue.position
    }

    return vttCue
  }

  /* *
   * Iterate over all the cues in a text track and remove all those for which
   * |predicate(cue)| returns true.
   *
   * @param {!TextTrack} track
   * @param {function(!TextTrackCue):boolean} predicate
   * @private
   */
  static removeWhere_(track, predicate) {
    // Since |track.cues| can be null if |track.mode| is 'disabled', force it to
    // something other than 'disabled'.
    //
    // If the track is already showing, then we should keep it as showing. But
    // if it something else, we will use hidden so that we don't 'flash' cues on
    // the screen.
    const oldState = track.mode
    const tempState = oldState === 'showing' ? 'showing' : 'hidden'

    track.mode = tempState

    console.assert(
      track.cues,
      'Cues should be accessible when mode is set to `' + tempState + '`.')

    // Create a copy of the list to avoid errors while iterating.
    for (const cue of Array.from(track.cues)) {
      if (cue && predicate(cue)) {
        track.removeCue(cue)
      }
    }

    track.mode = oldState
  }
}

/* *
 * @const {string}
 * @private
 */
SimpleTextDisplayer.TextTrackLabel_ = 'Shaka Player TextTrack'

/* *
 * This class is used to track the time spent in arbitrary states. When told of
 * a state, it will assume that state was active until a new state is provided.
 * When provided with identical states back-to-back, the existing entry will be
 * updated.
 *
 * @final
 */
class StateHistory {
  constructor() {
    /* *
     * The state that we think is still the current change. It is 'open' for
     * updating.
     *
     * @private {?shaka.extern.StateChange}
     */
    this.open_ = null

    /* *
     * The stats that are 'closed' for updating. The 'open' state becomes closed
     * once we move to a new state.
     *
     * @private {!Array.<shaka.extern.StateChange>}
     */
    this.closed_ = []
  }

  /* *
   * @param {string} state
   */
  update(state) {
    // |open_| will only be |null| when we first call |update|.
    if (this.open_ === null) {
      this.start_(state)
    } else {
      this.update_(state)
    }
  }

  /* *
   * Go through all entries in the history and count how much time was spend in
   * the given state.
   *
   * @param {string} state
   * @return {number}
   */
  getTimeSpentIn(state) {
    let sum = 0

    if (this.open_ && this.open_.state === state) {
      sum += this.open_.duration
    }

    for (const entry of this.closed_) {
      sum += entry.state === state ? entry.duration : 0
    }

    return sum
  }

  /* *
   * Get a copy of each state change entry in the history. A copy of each entry
   * is created to break the reference to the internal data.
   *
   * @return {!Array.<shaka.extern.StateChange>}
   */
  getCopy() {
    const clone = (entry) => {
      return {
        timestamp: entry.timestamp,
        state: entry.state,
        duration: entry.duration
      }
    }

    const copy = []
    for (const entry of this.closed_) {
      copy.push(clone(entry))
    }
    if (this.open_) {
      copy.push(clone(this.open_))
    }

    return copy
  }

  /* *
   * @param {string} state
   * @private
   */
  start_(state) {
    console.assert(
      this.open_ === null,
      'There must be no open entry in order when we start')
    console.info('Changing Player state to', state)

    this.open_ = {
      timestamp: this.getNowInSeconds_(),
      state: state,
      duration: 0
    }
  }

  /* *
   * @param {string} state
   * @private
   */
  update_(state) {
    console.assert(
      this.open_,
      'There must be an open entry in order to update it')

    const currentTimeSeconds = this.getNowInSeconds_()

    // Always update the duration so that it can always be as accurate as
    // possible.
    this.open_.duration = currentTimeSeconds - this.open_.timestamp

    // If the state has not changed, there is no need to add a new entry.
    if (this.open_.state === state) {
      return
    }

    // We have changed states, so 'close' the open state.
    console.info('Changing Player state to', state)
    this.closed_.push(this.open_)
    this.open_ = {
      timestamp: currentTimeSeconds,
      state: state,
      duration: 0
    }
  }

  /* *
   * Get the system time in seconds.
   *
   * @return {number}
   * @private
   */
  getNowInSeconds_() {
    return Date.now() / 1000
  }
}

/* *
 * This class is used to track changes in variant and text selections. This
 * class will make sure that redundant switches are not recorded in the history.
 *
 * @final
 */
class SwitchHistory {
  constructor() {
    /* * @private {?shaka.extern.Variant} */
    this.currentVariant_ = null

    /* * @private {?shaka.extern.Stream} */
    this.currentText_ = null

    /* * @private {!Array.<shaka.extern.TrackChoice>} */
    this.history_ = []
  }

  /* *
   * Update the history to show that we are currently playing |newVariant|. If
   * we are already playing |newVariant|, this update will be ignored.
   *
   * @param {shaka.extern.Variant} newVariant
   * @param {boolean} fromAdaptation
   */
  updateCurrentVariant(newVariant, fromAdaptation) {
    if (this.currentVariant_ === newVariant) {
      return
    }

    this.currentVariant_ = newVariant
    this.history_.push({
      timestamp: this.getNowInSeconds_(),
      id: newVariant.id,
      type: 'variant',
      fromAdaptation: fromAdaptation,
      bandwidth: newVariant.bandwidth
    })
  }

  /* *
   * Update the history to show that we are currently playing |newText|. If we
   * are already playing |newText|, this update will be ignored.
   *
   * @param {shaka.extern.Stream} newText
   * @param {boolean} fromAdaptation
   */
  updateCurrentText(newText, fromAdaptation) {
    if (this.currentText_ === newText) {
      return
    }

    this.currentText_ = newText
    this.history_.push({
      timestamp: this.getNowInSeconds_(),
      id: newText.id,
      type: 'text',
      fromAdaptation: fromAdaptation,
      bandwidth: null
    })
  }

  /* *
   * Get a copy of the switch history. This will make sure to expose no internal
   * references.
   *
   * @return {!Array.<shaka.extern.TrackChoice>}
   */
  getCopy() {
    const copy = []

    for (const entry of this.history_) {
      copy.push(this.clone_(entry))
    }

    return copy
  }

  /* *
   * Get the system time in seconds.
   *
   * @return {number}
   * @private
   */
  getNowInSeconds_() {
    return Date.now() / 1000
  }

  /* *
   * @param {shaka.extern.TrackChoice} entry
   * @return {shaka.extern.TrackChoice}
   * @private
   */
  clone_(entry) {
    return {
      timestamp: entry.timestamp,
      id: entry.id,
      type: entry.type,
      fromAdaptation: entry.fromAdaptation,
      bandwidth: entry.bandwidth
    }
  }
}

/* *
 * This class tracks all the various components (some optional) that are used to
 * populate |shaka.extern.Stats| which is passed to the app.
 *
 * @final
 */
class Stats {
  constructor() {
    /* * @private {number} */
    this.width_ = NaN
    /* * @private {number} */
    this.height_ = NaN

    /* * @private {number} */
    this.totalDroppedFrames_ = NaN
    /* * @private {number} */
    this.totalDecodedFrames_ = NaN
    /* * @private {number} */
    this.totalCorruptedFrames_ = NaN

    /* * @private {number} */
    this.loadLatencySeconds_ = NaN

    /* * @private {number} */
    this.manifestTimeSeconds_ = NaN

    /* * @private {number} */
    this.licenseTimeSeconds_ = NaN

    /* * @private {number} */
    this.currentStreamBandwidth_ = NaN
    /* * @private {number} */
    this.bandwidthEstimate_ = NaN

    /* * @private {!StateHistory} */
    this.stateHistory_ = new StateHistory()

    /* * @private {!SwitchHistory} */
    this.switchHistory_ = new SwitchHistory()
  }

  /* *
   * Update the ratio of dropped frames to total frames. This will replace the
   * previous values.
   *
   * @param {number} dropped
   * @param {number} decoded
   */
  setDroppedFrames(dropped, decoded) {
    this.totalDroppedFrames_ = dropped
    this.totalDecodedFrames_ = decoded
  }
  /* *
   * Update corrupted frames. This will replace the previous values.
   *
   * @param {number} corrupted
   */
  setCorruptedFrames(corrupted) {
    this.totalCorruptedFrames_ = corrupted
  }

  /* *
   * Set the width and height of the video we are currently playing.
   *
   * @param {number} width
   * @param {number} height
   */
  setResolution(width, height) {
    this.width_ = width
    this.height_ = height
  }

  /* *
   * Record the time it took between the user signalling 'I want to play this'
   * to 'I am now seeing this'.
   *
   * @param {number} seconds
   */
  setLoadLatency(seconds) {
    this.loadLatencySeconds_ = seconds
  }

  /* *
   * Record the time it took to download and parse the manifest.
   *
   * @param {number} seconds
   */
  setManifestTime(seconds) {
    this.manifestTimeSeconds_ = seconds
  }

  /* *
   * Record the cumulative time spent on license requests during this session.
   *
   * @param {number} seconds
   */
  setLicenseTime(seconds) {
    this.licenseTimeSeconds_ = seconds
  }

  /* *
   * @param {number} bandwidth
   */
  setCurrentStreamBandwidth(bandwidth) {
    this.currentStreamBandwidth_ = bandwidth
  }

  /* *
   * @param {number} bandwidth
   */
  setBandwidthEstimate(bandwidth) {
    this.bandwidthEstimate_ = bandwidth
  }

  /* *
   * @return {!StateHistory}
   */
  getStateHistory() {
    return this.stateHistory_
  }

  /* *
   * @return {!SwitchHistory}
   */
  getSwitchHistory() {
    return this.switchHistory_
  }

  /* *
   * Create a stats blob that we can pass up to the app. This blob will not
   * reference any internal data.
   *
   * @return {shaka.extern.Stats}
   */
  getBlob() {
    return {
      width: this.width_,
      height: this.height_,
      streamBandwidth: this.currentStreamBandwidth_,
      decodedFrames: this.totalDecodedFrames_,
      droppedFrames: this.totalDroppedFrames_,
      corruptedFrames: this.totalCorruptedFrames_,
      estimatedBandwidth: this.bandwidthEstimate_,
      loadLatency: this.loadLatencySeconds_,
      manifestTimeSeconds: this.manifestTimeSeconds_,
      playTime: this.stateHistory_.getTimeSpentIn('playing'),
      pauseTime: this.stateHistory_.getTimeSpentIn('paused'),
      bufferingTime: this.stateHistory_.getTimeSpentIn('buffering'),
      licenseTime: this.licenseTimeSeconds_,
      stateHistory: this.stateHistory_.getCopy(),
      switchHistory: this.switchHistory_.getCopy()
    }
  }

  /* *
   * Create an empty stats blob. This resembles the stats when we are not
   * playing any content.
   *
   * @return {shaka.extern.Stats}
   */
  static getEmptyBlob() {
    return {
      width: NaN,
      height: NaN,
      streamBandwidth: NaN,
      decodedFrames: NaN,
      droppedFrames: NaN,
      corruptedFrames: NaN,
      estimatedBandwidth: NaN,
      loadLatency: NaN,
      manifestTimeSeconds: NaN,
      playTime: NaN,
      pauseTime: NaN,
      bufferingTime: NaN,
      licenseTime: NaN,
      switchHistory: [],
      stateHistory: []
    }
  }
}

// import IDestroyable from '../util/i_destroyable'

/* *
 * The walker moves through a graph node-by-node executing asynchronous work
 * as it enters each node.
 *
 * The walker accepts requests for where it should go next. Requests are queued
 * and executed in FIFO order. If the current request can be interrupted, it
 * will be cancelled and the next request started.
 *
 * A request says 'I want to change where we are going'. When the walker is
 * ready to change destinations, it will resolve the request, allowing the
 * destination to differ based on the current state and not the state when
 * the request was appended.
 *
 * Example (from shaka.Player):
 *  When we unload, we need to either go to the attached or detached state based
 *  on whether or not we have a video element.
 *
 *  When we are asked to unload, we don't know what other pending requests may
 *  be ahead of us (there could be attach requests or detach requests). We need
 *  to wait until its our turn to know if:
 *    - we should go to the attach state because we have a media element
 *    - we should go to the detach state because we don't have a media element
 *
 * The walker allows the caller to specify if a route can or cannot be
 * interrupted. This is to allow potentially dependent routes to wait until
 * other routes have finished.
 *
 * Example (from shaka.Player):
 *  A request to load content depends on an attach request finishing. We don't
 *  want load request to interrupt an attach request. By marking the attach
 *  request as non-interruptible we ensure that calling load before attach
 *  finishes will work.
 *
 * @implements {IDestroyable}
 * @final
 */
class Walker {
  /* *
   * Create a new walker that starts at |startingAt| and with |startingWith|.
   * The instance of |startingWith| will be the one that the walker holds and
   * uses for its life. No one else should reference it.
   *
   * The per-instance behaviour for the walker is provided via |implementation|
   * which is used to connect this walker with the 'outside world'.
   *
   * @param {Node} startingAt
   * @param {Payload} startingWith
   * @param {Walker.Implementation} implementation
   */
  constructor(startingAt, startingWith, implementation) {
    /* * @private {?Walker.Implementation} */
    this.implementation_ = implementation

    /* * @private {Node} */
    this.currentlyAt_ = startingAt

    /* * @private {Payload} */
    this.currentlyWith_ = startingWith

    /* *
     * When we run out of work to do, we will set this promise so that when
     * new work is added (and this is not null) it can be resolved. The only
     * time when this should be non-null is when we are waiting for more work.
     *
     * @private {PublicPromise}
     */
    this.waitForWork_ = null

    /* * @private {!Array.<Walker.Request_>} */
    this.requests_ = []

    /* * @private {?Walker.ActiveRoute_} */
    this.currentRoute_ = null

    /* * @private {AbortableOperation} */
    this.currentStep_ = null

    /* *
     * Hold a reference to the main loop's promise so that we know when it has
     * exited. This will determine when |destroy| can resolve. Purposely make
     * the main loop start next interpreter cycle so that the constructor will
     * finish before it starts.
     *
     * @private {!Promise}
     */
    this.mainLoopPromise_ = Promise.resolve().then(() => this.mainLoop_())

    /* * @private {!Destroyer} */
    this.destroyer_ = new Destroyer(() => this.doDestroy_())
  }

  /* * @override */
  destroy() {
    return this.destroyer_.destroy()
  }

  /* * @private */
  async doDestroy_() {
    // If we are executing a current step, we want to interrupt it so that we
    // can force the main loop to terminate.
    if (this.currentStep_) {
      this.currentStep_.abort()
    }

    // If we are waiting for more work, we want to wake-up the main loop so that
    // it can exit on its own.
    this.unblockMainLoop_()

    // Wait for the main loop to terminate so that an async operation won't
    // try and use state that we released.
    await this.mainLoopPromise_

    // Any routes that we are not going to finish, we need to cancel. If we
    // don't do this, those listening will be left hanging.
    if (this.currentRoute_) {
      this.currentRoute_.listeners.onCancel()
    }
    for (const request of this.requests_) {
      request.listeners.onCancel()
    }

    // Release anything that could hold references to anything outside of this
    // class.
    this.currentRoute_ = null
    this.requests_ = []
    this.implementation_ = null
  }

  /* *
   * Ask the walker to start a new route. When the walker is ready to start a
   * new route, it will call |create| and |create| will provide the walker with
   * a new route to execute.
   *
   * If any previous calls to |startNewRoute| created non-interruptible routes,
   * |create| won't be called until all previous non-interruptible routes have
   * finished.
   *
   * This method will return a collection of listeners that the caller can hook
   * into. Any listener that the caller is interested should be assigned
   * immediately after calling |startNewRoute| or else they could miss the event
   * they want to listen for.
   *
   * @param {function(Payload):?Walker.Route} create
   * @return {Walker.Listeners}
   */
  startNewRoute(create) {
    const listeners = {
      onStart: () => {},
      onEnd: () => {},
      onCancel: () => {},
      onError: (error) => {
        console.log(error)
      },
      onSkip: () => {},
      onEnter: () => {}
    }

    this.requests_.push({
      create: create,
      listeners: listeners
    })

    // If we are in the middle of a step, try to abort it. If this is successful
    // the main loop will error and the walker will enter recovery mode.
    if (this.currentStep_) {
      this.currentStep_.abort()
    }

    // Tell the main loop that new work is available. If the main loop was not
    // blocked, this will be a no-op.
    this.unblockMainLoop_()

    return listeners
  }

  /* *
   * @return {!Promise}
   * @private
   */
  async mainLoop_() {
    while (!this.destroyer_.destroyed()) {
      // eslint-disable-next-line no-await-in-loop
      await this.doOneThing_()
    }
  }

  /* *
   * Do one thing to move the walker closer to its destination. This can be:
   *   1. Starting a new route.
   *   2. Taking one more step/finishing a route.
   *   3. Wait for a new route.
   *
   * @return {!Promise}
   * @private
   */
  doOneThing_() {
    if (this.tryNewRoute_()) {
      return Promise.resolve()
    }

    if (this.currentRoute_) {
      return this.takeNextStep_()
    }

    console.assert(this.waitForWork_ === null,
      'We should not have a promise yet.')

    // We have no more work to do. We will wait until new work has been provided
    // via request route or until we are destroyed.

    this.implementation_.onIdle(this.currentlyAt_)

    // Wait on a new promise so that we can be resolved by |waitForWork|. This
    // avoids us acting like a busy-wait.
    this.waitForWork_ = new PublicPromise()
    return this.waitForWork_
  }

  /* *
   * Check if the walker can start a new route. There are a couple ways this can
   * happen:
   *  1. We have a new request but no current route
   *  2. We have a new request and our current route can be interrupted
   *
   * @return {boolean}
   *    |true| when a new route was started (regardless of reason) and |false|
   *    when no new route was started.
   *
   * @private
   */
  tryNewRoute_() {
    console.assert(
      this.currentStep_ === null,
      'We should never have a current step between taking steps.')

    if (this.requests_.length === 0) {
      return false
    }

    // If the current route cannot be interrupted, we can't start a new route.
    if (this.currentRoute_ && !this.currentRoute_.interruptible) {
      return false
    }

    // Stop any previously active routes. Even if we don't pick-up a new route,
    // this route should stop.
    if (this.currentRoute_) {
      this.currentRoute_.listeners.onCancel()
      this.currentRoute_ = null
    }

    // Create and start the next route. We may not take any steps because it may
    // be interrupted by the next request.
    const request = this.requests_.shift()
    const newRoute = request.create(this.currentlyWith_)

    // Based on the current state of |payload|, a new route may not be
    // possible. In these cases |create| will return |null| to signal that
    // we should just stop the current route and move onto the next request
    // (in the next main loop iteration).
    if (newRoute) {
      request.listeners.onStart()

      // Convert the route created from the request's create method to an
      // active route.
      this.currentRoute_ = {
        node: newRoute.node,
        payload: newRoute.payload,
        interruptible: newRoute.interruptible,
        listeners: request.listeners
      }
    } else {
      request.listeners.onSkip()
    }

    return true
  }
  /* *
   * Move forward one step on our current route. This assumes that we have a
   * current route. A couple things can happen when moving forward:
   *  1. An error - if an error occurs, it will signal an error occurred,
   *     attempt to recover, and drop the route.
   *  2. Move - if no error occurs, we will move forward. When we arrive at
   *     our destination, it will signal the end and drop the route.
   *
   * In the event of an error or arriving at the destination, we drop the
   * current route. This allows us to pick-up a new route next time the main
   * loop iterates.
   *
   * @return {!Promise}
   * @private
   */
  async takeNextStep_() {
    console.assert(
      this.currentRoute_,
      'We need a current route to take the next step.')

    // Figure out where we are supposed to go next.
    this.currentlyAt_ = this.implementation_.getNext(
      this.currentlyAt_,
      this.currentlyWith_,
      this.currentRoute_.node,
      this.currentRoute_.payload)

    this.currentRoute_.listeners.onEnter(this.currentlyAt_)

    // Enter the new node, this is where things can go wrong since it is
    // possible for 'supported errors' to occur - errors that the code using
    // the walker can't predict but can recover from.
    try {
      // TODO: This is probably a false-positive.  See eslint/eslint#11687.
      // eslint-disable-next-line require-atomic-updates
      this.currentStep_ = this.implementation_.enterNode(
        /*  node= */ this.currentlyAt_,
        /*  has= */ this.currentlyWith_,
        /*  wants= */ this.currentRoute_.payload)

      await this.currentStep_.promise
      this.currentStep_ = null

      // If we are at the end of the route, we need to signal it and clear the
      // route so that we will pick-up a new route next iteration.
      if (this.currentlyAt_ === this.currentRoute_.node) {
        this.currentRoute_.listeners.onEnd()
        this.currentRoute_ = null
      }
    } catch (error) {
      if (error.code === Error$1.Code.OPERATION_ABORTED) {
        console.assert(
          this.currentRoute_.interruptible,
          'Do not put abortable steps in non-interruptible routes!')
        this.currentRoute_.listeners.onCancel()
      } else {
        // There was an error with this route, so we going to abandon it and
        // resolve the error. We don't reset the payload because the payload may
        // still contain useful information.
        this.currentRoute_.listeners.onError(error)
      }

      // The route and step are done. Clear them before we handle the error or
      // else we may attempt to abort |currentStep_| when handling the error.
      this.currentRoute_ = null
      this.currentStep_ = null

      // Still need to handle error because aborting an operation could leave us
      // in an unexpected state.
      this.currentlyAt_ = await this.implementation_.handleError(
        this.currentlyWith_,
        error)
    }
  }

  /* *
   * If the main loop is blocked waiting for new work, then resolve the promise
   * so that the next iteration of the main loop can execute.
   *
   * @private
   */
  unblockMainLoop_() {
    if (this.waitForWork_) {
      this.waitForWork_.resolve()
      this.waitForWork_ = null
    }
  }
}

const LoadMode = {
  'DESTROYED': 0,
  'NOT_LOADED': 1,
  'MEDIA_SOURCE': 2,
  'SRC_EQUALS': 3
}

/* *
 * The typical buffering threshold.  When we have less than this buffered (in
 * seconds), we enter a buffering state.  This specific value is based on manual
 * testing and evaluation across a variety of platforms.
 *
 * To make the buffering logic work in all cases, this 'typical' threshold will
 * be overridden if the rebufferingGoal configuration is too low.
 *
 * @const {number}
 * @private
 */
const TYPICAL_BUFFERING_THRESHOLD_ = 0.5

const restrictedStatuses_ = ['output-restricted', 'internal-error']

class Player extends FakeEventTarget {
  /* *
   * @param {dom元素} mediaElement
   *    When provided, the player will attach to <code>mediaElement</code>,
   *    similar to calling <code>attach</code>. When not provided, the player
   *    will remain detached.
   */
  constructor(mediaElement) {
    super()
    this.loadMode_ = LoadMode.NOT_LOADED

    /* * @private {HTMLMediaElement} */
    this.video_ = null

    /* *
     * Since we may not always have a text displayer created (e.g. before |load|
     * is called), we need to track what text visibility SHOULD be so that we
     * can ensure that when we create the text displayer. When we create our
     * text displayer, we will use this to show (or not show) text as per the
     * user's requests.
     *
     * @private {boolean}
     */
    this.isTextVisible_ = false

    /* * @private {EventManager} */
    this.eventManager_ = new EventManager()

    /* * @private {media.MediaSourceEngine} */
    this.mediaSourceEngine_ = null

    /* * @private {media.Playhead} */
    this.playhead_ = null

    /* *
     * The playhead observers are used to monitor the position of the playhead
     * and some other source of data (e.g. buffered content), and raise events.
     * 用于监视播放头和其他数据源（例如，缓冲的内容）的位置，并触发相应事件
     * @private {media.PlayheadObserverManager}
     */
    this.playheadObservers_ = null

    /* *
     * This is our control over the playback rate of the media element. This
     * provides the missing functionality that we need to provide trick play,
     * for example a negative playback rate.
     * 媒体元素播放速率的控制器
     * @private {media.PlayRateController}
     */
    this.playRateController_ = null

    // We use the buffering observer and timer to track when we move from having
    // enough buffered content to not enough. They only exist when content has
    // been loaded and are not re-used between loads.
    // 使用缓冲的观察器和计时器来跟踪何时从拥有足够的缓冲内容变为不足
    /* * @private {Timer} */
    this.bufferPoller_ = null

    /* * @private {media.BufferingObserver} */
    this.bufferObserver_ = null

    /* * @private {media.RegionTimeline} */
    this.regionTimeline_ = null

    /* * @private {media.StreamingEngine} */
    this.streamingEngine_ = null

    /* * @private {shaka.extern.ManifestParser} */
    this.parser_ = null

    /* * @private {?shaka.extern.ManifestParser.Factory} */
    this.parserFactory_ = null

    /* * @private {?shaka.extern.Manifest} */
    this.manifest_ = null

    /* * @private {?string} */
    this.assetUri_ = null

    /* * @private {shaka.extern.AbrManager} */
    this.abrManager_ = null

    /* *
     * The factory that was used to create the abrManager_ instance.
     * @private {?shaka.extern.AbrManager.Factory}
     */
    this.abrManagerFactory_ = null

    /* *
     * Contains an ID for use with creating streams.  The manifest parser should
     * start with small IDs, so this starts with a large one.
     * @private {number}
     */
    this.nextExternalStreamId_ = 1e9

    /* * @private {!Set.<shaka.extern.Stream>} */
    this.loadingTextStreams_ = new Set()

    /* * @private {boolean} */
    this.switchingPeriods_ = true

    /* * @private {?shaka.extern.Variant} */
    this.deferredVariant_ = null

    /* * @private {boolean} */
    this.deferredVariantClearBuffer_ = false

    /* * @private {number} */
    this.deferredVariantClearBufferSafeMargin_ = 0

    /* * @private {?shaka.extern.Stream} */
    this.deferredTextStream_ = null

    /* *
     * A mapping of which streams are/were active in each period. Used when the
     * current period (the one containing playhead) differs from the active
     * period (the one being streamed in by streaming engine).
     *
     * @private {!media.ActiveStreamMap}
     */
    this.activeStreams_ = new ActiveStreamMap()

    this.config_ = this.defaultConfig_()

    /* *
     * The TextDisplayerFactory that was last used to make a text displayer.
     * Stored so that we can tell if a new type of text displayer is desired.
     * @private {?shaka.extern.TextDisplayer.Factory}
     */
    this.lastTextFactory_

    /* * @private {{width: number, height: number}} */
    this.maxHwRes_ = { width: Infinity, height: Infinity }

    /* * @private {Stats} */
    this.stats_ = null

    /* * @private {!media.AdaptationSetCriteria} */
    this.currentAdaptationSetCriteria_ =
        new PreferenceBasedCriteria(
          this.config_.preferredAudioLanguage,
          this.config_.preferredVariantRole,
          this.config_.preferredAudioChannelCount)

    /* * @private {string} */
    this.currentTextLanguage_ = this.config_.preferredTextLanguage

    /* * @private {string} */
    this.currentTextRole_ = this.config_.preferredTextRole

    this.networkingEngine_ = this.createNetworkingEngine()

    /* * @private {shaka.extern.IAdManager} */
    this.adManager_ = null

    if (Player.adManagerFactory_) {
      this.adManager_ = Functional.callFactory(Player.adManagerFactory_)
    }

    // If the browser comes back online after being offline, then try to play again.
    this.eventManager_.listen(window, 'online', () => {
      this.retryStreaming()
    })

    /* * @private {shaka.routing.Node} */
    this.detachNode_ = { name: 'detach' }
    /* * @private {shaka.routing.Node} */
    this.attachNode_ = { name: 'attach' }
    /* * @private {shaka.routing.Node} */
    this.unloadNode_ = { name: 'unload' }
    /* * @private {shaka.routing.Node} */
    this.parserNode_ = { name: 'manifest-parser' }
    /* * @private {shaka.routing.Node} */
    this.manifestNode_ = { name: 'manifest' }
    /* * @private {shaka.routing.Node} */
    this.mediaSourceNode_ = { name: 'media-source' }
    /* * @private {shaka.routing.Node} */
    this.loadNode_ = { name: 'load' }
    /* * @private {shaka.routing.Node} */
    this.srcEqualsNode_ = { name: 'src-equals' }

    const actions = new Map()
    actions.set(this.attachNode_, (has, wants) => {
      return AbortableOperation.notAbortable(this.onAttach_(has, wants))
    })
    actions.set(this.detachNode_, (has, wants) => {
      return AbortableOperation.notAbortable(this.onDetach_(has, wants))
    })
    actions.set(this.unloadNode_, (has, wants) => {
      return AbortableOperation.notAbortable(this.onUnload_(has, wants))
    })
    // actions.set(this.srcEqualsDrmNode_, (has, wants) => {
    //   const p = this.onInitializeSrcEqualsDrm_(has, wants)
    //   return AbortableOperation.notAbortable(p)
    // })
    actions.set(this.mediaSourceNode_, (has, wants) => {
      const p = this.onInitializeMediaSourceEngine_(has, wants)
      return AbortableOperation.notAbortable(p)
    })
    actions.set(this.parserNode_, (has, wants) => {
      const p = this.onInitializeParser_(has, wants)
      return AbortableOperation.notAbortable(p)
    })
    actions.set(this.manifestNode_, (has, wants) => {
      // This action is actually abortable, so unlike the other callbacks, this
      // one will return an abortable operation.
      return this.onParseManifest_(has, wants)
    })
    actions.set(this.loadNode_, (has, wants) => {
      return AbortableOperation.notAbortable(this.onLoad_(has, wants))
    })
    actions.set(this.srcEqualsNode_, (has, wants) => {
      return this.onSrcEquals_(has, wants)
    })

    /* * @private {routing.Walker.Implementation} */
    const walkerImplementation = {
      getNext: (at, has, goingTo, wants) => {
        return this.getNextStep_(at, has, goingTo, wants)
      },
      enterNode: (node, has, wants) => {
        this.dispatchEvent(this.makeEvent_(
          /*  name= */ conf.EventName.OnStateChange,
          /*  data= */ { 'state': node.name }))

        const action = actions.get(node)
        return action(has, wants)
      },
      handleError: async(has, error) => {
        console.warn('The walker saw an error:')
        if (error instanceof Error$1) {
          console.error('Error Code:', error.code)
        } else {
          console.error('Error Message:', error.message)
          console.error('Error Stack:', error.stack)
        }

        // Regardless of what state we were in, if there is an error, we unload.
        // This ensures that any initialized system will be torn-down and we
        // will go back to a safe foundation. We assume that the media element
        // is always safe to use after an error.
        await this.onUnload_(has, Player.createEmptyPayload_())

        // There are only two nodes that come before we start loading content,
        // attach and detach. If we have a media element, it means we were
        // attached to the element, and we can safely return to the attach state
        // (we assume that the video element is always re-usable). We favor
        // returning to the attach node since it means that the app won't need
        // to re-attach if it saw an error.
        return has.mediaElement ? this.attachNode_ : this.detachNode_
      },
      onIdle: (node) => {
        this.dispatchEvent(this.makeEvent_(
          /*  name= */ conf.EventName.OnStateIdle,
          /*  data= */ { 'state': node.name }))
      }
    }

    /* * @private {routing.Walker} */
    this.walker_ = new Walker(this.detachNode_, Player.createEmptyPayload_(), walkerImplementation)

    // Even though |attach| will start in later interpreter cycles, it should be
    // the LAST thing we do in the constructor because conceptually it relies on
    // player having been initialized.
    if (mediaElement) {
      this.attach(mediaElement, /*  initializeMediaSource= */ true)
    }
  }
  /* *
   * @return {Payload}
   * @private
   */
  static createEmptyPayload_() {
    return {
      mediaElement: null,
      mimeType: null,
      startTime: null,
      startTimeOfLoad: null,
      uri: null
    }
  }
  /* *
   * Applies playRangeStart and playRangeEnd to the given timeline. This will
   * only affect non-live content.
   *
   * @param {PresentationTimeline} timeline
   * @param {number} playRangeStart
   * @param {number} playRangeEnd
   *
   * @private
   */
  static applyPlayRange_(timeline, playRangeStart, playRangeEnd) {
    if (playRangeStart > 0) {
      if (timeline.isLive()) {
        console.warning(
          '|playRangeStart| has been configured for live content. ' +
            'Ignoring the setting.')
      } else {
        timeline.setUserSeekStart(playRangeStart)
      }
    }

    // If the playback has been configured to end before the end of the
    // presentation, update the duration unless it's live content.
    const fullDuration = timeline.getDuration()
    if (playRangeEnd < fullDuration) {
      if (timeline.isLive()) {
        console.warning(
          '|playRangeEnd| has been configured for live content. ' +
            'Ignoring the setting.')
      } else {
        timeline.setDuration(playRangeEnd)
      }
    }
  }
  /* *
   * @return {shaka.extern.PlayerConfiguration}
   * @private
   */
  defaultConfig_() {
    const config = PlayerConfiguration.createDefault()
    config.streaming.failureCallback = (error) => {
      this.defaultStreamingFailureCallback_(error)
    }

    // Because this.video_ may not be set when the config is built, the default
    // TextDisplay factory must capture a reference to `this`.
    config.textDisplayFactory = () => new SimpleTextDisplayer(this.video_)

    return config
  }
  defaultStreamingFailureCallback_(error) {
    const retryErrorCodes = [
      Error$1.Code.BAD_HTTP_STATUS,
      Error$1.Code.HTTP_ERROR,
      Error$1.Code.TIMEOUT
    ]

    if (this.isLive() && retryErrorCodes.includes(error.code)) {
      error.severity = Error$1.Severity.RECOVERABLE

      console.warning('Live streaming error.  Retrying automatically...')
      this.retryStreaming()
    }
  }
  createNetworkingEngine() {
    /* * @type {function(number, number)} */
    const onProgressUpdated_ = (deltaTimeMs, bytesDownloaded) => {
      // In some situations, such as during offline storage, the abr manager
      // might not yet exist. Therefore, we need to check if abr manager has
      // been initialized before using it.
      if (this.abrManager_) {
        this.abrManager_.segmentDownloaded(deltaTimeMs, bytesDownloaded)
      }
    }
    return new NetworkingEngine(onProgressUpdated_)
  }
  retryStreaming() {
    return this.loadMode_ === LoadMode.MEDIA_SOURCE ? this.streamingEngine_.retry() : false
  }
  /* *
   * This should only be called by the load graph when it is time to attach to
   * a media element. The only times this may be called are when we are being
   * asked to re-attach to the current media element, or attach to a new media
   * element while not attached to a media element.
   *
   * This method assumes that it is safe for it to execute, the load-graph is
   * responsible for ensuring all assumptions are true.
   *
   * Attaching to a media element is defined as:
   *  - Registering error listeners to the media element.
   *  - Caching the video element for use outside of the load graph.
   *
   * @param {Payload} has
   * @param {Payload} wants
   * @return {!Promise}
   * @private
   */
  onAttach_(has, wants) {
    // If we don't have a media element yet, it means we are entering
    // 'attach' from another node.
    //
    // If we have a media element, it should match |wants.mediaElement|
    // because it means we are going from 'attach' to 'attach'.
    //
    // These constraints should be maintained and guaranteed by the routing
    // logic in |getNextStep_|.
    console.assert(has.mediaElement === null || has.mediaElement === wants.mediaElement,
      'The routing logic failed. MediaElement requirement failed.')

    if (has.mediaElement === null) {
      has.mediaElement = wants.mediaElement
      const onError = (error) => this.onVideoError_(error)
      this.eventManager_.listen(has.mediaElement, 'error', onError)
    }

    this.video_ = has.mediaElement
    return Promise.resolve()
  }
  /* *
   * This should only be called by the load graph when it is time to detach from
   * a media element. The only times this may be called are when we are being
   * asked to detach from the current media element, or detach when we are
   * already detached.
   *
   * This method assumes that it is safe for it to execute, the load-graph is
   * responsible for ensuring all assumptions are true.
   *
   * Detaching from a media element is defined as:
   *  - Removing error listeners from the media element.
   *  - Dropping the cached reference to the video element.
   *
   * @param {Payload} has
   * @param {Payload} wants
   * @return {!Promise}
   * @private
   */
  onDetach_(has, wants) {
    // If we are going from 'detached' to 'detached' we wouldn't have a media element to detach from.
    if (has.mediaElement) {
      this.eventManager_.unlisten(has.mediaElement, 'error')
      has.mediaElement = null
    }

    // Clear our cached copy of the media element.
    this.video_ = null
    return Promise.resolve()
  }
  /* *
   * This should only be called by the load graph when it is time to unload all
   * currently initialized playback components. Unlike the other load actions,
   * this action is built to be more general. We need to do this because we
   * don't know what state the player will be in before unloading (including
   * after an error occurred in the middle of a transition).
   *
   * This method assumes that any component could be |null| and should be safe
   * to call from any point in the load graph.
   *
   * @param {Payload} has
   * @param {Payload} wants
   * @return {!Promise}
   * @private
   */
  async onUnload_(has, wants) {
    // Set the load mode to unload right away so that all the public methods
    // will stop using the internal components. We need to make sure that we
    // are not overriding the destroyed state because we will unload when we are
    // destroying the player.
    if (this.loadMode_ !== LoadMode.DESTROYED) {
      this.loadMode_ = LoadMode.NOT_LOADED
    }

    this.dispatchEvent(this.makeEvent_(conf.EventName.Unloading))

    // Remove everything that has to do with loading content from our payload
    // since we are releasing everything that depended on it.
    has.mimeType = null
    has.startTime = null
    has.uri = null

    // In most cases we should have a media element. The one exception would
    // be if there was an error and we, by chance, did not have a media element.
    if (has.mediaElement) {
      this.eventManager_.unlisten(has.mediaElement, 'loadeddata')
      this.eventManager_.unlisten(has.mediaElement, 'playing')
      this.eventManager_.unlisten(has.mediaElement, 'pause')
      this.eventManager_.unlisten(has.mediaElement, 'ended')
      this.eventManager_.unlisten(has.mediaElement, 'ratechange')
    }

    // Some observers use some playback components, shutting down the observers
    // first ensures that they don't try to use the playback components
    // mid-destroy.
    if (this.playheadObservers_) {
      this.playheadObservers_.release()
      this.playheadObservers_ = null
    }

    if (this.bufferPoller_) {
      this.bufferPoller_.stop()
      this.bufferPoller_ = null
    }

    // Stop the parser early. Since it is at the start of the pipeline, it
    // should be start early to avoid is pushing new data downstream.
    if (this.parser_) {
      await this.parser_.stop()
      this.parser_ = null
      this.parserFactory_ = null
    }

    // Abr Manager will tell streaming engine what to do, so we need to stop
    // it before we destroy streaming engine. Unlike with the other components,
    // we do not release the instance, we will reuse it in later loads.
    if (this.abrManager_) {
      await this.abrManager_.stop()
    }

    // Streaming engine will push new data to media source engine, so we need
    // to shut it down before destroy media source engine.
    if (this.streamingEngine_) {
      await this.streamingEngine_.destroy()
      this.streamingEngine_ = null
    }

    // Playhead is used by StreamingEngine, so we can't destroy this until after
    // StreamingEngine has stopped.
    if (this.playhead_) {
      this.playhead_.release()
      this.playhead_ = null
    }

    // Media source engine holds onto the media element, and in order to detach
    // the media keys (with drm engine), we need to break the connection between
    // media source engine and the media element.
    if (this.mediaSourceEngine_) {
      await this.mediaSourceEngine_.destroy()
      this.mediaSourceEngine_ = null
    }

    if (this.adManager_) {
      this.adManager_.onAssetUnload()
    }

    // In order to unload a media element, we need to remove the src attribute
    // and then load again. When we destroy media source engine, this will be
    // done for us, but for src=, we need to do it here.
    //
    // DrmEngine requires this to be done before we destroy DrmEngine itself.
    if (has.mediaElement && has.mediaElement.src) {
      // TODO: Investigate this more.  Only reproduces on Firefox 69.
      // Introduce a delay before detaching the video source.  We are seeing
      // spurious Promise rejections involving an AbortError in our tests
      // otherwise.
      await new Promise((resolve) => new Timer(resolve).tickAfter(0.1))
      has.mediaElement.removeAttribute('src')
      has.mediaElement.load()
    }

    this.activeStreams_.clear()
    this.assetUri_ = null
    this.bufferObserver_ = null
    this.loadingTextStreams_.clear()
    this.manifest_ = null
    this.stats_ = new Stats() // Replace with a clean stats object.
    this.lastTextFactory_ = null
    this.switchingPeriods_ = true
    // Make sure that the app knows of the new buffering state.
    this.updateBufferState_()
  }
  /* *
   * Update the buffering state to be either 'we are buffering' or 'we are not
   * buffering', firing events to the app as needed.
   *
   * @private
   */
  updateBufferState_() {
    const isBuffering = this.isBuffering()
    console.info('Player changing buffering state to', isBuffering)
    // Make sure we have all the components we need before we consider ourselves as being loaded.
    // TODO: Make the check for 'loaded' simpler.
    const loaded = this.stats_ && this.bufferObserver_ && this.playhead_

    if (loaded) {
      this.playRateController_.setBuffering(isBuffering)
      this.updateStateHistory_()
    }

    // Surface the buffering event so that the app knows if/when we are
    // buffering.
    const eventName = conf.EventName.Buffering
    this.dispatchEvent(this.makeEvent_(eventName, { 'buffering': isBuffering }))
  }
  /* *
   * Try updating the state history. If the player has not finished
   * initializing, this will be a no-op.
   *
   * @private
   */
  updateStateHistory_() {
    // If we have not finish initializing, this will be a no-op.
    if (!this.stats_) {
      return
    }
    if (!this.bufferObserver_) {
      return
    }

    const history = this.stats_.getStateHistory()

    if (this.bufferObserver_.getState() === BufferingObserver.State.STARVING) {
      history.update('buffering')
    } else if (this.video_.paused) {
      history.update('paused')
    } else if (this.video_.ended) {
      history.update('ended')
    } else {
      history.update('playing')
    }
  }
  /* *
   * @param {!conf.EventName} name
   * @param {Object=} data
   * @return {!FakeEvent}
   * @private
   */
  makeEvent_(name, data) {
    return new FakeEvent(name, data)
  }
  /* *
   * This should only be called by the load graph when it is time to initialize
   * media source engine. The only time this may be called is when we are
   * attached to the same media element as in the request.
   *
   * This method assumes that it is safe for it to execute. The load-graph is
   * responsible for ensuring all assumptions are true.
   *
   * @param {Payload} has
   * @param {Payload} wants
   *
   * @return {!Promise}
   * @private
   */
  async onInitializeMediaSourceEngine_(has, wants) {
    console.assert(Platform.supportsMediaSource(), 'We should not be initializing media source on a platform that does not support media source.')
    console.assert(has.mediaElement, 'We should have a media element when initializing media source.')
    console.assert(has.mediaElement === wants.mediaElement, '|has| and |wants| should have the same media element when initializing media source.')
    console.assert(this.mediaSourceEngine_ === null, 'We should not have a media source engine yet.')

    const closedCaptionsParser = MuxJSClosedCaptionParser.isSupported() ? new MuxJSClosedCaptionParser() : new NoopCaptionParser()

    // When changing text visibility we need to update both the text displayer
    // and streaming engine because we don't always stream text. To ensure that
    // text displayer and streaming engine are always in sync, wait until they
    // are both initialized before setting the initial value.
    const textDisplayerFactory = this.config_.textDisplayFactory
    const textDisplayer = Functional.callFactory(textDisplayerFactory)
    this.lastTextFactory_ = textDisplayerFactory

    const mediaSourceEngine = this.createMediaSourceEngine(has.mediaElement, closedCaptionsParser, textDisplayer)

    // Wait for media source engine to finish opening. This promise should
    // NEVER be rejected as per the media source engine implementation.
    await mediaSourceEngine.open()

    // Wait until it is ready to actually store the reference.
    this.mediaSourceEngine_ = mediaSourceEngine
  }
  /* *
   * Create a new media source engine. This will ONLY be replaced by tests as a
   * way to inject fake media source engine instances.
   *
   * @param {!HTMLMediaElement} mediaElement
   * @param {!IClosedCaptionParser} closedCaptionsParser
   * @param {!extern.TextDisplayer} textDisplayer
   *
   * @return {!MediaSourceEngine}
   */
  createMediaSourceEngine(mediaElement, closedCaptionsParser, textDisplayer) {
    return new MediaSourceEngine(mediaElement, closedCaptionsParser, textDisplayer)
  }
  /* *
   * Create the parser for the asset located at |wants.uri|. This should only be
   * called as part of the load graph.
   *
   * This method assumes that it is safe for it to execute, the load-graph is
   * responsible for ensuring all assumptions are true.
   *
   * @param {Payload} has
   * @param {Payload} wants
   * @return {!Promise}
   * @private
   */
  async onInitializeParser_(has, wants) {
    console.assert(has.mediaElement, 'We should have a media element when initializing the parser.')
    console.assert(has.mediaElement === wants.mediaElement, '|has| and |wants| should have the same media element when initializing the parser.')
    console.assert(this.networkingEngine_, 'Need networking engine when initializing the parser.')
    console.assert(this.config_, 'Need player config when initializing the parser.')

    // We are going to 'lock-in' the mime type and uri since they are
    // what we are going to use to create our parser and parse the manifest.
    has.mimeType = wants.mimeType
    has.uri = wants.uri
    console.assert(has.uri, 'We should have an asset uri when initializing the parsing.')

    // Store references to things we asserted so that we don't need to reassert
    // them again later.
    const assetUri = has.uri
    const networkingEngine = this.networkingEngine_

    // Save the uri so that it can be used outside of the load-graph.
    this.assetUri_ = assetUri

    // Create the parser that we will use to parse the manifest.
    this.parserFactory_ = await ManifestParser.getFactory(assetUri, networkingEngine, this.config_.manifest.retryParameters, has.mimeType)
    console.assert(this.parserFactory_, 'Must have manifest parser')
    this.parser_ = Functional.callFactory(this.parserFactory_)

    const manifestConfig = ObjectUtils.cloneObject(this.config_.manifest)
    // Don't read video segments if the player is attached to an audio element
    if (wants.mediaElement && wants.mediaElement.nodeName === 'AUDIO') {
      manifestConfig.disableVideo = true
    }

    this.parser_.configure(manifestConfig)
  }
  /* *
   * Parse the manifest at |has.uri| using the parser that should have already
   * been created. This should only be called as part of the load graph.
   *
   * This method assumes that it is safe for it to execute, the load-graph is
   * responsible for ensuring all assumptions are true.
   *
   * @param {Payload} has
   * @param {Payload} wants
   * @return {!AbortableOperation}
   * @private
   */
  onParseManifest_(has, wants) {
    console.assert(has.mimeType === wants.mimeType, '|has| and |wants| should have the same mime type when parsing.')
    console.assert(has.uri === wants.uri, '|has| and |wants| should have the same uri when parsing.')
    console.assert(has.uri, '|has| should have a valid uri when parsing.')
    console.assert(has.uri === this.assetUri_, '|has.uri| should match the cached asset uri.')
    console.assert(this.networkingEngine_, 'Need networking engine to parse manifest.')
    console.assert(this.config_, 'Need player config to parse manifest.')
    console.assert(this.parser_, '|this.parser_| should have been set in an earlier step.')

    // Store references to things we asserted so that we don't need to reassert
    // them again later.
    const assetUri = has.uri
    const networkingEngine = this.networkingEngine_

    // This will be needed by the parser once it starts parsing, so we will
    // initialize it now even through it appears a little out-of-place.
    this.regionTimeline_ = new RegionTimeline()
    this.regionTimeline_.setListeners(/*  onRegionAdded= */ (region) => {
      this.onRegionEvent_(conf.EventName.TimelineRegionAdded, region)
    })

    const playerInterface = {
      networkingEngine: networkingEngine,
      filterNewPeriod: (period) => this.filterNewPeriod_(period),
      filterAllPeriods: (periods) => this.filterAllPeriods_(periods),
      // Called when the parser finds a timeline region. This can be called
      // before we start playback or during playback (live/in-progress
      // manifest).
      onTimelineRegionAdded: (region) => this.regionTimeline_.addRegion(region),
      onEvent: (event) => this.dispatchEvent(event),
      onError: (error) => this.onError_(error)
    }

    const startTime = Date.now() / 1000

    return new AbortableOperation(
      /*  promise= */ (async() => {
        this.manifest_ = await this.parser_.start(assetUri, playerInterface)

        // This event is fired after the manifest is parsed, but before any
        // filtering takes place.
        const event = this.makeEvent_(conf.EventName.ManifestParsed)
        this.dispatchEvent(event)

        // We require all manifests to have already one period.
        if (this.manifest_.periods.length === 0) {
          throw new Error$1(
            Error$1.Severity.CRITICAL,
            Error$1.Category.MANIFEST,
            Error$1.Code.NO_PERIODS)
        }

        // Make sure that all periods are either: audio-only, video-only, or
        // audio-video.
        Player.filterForAVVariants_(this.manifest_.periods)

        const now = Date.now() / 1000
        const delta = now - startTime
        this.stats_.setManifestTime(delta)
      })(),
      /*  onAbort= */ () => {
        console.info('Aborting parser step...')
        return this.parser_.stop()
      })
  }
  /* *
   * This should only be called by the load graph when it is time to set-up the
   * media element to play content using src=. The only times this may be called
   * is when we are attached to the same media element as in the request.
   *
   * This method assumes that it is safe for it to execute, the load-graph is
   * responsible for ensuring all assumptions are true.
   *
   * @param {Payload} has
   * @param {Payload} wants
   * @return {!AbortableOperation}
   *
   * @private
   */
  onSrcEquals_(has, wants) {
    console.assert(has.mediaElement, 'We should have a media element when loading.')
    console.assert(wants.uri, '|has| should have a valid uri when loading.')
    console.assert(wants.startTimeOfLoad, '|wants| should tell us when the load was originally requested')
    console.assert(this.video_ === has.mediaElement, 'The video element should match our media element')

    // Lock-in the values that we are using so that the routing logic knows what
    // we have.
    has.uri = wants.uri
    has.startTime = wants.startTime

    // Save the uri so that it can be used outside of the load-graph.
    this.assetUri_ = has.uri

    this.playhead_ = new SrcEqualsPlayhead(has.mediaElement)

    if (has.startTime !== null) {
      this.playhead_.setStartTime(has.startTime)
    }

    this.playRateController_ = new PlayRateController({
      getRate: () => has.mediaElement.playbackRate,
      setRate: (rate) => { has.mediaElement.playbackRate = rate },
      movePlayhead: (delta) => { has.mediaElement.currentTime += delta }
    })

    // We need to start the buffer management code near the end because it will
    // set the initial buffering state and that depends on other components
    // being initialized.
    this.startBufferManagement_(this.config_.streaming.rebufferingGoal)

    // Add all media element listeners.
    const updateStateHistory = () => this.updateStateHistory_()
    this.eventManager_.listen(has.mediaElement, 'playing', updateStateHistory)
    this.eventManager_.listen(has.mediaElement, 'pause', updateStateHistory)
    this.eventManager_.listen(has.mediaElement, 'ended', updateStateHistory)

    // Wait for the 'loadeddata' event to measure load() latency.
    this.eventManager_.listenOnce(has.mediaElement, 'loadeddata', () => {
      const now = Date.now() / 1000
      const delta = now - wants.startTimeOfLoad
      this.stats_.setLoadLatency(delta)
    })

    // The audio tracks are only available on Safari at the moment, but this
    // drives the tracks API for Safari's native HLS. So when they change,
    // fire the corresponding Shaka Player event.
    if (this.video_.audioTracks) {
      this.eventManager_.listen(this.video_.audioTracks, 'addtrack', () => this.onTracksChanged_())
      this.eventManager_.listen(this.video_.audioTracks, 'removetrack', () => this.onTracksChanged_())
      this.eventManager_.listen(this.video_.audioTracks, 'change', () => this.onTracksChanged_())
    }
    if (this.video_.textTracks) {
      // This is a real EventTarget, but the compiler doesn't know that.
      // TODO: File a bug or send a PR to the compiler externs to fix this.
      const textTracks = /* * @type {EventTarget} */(this.video_.textTracks)
      this.eventManager_.listen(textTracks, 'addtrack', () => this.onTracksChanged_())
      this.eventManager_.listen(textTracks, 'removetrack', () => this.onTracksChanged_())
      this.eventManager_.listen(textTracks, 'change', () => this.onTracksChanged_())
    }

    // By setting |src| we are done 'loading' with src=. We don't need to set
    // the current time because |playhead| will do that for us.
    has.mediaElement.src = has.uri

    // Set the load mode last so that we know that all our components are
    // initialized.
    this.loadMode_ = LoadMode.SRC_EQUALS

    // The event doesn't mean as much for src= playback, since we don't control
    // streaming.  But we should fire it in this path anyway since some
    // applications may be expecting it as a life-cycle event.
    this.dispatchEvent(this.makeEvent_(conf.EventName.Streaming))

    // This is fully loaded when we have loaded the first frame.
    const fullyLoaded = new PublicPromise()
    if (this.video_.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      // Already done!
      fullyLoaded.resolve()
    } else if (this.video_.error) {
      // Already failed!
      fullyLoaded.reject(this.videoErrorToShakaError_())
    } else {
      // Wait for success or failure.
      this.eventManager_.listenOnce(this.video_, 'loadeddata', () => {
        fullyLoaded.resolve()
      })
      this.eventManager_.listenOnce(this.video_, 'error', () => {
        fullyLoaded.reject(this.videoErrorToShakaError_())
      })
    }
    return new AbortableOperation(fullyLoaded, /*  onAbort= */ () => {
      const abortedError = new Error$1(
        Error$1.Severity.CRITICAL,
        Error$1.Category.PLAYER,
        Error$1.Code.OPERATION_ABORTED)
      fullyLoaded.reject(abortedError)
      return Promise.resolve() // Abort complete.
    })
  }
  /* *
   * Initialize and start the buffering system (observer and timer) so that we
   * can monitor our buffer lead during playback.
   *
   * @param {number} rebufferingGoal
   * @private
   */
  startBufferManagement_(rebufferingGoal) {
    console.assert(!this.bufferObserver_, 'No buffering observer should exist before initialization.')
    console.assert(!this.bufferPoller_, 'No buffer timer should exist before initialization.')

    // Give dummy values, will be updated below.
    this.bufferObserver_ = new BufferingObserver(1, 2)

    // Force us back to a buffering state. This ensure everything is starting in
    // the same state.
    this.bufferObserver_.setState(BufferingObserver.State.STARVING)
    this.updateBufferingSettings_(rebufferingGoal)
    this.updateBufferState_()

    // TODO: We should take some time to look into the effects of our
    //       quarter-second refresh practice. We often use a quarter-second
    //       but we have no documentation about why.
    this.bufferPoller_ = new Timer(() => {
      this.pollBufferState_()
    }).tickEvery(/*  seconds= */ 0.25)
  }
  /* *
   * Updates the buffering thresholds based on the new rebuffering goal.
   * @param {number} rebufferingGoal
   * @private
   */
  updateBufferingSettings_(rebufferingGoal) {
    // The threshold to transition back to satisfied when starving.
    const starvingThreshold = rebufferingGoal
    // The threshold to transition into starving when satisfied.
    // We use a 'typical' threshold, unless the rebufferingGoal is unusually
    // low.
    // Then we force the value down to half the rebufferingGoal, since
    // starvingThreshold must be strictly larger than satisfiedThreshold for the
    // logic in BufferingObserver to work correctly.
    const satisfiedThreshold = Math.min(TYPICAL_BUFFERING_THRESHOLD_, rebufferingGoal / 2)
    this.bufferObserver_.setThresholds(starvingThreshold, satisfiedThreshold)
  }
  /* *
   * This method is called periodically to check what the buffering observer
   * says so that we can update the rest of the buffering behaviours.
   *
   * @private
   */
  pollBufferState_() {
    console.assert(this.video_, 'Need a media element to update the buffering observer')
    console.assert(this.bufferObserver_, 'Need a buffering observer to update')

    let bufferedToEnd
    switch (this.loadMode_) {
      case LoadMode.SRC_EQUALS:
        bufferedToEnd = this.isBufferedToEndSrc_()
        break
      case LoadMode.MEDIA_SOURCE:
        bufferedToEnd = this.isBufferedToEndMS_()
        break
      default:
        bufferedToEnd = false
        break
    }

    const bufferLead = TimeRangesUtils.bufferedAheadOf(this.video_.buffered, this.video_.currentTime)
    const stateChanged = this.bufferObserver_.update(bufferLead, bufferedToEnd)

    // If the state changed, we need to surface the event.
    if (stateChanged) {
      this.updateBufferState_()
    }
  }
  /* *
   * Fire an event, but wait a little bit so that the immediate execution can
   * complete before the event is handled.
   *
   * @param {!FakeEvent} event
   * @private
   */
  async delayDispatchEvent_(event) {
    // Wait until the next interpreter cycle.
    await Promise.resolve()

    // Only dispatch the event if we are still alive.
    if (this.loadMode_ !== LoadMode.DESTROYED) {
      this.dispatchEvent(event)
    }
  }
  /* *
   * Dispatches a 'trackschanged' event.
   * @private
   */
  onTracksChanged_() {
    // Delay the 'trackschanged' event so StreamingEngine has time to absorb the
    // changes before the user tries to query it.
    const event = this.makeEvent_(conf.EventName.TracksChanged)
    this.delayDispatchEvent_(event)
  }
  /* *
   * Tell the player to use <code>mediaElement</code> for all <code>load</code>
   * requests until <code>detach</code> or <code>destroy</code> are called.
   *
   * <p>
   * Calling <code>attach</code> with <code>initializedMediaSource=true</code>
   * will tell the player to take the initial load step and initialize media
   * source.
   *
   * <p>
   * Calls to <code>attach</code> will interrupt any in-progress calls to
   * <code>load</code> but cannot interrupt calls to <code>attach</code>,
   * <code>detach</code>, or <code>unload</code>.
   *
   * @param {!HTMLMediaElement} mediaElement
   * @param {boolean=} initializeMediaSource
   * @return {!Promise}
   * @export
   */
  attach(mediaElement, initializeMediaSource = true) {
    // Do not allow the player to be used after |destroy| is called.
    if (this.loadMode_ === LoadMode.DESTROYED) {
      return Promise.reject(this.createAbortLoadError_())
    }

    const payload = Player.createEmptyPayload_()
    payload.mediaElement = mediaElement

    // If the platform does not support media source, we will never want to
    // initialize media source.
    if (!Platform.supportsMediaSource()) {
      initializeMediaSource = false
    }

    const destination = initializeMediaSource ? this.mediaSourceNode_ : this.attachNode_

    // Do not allow this route to be interrupted because calls after this attach
    // call will depend on the media element being attached.
    const events = this.walker_.startNewRoute((currentPayload) => {
      return {
        node: destination,
        payload: payload,
        interruptible: false
      }
    })

    // List to the events that can occur with our request.
    events.onStart = () => console.info('Starting attach...')
    return this.wrapWalkerListenersWithPromise_(events)
  }

  /* *
   * Tell the player to stop using its current media element. If the player is:
   * <ul>
   *  <li>detached, this will do nothing,
   *  <li>attached, this will release the media element,
   *  <li>loading, this will abort loading, unload, and release the media
   *      element,
   *  <li>playing content, this will stop playback, unload, and release the
   *      media element.
   * </ul>
   *
   * <p>
   * Calls to <code>detach</code> will interrupt any in-progress calls to
   * <code>load</code> but cannot interrupt calls to <code>attach</code>,
   * <code>detach</code>, or <code>unload</code>.
   *
   * @return {!Promise}
   * @export
   */
  detach() {
    // Do not allow the player to be used after |destroy| is called.
    if (this.loadMode_ === LoadMode.DESTROYED) {
      return Promise.reject(this.createAbortLoadError_())
    }

    // Tell the walker to go 'detached', but do not allow it to be interrupted.
    // If it could be interrupted it means that our media element could fall out
    // of sync.
    const events = this.walker_.startNewRoute((currentPayload) => {
      return {
        node: this.detachNode_,
        payload: Player.createEmptyPayload_(),
        interruptible: false
      }
    })

    events.onStart = () => console.info('Starting detach...')
    return this.wrapWalkerListenersWithPromise_(events)
  }
  createAbortLoadError_() {
    return new Error$1(
      Error$1.Severity.CRITICAL,
      Error$1.Category.PLAYER,
      Error$1.Code.LOAD_INTERRUPTED)
  }
  /* *
   * This should only be called by the load graph when it is time to load all
   * playback components needed for playback. The only times this may be called
   * is when we are attached to the same media element as in the request.
   *
   * This method assumes that it is safe for it to execute, the load-graph is
   * responsible for ensuring all assumptions are true.
   *
   * Loading is defined as:
   *  - Attaching all playback-related listeners to the media element
   *  - Initializing playback and observers
   *  - Initializing ABR Manager
   *  - Initializing Streaming Engine
   *  - Starting playback at |wants.startTime|
   *
   * @param {Payload} has
   * @param {Payload} wants
   * @private
   */
  async onLoad_(has, wants) {
    console.assert(has.mimeType === wants.mimeType, '|has| and |wants| should have the same mime type when loading.')
    console.assert(has.uri === wants.uri, '|has| and |wants| should have the same uri when loading.')
    console.assert(has.mediaElement, 'We should have a media element when loading.')
    console.assert(wants.startTimeOfLoad !== null, '|wants| should tell us when the load was originally requested')

    // Since we are about to start playback, we will lock in the start time as
    // something we are now depending on.
    has.startTime = wants.startTime

    // Store a reference to values in |has| after asserting so that closure will
    // know that they will still be non-null between calls to await.
    const mediaElement = has.mediaElement
    const assetUri = has.uri

    // Save the uri so that it can be used outside of the load-graph.
    this.assetUri_ = assetUri

    const updateStateHistory = () => this.updateStateHistory_()
    const onRateChange = () => this.onRateChange_()
    this.eventManager_.listen(mediaElement, 'playing', updateStateHistory)
    this.eventManager_.listen(mediaElement, 'pause', updateStateHistory)
    this.eventManager_.listen(mediaElement, 'ended', updateStateHistory)
    this.eventManager_.listen(mediaElement, 'ratechange', onRateChange)

    const abrFactory = this.config_.abrFactory
    if (!this.abrManager_ || this.abrManagerFactory_ !== abrFactory) {
      this.abrManagerFactory_ = abrFactory
      this.abrManager_ = Functional.callFactory(abrFactory)
      if (typeof this.abrManager_.playbackRateChanged !== 'function') {
        Deprecate.deprecateFeature(
          2, 7,
          'AbrManager',
          'Please use an AbrManager with playbackRateChanged function.')
        this.abrManager_.playbackRateChanged = (rate) => {}
      }
      this.abrManager_.configure(this.config_.abr)
    }

    // TODO: When a manifest update adds a new period, that period's closed
    // captions should also be turned into text streams. This should be called
    // for each new period as well.
    this.createTextStreamsForClosedCaptions_(this.manifest_.periods)

    // Copy preferred languages from the config again, in case the config was
    // changed between construction and playback.
    this.currentAdaptationSetCriteria_ =
        new PreferenceBasedCriteria(
          this.config_.preferredAudioLanguage,
          this.config_.preferredVariantRole,
          this.config_.preferredAudioChannelCount)

    this.currentTextLanguage_ = this.config_.preferredTextLanguage

    Player.applyPlayRange_(this.manifest_.presentationTimeline,
      this.config_.playRangeStart,
      this.config_.playRangeEnd)

    this.abrManager_.init((variant, clearBuffer, safeMargin) => {
      return this.switch_(variant, clearBuffer, safeMargin)
    })

    this.playhead_ = this.createPlayhead(has.startTime)
    this.playheadObservers_ = this.createPlayheadObserversForMSE_()

    this.playRateController_ = new PlayRateController({
      getRate: () => has.mediaElement.playbackRate,
      setRate: (rate) => { has.mediaElement.playbackRate = rate },
      movePlayhead: (delta) => { has.mediaElement.currentTime += delta }
    })

    // We need to start the buffer management code near the end because it will
    // set the initial buffering state and that depends on other components
    // being initialized.
    const rebufferThreshold = Math.max(
      this.manifest_.minBufferTime, this.config_.streaming.rebufferingGoal)
    this.startBufferManagement_(rebufferThreshold)

    this.streamingEngine_ = this.createStreamingEngine()
    this.streamingEngine_.configure(this.config_.streaming)

    // If the content is multi-codec and the browser can play more than one of
    // them, choose codecs now before we initialize streaming.
    this.chooseCodecsAndFilterManifest_()

    // Set the load mode to 'loaded with media source' as late as possible so
    // that public methods won't try to access internal components until
    // they're all initialized. We MUST switch to loaded before calling
    // 'streaming' so that they can access internal information.
    this.loadMode_ = LoadMode.MEDIA_SOURCE

    // The event must be fired after we filter by restrictions but before the
    // active stream is picked to allow those listening for the 'streaming'
    // event to make changes before streaming starts.
    this.dispatchEvent(this.makeEvent_(conf.EventName.Streaming))

    // Start streaming content. This will start the flow of content down to
    // media source, including picking the initial streams to play.
    await this.streamingEngine_.start()

    // We MUST wait until after we create streaming engine to adjust the start
    // time because we rely on the active audio and video streams, which are
    // selected in |StreamingEngine.init|.
    if (this.config_.streaming.startAtSegmentBoundary) {
      const startTime = this.playhead_.getTime()
      const adjustedTime = this.adjustStartTime_(startTime)

      this.playhead_.setStartTime(adjustedTime)
    }

    // Re-filter the manifest after streams have been chosen.
    for (const period of this.manifest_.periods) {
      this.filterNewPeriod_(period)
    }
    // Dispatch a 'trackschanged' event now that all initial filtering is done.
    this.onTracksChanged_()
    // Since the first streams just became active, send an adaptation event.
    this.onAdaptation_()

    // Now that we've filtered out variants that aren't compatible with the
    // active one, update abr manager with filtered variants for the current
    // period.
    /* * @type {extern.Period} */
    const currentPeriod = this.getPresentationPeriod_() || this.manifest_.periods[0]
    const hasPrimary = currentPeriod.variants.some((v) => v.primary)

    if (!this.config_.preferredAudioLanguage && !hasPrimary) {
      console.warning('No preferred audio language set.  We will choose an arbitrary language initially')
    }

    this.chooseVariant_(currentPeriod.variants)

    // Wait for the 'loadeddata' event to measure load() latency.
    this.eventManager_.listenOnce(mediaElement, 'loadeddata', () => {
      const now = Date.now() / 1000
      const delta = now - wants.startTimeOfLoad
      this.stats_.setLoadLatency(delta)
    })
  }
  /* *
   * For CEA closed captions embedded in the video streams, create dummy text
   * stream.
   * @param {!Array.<!extern.Period>} periods
   * @private
   */
  createTextStreamsForClosedCaptions_(periods) {
    const ContentType = ManifestParserUtils.ContentType
    const TextStreamKind = ManifestParserUtils.TextStreamKind

    for (const period of periods) {
      // A map of the closed captions id and the new dummy text stream.
      const closedCaptionsMap = new Map()
      for (const variant of period.variants) {
        if (variant.video && variant.video.closedCaptions) {
          const video = variant.video
          for (const id of video.closedCaptions.keys()) {
            if (!closedCaptionsMap.has(id)) {
              const textStream = {
                id: this.nextExternalStreamId_++, // A globally unique ID.
                originalId: id, // The CC ID string, like 'CC1', 'CC3', etc.
                createSegmentIndex: () => Promise.resolve(),
                segmentIndex: null,
                mimeType: MimeUtils.CLOSED_CAPTION_MIMETYPE,
                codecs: '',
                kind: TextStreamKind.CLOSED_CAPTION,
                encrypted: false,
                keyId: null,
                language: video.closedCaptions.get(id),
                label: null,
                type: ContentType.TEXT,
                primary: false,
                trickModeVideo: null,
                emsgSchemeIdUris: null,
                roles: video.roles,
                channelsCount: null,
                audioSamplingRate: null,
                closedCaptions: null
              }
              closedCaptionsMap.set(id, textStream)
            }
          }
        }
      }
      for (const textStream of closedCaptionsMap.values()) {
        period.textStreams.push(textStream)
      }
    }
  }
  /* *
   * Dispatches an 'adaptation' event.
   * @private
   */
  onAdaptation_() {
    // Delay the 'adaptation' event so that StreamingEngine has time to absorb
    // the changes before the user tries to query it.
    const event = this.makeEvent_(conf.EventName.Adaptation)
    this.delayDispatchEvent_(event)
  }
  /* *
   * Get the period that is on the screen. This will return |null| if nothing
   * is loaded.
   *
   * @return {extern.Period}
   * @private
   */
  getPresentationPeriod_() {
    console.assert(this.manifest_ && this.playhead_, 'Only ask for the presentation period when loaded with media source.')
    const presentationTime = this.playhead_.getTime()

    let lastPeriod = null

    // Periods are ordered by |startTime|. If we always keep the last period
    // that started before our presentation time, it means we will have the
    // best guess at which period we are presenting.
    for (const period of this.manifest_.periods) {
      if (period.startTime <= presentationTime) {
        lastPeriod = period
      }
    }

    console.assert(lastPeriod, 'Should have found a period.')
    return lastPeriod
  }
  /* *
   * Filters a new period.
   * @param {extern.Period} period
   * @private
   */
  filterNewPeriod_(period) {
    console.assert(this.video_, 'Must not be destroyed')
    /* * @type {?extern.Stream} */
    const activeAudio = this.streamingEngine_ ? this.streamingEngine_.getBufferingAudio() : null
    /* * @type {?extern.Stream} */
    const activeVideo = this.streamingEngine_ ? this.streamingEngine_.getBufferingVideo() : null

    StreamUtils.filterNewPeriod(activeAudio, activeVideo, period)

    /* * @type {!Array.<extern.Variant>} */
    const variants = period.variants

    // Check for playable variants before restrictions, so that we can give a
    // special error when there were tracks but they were all filtered.
    const hasPlayableVariant = variants.some(StreamUtils.isPlayable)
    if (!hasPlayableVariant) {
      throw new Error$1(
        Error$1.Severity.CRITICAL,
        Error$1.Category.MANIFEST,
        Error$1.Code.UNPLAYABLE_PERIOD)
    }

    this.checkRestrictedVariants_(period.variants)

    const tracksChanged = StreamUtils.applyRestrictions(
      variants, this.config_.restrictions, this.maxHwRes_)

    // Trigger the track change event if the restrictions now prevent use from
    // using a variant that we previously thought we could use.
    if (tracksChanged && this.streamingEngine_ &&
        this.getPresentationPeriod_() === period) {
      this.onTracksChanged_()
    }
  }
  /* *
   * Filters a list of periods.
   * @param {!Array.<!extern.Period>} periods
   * @private
   */
  filterAllPeriods_(periods) {
    console.assert(this.video_, 'Must not be destroyed')

    /* * @type {?extern.Stream} */
    const activeAudio = this.streamingEngine_ ? this.streamingEngine_.getBufferingAudio() : null
    /* * @type {?extern.Stream} */
    const activeVideo = this.streamingEngine_ ? this.streamingEngine_.getBufferingVideo() : null

    for (const period of periods) {
      StreamUtils.filterNewPeriod(activeAudio, activeVideo, period)
    }

    const validPeriodsCount = ArrayUtils.count(periods, (period) => {
      return period.variants.some(StreamUtils.isPlayable)
    })

    // If none of the periods are playable, throw
    // CONTENT_UNSUPPORTED_BY_BROWSER.
    if (validPeriodsCount === 0) {
      throw new Error$1(
        Error$1.Severity.CRITICAL,
        Error$1.Category.MANIFEST,
        Error$1.Code.CONTENT_UNSUPPORTED_BY_BROWSER)
    }

    // If only some of the periods are playable, throw UNPLAYABLE_PERIOD.
    if (validPeriodsCount < periods.length) {
      throw new Error$1(
        Error$1.Severity.CRITICAL,
        Error$1.Category.MANIFEST,
        Error$1.Code.UNPLAYABLE_PERIOD)
    }

    for (const period of periods) {
      const tracksChanged = StreamUtils.applyRestrictions(
        period.variants, this.config_.restrictions, this.maxHwRes_)
      if (tracksChanged && this.streamingEngine_ &&
          this.getPresentationPeriod_() === period) {
        this.onTracksChanged_()
      }

      this.checkRestrictedVariants_(period.variants)
    }
  }
  /* *
   * When we fire region events, we need to copy the information out of the
   * region to break the connection with the player's internal data. We do the
   * copy here because this is the transition point between the player and the
   * app.
   *
   * @param {!conf.EventName} eventName
   * @param {extern.TimelineRegionInfo} region
   *
   * @private
   */
  onRegionEvent_(eventName, region) {
    // Always make a copy to avoid exposing our internal data to the app.
    const clone = {
      schemeIdUri: region.schemeIdUri,
      value: region.value,
      startTime: region.startTime,
      endTime: region.endTime,
      id: region.id,
      eventElement: region.eventElement
    }

    this.dispatchEvent(this.makeEvent_(eventName, { detail: clone }))
  }
  /* *
   * Chooses a variant from all possible variants while taking into account
   * restrictions, preferences, and ABR.
   *
   * On error, this dispatches an error event and returns null.
   *
   * @param {!Array.<extern.Variant>} allVariants
   * @return {?extern.Variant}
   * @private
   */
  chooseVariant_(allVariants) {
    console.assert(this.config_, 'Must not be destroyed')

    try {
      // |variants| are the filtered variants, use |period.variants| so we know
      // why they we restricted.
      this.checkRestrictedVariants_(allVariants)
    } catch (e) {
      this.onError_(e)
      return null
    }

    console.assert(
      allVariants.length, 'Should have thrown for no Variants.')

    const playableVariants = allVariants.filter((variant) => {
      return StreamUtils.isPlayable(variant)
    })

    // Update the abr manager with newly filtered variants.
    const adaptationSet = this.currentAdaptationSetCriteria_.create(
      playableVariants)
    this.abrManager_.setVariants(Array.from(adaptationSet.values()))
    return this.abrManager_.chooseVariant()
  }
  /* *
   * Checks the given variants and if they are all restricted, throw an
   * appropriate exception.
   *
   * @param {!Array.<extern.Variant>} variants
   * @private
   */
  checkRestrictedVariants_(variants) {
    const keyStatusMap = {}
    const keyIds = Object.keys(keyStatusMap)
    const isGlobalStatus = keyIds.length && keyIds[0] === '00'

    let hasPlayable = false
    let hasAppRestrict = false
    const missingKeys = []
    const badKeyStatuses = []

    for (const variant of variants) {
      // TODO: Combine with onKeyStatus_.
      const streams = []
      if (variant.audio) {
        streams.push(variant.audio)
      }
      if (variant.video) {
        streams.push(variant.video)
      }

      for (const stream of streams) {
        if (stream.keyId) {
          const keyStatus = keyStatusMap[isGlobalStatus ? '00' : stream.keyId]
          if (!keyStatus) {
            if (!missingKeys.includes(stream.keyId)) {
              missingKeys.push(stream.keyId)
            }
          } else if (restrictedStatuses_.includes(keyStatus)) {
            if (!badKeyStatuses.includes(keyStatus)) {
              badKeyStatuses.push(keyStatus)
            }
          }
        }
      }

      if (!variant.allowedByApplication) {
        hasAppRestrict = true
      } else if (variant.allowedByKeySystem) {
        hasPlayable = true
      }
    }

    if (!hasPlayable) {
      /* * @type {extern.RestrictionInfo} */
      const data = {
        hasAppRestrictions: hasAppRestrict,
        missingKeys: missingKeys,
        restrictedKeyStatuses: badKeyStatuses
      }
      throw new Error$1(
        Error$1.Severity.CRITICAL,
        Error$1.Category.MANIFEST,
        Error$1.Code.RESTRICTIONS_CANNOT_BE_MET,
        data)
    }
  }
  /* *
   * Creates a new instance of Playhead.  This can be replaced by tests to
   * create fake instances instead.
   *
   * @param {?number} startTime
   * @return {!Playhead}
   */
  createPlayhead(startTime) {
    console.assert(this.manifest_, 'Must have manifest')
    console.assert(this.video_, 'Must have video')
    return new MediaSourcePlayhead(
      this.video_,
      this.manifest_,
      this.config_.streaming,
      startTime,
      () => this.onSeek_(),
      (event) => this.dispatchEvent(event))
  }
  /* *
   * Callback from Playhead.
   *
   * @private
   */
  onSeek_() {
    if (this.playheadObservers_) {
      this.playheadObservers_.notifyOfSeek()
    }
    if (this.streamingEngine_) {
      this.streamingEngine_.seeked()
    }
    if (this.bufferObserver_) {
      // If we seek into an unbuffered range, we should fire a 'buffering' event
      // immediately.  If StreamingEngine can buffer fast enough, we may not
      // update our buffering tracking otherwise.
      this.pollBufferState_()
    }
  }
  /* *
   * @param {!Error} error
   * @private
   */
  onError_(error) {
    console.assert(error instanceof Error$1, 'Wrong error type!')

    // Errors dispatched after |destroy| is called are not meaningful and should
    // be safe to ignore.
    if (this.loadMode_ === LoadMode.DESTROYED) {
      return
    }

    const eventName = conf.EventName.Error
    const event = this.makeEvent_(eventName, { 'detail': error })
    this.dispatchEvent(event)
    if (event.defaultPrevented) {
      error.handled = true
    }
  }
  /* *
   * @param {number} time
   * @return {number}
   * @private
   */
  adjustStartTime_(time) {
    /* * @type {?extern.Stream} */
    const activeAudio = this.streamingEngine_.getBufferingAudio()
    /* * @type {?extern.Stream} */
    const activeVideo = this.streamingEngine_.getBufferingVideo()
    /* * @type {extern.Period} */
    const period = this.getPresentationPeriod_()

    // This method is called after StreamingEngine.init resolves, which means
    // that all the active streams have had createSegmentIndex called.
    function getAdjustedTime(stream, time) {
      if (!stream) {
        return null
      }
      const idx = stream.segmentIndex.find(time - period.startTime)
      if (idx === null) {
        return null
      }
      const ref = stream.segmentIndex.get(idx)
      if (!ref) {
        return null
      }
      const refTime = ref.startTime + period.startTime
      console.assert(refTime <= time, 'Segment should start before time')
      return refTime
    }

    const audioStartTime = getAdjustedTime(activeAudio, time)
    const videoStartTime = getAdjustedTime(activeVideo, time)

    // If we have both video and audio times, pick the larger one.  If we picked
    // the smaller one, that one will download an entire segment to buffer the
    // difference.
    if (videoStartTime !== null && audioStartTime !== null) {
      return Math.max(videoStartTime, audioStartTime)
    } else if (videoStartTime !== null) {
      return videoStartTime
    } else if (audioStartTime !== null) {
      return audioStartTime
    } else {
      return time
    }
  }
  /* *
   * Creates a new instance of StreamingEngine.  This can be replaced by tests
   * to create fake instances instead.
   *
   * @return {!StreamingEngine}
   */
  createStreamingEngine() {
    console.assert(this.playhead_ && this.abrManager_ && this.mediaSourceEngine_ && this.manifest_, 'Must not be destroyed')

    /* * @type {StreamingEngine.PlayerInterface} */
    const playerInterface = {
      getPresentationTime: () => this.playhead_.getTime(),
      getBandwidthEstimate: () => this.abrManager_.getBandwidthEstimate(),
      mediaSourceEngine: this.mediaSourceEngine_,
      netEngine: this.networkingEngine_,
      onChooseStreams: (period) => this.onChooseStreams_(period),
      onCanSwitch: () => this.canSwitch_(),
      onError: (error) => this.onError_(error),
      onEvent: (event) => this.dispatchEvent(event),
      onManifestUpdate: () => this.onManifestUpdate_(),
      onSegmentAppended: () => this.onSegmentAppended_()
    }

    return new StreamingEngine(this.manifest_, playerInterface)
  }
  /* *
   * Create the observers for MSE playback. These observers are responsible for
   * notifying the app and player of specific events during MSE playback.
   *
   * @return {!PlayheadObserverManager}
   * @private
   */
  createPlayheadObserversForMSE_() {
    console.assert(this.manifest_, 'Must have manifest')
    console.assert(this.regionTimeline_, 'Must have region timeline')
    console.assert(this.video_, 'Must have video element')

    // Create the period observer. This will allow us to notify the app when we
    // transition between periods.
    const periodObserver = new PeriodObserver(this.manifest_)
    periodObserver.setListeners((period) => this.onChangePeriod_())

    // Create the region observer. This will allow us to notify the app when we
    // move in and out of timeline regions.
    const regionObserver = new RegionObserver(this.regionTimeline_)
    const onEnterRegion = (region, seeking) => {
      this.onRegionEvent_(conf.EventName.TimelineRegionEnter, region)
    }
    const onExitRegion = (region, seeking) => {
      this.onRegionEvent_(conf.EventName.TimelineRegionExit, region)
    }
    const onSkipRegion = (region, seeking) => {
      // If we are seeking, we don't want to surface the enter/exit events since
      // they didn't play through them.
      if (!seeking) {
        this.onRegionEvent_(conf.EventName.TimelineRegionEnter, region)
        this.onRegionEvent_(conf.EventName.TimelineRegionExit, region)
      }
    }
    regionObserver.setListeners(onEnterRegion, onExitRegion, onSkipRegion)

    // Now that we have all our observers, create a manager for them.
    const manager = new PlayheadObserverManager(this.video_)
    manager.manage(periodObserver)
    manager.manage(regionObserver)

    return manager
  }
  /* *
   * Callback from AbrManager.
   *
   * @param {extern.Variant} variant
   * @param {boolean=} clearBuffer
   * @param {number=} safeMargin Optional amount of buffer (in seconds) to
   *   retain when clearing the buffer.
   *   Defaults to 0 if not provided. Ignored if clearBuffer is false.
   * @private
   */
  switch_(variant, clearBuffer = false, safeMargin = 0) {
    console.debug('switch_')
    console.assert(this.config_.abr.enabled, 'AbrManager should not call switch while disabled!')
    console.assert(!this.switchingPeriods_, 'AbrManager should not call switch while transitioning between Periods!')
    console.assert(this.manifest_, 'We need a manifest to switch variants.')

    const period = this.findPeriodWithVariant_(variant)
    console.assert(period, 'A period should contain the variant.')

    this.addVariantToSwitchHistory_(period, variant, /*  fromAdaptation= */ true)

    if (!this.streamingEngine_) {
      // There's no way to change it.
      return
    }

    if (this.streamingEngine_.switchVariant(variant, clearBuffer, safeMargin)) {
      this.onAdaptation_()
    }
  }
  /* *
   * Using a promise, wrap the listeners returned by |Walker.startNewRoute|.
   * This will work for most usages in |Player| but should not be used for
   * special cases.
   *
   * This will connect |onCancel|, |onEnd|, |onError|, and |onSkip| with
   * |resolve| and |reject| but will leave |onStart| unset.
   *
   * @param {Walker.Listeners} listeners
   * @return {!Promise}
   * @private
   */
  wrapWalkerListenersWithPromise_(listeners) {
    return new Promise((resolve, reject) => {
      listeners.onCancel = () => reject(this.createAbortLoadError_())
      listeners.onEnd = () => resolve()
      listeners.onError = (e) => reject(e)
      listeners.onSkip = () => reject(this.createAbortLoadError_())
    })
  }
  /* *
   * Assuming the player is playing content with media source, check if the
   * player has buffered enough content to make it to the end of the
   * presentation.
   *
   * @return {boolean}
   * @private
   */
  isBufferedToEndMS_() {
    console.assert(this.video_, 'We need a video element to get buffering information')
    console.assert(this.mediaSourceEngine_, 'We need a media source engine to get buffering information')
    console.assert(this.manifest_, 'We need a manifest to get buffering information')

    // This is a strong guarantee that we are buffered to the end, because it
    // means the playhead is already at that end.
    if (this.video_.ended) {
      return true
    }

    // This means that MediaSource has buffered the final segment in all
    // SourceBuffers and is no longer accepting additional segments.
    if (this.mediaSourceEngine_.ended()) {
      return true
    }

    // Live streams are 'buffered to the end' when they have buffered to the
    // live edge or beyond (into the region covered by the presentation delay).
    if (this.manifest_.presentationTimeline.isLive()) {
      const liveEdge = this.manifest_.presentationTimeline.getSegmentAvailabilityEnd()
      const bufferEnd = TimeRangesUtils.bufferEnd(this.video_.buffered)

      if (bufferEnd >= liveEdge) {
        return true
      }
    }

    return false
  }
  /* *
   * Assuming the player is playing content with src=, check if the player has
   * buffered enough content to make it to the end of the presentation.
   *
   * @return {boolean}
   * @private
   */
  isBufferedToEndSrc_() {
    console.assert(this.video_, 'We need a video element to get buffering information')

    // This is a strong guarantee that we are buffered to the end, because it
    // means the playhead is already at that end.
    if (this.video_.ended) {
      return true
    }

    // If we have buffered to the duration of the content, it means we will have
    // enough content to buffer to the end of the presentation.
    const bufferEnd = TimeRangesUtils.bufferEnd(this.video_.buffered)

    // Because Safari's native HLS reports slightly inaccurate values for
    // bufferEnd here, we use a fudge factor.  Without this, we can end up in a
    // buffering state at the end of the stream.  See issue #2117.
    // TODO: Try to remove the fudge here once we no longer manage buffering
    // state above the browser with playbackRate=0.
    const fudge = 1 // 1000 ms
    return bufferEnd >= this.video_.duration - fudge
  }
  /* *
   * Turn the media element's error object into a Shaka Player error object.
   *
   * @return {Error}
   * @private
   */
  videoErrorToShakaError_() {
    console.assert(this.video_.error,
      'Video error expected, but missing!')
    if (!this.video_.error) {
      return null
    }

    const code = this.video_.error.code
    if (code === 1 /*  MEDIA_ERR_ABORTED */) {
      // Ignore this error code, which should only occur when navigating away or
      // deliberately stopping playback of HTTP content.
      return null
    }

    // Extra error information from MS Edge and IE11:
    let extended = this.video_.error.msExtendedCode
    if (extended) {
      // Convert to unsigned:
      if (extended < 0) {
        extended += Math.pow(2, 32)
      }
      // Format as hex:
      extended = extended.toString(16)
    }

    // Extra error information from Chrome:
    const message = this.video_.error.message

    return new Error$1(
      Error$1.Severity.CRITICAL,
      Error$1.Category.MEDIA,
      Error$1.Code.VIDEO_ERROR,
      code, extended, message)
  }
  /* *
   * Key
   * ----------------------
   * D   : Detach Node
   * A   : Attach Node
   * MS  : Media Source Node
   * P   : Manifest Parser Node
   * M   : Manifest Node
   * DRM : Drm Engine Node
   * L   : Load Node
   * U   : Unloading Node
   * SRC : Src Equals Node
   *
   * Graph Topology
   * ----------------------
   *
   *        [SRC]-----+
   *         ^        |
   *         |        v
   * [D]<-->[A]<-----[U]
   *         |        ^
   *         v        |
   *        [MS]------+
   *         |        |
   *         v        |
   *        [P]-------+
   *         |        |
   *         v        |
   *        [M]-------+
   *         |        |
   *         v        |
   *        [DRM]-----+
   *         |        |
   *         v        |
   *        [L]-------+
   *
   * @param {!Node} currentlyAt
   * @param {Payload} currentlyWith
   * @param {!Node} wantsToBeAt
   * @param {Payload} wantsToHave
   * @return {?Node}
   * @private
   */
  getNextStep_(currentlyAt, currentlyWith, wantsToBeAt, wantsToHave) {
    let next = null

    if (currentlyAt === this.detachNode_) {
      next = wantsToBeAt === this.detachNode_
        ? this.detachNode_
        : this.attachNode_
    }

    if (currentlyAt === this.attachNode_) {
      next = this.getNextAfterAttach_(wantsToBeAt, currentlyWith, wantsToHave)
    }

    if (currentlyAt === this.mediaSourceNode_) {
      next = this.getNextAfterMediaSource_(
        wantsToBeAt, currentlyWith, wantsToHave)
    }

    if (currentlyAt === this.parserNode_) {
      next = this.getNextMatchingAllDependencies_(
        /* destination= */ this.loadNode_,
        /* next= */ this.manifestNode_,
        /* reset= */ this.unloadNode_,
        /* goingTo= */ wantsToBeAt,
        /* has= */ currentlyWith,
        /* wants= */ wantsToHave)
    }

    if (currentlyAt === this.manifestNode_) {
      next = this.getNextMatchingAllDependencies_(
        /* destination= */ this.loadNode_,
        /* next= */ this.srcEqualsNode_,
        /* reset= */ this.unloadNode_,
        /* goingTo= */ wantsToBeAt,
        /* has= */ currentlyWith,
        /* wants= */ wantsToHave)
    }

    // After we load content, always go through unload because we can't safely
    // use components after we have started playback.
    if (currentlyAt === this.loadNode_ || currentlyAt === this.srcEqualsNode_) {
      next = this.unloadNode_
    }

    if (currentlyAt === this.unloadNode_) {
      next = this.getNextAfterUnload_(wantsToBeAt, currentlyWith, wantsToHave)
    }

    console.assert(next, 'Missing next step!')
    return next
  }
  /* *
   * After unload there are only two options, attached or detached. This choice
   * is based on whether or not we have a media element. If we have a media
   * element, then we go to attach. If we don't have a media element, we go to
   * detach.
   *
   * @param {!Node} goingTo
   * @param {Payload} has
   * @param {Payload} wants
   * @return {?Node}
   * @private
   */
  getNextAfterUnload_(goingTo, has, wants) {
    // If we don't want a media element, detach.
    // If we have the wrong media element, detach.
    // Otherwise it means we want to attach to a media element and it is safe to
    // do so.
    return !wants.mediaElement || has.mediaElement !== wants.mediaElement
      ? this.detachNode_
      : this.attachNode_
  }
  /* *
   * A general method used to handle routing when we can either than one step
   * toward our destination (while all our dependencies match) or go to a node
   * that will reset us so we can try again.
   *
   * @param {!shaka.routing.Node} destinationNode
   *   What |goingTo| must be for us to step toward |nextNode|. Otherwise we
   *   will go to |resetNode|.
   * @param {!shaka.routing.Node} nextNode
   *   The node we will go to next if |goingTo == destinationNode| and all
   *   dependencies match.
   * @param {!shaka.routing.Node} resetNode
   *   The node we will go to next if |goingTo != destinationNode| or any
   *   dependency does not match.
   * @param {!shaka.routing.Node} goingTo
   *   The node that the walker is trying to go to.
   * @param {shaka.routing.Payload} has
   *   The payload that the walker currently has.
   * @param {shaka.routing.Payload} wants
   *   The payload that the walker wants to have when iy gets to |goingTo|.
   * @return {shaka.routing.Node}
   * @private
   */
  getNextMatchingAllDependencies_(destinationNode, nextNode, resetNode, goingTo,
    has, wants) {
    if (goingTo === destinationNode &&
      has.mediaElement === wants.mediaElement &&
      has.uri === wants.uri &&
      has.mimeType === wants.mimeType) {
      return nextNode
    }
    return resetNode
  }
  /* *
   * @param {!Node} goingTo
   * @param {Payload} has
   * @param {Payload} wants
   * @return {?Node}
   * @private
   */
  getNextAfterMediaSource_(goingTo, has, wants) {
    // We can only go to parse manifest or unload. If we want to go to load and
    // we have the right media element, we can go to parse manifest. If we
    // don't, no matter where we want to go, we must go through unload.
    if (goingTo === this.loadNode_ && has.mediaElement === wants.mediaElement) {
      return this.parserNode_
    }

    // Right now the unload node is responsible for tearing down all playback
    // components (including media source). So since we have created media
    // source, we need to unload since our dependencies are not compatible.
    //
    // TODO: We are structured this way to maintain a historic structure. Going
    //       forward, there is no reason to restrict ourselves to this. Going
    //       forward we should explore breaking apart |onUnload| and develop
    //       more meaningful terminology around tearing down playback resources.
    return this.unloadNode_
  }
  /* *
   * @param {!Node} goingTo
   * @param {Payload} has
   * @param {Payload} wants
   * @return {?Node}
   * @private
   */
  getNextAfterAttach_(goingTo, has, wants) {
    // Attach and detach are the only two nodes that we can directly go
    // back-and-forth between.
    if (goingTo === this.detachNode_) {
      return this.detachNode_
    }

    // If we are going anywhere other than detach, then we need the media
    // element to match, if they don't match, we need to go through detach
    // first.
    if (has.mediaElement !== wants.mediaElement) {
      return this.detachNode_
    }

    // If we are already in attached, and someone calls |attach| again (to the
    // same video element), we can handle the redundant request by re-entering
    // our current state.
    if (goingTo === this.attachNode_) {
      return this.attachNode_
    }

    // The next step from attached to loaded is through media source.
    if (goingTo === this.mediaSourceNode_ || goingTo === this.loadNode_) {
      return this.mediaSourceNode_
    }

    if (goingTo === this.srcEqualsNode_) {
      return this.srcEqualsNode_
    }

    // We are missing a rule, the null will get caught by a common check in
    // the routing system.
    return null
  }
  /* *
   * @param {extern.Period} period
   * @param {extern.Variant} variant
   * @param {boolean} fromAdaptation
   * @private
   */
  addVariantToSwitchHistory_(period, variant, fromAdaptation) {
    this.activeStreams_.useVariant(period, variant)
    const switchHistory = this.stats_.getSwitchHistory()
    switchHistory.updateCurrentVariant(variant, fromAdaptation)
  }
  /* *
   * Find the period in |this.manifest_| that contains |variant|. If no period
   * contains |variant| this will return |null|.
   *
   * @param {extern.Variant} variant
   * @return {?extern.Period}
   * @private
   */
  findPeriodWithVariant_(variant) {
    for (const period of this.manifest_.periods) {
      if (period.variants.includes(variant)) {
        return period
      }
    }

    return null
  }
  /* *
   * Callback from StreamingEngine.
   *
   * @private
   */
  onSegmentAppended_() {
    // When we append a segment to media source (via streaming engine) we are
    // changing what data we have buffered, so notify the playhead of the
    // change.
    if (this.playhead_) {
      this.playhead_.notifyOfBufferingChange()
    }
    this.pollBufferState_()
  }
  /* *
   * Callback from StreamingEngine.
   *
   * @private
   */
  onManifestUpdate_() {
    if (this.parser_ && this.parser_.update) {
      this.parser_.update()
    }
  }
  /* *
   * Callback from StreamingEngine, invoked when the period is set up.
   *
   * @private
   */
  canSwitch_() {
    console.debug('canSwitch_')
    console.assert(this.config_, 'Must not be destroyed')

    this.switchingPeriods_ = false

    if (this.config_.abr.enabled) {
      this.abrManager_.enable()
      this.onAbrStatusChanged_()
    }

    // If we still have deferred switches, switch now.
    if (this.deferredVariant_) {
      this.streamingEngine_.switchVariant(
        this.deferredVariant_, this.deferredVariantClearBuffer_,
        this.deferredVariantClearBufferSafeMargin_)
      this.onVariantChanged_()
      this.deferredVariant_ = null
    }
    if (this.deferredTextStream_) {
      this.streamingEngine_.switchTextStream(this.deferredTextStream_)
      this.onTextChanged_()
      this.deferredTextStream_ = null
    }
  }
  /* *
   * Callback from StreamingEngine, invoked when a period starts. This method
   * must always 'succeed' so it may not throw an error. Any errors must be
   * routed to |onError|.
   *
   * @param {!extern.Period} period
   * @return {StreamingEngine.ChosenStreams}
   *    An object containing the chosen variant and text stream.
   * @private
   */
  onChooseStreams_(period) {
    console.debug('onChooseStreams_', period)

    console.assert(this.config_, 'Must not be destroyed')

    try {
      console.info('onChooseStreams_, choosing variant from ', period.variants)
      console.info('onChooseStreams_, choosing text from ', period.textStreams)

      const chosen = this.chooseStreams_(period)

      console.info('onChooseStreams_, chose variant ', chosen.variant)
      console.info('onChooseStreams_, chose text ', chosen.text)

      return chosen
    } catch (e) {
      this.onError_(e)
      return { variant: null, text: null }
    }
  }
  /* *
   * This is the internal logic for |onChooseStreams_|. This separation is done
   * to allow this implementation to throw errors without consequence.
   *
   * @param {extern.Period} period
   *    The period that we are selecting streams from.
   * @return {StreamingEngine.ChosenStreams}
   *    An object containing the chosen variant and text stream.
   * @private
   */
  chooseStreams_(period) {
    // We are switching Periods, so the AbrManager will be disabled.  But if we
    // want to abr.enabled, we do not want to call AbrManager.enable before
    // canSwitch_ is called.
    this.switchingPeriods_ = true
    this.abrManager_.disable()
    this.onAbrStatusChanged_()

    console.debug('Choosing new streams after period changed')

    let chosenVariant = this.chooseVariant_(period.variants)
    let chosenText = this.chooseTextStream_(period.textStreams)

    // Ignore deferred variant or text streams only if we are starting a new
    // period.  In this case, any deferred switches were from an older period,
    // so they do not apply.  We can still have deferred switches from the
    // current period in the case of an early call to select*Track while we are
    // setting up the first period.  This can happen with the 'streaming' event.
    if (this.deferredVariant_) {
      if (period.variants.includes(this.deferredVariant_)) {
        chosenVariant = this.deferredVariant_
      }
      this.deferredVariant_ = null
    }

    if (this.deferredTextStream_) {
      if (period.textStreams.includes(this.deferredTextStream_)) {
        chosenText = this.deferredTextStream_
      }
      this.deferredTextStream_ = null
    }

    if (chosenVariant) {
      this.addVariantToSwitchHistory_(
        period, chosenVariant, /*  fromAdaptation= */ true)
    }

    if (chosenText) {
      this.addTextStreamToSwitchHistory_(
        period, chosenText, /*  fromAdaptation= */ true)
    }

    // Check if we should show text (based on difference between audio and text
    // languages). Only check this during startup so we don't 'pop-up' captions
    // mid playback.
    const startingUp = !this.streamingEngine_.getBufferingPeriod()
    const chosenAudio = chosenVariant ? chosenVariant.audio : null
    if (startingUp && chosenText) {
      if (chosenAudio && this.shouldShowText_(chosenAudio, chosenText)) {
        this.isTextVisible_ = true
      }
      if (this.isTextVisible_) {
        // If the cached value says to show text, then update the text displayer
        // since it defaults to not shown.  Note that returning the |chosenText|
        // below will make StreamingEngine stream the text.
        this.mediaSourceEngine_.getTextDisplayer().setTextVisibility(true)
        console.assert(this.shouldStreamText_(),
          'Should be streaming text')
      }
      this.onTextTrackVisibility_()
    }

    // Don't fire a tracks-changed event since we aren't inside the new Period
    // yet.
    // Don't initialize with a text stream unless we should be streaming text.
    if (this.shouldStreamText_()) {
      return { variant: chosenVariant, text: chosenText }
    } else {
      return { variant: chosenVariant, text: null }
    }
  }
  /* *
   * Dispatches a 'textchanged' event.
   * @private
   */
  onTextChanged_() {
    // Delay the 'textchanged' event so StreamingEngine time to absorb the
    // changes before the user tries to query it.
    const event = this.makeEvent_(conf.EventName.TextChanged)
    this.delayDispatchEvent_(event)
  }
  /* *
   * Dispatches a 'variantchanged' event.
   * @private
   */
  onVariantChanged_() {
    // Delay the 'variantchanged' event so StreamingEngine has time to absorb
    // the changes before the user tries to query it.
    const event = this.makeEvent_(conf.EventName.VariantChanged)
    this.delayDispatchEvent_(event)
  }
  /* * @private */
  onAbrStatusChanged_() {
    const event = this.makeEvent_(conf.EventName.AbrStatusChanged, {
      newStatus: this.config_.abr.enabled
    })
    this.delayDispatchEvent_(event)
  }
  /* * @private */
  onTextTrackVisibility_() {
    const event = this.makeEvent_(conf.EventName.TextTrackVisibility)
    this.delayDispatchEvent_(event)
  }
  /* *
   * @return {boolean} true if we should stream text right now.
   * @private
   */
  shouldStreamText_() {
    return this.config_.streaming.alwaysStreamText || this.isTextTrackVisible()
  }
  /* *
   * Check if we should show text on screen automatically.
   *
   * The text should automatically be shown if the text is language-compatible
   * with the user's text language preference, but not compatible with the
   * audio.
   *
   * For example:
   *   preferred | chosen | chosen |
   *   text      | text   | audio  | show
   *   -----------------------------------
   *   en-CA     | en     | jp     | true
   *   en        | en-US  | fr     | true
   *   fr-CA     | en-US  | jp     | false
   *   en-CA     | en-US  | en-US  | false
   *
   * @param {extern.Stream} audioStream
   * @param {extern.Stream} textStream
   * @return {boolean}
   * @private
   */
  shouldShowText_(audioStream, textStream) {
    const LanguageUtils = LanguageUtils

    /* * @type {string} */
    const preferredTextLocale =
        LanguageUtils.normalize(this.config_.preferredTextLanguage)
    /* * @type {string} */
    const audioLocale = LanguageUtils.normalize(audioStream.language)
    /* * @type {string} */
    const textLocale = LanguageUtils.normalize(textStream.language)

    return (
      LanguageUtils.areLanguageCompatible(textLocale, preferredTextLocale) &&
      !LanguageUtils.areLanguageCompatible(audioLocale, textLocale))
  }
  /* *
   * @param {extern.Period} period
   * @param {extern.Stream} textStream
   * @param {boolean} fromAdaptation
   * @private
   */
  addTextStreamToSwitchHistory_(period, textStream, fromAdaptation) {
    this.activeStreams_.useText(period, textStream)
    const switchHistory = this.stats_.getSwitchHistory()
    switchHistory.updateCurrentText(textStream, fromAdaptation)
  }
  /* *
   * Choose a text stream from all possible text streams while taking into
   * account user preference.
   *
   * @param {!Array.<extern.Stream>} textStreams
   * @return {?extern.Stream}
   * @private
   */
  chooseTextStream_(textStreams) {
    const subset = StreamUtils.filterStreamsByLanguageAndRole(
      textStreams,
      this.currentTextLanguage_,
      this.currentTextRole_)

    return subset[0] || null
  }
  /* *
   * Changes configuration settings on the Player.  This checks the names of
   * keys and the types of values to avoid coding errors.  If there are errors,
   * this logs them to the console and returns false.  Correct fields are still
   * applied even if there are other errors.  You can pass an explicit
   * <code>undefined</code> value to restore the default value.  This has two
   * modes of operation:
   *
   * <p>
   * First, this can be passed a single `plain` object.  This object should
   * follow the {@link shaka.extern.PlayerConfiguration} object.  Not all fields
   * need to be set; unset fields retain their old values.
   *
   * <p>
   * Second, this can be passed two arguments.  The first is the name of the key
   * to set.  This should be a '.' separated path to the key.  For example,
   * <code>'streaming.alwaysStreamText'</code>.  The second argument is the
   * value to set.
   *
   * @param {string|!Object} config This should either be a field name or an
   *   object.
   * @param {*=} value In the second mode, this is the value to set.
   * @return {boolean} True if the passed config object was valid, false if
   *   there were invalid entries.
   * @export
   */
  configure(config, value) {
    console.assert(this.config_, 'Config must not be null!')
    console.assert(typeof (config) === 'object' || arguments.length === 2, 'String configs should have values!')

    // ('fieldName', value) format
    if (arguments.length === 2 && typeof (config) === 'string') {
      config = ConfigUtils.convertToConfigObject(config, value)
    }

    console.assert(typeof (config) === 'object', 'Should be an object!')

    const ret = PlayerConfiguration.mergeConfigObjects(
      this.config_, config, this.defaultConfig_())

    this.applyConfig_()
    return ret
  }
  /* *
   * Tell the player to load the content at <code>assetUri</code> and start
   * playback at <code>startTime</code>. Before calling <code>load</code>,
   * a call to <code>attach</code> must have succeeded.
   *
   * <p>
   * Calls to <code>load</code> will interrupt any in-progress calls to
   * <code>load</code> but cannot interrupt calls to <code>attach</code>,
   * <code>detach</code>, or <code>unload</code>.
   *
   * @param {string} assetUri
   * @param {?number=} startTime
   *    When <code>startTime</code> is <code>null</code> or
   *    <code>undefined</code>, playback will start at the default start time (0
   *    for VOD and liveEdge for LIVE).
   * @param {string=} mimeType
   * @return {!Promise}
   * @export
   */
  load(assetUri, startTime, mimeType) {
    // Do not allow the player to be used after |destroy| is called.
    if (this.loadMode_ === LoadMode.DESTROYED) {
      return Promise.reject(this.createAbortLoadError_())
    }

    // We dispatch the loading event when someone calls |load| because we want
    // to surface the user intent.
    this.dispatchEvent(this.makeEvent_(conf.EventName.Loading))

    // Right away we know what the asset uri and start-of-load time are. We will
    // fill-in the rest of the information later.
    const payload = Player.createEmptyPayload_()
    payload.uri = assetUri
    payload.startTimeOfLoad = Date.now() / 1000
    if (mimeType) {
      payload.mimeType = mimeType
    }

    // Because we allow |startTime| to be optional, it means that it will be
    // |undefined| when not provided. This means that we need to re-map
    // |undefined| to |null| while preserving |0| as a meaningful value.
    if (startTime !== undefined) {
      payload.startTime = startTime
    }

    // TODO: Refactor to determine whether it's a manifest or not, and whether
    // or not we can play it.  Then we could return a better error than
    // UNABLE_TO_GUESS_MANIFEST_TYPE for WebM in Safari.
    const useSrcEquals = this.shouldUseSrcEquals_(payload)
    const destination = useSrcEquals ? this.srcEqualsNode_ : this.loadNode_

    // Allow this request to be interrupted, this will allow other requests to
    // cancel a load and quickly start a new load.
    const events = this.walker_.startNewRoute((currentPayload) => {
      if (currentPayload.mediaElement == null) {
        // Because we return null, this `new route` will not be used.
        return null
      }

      // Keep using whatever media element we have right now.
      payload.mediaElement = currentPayload.mediaElement

      return {
        node: destination,
        payload: payload,
        interruptible: true
      }
    })

    // Stats are for a single playback/load session. Stats must be initialized
    // before we allow calls to |updateStateHistory|.
    this.stats_ = new Stats()

    // Load's request is a little different, so we can't use our normal
    // listeners-to-promise method. It is the only request where we may skip the
    // request, so we need to set the on skip callback to reject with a specific
    // error.
    events.onStart = () => console.info(`Starting load of ${assetUri}...`)
    return new Promise((resolve, reject) => {
      events.onSkip = () => reject(new Error$1(
        Error$1.Severity.CRITICAL,
        Error$1.Category.PLAYER,
        Error$1.Code.NO_VIDEO_ELEMENT))

      events.onEnd = () => {
        resolve()
        // We dispatch the loaded event when the load promise is resolved
        this.dispatchEvent(this.makeEvent_(conf.EventName.Loaded))
      }
      events.onCancel = () => reject(this.createAbortLoadError_())
      events.onError = (e) => reject(e)
    })
  }
  /* *
   * Check if src= should be used to load the asset at |uri|. Assume that media
   * source is the default option, and that src= is for special cases.
   *
   * @param {Payload} payload
   * @return {boolean}
   *    |true| if the content should be loaded with src=, |false| if the content
   *    should be loaded with MediaSource.
   * @private
   */
  shouldUseSrcEquals_(payload) {
    // If we are using a platform that does not support media source, we will
    // fall back to src= to handle all playback.
    if (!Platform.supportsMediaSource()) {
      return true
    }

    // The most accurate way to tell the player how to load the content is via
    // MIME type.  We can fall back to features of the URI if needed.
    let mimeType = payload.mimeType
    const uri = payload.uri || ''

    // If we don't have a MIME type, try to guess based on the file extension.
    // TODO: Too generic to belong to ManifestParser now.  Refactor.
    if (!mimeType) {
      // Try using the uri extension.
      const extension = ManifestParser.getExtension(uri)
      mimeType = {
        'mp4': 'video/mp4',
        'm4v': 'video/mp4',
        'm4a': 'audio/mp4',
        'webm': 'video/webm',
        'weba': 'audio/webm',
        'mkv': 'video/webm', // Chromium browsers supports it.
        'ts': 'video/mp2t',
        'ogv': 'video/ogg',
        'ogg': 'audio/ogg',
        'mpg': 'video/mpeg',
        'mpeg': 'video/mpeg',
        'm3u8': 'application/x-mpegurl',
        'mp3': 'audio/mpeg',
        'aac': 'audio/aac',
        'flac': 'audio/flac',
        'wav': 'audio/wav'
      }[extension]
    }

    // TODO: The load graph system has a design limitation that requires routing
    // destination to be chosen synchronously.  This means we can only make the
    // right choice about src= consistently if we have a well-known file
    // extension or API-provided MIME type.  Detection of MIME type from a HEAD
    // request (as is done for manifest types) can't be done yet.

    if (mimeType) {
      // If we have a MIME type, check if the browser can play it natively.
      // This will cover both single files and native HLS.
      const mediaElement = payload.mediaElement || Platform.anyMediaElement()
      const canPlayNatively = mediaElement.canPlayType(mimeType) !== ''

      // If we can't play natively, then src= isn't an option.
      if (!canPlayNatively) {
        return false
      }

      const canPlayMediaSource = ManifestParser.isSupported(uri, mimeType)

      // If MediaSource isn't an option, the native option is our only chance.
      if (!canPlayMediaSource) {
        return true
      }

      // If we land here, both are feasible.
      console.assert(canPlayNatively && canPlayMediaSource, 'Both native and MSE playback should be possible!')

      // We would prefer MediaSource in some cases, and src= in others.  For
      // example, Android has native HLS, but we'd prefer our own MediaSource
      // version there.  For Safari, the choice is governed by the
      // useNativeHlsOnSafari setting of the streaming config.
      return Platform.isApple() && this.config_.streaming.useNativeHlsOnSafari
    }

    // Unless there are good reasons to use src= (single-file playback or native
    // HLS), we prefer MediaSource.  So the final return value for choosing src=
    // is false.
    return false
  }
  isBuffering() {
    return this.bufferObserver_
      ? this.bufferObserver_.getState() === BufferingObserver.State.STARVING
      : false
  }
  static isBrowserSupported() {
    // Basic features needed for the library to be usable.
    const basicSupport = !!window.Promise && !!window.Uint8Array &&
                         // eslint-disable-next-line no-restricted-syntax
                         !!Array.prototype.forEach
    if (!basicSupport) {
      return false
    }

    // We do not support iOS 9, 10, or 11, nor those same versions of desktop
    // Safari.
    const safariVersion = Platform.safariVersion()
    if (safariVersion && safariVersion < 12) {
      return false
    }

    // If we have MediaSource (MSE) support, we should be able to use Shaka.
    if (Platform.supportsMediaSource()) {
      return true
    }

    // If we don't have MSE, we _may_ be able to use Shaka.  Look for native HLS
    // support, and call this platform usable if we have it.
    return Platform.supportsMediaType('application/x-mpegurl')
  }
  /**
   * After destruction, a Player object cannot be used again.
   *
   * @override
   * @export
   */
  async destroy() {
    // Make sure we only execute the destroy logic once.
    if (this.loadMode_ === LoadMode.DESTROYED) {
      return
    }

    // Mark as "dead". This should stop external-facing calls from changing our
    // internal state any more. This will stop calls to |attach|, |detach|, etc.
    // from interrupting our final move to the detached state.
    this.loadMode_ = LoadMode.DESTROYED

    // Because we have set |loadMode_| to |DESTROYED| we can't call |detach|. We
    // must talk to |this.walker_| directly.
    const events = this.walker_.startNewRoute((currentPayload) => {
      return {
        node: this.detachNode_,
        payload: Player.createEmptyPayload_(),
        interruptible: false
      }
    })

    // Wait until the detach has finished so that we don't interrupt it by
    // calling |destroy| on |this.walker_|. To avoid failing here, we always
    // resolve the promise.
    await new Promise((resolve) => {
      events.onStart = () => {
        console.info('Preparing to destroy walker...')
      }
      events.onEnd = () => {
        resolve()
      }
      events.onCancel = () => {
        console.assert(false, 'Our final detach call should never be cancelled.')
        resolve()
      }
      events.onError = () => {
        console.assert(false, 'Our final detach call should never see an error')
        resolve()
      }
      events.onSkip = () => {
        console.assert(false, 'Our final detach call should never be skipped')
        resolve()
      }
    })
    await this.walker_.destroy()

    // Tear-down the event manager to ensure messages stop moving around.
    if (this.eventManager_) {
      this.eventManager_.release()
      this.eventManager_ = null
    }

    this.abrManagerFactory_ = null
    this.abrManager_ = null
    this.config_ = null
    this.stats_ = null

    if (this.networkingEngine_) {
      await this.networkingEngine_.destroy()
      this.networkingEngine_ = null
    }
  }
}

export default Player
