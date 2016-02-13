/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;
/******/
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	__webpack_require__(1);


/***/ },
/* 1 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	
	var obscene = __webpack_require__(2);
	var controls = __webpack_require__(10);
	var render = __webpack_require__(11);
	
	var sceneUtils = __webpack_require__(15);
	var audioplayer = __webpack_require__(4);
	
	var sceneHtmlString = sceneUtils.renderHTML();
	var sceneMotionMap = sceneUtils.getScenes();
	var sceneAudioConfig = sceneUtils.getAudioConfig();
	
	audioplayer.config(sceneAudioConfig);
	
	$(function () {
	  init();
	});
	
	function init() {
	
	  Pace.on('done', function (e) {
	
	    var ua = navigator.userAgent;
	    if (isTouchDevice()) {
	      $('#unsupported').show();
	      $(".container").hide();
	      $(".loading").hide();
	    } else {
	
	      $('.container-inner').html(sceneHtmlString);
	
	      obscene.init(sceneMotionMap);
	      controls.init();
	
	      $('.loading').delay(300).fadeOut();
	      audioplayer.next('intro');
	      audioplayer.play();
	    }
	  });
	}
	
	function isTouchDevice() {
	  return 'ontouchstart' in window // works on most browsers
	   || 'onmsgesturechange' in window; // works on ie10
	}

/***/ },
/* 2 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	
	/*
	 *  Dependencies
	*/
	
	var Kefir = __webpack_require__(3);
	
	var audioplayer = __webpack_require__(4);
	var videoPlayer = __webpack_require__(8);
	
	var pageUtils = __webpack_require__(9);
	
	/*
	 *  Globals
	*/
	
	var PROPERTIES = ['translateX', 'translateY', 'opacity', 'rotate', 'scale'];
	var ANIMATION_TIME = 41;
	
	var $window = $(window);
	var $bodyhtml = $('body,html');
	
	/*
	 *  Initialize
	*/
	
	var stateInitialized = new Kefir.pool();
	
	var INIT_STATE = {
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
	};
	
	var initState = Kefir.stream(function (emitter) {
	  emitter.emit(INIT_STATE);
	});
	
	module.exports.init = function (keyframes) {
	
	  var keyFramesRetreived = Kefir.stream(function (emitter) {
	    emitter.emit(keyframes);
	  });
	
	  var keyFramesMappedToState = keyFramesRetreived.flatMap(function (keyframes) {
	    return initState.map(function (state) {
	      state.keyframes = keyframes;
	      return state;
	    });
	  }).map(function (state) {
	    state.currentWrapper = state.wrappers[0];
	    state.scrollTop = 0;
	    return state;
	  });
	
	  stateInitialized.plug(keyFramesMappedToState);
	};
	
	/*
	 *  Build Page
	*/
	
	var windowResized = stateInitialized.flatMap(function (s) {
	  return Kefir.fromEvents($window, 'resize', function () {
	    return s;
	  });
	}).throttle(ANIMATION_TIME);
	
	var dimensionsCalculated = Kefir.merge([stateInitialized, windowResized]).map(calculateDimensions).map(calculateKeyFrames).map(calculateExtras).map(function (state) {
	  state.currentWrapper = state.wrappers[0];
	  return state;
	});
	
	function calculateDimensions(state) {
	  state.scrollTop = Math.floor($window.scrollTop());
	  state.windowHeight = $window.height();
	  state.windowWidth = $window.width();
	  return state;
	}
	
	function calculateKeyFrames(state) {
	  state.keyframes = pageUtils.convertAllPropsToPx(state.keyframes, state.windowWidth, state.windowHeight);
	  return state;
	}
	
	function calculateExtras(state) {
	  var pageInfo = pageUtils.buildPage(state.keyframes, state.wrappers);
	
	  state.bodyHeight = pageInfo.bodyHeight;
	  state.wrappers = pageInfo.wrappers;
	  state.frameFocus = pageInfo.frameFocus.map(function (i) {
	    return Math.floor(i);
	  }).reduce(function (a, b) {
	    // clears any frame duplicates. TODO: find bug that makes frame duplicates
	    if (a.indexOf(b) < 0) a.push(b);
	    return a;
	  }, []);
	
	  return state;
	}
	
	module.exports.dimensionsCalculated = dimensionsCalculated;
	
	/*
	 *  Position moved
	*/
	
	var windowScrolled = Kefir.fromEvents($window, 'scroll').throttle(ANIMATION_TIME);
	
	var somethingMoved = Kefir.fromEvents(window, 'POSITION_CHANGED');
	
	var eventsHappened = dimensionsCalculated.flatMap(function (state) {
	  return Kefir.merge([windowScrolled, somethingMoved]).map(function (e) {
	    state.changed = e;
	    return state;
	  });
	});
	
	var positionChanged = Kefir.merge([dimensionsCalculated, eventsHappened]);
	
	/*
	 *  State Changed
	*/
	
	// Calculate current state
	var calculatedCurrentState = Kefir.merge([dimensionsCalculated, positionChanged]).map(setTops).map(setKeyframe).map(getSlideLocation).map(function (state) {
	  state.currentWrapper = state.keyframes[state.currentKeyframe].wrapper;
	  return state;
	});
	
	function setTops(state) {
	  state.scrollTop = Math.floor($window.scrollTop());
	  state.relativeScrollTop = state.scrollTop - state.prevKeyframesDurations;
	  return state;
	}
	
	function setKeyframe(state) {
	  if (state.scrollTop > state.keyframes[state.currentKeyframe].duration + state.prevKeyframesDurations) {
	    state.prevKeyframesDurations += state.keyframes[state.currentKeyframe].duration;
	    state.currentKeyframe++;
	  } else if (state.scrollTop < state.prevKeyframesDurations) {
	    state.currentKeyframe--;
	    state.prevKeyframesDurations -= state.keyframes[state.currentKeyframe].duration;
	  }
	  return state;
	}
	
	function getSlideLocation(state) {
	  for (var x = 1; x <= state.frameFocus.length; x++) {
	    if (state.frameFocus[x] === state.scrollTop) {
	      state.currentFrame = [x];
	    }
	    if (state.scrollTop.between(state.frameFocus[x - 1], state.frameFocus[x])) {
	      state.currentFrame = [x - 1, x];
	    }
	  }
	  return state;
	}
	
	var wrapperChanged = calculatedCurrentState.map(function (state) {
	  return state.currentWrapper;
	}).diff(null, '').filter(function (currentWrapper) {
	  return currentWrapper[0] !== currentWrapper[1];
	});
	// .delay(ANIMATION_TIME*2) // To wait for first animation frame to start before switching
	
	module.exports.wrapperChanged = wrapperChanged;
	
	var scrollTopChanged = calculatedCurrentState.diff(null, { // Hack, for some reason INIT_STATE isn't coming in properly
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
	});
	
	module.exports.scrollTopChanged = scrollTopChanged;
	// scrollTopChanged.log()
	
	/*
	 *  Actions
	*/
	
	module.exports.get = function () {
	  return state;
	};
	
	module.exports.action = function (action) {
	  switch (action) {
	    case 'next':
	      $window.trigger('FOCUS_NEXT');
	      break;
	    case 'previous':
	      $window.trigger('FOCUS_PREVIOUS');
	      break;
	    default:
	      break;
	  }
	};
	
	var action_focusNext = scrollTopChanged.flatMapFirst(function (state) {
	  return Kefir.fromEvents($window, 'FOCUS_NEXT', function () {
	    return state;
	  });
	}).map(function (state) {
	  return state[1];
	}).map(nextFocus);
	
	var action_focusPrevious = scrollTopChanged.flatMapFirst(function (state) {
	  return Kefir.fromEvents($window, 'FOCUS_PREVIOUS', function () {
	    return state;
	  });
	}).map(function (state) {
	  return state[1];
	}).map(previousFocus);
	
	function nextFocus(state) {
	  switch (state.currentFrame.length) {
	    case 1:
	      return state.frameFocus[state.currentFrame[0] + 1];
	    case 2:
	      return state.frameFocus[state.currentFrame[1]];
	    default:
	      return false;
	  }
	}
	
	function previousFocus(state) {
	  switch (state.currentFrame.length) {
	    case 1:
	      return state.frameFocus[state.currentFrame[0] - 1];
	    case 2:
	      return state.frameFocus[state.currentFrame[0]];
	    default:
	      return false;
	  }
	}
	
	var focusChanged = Kefir.merge([action_focusPrevious, action_focusNext]).onValue(renderScroll);
	
	focusChanged.log();
	function renderScroll(scroll) {
	  // console.log("RENDER", scroll, Math.floor($window.scrollTop()))
	  $bodyhtml.animate({
	    scrollTop: scroll
	  }, 1500, 'linear');
	}
	
	Number.prototype.between = function (a, b) {
	  var min = Math.min.apply(Math, [a, b]),
	      max = Math.max.apply(Math, [a, b]);
	  return this > min && this < max;
	};
	
	/*
	 *  Helpers
	*/
	
	function throwError() {
	  $bodyhtml.addClass('page-error');
	}
	
	function isTouchDevice() {
	  return 'ontouchstart' in window // works on most browsers
	   || 'onmsgesturechange' in window; // works on ie10
	}

/***/ },
/* 3 */
/***/ function(module, exports, __webpack_require__) {

	/*! Kefir.js v3.2.0
	 *  https://github.com/rpominov/kefir
	 */
	
	(function webpackUniversalModuleDefinition(root, factory) {
		if(true)
			module.exports = factory();
		else if(typeof define === 'function' && define.amd)
			define([], factory);
		else if(typeof exports === 'object')
			exports["Kefir"] = factory();
		else
			root["Kefir"] = factory();
	})(this, function() {
	return /******/ (function(modules) { // webpackBootstrap
	/******/ 	// The module cache
	/******/ 	var installedModules = {};
	
	/******/ 	// The require function
	/******/ 	function __webpack_require__(moduleId) {
	
	/******/ 		// Check if module is in cache
	/******/ 		if(installedModules[moduleId])
	/******/ 			return installedModules[moduleId].exports;
	
	/******/ 		// Create a new module (and put it into the cache)
	/******/ 		var module = installedModules[moduleId] = {
	/******/ 			exports: {},
	/******/ 			id: moduleId,
	/******/ 			loaded: false
	/******/ 		};
	
	/******/ 		// Execute the module function
	/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
	
	/******/ 		// Flag the module as loaded
	/******/ 		module.loaded = true;
	
	/******/ 		// Return the exports of the module
	/******/ 		return module.exports;
	/******/ 	}
	
	
	/******/ 	// expose the modules object (__webpack_modules__)
	/******/ 	__webpack_require__.m = modules;
	
	/******/ 	// expose the module cache
	/******/ 	__webpack_require__.c = installedModules;
	
	/******/ 	// __webpack_public_path__
	/******/ 	__webpack_require__.p = "";
	
	/******/ 	// Load entry module and return exports
	/******/ 	return __webpack_require__(0);
	/******/ })
	/************************************************************************/
	/******/ ([
	/* 0 */
	/***/ function(module, exports, __webpack_require__) {
	
		'use strict';
	
		var Kefir = module.exports = {};
		Kefir.Kefir = Kefir;
	
		var Observable = Kefir.Observable = __webpack_require__(1);
		Kefir.Stream = __webpack_require__(6);
		Kefir.Property = __webpack_require__(7);
	
		// Create a stream
		// -----------------------------------------------------------------------------
	
		// () -> Stream
		Kefir.never = __webpack_require__(8);
	
		// (number, any) -> Stream
		Kefir.later = __webpack_require__(9);
	
		// (number, any) -> Stream
		Kefir.interval = __webpack_require__(11);
	
		// (number, Array<any>) -> Stream
		Kefir.sequentially = __webpack_require__(12);
	
		// (number, Function) -> Stream
		Kefir.fromPoll = __webpack_require__(13);
	
		// (number, Function) -> Stream
		Kefir.withInterval = __webpack_require__(14);
	
		// (Function) -> Stream
		Kefir.fromCallback = __webpack_require__(16);
	
		// (Function) -> Stream
		Kefir.fromNodeCallback = __webpack_require__(18);
	
		// Target = {addEventListener, removeEventListener}|{addListener, removeListener}|{on, off}
		// (Target, string, Function|undefined) -> Stream
		Kefir.fromEvents = __webpack_require__(19);
	
		// (Function) -> Stream
		Kefir.stream = __webpack_require__(17);
	
		// Create a property
		// -----------------------------------------------------------------------------
	
		// (any) -> Property
		Kefir.constant = __webpack_require__(22);
	
		// (any) -> Property
		Kefir.constantError = __webpack_require__(23);
	
		// Convert observables
		// -----------------------------------------------------------------------------
	
		// (Stream|Property, Function|undefined) -> Property
		var toProperty = __webpack_require__(24);
		Observable.prototype.toProperty = function (fn) {
		  return toProperty(this, fn);
		};
	
		// (Stream|Property) -> Stream
		var changes = __webpack_require__(26);
		Observable.prototype.changes = function () {
		  return changes(this);
		};
	
		// Interoperation with other implimentations
		// -----------------------------------------------------------------------------
	
		// (Promise) -> Property
		Kefir.fromPromise = __webpack_require__(27);
	
		// (Stream|Property, Function|undefined) -> Promise
		var toPromise = __webpack_require__(28);
		Observable.prototype.toPromise = function (Promise) {
		  return toPromise(this, Promise);
		};
	
		// (ESObservable) -> Stream
		Kefir.fromESObservable = __webpack_require__(29);
	
		// (Stream|Property) -> ES7 Observable
		var toESObservable = __webpack_require__(31);
		Observable.prototype.toESObservable = toESObservable;
		Observable.prototype[__webpack_require__(30)('observable')] = toESObservable;
	
		// Modify an observable
		// -----------------------------------------------------------------------------
	
		// (Stream, Function|undefined) -> Stream
		// (Property, Function|undefined) -> Property
		var map = __webpack_require__(32);
		Observable.prototype.map = function (fn) {
		  return map(this, fn);
		};
	
		// (Stream, Function|undefined) -> Stream
		// (Property, Function|undefined) -> Property
		var filter = __webpack_require__(33);
		Observable.prototype.filter = function (fn) {
		  return filter(this, fn);
		};
	
		// (Stream, number) -> Stream
		// (Property, number) -> Property
		var take = __webpack_require__(34);
		Observable.prototype.take = function (n) {
		  return take(this, n);
		};
	
		// (Stream, number) -> Stream
		// (Property, number) -> Property
		var takeErrors = __webpack_require__(35);
		Observable.prototype.takeErrors = function (n) {
		  return takeErrors(this, n);
		};
	
		// (Stream, Function|undefined) -> Stream
		// (Property, Function|undefined) -> Property
		var takeWhile = __webpack_require__(36);
		Observable.prototype.takeWhile = function (fn) {
		  return takeWhile(this, fn);
		};
	
		// (Stream) -> Stream
		// (Property) -> Property
		var last = __webpack_require__(37);
		Observable.prototype.last = function () {
		  return last(this);
		};
	
		// (Stream, number) -> Stream
		// (Property, number) -> Property
		var skip = __webpack_require__(38);
		Observable.prototype.skip = function (n) {
		  return skip(this, n);
		};
	
		// (Stream, Function|undefined) -> Stream
		// (Property, Function|undefined) -> Property
		var skipWhile = __webpack_require__(39);
		Observable.prototype.skipWhile = function (fn) {
		  return skipWhile(this, fn);
		};
	
		// (Stream, Function|undefined) -> Stream
		// (Property, Function|undefined) -> Property
		var skipDuplicates = __webpack_require__(40);
		Observable.prototype.skipDuplicates = function (fn) {
		  return skipDuplicates(this, fn);
		};
	
		// (Stream, Function|falsey, any|undefined) -> Stream
		// (Property, Function|falsey, any|undefined) -> Property
		var diff = __webpack_require__(41);
		Observable.prototype.diff = function (fn, seed) {
		  return diff(this, fn, seed);
		};
	
		// (Stream|Property, Function, any|undefined) -> Property
		var scan = __webpack_require__(42);
		Observable.prototype.scan = function (fn, seed) {
		  return scan(this, fn, seed);
		};
	
		// (Stream, Function|undefined) -> Stream
		// (Property, Function|undefined) -> Property
		var flatten = __webpack_require__(43);
		Observable.prototype.flatten = function (fn) {
		  return flatten(this, fn);
		};
	
		// (Stream, number) -> Stream
		// (Property, number) -> Property
		var delay = __webpack_require__(44);
		Observable.prototype.delay = function (wait) {
		  return delay(this, wait);
		};
	
		// Options = {leading: boolean|undefined, trailing: boolean|undefined}
		// (Stream, number, Options|undefined) -> Stream
		// (Property, number, Options|undefined) -> Property
		var throttle = __webpack_require__(45);
		Observable.prototype.throttle = function (wait, options) {
		  return throttle(this, wait, options);
		};
	
		// Options = {immediate: boolean|undefined}
		// (Stream, number, Options|undefined) -> Stream
		// (Property, number, Options|undefined) -> Property
		var debounce = __webpack_require__(47);
		Observable.prototype.debounce = function (wait, options) {
		  return debounce(this, wait, options);
		};
	
		// (Stream, Function|undefined) -> Stream
		// (Property, Function|undefined) -> Property
		var mapErrors = __webpack_require__(48);
		Observable.prototype.mapErrors = function (fn) {
		  return mapErrors(this, fn);
		};
	
		// (Stream, Function|undefined) -> Stream
		// (Property, Function|undefined) -> Property
		var filterErrors = __webpack_require__(49);
		Observable.prototype.filterErrors = function (fn) {
		  return filterErrors(this, fn);
		};
	
		// (Stream) -> Stream
		// (Property) -> Property
		var ignoreValues = __webpack_require__(50);
		Observable.prototype.ignoreValues = function () {
		  return ignoreValues(this);
		};
	
		// (Stream) -> Stream
		// (Property) -> Property
		var ignoreErrors = __webpack_require__(51);
		Observable.prototype.ignoreErrors = function () {
		  return ignoreErrors(this);
		};
	
		// (Stream) -> Stream
		// (Property) -> Property
		var ignoreEnd = __webpack_require__(52);
		Observable.prototype.ignoreEnd = function () {
		  return ignoreEnd(this);
		};
	
		// (Stream, Function) -> Stream
		// (Property, Function) -> Property
		var beforeEnd = __webpack_require__(53);
		Observable.prototype.beforeEnd = function (fn) {
		  return beforeEnd(this, fn);
		};
	
		// (Stream, number, number|undefined) -> Stream
		// (Property, number, number|undefined) -> Property
		var slidingWindow = __webpack_require__(54);
		Observable.prototype.slidingWindow = function (max, min) {
		  return slidingWindow(this, max, min);
		};
	
		// Options = {flushOnEnd: boolean|undefined}
		// (Stream, Function|falsey, Options|undefined) -> Stream
		// (Property, Function|falsey, Options|undefined) -> Property
		var bufferWhile = __webpack_require__(55);
		Observable.prototype.bufferWhile = function (fn, options) {
		  return bufferWhile(this, fn, options);
		};
	
		// (Stream, number) -> Stream
		// (Property, number) -> Property
		var bufferWithCount = __webpack_require__(56);
		Observable.prototype.bufferWithCount = function (count, options) {
		  return bufferWithCount(this, count, options);
		};
	
		// Options = {flushOnEnd: boolean|undefined}
		// (Stream, number, number, Options|undefined) -> Stream
		// (Property, number, number, Options|undefined) -> Property
		var bufferWithTimeOrCount = __webpack_require__(57);
		Observable.prototype.bufferWithTimeOrCount = function (wait, count, options) {
		  return bufferWithTimeOrCount(this, wait, count, options);
		};
	
		// (Stream, Function) -> Stream
		// (Property, Function) -> Property
		var transduce = __webpack_require__(58);
		Observable.prototype.transduce = function (transducer) {
		  return transduce(this, transducer);
		};
	
		// (Stream, Function) -> Stream
		// (Property, Function) -> Property
		var withHandler = __webpack_require__(59);
		Observable.prototype.withHandler = function (fn) {
		  return withHandler(this, fn);
		};
	
		// Combine observables
		// -----------------------------------------------------------------------------
	
		// (Array<Stream|Property>, Function|undefiend) -> Stream
		// (Array<Stream|Property>, Array<Stream|Property>, Function|undefiend) -> Stream
		var combine = Kefir.combine = __webpack_require__(60);
		Observable.prototype.combine = function (other, combinator) {
		  return combine([this, other], combinator);
		};
	
		// (Array<Stream|Property>, Function|undefiend) -> Stream
		var zip = Kefir.zip = __webpack_require__(61);
		Observable.prototype.zip = function (other, combinator) {
		  return zip([this, other], combinator);
		};
	
		// (Array<Stream|Property>) -> Stream
		var merge = Kefir.merge = __webpack_require__(62);
		Observable.prototype.merge = function (other) {
		  return merge([this, other]);
		};
	
		// (Array<Stream|Property>) -> Stream
		var concat = Kefir.concat = __webpack_require__(64);
		Observable.prototype.concat = function (other) {
		  return concat([this, other]);
		};
	
		// () -> Pool
		var Pool = Kefir.Pool = __webpack_require__(66);
		Kefir.pool = function () {
		  return new Pool();
		};
	
		// (Function) -> Stream
		Kefir.repeat = __webpack_require__(65);
	
		// Options = {concurLim: number|undefined, queueLim: number|undefined, drop: 'old'|'new'|undefiend}
		// (Stream|Property, Function|falsey, Options|undefined) -> Stream
		var FlatMap = __webpack_require__(67);
		Observable.prototype.flatMap = function (fn) {
		  return new FlatMap(this, fn).setName(this, 'flatMap');
		};
		Observable.prototype.flatMapLatest = function (fn) {
		  return new FlatMap(this, fn, { concurLim: 1, drop: 'old' }).setName(this, 'flatMapLatest');
		};
		Observable.prototype.flatMapFirst = function (fn) {
		  return new FlatMap(this, fn, { concurLim: 1 }).setName(this, 'flatMapFirst');
		};
		Observable.prototype.flatMapConcat = function (fn) {
		  return new FlatMap(this, fn, { queueLim: -1, concurLim: 1 }).setName(this, 'flatMapConcat');
		};
		Observable.prototype.flatMapConcurLimit = function (fn, limit) {
		  return new FlatMap(this, fn, { queueLim: -1, concurLim: limit }).setName(this, 'flatMapConcurLimit');
		};
	
		// (Stream|Property, Function|falsey) -> Stream
		var FlatMapErrors = __webpack_require__(68);
		Observable.prototype.flatMapErrors = function (fn) {
		  return new FlatMapErrors(this, fn).setName(this, 'flatMapErrors');
		};
	
		// Combine two observables
		// -----------------------------------------------------------------------------
	
		// (Stream, Stream|Property) -> Stream
		// (Property, Stream|Property) -> Property
		var filterBy = __webpack_require__(69);
		Observable.prototype.filterBy = function (other) {
		  return filterBy(this, other);
		};
	
		// (Stream, Stream|Property, Function|undefiend) -> Stream
		// (Property, Stream|Property, Function|undefiend) -> Property
		var sampledBy2items = __webpack_require__(71);
		Observable.prototype.sampledBy = function (other, combinator) {
		  return sampledBy2items(this, other, combinator);
		};
	
		// (Stream, Stream|Property) -> Stream
		// (Property, Stream|Property) -> Property
		var skipUntilBy = __webpack_require__(72);
		Observable.prototype.skipUntilBy = function (other) {
		  return skipUntilBy(this, other);
		};
	
		// (Stream, Stream|Property) -> Stream
		// (Property, Stream|Property) -> Property
		var takeUntilBy = __webpack_require__(73);
		Observable.prototype.takeUntilBy = function (other) {
		  return takeUntilBy(this, other);
		};
	
		// Options = {flushOnEnd: boolean|undefined}
		// (Stream, Stream|Property, Options|undefined) -> Stream
		// (Property, Stream|Property, Options|undefined) -> Property
		var bufferBy = __webpack_require__(74);
		Observable.prototype.bufferBy = function (other, options) {
		  return bufferBy(this, other, options);
		};
	
		// Options = {flushOnEnd: boolean|undefined}
		// (Stream, Stream|Property, Options|undefined) -> Stream
		// (Property, Stream|Property, Options|undefined) -> Property
		var bufferWhileBy = __webpack_require__(75);
		Observable.prototype.bufferWhileBy = function (other, options) {
		  return bufferWhileBy(this, other, options);
		};
	
		// Deprecated
		// -----------------------------------------------------------------------------
	
		function warn(msg) {
		  if (Kefir.DEPRECATION_WARNINGS !== false && console && typeof console.warn === 'function') {
		    var msg2 = '\nHere is an Error object for you containing the call stack:';
		    console.warn(msg, msg2, new Error());
		  }
		}
	
		// (Stream|Property, Stream|Property) -> Property
		var awaiting = __webpack_require__(76);
		Observable.prototype.awaiting = function (other) {
		  warn('You are using deprecated .awaiting() method, see https://github.com/rpominov/kefir/issues/145');
		  return awaiting(this, other);
		};
	
		// (Stream, Function|undefined) -> Stream
		// (Property, Function|undefined) -> Property
		var valuesToErrors = __webpack_require__(77);
		Observable.prototype.valuesToErrors = function (fn) {
		  warn('You are using deprecated .valuesToErrors() method, see https://github.com/rpominov/kefir/issues/149');
		  return valuesToErrors(this, fn);
		};
	
		// (Stream, Function|undefined) -> Stream
		// (Property, Function|undefined) -> Property
		var errorsToValues = __webpack_require__(78);
		Observable.prototype.errorsToValues = function (fn) {
		  warn('You are using deprecated .errorsToValues() method, see https://github.com/rpominov/kefir/issues/149');
		  return errorsToValues(this, fn);
		};
	
		// (Stream) -> Stream
		// (Property) -> Property
		var endOnError = __webpack_require__(79);
		Observable.prototype.endOnError = function () {
		  warn('You are using deprecated .endOnError() method, see https://github.com/rpominov/kefir/issues/150');
		  return endOnError(this);
		};
	
	/***/ },
	/* 1 */
	/***/ function(module, exports, __webpack_require__) {
	
		'use strict';
	
		var _require = __webpack_require__(2);
	
		var extend = _require.extend;
	
		var _require2 = __webpack_require__(3);
	
		var VALUE = _require2.VALUE;
		var ERROR = _require2.ERROR;
		var ANY = _require2.ANY;
		var END = _require2.END;
	
		var _require3 = __webpack_require__(4);
	
		var Dispatcher = _require3.Dispatcher;
		var callSubscriber = _require3.callSubscriber;
	
		var _require4 = __webpack_require__(5);
	
		var findByPred = _require4.findByPred;
	
		function Observable() {
		  this._dispatcher = new Dispatcher();
		  this._active = false;
		  this._alive = true;
		  this._activating = false;
		  this._logHandlers = null;
		}
	
		extend(Observable.prototype, {
	
		  _name: 'observable',
	
		  _onActivation: function _onActivation() {},
		  _onDeactivation: function _onDeactivation() {},
	
		  _setActive: function _setActive(active) {
		    if (this._active !== active) {
		      this._active = active;
		      if (active) {
		        this._activating = true;
		        this._onActivation();
		        this._activating = false;
		      } else {
		        this._onDeactivation();
		      }
		    }
		  },
	
		  _clear: function _clear() {
		    this._setActive(false);
		    this._dispatcher.cleanup();
		    this._dispatcher = null;
		    this._logHandlers = null;
		  },
	
		  _emit: function _emit(type, x) {
		    switch (type) {
		      case VALUE:
		        return this._emitValue(x);
		      case ERROR:
		        return this._emitError(x);
		      case END:
		        return this._emitEnd();
		    }
		  },
	
		  _emitValue: function _emitValue(value) {
		    if (this._alive) {
		      this._dispatcher.dispatch({ type: VALUE, value: value });
		    }
		  },
	
		  _emitError: function _emitError(value) {
		    if (this._alive) {
		      this._dispatcher.dispatch({ type: ERROR, value: value });
		    }
		  },
	
		  _emitEnd: function _emitEnd() {
		    if (this._alive) {
		      this._alive = false;
		      this._dispatcher.dispatch({ type: END });
		      this._clear();
		    }
		  },
	
		  _on: function _on(type, fn) {
		    if (this._alive) {
		      this._dispatcher.add(type, fn);
		      this._setActive(true);
		    } else {
		      callSubscriber(type, fn, { type: END });
		    }
		    return this;
		  },
	
		  _off: function _off(type, fn) {
		    if (this._alive) {
		      var count = this._dispatcher.remove(type, fn);
		      if (count === 0) {
		        this._setActive(false);
		      }
		    }
		    return this;
		  },
	
		  onValue: function onValue(fn) {
		    return this._on(VALUE, fn);
		  },
		  onError: function onError(fn) {
		    return this._on(ERROR, fn);
		  },
		  onEnd: function onEnd(fn) {
		    return this._on(END, fn);
		  },
		  onAny: function onAny(fn) {
		    return this._on(ANY, fn);
		  },
	
		  offValue: function offValue(fn) {
		    return this._off(VALUE, fn);
		  },
		  offError: function offError(fn) {
		    return this._off(ERROR, fn);
		  },
		  offEnd: function offEnd(fn) {
		    return this._off(END, fn);
		  },
		  offAny: function offAny(fn) {
		    return this._off(ANY, fn);
		  },
	
		  // A and B must be subclasses of Stream and Property (order doesn't matter)
		  _ofSameType: function _ofSameType(A, B) {
		    return A.prototype.getType() === this.getType() ? A : B;
		  },
	
		  setName: function setName(sourceObs, /* optional */selfName) {
		    this._name = selfName ? sourceObs._name + '.' + selfName : sourceObs;
		    return this;
		  },
	
		  log: function log() {
		    var name = arguments.length <= 0 || arguments[0] === undefined ? this.toString() : arguments[0];
	
		    var isCurrent = undefined;
		    var handler = function handler(event) {
		      var type = '<' + event.type + (isCurrent ? ':current' : '') + '>';
		      if (event.type === END) {
		        console.log(name, type);
		      } else {
		        console.log(name, type, event.value);
		      }
		    };
	
		    if (this._alive) {
		      if (!this._logHandlers) {
		        this._logHandlers = [];
		      }
		      this._logHandlers.push({ name: name, handler: handler });
		    }
	
		    isCurrent = true;
		    this.onAny(handler);
		    isCurrent = false;
	
		    return this;
		  },
	
		  offLog: function offLog() {
		    var name = arguments.length <= 0 || arguments[0] === undefined ? this.toString() : arguments[0];
	
		    if (this._logHandlers) {
		      var handlerIndex = findByPred(this._logHandlers, function (obj) {
		        return obj.name === name;
		      });
		      if (handlerIndex !== -1) {
		        this.offAny(this._logHandlers[handlerIndex].handler);
		        this._logHandlers.splice(handlerIndex, 1);
		      }
		    }
	
		    return this;
		  }
		});
	
		// extend() can't handle `toString` in IE8
		Observable.prototype.toString = function () {
		  return '[' + this._name + ']';
		};
	
		module.exports = Observable;
	
	/***/ },
	/* 2 */
	/***/ function(module, exports) {
	
		"use strict";
	
		function createObj(proto) {
		  var F = function F() {};
		  F.prototype = proto;
		  return new F();
		}
	
		function extend(target /*, mixin1, mixin2...*/) {
		  var length = arguments.length,
		      i = undefined,
		      prop = undefined;
		  for (i = 1; i < length; i++) {
		    for (prop in arguments[i]) {
		      target[prop] = arguments[i][prop];
		    }
		  }
		  return target;
		}
	
		function inherit(Child, Parent /*, mixin1, mixin2...*/) {
		  var length = arguments.length,
		      i = undefined;
		  Child.prototype = createObj(Parent.prototype);
		  Child.prototype.constructor = Child;
		  for (i = 2; i < length; i++) {
		    extend(Child.prototype, arguments[i]);
		  }
		  return Child;
		}
	
		module.exports = { extend: extend, inherit: inherit };
	
	/***/ },
	/* 3 */
	/***/ function(module, exports) {
	
		'use strict';
	
		exports.NOTHING = ['<nothing>'];
		exports.END = 'end';
		exports.VALUE = 'value';
		exports.ERROR = 'error';
		exports.ANY = 'any';
	
	/***/ },
	/* 4 */
	/***/ function(module, exports, __webpack_require__) {
	
		'use strict';
	
		var _require = __webpack_require__(2);
	
		var extend = _require.extend;
	
		var _require2 = __webpack_require__(3);
	
		var VALUE = _require2.VALUE;
		var ERROR = _require2.ERROR;
		var ANY = _require2.ANY;
	
		var _require3 = __webpack_require__(5);
	
		var concat = _require3.concat;
		var findByPred = _require3.findByPred;
		var _remove = _require3.remove;
		var contains = _require3.contains;
	
		function callSubscriber(type, fn, event) {
		  if (type === ANY) {
		    fn(event);
		  } else if (type === event.type) {
		    if (type === VALUE || type === ERROR) {
		      fn(event.value);
		    } else {
		      fn();
		    }
		  }
		}
	
		function Dispatcher() {
		  this._items = [];
		  this._inLoop = 0;
		  this._removedItems = null;
		}
	
		extend(Dispatcher.prototype, {
	
		  add: function add(type, fn) {
		    this._items = concat(this._items, [{ type: type, fn: fn }]);
		    return this._items.length;
		  },
	
		  remove: function remove(type, fn) {
		    var index = findByPred(this._items, function (x) {
		      return x.type === type && x.fn === fn;
		    });
	
		    // if we're currently in a notification loop,
		    // remember this subscriber was removed
		    if (this._inLoop !== 0 && index !== -1) {
		      if (this._removedItems === null) {
		        this._removedItems = [];
		      }
		      this._removedItems.push(this._items[index]);
		    }
	
		    this._items = _remove(this._items, index);
		    return this._items.length;
		  },
	
		  dispatch: function dispatch(event) {
		    this._inLoop++;
		    for (var i = 0, items = this._items; i < items.length; i++) {
	
		      // cleanup was called
		      if (this._items === null) {
		        break;
		      }
	
		      // this subscriber was removed
		      if (this._removedItems !== null && contains(this._removedItems, items[i])) {
		        continue;
		      }
	
		      callSubscriber(items[i].type, items[i].fn, event);
		    }
		    this._inLoop--;
		    if (this._inLoop === 0) {
		      this._removedItems = null;
		    }
		  },
	
		  cleanup: function cleanup() {
		    this._items = null;
		  }
	
		});
	
		module.exports = { callSubscriber: callSubscriber, Dispatcher: Dispatcher };
	
	/***/ },
	/* 5 */
	/***/ function(module, exports) {
	
		"use strict";
	
		function concat(a, b) {
		  var result = undefined,
		      length = undefined,
		      i = undefined,
		      j = undefined;
		  if (a.length === 0) {
		    return b;
		  }
		  if (b.length === 0) {
		    return a;
		  }
		  j = 0;
		  result = new Array(a.length + b.length);
		  length = a.length;
		  for (i = 0; i < length; i++, j++) {
		    result[j] = a[i];
		  }
		  length = b.length;
		  for (i = 0; i < length; i++, j++) {
		    result[j] = b[i];
		  }
		  return result;
		}
	
		function circleShift(arr, distance) {
		  var length = arr.length,
		      result = new Array(length),
		      i = undefined;
		  for (i = 0; i < length; i++) {
		    result[(i + distance) % length] = arr[i];
		  }
		  return result;
		}
	
		function find(arr, value) {
		  var length = arr.length,
		      i = undefined;
		  for (i = 0; i < length; i++) {
		    if (arr[i] === value) {
		      return i;
		    }
		  }
		  return -1;
		}
	
		function findByPred(arr, pred) {
		  var length = arr.length,
		      i = undefined;
		  for (i = 0; i < length; i++) {
		    if (pred(arr[i])) {
		      return i;
		    }
		  }
		  return -1;
		}
	
		function cloneArray(input) {
		  var length = input.length,
		      result = new Array(length),
		      i = undefined;
		  for (i = 0; i < length; i++) {
		    result[i] = input[i];
		  }
		  return result;
		}
	
		function remove(input, index) {
		  var length = input.length,
		      result = undefined,
		      i = undefined,
		      j = undefined;
		  if (index >= 0 && index < length) {
		    if (length === 1) {
		      return [];
		    } else {
		      result = new Array(length - 1);
		      for (i = 0, j = 0; i < length; i++) {
		        if (i !== index) {
		          result[j] = input[i];
		          j++;
		        }
		      }
		      return result;
		    }
		  } else {
		    return input;
		  }
		}
	
		function removeByPred(input, pred) {
		  return remove(input, findByPred(input, pred));
		}
	
		function map(input, fn) {
		  var length = input.length,
		      result = new Array(length),
		      i = undefined;
		  for (i = 0; i < length; i++) {
		    result[i] = fn(input[i]);
		  }
		  return result;
		}
	
		function forEach(arr, fn) {
		  var length = arr.length,
		      i = undefined;
		  for (i = 0; i < length; i++) {
		    fn(arr[i]);
		  }
		}
	
		function fillArray(arr, value) {
		  var length = arr.length,
		      i = undefined;
		  for (i = 0; i < length; i++) {
		    arr[i] = value;
		  }
		}
	
		function contains(arr, value) {
		  return find(arr, value) !== -1;
		}
	
		function slide(cur, next, max) {
		  var length = Math.min(max, cur.length + 1),
		      offset = cur.length - length + 1,
		      result = new Array(length),
		      i = undefined;
		  for (i = offset; i < length; i++) {
		    result[i - offset] = cur[i];
		  }
		  result[length - 1] = next;
		  return result;
		}
	
		module.exports = {
		  concat: concat,
		  circleShift: circleShift,
		  find: find,
		  findByPred: findByPred,
		  cloneArray: cloneArray,
		  remove: remove,
		  removeByPred: removeByPred,
		  map: map,
		  forEach: forEach,
		  fillArray: fillArray,
		  contains: contains,
		  slide: slide
		};
	
	/***/ },
	/* 6 */
	/***/ function(module, exports, __webpack_require__) {
	
		'use strict';
	
		var _require = __webpack_require__(2);
	
		var inherit = _require.inherit;
	
		var Observable = __webpack_require__(1);
	
		function Stream() {
		  Observable.call(this);
		}
	
		inherit(Stream, Observable, {
	
		  _name: 'stream',
	
		  getType: function getType() {
		    return 'stream';
		  }
	
		});
	
		module.exports = Stream;
	
	/***/ },
	/* 7 */
	/***/ function(module, exports, __webpack_require__) {
	
		'use strict';
	
		var _require = __webpack_require__(2);
	
		var inherit = _require.inherit;
	
		var _require2 = __webpack_require__(3);
	
		var VALUE = _require2.VALUE;
		var ERROR = _require2.ERROR;
		var END = _require2.END;
	
		var _require3 = __webpack_require__(4);
	
		var callSubscriber = _require3.callSubscriber;
	
		var Observable = __webpack_require__(1);
	
		function Property() {
		  Observable.call(this);
		  this._currentEvent = null;
		}
	
		inherit(Property, Observable, {
	
		  _name: 'property',
	
		  _emitValue: function _emitValue(value) {
		    if (this._alive) {
		      this._currentEvent = { type: VALUE, value: value };
		      if (!this._activating) {
		        this._dispatcher.dispatch({ type: VALUE, value: value });
		      }
		    }
		  },
	
		  _emitError: function _emitError(value) {
		    if (this._alive) {
		      this._currentEvent = { type: ERROR, value: value };
		      if (!this._activating) {
		        this._dispatcher.dispatch({ type: ERROR, value: value });
		      }
		    }
		  },
	
		  _emitEnd: function _emitEnd() {
		    if (this._alive) {
		      this._alive = false;
		      if (!this._activating) {
		        this._dispatcher.dispatch({ type: END });
		      }
		      this._clear();
		    }
		  },
	
		  _on: function _on(type, fn) {
		    if (this._alive) {
		      this._dispatcher.add(type, fn);
		      this._setActive(true);
		    }
		    if (this._currentEvent !== null) {
		      callSubscriber(type, fn, this._currentEvent);
		    }
		    if (!this._alive) {
		      callSubscriber(type, fn, { type: END });
		    }
		    return this;
		  },
	
		  getType: function getType() {
		    return 'property';
		  }
	
		});
	
		module.exports = Property;
	
	/***/ },
	/* 8 */
	/***/ function(module, exports, __webpack_require__) {
	
		'use strict';
	
		var Stream = __webpack_require__(6);
	
		var neverS = new Stream();
		neverS._emitEnd();
		neverS._name = 'never';
	
		module.exports = function never() {
		  return neverS;
		};
	
	/***/ },
	/* 9 */
	/***/ function(module, exports, __webpack_require__) {
	
		'use strict';
	
		var timeBased = __webpack_require__(10);
	
		var S = timeBased({
	
		  _name: 'later',
	
		  _init: function _init(_ref) {
		    var x = _ref.x;
	
		    this._x = x;
		  },
	
		  _free: function _free() {
		    this._x = null;
		  },
	
		  _onTick: function _onTick() {
		    this._emitValue(this._x);
		    this._emitEnd();
		  }
	
		});
	
		module.exports = function later(wait, x) {
		  return new S(wait, { x: x });
		};
	
	/***/ },
	/* 10 */
	/***/ function(module, exports, __webpack_require__) {
	
		'use strict';
	
		var _require = __webpack_require__(2);
	
		var inherit = _require.inherit;
	
		var Stream = __webpack_require__(6);
	
		module.exports = function timeBased(mixin) {
	
		  function AnonymousStream(wait, options) {
		    var _this = this;
	
		    Stream.call(this);
		    this._wait = wait;
		    this._intervalId = null;
		    this._$onTick = function () {
		      return _this._onTick();
		    };
		    this._init(options);
		  }
	
		  inherit(AnonymousStream, Stream, {
	
		    _init: function _init() {},
		    _free: function _free() {},
	
		    _onTick: function _onTick() {},
	
		    _onActivation: function _onActivation() {
		      this._intervalId = setInterval(this._$onTick, this._wait);
		    },
	
		    _onDeactivation: function _onDeactivation() {
		      if (this._intervalId !== null) {
		        clearInterval(this._intervalId);
		        this._intervalId = null;
		      }
		    },
	
		    _clear: function _clear() {
		      Stream.prototype._clear.call(this);
		      this._$onTick = null;
		      this._free();
		    }
	
		  }, mixin);
	
		  return AnonymousStream;
		};
	
	/***/ },
	/* 11 */
	/***/ function(module, exports, __webpack_require__) {
	
		'use strict';
	
		var timeBased = __webpack_require__(10);
	
		var S = timeBased({
	
		  _name: 'interval',
	
		  _init: function _init(_ref) {
		    var x = _ref.x;
	
		    this._x = x;
		  },
	
		  _free: function _free() {
		    this._x = null;
		  },
	
		  _onTick: function _onTick() {
		    this._emitValue(this._x);
		  }
	
		});
	
		module.exports = function interval(wait, x) {
		  return new S(wait, { x: x });
		};
	
	/***/ },
	/* 12 */
	/***/ function(module, exports, __webpack_require__) {
	
		'use strict';
	
		var timeBased = __webpack_require__(10);
	
		var _require = __webpack_require__(5);
	
		var cloneArray = _require.cloneArray;
	
		var never = __webpack_require__(8);
	
		var S = timeBased({
	
		  _name: 'sequentially',
	
		  _init: function _init(_ref) {
		    var xs = _ref.xs;
	
		    this._xs = cloneArray(xs);
		  },
	
		  _free: function _free() {
		    this._xs = null;
		  },
	
		  _onTick: function _onTick() {
		    if (this._xs.length === 1) {
		      this._emitValue(this._xs[0]);
		      this._emitEnd();
		    } else {
		      this._emitValue(this._xs.shift());
		    }
		  }
	
		});
	
		module.exports = function sequentially(wait, xs) {
		  return xs.length === 0 ? never() : new S(wait, { xs: xs });
		};
	
	/***/ },
	/* 13 */
	/***/ function(module, exports, __webpack_require__) {
	
		'use strict';
	
		var timeBased = __webpack_require__(10);
	
		var S = timeBased({
	
		  _name: 'fromPoll',
	
		  _init: function _init(_ref) {
		    var fn = _ref.fn;
	
		    this._fn = fn;
		  },
	
		  _free: function _free() {
		    this._fn = null;
		  },
	
		  _onTick: function _onTick() {
		    var fn = this._fn;
		    this._emitValue(fn());
		  }
	
		});
	
		module.exports = function fromPoll(wait, fn) {
		  return new S(wait, { fn: fn });
		};
	
	/***/ },
	/* 14 */
	/***/ function(module, exports, __webpack_require__) {
	
		'use strict';
	
		var timeBased = __webpack_require__(10);
		var emitter = __webpack_require__(15);
	
		var S = timeBased({
	
		  _name: 'withInterval',
	
		  _init: function _init(_ref) {
		    var fn = _ref.fn;
	
		    this._fn = fn;
		    this._emitter = emitter(this);
		  },
	
		  _free: function _free() {
		    this._fn = null;
		    this._emitter = null;
		  },
	
		  _onTick: function _onTick() {
		    var fn = this._fn;
		    fn(this._emitter);
		  }
	
		});
	
		module.exports = function withInterval(wait, fn) {
		  return new S(wait, { fn: fn });
		};
	
	/***/ },
	/* 15 */
	/***/ function(module, exports) {
	
		"use strict";
	
		module.exports = function emitter(obs) {
	
		  function value(x) {
		    obs._emitValue(x);
		    return obs._active;
		  }
	
		  function error(x) {
		    obs._emitError(x);
		    return obs._active;
		  }
	
		  function end() {
		    obs._emitEnd();
		    return obs._active;
		  }
	
		  function event(e) {
		    obs._emit(e.type, e.value);
		    return obs._active;
		  }
	
		  return { value: value, error: error, end: end, event: event, emit: value, emitEvent: event };
		};
	
	/***/ },
	/* 16 */
	/***/ function(module, exports, __webpack_require__) {
	
		'use strict';
	
		var stream = __webpack_require__(17);
	
		module.exports = function fromCallback(callbackConsumer) {
	
		  var called = false;
	
		  return stream(function (emitter) {
	
		    if (!called) {
		      callbackConsumer(function (x) {
		        emitter.emit(x);
		        emitter.end();
		      });
		      called = true;
		    }
		  }).setName('fromCallback');
		};
	
	/***/ },
	/* 17 */
	/***/ function(module, exports, __webpack_require__) {
	
		'use strict';
	
		var _require = __webpack_require__(2);
	
		var inherit = _require.inherit;
	
		var Stream = __webpack_require__(6);
		var emitter = __webpack_require__(15);
	
		function S(fn) {
		  Stream.call(this);
		  this._fn = fn;
		  this._unsubscribe = null;
		}
	
		inherit(S, Stream, {
	
		  _name: 'stream',
	
		  _onActivation: function _onActivation() {
		    var fn = this._fn;
		    var unsubscribe = fn(emitter(this));
		    this._unsubscribe = typeof unsubscribe === 'function' ? unsubscribe : null;
	
		    // fix https://github.com/rpominov/kefir/issues/35
		    if (!this._active) {
		      this._callUnsubscribe();
		    }
		  },
	
		  _callUnsubscribe: function _callUnsubscribe() {
		    if (this._unsubscribe !== null) {
		      this._unsubscribe();
		      this._unsubscribe = null;
		    }
		  },
	
		  _onDeactivation: function _onDeactivation() {
		    this._callUnsubscribe();
		  },
	
		  _clear: function _clear() {
		    Stream.prototype._clear.call(this);
		    this._fn = null;
		  }
	
		});
	
		module.exports = function stream(fn) {
		  return new S(fn);
		};
	
	/***/ },
	/* 18 */
	/***/ function(module, exports, __webpack_require__) {
	
		'use strict';
	
		var stream = __webpack_require__(17);
	
		module.exports = function fromNodeCallback(callbackConsumer) {
	
		  var called = false;
	
		  return stream(function (emitter) {
	
		    if (!called) {
		      callbackConsumer(function (error, x) {
		        if (error) {
		          emitter.error(error);
		        } else {
		          emitter.emit(x);
		        }
		        emitter.end();
		      });
		      called = true;
		    }
		  }).setName('fromNodeCallback');
		};
	
	/***/ },
	/* 19 */
	/***/ function(module, exports, __webpack_require__) {
	
		'use strict';
	
		var fromSubUnsub = __webpack_require__(20);
	
		var pairs = [['addEventListener', 'removeEventListener'], ['addListener', 'removeListener'], ['on', 'off']];
	
		module.exports = function fromEvents(target, eventName, transformer) {
		  var sub = undefined,
		      unsub = undefined;
	
		  for (var i = 0; i < pairs.length; i++) {
		    if (typeof target[pairs[i][0]] === 'function' && typeof target[pairs[i][1]] === 'function') {
		      sub = pairs[i][0];
		      unsub = pairs[i][1];
		      break;
		    }
		  }
	
		  if (sub === undefined) {
		    throw new Error('target don\'t support any of ' + 'addEventListener/removeEventListener, addListener/removeListener, on/off method pair');
		  }
	
		  return fromSubUnsub(function (handler) {
		    return target[sub](eventName, handler);
		  }, function (handler) {
		    return target[unsub](eventName, handler);
		  }, transformer).setName('fromEvents');
		};
	
	/***/ },
	/* 20 */
	/***/ function(module, exports, __webpack_require__) {
	
		'use strict';
	
		var stream = __webpack_require__(17);
	
		var _require = __webpack_require__(21);
	
		var apply = _require.apply;
	
		module.exports = function fromSubUnsub(sub, unsub, transformer /* Function | falsey */) {
		  return stream(function (emitter) {
	
		    var handler = transformer ? function () {
		      emitter.emit(apply(transformer, this, arguments));
		    } : function (x) {
		      emitter.emit(x);
		    };
	
		    sub(handler);
		    return function () {
		      return unsub(handler);
		    };
		  }).setName('fromSubUnsub');
		};
	
	/***/ },
	/* 21 */
	/***/ function(module, exports) {
	
		"use strict";
	
		function spread(fn, length) {
		  switch (length) {
		    case 0:
		      return function () {
		        return fn();
		      };
		    case 1:
		      return function (a) {
		        return fn(a[0]);
		      };
		    case 2:
		      return function (a) {
		        return fn(a[0], a[1]);
		      };
		    case 3:
		      return function (a) {
		        return fn(a[0], a[1], a[2]);
		      };
		    case 4:
		      return function (a) {
		        return fn(a[0], a[1], a[2], a[3]);
		      };
		    default:
		      return function (a) {
		        return fn.apply(null, a);
		      };
		  }
		}
	
		function apply(fn, c, a) {
		  var aLength = a ? a.length : 0;
		  if (c == null) {
		    switch (aLength) {
		      case 0:
		        return fn();
		      case 1:
		        return fn(a[0]);
		      case 2:
		        return fn(a[0], a[1]);
		      case 3:
		        return fn(a[0], a[1], a[2]);
		      case 4:
		        return fn(a[0], a[1], a[2], a[3]);
		      default:
		        return fn.apply(null, a);
		    }
		  } else {
		    switch (aLength) {
		      case 0:
		        return fn.call(c);
		      default:
		        return fn.apply(c, a);
		    }
		  }
		}
	
		module.exports = { spread: spread, apply: apply };
	
	/***/ },
	/* 22 */
	/***/ function(module, exports, __webpack_require__) {
	
		'use strict';
	
		var _require = __webpack_require__(2);
	
		var inherit = _require.inherit;
	
		var Property = __webpack_require__(7);
	
		// HACK:
		//   We don't call parent Class constructor, but instead putting all necessary
		//   properties into prototype to simulate ended Property
		//   (see Propperty and Observable classes).
	
		function P(value) {
		  this._currentEvent = { type: 'value', value: value, current: true };
		}
	
		inherit(P, Property, {
		  _name: 'constant',
		  _active: false,
		  _activating: false,
		  _alive: false,
		  _dispatcher: null,
		  _logHandlers: null
		});
	
		module.exports = function constant(x) {
		  return new P(x);
		};
	
	/***/ },
	/* 23 */
	/***/ function(module, exports, __webpack_require__) {
	
		'use strict';
	
		var _require = __webpack_require__(2);
	
		var inherit = _require.inherit;
	
		var Property = __webpack_require__(7);
	
		// HACK:
		//   We don't call parent Class constructor, but instead putting all necessary
		//   properties into prototype to simulate ended Property
		//   (see Propperty and Observable classes).
	
		function P(value) {
		  this._currentEvent = { type: 'error', value: value, current: true };
		}
	
		inherit(P, Property, {
		  _name: 'constantError',
		  _active: false,
		  _activating: false,
		  _alive: false,
		  _dispatcher: null,
		  _logHandlers: null
		});
	
		module.exports = function constantError(x) {
		  return new P(x);
		};
	
	/***/ },
	/* 24 */
	/***/ function(module, exports, __webpack_require__) {
	
		'use strict';
	
		var _require = __webpack_require__(25);
	
		var createProperty = _require.createProperty;
	
		var P = createProperty('toProperty', {
	
		  _init: function _init(_ref) {
		    var fn = _ref.fn;
	
		    this._getInitialCurrent = fn;
		  },
	
		  _onActivation: function _onActivation() {
		    if (this._getInitialCurrent !== null) {
		      var getInitial = this._getInitialCurrent;
		      this._emitValue(getInitial());
		    }
		    this._source.onAny(this._$handleAny); // copied from patterns/one-source
		  }
	
		});
	
		module.exports = function toProperty(obs) {
		  var fn = arguments.length <= 1 || arguments[1] === undefined ? null : arguments[1];
	
		  if (fn !== null && typeof fn !== 'function') {
		    throw new Error('You should call toProperty() with a function or no arguments.');
		  }
		  return new P(obs, { fn: fn });
		};
	
	/***/ },
	/* 25 */
	/***/ function(module, exports, __webpack_require__) {
	
		'use strict';
	
		var Stream = __webpack_require__(6);
		var Property = __webpack_require__(7);
	
		var _require = __webpack_require__(2);
	
		var inherit = _require.inherit;
	
		var _require2 = __webpack_require__(3);
	
		var VALUE = _require2.VALUE;
		var ERROR = _require2.ERROR;
		var END = _require2.END;
	
		function createConstructor(BaseClass, name) {
		  return function AnonymousObservable(source, options) {
		    var _this = this;
	
		    BaseClass.call(this);
		    this._source = source;
		    this._name = source._name + '.' + name;
		    this._init(options);
		    this._$handleAny = function (event) {
		      return _this._handleAny(event);
		    };
		  };
		}
	
		function createClassMethods(BaseClass) {
		  return {
	
		    _init: function _init() {},
		    _free: function _free() {},
	
		    _handleValue: function _handleValue(x) {
		      this._emitValue(x);
		    },
		    _handleError: function _handleError(x) {
		      this._emitError(x);
		    },
		    _handleEnd: function _handleEnd() {
		      this._emitEnd();
		    },
	
		    _handleAny: function _handleAny(event) {
		      switch (event.type) {
		        case VALUE:
		          return this._handleValue(event.value);
		        case ERROR:
		          return this._handleError(event.value);
		        case END:
		          return this._handleEnd();
		      }
		    },
	
		    _onActivation: function _onActivation() {
		      this._source.onAny(this._$handleAny);
		    },
		    _onDeactivation: function _onDeactivation() {
		      this._source.offAny(this._$handleAny);
		    },
	
		    _clear: function _clear() {
		      BaseClass.prototype._clear.call(this);
		      this._source = null;
		      this._$handleAny = null;
		      this._free();
		    }
	
		  };
		}
	
		function createStream(name, mixin) {
		  var S = createConstructor(Stream, name);
		  inherit(S, Stream, createClassMethods(Stream), mixin);
		  return S;
		}
	
		function createProperty(name, mixin) {
		  var P = createConstructor(Property, name);
		  inherit(P, Property, createClassMethods(Property), mixin);
		  return P;
		}
	
		module.exports = { createStream: createStream, createProperty: createProperty };
	
	/***/ },
	/* 26 */
	/***/ function(module, exports, __webpack_require__) {
	
		'use strict';
	
		var _require = __webpack_require__(25);
	
		var createStream = _require.createStream;
	
		var S = createStream('changes', {
	
		  _handleValue: function _handleValue(x) {
		    if (!this._activating) {
		      this._emitValue(x);
		    }
		  },
	
		  _handleError: function _handleError(x) {
		    if (!this._activating) {
		      this._emitError(x);
		    }
		  }
	
		});
	
		module.exports = function changes(obs) {
		  return new S(obs);
		};
	
	/***/ },
	/* 27 */
	/***/ function(module, exports, __webpack_require__) {
	
		'use strict';
	
		var stream = __webpack_require__(17);
		var toProperty = __webpack_require__(24);
	
		module.exports = function fromPromise(promise) {
	
		  var called = false;
	
		  var result = stream(function (emitter) {
		    if (!called) {
		      var onValue = function onValue(x) {
		        emitter.emit(x);
		        emitter.end();
		      };
		      var onError = function onError(x) {
		        emitter.error(x);
		        emitter.end();
		      };
		      var _promise = promise.then(onValue, onError);
	
		      // prevent libraries like 'Q' or 'when' from swallowing exceptions
		      if (_promise && typeof _promise.done === 'function') {
		        _promise.done();
		      }
	
		      called = true;
		    }
		  });
	
		  return toProperty(result, null).setName('fromPromise');
		};
	
	/***/ },
	/* 28 */
	/***/ function(module, exports, __webpack_require__) {
	
		'use strict';
	
		var _require = __webpack_require__(3);
	
		var VALUE = _require.VALUE;
		var END = _require.END;
	
		function getGlodalPromise() {
		  if (typeof Promise === 'function') {
		    return Promise;
		  } else {
		    throw new Error('There isn\'t default Promise, use shim or parameter');
		  }
		}
	
		module.exports = function (obs) {
		  var Promise = arguments.length <= 1 || arguments[1] === undefined ? getGlodalPromise() : arguments[1];
	
		  var last = null;
		  return new Promise(function (resolve, reject) {
		    obs.onAny(function (event) {
		      if (event.type === END && last !== null) {
		        (last.type === VALUE ? resolve : reject)(last.value);
		        last = null;
		      } else {
		        last = event;
		      }
		    });
		  });
		};
	
	/***/ },
	/* 29 */
	/***/ function(module, exports, __webpack_require__) {
	
		'use strict';
	
		var stream = __webpack_require__(17);
		var symbol = __webpack_require__(30)('observable');
	
		module.exports = function fromESObservable(_observable) {
		  var observable = _observable[symbol] ? _observable[symbol]() : _observable;
		  return stream(function (emitter) {
		    var unsub = observable.subscribe({
		      error: function error(_error) {
		        emitter.error(_error);
		        emitter.end();
		      },
		      next: function next(value) {
		        emitter.emit(value);
		      },
		      complete: function complete() {
		        emitter.end();
		      }
		    });
	
		    if (unsub.unsubscribe) {
		      return function () {
		        unsub.unsubscribe();
		      };
		    } else {
		      return unsub;
		    }
		  }).setName('fromESObservable');
		};
	
	/***/ },
	/* 30 */
	/***/ function(module, exports) {
	
		'use strict';
	
		module.exports = function (key) {
		  if (typeof Symbol !== 'undefined' && Symbol[key]) {
		    return Symbol[key];
		  } else if (typeof Symbol !== 'undefined' && typeof Symbol['for'] === 'function') {
		    return Symbol['for'](key);
		  } else {
		    return '@@' + key;
		  }
		};
	
	/***/ },
	/* 31 */
	/***/ function(module, exports, __webpack_require__) {
	
		'use strict';
	
		var _require = __webpack_require__(2);
	
		var extend = _require.extend;
	
		var _require2 = __webpack_require__(3);
	
		var VALUE = _require2.VALUE;
		var ERROR = _require2.ERROR;
		var END = _require2.END;
	
		function ESObservable(observable) {
		  this._observable = observable.takeErrors(1);
		}
	
		extend(ESObservable.prototype, {
		  subscribe: function subscribe(observer) {
		    var _this = this;
	
		    var fn = function fn(event) {
		      if (event.type === VALUE && observer.next) {
		        observer.next(event.value);
		      } else if (event.type === ERROR && observer.error) {
		        observer.error(event.value);
		      } else if (event.type === END && observer.complete) {
		        observer.complete(event.value);
		      }
		    };
	
		    this._observable.onAny(fn);
		    return function () {
		      return _this._observable.offAny(fn);
		    };
		  }
		});
	
		module.exports = function toESObservable() {
		  return new ESObservable(this);
		};
	
	/***/ },
	/* 32 */
	/***/ function(module, exports, __webpack_require__) {
	
		'use strict';
	
		var _require = __webpack_require__(25);
	
		var createStream = _require.createStream;
		var createProperty = _require.createProperty;
	
		var mixin = {
	
		  _init: function _init(_ref) {
		    var fn = _ref.fn;
	
		    this._fn = fn;
		  },
	
		  _free: function _free() {
		    this._fn = null;
		  },
	
		  _handleValue: function _handleValue(x) {
		    var fn = this._fn;
		    this._emitValue(fn(x));
		  }
	
		};
	
		var S = createStream('map', mixin);
		var P = createProperty('map', mixin);
	
		var id = function id(x) {
		  return x;
		};
	
		module.exports = function map(obs) {
		  var fn = arguments.length <= 1 || arguments[1] === undefined ? id : arguments[1];
	
		  return new (obs._ofSameType(S, P))(obs, { fn: fn });
		};
	
	/***/ },
	/* 33 */
	/***/ function(module, exports, __webpack_require__) {
	
		'use strict';
	
		var _require = __webpack_require__(25);
	
		var createStream = _require.createStream;
		var createProperty = _require.createProperty;
	
		var mixin = {
	
		  _init: function _init(_ref) {
		    var fn = _ref.fn;
	
		    this._fn = fn;
		  },
	
		  _free: function _free() {
		    this._fn = null;
		  },
	
		  _handleValue: function _handleValue(x) {
		    var fn = this._fn;
		    if (fn(x)) {
		      this._emitValue(x);
		    }
		  }
	
		};
	
		var S = createStream('filter', mixin);
		var P = createProperty('filter', mixin);
	
		var id = function id(x) {
		  return x;
		};
	
		module.exports = function filter(obs) {
		  var fn = arguments.length <= 1 || arguments[1] === undefined ? id : arguments[1];
	
		  return new (obs._ofSameType(S, P))(obs, { fn: fn });
		};
	
	/***/ },
	/* 34 */
	/***/ function(module, exports, __webpack_require__) {
	
		'use strict';
	
		var _require = __webpack_require__(25);
	
		var createStream = _require.createStream;
		var createProperty = _require.createProperty;
	
		var mixin = {
	
		  _init: function _init(_ref) {
		    var n = _ref.n;
	
		    this._n = n;
		    if (n <= 0) {
		      this._emitEnd();
		    }
		  },
	
		  _handleValue: function _handleValue(x) {
		    this._n--;
		    this._emitValue(x);
		    if (this._n === 0) {
		      this._emitEnd();
		    }
		  }
	
		};
	
		var S = createStream('take', mixin);
		var P = createProperty('take', mixin);
	
		module.exports = function take(obs, n) {
		  return new (obs._ofSameType(S, P))(obs, { n: n });
		};
	
	/***/ },
	/* 35 */
	/***/ function(module, exports, __webpack_require__) {
	
		'use strict';
	
		var _require = __webpack_require__(25);
	
		var createStream = _require.createStream;
		var createProperty = _require.createProperty;
	
		var mixin = {
	
		  _init: function _init(_ref) {
		    var n = _ref.n;
	
		    this._n = n;
		    if (n <= 0) {
		      this._emitEnd();
		    }
		  },
	
		  _handleError: function _handleError(x) {
		    this._n--;
		    this._emitError(x);
		    if (this._n === 0) {
		      this._emitEnd();
		    }
		  }
	
		};
	
		var S = createStream('takeErrors', mixin);
		var P = createProperty('takeErrors', mixin);
	
		module.exports = function takeErrors(obs, n) {
		  return new (obs._ofSameType(S, P))(obs, { n: n });
		};
	
	/***/ },
	/* 36 */
	/***/ function(module, exports, __webpack_require__) {
	
		'use strict';
	
		var _require = __webpack_require__(25);
	
		var createStream = _require.createStream;
		var createProperty = _require.createProperty;
	
		var mixin = {
	
		  _init: function _init(_ref) {
		    var fn = _ref.fn;
	
		    this._fn = fn;
		  },
	
		  _free: function _free() {
		    this._fn = null;
		  },
	
		  _handleValue: function _handleValue(x) {
		    var fn = this._fn;
		    if (fn(x)) {
		      this._emitValue(x);
		    } else {
		      this._emitEnd();
		    }
		  }
	
		};
	
		var S = createStream('takeWhile', mixin);
		var P = createProperty('takeWhile', mixin);
	
		var id = function id(x) {
		  return x;
		};
	
		module.exports = function takeWhile(obs) {
		  var fn = arguments.length <= 1 || arguments[1] === undefined ? id : arguments[1];
	
		  return new (obs._ofSameType(S, P))(obs, { fn: fn });
		};
	
	/***/ },
	/* 37 */
	/***/ function(module, exports, __webpack_require__) {
	
		'use strict';
	
		var _require = __webpack_require__(25);
	
		var createStream = _require.createStream;
		var createProperty = _require.createProperty;
	
		var _require2 = __webpack_require__(3);
	
		var NOTHING = _require2.NOTHING;
	
		var mixin = {
	
		  _init: function _init() {
		    this._lastValue = NOTHING;
		  },
	
		  _free: function _free() {
		    this._lastValue = null;
		  },
	
		  _handleValue: function _handleValue(x) {
		    this._lastValue = x;
		  },
	
		  _handleEnd: function _handleEnd() {
		    if (this._lastValue !== NOTHING) {
		      this._emitValue(this._lastValue);
		    }
		    this._emitEnd();
		  }
	
		};
	
		var S = createStream('last', mixin);
		var P = createProperty('last', mixin);
	
		module.exports = function last(obs) {
		  return new (obs._ofSameType(S, P))(obs);
		};
	
	/***/ },
	/* 38 */
	/***/ function(module, exports, __webpack_require__) {
	
		'use strict';
	
		var _require = __webpack_require__(25);
	
		var createStream = _require.createStream;
		var createProperty = _require.createProperty;
	
		var mixin = {
	
		  _init: function _init(_ref) {
		    var n = _ref.n;
	
		    this._n = Math.max(0, n);
		  },
	
		  _handleValue: function _handleValue(x) {
		    if (this._n === 0) {
		      this._emitValue(x);
		    } else {
		      this._n--;
		    }
		  }
	
		};
	
		var S = createStream('skip', mixin);
		var P = createProperty('skip', mixin);
	
		module.exports = function skip(obs, n) {
		  return new (obs._ofSameType(S, P))(obs, { n: n });
		};
	
	/***/ },
	/* 39 */
	/***/ function(module, exports, __webpack_require__) {
	
		'use strict';
	
		var _require = __webpack_require__(25);
	
		var createStream = _require.createStream;
		var createProperty = _require.createProperty;
	
		var mixin = {
	
		  _init: function _init(_ref) {
		    var fn = _ref.fn;
	
		    this._fn = fn;
		  },
	
		  _free: function _free() {
		    this._fn = null;
		  },
	
		  _handleValue: function _handleValue(x) {
		    var fn = this._fn;
		    if (this._fn !== null && !fn(x)) {
		      this._fn = null;
		    }
		    if (this._fn === null) {
		      this._emitValue(x);
		    }
		  }
	
		};
	
		var S = createStream('skipWhile', mixin);
		var P = createProperty('skipWhile', mixin);
	
		var id = function id(x) {
		  return x;
		};
	
		module.exports = function skipWhile(obs) {
		  var fn = arguments.length <= 1 || arguments[1] === undefined ? id : arguments[1];
	
		  return new (obs._ofSameType(S, P))(obs, { fn: fn });
		};
	
	/***/ },
	/* 40 */
	/***/ function(module, exports, __webpack_require__) {
	
		'use strict';
	
		var _require = __webpack_require__(25);
	
		var createStream = _require.createStream;
		var createProperty = _require.createProperty;
	
		var _require2 = __webpack_require__(3);
	
		var NOTHING = _require2.NOTHING;
	
		var mixin = {
	
		  _init: function _init(_ref) {
		    var fn = _ref.fn;
	
		    this._fn = fn;
		    this._prev = NOTHING;
		  },
	
		  _free: function _free() {
		    this._fn = null;
		    this._prev = null;
		  },
	
		  _handleValue: function _handleValue(x) {
		    var fn = this._fn;
		    if (this._prev === NOTHING || !fn(this._prev, x)) {
		      this._prev = x;
		      this._emitValue(x);
		    }
		  }
	
		};
	
		var S = createStream('skipDuplicates', mixin);
		var P = createProperty('skipDuplicates', mixin);
	
		var eq = function eq(a, b) {
		  return a === b;
		};
	
		module.exports = function skipDuplicates(obs) {
		  var fn = arguments.length <= 1 || arguments[1] === undefined ? eq : arguments[1];
	
		  return new (obs._ofSameType(S, P))(obs, { fn: fn });
		};
	
	/***/ },
	/* 41 */
	/***/ function(module, exports, __webpack_require__) {
	
		'use strict';
	
		var _require = __webpack_require__(25);
	
		var createStream = _require.createStream;
		var createProperty = _require.createProperty;
	
		var _require2 = __webpack_require__(3);
	
		var NOTHING = _require2.NOTHING;
	
		var mixin = {
	
		  _init: function _init(_ref) {
		    var fn = _ref.fn;
		    var seed = _ref.seed;
	
		    this._fn = fn;
		    this._prev = seed;
		  },
	
		  _free: function _free() {
		    this._prev = null;
		    this._fn = null;
		  },
	
		  _handleValue: function _handleValue(x) {
		    if (this._prev !== NOTHING) {
		      var fn = this._fn;
		      this._emitValue(fn(this._prev, x));
		    }
		    this._prev = x;
		  }
	
		};
	
		var S = createStream('diff', mixin);
		var P = createProperty('diff', mixin);
	
		function defaultFn(a, b) {
		  return [a, b];
		}
	
		module.exports = function diff(obs, fn) {
		  var seed = arguments.length <= 2 || arguments[2] === undefined ? NOTHING : arguments[2];
	
		  return new (obs._ofSameType(S, P))(obs, { fn: fn || defaultFn, seed: seed });
		};
	
	/***/ },
	/* 42 */
	/***/ function(module, exports, __webpack_require__) {
	
		'use strict';
	
		var _require = __webpack_require__(25);
	
		var createProperty = _require.createProperty;
	
		var _require2 = __webpack_require__(3);
	
		var ERROR = _require2.ERROR;
		var NOTHING = _require2.NOTHING;
	
		var P = createProperty('scan', {
	
		  _init: function _init(_ref) {
		    var fn = _ref.fn;
		    var seed = _ref.seed;
	
		    this._fn = fn;
		    this._seed = seed;
		    if (seed !== NOTHING) {
		      this._emitValue(seed);
		    }
		  },
	
		  _free: function _free() {
		    this._fn = null;
		    this._seed = null;
		  },
	
		  _handleValue: function _handleValue(x) {
		    var fn = this._fn;
		    if (this._currentEvent === null || this._currentEvent.type === ERROR) {
		      this._emitValue(this._seed === NOTHING ? x : fn(this._seed, x));
		    } else {
		      this._emitValue(fn(this._currentEvent.value, x));
		    }
		  }
	
		});
	
		module.exports = function scan(obs, fn) {
		  var seed = arguments.length <= 2 || arguments[2] === undefined ? NOTHING : arguments[2];
	
		  return new P(obs, { fn: fn, seed: seed });
		};
	
	/***/ },
	/* 43 */
	/***/ function(module, exports, __webpack_require__) {
	
		'use strict';
	
		var _require = __webpack_require__(25);
	
		var createStream = _require.createStream;
	
		var mixin = {
	
		  _init: function _init(_ref) {
		    var fn = _ref.fn;
	
		    this._fn = fn;
		  },
	
		  _free: function _free() {
		    this._fn = null;
		  },
	
		  _handleValue: function _handleValue(x) {
		    var fn = this._fn;
		    var xs = fn(x);
		    for (var i = 0; i < xs.length; i++) {
		      this._emitValue(xs[i]);
		    }
		  }
	
		};
	
		var S = createStream('flatten', mixin);
	
		var id = function id(x) {
		  return x;
		};
	
		module.exports = function flatten(obs) {
		  var fn = arguments.length <= 1 || arguments[1] === undefined ? id : arguments[1];
	
		  return new S(obs, { fn: fn });
		};
	
	/***/ },
	/* 44 */
	/***/ function(module, exports, __webpack_require__) {
	
		'use strict';
	
		var _require = __webpack_require__(25);
	
		var createStream = _require.createStream;
		var createProperty = _require.createProperty;
	
		var END_MARKER = {};
	
		var mixin = {
	
		  _init: function _init(_ref) {
		    var _this = this;
	
		    var wait = _ref.wait;
	
		    this._wait = Math.max(0, wait);
		    this._buff = [];
		    this._$shiftBuff = function () {
		      var value = _this._buff.shift();
		      if (value === END_MARKER) {
		        _this._emitEnd();
		      } else {
		        _this._emitValue(value);
		      }
		    };
		  },
	
		  _free: function _free() {
		    this._buff = null;
		    this._$shiftBuff = null;
		  },
	
		  _handleValue: function _handleValue(x) {
		    if (this._activating) {
		      this._emitValue(x);
		    } else {
		      this._buff.push(x);
		      setTimeout(this._$shiftBuff, this._wait);
		    }
		  },
	
		  _handleEnd: function _handleEnd() {
		    if (this._activating) {
		      this._emitEnd();
		    } else {
		      this._buff.push(END_MARKER);
		      setTimeout(this._$shiftBuff, this._wait);
		    }
		  }
	
		};
	
		var S = createStream('delay', mixin);
		var P = createProperty('delay', mixin);
	
		module.exports = function delay(obs, wait) {
		  return new (obs._ofSameType(S, P))(obs, { wait: wait });
		};
	
	/***/ },
	/* 45 */
	/***/ function(module, exports, __webpack_require__) {
	
		'use strict';
	
		var _require = __webpack_require__(25);
	
		var createStream = _require.createStream;
		var createProperty = _require.createProperty;
	
		var now = __webpack_require__(46);
	
		var mixin = {
	
		  _init: function _init(_ref) {
		    var _this = this;
	
		    var wait = _ref.wait;
		    var leading = _ref.leading;
		    var trailing = _ref.trailing;
	
		    this._wait = Math.max(0, wait);
		    this._leading = leading;
		    this._trailing = trailing;
		    this._trailingValue = null;
		    this._timeoutId = null;
		    this._endLater = false;
		    this._lastCallTime = 0;
		    this._$trailingCall = function () {
		      return _this._trailingCall();
		    };
		  },
	
		  _free: function _free() {
		    this._trailingValue = null;
		    this._$trailingCall = null;
		  },
	
		  _handleValue: function _handleValue(x) {
		    if (this._activating) {
		      this._emitValue(x);
		    } else {
		      var curTime = now();
		      if (this._lastCallTime === 0 && !this._leading) {
		        this._lastCallTime = curTime;
		      }
		      var remaining = this._wait - (curTime - this._lastCallTime);
		      if (remaining <= 0) {
		        this._cancelTrailing();
		        this._lastCallTime = curTime;
		        this._emitValue(x);
		      } else if (this._trailing) {
		        this._cancelTrailing();
		        this._trailingValue = x;
		        this._timeoutId = setTimeout(this._$trailingCall, remaining);
		      }
		    }
		  },
	
		  _handleEnd: function _handleEnd() {
		    if (this._activating) {
		      this._emitEnd();
		    } else {
		      if (this._timeoutId) {
		        this._endLater = true;
		      } else {
		        this._emitEnd();
		      }
		    }
		  },
	
		  _cancelTrailing: function _cancelTrailing() {
		    if (this._timeoutId !== null) {
		      clearTimeout(this._timeoutId);
		      this._timeoutId = null;
		    }
		  },
	
		  _trailingCall: function _trailingCall() {
		    this._emitValue(this._trailingValue);
		    this._timeoutId = null;
		    this._trailingValue = null;
		    this._lastCallTime = !this._leading ? 0 : now();
		    if (this._endLater) {
		      this._emitEnd();
		    }
		  }
	
		};
	
		var S = createStream('throttle', mixin);
		var P = createProperty('throttle', mixin);
	
		module.exports = function throttle(obs, wait) {
		  var _ref2 = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];
	
		  var _ref2$leading = _ref2.leading;
		  var leading = _ref2$leading === undefined ? true : _ref2$leading;
		  var _ref2$trailing = _ref2.trailing;
		  var trailing = _ref2$trailing === undefined ? true : _ref2$trailing;
	
		  return new (obs._ofSameType(S, P))(obs, { wait: wait, leading: leading, trailing: trailing });
		};
	
	/***/ },
	/* 46 */
	/***/ function(module, exports) {
	
		"use strict";
	
		module.exports = Date.now ? function () {
		  return Date.now();
		} : function () {
		  return new Date().getTime();
		};
	
	/***/ },
	/* 47 */
	/***/ function(module, exports, __webpack_require__) {
	
		'use strict';
	
		var _require = __webpack_require__(25);
	
		var createStream = _require.createStream;
		var createProperty = _require.createProperty;
	
		var now = __webpack_require__(46);
	
		var mixin = {
	
		  _init: function _init(_ref) {
		    var _this = this;
	
		    var wait = _ref.wait;
		    var immediate = _ref.immediate;
	
		    this._wait = Math.max(0, wait);
		    this._immediate = immediate;
		    this._lastAttempt = 0;
		    this._timeoutId = null;
		    this._laterValue = null;
		    this._endLater = false;
		    this._$later = function () {
		      return _this._later();
		    };
		  },
	
		  _free: function _free() {
		    this._laterValue = null;
		    this._$later = null;
		  },
	
		  _handleValue: function _handleValue(x) {
		    if (this._activating) {
		      this._emitValue(x);
		    } else {
		      this._lastAttempt = now();
		      if (this._immediate && !this._timeoutId) {
		        this._emitValue(x);
		      }
		      if (!this._timeoutId) {
		        this._timeoutId = setTimeout(this._$later, this._wait);
		      }
		      if (!this._immediate) {
		        this._laterValue = x;
		      }
		    }
		  },
	
		  _handleEnd: function _handleEnd() {
		    if (this._activating) {
		      this._emitEnd();
		    } else {
		      if (this._timeoutId && !this._immediate) {
		        this._endLater = true;
		      } else {
		        this._emitEnd();
		      }
		    }
		  },
	
		  _later: function _later() {
		    var last = now() - this._lastAttempt;
		    if (last < this._wait && last >= 0) {
		      this._timeoutId = setTimeout(this._$later, this._wait - last);
		    } else {
		      this._timeoutId = null;
		      if (!this._immediate) {
		        this._emitValue(this._laterValue);
		        this._laterValue = null;
		      }
		      if (this._endLater) {
		        this._emitEnd();
		      }
		    }
		  }
	
		};
	
		var S = createStream('debounce', mixin);
		var P = createProperty('debounce', mixin);
	
		module.exports = function debounce(obs, wait) {
		  var _ref2 = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];
	
		  var _ref2$immediate = _ref2.immediate;
		  var immediate = _ref2$immediate === undefined ? false : _ref2$immediate;
	
		  return new (obs._ofSameType(S, P))(obs, { wait: wait, immediate: immediate });
		};
	
	/***/ },
	/* 48 */
	/***/ function(module, exports, __webpack_require__) {
	
		'use strict';
	
		var _require = __webpack_require__(25);
	
		var createStream = _require.createStream;
		var createProperty = _require.createProperty;
	
		var mixin = {
	
		  _init: function _init(_ref) {
		    var fn = _ref.fn;
	
		    this._fn = fn;
		  },
	
		  _free: function _free() {
		    this._fn = null;
		  },
	
		  _handleError: function _handleError(x) {
		    var fn = this._fn;
		    this._emitError(fn(x));
		  }
	
		};
	
		var S = createStream('mapErrors', mixin);
		var P = createProperty('mapErrors', mixin);
	
		var id = function id(x) {
		  return x;
		};
	
		module.exports = function mapErrors(obs) {
		  var fn = arguments.length <= 1 || arguments[1] === undefined ? id : arguments[1];
	
		  return new (obs._ofSameType(S, P))(obs, { fn: fn });
		};
	
	/***/ },
	/* 49 */
	/***/ function(module, exports, __webpack_require__) {
	
		'use strict';
	
		var _require = __webpack_require__(25);
	
		var createStream = _require.createStream;
		var createProperty = _require.createProperty;
	
		var mixin = {
	
		  _init: function _init(_ref) {
		    var fn = _ref.fn;
	
		    this._fn = fn;
		  },
	
		  _free: function _free() {
		    this._fn = null;
		  },
	
		  _handleError: function _handleError(x) {
		    var fn = this._fn;
		    if (fn(x)) {
		      this._emitError(x);
		    }
		  }
	
		};
	
		var S = createStream('filterErrors', mixin);
		var P = createProperty('filterErrors', mixin);
	
		var id = function id(x) {
		  return x;
		};
	
		module.exports = function filterErrors(obs) {
		  var fn = arguments.length <= 1 || arguments[1] === undefined ? id : arguments[1];
	
		  return new (obs._ofSameType(S, P))(obs, { fn: fn });
		};
	
	/***/ },
	/* 50 */
	/***/ function(module, exports, __webpack_require__) {
	
		'use strict';
	
		var _require = __webpack_require__(25);
	
		var createStream = _require.createStream;
		var createProperty = _require.createProperty;
	
		var mixin = {
		  _handleValue: function _handleValue() {}
		};
	
		var S = createStream('ignoreValues', mixin);
		var P = createProperty('ignoreValues', mixin);
	
		module.exports = function ignoreValues(obs) {
		  return new (obs._ofSameType(S, P))(obs);
		};
	
	/***/ },
	/* 51 */
	/***/ function(module, exports, __webpack_require__) {
	
		'use strict';
	
		var _require = __webpack_require__(25);
	
		var createStream = _require.createStream;
		var createProperty = _require.createProperty;
	
		var mixin = {
		  _handleError: function _handleError() {}
		};
	
		var S = createStream('ignoreErrors', mixin);
		var P = createProperty('ignoreErrors', mixin);
	
		module.exports = function ignoreErrors(obs) {
		  return new (obs._ofSameType(S, P))(obs);
		};
	
	/***/ },
	/* 52 */
	/***/ function(module, exports, __webpack_require__) {
	
		'use strict';
	
		var _require = __webpack_require__(25);
	
		var createStream = _require.createStream;
		var createProperty = _require.createProperty;
	
		var mixin = {
		  _handleEnd: function _handleEnd() {}
		};
	
		var S = createStream('ignoreEnd', mixin);
		var P = createProperty('ignoreEnd', mixin);
	
		module.exports = function ignoreEnd(obs) {
		  return new (obs._ofSameType(S, P))(obs);
		};
	
	/***/ },
	/* 53 */
	/***/ function(module, exports, __webpack_require__) {
	
		'use strict';
	
		var _require = __webpack_require__(25);
	
		var createStream = _require.createStream;
		var createProperty = _require.createProperty;
	
		var mixin = {
	
		  _init: function _init(_ref) {
		    var fn = _ref.fn;
	
		    this._fn = fn;
		  },
	
		  _free: function _free() {
		    this._fn = null;
		  },
	
		  _handleEnd: function _handleEnd() {
		    var fn = this._fn;
		    this._emitValue(fn());
		    this._emitEnd();
		  }
	
		};
	
		var S = createStream('beforeEnd', mixin);
		var P = createProperty('beforeEnd', mixin);
	
		module.exports = function beforeEnd(obs, fn) {
		  return new (obs._ofSameType(S, P))(obs, { fn: fn });
		};
	
	/***/ },
	/* 54 */
	/***/ function(module, exports, __webpack_require__) {
	
		'use strict';
	
		var _require = __webpack_require__(25);
	
		var createStream = _require.createStream;
		var createProperty = _require.createProperty;
	
		var _require2 = __webpack_require__(5);
	
		var slide = _require2.slide;
	
		var mixin = {
	
		  _init: function _init(_ref) {
		    var min = _ref.min;
		    var max = _ref.max;
	
		    this._max = max;
		    this._min = min;
		    this._buff = [];
		  },
	
		  _free: function _free() {
		    this._buff = null;
		  },
	
		  _handleValue: function _handleValue(x) {
		    this._buff = slide(this._buff, x, this._max);
		    if (this._buff.length >= this._min) {
		      this._emitValue(this._buff);
		    }
		  }
	
		};
	
		var S = createStream('slidingWindow', mixin);
		var P = createProperty('slidingWindow', mixin);
	
		module.exports = function slidingWindow(obs, max) {
		  var min = arguments.length <= 2 || arguments[2] === undefined ? 0 : arguments[2];
	
		  return new (obs._ofSameType(S, P))(obs, { min: min, max: max });
		};
	
	/***/ },
	/* 55 */
	/***/ function(module, exports, __webpack_require__) {
	
		'use strict';
	
		var _require = __webpack_require__(25);
	
		var createStream = _require.createStream;
		var createProperty = _require.createProperty;
	
		var mixin = {
	
		  _init: function _init(_ref) {
		    var fn = _ref.fn;
		    var flushOnEnd = _ref.flushOnEnd;
	
		    this._fn = fn;
		    this._flushOnEnd = flushOnEnd;
		    this._buff = [];
		  },
	
		  _free: function _free() {
		    this._buff = null;
		  },
	
		  _flush: function _flush() {
		    if (this._buff !== null && this._buff.length !== 0) {
		      this._emitValue(this._buff);
		      this._buff = [];
		    }
		  },
	
		  _handleValue: function _handleValue(x) {
		    this._buff.push(x);
		    var fn = this._fn;
		    if (!fn(x)) {
		      this._flush();
		    }
		  },
	
		  _handleEnd: function _handleEnd() {
		    if (this._flushOnEnd) {
		      this._flush();
		    }
		    this._emitEnd();
		  }
	
		};
	
		var S = createStream('bufferWhile', mixin);
		var P = createProperty('bufferWhile', mixin);
	
		var id = function id(x) {
		  return x;
		};
	
		module.exports = function bufferWhile(obs, fn) {
		  var _ref2 = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];
	
		  var _ref2$flushOnEnd = _ref2.flushOnEnd;
		  var flushOnEnd = _ref2$flushOnEnd === undefined ? true : _ref2$flushOnEnd;
	
		  return new (obs._ofSameType(S, P))(obs, { fn: fn || id, flushOnEnd: flushOnEnd });
		};
	
	/***/ },
	/* 56 */
	/***/ function(module, exports, __webpack_require__) {
	
		'use strict';
	
		var _require = __webpack_require__(25);
	
		var createStream = _require.createStream;
		var createProperty = _require.createProperty;
	
		var mixin = {
	
		  _init: function _init(_ref) {
		    var count = _ref.count;
		    var flushOnEnd = _ref.flushOnEnd;
	
		    this._count = count;
		    this._flushOnEnd = flushOnEnd;
		    this._buff = [];
		  },
	
		  _free: function _free() {
		    this._buff = null;
		  },
	
		  _flush: function _flush() {
		    if (this._buff !== null && this._buff.length !== 0) {
		      this._emitValue(this._buff);
		      this._buff = [];
		    }
		  },
	
		  _handleValue: function _handleValue(x) {
		    this._buff.push(x);
		    if (this._buff.length >= this._count) {
		      this._flush();
		    }
		  },
	
		  _handleEnd: function _handleEnd() {
		    if (this._flushOnEnd) {
		      this._flush();
		    }
		    this._emitEnd();
		  }
	
		};
	
		var S = createStream('bufferWithCount', mixin);
		var P = createProperty('bufferWithCount', mixin);
	
		module.exports = function bufferWhile(obs, count) {
		  var _ref2 = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];
	
		  var _ref2$flushOnEnd = _ref2.flushOnEnd;
		  var flushOnEnd = _ref2$flushOnEnd === undefined ? true : _ref2$flushOnEnd;
	
		  return new (obs._ofSameType(S, P))(obs, { count: count, flushOnEnd: flushOnEnd });
		};
	
	/***/ },
	/* 57 */
	/***/ function(module, exports, __webpack_require__) {
	
		'use strict';
	
		var _require = __webpack_require__(25);
	
		var createStream = _require.createStream;
		var createProperty = _require.createProperty;
	
		var mixin = {
	
		  _init: function _init(_ref) {
		    var _this = this;
	
		    var wait = _ref.wait;
		    var count = _ref.count;
		    var flushOnEnd = _ref.flushOnEnd;
	
		    this._wait = wait;
		    this._count = count;
		    this._flushOnEnd = flushOnEnd;
		    this._intervalId = null;
		    this._$onTick = function () {
		      return _this._flush();
		    };
		    this._buff = [];
		  },
	
		  _free: function _free() {
		    this._$onTick = null;
		    this._buff = null;
		  },
	
		  _flush: function _flush() {
		    if (this._buff !== null) {
		      this._emitValue(this._buff);
		      this._buff = [];
		    }
		  },
	
		  _handleValue: function _handleValue(x) {
		    this._buff.push(x);
		    if (this._buff.length >= this._count) {
		      clearInterval(this._intervalId);
		      this._flush();
		      this._intervalId = setInterval(this._$onTick, this._wait);
		    }
		  },
	
		  _handleEnd: function _handleEnd() {
		    if (this._flushOnEnd && this._buff.length !== 0) {
		      this._flush();
		    }
		    this._emitEnd();
		  },
	
		  _onActivation: function _onActivation() {
		    this._source.onAny(this._$handleAny); // copied from patterns/one-source
		    this._intervalId = setInterval(this._$onTick, this._wait);
		  },
	
		  _onDeactivation: function _onDeactivation() {
		    if (this._intervalId !== null) {
		      clearInterval(this._intervalId);
		      this._intervalId = null;
		    }
		    this._source.offAny(this._$handleAny); // copied from patterns/one-source
		  }
	
		};
	
		var S = createStream('bufferWithTimeOrCount', mixin);
		var P = createProperty('bufferWithTimeOrCount', mixin);
	
		module.exports = function bufferWithTimeOrCount(obs, wait, count) {
		  var _ref2 = arguments.length <= 3 || arguments[3] === undefined ? {} : arguments[3];
	
		  var _ref2$flushOnEnd = _ref2.flushOnEnd;
		  var flushOnEnd = _ref2$flushOnEnd === undefined ? true : _ref2$flushOnEnd;
	
		  return new (obs._ofSameType(S, P))(obs, { wait: wait, count: count, flushOnEnd: flushOnEnd });
		};
	
	/***/ },
	/* 58 */
	/***/ function(module, exports, __webpack_require__) {
	
		'use strict';
	
		var _require = __webpack_require__(25);
	
		var createStream = _require.createStream;
		var createProperty = _require.createProperty;
	
		function xformForObs(obs) {
		  return {
	
		    '@@transducer/step': function transducerStep(res, input) {
		      obs._emitValue(input);
		      return null;
		    },
	
		    '@@transducer/result': function transducerResult() {
		      obs._emitEnd();
		      return null;
		    }
	
		  };
		}
	
		var mixin = {
	
		  _init: function _init(_ref) {
		    var transducer = _ref.transducer;
	
		    this._xform = transducer(xformForObs(this));
		  },
	
		  _free: function _free() {
		    this._xform = null;
		  },
	
		  _handleValue: function _handleValue(x) {
		    if (this._xform['@@transducer/step'](null, x) !== null) {
		      this._xform['@@transducer/result'](null);
		    }
		  },
	
		  _handleEnd: function _handleEnd() {
		    this._xform['@@transducer/result'](null);
		  }
	
		};
	
		var S = createStream('transduce', mixin);
		var P = createProperty('transduce', mixin);
	
		module.exports = function transduce(obs, transducer) {
		  return new (obs._ofSameType(S, P))(obs, { transducer: transducer });
		};
	
	/***/ },
	/* 59 */
	/***/ function(module, exports, __webpack_require__) {
	
		'use strict';
	
		var _require = __webpack_require__(25);
	
		var createStream = _require.createStream;
		var createProperty = _require.createProperty;
	
		var emitter = __webpack_require__(15);
	
		var mixin = {
	
		  _init: function _init(_ref) {
		    var fn = _ref.fn;
	
		    this._handler = fn;
		    this._emitter = emitter(this);
		  },
	
		  _free: function _free() {
		    this._handler = null;
		    this._emitter = null;
		  },
	
		  _handleAny: function _handleAny(event) {
		    this._handler(this._emitter, event);
		  }
	
		};
	
		var S = createStream('withHandler', mixin);
		var P = createProperty('withHandler', mixin);
	
		module.exports = function withHandler(obs, fn) {
		  return new (obs._ofSameType(S, P))(obs, { fn: fn });
		};
	
	/***/ },
	/* 60 */
	/***/ function(module, exports, __webpack_require__) {
	
		'use strict';
	
		var Stream = __webpack_require__(6);
	
		var _require = __webpack_require__(3);
	
		var VALUE = _require.VALUE;
		var ERROR = _require.ERROR;
		var NOTHING = _require.NOTHING;
	
		var _require2 = __webpack_require__(2);
	
		var inherit = _require2.inherit;
	
		var _require3 = __webpack_require__(5);
	
		var concat = _require3.concat;
		var fillArray = _require3.fillArray;
	
		var _require4 = __webpack_require__(21);
	
		var spread = _require4.spread;
	
		var never = __webpack_require__(8);
	
		function defaultErrorsCombinator(errors) {
		  var latestError = undefined;
		  for (var i = 0; i < errors.length; i++) {
		    if (errors[i] !== undefined) {
		      if (latestError === undefined || latestError.index < errors[i].index) {
		        latestError = errors[i];
		      }
		    }
		  }
		  return latestError.error;
		}
	
		function Combine(active, passive, combinator) {
		  var _this = this;
	
		  Stream.call(this);
		  this._activeCount = active.length;
		  this._sources = concat(active, passive);
		  this._combinator = combinator ? spread(combinator, this._sources.length) : function (x) {
		    return x;
		  };
		  this._aliveCount = 0;
		  this._latestValues = new Array(this._sources.length);
		  this._latestErrors = new Array(this._sources.length);
		  fillArray(this._latestValues, NOTHING);
		  this._emitAfterActivation = false;
		  this._endAfterActivation = false;
		  this._latestErrorIndex = 0;
	
		  this._$handlers = [];
	
		  var _loop = function (i) {
		    _this._$handlers.push(function (event) {
		      return _this._handleAny(i, event);
		    });
		  };
	
		  for (var i = 0; i < this._sources.length; i++) {
		    _loop(i);
		  }
		}
	
		inherit(Combine, Stream, {
	
		  _name: 'combine',
	
		  _onActivation: function _onActivation() {
		    this._aliveCount = this._activeCount;
	
		    // we need to suscribe to _passive_ sources before _active_
		    // (see https://github.com/rpominov/kefir/issues/98)
		    for (var i = this._activeCount; i < this._sources.length; i++) {
		      this._sources[i].onAny(this._$handlers[i]);
		    }
		    for (var i = 0; i < this._activeCount; i++) {
		      this._sources[i].onAny(this._$handlers[i]);
		    }
	
		    if (this._emitAfterActivation) {
		      this._emitAfterActivation = false;
		      this._emitIfFull();
		    }
		    if (this._endAfterActivation) {
		      this._emitEnd();
		    }
		  },
	
		  _onDeactivation: function _onDeactivation() {
		    var length = this._sources.length,
		        i = undefined;
		    for (i = 0; i < length; i++) {
		      this._sources[i].offAny(this._$handlers[i]);
		    }
		  },
	
		  _emitIfFull: function _emitIfFull() {
		    var hasAllValues = true;
		    var hasErrors = false;
		    var length = this._latestValues.length;
		    var valuesCopy = new Array(length);
		    var errorsCopy = new Array(length);
	
		    for (var i = 0; i < length; i++) {
		      valuesCopy[i] = this._latestValues[i];
		      errorsCopy[i] = this._latestErrors[i];
	
		      if (valuesCopy[i] === NOTHING) {
		        hasAllValues = false;
		      }
	
		      if (errorsCopy[i] !== undefined) {
		        hasErrors = true;
		      }
		    }
	
		    if (hasAllValues) {
		      var combinator = this._combinator;
		      this._emitValue(combinator(valuesCopy));
		    }
		    if (hasErrors) {
		      this._emitError(defaultErrorsCombinator(errorsCopy));
		    }
		  },
	
		  _handleAny: function _handleAny(i, event) {
	
		    if (event.type === VALUE || event.type === ERROR) {
	
		      if (event.type === VALUE) {
		        this._latestValues[i] = event.value;
		        this._latestErrors[i] = undefined;
		      }
		      if (event.type === ERROR) {
		        this._latestValues[i] = NOTHING;
		        this._latestErrors[i] = {
		          index: this._latestErrorIndex++,
		          error: event.value
		        };
		      }
	
		      if (i < this._activeCount) {
		        if (this._activating) {
		          this._emitAfterActivation = true;
		        } else {
		          this._emitIfFull();
		        }
		      }
		    } else {
		      // END
	
		      if (i < this._activeCount) {
		        this._aliveCount--;
		        if (this._aliveCount === 0) {
		          if (this._activating) {
		            this._endAfterActivation = true;
		          } else {
		            this._emitEnd();
		          }
		        }
		      }
		    }
		  },
	
		  _clear: function _clear() {
		    Stream.prototype._clear.call(this);
		    this._sources = null;
		    this._latestValues = null;
		    this._latestErrors = null;
		    this._combinator = null;
		    this._$handlers = null;
		  }
	
		});
	
		module.exports = function combine(active, passive, combinator) {
		  if (passive === undefined) passive = [];
	
		  if (typeof passive === 'function') {
		    combinator = passive;
		    passive = [];
		  }
		  return active.length === 0 ? never() : new Combine(active, passive, combinator);
		};
	
	/***/ },
	/* 61 */
	/***/ function(module, exports, __webpack_require__) {
	
		'use strict';
	
		var Stream = __webpack_require__(6);
	
		var _require = __webpack_require__(3);
	
		var VALUE = _require.VALUE;
		var ERROR = _require.ERROR;
		var END = _require.END;
	
		var _require2 = __webpack_require__(2);
	
		var inherit = _require2.inherit;
	
		var _require3 = __webpack_require__(5);
	
		var map = _require3.map;
		var cloneArray = _require3.cloneArray;
	
		var _require4 = __webpack_require__(21);
	
		var spread = _require4.spread;
	
		var never = __webpack_require__(8);
	
		var isArray = Array.isArray || function (xs) {
		  return Object.prototype.toString.call(xs) === '[object Array]';
		};
	
		function Zip(sources, combinator) {
		  var _this = this;
	
		  Stream.call(this);
	
		  this._buffers = map(sources, function (source) {
		    return isArray(source) ? cloneArray(source) : [];
		  });
		  this._sources = map(sources, function (source) {
		    return isArray(source) ? never() : source;
		  });
	
		  this._combinator = combinator ? spread(combinator, this._sources.length) : function (x) {
		    return x;
		  };
		  this._aliveCount = 0;
	
		  this._$handlers = [];
	
		  var _loop = function (i) {
		    _this._$handlers.push(function (event) {
		      return _this._handleAny(i, event);
		    });
		  };
	
		  for (var i = 0; i < this._sources.length; i++) {
		    _loop(i);
		  }
		}
	
		inherit(Zip, Stream, {
	
		  _name: 'zip',
	
		  _onActivation: function _onActivation() {
	
		    // if all sources are arrays
		    while (this._isFull()) {
		      this._emit();
		    }
	
		    var length = this._sources.length;
		    this._aliveCount = length;
		    for (var i = 0; i < length && this._active; i++) {
		      this._sources[i].onAny(this._$handlers[i]);
		    }
		  },
	
		  _onDeactivation: function _onDeactivation() {
		    for (var i = 0; i < this._sources.length; i++) {
		      this._sources[i].offAny(this._$handlers[i]);
		    }
		  },
	
		  _emit: function _emit() {
		    var values = new Array(this._buffers.length);
		    for (var i = 0; i < this._buffers.length; i++) {
		      values[i] = this._buffers[i].shift();
		    }
		    var combinator = this._combinator;
		    this._emitValue(combinator(values));
		  },
	
		  _isFull: function _isFull() {
		    for (var i = 0; i < this._buffers.length; i++) {
		      if (this._buffers[i].length === 0) {
		        return false;
		      }
		    }
		    return true;
		  },
	
		  _handleAny: function _handleAny(i, event) {
		    if (event.type === VALUE) {
		      this._buffers[i].push(event.value);
		      if (this._isFull()) {
		        this._emit();
		      }
		    }
		    if (event.type === ERROR) {
		      this._emitError(event.value);
		    }
		    if (event.type === END) {
		      this._aliveCount--;
		      if (this._aliveCount === 0) {
		        this._emitEnd();
		      }
		    }
		  },
	
		  _clear: function _clear() {
		    Stream.prototype._clear.call(this);
		    this._sources = null;
		    this._buffers = null;
		    this._combinator = null;
		    this._$handlers = null;
		  }
	
		});
	
		module.exports = function zip(observables, combinator /* Function | falsey */) {
		  return observables.length === 0 ? never() : new Zip(observables, combinator);
		};
	
	/***/ },
	/* 62 */
	/***/ function(module, exports, __webpack_require__) {
	
		'use strict';
	
		var _require = __webpack_require__(2);
	
		var inherit = _require.inherit;
	
		var AbstractPool = __webpack_require__(63);
		var never = __webpack_require__(8);
	
		function Merge(sources) {
		  AbstractPool.call(this);
		  this._addAll(sources);
		  this._initialised = true;
		}
	
		inherit(Merge, AbstractPool, {
	
		  _name: 'merge',
	
		  _onEmpty: function _onEmpty() {
		    if (this._initialised) {
		      this._emitEnd();
		    }
		  }
	
		});
	
		module.exports = function merge(observables) {
		  return observables.length === 0 ? never() : new Merge(observables);
		};
	
	/***/ },
	/* 63 */
	/***/ function(module, exports, __webpack_require__) {
	
		'use strict';
	
		var Stream = __webpack_require__(6);
	
		var _require = __webpack_require__(3);
	
		var VALUE = _require.VALUE;
		var ERROR = _require.ERROR;
	
		var _require2 = __webpack_require__(2);
	
		var inherit = _require2.inherit;
	
		var _require3 = __webpack_require__(5);
	
		var concat = _require3.concat;
		var forEach = _require3.forEach;
		var findByPred = _require3.findByPred;
		var find = _require3.find;
		var remove = _require3.remove;
		var cloneArray = _require3.cloneArray;
	
		var id = function id(x) {
		  return x;
		};
	
		function AbstractPool() {
		  var _this = this;
	
		  var _ref = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];
	
		  var _ref$queueLim = _ref.queueLim;
		  var queueLim = _ref$queueLim === undefined ? 0 : _ref$queueLim;
		  var _ref$concurLim = _ref.concurLim;
		  var concurLim = _ref$concurLim === undefined ? -1 : _ref$concurLim;
		  var _ref$drop = _ref.drop;
		  var drop = _ref$drop === undefined ? 'new' : _ref$drop;
	
		  Stream.call(this);
	
		  this._queueLim = queueLim < 0 ? -1 : queueLim;
		  this._concurLim = concurLim < 0 ? -1 : concurLim;
		  this._drop = drop;
		  this._queue = [];
		  this._curSources = [];
		  this._$handleSubAny = function (event) {
		    return _this._handleSubAny(event);
		  };
		  this._$endHandlers = [];
		  this._currentlyAdding = null;
	
		  if (this._concurLim === 0) {
		    this._emitEnd();
		  }
		}
	
		inherit(AbstractPool, Stream, {
	
		  _name: 'abstractPool',
	
		  _add: function _add(obj, toObs /* Function | falsey */) {
		    toObs = toObs || id;
		    if (this._concurLim === -1 || this._curSources.length < this._concurLim) {
		      this._addToCur(toObs(obj));
		    } else {
		      if (this._queueLim === -1 || this._queue.length < this._queueLim) {
		        this._addToQueue(toObs(obj));
		      } else if (this._drop === 'old') {
		        this._removeOldest();
		        this._add(obj, toObs);
		      }
		    }
		  },
	
		  _addAll: function _addAll(obss) {
		    var _this2 = this;
	
		    forEach(obss, function (obs) {
		      return _this2._add(obs);
		    });
		  },
	
		  _remove: function _remove(obs) {
		    if (this._removeCur(obs) === -1) {
		      this._removeQueue(obs);
		    }
		  },
	
		  _addToQueue: function _addToQueue(obs) {
		    this._queue = concat(this._queue, [obs]);
		  },
	
		  _addToCur: function _addToCur(obs) {
		    if (this._active) {
	
		      // HACK:
		      //
		      // We have two optimizations for cases when `obs` is ended. We don't want
		      // to add such observable to the list, but only want to emit events
		      // from it (if it has some).
		      //
		      // Instead of this hacks, we could just did following,
		      // but it would be 5-8 times slower:
		      //
		      //     this._curSources = concat(this._curSources, [obs]);
		      //     this._subscribe(obs);
		      //
	
		      // #1
		      // This one for cases when `obs` already ended
		      // e.g., Kefir.constant() or Kefir.never()
		      if (!obs._alive) {
		        if (obs._currentEvent) {
		          this._emit(obs._currentEvent.type, obs._currentEvent.value);
		        }
		        return;
		      }
	
		      // #2
		      // This one is for cases when `obs` going to end synchronously on
		      // first subscriber e.g., Kefir.stream(em => {em.emit(1); em.end()})
		      this._currentlyAdding = obs;
		      obs.onAny(this._$handleSubAny);
		      this._currentlyAdding = null;
		      if (obs._alive) {
		        this._curSources = concat(this._curSources, [obs]);
		        if (this._active) {
		          this._subToEnd(obs);
		        }
		      }
		    } else {
		      this._curSources = concat(this._curSources, [obs]);
		    }
		  },
	
		  _subToEnd: function _subToEnd(obs) {
		    var _this3 = this;
	
		    var onEnd = function onEnd() {
		      return _this3._removeCur(obs);
		    };
		    this._$endHandlers.push({ obs: obs, handler: onEnd });
		    obs.onEnd(onEnd);
		  },
	
		  _subscribe: function _subscribe(obs) {
		    obs.onAny(this._$handleSubAny);
	
		    // it can become inactive in responce of subscribing to `obs.onAny` above
		    if (this._active) {
		      this._subToEnd(obs);
		    }
		  },
	
		  _unsubscribe: function _unsubscribe(obs) {
		    obs.offAny(this._$handleSubAny);
	
		    var onEndI = findByPred(this._$endHandlers, function (obj) {
		      return obj.obs === obs;
		    });
		    if (onEndI !== -1) {
		      obs.offEnd(this._$endHandlers[onEndI].handler);
		      this._$endHandlers.splice(onEndI, 1);
		    }
		  },
	
		  _handleSubAny: function _handleSubAny(event) {
		    if (event.type === VALUE) {
		      this._emitValue(event.value);
		    } else if (event.type === ERROR) {
		      this._emitError(event.value);
		    }
		  },
	
		  _removeQueue: function _removeQueue(obs) {
		    var index = find(this._queue, obs);
		    this._queue = remove(this._queue, index);
		    return index;
		  },
	
		  _removeCur: function _removeCur(obs) {
		    if (this._active) {
		      this._unsubscribe(obs);
		    }
		    var index = find(this._curSources, obs);
		    this._curSources = remove(this._curSources, index);
		    if (index !== -1) {
		      if (this._queue.length !== 0) {
		        this._pullQueue();
		      } else if (this._curSources.length === 0) {
		        this._onEmpty();
		      }
		    }
		    return index;
		  },
	
		  _removeOldest: function _removeOldest() {
		    this._removeCur(this._curSources[0]);
		  },
	
		  _pullQueue: function _pullQueue() {
		    if (this._queue.length !== 0) {
		      this._queue = cloneArray(this._queue);
		      this._addToCur(this._queue.shift());
		    }
		  },
	
		  _onActivation: function _onActivation() {
		    for (var i = 0, sources = this._curSources; i < sources.length && this._active; i++) {
		      this._subscribe(sources[i]);
		    }
		  },
	
		  _onDeactivation: function _onDeactivation() {
		    for (var i = 0, sources = this._curSources; i < sources.length; i++) {
		      this._unsubscribe(sources[i]);
		    }
		    if (this._currentlyAdding !== null) {
		      this._unsubscribe(this._currentlyAdding);
		    }
		  },
	
		  _isEmpty: function _isEmpty() {
		    return this._curSources.length === 0;
		  },
	
		  _onEmpty: function _onEmpty() {},
	
		  _clear: function _clear() {
		    Stream.prototype._clear.call(this);
		    this._queue = null;
		    this._curSources = null;
		    this._$handleSubAny = null;
		    this._$endHandlers = null;
		  }
	
		});
	
		module.exports = AbstractPool;
	
	/***/ },
	/* 64 */
	/***/ function(module, exports, __webpack_require__) {
	
		'use strict';
	
		var repeat = __webpack_require__(65);
	
		module.exports = function concat(observables) {
		  return repeat(function (index) {
		    return observables.length > index ? observables[index] : false;
		  }).setName('concat');
		};
	
	/***/ },
	/* 65 */
	/***/ function(module, exports, __webpack_require__) {
	
		'use strict';
	
		var _require = __webpack_require__(2);
	
		var inherit = _require.inherit;
	
		var Stream = __webpack_require__(6);
	
		var _require2 = __webpack_require__(3);
	
		var END = _require2.END;
	
		function S(generator) {
		  var _this = this;
	
		  Stream.call(this);
		  this._generator = generator;
		  this._source = null;
		  this._inLoop = false;
		  this._iteration = 0;
		  this._$handleAny = function (event) {
		    return _this._handleAny(event);
		  };
		}
	
		inherit(S, Stream, {
	
		  _name: 'repeat',
	
		  _handleAny: function _handleAny(event) {
		    if (event.type === END) {
		      this._source = null;
		      this._getSource();
		    } else {
		      this._emit(event.type, event.value);
		    }
		  },
	
		  _getSource: function _getSource() {
		    if (!this._inLoop) {
		      this._inLoop = true;
		      var generator = this._generator;
		      while (this._source === null && this._alive && this._active) {
		        this._source = generator(this._iteration++);
		        if (this._source) {
		          this._source.onAny(this._$handleAny);
		        } else {
		          this._emitEnd();
		        }
		      }
		      this._inLoop = false;
		    }
		  },
	
		  _onActivation: function _onActivation() {
		    if (this._source) {
		      this._source.onAny(this._$handleAny);
		    } else {
		      this._getSource();
		    }
		  },
	
		  _onDeactivation: function _onDeactivation() {
		    if (this._source) {
		      this._source.offAny(this._$handleAny);
		    }
		  },
	
		  _clear: function _clear() {
		    Stream.prototype._clear.call(this);
		    this._generator = null;
		    this._source = null;
		    this._$handleAny = null;
		  }
	
		});
	
		module.exports = function (generator) {
		  return new S(generator);
		};
	
	/***/ },
	/* 66 */
	/***/ function(module, exports, __webpack_require__) {
	
		'use strict';
	
		var _require = __webpack_require__(2);
	
		var inherit = _require.inherit;
	
		var AbstractPool = __webpack_require__(63);
	
		function Pool() {
		  AbstractPool.call(this);
		}
	
		inherit(Pool, AbstractPool, {
	
		  _name: 'pool',
	
		  plug: function plug(obs) {
		    this._add(obs);
		    return this;
		  },
	
		  unplug: function unplug(obs) {
		    this._remove(obs);
		    return this;
		  }
	
		});
	
		module.exports = Pool;
	
	/***/ },
	/* 67 */
	/***/ function(module, exports, __webpack_require__) {
	
		'use strict';
	
		var _require = __webpack_require__(3);
	
		var VALUE = _require.VALUE;
		var ERROR = _require.ERROR;
		var END = _require.END;
	
		var _require2 = __webpack_require__(2);
	
		var inherit = _require2.inherit;
	
		var AbstractPool = __webpack_require__(63);
	
		function FlatMap(source, fn, options) {
		  var _this = this;
	
		  AbstractPool.call(this, options);
		  this._source = source;
		  this._fn = fn;
		  this._mainEnded = false;
		  this._lastCurrent = null;
		  this._$handleMain = function (event) {
		    return _this._handleMain(event);
		  };
		}
	
		inherit(FlatMap, AbstractPool, {
	
		  _onActivation: function _onActivation() {
		    AbstractPool.prototype._onActivation.call(this);
		    if (this._active) {
		      this._source.onAny(this._$handleMain);
		    }
		  },
	
		  _onDeactivation: function _onDeactivation() {
		    AbstractPool.prototype._onDeactivation.call(this);
		    this._source.offAny(this._$handleMain);
		    this._hadNoEvSinceDeact = true;
		  },
	
		  _handleMain: function _handleMain(event) {
	
		    if (event.type === VALUE) {
		      // Is latest value before deactivation survived, and now is 'current' on this activation?
		      // We don't want to handle such values, to prevent to constantly add
		      // same observale on each activation/deactivation when our main source
		      // is a `Kefir.conatant()` for example.
		      var sameCurr = this._activating && this._hadNoEvSinceDeact && this._lastCurrent === event.value;
		      if (!sameCurr) {
		        this._add(event.value, this._fn);
		      }
		      this._lastCurrent = event.value;
		      this._hadNoEvSinceDeact = false;
		    }
	
		    if (event.type === ERROR) {
		      this._emitError(event.value);
		    }
	
		    if (event.type === END) {
		      if (this._isEmpty()) {
		        this._emitEnd();
		      } else {
		        this._mainEnded = true;
		      }
		    }
		  },
	
		  _onEmpty: function _onEmpty() {
		    if (this._mainEnded) {
		      this._emitEnd();
		    }
		  },
	
		  _clear: function _clear() {
		    AbstractPool.prototype._clear.call(this);
		    this._source = null;
		    this._lastCurrent = null;
		    this._$handleMain = null;
		  }
	
		});
	
		module.exports = FlatMap;
	
	/***/ },
	/* 68 */
	/***/ function(module, exports, __webpack_require__) {
	
		'use strict';
	
		var _require = __webpack_require__(3);
	
		var VALUE = _require.VALUE;
		var ERROR = _require.ERROR;
		var END = _require.END;
	
		var _require2 = __webpack_require__(2);
	
		var inherit = _require2.inherit;
	
		var FlatMap = __webpack_require__(67);
	
		function FlatMapErrors(source, fn) {
		  FlatMap.call(this, source, fn);
		}
	
		inherit(FlatMapErrors, FlatMap, {
	
		  // Same as in FlatMap, only VALUE/ERROR flipped
		  _handleMain: function _handleMain(event) {
	
		    if (event.type === ERROR) {
		      var sameCurr = this._activating && this._hadNoEvSinceDeact && this._lastCurrent === event.value;
		      if (!sameCurr) {
		        this._add(event.value, this._fn);
		      }
		      this._lastCurrent = event.value;
		      this._hadNoEvSinceDeact = false;
		    }
	
		    if (event.type === VALUE) {
		      this._emitValue(event.value);
		    }
	
		    if (event.type === END) {
		      if (this._isEmpty()) {
		        this._emitEnd();
		      } else {
		        this._mainEnded = true;
		      }
		    }
		  }
	
		});
	
		module.exports = FlatMapErrors;
	
	/***/ },
	/* 69 */
	/***/ function(module, exports, __webpack_require__) {
	
		'use strict';
	
		var _require = __webpack_require__(70);
	
		var createStream = _require.createStream;
		var createProperty = _require.createProperty;
	
		var _require2 = __webpack_require__(3);
	
		var NOTHING = _require2.NOTHING;
	
		var mixin = {
	
		  _handlePrimaryValue: function _handlePrimaryValue(x) {
		    if (this._lastSecondary !== NOTHING && this._lastSecondary) {
		      this._emitValue(x);
		    }
		  },
	
		  _handleSecondaryEnd: function _handleSecondaryEnd() {
		    if (this._lastSecondary === NOTHING || !this._lastSecondary) {
		      this._emitEnd();
		    }
		  }
	
		};
	
		var S = createStream('filterBy', mixin);
		var P = createProperty('filterBy', mixin);
	
		module.exports = function filterBy(primary, secondary) {
		  return new (primary._ofSameType(S, P))(primary, secondary);
		};
	
	/***/ },
	/* 70 */
	/***/ function(module, exports, __webpack_require__) {
	
		'use strict';
	
		var Stream = __webpack_require__(6);
		var Property = __webpack_require__(7);
	
		var _require = __webpack_require__(2);
	
		var inherit = _require.inherit;
	
		var _require2 = __webpack_require__(3);
	
		var VALUE = _require2.VALUE;
		var ERROR = _require2.ERROR;
		var END = _require2.END;
		var NOTHING = _require2.NOTHING;
	
		function createConstructor(BaseClass, name) {
		  return function AnonymousObservable(primary, secondary, options) {
		    var _this = this;
	
		    BaseClass.call(this);
		    this._primary = primary;
		    this._secondary = secondary;
		    this._name = primary._name + '.' + name;
		    this._lastSecondary = NOTHING;
		    this._$handleSecondaryAny = function (event) {
		      return _this._handleSecondaryAny(event);
		    };
		    this._$handlePrimaryAny = function (event) {
		      return _this._handlePrimaryAny(event);
		    };
		    this._init(options);
		  };
		}
	
		function createClassMethods(BaseClass) {
		  return {
		    _init: function _init() {},
		    _free: function _free() {},
	
		    _handlePrimaryValue: function _handlePrimaryValue(x) {
		      this._emitValue(x);
		    },
		    _handlePrimaryError: function _handlePrimaryError(x) {
		      this._emitError(x);
		    },
		    _handlePrimaryEnd: function _handlePrimaryEnd() {
		      this._emitEnd();
		    },
	
		    _handleSecondaryValue: function _handleSecondaryValue(x) {
		      this._lastSecondary = x;
		    },
		    _handleSecondaryError: function _handleSecondaryError(x) {
		      this._emitError(x);
		    },
		    _handleSecondaryEnd: function _handleSecondaryEnd() {},
	
		    _handlePrimaryAny: function _handlePrimaryAny(event) {
		      switch (event.type) {
		        case VALUE:
		          return this._handlePrimaryValue(event.value);
		        case ERROR:
		          return this._handlePrimaryError(event.value);
		        case END:
		          return this._handlePrimaryEnd(event.value);
		      }
		    },
		    _handleSecondaryAny: function _handleSecondaryAny(event) {
		      switch (event.type) {
		        case VALUE:
		          return this._handleSecondaryValue(event.value);
		        case ERROR:
		          return this._handleSecondaryError(event.value);
		        case END:
		          this._handleSecondaryEnd(event.value);
		          this._removeSecondary();
		      }
		    },
	
		    _removeSecondary: function _removeSecondary() {
		      if (this._secondary !== null) {
		        this._secondary.offAny(this._$handleSecondaryAny);
		        this._$handleSecondaryAny = null;
		        this._secondary = null;
		      }
		    },
	
		    _onActivation: function _onActivation() {
		      if (this._secondary !== null) {
		        this._secondary.onAny(this._$handleSecondaryAny);
		      }
		      if (this._active) {
		        this._primary.onAny(this._$handlePrimaryAny);
		      }
		    },
		    _onDeactivation: function _onDeactivation() {
		      if (this._secondary !== null) {
		        this._secondary.offAny(this._$handleSecondaryAny);
		      }
		      this._primary.offAny(this._$handlePrimaryAny);
		    },
	
		    _clear: function _clear() {
		      BaseClass.prototype._clear.call(this);
		      this._primary = null;
		      this._secondary = null;
		      this._lastSecondary = null;
		      this._$handleSecondaryAny = null;
		      this._$handlePrimaryAny = null;
		      this._free();
		    }
	
		  };
		}
	
		function createStream(name, mixin) {
		  var S = createConstructor(Stream, name);
		  inherit(S, Stream, createClassMethods(Stream), mixin);
		  return S;
		}
	
		function createProperty(name, mixin) {
		  var P = createConstructor(Property, name);
		  inherit(P, Property, createClassMethods(Property), mixin);
		  return P;
		}
	
		module.exports = { createStream: createStream, createProperty: createProperty };
	
	/***/ },
	/* 71 */
	/***/ function(module, exports, __webpack_require__) {
	
		'use strict';
	
		var combine = __webpack_require__(60);
	
		var id2 = function id2(_, x) {
		  return x;
		};
	
		module.exports = function sampledBy(passive, active, combinator) {
		  var _combinator = combinator ? function (a, b) {
		    return combinator(b, a);
		  } : id2;
		  return combine([active], [passive], _combinator).setName(passive, 'sampledBy');
		};
	
	/***/ },
	/* 72 */
	/***/ function(module, exports, __webpack_require__) {
	
		'use strict';
	
		var _require = __webpack_require__(70);
	
		var createStream = _require.createStream;
		var createProperty = _require.createProperty;
	
		var _require2 = __webpack_require__(3);
	
		var NOTHING = _require2.NOTHING;
	
		var mixin = {
	
		  _handlePrimaryValue: function _handlePrimaryValue(x) {
		    if (this._lastSecondary !== NOTHING) {
		      this._emitValue(x);
		    }
		  },
	
		  _handleSecondaryEnd: function _handleSecondaryEnd() {
		    if (this._lastSecondary === NOTHING) {
		      this._emitEnd();
		    }
		  }
	
		};
	
		var S = createStream('skipUntilBy', mixin);
		var P = createProperty('skipUntilBy', mixin);
	
		module.exports = function skipUntilBy(primary, secondary) {
		  return new (primary._ofSameType(S, P))(primary, secondary);
		};
	
	/***/ },
	/* 73 */
	/***/ function(module, exports, __webpack_require__) {
	
		'use strict';
	
		var _require = __webpack_require__(70);
	
		var createStream = _require.createStream;
		var createProperty = _require.createProperty;
	
		var mixin = {
	
		  _handleSecondaryValue: function _handleSecondaryValue() {
		    this._emitEnd();
		  }
	
		};
	
		var S = createStream('takeUntilBy', mixin);
		var P = createProperty('takeUntilBy', mixin);
	
		module.exports = function takeUntilBy(primary, secondary) {
		  return new (primary._ofSameType(S, P))(primary, secondary);
		};
	
	/***/ },
	/* 74 */
	/***/ function(module, exports, __webpack_require__) {
	
		'use strict';
	
		var _require = __webpack_require__(70);
	
		var createStream = _require.createStream;
		var createProperty = _require.createProperty;
	
		var mixin = {
	
		  _init: function _init() {
		    var _ref = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];
	
		    var _ref$flushOnEnd = _ref.flushOnEnd;
		    var flushOnEnd = _ref$flushOnEnd === undefined ? true : _ref$flushOnEnd;
	
		    this._buff = [];
		    this._flushOnEnd = flushOnEnd;
		  },
	
		  _free: function _free() {
		    this._buff = null;
		  },
	
		  _flush: function _flush() {
		    if (this._buff !== null) {
		      this._emitValue(this._buff);
		      this._buff = [];
		    }
		  },
	
		  _handlePrimaryEnd: function _handlePrimaryEnd() {
		    if (this._flushOnEnd) {
		      this._flush();
		    }
		    this._emitEnd();
		  },
	
		  _onActivation: function _onActivation() {
		    this._primary.onAny(this._$handlePrimaryAny);
		    if (this._alive && this._secondary !== null) {
		      this._secondary.onAny(this._$handleSecondaryAny);
		    }
		  },
	
		  _handlePrimaryValue: function _handlePrimaryValue(x) {
		    this._buff.push(x);
		  },
	
		  _handleSecondaryValue: function _handleSecondaryValue() {
		    this._flush();
		  },
	
		  _handleSecondaryEnd: function _handleSecondaryEnd() {
		    if (!this._flushOnEnd) {
		      this._emitEnd();
		    }
		  }
	
		};
	
		var S = createStream('bufferBy', mixin);
		var P = createProperty('bufferBy', mixin);
	
		module.exports = function bufferBy(primary, secondary, options /* optional */) {
		  return new (primary._ofSameType(S, P))(primary, secondary, options);
		};
	
	/***/ },
	/* 75 */
	/***/ function(module, exports, __webpack_require__) {
	
		'use strict';
	
		var _require = __webpack_require__(70);
	
		var createStream = _require.createStream;
		var createProperty = _require.createProperty;
	
		var _require2 = __webpack_require__(3);
	
		var NOTHING = _require2.NOTHING;
	
		var mixin = {
	
		  _init: function _init() {
		    var _ref = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];
	
		    var _ref$flushOnEnd = _ref.flushOnEnd;
		    var flushOnEnd = _ref$flushOnEnd === undefined ? true : _ref$flushOnEnd;
		    var _ref$flushOnChange = _ref.flushOnChange;
		    var flushOnChange = _ref$flushOnChange === undefined ? false : _ref$flushOnChange;
	
		    this._buff = [];
		    this._flushOnEnd = flushOnEnd;
		    this._flushOnChange = flushOnChange;
		  },
	
		  _free: function _free() {
		    this._buff = null;
		  },
	
		  _flush: function _flush() {
		    if (this._buff !== null) {
		      this._emitValue(this._buff);
		      this._buff = [];
		    }
		  },
	
		  _handlePrimaryEnd: function _handlePrimaryEnd() {
		    if (this._flushOnEnd) {
		      this._flush();
		    }
		    this._emitEnd();
		  },
	
		  _handlePrimaryValue: function _handlePrimaryValue(x) {
		    this._buff.push(x);
		    if (this._lastSecondary !== NOTHING && !this._lastSecondary) {
		      this._flush();
		    }
		  },
	
		  _handleSecondaryEnd: function _handleSecondaryEnd() {
		    if (!this._flushOnEnd && (this._lastSecondary === NOTHING || this._lastSecondary)) {
		      this._emitEnd();
		    }
		  },
	
		  _handleSecondaryValue: function _handleSecondaryValue(x) {
		    if (this._flushOnChange && !x) {
		      this._flush();
		    }
	
		    // from default _handleSecondaryValue
		    this._lastSecondary = x;
		  }
	
		};
	
		var S = createStream('bufferWhileBy', mixin);
		var P = createProperty('bufferWhileBy', mixin);
	
		module.exports = function bufferWhileBy(primary, secondary, options /* optional */) {
		  return new (primary._ofSameType(S, P))(primary, secondary, options);
		};
	
	/***/ },
	/* 76 */
	/***/ function(module, exports, __webpack_require__) {
	
		'use strict';
	
		var merge = __webpack_require__(62);
		var map = __webpack_require__(32);
		var skipDuplicates = __webpack_require__(40);
		var toProperty = __webpack_require__(24);
	
		var f = function f() {
		  return false;
		};
		var t = function t() {
		  return true;
		};
	
		module.exports = function awaiting(a, b) {
		  var result = merge([map(a, t), map(b, f)]);
		  result = skipDuplicates(result);
		  result = toProperty(result, f);
		  return result.setName(a, 'awaiting');
		};
	
	/***/ },
	/* 77 */
	/***/ function(module, exports, __webpack_require__) {
	
		'use strict';
	
		var _require = __webpack_require__(25);
	
		var createStream = _require.createStream;
		var createProperty = _require.createProperty;
	
		var mixin = {
	
		  _init: function _init(_ref) {
		    var fn = _ref.fn;
	
		    this._fn = fn;
		  },
	
		  _free: function _free() {
		    this._fn = null;
		  },
	
		  _handleValue: function _handleValue(x) {
		    var fn = this._fn;
		    var result = fn(x);
		    if (result.convert) {
		      this._emitError(result.error);
		    } else {
		      this._emitValue(x);
		    }
		  }
	
		};
	
		var S = createStream('valuesToErrors', mixin);
		var P = createProperty('valuesToErrors', mixin);
	
		var defFn = function defFn(x) {
		  return { convert: true, error: x };
		};
	
		module.exports = function valuesToErrors(obs) {
		  var fn = arguments.length <= 1 || arguments[1] === undefined ? defFn : arguments[1];
	
		  return new (obs._ofSameType(S, P))(obs, { fn: fn });
		};
	
	/***/ },
	/* 78 */
	/***/ function(module, exports, __webpack_require__) {
	
		'use strict';
	
		var _require = __webpack_require__(25);
	
		var createStream = _require.createStream;
		var createProperty = _require.createProperty;
	
		var mixin = {
	
		  _init: function _init(_ref) {
		    var fn = _ref.fn;
	
		    this._fn = fn;
		  },
	
		  _free: function _free() {
		    this._fn = null;
		  },
	
		  _handleError: function _handleError(x) {
		    var fn = this._fn;
		    var result = fn(x);
		    if (result.convert) {
		      this._emitValue(result.value);
		    } else {
		      this._emitError(x);
		    }
		  }
	
		};
	
		var S = createStream('errorsToValues', mixin);
		var P = createProperty('errorsToValues', mixin);
	
		var defFn = function defFn(x) {
		  return { convert: true, value: x };
		};
	
		module.exports = function errorsToValues(obs) {
		  var fn = arguments.length <= 1 || arguments[1] === undefined ? defFn : arguments[1];
	
		  return new (obs._ofSameType(S, P))(obs, { fn: fn });
		};
	
	/***/ },
	/* 79 */
	/***/ function(module, exports, __webpack_require__) {
	
		'use strict';
	
		var _require = __webpack_require__(25);
	
		var createStream = _require.createStream;
		var createProperty = _require.createProperty;
	
		var mixin = {
	
		  _handleError: function _handleError(x) {
		    this._emitError(x);
		    this._emitEnd();
		  }
	
		};
	
		var S = createStream('endOnError', mixin);
		var P = createProperty('endOnError', mixin);
	
		module.exports = function endOnError(obs) {
		  return new (obs._ofSameType(S, P))(obs);
		};
	
	/***/ }
	/******/ ])
	});
	;

/***/ },
/* 4 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	
	var looper = __webpack_require__(5);
	
	module.exports.next = next;
	
	module.exports.config = function (config) {
	  looper.config(config);
	};
	
	module.exports.play = function () {
	  looper.play();
	};
	
	function next(id) {
	  looper.next(id);
	}

/***/ },
/* 5 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	
	var Howl = __webpack_require__(6).Howl;
	
	var loops = {};
	var loop;
	
	module.exports.config = function (config) {
	  loops = config.map(function (c) {
	    var audioConfig = {
	      src: ['media/' + c.audio.src + '.mp3'],
	      html5: true,
	      volume: 0
	    };
	    return {
	      'id': c.id,
	      'vol': c.audio.max,
	      'sound1': new Howl(audioConfig),
	      'sound2': new Howl(audioConfig)
	    };
	  }).reduce(function (prev, next) {
	    prev[next.id] = next;return prev;
	  }, {});
	};
	
	module.exports.next = function (id) {
	  // console.log('next', id)
	  loop = loops[id];
	  // console.log(loop);
	};
	
	module.exports.pause = function (config) {};
	
	module.exports.play = function (config) {
	  looper();
	};
	
	module.exports.stop = function (config) {};
	
	function looper() {
	
	  'use strict';
	  // console.log('looper', loop.sound1)
	
	  var fadePercent = loop.sound1.duration() > 5 ? 0.01 : 0.015; // 2% or 1% depending on if sound is over 5 seconds
	  var faderate = 1 - fadePercent;
	  var duration = loop.sound1.duration() * 1000 * (1 - fadePercent);
	  var volume = loop.vol;
	  // console.log(faderate, fadePercent, duration, volume);
	
	  loop.sound1.play();
	  loop.sound1.fade(0, volume, duration * fadePercent);
	
	  setTimeout(function () {
	    loop.sound1.fade(volume, 0, duration * fadePercent);
	  }, duration * faderate);
	
	  setTimeout(function () {
	    loop.sound2.play();
	    loop.sound2.fade(0, volume, duration * fadePercent);
	  }, duration * faderate);
	
	  setTimeout(function () {
	    loop.sound2.fade(volume, 0, duration * fadePercent);
	    looper();
	  }, duration * 2 * faderate);
	}
	
	module.exports.loop = looper;

/***/ },
/* 6 */
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/* WEBPACK VAR INJECTION */(function(global) {/*! howler.js v2.0.0-beta7 | (c) 2013-2016, James Simpson of GoldFire Studios | MIT License | howlerjs.com */
	!function(){"use strict";function e(){try{"undefined"!=typeof AudioContext?n=new AudioContext:"undefined"!=typeof webkitAudioContext?n=new webkitAudioContext:o=!1}catch(e){o=!1}if(!o)if("undefined"!=typeof Audio)try{var d=new Audio;"undefined"==typeof d.oncanplaythrough&&(u="canplay")}catch(e){t=!0}else t=!0;try{var d=new Audio;d.muted&&(t=!0)}catch(e){}var a=/iP(hone|od|ad)/.test(navigator.platform),i=navigator.appVersion.match(/OS (\d+)_(\d+)_?(\d+)?/),_=i?parseInt(i[1],10):null;if(a&&_&&9>_){var s=/safari/.test(window.navigator.userAgent.toLowerCase());(window.navigator.standalone&&!s||!window.navigator.standalone&&!s)&&(o=!1)}o&&(r="undefined"==typeof n.createGain?n.createGainNode():n.createGain(),r.gain.value=1,r.connect(n.destination))}var n=null,o=!0,t=!1,r=null,u="canplaythrough";e();var d=function(){this.init()};d.prototype={init:function(){var e=this||a;return e._codecs={},e._howls=[],e._muted=!1,e._volume=1,e.state=n?n.state||"running":"running",e.autoSuspend=!0,e._autoSuspend(),e.mobileAutoEnable=!0,e.noAudio=t,e.usingWebAudio=o,e.ctx=n,t||e._setupCodecs(),e},volume:function(e){var n=this||a;if(e=parseFloat(e),"undefined"!=typeof e&&e>=0&&1>=e){n._volume=e,o&&(r.gain.value=e);for(var t=0;t<n._howls.length;t++)if(!n._howls[t]._webAudio)for(var u=n._howls[t]._getSoundIds(),d=0;d<u.length;d++){var i=n._howls[t]._soundById(u[d]);i&&i._node&&(i._node.volume=i._volume*e)}return n}return n._volume},mute:function(e){var n=this||a;n._muted=e,o&&(r.gain.value=e?0:n._volume);for(var t=0;t<n._howls.length;t++)if(!n._howls[t]._webAudio)for(var u=n._howls[t]._getSoundIds(),d=0;d<u.length;d++){var i=n._howls[t]._soundById(u[d]);i&&i._node&&(i._node.muted=e?!0:i._muted)}return n},unload:function(){for(var o=this||a,t=o._howls.length-1;t>=0;t--)o._howls[t].unload();return o.usingWebAudio&&"undefined"!=typeof n.close&&(o.ctx=null,n.close(),e(),o.ctx=n),o},codecs:function(e){return(this||a)._codecs[e]},_setupCodecs:function(){var e=this||a,n=new Audio,o=n.canPlayType("audio/mpeg;").replace(/^no$/,""),t=/OPR\//.test(navigator.userAgent);return e._codecs={mp3:!(t||!o&&!n.canPlayType("audio/mp3;").replace(/^no$/,"")),mpeg:!!o,opus:!!n.canPlayType('audio/ogg; codecs="opus"').replace(/^no$/,""),ogg:!!n.canPlayType('audio/ogg; codecs="vorbis"').replace(/^no$/,""),oga:!!n.canPlayType('audio/ogg; codecs="vorbis"').replace(/^no$/,""),wav:!!n.canPlayType('audio/wav; codecs="1"').replace(/^no$/,""),aac:!!n.canPlayType("audio/aac;").replace(/^no$/,""),m4a:!!(n.canPlayType("audio/x-m4a;")||n.canPlayType("audio/m4a;")||n.canPlayType("audio/aac;")).replace(/^no$/,""),mp4:!!(n.canPlayType("audio/x-mp4;")||n.canPlayType("audio/mp4;")||n.canPlayType("audio/aac;")).replace(/^no$/,""),weba:!!n.canPlayType('audio/webm; codecs="vorbis"').replace(/^no$/,""),webm:!!n.canPlayType('audio/webm; codecs="vorbis"').replace(/^no$/,""),dolby:!!n.canPlayType('audio/mp4; codecs="ec-3"').replace(/^no$/,"")},e},_enableMobileAudio:function(){var e=this||a,o=/iPhone|iPad|iPod|Android|BlackBerry|BB10|Silk/i.test(navigator.userAgent),t=!!("ontouchend"in window||navigator.maxTouchPoints>0||navigator.msMaxTouchPoints>0);if(!n||!e._mobileEnabled&&o&&t){e._mobileEnabled=!1;var r=function(){var o=n.createBuffer(1,1,22050),t=n.createBufferSource();t.buffer=o,t.connect(n.destination),"undefined"==typeof t.start?t.noteOn(0):t.start(0),t.onended=function(){t.disconnect(0),e._mobileEnabled=!0,e.mobileAutoEnable=!1,document.removeEventListener("touchend",r,!0)}};return document.addEventListener("touchend",r,!0),e}},_autoSuspend:function(){var e=this;if(e.autoSuspend&&n&&"undefined"!=typeof n.suspend&&o){for(var t=0;t<e._howls.length;t++)if(e._howls[t]._webAudio)for(var r=0;r<e._howls[t]._sounds.length;r++)if(!e._howls[t]._sounds[r]._paused)return e;return e._suspendTimer=setTimeout(function(){e.autoSuspend&&(e._suspendTimer=null,e.state="suspending",n.suspend().then(function(){e.state="suspended",e._resumeAfterSuspend&&(delete e._resumeAfterSuspend,e._autoResume())}))},3e4),e}},_autoResume:function(){var e=this;if(n&&"undefined"!=typeof n.resume&&o)return"running"===e.state&&e._suspendTimer?(clearTimeout(e._suspendTimer),e._suspendTimer=null):"suspended"===e.state?(e.state="resuming",n.resume().then(function(){e.state="running"}),e._suspendTimer&&(clearTimeout(e._suspendTimer),e._suspendTimer=null)):"suspending"===e.state&&(e._resumeAfterSuspend=!0),e}};var a=new d,i=function(e){var n=this;return e.src&&0!==e.src.length?void n.init(e):void console.error("An array of source files must be passed with any new Howl.")};i.prototype={init:function(e){var t=this;return t._autoplay=e.autoplay||!1,t._format="string"!=typeof e.format?e.format:[e.format],t._html5=e.html5||!1,t._muted=e.mute||!1,t._loop=e.loop||!1,t._pool=e.pool||5,t._preload="boolean"==typeof e.preload?e.preload:!0,t._rate=e.rate||1,t._sprite=e.sprite||{},t._src="string"!=typeof e.src?e.src:[e.src],t._volume=void 0!==e.volume?e.volume:1,t._duration=0,t._loaded=!1,t._sounds=[],t._endTimers={},t._queue=[],t._onend=e.onend?[{fn:e.onend}]:[],t._onfade=e.onfade?[{fn:e.onfade}]:[],t._onload=e.onload?[{fn:e.onload}]:[],t._onloaderror=e.onloaderror?[{fn:e.onloaderror}]:[],t._onpause=e.onpause?[{fn:e.onpause}]:[],t._onplay=e.onplay?[{fn:e.onplay}]:[],t._onstop=e.onstop?[{fn:e.onstop}]:[],t._onmute=e.onmute?[{fn:e.onmute}]:[],t._onvolume=e.onvolume?[{fn:e.onvolume}]:[],t._onrate=e.onrate?[{fn:e.onrate}]:[],t._onseek=e.onseek?[{fn:e.onseek}]:[],t._webAudio=o&&!t._html5,"undefined"!=typeof n&&n&&a.mobileAutoEnable&&a._enableMobileAudio(),a._howls.push(t),t._preload&&t.load(),t},load:function(){var e=this,n=null;if(t)return void e._emit("loaderror",null,"No audio support.");"string"==typeof e._src&&(e._src=[e._src]);for(var o=0;o<e._src.length;o++){var r,u;if(e._format&&e._format[o]?r=e._format[o]:(u=e._src[o],r=/^data:audio\/([^;,]+);/i.exec(u),r||(r=/\.([^.]+)$/.exec(u.split("?",1)[0])),r&&(r=r[1].toLowerCase())),a.codecs(r)){n=e._src[o];break}}return n?(e._src=n,"https:"===window.location.protocol&&"http:"===n.slice(0,5)&&(e._html5=!0,e._webAudio=!1),new _(e),e._webAudio&&l(e),e):void e._emit("loaderror",null,"No codec support for selected audio sources.")},play:function(e){var o=this,t=arguments,r=null;if("number"==typeof e)r=e,e=null;else if("undefined"==typeof e){e="__default";for(var d=0,i=0;i<o._sounds.length;i++)o._sounds[i]._paused&&!o._sounds[i]._ended&&(d++,r=o._sounds[i]._id);1===d?e=null:r=null}var _=r?o._soundById(r):o._inactiveSound();if(!_)return null;if(r&&!e&&(e=_._sprite||"__default"),!o._loaded&&!o._sprite[e])return o._queue.push({event:"play",action:function(){o.play(o._soundById(_._id)?_._id:void 0)}}),_._id;if(r&&!_._paused)return _._id;o._webAudio&&a._autoResume();var s=_._seek>0?_._seek:o._sprite[e][0]/1e3,l=(o._sprite[e][0]+o._sprite[e][1])/1e3-s,f=1e3*l/Math.abs(_._rate);f!==1/0&&(o._endTimers[_._id]=setTimeout(o._ended.bind(o,_),f)),_._paused=!1,_._ended=!1,_._sprite=e,_._seek=s,_._start=o._sprite[e][0]/1e3,_._stop=(o._sprite[e][0]+o._sprite[e][1])/1e3,_._loop=!(!_._loop&&!o._sprite[e][2]);var c=_._node;if(o._webAudio){var p=function(){o._refreshBuffer(_);var e=_._muted||o._muted?0:_._volume*a.volume();c.gain.setValueAtTime(e,n.currentTime),_._playStart=n.currentTime,"undefined"==typeof c.bufferSource.start?_._loop?c.bufferSource.noteGrainOn(0,s,86400):c.bufferSource.noteGrainOn(0,s,l):_._loop?c.bufferSource.start(0,s,86400):c.bufferSource.start(0,s,l),o._endTimers[_._id]||f===1/0||(o._endTimers[_._id]=setTimeout(o._ended.bind(o,_),f)),t[1]||setTimeout(function(){o._emit("play",_._id)},0)};o._loaded?p():(o.once("load",p,_._id),o._clearTimer(_._id))}else{var m=function(){c.currentTime=s,c.muted=_._muted||o._muted||a._muted||c.muted,c.volume=_._volume*a.volume(),c.playbackRate=_._rate,setTimeout(function(){c.play(),t[1]||o._emit("play",_._id)},0)};if(4===c.readyState||!c.readyState&&navigator.isCocoonJS)m();else{var v=function(){f!==1/0&&(o._endTimers[_._id]=setTimeout(o._ended.bind(o,_),f)),m(),c.removeEventListener(u,v,!1)};c.addEventListener(u,v,!1),o._clearTimer(_._id)}}return _._id},pause:function(e){var n=this;if(!n._loaded)return n._queue.push({event:"pause",action:function(){n.pause(e)}}),n;for(var o=n._getSoundIds(e),t=0;t<o.length;t++){n._clearTimer(o[t]);var r=n._soundById(o[t]);if(r&&!r._paused){if(r._seek=n.seek(o[t]),r._paused=!0,n._stopFade(o[t]),r._node)if(n._webAudio){if(!r._node.bufferSource)return n;"undefined"==typeof r._node.bufferSource.stop?r._node.bufferSource.noteOff(0):r._node.bufferSource.stop(0),r._node.bufferSource=null}else isNaN(r._node.duration)&&r._node.duration!==1/0||r._node.pause();arguments[1]||n._emit("pause",r._id)}}return n},stop:function(e){var n=this;if(!n._loaded)return"undefined"!=typeof n._sounds[0]._sprite&&n._queue.push({event:"stop",action:function(){n.stop(e)}}),n;for(var o=n._getSoundIds(e),t=0;t<o.length;t++){n._clearTimer(o[t]);var r=n._soundById(o[t]);if(r&&!r._paused){if(r._seek=r._start||0,r._paused=!0,r._ended=!0,n._stopFade(o[t]),r._node)if(n._webAudio){if(!r._node.bufferSource)return n;"undefined"==typeof r._node.bufferSource.stop?r._node.bufferSource.noteOff(0):r._node.bufferSource.stop(0),r._node.bufferSource=null}else isNaN(r._node.duration)&&r._node.duration!==1/0||(r._node.pause(),r._node.currentTime=r._start||0);n._emit("stop",r._id)}}return n},mute:function(e,o){var t=this;if(!t._loaded)return t._queue.push({event:"mute",action:function(){t.mute(e,o)}}),t;if("undefined"==typeof o){if("boolean"!=typeof e)return t._muted;t._muted=e}for(var r=t._getSoundIds(o),u=0;u<r.length;u++){var d=t._soundById(r[u]);d&&(d._muted=e,t._webAudio&&d._node?d._node.gain.setValueAtTime(e?0:d._volume*a.volume(),n.currentTime):d._node&&(d._node.muted=a._muted?!0:e),t._emit("mute",d._id))}return t},volume:function(){var e,o,t=this,r=arguments;if(0===r.length)return t._volume;if(1===r.length){var u=t._getSoundIds(),d=u.indexOf(r[0]);d>=0?o=parseInt(r[0],10):e=parseFloat(r[0])}else r.length>=2&&(e=parseFloat(r[0]),o=parseInt(r[1],10));var i;if(!("undefined"!=typeof e&&e>=0&&1>=e))return i=o?t._soundById(o):t._sounds[0],i?i._volume:0;if(!t._loaded)return t._queue.push({event:"volume",action:function(){t.volume.apply(t,r)}}),t;"undefined"==typeof o&&(t._volume=e),o=t._getSoundIds(o);for(var _=0;_<o.length;_++)i=t._soundById(o[_]),i&&(i._volume=e,r[2]||t._stopFade(o[_]),t._webAudio&&i._node&&!i._muted?i._node.gain.setValueAtTime(e*a.volume(),n.currentTime):i._node&&!i._muted&&(i._node.volume=e*a.volume()),t._emit("volume",i._id));return t},fade:function(e,o,t,r){var u=this;if(!u._loaded)return u._queue.push({event:"fade",action:function(){u.fade(e,o,t,r)}}),u;u.volume(e,r);for(var d=u._getSoundIds(r),a=0;a<d.length;a++){var i=u._soundById(d[a]);if(i)if(r||u._stopFade(d[a]),u._webAudio&&!i._muted){var _=n.currentTime,s=_+t/1e3;i._volume=e,i._node.gain.setValueAtTime(e,_),i._node.gain.linearRampToValueAtTime(o,s),i._timeout=setTimeout(function(e,t){delete t._timeout,setTimeout(function(){t._volume=o,u._emit("fade",e)},s-n.currentTime>0?Math.ceil(1e3*(s-n.currentTime)):0)}.bind(u,d[a],i),t)}else{var l=Math.abs(e-o),f=e>o?"out":"in",c=l/.01,p=t/c;!function(){var n=e;i._interval=setInterval(function(e,t){n+="in"===f?.01:-.01,n=Math.max(0,n),n=Math.min(1,n),n=Math.round(100*n)/100,u.volume(n,e,!0),n===o&&(clearInterval(t._interval),delete t._interval,u._emit("fade",e))}.bind(u,d[a],i),p)}()}}return u},_stopFade:function(e){var o=this,t=o._soundById(e);return t._interval?(clearInterval(t._interval),delete t._interval,o._emit("fade",e)):t._timeout&&(clearTimeout(t._timeout),delete t._timeout,t._node.gain.cancelScheduledValues(n.currentTime),o._emit("fade",e)),o},loop:function(){var e,n,o,t=this,r=arguments;if(0===r.length)return t._loop;if(1===r.length){if("boolean"!=typeof r[0])return o=t._soundById(parseInt(r[0],10)),o?o._loop:!1;e=r[0],t._loop=e}else 2===r.length&&(e=r[0],n=parseInt(r[1],10));for(var u=t._getSoundIds(n),d=0;d<u.length;d++)o=t._soundById(u[d]),o&&(o._loop=e,t._webAudio&&o._node&&o._node.bufferSource&&(o._node.bufferSource.loop=e));return t},rate:function(){var e,n,o=this,t=arguments;if(0===t.length)n=o._sounds[0]._id;else if(1===t.length){var r=o._getSoundIds(),u=r.indexOf(t[0]);u>=0?n=parseInt(t[0],10):e=parseFloat(t[0])}else 2===t.length&&(e=parseFloat(t[0]),n=parseInt(t[1],10));var d;if("number"!=typeof e)return d=o._soundById(n),d?d._rate:o._rate;if(!o._loaded)return o._queue.push({event:"rate",action:function(){o.rate.apply(o,t)}}),o;"undefined"==typeof n&&(o._rate=e),n=o._getSoundIds(n);for(var a=0;a<n.length;a++)if(d=o._soundById(n[a])){d._rate=e,o._webAudio&&d._node&&d._node.bufferSource?d._node.bufferSource.playbackRate.value=e:d._node&&(d._node.playbackRate=e);var i=o.seek(n[a]),_=(o._sprite[d._sprite][0]+o._sprite[d._sprite][1])/1e3-i,s=1e3*_/Math.abs(d._rate);o._clearTimer(n[a]),o._endTimers[n[a]]=setTimeout(o._ended.bind(o,d),s),o._emit("rate",d._id)}return o},seek:function(){var e,o,t=this,r=arguments;if(0===r.length)o=t._sounds[0]._id;else if(1===r.length){var u=t._getSoundIds(),d=u.indexOf(r[0]);d>=0?o=parseInt(r[0],10):(o=t._sounds[0]._id,e=parseFloat(r[0]))}else 2===r.length&&(e=parseFloat(r[0]),o=parseInt(r[1],10));if("undefined"==typeof o)return t;if(!t._loaded)return t._queue.push({event:"seek",action:function(){t.seek.apply(t,r)}}),t;var a=t._soundById(o);if(a){if(!(e>=0))return t._webAudio?a._seek+(t.playing(o)?n.currentTime-a._playStart:0):a._node.currentTime;var i=t.playing(o);i&&t.pause(o,!0),a._seek=e,t._clearTimer(o),i&&t.play(o,!0),t._emit("seek",o)}return t},playing:function(e){var n=this,o=n._soundById(e)||n._sounds[0];return o?!o._paused:!1},duration:function(){return this._duration},unload:function(){for(var e=this,n=e._sounds,o=0;o<n.length;o++){n[o]._paused||(e.stop(n[o]._id),e._emit("end",n[o]._id)),e._webAudio||(n[o]._node.src="",n[o]._node.removeEventListener("error",n[o]._errorFn,!1),n[o]._node.removeEventListener(u,n[o]._loadFn,!1)),delete n[o]._node,e._clearTimer(n[o]._id);var t=a._howls.indexOf(e);t>=0&&a._howls.splice(t,1)}return s&&delete s[e._src],e._sounds=[],e=null,null},on:function(e,n,o,t){var r=this,u=r["_on"+e];return"function"==typeof n&&u.push(t?{id:o,fn:n,once:t}:{id:o,fn:n}),r},off:function(e,n,o){var t=this,r=t["_on"+e];if(n){for(var u=0;u<r.length;u++)if(n===r[u].fn&&o===r[u].id){r.splice(u,1);break}}else if(e)t["_on"+e]=[];else for(var d=Object.keys(t),u=0;u<d.length;u++)0===d[u].indexOf("_on")&&Array.isArray(t[d[u]])&&(t[d[u]]=[]);return t},once:function(e,n,o){var t=this;return t.on(e,n,o,1),t},_emit:function(e,n,o){for(var t=this,r=t["_on"+e],u=r.length-1;u>=0;u--)r[u].id&&r[u].id!==n&&"load"!==e||(setTimeout(function(e){e.call(this,n,o)}.bind(t,r[u].fn),0),r[u].once&&t.off(e,r[u].fn,r[u].id));return t},_loadQueue:function(){var e=this;if(e._queue.length>0){var n=e._queue[0];e.once(n.event,function(){e._queue.shift(),e._loadQueue()}),n.action()}return e},_ended:function(e){var o=this,t=e._sprite,r=!(!e._loop&&!o._sprite[t][2]);if(o._emit("end",e._id),!o._webAudio&&r&&o.stop(e._id).play(e._id),o._webAudio&&r){o._emit("play",e._id),e._seek=e._start||0,e._playStart=n.currentTime;var u=1e3*(e._stop-e._start)/Math.abs(e._rate);o._endTimers[e._id]=setTimeout(o._ended.bind(o,e),u)}return o._webAudio&&!r&&(e._paused=!0,e._ended=!0,e._seek=e._start||0,o._clearTimer(e._id),e._node.bufferSource=null,a._autoSuspend()),o._webAudio||r||o.stop(e._id),o},_clearTimer:function(e){var n=this;return n._endTimers[e]&&(clearTimeout(n._endTimers[e]),delete n._endTimers[e]),n},_soundById:function(e){for(var n=this,o=0;o<n._sounds.length;o++)if(e===n._sounds[o]._id)return n._sounds[o];return null},_inactiveSound:function(){var e=this;e._drain();for(var n=0;n<e._sounds.length;n++)if(e._sounds[n]._ended)return e._sounds[n].reset();return new _(e)},_drain:function(){var e=this,n=e._pool,o=0,t=0;if(!(e._sounds.length<n)){for(t=0;t<e._sounds.length;t++)e._sounds[t]._ended&&o++;for(t=e._sounds.length-1;t>=0;t--){if(n>=o)return;e._sounds[t]._ended&&(e._webAudio&&e._sounds[t]._node&&e._sounds[t]._node.disconnect(0),e._sounds.splice(t,1),o--)}}},_getSoundIds:function(e){var n=this;if("undefined"==typeof e){for(var o=[],t=0;t<n._sounds.length;t++)o.push(n._sounds[t]._id);return o}return[e]},_refreshBuffer:function(e){var o=this;return e._node.bufferSource=n.createBufferSource(),e._node.bufferSource.buffer=s[o._src],e._node.bufferSource.connect(e._panner?e._panner:e._node),e._node.bufferSource.loop=e._loop,e._loop&&(e._node.bufferSource.loopStart=e._start||0,e._node.bufferSource.loopEnd=e._stop),e._node.bufferSource.playbackRate.value=o._rate,o}};var _=function(e){this._parent=e,this.init()};if(_.prototype={init:function(){var e=this,n=e._parent;return e._muted=n._muted,e._loop=n._loop,e._volume=n._volume,e._muted=n._muted,e._rate=n._rate,e._seek=0,e._paused=!0,e._ended=!0,e._sprite="__default",e._id=Math.round(Date.now()*Math.random()),n._sounds.push(e),e.create(),e},create:function(){var e=this,o=e._parent,t=a._muted||e._muted||e._parent._muted?0:e._volume*a.volume();return o._webAudio?(e._node="undefined"==typeof n.createGain?n.createGainNode():n.createGain(),e._node.gain.setValueAtTime(t,n.currentTime),e._node.paused=!0,e._node.connect(r)):(e._node=new Audio,e._errorFn=e._errorListener.bind(e),e._node.addEventListener("error",e._errorFn,!1),e._loadFn=e._loadListener.bind(e),e._node.addEventListener(u,e._loadFn,!1),e._node.src=o._src,e._node.preload="auto",e._node.volume=t,e._node.load()),e},reset:function(){var e=this,n=e._parent;return e._muted=n._muted,e._loop=n._loop,e._volume=n._volume,e._muted=n._muted,e._rate=n._rate,e._seek=0,e._paused=!0,e._ended=!0,e._sprite="__default",e._id=Math.round(Date.now()*Math.random()),e},_errorListener:function(){var e=this;e._node.error&&4===e._node.error.code&&(a.noAudio=!0),e._parent._emit("loaderror",e._id,e._node.error?e._node.error.code:0),e._node.removeEventListener("error",e._errorListener,!1)},_loadListener:function(){var e=this,n=e._parent;n._duration=Math.ceil(10*e._node.duration)/10,0===Object.keys(n._sprite).length&&(n._sprite={__default:[0,1e3*n._duration]}),n._loaded||(n._loaded=!0,n._emit("load"),n._loadQueue()),n._autoplay&&n.play(),e._node.removeEventListener(u,e._loadFn,!1)}},o)var s={},l=function(e){var n=e._src;if(s[n])return e._duration=s[n].duration,void p(e);if(/^data:[^;]+;base64,/.test(n)){window.atob=window.atob||function(e){for(var n,o,t="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",r=String(e).replace(/=+$/,""),u=0,d=0,a="";o=r.charAt(d++);~o&&(n=u%4?64*n+o:o,u++%4)?a+=String.fromCharCode(255&n>>(-2*u&6)):0)o=t.indexOf(o);return a};for(var o=atob(n.split(",")[1]),t=new Uint8Array(o.length),r=0;r<o.length;++r)t[r]=o.charCodeAt(r);c(t.buffer,e)}else{var u=new XMLHttpRequest;u.open("GET",n,!0),u.responseType="arraybuffer",u.onload=function(){c(u.response,e)},u.onerror=function(){e._webAudio&&(e._html5=!0,e._webAudio=!1,e._sounds=[],delete s[n],e.load())},f(u)}},f=function(e){try{e.send()}catch(n){e.onerror()}},c=function(e,o){n.decodeAudioData(e,function(e){e&&o._sounds.length>0&&(s[o._src]=e,p(o,e))},function(){o._emit("loaderror",null,"Decoding audio data failed.")})},p=function(e,n){n&&!e._duration&&(e._duration=n.duration),0===Object.keys(e._sprite).length&&(e._sprite={__default:[0,1e3*e._duration]}),e._loaded||(e._loaded=!0,e._emit("load"),e._loadQueue()),e._autoplay&&e.play()};"function"=="function"&&__webpack_require__(7)&&!(__WEBPACK_AMD_DEFINE_ARRAY__ = [], __WEBPACK_AMD_DEFINE_RESULT__ = function(){return{Howler:a,Howl:i}}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__)),"undefined"!=typeof exports&&(exports.Howler=a,exports.Howl=i),"undefined"!=typeof window?(window.HowlerGlobal=d,window.Howler=a,window.Howl=i,window.Sound=_):"undefined"!=typeof global&&(global.HowlerGlobal=d,global.Howler=a,global.Howl=i,global.Sound=_)}();
	/*! Effects Plugin */
	!function(){"use strict";HowlerGlobal.prototype._pos=[0,0,0],HowlerGlobal.prototype._orientation=[0,0,-1,0,1,0],HowlerGlobal.prototype._velocity=[0,0,0],HowlerGlobal.prototype._listenerAttr={dopplerFactor:1,speedOfSound:343.3},HowlerGlobal.prototype.pos=function(e,n,t){var o=this;return o.ctx&&o.ctx.listener?(n="number"!=typeof n?o._pos[1]:n,t="number"!=typeof t?o._pos[2]:t,"number"!=typeof e?o._pos:(o._pos=[e,n,t],o.ctx.listener.setPosition(o._pos[0],o._pos[1],o._pos[2]),o)):o},HowlerGlobal.prototype.orientation=function(e,n,t,o,r,i){var a=this;if(!a.ctx||!a.ctx.listener)return a;var p=a._orientation;return n="number"!=typeof n?p[1]:n,t="number"!=typeof t?p[2]:t,o="number"!=typeof o?p[3]:o,r="number"!=typeof r?p[4]:r,i="number"!=typeof i?p[5]:i,"number"!=typeof e?p:(a._orientation=[e,n,t,o,r,i],a.ctx.listener.setOrientation(e,n,t,o,r,i),a)},HowlerGlobal.prototype.velocity=function(e,n,t){var o=this;return o.ctx&&o.ctx.listener?(n="number"!=typeof n?o._velocity[1]:n,t="number"!=typeof t?o._velocity[2]:t,"number"!=typeof e?o._velocity:(o._velocity=[e,n,t],o.ctx.listener.setVelocity(o._velocity[0],o._velocity[1],o._velocity[2]),o)):o},HowlerGlobal.prototype.listenerAttr=function(e){var n=this;if(!n.ctx||!n.ctx.listener)return n;var t=n._listenerAttr;return e?(n._listenerAttr={dopplerFactor:"undefined"!=typeof e.dopplerFactor?e.dopplerFactor:t.dopplerFactor,speedOfSound:"undefined"!=typeof e.speedOfSound?e.speedOfSound:t.speedOfSound},n.ctx.listener.dopplerFactor=t.dopplerFactor,n.ctx.listener.speedOfSound=t.speedOfSound,n):t},Howl.prototype.init=function(e){return function(n){var t=this;return t._orientation=n.orientation||[1,0,0],t._pos=n.pos||null,t._velocity=n.velocity||[0,0,0],t._pannerAttr={coneInnerAngle:"undefined"!=typeof n.coneInnerAngle?n.coneInnerAngle:360,coneOuterAngle:"undefined"!=typeof n.coneOuterAngle?n.coneOuterAngle:360,coneOuterGain:"undefined"!=typeof n.coneOuterGain?n.coneOuterGain:0,distanceModel:"undefined"!=typeof n.distanceModel?n.distanceModel:"inverse",maxDistance:"undefined"!=typeof n.maxDistance?n.maxDistance:1e4,panningModel:"undefined"!=typeof n.panningModel?n.panningModel:"HRTF",refDistance:"undefined"!=typeof n.refDistance?n.refDistance:1,rolloffFactor:"undefined"!=typeof n.rolloffFactor?n.rolloffFactor:1},e.call(this,n)}}(Howl.prototype.init),Howl.prototype.pos=function(n,t,o,r){var i=this;if(!i._webAudio)return i;if(!i._loaded)return i.once("play",function(){i.pos(n,t,o,r)}),i;if(t="number"!=typeof t?0:t,o="number"!=typeof o?-.5:o,"undefined"==typeof r){if("number"!=typeof n)return i._pos;i._pos=[n,t,o]}for(var a=i._getSoundIds(r),p=0;p<a.length;p++){var l=i._soundById(a[p]);if(l){if("number"!=typeof n)return l._pos;l._pos=[n,t,o],l._node&&(l._panner||e(l),l._panner.setPosition(n,t,o))}}return i},Howl.prototype.orientation=function(n,t,o,r){var i=this;if(!i._webAudio)return i;if(!i._loaded)return i.once("play",function(){i.orientation(n,t,o,r)}),i;if(t="number"!=typeof t?i._orientation[1]:t,o="number"!=typeof o?i._orientation[2]:o,"undefined"==typeof r){if("number"!=typeof n)return i._orientation;i._orientation=[n,t,o]}for(var a=i._getSoundIds(r),p=0;p<a.length;p++){var l=i._soundById(a[p]);if(l){if("number"!=typeof n)return l._orientation;l._orientation=[n,t,o],l._node&&(l._panner||e(l),l._panner.setOrientation(n,t,o))}}return i},Howl.prototype.velocity=function(n,t,o,r){var i=this;if(!i._webAudio)return i;if(!i._loaded)return i.once("play",function(){i.velocity(n,t,o,r)}),i;if(t="number"!=typeof t?i._velocity[1]:t,o="number"!=typeof o?i._velocity[2]:o,"undefined"==typeof r){if("number"!=typeof n)return i._velocity;i._velocity=[n,t,o]}for(var a=i._getSoundIds(r),p=0;p<a.length;p++){var l=i._soundById(a[p]);if(l){if("number"!=typeof n)return l._velocity;l._velocity=[n,t,o],l._node&&(l._panner||e(l),l._panner.setVelocity(n,t,o))}}return i},Howl.prototype.pannerAttr=function(){var n,t,o,r=this,i=arguments;if(!r._webAudio)return r;if(0===i.length)return r._pannerAttr;if(1===i.length){if("object"!=typeof i[0])return o=r._soundById(parseInt(i[0],10)),o?o._pannerAttr:r._pannerAttr;n=i[0],"undefined"==typeof t&&(r._pannerAttr={coneInnerAngle:"undefined"!=typeof n.coneInnerAngle?n.coneInnerAngle:r._coneInnerAngle,coneOuterAngle:"undefined"!=typeof n.coneOuterAngle?n.coneOuterAngle:r._coneOuterAngle,coneOuterGain:"undefined"!=typeof n.coneOuterGain?n.coneOuterGain:r._coneOuterGain,distanceModel:"undefined"!=typeof n.distanceModel?n.distanceModel:r._distanceModel,maxDistance:"undefined"!=typeof n.maxDistance?n.maxDistance:r._maxDistance,panningModel:"undefined"!=typeof n.panningModel?n.panningModel:r._panningModel,refDistance:"undefined"!=typeof n.refDistance?n.refDistance:r._refDistance,rolloffFactor:"undefined"!=typeof n.rolloffFactor?n.rolloffFactor:r._rolloffFactor})}else 2===i.length&&(n=i[0],t=parseInt(i[1],10));for(var a=r._getSoundIds(t),p=0;p<a.length;p++)if(o=r._soundById(a[p])){var l=o._pannerAttr;l={coneInnerAngle:"undefined"!=typeof n.coneInnerAngle?n.coneInnerAngle:l.coneInnerAngle,coneOuterAngle:"undefined"!=typeof n.coneOuterAngle?n.coneOuterAngle:l.coneOuterAngle,coneOuterGain:"undefined"!=typeof n.coneOuterGain?n.coneOuterGain:l.coneOuterGain,distanceModel:"undefined"!=typeof n.distanceModel?n.distanceModel:l.distanceModel,maxDistance:"undefined"!=typeof n.maxDistance?n.maxDistance:l.maxDistance,panningModel:"undefined"!=typeof n.panningModel?n.panningModel:l.panningModel,refDistance:"undefined"!=typeof n.refDistance?n.refDistance:l.refDistance,rolloffFactor:"undefined"!=typeof n.rolloffFactor?n.rolloffFactor:l.rolloffFactor};var c=o._panner;c?(c.coneInnerAngle=l.coneInnerAngle,c.coneOuterAngle=l.coneOuterAngle,c.coneOuterGain=l.coneOuterGain,c.distanceModel=l.distanceModel,c.maxDistance=l.maxDistance,c.panningModel=l.panningModel,c.refDistance=l.refDistance,c.rolloffFactor=l.rolloffFactor):(o._pos||(o._pos=r._pos||[0,0,-.5]),e(o))}return r},Sound.prototype.init=function(e){return function(){var n=this,t=n._parent;n._orientation=t._orientation,n._pos=t._pos,n._velocity=t._velocity,n._pannerAttr=t._pannerAttr,e.call(this),n._pos&&t.pos(n._pos[0],n._pos[1],n._pos[2],n._id)}}(Sound.prototype.init),Sound.prototype.reset=function(e){return function(){var n=this,t=n._parent;return n._orientation=t._orientation,n._pos=t._pos,n._velocity=t._velocity,n._pannerAttr=t._pannerAttr,e.call(this)}}(Sound.prototype.reset);var e=function(e){e._panner=Howler.ctx.createPanner(),e._panner.coneInnerAngle=e._pannerAttr.coneInnerAngle,e._panner.coneOuterAngle=e._pannerAttr.coneOuterAngle,e._panner.coneOuterGain=e._pannerAttr.coneOuterGain,e._panner.distanceModel=e._pannerAttr.distanceModel,e._panner.maxDistance=e._pannerAttr.maxDistance,e._panner.panningModel=e._pannerAttr.panningModel,e._panner.refDistance=e._pannerAttr.refDistance,e._panner.rolloffFactor=e._pannerAttr.rolloffFactor,e._panner.setPosition(e._pos[0],e._pos[1],e._pos[2]),e._panner.setOrientation(e._orientation[0],e._orientation[1],e._orientation[2]),e._panner.setVelocity(e._velocity[0],e._velocity[1],e._velocity[2]),e._panner.connect(e._node),e._paused||e._parent.pause(e._id).play(e._id)}}();
	
	/* WEBPACK VAR INJECTION */}.call(exports, (function() { return this; }())))

/***/ },
/* 7 */
/***/ function(module, exports) {

	/* WEBPACK VAR INJECTION */(function(__webpack_amd_options__) {module.exports = __webpack_amd_options__;
	
	/* WEBPACK VAR INJECTION */}.call(exports, {}))

/***/ },
/* 8 */
/***/ function(module, exports) {

	'use strict';
	
	var $videoIndicator = $('#video-progress .progress');
	var videoPlaying;
	var $el;
	
	$videoIndicator.hide();
	module.exports.start = function ($newVideo) {
	  $el = $newVideo[0];
	  $videoIndicator.show();
	  videoPlaying = true;
	  loop();
	};
	
	module.exports.stop = function () {
	  videoPlaying = false;
	  $('#video-progress .progress').hide();
	};
	
	function loop() {
	  window.requestAnimationFrame(function () {
	    var rate = $el.currentTime / $el.duration;
	    var percent = (rate * 100).toFixed(2);
	    $videoIndicator.css({ 'width': percent + 'vw' });
	    if (videoPlaying) {
	      setTimeout(function () {
	        loop();
	      }, 41);
	    }
	  });
	}

/***/ },
/* 9 */
/***/ function(module, exports) {

	'use strict';
	
	module.exports.convertAllPropsToPx = function (keyframes, windowWidth, windowHeight) {
	  var i, j, k;
	  for (i = 0; i < keyframes.length; i++) {
	    // loop keyframes
	    keyframes[i].duration = convertPercentToPx(keyframes[i].duration, 'y', windowWidth, windowHeight);
	    for (j = 0; j < keyframes[i].animations.length; j++) {
	      // loop animations
	      Object.keys(keyframes[i].animations[j]).forEach(function (key) {
	        // loop properties
	        var value = keyframes[i].animations[j][key];
	        if (key !== 'selector') {
	          if (value instanceof Array) {
	            // if its an array
	            for (k = 0; k < value.length; k++) {
	              // if value in array is %
	              if (typeof value[k] === "string") {
	                if (key === 'translateY') {
	                  value[k] = convertPercentToPx(value[k], 'y', windowWidth, windowHeight);
	                } else {
	                  value[k] = convertPercentToPx(value[k], 'x', windowWidth, windowHeight);
	                }
	              }
	            }
	          } else {
	            if (typeof value === "string") {
	              // if single value is a %
	              if (key === 'translateY') {
	                value = convertPercentToPx(value, 'y', windowWidth, windowHeight);
	              } else {
	                value = convertPercentToPx(value, 'x', windowWidth, windowHeight);
	              }
	            }
	          }
	          keyframes[i].animations[j][key] = value;
	        }
	      });
	    }
	  }
	  return keyframes;
	};
	
	function convertPercentToPx(value, axis, windowWidth, windowHeight) {
	  if (typeof value === "string" && value.match(/%/g)) {
	    if (axis === 'y') value = parseFloat(value) / 100 * windowHeight;
	    if (axis === 'x') value = parseFloat(value) / 100 * windowWidth;
	  }
	  if (typeof value === "string" && value.match(/v/g)) {
	    if (axis === 'y') value = parseFloat(value) / 100 * windowHeight;
	    if (axis === 'x') value = parseFloat(value) / 100 * windowWidth;
	  }
	  return value;
	};
	
	module.exports.buildPage = function (keyframes, wrappers) {
	  var i,
	      j,
	      k,
	      initFrames = [],
	      bodyHeight = 0;
	  for (i = 0; i < keyframes.length; i++) {
	    // loop keyframes
	    if (keyframes[i].focus) {
	      if (bodyHeight !== initFrames[initFrames.length - 1]) {
	        initFrames.push(bodyHeight);
	      }
	    }
	    bodyHeight += keyframes[i].duration;
	    if ($.inArray(keyframes[i].wrapper, wrappers) == -1) {
	      wrappers.push(keyframes[i].wrapper);
	    }
	    for (j = 0; j < keyframes[i].animations.length; j++) {
	      // loop animations
	      Object.keys(keyframes[i].animations[j]).forEach(function (key) {
	        // loop properties
	        var value = keyframes[i].animations[j][key];
	        if (key !== 'selector' && value instanceof Array === false) {
	          var valueSet = [];
	          valueSet.push(getDefaultPropertyValue(key), value);
	          value = valueSet;
	        }
	        keyframes[i].animations[j][key] = value;
	      });
	    }
	  }
	
	  return {
	    frameFocus: initFrames,
	    bodyHeight: bodyHeight,
	    wrappers: wrappers
	  };
	};
	
	module.exports.getDefaultPropertyValue = getDefaultPropertyValue;
	
	function getDefaultPropertyValue(property) {
	  switch (property) {
	    case 'translateX':
	      return 0;
	    case 'translateY':
	      return 0;
	    case 'scale':
	      return 1;
	    case 'rotate':
	      return 0;
	    case 'opacity':
	      return 1;
	    default:
	      return null;
	  }
	}

/***/ },
/* 10 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	
	var Kefir = __webpack_require__(3);
	
	var obscene = __webpack_require__(2);
	
	module.exports.init = function () {
	
	  var PLAY_SPEED = 10;
	
	  var isPlaying = false;
	  var isPlayingInterval;
	  var bodyHeight = $('body').height();
	  var na = 0;
	
	  var keyUpPressed = Kefir.fromEvents(document, 'keyup', function (e) {
	    e.preventDefault();
	    return e;
	  });
	
	  var backKey = keyUpPressed.filter(function (e) {
	    return e.keyCode === 38;
	  });
	  var nextKey = keyUpPressed.filter(function (e) {
	    return e.keyCode === 40;
	  });
	
	  var toggleUpClicked = Kefir.fromEvents($("#toggleUp"), 'click');
	  var toggleDownClicked = Kefir.fromEvents($("#toggleDown"), 'click');
	
	  Kefir.merge([nextKey, toggleDownClicked]).onValue(function (e) {
	    obscene.action('next');
	  });
	
	  Kefir.merge([backKey, toggleUpClicked]).onValue(function (e) {
	    obscene.action('previous');
	  });
	
	  $("#togglePlay").on('click', function (e) {
	    console.log("CLICK");
	    if (isPlaying) {
	      pause();
	    } else {
	      play();
	    }
	  });
	
	  keyUpPressed.filter(function (e) {
	    return e.keyCode === 80 || e.keyCode === 32;
	  }).onValue(function (e) {
	    if (isPlaying) {
	      pause();
	    } else {
	      play();
	    }
	  });
	
	  function play() {
	    console.log("PLAY");
	    isPlayingInterval = setInterval(function () {
	      obscene.action('next');
	    }, 5000);
	    $("#togglePlay").removeClass('fa-play').addClass('fa-pause');
	    isPlaying = true;
	  }
	
	  function pause() {
	    console.log("PAUSE");
	    clearInterval(isPlayingInterval);
	    isPlaying = false;
	    $("#togglePlay").removeClass('fa-pause').addClass('fa-play');
	  }
	};

/***/ },
/* 11 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	
	/*
	 *  Dependencies
	*/
	
	var obscene = __webpack_require__(2);
	var pageUtils = __webpack_require__(9);
	
	/*
	 *  Streams
	*/
	
	var scrollTopChanged = obscene.scrollTopChanged;
	var dimensionsCalculated = obscene.dimensionsCalculated;
	var wrapperChanged = obscene.wrapperChanged;
	
	/*
	 *  DOM Elements
	*/
	
	var $window = $(window);
	var $body = $('body');
	var $bodyhtml = $('body,html');
	var $experienceIndicator = $('#experience-progress .progress');
	
	/*
	 *  Child Renders
	*/
	
	var renderWrapper = __webpack_require__(12);
	var renderScrollbar = __webpack_require__(13);
	var renderAudioPlayer = __webpack_require__(4);
	var renderVideoPlayer = __webpack_require__(8);
	var renderError = __webpack_require__(14);
	
	/*
	 *  Render
	*/
	
	// Hack to force resize once. For some
	// reason this prevents the animations from blinking on Chrome
	scrollTopChanged.take(1).delay(500).onValue(function () {
	  $window.trigger('resize');
	});
	
	// Render Dimensions
	dimensionsCalculated.onValue(function (state) {
	  $body.height(state.bodyHeight);
	  renderScrollBarFocusBars(state);
	});
	
	function renderScrollBarFocusBars(state) {
	  state.frameFocus.map(function (focus) {
	    return (focus / state.bodyHeight).toFixed(2) * 100;
	  }) // Convert to percent
	  .map(function (focusPercent) {
	    return focusPercent + "vh";
	  }) // Convert to vh
	  .map(function (focusVh) {
	    $("#experience-progress").append('<div class="center-marker" style="top:' + focusVh + '"></div>');
	  });
	}
	
	// Render Wrapper
	wrapperChanged.onValue(function (currentWrapper) {
	  // console.log("WRAPPER CHANGED");
	  window.requestAnimationFrame(function () {
	    $(currentWrapper[0]).hide();
	    $(currentWrapper[1]).show();
	
	    window.location.hash = currentWrapper[1];
	    ga('send', 'scene_accessed', currentWrapper[1]); // Google Analytics
	    renderVideo(currentWrapper);
	    renderAudio(currentWrapper);
	  });
	});
	
	function showCurrentWrappers(prev, next) {
	  if (prev.currentWrapper === next.currentWrapper) {
	    return false;
	  }
	  // console.log('previous', prev, next)
	  $(prev.currentWrapper).hide();
	  $(next.currentWrapper).show();
	}
	
	function renderVideo(state) {
	
	  $('video', state[0]).animate({
	    volume: 0
	  }, 300, 'swing', function () {
	    // really stop the video
	    $(this).get(0).pause();
	  });
	
	  var $newVideo = $('video', state[1]);
	
	  if ($newVideo[0]) {
	    $newVideo[0].play();
	    $newVideo.animate({
	      volume: $newVideo.attr('max-volume') || 1
	    }, 300, 'swing');
	    renderVideoPlayer.start($newVideo);
	  } else {
	    renderVideoPlayer.stop($newVideo);
	  }
	}
	function renderAudio(state) {
	  renderAudioPlayer.next(state[1].substr(1));
	}
	
	// Render Keyframes
	
	scrollTopChanged.onValue(function (statediff) {
	
	  window.requestAnimationFrame(function () {
	    var prev = statediff[0];
	    var next = statediff[1];
	
	    animateElements(next);
	    animateScrollBar(next);
	    // renderMusic(next)
	  });
	});
	
	function renderMusic(wrapperId) {
	  audioplayer.next(wrapperId.substr(1));
	}
	
	function animateScrollBar(state) {
	  var percent = (state.scrollTop / state.bodyHeight).toFixed(2) * 100;
	  $experienceIndicator.css({
	    'transform': 'translateY(' + percent + '%)'
	  });
	}
	
	function animateElements(state) {
	  var animation, translateY, translateX, scale, rotate, opacity;
	  for (var i = 0; i < state.keyframes[state.currentKeyframe].animations.length; i++) {
	    animation = state.keyframes[state.currentKeyframe].animations[i];
	    translateY = calcPropValue(animation, 'translateY', state);
	    translateX = calcPropValue(animation, 'translateX', state);
	    scale = calcPropValue(animation, 'scale', state);
	    rotate = calcPropValue(animation, 'rotate', state);
	    opacity = calcPropValue(animation, 'opacity', state);
	    $(animation.selector, state.currentWrapper).css({
	      'transform': 'translate3d(' + translateX + 'px, ' + translateY + 'px, 0) scale(' + scale + ') rotate(' + rotate + 'deg)',
	      'opacity': opacity.toFixed(2)
	    });
	  }
	}
	
	function calcPropValue(animation, property, state) {
	  var value = animation[property];
	  if (value) {
	    value = easeInOutQuad(state.relativeScrollTop, value[0], value[1] - value[0], state.keyframes[state.currentKeyframe].duration);
	  } else {
	    value = pageUtils.getDefaultPropertyValue(property);
	  }
	  // value = +value.toFixed(2)
	  // TEMPORARILY REMOVED CAUSE SCALE DOESN'T WORK WITHA AGRESSIVE ROUNDING LIKE THIS
	  return value;
	}
	
	function getDefaultPropertyValue(property) {
	  switch (property) {
	    case 'translateX':
	      return 0;
	    case 'translateY':
	      return 0;
	    case 'scale':
	      return 1;
	    case 'rotate':
	      return 0;
	    case 'opacity':
	      return 1;
	    default:
	      return null;
	  }
	}
	
	function easeInOutQuad(t, b, c, d) {
	  //sinusoadial in and out
	  return -c / 2 * (Math.cos(Math.PI * t / d) - 1) + b;
	}

/***/ },
/* 12 */
/***/ function(module, exports) {

	"use strict";

/***/ },
/* 13 */
/***/ function(module, exports) {

	'use strict';
	
	function renderScroll(scroll) {
	  console.log("RENDER", scroll, Math.floor($window.scrollTop()));
	  $bodyhtml.animate({ scrollTop: scroll }, 1500, 'linear');
	}
	
	function animateScrollBar() {
	  var percent = (scrollTop / bodyHeight).toFixed(2) * 100;
	  $experienceIndicator.css({
	    'transform': 'translateY(' + percent + '%)'
	  });
	}
	function buildScrollBarCenters() {
	  frameFocus.map(function (center) {
	    return (center / bodyHeight).toFixed(2) * 100;
	  }).map(function (centerPercent) {
	    return centerPercent + "vh";
	  }).map(function (centerVh) {
	    $("#experience-progress").append('<div class="center-marker" style="top:' + centerVh + '"></div>');
	  });
	}

/***/ },
/* 14 */
/***/ function(module, exports) {

	"use strict";

/***/ },
/* 15 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	
	// NOTE: This file relies heavily on webpack for requires of html and json config files.
	var Kefir = __webpack_require__(3);
	
	// Constants
	var SCENES_DIRECTORY = '../../scenes/'; // TODO: SCENES_DIRECTORY doesn't seem to work with webpack's html & json loader.
	var SCENE_INDEX = __webpack_require__(16);
	var SCENE_CONTAINER_CSS_CLASS = 'wrapper';
	
	/*
	 * Generates an HTML string from scene.html files the scenes folder.
	 * Creates a wrapper div that provides feedback.
	 */
	module.exports.renderHTML = function () {
	
	  return SCENE_INDEX.map(function (scene) {
	    return scene.id;
	  }).map(function (sceneName) {
	    return {
	      html: __webpack_require__(17)("./" + sceneName + "/scene.html"),
	      name: sceneName
	    };
	  }).map(function (sceneObject) {
	    // Create wrapper div for html
	    var $wrapper = document.createElement('div');
	    $wrapper.classList.add(SCENE_CONTAINER_CSS_CLASS);
	    $wrapper.setAttribute('id', sceneObject.name);
	    $wrapper.innerHTML = sceneObject.html;
	    return $wrapper.outerHTML;
	  }).reduce(function (prev, next) {
	    // Concat to 1 html string
	    return prev + next;
	  }, '');
	};
	
	module.exports.getScenes = createHTMLForScenes;
	
	function createHTMLForScenes() {
	  return SCENE_INDEX.map(function (scene) {
	    return scene.id;
	  }).map(function (sceneName) {
	    // get the scenes(which are in arrays)
	    return __webpack_require__(49)("./" + sceneName + "/scene.json");
	  }).reduce(function (prev, current) {
	    // flatten arrays by concating into a new array
	    return prev.concat(current);
	  }, []);
	}
	
	module.exports.getAudioConfig = function () {
	
	  return SCENE_INDEX.map(function (scene) {
	    return scene;
	  });
	};

/***/ },
/* 16 */
/***/ function(module, exports) {

	module.exports = [
		{
			"id": "intro",
			"audio": {
				"src": "1",
				"max": 0.01
			}
		},
		{
			"id": "doyoufeelmuslim",
			"audio": {
				"src": "1",
				"max": 0.5
			}
		},
		{
			"id": "aboutyourself",
			"audio": {
				"src": "1",
				"max": 0.5
			}
		},
		{
			"id": "reactionstoterror",
			"audio": {
				"src": "2",
				"max": 0.3
			}
		},
		{
			"id": "feelingconfused",
			"audio": {
				"src": "3",
				"max": 0.5
			}
		},
		{
			"id": "outtogetyou",
			"audio": {
				"src": "3",
				"max": 0.5
			}
		},
		{
			"id": "somethingtoprove",
			"audio": {
				"src": "4",
				"max": 0.5
			}
		},
		{
			"id": "itisnteasy",
			"audio": {
				"src": "5",
				"max": 0.5
			}
		},
		{
			"id": "mixedfeelings",
			"audio": {
				"src": "6",
				"max": 0.5
			}
		},
		{
			"id": "differentpractices",
			"audio": {
				"src": "6",
				"max": 0.5
			}
		},
		{
			"id": "yetthatsokay",
			"audio": {
				"src": "6",
				"max": 0.5
			}
		},
		{
			"id": "itsgottoend",
			"audio": {
				"src": "7",
				"max": 0.5
			}
		},
		{
			"id": "iwantmyislamback1",
			"audio": {
				"src": "7",
				"max": 0.5
			}
		},
		{
			"id": "whoarethey",
			"audio": {
				"src": "7",
				"max": 0.5
			}
		},
		{
			"id": "isisfightmisquote",
			"audio": {
				"src": "8",
				"max": 0.5
			}
		},
		{
			"id": "isisapocalypsemisquote",
			"audio": {
				"src": "8",
				"max": 0.5
			}
		},
		{
			"id": "isisafterlifefallacy",
			"audio": {
				"src": "8",
				"max": 0.5
			}
		},
		{
			"id": "whatislamichistoryprefers",
			"audio": {
				"src": "10",
				"max": 0.2
			}
		},
		{
			"id": "isisbankrupt",
			"audio": {
				"src": "10",
				"max": 0.5
			}
		},
		{
			"id": "isiswantstodivide",
			"audio": {
				"src": "7",
				"max": 0.5
			}
		},
		{
			"id": "battleofageneration",
			"audio": {
				"src": "9",
				"max": 0.5
			}
		},
		{
			"id": "complicatedsituation",
			"audio": {
				"src": "8",
				"max": 0.5
			}
		},
		{
			"id": "muslimsbelieveindividuallife",
			"audio": {
				"src": "8",
				"max": 0.5
			}
		},
		{
			"id": "wewillprotecteachother",
			"audio": {
				"src": "9",
				"max": 0.5
			}
		},
		{
			"id": "wearenotafraid",
			"audio": {
				"src": "8",
				"max": 0.5
			}
		},
		{
			"id": "wearecoming",
			"audio": {
				"src": "9",
				"max": 0.5
			}
		},
		{
			"id": "likepeace",
			"audio": {
				"src": "9",
				"max": 0.01
			}
		}
	];

/***/ },
/* 17 */
/***/ function(module, exports, __webpack_require__) {

	var map = {
		"./aboutyourself/scene.html": 18,
		"./battleofageneration/scene.html": 19,
		"./complicatedsituation/scene.html": 20,
		"./differentpractices/scene.html": 21,
		"./doyoufeelmuslim/scene.html": 22,
		"./explosion/scene.html": 23,
		"./feelingconfused/scene.html": 24,
		"./intro/scene.html": 25,
		"./isisafterlifefallacy/scene.html": 26,
		"./isisapocalypsemisquote/scene.html": 27,
		"./isisbankrupt/scene.html": 28,
		"./isisfightmisquote/scene.html": 29,
		"./isisobjective/scene.html": 30,
		"./isiswantstodivide/scene.html": 31,
		"./itisnteasy/scene.html": 32,
		"./itsgottoend/scene.html": 33,
		"./iwantmyislamback1/scene.html": 34,
		"./likepeace/scene.html": 35,
		"./mixedfeelings/scene.html": 36,
		"./muslimsbelieveindividuallife/scene.html": 37,
		"./outtogetyou/scene.html": 38,
		"./reactionstoterror/scene.html": 39,
		"./somethingtoprove/scene.html": 40,
		"./wearecoming/scene.html": 41,
		"./wearenotafraid/scene.html": 42,
		"./wewillprotecteachother/scene.html": 43,
		"./whatislamichistoryprefers/scene.html": 44,
		"./whatthequranprefers/scene.html": 45,
		"./whoarethey/scene.html": 46,
		"./withallthehatred/scene.html": 47,
		"./yetthatsokay/scene.html": 48
	};
	function webpackContext(req) {
		return __webpack_require__(webpackContextResolve(req));
	};
	function webpackContextResolve(req) {
		return map[req] || (function() { throw new Error("Cannot find module '" + req + "'.") }());
	};
	webpackContext.keys = function webpackContextKeys() {
		return Object.keys(map);
	};
	webpackContext.resolve = webpackContextResolve;
	module.exports = webpackContext;
	webpackContext.id = 17;


/***/ },
/* 18 */
/***/ function(module, exports) {

	module.exports = "<style>\n.about-yourself {\n    opacity: 0;\n}\n</style>\n\n<div class=\"about-yourself\">\n  <div class=\"table\">\n    <div class=\"table-center\">\n      <div class=\"display-4 text-centered\">How do you feel about yourself?</div>\n    </div>\n  </div>\n</div>";

/***/ },
/* 19 */
/***/ function(module, exports) {

	module.exports = "\n<div class=\"battle-of-a-generation grey-zone\">\n\t<div class=\"table \">\n  \t\t<div class=\"table-center\">\n    \t\t<div class=\"display-4 text-centered\">We must begin our fight for this generation.</div>\n  \t\t</div>\n\t</div>\n</div>\n";

/***/ },
/* 20 */
/***/ function(module, exports) {

	module.exports = "\n<style>\n  .left, .right {\n    float: left;\n  }\n  .table {\n    position: relative;\n  }\n  .too-long-quote {\n    position: fixed;\n    top: 0;\n    left: 0;\n    font-size: 6.5vmin;\n    text-align: center;\n    color: rgba(255,255,255,0.3);\n    width: 100%;\n    height: 100%;\n    overflow: hidden;\n    /*background: #333;*/\n    padding-top: 4vmax;\n    -webkit-filter: blur(2px);\n  }\n  .text-centered {\n    text-align: center;\n  }\n  .onTop {\n    z-index: 20000;\n  }\n</style>\n\n<div class=\"grey-zone\">\n  <div class=\"too-long-quote\">\n    <strong>The failure</strong> of the postcolonial elites to <strong>create genuine democratic societies</strong> and foster a sense of national unity <strong>opting instead for military dictatorships</strong> that <strong>eroded the potential for economic and political development</strong> coupled with the historic mistakes of Arabic progressive parties and their <strong>appeasement towards autocratic rulers</strong> contributing to the <strong>complete evisceration of alternative political frameworks</strong> that could create organic resistance towards external meddling, hegemony and outright military interventions leaving a <strong>radical interpretation of religion as the only remaining ideological platform capable of mobilising the disenfranchised</strong> exacerbated by the global decline of universal ideals and the <strong>rise of identity as a prime mobiliser</strong> and enabled by political and <strong>financial support from theocratic regimes</strong> aiming to shore up their legitimacy and made worse by the <strong>collapse of the regional security</strong> order creating the conditions for <strong>proxy wars</strong> and political, social and economic upheaval intensified by geo-politically <strong>incoherent international meddling</strong> escalating conflicts and leading to a <strong>perpetual state of chaos</strong> under which the appeal of a revivalist religious-political order embodied by the <strong>caliphate becomes attractive</strong> particularly when coupled with a millenarian apocalyptic narrative.\n  </div>\n  <div class=\"table onTop \">\n    <div class=\"table-center\">\n      <div class=\"display-4 text-centered\">The situation may be complicated...</div>\n    </div>\n  </div>\n</div>\n";

/***/ },
/* 21 */
/***/ function(module, exports) {

	module.exports = "<div class=\"table\">\n  <div class=\"table-center\">\n    <div class=\"display-4 text-centered\">Tired of seeing attacks increase. <br><br>\n      Tired of feeling apologetic.</div>\n  </div>\n</div>\n";

/***/ },
/* 22 */
/***/ function(module, exports) {

	module.exports = "<style>\n  #doyoufeelmuslim .anim-2 {\n    opacity: 0;\n  }\n  .video-background video {\n    width: 100vw;\n  }\n  .video-background {\n    position: fixed;\n    top: 0;\n    left: 0;\n  }\n  #doyoufeelmuslim .display-4 {\n    background: black;\n    display: inline-block;\n    padding: 0.5vw;\n  }\n</style>\n<div class=\"video-background\">\n  <video loop max-volume=\"0.17\" >\n    <source src=\"img/terrorist-attacks.mp4\" type=\"video/mp4\">\n  </video>\n</div>\n<div class=\"table\">\n  <div class=\"table-center\">\n    <div class=\"display-4 anim-1\">How do you feel about your Islam?</div><br /><br />\n  </div>\n</div>\n";

/***/ },
/* 23 */
/***/ function(module, exports) {

	module.exports = "<p class=\"explosion-byline\">Here's an example of 16 elements scaling, fading and moving at once.</p>\n<ul id=\"domExplosionList\">\n  <li class=\"dom-explosion-item dei-1\"></li>\n  <li class=\"dom-explosion-item dei-2\"></li>\n  <li class=\"dom-explosion-item dei-3\"></li>\n  <li class=\"dom-explosion-item dei-4\"></li>\n  <li class=\"dom-explosion-item dei-5\"></li>\n  <li class=\"dom-explosion-item dei-6\"></li>\n  <li class=\"dom-explosion-item dei-7\"></li>\n  <li class=\"dom-explosion-item dei-8\"></li>\n  <li class=\"dom-explosion-item dei-9\"></li>\n  <li class=\"dom-explosion-item dei-10\"></li>\n  <li class=\"dom-explosion-item dei-11\"></li>\n  <li class=\"dom-explosion-item dei-12\"></li>\n  <li class=\"dom-explosion-item dei-13\"></li>\n  <li class=\"dom-explosion-item dei-14\"></li>\n  <li class=\"dom-explosion-item dei-15\"></li>\n  <li class=\"dom-explosion-item dei-16\"></li>\n</ul>\n";

/***/ },
/* 24 */
/***/ function(module, exports) {

	module.exports = "<style>\n.us-against-them {\n    opacity: 0;\n}\n</style>\n\n<div class=\"us-against-them\">\n\t<div class=\"table\">\n\t  <div class=\"table-center\">\n\t    <div class=\"display-4 text-centered\">Feels like it's us against them...</div>\n\t  </div>\n\t</div>\n</div>";

/***/ },
/* 25 */
/***/ function(module, exports) {

	module.exports = "<style>\n/*#intro {\n  position: fixed;\n  top: 15vh;\n  left: 10%;\n  width: 80%;\n  color: #fff;\n  text-align: center;\n  text-transform: uppercase;\n}*/\n.help-text {\n\tposition: absolute;\n\tcolor: #29d;\n\tfont-size: 3vmin;\n}\n.help-text-skin {\n\tcolor: #29d;\n\tfont-size: 3vmin;\n}\n/*.help-text i {\n\tfont-size: 5vmin;\n}*/\n.beta {\n\topacity: 0.7;\n\tfont-size: 4.5vmin;\n}\n\n.feedback-button {\n\tfont-weight: bold;\n\t    font-size: 3.5vmin;\n\t    background: #2299DD;\n\t    padding: 0rem;\n\t    display: inline;\n\t    padding: 1vmin;\n\t    border-radius: 1vmin;\n}\n</style>\n<div class=\"intro\">\n\t<div class=\"table \">\n  \t\t<div class=\"table-center\">\n    \t\t<div class=\"display-1 text-centered\">\n\t\t\t\t\t<div class=\"beta animated flash\"  style=\"animation-delay: 1.5s;\">Pardon Our Dust. We Are Currently Beta Testing.</div> <br><a target=\"_blank\" class=\"feedback-button\" href=\"mailto:muslimsagainstisisgroup@gmail.com?subject=Techincal Feedback\">Submit Technical Feedback</a><br><br><br>\n\n\t\t\t\t\t<i class=\"fa fa-music \"></i><br><br>\n\t\t\t\t\t<br ><br>\n    \t\t\tPlay, skip, or scroll to begin <br >\n\t\t\t\t\t<span class=\"help-text-skin\">\n\t\t\t\t\t\tAll quotes and news sources are clickable.\n\t\t\t\t\t</span>\n\t\t\t</div>\n  \t\t</div>\n\t</div>\n</div>\n\n<div class=\"help-text\" style=\"top: 4vmin;right: 16vmin;\">\n\t<span class=\"animated  \" style=\"animation-delay: 2s;\" >Play/Pause <i class=\"fa fa-arrow-circle-right\"></i></span>\n</div>\n<div class=\"help-text\" style=\"top: 14.5vh;right: 16vmin;\">\n\t<span class=\"animated  \" style=\"animation-delay: 2s;\" >Skip <i class=\"fa fa-arrow-circle-right\"></i></span>\n</div>\n\n<div class=\"help-text\" style=\"bottom:3vh;right:48vw;text-align:center\">\n\t<div class=\"animated  \" style=\"animation-delay: 2s;\"><div style=\"padding-bottom: 1vh;\">Scroll</div> <i class=\"fa fa-arrow-circle-down\"></i></div>\n</div>\n";

/***/ },
/* 26 */
/***/ function(module, exports) {

	module.exports = "<style>\n  .table input {\n    font-size: 9.5vmin;\n    width: 5vw;\n    background: black;\n    border: none;\n    color: white;\n    font-weight: bold;\n  }\n  .left-align .quran-read {\n    text-align: left;\n  }\n  .calculator {\n    background: black;\n    width: 48vw;\n    margin: 0 auto;\n    padding: 2vw;\n    opacity: 0;\n  }\n  #isisafterlifefallacy .quote {\n    font-style: italic;\n  }\n  .equals-container {\n    width: 100%;\n    position: relative;\n    padding: 3vmin 0;\n  }\n  .equals {\n    width: 83vmin;\n    position: absolute;\n    border: 0.2vw solid;\n    right: 0;\n  }\n  .equals:after {\n    clear: both;\n  }\n  .text-right {\n    text-align: right;\n  }\n  .text-bold {\n    font-weight: 700;\n  }\n</style>\n\n<div class=\"table\">\n  <div class=\"table-center\" style=\"width:50%\">\n    <div class=\"display-2 premise text-bold\">ISIS may kill innocent people indiscriminately...</div><br><br>\n    <div class=\"display-2 conclusion text-bold\">Have they even imagined how haram (sinful) that is?</div>\n  </div>\n  <div class=\"table-center\" style=\"width:50\">\n    <div class=\"display-3 text-right calculator\">\n      If you've murdered <input type=\"number\" id=\"murdernumber\" value=\"1\" min=\"1\" size=\"2\" /></strong>\n      <div class=\"display-1 emphasis conclusion\">\n          <a href=\"http://quran.com/5/32\" target=\"_blank\">\n            <strong>...whoever kills a soul ... it is as if he had slain mankind entirely.</strong>\n            <span class=\"quote-source conclusion\">Qur'an 5:32</span>\n          </a>\n      </div>  <div>* 7 billion people</div><br >\n      <div class=\"equals-container\">\n        <hr class=\"equals\"><br >\n      </div>\n      The weight of murdering <br> <strong><span id=\"murdertotal\"></span> people.</strong></div>\n  </div>\n</div>\n\n<!-- TODO: Move to a new script. -->\n\n<script>\n  $(function() {\n\n    var POPULATION_TOTAL = 7000000000;\n\n    // initialiaze\n    updateMurderCalculator();\n\n    $(\"#murdernumber\").on('change', function() {\n      updateMurderCalculator()\n    });\n\n    $(\"#murdernumber\").on('scroll', function() {\n      console.log('blur')\n      $(this).blur();\n    });\n\n    function updateMurderCalculator() {\n      var murdernumber = $(\"#murdernumber\").val();\n      var murderTotal  = murdernumber * POPULATION_TOTAL;\n      render(murderTotal);\n    }\n\n    function render(murderTotal) {\n      $('#murdertotal').html(murderTotal);\n    }\n\n  });\n</script>\n";

/***/ },
/* 27 */
/***/ function(module, exports) {

	module.exports = "  <div class=\"table\">\n    <div class=\"table-center\" style=\"width:50%\">\n      <h1 class=\"premise\">ISIS may believe the Apocalypse is near....</h1><br /><br />\n      <h1 class=\"conclusion\">Have they consulted the Qur’an on this matter?</h1>\n    </div>\n    <div class=\"table-center\" style=\"width:50\">\n      <h2 class=\"quran-read quran-hidden\">\n        <a href=\"http://quran.com/7/187\" target=\"_blank\">They ask thee of the (destined) Hour, when will it come to port. Say: <strong>Knowledge thereof is with my Lord only. He alone will manifest it at its proper time...</strong><span class=\"quote-source\">Qur'an 7:187</span></a><br><br>\n         <a href=\"http://quran.com/41/47\" target=\"_blank\"><strong>To Him [alone]</strong> is attributed  <strong>knowledge of the Hour.</strong><span class=\"quote-source\">Quran 41:47</span></a>\n      </h2>\n    </div>\n  </div>\n";

/***/ },
/* 28 */
/***/ function(module, exports) {

	module.exports = "<style>\n  .left {\n    width: 40vw;\n  }\n\n  .newssource-hor,\n  greyzone-src {\n    max-height: 40vh;\n    box-shadow: 0 1vw 2vw rgba(0, 0, 0, 0.6);\n  }\n\n  .newssources-hor {\n    position: absolute;\n    top: 35vh;\n    width: 230vw;\n    height: 50vh;\n    /*overflow: hidden;*/\n    transform: translateX(250%);\n  }\n\n  .black-zone {\n    background: black;\n    width: 100vw;\n    height: 100vh;\n  }\n/*  #itisnteasy .display-4 {\n    opacity: 0;\n  }*/\n   .dropdead {\n    width: 50vw;\n  }\n  .cunning1 {\n    top: 4vh;\n    right: 6vw;\n  }\n  .cunning2 {\n    top: 40vh;\n    right: 3vw;\n  }\n  .cunning3 {\n    bottom: 4vh;\n    right: 5vw;\n  }\n  .cunning4 {\n    bottom: 5vh;\n    right: 39vw;\n  }\n  .cunning5 {\n    bottom: 2vh;\n    left: 4vw;\n  }\n  .cunning6 {\n    bottom: 30vh;\n    right: 20vw;\n  }\n\n</style>\n<div class=\"grey-zone table\">\n  <div class=\"black-zone table-center\">\n  <div class=\"display-4\" style=\"width:50%\">\n  ISIS is bankrupt as an ideology...\n  <br>\n  <br>\n  <span class=\"conclusion\">but they are cunning with strategy.</span>\n  </div>\n  <div class=\"newsources\">\n    <a target=\"_blank\" class=\"cunning1\" href=\"http://www.nytimes.com/2015/06/13/world/middleeast/isis-is-winning-message-war-us-concludes.html?_r=0\">\n        <img class=\"newssource-hor\" src=\"./img/isis-strategy-social.png\">\n      </a>\n    <a target=\"_blank\" class=\"cunning2\" href=\"http://money.cnn.com/2015/12/06/news/isis-funding/\">\n        <img class=\"newssource-hor\" src=\"./img/isis-strategy-billions.png\">\n      </a>\n    <a target=\"_blank\" class=\"cunning3\" href=\"http://money.cnn.com/2015/12/06/news/isis-funding/\">\n        <img class=\"newssource-hor\" src=\"./img/isis-strategy-flow.png\">\n      </a>\n    <a target=\"_blank\" class=\"cunning4\" href=\"http://www.washingtontimes.com/news/2016/jan/27/islamic-states-cyber-arm-seeks-revenge-hackers-dea/\">\n        <img class=\"newssource-hor\" src=\"./img/isis-strategy-hackers.png\">\n      </a>\n    <a target=\"_blank\" class=\"cunning5\" href=\"http://www.theatlantic.com/international/archive/2015/10/war-isis-us-coalition/410044/\">\n        <img class=\"newssource-hor\" src=\"./img/isis-strategy-humanity.png\">\n      </a>\n   <a target=\"_blank\" class=\"cunning6\" href=\"https://www.opendemocracy.net/nafeez-ahmed/isis-wants-destroy-greyzone-how-we-defend\">\n        <img class=\"newssource-hor greyzone-src\" src=\"./img/isis-strategy-greyzone.png\">\n      </a>\n  </div>\n</div>\n</div>\n";

/***/ },
/* 29 */
/***/ function(module, exports) {

	module.exports = "<style>\n  #isisfightmisquote .premise,\n  #isisfightmisquote .conclusion\n   {\n     position: absolute;\n     width: 40vw;\n     bottom: 40vh;\n     opacity: 0;\n   }\n   #makewhite{\n    font-color:white;\n   }\n\n</style>\n<div class=\"table\">\n  <div class=\"table-center\" style=\"width:50%\">\n    <h1 class=\"premise\">ISIS may quote the Qur'an...</h1>\n    <h1 class=\"conclusion\">But does ISIS read the Qur'an?</h1>\n  </div>\n  <div class=\"table-center\" style=\"width:50\">\n    <h2 class=\"quran-read\">\n      <a href=\"http://quran.com/2/190\" target=\"_blank\"><span class=\"quran-hidden\">Fight in the cause of Allah <strong>against those who fight you</strong>, and <strong>do not commit aggression.</strong> <span class=\"quote-source\">Quran 2:190</span><br><br></span></a>\n      <a href=\"http://quran.com/2/191\" target=\"_blank\">Kill them, wherever you may find them!<span class=\"quote-source\">Qur'an 2:191</span><br><br></a>\n      <a href=\"http://quran.com/2/193\" target=\"_blank\"><span class=\"quran-hidden\">...if they cease, <strong>let there be no hostility except against oppressors</strong>. <span class=\"quote-source\">Quran 2:193</span></span></a>\n    </h2>\n  </div>\n</div>\n";

/***/ },
/* 30 */
/***/ function(module, exports) {

	module.exports = "They has a simple objective they’ve stated.\n";

/***/ },
/* 31 */
/***/ function(module, exports) {

	module.exports = "<style>\n  #isiswantstodivide .anim-2 {\n    opacity: 0;\n  }\n\n  #isiswantstodivide .display-4 {\n    background: black;\n    display: inline-block;\n    padding: 0.5vw;\n  }\n  .color-zone {\n    position: absolute;\n    width: 100vw;\n    height: 100vh;\n  }\n  .zones {\n    height: 100vh;\n  }\n  .violent-zones {\n    width: 10vw;\n    position: relative;\n    z-index: 2;\n  }\n  .grey-zone {\n    background: #747B81\n  }\n  .white-zone {\n    background: white;\n    float:left;\n  }\n  .black-zone {\n    background: black;\n    float:right;\n  }\n  #isiswantstodivide .display-4{\n    position: relative;\n    z-index: 3;\n  }\n</style>\n<div class=\"color-zone\">\n  <div class=\"zones black-zone violent-zones\"></div>\n  <div class=\"zones white-zone violent-zones\"></div>\n</div>\n<div class=\"table grey-zone\">\n  <div class=\"table-center\">\n    <div class=\"display-4 anim-2\">They want to divide us all,</div><br />\n    <div class=\"display-4 anim-2\">destroy the grey zone of coexistence,</div><br />\n    <div class=\"display-4 anim-2\">and start another great war.</div><br /><br />\n    <div class=\"display-4 anim-1\">We won't let that happen.</div>\n  </div>\n</div>\n";

/***/ },
/* 32 */
/***/ function(module, exports) {

	module.exports = "<style>\n  .left {\n    width: 40vw;\n  }\n  .newssource {\n    max-height: 40vh;\n    display: block;\n    box-shadow: 0 1vw 2vw rgba(0,0,0,0.6);\n    margin-bottom: 5vh;\n  }\n  .newsources {\n    position: absolute;\n    width: 100vw;\n    height: 100vh;\n    top: 0;\n    left: 0;\n    /*overflow: hidden;*/\n    /*transform: translateY(80%);*/\n  }\n  .newsources a {\n    max-width: 40vw;\n    position: absolute;\n    opacity: 0;\n  }\n/*  #itisnteasy .display-4 {\n    opacity: 0;\n  }*/\n  .isnteasy_1 {\n    top: 8vh;\n    right: 5vw;\n  }\n   .isnteasy_2 {\n    top: 28vh;\n    right: 5vw;\n  }\n  .isnteasy_3 {\n    top: 45vh;\n    right: 5vw;\n  }\n  .isnteasy_4 {\n    top: 60vh;\n    right: 5vw;\n  }\n  .isnteasy_5 {\n    top: 60vh;\n    right: 20vw;\n  }\n  .isnteasy_6 {\n    top: 65vh;\n    right: 32vw;\n  }\n  .isnteasy_7 {\n    top: 62vh;\n    right: 50vw;\n  }\n  .isnteasy_8 {\n    top: 66vh;\n    right: 65vw;\n  }\n   .isnteasy_9 {\n    top: 5vh;\n    right: 65vw;\n  }\n   .isnteasy_10 {\n    top: 3vh;\n    right: 50vw;\n  }\n   .isnteasy_11 {\n    top: 9vh;\n    right: 38vw;\n  }\n   .isnteasy_12 {\n    top: 5vh;\n    right: 20vw;\n  }\n   .isnteasy_13 {\n    top: 35vh;\n    right: 28vw;\n  }\n</style>\n<div class=\"table\">\n  <div class=\"table-center\">\n  <div class=\"display-4 left\">It isn’t easy being Muslim anywhere… </div>\n  <div class=\"newsources\">\n    <a target=\"_blank\" class=\"isnteasy_1\" href=\"http://content.time.com/time/covers/0,16641,20100830,00.html\">\n      <img class=\"newssource\" src=\"./img/hatecrime-america.jpg\" >\n    </a>\n    <a target=\"_blank\" class=\"isnteasy_2\" href=\"http://america.aljazeera.com/articles/2015/12/9/us-muslims-experience-surge-in-islamophobic-attacks.html\">\n      <img class=\"newssource\" src=\"./img/hatecrime-america2.png\" >\n    </a>\n    <a target=\"_blank\" class=\"isnteasy_3\" href=\"http://www.inquisitr.com/2610717/hate-crime-string-of-anti-muslim-attacks-hit-canada.html\">\n      <img class=\"newssource\" src=\"./img/hatecrime-canada.png\" >\n    </a>\n    <a target=\"_blank\" class=\"isnteasy_4\" href=\"http://america.aljazeera.com/articles/2015/2/17/threats-to-muslim-american-community-intensifies-after-chapel-hill-shooting.html\">\n      <img class=\"newssource\" src=\"./img/hatecrime-chapelhill.png\" >\n    </a>\n    <a target=\"_blank\" class=\"isnteasy_5\" href=\"http://www.telegraph.co.uk/news/worldnews/europe/france/12075018/Hate-crimes-against-Muslims-and-Jews-soar-in-France.html\">\n      <img class=\"newssource\" src=\"./img/hatecrime-france.png\" >\n    </a>\n    <a target=\"_blank\" class=\"isnteasy_6\" href=\"https://www.washingtonpost.com/world/europe/religious-liberties-under-strain-for-muslims-in-france/2015/11/22/83054c06-912f-11e5-befa-99ceebcbb272_story.html\">\n      <img class=\"newssource\" src=\"./img/hatecrime-france2.png\" >\n    </a>\n    <a target=\"_blank\" class=\"isnteasy_7\" href=\"http://losangeles.cbslocal.com/2015/12/13/2-mosques-in-hawthorne-vandalized-with-graffiti/\">\n      <img class=\"newssource\" src=\"./img/hatecrime-grenadegraffiti.png\" >\n    </a>\n    <a target=\"_blank\" class=\"isnteasy_8\" href=\"http://ktla.com/2015/12/11/possible-hate-crime-investigated-after-man-pulls-out-knife-on-muslim-woman-in-chino-hills-sheriffs-department/\">\n      <img class=\"newssource\" src=\"./img/hatecrime-knife.png\" >\n    </a>\n    <a target=\"_blank\" class=\"isnteasy_9\" href=\"http://www.cnn.com/2015/12/12/us/california-mosque-fire/\">\n      <img class=\"newssource\" src=\"./img/hatecrime-mosquefire.png\" >\n    </a>\n    <a target=\"_blank\" class=\"isnteasy_10\" href=\"http://www.foxnews.com/transcript/2014/10/07/bill-oreilly-islam-destructive-force-world/\">\n      <img class=\"newssource\" src=\"./img/hatecrime-oreilly.png\" >\n    </a>\n    <a target=\"_blank\" class=\"isnteasy_11\" href=\"http://www.nydailynews.com/news/national/muslim-ga-girl-class-gasped-teacher-bomb-joke-article-1.2463495\">\n      <img class=\"newssource hidesource\" src=\"./img/hatecrime-studentbackpack.png\" >\n    </a>\n    <a target=\"_blank\" class=\"isnteasy_12\" href=\"http://time.com/4139476/donald-trump-shutdown-muslim-immigration/\">\n      <img class=\"newssource hidesource\" src=\"./img/hatecrime-trump.png\" >\n    </a>\n    <a target=\"_blank\" class=\"isnteasy_13\" href=\"https://today.yougov.com/news/2015/12/11/two-thirds-republicans-back-trump-proposal/\">\n      <img class=\"newssource trump\" src=\"./img/hatecrime-poll.png\" >\n    </a>\n  </div>\n</div>\n</div>\n";

/***/ },
/* 33 */
/***/ function(module, exports) {

	module.exports = "\n\n<div class=\"table\">\n  <div class=\"table-center\">\n    <div class=\"display-4 text-bold text-centered\">ISIS is <span style=\"color:#AB2E2E\" id=\"murder\">murdering</span> Islam's name</div>\n  </div>\n</div>\n\n\n<!--\nView of ISIS Overwhelmingly Negative (Pew bar graph)\nhttp://www.pewresearch.org/fact-tank/2015/11/17/in-nations-with-significant-muslim-populations-much-disdain-for-isis/ft_15-11-17_isis_views/\n -->\n";

/***/ },
/* 34 */
/***/ function(module, exports) {

	module.exports = "<div class=\"table\">\n  <div class=\"table-center\">\n    <div class=\"display-4 text-centered\">AND THAT’S GOT TO END.</div>\n  </div>\n</div>\n";

/***/ },
/* 35 */
/***/ function(module, exports) {

	module.exports = "<style>\n\n.first,.second, .third, .fourth {\n\topacity: 0\n}\n#likepeace .display-4 {\n\topacity: 1!important;\n\ttransform: translateY(30%);\n}\n\n\n#likepeace input {\n\tfont-size: 3vmin;\n\tbackground: #747B81;\n\tcolor: white;\n\tpadding: 2%;\n\twidth: auto;\n\tmargin: 0.5vmin 0;\n\twidth: 96%;\n}\n\n#likepeace label {\n\tcolor: #747B81;\n}\n\n#likepeace input[type=submit] {\n\tcolor: white;\n\tbackground: #3CA2CD;\n\twidth: auto;\n\tmargin-top: 2vmin;\n\tcursor: pointer;\n}\n\n#likepeace label {\n\tdisplay: block;\n\tmargin: 0.2vmin 0.5vmin;\n\ttext-transform: uppercase;\n\tfont-weight: bold;\n\tfont-size: 2.5vmin;\n}\n\n#likepeace #mc_embed_signup {\n\twidth: 50vmax;\n\tbackground: white;\n\tmargin: 0 auto;\n\tpadding: 2vmin;\n}\n\n#likepeace h2 {\n\tcolor: black;\n\tmargin-bottom: 2vmin\n}\n</style>\n<div class=\"table grey-zone\">\n\t\t<div class=\"table-center\">\n  \t\t<div class=\"display-4 text-centered\"><span class=\"first\">MUSLIMS</span> <span class=\"second\">AGAINST</span> <span class=\"third\">ISIS</span></div>\n\t\t\t<div class=\"fourth\">\n\n\t\t\t\t<!-- Begin MailChimp Signup Form -->\n\t\t\t\t<div id=\"mc_embed_signup\">\n\t\t\t\t<form action=\"//muslimsagainstisis.us12.list-manage.com/subscribe/post?u=9d2dd81ccb07b710593475421&amp;id=81a5f5250c\" method=\"post\" id=\"mc-embedded-subscribe-form\" name=\"mc-embedded-subscribe-form\" class=\"validate\" target=\"_blank\" novalidate>\n\t\t\t\t    <div id=\"mc_embed_signup_scroll\">\n\t\t\t\t\t<h2>Updates Soon. Subscribe Now.</h2>\n\t\t\t\t<div class=\"mc-field-group\">\n\t\t\t\t\t<label for=\"mce-EMAIL\">Email Address </label>\n\t\t\t\t\t<input type=\"email\" value=\"\" name=\"EMAIL\" class=\"required email\" id=\"mce-EMAIL\">\n\t\t\t\t</div>\n\t\t\t\t<div class=\"mc-field-group\">\n\t\t\t\t\t<label for=\"mce-FNAME\">First Name </label>\n\t\t\t\t\t<input type=\"text\" value=\"\" name=\"FNAME\" class=\"required\" id=\"mce-FNAME\">\n\t\t\t\t</div>\n\t\t\t\t<div class=\"mc-field-group\">\n\t\t\t\t\t<label for=\"mce-LNAME\">Last Name </label>\n\t\t\t\t\t<input type=\"text\" value=\"\" name=\"LNAME\" class=\"required\" id=\"mce-LNAME\">\n\t\t\t\t</div>\n\t\t\t\t<div class=\"mc-field-group\">\n\t\t\t\t\t<label for=\"mce-SKILLS\">How can you help? (Skills) </label>\n\t\t\t\t\t<input type=\"text\" value=\"\" name=\"SKILLS\" class=\"\" id=\"mce-SKILLS\">\n\t\t\t\t</div>\n\t\t\t\t\t<div id=\"mce-responses\" class=\"clear\">\n\t\t\t\t\t\t<div class=\"response\" id=\"mce-error-response\" style=\"display:none\"></div>\n\t\t\t\t\t\t<div class=\"response\" id=\"mce-success-response\" style=\"display:none\"></div>\n\t\t\t\t\t</div>    <!-- real people should not fill this in and expect good things - do not remove this or risk form bot signups-->\n\t\t\t\t    <div style=\"position: absolute; left: -5000px;\" aria-hidden=\"true\"><input type=\"text\" name=\"b_9d2dd81ccb07b710593475421_81a5f5250c\" tabindex=\"-1\" value=\"\"></div>\n\t\t\t\t    <div class=\"clear\"><input type=\"submit\" value=\"Subscribe\" name=\"subscribe\" id=\"mc-embedded-subscribe\" class=\"button\">\n\t\t\t\t    </div>\n\n<a href=\"https://twitter.com/share\" class=\"twitter-share-button\" data-url=\"http://www.muslimsagainstisis.com\" data-size=\"large\" data-hashtags=\"muslimsagainstisis\" data-dnt=\"true\">Tweet</a>\n\t\t\t\t</form>\n\t\t\t\t</div>\n\t\t\t\t<!--End mc_embed_signup-->\n\t\t\t\t<div class=\"fb-share-button\" data-href=\"http://www.muslimsagainstisis.com\" data-layout=\"button\"></div>\n\t\t\t</div>\n\t\t</div>\n\t\t</div>\n\n</div>";

/***/ },
/* 36 */
/***/ function(module, exports) {

	module.exports = "<div class=\"table\">\n  <div class=\"table-center\">\n    <div class=\"display-4 text-centered\">We are tired of the negative press. <br><br>\n      Tired of the hate crimes.</div>\n  </div>\n</div>\n";

/***/ },
/* 37 */
/***/ function(module, exports) {

	module.exports = "\n<div class=\"muslims-believe-individual-life grey-zone\">\n\t<div class=\"table \">\n  \t\t<div class=\"table-center\">\n    \t\t<div class=\"display-4 text-centered\">... but we are Muslims. <br><br> Muslims that believe EVERY life is sacred.</div>\n  \t\t</div>\n\t</div>\n</div>\n";

/***/ },
/* 38 */
/***/ function(module, exports) {

	module.exports = "<style>\n.out-to-get-you {\n    opacity: 0;\n}\n</style>\n\n<div class=\"out-to-get-you\">\n\t<div class=\"table \">\n\t  <div class=\"table-center\">\n\t    <div class=\"display-4 text-centered\">...like everybody's out to get you...</div>\n\t  </div>\n\t</div>\n</div>";

/***/ },
/* 39 */
/***/ function(module, exports) {

	module.exports = "<style>\n  #reactionstoterror .display-4 {\n    background: black;\n    display: inline-block;\n    padding: 0.5vw;\n    /*position: absolute;*/\n    /*bottom: 5vh;*/\n\n  }\n  #reactionstoterror .anim-1 {\n    opacity: 0;\n  }\n</style>\n<div class=\"video-background\">\n  <video loop max-volume=\"0.4\">\n    <source src=\"img/RevisedWork2.mp4\" type=\"video/mp4\">\n  </video>\n</div>\n<div class=\"table\">\n    <div class=\"table-center\">\n      <div class=\"display-4 anim-1\">How do you feel about how people react to the attacks?</div><br /><br />\n    </div>\n</div>\n";

/***/ },
/* 40 */
/***/ function(module, exports) {

	module.exports = "<style>\n#something-to-prove .display-4 {\n    opacity: 0;\n}\n</style>\n<div class=\"something-to-prove\">\n\t<div class=\"table \">\n  \t\t<div class=\"table-center\">\n    \t\t<div class=\"display-4 text-centered\">...like you have <strong>something to prove</strong>.</div>\n  \t\t</div>\n\t</div>\n</div>";

/***/ },
/* 41 */
/***/ function(module, exports) {

	module.exports = "\n<div class=\"we-are-coming grey-zone\">\n\t<div class=\"table \">\n  \t\t<div class=\"table-center\">\n    \t\t<div class=\"display-4 text-centered\">We are coming.</div>\n  \t\t</div>\n\t</div>\n</div>\n";

/***/ },
/* 42 */
/***/ function(module, exports) {

	module.exports = "\n<div class=\"we-are-not-afraid grey-zone\">\n\t<div class=\"table \">\n  \t\t<div class=\"table-center\">\n    \t\t<div class=\"display-4 text-centered\">We will do more. We will stop this false ideology. We are not afraid.</div>\n  \t\t</div>\n\t</div>\n</div>\n";

/***/ },
/* 43 */
/***/ function(module, exports) {

	module.exports = "<style>\n.wewillprotecteachother {\n    opacity: 0;\n}\n#wewillprotecteachother img {\n  max-width: 35vw;\n}\n#wewillprotecteachother .conclusion,\n#wewillprotecteachother .premise {\n  opacity: 0;\n}\n</style>\n<div class=\"table grey-zone\">\n  <div class=\"table-center\" style=\"width:50%\">\n    <div class=\"premise\">\n      <div class=\"display-2\">We will protect every individual life.</div>\n      <a href=\"http://learningenglish.voanews.com/content/kenyan-muslims-protect-christians-from-terrorist-attack/3114326.html\" target=\"_blank\"><img src=\"./img/KenyaProtect2.png\"></a>\n    </div>\n  </div>\n  <div class=\"table-center\" style=\"width:45%\">\n    <h2 class=\"conclusion\">\n      <div class=\"display-2\">We will ask others to help protect ours.</div>\n      <a href=\"http://www.usatoday.com/story/news/nation-now/2015/12/22/iwillprotectyou-us-service-members-soothe-scared-muslim-girl/77748874/\" target=\"_blank\"><img src=\"./img/IWillProtectYou.png\"></a>\n    </h2>\n  </div>\n</div>\n";

/***/ },
/* 44 */
/***/ function(module, exports) {

	module.exports = "<style>\n  #doyoufeelmuslim .anim-2 {\n    opacity: 0;\n  }\n  .video-background video {\n    width: 100vw;\n  }\n  .video-background {\n    position: fixed;\n    top: 0;\n    left: 0;\n  }\n  #whatislamichistoryprefers .display-4 a,\n  .islamic-inventions {\n    color: rgba(255,255,255,1);\n  }\n\n  .islamic-inventions {\n    opacity: 0;\n  }\n\n</style>\n<div class=\"video-background\">\n  <video loop max-volume=\"1\">\n    <source src=\"img/tyson.mp4\" type=\"video/mp4\">\n  </video>\n</div>\n<div class=\"table\">\n  <div class=\"table-center\">\n    <div class=\"display-4 anim-1\"><a href=\"https://www.youtube.com/watch?v=WZCuF733p88\" target=\"_blank\">Has ISIS forgotten the best of what Muslims have done??</a></div>\n    <div class=\"display-3 islamic-inventions\">\n      <div>Algebra</div>\n      <div>Surgical Innovations</div>\n      <div>Modern Hospitals</div>\n      <div>Accredited Universities</div>\n      <div>The Guitar</div>\n    </div>\n  </div>\n</div>\n";

/***/ },
/* 45 */
/***/ function(module, exports) {

	module.exports = "\n              <!-- the Qur’an prefers learning (‘ilm) over murder.\n              Last time we checked, the Qur’an values scientific observation, experimental knowledge and rationality, over blind leadership following, as seen in 750 VERSES (10%) of the Qur’an. -->\n\n<div class=\"table\">\n  <div class=\"table-center\">\n    <div class=\"display-4 anim-1\">Last time we checked,</div><br /><br />\n    <div class=\"display-1 anim-1\">The Qur’an prefers forgiveness over punishment.</div><br /><br />\n    <div class=\"display-1 anim-1\">The Qur’an prefers peace over over war.</div><br /><br />\n    <div class=\"display-1 anim-1\">The Qur’an prefers knowledge over blindness.</div><br /><br />\n  </div>\n</div>\n";

/***/ },
/* 46 */
/***/ function(module, exports) {

	module.exports = "\n<div class=\"table\">\n  <div class=\"table-center\">\n    <div class=\"display-4 text-centered\">Who are they to declare who is Muslim and who is not? What is Islam and what is not?</div>\n  </div>\n</div>\n";

/***/ },
/* 47 */
/***/ function(module, exports) {

	module.exports = "\n<div class=\"table\">\n  <div class=\"table-center\">\n    <div class=\"display-4\">With all the hatred on the news.</div>\n  </div>\n</div>\n";

/***/ },
/* 48 */
/***/ function(module, exports) {

	module.exports = "<div class=\"table\">\n  <div class=\"table-center\">\n    <div class=\"display-4 text-centered\">We may not agree on every aspect of Islam, <br> <br>\n      but we can agree on one thing...</div>\n  </div>\n</div>\n";

/***/ },
/* 49 */
/***/ function(module, exports, __webpack_require__) {

	var map = {
		"./aboutyourself/scene.json": 50,
		"./battleofageneration/scene.json": 51,
		"./complicatedsituation/scene.json": 52,
		"./differentpractices/scene.json": 53,
		"./doyoufeelmuslim/scene.json": 54,
		"./explosion/scene.json": 55,
		"./feelingconfused/scene.json": 56,
		"./intro/scene.json": 57,
		"./isisafterlifefallacy/scene.json": 58,
		"./isisapocalypsemisquote/scene.json": 59,
		"./isisbankrupt/scene.json": 60,
		"./isisfightmisquote/scene.json": 61,
		"./isisobjective/scene.json": 62,
		"./isiswantstodivide/scene.json": 63,
		"./itisnteasy/scene.json": 64,
		"./itsgottoend/scene.json": 65,
		"./iwantmyislamback1/scene.json": 66,
		"./likepeace/scene.json": 67,
		"./mixedfeelings/scene.json": 68,
		"./muslimsbelieveindividuallife/scene.json": 69,
		"./outtogetyou/scene.json": 70,
		"./reactionstoterror/scene.json": 71,
		"./somethingtoprove/scene.json": 72,
		"./wearecoming/scene.json": 73,
		"./wearenotafraid/scene.json": 74,
		"./wewillprotecteachother/scene.json": 75,
		"./whatislamichistoryprefers/scene.json": 76,
		"./whatthequranprefers/scene.json": 77,
		"./whoarethey/scene.json": 78,
		"./withallthehatred/scene.json": 79,
		"./yetthatsokay/scene.json": 80
	};
	function webpackContext(req) {
		return __webpack_require__(webpackContextResolve(req));
	};
	function webpackContextResolve(req) {
		return map[req] || (function() { throw new Error("Cannot find module '" + req + "'.") }());
	};
	webpackContext.keys = function webpackContextKeys() {
		return Object.keys(map);
	};
	webpackContext.resolve = webpackContextResolve;
	module.exports = webpackContext;
	webpackContext.id = 49;


/***/ },
/* 50 */
/***/ function(module, exports) {

	module.exports = [
		{
			"wrapper": "#aboutyourself",
			"duration": "100%",
			"animations": [
				{
					"selector": ".about-yourself",
					"opacity": [
						0,
						1
					]
				}
			]
		},
		{
			"wrapper": "#aboutyourself",
			"duration": "100%",
			"focus": true,
			"animations": [
				{}
			]
		},
		{
			"wrapper": "#aboutyourself",
			"duration": "100%",
			"animations": [
				{
					"selector": ".about-yourself",
					"opacity": [
						2,
						0
					]
				}
			]
		}
	];

/***/ },
/* 51 */
/***/ function(module, exports) {

	module.exports = [
		{
			"wrapper": "#battleofageneration",
			"duration": "100%",
			"animations": [
				{
					"selector": ".display-4",
					"opacity": [
						0,
						1
					]
				}
			]
		},
		{
			"wrapper": "#battleofageneration",
			"duration": "100%",
			"focus": true,
			"animations": [
				{}
			]
		},
		{
			"wrapper": "#battleofageneration",
			"duration": "100%",
			"animations": [
				{
					"selector": ".display-4",
					"opacity": [
						1,
						0
					]
				}
			]
		}
	];

/***/ },
/* 52 */
/***/ function(module, exports) {

	module.exports = [
		{
			"wrapper": "#complicatedsituation",
			"duration": "100%",
			"animations": [
				{
					"selector": ".display-4",
					"opacity": [
						0,
						1
					]
				}
			]
		},
		{
			"wrapper": "#complicatedsituation",
			"duration": "100%",
			"focus": true,
			"animations": [
				{}
			]
		},
		{
			"wrapper": "#complicatedsituation",
			"duration": "100%",
			"animations": [
				{
					"selector": ".display-4",
					"opacity": [
						1,
						0
					]
				},
				{
					"selector": ".too-long-quote",
					"opacity": [
						1,
						0
					]
				}
			]
		}
	];

/***/ },
/* 53 */
/***/ function(module, exports) {

	module.exports = [
		{
			"wrapper": "#differentpractices",
			"duration": "100%",
			"animations": [
				{
					"selector": ".display-4",
					"opacity": [
						0,
						1.25
					]
				}
			]
		},
		{
			"wrapper": "#differentpractices",
			"duration": "100%",
			"focus": true,
			"animations": [
				{}
			]
		},
		{
			"wrapper": "#differentpractices",
			"duration": "100%",
			"animations": [
				{
					"selector": ".display-4",
					"opacity": [
						2,
						0
					]
				}
			]
		}
	];

/***/ },
/* 54 */
/***/ function(module, exports) {

	module.exports = [
		{
			"wrapper": "#doyoufeelmuslim",
			"duration": "50%",
			"animations": [
				{
					"selector": ".anim-1",
					"opacity": 1
				}
			]
		},
		{
			"wrapper": "#doyoufeelmuslim",
			"duration": "100%",
			"focus": 3,
			"animations": [
				{}
			]
		},
		{
			"wrapper": "#doyoufeelmuslim",
			"duration": "100%",
			"animations": [
				{
					"selector": ".anim-1",
					"opacity": [
						1,
						0
					],
					"translateY": [
						"0%",
						"-5%"
					]
				}
			]
		}
	];

/***/ },
/* 55 */
/***/ function(module, exports) {

	module.exports = [
		{
			"wrapper": "#explosion",
			"duration": "150%",
			"animations": [
				{
					"selector": ".explosion-byline",
					"translateY": "-25%",
					"opacity": [
						0,
						1.75
					]
				},
				{
					"selector": "#domExplosionList",
					"translateY": "-70%",
					"opacity": [
						0,
						1
					]
				}
			]
		},
		{
			"wrapper": "#explosion",
			"duration": "150%",
			"animations": [
				{
					"selector": ".dei-1",
					"translateY": "-15%",
					"translateX": "-10%",
					"opacity": [
						1,
						0
					],
					"scale": 2
				},
				{
					"selector": ".dei-2",
					"translateY": "-5%",
					"translateX": "-4%",
					"opacity": [
						1,
						0
					]
				},
				{
					"selector": ".dei-3",
					"translateY": "-9%",
					"translateX": "2%",
					"opacity": [
						1,
						0
					],
					"scale": 1.2
				},
				{
					"selector": ".dei-4",
					"translateY": "-17%",
					"translateX": "8%",
					"opacity": [
						1,
						0
					],
					"scale": 1.5
				},
				{
					"selector": ".dei-5",
					"translateY": "-2%",
					"translateX": "-15%",
					"opacity": [
						1,
						0
					],
					"scale": 2
				},
				{
					"selector": ".dei-6",
					"translateY": "-1%",
					"translateX": "-7%",
					"opacity": [
						1,
						0
					],
					"scale": 1.2
				},
				{
					"selector": ".dei-7",
					"translateY": "-4%",
					"translateX": "2%",
					"opacity": [
						1,
						0
					],
					"scale": 1.1
				},
				{
					"selector": ".dei-8",
					"translateY": "-3%",
					"translateX": "12%",
					"opacity": [
						1,
						0
					],
					"scale": 1.8
				},
				{
					"selector": ".dei-9",
					"translateY": "3%",
					"translateX": "-12%",
					"opacity": [
						1,
						0
					],
					"scale": 1.5
				},
				{
					"selector": ".dei-10",
					"translateY": "5%",
					"translateX": "-4%",
					"opacity": [
						1,
						0
					]
				},
				{
					"selector": ".dei-11",
					"translateY": "8%",
					"translateX": "6%",
					"opacity": [
						1,
						0
					],
					"scale": 1.4
				},
				{
					"selector": ".dei-12",
					"translateY": "1%",
					"translateX": "20%",
					"opacity": [
						1,
						0
					],
					"scale": 1.9
				},
				{
					"selector": ".dei-13",
					"translateY": "8%",
					"translateX": "-12%",
					"opacity": [
						1,
						0
					],
					"scale": 1.8
				},
				{
					"selector": ".dei-14",
					"translateY": "4%",
					"translateX": "-3%",
					"opacity": [
						1,
						0
					],
					"scale": 1.3
				},
				{
					"selector": ".dei-15",
					"translateY": "14%",
					"translateX": "5%",
					"opacity": [
						1,
						0
					],
					"scale": 1.7
				},
				{
					"selector": ".dei-16",
					"translateY": "6%",
					"translateX": "9%",
					"opacity": [
						1,
						0
					],
					"scale": 2
				}
			]
		},
		{
			"wrapper": "#explosion",
			"duration": "100%",
			"animations": [
				{
					"selector": ".explosion-byline",
					"translateY": [
						"-25%",
						"-40%"
					],
					"opacity": [
						1,
						0
					]
				}
			]
		}
	];

/***/ },
/* 56 */
/***/ function(module, exports) {

	module.exports = [
		{
			"wrapper": "#feelingconfused",
			"duration": "100%",
			"animations": [
				{
					"selector": ".us-against-them",
					"opacity": [
						0,
						1
					]
				}
			]
		},
		{
			"wrapper": "#feelingconfused",
			"duration": "100%",
			"focus": true,
			"animations": [
				{}
			]
		},
		{
			"wrapper": "#feelingconfused",
			"duration": "100%",
			"animations": [
				{
					"selector": ".us-against-them",
					"opacity": [
						2,
						0
					]
				}
			]
		}
	];

/***/ },
/* 57 */
/***/ function(module, exports) {

	module.exports = [
		{
			"wrapper": "#intro",
			"duration": "100%",
			"focus": true,
			"animations": [
				{
					"selector": ".display-1",
					"opacity": [
						1,
						0
					]
				}
			]
		}
	];

/***/ },
/* 58 */
/***/ function(module, exports) {

	module.exports = [
		{
			"wrapper": "#isisafterlifefallacy",
			"duration": "100%",
			"animations": [
				{
					"selector": ".premise",
					"translateY": "0",
					"opacity": [
						0,
						1.75
					]
				},
				{
					"selector": ".conclusion",
					"translateX": "-25%",
					"opacity": [
						0,
						0
					]
				},
				{
					"selector": ".calculator",
					"translateX": "65%",
					"opacity": [
						0,
						0
					]
				},
				{
					"selector": ".quran-read",
					"translateY": "0%",
					"opacity": [
						0,
						0
					]
				}
			]
		},
		{
			"wrapper": "#isisafterlifefallacy",
			"duration": "100%",
			"focus": true,
			"animations": [
				{}
			]
		},
		{
			"wrapper": "#isisafterlifefallacy",
			"duration": "150%",
			"animations": [
				{
					"selector": ".conclusion",
					"translateX": [
						"-25%",
						"0"
					],
					"opacity": [
						0,
						1
					]
				},
				{
					"selector": ".calculator",
					"translateX": [
						"65%",
						"0"
					],
					"opacity": [
						0,
						1
					]
				},
				{
					"selector": ".quran-read",
					"translateY": [
						"0",
						"0"
					],
					"opacity": [
						1
					]
				},
				{
					"selector": ".quran-hidden",
					"opacity": [
						0,
						1
					]
				}
			]
		},
		{
			"wrapper": "#isisafterlifefallacy",
			"duration": "100%",
			"focus": true,
			"animations": [
				{}
			]
		},
		{
			"wrapper": "#isisafterlifefallacy",
			"duration": "150%",
			"animations": [
				{}
			]
		},
		{
			"wrapper": "#isisafterlifefallacy",
			"duration": "250%",
			"animations": [
				{
					"selector": ".conclusion",
					"translateY": [
						"0",
						"-25%"
					],
					"opacity": [
						1,
						0
					]
				},
				{
					"selector": ".calculator",
					"translateY": [
						"0",
						"-25%"
					],
					"opacity": [
						1,
						0
					]
				},
				{
					"selector": ".quran-read",
					"translateY": [
						"0%",
						"-25%"
					],
					"opacity": [
						1,
						0
					]
				},
				{
					"selector": ".premise",
					"translateY": [
						"0%",
						"-25%"
					],
					"opacity": [
						1,
						0
					]
				}
			]
		}
	];

/***/ },
/* 59 */
/***/ function(module, exports) {

	module.exports = [
		{
			"wrapper": "#isisapocalypsemisquote",
			"duration": "100%",
			"animations": [
				{
					"selector": ".premise",
					"translateY": "0",
					"opacity": [
						0,
						1.75
					]
				},
				{
					"selector": ".conclusion",
					"translateY": "25%",
					"opacity": [
						0,
						0
					]
				},
				{
					"selector": ".quran-read",
					"translateY": "0%",
					"opacity": [
						0,
						0
					]
				}
			]
		},
		{
			"wrapper": "#isisapocalypsemisquote",
			"duration": "100%",
			"focus": true,
			"animations": [
				{}
			]
		},
		{
			"wrapper": "#isisapocalypsemisquote",
			"duration": "150%",
			"animations": [
				{
					"selector": ".conclusion",
					"translateY": [
						"25%",
						"0"
					],
					"opacity": [
						0,
						1
					]
				},
				{
					"selector": ".quran-read",
					"translateY": [
						"0",
						"0"
					],
					"opacity": [
						1
					]
				},
				{
					"selector": ".quran-hidden",
					"opacity": [
						0,
						1
					]
				}
			]
		},
		{
			"wrapper": "#isisapocalypsemisquote",
			"duration": "100%",
			"focus": true,
			"animations": [
				{}
			]
		},
		{
			"wrapper": "#isisapocalypsemisquote",
			"duration": "150%",
			"animations": [
				{}
			]
		},
		{
			"wrapper": "#isisapocalypsemisquote",
			"duration": "250%",
			"animations": [
				{
					"selector": ".conclusion",
					"translateY": [
						"0",
						"-25%"
					],
					"opacity": [
						1,
						0
					]
				},
				{
					"selector": ".quran-read",
					"translateY": [
						"0%",
						"-25%"
					],
					"opacity": [
						1,
						0
					]
				},
				{
					"selector": ".premise",
					"translateY": [
						"0%",
						"-25%"
					],
					"opacity": [
						1,
						0
					]
				}
			]
		}
	];

/***/ },
/* 60 */
/***/ function(module, exports) {

	module.exports = [
		{
			"wrapper": "#isisbankrupt",
			"duration": "100%",
			"animations": [
				{
					"selector": ".display-4",
					"opacity": [
						0,
						1
					]
				}
			]
		},
		{
			"wrapper": "#isisbankrupt",
			"duration": "100%",
			"animations": [
				{
					"selector": ".cunning1",
					"opacity": [
						0,
						1
					],
					"translateY": [
						"-4%",
						"0%"
					],
					"translateX": [
						"3%",
						"0"
					]
				},
				{
					"selector": ".conclusion",
					"opacity": [
						0,
						1
					]
				}
			]
		},
		{
			"wrapper": "#isisbankrupt",
			"duration": "100%",
			"animations": [
				{
					"selector": ".cunning2",
					"opacity": [
						0,
						1
					],
					"translateY": [
						"0%",
						"0%"
					],
					"translateX": [
						"3%",
						"0"
					]
				}
			]
		},
		{
			"wrapper": "#isisbankrupt",
			"duration": "100%",
			"animations": [
				{
					"selector": ".cunning3",
					"opacity": [
						0,
						1
					],
					"translateY": [
						"4%",
						"0%"
					],
					"translateX": [
						"3%",
						"0"
					]
				}
			]
		},
		{
			"wrapper": "#isisbankrupt",
			"duration": "100%",
			"animations": [
				{
					"selector": ".cunning4",
					"opacity": [
						0,
						1
					],
					"translateY": [
						"4%",
						"0%"
					],
					"translateX": [
						"0%",
						"0"
					]
				}
			]
		},
		{
			"wrapper": "#isisbankrupt",
			"duration": "100%",
			"animations": [
				{
					"selector": ".cunning5",
					"opacity": [
						0,
						1
					],
					"translateY": [
						"4%",
						"0%"
					],
					"translateX": [
						"-3%",
						"0"
					]
				}
			]
		},
		{
			"wrapper": "#isisbankrupt",
			"duration": "100%",
			"focus": true,
			"animations": []
		},
		{
			"wrapper": "#isisbankrupt",
			"duration": "100%",
			"animations": [
				{
					"selector": ".cunning6",
					"opacity": [
						0,
						1
					],
					"translateY": [
						"0%",
						"40%"
					],
					"translateX": [
						"0%",
						"0%"
					]
				},
				{
					"selector": ".cunning6",
					"translateY": [
						"10%",
						"0%"
					],
					"translateX": [
						"0%",
						"0%"
					],
					"scale": [
						1,
						1.5
					]
				},
				{
					"selector": ".cunning1",
					"opacity": [
						1,
						0
					]
				},
				{
					"selector": ".cunning2",
					"opacity": [
						1,
						0
					]
				},
				{
					"selector": ".cunning3",
					"opacity": [
						1,
						0
					]
				},
				{
					"selector": ".cunning4",
					"opacity": [
						1,
						0
					]
				},
				{
					"selector": ".cunning5",
					"opacity": [
						1,
						0
					]
				}
			]
		},
		{
			"wrapper": "#isisbankrupt",
			"duration": "100%",
			"focus": true,
			"animations": [
				{}
			]
		},
		{
			"wrapper": "#isisbankrupt",
			"duration": "100%",
			"animations": [
				{
					"selector": ".cunning6",
					"opacity": [
						1,
						0
					],
					"scale": [
						1.5
					]
				},
				{
					"selector": ".newssource-hor",
					"opacity": [
						1,
						0
					]
				}
			]
		},
		{
			"wrapper": "#isisbankrupt",
			"duration": "100%",
			"animations": [
				{
					"selector": ".black-zone",
					"translateX": [
						"0%",
						"90%"
					]
				},
				{
					"selector": ".display-4",
					"opacity": [
						1,
						0
					]
				}
			]
		}
	];

/***/ },
/* 61 */
/***/ function(module, exports) {

	module.exports = [
		{
			"wrapper": "#isisfightmisquote",
			"duration": "100%",
			"animations": [
				{
					"selector": ".premise",
					"translateY": "0",
					"opacity": [
						0,
						1.75
					]
				},
				{
					"selector": ".conclusion",
					"translateY": "25%",
					"opacity": [
						0,
						0
					]
				},
				{
					"selector": ".quran-read",
					"translateY": "0%",
					"opacity": [
						0,
						1
					]
				}
			]
		},
		{
			"wrapper": "#isisfightmisquote",
			"duration": "100%",
			"focus": true,
			"animations": [
				{}
			]
		},
		{
			"wrapper": "#isisfightmisquote",
			"duration": "150%",
			"animations": [
				{
					"selector": ".premise",
					"translateY": [
						"0",
						"-25%"
					],
					"opacity": [
						1,
						0
					]
				},
				{
					"selector": ".conclusion",
					"translateY": [
						"25%",
						"0"
					],
					"opacity": [
						0,
						1
					]
				},
				{
					"selector": ".quran-read",
					"translateY": [
						"0",
						"0"
					],
					"opacity": [
						1
					]
				},
				{
					"selector": ".quran-hidden",
					"opacity": [
						0,
						1
					]
				}
			]
		},
		{
			"wrapper": "#isisfightmisquote",
			"duration": "100%",
			"focus": true,
			"animations": [
				{}
			]
		},
		{
			"wrapper": "#isisfightmisquote",
			"duration": "150%",
			"animations": [
				{}
			]
		},
		{
			"wrapper": "#isisfightmisquote",
			"duration": "250%",
			"animations": [
				{
					"selector": ".conclusion",
					"translateY": [
						"0",
						"-25%"
					],
					"opacity": [
						1,
						0
					]
				},
				{
					"selector": ".quran-read",
					"translateY": [
						"0%",
						"-25%"
					],
					"opacity": [
						1,
						0
					]
				}
			]
		}
	];

/***/ },
/* 62 */
/***/ function(module, exports) {

	module.exports = [
		{
			"wrapper": "#isisobjective",
			"duration": "100%",
			"animations": [
				{
					"selector": ".display-4",
					"opacity": [
						1,
						0
					]
				}
			]
		}
	];

/***/ },
/* 63 */
/***/ function(module, exports) {

	module.exports = [
		{
			"wrapper": "#isiswantstodivide",
			"duration": "100%",
			"animations": [
				{
					"selector": ".violent-zones",
					"scale": [
						1,
						5.55
					]
				},
				{
					"selector": ".anim-2",
					"opacity": [
						0,
						1.55
					]
				}
			]
		},
		{
			"wrapper": "#isiswantstodivide",
			"duration": "100%",
			"focus": true,
			"animations": [
				{}
			]
		},
		{
			"wrapper": "#isiswantstodivide",
			"duration": "100%",
			"animations": [
				{
					"selector": ".violent-zones",
					"scale": [
						5.55,
						0
					]
				},
				{
					"selector": ".anim-1",
					"opacity": [
						0,
						1.55
					]
				}
			]
		},
		{
			"wrapper": "#isiswantstodivide",
			"duration": "100%",
			"focus": true,
			"animations": [
				{}
			]
		},
		{
			"wrapper": "#isiswantstodivide",
			"duration": "100%",
			"animations": [
				{
					"selector": ".anim-1",
					"opacity": [
						1,
						0
					],
					"translateY": [
						"0%",
						"-20%"
					]
				},
				{
					"selector": ".anim-2",
					"opacity": [
						1,
						0
					],
					"translateY": [
						"0%",
						"-20%"
					]
				}
			]
		}
	];

/***/ },
/* 64 */
/***/ function(module, exports) {

	module.exports = [
		{
			"wrapper": "#itisnteasy",
			"duration": "100%",
			"animations": [
				{
					"selector": ".isnteasy_1",
					"opacity": [
						0,
						1
					],
					"translateY": [
						"-4%",
						"0%"
					],
					"translateX": [
						"3%",
						"0"
					]
				},
				{
					"selector": ".display-4",
					"opacity": [
						0,
						1
					]
				}
			]
		},
		{
			"wrapper": "#itisnteasy",
			"duration": "100%",
			"animations": [
				{
					"selector": ".isnteasy_2",
					"opacity": [
						0,
						1
					],
					"translateY": [
						"0%",
						"0%"
					],
					"translateX": [
						"3%",
						"0"
					]
				}
			]
		},
		{
			"wrapper": "#itisnteasy",
			"duration": "100%",
			"animations": [
				{
					"selector": ".isnteasy_3",
					"opacity": [
						0,
						1
					],
					"translateY": [
						"0%",
						"0%"
					],
					"translateX": [
						"3%",
						"0"
					]
				}
			]
		},
		{
			"wrapper": "#itisnteasy",
			"duration": "100%",
			"animations": [
				{
					"selector": ".isnteasy_4",
					"opacity": [
						0,
						1
					],
					"translateY": [
						"4%",
						"0%"
					],
					"translateX": [
						"3%",
						"0"
					]
				}
			]
		},
		{
			"wrapper": "#itisnteasy",
			"duration": "100%",
			"animations": [
				{
					"selector": ".isnteasy_5",
					"opacity": [
						0,
						1
					],
					"translateY": [
						"4%",
						"0%"
					],
					"translateX": [
						"0%",
						"0"
					]
				}
			]
		},
		{
			"wrapper": "#itisnteasy",
			"duration": "100%",
			"animations": [
				{
					"selector": ".isnteasy_6",
					"opacity": [
						0,
						1
					],
					"translateY": [
						"4%",
						"0%"
					],
					"translateX": [
						"0%",
						"0"
					]
				}
			]
		},
		{
			"wrapper": "#itisnteasy",
			"duration": "100%",
			"animations": [
				{
					"selector": ".isnteasy_7",
					"opacity": [
						0,
						1
					],
					"translateY": [
						"4%",
						"0%"
					],
					"translateX": [
						"0%",
						"0"
					]
				}
			]
		},
		{
			"wrapper": "#itisnteasy",
			"duration": "100%",
			"animations": [
				{
					"selector": ".isnteasy_8",
					"opacity": [
						0,
						1
					],
					"translateY": [
						"4%",
						"0%"
					],
					"translateX": [
						"-3%",
						"0"
					]
				}
			]
		},
		{
			"wrapper": "#itisnteasy",
			"duration": "100%",
			"animations": [
				{
					"selector": ".isnteasy_9",
					"opacity": [
						0,
						1
					],
					"translateY": [
						"-4%",
						"0%"
					],
					"translateX": [
						"-3%",
						"0"
					]
				}
			]
		},
		{
			"wrapper": "#itisnteasy",
			"duration": "100%",
			"animations": [
				{
					"selector": ".isnteasy_10",
					"opacity": [
						0,
						1
					],
					"translateY": [
						"-4%",
						"0%"
					],
					"translateX": [
						"0%",
						"0"
					]
				}
			]
		},
		{
			"wrapper": "#itisnteasy",
			"duration": "100%",
			"animations": [
				{
					"selector": ".isnteasy_11",
					"opacity": [
						0,
						1
					],
					"translateY": [
						"-4%",
						"0%"
					],
					"translateX": [
						"0%",
						"0"
					]
				}
			]
		},
		{
			"wrapper": "#itisnteasy",
			"duration": "100%",
			"animations": [
				{
					"selector": ".isnteasy_12",
					"opacity": [
						0,
						1
					],
					"translateY": [
						"-4%",
						"0%"
					],
					"translateX": [
						"0%",
						"0"
					]
				}
			]
		},
		{
			"wrapper": "#itisnteasy",
			"duration": "100%",
			"focus": true,
			"animations": []
		},
		{
			"wrapper": "#itisnteasy",
			"duration": "100%",
			"animations": [
				{
					"selector": ".isnteasy_13",
					"opacity": [
						0,
						1
					],
					"translateY": [
						"0%",
						"0%"
					],
					"translateX": [
						"-80%",
						"0"
					]
				},
				{
					"selector": ".isnteasy_1",
					"opacity": [
						1,
						0
					],
					"translateY": [
						"0%",
						"-40%"
					],
					"translateX": [
						"0%",
						"30%"
					]
				},
				{
					"selector": ".isnteasy_2",
					"opacity": [
						1,
						0
					],
					"translateY": [
						"0%",
						"0%"
					],
					"translateX": [
						"0%",
						"30%"
					]
				},
				{
					"selector": ".isnteasy_3",
					"opacity": [
						1,
						0
					],
					"translateY": [
						"0%",
						"0%"
					],
					"translateX": [
						"0%",
						"30%"
					]
				},
				{
					"selector": ".isnteasy_4",
					"opacity": [
						1,
						0
					],
					"translateY": [
						"0%",
						"40%"
					],
					"translateX": [
						"0%",
						"30%"
					]
				},
				{
					"selector": ".isnteasy_5",
					"opacity": [
						1,
						0
					],
					"translateY": [
						"0%",
						"40%"
					],
					"translateX": [
						"0%",
						"0%"
					]
				},
				{
					"selector": ".isnteasy_6",
					"opacity": [
						1,
						0
					],
					"translateY": [
						"0%",
						"40%"
					],
					"translateX": [
						"0%",
						"0%"
					]
				},
				{
					"selector": ".isnteasy_7",
					"opacity": [
						1,
						0
					],
					"translateY": [
						"0%",
						"40%"
					],
					"translateX": [
						"0%",
						"0%"
					]
				},
				{
					"selector": ".isnteasy_8",
					"opacity": [
						1,
						0
					],
					"translateY": [
						"0%",
						"40%"
					],
					"translateX": [
						"0%",
						"-30%"
					]
				},
				{
					"selector": ".isnteasy_9",
					"opacity": [
						1,
						0
					],
					"translateY": [
						"0%",
						"-40%"
					],
					"translateX": [
						"0%",
						"-30%"
					]
				},
				{
					"selector": ".isnteasy_10",
					"opacity": [
						1,
						0
					],
					"translateY": [
						"0%",
						"-40%"
					],
					"translateX": [
						"0%",
						"0%"
					]
				},
				{
					"selector": ".isnteasy_11",
					"opacity": [
						1,
						0
					],
					"translateY": [
						"0%",
						"-40%"
					],
					"translateX": [
						"0%",
						"0%"
					]
				},
				{
					"selector": ".isnteasy_12",
					"opacity": [
						1,
						0
					],
					"translateY": [
						"0%",
						"-40%"
					],
					"translateX": [
						"0%",
						"0%"
					]
				}
			]
		},
		{
			"wrapper": "#itisnteasy",
			"duration": "80%",
			"animations": [
				{
					"selector": ".hidesource",
					"opacity": [
						1,
						0
					]
				},
				{
					"selector": ".display-4",
					"opacity": [
						1,
						0
					]
				},
				{
					"selector": ".trump",
					"translateX": [
						0,
						"-7%"
					],
					"scale": [
						1,
						2
					]
				}
			]
		},
		{
			"wrapper": "#itisnteasy",
			"duration": "100%",
			"focus": true,
			"animations": [
				{}
			]
		},
		{
			"wrapper": "#itisnteasy",
			"duration": "300%",
			"animations": [
				{
					"selector": ".trump",
					"translateX": [
						"-20%"
					],
					"opacity": [
						1,
						0
					]
				}
			]
		}
	];

/***/ },
/* 65 */
/***/ function(module, exports) {

	module.exports = [
		{
			"wrapper": "#itsgottoend",
			"duration": "100%",
			"focus": true,
			"animations": [
				{}
			]
		}
	];

/***/ },
/* 66 */
/***/ function(module, exports) {

	module.exports = [
		{
			"wrapper": "#iwantmyislamback1",
			"duration": "100%",
			"animations": [
				{
					"selector": ".display-4",
					"opacity": [
						2,
						2
					]
				}
			]
		},
		{
			"wrapper": "#iwantmyislamback1",
			"duration": "100%",
			"focus": true,
			"animations": [
				{
					"selector": ".display-4",
					"opacity": [
						2
					]
				}
			]
		},
		{
			"wrapper": "#iwantmyislamback1",
			"duration": "100%",
			"animations": [
				{
					"selector": ".display-4",
					"opacity": [
						2,
						0
					]
				}
			]
		}
	];

/***/ },
/* 67 */
/***/ function(module, exports) {

	module.exports = [
		{
			"wrapper": "#likepeace",
			"duration": "100%",
			"animations": [
				{
					"selector": ".display-4",
					"translateY": "30%"
				}
			]
		},
		{
			"wrapper": "#likepeace",
			"duration": "100%",
			"animations": [
				{
					"selector": ".first",
					"opacity": [
						0,
						1
					]
				}
			]
		},
		{
			"wrapper": "#likepeace",
			"duration": "100%",
			"animations": [
				{
					"selector": ".second",
					"opacity": [
						0,
						1
					]
				}
			]
		},
		{
			"wrapper": "#likepeace",
			"duration": "100%",
			"animations": [
				{
					"selector": ".third",
					"opacity": [
						0,
						1
					]
				}
			]
		},
		{
			"wrapper": "#likepeace",
			"duration": "50%",
			"animations": []
		},
		{
			"wrapper": "#likepeace",
			"duration": "100%",
			"animations": [
				{
					"selector": ".first",
					"opacity": 1
				},
				{
					"selector": ".second",
					"opacity": 1
				},
				{
					"selector": ".third",
					"opacity": 1
				},
				{
					"selector": ".fourth",
					"opacity": [
						-4,
						1
					]
				},
				{
					"selector": ".display-4",
					"translateY": [
						"30%",
						"0%"
					]
				}
			]
		},
		{
			"wrapper": "#likepeace",
			"duration": "200%",
			"animations": [
				{
					"selector": ".first",
					"opacity": 1
				},
				{
					"selector": ".second",
					"opacity": 1
				},
				{
					"selector": ".third",
					"opacity": 1
				},
				{
					"selector": ".fourth",
					"opacity": 1
				},
				{
					"selector": ".display-4",
					"translateY": "0%"
				}
			]
		},
		{
			"wrapper": "#likepeace",
			"duration": "100%",
			"focus": true,
			"animations": [
				{}
			]
		}
	];

/***/ },
/* 68 */
/***/ function(module, exports) {

	module.exports = [
		{
			"wrapper": "#mixedfeelings",
			"duration": "100%",
			"animations": [
				{
					"selector": ".display-4",
					"opacity": [
						0,
						1.25
					]
				}
			]
		},
		{
			"wrapper": "#mixedfeelings",
			"duration": "100%",
			"focus": true,
			"animations": [
				{}
			]
		},
		{
			"wrapper": "#mixedfeelings",
			"duration": "100%",
			"animations": [
				{
					"selector": ".display-4",
					"opacity": [
						2,
						0
					]
				}
			]
		}
	];

/***/ },
/* 69 */
/***/ function(module, exports) {

	module.exports = [
		{
			"wrapper": "#muslimsbelieveindividuallife",
			"duration": "100%",
			"animations": [
				{
					"selector": ".display-4",
					"opacity": [
						0,
						1
					]
				}
			]
		},
		{
			"wrapper": "#muslimsbelieveindividuallife",
			"duration": "100%",
			"focus": true,
			"animations": [
				{}
			]
		},
		{
			"wrapper": "#muslimsbelieveindividuallife",
			"duration": "100%",
			"animations": [
				{
					"selector": ".display-4",
					"opacity": [
						1,
						0
					]
				}
			]
		}
	];

/***/ },
/* 70 */
/***/ function(module, exports) {

	module.exports = [
		{
			"wrapper": "#outtogetyou",
			"duration": "100%",
			"animations": [
				{
					"selector": ".out-to-get-you",
					"opacity": [
						0,
						1
					]
				}
			]
		},
		{
			"wrapper": "#outtogetyou",
			"duration": "100%",
			"focus": true,
			"animations": [
				{}
			]
		},
		{
			"wrapper": "#outtogetyou",
			"duration": "100%",
			"animations": [
				{
					"selector": ".out-to-get-you",
					"opacity": [
						2,
						0
					]
				}
			]
		}
	];

/***/ },
/* 71 */
/***/ function(module, exports) {

	module.exports = [
		{
			"wrapper": "#reactionstoterror",
			"duration": "150%",
			"animations": [
				{}
			]
		},
		{
			"wrapper": "#reactionstoterror",
			"duration": "100%",
			"animations": [
				{
					"selector": ".anim-1",
					"opacity": [
						0,
						1
					],
					"translateY": [
						"-38%",
						"-38%"
					]
				}
			]
		},
		{
			"wrapper": "#reactionstoterror",
			"duration": "100%",
			"focus": true,
			"animations": [
				{}
			]
		},
		{
			"wrapper": "#reactionstoterror",
			"duration": "100%",
			"animations": [
				{
					"selector": ".anim-1",
					"opacity": [
						1,
						0
					],
					"translateY": [
						"-38%",
						"-38%"
					]
				}
			]
		}
	];

/***/ },
/* 72 */
/***/ function(module, exports) {

	module.exports = [
		{
			"wrapper": "#somethingtoprove",
			"duration": "100%",
			"animations": [
				{
					"selector": ".display-4",
					"opacity": [
						0,
						1
					]
				}
			]
		},
		{
			"wrapper": "#somethingtoprove",
			"duration": "100%",
			"focus": true,
			"animations": [
				{}
			]
		},
		{
			"wrapper": "#somethingtoprove",
			"duration": "100%",
			"animations": [
				{
					"selector": ".display-4",
					"opacity": [
						1,
						0
					]
				}
			]
		}
	];

/***/ },
/* 73 */
/***/ function(module, exports) {

	module.exports = [
		{
			"wrapper": "#wearecoming",
			"duration": "100%",
			"animations": [
				{
					"selector": ".display-4",
					"opacity": [
						0,
						1
					]
				}
			]
		},
		{
			"wrapper": "#wearecoming",
			"duration": "100%",
			"focus": true,
			"animations": [
				{}
			]
		},
		{
			"wrapper": "#wearecoming",
			"duration": "100%",
			"animations": [
				{
					"selector": ".display-4",
					"opacity": [
						2,
						0
					]
				}
			]
		}
	];

/***/ },
/* 74 */
/***/ function(module, exports) {

	module.exports = [
		{
			"wrapper": "#wearenotafraid",
			"duration": "100%",
			"animations": [
				{
					"selector": ".display-4",
					"opacity": [
						0,
						1
					]
				}
			]
		},
		{
			"wrapper": "#wearenotafraid",
			"duration": "100%",
			"focus": true,
			"animations": [
				{}
			]
		},
		{
			"wrapper": "#wearenotafraid",
			"duration": "100%",
			"animations": [
				{
					"selector": ".display-4",
					"opacity": [
						1,
						0
					]
				}
			]
		}
	];

/***/ },
/* 75 */
/***/ function(module, exports) {

	module.exports = [
		{
			"wrapper": "#wewillprotecteachother",
			"duration": "100%",
			"animations": [
				{
					"selector": ".premise",
					"translateY": [
						"25%",
						"0"
					],
					"opacity": [
						0,
						1.75
					]
				},
				{
					"selector": ".conclusion",
					"translateY": "25%",
					"opacity": [
						0,
						0
					]
				}
			]
		},
		{
			"wrapper": "#wewillprotecteachother",
			"duration": "50%",
			"animations": []
		},
		{
			"wrapper": "#wewillprotecteachother",
			"duration": "100%",
			"animations": [
				{
					"selector": ".conclusion",
					"translateY": [
						"25%",
						"0"
					],
					"opacity": [
						0,
						1
					]
				}
			]
		},
		{
			"wrapper": "#wewillprotecteachother",
			"duration": "100%",
			"focus": true,
			"animations": [
				{}
			]
		},
		{
			"wrapper": "#wewillprotecteachother",
			"duration": "100%",
			"animations": [
				{
					"selector": ".premise",
					"translateY": [
						"0",
						"-25%"
					],
					"opacity": [
						1,
						0
					]
				},
				{
					"selector": ".conclusion",
					"translateY": [
						"0",
						"-25%"
					],
					"opacity": [
						1,
						0
					]
				}
			]
		}
	];

/***/ },
/* 76 */
/***/ function(module, exports) {

	module.exports = [
		{
			"wrapper": "#whatislamichistoryprefers",
			"duration": "100%",
			"animations": [
				{
					"selector": ".display-4",
					"opacity": [
						0,
						1
					]
				}
			]
		},
		{
			"wrapper": "#whatislamichistoryprefers",
			"duration": "100%",
			"animations": [
				{
					"selector": ".display-4",
					"opacity": [
						1,
						1
					]
				},
				{
					"selector": ".islamic-inventions",
					"opacity": [
						0,
						1
					]
				}
			]
		},
		{
			"wrapper": "#whatislamichistoryprefers",
			"duration": "100%",
			"focus": true,
			"animations": [
				{}
			]
		},
		{
			"wrapper": "#whatislamichistoryprefers",
			"duration": "100%",
			"animations": [
				{
					"selector": ".display-4",
					"opacity": [
						1,
						0.5
					]
				},
				{
					"selector": ".islamic-inventions",
					"opacity": [
						1,
						0.5
					]
				}
			]
		},
		{
			"wrapper": "#whatislamichistoryprefers",
			"duration": "100%",
			"animations": [
				{
					"selector": ".display-4",
					"opacity": [
						0.5,
						0
					]
				},
				{
					"selector": ".islamic-inventions",
					"opacity": [
						0.5,
						0
					]
				}
			]
		}
	];

/***/ },
/* 77 */
/***/ function(module, exports) {

	module.exports = [
		{
			"wrapper": "#whatthequranprefers",
			"duration": "100%",
			"animations": [
				{
					"selector": ".display-4",
					"opacity": [
						1,
						0
					]
				}
			]
		}
	];

/***/ },
/* 78 */
/***/ function(module, exports) {

	module.exports = [
		{
			"wrapper": "#whoarethey",
			"duration": "100%",
			"animations": [
				{
					"selector": ".display-4",
					"opacity": [
						0,
						1
					]
				}
			]
		},
		{
			"wrapper": "#whoarethey",
			"duration": "100%",
			"focus": true,
			"animations": [
				{}
			]
		},
		{
			"wrapper": "#whoarethey",
			"duration": "100%",
			"animations": [
				{
					"selector": ".display-4",
					"opacity": [
						2,
						0
					]
				}
			]
		}
	];

/***/ },
/* 79 */
/***/ function(module, exports) {

	module.exports = [
		{
			"wrapper": "#withallthehatred",
			"duration": "100%",
			"animations": [
				{
					"selector": ".display-4",
					"opacity": [
						1,
						0
					]
				}
			]
		}
	];

/***/ },
/* 80 */
/***/ function(module, exports) {

	module.exports = [
		{
			"wrapper": "#yetthatsokay",
			"duration": "100%",
			"animations": [
				{
					"selector": ".display-4",
					"opacity": [
						0,
						1.25
					]
				}
			]
		},
		{
			"wrapper": "#yetthatsokay",
			"duration": "100%",
			"focus": true,
			"animations": [
				{}
			]
		},
		{
			"wrapper": "#yetthatsokay",
			"duration": "100%",
			"animations": [
				{
					"selector": ".display-4",
					"opacity": [
						2,
						0
					]
				}
			]
		}
	];

/***/ }
/******/ ]);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly8vd2VicGFjay9ib290c3RyYXAgNjczMTBkMzUxMzU1MGVhNWQzNjAiLCJ3ZWJwYWNrOi8vLy4vanMvZW50cnkuanMiLCJ3ZWJwYWNrOi8vLy4vc2NlbmUtbWFrZXIvaW5kZXguanMiLCJ3ZWJwYWNrOi8vLy4vc2NlbmUtbWFrZXIvb2Itc2NlbmUuanMiLCJ3ZWJwYWNrOi8vLy4vfi9rZWZpci9kaXN0L2tlZmlyLmpzIiwid2VicGFjazovLy8uL3NjZW5lLW1ha2VyL3JlbmRlci9hdWRpb3BsYXllci5qcyIsIndlYnBhY2s6Ly8vLi9zY2VuZS1tYWtlci9yZW5kZXIvbG9vcGVyLmpzIiwid2VicGFjazovLy8uL34vaG93bGVyL2hvd2xlci5qcyIsIndlYnBhY2s6Ly8vKHdlYnBhY2spL2J1aWxkaW4vYW1kLW9wdGlvbnMuanMiLCJ3ZWJwYWNrOi8vLy4vc2NlbmUtbWFrZXIvcmVuZGVyL3ZpZGVvcGxheWVyLmpzIiwid2VicGFjazovLy8uL3NjZW5lLW1ha2VyL3V0aWxzL3BhZ2UtdXRpbHMuanMiLCJ3ZWJwYWNrOi8vLy4vc2NlbmUtbWFrZXIvdXNlci9jb250cm9scy5qcyIsIndlYnBhY2s6Ly8vLi9zY2VuZS1tYWtlci9yZW5kZXIvaW5kZXguanMiLCJ3ZWJwYWNrOi8vLy4vc2NlbmUtbWFrZXIvcmVuZGVyL3Njcm9sbGJhci5qcyIsIndlYnBhY2s6Ly8vLi9zY2VuZS1tYWtlci91dGlscy9zY2VuZS11dGlscy5qcyIsIndlYnBhY2s6Ly8vLi9zY2VuZXMvaW5kZXguanNvbiIsIndlYnBhY2s6Ly8vXlxcLlxcLy4qXFwvc2NlbmVcXC5odG1sJCIsIndlYnBhY2s6Ly8vLi9zY2VuZXMvYWJvdXR5b3Vyc2VsZi9zY2VuZS5odG1sIiwid2VicGFjazovLy8uL3NjZW5lcy9iYXR0bGVvZmFnZW5lcmF0aW9uL3NjZW5lLmh0bWwiLCJ3ZWJwYWNrOi8vLy4vc2NlbmVzL2NvbXBsaWNhdGVkc2l0dWF0aW9uL3NjZW5lLmh0bWwiLCJ3ZWJwYWNrOi8vLy4vc2NlbmVzL2RpZmZlcmVudHByYWN0aWNlcy9zY2VuZS5odG1sIiwid2VicGFjazovLy8uL3NjZW5lcy9kb3lvdWZlZWxtdXNsaW0vc2NlbmUuaHRtbCIsIndlYnBhY2s6Ly8vLi9zY2VuZXMvZXhwbG9zaW9uL3NjZW5lLmh0bWwiLCJ3ZWJwYWNrOi8vLy4vc2NlbmVzL2ZlZWxpbmdjb25mdXNlZC9zY2VuZS5odG1sIiwid2VicGFjazovLy8uL3NjZW5lcy9pbnRyby9zY2VuZS5odG1sIiwid2VicGFjazovLy8uL3NjZW5lcy9pc2lzYWZ0ZXJsaWZlZmFsbGFjeS9zY2VuZS5odG1sIiwid2VicGFjazovLy8uL3NjZW5lcy9pc2lzYXBvY2FseXBzZW1pc3F1b3RlL3NjZW5lLmh0bWwiLCJ3ZWJwYWNrOi8vLy4vc2NlbmVzL2lzaXNiYW5rcnVwdC9zY2VuZS5odG1sIiwid2VicGFjazovLy8uL3NjZW5lcy9pc2lzZmlnaHRtaXNxdW90ZS9zY2VuZS5odG1sIiwid2VicGFjazovLy8uL3NjZW5lcy9pc2lzb2JqZWN0aXZlL3NjZW5lLmh0bWwiLCJ3ZWJwYWNrOi8vLy4vc2NlbmVzL2lzaXN3YW50c3RvZGl2aWRlL3NjZW5lLmh0bWwiLCJ3ZWJwYWNrOi8vLy4vc2NlbmVzL2l0aXNudGVhc3kvc2NlbmUuaHRtbCIsIndlYnBhY2s6Ly8vLi9zY2VuZXMvaXRzZ290dG9lbmQvc2NlbmUuaHRtbCIsIndlYnBhY2s6Ly8vLi9zY2VuZXMvaXdhbnRteWlzbGFtYmFjazEvc2NlbmUuaHRtbCIsIndlYnBhY2s6Ly8vLi9zY2VuZXMvbGlrZXBlYWNlL3NjZW5lLmh0bWwiLCJ3ZWJwYWNrOi8vLy4vc2NlbmVzL21peGVkZmVlbGluZ3Mvc2NlbmUuaHRtbCIsIndlYnBhY2s6Ly8vLi9zY2VuZXMvbXVzbGltc2JlbGlldmVpbmRpdmlkdWFsbGlmZS9zY2VuZS5odG1sIiwid2VicGFjazovLy8uL3NjZW5lcy9vdXR0b2dldHlvdS9zY2VuZS5odG1sIiwid2VicGFjazovLy8uL3NjZW5lcy9yZWFjdGlvbnN0b3RlcnJvci9zY2VuZS5odG1sIiwid2VicGFjazovLy8uL3NjZW5lcy9zb21ldGhpbmd0b3Byb3ZlL3NjZW5lLmh0bWwiLCJ3ZWJwYWNrOi8vLy4vc2NlbmVzL3dlYXJlY29taW5nL3NjZW5lLmh0bWwiLCJ3ZWJwYWNrOi8vLy4vc2NlbmVzL3dlYXJlbm90YWZyYWlkL3NjZW5lLmh0bWwiLCJ3ZWJwYWNrOi8vLy4vc2NlbmVzL3dld2lsbHByb3RlY3RlYWNob3RoZXIvc2NlbmUuaHRtbCIsIndlYnBhY2s6Ly8vLi9zY2VuZXMvd2hhdGlzbGFtaWNoaXN0b3J5cHJlZmVycy9zY2VuZS5odG1sIiwid2VicGFjazovLy8uL3NjZW5lcy93aGF0dGhlcXVyYW5wcmVmZXJzL3NjZW5lLmh0bWwiLCJ3ZWJwYWNrOi8vLy4vc2NlbmVzL3dob2FyZXRoZXkvc2NlbmUuaHRtbCIsIndlYnBhY2s6Ly8vLi9zY2VuZXMvd2l0aGFsbHRoZWhhdHJlZC9zY2VuZS5odG1sIiwid2VicGFjazovLy8uL3NjZW5lcy95ZXR0aGF0c29rYXkvc2NlbmUuaHRtbCIsIndlYnBhY2s6Ly8vXlxcLlxcLy4qXFwvc2NlbmVcXC5qc29uJCIsIndlYnBhY2s6Ly8vLi9zY2VuZXMvYWJvdXR5b3Vyc2VsZi9zY2VuZS5qc29uIiwid2VicGFjazovLy8uL3NjZW5lcy9iYXR0bGVvZmFnZW5lcmF0aW9uL3NjZW5lLmpzb24iLCJ3ZWJwYWNrOi8vLy4vc2NlbmVzL2NvbXBsaWNhdGVkc2l0dWF0aW9uL3NjZW5lLmpzb24iLCJ3ZWJwYWNrOi8vLy4vc2NlbmVzL2RpZmZlcmVudHByYWN0aWNlcy9zY2VuZS5qc29uIiwid2VicGFjazovLy8uL3NjZW5lcy9kb3lvdWZlZWxtdXNsaW0vc2NlbmUuanNvbiIsIndlYnBhY2s6Ly8vLi9zY2VuZXMvZXhwbG9zaW9uL3NjZW5lLmpzb24iLCJ3ZWJwYWNrOi8vLy4vc2NlbmVzL2ZlZWxpbmdjb25mdXNlZC9zY2VuZS5qc29uIiwid2VicGFjazovLy8uL3NjZW5lcy9pbnRyby9zY2VuZS5qc29uIiwid2VicGFjazovLy8uL3NjZW5lcy9pc2lzYWZ0ZXJsaWZlZmFsbGFjeS9zY2VuZS5qc29uIiwid2VicGFjazovLy8uL3NjZW5lcy9pc2lzYXBvY2FseXBzZW1pc3F1b3RlL3NjZW5lLmpzb24iLCJ3ZWJwYWNrOi8vLy4vc2NlbmVzL2lzaXNiYW5rcnVwdC9zY2VuZS5qc29uIiwid2VicGFjazovLy8uL3NjZW5lcy9pc2lzZmlnaHRtaXNxdW90ZS9zY2VuZS5qc29uIiwid2VicGFjazovLy8uL3NjZW5lcy9pc2lzb2JqZWN0aXZlL3NjZW5lLmpzb24iLCJ3ZWJwYWNrOi8vLy4vc2NlbmVzL2lzaXN3YW50c3RvZGl2aWRlL3NjZW5lLmpzb24iLCJ3ZWJwYWNrOi8vLy4vc2NlbmVzL2l0aXNudGVhc3kvc2NlbmUuanNvbiIsIndlYnBhY2s6Ly8vLi9zY2VuZXMvaXRzZ290dG9lbmQvc2NlbmUuanNvbiIsIndlYnBhY2s6Ly8vLi9zY2VuZXMvaXdhbnRteWlzbGFtYmFjazEvc2NlbmUuanNvbiIsIndlYnBhY2s6Ly8vLi9zY2VuZXMvbGlrZXBlYWNlL3NjZW5lLmpzb24iLCJ3ZWJwYWNrOi8vLy4vc2NlbmVzL21peGVkZmVlbGluZ3Mvc2NlbmUuanNvbiIsIndlYnBhY2s6Ly8vLi9zY2VuZXMvbXVzbGltc2JlbGlldmVpbmRpdmlkdWFsbGlmZS9zY2VuZS5qc29uIiwid2VicGFjazovLy8uL3NjZW5lcy9vdXR0b2dldHlvdS9zY2VuZS5qc29uIiwid2VicGFjazovLy8uL3NjZW5lcy9yZWFjdGlvbnN0b3RlcnJvci9zY2VuZS5qc29uIiwid2VicGFjazovLy8uL3NjZW5lcy9zb21ldGhpbmd0b3Byb3ZlL3NjZW5lLmpzb24iLCJ3ZWJwYWNrOi8vLy4vc2NlbmVzL3dlYXJlY29taW5nL3NjZW5lLmpzb24iLCJ3ZWJwYWNrOi8vLy4vc2NlbmVzL3dlYXJlbm90YWZyYWlkL3NjZW5lLmpzb24iLCJ3ZWJwYWNrOi8vLy4vc2NlbmVzL3dld2lsbHByb3RlY3RlYWNob3RoZXIvc2NlbmUuanNvbiIsIndlYnBhY2s6Ly8vLi9zY2VuZXMvd2hhdGlzbGFtaWNoaXN0b3J5cHJlZmVycy9zY2VuZS5qc29uIiwid2VicGFjazovLy8uL3NjZW5lcy93aGF0dGhlcXVyYW5wcmVmZXJzL3NjZW5lLmpzb24iLCJ3ZWJwYWNrOi8vLy4vc2NlbmVzL3dob2FyZXRoZXkvc2NlbmUuanNvbiIsIndlYnBhY2s6Ly8vLi9zY2VuZXMvd2l0aGFsbHRoZWhhdHJlZC9zY2VuZS5qc29uIiwid2VicGFjazovLy8uL3NjZW5lcy95ZXR0aGF0c29rYXkvc2NlbmUuanNvbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0EsdUJBQWU7QUFDZjtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7O0FBR0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTs7Ozs7OztBQ3RDQTs7Ozs7OztBQ0FBOztBQUVBLEtBQU0sVUFBVSxvQkFBUSxDQUFSLENBQVY7QUFDTixLQUFNLFdBQVcsb0JBQVEsRUFBUixDQUFYO0FBQ04sS0FBTSxTQUFTLG9CQUFRLEVBQVIsQ0FBVDs7QUFFTixLQUFNLGFBQWEsb0JBQVEsRUFBUixDQUFiO0FBQ04sS0FBTSxjQUFjLG9CQUFRLENBQVIsQ0FBZDs7QUFFTixLQUFNLGtCQUFrQixXQUFXLFVBQVgsRUFBbEI7QUFDTixLQUFNLGlCQUFpQixXQUFXLFNBQVgsRUFBakI7QUFDTixLQUFJLG1CQUFvQixXQUFXLGNBQVgsRUFBcEI7O0FBRUosYUFBWSxNQUFaLENBQW1CLGdCQUFuQjs7QUFFQSxHQUFFLFlBQVc7QUFDTCxVQURLO0VBQVgsQ0FBRjs7QUFJQSxVQUFTLElBQVQsR0FBZ0I7O0FBRWQsUUFBSyxFQUFMLENBQVEsTUFBUixFQUFnQixVQUFDLENBQUQsRUFBTzs7QUFFckIsU0FBSSxLQUFLLFVBQVUsU0FBVixDQUZZO0FBR3JCLFNBQUksZUFBSixFQUFxQjtBQUNuQixTQUFFLGNB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QTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBLFdBQVU7QUFDVjtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQSxlQUFjLHNDQUFzQyxFQUFFLDRCQUE0QixFQUFFO0FBQ3BGO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQSxnQkFBZTtBQUNmO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQSxnQkFBZTtBQUNmO0FBQ0E7QUFD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QUFDQSxLQUFJOztBQUVKO0FBQ0E7QUFDQTtBQUNBOztBQUVBLEdBQUU7O0FBRUY7QUFDQSx3QkFBdUIsU0FBUztBQUNoQzs7QUFFQSxRQUFPO0FBQ1A7QUFDQTs7QUFFQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQSxZQUFXO0FBQ1g7O0FBRUEsUUFBTztBQUNQO0FBQ0E7O0FBRUE7O0FBRUE7O0FBRUE7O0FBRUE7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSxTQUFRO0FBQ1I7QUFDQTtBQUNBLEtBQUk7QUFDSjs7QUFFQSxRQUFPO0FBQ1A7QUFDQTs7QUFFQTs7QUFFQTs7QUFFQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFJOztBQUVKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFJOztBQUVKO0FBQ0E7QUFDQSxLQUFJOztBQUVKO0FBQ0E7QUFDQTtBQUNBOztBQUVBLEdBQUU7O0FBRUY7QUFDQTtBQUNBOztBQUVBLFFBQU87QUFDUDtBQUNBOztBQUVBOztBQUVBOztBQUVBOztBQUVBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsV0FBVTtBQUNWO0FBQ0E7QUFDQTtBQUNBLFNBQVE7QUFDUjtBQUNBO0FBQ0EsS0FBSTtBQUNKOztBQUVBLFFBQU87QUFDUDtBQUNBOztBQUVBOztBQUVBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQSxtQkFBa0Isa0JBQWtCO0FBQ3BDO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBLEtBQUk7QUFDSjtBQUNBLEtBQUk7QUFDSjs7QUFFQSxRQUFPO0FBQ1A7QUFDQTs7QUFFQTs7QUFFQTs7QUFFQTs7QUFFQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQSxPQUFNO0FBQ047QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUk7QUFDSjs7QUFFQSxRQUFPO0FBQ1A7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSTtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUEsb0JBQW1COztBQUVuQixRQUFPO0FBQ1A7QUFDQTs7QUFFQTs7QUFFQTs7QUFFQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBLDBCQUF5QjtBQUN6Qjs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUU7O0FBRUY7QUFDQTtBQUNBOztBQUVBLFFBQU87QUFDUDtBQUNBOztBQUVBOztBQUVBOztBQUVBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0EsMEJBQXlCO0FBQ3pCOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRTs7QUFFRjtBQUNBO0FBQ0E7O0FBRUEsUUFBTztBQUNQO0FBQ0E7O0FBRUE7O0FBRUE7O0FBRUE7O0FBRUE7O0FBRUE7QUFDQTs7QUFFQTtBQUNBLEtBQUk7O0FBRUo7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLDJDQUEwQztBQUMxQzs7QUFFQSxHQUFFOztBQUVGO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsdUJBQXNCLFNBQVM7QUFDL0I7O0FBRUEsUUFBTztBQUNQO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTs7QUFFQTs7QUFFQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBLGdDQUErQjtBQUMvQixnQ0FBK0I7O0FBRS9CO0FBQ0E7QUFDQSxPQUFNO0FBQ047QUFDQTtBQUNBLE9BQU07QUFDTjtBQUNBO0FBQ0EsT0FBTTs7QUFFTjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxPQUFNOztBQUVOO0FBQ0E7QUFDQSxPQUFNO0FBQ047QUFDQTtBQUNBLE9BQU07O0FBRU47QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBLG9CQUFtQjs7QUFFbkIsUUFBTztBQUNQO0FBQ0E7O0FBRUE7O0FBRUE7O0FBRUE7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFJOztBQUVKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUEsR0FBRTs7QUFFRjtBQUNBO0FBQ0E7O0FBRUEsUUFBTztBQUNQO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTs7QUFFQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQSxLQUFJOztBQUVKO0FBQ0E7O0FBRUEsUUFBTztBQUNQO0FBQ0E7O0FBRUE7O0FBRUE7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxLQUFJO0FBQ0o7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsU0FBUTtBQUNSO0FBQ0E7QUFDQSxPQUFNO0FBQ04sS0FBSTtBQUNKOztBQUVBLFFBQU87QUFDUDtBQUNBOztBQUVBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxTQUFRO0FBQ1I7QUFDQTtBQUNBLFNBQVE7QUFDUjtBQUNBO0FBQ0E7QUFDQSxPQUFNOztBQUVOO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsT0FBTTtBQUNOO0FBQ0E7QUFDQSxLQUFJO0FBQ0o7O0FBRUEsUUFBTztBQUNQO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsS0FBSTtBQUNKO0FBQ0EsS0FBSTtBQUNKO0FBQ0E7QUFDQTs7QUFFQSxRQUFPO0FBQ1A7QUFDQTs7QUFFQTs7QUFFQTs7QUFFQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxTQUFRO0FBQ1I7QUFDQSxTQUFRO0FBQ1I7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFFOztBQUVGO0FBQ0E7QUFDQTs7QUFFQSxRQUFPO0FBQ1A7QUFDQTs7QUFFQTs7QUFFQTs7QUFFQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQSxLQUFJOztBQUVKO0FBQ0E7QUFDQSxLQUFJOztBQUVKO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUEsNkNBQTRDLFNBQVM7QUFDckQ7O0FBRUEsUUFBTztBQUNQO0FBQ0E7O0FBRUE7O0FBRUE7O0FBRUE7QUFDQTs7QUFFQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0EsS0FBSTs7QUFFSjtBQUNBO0FBQ0EsS0FBSTs7QUFFSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQSw2Q0FBNEMsU0FBUztBQUNyRDs7QUFFQSxRQUFPO0FBQ1A7QUFDQTs7QUFFQTs7QUFFQTs7QUFFQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFJOztBQUVKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQSw2Q0FBNEMsT0FBTztBQUNuRDs7QUFFQSxRQUFPO0FBQ1A7QUFDQTs7QUFFQTs7QUFFQTs7QUFFQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFJOztBQUVKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQSw2Q0FBNEMsT0FBTztBQUNuRDs7QUFFQSxRQUFPO0FBQ1A7QUFDQTs7QUFFQTs7QUFFQTs7QUFFQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQSxLQUFJOztBQUVKO0FBQ0E7QUFDQSxLQUFJOztBQUVKO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsT0FBTTtBQUNOO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBLDZDQUE0QyxTQUFTO0FBQ3JEOztBQUVBLFFBQU87QUFDUDtBQUNBOztBQUVBOztBQUVBOztBQUVBO0FBQ0E7O0FBRUE7O0FBRUE7O0FBRUE7O0FBRUE7QUFDQTtBQUNBLEtBQUk7O0FBRUo7QUFDQTtBQUNBLEtBQUk7O0FBRUo7QUFDQTtBQUNBLEtBQUk7O0FBRUo7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBLFFBQU87QUFDUDtBQUNBOztBQUVBOztBQUVBOztBQUVBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTs7QUFFQTtBQUNBLEtBQUk7O0FBRUo7QUFDQTtBQUNBO0FBQ0EsT0FBTTtBQUNOO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0EsNkNBQTRDLE9BQU87QUFDbkQ7O0FBRUEsUUFBTztBQUNQO0FBQ0E7O0FBRUE7O0FBRUE7O0FBRUE7QUFDQTs7QUFFQTs7QUFFQTtBQUNBOztB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Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBLDZDQUE0QyxTQUFTO0FBQ3JEOztBQUVBLFFBQU87QUFDUDtBQUNBOztBQUVBOztBQUVBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBLFFBQU87QUFDUDtBQUNBOztBQUVBOztBQUVBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBLFFBQU87QUFDUDtBQUNBOztBQUVBOztBQUVBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBLFFBQU87QUFDUDtBQUNBOztBQUVBOztBQUVBOztBQUVBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTs7QUFFQTtBQUNBLEtBQUk7O0FBRUo7QUFDQTtBQUNBLEtBQUk7O0FBRUo7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0EsNkNBQTRDLFNBQVM7QUFDckQ7O0FBRUEsUUFBTztBQUNQO0FBQ0E7O0FBRUE7O0FBRUE7O0FBRUE7QUFDQTs7QUFFQTs7QUFFQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsS0FBSTs7QUFFSjtBQUNBO0FBQ0EsS0FBSTs7QUFFSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTs7QUFFQTtBQUNBOztBQUVBLDZDQUE0QyxxQkFBcUI7QUFDakU7O0FBRUEsUUFBTztBQUNQO0FBQ0E7O0FBRUE7O0FBRUE7O0FBRUE7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsS0FBSTs7QUFFSjtBQUNBO0FBQ0EsS0FBSTs7QUFFSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSTs7QUFFSjtBQUNBO0FBQ0E7QUFD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Q0EsS0FBSTs7QUFFSjtBQUNBLHFCQUFvQiwwQkFBMEI7QUFDOUM7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUk7O0FBRUo7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFJOztBQUVKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBLEdBQUU7O0FBRUY7QUFDQTtBQUNBOztBQUVBLFFBQU87QUFDUDtBQUNBOztBQUVBOztBQUVBOztBQUVBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBLEdBQUU7O0FBRUY7QUFDQTtBQUNBOztBQUVBLFFBQU87QUFDUDtBQUNBOztBQUVBOztBQUVBOztBQUVBOztBQUVBO0FBQ0E7O0FBRUE7O0FBRUE7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBLHVFQUFzRTs7QUFFdEU7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsT0FBTTtBQUNOO0FBQ0E7QUFDQSxTQUFRO0FBQ1I7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFJOztBQUVKO0FBQ0E7O0FBRUE7QUFDQTtBQUNBLE9BQU07QUFDTixLQUFJOztBQUVKO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSTs7QUFFSjtBQUNBO0FBQ0EsS0FBSTs7QUFFSjtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBLHNEQUFxRCxXQUFXLFVBQVU7QUFDMUU7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsT0FBTTtBQUNOO0FBQ0E7QUFDQSxLQUFJOztBQUVKO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsK0JBQThCLDJCQUEyQjtBQUN6RDtBQUNBLEtBQUk7O0FBRUo7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUk7O0FBRUo7QUFDQTs7QUFFQTtBQUNBO0FBQ0EsT0FBTTtBQUNOO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSTs7QUFFSjtBQUNBO0FBQ0E7QUFDQSxPQUFNO0FBQ047QUFDQTtBQUNBLEtBQUk7O0FBRUo7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFJOztBQUVKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFNBQVE7QUFDUjtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUk7O0FBRUo7QUFDQTtBQUNBLEtBQUk7O0FBRUo7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUk7O0FBRUo7QUFDQSxpREFBZ0Qsb0NBQW9DO0FBQ3BGO0FBQ0E7QUFDQSxLQUFJOztBQUVKO0FBQ0EsaURBQWdELG9CQUFvQjtBQUNwRTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSTs7QUFFSjtBQUNBO0FBQ0EsS0FBSTs7QUFFSixvQ0FBbUM7O0FBRW5DO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBLEdBQUU7O0FBRUY7O0FBRUEsUUFBTztBQUNQO0FBQ0E7O0FBRUE7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsS0FBSTtBQUNKOztBQUVBLFFBQU87QUFDUDtBQUNBOztBQUVBOztBQUVBOztBQUVBOztBQUVBOztBQUVBOztBQUVBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsT0FBTTtBQUNOO0FBQ0E7QUFDQSxLQUFJOztBQUVKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxXQUFVO0FBQ1Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUk7O0FBRUo7QUFDQTtBQUNBO0FBQ0EsT0FBTTtBQUNOO0FBQ0E7QUFDQSxLQUFJOztBQUVKO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSTs7QUFFSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUEsR0FBRTs7QUFFRjtBQUNBO0FBQ0E7O0FBRUEsUUFBTztBQUNQO0FBQ0E7O0FBRUE7O0FBRUE7O0FBRUE7O0FBRUE7O0FBRUE7QUFDQTtBQUNBOztBQUVBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLEtBQUk7O0FBRUo7QUFDQTtBQUNBO0FBQ0E7O0FBRUEsR0FBRTs7QUFFRjs7QUFFQSxRQUFPO0FBQ1A7QUFDQTs7QUFFQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7O0FBRUE7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUk7O0FBRUo7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFJOztBQUVKOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsU0FBUTtBQUNSO0FBQ0E7QUFDQTtBQUNBLEtBQUk7O0FBRUo7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFJOztBQUVKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQSxHQUFFOztBQUVGOztBQUVBLFFBQU87QUFDUDtBQUNBOztBQUVBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxTQUFRO0FBQ1I7QUFDQTtBQUNBO0FBQ0E7O0FBRUEsR0FBRTs7QUFFRjs7QUFFQSxRQUFPO0FBQ1A7QUFDQTs7QUFFQTs7QUFFQTs7QUFFQTtBQUNBOztBQUVBOztBQUVBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSTs7QUFFSjtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBLFFBQU87QUFDUDtBQUNBOztBQUVBOztBQUVBO0FBQ0E7O0FBRUE7O0FBRUE7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBLGdDQUErQjtBQUMvQixnQ0FBK0I7O0FBRS9CO0FBQ0E7QUFDQSxPQUFNO0FBQ047QUFDQTtBQUNBLE9BQU07QUFDTjtBQUNBO0FBQ0EsT0FBTTs7QUFFTjtBQUNBO0FBQ0EsT0FBTTtBQUNOO0FBQ0E7QUFDQSxPQUFNO0FBQ04sNERBQTJEOztBQUUzRDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxPQUFNO0FBQ047QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxPQUFNOztBQUVOO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLE9BQU07O0FBRU47QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxPQUFNO0FBQ047QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLE9BQU07O0FBRU47QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBLG9CQUFtQjs7QUFFbkIsUUFBTztBQUNQO0FBQ0E7O0FBRUE7O0FBRUE7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLEtBQUk7QUFDSjtBQUNBOztBQUVBLFFBQU87QUFDUDtBQUNBOztBQUVBOztBQUVBOztBQUVBO0FBQ0E7O0FBRUE7O0FBRUE7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFJOztBQUVKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUEsUUFBTztBQUNQO0FBQ0E7O0FBRUE7O0FBRUE7O0FBRUE7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUEsUUFBTztBQUNQO0FBQ0E7O0FBRUE7O0FBRUE7O0FBRUE7QUFDQTs7QUFFQTs7QUFFQTtBQUNBLHlFQUF3RTs7QUFFeEU7QUFDQTs7QUFFQTtBQUNBO0FBQ0EsS0FBSTs7QUFFSjtBQUNBO0FBQ0EsS0FBSTs7QUFFSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSTs7QUFFSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSTs7QUFFSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSTs7QUFFSjtBQUNBO0FBQ0EsS0FBSTs7QUFFSjtBQUNBO0FBQ0EsS0FBSTs7QUFFSjtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBLFFBQU87QUFDUDtBQUNBOztBQUVBOztBQUVBOztBQUVBO0FBQ0E7O0FBRUE7O0FBRUE7O0FBRUE7O0FBRUE7QUFDQSx5RUFBd0U7O0FBRXhFO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLEtBQUk7O0FBRUo7QUFDQTtBQUNBLEtBQUk7O0FBRUo7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUk7O0FBRUo7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUk7O0FBRUo7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUk7O0FBRUo7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFJOztBQUVKO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQSxRQUFPO0FBQ1A7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBLFFBQU87QUFDUDtBQUNBOztBQUVBOztBQUVBOztBQUVBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTs7QUFFQTtBQUNBLEtBQUk7O0FBRUo7QUFDQTtBQUNBLEtBQUk7O0FBRUo7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLE9BQU07QUFDTjtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTs7QUFFQTtBQUNBLFlBQVc7QUFDWDs7QUFFQTtBQUNBOztBQUVBLDZDQUE0QyxTQUFTO0FBQ3JEOztBQUVBLFFBQU87QUFDUDtBQUNBOztBQUVBOztBQUVBOztBQUVBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTs7QUFFQTtBQUNBLEtBQUk7O0FBRUo7QUFDQTtBQUNBLEtBQUk7O0FBRUo7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLE9BQU07QUFDTjtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTs7QUFFQTtBQUNBLFlBQVc7QUFDWDs7QUFFQTtBQUNBOztBQUVBLDZDQUE0QyxTQUFTO0FBQ3JEOztBQUVBLFFBQU87QUFDUDtBQUNBOztBQUVBOztBQUVBOztBQUVBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBLEVBQUM7QUFDRCxFOzs7Ozs7OztBQ2p0SkEsS0FBTSxTQUFT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O0FBQ0E7QUFDQSxHQUFFO0FBQ0Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRTtBQUNGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUU7QUFDRjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFFO0FBQ0Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRTtBQUNGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUU7QUFDRjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFFO0FBQ0Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRTtBQUNGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUU7QUFDRjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFFO0FBQ0Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRTtBQUNGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUU7QUFDRjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFFO0FBQ0Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRTtBQUNGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUU7QUFDRjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFFO0FBQ0Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRTtBQUNGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUU7QUFDRjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFFO0FBQ0Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHOzs7Ozs7QUM5TEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtB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O0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHOzs7Ozs7QUNuQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFFO0FBQ0Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFFO0FBQ0Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHOzs7Ozs7QUNuQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFFO0FBQ0Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFFO0FBQ0Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFJO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsRzs7Ozs7O0FDMUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRTtBQUNGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRTtBQUNGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsRzs7Ozs7O0FDbkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRTtBQUNGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRTtBQUNGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHOzs7Ozs7QUNwQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSTtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUU7QUFDRjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUk7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSTtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUk7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFJO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSTtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUk7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFJO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSTtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUk7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSTtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUk7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFJO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSTtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUk7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFJO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUU7QUFDRjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsRzs7Ozs7O0FDNU1BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRTtBQUNGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRTtBQUNGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsRzs7Ozs7O0FDbkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEc7Ozs7OztBQ2ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUk7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUk7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUk7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFFO0FBQ0Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFFO0FBQ0Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUk7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUk7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFJO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUU7QUFDRjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUU7QUFDRjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFFO0FBQ0Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUk7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUk7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUk7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEc7Ozs7OztBQzdKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFJO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFJO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRTtBQUNGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRTtBQUNGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFJO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSTtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFFO0FBQ0Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFFO0FBQ0Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRTtBQUNGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFJO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFJO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHOzs7Ozs7QUMvSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFFO0FBQ0Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSTtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFFO0FBQ0Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUU7QUFDRjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRTtBQUNGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFFO0FBQ0Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUU7QUFDRjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRTtBQUNGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUk7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSTtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUk7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFJO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSTtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUk7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRTtBQUNGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRTtBQUNGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSTtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFFO0FBQ0Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFJO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsRzs7Ozs7O0FDOVBBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUk7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUk7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFFO0FBQ0Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFFO0FBQ0Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUk7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUk7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFJO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUU7QUFDRjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUU7QUFDRjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFFO0FBQ0Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUk7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEc7Ozs7OztBQy9IQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsRzs7Ozs7O0FDZEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUk7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRTtBQUNGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRTtBQUNGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSTtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFFO0FBQ0Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFFO0FBQ0Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUk7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEc7Ozs7OztBQ3JGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUk7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRTtBQUNGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFFO0FBQ0Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUU7QUFDRjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRTtBQUNGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFFO0FBQ0Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUU7QUFDRjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRTtBQUNGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFFO0FBQ0Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUU7QUFDRjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRTtBQUNGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFFO0FBQ0Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUU7QUFDRjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRTtBQUNGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUk7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSTtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFJO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUk7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSTtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFJO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUk7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSTtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFJO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUk7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSTtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFJO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFFO0FBQ0Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFJO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSTtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUU7QUFDRjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUU7QUFDRjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEc7Ozs7OztBQzFnQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsRzs7Ozs7O0FDVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFFO0FBQ0Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRTtBQUNGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsRzs7Ozs7O0FDeENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRTtBQUNGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUU7QUFDRjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFFO0FBQ0Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRTtBQUNGO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRTtBQUNGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSTtBQUNKO0FBQ0E7QUFDQTtBQUNBLEtBQUk7QUFDSjtBQUNBO0FBQ0E7QUFDQSxLQUFJO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSTtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFFO0FBQ0Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFJO0FBQ0o7QUFDQTtBQUNBO0FBQ0EsS0FBSTtBQUNKO0FBQ0E7QUFDQTtBQUNBLEtBQUk7QUFDSjtBQUNBO0FBQ0E7QUFDQSxLQUFJO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUU7QUFDRjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsRzs7Ozs7O0FDekhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRTtBQUNGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRTtBQUNGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsRzs7Ozs7O0FDbkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRTtBQUNGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRTtBQUNGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsRzs7Ozs7O0FDbkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRTtBQUNGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRTtBQUNGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsRzs7Ozs7O0FDbkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRTtBQUNGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRTtBQUNGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRTtBQUNGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHOzs7Ozs7QUNsREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFFO0FBQ0Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFFO0FBQ0Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHOzs7Ozs7QUNuQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFFO0FBQ0Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFFO0FBQ0Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHOzs7Ozs7QUNuQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFFO0FBQ0Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFFO0FBQ0Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHOzs7Ozs7QUNuQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSTtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUU7QUFDRjtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUU7QUFDRjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUU7QUFDRjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUU7QUFDRjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSTtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsRzs7Ozs7O0FDcEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRTtBQUNGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSTtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFFO0FBQ0Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFFO0FBQ0Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFJO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUU7QUFDRjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUk7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHOzs7Ozs7QUNsRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEc7Ozs7OztBQ2RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRTtBQUNGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRTtBQUNGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsRzs7Ozs7O0FDbkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHOzs7Ozs7QUNkQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUU7QUFDRjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUU7QUFDRjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEciLCJmaWxlIjoiYnVpbGQuanMiLCJzb3VyY2VzQ29udGVudCI6WyIgXHQvLyBUaGUgbW9kdWxlIGNhY2hlXG4gXHR2YXIgaW5zdGFsbGVkTW9kdWxlcyA9IHt9O1xuXG4gXHQvLyBUaGUgcmVxdWlyZSBmdW5jdGlvblxuIFx0ZnVuY3Rpb24gX193ZWJwYWNrX3JlcXVpcmVfXyhtb2R1bGVJZCkge1xuXG4gXHRcdC8vIENoZWNrIGlmIG1vZHVsZSBpcyBpbiBjYWNoZVxuIFx0XHRpZihpbnN0YWxsZWRNb2R1bGVzW21vZHVsZUlkXSlcbiBcdFx0XHRyZXR1cm4gaW5zdGFsbGVkTW9kdWxlc1ttb2R1bGVJZF0uZXhwb3J0cztcblxuIFx0XHQvLyBDcmVhdGUgYSBuZXcgbW9kdWxlIChhbmQgcHV0IGl0IGludG8gdGhlIGNhY2hlKVxuIFx0XHR2YXIgbW9kdWxlID0gaW5zdGFsbGVkTW9kdWxlc1ttb2R1bGVJZF0gPSB7XG4gXHRcdFx0ZXhwb3J0czoge30sXG4gXHRcdFx0aWQ6IG1vZHVsZUlkLFxuIFx0XHRcdGxvYWRlZDogZmFsc2VcbiBcdFx0fTtcblxuIFx0XHQvLyBFeGVjdXRlIHRoZSBtb2R1bGUgZnVuY3Rpb25cbiBcdFx0bW9kdWxlc1ttb2R1bGVJZF0uY2FsbChtb2R1bGUuZXhwb3J0cywgbW9kdWxlLCBtb2R1bGUuZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXyk7XG5cbiBcdFx0Ly8gRmxhZyB0aGUgbW9kdWxlIGFzIGxvYWRlZFxuIFx0XHRtb2R1bGUubG9hZGVkID0gdHJ1ZTtcblxuIFx0XHQvLyBSZXR1cm4gdGhlIGV4cG9ydHMgb2YgdGhlIG1vZHVsZVxuIFx0XHRyZXR1cm4gbW9kdWxlLmV4cG9ydHM7XG4gXHR9XG5cblxuIFx0Ly8gZXhwb3NlIHRoZSBtb2R1bGVzIG9iamVjdCAoX193ZWJwYWNrX21vZHVsZXNfXylcbiBcdF9fd2VicGFja19yZXF1aXJlX18ubSA9IG1vZHVsZXM7XG5cbiBcdC8vIGV4cG9zZSB0aGUgbW9kdWxlIGNhY2hlXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLmMgPSBpbnN0YWxsZWRNb2R1bGVzO1xuXG4gXHQvLyBfX3dlYnBhY2tfcHVibGljX3BhdGhfX1xuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5wID0gXCJcIjtcblxuIFx0Ly8gTG9hZCBlbnRyeSBtb2R1bGUgYW5kIHJldHVybiBleHBvcnRzXG4gXHRyZXR1cm4gX193ZWJwYWNrX3JlcXVpcmVfXygwKTtcblxuXG5cbi8qKiBXRUJQQUNLIEZPT1RFUiAqKlxuICoqIHdlYnBhY2svYm9vdHN0cmFwIDY3MzEwZDM1MTM1NTBlYTVkMzYwXG4gKiovIiwicmVxdWlyZSgnLi4vc2NlbmUtbWFrZXIvaW5kZXguanMnKTtcblxuXG5cbi8qKioqKioqKioqKioqKioqKlxuICoqIFdFQlBBQ0sgRk9PVEVSXG4gKiogLi9qcy9lbnRyeS5qc1xuICoqIG1vZHVsZSBpZCA9IDBcbiAqKiBtb2R1bGUgY2h1bmtzID0gMFxuICoqLyIsIid1c2Ugc3RyaWN0JztcblxuY29uc3Qgb2JzY2VuZSA9IHJlcXVpcmUoJy4vb2Itc2NlbmUuanMnKTtcbmNvbnN0IGNvbnRyb2xzID0gcmVxdWlyZSgnLi91c2VyL2NvbnRyb2xzLmpzJyk7XG5jb25zdCByZW5kZXIgPSByZXF1aXJlKCcuL3JlbmRlci9pbmRleC5qcycpO1xuXG5jb25zdCBzY2VuZVV0aWxzID0gcmVxdWlyZSgnLi91dGlscy9zY2VuZS11dGlscy5qcycpO1xuY29uc3QgYXVkaW9wbGF5ZXIgPSByZXF1aXJlKCcuL3JlbmRlci9hdWRpb3BsYXllci5qcycpO1xuXG5jb25zdCBzY2VuZUh0bWxTdHJpbmcgPSBzY2VuZVV0aWxzLnJlbmRlckhUTUwoKTtcbmNvbnN0IHNjZW5lTW90aW9uTWFwID0gc2NlbmVVdGlscy5nZXRTY2VuZXMoKTtcbmxldCBzY2VuZUF1ZGlvQ29uZmlnID0gIHNjZW5lVXRpbHMuZ2V0QXVkaW9Db25maWcoKTtcblxuYXVkaW9wbGF5ZXIuY29uZmlnKHNjZW5lQXVkaW9Db25maWcpO1xuXG4kKGZ1bmN0aW9uKCkge1xuICAgICAgICBpbml0KCk7XG59KTtcblxuZnVuY3Rpb24gaW5pdCgpIHtcblxuICBQYWNlLm9uKCdkb25lJywgKGUpID0+IHtcblxuICAgIHZhciB1YSA9IG5hdmlnYXRvci51c2VyQWdlbnQ7XG4gICAgaWYgKGlzVG91Y2hEZXZpY2UoKSkge1xuICAgICAgJCgnI3Vuc3VwcG9ydGVkJykuc2hvdygpO1xuICAgICAgJChcIi5jb250YWluZXJcIikuaGlkZSgpO1xuICAgICAgJChcIi5sb2FkaW5nXCIpLmhpZGUoKTtcblxuICAgIH1cbiAgICBlbHNlIHtcblxuICAgICAgJCgnLmNvbnRhaW5lci1pbm5lcicpLmh0bWwoc2NlbmVIdG1sU3RyaW5nKVxuXG4gICAgICBvYnNjZW5lLmluaXQoc2NlbmVNb3Rpb25NYXApXG4gICAgICBjb250cm9scy5pbml0KClcblxuICAgICAgJCgnLmxvYWRpbmcnKS5kZWxheSgzMDApLmZhZGVPdXQoKVxuICAgICAgYXVkaW9wbGF5ZXIubmV4dCgnaW50cm8nKTtcbiAgICAgIGF1ZGlvcGxheWVyLnBsYXkoKTtcblxuXG4gICAgfVxuXG4gIH0pXG5cbn1cblxuZnVuY3Rpb24gaXNUb3VjaERldmljZSgpIHtcbiAgcmV0dXJuICdvbnRvdWNoc3RhcnQnIGluIHdpbmRvdyAvLyB3b3JrcyBvbiBtb3N0IGJyb3dzZXJzXG4gICAgfHwgJ29ubXNnZXN0dXJlY2hhbmdlJyBpbiB3aW5kb3cgLy8gd29ya3Mgb24gaWUxMFxufVxuXG5cblxuLyoqIFdFQlBBQ0sgRk9PVEVSICoqXG4gKiogLi9zY2VuZS1tYWtlci9pbmRleC5qc1xuICoqLyIsIi8qXG4gKiAgRGVwZW5kZW5jaWVzXG4qL1xuXG4gIGNvbnN0IEtlZmlyID0gcmVxdWlyZSgna2VmaXInKVxuXG4gIGNvbnN0IGF1ZGlvcGxheWVyID0gcmVxdWlyZSgnLi9yZW5kZXIvYXVkaW9wbGF5ZXIuanMnKVxuICBjb25zdCB2aWRlb1BsYXllciA9IHJlcXVpcmUoJy4vcmVuZGVyL3ZpZGVvcGxheWVyLmpzJylcblxuICBjb25zdCBwYWdlVXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzL3BhZ2UtdXRpbHMuanMnKVxuXG4vKlxuICogIEdsb2JhbHNcbiovXG5cbiAgY29uc3QgUFJPUEVSVElFUyA9IFsndHJhbnNsYXRlWCcsICd0cmFuc2xhdGVZJywgJ29wYWNpdHknLCAncm90YXRlJywgJ3NjYWxlJ11cbiAgY29uc3QgQU5JTUFUSU9OX1RJTUUgPSA0MVxuXG4gIGNvbnN0ICR3aW5kb3cgPSAkKHdpbmRvdylcbiAgY29uc3QgJGJvZHlodG1sID0gJCgnYm9keSxodG1sJylcblxuLypcbiAqICBJbml0aWFsaXplXG4qL1xuXG4gIGNvbnN0IHN0YXRlSW5pdGlhbGl6ZWQgPSBuZXcgS2VmaXIucG9vbCgpXG5cbiAgY29uc3QgSU5JVF9TVEFURSA9IHtcbiAgICB3cmFwcGVyczogW10sXG4gICAgY3VycmVudFdyYXBwZXI6IG51bGwsXG5cbiAgICBzY3JvbGxUb3A6ICR3aW5kb3cuc2Nyb2xsVG9wKCksXG4gICAgcmVsYXRpdmVTY3JvbGxUb3A6IDAsXG5cbiAgICBrZXlmcmFtZXM6IHVuZGVmaW5lZCxcbiAgICBwcmV2S2V5ZnJhbWVzRHVyYXRpb25zOiAwLFxuICAgIGN1cnJlbnRLZXlmcmFtZTogMCxcblxuICAgIGZyYW1lRm9jdXM6IFtdLFxuICAgIGN1cnJlbnRGb2N1czogMCxcbiAgICBjdXJyZW50RnJhbWU6IFswXSxcblxuICAgIHNjcm9sbFRpbWVvdXRJRDogMCxcblxuICAgIGJvZHlIZWlnaHQ6IDAsXG4gICAgd2luZG93SGVpZ2h0OiAwLFxuICAgIHdpbmRvd1dpZHRoOiAwXG4gIH1cblxuICBjb25zdCBpbml0U3RhdGUgPSBLZWZpci5zdHJlYW0oZW1pdHRlciA9PiB7XG4gICAgZW1pdHRlci5lbWl0KElOSVRfU1RBVEUpXG4gIH0pXG5cbiAgbW9kdWxlLmV4cG9ydHMuaW5pdCA9IChrZXlmcmFtZXMpID0+IHtcblxuICAgIGNvbnN0IGtleUZyYW1lc1JldHJlaXZlZCA9IEtlZmlyLnN0cmVhbShlbWl0dGVyID0+IHtcbiAgICAgIGVtaXR0ZXIuZW1pdChrZXlmcmFtZXMpXG4gICAgfSlcblxuICAgIGNvbnN0IGtleUZyYW1lc01hcHBlZFRvU3RhdGUgPSBrZXlGcmFtZXNSZXRyZWl2ZWRcbiAgICAgIC5mbGF0TWFwKGtleWZyYW1lcyA9PiB7XG4gICAgICAgIHJldHVybiBpbml0U3RhdGUubWFwKHN0YXRlID0+IHtcbiAgICAgICAgICBzdGF0ZS5rZXlmcmFtZXMgPSBrZXlmcmFtZXNcbiAgICAgICAgICByZXR1cm4gc3RhdGVcbiAgICAgICAgfSlcbiAgICAgIH0pXG4gICAgICAubWFwKHN0YXRlID0+IHtcbiAgICAgICAgc3RhdGUuY3VycmVudFdyYXBwZXIgPSBzdGF0ZS53cmFwcGVyc1swXVxuICAgICAgICBzdGF0ZS5zY3JvbGxUb3AgPSAwXG4gICAgICAgIHJldHVybiBzdGF0ZVxuICAgICAgfSlcblxuICAgIHN0YXRlSW5pdGlhbGl6ZWQucGx1ZyhrZXlGcmFtZXNNYXBwZWRUb1N0YXRlKVxuXG4gIH1cblxuLypcbiAqICBCdWlsZCBQYWdlXG4qL1xuXG4gIGNvbnN0IHdpbmRvd1Jlc2l6ZWQgPSBzdGF0ZUluaXRpYWxpemVkXG4gICAgLmZsYXRNYXAoKHMpID0+IHtcbiAgICAgIHJldHVybiBLZWZpci5mcm9tRXZlbnRzKCR3aW5kb3csICdyZXNpemUnLCAoKSA9PiB7cmV0dXJuIHN9IClcbiAgICB9KVxuICAgIC50aHJvdHRsZShBTklNQVRJT05fVElNRSlcblxuICBjb25zdCBkaW1lbnNpb25zQ2FsY3VsYXRlZCA9IEtlZmlyLm1lcmdlKFtzdGF0ZUluaXRpYWxpemVkLCB3aW5kb3dSZXNpemVkXSlcbiAgICAubWFwKGNhbGN1bGF0ZURpbWVuc2lvbnMpXG4gICAgLm1hcChjYWxjdWxhdGVLZXlGcmFtZXMpXG4gICAgLm1hcChjYWxjdWxhdGVFeHRyYXMpXG4gICAgLm1hcChzdGF0ZSA9PiB7XG4gICAgICBzdGF0ZS5jdXJyZW50V3JhcHBlciA9IHN0YXRlLndyYXBwZXJzWzBdXG4gICAgICByZXR1cm4gc3RhdGVcbiAgICB9KVxuXG4gICAgICBmdW5jdGlvbiBjYWxjdWxhdGVEaW1lbnNpb25zKHN0YXRlKSB7XG4gICAgICAgIHN0YXRlLnNjcm9sbFRvcCA9IE1hdGguZmxvb3IoJHdpbmRvdy5zY3JvbGxUb3AoKSlcbiAgICAgICAgc3RhdGUud2luZG93SGVpZ2h0ID0gJHdpbmRvdy5oZWlnaHQoKVxuICAgICAgICBzdGF0ZS53aW5kb3dXaWR0aCA9ICR3aW5kb3cud2lkdGgoKVxuICAgICAgICByZXR1cm4gc3RhdGVcbiAgICAgIH1cblxuICAgICAgZnVuY3Rpb24gY2FsY3VsYXRlS2V5RnJhbWVzKHN0YXRlKSB7XG4gICAgICAgIHN0YXRlLmtleWZyYW1lcyA9IHBhZ2VVdGlscy5jb252ZXJ0QWxsUHJvcHNUb1B4KHN0YXRlLmtleWZyYW1lcywgc3RhdGUud2luZG93V2lkdGgsIHN0YXRlLndpbmRvd0hlaWdodClcbiAgICAgICAgcmV0dXJuIHN0YXRlXG4gICAgICB9XG5cbiAgICAgIGZ1bmN0aW9uIGNhbGN1bGF0ZUV4dHJhcyhzdGF0ZSkge1xuICAgICAgICBsZXQgcGFnZUluZm8gPSBwYWdlVXRpbHMuYnVpbGRQYWdlKHN0YXRlLmtleWZyYW1lcywgc3RhdGUud3JhcHBlcnMpXG5cbiAgICAgICAgc3RhdGUuYm9keUhlaWdodCA9IHBhZ2VJbmZvLmJvZHlIZWlnaHRcbiAgICAgICAgc3RhdGUud3JhcHBlcnMgPSBwYWdlSW5mby53cmFwcGVyc1xuICAgICAgICBzdGF0ZS5mcmFtZUZvY3VzID0gcGFnZUluZm8uZnJhbWVGb2N1c1xuICAgICAgICAgIC5tYXAoaSA9PiBNYXRoLmZsb29yKGkpKVxuICAgICAgICAgIC5yZWR1Y2UoKGEsIGIpID0+IHsgLy8gY2xlYXJzIGFueSBmcmFtZSBkdXBsaWNhdGVzLiBUT0RPOiBmaW5kIGJ1ZyB0aGF0IG1ha2VzIGZyYW1lIGR1cGxpY2F0ZXNcbiAgICAgICAgICAgIGlmIChhLmluZGV4T2YoYikgPCAwKSBhLnB1c2goYilcbiAgICAgICAgICAgIHJldHVybiBhXG4gICAgICAgICAgfSwgW10pXG5cbiAgICAgICAgcmV0dXJuIHN0YXRlXG4gICAgICB9XG5cbiAgbW9kdWxlLmV4cG9ydHMuZGltZW5zaW9uc0NhbGN1bGF0ZWQgPSBkaW1lbnNpb25zQ2FsY3VsYXRlZFxuXG4vKlxuICogIFBvc2l0aW9uIG1vdmVkXG4qL1xuXG4gIGNvbnN0IHdpbmRvd1Njcm9sbGVkID0gS2VmaXIuZnJvbUV2ZW50cygkd2luZG93LCAnc2Nyb2xsJylcbiAgICAudGhyb3R0bGUoQU5JTUFUSU9OX1RJTUUpXG5cbiAgY29uc3Qgc29tZXRoaW5nTW92ZWQgPSBLZWZpci5mcm9tRXZlbnRzKHdpbmRvdywgJ1BPU0lUSU9OX0NIQU5HRUQnKVxuXG4gIGNvbnN0IGV2ZW50c0hhcHBlbmVkID0gZGltZW5zaW9uc0NhbGN1bGF0ZWRcbiAgICAuZmxhdE1hcChzdGF0ZSA9PiB7XG4gICAgICByZXR1cm4gS2VmaXIubWVyZ2UoW3dpbmRvd1Njcm9sbGVkLCBzb21ldGhpbmdNb3ZlZF0pXG4gICAgICAgICAgICAgIC5tYXAoZSA9PiB7XG4gICAgICAgICAgICAgICAgc3RhdGUuY2hhbmdlZCA9IGVcbiAgICAgICAgICAgICAgICByZXR1cm4gc3RhdGVcbiAgICAgICAgICAgICAgfSlcbiAgICB9KVxuXG4gIGNvbnN0IHBvc2l0aW9uQ2hhbmdlZCA9IEtlZmlyXG4gICAgLm1lcmdlKFtkaW1lbnNpb25zQ2FsY3VsYXRlZCwgZXZlbnRzSGFwcGVuZWRdKVxuXG4vKlxuICogIFN0YXRlIENoYW5nZWRcbiovXG5cbiAgLy8gQ2FsY3VsYXRlIGN1cnJlbnQgc3RhdGVcbiAgY29uc3QgY2FsY3VsYXRlZEN1cnJlbnRTdGF0ZSA9IEtlZmlyXG4gICAgLm1lcmdlKFtkaW1lbnNpb25zQ2FsY3VsYXRlZCwgcG9zaXRpb25DaGFuZ2VkXSlcbiAgICAubWFwKHNldFRvcHMpXG4gICAgLm1hcChzZXRLZXlmcmFtZSlcbiAgICAubWFwKGdldFNsaWRlTG9jYXRpb24pXG4gICAgLm1hcChzdGF0ZSA9PiB7XG4gICAgICBzdGF0ZS5jdXJyZW50V3JhcHBlciA9IHN0YXRlLmtleWZyYW1lc1tzdGF0ZS5jdXJyZW50S2V5ZnJhbWVdLndyYXBwZXJcbiAgICAgIHJldHVybiBzdGF0ZVxuICAgIH0pXG5cbiAgICAgIGZ1bmN0aW9uIHNldFRvcHMoc3RhdGUpIHtcbiAgICAgICAgc3RhdGUuc2Nyb2xsVG9wID0gTWF0aC5mbG9vcigkd2luZG93LnNjcm9sbFRvcCgpKVxuICAgICAgICBzdGF0ZS5yZWxhdGl2ZVNjcm9sbFRvcCA9IHN0YXRlLnNjcm9sbFRvcCAtIHN0YXRlLnByZXZLZXlmcmFtZXNEdXJhdGlvbnNcbiAgICAgICAgcmV0dXJuIHN0YXRlXG4gICAgICB9XG5cbiAgICAgIGZ1bmN0aW9uIHNldEtleWZyYW1lKHN0YXRlKSB7XG4gICAgICAgIGlmKHN0YXRlLnNjcm9sbFRvcCA+IChzdGF0ZS5rZXlmcmFtZXNbc3RhdGUuY3VycmVudEtleWZyYW1lXS5kdXJhdGlvbiArIHN0YXRlLnByZXZLZXlmcmFtZXNEdXJhdGlvbnMpKSB7XG4gICAgICAgICAgICBzdGF0ZS5wcmV2S2V5ZnJhbWVzRHVyYXRpb25zICs9IHN0YXRlLmtleWZyYW1lc1tzdGF0ZS5jdXJyZW50S2V5ZnJhbWVdLmR1cmF0aW9uXG4gICAgICAgICAgICBzdGF0ZS5jdXJyZW50S2V5ZnJhbWUrK1xuICAgICAgICB9IGVsc2UgaWYoc3RhdGUuc2Nyb2xsVG9wIDwgc3RhdGUucHJldktleWZyYW1lc0R1cmF0aW9ucykge1xuICAgICAgICAgICAgc3RhdGUuY3VycmVudEtleWZyYW1lLS1cbiAgICAgICAgICAgIHN0YXRlLnByZXZLZXlmcmFtZXNEdXJhdGlvbnMgLT0gc3RhdGUua2V5ZnJhbWVzW3N0YXRlLmN1cnJlbnRLZXlmcmFtZV0uZHVyYXRpb25cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc3RhdGVcbiAgICAgIH1cblxuICAgICAgZnVuY3Rpb24gZ2V0U2xpZGVMb2NhdGlvbihzdGF0ZSkge1xuICAgICAgICBmb3IgKGxldCB4ID0gMTsgeCA8PSBzdGF0ZS5mcmFtZUZvY3VzLmxlbmd0aDsgeCsrKSB7XG4gICAgICAgICAgaWYgKHN0YXRlLmZyYW1lRm9jdXNbeF0gPT09IHN0YXRlLnNjcm9sbFRvcCkge1xuICAgICAgICAgICAgc3RhdGUuY3VycmVudEZyYW1lID0gW3hdXG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChzdGF0ZS5zY3JvbGxUb3AuYmV0d2VlbihzdGF0ZS5mcmFtZUZvY3VzW3ggLSAxXSwgc3RhdGUuZnJhbWVGb2N1c1t4XSkpIHtcbiAgICAgICAgICAgIHN0YXRlLmN1cnJlbnRGcmFtZSA9IFt4IC0gMSwgeF1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHN0YXRlXG4gICAgICB9XG5cbiAgY29uc3Qgd3JhcHBlckNoYW5nZWQgPSBjYWxjdWxhdGVkQ3VycmVudFN0YXRlXG4gICAgLm1hcChzdGF0ZSA9PiBzdGF0ZS5jdXJyZW50V3JhcHBlcilcbiAgICAuZGlmZihudWxsLCAnJylcbiAgICAuZmlsdGVyKGN1cnJlbnRXcmFwcGVyID0+IGN1cnJlbnRXcmFwcGVyWzBdICE9PSBjdXJyZW50V3JhcHBlclsxXSlcbiAgICAvLyAuZGVsYXkoQU5JTUFUSU9OX1RJTUUqMikgLy8gVG8gd2FpdCBmb3IgZmlyc3QgYW5pbWF0aW9uIGZyYW1lIHRvIHN0YXJ0IGJlZm9yZSBzd2l0Y2hpbmdcblxuICBtb2R1bGUuZXhwb3J0cy53cmFwcGVyQ2hhbmdlZCA9IHdyYXBwZXJDaGFuZ2VkO1xuXG4gIGNvbnN0IHNjcm9sbFRvcENoYW5nZWQgPSBjYWxjdWxhdGVkQ3VycmVudFN0YXRlXG4gICAgLmRpZmYobnVsbCAsIHsgLy8gSGFjaywgZm9yIHNvbWUgcmVhc29uIElOSVRfU1RBVEUgaXNuJ3QgY29taW5nIGluIHByb3Blcmx5XG4gICAgICB3cmFwcGVyczogW10sXG4gICAgICBjdXJyZW50V3JhcHBlcjogdW5kZWZpbmVkLFxuXG4gICAgICBzY3JvbGxUb3A6IDAsXG4gICAgICByZWxhdGl2ZVNjcm9sbFRvcDogMCxcblxuICAgICAga2V5ZnJhbWVzOiB1bmRlZmluZWQsXG4gICAgICBwcmV2S2V5ZnJhbWVzRHVyYXRpb25zOiAwLFxuICAgICAgY3VycmVudEtleWZyYW1lOiAwLFxuXG4gICAgICBmcmFtZUZvY3VzOiBbXSxcbiAgICAgIGN1cnJlbnRGb2N1czogMCxcbiAgICAgIGN1cnJlbnRJbnRlcnZhbDogMCxcblxuICAgICAgc2Nyb2xsVGltZW91dElEOiAwLFxuXG4gICAgICBib2R5SGVpZ2h0OiAwLFxuICAgICAgd2luZG93SGVpZ2h0OiAwLFxuICAgICAgd2luZG93V2lkdGg6IDBcbiAgICB9KVxuXG4gIG1vZHVsZS5leHBvcnRzLnNjcm9sbFRvcENoYW5nZWQgPSBzY3JvbGxUb3BDaGFuZ2VkXG4gIC8vIHNjcm9sbFRvcENoYW5nZWQubG9nKClcblxuLypcbiAqICBBY3Rpb25zXG4qL1xuXG4gIG1vZHVsZS5leHBvcnRzLmdldCA9ICgpID0+IHtcbiAgICByZXR1cm4gc3RhdGVcbiAgfVxuXG4gIG1vZHVsZS5leHBvcnRzLmFjdGlvbiA9IChhY3Rpb24pID0+IHtcbiAgICBzd2l0Y2ggKGFjdGlvbikge1xuICAgICAgY2FzZSAnbmV4dCc6XG4gICAgICAgICR3aW5kb3cudHJpZ2dlcignRk9DVVNfTkVYVCcpXG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlICdwcmV2aW91cyc6XG4gICAgICAgICR3aW5kb3cudHJpZ2dlcignRk9DVVNfUFJFVklPVVMnKVxuICAgICAgICBicmVha1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgYnJlYWtcbiAgICB9XG4gIH1cblxuICBjb25zdCBhY3Rpb25fZm9jdXNOZXh0ID0gc2Nyb2xsVG9wQ2hhbmdlZFxuICAgICAgLmZsYXRNYXBGaXJzdCgoc3RhdGUpID0+IHtcbiAgICAgICAgcmV0dXJuIEtlZmlyLmZyb21FdmVudHMoJHdpbmRvdywgJ0ZPQ1VTX05FWFQnLCAoKSA9PiBzdGF0ZSlcbiAgICAgIH0pXG4gICAgICAubWFwKHN0YXRlID0+IHN0YXRlWzFdKVxuICAgICAgLm1hcChuZXh0Rm9jdXMpXG5cbiAgY29uc3QgYWN0aW9uX2ZvY3VzUHJldmlvdXMgPSBzY3JvbGxUb3BDaGFuZ2VkXG4gICAgICAuZmxhdE1hcEZpcnN0KChzdGF0ZSkgPT4ge1xuICAgICAgICByZXR1cm4gS2VmaXIuZnJvbUV2ZW50cygkd2luZG93LCAnRk9DVVNfUFJFVklPVVMnLCAoKSA9PiBzdGF0ZSlcbiAgICAgIH0pXG4gICAgICAubWFwKHN0YXRlID0+IHN0YXRlWzFdKVxuICAgICAgLm1hcChwcmV2aW91c0ZvY3VzKVxuXG4gICAgZnVuY3Rpb24gbmV4dEZvY3VzKHN0YXRlKSB7XG4gICAgICBzd2l0Y2goc3RhdGUuY3VycmVudEZyYW1lLmxlbmd0aCkge1xuICAgICAgICBjYXNlIDE6XG4gICAgICAgICAgcmV0dXJuIHN0YXRlLmZyYW1lRm9jdXNbc3RhdGUuY3VycmVudEZyYW1lWzBdICsgMV1cbiAgICAgICAgY2FzZSAyOlxuICAgICAgICAgIHJldHVybiBzdGF0ZS5mcmFtZUZvY3VzW3N0YXRlLmN1cnJlbnRGcmFtZVsxXV1cbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICByZXR1cm4gZmFsc2VcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwcmV2aW91c0ZvY3VzKHN0YXRlKSB7XG4gICAgICBzd2l0Y2goc3RhdGUuY3VycmVudEZyYW1lLmxlbmd0aCkge1xuICAgICAgICBjYXNlIDE6XG4gICAgICAgICAgcmV0dXJuIHN0YXRlLmZyYW1lRm9jdXNbc3RhdGUuY3VycmVudEZyYW1lWzBdIC0gMV1cbiAgICAgICAgY2FzZSAyOlxuICAgICAgICAgIHJldHVybiBzdGF0ZS5mcmFtZUZvY3VzW3N0YXRlLmN1cnJlbnRGcmFtZVswXV1cbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICByZXR1cm4gZmFsc2VcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCBmb2N1c0NoYW5nZWQgPSBLZWZpci5tZXJnZShbYWN0aW9uX2ZvY3VzUHJldmlvdXMsIGFjdGlvbl9mb2N1c05leHRdKVxuICAgICAgLm9uVmFsdWUocmVuZGVyU2Nyb2xsKVxuXG4gICAgZm9jdXNDaGFuZ2VkLmxvZygpO1xuICAgIGZ1bmN0aW9uIHJlbmRlclNjcm9sbChzY3JvbGwpIHtcbiAgICAgIC8vIGNvbnNvbGUubG9nKFwiUkVOREVSXCIsIHNjcm9sbCwgTWF0aC5mbG9vcigkd2luZG93LnNjcm9sbFRvcCgpKSlcbiAgICAgICRib2R5aHRtbC5hbmltYXRlKHtcbiAgICAgICAgc2Nyb2xsVG9wOiBzY3JvbGxcbiAgICAgIH0sIDE1MDAsICdsaW5lYXInKVxuICAgIH1cblxuICAgIE51bWJlci5wcm90b3R5cGUuYmV0d2VlbiA9IGZ1bmN0aW9uKGEsIGIpIHtcbiAgICAgIHZhciBtaW4gPSBNYXRoLm1pbi5hcHBseShNYXRoLCBbYSwgYl0pLFxuICAgICAgICBtYXggPSBNYXRoLm1heC5hcHBseShNYXRoLCBbYSwgYl0pXG4gICAgICByZXR1cm4gdGhpcyA+IG1pbiAmJiB0aGlzIDwgbWF4XG4gICAgfVxuXG5cbi8qXG4gKiAgSGVscGVyc1xuKi9cblxuICBmdW5jdGlvbiB0aHJvd0Vycm9yKCkge1xuICAgICRib2R5aHRtbC5hZGRDbGFzcygncGFnZS1lcnJvcicpXG4gIH1cblxuICBmdW5jdGlvbiBpc1RvdWNoRGV2aWNlKCkge1xuICAgIHJldHVybiAnb250b3VjaHN0YXJ0JyBpbiB3aW5kb3cgLy8gd29ya3Mgb24gbW9zdCBicm93c2Vyc1xuICAgICAgfHwgJ29ubXNnZXN0dXJlY2hhbmdlJyBpbiB3aW5kb3cgLy8gd29ya3Mgb24gaWUxMFxuICB9XG5cblxuXG4vKiogV0VCUEFDSyBGT09URVIgKipcbiAqKiAuL3NjZW5lLW1ha2VyL29iLXNjZW5lLmpzXG4gKiovIiwiLyohIEtlZmlyLmpzIHYzLjIuMFxuICogIGh0dHBzOi8vZ2l0aHViLmNvbS9ycG9taW5vdi9rZWZpclxuICovXG5cbihmdW5jdGlvbiB3ZWJwYWNrVW5pdmVyc2FsTW9kdWxlRGVmaW5pdGlvbihyb290LCBmYWN0b3J5KSB7XG5cdGlmKHR5cGVvZiBleHBvcnRzID09PSAnb2JqZWN0JyAmJiB0eXBlb2YgbW9kdWxlID09PSAnb2JqZWN0Jylcblx0XHRtb2R1bGUuZXhwb3J0cyA9IGZhY3RvcnkoKTtcblx0ZWxzZSBpZih0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpXG5cdFx0ZGVmaW5lKFtdLCBmYWN0b3J5KTtcblx0ZWxzZSBpZih0eXBlb2YgZXhwb3J0cyA9PT0gJ29iamVjdCcpXG5cdFx0ZXhwb3J0c1tcIktlZmlyXCJdID0gZmFjdG9yeSgpO1xuXHRlbHNlXG5cdFx0cm9vdFtcIktlZmlyXCJdID0gZmFjdG9yeSgpO1xufSkodGhpcywgZnVuY3Rpb24oKSB7XG5yZXR1cm4gLyoqKioqKi8gKGZ1bmN0aW9uKG1vZHVsZXMpIHsgLy8gd2VicGFja0Jvb3RzdHJhcFxuLyoqKioqKi8gXHQvLyBUaGUgbW9kdWxlIGNhY2hlXG4vKioqKioqLyBcdHZhciBpbnN0YWxsZWRNb2R1bGVzID0ge307XG5cbi8qKioqKiovIFx0Ly8gVGhlIHJlcXVpcmUgZnVuY3Rpb25cbi8qKioqKiovIFx0ZnVuY3Rpb24gX193ZWJwYWNrX3JlcXVpcmVfXyhtb2R1bGVJZCkge1xuXG4vKioqKioqLyBcdFx0Ly8gQ2hlY2sgaWYgbW9kdWxlIGlzIGluIGNhY2hlXG4vKioqKioqLyBcdFx0aWYoaW5zdGFsbGVkTW9kdWxlc1ttb2R1bGVJZF0pXG4vKioqKioqLyBcdFx0XHRyZXR1cm4gaW5zdGFsbGVkTW9kdWxlc1ttb2R1bGVJZF0uZXhwb3J0cztcblxuLyoqKioqKi8gXHRcdC8vIENyZWF0ZSBhIG5ldyBtb2R1bGUgKGFuZCBwdXQgaXQgaW50byB0aGUgY2FjaGUpXG4vKioqKioqLyBcdFx0dmFyIG1vZHVsZSA9IGluc3RhbGxlZE1vZHVsZXNbbW9kdWxlSWRdID0ge1xuLyoqKioqKi8gXHRcdFx0ZXhwb3J0czoge30sXG4vKioqKioqLyBcdFx0XHRpZDogbW9kdWxlSWQsXG4vKioqKioqLyBcdFx0XHRsb2FkZWQ6IGZhbHNlXG4vKioqKioqLyBcdFx0fTtcblxuLyoqKioqKi8gXHRcdC8vIEV4ZWN1dGUgdGhlIG1vZHVsZSBmdW5jdGlvblxuLyoqKioqKi8gXHRcdG1vZHVsZXNbbW9kdWxlSWRdLmNhbGwobW9kdWxlLmV4cG9ydHMsIG1vZHVsZSwgbW9kdWxlLmV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pO1xuXG4vKioqKioqLyBcdFx0Ly8gRmxhZyB0aGUgbW9kdWxlIGFzIGxvYWRlZFxuLyoqKioqKi8gXHRcdG1vZHVsZS5sb2FkZWQgPSB0cnVlO1xuXG4vKioqKioqLyBcdFx0Ly8gUmV0dXJuIHRoZSBleHBvcnRzIG9mIHRoZSBtb2R1bGVcbi8qKioqKiovIFx0XHRyZXR1cm4gbW9kdWxlLmV4cG9ydHM7XG4vKioqKioqLyBcdH1cblxuXG4vKioqKioqLyBcdC8vIGV4cG9zZSB0aGUgbW9kdWxlcyBvYmplY3QgKF9fd2VicGFja19tb2R1bGVzX18pXG4vKioqKioqLyBcdF9fd2VicGFja19yZXF1aXJlX18ubSA9IG1vZHVsZXM7XG5cbi8qKioqKiovIFx0Ly8gZXhwb3NlIHRoZSBtb2R1bGUgY2FjaGVcbi8qKioqKiovIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5jID0gaW5zdGFsbGVkTW9kdWxlcztcblxuLyoqKioqKi8gXHQvLyBfX3dlYnBhY2tfcHVibGljX3BhdGhfX1xuLyoqKioqKi8gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLnAgPSBcIlwiO1xuXG4vKioqKioqLyBcdC8vIExvYWQgZW50cnkgbW9kdWxlIGFuZCByZXR1cm4gZXhwb3J0c1xuLyoqKioqKi8gXHRyZXR1cm4gX193ZWJwYWNrX3JlcXVpcmVfXygwKTtcbi8qKioqKiovIH0pXG4vKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuLyoqKioqKi8gKFtcbi8qIDAgKi9cbi8qKiovIGZ1bmN0aW9uKG1vZHVsZSwgZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXykge1xuXG5cdCd1c2Ugc3RyaWN0JztcblxuXHR2YXIgS2VmaXIgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xuXHRLZWZpci5LZWZpciA9IEtlZmlyO1xuXG5cdHZhciBPYnNlcnZhYmxlID0gS2VmaXIuT2JzZXJ2YWJsZSA9IF9fd2VicGFja19yZXF1aXJlX18oMSk7XG5cdEtlZmlyLlN0cmVhbSA9IF9fd2VicGFja19yZXF1aXJlX18oNik7XG5cdEtlZmlyLlByb3BlcnR5ID0gX193ZWJwYWNrX3JlcXVpcmVfXyg3KTtcblxuXHQvLyBDcmVhdGUgYSBzdHJlYW1cblx0Ly8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuXHQvLyAoKSAtPiBTdHJlYW1cblx0S2VmaXIubmV2ZXIgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDgpO1xuXG5cdC8vIChudW1iZXIsIGFueSkgLT4gU3RyZWFtXG5cdEtlZmlyLmxhdGVyID0gX193ZWJwYWNrX3JlcXVpcmVfXyg5KTtcblxuXHQvLyAobnVtYmVyLCBhbnkpIC0+IFN0cmVhbVxuXHRLZWZpci5pbnRlcnZhbCA9IF9fd2VicGFja19yZXF1aXJlX18oMTEpO1xuXG5cdC8vIChudW1iZXIsIEFycmF5PGFueT4pIC0+IFN0cmVhbVxuXHRLZWZpci5zZXF1ZW50aWFsbHkgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDEyKTtcblxuXHQvLyAobnVtYmVyLCBGdW5jdGlvbikgLT4gU3RyZWFtXG5cdEtlZmlyLmZyb21Qb2xsID0gX193ZWJwYWNrX3JlcXVpcmVfXygxMyk7XG5cblx0Ly8gKG51bWJlciwgRnVuY3Rpb24pIC0+IFN0cmVhbVxuXHRLZWZpci53aXRoSW50ZXJ2YWwgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDE0KTtcblxuXHQvLyAoRnVuY3Rpb24pIC0+IFN0cmVhbVxuXHRLZWZpci5mcm9tQ2FsbGJhY2sgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDE2KTtcblxuXHQvLyAoRnVuY3Rpb24pIC0+IFN0cmVhbVxuXHRLZWZpci5mcm9tTm9kZUNhbGxiYWNrID0gX193ZWJwYWNrX3JlcXVpcmVfXygxOCk7XG5cblx0Ly8gVGFyZ2V0ID0ge2FkZEV2ZW50TGlzdGVuZXIsIHJlbW92ZUV2ZW50TGlzdGVuZXJ9fHthZGRMaXN0ZW5lciwgcmVtb3ZlTGlzdGVuZXJ9fHtvbiwgb2ZmfVxuXHQvLyAoVGFyZ2V0LCBzdHJpbmcsIEZ1bmN0aW9ufHVuZGVmaW5lZCkgLT4gU3RyZWFtXG5cdEtlZmlyLmZyb21FdmVudHMgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDE5KTtcblxuXHQvLyAoRnVuY3Rpb24pIC0+IFN0cmVhbVxuXHRLZWZpci5zdHJlYW0gPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDE3KTtcblxuXHQvLyBDcmVhdGUgYSBwcm9wZXJ0eVxuXHQvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5cdC8vIChhbnkpIC0+IFByb3BlcnR5XG5cdEtlZmlyLmNvbnN0YW50ID0gX193ZWJwYWNrX3JlcXVpcmVfXygyMik7XG5cblx0Ly8gKGFueSkgLT4gUHJvcGVydHlcblx0S2VmaXIuY29uc3RhbnRFcnJvciA9IF9fd2VicGFja19yZXF1aXJlX18oMjMpO1xuXG5cdC8vIENvbnZlcnQgb2JzZXJ2YWJsZXNcblx0Ly8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuXHQvLyAoU3RyZWFtfFByb3BlcnR5LCBGdW5jdGlvbnx1bmRlZmluZWQpIC0+IFByb3BlcnR5XG5cdHZhciB0b1Byb3BlcnR5ID0gX193ZWJwYWNrX3JlcXVpcmVfXygyNCk7XG5cdE9ic2VydmFibGUucHJvdG90eXBlLnRvUHJvcGVydHkgPSBmdW5jdGlvbiAoZm4pIHtcblx0ICByZXR1cm4gdG9Qcm9wZXJ0eSh0aGlzLCBmbik7XG5cdH07XG5cblx0Ly8gKFN0cmVhbXxQcm9wZXJ0eSkgLT4gU3RyZWFtXG5cdHZhciBjaGFuZ2VzID0gX193ZWJwYWNrX3JlcXVpcmVfXygyNik7XG5cdE9ic2VydmFibGUucHJvdG90eXBlLmNoYW5nZXMgPSBmdW5jdGlvbiAoKSB7XG5cdCAgcmV0dXJuIGNoYW5nZXModGhpcyk7XG5cdH07XG5cblx0Ly8gSW50ZXJvcGVyYXRpb24gd2l0aCBvdGhlciBpbXBsaW1lbnRhdGlvbnNcblx0Ly8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuXHQvLyAoUHJvbWlzZSkgLT4gUHJvcGVydHlcblx0S2VmaXIuZnJvbVByb21pc2UgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDI3KTtcblxuXHQvLyAoU3RyZWFtfFByb3BlcnR5LCBGdW5jdGlvbnx1bmRlZmluZWQpIC0+IFByb21pc2Vcblx0dmFyIHRvUHJvbWlzZSA9IF9fd2VicGFja19yZXF1aXJlX18oMjgpO1xuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS50b1Byb21pc2UgPSBmdW5jdGlvbiAoUHJvbWlzZSkge1xuXHQgIHJldHVybiB0b1Byb21pc2UodGhpcywgUHJvbWlzZSk7XG5cdH07XG5cblx0Ly8gKEVTT2JzZXJ2YWJsZSkgLT4gU3RyZWFtXG5cdEtlZmlyLmZyb21FU09ic2VydmFibGUgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDI5KTtcblxuXHQvLyAoU3RyZWFtfFByb3BlcnR5KSAtPiBFUzcgT2JzZXJ2YWJsZVxuXHR2YXIgdG9FU09ic2VydmFibGUgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDMxKTtcblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUudG9FU09ic2VydmFibGUgPSB0b0VTT2JzZXJ2YWJsZTtcblx0T2JzZXJ2YWJsZS5wcm90b3R5cGVbX193ZWJwYWNrX3JlcXVpcmVfXygzMCkoJ29ic2VydmFibGUnKV0gPSB0b0VTT2JzZXJ2YWJsZTtcblxuXHQvLyBNb2RpZnkgYW4gb2JzZXJ2YWJsZVxuXHQvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5cdC8vIChTdHJlYW0sIEZ1bmN0aW9ufHVuZGVmaW5lZCkgLT4gU3RyZWFtXG5cdC8vIChQcm9wZXJ0eSwgRnVuY3Rpb258dW5kZWZpbmVkKSAtPiBQcm9wZXJ0eVxuXHR2YXIgbWFwID0gX193ZWJwYWNrX3JlcXVpcmVfXygzMik7XG5cdE9ic2VydmFibGUucHJvdG90eXBlLm1hcCA9IGZ1bmN0aW9uIChmbikge1xuXHQgIHJldHVybiBtYXAodGhpcywgZm4pO1xuXHR9O1xuXG5cdC8vIChTdHJlYW0sIEZ1bmN0aW9ufHVuZGVmaW5lZCkgLT4gU3RyZWFtXG5cdC8vIChQcm9wZXJ0eSwgRnVuY3Rpb258dW5kZWZpbmVkKSAtPiBQcm9wZXJ0eVxuXHR2YXIgZmlsdGVyID0gX193ZWJwYWNrX3JlcXVpcmVfXygzMyk7XG5cdE9ic2VydmFibGUucHJvdG90eXBlLmZpbHRlciA9IGZ1bmN0aW9uIChmbikge1xuXHQgIHJldHVybiBmaWx0ZXIodGhpcywgZm4pO1xuXHR9O1xuXG5cdC8vIChTdHJlYW0sIG51bWJlcikgLT4gU3RyZWFtXG5cdC8vIChQcm9wZXJ0eSwgbnVtYmVyKSAtPiBQcm9wZXJ0eVxuXHR2YXIgdGFrZSA9IF9fd2VicGFja19yZXF1aXJlX18oMzQpO1xuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS50YWtlID0gZnVuY3Rpb24gKG4pIHtcblx0ICByZXR1cm4gdGFrZSh0aGlzLCBuKTtcblx0fTtcblxuXHQvLyAoU3RyZWFtLCBudW1iZXIpIC0+IFN0cmVhbVxuXHQvLyAoUHJvcGVydHksIG51bWJlcikgLT4gUHJvcGVydHlcblx0dmFyIHRha2VFcnJvcnMgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDM1KTtcblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUudGFrZUVycm9ycyA9IGZ1bmN0aW9uIChuKSB7XG5cdCAgcmV0dXJuIHRha2VFcnJvcnModGhpcywgbik7XG5cdH07XG5cblx0Ly8gKFN0cmVhbSwgRnVuY3Rpb258dW5kZWZpbmVkKSAtPiBTdHJlYW1cblx0Ly8gKFByb3BlcnR5LCBGdW5jdGlvbnx1bmRlZmluZWQpIC0+IFByb3BlcnR5XG5cdHZhciB0YWtlV2hpbGUgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDM2KTtcblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUudGFrZVdoaWxlID0gZnVuY3Rpb24gKGZuKSB7XG5cdCAgcmV0dXJuIHRha2VXaGlsZSh0aGlzLCBmbik7XG5cdH07XG5cblx0Ly8gKFN0cmVhbSkgLT4gU3RyZWFtXG5cdC8vIChQcm9wZXJ0eSkgLT4gUHJvcGVydHlcblx0dmFyIGxhc3QgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDM3KTtcblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUubGFzdCA9IGZ1bmN0aW9uICgpIHtcblx0ICByZXR1cm4gbGFzdCh0aGlzKTtcblx0fTtcblxuXHQvLyAoU3RyZWFtLCBudW1iZXIpIC0+IFN0cmVhbVxuXHQvLyAoUHJvcGVydHksIG51bWJlcikgLT4gUHJvcGVydHlcblx0dmFyIHNraXAgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDM4KTtcblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUuc2tpcCA9IGZ1bmN0aW9uIChuKSB7XG5cdCAgcmV0dXJuIHNraXAodGhpcywgbik7XG5cdH07XG5cblx0Ly8gKFN0cmVhbSwgRnVuY3Rpb258dW5kZWZpbmVkKSAtPiBTdHJlYW1cblx0Ly8gKFByb3BlcnR5LCBGdW5jdGlvbnx1bmRlZmluZWQpIC0+IFByb3BlcnR5XG5cdHZhciBza2lwV2hpbGUgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDM5KTtcblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUuc2tpcFdoaWxlID0gZnVuY3Rpb24gKGZuKSB7XG5cdCAgcmV0dXJuIHNraXBXaGlsZSh0aGlzLCBmbik7XG5cdH07XG5cblx0Ly8gKFN0cmVhbSwgRnVuY3Rpb258dW5kZWZpbmVkKSAtPiBTdHJlYW1cblx0Ly8gKFByb3BlcnR5LCBGdW5jdGlvbnx1bmRlZmluZWQpIC0+IFByb3BlcnR5XG5cdHZhciBza2lwRHVwbGljYXRlcyA9IF9fd2VicGFja19yZXF1aXJlX18oNDApO1xuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS5za2lwRHVwbGljYXRlcyA9IGZ1bmN0aW9uIChmbikge1xuXHQgIHJldHVybiBza2lwRHVwbGljYXRlcyh0aGlzLCBmbik7XG5cdH07XG5cblx0Ly8gKFN0cmVhbSwgRnVuY3Rpb258ZmFsc2V5LCBhbnl8dW5kZWZpbmVkKSAtPiBTdHJlYW1cblx0Ly8gKFByb3BlcnR5LCBGdW5jdGlvbnxmYWxzZXksIGFueXx1bmRlZmluZWQpIC0+IFByb3BlcnR5XG5cdHZhciBkaWZmID0gX193ZWJwYWNrX3JlcXVpcmVfXyg0MSk7XG5cdE9ic2VydmFibGUucHJvdG90eXBlLmRpZmYgPSBmdW5jdGlvbiAoZm4sIHNlZWQpIHtcblx0ICByZXR1cm4gZGlmZih0aGlzLCBmbiwgc2VlZCk7XG5cdH07XG5cblx0Ly8gKFN0cmVhbXxQcm9wZXJ0eSwgRnVuY3Rpb24sIGFueXx1bmRlZmluZWQpIC0+IFByb3BlcnR5XG5cdHZhciBzY2FuID0gX193ZWJwYWNrX3JlcXVpcmVfXyg0Mik7XG5cdE9ic2VydmFibGUucHJvdG90eXBlLnNjYW4gPSBmdW5jdGlvbiAoZm4sIHNlZWQpIHtcblx0ICByZXR1cm4gc2Nhbih0aGlzLCBmbiwgc2VlZCk7XG5cdH07XG5cblx0Ly8gKFN0cmVhbSwgRnVuY3Rpb258dW5kZWZpbmVkKSAtPiBTdHJlYW1cblx0Ly8gKFByb3BlcnR5LCBGdW5jdGlvbnx1bmRlZmluZWQpIC0+IFByb3BlcnR5XG5cdHZhciBmbGF0dGVuID0gX193ZWJwYWNrX3JlcXVpcmVfXyg0Myk7XG5cdE9ic2VydmFibGUucHJvdG90eXBlLmZsYXR0ZW4gPSBmdW5jdGlvbiAoZm4pIHtcblx0ICByZXR1cm4gZmxhdHRlbih0aGlzLCBmbik7XG5cdH07XG5cblx0Ly8gKFN0cmVhbSwgbnVtYmVyKSAtPiBTdHJlYW1cblx0Ly8gKFByb3BlcnR5LCBudW1iZXIpIC0+IFByb3BlcnR5XG5cdHZhciBkZWxheSA9IF9fd2VicGFja19yZXF1aXJlX18oNDQpO1xuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS5kZWxheSA9IGZ1bmN0aW9uICh3YWl0KSB7XG5cdCAgcmV0dXJuIGRlbGF5KHRoaXMsIHdhaXQpO1xuXHR9O1xuXG5cdC8vIE9wdGlvbnMgPSB7bGVhZGluZzogYm9vbGVhbnx1bmRlZmluZWQsIHRyYWlsaW5nOiBib29sZWFufHVuZGVmaW5lZH1cblx0Ly8gKFN0cmVhbSwgbnVtYmVyLCBPcHRpb25zfHVuZGVmaW5lZCkgLT4gU3RyZWFtXG5cdC8vIChQcm9wZXJ0eSwgbnVtYmVyLCBPcHRpb25zfHVuZGVmaW5lZCkgLT4gUHJvcGVydHlcblx0dmFyIHRocm90dGxlID0gX193ZWJwYWNrX3JlcXVpcmVfXyg0NSk7XG5cdE9ic2VydmFibGUucHJvdG90eXBlLnRocm90dGxlID0gZnVuY3Rpb24gKHdhaXQsIG9wdGlvbnMpIHtcblx0ICByZXR1cm4gdGhyb3R0bGUodGhpcywgd2FpdCwgb3B0aW9ucyk7XG5cdH07XG5cblx0Ly8gT3B0aW9ucyA9IHtpbW1lZGlhdGU6IGJvb2xlYW58dW5kZWZpbmVkfVxuXHQvLyAoU3RyZWFtLCBudW1iZXIsIE9wdGlvbnN8dW5kZWZpbmVkKSAtPiBTdHJlYW1cblx0Ly8gKFByb3BlcnR5LCBudW1iZXIsIE9wdGlvbnN8dW5kZWZpbmVkKSAtPiBQcm9wZXJ0eVxuXHR2YXIgZGVib3VuY2UgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDQ3KTtcblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUuZGVib3VuY2UgPSBmdW5jdGlvbiAod2FpdCwgb3B0aW9ucykge1xuXHQgIHJldHVybiBkZWJvdW5jZSh0aGlzLCB3YWl0LCBvcHRpb25zKTtcblx0fTtcblxuXHQvLyAoU3RyZWFtLCBGdW5jdGlvbnx1bmRlZmluZWQpIC0+IFN0cmVhbVxuXHQvLyAoUHJvcGVydHksIEZ1bmN0aW9ufHVuZGVmaW5lZCkgLT4gUHJvcGVydHlcblx0dmFyIG1hcEVycm9ycyA9IF9fd2VicGFja19yZXF1aXJlX18oNDgpO1xuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS5tYXBFcnJvcnMgPSBmdW5jdGlvbiAoZm4pIHtcblx0ICByZXR1cm4gbWFwRXJyb3JzKHRoaXMsIGZuKTtcblx0fTtcblxuXHQvLyAoU3RyZWFtLCBGdW5jdGlvbnx1bmRlZmluZWQpIC0+IFN0cmVhbVxuXHQvLyAoUHJvcGVydHksIEZ1bmN0aW9ufHVuZGVmaW5lZCkgLT4gUHJvcGVydHlcblx0dmFyIGZpbHRlckVycm9ycyA9IF9fd2VicGFja19yZXF1aXJlX18oNDkpO1xuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS5maWx0ZXJFcnJvcnMgPSBmdW5jdGlvbiAoZm4pIHtcblx0ICByZXR1cm4gZmlsdGVyRXJyb3JzKHRoaXMsIGZuKTtcblx0fTtcblxuXHQvLyAoU3RyZWFtKSAtPiBTdHJlYW1cblx0Ly8gKFByb3BlcnR5KSAtPiBQcm9wZXJ0eVxuXHR2YXIgaWdub3JlVmFsdWVzID0gX193ZWJwYWNrX3JlcXVpcmVfXyg1MCk7XG5cdE9ic2VydmFibGUucHJvdG90eXBlLmlnbm9yZVZhbHVlcyA9IGZ1bmN0aW9uICgpIHtcblx0ICByZXR1cm4gaWdub3JlVmFsdWVzKHRoaXMpO1xuXHR9O1xuXG5cdC8vIChTdHJlYW0pIC0+IFN0cmVhbVxuXHQvLyAoUHJvcGVydHkpIC0+IFByb3BlcnR5XG5cdHZhciBpZ25vcmVFcnJvcnMgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDUxKTtcblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUuaWdub3JlRXJyb3JzID0gZnVuY3Rpb24gKCkge1xuXHQgIHJldHVybiBpZ25vcmVFcnJvcnModGhpcyk7XG5cdH07XG5cblx0Ly8gKFN0cmVhbSkgLT4gU3RyZWFtXG5cdC8vIChQcm9wZXJ0eSkgLT4gUHJvcGVydHlcblx0dmFyIGlnbm9yZUVuZCA9IF9fd2VicGFja19yZXF1aXJlX18oNTIpO1xuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS5pZ25vcmVFbmQgPSBmdW5jdGlvbiAoKSB7XG5cdCAgcmV0dXJuIGlnbm9yZUVuZCh0aGlzKTtcblx0fTtcblxuXHQvLyAoU3RyZWFtLCBGdW5jdGlvbikgLT4gU3RyZWFtXG5cdC8vIChQcm9wZXJ0eSwgRnVuY3Rpb24pIC0+IFByb3BlcnR5XG5cdHZhciBiZWZvcmVFbmQgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDUzKTtcblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUuYmVmb3JlRW5kID0gZnVuY3Rpb24gKGZuKSB7XG5cdCAgcmV0dXJuIGJlZm9yZUVuZCh0aGlzLCBmbik7XG5cdH07XG5cblx0Ly8gKFN0cmVhbSwgbnVtYmVyLCBudW1iZXJ8dW5kZWZpbmVkKSAtPiBTdHJlYW1cblx0Ly8gKFByb3BlcnR5LCBudW1iZXIsIG51bWJlcnx1bmRlZmluZWQpIC0+IFByb3BlcnR5XG5cdHZhciBzbGlkaW5nV2luZG93ID0gX193ZWJwYWNrX3JlcXVpcmVfXyg1NCk7XG5cdE9ic2VydmFibGUucHJvdG90eXBlLnNsaWRpbmdXaW5kb3cgPSBmdW5jdGlvbiAobWF4LCBtaW4pIHtcblx0ICByZXR1cm4gc2xpZGluZ1dpbmRvdyh0aGlzLCBtYXgsIG1pbik7XG5cdH07XG5cblx0Ly8gT3B0aW9ucyA9IHtmbHVzaE9uRW5kOiBib29sZWFufHVuZGVmaW5lZH1cblx0Ly8gKFN0cmVhbSwgRnVuY3Rpb258ZmFsc2V5LCBPcHRpb25zfHVuZGVmaW5lZCkgLT4gU3RyZWFtXG5cdC8vIChQcm9wZXJ0eSwgRnVuY3Rpb258ZmFsc2V5LCBPcHRpb25zfHVuZGVmaW5lZCkgLT4gUHJvcGVydHlcblx0dmFyIGJ1ZmZlcldoaWxlID0gX193ZWJwYWNrX3JlcXVpcmVfXyg1NSk7XG5cdE9ic2VydmFibGUucHJvdG90eXBlLmJ1ZmZlcldoaWxlID0gZnVuY3Rpb24gKGZuLCBvcHRpb25zKSB7XG5cdCAgcmV0dXJuIGJ1ZmZlcldoaWxlKHRoaXMsIGZuLCBvcHRpb25zKTtcblx0fTtcblxuXHQvLyAoU3RyZWFtLCBudW1iZXIpIC0+IFN0cmVhbVxuXHQvLyAoUHJvcGVydHksIG51bWJlcikgLT4gUHJvcGVydHlcblx0dmFyIGJ1ZmZlcldpdGhDb3VudCA9IF9fd2VicGFja19yZXF1aXJlX18oNTYpO1xuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS5idWZmZXJXaXRoQ291bnQgPSBmdW5jdGlvbiAoY291bnQsIG9wdGlvbnMpIHtcblx0ICByZXR1cm4gYnVmZmVyV2l0aENvdW50KHRoaXMsIGNvdW50LCBvcHRpb25zKTtcblx0fTtcblxuXHQvLyBPcHRpb25zID0ge2ZsdXNoT25FbmQ6IGJvb2xlYW58dW5kZWZpbmVkfVxuXHQvLyAoU3RyZWFtLCBudW1iZXIsIG51bWJlciwgT3B0aW9uc3x1bmRlZmluZWQpIC0+IFN0cmVhbVxuXHQvLyAoUHJvcGVydHksIG51bWJlciwgbnVtYmVyLCBPcHRpb25zfHVuZGVmaW5lZCkgLT4gUHJvcGVydHlcblx0dmFyIGJ1ZmZlcldpdGhUaW1lT3JDb3VudCA9IF9fd2VicGFja19yZXF1aXJlX18oNTcpO1xuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS5idWZmZXJXaXRoVGltZU9yQ291bnQgPSBmdW5jdGlvbiAod2FpdCwgY291bnQsIG9wdGlvbnMpIHtcblx0ICByZXR1cm4gYnVmZmVyV2l0aFRpbWVPckNvdW50KHRoaXMsIHdhaXQsIGNvdW50LCBvcHRpb25zKTtcblx0fTtcblxuXHQvLyAoU3RyZWFtLCBGdW5jdGlvbikgLT4gU3RyZWFtXG5cdC8vIChQcm9wZXJ0eSwgRnVuY3Rpb24pIC0+IFByb3BlcnR5XG5cdHZhciB0cmFuc2R1Y2UgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDU4KTtcblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUudHJhbnNkdWNlID0gZnVuY3Rpb24gKHRyYW5zZHVjZXIpIHtcblx0ICByZXR1cm4gdHJhbnNkdWNlKHRoaXMsIHRyYW5zZHVjZXIpO1xuXHR9O1xuXG5cdC8vIChTdHJlYW0sIEZ1bmN0aW9uKSAtPiBTdHJlYW1cblx0Ly8gKFByb3BlcnR5LCBGdW5jdGlvbikgLT4gUHJvcGVydHlcblx0dmFyIHdpdGhIYW5kbGVyID0gX193ZWJwYWNrX3JlcXVpcmVfXyg1OSk7XG5cdE9ic2VydmFibGUucHJvdG90eXBlLndpdGhIYW5kbGVyID0gZnVuY3Rpb24gKGZuKSB7XG5cdCAgcmV0dXJuIHdpdGhIYW5kbGVyKHRoaXMsIGZuKTtcblx0fTtcblxuXHQvLyBDb21iaW5lIG9ic2VydmFibGVzXG5cdC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cblx0Ly8gKEFycmF5PFN0cmVhbXxQcm9wZXJ0eT4sIEZ1bmN0aW9ufHVuZGVmaWVuZCkgLT4gU3RyZWFtXG5cdC8vIChBcnJheTxTdHJlYW18UHJvcGVydHk+LCBBcnJheTxTdHJlYW18UHJvcGVydHk+LCBGdW5jdGlvbnx1bmRlZmllbmQpIC0+IFN0cmVhbVxuXHR2YXIgY29tYmluZSA9IEtlZmlyLmNvbWJpbmUgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDYwKTtcblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUuY29tYmluZSA9IGZ1bmN0aW9uIChvdGhlciwgY29tYmluYXRvcikge1xuXHQgIHJldHVybiBjb21iaW5lKFt0aGlzLCBvdGhlcl0sIGNvbWJpbmF0b3IpO1xuXHR9O1xuXG5cdC8vIChBcnJheTxTdHJlYW18UHJvcGVydHk+LCBGdW5jdGlvbnx1bmRlZmllbmQpIC0+IFN0cmVhbVxuXHR2YXIgemlwID0gS2VmaXIuemlwID0gX193ZWJwYWNrX3JlcXVpcmVfXyg2MSk7XG5cdE9ic2VydmFibGUucHJvdG90eXBlLnppcCA9IGZ1bmN0aW9uIChvdGhlciwgY29tYmluYXRvcikge1xuXHQgIHJldHVybiB6aXAoW3RoaXMsIG90aGVyXSwgY29tYmluYXRvcik7XG5cdH07XG5cblx0Ly8gKEFycmF5PFN0cmVhbXxQcm9wZXJ0eT4pIC0+IFN0cmVhbVxuXHR2YXIgbWVyZ2UgPSBLZWZpci5tZXJnZSA9IF9fd2VicGFja19yZXF1aXJlX18oNjIpO1xuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS5tZXJnZSA9IGZ1bmN0aW9uIChvdGhlcikge1xuXHQgIHJldHVybiBtZXJnZShbdGhpcywgb3RoZXJdKTtcblx0fTtcblxuXHQvLyAoQXJyYXk8U3RyZWFtfFByb3BlcnR5PikgLT4gU3RyZWFtXG5cdHZhciBjb25jYXQgPSBLZWZpci5jb25jYXQgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDY0KTtcblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUuY29uY2F0ID0gZnVuY3Rpb24gKG90aGVyKSB7XG5cdCAgcmV0dXJuIGNvbmNhdChbdGhpcywgb3RoZXJdKTtcblx0fTtcblxuXHQvLyAoKSAtPiBQb29sXG5cdHZhciBQb29sID0gS2VmaXIuUG9vbCA9IF9fd2VicGFja19yZXF1aXJlX18oNjYpO1xuXHRLZWZpci5wb29sID0gZnVuY3Rpb24gKCkge1xuXHQgIHJldHVybiBuZXcgUG9vbCgpO1xuXHR9O1xuXG5cdC8vIChGdW5jdGlvbikgLT4gU3RyZWFtXG5cdEtlZmlyLnJlcGVhdCA9IF9fd2VicGFja19yZXF1aXJlX18oNjUpO1xuXG5cdC8vIE9wdGlvbnMgPSB7Y29uY3VyTGltOiBudW1iZXJ8dW5kZWZpbmVkLCBxdWV1ZUxpbTogbnVtYmVyfHVuZGVmaW5lZCwgZHJvcDogJ29sZCd8J25ldyd8dW5kZWZpZW5kfVxuXHQvLyAoU3RyZWFtfFByb3BlcnR5LCBGdW5jdGlvbnxmYWxzZXksIE9wdGlvbnN8dW5kZWZpbmVkKSAtPiBTdHJlYW1cblx0dmFyIEZsYXRNYXAgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDY3KTtcblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUuZmxhdE1hcCA9IGZ1bmN0aW9uIChmbikge1xuXHQgIHJldHVybiBuZXcgRmxhdE1hcCh0aGlzLCBmbikuc2V0TmFtZSh0aGlzLCAnZmxhdE1hcCcpO1xuXHR9O1xuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS5mbGF0TWFwTGF0ZXN0ID0gZnVuY3Rpb24gKGZuKSB7XG5cdCAgcmV0dXJuIG5ldyBGbGF0TWFwKHRoaXMsIGZuLCB7IGNvbmN1ckxpbTogMSwgZHJvcDogJ29sZCcgfSkuc2V0TmFtZSh0aGlzLCAnZmxhdE1hcExhdGVzdCcpO1xuXHR9O1xuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS5mbGF0TWFwRmlyc3QgPSBmdW5jdGlvbiAoZm4pIHtcblx0ICByZXR1cm4gbmV3IEZsYXRNYXAodGhpcywgZm4sIHsgY29uY3VyTGltOiAxIH0pLnNldE5hbWUodGhpcywgJ2ZsYXRNYXBGaXJzdCcpO1xuXHR9O1xuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS5mbGF0TWFwQ29uY2F0ID0gZnVuY3Rpb24gKGZuKSB7XG5cdCAgcmV0dXJuIG5ldyBGbGF0TWFwKHRoaXMsIGZuLCB7IHF1ZXVlTGltOiAtMSwgY29uY3VyTGltOiAxIH0pLnNldE5hbWUodGhpcywgJ2ZsYXRNYXBDb25jYXQnKTtcblx0fTtcblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUuZmxhdE1hcENvbmN1ckxpbWl0ID0gZnVuY3Rpb24gKGZuLCBsaW1pdCkge1xuXHQgIHJldHVybiBuZXcgRmxhdE1hcCh0aGlzLCBmbiwgeyBxdWV1ZUxpbTogLTEsIGNvbmN1ckxpbTogbGltaXQgfSkuc2V0TmFtZSh0aGlzLCAnZmxhdE1hcENvbmN1ckxpbWl0Jyk7XG5cdH07XG5cblx0Ly8gKFN0cmVhbXxQcm9wZXJ0eSwgRnVuY3Rpb258ZmFsc2V5KSAtPiBTdHJlYW1cblx0dmFyIEZsYXRNYXBFcnJvcnMgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDY4KTtcblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUuZmxhdE1hcEVycm9ycyA9IGZ1bmN0aW9uIChmbikge1xuXHQgIHJldHVybiBuZXcgRmxhdE1hcEVycm9ycyh0aGlzLCBmbikuc2V0TmFtZSh0aGlzLCAnZmxhdE1hcEVycm9ycycpO1xuXHR9O1xuXG5cdC8vIENvbWJpbmUgdHdvIG9ic2VydmFibGVzXG5cdC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cblx0Ly8gKFN0cmVhbSwgU3RyZWFtfFByb3BlcnR5KSAtPiBTdHJlYW1cblx0Ly8gKFByb3BlcnR5LCBTdHJlYW18UHJvcGVydHkpIC0+IFByb3BlcnR5XG5cdHZhciBmaWx0ZXJCeSA9IF9fd2VicGFja19yZXF1aXJlX18oNjkpO1xuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS5maWx0ZXJCeSA9IGZ1bmN0aW9uIChvdGhlcikge1xuXHQgIHJldHVybiBmaWx0ZXJCeSh0aGlzLCBvdGhlcik7XG5cdH07XG5cblx0Ly8gKFN0cmVhbSwgU3RyZWFtfFByb3BlcnR5LCBGdW5jdGlvbnx1bmRlZmllbmQpIC0+IFN0cmVhbVxuXHQvLyAoUHJvcGVydHksIFN0cmVhbXxQcm9wZXJ0eSwgRnVuY3Rpb258dW5kZWZpZW5kKSAtPiBQcm9wZXJ0eVxuXHR2YXIgc2FtcGxlZEJ5Mml0ZW1zID0gX193ZWJwYWNrX3JlcXVpcmVfXyg3MSk7XG5cdE9ic2VydmFibGUucHJvdG90eXBlLnNhbXBsZWRCeSA9IGZ1bmN0aW9uIChvdGhlciwgY29tYmluYXRvcikge1xuXHQgIHJldHVybiBzYW1wbGVkQnkyaXRlbXModGhpcywgb3RoZXIsIGNvbWJpbmF0b3IpO1xuXHR9O1xuXG5cdC8vIChTdHJlYW0sIFN0cmVhbXxQcm9wZXJ0eSkgLT4gU3RyZWFtXG5cdC8vIChQcm9wZXJ0eSwgU3RyZWFtfFByb3BlcnR5KSAtPiBQcm9wZXJ0eVxuXHR2YXIgc2tpcFVudGlsQnkgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDcyKTtcblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUuc2tpcFVudGlsQnkgPSBmdW5jdGlvbiAob3RoZXIpIHtcblx0ICByZXR1cm4gc2tpcFVudGlsQnkodGhpcywgb3RoZXIpO1xuXHR9O1xuXG5cdC8vIChTdHJlYW0sIFN0cmVhbXxQcm9wZXJ0eSkgLT4gU3RyZWFtXG5cdC8vIChQcm9wZXJ0eSwgU3RyZWFtfFByb3BlcnR5KSAtPiBQcm9wZXJ0eVxuXHR2YXIgdGFrZVVudGlsQnkgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDczKTtcblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUudGFrZVVudGlsQnkgPSBmdW5jdGlvbiAob3RoZXIpIHtcblx0ICByZXR1cm4gdGFrZVVudGlsQnkodGhpcywgb3RoZXIpO1xuXHR9O1xuXG5cdC8vIE9wdGlvbnMgPSB7Zmx1c2hPbkVuZDogYm9vbGVhbnx1bmRlZmluZWR9XG5cdC8vIChTdHJlYW0sIFN0cmVhbXxQcm9wZXJ0eSwgT3B0aW9uc3x1bmRlZmluZWQpIC0+IFN0cmVhbVxuXHQvLyAoUHJvcGVydHksIFN0cmVhbXxQcm9wZXJ0eSwgT3B0aW9uc3x1bmRlZmluZWQpIC0+IFByb3BlcnR5XG5cdHZhciBidWZmZXJCeSA9IF9fd2VicGFja19yZXF1aXJlX18oNzQpO1xuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS5idWZmZXJCeSA9IGZ1bmN0aW9uIChvdGhlciwgb3B0aW9ucykge1xuXHQgIHJldHVybiBidWZmZXJCeSh0aGlzLCBvdGhlciwgb3B0aW9ucyk7XG5cdH07XG5cblx0Ly8gT3B0aW9ucyA9IHtmbHVzaE9uRW5kOiBib29sZWFufHVuZGVmaW5lZH1cblx0Ly8gKFN0cmVhbSwgU3RyZWFtfFByb3BlcnR5LCBPcHRpb25zfHVuZGVmaW5lZCkgLT4gU3RyZWFtXG5cdC8vIChQcm9wZXJ0eSwgU3RyZWFtfFByb3BlcnR5LCBPcHRpb25zfHVuZGVmaW5lZCkgLT4gUHJvcGVydHlcblx0dmFyIGJ1ZmZlcldoaWxlQnkgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDc1KTtcblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUuYnVmZmVyV2hpbGVCeSA9IGZ1bmN0aW9uIChvdGhlciwgb3B0aW9ucykge1xuXHQgIHJldHVybiBidWZmZXJXaGlsZUJ5KHRoaXMsIG90aGVyLCBvcHRpb25zKTtcblx0fTtcblxuXHQvLyBEZXByZWNhdGVkXG5cdC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cblx0ZnVuY3Rpb24gd2Fybihtc2cpIHtcblx0ICBpZiAoS2VmaXIuREVQUkVDQVRJT05fV0FSTklOR1MgIT09IGZhbHNlICYmIGNvbnNvbGUgJiYgdHlwZW9mIGNvbnNvbGUud2FybiA9PT0gJ2Z1bmN0aW9uJykge1xuXHQgICAgdmFyIG1zZzIgPSAnXFxuSGVyZSBpcyBhbiBFcnJvciBvYmplY3QgZm9yIHlvdSBjb250YWluaW5nIHRoZSBjYWxsIHN0YWNrOic7XG5cdCAgICBjb25zb2xlLndhcm4obXNnLCBtc2cyLCBuZXcgRXJyb3IoKSk7XG5cdCAgfVxuXHR9XG5cblx0Ly8gKFN0cmVhbXxQcm9wZXJ0eSwgU3RyZWFtfFByb3BlcnR5KSAtPiBQcm9wZXJ0eVxuXHR2YXIgYXdhaXRpbmcgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDc2KTtcblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUuYXdhaXRpbmcgPSBmdW5jdGlvbiAob3RoZXIpIHtcblx0ICB3YXJuKCdZb3UgYXJlIHVzaW5nIGRlcHJlY2F0ZWQgLmF3YWl0aW5nKCkgbWV0aG9kLCBzZWUgaHR0cHM6Ly9naXRodWIuY29tL3Jwb21pbm92L2tlZmlyL2lzc3Vlcy8xNDUnKTtcblx0ICByZXR1cm4gYXdhaXRpbmcodGhpcywgb3RoZXIpO1xuXHR9O1xuXG5cdC8vIChTdHJlYW0sIEZ1bmN0aW9ufHVuZGVmaW5lZCkgLT4gU3RyZWFtXG5cdC8vIChQcm9wZXJ0eSwgRnVuY3Rpb258dW5kZWZpbmVkKSAtPiBQcm9wZXJ0eVxuXHR2YXIgdmFsdWVzVG9FcnJvcnMgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDc3KTtcblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUudmFsdWVzVG9FcnJvcnMgPSBmdW5jdGlvbiAoZm4pIHtcblx0ICB3YXJuKCdZb3UgYXJlIHVzaW5nIGRlcHJlY2F0ZWQgLnZhbHVlc1RvRXJyb3JzKCkgbWV0aG9kLCBzZWUgaHR0cHM6Ly9naXRodWIuY29tL3Jwb21pbm92L2tlZmlyL2lzc3Vlcy8xNDknKTtcblx0ICByZXR1cm4gdmFsdWVzVG9FcnJvcnModGhpcywgZm4pO1xuXHR9O1xuXG5cdC8vIChTdHJlYW0sIEZ1bmN0aW9ufHVuZGVmaW5lZCkgLT4gU3RyZWFtXG5cdC8vIChQcm9wZXJ0eSwgRnVuY3Rpb258dW5kZWZpbmVkKSAtPiBQcm9wZXJ0eVxuXHR2YXIgZXJyb3JzVG9WYWx1ZXMgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDc4KTtcblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUuZXJyb3JzVG9WYWx1ZXMgPSBmdW5jdGlvbiAoZm4pIHtcblx0ICB3YXJuKCdZb3UgYXJlIHVzaW5nIGRlcHJlY2F0ZWQgLmVycm9yc1RvVmFsdWVzKCkgbWV0aG9kLCBzZWUgaHR0cHM6Ly9naXRodWIuY29tL3Jwb21pbm92L2tlZmlyL2lzc3Vlcy8xNDknKTtcblx0ICByZXR1cm4gZXJyb3JzVG9WYWx1ZXModGhpcywgZm4pO1xuXHR9O1xuXG5cdC8vIChTdHJlYW0pIC0+IFN0cmVhbVxuXHQvLyAoUHJvcGVydHkpIC0+IFByb3BlcnR5XG5cdHZhciBlbmRPbkVycm9yID0gX193ZWJwYWNrX3JlcXVpcmVfXyg3OSk7XG5cdE9ic2VydmFibGUucHJvdG90eXBlLmVuZE9uRXJyb3IgPSBmdW5jdGlvbiAoKSB7XG5cdCAgd2FybignWW91IGFyZSB1c2luZyBkZXByZWNhdGVkIC5lbmRPbkVycm9yKCkgbWV0aG9kLCBzZWUgaHR0cHM6Ly9naXRodWIuY29tL3Jwb21pbm92L2tlZmlyL2lzc3Vlcy8xNTAnKTtcblx0ICByZXR1cm4gZW5kT25FcnJvcih0aGlzKTtcblx0fTtcblxuLyoqKi8gfSxcbi8qIDEgKi9cbi8qKiovIGZ1bmN0aW9uKG1vZHVsZSwgZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXykge1xuXG5cdCd1c2Ugc3RyaWN0JztcblxuXHR2YXIgX3JlcXVpcmUgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDIpO1xuXG5cdHZhciBleHRlbmQgPSBfcmVxdWlyZS5leHRlbmQ7XG5cblx0dmFyIF9yZXF1aXJlMiA9IF9fd2VicGFja19yZXF1aXJlX18oMyk7XG5cblx0dmFyIFZBTFVFID0gX3JlcXVpcmUyLlZBTFVFO1xuXHR2YXIgRVJST1IgPSBfcmVxdWlyZTIuRVJST1I7XG5cdHZhciBBTlkgPSBfcmVxdWlyZTIuQU5ZO1xuXHR2YXIgRU5EID0gX3JlcXVpcmUyLkVORDtcblxuXHR2YXIgX3JlcXVpcmUzID0gX193ZWJwYWNrX3JlcXVpcmVfXyg0KTtcblxuXHR2YXIgRGlzcGF0Y2hlciA9IF9yZXF1aXJlMy5EaXNwYXRjaGVyO1xuXHR2YXIgY2FsbFN1YnNjcmliZXIgPSBfcmVxdWlyZTMuY2FsbFN1YnNjcmliZXI7XG5cblx0dmFyIF9yZXF1aXJlNCA9IF9fd2VicGFja19yZXF1aXJlX18oNSk7XG5cblx0dmFyIGZpbmRCeVByZWQgPSBfcmVxdWlyZTQuZmluZEJ5UHJlZDtcblxuXHRmdW5jdGlvbiBPYnNlcnZhYmxlKCkge1xuXHQgIHRoaXMuX2Rpc3BhdGNoZXIgPSBuZXcgRGlzcGF0Y2hlcigpO1xuXHQgIHRoaXMuX2FjdGl2ZSA9IGZhbHNlO1xuXHQgIHRoaXMuX2FsaXZlID0gdHJ1ZTtcblx0ICB0aGlzLl9hY3RpdmF0aW5nID0gZmFsc2U7XG5cdCAgdGhpcy5fbG9nSGFuZGxlcnMgPSBudWxsO1xuXHR9XG5cblx0ZXh0ZW5kKE9ic2VydmFibGUucHJvdG90eXBlLCB7XG5cblx0ICBfbmFtZTogJ29ic2VydmFibGUnLFxuXG5cdCAgX29uQWN0aXZhdGlvbjogZnVuY3Rpb24gX29uQWN0aXZhdGlvbigpIHt9LFxuXHQgIF9vbkRlYWN0aXZhdGlvbjogZnVuY3Rpb24gX29uRGVhY3RpdmF0aW9uKCkge30sXG5cblx0ICBfc2V0QWN0aXZlOiBmdW5jdGlvbiBfc2V0QWN0aXZlKGFjdGl2ZSkge1xuXHQgICAgaWYgKHRoaXMuX2FjdGl2ZSAhPT0gYWN0aXZlKSB7XG5cdCAgICAgIHRoaXMuX2FjdGl2ZSA9IGFjdGl2ZTtcblx0ICAgICAgaWYgKGFjdGl2ZSkge1xuXHQgICAgICAgIHRoaXMuX2FjdGl2YXRpbmcgPSB0cnVlO1xuXHQgICAgICAgIHRoaXMuX29uQWN0aXZhdGlvbigpO1xuXHQgICAgICAgIHRoaXMuX2FjdGl2YXRpbmcgPSBmYWxzZTtcblx0ICAgICAgfSBlbHNlIHtcblx0ICAgICAgICB0aGlzLl9vbkRlYWN0aXZhdGlvbigpO1xuXHQgICAgICB9XG5cdCAgICB9XG5cdCAgfSxcblxuXHQgIF9jbGVhcjogZnVuY3Rpb24gX2NsZWFyKCkge1xuXHQgICAgdGhpcy5fc2V0QWN0aXZlKGZhbHNlKTtcblx0ICAgIHRoaXMuX2Rpc3BhdGNoZXIuY2xlYW51cCgpO1xuXHQgICAgdGhpcy5fZGlzcGF0Y2hlciA9IG51bGw7XG5cdCAgICB0aGlzLl9sb2dIYW5kbGVycyA9IG51bGw7XG5cdCAgfSxcblxuXHQgIF9lbWl0OiBmdW5jdGlvbiBfZW1pdCh0eXBlLCB4KSB7XG5cdCAgICBzd2l0Y2ggKHR5cGUpIHtcblx0ICAgICAgY2FzZSBWQUxVRTpcblx0ICAgICAgICByZXR1cm4gdGhpcy5fZW1pdFZhbHVlKHgpO1xuXHQgICAgICBjYXNlIEVSUk9SOlxuXHQgICAgICAgIHJldHVybiB0aGlzLl9lbWl0RXJyb3IoeCk7XG5cdCAgICAgIGNhc2UgRU5EOlxuXHQgICAgICAgIHJldHVybiB0aGlzLl9lbWl0RW5kKCk7XG5cdCAgICB9XG5cdCAgfSxcblxuXHQgIF9lbWl0VmFsdWU6IGZ1bmN0aW9uIF9lbWl0VmFsdWUodmFsdWUpIHtcblx0ICAgIGlmICh0aGlzLl9hbGl2ZSkge1xuXHQgICAgICB0aGlzLl9kaXNwYXRjaGVyLmRpc3BhdGNoKHsgdHlwZTogVkFMVUUsIHZhbHVlOiB2YWx1ZSB9KTtcblx0ICAgIH1cblx0ICB9LFxuXG5cdCAgX2VtaXRFcnJvcjogZnVuY3Rpb24gX2VtaXRFcnJvcih2YWx1ZSkge1xuXHQgICAgaWYgKHRoaXMuX2FsaXZlKSB7XG5cdCAgICAgIHRoaXMuX2Rpc3BhdGNoZXIuZGlzcGF0Y2goeyB0eXBlOiBFUlJPUiwgdmFsdWU6IHZhbHVlIH0pO1xuXHQgICAgfVxuXHQgIH0sXG5cblx0ICBfZW1pdEVuZDogZnVuY3Rpb24gX2VtaXRFbmQoKSB7XG5cdCAgICBpZiAodGhpcy5fYWxpdmUpIHtcblx0ICAgICAgdGhpcy5fYWxpdmUgPSBmYWxzZTtcblx0ICAgICAgdGhpcy5fZGlzcGF0Y2hlci5kaXNwYXRjaCh7IHR5cGU6IEVORCB9KTtcblx0ICAgICAgdGhpcy5fY2xlYXIoKTtcblx0ICAgIH1cblx0ICB9LFxuXG5cdCAgX29uOiBmdW5jdGlvbiBfb24odHlwZSwgZm4pIHtcblx0ICAgIGlmICh0aGlzLl9hbGl2ZSkge1xuXHQgICAgICB0aGlzLl9kaXNwYXRjaGVyLmFkZCh0eXBlLCBmbik7XG5cdCAgICAgIHRoaXMuX3NldEFjdGl2ZSh0cnVlKTtcblx0ICAgIH0gZWxzZSB7XG5cdCAgICAgIGNhbGxTdWJzY3JpYmVyKHR5cGUsIGZuLCB7IHR5cGU6IEVORCB9KTtcblx0ICAgIH1cblx0ICAgIHJldHVybiB0aGlzO1xuXHQgIH0sXG5cblx0ICBfb2ZmOiBmdW5jdGlvbiBfb2ZmKHR5cGUsIGZuKSB7XG5cdCAgICBpZiAodGhpcy5fYWxpdmUpIHtcblx0ICAgICAgdmFyIGNvdW50ID0gdGhpcy5fZGlzcGF0Y2hlci5yZW1vdmUodHlwZSwgZm4pO1xuXHQgICAgICBpZiAoY291bnQgPT09IDApIHtcblx0ICAgICAgICB0aGlzLl9zZXRBY3RpdmUoZmFsc2UpO1xuXHQgICAgICB9XG5cdCAgICB9XG5cdCAgICByZXR1cm4gdGhpcztcblx0ICB9LFxuXG5cdCAgb25WYWx1ZTogZnVuY3Rpb24gb25WYWx1ZShmbikge1xuXHQgICAgcmV0dXJuIHRoaXMuX29uKFZBTFVFLCBmbik7XG5cdCAgfSxcblx0ICBvbkVycm9yOiBmdW5jdGlvbiBvbkVycm9yKGZuKSB7XG5cdCAgICByZXR1cm4gdGhpcy5fb24oRVJST1IsIGZuKTtcblx0ICB9LFxuXHQgIG9uRW5kOiBmdW5jdGlvbiBvbkVuZChmbikge1xuXHQgICAgcmV0dXJuIHRoaXMuX29uKEVORCwgZm4pO1xuXHQgIH0sXG5cdCAgb25Bbnk6IGZ1bmN0aW9uIG9uQW55KGZuKSB7XG5cdCAgICByZXR1cm4gdGhpcy5fb24oQU5ZLCBmbik7XG5cdCAgfSxcblxuXHQgIG9mZlZhbHVlOiBmdW5jdGlvbiBvZmZWYWx1ZShmbikge1xuXHQgICAgcmV0dXJuIHRoaXMuX29mZihWQUxVRSwgZm4pO1xuXHQgIH0sXG5cdCAgb2ZmRXJyb3I6IGZ1bmN0aW9uIG9mZkVycm9yKGZuKSB7XG5cdCAgICByZXR1cm4gdGhpcy5fb2ZmKEVSUk9SLCBmbik7XG5cdCAgfSxcblx0ICBvZmZFbmQ6IGZ1bmN0aW9uIG9mZkVuZChmbikge1xuXHQgICAgcmV0dXJuIHRoaXMuX29mZihFTkQsIGZuKTtcblx0ICB9LFxuXHQgIG9mZkFueTogZnVuY3Rpb24gb2ZmQW55KGZuKSB7XG5cdCAgICByZXR1cm4gdGhpcy5fb2ZmKEFOWSwgZm4pO1xuXHQgIH0sXG5cblx0ICAvLyBBIGFuZCBCIG11c3QgYmUgc3ViY2xhc3NlcyBvZiBTdHJlYW0gYW5kIFByb3BlcnR5IChvcmRlciBkb2Vzbid0IG1hdHRlcilcblx0ICBfb2ZTYW1lVHlwZTogZnVuY3Rpb24gX29mU2FtZVR5cGUoQSwgQikge1xuXHQgICAgcmV0dXJuIEEucHJvdG90eXBlLmdldFR5cGUoKSA9PT0gdGhpcy5nZXRUeXBlKCkgPyBBIDogQjtcblx0ICB9LFxuXG5cdCAgc2V0TmFtZTogZnVuY3Rpb24gc2V0TmFtZShzb3VyY2VPYnMsIC8qIG9wdGlvbmFsICovc2VsZk5hbWUpIHtcblx0ICAgIHRoaXMuX25hbWUgPSBzZWxmTmFtZSA/IHNvdXJjZU9icy5fbmFtZSArICcuJyArIHNlbGZOYW1lIDogc291cmNlT2JzO1xuXHQgICAgcmV0dXJuIHRoaXM7XG5cdCAgfSxcblxuXHQgIGxvZzogZnVuY3Rpb24gbG9nKCkge1xuXHQgICAgdmFyIG5hbWUgPSBhcmd1bWVudHMubGVuZ3RoIDw9IDAgfHwgYXJndW1lbnRzWzBdID09PSB1bmRlZmluZWQgPyB0aGlzLnRvU3RyaW5nKCkgOiBhcmd1bWVudHNbMF07XG5cblx0ICAgIHZhciBpc0N1cnJlbnQgPSB1bmRlZmluZWQ7XG5cdCAgICB2YXIgaGFuZGxlciA9IGZ1bmN0aW9uIGhhbmRsZXIoZXZlbnQpIHtcblx0ICAgICAgdmFyIHR5cGUgPSAnPCcgKyBldmVudC50eXBlICsgKGlzQ3VycmVudCA/ICc6Y3VycmVudCcgOiAnJykgKyAnPic7XG5cdCAgICAgIGlmIChldmVudC50eXBlID09PSBFTkQpIHtcblx0ICAgICAgICBjb25zb2xlLmxvZyhuYW1lLCB0eXBlKTtcblx0ICAgICAgfSBlbHNlIHtcblx0ICAgICAgICBjb25zb2xlLmxvZyhuYW1lLCB0eXBlLCBldmVudC52YWx1ZSk7XG5cdCAgICAgIH1cblx0ICAgIH07XG5cblx0ICAgIGlmICh0aGlzLl9hbGl2ZSkge1xuXHQgICAgICBpZiAoIXRoaXMuX2xvZ0hhbmRsZXJzKSB7XG5cdCAgICAgICAgdGhpcy5fbG9nSGFuZGxlcnMgPSBbXTtcblx0ICAgICAgfVxuXHQgICAgICB0aGlzLl9sb2dIYW5kbGVycy5wdXNoKHsgbmFtZTogbmFtZSwgaGFuZGxlcjogaGFuZGxlciB9KTtcblx0ICAgIH1cblxuXHQgICAgaXNDdXJyZW50ID0gdHJ1ZTtcblx0ICAgIHRoaXMub25BbnkoaGFuZGxlcik7XG5cdCAgICBpc0N1cnJlbnQgPSBmYWxzZTtcblxuXHQgICAgcmV0dXJuIHRoaXM7XG5cdCAgfSxcblxuXHQgIG9mZkxvZzogZnVuY3Rpb24gb2ZmTG9nKCkge1xuXHQgICAgdmFyIG5hbWUgPSBhcmd1bWVudHMubGVuZ3RoIDw9IDAgfHwgYXJndW1lbnRzWzBdID09PSB1bmRlZmluZWQgPyB0aGlzLnRvU3RyaW5nKCkgOiBhcmd1bWVudHNbMF07XG5cblx0ICAgIGlmICh0aGlzLl9sb2dIYW5kbGVycykge1xuXHQgICAgICB2YXIgaGFuZGxlckluZGV4ID0gZmluZEJ5UHJlZCh0aGlzLl9sb2dIYW5kbGVycywgZnVuY3Rpb24gKG9iaikge1xuXHQgICAgICAgIHJldHVybiBvYmoubmFtZSA9PT0gbmFtZTtcblx0ICAgICAgfSk7XG5cdCAgICAgIGlmIChoYW5kbGVySW5kZXggIT09IC0xKSB7XG5cdCAgICAgICAgdGhpcy5vZmZBbnkodGhpcy5fbG9nSGFuZGxlcnNbaGFuZGxlckluZGV4XS5oYW5kbGVyKTtcblx0ICAgICAgICB0aGlzLl9sb2dIYW5kbGVycy5zcGxpY2UoaGFuZGxlckluZGV4LCAxKTtcblx0ICAgICAgfVxuXHQgICAgfVxuXG5cdCAgICByZXR1cm4gdGhpcztcblx0ICB9XG5cdH0pO1xuXG5cdC8vIGV4dGVuZCgpIGNhbid0IGhhbmRsZSBgdG9TdHJpbmdgIGluIElFOFxuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uICgpIHtcblx0ICByZXR1cm4gJ1snICsgdGhpcy5fbmFtZSArICddJztcblx0fTtcblxuXHRtb2R1bGUuZXhwb3J0cyA9IE9ic2VydmFibGU7XG5cbi8qKiovIH0sXG4vKiAyICovXG4vKioqLyBmdW5jdGlvbihtb2R1bGUsIGV4cG9ydHMpIHtcblxuXHRcInVzZSBzdHJpY3RcIjtcblxuXHRmdW5jdGlvbiBjcmVhdGVPYmoocHJvdG8pIHtcblx0ICB2YXIgRiA9IGZ1bmN0aW9uIEYoKSB7fTtcblx0ICBGLnByb3RvdHlwZSA9IHByb3RvO1xuXHQgIHJldHVybiBuZXcgRigpO1xuXHR9XG5cblx0ZnVuY3Rpb24gZXh0ZW5kKHRhcmdldCAvKiwgbWl4aW4xLCBtaXhpbjIuLi4qLykge1xuXHQgIHZhciBsZW5ndGggPSBhcmd1bWVudHMubGVuZ3RoLFxuXHQgICAgICBpID0gdW5kZWZpbmVkLFxuXHQgICAgICBwcm9wID0gdW5kZWZpbmVkO1xuXHQgIGZvciAoaSA9IDE7IGkgPCBsZW5ndGg7IGkrKykge1xuXHQgICAgZm9yIChwcm9wIGluIGFyZ3VtZW50c1tpXSkge1xuXHQgICAgICB0YXJnZXRbcHJvcF0gPSBhcmd1bWVudHNbaV1bcHJvcF07XG5cdCAgICB9XG5cdCAgfVxuXHQgIHJldHVybiB0YXJnZXQ7XG5cdH1cblxuXHRmdW5jdGlvbiBpbmhlcml0KENoaWxkLCBQYXJlbnQgLyosIG1peGluMSwgbWl4aW4yLi4uKi8pIHtcblx0ICB2YXIgbGVuZ3RoID0gYXJndW1lbnRzLmxlbmd0aCxcblx0ICAgICAgaSA9IHVuZGVmaW5lZDtcblx0ICBDaGlsZC5wcm90b3R5cGUgPSBjcmVhdGVPYmooUGFyZW50LnByb3RvdHlwZSk7XG5cdCAgQ2hpbGQucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gQ2hpbGQ7XG5cdCAgZm9yIChpID0gMjsgaSA8IGxlbmd0aDsgaSsrKSB7XG5cdCAgICBleHRlbmQoQ2hpbGQucHJvdG90eXBlLCBhcmd1bWVudHNbaV0pO1xuXHQgIH1cblx0ICByZXR1cm4gQ2hpbGQ7XG5cdH1cblxuXHRtb2R1bGUuZXhwb3J0cyA9IHsgZXh0ZW5kOiBleHRlbmQsIGluaGVyaXQ6IGluaGVyaXQgfTtcblxuLyoqKi8gfSxcbi8qIDMgKi9cbi8qKiovIGZ1bmN0aW9uKG1vZHVsZSwgZXhwb3J0cykge1xuXG5cdCd1c2Ugc3RyaWN0JztcblxuXHRleHBvcnRzLk5PVEhJTkcgPSBbJzxub3RoaW5nPiddO1xuXHRleHBvcnRzLkVORCA9ICdlbmQnO1xuXHRleHBvcnRzLlZBTFVFID0gJ3ZhbHVlJztcblx0ZXhwb3J0cy5FUlJPUiA9ICdlcnJvcic7XG5cdGV4cG9ydHMuQU5ZID0gJ2FueSc7XG5cbi8qKiovIH0sXG4vKiA0ICovXG4vKioqLyBmdW5jdGlvbihtb2R1bGUsIGV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pIHtcblxuXHQndXNlIHN0cmljdCc7XG5cblx0dmFyIF9yZXF1aXJlID0gX193ZWJwYWNrX3JlcXVpcmVfXygyKTtcblxuXHR2YXIgZXh0ZW5kID0gX3JlcXVpcmUuZXh0ZW5kO1xuXG5cdHZhciBfcmVxdWlyZTIgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDMpO1xuXG5cdHZhciBWQUxVRSA9IF9yZXF1aXJlMi5WQUxVRTtcblx0dmFyIEVSUk9SID0gX3JlcXVpcmUyLkVSUk9SO1xuXHR2YXIgQU5ZID0gX3JlcXVpcmUyLkFOWTtcblxuXHR2YXIgX3JlcXVpcmUzID0gX193ZWJwYWNrX3JlcXVpcmVfXyg1KTtcblxuXHR2YXIgY29uY2F0ID0gX3JlcXVpcmUzLmNvbmNhdDtcblx0dmFyIGZpbmRCeVByZWQgPSBfcmVxdWlyZTMuZmluZEJ5UHJlZDtcblx0dmFyIF9yZW1vdmUgPSBfcmVxdWlyZTMucmVtb3ZlO1xuXHR2YXIgY29udGFpbnMgPSBfcmVxdWlyZTMuY29udGFpbnM7XG5cblx0ZnVuY3Rpb24gY2FsbFN1YnNjcmliZXIodHlwZSwgZm4sIGV2ZW50KSB7XG5cdCAgaWYgKHR5cGUgPT09IEFOWSkge1xuXHQgICAgZm4oZXZlbnQpO1xuXHQgIH0gZWxzZSBpZiAodHlwZSA9PT0gZXZlbnQudHlwZSkge1xuXHQgICAgaWYgKHR5cGUgPT09IFZBTFVFIHx8IHR5cGUgPT09IEVSUk9SKSB7XG5cdCAgICAgIGZuKGV2ZW50LnZhbHVlKTtcblx0ICAgIH0gZWxzZSB7XG5cdCAgICAgIGZuKCk7XG5cdCAgICB9XG5cdCAgfVxuXHR9XG5cblx0ZnVuY3Rpb24gRGlzcGF0Y2hlcigpIHtcblx0ICB0aGlzLl9pdGVtcyA9IFtdO1xuXHQgIHRoaXMuX2luTG9vcCA9IDA7XG5cdCAgdGhpcy5fcmVtb3ZlZEl0ZW1zID0gbnVsbDtcblx0fVxuXG5cdGV4dGVuZChEaXNwYXRjaGVyLnByb3RvdHlwZSwge1xuXG5cdCAgYWRkOiBmdW5jdGlvbiBhZGQodHlwZSwgZm4pIHtcblx0ICAgIHRoaXMuX2l0ZW1zID0gY29uY2F0KHRoaXMuX2l0ZW1zLCBbeyB0eXBlOiB0eXBlLCBmbjogZm4gfV0pO1xuXHQgICAgcmV0dXJuIHRoaXMuX2l0ZW1zLmxlbmd0aDtcblx0ICB9LFxuXG5cdCAgcmVtb3ZlOiBmdW5jdGlvbiByZW1vdmUodHlwZSwgZm4pIHtcblx0ICAgIHZhciBpbmRleCA9IGZpbmRCeVByZWQodGhpcy5faXRlbXMsIGZ1bmN0aW9uICh4KSB7XG5cdCAgICAgIHJldHVybiB4LnR5cGUgPT09IHR5cGUgJiYgeC5mbiA9PT0gZm47XG5cdCAgICB9KTtcblxuXHQgICAgLy8gaWYgd2UncmUgY3VycmVudGx5IGluIGEgbm90aWZpY2F0aW9uIGxvb3AsXG5cdCAgICAvLyByZW1lbWJlciB0aGlzIHN1YnNjcmliZXIgd2FzIHJlbW92ZWRcblx0ICAgIGlmICh0aGlzLl9pbkxvb3AgIT09IDAgJiYgaW5kZXggIT09IC0xKSB7XG5cdCAgICAgIGlmICh0aGlzLl9yZW1vdmVkSXRlbXMgPT09IG51bGwpIHtcblx0ICAgICAgICB0aGlzLl9yZW1vdmVkSXRlbXMgPSBbXTtcblx0ICAgICAgfVxuXHQgICAgICB0aGlzLl9yZW1vdmVkSXRlbXMucHVzaCh0aGlzLl9pdGVtc1tpbmRleF0pO1xuXHQgICAgfVxuXG5cdCAgICB0aGlzLl9pdGVtcyA9IF9yZW1vdmUodGhpcy5faXRlbXMsIGluZGV4KTtcblx0ICAgIHJldHVybiB0aGlzLl9pdGVtcy5sZW5ndGg7XG5cdCAgfSxcblxuXHQgIGRpc3BhdGNoOiBmdW5jdGlvbiBkaXNwYXRjaChldmVudCkge1xuXHQgICAgdGhpcy5faW5Mb29wKys7XG5cdCAgICBmb3IgKHZhciBpID0gMCwgaXRlbXMgPSB0aGlzLl9pdGVtczsgaSA8IGl0ZW1zLmxlbmd0aDsgaSsrKSB7XG5cblx0ICAgICAgLy8gY2xlYW51cCB3YXMgY2FsbGVkXG5cdCAgICAgIGlmICh0aGlzLl9pdGVtcyA9PT0gbnVsbCkge1xuXHQgICAgICAgIGJyZWFrO1xuXHQgICAgICB9XG5cblx0ICAgICAgLy8gdGhpcyBzdWJzY3JpYmVyIHdhcyByZW1vdmVkXG5cdCAgICAgIGlmICh0aGlzLl9yZW1vdmVkSXRlbXMgIT09IG51bGwgJiYgY29udGFpbnModGhpcy5fcmVtb3ZlZEl0ZW1zLCBpdGVtc1tpXSkpIHtcblx0ICAgICAgICBjb250aW51ZTtcblx0ICAgICAgfVxuXG5cdCAgICAgIGNhbGxTdWJzY3JpYmVyKGl0ZW1zW2ldLnR5cGUsIGl0ZW1zW2ldLmZuLCBldmVudCk7XG5cdCAgICB9XG5cdCAgICB0aGlzLl9pbkxvb3AtLTtcblx0ICAgIGlmICh0aGlzLl9pbkxvb3AgPT09IDApIHtcblx0ICAgICAgdGhpcy5fcmVtb3ZlZEl0ZW1zID0gbnVsbDtcblx0ICAgIH1cblx0ICB9LFxuXG5cdCAgY2xlYW51cDogZnVuY3Rpb24gY2xlYW51cCgpIHtcblx0ICAgIHRoaXMuX2l0ZW1zID0gbnVsbDtcblx0ICB9XG5cblx0fSk7XG5cblx0bW9kdWxlLmV4cG9ydHMgPSB7IGNhbGxTdWJzY3JpYmVyOiBjYWxsU3Vic2NyaWJlciwgRGlzcGF0Y2hlcjogRGlzcGF0Y2hlciB9O1xuXG4vKioqLyB9LFxuLyogNSAqL1xuLyoqKi8gZnVuY3Rpb24obW9kdWxlLCBleHBvcnRzKSB7XG5cblx0XCJ1c2Ugc3RyaWN0XCI7XG5cblx0ZnVuY3Rpb24gY29uY2F0KGEsIGIpIHtcblx0ICB2YXIgcmVzdWx0ID0gdW5kZWZpbmVkLFxuXHQgICAgICBsZW5ndGggPSB1bmRlZmluZWQsXG5cdCAgICAgIGkgPSB1bmRlZmluZWQsXG5cdCAgICAgIGogPSB1bmRlZmluZWQ7XG5cdCAgaWYgKGEubGVuZ3RoID09PSAwKSB7XG5cdCAgICByZXR1cm4gYjtcblx0ICB9XG5cdCAgaWYgKGIubGVuZ3RoID09PSAwKSB7XG5cdCAgICByZXR1cm4gYTtcblx0ICB9XG5cdCAgaiA9IDA7XG5cdCAgcmVzdWx0ID0gbmV3IEFycmF5KGEubGVuZ3RoICsgYi5sZW5ndGgpO1xuXHQgIGxlbmd0aCA9IGEubGVuZ3RoO1xuXHQgIGZvciAoaSA9IDA7IGkgPCBsZW5ndGg7IGkrKywgaisrKSB7XG5cdCAgICByZXN1bHRbal0gPSBhW2ldO1xuXHQgIH1cblx0ICBsZW5ndGggPSBiLmxlbmd0aDtcblx0ICBmb3IgKGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyssIGorKykge1xuXHQgICAgcmVzdWx0W2pdID0gYltpXTtcblx0ICB9XG5cdCAgcmV0dXJuIHJlc3VsdDtcblx0fVxuXG5cdGZ1bmN0aW9uIGNpcmNsZVNoaWZ0KGFyciwgZGlzdGFuY2UpIHtcblx0ICB2YXIgbGVuZ3RoID0gYXJyLmxlbmd0aCxcblx0ICAgICAgcmVzdWx0ID0gbmV3IEFycmF5KGxlbmd0aCksXG5cdCAgICAgIGkgPSB1bmRlZmluZWQ7XG5cdCAgZm9yIChpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG5cdCAgICByZXN1bHRbKGkgKyBkaXN0YW5jZSkgJSBsZW5ndGhdID0gYXJyW2ldO1xuXHQgIH1cblx0ICByZXR1cm4gcmVzdWx0O1xuXHR9XG5cblx0ZnVuY3Rpb24gZmluZChhcnIsIHZhbHVlKSB7XG5cdCAgdmFyIGxlbmd0aCA9IGFyci5sZW5ndGgsXG5cdCAgICAgIGkgPSB1bmRlZmluZWQ7XG5cdCAgZm9yIChpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG5cdCAgICBpZiAoYXJyW2ldID09PSB2YWx1ZSkge1xuXHQgICAgICByZXR1cm4gaTtcblx0ICAgIH1cblx0ICB9XG5cdCAgcmV0dXJuIC0xO1xuXHR9XG5cblx0ZnVuY3Rpb24gZmluZEJ5UHJlZChhcnIsIHByZWQpIHtcblx0ICB2YXIgbGVuZ3RoID0gYXJyLmxlbmd0aCxcblx0ICAgICAgaSA9IHVuZGVmaW5lZDtcblx0ICBmb3IgKGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcblx0ICAgIGlmIChwcmVkKGFycltpXSkpIHtcblx0ICAgICAgcmV0dXJuIGk7XG5cdCAgICB9XG5cdCAgfVxuXHQgIHJldHVybiAtMTtcblx0fVxuXG5cdGZ1bmN0aW9uIGNsb25lQXJyYXkoaW5wdXQpIHtcblx0ICB2YXIgbGVuZ3RoID0gaW5wdXQubGVuZ3RoLFxuXHQgICAgICByZXN1bHQgPSBuZXcgQXJyYXkobGVuZ3RoKSxcblx0ICAgICAgaSA9IHVuZGVmaW5lZDtcblx0ICBmb3IgKGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcblx0ICAgIHJlc3VsdFtpXSA9IGlucHV0W2ldO1xuXHQgIH1cblx0ICByZXR1cm4gcmVzdWx0O1xuXHR9XG5cblx0ZnVuY3Rpb24gcmVtb3ZlKGlucHV0LCBpbmRleCkge1xuXHQgIHZhciBsZW5ndGggPSBpbnB1dC5sZW5ndGgsXG5cdCAgICAgIHJlc3VsdCA9IHVuZGVmaW5lZCxcblx0ICAgICAgaSA9IHVuZGVmaW5lZCxcblx0ICAgICAgaiA9IHVuZGVmaW5lZDtcblx0ICBpZiAoaW5kZXggPj0gMCAmJiBpbmRleCA8IGxlbmd0aCkge1xuXHQgICAgaWYgKGxlbmd0aCA9PT0gMSkge1xuXHQgICAgICByZXR1cm4gW107XG5cdCAgICB9IGVsc2Uge1xuXHQgICAgICByZXN1bHQgPSBuZXcgQXJyYXkobGVuZ3RoIC0gMSk7XG5cdCAgICAgIGZvciAoaSA9IDAsIGogPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcblx0ICAgICAgICBpZiAoaSAhPT0gaW5kZXgpIHtcblx0ICAgICAgICAgIHJlc3VsdFtqXSA9IGlucHV0W2ldO1xuXHQgICAgICAgICAgaisrO1xuXHQgICAgICAgIH1cblx0ICAgICAgfVxuXHQgICAgICByZXR1cm4gcmVzdWx0O1xuXHQgICAgfVxuXHQgIH0gZWxzZSB7XG5cdCAgICByZXR1cm4gaW5wdXQ7XG5cdCAgfVxuXHR9XG5cblx0ZnVuY3Rpb24gcmVtb3ZlQnlQcmVkKGlucHV0LCBwcmVkKSB7XG5cdCAgcmV0dXJuIHJlbW92ZShpbnB1dCwgZmluZEJ5UHJlZChpbnB1dCwgcHJlZCkpO1xuXHR9XG5cblx0ZnVuY3Rpb24gbWFwKGlucHV0LCBmbikge1xuXHQgIHZhciBsZW5ndGggPSBpbnB1dC5sZW5ndGgsXG5cdCAgICAgIHJlc3VsdCA9IG5ldyBBcnJheShsZW5ndGgpLFxuXHQgICAgICBpID0gdW5kZWZpbmVkO1xuXHQgIGZvciAoaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuXHQgICAgcmVzdWx0W2ldID0gZm4oaW5wdXRbaV0pO1xuXHQgIH1cblx0ICByZXR1cm4gcmVzdWx0O1xuXHR9XG5cblx0ZnVuY3Rpb24gZm9yRWFjaChhcnIsIGZuKSB7XG5cdCAgdmFyIGxlbmd0aCA9IGFyci5sZW5ndGgsXG5cdCAgICAgIGkgPSB1bmRlZmluZWQ7XG5cdCAgZm9yIChpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG5cdCAgICBmbihhcnJbaV0pO1xuXHQgIH1cblx0fVxuXG5cdGZ1bmN0aW9uIGZpbGxBcnJheShhcnIsIHZhbHVlKSB7XG5cdCAgdmFyIGxlbmd0aCA9IGFyci5sZW5ndGgsXG5cdCAgICAgIGkgPSB1bmRlZmluZWQ7XG5cdCAgZm9yIChpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG5cdCAgICBhcnJbaV0gPSB2YWx1ZTtcblx0ICB9XG5cdH1cblxuXHRmdW5jdGlvbiBjb250YWlucyhhcnIsIHZhbHVlKSB7XG5cdCAgcmV0dXJuIGZpbmQoYXJyLCB2YWx1ZSkgIT09IC0xO1xuXHR9XG5cblx0ZnVuY3Rpb24gc2xpZGUoY3VyLCBuZXh0LCBtYXgpIHtcblx0ICB2YXIgbGVuZ3RoID0gTWF0aC5taW4obWF4LCBjdXIubGVuZ3RoICsgMSksXG5cdCAgICAgIG9mZnNldCA9IGN1ci5sZW5ndGggLSBsZW5ndGggKyAxLFxuXHQgICAgICByZXN1bHQgPSBuZXcgQXJyYXkobGVuZ3RoKSxcblx0ICAgICAgaSA9IHVuZGVmaW5lZDtcblx0ICBmb3IgKGkgPSBvZmZzZXQ7IGkgPCBsZW5ndGg7IGkrKykge1xuXHQgICAgcmVzdWx0W2kgLSBvZmZzZXRdID0gY3VyW2ldO1xuXHQgIH1cblx0ICByZXN1bHRbbGVuZ3RoIC0gMV0gPSBuZXh0O1xuXHQgIHJldHVybiByZXN1bHQ7XG5cdH1cblxuXHRtb2R1bGUuZXhwb3J0cyA9IHtcblx0ICBjb25jYXQ6IGNvbmNhdCxcblx0ICBjaXJjbGVTaGlmdDogY2lyY2xlU2hpZnQsXG5cdCAgZmluZDogZmluZCxcblx0ICBmaW5kQnlQcmVkOiBmaW5kQnlQcmVkLFxuXHQgIGNsb25lQXJyYXk6IGNsb25lQXJyYXksXG5cdCAgcmVtb3ZlOiByZW1vdmUsXG5cdCAgcmVtb3ZlQnlQcmVkOiByZW1vdmVCeVByZWQsXG5cdCAgbWFwOiBtYXAsXG5cdCAgZm9yRWFjaDogZm9yRWFjaCxcblx0ICBmaWxsQXJyYXk6IGZpbGxBcnJheSxcblx0ICBjb250YWluczogY29udGFpbnMsXG5cdCAgc2xpZGU6IHNsaWRlXG5cdH07XG5cbi8qKiovIH0sXG4vKiA2ICovXG4vKioqLyBmdW5jdGlvbihtb2R1bGUsIGV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pIHtcblxuXHQndXNlIHN0cmljdCc7XG5cblx0dmFyIF9yZXF1aXJlID0gX193ZWJwYWNrX3JlcXVpcmVfXygyKTtcblxuXHR2YXIgaW5oZXJpdCA9IF9yZXF1aXJlLmluaGVyaXQ7XG5cblx0dmFyIE9ic2VydmFibGUgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDEpO1xuXG5cdGZ1bmN0aW9uIFN0cmVhbSgpIHtcblx0ICBPYnNlcnZhYmxlLmNhbGwodGhpcyk7XG5cdH1cblxuXHRpbmhlcml0KFN0cmVhbSwgT2JzZXJ2YWJsZSwge1xuXG5cdCAgX25hbWU6ICdzdHJlYW0nLFxuXG5cdCAgZ2V0VHlwZTogZnVuY3Rpb24gZ2V0VHlwZSgpIHtcblx0ICAgIHJldHVybiAnc3RyZWFtJztcblx0ICB9XG5cblx0fSk7XG5cblx0bW9kdWxlLmV4cG9ydHMgPSBTdHJlYW07XG5cbi8qKiovIH0sXG4vKiA3ICovXG4vKioqLyBmdW5jdGlvbihtb2R1bGUsIGV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pIHtcblxuXHQndXNlIHN0cmljdCc7XG5cblx0dmFyIF9yZXF1aXJlID0gX193ZWJwYWNrX3JlcXVpcmVfXygyKTtcblxuXHR2YXIgaW5oZXJpdCA9IF9yZXF1aXJlLmluaGVyaXQ7XG5cblx0dmFyIF9yZXF1aXJlMiA9IF9fd2VicGFja19yZXF1aXJlX18oMyk7XG5cblx0dmFyIFZBTFVFID0gX3JlcXVpcmUyLlZBTFVFO1xuXHR2YXIgRVJST1IgPSBfcmVxdWlyZTIuRVJST1I7XG5cdHZhciBFTkQgPSBfcmVxdWlyZTIuRU5EO1xuXG5cdHZhciBfcmVxdWlyZTMgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDQpO1xuXG5cdHZhciBjYWxsU3Vic2NyaWJlciA9IF9yZXF1aXJlMy5jYWxsU3Vic2NyaWJlcjtcblxuXHR2YXIgT2JzZXJ2YWJsZSA9IF9fd2VicGFja19yZXF1aXJlX18oMSk7XG5cblx0ZnVuY3Rpb24gUHJvcGVydHkoKSB7XG5cdCAgT2JzZXJ2YWJsZS5jYWxsKHRoaXMpO1xuXHQgIHRoaXMuX2N1cnJlbnRFdmVudCA9IG51bGw7XG5cdH1cblxuXHRpbmhlcml0KFByb3BlcnR5LCBPYnNlcnZhYmxlLCB7XG5cblx0ICBfbmFtZTogJ3Byb3BlcnR5JyxcblxuXHQgIF9lbWl0VmFsdWU6IGZ1bmN0aW9uIF9lbWl0VmFsdWUodmFsdWUpIHtcblx0ICAgIGlmICh0aGlzLl9hbGl2ZSkge1xuXHQgICAgICB0aGlzLl9jdXJyZW50RXZlbnQgPSB7IHR5cGU6IFZBTFVFLCB2YWx1ZTogdmFsdWUgfTtcblx0ICAgICAgaWYgKCF0aGlzLl9hY3RpdmF0aW5nKSB7XG5cdCAgICAgICAgdGhpcy5fZGlzcGF0Y2hlci5kaXNwYXRjaCh7IHR5cGU6IFZBTFVFLCB2YWx1ZTogdmFsdWUgfSk7XG5cdCAgICAgIH1cblx0ICAgIH1cblx0ICB9LFxuXG5cdCAgX2VtaXRFcnJvcjogZnVuY3Rpb24gX2VtaXRFcnJvcih2YWx1ZSkge1xuXHQgICAgaWYgKHRoaXMuX2FsaXZlKSB7XG5cdCAgICAgIHRoaXMuX2N1cnJlbnRFdmVudCA9IHsgdHlwZTogRVJST1IsIHZhbHVlOiB2YWx1ZSB9O1xuXHQgICAgICBpZiAoIXRoaXMuX2FjdGl2YXRpbmcpIHtcblx0ICAgICAgICB0aGlzLl9kaXNwYXRjaGVyLmRpc3BhdGNoKHsgdHlwZTogRVJST1IsIHZhbHVlOiB2YWx1ZSB9KTtcblx0ICAgICAgfVxuXHQgICAgfVxuXHQgIH0sXG5cblx0ICBfZW1pdEVuZDogZnVuY3Rpb24gX2VtaXRFbmQoKSB7XG5cdCAgICBpZiAodGhpcy5fYWxpdmUpIHtcblx0ICAgICAgdGhpcy5fYWxpdmUgPSBmYWxzZTtcblx0ICAgICAgaWYgKCF0aGlzLl9hY3RpdmF0aW5nKSB7XG5cdCAgICAgICAgdGhpcy5fZGlzcGF0Y2hlci5kaXNwYXRjaCh7IHR5cGU6IEVORCB9KTtcblx0ICAgICAgfVxuXHQgICAgICB0aGlzLl9jbGVhcigpO1xuXHQgICAgfVxuXHQgIH0sXG5cblx0ICBfb246IGZ1bmN0aW9uIF9vbih0eXBlLCBmbikge1xuXHQgICAgaWYgKHRoaXMuX2FsaXZlKSB7XG5cdCAgICAgIHRoaXMuX2Rpc3BhdGNoZXIuYWRkKHR5cGUsIGZuKTtcblx0ICAgICAgdGhpcy5fc2V0QWN0aXZlKHRydWUpO1xuXHQgICAgfVxuXHQgICAgaWYgKHRoaXMuX2N1cnJlbnRFdmVudCAhPT0gbnVsbCkge1xuXHQgICAgICBjYWxsU3Vic2NyaWJlcih0eXBlLCBmbiwgdGhpcy5fY3VycmVudEV2ZW50KTtcblx0ICAgIH1cblx0ICAgIGlmICghdGhpcy5fYWxpdmUpIHtcblx0ICAgICAgY2FsbFN1YnNjcmliZXIodHlwZSwgZm4sIHsgdHlwZTogRU5EIH0pO1xuXHQgICAgfVxuXHQgICAgcmV0dXJuIHRoaXM7XG5cdCAgfSxcblxuXHQgIGdldFR5cGU6IGZ1bmN0aW9uIGdldFR5cGUoKSB7XG5cdCAgICByZXR1cm4gJ3Byb3BlcnR5Jztcblx0ICB9XG5cblx0fSk7XG5cblx0bW9kdWxlLmV4cG9ydHMgPSBQcm9wZXJ0eTtcblxuLyoqKi8gfSxcbi8qIDggKi9cbi8qKiovIGZ1bmN0aW9uKG1vZHVsZSwgZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXykge1xuXG5cdCd1c2Ugc3RyaWN0JztcblxuXHR2YXIgU3RyZWFtID0gX193ZWJwYWNrX3JlcXVpcmVfXyg2KTtcblxuXHR2YXIgbmV2ZXJTID0gbmV3IFN0cmVhbSgpO1xuXHRuZXZlclMuX2VtaXRFbmQoKTtcblx0bmV2ZXJTLl9uYW1lID0gJ25ldmVyJztcblxuXHRtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIG5ldmVyKCkge1xuXHQgIHJldHVybiBuZXZlclM7XG5cdH07XG5cbi8qKiovIH0sXG4vKiA5ICovXG4vKioqLyBmdW5jdGlvbihtb2R1bGUsIGV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pIHtcblxuXHQndXNlIHN0cmljdCc7XG5cblx0dmFyIHRpbWVCYXNlZCA9IF9fd2VicGFja19yZXF1aXJlX18oMTApO1xuXG5cdHZhciBTID0gdGltZUJhc2VkKHtcblxuXHQgIF9uYW1lOiAnbGF0ZXInLFxuXG5cdCAgX2luaXQ6IGZ1bmN0aW9uIF9pbml0KF9yZWYpIHtcblx0ICAgIHZhciB4ID0gX3JlZi54O1xuXG5cdCAgICB0aGlzLl94ID0geDtcblx0ICB9LFxuXG5cdCAgX2ZyZWU6IGZ1bmN0aW9uIF9mcmVlKCkge1xuXHQgICAgdGhpcy5feCA9IG51bGw7XG5cdCAgfSxcblxuXHQgIF9vblRpY2s6IGZ1bmN0aW9uIF9vblRpY2soKSB7XG5cdCAgICB0aGlzLl9lbWl0VmFsdWUodGhpcy5feCk7XG5cdCAgICB0aGlzLl9lbWl0RW5kKCk7XG5cdCAgfVxuXG5cdH0pO1xuXG5cdG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gbGF0ZXIod2FpdCwgeCkge1xuXHQgIHJldHVybiBuZXcgUyh3YWl0LCB7IHg6IHggfSk7XG5cdH07XG5cbi8qKiovIH0sXG4vKiAxMCAqL1xuLyoqKi8gZnVuY3Rpb24obW9kdWxlLCBleHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKSB7XG5cblx0J3VzZSBzdHJpY3QnO1xuXG5cdHZhciBfcmVxdWlyZSA9IF9fd2VicGFja19yZXF1aXJlX18oMik7XG5cblx0dmFyIGluaGVyaXQgPSBfcmVxdWlyZS5pbmhlcml0O1xuXG5cdHZhciBTdHJlYW0gPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDYpO1xuXG5cdG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gdGltZUJhc2VkKG1peGluKSB7XG5cblx0ICBmdW5jdGlvbiBBbm9ueW1vdXNTdHJlYW0od2FpdCwgb3B0aW9ucykge1xuXHQgICAgdmFyIF90aGlzID0gdGhpcztcblxuXHQgICAgU3RyZWFtLmNhbGwodGhpcyk7XG5cdCAgICB0aGlzLl93YWl0ID0gd2FpdDtcblx0ICAgIHRoaXMuX2ludGVydmFsSWQgPSBudWxsO1xuXHQgICAgdGhpcy5fJG9uVGljayA9IGZ1bmN0aW9uICgpIHtcblx0ICAgICAgcmV0dXJuIF90aGlzLl9vblRpY2soKTtcblx0ICAgIH07XG5cdCAgICB0aGlzLl9pbml0KG9wdGlvbnMpO1xuXHQgIH1cblxuXHQgIGluaGVyaXQoQW5vbnltb3VzU3RyZWFtLCBTdHJlYW0sIHtcblxuXHQgICAgX2luaXQ6IGZ1bmN0aW9uIF9pbml0KCkge30sXG5cdCAgICBfZnJlZTogZnVuY3Rpb24gX2ZyZWUoKSB7fSxcblxuXHQgICAgX29uVGljazogZnVuY3Rpb24gX29uVGljaygpIHt9LFxuXG5cdCAgICBfb25BY3RpdmF0aW9uOiBmdW5jdGlvbiBfb25BY3RpdmF0aW9uKCkge1xuXHQgICAgICB0aGlzLl9pbnRlcnZhbElkID0gc2V0SW50ZXJ2YWwodGhpcy5fJG9uVGljaywgdGhpcy5fd2FpdCk7XG5cdCAgICB9LFxuXG5cdCAgICBfb25EZWFjdGl2YXRpb246IGZ1bmN0aW9uIF9vbkRlYWN0aXZhdGlvbigpIHtcblx0ICAgICAgaWYgKHRoaXMuX2ludGVydmFsSWQgIT09IG51bGwpIHtcblx0ICAgICAgICBjbGVhckludGVydmFsKHRoaXMuX2ludGVydmFsSWQpO1xuXHQgICAgICAgIHRoaXMuX2ludGVydmFsSWQgPSBudWxsO1xuXHQgICAgICB9XG5cdCAgICB9LFxuXG5cdCAgICBfY2xlYXI6IGZ1bmN0aW9uIF9jbGVhcigpIHtcblx0ICAgICAgU3RyZWFtLnByb3RvdHlwZS5fY2xlYXIuY2FsbCh0aGlzKTtcblx0ICAgICAgdGhpcy5fJG9uVGljayA9IG51bGw7XG5cdCAgICAgIHRoaXMuX2ZyZWUoKTtcblx0ICAgIH1cblxuXHQgIH0sIG1peGluKTtcblxuXHQgIHJldHVybiBBbm9ueW1vdXNTdHJlYW07XG5cdH07XG5cbi8qKiovIH0sXG4vKiAxMSAqL1xuLyoqKi8gZnVuY3Rpb24obW9kdWxlLCBleHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKSB7XG5cblx0J3VzZSBzdHJpY3QnO1xuXG5cdHZhciB0aW1lQmFzZWQgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDEwKTtcblxuXHR2YXIgUyA9IHRpbWVCYXNlZCh7XG5cblx0ICBfbmFtZTogJ2ludGVydmFsJyxcblxuXHQgIF9pbml0OiBmdW5jdGlvbiBfaW5pdChfcmVmKSB7XG5cdCAgICB2YXIgeCA9IF9yZWYueDtcblxuXHQgICAgdGhpcy5feCA9IHg7XG5cdCAgfSxcblxuXHQgIF9mcmVlOiBmdW5jdGlvbiBfZnJlZSgpIHtcblx0ICAgIHRoaXMuX3ggPSBudWxsO1xuXHQgIH0sXG5cblx0ICBfb25UaWNrOiBmdW5jdGlvbiBfb25UaWNrKCkge1xuXHQgICAgdGhpcy5fZW1pdFZhbHVlKHRoaXMuX3gpO1xuXHQgIH1cblxuXHR9KTtcblxuXHRtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGludGVydmFsKHdhaXQsIHgpIHtcblx0ICByZXR1cm4gbmV3IFMod2FpdCwgeyB4OiB4IH0pO1xuXHR9O1xuXG4vKioqLyB9LFxuLyogMTIgKi9cbi8qKiovIGZ1bmN0aW9uKG1vZHVsZSwgZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXykge1xuXG5cdCd1c2Ugc3RyaWN0JztcblxuXHR2YXIgdGltZUJhc2VkID0gX193ZWJwYWNrX3JlcXVpcmVfXygxMCk7XG5cblx0dmFyIF9yZXF1aXJlID0gX193ZWJwYWNrX3JlcXVpcmVfXyg1KTtcblxuXHR2YXIgY2xvbmVBcnJheSA9IF9yZXF1aXJlLmNsb25lQXJyYXk7XG5cblx0dmFyIG5ldmVyID0gX193ZWJwYWNrX3JlcXVpcmVfXyg4KTtcblxuXHR2YXIgUyA9IHRpbWVCYXNlZCh7XG5cblx0ICBfbmFtZTogJ3NlcXVlbnRpYWxseScsXG5cblx0ICBfaW5pdDogZnVuY3Rpb24gX2luaXQoX3JlZikge1xuXHQgICAgdmFyIHhzID0gX3JlZi54cztcblxuXHQgICAgdGhpcy5feHMgPSBjbG9uZUFycmF5KHhzKTtcblx0ICB9LFxuXG5cdCAgX2ZyZWU6IGZ1bmN0aW9uIF9mcmVlKCkge1xuXHQgICAgdGhpcy5feHMgPSBudWxsO1xuXHQgIH0sXG5cblx0ICBfb25UaWNrOiBmdW5jdGlvbiBfb25UaWNrKCkge1xuXHQgICAgaWYgKHRoaXMuX3hzLmxlbmd0aCA9PT0gMSkge1xuXHQgICAgICB0aGlzLl9lbWl0VmFsdWUodGhpcy5feHNbMF0pO1xuXHQgICAgICB0aGlzLl9lbWl0RW5kKCk7XG5cdCAgICB9IGVsc2Uge1xuXHQgICAgICB0aGlzLl9lbWl0VmFsdWUodGhpcy5feHMuc2hpZnQoKSk7XG5cdCAgICB9XG5cdCAgfVxuXG5cdH0pO1xuXG5cdG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gc2VxdWVudGlhbGx5KHdhaXQsIHhzKSB7XG5cdCAgcmV0dXJuIHhzLmxlbmd0aCA9PT0gMCA/IG5ldmVyKCkgOiBuZXcgUyh3YWl0LCB7IHhzOiB4cyB9KTtcblx0fTtcblxuLyoqKi8gfSxcbi8qIDEzICovXG4vKioqLyBmdW5jdGlvbihtb2R1bGUsIGV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pIHtcblxuXHQndXNlIHN0cmljdCc7XG5cblx0dmFyIHRpbWVCYXNlZCA9IF9fd2VicGFja19yZXF1aXJlX18oMTApO1xuXG5cdHZhciBTID0gdGltZUJhc2VkKHtcblxuXHQgIF9uYW1lOiAnZnJvbVBvbGwnLFxuXG5cdCAgX2luaXQ6IGZ1bmN0aW9uIF9pbml0KF9yZWYpIHtcblx0ICAgIHZhciBmbiA9IF9yZWYuZm47XG5cblx0ICAgIHRoaXMuX2ZuID0gZm47XG5cdCAgfSxcblxuXHQgIF9mcmVlOiBmdW5jdGlvbiBfZnJlZSgpIHtcblx0ICAgIHRoaXMuX2ZuID0gbnVsbDtcblx0ICB9LFxuXG5cdCAgX29uVGljazogZnVuY3Rpb24gX29uVGljaygpIHtcblx0ICAgIHZhciBmbiA9IHRoaXMuX2ZuO1xuXHQgICAgdGhpcy5fZW1pdFZhbHVlKGZuKCkpO1xuXHQgIH1cblxuXHR9KTtcblxuXHRtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGZyb21Qb2xsKHdhaXQsIGZuKSB7XG5cdCAgcmV0dXJuIG5ldyBTKHdhaXQsIHsgZm46IGZuIH0pO1xuXHR9O1xuXG4vKioqLyB9LFxuLyogMTQgKi9cbi8qKiovIGZ1bmN0aW9uKG1vZHVsZSwgZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXykge1xuXG5cdCd1c2Ugc3RyaWN0JztcblxuXHR2YXIgdGltZUJhc2VkID0gX193ZWJwYWNrX3JlcXVpcmVfXygxMCk7XG5cdHZhciBlbWl0dGVyID0gX193ZWJwYWNrX3JlcXVpcmVfXygxNSk7XG5cblx0dmFyIFMgPSB0aW1lQmFzZWQoe1xuXG5cdCAgX25hbWU6ICd3aXRoSW50ZXJ2YWwnLFxuXG5cdCAgX2luaXQ6IGZ1bmN0aW9uIF9pbml0KF9yZWYpIHtcblx0ICAgIHZhciBmbiA9IF9yZWYuZm47XG5cblx0ICAgIHRoaXMuX2ZuID0gZm47XG5cdCAgICB0aGlzLl9lbWl0dGVyID0gZW1pdHRlcih0aGlzKTtcblx0ICB9LFxuXG5cdCAgX2ZyZWU6IGZ1bmN0aW9uIF9mcmVlKCkge1xuXHQgICAgdGhpcy5fZm4gPSBudWxsO1xuXHQgICAgdGhpcy5fZW1pdHRlciA9IG51bGw7XG5cdCAgfSxcblxuXHQgIF9vblRpY2s6IGZ1bmN0aW9uIF9vblRpY2soKSB7XG5cdCAgICB2YXIgZm4gPSB0aGlzLl9mbjtcblx0ICAgIGZuKHRoaXMuX2VtaXR0ZXIpO1xuXHQgIH1cblxuXHR9KTtcblxuXHRtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIHdpdGhJbnRlcnZhbCh3YWl0LCBmbikge1xuXHQgIHJldHVybiBuZXcgUyh3YWl0LCB7IGZuOiBmbiB9KTtcblx0fTtcblxuLyoqKi8gfSxcbi8qIDE1ICovXG4vKioqLyBmdW5jdGlvbihtb2R1bGUsIGV4cG9ydHMpIHtcblxuXHRcInVzZSBzdHJpY3RcIjtcblxuXHRtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGVtaXR0ZXIob2JzKSB7XG5cblx0ICBmdW5jdGlvbiB2YWx1ZSh4KSB7XG5cdCAgICBvYnMuX2VtaXRWYWx1ZSh4KTtcblx0ICAgIHJldHVybiBvYnMuX2FjdGl2ZTtcblx0ICB9XG5cblx0ICBmdW5jdGlvbiBlcnJvcih4KSB7XG5cdCAgICBvYnMuX2VtaXRFcnJvcih4KTtcblx0ICAgIHJldHVybiBvYnMuX2FjdGl2ZTtcblx0ICB9XG5cblx0ICBmdW5jdGlvbiBlbmQoKSB7XG5cdCAgICBvYnMuX2VtaXRFbmQoKTtcblx0ICAgIHJldHVybiBvYnMuX2FjdGl2ZTtcblx0ICB9XG5cblx0ICBmdW5jdGlvbiBldmVudChlKSB7XG5cdCAgICBvYnMuX2VtaXQoZS50eXBlLCBlLnZhbHVlKTtcblx0ICAgIHJldHVybiBvYnMuX2FjdGl2ZTtcblx0ICB9XG5cblx0ICByZXR1cm4geyB2YWx1ZTogdmFsdWUsIGVycm9yOiBlcnJvciwgZW5kOiBlbmQsIGV2ZW50OiBldmVudCwgZW1pdDogdmFsdWUsIGVtaXRFdmVudDogZXZlbnQgfTtcblx0fTtcblxuLyoqKi8gfSxcbi8qIDE2ICovXG4vKioqLyBmdW5jdGlvbihtb2R1bGUsIGV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pIHtcblxuXHQndXNlIHN0cmljdCc7XG5cblx0dmFyIHN0cmVhbSA9IF9fd2VicGFja19yZXF1aXJlX18oMTcpO1xuXG5cdG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gZnJvbUNhbGxiYWNrKGNhbGxiYWNrQ29uc3VtZXIpIHtcblxuXHQgIHZhciBjYWxsZWQgPSBmYWxzZTtcblxuXHQgIHJldHVybiBzdHJlYW0oZnVuY3Rpb24gKGVtaXR0ZXIpIHtcblxuXHQgICAgaWYgKCFjYWxsZWQpIHtcblx0ICAgICAgY2FsbGJhY2tDb25zdW1lcihmdW5jdGlvbiAoeCkge1xuXHQgICAgICAgIGVtaXR0ZXIuZW1pdCh4KTtcblx0ICAgICAgICBlbWl0dGVyLmVuZCgpO1xuXHQgICAgICB9KTtcblx0ICAgICAgY2FsbGVkID0gdHJ1ZTtcblx0ICAgIH1cblx0ICB9KS5zZXROYW1lKCdmcm9tQ2FsbGJhY2snKTtcblx0fTtcblxuLyoqKi8gfSxcbi8qIDE3ICovXG4vKioqLyBmdW5jdGlvbihtb2R1bGUsIGV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pIHtcblxuXHQndXNlIHN0cmljdCc7XG5cblx0dmFyIF9yZXF1aXJlID0gX193ZWJwYWNrX3JlcXVpcmVfXygyKTtcblxuXHR2YXIgaW5oZXJpdCA9IF9yZXF1aXJlLmluaGVyaXQ7XG5cblx0dmFyIFN0cmVhbSA9IF9fd2VicGFja19yZXF1aXJlX18oNik7XG5cdHZhciBlbWl0dGVyID0gX193ZWJwYWNrX3JlcXVpcmVfXygxNSk7XG5cblx0ZnVuY3Rpb24gUyhmbikge1xuXHQgIFN0cmVhbS5jYWxsKHRoaXMpO1xuXHQgIHRoaXMuX2ZuID0gZm47XG5cdCAgdGhpcy5fdW5zdWJzY3JpYmUgPSBudWxsO1xuXHR9XG5cblx0aW5oZXJpdChTLCBTdHJlYW0sIHtcblxuXHQgIF9uYW1lOiAnc3RyZWFtJyxcblxuXHQgIF9vbkFjdGl2YXRpb246IGZ1bmN0aW9uIF9vbkFjdGl2YXRpb24oKSB7XG5cdCAgICB2YXIgZm4gPSB0aGlzLl9mbjtcblx0ICAgIHZhciB1bnN1YnNjcmliZSA9IGZuKGVtaXR0ZXIodGhpcykpO1xuXHQgICAgdGhpcy5fdW5zdWJzY3JpYmUgPSB0eXBlb2YgdW5zdWJzY3JpYmUgPT09ICdmdW5jdGlvbicgPyB1bnN1YnNjcmliZSA6IG51bGw7XG5cblx0ICAgIC8vIGZpeCBodHRwczovL2dpdGh1Yi5jb20vcnBvbWlub3Yva2VmaXIvaXNzdWVzLzM1XG5cdCAgICBpZiAoIXRoaXMuX2FjdGl2ZSkge1xuXHQgICAgICB0aGlzLl9jYWxsVW5zdWJzY3JpYmUoKTtcblx0ICAgIH1cblx0ICB9LFxuXG5cdCAgX2NhbGxVbnN1YnNjcmliZTogZnVuY3Rpb24gX2NhbGxVbnN1YnNjcmliZSgpIHtcblx0ICAgIGlmICh0aGlzLl91bnN1YnNjcmliZSAhPT0gbnVsbCkge1xuXHQgICAgICB0aGlzLl91bnN1YnNjcmliZSgpO1xuXHQgICAgICB0aGlzLl91bnN1YnNjcmliZSA9IG51bGw7XG5cdCAgICB9XG5cdCAgfSxcblxuXHQgIF9vbkRlYWN0aXZhdGlvbjogZnVuY3Rpb24gX29uRGVhY3RpdmF0aW9uKCkge1xuXHQgICAgdGhpcy5fY2FsbFVuc3Vic2NyaWJlKCk7XG5cdCAgfSxcblxuXHQgIF9jbGVhcjogZnVuY3Rpb24gX2NsZWFyKCkge1xuXHQgICAgU3RyZWFtLnByb3RvdHlwZS5fY2xlYXIuY2FsbCh0aGlzKTtcblx0ICAgIHRoaXMuX2ZuID0gbnVsbDtcblx0ICB9XG5cblx0fSk7XG5cblx0bW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBzdHJlYW0oZm4pIHtcblx0ICByZXR1cm4gbmV3IFMoZm4pO1xuXHR9O1xuXG4vKioqLyB9LFxuLyogMTggKi9cbi8qKiovIGZ1bmN0aW9uKG1vZHVsZSwgZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXykge1xuXG5cdCd1c2Ugc3RyaWN0JztcblxuXHR2YXIgc3RyZWFtID0gX193ZWJwYWNrX3JlcXVpcmVfXygxNyk7XG5cblx0bW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBmcm9tTm9kZUNhbGxiYWNrKGNhbGxiYWNrQ29uc3VtZXIpIHtcblxuXHQgIHZhciBjYWxsZWQgPSBmYWxzZTtcblxuXHQgIHJldHVybiBzdHJlYW0oZnVuY3Rpb24gKGVtaXR0ZXIpIHtcblxuXHQgICAgaWYgKCFjYWxsZWQpIHtcblx0ICAgICAgY2FsbGJhY2tDb25zdW1lcihmdW5jdGlvbiAoZXJyb3IsIHgpIHtcblx0ICAgICAgICBpZiAoZXJyb3IpIHtcblx0ICAgICAgICAgIGVtaXR0ZXIuZXJyb3IoZXJyb3IpO1xuXHQgICAgICAgIH0gZWxzZSB7XG5cdCAgICAgICAgICBlbWl0dGVyLmVtaXQoeCk7XG5cdCAgICAgICAgfVxuXHQgICAgICAgIGVtaXR0ZXIuZW5kKCk7XG5cdCAgICAgIH0pO1xuXHQgICAgICBjYWxsZWQgPSB0cnVlO1xuXHQgICAgfVxuXHQgIH0pLnNldE5hbWUoJ2Zyb21Ob2RlQ2FsbGJhY2snKTtcblx0fTtcblxuLyoqKi8gfSxcbi8qIDE5ICovXG4vKioqLyBmdW5jdGlvbihtb2R1bGUsIGV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pIHtcblxuXHQndXNlIHN0cmljdCc7XG5cblx0dmFyIGZyb21TdWJVbnN1YiA9IF9fd2VicGFja19yZXF1aXJlX18oMjApO1xuXG5cdHZhciBwYWlycyA9IFtbJ2FkZEV2ZW50TGlzdGVuZXInLCAncmVtb3ZlRXZlbnRMaXN0ZW5lciddLCBbJ2FkZExpc3RlbmVyJywgJ3JlbW92ZUxpc3RlbmVyJ10sIFsnb24nLCAnb2ZmJ11dO1xuXG5cdG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gZnJvbUV2ZW50cyh0YXJnZXQsIGV2ZW50TmFtZSwgdHJhbnNmb3JtZXIpIHtcblx0ICB2YXIgc3ViID0gdW5kZWZpbmVkLFxuXHQgICAgICB1bnN1YiA9IHVuZGVmaW5lZDtcblxuXHQgIGZvciAodmFyIGkgPSAwOyBpIDwgcGFpcnMubGVuZ3RoOyBpKyspIHtcblx0ICAgIGlmICh0eXBlb2YgdGFyZ2V0W3BhaXJzW2ldWzBdXSA9PT0gJ2Z1bmN0aW9uJyAmJiB0eXBlb2YgdGFyZ2V0W3BhaXJzW2ldWzFdXSA9PT0gJ2Z1bmN0aW9uJykge1xuXHQgICAgICBzdWIgPSBwYWlyc1tpXVswXTtcblx0ICAgICAgdW5zdWIgPSBwYWlyc1tpXVsxXTtcblx0ICAgICAgYnJlYWs7XG5cdCAgICB9XG5cdCAgfVxuXG5cdCAgaWYgKHN1YiA9PT0gdW5kZWZpbmVkKSB7XG5cdCAgICB0aHJvdyBuZXcgRXJyb3IoJ3RhcmdldCBkb25cXCd0IHN1cHBvcnQgYW55IG9mICcgKyAnYWRkRXZlbnRMaXN0ZW5lci9yZW1vdmVFdmVudExpc3RlbmVyLCBhZGRMaXN0ZW5lci9yZW1vdmVMaXN0ZW5lciwgb24vb2ZmIG1ldGhvZCBwYWlyJyk7XG5cdCAgfVxuXG5cdCAgcmV0dXJuIGZyb21TdWJVbnN1YihmdW5jdGlvbiAoaGFuZGxlcikge1xuXHQgICAgcmV0dXJuIHRhcmdldFtzdWJdKGV2ZW50TmFtZSwgaGFuZGxlcik7XG5cdCAgfSwgZnVuY3Rpb24gKGhhbmRsZXIpIHtcblx0ICAgIHJldHVybiB0YXJnZXRbdW5zdWJdKGV2ZW50TmFtZSwgaGFuZGxlcik7XG5cdCAgfSwgdHJhbnNmb3JtZXIpLnNldE5hbWUoJ2Zyb21FdmVudHMnKTtcblx0fTtcblxuLyoqKi8gfSxcbi8qIDIwICovXG4vKioqLyBmdW5jdGlvbihtb2R1bGUsIGV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pIHtcblxuXHQndXNlIHN0cmljdCc7XG5cblx0dmFyIHN0cmVhbSA9IF9fd2VicGFja19yZXF1aXJlX18oMTcpO1xuXG5cdHZhciBfcmVxdWlyZSA9IF9fd2VicGFja19yZXF1aXJlX18oMjEpO1xuXG5cdHZhciBhcHBseSA9IF9yZXF1aXJlLmFwcGx5O1xuXG5cdG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gZnJvbVN1YlVuc3ViKHN1YiwgdW5zdWIsIHRyYW5zZm9ybWVyIC8qIEZ1bmN0aW9uIHwgZmFsc2V5ICovKSB7XG5cdCAgcmV0dXJuIHN0cmVhbShmdW5jdGlvbiAoZW1pdHRlcikge1xuXG5cdCAgICB2YXIgaGFuZGxlciA9IHRyYW5zZm9ybWVyID8gZnVuY3Rpb24gKCkge1xuXHQgICAgICBlbWl0dGVyLmVtaXQoYXBwbHkodHJhbnNmb3JtZXIsIHRoaXMsIGFyZ3VtZW50cykpO1xuXHQgICAgfSA6IGZ1bmN0aW9uICh4KSB7XG5cdCAgICAgIGVtaXR0ZXIuZW1pdCh4KTtcblx0ICAgIH07XG5cblx0ICAgIHN1YihoYW5kbGVyKTtcblx0ICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG5cdCAgICAgIHJldHVybiB1bnN1YihoYW5kbGVyKTtcblx0ICAgIH07XG5cdCAgfSkuc2V0TmFtZSgnZnJvbVN1YlVuc3ViJyk7XG5cdH07XG5cbi8qKiovIH0sXG4vKiAyMSAqL1xuLyoqKi8gZnVuY3Rpb24obW9kdWxlLCBleHBvcnRzKSB7XG5cblx0XCJ1c2Ugc3RyaWN0XCI7XG5cblx0ZnVuY3Rpb24gc3ByZWFkKGZuLCBsZW5ndGgpIHtcblx0ICBzd2l0Y2ggKGxlbmd0aCkge1xuXHQgICAgY2FzZSAwOlxuXHQgICAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuXHQgICAgICAgIHJldHVybiBmbigpO1xuXHQgICAgICB9O1xuXHQgICAgY2FzZSAxOlxuXHQgICAgICByZXR1cm4gZnVuY3Rpb24gKGEpIHtcblx0ICAgICAgICByZXR1cm4gZm4oYVswXSk7XG5cdCAgICAgIH07XG5cdCAgICBjYXNlIDI6XG5cdCAgICAgIHJldHVybiBmdW5jdGlvbiAoYSkge1xuXHQgICAgICAgIHJldHVybiBmbihhWzBdLCBhWzFdKTtcblx0ICAgICAgfTtcblx0ICAgIGNhc2UgMzpcblx0ICAgICAgcmV0dXJuIGZ1bmN0aW9uIChhKSB7XG5cdCAgICAgICAgcmV0dXJuIGZuKGFbMF0sIGFbMV0sIGFbMl0pO1xuXHQgICAgICB9O1xuXHQgICAgY2FzZSA0OlxuXHQgICAgICByZXR1cm4gZnVuY3Rpb24gKGEpIHtcblx0ICAgICAgICByZXR1cm4gZm4oYVswXSwgYVsxXSwgYVsyXSwgYVszXSk7XG5cdCAgICAgIH07XG5cdCAgICBkZWZhdWx0OlxuXHQgICAgICByZXR1cm4gZnVuY3Rpb24gKGEpIHtcblx0ICAgICAgICByZXR1cm4gZm4uYXBwbHkobnVsbCwgYSk7XG5cdCAgICAgIH07XG5cdCAgfVxuXHR9XG5cblx0ZnVuY3Rpb24gYXBwbHkoZm4sIGMsIGEpIHtcblx0ICB2YXIgYUxlbmd0aCA9IGEgPyBhLmxlbmd0aCA6IDA7XG5cdCAgaWYgKGMgPT0gbnVsbCkge1xuXHQgICAgc3dpdGNoIChhTGVuZ3RoKSB7XG5cdCAgICAgIGNhc2UgMDpcblx0ICAgICAgICByZXR1cm4gZm4oKTtcblx0ICAgICAgY2FzZSAxOlxuXHQgICAgICAgIHJldHVybiBmbihhWzBdKTtcblx0ICAgICAgY2FzZSAyOlxuXHQgICAgICAgIHJldHVybiBmbihhWzBdLCBhWzFdKTtcblx0ICAgICAgY2FzZSAzOlxuXHQgICAgICAgIHJldHVybiBmbihhWzBdLCBhWzFdLCBhWzJdKTtcblx0ICAgICAgY2FzZSA0OlxuXHQgICAgICAgIHJldHVybiBmbihhWzBdLCBhWzFdLCBhWzJdLCBhWzNdKTtcblx0ICAgICAgZGVmYXVsdDpcblx0ICAgICAgICByZXR1cm4gZm4uYXBwbHkobnVsbCwgYSk7XG5cdCAgICB9XG5cdCAgfSBlbHNlIHtcblx0ICAgIHN3aXRjaCAoYUxlbmd0aCkge1xuXHQgICAgICBjYXNlIDA6XG5cdCAgICAgICAgcmV0dXJuIGZuLmNhbGwoYyk7XG5cdCAgICAgIGRlZmF1bHQ6XG5cdCAgICAgICAgcmV0dXJuIGZuLmFwcGx5KGMsIGEpO1xuXHQgICAgfVxuXHQgIH1cblx0fVxuXG5cdG1vZHVsZS5leHBvcnRzID0geyBzcHJlYWQ6IHNwcmVhZCwgYXBwbHk6IGFwcGx5IH07XG5cbi8qKiovIH0sXG4vKiAyMiAqL1xuLyoqKi8gZnVuY3Rpb24obW9kdWxlLCBleHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKSB7XG5cblx0J3VzZSBzdHJpY3QnO1xuXG5cdHZhciBfcmVxdWlyZSA9IF9fd2VicGFja19yZXF1aXJlX18oMik7XG5cblx0dmFyIGluaGVyaXQgPSBfcmVxdWlyZS5pbmhlcml0O1xuXG5cdHZhciBQcm9wZXJ0eSA9IF9fd2VicGFja19yZXF1aXJlX18oNyk7XG5cblx0Ly8gSEFDSzpcblx0Ly8gICBXZSBkb24ndCBjYWxsIHBhcmVudCBDbGFzcyBjb25zdHJ1Y3RvciwgYnV0IGluc3RlYWQgcHV0dGluZyBhbGwgbmVjZXNzYXJ5XG5cdC8vICAgcHJvcGVydGllcyBpbnRvIHByb3RvdHlwZSB0byBzaW11bGF0ZSBlbmRlZCBQcm9wZXJ0eVxuXHQvLyAgIChzZWUgUHJvcHBlcnR5IGFuZCBPYnNlcnZhYmxlIGNsYXNzZXMpLlxuXG5cdGZ1bmN0aW9uIFAodmFsdWUpIHtcblx0ICB0aGlzLl9jdXJyZW50RXZlbnQgPSB7IHR5cGU6ICd2YWx1ZScsIHZhbHVlOiB2YWx1ZSwgY3VycmVudDogdHJ1ZSB9O1xuXHR9XG5cblx0aW5oZXJpdChQLCBQcm9wZXJ0eSwge1xuXHQgIF9uYW1lOiAnY29uc3RhbnQnLFxuXHQgIF9hY3RpdmU6IGZhbHNlLFxuXHQgIF9hY3RpdmF0aW5nOiBmYWxzZSxcblx0ICBfYWxpdmU6IGZhbHNlLFxuXHQgIF9kaXNwYXRjaGVyOiBudWxsLFxuXHQgIF9sb2dIYW5kbGVyczogbnVsbFxuXHR9KTtcblxuXHRtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGNvbnN0YW50KHgpIHtcblx0ICByZXR1cm4gbmV3IFAoeCk7XG5cdH07XG5cbi8qKiovIH0sXG4vKiAyMyAqL1xuLyoqKi8gZnVuY3Rpb24obW9kdWxlLCBleHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKSB7XG5cblx0J3VzZSBzdHJpY3QnO1xuXG5cdHZhciBfcmVxdWlyZSA9IF9fd2VicGFja19yZXF1aXJlX18oMik7XG5cblx0dmFyIGluaGVyaXQgPSBfcmVxdWlyZS5pbmhlcml0O1xuXG5cdHZhciBQcm9wZXJ0eSA9IF9fd2VicGFja19yZXF1aXJlX18oNyk7XG5cblx0Ly8gSEFDSzpcblx0Ly8gICBXZSBkb24ndCBjYWxsIHBhcmVudCBDbGFzcyBjb25zdHJ1Y3RvciwgYnV0IGluc3RlYWQgcHV0dGluZyBhbGwgbmVjZXNzYXJ5XG5cdC8vICAgcHJvcGVydGllcyBpbnRvIHByb3RvdHlwZSB0byBzaW11bGF0ZSBlbmRlZCBQcm9wZXJ0eVxuXHQvLyAgIChzZWUgUHJvcHBlcnR5IGFuZCBPYnNlcnZhYmxlIGNsYXNzZXMpLlxuXG5cdGZ1bmN0aW9uIFAodmFsdWUpIHtcblx0ICB0aGlzLl9jdXJyZW50RXZlbnQgPSB7IHR5cGU6ICdlcnJvcicsIHZhbHVlOiB2YWx1ZSwgY3VycmVudDogdHJ1ZSB9O1xuXHR9XG5cblx0aW5oZXJpdChQLCBQcm9wZXJ0eSwge1xuXHQgIF9uYW1lOiAnY29uc3RhbnRFcnJvcicsXG5cdCAgX2FjdGl2ZTogZmFsc2UsXG5cdCAgX2FjdGl2YXRpbmc6IGZhbHNlLFxuXHQgIF9hbGl2ZTogZmFsc2UsXG5cdCAgX2Rpc3BhdGNoZXI6IG51bGwsXG5cdCAgX2xvZ0hhbmRsZXJzOiBudWxsXG5cdH0pO1xuXG5cdG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gY29uc3RhbnRFcnJvcih4KSB7XG5cdCAgcmV0dXJuIG5ldyBQKHgpO1xuXHR9O1xuXG4vKioqLyB9LFxuLyogMjQgKi9cbi8qKiovIGZ1bmN0aW9uKG1vZHVsZSwgZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXykge1xuXG5cdCd1c2Ugc3RyaWN0JztcblxuXHR2YXIgX3JlcXVpcmUgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDI1KTtcblxuXHR2YXIgY3JlYXRlUHJvcGVydHkgPSBfcmVxdWlyZS5jcmVhdGVQcm9wZXJ0eTtcblxuXHR2YXIgUCA9IGNyZWF0ZVByb3BlcnR5KCd0b1Byb3BlcnR5Jywge1xuXG5cdCAgX2luaXQ6IGZ1bmN0aW9uIF9pbml0KF9yZWYpIHtcblx0ICAgIHZhciBmbiA9IF9yZWYuZm47XG5cblx0ICAgIHRoaXMuX2dldEluaXRpYWxDdXJyZW50ID0gZm47XG5cdCAgfSxcblxuXHQgIF9vbkFjdGl2YXRpb246IGZ1bmN0aW9uIF9vbkFjdGl2YXRpb24oKSB7XG5cdCAgICBpZiAodGhpcy5fZ2V0SW5pdGlhbEN1cnJlbnQgIT09IG51bGwpIHtcblx0ICAgICAgdmFyIGdldEluaXRpYWwgPSB0aGlzLl9nZXRJbml0aWFsQ3VycmVudDtcblx0ICAgICAgdGhpcy5fZW1pdFZhbHVlKGdldEluaXRpYWwoKSk7XG5cdCAgICB9XG5cdCAgICB0aGlzLl9zb3VyY2Uub25BbnkodGhpcy5fJGhhbmRsZUFueSk7IC8vIGNvcGllZCBmcm9tIHBhdHRlcm5zL29uZS1zb3VyY2Vcblx0ICB9XG5cblx0fSk7XG5cblx0bW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiB0b1Byb3BlcnR5KG9icykge1xuXHQgIHZhciBmbiA9IGFyZ3VtZW50cy5sZW5ndGggPD0gMSB8fCBhcmd1bWVudHNbMV0gPT09IHVuZGVmaW5lZCA/IG51bGwgOiBhcmd1bWVudHNbMV07XG5cblx0ICBpZiAoZm4gIT09IG51bGwgJiYgdHlwZW9mIGZuICE9PSAnZnVuY3Rpb24nKSB7XG5cdCAgICB0aHJvdyBuZXcgRXJyb3IoJ1lvdSBzaG91bGQgY2FsbCB0b1Byb3BlcnR5KCkgd2l0aCBhIGZ1bmN0aW9uIG9yIG5vIGFyZ3VtZW50cy4nKTtcblx0ICB9XG5cdCAgcmV0dXJuIG5ldyBQKG9icywgeyBmbjogZm4gfSk7XG5cdH07XG5cbi8qKiovIH0sXG4vKiAyNSAqL1xuLyoqKi8gZnVuY3Rpb24obW9kdWxlLCBleHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKSB7XG5cblx0J3VzZSBzdHJpY3QnO1xuXG5cdHZhciBTdHJlYW0gPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDYpO1xuXHR2YXIgUHJvcGVydHkgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDcpO1xuXG5cdHZhciBfcmVxdWlyZSA9IF9fd2VicGFja19yZXF1aXJlX18oMik7XG5cblx0dmFyIGluaGVyaXQgPSBfcmVxdWlyZS5pbmhlcml0O1xuXG5cdHZhciBfcmVxdWlyZTIgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDMpO1xuXG5cdHZhciBWQUxVRSA9IF9yZXF1aXJlMi5WQUxVRTtcblx0dmFyIEVSUk9SID0gX3JlcXVpcmUyLkVSUk9SO1xuXHR2YXIgRU5EID0gX3JlcXVpcmUyLkVORDtcblxuXHRmdW5jdGlvbiBjcmVhdGVDb25zdHJ1Y3RvcihCYXNlQ2xhc3MsIG5hbWUpIHtcblx0ICByZXR1cm4gZnVuY3Rpb24gQW5vbnltb3VzT2JzZXJ2YWJsZShzb3VyY2UsIG9wdGlvbnMpIHtcblx0ICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cblx0ICAgIEJhc2VDbGFzcy5jYWxsKHRoaXMpO1xuXHQgICAgdGhpcy5fc291cmNlID0gc291cmNlO1xuXHQgICAgdGhpcy5fbmFtZSA9IHNvdXJjZS5fbmFtZSArICcuJyArIG5hbWU7XG5cdCAgICB0aGlzLl9pbml0KG9wdGlvbnMpO1xuXHQgICAgdGhpcy5fJGhhbmRsZUFueSA9IGZ1bmN0aW9uIChldmVudCkge1xuXHQgICAgICByZXR1cm4gX3RoaXMuX2hhbmRsZUFueShldmVudCk7XG5cdCAgICB9O1xuXHQgIH07XG5cdH1cblxuXHRmdW5jdGlvbiBjcmVhdGVDbGFzc01ldGhvZHMoQmFzZUNsYXNzKSB7XG5cdCAgcmV0dXJuIHtcblxuXHQgICAgX2luaXQ6IGZ1bmN0aW9uIF9pbml0KCkge30sXG5cdCAgICBfZnJlZTogZnVuY3Rpb24gX2ZyZWUoKSB7fSxcblxuXHQgICAgX2hhbmRsZVZhbHVlOiBmdW5jdGlvbiBfaGFuZGxlVmFsdWUoeCkge1xuXHQgICAgICB0aGlzLl9lbWl0VmFsdWUoeCk7XG5cdCAgICB9LFxuXHQgICAgX2hhbmRsZUVycm9yOiBmdW5jdGlvbiBfaGFuZGxlRXJyb3IoeCkge1xuXHQgICAgICB0aGlzLl9lbWl0RXJyb3IoeCk7XG5cdCAgICB9LFxuXHQgICAgX2hhbmRsZUVuZDogZnVuY3Rpb24gX2hhbmRsZUVuZCgpIHtcblx0ICAgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgICAgfSxcblxuXHQgICAgX2hhbmRsZUFueTogZnVuY3Rpb24gX2hhbmRsZUFueShldmVudCkge1xuXHQgICAgICBzd2l0Y2ggKGV2ZW50LnR5cGUpIHtcblx0ICAgICAgICBjYXNlIFZBTFVFOlxuXHQgICAgICAgICAgcmV0dXJuIHRoaXMuX2hhbmRsZVZhbHVlKGV2ZW50LnZhbHVlKTtcblx0ICAgICAgICBjYXNlIEVSUk9SOlxuXHQgICAgICAgICAgcmV0dXJuIHRoaXMuX2hhbmRsZUVycm9yKGV2ZW50LnZhbHVlKTtcblx0ICAgICAgICBjYXNlIEVORDpcblx0ICAgICAgICAgIHJldHVybiB0aGlzLl9oYW5kbGVFbmQoKTtcblx0ICAgICAgfVxuXHQgICAgfSxcblxuXHQgICAgX29uQWN0aXZhdGlvbjogZnVuY3Rpb24gX29uQWN0aXZhdGlvbigpIHtcblx0ICAgICAgdGhpcy5fc291cmNlLm9uQW55KHRoaXMuXyRoYW5kbGVBbnkpO1xuXHQgICAgfSxcblx0ICAgIF9vbkRlYWN0aXZhdGlvbjogZnVuY3Rpb24gX29uRGVhY3RpdmF0aW9uKCkge1xuXHQgICAgICB0aGlzLl9zb3VyY2Uub2ZmQW55KHRoaXMuXyRoYW5kbGVBbnkpO1xuXHQgICAgfSxcblxuXHQgICAgX2NsZWFyOiBmdW5jdGlvbiBfY2xlYXIoKSB7XG5cdCAgICAgIEJhc2VDbGFzcy5wcm90b3R5cGUuX2NsZWFyLmNhbGwodGhpcyk7XG5cdCAgICAgIHRoaXMuX3NvdXJjZSA9IG51bGw7XG5cdCAgICAgIHRoaXMuXyRoYW5kbGVBbnkgPSBudWxsO1xuXHQgICAgICB0aGlzLl9mcmVlKCk7XG5cdCAgICB9XG5cblx0ICB9O1xuXHR9XG5cblx0ZnVuY3Rpb24gY3JlYXRlU3RyZWFtKG5hbWUsIG1peGluKSB7XG5cdCAgdmFyIFMgPSBjcmVhdGVDb25zdHJ1Y3RvcihTdHJlYW0sIG5hbWUpO1xuXHQgIGluaGVyaXQoUywgU3RyZWFtLCBjcmVhdGVDbGFzc01ldGhvZHMoU3RyZWFtKSwgbWl4aW4pO1xuXHQgIHJldHVybiBTO1xuXHR9XG5cblx0ZnVuY3Rpb24gY3JlYXRlUHJvcGVydHkobmFtZSwgbWl4aW4pIHtcblx0ICB2YXIgUCA9IGNyZWF0ZUNvbnN0cnVjdG9yKFByb3BlcnR5LCBuYW1lKTtcblx0ICBpbmhlcml0KFAsIFByb3BlcnR5LCBjcmVhdGVDbGFzc01ldGhvZHMoUHJvcGVydHkpLCBtaXhpbik7XG5cdCAgcmV0dXJuIFA7XG5cdH1cblxuXHRtb2R1bGUuZXhwb3J0cyA9IHsgY3JlYXRlU3RyZWFtOiBjcmVhdGVTdHJlYW0sIGNyZWF0ZVByb3BlcnR5OiBjcmVhdGVQcm9wZXJ0eSB9O1xuXG4vKioqLyB9LFxuLyogMjYgKi9cbi8qKiovIGZ1bmN0aW9uKG1vZHVsZSwgZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXykge1xuXG5cdCd1c2Ugc3RyaWN0JztcblxuXHR2YXIgX3JlcXVpcmUgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDI1KTtcblxuXHR2YXIgY3JlYXRlU3RyZWFtID0gX3JlcXVpcmUuY3JlYXRlU3RyZWFtO1xuXG5cdHZhciBTID0gY3JlYXRlU3RyZWFtKCdjaGFuZ2VzJywge1xuXG5cdCAgX2hhbmRsZVZhbHVlOiBmdW5jdGlvbiBfaGFuZGxlVmFsdWUoeCkge1xuXHQgICAgaWYgKCF0aGlzLl9hY3RpdmF0aW5nKSB7XG5cdCAgICAgIHRoaXMuX2VtaXRWYWx1ZSh4KTtcblx0ICAgIH1cblx0ICB9LFxuXG5cdCAgX2hhbmRsZUVycm9yOiBmdW5jdGlvbiBfaGFuZGxlRXJyb3IoeCkge1xuXHQgICAgaWYgKCF0aGlzLl9hY3RpdmF0aW5nKSB7XG5cdCAgICAgIHRoaXMuX2VtaXRFcnJvcih4KTtcblx0ICAgIH1cblx0ICB9XG5cblx0fSk7XG5cblx0bW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBjaGFuZ2VzKG9icykge1xuXHQgIHJldHVybiBuZXcgUyhvYnMpO1xuXHR9O1xuXG4vKioqLyB9LFxuLyogMjcgKi9cbi8qKiovIGZ1bmN0aW9uKG1vZHVsZSwgZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXykge1xuXG5cdCd1c2Ugc3RyaWN0JztcblxuXHR2YXIgc3RyZWFtID0gX193ZWJwYWNrX3JlcXVpcmVfXygxNyk7XG5cdHZhciB0b1Byb3BlcnR5ID0gX193ZWJwYWNrX3JlcXVpcmVfXygyNCk7XG5cblx0bW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBmcm9tUHJvbWlzZShwcm9taXNlKSB7XG5cblx0ICB2YXIgY2FsbGVkID0gZmFsc2U7XG5cblx0ICB2YXIgcmVzdWx0ID0gc3RyZWFtKGZ1bmN0aW9uIChlbWl0dGVyKSB7XG5cdCAgICBpZiAoIWNhbGxlZCkge1xuXHQgICAgICB2YXIgb25WYWx1ZSA9IGZ1bmN0aW9uIG9uVmFsdWUoeCkge1xuXHQgICAgICAgIGVtaXR0ZXIuZW1pdCh4KTtcblx0ICAgICAgICBlbWl0dGVyLmVuZCgpO1xuXHQgICAgICB9O1xuXHQgICAgICB2YXIgb25FcnJvciA9IGZ1bmN0aW9uIG9uRXJyb3IoeCkge1xuXHQgICAgICAgIGVtaXR0ZXIuZXJyb3IoeCk7XG5cdCAgICAgICAgZW1pdHRlci5lbmQoKTtcblx0ICAgICAgfTtcblx0ICAgICAgdmFyIF9wcm9taXNlID0gcHJvbWlzZS50aGVuKG9uVmFsdWUsIG9uRXJyb3IpO1xuXG5cdCAgICAgIC8vIHByZXZlbnQgbGlicmFyaWVzIGxpa2UgJ1EnIG9yICd3aGVuJyBmcm9tIHN3YWxsb3dpbmcgZXhjZXB0aW9uc1xuXHQgICAgICBpZiAoX3Byb21pc2UgJiYgdHlwZW9mIF9wcm9taXNlLmRvbmUgPT09ICdmdW5jdGlvbicpIHtcblx0ICAgICAgICBfcHJvbWlzZS5kb25lKCk7XG5cdCAgICAgIH1cblxuXHQgICAgICBjYWxsZWQgPSB0cnVlO1xuXHQgICAgfVxuXHQgIH0pO1xuXG5cdCAgcmV0dXJuIHRvUHJvcGVydHkocmVzdWx0LCBudWxsKS5zZXROYW1lKCdmcm9tUHJvbWlzZScpO1xuXHR9O1xuXG4vKioqLyB9LFxuLyogMjggKi9cbi8qKiovIGZ1bmN0aW9uKG1vZHVsZSwgZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXykge1xuXG5cdCd1c2Ugc3RyaWN0JztcblxuXHR2YXIgX3JlcXVpcmUgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDMpO1xuXG5cdHZhciBWQUxVRSA9IF9yZXF1aXJlLlZBTFVFO1xuXHR2YXIgRU5EID0gX3JlcXVpcmUuRU5EO1xuXG5cdGZ1bmN0aW9uIGdldEdsb2RhbFByb21pc2UoKSB7XG5cdCAgaWYgKHR5cGVvZiBQcm9taXNlID09PSAnZnVuY3Rpb24nKSB7XG5cdCAgICByZXR1cm4gUHJvbWlzZTtcblx0ICB9IGVsc2Uge1xuXHQgICAgdGhyb3cgbmV3IEVycm9yKCdUaGVyZSBpc25cXCd0IGRlZmF1bHQgUHJvbWlzZSwgdXNlIHNoaW0gb3IgcGFyYW1ldGVyJyk7XG5cdCAgfVxuXHR9XG5cblx0bW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAob2JzKSB7XG5cdCAgdmFyIFByb21pc2UgPSBhcmd1bWVudHMubGVuZ3RoIDw9IDEgfHwgYXJndW1lbnRzWzFdID09PSB1bmRlZmluZWQgPyBnZXRHbG9kYWxQcm9taXNlKCkgOiBhcmd1bWVudHNbMV07XG5cblx0ICB2YXIgbGFzdCA9IG51bGw7XG5cdCAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcblx0ICAgIG9icy5vbkFueShmdW5jdGlvbiAoZXZlbnQpIHtcblx0ICAgICAgaWYgKGV2ZW50LnR5cGUgPT09IEVORCAmJiBsYXN0ICE9PSBudWxsKSB7XG5cdCAgICAgICAgKGxhc3QudHlwZSA9PT0gVkFMVUUgPyByZXNvbHZlIDogcmVqZWN0KShsYXN0LnZhbHVlKTtcblx0ICAgICAgICBsYXN0ID0gbnVsbDtcblx0ICAgICAgfSBlbHNlIHtcblx0ICAgICAgICBsYXN0ID0gZXZlbnQ7XG5cdCAgICAgIH1cblx0ICAgIH0pO1xuXHQgIH0pO1xuXHR9O1xuXG4vKioqLyB9LFxuLyogMjkgKi9cbi8qKiovIGZ1bmN0aW9uKG1vZHVsZSwgZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXykge1xuXG5cdCd1c2Ugc3RyaWN0JztcblxuXHR2YXIgc3RyZWFtID0gX193ZWJwYWNrX3JlcXVpcmVfXygxNyk7XG5cdHZhciBzeW1ib2wgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDMwKSgnb2JzZXJ2YWJsZScpO1xuXG5cdG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gZnJvbUVTT2JzZXJ2YWJsZShfb2JzZXJ2YWJsZSkge1xuXHQgIHZhciBvYnNlcnZhYmxlID0gX29ic2VydmFibGVbc3ltYm9sXSA/IF9vYnNlcnZhYmxlW3N5bWJvbF0oKSA6IF9vYnNlcnZhYmxlO1xuXHQgIHJldHVybiBzdHJlYW0oZnVuY3Rpb24gKGVtaXR0ZXIpIHtcblx0ICAgIHZhciB1bnN1YiA9IG9ic2VydmFibGUuc3Vic2NyaWJlKHtcblx0ICAgICAgZXJyb3I6IGZ1bmN0aW9uIGVycm9yKF9lcnJvcikge1xuXHQgICAgICAgIGVtaXR0ZXIuZXJyb3IoX2Vycm9yKTtcblx0ICAgICAgICBlbWl0dGVyLmVuZCgpO1xuXHQgICAgICB9LFxuXHQgICAgICBuZXh0OiBmdW5jdGlvbiBuZXh0KHZhbHVlKSB7XG5cdCAgICAgICAgZW1pdHRlci5lbWl0KHZhbHVlKTtcblx0ICAgICAgfSxcblx0ICAgICAgY29tcGxldGU6IGZ1bmN0aW9uIGNvbXBsZXRlKCkge1xuXHQgICAgICAgIGVtaXR0ZXIuZW5kKCk7XG5cdCAgICAgIH1cblx0ICAgIH0pO1xuXG5cdCAgICBpZiAodW5zdWIudW5zdWJzY3JpYmUpIHtcblx0ICAgICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcblx0ICAgICAgICB1bnN1Yi51bnN1YnNjcmliZSgpO1xuXHQgICAgICB9O1xuXHQgICAgfSBlbHNlIHtcblx0ICAgICAgcmV0dXJuIHVuc3ViO1xuXHQgICAgfVxuXHQgIH0pLnNldE5hbWUoJ2Zyb21FU09ic2VydmFibGUnKTtcblx0fTtcblxuLyoqKi8gfSxcbi8qIDMwICovXG4vKioqLyBmdW5jdGlvbihtb2R1bGUsIGV4cG9ydHMpIHtcblxuXHQndXNlIHN0cmljdCc7XG5cblx0bW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoa2V5KSB7XG5cdCAgaWYgKHR5cGVvZiBTeW1ib2wgIT09ICd1bmRlZmluZWQnICYmIFN5bWJvbFtrZXldKSB7XG5cdCAgICByZXR1cm4gU3ltYm9sW2tleV07XG5cdCAgfSBlbHNlIGlmICh0eXBlb2YgU3ltYm9sICE9PSAndW5kZWZpbmVkJyAmJiB0eXBlb2YgU3ltYm9sWydmb3InXSA9PT0gJ2Z1bmN0aW9uJykge1xuXHQgICAgcmV0dXJuIFN5bWJvbFsnZm9yJ10oa2V5KTtcblx0ICB9IGVsc2Uge1xuXHQgICAgcmV0dXJuICdAQCcgKyBrZXk7XG5cdCAgfVxuXHR9O1xuXG4vKioqLyB9LFxuLyogMzEgKi9cbi8qKiovIGZ1bmN0aW9uKG1vZHVsZSwgZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXykge1xuXG5cdCd1c2Ugc3RyaWN0JztcblxuXHR2YXIgX3JlcXVpcmUgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDIpO1xuXG5cdHZhciBleHRlbmQgPSBfcmVxdWlyZS5leHRlbmQ7XG5cblx0dmFyIF9yZXF1aXJlMiA9IF9fd2VicGFja19yZXF1aXJlX18oMyk7XG5cblx0dmFyIFZBTFVFID0gX3JlcXVpcmUyLlZBTFVFO1xuXHR2YXIgRVJST1IgPSBfcmVxdWlyZTIuRVJST1I7XG5cdHZhciBFTkQgPSBfcmVxdWlyZTIuRU5EO1xuXG5cdGZ1bmN0aW9uIEVTT2JzZXJ2YWJsZShvYnNlcnZhYmxlKSB7XG5cdCAgdGhpcy5fb2JzZXJ2YWJsZSA9IG9ic2VydmFibGUudGFrZUVycm9ycygxKTtcblx0fVxuXG5cdGV4dGVuZChFU09ic2VydmFibGUucHJvdG90eXBlLCB7XG5cdCAgc3Vic2NyaWJlOiBmdW5jdGlvbiBzdWJzY3JpYmUob2JzZXJ2ZXIpIHtcblx0ICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cblx0ICAgIHZhciBmbiA9IGZ1bmN0aW9uIGZuKGV2ZW50KSB7XG5cdCAgICAgIGlmIChldmVudC50eXBlID09PSBWQUxVRSAmJiBvYnNlcnZlci5uZXh0KSB7XG5cdCAgICAgICAgb2JzZXJ2ZXIubmV4dChldmVudC52YWx1ZSk7XG5cdCAgICAgIH0gZWxzZSBpZiAoZXZlbnQudHlwZSA9PT0gRVJST1IgJiYgb2JzZXJ2ZXIuZXJyb3IpIHtcblx0ICAgICAgICBvYnNlcnZlci5lcnJvcihldmVudC52YWx1ZSk7XG5cdCAgICAgIH0gZWxzZSBpZiAoZXZlbnQudHlwZSA9PT0gRU5EICYmIG9ic2VydmVyLmNvbXBsZXRlKSB7XG5cdCAgICAgICAgb2JzZXJ2ZXIuY29tcGxldGUoZXZlbnQudmFsdWUpO1xuXHQgICAgICB9XG5cdCAgICB9O1xuXG5cdCAgICB0aGlzLl9vYnNlcnZhYmxlLm9uQW55KGZuKTtcblx0ICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG5cdCAgICAgIHJldHVybiBfdGhpcy5fb2JzZXJ2YWJsZS5vZmZBbnkoZm4pO1xuXHQgICAgfTtcblx0ICB9XG5cdH0pO1xuXG5cdG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gdG9FU09ic2VydmFibGUoKSB7XG5cdCAgcmV0dXJuIG5ldyBFU09ic2VydmFibGUodGhpcyk7XG5cdH07XG5cbi8qKiovIH0sXG4vKiAzMiAqL1xuLyoqKi8gZnVuY3Rpb24obW9kdWxlLCBleHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKSB7XG5cblx0J3VzZSBzdHJpY3QnO1xuXG5cdHZhciBfcmVxdWlyZSA9IF9fd2VicGFja19yZXF1aXJlX18oMjUpO1xuXG5cdHZhciBjcmVhdGVTdHJlYW0gPSBfcmVxdWlyZS5jcmVhdGVTdHJlYW07XG5cdHZhciBjcmVhdGVQcm9wZXJ0eSA9IF9yZXF1aXJlLmNyZWF0ZVByb3BlcnR5O1xuXG5cdHZhciBtaXhpbiA9IHtcblxuXHQgIF9pbml0OiBmdW5jdGlvbiBfaW5pdChfcmVmKSB7XG5cdCAgICB2YXIgZm4gPSBfcmVmLmZuO1xuXG5cdCAgICB0aGlzLl9mbiA9IGZuO1xuXHQgIH0sXG5cblx0ICBfZnJlZTogZnVuY3Rpb24gX2ZyZWUoKSB7XG5cdCAgICB0aGlzLl9mbiA9IG51bGw7XG5cdCAgfSxcblxuXHQgIF9oYW5kbGVWYWx1ZTogZnVuY3Rpb24gX2hhbmRsZVZhbHVlKHgpIHtcblx0ICAgIHZhciBmbiA9IHRoaXMuX2ZuO1xuXHQgICAgdGhpcy5fZW1pdFZhbHVlKGZuKHgpKTtcblx0ICB9XG5cblx0fTtcblxuXHR2YXIgUyA9IGNyZWF0ZVN0cmVhbSgnbWFwJywgbWl4aW4pO1xuXHR2YXIgUCA9IGNyZWF0ZVByb3BlcnR5KCdtYXAnLCBtaXhpbik7XG5cblx0dmFyIGlkID0gZnVuY3Rpb24gaWQoeCkge1xuXHQgIHJldHVybiB4O1xuXHR9O1xuXG5cdG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gbWFwKG9icykge1xuXHQgIHZhciBmbiA9IGFyZ3VtZW50cy5sZW5ndGggPD0gMSB8fCBhcmd1bWVudHNbMV0gPT09IHVuZGVmaW5lZCA/IGlkIDogYXJndW1lbnRzWzFdO1xuXG5cdCAgcmV0dXJuIG5ldyAob2JzLl9vZlNhbWVUeXBlKFMsIFApKShvYnMsIHsgZm46IGZuIH0pO1xuXHR9O1xuXG4vKioqLyB9LFxuLyogMzMgKi9cbi8qKiovIGZ1bmN0aW9uKG1vZHVsZSwgZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXykge1xuXG5cdCd1c2Ugc3RyaWN0JztcblxuXHR2YXIgX3JlcXVpcmUgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDI1KTtcblxuXHR2YXIgY3JlYXRlU3RyZWFtID0gX3JlcXVpcmUuY3JlYXRlU3RyZWFtO1xuXHR2YXIgY3JlYXRlUHJvcGVydHkgPSBfcmVxdWlyZS5jcmVhdGVQcm9wZXJ0eTtcblxuXHR2YXIgbWl4aW4gPSB7XG5cblx0ICBfaW5pdDogZnVuY3Rpb24gX2luaXQoX3JlZikge1xuXHQgICAgdmFyIGZuID0gX3JlZi5mbjtcblxuXHQgICAgdGhpcy5fZm4gPSBmbjtcblx0ICB9LFxuXG5cdCAgX2ZyZWU6IGZ1bmN0aW9uIF9mcmVlKCkge1xuXHQgICAgdGhpcy5fZm4gPSBudWxsO1xuXHQgIH0sXG5cblx0ICBfaGFuZGxlVmFsdWU6IGZ1bmN0aW9uIF9oYW5kbGVWYWx1ZSh4KSB7XG5cdCAgICB2YXIgZm4gPSB0aGlzLl9mbjtcblx0ICAgIGlmIChmbih4KSkge1xuXHQgICAgICB0aGlzLl9lbWl0VmFsdWUoeCk7XG5cdCAgICB9XG5cdCAgfVxuXG5cdH07XG5cblx0dmFyIFMgPSBjcmVhdGVTdHJlYW0oJ2ZpbHRlcicsIG1peGluKTtcblx0dmFyIFAgPSBjcmVhdGVQcm9wZXJ0eSgnZmlsdGVyJywgbWl4aW4pO1xuXG5cdHZhciBpZCA9IGZ1bmN0aW9uIGlkKHgpIHtcblx0ICByZXR1cm4geDtcblx0fTtcblxuXHRtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGZpbHRlcihvYnMpIHtcblx0ICB2YXIgZm4gPSBhcmd1bWVudHMubGVuZ3RoIDw9IDEgfHwgYXJndW1lbnRzWzFdID09PSB1bmRlZmluZWQgPyBpZCA6IGFyZ3VtZW50c1sxXTtcblxuXHQgIHJldHVybiBuZXcgKG9icy5fb2ZTYW1lVHlwZShTLCBQKSkob2JzLCB7IGZuOiBmbiB9KTtcblx0fTtcblxuLyoqKi8gfSxcbi8qIDM0ICovXG4vKioqLyBmdW5jdGlvbihtb2R1bGUsIGV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pIHtcblxuXHQndXNlIHN0cmljdCc7XG5cblx0dmFyIF9yZXF1aXJlID0gX193ZWJwYWNrX3JlcXVpcmVfXygyNSk7XG5cblx0dmFyIGNyZWF0ZVN0cmVhbSA9IF9yZXF1aXJlLmNyZWF0ZVN0cmVhbTtcblx0dmFyIGNyZWF0ZVByb3BlcnR5ID0gX3JlcXVpcmUuY3JlYXRlUHJvcGVydHk7XG5cblx0dmFyIG1peGluID0ge1xuXG5cdCAgX2luaXQ6IGZ1bmN0aW9uIF9pbml0KF9yZWYpIHtcblx0ICAgIHZhciBuID0gX3JlZi5uO1xuXG5cdCAgICB0aGlzLl9uID0gbjtcblx0ICAgIGlmIChuIDw9IDApIHtcblx0ICAgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgICAgfVxuXHQgIH0sXG5cblx0ICBfaGFuZGxlVmFsdWU6IGZ1bmN0aW9uIF9oYW5kbGVWYWx1ZSh4KSB7XG5cdCAgICB0aGlzLl9uLS07XG5cdCAgICB0aGlzLl9lbWl0VmFsdWUoeCk7XG5cdCAgICBpZiAodGhpcy5fbiA9PT0gMCkge1xuXHQgICAgICB0aGlzLl9lbWl0RW5kKCk7XG5cdCAgICB9XG5cdCAgfVxuXG5cdH07XG5cblx0dmFyIFMgPSBjcmVhdGVTdHJlYW0oJ3Rha2UnLCBtaXhpbik7XG5cdHZhciBQID0gY3JlYXRlUHJvcGVydHkoJ3Rha2UnLCBtaXhpbik7XG5cblx0bW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiB0YWtlKG9icywgbikge1xuXHQgIHJldHVybiBuZXcgKG9icy5fb2ZTYW1lVHlwZShTLCBQKSkob2JzLCB7IG46IG4gfSk7XG5cdH07XG5cbi8qKiovIH0sXG4vKiAzNSAqL1xuLyoqKi8gZnVuY3Rpb24obW9kdWxlLCBleHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKSB7XG5cblx0J3VzZSBzdHJpY3QnO1xuXG5cdHZhciBfcmVxdWlyZSA9IF9fd2VicGFja19yZXF1aXJlX18oMjUpO1xuXG5cdHZhciBjcmVhdGVTdHJlYW0gPSBfcmVxdWlyZS5jcmVhdGVTdHJlYW07XG5cdHZhciBjcmVhdGVQcm9wZXJ0eSA9IF9yZXF1aXJlLmNyZWF0ZVByb3BlcnR5O1xuXG5cdHZhciBtaXhpbiA9IHtcblxuXHQgIF9pbml0OiBmdW5jdGlvbiBfaW5pdChfcmVmKSB7XG5cdCAgICB2YXIgbiA9IF9yZWYubjtcblxuXHQgICAgdGhpcy5fbiA9IG47XG5cdCAgICBpZiAobiA8PSAwKSB7XG5cdCAgICAgIHRoaXMuX2VtaXRFbmQoKTtcblx0ICAgIH1cblx0ICB9LFxuXG5cdCAgX2hhbmRsZUVycm9yOiBmdW5jdGlvbiBfaGFuZGxlRXJyb3IoeCkge1xuXHQgICAgdGhpcy5fbi0tO1xuXHQgICAgdGhpcy5fZW1pdEVycm9yKHgpO1xuXHQgICAgaWYgKHRoaXMuX24gPT09IDApIHtcblx0ICAgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgICAgfVxuXHQgIH1cblxuXHR9O1xuXG5cdHZhciBTID0gY3JlYXRlU3RyZWFtKCd0YWtlRXJyb3JzJywgbWl4aW4pO1xuXHR2YXIgUCA9IGNyZWF0ZVByb3BlcnR5KCd0YWtlRXJyb3JzJywgbWl4aW4pO1xuXG5cdG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gdGFrZUVycm9ycyhvYnMsIG4pIHtcblx0ICByZXR1cm4gbmV3IChvYnMuX29mU2FtZVR5cGUoUywgUCkpKG9icywgeyBuOiBuIH0pO1xuXHR9O1xuXG4vKioqLyB9LFxuLyogMzYgKi9cbi8qKiovIGZ1bmN0aW9uKG1vZHVsZSwgZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXykge1xuXG5cdCd1c2Ugc3RyaWN0JztcblxuXHR2YXIgX3JlcXVpcmUgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDI1KTtcblxuXHR2YXIgY3JlYXRlU3RyZWFtID0gX3JlcXVpcmUuY3JlYXRlU3RyZWFtO1xuXHR2YXIgY3JlYXRlUHJvcGVydHkgPSBfcmVxdWlyZS5jcmVhdGVQcm9wZXJ0eTtcblxuXHR2YXIgbWl4aW4gPSB7XG5cblx0ICBfaW5pdDogZnVuY3Rpb24gX2luaXQoX3JlZikge1xuXHQgICAgdmFyIGZuID0gX3JlZi5mbjtcblxuXHQgICAgdGhpcy5fZm4gPSBmbjtcblx0ICB9LFxuXG5cdCAgX2ZyZWU6IGZ1bmN0aW9uIF9mcmVlKCkge1xuXHQgICAgdGhpcy5fZm4gPSBudWxsO1xuXHQgIH0sXG5cblx0ICBfaGFuZGxlVmFsdWU6IGZ1bmN0aW9uIF9oYW5kbGVWYWx1ZSh4KSB7XG5cdCAgICB2YXIgZm4gPSB0aGlzLl9mbjtcblx0ICAgIGlmIChmbih4KSkge1xuXHQgICAgICB0aGlzLl9lbWl0VmFsdWUoeCk7XG5cdCAgICB9IGVsc2Uge1xuXHQgICAgICB0aGlzLl9lbWl0RW5kKCk7XG5cdCAgICB9XG5cdCAgfVxuXG5cdH07XG5cblx0dmFyIFMgPSBjcmVhdGVTdHJlYW0oJ3Rha2VXaGlsZScsIG1peGluKTtcblx0dmFyIFAgPSBjcmVhdGVQcm9wZXJ0eSgndGFrZVdoaWxlJywgbWl4aW4pO1xuXG5cdHZhciBpZCA9IGZ1bmN0aW9uIGlkKHgpIHtcblx0ICByZXR1cm4geDtcblx0fTtcblxuXHRtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIHRha2VXaGlsZShvYnMpIHtcblx0ICB2YXIgZm4gPSBhcmd1bWVudHMubGVuZ3RoIDw9IDEgfHwgYXJndW1lbnRzWzFdID09PSB1bmRlZmluZWQgPyBpZCA6IGFyZ3VtZW50c1sxXTtcblxuXHQgIHJldHVybiBuZXcgKG9icy5fb2ZTYW1lVHlwZShTLCBQKSkob2JzLCB7IGZuOiBmbiB9KTtcblx0fTtcblxuLyoqKi8gfSxcbi8qIDM3ICovXG4vKioqLyBmdW5jdGlvbihtb2R1bGUsIGV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pIHtcblxuXHQndXNlIHN0cmljdCc7XG5cblx0dmFyIF9yZXF1aXJlID0gX193ZWJwYWNrX3JlcXVpcmVfXygyNSk7XG5cblx0dmFyIGNyZWF0ZVN0cmVhbSA9IF9yZXF1aXJlLmNyZWF0ZVN0cmVhbTtcblx0dmFyIGNyZWF0ZVByb3BlcnR5ID0gX3JlcXVpcmUuY3JlYXRlUHJvcGVydHk7XG5cblx0dmFyIF9yZXF1aXJlMiA9IF9fd2VicGFja19yZXF1aXJlX18oMyk7XG5cblx0dmFyIE5PVEhJTkcgPSBfcmVxdWlyZTIuTk9USElORztcblxuXHR2YXIgbWl4aW4gPSB7XG5cblx0ICBfaW5pdDogZnVuY3Rpb24gX2luaXQoKSB7XG5cdCAgICB0aGlzLl9sYXN0VmFsdWUgPSBOT1RISU5HO1xuXHQgIH0sXG5cblx0ICBfZnJlZTogZnVuY3Rpb24gX2ZyZWUoKSB7XG5cdCAgICB0aGlzLl9sYXN0VmFsdWUgPSBudWxsO1xuXHQgIH0sXG5cblx0ICBfaGFuZGxlVmFsdWU6IGZ1bmN0aW9uIF9oYW5kbGVWYWx1ZSh4KSB7XG5cdCAgICB0aGlzLl9sYXN0VmFsdWUgPSB4O1xuXHQgIH0sXG5cblx0ICBfaGFuZGxlRW5kOiBmdW5jdGlvbiBfaGFuZGxlRW5kKCkge1xuXHQgICAgaWYgKHRoaXMuX2xhc3RWYWx1ZSAhPT0gTk9USElORykge1xuXHQgICAgICB0aGlzLl9lbWl0VmFsdWUodGhpcy5fbGFzdFZhbHVlKTtcblx0ICAgIH1cblx0ICAgIHRoaXMuX2VtaXRFbmQoKTtcblx0ICB9XG5cblx0fTtcblxuXHR2YXIgUyA9IGNyZWF0ZVN0cmVhbSgnbGFzdCcsIG1peGluKTtcblx0dmFyIFAgPSBjcmVhdGVQcm9wZXJ0eSgnbGFzdCcsIG1peGluKTtcblxuXHRtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGxhc3Qob2JzKSB7XG5cdCAgcmV0dXJuIG5ldyAob2JzLl9vZlNhbWVUeXBlKFMsIFApKShvYnMpO1xuXHR9O1xuXG4vKioqLyB9LFxuLyogMzggKi9cbi8qKiovIGZ1bmN0aW9uKG1vZHVsZSwgZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXykge1xuXG5cdCd1c2Ugc3RyaWN0JztcblxuXHR2YXIgX3JlcXVpcmUgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDI1KTtcblxuXHR2YXIgY3JlYXRlU3RyZWFtID0gX3JlcXVpcmUuY3JlYXRlU3RyZWFtO1xuXHR2YXIgY3JlYXRlUHJvcGVydHkgPSBfcmVxdWlyZS5jcmVhdGVQcm9wZXJ0eTtcblxuXHR2YXIgbWl4aW4gPSB7XG5cblx0ICBfaW5pdDogZnVuY3Rpb24gX2luaXQoX3JlZikge1xuXHQgICAgdmFyIG4gPSBfcmVmLm47XG5cblx0ICAgIHRoaXMuX24gPSBNYXRoLm1heCgwLCBuKTtcblx0ICB9LFxuXG5cdCAgX2hhbmRsZVZhbHVlOiBmdW5jdGlvbiBfaGFuZGxlVmFsdWUoeCkge1xuXHQgICAgaWYgKHRoaXMuX24gPT09IDApIHtcblx0ICAgICAgdGhpcy5fZW1pdFZhbHVlKHgpO1xuXHQgICAgfSBlbHNlIHtcblx0ICAgICAgdGhpcy5fbi0tO1xuXHQgICAgfVxuXHQgIH1cblxuXHR9O1xuXG5cdHZhciBTID0gY3JlYXRlU3RyZWFtKCdza2lwJywgbWl4aW4pO1xuXHR2YXIgUCA9IGNyZWF0ZVByb3BlcnR5KCdza2lwJywgbWl4aW4pO1xuXG5cdG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gc2tpcChvYnMsIG4pIHtcblx0ICByZXR1cm4gbmV3IChvYnMuX29mU2FtZVR5cGUoUywgUCkpKG9icywgeyBuOiBuIH0pO1xuXHR9O1xuXG4vKioqLyB9LFxuLyogMzkgKi9cbi8qKiovIGZ1bmN0aW9uKG1vZHVsZSwgZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXykge1xuXG5cdCd1c2Ugc3RyaWN0JztcblxuXHR2YXIgX3JlcXVpcmUgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDI1KTtcblxuXHR2YXIgY3JlYXRlU3RyZWFtID0gX3JlcXVpcmUuY3JlYXRlU3RyZWFtO1xuXHR2YXIgY3JlYXRlUHJvcGVydHkgPSBfcmVxdWlyZS5jcmVhdGVQcm9wZXJ0eTtcblxuXHR2YXIgbWl4aW4gPSB7XG5cblx0ICBfaW5pdDogZnVuY3Rpb24gX2luaXQoX3JlZikge1xuXHQgICAgdmFyIGZuID0gX3JlZi5mbjtcblxuXHQgICAgdGhpcy5fZm4gPSBmbjtcblx0ICB9LFxuXG5cdCAgX2ZyZWU6IGZ1bmN0aW9uIF9mcmVlKCkge1xuXHQgICAgdGhpcy5fZm4gPSBudWxsO1xuXHQgIH0sXG5cblx0ICBfaGFuZGxlVmFsdWU6IGZ1bmN0aW9uIF9oYW5kbGVWYWx1ZSh4KSB7XG5cdCAgICB2YXIgZm4gPSB0aGlzLl9mbjtcblx0ICAgIGlmICh0aGlzLl9mbiAhPT0gbnVsbCAmJiAhZm4oeCkpIHtcblx0ICAgICAgdGhpcy5fZm4gPSBudWxsO1xuXHQgICAgfVxuXHQgICAgaWYgKHRoaXMuX2ZuID09PSBudWxsKSB7XG5cdCAgICAgIHRoaXMuX2VtaXRWYWx1ZSh4KTtcblx0ICAgIH1cblx0ICB9XG5cblx0fTtcblxuXHR2YXIgUyA9IGNyZWF0ZVN0cmVhbSgnc2tpcFdoaWxlJywgbWl4aW4pO1xuXHR2YXIgUCA9IGNyZWF0ZVByb3BlcnR5KCdza2lwV2hpbGUnLCBtaXhpbik7XG5cblx0dmFyIGlkID0gZnVuY3Rpb24gaWQoeCkge1xuXHQgIHJldHVybiB4O1xuXHR9O1xuXG5cdG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gc2tpcFdoaWxlKG9icykge1xuXHQgIHZhciBmbiA9IGFyZ3VtZW50cy5sZW5ndGggPD0gMSB8fCBhcmd1bWVudHNbMV0gPT09IHVuZGVmaW5lZCA/IGlkIDogYXJndW1lbnRzWzFdO1xuXG5cdCAgcmV0dXJuIG5ldyAob2JzLl9vZlNhbWVUeXBlKFMsIFApKShvYnMsIHsgZm46IGZuIH0pO1xuXHR9O1xuXG4vKioqLyB9LFxuLyogNDAgKi9cbi8qKiovIGZ1bmN0aW9uKG1vZHVsZSwgZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXykge1xuXG5cdCd1c2Ugc3RyaWN0JztcblxuXHR2YXIgX3JlcXVpcmUgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDI1KTtcblxuXHR2YXIgY3JlYXRlU3RyZWFtID0gX3JlcXVpcmUuY3JlYXRlU3RyZWFtO1xuXHR2YXIgY3JlYXRlUHJvcGVydHkgPSBfcmVxdWlyZS5jcmVhdGVQcm9wZXJ0eTtcblxuXHR2YXIgX3JlcXVpcmUyID0gX193ZWJwYWNrX3JlcXVpcmVfXygzKTtcblxuXHR2YXIgTk9USElORyA9IF9yZXF1aXJlMi5OT1RISU5HO1xuXG5cdHZhciBtaXhpbiA9IHtcblxuXHQgIF9pbml0OiBmdW5jdGlvbiBfaW5pdChfcmVmKSB7XG5cdCAgICB2YXIgZm4gPSBfcmVmLmZuO1xuXG5cdCAgICB0aGlzLl9mbiA9IGZuO1xuXHQgICAgdGhpcy5fcHJldiA9IE5PVEhJTkc7XG5cdCAgfSxcblxuXHQgIF9mcmVlOiBmdW5jdGlvbiBfZnJlZSgpIHtcblx0ICAgIHRoaXMuX2ZuID0gbnVsbDtcblx0ICAgIHRoaXMuX3ByZXYgPSBudWxsO1xuXHQgIH0sXG5cblx0ICBfaGFuZGxlVmFsdWU6IGZ1bmN0aW9uIF9oYW5kbGVWYWx1ZSh4KSB7XG5cdCAgICB2YXIgZm4gPSB0aGlzLl9mbjtcblx0ICAgIGlmICh0aGlzLl9wcmV2ID09PSBOT1RISU5HIHx8ICFmbih0aGlzLl9wcmV2LCB4KSkge1xuXHQgICAgICB0aGlzLl9wcmV2ID0geDtcblx0ICAgICAgdGhpcy5fZW1pdFZhbHVlKHgpO1xuXHQgICAgfVxuXHQgIH1cblxuXHR9O1xuXG5cdHZhciBTID0gY3JlYXRlU3RyZWFtKCdza2lwRHVwbGljYXRlcycsIG1peGluKTtcblx0dmFyIFAgPSBjcmVhdGVQcm9wZXJ0eSgnc2tpcER1cGxpY2F0ZXMnLCBtaXhpbik7XG5cblx0dmFyIGVxID0gZnVuY3Rpb24gZXEoYSwgYikge1xuXHQgIHJldHVybiBhID09PSBiO1xuXHR9O1xuXG5cdG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gc2tpcER1cGxpY2F0ZXMob2JzKSB7XG5cdCAgdmFyIGZuID0gYXJndW1lbnRzLmxlbmd0aCA8PSAxIHx8IGFyZ3VtZW50c1sxXSA9PT0gdW5kZWZpbmVkID8gZXEgOiBhcmd1bWVudHNbMV07XG5cblx0ICByZXR1cm4gbmV3IChvYnMuX29mU2FtZVR5cGUoUywgUCkpKG9icywgeyBmbjogZm4gfSk7XG5cdH07XG5cbi8qKiovIH0sXG4vKiA0MSAqL1xuLyoqKi8gZnVuY3Rpb24obW9kdWxlLCBleHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKSB7XG5cblx0J3VzZSBzdHJpY3QnO1xuXG5cdHZhciBfcmVxdWlyZSA9IF9fd2VicGFja19yZXF1aXJlX18oMjUpO1xuXG5cdHZhciBjcmVhdGVTdHJlYW0gPSBfcmVxdWlyZS5jcmVhdGVTdHJlYW07XG5cdHZhciBjcmVhdGVQcm9wZXJ0eSA9IF9yZXF1aXJlLmNyZWF0ZVByb3BlcnR5O1xuXG5cdHZhciBfcmVxdWlyZTIgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDMpO1xuXG5cdHZhciBOT1RISU5HID0gX3JlcXVpcmUyLk5PVEhJTkc7XG5cblx0dmFyIG1peGluID0ge1xuXG5cdCAgX2luaXQ6IGZ1bmN0aW9uIF9pbml0KF9yZWYpIHtcblx0ICAgIHZhciBmbiA9IF9yZWYuZm47XG5cdCAgICB2YXIgc2VlZCA9IF9yZWYuc2VlZDtcblxuXHQgICAgdGhpcy5fZm4gPSBmbjtcblx0ICAgIHRoaXMuX3ByZXYgPSBzZWVkO1xuXHQgIH0sXG5cblx0ICBfZnJlZTogZnVuY3Rpb24gX2ZyZWUoKSB7XG5cdCAgICB0aGlzLl9wcmV2ID0gbnVsbDtcblx0ICAgIHRoaXMuX2ZuID0gbnVsbDtcblx0ICB9LFxuXG5cdCAgX2hhbmRsZVZhbHVlOiBmdW5jdGlvbiBfaGFuZGxlVmFsdWUoeCkge1xuXHQgICAgaWYgKHRoaXMuX3ByZXYgIT09IE5PVEhJTkcpIHtcblx0ICAgICAgdmFyIGZuID0gdGhpcy5fZm47XG5cdCAgICAgIHRoaXMuX2VtaXRWYWx1ZShmbih0aGlzLl9wcmV2LCB4KSk7XG5cdCAgICB9XG5cdCAgICB0aGlzLl9wcmV2ID0geDtcblx0ICB9XG5cblx0fTtcblxuXHR2YXIgUyA9IGNyZWF0ZVN0cmVhbSgnZGlmZicsIG1peGluKTtcblx0dmFyIFAgPSBjcmVhdGVQcm9wZXJ0eSgnZGlmZicsIG1peGluKTtcblxuXHRmdW5jdGlvbiBkZWZhdWx0Rm4oYSwgYikge1xuXHQgIHJldHVybiBbYSwgYl07XG5cdH1cblxuXHRtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGRpZmYob2JzLCBmbikge1xuXHQgIHZhciBzZWVkID0gYXJndW1lbnRzLmxlbmd0aCA8PSAyIHx8IGFyZ3VtZW50c1syXSA9PT0gdW5kZWZpbmVkID8gTk9USElORyA6IGFyZ3VtZW50c1syXTtcblxuXHQgIHJldHVybiBuZXcgKG9icy5fb2ZTYW1lVHlwZShTLCBQKSkob2JzLCB7IGZuOiBmbiB8fCBkZWZhdWx0Rm4sIHNlZWQ6IHNlZWQgfSk7XG5cdH07XG5cbi8qKiovIH0sXG4vKiA0MiAqL1xuLyoqKi8gZnVuY3Rpb24obW9kdWxlLCBleHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKSB7XG5cblx0J3VzZSBzdHJpY3QnO1xuXG5cdHZhciBfcmVxdWlyZSA9IF9fd2VicGFja19yZXF1aXJlX18oMjUpO1xuXG5cdHZhciBjcmVhdGVQcm9wZXJ0eSA9IF9yZXF1aXJlLmNyZWF0ZVByb3BlcnR5O1xuXG5cdHZhciBfcmVxdWlyZTIgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDMpO1xuXG5cdHZhciBFUlJPUiA9IF9yZXF1aXJlMi5FUlJPUjtcblx0dmFyIE5PVEhJTkcgPSBfcmVxdWlyZTIuTk9USElORztcblxuXHR2YXIgUCA9IGNyZWF0ZVByb3BlcnR5KCdzY2FuJywge1xuXG5cdCAgX2luaXQ6IGZ1bmN0aW9uIF9pbml0KF9yZWYpIHtcblx0ICAgIHZhciBmbiA9IF9yZWYuZm47XG5cdCAgICB2YXIgc2VlZCA9IF9yZWYuc2VlZDtcblxuXHQgICAgdGhpcy5fZm4gPSBmbjtcblx0ICAgIHRoaXMuX3NlZWQgPSBzZWVkO1xuXHQgICAgaWYgKHNlZWQgIT09IE5PVEhJTkcpIHtcblx0ICAgICAgdGhpcy5fZW1pdFZhbHVlKHNlZWQpO1xuXHQgICAgfVxuXHQgIH0sXG5cblx0ICBfZnJlZTogZnVuY3Rpb24gX2ZyZWUoKSB7XG5cdCAgICB0aGlzLl9mbiA9IG51bGw7XG5cdCAgICB0aGlzLl9zZWVkID0gbnVsbDtcblx0ICB9LFxuXG5cdCAgX2hhbmRsZVZhbHVlOiBmdW5jdGlvbiBfaGFuZGxlVmFsdWUoeCkge1xuXHQgICAgdmFyIGZuID0gdGhpcy5fZm47XG5cdCAgICBpZiAodGhpcy5fY3VycmVudEV2ZW50ID09PSBudWxsIHx8IHRoaXMuX2N1cnJlbnRFdmVudC50eXBlID09PSBFUlJPUikge1xuXHQgICAgICB0aGlzLl9lbWl0VmFsdWUodGhpcy5fc2VlZCA9PT0gTk9USElORyA/IHggOiBmbih0aGlzLl9zZWVkLCB4KSk7XG5cdCAgICB9IGVsc2Uge1xuXHQgICAgICB0aGlzLl9lbWl0VmFsdWUoZm4odGhpcy5fY3VycmVudEV2ZW50LnZhbHVlLCB4KSk7XG5cdCAgICB9XG5cdCAgfVxuXG5cdH0pO1xuXG5cdG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gc2NhbihvYnMsIGZuKSB7XG5cdCAgdmFyIHNlZWQgPSBhcmd1bWVudHMubGVuZ3RoIDw9IDIgfHwgYXJndW1lbnRzWzJdID09PSB1bmRlZmluZWQgPyBOT1RISU5HIDogYXJndW1lbnRzWzJdO1xuXG5cdCAgcmV0dXJuIG5ldyBQKG9icywgeyBmbjogZm4sIHNlZWQ6IHNlZWQgfSk7XG5cdH07XG5cbi8qKiovIH0sXG4vKiA0MyAqL1xuLyoqKi8gZnVuY3Rpb24obW9kdWxlLCBleHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKSB7XG5cblx0J3VzZSBzdHJpY3QnO1xuXG5cdHZhciBfcmVxdWlyZSA9IF9fd2VicGFja19yZXF1aXJlX18oMjUpO1xuXG5cdHZhciBjcmVhdGVTdHJlYW0gPSBfcmVxdWlyZS5jcmVhdGVTdHJlYW07XG5cblx0dmFyIG1peGluID0ge1xuXG5cdCAgX2luaXQ6IGZ1bmN0aW9uIF9pbml0KF9yZWYpIHtcblx0ICAgIHZhciBmbiA9IF9yZWYuZm47XG5cblx0ICAgIHRoaXMuX2ZuID0gZm47XG5cdCAgfSxcblxuXHQgIF9mcmVlOiBmdW5jdGlvbiBfZnJlZSgpIHtcblx0ICAgIHRoaXMuX2ZuID0gbnVsbDtcblx0ICB9LFxuXG5cdCAgX2hhbmRsZVZhbHVlOiBmdW5jdGlvbiBfaGFuZGxlVmFsdWUoeCkge1xuXHQgICAgdmFyIGZuID0gdGhpcy5fZm47XG5cdCAgICB2YXIgeHMgPSBmbih4KTtcblx0ICAgIGZvciAodmFyIGkgPSAwOyBpIDwgeHMubGVuZ3RoOyBpKyspIHtcblx0ICAgICAgdGhpcy5fZW1pdFZhbHVlKHhzW2ldKTtcblx0ICAgIH1cblx0ICB9XG5cblx0fTtcblxuXHR2YXIgUyA9IGNyZWF0ZVN0cmVhbSgnZmxhdHRlbicsIG1peGluKTtcblxuXHR2YXIgaWQgPSBmdW5jdGlvbiBpZCh4KSB7XG5cdCAgcmV0dXJuIHg7XG5cdH07XG5cblx0bW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBmbGF0dGVuKG9icykge1xuXHQgIHZhciBmbiA9IGFyZ3VtZW50cy5sZW5ndGggPD0gMSB8fCBhcmd1bWVudHNbMV0gPT09IHVuZGVmaW5lZCA/IGlkIDogYXJndW1lbnRzWzFdO1xuXG5cdCAgcmV0dXJuIG5ldyBTKG9icywgeyBmbjogZm4gfSk7XG5cdH07XG5cbi8qKiovIH0sXG4vKiA0NCAqL1xuLyoqKi8gZnVuY3Rpb24obW9kdWxlLCBleHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKSB7XG5cblx0J3VzZSBzdHJpY3QnO1xuXG5cdHZhciBfcmVxdWlyZSA9IF9fd2VicGFja19yZXF1aXJlX18oMjUpO1xuXG5cdHZhciBjcmVhdGVTdHJlYW0gPSBfcmVxdWlyZS5jcmVhdGVTdHJlYW07XG5cdHZhciBjcmVhdGVQcm9wZXJ0eSA9IF9yZXF1aXJlLmNyZWF0ZVByb3BlcnR5O1xuXG5cdHZhciBFTkRfTUFSS0VSID0ge307XG5cblx0dmFyIG1peGluID0ge1xuXG5cdCAgX2luaXQ6IGZ1bmN0aW9uIF9pbml0KF9yZWYpIHtcblx0ICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cblx0ICAgIHZhciB3YWl0ID0gX3JlZi53YWl0O1xuXG5cdCAgICB0aGlzLl93YWl0ID0gTWF0aC5tYXgoMCwgd2FpdCk7XG5cdCAgICB0aGlzLl9idWZmID0gW107XG5cdCAgICB0aGlzLl8kc2hpZnRCdWZmID0gZnVuY3Rpb24gKCkge1xuXHQgICAgICB2YXIgdmFsdWUgPSBfdGhpcy5fYnVmZi5zaGlmdCgpO1xuXHQgICAgICBpZiAodmFsdWUgPT09IEVORF9NQVJLRVIpIHtcblx0ICAgICAgICBfdGhpcy5fZW1pdEVuZCgpO1xuXHQgICAgICB9IGVsc2Uge1xuXHQgICAgICAgIF90aGlzLl9lbWl0VmFsdWUodmFsdWUpO1xuXHQgICAgICB9XG5cdCAgICB9O1xuXHQgIH0sXG5cblx0ICBfZnJlZTogZnVuY3Rpb24gX2ZyZWUoKSB7XG5cdCAgICB0aGlzLl9idWZmID0gbnVsbDtcblx0ICAgIHRoaXMuXyRzaGlmdEJ1ZmYgPSBudWxsO1xuXHQgIH0sXG5cblx0ICBfaGFuZGxlVmFsdWU6IGZ1bmN0aW9uIF9oYW5kbGVWYWx1ZSh4KSB7XG5cdCAgICBpZiAodGhpcy5fYWN0aXZhdGluZykge1xuXHQgICAgICB0aGlzLl9lbWl0VmFsdWUoeCk7XG5cdCAgICB9IGVsc2Uge1xuXHQgICAgICB0aGlzLl9idWZmLnB1c2goeCk7XG5cdCAgICAgIHNldFRpbWVvdXQodGhpcy5fJHNoaWZ0QnVmZiwgdGhpcy5fd2FpdCk7XG5cdCAgICB9XG5cdCAgfSxcblxuXHQgIF9oYW5kbGVFbmQ6IGZ1bmN0aW9uIF9oYW5kbGVFbmQoKSB7XG5cdCAgICBpZiAodGhpcy5fYWN0aXZhdGluZykge1xuXHQgICAgICB0aGlzLl9lbWl0RW5kKCk7XG5cdCAgICB9IGVsc2Uge1xuXHQgICAgICB0aGlzLl9idWZmLnB1c2goRU5EX01BUktFUik7XG5cdCAgICAgIHNldFRpbWVvdXQodGhpcy5fJHNoaWZ0QnVmZiwgdGhpcy5fd2FpdCk7XG5cdCAgICB9XG5cdCAgfVxuXG5cdH07XG5cblx0dmFyIFMgPSBjcmVhdGVTdHJlYW0oJ2RlbGF5JywgbWl4aW4pO1xuXHR2YXIgUCA9IGNyZWF0ZVByb3BlcnR5KCdkZWxheScsIG1peGluKTtcblxuXHRtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGRlbGF5KG9icywgd2FpdCkge1xuXHQgIHJldHVybiBuZXcgKG9icy5fb2ZTYW1lVHlwZShTLCBQKSkob2JzLCB7IHdhaXQ6IHdhaXQgfSk7XG5cdH07XG5cbi8qKiovIH0sXG4vKiA0NSAqL1xuLyoqKi8gZnVuY3Rpb24obW9kdWxlLCBleHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKSB7XG5cblx0J3VzZSBzdHJpY3QnO1xuXG5cdHZhciBfcmVxdWlyZSA9IF9fd2VicGFja19yZXF1aXJlX18oMjUpO1xuXG5cdHZhciBjcmVhdGVTdHJlYW0gPSBfcmVxdWlyZS5jcmVhdGVTdHJlYW07XG5cdHZhciBjcmVhdGVQcm9wZXJ0eSA9IF9yZXF1aXJlLmNyZWF0ZVByb3BlcnR5O1xuXG5cdHZhciBub3cgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDQ2KTtcblxuXHR2YXIgbWl4aW4gPSB7XG5cblx0ICBfaW5pdDogZnVuY3Rpb24gX2luaXQoX3JlZikge1xuXHQgICAgdmFyIF90aGlzID0gdGhpcztcblxuXHQgICAgdmFyIHdhaXQgPSBfcmVmLndhaXQ7XG5cdCAgICB2YXIgbGVhZGluZyA9IF9yZWYubGVhZGluZztcblx0ICAgIHZhciB0cmFpbGluZyA9IF9yZWYudHJhaWxpbmc7XG5cblx0ICAgIHRoaXMuX3dhaXQgPSBNYXRoLm1heCgwLCB3YWl0KTtcblx0ICAgIHRoaXMuX2xlYWRpbmcgPSBsZWFkaW5nO1xuXHQgICAgdGhpcy5fdHJhaWxpbmcgPSB0cmFpbGluZztcblx0ICAgIHRoaXMuX3RyYWlsaW5nVmFsdWUgPSBudWxsO1xuXHQgICAgdGhpcy5fdGltZW91dElkID0gbnVsbDtcblx0ICAgIHRoaXMuX2VuZExhdGVyID0gZmFsc2U7XG5cdCAgICB0aGlzLl9sYXN0Q2FsbFRpbWUgPSAwO1xuXHQgICAgdGhpcy5fJHRyYWlsaW5nQ2FsbCA9IGZ1bmN0aW9uICgpIHtcblx0ICAgICAgcmV0dXJuIF90aGlzLl90cmFpbGluZ0NhbGwoKTtcblx0ICAgIH07XG5cdCAgfSxcblxuXHQgIF9mcmVlOiBmdW5jdGlvbiBfZnJlZSgpIHtcblx0ICAgIHRoaXMuX3RyYWlsaW5nVmFsdWUgPSBudWxsO1xuXHQgICAgdGhpcy5fJHRyYWlsaW5nQ2FsbCA9IG51bGw7XG5cdCAgfSxcblxuXHQgIF9oYW5kbGVWYWx1ZTogZnVuY3Rpb24gX2hhbmRsZVZhbHVlKHgpIHtcblx0ICAgIGlmICh0aGlzLl9hY3RpdmF0aW5nKSB7XG5cdCAgICAgIHRoaXMuX2VtaXRWYWx1ZSh4KTtcblx0ICAgIH0gZWxzZSB7XG5cdCAgICAgIHZhciBjdXJUaW1lID0gbm93KCk7XG5cdCAgICAgIGlmICh0aGlzLl9sYXN0Q2FsbFRpbWUgPT09IDAgJiYgIXRoaXMuX2xlYWRpbmcpIHtcblx0ICAgICAgICB0aGlzLl9sYXN0Q2FsbFRpbWUgPSBjdXJUaW1lO1xuXHQgICAgICB9XG5cdCAgICAgIHZhciByZW1haW5pbmcgPSB0aGlzLl93YWl0IC0gKGN1clRpbWUgLSB0aGlzLl9sYXN0Q2FsbFRpbWUpO1xuXHQgICAgICBpZiAocmVtYWluaW5nIDw9IDApIHtcblx0ICAgICAgICB0aGlzLl9jYW5jZWxUcmFpbGluZygpO1xuXHQgICAgICAgIHRoaXMuX2xhc3RDYWxsVGltZSA9IGN1clRpbWU7XG5cdCAgICAgICAgdGhpcy5fZW1pdFZhbHVlKHgpO1xuXHQgICAgICB9IGVsc2UgaWYgKHRoaXMuX3RyYWlsaW5nKSB7XG5cdCAgICAgICAgdGhpcy5fY2FuY2VsVHJhaWxpbmcoKTtcblx0ICAgICAgICB0aGlzLl90cmFpbGluZ1ZhbHVlID0geDtcblx0ICAgICAgICB0aGlzLl90aW1lb3V0SWQgPSBzZXRUaW1lb3V0KHRoaXMuXyR0cmFpbGluZ0NhbGwsIHJlbWFpbmluZyk7XG5cdCAgICAgIH1cblx0ICAgIH1cblx0ICB9LFxuXG5cdCAgX2hhbmRsZUVuZDogZnVuY3Rpb24gX2hhbmRsZUVuZCgpIHtcblx0ICAgIGlmICh0aGlzLl9hY3RpdmF0aW5nKSB7XG5cdCAgICAgIHRoaXMuX2VtaXRFbmQoKTtcblx0ICAgIH0gZWxzZSB7XG5cdCAgICAgIGlmICh0aGlzLl90aW1lb3V0SWQpIHtcblx0ICAgICAgICB0aGlzLl9lbmRMYXRlciA9IHRydWU7XG5cdCAgICAgIH0gZWxzZSB7XG5cdCAgICAgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgICAgICB9XG5cdCAgICB9XG5cdCAgfSxcblxuXHQgIF9jYW5jZWxUcmFpbGluZzogZnVuY3Rpb24gX2NhbmNlbFRyYWlsaW5nKCkge1xuXHQgICAgaWYgKHRoaXMuX3RpbWVvdXRJZCAhPT0gbnVsbCkge1xuXHQgICAgICBjbGVhclRpbWVvdXQodGhpcy5fdGltZW91dElkKTtcblx0ICAgICAgdGhpcy5fdGltZW91dElkID0gbnVsbDtcblx0ICAgIH1cblx0ICB9LFxuXG5cdCAgX3RyYWlsaW5nQ2FsbDogZnVuY3Rpb24gX3RyYWlsaW5nQ2FsbCgpIHtcblx0ICAgIHRoaXMuX2VtaXRWYWx1ZSh0aGlzLl90cmFpbGluZ1ZhbHVlKTtcblx0ICAgIHRoaXMuX3RpbWVvdXRJZCA9IG51bGw7XG5cdCAgICB0aGlzLl90cmFpbGluZ1ZhbHVlID0gbnVsbDtcblx0ICAgIHRoaXMuX2xhc3RDYWxsVGltZSA9ICF0aGlzLl9sZWFkaW5nID8gMCA6IG5vdygpO1xuXHQgICAgaWYgKHRoaXMuX2VuZExhdGVyKSB7XG5cdCAgICAgIHRoaXMuX2VtaXRFbmQoKTtcblx0ICAgIH1cblx0ICB9XG5cblx0fTtcblxuXHR2YXIgUyA9IGNyZWF0ZVN0cmVhbSgndGhyb3R0bGUnLCBtaXhpbik7XG5cdHZhciBQID0gY3JlYXRlUHJvcGVydHkoJ3Rocm90dGxlJywgbWl4aW4pO1xuXG5cdG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gdGhyb3R0bGUob2JzLCB3YWl0KSB7XG5cdCAgdmFyIF9yZWYyID0gYXJndW1lbnRzLmxlbmd0aCA8PSAyIHx8IGFyZ3VtZW50c1syXSA9PT0gdW5kZWZpbmVkID8ge30gOiBhcmd1bWVudHNbMl07XG5cblx0ICB2YXIgX3JlZjIkbGVhZGluZyA9IF9yZWYyLmxlYWRpbmc7XG5cdCAgdmFyIGxlYWRpbmcgPSBfcmVmMiRsZWFkaW5nID09PSB1bmRlZmluZWQgPyB0cnVlIDogX3JlZjIkbGVhZGluZztcblx0ICB2YXIgX3JlZjIkdHJhaWxpbmcgPSBfcmVmMi50cmFpbGluZztcblx0ICB2YXIgdHJhaWxpbmcgPSBfcmVmMiR0cmFpbGluZyA9PT0gdW5kZWZpbmVkID8gdHJ1ZSA6IF9yZWYyJHRyYWlsaW5nO1xuXG5cdCAgcmV0dXJuIG5ldyAob2JzLl9vZlNhbWVUeXBlKFMsIFApKShvYnMsIHsgd2FpdDogd2FpdCwgbGVhZGluZzogbGVhZGluZywgdHJhaWxpbmc6IHRyYWlsaW5nIH0pO1xuXHR9O1xuXG4vKioqLyB9LFxuLyogNDYgKi9cbi8qKiovIGZ1bmN0aW9uKG1vZHVsZSwgZXhwb3J0cykge1xuXG5cdFwidXNlIHN0cmljdFwiO1xuXG5cdG1vZHVsZS5leHBvcnRzID0gRGF0ZS5ub3cgPyBmdW5jdGlvbiAoKSB7XG5cdCAgcmV0dXJuIERhdGUubm93KCk7XG5cdH0gOiBmdW5jdGlvbiAoKSB7XG5cdCAgcmV0dXJuIG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuXHR9O1xuXG4vKioqLyB9LFxuLyogNDcgKi9cbi8qKiovIGZ1bmN0aW9uKG1vZHVsZSwgZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXykge1xuXG5cdCd1c2Ugc3RyaWN0JztcblxuXHR2YXIgX3JlcXVpcmUgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDI1KTtcblxuXHR2YXIgY3JlYXRlU3RyZWFtID0gX3JlcXVpcmUuY3JlYXRlU3RyZWFtO1xuXHR2YXIgY3JlYXRlUHJvcGVydHkgPSBfcmVxdWlyZS5jcmVhdGVQcm9wZXJ0eTtcblxuXHR2YXIgbm93ID0gX193ZWJwYWNrX3JlcXVpcmVfXyg0Nik7XG5cblx0dmFyIG1peGluID0ge1xuXG5cdCAgX2luaXQ6IGZ1bmN0aW9uIF9pbml0KF9yZWYpIHtcblx0ICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cblx0ICAgIHZhciB3YWl0ID0gX3JlZi53YWl0O1xuXHQgICAgdmFyIGltbWVkaWF0ZSA9IF9yZWYuaW1tZWRpYXRlO1xuXG5cdCAgICB0aGlzLl93YWl0ID0gTWF0aC5tYXgoMCwgd2FpdCk7XG5cdCAgICB0aGlzLl9pbW1lZGlhdGUgPSBpbW1lZGlhdGU7XG5cdCAgICB0aGlzLl9sYXN0QXR0ZW1wdCA9IDA7XG5cdCAgICB0aGlzLl90aW1lb3V0SWQgPSBudWxsO1xuXHQgICAgdGhpcy5fbGF0ZXJWYWx1ZSA9IG51bGw7XG5cdCAgICB0aGlzLl9lbmRMYXRlciA9IGZhbHNlO1xuXHQgICAgdGhpcy5fJGxhdGVyID0gZnVuY3Rpb24gKCkge1xuXHQgICAgICByZXR1cm4gX3RoaXMuX2xhdGVyKCk7XG5cdCAgICB9O1xuXHQgIH0sXG5cblx0ICBfZnJlZTogZnVuY3Rpb24gX2ZyZWUoKSB7XG5cdCAgICB0aGlzLl9sYXRlclZhbHVlID0gbnVsbDtcblx0ICAgIHRoaXMuXyRsYXRlciA9IG51bGw7XG5cdCAgfSxcblxuXHQgIF9oYW5kbGVWYWx1ZTogZnVuY3Rpb24gX2hhbmRsZVZhbHVlKHgpIHtcblx0ICAgIGlmICh0aGlzLl9hY3RpdmF0aW5nKSB7XG5cdCAgICAgIHRoaXMuX2VtaXRWYWx1ZSh4KTtcblx0ICAgIH0gZWxzZSB7XG5cdCAgICAgIHRoaXMuX2xhc3RBdHRlbXB0ID0gbm93KCk7XG5cdCAgICAgIGlmICh0aGlzLl9pbW1lZGlhdGUgJiYgIXRoaXMuX3RpbWVvdXRJZCkge1xuXHQgICAgICAgIHRoaXMuX2VtaXRWYWx1ZSh4KTtcblx0ICAgICAgfVxuXHQgICAgICBpZiAoIXRoaXMuX3RpbWVvdXRJZCkge1xuXHQgICAgICAgIHRoaXMuX3RpbWVvdXRJZCA9IHNldFRpbWVvdXQodGhpcy5fJGxhdGVyLCB0aGlzLl93YWl0KTtcblx0ICAgICAgfVxuXHQgICAgICBpZiAoIXRoaXMuX2ltbWVkaWF0ZSkge1xuXHQgICAgICAgIHRoaXMuX2xhdGVyVmFsdWUgPSB4O1xuXHQgICAgICB9XG5cdCAgICB9XG5cdCAgfSxcblxuXHQgIF9oYW5kbGVFbmQ6IGZ1bmN0aW9uIF9oYW5kbGVFbmQoKSB7XG5cdCAgICBpZiAodGhpcy5fYWN0aXZhdGluZykge1xuXHQgICAgICB0aGlzLl9lbWl0RW5kKCk7XG5cdCAgICB9IGVsc2Uge1xuXHQgICAgICBpZiAodGhpcy5fdGltZW91dElkICYmICF0aGlzLl9pbW1lZGlhdGUpIHtcblx0ICAgICAgICB0aGlzLl9lbmRMYXRlciA9IHRydWU7XG5cdCAgICAgIH0gZWxzZSB7XG5cdCAgICAgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgICAgICB9XG5cdCAgICB9XG5cdCAgfSxcblxuXHQgIF9sYXRlcjogZnVuY3Rpb24gX2xhdGVyKCkge1xuXHQgICAgdmFyIGxhc3QgPSBub3coKSAtIHRoaXMuX2xhc3RBdHRlbXB0O1xuXHQgICAgaWYgKGxhc3QgPCB0aGlzLl93YWl0ICYmIGxhc3QgPj0gMCkge1xuXHQgICAgICB0aGlzLl90aW1lb3V0SWQgPSBzZXRUaW1lb3V0KHRoaXMuXyRsYXRlciwgdGhpcy5fd2FpdCAtIGxhc3QpO1xuXHQgICAgfSBlbHNlIHtcblx0ICAgICAgdGhpcy5fdGltZW91dElkID0gbnVsbDtcblx0ICAgICAgaWYgKCF0aGlzLl9pbW1lZGlhdGUpIHtcblx0ICAgICAgICB0aGlzLl9lbWl0VmFsdWUodGhpcy5fbGF0ZXJWYWx1ZSk7XG5cdCAgICAgICAgdGhpcy5fbGF0ZXJWYWx1ZSA9IG51bGw7XG5cdCAgICAgIH1cblx0ICAgICAgaWYgKHRoaXMuX2VuZExhdGVyKSB7XG5cdCAgICAgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgICAgICB9XG5cdCAgICB9XG5cdCAgfVxuXG5cdH07XG5cblx0dmFyIFMgPSBjcmVhdGVTdHJlYW0oJ2RlYm91bmNlJywgbWl4aW4pO1xuXHR2YXIgUCA9IGNyZWF0ZVByb3BlcnR5KCdkZWJvdW5jZScsIG1peGluKTtcblxuXHRtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGRlYm91bmNlKG9icywgd2FpdCkge1xuXHQgIHZhciBfcmVmMiA9IGFyZ3VtZW50cy5sZW5ndGggPD0gMiB8fCBhcmd1bWVudHNbMl0gPT09IHVuZGVmaW5lZCA/IHt9IDogYXJndW1lbnRzWzJdO1xuXG5cdCAgdmFyIF9yZWYyJGltbWVkaWF0ZSA9IF9yZWYyLmltbWVkaWF0ZTtcblx0ICB2YXIgaW1tZWRpYXRlID0gX3JlZjIkaW1tZWRpYXRlID09PSB1bmRlZmluZWQgPyBmYWxzZSA6IF9yZWYyJGltbWVkaWF0ZTtcblxuXHQgIHJldHVybiBuZXcgKG9icy5fb2ZTYW1lVHlwZShTLCBQKSkob2JzLCB7IHdhaXQ6IHdhaXQsIGltbWVkaWF0ZTogaW1tZWRpYXRlIH0pO1xuXHR9O1xuXG4vKioqLyB9LFxuLyogNDggKi9cbi8qKiovIGZ1bmN0aW9uKG1vZHVsZSwgZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXykge1xuXG5cdCd1c2Ugc3RyaWN0JztcblxuXHR2YXIgX3JlcXVpcmUgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDI1KTtcblxuXHR2YXIgY3JlYXRlU3RyZWFtID0gX3JlcXVpcmUuY3JlYXRlU3RyZWFtO1xuXHR2YXIgY3JlYXRlUHJvcGVydHkgPSBfcmVxdWlyZS5jcmVhdGVQcm9wZXJ0eTtcblxuXHR2YXIgbWl4aW4gPSB7XG5cblx0ICBfaW5pdDogZnVuY3Rpb24gX2luaXQoX3JlZikge1xuXHQgICAgdmFyIGZuID0gX3JlZi5mbjtcblxuXHQgICAgdGhpcy5fZm4gPSBmbjtcblx0ICB9LFxuXG5cdCAgX2ZyZWU6IGZ1bmN0aW9uIF9mcmVlKCkge1xuXHQgICAgdGhpcy5fZm4gPSBudWxsO1xuXHQgIH0sXG5cblx0ICBfaGFuZGxlRXJyb3I6IGZ1bmN0aW9uIF9oYW5kbGVFcnJvcih4KSB7XG5cdCAgICB2YXIgZm4gPSB0aGlzLl9mbjtcblx0ICAgIHRoaXMuX2VtaXRFcnJvcihmbih4KSk7XG5cdCAgfVxuXG5cdH07XG5cblx0dmFyIFMgPSBjcmVhdGVTdHJlYW0oJ21hcEVycm9ycycsIG1peGluKTtcblx0dmFyIFAgPSBjcmVhdGVQcm9wZXJ0eSgnbWFwRXJyb3JzJywgbWl4aW4pO1xuXG5cdHZhciBpZCA9IGZ1bmN0aW9uIGlkKHgpIHtcblx0ICByZXR1cm4geDtcblx0fTtcblxuXHRtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIG1hcEVycm9ycyhvYnMpIHtcblx0ICB2YXIgZm4gPSBhcmd1bWVudHMubGVuZ3RoIDw9IDEgfHwgYXJndW1lbnRzWzFdID09PSB1bmRlZmluZWQgPyBpZCA6IGFyZ3VtZW50c1sxXTtcblxuXHQgIHJldHVybiBuZXcgKG9icy5fb2ZTYW1lVHlwZShTLCBQKSkob2JzLCB7IGZuOiBmbiB9KTtcblx0fTtcblxuLyoqKi8gfSxcbi8qIDQ5ICovXG4vKioqLyBmdW5jdGlvbihtb2R1bGUsIGV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pIHtcblxuXHQndXNlIHN0cmljdCc7XG5cblx0dmFyIF9yZXF1aXJlID0gX193ZWJwYWNrX3JlcXVpcmVfXygyNSk7XG5cblx0dmFyIGNyZWF0ZVN0cmVhbSA9IF9yZXF1aXJlLmNyZWF0ZVN0cmVhbTtcblx0dmFyIGNyZWF0ZVByb3BlcnR5ID0gX3JlcXVpcmUuY3JlYXRlUHJvcGVydHk7XG5cblx0dmFyIG1peGluID0ge1xuXG5cdCAgX2luaXQ6IGZ1bmN0aW9uIF9pbml0KF9yZWYpIHtcblx0ICAgIHZhciBmbiA9IF9yZWYuZm47XG5cblx0ICAgIHRoaXMuX2ZuID0gZm47XG5cdCAgfSxcblxuXHQgIF9mcmVlOiBmdW5jdGlvbiBfZnJlZSgpIHtcblx0ICAgIHRoaXMuX2ZuID0gbnVsbDtcblx0ICB9LFxuXG5cdCAgX2hhbmRsZUVycm9yOiBmdW5jdGlvbiBfaGFuZGxlRXJyb3IoeCkge1xuXHQgICAgdmFyIGZuID0gdGhpcy5fZm47XG5cdCAgICBpZiAoZm4oeCkpIHtcblx0ICAgICAgdGhpcy5fZW1pdEVycm9yKHgpO1xuXHQgICAgfVxuXHQgIH1cblxuXHR9O1xuXG5cdHZhciBTID0gY3JlYXRlU3RyZWFtKCdmaWx0ZXJFcnJvcnMnLCBtaXhpbik7XG5cdHZhciBQID0gY3JlYXRlUHJvcGVydHkoJ2ZpbHRlckVycm9ycycsIG1peGluKTtcblxuXHR2YXIgaWQgPSBmdW5jdGlvbiBpZCh4KSB7XG5cdCAgcmV0dXJuIHg7XG5cdH07XG5cblx0bW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBmaWx0ZXJFcnJvcnMob2JzKSB7XG5cdCAgdmFyIGZuID0gYXJndW1lbnRzLmxlbmd0aCA8PSAxIHx8IGFyZ3VtZW50c1sxXSA9PT0gdW5kZWZpbmVkID8gaWQgOiBhcmd1bWVudHNbMV07XG5cblx0ICByZXR1cm4gbmV3IChvYnMuX29mU2FtZVR5cGUoUywgUCkpKG9icywgeyBmbjogZm4gfSk7XG5cdH07XG5cbi8qKiovIH0sXG4vKiA1MCAqL1xuLyoqKi8gZnVuY3Rpb24obW9kdWxlLCBleHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKSB7XG5cblx0J3VzZSBzdHJpY3QnO1xuXG5cdHZhciBfcmVxdWlyZSA9IF9fd2VicGFja19yZXF1aXJlX18oMjUpO1xuXG5cdHZhciBjcmVhdGVTdHJlYW0gPSBfcmVxdWlyZS5jcmVhdGVTdHJlYW07XG5cdHZhciBjcmVhdGVQcm9wZXJ0eSA9IF9yZXF1aXJlLmNyZWF0ZVByb3BlcnR5O1xuXG5cdHZhciBtaXhpbiA9IHtcblx0ICBfaGFuZGxlVmFsdWU6IGZ1bmN0aW9uIF9oYW5kbGVWYWx1ZSgpIHt9XG5cdH07XG5cblx0dmFyIFMgPSBjcmVhdGVTdHJlYW0oJ2lnbm9yZVZhbHVlcycsIG1peGluKTtcblx0dmFyIFAgPSBjcmVhdGVQcm9wZXJ0eSgnaWdub3JlVmFsdWVzJywgbWl4aW4pO1xuXG5cdG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gaWdub3JlVmFsdWVzKG9icykge1xuXHQgIHJldHVybiBuZXcgKG9icy5fb2ZTYW1lVHlwZShTLCBQKSkob2JzKTtcblx0fTtcblxuLyoqKi8gfSxcbi8qIDUxICovXG4vKioqLyBmdW5jdGlvbihtb2R1bGUsIGV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pIHtcblxuXHQndXNlIHN0cmljdCc7XG5cblx0dmFyIF9yZXF1aXJlID0gX193ZWJwYWNrX3JlcXVpcmVfXygyNSk7XG5cblx0dmFyIGNyZWF0ZVN0cmVhbSA9IF9yZXF1aXJlLmNyZWF0ZVN0cmVhbTtcblx0dmFyIGNyZWF0ZVByb3BlcnR5ID0gX3JlcXVpcmUuY3JlYXRlUHJvcGVydHk7XG5cblx0dmFyIG1peGluID0ge1xuXHQgIF9oYW5kbGVFcnJvcjogZnVuY3Rpb24gX2hhbmRsZUVycm9yKCkge31cblx0fTtcblxuXHR2YXIgUyA9IGNyZWF0ZVN0cmVhbSgnaWdub3JlRXJyb3JzJywgbWl4aW4pO1xuXHR2YXIgUCA9IGNyZWF0ZVByb3BlcnR5KCdpZ25vcmVFcnJvcnMnLCBtaXhpbik7XG5cblx0bW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBpZ25vcmVFcnJvcnMob2JzKSB7XG5cdCAgcmV0dXJuIG5ldyAob2JzLl9vZlNhbWVUeXBlKFMsIFApKShvYnMpO1xuXHR9O1xuXG4vKioqLyB9LFxuLyogNTIgKi9cbi8qKiovIGZ1bmN0aW9uKG1vZHVsZSwgZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXykge1xuXG5cdCd1c2Ugc3RyaWN0JztcblxuXHR2YXIgX3JlcXVpcmUgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDI1KTtcblxuXHR2YXIgY3JlYXRlU3RyZWFtID0gX3JlcXVpcmUuY3JlYXRlU3RyZWFtO1xuXHR2YXIgY3JlYXRlUHJvcGVydHkgPSBfcmVxdWlyZS5jcmVhdGVQcm9wZXJ0eTtcblxuXHR2YXIgbWl4aW4gPSB7XG5cdCAgX2hhbmRsZUVuZDogZnVuY3Rpb24gX2hhbmRsZUVuZCgpIHt9XG5cdH07XG5cblx0dmFyIFMgPSBjcmVhdGVTdHJlYW0oJ2lnbm9yZUVuZCcsIG1peGluKTtcblx0dmFyIFAgPSBjcmVhdGVQcm9wZXJ0eSgnaWdub3JlRW5kJywgbWl4aW4pO1xuXG5cdG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gaWdub3JlRW5kKG9icykge1xuXHQgIHJldHVybiBuZXcgKG9icy5fb2ZTYW1lVHlwZShTLCBQKSkob2JzKTtcblx0fTtcblxuLyoqKi8gfSxcbi8qIDUzICovXG4vKioqLyBmdW5jdGlvbihtb2R1bGUsIGV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pIHtcblxuXHQndXNlIHN0cmljdCc7XG5cblx0dmFyIF9yZXF1aXJlID0gX193ZWJwYWNrX3JlcXVpcmVfXygyNSk7XG5cblx0dmFyIGNyZWF0ZVN0cmVhbSA9IF9yZXF1aXJlLmNyZWF0ZVN0cmVhbTtcblx0dmFyIGNyZWF0ZVByb3BlcnR5ID0gX3JlcXVpcmUuY3JlYXRlUHJvcGVydHk7XG5cblx0dmFyIG1peGluID0ge1xuXG5cdCAgX2luaXQ6IGZ1bmN0aW9uIF9pbml0KF9yZWYpIHtcblx0ICAgIHZhciBmbiA9IF9yZWYuZm47XG5cblx0ICAgIHRoaXMuX2ZuID0gZm47XG5cdCAgfSxcblxuXHQgIF9mcmVlOiBmdW5jdGlvbiBfZnJlZSgpIHtcblx0ICAgIHRoaXMuX2ZuID0gbnVsbDtcblx0ICB9LFxuXG5cdCAgX2hhbmRsZUVuZDogZnVuY3Rpb24gX2hhbmRsZUVuZCgpIHtcblx0ICAgIHZhciBmbiA9IHRoaXMuX2ZuO1xuXHQgICAgdGhpcy5fZW1pdFZhbHVlKGZuKCkpO1xuXHQgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgIH1cblxuXHR9O1xuXG5cdHZhciBTID0gY3JlYXRlU3RyZWFtKCdiZWZvcmVFbmQnLCBtaXhpbik7XG5cdHZhciBQID0gY3JlYXRlUHJvcGVydHkoJ2JlZm9yZUVuZCcsIG1peGluKTtcblxuXHRtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGJlZm9yZUVuZChvYnMsIGZuKSB7XG5cdCAgcmV0dXJuIG5ldyAob2JzLl9vZlNhbWVUeXBlKFMsIFApKShvYnMsIHsgZm46IGZuIH0pO1xuXHR9O1xuXG4vKioqLyB9LFxuLyogNTQgKi9cbi8qKiovIGZ1bmN0aW9uKG1vZHVsZSwgZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXykge1xuXG5cdCd1c2Ugc3RyaWN0JztcblxuXHR2YXIgX3JlcXVpcmUgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDI1KTtcblxuXHR2YXIgY3JlYXRlU3RyZWFtID0gX3JlcXVpcmUuY3JlYXRlU3RyZWFtO1xuXHR2YXIgY3JlYXRlUHJvcGVydHkgPSBfcmVxdWlyZS5jcmVhdGVQcm9wZXJ0eTtcblxuXHR2YXIgX3JlcXVpcmUyID0gX193ZWJwYWNrX3JlcXVpcmVfXyg1KTtcblxuXHR2YXIgc2xpZGUgPSBfcmVxdWlyZTIuc2xpZGU7XG5cblx0dmFyIG1peGluID0ge1xuXG5cdCAgX2luaXQ6IGZ1bmN0aW9uIF9pbml0KF9yZWYpIHtcblx0ICAgIHZhciBtaW4gPSBfcmVmLm1pbjtcblx0ICAgIHZhciBtYXggPSBfcmVmLm1heDtcblxuXHQgICAgdGhpcy5fbWF4ID0gbWF4O1xuXHQgICAgdGhpcy5fbWluID0gbWluO1xuXHQgICAgdGhpcy5fYnVmZiA9IFtdO1xuXHQgIH0sXG5cblx0ICBfZnJlZTogZnVuY3Rpb24gX2ZyZWUoKSB7XG5cdCAgICB0aGlzLl9idWZmID0gbnVsbDtcblx0ICB9LFxuXG5cdCAgX2hhbmRsZVZhbHVlOiBmdW5jdGlvbiBfaGFuZGxlVmFsdWUoeCkge1xuXHQgICAgdGhpcy5fYnVmZiA9IHNsaWRlKHRoaXMuX2J1ZmYsIHgsIHRoaXMuX21heCk7XG5cdCAgICBpZiAodGhpcy5fYnVmZi5sZW5ndGggPj0gdGhpcy5fbWluKSB7XG5cdCAgICAgIHRoaXMuX2VtaXRWYWx1ZSh0aGlzLl9idWZmKTtcblx0ICAgIH1cblx0ICB9XG5cblx0fTtcblxuXHR2YXIgUyA9IGNyZWF0ZVN0cmVhbSgnc2xpZGluZ1dpbmRvdycsIG1peGluKTtcblx0dmFyIFAgPSBjcmVhdGVQcm9wZXJ0eSgnc2xpZGluZ1dpbmRvdycsIG1peGluKTtcblxuXHRtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIHNsaWRpbmdXaW5kb3cob2JzLCBtYXgpIHtcblx0ICB2YXIgbWluID0gYXJndW1lbnRzLmxlbmd0aCA8PSAyIHx8IGFyZ3VtZW50c1syXSA9PT0gdW5kZWZpbmVkID8gMCA6IGFyZ3VtZW50c1syXTtcblxuXHQgIHJldHVybiBuZXcgKG9icy5fb2ZTYW1lVHlwZShTLCBQKSkob2JzLCB7IG1pbjogbWluLCBtYXg6IG1heCB9KTtcblx0fTtcblxuLyoqKi8gfSxcbi8qIDU1ICovXG4vKioqLyBmdW5jdGlvbihtb2R1bGUsIGV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pIHtcblxuXHQndXNlIHN0cmljdCc7XG5cblx0dmFyIF9yZXF1aXJlID0gX193ZWJwYWNrX3JlcXVpcmVfXygyNSk7XG5cblx0dmFyIGNyZWF0ZVN0cmVhbSA9IF9yZXF1aXJlLmNyZWF0ZVN0cmVhbTtcblx0dmFyIGNyZWF0ZVByb3BlcnR5ID0gX3JlcXVpcmUuY3JlYXRlUHJvcGVydHk7XG5cblx0dmFyIG1peGluID0ge1xuXG5cdCAgX2luaXQ6IGZ1bmN0aW9uIF9pbml0KF9yZWYpIHtcblx0ICAgIHZhciBmbiA9IF9yZWYuZm47XG5cdCAgICB2YXIgZmx1c2hPbkVuZCA9IF9yZWYuZmx1c2hPbkVuZDtcblxuXHQgICAgdGhpcy5fZm4gPSBmbjtcblx0ICAgIHRoaXMuX2ZsdXNoT25FbmQgPSBmbHVzaE9uRW5kO1xuXHQgICAgdGhpcy5fYnVmZiA9IFtdO1xuXHQgIH0sXG5cblx0ICBfZnJlZTogZnVuY3Rpb24gX2ZyZWUoKSB7XG5cdCAgICB0aGlzLl9idWZmID0gbnVsbDtcblx0ICB9LFxuXG5cdCAgX2ZsdXNoOiBmdW5jdGlvbiBfZmx1c2goKSB7XG5cdCAgICBpZiAodGhpcy5fYnVmZiAhPT0gbnVsbCAmJiB0aGlzLl9idWZmLmxlbmd0aCAhPT0gMCkge1xuXHQgICAgICB0aGlzLl9lbWl0VmFsdWUodGhpcy5fYnVmZik7XG5cdCAgICAgIHRoaXMuX2J1ZmYgPSBbXTtcblx0ICAgIH1cblx0ICB9LFxuXG5cdCAgX2hhbmRsZVZhbHVlOiBmdW5jdGlvbiBfaGFuZGxlVmFsdWUoeCkge1xuXHQgICAgdGhpcy5fYnVmZi5wdXNoKHgpO1xuXHQgICAgdmFyIGZuID0gdGhpcy5fZm47XG5cdCAgICBpZiAoIWZuKHgpKSB7XG5cdCAgICAgIHRoaXMuX2ZsdXNoKCk7XG5cdCAgICB9XG5cdCAgfSxcblxuXHQgIF9oYW5kbGVFbmQ6IGZ1bmN0aW9uIF9oYW5kbGVFbmQoKSB7XG5cdCAgICBpZiAodGhpcy5fZmx1c2hPbkVuZCkge1xuXHQgICAgICB0aGlzLl9mbHVzaCgpO1xuXHQgICAgfVxuXHQgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgIH1cblxuXHR9O1xuXG5cdHZhciBTID0gY3JlYXRlU3RyZWFtKCdidWZmZXJXaGlsZScsIG1peGluKTtcblx0dmFyIFAgPSBjcmVhdGVQcm9wZXJ0eSgnYnVmZmVyV2hpbGUnLCBtaXhpbik7XG5cblx0dmFyIGlkID0gZnVuY3Rpb24gaWQoeCkge1xuXHQgIHJldHVybiB4O1xuXHR9O1xuXG5cdG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gYnVmZmVyV2hpbGUob2JzLCBmbikge1xuXHQgIHZhciBfcmVmMiA9IGFyZ3VtZW50cy5sZW5ndGggPD0gMiB8fCBhcmd1bWVudHNbMl0gPT09IHVuZGVmaW5lZCA/IHt9IDogYXJndW1lbnRzWzJdO1xuXG5cdCAgdmFyIF9yZWYyJGZsdXNoT25FbmQgPSBfcmVmMi5mbHVzaE9uRW5kO1xuXHQgIHZhciBmbHVzaE9uRW5kID0gX3JlZjIkZmx1c2hPbkVuZCA9PT0gdW5kZWZpbmVkID8gdHJ1ZSA6IF9yZWYyJGZsdXNoT25FbmQ7XG5cblx0ICByZXR1cm4gbmV3IChvYnMuX29mU2FtZVR5cGUoUywgUCkpKG9icywgeyBmbjogZm4gfHwgaWQsIGZsdXNoT25FbmQ6IGZsdXNoT25FbmQgfSk7XG5cdH07XG5cbi8qKiovIH0sXG4vKiA1NiAqL1xuLyoqKi8gZnVuY3Rpb24obW9kdWxlLCBleHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKSB7XG5cblx0J3VzZSBzdHJpY3QnO1xuXG5cdHZhciBfcmVxdWlyZSA9IF9fd2VicGFja19yZXF1aXJlX18oMjUpO1xuXG5cdHZhciBjcmVhdGVTdHJlYW0gPSBfcmVxdWlyZS5jcmVhdGVTdHJlYW07XG5cdHZhciBjcmVhdGVQcm9wZXJ0eSA9IF9yZXF1aXJlLmNyZWF0ZVByb3BlcnR5O1xuXG5cdHZhciBtaXhpbiA9IHtcblxuXHQgIF9pbml0OiBmdW5jdGlvbiBfaW5pdChfcmVmKSB7XG5cdCAgICB2YXIgY291bnQgPSBfcmVmLmNvdW50O1xuXHQgICAgdmFyIGZsdXNoT25FbmQgPSBfcmVmLmZsdXNoT25FbmQ7XG5cblx0ICAgIHRoaXMuX2NvdW50ID0gY291bnQ7XG5cdCAgICB0aGlzLl9mbHVzaE9uRW5kID0gZmx1c2hPbkVuZDtcblx0ICAgIHRoaXMuX2J1ZmYgPSBbXTtcblx0ICB9LFxuXG5cdCAgX2ZyZWU6IGZ1bmN0aW9uIF9mcmVlKCkge1xuXHQgICAgdGhpcy5fYnVmZiA9IG51bGw7XG5cdCAgfSxcblxuXHQgIF9mbHVzaDogZnVuY3Rpb24gX2ZsdXNoKCkge1xuXHQgICAgaWYgKHRoaXMuX2J1ZmYgIT09IG51bGwgJiYgdGhpcy5fYnVmZi5sZW5ndGggIT09IDApIHtcblx0ICAgICAgdGhpcy5fZW1pdFZhbHVlKHRoaXMuX2J1ZmYpO1xuXHQgICAgICB0aGlzLl9idWZmID0gW107XG5cdCAgICB9XG5cdCAgfSxcblxuXHQgIF9oYW5kbGVWYWx1ZTogZnVuY3Rpb24gX2hhbmRsZVZhbHVlKHgpIHtcblx0ICAgIHRoaXMuX2J1ZmYucHVzaCh4KTtcblx0ICAgIGlmICh0aGlzLl9idWZmLmxlbmd0aCA+PSB0aGlzLl9jb3VudCkge1xuXHQgICAgICB0aGlzLl9mbHVzaCgpO1xuXHQgICAgfVxuXHQgIH0sXG5cblx0ICBfaGFuZGxlRW5kOiBmdW5jdGlvbiBfaGFuZGxlRW5kKCkge1xuXHQgICAgaWYgKHRoaXMuX2ZsdXNoT25FbmQpIHtcblx0ICAgICAgdGhpcy5fZmx1c2goKTtcblx0ICAgIH1cblx0ICAgIHRoaXMuX2VtaXRFbmQoKTtcblx0ICB9XG5cblx0fTtcblxuXHR2YXIgUyA9IGNyZWF0ZVN0cmVhbSgnYnVmZmVyV2l0aENvdW50JywgbWl4aW4pO1xuXHR2YXIgUCA9IGNyZWF0ZVByb3BlcnR5KCdidWZmZXJXaXRoQ291bnQnLCBtaXhpbik7XG5cblx0bW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBidWZmZXJXaGlsZShvYnMsIGNvdW50KSB7XG5cdCAgdmFyIF9yZWYyID0gYXJndW1lbnRzLmxlbmd0aCA8PSAyIHx8IGFyZ3VtZW50c1syXSA9PT0gdW5kZWZpbmVkID8ge30gOiBhcmd1bWVudHNbMl07XG5cblx0ICB2YXIgX3JlZjIkZmx1c2hPbkVuZCA9IF9yZWYyLmZsdXNoT25FbmQ7XG5cdCAgdmFyIGZsdXNoT25FbmQgPSBfcmVmMiRmbHVzaE9uRW5kID09PSB1bmRlZmluZWQgPyB0cnVlIDogX3JlZjIkZmx1c2hPbkVuZDtcblxuXHQgIHJldHVybiBuZXcgKG9icy5fb2ZTYW1lVHlwZShTLCBQKSkob2JzLCB7IGNvdW50OiBjb3VudCwgZmx1c2hPbkVuZDogZmx1c2hPbkVuZCB9KTtcblx0fTtcblxuLyoqKi8gfSxcbi8qIDU3ICovXG4vKioqLyBmdW5jdGlvbihtb2R1bGUsIGV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pIHtcblxuXHQndXNlIHN0cmljdCc7XG5cblx0dmFyIF9yZXF1aXJlID0gX193ZWJwYWNrX3JlcXVpcmVfXygyNSk7XG5cblx0dmFyIGNyZWF0ZVN0cmVhbSA9IF9yZXF1aXJlLmNyZWF0ZVN0cmVhbTtcblx0dmFyIGNyZWF0ZVByb3BlcnR5ID0gX3JlcXVpcmUuY3JlYXRlUHJvcGVydHk7XG5cblx0dmFyIG1peGluID0ge1xuXG5cdCAgX2luaXQ6IGZ1bmN0aW9uIF9pbml0KF9yZWYpIHtcblx0ICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cblx0ICAgIHZhciB3YWl0ID0gX3JlZi53YWl0O1xuXHQgICAgdmFyIGNvdW50ID0gX3JlZi5jb3VudDtcblx0ICAgIHZhciBmbHVzaE9uRW5kID0gX3JlZi5mbHVzaE9uRW5kO1xuXG5cdCAgICB0aGlzLl93YWl0ID0gd2FpdDtcblx0ICAgIHRoaXMuX2NvdW50ID0gY291bnQ7XG5cdCAgICB0aGlzLl9mbHVzaE9uRW5kID0gZmx1c2hPbkVuZDtcblx0ICAgIHRoaXMuX2ludGVydmFsSWQgPSBudWxsO1xuXHQgICAgdGhpcy5fJG9uVGljayA9IGZ1bmN0aW9uICgpIHtcblx0ICAgICAgcmV0dXJuIF90aGlzLl9mbHVzaCgpO1xuXHQgICAgfTtcblx0ICAgIHRoaXMuX2J1ZmYgPSBbXTtcblx0ICB9LFxuXG5cdCAgX2ZyZWU6IGZ1bmN0aW9uIF9mcmVlKCkge1xuXHQgICAgdGhpcy5fJG9uVGljayA9IG51bGw7XG5cdCAgICB0aGlzLl9idWZmID0gbnVsbDtcblx0ICB9LFxuXG5cdCAgX2ZsdXNoOiBmdW5jdGlvbiBfZmx1c2goKSB7XG5cdCAgICBpZiAodGhpcy5fYnVmZiAhPT0gbnVsbCkge1xuXHQgICAgICB0aGlzLl9lbWl0VmFsdWUodGhpcy5fYnVmZik7XG5cdCAgICAgIHRoaXMuX2J1ZmYgPSBbXTtcblx0ICAgIH1cblx0ICB9LFxuXG5cdCAgX2hhbmRsZVZhbHVlOiBmdW5jdGlvbiBfaGFuZGxlVmFsdWUoeCkge1xuXHQgICAgdGhpcy5fYnVmZi5wdXNoKHgpO1xuXHQgICAgaWYgKHRoaXMuX2J1ZmYubGVuZ3RoID49IHRoaXMuX2NvdW50KSB7XG5cdCAgICAgIGNsZWFySW50ZXJ2YWwodGhpcy5faW50ZXJ2YWxJZCk7XG5cdCAgICAgIHRoaXMuX2ZsdXNoKCk7XG5cdCAgICAgIHRoaXMuX2ludGVydmFsSWQgPSBzZXRJbnRlcnZhbCh0aGlzLl8kb25UaWNrLCB0aGlzLl93YWl0KTtcblx0ICAgIH1cblx0ICB9LFxuXG5cdCAgX2hhbmRsZUVuZDogZnVuY3Rpb24gX2hhbmRsZUVuZCgpIHtcblx0ICAgIGlmICh0aGlzLl9mbHVzaE9uRW5kICYmIHRoaXMuX2J1ZmYubGVuZ3RoICE9PSAwKSB7XG5cdCAgICAgIHRoaXMuX2ZsdXNoKCk7XG5cdCAgICB9XG5cdCAgICB0aGlzLl9lbWl0RW5kKCk7XG5cdCAgfSxcblxuXHQgIF9vbkFjdGl2YXRpb246IGZ1bmN0aW9uIF9vbkFjdGl2YXRpb24oKSB7XG5cdCAgICB0aGlzLl9zb3VyY2Uub25BbnkodGhpcy5fJGhhbmRsZUFueSk7IC8vIGNvcGllZCBmcm9tIHBhdHRlcm5zL29uZS1zb3VyY2Vcblx0ICAgIHRoaXMuX2ludGVydmFsSWQgPSBzZXRJbnRlcnZhbCh0aGlzLl8kb25UaWNrLCB0aGlzLl93YWl0KTtcblx0ICB9LFxuXG5cdCAgX29uRGVhY3RpdmF0aW9uOiBmdW5jdGlvbiBfb25EZWFjdGl2YXRpb24oKSB7XG5cdCAgICBpZiAodGhpcy5faW50ZXJ2YWxJZCAhPT0gbnVsbCkge1xuXHQgICAgICBjbGVhckludGVydmFsKHRoaXMuX2ludGVydmFsSWQpO1xuXHQgICAgICB0aGlzLl9pbnRlcnZhbElkID0gbnVsbDtcblx0ICAgIH1cblx0ICAgIHRoaXMuX3NvdXJjZS5vZmZBbnkodGhpcy5fJGhhbmRsZUFueSk7IC8vIGNvcGllZCBmcm9tIHBhdHRlcm5zL29uZS1zb3VyY2Vcblx0ICB9XG5cblx0fTtcblxuXHR2YXIgUyA9IGNyZWF0ZVN0cmVhbSgnYnVmZmVyV2l0aFRpbWVPckNvdW50JywgbWl4aW4pO1xuXHR2YXIgUCA9IGNyZWF0ZVByb3BlcnR5KCdidWZmZXJXaXRoVGltZU9yQ291bnQnLCBtaXhpbik7XG5cblx0bW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBidWZmZXJXaXRoVGltZU9yQ291bnQob2JzLCB3YWl0LCBjb3VudCkge1xuXHQgIHZhciBfcmVmMiA9IGFyZ3VtZW50cy5sZW5ndGggPD0gMyB8fCBhcmd1bWVudHNbM10gPT09IHVuZGVmaW5lZCA/IHt9IDogYXJndW1lbnRzWzNdO1xuXG5cdCAgdmFyIF9yZWYyJGZsdXNoT25FbmQgPSBfcmVmMi5mbHVzaE9uRW5kO1xuXHQgIHZhciBmbHVzaE9uRW5kID0gX3JlZjIkZmx1c2hPbkVuZCA9PT0gdW5kZWZpbmVkID8gdHJ1ZSA6IF9yZWYyJGZsdXNoT25FbmQ7XG5cblx0ICByZXR1cm4gbmV3IChvYnMuX29mU2FtZVR5cGUoUywgUCkpKG9icywgeyB3YWl0OiB3YWl0LCBjb3VudDogY291bnQsIGZsdXNoT25FbmQ6IGZsdXNoT25FbmQgfSk7XG5cdH07XG5cbi8qKiovIH0sXG4vKiA1OCAqL1xuLyoqKi8gZnVuY3Rpb24obW9kdWxlLCBleHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKSB7XG5cblx0J3VzZSBzdHJpY3QnO1xuXG5cdHZhciBfcmVxdWlyZSA9IF9fd2VicGFja19yZXF1aXJlX18oMjUpO1xuXG5cdHZhciBjcmVhdGVTdHJlYW0gPSBfcmVxdWlyZS5jcmVhdGVTdHJlYW07XG5cdHZhciBjcmVhdGVQcm9wZXJ0eSA9IF9yZXF1aXJlLmNyZWF0ZVByb3BlcnR5O1xuXG5cdGZ1bmN0aW9uIHhmb3JtRm9yT2JzKG9icykge1xuXHQgIHJldHVybiB7XG5cblx0ICAgICdAQHRyYW5zZHVjZXIvc3RlcCc6IGZ1bmN0aW9uIHRyYW5zZHVjZXJTdGVwKHJlcywgaW5wdXQpIHtcblx0ICAgICAgb2JzLl9lbWl0VmFsdWUoaW5wdXQpO1xuXHQgICAgICByZXR1cm4gbnVsbDtcblx0ICAgIH0sXG5cblx0ICAgICdAQHRyYW5zZHVjZXIvcmVzdWx0JzogZnVuY3Rpb24gdHJhbnNkdWNlclJlc3VsdCgpIHtcblx0ICAgICAgb2JzLl9lbWl0RW5kKCk7XG5cdCAgICAgIHJldHVybiBudWxsO1xuXHQgICAgfVxuXG5cdCAgfTtcblx0fVxuXG5cdHZhciBtaXhpbiA9IHtcblxuXHQgIF9pbml0OiBmdW5jdGlvbiBfaW5pdChfcmVmKSB7XG5cdCAgICB2YXIgdHJhbnNkdWNlciA9IF9yZWYudHJhbnNkdWNlcjtcblxuXHQgICAgdGhpcy5feGZvcm0gPSB0cmFuc2R1Y2VyKHhmb3JtRm9yT2JzKHRoaXMpKTtcblx0ICB9LFxuXG5cdCAgX2ZyZWU6IGZ1bmN0aW9uIF9mcmVlKCkge1xuXHQgICAgdGhpcy5feGZvcm0gPSBudWxsO1xuXHQgIH0sXG5cblx0ICBfaGFuZGxlVmFsdWU6IGZ1bmN0aW9uIF9oYW5kbGVWYWx1ZSh4KSB7XG5cdCAgICBpZiAodGhpcy5feGZvcm1bJ0BAdHJhbnNkdWNlci9zdGVwJ10obnVsbCwgeCkgIT09IG51bGwpIHtcblx0ICAgICAgdGhpcy5feGZvcm1bJ0BAdHJhbnNkdWNlci9yZXN1bHQnXShudWxsKTtcblx0ICAgIH1cblx0ICB9LFxuXG5cdCAgX2hhbmRsZUVuZDogZnVuY3Rpb24gX2hhbmRsZUVuZCgpIHtcblx0ICAgIHRoaXMuX3hmb3JtWydAQHRyYW5zZHVjZXIvcmVzdWx0J10obnVsbCk7XG5cdCAgfVxuXG5cdH07XG5cblx0dmFyIFMgPSBjcmVhdGVTdHJlYW0oJ3RyYW5zZHVjZScsIG1peGluKTtcblx0dmFyIFAgPSBjcmVhdGVQcm9wZXJ0eSgndHJhbnNkdWNlJywgbWl4aW4pO1xuXG5cdG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gdHJhbnNkdWNlKG9icywgdHJhbnNkdWNlcikge1xuXHQgIHJldHVybiBuZXcgKG9icy5fb2ZTYW1lVHlwZShTLCBQKSkob2JzLCB7IHRyYW5zZHVjZXI6IHRyYW5zZHVjZXIgfSk7XG5cdH07XG5cbi8qKiovIH0sXG4vKiA1OSAqL1xuLyoqKi8gZnVuY3Rpb24obW9kdWxlLCBleHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKSB7XG5cblx0J3VzZSBzdHJpY3QnO1xuXG5cdHZhciBfcmVxdWlyZSA9IF9fd2VicGFja19yZXF1aXJlX18oMjUpO1xuXG5cdHZhciBjcmVhdGVTdHJlYW0gPSBfcmVxdWlyZS5jcmVhdGVTdHJlYW07XG5cdHZhciBjcmVhdGVQcm9wZXJ0eSA9IF9yZXF1aXJlLmNyZWF0ZVByb3BlcnR5O1xuXG5cdHZhciBlbWl0dGVyID0gX193ZWJwYWNrX3JlcXVpcmVfXygxNSk7XG5cblx0dmFyIG1peGluID0ge1xuXG5cdCAgX2luaXQ6IGZ1bmN0aW9uIF9pbml0KF9yZWYpIHtcblx0ICAgIHZhciBmbiA9IF9yZWYuZm47XG5cblx0ICAgIHRoaXMuX2hhbmRsZXIgPSBmbjtcblx0ICAgIHRoaXMuX2VtaXR0ZXIgPSBlbWl0dGVyKHRoaXMpO1xuXHQgIH0sXG5cblx0ICBfZnJlZTogZnVuY3Rpb24gX2ZyZWUoKSB7XG5cdCAgICB0aGlzLl9oYW5kbGVyID0gbnVsbDtcblx0ICAgIHRoaXMuX2VtaXR0ZXIgPSBudWxsO1xuXHQgIH0sXG5cblx0ICBfaGFuZGxlQW55OiBmdW5jdGlvbiBfaGFuZGxlQW55KGV2ZW50KSB7XG5cdCAgICB0aGlzLl9oYW5kbGVyKHRoaXMuX2VtaXR0ZXIsIGV2ZW50KTtcblx0ICB9XG5cblx0fTtcblxuXHR2YXIgUyA9IGNyZWF0ZVN0cmVhbSgnd2l0aEhhbmRsZXInLCBtaXhpbik7XG5cdHZhciBQID0gY3JlYXRlUHJvcGVydHkoJ3dpdGhIYW5kbGVyJywgbWl4aW4pO1xuXG5cdG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gd2l0aEhhbmRsZXIob2JzLCBmbikge1xuXHQgIHJldHVybiBuZXcgKG9icy5fb2ZTYW1lVHlwZShTLCBQKSkob2JzLCB7IGZuOiBmbiB9KTtcblx0fTtcblxuLyoqKi8gfSxcbi8qIDYwICovXG4vKioqLyBmdW5jdGlvbihtb2R1bGUsIGV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pIHtcblxuXHQndXNlIHN0cmljdCc7XG5cblx0dmFyIFN0cmVhbSA9IF9fd2VicGFja19yZXF1aXJlX18oNik7XG5cblx0dmFyIF9yZXF1aXJlID0gX193ZWJwYWNrX3JlcXVpcmVfXygzKTtcblxuXHR2YXIgVkFMVUUgPSBfcmVxdWlyZS5WQUxVRTtcblx0dmFyIEVSUk9SID0gX3JlcXVpcmUuRVJST1I7XG5cdHZhciBOT1RISU5HID0gX3JlcXVpcmUuTk9USElORztcblxuXHR2YXIgX3JlcXVpcmUyID0gX193ZWJwYWNrX3JlcXVpcmVfXygyKTtcblxuXHR2YXIgaW5oZXJpdCA9IF9yZXF1aXJlMi5pbmhlcml0O1xuXG5cdHZhciBfcmVxdWlyZTMgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDUpO1xuXG5cdHZhciBjb25jYXQgPSBfcmVxdWlyZTMuY29uY2F0O1xuXHR2YXIgZmlsbEFycmF5ID0gX3JlcXVpcmUzLmZpbGxBcnJheTtcblxuXHR2YXIgX3JlcXVpcmU0ID0gX193ZWJwYWNrX3JlcXVpcmVfXygyMSk7XG5cblx0dmFyIHNwcmVhZCA9IF9yZXF1aXJlNC5zcHJlYWQ7XG5cblx0dmFyIG5ldmVyID0gX193ZWJwYWNrX3JlcXVpcmVfXyg4KTtcblxuXHRmdW5jdGlvbiBkZWZhdWx0RXJyb3JzQ29tYmluYXRvcihlcnJvcnMpIHtcblx0ICB2YXIgbGF0ZXN0RXJyb3IgPSB1bmRlZmluZWQ7XG5cdCAgZm9yICh2YXIgaSA9IDA7IGkgPCBlcnJvcnMubGVuZ3RoOyBpKyspIHtcblx0ICAgIGlmIChlcnJvcnNbaV0gIT09IHVuZGVmaW5lZCkge1xuXHQgICAgICBpZiAobGF0ZXN0RXJyb3IgPT09IHVuZGVmaW5lZCB8fCBsYXRlc3RFcnJvci5pbmRleCA8IGVycm9yc1tpXS5pbmRleCkge1xuXHQgICAgICAgIGxhdGVzdEVycm9yID0gZXJyb3JzW2ldO1xuXHQgICAgICB9XG5cdCAgICB9XG5cdCAgfVxuXHQgIHJldHVybiBsYXRlc3RFcnJvci5lcnJvcjtcblx0fVxuXG5cdGZ1bmN0aW9uIENvbWJpbmUoYWN0aXZlLCBwYXNzaXZlLCBjb21iaW5hdG9yKSB7XG5cdCAgdmFyIF90aGlzID0gdGhpcztcblxuXHQgIFN0cmVhbS5jYWxsKHRoaXMpO1xuXHQgIHRoaXMuX2FjdGl2ZUNvdW50ID0gYWN0aXZlLmxlbmd0aDtcblx0ICB0aGlzLl9zb3VyY2VzID0gY29uY2F0KGFjdGl2ZSwgcGFzc2l2ZSk7XG5cdCAgdGhpcy5fY29tYmluYXRvciA9IGNvbWJpbmF0b3IgPyBzcHJlYWQoY29tYmluYXRvciwgdGhpcy5fc291cmNlcy5sZW5ndGgpIDogZnVuY3Rpb24gKHgpIHtcblx0ICAgIHJldHVybiB4O1xuXHQgIH07XG5cdCAgdGhpcy5fYWxpdmVDb3VudCA9IDA7XG5cdCAgdGhpcy5fbGF0ZXN0VmFsdWVzID0gbmV3IEFycmF5KHRoaXMuX3NvdXJjZXMubGVuZ3RoKTtcblx0ICB0aGlzLl9sYXRlc3RFcnJvcnMgPSBuZXcgQXJyYXkodGhpcy5fc291cmNlcy5sZW5ndGgpO1xuXHQgIGZpbGxBcnJheSh0aGlzLl9sYXRlc3RWYWx1ZXMsIE5PVEhJTkcpO1xuXHQgIHRoaXMuX2VtaXRBZnRlckFjdGl2YXRpb24gPSBmYWxzZTtcblx0ICB0aGlzLl9lbmRBZnRlckFjdGl2YXRpb24gPSBmYWxzZTtcblx0ICB0aGlzLl9sYXRlc3RFcnJvckluZGV4ID0gMDtcblxuXHQgIHRoaXMuXyRoYW5kbGVycyA9IFtdO1xuXG5cdCAgdmFyIF9sb29wID0gZnVuY3Rpb24gKGkpIHtcblx0ICAgIF90aGlzLl8kaGFuZGxlcnMucHVzaChmdW5jdGlvbiAoZXZlbnQpIHtcblx0ICAgICAgcmV0dXJuIF90aGlzLl9oYW5kbGVBbnkoaSwgZXZlbnQpO1xuXHQgICAgfSk7XG5cdCAgfTtcblxuXHQgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5fc291cmNlcy5sZW5ndGg7IGkrKykge1xuXHQgICAgX2xvb3AoaSk7XG5cdCAgfVxuXHR9XG5cblx0aW5oZXJpdChDb21iaW5lLCBTdHJlYW0sIHtcblxuXHQgIF9uYW1lOiAnY29tYmluZScsXG5cblx0ICBfb25BY3RpdmF0aW9uOiBmdW5jdGlvbiBfb25BY3RpdmF0aW9uKCkge1xuXHQgICAgdGhpcy5fYWxpdmVDb3VudCA9IHRoaXMuX2FjdGl2ZUNvdW50O1xuXG5cdCAgICAvLyB3ZSBuZWVkIHRvIHN1c2NyaWJlIHRvIF9wYXNzaXZlXyBzb3VyY2VzIGJlZm9yZSBfYWN0aXZlX1xuXHQgICAgLy8gKHNlZSBodHRwczovL2dpdGh1Yi5jb20vcnBvbWlub3Yva2VmaXIvaXNzdWVzLzk4KVxuXHQgICAgZm9yICh2YXIgaSA9IHRoaXMuX2FjdGl2ZUNvdW50OyBpIDwgdGhpcy5fc291cmNlcy5sZW5ndGg7IGkrKykge1xuXHQgICAgICB0aGlzLl9zb3VyY2VzW2ldLm9uQW55KHRoaXMuXyRoYW5kbGVyc1tpXSk7XG5cdCAgICB9XG5cdCAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuX2FjdGl2ZUNvdW50OyBpKyspIHtcblx0ICAgICAgdGhpcy5fc291cmNlc1tpXS5vbkFueSh0aGlzLl8kaGFuZGxlcnNbaV0pO1xuXHQgICAgfVxuXG5cdCAgICBpZiAodGhpcy5fZW1pdEFmdGVyQWN0aXZhdGlvbikge1xuXHQgICAgICB0aGlzLl9lbWl0QWZ0ZXJBY3RpdmF0aW9uID0gZmFsc2U7XG5cdCAgICAgIHRoaXMuX2VtaXRJZkZ1bGwoKTtcblx0ICAgIH1cblx0ICAgIGlmICh0aGlzLl9lbmRBZnRlckFjdGl2YXRpb24pIHtcblx0ICAgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgICAgfVxuXHQgIH0sXG5cblx0ICBfb25EZWFjdGl2YXRpb246IGZ1bmN0aW9uIF9vbkRlYWN0aXZhdGlvbigpIHtcblx0ICAgIHZhciBsZW5ndGggPSB0aGlzLl9zb3VyY2VzLmxlbmd0aCxcblx0ICAgICAgICBpID0gdW5kZWZpbmVkO1xuXHQgICAgZm9yIChpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG5cdCAgICAgIHRoaXMuX3NvdXJjZXNbaV0ub2ZmQW55KHRoaXMuXyRoYW5kbGVyc1tpXSk7XG5cdCAgICB9XG5cdCAgfSxcblxuXHQgIF9lbWl0SWZGdWxsOiBmdW5jdGlvbiBfZW1pdElmRnVsbCgpIHtcblx0ICAgIHZhciBoYXNBbGxWYWx1ZXMgPSB0cnVlO1xuXHQgICAgdmFyIGhhc0Vycm9ycyA9IGZhbHNlO1xuXHQgICAgdmFyIGxlbmd0aCA9IHRoaXMuX2xhdGVzdFZhbHVlcy5sZW5ndGg7XG5cdCAgICB2YXIgdmFsdWVzQ29weSA9IG5ldyBBcnJheShsZW5ndGgpO1xuXHQgICAgdmFyIGVycm9yc0NvcHkgPSBuZXcgQXJyYXkobGVuZ3RoKTtcblxuXHQgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuXHQgICAgICB2YWx1ZXNDb3B5W2ldID0gdGhpcy5fbGF0ZXN0VmFsdWVzW2ldO1xuXHQgICAgICBlcnJvcnNDb3B5W2ldID0gdGhpcy5fbGF0ZXN0RXJyb3JzW2ldO1xuXG5cdCAgICAgIGlmICh2YWx1ZXNDb3B5W2ldID09PSBOT1RISU5HKSB7XG5cdCAgICAgICAgaGFzQWxsVmFsdWVzID0gZmFsc2U7XG5cdCAgICAgIH1cblxuXHQgICAgICBpZiAoZXJyb3JzQ29weVtpXSAhPT0gdW5kZWZpbmVkKSB7XG5cdCAgICAgICAgaGFzRXJyb3JzID0gdHJ1ZTtcblx0ICAgICAgfVxuXHQgICAgfVxuXG5cdCAgICBpZiAoaGFzQWxsVmFsdWVzKSB7XG5cdCAgICAgIHZhciBjb21iaW5hdG9yID0gdGhpcy5fY29tYmluYXRvcjtcblx0ICAgICAgdGhpcy5fZW1pdFZhbHVlKGNvbWJpbmF0b3IodmFsdWVzQ29weSkpO1xuXHQgICAgfVxuXHQgICAgaWYgKGhhc0Vycm9ycykge1xuXHQgICAgICB0aGlzLl9lbWl0RXJyb3IoZGVmYXVsdEVycm9yc0NvbWJpbmF0b3IoZXJyb3JzQ29weSkpO1xuXHQgICAgfVxuXHQgIH0sXG5cblx0ICBfaGFuZGxlQW55OiBmdW5jdGlvbiBfaGFuZGxlQW55KGksIGV2ZW50KSB7XG5cblx0ICAgIGlmIChldmVudC50eXBlID09PSBWQUxVRSB8fCBldmVudC50eXBlID09PSBFUlJPUikge1xuXG5cdCAgICAgIGlmIChldmVudC50eXBlID09PSBWQUxVRSkge1xuXHQgICAgICAgIHRoaXMuX2xhdGVzdFZhbHVlc1tpXSA9IGV2ZW50LnZhbHVlO1xuXHQgICAgICAgIHRoaXMuX2xhdGVzdEVycm9yc1tpXSA9IHVuZGVmaW5lZDtcblx0ICAgICAgfVxuXHQgICAgICBpZiAoZXZlbnQudHlwZSA9PT0gRVJST1IpIHtcblx0ICAgICAgICB0aGlzLl9sYXRlc3RWYWx1ZXNbaV0gPSBOT1RISU5HO1xuXHQgICAgICAgIHRoaXMuX2xhdGVzdEVycm9yc1tpXSA9IHtcblx0ICAgICAgICAgIGluZGV4OiB0aGlzLl9sYXRlc3RFcnJvckluZGV4KyssXG5cdCAgICAgICAgICBlcnJvcjogZXZlbnQudmFsdWVcblx0ICAgICAgICB9O1xuXHQgICAgICB9XG5cblx0ICAgICAgaWYgKGkgPCB0aGlzLl9hY3RpdmVDb3VudCkge1xuXHQgICAgICAgIGlmICh0aGlzLl9hY3RpdmF0aW5nKSB7XG5cdCAgICAgICAgICB0aGlzLl9lbWl0QWZ0ZXJBY3RpdmF0aW9uID0gdHJ1ZTtcblx0ICAgICAgICB9IGVsc2Uge1xuXHQgICAgICAgICAgdGhpcy5fZW1pdElmRnVsbCgpO1xuXHQgICAgICAgIH1cblx0ICAgICAgfVxuXHQgICAgfSBlbHNlIHtcblx0ICAgICAgLy8gRU5EXG5cblx0ICAgICAgaWYgKGkgPCB0aGlzLl9hY3RpdmVDb3VudCkge1xuXHQgICAgICAgIHRoaXMuX2FsaXZlQ291bnQtLTtcblx0ICAgICAgICBpZiAodGhpcy5fYWxpdmVDb3VudCA9PT0gMCkge1xuXHQgICAgICAgICAgaWYgKHRoaXMuX2FjdGl2YXRpbmcpIHtcblx0ICAgICAgICAgICAgdGhpcy5fZW5kQWZ0ZXJBY3RpdmF0aW9uID0gdHJ1ZTtcblx0ICAgICAgICAgIH0gZWxzZSB7XG5cdCAgICAgICAgICAgIHRoaXMuX2VtaXRFbmQoKTtcblx0ICAgICAgICAgIH1cblx0ICAgICAgICB9XG5cdCAgICAgIH1cblx0ICAgIH1cblx0ICB9LFxuXG5cdCAgX2NsZWFyOiBmdW5jdGlvbiBfY2xlYXIoKSB7XG5cdCAgICBTdHJlYW0ucHJvdG90eXBlLl9jbGVhci5jYWxsKHRoaXMpO1xuXHQgICAgdGhpcy5fc291cmNlcyA9IG51bGw7XG5cdCAgICB0aGlzLl9sYXRlc3RWYWx1ZXMgPSBudWxsO1xuXHQgICAgdGhpcy5fbGF0ZXN0RXJyb3JzID0gbnVsbDtcblx0ICAgIHRoaXMuX2NvbWJpbmF0b3IgPSBudWxsO1xuXHQgICAgdGhpcy5fJGhhbmRsZXJzID0gbnVsbDtcblx0ICB9XG5cblx0fSk7XG5cblx0bW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBjb21iaW5lKGFjdGl2ZSwgcGFzc2l2ZSwgY29tYmluYXRvcikge1xuXHQgIGlmIChwYXNzaXZlID09PSB1bmRlZmluZWQpIHBhc3NpdmUgPSBbXTtcblxuXHQgIGlmICh0eXBlb2YgcGFzc2l2ZSA9PT0gJ2Z1bmN0aW9uJykge1xuXHQgICAgY29tYmluYXRvciA9IHBhc3NpdmU7XG5cdCAgICBwYXNzaXZlID0gW107XG5cdCAgfVxuXHQgIHJldHVybiBhY3RpdmUubGVuZ3RoID09PSAwID8gbmV2ZXIoKSA6IG5ldyBDb21iaW5lKGFjdGl2ZSwgcGFzc2l2ZSwgY29tYmluYXRvcik7XG5cdH07XG5cbi8qKiovIH0sXG4vKiA2MSAqL1xuLyoqKi8gZnVuY3Rpb24obW9kdWxlLCBleHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKSB7XG5cblx0J3VzZSBzdHJpY3QnO1xuXG5cdHZhciBTdHJlYW0gPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDYpO1xuXG5cdHZhciBfcmVxdWlyZSA9IF9fd2VicGFja19yZXF1aXJlX18oMyk7XG5cblx0dmFyIFZBTFVFID0gX3JlcXVpcmUuVkFMVUU7XG5cdHZhciBFUlJPUiA9IF9yZXF1aXJlLkVSUk9SO1xuXHR2YXIgRU5EID0gX3JlcXVpcmUuRU5EO1xuXG5cdHZhciBfcmVxdWlyZTIgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDIpO1xuXG5cdHZhciBpbmhlcml0ID0gX3JlcXVpcmUyLmluaGVyaXQ7XG5cblx0dmFyIF9yZXF1aXJlMyA9IF9fd2VicGFja19yZXF1aXJlX18oNSk7XG5cblx0dmFyIG1hcCA9IF9yZXF1aXJlMy5tYXA7XG5cdHZhciBjbG9uZUFycmF5ID0gX3JlcXVpcmUzLmNsb25lQXJyYXk7XG5cblx0dmFyIF9yZXF1aXJlNCA9IF9fd2VicGFja19yZXF1aXJlX18oMjEpO1xuXG5cdHZhciBzcHJlYWQgPSBfcmVxdWlyZTQuc3ByZWFkO1xuXG5cdHZhciBuZXZlciA9IF9fd2VicGFja19yZXF1aXJlX18oOCk7XG5cblx0dmFyIGlzQXJyYXkgPSBBcnJheS5pc0FycmF5IHx8IGZ1bmN0aW9uICh4cykge1xuXHQgIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoeHMpID09PSAnW29iamVjdCBBcnJheV0nO1xuXHR9O1xuXG5cdGZ1bmN0aW9uIFppcChzb3VyY2VzLCBjb21iaW5hdG9yKSB7XG5cdCAgdmFyIF90aGlzID0gdGhpcztcblxuXHQgIFN0cmVhbS5jYWxsKHRoaXMpO1xuXG5cdCAgdGhpcy5fYnVmZmVycyA9IG1hcChzb3VyY2VzLCBmdW5jdGlvbiAoc291cmNlKSB7XG5cdCAgICByZXR1cm4gaXNBcnJheShzb3VyY2UpID8gY2xvbmVBcnJheShzb3VyY2UpIDogW107XG5cdCAgfSk7XG5cdCAgdGhpcy5fc291cmNlcyA9IG1hcChzb3VyY2VzLCBmdW5jdGlvbiAoc291cmNlKSB7XG5cdCAgICByZXR1cm4gaXNBcnJheShzb3VyY2UpID8gbmV2ZXIoKSA6IHNvdXJjZTtcblx0ICB9KTtcblxuXHQgIHRoaXMuX2NvbWJpbmF0b3IgPSBjb21iaW5hdG9yID8gc3ByZWFkKGNvbWJpbmF0b3IsIHRoaXMuX3NvdXJjZXMubGVuZ3RoKSA6IGZ1bmN0aW9uICh4KSB7XG5cdCAgICByZXR1cm4geDtcblx0ICB9O1xuXHQgIHRoaXMuX2FsaXZlQ291bnQgPSAwO1xuXG5cdCAgdGhpcy5fJGhhbmRsZXJzID0gW107XG5cblx0ICB2YXIgX2xvb3AgPSBmdW5jdGlvbiAoaSkge1xuXHQgICAgX3RoaXMuXyRoYW5kbGVycy5wdXNoKGZ1bmN0aW9uIChldmVudCkge1xuXHQgICAgICByZXR1cm4gX3RoaXMuX2hhbmRsZUFueShpLCBldmVudCk7XG5cdCAgICB9KTtcblx0ICB9O1xuXG5cdCAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLl9zb3VyY2VzLmxlbmd0aDsgaSsrKSB7XG5cdCAgICBfbG9vcChpKTtcblx0ICB9XG5cdH1cblxuXHRpbmhlcml0KFppcCwgU3RyZWFtLCB7XG5cblx0ICBfbmFtZTogJ3ppcCcsXG5cblx0ICBfb25BY3RpdmF0aW9uOiBmdW5jdGlvbiBfb25BY3RpdmF0aW9uKCkge1xuXG5cdCAgICAvLyBpZiBhbGwgc291cmNlcyBhcmUgYXJyYXlzXG5cdCAgICB3aGlsZSAodGhpcy5faXNGdWxsKCkpIHtcblx0ICAgICAgdGhpcy5fZW1pdCgpO1xuXHQgICAgfVxuXG5cdCAgICB2YXIgbGVuZ3RoID0gdGhpcy5fc291cmNlcy5sZW5ndGg7XG5cdCAgICB0aGlzLl9hbGl2ZUNvdW50ID0gbGVuZ3RoO1xuXHQgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGggJiYgdGhpcy5fYWN0aXZlOyBpKyspIHtcblx0ICAgICAgdGhpcy5fc291cmNlc1tpXS5vbkFueSh0aGlzLl8kaGFuZGxlcnNbaV0pO1xuXHQgICAgfVxuXHQgIH0sXG5cblx0ICBfb25EZWFjdGl2YXRpb246IGZ1bmN0aW9uIF9vbkRlYWN0aXZhdGlvbigpIHtcblx0ICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5fc291cmNlcy5sZW5ndGg7IGkrKykge1xuXHQgICAgICB0aGlzLl9zb3VyY2VzW2ldLm9mZkFueSh0aGlzLl8kaGFuZGxlcnNbaV0pO1xuXHQgICAgfVxuXHQgIH0sXG5cblx0ICBfZW1pdDogZnVuY3Rpb24gX2VtaXQoKSB7XG5cdCAgICB2YXIgdmFsdWVzID0gbmV3IEFycmF5KHRoaXMuX2J1ZmZlcnMubGVuZ3RoKTtcblx0ICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5fYnVmZmVycy5sZW5ndGg7IGkrKykge1xuXHQgICAgICB2YWx1ZXNbaV0gPSB0aGlzLl9idWZmZXJzW2ldLnNoaWZ0KCk7XG5cdCAgICB9XG5cdCAgICB2YXIgY29tYmluYXRvciA9IHRoaXMuX2NvbWJpbmF0b3I7XG5cdCAgICB0aGlzLl9lbWl0VmFsdWUoY29tYmluYXRvcih2YWx1ZXMpKTtcblx0ICB9LFxuXG5cdCAgX2lzRnVsbDogZnVuY3Rpb24gX2lzRnVsbCgpIHtcblx0ICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5fYnVmZmVycy5sZW5ndGg7IGkrKykge1xuXHQgICAgICBpZiAodGhpcy5fYnVmZmVyc1tpXS5sZW5ndGggPT09IDApIHtcblx0ICAgICAgICByZXR1cm4gZmFsc2U7XG5cdCAgICAgIH1cblx0ICAgIH1cblx0ICAgIHJldHVybiB0cnVlO1xuXHQgIH0sXG5cblx0ICBfaGFuZGxlQW55OiBmdW5jdGlvbiBfaGFuZGxlQW55KGksIGV2ZW50KSB7XG5cdCAgICBpZiAoZXZlbnQudHlwZSA9PT0gVkFMVUUpIHtcblx0ICAgICAgdGhpcy5fYnVmZmVyc1tpXS5wdXNoKGV2ZW50LnZhbHVlKTtcblx0ICAgICAgaWYgKHRoaXMuX2lzRnVsbCgpKSB7XG5cdCAgICAgICAgdGhpcy5fZW1pdCgpO1xuXHQgICAgICB9XG5cdCAgICB9XG5cdCAgICBpZiAoZXZlbnQudHlwZSA9PT0gRVJST1IpIHtcblx0ICAgICAgdGhpcy5fZW1pdEVycm9yKGV2ZW50LnZhbHVlKTtcblx0ICAgIH1cblx0ICAgIGlmIChldmVudC50eXBlID09PSBFTkQpIHtcblx0ICAgICAgdGhpcy5fYWxpdmVDb3VudC0tO1xuXHQgICAgICBpZiAodGhpcy5fYWxpdmVDb3VudCA9PT0gMCkge1xuXHQgICAgICAgIHRoaXMuX2VtaXRFbmQoKTtcblx0ICAgICAgfVxuXHQgICAgfVxuXHQgIH0sXG5cblx0ICBfY2xlYXI6IGZ1bmN0aW9uIF9jbGVhcigpIHtcblx0ICAgIFN0cmVhbS5wcm90b3R5cGUuX2NsZWFyLmNhbGwodGhpcyk7XG5cdCAgICB0aGlzLl9zb3VyY2VzID0gbnVsbDtcblx0ICAgIHRoaXMuX2J1ZmZlcnMgPSBudWxsO1xuXHQgICAgdGhpcy5fY29tYmluYXRvciA9IG51bGw7XG5cdCAgICB0aGlzLl8kaGFuZGxlcnMgPSBudWxsO1xuXHQgIH1cblxuXHR9KTtcblxuXHRtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIHppcChvYnNlcnZhYmxlcywgY29tYmluYXRvciAvKiBGdW5jdGlvbiB8IGZhbHNleSAqLykge1xuXHQgIHJldHVybiBvYnNlcnZhYmxlcy5sZW5ndGggPT09IDAgPyBuZXZlcigpIDogbmV3IFppcChvYnNlcnZhYmxlcywgY29tYmluYXRvcik7XG5cdH07XG5cbi8qKiovIH0sXG4vKiA2MiAqL1xuLyoqKi8gZnVuY3Rpb24obW9kdWxlLCBleHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKSB7XG5cblx0J3VzZSBzdHJpY3QnO1xuXG5cdHZhciBfcmVxdWlyZSA9IF9fd2VicGFja19yZXF1aXJlX18oMik7XG5cblx0dmFyIGluaGVyaXQgPSBfcmVxdWlyZS5pbmhlcml0O1xuXG5cdHZhciBBYnN0cmFjdFBvb2wgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDYzKTtcblx0dmFyIG5ldmVyID0gX193ZWJwYWNrX3JlcXVpcmVfXyg4KTtcblxuXHRmdW5jdGlvbiBNZXJnZShzb3VyY2VzKSB7XG5cdCAgQWJzdHJhY3RQb29sLmNhbGwodGhpcyk7XG5cdCAgdGhpcy5fYWRkQWxsKHNvdXJjZXMpO1xuXHQgIHRoaXMuX2luaXRpYWxpc2VkID0gdHJ1ZTtcblx0fVxuXG5cdGluaGVyaXQoTWVyZ2UsIEFic3RyYWN0UG9vbCwge1xuXG5cdCAgX25hbWU6ICdtZXJnZScsXG5cblx0ICBfb25FbXB0eTogZnVuY3Rpb24gX29uRW1wdHkoKSB7XG5cdCAgICBpZiAodGhpcy5faW5pdGlhbGlzZWQpIHtcblx0ICAgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgICAgfVxuXHQgIH1cblxuXHR9KTtcblxuXHRtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIG1lcmdlKG9ic2VydmFibGVzKSB7XG5cdCAgcmV0dXJuIG9ic2VydmFibGVzLmxlbmd0aCA9PT0gMCA/IG5ldmVyKCkgOiBuZXcgTWVyZ2Uob2JzZXJ2YWJsZXMpO1xuXHR9O1xuXG4vKioqLyB9LFxuLyogNjMgKi9cbi8qKiovIGZ1bmN0aW9uKG1vZHVsZSwgZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXykge1xuXG5cdCd1c2Ugc3RyaWN0JztcblxuXHR2YXIgU3RyZWFtID0gX193ZWJwYWNrX3JlcXVpcmVfXyg2KTtcblxuXHR2YXIgX3JlcXVpcmUgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDMpO1xuXG5cdHZhciBWQUxVRSA9IF9yZXF1aXJlLlZBTFVFO1xuXHR2YXIgRVJST1IgPSBfcmVxdWlyZS5FUlJPUjtcblxuXHR2YXIgX3JlcXVpcmUyID0gX193ZWJwYWNrX3JlcXVpcmVfXygyKTtcblxuXHR2YXIgaW5oZXJpdCA9IF9yZXF1aXJlMi5pbmhlcml0O1xuXG5cdHZhciBfcmVxdWlyZTMgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDUpO1xuXG5cdHZhciBjb25jYXQgPSBfcmVxdWlyZTMuY29uY2F0O1xuXHR2YXIgZm9yRWFjaCA9IF9yZXF1aXJlMy5mb3JFYWNoO1xuXHR2YXIgZmluZEJ5UHJlZCA9IF9yZXF1aXJlMy5maW5kQnlQcmVkO1xuXHR2YXIgZmluZCA9IF9yZXF1aXJlMy5maW5kO1xuXHR2YXIgcmVtb3ZlID0gX3JlcXVpcmUzLnJlbW92ZTtcblx0dmFyIGNsb25lQXJyYXkgPSBfcmVxdWlyZTMuY2xvbmVBcnJheTtcblxuXHR2YXIgaWQgPSBmdW5jdGlvbiBpZCh4KSB7XG5cdCAgcmV0dXJuIHg7XG5cdH07XG5cblx0ZnVuY3Rpb24gQWJzdHJhY3RQb29sKCkge1xuXHQgIHZhciBfdGhpcyA9IHRoaXM7XG5cblx0ICB2YXIgX3JlZiA9IGFyZ3VtZW50cy5sZW5ndGggPD0gMCB8fCBhcmd1bWVudHNbMF0gPT09IHVuZGVmaW5lZCA/IHt9IDogYXJndW1lbnRzWzBdO1xuXG5cdCAgdmFyIF9yZWYkcXVldWVMaW0gPSBfcmVmLnF1ZXVlTGltO1xuXHQgIHZhciBxdWV1ZUxpbSA9IF9yZWYkcXVldWVMaW0gPT09IHVuZGVmaW5lZCA/IDAgOiBfcmVmJHF1ZXVlTGltO1xuXHQgIHZhciBfcmVmJGNvbmN1ckxpbSA9IF9yZWYuY29uY3VyTGltO1xuXHQgIHZhciBjb25jdXJMaW0gPSBfcmVmJGNvbmN1ckxpbSA9PT0gdW5kZWZpbmVkID8gLTEgOiBfcmVmJGNvbmN1ckxpbTtcblx0ICB2YXIgX3JlZiRkcm9wID0gX3JlZi5kcm9wO1xuXHQgIHZhciBkcm9wID0gX3JlZiRkcm9wID09PSB1bmRlZmluZWQgPyAnbmV3JyA6IF9yZWYkZHJvcDtcblxuXHQgIFN0cmVhbS5jYWxsKHRoaXMpO1xuXG5cdCAgdGhpcy5fcXVldWVMaW0gPSBxdWV1ZUxpbSA8IDAgPyAtMSA6IHF1ZXVlTGltO1xuXHQgIHRoaXMuX2NvbmN1ckxpbSA9IGNvbmN1ckxpbSA8IDAgPyAtMSA6IGNvbmN1ckxpbTtcblx0ICB0aGlzLl9kcm9wID0gZHJvcDtcblx0ICB0aGlzLl9xdWV1ZSA9IFtdO1xuXHQgIHRoaXMuX2N1clNvdXJjZXMgPSBbXTtcblx0ICB0aGlzLl8kaGFuZGxlU3ViQW55ID0gZnVuY3Rpb24gKGV2ZW50KSB7XG5cdCAgICByZXR1cm4gX3RoaXMuX2hhbmRsZVN1YkFueShldmVudCk7XG5cdCAgfTtcblx0ICB0aGlzLl8kZW5kSGFuZGxlcnMgPSBbXTtcblx0ICB0aGlzLl9jdXJyZW50bHlBZGRpbmcgPSBudWxsO1xuXG5cdCAgaWYgKHRoaXMuX2NvbmN1ckxpbSA9PT0gMCkge1xuXHQgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgIH1cblx0fVxuXG5cdGluaGVyaXQoQWJzdHJhY3RQb29sLCBTdHJlYW0sIHtcblxuXHQgIF9uYW1lOiAnYWJzdHJhY3RQb29sJyxcblxuXHQgIF9hZGQ6IGZ1bmN0aW9uIF9hZGQob2JqLCB0b09icyAvKiBGdW5jdGlvbiB8IGZhbHNleSAqLykge1xuXHQgICAgdG9PYnMgPSB0b09icyB8fCBpZDtcblx0ICAgIGlmICh0aGlzLl9jb25jdXJMaW0gPT09IC0xIHx8IHRoaXMuX2N1clNvdXJjZXMubGVuZ3RoIDwgdGhpcy5fY29uY3VyTGltKSB7XG5cdCAgICAgIHRoaXMuX2FkZFRvQ3VyKHRvT2JzKG9iaikpO1xuXHQgICAgfSBlbHNlIHtcblx0ICAgICAgaWYgKHRoaXMuX3F1ZXVlTGltID09PSAtMSB8fCB0aGlzLl9xdWV1ZS5sZW5ndGggPCB0aGlzLl9xdWV1ZUxpbSkge1xuXHQgICAgICAgIHRoaXMuX2FkZFRvUXVldWUodG9PYnMob2JqKSk7XG5cdCAgICAgIH0gZWxzZSBpZiAodGhpcy5fZHJvcCA9PT0gJ29sZCcpIHtcblx0ICAgICAgICB0aGlzLl9yZW1vdmVPbGRlc3QoKTtcblx0ICAgICAgICB0aGlzLl9hZGQob2JqLCB0b09icyk7XG5cdCAgICAgIH1cblx0ICAgIH1cblx0ICB9LFxuXG5cdCAgX2FkZEFsbDogZnVuY3Rpb24gX2FkZEFsbChvYnNzKSB7XG5cdCAgICB2YXIgX3RoaXMyID0gdGhpcztcblxuXHQgICAgZm9yRWFjaChvYnNzLCBmdW5jdGlvbiAob2JzKSB7XG5cdCAgICAgIHJldHVybiBfdGhpczIuX2FkZChvYnMpO1xuXHQgICAgfSk7XG5cdCAgfSxcblxuXHQgIF9yZW1vdmU6IGZ1bmN0aW9uIF9yZW1vdmUob2JzKSB7XG5cdCAgICBpZiAodGhpcy5fcmVtb3ZlQ3VyKG9icykgPT09IC0xKSB7XG5cdCAgICAgIHRoaXMuX3JlbW92ZVF1ZXVlKG9icyk7XG5cdCAgICB9XG5cdCAgfSxcblxuXHQgIF9hZGRUb1F1ZXVlOiBmdW5jdGlvbiBfYWRkVG9RdWV1ZShvYnMpIHtcblx0ICAgIHRoaXMuX3F1ZXVlID0gY29uY2F0KHRoaXMuX3F1ZXVlLCBbb2JzXSk7XG5cdCAgfSxcblxuXHQgIF9hZGRUb0N1cjogZnVuY3Rpb24gX2FkZFRvQ3VyKG9icykge1xuXHQgICAgaWYgKHRoaXMuX2FjdGl2ZSkge1xuXG5cdCAgICAgIC8vIEhBQ0s6XG5cdCAgICAgIC8vXG5cdCAgICAgIC8vIFdlIGhhdmUgdHdvIG9wdGltaXphdGlvbnMgZm9yIGNhc2VzIHdoZW4gYG9ic2AgaXMgZW5kZWQuIFdlIGRvbid0IHdhbnRcblx0ICAgICAgLy8gdG8gYWRkIHN1Y2ggb2JzZXJ2YWJsZSB0byB0aGUgbGlzdCwgYnV0IG9ubHkgd2FudCB0byBlbWl0IGV2ZW50c1xuXHQgICAgICAvLyBmcm9tIGl0IChpZiBpdCBoYXMgc29tZSkuXG5cdCAgICAgIC8vXG5cdCAgICAgIC8vIEluc3RlYWQgb2YgdGhpcyBoYWNrcywgd2UgY291bGQganVzdCBkaWQgZm9sbG93aW5nLFxuXHQgICAgICAvLyBidXQgaXQgd291bGQgYmUgNS04IHRpbWVzIHNsb3dlcjpcblx0ICAgICAgLy9cblx0ICAgICAgLy8gICAgIHRoaXMuX2N1clNvdXJjZXMgPSBjb25jYXQodGhpcy5fY3VyU291cmNlcywgW29ic10pO1xuXHQgICAgICAvLyAgICAgdGhpcy5fc3Vic2NyaWJlKG9icyk7XG5cdCAgICAgIC8vXG5cblx0ICAgICAgLy8gIzFcblx0ICAgICAgLy8gVGhpcyBvbmUgZm9yIGNhc2VzIHdoZW4gYG9ic2AgYWxyZWFkeSBlbmRlZFxuXHQgICAgICAvLyBlLmcuLCBLZWZpci5jb25zdGFudCgpIG9yIEtlZmlyLm5ldmVyKClcblx0ICAgICAgaWYgKCFvYnMuX2FsaXZlKSB7XG5cdCAgICAgICAgaWYgKG9icy5fY3VycmVudEV2ZW50KSB7XG5cdCAgICAgICAgICB0aGlzLl9lbWl0KG9icy5fY3VycmVudEV2ZW50LnR5cGUsIG9icy5fY3VycmVudEV2ZW50LnZhbHVlKTtcblx0ICAgICAgICB9XG5cdCAgICAgICAgcmV0dXJuO1xuXHQgICAgICB9XG5cblx0ICAgICAgLy8gIzJcblx0ICAgICAgLy8gVGhpcyBvbmUgaXMgZm9yIGNhc2VzIHdoZW4gYG9ic2AgZ29pbmcgdG8gZW5kIHN5bmNocm9ub3VzbHkgb25cblx0ICAgICAgLy8gZmlyc3Qgc3Vic2NyaWJlciBlLmcuLCBLZWZpci5zdHJlYW0oZW0gPT4ge2VtLmVtaXQoMSk7IGVtLmVuZCgpfSlcblx0ICAgICAgdGhpcy5fY3VycmVudGx5QWRkaW5nID0gb2JzO1xuXHQgICAgICBvYnMub25BbnkodGhpcy5fJGhhbmRsZVN1YkFueSk7XG5cdCAgICAgIHRoaXMuX2N1cnJlbnRseUFkZGluZyA9IG51bGw7XG5cdCAgICAgIGlmIChvYnMuX2FsaXZlKSB7XG5cdCAgICAgICAgdGhpcy5fY3VyU291cmNlcyA9IGNvbmNhdCh0aGlzLl9jdXJTb3VyY2VzLCBbb2JzXSk7XG5cdCAgICAgICAgaWYgKHRoaXMuX2FjdGl2ZSkge1xuXHQgICAgICAgICAgdGhpcy5fc3ViVG9FbmQob2JzKTtcblx0ICAgICAgICB9XG5cdCAgICAgIH1cblx0ICAgIH0gZWxzZSB7XG5cdCAgICAgIHRoaXMuX2N1clNvdXJjZXMgPSBjb25jYXQodGhpcy5fY3VyU291cmNlcywgW29ic10pO1xuXHQgICAgfVxuXHQgIH0sXG5cblx0ICBfc3ViVG9FbmQ6IGZ1bmN0aW9uIF9zdWJUb0VuZChvYnMpIHtcblx0ICAgIHZhciBfdGhpczMgPSB0aGlzO1xuXG5cdCAgICB2YXIgb25FbmQgPSBmdW5jdGlvbiBvbkVuZCgpIHtcblx0ICAgICAgcmV0dXJuIF90aGlzMy5fcmVtb3ZlQ3VyKG9icyk7XG5cdCAgICB9O1xuXHQgICAgdGhpcy5fJGVuZEhhbmRsZXJzLnB1c2goeyBvYnM6IG9icywgaGFuZGxlcjogb25FbmQgfSk7XG5cdCAgICBvYnMub25FbmQob25FbmQpO1xuXHQgIH0sXG5cblx0ICBfc3Vic2NyaWJlOiBmdW5jdGlvbiBfc3Vic2NyaWJlKG9icykge1xuXHQgICAgb2JzLm9uQW55KHRoaXMuXyRoYW5kbGVTdWJBbnkpO1xuXG5cdCAgICAvLyBpdCBjYW4gYmVjb21lIGluYWN0aXZlIGluIHJlc3BvbmNlIG9mIHN1YnNjcmliaW5nIHRvIGBvYnMub25BbnlgIGFib3ZlXG5cdCAgICBpZiAodGhpcy5fYWN0aXZlKSB7XG5cdCAgICAgIHRoaXMuX3N1YlRvRW5kKG9icyk7XG5cdCAgICB9XG5cdCAgfSxcblxuXHQgIF91bnN1YnNjcmliZTogZnVuY3Rpb24gX3Vuc3Vic2NyaWJlKG9icykge1xuXHQgICAgb2JzLm9mZkFueSh0aGlzLl8kaGFuZGxlU3ViQW55KTtcblxuXHQgICAgdmFyIG9uRW5kSSA9IGZpbmRCeVByZWQodGhpcy5fJGVuZEhhbmRsZXJzLCBmdW5jdGlvbiAob2JqKSB7XG5cdCAgICAgIHJldHVybiBvYmoub2JzID09PSBvYnM7XG5cdCAgICB9KTtcblx0ICAgIGlmIChvbkVuZEkgIT09IC0xKSB7XG5cdCAgICAgIG9icy5vZmZFbmQodGhpcy5fJGVuZEhhbmRsZXJzW29uRW5kSV0uaGFuZGxlcik7XG5cdCAgICAgIHRoaXMuXyRlbmRIYW5kbGVycy5zcGxpY2Uob25FbmRJLCAxKTtcblx0ICAgIH1cblx0ICB9LFxuXG5cdCAgX2hhbmRsZVN1YkFueTogZnVuY3Rpb24gX2hhbmRsZVN1YkFueShldmVudCkge1xuXHQgICAgaWYgKGV2ZW50LnR5cGUgPT09IFZBTFVFKSB7XG5cdCAgICAgIHRoaXMuX2VtaXRWYWx1ZShldmVudC52YWx1ZSk7XG5cdCAgICB9IGVsc2UgaWYgKGV2ZW50LnR5cGUgPT09IEVSUk9SKSB7XG5cdCAgICAgIHRoaXMuX2VtaXRFcnJvcihldmVudC52YWx1ZSk7XG5cdCAgICB9XG5cdCAgfSxcblxuXHQgIF9yZW1vdmVRdWV1ZTogZnVuY3Rpb24gX3JlbW92ZVF1ZXVlKG9icykge1xuXHQgICAgdmFyIGluZGV4ID0gZmluZCh0aGlzLl9xdWV1ZSwgb2JzKTtcblx0ICAgIHRoaXMuX3F1ZXVlID0gcmVtb3ZlKHRoaXMuX3F1ZXVlLCBpbmRleCk7XG5cdCAgICByZXR1cm4gaW5kZXg7XG5cdCAgfSxcblxuXHQgIF9yZW1vdmVDdXI6IGZ1bmN0aW9uIF9yZW1vdmVDdXIob2JzKSB7XG5cdCAgICBpZiAodGhpcy5fYWN0aXZlKSB7XG5cdCAgICAgIHRoaXMuX3Vuc3Vic2NyaWJlKG9icyk7XG5cdCAgICB9XG5cdCAgICB2YXIgaW5kZXggPSBmaW5kKHRoaXMuX2N1clNvdXJjZXMsIG9icyk7XG5cdCAgICB0aGlzLl9jdXJTb3VyY2VzID0gcmVtb3ZlKHRoaXMuX2N1clNvdXJjZXMsIGluZGV4KTtcblx0ICAgIGlmIChpbmRleCAhPT0gLTEpIHtcblx0ICAgICAgaWYgKHRoaXMuX3F1ZXVlLmxlbmd0aCAhPT0gMCkge1xuXHQgICAgICAgIHRoaXMuX3B1bGxRdWV1ZSgpO1xuXHQgICAgICB9IGVsc2UgaWYgKHRoaXMuX2N1clNvdXJjZXMubGVuZ3RoID09PSAwKSB7XG5cdCAgICAgICAgdGhpcy5fb25FbXB0eSgpO1xuXHQgICAgICB9XG5cdCAgICB9XG5cdCAgICByZXR1cm4gaW5kZXg7XG5cdCAgfSxcblxuXHQgIF9yZW1vdmVPbGRlc3Q6IGZ1bmN0aW9uIF9yZW1vdmVPbGRlc3QoKSB7XG5cdCAgICB0aGlzLl9yZW1vdmVDdXIodGhpcy5fY3VyU291cmNlc1swXSk7XG5cdCAgfSxcblxuXHQgIF9wdWxsUXVldWU6IGZ1bmN0aW9uIF9wdWxsUXVldWUoKSB7XG5cdCAgICBpZiAodGhpcy5fcXVldWUubGVuZ3RoICE9PSAwKSB7XG5cdCAgICAgIHRoaXMuX3F1ZXVlID0gY2xvbmVBcnJheSh0aGlzLl9xdWV1ZSk7XG5cdCAgICAgIHRoaXMuX2FkZFRvQ3VyKHRoaXMuX3F1ZXVlLnNoaWZ0KCkpO1xuXHQgICAgfVxuXHQgIH0sXG5cblx0ICBfb25BY3RpdmF0aW9uOiBmdW5jdGlvbiBfb25BY3RpdmF0aW9uKCkge1xuXHQgICAgZm9yICh2YXIgaSA9IDAsIHNvdXJjZXMgPSB0aGlzLl9jdXJTb3VyY2VzOyBpIDwgc291cmNlcy5sZW5ndGggJiYgdGhpcy5fYWN0aXZlOyBpKyspIHtcblx0ICAgICAgdGhpcy5fc3Vic2NyaWJlKHNvdXJjZXNbaV0pO1xuXHQgICAgfVxuXHQgIH0sXG5cblx0ICBfb25EZWFjdGl2YXRpb246IGZ1bmN0aW9uIF9vbkRlYWN0aXZhdGlvbigpIHtcblx0ICAgIGZvciAodmFyIGkgPSAwLCBzb3VyY2VzID0gdGhpcy5fY3VyU291cmNlczsgaSA8IHNvdXJjZXMubGVuZ3RoOyBpKyspIHtcblx0ICAgICAgdGhpcy5fdW5zdWJzY3JpYmUoc291cmNlc1tpXSk7XG5cdCAgICB9XG5cdCAgICBpZiAodGhpcy5fY3VycmVudGx5QWRkaW5nICE9PSBudWxsKSB7XG5cdCAgICAgIHRoaXMuX3Vuc3Vic2NyaWJlKHRoaXMuX2N1cnJlbnRseUFkZGluZyk7XG5cdCAgICB9XG5cdCAgfSxcblxuXHQgIF9pc0VtcHR5OiBmdW5jdGlvbiBfaXNFbXB0eSgpIHtcblx0ICAgIHJldHVybiB0aGlzLl9jdXJTb3VyY2VzLmxlbmd0aCA9PT0gMDtcblx0ICB9LFxuXG5cdCAgX29uRW1wdHk6IGZ1bmN0aW9uIF9vbkVtcHR5KCkge30sXG5cblx0ICBfY2xlYXI6IGZ1bmN0aW9uIF9jbGVhcigpIHtcblx0ICAgIFN0cmVhbS5wcm90b3R5cGUuX2NsZWFyLmNhbGwodGhpcyk7XG5cdCAgICB0aGlzLl9xdWV1ZSA9IG51bGw7XG5cdCAgICB0aGlzLl9jdXJTb3VyY2VzID0gbnVsbDtcblx0ICAgIHRoaXMuXyRoYW5kbGVTdWJBbnkgPSBudWxsO1xuXHQgICAgdGhpcy5fJGVuZEhhbmRsZXJzID0gbnVsbDtcblx0ICB9XG5cblx0fSk7XG5cblx0bW9kdWxlLmV4cG9ydHMgPSBBYnN0cmFjdFBvb2w7XG5cbi8qKiovIH0sXG4vKiA2NCAqL1xuLyoqKi8gZnVuY3Rpb24obW9kdWxlLCBleHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKSB7XG5cblx0J3VzZSBzdHJpY3QnO1xuXG5cdHZhciByZXBlYXQgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDY1KTtcblxuXHRtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGNvbmNhdChvYnNlcnZhYmxlcykge1xuXHQgIHJldHVybiByZXBlYXQoZnVuY3Rpb24gKGluZGV4KSB7XG5cdCAgICByZXR1cm4gb2JzZXJ2YWJsZXMubGVuZ3RoID4gaW5kZXggPyBvYnNlcnZhYmxlc1tpbmRleF0gOiBmYWxzZTtcblx0ICB9KS5zZXROYW1lKCdjb25jYXQnKTtcblx0fTtcblxuLyoqKi8gfSxcbi8qIDY1ICovXG4vKioqLyBmdW5jdGlvbihtb2R1bGUsIGV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pIHtcblxuXHQndXNlIHN0cmljdCc7XG5cblx0dmFyIF9yZXF1aXJlID0gX193ZWJwYWNrX3JlcXVpcmVfXygyKTtcblxuXHR2YXIgaW5oZXJpdCA9IF9yZXF1aXJlLmluaGVyaXQ7XG5cblx0dmFyIFN0cmVhbSA9IF9fd2VicGFja19yZXF1aXJlX18oNik7XG5cblx0dmFyIF9yZXF1aXJlMiA9IF9fd2VicGFja19yZXF1aXJlX18oMyk7XG5cblx0dmFyIEVORCA9IF9yZXF1aXJlMi5FTkQ7XG5cblx0ZnVuY3Rpb24gUyhnZW5lcmF0b3IpIHtcblx0ICB2YXIgX3RoaXMgPSB0aGlzO1xuXG5cdCAgU3RyZWFtLmNhbGwodGhpcyk7XG5cdCAgdGhpcy5fZ2VuZXJhdG9yID0gZ2VuZXJhdG9yO1xuXHQgIHRoaXMuX3NvdXJjZSA9IG51bGw7XG5cdCAgdGhpcy5faW5Mb29wID0gZmFsc2U7XG5cdCAgdGhpcy5faXRlcmF0aW9uID0gMDtcblx0ICB0aGlzLl8kaGFuZGxlQW55ID0gZnVuY3Rpb24gKGV2ZW50KSB7XG5cdCAgICByZXR1cm4gX3RoaXMuX2hhbmRsZUFueShldmVudCk7XG5cdCAgfTtcblx0fVxuXG5cdGluaGVyaXQoUywgU3RyZWFtLCB7XG5cblx0ICBfbmFtZTogJ3JlcGVhdCcsXG5cblx0ICBfaGFuZGxlQW55OiBmdW5jdGlvbiBfaGFuZGxlQW55KGV2ZW50KSB7XG5cdCAgICBpZiAoZXZlbnQudHlwZSA9PT0gRU5EKSB7XG5cdCAgICAgIHRoaXMuX3NvdXJjZSA9IG51bGw7XG5cdCAgICAgIHRoaXMuX2dldFNvdXJjZSgpO1xuXHQgICAgfSBlbHNlIHtcblx0ICAgICAgdGhpcy5fZW1pdChldmVudC50eXBlLCBldmVudC52YWx1ZSk7XG5cdCAgICB9XG5cdCAgfSxcblxuXHQgIF9nZXRTb3VyY2U6IGZ1bmN0aW9uIF9nZXRTb3VyY2UoKSB7XG5cdCAgICBpZiAoIXRoaXMuX2luTG9vcCkge1xuXHQgICAgICB0aGlzLl9pbkxvb3AgPSB0cnVlO1xuXHQgICAgICB2YXIgZ2VuZXJhdG9yID0gdGhpcy5fZ2VuZXJhdG9yO1xuXHQgICAgICB3aGlsZSAodGhpcy5fc291cmNlID09PSBudWxsICYmIHRoaXMuX2FsaXZlICYmIHRoaXMuX2FjdGl2ZSkge1xuXHQgICAgICAgIHRoaXMuX3NvdXJjZSA9IGdlbmVyYXRvcih0aGlzLl9pdGVyYXRpb24rKyk7XG5cdCAgICAgICAgaWYgKHRoaXMuX3NvdXJjZSkge1xuXHQgICAgICAgICAgdGhpcy5fc291cmNlLm9uQW55KHRoaXMuXyRoYW5kbGVBbnkpO1xuXHQgICAgICAgIH0gZWxzZSB7XG5cdCAgICAgICAgICB0aGlzLl9lbWl0RW5kKCk7XG5cdCAgICAgICAgfVxuXHQgICAgICB9XG5cdCAgICAgIHRoaXMuX2luTG9vcCA9IGZhbHNlO1xuXHQgICAgfVxuXHQgIH0sXG5cblx0ICBfb25BY3RpdmF0aW9uOiBmdW5jdGlvbiBfb25BY3RpdmF0aW9uKCkge1xuXHQgICAgaWYgKHRoaXMuX3NvdXJjZSkge1xuXHQgICAgICB0aGlzLl9zb3VyY2Uub25BbnkodGhpcy5fJGhhbmRsZUFueSk7XG5cdCAgICB9IGVsc2Uge1xuXHQgICAgICB0aGlzLl9nZXRTb3VyY2UoKTtcblx0ICAgIH1cblx0ICB9LFxuXG5cdCAgX29uRGVhY3RpdmF0aW9uOiBmdW5jdGlvbiBfb25EZWFjdGl2YXRpb24oKSB7XG5cdCAgICBpZiAodGhpcy5fc291cmNlKSB7XG5cdCAgICAgIHRoaXMuX3NvdXJjZS5vZmZBbnkodGhpcy5fJGhhbmRsZUFueSk7XG5cdCAgICB9XG5cdCAgfSxcblxuXHQgIF9jbGVhcjogZnVuY3Rpb24gX2NsZWFyKCkge1xuXHQgICAgU3RyZWFtLnByb3RvdHlwZS5fY2xlYXIuY2FsbCh0aGlzKTtcblx0ICAgIHRoaXMuX2dlbmVyYXRvciA9IG51bGw7XG5cdCAgICB0aGlzLl9zb3VyY2UgPSBudWxsO1xuXHQgICAgdGhpcy5fJGhhbmRsZUFueSA9IG51bGw7XG5cdCAgfVxuXG5cdH0pO1xuXG5cdG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKGdlbmVyYXRvcikge1xuXHQgIHJldHVybiBuZXcgUyhnZW5lcmF0b3IpO1xuXHR9O1xuXG4vKioqLyB9LFxuLyogNjYgKi9cbi8qKiovIGZ1bmN0aW9uKG1vZHVsZSwgZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXykge1xuXG5cdCd1c2Ugc3RyaWN0JztcblxuXHR2YXIgX3JlcXVpcmUgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDIpO1xuXG5cdHZhciBpbmhlcml0ID0gX3JlcXVpcmUuaW5oZXJpdDtcblxuXHR2YXIgQWJzdHJhY3RQb29sID0gX193ZWJwYWNrX3JlcXVpcmVfXyg2Myk7XG5cblx0ZnVuY3Rpb24gUG9vbCgpIHtcblx0ICBBYnN0cmFjdFBvb2wuY2FsbCh0aGlzKTtcblx0fVxuXG5cdGluaGVyaXQoUG9vbCwgQWJzdHJhY3RQb29sLCB7XG5cblx0ICBfbmFtZTogJ3Bvb2wnLFxuXG5cdCAgcGx1ZzogZnVuY3Rpb24gcGx1ZyhvYnMpIHtcblx0ICAgIHRoaXMuX2FkZChvYnMpO1xuXHQgICAgcmV0dXJuIHRoaXM7XG5cdCAgfSxcblxuXHQgIHVucGx1ZzogZnVuY3Rpb24gdW5wbHVnKG9icykge1xuXHQgICAgdGhpcy5fcmVtb3ZlKG9icyk7XG5cdCAgICByZXR1cm4gdGhpcztcblx0ICB9XG5cblx0fSk7XG5cblx0bW9kdWxlLmV4cG9ydHMgPSBQb29sO1xuXG4vKioqLyB9LFxuLyogNjcgKi9cbi8qKiovIGZ1bmN0aW9uKG1vZHVsZSwgZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXykge1xuXG5cdCd1c2Ugc3RyaWN0JztcblxuXHR2YXIgX3JlcXVpcmUgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDMpO1xuXG5cdHZhciBWQUxVRSA9IF9yZXF1aXJlLlZBTFVFO1xuXHR2YXIgRVJST1IgPSBfcmVxdWlyZS5FUlJPUjtcblx0dmFyIEVORCA9IF9yZXF1aXJlLkVORDtcblxuXHR2YXIgX3JlcXVpcmUyID0gX193ZWJwYWNrX3JlcXVpcmVfXygyKTtcblxuXHR2YXIgaW5oZXJpdCA9IF9yZXF1aXJlMi5pbmhlcml0O1xuXG5cdHZhciBBYnN0cmFjdFBvb2wgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDYzKTtcblxuXHRmdW5jdGlvbiBGbGF0TWFwKHNvdXJjZSwgZm4sIG9wdGlvbnMpIHtcblx0ICB2YXIgX3RoaXMgPSB0aGlzO1xuXG5cdCAgQWJzdHJhY3RQb29sLmNhbGwodGhpcywgb3B0aW9ucyk7XG5cdCAgdGhpcy5fc291cmNlID0gc291cmNlO1xuXHQgIHRoaXMuX2ZuID0gZm47XG5cdCAgdGhpcy5fbWFpbkVuZGVkID0gZmFsc2U7XG5cdCAgdGhpcy5fbGFzdEN1cnJlbnQgPSBudWxsO1xuXHQgIHRoaXMuXyRoYW5kbGVNYWluID0gZnVuY3Rpb24gKGV2ZW50KSB7XG5cdCAgICByZXR1cm4gX3RoaXMuX2hhbmRsZU1haW4oZXZlbnQpO1xuXHQgIH07XG5cdH1cblxuXHRpbmhlcml0KEZsYXRNYXAsIEFic3RyYWN0UG9vbCwge1xuXG5cdCAgX29uQWN0aXZhdGlvbjogZnVuY3Rpb24gX29uQWN0aXZhdGlvbigpIHtcblx0ICAgIEFic3RyYWN0UG9vbC5wcm90b3R5cGUuX29uQWN0aXZhdGlvbi5jYWxsKHRoaXMpO1xuXHQgICAgaWYgKHRoaXMuX2FjdGl2ZSkge1xuXHQgICAgICB0aGlzLl9zb3VyY2Uub25BbnkodGhpcy5fJGhhbmRsZU1haW4pO1xuXHQgICAgfVxuXHQgIH0sXG5cblx0ICBfb25EZWFjdGl2YXRpb246IGZ1bmN0aW9uIF9vbkRlYWN0aXZhdGlvbigpIHtcblx0ICAgIEFic3RyYWN0UG9vbC5wcm90b3R5cGUuX29uRGVhY3RpdmF0aW9uLmNhbGwodGhpcyk7XG5cdCAgICB0aGlzLl9zb3VyY2Uub2ZmQW55KHRoaXMuXyRoYW5kbGVNYWluKTtcblx0ICAgIHRoaXMuX2hhZE5vRXZTaW5jZURlYWN0ID0gdHJ1ZTtcblx0ICB9LFxuXG5cdCAgX2hhbmRsZU1haW46IGZ1bmN0aW9uIF9oYW5kbGVNYWluKGV2ZW50KSB7XG5cblx0ICAgIGlmIChldmVudC50eXBlID09PSBWQUxVRSkge1xuXHQgICAgICAvLyBJcyBsYXRlc3QgdmFsdWUgYmVmb3JlIGRlYWN0aXZhdGlvbiBzdXJ2aXZlZCwgYW5kIG5vdyBpcyAnY3VycmVudCcgb24gdGhpcyBhY3RpdmF0aW9uP1xuXHQgICAgICAvLyBXZSBkb24ndCB3YW50IHRvIGhhbmRsZSBzdWNoIHZhbHVlcywgdG8gcHJldmVudCB0byBjb25zdGFudGx5IGFkZFxuXHQgICAgICAvLyBzYW1lIG9ic2VydmFsZSBvbiBlYWNoIGFjdGl2YXRpb24vZGVhY3RpdmF0aW9uIHdoZW4gb3VyIG1haW4gc291cmNlXG5cdCAgICAgIC8vIGlzIGEgYEtlZmlyLmNvbmF0YW50KClgIGZvciBleGFtcGxlLlxuXHQgICAgICB2YXIgc2FtZUN1cnIgPSB0aGlzLl9hY3RpdmF0aW5nICYmIHRoaXMuX2hhZE5vRXZTaW5jZURlYWN0ICYmIHRoaXMuX2xhc3RDdXJyZW50ID09PSBldmVudC52YWx1ZTtcblx0ICAgICAgaWYgKCFzYW1lQ3Vycikge1xuXHQgICAgICAgIHRoaXMuX2FkZChldmVudC52YWx1ZSwgdGhpcy5fZm4pO1xuXHQgICAgICB9XG5cdCAgICAgIHRoaXMuX2xhc3RDdXJyZW50ID0gZXZlbnQudmFsdWU7XG5cdCAgICAgIHRoaXMuX2hhZE5vRXZTaW5jZURlYWN0ID0gZmFsc2U7XG5cdCAgICB9XG5cblx0ICAgIGlmIChldmVudC50eXBlID09PSBFUlJPUikge1xuXHQgICAgICB0aGlzLl9lbWl0RXJyb3IoZXZlbnQudmFsdWUpO1xuXHQgICAgfVxuXG5cdCAgICBpZiAoZXZlbnQudHlwZSA9PT0gRU5EKSB7XG5cdCAgICAgIGlmICh0aGlzLl9pc0VtcHR5KCkpIHtcblx0ICAgICAgICB0aGlzLl9lbWl0RW5kKCk7XG5cdCAgICAgIH0gZWxzZSB7XG5cdCAgICAgICAgdGhpcy5fbWFpbkVuZGVkID0gdHJ1ZTtcblx0ICAgICAgfVxuXHQgICAgfVxuXHQgIH0sXG5cblx0ICBfb25FbXB0eTogZnVuY3Rpb24gX29uRW1wdHkoKSB7XG5cdCAgICBpZiAodGhpcy5fbWFpbkVuZGVkKSB7XG5cdCAgICAgIHRoaXMuX2VtaXRFbmQoKTtcblx0ICAgIH1cblx0ICB9LFxuXG5cdCAgX2NsZWFyOiBmdW5jdGlvbiBfY2xlYXIoKSB7XG5cdCAgICBBYnN0cmFjdFBvb2wucHJvdG90eXBlLl9jbGVhci5jYWxsKHRoaXMpO1xuXHQgICAgdGhpcy5fc291cmNlID0gbnVsbDtcblx0ICAgIHRoaXMuX2xhc3RDdXJyZW50ID0gbnVsbDtcblx0ICAgIHRoaXMuXyRoYW5kbGVNYWluID0gbnVsbDtcblx0ICB9XG5cblx0fSk7XG5cblx0bW9kdWxlLmV4cG9ydHMgPSBGbGF0TWFwO1xuXG4vKioqLyB9LFxuLyogNjggKi9cbi8qKiovIGZ1bmN0aW9uKG1vZHVsZSwgZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXykge1xuXG5cdCd1c2Ugc3RyaWN0JztcblxuXHR2YXIgX3JlcXVpcmUgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDMpO1xuXG5cdHZhciBWQUxVRSA9IF9yZXF1aXJlLlZBTFVFO1xuXHR2YXIgRVJST1IgPSBfcmVxdWlyZS5FUlJPUjtcblx0dmFyIEVORCA9IF9yZXF1aXJlLkVORDtcblxuXHR2YXIgX3JlcXVpcmUyID0gX193ZWJwYWNrX3JlcXVpcmVfXygyKTtcblxuXHR2YXIgaW5oZXJpdCA9IF9yZXF1aXJlMi5pbmhlcml0O1xuXG5cdHZhciBGbGF0TWFwID0gX193ZWJwYWNrX3JlcXVpcmVfXyg2Nyk7XG5cblx0ZnVuY3Rpb24gRmxhdE1hcEVycm9ycyhzb3VyY2UsIGZuKSB7XG5cdCAgRmxhdE1hcC5jYWxsKHRoaXMsIHNvdXJjZSwgZm4pO1xuXHR9XG5cblx0aW5oZXJpdChGbGF0TWFwRXJyb3JzLCBGbGF0TWFwLCB7XG5cblx0ICAvLyBTYW1lIGFzIGluIEZsYXRNYXAsIG9ubHkgVkFMVUUvRVJST1IgZmxpcHBlZFxuXHQgIF9oYW5kbGVNYWluOiBmdW5jdGlvbiBfaGFuZGxlTWFpbihldmVudCkge1xuXG5cdCAgICBpZiAoZXZlbnQudHlwZSA9PT0gRVJST1IpIHtcblx0ICAgICAgdmFyIHNhbWVDdXJyID0gdGhpcy5fYWN0aXZhdGluZyAmJiB0aGlzLl9oYWROb0V2U2luY2VEZWFjdCAmJiB0aGlzLl9sYXN0Q3VycmVudCA9PT0gZXZlbnQudmFsdWU7XG5cdCAgICAgIGlmICghc2FtZUN1cnIpIHtcblx0ICAgICAgICB0aGlzLl9hZGQoZXZlbnQudmFsdWUsIHRoaXMuX2ZuKTtcblx0ICAgICAgfVxuXHQgICAgICB0aGlzLl9sYXN0Q3VycmVudCA9IGV2ZW50LnZhbHVlO1xuXHQgICAgICB0aGlzLl9oYWROb0V2U2luY2VEZWFjdCA9IGZhbHNlO1xuXHQgICAgfVxuXG5cdCAgICBpZiAoZXZlbnQudHlwZSA9PT0gVkFMVUUpIHtcblx0ICAgICAgdGhpcy5fZW1pdFZhbHVlKGV2ZW50LnZhbHVlKTtcblx0ICAgIH1cblxuXHQgICAgaWYgKGV2ZW50LnR5cGUgPT09IEVORCkge1xuXHQgICAgICBpZiAodGhpcy5faXNFbXB0eSgpKSB7XG5cdCAgICAgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgICAgICB9IGVsc2Uge1xuXHQgICAgICAgIHRoaXMuX21haW5FbmRlZCA9IHRydWU7XG5cdCAgICAgIH1cblx0ICAgIH1cblx0ICB9XG5cblx0fSk7XG5cblx0bW9kdWxlLmV4cG9ydHMgPSBGbGF0TWFwRXJyb3JzO1xuXG4vKioqLyB9LFxuLyogNjkgKi9cbi8qKiovIGZ1bmN0aW9uKG1vZHVsZSwgZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXykge1xuXG5cdCd1c2Ugc3RyaWN0JztcblxuXHR2YXIgX3JlcXVpcmUgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDcwKTtcblxuXHR2YXIgY3JlYXRlU3RyZWFtID0gX3JlcXVpcmUuY3JlYXRlU3RyZWFtO1xuXHR2YXIgY3JlYXRlUHJvcGVydHkgPSBfcmVxdWlyZS5jcmVhdGVQcm9wZXJ0eTtcblxuXHR2YXIgX3JlcXVpcmUyID0gX193ZWJwYWNrX3JlcXVpcmVfXygzKTtcblxuXHR2YXIgTk9USElORyA9IF9yZXF1aXJlMi5OT1RISU5HO1xuXG5cdHZhciBtaXhpbiA9IHtcblxuXHQgIF9oYW5kbGVQcmltYXJ5VmFsdWU6IGZ1bmN0aW9uIF9oYW5kbGVQcmltYXJ5VmFsdWUoeCkge1xuXHQgICAgaWYgKHRoaXMuX2xhc3RTZWNvbmRhcnkgIT09IE5PVEhJTkcgJiYgdGhpcy5fbGFzdFNlY29uZGFyeSkge1xuXHQgICAgICB0aGlzLl9lbWl0VmFsdWUoeCk7XG5cdCAgICB9XG5cdCAgfSxcblxuXHQgIF9oYW5kbGVTZWNvbmRhcnlFbmQ6IGZ1bmN0aW9uIF9oYW5kbGVTZWNvbmRhcnlFbmQoKSB7XG5cdCAgICBpZiAodGhpcy5fbGFzdFNlY29uZGFyeSA9PT0gTk9USElORyB8fCAhdGhpcy5fbGFzdFNlY29uZGFyeSkge1xuXHQgICAgICB0aGlzLl9lbWl0RW5kKCk7XG5cdCAgICB9XG5cdCAgfVxuXG5cdH07XG5cblx0dmFyIFMgPSBjcmVhdGVTdHJlYW0oJ2ZpbHRlckJ5JywgbWl4aW4pO1xuXHR2YXIgUCA9IGNyZWF0ZVByb3BlcnR5KCdmaWx0ZXJCeScsIG1peGluKTtcblxuXHRtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGZpbHRlckJ5KHByaW1hcnksIHNlY29uZGFyeSkge1xuXHQgIHJldHVybiBuZXcgKHByaW1hcnkuX29mU2FtZVR5cGUoUywgUCkpKHByaW1hcnksIHNlY29uZGFyeSk7XG5cdH07XG5cbi8qKiovIH0sXG4vKiA3MCAqL1xuLyoqKi8gZnVuY3Rpb24obW9kdWxlLCBleHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKSB7XG5cblx0J3VzZSBzdHJpY3QnO1xuXG5cdHZhciBTdHJlYW0gPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDYpO1xuXHR2YXIgUHJvcGVydHkgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDcpO1xuXG5cdHZhciBfcmVxdWlyZSA9IF9fd2VicGFja19yZXF1aXJlX18oMik7XG5cblx0dmFyIGluaGVyaXQgPSBfcmVxdWlyZS5pbmhlcml0O1xuXG5cdHZhciBfcmVxdWlyZTIgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDMpO1xuXG5cdHZhciBWQUxVRSA9IF9yZXF1aXJlMi5WQUxVRTtcblx0dmFyIEVSUk9SID0gX3JlcXVpcmUyLkVSUk9SO1xuXHR2YXIgRU5EID0gX3JlcXVpcmUyLkVORDtcblx0dmFyIE5PVEhJTkcgPSBfcmVxdWlyZTIuTk9USElORztcblxuXHRmdW5jdGlvbiBjcmVhdGVDb25zdHJ1Y3RvcihCYXNlQ2xhc3MsIG5hbWUpIHtcblx0ICByZXR1cm4gZnVuY3Rpb24gQW5vbnltb3VzT2JzZXJ2YWJsZShwcmltYXJ5LCBzZWNvbmRhcnksIG9wdGlvbnMpIHtcblx0ICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cblx0ICAgIEJhc2VDbGFzcy5jYWxsKHRoaXMpO1xuXHQgICAgdGhpcy5fcHJpbWFyeSA9IHByaW1hcnk7XG5cdCAgICB0aGlzLl9zZWNvbmRhcnkgPSBzZWNvbmRhcnk7XG5cdCAgICB0aGlzLl9uYW1lID0gcHJpbWFyeS5fbmFtZSArICcuJyArIG5hbWU7XG5cdCAgICB0aGlzLl9sYXN0U2Vjb25kYXJ5ID0gTk9USElORztcblx0ICAgIHRoaXMuXyRoYW5kbGVTZWNvbmRhcnlBbnkgPSBmdW5jdGlvbiAoZXZlbnQpIHtcblx0ICAgICAgcmV0dXJuIF90aGlzLl9oYW5kbGVTZWNvbmRhcnlBbnkoZXZlbnQpO1xuXHQgICAgfTtcblx0ICAgIHRoaXMuXyRoYW5kbGVQcmltYXJ5QW55ID0gZnVuY3Rpb24gKGV2ZW50KSB7XG5cdCAgICAgIHJldHVybiBfdGhpcy5faGFuZGxlUHJpbWFyeUFueShldmVudCk7XG5cdCAgICB9O1xuXHQgICAgdGhpcy5faW5pdChvcHRpb25zKTtcblx0ICB9O1xuXHR9XG5cblx0ZnVuY3Rpb24gY3JlYXRlQ2xhc3NNZXRob2RzKEJhc2VDbGFzcykge1xuXHQgIHJldHVybiB7XG5cdCAgICBfaW5pdDogZnVuY3Rpb24gX2luaXQoKSB7fSxcblx0ICAgIF9mcmVlOiBmdW5jdGlvbiBfZnJlZSgpIHt9LFxuXG5cdCAgICBfaGFuZGxlUHJpbWFyeVZhbHVlOiBmdW5jdGlvbiBfaGFuZGxlUHJpbWFyeVZhbHVlKHgpIHtcblx0ICAgICAgdGhpcy5fZW1pdFZhbHVlKHgpO1xuXHQgICAgfSxcblx0ICAgIF9oYW5kbGVQcmltYXJ5RXJyb3I6IGZ1bmN0aW9uIF9oYW5kbGVQcmltYXJ5RXJyb3IoeCkge1xuXHQgICAgICB0aGlzLl9lbWl0RXJyb3IoeCk7XG5cdCAgICB9LFxuXHQgICAgX2hhbmRsZVByaW1hcnlFbmQ6IGZ1bmN0aW9uIF9oYW5kbGVQcmltYXJ5RW5kKCkge1xuXHQgICAgICB0aGlzLl9lbWl0RW5kKCk7XG5cdCAgICB9LFxuXG5cdCAgICBfaGFuZGxlU2Vjb25kYXJ5VmFsdWU6IGZ1bmN0aW9uIF9oYW5kbGVTZWNvbmRhcnlWYWx1ZSh4KSB7XG5cdCAgICAgIHRoaXMuX2xhc3RTZWNvbmRhcnkgPSB4O1xuXHQgICAgfSxcblx0ICAgIF9oYW5kbGVTZWNvbmRhcnlFcnJvcjogZnVuY3Rpb24gX2hhbmRsZVNlY29uZGFyeUVycm9yKHgpIHtcblx0ICAgICAgdGhpcy5fZW1pdEVycm9yKHgpO1xuXHQgICAgfSxcblx0ICAgIF9oYW5kbGVTZWNvbmRhcnlFbmQ6IGZ1bmN0aW9uIF9oYW5kbGVTZWNvbmRhcnlFbmQoKSB7fSxcblxuXHQgICAgX2hhbmRsZVByaW1hcnlBbnk6IGZ1bmN0aW9uIF9oYW5kbGVQcmltYXJ5QW55KGV2ZW50KSB7XG5cdCAgICAgIHN3aXRjaCAoZXZlbnQudHlwZSkge1xuXHQgICAgICAgIGNhc2UgVkFMVUU6XG5cdCAgICAgICAgICByZXR1cm4gdGhpcy5faGFuZGxlUHJpbWFyeVZhbHVlKGV2ZW50LnZhbHVlKTtcblx0ICAgICAgICBjYXNlIEVSUk9SOlxuXHQgICAgICAgICAgcmV0dXJuIHRoaXMuX2hhbmRsZVByaW1hcnlFcnJvcihldmVudC52YWx1ZSk7XG5cdCAgICAgICAgY2FzZSBFTkQ6XG5cdCAgICAgICAgICByZXR1cm4gdGhpcy5faGFuZGxlUHJpbWFyeUVuZChldmVudC52YWx1ZSk7XG5cdCAgICAgIH1cblx0ICAgIH0sXG5cdCAgICBfaGFuZGxlU2Vjb25kYXJ5QW55OiBmdW5jdGlvbiBfaGFuZGxlU2Vjb25kYXJ5QW55KGV2ZW50KSB7XG5cdCAgICAgIHN3aXRjaCAoZXZlbnQudHlwZSkge1xuXHQgICAgICAgIGNhc2UgVkFMVUU6XG5cdCAgICAgICAgICByZXR1cm4gdGhpcy5faGFuZGxlU2Vjb25kYXJ5VmFsdWUoZXZlbnQudmFsdWUpO1xuXHQgICAgICAgIGNhc2UgRVJST1I6XG5cdCAgICAgICAgICByZXR1cm4gdGhpcy5faGFuZGxlU2Vjb25kYXJ5RXJyb3IoZXZlbnQudmFsdWUpO1xuXHQgICAgICAgIGNhc2UgRU5EOlxuXHQgICAgICAgICAgdGhpcy5faGFuZGxlU2Vjb25kYXJ5RW5kKGV2ZW50LnZhbHVlKTtcblx0ICAgICAgICAgIHRoaXMuX3JlbW92ZVNlY29uZGFyeSgpO1xuXHQgICAgICB9XG5cdCAgICB9LFxuXG5cdCAgICBfcmVtb3ZlU2Vjb25kYXJ5OiBmdW5jdGlvbiBfcmVtb3ZlU2Vjb25kYXJ5KCkge1xuXHQgICAgICBpZiAodGhpcy5fc2Vjb25kYXJ5ICE9PSBudWxsKSB7XG5cdCAgICAgICAgdGhpcy5fc2Vjb25kYXJ5Lm9mZkFueSh0aGlzLl8kaGFuZGxlU2Vjb25kYXJ5QW55KTtcblx0ICAgICAgICB0aGlzLl8kaGFuZGxlU2Vjb25kYXJ5QW55ID0gbnVsbDtcblx0ICAgICAgICB0aGlzLl9zZWNvbmRhcnkgPSBudWxsO1xuXHQgICAgICB9XG5cdCAgICB9LFxuXG5cdCAgICBfb25BY3RpdmF0aW9uOiBmdW5jdGlvbiBfb25BY3RpdmF0aW9uKCkge1xuXHQgICAgICBpZiAodGhpcy5fc2Vjb25kYXJ5ICE9PSBudWxsKSB7XG5cdCAgICAgICAgdGhpcy5fc2Vjb25kYXJ5Lm9uQW55KHRoaXMuXyRoYW5kbGVTZWNvbmRhcnlBbnkpO1xuXHQgICAgICB9XG5cdCAgICAgIGlmICh0aGlzLl9hY3RpdmUpIHtcblx0ICAgICAgICB0aGlzLl9wcmltYXJ5Lm9uQW55KHRoaXMuXyRoYW5kbGVQcmltYXJ5QW55KTtcblx0ICAgICAgfVxuXHQgICAgfSxcblx0ICAgIF9vbkRlYWN0aXZhdGlvbjogZnVuY3Rpb24gX29uRGVhY3RpdmF0aW9uKCkge1xuXHQgICAgICBpZiAodGhpcy5fc2Vjb25kYXJ5ICE9PSBudWxsKSB7XG5cdCAgICAgICAgdGhpcy5fc2Vjb25kYXJ5Lm9mZkFueSh0aGlzLl8kaGFuZGxlU2Vjb25kYXJ5QW55KTtcblx0ICAgICAgfVxuXHQgICAgICB0aGlzLl9wcmltYXJ5Lm9mZkFueSh0aGlzLl8kaGFuZGxlUHJpbWFyeUFueSk7XG5cdCAgICB9LFxuXG5cdCAgICBfY2xlYXI6IGZ1bmN0aW9uIF9jbGVhcigpIHtcblx0ICAgICAgQmFzZUNsYXNzLnByb3RvdHlwZS5fY2xlYXIuY2FsbCh0aGlzKTtcblx0ICAgICAgdGhpcy5fcHJpbWFyeSA9IG51bGw7XG5cdCAgICAgIHRoaXMuX3NlY29uZGFyeSA9IG51bGw7XG5cdCAgICAgIHRoaXMuX2xhc3RTZWNvbmRhcnkgPSBudWxsO1xuXHQgICAgICB0aGlzLl8kaGFuZGxlU2Vjb25kYXJ5QW55ID0gbnVsbDtcblx0ICAgICAgdGhpcy5fJGhhbmRsZVByaW1hcnlBbnkgPSBudWxsO1xuXHQgICAgICB0aGlzLl9mcmVlKCk7XG5cdCAgICB9XG5cblx0ICB9O1xuXHR9XG5cblx0ZnVuY3Rpb24gY3JlYXRlU3RyZWFtKG5hbWUsIG1peGluKSB7XG5cdCAgdmFyIFMgPSBjcmVhdGVDb25zdHJ1Y3RvcihTdHJlYW0sIG5hbWUpO1xuXHQgIGluaGVyaXQoUywgU3RyZWFtLCBjcmVhdGVDbGFzc01ldGhvZHMoU3RyZWFtKSwgbWl4aW4pO1xuXHQgIHJldHVybiBTO1xuXHR9XG5cblx0ZnVuY3Rpb24gY3JlYXRlUHJvcGVydHkobmFtZSwgbWl4aW4pIHtcblx0ICB2YXIgUCA9IGNyZWF0ZUNvbnN0cnVjdG9yKFByb3BlcnR5LCBuYW1lKTtcblx0ICBpbmhlcml0KFAsIFByb3BlcnR5LCBjcmVhdGVDbGFzc01ldGhvZHMoUHJvcGVydHkpLCBtaXhpbik7XG5cdCAgcmV0dXJuIFA7XG5cdH1cblxuXHRtb2R1bGUuZXhwb3J0cyA9IHsgY3JlYXRlU3RyZWFtOiBjcmVhdGVTdHJlYW0sIGNyZWF0ZVByb3BlcnR5OiBjcmVhdGVQcm9wZXJ0eSB9O1xuXG4vKioqLyB9LFxuLyogNzEgKi9cbi8qKiovIGZ1bmN0aW9uKG1vZHVsZSwgZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXykge1xuXG5cdCd1c2Ugc3RyaWN0JztcblxuXHR2YXIgY29tYmluZSA9IF9fd2VicGFja19yZXF1aXJlX18oNjApO1xuXG5cdHZhciBpZDIgPSBmdW5jdGlvbiBpZDIoXywgeCkge1xuXHQgIHJldHVybiB4O1xuXHR9O1xuXG5cdG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gc2FtcGxlZEJ5KHBhc3NpdmUsIGFjdGl2ZSwgY29tYmluYXRvcikge1xuXHQgIHZhciBfY29tYmluYXRvciA9IGNvbWJpbmF0b3IgPyBmdW5jdGlvbiAoYSwgYikge1xuXHQgICAgcmV0dXJuIGNvbWJpbmF0b3IoYiwgYSk7XG5cdCAgfSA6IGlkMjtcblx0ICByZXR1cm4gY29tYmluZShbYWN0aXZlXSwgW3Bhc3NpdmVdLCBfY29tYmluYXRvcikuc2V0TmFtZShwYXNzaXZlLCAnc2FtcGxlZEJ5Jyk7XG5cdH07XG5cbi8qKiovIH0sXG4vKiA3MiAqL1xuLyoqKi8gZnVuY3Rpb24obW9kdWxlLCBleHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKSB7XG5cblx0J3VzZSBzdHJpY3QnO1xuXG5cdHZhciBfcmVxdWlyZSA9IF9fd2VicGFja19yZXF1aXJlX18oNzApO1xuXG5cdHZhciBjcmVhdGVTdHJlYW0gPSBfcmVxdWlyZS5jcmVhdGVTdHJlYW07XG5cdHZhciBjcmVhdGVQcm9wZXJ0eSA9IF9yZXF1aXJlLmNyZWF0ZVByb3BlcnR5O1xuXG5cdHZhciBfcmVxdWlyZTIgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDMpO1xuXG5cdHZhciBOT1RISU5HID0gX3JlcXVpcmUyLk5PVEhJTkc7XG5cblx0dmFyIG1peGluID0ge1xuXG5cdCAgX2hhbmRsZVByaW1hcnlWYWx1ZTogZnVuY3Rpb24gX2hhbmRsZVByaW1hcnlWYWx1ZSh4KSB7XG5cdCAgICBpZiAodGhpcy5fbGFzdFNlY29uZGFyeSAhPT0gTk9USElORykge1xuXHQgICAgICB0aGlzLl9lbWl0VmFsdWUoeCk7XG5cdCAgICB9XG5cdCAgfSxcblxuXHQgIF9oYW5kbGVTZWNvbmRhcnlFbmQ6IGZ1bmN0aW9uIF9oYW5kbGVTZWNvbmRhcnlFbmQoKSB7XG5cdCAgICBpZiAodGhpcy5fbGFzdFNlY29uZGFyeSA9PT0gTk9USElORykge1xuXHQgICAgICB0aGlzLl9lbWl0RW5kKCk7XG5cdCAgICB9XG5cdCAgfVxuXG5cdH07XG5cblx0dmFyIFMgPSBjcmVhdGVTdHJlYW0oJ3NraXBVbnRpbEJ5JywgbWl4aW4pO1xuXHR2YXIgUCA9IGNyZWF0ZVByb3BlcnR5KCdza2lwVW50aWxCeScsIG1peGluKTtcblxuXHRtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIHNraXBVbnRpbEJ5KHByaW1hcnksIHNlY29uZGFyeSkge1xuXHQgIHJldHVybiBuZXcgKHByaW1hcnkuX29mU2FtZVR5cGUoUywgUCkpKHByaW1hcnksIHNlY29uZGFyeSk7XG5cdH07XG5cbi8qKiovIH0sXG4vKiA3MyAqL1xuLyoqKi8gZnVuY3Rpb24obW9kdWxlLCBleHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKSB7XG5cblx0J3VzZSBzdHJpY3QnO1xuXG5cdHZhciBfcmVxdWlyZSA9IF9fd2VicGFja19yZXF1aXJlX18oNzApO1xuXG5cdHZhciBjcmVhdGVTdHJlYW0gPSBfcmVxdWlyZS5jcmVhdGVTdHJlYW07XG5cdHZhciBjcmVhdGVQcm9wZXJ0eSA9IF9yZXF1aXJlLmNyZWF0ZVByb3BlcnR5O1xuXG5cdHZhciBtaXhpbiA9IHtcblxuXHQgIF9oYW5kbGVTZWNvbmRhcnlWYWx1ZTogZnVuY3Rpb24gX2hhbmRsZVNlY29uZGFyeVZhbHVlKCkge1xuXHQgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgIH1cblxuXHR9O1xuXG5cdHZhciBTID0gY3JlYXRlU3RyZWFtKCd0YWtlVW50aWxCeScsIG1peGluKTtcblx0dmFyIFAgPSBjcmVhdGVQcm9wZXJ0eSgndGFrZVVudGlsQnknLCBtaXhpbik7XG5cblx0bW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiB0YWtlVW50aWxCeShwcmltYXJ5LCBzZWNvbmRhcnkpIHtcblx0ICByZXR1cm4gbmV3IChwcmltYXJ5Ll9vZlNhbWVUeXBlKFMsIFApKShwcmltYXJ5LCBzZWNvbmRhcnkpO1xuXHR9O1xuXG4vKioqLyB9LFxuLyogNzQgKi9cbi8qKiovIGZ1bmN0aW9uKG1vZHVsZSwgZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXykge1xuXG5cdCd1c2Ugc3RyaWN0JztcblxuXHR2YXIgX3JlcXVpcmUgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDcwKTtcblxuXHR2YXIgY3JlYXRlU3RyZWFtID0gX3JlcXVpcmUuY3JlYXRlU3RyZWFtO1xuXHR2YXIgY3JlYXRlUHJvcGVydHkgPSBfcmVxdWlyZS5jcmVhdGVQcm9wZXJ0eTtcblxuXHR2YXIgbWl4aW4gPSB7XG5cblx0ICBfaW5pdDogZnVuY3Rpb24gX2luaXQoKSB7XG5cdCAgICB2YXIgX3JlZiA9IGFyZ3VtZW50cy5sZW5ndGggPD0gMCB8fCBhcmd1bWVudHNbMF0gPT09IHVuZGVmaW5lZCA/IHt9IDogYXJndW1lbnRzWzBdO1xuXG5cdCAgICB2YXIgX3JlZiRmbHVzaE9uRW5kID0gX3JlZi5mbHVzaE9uRW5kO1xuXHQgICAgdmFyIGZsdXNoT25FbmQgPSBfcmVmJGZsdXNoT25FbmQgPT09IHVuZGVmaW5lZCA/IHRydWUgOiBfcmVmJGZsdXNoT25FbmQ7XG5cblx0ICAgIHRoaXMuX2J1ZmYgPSBbXTtcblx0ICAgIHRoaXMuX2ZsdXNoT25FbmQgPSBmbHVzaE9uRW5kO1xuXHQgIH0sXG5cblx0ICBfZnJlZTogZnVuY3Rpb24gX2ZyZWUoKSB7XG5cdCAgICB0aGlzLl9idWZmID0gbnVsbDtcblx0ICB9LFxuXG5cdCAgX2ZsdXNoOiBmdW5jdGlvbiBfZmx1c2goKSB7XG5cdCAgICBpZiAodGhpcy5fYnVmZiAhPT0gbnVsbCkge1xuXHQgICAgICB0aGlzLl9lbWl0VmFsdWUodGhpcy5fYnVmZik7XG5cdCAgICAgIHRoaXMuX2J1ZmYgPSBbXTtcblx0ICAgIH1cblx0ICB9LFxuXG5cdCAgX2hhbmRsZVByaW1hcnlFbmQ6IGZ1bmN0aW9uIF9oYW5kbGVQcmltYXJ5RW5kKCkge1xuXHQgICAgaWYgKHRoaXMuX2ZsdXNoT25FbmQpIHtcblx0ICAgICAgdGhpcy5fZmx1c2goKTtcblx0ICAgIH1cblx0ICAgIHRoaXMuX2VtaXRFbmQoKTtcblx0ICB9LFxuXG5cdCAgX29uQWN0aXZhdGlvbjogZnVuY3Rpb24gX29uQWN0aXZhdGlvbigpIHtcblx0ICAgIHRoaXMuX3ByaW1hcnkub25BbnkodGhpcy5fJGhhbmRsZVByaW1hcnlBbnkpO1xuXHQgICAgaWYgKHRoaXMuX2FsaXZlICYmIHRoaXMuX3NlY29uZGFyeSAhPT0gbnVsbCkge1xuXHQgICAgICB0aGlzLl9zZWNvbmRhcnkub25BbnkodGhpcy5fJGhhbmRsZVNlY29uZGFyeUFueSk7XG5cdCAgICB9XG5cdCAgfSxcblxuXHQgIF9oYW5kbGVQcmltYXJ5VmFsdWU6IGZ1bmN0aW9uIF9oYW5kbGVQcmltYXJ5VmFsdWUoeCkge1xuXHQgICAgdGhpcy5fYnVmZi5wdXNoKHgpO1xuXHQgIH0sXG5cblx0ICBfaGFuZGxlU2Vjb25kYXJ5VmFsdWU6IGZ1bmN0aW9uIF9oYW5kbGVTZWNvbmRhcnlWYWx1ZSgpIHtcblx0ICAgIHRoaXMuX2ZsdXNoKCk7XG5cdCAgfSxcblxuXHQgIF9oYW5kbGVTZWNvbmRhcnlFbmQ6IGZ1bmN0aW9uIF9oYW5kbGVTZWNvbmRhcnlFbmQoKSB7XG5cdCAgICBpZiAoIXRoaXMuX2ZsdXNoT25FbmQpIHtcblx0ICAgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgICAgfVxuXHQgIH1cblxuXHR9O1xuXG5cdHZhciBTID0gY3JlYXRlU3RyZWFtKCdidWZmZXJCeScsIG1peGluKTtcblx0dmFyIFAgPSBjcmVhdGVQcm9wZXJ0eSgnYnVmZmVyQnknLCBtaXhpbik7XG5cblx0bW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBidWZmZXJCeShwcmltYXJ5LCBzZWNvbmRhcnksIG9wdGlvbnMgLyogb3B0aW9uYWwgKi8pIHtcblx0ICByZXR1cm4gbmV3IChwcmltYXJ5Ll9vZlNhbWVUeXBlKFMsIFApKShwcmltYXJ5LCBzZWNvbmRhcnksIG9wdGlvbnMpO1xuXHR9O1xuXG4vKioqLyB9LFxuLyogNzUgKi9cbi8qKiovIGZ1bmN0aW9uKG1vZHVsZSwgZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXykge1xuXG5cdCd1c2Ugc3RyaWN0JztcblxuXHR2YXIgX3JlcXVpcmUgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDcwKTtcblxuXHR2YXIgY3JlYXRlU3RyZWFtID0gX3JlcXVpcmUuY3JlYXRlU3RyZWFtO1xuXHR2YXIgY3JlYXRlUHJvcGVydHkgPSBfcmVxdWlyZS5jcmVhdGVQcm9wZXJ0eTtcblxuXHR2YXIgX3JlcXVpcmUyID0gX193ZWJwYWNrX3JlcXVpcmVfXygzKTtcblxuXHR2YXIgTk9USElORyA9IF9yZXF1aXJlMi5OT1RISU5HO1xuXG5cdHZhciBtaXhpbiA9IHtcblxuXHQgIF9pbml0OiBmdW5jdGlvbiBfaW5pdCgpIHtcblx0ICAgIHZhciBfcmVmID0gYXJndW1lbnRzLmxlbmd0aCA8PSAwIHx8IGFyZ3VtZW50c1swXSA9PT0gdW5kZWZpbmVkID8ge30gOiBhcmd1bWVudHNbMF07XG5cblx0ICAgIHZhciBfcmVmJGZsdXNoT25FbmQgPSBfcmVmLmZsdXNoT25FbmQ7XG5cdCAgICB2YXIgZmx1c2hPbkVuZCA9IF9yZWYkZmx1c2hPbkVuZCA9PT0gdW5kZWZpbmVkID8gdHJ1ZSA6IF9yZWYkZmx1c2hPbkVuZDtcblx0ICAgIHZhciBfcmVmJGZsdXNoT25DaGFuZ2UgPSBfcmVmLmZsdXNoT25DaGFuZ2U7XG5cdCAgICB2YXIgZmx1c2hPbkNoYW5nZSA9IF9yZWYkZmx1c2hPbkNoYW5nZSA9PT0gdW5kZWZpbmVkID8gZmFsc2UgOiBfcmVmJGZsdXNoT25DaGFuZ2U7XG5cblx0ICAgIHRoaXMuX2J1ZmYgPSBbXTtcblx0ICAgIHRoaXMuX2ZsdXNoT25FbmQgPSBmbHVzaE9uRW5kO1xuXHQgICAgdGhpcy5fZmx1c2hPbkNoYW5nZSA9IGZsdXNoT25DaGFuZ2U7XG5cdCAgfSxcblxuXHQgIF9mcmVlOiBmdW5jdGlvbiBfZnJlZSgpIHtcblx0ICAgIHRoaXMuX2J1ZmYgPSBudWxsO1xuXHQgIH0sXG5cblx0ICBfZmx1c2g6IGZ1bmN0aW9uIF9mbHVzaCgpIHtcblx0ICAgIGlmICh0aGlzLl9idWZmICE9PSBudWxsKSB7XG5cdCAgICAgIHRoaXMuX2VtaXRWYWx1ZSh0aGlzLl9idWZmKTtcblx0ICAgICAgdGhpcy5fYnVmZiA9IFtdO1xuXHQgICAgfVxuXHQgIH0sXG5cblx0ICBfaGFuZGxlUHJpbWFyeUVuZDogZnVuY3Rpb24gX2hhbmRsZVByaW1hcnlFbmQoKSB7XG5cdCAgICBpZiAodGhpcy5fZmx1c2hPbkVuZCkge1xuXHQgICAgICB0aGlzLl9mbHVzaCgpO1xuXHQgICAgfVxuXHQgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgIH0sXG5cblx0ICBfaGFuZGxlUHJpbWFyeVZhbHVlOiBmdW5jdGlvbiBfaGFuZGxlUHJpbWFyeVZhbHVlKHgpIHtcblx0ICAgIHRoaXMuX2J1ZmYucHVzaCh4KTtcblx0ICAgIGlmICh0aGlzLl9sYXN0U2Vjb25kYXJ5ICE9PSBOT1RISU5HICYmICF0aGlzLl9sYXN0U2Vjb25kYXJ5KSB7XG5cdCAgICAgIHRoaXMuX2ZsdXNoKCk7XG5cdCAgICB9XG5cdCAgfSxcblxuXHQgIF9oYW5kbGVTZWNvbmRhcnlFbmQ6IGZ1bmN0aW9uIF9oYW5kbGVTZWNvbmRhcnlFbmQoKSB7XG5cdCAgICBpZiAoIXRoaXMuX2ZsdXNoT25FbmQgJiYgKHRoaXMuX2xhc3RTZWNvbmRhcnkgPT09IE5PVEhJTkcgfHwgdGhpcy5fbGFzdFNlY29uZGFyeSkpIHtcblx0ICAgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgICAgfVxuXHQgIH0sXG5cblx0ICBfaGFuZGxlU2Vjb25kYXJ5VmFsdWU6IGZ1bmN0aW9uIF9oYW5kbGVTZWNvbmRhcnlWYWx1ZSh4KSB7XG5cdCAgICBpZiAodGhpcy5fZmx1c2hPbkNoYW5nZSAmJiAheCkge1xuXHQgICAgICB0aGlzLl9mbHVzaCgpO1xuXHQgICAgfVxuXG5cdCAgICAvLyBmcm9tIGRlZmF1bHQgX2hhbmRsZVNlY29uZGFyeVZhbHVlXG5cdCAgICB0aGlzLl9sYXN0U2Vjb25kYXJ5ID0geDtcblx0ICB9XG5cblx0fTtcblxuXHR2YXIgUyA9IGNyZWF0ZVN0cmVhbSgnYnVmZmVyV2hpbGVCeScsIG1peGluKTtcblx0dmFyIFAgPSBjcmVhdGVQcm9wZXJ0eSgnYnVmZmVyV2hpbGVCeScsIG1peGluKTtcblxuXHRtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGJ1ZmZlcldoaWxlQnkocHJpbWFyeSwgc2Vjb25kYXJ5LCBvcHRpb25zIC8qIG9wdGlvbmFsICovKSB7XG5cdCAgcmV0dXJuIG5ldyAocHJpbWFyeS5fb2ZTYW1lVHlwZShTLCBQKSkocHJpbWFyeSwgc2Vjb25kYXJ5LCBvcHRpb25zKTtcblx0fTtcblxuLyoqKi8gfSxcbi8qIDc2ICovXG4vKioqLyBmdW5jdGlvbihtb2R1bGUsIGV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pIHtcblxuXHQndXNlIHN0cmljdCc7XG5cblx0dmFyIG1lcmdlID0gX193ZWJwYWNrX3JlcXVpcmVfXyg2Mik7XG5cdHZhciBtYXAgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDMyKTtcblx0dmFyIHNraXBEdXBsaWNhdGVzID0gX193ZWJwYWNrX3JlcXVpcmVfXyg0MCk7XG5cdHZhciB0b1Byb3BlcnR5ID0gX193ZWJwYWNrX3JlcXVpcmVfXygyNCk7XG5cblx0dmFyIGYgPSBmdW5jdGlvbiBmKCkge1xuXHQgIHJldHVybiBmYWxzZTtcblx0fTtcblx0dmFyIHQgPSBmdW5jdGlvbiB0KCkge1xuXHQgIHJldHVybiB0cnVlO1xuXHR9O1xuXG5cdG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gYXdhaXRpbmcoYSwgYikge1xuXHQgIHZhciByZXN1bHQgPSBtZXJnZShbbWFwKGEsIHQpLCBtYXAoYiwgZildKTtcblx0ICByZXN1bHQgPSBza2lwRHVwbGljYXRlcyhyZXN1bHQpO1xuXHQgIHJlc3VsdCA9IHRvUHJvcGVydHkocmVzdWx0LCBmKTtcblx0ICByZXR1cm4gcmVzdWx0LnNldE5hbWUoYSwgJ2F3YWl0aW5nJyk7XG5cdH07XG5cbi8qKiovIH0sXG4vKiA3NyAqL1xuLyoqKi8gZnVuY3Rpb24obW9kdWxlLCBleHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKSB7XG5cblx0J3VzZSBzdHJpY3QnO1xuXG5cdHZhciBfcmVxdWlyZSA9IF9fd2VicGFja19yZXF1aXJlX18oMjUpO1xuXG5cdHZhciBjcmVhdGVTdHJlYW0gPSBfcmVxdWlyZS5jcmVhdGVTdHJlYW07XG5cdHZhciBjcmVhdGVQcm9wZXJ0eSA9IF9yZXF1aXJlLmNyZWF0ZVByb3BlcnR5O1xuXG5cdHZhciBtaXhpbiA9IHtcblxuXHQgIF9pbml0OiBmdW5jdGlvbiBfaW5pdChfcmVmKSB7XG5cdCAgICB2YXIgZm4gPSBfcmVmLmZuO1xuXG5cdCAgICB0aGlzLl9mbiA9IGZuO1xuXHQgIH0sXG5cblx0ICBfZnJlZTogZnVuY3Rpb24gX2ZyZWUoKSB7XG5cdCAgICB0aGlzLl9mbiA9IG51bGw7XG5cdCAgfSxcblxuXHQgIF9oYW5kbGVWYWx1ZTogZnVuY3Rpb24gX2hhbmRsZVZhbHVlKHgpIHtcblx0ICAgIHZhciBmbiA9IHRoaXMuX2ZuO1xuXHQgICAgdmFyIHJlc3VsdCA9IGZuKHgpO1xuXHQgICAgaWYgKHJlc3VsdC5jb252ZXJ0KSB7XG5cdCAgICAgIHRoaXMuX2VtaXRFcnJvcihyZXN1bHQuZXJyb3IpO1xuXHQgICAgfSBlbHNlIHtcblx0ICAgICAgdGhpcy5fZW1pdFZhbHVlKHgpO1xuXHQgICAgfVxuXHQgIH1cblxuXHR9O1xuXG5cdHZhciBTID0gY3JlYXRlU3RyZWFtKCd2YWx1ZXNUb0Vycm9ycycsIG1peGluKTtcblx0dmFyIFAgPSBjcmVhdGVQcm9wZXJ0eSgndmFsdWVzVG9FcnJvcnMnLCBtaXhpbik7XG5cblx0dmFyIGRlZkZuID0gZnVuY3Rpb24gZGVmRm4oeCkge1xuXHQgIHJldHVybiB7IGNvbnZlcnQ6IHRydWUsIGVycm9yOiB4IH07XG5cdH07XG5cblx0bW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiB2YWx1ZXNUb0Vycm9ycyhvYnMpIHtcblx0ICB2YXIgZm4gPSBhcmd1bWVudHMubGVuZ3RoIDw9IDEgfHwgYXJndW1lbnRzWzFdID09PSB1bmRlZmluZWQgPyBkZWZGbiA6IGFyZ3VtZW50c1sxXTtcblxuXHQgIHJldHVybiBuZXcgKG9icy5fb2ZTYW1lVHlwZShTLCBQKSkob2JzLCB7IGZuOiBmbiB9KTtcblx0fTtcblxuLyoqKi8gfSxcbi8qIDc4ICovXG4vKioqLyBmdW5jdGlvbihtb2R1bGUsIGV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pIHtcblxuXHQndXNlIHN0cmljdCc7XG5cblx0dmFyIF9yZXF1aXJlID0gX193ZWJwYWNrX3JlcXVpcmVfXygyNSk7XG5cblx0dmFyIGNyZWF0ZVN0cmVhbSA9IF9yZXF1aXJlLmNyZWF0ZVN0cmVhbTtcblx0dmFyIGNyZWF0ZVByb3BlcnR5ID0gX3JlcXVpcmUuY3JlYXRlUHJvcGVydHk7XG5cblx0dmFyIG1peGluID0ge1xuXG5cdCAgX2luaXQ6IGZ1bmN0aW9uIF9pbml0KF9yZWYpIHtcblx0ICAgIHZhciBmbiA9IF9yZWYuZm47XG5cblx0ICAgIHRoaXMuX2ZuID0gZm47XG5cdCAgfSxcblxuXHQgIF9mcmVlOiBmdW5jdGlvbiBfZnJlZSgpIHtcblx0ICAgIHRoaXMuX2ZuID0gbnVsbDtcblx0ICB9LFxuXG5cdCAgX2hhbmRsZUVycm9yOiBmdW5jdGlvbiBfaGFuZGxlRXJyb3IoeCkge1xuXHQgICAgdmFyIGZuID0gdGhpcy5fZm47XG5cdCAgICB2YXIgcmVzdWx0ID0gZm4oeCk7XG5cdCAgICBpZiAocmVzdWx0LmNvbnZlcnQpIHtcblx0ICAgICAgdGhpcy5fZW1pdFZhbHVlKHJlc3VsdC52YWx1ZSk7XG5cdCAgICB9IGVsc2Uge1xuXHQgICAgICB0aGlzLl9lbWl0RXJyb3IoeCk7XG5cdCAgICB9XG5cdCAgfVxuXG5cdH07XG5cblx0dmFyIFMgPSBjcmVhdGVTdHJlYW0oJ2Vycm9yc1RvVmFsdWVzJywgbWl4aW4pO1xuXHR2YXIgUCA9IGNyZWF0ZVByb3BlcnR5KCdlcnJvcnNUb1ZhbHVlcycsIG1peGluKTtcblxuXHR2YXIgZGVmRm4gPSBmdW5jdGlvbiBkZWZGbih4KSB7XG5cdCAgcmV0dXJuIHsgY29udmVydDogdHJ1ZSwgdmFsdWU6IHggfTtcblx0fTtcblxuXHRtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGVycm9yc1RvVmFsdWVzKG9icykge1xuXHQgIHZhciBmbiA9IGFyZ3VtZW50cy5sZW5ndGggPD0gMSB8fCBhcmd1bWVudHNbMV0gPT09IHVuZGVmaW5lZCA/IGRlZkZuIDogYXJndW1lbnRzWzFdO1xuXG5cdCAgcmV0dXJuIG5ldyAob2JzLl9vZlNhbWVUeXBlKFMsIFApKShvYnMsIHsgZm46IGZuIH0pO1xuXHR9O1xuXG4vKioqLyB9LFxuLyogNzkgKi9cbi8qKiovIGZ1bmN0aW9uKG1vZHVsZSwgZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXykge1xuXG5cdCd1c2Ugc3RyaWN0JztcblxuXHR2YXIgX3JlcXVpcmUgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDI1KTtcblxuXHR2YXIgY3JlYXRlU3RyZWFtID0gX3JlcXVpcmUuY3JlYXRlU3RyZWFtO1xuXHR2YXIgY3JlYXRlUHJvcGVydHkgPSBfcmVxdWlyZS5jcmVhdGVQcm9wZXJ0eTtcblxuXHR2YXIgbWl4aW4gPSB7XG5cblx0ICBfaGFuZGxlRXJyb3I6IGZ1bmN0aW9uIF9oYW5kbGVFcnJvcih4KSB7XG5cdCAgICB0aGlzLl9lbWl0RXJyb3IoeCk7XG5cdCAgICB0aGlzLl9lbWl0RW5kKCk7XG5cdCAgfVxuXG5cdH07XG5cblx0dmFyIFMgPSBjcmVhdGVTdHJlYW0oJ2VuZE9uRXJyb3InLCBtaXhpbik7XG5cdHZhciBQID0gY3JlYXRlUHJvcGVydHkoJ2VuZE9uRXJyb3InLCBtaXhpbik7XG5cblx0bW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBlbmRPbkVycm9yKG9icykge1xuXHQgIHJldHVybiBuZXcgKG9icy5fb2ZTYW1lVHlwZShTLCBQKSkob2JzKTtcblx0fTtcblxuLyoqKi8gfVxuLyoqKioqKi8gXSlcbn0pO1xuO1xuXG5cbi8qKioqKioqKioqKioqKioqKlxuICoqIFdFQlBBQ0sgRk9PVEVSXG4gKiogLi9+L2tlZmlyL2Rpc3Qva2VmaXIuanNcbiAqKiBtb2R1bGUgaWQgPSAzXG4gKiogbW9kdWxlIGNodW5rcyA9IDBcbiAqKi8iLCJjb25zdCBsb29wZXIgPSByZXF1aXJlKCcuL2xvb3Blci5qcycpO1xuXG5tb2R1bGUuZXhwb3J0cy5uZXh0ID0gbmV4dDtcblxubW9kdWxlLmV4cG9ydHMuY29uZmlnID0gKGNvbmZpZykgPT4ge1xuICBsb29wZXIuY29uZmlnKGNvbmZpZylcbn07XG5cbm1vZHVsZS5leHBvcnRzLnBsYXkgPSAoKSA9PiB7XG4gIGxvb3Blci5wbGF5KClcbn07XG5cblxuZnVuY3Rpb24gbmV4dChpZCkge1xuICBsb29wZXIubmV4dChpZCk7XG59XG5cblxuXG4vKiogV0VCUEFDSyBGT09URVIgKipcbiAqKiAuL3NjZW5lLW1ha2VyL3JlbmRlci9hdWRpb3BsYXllci5qc1xuICoqLyIsIid1c2Ugc3RyaWN0JztcbmNvbnN0IEhvd2wgPSByZXF1aXJlKCdob3dsZXInKS5Ib3dsO1xuXG52YXIgbG9vcHMgPSB7fTtcbnZhciBsb29wO1xuXG5tb2R1bGUuZXhwb3J0cy5jb25maWcgPSAoY29uZmlnKSA9PiB7XG4gIGxvb3BzID0gY29uZmlnLm1hcChjID0+IHtcbiAgICBsZXQgYXVkaW9Db25maWcgPSB7XG4gICAgICBzcmM6IFsnbWVkaWEvJysgYy5hdWRpby5zcmMgKycubXAzJ10sXG4gICAgICBodG1sNTogdHJ1ZSxcbiAgICAgIHZvbHVtZTogMFxuICAgIH1cbiAgICByZXR1cm4ge1xuICAgICAgJ2lkJzogYy5pZCxcbiAgICAgICd2b2wnOiBjLmF1ZGlvLm1heCxcbiAgICAgICdzb3VuZDEnOiBuZXcgSG93bChhdWRpb0NvbmZpZyksXG4gICAgICAnc291bmQyJzogbmV3IEhvd2woYXVkaW9Db25maWcpXG4gICAgfVxuICB9KS5yZWR1Y2UoIChwcmV2LG5leHQpID0+ICB7cHJldltuZXh0LmlkXSA9IG5leHQ7IHJldHVybiBwcmV2O30sIHt9KVxufVxuXG5tb2R1bGUuZXhwb3J0cy5uZXh0ID0gKGlkKSA9PiB7XG4gIC8vIGNvbnNvbGUubG9nKCduZXh0JywgaWQpXG4gIGxvb3AgPSBsb29wc1tpZF07XG4gIC8vIGNvbnNvbGUubG9nKGxvb3ApO1xufVxuXG5tb2R1bGUuZXhwb3J0cy5wYXVzZSA9IChjb25maWcpID0+IHtcblxufVxuXG5tb2R1bGUuZXhwb3J0cy5wbGF5ID0gKGNvbmZpZykgPT4ge1xuICBsb29wZXIoKTtcbn1cblxubW9kdWxlLmV4cG9ydHMuc3RvcCA9IChjb25maWcpID0+IHtcblxufVxuXG5mdW5jdGlvbiBsb29wZXIoKSB7XG5cbiAgJ3VzZSBzdHJpY3QnO1xuICAvLyBjb25zb2xlLmxvZygnbG9vcGVyJywgbG9vcC5zb3VuZDEpXG4gIGxldCBmYWRlUGVyY2VudCA9IChsb29wLnNvdW5kMS5kdXJhdGlvbigpID4gNSkgID8gMC4wMSA6IDAuMDE1OyAvLyAyJSBvciAxJSBkZXBlbmRpbmcgb24gaWYgc291bmQgaXMgb3ZlciA1IHNlY29uZHNcbiAgbGV0IGZhZGVyYXRlID0gIDEgLSBmYWRlUGVyY2VudDtcbiAgbGV0IGR1cmF0aW9uID0gbG9vcC5zb3VuZDEuZHVyYXRpb24oKSAqIDEwMDAgKiAoMSAtIGZhZGVQZXJjZW50KTtcbiAgbGV0IHZvbHVtZSA9IGxvb3Audm9sO1xuICAvLyBjb25zb2xlLmxvZyhmYWRlcmF0ZSwgZmFkZVBlcmNlbnQsIGR1cmF0aW9uLCB2b2x1bWUpO1xuXG4gIGxvb3Auc291bmQxLnBsYXkoKTtcbiAgbG9vcC5zb3VuZDEuZmFkZSgwLHZvbHVtZSwgZHVyYXRpb24gKiBmYWRlUGVyY2VudCk7XG5cbiAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgbG9vcC5zb3VuZDEuZmFkZSh2b2x1bWUsMCwgZHVyYXRpb24gKiBmYWRlUGVyY2VudCk7XG4gIH0sIGR1cmF0aW9uICogZmFkZXJhdGUgKTtcblxuICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICBsb29wLnNvdW5kMi5wbGF5KCk7XG4gICAgbG9vcC5zb3VuZDIuZmFkZSgwLHZvbHVtZSwgZHVyYXRpb24gKiBmYWRlUGVyY2VudCk7XG4gIH0sIGR1cmF0aW9uICogZmFkZXJhdGUpO1xuXG4gIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgIGxvb3Auc291bmQyLmZhZGUodm9sdW1lLDAsIGR1cmF0aW9uICogZmFkZVBlcmNlbnQpO1xuICAgIGxvb3BlcigpO1xuICB9LCBkdXJhdGlvbiAqIDIgKiBmYWRlcmF0ZSk7XG5cbn1cblxubW9kdWxlLmV4cG9ydHMubG9vcCA9IGxvb3BlcjtcblxuXG5cbi8qKiBXRUJQQUNLIEZPT1RFUiAqKlxuICoqIC4vc2NlbmUtbWFrZXIvcmVuZGVyL2xvb3Blci5qc1xuICoqLyIsIi8qISBob3dsZXIuanMgdjIuMC4wLWJldGE3IHwgKGMpIDIwMTMtMjAxNiwgSmFtZXMgU2ltcHNvbiBvZiBHb2xkRmlyZSBTdHVkaW9zIHwgTUlUIExpY2Vuc2UgfCBob3dsZXJqcy5jb20gKi9cbiFmdW5jdGlvbigpe1widXNlIHN0cmljdFwiO2Z1bmN0aW9uIGUoKXt0cnl7XCJ1bmRlZmluZWRcIiE9dHlwZW9mIEF1ZGlvQ29udGV4dD9uPW5ldyBBdWRpb0NvbnRleHQ6XCJ1bmRlZmluZWRcIiE9dHlwZW9mIHdlYmtpdEF1ZGlvQ29udGV4dD9uPW5ldyB3ZWJraXRBdWRpb0NvbnRleHQ6bz0hMX1jYXRjaChlKXtvPSExfWlmKCFvKWlmKFwidW5kZWZpbmVkXCIhPXR5cGVvZiBBdWRpbyl0cnl7dmFyIGQ9bmV3IEF1ZGlvO1widW5kZWZpbmVkXCI9PXR5cGVvZiBkLm9uY2FucGxheXRocm91Z2gmJih1PVwiY2FucGxheVwiKX1jYXRjaChlKXt0PSEwfWVsc2UgdD0hMDt0cnl7dmFyIGQ9bmV3IEF1ZGlvO2QubXV0ZWQmJih0PSEwKX1jYXRjaChlKXt9dmFyIGE9L2lQKGhvbmV8b2R8YWQpLy50ZXN0KG5hdmlnYXRvci5wbGF0Zm9ybSksaT1uYXZpZ2F0b3IuYXBwVmVyc2lvbi5tYXRjaCgvT1MgKFxcZCspXyhcXGQrKV8/KFxcZCspPy8pLF89aT9wYXJzZUludChpWzFdLDEwKTpudWxsO2lmKGEmJl8mJjk+Xyl7dmFyIHM9L3NhZmFyaS8udGVzdCh3aW5kb3cubmF2aWdhdG9yLnVzZXJBZ2VudC50b0xvd2VyQ2FzZSgpKTsod2luZG93Lm5hdmlnYXRvci5zdGFuZGFsb25lJiYhc3x8IXdpbmRvdy5uYXZpZ2F0b3Iuc3RhbmRhbG9uZSYmIXMpJiYobz0hMSl9byYmKHI9XCJ1bmRlZmluZWRcIj09dHlwZW9mIG4uY3JlYXRlR2Fpbj9uLmNyZWF0ZUdhaW5Ob2RlKCk6bi5jcmVhdGVHYWluKCksci5nYWluLnZhbHVlPTEsci5jb25uZWN0KG4uZGVzdGluYXRpb24pKX12YXIgbj1udWxsLG89ITAsdD0hMSxyPW51bGwsdT1cImNhbnBsYXl0aHJvdWdoXCI7ZSgpO3ZhciBkPWZ1bmN0aW9uKCl7dGhpcy5pbml0KCl9O2QucHJvdG90eXBlPXtpbml0OmZ1bmN0aW9uKCl7dmFyIGU9dGhpc3x8YTtyZXR1cm4gZS5fY29kZWNzPXt9LGUuX2hvd2xzPVtdLGUuX211dGVkPSExLGUuX3ZvbHVtZT0xLGUuc3RhdGU9bj9uLnN0YXRlfHxcInJ1bm5pbmdcIjpcInJ1bm5pbmdcIixlLmF1dG9TdXNwZW5kPSEwLGUuX2F1dG9TdXNwZW5kKCksZS5tb2JpbGVBdXRvRW5hYmxlPSEwLGUubm9BdWRpbz10LGUudXNpbmdXZWJBdWRpbz1vLGUuY3R4PW4sdHx8ZS5fc2V0dXBDb2RlY3MoKSxlfSx2b2x1bWU6ZnVuY3Rpb24oZSl7dmFyIG49dGhpc3x8YTtpZihlPXBhcnNlRmxvYXQoZSksXCJ1bmRlZmluZWRcIiE9dHlwZW9mIGUmJmU+PTAmJjE+PWUpe24uX3ZvbHVtZT1lLG8mJihyLmdhaW4udmFsdWU9ZSk7Zm9yKHZhciB0PTA7dDxuLl9ob3dscy5sZW5ndGg7dCsrKWlmKCFuLl9ob3dsc1t0XS5fd2ViQXVkaW8pZm9yKHZhciB1PW4uX2hvd2xzW3RdLl9nZXRTb3VuZElkcygpLGQ9MDtkPHUubGVuZ3RoO2QrKyl7dmFyIGk9bi5faG93bHNbdF0uX3NvdW5kQnlJZCh1W2RdKTtpJiZpLl9ub2RlJiYoaS5fbm9kZS52b2x1bWU9aS5fdm9sdW1lKmUpfXJldHVybiBufXJldHVybiBuLl92b2x1bWV9LG11dGU6ZnVuY3Rpb24oZSl7dmFyIG49dGhpc3x8YTtuLl9tdXRlZD1lLG8mJihyLmdhaW4udmFsdWU9ZT8wOm4uX3ZvbHVtZSk7Zm9yKHZhciB0PTA7dDxuLl9ob3dscy5sZW5ndGg7dCsrKWlmKCFuLl9ob3dsc1t0XS5fd2ViQXVkaW8pZm9yKHZhciB1PW4uX2hvd2xzW3RdLl9nZXRTb3VuZElkcygpLGQ9MDtkPHUubGVuZ3RoO2QrKyl7dmFyIGk9bi5faG93bHNbdF0uX3NvdW5kQnlJZCh1W2RdKTtpJiZpLl9ub2RlJiYoaS5fbm9kZS5tdXRlZD1lPyEwOmkuX211dGVkKX1yZXR1cm4gbn0sdW5sb2FkOmZ1bmN0aW9uKCl7Zm9yKHZhciBvPXRoaXN8fGEsdD1vLl9ob3dscy5sZW5ndGgtMTt0Pj0wO3QtLSlvLl9ob3dsc1t0XS51bmxvYWQoKTtyZXR1cm4gby51c2luZ1dlYkF1ZGlvJiZcInVuZGVmaW5lZFwiIT10eXBlb2Ygbi5jbG9zZSYmKG8uY3R4PW51bGwsbi5jbG9zZSgpLGUoKSxvLmN0eD1uKSxvfSxjb2RlY3M6ZnVuY3Rpb24oZSl7cmV0dXJuKHRoaXN8fGEpLl9jb2RlY3NbZV19LF9zZXR1cENvZGVjczpmdW5jdGlvbigpe3ZhciBlPXRoaXN8fGEsbj1uZXcgQXVkaW8sbz1uLmNhblBsYXlUeXBlKFwiYXVkaW8vbXBlZztcIikucmVwbGFjZSgvXm5vJC8sXCJcIiksdD0vT1BSXFwvLy50ZXN0KG5hdmlnYXRvci51c2VyQWdlbnQpO3JldHVybiBlLl9jb2RlY3M9e21wMzohKHR8fCFvJiYhbi5jYW5QbGF5VHlwZShcImF1ZGlvL21wMztcIikucmVwbGFjZSgvXm5vJC8sXCJcIikpLG1wZWc6ISFvLG9wdXM6ISFuLmNhblBsYXlUeXBlKCdhdWRpby9vZ2c7IGNvZGVjcz1cIm9wdXNcIicpLnJlcGxhY2UoL15ubyQvLFwiXCIpLG9nZzohIW4uY2FuUGxheVR5cGUoJ2F1ZGlvL29nZzsgY29kZWNzPVwidm9yYmlzXCInKS5yZXBsYWNlKC9ebm8kLyxcIlwiKSxvZ2E6ISFuLmNhblBsYXlUeXBlKCdhdWRpby9vZ2c7IGNvZGVjcz1cInZvcmJpc1wiJykucmVwbGFjZSgvXm5vJC8sXCJcIiksd2F2OiEhbi5jYW5QbGF5VHlwZSgnYXVkaW8vd2F2OyBjb2RlY3M9XCIxXCInKS5yZXBsYWNlKC9ebm8kLyxcIlwiKSxhYWM6ISFuLmNhblBsYXlUeXBlKFwiYXVkaW8vYWFjO1wiKS5yZXBsYWNlKC9ebm8kLyxcIlwiKSxtNGE6ISEobi5jYW5QbGF5VHlwZShcImF1ZGlvL3gtbTRhO1wiKXx8bi5jYW5QbGF5VHlwZShcImF1ZGlvL200YTtcIil8fG4uY2FuUGxheVR5cGUoXCJhdWRpby9hYWM7XCIpKS5yZXBsYWNlKC9ebm8kLyxcIlwiKSxtcDQ6ISEobi5jYW5QbGF5VHlwZShcImF1ZGlvL3gtbXA0O1wiKXx8bi5jYW5QbGF5VHlwZShcImF1ZGlvL21wNDtcIil8fG4uY2FuUGxheVR5cGUoXCJhdWRpby9hYWM7XCIpKS5yZXBsYWNlKC9ebm8kLyxcIlwiKSx3ZWJhOiEhbi5jYW5QbGF5VHlwZSgnYXVkaW8vd2VibTsgY29kZWNzPVwidm9yYmlzXCInKS5yZXBsYWNlKC9ebm8kLyxcIlwiKSx3ZWJtOiEhbi5jYW5QbGF5VHlwZSgnYXVkaW8vd2VibTsgY29kZWNzPVwidm9yYmlzXCInKS5yZXBsYWNlKC9ebm8kLyxcIlwiKSxkb2xieTohIW4uY2FuUGxheVR5cGUoJ2F1ZGlvL21wNDsgY29kZWNzPVwiZWMtM1wiJykucmVwbGFjZSgvXm5vJC8sXCJcIil9LGV9LF9lbmFibGVNb2JpbGVBdWRpbzpmdW5jdGlvbigpe3ZhciBlPXRoaXN8fGEsbz0vaVBob25lfGlQYWR8aVBvZHxBbmRyb2lkfEJsYWNrQmVycnl8QkIxMHxTaWxrL2kudGVzdChuYXZpZ2F0b3IudXNlckFnZW50KSx0PSEhKFwib250b3VjaGVuZFwiaW4gd2luZG93fHxuYXZpZ2F0b3IubWF4VG91Y2hQb2ludHM+MHx8bmF2aWdhdG9yLm1zTWF4VG91Y2hQb2ludHM+MCk7aWYoIW58fCFlLl9tb2JpbGVFbmFibGVkJiZvJiZ0KXtlLl9tb2JpbGVFbmFibGVkPSExO3ZhciByPWZ1bmN0aW9uKCl7dmFyIG89bi5jcmVhdGVCdWZmZXIoMSwxLDIyMDUwKSx0PW4uY3JlYXRlQnVmZmVyU291cmNlKCk7dC5idWZmZXI9byx0LmNvbm5lY3Qobi5kZXN0aW5hdGlvbiksXCJ1bmRlZmluZWRcIj09dHlwZW9mIHQuc3RhcnQ/dC5ub3RlT24oMCk6dC5zdGFydCgwKSx0Lm9uZW5kZWQ9ZnVuY3Rpb24oKXt0LmRpc2Nvbm5lY3QoMCksZS5fbW9iaWxlRW5hYmxlZD0hMCxlLm1vYmlsZUF1dG9FbmFibGU9ITEsZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihcInRvdWNoZW5kXCIsciwhMCl9fTtyZXR1cm4gZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcInRvdWNoZW5kXCIsciwhMCksZX19LF9hdXRvU3VzcGVuZDpmdW5jdGlvbigpe3ZhciBlPXRoaXM7aWYoZS5hdXRvU3VzcGVuZCYmbiYmXCJ1bmRlZmluZWRcIiE9dHlwZW9mIG4uc3VzcGVuZCYmbyl7Zm9yKHZhciB0PTA7dDxlLl9ob3dscy5sZW5ndGg7dCsrKWlmKGUuX2hvd2xzW3RdLl93ZWJBdWRpbylmb3IodmFyIHI9MDtyPGUuX2hvd2xzW3RdLl9zb3VuZHMubGVuZ3RoO3IrKylpZighZS5faG93bHNbdF0uX3NvdW5kc1tyXS5fcGF1c2VkKXJldHVybiBlO3JldHVybiBlLl9zdXNwZW5kVGltZXI9c2V0VGltZW91dChmdW5jdGlvbigpe2UuYXV0b1N1c3BlbmQmJihlLl9zdXNwZW5kVGltZXI9bnVsbCxlLnN0YXRlPVwic3VzcGVuZGluZ1wiLG4uc3VzcGVuZCgpLnRoZW4oZnVuY3Rpb24oKXtlLnN0YXRlPVwic3VzcGVuZGVkXCIsZS5fcmVzdW1lQWZ0ZXJTdXNwZW5kJiYoZGVsZXRlIGUuX3Jlc3VtZUFmdGVyU3VzcGVuZCxlLl9hdXRvUmVzdW1lKCkpfSkpfSwzZTQpLGV9fSxfYXV0b1Jlc3VtZTpmdW5jdGlvbigpe3ZhciBlPXRoaXM7aWYobiYmXCJ1bmRlZmluZWRcIiE9dHlwZW9mIG4ucmVzdW1lJiZvKXJldHVyblwicnVubmluZ1wiPT09ZS5zdGF0ZSYmZS5fc3VzcGVuZFRpbWVyPyhjbGVhclRpbWVvdXQoZS5fc3VzcGVuZFRpbWVyKSxlLl9zdXNwZW5kVGltZXI9bnVsbCk6XCJzdXNwZW5kZWRcIj09PWUuc3RhdGU/KGUuc3RhdGU9XCJyZXN1bWluZ1wiLG4ucmVzdW1lKCkudGhlbihmdW5jdGlvbigpe2Uuc3RhdGU9XCJydW5uaW5nXCJ9KSxlLl9zdXNwZW5kVGltZXImJihjbGVhclRpbWVvdXQoZS5fc3VzcGVuZFRpbWVyKSxlLl9zdXNwZW5kVGltZXI9bnVsbCkpOlwic3VzcGVuZGluZ1wiPT09ZS5zdGF0ZSYmKGUuX3Jlc3VtZUFmdGVyU3VzcGVuZD0hMCksZX19O3ZhciBhPW5ldyBkLGk9ZnVuY3Rpb24oZSl7dmFyIG49dGhpcztyZXR1cm4gZS5zcmMmJjAhPT1lLnNyYy5sZW5ndGg/dm9pZCBuLmluaXQoZSk6dm9pZCBjb25zb2xlLmVycm9yKFwiQW4gYXJyYXkgb2Ygc291cmNlIGZpbGVzIG11c3QgYmUgcGFzc2VkIHdpdGggYW55IG5ldyBIb3dsLlwiKX07aS5wcm90b3R5cGU9e2luaXQ6ZnVuY3Rpb24oZSl7dmFyIHQ9dGhpcztyZXR1cm4gdC5fYXV0b3BsYXk9ZS5hdXRvcGxheXx8ITEsdC5fZm9ybWF0PVwic3RyaW5nXCIhPXR5cGVvZiBlLmZvcm1hdD9lLmZvcm1hdDpbZS5mb3JtYXRdLHQuX2h0bWw1PWUuaHRtbDV8fCExLHQuX211dGVkPWUubXV0ZXx8ITEsdC5fbG9vcD1lLmxvb3B8fCExLHQuX3Bvb2w9ZS5wb29sfHw1LHQuX3ByZWxvYWQ9XCJib29sZWFuXCI9PXR5cGVvZiBlLnByZWxvYWQ/ZS5wcmVsb2FkOiEwLHQuX3JhdGU9ZS5yYXRlfHwxLHQuX3Nwcml0ZT1lLnNwcml0ZXx8e30sdC5fc3JjPVwic3RyaW5nXCIhPXR5cGVvZiBlLnNyYz9lLnNyYzpbZS5zcmNdLHQuX3ZvbHVtZT12b2lkIDAhPT1lLnZvbHVtZT9lLnZvbHVtZToxLHQuX2R1cmF0aW9uPTAsdC5fbG9hZGVkPSExLHQuX3NvdW5kcz1bXSx0Ll9lbmRUaW1lcnM9e30sdC5fcXVldWU9W10sdC5fb25lbmQ9ZS5vbmVuZD9be2ZuOmUub25lbmR9XTpbXSx0Ll9vbmZhZGU9ZS5vbmZhZGU/W3tmbjplLm9uZmFkZX1dOltdLHQuX29ubG9hZD1lLm9ubG9hZD9be2ZuOmUub25sb2FkfV06W10sdC5fb25sb2FkZXJyb3I9ZS5vbmxvYWRlcnJvcj9be2ZuOmUub25sb2FkZXJyb3J9XTpbXSx0Ll9vbnBhdXNlPWUub25wYXVzZT9be2ZuOmUub25wYXVzZX1dOltdLHQuX29ucGxheT1lLm9ucGxheT9be2ZuOmUub25wbGF5fV06W10sdC5fb25zdG9wPWUub25zdG9wP1t7Zm46ZS5vbnN0b3B9XTpbXSx0Ll9vbm11dGU9ZS5vbm11dGU/W3tmbjplLm9ubXV0ZX1dOltdLHQuX29udm9sdW1lPWUub252b2x1bWU/W3tmbjplLm9udm9sdW1lfV06W10sdC5fb25yYXRlPWUub25yYXRlP1t7Zm46ZS5vbnJhdGV9XTpbXSx0Ll9vbnNlZWs9ZS5vbnNlZWs/W3tmbjplLm9uc2Vla31dOltdLHQuX3dlYkF1ZGlvPW8mJiF0Ll9odG1sNSxcInVuZGVmaW5lZFwiIT10eXBlb2YgbiYmbiYmYS5tb2JpbGVBdXRvRW5hYmxlJiZhLl9lbmFibGVNb2JpbGVBdWRpbygpLGEuX2hvd2xzLnB1c2godCksdC5fcHJlbG9hZCYmdC5sb2FkKCksdH0sbG9hZDpmdW5jdGlvbigpe3ZhciBlPXRoaXMsbj1udWxsO2lmKHQpcmV0dXJuIHZvaWQgZS5fZW1pdChcImxvYWRlcnJvclwiLG51bGwsXCJObyBhdWRpbyBzdXBwb3J0LlwiKTtcInN0cmluZ1wiPT10eXBlb2YgZS5fc3JjJiYoZS5fc3JjPVtlLl9zcmNdKTtmb3IodmFyIG89MDtvPGUuX3NyYy5sZW5ndGg7bysrKXt2YXIgcix1O2lmKGUuX2Zvcm1hdCYmZS5fZm9ybWF0W29dP3I9ZS5fZm9ybWF0W29dOih1PWUuX3NyY1tvXSxyPS9eZGF0YTphdWRpb1xcLyhbXjssXSspOy9pLmV4ZWModSkscnx8KHI9L1xcLihbXi5dKykkLy5leGVjKHUuc3BsaXQoXCI/XCIsMSlbMF0pKSxyJiYocj1yWzFdLnRvTG93ZXJDYXNlKCkpKSxhLmNvZGVjcyhyKSl7bj1lLl9zcmNbb107YnJlYWt9fXJldHVybiBuPyhlLl9zcmM9bixcImh0dHBzOlwiPT09d2luZG93LmxvY2F0aW9uLnByb3RvY29sJiZcImh0dHA6XCI9PT1uLnNsaWNlKDAsNSkmJihlLl9odG1sNT0hMCxlLl93ZWJBdWRpbz0hMSksbmV3IF8oZSksZS5fd2ViQXVkaW8mJmwoZSksZSk6dm9pZCBlLl9lbWl0KFwibG9hZGVycm9yXCIsbnVsbCxcIk5vIGNvZGVjIHN1cHBvcnQgZm9yIHNlbGVjdGVkIGF1ZGlvIHNvdXJjZXMuXCIpfSxwbGF5OmZ1bmN0aW9uKGUpe3ZhciBvPXRoaXMsdD1hcmd1bWVudHMscj1udWxsO2lmKFwibnVtYmVyXCI9PXR5cGVvZiBlKXI9ZSxlPW51bGw7ZWxzZSBpZihcInVuZGVmaW5lZFwiPT10eXBlb2YgZSl7ZT1cIl9fZGVmYXVsdFwiO2Zvcih2YXIgZD0wLGk9MDtpPG8uX3NvdW5kcy5sZW5ndGg7aSsrKW8uX3NvdW5kc1tpXS5fcGF1c2VkJiYhby5fc291bmRzW2ldLl9lbmRlZCYmKGQrKyxyPW8uX3NvdW5kc1tpXS5faWQpOzE9PT1kP2U9bnVsbDpyPW51bGx9dmFyIF89cj9vLl9zb3VuZEJ5SWQocik6by5faW5hY3RpdmVTb3VuZCgpO2lmKCFfKXJldHVybiBudWxsO2lmKHImJiFlJiYoZT1fLl9zcHJpdGV8fFwiX19kZWZhdWx0XCIpLCFvLl9sb2FkZWQmJiFvLl9zcHJpdGVbZV0pcmV0dXJuIG8uX3F1ZXVlLnB1c2goe2V2ZW50OlwicGxheVwiLGFjdGlvbjpmdW5jdGlvbigpe28ucGxheShvLl9zb3VuZEJ5SWQoXy5faWQpP18uX2lkOnZvaWQgMCl9fSksXy5faWQ7aWYociYmIV8uX3BhdXNlZClyZXR1cm4gXy5faWQ7by5fd2ViQXVkaW8mJmEuX2F1dG9SZXN1bWUoKTt2YXIgcz1fLl9zZWVrPjA/Xy5fc2VlazpvLl9zcHJpdGVbZV1bMF0vMWUzLGw9KG8uX3Nwcml0ZVtlXVswXStvLl9zcHJpdGVbZV1bMV0pLzFlMy1zLGY9MWUzKmwvTWF0aC5hYnMoXy5fcmF0ZSk7ZiE9PTEvMCYmKG8uX2VuZFRpbWVyc1tfLl9pZF09c2V0VGltZW91dChvLl9lbmRlZC5iaW5kKG8sXyksZikpLF8uX3BhdXNlZD0hMSxfLl9lbmRlZD0hMSxfLl9zcHJpdGU9ZSxfLl9zZWVrPXMsXy5fc3RhcnQ9by5fc3ByaXRlW2VdWzBdLzFlMyxfLl9zdG9wPShvLl9zcHJpdGVbZV1bMF0rby5fc3ByaXRlW2VdWzFdKS8xZTMsXy5fbG9vcD0hKCFfLl9sb29wJiYhby5fc3ByaXRlW2VdWzJdKTt2YXIgYz1fLl9ub2RlO2lmKG8uX3dlYkF1ZGlvKXt2YXIgcD1mdW5jdGlvbigpe28uX3JlZnJlc2hCdWZmZXIoXyk7dmFyIGU9Xy5fbXV0ZWR8fG8uX211dGVkPzA6Xy5fdm9sdW1lKmEudm9sdW1lKCk7Yy5nYWluLnNldFZhbHVlQXRUaW1lKGUsbi5jdXJyZW50VGltZSksXy5fcGxheVN0YXJ0PW4uY3VycmVudFRpbWUsXCJ1bmRlZmluZWRcIj09dHlwZW9mIGMuYnVmZmVyU291cmNlLnN0YXJ0P18uX2xvb3A/Yy5idWZmZXJTb3VyY2Uubm90ZUdyYWluT24oMCxzLDg2NDAwKTpjLmJ1ZmZlclNvdXJjZS5ub3RlR3JhaW5PbigwLHMsbCk6Xy5fbG9vcD9jLmJ1ZmZlclNvdXJjZS5zdGFydCgwLHMsODY0MDApOmMuYnVmZmVyU291cmNlLnN0YXJ0KDAscyxsKSxvLl9lbmRUaW1lcnNbXy5faWRdfHxmPT09MS8wfHwoby5fZW5kVGltZXJzW18uX2lkXT1zZXRUaW1lb3V0KG8uX2VuZGVkLmJpbmQobyxfKSxmKSksdFsxXXx8c2V0VGltZW91dChmdW5jdGlvbigpe28uX2VtaXQoXCJwbGF5XCIsXy5faWQpfSwwKX07by5fbG9hZGVkP3AoKTooby5vbmNlKFwibG9hZFwiLHAsXy5faWQpLG8uX2NsZWFyVGltZXIoXy5faWQpKX1lbHNle3ZhciBtPWZ1bmN0aW9uKCl7Yy5jdXJyZW50VGltZT1zLGMubXV0ZWQ9Xy5fbXV0ZWR8fG8uX211dGVkfHxhLl9tdXRlZHx8Yy5tdXRlZCxjLnZvbHVtZT1fLl92b2x1bWUqYS52b2x1bWUoKSxjLnBsYXliYWNrUmF0ZT1fLl9yYXRlLHNldFRpbWVvdXQoZnVuY3Rpb24oKXtjLnBsYXkoKSx0WzFdfHxvLl9lbWl0KFwicGxheVwiLF8uX2lkKX0sMCl9O2lmKDQ9PT1jLnJlYWR5U3RhdGV8fCFjLnJlYWR5U3RhdGUmJm5hdmlnYXRvci5pc0NvY29vbkpTKW0oKTtlbHNle3ZhciB2PWZ1bmN0aW9uKCl7ZiE9PTEvMCYmKG8uX2VuZFRpbWVyc1tfLl9pZF09c2V0VGltZW91dChvLl9lbmRlZC5iaW5kKG8sXyksZikpLG0oKSxjLnJlbW92ZUV2ZW50TGlzdGVuZXIodSx2LCExKX07Yy5hZGRFdmVudExpc3RlbmVyKHUsdiwhMSksby5fY2xlYXJUaW1lcihfLl9pZCl9fXJldHVybiBfLl9pZH0scGF1c2U6ZnVuY3Rpb24oZSl7dmFyIG49dGhpcztpZighbi5fbG9hZGVkKXJldHVybiBuLl9xdWV1ZS5wdXNoKHtldmVudDpcInBhdXNlXCIsYWN0aW9uOmZ1bmN0aW9uKCl7bi5wYXVzZShlKX19KSxuO2Zvcih2YXIgbz1uLl9nZXRTb3VuZElkcyhlKSx0PTA7dDxvLmxlbmd0aDt0Kyspe24uX2NsZWFyVGltZXIob1t0XSk7dmFyIHI9bi5fc291bmRCeUlkKG9bdF0pO2lmKHImJiFyLl9wYXVzZWQpe2lmKHIuX3NlZWs9bi5zZWVrKG9bdF0pLHIuX3BhdXNlZD0hMCxuLl9zdG9wRmFkZShvW3RdKSxyLl9ub2RlKWlmKG4uX3dlYkF1ZGlvKXtpZighci5fbm9kZS5idWZmZXJTb3VyY2UpcmV0dXJuIG47XCJ1bmRlZmluZWRcIj09dHlwZW9mIHIuX25vZGUuYnVmZmVyU291cmNlLnN0b3A/ci5fbm9kZS5idWZmZXJTb3VyY2Uubm90ZU9mZigwKTpyLl9ub2RlLmJ1ZmZlclNvdXJjZS5zdG9wKDApLHIuX25vZGUuYnVmZmVyU291cmNlPW51bGx9ZWxzZSBpc05hTihyLl9ub2RlLmR1cmF0aW9uKSYmci5fbm9kZS5kdXJhdGlvbiE9PTEvMHx8ci5fbm9kZS5wYXVzZSgpO2FyZ3VtZW50c1sxXXx8bi5fZW1pdChcInBhdXNlXCIsci5faWQpfX1yZXR1cm4gbn0sc3RvcDpmdW5jdGlvbihlKXt2YXIgbj10aGlzO2lmKCFuLl9sb2FkZWQpcmV0dXJuXCJ1bmRlZmluZWRcIiE9dHlwZW9mIG4uX3NvdW5kc1swXS5fc3ByaXRlJiZuLl9xdWV1ZS5wdXNoKHtldmVudDpcInN0b3BcIixhY3Rpb246ZnVuY3Rpb24oKXtuLnN0b3AoZSl9fSksbjtmb3IodmFyIG89bi5fZ2V0U291bmRJZHMoZSksdD0wO3Q8by5sZW5ndGg7dCsrKXtuLl9jbGVhclRpbWVyKG9bdF0pO3ZhciByPW4uX3NvdW5kQnlJZChvW3RdKTtpZihyJiYhci5fcGF1c2VkKXtpZihyLl9zZWVrPXIuX3N0YXJ0fHwwLHIuX3BhdXNlZD0hMCxyLl9lbmRlZD0hMCxuLl9zdG9wRmFkZShvW3RdKSxyLl9ub2RlKWlmKG4uX3dlYkF1ZGlvKXtpZighci5fbm9kZS5idWZmZXJTb3VyY2UpcmV0dXJuIG47XCJ1bmRlZmluZWRcIj09dHlwZW9mIHIuX25vZGUuYnVmZmVyU291cmNlLnN0b3A/ci5fbm9kZS5idWZmZXJTb3VyY2Uubm90ZU9mZigwKTpyLl9ub2RlLmJ1ZmZlclNvdXJjZS5zdG9wKDApLHIuX25vZGUuYnVmZmVyU291cmNlPW51bGx9ZWxzZSBpc05hTihyLl9ub2RlLmR1cmF0aW9uKSYmci5fbm9kZS5kdXJhdGlvbiE9PTEvMHx8KHIuX25vZGUucGF1c2UoKSxyLl9ub2RlLmN1cnJlbnRUaW1lPXIuX3N0YXJ0fHwwKTtuLl9lbWl0KFwic3RvcFwiLHIuX2lkKX19cmV0dXJuIG59LG11dGU6ZnVuY3Rpb24oZSxvKXt2YXIgdD10aGlzO2lmKCF0Ll9sb2FkZWQpcmV0dXJuIHQuX3F1ZXVlLnB1c2goe2V2ZW50OlwibXV0ZVwiLGFjdGlvbjpmdW5jdGlvbigpe3QubXV0ZShlLG8pfX0pLHQ7aWYoXCJ1bmRlZmluZWRcIj09dHlwZW9mIG8pe2lmKFwiYm9vbGVhblwiIT10eXBlb2YgZSlyZXR1cm4gdC5fbXV0ZWQ7dC5fbXV0ZWQ9ZX1mb3IodmFyIHI9dC5fZ2V0U291bmRJZHMobyksdT0wO3U8ci5sZW5ndGg7dSsrKXt2YXIgZD10Ll9zb3VuZEJ5SWQoclt1XSk7ZCYmKGQuX211dGVkPWUsdC5fd2ViQXVkaW8mJmQuX25vZGU/ZC5fbm9kZS5nYWluLnNldFZhbHVlQXRUaW1lKGU/MDpkLl92b2x1bWUqYS52b2x1bWUoKSxuLmN1cnJlbnRUaW1lKTpkLl9ub2RlJiYoZC5fbm9kZS5tdXRlZD1hLl9tdXRlZD8hMDplKSx0Ll9lbWl0KFwibXV0ZVwiLGQuX2lkKSl9cmV0dXJuIHR9LHZvbHVtZTpmdW5jdGlvbigpe3ZhciBlLG8sdD10aGlzLHI9YXJndW1lbnRzO2lmKDA9PT1yLmxlbmd0aClyZXR1cm4gdC5fdm9sdW1lO2lmKDE9PT1yLmxlbmd0aCl7dmFyIHU9dC5fZ2V0U291bmRJZHMoKSxkPXUuaW5kZXhPZihyWzBdKTtkPj0wP289cGFyc2VJbnQoclswXSwxMCk6ZT1wYXJzZUZsb2F0KHJbMF0pfWVsc2Ugci5sZW5ndGg+PTImJihlPXBhcnNlRmxvYXQoclswXSksbz1wYXJzZUludChyWzFdLDEwKSk7dmFyIGk7aWYoIShcInVuZGVmaW5lZFwiIT10eXBlb2YgZSYmZT49MCYmMT49ZSkpcmV0dXJuIGk9bz90Ll9zb3VuZEJ5SWQobyk6dC5fc291bmRzWzBdLGk/aS5fdm9sdW1lOjA7aWYoIXQuX2xvYWRlZClyZXR1cm4gdC5fcXVldWUucHVzaCh7ZXZlbnQ6XCJ2b2x1bWVcIixhY3Rpb246ZnVuY3Rpb24oKXt0LnZvbHVtZS5hcHBseSh0LHIpfX0pLHQ7XCJ1bmRlZmluZWRcIj09dHlwZW9mIG8mJih0Ll92b2x1bWU9ZSksbz10Ll9nZXRTb3VuZElkcyhvKTtmb3IodmFyIF89MDtfPG8ubGVuZ3RoO18rKylpPXQuX3NvdW5kQnlJZChvW19dKSxpJiYoaS5fdm9sdW1lPWUsclsyXXx8dC5fc3RvcEZhZGUob1tfXSksdC5fd2ViQXVkaW8mJmkuX25vZGUmJiFpLl9tdXRlZD9pLl9ub2RlLmdhaW4uc2V0VmFsdWVBdFRpbWUoZSphLnZvbHVtZSgpLG4uY3VycmVudFRpbWUpOmkuX25vZGUmJiFpLl9tdXRlZCYmKGkuX25vZGUudm9sdW1lPWUqYS52b2x1bWUoKSksdC5fZW1pdChcInZvbHVtZVwiLGkuX2lkKSk7cmV0dXJuIHR9LGZhZGU6ZnVuY3Rpb24oZSxvLHQscil7dmFyIHU9dGhpcztpZighdS5fbG9hZGVkKXJldHVybiB1Ll9xdWV1ZS5wdXNoKHtldmVudDpcImZhZGVcIixhY3Rpb246ZnVuY3Rpb24oKXt1LmZhZGUoZSxvLHQscil9fSksdTt1LnZvbHVtZShlLHIpO2Zvcih2YXIgZD11Ll9nZXRTb3VuZElkcyhyKSxhPTA7YTxkLmxlbmd0aDthKyspe3ZhciBpPXUuX3NvdW5kQnlJZChkW2FdKTtpZihpKWlmKHJ8fHUuX3N0b3BGYWRlKGRbYV0pLHUuX3dlYkF1ZGlvJiYhaS5fbXV0ZWQpe3ZhciBfPW4uY3VycmVudFRpbWUscz1fK3QvMWUzO2kuX3ZvbHVtZT1lLGkuX25vZGUuZ2Fpbi5zZXRWYWx1ZUF0VGltZShlLF8pLGkuX25vZGUuZ2Fpbi5saW5lYXJSYW1wVG9WYWx1ZUF0VGltZShvLHMpLGkuX3RpbWVvdXQ9c2V0VGltZW91dChmdW5jdGlvbihlLHQpe2RlbGV0ZSB0Ll90aW1lb3V0LHNldFRpbWVvdXQoZnVuY3Rpb24oKXt0Ll92b2x1bWU9byx1Ll9lbWl0KFwiZmFkZVwiLGUpfSxzLW4uY3VycmVudFRpbWU+MD9NYXRoLmNlaWwoMWUzKihzLW4uY3VycmVudFRpbWUpKTowKX0uYmluZCh1LGRbYV0saSksdCl9ZWxzZXt2YXIgbD1NYXRoLmFicyhlLW8pLGY9ZT5vP1wib3V0XCI6XCJpblwiLGM9bC8uMDEscD10L2M7IWZ1bmN0aW9uKCl7dmFyIG49ZTtpLl9pbnRlcnZhbD1zZXRJbnRlcnZhbChmdW5jdGlvbihlLHQpe24rPVwiaW5cIj09PWY/LjAxOi0uMDEsbj1NYXRoLm1heCgwLG4pLG49TWF0aC5taW4oMSxuKSxuPU1hdGgucm91bmQoMTAwKm4pLzEwMCx1LnZvbHVtZShuLGUsITApLG49PT1vJiYoY2xlYXJJbnRlcnZhbCh0Ll9pbnRlcnZhbCksZGVsZXRlIHQuX2ludGVydmFsLHUuX2VtaXQoXCJmYWRlXCIsZSkpfS5iaW5kKHUsZFthXSxpKSxwKX0oKX19cmV0dXJuIHV9LF9zdG9wRmFkZTpmdW5jdGlvbihlKXt2YXIgbz10aGlzLHQ9by5fc291bmRCeUlkKGUpO3JldHVybiB0Ll9pbnRlcnZhbD8oY2xlYXJJbnRlcnZhbCh0Ll9pbnRlcnZhbCksZGVsZXRlIHQuX2ludGVydmFsLG8uX2VtaXQoXCJmYWRlXCIsZSkpOnQuX3RpbWVvdXQmJihjbGVhclRpbWVvdXQodC5fdGltZW91dCksZGVsZXRlIHQuX3RpbWVvdXQsdC5fbm9kZS5nYWluLmNhbmNlbFNjaGVkdWxlZFZhbHVlcyhuLmN1cnJlbnRUaW1lKSxvLl9lbWl0KFwiZmFkZVwiLGUpKSxvfSxsb29wOmZ1bmN0aW9uKCl7dmFyIGUsbixvLHQ9dGhpcyxyPWFyZ3VtZW50cztpZigwPT09ci5sZW5ndGgpcmV0dXJuIHQuX2xvb3A7aWYoMT09PXIubGVuZ3RoKXtpZihcImJvb2xlYW5cIiE9dHlwZW9mIHJbMF0pcmV0dXJuIG89dC5fc291bmRCeUlkKHBhcnNlSW50KHJbMF0sMTApKSxvP28uX2xvb3A6ITE7ZT1yWzBdLHQuX2xvb3A9ZX1lbHNlIDI9PT1yLmxlbmd0aCYmKGU9clswXSxuPXBhcnNlSW50KHJbMV0sMTApKTtmb3IodmFyIHU9dC5fZ2V0U291bmRJZHMobiksZD0wO2Q8dS5sZW5ndGg7ZCsrKW89dC5fc291bmRCeUlkKHVbZF0pLG8mJihvLl9sb29wPWUsdC5fd2ViQXVkaW8mJm8uX25vZGUmJm8uX25vZGUuYnVmZmVyU291cmNlJiYoby5fbm9kZS5idWZmZXJTb3VyY2UubG9vcD1lKSk7cmV0dXJuIHR9LHJhdGU6ZnVuY3Rpb24oKXt2YXIgZSxuLG89dGhpcyx0PWFyZ3VtZW50cztpZigwPT09dC5sZW5ndGgpbj1vLl9zb3VuZHNbMF0uX2lkO2Vsc2UgaWYoMT09PXQubGVuZ3RoKXt2YXIgcj1vLl9nZXRTb3VuZElkcygpLHU9ci5pbmRleE9mKHRbMF0pO3U+PTA/bj1wYXJzZUludCh0WzBdLDEwKTplPXBhcnNlRmxvYXQodFswXSl9ZWxzZSAyPT09dC5sZW5ndGgmJihlPXBhcnNlRmxvYXQodFswXSksbj1wYXJzZUludCh0WzFdLDEwKSk7dmFyIGQ7aWYoXCJudW1iZXJcIiE9dHlwZW9mIGUpcmV0dXJuIGQ9by5fc291bmRCeUlkKG4pLGQ/ZC5fcmF0ZTpvLl9yYXRlO2lmKCFvLl9sb2FkZWQpcmV0dXJuIG8uX3F1ZXVlLnB1c2goe2V2ZW50OlwicmF0ZVwiLGFjdGlvbjpmdW5jdGlvbigpe28ucmF0ZS5hcHBseShvLHQpfX0pLG87XCJ1bmRlZmluZWRcIj09dHlwZW9mIG4mJihvLl9yYXRlPWUpLG49by5fZ2V0U291bmRJZHMobik7Zm9yKHZhciBhPTA7YTxuLmxlbmd0aDthKyspaWYoZD1vLl9zb3VuZEJ5SWQoblthXSkpe2QuX3JhdGU9ZSxvLl93ZWJBdWRpbyYmZC5fbm9kZSYmZC5fbm9kZS5idWZmZXJTb3VyY2U/ZC5fbm9kZS5idWZmZXJTb3VyY2UucGxheWJhY2tSYXRlLnZhbHVlPWU6ZC5fbm9kZSYmKGQuX25vZGUucGxheWJhY2tSYXRlPWUpO3ZhciBpPW8uc2VlayhuW2FdKSxfPShvLl9zcHJpdGVbZC5fc3ByaXRlXVswXStvLl9zcHJpdGVbZC5fc3ByaXRlXVsxXSkvMWUzLWkscz0xZTMqXy9NYXRoLmFicyhkLl9yYXRlKTtvLl9jbGVhclRpbWVyKG5bYV0pLG8uX2VuZFRpbWVyc1tuW2FdXT1zZXRUaW1lb3V0KG8uX2VuZGVkLmJpbmQobyxkKSxzKSxvLl9lbWl0KFwicmF0ZVwiLGQuX2lkKX1yZXR1cm4gb30sc2VlazpmdW5jdGlvbigpe3ZhciBlLG8sdD10aGlzLHI9YXJndW1lbnRzO2lmKDA9PT1yLmxlbmd0aClvPXQuX3NvdW5kc1swXS5faWQ7ZWxzZSBpZigxPT09ci5sZW5ndGgpe3ZhciB1PXQuX2dldFNvdW5kSWRzKCksZD11LmluZGV4T2YoclswXSk7ZD49MD9vPXBhcnNlSW50KHJbMF0sMTApOihvPXQuX3NvdW5kc1swXS5faWQsZT1wYXJzZUZsb2F0KHJbMF0pKX1lbHNlIDI9PT1yLmxlbmd0aCYmKGU9cGFyc2VGbG9hdChyWzBdKSxvPXBhcnNlSW50KHJbMV0sMTApKTtpZihcInVuZGVmaW5lZFwiPT10eXBlb2YgbylyZXR1cm4gdDtpZighdC5fbG9hZGVkKXJldHVybiB0Ll9xdWV1ZS5wdXNoKHtldmVudDpcInNlZWtcIixhY3Rpb246ZnVuY3Rpb24oKXt0LnNlZWsuYXBwbHkodCxyKX19KSx0O3ZhciBhPXQuX3NvdW5kQnlJZChvKTtpZihhKXtpZighKGU+PTApKXJldHVybiB0Ll93ZWJBdWRpbz9hLl9zZWVrKyh0LnBsYXlpbmcobyk/bi5jdXJyZW50VGltZS1hLl9wbGF5U3RhcnQ6MCk6YS5fbm9kZS5jdXJyZW50VGltZTt2YXIgaT10LnBsYXlpbmcobyk7aSYmdC5wYXVzZShvLCEwKSxhLl9zZWVrPWUsdC5fY2xlYXJUaW1lcihvKSxpJiZ0LnBsYXkobywhMCksdC5fZW1pdChcInNlZWtcIixvKX1yZXR1cm4gdH0scGxheWluZzpmdW5jdGlvbihlKXt2YXIgbj10aGlzLG89bi5fc291bmRCeUlkKGUpfHxuLl9zb3VuZHNbMF07cmV0dXJuIG8/IW8uX3BhdXNlZDohMX0sZHVyYXRpb246ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5fZHVyYXRpb259LHVubG9hZDpmdW5jdGlvbigpe2Zvcih2YXIgZT10aGlzLG49ZS5fc291bmRzLG89MDtvPG4ubGVuZ3RoO28rKyl7bltvXS5fcGF1c2VkfHwoZS5zdG9wKG5bb10uX2lkKSxlLl9lbWl0KFwiZW5kXCIsbltvXS5faWQpKSxlLl93ZWJBdWRpb3x8KG5bb10uX25vZGUuc3JjPVwiXCIsbltvXS5fbm9kZS5yZW1vdmVFdmVudExpc3RlbmVyKFwiZXJyb3JcIixuW29dLl9lcnJvckZuLCExKSxuW29dLl9ub2RlLnJlbW92ZUV2ZW50TGlzdGVuZXIodSxuW29dLl9sb2FkRm4sITEpKSxkZWxldGUgbltvXS5fbm9kZSxlLl9jbGVhclRpbWVyKG5bb10uX2lkKTt2YXIgdD1hLl9ob3dscy5pbmRleE9mKGUpO3Q+PTAmJmEuX2hvd2xzLnNwbGljZSh0LDEpfXJldHVybiBzJiZkZWxldGUgc1tlLl9zcmNdLGUuX3NvdW5kcz1bXSxlPW51bGwsbnVsbH0sb246ZnVuY3Rpb24oZSxuLG8sdCl7dmFyIHI9dGhpcyx1PXJbXCJfb25cIitlXTtyZXR1cm5cImZ1bmN0aW9uXCI9PXR5cGVvZiBuJiZ1LnB1c2godD97aWQ6byxmbjpuLG9uY2U6dH06e2lkOm8sZm46bn0pLHJ9LG9mZjpmdW5jdGlvbihlLG4sbyl7dmFyIHQ9dGhpcyxyPXRbXCJfb25cIitlXTtpZihuKXtmb3IodmFyIHU9MDt1PHIubGVuZ3RoO3UrKylpZihuPT09clt1XS5mbiYmbz09PXJbdV0uaWQpe3Iuc3BsaWNlKHUsMSk7YnJlYWt9fWVsc2UgaWYoZSl0W1wiX29uXCIrZV09W107ZWxzZSBmb3IodmFyIGQ9T2JqZWN0LmtleXModCksdT0wO3U8ZC5sZW5ndGg7dSsrKTA9PT1kW3VdLmluZGV4T2YoXCJfb25cIikmJkFycmF5LmlzQXJyYXkodFtkW3VdXSkmJih0W2RbdV1dPVtdKTtyZXR1cm4gdH0sb25jZTpmdW5jdGlvbihlLG4sbyl7dmFyIHQ9dGhpcztyZXR1cm4gdC5vbihlLG4sbywxKSx0fSxfZW1pdDpmdW5jdGlvbihlLG4sbyl7Zm9yKHZhciB0PXRoaXMscj10W1wiX29uXCIrZV0sdT1yLmxlbmd0aC0xO3U+PTA7dS0tKXJbdV0uaWQmJnJbdV0uaWQhPT1uJiZcImxvYWRcIiE9PWV8fChzZXRUaW1lb3V0KGZ1bmN0aW9uKGUpe2UuY2FsbCh0aGlzLG4sbyl9LmJpbmQodCxyW3VdLmZuKSwwKSxyW3VdLm9uY2UmJnQub2ZmKGUsclt1XS5mbixyW3VdLmlkKSk7cmV0dXJuIHR9LF9sb2FkUXVldWU6ZnVuY3Rpb24oKXt2YXIgZT10aGlzO2lmKGUuX3F1ZXVlLmxlbmd0aD4wKXt2YXIgbj1lLl9xdWV1ZVswXTtlLm9uY2Uobi5ldmVudCxmdW5jdGlvbigpe2UuX3F1ZXVlLnNoaWZ0KCksZS5fbG9hZFF1ZXVlKCl9KSxuLmFjdGlvbigpfXJldHVybiBlfSxfZW5kZWQ6ZnVuY3Rpb24oZSl7dmFyIG89dGhpcyx0PWUuX3Nwcml0ZSxyPSEoIWUuX2xvb3AmJiFvLl9zcHJpdGVbdF1bMl0pO2lmKG8uX2VtaXQoXCJlbmRcIixlLl9pZCksIW8uX3dlYkF1ZGlvJiZyJiZvLnN0b3AoZS5faWQpLnBsYXkoZS5faWQpLG8uX3dlYkF1ZGlvJiZyKXtvLl9lbWl0KFwicGxheVwiLGUuX2lkKSxlLl9zZWVrPWUuX3N0YXJ0fHwwLGUuX3BsYXlTdGFydD1uLmN1cnJlbnRUaW1lO3ZhciB1PTFlMyooZS5fc3RvcC1lLl9zdGFydCkvTWF0aC5hYnMoZS5fcmF0ZSk7by5fZW5kVGltZXJzW2UuX2lkXT1zZXRUaW1lb3V0KG8uX2VuZGVkLmJpbmQobyxlKSx1KX1yZXR1cm4gby5fd2ViQXVkaW8mJiFyJiYoZS5fcGF1c2VkPSEwLGUuX2VuZGVkPSEwLGUuX3NlZWs9ZS5fc3RhcnR8fDAsby5fY2xlYXJUaW1lcihlLl9pZCksZS5fbm9kZS5idWZmZXJTb3VyY2U9bnVsbCxhLl9hdXRvU3VzcGVuZCgpKSxvLl93ZWJBdWRpb3x8cnx8by5zdG9wKGUuX2lkKSxvfSxfY2xlYXJUaW1lcjpmdW5jdGlvbihlKXt2YXIgbj10aGlzO3JldHVybiBuLl9lbmRUaW1lcnNbZV0mJihjbGVhclRpbWVvdXQobi5fZW5kVGltZXJzW2VdKSxkZWxldGUgbi5fZW5kVGltZXJzW2VdKSxufSxfc291bmRCeUlkOmZ1bmN0aW9uKGUpe2Zvcih2YXIgbj10aGlzLG89MDtvPG4uX3NvdW5kcy5sZW5ndGg7bysrKWlmKGU9PT1uLl9zb3VuZHNbb10uX2lkKXJldHVybiBuLl9zb3VuZHNbb107cmV0dXJuIG51bGx9LF9pbmFjdGl2ZVNvdW5kOmZ1bmN0aW9uKCl7dmFyIGU9dGhpcztlLl9kcmFpbigpO2Zvcih2YXIgbj0wO248ZS5fc291bmRzLmxlbmd0aDtuKyspaWYoZS5fc291bmRzW25dLl9lbmRlZClyZXR1cm4gZS5fc291bmRzW25dLnJlc2V0KCk7cmV0dXJuIG5ldyBfKGUpfSxfZHJhaW46ZnVuY3Rpb24oKXt2YXIgZT10aGlzLG49ZS5fcG9vbCxvPTAsdD0wO2lmKCEoZS5fc291bmRzLmxlbmd0aDxuKSl7Zm9yKHQ9MDt0PGUuX3NvdW5kcy5sZW5ndGg7dCsrKWUuX3NvdW5kc1t0XS5fZW5kZWQmJm8rKztmb3IodD1lLl9zb3VuZHMubGVuZ3RoLTE7dD49MDt0LS0pe2lmKG4+PW8pcmV0dXJuO2UuX3NvdW5kc1t0XS5fZW5kZWQmJihlLl93ZWJBdWRpbyYmZS5fc291bmRzW3RdLl9ub2RlJiZlLl9zb3VuZHNbdF0uX25vZGUuZGlzY29ubmVjdCgwKSxlLl9zb3VuZHMuc3BsaWNlKHQsMSksby0tKX19fSxfZ2V0U291bmRJZHM6ZnVuY3Rpb24oZSl7dmFyIG49dGhpcztpZihcInVuZGVmaW5lZFwiPT10eXBlb2YgZSl7Zm9yKHZhciBvPVtdLHQ9MDt0PG4uX3NvdW5kcy5sZW5ndGg7dCsrKW8ucHVzaChuLl9zb3VuZHNbdF0uX2lkKTtyZXR1cm4gb31yZXR1cm5bZV19LF9yZWZyZXNoQnVmZmVyOmZ1bmN0aW9uKGUpe3ZhciBvPXRoaXM7cmV0dXJuIGUuX25vZGUuYnVmZmVyU291cmNlPW4uY3JlYXRlQnVmZmVyU291cmNlKCksZS5fbm9kZS5idWZmZXJTb3VyY2UuYnVmZmVyPXNbby5fc3JjXSxlLl9ub2RlLmJ1ZmZlclNvdXJjZS5jb25uZWN0KGUuX3Bhbm5lcj9lLl9wYW5uZXI6ZS5fbm9kZSksZS5fbm9kZS5idWZmZXJTb3VyY2UubG9vcD1lLl9sb29wLGUuX2xvb3AmJihlLl9ub2RlLmJ1ZmZlclNvdXJjZS5sb29wU3RhcnQ9ZS5fc3RhcnR8fDAsZS5fbm9kZS5idWZmZXJTb3VyY2UubG9vcEVuZD1lLl9zdG9wKSxlLl9ub2RlLmJ1ZmZlclNvdXJjZS5wbGF5YmFja1JhdGUudmFsdWU9by5fcmF0ZSxvfX07dmFyIF89ZnVuY3Rpb24oZSl7dGhpcy5fcGFyZW50PWUsdGhpcy5pbml0KCl9O2lmKF8ucHJvdG90eXBlPXtpbml0OmZ1bmN0aW9uKCl7dmFyIGU9dGhpcyxuPWUuX3BhcmVudDtyZXR1cm4gZS5fbXV0ZWQ9bi5fbXV0ZWQsZS5fbG9vcD1uLl9sb29wLGUuX3ZvbHVtZT1uLl92b2x1bWUsZS5fbXV0ZWQ9bi5fbXV0ZWQsZS5fcmF0ZT1uLl9yYXRlLGUuX3NlZWs9MCxlLl9wYXVzZWQ9ITAsZS5fZW5kZWQ9ITAsZS5fc3ByaXRlPVwiX19kZWZhdWx0XCIsZS5faWQ9TWF0aC5yb3VuZChEYXRlLm5vdygpKk1hdGgucmFuZG9tKCkpLG4uX3NvdW5kcy5wdXNoKGUpLGUuY3JlYXRlKCksZX0sY3JlYXRlOmZ1bmN0aW9uKCl7dmFyIGU9dGhpcyxvPWUuX3BhcmVudCx0PWEuX211dGVkfHxlLl9tdXRlZHx8ZS5fcGFyZW50Ll9tdXRlZD8wOmUuX3ZvbHVtZSphLnZvbHVtZSgpO3JldHVybiBvLl93ZWJBdWRpbz8oZS5fbm9kZT1cInVuZGVmaW5lZFwiPT10eXBlb2Ygbi5jcmVhdGVHYWluP24uY3JlYXRlR2Fpbk5vZGUoKTpuLmNyZWF0ZUdhaW4oKSxlLl9ub2RlLmdhaW4uc2V0VmFsdWVBdFRpbWUodCxuLmN1cnJlbnRUaW1lKSxlLl9ub2RlLnBhdXNlZD0hMCxlLl9ub2RlLmNvbm5lY3QocikpOihlLl9ub2RlPW5ldyBBdWRpbyxlLl9lcnJvckZuPWUuX2Vycm9yTGlzdGVuZXIuYmluZChlKSxlLl9ub2RlLmFkZEV2ZW50TGlzdGVuZXIoXCJlcnJvclwiLGUuX2Vycm9yRm4sITEpLGUuX2xvYWRGbj1lLl9sb2FkTGlzdGVuZXIuYmluZChlKSxlLl9ub2RlLmFkZEV2ZW50TGlzdGVuZXIodSxlLl9sb2FkRm4sITEpLGUuX25vZGUuc3JjPW8uX3NyYyxlLl9ub2RlLnByZWxvYWQ9XCJhdXRvXCIsZS5fbm9kZS52b2x1bWU9dCxlLl9ub2RlLmxvYWQoKSksZX0scmVzZXQ6ZnVuY3Rpb24oKXt2YXIgZT10aGlzLG49ZS5fcGFyZW50O3JldHVybiBlLl9tdXRlZD1uLl9tdXRlZCxlLl9sb29wPW4uX2xvb3AsZS5fdm9sdW1lPW4uX3ZvbHVtZSxlLl9tdXRlZD1uLl9tdXRlZCxlLl9yYXRlPW4uX3JhdGUsZS5fc2Vlaz0wLGUuX3BhdXNlZD0hMCxlLl9lbmRlZD0hMCxlLl9zcHJpdGU9XCJfX2RlZmF1bHRcIixlLl9pZD1NYXRoLnJvdW5kKERhdGUubm93KCkqTWF0aC5yYW5kb20oKSksZX0sX2Vycm9yTGlzdGVuZXI6ZnVuY3Rpb24oKXt2YXIgZT10aGlzO2UuX25vZGUuZXJyb3ImJjQ9PT1lLl9ub2RlLmVycm9yLmNvZGUmJihhLm5vQXVkaW89ITApLGUuX3BhcmVudC5fZW1pdChcImxvYWRlcnJvclwiLGUuX2lkLGUuX25vZGUuZXJyb3I/ZS5fbm9kZS5lcnJvci5jb2RlOjApLGUuX25vZGUucmVtb3ZlRXZlbnRMaXN0ZW5lcihcImVycm9yXCIsZS5fZXJyb3JMaXN0ZW5lciwhMSl9LF9sb2FkTGlzdGVuZXI6ZnVuY3Rpb24oKXt2YXIgZT10aGlzLG49ZS5fcGFyZW50O24uX2R1cmF0aW9uPU1hdGguY2VpbCgxMCplLl9ub2RlLmR1cmF0aW9uKS8xMCwwPT09T2JqZWN0LmtleXMobi5fc3ByaXRlKS5sZW5ndGgmJihuLl9zcHJpdGU9e19fZGVmYXVsdDpbMCwxZTMqbi5fZHVyYXRpb25dfSksbi5fbG9hZGVkfHwobi5fbG9hZGVkPSEwLG4uX2VtaXQoXCJsb2FkXCIpLG4uX2xvYWRRdWV1ZSgpKSxuLl9hdXRvcGxheSYmbi5wbGF5KCksZS5fbm9kZS5yZW1vdmVFdmVudExpc3RlbmVyKHUsZS5fbG9hZEZuLCExKX19LG8pdmFyIHM9e30sbD1mdW5jdGlvbihlKXt2YXIgbj1lLl9zcmM7aWYoc1tuXSlyZXR1cm4gZS5fZHVyYXRpb249c1tuXS5kdXJhdGlvbix2b2lkIHAoZSk7aWYoL15kYXRhOlteO10rO2Jhc2U2NCwvLnRlc3Qobikpe3dpbmRvdy5hdG9iPXdpbmRvdy5hdG9ifHxmdW5jdGlvbihlKXtmb3IodmFyIG4sbyx0PVwiQUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVphYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5ejAxMjM0NTY3ODkrLz1cIixyPVN0cmluZyhlKS5yZXBsYWNlKC89KyQvLFwiXCIpLHU9MCxkPTAsYT1cIlwiO289ci5jaGFyQXQoZCsrKTt+byYmKG49dSU0PzY0Km4rbzpvLHUrKyU0KT9hKz1TdHJpbmcuZnJvbUNoYXJDb2RlKDI1NSZuPj4oLTIqdSY2KSk6MClvPXQuaW5kZXhPZihvKTtyZXR1cm4gYX07Zm9yKHZhciBvPWF0b2Iobi5zcGxpdChcIixcIilbMV0pLHQ9bmV3IFVpbnQ4QXJyYXkoby5sZW5ndGgpLHI9MDtyPG8ubGVuZ3RoOysrcil0W3JdPW8uY2hhckNvZGVBdChyKTtjKHQuYnVmZmVyLGUpfWVsc2V7dmFyIHU9bmV3IFhNTEh0dHBSZXF1ZXN0O3Uub3BlbihcIkdFVFwiLG4sITApLHUucmVzcG9uc2VUeXBlPVwiYXJyYXlidWZmZXJcIix1Lm9ubG9hZD1mdW5jdGlvbigpe2ModS5yZXNwb25zZSxlKX0sdS5vbmVycm9yPWZ1bmN0aW9uKCl7ZS5fd2ViQXVkaW8mJihlLl9odG1sNT0hMCxlLl93ZWJBdWRpbz0hMSxlLl9zb3VuZHM9W10sZGVsZXRlIHNbbl0sZS5sb2FkKCkpfSxmKHUpfX0sZj1mdW5jdGlvbihlKXt0cnl7ZS5zZW5kKCl9Y2F0Y2gobil7ZS5vbmVycm9yKCl9fSxjPWZ1bmN0aW9uKGUsbyl7bi5kZWNvZGVBdWRpb0RhdGEoZSxmdW5jdGlvbihlKXtlJiZvLl9zb3VuZHMubGVuZ3RoPjAmJihzW28uX3NyY109ZSxwKG8sZSkpfSxmdW5jdGlvbigpe28uX2VtaXQoXCJsb2FkZXJyb3JcIixudWxsLFwiRGVjb2RpbmcgYXVkaW8gZGF0YSBmYWlsZWQuXCIpfSl9LHA9ZnVuY3Rpb24oZSxuKXtuJiYhZS5fZHVyYXRpb24mJihlLl9kdXJhdGlvbj1uLmR1cmF0aW9uKSwwPT09T2JqZWN0LmtleXMoZS5fc3ByaXRlKS5sZW5ndGgmJihlLl9zcHJpdGU9e19fZGVmYXVsdDpbMCwxZTMqZS5fZHVyYXRpb25dfSksZS5fbG9hZGVkfHwoZS5fbG9hZGVkPSEwLGUuX2VtaXQoXCJsb2FkXCIpLGUuX2xvYWRRdWV1ZSgpKSxlLl9hdXRvcGxheSYmZS5wbGF5KCl9O1wiZnVuY3Rpb25cIj09dHlwZW9mIGRlZmluZSYmZGVmaW5lLmFtZCYmZGVmaW5lKFtdLGZ1bmN0aW9uKCl7cmV0dXJue0hvd2xlcjphLEhvd2w6aX19KSxcInVuZGVmaW5lZFwiIT10eXBlb2YgZXhwb3J0cyYmKGV4cG9ydHMuSG93bGVyPWEsZXhwb3J0cy5Ib3dsPWkpLFwidW5kZWZpbmVkXCIhPXR5cGVvZiB3aW5kb3c/KHdpbmRvdy5Ib3dsZXJHbG9iYWw9ZCx3aW5kb3cuSG93bGVyPWEsd2luZG93Lkhvd2w9aSx3aW5kb3cuU291bmQ9Xyk6XCJ1bmRlZmluZWRcIiE9dHlwZW9mIGdsb2JhbCYmKGdsb2JhbC5Ib3dsZXJHbG9iYWw9ZCxnbG9iYWwuSG93bGVyPWEsZ2xvYmFsLkhvd2w9aSxnbG9iYWwuU291bmQ9Xyl9KCk7XG4vKiEgRWZmZWN0cyBQbHVnaW4gKi9cbiFmdW5jdGlvbigpe1widXNlIHN0cmljdFwiO0hvd2xlckdsb2JhbC5wcm90b3R5cGUuX3Bvcz1bMCwwLDBdLEhvd2xlckdsb2JhbC5wcm90b3R5cGUuX29yaWVudGF0aW9uPVswLDAsLTEsMCwxLDBdLEhvd2xlckdsb2JhbC5wcm90b3R5cGUuX3ZlbG9jaXR5PVswLDAsMF0sSG93bGVyR2xvYmFsLnByb3RvdHlwZS5fbGlzdGVuZXJBdHRyPXtkb3BwbGVyRmFjdG9yOjEsc3BlZWRPZlNvdW5kOjM0My4zfSxIb3dsZXJHbG9iYWwucHJvdG90eXBlLnBvcz1mdW5jdGlvbihlLG4sdCl7dmFyIG89dGhpcztyZXR1cm4gby5jdHgmJm8uY3R4Lmxpc3RlbmVyPyhuPVwibnVtYmVyXCIhPXR5cGVvZiBuP28uX3Bvc1sxXTpuLHQ9XCJudW1iZXJcIiE9dHlwZW9mIHQ/by5fcG9zWzJdOnQsXCJudW1iZXJcIiE9dHlwZW9mIGU/by5fcG9zOihvLl9wb3M9W2Usbix0XSxvLmN0eC5saXN0ZW5lci5zZXRQb3NpdGlvbihvLl9wb3NbMF0sby5fcG9zWzFdLG8uX3Bvc1syXSksbykpOm99LEhvd2xlckdsb2JhbC5wcm90b3R5cGUub3JpZW50YXRpb249ZnVuY3Rpb24oZSxuLHQsbyxyLGkpe3ZhciBhPXRoaXM7aWYoIWEuY3R4fHwhYS5jdHgubGlzdGVuZXIpcmV0dXJuIGE7dmFyIHA9YS5fb3JpZW50YXRpb247cmV0dXJuIG49XCJudW1iZXJcIiE9dHlwZW9mIG4/cFsxXTpuLHQ9XCJudW1iZXJcIiE9dHlwZW9mIHQ/cFsyXTp0LG89XCJudW1iZXJcIiE9dHlwZW9mIG8/cFszXTpvLHI9XCJudW1iZXJcIiE9dHlwZW9mIHI/cFs0XTpyLGk9XCJudW1iZXJcIiE9dHlwZW9mIGk/cFs1XTppLFwibnVtYmVyXCIhPXR5cGVvZiBlP3A6KGEuX29yaWVudGF0aW9uPVtlLG4sdCxvLHIsaV0sYS5jdHgubGlzdGVuZXIuc2V0T3JpZW50YXRpb24oZSxuLHQsbyxyLGkpLGEpfSxIb3dsZXJHbG9iYWwucHJvdG90eXBlLnZlbG9jaXR5PWZ1bmN0aW9uKGUsbix0KXt2YXIgbz10aGlzO3JldHVybiBvLmN0eCYmby5jdHgubGlzdGVuZXI/KG49XCJudW1iZXJcIiE9dHlwZW9mIG4/by5fdmVsb2NpdHlbMV06bix0PVwibnVtYmVyXCIhPXR5cGVvZiB0P28uX3ZlbG9jaXR5WzJdOnQsXCJudW1iZXJcIiE9dHlwZW9mIGU/by5fdmVsb2NpdHk6KG8uX3ZlbG9jaXR5PVtlLG4sdF0sby5jdHgubGlzdGVuZXIuc2V0VmVsb2NpdHkoby5fdmVsb2NpdHlbMF0sby5fdmVsb2NpdHlbMV0sby5fdmVsb2NpdHlbMl0pLG8pKTpvfSxIb3dsZXJHbG9iYWwucHJvdG90eXBlLmxpc3RlbmVyQXR0cj1mdW5jdGlvbihlKXt2YXIgbj10aGlzO2lmKCFuLmN0eHx8IW4uY3R4Lmxpc3RlbmVyKXJldHVybiBuO3ZhciB0PW4uX2xpc3RlbmVyQXR0cjtyZXR1cm4gZT8obi5fbGlzdGVuZXJBdHRyPXtkb3BwbGVyRmFjdG9yOlwidW5kZWZpbmVkXCIhPXR5cGVvZiBlLmRvcHBsZXJGYWN0b3I/ZS5kb3BwbGVyRmFjdG9yOnQuZG9wcGxlckZhY3RvcixzcGVlZE9mU291bmQ6XCJ1bmRlZmluZWRcIiE9dHlwZW9mIGUuc3BlZWRPZlNvdW5kP2Uuc3BlZWRPZlNvdW5kOnQuc3BlZWRPZlNvdW5kfSxuLmN0eC5saXN0ZW5lci5kb3BwbGVyRmFjdG9yPXQuZG9wcGxlckZhY3RvcixuLmN0eC5saXN0ZW5lci5zcGVlZE9mU291bmQ9dC5zcGVlZE9mU291bmQsbik6dH0sSG93bC5wcm90b3R5cGUuaW5pdD1mdW5jdGlvbihlKXtyZXR1cm4gZnVuY3Rpb24obil7dmFyIHQ9dGhpcztyZXR1cm4gdC5fb3JpZW50YXRpb249bi5vcmllbnRhdGlvbnx8WzEsMCwwXSx0Ll9wb3M9bi5wb3N8fG51bGwsdC5fdmVsb2NpdHk9bi52ZWxvY2l0eXx8WzAsMCwwXSx0Ll9wYW5uZXJBdHRyPXtjb25lSW5uZXJBbmdsZTpcInVuZGVmaW5lZFwiIT10eXBlb2Ygbi5jb25lSW5uZXJBbmdsZT9uLmNvbmVJbm5lckFuZ2xlOjM2MCxjb25lT3V0ZXJBbmdsZTpcInVuZGVmaW5lZFwiIT10eXBlb2Ygbi5jb25lT3V0ZXJBbmdsZT9uLmNvbmVPdXRlckFuZ2xlOjM2MCxjb25lT3V0ZXJHYWluOlwidW5kZWZpbmVkXCIhPXR5cGVvZiBuLmNvbmVPdXRlckdhaW4/bi5jb25lT3V0ZXJHYWluOjAsZGlzdGFuY2VNb2RlbDpcInVuZGVmaW5lZFwiIT10eXBlb2Ygbi5kaXN0YW5jZU1vZGVsP24uZGlzdGFuY2VNb2RlbDpcImludmVyc2VcIixtYXhEaXN0YW5jZTpcInVuZGVmaW5lZFwiIT10eXBlb2Ygbi5tYXhEaXN0YW5jZT9uLm1heERpc3RhbmNlOjFlNCxwYW5uaW5nTW9kZWw6XCJ1bmRlZmluZWRcIiE9dHlwZW9mIG4ucGFubmluZ01vZGVsP24ucGFubmluZ01vZGVsOlwiSFJURlwiLHJlZkRpc3RhbmNlOlwidW5kZWZpbmVkXCIhPXR5cGVvZiBuLnJlZkRpc3RhbmNlP24ucmVmRGlzdGFuY2U6MSxyb2xsb2ZmRmFjdG9yOlwidW5kZWZpbmVkXCIhPXR5cGVvZiBuLnJvbGxvZmZGYWN0b3I/bi5yb2xsb2ZmRmFjdG9yOjF9LGUuY2FsbCh0aGlzLG4pfX0oSG93bC5wcm90b3R5cGUuaW5pdCksSG93bC5wcm90b3R5cGUucG9zPWZ1bmN0aW9uKG4sdCxvLHIpe3ZhciBpPXRoaXM7aWYoIWkuX3dlYkF1ZGlvKXJldHVybiBpO2lmKCFpLl9sb2FkZWQpcmV0dXJuIGkub25jZShcInBsYXlcIixmdW5jdGlvbigpe2kucG9zKG4sdCxvLHIpfSksaTtpZih0PVwibnVtYmVyXCIhPXR5cGVvZiB0PzA6dCxvPVwibnVtYmVyXCIhPXR5cGVvZiBvPy0uNTpvLFwidW5kZWZpbmVkXCI9PXR5cGVvZiByKXtpZihcIm51bWJlclwiIT10eXBlb2YgbilyZXR1cm4gaS5fcG9zO2kuX3Bvcz1bbix0LG9dfWZvcih2YXIgYT1pLl9nZXRTb3VuZElkcyhyKSxwPTA7cDxhLmxlbmd0aDtwKyspe3ZhciBsPWkuX3NvdW5kQnlJZChhW3BdKTtpZihsKXtpZihcIm51bWJlclwiIT10eXBlb2YgbilyZXR1cm4gbC5fcG9zO2wuX3Bvcz1bbix0LG9dLGwuX25vZGUmJihsLl9wYW5uZXJ8fGUobCksbC5fcGFubmVyLnNldFBvc2l0aW9uKG4sdCxvKSl9fXJldHVybiBpfSxIb3dsLnByb3RvdHlwZS5vcmllbnRhdGlvbj1mdW5jdGlvbihuLHQsbyxyKXt2YXIgaT10aGlzO2lmKCFpLl93ZWJBdWRpbylyZXR1cm4gaTtpZighaS5fbG9hZGVkKXJldHVybiBpLm9uY2UoXCJwbGF5XCIsZnVuY3Rpb24oKXtpLm9yaWVudGF0aW9uKG4sdCxvLHIpfSksaTtpZih0PVwibnVtYmVyXCIhPXR5cGVvZiB0P2kuX29yaWVudGF0aW9uWzFdOnQsbz1cIm51bWJlclwiIT10eXBlb2Ygbz9pLl9vcmllbnRhdGlvblsyXTpvLFwidW5kZWZpbmVkXCI9PXR5cGVvZiByKXtpZihcIm51bWJlclwiIT10eXBlb2YgbilyZXR1cm4gaS5fb3JpZW50YXRpb247aS5fb3JpZW50YXRpb249W24sdCxvXX1mb3IodmFyIGE9aS5fZ2V0U291bmRJZHMocikscD0wO3A8YS5sZW5ndGg7cCsrKXt2YXIgbD1pLl9zb3VuZEJ5SWQoYVtwXSk7aWYobCl7aWYoXCJudW1iZXJcIiE9dHlwZW9mIG4pcmV0dXJuIGwuX29yaWVudGF0aW9uO2wuX29yaWVudGF0aW9uPVtuLHQsb10sbC5fbm9kZSYmKGwuX3Bhbm5lcnx8ZShsKSxsLl9wYW5uZXIuc2V0T3JpZW50YXRpb24obix0LG8pKX19cmV0dXJuIGl9LEhvd2wucHJvdG90eXBlLnZlbG9jaXR5PWZ1bmN0aW9uKG4sdCxvLHIpe3ZhciBpPXRoaXM7aWYoIWkuX3dlYkF1ZGlvKXJldHVybiBpO2lmKCFpLl9sb2FkZWQpcmV0dXJuIGkub25jZShcInBsYXlcIixmdW5jdGlvbigpe2kudmVsb2NpdHkobix0LG8scil9KSxpO2lmKHQ9XCJudW1iZXJcIiE9dHlwZW9mIHQ/aS5fdmVsb2NpdHlbMV06dCxvPVwibnVtYmVyXCIhPXR5cGVvZiBvP2kuX3ZlbG9jaXR5WzJdOm8sXCJ1bmRlZmluZWRcIj09dHlwZW9mIHIpe2lmKFwibnVtYmVyXCIhPXR5cGVvZiBuKXJldHVybiBpLl92ZWxvY2l0eTtpLl92ZWxvY2l0eT1bbix0LG9dfWZvcih2YXIgYT1pLl9nZXRTb3VuZElkcyhyKSxwPTA7cDxhLmxlbmd0aDtwKyspe3ZhciBsPWkuX3NvdW5kQnlJZChhW3BdKTtpZihsKXtpZihcIm51bWJlclwiIT10eXBlb2YgbilyZXR1cm4gbC5fdmVsb2NpdHk7bC5fdmVsb2NpdHk9W24sdCxvXSxsLl9ub2RlJiYobC5fcGFubmVyfHxlKGwpLGwuX3Bhbm5lci5zZXRWZWxvY2l0eShuLHQsbykpfX1yZXR1cm4gaX0sSG93bC5wcm90b3R5cGUucGFubmVyQXR0cj1mdW5jdGlvbigpe3ZhciBuLHQsbyxyPXRoaXMsaT1hcmd1bWVudHM7aWYoIXIuX3dlYkF1ZGlvKXJldHVybiByO2lmKDA9PT1pLmxlbmd0aClyZXR1cm4gci5fcGFubmVyQXR0cjtpZigxPT09aS5sZW5ndGgpe2lmKFwib2JqZWN0XCIhPXR5cGVvZiBpWzBdKXJldHVybiBvPXIuX3NvdW5kQnlJZChwYXJzZUludChpWzBdLDEwKSksbz9vLl9wYW5uZXJBdHRyOnIuX3Bhbm5lckF0dHI7bj1pWzBdLFwidW5kZWZpbmVkXCI9PXR5cGVvZiB0JiYoci5fcGFubmVyQXR0cj17Y29uZUlubmVyQW5nbGU6XCJ1bmRlZmluZWRcIiE9dHlwZW9mIG4uY29uZUlubmVyQW5nbGU/bi5jb25lSW5uZXJBbmdsZTpyLl9jb25lSW5uZXJBbmdsZSxjb25lT3V0ZXJBbmdsZTpcInVuZGVmaW5lZFwiIT10eXBlb2Ygbi5jb25lT3V0ZXJBbmdsZT9uLmNvbmVPdXRlckFuZ2xlOnIuX2NvbmVPdXRlckFuZ2xlLGNvbmVPdXRlckdhaW46XCJ1bmRlZmluZWRcIiE9dHlwZW9mIG4uY29uZU91dGVyR2Fpbj9uLmNvbmVPdXRlckdhaW46ci5fY29uZU91dGVyR2FpbixkaXN0YW5jZU1vZGVsOlwidW5kZWZpbmVkXCIhPXR5cGVvZiBuLmRpc3RhbmNlTW9kZWw/bi5kaXN0YW5jZU1vZGVsOnIuX2Rpc3RhbmNlTW9kZWwsbWF4RGlzdGFuY2U6XCJ1bmRlZmluZWRcIiE9dHlwZW9mIG4ubWF4RGlzdGFuY2U/bi5tYXhEaXN0YW5jZTpyLl9tYXhEaXN0YW5jZSxwYW5uaW5nTW9kZWw6XCJ1bmRlZmluZWRcIiE9dHlwZW9mIG4ucGFubmluZ01vZGVsP24ucGFubmluZ01vZGVsOnIuX3Bhbm5pbmdNb2RlbCxyZWZEaXN0YW5jZTpcInVuZGVmaW5lZFwiIT10eXBlb2Ygbi5yZWZEaXN0YW5jZT9uLnJlZkRpc3RhbmNlOnIuX3JlZkRpc3RhbmNlLHJvbGxvZmZGYWN0b3I6XCJ1bmRlZmluZWRcIiE9dHlwZW9mIG4ucm9sbG9mZkZhY3Rvcj9uLnJvbGxvZmZGYWN0b3I6ci5fcm9sbG9mZkZhY3Rvcn0pfWVsc2UgMj09PWkubGVuZ3RoJiYobj1pWzBdLHQ9cGFyc2VJbnQoaVsxXSwxMCkpO2Zvcih2YXIgYT1yLl9nZXRTb3VuZElkcyh0KSxwPTA7cDxhLmxlbmd0aDtwKyspaWYobz1yLl9zb3VuZEJ5SWQoYVtwXSkpe3ZhciBsPW8uX3Bhbm5lckF0dHI7bD17Y29uZUlubmVyQW5nbGU6XCJ1bmRlZmluZWRcIiE9dHlwZW9mIG4uY29uZUlubmVyQW5nbGU/bi5jb25lSW5uZXJBbmdsZTpsLmNvbmVJbm5lckFuZ2xlLGNvbmVPdXRlckFuZ2xlOlwidW5kZWZpbmVkXCIhPXR5cGVvZiBuLmNvbmVPdXRlckFuZ2xlP24uY29uZU91dGVyQW5nbGU6bC5jb25lT3V0ZXJBbmdsZSxjb25lT3V0ZXJHYWluOlwidW5kZWZpbmVkXCIhPXR5cGVvZiBuLmNvbmVPdXRlckdhaW4/bi5jb25lT3V0ZXJHYWluOmwuY29uZU91dGVyR2FpbixkaXN0YW5jZU1vZGVsOlwidW5kZWZpbmVkXCIhPXR5cGVvZiBuLmRpc3RhbmNlTW9kZWw/bi5kaXN0YW5jZU1vZGVsOmwuZGlzdGFuY2VNb2RlbCxtYXhEaXN0YW5jZTpcInVuZGVmaW5lZFwiIT10eXBlb2Ygbi5tYXhEaXN0YW5jZT9uLm1heERpc3RhbmNlOmwubWF4RGlzdGFuY2UscGFubmluZ01vZGVsOlwidW5kZWZpbmVkXCIhPXR5cGVvZiBuLnBhbm5pbmdNb2RlbD9uLnBhbm5pbmdNb2RlbDpsLnBhbm5pbmdNb2RlbCxyZWZEaXN0YW5jZTpcInVuZGVmaW5lZFwiIT10eXBlb2Ygbi5yZWZEaXN0YW5jZT9uLnJlZkRpc3RhbmNlOmwucmVmRGlzdGFuY2Uscm9sbG9mZkZhY3RvcjpcInVuZGVmaW5lZFwiIT10eXBlb2Ygbi5yb2xsb2ZmRmFjdG9yP24ucm9sbG9mZkZhY3RvcjpsLnJvbGxvZmZGYWN0b3J9O3ZhciBjPW8uX3Bhbm5lcjtjPyhjLmNvbmVJbm5lckFuZ2xlPWwuY29uZUlubmVyQW5nbGUsYy5jb25lT3V0ZXJBbmdsZT1sLmNvbmVPdXRlckFuZ2xlLGMuY29uZU91dGVyR2Fpbj1sLmNvbmVPdXRlckdhaW4sYy5kaXN0YW5jZU1vZGVsPWwuZGlzdGFuY2VNb2RlbCxjLm1heERpc3RhbmNlPWwubWF4RGlzdGFuY2UsYy5wYW5uaW5nTW9kZWw9bC5wYW5uaW5nTW9kZWwsYy5yZWZEaXN0YW5jZT1sLnJlZkRpc3RhbmNlLGMucm9sbG9mZkZhY3Rvcj1sLnJvbGxvZmZGYWN0b3IpOihvLl9wb3N8fChvLl9wb3M9ci5fcG9zfHxbMCwwLC0uNV0pLGUobykpfXJldHVybiByfSxTb3VuZC5wcm90b3R5cGUuaW5pdD1mdW5jdGlvbihlKXtyZXR1cm4gZnVuY3Rpb24oKXt2YXIgbj10aGlzLHQ9bi5fcGFyZW50O24uX29yaWVudGF0aW9uPXQuX29yaWVudGF0aW9uLG4uX3Bvcz10Ll9wb3Msbi5fdmVsb2NpdHk9dC5fdmVsb2NpdHksbi5fcGFubmVyQXR0cj10Ll9wYW5uZXJBdHRyLGUuY2FsbCh0aGlzKSxuLl9wb3MmJnQucG9zKG4uX3Bvc1swXSxuLl9wb3NbMV0sbi5fcG9zWzJdLG4uX2lkKX19KFNvdW5kLnByb3RvdHlwZS5pbml0KSxTb3VuZC5wcm90b3R5cGUucmVzZXQ9ZnVuY3Rpb24oZSl7cmV0dXJuIGZ1bmN0aW9uKCl7dmFyIG49dGhpcyx0PW4uX3BhcmVudDtyZXR1cm4gbi5fb3JpZW50YXRpb249dC5fb3JpZW50YXRpb24sbi5fcG9zPXQuX3BvcyxuLl92ZWxvY2l0eT10Ll92ZWxvY2l0eSxuLl9wYW5uZXJBdHRyPXQuX3Bhbm5lckF0dHIsZS5jYWxsKHRoaXMpfX0oU291bmQucHJvdG90eXBlLnJlc2V0KTt2YXIgZT1mdW5jdGlvbihlKXtlLl9wYW5uZXI9SG93bGVyLmN0eC5jcmVhdGVQYW5uZXIoKSxlLl9wYW5uZXIuY29uZUlubmVyQW5nbGU9ZS5fcGFubmVyQXR0ci5jb25lSW5uZXJBbmdsZSxlLl9wYW5uZXIuY29uZU91dGVyQW5nbGU9ZS5fcGFubmVyQXR0ci5jb25lT3V0ZXJBbmdsZSxlLl9wYW5uZXIuY29uZU91dGVyR2Fpbj1lLl9wYW5uZXJBdHRyLmNvbmVPdXRlckdhaW4sZS5fcGFubmVyLmRpc3RhbmNlTW9kZWw9ZS5fcGFubmVyQXR0ci5kaXN0YW5jZU1vZGVsLGUuX3Bhbm5lci5tYXhEaXN0YW5jZT1lLl9wYW5uZXJBdHRyLm1heERpc3RhbmNlLGUuX3Bhbm5lci5wYW5uaW5nTW9kZWw9ZS5fcGFubmVyQXR0ci5wYW5uaW5nTW9kZWwsZS5fcGFubmVyLnJlZkRpc3RhbmNlPWUuX3Bhbm5lckF0dHIucmVmRGlzdGFuY2UsZS5fcGFubmVyLnJvbGxvZmZGYWN0b3I9ZS5fcGFubmVyQXR0ci5yb2xsb2ZmRmFjdG9yLGUuX3Bhbm5lci5zZXRQb3NpdGlvbihlLl9wb3NbMF0sZS5fcG9zWzFdLGUuX3Bvc1syXSksZS5fcGFubmVyLnNldE9yaWVudGF0aW9uKGUuX29yaWVudGF0aW9uWzBdLGUuX29yaWVudGF0aW9uWzFdLGUuX29yaWVudGF0aW9uWzJdKSxlLl9wYW5uZXIuc2V0VmVsb2NpdHkoZS5fdmVsb2NpdHlbMF0sZS5fdmVsb2NpdHlbMV0sZS5fdmVsb2NpdHlbMl0pLGUuX3Bhbm5lci5jb25uZWN0KGUuX25vZGUpLGUuX3BhdXNlZHx8ZS5fcGFyZW50LnBhdXNlKGUuX2lkKS5wbGF5KGUuX2lkKX19KCk7XG5cblxuXG4vKioqKioqKioqKioqKioqKipcbiAqKiBXRUJQQUNLIEZPT1RFUlxuICoqIC4vfi9ob3dsZXIvaG93bGVyLmpzXG4gKiogbW9kdWxlIGlkID0gNlxuICoqIG1vZHVsZSBjaHVua3MgPSAwXG4gKiovIiwibW9kdWxlLmV4cG9ydHMgPSBfX3dlYnBhY2tfYW1kX29wdGlvbnNfXztcclxuXG5cblxuLyoqKioqKioqKioqKioqKioqXG4gKiogV0VCUEFDSyBGT09URVJcbiAqKiAod2VicGFjaykvYnVpbGRpbi9hbWQtb3B0aW9ucy5qc1xuICoqIG1vZHVsZSBpZCA9IDdcbiAqKiBtb2R1bGUgY2h1bmtzID0gMFxuICoqLyIsIlxudmFyICR2aWRlb0luZGljYXRvciA9ICQoJyN2aWRlby1wcm9ncmVzcyAucHJvZ3Jlc3MnKTtcbnZhciB2aWRlb1BsYXlpbmc7XG52YXIgJGVsO1xuXG4kdmlkZW9JbmRpY2F0b3IuaGlkZSgpO1xubW9kdWxlLmV4cG9ydHMuc3RhcnQgPSBmdW5jdGlvbigkbmV3VmlkZW8pIHtcbiAgJGVsID0gJG5ld1ZpZGVvWzBdO1xuICAkdmlkZW9JbmRpY2F0b3Iuc2hvdygpO1xuICB2aWRlb1BsYXlpbmcgPSB0cnVlO1xuICBsb29wKCk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cy5zdG9wID0gZnVuY3Rpb24oKSB7XG4gIHZpZGVvUGxheWluZyA9IGZhbHNlO1xuICAkKCcjdmlkZW8tcHJvZ3Jlc3MgLnByb2dyZXNzJykuaGlkZSgpO1xufTtcblxuZnVuY3Rpb24gbG9vcCgpIHtcbiAgd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZShmdW5jdGlvbigpIHtcbiAgICB2YXIgcmF0ZSA9ICgkZWwuY3VycmVudFRpbWUgLyAkZWwuZHVyYXRpb24pO1xuICAgIHZhciBwZXJjZW50ID0gKHJhdGUgKiAxMDApLnRvRml4ZWQoMik7XG4gICAgJHZpZGVvSW5kaWNhdG9yLmNzcyh7J3dpZHRoJzogcGVyY2VudCArICd2dyd9KTtcbiAgICBpZih2aWRlb1BsYXlpbmcpIHtcbiAgICAgIHNldFRpbWVvdXQoICgpID0+IHtsb29wKCl9ICwgNDEgKVxuICAgIH1cbiAgfSlcbn1cblxuXG5cbi8qKiBXRUJQQUNLIEZPT1RFUiAqKlxuICoqIC4vc2NlbmUtbWFrZXIvcmVuZGVyL3ZpZGVvcGxheWVyLmpzXG4gKiovIiwibW9kdWxlLmV4cG9ydHMuY29udmVydEFsbFByb3BzVG9QeCA9IGZ1bmN0aW9uKGtleWZyYW1lcywgd2luZG93V2lkdGgsIHdpbmRvd0hlaWdodCkge1xuICB2YXIgaSwgaiwgaztcbiAgZm9yKGk9MDtpPGtleWZyYW1lcy5sZW5ndGg7aSsrKSB7IC8vIGxvb3Aga2V5ZnJhbWVzXG4gICAga2V5ZnJhbWVzW2ldLmR1cmF0aW9uID0gY29udmVydFBlcmNlbnRUb1B4KGtleWZyYW1lc1tpXS5kdXJhdGlvbiwgJ3knLCB3aW5kb3dXaWR0aCwgd2luZG93SGVpZ2h0KTtcbiAgICBmb3Ioaj0wO2o8a2V5ZnJhbWVzW2ldLmFuaW1hdGlvbnMubGVuZ3RoO2orKykgeyAvLyBsb29wIGFuaW1hdGlvbnNcbiAgICAgIE9iamVjdC5rZXlzKGtleWZyYW1lc1tpXS5hbmltYXRpb25zW2pdKS5mb3JFYWNoKGZ1bmN0aW9uKGtleSkgeyAvLyBsb29wIHByb3BlcnRpZXNcbiAgICAgICAgdmFyIHZhbHVlID0ga2V5ZnJhbWVzW2ldLmFuaW1hdGlvbnNbal1ba2V5XTtcbiAgICAgICAgaWYoa2V5ICE9PSAnc2VsZWN0b3InKSB7XG4gICAgICAgICAgaWYodmFsdWUgaW5zdGFuY2VvZiBBcnJheSkgeyAvLyBpZiBpdHMgYW4gYXJyYXlcbiAgICAgICAgICAgIGZvcihrPTA7azx2YWx1ZS5sZW5ndGg7aysrKSB7IC8vIGlmIHZhbHVlIGluIGFycmF5IGlzICVcbiAgICAgICAgICAgICAgaWYodHlwZW9mIHZhbHVlW2tdID09PSBcInN0cmluZ1wiKSB7XG4gICAgICAgICAgICAgICAgaWYoa2V5ID09PSAndHJhbnNsYXRlWScpIHtcbiAgICAgICAgICAgICAgICAgIHZhbHVlW2tdID0gY29udmVydFBlcmNlbnRUb1B4KHZhbHVlW2tdLCAneScsIHdpbmRvd1dpZHRoLCB3aW5kb3dIZWlnaHQpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICB2YWx1ZVtrXSA9IGNvbnZlcnRQZXJjZW50VG9QeCh2YWx1ZVtrXSwgJ3gnLCB3aW5kb3dXaWR0aCwgd2luZG93SGVpZ2h0KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYodHlwZW9mIHZhbHVlID09PSBcInN0cmluZ1wiKSB7IC8vIGlmIHNpbmdsZSB2YWx1ZSBpcyBhICVcbiAgICAgICAgICAgICAgaWYoa2V5ID09PSAndHJhbnNsYXRlWScpIHtcbiAgICAgICAgICAgICAgICB2YWx1ZSA9IGNvbnZlcnRQZXJjZW50VG9QeCh2YWx1ZSwgJ3knLCB3aW5kb3dXaWR0aCwgd2luZG93SGVpZ2h0KTtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB2YWx1ZSA9IGNvbnZlcnRQZXJjZW50VG9QeCh2YWx1ZSwgJ3gnLCB3aW5kb3dXaWR0aCwgd2luZG93SGVpZ2h0KTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBrZXlmcmFtZXNbaV0uYW5pbWF0aW9uc1tqXVtrZXldID0gdmFsdWU7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuICByZXR1cm4ga2V5ZnJhbWVzO1xufTtcblxuXG5cbmZ1bmN0aW9uIGNvbnZlcnRQZXJjZW50VG9QeCh2YWx1ZSwgYXhpcywgd2luZG93V2lkdGgsIHdpbmRvd0hlaWdodCkge1xuICBpZih0eXBlb2YgdmFsdWUgPT09IFwic3RyaW5nXCIgJiYgdmFsdWUubWF0Y2goLyUvZykpIHtcbiAgICBpZihheGlzID09PSAneScpIHZhbHVlID0gKHBhcnNlRmxvYXQodmFsdWUpIC8gMTAwKSAqIHdpbmRvd0hlaWdodDtcbiAgICBpZihheGlzID09PSAneCcpIHZhbHVlID0gKHBhcnNlRmxvYXQodmFsdWUpIC8gMTAwKSAqIHdpbmRvd1dpZHRoO1xuICB9XG4gIGlmKHR5cGVvZiB2YWx1ZSA9PT0gXCJzdHJpbmdcIiAmJiB2YWx1ZS5tYXRjaCgvdi9nKSkge1xuICAgIGlmKGF4aXMgPT09ICd5JykgdmFsdWUgPSAocGFyc2VGbG9hdCh2YWx1ZSkgLyAxMDApICogd2luZG93SGVpZ2h0O1xuICAgIGlmKGF4aXMgPT09ICd4JykgdmFsdWUgPSAocGFyc2VGbG9hdCh2YWx1ZSkgLyAxMDApICogd2luZG93V2lkdGg7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufTtcblxuXG5tb2R1bGUuZXhwb3J0cy5idWlsZFBhZ2UgPSBmdW5jdGlvbihrZXlmcmFtZXMsIHdyYXBwZXJzKSB7XG4gIHZhciBpLCBqLCBrLCBpbml0RnJhbWVzID0gW10sIGJvZHlIZWlnaHQgPSAwO1xuICBmb3IoaT0wO2k8a2V5ZnJhbWVzLmxlbmd0aDtpKyspIHsgLy8gbG9vcCBrZXlmcmFtZXNcbiAgICAgIGlmKGtleWZyYW1lc1tpXS5mb2N1cykge1xuICAgICAgICAgIGlmKGJvZHlIZWlnaHQgIT09IGluaXRGcmFtZXNbaW5pdEZyYW1lcy5sZW5ndGggLSAxXSkge1xuICAgICAgICAgICAgaW5pdEZyYW1lcy5wdXNoKGJvZHlIZWlnaHQpO1xuICAgICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGJvZHlIZWlnaHQgKz0ga2V5ZnJhbWVzW2ldLmR1cmF0aW9uO1xuICAgICAgaWYoJC5pbkFycmF5KGtleWZyYW1lc1tpXS53cmFwcGVyLCB3cmFwcGVycykgPT0gLTEpIHtcbiAgICAgICAgd3JhcHBlcnMucHVzaChrZXlmcmFtZXNbaV0ud3JhcHBlcik7XG4gICAgICB9XG4gICAgICBmb3Ioaj0wO2o8a2V5ZnJhbWVzW2ldLmFuaW1hdGlvbnMubGVuZ3RoO2orKykgeyAvLyBsb29wIGFuaW1hdGlvbnNcbiAgICAgICAgT2JqZWN0LmtleXMoa2V5ZnJhbWVzW2ldLmFuaW1hdGlvbnNbal0pLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7IC8vIGxvb3AgcHJvcGVydGllc1xuICAgICAgICAgIHZhciB2YWx1ZSA9IGtleWZyYW1lc1tpXS5hbmltYXRpb25zW2pdW2tleV07XG4gICAgICAgICAgaWYoa2V5ICE9PSAnc2VsZWN0b3InICYmIHZhbHVlIGluc3RhbmNlb2YgQXJyYXkgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICB2YXIgdmFsdWVTZXQgPSBbXTtcbiAgICAgICAgICAgIHZhbHVlU2V0LnB1c2goZ2V0RGVmYXVsdFByb3BlcnR5VmFsdWUoa2V5KSwgdmFsdWUpO1xuICAgICAgICAgICAgdmFsdWUgPSB2YWx1ZVNldDtcbiAgICAgICAgICB9XG4gICAgICAgICAga2V5ZnJhbWVzW2ldLmFuaW1hdGlvbnNbal1ba2V5XSA9IHZhbHVlO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgfVxuXG4gIHJldHVybiB7XG4gICAgZnJhbWVGb2N1czogaW5pdEZyYW1lcyxcbiAgICBib2R5SGVpZ2h0OiBib2R5SGVpZ2h0LFxuICAgIHdyYXBwZXJzOiB3cmFwcGVyc1xuICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cy5nZXREZWZhdWx0UHJvcGVydHlWYWx1ZSA9IGdldERlZmF1bHRQcm9wZXJ0eVZhbHVlO1xuXG5mdW5jdGlvbiBnZXREZWZhdWx0UHJvcGVydHlWYWx1ZShwcm9wZXJ0eSkge1xuICBzd2l0Y2ggKHByb3BlcnR5KSB7XG4gICAgY2FzZSAndHJhbnNsYXRlWCc6XG4gICAgICByZXR1cm4gMDtcbiAgICBjYXNlICd0cmFuc2xhdGVZJzpcbiAgICAgIHJldHVybiAwO1xuICAgIGNhc2UgJ3NjYWxlJzpcbiAgICAgIHJldHVybiAxO1xuICAgIGNhc2UgJ3JvdGF0ZSc6XG4gICAgICByZXR1cm4gMDtcbiAgICBjYXNlICdvcGFjaXR5JzpcbiAgICAgIHJldHVybiAxO1xuICAgIGRlZmF1bHQ6XG4gICAgICByZXR1cm4gbnVsbDtcbiAgfVxufVxuXG5cblxuLyoqIFdFQlBBQ0sgRk9PVEVSICoqXG4gKiogLi9zY2VuZS1tYWtlci91dGlscy9wYWdlLXV0aWxzLmpzXG4gKiovIiwiY29uc3QgS2VmaXIgPSByZXF1aXJlKCdrZWZpcicpXG5cbmNvbnN0IG9ic2NlbmUgPSByZXF1aXJlKCcuLi9vYi1zY2VuZS5qcycpXG5cbm1vZHVsZS5leHBvcnRzLmluaXQgPSBmdW5jdGlvbigpIHtcblxuICB2YXIgUExBWV9TUEVFRCA9IDEwO1xuXG4gIHZhciBpc1BsYXlpbmcgPSBmYWxzZTtcbiAgdmFyIGlzUGxheWluZ0ludGVydmFsO1xuICB2YXIgYm9keUhlaWdodCA9ICQoJ2JvZHknKS5oZWlnaHQoKTtcbiAgdmFyIG5hPTA7XG5cbiAgY29uc3Qga2V5VXBQcmVzc2VkID0gS2VmaXIuZnJvbUV2ZW50cyhkb2N1bWVudCwgJ2tleXVwJywgZnVuY3Rpb24oZSl7XG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIHJldHVybiBlO1xuICB9KTtcblxuICBjb25zdCBiYWNrS2V5ID0ga2V5VXBQcmVzc2VkXG4gICAgLmZpbHRlcihlID0+IGUua2V5Q29kZSA9PT0gMzgpXG4gIGNvbnN0IG5leHRLZXkgPSBrZXlVcFByZXNzZWRcbiAgICAuZmlsdGVyKGUgPT4gZS5rZXlDb2RlID09PSA0MClcblxuICBjb25zdCB0b2dnbGVVcENsaWNrZWQgPSBLZWZpci5mcm9tRXZlbnRzKCQoXCIjdG9nZ2xlVXBcIiksICdjbGljaycpXG4gIGNvbnN0IHRvZ2dsZURvd25DbGlja2VkID0gS2VmaXIuZnJvbUV2ZW50cygkKFwiI3RvZ2dsZURvd25cIiksICdjbGljaycpXG5cbiAgS2VmaXIubWVyZ2UoW25leHRLZXksIHRvZ2dsZURvd25DbGlja2VkXSlcbiAgICAub25WYWx1ZShlID0+IHtcbiAgICAgIG9ic2NlbmUuYWN0aW9uKCduZXh0JylcbiAgICB9KVxuXG4gIEtlZmlyLm1lcmdlKFtiYWNrS2V5LCB0b2dnbGVVcENsaWNrZWRdKVxuICAgIC5vblZhbHVlKGUgPT4ge1xuICAgICAgb2JzY2VuZS5hY3Rpb24oJ3ByZXZpb3VzJylcbiAgICB9KVxuXG4gICQoXCIjdG9nZ2xlUGxheVwiKS5vbignY2xpY2snLCBmdW5jdGlvbihlKSB7XG4gICAgY29uc29sZS5sb2coXCJDTElDS1wiKTtcbiAgICBpZihpc1BsYXlpbmcpIHsgcGF1c2UoKSB9IGVsc2UgeyBwbGF5KCkgfVxuICB9KVxuXG4gIGtleVVwUHJlc3NlZFxuICAgIC5maWx0ZXIoZSA9PiBlLmtleUNvZGUgPT09IDgwIHx8IGUua2V5Q29kZSA9PT0gMzIpXG4gICAgLm9uVmFsdWUoZSA9PiB7XG4gICAgICBpZiAoaXNQbGF5aW5nKSB7IHBhdXNlKCkgfSBlbHNlIHsgcGxheSgpIH1cbiAgICB9KVxuXG4gIGZ1bmN0aW9uIHBsYXkoKSB7XG4gICAgY29uc29sZS5sb2coXCJQTEFZXCIpXG4gICAgaXNQbGF5aW5nSW50ZXJ2YWwgPSBzZXRJbnRlcnZhbChmdW5jdGlvbigpIHtcbiAgICAgIG9ic2NlbmUuYWN0aW9uKCduZXh0Jyk7XG4gICAgfSwgNTAwMCk7XG4gICAgJChcIiN0b2dnbGVQbGF5XCIpLnJlbW92ZUNsYXNzKCdmYS1wbGF5JykuYWRkQ2xhc3MoJ2ZhLXBhdXNlJyk7XG4gICAgaXNQbGF5aW5nID0gdHJ1ZTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHBhdXNlKCkge1xuICAgIGNvbnNvbGUubG9nKFwiUEFVU0VcIik7XG4gICAgY2xlYXJJbnRlcnZhbChpc1BsYXlpbmdJbnRlcnZhbCk7XG4gICAgaXNQbGF5aW5nID0gZmFsc2U7XG4gICAgJChcIiN0b2dnbGVQbGF5XCIpLnJlbW92ZUNsYXNzKCdmYS1wYXVzZScpLmFkZENsYXNzKCdmYS1wbGF5Jyk7XG4gIH1cbn07XG5cblxuXG4vKiogV0VCUEFDSyBGT09URVIgKipcbiAqKiAuL3NjZW5lLW1ha2VyL3VzZXIvY29udHJvbHMuanNcbiAqKi8iLCIvKlxuICogIERlcGVuZGVuY2llc1xuKi9cblxuICBjb25zdCBvYnNjZW5lID0gcmVxdWlyZSgnLi4vb2Itc2NlbmUuanMnKVxuICBjb25zdCBwYWdlVXRpbHMgPSByZXF1aXJlKCcuLi91dGlscy9wYWdlLXV0aWxzLmpzJylcblxuLypcbiAqICBTdHJlYW1zXG4qL1xuXG4gIGNvbnN0IHNjcm9sbFRvcENoYW5nZWQgPSBvYnNjZW5lLnNjcm9sbFRvcENoYW5nZWRcbiAgY29uc3QgZGltZW5zaW9uc0NhbGN1bGF0ZWQgPSBvYnNjZW5lLmRpbWVuc2lvbnNDYWxjdWxhdGVkXG4gIGNvbnN0IHdyYXBwZXJDaGFuZ2VkID0gb2JzY2VuZS53cmFwcGVyQ2hhbmdlZFxuXG4vKlxuICogIERPTSBFbGVtZW50c1xuKi9cblxuICBjb25zdCAkd2luZG93ID0gJCh3aW5kb3cpXG4gIGNvbnN0ICRib2R5ID0gJCgnYm9keScpXG4gIGNvbnN0ICRib2R5aHRtbCA9ICQoJ2JvZHksaHRtbCcpXG4gIGNvbnN0ICRleHBlcmllbmNlSW5kaWNhdG9yID0gJCgnI2V4cGVyaWVuY2UtcHJvZ3Jlc3MgLnByb2dyZXNzJylcblxuLypcbiAqICBDaGlsZCBSZW5kZXJzXG4qL1xuXG4gIGNvbnN0IHJlbmRlcldyYXBwZXIgPSByZXF1aXJlKCcuL3dyYXBwZXIuanMnKVxuICBjb25zdCByZW5kZXJTY3JvbGxiYXIgPSByZXF1aXJlKCcuL3Njcm9sbGJhci5qcycpXG4gIGNvbnN0IHJlbmRlckF1ZGlvUGxheWVyID0gcmVxdWlyZSgnLi9hdWRpb3BsYXllci5qcycpXG4gIGNvbnN0IHJlbmRlclZpZGVvUGxheWVyID0gcmVxdWlyZSgnLi92aWRlb3BsYXllci5qcycpXG4gIGNvbnN0IHJlbmRlckVycm9yID0gcmVxdWlyZSgnLi9lcnJvci5qcycpXG5cbi8qXG4gKiAgUmVuZGVyXG4qL1xuXG4gIC8vIEhhY2sgdG8gZm9yY2UgcmVzaXplIG9uY2UuIEZvciBzb21lXG4gIC8vIHJlYXNvbiB0aGlzIHByZXZlbnRzIHRoZSBhbmltYXRpb25zIGZyb20gYmxpbmtpbmcgb24gQ2hyb21lXG4gIHNjcm9sbFRvcENoYW5nZWQudGFrZSgxKS5kZWxheSg1MDApLm9uVmFsdWUoKCkgPT4ge1xuICAgICR3aW5kb3cudHJpZ2dlcigncmVzaXplJylcbiAgfSlcblxuICAvLyBSZW5kZXIgRGltZW5zaW9uc1xuICBkaW1lbnNpb25zQ2FsY3VsYXRlZC5vblZhbHVlKHN0YXRlID0+IHtcbiAgICAkYm9keS5oZWlnaHQoc3RhdGUuYm9keUhlaWdodClcbiAgICByZW5kZXJTY3JvbGxCYXJGb2N1c0JhcnMoc3RhdGUpXG4gIH0pXG5cbiAgICBmdW5jdGlvbiByZW5kZXJTY3JvbGxCYXJGb2N1c0JhcnMoc3RhdGUpIHtcbiAgICAgIHN0YXRlLmZyYW1lRm9jdXNcbiAgICAgICAgLm1hcCgoZm9jdXMpID0+IChmb2N1cyAvIHN0YXRlLmJvZHlIZWlnaHQpLnRvRml4ZWQoMikgKiAxMDApIC8vIENvbnZlcnQgdG8gcGVyY2VudFxuICAgICAgICAubWFwKChmb2N1c1BlcmNlbnQpID0+IGZvY3VzUGVyY2VudCArIFwidmhcIikgLy8gQ29udmVydCB0byB2aFxuICAgICAgICAubWFwKChmb2N1c1ZoKSA9PiB7XG4gICAgICAgICAgJChcIiNleHBlcmllbmNlLXByb2dyZXNzXCIpXG4gICAgICAgICAgICAuYXBwZW5kKCc8ZGl2IGNsYXNzPVwiY2VudGVyLW1hcmtlclwiIHN0eWxlPVwidG9wOicgKyBmb2N1c1ZoICsgJ1wiPjwvZGl2PicpXG4gICAgICAgIH0pXG4gICAgfVxuXG4gIC8vIFJlbmRlciBXcmFwcGVyXG4gIHdyYXBwZXJDaGFuZ2VkLm9uVmFsdWUoKGN1cnJlbnRXcmFwcGVyKSA9PiB7XG4gICAgLy8gY29uc29sZS5sb2coXCJXUkFQUEVSIENIQU5HRURcIik7XG4gICAgd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSgoKSA9PiB7XG4gICAgICAkKGN1cnJlbnRXcmFwcGVyWzBdKS5oaWRlKClcbiAgICAgICQoY3VycmVudFdyYXBwZXJbMV0pLnNob3coKVxuXG4gICAgICB3aW5kb3cubG9jYXRpb24uaGFzaCA9IGN1cnJlbnRXcmFwcGVyWzFdXG4gICAgICBnYSgnc2VuZCcsICdzY2VuZV9hY2Nlc3NlZCcsIGN1cnJlbnRXcmFwcGVyWzFdKSAvLyBHb29nbGUgQW5hbHl0aWNzXG4gICAgICByZW5kZXJWaWRlbyhjdXJyZW50V3JhcHBlcilcbiAgICAgIHJlbmRlckF1ZGlvKGN1cnJlbnRXcmFwcGVyKVxuICAgIH0pXG4gIH0pXG5cbiAgICBmdW5jdGlvbiBzaG93Q3VycmVudFdyYXBwZXJzKHByZXYsIG5leHQpIHtcbiAgICAgIGlmIChwcmV2LmN1cnJlbnRXcmFwcGVyID09PSBuZXh0LmN1cnJlbnRXcmFwcGVyKSB7IHJldHVybiBmYWxzZSB9XG4gICAgICAvLyBjb25zb2xlLmxvZygncHJldmlvdXMnLCBwcmV2LCBuZXh0KVxuICAgICAgJChwcmV2LmN1cnJlbnRXcmFwcGVyKS5oaWRlKClcbiAgICAgICQobmV4dC5jdXJyZW50V3JhcHBlcikuc2hvdygpXG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcmVuZGVyVmlkZW8oc3RhdGUpIHtcblxuICAgICAgICAkKCd2aWRlbycsIHN0YXRlWzBdKS5hbmltYXRlKHtcbiAgICAgICAgICB2b2x1bWU6IDBcbiAgICAgICAgfSwgMzAwLCAnc3dpbmcnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAvLyByZWFsbHkgc3RvcCB0aGUgdmlkZW9cbiAgICAgICAgICAkKHRoaXMpLmdldCgwKS5wYXVzZSgpXG4gICAgICAgIH0pXG5cbiAgICAgICAgbGV0ICRuZXdWaWRlbyA9ICQoJ3ZpZGVvJywgc3RhdGVbMV0pXG5cbiAgICAgICAgaWYgKCRuZXdWaWRlb1swXSkge1xuICAgICAgICAgICRuZXdWaWRlb1swXS5wbGF5KClcbiAgICAgICAgICAkbmV3VmlkZW8uYW5pbWF0ZSh7XG4gICAgICAgICAgICB2b2x1bWU6ICRuZXdWaWRlby5hdHRyKCdtYXgtdm9sdW1lJykgfHwgMVxuICAgICAgICAgIH0sIDMwMCwgJ3N3aW5nJylcbiAgICAgICAgICByZW5kZXJWaWRlb1BsYXllci5zdGFydCgkbmV3VmlkZW8pXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmVuZGVyVmlkZW9QbGF5ZXIuc3RvcCgkbmV3VmlkZW8pXG4gICAgICAgIH1cblxuICAgIH1cbiAgICBmdW5jdGlvbiByZW5kZXJBdWRpbyhzdGF0ZSkge1xuICAgICAgcmVuZGVyQXVkaW9QbGF5ZXIubmV4dChzdGF0ZVsxXS5zdWJzdHIoMSkpO1xuICAgIH1cblxuICAvLyBSZW5kZXIgS2V5ZnJhbWVzXG5cbiAgc2Nyb2xsVG9wQ2hhbmdlZC5vblZhbHVlKChzdGF0ZWRpZmYpID0+IHtcblxuICAgIHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUoKCkgPT4ge1xuICAgICAgICBsZXQgcHJldiA9IHN0YXRlZGlmZlswXVxuICAgICAgICBsZXQgbmV4dCA9IHN0YXRlZGlmZlsxXVxuXG4gICAgICAgIGFuaW1hdGVFbGVtZW50cyhuZXh0KVxuICAgICAgICBhbmltYXRlU2Nyb2xsQmFyKG5leHQpXG4gICAgICAgIC8vIHJlbmRlck11c2ljKG5leHQpXG4gICAgfSlcblxuICB9KVxuXG4gICAgZnVuY3Rpb24gcmVuZGVyTXVzaWMod3JhcHBlcklkKSB7XG4gICAgICBhdWRpb3BsYXllci5uZXh0KHdyYXBwZXJJZC5zdWJzdHIoMSkpXG4gICAgfVxuXG4gICAgZnVuY3Rpb24gYW5pbWF0ZVNjcm9sbEJhcihzdGF0ZSkge1xuICAgICAgdmFyIHBlcmNlbnQgPSAoc3RhdGUuc2Nyb2xsVG9wIC8gc3RhdGUuYm9keUhlaWdodCkudG9GaXhlZCgyKSAqIDEwMFxuICAgICAgJGV4cGVyaWVuY2VJbmRpY2F0b3IuY3NzKHtcbiAgICAgICAgJ3RyYW5zZm9ybSc6ICd0cmFuc2xhdGVZKCcgKyBwZXJjZW50ICsgJyUpJ1xuICAgICAgfSlcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBhbmltYXRlRWxlbWVudHMoc3RhdGUpIHtcbiAgICAgIHZhciBhbmltYXRpb24sIHRyYW5zbGF0ZVksIHRyYW5zbGF0ZVgsIHNjYWxlLCByb3RhdGUsIG9wYWNpdHlcbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgc3RhdGUua2V5ZnJhbWVzW3N0YXRlLmN1cnJlbnRLZXlmcmFtZV0uYW5pbWF0aW9ucy5sZW5ndGg7IGkrKykge1xuICAgICAgICBhbmltYXRpb24gPSBzdGF0ZS5rZXlmcmFtZXNbc3RhdGUuY3VycmVudEtleWZyYW1lXS5hbmltYXRpb25zW2ldXG4gICAgICAgIHRyYW5zbGF0ZVkgPSBjYWxjUHJvcFZhbHVlKGFuaW1hdGlvbiwgJ3RyYW5zbGF0ZVknLCBzdGF0ZSlcbiAgICAgICAgdHJhbnNsYXRlWCA9IGNhbGNQcm9wVmFsdWUoYW5pbWF0aW9uLCAndHJhbnNsYXRlWCcsIHN0YXRlKVxuICAgICAgICBzY2FsZSA9IGNhbGNQcm9wVmFsdWUoYW5pbWF0aW9uLCAnc2NhbGUnLCBzdGF0ZSlcbiAgICAgICAgcm90YXRlID0gY2FsY1Byb3BWYWx1ZShhbmltYXRpb24sICdyb3RhdGUnLCBzdGF0ZSlcbiAgICAgICAgb3BhY2l0eSA9IGNhbGNQcm9wVmFsdWUoYW5pbWF0aW9uLCAnb3BhY2l0eScsIHN0YXRlKVxuICAgICAgICAkKGFuaW1hdGlvbi5zZWxlY3Rvciwgc3RhdGUuY3VycmVudFdyYXBwZXIpLmNzcyh7XG4gICAgICAgICAgJ3RyYW5zZm9ybSc6ICd0cmFuc2xhdGUzZCgnICsgdHJhbnNsYXRlWCArICdweCwgJyArIHRyYW5zbGF0ZVkgKyAncHgsIDApIHNjYWxlKCcgKyBzY2FsZSArICcpIHJvdGF0ZSgnICsgcm90YXRlICsgJ2RlZyknLFxuICAgICAgICAgICdvcGFjaXR5Jzogb3BhY2l0eS50b0ZpeGVkKDIpXG4gICAgICAgIH0pXG5cbiAgICAgIH1cbiAgICB9XG5cbiAgICAgIGZ1bmN0aW9uIGNhbGNQcm9wVmFsdWUoYW5pbWF0aW9uLCBwcm9wZXJ0eSwgc3RhdGUpIHtcbiAgICAgICAgbGV0IHZhbHVlID0gYW5pbWF0aW9uW3Byb3BlcnR5XVxuICAgICAgICBpZiAodmFsdWUpIHtcbiAgICAgICAgICB2YWx1ZSA9IGVhc2VJbk91dFF1YWQoc3RhdGUucmVsYXRpdmVTY3JvbGxUb3AsIHZhbHVlWzBdLCAodmFsdWVbMV0gLSB2YWx1ZVswXSksIHN0YXRlLmtleWZyYW1lc1tzdGF0ZS5jdXJyZW50S2V5ZnJhbWVdLmR1cmF0aW9uKVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHZhbHVlID0gcGFnZVV0aWxzLmdldERlZmF1bHRQcm9wZXJ0eVZhbHVlKHByb3BlcnR5KVxuICAgICAgICB9XG4gICAgICAgIC8vIHZhbHVlID0gK3ZhbHVlLnRvRml4ZWQoMilcbiAgICAgICAgLy8gVEVNUE9SQVJJTFkgUkVNT1ZFRCBDQVVTRSBTQ0FMRSBET0VTTidUIFdPUksgV0lUSEEgQUdSRVNTSVZFIFJPVU5ESU5HIExJS0UgVEhJU1xuICAgICAgICByZXR1cm4gdmFsdWVcbiAgICAgIH1cblxuICAgICAgZnVuY3Rpb24gZ2V0RGVmYXVsdFByb3BlcnR5VmFsdWUocHJvcGVydHkpIHtcbiAgICAgICAgc3dpdGNoIChwcm9wZXJ0eSkge1xuICAgICAgICAgIGNhc2UgJ3RyYW5zbGF0ZVgnOlxuICAgICAgICAgICAgcmV0dXJuIDBcbiAgICAgICAgICBjYXNlICd0cmFuc2xhdGVZJzpcbiAgICAgICAgICAgIHJldHVybiAwXG4gICAgICAgICAgY2FzZSAnc2NhbGUnOlxuICAgICAgICAgICAgcmV0dXJuIDFcbiAgICAgICAgICBjYXNlICdyb3RhdGUnOlxuICAgICAgICAgICAgcmV0dXJuIDBcbiAgICAgICAgICBjYXNlICdvcGFjaXR5JzpcbiAgICAgICAgICAgIHJldHVybiAxXG4gICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIHJldHVybiBudWxsXG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgZnVuY3Rpb24gZWFzZUluT3V0UXVhZCh0LCBiLCBjLCBkKSB7XG4gICAgICAgIC8vc2ludXNvYWRpYWwgaW4gYW5kIG91dFxuICAgICAgICByZXR1cm4gLWMgLyAyICogKE1hdGguY29zKE1hdGguUEkgKiB0IC8gZCkgLSAxKSArIGJcbiAgICAgIH1cblxuXG5cbi8qKiBXRUJQQUNLIEZPT1RFUiAqKlxuICoqIC4vc2NlbmUtbWFrZXIvcmVuZGVyL2luZGV4LmpzXG4gKiovIiwiZnVuY3Rpb24gcmVuZGVyU2Nyb2xsKHNjcm9sbCkge1xuICBjb25zb2xlLmxvZyhcIlJFTkRFUlwiLCBzY3JvbGwsIE1hdGguZmxvb3IoJHdpbmRvdy5zY3JvbGxUb3AoKSkpXG4gICAgJGJvZHlodG1sLmFuaW1hdGUoeyBzY3JvbGxUb3A6IHNjcm9sbCB9LCAxNTAwLCAnbGluZWFyJyk7XG59XG5cbmZ1bmN0aW9uIGFuaW1hdGVTY3JvbGxCYXIoKSB7XG4gIHZhciBwZXJjZW50ID0gKHNjcm9sbFRvcCAvIGJvZHlIZWlnaHQpLnRvRml4ZWQoMikgKiAxMDA7XG4gICRleHBlcmllbmNlSW5kaWNhdG9yLmNzcyh7XG4gICAgICAndHJhbnNmb3JtJzogICAgJ3RyYW5zbGF0ZVkoJyArIHBlcmNlbnQgKyAnJSknXG4gICAgfSk7XG59XG5mdW5jdGlvbiBidWlsZFNjcm9sbEJhckNlbnRlcnMoKSB7XG4gIGZyYW1lRm9jdXNcbiAgICAubWFwKChjZW50ZXIpID0+IChjZW50ZXIgLyBib2R5SGVpZ2h0KS50b0ZpeGVkKDIpICogMTAwKVxuICAgIC5tYXAoKGNlbnRlclBlcmNlbnQpID0+IGNlbnRlclBlcmNlbnQgKyBcInZoXCIgKVxuICAgIC5tYXAoKGNlbnRlclZoKSA9PiB7XG4gICAgICAkKFwiI2V4cGVyaWVuY2UtcHJvZ3Jlc3NcIilcbiAgICAgICAgLmFwcGVuZCgnPGRpdiBjbGFzcz1cImNlbnRlci1tYXJrZXJcIiBzdHlsZT1cInRvcDonKyBjZW50ZXJWaCArJ1wiPjwvZGl2PicpO1xuICAgIH0pO1xufVxuXG5cblxuLyoqIFdFQlBBQ0sgRk9PVEVSICoqXG4gKiogLi9zY2VuZS1tYWtlci9yZW5kZXIvc2Nyb2xsYmFyLmpzXG4gKiovIiwiLy8gTk9URTogVGhpcyBmaWxlIHJlbGllcyBoZWF2aWx5IG9uIHdlYnBhY2sgZm9yIHJlcXVpcmVzIG9mIGh0bWwgYW5kIGpzb24gY29uZmlnIGZpbGVzLlxuY29uc3QgS2VmaXIgPSByZXF1aXJlKCdrZWZpcicpO1xuXG4vLyBDb25zdGFudHNcbmNvbnN0IFNDRU5FU19ESVJFQ1RPUlkgPSAnLi4vLi4vc2NlbmVzLyc7IC8vIFRPRE86IFNDRU5FU19ESVJFQ1RPUlkgZG9lc24ndCBzZWVtIHRvIHdvcmsgd2l0aCB3ZWJwYWNrJ3MgaHRtbCAmIGpzb24gbG9hZGVyLlxuY29uc3QgU0NFTkVfSU5ERVggPSByZXF1aXJlKCdqc29uIS4uLy4uL3NjZW5lcy9pbmRleC5qc29uJyk7XG5jb25zdCBTQ0VORV9DT05UQUlORVJfQ1NTX0NMQVNTID0gJ3dyYXBwZXInO1xuXG4vKlxuICogR2VuZXJhdGVzIGFuIEhUTUwgc3RyaW5nIGZyb20gc2NlbmUuaHRtbCBmaWxlcyB0aGUgc2NlbmVzIGZvbGRlci5cbiAqIENyZWF0ZXMgYSB3cmFwcGVyIGRpdiB0aGF0IHByb3ZpZGVzIGZlZWRiYWNrLlxuICovXG5tb2R1bGUuZXhwb3J0cy5yZW5kZXJIVE1MID0gZnVuY3Rpb24oKSB7XG5cbiAgcmV0dXJuIFNDRU5FX0lOREVYXG4gICAgLm1hcChzY2VuZSA9PiBzY2VuZS5pZClcbiAgICAubWFwKGZ1bmN0aW9uKHNjZW5lTmFtZSkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgaHRtbDogcmVxdWlyZShcImh0bWw/YXR0cnM9ZmFsc2UhLi4vLi4vc2NlbmVzL1wiICsgc2NlbmVOYW1lICsgXCIvc2NlbmUuaHRtbFwiKSxcbiAgICAgICAgICAgICAgbmFtZTogc2NlbmVOYW1lXG4gICAgICAgICAgICB9XG4gICAgfSlcbiAgICAubWFwKGZ1bmN0aW9uKHNjZW5lT2JqZWN0KSB7IC8vIENyZWF0ZSB3cmFwcGVyIGRpdiBmb3IgaHRtbFxuICAgICAgICB2YXIgJHdyYXBwZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgICAgJHdyYXBwZXIuY2xhc3NMaXN0LmFkZChTQ0VORV9DT05UQUlORVJfQ1NTX0NMQVNTKTtcbiAgICAgICAgJHdyYXBwZXIuc2V0QXR0cmlidXRlKCdpZCcsIHNjZW5lT2JqZWN0Lm5hbWUpO1xuICAgICAgICAkd3JhcHBlci5pbm5lckhUTUwgPSBzY2VuZU9iamVjdC5odG1sO1xuICAgICAgICByZXR1cm4gJHdyYXBwZXIub3V0ZXJIVE1MO1xuICAgIH0pXG4gICAgLnJlZHVjZShmdW5jdGlvbihwcmV2LCBuZXh0KSB7IC8vIENvbmNhdCB0byAxIGh0bWwgc3RyaW5nXG4gICAgICByZXR1cm4gcHJldiArIG5leHQ7XG4gICAgfSwgJycpO1xuXG59XG5cbm1vZHVsZS5leHBvcnRzLmdldFNjZW5lcyA9IGNyZWF0ZUhUTUxGb3JTY2VuZXM7XG5cbmZ1bmN0aW9uIGNyZWF0ZUhUTUxGb3JTY2VuZXMoKSB7XG4gIHJldHVybiBTQ0VORV9JTkRFWFxuICAgIC5tYXAoc2NlbmUgPT4gc2NlbmUuaWQpXG4gICAgLm1hcChmdW5jdGlvbihzY2VuZU5hbWUpIHsgLy8gZ2V0IHRoZSBzY2VuZXMod2hpY2ggYXJlIGluIGFycmF5cylcbiAgICAgIHJldHVybiByZXF1aXJlKFwianNvbiEuLi8uLi9zY2VuZXMvXCIgKyBzY2VuZU5hbWUgKyBcIi9zY2VuZS5qc29uXCIpXG4gICAgfSlcbiAgICAucmVkdWNlKGZ1bmN0aW9uKHByZXYsIGN1cnJlbnQpIHsgLy8gZmxhdHRlbiBhcnJheXMgYnkgY29uY2F0aW5nIGludG8gYSBuZXcgYXJyYXlcbiAgICAgIHJldHVybiBwcmV2LmNvbmNhdChjdXJyZW50KTtcbiAgICB9LCBbXSlcbn1cblxubW9kdWxlLmV4cG9ydHMuZ2V0QXVkaW9Db25maWcgPSBmdW5jdGlvbigpIHtcblxuICByZXR1cm4gU0NFTkVfSU5ERVhcbiAgICAubWFwKHNjZW5lID0+IHNjZW5lKVxuXG59XG5cblxuXG4vKiogV0VCUEFDSyBGT09URVIgKipcbiAqKiAuL3NjZW5lLW1ha2VyL3V0aWxzL3NjZW5lLXV0aWxzLmpzXG4gKiovIiwibW9kdWxlLmV4cG9ydHMgPSBbXG5cdHtcblx0XHRcImlkXCI6IFwiaW50cm9cIixcblx0XHRcImF1ZGlvXCI6IHtcblx0XHRcdFwic3JjXCI6IFwiMVwiLFxuXHRcdFx0XCJtYXhcIjogMC4wMVxuXHRcdH1cblx0fSxcblx0e1xuXHRcdFwiaWRcIjogXCJkb3lvdWZlZWxtdXNsaW1cIixcblx0XHRcImF1ZGlvXCI6IHtcblx0XHRcdFwic3JjXCI6IFwiMVwiLFxuXHRcdFx0XCJtYXhcIjogMC41XG5cdFx0fVxuXHR9LFxuXHR7XG5cdFx0XCJpZFwiOiBcImFib3V0eW91cnNlbGZcIixcblx0XHRcImF1ZGlvXCI6IHtcblx0XHRcdFwic3JjXCI6IFwiMVwiLFxuXHRcdFx0XCJtYXhcIjogMC41XG5cdFx0fVxuXHR9LFxuXHR7XG5cdFx0XCJpZFwiOiBcInJlYWN0aW9uc3RvdGVycm9yXCIsXG5cdFx0XCJhdWRpb1wiOiB7XG5cdFx0XHRcInNyY1wiOiBcIjJcIixcblx0XHRcdFwibWF4XCI6IDAuM1xuXHRcdH1cblx0fSxcblx0e1xuXHRcdFwiaWRcIjogXCJmZWVsaW5nY29uZnVzZWRcIixcblx0XHRcImF1ZGlvXCI6IHtcblx0XHRcdFwic3JjXCI6IFwiM1wiLFxuXHRcdFx0XCJtYXhcIjogMC41XG5cdFx0fVxuXHR9LFxuXHR7XG5cdFx0XCJpZFwiOiBcIm91dHRvZ2V0eW91XCIsXG5cdFx0XCJhdWRpb1wiOiB7XG5cdFx0XHRcInNyY1wiOiBcIjNcIixcblx0XHRcdFwibWF4XCI6IDAuNVxuXHRcdH1cblx0fSxcblx0e1xuXHRcdFwiaWRcIjogXCJzb21ldGhpbmd0b3Byb3ZlXCIsXG5cdFx0XCJhdWRpb1wiOiB7XG5cdFx0XHRcInNyY1wiOiBcIjRcIixcblx0XHRcdFwibWF4XCI6IDAuNVxuXHRcdH1cblx0fSxcblx0e1xuXHRcdFwiaWRcIjogXCJpdGlzbnRlYXN5XCIsXG5cdFx0XCJhdWRpb1wiOiB7XG5cdFx0XHRcInNyY1wiOiBcIjVcIixcblx0XHRcdFwibWF4XCI6IDAuNVxuXHRcdH1cblx0fSxcblx0e1xuXHRcdFwiaWRcIjogXCJtaXhlZGZlZWxpbmdzXCIsXG5cdFx0XCJhdWRpb1wiOiB7XG5cdFx0XHRcInNyY1wiOiBcIjZcIixcblx0XHRcdFwibWF4XCI6IDAuNVxuXHRcdH1cblx0fSxcblx0e1xuXHRcdFwiaWRcIjogXCJkaWZmZXJlbnRwcmFjdGljZXNcIixcblx0XHRcImF1ZGlvXCI6IHtcblx0XHRcdFwic3JjXCI6IFwiNlwiLFxuXHRcdFx0XCJtYXhcIjogMC41XG5cdFx0fVxuXHR9LFxuXHR7XG5cdFx0XCJpZFwiOiBcInlldHRoYXRzb2theVwiLFxuXHRcdFwiYXVkaW9cIjoge1xuXHRcdFx0XCJzcmNcIjogXCI2XCIsXG5cdFx0XHRcIm1heFwiOiAwLjVcblx0XHR9XG5cdH0sXG5cdHtcblx0XHRcImlkXCI6IFwiaXRzZ290dG9lbmRcIixcblx0XHRcImF1ZGlvXCI6IHtcblx0XHRcdFwic3JjXCI6IFwiN1wiLFxuXHRcdFx0XCJtYXhcIjogMC41XG5cdFx0fVxuXHR9LFxuXHR7XG5cdFx0XCJpZFwiOiBcIml3YW50bXlpc2xhbWJhY2sxXCIsXG5cdFx0XCJhdWRpb1wiOiB7XG5cdFx0XHRcInNyY1wiOiBcIjdcIixcblx0XHRcdFwibWF4XCI6IDAuNVxuXHRcdH1cblx0fSxcblx0e1xuXHRcdFwiaWRcIjogXCJ3aG9hcmV0aGV5XCIsXG5cdFx0XCJhdWRpb1wiOiB7XG5cdFx0XHRcInNyY1wiOiBcIjdcIixcblx0XHRcdFwibWF4XCI6IDAuNVxuXHRcdH1cblx0fSxcblx0e1xuXHRcdFwiaWRcIjogXCJpc2lzZmlnaHRtaXNxdW90ZVwiLFxuXHRcdFwiYXVkaW9cIjoge1xuXHRcdFx0XCJzcmNcIjogXCI4XCIsXG5cdFx0XHRcIm1heFwiOiAwLjVcblx0XHR9XG5cdH0sXG5cdHtcblx0XHRcImlkXCI6IFwiaXNpc2Fwb2NhbHlwc2VtaXNxdW90ZVwiLFxuXHRcdFwiYXVkaW9cIjoge1xuXHRcdFx0XCJzcmNcIjogXCI4XCIsXG5cdFx0XHRcIm1heFwiOiAwLjVcblx0XHR9XG5cdH0sXG5cdHtcblx0XHRcImlkXCI6IFwiaXNpc2FmdGVybGlmZWZhbGxhY3lcIixcblx0XHRcImF1ZGlvXCI6IHtcblx0XHRcdFwic3JjXCI6IFwiOFwiLFxuXHRcdFx0XCJtYXhcIjogMC41XG5cdFx0fVxuXHR9LFxuXHR7XG5cdFx0XCJpZFwiOiBcIndoYXRpc2xhbWljaGlzdG9yeXByZWZlcnNcIixcblx0XHRcImF1ZGlvXCI6IHtcblx0XHRcdFwic3JjXCI6IFwiMTBcIixcblx0XHRcdFwibWF4XCI6IDAuMlxuXHRcdH1cblx0fSxcblx0e1xuXHRcdFwiaWRcIjogXCJpc2lzYmFua3J1cHRcIixcblx0XHRcImF1ZGlvXCI6IHtcblx0XHRcdFwic3JjXCI6IFwiMTBcIixcblx0XHRcdFwibWF4XCI6IDAuNVxuXHRcdH1cblx0fSxcblx0e1xuXHRcdFwiaWRcIjogXCJpc2lzd2FudHN0b2RpdmlkZVwiLFxuXHRcdFwiYXVkaW9cIjoge1xuXHRcdFx0XCJzcmNcIjogXCI3XCIsXG5cdFx0XHRcIm1heFwiOiAwLjVcblx0XHR9XG5cdH0sXG5cdHtcblx0XHRcImlkXCI6IFwiYmF0dGxlb2ZhZ2VuZXJhdGlvblwiLFxuXHRcdFwiYXVkaW9cIjoge1xuXHRcdFx0XCJzcmNcIjogXCI5XCIsXG5cdFx0XHRcIm1heFwiOiAwLjVcblx0XHR9XG5cdH0sXG5cdHtcblx0XHRcImlkXCI6IFwiY29tcGxpY2F0ZWRzaXR1YXRpb25cIixcblx0XHRcImF1ZGlvXCI6IHtcblx0XHRcdFwic3JjXCI6IFwiOFwiLFxuXHRcdFx0XCJtYXhcIjogMC41XG5cdFx0fVxuXHR9LFxuXHR7XG5cdFx0XCJpZFwiOiBcIm11c2xpbXNiZWxpZXZlaW5kaXZpZHVhbGxpZmVcIixcblx0XHRcImF1ZGlvXCI6IHtcblx0XHRcdFwic3JjXCI6IFwiOFwiLFxuXHRcdFx0XCJtYXhcIjogMC41XG5cdFx0fVxuXHR9LFxuXHR7XG5cdFx0XCJpZFwiOiBcIndld2lsbHByb3RlY3RlYWNob3RoZXJcIixcblx0XHRcImF1ZGlvXCI6IHtcblx0XHRcdFwic3JjXCI6IFwiOVwiLFxuXHRcdFx0XCJtYXhcIjogMC41XG5cdFx0fVxuXHR9LFxuXHR7XG5cdFx0XCJpZFwiOiBcIndlYXJlbm90YWZyYWlkXCIsXG5cdFx0XCJhdWRpb1wiOiB7XG5cdFx0XHRcInNyY1wiOiBcIjhcIixcblx0XHRcdFwibWF4XCI6IDAuNVxuXHRcdH1cblx0fSxcblx0e1xuXHRcdFwiaWRcIjogXCJ3ZWFyZWNvbWluZ1wiLFxuXHRcdFwiYXVkaW9cIjoge1xuXHRcdFx0XCJzcmNcIjogXCI5XCIsXG5cdFx0XHRcIm1heFwiOiAwLjVcblx0XHR9XG5cdH0sXG5cdHtcblx0XHRcImlkXCI6IFwibGlrZXBlYWNlXCIsXG5cdFx0XCJhdWRpb1wiOiB7XG5cdFx0XHRcInNyY1wiOiBcIjlcIixcblx0XHRcdFwibWF4XCI6IDAuMDFcblx0XHR9XG5cdH1cbl07XG5cblxuLyoqKioqKioqKioqKioqKioqXG4gKiogV0VCUEFDSyBGT09URVJcbiAqKiAuL34vanNvbi1sb2FkZXIhLi9zY2VuZXMvaW5kZXguanNvblxuICoqIG1vZHVsZSBpZCA9IDE2XG4gKiogbW9kdWxlIGNodW5rcyA9IDBcbiAqKi8iLCJ2YXIgbWFwID0ge1xuXHRcIi4vYWJvdXR5b3Vyc2VsZi9zY2VuZS5odG1sXCI6IDE4LFxuXHRcIi4vYmF0dGxlb2ZhZ2VuZXJhdGlvbi9zY2VuZS5odG1sXCI6IDE5LFxuXHRcIi4vY29tcGxpY2F0ZWRzaXR1YXRpb24vc2NlbmUuaHRtbFwiOiAyMCxcblx0XCIuL2RpZmZlcmVudHByYWN0aWNlcy9zY2VuZS5odG1sXCI6IDIxLFxuXHRcIi4vZG95b3VmZWVsbXVzbGltL3NjZW5lLmh0bWxcIjogMjIsXG5cdFwiLi9leHBsb3Npb24vc2NlbmUuaHRtbFwiOiAyMyxcblx0XCIuL2ZlZWxpbmdjb25mdXNlZC9zY2VuZS5odG1sXCI6IDI0LFxuXHRcIi4vaW50cm8vc2NlbmUuaHRtbFwiOiAyNSxcblx0XCIuL2lzaXNhZnRlcmxpZmVmYWxsYWN5L3NjZW5lLmh0bWxcIjogMjYsXG5cdFwiLi9pc2lzYXBvY2FseXBzZW1pc3F1b3RlL3NjZW5lLmh0bWxcIjogMjcsXG5cdFwiLi9pc2lzYmFua3J1cHQvc2NlbmUuaHRtbFwiOiAyOCxcblx0XCIuL2lzaXNmaWdodG1pc3F1b3RlL3NjZW5lLmh0bWxcIjogMjksXG5cdFwiLi9pc2lzb2JqZWN0aXZlL3NjZW5lLmh0bWxcIjogMzAsXG5cdFwiLi9pc2lzd2FudHN0b2RpdmlkZS9zY2VuZS5odG1sXCI6IDMxLFxuXHRcIi4vaXRpc250ZWFzeS9zY2VuZS5odG1sXCI6IDMyLFxuXHRcIi4vaXRzZ290dG9lbmQvc2NlbmUuaHRtbFwiOiAzMyxcblx0XCIuL2l3YW50bXlpc2xhbWJhY2sxL3NjZW5lLmh0bWxcIjogMzQsXG5cdFwiLi9saWtlcGVhY2Uvc2NlbmUuaHRtbFwiOiAzNSxcblx0XCIuL21peGVkZmVlbGluZ3Mvc2NlbmUuaHRtbFwiOiAzNixcblx0XCIuL211c2xpbXNiZWxpZXZlaW5kaXZpZHVhbGxpZmUvc2NlbmUuaHRtbFwiOiAzNyxcblx0XCIuL291dHRvZ2V0eW91L3NjZW5lLmh0bWxcIjogMzgsXG5cdFwiLi9yZWFjdGlvbnN0b3RlcnJvci9zY2VuZS5odG1sXCI6IDM5LFxuXHRcIi4vc29tZXRoaW5ndG9wcm92ZS9zY2VuZS5odG1sXCI6IDQwLFxuXHRcIi4vd2VhcmVjb21pbmcvc2NlbmUuaHRtbFwiOiA0MSxcblx0XCIuL3dlYXJlbm90YWZyYWlkL3NjZW5lLmh0bWxcIjogNDIsXG5cdFwiLi93ZXdpbGxwcm90ZWN0ZWFjaG90aGVyL3NjZW5lLmh0bWxcIjogNDMsXG5cdFwiLi93aGF0aXNsYW1pY2hpc3RvcnlwcmVmZXJzL3NjZW5lLmh0bWxcIjogNDQsXG5cdFwiLi93aGF0dGhlcXVyYW5wcmVmZXJzL3NjZW5lLmh0bWxcIjogNDUsXG5cdFwiLi93aG9hcmV0aGV5L3NjZW5lLmh0bWxcIjogNDYsXG5cdFwiLi93aXRoYWxsdGhlaGF0cmVkL3NjZW5lLmh0bWxcIjogNDcsXG5cdFwiLi95ZXR0aGF0c29rYXkvc2NlbmUuaHRtbFwiOiA0OFxufTtcbmZ1bmN0aW9uIHdlYnBhY2tDb250ZXh0KHJlcSkge1xuXHRyZXR1cm4gX193ZWJwYWNrX3JlcXVpcmVfXyh3ZWJwYWNrQ29udGV4dFJlc29sdmUocmVxKSk7XG59O1xuZnVuY3Rpb24gd2VicGFja0NvbnRleHRSZXNvbHZlKHJlcSkge1xuXHRyZXR1cm4gbWFwW3JlcV0gfHwgKGZ1bmN0aW9uKCkgeyB0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiICsgcmVxICsgXCInLlwiKSB9KCkpO1xufTtcbndlYnBhY2tDb250ZXh0LmtleXMgPSBmdW5jdGlvbiB3ZWJwYWNrQ29udGV4dEtleXMoKSB7XG5cdHJldHVybiBPYmplY3Qua2V5cyhtYXApO1xufTtcbndlYnBhY2tDb250ZXh0LnJlc29sdmUgPSB3ZWJwYWNrQ29udGV4dFJlc29sdmU7XG5tb2R1bGUuZXhwb3J0cyA9IHdlYnBhY2tDb250ZXh0O1xud2VicGFja0NvbnRleHQuaWQgPSAxNztcblxuXG5cbi8qKioqKioqKioqKioqKioqKlxuICoqIFdFQlBBQ0sgRk9PVEVSXG4gKiogLi9zY2VuZXMgLi9+L2h0bWwtbG9hZGVyP2F0dHJzPWZhbHNlIV5cXC5cXC8uKlxcL3NjZW5lXFwuaHRtbCRcbiAqKiBtb2R1bGUgaWQgPSAxN1xuICoqIG1vZHVsZSBjaHVua3MgPSAwXG4gKiovIiwibW9kdWxlLmV4cG9ydHMgPSBcIjxzdHlsZT5cXG4uYWJvdXQteW91cnNlbGYge1xcbiAgICBvcGFjaXR5OiAwO1xcbn1cXG48L3N0eWxlPlxcblxcbjxkaXYgY2xhc3M9XFxcImFib3V0LXlvdXJzZWxmXFxcIj5cXG4gIDxkaXYgY2xhc3M9XFxcInRhYmxlXFxcIj5cXG4gICAgPGRpdiBjbGFzcz1cXFwidGFibGUtY2VudGVyXFxcIj5cXG4gICAgICA8ZGl2IGNsYXNzPVxcXCJkaXNwbGF5LTQgdGV4dC1jZW50ZXJlZFxcXCI+SG93IGRvIHlvdSBmZWVsIGFib3V0IHlvdXJzZWxmPzwvZGl2PlxcbiAgICA8L2Rpdj5cXG4gIDwvZGl2PlxcbjwvZGl2PlwiO1xuXG5cbi8qKioqKioqKioqKioqKioqKlxuICoqIFdFQlBBQ0sgRk9PVEVSXG4gKiogLi9+L2h0bWwtbG9hZGVyP2F0dHJzPWZhbHNlIS4vc2NlbmVzL2Fib3V0eW91cnNlbGYvc2NlbmUuaHRtbFxuICoqIG1vZHVsZSBpZCA9IDE4XG4gKiogbW9kdWxlIGNodW5rcyA9IDBcbiAqKi8iLCJtb2R1bGUuZXhwb3J0cyA9IFwiXFxuPGRpdiBjbGFzcz1cXFwiYmF0dGxlLW9mLWEtZ2VuZXJhdGlvbiBncmV5LXpvbmVcXFwiPlxcblxcdDxkaXYgY2xhc3M9XFxcInRhYmxlIFxcXCI+XFxuICBcXHRcXHQ8ZGl2IGNsYXNzPVxcXCJ0YWJsZS1jZW50ZXJcXFwiPlxcbiAgICBcXHRcXHQ8ZGl2IGNsYXNzPVxcXCJkaXNwbGF5LTQgdGV4dC1jZW50ZXJlZFxcXCI+V2UgbXVzdCBiZWdpbiBvdXIgZmlnaHQgZm9yIHRoaXMgZ2VuZXJhdGlvbi48L2Rpdj5cXG4gIFxcdFxcdDwvZGl2PlxcblxcdDwvZGl2PlxcbjwvZGl2PlxcblwiO1xuXG5cbi8qKioqKioqKioqKioqKioqKlxuICoqIFdFQlBBQ0sgRk9PVEVSXG4gKiogLi9+L2h0bWwtbG9hZGVyP2F0dHJzPWZhbHNlIS4vc2NlbmVzL2JhdHRsZW9mYWdlbmVyYXRpb24vc2NlbmUuaHRtbFxuICoqIG1vZHVsZSBpZCA9IDE5XG4gKiogbW9kdWxlIGNodW5rcyA9IDBcbiAqKi8iLCJtb2R1bGUuZXhwb3J0cyA9IFwiXFxuPHN0eWxlPlxcbiAgLmxlZnQsIC5yaWdodCB7XFxuICAgIGZsb2F0OiBsZWZ0O1xcbiAgfVxcbiAgLnRhYmxlIHtcXG4gICAgcG9zaXRpb246IHJlbGF0aXZlO1xcbiAgfVxcbiAgLnRvby1sb25nLXF1b3RlIHtcXG4gICAgcG9zaXRpb246IGZpeGVkO1xcbiAgICB0b3A6IDA7XFxuICAgIGxlZnQ6IDA7XFxuICAgIGZvbnQtc2l6ZTogNi41dm1pbjtcXG4gICAgdGV4dC1hbGlnbjogY2VudGVyO1xcbiAgICBjb2xvcjogcmdiYSgyNTUsMjU1LDI1NSwwLjMpO1xcbiAgICB3aWR0aDogMTAwJTtcXG4gICAgaGVpZ2h0OiAxMDAlO1xcbiAgICBvdmVyZmxvdzogaGlkZGVuO1xcbiAgICAvKmJhY2tncm91bmQ6ICMzMzM7Ki9cXG4gICAgcGFkZGluZy10b3A6IDR2bWF4O1xcbiAgICAtd2Via2l0LWZpbHRlcjogYmx1cigycHgpO1xcbiAgfVxcbiAgLnRleHQtY2VudGVyZWQge1xcbiAgICB0ZXh0LWFsaWduOiBjZW50ZXI7XFxuICB9XFxuICAub25Ub3Age1xcbiAgICB6LWluZGV4OiAyMDAwMDtcXG4gIH1cXG48L3N0eWxlPlxcblxcbjxkaXYgY2xhc3M9XFxcImdyZXktem9uZVxcXCI+XFxuICA8ZGl2IGNsYXNzPVxcXCJ0b28tbG9uZy1xdW90ZVxcXCI+XFxuICAgIDxzdHJvbmc+VGhlIGZhaWx1cmU8L3N0cm9uZz4gb2YgdGhlIHBvc3Rjb2xvbmlhbCBlbGl0ZXMgdG8gPHN0cm9uZz5jcmVhdGUgZ2VudWluZSBkZW1vY3JhdGljIHNvY2lldGllczwvc3Ryb25nPiBhbmQgZm9zdGVyIGEgc2Vuc2Ugb2YgbmF0aW9uYWwgdW5pdHkgPHN0cm9uZz5vcHRpbmcgaW5zdGVhZCBmb3IgbWlsaXRhcnkgZGljdGF0b3JzaGlwczwvc3Ryb25nPiB0aGF0IDxzdHJvbmc+ZXJvZGVkIHRoZSBwb3RlbnRpYWwgZm9yIGVjb25vbWljIGFuZCBwb2xpdGljYWwgZGV2ZWxvcG1lbnQ8L3N0cm9uZz4gY291cGxlZCB3aXRoIHRoZSBoaXN0b3JpYyBtaXN0YWtlcyBvZiBBcmFiaWMgcHJvZ3Jlc3NpdmUgcGFydGllcyBhbmQgdGhlaXIgPHN0cm9uZz5hcHBlYXNlbWVudCB0b3dhcmRzIGF1dG9jcmF0aWMgcnVsZXJzPC9zdHJvbmc+IGNvbnRyaWJ1dGluZyB0byB0aGUgPHN0cm9uZz5jb21wbGV0ZSBldmlzY2VyYXRpb24gb2YgYWx0ZXJuYXRpdmUgcG9saXRpY2FsIGZyYW1ld29ya3M8L3N0cm9uZz4gdGhhdCBjb3VsZCBjcmVhdGUgb3JnYW5pYyByZXNpc3RhbmNlIHRvd2FyZHMgZXh0ZXJuYWwgbWVkZGxpbmcsIGhlZ2Vtb255IGFuZCBvdXRyaWdodCBtaWxpdGFyeSBpbnRlcnZlbnRpb25zIGxlYXZpbmcgYSA8c3Ryb25nPnJhZGljYWwgaW50ZXJwcmV0YXRpb24gb2YgcmVsaWdpb24gYXMgdGhlIG9ubHkgcmVtYWluaW5nIGlkZW9sb2dpY2FsIHBsYXRmb3JtIGNhcGFibGUgb2YgbW9iaWxpc2luZyB0aGUgZGlzZW5mcmFuY2hpc2VkPC9zdHJvbmc+IGV4YWNlcmJhdGVkIGJ5IHRoZSBnbG9iYWwgZGVjbGluZSBvZiB1bml2ZXJzYWwgaWRlYWxzIGFuZCB0aGUgPHN0cm9uZz5yaXNlIG9mIGlkZW50aXR5IGFzIGEgcHJpbWUgbW9iaWxpc2VyPC9zdHJvbmc+IGFuZCBlbmFibGVkIGJ5IHBvbGl0aWNhbCBhbmQgPHN0cm9uZz5maW5hbmNpYWwgc3VwcG9ydCBmcm9tIHRoZW9jcmF0aWMgcmVnaW1lczwvc3Ryb25nPiBhaW1pbmcgdG8gc2hvcmUgdXAgdGhlaXIgbGVnaXRpbWFjeSBhbmQgbWFkZSB3b3JzZSBieSB0aGUgPHN0cm9uZz5jb2xsYXBzZSBvZiB0aGUgcmVnaW9uYWwgc2VjdXJpdHk8L3N0cm9uZz4gb3JkZXIgY3JlYXRpbmcgdGhlIGNvbmRpdGlvbnMgZm9yIDxzdHJvbmc+cHJveHkgd2Fyczwvc3Ryb25nPiBhbmQgcG9saXRpY2FsLCBzb2NpYWwgYW5kIGVjb25vbWljIHVwaGVhdmFsIGludGVuc2lmaWVkIGJ5IGdlby1wb2xpdGljYWxseSA8c3Ryb25nPmluY29oZXJlbnQgaW50ZXJuYXRpb25hbCBtZWRkbGluZzwvc3Ryb25nPiBlc2NhbGF0aW5nIGNvbmZsaWN0cyBhbmQgbGVhZGluZyB0byBhIDxzdHJvbmc+cGVycGV0dWFsIHN0YXRlIG9mIGNoYW9zPC9zdHJvbmc+IHVuZGVyIHdoaWNoIHRoZSBhcHBlYWwgb2YgYSByZXZpdmFsaXN0IHJlbGlnaW91cy1wb2xpdGljYWwgb3JkZXIgZW1ib2RpZWQgYnkgdGhlIDxzdHJvbmc+Y2FsaXBoYXRlIGJlY29tZXMgYXR0cmFjdGl2ZTwvc3Ryb25nPiBwYXJ0aWN1bGFybHkgd2hlbiBjb3VwbGVkIHdpdGggYSBtaWxsZW5hcmlhbiBhcG9jYWx5cHRpYyBuYXJyYXRpdmUuXFxuICA8L2Rpdj5cXG4gIDxkaXYgY2xhc3M9XFxcInRhYmxlIG9uVG9wIFxcXCI+XFxuICAgIDxkaXYgY2xhc3M9XFxcInRhYmxlLWNlbnRlclxcXCI+XFxuICAgICAgPGRpdiBjbGFzcz1cXFwiZGlzcGxheS00IHRleHQtY2VudGVyZWRcXFwiPlRoZSBzaXR1YXRpb24gbWF5IGJlIGNvbXBsaWNhdGVkLi4uPC9kaXY+XFxuICAgIDwvZGl2PlxcbiAgPC9kaXY+XFxuPC9kaXY+XFxuXCI7XG5cblxuLyoqKioqKioqKioqKioqKioqXG4gKiogV0VCUEFDSyBGT09URVJcbiAqKiAuL34vaHRtbC1sb2FkZXI/YXR0cnM9ZmFsc2UhLi9zY2VuZXMvY29tcGxpY2F0ZWRzaXR1YXRpb24vc2NlbmUuaHRtbFxuICoqIG1vZHVsZSBpZCA9IDIwXG4gKiogbW9kdWxlIGNodW5rcyA9IDBcbiAqKi8iLCJtb2R1bGUuZXhwb3J0cyA9IFwiPGRpdiBjbGFzcz1cXFwidGFibGVcXFwiPlxcbiAgPGRpdiBjbGFzcz1cXFwidGFibGUtY2VudGVyXFxcIj5cXG4gICAgPGRpdiBjbGFzcz1cXFwiZGlzcGxheS00IHRleHQtY2VudGVyZWRcXFwiPlRpcmVkIG9mIHNlZWluZyBhdHRhY2tzIGluY3JlYXNlLiA8YnI+PGJyPlxcbiAgICAgIFRpcmVkIG9mIGZlZWxpbmcgYXBvbG9nZXRpYy48L2Rpdj5cXG4gIDwvZGl2PlxcbjwvZGl2PlxcblwiO1xuXG5cbi8qKioqKioqKioqKioqKioqKlxuICoqIFdFQlBBQ0sgRk9PVEVSXG4gKiogLi9+L2h0bWwtbG9hZGVyP2F0dHJzPWZhbHNlIS4vc2NlbmVzL2RpZmZlcmVudHByYWN0aWNlcy9zY2VuZS5odG1sXG4gKiogbW9kdWxlIGlkID0gMjFcbiAqKiBtb2R1bGUgY2h1bmtzID0gMFxuICoqLyIsIm1vZHVsZS5leHBvcnRzID0gXCI8c3R5bGU+XFxuICAjZG95b3VmZWVsbXVzbGltIC5hbmltLTIge1xcbiAgICBvcGFjaXR5OiAwO1xcbiAgfVxcbiAgLnZpZGVvLWJhY2tncm91bmQgdmlkZW8ge1xcbiAgICB3aWR0aDogMTAwdnc7XFxuICB9XFxuICAudmlkZW8tYmFja2dyb3VuZCB7XFxuICAgIHBvc2l0aW9uOiBmaXhlZDtcXG4gICAgdG9wOiAwO1xcbiAgICBsZWZ0OiAwO1xcbiAgfVxcbiAgI2RveW91ZmVlbG11c2xpbSAuZGlzcGxheS00IHtcXG4gICAgYmFja2dyb3VuZDogYmxhY2s7XFxuICAgIGRpc3BsYXk6IGlubGluZS1ibG9jaztcXG4gICAgcGFkZGluZzogMC41dnc7XFxuICB9XFxuPC9zdHlsZT5cXG48ZGl2IGNsYXNzPVxcXCJ2aWRlby1iYWNrZ3JvdW5kXFxcIj5cXG4gIDx2aWRlbyBsb29wIG1heC12b2x1bWU9XFxcIjAuMTdcXFwiID5cXG4gICAgPHNvdXJjZSBzcmM9XFxcImltZy90ZXJyb3Jpc3QtYXR0YWNrcy5tcDRcXFwiIHR5cGU9XFxcInZpZGVvL21wNFxcXCI+XFxuICA8L3ZpZGVvPlxcbjwvZGl2PlxcbjxkaXYgY2xhc3M9XFxcInRhYmxlXFxcIj5cXG4gIDxkaXYgY2xhc3M9XFxcInRhYmxlLWNlbnRlclxcXCI+XFxuICAgIDxkaXYgY2xhc3M9XFxcImRpc3BsYXktNCBhbmltLTFcXFwiPkhvdyBkbyB5b3UgZmVlbCBhYm91dCB5b3VyIElzbGFtPzwvZGl2PjxiciAvPjxiciAvPlxcbiAgPC9kaXY+XFxuPC9kaXY+XFxuXCI7XG5cblxuLyoqKioqKioqKioqKioqKioqXG4gKiogV0VCUEFDSyBGT09URVJcbiAqKiAuL34vaHRtbC1sb2FkZXI/YXR0cnM9ZmFsc2UhLi9zY2VuZXMvZG95b3VmZWVsbXVzbGltL3NjZW5lLmh0bWxcbiAqKiBtb2R1bGUgaWQgPSAyMlxuICoqIG1vZHVsZSBjaHVua3MgPSAwXG4gKiovIiwibW9kdWxlLmV4cG9ydHMgPSBcIjxwIGNsYXNzPVxcXCJleHBsb3Npb24tYnlsaW5lXFxcIj5IZXJlJ3MgYW4gZXhhbXBsZSBvZiAxNiBlbGVtZW50cyBzY2FsaW5nLCBmYWRpbmcgYW5kIG1vdmluZyBhdCBvbmNlLjwvcD5cXG48dWwgaWQ9XFxcImRvbUV4cGxvc2lvbkxpc3RcXFwiPlxcbiAgPGxpIGNsYXNzPVxcXCJkb20tZXhwbG9zaW9uLWl0ZW0gZGVpLTFcXFwiPjwvbGk+XFxuICA8bGkgY2xhc3M9XFxcImRvbS1leHBsb3Npb24taXRlbSBkZWktMlxcXCI+PC9saT5cXG4gIDxsaSBjbGFzcz1cXFwiZG9tLWV4cGxvc2lvbi1pdGVtIGRlaS0zXFxcIj48L2xpPlxcbiAgPGxpIGNsYXNzPVxcXCJkb20tZXhwbG9zaW9uLWl0ZW0gZGVpLTRcXFwiPjwvbGk+XFxuICA8bGkgY2xhc3M9XFxcImRvbS1leHBsb3Npb24taXRlbSBkZWktNVxcXCI+PC9saT5cXG4gIDxsaSBjbGFzcz1cXFwiZG9tLWV4cGxvc2lvbi1pdGVtIGRlaS02XFxcIj48L2xpPlxcbiAgPGxpIGNsYXNzPVxcXCJkb20tZXhwbG9zaW9uLWl0ZW0gZGVpLTdcXFwiPjwvbGk+XFxuICA8bGkgY2xhc3M9XFxcImRvbS1leHBsb3Npb24taXRlbSBkZWktOFxcXCI+PC9saT5cXG4gIDxsaSBjbGFzcz1cXFwiZG9tLWV4cGxvc2lvbi1pdGVtIGRlaS05XFxcIj48L2xpPlxcbiAgPGxpIGNsYXNzPVxcXCJkb20tZXhwbG9zaW9uLWl0ZW0gZGVpLTEwXFxcIj48L2xpPlxcbiAgPGxpIGNsYXNzPVxcXCJkb20tZXhwbG9zaW9uLWl0ZW0gZGVpLTExXFxcIj48L2xpPlxcbiAgPGxpIGNsYXNzPVxcXCJkb20tZXhwbG9zaW9uLWl0ZW0gZGVpLTEyXFxcIj48L2xpPlxcbiAgPGxpIGNsYXNzPVxcXCJkb20tZXhwbG9zaW9uLWl0ZW0gZGVpLTEzXFxcIj48L2xpPlxcbiAgPGxpIGNsYXNzPVxcXCJkb20tZXhwbG9zaW9uLWl0ZW0gZGVpLTE0XFxcIj48L2xpPlxcbiAgPGxpIGNsYXNzPVxcXCJkb20tZXhwbG9zaW9uLWl0ZW0gZGVpLTE1XFxcIj48L2xpPlxcbiAgPGxpIGNsYXNzPVxcXCJkb20tZXhwbG9zaW9uLWl0ZW0gZGVpLTE2XFxcIj48L2xpPlxcbjwvdWw+XFxuXCI7XG5cblxuLyoqKioqKioqKioqKioqKioqXG4gKiogV0VCUEFDSyBGT09URVJcbiAqKiAuL34vaHRtbC1sb2FkZXI/YXR0cnM9ZmFsc2UhLi9zY2VuZXMvZXhwbG9zaW9uL3NjZW5lLmh0bWxcbiAqKiBtb2R1bGUgaWQgPSAyM1xuICoqIG1vZHVsZSBjaHVua3MgPSAwXG4gKiovIiwibW9kdWxlLmV4cG9ydHMgPSBcIjxzdHlsZT5cXG4udXMtYWdhaW5zdC10aGVtIHtcXG4gICAgb3BhY2l0eTogMDtcXG59XFxuPC9zdHlsZT5cXG5cXG48ZGl2IGNsYXNzPVxcXCJ1cy1hZ2FpbnN0LXRoZW1cXFwiPlxcblxcdDxkaXYgY2xhc3M9XFxcInRhYmxlXFxcIj5cXG5cXHQgIDxkaXYgY2xhc3M9XFxcInRhYmxlLWNlbnRlclxcXCI+XFxuXFx0ICAgIDxkaXYgY2xhc3M9XFxcImRpc3BsYXktNCB0ZXh0LWNlbnRlcmVkXFxcIj5GZWVscyBsaWtlIGl0J3MgdXMgYWdhaW5zdCB0aGVtLi4uPC9kaXY+XFxuXFx0ICA8L2Rpdj5cXG5cXHQ8L2Rpdj5cXG48L2Rpdj5cIjtcblxuXG4vKioqKioqKioqKioqKioqKipcbiAqKiBXRUJQQUNLIEZPT1RFUlxuICoqIC4vfi9odG1sLWxvYWRlcj9hdHRycz1mYWxzZSEuL3NjZW5lcy9mZWVsaW5nY29uZnVzZWQvc2NlbmUuaHRtbFxuICoqIG1vZHVsZSBpZCA9IDI0XG4gKiogbW9kdWxlIGNodW5rcyA9IDBcbiAqKi8iLCJtb2R1bGUuZXhwb3J0cyA9IFwiPHN0eWxlPlxcbi8qI2ludHJvIHtcXG4gIHBvc2l0aW9uOiBmaXhlZDtcXG4gIHRvcDogMTV2aDtcXG4gIGxlZnQ6IDEwJTtcXG4gIHdpZHRoOiA4MCU7XFxuICBjb2xvcjogI2ZmZjtcXG4gIHRleHQtYWxpZ246IGNlbnRlcjtcXG4gIHRleHQtdHJhbnNmb3JtOiB1cHBlcmNhc2U7XFxufSovXFxuLmhlbHAtdGV4dCB7XFxuXFx0cG9zaXRpb246IGFic29sdXRlO1xcblxcdGNvbG9yOiAjMjlkO1xcblxcdGZvbnQtc2l6ZTogM3ZtaW47XFxufVxcbi5oZWxwLXRleHQtc2tpbiB7XFxuXFx0Y29sb3I6ICMyOWQ7XFxuXFx0Zm9udC1zaXplOiAzdm1pbjtcXG59XFxuLyouaGVscC10ZXh0IGkge1xcblxcdGZvbnQtc2l6ZTogNXZtaW47XFxufSovXFxuLmJldGEge1xcblxcdG9wYWNpdHk6IDAuNztcXG5cXHRmb250LXNpemU6IDQuNXZtaW47XFxufVxcblxcbi5mZWVkYmFjay1idXR0b24ge1xcblxcdGZvbnQtd2VpZ2h0OiBib2xkO1xcblxcdCAgICBmb250LXNpemU6IDMuNXZtaW47XFxuXFx0ICAgIGJhY2tncm91bmQ6ICMyMjk5REQ7XFxuXFx0ICAgIHBhZGRpbmc6IDByZW07XFxuXFx0ICAgIGRpc3BsYXk6IGlubGluZTtcXG5cXHQgICAgcGFkZGluZzogMXZtaW47XFxuXFx0ICAgIGJvcmRlci1yYWRpdXM6IDF2bWluO1xcbn1cXG48L3N0eWxlPlxcbjxkaXYgY2xhc3M9XFxcImludHJvXFxcIj5cXG5cXHQ8ZGl2IGNsYXNzPVxcXCJ0YWJsZSBcXFwiPlxcbiAgXFx0XFx0PGRpdiBjbGFzcz1cXFwidGFibGUtY2VudGVyXFxcIj5cXG4gICAgXFx0XFx0PGRpdiBjbGFzcz1cXFwiZGlzcGxheS0xIHRleHQtY2VudGVyZWRcXFwiPlxcblxcdFxcdFxcdFxcdFxcdDxkaXYgY2xhc3M9XFxcImJldGEgYW5pbWF0ZWQgZmxhc2hcXFwiICBzdHlsZT1cXFwiYW5pbWF0aW9uLWRlbGF5OiAxLjVzO1xcXCI+UGFyZG9uIE91ciBEdXN0LiBXZSBBcmUgQ3VycmVudGx5IEJldGEgVGVzdGluZy48L2Rpdj4gPGJyPjxhIHRhcmdldD1cXFwiX2JsYW5rXFxcIiBjbGFzcz1cXFwiZmVlZGJhY2stYnV0dG9uXFxcIiBocmVmPVxcXCJtYWlsdG86bXVzbGltc2FnYWluc3Rpc2lzZ3JvdXBAZ21haWwuY29tP3N1YmplY3Q9VGVjaGluY2FsIEZlZWRiYWNrXFxcIj5TdWJtaXQgVGVjaG5pY2FsIEZlZWRiYWNrPC9hPjxicj48YnI+PGJyPlxcblxcblxcdFxcdFxcdFxcdFxcdDxpIGNsYXNzPVxcXCJmYSBmYS1tdXNpYyBcXFwiPjwvaT48YnI+PGJyPlxcblxcdFxcdFxcdFxcdFxcdDxiciA+PGJyPlxcbiAgICBcXHRcXHRcXHRQbGF5LCBza2lwLCBvciBzY3JvbGwgdG8gYmVnaW4gPGJyID5cXG5cXHRcXHRcXHRcXHRcXHQ8c3BhbiBjbGFzcz1cXFwiaGVscC10ZXh0LXNraW5cXFwiPlxcblxcdFxcdFxcdFxcdFxcdFxcdEFsbCBxdW90ZXMgYW5kIG5ld3Mgc291cmNlcyBhcmUgY2xpY2thYmxlLlxcblxcdFxcdFxcdFxcdFxcdDwvc3Bhbj5cXG5cXHRcXHRcXHQ8L2Rpdj5cXG4gIFxcdFxcdDwvZGl2PlxcblxcdDwvZGl2PlxcbjwvZGl2PlxcblxcbjxkaXYgY2xhc3M9XFxcImhlbHAtdGV4dFxcXCIgc3R5bGU9XFxcInRvcDogNHZtaW47cmlnaHQ6IDE2dm1pbjtcXFwiPlxcblxcdDxzcGFuIGNsYXNzPVxcXCJhbmltYXRlZCAgXFxcIiBzdHlsZT1cXFwiYW5pbWF0aW9uLWRlbGF5OiAycztcXFwiID5QbGF5L1BhdXNlIDxpIGNsYXNzPVxcXCJmYSBmYS1hcnJvdy1jaXJjbGUtcmlnaHRcXFwiPjwvaT48L3NwYW4+XFxuPC9kaXY+XFxuPGRpdiBjbGFzcz1cXFwiaGVscC10ZXh0XFxcIiBzdHlsZT1cXFwidG9wOiAxNC41dmg7cmlnaHQ6IDE2dm1pbjtcXFwiPlxcblxcdDxzcGFuIGNsYXNzPVxcXCJhbmltYXRlZCAgXFxcIiBzdHlsZT1cXFwiYW5pbWF0aW9uLWRlbGF5OiAycztcXFwiID5Ta2lwIDxpIGNsYXNzPVxcXCJmYSBmYS1hcnJvdy1jaXJjbGUtcmlnaHRcXFwiPjwvaT48L3NwYW4+XFxuPC9kaXY+XFxuXFxuPGRpdiBjbGFzcz1cXFwiaGVscC10ZXh0XFxcIiBzdHlsZT1cXFwiYm90dG9tOjN2aDtyaWdodDo0OHZ3O3RleHQtYWxpZ246Y2VudGVyXFxcIj5cXG5cXHQ8ZGl2IGNsYXNzPVxcXCJhbmltYXRlZCAgXFxcIiBzdHlsZT1cXFwiYW5pbWF0aW9uLWRlbGF5OiAycztcXFwiPjxkaXYgc3R5bGU9XFxcInBhZGRpbmctYm90dG9tOiAxdmg7XFxcIj5TY3JvbGw8L2Rpdj4gPGkgY2xhc3M9XFxcImZhIGZhLWFycm93LWNpcmNsZS1kb3duXFxcIj48L2k+PC9kaXY+XFxuPC9kaXY+XFxuXCI7XG5cblxuLyoqKioqKioqKioqKioqKioqXG4gKiogV0VCUEFDSyBGT09URVJcbiAqKiAuL34vaHRtbC1sb2FkZXI/YXR0cnM9ZmFsc2UhLi9zY2VuZXMvaW50cm8vc2NlbmUuaHRtbFxuICoqIG1vZHVsZSBpZCA9IDI1XG4gKiogbW9kdWxlIGNodW5rcyA9IDBcbiAqKi8iLCJtb2R1bGUuZXhwb3J0cyA9IFwiPHN0eWxlPlxcbiAgLnRhYmxlIGlucHV0IHtcXG4gICAgZm9udC1zaXplOiA5LjV2bWluO1xcbiAgICB3aWR0aDogNXZ3O1xcbiAgICBiYWNrZ3JvdW5kOiBibGFjaztcXG4gICAgYm9yZGVyOiBub25lO1xcbiAgICBjb2xvcjogd2hpdGU7XFxuICAgIGZvbnQtd2VpZ2h0OiBib2xkO1xcbiAgfVxcbiAgLmxlZnQtYWxpZ24gLnF1cmFuLXJlYWQge1xcbiAgICB0ZXh0LWFsaWduOiBsZWZ0O1xcbiAgfVxcbiAgLmNhbGN1bGF0b3Ige1xcbiAgICBiYWNrZ3JvdW5kOiBibGFjaztcXG4gICAgd2lkdGg6IDQ4dnc7XFxuICAgIG1hcmdpbjogMCBhdXRvO1xcbiAgICBwYWRkaW5nOiAydnc7XFxuICAgIG9wYWNpdHk6IDA7XFxuICB9XFxuICAjaXNpc2FmdGVybGlmZWZhbGxhY3kgLnF1b3RlIHtcXG4gICAgZm9udC1zdHlsZTogaXRhbGljO1xcbiAgfVxcbiAgLmVxdWFscy1jb250YWluZXIge1xcbiAgICB3aWR0aDogMTAwJTtcXG4gICAgcG9zaXRpb246IHJlbGF0aXZlO1xcbiAgICBwYWRkaW5nOiAzdm1pbiAwO1xcbiAgfVxcbiAgLmVxdWFscyB7XFxuICAgIHdpZHRoOiA4M3ZtaW47XFxuICAgIHBvc2l0aW9uOiBhYnNvbHV0ZTtcXG4gICAgYm9yZGVyOiAwLjJ2dyBzb2xpZDtcXG4gICAgcmlnaHQ6IDA7XFxuICB9XFxuICAuZXF1YWxzOmFmdGVyIHtcXG4gICAgY2xlYXI6IGJvdGg7XFxuICB9XFxuICAudGV4dC1yaWdodCB7XFxuICAgIHRleHQtYWxpZ246IHJpZ2h0O1xcbiAgfVxcbiAgLnRleHQtYm9sZCB7XFxuICAgIGZvbnQtd2VpZ2h0OiA3MDA7XFxuICB9XFxuPC9zdHlsZT5cXG5cXG48ZGl2IGNsYXNzPVxcXCJ0YWJsZVxcXCI+XFxuICA8ZGl2IGNsYXNzPVxcXCJ0YWJsZS1jZW50ZXJcXFwiIHN0eWxlPVxcXCJ3aWR0aDo1MCVcXFwiPlxcbiAgICA8ZGl2IGNsYXNzPVxcXCJkaXNwbGF5LTIgcHJlbWlzZSB0ZXh0LWJvbGRcXFwiPklTSVMgbWF5IGtpbGwgaW5ub2NlbnQgcGVvcGxlIGluZGlzY3JpbWluYXRlbHkuLi48L2Rpdj48YnI+PGJyPlxcbiAgICA8ZGl2IGNsYXNzPVxcXCJkaXNwbGF5LTIgY29uY2x1c2lvbiB0ZXh0LWJvbGRcXFwiPkhhdmUgdGhleSBldmVuIGltYWdpbmVkIGhvdyBoYXJhbSAoc2luZnVsKSB0aGF0IGlzPzwvZGl2PlxcbiAgPC9kaXY+XFxuICA8ZGl2IGNsYXNzPVxcXCJ0YWJsZS1jZW50ZXJcXFwiIHN0eWxlPVxcXCJ3aWR0aDo1MFxcXCI+XFxuICAgIDxkaXYgY2xhc3M9XFxcImRpc3BsYXktMyB0ZXh0LXJpZ2h0IGNhbGN1bGF0b3JcXFwiPlxcbiAgICAgIElmIHlvdSd2ZSBtdXJkZXJlZCA8aW5wdXQgdHlwZT1cXFwibnVtYmVyXFxcIiBpZD1cXFwibXVyZGVybnVtYmVyXFxcIiB2YWx1ZT1cXFwiMVxcXCIgbWluPVxcXCIxXFxcIiBzaXplPVxcXCIyXFxcIiAvPjwvc3Ryb25nPlxcbiAgICAgIDxkaXYgY2xhc3M9XFxcImRpc3BsYXktMSBlbXBoYXNpcyBjb25jbHVzaW9uXFxcIj5cXG4gICAgICAgICAgPGEgaHJlZj1cXFwiaHR0cDovL3F1cmFuLmNvbS81LzMyXFxcIiB0YXJnZXQ9XFxcIl9ibGFua1xcXCI+XFxuICAgICAgICAgICAgPHN0cm9uZz4uLi53aG9ldmVyIGtpbGxzIGEgc291bCAuLi4gaXQgaXMgYXMgaWYgaGUgaGFkIHNsYWluIG1hbmtpbmQgZW50aXJlbHkuPC9zdHJvbmc+XFxuICAgICAgICAgICAgPHNwYW4gY2xhc3M9XFxcInF1b3RlLXNvdXJjZSBjb25jbHVzaW9uXFxcIj5RdXInYW4gNTozMjwvc3Bhbj5cXG4gICAgICAgICAgPC9hPlxcbiAgICAgIDwvZGl2PiAgPGRpdj4qIDcgYmlsbGlvbiBwZW9wbGU8L2Rpdj48YnIgPlxcbiAgICAgIDxkaXYgY2xhc3M9XFxcImVxdWFscy1jb250YWluZXJcXFwiPlxcbiAgICAgICAgPGhyIGNsYXNzPVxcXCJlcXVhbHNcXFwiPjxiciA+XFxuICAgICAgPC9kaXY+XFxuICAgICAgVGhlIHdlaWdodCBvZiBtdXJkZXJpbmcgPGJyPiA8c3Ryb25nPjxzcGFuIGlkPVxcXCJtdXJkZXJ0b3RhbFxcXCI+PC9zcGFuPiBwZW9wbGUuPC9zdHJvbmc+PC9kaXY+XFxuICA8L2Rpdj5cXG48L2Rpdj5cXG5cXG48IS0tIFRPRE86IE1vdmUgdG8gYSBuZXcgc2NyaXB0LiAtLT5cXG5cXG48c2NyaXB0PlxcbiAgJChmdW5jdGlvbigpIHtcXG5cXG4gICAgdmFyIFBPUFVMQVRJT05fVE9UQUwgPSA3MDAwMDAwMDAwO1xcblxcbiAgICAvLyBpbml0aWFsaWF6ZVxcbiAgICB1cGRhdGVNdXJkZXJDYWxjdWxhdG9yKCk7XFxuXFxuICAgICQoXFxcIiNtdXJkZXJudW1iZXJcXFwiKS5vbignY2hhbmdlJywgZnVuY3Rpb24oKSB7XFxuICAgICAgdXBkYXRlTXVyZGVyQ2FsY3VsYXRvcigpXFxuICAgIH0pO1xcblxcbiAgICAkKFxcXCIjbXVyZGVybnVtYmVyXFxcIikub24oJ3Njcm9sbCcsIGZ1bmN0aW9uKCkge1xcbiAgICAgIGNvbnNvbGUubG9nKCdibHVyJylcXG4gICAgICAkKHRoaXMpLmJsdXIoKTtcXG4gICAgfSk7XFxuXFxuICAgIGZ1bmN0aW9uIHVwZGF0ZU11cmRlckNhbGN1bGF0b3IoKSB7XFxuICAgICAgdmFyIG11cmRlcm51bWJlciA9ICQoXFxcIiNtdXJkZXJudW1iZXJcXFwiKS52YWwoKTtcXG4gICAgICB2YXIgbXVyZGVyVG90YWwgID0gbXVyZGVybnVtYmVyICogUE9QVUxBVElPTl9UT1RBTDtcXG4gICAgICByZW5kZXIobXVyZGVyVG90YWwpO1xcbiAgICB9XFxuXFxuICAgIGZ1bmN0aW9uIHJlbmRlcihtdXJkZXJUb3RhbCkge1xcbiAgICAgICQoJyNtdXJkZXJ0b3RhbCcpLmh0bWwobXVyZGVyVG90YWwpO1xcbiAgICB9XFxuXFxuICB9KTtcXG48L3NjcmlwdD5cXG5cIjtcblxuXG4vKioqKioqKioqKioqKioqKipcbiAqKiBXRUJQQUNLIEZPT1RFUlxuICoqIC4vfi9odG1sLWxvYWRlcj9hdHRycz1mYWxzZSEuL3NjZW5lcy9pc2lzYWZ0ZXJsaWZlZmFsbGFjeS9zY2VuZS5odG1sXG4gKiogbW9kdWxlIGlkID0gMjZcbiAqKiBtb2R1bGUgY2h1bmtzID0gMFxuICoqLyIsIm1vZHVsZS5leHBvcnRzID0gXCIgIDxkaXYgY2xhc3M9XFxcInRhYmxlXFxcIj5cXG4gICAgPGRpdiBjbGFzcz1cXFwidGFibGUtY2VudGVyXFxcIiBzdHlsZT1cXFwid2lkdGg6NTAlXFxcIj5cXG4gICAgICA8aDEgY2xhc3M9XFxcInByZW1pc2VcXFwiPklTSVMgbWF5IGJlbGlldmUgdGhlIEFwb2NhbHlwc2UgaXMgbmVhci4uLi48L2gxPjxiciAvPjxiciAvPlxcbiAgICAgIDxoMSBjbGFzcz1cXFwiY29uY2x1c2lvblxcXCI+SGF2ZSB0aGV5IGNvbnN1bHRlZCB0aGUgUXVy4oCZYW4gb24gdGhpcyBtYXR0ZXI/PC9oMT5cXG4gICAgPC9kaXY+XFxuICAgIDxkaXYgY2xhc3M9XFxcInRhYmxlLWNlbnRlclxcXCIgc3R5bGU9XFxcIndpZHRoOjUwXFxcIj5cXG4gICAgICA8aDIgY2xhc3M9XFxcInF1cmFuLXJlYWQgcXVyYW4taGlkZGVuXFxcIj5cXG4gICAgICAgIDxhIGhyZWY9XFxcImh0dHA6Ly9xdXJhbi5jb20vNy8xODdcXFwiIHRhcmdldD1cXFwiX2JsYW5rXFxcIj5UaGV5IGFzayB0aGVlIG9mIHRoZSAoZGVzdGluZWQpIEhvdXIsIHdoZW4gd2lsbCBpdCBjb21lIHRvIHBvcnQuIFNheTogPHN0cm9uZz5Lbm93bGVkZ2UgdGhlcmVvZiBpcyB3aXRoIG15IExvcmQgb25seS4gSGUgYWxvbmUgd2lsbCBtYW5pZmVzdCBpdCBhdCBpdHMgcHJvcGVyIHRpbWUuLi48L3N0cm9uZz48c3BhbiBjbGFzcz1cXFwicXVvdGUtc291cmNlXFxcIj5RdXInYW4gNzoxODc8L3NwYW4+PC9hPjxicj48YnI+XFxuICAgICAgICAgPGEgaHJlZj1cXFwiaHR0cDovL3F1cmFuLmNvbS80MS80N1xcXCIgdGFyZ2V0PVxcXCJfYmxhbmtcXFwiPjxzdHJvbmc+VG8gSGltIFthbG9uZV08L3N0cm9uZz4gaXMgYXR0cmlidXRlZCAgPHN0cm9uZz5rbm93bGVkZ2Ugb2YgdGhlIEhvdXIuPC9zdHJvbmc+PHNwYW4gY2xhc3M9XFxcInF1b3RlLXNvdXJjZVxcXCI+UXVyYW4gNDE6NDc8L3NwYW4+PC9hPlxcbiAgICAgIDwvaDI+XFxuICAgIDwvZGl2PlxcbiAgPC9kaXY+XFxuXCI7XG5cblxuLyoqKioqKioqKioqKioqKioqXG4gKiogV0VCUEFDSyBGT09URVJcbiAqKiAuL34vaHRtbC1sb2FkZXI/YXR0cnM9ZmFsc2UhLi9zY2VuZXMvaXNpc2Fwb2NhbHlwc2VtaXNxdW90ZS9zY2VuZS5odG1sXG4gKiogbW9kdWxlIGlkID0gMjdcbiAqKiBtb2R1bGUgY2h1bmtzID0gMFxuICoqLyIsIm1vZHVsZS5leHBvcnRzID0gXCI8c3R5bGU+XFxuICAubGVmdCB7XFxuICAgIHdpZHRoOiA0MHZ3O1xcbiAgfVxcblxcbiAgLm5ld3Nzb3VyY2UtaG9yLFxcbiAgZ3JleXpvbmUtc3JjIHtcXG4gICAgbWF4LWhlaWdodDogNDB2aDtcXG4gICAgYm94LXNoYWRvdzogMCAxdncgMnZ3IHJnYmEoMCwgMCwgMCwgMC42KTtcXG4gIH1cXG5cXG4gIC5uZXdzc291cmNlcy1ob3Ige1xcbiAgICBwb3NpdGlvbjogYWJzb2x1dGU7XFxuICAgIHRvcDogMzV2aDtcXG4gICAgd2lkdGg6IDIzMHZ3O1xcbiAgICBoZWlnaHQ6IDUwdmg7XFxuICAgIC8qb3ZlcmZsb3c6IGhpZGRlbjsqL1xcbiAgICB0cmFuc2Zvcm06IHRyYW5zbGF0ZVgoMjUwJSk7XFxuICB9XFxuXFxuICAuYmxhY2stem9uZSB7XFxuICAgIGJhY2tncm91bmQ6IGJsYWNrO1xcbiAgICB3aWR0aDogMTAwdnc7XFxuICAgIGhlaWdodDogMTAwdmg7XFxuICB9XFxuLyogICNpdGlzbnRlYXN5IC5kaXNwbGF5LTQge1xcbiAgICBvcGFjaXR5OiAwO1xcbiAgfSovXFxuICAgLmRyb3BkZWFkIHtcXG4gICAgd2lkdGg6IDUwdnc7XFxuICB9XFxuICAuY3VubmluZzEge1xcbiAgICB0b3A6IDR2aDtcXG4gICAgcmlnaHQ6IDZ2dztcXG4gIH1cXG4gIC5jdW5uaW5nMiB7XFxuICAgIHRvcDogNDB2aDtcXG4gICAgcmlnaHQ6IDN2dztcXG4gIH1cXG4gIC5jdW5uaW5nMyB7XFxuICAgIGJvdHRvbTogNHZoO1xcbiAgICByaWdodDogNXZ3O1xcbiAgfVxcbiAgLmN1bm5pbmc0IHtcXG4gICAgYm90dG9tOiA1dmg7XFxuICAgIHJpZ2h0OiAzOXZ3O1xcbiAgfVxcbiAgLmN1bm5pbmc1IHtcXG4gICAgYm90dG9tOiAydmg7XFxuICAgIGxlZnQ6IDR2dztcXG4gIH1cXG4gIC5jdW5uaW5nNiB7XFxuICAgIGJvdHRvbTogMzB2aDtcXG4gICAgcmlnaHQ6IDIwdnc7XFxuICB9XFxuXFxuPC9zdHlsZT5cXG48ZGl2IGNsYXNzPVxcXCJncmV5LXpvbmUgdGFibGVcXFwiPlxcbiAgPGRpdiBjbGFzcz1cXFwiYmxhY2stem9uZSB0YWJsZS1jZW50ZXJcXFwiPlxcbiAgPGRpdiBjbGFzcz1cXFwiZGlzcGxheS00XFxcIiBzdHlsZT1cXFwid2lkdGg6NTAlXFxcIj5cXG4gIElTSVMgaXMgYmFua3J1cHQgYXMgYW4gaWRlb2xvZ3kuLi5cXG4gIDxicj5cXG4gIDxicj5cXG4gIDxzcGFuIGNsYXNzPVxcXCJjb25jbHVzaW9uXFxcIj5idXQgdGhleSBhcmUgY3VubmluZyB3aXRoIHN0cmF0ZWd5Ljwvc3Bhbj5cXG4gIDwvZGl2PlxcbiAgPGRpdiBjbGFzcz1cXFwibmV3c291cmNlc1xcXCI+XFxuICAgIDxhIHRhcmdldD1cXFwiX2JsYW5rXFxcIiBjbGFzcz1cXFwiY3VubmluZzFcXFwiIGhyZWY9XFxcImh0dHA6Ly93d3cubnl0aW1lcy5jb20vMjAxNS8wNi8xMy93b3JsZC9taWRkbGVlYXN0L2lzaXMtaXMtd2lubmluZy1tZXNzYWdlLXdhci11cy1jb25jbHVkZXMuaHRtbD9fcj0wXFxcIj5cXG4gICAgICAgIDxpbWcgY2xhc3M9XFxcIm5ld3Nzb3VyY2UtaG9yXFxcIiBzcmM9XFxcIi4vaW1nL2lzaXMtc3RyYXRlZ3ktc29jaWFsLnBuZ1xcXCI+XFxuICAgICAgPC9hPlxcbiAgICA8YSB0YXJnZXQ9XFxcIl9ibGFua1xcXCIgY2xhc3M9XFxcImN1bm5pbmcyXFxcIiBocmVmPVxcXCJodHRwOi8vbW9uZXkuY25uLmNvbS8yMDE1LzEyLzA2L25ld3MvaXNpcy1mdW5kaW5nL1xcXCI+XFxuICAgICAgICA8aW1nIGNsYXNzPVxcXCJuZXdzc291cmNlLWhvclxcXCIgc3JjPVxcXCIuL2ltZy9pc2lzLXN0cmF0ZWd5LWJpbGxpb25zLnBuZ1xcXCI+XFxuICAgICAgPC9hPlxcbiAgICA8YSB0YXJnZXQ9XFxcIl9ibGFua1xcXCIgY2xhc3M9XFxcImN1bm5pbmczXFxcIiBocmVmPVxcXCJodHRwOi8vbW9uZXkuY25uLmNvbS8yMDE1LzEyLzA2L25ld3MvaXNpcy1mdW5kaW5nL1xcXCI+XFxuICAgICAgICA8aW1nIGNsYXNzPVxcXCJuZXdzc291cmNlLWhvclxcXCIgc3JjPVxcXCIuL2ltZy9pc2lzLXN0cmF0ZWd5LWZsb3cucG5nXFxcIj5cXG4gICAgICA8L2E+XFxuICAgIDxhIHRhcmdldD1cXFwiX2JsYW5rXFxcIiBjbGFzcz1cXFwiY3VubmluZzRcXFwiIGhyZWY9XFxcImh0dHA6Ly93d3cud2FzaGluZ3RvbnRpbWVzLmNvbS9uZXdzLzIwMTYvamFuLzI3L2lzbGFtaWMtc3RhdGVzLWN5YmVyLWFybS1zZWVrcy1yZXZlbmdlLWhhY2tlcnMtZGVhL1xcXCI+XFxuICAgICAgICA8aW1nIGNsYXNzPVxcXCJuZXdzc291cmNlLWhvclxcXCIgc3JjPVxcXCIuL2ltZy9pc2lzLXN0cmF0ZWd5LWhhY2tlcnMucG5nXFxcIj5cXG4gICAgICA8L2E+XFxuICAgIDxhIHRhcmdldD1cXFwiX2JsYW5rXFxcIiBjbGFzcz1cXFwiY3VubmluZzVcXFwiIGhyZWY9XFxcImh0dHA6Ly93d3cudGhlYXRsYW50aWMuY29tL2ludGVybmF0aW9uYWwvYXJjaGl2ZS8yMDE1LzEwL3dhci1pc2lzLXVzLWNvYWxpdGlvbi80MTAwNDQvXFxcIj5cXG4gICAgICAgIDxpbWcgY2xhc3M9XFxcIm5ld3Nzb3VyY2UtaG9yXFxcIiBzcmM9XFxcIi4vaW1nL2lzaXMtc3RyYXRlZ3ktaHVtYW5pdHkucG5nXFxcIj5cXG4gICAgICA8L2E+XFxuICAgPGEgdGFyZ2V0PVxcXCJfYmxhbmtcXFwiIGNsYXNzPVxcXCJjdW5uaW5nNlxcXCIgaHJlZj1cXFwiaHR0cHM6Ly93d3cub3BlbmRlbW9jcmFjeS5uZXQvbmFmZWV6LWFobWVkL2lzaXMtd2FudHMtZGVzdHJveS1ncmV5em9uZS1ob3ctd2UtZGVmZW5kXFxcIj5cXG4gICAgICAgIDxpbWcgY2xhc3M9XFxcIm5ld3Nzb3VyY2UtaG9yIGdyZXl6b25lLXNyY1xcXCIgc3JjPVxcXCIuL2ltZy9pc2lzLXN0cmF0ZWd5LWdyZXl6b25lLnBuZ1xcXCI+XFxuICAgICAgPC9hPlxcbiAgPC9kaXY+XFxuPC9kaXY+XFxuPC9kaXY+XFxuXCI7XG5cblxuLyoqKioqKioqKioqKioqKioqXG4gKiogV0VCUEFDSyBGT09URVJcbiAqKiAuL34vaHRtbC1sb2FkZXI/YXR0cnM9ZmFsc2UhLi9zY2VuZXMvaXNpc2JhbmtydXB0L3NjZW5lLmh0bWxcbiAqKiBtb2R1bGUgaWQgPSAyOFxuICoqIG1vZHVsZSBjaHVua3MgPSAwXG4gKiovIiwibW9kdWxlLmV4cG9ydHMgPSBcIjxzdHlsZT5cXG4gICNpc2lzZmlnaHRtaXNxdW90ZSAucHJlbWlzZSxcXG4gICNpc2lzZmlnaHRtaXNxdW90ZSAuY29uY2x1c2lvblxcbiAgIHtcXG4gICAgIHBvc2l0aW9uOiBhYnNvbHV0ZTtcXG4gICAgIHdpZHRoOiA0MHZ3O1xcbiAgICAgYm90dG9tOiA0MHZoO1xcbiAgICAgb3BhY2l0eTogMDtcXG4gICB9XFxuICAgI21ha2V3aGl0ZXtcXG4gICAgZm9udC1jb2xvcjp3aGl0ZTtcXG4gICB9XFxuXFxuPC9zdHlsZT5cXG48ZGl2IGNsYXNzPVxcXCJ0YWJsZVxcXCI+XFxuICA8ZGl2IGNsYXNzPVxcXCJ0YWJsZS1jZW50ZXJcXFwiIHN0eWxlPVxcXCJ3aWR0aDo1MCVcXFwiPlxcbiAgICA8aDEgY2xhc3M9XFxcInByZW1pc2VcXFwiPklTSVMgbWF5IHF1b3RlIHRoZSBRdXInYW4uLi48L2gxPlxcbiAgICA8aDEgY2xhc3M9XFxcImNvbmNsdXNpb25cXFwiPkJ1dCBkb2VzIElTSVMgcmVhZCB0aGUgUXVyJ2FuPzwvaDE+XFxuICA8L2Rpdj5cXG4gIDxkaXYgY2xhc3M9XFxcInRhYmxlLWNlbnRlclxcXCIgc3R5bGU9XFxcIndpZHRoOjUwXFxcIj5cXG4gICAgPGgyIGNsYXNzPVxcXCJxdXJhbi1yZWFkXFxcIj5cXG4gICAgICA8YSBocmVmPVxcXCJodHRwOi8vcXVyYW4uY29tLzIvMTkwXFxcIiB0YXJnZXQ9XFxcIl9ibGFua1xcXCI+PHNwYW4gY2xhc3M9XFxcInF1cmFuLWhpZGRlblxcXCI+RmlnaHQgaW4gdGhlIGNhdXNlIG9mIEFsbGFoIDxzdHJvbmc+YWdhaW5zdCB0aG9zZSB3aG8gZmlnaHQgeW91PC9zdHJvbmc+LCBhbmQgPHN0cm9uZz5kbyBub3QgY29tbWl0IGFnZ3Jlc3Npb24uPC9zdHJvbmc+IDxzcGFuIGNsYXNzPVxcXCJxdW90ZS1zb3VyY2VcXFwiPlF1cmFuIDI6MTkwPC9zcGFuPjxicj48YnI+PC9zcGFuPjwvYT5cXG4gICAgICA8YSBocmVmPVxcXCJodHRwOi8vcXVyYW4uY29tLzIvMTkxXFxcIiB0YXJnZXQ9XFxcIl9ibGFua1xcXCI+S2lsbCB0aGVtLCB3aGVyZXZlciB5b3UgbWF5IGZpbmQgdGhlbSE8c3BhbiBjbGFzcz1cXFwicXVvdGUtc291cmNlXFxcIj5RdXInYW4gMjoxOTE8L3NwYW4+PGJyPjxicj48L2E+XFxuICAgICAgPGEgaHJlZj1cXFwiaHR0cDovL3F1cmFuLmNvbS8yLzE5M1xcXCIgdGFyZ2V0PVxcXCJfYmxhbmtcXFwiPjxzcGFuIGNsYXNzPVxcXCJxdXJhbi1oaWRkZW5cXFwiPi4uLmlmIHRoZXkgY2Vhc2UsIDxzdHJvbmc+bGV0IHRoZXJlIGJlIG5vIGhvc3RpbGl0eSBleGNlcHQgYWdhaW5zdCBvcHByZXNzb3JzPC9zdHJvbmc+LiA8c3BhbiBjbGFzcz1cXFwicXVvdGUtc291cmNlXFxcIj5RdXJhbiAyOjE5Mzwvc3Bhbj48L3NwYW4+PC9hPlxcbiAgICA8L2gyPlxcbiAgPC9kaXY+XFxuPC9kaXY+XFxuXCI7XG5cblxuLyoqKioqKioqKioqKioqKioqXG4gKiogV0VCUEFDSyBGT09URVJcbiAqKiAuL34vaHRtbC1sb2FkZXI/YXR0cnM9ZmFsc2UhLi9zY2VuZXMvaXNpc2ZpZ2h0bWlzcXVvdGUvc2NlbmUuaHRtbFxuICoqIG1vZHVsZSBpZCA9IDI5XG4gKiogbW9kdWxlIGNodW5rcyA9IDBcbiAqKi8iLCJtb2R1bGUuZXhwb3J0cyA9IFwiVGhleSBoYXMgYSBzaW1wbGUgb2JqZWN0aXZlIHRoZXnigJl2ZSBzdGF0ZWQuXFxuXCI7XG5cblxuLyoqKioqKioqKioqKioqKioqXG4gKiogV0VCUEFDSyBGT09URVJcbiAqKiAuL34vaHRtbC1sb2FkZXI/YXR0cnM9ZmFsc2UhLi9zY2VuZXMvaXNpc29iamVjdGl2ZS9zY2VuZS5odG1sXG4gKiogbW9kdWxlIGlkID0gMzBcbiAqKiBtb2R1bGUgY2h1bmtzID0gMFxuICoqLyIsIm1vZHVsZS5leHBvcnRzID0gXCI8c3R5bGU+XFxuICAjaXNpc3dhbnRzdG9kaXZpZGUgLmFuaW0tMiB7XFxuICAgIG9wYWNpdHk6IDA7XFxuICB9XFxuXFxuICAjaXNpc3dhbnRzdG9kaXZpZGUgLmRpc3BsYXktNCB7XFxuICAgIGJhY2tncm91bmQ6IGJsYWNrO1xcbiAgICBkaXNwbGF5OiBpbmxpbmUtYmxvY2s7XFxuICAgIHBhZGRpbmc6IDAuNXZ3O1xcbiAgfVxcbiAgLmNvbG9yLXpvbmUge1xcbiAgICBwb3NpdGlvbjogYWJzb2x1dGU7XFxuICAgIHdpZHRoOiAxMDB2dztcXG4gICAgaGVpZ2h0OiAxMDB2aDtcXG4gIH1cXG4gIC56b25lcyB7XFxuICAgIGhlaWdodDogMTAwdmg7XFxuICB9XFxuICAudmlvbGVudC16b25lcyB7XFxuICAgIHdpZHRoOiAxMHZ3O1xcbiAgICBwb3NpdGlvbjogcmVsYXRpdmU7XFxuICAgIHotaW5kZXg6IDI7XFxuICB9XFxuICAuZ3JleS16b25lIHtcXG4gICAgYmFja2dyb3VuZDogIzc0N0I4MVxcbiAgfVxcbiAgLndoaXRlLXpvbmUge1xcbiAgICBiYWNrZ3JvdW5kOiB3aGl0ZTtcXG4gICAgZmxvYXQ6bGVmdDtcXG4gIH1cXG4gIC5ibGFjay16b25lIHtcXG4gICAgYmFja2dyb3VuZDogYmxhY2s7XFxuICAgIGZsb2F0OnJpZ2h0O1xcbiAgfVxcbiAgI2lzaXN3YW50c3RvZGl2aWRlIC5kaXNwbGF5LTR7XFxuICAgIHBvc2l0aW9uOiByZWxhdGl2ZTtcXG4gICAgei1pbmRleDogMztcXG4gIH1cXG48L3N0eWxlPlxcbjxkaXYgY2xhc3M9XFxcImNvbG9yLXpvbmVcXFwiPlxcbiAgPGRpdiBjbGFzcz1cXFwiem9uZXMgYmxhY2stem9uZSB2aW9sZW50LXpvbmVzXFxcIj48L2Rpdj5cXG4gIDxkaXYgY2xhc3M9XFxcInpvbmVzIHdoaXRlLXpvbmUgdmlvbGVudC16b25lc1xcXCI+PC9kaXY+XFxuPC9kaXY+XFxuPGRpdiBjbGFzcz1cXFwidGFibGUgZ3JleS16b25lXFxcIj5cXG4gIDxkaXYgY2xhc3M9XFxcInRhYmxlLWNlbnRlclxcXCI+XFxuICAgIDxkaXYgY2xhc3M9XFxcImRpc3BsYXktNCBhbmltLTJcXFwiPlRoZXkgd2FudCB0byBkaXZpZGUgdXMgYWxsLDwvZGl2PjxiciAvPlxcbiAgICA8ZGl2IGNsYXNzPVxcXCJkaXNwbGF5LTQgYW5pbS0yXFxcIj5kZXN0cm95IHRoZSBncmV5IHpvbmUgb2YgY29leGlzdGVuY2UsPC9kaXY+PGJyIC8+XFxuICAgIDxkaXYgY2xhc3M9XFxcImRpc3BsYXktNCBhbmltLTJcXFwiPmFuZCBzdGFydCBhbm90aGVyIGdyZWF0IHdhci48L2Rpdj48YnIgLz48YnIgLz5cXG4gICAgPGRpdiBjbGFzcz1cXFwiZGlzcGxheS00IGFuaW0tMVxcXCI+V2Ugd29uJ3QgbGV0IHRoYXQgaGFwcGVuLjwvZGl2PlxcbiAgPC9kaXY+XFxuPC9kaXY+XFxuXCI7XG5cblxuLyoqKioqKioqKioqKioqKioqXG4gKiogV0VCUEFDSyBGT09URVJcbiAqKiAuL34vaHRtbC1sb2FkZXI/YXR0cnM9ZmFsc2UhLi9zY2VuZXMvaXNpc3dhbnRzdG9kaXZpZGUvc2NlbmUuaHRtbFxuICoqIG1vZHVsZSBpZCA9IDMxXG4gKiogbW9kdWxlIGNodW5rcyA9IDBcbiAqKi8iLCJtb2R1bGUuZXhwb3J0cyA9IFwiPHN0eWxlPlxcbiAgLmxlZnQge1xcbiAgICB3aWR0aDogNDB2dztcXG4gIH1cXG4gIC5uZXdzc291cmNlIHtcXG4gICAgbWF4LWhlaWdodDogNDB2aDtcXG4gICAgZGlzcGxheTogYmxvY2s7XFxuICAgIGJveC1zaGFkb3c6IDAgMXZ3IDJ2dyByZ2JhKDAsMCwwLDAuNik7XFxuICAgIG1hcmdpbi1ib3R0b206IDV2aDtcXG4gIH1cXG4gIC5uZXdzb3VyY2VzIHtcXG4gICAgcG9zaXRpb246IGFic29sdXRlO1xcbiAgICB3aWR0aDogMTAwdnc7XFxuICAgIGhlaWdodDogMTAwdmg7XFxuICAgIHRvcDogMDtcXG4gICAgbGVmdDogMDtcXG4gICAgLypvdmVyZmxvdzogaGlkZGVuOyovXFxuICAgIC8qdHJhbnNmb3JtOiB0cmFuc2xhdGVZKDgwJSk7Ki9cXG4gIH1cXG4gIC5uZXdzb3VyY2VzIGEge1xcbiAgICBtYXgtd2lkdGg6IDQwdnc7XFxuICAgIHBvc2l0aW9uOiBhYnNvbHV0ZTtcXG4gICAgb3BhY2l0eTogMDtcXG4gIH1cXG4vKiAgI2l0aXNudGVhc3kgLmRpc3BsYXktNCB7XFxuICAgIG9wYWNpdHk6IDA7XFxuICB9Ki9cXG4gIC5pc250ZWFzeV8xIHtcXG4gICAgdG9wOiA4dmg7XFxuICAgIHJpZ2h0OiA1dnc7XFxuICB9XFxuICAgLmlzbnRlYXN5XzIge1xcbiAgICB0b3A6IDI4dmg7XFxuICAgIHJpZ2h0OiA1dnc7XFxuICB9XFxuICAuaXNudGVhc3lfMyB7XFxuICAgIHRvcDogNDV2aDtcXG4gICAgcmlnaHQ6IDV2dztcXG4gIH1cXG4gIC5pc250ZWFzeV80IHtcXG4gICAgdG9wOiA2MHZoO1xcbiAgICByaWdodDogNXZ3O1xcbiAgfVxcbiAgLmlzbnRlYXN5XzUge1xcbiAgICB0b3A6IDYwdmg7XFxuICAgIHJpZ2h0OiAyMHZ3O1xcbiAgfVxcbiAgLmlzbnRlYXN5XzYge1xcbiAgICB0b3A6IDY1dmg7XFxuICAgIHJpZ2h0OiAzMnZ3O1xcbiAgfVxcbiAgLmlzbnRlYXN5Xzcge1xcbiAgICB0b3A6IDYydmg7XFxuICAgIHJpZ2h0OiA1MHZ3O1xcbiAgfVxcbiAgLmlzbnRlYXN5Xzgge1xcbiAgICB0b3A6IDY2dmg7XFxuICAgIHJpZ2h0OiA2NXZ3O1xcbiAgfVxcbiAgIC5pc250ZWFzeV85IHtcXG4gICAgdG9wOiA1dmg7XFxuICAgIHJpZ2h0OiA2NXZ3O1xcbiAgfVxcbiAgIC5pc250ZWFzeV8xMCB7XFxuICAgIHRvcDogM3ZoO1xcbiAgICByaWdodDogNTB2dztcXG4gIH1cXG4gICAuaXNudGVhc3lfMTEge1xcbiAgICB0b3A6IDl2aDtcXG4gICAgcmlnaHQ6IDM4dnc7XFxuICB9XFxuICAgLmlzbnRlYXN5XzEyIHtcXG4gICAgdG9wOiA1dmg7XFxuICAgIHJpZ2h0OiAyMHZ3O1xcbiAgfVxcbiAgIC5pc250ZWFzeV8xMyB7XFxuICAgIHRvcDogMzV2aDtcXG4gICAgcmlnaHQ6IDI4dnc7XFxuICB9XFxuPC9zdHlsZT5cXG48ZGl2IGNsYXNzPVxcXCJ0YWJsZVxcXCI+XFxuICA8ZGl2IGNsYXNzPVxcXCJ0YWJsZS1jZW50ZXJcXFwiPlxcbiAgPGRpdiBjbGFzcz1cXFwiZGlzcGxheS00IGxlZnRcXFwiPkl0IGlzbuKAmXQgZWFzeSBiZWluZyBNdXNsaW0gYW55d2hlcmXigKYgPC9kaXY+XFxuICA8ZGl2IGNsYXNzPVxcXCJuZXdzb3VyY2VzXFxcIj5cXG4gICAgPGEgdGFyZ2V0PVxcXCJfYmxhbmtcXFwiIGNsYXNzPVxcXCJpc250ZWFzeV8xXFxcIiBocmVmPVxcXCJodHRwOi8vY29udGVudC50aW1lLmNvbS90aW1lL2NvdmVycy8wLDE2NjQxLDIwMTAwODMwLDAwLmh0bWxcXFwiPlxcbiAgICAgIDxpbWcgY2xhc3M9XFxcIm5ld3Nzb3VyY2VcXFwiIHNyYz1cXFwiLi9pbWcvaGF0ZWNyaW1lLWFtZXJpY2EuanBnXFxcIiA+XFxuICAgIDwvYT5cXG4gICAgPGEgdGFyZ2V0PVxcXCJfYmxhbmtcXFwiIGNsYXNzPVxcXCJpc250ZWFzeV8yXFxcIiBocmVmPVxcXCJodHRwOi8vYW1lcmljYS5hbGphemVlcmEuY29tL2FydGljbGVzLzIwMTUvMTIvOS91cy1tdXNsaW1zLWV4cGVyaWVuY2Utc3VyZ2UtaW4taXNsYW1vcGhvYmljLWF0dGFja3MuaHRtbFxcXCI+XFxuICAgICAgPGltZyBjbGFzcz1cXFwibmV3c3NvdXJjZVxcXCIgc3JjPVxcXCIuL2ltZy9oYXRlY3JpbWUtYW1lcmljYTIucG5nXFxcIiA+XFxuICAgIDwvYT5cXG4gICAgPGEgdGFyZ2V0PVxcXCJfYmxhbmtcXFwiIGNsYXNzPVxcXCJpc250ZWFzeV8zXFxcIiBocmVmPVxcXCJodHRwOi8vd3d3LmlucXVpc2l0ci5jb20vMjYxMDcxNy9oYXRlLWNyaW1lLXN0cmluZy1vZi1hbnRpLW11c2xpbS1hdHRhY2tzLWhpdC1jYW5hZGEuaHRtbFxcXCI+XFxuICAgICAgPGltZyBjbGFzcz1cXFwibmV3c3NvdXJjZVxcXCIgc3JjPVxcXCIuL2ltZy9oYXRlY3JpbWUtY2FuYWRhLnBuZ1xcXCIgPlxcbiAgICA8L2E+XFxuICAgIDxhIHRhcmdldD1cXFwiX2JsYW5rXFxcIiBjbGFzcz1cXFwiaXNudGVhc3lfNFxcXCIgaHJlZj1cXFwiaHR0cDovL2FtZXJpY2EuYWxqYXplZXJhLmNvbS9hcnRpY2xlcy8yMDE1LzIvMTcvdGhyZWF0cy10by1tdXNsaW0tYW1lcmljYW4tY29tbXVuaXR5LWludGVuc2lmaWVzLWFmdGVyLWNoYXBlbC1oaWxsLXNob290aW5nLmh0bWxcXFwiPlxcbiAgICAgIDxpbWcgY2xhc3M9XFxcIm5ld3Nzb3VyY2VcXFwiIHNyYz1cXFwiLi9pbWcvaGF0ZWNyaW1lLWNoYXBlbGhpbGwucG5nXFxcIiA+XFxuICAgIDwvYT5cXG4gICAgPGEgdGFyZ2V0PVxcXCJfYmxhbmtcXFwiIGNsYXNzPVxcXCJpc250ZWFzeV81XFxcIiBocmVmPVxcXCJodHRwOi8vd3d3LnRlbGVncmFwaC5jby51ay9uZXdzL3dvcmxkbmV3cy9ldXJvcGUvZnJhbmNlLzEyMDc1MDE4L0hhdGUtY3JpbWVzLWFnYWluc3QtTXVzbGltcy1hbmQtSmV3cy1zb2FyLWluLUZyYW5jZS5odG1sXFxcIj5cXG4gICAgICA8aW1nIGNsYXNzPVxcXCJuZXdzc291cmNlXFxcIiBzcmM9XFxcIi4vaW1nL2hhdGVjcmltZS1mcmFuY2UucG5nXFxcIiA+XFxuICAgIDwvYT5cXG4gICAgPGEgdGFyZ2V0PVxcXCJfYmxhbmtcXFwiIGNsYXNzPVxcXCJpc250ZWFzeV82XFxcIiBocmVmPVxcXCJodHRwczovL3d3dy53YXNoaW5ndG9ucG9zdC5jb20vd29ybGQvZXVyb3BlL3JlbGlnaW91cy1saWJlcnRpZXMtdW5kZXItc3RyYWluLWZvci1tdXNsaW1zLWluLWZyYW5jZS8yMDE1LzExLzIyLzgzMDU0YzA2LTkxMmYtMTFlNS1iZWZhLTk5Y2VlYmNiYjI3Ml9zdG9yeS5odG1sXFxcIj5cXG4gICAgICA8aW1nIGNsYXNzPVxcXCJuZXdzc291cmNlXFxcIiBzcmM9XFxcIi4vaW1nL2hhdGVjcmltZS1mcmFuY2UyLnBuZ1xcXCIgPlxcbiAgICA8L2E+XFxuICAgIDxhIHRhcmdldD1cXFwiX2JsYW5rXFxcIiBjbGFzcz1cXFwiaXNudGVhc3lfN1xcXCIgaHJlZj1cXFwiaHR0cDovL2xvc2FuZ2VsZXMuY2JzbG9jYWwuY29tLzIwMTUvMTIvMTMvMi1tb3NxdWVzLWluLWhhd3Rob3JuZS12YW5kYWxpemVkLXdpdGgtZ3JhZmZpdGkvXFxcIj5cXG4gICAgICA8aW1nIGNsYXNzPVxcXCJuZXdzc291cmNlXFxcIiBzcmM9XFxcIi4vaW1nL2hhdGVjcmltZS1ncmVuYWRlZ3JhZmZpdGkucG5nXFxcIiA+XFxuICAgIDwvYT5cXG4gICAgPGEgdGFyZ2V0PVxcXCJfYmxhbmtcXFwiIGNsYXNzPVxcXCJpc250ZWFzeV84XFxcIiBocmVmPVxcXCJodHRwOi8va3RsYS5jb20vMjAxNS8xMi8xMS9wb3NzaWJsZS1oYXRlLWNyaW1lLWludmVzdGlnYXRlZC1hZnRlci1tYW4tcHVsbHMtb3V0LWtuaWZlLW9uLW11c2xpbS13b21hbi1pbi1jaGluby1oaWxscy1zaGVyaWZmcy1kZXBhcnRtZW50L1xcXCI+XFxuICAgICAgPGltZyBjbGFzcz1cXFwibmV3c3NvdXJjZVxcXCIgc3JjPVxcXCIuL2ltZy9oYXRlY3JpbWUta25pZmUucG5nXFxcIiA+XFxuICAgIDwvYT5cXG4gICAgPGEgdGFyZ2V0PVxcXCJfYmxhbmtcXFwiIGNsYXNzPVxcXCJpc250ZWFzeV85XFxcIiBocmVmPVxcXCJodHRwOi8vd3d3LmNubi5jb20vMjAxNS8xMi8xMi91cy9jYWxpZm9ybmlhLW1vc3F1ZS1maXJlL1xcXCI+XFxuICAgICAgPGltZyBjbGFzcz1cXFwibmV3c3NvdXJjZVxcXCIgc3JjPVxcXCIuL2ltZy9oYXRlY3JpbWUtbW9zcXVlZmlyZS5wbmdcXFwiID5cXG4gICAgPC9hPlxcbiAgICA8YSB0YXJnZXQ9XFxcIl9ibGFua1xcXCIgY2xhc3M9XFxcImlzbnRlYXN5XzEwXFxcIiBocmVmPVxcXCJodHRwOi8vd3d3LmZveG5ld3MuY29tL3RyYW5zY3JpcHQvMjAxNC8xMC8wNy9iaWxsLW9yZWlsbHktaXNsYW0tZGVzdHJ1Y3RpdmUtZm9yY2Utd29ybGQvXFxcIj5cXG4gICAgICA8aW1nIGNsYXNzPVxcXCJuZXdzc291cmNlXFxcIiBzcmM9XFxcIi4vaW1nL2hhdGVjcmltZS1vcmVpbGx5LnBuZ1xcXCIgPlxcbiAgICA8L2E+XFxuICAgIDxhIHRhcmdldD1cXFwiX2JsYW5rXFxcIiBjbGFzcz1cXFwiaXNudGVhc3lfMTFcXFwiIGhyZWY9XFxcImh0dHA6Ly93d3cubnlkYWlseW5ld3MuY29tL25ld3MvbmF0aW9uYWwvbXVzbGltLWdhLWdpcmwtY2xhc3MtZ2FzcGVkLXRlYWNoZXItYm9tYi1qb2tlLWFydGljbGUtMS4yNDYzNDk1XFxcIj5cXG4gICAgICA8aW1nIGNsYXNzPVxcXCJuZXdzc291cmNlIGhpZGVzb3VyY2VcXFwiIHNyYz1cXFwiLi9pbWcvaGF0ZWNyaW1lLXN0dWRlbnRiYWNrcGFjay5wbmdcXFwiID5cXG4gICAgPC9hPlxcbiAgICA8YSB0YXJnZXQ9XFxcIl9ibGFua1xcXCIgY2xhc3M9XFxcImlzbnRlYXN5XzEyXFxcIiBocmVmPVxcXCJodHRwOi8vdGltZS5jb20vNDEzOTQ3Ni9kb25hbGQtdHJ1bXAtc2h1dGRvd24tbXVzbGltLWltbWlncmF0aW9uL1xcXCI+XFxuICAgICAgPGltZyBjbGFzcz1cXFwibmV3c3NvdXJjZSBoaWRlc291cmNlXFxcIiBzcmM9XFxcIi4vaW1nL2hhdGVjcmltZS10cnVtcC5wbmdcXFwiID5cXG4gICAgPC9hPlxcbiAgICA8YSB0YXJnZXQ9XFxcIl9ibGFua1xcXCIgY2xhc3M9XFxcImlzbnRlYXN5XzEzXFxcIiBocmVmPVxcXCJodHRwczovL3RvZGF5LnlvdWdvdi5jb20vbmV3cy8yMDE1LzEyLzExL3R3by10aGlyZHMtcmVwdWJsaWNhbnMtYmFjay10cnVtcC1wcm9wb3NhbC9cXFwiPlxcbiAgICAgIDxpbWcgY2xhc3M9XFxcIm5ld3Nzb3VyY2UgdHJ1bXBcXFwiIHNyYz1cXFwiLi9pbWcvaGF0ZWNyaW1lLXBvbGwucG5nXFxcIiA+XFxuICAgIDwvYT5cXG4gIDwvZGl2PlxcbjwvZGl2PlxcbjwvZGl2PlxcblwiO1xuXG5cbi8qKioqKioqKioqKioqKioqKlxuICoqIFdFQlBBQ0sgRk9PVEVSXG4gKiogLi9+L2h0bWwtbG9hZGVyP2F0dHJzPWZhbHNlIS4vc2NlbmVzL2l0aXNudGVhc3kvc2NlbmUuaHRtbFxuICoqIG1vZHVsZSBpZCA9IDMyXG4gKiogbW9kdWxlIGNodW5rcyA9IDBcbiAqKi8iLCJtb2R1bGUuZXhwb3J0cyA9IFwiXFxuXFxuPGRpdiBjbGFzcz1cXFwidGFibGVcXFwiPlxcbiAgPGRpdiBjbGFzcz1cXFwidGFibGUtY2VudGVyXFxcIj5cXG4gICAgPGRpdiBjbGFzcz1cXFwiZGlzcGxheS00IHRleHQtYm9sZCB0ZXh0LWNlbnRlcmVkXFxcIj5JU0lTIGlzIDxzcGFuIHN0eWxlPVxcXCJjb2xvcjojQUIyRTJFXFxcIiBpZD1cXFwibXVyZGVyXFxcIj5tdXJkZXJpbmc8L3NwYW4+IElzbGFtJ3MgbmFtZTwvZGl2PlxcbiAgPC9kaXY+XFxuPC9kaXY+XFxuXFxuXFxuPCEtLVxcblZpZXcgb2YgSVNJUyBPdmVyd2hlbG1pbmdseSBOZWdhdGl2ZSAoUGV3IGJhciBncmFwaClcXG5odHRwOi8vd3d3LnBld3Jlc2VhcmNoLm9yZy9mYWN0LXRhbmsvMjAxNS8xMS8xNy9pbi1uYXRpb25zLXdpdGgtc2lnbmlmaWNhbnQtbXVzbGltLXBvcHVsYXRpb25zLW11Y2gtZGlzZGFpbi1mb3ItaXNpcy9mdF8xNS0xMS0xN19pc2lzX3ZpZXdzL1xcbiAtLT5cXG5cIjtcblxuXG4vKioqKioqKioqKioqKioqKipcbiAqKiBXRUJQQUNLIEZPT1RFUlxuICoqIC4vfi9odG1sLWxvYWRlcj9hdHRycz1mYWxzZSEuL3NjZW5lcy9pdHNnb3R0b2VuZC9zY2VuZS5odG1sXG4gKiogbW9kdWxlIGlkID0gMzNcbiAqKiBtb2R1bGUgY2h1bmtzID0gMFxuICoqLyIsIm1vZHVsZS5leHBvcnRzID0gXCI8ZGl2IGNsYXNzPVxcXCJ0YWJsZVxcXCI+XFxuICA8ZGl2IGNsYXNzPVxcXCJ0YWJsZS1jZW50ZXJcXFwiPlxcbiAgICA8ZGl2IGNsYXNzPVxcXCJkaXNwbGF5LTQgdGV4dC1jZW50ZXJlZFxcXCI+QU5EIFRIQVTigJlTIEdPVCBUTyBFTkQuPC9kaXY+XFxuICA8L2Rpdj5cXG48L2Rpdj5cXG5cIjtcblxuXG4vKioqKioqKioqKioqKioqKipcbiAqKiBXRUJQQUNLIEZPT1RFUlxuICoqIC4vfi9odG1sLWxvYWRlcj9hdHRycz1mYWxzZSEuL3NjZW5lcy9pd2FudG15aXNsYW1iYWNrMS9zY2VuZS5odG1sXG4gKiogbW9kdWxlIGlkID0gMzRcbiAqKiBtb2R1bGUgY2h1bmtzID0gMFxuICoqLyIsIm1vZHVsZS5leHBvcnRzID0gXCI8c3R5bGU+XFxuXFxuLmZpcnN0LC5zZWNvbmQsIC50aGlyZCwgLmZvdXJ0aCB7XFxuXFx0b3BhY2l0eTogMFxcbn1cXG4jbGlrZXBlYWNlIC5kaXNwbGF5LTQge1xcblxcdG9wYWNpdHk6IDEhaW1wb3J0YW50O1xcblxcdHRyYW5zZm9ybTogdHJhbnNsYXRlWSgzMCUpO1xcbn1cXG5cXG5cXG4jbGlrZXBlYWNlIGlucHV0IHtcXG5cXHRmb250LXNpemU6IDN2bWluO1xcblxcdGJhY2tncm91bmQ6ICM3NDdCODE7XFxuXFx0Y29sb3I6IHdoaXRlO1xcblxcdHBhZGRpbmc6IDIlO1xcblxcdHdpZHRoOiBhdXRvO1xcblxcdG1hcmdpbjogMC41dm1pbiAwO1xcblxcdHdpZHRoOiA5NiU7XFxufVxcblxcbiNsaWtlcGVhY2UgbGFiZWwge1xcblxcdGNvbG9yOiAjNzQ3QjgxO1xcbn1cXG5cXG4jbGlrZXBlYWNlIGlucHV0W3R5cGU9c3VibWl0XSB7XFxuXFx0Y29sb3I6IHdoaXRlO1xcblxcdGJhY2tncm91bmQ6ICMzQ0EyQ0Q7XFxuXFx0d2lkdGg6IGF1dG87XFxuXFx0bWFyZ2luLXRvcDogMnZtaW47XFxuXFx0Y3Vyc29yOiBwb2ludGVyO1xcbn1cXG5cXG4jbGlrZXBlYWNlIGxhYmVsIHtcXG5cXHRkaXNwbGF5OiBibG9jaztcXG5cXHRtYXJnaW46IDAuMnZtaW4gMC41dm1pbjtcXG5cXHR0ZXh0LXRyYW5zZm9ybTogdXBwZXJjYXNlO1xcblxcdGZvbnQtd2VpZ2h0OiBib2xkO1xcblxcdGZvbnQtc2l6ZTogMi41dm1pbjtcXG59XFxuXFxuI2xpa2VwZWFjZSAjbWNfZW1iZWRfc2lnbnVwIHtcXG5cXHR3aWR0aDogNTB2bWF4O1xcblxcdGJhY2tncm91bmQ6IHdoaXRlO1xcblxcdG1hcmdpbjogMCBhdXRvO1xcblxcdHBhZGRpbmc6IDJ2bWluO1xcbn1cXG5cXG4jbGlrZXBlYWNlIGgyIHtcXG5cXHRjb2xvcjogYmxhY2s7XFxuXFx0bWFyZ2luLWJvdHRvbTogMnZtaW5cXG59XFxuPC9zdHlsZT5cXG48ZGl2IGNsYXNzPVxcXCJ0YWJsZSBncmV5LXpvbmVcXFwiPlxcblxcdFxcdDxkaXYgY2xhc3M9XFxcInRhYmxlLWNlbnRlclxcXCI+XFxuICBcXHRcXHQ8ZGl2IGNsYXNzPVxcXCJkaXNwbGF5LTQgdGV4dC1jZW50ZXJlZFxcXCI+PHNwYW4gY2xhc3M9XFxcImZpcnN0XFxcIj5NVVNMSU1TPC9zcGFuPiA8c3BhbiBjbGFzcz1cXFwic2Vjb25kXFxcIj5BR0FJTlNUPC9zcGFuPiA8c3BhbiBjbGFzcz1cXFwidGhpcmRcXFwiPklTSVM8L3NwYW4+PC9kaXY+XFxuXFx0XFx0XFx0PGRpdiBjbGFzcz1cXFwiZm91cnRoXFxcIj5cXG5cXG5cXHRcXHRcXHRcXHQ8IS0tIEJlZ2luIE1haWxDaGltcCBTaWdudXAgRm9ybSAtLT5cXG5cXHRcXHRcXHRcXHQ8ZGl2IGlkPVxcXCJtY19lbWJlZF9zaWdudXBcXFwiPlxcblxcdFxcdFxcdFxcdDxmb3JtIGFjdGlvbj1cXFwiLy9tdXNsaW1zYWdhaW5zdGlzaXMudXMxMi5saXN0LW1hbmFnZS5jb20vc3Vic2NyaWJlL3Bvc3Q/dT05ZDJkZDgxY2NiMDdiNzEwNTkzNDc1NDIxJmFtcDtpZD04MWE1ZjUyNTBjXFxcIiBtZXRob2Q9XFxcInBvc3RcXFwiIGlkPVxcXCJtYy1lbWJlZGRlZC1zdWJzY3JpYmUtZm9ybVxcXCIgbmFtZT1cXFwibWMtZW1iZWRkZWQtc3Vic2NyaWJlLWZvcm1cXFwiIGNsYXNzPVxcXCJ2YWxpZGF0ZVxcXCIgdGFyZ2V0PVxcXCJfYmxhbmtcXFwiIG5vdmFsaWRhdGU+XFxuXFx0XFx0XFx0XFx0ICAgIDxkaXYgaWQ9XFxcIm1jX2VtYmVkX3NpZ251cF9zY3JvbGxcXFwiPlxcblxcdFxcdFxcdFxcdFxcdDxoMj5VcGRhdGVzIFNvb24uIFN1YnNjcmliZSBOb3cuPC9oMj5cXG5cXHRcXHRcXHRcXHQ8ZGl2IGNsYXNzPVxcXCJtYy1maWVsZC1ncm91cFxcXCI+XFxuXFx0XFx0XFx0XFx0XFx0PGxhYmVsIGZvcj1cXFwibWNlLUVNQUlMXFxcIj5FbWFpbCBBZGRyZXNzIDwvbGFiZWw+XFxuXFx0XFx0XFx0XFx0XFx0PGlucHV0IHR5cGU9XFxcImVtYWlsXFxcIiB2YWx1ZT1cXFwiXFxcIiBuYW1lPVxcXCJFTUFJTFxcXCIgY2xhc3M9XFxcInJlcXVpcmVkIGVtYWlsXFxcIiBpZD1cXFwibWNlLUVNQUlMXFxcIj5cXG5cXHRcXHRcXHRcXHQ8L2Rpdj5cXG5cXHRcXHRcXHRcXHQ8ZGl2IGNsYXNzPVxcXCJtYy1maWVsZC1ncm91cFxcXCI+XFxuXFx0XFx0XFx0XFx0XFx0PGxhYmVsIGZvcj1cXFwibWNlLUZOQU1FXFxcIj5GaXJzdCBOYW1lIDwvbGFiZWw+XFxuXFx0XFx0XFx0XFx0XFx0PGlucHV0IHR5cGU9XFxcInRleHRcXFwiIHZhbHVlPVxcXCJcXFwiIG5hbWU9XFxcIkZOQU1FXFxcIiBjbGFzcz1cXFwicmVxdWlyZWRcXFwiIGlkPVxcXCJtY2UtRk5BTUVcXFwiPlxcblxcdFxcdFxcdFxcdDwvZGl2PlxcblxcdFxcdFxcdFxcdDxkaXYgY2xhc3M9XFxcIm1jLWZpZWxkLWdyb3VwXFxcIj5cXG5cXHRcXHRcXHRcXHRcXHQ8bGFiZWwgZm9yPVxcXCJtY2UtTE5BTUVcXFwiPkxhc3QgTmFtZSA8L2xhYmVsPlxcblxcdFxcdFxcdFxcdFxcdDxpbnB1dCB0eXBlPVxcXCJ0ZXh0XFxcIiB2YWx1ZT1cXFwiXFxcIiBuYW1lPVxcXCJMTkFNRVxcXCIgY2xhc3M9XFxcInJlcXVpcmVkXFxcIiBpZD1cXFwibWNlLUxOQU1FXFxcIj5cXG5cXHRcXHRcXHRcXHQ8L2Rpdj5cXG5cXHRcXHRcXHRcXHQ8ZGl2IGNsYXNzPVxcXCJtYy1maWVsZC1ncm91cFxcXCI+XFxuXFx0XFx0XFx0XFx0XFx0PGxhYmVsIGZvcj1cXFwibWNlLVNLSUxMU1xcXCI+SG93IGNhbiB5b3UgaGVscD8gKFNraWxscykgPC9sYWJlbD5cXG5cXHRcXHRcXHRcXHRcXHQ8aW5wdXQgdHlwZT1cXFwidGV4dFxcXCIgdmFsdWU9XFxcIlxcXCIgbmFtZT1cXFwiU0tJTExTXFxcIiBjbGFzcz1cXFwiXFxcIiBpZD1cXFwibWNlLVNLSUxMU1xcXCI+XFxuXFx0XFx0XFx0XFx0PC9kaXY+XFxuXFx0XFx0XFx0XFx0XFx0PGRpdiBpZD1cXFwibWNlLXJlc3BvbnNlc1xcXCIgY2xhc3M9XFxcImNsZWFyXFxcIj5cXG5cXHRcXHRcXHRcXHRcXHRcXHQ8ZGl2IGNsYXNzPVxcXCJyZXNwb25zZVxcXCIgaWQ9XFxcIm1jZS1lcnJvci1yZXNwb25zZVxcXCIgc3R5bGU9XFxcImRpc3BsYXk6bm9uZVxcXCI+PC9kaXY+XFxuXFx0XFx0XFx0XFx0XFx0XFx0PGRpdiBjbGFzcz1cXFwicmVzcG9uc2VcXFwiIGlkPVxcXCJtY2Utc3VjY2Vzcy1yZXNwb25zZVxcXCIgc3R5bGU9XFxcImRpc3BsYXk6bm9uZVxcXCI+PC9kaXY+XFxuXFx0XFx0XFx0XFx0XFx0PC9kaXY+ICAgIDwhLS0gcmVhbCBwZW9wbGUgc2hvdWxkIG5vdCBmaWxsIHRoaXMgaW4gYW5kIGV4cGVjdCBnb29kIHRoaW5ncyAtIGRvIG5vdCByZW1vdmUgdGhpcyBvciByaXNrIGZvcm0gYm90IHNpZ251cHMtLT5cXG5cXHRcXHRcXHRcXHQgICAgPGRpdiBzdHlsZT1cXFwicG9zaXRpb246IGFic29sdXRlOyBsZWZ0OiAtNTAwMHB4O1xcXCIgYXJpYS1oaWRkZW49XFxcInRydWVcXFwiPjxpbnB1dCB0eXBlPVxcXCJ0ZXh0XFxcIiBuYW1lPVxcXCJiXzlkMmRkODFjY2IwN2I3MTA1OTM0NzU0MjFfODFhNWY1MjUwY1xcXCIgdGFiaW5kZXg9XFxcIi0xXFxcIiB2YWx1ZT1cXFwiXFxcIj48L2Rpdj5cXG5cXHRcXHRcXHRcXHQgICAgPGRpdiBjbGFzcz1cXFwiY2xlYXJcXFwiPjxpbnB1dCB0eXBlPVxcXCJzdWJtaXRcXFwiIHZhbHVlPVxcXCJTdWJzY3JpYmVcXFwiIG5hbWU9XFxcInN1YnNjcmliZVxcXCIgaWQ9XFxcIm1jLWVtYmVkZGVkLXN1YnNjcmliZVxcXCIgY2xhc3M9XFxcImJ1dHRvblxcXCI+XFxuXFx0XFx0XFx0XFx0ICAgIDwvZGl2PlxcblxcbjxhIGhyZWY9XFxcImh0dHBzOi8vdHdpdHRlci5jb20vc2hhcmVcXFwiIGNsYXNzPVxcXCJ0d2l0dGVyLXNoYXJlLWJ1dHRvblxcXCIgZGF0YS11cmw9XFxcImh0dHA6Ly93d3cubXVzbGltc2FnYWluc3Rpc2lzLmNvbVxcXCIgZGF0YS1zaXplPVxcXCJsYXJnZVxcXCIgZGF0YS1oYXNodGFncz1cXFwibXVzbGltc2FnYWluc3Rpc2lzXFxcIiBkYXRhLWRudD1cXFwidHJ1ZVxcXCI+VHdlZXQ8L2E+XFxuXFx0XFx0XFx0XFx0PC9mb3JtPlxcblxcdFxcdFxcdFxcdDwvZGl2PlxcblxcdFxcdFxcdFxcdDwhLS1FbmQgbWNfZW1iZWRfc2lnbnVwLS0+XFxuXFx0XFx0XFx0XFx0PGRpdiBjbGFzcz1cXFwiZmItc2hhcmUtYnV0dG9uXFxcIiBkYXRhLWhyZWY9XFxcImh0dHA6Ly93d3cubXVzbGltc2FnYWluc3Rpc2lzLmNvbVxcXCIgZGF0YS1sYXlvdXQ9XFxcImJ1dHRvblxcXCI+PC9kaXY+XFxuXFx0XFx0XFx0PC9kaXY+XFxuXFx0XFx0PC9kaXY+XFxuXFx0XFx0PC9kaXY+XFxuXFxuPC9kaXY+XCI7XG5cblxuLyoqKioqKioqKioqKioqKioqXG4gKiogV0VCUEFDSyBGT09URVJcbiAqKiAuL34vaHRtbC1sb2FkZXI/YXR0cnM9ZmFsc2UhLi9zY2VuZXMvbGlrZXBlYWNlL3NjZW5lLmh0bWxcbiAqKiBtb2R1bGUgaWQgPSAzNVxuICoqIG1vZHVsZSBjaHVua3MgPSAwXG4gKiovIiwibW9kdWxlLmV4cG9ydHMgPSBcIjxkaXYgY2xhc3M9XFxcInRhYmxlXFxcIj5cXG4gIDxkaXYgY2xhc3M9XFxcInRhYmxlLWNlbnRlclxcXCI+XFxuICAgIDxkaXYgY2xhc3M9XFxcImRpc3BsYXktNCB0ZXh0LWNlbnRlcmVkXFxcIj5XZSBhcmUgdGlyZWQgb2YgdGhlIG5lZ2F0aXZlIHByZXNzLiA8YnI+PGJyPlxcbiAgICAgIFRpcmVkIG9mIHRoZSBoYXRlIGNyaW1lcy48L2Rpdj5cXG4gIDwvZGl2PlxcbjwvZGl2PlxcblwiO1xuXG5cbi8qKioqKioqKioqKioqKioqKlxuICoqIFdFQlBBQ0sgRk9PVEVSXG4gKiogLi9+L2h0bWwtbG9hZGVyP2F0dHJzPWZhbHNlIS4vc2NlbmVzL21peGVkZmVlbGluZ3Mvc2NlbmUuaHRtbFxuICoqIG1vZHVsZSBpZCA9IDM2XG4gKiogbW9kdWxlIGNodW5rcyA9IDBcbiAqKi8iLCJtb2R1bGUuZXhwb3J0cyA9IFwiXFxuPGRpdiBjbGFzcz1cXFwibXVzbGltcy1iZWxpZXZlLWluZGl2aWR1YWwtbGlmZSBncmV5LXpvbmVcXFwiPlxcblxcdDxkaXYgY2xhc3M9XFxcInRhYmxlIFxcXCI+XFxuICBcXHRcXHQ8ZGl2IGNsYXNzPVxcXCJ0YWJsZS1jZW50ZXJcXFwiPlxcbiAgICBcXHRcXHQ8ZGl2IGNsYXNzPVxcXCJkaXNwbGF5LTQgdGV4dC1jZW50ZXJlZFxcXCI+Li4uIGJ1dCB3ZSBhcmUgTXVzbGltcy4gPGJyPjxicj4gTXVzbGltcyB0aGF0IGJlbGlldmUgRVZFUlkgbGlmZSBpcyBzYWNyZWQuPC9kaXY+XFxuICBcXHRcXHQ8L2Rpdj5cXG5cXHQ8L2Rpdj5cXG48L2Rpdj5cXG5cIjtcblxuXG4vKioqKioqKioqKioqKioqKipcbiAqKiBXRUJQQUNLIEZPT1RFUlxuICoqIC4vfi9odG1sLWxvYWRlcj9hdHRycz1mYWxzZSEuL3NjZW5lcy9tdXNsaW1zYmVsaWV2ZWluZGl2aWR1YWxsaWZlL3NjZW5lLmh0bWxcbiAqKiBtb2R1bGUgaWQgPSAzN1xuICoqIG1vZHVsZSBjaHVua3MgPSAwXG4gKiovIiwibW9kdWxlLmV4cG9ydHMgPSBcIjxzdHlsZT5cXG4ub3V0LXRvLWdldC15b3Uge1xcbiAgICBvcGFjaXR5OiAwO1xcbn1cXG48L3N0eWxlPlxcblxcbjxkaXYgY2xhc3M9XFxcIm91dC10by1nZXQteW91XFxcIj5cXG5cXHQ8ZGl2IGNsYXNzPVxcXCJ0YWJsZSBcXFwiPlxcblxcdCAgPGRpdiBjbGFzcz1cXFwidGFibGUtY2VudGVyXFxcIj5cXG5cXHQgICAgPGRpdiBjbGFzcz1cXFwiZGlzcGxheS00IHRleHQtY2VudGVyZWRcXFwiPi4uLmxpa2UgZXZlcnlib2R5J3Mgb3V0IHRvIGdldCB5b3UuLi48L2Rpdj5cXG5cXHQgIDwvZGl2PlxcblxcdDwvZGl2PlxcbjwvZGl2PlwiO1xuXG5cbi8qKioqKioqKioqKioqKioqKlxuICoqIFdFQlBBQ0sgRk9PVEVSXG4gKiogLi9+L2h0bWwtbG9hZGVyP2F0dHJzPWZhbHNlIS4vc2NlbmVzL291dHRvZ2V0eW91L3NjZW5lLmh0bWxcbiAqKiBtb2R1bGUgaWQgPSAzOFxuICoqIG1vZHVsZSBjaHVua3MgPSAwXG4gKiovIiwibW9kdWxlLmV4cG9ydHMgPSBcIjxzdHlsZT5cXG4gICNyZWFjdGlvbnN0b3RlcnJvciAuZGlzcGxheS00IHtcXG4gICAgYmFja2dyb3VuZDogYmxhY2s7XFxuICAgIGRpc3BsYXk6IGlubGluZS1ibG9jaztcXG4gICAgcGFkZGluZzogMC41dnc7XFxuICAgIC8qcG9zaXRpb246IGFic29sdXRlOyovXFxuICAgIC8qYm90dG9tOiA1dmg7Ki9cXG5cXG4gIH1cXG4gICNyZWFjdGlvbnN0b3RlcnJvciAuYW5pbS0xIHtcXG4gICAgb3BhY2l0eTogMDtcXG4gIH1cXG48L3N0eWxlPlxcbjxkaXYgY2xhc3M9XFxcInZpZGVvLWJhY2tncm91bmRcXFwiPlxcbiAgPHZpZGVvIGxvb3AgbWF4LXZvbHVtZT1cXFwiMC40XFxcIj5cXG4gICAgPHNvdXJjZSBzcmM9XFxcImltZy9SZXZpc2VkV29yazIubXA0XFxcIiB0eXBlPVxcXCJ2aWRlby9tcDRcXFwiPlxcbiAgPC92aWRlbz5cXG48L2Rpdj5cXG48ZGl2IGNsYXNzPVxcXCJ0YWJsZVxcXCI+XFxuICAgIDxkaXYgY2xhc3M9XFxcInRhYmxlLWNlbnRlclxcXCI+XFxuICAgICAgPGRpdiBjbGFzcz1cXFwiZGlzcGxheS00IGFuaW0tMVxcXCI+SG93IGRvIHlvdSBmZWVsIGFib3V0IGhvdyBwZW9wbGUgcmVhY3QgdG8gdGhlIGF0dGFja3M/PC9kaXY+PGJyIC8+PGJyIC8+XFxuICAgIDwvZGl2PlxcbjwvZGl2PlxcblwiO1xuXG5cbi8qKioqKioqKioqKioqKioqKlxuICoqIFdFQlBBQ0sgRk9PVEVSXG4gKiogLi9+L2h0bWwtbG9hZGVyP2F0dHJzPWZhbHNlIS4vc2NlbmVzL3JlYWN0aW9uc3RvdGVycm9yL3NjZW5lLmh0bWxcbiAqKiBtb2R1bGUgaWQgPSAzOVxuICoqIG1vZHVsZSBjaHVua3MgPSAwXG4gKiovIiwibW9kdWxlLmV4cG9ydHMgPSBcIjxzdHlsZT5cXG4jc29tZXRoaW5nLXRvLXByb3ZlIC5kaXNwbGF5LTQge1xcbiAgICBvcGFjaXR5OiAwO1xcbn1cXG48L3N0eWxlPlxcbjxkaXYgY2xhc3M9XFxcInNvbWV0aGluZy10by1wcm92ZVxcXCI+XFxuXFx0PGRpdiBjbGFzcz1cXFwidGFibGUgXFxcIj5cXG4gIFxcdFxcdDxkaXYgY2xhc3M9XFxcInRhYmxlLWNlbnRlclxcXCI+XFxuICAgIFxcdFxcdDxkaXYgY2xhc3M9XFxcImRpc3BsYXktNCB0ZXh0LWNlbnRlcmVkXFxcIj4uLi5saWtlIHlvdSBoYXZlIDxzdHJvbmc+c29tZXRoaW5nIHRvIHByb3ZlPC9zdHJvbmc+LjwvZGl2PlxcbiAgXFx0XFx0PC9kaXY+XFxuXFx0PC9kaXY+XFxuPC9kaXY+XCI7XG5cblxuLyoqKioqKioqKioqKioqKioqXG4gKiogV0VCUEFDSyBGT09URVJcbiAqKiAuL34vaHRtbC1sb2FkZXI/YXR0cnM9ZmFsc2UhLi9zY2VuZXMvc29tZXRoaW5ndG9wcm92ZS9zY2VuZS5odG1sXG4gKiogbW9kdWxlIGlkID0gNDBcbiAqKiBtb2R1bGUgY2h1bmtzID0gMFxuICoqLyIsIm1vZHVsZS5leHBvcnRzID0gXCJcXG48ZGl2IGNsYXNzPVxcXCJ3ZS1hcmUtY29taW5nIGdyZXktem9uZVxcXCI+XFxuXFx0PGRpdiBjbGFzcz1cXFwidGFibGUgXFxcIj5cXG4gIFxcdFxcdDxkaXYgY2xhc3M9XFxcInRhYmxlLWNlbnRlclxcXCI+XFxuICAgIFxcdFxcdDxkaXYgY2xhc3M9XFxcImRpc3BsYXktNCB0ZXh0LWNlbnRlcmVkXFxcIj5XZSBhcmUgY29taW5nLjwvZGl2PlxcbiAgXFx0XFx0PC9kaXY+XFxuXFx0PC9kaXY+XFxuPC9kaXY+XFxuXCI7XG5cblxuLyoqKioqKioqKioqKioqKioqXG4gKiogV0VCUEFDSyBGT09URVJcbiAqKiAuL34vaHRtbC1sb2FkZXI/YXR0cnM9ZmFsc2UhLi9zY2VuZXMvd2VhcmVjb21pbmcvc2NlbmUuaHRtbFxuICoqIG1vZHVsZSBpZCA9IDQxXG4gKiogbW9kdWxlIGNodW5rcyA9IDBcbiAqKi8iLCJtb2R1bGUuZXhwb3J0cyA9IFwiXFxuPGRpdiBjbGFzcz1cXFwid2UtYXJlLW5vdC1hZnJhaWQgZ3JleS16b25lXFxcIj5cXG5cXHQ8ZGl2IGNsYXNzPVxcXCJ0YWJsZSBcXFwiPlxcbiAgXFx0XFx0PGRpdiBjbGFzcz1cXFwidGFibGUtY2VudGVyXFxcIj5cXG4gICAgXFx0XFx0PGRpdiBjbGFzcz1cXFwiZGlzcGxheS00IHRleHQtY2VudGVyZWRcXFwiPldlIHdpbGwgZG8gbW9yZS4gV2Ugd2lsbCBzdG9wIHRoaXMgZmFsc2UgaWRlb2xvZ3kuIFdlIGFyZSBub3QgYWZyYWlkLjwvZGl2PlxcbiAgXFx0XFx0PC9kaXY+XFxuXFx0PC9kaXY+XFxuPC9kaXY+XFxuXCI7XG5cblxuLyoqKioqKioqKioqKioqKioqXG4gKiogV0VCUEFDSyBGT09URVJcbiAqKiAuL34vaHRtbC1sb2FkZXI/YXR0cnM9ZmFsc2UhLi9zY2VuZXMvd2VhcmVub3RhZnJhaWQvc2NlbmUuaHRtbFxuICoqIG1vZHVsZSBpZCA9IDQyXG4gKiogbW9kdWxlIGNodW5rcyA9IDBcbiAqKi8iLCJtb2R1bGUuZXhwb3J0cyA9IFwiPHN0eWxlPlxcbi53ZXdpbGxwcm90ZWN0ZWFjaG90aGVyIHtcXG4gICAgb3BhY2l0eTogMDtcXG59XFxuI3dld2lsbHByb3RlY3RlYWNob3RoZXIgaW1nIHtcXG4gIG1heC13aWR0aDogMzV2dztcXG59XFxuI3dld2lsbHByb3RlY3RlYWNob3RoZXIgLmNvbmNsdXNpb24sXFxuI3dld2lsbHByb3RlY3RlYWNob3RoZXIgLnByZW1pc2Uge1xcbiAgb3BhY2l0eTogMDtcXG59XFxuPC9zdHlsZT5cXG48ZGl2IGNsYXNzPVxcXCJ0YWJsZSBncmV5LXpvbmVcXFwiPlxcbiAgPGRpdiBjbGFzcz1cXFwidGFibGUtY2VudGVyXFxcIiBzdHlsZT1cXFwid2lkdGg6NTAlXFxcIj5cXG4gICAgPGRpdiBjbGFzcz1cXFwicHJlbWlzZVxcXCI+XFxuICAgICAgPGRpdiBjbGFzcz1cXFwiZGlzcGxheS0yXFxcIj5XZSB3aWxsIHByb3RlY3QgZXZlcnkgaW5kaXZpZHVhbCBsaWZlLjwvZGl2PlxcbiAgICAgIDxhIGhyZWY9XFxcImh0dHA6Ly9sZWFybmluZ2VuZ2xpc2gudm9hbmV3cy5jb20vY29udGVudC9rZW55YW4tbXVzbGltcy1wcm90ZWN0LWNocmlzdGlhbnMtZnJvbS10ZXJyb3Jpc3QtYXR0YWNrLzMxMTQzMjYuaHRtbFxcXCIgdGFyZ2V0PVxcXCJfYmxhbmtcXFwiPjxpbWcgc3JjPVxcXCIuL2ltZy9LZW55YVByb3RlY3QyLnBuZ1xcXCI+PC9hPlxcbiAgICA8L2Rpdj5cXG4gIDwvZGl2PlxcbiAgPGRpdiBjbGFzcz1cXFwidGFibGUtY2VudGVyXFxcIiBzdHlsZT1cXFwid2lkdGg6NDUlXFxcIj5cXG4gICAgPGgyIGNsYXNzPVxcXCJjb25jbHVzaW9uXFxcIj5cXG4gICAgICA8ZGl2IGNsYXNzPVxcXCJkaXNwbGF5LTJcXFwiPldlIHdpbGwgYXNrIG90aGVycyB0byBoZWxwIHByb3RlY3Qgb3Vycy48L2Rpdj5cXG4gICAgICA8YSBocmVmPVxcXCJodHRwOi8vd3d3LnVzYXRvZGF5LmNvbS9zdG9yeS9uZXdzL25hdGlvbi1ub3cvMjAxNS8xMi8yMi9pd2lsbHByb3RlY3R5b3UtdXMtc2VydmljZS1tZW1iZXJzLXNvb3RoZS1zY2FyZWQtbXVzbGltLWdpcmwvNzc3NDg4NzQvXFxcIiB0YXJnZXQ9XFxcIl9ibGFua1xcXCI+PGltZyBzcmM9XFxcIi4vaW1nL0lXaWxsUHJvdGVjdFlvdS5wbmdcXFwiPjwvYT5cXG4gICAgPC9oMj5cXG4gIDwvZGl2PlxcbjwvZGl2PlxcblwiO1xuXG5cbi8qKioqKioqKioqKioqKioqKlxuICoqIFdFQlBBQ0sgRk9PVEVSXG4gKiogLi9+L2h0bWwtbG9hZGVyP2F0dHJzPWZhbHNlIS4vc2NlbmVzL3dld2lsbHByb3RlY3RlYWNob3RoZXIvc2NlbmUuaHRtbFxuICoqIG1vZHVsZSBpZCA9IDQzXG4gKiogbW9kdWxlIGNodW5rcyA9IDBcbiAqKi8iLCJtb2R1bGUuZXhwb3J0cyA9IFwiPHN0eWxlPlxcbiAgI2RveW91ZmVlbG11c2xpbSAuYW5pbS0yIHtcXG4gICAgb3BhY2l0eTogMDtcXG4gIH1cXG4gIC52aWRlby1iYWNrZ3JvdW5kIHZpZGVvIHtcXG4gICAgd2lkdGg6IDEwMHZ3O1xcbiAgfVxcbiAgLnZpZGVvLWJhY2tncm91bmQge1xcbiAgICBwb3NpdGlvbjogZml4ZWQ7XFxuICAgIHRvcDogMDtcXG4gICAgbGVmdDogMDtcXG4gIH1cXG4gICN3aGF0aXNsYW1pY2hpc3RvcnlwcmVmZXJzIC5kaXNwbGF5LTQgYSxcXG4gIC5pc2xhbWljLWludmVudGlvbnMge1xcbiAgICBjb2xvcjogcmdiYSgyNTUsMjU1LDI1NSwxKTtcXG4gIH1cXG5cXG4gIC5pc2xhbWljLWludmVudGlvbnMge1xcbiAgICBvcGFjaXR5OiAwO1xcbiAgfVxcblxcbjwvc3R5bGU+XFxuPGRpdiBjbGFzcz1cXFwidmlkZW8tYmFja2dyb3VuZFxcXCI+XFxuICA8dmlkZW8gbG9vcCBtYXgtdm9sdW1lPVxcXCIxXFxcIj5cXG4gICAgPHNvdXJjZSBzcmM9XFxcImltZy90eXNvbi5tcDRcXFwiIHR5cGU9XFxcInZpZGVvL21wNFxcXCI+XFxuICA8L3ZpZGVvPlxcbjwvZGl2PlxcbjxkaXYgY2xhc3M9XFxcInRhYmxlXFxcIj5cXG4gIDxkaXYgY2xhc3M9XFxcInRhYmxlLWNlbnRlclxcXCI+XFxuICAgIDxkaXYgY2xhc3M9XFxcImRpc3BsYXktNCBhbmltLTFcXFwiPjxhIGhyZWY9XFxcImh0dHBzOi8vd3d3LnlvdXR1YmUuY29tL3dhdGNoP3Y9V1pDdUY3MzNwODhcXFwiIHRhcmdldD1cXFwiX2JsYW5rXFxcIj5IYXMgSVNJUyBmb3Jnb3R0ZW4gdGhlIGJlc3Qgb2Ygd2hhdCBNdXNsaW1zIGhhdmUgZG9uZT8/PC9hPjwvZGl2PlxcbiAgICA8ZGl2IGNsYXNzPVxcXCJkaXNwbGF5LTMgaXNsYW1pYy1pbnZlbnRpb25zXFxcIj5cXG4gICAgICA8ZGl2PkFsZ2VicmE8L2Rpdj5cXG4gICAgICA8ZGl2PlN1cmdpY2FsIElubm92YXRpb25zPC9kaXY+XFxuICAgICAgPGRpdj5Nb2Rlcm4gSG9zcGl0YWxzPC9kaXY+XFxuICAgICAgPGRpdj5BY2NyZWRpdGVkIFVuaXZlcnNpdGllczwvZGl2PlxcbiAgICAgIDxkaXY+VGhlIEd1aXRhcjwvZGl2PlxcbiAgICA8L2Rpdj5cXG4gIDwvZGl2PlxcbjwvZGl2PlxcblwiO1xuXG5cbi8qKioqKioqKioqKioqKioqKlxuICoqIFdFQlBBQ0sgRk9PVEVSXG4gKiogLi9+L2h0bWwtbG9hZGVyP2F0dHJzPWZhbHNlIS4vc2NlbmVzL3doYXRpc2xhbWljaGlzdG9yeXByZWZlcnMvc2NlbmUuaHRtbFxuICoqIG1vZHVsZSBpZCA9IDQ0XG4gKiogbW9kdWxlIGNodW5rcyA9IDBcbiAqKi8iLCJtb2R1bGUuZXhwb3J0cyA9IFwiXFxuICAgICAgICAgICAgICA8IS0tIHRoZSBRdXLigJlhbiBwcmVmZXJzIGxlYXJuaW5nICjigJhpbG0pIG92ZXIgbXVyZGVyLlxcbiAgICAgICAgICAgICAgTGFzdCB0aW1lIHdlIGNoZWNrZWQsIHRoZSBRdXLigJlhbiB2YWx1ZXMgc2NpZW50aWZpYyBvYnNlcnZhdGlvbiwgZXhwZXJpbWVudGFsIGtub3dsZWRnZSBhbmQgcmF0aW9uYWxpdHksIG92ZXIgYmxpbmQgbGVhZGVyc2hpcCBmb2xsb3dpbmcsIGFzIHNlZW4gaW4gNzUwIFZFUlNFUyAoMTAlKSBvZiB0aGUgUXVy4oCZYW4uIC0tPlxcblxcbjxkaXYgY2xhc3M9XFxcInRhYmxlXFxcIj5cXG4gIDxkaXYgY2xhc3M9XFxcInRhYmxlLWNlbnRlclxcXCI+XFxuICAgIDxkaXYgY2xhc3M9XFxcImRpc3BsYXktNCBhbmltLTFcXFwiPkxhc3QgdGltZSB3ZSBjaGVja2VkLDwvZGl2PjxiciAvPjxiciAvPlxcbiAgICA8ZGl2IGNsYXNzPVxcXCJkaXNwbGF5LTEgYW5pbS0xXFxcIj5UaGUgUXVy4oCZYW4gcHJlZmVycyBmb3JnaXZlbmVzcyBvdmVyIHB1bmlzaG1lbnQuPC9kaXY+PGJyIC8+PGJyIC8+XFxuICAgIDxkaXYgY2xhc3M9XFxcImRpc3BsYXktMSBhbmltLTFcXFwiPlRoZSBRdXLigJlhbiBwcmVmZXJzIHBlYWNlIG92ZXIgb3ZlciB3YXIuPC9kaXY+PGJyIC8+PGJyIC8+XFxuICAgIDxkaXYgY2xhc3M9XFxcImRpc3BsYXktMSBhbmltLTFcXFwiPlRoZSBRdXLigJlhbiBwcmVmZXJzIGtub3dsZWRnZSBvdmVyIGJsaW5kbmVzcy48L2Rpdj48YnIgLz48YnIgLz5cXG4gIDwvZGl2PlxcbjwvZGl2PlxcblwiO1xuXG5cbi8qKioqKioqKioqKioqKioqKlxuICoqIFdFQlBBQ0sgRk9PVEVSXG4gKiogLi9+L2h0bWwtbG9hZGVyP2F0dHJzPWZhbHNlIS4vc2NlbmVzL3doYXR0aGVxdXJhbnByZWZlcnMvc2NlbmUuaHRtbFxuICoqIG1vZHVsZSBpZCA9IDQ1XG4gKiogbW9kdWxlIGNodW5rcyA9IDBcbiAqKi8iLCJtb2R1bGUuZXhwb3J0cyA9IFwiXFxuPGRpdiBjbGFzcz1cXFwidGFibGVcXFwiPlxcbiAgPGRpdiBjbGFzcz1cXFwidGFibGUtY2VudGVyXFxcIj5cXG4gICAgPGRpdiBjbGFzcz1cXFwiZGlzcGxheS00IHRleHQtY2VudGVyZWRcXFwiPldobyBhcmUgdGhleSB0byBkZWNsYXJlIHdobyBpcyBNdXNsaW0gYW5kIHdobyBpcyBub3Q/IFdoYXQgaXMgSXNsYW0gYW5kIHdoYXQgaXMgbm90PzwvZGl2PlxcbiAgPC9kaXY+XFxuPC9kaXY+XFxuXCI7XG5cblxuLyoqKioqKioqKioqKioqKioqXG4gKiogV0VCUEFDSyBGT09URVJcbiAqKiAuL34vaHRtbC1sb2FkZXI/YXR0cnM9ZmFsc2UhLi9zY2VuZXMvd2hvYXJldGhleS9zY2VuZS5odG1sXG4gKiogbW9kdWxlIGlkID0gNDZcbiAqKiBtb2R1bGUgY2h1bmtzID0gMFxuICoqLyIsIm1vZHVsZS5leHBvcnRzID0gXCJcXG48ZGl2IGNsYXNzPVxcXCJ0YWJsZVxcXCI+XFxuICA8ZGl2IGNsYXNzPVxcXCJ0YWJsZS1jZW50ZXJcXFwiPlxcbiAgICA8ZGl2IGNsYXNzPVxcXCJkaXNwbGF5LTRcXFwiPldpdGggYWxsIHRoZSBoYXRyZWQgb24gdGhlIG5ld3MuPC9kaXY+XFxuICA8L2Rpdj5cXG48L2Rpdj5cXG5cIjtcblxuXG4vKioqKioqKioqKioqKioqKipcbiAqKiBXRUJQQUNLIEZPT1RFUlxuICoqIC4vfi9odG1sLWxvYWRlcj9hdHRycz1mYWxzZSEuL3NjZW5lcy93aXRoYWxsdGhlaGF0cmVkL3NjZW5lLmh0bWxcbiAqKiBtb2R1bGUgaWQgPSA0N1xuICoqIG1vZHVsZSBjaHVua3MgPSAwXG4gKiovIiwibW9kdWxlLmV4cG9ydHMgPSBcIjxkaXYgY2xhc3M9XFxcInRhYmxlXFxcIj5cXG4gIDxkaXYgY2xhc3M9XFxcInRhYmxlLWNlbnRlclxcXCI+XFxuICAgIDxkaXYgY2xhc3M9XFxcImRpc3BsYXktNCB0ZXh0LWNlbnRlcmVkXFxcIj5XZSBtYXkgbm90IGFncmVlIG9uIGV2ZXJ5IGFzcGVjdCBvZiBJc2xhbSwgPGJyPiA8YnI+XFxuICAgICAgYnV0IHdlIGNhbiBhZ3JlZSBvbiBvbmUgdGhpbmcuLi48L2Rpdj5cXG4gIDwvZGl2PlxcbjwvZGl2PlxcblwiO1xuXG5cbi8qKioqKioqKioqKioqKioqKlxuICoqIFdFQlBBQ0sgRk9PVEVSXG4gKiogLi9+L2h0bWwtbG9hZGVyP2F0dHJzPWZhbHNlIS4vc2NlbmVzL3lldHRoYXRzb2theS9zY2VuZS5odG1sXG4gKiogbW9kdWxlIGlkID0gNDhcbiAqKiBtb2R1bGUgY2h1bmtzID0gMFxuICoqLyIsInZhciBtYXAgPSB7XG5cdFwiLi9hYm91dHlvdXJzZWxmL3NjZW5lLmpzb25cIjogNTAsXG5cdFwiLi9iYXR0bGVvZmFnZW5lcmF0aW9uL3NjZW5lLmpzb25cIjogNTEsXG5cdFwiLi9jb21wbGljYXRlZHNpdHVhdGlvbi9zY2VuZS5qc29uXCI6IDUyLFxuXHRcIi4vZGlmZmVyZW50cHJhY3RpY2VzL3NjZW5lLmpzb25cIjogNTMsXG5cdFwiLi9kb3lvdWZlZWxtdXNsaW0vc2NlbmUuanNvblwiOiA1NCxcblx0XCIuL2V4cGxvc2lvbi9zY2VuZS5qc29uXCI6IDU1LFxuXHRcIi4vZmVlbGluZ2NvbmZ1c2VkL3NjZW5lLmpzb25cIjogNTYsXG5cdFwiLi9pbnRyby9zY2VuZS5qc29uXCI6IDU3LFxuXHRcIi4vaXNpc2FmdGVybGlmZWZhbGxhY3kvc2NlbmUuanNvblwiOiA1OCxcblx0XCIuL2lzaXNhcG9jYWx5cHNlbWlzcXVvdGUvc2NlbmUuanNvblwiOiA1OSxcblx0XCIuL2lzaXNiYW5rcnVwdC9zY2VuZS5qc29uXCI6IDYwLFxuXHRcIi4vaXNpc2ZpZ2h0bWlzcXVvdGUvc2NlbmUuanNvblwiOiA2MSxcblx0XCIuL2lzaXNvYmplY3RpdmUvc2NlbmUuanNvblwiOiA2Mixcblx0XCIuL2lzaXN3YW50c3RvZGl2aWRlL3NjZW5lLmpzb25cIjogNjMsXG5cdFwiLi9pdGlzbnRlYXN5L3NjZW5lLmpzb25cIjogNjQsXG5cdFwiLi9pdHNnb3R0b2VuZC9zY2VuZS5qc29uXCI6IDY1LFxuXHRcIi4vaXdhbnRteWlzbGFtYmFjazEvc2NlbmUuanNvblwiOiA2Nixcblx0XCIuL2xpa2VwZWFjZS9zY2VuZS5qc29uXCI6IDY3LFxuXHRcIi4vbWl4ZWRmZWVsaW5ncy9zY2VuZS5qc29uXCI6IDY4LFxuXHRcIi4vbXVzbGltc2JlbGlldmVpbmRpdmlkdWFsbGlmZS9zY2VuZS5qc29uXCI6IDY5LFxuXHRcIi4vb3V0dG9nZXR5b3Uvc2NlbmUuanNvblwiOiA3MCxcblx0XCIuL3JlYWN0aW9uc3RvdGVycm9yL3NjZW5lLmpzb25cIjogNzEsXG5cdFwiLi9zb21ldGhpbmd0b3Byb3ZlL3NjZW5lLmpzb25cIjogNzIsXG5cdFwiLi93ZWFyZWNvbWluZy9zY2VuZS5qc29uXCI6IDczLFxuXHRcIi4vd2VhcmVub3RhZnJhaWQvc2NlbmUuanNvblwiOiA3NCxcblx0XCIuL3dld2lsbHByb3RlY3RlYWNob3RoZXIvc2NlbmUuanNvblwiOiA3NSxcblx0XCIuL3doYXRpc2xhbWljaGlzdG9yeXByZWZlcnMvc2NlbmUuanNvblwiOiA3Nixcblx0XCIuL3doYXR0aGVxdXJhbnByZWZlcnMvc2NlbmUuanNvblwiOiA3Nyxcblx0XCIuL3dob2FyZXRoZXkvc2NlbmUuanNvblwiOiA3OCxcblx0XCIuL3dpdGhhbGx0aGVoYXRyZWQvc2NlbmUuanNvblwiOiA3OSxcblx0XCIuL3lldHRoYXRzb2theS9zY2VuZS5qc29uXCI6IDgwXG59O1xuZnVuY3Rpb24gd2VicGFja0NvbnRleHQocmVxKSB7XG5cdHJldHVybiBfX3dlYnBhY2tfcmVxdWlyZV9fKHdlYnBhY2tDb250ZXh0UmVzb2x2ZShyZXEpKTtcbn07XG5mdW5jdGlvbiB3ZWJwYWNrQ29udGV4dFJlc29sdmUocmVxKSB7XG5cdHJldHVybiBtYXBbcmVxXSB8fCAoZnVuY3Rpb24oKSB7IHRocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIgKyByZXEgKyBcIicuXCIpIH0oKSk7XG59O1xud2VicGFja0NvbnRleHQua2V5cyA9IGZ1bmN0aW9uIHdlYnBhY2tDb250ZXh0S2V5cygpIHtcblx0cmV0dXJuIE9iamVjdC5rZXlzKG1hcCk7XG59O1xud2VicGFja0NvbnRleHQucmVzb2x2ZSA9IHdlYnBhY2tDb250ZXh0UmVzb2x2ZTtcbm1vZHVsZS5leHBvcnRzID0gd2VicGFja0NvbnRleHQ7XG53ZWJwYWNrQ29udGV4dC5pZCA9IDQ5O1xuXG5cblxuLyoqKioqKioqKioqKioqKioqXG4gKiogV0VCUEFDSyBGT09URVJcbiAqKiAuL3NjZW5lcyAuL34vanNvbi1sb2FkZXIhXlxcLlxcLy4qXFwvc2NlbmVcXC5qc29uJFxuICoqIG1vZHVsZSBpZCA9IDQ5XG4gKiogbW9kdWxlIGNodW5rcyA9IDBcbiAqKi8iLCJtb2R1bGUuZXhwb3J0cyA9IFtcblx0e1xuXHRcdFwid3JhcHBlclwiOiBcIiNhYm91dHlvdXJzZWxmXCIsXG5cdFx0XCJkdXJhdGlvblwiOiBcIjEwMCVcIixcblx0XHRcImFuaW1hdGlvbnNcIjogW1xuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLmFib3V0LXlvdXJzZWxmXCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MCxcblx0XHRcdFx0XHQxXG5cdFx0XHRcdF1cblx0XHRcdH1cblx0XHRdXG5cdH0sXG5cdHtcblx0XHRcIndyYXBwZXJcIjogXCIjYWJvdXR5b3Vyc2VsZlwiLFxuXHRcdFwiZHVyYXRpb25cIjogXCIxMDAlXCIsXG5cdFx0XCJmb2N1c1wiOiB0cnVlLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXG5cdFx0XHR7fVxuXHRcdF1cblx0fSxcblx0e1xuXHRcdFwid3JhcHBlclwiOiBcIiNhYm91dHlvdXJzZWxmXCIsXG5cdFx0XCJkdXJhdGlvblwiOiBcIjEwMCVcIixcblx0XHRcImFuaW1hdGlvbnNcIjogW1xuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLmFib3V0LXlvdXJzZWxmXCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0Mixcblx0XHRcdFx0XHQwXG5cdFx0XHRcdF1cblx0XHRcdH1cblx0XHRdXG5cdH1cbl07XG5cblxuLyoqKioqKioqKioqKioqKioqXG4gKiogV0VCUEFDSyBGT09URVJcbiAqKiAuL34vanNvbi1sb2FkZXIhLi9zY2VuZXMvYWJvdXR5b3Vyc2VsZi9zY2VuZS5qc29uXG4gKiogbW9kdWxlIGlkID0gNTBcbiAqKiBtb2R1bGUgY2h1bmtzID0gMFxuICoqLyIsIm1vZHVsZS5leHBvcnRzID0gW1xuXHR7XG5cdFx0XCJ3cmFwcGVyXCI6IFwiI2JhdHRsZW9mYWdlbmVyYXRpb25cIixcblx0XHRcImR1cmF0aW9uXCI6IFwiMTAwJVwiLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIuZGlzcGxheS00XCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MCxcblx0XHRcdFx0XHQxXG5cdFx0XHRcdF1cblx0XHRcdH1cblx0XHRdXG5cdH0sXG5cdHtcblx0XHRcIndyYXBwZXJcIjogXCIjYmF0dGxlb2ZhZ2VuZXJhdGlvblwiLFxuXHRcdFwiZHVyYXRpb25cIjogXCIxMDAlXCIsXG5cdFx0XCJmb2N1c1wiOiB0cnVlLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXG5cdFx0XHR7fVxuXHRcdF1cblx0fSxcblx0e1xuXHRcdFwid3JhcHBlclwiOiBcIiNiYXR0bGVvZmFnZW5lcmF0aW9uXCIsXG5cdFx0XCJkdXJhdGlvblwiOiBcIjEwMCVcIixcblx0XHRcImFuaW1hdGlvbnNcIjogW1xuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLmRpc3BsYXktNFwiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDEsXG5cdFx0XHRcdFx0MFxuXHRcdFx0XHRdXG5cdFx0XHR9XG5cdFx0XVxuXHR9XG5dO1xuXG5cbi8qKioqKioqKioqKioqKioqKlxuICoqIFdFQlBBQ0sgRk9PVEVSXG4gKiogLi9+L2pzb24tbG9hZGVyIS4vc2NlbmVzL2JhdHRsZW9mYWdlbmVyYXRpb24vc2NlbmUuanNvblxuICoqIG1vZHVsZSBpZCA9IDUxXG4gKiogbW9kdWxlIGNodW5rcyA9IDBcbiAqKi8iLCJtb2R1bGUuZXhwb3J0cyA9IFtcblx0e1xuXHRcdFwid3JhcHBlclwiOiBcIiNjb21wbGljYXRlZHNpdHVhdGlvblwiLFxuXHRcdFwiZHVyYXRpb25cIjogXCIxMDAlXCIsXG5cdFx0XCJhbmltYXRpb25zXCI6IFtcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5kaXNwbGF5LTRcIixcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQwLFxuXHRcdFx0XHRcdDFcblx0XHRcdFx0XVxuXHRcdFx0fVxuXHRcdF1cblx0fSxcblx0e1xuXHRcdFwid3JhcHBlclwiOiBcIiNjb21wbGljYXRlZHNpdHVhdGlvblwiLFxuXHRcdFwiZHVyYXRpb25cIjogXCIxMDAlXCIsXG5cdFx0XCJmb2N1c1wiOiB0cnVlLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXG5cdFx0XHR7fVxuXHRcdF1cblx0fSxcblx0e1xuXHRcdFwid3JhcHBlclwiOiBcIiNjb21wbGljYXRlZHNpdHVhdGlvblwiLFxuXHRcdFwiZHVyYXRpb25cIjogXCIxMDAlXCIsXG5cdFx0XCJhbmltYXRpb25zXCI6IFtcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5kaXNwbGF5LTRcIixcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQxLFxuXHRcdFx0XHRcdDBcblx0XHRcdFx0XVxuXHRcdFx0fSxcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi50b28tbG9uZy1xdW90ZVwiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDEsXG5cdFx0XHRcdFx0MFxuXHRcdFx0XHRdXG5cdFx0XHR9XG5cdFx0XVxuXHR9XG5dO1xuXG5cbi8qKioqKioqKioqKioqKioqKlxuICoqIFdFQlBBQ0sgRk9PVEVSXG4gKiogLi9+L2pzb24tbG9hZGVyIS4vc2NlbmVzL2NvbXBsaWNhdGVkc2l0dWF0aW9uL3NjZW5lLmpzb25cbiAqKiBtb2R1bGUgaWQgPSA1MlxuICoqIG1vZHVsZSBjaHVua3MgPSAwXG4gKiovIiwibW9kdWxlLmV4cG9ydHMgPSBbXG5cdHtcblx0XHRcIndyYXBwZXJcIjogXCIjZGlmZmVyZW50cHJhY3RpY2VzXCIsXG5cdFx0XCJkdXJhdGlvblwiOiBcIjEwMCVcIixcblx0XHRcImFuaW1hdGlvbnNcIjogW1xuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLmRpc3BsYXktNFwiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDAsXG5cdFx0XHRcdFx0MS4yNVxuXHRcdFx0XHRdXG5cdFx0XHR9XG5cdFx0XVxuXHR9LFxuXHR7XG5cdFx0XCJ3cmFwcGVyXCI6IFwiI2RpZmZlcmVudHByYWN0aWNlc1wiLFxuXHRcdFwiZHVyYXRpb25cIjogXCIxMDAlXCIsXG5cdFx0XCJmb2N1c1wiOiB0cnVlLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXG5cdFx0XHR7fVxuXHRcdF1cblx0fSxcblx0e1xuXHRcdFwid3JhcHBlclwiOiBcIiNkaWZmZXJlbnRwcmFjdGljZXNcIixcblx0XHRcImR1cmF0aW9uXCI6IFwiMTAwJVwiLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIuZGlzcGxheS00XCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0Mixcblx0XHRcdFx0XHQwXG5cdFx0XHRcdF1cblx0XHRcdH1cblx0XHRdXG5cdH1cbl07XG5cblxuLyoqKioqKioqKioqKioqKioqXG4gKiogV0VCUEFDSyBGT09URVJcbiAqKiAuL34vanNvbi1sb2FkZXIhLi9zY2VuZXMvZGlmZmVyZW50cHJhY3RpY2VzL3NjZW5lLmpzb25cbiAqKiBtb2R1bGUgaWQgPSA1M1xuICoqIG1vZHVsZSBjaHVua3MgPSAwXG4gKiovIiwibW9kdWxlLmV4cG9ydHMgPSBbXG5cdHtcblx0XHRcIndyYXBwZXJcIjogXCIjZG95b3VmZWVsbXVzbGltXCIsXG5cdFx0XCJkdXJhdGlvblwiOiBcIjUwJVwiLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIuYW5pbS0xXCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiAxXG5cdFx0XHR9XG5cdFx0XVxuXHR9LFxuXHR7XG5cdFx0XCJ3cmFwcGVyXCI6IFwiI2RveW91ZmVlbG11c2xpbVwiLFxuXHRcdFwiZHVyYXRpb25cIjogXCIxMDAlXCIsXG5cdFx0XCJmb2N1c1wiOiAzLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXG5cdFx0XHR7fVxuXHRcdF1cblx0fSxcblx0e1xuXHRcdFwid3JhcHBlclwiOiBcIiNkb3lvdWZlZWxtdXNsaW1cIixcblx0XHRcImR1cmF0aW9uXCI6IFwiMTAwJVwiLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIuYW5pbS0xXCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MSxcblx0XHRcdFx0XHQwXG5cdFx0XHRcdF0sXG5cdFx0XHRcdFwidHJhbnNsYXRlWVwiOiBbXG5cdFx0XHRcdFx0XCIwJVwiLFxuXHRcdFx0XHRcdFwiLTUlXCJcblx0XHRcdFx0XVxuXHRcdFx0fVxuXHRcdF1cblx0fVxuXTtcblxuXG4vKioqKioqKioqKioqKioqKipcbiAqKiBXRUJQQUNLIEZPT1RFUlxuICoqIC4vfi9qc29uLWxvYWRlciEuL3NjZW5lcy9kb3lvdWZlZWxtdXNsaW0vc2NlbmUuanNvblxuICoqIG1vZHVsZSBpZCA9IDU0XG4gKiogbW9kdWxlIGNodW5rcyA9IDBcbiAqKi8iLCJtb2R1bGUuZXhwb3J0cyA9IFtcblx0e1xuXHRcdFwid3JhcHBlclwiOiBcIiNleHBsb3Npb25cIixcblx0XHRcImR1cmF0aW9uXCI6IFwiMTUwJVwiLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIuZXhwbG9zaW9uLWJ5bGluZVwiLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVlcIjogXCItMjUlXCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MCxcblx0XHRcdFx0XHQxLjc1XG5cdFx0XHRcdF1cblx0XHRcdH0sXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIjZG9tRXhwbG9zaW9uTGlzdFwiLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVlcIjogXCItNzAlXCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MCxcblx0XHRcdFx0XHQxXG5cdFx0XHRcdF1cblx0XHRcdH1cblx0XHRdXG5cdH0sXG5cdHtcblx0XHRcIndyYXBwZXJcIjogXCIjZXhwbG9zaW9uXCIsXG5cdFx0XCJkdXJhdGlvblwiOiBcIjE1MCVcIixcblx0XHRcImFuaW1hdGlvbnNcIjogW1xuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLmRlaS0xXCIsXG5cdFx0XHRcdFwidHJhbnNsYXRlWVwiOiBcIi0xNSVcIixcblx0XHRcdFx0XCJ0cmFuc2xhdGVYXCI6IFwiLTEwJVwiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDEsXG5cdFx0XHRcdFx0MFxuXHRcdFx0XHRdLFxuXHRcdFx0XHRcInNjYWxlXCI6IDJcblx0XHRcdH0sXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIuZGVpLTJcIixcblx0XHRcdFx0XCJ0cmFuc2xhdGVZXCI6IFwiLTUlXCIsXG5cdFx0XHRcdFwidHJhbnNsYXRlWFwiOiBcIi00JVwiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDEsXG5cdFx0XHRcdFx0MFxuXHRcdFx0XHRdXG5cdFx0XHR9LFxuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLmRlaS0zXCIsXG5cdFx0XHRcdFwidHJhbnNsYXRlWVwiOiBcIi05JVwiLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVhcIjogXCIyJVwiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDEsXG5cdFx0XHRcdFx0MFxuXHRcdFx0XHRdLFxuXHRcdFx0XHRcInNjYWxlXCI6IDEuMlxuXHRcdFx0fSxcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5kZWktNFwiLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVlcIjogXCItMTclXCIsXG5cdFx0XHRcdFwidHJhbnNsYXRlWFwiOiBcIjglXCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MSxcblx0XHRcdFx0XHQwXG5cdFx0XHRcdF0sXG5cdFx0XHRcdFwic2NhbGVcIjogMS41XG5cdFx0XHR9LFxuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLmRlaS01XCIsXG5cdFx0XHRcdFwidHJhbnNsYXRlWVwiOiBcIi0yJVwiLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVhcIjogXCItMTUlXCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MSxcblx0XHRcdFx0XHQwXG5cdFx0XHRcdF0sXG5cdFx0XHRcdFwic2NhbGVcIjogMlxuXHRcdFx0fSxcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5kZWktNlwiLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVlcIjogXCItMSVcIixcblx0XHRcdFx0XCJ0cmFuc2xhdGVYXCI6IFwiLTclXCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MSxcblx0XHRcdFx0XHQwXG5cdFx0XHRcdF0sXG5cdFx0XHRcdFwic2NhbGVcIjogMS4yXG5cdFx0XHR9LFxuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLmRlaS03XCIsXG5cdFx0XHRcdFwidHJhbnNsYXRlWVwiOiBcIi00JVwiLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVhcIjogXCIyJVwiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDEsXG5cdFx0XHRcdFx0MFxuXHRcdFx0XHRdLFxuXHRcdFx0XHRcInNjYWxlXCI6IDEuMVxuXHRcdFx0fSxcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5kZWktOFwiLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVlcIjogXCItMyVcIixcblx0XHRcdFx0XCJ0cmFuc2xhdGVYXCI6IFwiMTIlXCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MSxcblx0XHRcdFx0XHQwXG5cdFx0XHRcdF0sXG5cdFx0XHRcdFwic2NhbGVcIjogMS44XG5cdFx0XHR9LFxuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLmRlaS05XCIsXG5cdFx0XHRcdFwidHJhbnNsYXRlWVwiOiBcIjMlXCIsXG5cdFx0XHRcdFwidHJhbnNsYXRlWFwiOiBcIi0xMiVcIixcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQxLFxuXHRcdFx0XHRcdDBcblx0XHRcdFx0XSxcblx0XHRcdFx0XCJzY2FsZVwiOiAxLjVcblx0XHRcdH0sXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIuZGVpLTEwXCIsXG5cdFx0XHRcdFwidHJhbnNsYXRlWVwiOiBcIjUlXCIsXG5cdFx0XHRcdFwidHJhbnNsYXRlWFwiOiBcIi00JVwiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDEsXG5cdFx0XHRcdFx0MFxuXHRcdFx0XHRdXG5cdFx0XHR9LFxuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLmRlaS0xMVwiLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVlcIjogXCI4JVwiLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVhcIjogXCI2JVwiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDEsXG5cdFx0XHRcdFx0MFxuXHRcdFx0XHRdLFxuXHRcdFx0XHRcInNjYWxlXCI6IDEuNFxuXHRcdFx0fSxcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5kZWktMTJcIixcblx0XHRcdFx0XCJ0cmFuc2xhdGVZXCI6IFwiMSVcIixcblx0XHRcdFx0XCJ0cmFuc2xhdGVYXCI6IFwiMjAlXCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MSxcblx0XHRcdFx0XHQwXG5cdFx0XHRcdF0sXG5cdFx0XHRcdFwic2NhbGVcIjogMS45XG5cdFx0XHR9LFxuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLmRlaS0xM1wiLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVlcIjogXCI4JVwiLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVhcIjogXCItMTIlXCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MSxcblx0XHRcdFx0XHQwXG5cdFx0XHRcdF0sXG5cdFx0XHRcdFwic2NhbGVcIjogMS44XG5cdFx0XHR9LFxuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLmRlaS0xNFwiLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVlcIjogXCI0JVwiLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVhcIjogXCItMyVcIixcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQxLFxuXHRcdFx0XHRcdDBcblx0XHRcdFx0XSxcblx0XHRcdFx0XCJzY2FsZVwiOiAxLjNcblx0XHRcdH0sXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIuZGVpLTE1XCIsXG5cdFx0XHRcdFwidHJhbnNsYXRlWVwiOiBcIjE0JVwiLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVhcIjogXCI1JVwiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDEsXG5cdFx0XHRcdFx0MFxuXHRcdFx0XHRdLFxuXHRcdFx0XHRcInNjYWxlXCI6IDEuN1xuXHRcdFx0fSxcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5kZWktMTZcIixcblx0XHRcdFx0XCJ0cmFuc2xhdGVZXCI6IFwiNiVcIixcblx0XHRcdFx0XCJ0cmFuc2xhdGVYXCI6IFwiOSVcIixcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQxLFxuXHRcdFx0XHRcdDBcblx0XHRcdFx0XSxcblx0XHRcdFx0XCJzY2FsZVwiOiAyXG5cdFx0XHR9XG5cdFx0XVxuXHR9LFxuXHR7XG5cdFx0XCJ3cmFwcGVyXCI6IFwiI2V4cGxvc2lvblwiLFxuXHRcdFwiZHVyYXRpb25cIjogXCIxMDAlXCIsXG5cdFx0XCJhbmltYXRpb25zXCI6IFtcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5leHBsb3Npb24tYnlsaW5lXCIsXG5cdFx0XHRcdFwidHJhbnNsYXRlWVwiOiBbXG5cdFx0XHRcdFx0XCItMjUlXCIsXG5cdFx0XHRcdFx0XCItNDAlXCJcblx0XHRcdFx0XSxcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQxLFxuXHRcdFx0XHRcdDBcblx0XHRcdFx0XVxuXHRcdFx0fVxuXHRcdF1cblx0fVxuXTtcblxuXG4vKioqKioqKioqKioqKioqKipcbiAqKiBXRUJQQUNLIEZPT1RFUlxuICoqIC4vfi9qc29uLWxvYWRlciEuL3NjZW5lcy9leHBsb3Npb24vc2NlbmUuanNvblxuICoqIG1vZHVsZSBpZCA9IDU1XG4gKiogbW9kdWxlIGNodW5rcyA9IDBcbiAqKi8iLCJtb2R1bGUuZXhwb3J0cyA9IFtcblx0e1xuXHRcdFwid3JhcHBlclwiOiBcIiNmZWVsaW5nY29uZnVzZWRcIixcblx0XHRcImR1cmF0aW9uXCI6IFwiMTAwJVwiLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIudXMtYWdhaW5zdC10aGVtXCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MCxcblx0XHRcdFx0XHQxXG5cdFx0XHRcdF1cblx0XHRcdH1cblx0XHRdXG5cdH0sXG5cdHtcblx0XHRcIndyYXBwZXJcIjogXCIjZmVlbGluZ2NvbmZ1c2VkXCIsXG5cdFx0XCJkdXJhdGlvblwiOiBcIjEwMCVcIixcblx0XHRcImZvY3VzXCI6IHRydWUsXG5cdFx0XCJhbmltYXRpb25zXCI6IFtcblx0XHRcdHt9XG5cdFx0XVxuXHR9LFxuXHR7XG5cdFx0XCJ3cmFwcGVyXCI6IFwiI2ZlZWxpbmdjb25mdXNlZFwiLFxuXHRcdFwiZHVyYXRpb25cIjogXCIxMDAlXCIsXG5cdFx0XCJhbmltYXRpb25zXCI6IFtcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi51cy1hZ2FpbnN0LXRoZW1cIixcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQyLFxuXHRcdFx0XHRcdDBcblx0XHRcdFx0XVxuXHRcdFx0fVxuXHRcdF1cblx0fVxuXTtcblxuXG4vKioqKioqKioqKioqKioqKipcbiAqKiBXRUJQQUNLIEZPT1RFUlxuICoqIC4vfi9qc29uLWxvYWRlciEuL3NjZW5lcy9mZWVsaW5nY29uZnVzZWQvc2NlbmUuanNvblxuICoqIG1vZHVsZSBpZCA9IDU2XG4gKiogbW9kdWxlIGNodW5rcyA9IDBcbiAqKi8iLCJtb2R1bGUuZXhwb3J0cyA9IFtcblx0e1xuXHRcdFwid3JhcHBlclwiOiBcIiNpbnRyb1wiLFxuXHRcdFwiZHVyYXRpb25cIjogXCIxMDAlXCIsXG5cdFx0XCJmb2N1c1wiOiB0cnVlLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIuZGlzcGxheS0xXCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MSxcblx0XHRcdFx0XHQwXG5cdFx0XHRcdF1cblx0XHRcdH1cblx0XHRdXG5cdH1cbl07XG5cblxuLyoqKioqKioqKioqKioqKioqXG4gKiogV0VCUEFDSyBGT09URVJcbiAqKiAuL34vanNvbi1sb2FkZXIhLi9zY2VuZXMvaW50cm8vc2NlbmUuanNvblxuICoqIG1vZHVsZSBpZCA9IDU3XG4gKiogbW9kdWxlIGNodW5rcyA9IDBcbiAqKi8iLCJtb2R1bGUuZXhwb3J0cyA9IFtcblx0e1xuXHRcdFwid3JhcHBlclwiOiBcIiNpc2lzYWZ0ZXJsaWZlZmFsbGFjeVwiLFxuXHRcdFwiZHVyYXRpb25cIjogXCIxMDAlXCIsXG5cdFx0XCJhbmltYXRpb25zXCI6IFtcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5wcmVtaXNlXCIsXG5cdFx0XHRcdFwidHJhbnNsYXRlWVwiOiBcIjBcIixcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQwLFxuXHRcdFx0XHRcdDEuNzVcblx0XHRcdFx0XVxuXHRcdFx0fSxcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5jb25jbHVzaW9uXCIsXG5cdFx0XHRcdFwidHJhbnNsYXRlWFwiOiBcIi0yNSVcIixcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQwLFxuXHRcdFx0XHRcdDBcblx0XHRcdFx0XVxuXHRcdFx0fSxcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5jYWxjdWxhdG9yXCIsXG5cdFx0XHRcdFwidHJhbnNsYXRlWFwiOiBcIjY1JVwiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDAsXG5cdFx0XHRcdFx0MFxuXHRcdFx0XHRdXG5cdFx0XHR9LFxuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLnF1cmFuLXJlYWRcIixcblx0XHRcdFx0XCJ0cmFuc2xhdGVZXCI6IFwiMCVcIixcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQwLFxuXHRcdFx0XHRcdDBcblx0XHRcdFx0XVxuXHRcdFx0fVxuXHRcdF1cblx0fSxcblx0e1xuXHRcdFwid3JhcHBlclwiOiBcIiNpc2lzYWZ0ZXJsaWZlZmFsbGFjeVwiLFxuXHRcdFwiZHVyYXRpb25cIjogXCIxMDAlXCIsXG5cdFx0XCJmb2N1c1wiOiB0cnVlLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXG5cdFx0XHR7fVxuXHRcdF1cblx0fSxcblx0e1xuXHRcdFwid3JhcHBlclwiOiBcIiNpc2lzYWZ0ZXJsaWZlZmFsbGFjeVwiLFxuXHRcdFwiZHVyYXRpb25cIjogXCIxNTAlXCIsXG5cdFx0XCJhbmltYXRpb25zXCI6IFtcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5jb25jbHVzaW9uXCIsXG5cdFx0XHRcdFwidHJhbnNsYXRlWFwiOiBbXG5cdFx0XHRcdFx0XCItMjUlXCIsXG5cdFx0XHRcdFx0XCIwXCJcblx0XHRcdFx0XSxcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQwLFxuXHRcdFx0XHRcdDFcblx0XHRcdFx0XVxuXHRcdFx0fSxcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5jYWxjdWxhdG9yXCIsXG5cdFx0XHRcdFwidHJhbnNsYXRlWFwiOiBbXG5cdFx0XHRcdFx0XCI2NSVcIixcblx0XHRcdFx0XHRcIjBcIlxuXHRcdFx0XHRdLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDAsXG5cdFx0XHRcdFx0MVxuXHRcdFx0XHRdXG5cdFx0XHR9LFxuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLnF1cmFuLXJlYWRcIixcblx0XHRcdFx0XCJ0cmFuc2xhdGVZXCI6IFtcblx0XHRcdFx0XHRcIjBcIixcblx0XHRcdFx0XHRcIjBcIlxuXHRcdFx0XHRdLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDFcblx0XHRcdFx0XVxuXHRcdFx0fSxcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5xdXJhbi1oaWRkZW5cIixcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQwLFxuXHRcdFx0XHRcdDFcblx0XHRcdFx0XVxuXHRcdFx0fVxuXHRcdF1cblx0fSxcblx0e1xuXHRcdFwid3JhcHBlclwiOiBcIiNpc2lzYWZ0ZXJsaWZlZmFsbGFjeVwiLFxuXHRcdFwiZHVyYXRpb25cIjogXCIxMDAlXCIsXG5cdFx0XCJmb2N1c1wiOiB0cnVlLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXG5cdFx0XHR7fVxuXHRcdF1cblx0fSxcblx0e1xuXHRcdFwid3JhcHBlclwiOiBcIiNpc2lzYWZ0ZXJsaWZlZmFsbGFjeVwiLFxuXHRcdFwiZHVyYXRpb25cIjogXCIxNTAlXCIsXG5cdFx0XCJhbmltYXRpb25zXCI6IFtcblx0XHRcdHt9XG5cdFx0XVxuXHR9LFxuXHR7XG5cdFx0XCJ3cmFwcGVyXCI6IFwiI2lzaXNhZnRlcmxpZmVmYWxsYWN5XCIsXG5cdFx0XCJkdXJhdGlvblwiOiBcIjI1MCVcIixcblx0XHRcImFuaW1hdGlvbnNcIjogW1xuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLmNvbmNsdXNpb25cIixcblx0XHRcdFx0XCJ0cmFuc2xhdGVZXCI6IFtcblx0XHRcdFx0XHRcIjBcIixcblx0XHRcdFx0XHRcIi0yNSVcIlxuXHRcdFx0XHRdLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDEsXG5cdFx0XHRcdFx0MFxuXHRcdFx0XHRdXG5cdFx0XHR9LFxuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLmNhbGN1bGF0b3JcIixcblx0XHRcdFx0XCJ0cmFuc2xhdGVZXCI6IFtcblx0XHRcdFx0XHRcIjBcIixcblx0XHRcdFx0XHRcIi0yNSVcIlxuXHRcdFx0XHRdLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDEsXG5cdFx0XHRcdFx0MFxuXHRcdFx0XHRdXG5cdFx0XHR9LFxuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLnF1cmFuLXJlYWRcIixcblx0XHRcdFx0XCJ0cmFuc2xhdGVZXCI6IFtcblx0XHRcdFx0XHRcIjAlXCIsXG5cdFx0XHRcdFx0XCItMjUlXCJcblx0XHRcdFx0XSxcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQxLFxuXHRcdFx0XHRcdDBcblx0XHRcdFx0XVxuXHRcdFx0fSxcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5wcmVtaXNlXCIsXG5cdFx0XHRcdFwidHJhbnNsYXRlWVwiOiBbXG5cdFx0XHRcdFx0XCIwJVwiLFxuXHRcdFx0XHRcdFwiLTI1JVwiXG5cdFx0XHRcdF0sXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MSxcblx0XHRcdFx0XHQwXG5cdFx0XHRcdF1cblx0XHRcdH1cblx0XHRdXG5cdH1cbl07XG5cblxuLyoqKioqKioqKioqKioqKioqXG4gKiogV0VCUEFDSyBGT09URVJcbiAqKiAuL34vanNvbi1sb2FkZXIhLi9zY2VuZXMvaXNpc2FmdGVybGlmZWZhbGxhY3kvc2NlbmUuanNvblxuICoqIG1vZHVsZSBpZCA9IDU4XG4gKiogbW9kdWxlIGNodW5rcyA9IDBcbiAqKi8iLCJtb2R1bGUuZXhwb3J0cyA9IFtcblx0e1xuXHRcdFwid3JhcHBlclwiOiBcIiNpc2lzYXBvY2FseXBzZW1pc3F1b3RlXCIsXG5cdFx0XCJkdXJhdGlvblwiOiBcIjEwMCVcIixcblx0XHRcImFuaW1hdGlvbnNcIjogW1xuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLnByZW1pc2VcIixcblx0XHRcdFx0XCJ0cmFuc2xhdGVZXCI6IFwiMFwiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDAsXG5cdFx0XHRcdFx0MS43NVxuXHRcdFx0XHRdXG5cdFx0XHR9LFxuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLmNvbmNsdXNpb25cIixcblx0XHRcdFx0XCJ0cmFuc2xhdGVZXCI6IFwiMjUlXCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MCxcblx0XHRcdFx0XHQwXG5cdFx0XHRcdF1cblx0XHRcdH0sXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIucXVyYW4tcmVhZFwiLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVlcIjogXCIwJVwiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDAsXG5cdFx0XHRcdFx0MFxuXHRcdFx0XHRdXG5cdFx0XHR9XG5cdFx0XVxuXHR9LFxuXHR7XG5cdFx0XCJ3cmFwcGVyXCI6IFwiI2lzaXNhcG9jYWx5cHNlbWlzcXVvdGVcIixcblx0XHRcImR1cmF0aW9uXCI6IFwiMTAwJVwiLFxuXHRcdFwiZm9jdXNcIjogdHJ1ZSxcblx0XHRcImFuaW1hdGlvbnNcIjogW1xuXHRcdFx0e31cblx0XHRdXG5cdH0sXG5cdHtcblx0XHRcIndyYXBwZXJcIjogXCIjaXNpc2Fwb2NhbHlwc2VtaXNxdW90ZVwiLFxuXHRcdFwiZHVyYXRpb25cIjogXCIxNTAlXCIsXG5cdFx0XCJhbmltYXRpb25zXCI6IFtcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5jb25jbHVzaW9uXCIsXG5cdFx0XHRcdFwidHJhbnNsYXRlWVwiOiBbXG5cdFx0XHRcdFx0XCIyNSVcIixcblx0XHRcdFx0XHRcIjBcIlxuXHRcdFx0XHRdLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDAsXG5cdFx0XHRcdFx0MVxuXHRcdFx0XHRdXG5cdFx0XHR9LFxuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLnF1cmFuLXJlYWRcIixcblx0XHRcdFx0XCJ0cmFuc2xhdGVZXCI6IFtcblx0XHRcdFx0XHRcIjBcIixcblx0XHRcdFx0XHRcIjBcIlxuXHRcdFx0XHRdLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDFcblx0XHRcdFx0XVxuXHRcdFx0fSxcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5xdXJhbi1oaWRkZW5cIixcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQwLFxuXHRcdFx0XHRcdDFcblx0XHRcdFx0XVxuXHRcdFx0fVxuXHRcdF1cblx0fSxcblx0e1xuXHRcdFwid3JhcHBlclwiOiBcIiNpc2lzYXBvY2FseXBzZW1pc3F1b3RlXCIsXG5cdFx0XCJkdXJhdGlvblwiOiBcIjEwMCVcIixcblx0XHRcImZvY3VzXCI6IHRydWUsXG5cdFx0XCJhbmltYXRpb25zXCI6IFtcblx0XHRcdHt9XG5cdFx0XVxuXHR9LFxuXHR7XG5cdFx0XCJ3cmFwcGVyXCI6IFwiI2lzaXNhcG9jYWx5cHNlbWlzcXVvdGVcIixcblx0XHRcImR1cmF0aW9uXCI6IFwiMTUwJVwiLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXG5cdFx0XHR7fVxuXHRcdF1cblx0fSxcblx0e1xuXHRcdFwid3JhcHBlclwiOiBcIiNpc2lzYXBvY2FseXBzZW1pc3F1b3RlXCIsXG5cdFx0XCJkdXJhdGlvblwiOiBcIjI1MCVcIixcblx0XHRcImFuaW1hdGlvbnNcIjogW1xuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLmNvbmNsdXNpb25cIixcblx0XHRcdFx0XCJ0cmFuc2xhdGVZXCI6IFtcblx0XHRcdFx0XHRcIjBcIixcblx0XHRcdFx0XHRcIi0yNSVcIlxuXHRcdFx0XHRdLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDEsXG5cdFx0XHRcdFx0MFxuXHRcdFx0XHRdXG5cdFx0XHR9LFxuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLnF1cmFuLXJlYWRcIixcblx0XHRcdFx0XCJ0cmFuc2xhdGVZXCI6IFtcblx0XHRcdFx0XHRcIjAlXCIsXG5cdFx0XHRcdFx0XCItMjUlXCJcblx0XHRcdFx0XSxcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQxLFxuXHRcdFx0XHRcdDBcblx0XHRcdFx0XVxuXHRcdFx0fSxcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5wcmVtaXNlXCIsXG5cdFx0XHRcdFwidHJhbnNsYXRlWVwiOiBbXG5cdFx0XHRcdFx0XCIwJVwiLFxuXHRcdFx0XHRcdFwiLTI1JVwiXG5cdFx0XHRcdF0sXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MSxcblx0XHRcdFx0XHQwXG5cdFx0XHRcdF1cblx0XHRcdH1cblx0XHRdXG5cdH1cbl07XG5cblxuLyoqKioqKioqKioqKioqKioqXG4gKiogV0VCUEFDSyBGT09URVJcbiAqKiAuL34vanNvbi1sb2FkZXIhLi9zY2VuZXMvaXNpc2Fwb2NhbHlwc2VtaXNxdW90ZS9zY2VuZS5qc29uXG4gKiogbW9kdWxlIGlkID0gNTlcbiAqKiBtb2R1bGUgY2h1bmtzID0gMFxuICoqLyIsIm1vZHVsZS5leHBvcnRzID0gW1xuXHR7XG5cdFx0XCJ3cmFwcGVyXCI6IFwiI2lzaXNiYW5rcnVwdFwiLFxuXHRcdFwiZHVyYXRpb25cIjogXCIxMDAlXCIsXG5cdFx0XCJhbmltYXRpb25zXCI6IFtcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5kaXNwbGF5LTRcIixcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQwLFxuXHRcdFx0XHRcdDFcblx0XHRcdFx0XVxuXHRcdFx0fVxuXHRcdF1cblx0fSxcblx0e1xuXHRcdFwid3JhcHBlclwiOiBcIiNpc2lzYmFua3J1cHRcIixcblx0XHRcImR1cmF0aW9uXCI6IFwiMTAwJVwiLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIuY3VubmluZzFcIixcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQwLFxuXHRcdFx0XHRcdDFcblx0XHRcdFx0XSxcblx0XHRcdFx0XCJ0cmFuc2xhdGVZXCI6IFtcblx0XHRcdFx0XHRcIi00JVwiLFxuXHRcdFx0XHRcdFwiMCVcIlxuXHRcdFx0XHRdLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVhcIjogW1xuXHRcdFx0XHRcdFwiMyVcIixcblx0XHRcdFx0XHRcIjBcIlxuXHRcdFx0XHRdXG5cdFx0XHR9LFxuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLmNvbmNsdXNpb25cIixcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQwLFxuXHRcdFx0XHRcdDFcblx0XHRcdFx0XVxuXHRcdFx0fVxuXHRcdF1cblx0fSxcblx0e1xuXHRcdFwid3JhcHBlclwiOiBcIiNpc2lzYmFua3J1cHRcIixcblx0XHRcImR1cmF0aW9uXCI6IFwiMTAwJVwiLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIuY3VubmluZzJcIixcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQwLFxuXHRcdFx0XHRcdDFcblx0XHRcdFx0XSxcblx0XHRcdFx0XCJ0cmFuc2xhdGVZXCI6IFtcblx0XHRcdFx0XHRcIjAlXCIsXG5cdFx0XHRcdFx0XCIwJVwiXG5cdFx0XHRcdF0sXG5cdFx0XHRcdFwidHJhbnNsYXRlWFwiOiBbXG5cdFx0XHRcdFx0XCIzJVwiLFxuXHRcdFx0XHRcdFwiMFwiXG5cdFx0XHRcdF1cblx0XHRcdH1cblx0XHRdXG5cdH0sXG5cdHtcblx0XHRcIndyYXBwZXJcIjogXCIjaXNpc2JhbmtydXB0XCIsXG5cdFx0XCJkdXJhdGlvblwiOiBcIjEwMCVcIixcblx0XHRcImFuaW1hdGlvbnNcIjogW1xuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLmN1bm5pbmczXCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MCxcblx0XHRcdFx0XHQxXG5cdFx0XHRcdF0sXG5cdFx0XHRcdFwidHJhbnNsYXRlWVwiOiBbXG5cdFx0XHRcdFx0XCI0JVwiLFxuXHRcdFx0XHRcdFwiMCVcIlxuXHRcdFx0XHRdLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVhcIjogW1xuXHRcdFx0XHRcdFwiMyVcIixcblx0XHRcdFx0XHRcIjBcIlxuXHRcdFx0XHRdXG5cdFx0XHR9XG5cdFx0XVxuXHR9LFxuXHR7XG5cdFx0XCJ3cmFwcGVyXCI6IFwiI2lzaXNiYW5rcnVwdFwiLFxuXHRcdFwiZHVyYXRpb25cIjogXCIxMDAlXCIsXG5cdFx0XCJhbmltYXRpb25zXCI6IFtcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5jdW5uaW5nNFwiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDAsXG5cdFx0XHRcdFx0MVxuXHRcdFx0XHRdLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVlcIjogW1xuXHRcdFx0XHRcdFwiNCVcIixcblx0XHRcdFx0XHRcIjAlXCJcblx0XHRcdFx0XSxcblx0XHRcdFx0XCJ0cmFuc2xhdGVYXCI6IFtcblx0XHRcdFx0XHRcIjAlXCIsXG5cdFx0XHRcdFx0XCIwXCJcblx0XHRcdFx0XVxuXHRcdFx0fVxuXHRcdF1cblx0fSxcblx0e1xuXHRcdFwid3JhcHBlclwiOiBcIiNpc2lzYmFua3J1cHRcIixcblx0XHRcImR1cmF0aW9uXCI6IFwiMTAwJVwiLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIuY3VubmluZzVcIixcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQwLFxuXHRcdFx0XHRcdDFcblx0XHRcdFx0XSxcblx0XHRcdFx0XCJ0cmFuc2xhdGVZXCI6IFtcblx0XHRcdFx0XHRcIjQlXCIsXG5cdFx0XHRcdFx0XCIwJVwiXG5cdFx0XHRcdF0sXG5cdFx0XHRcdFwidHJhbnNsYXRlWFwiOiBbXG5cdFx0XHRcdFx0XCItMyVcIixcblx0XHRcdFx0XHRcIjBcIlxuXHRcdFx0XHRdXG5cdFx0XHR9XG5cdFx0XVxuXHR9LFxuXHR7XG5cdFx0XCJ3cmFwcGVyXCI6IFwiI2lzaXNiYW5rcnVwdFwiLFxuXHRcdFwiZHVyYXRpb25cIjogXCIxMDAlXCIsXG5cdFx0XCJmb2N1c1wiOiB0cnVlLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXVxuXHR9LFxuXHR7XG5cdFx0XCJ3cmFwcGVyXCI6IFwiI2lzaXNiYW5rcnVwdFwiLFxuXHRcdFwiZHVyYXRpb25cIjogXCIxMDAlXCIsXG5cdFx0XCJhbmltYXRpb25zXCI6IFtcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5jdW5uaW5nNlwiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDAsXG5cdFx0XHRcdFx0MVxuXHRcdFx0XHRdLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVlcIjogW1xuXHRcdFx0XHRcdFwiMCVcIixcblx0XHRcdFx0XHRcIjQwJVwiXG5cdFx0XHRcdF0sXG5cdFx0XHRcdFwidHJhbnNsYXRlWFwiOiBbXG5cdFx0XHRcdFx0XCIwJVwiLFxuXHRcdFx0XHRcdFwiMCVcIlxuXHRcdFx0XHRdXG5cdFx0XHR9LFxuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLmN1bm5pbmc2XCIsXG5cdFx0XHRcdFwidHJhbnNsYXRlWVwiOiBbXG5cdFx0XHRcdFx0XCIxMCVcIixcblx0XHRcdFx0XHRcIjAlXCJcblx0XHRcdFx0XSxcblx0XHRcdFx0XCJ0cmFuc2xhdGVYXCI6IFtcblx0XHRcdFx0XHRcIjAlXCIsXG5cdFx0XHRcdFx0XCIwJVwiXG5cdFx0XHRcdF0sXG5cdFx0XHRcdFwic2NhbGVcIjogW1xuXHRcdFx0XHRcdDEsXG5cdFx0XHRcdFx0MS41XG5cdFx0XHRcdF1cblx0XHRcdH0sXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIuY3VubmluZzFcIixcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQxLFxuXHRcdFx0XHRcdDBcblx0XHRcdFx0XVxuXHRcdFx0fSxcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5jdW5uaW5nMlwiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDEsXG5cdFx0XHRcdFx0MFxuXHRcdFx0XHRdXG5cdFx0XHR9LFxuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLmN1bm5pbmczXCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MSxcblx0XHRcdFx0XHQwXG5cdFx0XHRcdF1cblx0XHRcdH0sXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIuY3VubmluZzRcIixcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQxLFxuXHRcdFx0XHRcdDBcblx0XHRcdFx0XVxuXHRcdFx0fSxcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5jdW5uaW5nNVwiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDEsXG5cdFx0XHRcdFx0MFxuXHRcdFx0XHRdXG5cdFx0XHR9XG5cdFx0XVxuXHR9LFxuXHR7XG5cdFx0XCJ3cmFwcGVyXCI6IFwiI2lzaXNiYW5rcnVwdFwiLFxuXHRcdFwiZHVyYXRpb25cIjogXCIxMDAlXCIsXG5cdFx0XCJmb2N1c1wiOiB0cnVlLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXG5cdFx0XHR7fVxuXHRcdF1cblx0fSxcblx0e1xuXHRcdFwid3JhcHBlclwiOiBcIiNpc2lzYmFua3J1cHRcIixcblx0XHRcImR1cmF0aW9uXCI6IFwiMTAwJVwiLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIuY3VubmluZzZcIixcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQxLFxuXHRcdFx0XHRcdDBcblx0XHRcdFx0XSxcblx0XHRcdFx0XCJzY2FsZVwiOiBbXG5cdFx0XHRcdFx0MS41XG5cdFx0XHRcdF1cblx0XHRcdH0sXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIubmV3c3NvdXJjZS1ob3JcIixcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQxLFxuXHRcdFx0XHRcdDBcblx0XHRcdFx0XVxuXHRcdFx0fVxuXHRcdF1cblx0fSxcblx0e1xuXHRcdFwid3JhcHBlclwiOiBcIiNpc2lzYmFua3J1cHRcIixcblx0XHRcImR1cmF0aW9uXCI6IFwiMTAwJVwiLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIuYmxhY2stem9uZVwiLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVhcIjogW1xuXHRcdFx0XHRcdFwiMCVcIixcblx0XHRcdFx0XHRcIjkwJVwiXG5cdFx0XHRcdF1cblx0XHRcdH0sXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIuZGlzcGxheS00XCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MSxcblx0XHRcdFx0XHQwXG5cdFx0XHRcdF1cblx0XHRcdH1cblx0XHRdXG5cdH1cbl07XG5cblxuLyoqKioqKioqKioqKioqKioqXG4gKiogV0VCUEFDSyBGT09URVJcbiAqKiAuL34vanNvbi1sb2FkZXIhLi9zY2VuZXMvaXNpc2JhbmtydXB0L3NjZW5lLmpzb25cbiAqKiBtb2R1bGUgaWQgPSA2MFxuICoqIG1vZHVsZSBjaHVua3MgPSAwXG4gKiovIiwibW9kdWxlLmV4cG9ydHMgPSBbXG5cdHtcblx0XHRcIndyYXBwZXJcIjogXCIjaXNpc2ZpZ2h0bWlzcXVvdGVcIixcblx0XHRcImR1cmF0aW9uXCI6IFwiMTAwJVwiLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIucHJlbWlzZVwiLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVlcIjogXCIwXCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MCxcblx0XHRcdFx0XHQxLjc1XG5cdFx0XHRcdF1cblx0XHRcdH0sXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIuY29uY2x1c2lvblwiLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVlcIjogXCIyNSVcIixcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQwLFxuXHRcdFx0XHRcdDBcblx0XHRcdFx0XVxuXHRcdFx0fSxcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5xdXJhbi1yZWFkXCIsXG5cdFx0XHRcdFwidHJhbnNsYXRlWVwiOiBcIjAlXCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MCxcblx0XHRcdFx0XHQxXG5cdFx0XHRcdF1cblx0XHRcdH1cblx0XHRdXG5cdH0sXG5cdHtcblx0XHRcIndyYXBwZXJcIjogXCIjaXNpc2ZpZ2h0bWlzcXVvdGVcIixcblx0XHRcImR1cmF0aW9uXCI6IFwiMTAwJVwiLFxuXHRcdFwiZm9jdXNcIjogdHJ1ZSxcblx0XHRcImFuaW1hdGlvbnNcIjogW1xuXHRcdFx0e31cblx0XHRdXG5cdH0sXG5cdHtcblx0XHRcIndyYXBwZXJcIjogXCIjaXNpc2ZpZ2h0bWlzcXVvdGVcIixcblx0XHRcImR1cmF0aW9uXCI6IFwiMTUwJVwiLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIucHJlbWlzZVwiLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVlcIjogW1xuXHRcdFx0XHRcdFwiMFwiLFxuXHRcdFx0XHRcdFwiLTI1JVwiXG5cdFx0XHRcdF0sXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MSxcblx0XHRcdFx0XHQwXG5cdFx0XHRcdF1cblx0XHRcdH0sXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIuY29uY2x1c2lvblwiLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVlcIjogW1xuXHRcdFx0XHRcdFwiMjUlXCIsXG5cdFx0XHRcdFx0XCIwXCJcblx0XHRcdFx0XSxcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQwLFxuXHRcdFx0XHRcdDFcblx0XHRcdFx0XVxuXHRcdFx0fSxcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5xdXJhbi1yZWFkXCIsXG5cdFx0XHRcdFwidHJhbnNsYXRlWVwiOiBbXG5cdFx0XHRcdFx0XCIwXCIsXG5cdFx0XHRcdFx0XCIwXCJcblx0XHRcdFx0XSxcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQxXG5cdFx0XHRcdF1cblx0XHRcdH0sXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIucXVyYW4taGlkZGVuXCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MCxcblx0XHRcdFx0XHQxXG5cdFx0XHRcdF1cblx0XHRcdH1cblx0XHRdXG5cdH0sXG5cdHtcblx0XHRcIndyYXBwZXJcIjogXCIjaXNpc2ZpZ2h0bWlzcXVvdGVcIixcblx0XHRcImR1cmF0aW9uXCI6IFwiMTAwJVwiLFxuXHRcdFwiZm9jdXNcIjogdHJ1ZSxcblx0XHRcImFuaW1hdGlvbnNcIjogW1xuXHRcdFx0e31cblx0XHRdXG5cdH0sXG5cdHtcblx0XHRcIndyYXBwZXJcIjogXCIjaXNpc2ZpZ2h0bWlzcXVvdGVcIixcblx0XHRcImR1cmF0aW9uXCI6IFwiMTUwJVwiLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXG5cdFx0XHR7fVxuXHRcdF1cblx0fSxcblx0e1xuXHRcdFwid3JhcHBlclwiOiBcIiNpc2lzZmlnaHRtaXNxdW90ZVwiLFxuXHRcdFwiZHVyYXRpb25cIjogXCIyNTAlXCIsXG5cdFx0XCJhbmltYXRpb25zXCI6IFtcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5jb25jbHVzaW9uXCIsXG5cdFx0XHRcdFwidHJhbnNsYXRlWVwiOiBbXG5cdFx0XHRcdFx0XCIwXCIsXG5cdFx0XHRcdFx0XCItMjUlXCJcblx0XHRcdFx0XSxcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQxLFxuXHRcdFx0XHRcdDBcblx0XHRcdFx0XVxuXHRcdFx0fSxcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5xdXJhbi1yZWFkXCIsXG5cdFx0XHRcdFwidHJhbnNsYXRlWVwiOiBbXG5cdFx0XHRcdFx0XCIwJVwiLFxuXHRcdFx0XHRcdFwiLTI1JVwiXG5cdFx0XHRcdF0sXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MSxcblx0XHRcdFx0XHQwXG5cdFx0XHRcdF1cblx0XHRcdH1cblx0XHRdXG5cdH1cbl07XG5cblxuLyoqKioqKioqKioqKioqKioqXG4gKiogV0VCUEFDSyBGT09URVJcbiAqKiAuL34vanNvbi1sb2FkZXIhLi9zY2VuZXMvaXNpc2ZpZ2h0bWlzcXVvdGUvc2NlbmUuanNvblxuICoqIG1vZHVsZSBpZCA9IDYxXG4gKiogbW9kdWxlIGNodW5rcyA9IDBcbiAqKi8iLCJtb2R1bGUuZXhwb3J0cyA9IFtcblx0e1xuXHRcdFwid3JhcHBlclwiOiBcIiNpc2lzb2JqZWN0aXZlXCIsXG5cdFx0XCJkdXJhdGlvblwiOiBcIjEwMCVcIixcblx0XHRcImFuaW1hdGlvbnNcIjogW1xuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLmRpc3BsYXktNFwiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDEsXG5cdFx0XHRcdFx0MFxuXHRcdFx0XHRdXG5cdFx0XHR9XG5cdFx0XVxuXHR9XG5dO1xuXG5cbi8qKioqKioqKioqKioqKioqKlxuICoqIFdFQlBBQ0sgRk9PVEVSXG4gKiogLi9+L2pzb24tbG9hZGVyIS4vc2NlbmVzL2lzaXNvYmplY3RpdmUvc2NlbmUuanNvblxuICoqIG1vZHVsZSBpZCA9IDYyXG4gKiogbW9kdWxlIGNodW5rcyA9IDBcbiAqKi8iLCJtb2R1bGUuZXhwb3J0cyA9IFtcblx0e1xuXHRcdFwid3JhcHBlclwiOiBcIiNpc2lzd2FudHN0b2RpdmlkZVwiLFxuXHRcdFwiZHVyYXRpb25cIjogXCIxMDAlXCIsXG5cdFx0XCJhbmltYXRpb25zXCI6IFtcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi52aW9sZW50LXpvbmVzXCIsXG5cdFx0XHRcdFwic2NhbGVcIjogW1xuXHRcdFx0XHRcdDEsXG5cdFx0XHRcdFx0NS41NVxuXHRcdFx0XHRdXG5cdFx0XHR9LFxuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLmFuaW0tMlwiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDAsXG5cdFx0XHRcdFx0MS41NVxuXHRcdFx0XHRdXG5cdFx0XHR9XG5cdFx0XVxuXHR9LFxuXHR7XG5cdFx0XCJ3cmFwcGVyXCI6IFwiI2lzaXN3YW50c3RvZGl2aWRlXCIsXG5cdFx0XCJkdXJhdGlvblwiOiBcIjEwMCVcIixcblx0XHRcImZvY3VzXCI6IHRydWUsXG5cdFx0XCJhbmltYXRpb25zXCI6IFtcblx0XHRcdHt9XG5cdFx0XVxuXHR9LFxuXHR7XG5cdFx0XCJ3cmFwcGVyXCI6IFwiI2lzaXN3YW50c3RvZGl2aWRlXCIsXG5cdFx0XCJkdXJhdGlvblwiOiBcIjEwMCVcIixcblx0XHRcImFuaW1hdGlvbnNcIjogW1xuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLnZpb2xlbnQtem9uZXNcIixcblx0XHRcdFx0XCJzY2FsZVwiOiBbXG5cdFx0XHRcdFx0NS41NSxcblx0XHRcdFx0XHQwXG5cdFx0XHRcdF1cblx0XHRcdH0sXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIuYW5pbS0xXCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MCxcblx0XHRcdFx0XHQxLjU1XG5cdFx0XHRcdF1cblx0XHRcdH1cblx0XHRdXG5cdH0sXG5cdHtcblx0XHRcIndyYXBwZXJcIjogXCIjaXNpc3dhbnRzdG9kaXZpZGVcIixcblx0XHRcImR1cmF0aW9uXCI6IFwiMTAwJVwiLFxuXHRcdFwiZm9jdXNcIjogdHJ1ZSxcblx0XHRcImFuaW1hdGlvbnNcIjogW1xuXHRcdFx0e31cblx0XHRdXG5cdH0sXG5cdHtcblx0XHRcIndyYXBwZXJcIjogXCIjaXNpc3dhbnRzdG9kaXZpZGVcIixcblx0XHRcImR1cmF0aW9uXCI6IFwiMTAwJVwiLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIuYW5pbS0xXCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MSxcblx0XHRcdFx0XHQwXG5cdFx0XHRcdF0sXG5cdFx0XHRcdFwidHJhbnNsYXRlWVwiOiBbXG5cdFx0XHRcdFx0XCIwJVwiLFxuXHRcdFx0XHRcdFwiLTIwJVwiXG5cdFx0XHRcdF1cblx0XHRcdH0sXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIuYW5pbS0yXCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MSxcblx0XHRcdFx0XHQwXG5cdFx0XHRcdF0sXG5cdFx0XHRcdFwidHJhbnNsYXRlWVwiOiBbXG5cdFx0XHRcdFx0XCIwJVwiLFxuXHRcdFx0XHRcdFwiLTIwJVwiXG5cdFx0XHRcdF1cblx0XHRcdH1cblx0XHRdXG5cdH1cbl07XG5cblxuLyoqKioqKioqKioqKioqKioqXG4gKiogV0VCUEFDSyBGT09URVJcbiAqKiAuL34vanNvbi1sb2FkZXIhLi9zY2VuZXMvaXNpc3dhbnRzdG9kaXZpZGUvc2NlbmUuanNvblxuICoqIG1vZHVsZSBpZCA9IDYzXG4gKiogbW9kdWxlIGNodW5rcyA9IDBcbiAqKi8iLCJtb2R1bGUuZXhwb3J0cyA9IFtcblx0e1xuXHRcdFwid3JhcHBlclwiOiBcIiNpdGlzbnRlYXN5XCIsXG5cdFx0XCJkdXJhdGlvblwiOiBcIjEwMCVcIixcblx0XHRcImFuaW1hdGlvbnNcIjogW1xuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLmlzbnRlYXN5XzFcIixcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQwLFxuXHRcdFx0XHRcdDFcblx0XHRcdFx0XSxcblx0XHRcdFx0XCJ0cmFuc2xhdGVZXCI6IFtcblx0XHRcdFx0XHRcIi00JVwiLFxuXHRcdFx0XHRcdFwiMCVcIlxuXHRcdFx0XHRdLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVhcIjogW1xuXHRcdFx0XHRcdFwiMyVcIixcblx0XHRcdFx0XHRcIjBcIlxuXHRcdFx0XHRdXG5cdFx0XHR9LFxuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLmRpc3BsYXktNFwiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDAsXG5cdFx0XHRcdFx0MVxuXHRcdFx0XHRdXG5cdFx0XHR9XG5cdFx0XVxuXHR9LFxuXHR7XG5cdFx0XCJ3cmFwcGVyXCI6IFwiI2l0aXNudGVhc3lcIixcblx0XHRcImR1cmF0aW9uXCI6IFwiMTAwJVwiLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIuaXNudGVhc3lfMlwiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDAsXG5cdFx0XHRcdFx0MVxuXHRcdFx0XHRdLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVlcIjogW1xuXHRcdFx0XHRcdFwiMCVcIixcblx0XHRcdFx0XHRcIjAlXCJcblx0XHRcdFx0XSxcblx0XHRcdFx0XCJ0cmFuc2xhdGVYXCI6IFtcblx0XHRcdFx0XHRcIjMlXCIsXG5cdFx0XHRcdFx0XCIwXCJcblx0XHRcdFx0XVxuXHRcdFx0fVxuXHRcdF1cblx0fSxcblx0e1xuXHRcdFwid3JhcHBlclwiOiBcIiNpdGlzbnRlYXN5XCIsXG5cdFx0XCJkdXJhdGlvblwiOiBcIjEwMCVcIixcblx0XHRcImFuaW1hdGlvbnNcIjogW1xuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLmlzbnRlYXN5XzNcIixcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQwLFxuXHRcdFx0XHRcdDFcblx0XHRcdFx0XSxcblx0XHRcdFx0XCJ0cmFuc2xhdGVZXCI6IFtcblx0XHRcdFx0XHRcIjAlXCIsXG5cdFx0XHRcdFx0XCIwJVwiXG5cdFx0XHRcdF0sXG5cdFx0XHRcdFwidHJhbnNsYXRlWFwiOiBbXG5cdFx0XHRcdFx0XCIzJVwiLFxuXHRcdFx0XHRcdFwiMFwiXG5cdFx0XHRcdF1cblx0XHRcdH1cblx0XHRdXG5cdH0sXG5cdHtcblx0XHRcIndyYXBwZXJcIjogXCIjaXRpc250ZWFzeVwiLFxuXHRcdFwiZHVyYXRpb25cIjogXCIxMDAlXCIsXG5cdFx0XCJhbmltYXRpb25zXCI6IFtcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5pc250ZWFzeV80XCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MCxcblx0XHRcdFx0XHQxXG5cdFx0XHRcdF0sXG5cdFx0XHRcdFwidHJhbnNsYXRlWVwiOiBbXG5cdFx0XHRcdFx0XCI0JVwiLFxuXHRcdFx0XHRcdFwiMCVcIlxuXHRcdFx0XHRdLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVhcIjogW1xuXHRcdFx0XHRcdFwiMyVcIixcblx0XHRcdFx0XHRcIjBcIlxuXHRcdFx0XHRdXG5cdFx0XHR9XG5cdFx0XVxuXHR9LFxuXHR7XG5cdFx0XCJ3cmFwcGVyXCI6IFwiI2l0aXNudGVhc3lcIixcblx0XHRcImR1cmF0aW9uXCI6IFwiMTAwJVwiLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIuaXNudGVhc3lfNVwiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDAsXG5cdFx0XHRcdFx0MVxuXHRcdFx0XHRdLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVlcIjogW1xuXHRcdFx0XHRcdFwiNCVcIixcblx0XHRcdFx0XHRcIjAlXCJcblx0XHRcdFx0XSxcblx0XHRcdFx0XCJ0cmFuc2xhdGVYXCI6IFtcblx0XHRcdFx0XHRcIjAlXCIsXG5cdFx0XHRcdFx0XCIwXCJcblx0XHRcdFx0XVxuXHRcdFx0fVxuXHRcdF1cblx0fSxcblx0e1xuXHRcdFwid3JhcHBlclwiOiBcIiNpdGlzbnRlYXN5XCIsXG5cdFx0XCJkdXJhdGlvblwiOiBcIjEwMCVcIixcblx0XHRcImFuaW1hdGlvbnNcIjogW1xuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLmlzbnRlYXN5XzZcIixcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQwLFxuXHRcdFx0XHRcdDFcblx0XHRcdFx0XSxcblx0XHRcdFx0XCJ0cmFuc2xhdGVZXCI6IFtcblx0XHRcdFx0XHRcIjQlXCIsXG5cdFx0XHRcdFx0XCIwJVwiXG5cdFx0XHRcdF0sXG5cdFx0XHRcdFwidHJhbnNsYXRlWFwiOiBbXG5cdFx0XHRcdFx0XCIwJVwiLFxuXHRcdFx0XHRcdFwiMFwiXG5cdFx0XHRcdF1cblx0XHRcdH1cblx0XHRdXG5cdH0sXG5cdHtcblx0XHRcIndyYXBwZXJcIjogXCIjaXRpc250ZWFzeVwiLFxuXHRcdFwiZHVyYXRpb25cIjogXCIxMDAlXCIsXG5cdFx0XCJhbmltYXRpb25zXCI6IFtcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5pc250ZWFzeV83XCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MCxcblx0XHRcdFx0XHQxXG5cdFx0XHRcdF0sXG5cdFx0XHRcdFwidHJhbnNsYXRlWVwiOiBbXG5cdFx0XHRcdFx0XCI0JVwiLFxuXHRcdFx0XHRcdFwiMCVcIlxuXHRcdFx0XHRdLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVhcIjogW1xuXHRcdFx0XHRcdFwiMCVcIixcblx0XHRcdFx0XHRcIjBcIlxuXHRcdFx0XHRdXG5cdFx0XHR9XG5cdFx0XVxuXHR9LFxuXHR7XG5cdFx0XCJ3cmFwcGVyXCI6IFwiI2l0aXNudGVhc3lcIixcblx0XHRcImR1cmF0aW9uXCI6IFwiMTAwJVwiLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIuaXNudGVhc3lfOFwiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDAsXG5cdFx0XHRcdFx0MVxuXHRcdFx0XHRdLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVlcIjogW1xuXHRcdFx0XHRcdFwiNCVcIixcblx0XHRcdFx0XHRcIjAlXCJcblx0XHRcdFx0XSxcblx0XHRcdFx0XCJ0cmFuc2xhdGVYXCI6IFtcblx0XHRcdFx0XHRcIi0zJVwiLFxuXHRcdFx0XHRcdFwiMFwiXG5cdFx0XHRcdF1cblx0XHRcdH1cblx0XHRdXG5cdH0sXG5cdHtcblx0XHRcIndyYXBwZXJcIjogXCIjaXRpc250ZWFzeVwiLFxuXHRcdFwiZHVyYXRpb25cIjogXCIxMDAlXCIsXG5cdFx0XCJhbmltYXRpb25zXCI6IFtcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5pc250ZWFzeV85XCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MCxcblx0XHRcdFx0XHQxXG5cdFx0XHRcdF0sXG5cdFx0XHRcdFwidHJhbnNsYXRlWVwiOiBbXG5cdFx0XHRcdFx0XCItNCVcIixcblx0XHRcdFx0XHRcIjAlXCJcblx0XHRcdFx0XSxcblx0XHRcdFx0XCJ0cmFuc2xhdGVYXCI6IFtcblx0XHRcdFx0XHRcIi0zJVwiLFxuXHRcdFx0XHRcdFwiMFwiXG5cdFx0XHRcdF1cblx0XHRcdH1cblx0XHRdXG5cdH0sXG5cdHtcblx0XHRcIndyYXBwZXJcIjogXCIjaXRpc250ZWFzeVwiLFxuXHRcdFwiZHVyYXRpb25cIjogXCIxMDAlXCIsXG5cdFx0XCJhbmltYXRpb25zXCI6IFtcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5pc250ZWFzeV8xMFwiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDAsXG5cdFx0XHRcdFx0MVxuXHRcdFx0XHRdLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVlcIjogW1xuXHRcdFx0XHRcdFwiLTQlXCIsXG5cdFx0XHRcdFx0XCIwJVwiXG5cdFx0XHRcdF0sXG5cdFx0XHRcdFwidHJhbnNsYXRlWFwiOiBbXG5cdFx0XHRcdFx0XCIwJVwiLFxuXHRcdFx0XHRcdFwiMFwiXG5cdFx0XHRcdF1cblx0XHRcdH1cblx0XHRdXG5cdH0sXG5cdHtcblx0XHRcIndyYXBwZXJcIjogXCIjaXRpc250ZWFzeVwiLFxuXHRcdFwiZHVyYXRpb25cIjogXCIxMDAlXCIsXG5cdFx0XCJhbmltYXRpb25zXCI6IFtcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5pc250ZWFzeV8xMVwiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDAsXG5cdFx0XHRcdFx0MVxuXHRcdFx0XHRdLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVlcIjogW1xuXHRcdFx0XHRcdFwiLTQlXCIsXG5cdFx0XHRcdFx0XCIwJVwiXG5cdFx0XHRcdF0sXG5cdFx0XHRcdFwidHJhbnNsYXRlWFwiOiBbXG5cdFx0XHRcdFx0XCIwJVwiLFxuXHRcdFx0XHRcdFwiMFwiXG5cdFx0XHRcdF1cblx0XHRcdH1cblx0XHRdXG5cdH0sXG5cdHtcblx0XHRcIndyYXBwZXJcIjogXCIjaXRpc250ZWFzeVwiLFxuXHRcdFwiZHVyYXRpb25cIjogXCIxMDAlXCIsXG5cdFx0XCJhbmltYXRpb25zXCI6IFtcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5pc250ZWFzeV8xMlwiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDAsXG5cdFx0XHRcdFx0MVxuXHRcdFx0XHRdLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVlcIjogW1xuXHRcdFx0XHRcdFwiLTQlXCIsXG5cdFx0XHRcdFx0XCIwJVwiXG5cdFx0XHRcdF0sXG5cdFx0XHRcdFwidHJhbnNsYXRlWFwiOiBbXG5cdFx0XHRcdFx0XCIwJVwiLFxuXHRcdFx0XHRcdFwiMFwiXG5cdFx0XHRcdF1cblx0XHRcdH1cblx0XHRdXG5cdH0sXG5cdHtcblx0XHRcIndyYXBwZXJcIjogXCIjaXRpc250ZWFzeVwiLFxuXHRcdFwiZHVyYXRpb25cIjogXCIxMDAlXCIsXG5cdFx0XCJmb2N1c1wiOiB0cnVlLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXVxuXHR9LFxuXHR7XG5cdFx0XCJ3cmFwcGVyXCI6IFwiI2l0aXNudGVhc3lcIixcblx0XHRcImR1cmF0aW9uXCI6IFwiMTAwJVwiLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIuaXNudGVhc3lfMTNcIixcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQwLFxuXHRcdFx0XHRcdDFcblx0XHRcdFx0XSxcblx0XHRcdFx0XCJ0cmFuc2xhdGVZXCI6IFtcblx0XHRcdFx0XHRcIjAlXCIsXG5cdFx0XHRcdFx0XCIwJVwiXG5cdFx0XHRcdF0sXG5cdFx0XHRcdFwidHJhbnNsYXRlWFwiOiBbXG5cdFx0XHRcdFx0XCItODAlXCIsXG5cdFx0XHRcdFx0XCIwXCJcblx0XHRcdFx0XVxuXHRcdFx0fSxcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5pc250ZWFzeV8xXCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MSxcblx0XHRcdFx0XHQwXG5cdFx0XHRcdF0sXG5cdFx0XHRcdFwidHJhbnNsYXRlWVwiOiBbXG5cdFx0XHRcdFx0XCIwJVwiLFxuXHRcdFx0XHRcdFwiLTQwJVwiXG5cdFx0XHRcdF0sXG5cdFx0XHRcdFwidHJhbnNsYXRlWFwiOiBbXG5cdFx0XHRcdFx0XCIwJVwiLFxuXHRcdFx0XHRcdFwiMzAlXCJcblx0XHRcdFx0XVxuXHRcdFx0fSxcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5pc250ZWFzeV8yXCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MSxcblx0XHRcdFx0XHQwXG5cdFx0XHRcdF0sXG5cdFx0XHRcdFwidHJhbnNsYXRlWVwiOiBbXG5cdFx0XHRcdFx0XCIwJVwiLFxuXHRcdFx0XHRcdFwiMCVcIlxuXHRcdFx0XHRdLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVhcIjogW1xuXHRcdFx0XHRcdFwiMCVcIixcblx0XHRcdFx0XHRcIjMwJVwiXG5cdFx0XHRcdF1cblx0XHRcdH0sXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIuaXNudGVhc3lfM1wiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDEsXG5cdFx0XHRcdFx0MFxuXHRcdFx0XHRdLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVlcIjogW1xuXHRcdFx0XHRcdFwiMCVcIixcblx0XHRcdFx0XHRcIjAlXCJcblx0XHRcdFx0XSxcblx0XHRcdFx0XCJ0cmFuc2xhdGVYXCI6IFtcblx0XHRcdFx0XHRcIjAlXCIsXG5cdFx0XHRcdFx0XCIzMCVcIlxuXHRcdFx0XHRdXG5cdFx0XHR9LFxuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLmlzbnRlYXN5XzRcIixcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQxLFxuXHRcdFx0XHRcdDBcblx0XHRcdFx0XSxcblx0XHRcdFx0XCJ0cmFuc2xhdGVZXCI6IFtcblx0XHRcdFx0XHRcIjAlXCIsXG5cdFx0XHRcdFx0XCI0MCVcIlxuXHRcdFx0XHRdLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVhcIjogW1xuXHRcdFx0XHRcdFwiMCVcIixcblx0XHRcdFx0XHRcIjMwJVwiXG5cdFx0XHRcdF1cblx0XHRcdH0sXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIuaXNudGVhc3lfNVwiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDEsXG5cdFx0XHRcdFx0MFxuXHRcdFx0XHRdLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVlcIjogW1xuXHRcdFx0XHRcdFwiMCVcIixcblx0XHRcdFx0XHRcIjQwJVwiXG5cdFx0XHRcdF0sXG5cdFx0XHRcdFwidHJhbnNsYXRlWFwiOiBbXG5cdFx0XHRcdFx0XCIwJVwiLFxuXHRcdFx0XHRcdFwiMCVcIlxuXHRcdFx0XHRdXG5cdFx0XHR9LFxuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLmlzbnRlYXN5XzZcIixcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQxLFxuXHRcdFx0XHRcdDBcblx0XHRcdFx0XSxcblx0XHRcdFx0XCJ0cmFuc2xhdGVZXCI6IFtcblx0XHRcdFx0XHRcIjAlXCIsXG5cdFx0XHRcdFx0XCI0MCVcIlxuXHRcdFx0XHRdLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVhcIjogW1xuXHRcdFx0XHRcdFwiMCVcIixcblx0XHRcdFx0XHRcIjAlXCJcblx0XHRcdFx0XVxuXHRcdFx0fSxcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5pc250ZWFzeV83XCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MSxcblx0XHRcdFx0XHQwXG5cdFx0XHRcdF0sXG5cdFx0XHRcdFwidHJhbnNsYXRlWVwiOiBbXG5cdFx0XHRcdFx0XCIwJVwiLFxuXHRcdFx0XHRcdFwiNDAlXCJcblx0XHRcdFx0XSxcblx0XHRcdFx0XCJ0cmFuc2xhdGVYXCI6IFtcblx0XHRcdFx0XHRcIjAlXCIsXG5cdFx0XHRcdFx0XCIwJVwiXG5cdFx0XHRcdF1cblx0XHRcdH0sXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIuaXNudGVhc3lfOFwiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDEsXG5cdFx0XHRcdFx0MFxuXHRcdFx0XHRdLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVlcIjogW1xuXHRcdFx0XHRcdFwiMCVcIixcblx0XHRcdFx0XHRcIjQwJVwiXG5cdFx0XHRcdF0sXG5cdFx0XHRcdFwidHJhbnNsYXRlWFwiOiBbXG5cdFx0XHRcdFx0XCIwJVwiLFxuXHRcdFx0XHRcdFwiLTMwJVwiXG5cdFx0XHRcdF1cblx0XHRcdH0sXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIuaXNudGVhc3lfOVwiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDEsXG5cdFx0XHRcdFx0MFxuXHRcdFx0XHRdLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVlcIjogW1xuXHRcdFx0XHRcdFwiMCVcIixcblx0XHRcdFx0XHRcIi00MCVcIlxuXHRcdFx0XHRdLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVhcIjogW1xuXHRcdFx0XHRcdFwiMCVcIixcblx0XHRcdFx0XHRcIi0zMCVcIlxuXHRcdFx0XHRdXG5cdFx0XHR9LFxuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLmlzbnRlYXN5XzEwXCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MSxcblx0XHRcdFx0XHQwXG5cdFx0XHRcdF0sXG5cdFx0XHRcdFwidHJhbnNsYXRlWVwiOiBbXG5cdFx0XHRcdFx0XCIwJVwiLFxuXHRcdFx0XHRcdFwiLTQwJVwiXG5cdFx0XHRcdF0sXG5cdFx0XHRcdFwidHJhbnNsYXRlWFwiOiBbXG5cdFx0XHRcdFx0XCIwJVwiLFxuXHRcdFx0XHRcdFwiMCVcIlxuXHRcdFx0XHRdXG5cdFx0XHR9LFxuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLmlzbnRlYXN5XzExXCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MSxcblx0XHRcdFx0XHQwXG5cdFx0XHRcdF0sXG5cdFx0XHRcdFwidHJhbnNsYXRlWVwiOiBbXG5cdFx0XHRcdFx0XCIwJVwiLFxuXHRcdFx0XHRcdFwiLTQwJVwiXG5cdFx0XHRcdF0sXG5cdFx0XHRcdFwidHJhbnNsYXRlWFwiOiBbXG5cdFx0XHRcdFx0XCIwJVwiLFxuXHRcdFx0XHRcdFwiMCVcIlxuXHRcdFx0XHRdXG5cdFx0XHR9LFxuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLmlzbnRlYXN5XzEyXCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MSxcblx0XHRcdFx0XHQwXG5cdFx0XHRcdF0sXG5cdFx0XHRcdFwidHJhbnNsYXRlWVwiOiBbXG5cdFx0XHRcdFx0XCIwJVwiLFxuXHRcdFx0XHRcdFwiLTQwJVwiXG5cdFx0XHRcdF0sXG5cdFx0XHRcdFwidHJhbnNsYXRlWFwiOiBbXG5cdFx0XHRcdFx0XCIwJVwiLFxuXHRcdFx0XHRcdFwiMCVcIlxuXHRcdFx0XHRdXG5cdFx0XHR9XG5cdFx0XVxuXHR9LFxuXHR7XG5cdFx0XCJ3cmFwcGVyXCI6IFwiI2l0aXNudGVhc3lcIixcblx0XHRcImR1cmF0aW9uXCI6IFwiODAlXCIsXG5cdFx0XCJhbmltYXRpb25zXCI6IFtcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5oaWRlc291cmNlXCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MSxcblx0XHRcdFx0XHQwXG5cdFx0XHRcdF1cblx0XHRcdH0sXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIuZGlzcGxheS00XCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MSxcblx0XHRcdFx0XHQwXG5cdFx0XHRcdF1cblx0XHRcdH0sXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIudHJ1bXBcIixcblx0XHRcdFx0XCJ0cmFuc2xhdGVYXCI6IFtcblx0XHRcdFx0XHQwLFxuXHRcdFx0XHRcdFwiLTclXCJcblx0XHRcdFx0XSxcblx0XHRcdFx0XCJzY2FsZVwiOiBbXG5cdFx0XHRcdFx0MSxcblx0XHRcdFx0XHQyXG5cdFx0XHRcdF1cblx0XHRcdH1cblx0XHRdXG5cdH0sXG5cdHtcblx0XHRcIndyYXBwZXJcIjogXCIjaXRpc250ZWFzeVwiLFxuXHRcdFwiZHVyYXRpb25cIjogXCIxMDAlXCIsXG5cdFx0XCJmb2N1c1wiOiB0cnVlLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXG5cdFx0XHR7fVxuXHRcdF1cblx0fSxcblx0e1xuXHRcdFwid3JhcHBlclwiOiBcIiNpdGlzbnRlYXN5XCIsXG5cdFx0XCJkdXJhdGlvblwiOiBcIjMwMCVcIixcblx0XHRcImFuaW1hdGlvbnNcIjogW1xuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLnRydW1wXCIsXG5cdFx0XHRcdFwidHJhbnNsYXRlWFwiOiBbXG5cdFx0XHRcdFx0XCItMjAlXCJcblx0XHRcdFx0XSxcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQxLFxuXHRcdFx0XHRcdDBcblx0XHRcdFx0XVxuXHRcdFx0fVxuXHRcdF1cblx0fVxuXTtcblxuXG4vKioqKioqKioqKioqKioqKipcbiAqKiBXRUJQQUNLIEZPT1RFUlxuICoqIC4vfi9qc29uLWxvYWRlciEuL3NjZW5lcy9pdGlzbnRlYXN5L3NjZW5lLmpzb25cbiAqKiBtb2R1bGUgaWQgPSA2NFxuICoqIG1vZHVsZSBjaHVua3MgPSAwXG4gKiovIiwibW9kdWxlLmV4cG9ydHMgPSBbXG5cdHtcblx0XHRcIndyYXBwZXJcIjogXCIjaXRzZ290dG9lbmRcIixcblx0XHRcImR1cmF0aW9uXCI6IFwiMTAwJVwiLFxuXHRcdFwiZm9jdXNcIjogdHJ1ZSxcblx0XHRcImFuaW1hdGlvbnNcIjogW1xuXHRcdFx0e31cblx0XHRdXG5cdH1cbl07XG5cblxuLyoqKioqKioqKioqKioqKioqXG4gKiogV0VCUEFDSyBGT09URVJcbiAqKiAuL34vanNvbi1sb2FkZXIhLi9zY2VuZXMvaXRzZ290dG9lbmQvc2NlbmUuanNvblxuICoqIG1vZHVsZSBpZCA9IDY1XG4gKiogbW9kdWxlIGNodW5rcyA9IDBcbiAqKi8iLCJtb2R1bGUuZXhwb3J0cyA9IFtcblx0e1xuXHRcdFwid3JhcHBlclwiOiBcIiNpd2FudG15aXNsYW1iYWNrMVwiLFxuXHRcdFwiZHVyYXRpb25cIjogXCIxMDAlXCIsXG5cdFx0XCJhbmltYXRpb25zXCI6IFtcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5kaXNwbGF5LTRcIixcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQyLFxuXHRcdFx0XHRcdDJcblx0XHRcdFx0XVxuXHRcdFx0fVxuXHRcdF1cblx0fSxcblx0e1xuXHRcdFwid3JhcHBlclwiOiBcIiNpd2FudG15aXNsYW1iYWNrMVwiLFxuXHRcdFwiZHVyYXRpb25cIjogXCIxMDAlXCIsXG5cdFx0XCJmb2N1c1wiOiB0cnVlLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIuZGlzcGxheS00XCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MlxuXHRcdFx0XHRdXG5cdFx0XHR9XG5cdFx0XVxuXHR9LFxuXHR7XG5cdFx0XCJ3cmFwcGVyXCI6IFwiI2l3YW50bXlpc2xhbWJhY2sxXCIsXG5cdFx0XCJkdXJhdGlvblwiOiBcIjEwMCVcIixcblx0XHRcImFuaW1hdGlvbnNcIjogW1xuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLmRpc3BsYXktNFwiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDIsXG5cdFx0XHRcdFx0MFxuXHRcdFx0XHRdXG5cdFx0XHR9XG5cdFx0XVxuXHR9XG5dO1xuXG5cbi8qKioqKioqKioqKioqKioqKlxuICoqIFdFQlBBQ0sgRk9PVEVSXG4gKiogLi9+L2pzb24tbG9hZGVyIS4vc2NlbmVzL2l3YW50bXlpc2xhbWJhY2sxL3NjZW5lLmpzb25cbiAqKiBtb2R1bGUgaWQgPSA2NlxuICoqIG1vZHVsZSBjaHVua3MgPSAwXG4gKiovIiwibW9kdWxlLmV4cG9ydHMgPSBbXG5cdHtcblx0XHRcIndyYXBwZXJcIjogXCIjbGlrZXBlYWNlXCIsXG5cdFx0XCJkdXJhdGlvblwiOiBcIjEwMCVcIixcblx0XHRcImFuaW1hdGlvbnNcIjogW1xuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLmRpc3BsYXktNFwiLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVlcIjogXCIzMCVcIlxuXHRcdFx0fVxuXHRcdF1cblx0fSxcblx0e1xuXHRcdFwid3JhcHBlclwiOiBcIiNsaWtlcGVhY2VcIixcblx0XHRcImR1cmF0aW9uXCI6IFwiMTAwJVwiLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIuZmlyc3RcIixcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQwLFxuXHRcdFx0XHRcdDFcblx0XHRcdFx0XVxuXHRcdFx0fVxuXHRcdF1cblx0fSxcblx0e1xuXHRcdFwid3JhcHBlclwiOiBcIiNsaWtlcGVhY2VcIixcblx0XHRcImR1cmF0aW9uXCI6IFwiMTAwJVwiLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIuc2Vjb25kXCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MCxcblx0XHRcdFx0XHQxXG5cdFx0XHRcdF1cblx0XHRcdH1cblx0XHRdXG5cdH0sXG5cdHtcblx0XHRcIndyYXBwZXJcIjogXCIjbGlrZXBlYWNlXCIsXG5cdFx0XCJkdXJhdGlvblwiOiBcIjEwMCVcIixcblx0XHRcImFuaW1hdGlvbnNcIjogW1xuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLnRoaXJkXCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MCxcblx0XHRcdFx0XHQxXG5cdFx0XHRcdF1cblx0XHRcdH1cblx0XHRdXG5cdH0sXG5cdHtcblx0XHRcIndyYXBwZXJcIjogXCIjbGlrZXBlYWNlXCIsXG5cdFx0XCJkdXJhdGlvblwiOiBcIjUwJVwiLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXVxuXHR9LFxuXHR7XG5cdFx0XCJ3cmFwcGVyXCI6IFwiI2xpa2VwZWFjZVwiLFxuXHRcdFwiZHVyYXRpb25cIjogXCIxMDAlXCIsXG5cdFx0XCJhbmltYXRpb25zXCI6IFtcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5maXJzdFwiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogMVxuXHRcdFx0fSxcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5zZWNvbmRcIixcblx0XHRcdFx0XCJvcGFjaXR5XCI6IDFcblx0XHRcdH0sXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIudGhpcmRcIixcblx0XHRcdFx0XCJvcGFjaXR5XCI6IDFcblx0XHRcdH0sXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIuZm91cnRoXCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0LTQsXG5cdFx0XHRcdFx0MVxuXHRcdFx0XHRdXG5cdFx0XHR9LFxuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLmRpc3BsYXktNFwiLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVlcIjogW1xuXHRcdFx0XHRcdFwiMzAlXCIsXG5cdFx0XHRcdFx0XCIwJVwiXG5cdFx0XHRcdF1cblx0XHRcdH1cblx0XHRdXG5cdH0sXG5cdHtcblx0XHRcIndyYXBwZXJcIjogXCIjbGlrZXBlYWNlXCIsXG5cdFx0XCJkdXJhdGlvblwiOiBcIjIwMCVcIixcblx0XHRcImFuaW1hdGlvbnNcIjogW1xuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLmZpcnN0XCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiAxXG5cdFx0XHR9LFxuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLnNlY29uZFwiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogMVxuXHRcdFx0fSxcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi50aGlyZFwiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogMVxuXHRcdFx0fSxcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5mb3VydGhcIixcblx0XHRcdFx0XCJvcGFjaXR5XCI6IDFcblx0XHRcdH0sXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIuZGlzcGxheS00XCIsXG5cdFx0XHRcdFwidHJhbnNsYXRlWVwiOiBcIjAlXCJcblx0XHRcdH1cblx0XHRdXG5cdH0sXG5cdHtcblx0XHRcIndyYXBwZXJcIjogXCIjbGlrZXBlYWNlXCIsXG5cdFx0XCJkdXJhdGlvblwiOiBcIjEwMCVcIixcblx0XHRcImZvY3VzXCI6IHRydWUsXG5cdFx0XCJhbmltYXRpb25zXCI6IFtcblx0XHRcdHt9XG5cdFx0XVxuXHR9XG5dO1xuXG5cbi8qKioqKioqKioqKioqKioqKlxuICoqIFdFQlBBQ0sgRk9PVEVSXG4gKiogLi9+L2pzb24tbG9hZGVyIS4vc2NlbmVzL2xpa2VwZWFjZS9zY2VuZS5qc29uXG4gKiogbW9kdWxlIGlkID0gNjdcbiAqKiBtb2R1bGUgY2h1bmtzID0gMFxuICoqLyIsIm1vZHVsZS5leHBvcnRzID0gW1xuXHR7XG5cdFx0XCJ3cmFwcGVyXCI6IFwiI21peGVkZmVlbGluZ3NcIixcblx0XHRcImR1cmF0aW9uXCI6IFwiMTAwJVwiLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIuZGlzcGxheS00XCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MCxcblx0XHRcdFx0XHQxLjI1XG5cdFx0XHRcdF1cblx0XHRcdH1cblx0XHRdXG5cdH0sXG5cdHtcblx0XHRcIndyYXBwZXJcIjogXCIjbWl4ZWRmZWVsaW5nc1wiLFxuXHRcdFwiZHVyYXRpb25cIjogXCIxMDAlXCIsXG5cdFx0XCJmb2N1c1wiOiB0cnVlLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXG5cdFx0XHR7fVxuXHRcdF1cblx0fSxcblx0e1xuXHRcdFwid3JhcHBlclwiOiBcIiNtaXhlZGZlZWxpbmdzXCIsXG5cdFx0XCJkdXJhdGlvblwiOiBcIjEwMCVcIixcblx0XHRcImFuaW1hdGlvbnNcIjogW1xuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLmRpc3BsYXktNFwiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDIsXG5cdFx0XHRcdFx0MFxuXHRcdFx0XHRdXG5cdFx0XHR9XG5cdFx0XVxuXHR9XG5dO1xuXG5cbi8qKioqKioqKioqKioqKioqKlxuICoqIFdFQlBBQ0sgRk9PVEVSXG4gKiogLi9+L2pzb24tbG9hZGVyIS4vc2NlbmVzL21peGVkZmVlbGluZ3Mvc2NlbmUuanNvblxuICoqIG1vZHVsZSBpZCA9IDY4XG4gKiogbW9kdWxlIGNodW5rcyA9IDBcbiAqKi8iLCJtb2R1bGUuZXhwb3J0cyA9IFtcblx0e1xuXHRcdFwid3JhcHBlclwiOiBcIiNtdXNsaW1zYmVsaWV2ZWluZGl2aWR1YWxsaWZlXCIsXG5cdFx0XCJkdXJhdGlvblwiOiBcIjEwMCVcIixcblx0XHRcImFuaW1hdGlvbnNcIjogW1xuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLmRpc3BsYXktNFwiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDAsXG5cdFx0XHRcdFx0MVxuXHRcdFx0XHRdXG5cdFx0XHR9XG5cdFx0XVxuXHR9LFxuXHR7XG5cdFx0XCJ3cmFwcGVyXCI6IFwiI211c2xpbXNiZWxpZXZlaW5kaXZpZHVhbGxpZmVcIixcblx0XHRcImR1cmF0aW9uXCI6IFwiMTAwJVwiLFxuXHRcdFwiZm9jdXNcIjogdHJ1ZSxcblx0XHRcImFuaW1hdGlvbnNcIjogW1xuXHRcdFx0e31cblx0XHRdXG5cdH0sXG5cdHtcblx0XHRcIndyYXBwZXJcIjogXCIjbXVzbGltc2JlbGlldmVpbmRpdmlkdWFsbGlmZVwiLFxuXHRcdFwiZHVyYXRpb25cIjogXCIxMDAlXCIsXG5cdFx0XCJhbmltYXRpb25zXCI6IFtcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5kaXNwbGF5LTRcIixcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQxLFxuXHRcdFx0XHRcdDBcblx0XHRcdFx0XVxuXHRcdFx0fVxuXHRcdF1cblx0fVxuXTtcblxuXG4vKioqKioqKioqKioqKioqKipcbiAqKiBXRUJQQUNLIEZPT1RFUlxuICoqIC4vfi9qc29uLWxvYWRlciEuL3NjZW5lcy9tdXNsaW1zYmVsaWV2ZWluZGl2aWR1YWxsaWZlL3NjZW5lLmpzb25cbiAqKiBtb2R1bGUgaWQgPSA2OVxuICoqIG1vZHVsZSBjaHVua3MgPSAwXG4gKiovIiwibW9kdWxlLmV4cG9ydHMgPSBbXG5cdHtcblx0XHRcIndyYXBwZXJcIjogXCIjb3V0dG9nZXR5b3VcIixcblx0XHRcImR1cmF0aW9uXCI6IFwiMTAwJVwiLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIub3V0LXRvLWdldC15b3VcIixcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQwLFxuXHRcdFx0XHRcdDFcblx0XHRcdFx0XVxuXHRcdFx0fVxuXHRcdF1cblx0fSxcblx0e1xuXHRcdFwid3JhcHBlclwiOiBcIiNvdXR0b2dldHlvdVwiLFxuXHRcdFwiZHVyYXRpb25cIjogXCIxMDAlXCIsXG5cdFx0XCJmb2N1c1wiOiB0cnVlLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXG5cdFx0XHR7fVxuXHRcdF1cblx0fSxcblx0e1xuXHRcdFwid3JhcHBlclwiOiBcIiNvdXR0b2dldHlvdVwiLFxuXHRcdFwiZHVyYXRpb25cIjogXCIxMDAlXCIsXG5cdFx0XCJhbmltYXRpb25zXCI6IFtcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5vdXQtdG8tZ2V0LXlvdVwiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDIsXG5cdFx0XHRcdFx0MFxuXHRcdFx0XHRdXG5cdFx0XHR9XG5cdFx0XVxuXHR9XG5dO1xuXG5cbi8qKioqKioqKioqKioqKioqKlxuICoqIFdFQlBBQ0sgRk9PVEVSXG4gKiogLi9+L2pzb24tbG9hZGVyIS4vc2NlbmVzL291dHRvZ2V0eW91L3NjZW5lLmpzb25cbiAqKiBtb2R1bGUgaWQgPSA3MFxuICoqIG1vZHVsZSBjaHVua3MgPSAwXG4gKiovIiwibW9kdWxlLmV4cG9ydHMgPSBbXG5cdHtcblx0XHRcIndyYXBwZXJcIjogXCIjcmVhY3Rpb25zdG90ZXJyb3JcIixcblx0XHRcImR1cmF0aW9uXCI6IFwiMTUwJVwiLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXG5cdFx0XHR7fVxuXHRcdF1cblx0fSxcblx0e1xuXHRcdFwid3JhcHBlclwiOiBcIiNyZWFjdGlvbnN0b3RlcnJvclwiLFxuXHRcdFwiZHVyYXRpb25cIjogXCIxMDAlXCIsXG5cdFx0XCJhbmltYXRpb25zXCI6IFtcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5hbmltLTFcIixcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQwLFxuXHRcdFx0XHRcdDFcblx0XHRcdFx0XSxcblx0XHRcdFx0XCJ0cmFuc2xhdGVZXCI6IFtcblx0XHRcdFx0XHRcIi0zOCVcIixcblx0XHRcdFx0XHRcIi0zOCVcIlxuXHRcdFx0XHRdXG5cdFx0XHR9XG5cdFx0XVxuXHR9LFxuXHR7XG5cdFx0XCJ3cmFwcGVyXCI6IFwiI3JlYWN0aW9uc3RvdGVycm9yXCIsXG5cdFx0XCJkdXJhdGlvblwiOiBcIjEwMCVcIixcblx0XHRcImZvY3VzXCI6IHRydWUsXG5cdFx0XCJhbmltYXRpb25zXCI6IFtcblx0XHRcdHt9XG5cdFx0XVxuXHR9LFxuXHR7XG5cdFx0XCJ3cmFwcGVyXCI6IFwiI3JlYWN0aW9uc3RvdGVycm9yXCIsXG5cdFx0XCJkdXJhdGlvblwiOiBcIjEwMCVcIixcblx0XHRcImFuaW1hdGlvbnNcIjogW1xuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLmFuaW0tMVwiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDEsXG5cdFx0XHRcdFx0MFxuXHRcdFx0XHRdLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVlcIjogW1xuXHRcdFx0XHRcdFwiLTM4JVwiLFxuXHRcdFx0XHRcdFwiLTM4JVwiXG5cdFx0XHRcdF1cblx0XHRcdH1cblx0XHRdXG5cdH1cbl07XG5cblxuLyoqKioqKioqKioqKioqKioqXG4gKiogV0VCUEFDSyBGT09URVJcbiAqKiAuL34vanNvbi1sb2FkZXIhLi9zY2VuZXMvcmVhY3Rpb25zdG90ZXJyb3Ivc2NlbmUuanNvblxuICoqIG1vZHVsZSBpZCA9IDcxXG4gKiogbW9kdWxlIGNodW5rcyA9IDBcbiAqKi8iLCJtb2R1bGUuZXhwb3J0cyA9IFtcblx0e1xuXHRcdFwid3JhcHBlclwiOiBcIiNzb21ldGhpbmd0b3Byb3ZlXCIsXG5cdFx0XCJkdXJhdGlvblwiOiBcIjEwMCVcIixcblx0XHRcImFuaW1hdGlvbnNcIjogW1xuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLmRpc3BsYXktNFwiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDAsXG5cdFx0XHRcdFx0MVxuXHRcdFx0XHRdXG5cdFx0XHR9XG5cdFx0XVxuXHR9LFxuXHR7XG5cdFx0XCJ3cmFwcGVyXCI6IFwiI3NvbWV0aGluZ3RvcHJvdmVcIixcblx0XHRcImR1cmF0aW9uXCI6IFwiMTAwJVwiLFxuXHRcdFwiZm9jdXNcIjogdHJ1ZSxcblx0XHRcImFuaW1hdGlvbnNcIjogW1xuXHRcdFx0e31cblx0XHRdXG5cdH0sXG5cdHtcblx0XHRcIndyYXBwZXJcIjogXCIjc29tZXRoaW5ndG9wcm92ZVwiLFxuXHRcdFwiZHVyYXRpb25cIjogXCIxMDAlXCIsXG5cdFx0XCJhbmltYXRpb25zXCI6IFtcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5kaXNwbGF5LTRcIixcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQxLFxuXHRcdFx0XHRcdDBcblx0XHRcdFx0XVxuXHRcdFx0fVxuXHRcdF1cblx0fVxuXTtcblxuXG4vKioqKioqKioqKioqKioqKipcbiAqKiBXRUJQQUNLIEZPT1RFUlxuICoqIC4vfi9qc29uLWxvYWRlciEuL3NjZW5lcy9zb21ldGhpbmd0b3Byb3ZlL3NjZW5lLmpzb25cbiAqKiBtb2R1bGUgaWQgPSA3MlxuICoqIG1vZHVsZSBjaHVua3MgPSAwXG4gKiovIiwibW9kdWxlLmV4cG9ydHMgPSBbXG5cdHtcblx0XHRcIndyYXBwZXJcIjogXCIjd2VhcmVjb21pbmdcIixcblx0XHRcImR1cmF0aW9uXCI6IFwiMTAwJVwiLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIuZGlzcGxheS00XCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MCxcblx0XHRcdFx0XHQxXG5cdFx0XHRcdF1cblx0XHRcdH1cblx0XHRdXG5cdH0sXG5cdHtcblx0XHRcIndyYXBwZXJcIjogXCIjd2VhcmVjb21pbmdcIixcblx0XHRcImR1cmF0aW9uXCI6IFwiMTAwJVwiLFxuXHRcdFwiZm9jdXNcIjogdHJ1ZSxcblx0XHRcImFuaW1hdGlvbnNcIjogW1xuXHRcdFx0e31cblx0XHRdXG5cdH0sXG5cdHtcblx0XHRcIndyYXBwZXJcIjogXCIjd2VhcmVjb21pbmdcIixcblx0XHRcImR1cmF0aW9uXCI6IFwiMTAwJVwiLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIuZGlzcGxheS00XCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0Mixcblx0XHRcdFx0XHQwXG5cdFx0XHRcdF1cblx0XHRcdH1cblx0XHRdXG5cdH1cbl07XG5cblxuLyoqKioqKioqKioqKioqKioqXG4gKiogV0VCUEFDSyBGT09URVJcbiAqKiAuL34vanNvbi1sb2FkZXIhLi9zY2VuZXMvd2VhcmVjb21pbmcvc2NlbmUuanNvblxuICoqIG1vZHVsZSBpZCA9IDczXG4gKiogbW9kdWxlIGNodW5rcyA9IDBcbiAqKi8iLCJtb2R1bGUuZXhwb3J0cyA9IFtcblx0e1xuXHRcdFwid3JhcHBlclwiOiBcIiN3ZWFyZW5vdGFmcmFpZFwiLFxuXHRcdFwiZHVyYXRpb25cIjogXCIxMDAlXCIsXG5cdFx0XCJhbmltYXRpb25zXCI6IFtcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5kaXNwbGF5LTRcIixcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQwLFxuXHRcdFx0XHRcdDFcblx0XHRcdFx0XVxuXHRcdFx0fVxuXHRcdF1cblx0fSxcblx0e1xuXHRcdFwid3JhcHBlclwiOiBcIiN3ZWFyZW5vdGFmcmFpZFwiLFxuXHRcdFwiZHVyYXRpb25cIjogXCIxMDAlXCIsXG5cdFx0XCJmb2N1c1wiOiB0cnVlLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXG5cdFx0XHR7fVxuXHRcdF1cblx0fSxcblx0e1xuXHRcdFwid3JhcHBlclwiOiBcIiN3ZWFyZW5vdGFmcmFpZFwiLFxuXHRcdFwiZHVyYXRpb25cIjogXCIxMDAlXCIsXG5cdFx0XCJhbmltYXRpb25zXCI6IFtcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5kaXNwbGF5LTRcIixcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQxLFxuXHRcdFx0XHRcdDBcblx0XHRcdFx0XVxuXHRcdFx0fVxuXHRcdF1cblx0fVxuXTtcblxuXG4vKioqKioqKioqKioqKioqKipcbiAqKiBXRUJQQUNLIEZPT1RFUlxuICoqIC4vfi9qc29uLWxvYWRlciEuL3NjZW5lcy93ZWFyZW5vdGFmcmFpZC9zY2VuZS5qc29uXG4gKiogbW9kdWxlIGlkID0gNzRcbiAqKiBtb2R1bGUgY2h1bmtzID0gMFxuICoqLyIsIm1vZHVsZS5leHBvcnRzID0gW1xuXHR7XG5cdFx0XCJ3cmFwcGVyXCI6IFwiI3dld2lsbHByb3RlY3RlYWNob3RoZXJcIixcblx0XHRcImR1cmF0aW9uXCI6IFwiMTAwJVwiLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIucHJlbWlzZVwiLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVlcIjogW1xuXHRcdFx0XHRcdFwiMjUlXCIsXG5cdFx0XHRcdFx0XCIwXCJcblx0XHRcdFx0XSxcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQwLFxuXHRcdFx0XHRcdDEuNzVcblx0XHRcdFx0XVxuXHRcdFx0fSxcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5jb25jbHVzaW9uXCIsXG5cdFx0XHRcdFwidHJhbnNsYXRlWVwiOiBcIjI1JVwiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDAsXG5cdFx0XHRcdFx0MFxuXHRcdFx0XHRdXG5cdFx0XHR9XG5cdFx0XVxuXHR9LFxuXHR7XG5cdFx0XCJ3cmFwcGVyXCI6IFwiI3dld2lsbHByb3RlY3RlYWNob3RoZXJcIixcblx0XHRcImR1cmF0aW9uXCI6IFwiNTAlXCIsXG5cdFx0XCJhbmltYXRpb25zXCI6IFtdXG5cdH0sXG5cdHtcblx0XHRcIndyYXBwZXJcIjogXCIjd2V3aWxscHJvdGVjdGVhY2hvdGhlclwiLFxuXHRcdFwiZHVyYXRpb25cIjogXCIxMDAlXCIsXG5cdFx0XCJhbmltYXRpb25zXCI6IFtcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5jb25jbHVzaW9uXCIsXG5cdFx0XHRcdFwidHJhbnNsYXRlWVwiOiBbXG5cdFx0XHRcdFx0XCIyNSVcIixcblx0XHRcdFx0XHRcIjBcIlxuXHRcdFx0XHRdLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDAsXG5cdFx0XHRcdFx0MVxuXHRcdFx0XHRdXG5cdFx0XHR9XG5cdFx0XVxuXHR9LFxuXHR7XG5cdFx0XCJ3cmFwcGVyXCI6IFwiI3dld2lsbHByb3RlY3RlYWNob3RoZXJcIixcblx0XHRcImR1cmF0aW9uXCI6IFwiMTAwJVwiLFxuXHRcdFwiZm9jdXNcIjogdHJ1ZSxcblx0XHRcImFuaW1hdGlvbnNcIjogW1xuXHRcdFx0e31cblx0XHRdXG5cdH0sXG5cdHtcblx0XHRcIndyYXBwZXJcIjogXCIjd2V3aWxscHJvdGVjdGVhY2hvdGhlclwiLFxuXHRcdFwiZHVyYXRpb25cIjogXCIxMDAlXCIsXG5cdFx0XCJhbmltYXRpb25zXCI6IFtcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5wcmVtaXNlXCIsXG5cdFx0XHRcdFwidHJhbnNsYXRlWVwiOiBbXG5cdFx0XHRcdFx0XCIwXCIsXG5cdFx0XHRcdFx0XCItMjUlXCJcblx0XHRcdFx0XSxcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQxLFxuXHRcdFx0XHRcdDBcblx0XHRcdFx0XVxuXHRcdFx0fSxcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5jb25jbHVzaW9uXCIsXG5cdFx0XHRcdFwidHJhbnNsYXRlWVwiOiBbXG5cdFx0XHRcdFx0XCIwXCIsXG5cdFx0XHRcdFx0XCItMjUlXCJcblx0XHRcdFx0XSxcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQxLFxuXHRcdFx0XHRcdDBcblx0XHRcdFx0XVxuXHRcdFx0fVxuXHRcdF1cblx0fVxuXTtcblxuXG4vKioqKioqKioqKioqKioqKipcbiAqKiBXRUJQQUNLIEZPT1RFUlxuICoqIC4vfi9qc29uLWxvYWRlciEuL3NjZW5lcy93ZXdpbGxwcm90ZWN0ZWFjaG90aGVyL3NjZW5lLmpzb25cbiAqKiBtb2R1bGUgaWQgPSA3NVxuICoqIG1vZHVsZSBjaHVua3MgPSAwXG4gKiovIiwibW9kdWxlLmV4cG9ydHMgPSBbXG5cdHtcblx0XHRcIndyYXBwZXJcIjogXCIjd2hhdGlzbGFtaWNoaXN0b3J5cHJlZmVyc1wiLFxuXHRcdFwiZHVyYXRpb25cIjogXCIxMDAlXCIsXG5cdFx0XCJhbmltYXRpb25zXCI6IFtcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5kaXNwbGF5LTRcIixcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQwLFxuXHRcdFx0XHRcdDFcblx0XHRcdFx0XVxuXHRcdFx0fVxuXHRcdF1cblx0fSxcblx0e1xuXHRcdFwid3JhcHBlclwiOiBcIiN3aGF0aXNsYW1pY2hpc3RvcnlwcmVmZXJzXCIsXG5cdFx0XCJkdXJhdGlvblwiOiBcIjEwMCVcIixcblx0XHRcImFuaW1hdGlvbnNcIjogW1xuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLmRpc3BsYXktNFwiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDEsXG5cdFx0XHRcdFx0MVxuXHRcdFx0XHRdXG5cdFx0XHR9LFxuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLmlzbGFtaWMtaW52ZW50aW9uc1wiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDAsXG5cdFx0XHRcdFx0MVxuXHRcdFx0XHRdXG5cdFx0XHR9XG5cdFx0XVxuXHR9LFxuXHR7XG5cdFx0XCJ3cmFwcGVyXCI6IFwiI3doYXRpc2xhbWljaGlzdG9yeXByZWZlcnNcIixcblx0XHRcImR1cmF0aW9uXCI6IFwiMTAwJVwiLFxuXHRcdFwiZm9jdXNcIjogdHJ1ZSxcblx0XHRcImFuaW1hdGlvbnNcIjogW1xuXHRcdFx0e31cblx0XHRdXG5cdH0sXG5cdHtcblx0XHRcIndyYXBwZXJcIjogXCIjd2hhdGlzbGFtaWNoaXN0b3J5cHJlZmVyc1wiLFxuXHRcdFwiZHVyYXRpb25cIjogXCIxMDAlXCIsXG5cdFx0XCJhbmltYXRpb25zXCI6IFtcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5kaXNwbGF5LTRcIixcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQxLFxuXHRcdFx0XHRcdDAuNVxuXHRcdFx0XHRdXG5cdFx0XHR9LFxuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLmlzbGFtaWMtaW52ZW50aW9uc1wiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDEsXG5cdFx0XHRcdFx0MC41XG5cdFx0XHRcdF1cblx0XHRcdH1cblx0XHRdXG5cdH0sXG5cdHtcblx0XHRcIndyYXBwZXJcIjogXCIjd2hhdGlzbGFtaWNoaXN0b3J5cHJlZmVyc1wiLFxuXHRcdFwiZHVyYXRpb25cIjogXCIxMDAlXCIsXG5cdFx0XCJhbmltYXRpb25zXCI6IFtcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5kaXNwbGF5LTRcIixcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQwLjUsXG5cdFx0XHRcdFx0MFxuXHRcdFx0XHRdXG5cdFx0XHR9LFxuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLmlzbGFtaWMtaW52ZW50aW9uc1wiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDAuNSxcblx0XHRcdFx0XHQwXG5cdFx0XHRcdF1cblx0XHRcdH1cblx0XHRdXG5cdH1cbl07XG5cblxuLyoqKioqKioqKioqKioqKioqXG4gKiogV0VCUEFDSyBGT09URVJcbiAqKiAuL34vanNvbi1sb2FkZXIhLi9zY2VuZXMvd2hhdGlzbGFtaWNoaXN0b3J5cHJlZmVycy9zY2VuZS5qc29uXG4gKiogbW9kdWxlIGlkID0gNzZcbiAqKiBtb2R1bGUgY2h1bmtzID0gMFxuICoqLyIsIm1vZHVsZS5leHBvcnRzID0gW1xuXHR7XG5cdFx0XCJ3cmFwcGVyXCI6IFwiI3doYXR0aGVxdXJhbnByZWZlcnNcIixcblx0XHRcImR1cmF0aW9uXCI6IFwiMTAwJVwiLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIuZGlzcGxheS00XCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MSxcblx0XHRcdFx0XHQwXG5cdFx0XHRcdF1cblx0XHRcdH1cblx0XHRdXG5cdH1cbl07XG5cblxuLyoqKioqKioqKioqKioqKioqXG4gKiogV0VCUEFDSyBGT09URVJcbiAqKiAuL34vanNvbi1sb2FkZXIhLi9zY2VuZXMvd2hhdHRoZXF1cmFucHJlZmVycy9zY2VuZS5qc29uXG4gKiogbW9kdWxlIGlkID0gNzdcbiAqKiBtb2R1bGUgY2h1bmtzID0gMFxuICoqLyIsIm1vZHVsZS5leHBvcnRzID0gW1xuXHR7XG5cdFx0XCJ3cmFwcGVyXCI6IFwiI3dob2FyZXRoZXlcIixcblx0XHRcImR1cmF0aW9uXCI6IFwiMTAwJVwiLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIuZGlzcGxheS00XCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MCxcblx0XHRcdFx0XHQxXG5cdFx0XHRcdF1cblx0XHRcdH1cblx0XHRdXG5cdH0sXG5cdHtcblx0XHRcIndyYXBwZXJcIjogXCIjd2hvYXJldGhleVwiLFxuXHRcdFwiZHVyYXRpb25cIjogXCIxMDAlXCIsXG5cdFx0XCJmb2N1c1wiOiB0cnVlLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXG5cdFx0XHR7fVxuXHRcdF1cblx0fSxcblx0e1xuXHRcdFwid3JhcHBlclwiOiBcIiN3aG9hcmV0aGV5XCIsXG5cdFx0XCJkdXJhdGlvblwiOiBcIjEwMCVcIixcblx0XHRcImFuaW1hdGlvbnNcIjogW1xuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLmRpc3BsYXktNFwiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDIsXG5cdFx0XHRcdFx0MFxuXHRcdFx0XHRdXG5cdFx0XHR9XG5cdFx0XVxuXHR9XG5dO1xuXG5cbi8qKioqKioqKioqKioqKioqKlxuICoqIFdFQlBBQ0sgRk9PVEVSXG4gKiogLi9+L2pzb24tbG9hZGVyIS4vc2NlbmVzL3dob2FyZXRoZXkvc2NlbmUuanNvblxuICoqIG1vZHVsZSBpZCA9IDc4XG4gKiogbW9kdWxlIGNodW5rcyA9IDBcbiAqKi8iLCJtb2R1bGUuZXhwb3J0cyA9IFtcblx0e1xuXHRcdFwid3JhcHBlclwiOiBcIiN3aXRoYWxsdGhlaGF0cmVkXCIsXG5cdFx0XCJkdXJhdGlvblwiOiBcIjEwMCVcIixcblx0XHRcImFuaW1hdGlvbnNcIjogW1xuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLmRpc3BsYXktNFwiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDEsXG5cdFx0XHRcdFx0MFxuXHRcdFx0XHRdXG5cdFx0XHR9XG5cdFx0XVxuXHR9XG5dO1xuXG5cbi8qKioqKioqKioqKioqKioqKlxuICoqIFdFQlBBQ0sgRk9PVEVSXG4gKiogLi9+L2pzb24tbG9hZGVyIS4vc2NlbmVzL3dpdGhhbGx0aGVoYXRyZWQvc2NlbmUuanNvblxuICoqIG1vZHVsZSBpZCA9IDc5XG4gKiogbW9kdWxlIGNodW5rcyA9IDBcbiAqKi8iLCJtb2R1bGUuZXhwb3J0cyA9IFtcblx0e1xuXHRcdFwid3JhcHBlclwiOiBcIiN5ZXR0aGF0c29rYXlcIixcblx0XHRcImR1cmF0aW9uXCI6IFwiMTAwJVwiLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIuZGlzcGxheS00XCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MCxcblx0XHRcdFx0XHQxLjI1XG5cdFx0XHRcdF1cblx0XHRcdH1cblx0XHRdXG5cdH0sXG5cdHtcblx0XHRcIndyYXBwZXJcIjogXCIjeWV0dGhhdHNva2F5XCIsXG5cdFx0XCJkdXJhdGlvblwiOiBcIjEwMCVcIixcblx0XHRcImZvY3VzXCI6IHRydWUsXG5cdFx0XCJhbmltYXRpb25zXCI6IFtcblx0XHRcdHt9XG5cdFx0XVxuXHR9LFxuXHR7XG5cdFx0XCJ3cmFwcGVyXCI6IFwiI3lldHRoYXRzb2theVwiLFxuXHRcdFwiZHVyYXRpb25cIjogXCIxMDAlXCIsXG5cdFx0XCJhbmltYXRpb25zXCI6IFtcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5kaXNwbGF5LTRcIixcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQyLFxuXHRcdFx0XHRcdDBcblx0XHRcdFx0XVxuXHRcdFx0fVxuXHRcdF1cblx0fVxuXTtcblxuXG4vKioqKioqKioqKioqKioqKipcbiAqKiBXRUJQQUNLIEZPT1RFUlxuICoqIC4vfi9qc29uLWxvYWRlciEuL3NjZW5lcy95ZXR0aGF0c29rYXkvc2NlbmUuanNvblxuICoqIG1vZHVsZSBpZCA9IDgwXG4gKiogbW9kdWxlIGNodW5rcyA9IDBcbiAqKi8iXSwic291cmNlUm9vdCI6IiJ9