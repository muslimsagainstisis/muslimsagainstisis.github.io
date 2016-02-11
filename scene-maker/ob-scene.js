/*
 *  Dependencies
*/

  const Kefir = require('kefir')

  const audioplayer = require('./render/audioplayer.js')
  const videoPlayer = require('./render/videoplayer.js')

  const pageUtils = require('./utils/page-utils.js')

/*
 *  Globals
*/

  const PROPERTIES = ['translateX', 'translateY', 'opacity', 'rotate', 'scale']
  const ANIMATION_TIME = 41

  const $window = $(window)
  const $bodyhtml = $('body,html')

/*
 *  Initialize
*/

  const stateInitialized = new Kefir.pool()

  const INIT_STATE = {
    wrappers: [],
    currentWrapper: null,

    scrollTop: $window.scrollTop(),
    relativeScrollTop: 0,

    keyframes: undefined,
    prevKeyframesDurations: 0,
    currentKeyframe: 0,

    frameFocus: [],
    currentFocus: 0,
    currentFrame: [0],

    scrollTimeoutID: 0,

    bodyHeight: 0,
    windowHeight: 0,
    windowWidth: 0
  }

  const initState = Kefir.stream(emitter => {
    emitter.emit(INIT_STATE)
  })

  module.exports.init = (keyframes) => {

    const keyFramesRetreived = Kefir.stream(emitter => {
      emitter.emit(keyframes)
    })

    const keyFramesMappedToState = keyFramesRetreived
      .flatMap(keyframes => {
        return initState.map(state => {
          state.keyframes = keyframes
          return state
        })
      })
      .map(state => {
        state.currentWrapper = state.wrappers[0]
        state.scrollTop = 0
        return state
      })

    stateInitialized.plug(keyFramesMappedToState)

  }

/*
 *  Build Page
*/

  const windowResized = stateInitialized
    .flatMap((s) => {
      return Kefir.fromEvents($window, 'resize', () => {return s} )
    })
    .throttle(ANIMATION_TIME)

  const dimensionsCalculated = Kefir.merge([stateInitialized, windowResized])
    .map(calculateDimensions)
    .map(calculateKeyFrames)
    .map(calculateExtras)
    .map(state => {
      state.currentWrapper = state.wrappers[0]
      return state
    })

      function calculateDimensions(state) {
        state.scrollTop = Math.floor($window.scrollTop())
        state.windowHeight = $window.height()
        state.windowWidth = $window.width()
        return state
      }

      function calculateKeyFrames(state) {
        state.keyframes = pageUtils.convertAllPropsToPx(state.keyframes, state.windowWidth, state.windowHeight)
        return state
      }

      function calculateExtras(state) {
        let pageInfo = pageUtils.buildPage(state.keyframes, state.wrappers)

        state.bodyHeight = pageInfo.bodyHeight
        state.wrappers = pageInfo.wrappers
        state.frameFocus = pageInfo.frameFocus
          .map(i => Math.floor(i))
          .reduce((a, b) => { // clears any frame duplicates. TODO: find bug that makes frame duplicates
            if (a.indexOf(b) < 0) a.push(b)
            return a
          }, [])

        return state
      }

  module.exports.dimensionsCalculated = dimensionsCalculated

/*
 *  Position moved
*/

  const windowScrolled = Kefir.fromEvents($window, 'scroll')
    .throttle(ANIMATION_TIME)

  const somethingMoved = Kefir.fromEvents(window, 'POSITION_CHANGED')

  const eventsHappened = dimensionsCalculated
    .flatMap(state => {
      return Kefir.merge([windowScrolled, somethingMoved])
              .map(e => {
                state.changed = e
                return state
              })
    })

  const positionChanged = Kefir
    .merge([dimensionsCalculated, eventsHappened])

/*
 *  State Changed
*/

  // Calculate current state
  const calculatedCurrentState = Kefir
    .merge([dimensionsCalculated, positionChanged])
    .map(setTops)
    .map(setKeyframe)
    .map(getSlideLocation)
    .map(state => {
      state.currentWrapper = state.keyframes[state.currentKeyframe].wrapper
      return state
    })

      function setTops(state) {
        state.scrollTop = Math.floor($window.scrollTop())
        state.relativeScrollTop = state.scrollTop - state.prevKeyframesDurations
        return state
      }

      function setKeyframe(state) {
        if(state.scrollTop > (state.keyframes[state.currentKeyframe].duration + state.prevKeyframesDurations)) {
            state.prevKeyframesDurations += state.keyframes[state.currentKeyframe].duration
            state.currentKeyframe++
        } else if(state.scrollTop < state.prevKeyframesDurations) {
            state.currentKeyframe--
            state.prevKeyframesDurations -= state.keyframes[state.currentKeyframe].duration
        }
        return state
      }

      function getSlideLocation(state) {
        for (let x = 1; x <= state.frameFocus.length; x++) {
          if (state.frameFocus[x] === state.scrollTop) {
            state.currentFrame = [x]
          }
          if (state.scrollTop.between(state.frameFocus[x - 1], state.frameFocus[x])) {
            state.currentFrame = [x - 1, x]
          }
        }
        return state
      }

  const wrapperChanged = calculatedCurrentState
    .map(state => state.currentWrapper)
    .diff(null, '')
    .filter(currentWrapper => currentWrapper[0] !== currentWrapper[1])
    // .delay(ANIMATION_TIME*2) // To wait for first animation frame to start before switching

  module.exports.wrapperChanged = wrapperChanged;

  const scrollTopChanged = calculatedCurrentState
    .diff(null , { // Hack, for some reason INIT_STATE isn't coming in properly
      wrappers: [],
      currentWrapper: undefined,

      scrollTop: 0,
      relativeScrollTop: 0,

      keyframes: undefined,
      prevKeyframesDurations: 0,
      currentKeyframe: 0,

      frameFocus: [],
      currentFocus: 0,
      currentInterval: 0,

      scrollTimeoutID: 0,

      bodyHeight: 0,
      windowHeight: 0,
      windowWidth: 0
    })

  module.exports.scrollTopChanged = scrollTopChanged
  // scrollTopChanged.log()

/*
 *  Actions
*/

  module.exports.get = () => {
    return state
  }

  module.exports.action = (action) => {
    switch (action) {
      case 'next':
        $window.trigger('FOCUS_NEXT')
        break
      case 'previous':
        $window.trigger('FOCUS_PREVIOUS')
        break
      default:
        break
    }
  }

  const action_focusNext = scrollTopChanged
      .flatMapFirst((state) => {
        return Kefir.fromEvents($window, 'FOCUS_NEXT', () => state)
      })
      .map(state => state[1])
      .map(nextFocus)

  const action_focusPrevious = scrollTopChanged
      .flatMapFirst((state) => {
        return Kefir.fromEvents($window, 'FOCUS_PREVIOUS', () => state)
      })
      .map(state => state[1])
      .map(previousFocus)

    function nextFocus(state) {
      switch(state.currentFrame.length) {
        case 1:
          return state.frameFocus[state.currentFrame[0] + 1]
        case 2:
          return state.frameFocus[state.currentFrame[1]]
        default:
          return false
      }
    }

    function previousFocus(state) {
      switch(state.currentFrame.length) {
        case 1:
          return state.frameFocus[state.currentFrame[0] - 1]
        case 2:
          return state.frameFocus[state.currentFrame[0]]
        default:
          return false
      }
    }

    const focusChanged = Kefir.merge([action_focusPrevious, action_focusNext])
      .onValue(renderScroll)

    focusChanged.log();
    function renderScroll(scroll) {
      // console.log("RENDER", scroll, Math.floor($window.scrollTop()))
      $bodyhtml.animate({
        scrollTop: scroll
      }, 1500, 'linear')
    }

    Number.prototype.between = function(a, b) {
      var min = Math.min.apply(Math, [a, b]),
        max = Math.max.apply(Math, [a, b])
      return this > min && this < max
    }


/*
 *  Helpers
*/

  function throwError() {
    $bodyhtml.addClass('page-error')
  }

  function isTouchDevice() {
    return 'ontouchstart' in window // works on most browsers
      || 'onmsgesturechange' in window // works on ie10
  }
