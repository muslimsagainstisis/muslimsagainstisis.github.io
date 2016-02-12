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
	  var ua = navigator.userAgent;
	  // if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile/i.test(ua))
	  //  $('#unsupported').show();
	  // else if (/Chrome/i.test(ua))
	  init();
	  // else
	  //  $('#unsupported').show();
	});
	
	function init() {
	
	  Pace.on('done', function (e) {
	
	    $('.container-inner').html(sceneHtmlString);
	
	    obscene.init(sceneMotionMap);
	    controls.init();
	
	    $('.loading').delay(300).fadeOut();
	    audioplayer.next('intro');
	    audioplayer.play();
	  });
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

	module.exports = "<style>\n/*#intro {\n  position: fixed;\n  top: 15vh;\n  left: 10%;\n  width: 80%;\n  color: #fff;\n  text-align: center;\n  text-transform: uppercase;\n}*/\n.help-text {\n\tposition: absolute;\n\tcolor: #29d;\n\tfont-size: 3vmin;\n}\n.help-text-skin {\n\tcolor: #29d;\n\tfont-size: 3vmin;\n}\n/*.help-text i {\n\tfont-size: 5vmin;\n}*/\n.beta {\n\topacity: 0.7;\n\tfont-size: 2.5vmin;\n\n}\n</style>\n<div class=\"intro\">\n\t<div class=\"table \">\n  \t\t<div class=\"table-center\">\n    \t\t<div class=\"display-1 text-centered\">\n\t\t\t\t\t<i class=\"fa fa-music animated flash \" style=\"animation-delay: 1.5s;\"></i><br><br>\n\t\t\t\t\tPardon Our Dust. We Are Currently Beta Testing. <br><a target=\"_blank\" style=\"text-decoration:underline\" href=\"mailto:muslimsagainstisisgroup@gmail.com?subject=Techincal Feedback\">Submit Technical Feedback</a>\n\t\t\t\t\t<br ><br>\n    \t\t\tPlay, skip, or scroll to begin <br >\n\t\t\t\t\t<span class=\"help-text-skin\">\n\t\t\t\t\t\tAll quotes and news sources are clickable.\n\t\t\t\t\t</span>\n\t\t\t</div>\n  \t\t</div>\n\t</div>\n</div>\n\n<div class=\"help-text\" style=\"top: 4vmin;right: 16vmin;\">\n\t<span class=\"animated  \" style=\"animation-delay: 2s;\" >Play/Pause <i class=\"fa fa-arrow-circle-right\"></i></span>\n</div>\n<div class=\"help-text\" style=\"top: 14.5vh;right: 16vmin;\">\n\t<span class=\"animated  \" style=\"animation-delay: 2s;\" >Skip <i class=\"fa fa-arrow-circle-right\"></i></span>\n</div>\n\n<div class=\"help-text\" style=\"bottom:3vh;right:48vw;text-align:center\">\n\t<div class=\"animated  \" style=\"animation-delay: 2s;\"><div style=\"padding-bottom: 1vh;\">Scroll</div> <i class=\"fa fa-arrow-circle-down\"></i></div>\n</div>\n";

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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly8vd2VicGFjay9ib290c3RyYXAgNTcwY2YxMDBiNzU4ODRiODNkMTEiLCJ3ZWJwYWNrOi8vLy4vanMvZW50cnkuanMiLCJ3ZWJwYWNrOi8vLy4vc2NlbmUtbWFrZXIvaW5kZXguanMiLCJ3ZWJwYWNrOi8vLy4vc2NlbmUtbWFrZXIvb2Itc2NlbmUuanMiLCJ3ZWJwYWNrOi8vLy4vfi9rZWZpci9kaXN0L2tlZmlyLmpzIiwid2VicGFjazovLy8uL3NjZW5lLW1ha2VyL3JlbmRlci9hdWRpb3BsYXllci5qcyIsIndlYnBhY2s6Ly8vLi9zY2VuZS1tYWtlci9yZW5kZXIvbG9vcGVyLmpzIiwid2VicGFjazovLy8uL34vaG93bGVyL2hvd2xlci5qcyIsIndlYnBhY2s6Ly8vKHdlYnBhY2spL2J1aWxkaW4vYW1kLW9wdGlvbnMuanMiLCJ3ZWJwYWNrOi8vLy4vc2NlbmUtbWFrZXIvcmVuZGVyL3ZpZGVvcGxheWVyLmpzIiwid2VicGFjazovLy8uL3NjZW5lLW1ha2VyL3V0aWxzL3BhZ2UtdXRpbHMuanMiLCJ3ZWJwYWNrOi8vLy4vc2NlbmUtbWFrZXIvdXNlci9jb250cm9scy5qcyIsIndlYnBhY2s6Ly8vLi9zY2VuZS1tYWtlci9yZW5kZXIvaW5kZXguanMiLCJ3ZWJwYWNrOi8vLy4vc2NlbmUtbWFrZXIvcmVuZGVyL3Njcm9sbGJhci5qcyIsIndlYnBhY2s6Ly8vLi9zY2VuZS1tYWtlci91dGlscy9zY2VuZS11dGlscy5qcyIsIndlYnBhY2s6Ly8vLi9zY2VuZXMvaW5kZXguanNvbiIsIndlYnBhY2s6Ly8vXlxcLlxcLy4qXFwvc2NlbmVcXC5odG1sJCIsIndlYnBhY2s6Ly8vLi9zY2VuZXMvYWJvdXR5b3Vyc2VsZi9zY2VuZS5odG1sIiwid2VicGFjazovLy8uL3NjZW5lcy9iYXR0bGVvZmFnZW5lcmF0aW9uL3NjZW5lLmh0bWwiLCJ3ZWJwYWNrOi8vLy4vc2NlbmVzL2NvbXBsaWNhdGVkc2l0dWF0aW9uL3NjZW5lLmh0bWwiLCJ3ZWJwYWNrOi8vLy4vc2NlbmVzL2RpZmZlcmVudHByYWN0aWNlcy9zY2VuZS5odG1sIiwid2VicGFjazovLy8uL3NjZW5lcy9kb3lvdWZlZWxtdXNsaW0vc2NlbmUuaHRtbCIsIndlYnBhY2s6Ly8vLi9zY2VuZXMvZXhwbG9zaW9uL3NjZW5lLmh0bWwiLCJ3ZWJwYWNrOi8vLy4vc2NlbmVzL2ZlZWxpbmdjb25mdXNlZC9zY2VuZS5odG1sIiwid2VicGFjazovLy8uL3NjZW5lcy9pbnRyby9zY2VuZS5odG1sIiwid2VicGFjazovLy8uL3NjZW5lcy9pc2lzYWZ0ZXJsaWZlZmFsbGFjeS9zY2VuZS5odG1sIiwid2VicGFjazovLy8uL3NjZW5lcy9pc2lzYXBvY2FseXBzZW1pc3F1b3RlL3NjZW5lLmh0bWwiLCJ3ZWJwYWNrOi8vLy4vc2NlbmVzL2lzaXNiYW5rcnVwdC9zY2VuZS5odG1sIiwid2VicGFjazovLy8uL3NjZW5lcy9pc2lzZmlnaHRtaXNxdW90ZS9zY2VuZS5odG1sIiwid2VicGFjazovLy8uL3NjZW5lcy9pc2lzb2JqZWN0aXZlL3NjZW5lLmh0bWwiLCJ3ZWJwYWNrOi8vLy4vc2NlbmVzL2lzaXN3YW50c3RvZGl2aWRlL3NjZW5lLmh0bWwiLCJ3ZWJwYWNrOi8vLy4vc2NlbmVzL2l0aXNudGVhc3kvc2NlbmUuaHRtbCIsIndlYnBhY2s6Ly8vLi9zY2VuZXMvaXRzZ290dG9lbmQvc2NlbmUuaHRtbCIsIndlYnBhY2s6Ly8vLi9zY2VuZXMvaXdhbnRteWlzbGFtYmFjazEvc2NlbmUuaHRtbCIsIndlYnBhY2s6Ly8vLi9zY2VuZXMvbGlrZXBlYWNlL3NjZW5lLmh0bWwiLCJ3ZWJwYWNrOi8vLy4vc2NlbmVzL21peGVkZmVlbGluZ3Mvc2NlbmUuaHRtbCIsIndlYnBhY2s6Ly8vLi9zY2VuZXMvbXVzbGltc2JlbGlldmVpbmRpdmlkdWFsbGlmZS9zY2VuZS5odG1sIiwid2VicGFjazovLy8uL3NjZW5lcy9vdXR0b2dldHlvdS9zY2VuZS5odG1sIiwid2VicGFjazovLy8uL3NjZW5lcy9yZWFjdGlvbnN0b3RlcnJvci9zY2VuZS5odG1sIiwid2VicGFjazovLy8uL3NjZW5lcy9zb21ldGhpbmd0b3Byb3ZlL3NjZW5lLmh0bWwiLCJ3ZWJwYWNrOi8vLy4vc2NlbmVzL3dlYXJlY29taW5nL3NjZW5lLmh0bWwiLCJ3ZWJwYWNrOi8vLy4vc2NlbmVzL3dlYXJlbm90YWZyYWlkL3NjZW5lLmh0bWwiLCJ3ZWJwYWNrOi8vLy4vc2NlbmVzL3dld2lsbHByb3RlY3RlYWNob3RoZXIvc2NlbmUuaHRtbCIsIndlYnBhY2s6Ly8vLi9zY2VuZXMvd2hhdGlzbGFtaWNoaXN0b3J5cHJlZmVycy9zY2VuZS5odG1sIiwid2VicGFjazovLy8uL3NjZW5lcy93aGF0dGhlcXVyYW5wcmVmZXJzL3NjZW5lLmh0bWwiLCJ3ZWJwYWNrOi8vLy4vc2NlbmVzL3dob2FyZXRoZXkvc2NlbmUuaHRtbCIsIndlYnBhY2s6Ly8vLi9zY2VuZXMvd2l0aGFsbHRoZWhhdHJlZC9zY2VuZS5odG1sIiwid2VicGFjazovLy8uL3NjZW5lcy95ZXR0aGF0c29rYXkvc2NlbmUuaHRtbCIsIndlYnBhY2s6Ly8vXlxcLlxcLy4qXFwvc2NlbmVcXC5qc29uJCIsIndlYnBhY2s6Ly8vLi9zY2VuZXMvYWJvdXR5b3Vyc2VsZi9zY2VuZS5qc29uIiwid2VicGFjazovLy8uL3NjZW5lcy9iYXR0bGVvZmFnZW5lcmF0aW9uL3NjZW5lLmpzb24iLCJ3ZWJwYWNrOi8vLy4vc2NlbmVzL2NvbXBsaWNhdGVkc2l0dWF0aW9uL3NjZW5lLmpzb24iLCJ3ZWJwYWNrOi8vLy4vc2NlbmVzL2RpZmZlcmVudHByYWN0aWNlcy9zY2VuZS5qc29uIiwid2VicGFjazovLy8uL3NjZW5lcy9kb3lvdWZlZWxtdXNsaW0vc2NlbmUuanNvbiIsIndlYnBhY2s6Ly8vLi9zY2VuZXMvZXhwbG9zaW9uL3NjZW5lLmpzb24iLCJ3ZWJwYWNrOi8vLy4vc2NlbmVzL2ZlZWxpbmdjb25mdXNlZC9zY2VuZS5qc29uIiwid2VicGFjazovLy8uL3NjZW5lcy9pbnRyby9zY2VuZS5qc29uIiwid2VicGFjazovLy8uL3NjZW5lcy9pc2lzYWZ0ZXJsaWZlZmFsbGFjeS9zY2VuZS5qc29uIiwid2VicGFjazovLy8uL3NjZW5lcy9pc2lzYXBvY2FseXBzZW1pc3F1b3RlL3NjZW5lLmpzb24iLCJ3ZWJwYWNrOi8vLy4vc2NlbmVzL2lzaXNiYW5rcnVwdC9zY2VuZS5qc29uIiwid2VicGFjazovLy8uL3NjZW5lcy9pc2lzZmlnaHRtaXNxdW90ZS9zY2VuZS5qc29uIiwid2VicGFjazovLy8uL3NjZW5lcy9pc2lzb2JqZWN0aXZlL3NjZW5lLmpzb24iLCJ3ZWJwYWNrOi8vLy4vc2NlbmVzL2lzaXN3YW50c3RvZGl2aWRlL3NjZW5lLmpzb24iLCJ3ZWJwYWNrOi8vLy4vc2NlbmVzL2l0aXNudGVhc3kvc2NlbmUuanNvbiIsIndlYnBhY2s6Ly8vLi9zY2VuZXMvaXRzZ290dG9lbmQvc2NlbmUuanNvbiIsIndlYnBhY2s6Ly8vLi9zY2VuZXMvaXdhbnRteWlzbGFtYmFjazEvc2NlbmUuanNvbiIsIndlYnBhY2s6Ly8vLi9zY2VuZXMvbGlrZXBlYWNlL3NjZW5lLmpzb24iLCJ3ZWJwYWNrOi8vLy4vc2NlbmVzL21peGVkZmVlbGluZ3Mvc2NlbmUuanNvbiIsIndlYnBhY2s6Ly8vLi9zY2VuZXMvbXVzbGltc2JlbGlldmVpbmRpdmlkdWFsbGlmZS9zY2VuZS5qc29uIiwid2VicGFjazovLy8uL3NjZW5lcy9vdXR0b2dldHlvdS9zY2VuZS5qc29uIiwid2VicGFjazovLy8uL3NjZW5lcy9yZWFjdGlvbnN0b3RlcnJvci9zY2VuZS5qc29uIiwid2VicGFjazovLy8uL3NjZW5lcy9zb21ldGhpbmd0b3Byb3ZlL3NjZW5lLmpzb24iLCJ3ZWJwYWNrOi8vLy4vc2NlbmVzL3dlYXJlY29taW5nL3NjZW5lLmpzb24iLCJ3ZWJwYWNrOi8vLy4vc2NlbmVzL3dlYXJlbm90YWZyYWlkL3NjZW5lLmpzb24iLCJ3ZWJwYWNrOi8vLy4vc2NlbmVzL3dld2lsbHByb3RlY3RlYWNob3RoZXIvc2NlbmUuanNvbiIsIndlYnBhY2s6Ly8vLi9zY2VuZXMvd2hhdGlzbGFtaWNoaXN0b3J5cHJlZmVycy9zY2VuZS5qc29uIiwid2VicGFjazovLy8uL3NjZW5lcy93aGF0dGhlcXVyYW5wcmVmZXJzL3NjZW5lLmpzb24iLCJ3ZWJwYWNrOi8vLy4vc2NlbmVzL3dob2FyZXRoZXkvc2NlbmUuanNvbiIsIndlYnBhY2s6Ly8vLi9zY2VuZXMvd2l0aGFsbHRoZWhhdHJlZC9zY2VuZS5qc29uIiwid2VicGFjazovLy8uL3NjZW5lcy95ZXR0aGF0c29rYXkvc2NlbmUuanNvbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0EsdUJBQWU7QUFDZjtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7O0FBR0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTs7Ozs7OztBQ3RDQTs7Ozs7OztBQ0FBOztBQUVBLEtBQU0sVUFBVSxvQkFBUSxDQUFSLENBQVY7QUFDTixLQUFNLFdBQVcsb0JBQVEsRUFBUixDQUFYO0FBQ04sS0FBTSxTQUFTLG9CQUFRLEVBQVIsQ0FBVDs7QUFFTixLQUFNLGFBQWEsb0JBQVEsRUFBUixDQUFiO0FBQ04sS0FBTSxjQUFjLG9CQUFRLENBQVIsQ0FBZDs7QUFFTixLQUFNLGtCQUFrQixXQUFXLFVBQVgsRUFBbEI7QUFDTixLQUFNLGlCQUFpQixXQUFXLFNBQVgsRUFBakI7QUFDTixLQUFJLG1CQUFvQixXQUFXLGNBQVgsRUFBcEI7O0FBRUosYUFBWSxNQUFaLENBQW1CLGdCQUFuQjs7QUFFQSxHQUFFLFlBQVc7QUFDUCxPQUFJLEtBQUssVUFBVSxTQUFWOzs7O0FBREYsT0FLTDs7O0FBTEssRUFBWCxDQUFGOztBQVVBLFVBQVMsSUFBVCxHQUFnQjs7QUFFZCxRQUFLLEVBQUwsQ0FBUSxNQUFSLEVBQWdCLFVBQUMsQ0FBRCxFQUFPOztBQUVyQixPQUFFLGtCQUFGLEVBQXNCLElBQXRCLENB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Q0FBc0MsRUFBRSw0QkFBNEIsRUFBRTtBQUNwRjtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUEsZ0JBQWU7QUFDZjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUEsZ0JBQWU7QUFDZjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7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Q0E7O0FBRUEsR0FBRTs7QUFFRixvQkFBbUI7O0FBRW5CLFFBQU87QUFDUDtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxlQUFjLFlBQVk7QUFDMUI7QUFDQTtBQUNBO0FBQ0EsZUFBYyxZQUFZO0FBQzFCO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsZUFBYyxZQUFZO0FBQzFCO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLGVBQWMsWUFBWTtBQUMxQjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsZUFBYyxZQUFZO0FBQzFCO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGVBQWMsWUFBWTtBQUMxQjtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsT0FBTTtBQUNOO0FBQ0EsMEJBQXlCLFlBQVk7QUFDckM7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFJO0FBQ0o7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGVBQWMsWUFBWTtBQUMxQjtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxlQUFjLFlBQVk7QUFDMUI7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLGVBQWMsWUFBWTtBQUMxQjtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxvQkFBbUIsWUFBWTtBQUMvQjtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUEsUUFBTztBQUNQO0FBQ0E7O0FBRUE7O0FBRUE7O0FBRUE7O0FBRUE7O0FBRUE7QUFDQTtBQUNBOztBQUVBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQSxHQUFFOztBQUVGOztBQUVBLFFBQU87QUFDUDtBQUNBOztBQUVBOztBQUVBOztBQUVBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0EsOEJBQTZCO0FBQzdCO0FBQ0EscUNBQW9DLDRCQUE0QjtBQUNoRTtBQUNBO0FBQ0EsS0FBSTs7QUFFSjtBQUNBO0FBQ0EsOEJBQTZCO0FBQzdCO0FBQ0EscUNBQW9DLDRCQUE0QjtBQUNoRTtBQUNBO0FBQ0EsS0FBSTs7QUFFSjtBQUNBO0FBQ0E7QUFDQTtBQUNBLHFDQUFvQyxZQUFZO0FBQ2hEO0FBQ0E7QUFDQTtBQUNBLEtBQUk7O0FBRUo7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0Esa0NBQWlDLFlBQVk7QUFDN0M7QUFDQTtBQUNBLEtBQUk7O0FBRUo7QUFDQTtBQUNBOztBQUVBLEdBQUU7O0FBRUY7O0FBRUEsUUFBTztBQUNQO0FBQ0E7O0FBRUE7O0FBRUE7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQSxRQUFPO0FBQ1A7QUFDQTs7QUFFQTs7QUFFQTs7QUFFQTs7QUFFQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0EsS0FBSTs7QUFFSjtBQUNBO0FBQ0EsS0FBSTs7QUFFSjtBQUNBO0FBQ0E7QUFDQTs7QUFFQSxHQUFFOztBQUVGO0FBQ0Esd0JBQXVCLE9BQU87QUFDOUI7O0FBRUEsUUFBTztBQUNQO0FBQ0E7O0FBRUE7O0FBRUE7O0FBRUE7O0FBRUE7O0FBRUE7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBLGdDQUErQjtBQUMvQixnQ0FBK0I7O0FBRS9CLG9DQUFtQzs7QUFFbkM7QUFDQTtBQUNBLE9BQU07O0FBRU47QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLE9BQU07O0FBRU47QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQSxLQUFJOztBQUVKO0FBQ0E7O0FBRUEsUUFBTztBQUNQO0FBQ0E7O0FBRUE7O0FBRUE7O0FBRUE7O0FBRUE7O0FBRUE7QUFDQTs7QUFFQTtBQUNBLEtBQUk7O0FBRUo7QUFDQTtBQUNBLEtBQUk7O0FBRUo7QUFDQTtBQUNBOztBQUVBLEdBQUU7O0FBRUY7QUFDQSx3QkFBdUIsT0FBTztBQUM5Qjs7QUFFQSxRQUFPO0FBQ1A7QUFDQTs7QUFFQTs7QUFFQTs7QUFFQTs7QUFFQTs7QUFFQTs7QUFFQTs7QUFFQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0EsS0FBSTs7QUFFSjtBQUNBO0FBQ0EsS0FBSTs7QUFFSjtBQUNBO0FBQ0E7QUFDQTtBQUNBLE9BQU07QUFDTjtBQUNBO0FBQ0E7O0FBRUEsR0FBRTs7QUFFRjtBQUNBLG9EQUFtRCxTQUFTO0FBQzVEOztBQUVBLFFBQU87QUFDUDtBQUNBOztBQUVBOztBQUVBOztBQUVBOztBQUVBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQSxLQUFJOztBQUVKO0FBQ0E7QUFDQSxLQUFJOztBQUVKO0FBQ0E7QUFDQTtBQUNBOztBQUVBLEdBQUU7O0FBRUY7QUFDQSx3QkFBdUIsU0FBUztBQUNoQzs7QUFFQSxRQUFPO0FBQ1A7QUFDQTs7QUFFQTs7QUFFQTtBQUNBOztBQUVBOztBQUVBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBLEtBQUk7O0FBRUo7QUFDQTtBQUNBO0FBQ0EsS0FBSTs7QUFFSjtBQUNBO0FBQ0E7QUFDQTs7QUFFQSxHQUFFOztBQUVGO0FBQ0Esd0JBQXVCLFNBQVM7QUFDaEM7O0FBRUEsUUFBTztBQUNQO0FBQ0E7O0FBRUE7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUEsWUFBVztBQUNYOztBQUVBLFFBQU87QUFDUDtBQUNBOztBQUVBOztBQUVBOztBQUVBOztBQUVBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsU0FBUTtBQUNSO0FBQ0E7QUFDQSxLQUFJO0FBQ0o7O0FBRUEsUUFBTztBQUNQO0FBQ0E7O0FBRUE7O0FBRUE7O0FBRUE7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSTs7QUFFSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSTs7QUFFSjtBQUNBO0FBQ0EsS0FBSTs7QUFFSjtBQUNBO0FBQ0E7QUFDQTs7QUFFQSxHQUFFOztBQUVGO0FBQ0E7QUFDQTs7QUFFQSxRQUFPO0FBQ1A7QUFDQTs7QUFFQTs7QUFFQTs7QUFFQTs7QUFFQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFdBQVU7QUFDVjtBQUNBO0FBQ0E7QUFDQSxTQUFRO0FBQ1I7QUFDQTtBQUNBLEtBQUk7QUFDSjs7QUFFQSxRQUFPO0FBQ1A7QUFDQTs7QUFFQTs7QUFFQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUEsbUJBQWtCLGtCQUFrQjtBQUNwQztBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQSxLQUFJO0FBQ0o7QUFDQSxLQUFJO0FBQ0o7O0FBRUEsUUFBTztBQUNQO0FBQ0E7O0FBRUE7O0FBRUE7O0FBRUE7O0FBRUE7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0EsT0FBTTtBQUNOO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFJO0FBQ0o7O0FBRUEsUUFBTztBQUNQO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUk7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBLG9CQUFtQjs7QUFFbkIsUUFBTztBQUNQO0FBQ0E7O0FBRUE7O0FBRUE7O0FBRUE7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQSwwQkFBeUI7QUFDekI7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFFOztBQUVGO0FBQ0E7QUFDQTs7QUFFQSxRQUFPO0FBQ1A7QUFDQTs7QUFFQTs7QUFFQTs7QUFFQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBLDBCQUF5QjtBQUN6Qjs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUU7O0FBRUY7QUFDQTtBQUNBOztBQUVBLFFBQU87QUFDUDtBQUNBOztBQUVBOztBQUVBOztBQUVBOztBQUVBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQSxLQUFJOztBQUVKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSwyQ0FBMEM7QUFDMUM7O0FBRUEsR0FBRTs7QUFFRjtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLHVCQUFzQixTQUFTO0FBQy9COztBQUVBLFFBQU87QUFDUDtBQUNBOztBQUVBOztBQUVBO0FBQ0E7O0FBRUE7O0FBRUE7O0FBRUE7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQSxnQ0FBK0I7QUFDL0IsZ0NBQStCOztBQUUvQjtBQUNBO0FBQ0EsT0FBTTtBQUNOO0FBQ0E7QUFDQSxPQUFNO0FBQ047QUFDQTtBQUNBLE9BQU07O0FBRU47QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsT0FBTTs7QUFFTjtBQUNBO0FBQ0EsT0FBTTtBQUNOO0FBQ0E7QUFDQSxPQUFNOztBQUVOO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQSxvQkFBbUI7O0FBRW5CLFFBQU87QUFDUDtBQUNBOztBQUVBOztBQUVBOztBQUVBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSTs7QUFFSjtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBLEdBQUU7O0FBRUY7QUFDQTtBQUNBOztBQUVBLFFBQU87QUFDUDtBQUNBOztBQUVBOztBQUVBO0FBQ0E7O0FBRUE7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0EsS0FBSTs7QUFFSjtBQUNBOztBQUVBLFFBQU87QUFDUDtBQUNBOztBQUVBOztBQUVBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsS0FBSTtBQUNKO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFNBQVE7QUFDUjtBQUNBO0FBQ0EsT0FBTTtBQUNOLEtBQUk7QUFDSjs7QUFFQSxRQUFPO0FBQ1A7QUFDQTs7QUFFQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsU0FBUTtBQUNSO0FBQ0E7QUFDQSxTQUFRO0FBQ1I7QUFDQTtBQUNBO0FBQ0EsT0FBTTs7QUFFTjtBQUNBO0FBQ0E7QUFDQTtBQUNBLE9BQU07QUFDTjtBQUNBO0FBQ0EsS0FBSTtBQUNKOztBQUVBLFFBQU87QUFDUDtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLEtBQUk7QUFDSjtBQUNBLEtBQUk7QUFDSjtBQUNBO0FBQ0E7O0FBRUEsUUFBTztBQUNQO0FBQ0E7O0FBRUE7O0FBRUE7O0FBRUE7O0FBRUE7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsU0FBUTtBQUNSO0FBQ0EsU0FBUTtBQUNSO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRTs7QUFFRjtBQUNBO0FBQ0E7O0FBRUEsUUFBTztBQUNQO0FBQ0E7O0FBRUE7O0FBRUE7O0FBRUE7QUFDQTs7QUFFQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0EsS0FBSTs7QUFFSjtBQUNBO0FBQ0EsS0FBSTs7QUFFSjtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBLDZDQUE0QyxTQUFTO0FBQ3JEOztBQUVBLFFBQU87QUFDUDtBQUNBOztBQUVBOztBQUVBOztBQUVBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTs7QUFFQTtBQUNBLEtBQUk7O0FBRUo7QUFDQTtBQUNBLEtBQUk7O0FBRUo7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUEsNkNBQTRDLFNBQVM7QUFDckQ7O0FBRUEsUUFBTztBQUNQO0FBQ0E7O0FBRUE7O0FBRUE7O0FBRUE7QUFDQTs7QUFFQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSTs7QUFFSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0EsNkNBQTRDLE9BQU87QUFDbkQ7O0FBRUEsUUFBTztBQUNQO0FBQ0E7O0FBRUE7O0FBRUE7O0FBRUE7QUFDQTs7QUFFQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSTs7QUFFSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0EsNkNBQTRDLE9BQU87QUFDbkQ7O0FBRUEsUUFBTztBQUNQO0FBQ0E7O0FBRUE7O0FBRUE7O0FBRUE7QUFDQTs7QUFFQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0EsS0FBSTs7QUFFSjtBQUNBO0FBQ0EsS0FBSTs7QUFFSjtBQUNBO0FBQ0E7QUFDQTtBQUNBLE9BQU07QUFDTjtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQSw2Q0FBNEMsU0FBUztBQUNyRDs7QUFFQSxRQUFPO0FBQ1A7QUFDQTs7QUFFQTs7QUFFQTs7QUFFQTtBQUNBOztBQUVBOztBQUVBOztBQUVBOztBQUVBO0FBQ0E7QUFDQSxLQUFJOztBQUVKO0FBQ0E7QUFDQSxLQUFJOztBQUVKO0FBQ0E7QUFDQSxLQUFJOztBQUVKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQSxRQUFPO0FBQ1A7QUFDQTs7QUFFQTs7QUFFQTs7QUFFQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQSxLQUFJOztBQUVKO0FBQ0E7QUFDQTtBQUNBLE9BQU07QUFDTjtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTs7QUFFQTtBQUNBLDZDQUE0QyxPQUFPO0FBQ25EOztBQUVBLFFBQU87QUFDUDtBQUNBOztBQUVBOztBQUVBOztBQUVBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTs7QUFFQTtBQUNBLEtBQUk7O0FBRUo7QUFDQTtBQUNBLEtBQUk7O0FBRUo7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUEsNkNBQTRDLFNBQVM7QUFDckQ7O0FBRUEsUUFBTztBQUNQO0FBQ0E7O0FBRUE7O0FBRUE7O0FBRUE7QUFDQTs7QUFFQTs7QUFFQTs7QUFFQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQSxLQUFJOztBQUVKO0FBQ0E7QUFDQTtBQUNBLEtBQUk7O0FBRUo7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQSw2Q0FBNEMsU0FBUztBQUNyRDs7QUFFQSxRQUFPO0FBQ1A7QUFDQTs7QUFFQTs7QUFFQTs7QUFFQTtBQUNBOztBQUVBOztBQUVBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0EsS0FBSTs7QUFFSjtBQUNBO0FBQ0E7QUFDQSxLQUFJOztBQUVKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUEsNkNBQTRDLGtDQUFrQztBQUM5RTs7QUFFQSxRQUFPO0FBQ1A7QUFDQTs7QUFFQTs7QUFFQTs7QUFFQTs7QUFFQTs7QUFFQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSTs7QUFFSjtBQUNBO0FBQ0E7QUFDQSxLQUFJOztBQUVKO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsT0FBTTtBQUNOO0FBQ0E7QUFDQTs7QUFFQSxHQUFFOztBQUVGO0FBQ0E7O0FBRUEsdUJBQXNCLHFCQUFxQjtBQUMzQzs7QUFFQSxRQUFPO0FBQ1A7QUFDQTs7QUFFQTs7QUFFQTs7QUFFQTs7QUFFQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0EsS0FBSTs7QUFFSjtBQUNBO0FBQ0EsS0FBSTs7QUFFSjtBQUNBO0FBQ0E7QUFDQSxxQkFBb0IsZUFBZTtBQUNuQztBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUEsdUJBQXNCLFNBQVM7QUFDL0I7O0FBRUEsUUFBTztBQUNQO0FBQ0E7O0FBRUE7O0FBRUE7O0FBRUE7QUFDQTs7QUFFQTs7QUFFQTs7QUFFQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFNBQVE7QUFDUjtBQUNBO0FBQ0E7QUFDQSxLQUFJOztBQUVKO0FBQ0E7QUFDQTtBQUNBLEtBQUk7O0FBRUo7QUFDQTtBQUNBO0FBQ0EsT0FBTTtBQUNOO0FBQ0E7QUFDQTtBQUNBLEtBQUk7O0FBRUo7QUFDQTtBQUNBO0FBQ0EsT0FBTTtBQUNOO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQSw2Q0FBNEMsYUFBYTtBQUN6RDs7QUFFQSxRQUFPO0FBQ1A7QUFDQTs7QUFFQTs7QUFFQTs7QUFFQTtBQUNBOztBQUVBOztBQUVBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSTs7QUFFSjtBQUNBO0FBQ0E7QUFDQSxLQUFJOztBQUVKO0FBQ0E7QUFDQTtBQUNBLE9BQU07QUFDTjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxTQUFRO0FBQ1I7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUk7O0FBRUo7QUFDQTtBQUNBO0FBQ0EsT0FBTTtBQUNOO0FBQ0E7QUFDQSxTQUFRO0FBQ1I7QUFDQTtBQUNBO0FBQ0EsS0FBSTs7QUFFSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSTs7QUFFSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTs7QUFFQTtBQUNBLHdFQUF1RTs7QUFFdkU7QUFDQTtBQUNBO0FBQ0E7O0FBRUEsNkNBQTRDLG1EQUFtRDtBQUMvRjs7QUFFQSxRQUFPO0FBQ1A7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0EsR0FBRTtBQUNGO0FBQ0E7O0FBRUEsUUFBTztBQUNQO0FBQ0E7O0FBRUE7O0FBRUE7O0FBRUE7QUFDQTs7QUFFQTs7QUFFQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSTs7QUFFSjtBQUNBO0FBQ0E7QUFDQSxLQUFJOztBQUVKO0FBQ0E7QUFDQTtBQUNBLE9BQU07QUFDTjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSTs7QUFFSjtBQUNBO0FBQ0E7QUFDQSxPQUFNO0FBQ047QUFDQTtBQUNBLFNBQVE7QUFDUjtBQUNBO0FBQ0E7QUFDQSxLQUFJOztBQUVKO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsT0FBTTtBQUNOO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQSx3RUFBdUU7O0FBRXZFO0FBQ0E7O0FBRUEsNkNBQTRDLG1DQUFtQztBQUMvRTs7QUFFQSxRQUFPO0FBQ1A7QUFDQTs7QUFFQTs7QUFFQTs7QUFFQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQSxLQUFJOztBQUVKO0FBQ0E7QUFDQSxLQUFJOztBQUVKO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUEsNkNBQTRDLFNBQVM7QUFDckQ7O0FBRUEsUUFBTztBQUNQO0FBQ0E7O0FBRUE7O0FBRUE7O0FBRUE7QUFDQTs7QUFFQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0EsS0FBSTs7QUFFSjtBQUNBO0FBQ0EsS0FBSTs7QUFFSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQSw2Q0FBNEMsU0FBUztBQUNyRDs7QUFFQSxRQUFPO0FBQ1A7QUFDQTs7QUFFQTs7QUFFQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQSxRQUFPO0FBQ1A7QUFDQTs7QUFFQTs7QUFFQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQSxRQUFPO0FBQ1A7QUFDQTs7QUFFQTs7QUFFQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQSxRQUFPO0FBQ1A7QUFDQTs7QUFFQTs7QUFFQTs7QUFFQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQSxLQUFJOztBQUVKO0FBQ0E7QUFDQSxLQUFJOztBQUVKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTs7QUFFQTtBQUNBLDZDQUE0QyxTQUFTO0FBQ3JEOztBQUVBLFFBQU87QUFDUDtBQUNBOztBQUVBOztBQUVBOztBQUVBO0FBQ0E7O0FBRUE7O0FBRUE7O0FBRUE7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLEtBQUk7O0FBRUo7QUFDQTtBQUNBLEtBQUk7O0FBRUo7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQSw2Q0FBNEMscUJBQXFCO0FBQ2pFOztBQUVBLFFBQU87QUFDUDtBQUNBOztBQUVBOztBQUVBOztBQUVBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLEtBQUk7O0FBRUo7QUFDQTtBQUNBLEtBQUk7O0FBRUo7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUk7O0FBRUo7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSTs7QUFFSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQSx3RUFBdUU7O0FBRXZFO0FBQ0E7O0FBRUEsNkNBQTRDLHVDQUF1QztBQUNuRjs7QUFFQSxRQUFPO0FBQ1A7QUFDQTs7QUFFQTs7QUFFQTs7QUFFQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxLQUFJOztBQUVKO0FBQ0E7QUFDQSxLQUFJOztBQUVKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFJOztBQUVKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFJOztBQUVKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0Esd0VBQXVFOztBQUV2RTtBQUNBOztBQUVBLDZDQUE0Qyx1Q0FBdUM7QUFDbkY7O0FBRUEsUUFBTztBQUNQO0FBQ0E7O0FBRUE7O0FBRUE7O0FBRUE7QUFDQTs7QUFFQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSTs7QUFFSjtBQUNBO0FBQ0E7QUFDQSxLQUFJOztBQUVKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFJOztBQUVKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSTs7QUFFSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSTs7QUFFSjtBQUNBLDJDQUEwQztBQUMxQztBQUNBLEtBQUk7O0FBRUo7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLDRDQUEyQztBQUMzQzs7QUFFQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0Esd0VBQXVFOztBQUV2RTtBQUNBOztBQUVBLDZDQUE0QyxtREFBbUQ7QUFDL0Y7O0FBRUEsUUFBTztBQUNQO0FBQ0E7O0FBRUE7O0FBRUE7O0FBRUE7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLE9BQU07O0FBRU47QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0EsS0FBSTs7QUFFSjtBQUNBO0FBQ0EsS0FBSTs7QUFFSjtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUk7O0FBRUo7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQSw2Q0FBNEMseUJBQXlCO0FBQ3JFOztBQUVBLFFBQU87QUFDUDtBQUNBOztBQUVBOztBQUVBOztBQUVBO0FBQ0E7O0FBRUE7O0FBRUE7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0EsS0FBSTs7QUFFSjtBQUNBO0FBQ0E7QUFDQSxLQUFJOztBQUVKO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0EsNkNBQTRDLFNBQVM7QUFDckQ7O0FBRUEsUUFBTztBQUNQO0FBQ0E7O0FBRUE7O0FBRUE7O0FBRUE7O0FBRUE7QUFDQTtBQUNBOztBQUVBOztBQUVBOztBQUVBOztBQUVBO0FBQ0E7O0FBRUE7O0FBRUE7O0FBRUE7O0FBRUE7QUFDQTtBQUNBLG1CQUFrQixtQkFBbUI7QUFDckM7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLE9BQU07QUFDTjs7QUFFQSxtQkFBa0IsMEJBQTBCO0FBQzVDO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQSxxQ0FBb0MsMEJBQTBCO0FBQzlEO0FBQ0E7QUFDQSxxQkFBb0IsdUJBQXVCO0FBQzNDO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFJOztBQUVKO0FBQ0E7QUFDQTtBQUNBLGlCQUFnQixZQUFZO0FBQzVCO0FBQ0E7QUFDQSxLQUFJOztBQUVKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQSxxQkFBb0IsWUFBWTtBQUNoQztBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUk7O0FBRUo7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxXQUFVO0FBQ1Y7QUFDQTtBQUNBO0FBQ0EsT0FBTTtBQUNOOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxhQUFZO0FBQ1o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUk7O0FBRUo7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQSxHQUFFOztBQUVGO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBLFFBQU87QUFDUDtBQUNBOztBQUVBOztBQUVBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTs7QUFFQTs7QUFFQTtBQUNBOztBQUVBOztBQUVBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQSxLQUFJO0FBQ0o7QUFDQTtBQUNBLEtBQUk7O0FBRUo7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsT0FBTTtBQUNOOztBQUVBLG1CQUFrQiwwQkFBMEI7QUFDNUM7QUFDQTtBQUNBOztBQUVBOztBQUVBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQSxxQkFBb0IsNEJBQTRCO0FBQ2hEO0FBQ0E7QUFDQSxLQUFJOztBQUVKO0FBQ0EscUJBQW9CLDBCQUEwQjtBQUM5QztBQUNBO0FBQ0EsS0FBSTs7QUFFSjtBQUNBO0FBQ0EscUJBQW9CLDBCQUEwQjtBQUM5QztBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUk7O0FBRUo7QUFDQSxxQkFBb0IsMEJBQTBCO0FBQzlDO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFJOztBQUVKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSTs7QUFFSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQSxHQUFFOztBQUVGO0FBQ0E7QUFDQTs7QUFFQSxRQUFPO0FBQ1A7QUFDQTs7QUFFQTs7QUFFQTs7QUFFQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQSxHQUFFOztBQUVGO0FBQ0E7QUFDQTs7QUFFQSxRQUFPO0FBQ1A7QUFDQTs7QUFFQTs7QUFFQTs7QUFFQTs7QUFFQTtBQUNBOztBQUVBOztBQUVBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQSx1RUFBc0U7O0FBRXRFO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLE9BQU07QUFDTjtBQUNBO0FBQ0EsU0FBUTtBQUNSO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSTs7QUFFSjtBQUNBOztBQUVBO0FBQ0E7QUFDQSxPQUFNO0FBQ04sS0FBSTs7QUFFSjtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUk7O0FBRUo7QUFDQTtBQUNBLEtBQUk7O0FBRUo7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQSxzREFBcUQsV0FBVyxVQUFVO0FBQzFFO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLE9BQU07QUFDTjtBQUNBO0FBQ0EsS0FBSTs7QUFFSjtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLCtCQUE4QiwyQkFBMkI7QUFDekQ7QUFDQSxLQUFJOztBQUVKO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFJOztBQUVKO0FBQ0E7O0FBRUE7QUFDQTtBQUNBLE9BQU07QUFDTjtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUk7O0FBRUo7QUFDQTtBQUNBO0FBQ0EsT0FBTTtBQUNOO0FBQ0E7QUFDQSxLQUFJOztBQUVKO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSTs7QUFFSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxTQUFRO0FBQ1I7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFJOztBQUVKO0FBQ0E7QUFDQSxLQUFJOztBQUVKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFJOztBQUVKO0FBQ0EsaURBQWdELG9DQUFvQztBQUNwRjtBQUNBO0FBQ0EsS0FBSTs7QUFFSjtBQUNBLGlEQUFnRCxvQkFBb0I7QUFDcEU7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUk7O0FBRUo7QUFDQTtBQUNBLEtBQUk7O0FBRUosb0NBQW1DOztBQUVuQztBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQSxHQUFFOztBQUVGOztBQUVBLFFBQU87QUFDUDtBQUNBOztBQUVBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLEtBQUk7QUFDSjs7QUFFQSxRQUFPO0FBQ1A7QUFDQTs7QUFFQTs7QUFFQTs7QUFFQTs7QUFFQTs7QUFFQTs7QUFFQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLE9BQU07QUFDTjtBQUNBO0FBQ0EsS0FBSTs7QUFFSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsV0FBVTtBQUNWO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFJOztBQUVKO0FBQ0E7QUFDQTtBQUNBLE9BQU07QUFDTjtBQUNBO0FBQ0EsS0FBSTs7QUFFSjtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUk7O0FBRUo7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBLEdBQUU7O0FBRUY7QUFDQTtBQUNBOztBQUVBLFFBQU87QUFDUDtBQUNBOztBQUVBOztBQUVBOztBQUVBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxLQUFJOztBQUVKO0FBQ0E7QUFDQTtBQUNBOztBQUVBLEdBQUU7O0FBRUY7O0FBRUEsUUFBTztBQUNQO0FBQ0E7O0FBRUE7O0FBRUE7O0FBRUE7QUFDQTtBQUNBOztBQUVBOztBQUVBOztBQUVBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFJOztBQUVKO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSTs7QUFFSjs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLFNBQVE7QUFDUjtBQUNBO0FBQ0E7QUFDQSxLQUFJOztBQUVKO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSTs7QUFFSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUEsR0FBRTs7QUFFRjs7QUFFQSxRQUFPO0FBQ1A7QUFDQTs7QUFFQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7O0FBRUE7O0FBRUE7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsU0FBUTtBQUNSO0FBQ0E7QUFDQTtBQUNBOztBQUVBLEdBQUU7O0FBRUY7O0FBRUEsUUFBTztBQUNQO0FBQ0E7O0FBRUE7O0FBRUE7O0FBRUE7QUFDQTs7QUFFQTs7QUFFQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUk7O0FBRUo7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQSxRQUFPO0FBQ1A7QUFDQTs7QUFFQTs7QUFFQTtBQUNBOztBQUVBOztBQUVBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQSxnQ0FBK0I7QUFDL0IsZ0NBQStCOztBQUUvQjtBQUNBO0FBQ0EsT0FBTTtBQUNOO0FBQ0E7QUFDQSxPQUFNO0FBQ047QUFDQTtBQUNBLE9BQU07O0FBRU47QUFDQTtBQUNBLE9BQU07QUFDTjtBQUNBO0FBQ0EsT0FBTTtBQUNOLDREQUEyRDs7QUFFM0Q7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsT0FBTTtBQUNOO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsT0FBTTs7QUFFTjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxPQUFNOztBQUVOO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsT0FBTTtBQUNOO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxPQUFNOztBQUVOO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQSxvQkFBbUI7O0FBRW5CLFFBQU87QUFDUDtBQUNBOztBQUVBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxLQUFJO0FBQ0o7QUFDQTs7QUFFQSxRQUFPO0FBQ1A7QUFDQTs7QUFFQTs7QUFFQTs7QUFFQTtBQUNBOztBQUVBOztBQUVBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSTs7QUFFSjtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBLFFBQU87QUFDUDtBQUNBOztBQUVBOztBQUVBOztBQUVBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBLFFBQU87QUFDUDtBQUNBOztBQUVBOztBQUVBOztBQUVBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQSx5RUFBd0U7O0FBRXhFO0FBQ0E7O0FBRUE7QUFDQTtBQUNBLEtBQUk7O0FBRUo7QUFDQTtBQUNBLEtBQUk7O0FBRUo7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUk7O0FBRUo7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUk7O0FBRUo7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUk7O0FBRUo7QUFDQTtBQUNBLEtBQUk7O0FBRUo7QUFDQTtBQUNBLEtBQUk7O0FBRUo7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQSxRQUFPO0FBQ1A7QUFDQTs7QUFFQTs7QUFFQTs7QUFFQTtBQUNBOztBQUVBOztBQUVBOztBQUVBOztBQUVBO0FBQ0EseUVBQXdFOztBQUV4RTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxLQUFJOztBQUVKO0FBQ0E7QUFDQSxLQUFJOztBQUVKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFJOztBQUVKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFJOztBQUVKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFJOztBQUVKO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSTs7QUFFSjtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUEsUUFBTztB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Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFFO0FBQ0Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFFO0FBQ0Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFJO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsRzs7Ozs7O0FDMUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRTtBQUNGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRTtBQUNGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsRzs7Ozs7O0FDbkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRTtBQUNGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRTtBQUNGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHOzs7Ozs7QUNwQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSTtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUU7QUFDRjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUk7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSTtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUk7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFJO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSTtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUk7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFJO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSTtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUk7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSTtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUk7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFJO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSTtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUk7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFJO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUU7QUFDRjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsRzs7Ozs7O0FDNU1BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRTtBQUNGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRTtBQUNGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsRzs7Ozs7O0FDbkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEc7Ozs7OztBQ2ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUk7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUk7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUk7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFFO0FBQ0Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFFO0FBQ0Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUk7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUk7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFJO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUU7QUFDRjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUU7QUFDRjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFFO0FBQ0Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUk7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUk7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUk7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEc7Ozs7OztBQzdKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFJO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFJO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRTtBQUNGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRTtBQUNGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFJO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSTtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFFO0FBQ0Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFFO0FBQ0Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRTtBQUNGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFJO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFJO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHOzs7Ozs7QUMvSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFFO0FBQ0Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSTtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFFO0FBQ0Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUU7QUFDRjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRTtBQUNGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFFO0FBQ0Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUU7QUFDRjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRTtBQUNGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUk7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSTtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUk7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFJO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSTtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUk7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRTtBQUNGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRTtBQUNGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSTtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFFO0FBQ0Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFJO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsRzs7Ozs7O0FDOVBBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUk7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUk7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFFO0FBQ0Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFFO0FBQ0Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUk7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUk7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFJO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUU7QUFDRjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUU7QUFDRjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFFO0FBQ0Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUk7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEc7Ozs7OztBQy9IQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsRzs7Ozs7O0FDZEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUk7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRTtBQUNGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRTtBQUNGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSTtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFFO0FBQ0Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFFO0FBQ0Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUk7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEc7Ozs7OztBQ3JGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUk7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRTtBQUNGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFFO0FBQ0Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUU7QUFDRjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRTtBQUNGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFFO0FBQ0Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUU7QUFDRjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRTtBQUNGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFFO0FBQ0Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUU7QUFDRjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRTtBQUNGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFFO0FBQ0Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUU7QUFDRjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRTtBQUNGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUk7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSTtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFJO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUk7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSTtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFJO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUk7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSTtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFJO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUk7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSTtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFJO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFFO0FBQ0Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFJO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSTtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUU7QUFDRjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUU7QUFDRjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEc7Ozs7OztBQzFnQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsRzs7Ozs7O0FDVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFFO0FBQ0Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRTtBQUNGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsRzs7Ozs7O0FDeENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRTtBQUNGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUU7QUFDRjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFFO0FBQ0Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRTtBQUNGO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRTtBQUNGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSTtBQUNKO0FBQ0E7QUFDQTtBQUNBLEtBQUk7QUFDSjtBQUNBO0FBQ0E7QUFDQSxLQUFJO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSTtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFFO0FBQ0Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFJO0FBQ0o7QUFDQTtBQUNBO0FBQ0EsS0FBSTtBQUNKO0FBQ0E7QUFDQTtBQUNBLEtBQUk7QUFDSjtBQUNBO0FBQ0E7QUFDQSxLQUFJO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUU7QUFDRjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsRzs7Ozs7O0FDekhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRTtBQUNGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRTtBQUNGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsRzs7Ozs7O0FDbkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRTtBQUNGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRTtBQUNGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsRzs7Ozs7O0FDbkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRTtBQUNGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRTtBQUNGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsRzs7Ozs7O0FDbkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRTtBQUNGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRTtBQUNGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRTtBQUNGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHOzs7Ozs7QUNsREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFFO0FBQ0Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFFO0FBQ0Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHOzs7Ozs7QUNuQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFFO0FBQ0Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFFO0FBQ0Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHOzs7Ozs7QUNuQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFFO0FBQ0Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFFO0FBQ0Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHOzs7Ozs7QUNuQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSTtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUU7QUFDRjtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUU7QUFDRjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUU7QUFDRjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUU7QUFDRjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSTtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsRzs7Ozs7O0FDcEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRTtBQUNGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSTtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFFO0FBQ0Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFFO0FBQ0Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFJO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUU7QUFDRjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUk7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHOzs7Ozs7QUNsRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEc7Ozs7OztBQ2RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRTtBQUNGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRTtBQUNGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsRzs7Ozs7O0FDbkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHOzs7Ozs7QUNkQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUU7QUFDRjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUU7QUFDRjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEciLCJmaWxlIjoiYnVpbGQuanMiLCJzb3VyY2VzQ29udGVudCI6WyIgXHQvLyBUaGUgbW9kdWxlIGNhY2hlXG4gXHR2YXIgaW5zdGFsbGVkTW9kdWxlcyA9IHt9O1xuXG4gXHQvLyBUaGUgcmVxdWlyZSBmdW5jdGlvblxuIFx0ZnVuY3Rpb24gX193ZWJwYWNrX3JlcXVpcmVfXyhtb2R1bGVJZCkge1xuXG4gXHRcdC8vIENoZWNrIGlmIG1vZHVsZSBpcyBpbiBjYWNoZVxuIFx0XHRpZihpbnN0YWxsZWRNb2R1bGVzW21vZHVsZUlkXSlcbiBcdFx0XHRyZXR1cm4gaW5zdGFsbGVkTW9kdWxlc1ttb2R1bGVJZF0uZXhwb3J0cztcblxuIFx0XHQvLyBDcmVhdGUgYSBuZXcgbW9kdWxlIChhbmQgcHV0IGl0IGludG8gdGhlIGNhY2hlKVxuIFx0XHR2YXIgbW9kdWxlID0gaW5zdGFsbGVkTW9kdWxlc1ttb2R1bGVJZF0gPSB7XG4gXHRcdFx0ZXhwb3J0czoge30sXG4gXHRcdFx0aWQ6IG1vZHVsZUlkLFxuIFx0XHRcdGxvYWRlZDogZmFsc2VcbiBcdFx0fTtcblxuIFx0XHQvLyBFeGVjdXRlIHRoZSBtb2R1bGUgZnVuY3Rpb25cbiBcdFx0bW9kdWxlc1ttb2R1bGVJZF0uY2FsbChtb2R1bGUuZXhwb3J0cywgbW9kdWxlLCBtb2R1bGUuZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXyk7XG5cbiBcdFx0Ly8gRmxhZyB0aGUgbW9kdWxlIGFzIGxvYWRlZFxuIFx0XHRtb2R1bGUubG9hZGVkID0gdHJ1ZTtcblxuIFx0XHQvLyBSZXR1cm4gdGhlIGV4cG9ydHMgb2YgdGhlIG1vZHVsZVxuIFx0XHRyZXR1cm4gbW9kdWxlLmV4cG9ydHM7XG4gXHR9XG5cblxuIFx0Ly8gZXhwb3NlIHRoZSBtb2R1bGVzIG9iamVjdCAoX193ZWJwYWNrX21vZHVsZXNfXylcbiBcdF9fd2VicGFja19yZXF1aXJlX18ubSA9IG1vZHVsZXM7XG5cbiBcdC8vIGV4cG9zZSB0aGUgbW9kdWxlIGNhY2hlXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLmMgPSBpbnN0YWxsZWRNb2R1bGVzO1xuXG4gXHQvLyBfX3dlYnBhY2tfcHVibGljX3BhdGhfX1xuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5wID0gXCJcIjtcblxuIFx0Ly8gTG9hZCBlbnRyeSBtb2R1bGUgYW5kIHJldHVybiBleHBvcnRzXG4gXHRyZXR1cm4gX193ZWJwYWNrX3JlcXVpcmVfXygwKTtcblxuXG5cbi8qKiBXRUJQQUNLIEZPT1RFUiAqKlxuICoqIHdlYnBhY2svYm9vdHN0cmFwIDU3MGNmMTAwYjc1ODg0YjgzZDExXG4gKiovIiwicmVxdWlyZSgnLi4vc2NlbmUtbWFrZXIvaW5kZXguanMnKTtcblxuXG5cbi8qKioqKioqKioqKioqKioqKlxuICoqIFdFQlBBQ0sgRk9PVEVSXG4gKiogLi9qcy9lbnRyeS5qc1xuICoqIG1vZHVsZSBpZCA9IDBcbiAqKiBtb2R1bGUgY2h1bmtzID0gMFxuICoqLyIsIid1c2Ugc3RyaWN0JztcblxuY29uc3Qgb2JzY2VuZSA9IHJlcXVpcmUoJy4vb2Itc2NlbmUuanMnKTtcbmNvbnN0IGNvbnRyb2xzID0gcmVxdWlyZSgnLi91c2VyL2NvbnRyb2xzLmpzJyk7XG5jb25zdCByZW5kZXIgPSByZXF1aXJlKCcuL3JlbmRlci9pbmRleC5qcycpO1xuXG5jb25zdCBzY2VuZVV0aWxzID0gcmVxdWlyZSgnLi91dGlscy9zY2VuZS11dGlscy5qcycpO1xuY29uc3QgYXVkaW9wbGF5ZXIgPSByZXF1aXJlKCcuL3JlbmRlci9hdWRpb3BsYXllci5qcycpO1xuXG5jb25zdCBzY2VuZUh0bWxTdHJpbmcgPSBzY2VuZVV0aWxzLnJlbmRlckhUTUwoKTtcbmNvbnN0IHNjZW5lTW90aW9uTWFwID0gc2NlbmVVdGlscy5nZXRTY2VuZXMoKTtcbmxldCBzY2VuZUF1ZGlvQ29uZmlnID0gIHNjZW5lVXRpbHMuZ2V0QXVkaW9Db25maWcoKTtcblxuYXVkaW9wbGF5ZXIuY29uZmlnKHNjZW5lQXVkaW9Db25maWcpO1xuXG4kKGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIHVhID0gbmF2aWdhdG9yLnVzZXJBZ2VudDtcbiAgICAgIC8vIGlmICgvQW5kcm9pZHx3ZWJPU3xpUGhvbmV8aVBhZHxpUG9kfEJsYWNrQmVycnl8SUVNb2JpbGV8T3BlcmEgTWluaXxNb2JpbGV8bW9iaWxlL2kudGVzdCh1YSkpXG4gICAgICAgIC8vICAkKCcjdW5zdXBwb3J0ZWQnKS5zaG93KCk7XG4gICAgICAvLyBlbHNlIGlmICgvQ2hyb21lL2kudGVzdCh1YSkpXG4gICAgICAgIGluaXQoKTtcbiAgICAgIC8vIGVsc2VcbiAgICAgICAgLy8gICQoJyN1bnN1cHBvcnRlZCcpLnNob3coKTtcbn0pO1xuXG5mdW5jdGlvbiBpbml0KCkge1xuXG4gIFBhY2Uub24oJ2RvbmUnLCAoZSkgPT4ge1xuXG4gICAgJCgnLmNvbnRhaW5lci1pbm5lcicpLmh0bWwoc2NlbmVIdG1sU3RyaW5nKVxuXG4gICAgb2JzY2VuZS5pbml0KHNjZW5lTW90aW9uTWFwKVxuICAgIGNvbnRyb2xzLmluaXQoKVxuXG4gICAgJCgnLmxvYWRpbmcnKS5kZWxheSgzMDApLmZhZGVPdXQoKVxuICAgIGF1ZGlvcGxheWVyLm5leHQoJ2ludHJvJyk7XG4gICAgYXVkaW9wbGF5ZXIucGxheSgpO1xuXG4gIH0pXG5cbn1cblxuXG5cbi8qKiBXRUJQQUNLIEZPT1RFUiAqKlxuICoqIC4vc2NlbmUtbWFrZXIvaW5kZXguanNcbiAqKi8iLCIvKlxuICogIERlcGVuZGVuY2llc1xuKi9cblxuICBjb25zdCBLZWZpciA9IHJlcXVpcmUoJ2tlZmlyJylcblxuICBjb25zdCBhdWRpb3BsYXllciA9IHJlcXVpcmUoJy4vcmVuZGVyL2F1ZGlvcGxheWVyLmpzJylcbiAgY29uc3QgdmlkZW9QbGF5ZXIgPSByZXF1aXJlKCcuL3JlbmRlci92aWRlb3BsYXllci5qcycpXG5cbiAgY29uc3QgcGFnZVV0aWxzID0gcmVxdWlyZSgnLi91dGlscy9wYWdlLXV0aWxzLmpzJylcblxuLypcbiAqICBHbG9iYWxzXG4qL1xuXG4gIGNvbnN0IFBST1BFUlRJRVMgPSBbJ3RyYW5zbGF0ZVgnLCAndHJhbnNsYXRlWScsICdvcGFjaXR5JywgJ3JvdGF0ZScsICdzY2FsZSddXG4gIGNvbnN0IEFOSU1BVElPTl9USU1FID0gNDFcblxuICBjb25zdCAkd2luZG93ID0gJCh3aW5kb3cpXG4gIGNvbnN0ICRib2R5aHRtbCA9ICQoJ2JvZHksaHRtbCcpXG5cbi8qXG4gKiAgSW5pdGlhbGl6ZVxuKi9cblxuICBjb25zdCBzdGF0ZUluaXRpYWxpemVkID0gbmV3IEtlZmlyLnBvb2woKVxuXG4gIGNvbnN0IElOSVRfU1RBVEUgPSB7XG4gICAgd3JhcHBlcnM6IFtdLFxuICAgIGN1cnJlbnRXcmFwcGVyOiBudWxsLFxuXG4gICAgc2Nyb2xsVG9wOiAkd2luZG93LnNjcm9sbFRvcCgpLFxuICAgIHJlbGF0aXZlU2Nyb2xsVG9wOiAwLFxuXG4gICAga2V5ZnJhbWVzOiB1bmRlZmluZWQsXG4gICAgcHJldktleWZyYW1lc0R1cmF0aW9uczogMCxcbiAgICBjdXJyZW50S2V5ZnJhbWU6IDAsXG5cbiAgICBmcmFtZUZvY3VzOiBbXSxcbiAgICBjdXJyZW50Rm9jdXM6IDAsXG4gICAgY3VycmVudEZyYW1lOiBbMF0sXG5cbiAgICBzY3JvbGxUaW1lb3V0SUQ6IDAsXG5cbiAgICBib2R5SGVpZ2h0OiAwLFxuICAgIHdpbmRvd0hlaWdodDogMCxcbiAgICB3aW5kb3dXaWR0aDogMFxuICB9XG5cbiAgY29uc3QgaW5pdFN0YXRlID0gS2VmaXIuc3RyZWFtKGVtaXR0ZXIgPT4ge1xuICAgIGVtaXR0ZXIuZW1pdChJTklUX1NUQVRFKVxuICB9KVxuXG4gIG1vZHVsZS5leHBvcnRzLmluaXQgPSAoa2V5ZnJhbWVzKSA9PiB7XG5cbiAgICBjb25zdCBrZXlGcmFtZXNSZXRyZWl2ZWQgPSBLZWZpci5zdHJlYW0oZW1pdHRlciA9PiB7XG4gICAgICBlbWl0dGVyLmVtaXQoa2V5ZnJhbWVzKVxuICAgIH0pXG5cbiAgICBjb25zdCBrZXlGcmFtZXNNYXBwZWRUb1N0YXRlID0ga2V5RnJhbWVzUmV0cmVpdmVkXG4gICAgICAuZmxhdE1hcChrZXlmcmFtZXMgPT4ge1xuICAgICAgICByZXR1cm4gaW5pdFN0YXRlLm1hcChzdGF0ZSA9PiB7XG4gICAgICAgICAgc3RhdGUua2V5ZnJhbWVzID0ga2V5ZnJhbWVzXG4gICAgICAgICAgcmV0dXJuIHN0YXRlXG4gICAgICAgIH0pXG4gICAgICB9KVxuICAgICAgLm1hcChzdGF0ZSA9PiB7XG4gICAgICAgIHN0YXRlLmN1cnJlbnRXcmFwcGVyID0gc3RhdGUud3JhcHBlcnNbMF1cbiAgICAgICAgc3RhdGUuc2Nyb2xsVG9wID0gMFxuICAgICAgICByZXR1cm4gc3RhdGVcbiAgICAgIH0pXG5cbiAgICBzdGF0ZUluaXRpYWxpemVkLnBsdWcoa2V5RnJhbWVzTWFwcGVkVG9TdGF0ZSlcblxuICB9XG5cbi8qXG4gKiAgQnVpbGQgUGFnZVxuKi9cblxuICBjb25zdCB3aW5kb3dSZXNpemVkID0gc3RhdGVJbml0aWFsaXplZFxuICAgIC5mbGF0TWFwKChzKSA9PiB7XG4gICAgICByZXR1cm4gS2VmaXIuZnJvbUV2ZW50cygkd2luZG93LCAncmVzaXplJywgKCkgPT4ge3JldHVybiBzfSApXG4gICAgfSlcbiAgICAudGhyb3R0bGUoQU5JTUFUSU9OX1RJTUUpXG5cbiAgY29uc3QgZGltZW5zaW9uc0NhbGN1bGF0ZWQgPSBLZWZpci5tZXJnZShbc3RhdGVJbml0aWFsaXplZCwgd2luZG93UmVzaXplZF0pXG4gICAgLm1hcChjYWxjdWxhdGVEaW1lbnNpb25zKVxuICAgIC5tYXAoY2FsY3VsYXRlS2V5RnJhbWVzKVxuICAgIC5tYXAoY2FsY3VsYXRlRXh0cmFzKVxuICAgIC5tYXAoc3RhdGUgPT4ge1xuICAgICAgc3RhdGUuY3VycmVudFdyYXBwZXIgPSBzdGF0ZS53cmFwcGVyc1swXVxuICAgICAgcmV0dXJuIHN0YXRlXG4gICAgfSlcblxuICAgICAgZnVuY3Rpb24gY2FsY3VsYXRlRGltZW5zaW9ucyhzdGF0ZSkge1xuICAgICAgICBzdGF0ZS5zY3JvbGxUb3AgPSBNYXRoLmZsb29yKCR3aW5kb3cuc2Nyb2xsVG9wKCkpXG4gICAgICAgIHN0YXRlLndpbmRvd0hlaWdodCA9ICR3aW5kb3cuaGVpZ2h0KClcbiAgICAgICAgc3RhdGUud2luZG93V2lkdGggPSAkd2luZG93LndpZHRoKClcbiAgICAgICAgcmV0dXJuIHN0YXRlXG4gICAgICB9XG5cbiAgICAgIGZ1bmN0aW9uIGNhbGN1bGF0ZUtleUZyYW1lcyhzdGF0ZSkge1xuICAgICAgICBzdGF0ZS5rZXlmcmFtZXMgPSBwYWdlVXRpbHMuY29udmVydEFsbFByb3BzVG9QeChzdGF0ZS5rZXlmcmFtZXMsIHN0YXRlLndpbmRvd1dpZHRoLCBzdGF0ZS53aW5kb3dIZWlnaHQpXG4gICAgICAgIHJldHVybiBzdGF0ZVxuICAgICAgfVxuXG4gICAgICBmdW5jdGlvbiBjYWxjdWxhdGVFeHRyYXMoc3RhdGUpIHtcbiAgICAgICAgbGV0IHBhZ2VJbmZvID0gcGFnZVV0aWxzLmJ1aWxkUGFnZShzdGF0ZS5rZXlmcmFtZXMsIHN0YXRlLndyYXBwZXJzKVxuXG4gICAgICAgIHN0YXRlLmJvZHlIZWlnaHQgPSBwYWdlSW5mby5ib2R5SGVpZ2h0XG4gICAgICAgIHN0YXRlLndyYXBwZXJzID0gcGFnZUluZm8ud3JhcHBlcnNcbiAgICAgICAgc3RhdGUuZnJhbWVGb2N1cyA9IHBhZ2VJbmZvLmZyYW1lRm9jdXNcbiAgICAgICAgICAubWFwKGkgPT4gTWF0aC5mbG9vcihpKSlcbiAgICAgICAgICAucmVkdWNlKChhLCBiKSA9PiB7IC8vIGNsZWFycyBhbnkgZnJhbWUgZHVwbGljYXRlcy4gVE9ETzogZmluZCBidWcgdGhhdCBtYWtlcyBmcmFtZSBkdXBsaWNhdGVzXG4gICAgICAgICAgICBpZiAoYS5pbmRleE9mKGIpIDwgMCkgYS5wdXNoKGIpXG4gICAgICAgICAgICByZXR1cm4gYVxuICAgICAgICAgIH0sIFtdKVxuXG4gICAgICAgIHJldHVybiBzdGF0ZVxuICAgICAgfVxuXG4gIG1vZHVsZS5leHBvcnRzLmRpbWVuc2lvbnNDYWxjdWxhdGVkID0gZGltZW5zaW9uc0NhbGN1bGF0ZWRcblxuLypcbiAqICBQb3NpdGlvbiBtb3ZlZFxuKi9cblxuICBjb25zdCB3aW5kb3dTY3JvbGxlZCA9IEtlZmlyLmZyb21FdmVudHMoJHdpbmRvdywgJ3Njcm9sbCcpXG4gICAgLnRocm90dGxlKEFOSU1BVElPTl9USU1FKVxuXG4gIGNvbnN0IHNvbWV0aGluZ01vdmVkID0gS2VmaXIuZnJvbUV2ZW50cyh3aW5kb3csICdQT1NJVElPTl9DSEFOR0VEJylcblxuICBjb25zdCBldmVudHNIYXBwZW5lZCA9IGRpbWVuc2lvbnNDYWxjdWxhdGVkXG4gICAgLmZsYXRNYXAoc3RhdGUgPT4ge1xuICAgICAgcmV0dXJuIEtlZmlyLm1lcmdlKFt3aW5kb3dTY3JvbGxlZCwgc29tZXRoaW5nTW92ZWRdKVxuICAgICAgICAgICAgICAubWFwKGUgPT4ge1xuICAgICAgICAgICAgICAgIHN0YXRlLmNoYW5nZWQgPSBlXG4gICAgICAgICAgICAgICAgcmV0dXJuIHN0YXRlXG4gICAgICAgICAgICAgIH0pXG4gICAgfSlcblxuICBjb25zdCBwb3NpdGlvbkNoYW5nZWQgPSBLZWZpclxuICAgIC5tZXJnZShbZGltZW5zaW9uc0NhbGN1bGF0ZWQsIGV2ZW50c0hhcHBlbmVkXSlcblxuLypcbiAqICBTdGF0ZSBDaGFuZ2VkXG4qL1xuXG4gIC8vIENhbGN1bGF0ZSBjdXJyZW50IHN0YXRlXG4gIGNvbnN0IGNhbGN1bGF0ZWRDdXJyZW50U3RhdGUgPSBLZWZpclxuICAgIC5tZXJnZShbZGltZW5zaW9uc0NhbGN1bGF0ZWQsIHBvc2l0aW9uQ2hhbmdlZF0pXG4gICAgLm1hcChzZXRUb3BzKVxuICAgIC5tYXAoc2V0S2V5ZnJhbWUpXG4gICAgLm1hcChnZXRTbGlkZUxvY2F0aW9uKVxuICAgIC5tYXAoc3RhdGUgPT4ge1xuICAgICAgc3RhdGUuY3VycmVudFdyYXBwZXIgPSBzdGF0ZS5rZXlmcmFtZXNbc3RhdGUuY3VycmVudEtleWZyYW1lXS53cmFwcGVyXG4gICAgICByZXR1cm4gc3RhdGVcbiAgICB9KVxuXG4gICAgICBmdW5jdGlvbiBzZXRUb3BzKHN0YXRlKSB7XG4gICAgICAgIHN0YXRlLnNjcm9sbFRvcCA9IE1hdGguZmxvb3IoJHdpbmRvdy5zY3JvbGxUb3AoKSlcbiAgICAgICAgc3RhdGUucmVsYXRpdmVTY3JvbGxUb3AgPSBzdGF0ZS5zY3JvbGxUb3AgLSBzdGF0ZS5wcmV2S2V5ZnJhbWVzRHVyYXRpb25zXG4gICAgICAgIHJldHVybiBzdGF0ZVxuICAgICAgfVxuXG4gICAgICBmdW5jdGlvbiBzZXRLZXlmcmFtZShzdGF0ZSkge1xuICAgICAgICBpZihzdGF0ZS5zY3JvbGxUb3AgPiAoc3RhdGUua2V5ZnJhbWVzW3N0YXRlLmN1cnJlbnRLZXlmcmFtZV0uZHVyYXRpb24gKyBzdGF0ZS5wcmV2S2V5ZnJhbWVzRHVyYXRpb25zKSkge1xuICAgICAgICAgICAgc3RhdGUucHJldktleWZyYW1lc0R1cmF0aW9ucyArPSBzdGF0ZS5rZXlmcmFtZXNbc3RhdGUuY3VycmVudEtleWZyYW1lXS5kdXJhdGlvblxuICAgICAgICAgICAgc3RhdGUuY3VycmVudEtleWZyYW1lKytcbiAgICAgICAgfSBlbHNlIGlmKHN0YXRlLnNjcm9sbFRvcCA8IHN0YXRlLnByZXZLZXlmcmFtZXNEdXJhdGlvbnMpIHtcbiAgICAgICAgICAgIHN0YXRlLmN1cnJlbnRLZXlmcmFtZS0tXG4gICAgICAgICAgICBzdGF0ZS5wcmV2S2V5ZnJhbWVzRHVyYXRpb25zIC09IHN0YXRlLmtleWZyYW1lc1tzdGF0ZS5jdXJyZW50S2V5ZnJhbWVdLmR1cmF0aW9uXG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHN0YXRlXG4gICAgICB9XG5cbiAgICAgIGZ1bmN0aW9uIGdldFNsaWRlTG9jYXRpb24oc3RhdGUpIHtcbiAgICAgICAgZm9yIChsZXQgeCA9IDE7IHggPD0gc3RhdGUuZnJhbWVGb2N1cy5sZW5ndGg7IHgrKykge1xuICAgICAgICAgIGlmIChzdGF0ZS5mcmFtZUZvY3VzW3hdID09PSBzdGF0ZS5zY3JvbGxUb3ApIHtcbiAgICAgICAgICAgIHN0YXRlLmN1cnJlbnRGcmFtZSA9IFt4XVxuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoc3RhdGUuc2Nyb2xsVG9wLmJldHdlZW4oc3RhdGUuZnJhbWVGb2N1c1t4IC0gMV0sIHN0YXRlLmZyYW1lRm9jdXNbeF0pKSB7XG4gICAgICAgICAgICBzdGF0ZS5jdXJyZW50RnJhbWUgPSBbeCAtIDEsIHhdXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzdGF0ZVxuICAgICAgfVxuXG4gIGNvbnN0IHdyYXBwZXJDaGFuZ2VkID0gY2FsY3VsYXRlZEN1cnJlbnRTdGF0ZVxuICAgIC5tYXAoc3RhdGUgPT4gc3RhdGUuY3VycmVudFdyYXBwZXIpXG4gICAgLmRpZmYobnVsbCwgJycpXG4gICAgLmZpbHRlcihjdXJyZW50V3JhcHBlciA9PiBjdXJyZW50V3JhcHBlclswXSAhPT0gY3VycmVudFdyYXBwZXJbMV0pXG4gICAgLy8gLmRlbGF5KEFOSU1BVElPTl9USU1FKjIpIC8vIFRvIHdhaXQgZm9yIGZpcnN0IGFuaW1hdGlvbiBmcmFtZSB0byBzdGFydCBiZWZvcmUgc3dpdGNoaW5nXG5cbiAgbW9kdWxlLmV4cG9ydHMud3JhcHBlckNoYW5nZWQgPSB3cmFwcGVyQ2hhbmdlZDtcblxuICBjb25zdCBzY3JvbGxUb3BDaGFuZ2VkID0gY2FsY3VsYXRlZEN1cnJlbnRTdGF0ZVxuICAgIC5kaWZmKG51bGwgLCB7IC8vIEhhY2ssIGZvciBzb21lIHJlYXNvbiBJTklUX1NUQVRFIGlzbid0IGNvbWluZyBpbiBwcm9wZXJseVxuICAgICAgd3JhcHBlcnM6IFtdLFxuICAgICAgY3VycmVudFdyYXBwZXI6IHVuZGVmaW5lZCxcblxuICAgICAgc2Nyb2xsVG9wOiAwLFxuICAgICAgcmVsYXRpdmVTY3JvbGxUb3A6IDAsXG5cbiAgICAgIGtleWZyYW1lczogdW5kZWZpbmVkLFxuICAgICAgcHJldktleWZyYW1lc0R1cmF0aW9uczogMCxcbiAgICAgIGN1cnJlbnRLZXlmcmFtZTogMCxcblxuICAgICAgZnJhbWVGb2N1czogW10sXG4gICAgICBjdXJyZW50Rm9jdXM6IDAsXG4gICAgICBjdXJyZW50SW50ZXJ2YWw6IDAsXG5cbiAgICAgIHNjcm9sbFRpbWVvdXRJRDogMCxcblxuICAgICAgYm9keUhlaWdodDogMCxcbiAgICAgIHdpbmRvd0hlaWdodDogMCxcbiAgICAgIHdpbmRvd1dpZHRoOiAwXG4gICAgfSlcblxuICBtb2R1bGUuZXhwb3J0cy5zY3JvbGxUb3BDaGFuZ2VkID0gc2Nyb2xsVG9wQ2hhbmdlZFxuICAvLyBzY3JvbGxUb3BDaGFuZ2VkLmxvZygpXG5cbi8qXG4gKiAgQWN0aW9uc1xuKi9cblxuICBtb2R1bGUuZXhwb3J0cy5nZXQgPSAoKSA9PiB7XG4gICAgcmV0dXJuIHN0YXRlXG4gIH1cblxuICBtb2R1bGUuZXhwb3J0cy5hY3Rpb24gPSAoYWN0aW9uKSA9PiB7XG4gICAgc3dpdGNoIChhY3Rpb24pIHtcbiAgICAgIGNhc2UgJ25leHQnOlxuICAgICAgICAkd2luZG93LnRyaWdnZXIoJ0ZPQ1VTX05FWFQnKVxuICAgICAgICBicmVha1xuICAgICAgY2FzZSAncHJldmlvdXMnOlxuICAgICAgICAkd2luZG93LnRyaWdnZXIoJ0ZPQ1VTX1BSRVZJT1VTJylcbiAgICAgICAgYnJlYWtcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGJyZWFrXG4gICAgfVxuICB9XG5cbiAgY29uc3QgYWN0aW9uX2ZvY3VzTmV4dCA9IHNjcm9sbFRvcENoYW5nZWRcbiAgICAgIC5mbGF0TWFwRmlyc3QoKHN0YXRlKSA9PiB7XG4gICAgICAgIHJldHVybiBLZWZpci5mcm9tRXZlbnRzKCR3aW5kb3csICdGT0NVU19ORVhUJywgKCkgPT4gc3RhdGUpXG4gICAgICB9KVxuICAgICAgLm1hcChzdGF0ZSA9PiBzdGF0ZVsxXSlcbiAgICAgIC5tYXAobmV4dEZvY3VzKVxuXG4gIGNvbnN0IGFjdGlvbl9mb2N1c1ByZXZpb3VzID0gc2Nyb2xsVG9wQ2hhbmdlZFxuICAgICAgLmZsYXRNYXBGaXJzdCgoc3RhdGUpID0+IHtcbiAgICAgICAgcmV0dXJuIEtlZmlyLmZyb21FdmVudHMoJHdpbmRvdywgJ0ZPQ1VTX1BSRVZJT1VTJywgKCkgPT4gc3RhdGUpXG4gICAgICB9KVxuICAgICAgLm1hcChzdGF0ZSA9PiBzdGF0ZVsxXSlcbiAgICAgIC5tYXAocHJldmlvdXNGb2N1cylcblxuICAgIGZ1bmN0aW9uIG5leHRGb2N1cyhzdGF0ZSkge1xuICAgICAgc3dpdGNoKHN0YXRlLmN1cnJlbnRGcmFtZS5sZW5ndGgpIHtcbiAgICAgICAgY2FzZSAxOlxuICAgICAgICAgIHJldHVybiBzdGF0ZS5mcmFtZUZvY3VzW3N0YXRlLmN1cnJlbnRGcmFtZVswXSArIDFdXG4gICAgICAgIGNhc2UgMjpcbiAgICAgICAgICByZXR1cm4gc3RhdGUuZnJhbWVGb2N1c1tzdGF0ZS5jdXJyZW50RnJhbWVbMV1dXG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcHJldmlvdXNGb2N1cyhzdGF0ZSkge1xuICAgICAgc3dpdGNoKHN0YXRlLmN1cnJlbnRGcmFtZS5sZW5ndGgpIHtcbiAgICAgICAgY2FzZSAxOlxuICAgICAgICAgIHJldHVybiBzdGF0ZS5mcmFtZUZvY3VzW3N0YXRlLmN1cnJlbnRGcmFtZVswXSAtIDFdXG4gICAgICAgIGNhc2UgMjpcbiAgICAgICAgICByZXR1cm4gc3RhdGUuZnJhbWVGb2N1c1tzdGF0ZS5jdXJyZW50RnJhbWVbMF1dXG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgZm9jdXNDaGFuZ2VkID0gS2VmaXIubWVyZ2UoW2FjdGlvbl9mb2N1c1ByZXZpb3VzLCBhY3Rpb25fZm9jdXNOZXh0XSlcbiAgICAgIC5vblZhbHVlKHJlbmRlclNjcm9sbClcblxuICAgIGZvY3VzQ2hhbmdlZC5sb2coKTtcbiAgICBmdW5jdGlvbiByZW5kZXJTY3JvbGwoc2Nyb2xsKSB7XG4gICAgICAvLyBjb25zb2xlLmxvZyhcIlJFTkRFUlwiLCBzY3JvbGwsIE1hdGguZmxvb3IoJHdpbmRvdy5zY3JvbGxUb3AoKSkpXG4gICAgICAkYm9keWh0bWwuYW5pbWF0ZSh7XG4gICAgICAgIHNjcm9sbFRvcDogc2Nyb2xsXG4gICAgICB9LCAxNTAwLCAnbGluZWFyJylcbiAgICB9XG5cbiAgICBOdW1iZXIucHJvdG90eXBlLmJldHdlZW4gPSBmdW5jdGlvbihhLCBiKSB7XG4gICAgICB2YXIgbWluID0gTWF0aC5taW4uYXBwbHkoTWF0aCwgW2EsIGJdKSxcbiAgICAgICAgbWF4ID0gTWF0aC5tYXguYXBwbHkoTWF0aCwgW2EsIGJdKVxuICAgICAgcmV0dXJuIHRoaXMgPiBtaW4gJiYgdGhpcyA8IG1heFxuICAgIH1cblxuXG4vKlxuICogIEhlbHBlcnNcbiovXG5cbiAgZnVuY3Rpb24gdGhyb3dFcnJvcigpIHtcbiAgICAkYm9keWh0bWwuYWRkQ2xhc3MoJ3BhZ2UtZXJyb3InKVxuICB9XG5cbiAgZnVuY3Rpb24gaXNUb3VjaERldmljZSgpIHtcbiAgICByZXR1cm4gJ29udG91Y2hzdGFydCcgaW4gd2luZG93IC8vIHdvcmtzIG9uIG1vc3QgYnJvd3NlcnNcbiAgICAgIHx8ICdvbm1zZ2VzdHVyZWNoYW5nZScgaW4gd2luZG93IC8vIHdvcmtzIG9uIGllMTBcbiAgfVxuXG5cblxuLyoqIFdFQlBBQ0sgRk9PVEVSICoqXG4gKiogLi9zY2VuZS1tYWtlci9vYi1zY2VuZS5qc1xuICoqLyIsIi8qISBLZWZpci5qcyB2My4yLjBcbiAqICBodHRwczovL2dpdGh1Yi5jb20vcnBvbWlub3Yva2VmaXJcbiAqL1xuXG4oZnVuY3Rpb24gd2VicGFja1VuaXZlcnNhbE1vZHVsZURlZmluaXRpb24ocm9vdCwgZmFjdG9yeSkge1xuXHRpZih0eXBlb2YgZXhwb3J0cyA9PT0gJ29iamVjdCcgJiYgdHlwZW9mIG1vZHVsZSA9PT0gJ29iamVjdCcpXG5cdFx0bW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KCk7XG5cdGVsc2UgaWYodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKVxuXHRcdGRlZmluZShbXSwgZmFjdG9yeSk7XG5cdGVsc2UgaWYodHlwZW9mIGV4cG9ydHMgPT09ICdvYmplY3QnKVxuXHRcdGV4cG9ydHNbXCJLZWZpclwiXSA9IGZhY3RvcnkoKTtcblx0ZWxzZVxuXHRcdHJvb3RbXCJLZWZpclwiXSA9IGZhY3RvcnkoKTtcbn0pKHRoaXMsIGZ1bmN0aW9uKCkge1xucmV0dXJuIC8qKioqKiovIChmdW5jdGlvbihtb2R1bGVzKSB7IC8vIHdlYnBhY2tCb290c3RyYXBcbi8qKioqKiovIFx0Ly8gVGhlIG1vZHVsZSBjYWNoZVxuLyoqKioqKi8gXHR2YXIgaW5zdGFsbGVkTW9kdWxlcyA9IHt9O1xuXG4vKioqKioqLyBcdC8vIFRoZSByZXF1aXJlIGZ1bmN0aW9uXG4vKioqKioqLyBcdGZ1bmN0aW9uIF9fd2VicGFja19yZXF1aXJlX18obW9kdWxlSWQpIHtcblxuLyoqKioqKi8gXHRcdC8vIENoZWNrIGlmIG1vZHVsZSBpcyBpbiBjYWNoZVxuLyoqKioqKi8gXHRcdGlmKGluc3RhbGxlZE1vZHVsZXNbbW9kdWxlSWRdKVxuLyoqKioqKi8gXHRcdFx0cmV0dXJuIGluc3RhbGxlZE1vZHVsZXNbbW9kdWxlSWRdLmV4cG9ydHM7XG5cbi8qKioqKiovIFx0XHQvLyBDcmVhdGUgYSBuZXcgbW9kdWxlIChhbmQgcHV0IGl0IGludG8gdGhlIGNhY2hlKVxuLyoqKioqKi8gXHRcdHZhciBtb2R1bGUgPSBpbnN0YWxsZWRNb2R1bGVzW21vZHVsZUlkXSA9IHtcbi8qKioqKiovIFx0XHRcdGV4cG9ydHM6IHt9LFxuLyoqKioqKi8gXHRcdFx0aWQ6IG1vZHVsZUlkLFxuLyoqKioqKi8gXHRcdFx0bG9hZGVkOiBmYWxzZVxuLyoqKioqKi8gXHRcdH07XG5cbi8qKioqKiovIFx0XHQvLyBFeGVjdXRlIHRoZSBtb2R1bGUgZnVuY3Rpb25cbi8qKioqKiovIFx0XHRtb2R1bGVzW21vZHVsZUlkXS5jYWxsKG1vZHVsZS5leHBvcnRzLCBtb2R1bGUsIG1vZHVsZS5leHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKTtcblxuLyoqKioqKi8gXHRcdC8vIEZsYWcgdGhlIG1vZHVsZSBhcyBsb2FkZWRcbi8qKioqKiovIFx0XHRtb2R1bGUubG9hZGVkID0gdHJ1ZTtcblxuLyoqKioqKi8gXHRcdC8vIFJldHVybiB0aGUgZXhwb3J0cyBvZiB0aGUgbW9kdWxlXG4vKioqKioqLyBcdFx0cmV0dXJuIG1vZHVsZS5leHBvcnRzO1xuLyoqKioqKi8gXHR9XG5cblxuLyoqKioqKi8gXHQvLyBleHBvc2UgdGhlIG1vZHVsZXMgb2JqZWN0IChfX3dlYnBhY2tfbW9kdWxlc19fKVxuLyoqKioqKi8gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLm0gPSBtb2R1bGVzO1xuXG4vKioqKioqLyBcdC8vIGV4cG9zZSB0aGUgbW9kdWxlIGNhY2hlXG4vKioqKioqLyBcdF9fd2VicGFja19yZXF1aXJlX18uYyA9IGluc3RhbGxlZE1vZHVsZXM7XG5cbi8qKioqKiovIFx0Ly8gX193ZWJwYWNrX3B1YmxpY19wYXRoX19cbi8qKioqKiovIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5wID0gXCJcIjtcblxuLyoqKioqKi8gXHQvLyBMb2FkIGVudHJ5IG1vZHVsZSBhbmQgcmV0dXJuIGV4cG9ydHNcbi8qKioqKiovIFx0cmV0dXJuIF9fd2VicGFja19yZXF1aXJlX18oMCk7XG4vKioqKioqLyB9KVxuLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cbi8qKioqKiovIChbXG4vKiAwICovXG4vKioqLyBmdW5jdGlvbihtb2R1bGUsIGV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pIHtcblxuXHQndXNlIHN0cmljdCc7XG5cblx0dmFyIEtlZmlyID0gbW9kdWxlLmV4cG9ydHMgPSB7fTtcblx0S2VmaXIuS2VmaXIgPSBLZWZpcjtcblxuXHR2YXIgT2JzZXJ2YWJsZSA9IEtlZmlyLk9ic2VydmFibGUgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDEpO1xuXHRLZWZpci5TdHJlYW0gPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDYpO1xuXHRLZWZpci5Qcm9wZXJ0eSA9IF9fd2VicGFja19yZXF1aXJlX18oNyk7XG5cblx0Ly8gQ3JlYXRlIGEgc3RyZWFtXG5cdC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cblx0Ly8gKCkgLT4gU3RyZWFtXG5cdEtlZmlyLm5ldmVyID0gX193ZWJwYWNrX3JlcXVpcmVfXyg4KTtcblxuXHQvLyAobnVtYmVyLCBhbnkpIC0+IFN0cmVhbVxuXHRLZWZpci5sYXRlciA9IF9fd2VicGFja19yZXF1aXJlX18oOSk7XG5cblx0Ly8gKG51bWJlciwgYW55KSAtPiBTdHJlYW1cblx0S2VmaXIuaW50ZXJ2YWwgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDExKTtcblxuXHQvLyAobnVtYmVyLCBBcnJheTxhbnk+KSAtPiBTdHJlYW1cblx0S2VmaXIuc2VxdWVudGlhbGx5ID0gX193ZWJwYWNrX3JlcXVpcmVfXygxMik7XG5cblx0Ly8gKG51bWJlciwgRnVuY3Rpb24pIC0+IFN0cmVhbVxuXHRLZWZpci5mcm9tUG9sbCA9IF9fd2VicGFja19yZXF1aXJlX18oMTMpO1xuXG5cdC8vIChudW1iZXIsIEZ1bmN0aW9uKSAtPiBTdHJlYW1cblx0S2VmaXIud2l0aEludGVydmFsID0gX193ZWJwYWNrX3JlcXVpcmVfXygxNCk7XG5cblx0Ly8gKEZ1bmN0aW9uKSAtPiBTdHJlYW1cblx0S2VmaXIuZnJvbUNhbGxiYWNrID0gX193ZWJwYWNrX3JlcXVpcmVfXygxNik7XG5cblx0Ly8gKEZ1bmN0aW9uKSAtPiBTdHJlYW1cblx0S2VmaXIuZnJvbU5vZGVDYWxsYmFjayA9IF9fd2VicGFja19yZXF1aXJlX18oMTgpO1xuXG5cdC8vIFRhcmdldCA9IHthZGRFdmVudExpc3RlbmVyLCByZW1vdmVFdmVudExpc3RlbmVyfXx7YWRkTGlzdGVuZXIsIHJlbW92ZUxpc3RlbmVyfXx7b24sIG9mZn1cblx0Ly8gKFRhcmdldCwgc3RyaW5nLCBGdW5jdGlvbnx1bmRlZmluZWQpIC0+IFN0cmVhbVxuXHRLZWZpci5mcm9tRXZlbnRzID0gX193ZWJwYWNrX3JlcXVpcmVfXygxOSk7XG5cblx0Ly8gKEZ1bmN0aW9uKSAtPiBTdHJlYW1cblx0S2VmaXIuc3RyZWFtID0gX193ZWJwYWNrX3JlcXVpcmVfXygxNyk7XG5cblx0Ly8gQ3JlYXRlIGEgcHJvcGVydHlcblx0Ly8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuXHQvLyAoYW55KSAtPiBQcm9wZXJ0eVxuXHRLZWZpci5jb25zdGFudCA9IF9fd2VicGFja19yZXF1aXJlX18oMjIpO1xuXG5cdC8vIChhbnkpIC0+IFByb3BlcnR5XG5cdEtlZmlyLmNvbnN0YW50RXJyb3IgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDIzKTtcblxuXHQvLyBDb252ZXJ0IG9ic2VydmFibGVzXG5cdC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cblx0Ly8gKFN0cmVhbXxQcm9wZXJ0eSwgRnVuY3Rpb258dW5kZWZpbmVkKSAtPiBQcm9wZXJ0eVxuXHR2YXIgdG9Qcm9wZXJ0eSA9IF9fd2VicGFja19yZXF1aXJlX18oMjQpO1xuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS50b1Byb3BlcnR5ID0gZnVuY3Rpb24gKGZuKSB7XG5cdCAgcmV0dXJuIHRvUHJvcGVydHkodGhpcywgZm4pO1xuXHR9O1xuXG5cdC8vIChTdHJlYW18UHJvcGVydHkpIC0+IFN0cmVhbVxuXHR2YXIgY2hhbmdlcyA9IF9fd2VicGFja19yZXF1aXJlX18oMjYpO1xuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS5jaGFuZ2VzID0gZnVuY3Rpb24gKCkge1xuXHQgIHJldHVybiBjaGFuZ2VzKHRoaXMpO1xuXHR9O1xuXG5cdC8vIEludGVyb3BlcmF0aW9uIHdpdGggb3RoZXIgaW1wbGltZW50YXRpb25zXG5cdC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cblx0Ly8gKFByb21pc2UpIC0+IFByb3BlcnR5XG5cdEtlZmlyLmZyb21Qcm9taXNlID0gX193ZWJwYWNrX3JlcXVpcmVfXygyNyk7XG5cblx0Ly8gKFN0cmVhbXxQcm9wZXJ0eSwgRnVuY3Rpb258dW5kZWZpbmVkKSAtPiBQcm9taXNlXG5cdHZhciB0b1Byb21pc2UgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDI4KTtcblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUudG9Qcm9taXNlID0gZnVuY3Rpb24gKFByb21pc2UpIHtcblx0ICByZXR1cm4gdG9Qcm9taXNlKHRoaXMsIFByb21pc2UpO1xuXHR9O1xuXG5cdC8vIChFU09ic2VydmFibGUpIC0+IFN0cmVhbVxuXHRLZWZpci5mcm9tRVNPYnNlcnZhYmxlID0gX193ZWJwYWNrX3JlcXVpcmVfXygyOSk7XG5cblx0Ly8gKFN0cmVhbXxQcm9wZXJ0eSkgLT4gRVM3IE9ic2VydmFibGVcblx0dmFyIHRvRVNPYnNlcnZhYmxlID0gX193ZWJwYWNrX3JlcXVpcmVfXygzMSk7XG5cdE9ic2VydmFibGUucHJvdG90eXBlLnRvRVNPYnNlcnZhYmxlID0gdG9FU09ic2VydmFibGU7XG5cdE9ic2VydmFibGUucHJvdG90eXBlW19fd2VicGFja19yZXF1aXJlX18oMzApKCdvYnNlcnZhYmxlJyldID0gdG9FU09ic2VydmFibGU7XG5cblx0Ly8gTW9kaWZ5IGFuIG9ic2VydmFibGVcblx0Ly8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuXHQvLyAoU3RyZWFtLCBGdW5jdGlvbnx1bmRlZmluZWQpIC0+IFN0cmVhbVxuXHQvLyAoUHJvcGVydHksIEZ1bmN0aW9ufHVuZGVmaW5lZCkgLT4gUHJvcGVydHlcblx0dmFyIG1hcCA9IF9fd2VicGFja19yZXF1aXJlX18oMzIpO1xuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS5tYXAgPSBmdW5jdGlvbiAoZm4pIHtcblx0ICByZXR1cm4gbWFwKHRoaXMsIGZuKTtcblx0fTtcblxuXHQvLyAoU3RyZWFtLCBGdW5jdGlvbnx1bmRlZmluZWQpIC0+IFN0cmVhbVxuXHQvLyAoUHJvcGVydHksIEZ1bmN0aW9ufHVuZGVmaW5lZCkgLT4gUHJvcGVydHlcblx0dmFyIGZpbHRlciA9IF9fd2VicGFja19yZXF1aXJlX18oMzMpO1xuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS5maWx0ZXIgPSBmdW5jdGlvbiAoZm4pIHtcblx0ICByZXR1cm4gZmlsdGVyKHRoaXMsIGZuKTtcblx0fTtcblxuXHQvLyAoU3RyZWFtLCBudW1iZXIpIC0+IFN0cmVhbVxuXHQvLyAoUHJvcGVydHksIG51bWJlcikgLT4gUHJvcGVydHlcblx0dmFyIHRha2UgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDM0KTtcblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUudGFrZSA9IGZ1bmN0aW9uIChuKSB7XG5cdCAgcmV0dXJuIHRha2UodGhpcywgbik7XG5cdH07XG5cblx0Ly8gKFN0cmVhbSwgbnVtYmVyKSAtPiBTdHJlYW1cblx0Ly8gKFByb3BlcnR5LCBudW1iZXIpIC0+IFByb3BlcnR5XG5cdHZhciB0YWtlRXJyb3JzID0gX193ZWJwYWNrX3JlcXVpcmVfXygzNSk7XG5cdE9ic2VydmFibGUucHJvdG90eXBlLnRha2VFcnJvcnMgPSBmdW5jdGlvbiAobikge1xuXHQgIHJldHVybiB0YWtlRXJyb3JzKHRoaXMsIG4pO1xuXHR9O1xuXG5cdC8vIChTdHJlYW0sIEZ1bmN0aW9ufHVuZGVmaW5lZCkgLT4gU3RyZWFtXG5cdC8vIChQcm9wZXJ0eSwgRnVuY3Rpb258dW5kZWZpbmVkKSAtPiBQcm9wZXJ0eVxuXHR2YXIgdGFrZVdoaWxlID0gX193ZWJwYWNrX3JlcXVpcmVfXygzNik7XG5cdE9ic2VydmFibGUucHJvdG90eXBlLnRha2VXaGlsZSA9IGZ1bmN0aW9uIChmbikge1xuXHQgIHJldHVybiB0YWtlV2hpbGUodGhpcywgZm4pO1xuXHR9O1xuXG5cdC8vIChTdHJlYW0pIC0+IFN0cmVhbVxuXHQvLyAoUHJvcGVydHkpIC0+IFByb3BlcnR5XG5cdHZhciBsYXN0ID0gX193ZWJwYWNrX3JlcXVpcmVfXygzNyk7XG5cdE9ic2VydmFibGUucHJvdG90eXBlLmxhc3QgPSBmdW5jdGlvbiAoKSB7XG5cdCAgcmV0dXJuIGxhc3QodGhpcyk7XG5cdH07XG5cblx0Ly8gKFN0cmVhbSwgbnVtYmVyKSAtPiBTdHJlYW1cblx0Ly8gKFByb3BlcnR5LCBudW1iZXIpIC0+IFByb3BlcnR5XG5cdHZhciBza2lwID0gX193ZWJwYWNrX3JlcXVpcmVfXygzOCk7XG5cdE9ic2VydmFibGUucHJvdG90eXBlLnNraXAgPSBmdW5jdGlvbiAobikge1xuXHQgIHJldHVybiBza2lwKHRoaXMsIG4pO1xuXHR9O1xuXG5cdC8vIChTdHJlYW0sIEZ1bmN0aW9ufHVuZGVmaW5lZCkgLT4gU3RyZWFtXG5cdC8vIChQcm9wZXJ0eSwgRnVuY3Rpb258dW5kZWZpbmVkKSAtPiBQcm9wZXJ0eVxuXHR2YXIgc2tpcFdoaWxlID0gX193ZWJwYWNrX3JlcXVpcmVfXygzOSk7XG5cdE9ic2VydmFibGUucHJvdG90eXBlLnNraXBXaGlsZSA9IGZ1bmN0aW9uIChmbikge1xuXHQgIHJldHVybiBza2lwV2hpbGUodGhpcywgZm4pO1xuXHR9O1xuXG5cdC8vIChTdHJlYW0sIEZ1bmN0aW9ufHVuZGVmaW5lZCkgLT4gU3RyZWFtXG5cdC8vIChQcm9wZXJ0eSwgRnVuY3Rpb258dW5kZWZpbmVkKSAtPiBQcm9wZXJ0eVxuXHR2YXIgc2tpcER1cGxpY2F0ZXMgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDQwKTtcblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUuc2tpcER1cGxpY2F0ZXMgPSBmdW5jdGlvbiAoZm4pIHtcblx0ICByZXR1cm4gc2tpcER1cGxpY2F0ZXModGhpcywgZm4pO1xuXHR9O1xuXG5cdC8vIChTdHJlYW0sIEZ1bmN0aW9ufGZhbHNleSwgYW55fHVuZGVmaW5lZCkgLT4gU3RyZWFtXG5cdC8vIChQcm9wZXJ0eSwgRnVuY3Rpb258ZmFsc2V5LCBhbnl8dW5kZWZpbmVkKSAtPiBQcm9wZXJ0eVxuXHR2YXIgZGlmZiA9IF9fd2VicGFja19yZXF1aXJlX18oNDEpO1xuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS5kaWZmID0gZnVuY3Rpb24gKGZuLCBzZWVkKSB7XG5cdCAgcmV0dXJuIGRpZmYodGhpcywgZm4sIHNlZWQpO1xuXHR9O1xuXG5cdC8vIChTdHJlYW18UHJvcGVydHksIEZ1bmN0aW9uLCBhbnl8dW5kZWZpbmVkKSAtPiBQcm9wZXJ0eVxuXHR2YXIgc2NhbiA9IF9fd2VicGFja19yZXF1aXJlX18oNDIpO1xuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS5zY2FuID0gZnVuY3Rpb24gKGZuLCBzZWVkKSB7XG5cdCAgcmV0dXJuIHNjYW4odGhpcywgZm4sIHNlZWQpO1xuXHR9O1xuXG5cdC8vIChTdHJlYW0sIEZ1bmN0aW9ufHVuZGVmaW5lZCkgLT4gU3RyZWFtXG5cdC8vIChQcm9wZXJ0eSwgRnVuY3Rpb258dW5kZWZpbmVkKSAtPiBQcm9wZXJ0eVxuXHR2YXIgZmxhdHRlbiA9IF9fd2VicGFja19yZXF1aXJlX18oNDMpO1xuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS5mbGF0dGVuID0gZnVuY3Rpb24gKGZuKSB7XG5cdCAgcmV0dXJuIGZsYXR0ZW4odGhpcywgZm4pO1xuXHR9O1xuXG5cdC8vIChTdHJlYW0sIG51bWJlcikgLT4gU3RyZWFtXG5cdC8vIChQcm9wZXJ0eSwgbnVtYmVyKSAtPiBQcm9wZXJ0eVxuXHR2YXIgZGVsYXkgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDQ0KTtcblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUuZGVsYXkgPSBmdW5jdGlvbiAod2FpdCkge1xuXHQgIHJldHVybiBkZWxheSh0aGlzLCB3YWl0KTtcblx0fTtcblxuXHQvLyBPcHRpb25zID0ge2xlYWRpbmc6IGJvb2xlYW58dW5kZWZpbmVkLCB0cmFpbGluZzogYm9vbGVhbnx1bmRlZmluZWR9XG5cdC8vIChTdHJlYW0sIG51bWJlciwgT3B0aW9uc3x1bmRlZmluZWQpIC0+IFN0cmVhbVxuXHQvLyAoUHJvcGVydHksIG51bWJlciwgT3B0aW9uc3x1bmRlZmluZWQpIC0+IFByb3BlcnR5XG5cdHZhciB0aHJvdHRsZSA9IF9fd2VicGFja19yZXF1aXJlX18oNDUpO1xuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS50aHJvdHRsZSA9IGZ1bmN0aW9uICh3YWl0LCBvcHRpb25zKSB7XG5cdCAgcmV0dXJuIHRocm90dGxlKHRoaXMsIHdhaXQsIG9wdGlvbnMpO1xuXHR9O1xuXG5cdC8vIE9wdGlvbnMgPSB7aW1tZWRpYXRlOiBib29sZWFufHVuZGVmaW5lZH1cblx0Ly8gKFN0cmVhbSwgbnVtYmVyLCBPcHRpb25zfHVuZGVmaW5lZCkgLT4gU3RyZWFtXG5cdC8vIChQcm9wZXJ0eSwgbnVtYmVyLCBPcHRpb25zfHVuZGVmaW5lZCkgLT4gUHJvcGVydHlcblx0dmFyIGRlYm91bmNlID0gX193ZWJwYWNrX3JlcXVpcmVfXyg0Nyk7XG5cdE9ic2VydmFibGUucHJvdG90eXBlLmRlYm91bmNlID0gZnVuY3Rpb24gKHdhaXQsIG9wdGlvbnMpIHtcblx0ICByZXR1cm4gZGVib3VuY2UodGhpcywgd2FpdCwgb3B0aW9ucyk7XG5cdH07XG5cblx0Ly8gKFN0cmVhbSwgRnVuY3Rpb258dW5kZWZpbmVkKSAtPiBTdHJlYW1cblx0Ly8gKFByb3BlcnR5LCBGdW5jdGlvbnx1bmRlZmluZWQpIC0+IFByb3BlcnR5XG5cdHZhciBtYXBFcnJvcnMgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDQ4KTtcblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUubWFwRXJyb3JzID0gZnVuY3Rpb24gKGZuKSB7XG5cdCAgcmV0dXJuIG1hcEVycm9ycyh0aGlzLCBmbik7XG5cdH07XG5cblx0Ly8gKFN0cmVhbSwgRnVuY3Rpb258dW5kZWZpbmVkKSAtPiBTdHJlYW1cblx0Ly8gKFByb3BlcnR5LCBGdW5jdGlvbnx1bmRlZmluZWQpIC0+IFByb3BlcnR5XG5cdHZhciBmaWx0ZXJFcnJvcnMgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDQ5KTtcblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUuZmlsdGVyRXJyb3JzID0gZnVuY3Rpb24gKGZuKSB7XG5cdCAgcmV0dXJuIGZpbHRlckVycm9ycyh0aGlzLCBmbik7XG5cdH07XG5cblx0Ly8gKFN0cmVhbSkgLT4gU3RyZWFtXG5cdC8vIChQcm9wZXJ0eSkgLT4gUHJvcGVydHlcblx0dmFyIGlnbm9yZVZhbHVlcyA9IF9fd2VicGFja19yZXF1aXJlX18oNTApO1xuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS5pZ25vcmVWYWx1ZXMgPSBmdW5jdGlvbiAoKSB7XG5cdCAgcmV0dXJuIGlnbm9yZVZhbHVlcyh0aGlzKTtcblx0fTtcblxuXHQvLyAoU3RyZWFtKSAtPiBTdHJlYW1cblx0Ly8gKFByb3BlcnR5KSAtPiBQcm9wZXJ0eVxuXHR2YXIgaWdub3JlRXJyb3JzID0gX193ZWJwYWNrX3JlcXVpcmVfXyg1MSk7XG5cdE9ic2VydmFibGUucHJvdG90eXBlLmlnbm9yZUVycm9ycyA9IGZ1bmN0aW9uICgpIHtcblx0ICByZXR1cm4gaWdub3JlRXJyb3JzKHRoaXMpO1xuXHR9O1xuXG5cdC8vIChTdHJlYW0pIC0+IFN0cmVhbVxuXHQvLyAoUHJvcGVydHkpIC0+IFByb3BlcnR5XG5cdHZhciBpZ25vcmVFbmQgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDUyKTtcblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUuaWdub3JlRW5kID0gZnVuY3Rpb24gKCkge1xuXHQgIHJldHVybiBpZ25vcmVFbmQodGhpcyk7XG5cdH07XG5cblx0Ly8gKFN0cmVhbSwgRnVuY3Rpb24pIC0+IFN0cmVhbVxuXHQvLyAoUHJvcGVydHksIEZ1bmN0aW9uKSAtPiBQcm9wZXJ0eVxuXHR2YXIgYmVmb3JlRW5kID0gX193ZWJwYWNrX3JlcXVpcmVfXyg1Myk7XG5cdE9ic2VydmFibGUucHJvdG90eXBlLmJlZm9yZUVuZCA9IGZ1bmN0aW9uIChmbikge1xuXHQgIHJldHVybiBiZWZvcmVFbmQodGhpcywgZm4pO1xuXHR9O1xuXG5cdC8vIChTdHJlYW0sIG51bWJlciwgbnVtYmVyfHVuZGVmaW5lZCkgLT4gU3RyZWFtXG5cdC8vIChQcm9wZXJ0eSwgbnVtYmVyLCBudW1iZXJ8dW5kZWZpbmVkKSAtPiBQcm9wZXJ0eVxuXHR2YXIgc2xpZGluZ1dpbmRvdyA9IF9fd2VicGFja19yZXF1aXJlX18oNTQpO1xuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS5zbGlkaW5nV2luZG93ID0gZnVuY3Rpb24gKG1heCwgbWluKSB7XG5cdCAgcmV0dXJuIHNsaWRpbmdXaW5kb3codGhpcywgbWF4LCBtaW4pO1xuXHR9O1xuXG5cdC8vIE9wdGlvbnMgPSB7Zmx1c2hPbkVuZDogYm9vbGVhbnx1bmRlZmluZWR9XG5cdC8vIChTdHJlYW0sIEZ1bmN0aW9ufGZhbHNleSwgT3B0aW9uc3x1bmRlZmluZWQpIC0+IFN0cmVhbVxuXHQvLyAoUHJvcGVydHksIEZ1bmN0aW9ufGZhbHNleSwgT3B0aW9uc3x1bmRlZmluZWQpIC0+IFByb3BlcnR5XG5cdHZhciBidWZmZXJXaGlsZSA9IF9fd2VicGFja19yZXF1aXJlX18oNTUpO1xuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS5idWZmZXJXaGlsZSA9IGZ1bmN0aW9uIChmbiwgb3B0aW9ucykge1xuXHQgIHJldHVybiBidWZmZXJXaGlsZSh0aGlzLCBmbiwgb3B0aW9ucyk7XG5cdH07XG5cblx0Ly8gKFN0cmVhbSwgbnVtYmVyKSAtPiBTdHJlYW1cblx0Ly8gKFByb3BlcnR5LCBudW1iZXIpIC0+IFByb3BlcnR5XG5cdHZhciBidWZmZXJXaXRoQ291bnQgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDU2KTtcblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUuYnVmZmVyV2l0aENvdW50ID0gZnVuY3Rpb24gKGNvdW50LCBvcHRpb25zKSB7XG5cdCAgcmV0dXJuIGJ1ZmZlcldpdGhDb3VudCh0aGlzLCBjb3VudCwgb3B0aW9ucyk7XG5cdH07XG5cblx0Ly8gT3B0aW9ucyA9IHtmbHVzaE9uRW5kOiBib29sZWFufHVuZGVmaW5lZH1cblx0Ly8gKFN0cmVhbSwgbnVtYmVyLCBudW1iZXIsIE9wdGlvbnN8dW5kZWZpbmVkKSAtPiBTdHJlYW1cblx0Ly8gKFByb3BlcnR5LCBudW1iZXIsIG51bWJlciwgT3B0aW9uc3x1bmRlZmluZWQpIC0+IFByb3BlcnR5XG5cdHZhciBidWZmZXJXaXRoVGltZU9yQ291bnQgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDU3KTtcblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUuYnVmZmVyV2l0aFRpbWVPckNvdW50ID0gZnVuY3Rpb24gKHdhaXQsIGNvdW50LCBvcHRpb25zKSB7XG5cdCAgcmV0dXJuIGJ1ZmZlcldpdGhUaW1lT3JDb3VudCh0aGlzLCB3YWl0LCBjb3VudCwgb3B0aW9ucyk7XG5cdH07XG5cblx0Ly8gKFN0cmVhbSwgRnVuY3Rpb24pIC0+IFN0cmVhbVxuXHQvLyAoUHJvcGVydHksIEZ1bmN0aW9uKSAtPiBQcm9wZXJ0eVxuXHR2YXIgdHJhbnNkdWNlID0gX193ZWJwYWNrX3JlcXVpcmVfXyg1OCk7XG5cdE9ic2VydmFibGUucHJvdG90eXBlLnRyYW5zZHVjZSA9IGZ1bmN0aW9uICh0cmFuc2R1Y2VyKSB7XG5cdCAgcmV0dXJuIHRyYW5zZHVjZSh0aGlzLCB0cmFuc2R1Y2VyKTtcblx0fTtcblxuXHQvLyAoU3RyZWFtLCBGdW5jdGlvbikgLT4gU3RyZWFtXG5cdC8vIChQcm9wZXJ0eSwgRnVuY3Rpb24pIC0+IFByb3BlcnR5XG5cdHZhciB3aXRoSGFuZGxlciA9IF9fd2VicGFja19yZXF1aXJlX18oNTkpO1xuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS53aXRoSGFuZGxlciA9IGZ1bmN0aW9uIChmbikge1xuXHQgIHJldHVybiB3aXRoSGFuZGxlcih0aGlzLCBmbik7XG5cdH07XG5cblx0Ly8gQ29tYmluZSBvYnNlcnZhYmxlc1xuXHQvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5cdC8vIChBcnJheTxTdHJlYW18UHJvcGVydHk+LCBGdW5jdGlvbnx1bmRlZmllbmQpIC0+IFN0cmVhbVxuXHQvLyAoQXJyYXk8U3RyZWFtfFByb3BlcnR5PiwgQXJyYXk8U3RyZWFtfFByb3BlcnR5PiwgRnVuY3Rpb258dW5kZWZpZW5kKSAtPiBTdHJlYW1cblx0dmFyIGNvbWJpbmUgPSBLZWZpci5jb21iaW5lID0gX193ZWJwYWNrX3JlcXVpcmVfXyg2MCk7XG5cdE9ic2VydmFibGUucHJvdG90eXBlLmNvbWJpbmUgPSBmdW5jdGlvbiAob3RoZXIsIGNvbWJpbmF0b3IpIHtcblx0ICByZXR1cm4gY29tYmluZShbdGhpcywgb3RoZXJdLCBjb21iaW5hdG9yKTtcblx0fTtcblxuXHQvLyAoQXJyYXk8U3RyZWFtfFByb3BlcnR5PiwgRnVuY3Rpb258dW5kZWZpZW5kKSAtPiBTdHJlYW1cblx0dmFyIHppcCA9IEtlZmlyLnppcCA9IF9fd2VicGFja19yZXF1aXJlX18oNjEpO1xuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS56aXAgPSBmdW5jdGlvbiAob3RoZXIsIGNvbWJpbmF0b3IpIHtcblx0ICByZXR1cm4gemlwKFt0aGlzLCBvdGhlcl0sIGNvbWJpbmF0b3IpO1xuXHR9O1xuXG5cdC8vIChBcnJheTxTdHJlYW18UHJvcGVydHk+KSAtPiBTdHJlYW1cblx0dmFyIG1lcmdlID0gS2VmaXIubWVyZ2UgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDYyKTtcblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUubWVyZ2UgPSBmdW5jdGlvbiAob3RoZXIpIHtcblx0ICByZXR1cm4gbWVyZ2UoW3RoaXMsIG90aGVyXSk7XG5cdH07XG5cblx0Ly8gKEFycmF5PFN0cmVhbXxQcm9wZXJ0eT4pIC0+IFN0cmVhbVxuXHR2YXIgY29uY2F0ID0gS2VmaXIuY29uY2F0ID0gX193ZWJwYWNrX3JlcXVpcmVfXyg2NCk7XG5cdE9ic2VydmFibGUucHJvdG90eXBlLmNvbmNhdCA9IGZ1bmN0aW9uIChvdGhlcikge1xuXHQgIHJldHVybiBjb25jYXQoW3RoaXMsIG90aGVyXSk7XG5cdH07XG5cblx0Ly8gKCkgLT4gUG9vbFxuXHR2YXIgUG9vbCA9IEtlZmlyLlBvb2wgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDY2KTtcblx0S2VmaXIucG9vbCA9IGZ1bmN0aW9uICgpIHtcblx0ICByZXR1cm4gbmV3IFBvb2woKTtcblx0fTtcblxuXHQvLyAoRnVuY3Rpb24pIC0+IFN0cmVhbVxuXHRLZWZpci5yZXBlYXQgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDY1KTtcblxuXHQvLyBPcHRpb25zID0ge2NvbmN1ckxpbTogbnVtYmVyfHVuZGVmaW5lZCwgcXVldWVMaW06IG51bWJlcnx1bmRlZmluZWQsIGRyb3A6ICdvbGQnfCduZXcnfHVuZGVmaWVuZH1cblx0Ly8gKFN0cmVhbXxQcm9wZXJ0eSwgRnVuY3Rpb258ZmFsc2V5LCBPcHRpb25zfHVuZGVmaW5lZCkgLT4gU3RyZWFtXG5cdHZhciBGbGF0TWFwID0gX193ZWJwYWNrX3JlcXVpcmVfXyg2Nyk7XG5cdE9ic2VydmFibGUucHJvdG90eXBlLmZsYXRNYXAgPSBmdW5jdGlvbiAoZm4pIHtcblx0ICByZXR1cm4gbmV3IEZsYXRNYXAodGhpcywgZm4pLnNldE5hbWUodGhpcywgJ2ZsYXRNYXAnKTtcblx0fTtcblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUuZmxhdE1hcExhdGVzdCA9IGZ1bmN0aW9uIChmbikge1xuXHQgIHJldHVybiBuZXcgRmxhdE1hcCh0aGlzLCBmbiwgeyBjb25jdXJMaW06IDEsIGRyb3A6ICdvbGQnIH0pLnNldE5hbWUodGhpcywgJ2ZsYXRNYXBMYXRlc3QnKTtcblx0fTtcblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUuZmxhdE1hcEZpcnN0ID0gZnVuY3Rpb24gKGZuKSB7XG5cdCAgcmV0dXJuIG5ldyBGbGF0TWFwKHRoaXMsIGZuLCB7IGNvbmN1ckxpbTogMSB9KS5zZXROYW1lKHRoaXMsICdmbGF0TWFwRmlyc3QnKTtcblx0fTtcblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUuZmxhdE1hcENvbmNhdCA9IGZ1bmN0aW9uIChmbikge1xuXHQgIHJldHVybiBuZXcgRmxhdE1hcCh0aGlzLCBmbiwgeyBxdWV1ZUxpbTogLTEsIGNvbmN1ckxpbTogMSB9KS5zZXROYW1lKHRoaXMsICdmbGF0TWFwQ29uY2F0Jyk7XG5cdH07XG5cdE9ic2VydmFibGUucHJvdG90eXBlLmZsYXRNYXBDb25jdXJMaW1pdCA9IGZ1bmN0aW9uIChmbiwgbGltaXQpIHtcblx0ICByZXR1cm4gbmV3IEZsYXRNYXAodGhpcywgZm4sIHsgcXVldWVMaW06IC0xLCBjb25jdXJMaW06IGxpbWl0IH0pLnNldE5hbWUodGhpcywgJ2ZsYXRNYXBDb25jdXJMaW1pdCcpO1xuXHR9O1xuXG5cdC8vIChTdHJlYW18UHJvcGVydHksIEZ1bmN0aW9ufGZhbHNleSkgLT4gU3RyZWFtXG5cdHZhciBGbGF0TWFwRXJyb3JzID0gX193ZWJwYWNrX3JlcXVpcmVfXyg2OCk7XG5cdE9ic2VydmFibGUucHJvdG90eXBlLmZsYXRNYXBFcnJvcnMgPSBmdW5jdGlvbiAoZm4pIHtcblx0ICByZXR1cm4gbmV3IEZsYXRNYXBFcnJvcnModGhpcywgZm4pLnNldE5hbWUodGhpcywgJ2ZsYXRNYXBFcnJvcnMnKTtcblx0fTtcblxuXHQvLyBDb21iaW5lIHR3byBvYnNlcnZhYmxlc1xuXHQvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5cdC8vIChTdHJlYW0sIFN0cmVhbXxQcm9wZXJ0eSkgLT4gU3RyZWFtXG5cdC8vIChQcm9wZXJ0eSwgU3RyZWFtfFByb3BlcnR5KSAtPiBQcm9wZXJ0eVxuXHR2YXIgZmlsdGVyQnkgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDY5KTtcblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUuZmlsdGVyQnkgPSBmdW5jdGlvbiAob3RoZXIpIHtcblx0ICByZXR1cm4gZmlsdGVyQnkodGhpcywgb3RoZXIpO1xuXHR9O1xuXG5cdC8vIChTdHJlYW0sIFN0cmVhbXxQcm9wZXJ0eSwgRnVuY3Rpb258dW5kZWZpZW5kKSAtPiBTdHJlYW1cblx0Ly8gKFByb3BlcnR5LCBTdHJlYW18UHJvcGVydHksIEZ1bmN0aW9ufHVuZGVmaWVuZCkgLT4gUHJvcGVydHlcblx0dmFyIHNhbXBsZWRCeTJpdGVtcyA9IF9fd2VicGFja19yZXF1aXJlX18oNzEpO1xuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS5zYW1wbGVkQnkgPSBmdW5jdGlvbiAob3RoZXIsIGNvbWJpbmF0b3IpIHtcblx0ICByZXR1cm4gc2FtcGxlZEJ5Mml0ZW1zKHRoaXMsIG90aGVyLCBjb21iaW5hdG9yKTtcblx0fTtcblxuXHQvLyAoU3RyZWFtLCBTdHJlYW18UHJvcGVydHkpIC0+IFN0cmVhbVxuXHQvLyAoUHJvcGVydHksIFN0cmVhbXxQcm9wZXJ0eSkgLT4gUHJvcGVydHlcblx0dmFyIHNraXBVbnRpbEJ5ID0gX193ZWJwYWNrX3JlcXVpcmVfXyg3Mik7XG5cdE9ic2VydmFibGUucHJvdG90eXBlLnNraXBVbnRpbEJ5ID0gZnVuY3Rpb24gKG90aGVyKSB7XG5cdCAgcmV0dXJuIHNraXBVbnRpbEJ5KHRoaXMsIG90aGVyKTtcblx0fTtcblxuXHQvLyAoU3RyZWFtLCBTdHJlYW18UHJvcGVydHkpIC0+IFN0cmVhbVxuXHQvLyAoUHJvcGVydHksIFN0cmVhbXxQcm9wZXJ0eSkgLT4gUHJvcGVydHlcblx0dmFyIHRha2VVbnRpbEJ5ID0gX193ZWJwYWNrX3JlcXVpcmVfXyg3Myk7XG5cdE9ic2VydmFibGUucHJvdG90eXBlLnRha2VVbnRpbEJ5ID0gZnVuY3Rpb24gKG90aGVyKSB7XG5cdCAgcmV0dXJuIHRha2VVbnRpbEJ5KHRoaXMsIG90aGVyKTtcblx0fTtcblxuXHQvLyBPcHRpb25zID0ge2ZsdXNoT25FbmQ6IGJvb2xlYW58dW5kZWZpbmVkfVxuXHQvLyAoU3RyZWFtLCBTdHJlYW18UHJvcGVydHksIE9wdGlvbnN8dW5kZWZpbmVkKSAtPiBTdHJlYW1cblx0Ly8gKFByb3BlcnR5LCBTdHJlYW18UHJvcGVydHksIE9wdGlvbnN8dW5kZWZpbmVkKSAtPiBQcm9wZXJ0eVxuXHR2YXIgYnVmZmVyQnkgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDc0KTtcblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUuYnVmZmVyQnkgPSBmdW5jdGlvbiAob3RoZXIsIG9wdGlvbnMpIHtcblx0ICByZXR1cm4gYnVmZmVyQnkodGhpcywgb3RoZXIsIG9wdGlvbnMpO1xuXHR9O1xuXG5cdC8vIE9wdGlvbnMgPSB7Zmx1c2hPbkVuZDogYm9vbGVhbnx1bmRlZmluZWR9XG5cdC8vIChTdHJlYW0sIFN0cmVhbXxQcm9wZXJ0eSwgT3B0aW9uc3x1bmRlZmluZWQpIC0+IFN0cmVhbVxuXHQvLyAoUHJvcGVydHksIFN0cmVhbXxQcm9wZXJ0eSwgT3B0aW9uc3x1bmRlZmluZWQpIC0+IFByb3BlcnR5XG5cdHZhciBidWZmZXJXaGlsZUJ5ID0gX193ZWJwYWNrX3JlcXVpcmVfXyg3NSk7XG5cdE9ic2VydmFibGUucHJvdG90eXBlLmJ1ZmZlcldoaWxlQnkgPSBmdW5jdGlvbiAob3RoZXIsIG9wdGlvbnMpIHtcblx0ICByZXR1cm4gYnVmZmVyV2hpbGVCeSh0aGlzLCBvdGhlciwgb3B0aW9ucyk7XG5cdH07XG5cblx0Ly8gRGVwcmVjYXRlZFxuXHQvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5cdGZ1bmN0aW9uIHdhcm4obXNnKSB7XG5cdCAgaWYgKEtlZmlyLkRFUFJFQ0FUSU9OX1dBUk5JTkdTICE9PSBmYWxzZSAmJiBjb25zb2xlICYmIHR5cGVvZiBjb25zb2xlLndhcm4gPT09ICdmdW5jdGlvbicpIHtcblx0ICAgIHZhciBtc2cyID0gJ1xcbkhlcmUgaXMgYW4gRXJyb3Igb2JqZWN0IGZvciB5b3UgY29udGFpbmluZyB0aGUgY2FsbCBzdGFjazonO1xuXHQgICAgY29uc29sZS53YXJuKG1zZywgbXNnMiwgbmV3IEVycm9yKCkpO1xuXHQgIH1cblx0fVxuXG5cdC8vIChTdHJlYW18UHJvcGVydHksIFN0cmVhbXxQcm9wZXJ0eSkgLT4gUHJvcGVydHlcblx0dmFyIGF3YWl0aW5nID0gX193ZWJwYWNrX3JlcXVpcmVfXyg3Nik7XG5cdE9ic2VydmFibGUucHJvdG90eXBlLmF3YWl0aW5nID0gZnVuY3Rpb24gKG90aGVyKSB7XG5cdCAgd2FybignWW91IGFyZSB1c2luZyBkZXByZWNhdGVkIC5hd2FpdGluZygpIG1ldGhvZCwgc2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9ycG9taW5vdi9rZWZpci9pc3N1ZXMvMTQ1Jyk7XG5cdCAgcmV0dXJuIGF3YWl0aW5nKHRoaXMsIG90aGVyKTtcblx0fTtcblxuXHQvLyAoU3RyZWFtLCBGdW5jdGlvbnx1bmRlZmluZWQpIC0+IFN0cmVhbVxuXHQvLyAoUHJvcGVydHksIEZ1bmN0aW9ufHVuZGVmaW5lZCkgLT4gUHJvcGVydHlcblx0dmFyIHZhbHVlc1RvRXJyb3JzID0gX193ZWJwYWNrX3JlcXVpcmVfXyg3Nyk7XG5cdE9ic2VydmFibGUucHJvdG90eXBlLnZhbHVlc1RvRXJyb3JzID0gZnVuY3Rpb24gKGZuKSB7XG5cdCAgd2FybignWW91IGFyZSB1c2luZyBkZXByZWNhdGVkIC52YWx1ZXNUb0Vycm9ycygpIG1ldGhvZCwgc2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9ycG9taW5vdi9rZWZpci9pc3N1ZXMvMTQ5Jyk7XG5cdCAgcmV0dXJuIHZhbHVlc1RvRXJyb3JzKHRoaXMsIGZuKTtcblx0fTtcblxuXHQvLyAoU3RyZWFtLCBGdW5jdGlvbnx1bmRlZmluZWQpIC0+IFN0cmVhbVxuXHQvLyAoUHJvcGVydHksIEZ1bmN0aW9ufHVuZGVmaW5lZCkgLT4gUHJvcGVydHlcblx0dmFyIGVycm9yc1RvVmFsdWVzID0gX193ZWJwYWNrX3JlcXVpcmVfXyg3OCk7XG5cdE9ic2VydmFibGUucHJvdG90eXBlLmVycm9yc1RvVmFsdWVzID0gZnVuY3Rpb24gKGZuKSB7XG5cdCAgd2FybignWW91IGFyZSB1c2luZyBkZXByZWNhdGVkIC5lcnJvcnNUb1ZhbHVlcygpIG1ldGhvZCwgc2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9ycG9taW5vdi9rZWZpci9pc3N1ZXMvMTQ5Jyk7XG5cdCAgcmV0dXJuIGVycm9yc1RvVmFsdWVzKHRoaXMsIGZuKTtcblx0fTtcblxuXHQvLyAoU3RyZWFtKSAtPiBTdHJlYW1cblx0Ly8gKFByb3BlcnR5KSAtPiBQcm9wZXJ0eVxuXHR2YXIgZW5kT25FcnJvciA9IF9fd2VicGFja19yZXF1aXJlX18oNzkpO1xuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS5lbmRPbkVycm9yID0gZnVuY3Rpb24gKCkge1xuXHQgIHdhcm4oJ1lvdSBhcmUgdXNpbmcgZGVwcmVjYXRlZCAuZW5kT25FcnJvcigpIG1ldGhvZCwgc2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9ycG9taW5vdi9rZWZpci9pc3N1ZXMvMTUwJyk7XG5cdCAgcmV0dXJuIGVuZE9uRXJyb3IodGhpcyk7XG5cdH07XG5cbi8qKiovIH0sXG4vKiAxICovXG4vKioqLyBmdW5jdGlvbihtb2R1bGUsIGV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pIHtcblxuXHQndXNlIHN0cmljdCc7XG5cblx0dmFyIF9yZXF1aXJlID0gX193ZWJwYWNrX3JlcXVpcmVfXygyKTtcblxuXHR2YXIgZXh0ZW5kID0gX3JlcXVpcmUuZXh0ZW5kO1xuXG5cdHZhciBfcmVxdWlyZTIgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDMpO1xuXG5cdHZhciBWQUxVRSA9IF9yZXF1aXJlMi5WQUxVRTtcblx0dmFyIEVSUk9SID0gX3JlcXVpcmUyLkVSUk9SO1xuXHR2YXIgQU5ZID0gX3JlcXVpcmUyLkFOWTtcblx0dmFyIEVORCA9IF9yZXF1aXJlMi5FTkQ7XG5cblx0dmFyIF9yZXF1aXJlMyA9IF9fd2VicGFja19yZXF1aXJlX18oNCk7XG5cblx0dmFyIERpc3BhdGNoZXIgPSBfcmVxdWlyZTMuRGlzcGF0Y2hlcjtcblx0dmFyIGNhbGxTdWJzY3JpYmVyID0gX3JlcXVpcmUzLmNhbGxTdWJzY3JpYmVyO1xuXG5cdHZhciBfcmVxdWlyZTQgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDUpO1xuXG5cdHZhciBmaW5kQnlQcmVkID0gX3JlcXVpcmU0LmZpbmRCeVByZWQ7XG5cblx0ZnVuY3Rpb24gT2JzZXJ2YWJsZSgpIHtcblx0ICB0aGlzLl9kaXNwYXRjaGVyID0gbmV3IERpc3BhdGNoZXIoKTtcblx0ICB0aGlzLl9hY3RpdmUgPSBmYWxzZTtcblx0ICB0aGlzLl9hbGl2ZSA9IHRydWU7XG5cdCAgdGhpcy5fYWN0aXZhdGluZyA9IGZhbHNlO1xuXHQgIHRoaXMuX2xvZ0hhbmRsZXJzID0gbnVsbDtcblx0fVxuXG5cdGV4dGVuZChPYnNlcnZhYmxlLnByb3RvdHlwZSwge1xuXG5cdCAgX25hbWU6ICdvYnNlcnZhYmxlJyxcblxuXHQgIF9vbkFjdGl2YXRpb246IGZ1bmN0aW9uIF9vbkFjdGl2YXRpb24oKSB7fSxcblx0ICBfb25EZWFjdGl2YXRpb246IGZ1bmN0aW9uIF9vbkRlYWN0aXZhdGlvbigpIHt9LFxuXG5cdCAgX3NldEFjdGl2ZTogZnVuY3Rpb24gX3NldEFjdGl2ZShhY3RpdmUpIHtcblx0ICAgIGlmICh0aGlzLl9hY3RpdmUgIT09IGFjdGl2ZSkge1xuXHQgICAgICB0aGlzLl9hY3RpdmUgPSBhY3RpdmU7XG5cdCAgICAgIGlmIChhY3RpdmUpIHtcblx0ICAgICAgICB0aGlzLl9hY3RpdmF0aW5nID0gdHJ1ZTtcblx0ICAgICAgICB0aGlzLl9vbkFjdGl2YXRpb24oKTtcblx0ICAgICAgICB0aGlzLl9hY3RpdmF0aW5nID0gZmFsc2U7XG5cdCAgICAgIH0gZWxzZSB7XG5cdCAgICAgICAgdGhpcy5fb25EZWFjdGl2YXRpb24oKTtcblx0ICAgICAgfVxuXHQgICAgfVxuXHQgIH0sXG5cblx0ICBfY2xlYXI6IGZ1bmN0aW9uIF9jbGVhcigpIHtcblx0ICAgIHRoaXMuX3NldEFjdGl2ZShmYWxzZSk7XG5cdCAgICB0aGlzLl9kaXNwYXRjaGVyLmNsZWFudXAoKTtcblx0ICAgIHRoaXMuX2Rpc3BhdGNoZXIgPSBudWxsO1xuXHQgICAgdGhpcy5fbG9nSGFuZGxlcnMgPSBudWxsO1xuXHQgIH0sXG5cblx0ICBfZW1pdDogZnVuY3Rpb24gX2VtaXQodHlwZSwgeCkge1xuXHQgICAgc3dpdGNoICh0eXBlKSB7XG5cdCAgICAgIGNhc2UgVkFMVUU6XG5cdCAgICAgICAgcmV0dXJuIHRoaXMuX2VtaXRWYWx1ZSh4KTtcblx0ICAgICAgY2FzZSBFUlJPUjpcblx0ICAgICAgICByZXR1cm4gdGhpcy5fZW1pdEVycm9yKHgpO1xuXHQgICAgICBjYXNlIEVORDpcblx0ICAgICAgICByZXR1cm4gdGhpcy5fZW1pdEVuZCgpO1xuXHQgICAgfVxuXHQgIH0sXG5cblx0ICBfZW1pdFZhbHVlOiBmdW5jdGlvbiBfZW1pdFZhbHVlKHZhbHVlKSB7XG5cdCAgICBpZiAodGhpcy5fYWxpdmUpIHtcblx0ICAgICAgdGhpcy5fZGlzcGF0Y2hlci5kaXNwYXRjaCh7IHR5cGU6IFZBTFVFLCB2YWx1ZTogdmFsdWUgfSk7XG5cdCAgICB9XG5cdCAgfSxcblxuXHQgIF9lbWl0RXJyb3I6IGZ1bmN0aW9uIF9lbWl0RXJyb3IodmFsdWUpIHtcblx0ICAgIGlmICh0aGlzLl9hbGl2ZSkge1xuXHQgICAgICB0aGlzLl9kaXNwYXRjaGVyLmRpc3BhdGNoKHsgdHlwZTogRVJST1IsIHZhbHVlOiB2YWx1ZSB9KTtcblx0ICAgIH1cblx0ICB9LFxuXG5cdCAgX2VtaXRFbmQ6IGZ1bmN0aW9uIF9lbWl0RW5kKCkge1xuXHQgICAgaWYgKHRoaXMuX2FsaXZlKSB7XG5cdCAgICAgIHRoaXMuX2FsaXZlID0gZmFsc2U7XG5cdCAgICAgIHRoaXMuX2Rpc3BhdGNoZXIuZGlzcGF0Y2goeyB0eXBlOiBFTkQgfSk7XG5cdCAgICAgIHRoaXMuX2NsZWFyKCk7XG5cdCAgICB9XG5cdCAgfSxcblxuXHQgIF9vbjogZnVuY3Rpb24gX29uKHR5cGUsIGZuKSB7XG5cdCAgICBpZiAodGhpcy5fYWxpdmUpIHtcblx0ICAgICAgdGhpcy5fZGlzcGF0Y2hlci5hZGQodHlwZSwgZm4pO1xuXHQgICAgICB0aGlzLl9zZXRBY3RpdmUodHJ1ZSk7XG5cdCAgICB9IGVsc2Uge1xuXHQgICAgICBjYWxsU3Vic2NyaWJlcih0eXBlLCBmbiwgeyB0eXBlOiBFTkQgfSk7XG5cdCAgICB9XG5cdCAgICByZXR1cm4gdGhpcztcblx0ICB9LFxuXG5cdCAgX29mZjogZnVuY3Rpb24gX29mZih0eXBlLCBmbikge1xuXHQgICAgaWYgKHRoaXMuX2FsaXZlKSB7XG5cdCAgICAgIHZhciBjb3VudCA9IHRoaXMuX2Rpc3BhdGNoZXIucmVtb3ZlKHR5cGUsIGZuKTtcblx0ICAgICAgaWYgKGNvdW50ID09PSAwKSB7XG5cdCAgICAgICAgdGhpcy5fc2V0QWN0aXZlKGZhbHNlKTtcblx0ICAgICAgfVxuXHQgICAgfVxuXHQgICAgcmV0dXJuIHRoaXM7XG5cdCAgfSxcblxuXHQgIG9uVmFsdWU6IGZ1bmN0aW9uIG9uVmFsdWUoZm4pIHtcblx0ICAgIHJldHVybiB0aGlzLl9vbihWQUxVRSwgZm4pO1xuXHQgIH0sXG5cdCAgb25FcnJvcjogZnVuY3Rpb24gb25FcnJvcihmbikge1xuXHQgICAgcmV0dXJuIHRoaXMuX29uKEVSUk9SLCBmbik7XG5cdCAgfSxcblx0ICBvbkVuZDogZnVuY3Rpb24gb25FbmQoZm4pIHtcblx0ICAgIHJldHVybiB0aGlzLl9vbihFTkQsIGZuKTtcblx0ICB9LFxuXHQgIG9uQW55OiBmdW5jdGlvbiBvbkFueShmbikge1xuXHQgICAgcmV0dXJuIHRoaXMuX29uKEFOWSwgZm4pO1xuXHQgIH0sXG5cblx0ICBvZmZWYWx1ZTogZnVuY3Rpb24gb2ZmVmFsdWUoZm4pIHtcblx0ICAgIHJldHVybiB0aGlzLl9vZmYoVkFMVUUsIGZuKTtcblx0ICB9LFxuXHQgIG9mZkVycm9yOiBmdW5jdGlvbiBvZmZFcnJvcihmbikge1xuXHQgICAgcmV0dXJuIHRoaXMuX29mZihFUlJPUiwgZm4pO1xuXHQgIH0sXG5cdCAgb2ZmRW5kOiBmdW5jdGlvbiBvZmZFbmQoZm4pIHtcblx0ICAgIHJldHVybiB0aGlzLl9vZmYoRU5ELCBmbik7XG5cdCAgfSxcblx0ICBvZmZBbnk6IGZ1bmN0aW9uIG9mZkFueShmbikge1xuXHQgICAgcmV0dXJuIHRoaXMuX29mZihBTlksIGZuKTtcblx0ICB9LFxuXG5cdCAgLy8gQSBhbmQgQiBtdXN0IGJlIHN1YmNsYXNzZXMgb2YgU3RyZWFtIGFuZCBQcm9wZXJ0eSAob3JkZXIgZG9lc24ndCBtYXR0ZXIpXG5cdCAgX29mU2FtZVR5cGU6IGZ1bmN0aW9uIF9vZlNhbWVUeXBlKEEsIEIpIHtcblx0ICAgIHJldHVybiBBLnByb3RvdHlwZS5nZXRUeXBlKCkgPT09IHRoaXMuZ2V0VHlwZSgpID8gQSA6IEI7XG5cdCAgfSxcblxuXHQgIHNldE5hbWU6IGZ1bmN0aW9uIHNldE5hbWUoc291cmNlT2JzLCAvKiBvcHRpb25hbCAqL3NlbGZOYW1lKSB7XG5cdCAgICB0aGlzLl9uYW1lID0gc2VsZk5hbWUgPyBzb3VyY2VPYnMuX25hbWUgKyAnLicgKyBzZWxmTmFtZSA6IHNvdXJjZU9icztcblx0ICAgIHJldHVybiB0aGlzO1xuXHQgIH0sXG5cblx0ICBsb2c6IGZ1bmN0aW9uIGxvZygpIHtcblx0ICAgIHZhciBuYW1lID0gYXJndW1lbnRzLmxlbmd0aCA8PSAwIHx8IGFyZ3VtZW50c1swXSA9PT0gdW5kZWZpbmVkID8gdGhpcy50b1N0cmluZygpIDogYXJndW1lbnRzWzBdO1xuXG5cdCAgICB2YXIgaXNDdXJyZW50ID0gdW5kZWZpbmVkO1xuXHQgICAgdmFyIGhhbmRsZXIgPSBmdW5jdGlvbiBoYW5kbGVyKGV2ZW50KSB7XG5cdCAgICAgIHZhciB0eXBlID0gJzwnICsgZXZlbnQudHlwZSArIChpc0N1cnJlbnQgPyAnOmN1cnJlbnQnIDogJycpICsgJz4nO1xuXHQgICAgICBpZiAoZXZlbnQudHlwZSA9PT0gRU5EKSB7XG5cdCAgICAgICAgY29uc29sZS5sb2cobmFtZSwgdHlwZSk7XG5cdCAgICAgIH0gZWxzZSB7XG5cdCAgICAgICAgY29uc29sZS5sb2cobmFtZSwgdHlwZSwgZXZlbnQudmFsdWUpO1xuXHQgICAgICB9XG5cdCAgICB9O1xuXG5cdCAgICBpZiAodGhpcy5fYWxpdmUpIHtcblx0ICAgICAgaWYgKCF0aGlzLl9sb2dIYW5kbGVycykge1xuXHQgICAgICAgIHRoaXMuX2xvZ0hhbmRsZXJzID0gW107XG5cdCAgICAgIH1cblx0ICAgICAgdGhpcy5fbG9nSGFuZGxlcnMucHVzaCh7IG5hbWU6IG5hbWUsIGhhbmRsZXI6IGhhbmRsZXIgfSk7XG5cdCAgICB9XG5cblx0ICAgIGlzQ3VycmVudCA9IHRydWU7XG5cdCAgICB0aGlzLm9uQW55KGhhbmRsZXIpO1xuXHQgICAgaXNDdXJyZW50ID0gZmFsc2U7XG5cblx0ICAgIHJldHVybiB0aGlzO1xuXHQgIH0sXG5cblx0ICBvZmZMb2c6IGZ1bmN0aW9uIG9mZkxvZygpIHtcblx0ICAgIHZhciBuYW1lID0gYXJndW1lbnRzLmxlbmd0aCA8PSAwIHx8IGFyZ3VtZW50c1swXSA9PT0gdW5kZWZpbmVkID8gdGhpcy50b1N0cmluZygpIDogYXJndW1lbnRzWzBdO1xuXG5cdCAgICBpZiAodGhpcy5fbG9nSGFuZGxlcnMpIHtcblx0ICAgICAgdmFyIGhhbmRsZXJJbmRleCA9IGZpbmRCeVByZWQodGhpcy5fbG9nSGFuZGxlcnMsIGZ1bmN0aW9uIChvYmopIHtcblx0ICAgICAgICByZXR1cm4gb2JqLm5hbWUgPT09IG5hbWU7XG5cdCAgICAgIH0pO1xuXHQgICAgICBpZiAoaGFuZGxlckluZGV4ICE9PSAtMSkge1xuXHQgICAgICAgIHRoaXMub2ZmQW55KHRoaXMuX2xvZ0hhbmRsZXJzW2hhbmRsZXJJbmRleF0uaGFuZGxlcik7XG5cdCAgICAgICAgdGhpcy5fbG9nSGFuZGxlcnMuc3BsaWNlKGhhbmRsZXJJbmRleCwgMSk7XG5cdCAgICAgIH1cblx0ICAgIH1cblxuXHQgICAgcmV0dXJuIHRoaXM7XG5cdCAgfVxuXHR9KTtcblxuXHQvLyBleHRlbmQoKSBjYW4ndCBoYW5kbGUgYHRvU3RyaW5nYCBpbiBJRThcblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbiAoKSB7XG5cdCAgcmV0dXJuICdbJyArIHRoaXMuX25hbWUgKyAnXSc7XG5cdH07XG5cblx0bW9kdWxlLmV4cG9ydHMgPSBPYnNlcnZhYmxlO1xuXG4vKioqLyB9LFxuLyogMiAqL1xuLyoqKi8gZnVuY3Rpb24obW9kdWxlLCBleHBvcnRzKSB7XG5cblx0XCJ1c2Ugc3RyaWN0XCI7XG5cblx0ZnVuY3Rpb24gY3JlYXRlT2JqKHByb3RvKSB7XG5cdCAgdmFyIEYgPSBmdW5jdGlvbiBGKCkge307XG5cdCAgRi5wcm90b3R5cGUgPSBwcm90bztcblx0ICByZXR1cm4gbmV3IEYoKTtcblx0fVxuXG5cdGZ1bmN0aW9uIGV4dGVuZCh0YXJnZXQgLyosIG1peGluMSwgbWl4aW4yLi4uKi8pIHtcblx0ICB2YXIgbGVuZ3RoID0gYXJndW1lbnRzLmxlbmd0aCxcblx0ICAgICAgaSA9IHVuZGVmaW5lZCxcblx0ICAgICAgcHJvcCA9IHVuZGVmaW5lZDtcblx0ICBmb3IgKGkgPSAxOyBpIDwgbGVuZ3RoOyBpKyspIHtcblx0ICAgIGZvciAocHJvcCBpbiBhcmd1bWVudHNbaV0pIHtcblx0ICAgICAgdGFyZ2V0W3Byb3BdID0gYXJndW1lbnRzW2ldW3Byb3BdO1xuXHQgICAgfVxuXHQgIH1cblx0ICByZXR1cm4gdGFyZ2V0O1xuXHR9XG5cblx0ZnVuY3Rpb24gaW5oZXJpdChDaGlsZCwgUGFyZW50IC8qLCBtaXhpbjEsIG1peGluMi4uLiovKSB7XG5cdCAgdmFyIGxlbmd0aCA9IGFyZ3VtZW50cy5sZW5ndGgsXG5cdCAgICAgIGkgPSB1bmRlZmluZWQ7XG5cdCAgQ2hpbGQucHJvdG90eXBlID0gY3JlYXRlT2JqKFBhcmVudC5wcm90b3R5cGUpO1xuXHQgIENoaWxkLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IENoaWxkO1xuXHQgIGZvciAoaSA9IDI7IGkgPCBsZW5ndGg7IGkrKykge1xuXHQgICAgZXh0ZW5kKENoaWxkLnByb3RvdHlwZSwgYXJndW1lbnRzW2ldKTtcblx0ICB9XG5cdCAgcmV0dXJuIENoaWxkO1xuXHR9XG5cblx0bW9kdWxlLmV4cG9ydHMgPSB7IGV4dGVuZDogZXh0ZW5kLCBpbmhlcml0OiBpbmhlcml0IH07XG5cbi8qKiovIH0sXG4vKiAzICovXG4vKioqLyBmdW5jdGlvbihtb2R1bGUsIGV4cG9ydHMpIHtcblxuXHQndXNlIHN0cmljdCc7XG5cblx0ZXhwb3J0cy5OT1RISU5HID0gWyc8bm90aGluZz4nXTtcblx0ZXhwb3J0cy5FTkQgPSAnZW5kJztcblx0ZXhwb3J0cy5WQUxVRSA9ICd2YWx1ZSc7XG5cdGV4cG9ydHMuRVJST1IgPSAnZXJyb3InO1xuXHRleHBvcnRzLkFOWSA9ICdhbnknO1xuXG4vKioqLyB9LFxuLyogNCAqL1xuLyoqKi8gZnVuY3Rpb24obW9kdWxlLCBleHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKSB7XG5cblx0J3VzZSBzdHJpY3QnO1xuXG5cdHZhciBfcmVxdWlyZSA9IF9fd2VicGFja19yZXF1aXJlX18oMik7XG5cblx0dmFyIGV4dGVuZCA9IF9yZXF1aXJlLmV4dGVuZDtcblxuXHR2YXIgX3JlcXVpcmUyID0gX193ZWJwYWNrX3JlcXVpcmVfXygzKTtcblxuXHR2YXIgVkFMVUUgPSBfcmVxdWlyZTIuVkFMVUU7XG5cdHZhciBFUlJPUiA9IF9yZXF1aXJlMi5FUlJPUjtcblx0dmFyIEFOWSA9IF9yZXF1aXJlMi5BTlk7XG5cblx0dmFyIF9yZXF1aXJlMyA9IF9fd2VicGFja19yZXF1aXJlX18oNSk7XG5cblx0dmFyIGNvbmNhdCA9IF9yZXF1aXJlMy5jb25jYXQ7XG5cdHZhciBmaW5kQnlQcmVkID0gX3JlcXVpcmUzLmZpbmRCeVByZWQ7XG5cdHZhciBfcmVtb3ZlID0gX3JlcXVpcmUzLnJlbW92ZTtcblx0dmFyIGNvbnRhaW5zID0gX3JlcXVpcmUzLmNvbnRhaW5zO1xuXG5cdGZ1bmN0aW9uIGNhbGxTdWJzY3JpYmVyKHR5cGUsIGZuLCBldmVudCkge1xuXHQgIGlmICh0eXBlID09PSBBTlkpIHtcblx0ICAgIGZuKGV2ZW50KTtcblx0ICB9IGVsc2UgaWYgKHR5cGUgPT09IGV2ZW50LnR5cGUpIHtcblx0ICAgIGlmICh0eXBlID09PSBWQUxVRSB8fCB0eXBlID09PSBFUlJPUikge1xuXHQgICAgICBmbihldmVudC52YWx1ZSk7XG5cdCAgICB9IGVsc2Uge1xuXHQgICAgICBmbigpO1xuXHQgICAgfVxuXHQgIH1cblx0fVxuXG5cdGZ1bmN0aW9uIERpc3BhdGNoZXIoKSB7XG5cdCAgdGhpcy5faXRlbXMgPSBbXTtcblx0ICB0aGlzLl9pbkxvb3AgPSAwO1xuXHQgIHRoaXMuX3JlbW92ZWRJdGVtcyA9IG51bGw7XG5cdH1cblxuXHRleHRlbmQoRGlzcGF0Y2hlci5wcm90b3R5cGUsIHtcblxuXHQgIGFkZDogZnVuY3Rpb24gYWRkKHR5cGUsIGZuKSB7XG5cdCAgICB0aGlzLl9pdGVtcyA9IGNvbmNhdCh0aGlzLl9pdGVtcywgW3sgdHlwZTogdHlwZSwgZm46IGZuIH1dKTtcblx0ICAgIHJldHVybiB0aGlzLl9pdGVtcy5sZW5ndGg7XG5cdCAgfSxcblxuXHQgIHJlbW92ZTogZnVuY3Rpb24gcmVtb3ZlKHR5cGUsIGZuKSB7XG5cdCAgICB2YXIgaW5kZXggPSBmaW5kQnlQcmVkKHRoaXMuX2l0ZW1zLCBmdW5jdGlvbiAoeCkge1xuXHQgICAgICByZXR1cm4geC50eXBlID09PSB0eXBlICYmIHguZm4gPT09IGZuO1xuXHQgICAgfSk7XG5cblx0ICAgIC8vIGlmIHdlJ3JlIGN1cnJlbnRseSBpbiBhIG5vdGlmaWNhdGlvbiBsb29wLFxuXHQgICAgLy8gcmVtZW1iZXIgdGhpcyBzdWJzY3JpYmVyIHdhcyByZW1vdmVkXG5cdCAgICBpZiAodGhpcy5faW5Mb29wICE9PSAwICYmIGluZGV4ICE9PSAtMSkge1xuXHQgICAgICBpZiAodGhpcy5fcmVtb3ZlZEl0ZW1zID09PSBudWxsKSB7XG5cdCAgICAgICAgdGhpcy5fcmVtb3ZlZEl0ZW1zID0gW107XG5cdCAgICAgIH1cblx0ICAgICAgdGhpcy5fcmVtb3ZlZEl0ZW1zLnB1c2godGhpcy5faXRlbXNbaW5kZXhdKTtcblx0ICAgIH1cblxuXHQgICAgdGhpcy5faXRlbXMgPSBfcmVtb3ZlKHRoaXMuX2l0ZW1zLCBpbmRleCk7XG5cdCAgICByZXR1cm4gdGhpcy5faXRlbXMubGVuZ3RoO1xuXHQgIH0sXG5cblx0ICBkaXNwYXRjaDogZnVuY3Rpb24gZGlzcGF0Y2goZXZlbnQpIHtcblx0ICAgIHRoaXMuX2luTG9vcCsrO1xuXHQgICAgZm9yICh2YXIgaSA9IDAsIGl0ZW1zID0gdGhpcy5faXRlbXM7IGkgPCBpdGVtcy5sZW5ndGg7IGkrKykge1xuXG5cdCAgICAgIC8vIGNsZWFudXAgd2FzIGNhbGxlZFxuXHQgICAgICBpZiAodGhpcy5faXRlbXMgPT09IG51bGwpIHtcblx0ICAgICAgICBicmVhaztcblx0ICAgICAgfVxuXG5cdCAgICAgIC8vIHRoaXMgc3Vic2NyaWJlciB3YXMgcmVtb3ZlZFxuXHQgICAgICBpZiAodGhpcy5fcmVtb3ZlZEl0ZW1zICE9PSBudWxsICYmIGNvbnRhaW5zKHRoaXMuX3JlbW92ZWRJdGVtcywgaXRlbXNbaV0pKSB7XG5cdCAgICAgICAgY29udGludWU7XG5cdCAgICAgIH1cblxuXHQgICAgICBjYWxsU3Vic2NyaWJlcihpdGVtc1tpXS50eXBlLCBpdGVtc1tpXS5mbiwgZXZlbnQpO1xuXHQgICAgfVxuXHQgICAgdGhpcy5faW5Mb29wLS07XG5cdCAgICBpZiAodGhpcy5faW5Mb29wID09PSAwKSB7XG5cdCAgICAgIHRoaXMuX3JlbW92ZWRJdGVtcyA9IG51bGw7XG5cdCAgICB9XG5cdCAgfSxcblxuXHQgIGNsZWFudXA6IGZ1bmN0aW9uIGNsZWFudXAoKSB7XG5cdCAgICB0aGlzLl9pdGVtcyA9IG51bGw7XG5cdCAgfVxuXG5cdH0pO1xuXG5cdG1vZHVsZS5leHBvcnRzID0geyBjYWxsU3Vic2NyaWJlcjogY2FsbFN1YnNjcmliZXIsIERpc3BhdGNoZXI6IERpc3BhdGNoZXIgfTtcblxuLyoqKi8gfSxcbi8qIDUgKi9cbi8qKiovIGZ1bmN0aW9uKG1vZHVsZSwgZXhwb3J0cykge1xuXG5cdFwidXNlIHN0cmljdFwiO1xuXG5cdGZ1bmN0aW9uIGNvbmNhdChhLCBiKSB7XG5cdCAgdmFyIHJlc3VsdCA9IHVuZGVmaW5lZCxcblx0ICAgICAgbGVuZ3RoID0gdW5kZWZpbmVkLFxuXHQgICAgICBpID0gdW5kZWZpbmVkLFxuXHQgICAgICBqID0gdW5kZWZpbmVkO1xuXHQgIGlmIChhLmxlbmd0aCA9PT0gMCkge1xuXHQgICAgcmV0dXJuIGI7XG5cdCAgfVxuXHQgIGlmIChiLmxlbmd0aCA9PT0gMCkge1xuXHQgICAgcmV0dXJuIGE7XG5cdCAgfVxuXHQgIGogPSAwO1xuXHQgIHJlc3VsdCA9IG5ldyBBcnJheShhLmxlbmd0aCArIGIubGVuZ3RoKTtcblx0ICBsZW5ndGggPSBhLmxlbmd0aDtcblx0ICBmb3IgKGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyssIGorKykge1xuXHQgICAgcmVzdWx0W2pdID0gYVtpXTtcblx0ICB9XG5cdCAgbGVuZ3RoID0gYi5sZW5ndGg7XG5cdCAgZm9yIChpID0gMDsgaSA8IGxlbmd0aDsgaSsrLCBqKyspIHtcblx0ICAgIHJlc3VsdFtqXSA9IGJbaV07XG5cdCAgfVxuXHQgIHJldHVybiByZXN1bHQ7XG5cdH1cblxuXHRmdW5jdGlvbiBjaXJjbGVTaGlmdChhcnIsIGRpc3RhbmNlKSB7XG5cdCAgdmFyIGxlbmd0aCA9IGFyci5sZW5ndGgsXG5cdCAgICAgIHJlc3VsdCA9IG5ldyBBcnJheShsZW5ndGgpLFxuXHQgICAgICBpID0gdW5kZWZpbmVkO1xuXHQgIGZvciAoaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuXHQgICAgcmVzdWx0WyhpICsgZGlzdGFuY2UpICUgbGVuZ3RoXSA9IGFycltpXTtcblx0ICB9XG5cdCAgcmV0dXJuIHJlc3VsdDtcblx0fVxuXG5cdGZ1bmN0aW9uIGZpbmQoYXJyLCB2YWx1ZSkge1xuXHQgIHZhciBsZW5ndGggPSBhcnIubGVuZ3RoLFxuXHQgICAgICBpID0gdW5kZWZpbmVkO1xuXHQgIGZvciAoaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuXHQgICAgaWYgKGFycltpXSA9PT0gdmFsdWUpIHtcblx0ICAgICAgcmV0dXJuIGk7XG5cdCAgICB9XG5cdCAgfVxuXHQgIHJldHVybiAtMTtcblx0fVxuXG5cdGZ1bmN0aW9uIGZpbmRCeVByZWQoYXJyLCBwcmVkKSB7XG5cdCAgdmFyIGxlbmd0aCA9IGFyci5sZW5ndGgsXG5cdCAgICAgIGkgPSB1bmRlZmluZWQ7XG5cdCAgZm9yIChpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG5cdCAgICBpZiAocHJlZChhcnJbaV0pKSB7XG5cdCAgICAgIHJldHVybiBpO1xuXHQgICAgfVxuXHQgIH1cblx0ICByZXR1cm4gLTE7XG5cdH1cblxuXHRmdW5jdGlvbiBjbG9uZUFycmF5KGlucHV0KSB7XG5cdCAgdmFyIGxlbmd0aCA9IGlucHV0Lmxlbmd0aCxcblx0ICAgICAgcmVzdWx0ID0gbmV3IEFycmF5KGxlbmd0aCksXG5cdCAgICAgIGkgPSB1bmRlZmluZWQ7XG5cdCAgZm9yIChpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG5cdCAgICByZXN1bHRbaV0gPSBpbnB1dFtpXTtcblx0ICB9XG5cdCAgcmV0dXJuIHJlc3VsdDtcblx0fVxuXG5cdGZ1bmN0aW9uIHJlbW92ZShpbnB1dCwgaW5kZXgpIHtcblx0ICB2YXIgbGVuZ3RoID0gaW5wdXQubGVuZ3RoLFxuXHQgICAgICByZXN1bHQgPSB1bmRlZmluZWQsXG5cdCAgICAgIGkgPSB1bmRlZmluZWQsXG5cdCAgICAgIGogPSB1bmRlZmluZWQ7XG5cdCAgaWYgKGluZGV4ID49IDAgJiYgaW5kZXggPCBsZW5ndGgpIHtcblx0ICAgIGlmIChsZW5ndGggPT09IDEpIHtcblx0ICAgICAgcmV0dXJuIFtdO1xuXHQgICAgfSBlbHNlIHtcblx0ICAgICAgcmVzdWx0ID0gbmV3IEFycmF5KGxlbmd0aCAtIDEpO1xuXHQgICAgICBmb3IgKGkgPSAwLCBqID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG5cdCAgICAgICAgaWYgKGkgIT09IGluZGV4KSB7XG5cdCAgICAgICAgICByZXN1bHRbal0gPSBpbnB1dFtpXTtcblx0ICAgICAgICAgIGorKztcblx0ICAgICAgICB9XG5cdCAgICAgIH1cblx0ICAgICAgcmV0dXJuIHJlc3VsdDtcblx0ICAgIH1cblx0ICB9IGVsc2Uge1xuXHQgICAgcmV0dXJuIGlucHV0O1xuXHQgIH1cblx0fVxuXG5cdGZ1bmN0aW9uIHJlbW92ZUJ5UHJlZChpbnB1dCwgcHJlZCkge1xuXHQgIHJldHVybiByZW1vdmUoaW5wdXQsIGZpbmRCeVByZWQoaW5wdXQsIHByZWQpKTtcblx0fVxuXG5cdGZ1bmN0aW9uIG1hcChpbnB1dCwgZm4pIHtcblx0ICB2YXIgbGVuZ3RoID0gaW5wdXQubGVuZ3RoLFxuXHQgICAgICByZXN1bHQgPSBuZXcgQXJyYXkobGVuZ3RoKSxcblx0ICAgICAgaSA9IHVuZGVmaW5lZDtcblx0ICBmb3IgKGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcblx0ICAgIHJlc3VsdFtpXSA9IGZuKGlucHV0W2ldKTtcblx0ICB9XG5cdCAgcmV0dXJuIHJlc3VsdDtcblx0fVxuXG5cdGZ1bmN0aW9uIGZvckVhY2goYXJyLCBmbikge1xuXHQgIHZhciBsZW5ndGggPSBhcnIubGVuZ3RoLFxuXHQgICAgICBpID0gdW5kZWZpbmVkO1xuXHQgIGZvciAoaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuXHQgICAgZm4oYXJyW2ldKTtcblx0ICB9XG5cdH1cblxuXHRmdW5jdGlvbiBmaWxsQXJyYXkoYXJyLCB2YWx1ZSkge1xuXHQgIHZhciBsZW5ndGggPSBhcnIubGVuZ3RoLFxuXHQgICAgICBpID0gdW5kZWZpbmVkO1xuXHQgIGZvciAoaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuXHQgICAgYXJyW2ldID0gdmFsdWU7XG5cdCAgfVxuXHR9XG5cblx0ZnVuY3Rpb24gY29udGFpbnMoYXJyLCB2YWx1ZSkge1xuXHQgIHJldHVybiBmaW5kKGFyciwgdmFsdWUpICE9PSAtMTtcblx0fVxuXG5cdGZ1bmN0aW9uIHNsaWRlKGN1ciwgbmV4dCwgbWF4KSB7XG5cdCAgdmFyIGxlbmd0aCA9IE1hdGgubWluKG1heCwgY3VyLmxlbmd0aCArIDEpLFxuXHQgICAgICBvZmZzZXQgPSBjdXIubGVuZ3RoIC0gbGVuZ3RoICsgMSxcblx0ICAgICAgcmVzdWx0ID0gbmV3IEFycmF5KGxlbmd0aCksXG5cdCAgICAgIGkgPSB1bmRlZmluZWQ7XG5cdCAgZm9yIChpID0gb2Zmc2V0OyBpIDwgbGVuZ3RoOyBpKyspIHtcblx0ICAgIHJlc3VsdFtpIC0gb2Zmc2V0XSA9IGN1cltpXTtcblx0ICB9XG5cdCAgcmVzdWx0W2xlbmd0aCAtIDFdID0gbmV4dDtcblx0ICByZXR1cm4gcmVzdWx0O1xuXHR9XG5cblx0bW9kdWxlLmV4cG9ydHMgPSB7XG5cdCAgY29uY2F0OiBjb25jYXQsXG5cdCAgY2lyY2xlU2hpZnQ6IGNpcmNsZVNoaWZ0LFxuXHQgIGZpbmQ6IGZpbmQsXG5cdCAgZmluZEJ5UHJlZDogZmluZEJ5UHJlZCxcblx0ICBjbG9uZUFycmF5OiBjbG9uZUFycmF5LFxuXHQgIHJlbW92ZTogcmVtb3ZlLFxuXHQgIHJlbW92ZUJ5UHJlZDogcmVtb3ZlQnlQcmVkLFxuXHQgIG1hcDogbWFwLFxuXHQgIGZvckVhY2g6IGZvckVhY2gsXG5cdCAgZmlsbEFycmF5OiBmaWxsQXJyYXksXG5cdCAgY29udGFpbnM6IGNvbnRhaW5zLFxuXHQgIHNsaWRlOiBzbGlkZVxuXHR9O1xuXG4vKioqLyB9LFxuLyogNiAqL1xuLyoqKi8gZnVuY3Rpb24obW9kdWxlLCBleHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKSB7XG5cblx0J3VzZSBzdHJpY3QnO1xuXG5cdHZhciBfcmVxdWlyZSA9IF9fd2VicGFja19yZXF1aXJlX18oMik7XG5cblx0dmFyIGluaGVyaXQgPSBfcmVxdWlyZS5pbmhlcml0O1xuXG5cdHZhciBPYnNlcnZhYmxlID0gX193ZWJwYWNrX3JlcXVpcmVfXygxKTtcblxuXHRmdW5jdGlvbiBTdHJlYW0oKSB7XG5cdCAgT2JzZXJ2YWJsZS5jYWxsKHRoaXMpO1xuXHR9XG5cblx0aW5oZXJpdChTdHJlYW0sIE9ic2VydmFibGUsIHtcblxuXHQgIF9uYW1lOiAnc3RyZWFtJyxcblxuXHQgIGdldFR5cGU6IGZ1bmN0aW9uIGdldFR5cGUoKSB7XG5cdCAgICByZXR1cm4gJ3N0cmVhbSc7XG5cdCAgfVxuXG5cdH0pO1xuXG5cdG1vZHVsZS5leHBvcnRzID0gU3RyZWFtO1xuXG4vKioqLyB9LFxuLyogNyAqL1xuLyoqKi8gZnVuY3Rpb24obW9kdWxlLCBleHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKSB7XG5cblx0J3VzZSBzdHJpY3QnO1xuXG5cdHZhciBfcmVxdWlyZSA9IF9fd2VicGFja19yZXF1aXJlX18oMik7XG5cblx0dmFyIGluaGVyaXQgPSBfcmVxdWlyZS5pbmhlcml0O1xuXG5cdHZhciBfcmVxdWlyZTIgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDMpO1xuXG5cdHZhciBWQUxVRSA9IF9yZXF1aXJlMi5WQUxVRTtcblx0dmFyIEVSUk9SID0gX3JlcXVpcmUyLkVSUk9SO1xuXHR2YXIgRU5EID0gX3JlcXVpcmUyLkVORDtcblxuXHR2YXIgX3JlcXVpcmUzID0gX193ZWJwYWNrX3JlcXVpcmVfXyg0KTtcblxuXHR2YXIgY2FsbFN1YnNjcmliZXIgPSBfcmVxdWlyZTMuY2FsbFN1YnNjcmliZXI7XG5cblx0dmFyIE9ic2VydmFibGUgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDEpO1xuXG5cdGZ1bmN0aW9uIFByb3BlcnR5KCkge1xuXHQgIE9ic2VydmFibGUuY2FsbCh0aGlzKTtcblx0ICB0aGlzLl9jdXJyZW50RXZlbnQgPSBudWxsO1xuXHR9XG5cblx0aW5oZXJpdChQcm9wZXJ0eSwgT2JzZXJ2YWJsZSwge1xuXG5cdCAgX25hbWU6ICdwcm9wZXJ0eScsXG5cblx0ICBfZW1pdFZhbHVlOiBmdW5jdGlvbiBfZW1pdFZhbHVlKHZhbHVlKSB7XG5cdCAgICBpZiAodGhpcy5fYWxpdmUpIHtcblx0ICAgICAgdGhpcy5fY3VycmVudEV2ZW50ID0geyB0eXBlOiBWQUxVRSwgdmFsdWU6IHZhbHVlIH07XG5cdCAgICAgIGlmICghdGhpcy5fYWN0aXZhdGluZykge1xuXHQgICAgICAgIHRoaXMuX2Rpc3BhdGNoZXIuZGlzcGF0Y2goeyB0eXBlOiBWQUxVRSwgdmFsdWU6IHZhbHVlIH0pO1xuXHQgICAgICB9XG5cdCAgICB9XG5cdCAgfSxcblxuXHQgIF9lbWl0RXJyb3I6IGZ1bmN0aW9uIF9lbWl0RXJyb3IodmFsdWUpIHtcblx0ICAgIGlmICh0aGlzLl9hbGl2ZSkge1xuXHQgICAgICB0aGlzLl9jdXJyZW50RXZlbnQgPSB7IHR5cGU6IEVSUk9SLCB2YWx1ZTogdmFsdWUgfTtcblx0ICAgICAgaWYgKCF0aGlzLl9hY3RpdmF0aW5nKSB7XG5cdCAgICAgICAgdGhpcy5fZGlzcGF0Y2hlci5kaXNwYXRjaCh7IHR5cGU6IEVSUk9SLCB2YWx1ZTogdmFsdWUgfSk7XG5cdCAgICAgIH1cblx0ICAgIH1cblx0ICB9LFxuXG5cdCAgX2VtaXRFbmQ6IGZ1bmN0aW9uIF9lbWl0RW5kKCkge1xuXHQgICAgaWYgKHRoaXMuX2FsaXZlKSB7XG5cdCAgICAgIHRoaXMuX2FsaXZlID0gZmFsc2U7XG5cdCAgICAgIGlmICghdGhpcy5fYWN0aXZhdGluZykge1xuXHQgICAgICAgIHRoaXMuX2Rpc3BhdGNoZXIuZGlzcGF0Y2goeyB0eXBlOiBFTkQgfSk7XG5cdCAgICAgIH1cblx0ICAgICAgdGhpcy5fY2xlYXIoKTtcblx0ICAgIH1cblx0ICB9LFxuXG5cdCAgX29uOiBmdW5jdGlvbiBfb24odHlwZSwgZm4pIHtcblx0ICAgIGlmICh0aGlzLl9hbGl2ZSkge1xuXHQgICAgICB0aGlzLl9kaXNwYXRjaGVyLmFkZCh0eXBlLCBmbik7XG5cdCAgICAgIHRoaXMuX3NldEFjdGl2ZSh0cnVlKTtcblx0ICAgIH1cblx0ICAgIGlmICh0aGlzLl9jdXJyZW50RXZlbnQgIT09IG51bGwpIHtcblx0ICAgICAgY2FsbFN1YnNjcmliZXIodHlwZSwgZm4sIHRoaXMuX2N1cnJlbnRFdmVudCk7XG5cdCAgICB9XG5cdCAgICBpZiAoIXRoaXMuX2FsaXZlKSB7XG5cdCAgICAgIGNhbGxTdWJzY3JpYmVyKHR5cGUsIGZuLCB7IHR5cGU6IEVORCB9KTtcblx0ICAgIH1cblx0ICAgIHJldHVybiB0aGlzO1xuXHQgIH0sXG5cblx0ICBnZXRUeXBlOiBmdW5jdGlvbiBnZXRUeXBlKCkge1xuXHQgICAgcmV0dXJuICdwcm9wZXJ0eSc7XG5cdCAgfVxuXG5cdH0pO1xuXG5cdG1vZHVsZS5leHBvcnRzID0gUHJvcGVydHk7XG5cbi8qKiovIH0sXG4vKiA4ICovXG4vKioqLyBmdW5jdGlvbihtb2R1bGUsIGV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pIHtcblxuXHQndXNlIHN0cmljdCc7XG5cblx0dmFyIFN0cmVhbSA9IF9fd2VicGFja19yZXF1aXJlX18oNik7XG5cblx0dmFyIG5ldmVyUyA9IG5ldyBTdHJlYW0oKTtcblx0bmV2ZXJTLl9lbWl0RW5kKCk7XG5cdG5ldmVyUy5fbmFtZSA9ICduZXZlcic7XG5cblx0bW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBuZXZlcigpIHtcblx0ICByZXR1cm4gbmV2ZXJTO1xuXHR9O1xuXG4vKioqLyB9LFxuLyogOSAqL1xuLyoqKi8gZnVuY3Rpb24obW9kdWxlLCBleHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKSB7XG5cblx0J3VzZSBzdHJpY3QnO1xuXG5cdHZhciB0aW1lQmFzZWQgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDEwKTtcblxuXHR2YXIgUyA9IHRpbWVCYXNlZCh7XG5cblx0ICBfbmFtZTogJ2xhdGVyJyxcblxuXHQgIF9pbml0OiBmdW5jdGlvbiBfaW5pdChfcmVmKSB7XG5cdCAgICB2YXIgeCA9IF9yZWYueDtcblxuXHQgICAgdGhpcy5feCA9IHg7XG5cdCAgfSxcblxuXHQgIF9mcmVlOiBmdW5jdGlvbiBfZnJlZSgpIHtcblx0ICAgIHRoaXMuX3ggPSBudWxsO1xuXHQgIH0sXG5cblx0ICBfb25UaWNrOiBmdW5jdGlvbiBfb25UaWNrKCkge1xuXHQgICAgdGhpcy5fZW1pdFZhbHVlKHRoaXMuX3gpO1xuXHQgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgIH1cblxuXHR9KTtcblxuXHRtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGxhdGVyKHdhaXQsIHgpIHtcblx0ICByZXR1cm4gbmV3IFMod2FpdCwgeyB4OiB4IH0pO1xuXHR9O1xuXG4vKioqLyB9LFxuLyogMTAgKi9cbi8qKiovIGZ1bmN0aW9uKG1vZHVsZSwgZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXykge1xuXG5cdCd1c2Ugc3RyaWN0JztcblxuXHR2YXIgX3JlcXVpcmUgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDIpO1xuXG5cdHZhciBpbmhlcml0ID0gX3JlcXVpcmUuaW5oZXJpdDtcblxuXHR2YXIgU3RyZWFtID0gX193ZWJwYWNrX3JlcXVpcmVfXyg2KTtcblxuXHRtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIHRpbWVCYXNlZChtaXhpbikge1xuXG5cdCAgZnVuY3Rpb24gQW5vbnltb3VzU3RyZWFtKHdhaXQsIG9wdGlvbnMpIHtcblx0ICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cblx0ICAgIFN0cmVhbS5jYWxsKHRoaXMpO1xuXHQgICAgdGhpcy5fd2FpdCA9IHdhaXQ7XG5cdCAgICB0aGlzLl9pbnRlcnZhbElkID0gbnVsbDtcblx0ICAgIHRoaXMuXyRvblRpY2sgPSBmdW5jdGlvbiAoKSB7XG5cdCAgICAgIHJldHVybiBfdGhpcy5fb25UaWNrKCk7XG5cdCAgICB9O1xuXHQgICAgdGhpcy5faW5pdChvcHRpb25zKTtcblx0ICB9XG5cblx0ICBpbmhlcml0KEFub255bW91c1N0cmVhbSwgU3RyZWFtLCB7XG5cblx0ICAgIF9pbml0OiBmdW5jdGlvbiBfaW5pdCgpIHt9LFxuXHQgICAgX2ZyZWU6IGZ1bmN0aW9uIF9mcmVlKCkge30sXG5cblx0ICAgIF9vblRpY2s6IGZ1bmN0aW9uIF9vblRpY2soKSB7fSxcblxuXHQgICAgX29uQWN0aXZhdGlvbjogZnVuY3Rpb24gX29uQWN0aXZhdGlvbigpIHtcblx0ICAgICAgdGhpcy5faW50ZXJ2YWxJZCA9IHNldEludGVydmFsKHRoaXMuXyRvblRpY2ssIHRoaXMuX3dhaXQpO1xuXHQgICAgfSxcblxuXHQgICAgX29uRGVhY3RpdmF0aW9uOiBmdW5jdGlvbiBfb25EZWFjdGl2YXRpb24oKSB7XG5cdCAgICAgIGlmICh0aGlzLl9pbnRlcnZhbElkICE9PSBudWxsKSB7XG5cdCAgICAgICAgY2xlYXJJbnRlcnZhbCh0aGlzLl9pbnRlcnZhbElkKTtcblx0ICAgICAgICB0aGlzLl9pbnRlcnZhbElkID0gbnVsbDtcblx0ICAgICAgfVxuXHQgICAgfSxcblxuXHQgICAgX2NsZWFyOiBmdW5jdGlvbiBfY2xlYXIoKSB7XG5cdCAgICAgIFN0cmVhbS5wcm90b3R5cGUuX2NsZWFyLmNhbGwodGhpcyk7XG5cdCAgICAgIHRoaXMuXyRvblRpY2sgPSBudWxsO1xuXHQgICAgICB0aGlzLl9mcmVlKCk7XG5cdCAgICB9XG5cblx0ICB9LCBtaXhpbik7XG5cblx0ICByZXR1cm4gQW5vbnltb3VzU3RyZWFtO1xuXHR9O1xuXG4vKioqLyB9LFxuLyogMTEgKi9cbi8qKiovIGZ1bmN0aW9uKG1vZHVsZSwgZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXykge1xuXG5cdCd1c2Ugc3RyaWN0JztcblxuXHR2YXIgdGltZUJhc2VkID0gX193ZWJwYWNrX3JlcXVpcmVfXygxMCk7XG5cblx0dmFyIFMgPSB0aW1lQmFzZWQoe1xuXG5cdCAgX25hbWU6ICdpbnRlcnZhbCcsXG5cblx0ICBfaW5pdDogZnVuY3Rpb24gX2luaXQoX3JlZikge1xuXHQgICAgdmFyIHggPSBfcmVmLng7XG5cblx0ICAgIHRoaXMuX3ggPSB4O1xuXHQgIH0sXG5cblx0ICBfZnJlZTogZnVuY3Rpb24gX2ZyZWUoKSB7XG5cdCAgICB0aGlzLl94ID0gbnVsbDtcblx0ICB9LFxuXG5cdCAgX29uVGljazogZnVuY3Rpb24gX29uVGljaygpIHtcblx0ICAgIHRoaXMuX2VtaXRWYWx1ZSh0aGlzLl94KTtcblx0ICB9XG5cblx0fSk7XG5cblx0bW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBpbnRlcnZhbCh3YWl0LCB4KSB7XG5cdCAgcmV0dXJuIG5ldyBTKHdhaXQsIHsgeDogeCB9KTtcblx0fTtcblxuLyoqKi8gfSxcbi8qIDEyICovXG4vKioqLyBmdW5jdGlvbihtb2R1bGUsIGV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pIHtcblxuXHQndXNlIHN0cmljdCc7XG5cblx0dmFyIHRpbWVCYXNlZCA9IF9fd2VicGFja19yZXF1aXJlX18oMTApO1xuXG5cdHZhciBfcmVxdWlyZSA9IF9fd2VicGFja19yZXF1aXJlX18oNSk7XG5cblx0dmFyIGNsb25lQXJyYXkgPSBfcmVxdWlyZS5jbG9uZUFycmF5O1xuXG5cdHZhciBuZXZlciA9IF9fd2VicGFja19yZXF1aXJlX18oOCk7XG5cblx0dmFyIFMgPSB0aW1lQmFzZWQoe1xuXG5cdCAgX25hbWU6ICdzZXF1ZW50aWFsbHknLFxuXG5cdCAgX2luaXQ6IGZ1bmN0aW9uIF9pbml0KF9yZWYpIHtcblx0ICAgIHZhciB4cyA9IF9yZWYueHM7XG5cblx0ICAgIHRoaXMuX3hzID0gY2xvbmVBcnJheSh4cyk7XG5cdCAgfSxcblxuXHQgIF9mcmVlOiBmdW5jdGlvbiBfZnJlZSgpIHtcblx0ICAgIHRoaXMuX3hzID0gbnVsbDtcblx0ICB9LFxuXG5cdCAgX29uVGljazogZnVuY3Rpb24gX29uVGljaygpIHtcblx0ICAgIGlmICh0aGlzLl94cy5sZW5ndGggPT09IDEpIHtcblx0ICAgICAgdGhpcy5fZW1pdFZhbHVlKHRoaXMuX3hzWzBdKTtcblx0ICAgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgICAgfSBlbHNlIHtcblx0ICAgICAgdGhpcy5fZW1pdFZhbHVlKHRoaXMuX3hzLnNoaWZ0KCkpO1xuXHQgICAgfVxuXHQgIH1cblxuXHR9KTtcblxuXHRtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIHNlcXVlbnRpYWxseSh3YWl0LCB4cykge1xuXHQgIHJldHVybiB4cy5sZW5ndGggPT09IDAgPyBuZXZlcigpIDogbmV3IFMod2FpdCwgeyB4czogeHMgfSk7XG5cdH07XG5cbi8qKiovIH0sXG4vKiAxMyAqL1xuLyoqKi8gZnVuY3Rpb24obW9kdWxlLCBleHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKSB7XG5cblx0J3VzZSBzdHJpY3QnO1xuXG5cdHZhciB0aW1lQmFzZWQgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDEwKTtcblxuXHR2YXIgUyA9IHRpbWVCYXNlZCh7XG5cblx0ICBfbmFtZTogJ2Zyb21Qb2xsJyxcblxuXHQgIF9pbml0OiBmdW5jdGlvbiBfaW5pdChfcmVmKSB7XG5cdCAgICB2YXIgZm4gPSBfcmVmLmZuO1xuXG5cdCAgICB0aGlzLl9mbiA9IGZuO1xuXHQgIH0sXG5cblx0ICBfZnJlZTogZnVuY3Rpb24gX2ZyZWUoKSB7XG5cdCAgICB0aGlzLl9mbiA9IG51bGw7XG5cdCAgfSxcblxuXHQgIF9vblRpY2s6IGZ1bmN0aW9uIF9vblRpY2soKSB7XG5cdCAgICB2YXIgZm4gPSB0aGlzLl9mbjtcblx0ICAgIHRoaXMuX2VtaXRWYWx1ZShmbigpKTtcblx0ICB9XG5cblx0fSk7XG5cblx0bW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBmcm9tUG9sbCh3YWl0LCBmbikge1xuXHQgIHJldHVybiBuZXcgUyh3YWl0LCB7IGZuOiBmbiB9KTtcblx0fTtcblxuLyoqKi8gfSxcbi8qIDE0ICovXG4vKioqLyBmdW5jdGlvbihtb2R1bGUsIGV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pIHtcblxuXHQndXNlIHN0cmljdCc7XG5cblx0dmFyIHRpbWVCYXNlZCA9IF9fd2VicGFja19yZXF1aXJlX18oMTApO1xuXHR2YXIgZW1pdHRlciA9IF9fd2VicGFja19yZXF1aXJlX18oMTUpO1xuXG5cdHZhciBTID0gdGltZUJhc2VkKHtcblxuXHQgIF9uYW1lOiAnd2l0aEludGVydmFsJyxcblxuXHQgIF9pbml0OiBmdW5jdGlvbiBfaW5pdChfcmVmKSB7XG5cdCAgICB2YXIgZm4gPSBfcmVmLmZuO1xuXG5cdCAgICB0aGlzLl9mbiA9IGZuO1xuXHQgICAgdGhpcy5fZW1pdHRlciA9IGVtaXR0ZXIodGhpcyk7XG5cdCAgfSxcblxuXHQgIF9mcmVlOiBmdW5jdGlvbiBfZnJlZSgpIHtcblx0ICAgIHRoaXMuX2ZuID0gbnVsbDtcblx0ICAgIHRoaXMuX2VtaXR0ZXIgPSBudWxsO1xuXHQgIH0sXG5cblx0ICBfb25UaWNrOiBmdW5jdGlvbiBfb25UaWNrKCkge1xuXHQgICAgdmFyIGZuID0gdGhpcy5fZm47XG5cdCAgICBmbih0aGlzLl9lbWl0dGVyKTtcblx0ICB9XG5cblx0fSk7XG5cblx0bW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiB3aXRoSW50ZXJ2YWwod2FpdCwgZm4pIHtcblx0ICByZXR1cm4gbmV3IFMod2FpdCwgeyBmbjogZm4gfSk7XG5cdH07XG5cbi8qKiovIH0sXG4vKiAxNSAqL1xuLyoqKi8gZnVuY3Rpb24obW9kdWxlLCBleHBvcnRzKSB7XG5cblx0XCJ1c2Ugc3RyaWN0XCI7XG5cblx0bW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBlbWl0dGVyKG9icykge1xuXG5cdCAgZnVuY3Rpb24gdmFsdWUoeCkge1xuXHQgICAgb2JzLl9lbWl0VmFsdWUoeCk7XG5cdCAgICByZXR1cm4gb2JzLl9hY3RpdmU7XG5cdCAgfVxuXG5cdCAgZnVuY3Rpb24gZXJyb3IoeCkge1xuXHQgICAgb2JzLl9lbWl0RXJyb3IoeCk7XG5cdCAgICByZXR1cm4gb2JzLl9hY3RpdmU7XG5cdCAgfVxuXG5cdCAgZnVuY3Rpb24gZW5kKCkge1xuXHQgICAgb2JzLl9lbWl0RW5kKCk7XG5cdCAgICByZXR1cm4gb2JzLl9hY3RpdmU7XG5cdCAgfVxuXG5cdCAgZnVuY3Rpb24gZXZlbnQoZSkge1xuXHQgICAgb2JzLl9lbWl0KGUudHlwZSwgZS52YWx1ZSk7XG5cdCAgICByZXR1cm4gb2JzLl9hY3RpdmU7XG5cdCAgfVxuXG5cdCAgcmV0dXJuIHsgdmFsdWU6IHZhbHVlLCBlcnJvcjogZXJyb3IsIGVuZDogZW5kLCBldmVudDogZXZlbnQsIGVtaXQ6IHZhbHVlLCBlbWl0RXZlbnQ6IGV2ZW50IH07XG5cdH07XG5cbi8qKiovIH0sXG4vKiAxNiAqL1xuLyoqKi8gZnVuY3Rpb24obW9kdWxlLCBleHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKSB7XG5cblx0J3VzZSBzdHJpY3QnO1xuXG5cdHZhciBzdHJlYW0gPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDE3KTtcblxuXHRtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGZyb21DYWxsYmFjayhjYWxsYmFja0NvbnN1bWVyKSB7XG5cblx0ICB2YXIgY2FsbGVkID0gZmFsc2U7XG5cblx0ICByZXR1cm4gc3RyZWFtKGZ1bmN0aW9uIChlbWl0dGVyKSB7XG5cblx0ICAgIGlmICghY2FsbGVkKSB7XG5cdCAgICAgIGNhbGxiYWNrQ29uc3VtZXIoZnVuY3Rpb24gKHgpIHtcblx0ICAgICAgICBlbWl0dGVyLmVtaXQoeCk7XG5cdCAgICAgICAgZW1pdHRlci5lbmQoKTtcblx0ICAgICAgfSk7XG5cdCAgICAgIGNhbGxlZCA9IHRydWU7XG5cdCAgICB9XG5cdCAgfSkuc2V0TmFtZSgnZnJvbUNhbGxiYWNrJyk7XG5cdH07XG5cbi8qKiovIH0sXG4vKiAxNyAqL1xuLyoqKi8gZnVuY3Rpb24obW9kdWxlLCBleHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKSB7XG5cblx0J3VzZSBzdHJpY3QnO1xuXG5cdHZhciBfcmVxdWlyZSA9IF9fd2VicGFja19yZXF1aXJlX18oMik7XG5cblx0dmFyIGluaGVyaXQgPSBfcmVxdWlyZS5pbmhlcml0O1xuXG5cdHZhciBTdHJlYW0gPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDYpO1xuXHR2YXIgZW1pdHRlciA9IF9fd2VicGFja19yZXF1aXJlX18oMTUpO1xuXG5cdGZ1bmN0aW9uIFMoZm4pIHtcblx0ICBTdHJlYW0uY2FsbCh0aGlzKTtcblx0ICB0aGlzLl9mbiA9IGZuO1xuXHQgIHRoaXMuX3Vuc3Vic2NyaWJlID0gbnVsbDtcblx0fVxuXG5cdGluaGVyaXQoUywgU3RyZWFtLCB7XG5cblx0ICBfbmFtZTogJ3N0cmVhbScsXG5cblx0ICBfb25BY3RpdmF0aW9uOiBmdW5jdGlvbiBfb25BY3RpdmF0aW9uKCkge1xuXHQgICAgdmFyIGZuID0gdGhpcy5fZm47XG5cdCAgICB2YXIgdW5zdWJzY3JpYmUgPSBmbihlbWl0dGVyKHRoaXMpKTtcblx0ICAgIHRoaXMuX3Vuc3Vic2NyaWJlID0gdHlwZW9mIHVuc3Vic2NyaWJlID09PSAnZnVuY3Rpb24nID8gdW5zdWJzY3JpYmUgOiBudWxsO1xuXG5cdCAgICAvLyBmaXggaHR0cHM6Ly9naXRodWIuY29tL3Jwb21pbm92L2tlZmlyL2lzc3Vlcy8zNVxuXHQgICAgaWYgKCF0aGlzLl9hY3RpdmUpIHtcblx0ICAgICAgdGhpcy5fY2FsbFVuc3Vic2NyaWJlKCk7XG5cdCAgICB9XG5cdCAgfSxcblxuXHQgIF9jYWxsVW5zdWJzY3JpYmU6IGZ1bmN0aW9uIF9jYWxsVW5zdWJzY3JpYmUoKSB7XG5cdCAgICBpZiAodGhpcy5fdW5zdWJzY3JpYmUgIT09IG51bGwpIHtcblx0ICAgICAgdGhpcy5fdW5zdWJzY3JpYmUoKTtcblx0ICAgICAgdGhpcy5fdW5zdWJzY3JpYmUgPSBudWxsO1xuXHQgICAgfVxuXHQgIH0sXG5cblx0ICBfb25EZWFjdGl2YXRpb246IGZ1bmN0aW9uIF9vbkRlYWN0aXZhdGlvbigpIHtcblx0ICAgIHRoaXMuX2NhbGxVbnN1YnNjcmliZSgpO1xuXHQgIH0sXG5cblx0ICBfY2xlYXI6IGZ1bmN0aW9uIF9jbGVhcigpIHtcblx0ICAgIFN0cmVhbS5wcm90b3R5cGUuX2NsZWFyLmNhbGwodGhpcyk7XG5cdCAgICB0aGlzLl9mbiA9IG51bGw7XG5cdCAgfVxuXG5cdH0pO1xuXG5cdG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gc3RyZWFtKGZuKSB7XG5cdCAgcmV0dXJuIG5ldyBTKGZuKTtcblx0fTtcblxuLyoqKi8gfSxcbi8qIDE4ICovXG4vKioqLyBmdW5jdGlvbihtb2R1bGUsIGV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pIHtcblxuXHQndXNlIHN0cmljdCc7XG5cblx0dmFyIHN0cmVhbSA9IF9fd2VicGFja19yZXF1aXJlX18oMTcpO1xuXG5cdG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gZnJvbU5vZGVDYWxsYmFjayhjYWxsYmFja0NvbnN1bWVyKSB7XG5cblx0ICB2YXIgY2FsbGVkID0gZmFsc2U7XG5cblx0ICByZXR1cm4gc3RyZWFtKGZ1bmN0aW9uIChlbWl0dGVyKSB7XG5cblx0ICAgIGlmICghY2FsbGVkKSB7XG5cdCAgICAgIGNhbGxiYWNrQ29uc3VtZXIoZnVuY3Rpb24gKGVycm9yLCB4KSB7XG5cdCAgICAgICAgaWYgKGVycm9yKSB7XG5cdCAgICAgICAgICBlbWl0dGVyLmVycm9yKGVycm9yKTtcblx0ICAgICAgICB9IGVsc2Uge1xuXHQgICAgICAgICAgZW1pdHRlci5lbWl0KHgpO1xuXHQgICAgICAgIH1cblx0ICAgICAgICBlbWl0dGVyLmVuZCgpO1xuXHQgICAgICB9KTtcblx0ICAgICAgY2FsbGVkID0gdHJ1ZTtcblx0ICAgIH1cblx0ICB9KS5zZXROYW1lKCdmcm9tTm9kZUNhbGxiYWNrJyk7XG5cdH07XG5cbi8qKiovIH0sXG4vKiAxOSAqL1xuLyoqKi8gZnVuY3Rpb24obW9kdWxlLCBleHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKSB7XG5cblx0J3VzZSBzdHJpY3QnO1xuXG5cdHZhciBmcm9tU3ViVW5zdWIgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDIwKTtcblxuXHR2YXIgcGFpcnMgPSBbWydhZGRFdmVudExpc3RlbmVyJywgJ3JlbW92ZUV2ZW50TGlzdGVuZXInXSwgWydhZGRMaXN0ZW5lcicsICdyZW1vdmVMaXN0ZW5lciddLCBbJ29uJywgJ29mZiddXTtcblxuXHRtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGZyb21FdmVudHModGFyZ2V0LCBldmVudE5hbWUsIHRyYW5zZm9ybWVyKSB7XG5cdCAgdmFyIHN1YiA9IHVuZGVmaW5lZCxcblx0ICAgICAgdW5zdWIgPSB1bmRlZmluZWQ7XG5cblx0ICBmb3IgKHZhciBpID0gMDsgaSA8IHBhaXJzLmxlbmd0aDsgaSsrKSB7XG5cdCAgICBpZiAodHlwZW9mIHRhcmdldFtwYWlyc1tpXVswXV0gPT09ICdmdW5jdGlvbicgJiYgdHlwZW9mIHRhcmdldFtwYWlyc1tpXVsxXV0gPT09ICdmdW5jdGlvbicpIHtcblx0ICAgICAgc3ViID0gcGFpcnNbaV1bMF07XG5cdCAgICAgIHVuc3ViID0gcGFpcnNbaV1bMV07XG5cdCAgICAgIGJyZWFrO1xuXHQgICAgfVxuXHQgIH1cblxuXHQgIGlmIChzdWIgPT09IHVuZGVmaW5lZCkge1xuXHQgICAgdGhyb3cgbmV3IEVycm9yKCd0YXJnZXQgZG9uXFwndCBzdXBwb3J0IGFueSBvZiAnICsgJ2FkZEV2ZW50TGlzdGVuZXIvcmVtb3ZlRXZlbnRMaXN0ZW5lciwgYWRkTGlzdGVuZXIvcmVtb3ZlTGlzdGVuZXIsIG9uL29mZiBtZXRob2QgcGFpcicpO1xuXHQgIH1cblxuXHQgIHJldHVybiBmcm9tU3ViVW5zdWIoZnVuY3Rpb24gKGhhbmRsZXIpIHtcblx0ICAgIHJldHVybiB0YXJnZXRbc3ViXShldmVudE5hbWUsIGhhbmRsZXIpO1xuXHQgIH0sIGZ1bmN0aW9uIChoYW5kbGVyKSB7XG5cdCAgICByZXR1cm4gdGFyZ2V0W3Vuc3ViXShldmVudE5hbWUsIGhhbmRsZXIpO1xuXHQgIH0sIHRyYW5zZm9ybWVyKS5zZXROYW1lKCdmcm9tRXZlbnRzJyk7XG5cdH07XG5cbi8qKiovIH0sXG4vKiAyMCAqL1xuLyoqKi8gZnVuY3Rpb24obW9kdWxlLCBleHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKSB7XG5cblx0J3VzZSBzdHJpY3QnO1xuXG5cdHZhciBzdHJlYW0gPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDE3KTtcblxuXHR2YXIgX3JlcXVpcmUgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDIxKTtcblxuXHR2YXIgYXBwbHkgPSBfcmVxdWlyZS5hcHBseTtcblxuXHRtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGZyb21TdWJVbnN1YihzdWIsIHVuc3ViLCB0cmFuc2Zvcm1lciAvKiBGdW5jdGlvbiB8IGZhbHNleSAqLykge1xuXHQgIHJldHVybiBzdHJlYW0oZnVuY3Rpb24gKGVtaXR0ZXIpIHtcblxuXHQgICAgdmFyIGhhbmRsZXIgPSB0cmFuc2Zvcm1lciA/IGZ1bmN0aW9uICgpIHtcblx0ICAgICAgZW1pdHRlci5lbWl0KGFwcGx5KHRyYW5zZm9ybWVyLCB0aGlzLCBhcmd1bWVudHMpKTtcblx0ICAgIH0gOiBmdW5jdGlvbiAoeCkge1xuXHQgICAgICBlbWl0dGVyLmVtaXQoeCk7XG5cdCAgICB9O1xuXG5cdCAgICBzdWIoaGFuZGxlcik7XG5cdCAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuXHQgICAgICByZXR1cm4gdW5zdWIoaGFuZGxlcik7XG5cdCAgICB9O1xuXHQgIH0pLnNldE5hbWUoJ2Zyb21TdWJVbnN1YicpO1xuXHR9O1xuXG4vKioqLyB9LFxuLyogMjEgKi9cbi8qKiovIGZ1bmN0aW9uKG1vZHVsZSwgZXhwb3J0cykge1xuXG5cdFwidXNlIHN0cmljdFwiO1xuXG5cdGZ1bmN0aW9uIHNwcmVhZChmbiwgbGVuZ3RoKSB7XG5cdCAgc3dpdGNoIChsZW5ndGgpIHtcblx0ICAgIGNhc2UgMDpcblx0ICAgICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcblx0ICAgICAgICByZXR1cm4gZm4oKTtcblx0ICAgICAgfTtcblx0ICAgIGNhc2UgMTpcblx0ICAgICAgcmV0dXJuIGZ1bmN0aW9uIChhKSB7XG5cdCAgICAgICAgcmV0dXJuIGZuKGFbMF0pO1xuXHQgICAgICB9O1xuXHQgICAgY2FzZSAyOlxuXHQgICAgICByZXR1cm4gZnVuY3Rpb24gKGEpIHtcblx0ICAgICAgICByZXR1cm4gZm4oYVswXSwgYVsxXSk7XG5cdCAgICAgIH07XG5cdCAgICBjYXNlIDM6XG5cdCAgICAgIHJldHVybiBmdW5jdGlvbiAoYSkge1xuXHQgICAgICAgIHJldHVybiBmbihhWzBdLCBhWzFdLCBhWzJdKTtcblx0ICAgICAgfTtcblx0ICAgIGNhc2UgNDpcblx0ICAgICAgcmV0dXJuIGZ1bmN0aW9uIChhKSB7XG5cdCAgICAgICAgcmV0dXJuIGZuKGFbMF0sIGFbMV0sIGFbMl0sIGFbM10pO1xuXHQgICAgICB9O1xuXHQgICAgZGVmYXVsdDpcblx0ICAgICAgcmV0dXJuIGZ1bmN0aW9uIChhKSB7XG5cdCAgICAgICAgcmV0dXJuIGZuLmFwcGx5KG51bGwsIGEpO1xuXHQgICAgICB9O1xuXHQgIH1cblx0fVxuXG5cdGZ1bmN0aW9uIGFwcGx5KGZuLCBjLCBhKSB7XG5cdCAgdmFyIGFMZW5ndGggPSBhID8gYS5sZW5ndGggOiAwO1xuXHQgIGlmIChjID09IG51bGwpIHtcblx0ICAgIHN3aXRjaCAoYUxlbmd0aCkge1xuXHQgICAgICBjYXNlIDA6XG5cdCAgICAgICAgcmV0dXJuIGZuKCk7XG5cdCAgICAgIGNhc2UgMTpcblx0ICAgICAgICByZXR1cm4gZm4oYVswXSk7XG5cdCAgICAgIGNhc2UgMjpcblx0ICAgICAgICByZXR1cm4gZm4oYVswXSwgYVsxXSk7XG5cdCAgICAgIGNhc2UgMzpcblx0ICAgICAgICByZXR1cm4gZm4oYVswXSwgYVsxXSwgYVsyXSk7XG5cdCAgICAgIGNhc2UgNDpcblx0ICAgICAgICByZXR1cm4gZm4oYVswXSwgYVsxXSwgYVsyXSwgYVszXSk7XG5cdCAgICAgIGRlZmF1bHQ6XG5cdCAgICAgICAgcmV0dXJuIGZuLmFwcGx5KG51bGwsIGEpO1xuXHQgICAgfVxuXHQgIH0gZWxzZSB7XG5cdCAgICBzd2l0Y2ggKGFMZW5ndGgpIHtcblx0ICAgICAgY2FzZSAwOlxuXHQgICAgICAgIHJldHVybiBmbi5jYWxsKGMpO1xuXHQgICAgICBkZWZhdWx0OlxuXHQgICAgICAgIHJldHVybiBmbi5hcHBseShjLCBhKTtcblx0ICAgIH1cblx0ICB9XG5cdH1cblxuXHRtb2R1bGUuZXhwb3J0cyA9IHsgc3ByZWFkOiBzcHJlYWQsIGFwcGx5OiBhcHBseSB9O1xuXG4vKioqLyB9LFxuLyogMjIgKi9cbi8qKiovIGZ1bmN0aW9uKG1vZHVsZSwgZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXykge1xuXG5cdCd1c2Ugc3RyaWN0JztcblxuXHR2YXIgX3JlcXVpcmUgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDIpO1xuXG5cdHZhciBpbmhlcml0ID0gX3JlcXVpcmUuaW5oZXJpdDtcblxuXHR2YXIgUHJvcGVydHkgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDcpO1xuXG5cdC8vIEhBQ0s6XG5cdC8vICAgV2UgZG9uJ3QgY2FsbCBwYXJlbnQgQ2xhc3MgY29uc3RydWN0b3IsIGJ1dCBpbnN0ZWFkIHB1dHRpbmcgYWxsIG5lY2Vzc2FyeVxuXHQvLyAgIHByb3BlcnRpZXMgaW50byBwcm90b3R5cGUgdG8gc2ltdWxhdGUgZW5kZWQgUHJvcGVydHlcblx0Ly8gICAoc2VlIFByb3BwZXJ0eSBhbmQgT2JzZXJ2YWJsZSBjbGFzc2VzKS5cblxuXHRmdW5jdGlvbiBQKHZhbHVlKSB7XG5cdCAgdGhpcy5fY3VycmVudEV2ZW50ID0geyB0eXBlOiAndmFsdWUnLCB2YWx1ZTogdmFsdWUsIGN1cnJlbnQ6IHRydWUgfTtcblx0fVxuXG5cdGluaGVyaXQoUCwgUHJvcGVydHksIHtcblx0ICBfbmFtZTogJ2NvbnN0YW50Jyxcblx0ICBfYWN0aXZlOiBmYWxzZSxcblx0ICBfYWN0aXZhdGluZzogZmFsc2UsXG5cdCAgX2FsaXZlOiBmYWxzZSxcblx0ICBfZGlzcGF0Y2hlcjogbnVsbCxcblx0ICBfbG9nSGFuZGxlcnM6IG51bGxcblx0fSk7XG5cblx0bW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBjb25zdGFudCh4KSB7XG5cdCAgcmV0dXJuIG5ldyBQKHgpO1xuXHR9O1xuXG4vKioqLyB9LFxuLyogMjMgKi9cbi8qKiovIGZ1bmN0aW9uKG1vZHVsZSwgZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXykge1xuXG5cdCd1c2Ugc3RyaWN0JztcblxuXHR2YXIgX3JlcXVpcmUgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDIpO1xuXG5cdHZhciBpbmhlcml0ID0gX3JlcXVpcmUuaW5oZXJpdDtcblxuXHR2YXIgUHJvcGVydHkgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDcpO1xuXG5cdC8vIEhBQ0s6XG5cdC8vICAgV2UgZG9uJ3QgY2FsbCBwYXJlbnQgQ2xhc3MgY29uc3RydWN0b3IsIGJ1dCBpbnN0ZWFkIHB1dHRpbmcgYWxsIG5lY2Vzc2FyeVxuXHQvLyAgIHByb3BlcnRpZXMgaW50byBwcm90b3R5cGUgdG8gc2ltdWxhdGUgZW5kZWQgUHJvcGVydHlcblx0Ly8gICAoc2VlIFByb3BwZXJ0eSBhbmQgT2JzZXJ2YWJsZSBjbGFzc2VzKS5cblxuXHRmdW5jdGlvbiBQKHZhbHVlKSB7XG5cdCAgdGhpcy5fY3VycmVudEV2ZW50ID0geyB0eXBlOiAnZXJyb3InLCB2YWx1ZTogdmFsdWUsIGN1cnJlbnQ6IHRydWUgfTtcblx0fVxuXG5cdGluaGVyaXQoUCwgUHJvcGVydHksIHtcblx0ICBfbmFtZTogJ2NvbnN0YW50RXJyb3InLFxuXHQgIF9hY3RpdmU6IGZhbHNlLFxuXHQgIF9hY3RpdmF0aW5nOiBmYWxzZSxcblx0ICBfYWxpdmU6IGZhbHNlLFxuXHQgIF9kaXNwYXRjaGVyOiBudWxsLFxuXHQgIF9sb2dIYW5kbGVyczogbnVsbFxuXHR9KTtcblxuXHRtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGNvbnN0YW50RXJyb3IoeCkge1xuXHQgIHJldHVybiBuZXcgUCh4KTtcblx0fTtcblxuLyoqKi8gfSxcbi8qIDI0ICovXG4vKioqLyBmdW5jdGlvbihtb2R1bGUsIGV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pIHtcblxuXHQndXNlIHN0cmljdCc7XG5cblx0dmFyIF9yZXF1aXJlID0gX193ZWJwYWNrX3JlcXVpcmVfXygyNSk7XG5cblx0dmFyIGNyZWF0ZVByb3BlcnR5ID0gX3JlcXVpcmUuY3JlYXRlUHJvcGVydHk7XG5cblx0dmFyIFAgPSBjcmVhdGVQcm9wZXJ0eSgndG9Qcm9wZXJ0eScsIHtcblxuXHQgIF9pbml0OiBmdW5jdGlvbiBfaW5pdChfcmVmKSB7XG5cdCAgICB2YXIgZm4gPSBfcmVmLmZuO1xuXG5cdCAgICB0aGlzLl9nZXRJbml0aWFsQ3VycmVudCA9IGZuO1xuXHQgIH0sXG5cblx0ICBfb25BY3RpdmF0aW9uOiBmdW5jdGlvbiBfb25BY3RpdmF0aW9uKCkge1xuXHQgICAgaWYgKHRoaXMuX2dldEluaXRpYWxDdXJyZW50ICE9PSBudWxsKSB7XG5cdCAgICAgIHZhciBnZXRJbml0aWFsID0gdGhpcy5fZ2V0SW5pdGlhbEN1cnJlbnQ7XG5cdCAgICAgIHRoaXMuX2VtaXRWYWx1ZShnZXRJbml0aWFsKCkpO1xuXHQgICAgfVxuXHQgICAgdGhpcy5fc291cmNlLm9uQW55KHRoaXMuXyRoYW5kbGVBbnkpOyAvLyBjb3BpZWQgZnJvbSBwYXR0ZXJucy9vbmUtc291cmNlXG5cdCAgfVxuXG5cdH0pO1xuXG5cdG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gdG9Qcm9wZXJ0eShvYnMpIHtcblx0ICB2YXIgZm4gPSBhcmd1bWVudHMubGVuZ3RoIDw9IDEgfHwgYXJndW1lbnRzWzFdID09PSB1bmRlZmluZWQgPyBudWxsIDogYXJndW1lbnRzWzFdO1xuXG5cdCAgaWYgKGZuICE9PSBudWxsICYmIHR5cGVvZiBmbiAhPT0gJ2Z1bmN0aW9uJykge1xuXHQgICAgdGhyb3cgbmV3IEVycm9yKCdZb3Ugc2hvdWxkIGNhbGwgdG9Qcm9wZXJ0eSgpIHdpdGggYSBmdW5jdGlvbiBvciBubyBhcmd1bWVudHMuJyk7XG5cdCAgfVxuXHQgIHJldHVybiBuZXcgUChvYnMsIHsgZm46IGZuIH0pO1xuXHR9O1xuXG4vKioqLyB9LFxuLyogMjUgKi9cbi8qKiovIGZ1bmN0aW9uKG1vZHVsZSwgZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXykge1xuXG5cdCd1c2Ugc3RyaWN0JztcblxuXHR2YXIgU3RyZWFtID0gX193ZWJwYWNrX3JlcXVpcmVfXyg2KTtcblx0dmFyIFByb3BlcnR5ID0gX193ZWJwYWNrX3JlcXVpcmVfXyg3KTtcblxuXHR2YXIgX3JlcXVpcmUgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDIpO1xuXG5cdHZhciBpbmhlcml0ID0gX3JlcXVpcmUuaW5oZXJpdDtcblxuXHR2YXIgX3JlcXVpcmUyID0gX193ZWJwYWNrX3JlcXVpcmVfXygzKTtcblxuXHR2YXIgVkFMVUUgPSBfcmVxdWlyZTIuVkFMVUU7XG5cdHZhciBFUlJPUiA9IF9yZXF1aXJlMi5FUlJPUjtcblx0dmFyIEVORCA9IF9yZXF1aXJlMi5FTkQ7XG5cblx0ZnVuY3Rpb24gY3JlYXRlQ29uc3RydWN0b3IoQmFzZUNsYXNzLCBuYW1lKSB7XG5cdCAgcmV0dXJuIGZ1bmN0aW9uIEFub255bW91c09ic2VydmFibGUoc291cmNlLCBvcHRpb25zKSB7XG5cdCAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG5cdCAgICBCYXNlQ2xhc3MuY2FsbCh0aGlzKTtcblx0ICAgIHRoaXMuX3NvdXJjZSA9IHNvdXJjZTtcblx0ICAgIHRoaXMuX25hbWUgPSBzb3VyY2UuX25hbWUgKyAnLicgKyBuYW1lO1xuXHQgICAgdGhpcy5faW5pdChvcHRpb25zKTtcblx0ICAgIHRoaXMuXyRoYW5kbGVBbnkgPSBmdW5jdGlvbiAoZXZlbnQpIHtcblx0ICAgICAgcmV0dXJuIF90aGlzLl9oYW5kbGVBbnkoZXZlbnQpO1xuXHQgICAgfTtcblx0ICB9O1xuXHR9XG5cblx0ZnVuY3Rpb24gY3JlYXRlQ2xhc3NNZXRob2RzKEJhc2VDbGFzcykge1xuXHQgIHJldHVybiB7XG5cblx0ICAgIF9pbml0OiBmdW5jdGlvbiBfaW5pdCgpIHt9LFxuXHQgICAgX2ZyZWU6IGZ1bmN0aW9uIF9mcmVlKCkge30sXG5cblx0ICAgIF9oYW5kbGVWYWx1ZTogZnVuY3Rpb24gX2hhbmRsZVZhbHVlKHgpIHtcblx0ICAgICAgdGhpcy5fZW1pdFZhbHVlKHgpO1xuXHQgICAgfSxcblx0ICAgIF9oYW5kbGVFcnJvcjogZnVuY3Rpb24gX2hhbmRsZUVycm9yKHgpIHtcblx0ICAgICAgdGhpcy5fZW1pdEVycm9yKHgpO1xuXHQgICAgfSxcblx0ICAgIF9oYW5kbGVFbmQ6IGZ1bmN0aW9uIF9oYW5kbGVFbmQoKSB7XG5cdCAgICAgIHRoaXMuX2VtaXRFbmQoKTtcblx0ICAgIH0sXG5cblx0ICAgIF9oYW5kbGVBbnk6IGZ1bmN0aW9uIF9oYW5kbGVBbnkoZXZlbnQpIHtcblx0ICAgICAgc3dpdGNoIChldmVudC50eXBlKSB7XG5cdCAgICAgICAgY2FzZSBWQUxVRTpcblx0ICAgICAgICAgIHJldHVybiB0aGlzLl9oYW5kbGVWYWx1ZShldmVudC52YWx1ZSk7XG5cdCAgICAgICAgY2FzZSBFUlJPUjpcblx0ICAgICAgICAgIHJldHVybiB0aGlzLl9oYW5kbGVFcnJvcihldmVudC52YWx1ZSk7XG5cdCAgICAgICAgY2FzZSBFTkQ6XG5cdCAgICAgICAgICByZXR1cm4gdGhpcy5faGFuZGxlRW5kKCk7XG5cdCAgICAgIH1cblx0ICAgIH0sXG5cblx0ICAgIF9vbkFjdGl2YXRpb246IGZ1bmN0aW9uIF9vbkFjdGl2YXRpb24oKSB7XG5cdCAgICAgIHRoaXMuX3NvdXJjZS5vbkFueSh0aGlzLl8kaGFuZGxlQW55KTtcblx0ICAgIH0sXG5cdCAgICBfb25EZWFjdGl2YXRpb246IGZ1bmN0aW9uIF9vbkRlYWN0aXZhdGlvbigpIHtcblx0ICAgICAgdGhpcy5fc291cmNlLm9mZkFueSh0aGlzLl8kaGFuZGxlQW55KTtcblx0ICAgIH0sXG5cblx0ICAgIF9jbGVhcjogZnVuY3Rpb24gX2NsZWFyKCkge1xuXHQgICAgICBCYXNlQ2xhc3MucHJvdG90eXBlLl9jbGVhci5jYWxsKHRoaXMpO1xuXHQgICAgICB0aGlzLl9zb3VyY2UgPSBudWxsO1xuXHQgICAgICB0aGlzLl8kaGFuZGxlQW55ID0gbnVsbDtcblx0ICAgICAgdGhpcy5fZnJlZSgpO1xuXHQgICAgfVxuXG5cdCAgfTtcblx0fVxuXG5cdGZ1bmN0aW9uIGNyZWF0ZVN0cmVhbShuYW1lLCBtaXhpbikge1xuXHQgIHZhciBTID0gY3JlYXRlQ29uc3RydWN0b3IoU3RyZWFtLCBuYW1lKTtcblx0ICBpbmhlcml0KFMsIFN0cmVhbSwgY3JlYXRlQ2xhc3NNZXRob2RzKFN0cmVhbSksIG1peGluKTtcblx0ICByZXR1cm4gUztcblx0fVxuXG5cdGZ1bmN0aW9uIGNyZWF0ZVByb3BlcnR5KG5hbWUsIG1peGluKSB7XG5cdCAgdmFyIFAgPSBjcmVhdGVDb25zdHJ1Y3RvcihQcm9wZXJ0eSwgbmFtZSk7XG5cdCAgaW5oZXJpdChQLCBQcm9wZXJ0eSwgY3JlYXRlQ2xhc3NNZXRob2RzKFByb3BlcnR5KSwgbWl4aW4pO1xuXHQgIHJldHVybiBQO1xuXHR9XG5cblx0bW9kdWxlLmV4cG9ydHMgPSB7IGNyZWF0ZVN0cmVhbTogY3JlYXRlU3RyZWFtLCBjcmVhdGVQcm9wZXJ0eTogY3JlYXRlUHJvcGVydHkgfTtcblxuLyoqKi8gfSxcbi8qIDI2ICovXG4vKioqLyBmdW5jdGlvbihtb2R1bGUsIGV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pIHtcblxuXHQndXNlIHN0cmljdCc7XG5cblx0dmFyIF9yZXF1aXJlID0gX193ZWJwYWNrX3JlcXVpcmVfXygyNSk7XG5cblx0dmFyIGNyZWF0ZVN0cmVhbSA9IF9yZXF1aXJlLmNyZWF0ZVN0cmVhbTtcblxuXHR2YXIgUyA9IGNyZWF0ZVN0cmVhbSgnY2hhbmdlcycsIHtcblxuXHQgIF9oYW5kbGVWYWx1ZTogZnVuY3Rpb24gX2hhbmRsZVZhbHVlKHgpIHtcblx0ICAgIGlmICghdGhpcy5fYWN0aXZhdGluZykge1xuXHQgICAgICB0aGlzLl9lbWl0VmFsdWUoeCk7XG5cdCAgICB9XG5cdCAgfSxcblxuXHQgIF9oYW5kbGVFcnJvcjogZnVuY3Rpb24gX2hhbmRsZUVycm9yKHgpIHtcblx0ICAgIGlmICghdGhpcy5fYWN0aXZhdGluZykge1xuXHQgICAgICB0aGlzLl9lbWl0RXJyb3IoeCk7XG5cdCAgICB9XG5cdCAgfVxuXG5cdH0pO1xuXG5cdG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gY2hhbmdlcyhvYnMpIHtcblx0ICByZXR1cm4gbmV3IFMob2JzKTtcblx0fTtcblxuLyoqKi8gfSxcbi8qIDI3ICovXG4vKioqLyBmdW5jdGlvbihtb2R1bGUsIGV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pIHtcblxuXHQndXNlIHN0cmljdCc7XG5cblx0dmFyIHN0cmVhbSA9IF9fd2VicGFja19yZXF1aXJlX18oMTcpO1xuXHR2YXIgdG9Qcm9wZXJ0eSA9IF9fd2VicGFja19yZXF1aXJlX18oMjQpO1xuXG5cdG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gZnJvbVByb21pc2UocHJvbWlzZSkge1xuXG5cdCAgdmFyIGNhbGxlZCA9IGZhbHNlO1xuXG5cdCAgdmFyIHJlc3VsdCA9IHN0cmVhbShmdW5jdGlvbiAoZW1pdHRlcikge1xuXHQgICAgaWYgKCFjYWxsZWQpIHtcblx0ICAgICAgdmFyIG9uVmFsdWUgPSBmdW5jdGlvbiBvblZhbHVlKHgpIHtcblx0ICAgICAgICBlbWl0dGVyLmVtaXQoeCk7XG5cdCAgICAgICAgZW1pdHRlci5lbmQoKTtcblx0ICAgICAgfTtcblx0ICAgICAgdmFyIG9uRXJyb3IgPSBmdW5jdGlvbiBvbkVycm9yKHgpIHtcblx0ICAgICAgICBlbWl0dGVyLmVycm9yKHgpO1xuXHQgICAgICAgIGVtaXR0ZXIuZW5kKCk7XG5cdCAgICAgIH07XG5cdCAgICAgIHZhciBfcHJvbWlzZSA9IHByb21pc2UudGhlbihvblZhbHVlLCBvbkVycm9yKTtcblxuXHQgICAgICAvLyBwcmV2ZW50IGxpYnJhcmllcyBsaWtlICdRJyBvciAnd2hlbicgZnJvbSBzd2FsbG93aW5nIGV4Y2VwdGlvbnNcblx0ICAgICAgaWYgKF9wcm9taXNlICYmIHR5cGVvZiBfcHJvbWlzZS5kb25lID09PSAnZnVuY3Rpb24nKSB7XG5cdCAgICAgICAgX3Byb21pc2UuZG9uZSgpO1xuXHQgICAgICB9XG5cblx0ICAgICAgY2FsbGVkID0gdHJ1ZTtcblx0ICAgIH1cblx0ICB9KTtcblxuXHQgIHJldHVybiB0b1Byb3BlcnR5KHJlc3VsdCwgbnVsbCkuc2V0TmFtZSgnZnJvbVByb21pc2UnKTtcblx0fTtcblxuLyoqKi8gfSxcbi8qIDI4ICovXG4vKioqLyBmdW5jdGlvbihtb2R1bGUsIGV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pIHtcblxuXHQndXNlIHN0cmljdCc7XG5cblx0dmFyIF9yZXF1aXJlID0gX193ZWJwYWNrX3JlcXVpcmVfXygzKTtcblxuXHR2YXIgVkFMVUUgPSBfcmVxdWlyZS5WQUxVRTtcblx0dmFyIEVORCA9IF9yZXF1aXJlLkVORDtcblxuXHRmdW5jdGlvbiBnZXRHbG9kYWxQcm9taXNlKCkge1xuXHQgIGlmICh0eXBlb2YgUHJvbWlzZSA9PT0gJ2Z1bmN0aW9uJykge1xuXHQgICAgcmV0dXJuIFByb21pc2U7XG5cdCAgfSBlbHNlIHtcblx0ICAgIHRocm93IG5ldyBFcnJvcignVGhlcmUgaXNuXFwndCBkZWZhdWx0IFByb21pc2UsIHVzZSBzaGltIG9yIHBhcmFtZXRlcicpO1xuXHQgIH1cblx0fVxuXG5cdG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKG9icykge1xuXHQgIHZhciBQcm9taXNlID0gYXJndW1lbnRzLmxlbmd0aCA8PSAxIHx8IGFyZ3VtZW50c1sxXSA9PT0gdW5kZWZpbmVkID8gZ2V0R2xvZGFsUHJvbWlzZSgpIDogYXJndW1lbnRzWzFdO1xuXG5cdCAgdmFyIGxhc3QgPSBudWxsO1xuXHQgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG5cdCAgICBvYnMub25BbnkoZnVuY3Rpb24gKGV2ZW50KSB7XG5cdCAgICAgIGlmIChldmVudC50eXBlID09PSBFTkQgJiYgbGFzdCAhPT0gbnVsbCkge1xuXHQgICAgICAgIChsYXN0LnR5cGUgPT09IFZBTFVFID8gcmVzb2x2ZSA6IHJlamVjdCkobGFzdC52YWx1ZSk7XG5cdCAgICAgICAgbGFzdCA9IG51bGw7XG5cdCAgICAgIH0gZWxzZSB7XG5cdCAgICAgICAgbGFzdCA9IGV2ZW50O1xuXHQgICAgICB9XG5cdCAgICB9KTtcblx0ICB9KTtcblx0fTtcblxuLyoqKi8gfSxcbi8qIDI5ICovXG4vKioqLyBmdW5jdGlvbihtb2R1bGUsIGV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pIHtcblxuXHQndXNlIHN0cmljdCc7XG5cblx0dmFyIHN0cmVhbSA9IF9fd2VicGFja19yZXF1aXJlX18oMTcpO1xuXHR2YXIgc3ltYm9sID0gX193ZWJwYWNrX3JlcXVpcmVfXygzMCkoJ29ic2VydmFibGUnKTtcblxuXHRtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGZyb21FU09ic2VydmFibGUoX29ic2VydmFibGUpIHtcblx0ICB2YXIgb2JzZXJ2YWJsZSA9IF9vYnNlcnZhYmxlW3N5bWJvbF0gPyBfb2JzZXJ2YWJsZVtzeW1ib2xdKCkgOiBfb2JzZXJ2YWJsZTtcblx0ICByZXR1cm4gc3RyZWFtKGZ1bmN0aW9uIChlbWl0dGVyKSB7XG5cdCAgICB2YXIgdW5zdWIgPSBvYnNlcnZhYmxlLnN1YnNjcmliZSh7XG5cdCAgICAgIGVycm9yOiBmdW5jdGlvbiBlcnJvcihfZXJyb3IpIHtcblx0ICAgICAgICBlbWl0dGVyLmVycm9yKF9lcnJvcik7XG5cdCAgICAgICAgZW1pdHRlci5lbmQoKTtcblx0ICAgICAgfSxcblx0ICAgICAgbmV4dDogZnVuY3Rpb24gbmV4dCh2YWx1ZSkge1xuXHQgICAgICAgIGVtaXR0ZXIuZW1pdCh2YWx1ZSk7XG5cdCAgICAgIH0sXG5cdCAgICAgIGNvbXBsZXRlOiBmdW5jdGlvbiBjb21wbGV0ZSgpIHtcblx0ICAgICAgICBlbWl0dGVyLmVuZCgpO1xuXHQgICAgICB9XG5cdCAgICB9KTtcblxuXHQgICAgaWYgKHVuc3ViLnVuc3Vic2NyaWJlKSB7XG5cdCAgICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG5cdCAgICAgICAgdW5zdWIudW5zdWJzY3JpYmUoKTtcblx0ICAgICAgfTtcblx0ICAgIH0gZWxzZSB7XG5cdCAgICAgIHJldHVybiB1bnN1Yjtcblx0ICAgIH1cblx0ICB9KS5zZXROYW1lKCdmcm9tRVNPYnNlcnZhYmxlJyk7XG5cdH07XG5cbi8qKiovIH0sXG4vKiAzMCAqL1xuLyoqKi8gZnVuY3Rpb24obW9kdWxlLCBleHBvcnRzKSB7XG5cblx0J3VzZSBzdHJpY3QnO1xuXG5cdG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKGtleSkge1xuXHQgIGlmICh0eXBlb2YgU3ltYm9sICE9PSAndW5kZWZpbmVkJyAmJiBTeW1ib2xba2V5XSkge1xuXHQgICAgcmV0dXJuIFN5bWJvbFtrZXldO1xuXHQgIH0gZWxzZSBpZiAodHlwZW9mIFN5bWJvbCAhPT0gJ3VuZGVmaW5lZCcgJiYgdHlwZW9mIFN5bWJvbFsnZm9yJ10gPT09ICdmdW5jdGlvbicpIHtcblx0ICAgIHJldHVybiBTeW1ib2xbJ2ZvciddKGtleSk7XG5cdCAgfSBlbHNlIHtcblx0ICAgIHJldHVybiAnQEAnICsga2V5O1xuXHQgIH1cblx0fTtcblxuLyoqKi8gfSxcbi8qIDMxICovXG4vKioqLyBmdW5jdGlvbihtb2R1bGUsIGV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pIHtcblxuXHQndXNlIHN0cmljdCc7XG5cblx0dmFyIF9yZXF1aXJlID0gX193ZWJwYWNrX3JlcXVpcmVfXygyKTtcblxuXHR2YXIgZXh0ZW5kID0gX3JlcXVpcmUuZXh0ZW5kO1xuXG5cdHZhciBfcmVxdWlyZTIgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDMpO1xuXG5cdHZhciBWQUxVRSA9IF9yZXF1aXJlMi5WQUxVRTtcblx0dmFyIEVSUk9SID0gX3JlcXVpcmUyLkVSUk9SO1xuXHR2YXIgRU5EID0gX3JlcXVpcmUyLkVORDtcblxuXHRmdW5jdGlvbiBFU09ic2VydmFibGUob2JzZXJ2YWJsZSkge1xuXHQgIHRoaXMuX29ic2VydmFibGUgPSBvYnNlcnZhYmxlLnRha2VFcnJvcnMoMSk7XG5cdH1cblxuXHRleHRlbmQoRVNPYnNlcnZhYmxlLnByb3RvdHlwZSwge1xuXHQgIHN1YnNjcmliZTogZnVuY3Rpb24gc3Vic2NyaWJlKG9ic2VydmVyKSB7XG5cdCAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG5cdCAgICB2YXIgZm4gPSBmdW5jdGlvbiBmbihldmVudCkge1xuXHQgICAgICBpZiAoZXZlbnQudHlwZSA9PT0gVkFMVUUgJiYgb2JzZXJ2ZXIubmV4dCkge1xuXHQgICAgICAgIG9ic2VydmVyLm5leHQoZXZlbnQudmFsdWUpO1xuXHQgICAgICB9IGVsc2UgaWYgKGV2ZW50LnR5cGUgPT09IEVSUk9SICYmIG9ic2VydmVyLmVycm9yKSB7XG5cdCAgICAgICAgb2JzZXJ2ZXIuZXJyb3IoZXZlbnQudmFsdWUpO1xuXHQgICAgICB9IGVsc2UgaWYgKGV2ZW50LnR5cGUgPT09IEVORCAmJiBvYnNlcnZlci5jb21wbGV0ZSkge1xuXHQgICAgICAgIG9ic2VydmVyLmNvbXBsZXRlKGV2ZW50LnZhbHVlKTtcblx0ICAgICAgfVxuXHQgICAgfTtcblxuXHQgICAgdGhpcy5fb2JzZXJ2YWJsZS5vbkFueShmbik7XG5cdCAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuXHQgICAgICByZXR1cm4gX3RoaXMuX29ic2VydmFibGUub2ZmQW55KGZuKTtcblx0ICAgIH07XG5cdCAgfVxuXHR9KTtcblxuXHRtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIHRvRVNPYnNlcnZhYmxlKCkge1xuXHQgIHJldHVybiBuZXcgRVNPYnNlcnZhYmxlKHRoaXMpO1xuXHR9O1xuXG4vKioqLyB9LFxuLyogMzIgKi9cbi8qKiovIGZ1bmN0aW9uKG1vZHVsZSwgZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXykge1xuXG5cdCd1c2Ugc3RyaWN0JztcblxuXHR2YXIgX3JlcXVpcmUgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDI1KTtcblxuXHR2YXIgY3JlYXRlU3RyZWFtID0gX3JlcXVpcmUuY3JlYXRlU3RyZWFtO1xuXHR2YXIgY3JlYXRlUHJvcGVydHkgPSBfcmVxdWlyZS5jcmVhdGVQcm9wZXJ0eTtcblxuXHR2YXIgbWl4aW4gPSB7XG5cblx0ICBfaW5pdDogZnVuY3Rpb24gX2luaXQoX3JlZikge1xuXHQgICAgdmFyIGZuID0gX3JlZi5mbjtcblxuXHQgICAgdGhpcy5fZm4gPSBmbjtcblx0ICB9LFxuXG5cdCAgX2ZyZWU6IGZ1bmN0aW9uIF9mcmVlKCkge1xuXHQgICAgdGhpcy5fZm4gPSBudWxsO1xuXHQgIH0sXG5cblx0ICBfaGFuZGxlVmFsdWU6IGZ1bmN0aW9uIF9oYW5kbGVWYWx1ZSh4KSB7XG5cdCAgICB2YXIgZm4gPSB0aGlzLl9mbjtcblx0ICAgIHRoaXMuX2VtaXRWYWx1ZShmbih4KSk7XG5cdCAgfVxuXG5cdH07XG5cblx0dmFyIFMgPSBjcmVhdGVTdHJlYW0oJ21hcCcsIG1peGluKTtcblx0dmFyIFAgPSBjcmVhdGVQcm9wZXJ0eSgnbWFwJywgbWl4aW4pO1xuXG5cdHZhciBpZCA9IGZ1bmN0aW9uIGlkKHgpIHtcblx0ICByZXR1cm4geDtcblx0fTtcblxuXHRtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIG1hcChvYnMpIHtcblx0ICB2YXIgZm4gPSBhcmd1bWVudHMubGVuZ3RoIDw9IDEgfHwgYXJndW1lbnRzWzFdID09PSB1bmRlZmluZWQgPyBpZCA6IGFyZ3VtZW50c1sxXTtcblxuXHQgIHJldHVybiBuZXcgKG9icy5fb2ZTYW1lVHlwZShTLCBQKSkob2JzLCB7IGZuOiBmbiB9KTtcblx0fTtcblxuLyoqKi8gfSxcbi8qIDMzICovXG4vKioqLyBmdW5jdGlvbihtb2R1bGUsIGV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pIHtcblxuXHQndXNlIHN0cmljdCc7XG5cblx0dmFyIF9yZXF1aXJlID0gX193ZWJwYWNrX3JlcXVpcmVfXygyNSk7XG5cblx0dmFyIGNyZWF0ZVN0cmVhbSA9IF9yZXF1aXJlLmNyZWF0ZVN0cmVhbTtcblx0dmFyIGNyZWF0ZVByb3BlcnR5ID0gX3JlcXVpcmUuY3JlYXRlUHJvcGVydHk7XG5cblx0dmFyIG1peGluID0ge1xuXG5cdCAgX2luaXQ6IGZ1bmN0aW9uIF9pbml0KF9yZWYpIHtcblx0ICAgIHZhciBmbiA9IF9yZWYuZm47XG5cblx0ICAgIHRoaXMuX2ZuID0gZm47XG5cdCAgfSxcblxuXHQgIF9mcmVlOiBmdW5jdGlvbiBfZnJlZSgpIHtcblx0ICAgIHRoaXMuX2ZuID0gbnVsbDtcblx0ICB9LFxuXG5cdCAgX2hhbmRsZVZhbHVlOiBmdW5jdGlvbiBfaGFuZGxlVmFsdWUoeCkge1xuXHQgICAgdmFyIGZuID0gdGhpcy5fZm47XG5cdCAgICBpZiAoZm4oeCkpIHtcblx0ICAgICAgdGhpcy5fZW1pdFZhbHVlKHgpO1xuXHQgICAgfVxuXHQgIH1cblxuXHR9O1xuXG5cdHZhciBTID0gY3JlYXRlU3RyZWFtKCdmaWx0ZXInLCBtaXhpbik7XG5cdHZhciBQID0gY3JlYXRlUHJvcGVydHkoJ2ZpbHRlcicsIG1peGluKTtcblxuXHR2YXIgaWQgPSBmdW5jdGlvbiBpZCh4KSB7XG5cdCAgcmV0dXJuIHg7XG5cdH07XG5cblx0bW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBmaWx0ZXIob2JzKSB7XG5cdCAgdmFyIGZuID0gYXJndW1lbnRzLmxlbmd0aCA8PSAxIHx8IGFyZ3VtZW50c1sxXSA9PT0gdW5kZWZpbmVkID8gaWQgOiBhcmd1bWVudHNbMV07XG5cblx0ICByZXR1cm4gbmV3IChvYnMuX29mU2FtZVR5cGUoUywgUCkpKG9icywgeyBmbjogZm4gfSk7XG5cdH07XG5cbi8qKiovIH0sXG4vKiAzNCAqL1xuLyoqKi8gZnVuY3Rpb24obW9kdWxlLCBleHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKSB7XG5cblx0J3VzZSBzdHJpY3QnO1xuXG5cdHZhciBfcmVxdWlyZSA9IF9fd2VicGFja19yZXF1aXJlX18oMjUpO1xuXG5cdHZhciBjcmVhdGVTdHJlYW0gPSBfcmVxdWlyZS5jcmVhdGVTdHJlYW07XG5cdHZhciBjcmVhdGVQcm9wZXJ0eSA9IF9yZXF1aXJlLmNyZWF0ZVByb3BlcnR5O1xuXG5cdHZhciBtaXhpbiA9IHtcblxuXHQgIF9pbml0OiBmdW5jdGlvbiBfaW5pdChfcmVmKSB7XG5cdCAgICB2YXIgbiA9IF9yZWYubjtcblxuXHQgICAgdGhpcy5fbiA9IG47XG5cdCAgICBpZiAobiA8PSAwKSB7XG5cdCAgICAgIHRoaXMuX2VtaXRFbmQoKTtcblx0ICAgIH1cblx0ICB9LFxuXG5cdCAgX2hhbmRsZVZhbHVlOiBmdW5jdGlvbiBfaGFuZGxlVmFsdWUoeCkge1xuXHQgICAgdGhpcy5fbi0tO1xuXHQgICAgdGhpcy5fZW1pdFZhbHVlKHgpO1xuXHQgICAgaWYgKHRoaXMuX24gPT09IDApIHtcblx0ICAgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgICAgfVxuXHQgIH1cblxuXHR9O1xuXG5cdHZhciBTID0gY3JlYXRlU3RyZWFtKCd0YWtlJywgbWl4aW4pO1xuXHR2YXIgUCA9IGNyZWF0ZVByb3BlcnR5KCd0YWtlJywgbWl4aW4pO1xuXG5cdG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gdGFrZShvYnMsIG4pIHtcblx0ICByZXR1cm4gbmV3IChvYnMuX29mU2FtZVR5cGUoUywgUCkpKG9icywgeyBuOiBuIH0pO1xuXHR9O1xuXG4vKioqLyB9LFxuLyogMzUgKi9cbi8qKiovIGZ1bmN0aW9uKG1vZHVsZSwgZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXykge1xuXG5cdCd1c2Ugc3RyaWN0JztcblxuXHR2YXIgX3JlcXVpcmUgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDI1KTtcblxuXHR2YXIgY3JlYXRlU3RyZWFtID0gX3JlcXVpcmUuY3JlYXRlU3RyZWFtO1xuXHR2YXIgY3JlYXRlUHJvcGVydHkgPSBfcmVxdWlyZS5jcmVhdGVQcm9wZXJ0eTtcblxuXHR2YXIgbWl4aW4gPSB7XG5cblx0ICBfaW5pdDogZnVuY3Rpb24gX2luaXQoX3JlZikge1xuXHQgICAgdmFyIG4gPSBfcmVmLm47XG5cblx0ICAgIHRoaXMuX24gPSBuO1xuXHQgICAgaWYgKG4gPD0gMCkge1xuXHQgICAgICB0aGlzLl9lbWl0RW5kKCk7XG5cdCAgICB9XG5cdCAgfSxcblxuXHQgIF9oYW5kbGVFcnJvcjogZnVuY3Rpb24gX2hhbmRsZUVycm9yKHgpIHtcblx0ICAgIHRoaXMuX24tLTtcblx0ICAgIHRoaXMuX2VtaXRFcnJvcih4KTtcblx0ICAgIGlmICh0aGlzLl9uID09PSAwKSB7XG5cdCAgICAgIHRoaXMuX2VtaXRFbmQoKTtcblx0ICAgIH1cblx0ICB9XG5cblx0fTtcblxuXHR2YXIgUyA9IGNyZWF0ZVN0cmVhbSgndGFrZUVycm9ycycsIG1peGluKTtcblx0dmFyIFAgPSBjcmVhdGVQcm9wZXJ0eSgndGFrZUVycm9ycycsIG1peGluKTtcblxuXHRtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIHRha2VFcnJvcnMob2JzLCBuKSB7XG5cdCAgcmV0dXJuIG5ldyAob2JzLl9vZlNhbWVUeXBlKFMsIFApKShvYnMsIHsgbjogbiB9KTtcblx0fTtcblxuLyoqKi8gfSxcbi8qIDM2ICovXG4vKioqLyBmdW5jdGlvbihtb2R1bGUsIGV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pIHtcblxuXHQndXNlIHN0cmljdCc7XG5cblx0dmFyIF9yZXF1aXJlID0gX193ZWJwYWNrX3JlcXVpcmVfXygyNSk7XG5cblx0dmFyIGNyZWF0ZVN0cmVhbSA9IF9yZXF1aXJlLmNyZWF0ZVN0cmVhbTtcblx0dmFyIGNyZWF0ZVByb3BlcnR5ID0gX3JlcXVpcmUuY3JlYXRlUHJvcGVydHk7XG5cblx0dmFyIG1peGluID0ge1xuXG5cdCAgX2luaXQ6IGZ1bmN0aW9uIF9pbml0KF9yZWYpIHtcblx0ICAgIHZhciBmbiA9IF9yZWYuZm47XG5cblx0ICAgIHRoaXMuX2ZuID0gZm47XG5cdCAgfSxcblxuXHQgIF9mcmVlOiBmdW5jdGlvbiBfZnJlZSgpIHtcblx0ICAgIHRoaXMuX2ZuID0gbnVsbDtcblx0ICB9LFxuXG5cdCAgX2hhbmRsZVZhbHVlOiBmdW5jdGlvbiBfaGFuZGxlVmFsdWUoeCkge1xuXHQgICAgdmFyIGZuID0gdGhpcy5fZm47XG5cdCAgICBpZiAoZm4oeCkpIHtcblx0ICAgICAgdGhpcy5fZW1pdFZhbHVlKHgpO1xuXHQgICAgfSBlbHNlIHtcblx0ICAgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgICAgfVxuXHQgIH1cblxuXHR9O1xuXG5cdHZhciBTID0gY3JlYXRlU3RyZWFtKCd0YWtlV2hpbGUnLCBtaXhpbik7XG5cdHZhciBQID0gY3JlYXRlUHJvcGVydHkoJ3Rha2VXaGlsZScsIG1peGluKTtcblxuXHR2YXIgaWQgPSBmdW5jdGlvbiBpZCh4KSB7XG5cdCAgcmV0dXJuIHg7XG5cdH07XG5cblx0bW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiB0YWtlV2hpbGUob2JzKSB7XG5cdCAgdmFyIGZuID0gYXJndW1lbnRzLmxlbmd0aCA8PSAxIHx8IGFyZ3VtZW50c1sxXSA9PT0gdW5kZWZpbmVkID8gaWQgOiBhcmd1bWVudHNbMV07XG5cblx0ICByZXR1cm4gbmV3IChvYnMuX29mU2FtZVR5cGUoUywgUCkpKG9icywgeyBmbjogZm4gfSk7XG5cdH07XG5cbi8qKiovIH0sXG4vKiAzNyAqL1xuLyoqKi8gZnVuY3Rpb24obW9kdWxlLCBleHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKSB7XG5cblx0J3VzZSBzdHJpY3QnO1xuXG5cdHZhciBfcmVxdWlyZSA9IF9fd2VicGFja19yZXF1aXJlX18oMjUpO1xuXG5cdHZhciBjcmVhdGVTdHJlYW0gPSBfcmVxdWlyZS5jcmVhdGVTdHJlYW07XG5cdHZhciBjcmVhdGVQcm9wZXJ0eSA9IF9yZXF1aXJlLmNyZWF0ZVByb3BlcnR5O1xuXG5cdHZhciBfcmVxdWlyZTIgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDMpO1xuXG5cdHZhciBOT1RISU5HID0gX3JlcXVpcmUyLk5PVEhJTkc7XG5cblx0dmFyIG1peGluID0ge1xuXG5cdCAgX2luaXQ6IGZ1bmN0aW9uIF9pbml0KCkge1xuXHQgICAgdGhpcy5fbGFzdFZhbHVlID0gTk9USElORztcblx0ICB9LFxuXG5cdCAgX2ZyZWU6IGZ1bmN0aW9uIF9mcmVlKCkge1xuXHQgICAgdGhpcy5fbGFzdFZhbHVlID0gbnVsbDtcblx0ICB9LFxuXG5cdCAgX2hhbmRsZVZhbHVlOiBmdW5jdGlvbiBfaGFuZGxlVmFsdWUoeCkge1xuXHQgICAgdGhpcy5fbGFzdFZhbHVlID0geDtcblx0ICB9LFxuXG5cdCAgX2hhbmRsZUVuZDogZnVuY3Rpb24gX2hhbmRsZUVuZCgpIHtcblx0ICAgIGlmICh0aGlzLl9sYXN0VmFsdWUgIT09IE5PVEhJTkcpIHtcblx0ICAgICAgdGhpcy5fZW1pdFZhbHVlKHRoaXMuX2xhc3RWYWx1ZSk7XG5cdCAgICB9XG5cdCAgICB0aGlzLl9lbWl0RW5kKCk7XG5cdCAgfVxuXG5cdH07XG5cblx0dmFyIFMgPSBjcmVhdGVTdHJlYW0oJ2xhc3QnLCBtaXhpbik7XG5cdHZhciBQID0gY3JlYXRlUHJvcGVydHkoJ2xhc3QnLCBtaXhpbik7XG5cblx0bW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBsYXN0KG9icykge1xuXHQgIHJldHVybiBuZXcgKG9icy5fb2ZTYW1lVHlwZShTLCBQKSkob2JzKTtcblx0fTtcblxuLyoqKi8gfSxcbi8qIDM4ICovXG4vKioqLyBmdW5jdGlvbihtb2R1bGUsIGV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pIHtcblxuXHQndXNlIHN0cmljdCc7XG5cblx0dmFyIF9yZXF1aXJlID0gX193ZWJwYWNrX3JlcXVpcmVfXygyNSk7XG5cblx0dmFyIGNyZWF0ZVN0cmVhbSA9IF9yZXF1aXJlLmNyZWF0ZVN0cmVhbTtcblx0dmFyIGNyZWF0ZVByb3BlcnR5ID0gX3JlcXVpcmUuY3JlYXRlUHJvcGVydHk7XG5cblx0dmFyIG1peGluID0ge1xuXG5cdCAgX2luaXQ6IGZ1bmN0aW9uIF9pbml0KF9yZWYpIHtcblx0ICAgIHZhciBuID0gX3JlZi5uO1xuXG5cdCAgICB0aGlzLl9uID0gTWF0aC5tYXgoMCwgbik7XG5cdCAgfSxcblxuXHQgIF9oYW5kbGVWYWx1ZTogZnVuY3Rpb24gX2hhbmRsZVZhbHVlKHgpIHtcblx0ICAgIGlmICh0aGlzLl9uID09PSAwKSB7XG5cdCAgICAgIHRoaXMuX2VtaXRWYWx1ZSh4KTtcblx0ICAgIH0gZWxzZSB7XG5cdCAgICAgIHRoaXMuX24tLTtcblx0ICAgIH1cblx0ICB9XG5cblx0fTtcblxuXHR2YXIgUyA9IGNyZWF0ZVN0cmVhbSgnc2tpcCcsIG1peGluKTtcblx0dmFyIFAgPSBjcmVhdGVQcm9wZXJ0eSgnc2tpcCcsIG1peGluKTtcblxuXHRtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIHNraXAob2JzLCBuKSB7XG5cdCAgcmV0dXJuIG5ldyAob2JzLl9vZlNhbWVUeXBlKFMsIFApKShvYnMsIHsgbjogbiB9KTtcblx0fTtcblxuLyoqKi8gfSxcbi8qIDM5ICovXG4vKioqLyBmdW5jdGlvbihtb2R1bGUsIGV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pIHtcblxuXHQndXNlIHN0cmljdCc7XG5cblx0dmFyIF9yZXF1aXJlID0gX193ZWJwYWNrX3JlcXVpcmVfXygyNSk7XG5cblx0dmFyIGNyZWF0ZVN0cmVhbSA9IF9yZXF1aXJlLmNyZWF0ZVN0cmVhbTtcblx0dmFyIGNyZWF0ZVByb3BlcnR5ID0gX3JlcXVpcmUuY3JlYXRlUHJvcGVydHk7XG5cblx0dmFyIG1peGluID0ge1xuXG5cdCAgX2luaXQ6IGZ1bmN0aW9uIF9pbml0KF9yZWYpIHtcblx0ICAgIHZhciBmbiA9IF9yZWYuZm47XG5cblx0ICAgIHRoaXMuX2ZuID0gZm47XG5cdCAgfSxcblxuXHQgIF9mcmVlOiBmdW5jdGlvbiBfZnJlZSgpIHtcblx0ICAgIHRoaXMuX2ZuID0gbnVsbDtcblx0ICB9LFxuXG5cdCAgX2hhbmRsZVZhbHVlOiBmdW5jdGlvbiBfaGFuZGxlVmFsdWUoeCkge1xuXHQgICAgdmFyIGZuID0gdGhpcy5fZm47XG5cdCAgICBpZiAodGhpcy5fZm4gIT09IG51bGwgJiYgIWZuKHgpKSB7XG5cdCAgICAgIHRoaXMuX2ZuID0gbnVsbDtcblx0ICAgIH1cblx0ICAgIGlmICh0aGlzLl9mbiA9PT0gbnVsbCkge1xuXHQgICAgICB0aGlzLl9lbWl0VmFsdWUoeCk7XG5cdCAgICB9XG5cdCAgfVxuXG5cdH07XG5cblx0dmFyIFMgPSBjcmVhdGVTdHJlYW0oJ3NraXBXaGlsZScsIG1peGluKTtcblx0dmFyIFAgPSBjcmVhdGVQcm9wZXJ0eSgnc2tpcFdoaWxlJywgbWl4aW4pO1xuXG5cdHZhciBpZCA9IGZ1bmN0aW9uIGlkKHgpIHtcblx0ICByZXR1cm4geDtcblx0fTtcblxuXHRtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIHNraXBXaGlsZShvYnMpIHtcblx0ICB2YXIgZm4gPSBhcmd1bWVudHMubGVuZ3RoIDw9IDEgfHwgYXJndW1lbnRzWzFdID09PSB1bmRlZmluZWQgPyBpZCA6IGFyZ3VtZW50c1sxXTtcblxuXHQgIHJldHVybiBuZXcgKG9icy5fb2ZTYW1lVHlwZShTLCBQKSkob2JzLCB7IGZuOiBmbiB9KTtcblx0fTtcblxuLyoqKi8gfSxcbi8qIDQwICovXG4vKioqLyBmdW5jdGlvbihtb2R1bGUsIGV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pIHtcblxuXHQndXNlIHN0cmljdCc7XG5cblx0dmFyIF9yZXF1aXJlID0gX193ZWJwYWNrX3JlcXVpcmVfXygyNSk7XG5cblx0dmFyIGNyZWF0ZVN0cmVhbSA9IF9yZXF1aXJlLmNyZWF0ZVN0cmVhbTtcblx0dmFyIGNyZWF0ZVByb3BlcnR5ID0gX3JlcXVpcmUuY3JlYXRlUHJvcGVydHk7XG5cblx0dmFyIF9yZXF1aXJlMiA9IF9fd2VicGFja19yZXF1aXJlX18oMyk7XG5cblx0dmFyIE5PVEhJTkcgPSBfcmVxdWlyZTIuTk9USElORztcblxuXHR2YXIgbWl4aW4gPSB7XG5cblx0ICBfaW5pdDogZnVuY3Rpb24gX2luaXQoX3JlZikge1xuXHQgICAgdmFyIGZuID0gX3JlZi5mbjtcblxuXHQgICAgdGhpcy5fZm4gPSBmbjtcblx0ICAgIHRoaXMuX3ByZXYgPSBOT1RISU5HO1xuXHQgIH0sXG5cblx0ICBfZnJlZTogZnVuY3Rpb24gX2ZyZWUoKSB7XG5cdCAgICB0aGlzLl9mbiA9IG51bGw7XG5cdCAgICB0aGlzLl9wcmV2ID0gbnVsbDtcblx0ICB9LFxuXG5cdCAgX2hhbmRsZVZhbHVlOiBmdW5jdGlvbiBfaGFuZGxlVmFsdWUoeCkge1xuXHQgICAgdmFyIGZuID0gdGhpcy5fZm47XG5cdCAgICBpZiAodGhpcy5fcHJldiA9PT0gTk9USElORyB8fCAhZm4odGhpcy5fcHJldiwgeCkpIHtcblx0ICAgICAgdGhpcy5fcHJldiA9IHg7XG5cdCAgICAgIHRoaXMuX2VtaXRWYWx1ZSh4KTtcblx0ICAgIH1cblx0ICB9XG5cblx0fTtcblxuXHR2YXIgUyA9IGNyZWF0ZVN0cmVhbSgnc2tpcER1cGxpY2F0ZXMnLCBtaXhpbik7XG5cdHZhciBQID0gY3JlYXRlUHJvcGVydHkoJ3NraXBEdXBsaWNhdGVzJywgbWl4aW4pO1xuXG5cdHZhciBlcSA9IGZ1bmN0aW9uIGVxKGEsIGIpIHtcblx0ICByZXR1cm4gYSA9PT0gYjtcblx0fTtcblxuXHRtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIHNraXBEdXBsaWNhdGVzKG9icykge1xuXHQgIHZhciBmbiA9IGFyZ3VtZW50cy5sZW5ndGggPD0gMSB8fCBhcmd1bWVudHNbMV0gPT09IHVuZGVmaW5lZCA/IGVxIDogYXJndW1lbnRzWzFdO1xuXG5cdCAgcmV0dXJuIG5ldyAob2JzLl9vZlNhbWVUeXBlKFMsIFApKShvYnMsIHsgZm46IGZuIH0pO1xuXHR9O1xuXG4vKioqLyB9LFxuLyogNDEgKi9cbi8qKiovIGZ1bmN0aW9uKG1vZHVsZSwgZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXykge1xuXG5cdCd1c2Ugc3RyaWN0JztcblxuXHR2YXIgX3JlcXVpcmUgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDI1KTtcblxuXHR2YXIgY3JlYXRlU3RyZWFtID0gX3JlcXVpcmUuY3JlYXRlU3RyZWFtO1xuXHR2YXIgY3JlYXRlUHJvcGVydHkgPSBfcmVxdWlyZS5jcmVhdGVQcm9wZXJ0eTtcblxuXHR2YXIgX3JlcXVpcmUyID0gX193ZWJwYWNrX3JlcXVpcmVfXygzKTtcblxuXHR2YXIgTk9USElORyA9IF9yZXF1aXJlMi5OT1RISU5HO1xuXG5cdHZhciBtaXhpbiA9IHtcblxuXHQgIF9pbml0OiBmdW5jdGlvbiBfaW5pdChfcmVmKSB7XG5cdCAgICB2YXIgZm4gPSBfcmVmLmZuO1xuXHQgICAgdmFyIHNlZWQgPSBfcmVmLnNlZWQ7XG5cblx0ICAgIHRoaXMuX2ZuID0gZm47XG5cdCAgICB0aGlzLl9wcmV2ID0gc2VlZDtcblx0ICB9LFxuXG5cdCAgX2ZyZWU6IGZ1bmN0aW9uIF9mcmVlKCkge1xuXHQgICAgdGhpcy5fcHJldiA9IG51bGw7XG5cdCAgICB0aGlzLl9mbiA9IG51bGw7XG5cdCAgfSxcblxuXHQgIF9oYW5kbGVWYWx1ZTogZnVuY3Rpb24gX2hhbmRsZVZhbHVlKHgpIHtcblx0ICAgIGlmICh0aGlzLl9wcmV2ICE9PSBOT1RISU5HKSB7XG5cdCAgICAgIHZhciBmbiA9IHRoaXMuX2ZuO1xuXHQgICAgICB0aGlzLl9lbWl0VmFsdWUoZm4odGhpcy5fcHJldiwgeCkpO1xuXHQgICAgfVxuXHQgICAgdGhpcy5fcHJldiA9IHg7XG5cdCAgfVxuXG5cdH07XG5cblx0dmFyIFMgPSBjcmVhdGVTdHJlYW0oJ2RpZmYnLCBtaXhpbik7XG5cdHZhciBQID0gY3JlYXRlUHJvcGVydHkoJ2RpZmYnLCBtaXhpbik7XG5cblx0ZnVuY3Rpb24gZGVmYXVsdEZuKGEsIGIpIHtcblx0ICByZXR1cm4gW2EsIGJdO1xuXHR9XG5cblx0bW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBkaWZmKG9icywgZm4pIHtcblx0ICB2YXIgc2VlZCA9IGFyZ3VtZW50cy5sZW5ndGggPD0gMiB8fCBhcmd1bWVudHNbMl0gPT09IHVuZGVmaW5lZCA/IE5PVEhJTkcgOiBhcmd1bWVudHNbMl07XG5cblx0ICByZXR1cm4gbmV3IChvYnMuX29mU2FtZVR5cGUoUywgUCkpKG9icywgeyBmbjogZm4gfHwgZGVmYXVsdEZuLCBzZWVkOiBzZWVkIH0pO1xuXHR9O1xuXG4vKioqLyB9LFxuLyogNDIgKi9cbi8qKiovIGZ1bmN0aW9uKG1vZHVsZSwgZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXykge1xuXG5cdCd1c2Ugc3RyaWN0JztcblxuXHR2YXIgX3JlcXVpcmUgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDI1KTtcblxuXHR2YXIgY3JlYXRlUHJvcGVydHkgPSBfcmVxdWlyZS5jcmVhdGVQcm9wZXJ0eTtcblxuXHR2YXIgX3JlcXVpcmUyID0gX193ZWJwYWNrX3JlcXVpcmVfXygzKTtcblxuXHR2YXIgRVJST1IgPSBfcmVxdWlyZTIuRVJST1I7XG5cdHZhciBOT1RISU5HID0gX3JlcXVpcmUyLk5PVEhJTkc7XG5cblx0dmFyIFAgPSBjcmVhdGVQcm9wZXJ0eSgnc2NhbicsIHtcblxuXHQgIF9pbml0OiBmdW5jdGlvbiBfaW5pdChfcmVmKSB7XG5cdCAgICB2YXIgZm4gPSBfcmVmLmZuO1xuXHQgICAgdmFyIHNlZWQgPSBfcmVmLnNlZWQ7XG5cblx0ICAgIHRoaXMuX2ZuID0gZm47XG5cdCAgICB0aGlzLl9zZWVkID0gc2VlZDtcblx0ICAgIGlmIChzZWVkICE9PSBOT1RISU5HKSB7XG5cdCAgICAgIHRoaXMuX2VtaXRWYWx1ZShzZWVkKTtcblx0ICAgIH1cblx0ICB9LFxuXG5cdCAgX2ZyZWU6IGZ1bmN0aW9uIF9mcmVlKCkge1xuXHQgICAgdGhpcy5fZm4gPSBudWxsO1xuXHQgICAgdGhpcy5fc2VlZCA9IG51bGw7XG5cdCAgfSxcblxuXHQgIF9oYW5kbGVWYWx1ZTogZnVuY3Rpb24gX2hhbmRsZVZhbHVlKHgpIHtcblx0ICAgIHZhciBmbiA9IHRoaXMuX2ZuO1xuXHQgICAgaWYgKHRoaXMuX2N1cnJlbnRFdmVudCA9PT0gbnVsbCB8fCB0aGlzLl9jdXJyZW50RXZlbnQudHlwZSA9PT0gRVJST1IpIHtcblx0ICAgICAgdGhpcy5fZW1pdFZhbHVlKHRoaXMuX3NlZWQgPT09IE5PVEhJTkcgPyB4IDogZm4odGhpcy5fc2VlZCwgeCkpO1xuXHQgICAgfSBlbHNlIHtcblx0ICAgICAgdGhpcy5fZW1pdFZhbHVlKGZuKHRoaXMuX2N1cnJlbnRFdmVudC52YWx1ZSwgeCkpO1xuXHQgICAgfVxuXHQgIH1cblxuXHR9KTtcblxuXHRtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIHNjYW4ob2JzLCBmbikge1xuXHQgIHZhciBzZWVkID0gYXJndW1lbnRzLmxlbmd0aCA8PSAyIHx8IGFyZ3VtZW50c1syXSA9PT0gdW5kZWZpbmVkID8gTk9USElORyA6IGFyZ3VtZW50c1syXTtcblxuXHQgIHJldHVybiBuZXcgUChvYnMsIHsgZm46IGZuLCBzZWVkOiBzZWVkIH0pO1xuXHR9O1xuXG4vKioqLyB9LFxuLyogNDMgKi9cbi8qKiovIGZ1bmN0aW9uKG1vZHVsZSwgZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXykge1xuXG5cdCd1c2Ugc3RyaWN0JztcblxuXHR2YXIgX3JlcXVpcmUgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDI1KTtcblxuXHR2YXIgY3JlYXRlU3RyZWFtID0gX3JlcXVpcmUuY3JlYXRlU3RyZWFtO1xuXG5cdHZhciBtaXhpbiA9IHtcblxuXHQgIF9pbml0OiBmdW5jdGlvbiBfaW5pdChfcmVmKSB7XG5cdCAgICB2YXIgZm4gPSBfcmVmLmZuO1xuXG5cdCAgICB0aGlzLl9mbiA9IGZuO1xuXHQgIH0sXG5cblx0ICBfZnJlZTogZnVuY3Rpb24gX2ZyZWUoKSB7XG5cdCAgICB0aGlzLl9mbiA9IG51bGw7XG5cdCAgfSxcblxuXHQgIF9oYW5kbGVWYWx1ZTogZnVuY3Rpb24gX2hhbmRsZVZhbHVlKHgpIHtcblx0ICAgIHZhciBmbiA9IHRoaXMuX2ZuO1xuXHQgICAgdmFyIHhzID0gZm4oeCk7XG5cdCAgICBmb3IgKHZhciBpID0gMDsgaSA8IHhzLmxlbmd0aDsgaSsrKSB7XG5cdCAgICAgIHRoaXMuX2VtaXRWYWx1ZSh4c1tpXSk7XG5cdCAgICB9XG5cdCAgfVxuXG5cdH07XG5cblx0dmFyIFMgPSBjcmVhdGVTdHJlYW0oJ2ZsYXR0ZW4nLCBtaXhpbik7XG5cblx0dmFyIGlkID0gZnVuY3Rpb24gaWQoeCkge1xuXHQgIHJldHVybiB4O1xuXHR9O1xuXG5cdG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gZmxhdHRlbihvYnMpIHtcblx0ICB2YXIgZm4gPSBhcmd1bWVudHMubGVuZ3RoIDw9IDEgfHwgYXJndW1lbnRzWzFdID09PSB1bmRlZmluZWQgPyBpZCA6IGFyZ3VtZW50c1sxXTtcblxuXHQgIHJldHVybiBuZXcgUyhvYnMsIHsgZm46IGZuIH0pO1xuXHR9O1xuXG4vKioqLyB9LFxuLyogNDQgKi9cbi8qKiovIGZ1bmN0aW9uKG1vZHVsZSwgZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXykge1xuXG5cdCd1c2Ugc3RyaWN0JztcblxuXHR2YXIgX3JlcXVpcmUgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDI1KTtcblxuXHR2YXIgY3JlYXRlU3RyZWFtID0gX3JlcXVpcmUuY3JlYXRlU3RyZWFtO1xuXHR2YXIgY3JlYXRlUHJvcGVydHkgPSBfcmVxdWlyZS5jcmVhdGVQcm9wZXJ0eTtcblxuXHR2YXIgRU5EX01BUktFUiA9IHt9O1xuXG5cdHZhciBtaXhpbiA9IHtcblxuXHQgIF9pbml0OiBmdW5jdGlvbiBfaW5pdChfcmVmKSB7XG5cdCAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG5cdCAgICB2YXIgd2FpdCA9IF9yZWYud2FpdDtcblxuXHQgICAgdGhpcy5fd2FpdCA9IE1hdGgubWF4KDAsIHdhaXQpO1xuXHQgICAgdGhpcy5fYnVmZiA9IFtdO1xuXHQgICAgdGhpcy5fJHNoaWZ0QnVmZiA9IGZ1bmN0aW9uICgpIHtcblx0ICAgICAgdmFyIHZhbHVlID0gX3RoaXMuX2J1ZmYuc2hpZnQoKTtcblx0ICAgICAgaWYgKHZhbHVlID09PSBFTkRfTUFSS0VSKSB7XG5cdCAgICAgICAgX3RoaXMuX2VtaXRFbmQoKTtcblx0ICAgICAgfSBlbHNlIHtcblx0ICAgICAgICBfdGhpcy5fZW1pdFZhbHVlKHZhbHVlKTtcblx0ICAgICAgfVxuXHQgICAgfTtcblx0ICB9LFxuXG5cdCAgX2ZyZWU6IGZ1bmN0aW9uIF9mcmVlKCkge1xuXHQgICAgdGhpcy5fYnVmZiA9IG51bGw7XG5cdCAgICB0aGlzLl8kc2hpZnRCdWZmID0gbnVsbDtcblx0ICB9LFxuXG5cdCAgX2hhbmRsZVZhbHVlOiBmdW5jdGlvbiBfaGFuZGxlVmFsdWUoeCkge1xuXHQgICAgaWYgKHRoaXMuX2FjdGl2YXRpbmcpIHtcblx0ICAgICAgdGhpcy5fZW1pdFZhbHVlKHgpO1xuXHQgICAgfSBlbHNlIHtcblx0ICAgICAgdGhpcy5fYnVmZi5wdXNoKHgpO1xuXHQgICAgICBzZXRUaW1lb3V0KHRoaXMuXyRzaGlmdEJ1ZmYsIHRoaXMuX3dhaXQpO1xuXHQgICAgfVxuXHQgIH0sXG5cblx0ICBfaGFuZGxlRW5kOiBmdW5jdGlvbiBfaGFuZGxlRW5kKCkge1xuXHQgICAgaWYgKHRoaXMuX2FjdGl2YXRpbmcpIHtcblx0ICAgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgICAgfSBlbHNlIHtcblx0ICAgICAgdGhpcy5fYnVmZi5wdXNoKEVORF9NQVJLRVIpO1xuXHQgICAgICBzZXRUaW1lb3V0KHRoaXMuXyRzaGlmdEJ1ZmYsIHRoaXMuX3dhaXQpO1xuXHQgICAgfVxuXHQgIH1cblxuXHR9O1xuXG5cdHZhciBTID0gY3JlYXRlU3RyZWFtKCdkZWxheScsIG1peGluKTtcblx0dmFyIFAgPSBjcmVhdGVQcm9wZXJ0eSgnZGVsYXknLCBtaXhpbik7XG5cblx0bW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBkZWxheShvYnMsIHdhaXQpIHtcblx0ICByZXR1cm4gbmV3IChvYnMuX29mU2FtZVR5cGUoUywgUCkpKG9icywgeyB3YWl0OiB3YWl0IH0pO1xuXHR9O1xuXG4vKioqLyB9LFxuLyogNDUgKi9cbi8qKiovIGZ1bmN0aW9uKG1vZHVsZSwgZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXykge1xuXG5cdCd1c2Ugc3RyaWN0JztcblxuXHR2YXIgX3JlcXVpcmUgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDI1KTtcblxuXHR2YXIgY3JlYXRlU3RyZWFtID0gX3JlcXVpcmUuY3JlYXRlU3RyZWFtO1xuXHR2YXIgY3JlYXRlUHJvcGVydHkgPSBfcmVxdWlyZS5jcmVhdGVQcm9wZXJ0eTtcblxuXHR2YXIgbm93ID0gX193ZWJwYWNrX3JlcXVpcmVfXyg0Nik7XG5cblx0dmFyIG1peGluID0ge1xuXG5cdCAgX2luaXQ6IGZ1bmN0aW9uIF9pbml0KF9yZWYpIHtcblx0ICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cblx0ICAgIHZhciB3YWl0ID0gX3JlZi53YWl0O1xuXHQgICAgdmFyIGxlYWRpbmcgPSBfcmVmLmxlYWRpbmc7XG5cdCAgICB2YXIgdHJhaWxpbmcgPSBfcmVmLnRyYWlsaW5nO1xuXG5cdCAgICB0aGlzLl93YWl0ID0gTWF0aC5tYXgoMCwgd2FpdCk7XG5cdCAgICB0aGlzLl9sZWFkaW5nID0gbGVhZGluZztcblx0ICAgIHRoaXMuX3RyYWlsaW5nID0gdHJhaWxpbmc7XG5cdCAgICB0aGlzLl90cmFpbGluZ1ZhbHVlID0gbnVsbDtcblx0ICAgIHRoaXMuX3RpbWVvdXRJZCA9IG51bGw7XG5cdCAgICB0aGlzLl9lbmRMYXRlciA9IGZhbHNlO1xuXHQgICAgdGhpcy5fbGFzdENhbGxUaW1lID0gMDtcblx0ICAgIHRoaXMuXyR0cmFpbGluZ0NhbGwgPSBmdW5jdGlvbiAoKSB7XG5cdCAgICAgIHJldHVybiBfdGhpcy5fdHJhaWxpbmdDYWxsKCk7XG5cdCAgICB9O1xuXHQgIH0sXG5cblx0ICBfZnJlZTogZnVuY3Rpb24gX2ZyZWUoKSB7XG5cdCAgICB0aGlzLl90cmFpbGluZ1ZhbHVlID0gbnVsbDtcblx0ICAgIHRoaXMuXyR0cmFpbGluZ0NhbGwgPSBudWxsO1xuXHQgIH0sXG5cblx0ICBfaGFuZGxlVmFsdWU6IGZ1bmN0aW9uIF9oYW5kbGVWYWx1ZSh4KSB7XG5cdCAgICBpZiAodGhpcy5fYWN0aXZhdGluZykge1xuXHQgICAgICB0aGlzLl9lbWl0VmFsdWUoeCk7XG5cdCAgICB9IGVsc2Uge1xuXHQgICAgICB2YXIgY3VyVGltZSA9IG5vdygpO1xuXHQgICAgICBpZiAodGhpcy5fbGFzdENhbGxUaW1lID09PSAwICYmICF0aGlzLl9sZWFkaW5nKSB7XG5cdCAgICAgICAgdGhpcy5fbGFzdENhbGxUaW1lID0gY3VyVGltZTtcblx0ICAgICAgfVxuXHQgICAgICB2YXIgcmVtYWluaW5nID0gdGhpcy5fd2FpdCAtIChjdXJUaW1lIC0gdGhpcy5fbGFzdENhbGxUaW1lKTtcblx0ICAgICAgaWYgKHJlbWFpbmluZyA8PSAwKSB7XG5cdCAgICAgICAgdGhpcy5fY2FuY2VsVHJhaWxpbmcoKTtcblx0ICAgICAgICB0aGlzLl9sYXN0Q2FsbFRpbWUgPSBjdXJUaW1lO1xuXHQgICAgICAgIHRoaXMuX2VtaXRWYWx1ZSh4KTtcblx0ICAgICAgfSBlbHNlIGlmICh0aGlzLl90cmFpbGluZykge1xuXHQgICAgICAgIHRoaXMuX2NhbmNlbFRyYWlsaW5nKCk7XG5cdCAgICAgICAgdGhpcy5fdHJhaWxpbmdWYWx1ZSA9IHg7XG5cdCAgICAgICAgdGhpcy5fdGltZW91dElkID0gc2V0VGltZW91dCh0aGlzLl8kdHJhaWxpbmdDYWxsLCByZW1haW5pbmcpO1xuXHQgICAgICB9XG5cdCAgICB9XG5cdCAgfSxcblxuXHQgIF9oYW5kbGVFbmQ6IGZ1bmN0aW9uIF9oYW5kbGVFbmQoKSB7XG5cdCAgICBpZiAodGhpcy5fYWN0aXZhdGluZykge1xuXHQgICAgICB0aGlzLl9lbWl0RW5kKCk7XG5cdCAgICB9IGVsc2Uge1xuXHQgICAgICBpZiAodGhpcy5fdGltZW91dElkKSB7XG5cdCAgICAgICAgdGhpcy5fZW5kTGF0ZXIgPSB0cnVlO1xuXHQgICAgICB9IGVsc2Uge1xuXHQgICAgICAgIHRoaXMuX2VtaXRFbmQoKTtcblx0ICAgICAgfVxuXHQgICAgfVxuXHQgIH0sXG5cblx0ICBfY2FuY2VsVHJhaWxpbmc6IGZ1bmN0aW9uIF9jYW5jZWxUcmFpbGluZygpIHtcblx0ICAgIGlmICh0aGlzLl90aW1lb3V0SWQgIT09IG51bGwpIHtcblx0ICAgICAgY2xlYXJUaW1lb3V0KHRoaXMuX3RpbWVvdXRJZCk7XG5cdCAgICAgIHRoaXMuX3RpbWVvdXRJZCA9IG51bGw7XG5cdCAgICB9XG5cdCAgfSxcblxuXHQgIF90cmFpbGluZ0NhbGw6IGZ1bmN0aW9uIF90cmFpbGluZ0NhbGwoKSB7XG5cdCAgICB0aGlzLl9lbWl0VmFsdWUodGhpcy5fdHJhaWxpbmdWYWx1ZSk7XG5cdCAgICB0aGlzLl90aW1lb3V0SWQgPSBudWxsO1xuXHQgICAgdGhpcy5fdHJhaWxpbmdWYWx1ZSA9IG51bGw7XG5cdCAgICB0aGlzLl9sYXN0Q2FsbFRpbWUgPSAhdGhpcy5fbGVhZGluZyA/IDAgOiBub3coKTtcblx0ICAgIGlmICh0aGlzLl9lbmRMYXRlcikge1xuXHQgICAgICB0aGlzLl9lbWl0RW5kKCk7XG5cdCAgICB9XG5cdCAgfVxuXG5cdH07XG5cblx0dmFyIFMgPSBjcmVhdGVTdHJlYW0oJ3Rocm90dGxlJywgbWl4aW4pO1xuXHR2YXIgUCA9IGNyZWF0ZVByb3BlcnR5KCd0aHJvdHRsZScsIG1peGluKTtcblxuXHRtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIHRocm90dGxlKG9icywgd2FpdCkge1xuXHQgIHZhciBfcmVmMiA9IGFyZ3VtZW50cy5sZW5ndGggPD0gMiB8fCBhcmd1bWVudHNbMl0gPT09IHVuZGVmaW5lZCA/IHt9IDogYXJndW1lbnRzWzJdO1xuXG5cdCAgdmFyIF9yZWYyJGxlYWRpbmcgPSBfcmVmMi5sZWFkaW5nO1xuXHQgIHZhciBsZWFkaW5nID0gX3JlZjIkbGVhZGluZyA9PT0gdW5kZWZpbmVkID8gdHJ1ZSA6IF9yZWYyJGxlYWRpbmc7XG5cdCAgdmFyIF9yZWYyJHRyYWlsaW5nID0gX3JlZjIudHJhaWxpbmc7XG5cdCAgdmFyIHRyYWlsaW5nID0gX3JlZjIkdHJhaWxpbmcgPT09IHVuZGVmaW5lZCA/IHRydWUgOiBfcmVmMiR0cmFpbGluZztcblxuXHQgIHJldHVybiBuZXcgKG9icy5fb2ZTYW1lVHlwZShTLCBQKSkob2JzLCB7IHdhaXQ6IHdhaXQsIGxlYWRpbmc6IGxlYWRpbmcsIHRyYWlsaW5nOiB0cmFpbGluZyB9KTtcblx0fTtcblxuLyoqKi8gfSxcbi8qIDQ2ICovXG4vKioqLyBmdW5jdGlvbihtb2R1bGUsIGV4cG9ydHMpIHtcblxuXHRcInVzZSBzdHJpY3RcIjtcblxuXHRtb2R1bGUuZXhwb3J0cyA9IERhdGUubm93ID8gZnVuY3Rpb24gKCkge1xuXHQgIHJldHVybiBEYXRlLm5vdygpO1xuXHR9IDogZnVuY3Rpb24gKCkge1xuXHQgIHJldHVybiBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcblx0fTtcblxuLyoqKi8gfSxcbi8qIDQ3ICovXG4vKioqLyBmdW5jdGlvbihtb2R1bGUsIGV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pIHtcblxuXHQndXNlIHN0cmljdCc7XG5cblx0dmFyIF9yZXF1aXJlID0gX193ZWJwYWNrX3JlcXVpcmVfXygyNSk7XG5cblx0dmFyIGNyZWF0ZVN0cmVhbSA9IF9yZXF1aXJlLmNyZWF0ZVN0cmVhbTtcblx0dmFyIGNyZWF0ZVByb3BlcnR5ID0gX3JlcXVpcmUuY3JlYXRlUHJvcGVydHk7XG5cblx0dmFyIG5vdyA9IF9fd2VicGFja19yZXF1aXJlX18oNDYpO1xuXG5cdHZhciBtaXhpbiA9IHtcblxuXHQgIF9pbml0OiBmdW5jdGlvbiBfaW5pdChfcmVmKSB7XG5cdCAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG5cdCAgICB2YXIgd2FpdCA9IF9yZWYud2FpdDtcblx0ICAgIHZhciBpbW1lZGlhdGUgPSBfcmVmLmltbWVkaWF0ZTtcblxuXHQgICAgdGhpcy5fd2FpdCA9IE1hdGgubWF4KDAsIHdhaXQpO1xuXHQgICAgdGhpcy5faW1tZWRpYXRlID0gaW1tZWRpYXRlO1xuXHQgICAgdGhpcy5fbGFzdEF0dGVtcHQgPSAwO1xuXHQgICAgdGhpcy5fdGltZW91dElkID0gbnVsbDtcblx0ICAgIHRoaXMuX2xhdGVyVmFsdWUgPSBudWxsO1xuXHQgICAgdGhpcy5fZW5kTGF0ZXIgPSBmYWxzZTtcblx0ICAgIHRoaXMuXyRsYXRlciA9IGZ1bmN0aW9uICgpIHtcblx0ICAgICAgcmV0dXJuIF90aGlzLl9sYXRlcigpO1xuXHQgICAgfTtcblx0ICB9LFxuXG5cdCAgX2ZyZWU6IGZ1bmN0aW9uIF9mcmVlKCkge1xuXHQgICAgdGhpcy5fbGF0ZXJWYWx1ZSA9IG51bGw7XG5cdCAgICB0aGlzLl8kbGF0ZXIgPSBudWxsO1xuXHQgIH0sXG5cblx0ICBfaGFuZGxlVmFsdWU6IGZ1bmN0aW9uIF9oYW5kbGVWYWx1ZSh4KSB7XG5cdCAgICBpZiAodGhpcy5fYWN0aXZhdGluZykge1xuXHQgICAgICB0aGlzLl9lbWl0VmFsdWUoeCk7XG5cdCAgICB9IGVsc2Uge1xuXHQgICAgICB0aGlzLl9sYXN0QXR0ZW1wdCA9IG5vdygpO1xuXHQgICAgICBpZiAodGhpcy5faW1tZWRpYXRlICYmICF0aGlzLl90aW1lb3V0SWQpIHtcblx0ICAgICAgICB0aGlzLl9lbWl0VmFsdWUoeCk7XG5cdCAgICAgIH1cblx0ICAgICAgaWYgKCF0aGlzLl90aW1lb3V0SWQpIHtcblx0ICAgICAgICB0aGlzLl90aW1lb3V0SWQgPSBzZXRUaW1lb3V0KHRoaXMuXyRsYXRlciwgdGhpcy5fd2FpdCk7XG5cdCAgICAgIH1cblx0ICAgICAgaWYgKCF0aGlzLl9pbW1lZGlhdGUpIHtcblx0ICAgICAgICB0aGlzLl9sYXRlclZhbHVlID0geDtcblx0ICAgICAgfVxuXHQgICAgfVxuXHQgIH0sXG5cblx0ICBfaGFuZGxlRW5kOiBmdW5jdGlvbiBfaGFuZGxlRW5kKCkge1xuXHQgICAgaWYgKHRoaXMuX2FjdGl2YXRpbmcpIHtcblx0ICAgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgICAgfSBlbHNlIHtcblx0ICAgICAgaWYgKHRoaXMuX3RpbWVvdXRJZCAmJiAhdGhpcy5faW1tZWRpYXRlKSB7XG5cdCAgICAgICAgdGhpcy5fZW5kTGF0ZXIgPSB0cnVlO1xuXHQgICAgICB9IGVsc2Uge1xuXHQgICAgICAgIHRoaXMuX2VtaXRFbmQoKTtcblx0ICAgICAgfVxuXHQgICAgfVxuXHQgIH0sXG5cblx0ICBfbGF0ZXI6IGZ1bmN0aW9uIF9sYXRlcigpIHtcblx0ICAgIHZhciBsYXN0ID0gbm93KCkgLSB0aGlzLl9sYXN0QXR0ZW1wdDtcblx0ICAgIGlmIChsYXN0IDwgdGhpcy5fd2FpdCAmJiBsYXN0ID49IDApIHtcblx0ICAgICAgdGhpcy5fdGltZW91dElkID0gc2V0VGltZW91dCh0aGlzLl8kbGF0ZXIsIHRoaXMuX3dhaXQgLSBsYXN0KTtcblx0ICAgIH0gZWxzZSB7XG5cdCAgICAgIHRoaXMuX3RpbWVvdXRJZCA9IG51bGw7XG5cdCAgICAgIGlmICghdGhpcy5faW1tZWRpYXRlKSB7XG5cdCAgICAgICAgdGhpcy5fZW1pdFZhbHVlKHRoaXMuX2xhdGVyVmFsdWUpO1xuXHQgICAgICAgIHRoaXMuX2xhdGVyVmFsdWUgPSBudWxsO1xuXHQgICAgICB9XG5cdCAgICAgIGlmICh0aGlzLl9lbmRMYXRlcikge1xuXHQgICAgICAgIHRoaXMuX2VtaXRFbmQoKTtcblx0ICAgICAgfVxuXHQgICAgfVxuXHQgIH1cblxuXHR9O1xuXG5cdHZhciBTID0gY3JlYXRlU3RyZWFtKCdkZWJvdW5jZScsIG1peGluKTtcblx0dmFyIFAgPSBjcmVhdGVQcm9wZXJ0eSgnZGVib3VuY2UnLCBtaXhpbik7XG5cblx0bW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBkZWJvdW5jZShvYnMsIHdhaXQpIHtcblx0ICB2YXIgX3JlZjIgPSBhcmd1bWVudHMubGVuZ3RoIDw9IDIgfHwgYXJndW1lbnRzWzJdID09PSB1bmRlZmluZWQgPyB7fSA6IGFyZ3VtZW50c1syXTtcblxuXHQgIHZhciBfcmVmMiRpbW1lZGlhdGUgPSBfcmVmMi5pbW1lZGlhdGU7XG5cdCAgdmFyIGltbWVkaWF0ZSA9IF9yZWYyJGltbWVkaWF0ZSA9PT0gdW5kZWZpbmVkID8gZmFsc2UgOiBfcmVmMiRpbW1lZGlhdGU7XG5cblx0ICByZXR1cm4gbmV3IChvYnMuX29mU2FtZVR5cGUoUywgUCkpKG9icywgeyB3YWl0OiB3YWl0LCBpbW1lZGlhdGU6IGltbWVkaWF0ZSB9KTtcblx0fTtcblxuLyoqKi8gfSxcbi8qIDQ4ICovXG4vKioqLyBmdW5jdGlvbihtb2R1bGUsIGV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pIHtcblxuXHQndXNlIHN0cmljdCc7XG5cblx0dmFyIF9yZXF1aXJlID0gX193ZWJwYWNrX3JlcXVpcmVfXygyNSk7XG5cblx0dmFyIGNyZWF0ZVN0cmVhbSA9IF9yZXF1aXJlLmNyZWF0ZVN0cmVhbTtcblx0dmFyIGNyZWF0ZVByb3BlcnR5ID0gX3JlcXVpcmUuY3JlYXRlUHJvcGVydHk7XG5cblx0dmFyIG1peGluID0ge1xuXG5cdCAgX2luaXQ6IGZ1bmN0aW9uIF9pbml0KF9yZWYpIHtcblx0ICAgIHZhciBmbiA9IF9yZWYuZm47XG5cblx0ICAgIHRoaXMuX2ZuID0gZm47XG5cdCAgfSxcblxuXHQgIF9mcmVlOiBmdW5jdGlvbiBfZnJlZSgpIHtcblx0ICAgIHRoaXMuX2ZuID0gbnVsbDtcblx0ICB9LFxuXG5cdCAgX2hhbmRsZUVycm9yOiBmdW5jdGlvbiBfaGFuZGxlRXJyb3IoeCkge1xuXHQgICAgdmFyIGZuID0gdGhpcy5fZm47XG5cdCAgICB0aGlzLl9lbWl0RXJyb3IoZm4oeCkpO1xuXHQgIH1cblxuXHR9O1xuXG5cdHZhciBTID0gY3JlYXRlU3RyZWFtKCdtYXBFcnJvcnMnLCBtaXhpbik7XG5cdHZhciBQID0gY3JlYXRlUHJvcGVydHkoJ21hcEVycm9ycycsIG1peGluKTtcblxuXHR2YXIgaWQgPSBmdW5jdGlvbiBpZCh4KSB7XG5cdCAgcmV0dXJuIHg7XG5cdH07XG5cblx0bW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBtYXBFcnJvcnMob2JzKSB7XG5cdCAgdmFyIGZuID0gYXJndW1lbnRzLmxlbmd0aCA8PSAxIHx8IGFyZ3VtZW50c1sxXSA9PT0gdW5kZWZpbmVkID8gaWQgOiBhcmd1bWVudHNbMV07XG5cblx0ICByZXR1cm4gbmV3IChvYnMuX29mU2FtZVR5cGUoUywgUCkpKG9icywgeyBmbjogZm4gfSk7XG5cdH07XG5cbi8qKiovIH0sXG4vKiA0OSAqL1xuLyoqKi8gZnVuY3Rpb24obW9kdWxlLCBleHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKSB7XG5cblx0J3VzZSBzdHJpY3QnO1xuXG5cdHZhciBfcmVxdWlyZSA9IF9fd2VicGFja19yZXF1aXJlX18oMjUpO1xuXG5cdHZhciBjcmVhdGVTdHJlYW0gPSBfcmVxdWlyZS5jcmVhdGVTdHJlYW07XG5cdHZhciBjcmVhdGVQcm9wZXJ0eSA9IF9yZXF1aXJlLmNyZWF0ZVByb3BlcnR5O1xuXG5cdHZhciBtaXhpbiA9IHtcblxuXHQgIF9pbml0OiBmdW5jdGlvbiBfaW5pdChfcmVmKSB7XG5cdCAgICB2YXIgZm4gPSBfcmVmLmZuO1xuXG5cdCAgICB0aGlzLl9mbiA9IGZuO1xuXHQgIH0sXG5cblx0ICBfZnJlZTogZnVuY3Rpb24gX2ZyZWUoKSB7XG5cdCAgICB0aGlzLl9mbiA9IG51bGw7XG5cdCAgfSxcblxuXHQgIF9oYW5kbGVFcnJvcjogZnVuY3Rpb24gX2hhbmRsZUVycm9yKHgpIHtcblx0ICAgIHZhciBmbiA9IHRoaXMuX2ZuO1xuXHQgICAgaWYgKGZuKHgpKSB7XG5cdCAgICAgIHRoaXMuX2VtaXRFcnJvcih4KTtcblx0ICAgIH1cblx0ICB9XG5cblx0fTtcblxuXHR2YXIgUyA9IGNyZWF0ZVN0cmVhbSgnZmlsdGVyRXJyb3JzJywgbWl4aW4pO1xuXHR2YXIgUCA9IGNyZWF0ZVByb3BlcnR5KCdmaWx0ZXJFcnJvcnMnLCBtaXhpbik7XG5cblx0dmFyIGlkID0gZnVuY3Rpb24gaWQoeCkge1xuXHQgIHJldHVybiB4O1xuXHR9O1xuXG5cdG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gZmlsdGVyRXJyb3JzKG9icykge1xuXHQgIHZhciBmbiA9IGFyZ3VtZW50cy5sZW5ndGggPD0gMSB8fCBhcmd1bWVudHNbMV0gPT09IHVuZGVmaW5lZCA/IGlkIDogYXJndW1lbnRzWzFdO1xuXG5cdCAgcmV0dXJuIG5ldyAob2JzLl9vZlNhbWVUeXBlKFMsIFApKShvYnMsIHsgZm46IGZuIH0pO1xuXHR9O1xuXG4vKioqLyB9LFxuLyogNTAgKi9cbi8qKiovIGZ1bmN0aW9uKG1vZHVsZSwgZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXykge1xuXG5cdCd1c2Ugc3RyaWN0JztcblxuXHR2YXIgX3JlcXVpcmUgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDI1KTtcblxuXHR2YXIgY3JlYXRlU3RyZWFtID0gX3JlcXVpcmUuY3JlYXRlU3RyZWFtO1xuXHR2YXIgY3JlYXRlUHJvcGVydHkgPSBfcmVxdWlyZS5jcmVhdGVQcm9wZXJ0eTtcblxuXHR2YXIgbWl4aW4gPSB7XG5cdCAgX2hhbmRsZVZhbHVlOiBmdW5jdGlvbiBfaGFuZGxlVmFsdWUoKSB7fVxuXHR9O1xuXG5cdHZhciBTID0gY3JlYXRlU3RyZWFtKCdpZ25vcmVWYWx1ZXMnLCBtaXhpbik7XG5cdHZhciBQID0gY3JlYXRlUHJvcGVydHkoJ2lnbm9yZVZhbHVlcycsIG1peGluKTtcblxuXHRtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGlnbm9yZVZhbHVlcyhvYnMpIHtcblx0ICByZXR1cm4gbmV3IChvYnMuX29mU2FtZVR5cGUoUywgUCkpKG9icyk7XG5cdH07XG5cbi8qKiovIH0sXG4vKiA1MSAqL1xuLyoqKi8gZnVuY3Rpb24obW9kdWxlLCBleHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKSB7XG5cblx0J3VzZSBzdHJpY3QnO1xuXG5cdHZhciBfcmVxdWlyZSA9IF9fd2VicGFja19yZXF1aXJlX18oMjUpO1xuXG5cdHZhciBjcmVhdGVTdHJlYW0gPSBfcmVxdWlyZS5jcmVhdGVTdHJlYW07XG5cdHZhciBjcmVhdGVQcm9wZXJ0eSA9IF9yZXF1aXJlLmNyZWF0ZVByb3BlcnR5O1xuXG5cdHZhciBtaXhpbiA9IHtcblx0ICBfaGFuZGxlRXJyb3I6IGZ1bmN0aW9uIF9oYW5kbGVFcnJvcigpIHt9XG5cdH07XG5cblx0dmFyIFMgPSBjcmVhdGVTdHJlYW0oJ2lnbm9yZUVycm9ycycsIG1peGluKTtcblx0dmFyIFAgPSBjcmVhdGVQcm9wZXJ0eSgnaWdub3JlRXJyb3JzJywgbWl4aW4pO1xuXG5cdG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gaWdub3JlRXJyb3JzKG9icykge1xuXHQgIHJldHVybiBuZXcgKG9icy5fb2ZTYW1lVHlwZShTLCBQKSkob2JzKTtcblx0fTtcblxuLyoqKi8gfSxcbi8qIDUyICovXG4vKioqLyBmdW5jdGlvbihtb2R1bGUsIGV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pIHtcblxuXHQndXNlIHN0cmljdCc7XG5cblx0dmFyIF9yZXF1aXJlID0gX193ZWJwYWNrX3JlcXVpcmVfXygyNSk7XG5cblx0dmFyIGNyZWF0ZVN0cmVhbSA9IF9yZXF1aXJlLmNyZWF0ZVN0cmVhbTtcblx0dmFyIGNyZWF0ZVByb3BlcnR5ID0gX3JlcXVpcmUuY3JlYXRlUHJvcGVydHk7XG5cblx0dmFyIG1peGluID0ge1xuXHQgIF9oYW5kbGVFbmQ6IGZ1bmN0aW9uIF9oYW5kbGVFbmQoKSB7fVxuXHR9O1xuXG5cdHZhciBTID0gY3JlYXRlU3RyZWFtKCdpZ25vcmVFbmQnLCBtaXhpbik7XG5cdHZhciBQID0gY3JlYXRlUHJvcGVydHkoJ2lnbm9yZUVuZCcsIG1peGluKTtcblxuXHRtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGlnbm9yZUVuZChvYnMpIHtcblx0ICByZXR1cm4gbmV3IChvYnMuX29mU2FtZVR5cGUoUywgUCkpKG9icyk7XG5cdH07XG5cbi8qKiovIH0sXG4vKiA1MyAqL1xuLyoqKi8gZnVuY3Rpb24obW9kdWxlLCBleHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKSB7XG5cblx0J3VzZSBzdHJpY3QnO1xuXG5cdHZhciBfcmVxdWlyZSA9IF9fd2VicGFja19yZXF1aXJlX18oMjUpO1xuXG5cdHZhciBjcmVhdGVTdHJlYW0gPSBfcmVxdWlyZS5jcmVhdGVTdHJlYW07XG5cdHZhciBjcmVhdGVQcm9wZXJ0eSA9IF9yZXF1aXJlLmNyZWF0ZVByb3BlcnR5O1xuXG5cdHZhciBtaXhpbiA9IHtcblxuXHQgIF9pbml0OiBmdW5jdGlvbiBfaW5pdChfcmVmKSB7XG5cdCAgICB2YXIgZm4gPSBfcmVmLmZuO1xuXG5cdCAgICB0aGlzLl9mbiA9IGZuO1xuXHQgIH0sXG5cblx0ICBfZnJlZTogZnVuY3Rpb24gX2ZyZWUoKSB7XG5cdCAgICB0aGlzLl9mbiA9IG51bGw7XG5cdCAgfSxcblxuXHQgIF9oYW5kbGVFbmQ6IGZ1bmN0aW9uIF9oYW5kbGVFbmQoKSB7XG5cdCAgICB2YXIgZm4gPSB0aGlzLl9mbjtcblx0ICAgIHRoaXMuX2VtaXRWYWx1ZShmbigpKTtcblx0ICAgIHRoaXMuX2VtaXRFbmQoKTtcblx0ICB9XG5cblx0fTtcblxuXHR2YXIgUyA9IGNyZWF0ZVN0cmVhbSgnYmVmb3JlRW5kJywgbWl4aW4pO1xuXHR2YXIgUCA9IGNyZWF0ZVByb3BlcnR5KCdiZWZvcmVFbmQnLCBtaXhpbik7XG5cblx0bW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBiZWZvcmVFbmQob2JzLCBmbikge1xuXHQgIHJldHVybiBuZXcgKG9icy5fb2ZTYW1lVHlwZShTLCBQKSkob2JzLCB7IGZuOiBmbiB9KTtcblx0fTtcblxuLyoqKi8gfSxcbi8qIDU0ICovXG4vKioqLyBmdW5jdGlvbihtb2R1bGUsIGV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pIHtcblxuXHQndXNlIHN0cmljdCc7XG5cblx0dmFyIF9yZXF1aXJlID0gX193ZWJwYWNrX3JlcXVpcmVfXygyNSk7XG5cblx0dmFyIGNyZWF0ZVN0cmVhbSA9IF9yZXF1aXJlLmNyZWF0ZVN0cmVhbTtcblx0dmFyIGNyZWF0ZVByb3BlcnR5ID0gX3JlcXVpcmUuY3JlYXRlUHJvcGVydHk7XG5cblx0dmFyIF9yZXF1aXJlMiA9IF9fd2VicGFja19yZXF1aXJlX18oNSk7XG5cblx0dmFyIHNsaWRlID0gX3JlcXVpcmUyLnNsaWRlO1xuXG5cdHZhciBtaXhpbiA9IHtcblxuXHQgIF9pbml0OiBmdW5jdGlvbiBfaW5pdChfcmVmKSB7XG5cdCAgICB2YXIgbWluID0gX3JlZi5taW47XG5cdCAgICB2YXIgbWF4ID0gX3JlZi5tYXg7XG5cblx0ICAgIHRoaXMuX21heCA9IG1heDtcblx0ICAgIHRoaXMuX21pbiA9IG1pbjtcblx0ICAgIHRoaXMuX2J1ZmYgPSBbXTtcblx0ICB9LFxuXG5cdCAgX2ZyZWU6IGZ1bmN0aW9uIF9mcmVlKCkge1xuXHQgICAgdGhpcy5fYnVmZiA9IG51bGw7XG5cdCAgfSxcblxuXHQgIF9oYW5kbGVWYWx1ZTogZnVuY3Rpb24gX2hhbmRsZVZhbHVlKHgpIHtcblx0ICAgIHRoaXMuX2J1ZmYgPSBzbGlkZSh0aGlzLl9idWZmLCB4LCB0aGlzLl9tYXgpO1xuXHQgICAgaWYgKHRoaXMuX2J1ZmYubGVuZ3RoID49IHRoaXMuX21pbikge1xuXHQgICAgICB0aGlzLl9lbWl0VmFsdWUodGhpcy5fYnVmZik7XG5cdCAgICB9XG5cdCAgfVxuXG5cdH07XG5cblx0dmFyIFMgPSBjcmVhdGVTdHJlYW0oJ3NsaWRpbmdXaW5kb3cnLCBtaXhpbik7XG5cdHZhciBQID0gY3JlYXRlUHJvcGVydHkoJ3NsaWRpbmdXaW5kb3cnLCBtaXhpbik7XG5cblx0bW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBzbGlkaW5nV2luZG93KG9icywgbWF4KSB7XG5cdCAgdmFyIG1pbiA9IGFyZ3VtZW50cy5sZW5ndGggPD0gMiB8fCBhcmd1bWVudHNbMl0gPT09IHVuZGVmaW5lZCA/IDAgOiBhcmd1bWVudHNbMl07XG5cblx0ICByZXR1cm4gbmV3IChvYnMuX29mU2FtZVR5cGUoUywgUCkpKG9icywgeyBtaW46IG1pbiwgbWF4OiBtYXggfSk7XG5cdH07XG5cbi8qKiovIH0sXG4vKiA1NSAqL1xuLyoqKi8gZnVuY3Rpb24obW9kdWxlLCBleHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKSB7XG5cblx0J3VzZSBzdHJpY3QnO1xuXG5cdHZhciBfcmVxdWlyZSA9IF9fd2VicGFja19yZXF1aXJlX18oMjUpO1xuXG5cdHZhciBjcmVhdGVTdHJlYW0gPSBfcmVxdWlyZS5jcmVhdGVTdHJlYW07XG5cdHZhciBjcmVhdGVQcm9wZXJ0eSA9IF9yZXF1aXJlLmNyZWF0ZVByb3BlcnR5O1xuXG5cdHZhciBtaXhpbiA9IHtcblxuXHQgIF9pbml0OiBmdW5jdGlvbiBfaW5pdChfcmVmKSB7XG5cdCAgICB2YXIgZm4gPSBfcmVmLmZuO1xuXHQgICAgdmFyIGZsdXNoT25FbmQgPSBfcmVmLmZsdXNoT25FbmQ7XG5cblx0ICAgIHRoaXMuX2ZuID0gZm47XG5cdCAgICB0aGlzLl9mbHVzaE9uRW5kID0gZmx1c2hPbkVuZDtcblx0ICAgIHRoaXMuX2J1ZmYgPSBbXTtcblx0ICB9LFxuXG5cdCAgX2ZyZWU6IGZ1bmN0aW9uIF9mcmVlKCkge1xuXHQgICAgdGhpcy5fYnVmZiA9IG51bGw7XG5cdCAgfSxcblxuXHQgIF9mbHVzaDogZnVuY3Rpb24gX2ZsdXNoKCkge1xuXHQgICAgaWYgKHRoaXMuX2J1ZmYgIT09IG51bGwgJiYgdGhpcy5fYnVmZi5sZW5ndGggIT09IDApIHtcblx0ICAgICAgdGhpcy5fZW1pdFZhbHVlKHRoaXMuX2J1ZmYpO1xuXHQgICAgICB0aGlzLl9idWZmID0gW107XG5cdCAgICB9XG5cdCAgfSxcblxuXHQgIF9oYW5kbGVWYWx1ZTogZnVuY3Rpb24gX2hhbmRsZVZhbHVlKHgpIHtcblx0ICAgIHRoaXMuX2J1ZmYucHVzaCh4KTtcblx0ICAgIHZhciBmbiA9IHRoaXMuX2ZuO1xuXHQgICAgaWYgKCFmbih4KSkge1xuXHQgICAgICB0aGlzLl9mbHVzaCgpO1xuXHQgICAgfVxuXHQgIH0sXG5cblx0ICBfaGFuZGxlRW5kOiBmdW5jdGlvbiBfaGFuZGxlRW5kKCkge1xuXHQgICAgaWYgKHRoaXMuX2ZsdXNoT25FbmQpIHtcblx0ICAgICAgdGhpcy5fZmx1c2goKTtcblx0ICAgIH1cblx0ICAgIHRoaXMuX2VtaXRFbmQoKTtcblx0ICB9XG5cblx0fTtcblxuXHR2YXIgUyA9IGNyZWF0ZVN0cmVhbSgnYnVmZmVyV2hpbGUnLCBtaXhpbik7XG5cdHZhciBQID0gY3JlYXRlUHJvcGVydHkoJ2J1ZmZlcldoaWxlJywgbWl4aW4pO1xuXG5cdHZhciBpZCA9IGZ1bmN0aW9uIGlkKHgpIHtcblx0ICByZXR1cm4geDtcblx0fTtcblxuXHRtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGJ1ZmZlcldoaWxlKG9icywgZm4pIHtcblx0ICB2YXIgX3JlZjIgPSBhcmd1bWVudHMubGVuZ3RoIDw9IDIgfHwgYXJndW1lbnRzWzJdID09PSB1bmRlZmluZWQgPyB7fSA6IGFyZ3VtZW50c1syXTtcblxuXHQgIHZhciBfcmVmMiRmbHVzaE9uRW5kID0gX3JlZjIuZmx1c2hPbkVuZDtcblx0ICB2YXIgZmx1c2hPbkVuZCA9IF9yZWYyJGZsdXNoT25FbmQgPT09IHVuZGVmaW5lZCA/IHRydWUgOiBfcmVmMiRmbHVzaE9uRW5kO1xuXG5cdCAgcmV0dXJuIG5ldyAob2JzLl9vZlNhbWVUeXBlKFMsIFApKShvYnMsIHsgZm46IGZuIHx8IGlkLCBmbHVzaE9uRW5kOiBmbHVzaE9uRW5kIH0pO1xuXHR9O1xuXG4vKioqLyB9LFxuLyogNTYgKi9cbi8qKiovIGZ1bmN0aW9uKG1vZHVsZSwgZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXykge1xuXG5cdCd1c2Ugc3RyaWN0JztcblxuXHR2YXIgX3JlcXVpcmUgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDI1KTtcblxuXHR2YXIgY3JlYXRlU3RyZWFtID0gX3JlcXVpcmUuY3JlYXRlU3RyZWFtO1xuXHR2YXIgY3JlYXRlUHJvcGVydHkgPSBfcmVxdWlyZS5jcmVhdGVQcm9wZXJ0eTtcblxuXHR2YXIgbWl4aW4gPSB7XG5cblx0ICBfaW5pdDogZnVuY3Rpb24gX2luaXQoX3JlZikge1xuXHQgICAgdmFyIGNvdW50ID0gX3JlZi5jb3VudDtcblx0ICAgIHZhciBmbHVzaE9uRW5kID0gX3JlZi5mbHVzaE9uRW5kO1xuXG5cdCAgICB0aGlzLl9jb3VudCA9IGNvdW50O1xuXHQgICAgdGhpcy5fZmx1c2hPbkVuZCA9IGZsdXNoT25FbmQ7XG5cdCAgICB0aGlzLl9idWZmID0gW107XG5cdCAgfSxcblxuXHQgIF9mcmVlOiBmdW5jdGlvbiBfZnJlZSgpIHtcblx0ICAgIHRoaXMuX2J1ZmYgPSBudWxsO1xuXHQgIH0sXG5cblx0ICBfZmx1c2g6IGZ1bmN0aW9uIF9mbHVzaCgpIHtcblx0ICAgIGlmICh0aGlzLl9idWZmICE9PSBudWxsICYmIHRoaXMuX2J1ZmYubGVuZ3RoICE9PSAwKSB7XG5cdCAgICAgIHRoaXMuX2VtaXRWYWx1ZSh0aGlzLl9idWZmKTtcblx0ICAgICAgdGhpcy5fYnVmZiA9IFtdO1xuXHQgICAgfVxuXHQgIH0sXG5cblx0ICBfaGFuZGxlVmFsdWU6IGZ1bmN0aW9uIF9oYW5kbGVWYWx1ZSh4KSB7XG5cdCAgICB0aGlzLl9idWZmLnB1c2goeCk7XG5cdCAgICBpZiAodGhpcy5fYnVmZi5sZW5ndGggPj0gdGhpcy5fY291bnQpIHtcblx0ICAgICAgdGhpcy5fZmx1c2goKTtcblx0ICAgIH1cblx0ICB9LFxuXG5cdCAgX2hhbmRsZUVuZDogZnVuY3Rpb24gX2hhbmRsZUVuZCgpIHtcblx0ICAgIGlmICh0aGlzLl9mbHVzaE9uRW5kKSB7XG5cdCAgICAgIHRoaXMuX2ZsdXNoKCk7XG5cdCAgICB9XG5cdCAgICB0aGlzLl9lbWl0RW5kKCk7XG5cdCAgfVxuXG5cdH07XG5cblx0dmFyIFMgPSBjcmVhdGVTdHJlYW0oJ2J1ZmZlcldpdGhDb3VudCcsIG1peGluKTtcblx0dmFyIFAgPSBjcmVhdGVQcm9wZXJ0eSgnYnVmZmVyV2l0aENvdW50JywgbWl4aW4pO1xuXG5cdG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gYnVmZmVyV2hpbGUob2JzLCBjb3VudCkge1xuXHQgIHZhciBfcmVmMiA9IGFyZ3VtZW50cy5sZW5ndGggPD0gMiB8fCBhcmd1bWVudHNbMl0gPT09IHVuZGVmaW5lZCA/IHt9IDogYXJndW1lbnRzWzJdO1xuXG5cdCAgdmFyIF9yZWYyJGZsdXNoT25FbmQgPSBfcmVmMi5mbHVzaE9uRW5kO1xuXHQgIHZhciBmbHVzaE9uRW5kID0gX3JlZjIkZmx1c2hPbkVuZCA9PT0gdW5kZWZpbmVkID8gdHJ1ZSA6IF9yZWYyJGZsdXNoT25FbmQ7XG5cblx0ICByZXR1cm4gbmV3IChvYnMuX29mU2FtZVR5cGUoUywgUCkpKG9icywgeyBjb3VudDogY291bnQsIGZsdXNoT25FbmQ6IGZsdXNoT25FbmQgfSk7XG5cdH07XG5cbi8qKiovIH0sXG4vKiA1NyAqL1xuLyoqKi8gZnVuY3Rpb24obW9kdWxlLCBleHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKSB7XG5cblx0J3VzZSBzdHJpY3QnO1xuXG5cdHZhciBfcmVxdWlyZSA9IF9fd2VicGFja19yZXF1aXJlX18oMjUpO1xuXG5cdHZhciBjcmVhdGVTdHJlYW0gPSBfcmVxdWlyZS5jcmVhdGVTdHJlYW07XG5cdHZhciBjcmVhdGVQcm9wZXJ0eSA9IF9yZXF1aXJlLmNyZWF0ZVByb3BlcnR5O1xuXG5cdHZhciBtaXhpbiA9IHtcblxuXHQgIF9pbml0OiBmdW5jdGlvbiBfaW5pdChfcmVmKSB7XG5cdCAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG5cdCAgICB2YXIgd2FpdCA9IF9yZWYud2FpdDtcblx0ICAgIHZhciBjb3VudCA9IF9yZWYuY291bnQ7XG5cdCAgICB2YXIgZmx1c2hPbkVuZCA9IF9yZWYuZmx1c2hPbkVuZDtcblxuXHQgICAgdGhpcy5fd2FpdCA9IHdhaXQ7XG5cdCAgICB0aGlzLl9jb3VudCA9IGNvdW50O1xuXHQgICAgdGhpcy5fZmx1c2hPbkVuZCA9IGZsdXNoT25FbmQ7XG5cdCAgICB0aGlzLl9pbnRlcnZhbElkID0gbnVsbDtcblx0ICAgIHRoaXMuXyRvblRpY2sgPSBmdW5jdGlvbiAoKSB7XG5cdCAgICAgIHJldHVybiBfdGhpcy5fZmx1c2goKTtcblx0ICAgIH07XG5cdCAgICB0aGlzLl9idWZmID0gW107XG5cdCAgfSxcblxuXHQgIF9mcmVlOiBmdW5jdGlvbiBfZnJlZSgpIHtcblx0ICAgIHRoaXMuXyRvblRpY2sgPSBudWxsO1xuXHQgICAgdGhpcy5fYnVmZiA9IG51bGw7XG5cdCAgfSxcblxuXHQgIF9mbHVzaDogZnVuY3Rpb24gX2ZsdXNoKCkge1xuXHQgICAgaWYgKHRoaXMuX2J1ZmYgIT09IG51bGwpIHtcblx0ICAgICAgdGhpcy5fZW1pdFZhbHVlKHRoaXMuX2J1ZmYpO1xuXHQgICAgICB0aGlzLl9idWZmID0gW107XG5cdCAgICB9XG5cdCAgfSxcblxuXHQgIF9oYW5kbGVWYWx1ZTogZnVuY3Rpb24gX2hhbmRsZVZhbHVlKHgpIHtcblx0ICAgIHRoaXMuX2J1ZmYucHVzaCh4KTtcblx0ICAgIGlmICh0aGlzLl9idWZmLmxlbmd0aCA+PSB0aGlzLl9jb3VudCkge1xuXHQgICAgICBjbGVhckludGVydmFsKHRoaXMuX2ludGVydmFsSWQpO1xuXHQgICAgICB0aGlzLl9mbHVzaCgpO1xuXHQgICAgICB0aGlzLl9pbnRlcnZhbElkID0gc2V0SW50ZXJ2YWwodGhpcy5fJG9uVGljaywgdGhpcy5fd2FpdCk7XG5cdCAgICB9XG5cdCAgfSxcblxuXHQgIF9oYW5kbGVFbmQ6IGZ1bmN0aW9uIF9oYW5kbGVFbmQoKSB7XG5cdCAgICBpZiAodGhpcy5fZmx1c2hPbkVuZCAmJiB0aGlzLl9idWZmLmxlbmd0aCAhPT0gMCkge1xuXHQgICAgICB0aGlzLl9mbHVzaCgpO1xuXHQgICAgfVxuXHQgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgIH0sXG5cblx0ICBfb25BY3RpdmF0aW9uOiBmdW5jdGlvbiBfb25BY3RpdmF0aW9uKCkge1xuXHQgICAgdGhpcy5fc291cmNlLm9uQW55KHRoaXMuXyRoYW5kbGVBbnkpOyAvLyBjb3BpZWQgZnJvbSBwYXR0ZXJucy9vbmUtc291cmNlXG5cdCAgICB0aGlzLl9pbnRlcnZhbElkID0gc2V0SW50ZXJ2YWwodGhpcy5fJG9uVGljaywgdGhpcy5fd2FpdCk7XG5cdCAgfSxcblxuXHQgIF9vbkRlYWN0aXZhdGlvbjogZnVuY3Rpb24gX29uRGVhY3RpdmF0aW9uKCkge1xuXHQgICAgaWYgKHRoaXMuX2ludGVydmFsSWQgIT09IG51bGwpIHtcblx0ICAgICAgY2xlYXJJbnRlcnZhbCh0aGlzLl9pbnRlcnZhbElkKTtcblx0ICAgICAgdGhpcy5faW50ZXJ2YWxJZCA9IG51bGw7XG5cdCAgICB9XG5cdCAgICB0aGlzLl9zb3VyY2Uub2ZmQW55KHRoaXMuXyRoYW5kbGVBbnkpOyAvLyBjb3BpZWQgZnJvbSBwYXR0ZXJucy9vbmUtc291cmNlXG5cdCAgfVxuXG5cdH07XG5cblx0dmFyIFMgPSBjcmVhdGVTdHJlYW0oJ2J1ZmZlcldpdGhUaW1lT3JDb3VudCcsIG1peGluKTtcblx0dmFyIFAgPSBjcmVhdGVQcm9wZXJ0eSgnYnVmZmVyV2l0aFRpbWVPckNvdW50JywgbWl4aW4pO1xuXG5cdG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gYnVmZmVyV2l0aFRpbWVPckNvdW50KG9icywgd2FpdCwgY291bnQpIHtcblx0ICB2YXIgX3JlZjIgPSBhcmd1bWVudHMubGVuZ3RoIDw9IDMgfHwgYXJndW1lbnRzWzNdID09PSB1bmRlZmluZWQgPyB7fSA6IGFyZ3VtZW50c1szXTtcblxuXHQgIHZhciBfcmVmMiRmbHVzaE9uRW5kID0gX3JlZjIuZmx1c2hPbkVuZDtcblx0ICB2YXIgZmx1c2hPbkVuZCA9IF9yZWYyJGZsdXNoT25FbmQgPT09IHVuZGVmaW5lZCA/IHRydWUgOiBfcmVmMiRmbHVzaE9uRW5kO1xuXG5cdCAgcmV0dXJuIG5ldyAob2JzLl9vZlNhbWVUeXBlKFMsIFApKShvYnMsIHsgd2FpdDogd2FpdCwgY291bnQ6IGNvdW50LCBmbHVzaE9uRW5kOiBmbHVzaE9uRW5kIH0pO1xuXHR9O1xuXG4vKioqLyB9LFxuLyogNTggKi9cbi8qKiovIGZ1bmN0aW9uKG1vZHVsZSwgZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXykge1xuXG5cdCd1c2Ugc3RyaWN0JztcblxuXHR2YXIgX3JlcXVpcmUgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDI1KTtcblxuXHR2YXIgY3JlYXRlU3RyZWFtID0gX3JlcXVpcmUuY3JlYXRlU3RyZWFtO1xuXHR2YXIgY3JlYXRlUHJvcGVydHkgPSBfcmVxdWlyZS5jcmVhdGVQcm9wZXJ0eTtcblxuXHRmdW5jdGlvbiB4Zm9ybUZvck9icyhvYnMpIHtcblx0ICByZXR1cm4ge1xuXG5cdCAgICAnQEB0cmFuc2R1Y2VyL3N0ZXAnOiBmdW5jdGlvbiB0cmFuc2R1Y2VyU3RlcChyZXMsIGlucHV0KSB7XG5cdCAgICAgIG9icy5fZW1pdFZhbHVlKGlucHV0KTtcblx0ICAgICAgcmV0dXJuIG51bGw7XG5cdCAgICB9LFxuXG5cdCAgICAnQEB0cmFuc2R1Y2VyL3Jlc3VsdCc6IGZ1bmN0aW9uIHRyYW5zZHVjZXJSZXN1bHQoKSB7XG5cdCAgICAgIG9icy5fZW1pdEVuZCgpO1xuXHQgICAgICByZXR1cm4gbnVsbDtcblx0ICAgIH1cblxuXHQgIH07XG5cdH1cblxuXHR2YXIgbWl4aW4gPSB7XG5cblx0ICBfaW5pdDogZnVuY3Rpb24gX2luaXQoX3JlZikge1xuXHQgICAgdmFyIHRyYW5zZHVjZXIgPSBfcmVmLnRyYW5zZHVjZXI7XG5cblx0ICAgIHRoaXMuX3hmb3JtID0gdHJhbnNkdWNlcih4Zm9ybUZvck9icyh0aGlzKSk7XG5cdCAgfSxcblxuXHQgIF9mcmVlOiBmdW5jdGlvbiBfZnJlZSgpIHtcblx0ICAgIHRoaXMuX3hmb3JtID0gbnVsbDtcblx0ICB9LFxuXG5cdCAgX2hhbmRsZVZhbHVlOiBmdW5jdGlvbiBfaGFuZGxlVmFsdWUoeCkge1xuXHQgICAgaWYgKHRoaXMuX3hmb3JtWydAQHRyYW5zZHVjZXIvc3RlcCddKG51bGwsIHgpICE9PSBudWxsKSB7XG5cdCAgICAgIHRoaXMuX3hmb3JtWydAQHRyYW5zZHVjZXIvcmVzdWx0J10obnVsbCk7XG5cdCAgICB9XG5cdCAgfSxcblxuXHQgIF9oYW5kbGVFbmQ6IGZ1bmN0aW9uIF9oYW5kbGVFbmQoKSB7XG5cdCAgICB0aGlzLl94Zm9ybVsnQEB0cmFuc2R1Y2VyL3Jlc3VsdCddKG51bGwpO1xuXHQgIH1cblxuXHR9O1xuXG5cdHZhciBTID0gY3JlYXRlU3RyZWFtKCd0cmFuc2R1Y2UnLCBtaXhpbik7XG5cdHZhciBQID0gY3JlYXRlUHJvcGVydHkoJ3RyYW5zZHVjZScsIG1peGluKTtcblxuXHRtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIHRyYW5zZHVjZShvYnMsIHRyYW5zZHVjZXIpIHtcblx0ICByZXR1cm4gbmV3IChvYnMuX29mU2FtZVR5cGUoUywgUCkpKG9icywgeyB0cmFuc2R1Y2VyOiB0cmFuc2R1Y2VyIH0pO1xuXHR9O1xuXG4vKioqLyB9LFxuLyogNTkgKi9cbi8qKiovIGZ1bmN0aW9uKG1vZHVsZSwgZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXykge1xuXG5cdCd1c2Ugc3RyaWN0JztcblxuXHR2YXIgX3JlcXVpcmUgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDI1KTtcblxuXHR2YXIgY3JlYXRlU3RyZWFtID0gX3JlcXVpcmUuY3JlYXRlU3RyZWFtO1xuXHR2YXIgY3JlYXRlUHJvcGVydHkgPSBfcmVxdWlyZS5jcmVhdGVQcm9wZXJ0eTtcblxuXHR2YXIgZW1pdHRlciA9IF9fd2VicGFja19yZXF1aXJlX18oMTUpO1xuXG5cdHZhciBtaXhpbiA9IHtcblxuXHQgIF9pbml0OiBmdW5jdGlvbiBfaW5pdChfcmVmKSB7XG5cdCAgICB2YXIgZm4gPSBfcmVmLmZuO1xuXG5cdCAgICB0aGlzLl9oYW5kbGVyID0gZm47XG5cdCAgICB0aGlzLl9lbWl0dGVyID0gZW1pdHRlcih0aGlzKTtcblx0ICB9LFxuXG5cdCAgX2ZyZWU6IGZ1bmN0aW9uIF9mcmVlKCkge1xuXHQgICAgdGhpcy5faGFuZGxlciA9IG51bGw7XG5cdCAgICB0aGlzLl9lbWl0dGVyID0gbnVsbDtcblx0ICB9LFxuXG5cdCAgX2hhbmRsZUFueTogZnVuY3Rpb24gX2hhbmRsZUFueShldmVudCkge1xuXHQgICAgdGhpcy5faGFuZGxlcih0aGlzLl9lbWl0dGVyLCBldmVudCk7XG5cdCAgfVxuXG5cdH07XG5cblx0dmFyIFMgPSBjcmVhdGVTdHJlYW0oJ3dpdGhIYW5kbGVyJywgbWl4aW4pO1xuXHR2YXIgUCA9IGNyZWF0ZVByb3BlcnR5KCd3aXRoSGFuZGxlcicsIG1peGluKTtcblxuXHRtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIHdpdGhIYW5kbGVyKG9icywgZm4pIHtcblx0ICByZXR1cm4gbmV3IChvYnMuX29mU2FtZVR5cGUoUywgUCkpKG9icywgeyBmbjogZm4gfSk7XG5cdH07XG5cbi8qKiovIH0sXG4vKiA2MCAqL1xuLyoqKi8gZnVuY3Rpb24obW9kdWxlLCBleHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKSB7XG5cblx0J3VzZSBzdHJpY3QnO1xuXG5cdHZhciBTdHJlYW0gPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDYpO1xuXG5cdHZhciBfcmVxdWlyZSA9IF9fd2VicGFja19yZXF1aXJlX18oMyk7XG5cblx0dmFyIFZBTFVFID0gX3JlcXVpcmUuVkFMVUU7XG5cdHZhciBFUlJPUiA9IF9yZXF1aXJlLkVSUk9SO1xuXHR2YXIgTk9USElORyA9IF9yZXF1aXJlLk5PVEhJTkc7XG5cblx0dmFyIF9yZXF1aXJlMiA9IF9fd2VicGFja19yZXF1aXJlX18oMik7XG5cblx0dmFyIGluaGVyaXQgPSBfcmVxdWlyZTIuaW5oZXJpdDtcblxuXHR2YXIgX3JlcXVpcmUzID0gX193ZWJwYWNrX3JlcXVpcmVfXyg1KTtcblxuXHR2YXIgY29uY2F0ID0gX3JlcXVpcmUzLmNvbmNhdDtcblx0dmFyIGZpbGxBcnJheSA9IF9yZXF1aXJlMy5maWxsQXJyYXk7XG5cblx0dmFyIF9yZXF1aXJlNCA9IF9fd2VicGFja19yZXF1aXJlX18oMjEpO1xuXG5cdHZhciBzcHJlYWQgPSBfcmVxdWlyZTQuc3ByZWFkO1xuXG5cdHZhciBuZXZlciA9IF9fd2VicGFja19yZXF1aXJlX18oOCk7XG5cblx0ZnVuY3Rpb24gZGVmYXVsdEVycm9yc0NvbWJpbmF0b3IoZXJyb3JzKSB7XG5cdCAgdmFyIGxhdGVzdEVycm9yID0gdW5kZWZpbmVkO1xuXHQgIGZvciAodmFyIGkgPSAwOyBpIDwgZXJyb3JzLmxlbmd0aDsgaSsrKSB7XG5cdCAgICBpZiAoZXJyb3JzW2ldICE9PSB1bmRlZmluZWQpIHtcblx0ICAgICAgaWYgKGxhdGVzdEVycm9yID09PSB1bmRlZmluZWQgfHwgbGF0ZXN0RXJyb3IuaW5kZXggPCBlcnJvcnNbaV0uaW5kZXgpIHtcblx0ICAgICAgICBsYXRlc3RFcnJvciA9IGVycm9yc1tpXTtcblx0ICAgICAgfVxuXHQgICAgfVxuXHQgIH1cblx0ICByZXR1cm4gbGF0ZXN0RXJyb3IuZXJyb3I7XG5cdH1cblxuXHRmdW5jdGlvbiBDb21iaW5lKGFjdGl2ZSwgcGFzc2l2ZSwgY29tYmluYXRvcikge1xuXHQgIHZhciBfdGhpcyA9IHRoaXM7XG5cblx0ICBTdHJlYW0uY2FsbCh0aGlzKTtcblx0ICB0aGlzLl9hY3RpdmVDb3VudCA9IGFjdGl2ZS5sZW5ndGg7XG5cdCAgdGhpcy5fc291cmNlcyA9IGNvbmNhdChhY3RpdmUsIHBhc3NpdmUpO1xuXHQgIHRoaXMuX2NvbWJpbmF0b3IgPSBjb21iaW5hdG9yID8gc3ByZWFkKGNvbWJpbmF0b3IsIHRoaXMuX3NvdXJjZXMubGVuZ3RoKSA6IGZ1bmN0aW9uICh4KSB7XG5cdCAgICByZXR1cm4geDtcblx0ICB9O1xuXHQgIHRoaXMuX2FsaXZlQ291bnQgPSAwO1xuXHQgIHRoaXMuX2xhdGVzdFZhbHVlcyA9IG5ldyBBcnJheSh0aGlzLl9zb3VyY2VzLmxlbmd0aCk7XG5cdCAgdGhpcy5fbGF0ZXN0RXJyb3JzID0gbmV3IEFycmF5KHRoaXMuX3NvdXJjZXMubGVuZ3RoKTtcblx0ICBmaWxsQXJyYXkodGhpcy5fbGF0ZXN0VmFsdWVzLCBOT1RISU5HKTtcblx0ICB0aGlzLl9lbWl0QWZ0ZXJBY3RpdmF0aW9uID0gZmFsc2U7XG5cdCAgdGhpcy5fZW5kQWZ0ZXJBY3RpdmF0aW9uID0gZmFsc2U7XG5cdCAgdGhpcy5fbGF0ZXN0RXJyb3JJbmRleCA9IDA7XG5cblx0ICB0aGlzLl8kaGFuZGxlcnMgPSBbXTtcblxuXHQgIHZhciBfbG9vcCA9IGZ1bmN0aW9uIChpKSB7XG5cdCAgICBfdGhpcy5fJGhhbmRsZXJzLnB1c2goZnVuY3Rpb24gKGV2ZW50KSB7XG5cdCAgICAgIHJldHVybiBfdGhpcy5faGFuZGxlQW55KGksIGV2ZW50KTtcblx0ICAgIH0pO1xuXHQgIH07XG5cblx0ICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuX3NvdXJjZXMubGVuZ3RoOyBpKyspIHtcblx0ICAgIF9sb29wKGkpO1xuXHQgIH1cblx0fVxuXG5cdGluaGVyaXQoQ29tYmluZSwgU3RyZWFtLCB7XG5cblx0ICBfbmFtZTogJ2NvbWJpbmUnLFxuXG5cdCAgX29uQWN0aXZhdGlvbjogZnVuY3Rpb24gX29uQWN0aXZhdGlvbigpIHtcblx0ICAgIHRoaXMuX2FsaXZlQ291bnQgPSB0aGlzLl9hY3RpdmVDb3VudDtcblxuXHQgICAgLy8gd2UgbmVlZCB0byBzdXNjcmliZSB0byBfcGFzc2l2ZV8gc291cmNlcyBiZWZvcmUgX2FjdGl2ZV9cblx0ICAgIC8vIChzZWUgaHR0cHM6Ly9naXRodWIuY29tL3Jwb21pbm92L2tlZmlyL2lzc3Vlcy85OClcblx0ICAgIGZvciAodmFyIGkgPSB0aGlzLl9hY3RpdmVDb3VudDsgaSA8IHRoaXMuX3NvdXJjZXMubGVuZ3RoOyBpKyspIHtcblx0ICAgICAgdGhpcy5fc291cmNlc1tpXS5vbkFueSh0aGlzLl8kaGFuZGxlcnNbaV0pO1xuXHQgICAgfVxuXHQgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLl9hY3RpdmVDb3VudDsgaSsrKSB7XG5cdCAgICAgIHRoaXMuX3NvdXJjZXNbaV0ub25BbnkodGhpcy5fJGhhbmRsZXJzW2ldKTtcblx0ICAgIH1cblxuXHQgICAgaWYgKHRoaXMuX2VtaXRBZnRlckFjdGl2YXRpb24pIHtcblx0ICAgICAgdGhpcy5fZW1pdEFmdGVyQWN0aXZhdGlvbiA9IGZhbHNlO1xuXHQgICAgICB0aGlzLl9lbWl0SWZGdWxsKCk7XG5cdCAgICB9XG5cdCAgICBpZiAodGhpcy5fZW5kQWZ0ZXJBY3RpdmF0aW9uKSB7XG5cdCAgICAgIHRoaXMuX2VtaXRFbmQoKTtcblx0ICAgIH1cblx0ICB9LFxuXG5cdCAgX29uRGVhY3RpdmF0aW9uOiBmdW5jdGlvbiBfb25EZWFjdGl2YXRpb24oKSB7XG5cdCAgICB2YXIgbGVuZ3RoID0gdGhpcy5fc291cmNlcy5sZW5ndGgsXG5cdCAgICAgICAgaSA9IHVuZGVmaW5lZDtcblx0ICAgIGZvciAoaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuXHQgICAgICB0aGlzLl9zb3VyY2VzW2ldLm9mZkFueSh0aGlzLl8kaGFuZGxlcnNbaV0pO1xuXHQgICAgfVxuXHQgIH0sXG5cblx0ICBfZW1pdElmRnVsbDogZnVuY3Rpb24gX2VtaXRJZkZ1bGwoKSB7XG5cdCAgICB2YXIgaGFzQWxsVmFsdWVzID0gdHJ1ZTtcblx0ICAgIHZhciBoYXNFcnJvcnMgPSBmYWxzZTtcblx0ICAgIHZhciBsZW5ndGggPSB0aGlzLl9sYXRlc3RWYWx1ZXMubGVuZ3RoO1xuXHQgICAgdmFyIHZhbHVlc0NvcHkgPSBuZXcgQXJyYXkobGVuZ3RoKTtcblx0ICAgIHZhciBlcnJvcnNDb3B5ID0gbmV3IEFycmF5KGxlbmd0aCk7XG5cblx0ICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcblx0ICAgICAgdmFsdWVzQ29weVtpXSA9IHRoaXMuX2xhdGVzdFZhbHVlc1tpXTtcblx0ICAgICAgZXJyb3JzQ29weVtpXSA9IHRoaXMuX2xhdGVzdEVycm9yc1tpXTtcblxuXHQgICAgICBpZiAodmFsdWVzQ29weVtpXSA9PT0gTk9USElORykge1xuXHQgICAgICAgIGhhc0FsbFZhbHVlcyA9IGZhbHNlO1xuXHQgICAgICB9XG5cblx0ICAgICAgaWYgKGVycm9yc0NvcHlbaV0gIT09IHVuZGVmaW5lZCkge1xuXHQgICAgICAgIGhhc0Vycm9ycyA9IHRydWU7XG5cdCAgICAgIH1cblx0ICAgIH1cblxuXHQgICAgaWYgKGhhc0FsbFZhbHVlcykge1xuXHQgICAgICB2YXIgY29tYmluYXRvciA9IHRoaXMuX2NvbWJpbmF0b3I7XG5cdCAgICAgIHRoaXMuX2VtaXRWYWx1ZShjb21iaW5hdG9yKHZhbHVlc0NvcHkpKTtcblx0ICAgIH1cblx0ICAgIGlmIChoYXNFcnJvcnMpIHtcblx0ICAgICAgdGhpcy5fZW1pdEVycm9yKGRlZmF1bHRFcnJvcnNDb21iaW5hdG9yKGVycm9yc0NvcHkpKTtcblx0ICAgIH1cblx0ICB9LFxuXG5cdCAgX2hhbmRsZUFueTogZnVuY3Rpb24gX2hhbmRsZUFueShpLCBldmVudCkge1xuXG5cdCAgICBpZiAoZXZlbnQudHlwZSA9PT0gVkFMVUUgfHwgZXZlbnQudHlwZSA9PT0gRVJST1IpIHtcblxuXHQgICAgICBpZiAoZXZlbnQudHlwZSA9PT0gVkFMVUUpIHtcblx0ICAgICAgICB0aGlzLl9sYXRlc3RWYWx1ZXNbaV0gPSBldmVudC52YWx1ZTtcblx0ICAgICAgICB0aGlzLl9sYXRlc3RFcnJvcnNbaV0gPSB1bmRlZmluZWQ7XG5cdCAgICAgIH1cblx0ICAgICAgaWYgKGV2ZW50LnR5cGUgPT09IEVSUk9SKSB7XG5cdCAgICAgICAgdGhpcy5fbGF0ZXN0VmFsdWVzW2ldID0gTk9USElORztcblx0ICAgICAgICB0aGlzLl9sYXRlc3RFcnJvcnNbaV0gPSB7XG5cdCAgICAgICAgICBpbmRleDogdGhpcy5fbGF0ZXN0RXJyb3JJbmRleCsrLFxuXHQgICAgICAgICAgZXJyb3I6IGV2ZW50LnZhbHVlXG5cdCAgICAgICAgfTtcblx0ICAgICAgfVxuXG5cdCAgICAgIGlmIChpIDwgdGhpcy5fYWN0aXZlQ291bnQpIHtcblx0ICAgICAgICBpZiAodGhpcy5fYWN0aXZhdGluZykge1xuXHQgICAgICAgICAgdGhpcy5fZW1pdEFmdGVyQWN0aXZhdGlvbiA9IHRydWU7XG5cdCAgICAgICAgfSBlbHNlIHtcblx0ICAgICAgICAgIHRoaXMuX2VtaXRJZkZ1bGwoKTtcblx0ICAgICAgICB9XG5cdCAgICAgIH1cblx0ICAgIH0gZWxzZSB7XG5cdCAgICAgIC8vIEVORFxuXG5cdCAgICAgIGlmIChpIDwgdGhpcy5fYWN0aXZlQ291bnQpIHtcblx0ICAgICAgICB0aGlzLl9hbGl2ZUNvdW50LS07XG5cdCAgICAgICAgaWYgKHRoaXMuX2FsaXZlQ291bnQgPT09IDApIHtcblx0ICAgICAgICAgIGlmICh0aGlzLl9hY3RpdmF0aW5nKSB7XG5cdCAgICAgICAgICAgIHRoaXMuX2VuZEFmdGVyQWN0aXZhdGlvbiA9IHRydWU7XG5cdCAgICAgICAgICB9IGVsc2Uge1xuXHQgICAgICAgICAgICB0aGlzLl9lbWl0RW5kKCk7XG5cdCAgICAgICAgICB9XG5cdCAgICAgICAgfVxuXHQgICAgICB9XG5cdCAgICB9XG5cdCAgfSxcblxuXHQgIF9jbGVhcjogZnVuY3Rpb24gX2NsZWFyKCkge1xuXHQgICAgU3RyZWFtLnByb3RvdHlwZS5fY2xlYXIuY2FsbCh0aGlzKTtcblx0ICAgIHRoaXMuX3NvdXJjZXMgPSBudWxsO1xuXHQgICAgdGhpcy5fbGF0ZXN0VmFsdWVzID0gbnVsbDtcblx0ICAgIHRoaXMuX2xhdGVzdEVycm9ycyA9IG51bGw7XG5cdCAgICB0aGlzLl9jb21iaW5hdG9yID0gbnVsbDtcblx0ICAgIHRoaXMuXyRoYW5kbGVycyA9IG51bGw7XG5cdCAgfVxuXG5cdH0pO1xuXG5cdG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gY29tYmluZShhY3RpdmUsIHBhc3NpdmUsIGNvbWJpbmF0b3IpIHtcblx0ICBpZiAocGFzc2l2ZSA9PT0gdW5kZWZpbmVkKSBwYXNzaXZlID0gW107XG5cblx0ICBpZiAodHlwZW9mIHBhc3NpdmUgPT09ICdmdW5jdGlvbicpIHtcblx0ICAgIGNvbWJpbmF0b3IgPSBwYXNzaXZlO1xuXHQgICAgcGFzc2l2ZSA9IFtdO1xuXHQgIH1cblx0ICByZXR1cm4gYWN0aXZlLmxlbmd0aCA9PT0gMCA/IG5ldmVyKCkgOiBuZXcgQ29tYmluZShhY3RpdmUsIHBhc3NpdmUsIGNvbWJpbmF0b3IpO1xuXHR9O1xuXG4vKioqLyB9LFxuLyogNjEgKi9cbi8qKiovIGZ1bmN0aW9uKG1vZHVsZSwgZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXykge1xuXG5cdCd1c2Ugc3RyaWN0JztcblxuXHR2YXIgU3RyZWFtID0gX193ZWJwYWNrX3JlcXVpcmVfXyg2KTtcblxuXHR2YXIgX3JlcXVpcmUgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDMpO1xuXG5cdHZhciBWQUxVRSA9IF9yZXF1aXJlLlZBTFVFO1xuXHR2YXIgRVJST1IgPSBfcmVxdWlyZS5FUlJPUjtcblx0dmFyIEVORCA9IF9yZXF1aXJlLkVORDtcblxuXHR2YXIgX3JlcXVpcmUyID0gX193ZWJwYWNrX3JlcXVpcmVfXygyKTtcblxuXHR2YXIgaW5oZXJpdCA9IF9yZXF1aXJlMi5pbmhlcml0O1xuXG5cdHZhciBfcmVxdWlyZTMgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDUpO1xuXG5cdHZhciBtYXAgPSBfcmVxdWlyZTMubWFwO1xuXHR2YXIgY2xvbmVBcnJheSA9IF9yZXF1aXJlMy5jbG9uZUFycmF5O1xuXG5cdHZhciBfcmVxdWlyZTQgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDIxKTtcblxuXHR2YXIgc3ByZWFkID0gX3JlcXVpcmU0LnNwcmVhZDtcblxuXHR2YXIgbmV2ZXIgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDgpO1xuXG5cdHZhciBpc0FycmF5ID0gQXJyYXkuaXNBcnJheSB8fCBmdW5jdGlvbiAoeHMpIHtcblx0ICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHhzKSA9PT0gJ1tvYmplY3QgQXJyYXldJztcblx0fTtcblxuXHRmdW5jdGlvbiBaaXAoc291cmNlcywgY29tYmluYXRvcikge1xuXHQgIHZhciBfdGhpcyA9IHRoaXM7XG5cblx0ICBTdHJlYW0uY2FsbCh0aGlzKTtcblxuXHQgIHRoaXMuX2J1ZmZlcnMgPSBtYXAoc291cmNlcywgZnVuY3Rpb24gKHNvdXJjZSkge1xuXHQgICAgcmV0dXJuIGlzQXJyYXkoc291cmNlKSA/IGNsb25lQXJyYXkoc291cmNlKSA6IFtdO1xuXHQgIH0pO1xuXHQgIHRoaXMuX3NvdXJjZXMgPSBtYXAoc291cmNlcywgZnVuY3Rpb24gKHNvdXJjZSkge1xuXHQgICAgcmV0dXJuIGlzQXJyYXkoc291cmNlKSA/IG5ldmVyKCkgOiBzb3VyY2U7XG5cdCAgfSk7XG5cblx0ICB0aGlzLl9jb21iaW5hdG9yID0gY29tYmluYXRvciA/IHNwcmVhZChjb21iaW5hdG9yLCB0aGlzLl9zb3VyY2VzLmxlbmd0aCkgOiBmdW5jdGlvbiAoeCkge1xuXHQgICAgcmV0dXJuIHg7XG5cdCAgfTtcblx0ICB0aGlzLl9hbGl2ZUNvdW50ID0gMDtcblxuXHQgIHRoaXMuXyRoYW5kbGVycyA9IFtdO1xuXG5cdCAgdmFyIF9sb29wID0gZnVuY3Rpb24gKGkpIHtcblx0ICAgIF90aGlzLl8kaGFuZGxlcnMucHVzaChmdW5jdGlvbiAoZXZlbnQpIHtcblx0ICAgICAgcmV0dXJuIF90aGlzLl9oYW5kbGVBbnkoaSwgZXZlbnQpO1xuXHQgICAgfSk7XG5cdCAgfTtcblxuXHQgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5fc291cmNlcy5sZW5ndGg7IGkrKykge1xuXHQgICAgX2xvb3AoaSk7XG5cdCAgfVxuXHR9XG5cblx0aW5oZXJpdChaaXAsIFN0cmVhbSwge1xuXG5cdCAgX25hbWU6ICd6aXAnLFxuXG5cdCAgX29uQWN0aXZhdGlvbjogZnVuY3Rpb24gX29uQWN0aXZhdGlvbigpIHtcblxuXHQgICAgLy8gaWYgYWxsIHNvdXJjZXMgYXJlIGFycmF5c1xuXHQgICAgd2hpbGUgKHRoaXMuX2lzRnVsbCgpKSB7XG5cdCAgICAgIHRoaXMuX2VtaXQoKTtcblx0ICAgIH1cblxuXHQgICAgdmFyIGxlbmd0aCA9IHRoaXMuX3NvdXJjZXMubGVuZ3RoO1xuXHQgICAgdGhpcy5fYWxpdmVDb3VudCA9IGxlbmd0aDtcblx0ICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoICYmIHRoaXMuX2FjdGl2ZTsgaSsrKSB7XG5cdCAgICAgIHRoaXMuX3NvdXJjZXNbaV0ub25BbnkodGhpcy5fJGhhbmRsZXJzW2ldKTtcblx0ICAgIH1cblx0ICB9LFxuXG5cdCAgX29uRGVhY3RpdmF0aW9uOiBmdW5jdGlvbiBfb25EZWFjdGl2YXRpb24oKSB7XG5cdCAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuX3NvdXJjZXMubGVuZ3RoOyBpKyspIHtcblx0ICAgICAgdGhpcy5fc291cmNlc1tpXS5vZmZBbnkodGhpcy5fJGhhbmRsZXJzW2ldKTtcblx0ICAgIH1cblx0ICB9LFxuXG5cdCAgX2VtaXQ6IGZ1bmN0aW9uIF9lbWl0KCkge1xuXHQgICAgdmFyIHZhbHVlcyA9IG5ldyBBcnJheSh0aGlzLl9idWZmZXJzLmxlbmd0aCk7XG5cdCAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuX2J1ZmZlcnMubGVuZ3RoOyBpKyspIHtcblx0ICAgICAgdmFsdWVzW2ldID0gdGhpcy5fYnVmZmVyc1tpXS5zaGlmdCgpO1xuXHQgICAgfVxuXHQgICAgdmFyIGNvbWJpbmF0b3IgPSB0aGlzLl9jb21iaW5hdG9yO1xuXHQgICAgdGhpcy5fZW1pdFZhbHVlKGNvbWJpbmF0b3IodmFsdWVzKSk7XG5cdCAgfSxcblxuXHQgIF9pc0Z1bGw6IGZ1bmN0aW9uIF9pc0Z1bGwoKSB7XG5cdCAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuX2J1ZmZlcnMubGVuZ3RoOyBpKyspIHtcblx0ICAgICAgaWYgKHRoaXMuX2J1ZmZlcnNbaV0ubGVuZ3RoID09PSAwKSB7XG5cdCAgICAgICAgcmV0dXJuIGZhbHNlO1xuXHQgICAgICB9XG5cdCAgICB9XG5cdCAgICByZXR1cm4gdHJ1ZTtcblx0ICB9LFxuXG5cdCAgX2hhbmRsZUFueTogZnVuY3Rpb24gX2hhbmRsZUFueShpLCBldmVudCkge1xuXHQgICAgaWYgKGV2ZW50LnR5cGUgPT09IFZBTFVFKSB7XG5cdCAgICAgIHRoaXMuX2J1ZmZlcnNbaV0ucHVzaChldmVudC52YWx1ZSk7XG5cdCAgICAgIGlmICh0aGlzLl9pc0Z1bGwoKSkge1xuXHQgICAgICAgIHRoaXMuX2VtaXQoKTtcblx0ICAgICAgfVxuXHQgICAgfVxuXHQgICAgaWYgKGV2ZW50LnR5cGUgPT09IEVSUk9SKSB7XG5cdCAgICAgIHRoaXMuX2VtaXRFcnJvcihldmVudC52YWx1ZSk7XG5cdCAgICB9XG5cdCAgICBpZiAoZXZlbnQudHlwZSA9PT0gRU5EKSB7XG5cdCAgICAgIHRoaXMuX2FsaXZlQ291bnQtLTtcblx0ICAgICAgaWYgKHRoaXMuX2FsaXZlQ291bnQgPT09IDApIHtcblx0ICAgICAgICB0aGlzLl9lbWl0RW5kKCk7XG5cdCAgICAgIH1cblx0ICAgIH1cblx0ICB9LFxuXG5cdCAgX2NsZWFyOiBmdW5jdGlvbiBfY2xlYXIoKSB7XG5cdCAgICBTdHJlYW0ucHJvdG90eXBlLl9jbGVhci5jYWxsKHRoaXMpO1xuXHQgICAgdGhpcy5fc291cmNlcyA9IG51bGw7XG5cdCAgICB0aGlzLl9idWZmZXJzID0gbnVsbDtcblx0ICAgIHRoaXMuX2NvbWJpbmF0b3IgPSBudWxsO1xuXHQgICAgdGhpcy5fJGhhbmRsZXJzID0gbnVsbDtcblx0ICB9XG5cblx0fSk7XG5cblx0bW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiB6aXAob2JzZXJ2YWJsZXMsIGNvbWJpbmF0b3IgLyogRnVuY3Rpb24gfCBmYWxzZXkgKi8pIHtcblx0ICByZXR1cm4gb2JzZXJ2YWJsZXMubGVuZ3RoID09PSAwID8gbmV2ZXIoKSA6IG5ldyBaaXAob2JzZXJ2YWJsZXMsIGNvbWJpbmF0b3IpO1xuXHR9O1xuXG4vKioqLyB9LFxuLyogNjIgKi9cbi8qKiovIGZ1bmN0aW9uKG1vZHVsZSwgZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXykge1xuXG5cdCd1c2Ugc3RyaWN0JztcblxuXHR2YXIgX3JlcXVpcmUgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDIpO1xuXG5cdHZhciBpbmhlcml0ID0gX3JlcXVpcmUuaW5oZXJpdDtcblxuXHR2YXIgQWJzdHJhY3RQb29sID0gX193ZWJwYWNrX3JlcXVpcmVfXyg2Myk7XG5cdHZhciBuZXZlciA9IF9fd2VicGFja19yZXF1aXJlX18oOCk7XG5cblx0ZnVuY3Rpb24gTWVyZ2Uoc291cmNlcykge1xuXHQgIEFic3RyYWN0UG9vbC5jYWxsKHRoaXMpO1xuXHQgIHRoaXMuX2FkZEFsbChzb3VyY2VzKTtcblx0ICB0aGlzLl9pbml0aWFsaXNlZCA9IHRydWU7XG5cdH1cblxuXHRpbmhlcml0KE1lcmdlLCBBYnN0cmFjdFBvb2wsIHtcblxuXHQgIF9uYW1lOiAnbWVyZ2UnLFxuXG5cdCAgX29uRW1wdHk6IGZ1bmN0aW9uIF9vbkVtcHR5KCkge1xuXHQgICAgaWYgKHRoaXMuX2luaXRpYWxpc2VkKSB7XG5cdCAgICAgIHRoaXMuX2VtaXRFbmQoKTtcblx0ICAgIH1cblx0ICB9XG5cblx0fSk7XG5cblx0bW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBtZXJnZShvYnNlcnZhYmxlcykge1xuXHQgIHJldHVybiBvYnNlcnZhYmxlcy5sZW5ndGggPT09IDAgPyBuZXZlcigpIDogbmV3IE1lcmdlKG9ic2VydmFibGVzKTtcblx0fTtcblxuLyoqKi8gfSxcbi8qIDYzICovXG4vKioqLyBmdW5jdGlvbihtb2R1bGUsIGV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pIHtcblxuXHQndXNlIHN0cmljdCc7XG5cblx0dmFyIFN0cmVhbSA9IF9fd2VicGFja19yZXF1aXJlX18oNik7XG5cblx0dmFyIF9yZXF1aXJlID0gX193ZWJwYWNrX3JlcXVpcmVfXygzKTtcblxuXHR2YXIgVkFMVUUgPSBfcmVxdWlyZS5WQUxVRTtcblx0dmFyIEVSUk9SID0gX3JlcXVpcmUuRVJST1I7XG5cblx0dmFyIF9yZXF1aXJlMiA9IF9fd2VicGFja19yZXF1aXJlX18oMik7XG5cblx0dmFyIGluaGVyaXQgPSBfcmVxdWlyZTIuaW5oZXJpdDtcblxuXHR2YXIgX3JlcXVpcmUzID0gX193ZWJwYWNrX3JlcXVpcmVfXyg1KTtcblxuXHR2YXIgY29uY2F0ID0gX3JlcXVpcmUzLmNvbmNhdDtcblx0dmFyIGZvckVhY2ggPSBfcmVxdWlyZTMuZm9yRWFjaDtcblx0dmFyIGZpbmRCeVByZWQgPSBfcmVxdWlyZTMuZmluZEJ5UHJlZDtcblx0dmFyIGZpbmQgPSBfcmVxdWlyZTMuZmluZDtcblx0dmFyIHJlbW92ZSA9IF9yZXF1aXJlMy5yZW1vdmU7XG5cdHZhciBjbG9uZUFycmF5ID0gX3JlcXVpcmUzLmNsb25lQXJyYXk7XG5cblx0dmFyIGlkID0gZnVuY3Rpb24gaWQoeCkge1xuXHQgIHJldHVybiB4O1xuXHR9O1xuXG5cdGZ1bmN0aW9uIEFic3RyYWN0UG9vbCgpIHtcblx0ICB2YXIgX3RoaXMgPSB0aGlzO1xuXG5cdCAgdmFyIF9yZWYgPSBhcmd1bWVudHMubGVuZ3RoIDw9IDAgfHwgYXJndW1lbnRzWzBdID09PSB1bmRlZmluZWQgPyB7fSA6IGFyZ3VtZW50c1swXTtcblxuXHQgIHZhciBfcmVmJHF1ZXVlTGltID0gX3JlZi5xdWV1ZUxpbTtcblx0ICB2YXIgcXVldWVMaW0gPSBfcmVmJHF1ZXVlTGltID09PSB1bmRlZmluZWQgPyAwIDogX3JlZiRxdWV1ZUxpbTtcblx0ICB2YXIgX3JlZiRjb25jdXJMaW0gPSBfcmVmLmNvbmN1ckxpbTtcblx0ICB2YXIgY29uY3VyTGltID0gX3JlZiRjb25jdXJMaW0gPT09IHVuZGVmaW5lZCA/IC0xIDogX3JlZiRjb25jdXJMaW07XG5cdCAgdmFyIF9yZWYkZHJvcCA9IF9yZWYuZHJvcDtcblx0ICB2YXIgZHJvcCA9IF9yZWYkZHJvcCA9PT0gdW5kZWZpbmVkID8gJ25ldycgOiBfcmVmJGRyb3A7XG5cblx0ICBTdHJlYW0uY2FsbCh0aGlzKTtcblxuXHQgIHRoaXMuX3F1ZXVlTGltID0gcXVldWVMaW0gPCAwID8gLTEgOiBxdWV1ZUxpbTtcblx0ICB0aGlzLl9jb25jdXJMaW0gPSBjb25jdXJMaW0gPCAwID8gLTEgOiBjb25jdXJMaW07XG5cdCAgdGhpcy5fZHJvcCA9IGRyb3A7XG5cdCAgdGhpcy5fcXVldWUgPSBbXTtcblx0ICB0aGlzLl9jdXJTb3VyY2VzID0gW107XG5cdCAgdGhpcy5fJGhhbmRsZVN1YkFueSA9IGZ1bmN0aW9uIChldmVudCkge1xuXHQgICAgcmV0dXJuIF90aGlzLl9oYW5kbGVTdWJBbnkoZXZlbnQpO1xuXHQgIH07XG5cdCAgdGhpcy5fJGVuZEhhbmRsZXJzID0gW107XG5cdCAgdGhpcy5fY3VycmVudGx5QWRkaW5nID0gbnVsbDtcblxuXHQgIGlmICh0aGlzLl9jb25jdXJMaW0gPT09IDApIHtcblx0ICAgIHRoaXMuX2VtaXRFbmQoKTtcblx0ICB9XG5cdH1cblxuXHRpbmhlcml0KEFic3RyYWN0UG9vbCwgU3RyZWFtLCB7XG5cblx0ICBfbmFtZTogJ2Fic3RyYWN0UG9vbCcsXG5cblx0ICBfYWRkOiBmdW5jdGlvbiBfYWRkKG9iaiwgdG9PYnMgLyogRnVuY3Rpb24gfCBmYWxzZXkgKi8pIHtcblx0ICAgIHRvT2JzID0gdG9PYnMgfHwgaWQ7XG5cdCAgICBpZiAodGhpcy5fY29uY3VyTGltID09PSAtMSB8fCB0aGlzLl9jdXJTb3VyY2VzLmxlbmd0aCA8IHRoaXMuX2NvbmN1ckxpbSkge1xuXHQgICAgICB0aGlzLl9hZGRUb0N1cih0b09icyhvYmopKTtcblx0ICAgIH0gZWxzZSB7XG5cdCAgICAgIGlmICh0aGlzLl9xdWV1ZUxpbSA9PT0gLTEgfHwgdGhpcy5fcXVldWUubGVuZ3RoIDwgdGhpcy5fcXVldWVMaW0pIHtcblx0ICAgICAgICB0aGlzLl9hZGRUb1F1ZXVlKHRvT2JzKG9iaikpO1xuXHQgICAgICB9IGVsc2UgaWYgKHRoaXMuX2Ryb3AgPT09ICdvbGQnKSB7XG5cdCAgICAgICAgdGhpcy5fcmVtb3ZlT2xkZXN0KCk7XG5cdCAgICAgICAgdGhpcy5fYWRkKG9iaiwgdG9PYnMpO1xuXHQgICAgICB9XG5cdCAgICB9XG5cdCAgfSxcblxuXHQgIF9hZGRBbGw6IGZ1bmN0aW9uIF9hZGRBbGwob2Jzcykge1xuXHQgICAgdmFyIF90aGlzMiA9IHRoaXM7XG5cblx0ICAgIGZvckVhY2gob2JzcywgZnVuY3Rpb24gKG9icykge1xuXHQgICAgICByZXR1cm4gX3RoaXMyLl9hZGQob2JzKTtcblx0ICAgIH0pO1xuXHQgIH0sXG5cblx0ICBfcmVtb3ZlOiBmdW5jdGlvbiBfcmVtb3ZlKG9icykge1xuXHQgICAgaWYgKHRoaXMuX3JlbW92ZUN1cihvYnMpID09PSAtMSkge1xuXHQgICAgICB0aGlzLl9yZW1vdmVRdWV1ZShvYnMpO1xuXHQgICAgfVxuXHQgIH0sXG5cblx0ICBfYWRkVG9RdWV1ZTogZnVuY3Rpb24gX2FkZFRvUXVldWUob2JzKSB7XG5cdCAgICB0aGlzLl9xdWV1ZSA9IGNvbmNhdCh0aGlzLl9xdWV1ZSwgW29ic10pO1xuXHQgIH0sXG5cblx0ICBfYWRkVG9DdXI6IGZ1bmN0aW9uIF9hZGRUb0N1cihvYnMpIHtcblx0ICAgIGlmICh0aGlzLl9hY3RpdmUpIHtcblxuXHQgICAgICAvLyBIQUNLOlxuXHQgICAgICAvL1xuXHQgICAgICAvLyBXZSBoYXZlIHR3byBvcHRpbWl6YXRpb25zIGZvciBjYXNlcyB3aGVuIGBvYnNgIGlzIGVuZGVkLiBXZSBkb24ndCB3YW50XG5cdCAgICAgIC8vIHRvIGFkZCBzdWNoIG9ic2VydmFibGUgdG8gdGhlIGxpc3QsIGJ1dCBvbmx5IHdhbnQgdG8gZW1pdCBldmVudHNcblx0ICAgICAgLy8gZnJvbSBpdCAoaWYgaXQgaGFzIHNvbWUpLlxuXHQgICAgICAvL1xuXHQgICAgICAvLyBJbnN0ZWFkIG9mIHRoaXMgaGFja3MsIHdlIGNvdWxkIGp1c3QgZGlkIGZvbGxvd2luZyxcblx0ICAgICAgLy8gYnV0IGl0IHdvdWxkIGJlIDUtOCB0aW1lcyBzbG93ZXI6XG5cdCAgICAgIC8vXG5cdCAgICAgIC8vICAgICB0aGlzLl9jdXJTb3VyY2VzID0gY29uY2F0KHRoaXMuX2N1clNvdXJjZXMsIFtvYnNdKTtcblx0ICAgICAgLy8gICAgIHRoaXMuX3N1YnNjcmliZShvYnMpO1xuXHQgICAgICAvL1xuXG5cdCAgICAgIC8vICMxXG5cdCAgICAgIC8vIFRoaXMgb25lIGZvciBjYXNlcyB3aGVuIGBvYnNgIGFscmVhZHkgZW5kZWRcblx0ICAgICAgLy8gZS5nLiwgS2VmaXIuY29uc3RhbnQoKSBvciBLZWZpci5uZXZlcigpXG5cdCAgICAgIGlmICghb2JzLl9hbGl2ZSkge1xuXHQgICAgICAgIGlmIChvYnMuX2N1cnJlbnRFdmVudCkge1xuXHQgICAgICAgICAgdGhpcy5fZW1pdChvYnMuX2N1cnJlbnRFdmVudC50eXBlLCBvYnMuX2N1cnJlbnRFdmVudC52YWx1ZSk7XG5cdCAgICAgICAgfVxuXHQgICAgICAgIHJldHVybjtcblx0ICAgICAgfVxuXG5cdCAgICAgIC8vICMyXG5cdCAgICAgIC8vIFRoaXMgb25lIGlzIGZvciBjYXNlcyB3aGVuIGBvYnNgIGdvaW5nIHRvIGVuZCBzeW5jaHJvbm91c2x5IG9uXG5cdCAgICAgIC8vIGZpcnN0IHN1YnNjcmliZXIgZS5nLiwgS2VmaXIuc3RyZWFtKGVtID0+IHtlbS5lbWl0KDEpOyBlbS5lbmQoKX0pXG5cdCAgICAgIHRoaXMuX2N1cnJlbnRseUFkZGluZyA9IG9icztcblx0ICAgICAgb2JzLm9uQW55KHRoaXMuXyRoYW5kbGVTdWJBbnkpO1xuXHQgICAgICB0aGlzLl9jdXJyZW50bHlBZGRpbmcgPSBudWxsO1xuXHQgICAgICBpZiAob2JzLl9hbGl2ZSkge1xuXHQgICAgICAgIHRoaXMuX2N1clNvdXJjZXMgPSBjb25jYXQodGhpcy5fY3VyU291cmNlcywgW29ic10pO1xuXHQgICAgICAgIGlmICh0aGlzLl9hY3RpdmUpIHtcblx0ICAgICAgICAgIHRoaXMuX3N1YlRvRW5kKG9icyk7XG5cdCAgICAgICAgfVxuXHQgICAgICB9XG5cdCAgICB9IGVsc2Uge1xuXHQgICAgICB0aGlzLl9jdXJTb3VyY2VzID0gY29uY2F0KHRoaXMuX2N1clNvdXJjZXMsIFtvYnNdKTtcblx0ICAgIH1cblx0ICB9LFxuXG5cdCAgX3N1YlRvRW5kOiBmdW5jdGlvbiBfc3ViVG9FbmQob2JzKSB7XG5cdCAgICB2YXIgX3RoaXMzID0gdGhpcztcblxuXHQgICAgdmFyIG9uRW5kID0gZnVuY3Rpb24gb25FbmQoKSB7XG5cdCAgICAgIHJldHVybiBfdGhpczMuX3JlbW92ZUN1cihvYnMpO1xuXHQgICAgfTtcblx0ICAgIHRoaXMuXyRlbmRIYW5kbGVycy5wdXNoKHsgb2JzOiBvYnMsIGhhbmRsZXI6IG9uRW5kIH0pO1xuXHQgICAgb2JzLm9uRW5kKG9uRW5kKTtcblx0ICB9LFxuXG5cdCAgX3N1YnNjcmliZTogZnVuY3Rpb24gX3N1YnNjcmliZShvYnMpIHtcblx0ICAgIG9icy5vbkFueSh0aGlzLl8kaGFuZGxlU3ViQW55KTtcblxuXHQgICAgLy8gaXQgY2FuIGJlY29tZSBpbmFjdGl2ZSBpbiByZXNwb25jZSBvZiBzdWJzY3JpYmluZyB0byBgb2JzLm9uQW55YCBhYm92ZVxuXHQgICAgaWYgKHRoaXMuX2FjdGl2ZSkge1xuXHQgICAgICB0aGlzLl9zdWJUb0VuZChvYnMpO1xuXHQgICAgfVxuXHQgIH0sXG5cblx0ICBfdW5zdWJzY3JpYmU6IGZ1bmN0aW9uIF91bnN1YnNjcmliZShvYnMpIHtcblx0ICAgIG9icy5vZmZBbnkodGhpcy5fJGhhbmRsZVN1YkFueSk7XG5cblx0ICAgIHZhciBvbkVuZEkgPSBmaW5kQnlQcmVkKHRoaXMuXyRlbmRIYW5kbGVycywgZnVuY3Rpb24gKG9iaikge1xuXHQgICAgICByZXR1cm4gb2JqLm9icyA9PT0gb2JzO1xuXHQgICAgfSk7XG5cdCAgICBpZiAob25FbmRJICE9PSAtMSkge1xuXHQgICAgICBvYnMub2ZmRW5kKHRoaXMuXyRlbmRIYW5kbGVyc1tvbkVuZEldLmhhbmRsZXIpO1xuXHQgICAgICB0aGlzLl8kZW5kSGFuZGxlcnMuc3BsaWNlKG9uRW5kSSwgMSk7XG5cdCAgICB9XG5cdCAgfSxcblxuXHQgIF9oYW5kbGVTdWJBbnk6IGZ1bmN0aW9uIF9oYW5kbGVTdWJBbnkoZXZlbnQpIHtcblx0ICAgIGlmIChldmVudC50eXBlID09PSBWQUxVRSkge1xuXHQgICAgICB0aGlzLl9lbWl0VmFsdWUoZXZlbnQudmFsdWUpO1xuXHQgICAgfSBlbHNlIGlmIChldmVudC50eXBlID09PSBFUlJPUikge1xuXHQgICAgICB0aGlzLl9lbWl0RXJyb3IoZXZlbnQudmFsdWUpO1xuXHQgICAgfVxuXHQgIH0sXG5cblx0ICBfcmVtb3ZlUXVldWU6IGZ1bmN0aW9uIF9yZW1vdmVRdWV1ZShvYnMpIHtcblx0ICAgIHZhciBpbmRleCA9IGZpbmQodGhpcy5fcXVldWUsIG9icyk7XG5cdCAgICB0aGlzLl9xdWV1ZSA9IHJlbW92ZSh0aGlzLl9xdWV1ZSwgaW5kZXgpO1xuXHQgICAgcmV0dXJuIGluZGV4O1xuXHQgIH0sXG5cblx0ICBfcmVtb3ZlQ3VyOiBmdW5jdGlvbiBfcmVtb3ZlQ3VyKG9icykge1xuXHQgICAgaWYgKHRoaXMuX2FjdGl2ZSkge1xuXHQgICAgICB0aGlzLl91bnN1YnNjcmliZShvYnMpO1xuXHQgICAgfVxuXHQgICAgdmFyIGluZGV4ID0gZmluZCh0aGlzLl9jdXJTb3VyY2VzLCBvYnMpO1xuXHQgICAgdGhpcy5fY3VyU291cmNlcyA9IHJlbW92ZSh0aGlzLl9jdXJTb3VyY2VzLCBpbmRleCk7XG5cdCAgICBpZiAoaW5kZXggIT09IC0xKSB7XG5cdCAgICAgIGlmICh0aGlzLl9xdWV1ZS5sZW5ndGggIT09IDApIHtcblx0ICAgICAgICB0aGlzLl9wdWxsUXVldWUoKTtcblx0ICAgICAgfSBlbHNlIGlmICh0aGlzLl9jdXJTb3VyY2VzLmxlbmd0aCA9PT0gMCkge1xuXHQgICAgICAgIHRoaXMuX29uRW1wdHkoKTtcblx0ICAgICAgfVxuXHQgICAgfVxuXHQgICAgcmV0dXJuIGluZGV4O1xuXHQgIH0sXG5cblx0ICBfcmVtb3ZlT2xkZXN0OiBmdW5jdGlvbiBfcmVtb3ZlT2xkZXN0KCkge1xuXHQgICAgdGhpcy5fcmVtb3ZlQ3VyKHRoaXMuX2N1clNvdXJjZXNbMF0pO1xuXHQgIH0sXG5cblx0ICBfcHVsbFF1ZXVlOiBmdW5jdGlvbiBfcHVsbFF1ZXVlKCkge1xuXHQgICAgaWYgKHRoaXMuX3F1ZXVlLmxlbmd0aCAhPT0gMCkge1xuXHQgICAgICB0aGlzLl9xdWV1ZSA9IGNsb25lQXJyYXkodGhpcy5fcXVldWUpO1xuXHQgICAgICB0aGlzLl9hZGRUb0N1cih0aGlzLl9xdWV1ZS5zaGlmdCgpKTtcblx0ICAgIH1cblx0ICB9LFxuXG5cdCAgX29uQWN0aXZhdGlvbjogZnVuY3Rpb24gX29uQWN0aXZhdGlvbigpIHtcblx0ICAgIGZvciAodmFyIGkgPSAwLCBzb3VyY2VzID0gdGhpcy5fY3VyU291cmNlczsgaSA8IHNvdXJjZXMubGVuZ3RoICYmIHRoaXMuX2FjdGl2ZTsgaSsrKSB7XG5cdCAgICAgIHRoaXMuX3N1YnNjcmliZShzb3VyY2VzW2ldKTtcblx0ICAgIH1cblx0ICB9LFxuXG5cdCAgX29uRGVhY3RpdmF0aW9uOiBmdW5jdGlvbiBfb25EZWFjdGl2YXRpb24oKSB7XG5cdCAgICBmb3IgKHZhciBpID0gMCwgc291cmNlcyA9IHRoaXMuX2N1clNvdXJjZXM7IGkgPCBzb3VyY2VzLmxlbmd0aDsgaSsrKSB7XG5cdCAgICAgIHRoaXMuX3Vuc3Vic2NyaWJlKHNvdXJjZXNbaV0pO1xuXHQgICAgfVxuXHQgICAgaWYgKHRoaXMuX2N1cnJlbnRseUFkZGluZyAhPT0gbnVsbCkge1xuXHQgICAgICB0aGlzLl91bnN1YnNjcmliZSh0aGlzLl9jdXJyZW50bHlBZGRpbmcpO1xuXHQgICAgfVxuXHQgIH0sXG5cblx0ICBfaXNFbXB0eTogZnVuY3Rpb24gX2lzRW1wdHkoKSB7XG5cdCAgICByZXR1cm4gdGhpcy5fY3VyU291cmNlcy5sZW5ndGggPT09IDA7XG5cdCAgfSxcblxuXHQgIF9vbkVtcHR5OiBmdW5jdGlvbiBfb25FbXB0eSgpIHt9LFxuXG5cdCAgX2NsZWFyOiBmdW5jdGlvbiBfY2xlYXIoKSB7XG5cdCAgICBTdHJlYW0ucHJvdG90eXBlLl9jbGVhci5jYWxsKHRoaXMpO1xuXHQgICAgdGhpcy5fcXVldWUgPSBudWxsO1xuXHQgICAgdGhpcy5fY3VyU291cmNlcyA9IG51bGw7XG5cdCAgICB0aGlzLl8kaGFuZGxlU3ViQW55ID0gbnVsbDtcblx0ICAgIHRoaXMuXyRlbmRIYW5kbGVycyA9IG51bGw7XG5cdCAgfVxuXG5cdH0pO1xuXG5cdG1vZHVsZS5leHBvcnRzID0gQWJzdHJhY3RQb29sO1xuXG4vKioqLyB9LFxuLyogNjQgKi9cbi8qKiovIGZ1bmN0aW9uKG1vZHVsZSwgZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXykge1xuXG5cdCd1c2Ugc3RyaWN0JztcblxuXHR2YXIgcmVwZWF0ID0gX193ZWJwYWNrX3JlcXVpcmVfXyg2NSk7XG5cblx0bW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBjb25jYXQob2JzZXJ2YWJsZXMpIHtcblx0ICByZXR1cm4gcmVwZWF0KGZ1bmN0aW9uIChpbmRleCkge1xuXHQgICAgcmV0dXJuIG9ic2VydmFibGVzLmxlbmd0aCA+IGluZGV4ID8gb2JzZXJ2YWJsZXNbaW5kZXhdIDogZmFsc2U7XG5cdCAgfSkuc2V0TmFtZSgnY29uY2F0Jyk7XG5cdH07XG5cbi8qKiovIH0sXG4vKiA2NSAqL1xuLyoqKi8gZnVuY3Rpb24obW9kdWxlLCBleHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKSB7XG5cblx0J3VzZSBzdHJpY3QnO1xuXG5cdHZhciBfcmVxdWlyZSA9IF9fd2VicGFja19yZXF1aXJlX18oMik7XG5cblx0dmFyIGluaGVyaXQgPSBfcmVxdWlyZS5pbmhlcml0O1xuXG5cdHZhciBTdHJlYW0gPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDYpO1xuXG5cdHZhciBfcmVxdWlyZTIgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDMpO1xuXG5cdHZhciBFTkQgPSBfcmVxdWlyZTIuRU5EO1xuXG5cdGZ1bmN0aW9uIFMoZ2VuZXJhdG9yKSB7XG5cdCAgdmFyIF90aGlzID0gdGhpcztcblxuXHQgIFN0cmVhbS5jYWxsKHRoaXMpO1xuXHQgIHRoaXMuX2dlbmVyYXRvciA9IGdlbmVyYXRvcjtcblx0ICB0aGlzLl9zb3VyY2UgPSBudWxsO1xuXHQgIHRoaXMuX2luTG9vcCA9IGZhbHNlO1xuXHQgIHRoaXMuX2l0ZXJhdGlvbiA9IDA7XG5cdCAgdGhpcy5fJGhhbmRsZUFueSA9IGZ1bmN0aW9uIChldmVudCkge1xuXHQgICAgcmV0dXJuIF90aGlzLl9oYW5kbGVBbnkoZXZlbnQpO1xuXHQgIH07XG5cdH1cblxuXHRpbmhlcml0KFMsIFN0cmVhbSwge1xuXG5cdCAgX25hbWU6ICdyZXBlYXQnLFxuXG5cdCAgX2hhbmRsZUFueTogZnVuY3Rpb24gX2hhbmRsZUFueShldmVudCkge1xuXHQgICAgaWYgKGV2ZW50LnR5cGUgPT09IEVORCkge1xuXHQgICAgICB0aGlzLl9zb3VyY2UgPSBudWxsO1xuXHQgICAgICB0aGlzLl9nZXRTb3VyY2UoKTtcblx0ICAgIH0gZWxzZSB7XG5cdCAgICAgIHRoaXMuX2VtaXQoZXZlbnQudHlwZSwgZXZlbnQudmFsdWUpO1xuXHQgICAgfVxuXHQgIH0sXG5cblx0ICBfZ2V0U291cmNlOiBmdW5jdGlvbiBfZ2V0U291cmNlKCkge1xuXHQgICAgaWYgKCF0aGlzLl9pbkxvb3ApIHtcblx0ICAgICAgdGhpcy5faW5Mb29wID0gdHJ1ZTtcblx0ICAgICAgdmFyIGdlbmVyYXRvciA9IHRoaXMuX2dlbmVyYXRvcjtcblx0ICAgICAgd2hpbGUgKHRoaXMuX3NvdXJjZSA9PT0gbnVsbCAmJiB0aGlzLl9hbGl2ZSAmJiB0aGlzLl9hY3RpdmUpIHtcblx0ICAgICAgICB0aGlzLl9zb3VyY2UgPSBnZW5lcmF0b3IodGhpcy5faXRlcmF0aW9uKyspO1xuXHQgICAgICAgIGlmICh0aGlzLl9zb3VyY2UpIHtcblx0ICAgICAgICAgIHRoaXMuX3NvdXJjZS5vbkFueSh0aGlzLl8kaGFuZGxlQW55KTtcblx0ICAgICAgICB9IGVsc2Uge1xuXHQgICAgICAgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgICAgICAgIH1cblx0ICAgICAgfVxuXHQgICAgICB0aGlzLl9pbkxvb3AgPSBmYWxzZTtcblx0ICAgIH1cblx0ICB9LFxuXG5cdCAgX29uQWN0aXZhdGlvbjogZnVuY3Rpb24gX29uQWN0aXZhdGlvbigpIHtcblx0ICAgIGlmICh0aGlzLl9zb3VyY2UpIHtcblx0ICAgICAgdGhpcy5fc291cmNlLm9uQW55KHRoaXMuXyRoYW5kbGVBbnkpO1xuXHQgICAgfSBlbHNlIHtcblx0ICAgICAgdGhpcy5fZ2V0U291cmNlKCk7XG5cdCAgICB9XG5cdCAgfSxcblxuXHQgIF9vbkRlYWN0aXZhdGlvbjogZnVuY3Rpb24gX29uRGVhY3RpdmF0aW9uKCkge1xuXHQgICAgaWYgKHRoaXMuX3NvdXJjZSkge1xuXHQgICAgICB0aGlzLl9zb3VyY2Uub2ZmQW55KHRoaXMuXyRoYW5kbGVBbnkpO1xuXHQgICAgfVxuXHQgIH0sXG5cblx0ICBfY2xlYXI6IGZ1bmN0aW9uIF9jbGVhcigpIHtcblx0ICAgIFN0cmVhbS5wcm90b3R5cGUuX2NsZWFyLmNhbGwodGhpcyk7XG5cdCAgICB0aGlzLl9nZW5lcmF0b3IgPSBudWxsO1xuXHQgICAgdGhpcy5fc291cmNlID0gbnVsbDtcblx0ICAgIHRoaXMuXyRoYW5kbGVBbnkgPSBudWxsO1xuXHQgIH1cblxuXHR9KTtcblxuXHRtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChnZW5lcmF0b3IpIHtcblx0ICByZXR1cm4gbmV3IFMoZ2VuZXJhdG9yKTtcblx0fTtcblxuLyoqKi8gfSxcbi8qIDY2ICovXG4vKioqLyBmdW5jdGlvbihtb2R1bGUsIGV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pIHtcblxuXHQndXNlIHN0cmljdCc7XG5cblx0dmFyIF9yZXF1aXJlID0gX193ZWJwYWNrX3JlcXVpcmVfXygyKTtcblxuXHR2YXIgaW5oZXJpdCA9IF9yZXF1aXJlLmluaGVyaXQ7XG5cblx0dmFyIEFic3RyYWN0UG9vbCA9IF9fd2VicGFja19yZXF1aXJlX18oNjMpO1xuXG5cdGZ1bmN0aW9uIFBvb2woKSB7XG5cdCAgQWJzdHJhY3RQb29sLmNhbGwodGhpcyk7XG5cdH1cblxuXHRpbmhlcml0KFBvb2wsIEFic3RyYWN0UG9vbCwge1xuXG5cdCAgX25hbWU6ICdwb29sJyxcblxuXHQgIHBsdWc6IGZ1bmN0aW9uIHBsdWcob2JzKSB7XG5cdCAgICB0aGlzLl9hZGQob2JzKTtcblx0ICAgIHJldHVybiB0aGlzO1xuXHQgIH0sXG5cblx0ICB1bnBsdWc6IGZ1bmN0aW9uIHVucGx1ZyhvYnMpIHtcblx0ICAgIHRoaXMuX3JlbW92ZShvYnMpO1xuXHQgICAgcmV0dXJuIHRoaXM7XG5cdCAgfVxuXG5cdH0pO1xuXG5cdG1vZHVsZS5leHBvcnRzID0gUG9vbDtcblxuLyoqKi8gfSxcbi8qIDY3ICovXG4vKioqLyBmdW5jdGlvbihtb2R1bGUsIGV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pIHtcblxuXHQndXNlIHN0cmljdCc7XG5cblx0dmFyIF9yZXF1aXJlID0gX193ZWJwYWNrX3JlcXVpcmVfXygzKTtcblxuXHR2YXIgVkFMVUUgPSBfcmVxdWlyZS5WQUxVRTtcblx0dmFyIEVSUk9SID0gX3JlcXVpcmUuRVJST1I7XG5cdHZhciBFTkQgPSBfcmVxdWlyZS5FTkQ7XG5cblx0dmFyIF9yZXF1aXJlMiA9IF9fd2VicGFja19yZXF1aXJlX18oMik7XG5cblx0dmFyIGluaGVyaXQgPSBfcmVxdWlyZTIuaW5oZXJpdDtcblxuXHR2YXIgQWJzdHJhY3RQb29sID0gX193ZWJwYWNrX3JlcXVpcmVfXyg2Myk7XG5cblx0ZnVuY3Rpb24gRmxhdE1hcChzb3VyY2UsIGZuLCBvcHRpb25zKSB7XG5cdCAgdmFyIF90aGlzID0gdGhpcztcblxuXHQgIEFic3RyYWN0UG9vbC5jYWxsKHRoaXMsIG9wdGlvbnMpO1xuXHQgIHRoaXMuX3NvdXJjZSA9IHNvdXJjZTtcblx0ICB0aGlzLl9mbiA9IGZuO1xuXHQgIHRoaXMuX21haW5FbmRlZCA9IGZhbHNlO1xuXHQgIHRoaXMuX2xhc3RDdXJyZW50ID0gbnVsbDtcblx0ICB0aGlzLl8kaGFuZGxlTWFpbiA9IGZ1bmN0aW9uIChldmVudCkge1xuXHQgICAgcmV0dXJuIF90aGlzLl9oYW5kbGVNYWluKGV2ZW50KTtcblx0ICB9O1xuXHR9XG5cblx0aW5oZXJpdChGbGF0TWFwLCBBYnN0cmFjdFBvb2wsIHtcblxuXHQgIF9vbkFjdGl2YXRpb246IGZ1bmN0aW9uIF9vbkFjdGl2YXRpb24oKSB7XG5cdCAgICBBYnN0cmFjdFBvb2wucHJvdG90eXBlLl9vbkFjdGl2YXRpb24uY2FsbCh0aGlzKTtcblx0ICAgIGlmICh0aGlzLl9hY3RpdmUpIHtcblx0ICAgICAgdGhpcy5fc291cmNlLm9uQW55KHRoaXMuXyRoYW5kbGVNYWluKTtcblx0ICAgIH1cblx0ICB9LFxuXG5cdCAgX29uRGVhY3RpdmF0aW9uOiBmdW5jdGlvbiBfb25EZWFjdGl2YXRpb24oKSB7XG5cdCAgICBBYnN0cmFjdFBvb2wucHJvdG90eXBlLl9vbkRlYWN0aXZhdGlvbi5jYWxsKHRoaXMpO1xuXHQgICAgdGhpcy5fc291cmNlLm9mZkFueSh0aGlzLl8kaGFuZGxlTWFpbik7XG5cdCAgICB0aGlzLl9oYWROb0V2U2luY2VEZWFjdCA9IHRydWU7XG5cdCAgfSxcblxuXHQgIF9oYW5kbGVNYWluOiBmdW5jdGlvbiBfaGFuZGxlTWFpbihldmVudCkge1xuXG5cdCAgICBpZiAoZXZlbnQudHlwZSA9PT0gVkFMVUUpIHtcblx0ICAgICAgLy8gSXMgbGF0ZXN0IHZhbHVlIGJlZm9yZSBkZWFjdGl2YXRpb24gc3Vydml2ZWQsIGFuZCBub3cgaXMgJ2N1cnJlbnQnIG9uIHRoaXMgYWN0aXZhdGlvbj9cblx0ICAgICAgLy8gV2UgZG9uJ3Qgd2FudCB0byBoYW5kbGUgc3VjaCB2YWx1ZXMsIHRvIHByZXZlbnQgdG8gY29uc3RhbnRseSBhZGRcblx0ICAgICAgLy8gc2FtZSBvYnNlcnZhbGUgb24gZWFjaCBhY3RpdmF0aW9uL2RlYWN0aXZhdGlvbiB3aGVuIG91ciBtYWluIHNvdXJjZVxuXHQgICAgICAvLyBpcyBhIGBLZWZpci5jb25hdGFudCgpYCBmb3IgZXhhbXBsZS5cblx0ICAgICAgdmFyIHNhbWVDdXJyID0gdGhpcy5fYWN0aXZhdGluZyAmJiB0aGlzLl9oYWROb0V2U2luY2VEZWFjdCAmJiB0aGlzLl9sYXN0Q3VycmVudCA9PT0gZXZlbnQudmFsdWU7XG5cdCAgICAgIGlmICghc2FtZUN1cnIpIHtcblx0ICAgICAgICB0aGlzLl9hZGQoZXZlbnQudmFsdWUsIHRoaXMuX2ZuKTtcblx0ICAgICAgfVxuXHQgICAgICB0aGlzLl9sYXN0Q3VycmVudCA9IGV2ZW50LnZhbHVlO1xuXHQgICAgICB0aGlzLl9oYWROb0V2U2luY2VEZWFjdCA9IGZhbHNlO1xuXHQgICAgfVxuXG5cdCAgICBpZiAoZXZlbnQudHlwZSA9PT0gRVJST1IpIHtcblx0ICAgICAgdGhpcy5fZW1pdEVycm9yKGV2ZW50LnZhbHVlKTtcblx0ICAgIH1cblxuXHQgICAgaWYgKGV2ZW50LnR5cGUgPT09IEVORCkge1xuXHQgICAgICBpZiAodGhpcy5faXNFbXB0eSgpKSB7XG5cdCAgICAgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgICAgICB9IGVsc2Uge1xuXHQgICAgICAgIHRoaXMuX21haW5FbmRlZCA9IHRydWU7XG5cdCAgICAgIH1cblx0ICAgIH1cblx0ICB9LFxuXG5cdCAgX29uRW1wdHk6IGZ1bmN0aW9uIF9vbkVtcHR5KCkge1xuXHQgICAgaWYgKHRoaXMuX21haW5FbmRlZCkge1xuXHQgICAgICB0aGlzLl9lbWl0RW5kKCk7XG5cdCAgICB9XG5cdCAgfSxcblxuXHQgIF9jbGVhcjogZnVuY3Rpb24gX2NsZWFyKCkge1xuXHQgICAgQWJzdHJhY3RQb29sLnByb3RvdHlwZS5fY2xlYXIuY2FsbCh0aGlzKTtcblx0ICAgIHRoaXMuX3NvdXJjZSA9IG51bGw7XG5cdCAgICB0aGlzLl9sYXN0Q3VycmVudCA9IG51bGw7XG5cdCAgICB0aGlzLl8kaGFuZGxlTWFpbiA9IG51bGw7XG5cdCAgfVxuXG5cdH0pO1xuXG5cdG1vZHVsZS5leHBvcnRzID0gRmxhdE1hcDtcblxuLyoqKi8gfSxcbi8qIDY4ICovXG4vKioqLyBmdW5jdGlvbihtb2R1bGUsIGV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pIHtcblxuXHQndXNlIHN0cmljdCc7XG5cblx0dmFyIF9yZXF1aXJlID0gX193ZWJwYWNrX3JlcXVpcmVfXygzKTtcblxuXHR2YXIgVkFMVUUgPSBfcmVxdWlyZS5WQUxVRTtcblx0dmFyIEVSUk9SID0gX3JlcXVpcmUuRVJST1I7XG5cdHZhciBFTkQgPSBfcmVxdWlyZS5FTkQ7XG5cblx0dmFyIF9yZXF1aXJlMiA9IF9fd2VicGFja19yZXF1aXJlX18oMik7XG5cblx0dmFyIGluaGVyaXQgPSBfcmVxdWlyZTIuaW5oZXJpdDtcblxuXHR2YXIgRmxhdE1hcCA9IF9fd2VicGFja19yZXF1aXJlX18oNjcpO1xuXG5cdGZ1bmN0aW9uIEZsYXRNYXBFcnJvcnMoc291cmNlLCBmbikge1xuXHQgIEZsYXRNYXAuY2FsbCh0aGlzLCBzb3VyY2UsIGZuKTtcblx0fVxuXG5cdGluaGVyaXQoRmxhdE1hcEVycm9ycywgRmxhdE1hcCwge1xuXG5cdCAgLy8gU2FtZSBhcyBpbiBGbGF0TWFwLCBvbmx5IFZBTFVFL0VSUk9SIGZsaXBwZWRcblx0ICBfaGFuZGxlTWFpbjogZnVuY3Rpb24gX2hhbmRsZU1haW4oZXZlbnQpIHtcblxuXHQgICAgaWYgKGV2ZW50LnR5cGUgPT09IEVSUk9SKSB7XG5cdCAgICAgIHZhciBzYW1lQ3VyciA9IHRoaXMuX2FjdGl2YXRpbmcgJiYgdGhpcy5faGFkTm9FdlNpbmNlRGVhY3QgJiYgdGhpcy5fbGFzdEN1cnJlbnQgPT09IGV2ZW50LnZhbHVlO1xuXHQgICAgICBpZiAoIXNhbWVDdXJyKSB7XG5cdCAgICAgICAgdGhpcy5fYWRkKGV2ZW50LnZhbHVlLCB0aGlzLl9mbik7XG5cdCAgICAgIH1cblx0ICAgICAgdGhpcy5fbGFzdEN1cnJlbnQgPSBldmVudC52YWx1ZTtcblx0ICAgICAgdGhpcy5faGFkTm9FdlNpbmNlRGVhY3QgPSBmYWxzZTtcblx0ICAgIH1cblxuXHQgICAgaWYgKGV2ZW50LnR5cGUgPT09IFZBTFVFKSB7XG5cdCAgICAgIHRoaXMuX2VtaXRWYWx1ZShldmVudC52YWx1ZSk7XG5cdCAgICB9XG5cblx0ICAgIGlmIChldmVudC50eXBlID09PSBFTkQpIHtcblx0ICAgICAgaWYgKHRoaXMuX2lzRW1wdHkoKSkge1xuXHQgICAgICAgIHRoaXMuX2VtaXRFbmQoKTtcblx0ICAgICAgfSBlbHNlIHtcblx0ICAgICAgICB0aGlzLl9tYWluRW5kZWQgPSB0cnVlO1xuXHQgICAgICB9XG5cdCAgICB9XG5cdCAgfVxuXG5cdH0pO1xuXG5cdG1vZHVsZS5leHBvcnRzID0gRmxhdE1hcEVycm9ycztcblxuLyoqKi8gfSxcbi8qIDY5ICovXG4vKioqLyBmdW5jdGlvbihtb2R1bGUsIGV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pIHtcblxuXHQndXNlIHN0cmljdCc7XG5cblx0dmFyIF9yZXF1aXJlID0gX193ZWJwYWNrX3JlcXVpcmVfXyg3MCk7XG5cblx0dmFyIGNyZWF0ZVN0cmVhbSA9IF9yZXF1aXJlLmNyZWF0ZVN0cmVhbTtcblx0dmFyIGNyZWF0ZVByb3BlcnR5ID0gX3JlcXVpcmUuY3JlYXRlUHJvcGVydHk7XG5cblx0dmFyIF9yZXF1aXJlMiA9IF9fd2VicGFja19yZXF1aXJlX18oMyk7XG5cblx0dmFyIE5PVEhJTkcgPSBfcmVxdWlyZTIuTk9USElORztcblxuXHR2YXIgbWl4aW4gPSB7XG5cblx0ICBfaGFuZGxlUHJpbWFyeVZhbHVlOiBmdW5jdGlvbiBfaGFuZGxlUHJpbWFyeVZhbHVlKHgpIHtcblx0ICAgIGlmICh0aGlzLl9sYXN0U2Vjb25kYXJ5ICE9PSBOT1RISU5HICYmIHRoaXMuX2xhc3RTZWNvbmRhcnkpIHtcblx0ICAgICAgdGhpcy5fZW1pdFZhbHVlKHgpO1xuXHQgICAgfVxuXHQgIH0sXG5cblx0ICBfaGFuZGxlU2Vjb25kYXJ5RW5kOiBmdW5jdGlvbiBfaGFuZGxlU2Vjb25kYXJ5RW5kKCkge1xuXHQgICAgaWYgKHRoaXMuX2xhc3RTZWNvbmRhcnkgPT09IE5PVEhJTkcgfHwgIXRoaXMuX2xhc3RTZWNvbmRhcnkpIHtcblx0ICAgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgICAgfVxuXHQgIH1cblxuXHR9O1xuXG5cdHZhciBTID0gY3JlYXRlU3RyZWFtKCdmaWx0ZXJCeScsIG1peGluKTtcblx0dmFyIFAgPSBjcmVhdGVQcm9wZXJ0eSgnZmlsdGVyQnknLCBtaXhpbik7XG5cblx0bW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBmaWx0ZXJCeShwcmltYXJ5LCBzZWNvbmRhcnkpIHtcblx0ICByZXR1cm4gbmV3IChwcmltYXJ5Ll9vZlNhbWVUeXBlKFMsIFApKShwcmltYXJ5LCBzZWNvbmRhcnkpO1xuXHR9O1xuXG4vKioqLyB9LFxuLyogNzAgKi9cbi8qKiovIGZ1bmN0aW9uKG1vZHVsZSwgZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXykge1xuXG5cdCd1c2Ugc3RyaWN0JztcblxuXHR2YXIgU3RyZWFtID0gX193ZWJwYWNrX3JlcXVpcmVfXyg2KTtcblx0dmFyIFByb3BlcnR5ID0gX193ZWJwYWNrX3JlcXVpcmVfXyg3KTtcblxuXHR2YXIgX3JlcXVpcmUgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDIpO1xuXG5cdHZhciBpbmhlcml0ID0gX3JlcXVpcmUuaW5oZXJpdDtcblxuXHR2YXIgX3JlcXVpcmUyID0gX193ZWJwYWNrX3JlcXVpcmVfXygzKTtcblxuXHR2YXIgVkFMVUUgPSBfcmVxdWlyZTIuVkFMVUU7XG5cdHZhciBFUlJPUiA9IF9yZXF1aXJlMi5FUlJPUjtcblx0dmFyIEVORCA9IF9yZXF1aXJlMi5FTkQ7XG5cdHZhciBOT1RISU5HID0gX3JlcXVpcmUyLk5PVEhJTkc7XG5cblx0ZnVuY3Rpb24gY3JlYXRlQ29uc3RydWN0b3IoQmFzZUNsYXNzLCBuYW1lKSB7XG5cdCAgcmV0dXJuIGZ1bmN0aW9uIEFub255bW91c09ic2VydmFibGUocHJpbWFyeSwgc2Vjb25kYXJ5LCBvcHRpb25zKSB7XG5cdCAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG5cdCAgICBCYXNlQ2xhc3MuY2FsbCh0aGlzKTtcblx0ICAgIHRoaXMuX3ByaW1hcnkgPSBwcmltYXJ5O1xuXHQgICAgdGhpcy5fc2Vjb25kYXJ5ID0gc2Vjb25kYXJ5O1xuXHQgICAgdGhpcy5fbmFtZSA9IHByaW1hcnkuX25hbWUgKyAnLicgKyBuYW1lO1xuXHQgICAgdGhpcy5fbGFzdFNlY29uZGFyeSA9IE5PVEhJTkc7XG5cdCAgICB0aGlzLl8kaGFuZGxlU2Vjb25kYXJ5QW55ID0gZnVuY3Rpb24gKGV2ZW50KSB7XG5cdCAgICAgIHJldHVybiBfdGhpcy5faGFuZGxlU2Vjb25kYXJ5QW55KGV2ZW50KTtcblx0ICAgIH07XG5cdCAgICB0aGlzLl8kaGFuZGxlUHJpbWFyeUFueSA9IGZ1bmN0aW9uIChldmVudCkge1xuXHQgICAgICByZXR1cm4gX3RoaXMuX2hhbmRsZVByaW1hcnlBbnkoZXZlbnQpO1xuXHQgICAgfTtcblx0ICAgIHRoaXMuX2luaXQob3B0aW9ucyk7XG5cdCAgfTtcblx0fVxuXG5cdGZ1bmN0aW9uIGNyZWF0ZUNsYXNzTWV0aG9kcyhCYXNlQ2xhc3MpIHtcblx0ICByZXR1cm4ge1xuXHQgICAgX2luaXQ6IGZ1bmN0aW9uIF9pbml0KCkge30sXG5cdCAgICBfZnJlZTogZnVuY3Rpb24gX2ZyZWUoKSB7fSxcblxuXHQgICAgX2hhbmRsZVByaW1hcnlWYWx1ZTogZnVuY3Rpb24gX2hhbmRsZVByaW1hcnlWYWx1ZSh4KSB7XG5cdCAgICAgIHRoaXMuX2VtaXRWYWx1ZSh4KTtcblx0ICAgIH0sXG5cdCAgICBfaGFuZGxlUHJpbWFyeUVycm9yOiBmdW5jdGlvbiBfaGFuZGxlUHJpbWFyeUVycm9yKHgpIHtcblx0ICAgICAgdGhpcy5fZW1pdEVycm9yKHgpO1xuXHQgICAgfSxcblx0ICAgIF9oYW5kbGVQcmltYXJ5RW5kOiBmdW5jdGlvbiBfaGFuZGxlUHJpbWFyeUVuZCgpIHtcblx0ICAgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgICAgfSxcblxuXHQgICAgX2hhbmRsZVNlY29uZGFyeVZhbHVlOiBmdW5jdGlvbiBfaGFuZGxlU2Vjb25kYXJ5VmFsdWUoeCkge1xuXHQgICAgICB0aGlzLl9sYXN0U2Vjb25kYXJ5ID0geDtcblx0ICAgIH0sXG5cdCAgICBfaGFuZGxlU2Vjb25kYXJ5RXJyb3I6IGZ1bmN0aW9uIF9oYW5kbGVTZWNvbmRhcnlFcnJvcih4KSB7XG5cdCAgICAgIHRoaXMuX2VtaXRFcnJvcih4KTtcblx0ICAgIH0sXG5cdCAgICBfaGFuZGxlU2Vjb25kYXJ5RW5kOiBmdW5jdGlvbiBfaGFuZGxlU2Vjb25kYXJ5RW5kKCkge30sXG5cblx0ICAgIF9oYW5kbGVQcmltYXJ5QW55OiBmdW5jdGlvbiBfaGFuZGxlUHJpbWFyeUFueShldmVudCkge1xuXHQgICAgICBzd2l0Y2ggKGV2ZW50LnR5cGUpIHtcblx0ICAgICAgICBjYXNlIFZBTFVFOlxuXHQgICAgICAgICAgcmV0dXJuIHRoaXMuX2hhbmRsZVByaW1hcnlWYWx1ZShldmVudC52YWx1ZSk7XG5cdCAgICAgICAgY2FzZSBFUlJPUjpcblx0ICAgICAgICAgIHJldHVybiB0aGlzLl9oYW5kbGVQcmltYXJ5RXJyb3IoZXZlbnQudmFsdWUpO1xuXHQgICAgICAgIGNhc2UgRU5EOlxuXHQgICAgICAgICAgcmV0dXJuIHRoaXMuX2hhbmRsZVByaW1hcnlFbmQoZXZlbnQudmFsdWUpO1xuXHQgICAgICB9XG5cdCAgICB9LFxuXHQgICAgX2hhbmRsZVNlY29uZGFyeUFueTogZnVuY3Rpb24gX2hhbmRsZVNlY29uZGFyeUFueShldmVudCkge1xuXHQgICAgICBzd2l0Y2ggKGV2ZW50LnR5cGUpIHtcblx0ICAgICAgICBjYXNlIFZBTFVFOlxuXHQgICAgICAgICAgcmV0dXJuIHRoaXMuX2hhbmRsZVNlY29uZGFyeVZhbHVlKGV2ZW50LnZhbHVlKTtcblx0ICAgICAgICBjYXNlIEVSUk9SOlxuXHQgICAgICAgICAgcmV0dXJuIHRoaXMuX2hhbmRsZVNlY29uZGFyeUVycm9yKGV2ZW50LnZhbHVlKTtcblx0ICAgICAgICBjYXNlIEVORDpcblx0ICAgICAgICAgIHRoaXMuX2hhbmRsZVNlY29uZGFyeUVuZChldmVudC52YWx1ZSk7XG5cdCAgICAgICAgICB0aGlzLl9yZW1vdmVTZWNvbmRhcnkoKTtcblx0ICAgICAgfVxuXHQgICAgfSxcblxuXHQgICAgX3JlbW92ZVNlY29uZGFyeTogZnVuY3Rpb24gX3JlbW92ZVNlY29uZGFyeSgpIHtcblx0ICAgICAgaWYgKHRoaXMuX3NlY29uZGFyeSAhPT0gbnVsbCkge1xuXHQgICAgICAgIHRoaXMuX3NlY29uZGFyeS5vZmZBbnkodGhpcy5fJGhhbmRsZVNlY29uZGFyeUFueSk7XG5cdCAgICAgICAgdGhpcy5fJGhhbmRsZVNlY29uZGFyeUFueSA9IG51bGw7XG5cdCAgICAgICAgdGhpcy5fc2Vjb25kYXJ5ID0gbnVsbDtcblx0ICAgICAgfVxuXHQgICAgfSxcblxuXHQgICAgX29uQWN0aXZhdGlvbjogZnVuY3Rpb24gX29uQWN0aXZhdGlvbigpIHtcblx0ICAgICAgaWYgKHRoaXMuX3NlY29uZGFyeSAhPT0gbnVsbCkge1xuXHQgICAgICAgIHRoaXMuX3NlY29uZGFyeS5vbkFueSh0aGlzLl8kaGFuZGxlU2Vjb25kYXJ5QW55KTtcblx0ICAgICAgfVxuXHQgICAgICBpZiAodGhpcy5fYWN0aXZlKSB7XG5cdCAgICAgICAgdGhpcy5fcHJpbWFyeS5vbkFueSh0aGlzLl8kaGFuZGxlUHJpbWFyeUFueSk7XG5cdCAgICAgIH1cblx0ICAgIH0sXG5cdCAgICBfb25EZWFjdGl2YXRpb246IGZ1bmN0aW9uIF9vbkRlYWN0aXZhdGlvbigpIHtcblx0ICAgICAgaWYgKHRoaXMuX3NlY29uZGFyeSAhPT0gbnVsbCkge1xuXHQgICAgICAgIHRoaXMuX3NlY29uZGFyeS5vZmZBbnkodGhpcy5fJGhhbmRsZVNlY29uZGFyeUFueSk7XG5cdCAgICAgIH1cblx0ICAgICAgdGhpcy5fcHJpbWFyeS5vZmZBbnkodGhpcy5fJGhhbmRsZVByaW1hcnlBbnkpO1xuXHQgICAgfSxcblxuXHQgICAgX2NsZWFyOiBmdW5jdGlvbiBfY2xlYXIoKSB7XG5cdCAgICAgIEJhc2VDbGFzcy5wcm90b3R5cGUuX2NsZWFyLmNhbGwodGhpcyk7XG5cdCAgICAgIHRoaXMuX3ByaW1hcnkgPSBudWxsO1xuXHQgICAgICB0aGlzLl9zZWNvbmRhcnkgPSBudWxsO1xuXHQgICAgICB0aGlzLl9sYXN0U2Vjb25kYXJ5ID0gbnVsbDtcblx0ICAgICAgdGhpcy5fJGhhbmRsZVNlY29uZGFyeUFueSA9IG51bGw7XG5cdCAgICAgIHRoaXMuXyRoYW5kbGVQcmltYXJ5QW55ID0gbnVsbDtcblx0ICAgICAgdGhpcy5fZnJlZSgpO1xuXHQgICAgfVxuXG5cdCAgfTtcblx0fVxuXG5cdGZ1bmN0aW9uIGNyZWF0ZVN0cmVhbShuYW1lLCBtaXhpbikge1xuXHQgIHZhciBTID0gY3JlYXRlQ29uc3RydWN0b3IoU3RyZWFtLCBuYW1lKTtcblx0ICBpbmhlcml0KFMsIFN0cmVhbSwgY3JlYXRlQ2xhc3NNZXRob2RzKFN0cmVhbSksIG1peGluKTtcblx0ICByZXR1cm4gUztcblx0fVxuXG5cdGZ1bmN0aW9uIGNyZWF0ZVByb3BlcnR5KG5hbWUsIG1peGluKSB7XG5cdCAgdmFyIFAgPSBjcmVhdGVDb25zdHJ1Y3RvcihQcm9wZXJ0eSwgbmFtZSk7XG5cdCAgaW5oZXJpdChQLCBQcm9wZXJ0eSwgY3JlYXRlQ2xhc3NNZXRob2RzKFByb3BlcnR5KSwgbWl4aW4pO1xuXHQgIHJldHVybiBQO1xuXHR9XG5cblx0bW9kdWxlLmV4cG9ydHMgPSB7IGNyZWF0ZVN0cmVhbTogY3JlYXRlU3RyZWFtLCBjcmVhdGVQcm9wZXJ0eTogY3JlYXRlUHJvcGVydHkgfTtcblxuLyoqKi8gfSxcbi8qIDcxICovXG4vKioqLyBmdW5jdGlvbihtb2R1bGUsIGV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pIHtcblxuXHQndXNlIHN0cmljdCc7XG5cblx0dmFyIGNvbWJpbmUgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDYwKTtcblxuXHR2YXIgaWQyID0gZnVuY3Rpb24gaWQyKF8sIHgpIHtcblx0ICByZXR1cm4geDtcblx0fTtcblxuXHRtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIHNhbXBsZWRCeShwYXNzaXZlLCBhY3RpdmUsIGNvbWJpbmF0b3IpIHtcblx0ICB2YXIgX2NvbWJpbmF0b3IgPSBjb21iaW5hdG9yID8gZnVuY3Rpb24gKGEsIGIpIHtcblx0ICAgIHJldHVybiBjb21iaW5hdG9yKGIsIGEpO1xuXHQgIH0gOiBpZDI7XG5cdCAgcmV0dXJuIGNvbWJpbmUoW2FjdGl2ZV0sIFtwYXNzaXZlXSwgX2NvbWJpbmF0b3IpLnNldE5hbWUocGFzc2l2ZSwgJ3NhbXBsZWRCeScpO1xuXHR9O1xuXG4vKioqLyB9LFxuLyogNzIgKi9cbi8qKiovIGZ1bmN0aW9uKG1vZHVsZSwgZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXykge1xuXG5cdCd1c2Ugc3RyaWN0JztcblxuXHR2YXIgX3JlcXVpcmUgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDcwKTtcblxuXHR2YXIgY3JlYXRlU3RyZWFtID0gX3JlcXVpcmUuY3JlYXRlU3RyZWFtO1xuXHR2YXIgY3JlYXRlUHJvcGVydHkgPSBfcmVxdWlyZS5jcmVhdGVQcm9wZXJ0eTtcblxuXHR2YXIgX3JlcXVpcmUyID0gX193ZWJwYWNrX3JlcXVpcmVfXygzKTtcblxuXHR2YXIgTk9USElORyA9IF9yZXF1aXJlMi5OT1RISU5HO1xuXG5cdHZhciBtaXhpbiA9IHtcblxuXHQgIF9oYW5kbGVQcmltYXJ5VmFsdWU6IGZ1bmN0aW9uIF9oYW5kbGVQcmltYXJ5VmFsdWUoeCkge1xuXHQgICAgaWYgKHRoaXMuX2xhc3RTZWNvbmRhcnkgIT09IE5PVEhJTkcpIHtcblx0ICAgICAgdGhpcy5fZW1pdFZhbHVlKHgpO1xuXHQgICAgfVxuXHQgIH0sXG5cblx0ICBfaGFuZGxlU2Vjb25kYXJ5RW5kOiBmdW5jdGlvbiBfaGFuZGxlU2Vjb25kYXJ5RW5kKCkge1xuXHQgICAgaWYgKHRoaXMuX2xhc3RTZWNvbmRhcnkgPT09IE5PVEhJTkcpIHtcblx0ICAgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgICAgfVxuXHQgIH1cblxuXHR9O1xuXG5cdHZhciBTID0gY3JlYXRlU3RyZWFtKCdza2lwVW50aWxCeScsIG1peGluKTtcblx0dmFyIFAgPSBjcmVhdGVQcm9wZXJ0eSgnc2tpcFVudGlsQnknLCBtaXhpbik7XG5cblx0bW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBza2lwVW50aWxCeShwcmltYXJ5LCBzZWNvbmRhcnkpIHtcblx0ICByZXR1cm4gbmV3IChwcmltYXJ5Ll9vZlNhbWVUeXBlKFMsIFApKShwcmltYXJ5LCBzZWNvbmRhcnkpO1xuXHR9O1xuXG4vKioqLyB9LFxuLyogNzMgKi9cbi8qKiovIGZ1bmN0aW9uKG1vZHVsZSwgZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXykge1xuXG5cdCd1c2Ugc3RyaWN0JztcblxuXHR2YXIgX3JlcXVpcmUgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDcwKTtcblxuXHR2YXIgY3JlYXRlU3RyZWFtID0gX3JlcXVpcmUuY3JlYXRlU3RyZWFtO1xuXHR2YXIgY3JlYXRlUHJvcGVydHkgPSBfcmVxdWlyZS5jcmVhdGVQcm9wZXJ0eTtcblxuXHR2YXIgbWl4aW4gPSB7XG5cblx0ICBfaGFuZGxlU2Vjb25kYXJ5VmFsdWU6IGZ1bmN0aW9uIF9oYW5kbGVTZWNvbmRhcnlWYWx1ZSgpIHtcblx0ICAgIHRoaXMuX2VtaXRFbmQoKTtcblx0ICB9XG5cblx0fTtcblxuXHR2YXIgUyA9IGNyZWF0ZVN0cmVhbSgndGFrZVVudGlsQnknLCBtaXhpbik7XG5cdHZhciBQID0gY3JlYXRlUHJvcGVydHkoJ3Rha2VVbnRpbEJ5JywgbWl4aW4pO1xuXG5cdG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gdGFrZVVudGlsQnkocHJpbWFyeSwgc2Vjb25kYXJ5KSB7XG5cdCAgcmV0dXJuIG5ldyAocHJpbWFyeS5fb2ZTYW1lVHlwZShTLCBQKSkocHJpbWFyeSwgc2Vjb25kYXJ5KTtcblx0fTtcblxuLyoqKi8gfSxcbi8qIDc0ICovXG4vKioqLyBmdW5jdGlvbihtb2R1bGUsIGV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pIHtcblxuXHQndXNlIHN0cmljdCc7XG5cblx0dmFyIF9yZXF1aXJlID0gX193ZWJwYWNrX3JlcXVpcmVfXyg3MCk7XG5cblx0dmFyIGNyZWF0ZVN0cmVhbSA9IF9yZXF1aXJlLmNyZWF0ZVN0cmVhbTtcblx0dmFyIGNyZWF0ZVByb3BlcnR5ID0gX3JlcXVpcmUuY3JlYXRlUHJvcGVydHk7XG5cblx0dmFyIG1peGluID0ge1xuXG5cdCAgX2luaXQ6IGZ1bmN0aW9uIF9pbml0KCkge1xuXHQgICAgdmFyIF9yZWYgPSBhcmd1bWVudHMubGVuZ3RoIDw9IDAgfHwgYXJndW1lbnRzWzBdID09PSB1bmRlZmluZWQgPyB7fSA6IGFyZ3VtZW50c1swXTtcblxuXHQgICAgdmFyIF9yZWYkZmx1c2hPbkVuZCA9IF9yZWYuZmx1c2hPbkVuZDtcblx0ICAgIHZhciBmbHVzaE9uRW5kID0gX3JlZiRmbHVzaE9uRW5kID09PSB1bmRlZmluZWQgPyB0cnVlIDogX3JlZiRmbHVzaE9uRW5kO1xuXG5cdCAgICB0aGlzLl9idWZmID0gW107XG5cdCAgICB0aGlzLl9mbHVzaE9uRW5kID0gZmx1c2hPbkVuZDtcblx0ICB9LFxuXG5cdCAgX2ZyZWU6IGZ1bmN0aW9uIF9mcmVlKCkge1xuXHQgICAgdGhpcy5fYnVmZiA9IG51bGw7XG5cdCAgfSxcblxuXHQgIF9mbHVzaDogZnVuY3Rpb24gX2ZsdXNoKCkge1xuXHQgICAgaWYgKHRoaXMuX2J1ZmYgIT09IG51bGwpIHtcblx0ICAgICAgdGhpcy5fZW1pdFZhbHVlKHRoaXMuX2J1ZmYpO1xuXHQgICAgICB0aGlzLl9idWZmID0gW107XG5cdCAgICB9XG5cdCAgfSxcblxuXHQgIF9oYW5kbGVQcmltYXJ5RW5kOiBmdW5jdGlvbiBfaGFuZGxlUHJpbWFyeUVuZCgpIHtcblx0ICAgIGlmICh0aGlzLl9mbHVzaE9uRW5kKSB7XG5cdCAgICAgIHRoaXMuX2ZsdXNoKCk7XG5cdCAgICB9XG5cdCAgICB0aGlzLl9lbWl0RW5kKCk7XG5cdCAgfSxcblxuXHQgIF9vbkFjdGl2YXRpb246IGZ1bmN0aW9uIF9vbkFjdGl2YXRpb24oKSB7XG5cdCAgICB0aGlzLl9wcmltYXJ5Lm9uQW55KHRoaXMuXyRoYW5kbGVQcmltYXJ5QW55KTtcblx0ICAgIGlmICh0aGlzLl9hbGl2ZSAmJiB0aGlzLl9zZWNvbmRhcnkgIT09IG51bGwpIHtcblx0ICAgICAgdGhpcy5fc2Vjb25kYXJ5Lm9uQW55KHRoaXMuXyRoYW5kbGVTZWNvbmRhcnlBbnkpO1xuXHQgICAgfVxuXHQgIH0sXG5cblx0ICBfaGFuZGxlUHJpbWFyeVZhbHVlOiBmdW5jdGlvbiBfaGFuZGxlUHJpbWFyeVZhbHVlKHgpIHtcblx0ICAgIHRoaXMuX2J1ZmYucHVzaCh4KTtcblx0ICB9LFxuXG5cdCAgX2hhbmRsZVNlY29uZGFyeVZhbHVlOiBmdW5jdGlvbiBfaGFuZGxlU2Vjb25kYXJ5VmFsdWUoKSB7XG5cdCAgICB0aGlzLl9mbHVzaCgpO1xuXHQgIH0sXG5cblx0ICBfaGFuZGxlU2Vjb25kYXJ5RW5kOiBmdW5jdGlvbiBfaGFuZGxlU2Vjb25kYXJ5RW5kKCkge1xuXHQgICAgaWYgKCF0aGlzLl9mbHVzaE9uRW5kKSB7XG5cdCAgICAgIHRoaXMuX2VtaXRFbmQoKTtcblx0ICAgIH1cblx0ICB9XG5cblx0fTtcblxuXHR2YXIgUyA9IGNyZWF0ZVN0cmVhbSgnYnVmZmVyQnknLCBtaXhpbik7XG5cdHZhciBQID0gY3JlYXRlUHJvcGVydHkoJ2J1ZmZlckJ5JywgbWl4aW4pO1xuXG5cdG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gYnVmZmVyQnkocHJpbWFyeSwgc2Vjb25kYXJ5LCBvcHRpb25zIC8qIG9wdGlvbmFsICovKSB7XG5cdCAgcmV0dXJuIG5ldyAocHJpbWFyeS5fb2ZTYW1lVHlwZShTLCBQKSkocHJpbWFyeSwgc2Vjb25kYXJ5LCBvcHRpb25zKTtcblx0fTtcblxuLyoqKi8gfSxcbi8qIDc1ICovXG4vKioqLyBmdW5jdGlvbihtb2R1bGUsIGV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pIHtcblxuXHQndXNlIHN0cmljdCc7XG5cblx0dmFyIF9yZXF1aXJlID0gX193ZWJwYWNrX3JlcXVpcmVfXyg3MCk7XG5cblx0dmFyIGNyZWF0ZVN0cmVhbSA9IF9yZXF1aXJlLmNyZWF0ZVN0cmVhbTtcblx0dmFyIGNyZWF0ZVByb3BlcnR5ID0gX3JlcXVpcmUuY3JlYXRlUHJvcGVydHk7XG5cblx0dmFyIF9yZXF1aXJlMiA9IF9fd2VicGFja19yZXF1aXJlX18oMyk7XG5cblx0dmFyIE5PVEhJTkcgPSBfcmVxdWlyZTIuTk9USElORztcblxuXHR2YXIgbWl4aW4gPSB7XG5cblx0ICBfaW5pdDogZnVuY3Rpb24gX2luaXQoKSB7XG5cdCAgICB2YXIgX3JlZiA9IGFyZ3VtZW50cy5sZW5ndGggPD0gMCB8fCBhcmd1bWVudHNbMF0gPT09IHVuZGVmaW5lZCA/IHt9IDogYXJndW1lbnRzWzBdO1xuXG5cdCAgICB2YXIgX3JlZiRmbHVzaE9uRW5kID0gX3JlZi5mbHVzaE9uRW5kO1xuXHQgICAgdmFyIGZsdXNoT25FbmQgPSBfcmVmJGZsdXNoT25FbmQgPT09IHVuZGVmaW5lZCA/IHRydWUgOiBfcmVmJGZsdXNoT25FbmQ7XG5cdCAgICB2YXIgX3JlZiRmbHVzaE9uQ2hhbmdlID0gX3JlZi5mbHVzaE9uQ2hhbmdlO1xuXHQgICAgdmFyIGZsdXNoT25DaGFuZ2UgPSBfcmVmJGZsdXNoT25DaGFuZ2UgPT09IHVuZGVmaW5lZCA/IGZhbHNlIDogX3JlZiRmbHVzaE9uQ2hhbmdlO1xuXG5cdCAgICB0aGlzLl9idWZmID0gW107XG5cdCAgICB0aGlzLl9mbHVzaE9uRW5kID0gZmx1c2hPbkVuZDtcblx0ICAgIHRoaXMuX2ZsdXNoT25DaGFuZ2UgPSBmbHVzaE9uQ2hhbmdlO1xuXHQgIH0sXG5cblx0ICBfZnJlZTogZnVuY3Rpb24gX2ZyZWUoKSB7XG5cdCAgICB0aGlzLl9idWZmID0gbnVsbDtcblx0ICB9LFxuXG5cdCAgX2ZsdXNoOiBmdW5jdGlvbiBfZmx1c2goKSB7XG5cdCAgICBpZiAodGhpcy5fYnVmZiAhPT0gbnVsbCkge1xuXHQgICAgICB0aGlzLl9lbWl0VmFsdWUodGhpcy5fYnVmZik7XG5cdCAgICAgIHRoaXMuX2J1ZmYgPSBbXTtcblx0ICAgIH1cblx0ICB9LFxuXG5cdCAgX2hhbmRsZVByaW1hcnlFbmQ6IGZ1bmN0aW9uIF9oYW5kbGVQcmltYXJ5RW5kKCkge1xuXHQgICAgaWYgKHRoaXMuX2ZsdXNoT25FbmQpIHtcblx0ICAgICAgdGhpcy5fZmx1c2goKTtcblx0ICAgIH1cblx0ICAgIHRoaXMuX2VtaXRFbmQoKTtcblx0ICB9LFxuXG5cdCAgX2hhbmRsZVByaW1hcnlWYWx1ZTogZnVuY3Rpb24gX2hhbmRsZVByaW1hcnlWYWx1ZSh4KSB7XG5cdCAgICB0aGlzLl9idWZmLnB1c2goeCk7XG5cdCAgICBpZiAodGhpcy5fbGFzdFNlY29uZGFyeSAhPT0gTk9USElORyAmJiAhdGhpcy5fbGFzdFNlY29uZGFyeSkge1xuXHQgICAgICB0aGlzLl9mbHVzaCgpO1xuXHQgICAgfVxuXHQgIH0sXG5cblx0ICBfaGFuZGxlU2Vjb25kYXJ5RW5kOiBmdW5jdGlvbiBfaGFuZGxlU2Vjb25kYXJ5RW5kKCkge1xuXHQgICAgaWYgKCF0aGlzLl9mbHVzaE9uRW5kICYmICh0aGlzLl9sYXN0U2Vjb25kYXJ5ID09PSBOT1RISU5HIHx8IHRoaXMuX2xhc3RTZWNvbmRhcnkpKSB7XG5cdCAgICAgIHRoaXMuX2VtaXRFbmQoKTtcblx0ICAgIH1cblx0ICB9LFxuXG5cdCAgX2hhbmRsZVNlY29uZGFyeVZhbHVlOiBmdW5jdGlvbiBfaGFuZGxlU2Vjb25kYXJ5VmFsdWUoeCkge1xuXHQgICAgaWYgKHRoaXMuX2ZsdXNoT25DaGFuZ2UgJiYgIXgpIHtcblx0ICAgICAgdGhpcy5fZmx1c2goKTtcblx0ICAgIH1cblxuXHQgICAgLy8gZnJvbSBkZWZhdWx0IF9oYW5kbGVTZWNvbmRhcnlWYWx1ZVxuXHQgICAgdGhpcy5fbGFzdFNlY29uZGFyeSA9IHg7XG5cdCAgfVxuXG5cdH07XG5cblx0dmFyIFMgPSBjcmVhdGVTdHJlYW0oJ2J1ZmZlcldoaWxlQnknLCBtaXhpbik7XG5cdHZhciBQID0gY3JlYXRlUHJvcGVydHkoJ2J1ZmZlcldoaWxlQnknLCBtaXhpbik7XG5cblx0bW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBidWZmZXJXaGlsZUJ5KHByaW1hcnksIHNlY29uZGFyeSwgb3B0aW9ucyAvKiBvcHRpb25hbCAqLykge1xuXHQgIHJldHVybiBuZXcgKHByaW1hcnkuX29mU2FtZVR5cGUoUywgUCkpKHByaW1hcnksIHNlY29uZGFyeSwgb3B0aW9ucyk7XG5cdH07XG5cbi8qKiovIH0sXG4vKiA3NiAqL1xuLyoqKi8gZnVuY3Rpb24obW9kdWxlLCBleHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKSB7XG5cblx0J3VzZSBzdHJpY3QnO1xuXG5cdHZhciBtZXJnZSA9IF9fd2VicGFja19yZXF1aXJlX18oNjIpO1xuXHR2YXIgbWFwID0gX193ZWJwYWNrX3JlcXVpcmVfXygzMik7XG5cdHZhciBza2lwRHVwbGljYXRlcyA9IF9fd2VicGFja19yZXF1aXJlX18oNDApO1xuXHR2YXIgdG9Qcm9wZXJ0eSA9IF9fd2VicGFja19yZXF1aXJlX18oMjQpO1xuXG5cdHZhciBmID0gZnVuY3Rpb24gZigpIHtcblx0ICByZXR1cm4gZmFsc2U7XG5cdH07XG5cdHZhciB0ID0gZnVuY3Rpb24gdCgpIHtcblx0ICByZXR1cm4gdHJ1ZTtcblx0fTtcblxuXHRtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGF3YWl0aW5nKGEsIGIpIHtcblx0ICB2YXIgcmVzdWx0ID0gbWVyZ2UoW21hcChhLCB0KSwgbWFwKGIsIGYpXSk7XG5cdCAgcmVzdWx0ID0gc2tpcER1cGxpY2F0ZXMocmVzdWx0KTtcblx0ICByZXN1bHQgPSB0b1Byb3BlcnR5KHJlc3VsdCwgZik7XG5cdCAgcmV0dXJuIHJlc3VsdC5zZXROYW1lKGEsICdhd2FpdGluZycpO1xuXHR9O1xuXG4vKioqLyB9LFxuLyogNzcgKi9cbi8qKiovIGZ1bmN0aW9uKG1vZHVsZSwgZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXykge1xuXG5cdCd1c2Ugc3RyaWN0JztcblxuXHR2YXIgX3JlcXVpcmUgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDI1KTtcblxuXHR2YXIgY3JlYXRlU3RyZWFtID0gX3JlcXVpcmUuY3JlYXRlU3RyZWFtO1xuXHR2YXIgY3JlYXRlUHJvcGVydHkgPSBfcmVxdWlyZS5jcmVhdGVQcm9wZXJ0eTtcblxuXHR2YXIgbWl4aW4gPSB7XG5cblx0ICBfaW5pdDogZnVuY3Rpb24gX2luaXQoX3JlZikge1xuXHQgICAgdmFyIGZuID0gX3JlZi5mbjtcblxuXHQgICAgdGhpcy5fZm4gPSBmbjtcblx0ICB9LFxuXG5cdCAgX2ZyZWU6IGZ1bmN0aW9uIF9mcmVlKCkge1xuXHQgICAgdGhpcy5fZm4gPSBudWxsO1xuXHQgIH0sXG5cblx0ICBfaGFuZGxlVmFsdWU6IGZ1bmN0aW9uIF9oYW5kbGVWYWx1ZSh4KSB7XG5cdCAgICB2YXIgZm4gPSB0aGlzLl9mbjtcblx0ICAgIHZhciByZXN1bHQgPSBmbih4KTtcblx0ICAgIGlmIChyZXN1bHQuY29udmVydCkge1xuXHQgICAgICB0aGlzLl9lbWl0RXJyb3IocmVzdWx0LmVycm9yKTtcblx0ICAgIH0gZWxzZSB7XG5cdCAgICAgIHRoaXMuX2VtaXRWYWx1ZSh4KTtcblx0ICAgIH1cblx0ICB9XG5cblx0fTtcblxuXHR2YXIgUyA9IGNyZWF0ZVN0cmVhbSgndmFsdWVzVG9FcnJvcnMnLCBtaXhpbik7XG5cdHZhciBQID0gY3JlYXRlUHJvcGVydHkoJ3ZhbHVlc1RvRXJyb3JzJywgbWl4aW4pO1xuXG5cdHZhciBkZWZGbiA9IGZ1bmN0aW9uIGRlZkZuKHgpIHtcblx0ICByZXR1cm4geyBjb252ZXJ0OiB0cnVlLCBlcnJvcjogeCB9O1xuXHR9O1xuXG5cdG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gdmFsdWVzVG9FcnJvcnMob2JzKSB7XG5cdCAgdmFyIGZuID0gYXJndW1lbnRzLmxlbmd0aCA8PSAxIHx8IGFyZ3VtZW50c1sxXSA9PT0gdW5kZWZpbmVkID8gZGVmRm4gOiBhcmd1bWVudHNbMV07XG5cblx0ICByZXR1cm4gbmV3IChvYnMuX29mU2FtZVR5cGUoUywgUCkpKG9icywgeyBmbjogZm4gfSk7XG5cdH07XG5cbi8qKiovIH0sXG4vKiA3OCAqL1xuLyoqKi8gZnVuY3Rpb24obW9kdWxlLCBleHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKSB7XG5cblx0J3VzZSBzdHJpY3QnO1xuXG5cdHZhciBfcmVxdWlyZSA9IF9fd2VicGFja19yZXF1aXJlX18oMjUpO1xuXG5cdHZhciBjcmVhdGVTdHJlYW0gPSBfcmVxdWlyZS5jcmVhdGVTdHJlYW07XG5cdHZhciBjcmVhdGVQcm9wZXJ0eSA9IF9yZXF1aXJlLmNyZWF0ZVByb3BlcnR5O1xuXG5cdHZhciBtaXhpbiA9IHtcblxuXHQgIF9pbml0OiBmdW5jdGlvbiBfaW5pdChfcmVmKSB7XG5cdCAgICB2YXIgZm4gPSBfcmVmLmZuO1xuXG5cdCAgICB0aGlzLl9mbiA9IGZuO1xuXHQgIH0sXG5cblx0ICBfZnJlZTogZnVuY3Rpb24gX2ZyZWUoKSB7XG5cdCAgICB0aGlzLl9mbiA9IG51bGw7XG5cdCAgfSxcblxuXHQgIF9oYW5kbGVFcnJvcjogZnVuY3Rpb24gX2hhbmRsZUVycm9yKHgpIHtcblx0ICAgIHZhciBmbiA9IHRoaXMuX2ZuO1xuXHQgICAgdmFyIHJlc3VsdCA9IGZuKHgpO1xuXHQgICAgaWYgKHJlc3VsdC5jb252ZXJ0KSB7XG5cdCAgICAgIHRoaXMuX2VtaXRWYWx1ZShyZXN1bHQudmFsdWUpO1xuXHQgICAgfSBlbHNlIHtcblx0ICAgICAgdGhpcy5fZW1pdEVycm9yKHgpO1xuXHQgICAgfVxuXHQgIH1cblxuXHR9O1xuXG5cdHZhciBTID0gY3JlYXRlU3RyZWFtKCdlcnJvcnNUb1ZhbHVlcycsIG1peGluKTtcblx0dmFyIFAgPSBjcmVhdGVQcm9wZXJ0eSgnZXJyb3JzVG9WYWx1ZXMnLCBtaXhpbik7XG5cblx0dmFyIGRlZkZuID0gZnVuY3Rpb24gZGVmRm4oeCkge1xuXHQgIHJldHVybiB7IGNvbnZlcnQ6IHRydWUsIHZhbHVlOiB4IH07XG5cdH07XG5cblx0bW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBlcnJvcnNUb1ZhbHVlcyhvYnMpIHtcblx0ICB2YXIgZm4gPSBhcmd1bWVudHMubGVuZ3RoIDw9IDEgfHwgYXJndW1lbnRzWzFdID09PSB1bmRlZmluZWQgPyBkZWZGbiA6IGFyZ3VtZW50c1sxXTtcblxuXHQgIHJldHVybiBuZXcgKG9icy5fb2ZTYW1lVHlwZShTLCBQKSkob2JzLCB7IGZuOiBmbiB9KTtcblx0fTtcblxuLyoqKi8gfSxcbi8qIDc5ICovXG4vKioqLyBmdW5jdGlvbihtb2R1bGUsIGV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pIHtcblxuXHQndXNlIHN0cmljdCc7XG5cblx0dmFyIF9yZXF1aXJlID0gX193ZWJwYWNrX3JlcXVpcmVfXygyNSk7XG5cblx0dmFyIGNyZWF0ZVN0cmVhbSA9IF9yZXF1aXJlLmNyZWF0ZVN0cmVhbTtcblx0dmFyIGNyZWF0ZVByb3BlcnR5ID0gX3JlcXVpcmUuY3JlYXRlUHJvcGVydHk7XG5cblx0dmFyIG1peGluID0ge1xuXG5cdCAgX2hhbmRsZUVycm9yOiBmdW5jdGlvbiBfaGFuZGxlRXJyb3IoeCkge1xuXHQgICAgdGhpcy5fZW1pdEVycm9yKHgpO1xuXHQgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgIH1cblxuXHR9O1xuXG5cdHZhciBTID0gY3JlYXRlU3RyZWFtKCdlbmRPbkVycm9yJywgbWl4aW4pO1xuXHR2YXIgUCA9IGNyZWF0ZVByb3BlcnR5KCdlbmRPbkVycm9yJywgbWl4aW4pO1xuXG5cdG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gZW5kT25FcnJvcihvYnMpIHtcblx0ICByZXR1cm4gbmV3IChvYnMuX29mU2FtZVR5cGUoUywgUCkpKG9icyk7XG5cdH07XG5cbi8qKiovIH1cbi8qKioqKiovIF0pXG59KTtcbjtcblxuXG4vKioqKioqKioqKioqKioqKipcbiAqKiBXRUJQQUNLIEZPT1RFUlxuICoqIC4vfi9rZWZpci9kaXN0L2tlZmlyLmpzXG4gKiogbW9kdWxlIGlkID0gM1xuICoqIG1vZHVsZSBjaHVua3MgPSAwXG4gKiovIiwiY29uc3QgbG9vcGVyID0gcmVxdWlyZSgnLi9sb29wZXIuanMnKTtcblxubW9kdWxlLmV4cG9ydHMubmV4dCA9IG5leHQ7XG5cbm1vZHVsZS5leHBvcnRzLmNvbmZpZyA9IChjb25maWcpID0+IHtcbiAgbG9vcGVyLmNvbmZpZyhjb25maWcpXG59O1xuXG5tb2R1bGUuZXhwb3J0cy5wbGF5ID0gKCkgPT4ge1xuICBsb29wZXIucGxheSgpXG59O1xuXG5cbmZ1bmN0aW9uIG5leHQoaWQpIHtcbiAgbG9vcGVyLm5leHQoaWQpO1xufVxuXG5cblxuLyoqIFdFQlBBQ0sgRk9PVEVSICoqXG4gKiogLi9zY2VuZS1tYWtlci9yZW5kZXIvYXVkaW9wbGF5ZXIuanNcbiAqKi8iLCIndXNlIHN0cmljdCc7XG5jb25zdCBIb3dsID0gcmVxdWlyZSgnaG93bGVyJykuSG93bDtcblxudmFyIGxvb3BzID0ge307XG52YXIgbG9vcDtcblxubW9kdWxlLmV4cG9ydHMuY29uZmlnID0gKGNvbmZpZykgPT4ge1xuICBsb29wcyA9IGNvbmZpZy5tYXAoYyA9PiB7XG4gICAgbGV0IGF1ZGlvQ29uZmlnID0ge1xuICAgICAgc3JjOiBbJ21lZGlhLycrIGMuYXVkaW8uc3JjICsnLm1wMyddLFxuICAgICAgaHRtbDU6IHRydWUsXG4gICAgICB2b2x1bWU6IDBcbiAgICB9XG4gICAgcmV0dXJuIHtcbiAgICAgICdpZCc6IGMuaWQsXG4gICAgICAndm9sJzogYy5hdWRpby5tYXgsXG4gICAgICAnc291bmQxJzogbmV3IEhvd2woYXVkaW9Db25maWcpLFxuICAgICAgJ3NvdW5kMic6IG5ldyBIb3dsKGF1ZGlvQ29uZmlnKVxuICAgIH1cbiAgfSkucmVkdWNlKCAocHJldixuZXh0KSA9PiAge3ByZXZbbmV4dC5pZF0gPSBuZXh0OyByZXR1cm4gcHJldjt9LCB7fSlcbn1cblxubW9kdWxlLmV4cG9ydHMubmV4dCA9IChpZCkgPT4ge1xuICAvLyBjb25zb2xlLmxvZygnbmV4dCcsIGlkKVxuICBsb29wID0gbG9vcHNbaWRdO1xuICAvLyBjb25zb2xlLmxvZyhsb29wKTtcbn1cblxubW9kdWxlLmV4cG9ydHMucGF1c2UgPSAoY29uZmlnKSA9PiB7XG5cbn1cblxubW9kdWxlLmV4cG9ydHMucGxheSA9IChjb25maWcpID0+IHtcbiAgbG9vcGVyKCk7XG59XG5cbm1vZHVsZS5leHBvcnRzLnN0b3AgPSAoY29uZmlnKSA9PiB7XG5cbn1cblxuZnVuY3Rpb24gbG9vcGVyKCkge1xuXG4gICd1c2Ugc3RyaWN0JztcbiAgLy8gY29uc29sZS5sb2coJ2xvb3BlcicsIGxvb3Auc291bmQxKVxuICBsZXQgZmFkZVBlcmNlbnQgPSAobG9vcC5zb3VuZDEuZHVyYXRpb24oKSA+IDUpICA/IDAuMDEgOiAwLjAxNTsgLy8gMiUgb3IgMSUgZGVwZW5kaW5nIG9uIGlmIHNvdW5kIGlzIG92ZXIgNSBzZWNvbmRzXG4gIGxldCBmYWRlcmF0ZSA9ICAxIC0gZmFkZVBlcmNlbnQ7XG4gIGxldCBkdXJhdGlvbiA9IGxvb3Auc291bmQxLmR1cmF0aW9uKCkgKiAxMDAwICogKDEgLSBmYWRlUGVyY2VudCk7XG4gIGxldCB2b2x1bWUgPSBsb29wLnZvbDtcbiAgLy8gY29uc29sZS5sb2coZmFkZXJhdGUsIGZhZGVQZXJjZW50LCBkdXJhdGlvbiwgdm9sdW1lKTtcblxuICBsb29wLnNvdW5kMS5wbGF5KCk7XG4gIGxvb3Auc291bmQxLmZhZGUoMCx2b2x1bWUsIGR1cmF0aW9uICogZmFkZVBlcmNlbnQpO1xuXG4gIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgIGxvb3Auc291bmQxLmZhZGUodm9sdW1lLDAsIGR1cmF0aW9uICogZmFkZVBlcmNlbnQpO1xuICB9LCBkdXJhdGlvbiAqIGZhZGVyYXRlICk7XG5cbiAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgbG9vcC5zb3VuZDIucGxheSgpO1xuICAgIGxvb3Auc291bmQyLmZhZGUoMCx2b2x1bWUsIGR1cmF0aW9uICogZmFkZVBlcmNlbnQpO1xuICB9LCBkdXJhdGlvbiAqIGZhZGVyYXRlKTtcblxuICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICBsb29wLnNvdW5kMi5mYWRlKHZvbHVtZSwwLCBkdXJhdGlvbiAqIGZhZGVQZXJjZW50KTtcbiAgICBsb29wZXIoKTtcbiAgfSwgZHVyYXRpb24gKiAyICogZmFkZXJhdGUpO1xuXG59XG5cbm1vZHVsZS5leHBvcnRzLmxvb3AgPSBsb29wZXI7XG5cblxuXG4vKiogV0VCUEFDSyBGT09URVIgKipcbiAqKiAuL3NjZW5lLW1ha2VyL3JlbmRlci9sb29wZXIuanNcbiAqKi8iLCIvKiEgaG93bGVyLmpzIHYyLjAuMC1iZXRhNyB8IChjKSAyMDEzLTIwMTYsIEphbWVzIFNpbXBzb24gb2YgR29sZEZpcmUgU3R1ZGlvcyB8IE1JVCBMaWNlbnNlIHwgaG93bGVyanMuY29tICovXG4hZnVuY3Rpb24oKXtcInVzZSBzdHJpY3RcIjtmdW5jdGlvbiBlKCl7dHJ5e1widW5kZWZpbmVkXCIhPXR5cGVvZiBBdWRpb0NvbnRleHQ/bj1uZXcgQXVkaW9Db250ZXh0OlwidW5kZWZpbmVkXCIhPXR5cGVvZiB3ZWJraXRBdWRpb0NvbnRleHQ/bj1uZXcgd2Via2l0QXVkaW9Db250ZXh0Om89ITF9Y2F0Y2goZSl7bz0hMX1pZighbylpZihcInVuZGVmaW5lZFwiIT10eXBlb2YgQXVkaW8pdHJ5e3ZhciBkPW5ldyBBdWRpbztcInVuZGVmaW5lZFwiPT10eXBlb2YgZC5vbmNhbnBsYXl0aHJvdWdoJiYodT1cImNhbnBsYXlcIil9Y2F0Y2goZSl7dD0hMH1lbHNlIHQ9ITA7dHJ5e3ZhciBkPW5ldyBBdWRpbztkLm11dGVkJiYodD0hMCl9Y2F0Y2goZSl7fXZhciBhPS9pUChob25lfG9kfGFkKS8udGVzdChuYXZpZ2F0b3IucGxhdGZvcm0pLGk9bmF2aWdhdG9yLmFwcFZlcnNpb24ubWF0Y2goL09TIChcXGQrKV8oXFxkKylfPyhcXGQrKT8vKSxfPWk/cGFyc2VJbnQoaVsxXSwxMCk6bnVsbDtpZihhJiZfJiY5Pl8pe3ZhciBzPS9zYWZhcmkvLnRlc3Qod2luZG93Lm5hdmlnYXRvci51c2VyQWdlbnQudG9Mb3dlckNhc2UoKSk7KHdpbmRvdy5uYXZpZ2F0b3Iuc3RhbmRhbG9uZSYmIXN8fCF3aW5kb3cubmF2aWdhdG9yLnN0YW5kYWxvbmUmJiFzKSYmKG89ITEpfW8mJihyPVwidW5kZWZpbmVkXCI9PXR5cGVvZiBuLmNyZWF0ZUdhaW4/bi5jcmVhdGVHYWluTm9kZSgpOm4uY3JlYXRlR2FpbigpLHIuZ2Fpbi52YWx1ZT0xLHIuY29ubmVjdChuLmRlc3RpbmF0aW9uKSl9dmFyIG49bnVsbCxvPSEwLHQ9ITEscj1udWxsLHU9XCJjYW5wbGF5dGhyb3VnaFwiO2UoKTt2YXIgZD1mdW5jdGlvbigpe3RoaXMuaW5pdCgpfTtkLnByb3RvdHlwZT17aW5pdDpmdW5jdGlvbigpe3ZhciBlPXRoaXN8fGE7cmV0dXJuIGUuX2NvZGVjcz17fSxlLl9ob3dscz1bXSxlLl9tdXRlZD0hMSxlLl92b2x1bWU9MSxlLnN0YXRlPW4/bi5zdGF0ZXx8XCJydW5uaW5nXCI6XCJydW5uaW5nXCIsZS5hdXRvU3VzcGVuZD0hMCxlLl9hdXRvU3VzcGVuZCgpLGUubW9iaWxlQXV0b0VuYWJsZT0hMCxlLm5vQXVkaW89dCxlLnVzaW5nV2ViQXVkaW89byxlLmN0eD1uLHR8fGUuX3NldHVwQ29kZWNzKCksZX0sdm9sdW1lOmZ1bmN0aW9uKGUpe3ZhciBuPXRoaXN8fGE7aWYoZT1wYXJzZUZsb2F0KGUpLFwidW5kZWZpbmVkXCIhPXR5cGVvZiBlJiZlPj0wJiYxPj1lKXtuLl92b2x1bWU9ZSxvJiYoci5nYWluLnZhbHVlPWUpO2Zvcih2YXIgdD0wO3Q8bi5faG93bHMubGVuZ3RoO3QrKylpZighbi5faG93bHNbdF0uX3dlYkF1ZGlvKWZvcih2YXIgdT1uLl9ob3dsc1t0XS5fZ2V0U291bmRJZHMoKSxkPTA7ZDx1Lmxlbmd0aDtkKyspe3ZhciBpPW4uX2hvd2xzW3RdLl9zb3VuZEJ5SWQodVtkXSk7aSYmaS5fbm9kZSYmKGkuX25vZGUudm9sdW1lPWkuX3ZvbHVtZSplKX1yZXR1cm4gbn1yZXR1cm4gbi5fdm9sdW1lfSxtdXRlOmZ1bmN0aW9uKGUpe3ZhciBuPXRoaXN8fGE7bi5fbXV0ZWQ9ZSxvJiYoci5nYWluLnZhbHVlPWU/MDpuLl92b2x1bWUpO2Zvcih2YXIgdD0wO3Q8bi5faG93bHMubGVuZ3RoO3QrKylpZighbi5faG93bHNbdF0uX3dlYkF1ZGlvKWZvcih2YXIgdT1uLl9ob3dsc1t0XS5fZ2V0U291bmRJZHMoKSxkPTA7ZDx1Lmxlbmd0aDtkKyspe3ZhciBpPW4uX2hvd2xzW3RdLl9zb3VuZEJ5SWQodVtkXSk7aSYmaS5fbm9kZSYmKGkuX25vZGUubXV0ZWQ9ZT8hMDppLl9tdXRlZCl9cmV0dXJuIG59LHVubG9hZDpmdW5jdGlvbigpe2Zvcih2YXIgbz10aGlzfHxhLHQ9by5faG93bHMubGVuZ3RoLTE7dD49MDt0LS0pby5faG93bHNbdF0udW5sb2FkKCk7cmV0dXJuIG8udXNpbmdXZWJBdWRpbyYmXCJ1bmRlZmluZWRcIiE9dHlwZW9mIG4uY2xvc2UmJihvLmN0eD1udWxsLG4uY2xvc2UoKSxlKCksby5jdHg9biksb30sY29kZWNzOmZ1bmN0aW9uKGUpe3JldHVybih0aGlzfHxhKS5fY29kZWNzW2VdfSxfc2V0dXBDb2RlY3M6ZnVuY3Rpb24oKXt2YXIgZT10aGlzfHxhLG49bmV3IEF1ZGlvLG89bi5jYW5QbGF5VHlwZShcImF1ZGlvL21wZWc7XCIpLnJlcGxhY2UoL15ubyQvLFwiXCIpLHQ9L09QUlxcLy8udGVzdChuYXZpZ2F0b3IudXNlckFnZW50KTtyZXR1cm4gZS5fY29kZWNzPXttcDM6ISh0fHwhbyYmIW4uY2FuUGxheVR5cGUoXCJhdWRpby9tcDM7XCIpLnJlcGxhY2UoL15ubyQvLFwiXCIpKSxtcGVnOiEhbyxvcHVzOiEhbi5jYW5QbGF5VHlwZSgnYXVkaW8vb2dnOyBjb2RlY3M9XCJvcHVzXCInKS5yZXBsYWNlKC9ebm8kLyxcIlwiKSxvZ2c6ISFuLmNhblBsYXlUeXBlKCdhdWRpby9vZ2c7IGNvZGVjcz1cInZvcmJpc1wiJykucmVwbGFjZSgvXm5vJC8sXCJcIiksb2dhOiEhbi5jYW5QbGF5VHlwZSgnYXVkaW8vb2dnOyBjb2RlY3M9XCJ2b3JiaXNcIicpLnJlcGxhY2UoL15ubyQvLFwiXCIpLHdhdjohIW4uY2FuUGxheVR5cGUoJ2F1ZGlvL3dhdjsgY29kZWNzPVwiMVwiJykucmVwbGFjZSgvXm5vJC8sXCJcIiksYWFjOiEhbi5jYW5QbGF5VHlwZShcImF1ZGlvL2FhYztcIikucmVwbGFjZSgvXm5vJC8sXCJcIiksbTRhOiEhKG4uY2FuUGxheVR5cGUoXCJhdWRpby94LW00YTtcIil8fG4uY2FuUGxheVR5cGUoXCJhdWRpby9tNGE7XCIpfHxuLmNhblBsYXlUeXBlKFwiYXVkaW8vYWFjO1wiKSkucmVwbGFjZSgvXm5vJC8sXCJcIiksbXA0OiEhKG4uY2FuUGxheVR5cGUoXCJhdWRpby94LW1wNDtcIil8fG4uY2FuUGxheVR5cGUoXCJhdWRpby9tcDQ7XCIpfHxuLmNhblBsYXlUeXBlKFwiYXVkaW8vYWFjO1wiKSkucmVwbGFjZSgvXm5vJC8sXCJcIiksd2ViYTohIW4uY2FuUGxheVR5cGUoJ2F1ZGlvL3dlYm07IGNvZGVjcz1cInZvcmJpc1wiJykucmVwbGFjZSgvXm5vJC8sXCJcIiksd2VibTohIW4uY2FuUGxheVR5cGUoJ2F1ZGlvL3dlYm07IGNvZGVjcz1cInZvcmJpc1wiJykucmVwbGFjZSgvXm5vJC8sXCJcIiksZG9sYnk6ISFuLmNhblBsYXlUeXBlKCdhdWRpby9tcDQ7IGNvZGVjcz1cImVjLTNcIicpLnJlcGxhY2UoL15ubyQvLFwiXCIpfSxlfSxfZW5hYmxlTW9iaWxlQXVkaW86ZnVuY3Rpb24oKXt2YXIgZT10aGlzfHxhLG89L2lQaG9uZXxpUGFkfGlQb2R8QW5kcm9pZHxCbGFja0JlcnJ5fEJCMTB8U2lsay9pLnRlc3QobmF2aWdhdG9yLnVzZXJBZ2VudCksdD0hIShcIm9udG91Y2hlbmRcImluIHdpbmRvd3x8bmF2aWdhdG9yLm1heFRvdWNoUG9pbnRzPjB8fG5hdmlnYXRvci5tc01heFRvdWNoUG9pbnRzPjApO2lmKCFufHwhZS5fbW9iaWxlRW5hYmxlZCYmbyYmdCl7ZS5fbW9iaWxlRW5hYmxlZD0hMTt2YXIgcj1mdW5jdGlvbigpe3ZhciBvPW4uY3JlYXRlQnVmZmVyKDEsMSwyMjA1MCksdD1uLmNyZWF0ZUJ1ZmZlclNvdXJjZSgpO3QuYnVmZmVyPW8sdC5jb25uZWN0KG4uZGVzdGluYXRpb24pLFwidW5kZWZpbmVkXCI9PXR5cGVvZiB0LnN0YXJ0P3Qubm90ZU9uKDApOnQuc3RhcnQoMCksdC5vbmVuZGVkPWZ1bmN0aW9uKCl7dC5kaXNjb25uZWN0KDApLGUuX21vYmlsZUVuYWJsZWQ9ITAsZS5tb2JpbGVBdXRvRW5hYmxlPSExLGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJ0b3VjaGVuZFwiLHIsITApfX07cmV0dXJuIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJ0b3VjaGVuZFwiLHIsITApLGV9fSxfYXV0b1N1c3BlbmQ6ZnVuY3Rpb24oKXt2YXIgZT10aGlzO2lmKGUuYXV0b1N1c3BlbmQmJm4mJlwidW5kZWZpbmVkXCIhPXR5cGVvZiBuLnN1c3BlbmQmJm8pe2Zvcih2YXIgdD0wO3Q8ZS5faG93bHMubGVuZ3RoO3QrKylpZihlLl9ob3dsc1t0XS5fd2ViQXVkaW8pZm9yKHZhciByPTA7cjxlLl9ob3dsc1t0XS5fc291bmRzLmxlbmd0aDtyKyspaWYoIWUuX2hvd2xzW3RdLl9zb3VuZHNbcl0uX3BhdXNlZClyZXR1cm4gZTtyZXR1cm4gZS5fc3VzcGVuZFRpbWVyPXNldFRpbWVvdXQoZnVuY3Rpb24oKXtlLmF1dG9TdXNwZW5kJiYoZS5fc3VzcGVuZFRpbWVyPW51bGwsZS5zdGF0ZT1cInN1c3BlbmRpbmdcIixuLnN1c3BlbmQoKS50aGVuKGZ1bmN0aW9uKCl7ZS5zdGF0ZT1cInN1c3BlbmRlZFwiLGUuX3Jlc3VtZUFmdGVyU3VzcGVuZCYmKGRlbGV0ZSBlLl9yZXN1bWVBZnRlclN1c3BlbmQsZS5fYXV0b1Jlc3VtZSgpKX0pKX0sM2U0KSxlfX0sX2F1dG9SZXN1bWU6ZnVuY3Rpb24oKXt2YXIgZT10aGlzO2lmKG4mJlwidW5kZWZpbmVkXCIhPXR5cGVvZiBuLnJlc3VtZSYmbylyZXR1cm5cInJ1bm5pbmdcIj09PWUuc3RhdGUmJmUuX3N1c3BlbmRUaW1lcj8oY2xlYXJUaW1lb3V0KGUuX3N1c3BlbmRUaW1lciksZS5fc3VzcGVuZFRpbWVyPW51bGwpOlwic3VzcGVuZGVkXCI9PT1lLnN0YXRlPyhlLnN0YXRlPVwicmVzdW1pbmdcIixuLnJlc3VtZSgpLnRoZW4oZnVuY3Rpb24oKXtlLnN0YXRlPVwicnVubmluZ1wifSksZS5fc3VzcGVuZFRpbWVyJiYoY2xlYXJUaW1lb3V0KGUuX3N1c3BlbmRUaW1lciksZS5fc3VzcGVuZFRpbWVyPW51bGwpKTpcInN1c3BlbmRpbmdcIj09PWUuc3RhdGUmJihlLl9yZXN1bWVBZnRlclN1c3BlbmQ9ITApLGV9fTt2YXIgYT1uZXcgZCxpPWZ1bmN0aW9uKGUpe3ZhciBuPXRoaXM7cmV0dXJuIGUuc3JjJiYwIT09ZS5zcmMubGVuZ3RoP3ZvaWQgbi5pbml0KGUpOnZvaWQgY29uc29sZS5lcnJvcihcIkFuIGFycmF5IG9mIHNvdXJjZSBmaWxlcyBtdXN0IGJlIHBhc3NlZCB3aXRoIGFueSBuZXcgSG93bC5cIil9O2kucHJvdG90eXBlPXtpbml0OmZ1bmN0aW9uKGUpe3ZhciB0PXRoaXM7cmV0dXJuIHQuX2F1dG9wbGF5PWUuYXV0b3BsYXl8fCExLHQuX2Zvcm1hdD1cInN0cmluZ1wiIT10eXBlb2YgZS5mb3JtYXQ/ZS5mb3JtYXQ6W2UuZm9ybWF0XSx0Ll9odG1sNT1lLmh0bWw1fHwhMSx0Ll9tdXRlZD1lLm11dGV8fCExLHQuX2xvb3A9ZS5sb29wfHwhMSx0Ll9wb29sPWUucG9vbHx8NSx0Ll9wcmVsb2FkPVwiYm9vbGVhblwiPT10eXBlb2YgZS5wcmVsb2FkP2UucHJlbG9hZDohMCx0Ll9yYXRlPWUucmF0ZXx8MSx0Ll9zcHJpdGU9ZS5zcHJpdGV8fHt9LHQuX3NyYz1cInN0cmluZ1wiIT10eXBlb2YgZS5zcmM/ZS5zcmM6W2Uuc3JjXSx0Ll92b2x1bWU9dm9pZCAwIT09ZS52b2x1bWU/ZS52b2x1bWU6MSx0Ll9kdXJhdGlvbj0wLHQuX2xvYWRlZD0hMSx0Ll9zb3VuZHM9W10sdC5fZW5kVGltZXJzPXt9LHQuX3F1ZXVlPVtdLHQuX29uZW5kPWUub25lbmQ/W3tmbjplLm9uZW5kfV06W10sdC5fb25mYWRlPWUub25mYWRlP1t7Zm46ZS5vbmZhZGV9XTpbXSx0Ll9vbmxvYWQ9ZS5vbmxvYWQ/W3tmbjplLm9ubG9hZH1dOltdLHQuX29ubG9hZGVycm9yPWUub25sb2FkZXJyb3I/W3tmbjplLm9ubG9hZGVycm9yfV06W10sdC5fb25wYXVzZT1lLm9ucGF1c2U/W3tmbjplLm9ucGF1c2V9XTpbXSx0Ll9vbnBsYXk9ZS5vbnBsYXk/W3tmbjplLm9ucGxheX1dOltdLHQuX29uc3RvcD1lLm9uc3RvcD9be2ZuOmUub25zdG9wfV06W10sdC5fb25tdXRlPWUub25tdXRlP1t7Zm46ZS5vbm11dGV9XTpbXSx0Ll9vbnZvbHVtZT1lLm9udm9sdW1lP1t7Zm46ZS5vbnZvbHVtZX1dOltdLHQuX29ucmF0ZT1lLm9ucmF0ZT9be2ZuOmUub25yYXRlfV06W10sdC5fb25zZWVrPWUub25zZWVrP1t7Zm46ZS5vbnNlZWt9XTpbXSx0Ll93ZWJBdWRpbz1vJiYhdC5faHRtbDUsXCJ1bmRlZmluZWRcIiE9dHlwZW9mIG4mJm4mJmEubW9iaWxlQXV0b0VuYWJsZSYmYS5fZW5hYmxlTW9iaWxlQXVkaW8oKSxhLl9ob3dscy5wdXNoKHQpLHQuX3ByZWxvYWQmJnQubG9hZCgpLHR9LGxvYWQ6ZnVuY3Rpb24oKXt2YXIgZT10aGlzLG49bnVsbDtpZih0KXJldHVybiB2b2lkIGUuX2VtaXQoXCJsb2FkZXJyb3JcIixudWxsLFwiTm8gYXVkaW8gc3VwcG9ydC5cIik7XCJzdHJpbmdcIj09dHlwZW9mIGUuX3NyYyYmKGUuX3NyYz1bZS5fc3JjXSk7Zm9yKHZhciBvPTA7bzxlLl9zcmMubGVuZ3RoO28rKyl7dmFyIHIsdTtpZihlLl9mb3JtYXQmJmUuX2Zvcm1hdFtvXT9yPWUuX2Zvcm1hdFtvXToodT1lLl9zcmNbb10scj0vXmRhdGE6YXVkaW9cXC8oW147LF0rKTsvaS5leGVjKHUpLHJ8fChyPS9cXC4oW14uXSspJC8uZXhlYyh1LnNwbGl0KFwiP1wiLDEpWzBdKSksciYmKHI9clsxXS50b0xvd2VyQ2FzZSgpKSksYS5jb2RlY3Mocikpe249ZS5fc3JjW29dO2JyZWFrfX1yZXR1cm4gbj8oZS5fc3JjPW4sXCJodHRwczpcIj09PXdpbmRvdy5sb2NhdGlvbi5wcm90b2NvbCYmXCJodHRwOlwiPT09bi5zbGljZSgwLDUpJiYoZS5faHRtbDU9ITAsZS5fd2ViQXVkaW89ITEpLG5ldyBfKGUpLGUuX3dlYkF1ZGlvJiZsKGUpLGUpOnZvaWQgZS5fZW1pdChcImxvYWRlcnJvclwiLG51bGwsXCJObyBjb2RlYyBzdXBwb3J0IGZvciBzZWxlY3RlZCBhdWRpbyBzb3VyY2VzLlwiKX0scGxheTpmdW5jdGlvbihlKXt2YXIgbz10aGlzLHQ9YXJndW1lbnRzLHI9bnVsbDtpZihcIm51bWJlclwiPT10eXBlb2YgZSlyPWUsZT1udWxsO2Vsc2UgaWYoXCJ1bmRlZmluZWRcIj09dHlwZW9mIGUpe2U9XCJfX2RlZmF1bHRcIjtmb3IodmFyIGQ9MCxpPTA7aTxvLl9zb3VuZHMubGVuZ3RoO2krKylvLl9zb3VuZHNbaV0uX3BhdXNlZCYmIW8uX3NvdW5kc1tpXS5fZW5kZWQmJihkKysscj1vLl9zb3VuZHNbaV0uX2lkKTsxPT09ZD9lPW51bGw6cj1udWxsfXZhciBfPXI/by5fc291bmRCeUlkKHIpOm8uX2luYWN0aXZlU291bmQoKTtpZighXylyZXR1cm4gbnVsbDtpZihyJiYhZSYmKGU9Xy5fc3ByaXRlfHxcIl9fZGVmYXVsdFwiKSwhby5fbG9hZGVkJiYhby5fc3ByaXRlW2VdKXJldHVybiBvLl9xdWV1ZS5wdXNoKHtldmVudDpcInBsYXlcIixhY3Rpb246ZnVuY3Rpb24oKXtvLnBsYXkoby5fc291bmRCeUlkKF8uX2lkKT9fLl9pZDp2b2lkIDApfX0pLF8uX2lkO2lmKHImJiFfLl9wYXVzZWQpcmV0dXJuIF8uX2lkO28uX3dlYkF1ZGlvJiZhLl9hdXRvUmVzdW1lKCk7dmFyIHM9Xy5fc2Vlaz4wP18uX3NlZWs6by5fc3ByaXRlW2VdWzBdLzFlMyxsPShvLl9zcHJpdGVbZV1bMF0rby5fc3ByaXRlW2VdWzFdKS8xZTMtcyxmPTFlMypsL01hdGguYWJzKF8uX3JhdGUpO2YhPT0xLzAmJihvLl9lbmRUaW1lcnNbXy5faWRdPXNldFRpbWVvdXQoby5fZW5kZWQuYmluZChvLF8pLGYpKSxfLl9wYXVzZWQ9ITEsXy5fZW5kZWQ9ITEsXy5fc3ByaXRlPWUsXy5fc2Vlaz1zLF8uX3N0YXJ0PW8uX3Nwcml0ZVtlXVswXS8xZTMsXy5fc3RvcD0oby5fc3ByaXRlW2VdWzBdK28uX3Nwcml0ZVtlXVsxXSkvMWUzLF8uX2xvb3A9ISghXy5fbG9vcCYmIW8uX3Nwcml0ZVtlXVsyXSk7dmFyIGM9Xy5fbm9kZTtpZihvLl93ZWJBdWRpbyl7dmFyIHA9ZnVuY3Rpb24oKXtvLl9yZWZyZXNoQnVmZmVyKF8pO3ZhciBlPV8uX211dGVkfHxvLl9tdXRlZD8wOl8uX3ZvbHVtZSphLnZvbHVtZSgpO2MuZ2Fpbi5zZXRWYWx1ZUF0VGltZShlLG4uY3VycmVudFRpbWUpLF8uX3BsYXlTdGFydD1uLmN1cnJlbnRUaW1lLFwidW5kZWZpbmVkXCI9PXR5cGVvZiBjLmJ1ZmZlclNvdXJjZS5zdGFydD9fLl9sb29wP2MuYnVmZmVyU291cmNlLm5vdGVHcmFpbk9uKDAscyw4NjQwMCk6Yy5idWZmZXJTb3VyY2Uubm90ZUdyYWluT24oMCxzLGwpOl8uX2xvb3A/Yy5idWZmZXJTb3VyY2Uuc3RhcnQoMCxzLDg2NDAwKTpjLmJ1ZmZlclNvdXJjZS5zdGFydCgwLHMsbCksby5fZW5kVGltZXJzW18uX2lkXXx8Zj09PTEvMHx8KG8uX2VuZFRpbWVyc1tfLl9pZF09c2V0VGltZW91dChvLl9lbmRlZC5iaW5kKG8sXyksZikpLHRbMV18fHNldFRpbWVvdXQoZnVuY3Rpb24oKXtvLl9lbWl0KFwicGxheVwiLF8uX2lkKX0sMCl9O28uX2xvYWRlZD9wKCk6KG8ub25jZShcImxvYWRcIixwLF8uX2lkKSxvLl9jbGVhclRpbWVyKF8uX2lkKSl9ZWxzZXt2YXIgbT1mdW5jdGlvbigpe2MuY3VycmVudFRpbWU9cyxjLm11dGVkPV8uX211dGVkfHxvLl9tdXRlZHx8YS5fbXV0ZWR8fGMubXV0ZWQsYy52b2x1bWU9Xy5fdm9sdW1lKmEudm9sdW1lKCksYy5wbGF5YmFja1JhdGU9Xy5fcmF0ZSxzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7Yy5wbGF5KCksdFsxXXx8by5fZW1pdChcInBsYXlcIixfLl9pZCl9LDApfTtpZig0PT09Yy5yZWFkeVN0YXRlfHwhYy5yZWFkeVN0YXRlJiZuYXZpZ2F0b3IuaXNDb2Nvb25KUyltKCk7ZWxzZXt2YXIgdj1mdW5jdGlvbigpe2YhPT0xLzAmJihvLl9lbmRUaW1lcnNbXy5faWRdPXNldFRpbWVvdXQoby5fZW5kZWQuYmluZChvLF8pLGYpKSxtKCksYy5yZW1vdmVFdmVudExpc3RlbmVyKHUsdiwhMSl9O2MuYWRkRXZlbnRMaXN0ZW5lcih1LHYsITEpLG8uX2NsZWFyVGltZXIoXy5faWQpfX1yZXR1cm4gXy5faWR9LHBhdXNlOmZ1bmN0aW9uKGUpe3ZhciBuPXRoaXM7aWYoIW4uX2xvYWRlZClyZXR1cm4gbi5fcXVldWUucHVzaCh7ZXZlbnQ6XCJwYXVzZVwiLGFjdGlvbjpmdW5jdGlvbigpe24ucGF1c2UoZSl9fSksbjtmb3IodmFyIG89bi5fZ2V0U291bmRJZHMoZSksdD0wO3Q8by5sZW5ndGg7dCsrKXtuLl9jbGVhclRpbWVyKG9bdF0pO3ZhciByPW4uX3NvdW5kQnlJZChvW3RdKTtpZihyJiYhci5fcGF1c2VkKXtpZihyLl9zZWVrPW4uc2VlayhvW3RdKSxyLl9wYXVzZWQ9ITAsbi5fc3RvcEZhZGUob1t0XSksci5fbm9kZSlpZihuLl93ZWJBdWRpbyl7aWYoIXIuX25vZGUuYnVmZmVyU291cmNlKXJldHVybiBuO1widW5kZWZpbmVkXCI9PXR5cGVvZiByLl9ub2RlLmJ1ZmZlclNvdXJjZS5zdG9wP3IuX25vZGUuYnVmZmVyU291cmNlLm5vdGVPZmYoMCk6ci5fbm9kZS5idWZmZXJTb3VyY2Uuc3RvcCgwKSxyLl9ub2RlLmJ1ZmZlclNvdXJjZT1udWxsfWVsc2UgaXNOYU4oci5fbm9kZS5kdXJhdGlvbikmJnIuX25vZGUuZHVyYXRpb24hPT0xLzB8fHIuX25vZGUucGF1c2UoKTthcmd1bWVudHNbMV18fG4uX2VtaXQoXCJwYXVzZVwiLHIuX2lkKX19cmV0dXJuIG59LHN0b3A6ZnVuY3Rpb24oZSl7dmFyIG49dGhpcztpZighbi5fbG9hZGVkKXJldHVyblwidW5kZWZpbmVkXCIhPXR5cGVvZiBuLl9zb3VuZHNbMF0uX3Nwcml0ZSYmbi5fcXVldWUucHVzaCh7ZXZlbnQ6XCJzdG9wXCIsYWN0aW9uOmZ1bmN0aW9uKCl7bi5zdG9wKGUpfX0pLG47Zm9yKHZhciBvPW4uX2dldFNvdW5kSWRzKGUpLHQ9MDt0PG8ubGVuZ3RoO3QrKyl7bi5fY2xlYXJUaW1lcihvW3RdKTt2YXIgcj1uLl9zb3VuZEJ5SWQob1t0XSk7aWYociYmIXIuX3BhdXNlZCl7aWYoci5fc2Vlaz1yLl9zdGFydHx8MCxyLl9wYXVzZWQ9ITAsci5fZW5kZWQ9ITAsbi5fc3RvcEZhZGUob1t0XSksci5fbm9kZSlpZihuLl93ZWJBdWRpbyl7aWYoIXIuX25vZGUuYnVmZmVyU291cmNlKXJldHVybiBuO1widW5kZWZpbmVkXCI9PXR5cGVvZiByLl9ub2RlLmJ1ZmZlclNvdXJjZS5zdG9wP3IuX25vZGUuYnVmZmVyU291cmNlLm5vdGVPZmYoMCk6ci5fbm9kZS5idWZmZXJTb3VyY2Uuc3RvcCgwKSxyLl9ub2RlLmJ1ZmZlclNvdXJjZT1udWxsfWVsc2UgaXNOYU4oci5fbm9kZS5kdXJhdGlvbikmJnIuX25vZGUuZHVyYXRpb24hPT0xLzB8fChyLl9ub2RlLnBhdXNlKCksci5fbm9kZS5jdXJyZW50VGltZT1yLl9zdGFydHx8MCk7bi5fZW1pdChcInN0b3BcIixyLl9pZCl9fXJldHVybiBufSxtdXRlOmZ1bmN0aW9uKGUsbyl7dmFyIHQ9dGhpcztpZighdC5fbG9hZGVkKXJldHVybiB0Ll9xdWV1ZS5wdXNoKHtldmVudDpcIm11dGVcIixhY3Rpb246ZnVuY3Rpb24oKXt0Lm11dGUoZSxvKX19KSx0O2lmKFwidW5kZWZpbmVkXCI9PXR5cGVvZiBvKXtpZihcImJvb2xlYW5cIiE9dHlwZW9mIGUpcmV0dXJuIHQuX211dGVkO3QuX211dGVkPWV9Zm9yKHZhciByPXQuX2dldFNvdW5kSWRzKG8pLHU9MDt1PHIubGVuZ3RoO3UrKyl7dmFyIGQ9dC5fc291bmRCeUlkKHJbdV0pO2QmJihkLl9tdXRlZD1lLHQuX3dlYkF1ZGlvJiZkLl9ub2RlP2QuX25vZGUuZ2Fpbi5zZXRWYWx1ZUF0VGltZShlPzA6ZC5fdm9sdW1lKmEudm9sdW1lKCksbi5jdXJyZW50VGltZSk6ZC5fbm9kZSYmKGQuX25vZGUubXV0ZWQ9YS5fbXV0ZWQ/ITA6ZSksdC5fZW1pdChcIm11dGVcIixkLl9pZCkpfXJldHVybiB0fSx2b2x1bWU6ZnVuY3Rpb24oKXt2YXIgZSxvLHQ9dGhpcyxyPWFyZ3VtZW50cztpZigwPT09ci5sZW5ndGgpcmV0dXJuIHQuX3ZvbHVtZTtpZigxPT09ci5sZW5ndGgpe3ZhciB1PXQuX2dldFNvdW5kSWRzKCksZD11LmluZGV4T2YoclswXSk7ZD49MD9vPXBhcnNlSW50KHJbMF0sMTApOmU9cGFyc2VGbG9hdChyWzBdKX1lbHNlIHIubGVuZ3RoPj0yJiYoZT1wYXJzZUZsb2F0KHJbMF0pLG89cGFyc2VJbnQoclsxXSwxMCkpO3ZhciBpO2lmKCEoXCJ1bmRlZmluZWRcIiE9dHlwZW9mIGUmJmU+PTAmJjE+PWUpKXJldHVybiBpPW8/dC5fc291bmRCeUlkKG8pOnQuX3NvdW5kc1swXSxpP2kuX3ZvbHVtZTowO2lmKCF0Ll9sb2FkZWQpcmV0dXJuIHQuX3F1ZXVlLnB1c2goe2V2ZW50Olwidm9sdW1lXCIsYWN0aW9uOmZ1bmN0aW9uKCl7dC52b2x1bWUuYXBwbHkodCxyKX19KSx0O1widW5kZWZpbmVkXCI9PXR5cGVvZiBvJiYodC5fdm9sdW1lPWUpLG89dC5fZ2V0U291bmRJZHMobyk7Zm9yKHZhciBfPTA7XzxvLmxlbmd0aDtfKyspaT10Ll9zb3VuZEJ5SWQob1tfXSksaSYmKGkuX3ZvbHVtZT1lLHJbMl18fHQuX3N0b3BGYWRlKG9bX10pLHQuX3dlYkF1ZGlvJiZpLl9ub2RlJiYhaS5fbXV0ZWQ/aS5fbm9kZS5nYWluLnNldFZhbHVlQXRUaW1lKGUqYS52b2x1bWUoKSxuLmN1cnJlbnRUaW1lKTppLl9ub2RlJiYhaS5fbXV0ZWQmJihpLl9ub2RlLnZvbHVtZT1lKmEudm9sdW1lKCkpLHQuX2VtaXQoXCJ2b2x1bWVcIixpLl9pZCkpO3JldHVybiB0fSxmYWRlOmZ1bmN0aW9uKGUsbyx0LHIpe3ZhciB1PXRoaXM7aWYoIXUuX2xvYWRlZClyZXR1cm4gdS5fcXVldWUucHVzaCh7ZXZlbnQ6XCJmYWRlXCIsYWN0aW9uOmZ1bmN0aW9uKCl7dS5mYWRlKGUsbyx0LHIpfX0pLHU7dS52b2x1bWUoZSxyKTtmb3IodmFyIGQ9dS5fZ2V0U291bmRJZHMociksYT0wO2E8ZC5sZW5ndGg7YSsrKXt2YXIgaT11Ll9zb3VuZEJ5SWQoZFthXSk7aWYoaSlpZihyfHx1Ll9zdG9wRmFkZShkW2FdKSx1Ll93ZWJBdWRpbyYmIWkuX211dGVkKXt2YXIgXz1uLmN1cnJlbnRUaW1lLHM9Xyt0LzFlMztpLl92b2x1bWU9ZSxpLl9ub2RlLmdhaW4uc2V0VmFsdWVBdFRpbWUoZSxfKSxpLl9ub2RlLmdhaW4ubGluZWFyUmFtcFRvVmFsdWVBdFRpbWUobyxzKSxpLl90aW1lb3V0PXNldFRpbWVvdXQoZnVuY3Rpb24oZSx0KXtkZWxldGUgdC5fdGltZW91dCxzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7dC5fdm9sdW1lPW8sdS5fZW1pdChcImZhZGVcIixlKX0scy1uLmN1cnJlbnRUaW1lPjA/TWF0aC5jZWlsKDFlMyoocy1uLmN1cnJlbnRUaW1lKSk6MCl9LmJpbmQodSxkW2FdLGkpLHQpfWVsc2V7dmFyIGw9TWF0aC5hYnMoZS1vKSxmPWU+bz9cIm91dFwiOlwiaW5cIixjPWwvLjAxLHA9dC9jOyFmdW5jdGlvbigpe3ZhciBuPWU7aS5faW50ZXJ2YWw9c2V0SW50ZXJ2YWwoZnVuY3Rpb24oZSx0KXtuKz1cImluXCI9PT1mPy4wMTotLjAxLG49TWF0aC5tYXgoMCxuKSxuPU1hdGgubWluKDEsbiksbj1NYXRoLnJvdW5kKDEwMCpuKS8xMDAsdS52b2x1bWUobixlLCEwKSxuPT09byYmKGNsZWFySW50ZXJ2YWwodC5faW50ZXJ2YWwpLGRlbGV0ZSB0Ll9pbnRlcnZhbCx1Ll9lbWl0KFwiZmFkZVwiLGUpKX0uYmluZCh1LGRbYV0saSkscCl9KCl9fXJldHVybiB1fSxfc3RvcEZhZGU6ZnVuY3Rpb24oZSl7dmFyIG89dGhpcyx0PW8uX3NvdW5kQnlJZChlKTtyZXR1cm4gdC5faW50ZXJ2YWw/KGNsZWFySW50ZXJ2YWwodC5faW50ZXJ2YWwpLGRlbGV0ZSB0Ll9pbnRlcnZhbCxvLl9lbWl0KFwiZmFkZVwiLGUpKTp0Ll90aW1lb3V0JiYoY2xlYXJUaW1lb3V0KHQuX3RpbWVvdXQpLGRlbGV0ZSB0Ll90aW1lb3V0LHQuX25vZGUuZ2Fpbi5jYW5jZWxTY2hlZHVsZWRWYWx1ZXMobi5jdXJyZW50VGltZSksby5fZW1pdChcImZhZGVcIixlKSksb30sbG9vcDpmdW5jdGlvbigpe3ZhciBlLG4sbyx0PXRoaXMscj1hcmd1bWVudHM7aWYoMD09PXIubGVuZ3RoKXJldHVybiB0Ll9sb29wO2lmKDE9PT1yLmxlbmd0aCl7aWYoXCJib29sZWFuXCIhPXR5cGVvZiByWzBdKXJldHVybiBvPXQuX3NvdW5kQnlJZChwYXJzZUludChyWzBdLDEwKSksbz9vLl9sb29wOiExO2U9clswXSx0Ll9sb29wPWV9ZWxzZSAyPT09ci5sZW5ndGgmJihlPXJbMF0sbj1wYXJzZUludChyWzFdLDEwKSk7Zm9yKHZhciB1PXQuX2dldFNvdW5kSWRzKG4pLGQ9MDtkPHUubGVuZ3RoO2QrKylvPXQuX3NvdW5kQnlJZCh1W2RdKSxvJiYoby5fbG9vcD1lLHQuX3dlYkF1ZGlvJiZvLl9ub2RlJiZvLl9ub2RlLmJ1ZmZlclNvdXJjZSYmKG8uX25vZGUuYnVmZmVyU291cmNlLmxvb3A9ZSkpO3JldHVybiB0fSxyYXRlOmZ1bmN0aW9uKCl7dmFyIGUsbixvPXRoaXMsdD1hcmd1bWVudHM7aWYoMD09PXQubGVuZ3RoKW49by5fc291bmRzWzBdLl9pZDtlbHNlIGlmKDE9PT10Lmxlbmd0aCl7dmFyIHI9by5fZ2V0U291bmRJZHMoKSx1PXIuaW5kZXhPZih0WzBdKTt1Pj0wP249cGFyc2VJbnQodFswXSwxMCk6ZT1wYXJzZUZsb2F0KHRbMF0pfWVsc2UgMj09PXQubGVuZ3RoJiYoZT1wYXJzZUZsb2F0KHRbMF0pLG49cGFyc2VJbnQodFsxXSwxMCkpO3ZhciBkO2lmKFwibnVtYmVyXCIhPXR5cGVvZiBlKXJldHVybiBkPW8uX3NvdW5kQnlJZChuKSxkP2QuX3JhdGU6by5fcmF0ZTtpZighby5fbG9hZGVkKXJldHVybiBvLl9xdWV1ZS5wdXNoKHtldmVudDpcInJhdGVcIixhY3Rpb246ZnVuY3Rpb24oKXtvLnJhdGUuYXBwbHkobyx0KX19KSxvO1widW5kZWZpbmVkXCI9PXR5cGVvZiBuJiYoby5fcmF0ZT1lKSxuPW8uX2dldFNvdW5kSWRzKG4pO2Zvcih2YXIgYT0wO2E8bi5sZW5ndGg7YSsrKWlmKGQ9by5fc291bmRCeUlkKG5bYV0pKXtkLl9yYXRlPWUsby5fd2ViQXVkaW8mJmQuX25vZGUmJmQuX25vZGUuYnVmZmVyU291cmNlP2QuX25vZGUuYnVmZmVyU291cmNlLnBsYXliYWNrUmF0ZS52YWx1ZT1lOmQuX25vZGUmJihkLl9ub2RlLnBsYXliYWNrUmF0ZT1lKTt2YXIgaT1vLnNlZWsoblthXSksXz0oby5fc3ByaXRlW2QuX3Nwcml0ZV1bMF0rby5fc3ByaXRlW2QuX3Nwcml0ZV1bMV0pLzFlMy1pLHM9MWUzKl8vTWF0aC5hYnMoZC5fcmF0ZSk7by5fY2xlYXJUaW1lcihuW2FdKSxvLl9lbmRUaW1lcnNbblthXV09c2V0VGltZW91dChvLl9lbmRlZC5iaW5kKG8sZCkscyksby5fZW1pdChcInJhdGVcIixkLl9pZCl9cmV0dXJuIG99LHNlZWs6ZnVuY3Rpb24oKXt2YXIgZSxvLHQ9dGhpcyxyPWFyZ3VtZW50cztpZigwPT09ci5sZW5ndGgpbz10Ll9zb3VuZHNbMF0uX2lkO2Vsc2UgaWYoMT09PXIubGVuZ3RoKXt2YXIgdT10Ll9nZXRTb3VuZElkcygpLGQ9dS5pbmRleE9mKHJbMF0pO2Q+PTA/bz1wYXJzZUludChyWzBdLDEwKToobz10Ll9zb3VuZHNbMF0uX2lkLGU9cGFyc2VGbG9hdChyWzBdKSl9ZWxzZSAyPT09ci5sZW5ndGgmJihlPXBhcnNlRmxvYXQoclswXSksbz1wYXJzZUludChyWzFdLDEwKSk7aWYoXCJ1bmRlZmluZWRcIj09dHlwZW9mIG8pcmV0dXJuIHQ7aWYoIXQuX2xvYWRlZClyZXR1cm4gdC5fcXVldWUucHVzaCh7ZXZlbnQ6XCJzZWVrXCIsYWN0aW9uOmZ1bmN0aW9uKCl7dC5zZWVrLmFwcGx5KHQscil9fSksdDt2YXIgYT10Ll9zb3VuZEJ5SWQobyk7aWYoYSl7aWYoIShlPj0wKSlyZXR1cm4gdC5fd2ViQXVkaW8/YS5fc2VlaysodC5wbGF5aW5nKG8pP24uY3VycmVudFRpbWUtYS5fcGxheVN0YXJ0OjApOmEuX25vZGUuY3VycmVudFRpbWU7dmFyIGk9dC5wbGF5aW5nKG8pO2kmJnQucGF1c2UobywhMCksYS5fc2Vlaz1lLHQuX2NsZWFyVGltZXIobyksaSYmdC5wbGF5KG8sITApLHQuX2VtaXQoXCJzZWVrXCIsbyl9cmV0dXJuIHR9LHBsYXlpbmc6ZnVuY3Rpb24oZSl7dmFyIG49dGhpcyxvPW4uX3NvdW5kQnlJZChlKXx8bi5fc291bmRzWzBdO3JldHVybiBvPyFvLl9wYXVzZWQ6ITF9LGR1cmF0aW9uOmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuX2R1cmF0aW9ufSx1bmxvYWQ6ZnVuY3Rpb24oKXtmb3IodmFyIGU9dGhpcyxuPWUuX3NvdW5kcyxvPTA7bzxuLmxlbmd0aDtvKyspe25bb10uX3BhdXNlZHx8KGUuc3RvcChuW29dLl9pZCksZS5fZW1pdChcImVuZFwiLG5bb10uX2lkKSksZS5fd2ViQXVkaW98fChuW29dLl9ub2RlLnNyYz1cIlwiLG5bb10uX25vZGUucmVtb3ZlRXZlbnRMaXN0ZW5lcihcImVycm9yXCIsbltvXS5fZXJyb3JGbiwhMSksbltvXS5fbm9kZS5yZW1vdmVFdmVudExpc3RlbmVyKHUsbltvXS5fbG9hZEZuLCExKSksZGVsZXRlIG5bb10uX25vZGUsZS5fY2xlYXJUaW1lcihuW29dLl9pZCk7dmFyIHQ9YS5faG93bHMuaW5kZXhPZihlKTt0Pj0wJiZhLl9ob3dscy5zcGxpY2UodCwxKX1yZXR1cm4gcyYmZGVsZXRlIHNbZS5fc3JjXSxlLl9zb3VuZHM9W10sZT1udWxsLG51bGx9LG9uOmZ1bmN0aW9uKGUsbixvLHQpe3ZhciByPXRoaXMsdT1yW1wiX29uXCIrZV07cmV0dXJuXCJmdW5jdGlvblwiPT10eXBlb2YgbiYmdS5wdXNoKHQ/e2lkOm8sZm46bixvbmNlOnR9OntpZDpvLGZuOm59KSxyfSxvZmY6ZnVuY3Rpb24oZSxuLG8pe3ZhciB0PXRoaXMscj10W1wiX29uXCIrZV07aWYobil7Zm9yKHZhciB1PTA7dTxyLmxlbmd0aDt1KyspaWYobj09PXJbdV0uZm4mJm89PT1yW3VdLmlkKXtyLnNwbGljZSh1LDEpO2JyZWFrfX1lbHNlIGlmKGUpdFtcIl9vblwiK2VdPVtdO2Vsc2UgZm9yKHZhciBkPU9iamVjdC5rZXlzKHQpLHU9MDt1PGQubGVuZ3RoO3UrKykwPT09ZFt1XS5pbmRleE9mKFwiX29uXCIpJiZBcnJheS5pc0FycmF5KHRbZFt1XV0pJiYodFtkW3VdXT1bXSk7cmV0dXJuIHR9LG9uY2U6ZnVuY3Rpb24oZSxuLG8pe3ZhciB0PXRoaXM7cmV0dXJuIHQub24oZSxuLG8sMSksdH0sX2VtaXQ6ZnVuY3Rpb24oZSxuLG8pe2Zvcih2YXIgdD10aGlzLHI9dFtcIl9vblwiK2VdLHU9ci5sZW5ndGgtMTt1Pj0wO3UtLSlyW3VdLmlkJiZyW3VdLmlkIT09biYmXCJsb2FkXCIhPT1lfHwoc2V0VGltZW91dChmdW5jdGlvbihlKXtlLmNhbGwodGhpcyxuLG8pfS5iaW5kKHQsclt1XS5mbiksMCksclt1XS5vbmNlJiZ0Lm9mZihlLHJbdV0uZm4sclt1XS5pZCkpO3JldHVybiB0fSxfbG9hZFF1ZXVlOmZ1bmN0aW9uKCl7dmFyIGU9dGhpcztpZihlLl9xdWV1ZS5sZW5ndGg+MCl7dmFyIG49ZS5fcXVldWVbMF07ZS5vbmNlKG4uZXZlbnQsZnVuY3Rpb24oKXtlLl9xdWV1ZS5zaGlmdCgpLGUuX2xvYWRRdWV1ZSgpfSksbi5hY3Rpb24oKX1yZXR1cm4gZX0sX2VuZGVkOmZ1bmN0aW9uKGUpe3ZhciBvPXRoaXMsdD1lLl9zcHJpdGUscj0hKCFlLl9sb29wJiYhby5fc3ByaXRlW3RdWzJdKTtpZihvLl9lbWl0KFwiZW5kXCIsZS5faWQpLCFvLl93ZWJBdWRpbyYmciYmby5zdG9wKGUuX2lkKS5wbGF5KGUuX2lkKSxvLl93ZWJBdWRpbyYmcil7by5fZW1pdChcInBsYXlcIixlLl9pZCksZS5fc2Vlaz1lLl9zdGFydHx8MCxlLl9wbGF5U3RhcnQ9bi5jdXJyZW50VGltZTt2YXIgdT0xZTMqKGUuX3N0b3AtZS5fc3RhcnQpL01hdGguYWJzKGUuX3JhdGUpO28uX2VuZFRpbWVyc1tlLl9pZF09c2V0VGltZW91dChvLl9lbmRlZC5iaW5kKG8sZSksdSl9cmV0dXJuIG8uX3dlYkF1ZGlvJiYhciYmKGUuX3BhdXNlZD0hMCxlLl9lbmRlZD0hMCxlLl9zZWVrPWUuX3N0YXJ0fHwwLG8uX2NsZWFyVGltZXIoZS5faWQpLGUuX25vZGUuYnVmZmVyU291cmNlPW51bGwsYS5fYXV0b1N1c3BlbmQoKSksby5fd2ViQXVkaW98fHJ8fG8uc3RvcChlLl9pZCksb30sX2NsZWFyVGltZXI6ZnVuY3Rpb24oZSl7dmFyIG49dGhpcztyZXR1cm4gbi5fZW5kVGltZXJzW2VdJiYoY2xlYXJUaW1lb3V0KG4uX2VuZFRpbWVyc1tlXSksZGVsZXRlIG4uX2VuZFRpbWVyc1tlXSksbn0sX3NvdW5kQnlJZDpmdW5jdGlvbihlKXtmb3IodmFyIG49dGhpcyxvPTA7bzxuLl9zb3VuZHMubGVuZ3RoO28rKylpZihlPT09bi5fc291bmRzW29dLl9pZClyZXR1cm4gbi5fc291bmRzW29dO3JldHVybiBudWxsfSxfaW5hY3RpdmVTb3VuZDpmdW5jdGlvbigpe3ZhciBlPXRoaXM7ZS5fZHJhaW4oKTtmb3IodmFyIG49MDtuPGUuX3NvdW5kcy5sZW5ndGg7bisrKWlmKGUuX3NvdW5kc1tuXS5fZW5kZWQpcmV0dXJuIGUuX3NvdW5kc1tuXS5yZXNldCgpO3JldHVybiBuZXcgXyhlKX0sX2RyYWluOmZ1bmN0aW9uKCl7dmFyIGU9dGhpcyxuPWUuX3Bvb2wsbz0wLHQ9MDtpZighKGUuX3NvdW5kcy5sZW5ndGg8bikpe2Zvcih0PTA7dDxlLl9zb3VuZHMubGVuZ3RoO3QrKyllLl9zb3VuZHNbdF0uX2VuZGVkJiZvKys7Zm9yKHQ9ZS5fc291bmRzLmxlbmd0aC0xO3Q+PTA7dC0tKXtpZihuPj1vKXJldHVybjtlLl9zb3VuZHNbdF0uX2VuZGVkJiYoZS5fd2ViQXVkaW8mJmUuX3NvdW5kc1t0XS5fbm9kZSYmZS5fc291bmRzW3RdLl9ub2RlLmRpc2Nvbm5lY3QoMCksZS5fc291bmRzLnNwbGljZSh0LDEpLG8tLSl9fX0sX2dldFNvdW5kSWRzOmZ1bmN0aW9uKGUpe3ZhciBuPXRoaXM7aWYoXCJ1bmRlZmluZWRcIj09dHlwZW9mIGUpe2Zvcih2YXIgbz1bXSx0PTA7dDxuLl9zb3VuZHMubGVuZ3RoO3QrKylvLnB1c2gobi5fc291bmRzW3RdLl9pZCk7cmV0dXJuIG99cmV0dXJuW2VdfSxfcmVmcmVzaEJ1ZmZlcjpmdW5jdGlvbihlKXt2YXIgbz10aGlzO3JldHVybiBlLl9ub2RlLmJ1ZmZlclNvdXJjZT1uLmNyZWF0ZUJ1ZmZlclNvdXJjZSgpLGUuX25vZGUuYnVmZmVyU291cmNlLmJ1ZmZlcj1zW28uX3NyY10sZS5fbm9kZS5idWZmZXJTb3VyY2UuY29ubmVjdChlLl9wYW5uZXI/ZS5fcGFubmVyOmUuX25vZGUpLGUuX25vZGUuYnVmZmVyU291cmNlLmxvb3A9ZS5fbG9vcCxlLl9sb29wJiYoZS5fbm9kZS5idWZmZXJTb3VyY2UubG9vcFN0YXJ0PWUuX3N0YXJ0fHwwLGUuX25vZGUuYnVmZmVyU291cmNlLmxvb3BFbmQ9ZS5fc3RvcCksZS5fbm9kZS5idWZmZXJTb3VyY2UucGxheWJhY2tSYXRlLnZhbHVlPW8uX3JhdGUsb319O3ZhciBfPWZ1bmN0aW9uKGUpe3RoaXMuX3BhcmVudD1lLHRoaXMuaW5pdCgpfTtpZihfLnByb3RvdHlwZT17aW5pdDpmdW5jdGlvbigpe3ZhciBlPXRoaXMsbj1lLl9wYXJlbnQ7cmV0dXJuIGUuX211dGVkPW4uX211dGVkLGUuX2xvb3A9bi5fbG9vcCxlLl92b2x1bWU9bi5fdm9sdW1lLGUuX211dGVkPW4uX211dGVkLGUuX3JhdGU9bi5fcmF0ZSxlLl9zZWVrPTAsZS5fcGF1c2VkPSEwLGUuX2VuZGVkPSEwLGUuX3Nwcml0ZT1cIl9fZGVmYXVsdFwiLGUuX2lkPU1hdGgucm91bmQoRGF0ZS5ub3coKSpNYXRoLnJhbmRvbSgpKSxuLl9zb3VuZHMucHVzaChlKSxlLmNyZWF0ZSgpLGV9LGNyZWF0ZTpmdW5jdGlvbigpe3ZhciBlPXRoaXMsbz1lLl9wYXJlbnQsdD1hLl9tdXRlZHx8ZS5fbXV0ZWR8fGUuX3BhcmVudC5fbXV0ZWQ/MDplLl92b2x1bWUqYS52b2x1bWUoKTtyZXR1cm4gby5fd2ViQXVkaW8/KGUuX25vZGU9XCJ1bmRlZmluZWRcIj09dHlwZW9mIG4uY3JlYXRlR2Fpbj9uLmNyZWF0ZUdhaW5Ob2RlKCk6bi5jcmVhdGVHYWluKCksZS5fbm9kZS5nYWluLnNldFZhbHVlQXRUaW1lKHQsbi5jdXJyZW50VGltZSksZS5fbm9kZS5wYXVzZWQ9ITAsZS5fbm9kZS5jb25uZWN0KHIpKTooZS5fbm9kZT1uZXcgQXVkaW8sZS5fZXJyb3JGbj1lLl9lcnJvckxpc3RlbmVyLmJpbmQoZSksZS5fbm9kZS5hZGRFdmVudExpc3RlbmVyKFwiZXJyb3JcIixlLl9lcnJvckZuLCExKSxlLl9sb2FkRm49ZS5fbG9hZExpc3RlbmVyLmJpbmQoZSksZS5fbm9kZS5hZGRFdmVudExpc3RlbmVyKHUsZS5fbG9hZEZuLCExKSxlLl9ub2RlLnNyYz1vLl9zcmMsZS5fbm9kZS5wcmVsb2FkPVwiYXV0b1wiLGUuX25vZGUudm9sdW1lPXQsZS5fbm9kZS5sb2FkKCkpLGV9LHJlc2V0OmZ1bmN0aW9uKCl7dmFyIGU9dGhpcyxuPWUuX3BhcmVudDtyZXR1cm4gZS5fbXV0ZWQ9bi5fbXV0ZWQsZS5fbG9vcD1uLl9sb29wLGUuX3ZvbHVtZT1uLl92b2x1bWUsZS5fbXV0ZWQ9bi5fbXV0ZWQsZS5fcmF0ZT1uLl9yYXRlLGUuX3NlZWs9MCxlLl9wYXVzZWQ9ITAsZS5fZW5kZWQ9ITAsZS5fc3ByaXRlPVwiX19kZWZhdWx0XCIsZS5faWQ9TWF0aC5yb3VuZChEYXRlLm5vdygpKk1hdGgucmFuZG9tKCkpLGV9LF9lcnJvckxpc3RlbmVyOmZ1bmN0aW9uKCl7dmFyIGU9dGhpcztlLl9ub2RlLmVycm9yJiY0PT09ZS5fbm9kZS5lcnJvci5jb2RlJiYoYS5ub0F1ZGlvPSEwKSxlLl9wYXJlbnQuX2VtaXQoXCJsb2FkZXJyb3JcIixlLl9pZCxlLl9ub2RlLmVycm9yP2UuX25vZGUuZXJyb3IuY29kZTowKSxlLl9ub2RlLnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJlcnJvclwiLGUuX2Vycm9yTGlzdGVuZXIsITEpfSxfbG9hZExpc3RlbmVyOmZ1bmN0aW9uKCl7dmFyIGU9dGhpcyxuPWUuX3BhcmVudDtuLl9kdXJhdGlvbj1NYXRoLmNlaWwoMTAqZS5fbm9kZS5kdXJhdGlvbikvMTAsMD09PU9iamVjdC5rZXlzKG4uX3Nwcml0ZSkubGVuZ3RoJiYobi5fc3ByaXRlPXtfX2RlZmF1bHQ6WzAsMWUzKm4uX2R1cmF0aW9uXX0pLG4uX2xvYWRlZHx8KG4uX2xvYWRlZD0hMCxuLl9lbWl0KFwibG9hZFwiKSxuLl9sb2FkUXVldWUoKSksbi5fYXV0b3BsYXkmJm4ucGxheSgpLGUuX25vZGUucmVtb3ZlRXZlbnRMaXN0ZW5lcih1LGUuX2xvYWRGbiwhMSl9fSxvKXZhciBzPXt9LGw9ZnVuY3Rpb24oZSl7dmFyIG49ZS5fc3JjO2lmKHNbbl0pcmV0dXJuIGUuX2R1cmF0aW9uPXNbbl0uZHVyYXRpb24sdm9pZCBwKGUpO2lmKC9eZGF0YTpbXjtdKztiYXNlNjQsLy50ZXN0KG4pKXt3aW5kb3cuYXRvYj13aW5kb3cuYXRvYnx8ZnVuY3Rpb24oZSl7Zm9yKHZhciBuLG8sdD1cIkFCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXowMTIzNDU2Nzg5Ky89XCIscj1TdHJpbmcoZSkucmVwbGFjZSgvPSskLyxcIlwiKSx1PTAsZD0wLGE9XCJcIjtvPXIuY2hhckF0KGQrKyk7fm8mJihuPXUlND82NCpuK286byx1KyslNCk/YSs9U3RyaW5nLmZyb21DaGFyQ29kZSgyNTUmbj4+KC0yKnUmNikpOjApbz10LmluZGV4T2Yobyk7cmV0dXJuIGF9O2Zvcih2YXIgbz1hdG9iKG4uc3BsaXQoXCIsXCIpWzFdKSx0PW5ldyBVaW50OEFycmF5KG8ubGVuZ3RoKSxyPTA7cjxvLmxlbmd0aDsrK3IpdFtyXT1vLmNoYXJDb2RlQXQocik7Yyh0LmJ1ZmZlcixlKX1lbHNle3ZhciB1PW5ldyBYTUxIdHRwUmVxdWVzdDt1Lm9wZW4oXCJHRVRcIixuLCEwKSx1LnJlc3BvbnNlVHlwZT1cImFycmF5YnVmZmVyXCIsdS5vbmxvYWQ9ZnVuY3Rpb24oKXtjKHUucmVzcG9uc2UsZSl9LHUub25lcnJvcj1mdW5jdGlvbigpe2UuX3dlYkF1ZGlvJiYoZS5faHRtbDU9ITAsZS5fd2ViQXVkaW89ITEsZS5fc291bmRzPVtdLGRlbGV0ZSBzW25dLGUubG9hZCgpKX0sZih1KX19LGY9ZnVuY3Rpb24oZSl7dHJ5e2Uuc2VuZCgpfWNhdGNoKG4pe2Uub25lcnJvcigpfX0sYz1mdW5jdGlvbihlLG8pe24uZGVjb2RlQXVkaW9EYXRhKGUsZnVuY3Rpb24oZSl7ZSYmby5fc291bmRzLmxlbmd0aD4wJiYoc1tvLl9zcmNdPWUscChvLGUpKX0sZnVuY3Rpb24oKXtvLl9lbWl0KFwibG9hZGVycm9yXCIsbnVsbCxcIkRlY29kaW5nIGF1ZGlvIGRhdGEgZmFpbGVkLlwiKX0pfSxwPWZ1bmN0aW9uKGUsbil7biYmIWUuX2R1cmF0aW9uJiYoZS5fZHVyYXRpb249bi5kdXJhdGlvbiksMD09PU9iamVjdC5rZXlzKGUuX3Nwcml0ZSkubGVuZ3RoJiYoZS5fc3ByaXRlPXtfX2RlZmF1bHQ6WzAsMWUzKmUuX2R1cmF0aW9uXX0pLGUuX2xvYWRlZHx8KGUuX2xvYWRlZD0hMCxlLl9lbWl0KFwibG9hZFwiKSxlLl9sb2FkUXVldWUoKSksZS5fYXV0b3BsYXkmJmUucGxheSgpfTtcImZ1bmN0aW9uXCI9PXR5cGVvZiBkZWZpbmUmJmRlZmluZS5hbWQmJmRlZmluZShbXSxmdW5jdGlvbigpe3JldHVybntIb3dsZXI6YSxIb3dsOml9fSksXCJ1bmRlZmluZWRcIiE9dHlwZW9mIGV4cG9ydHMmJihleHBvcnRzLkhvd2xlcj1hLGV4cG9ydHMuSG93bD1pKSxcInVuZGVmaW5lZFwiIT10eXBlb2Ygd2luZG93Pyh3aW5kb3cuSG93bGVyR2xvYmFsPWQsd2luZG93Lkhvd2xlcj1hLHdpbmRvdy5Ib3dsPWksd2luZG93LlNvdW5kPV8pOlwidW5kZWZpbmVkXCIhPXR5cGVvZiBnbG9iYWwmJihnbG9iYWwuSG93bGVyR2xvYmFsPWQsZ2xvYmFsLkhvd2xlcj1hLGdsb2JhbC5Ib3dsPWksZ2xvYmFsLlNvdW5kPV8pfSgpO1xuLyohIEVmZmVjdHMgUGx1Z2luICovXG4hZnVuY3Rpb24oKXtcInVzZSBzdHJpY3RcIjtIb3dsZXJHbG9iYWwucHJvdG90eXBlLl9wb3M9WzAsMCwwXSxIb3dsZXJHbG9iYWwucHJvdG90eXBlLl9vcmllbnRhdGlvbj1bMCwwLC0xLDAsMSwwXSxIb3dsZXJHbG9iYWwucHJvdG90eXBlLl92ZWxvY2l0eT1bMCwwLDBdLEhvd2xlckdsb2JhbC5wcm90b3R5cGUuX2xpc3RlbmVyQXR0cj17ZG9wcGxlckZhY3RvcjoxLHNwZWVkT2ZTb3VuZDozNDMuM30sSG93bGVyR2xvYmFsLnByb3RvdHlwZS5wb3M9ZnVuY3Rpb24oZSxuLHQpe3ZhciBvPXRoaXM7cmV0dXJuIG8uY3R4JiZvLmN0eC5saXN0ZW5lcj8obj1cIm51bWJlclwiIT10eXBlb2Ygbj9vLl9wb3NbMV06bix0PVwibnVtYmVyXCIhPXR5cGVvZiB0P28uX3Bvc1syXTp0LFwibnVtYmVyXCIhPXR5cGVvZiBlP28uX3Bvczooby5fcG9zPVtlLG4sdF0sby5jdHgubGlzdGVuZXIuc2V0UG9zaXRpb24oby5fcG9zWzBdLG8uX3Bvc1sxXSxvLl9wb3NbMl0pLG8pKTpvfSxIb3dsZXJHbG9iYWwucHJvdG90eXBlLm9yaWVudGF0aW9uPWZ1bmN0aW9uKGUsbix0LG8scixpKXt2YXIgYT10aGlzO2lmKCFhLmN0eHx8IWEuY3R4Lmxpc3RlbmVyKXJldHVybiBhO3ZhciBwPWEuX29yaWVudGF0aW9uO3JldHVybiBuPVwibnVtYmVyXCIhPXR5cGVvZiBuP3BbMV06bix0PVwibnVtYmVyXCIhPXR5cGVvZiB0P3BbMl06dCxvPVwibnVtYmVyXCIhPXR5cGVvZiBvP3BbM106byxyPVwibnVtYmVyXCIhPXR5cGVvZiByP3BbNF06cixpPVwibnVtYmVyXCIhPXR5cGVvZiBpP3BbNV06aSxcIm51bWJlclwiIT10eXBlb2YgZT9wOihhLl9vcmllbnRhdGlvbj1bZSxuLHQsbyxyLGldLGEuY3R4Lmxpc3RlbmVyLnNldE9yaWVudGF0aW9uKGUsbix0LG8scixpKSxhKX0sSG93bGVyR2xvYmFsLnByb3RvdHlwZS52ZWxvY2l0eT1mdW5jdGlvbihlLG4sdCl7dmFyIG89dGhpcztyZXR1cm4gby5jdHgmJm8uY3R4Lmxpc3RlbmVyPyhuPVwibnVtYmVyXCIhPXR5cGVvZiBuP28uX3ZlbG9jaXR5WzFdOm4sdD1cIm51bWJlclwiIT10eXBlb2YgdD9vLl92ZWxvY2l0eVsyXTp0LFwibnVtYmVyXCIhPXR5cGVvZiBlP28uX3ZlbG9jaXR5OihvLl92ZWxvY2l0eT1bZSxuLHRdLG8uY3R4Lmxpc3RlbmVyLnNldFZlbG9jaXR5KG8uX3ZlbG9jaXR5WzBdLG8uX3ZlbG9jaXR5WzFdLG8uX3ZlbG9jaXR5WzJdKSxvKSk6b30sSG93bGVyR2xvYmFsLnByb3RvdHlwZS5saXN0ZW5lckF0dHI9ZnVuY3Rpb24oZSl7dmFyIG49dGhpcztpZighbi5jdHh8fCFuLmN0eC5saXN0ZW5lcilyZXR1cm4gbjt2YXIgdD1uLl9saXN0ZW5lckF0dHI7cmV0dXJuIGU/KG4uX2xpc3RlbmVyQXR0cj17ZG9wcGxlckZhY3RvcjpcInVuZGVmaW5lZFwiIT10eXBlb2YgZS5kb3BwbGVyRmFjdG9yP2UuZG9wcGxlckZhY3Rvcjp0LmRvcHBsZXJGYWN0b3Isc3BlZWRPZlNvdW5kOlwidW5kZWZpbmVkXCIhPXR5cGVvZiBlLnNwZWVkT2ZTb3VuZD9lLnNwZWVkT2ZTb3VuZDp0LnNwZWVkT2ZTb3VuZH0sbi5jdHgubGlzdGVuZXIuZG9wcGxlckZhY3Rvcj10LmRvcHBsZXJGYWN0b3Isbi5jdHgubGlzdGVuZXIuc3BlZWRPZlNvdW5kPXQuc3BlZWRPZlNvdW5kLG4pOnR9LEhvd2wucHJvdG90eXBlLmluaXQ9ZnVuY3Rpb24oZSl7cmV0dXJuIGZ1bmN0aW9uKG4pe3ZhciB0PXRoaXM7cmV0dXJuIHQuX29yaWVudGF0aW9uPW4ub3JpZW50YXRpb258fFsxLDAsMF0sdC5fcG9zPW4ucG9zfHxudWxsLHQuX3ZlbG9jaXR5PW4udmVsb2NpdHl8fFswLDAsMF0sdC5fcGFubmVyQXR0cj17Y29uZUlubmVyQW5nbGU6XCJ1bmRlZmluZWRcIiE9dHlwZW9mIG4uY29uZUlubmVyQW5nbGU/bi5jb25lSW5uZXJBbmdsZTozNjAsY29uZU91dGVyQW5nbGU6XCJ1bmRlZmluZWRcIiE9dHlwZW9mIG4uY29uZU91dGVyQW5nbGU/bi5jb25lT3V0ZXJBbmdsZTozNjAsY29uZU91dGVyR2FpbjpcInVuZGVmaW5lZFwiIT10eXBlb2Ygbi5jb25lT3V0ZXJHYWluP24uY29uZU91dGVyR2FpbjowLGRpc3RhbmNlTW9kZWw6XCJ1bmRlZmluZWRcIiE9dHlwZW9mIG4uZGlzdGFuY2VNb2RlbD9uLmRpc3RhbmNlTW9kZWw6XCJpbnZlcnNlXCIsbWF4RGlzdGFuY2U6XCJ1bmRlZmluZWRcIiE9dHlwZW9mIG4ubWF4RGlzdGFuY2U/bi5tYXhEaXN0YW5jZToxZTQscGFubmluZ01vZGVsOlwidW5kZWZpbmVkXCIhPXR5cGVvZiBuLnBhbm5pbmdNb2RlbD9uLnBhbm5pbmdNb2RlbDpcIkhSVEZcIixyZWZEaXN0YW5jZTpcInVuZGVmaW5lZFwiIT10eXBlb2Ygbi5yZWZEaXN0YW5jZT9uLnJlZkRpc3RhbmNlOjEscm9sbG9mZkZhY3RvcjpcInVuZGVmaW5lZFwiIT10eXBlb2Ygbi5yb2xsb2ZmRmFjdG9yP24ucm9sbG9mZkZhY3RvcjoxfSxlLmNhbGwodGhpcyxuKX19KEhvd2wucHJvdG90eXBlLmluaXQpLEhvd2wucHJvdG90eXBlLnBvcz1mdW5jdGlvbihuLHQsbyxyKXt2YXIgaT10aGlzO2lmKCFpLl93ZWJBdWRpbylyZXR1cm4gaTtpZighaS5fbG9hZGVkKXJldHVybiBpLm9uY2UoXCJwbGF5XCIsZnVuY3Rpb24oKXtpLnBvcyhuLHQsbyxyKX0pLGk7aWYodD1cIm51bWJlclwiIT10eXBlb2YgdD8wOnQsbz1cIm51bWJlclwiIT10eXBlb2Ygbz8tLjU6byxcInVuZGVmaW5lZFwiPT10eXBlb2Ygcil7aWYoXCJudW1iZXJcIiE9dHlwZW9mIG4pcmV0dXJuIGkuX3BvcztpLl9wb3M9W24sdCxvXX1mb3IodmFyIGE9aS5fZ2V0U291bmRJZHMocikscD0wO3A8YS5sZW5ndGg7cCsrKXt2YXIgbD1pLl9zb3VuZEJ5SWQoYVtwXSk7aWYobCl7aWYoXCJudW1iZXJcIiE9dHlwZW9mIG4pcmV0dXJuIGwuX3BvcztsLl9wb3M9W24sdCxvXSxsLl9ub2RlJiYobC5fcGFubmVyfHxlKGwpLGwuX3Bhbm5lci5zZXRQb3NpdGlvbihuLHQsbykpfX1yZXR1cm4gaX0sSG93bC5wcm90b3R5cGUub3JpZW50YXRpb249ZnVuY3Rpb24obix0LG8scil7dmFyIGk9dGhpcztpZighaS5fd2ViQXVkaW8pcmV0dXJuIGk7aWYoIWkuX2xvYWRlZClyZXR1cm4gaS5vbmNlKFwicGxheVwiLGZ1bmN0aW9uKCl7aS5vcmllbnRhdGlvbihuLHQsbyxyKX0pLGk7aWYodD1cIm51bWJlclwiIT10eXBlb2YgdD9pLl9vcmllbnRhdGlvblsxXTp0LG89XCJudW1iZXJcIiE9dHlwZW9mIG8/aS5fb3JpZW50YXRpb25bMl06byxcInVuZGVmaW5lZFwiPT10eXBlb2Ygcil7aWYoXCJudW1iZXJcIiE9dHlwZW9mIG4pcmV0dXJuIGkuX29yaWVudGF0aW9uO2kuX29yaWVudGF0aW9uPVtuLHQsb119Zm9yKHZhciBhPWkuX2dldFNvdW5kSWRzKHIpLHA9MDtwPGEubGVuZ3RoO3ArKyl7dmFyIGw9aS5fc291bmRCeUlkKGFbcF0pO2lmKGwpe2lmKFwibnVtYmVyXCIhPXR5cGVvZiBuKXJldHVybiBsLl9vcmllbnRhdGlvbjtsLl9vcmllbnRhdGlvbj1bbix0LG9dLGwuX25vZGUmJihsLl9wYW5uZXJ8fGUobCksbC5fcGFubmVyLnNldE9yaWVudGF0aW9uKG4sdCxvKSl9fXJldHVybiBpfSxIb3dsLnByb3RvdHlwZS52ZWxvY2l0eT1mdW5jdGlvbihuLHQsbyxyKXt2YXIgaT10aGlzO2lmKCFpLl93ZWJBdWRpbylyZXR1cm4gaTtpZighaS5fbG9hZGVkKXJldHVybiBpLm9uY2UoXCJwbGF5XCIsZnVuY3Rpb24oKXtpLnZlbG9jaXR5KG4sdCxvLHIpfSksaTtpZih0PVwibnVtYmVyXCIhPXR5cGVvZiB0P2kuX3ZlbG9jaXR5WzFdOnQsbz1cIm51bWJlclwiIT10eXBlb2Ygbz9pLl92ZWxvY2l0eVsyXTpvLFwidW5kZWZpbmVkXCI9PXR5cGVvZiByKXtpZihcIm51bWJlclwiIT10eXBlb2YgbilyZXR1cm4gaS5fdmVsb2NpdHk7aS5fdmVsb2NpdHk9W24sdCxvXX1mb3IodmFyIGE9aS5fZ2V0U291bmRJZHMocikscD0wO3A8YS5sZW5ndGg7cCsrKXt2YXIgbD1pLl9zb3VuZEJ5SWQoYVtwXSk7aWYobCl7aWYoXCJudW1iZXJcIiE9dHlwZW9mIG4pcmV0dXJuIGwuX3ZlbG9jaXR5O2wuX3ZlbG9jaXR5PVtuLHQsb10sbC5fbm9kZSYmKGwuX3Bhbm5lcnx8ZShsKSxsLl9wYW5uZXIuc2V0VmVsb2NpdHkobix0LG8pKX19cmV0dXJuIGl9LEhvd2wucHJvdG90eXBlLnBhbm5lckF0dHI9ZnVuY3Rpb24oKXt2YXIgbix0LG8scj10aGlzLGk9YXJndW1lbnRzO2lmKCFyLl93ZWJBdWRpbylyZXR1cm4gcjtpZigwPT09aS5sZW5ndGgpcmV0dXJuIHIuX3Bhbm5lckF0dHI7aWYoMT09PWkubGVuZ3RoKXtpZihcIm9iamVjdFwiIT10eXBlb2YgaVswXSlyZXR1cm4gbz1yLl9zb3VuZEJ5SWQocGFyc2VJbnQoaVswXSwxMCkpLG8/by5fcGFubmVyQXR0cjpyLl9wYW5uZXJBdHRyO249aVswXSxcInVuZGVmaW5lZFwiPT10eXBlb2YgdCYmKHIuX3Bhbm5lckF0dHI9e2NvbmVJbm5lckFuZ2xlOlwidW5kZWZpbmVkXCIhPXR5cGVvZiBuLmNvbmVJbm5lckFuZ2xlP24uY29uZUlubmVyQW5nbGU6ci5fY29uZUlubmVyQW5nbGUsY29uZU91dGVyQW5nbGU6XCJ1bmRlZmluZWRcIiE9dHlwZW9mIG4uY29uZU91dGVyQW5nbGU/bi5jb25lT3V0ZXJBbmdsZTpyLl9jb25lT3V0ZXJBbmdsZSxjb25lT3V0ZXJHYWluOlwidW5kZWZpbmVkXCIhPXR5cGVvZiBuLmNvbmVPdXRlckdhaW4/bi5jb25lT3V0ZXJHYWluOnIuX2NvbmVPdXRlckdhaW4sZGlzdGFuY2VNb2RlbDpcInVuZGVmaW5lZFwiIT10eXBlb2Ygbi5kaXN0YW5jZU1vZGVsP24uZGlzdGFuY2VNb2RlbDpyLl9kaXN0YW5jZU1vZGVsLG1heERpc3RhbmNlOlwidW5kZWZpbmVkXCIhPXR5cGVvZiBuLm1heERpc3RhbmNlP24ubWF4RGlzdGFuY2U6ci5fbWF4RGlzdGFuY2UscGFubmluZ01vZGVsOlwidW5kZWZpbmVkXCIhPXR5cGVvZiBuLnBhbm5pbmdNb2RlbD9uLnBhbm5pbmdNb2RlbDpyLl9wYW5uaW5nTW9kZWwscmVmRGlzdGFuY2U6XCJ1bmRlZmluZWRcIiE9dHlwZW9mIG4ucmVmRGlzdGFuY2U/bi5yZWZEaXN0YW5jZTpyLl9yZWZEaXN0YW5jZSxyb2xsb2ZmRmFjdG9yOlwidW5kZWZpbmVkXCIhPXR5cGVvZiBuLnJvbGxvZmZGYWN0b3I/bi5yb2xsb2ZmRmFjdG9yOnIuX3JvbGxvZmZGYWN0b3J9KX1lbHNlIDI9PT1pLmxlbmd0aCYmKG49aVswXSx0PXBhcnNlSW50KGlbMV0sMTApKTtmb3IodmFyIGE9ci5fZ2V0U291bmRJZHModCkscD0wO3A8YS5sZW5ndGg7cCsrKWlmKG89ci5fc291bmRCeUlkKGFbcF0pKXt2YXIgbD1vLl9wYW5uZXJBdHRyO2w9e2NvbmVJbm5lckFuZ2xlOlwidW5kZWZpbmVkXCIhPXR5cGVvZiBuLmNvbmVJbm5lckFuZ2xlP24uY29uZUlubmVyQW5nbGU6bC5jb25lSW5uZXJBbmdsZSxjb25lT3V0ZXJBbmdsZTpcInVuZGVmaW5lZFwiIT10eXBlb2Ygbi5jb25lT3V0ZXJBbmdsZT9uLmNvbmVPdXRlckFuZ2xlOmwuY29uZU91dGVyQW5nbGUsY29uZU91dGVyR2FpbjpcInVuZGVmaW5lZFwiIT10eXBlb2Ygbi5jb25lT3V0ZXJHYWluP24uY29uZU91dGVyR2FpbjpsLmNvbmVPdXRlckdhaW4sZGlzdGFuY2VNb2RlbDpcInVuZGVmaW5lZFwiIT10eXBlb2Ygbi5kaXN0YW5jZU1vZGVsP24uZGlzdGFuY2VNb2RlbDpsLmRpc3RhbmNlTW9kZWwsbWF4RGlzdGFuY2U6XCJ1bmRlZmluZWRcIiE9dHlwZW9mIG4ubWF4RGlzdGFuY2U/bi5tYXhEaXN0YW5jZTpsLm1heERpc3RhbmNlLHBhbm5pbmdNb2RlbDpcInVuZGVmaW5lZFwiIT10eXBlb2Ygbi5wYW5uaW5nTW9kZWw/bi5wYW5uaW5nTW9kZWw6bC5wYW5uaW5nTW9kZWwscmVmRGlzdGFuY2U6XCJ1bmRlZmluZWRcIiE9dHlwZW9mIG4ucmVmRGlzdGFuY2U/bi5yZWZEaXN0YW5jZTpsLnJlZkRpc3RhbmNlLHJvbGxvZmZGYWN0b3I6XCJ1bmRlZmluZWRcIiE9dHlwZW9mIG4ucm9sbG9mZkZhY3Rvcj9uLnJvbGxvZmZGYWN0b3I6bC5yb2xsb2ZmRmFjdG9yfTt2YXIgYz1vLl9wYW5uZXI7Yz8oYy5jb25lSW5uZXJBbmdsZT1sLmNvbmVJbm5lckFuZ2xlLGMuY29uZU91dGVyQW5nbGU9bC5jb25lT3V0ZXJBbmdsZSxjLmNvbmVPdXRlckdhaW49bC5jb25lT3V0ZXJHYWluLGMuZGlzdGFuY2VNb2RlbD1sLmRpc3RhbmNlTW9kZWwsYy5tYXhEaXN0YW5jZT1sLm1heERpc3RhbmNlLGMucGFubmluZ01vZGVsPWwucGFubmluZ01vZGVsLGMucmVmRGlzdGFuY2U9bC5yZWZEaXN0YW5jZSxjLnJvbGxvZmZGYWN0b3I9bC5yb2xsb2ZmRmFjdG9yKTooby5fcG9zfHwoby5fcG9zPXIuX3Bvc3x8WzAsMCwtLjVdKSxlKG8pKX1yZXR1cm4gcn0sU291bmQucHJvdG90eXBlLmluaXQ9ZnVuY3Rpb24oZSl7cmV0dXJuIGZ1bmN0aW9uKCl7dmFyIG49dGhpcyx0PW4uX3BhcmVudDtuLl9vcmllbnRhdGlvbj10Ll9vcmllbnRhdGlvbixuLl9wb3M9dC5fcG9zLG4uX3ZlbG9jaXR5PXQuX3ZlbG9jaXR5LG4uX3Bhbm5lckF0dHI9dC5fcGFubmVyQXR0cixlLmNhbGwodGhpcyksbi5fcG9zJiZ0LnBvcyhuLl9wb3NbMF0sbi5fcG9zWzFdLG4uX3Bvc1syXSxuLl9pZCl9fShTb3VuZC5wcm90b3R5cGUuaW5pdCksU291bmQucHJvdG90eXBlLnJlc2V0PWZ1bmN0aW9uKGUpe3JldHVybiBmdW5jdGlvbigpe3ZhciBuPXRoaXMsdD1uLl9wYXJlbnQ7cmV0dXJuIG4uX29yaWVudGF0aW9uPXQuX29yaWVudGF0aW9uLG4uX3Bvcz10Ll9wb3Msbi5fdmVsb2NpdHk9dC5fdmVsb2NpdHksbi5fcGFubmVyQXR0cj10Ll9wYW5uZXJBdHRyLGUuY2FsbCh0aGlzKX19KFNvdW5kLnByb3RvdHlwZS5yZXNldCk7dmFyIGU9ZnVuY3Rpb24oZSl7ZS5fcGFubmVyPUhvd2xlci5jdHguY3JlYXRlUGFubmVyKCksZS5fcGFubmVyLmNvbmVJbm5lckFuZ2xlPWUuX3Bhbm5lckF0dHIuY29uZUlubmVyQW5nbGUsZS5fcGFubmVyLmNvbmVPdXRlckFuZ2xlPWUuX3Bhbm5lckF0dHIuY29uZU91dGVyQW5nbGUsZS5fcGFubmVyLmNvbmVPdXRlckdhaW49ZS5fcGFubmVyQXR0ci5jb25lT3V0ZXJHYWluLGUuX3Bhbm5lci5kaXN0YW5jZU1vZGVsPWUuX3Bhbm5lckF0dHIuZGlzdGFuY2VNb2RlbCxlLl9wYW5uZXIubWF4RGlzdGFuY2U9ZS5fcGFubmVyQXR0ci5tYXhEaXN0YW5jZSxlLl9wYW5uZXIucGFubmluZ01vZGVsPWUuX3Bhbm5lckF0dHIucGFubmluZ01vZGVsLGUuX3Bhbm5lci5yZWZEaXN0YW5jZT1lLl9wYW5uZXJBdHRyLnJlZkRpc3RhbmNlLGUuX3Bhbm5lci5yb2xsb2ZmRmFjdG9yPWUuX3Bhbm5lckF0dHIucm9sbG9mZkZhY3RvcixlLl9wYW5uZXIuc2V0UG9zaXRpb24oZS5fcG9zWzBdLGUuX3Bvc1sxXSxlLl9wb3NbMl0pLGUuX3Bhbm5lci5zZXRPcmllbnRhdGlvbihlLl9vcmllbnRhdGlvblswXSxlLl9vcmllbnRhdGlvblsxXSxlLl9vcmllbnRhdGlvblsyXSksZS5fcGFubmVyLnNldFZlbG9jaXR5KGUuX3ZlbG9jaXR5WzBdLGUuX3ZlbG9jaXR5WzFdLGUuX3ZlbG9jaXR5WzJdKSxlLl9wYW5uZXIuY29ubmVjdChlLl9ub2RlKSxlLl9wYXVzZWR8fGUuX3BhcmVudC5wYXVzZShlLl9pZCkucGxheShlLl9pZCl9fSgpO1xuXG5cblxuLyoqKioqKioqKioqKioqKioqXG4gKiogV0VCUEFDSyBGT09URVJcbiAqKiAuL34vaG93bGVyL2hvd2xlci5qc1xuICoqIG1vZHVsZSBpZCA9IDZcbiAqKiBtb2R1bGUgY2h1bmtzID0gMFxuICoqLyIsIm1vZHVsZS5leHBvcnRzID0gX193ZWJwYWNrX2FtZF9vcHRpb25zX187XHJcblxuXG5cbi8qKioqKioqKioqKioqKioqKlxuICoqIFdFQlBBQ0sgRk9PVEVSXG4gKiogKHdlYnBhY2spL2J1aWxkaW4vYW1kLW9wdGlvbnMuanNcbiAqKiBtb2R1bGUgaWQgPSA3XG4gKiogbW9kdWxlIGNodW5rcyA9IDBcbiAqKi8iLCJcbnZhciAkdmlkZW9JbmRpY2F0b3IgPSAkKCcjdmlkZW8tcHJvZ3Jlc3MgLnByb2dyZXNzJyk7XG52YXIgdmlkZW9QbGF5aW5nO1xudmFyICRlbDtcblxuJHZpZGVvSW5kaWNhdG9yLmhpZGUoKTtcbm1vZHVsZS5leHBvcnRzLnN0YXJ0ID0gZnVuY3Rpb24oJG5ld1ZpZGVvKSB7XG4gICRlbCA9ICRuZXdWaWRlb1swXTtcbiAgJHZpZGVvSW5kaWNhdG9yLnNob3coKTtcbiAgdmlkZW9QbGF5aW5nID0gdHJ1ZTtcbiAgbG9vcCgpO1xufTtcblxubW9kdWxlLmV4cG9ydHMuc3RvcCA9IGZ1bmN0aW9uKCkge1xuICB2aWRlb1BsYXlpbmcgPSBmYWxzZTtcbiAgJCgnI3ZpZGVvLXByb2dyZXNzIC5wcm9ncmVzcycpLmhpZGUoKTtcbn07XG5cbmZ1bmN0aW9uIGxvb3AoKSB7XG4gIHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUoZnVuY3Rpb24oKSB7XG4gICAgdmFyIHJhdGUgPSAoJGVsLmN1cnJlbnRUaW1lIC8gJGVsLmR1cmF0aW9uKTtcbiAgICB2YXIgcGVyY2VudCA9IChyYXRlICogMTAwKS50b0ZpeGVkKDIpO1xuICAgICR2aWRlb0luZGljYXRvci5jc3Moeyd3aWR0aCc6IHBlcmNlbnQgKyAndncnfSk7XG4gICAgaWYodmlkZW9QbGF5aW5nKSB7XG4gICAgICBzZXRUaW1lb3V0KCAoKSA9PiB7bG9vcCgpfSAsIDQxIClcbiAgICB9XG4gIH0pXG59XG5cblxuXG4vKiogV0VCUEFDSyBGT09URVIgKipcbiAqKiAuL3NjZW5lLW1ha2VyL3JlbmRlci92aWRlb3BsYXllci5qc1xuICoqLyIsIm1vZHVsZS5leHBvcnRzLmNvbnZlcnRBbGxQcm9wc1RvUHggPSBmdW5jdGlvbihrZXlmcmFtZXMsIHdpbmRvd1dpZHRoLCB3aW5kb3dIZWlnaHQpIHtcbiAgdmFyIGksIGosIGs7XG4gIGZvcihpPTA7aTxrZXlmcmFtZXMubGVuZ3RoO2krKykgeyAvLyBsb29wIGtleWZyYW1lc1xuICAgIGtleWZyYW1lc1tpXS5kdXJhdGlvbiA9IGNvbnZlcnRQZXJjZW50VG9QeChrZXlmcmFtZXNbaV0uZHVyYXRpb24sICd5Jywgd2luZG93V2lkdGgsIHdpbmRvd0hlaWdodCk7XG4gICAgZm9yKGo9MDtqPGtleWZyYW1lc1tpXS5hbmltYXRpb25zLmxlbmd0aDtqKyspIHsgLy8gbG9vcCBhbmltYXRpb25zXG4gICAgICBPYmplY3Qua2V5cyhrZXlmcmFtZXNbaV0uYW5pbWF0aW9uc1tqXSkuZm9yRWFjaChmdW5jdGlvbihrZXkpIHsgLy8gbG9vcCBwcm9wZXJ0aWVzXG4gICAgICAgIHZhciB2YWx1ZSA9IGtleWZyYW1lc1tpXS5hbmltYXRpb25zW2pdW2tleV07XG4gICAgICAgIGlmKGtleSAhPT0gJ3NlbGVjdG9yJykge1xuICAgICAgICAgIGlmKHZhbHVlIGluc3RhbmNlb2YgQXJyYXkpIHsgLy8gaWYgaXRzIGFuIGFycmF5XG4gICAgICAgICAgICBmb3Ioaz0wO2s8dmFsdWUubGVuZ3RoO2srKykgeyAvLyBpZiB2YWx1ZSBpbiBhcnJheSBpcyAlXG4gICAgICAgICAgICAgIGlmKHR5cGVvZiB2YWx1ZVtrXSA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgICAgICAgICAgIGlmKGtleSA9PT0gJ3RyYW5zbGF0ZVknKSB7XG4gICAgICAgICAgICAgICAgICB2YWx1ZVtrXSA9IGNvbnZlcnRQZXJjZW50VG9QeCh2YWx1ZVtrXSwgJ3knLCB3aW5kb3dXaWR0aCwgd2luZG93SGVpZ2h0KTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgdmFsdWVba10gPSBjb252ZXJ0UGVyY2VudFRvUHgodmFsdWVba10sICd4Jywgd2luZG93V2lkdGgsIHdpbmRvd0hlaWdodCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmKHR5cGVvZiB2YWx1ZSA9PT0gXCJzdHJpbmdcIikgeyAvLyBpZiBzaW5nbGUgdmFsdWUgaXMgYSAlXG4gICAgICAgICAgICAgIGlmKGtleSA9PT0gJ3RyYW5zbGF0ZVknKSB7XG4gICAgICAgICAgICAgICAgdmFsdWUgPSBjb252ZXJ0UGVyY2VudFRvUHgodmFsdWUsICd5Jywgd2luZG93V2lkdGgsIHdpbmRvd0hlaWdodCk7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdmFsdWUgPSBjb252ZXJ0UGVyY2VudFRvUHgodmFsdWUsICd4Jywgd2luZG93V2lkdGgsIHdpbmRvd0hlaWdodCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAga2V5ZnJhbWVzW2ldLmFuaW1hdGlvbnNbal1ba2V5XSA9IHZhbHVlO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGtleWZyYW1lcztcbn07XG5cblxuXG5mdW5jdGlvbiBjb252ZXJ0UGVyY2VudFRvUHgodmFsdWUsIGF4aXMsIHdpbmRvd1dpZHRoLCB3aW5kb3dIZWlnaHQpIHtcbiAgaWYodHlwZW9mIHZhbHVlID09PSBcInN0cmluZ1wiICYmIHZhbHVlLm1hdGNoKC8lL2cpKSB7XG4gICAgaWYoYXhpcyA9PT0gJ3knKSB2YWx1ZSA9IChwYXJzZUZsb2F0KHZhbHVlKSAvIDEwMCkgKiB3aW5kb3dIZWlnaHQ7XG4gICAgaWYoYXhpcyA9PT0gJ3gnKSB2YWx1ZSA9IChwYXJzZUZsb2F0KHZhbHVlKSAvIDEwMCkgKiB3aW5kb3dXaWR0aDtcbiAgfVxuICBpZih0eXBlb2YgdmFsdWUgPT09IFwic3RyaW5nXCIgJiYgdmFsdWUubWF0Y2goL3YvZykpIHtcbiAgICBpZihheGlzID09PSAneScpIHZhbHVlID0gKHBhcnNlRmxvYXQodmFsdWUpIC8gMTAwKSAqIHdpbmRvd0hlaWdodDtcbiAgICBpZihheGlzID09PSAneCcpIHZhbHVlID0gKHBhcnNlRmxvYXQodmFsdWUpIC8gMTAwKSAqIHdpbmRvd1dpZHRoO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn07XG5cblxubW9kdWxlLmV4cG9ydHMuYnVpbGRQYWdlID0gZnVuY3Rpb24oa2V5ZnJhbWVzLCB3cmFwcGVycykge1xuICB2YXIgaSwgaiwgaywgaW5pdEZyYW1lcyA9IFtdLCBib2R5SGVpZ2h0ID0gMDtcbiAgZm9yKGk9MDtpPGtleWZyYW1lcy5sZW5ndGg7aSsrKSB7IC8vIGxvb3Aga2V5ZnJhbWVzXG4gICAgICBpZihrZXlmcmFtZXNbaV0uZm9jdXMpIHtcbiAgICAgICAgICBpZihib2R5SGVpZ2h0ICE9PSBpbml0RnJhbWVzW2luaXRGcmFtZXMubGVuZ3RoIC0gMV0pIHtcbiAgICAgICAgICAgIGluaXRGcmFtZXMucHVzaChib2R5SGVpZ2h0KTtcbiAgICAgICAgICB9XG4gICAgICB9XG4gICAgICBib2R5SGVpZ2h0ICs9IGtleWZyYW1lc1tpXS5kdXJhdGlvbjtcbiAgICAgIGlmKCQuaW5BcnJheShrZXlmcmFtZXNbaV0ud3JhcHBlciwgd3JhcHBlcnMpID09IC0xKSB7XG4gICAgICAgIHdyYXBwZXJzLnB1c2goa2V5ZnJhbWVzW2ldLndyYXBwZXIpO1xuICAgICAgfVxuICAgICAgZm9yKGo9MDtqPGtleWZyYW1lc1tpXS5hbmltYXRpb25zLmxlbmd0aDtqKyspIHsgLy8gbG9vcCBhbmltYXRpb25zXG4gICAgICAgIE9iamVjdC5rZXlzKGtleWZyYW1lc1tpXS5hbmltYXRpb25zW2pdKS5mb3JFYWNoKGZ1bmN0aW9uKGtleSkgeyAvLyBsb29wIHByb3BlcnRpZXNcbiAgICAgICAgICB2YXIgdmFsdWUgPSBrZXlmcmFtZXNbaV0uYW5pbWF0aW9uc1tqXVtrZXldO1xuICAgICAgICAgIGlmKGtleSAhPT0gJ3NlbGVjdG9yJyAmJiB2YWx1ZSBpbnN0YW5jZW9mIEFycmF5ID09PSBmYWxzZSkge1xuICAgICAgICAgICAgdmFyIHZhbHVlU2V0ID0gW107XG4gICAgICAgICAgICB2YWx1ZVNldC5wdXNoKGdldERlZmF1bHRQcm9wZXJ0eVZhbHVlKGtleSksIHZhbHVlKTtcbiAgICAgICAgICAgIHZhbHVlID0gdmFsdWVTZXQ7XG4gICAgICAgICAgfVxuICAgICAgICAgIGtleWZyYW1lc1tpXS5hbmltYXRpb25zW2pdW2tleV0gPSB2YWx1ZTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gIH1cblxuICByZXR1cm4ge1xuICAgIGZyYW1lRm9jdXM6IGluaXRGcmFtZXMsXG4gICAgYm9keUhlaWdodDogYm9keUhlaWdodCxcbiAgICB3cmFwcGVyczogd3JhcHBlcnNcbiAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMuZ2V0RGVmYXVsdFByb3BlcnR5VmFsdWUgPSBnZXREZWZhdWx0UHJvcGVydHlWYWx1ZTtcblxuZnVuY3Rpb24gZ2V0RGVmYXVsdFByb3BlcnR5VmFsdWUocHJvcGVydHkpIHtcbiAgc3dpdGNoIChwcm9wZXJ0eSkge1xuICAgIGNhc2UgJ3RyYW5zbGF0ZVgnOlxuICAgICAgcmV0dXJuIDA7XG4gICAgY2FzZSAndHJhbnNsYXRlWSc6XG4gICAgICByZXR1cm4gMDtcbiAgICBjYXNlICdzY2FsZSc6XG4gICAgICByZXR1cm4gMTtcbiAgICBjYXNlICdyb3RhdGUnOlxuICAgICAgcmV0dXJuIDA7XG4gICAgY2FzZSAnb3BhY2l0eSc6XG4gICAgICByZXR1cm4gMTtcbiAgICBkZWZhdWx0OlxuICAgICAgcmV0dXJuIG51bGw7XG4gIH1cbn1cblxuXG5cbi8qKiBXRUJQQUNLIEZPT1RFUiAqKlxuICoqIC4vc2NlbmUtbWFrZXIvdXRpbHMvcGFnZS11dGlscy5qc1xuICoqLyIsImNvbnN0IEtlZmlyID0gcmVxdWlyZSgna2VmaXInKVxuXG5jb25zdCBvYnNjZW5lID0gcmVxdWlyZSgnLi4vb2Itc2NlbmUuanMnKVxuXG5tb2R1bGUuZXhwb3J0cy5pbml0ID0gZnVuY3Rpb24oKSB7XG5cbiAgdmFyIFBMQVlfU1BFRUQgPSAxMDtcblxuICB2YXIgaXNQbGF5aW5nID0gZmFsc2U7XG4gIHZhciBpc1BsYXlpbmdJbnRlcnZhbDtcbiAgdmFyIGJvZHlIZWlnaHQgPSAkKCdib2R5JykuaGVpZ2h0KCk7XG4gIHZhciBuYT0wO1xuXG4gIGNvbnN0IGtleVVwUHJlc3NlZCA9IEtlZmlyLmZyb21FdmVudHMoZG9jdW1lbnQsICdrZXl1cCcsIGZ1bmN0aW9uKGUpe1xuICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICByZXR1cm4gZTtcbiAgfSk7XG5cbiAgY29uc3QgYmFja0tleSA9IGtleVVwUHJlc3NlZFxuICAgIC5maWx0ZXIoZSA9PiBlLmtleUNvZGUgPT09IDM4KVxuICBjb25zdCBuZXh0S2V5ID0ga2V5VXBQcmVzc2VkXG4gICAgLmZpbHRlcihlID0+IGUua2V5Q29kZSA9PT0gNDApXG5cbiAgY29uc3QgdG9nZ2xlVXBDbGlja2VkID0gS2VmaXIuZnJvbUV2ZW50cygkKFwiI3RvZ2dsZVVwXCIpLCAnY2xpY2snKVxuICBjb25zdCB0b2dnbGVEb3duQ2xpY2tlZCA9IEtlZmlyLmZyb21FdmVudHMoJChcIiN0b2dnbGVEb3duXCIpLCAnY2xpY2snKVxuXG4gIEtlZmlyLm1lcmdlKFtuZXh0S2V5LCB0b2dnbGVEb3duQ2xpY2tlZF0pXG4gICAgLm9uVmFsdWUoZSA9PiB7XG4gICAgICBvYnNjZW5lLmFjdGlvbignbmV4dCcpXG4gICAgfSlcblxuICBLZWZpci5tZXJnZShbYmFja0tleSwgdG9nZ2xlVXBDbGlja2VkXSlcbiAgICAub25WYWx1ZShlID0+IHtcbiAgICAgIG9ic2NlbmUuYWN0aW9uKCdwcmV2aW91cycpXG4gICAgfSlcblxuICAkKFwiI3RvZ2dsZVBsYXlcIikub24oJ2NsaWNrJywgZnVuY3Rpb24oZSkge1xuICAgIGNvbnNvbGUubG9nKFwiQ0xJQ0tcIik7XG4gICAgaWYoaXNQbGF5aW5nKSB7IHBhdXNlKCkgfSBlbHNlIHsgcGxheSgpIH1cbiAgfSlcblxuICBrZXlVcFByZXNzZWRcbiAgICAuZmlsdGVyKGUgPT4gZS5rZXlDb2RlID09PSA4MCB8fCBlLmtleUNvZGUgPT09IDMyKVxuICAgIC5vblZhbHVlKGUgPT4ge1xuICAgICAgaWYgKGlzUGxheWluZykgeyBwYXVzZSgpIH0gZWxzZSB7IHBsYXkoKSB9XG4gICAgfSlcblxuICBmdW5jdGlvbiBwbGF5KCkge1xuICAgIGNvbnNvbGUubG9nKFwiUExBWVwiKVxuICAgIGlzUGxheWluZ0ludGVydmFsID0gc2V0SW50ZXJ2YWwoZnVuY3Rpb24oKSB7XG4gICAgICBvYnNjZW5lLmFjdGlvbignbmV4dCcpO1xuICAgIH0sIDUwMDApO1xuICAgICQoXCIjdG9nZ2xlUGxheVwiKS5yZW1vdmVDbGFzcygnZmEtcGxheScpLmFkZENsYXNzKCdmYS1wYXVzZScpO1xuICAgIGlzUGxheWluZyA9IHRydWU7XG4gIH1cblxuICBmdW5jdGlvbiBwYXVzZSgpIHtcbiAgICBjb25zb2xlLmxvZyhcIlBBVVNFXCIpO1xuICAgIGNsZWFySW50ZXJ2YWwoaXNQbGF5aW5nSW50ZXJ2YWwpO1xuICAgIGlzUGxheWluZyA9IGZhbHNlO1xuICAgICQoXCIjdG9nZ2xlUGxheVwiKS5yZW1vdmVDbGFzcygnZmEtcGF1c2UnKS5hZGRDbGFzcygnZmEtcGxheScpO1xuICB9XG59O1xuXG5cblxuLyoqIFdFQlBBQ0sgRk9PVEVSICoqXG4gKiogLi9zY2VuZS1tYWtlci91c2VyL2NvbnRyb2xzLmpzXG4gKiovIiwiLypcbiAqICBEZXBlbmRlbmNpZXNcbiovXG5cbiAgY29uc3Qgb2JzY2VuZSA9IHJlcXVpcmUoJy4uL29iLXNjZW5lLmpzJylcbiAgY29uc3QgcGFnZVV0aWxzID0gcmVxdWlyZSgnLi4vdXRpbHMvcGFnZS11dGlscy5qcycpXG5cbi8qXG4gKiAgU3RyZWFtc1xuKi9cblxuICBjb25zdCBzY3JvbGxUb3BDaGFuZ2VkID0gb2JzY2VuZS5zY3JvbGxUb3BDaGFuZ2VkXG4gIGNvbnN0IGRpbWVuc2lvbnNDYWxjdWxhdGVkID0gb2JzY2VuZS5kaW1lbnNpb25zQ2FsY3VsYXRlZFxuICBjb25zdCB3cmFwcGVyQ2hhbmdlZCA9IG9ic2NlbmUud3JhcHBlckNoYW5nZWRcblxuLypcbiAqICBET00gRWxlbWVudHNcbiovXG5cbiAgY29uc3QgJHdpbmRvdyA9ICQod2luZG93KVxuICBjb25zdCAkYm9keSA9ICQoJ2JvZHknKVxuICBjb25zdCAkYm9keWh0bWwgPSAkKCdib2R5LGh0bWwnKVxuICBjb25zdCAkZXhwZXJpZW5jZUluZGljYXRvciA9ICQoJyNleHBlcmllbmNlLXByb2dyZXNzIC5wcm9ncmVzcycpXG5cbi8qXG4gKiAgQ2hpbGQgUmVuZGVyc1xuKi9cblxuICBjb25zdCByZW5kZXJXcmFwcGVyID0gcmVxdWlyZSgnLi93cmFwcGVyLmpzJylcbiAgY29uc3QgcmVuZGVyU2Nyb2xsYmFyID0gcmVxdWlyZSgnLi9zY3JvbGxiYXIuanMnKVxuICBjb25zdCByZW5kZXJBdWRpb1BsYXllciA9IHJlcXVpcmUoJy4vYXVkaW9wbGF5ZXIuanMnKVxuICBjb25zdCByZW5kZXJWaWRlb1BsYXllciA9IHJlcXVpcmUoJy4vdmlkZW9wbGF5ZXIuanMnKVxuICBjb25zdCByZW5kZXJFcnJvciA9IHJlcXVpcmUoJy4vZXJyb3IuanMnKVxuXG4vKlxuICogIFJlbmRlclxuKi9cblxuICAvLyBIYWNrIHRvIGZvcmNlIHJlc2l6ZSBvbmNlLiBGb3Igc29tZVxuICAvLyByZWFzb24gdGhpcyBwcmV2ZW50cyB0aGUgYW5pbWF0aW9ucyBmcm9tIGJsaW5raW5nIG9uIENocm9tZVxuICBzY3JvbGxUb3BDaGFuZ2VkLnRha2UoMSkuZGVsYXkoNTAwKS5vblZhbHVlKCgpID0+IHtcbiAgICAkd2luZG93LnRyaWdnZXIoJ3Jlc2l6ZScpXG4gIH0pXG5cbiAgLy8gUmVuZGVyIERpbWVuc2lvbnNcbiAgZGltZW5zaW9uc0NhbGN1bGF0ZWQub25WYWx1ZShzdGF0ZSA9PiB7XG4gICAgJGJvZHkuaGVpZ2h0KHN0YXRlLmJvZHlIZWlnaHQpXG4gICAgcmVuZGVyU2Nyb2xsQmFyRm9jdXNCYXJzKHN0YXRlKVxuICB9KVxuXG4gICAgZnVuY3Rpb24gcmVuZGVyU2Nyb2xsQmFyRm9jdXNCYXJzKHN0YXRlKSB7XG4gICAgICBzdGF0ZS5mcmFtZUZvY3VzXG4gICAgICAgIC5tYXAoKGZvY3VzKSA9PiAoZm9jdXMgLyBzdGF0ZS5ib2R5SGVpZ2h0KS50b0ZpeGVkKDIpICogMTAwKSAvLyBDb252ZXJ0IHRvIHBlcmNlbnRcbiAgICAgICAgLm1hcCgoZm9jdXNQZXJjZW50KSA9PiBmb2N1c1BlcmNlbnQgKyBcInZoXCIpIC8vIENvbnZlcnQgdG8gdmhcbiAgICAgICAgLm1hcCgoZm9jdXNWaCkgPT4ge1xuICAgICAgICAgICQoXCIjZXhwZXJpZW5jZS1wcm9ncmVzc1wiKVxuICAgICAgICAgICAgLmFwcGVuZCgnPGRpdiBjbGFzcz1cImNlbnRlci1tYXJrZXJcIiBzdHlsZT1cInRvcDonICsgZm9jdXNWaCArICdcIj48L2Rpdj4nKVxuICAgICAgICB9KVxuICAgIH1cblxuICAvLyBSZW5kZXIgV3JhcHBlclxuICB3cmFwcGVyQ2hhbmdlZC5vblZhbHVlKChjdXJyZW50V3JhcHBlcikgPT4ge1xuICAgIC8vIGNvbnNvbGUubG9nKFwiV1JBUFBFUiBDSEFOR0VEXCIpO1xuICAgIHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUoKCkgPT4ge1xuICAgICAgJChjdXJyZW50V3JhcHBlclswXSkuaGlkZSgpXG4gICAgICAkKGN1cnJlbnRXcmFwcGVyWzFdKS5zaG93KClcblxuICAgICAgd2luZG93LmxvY2F0aW9uLmhhc2ggPSBjdXJyZW50V3JhcHBlclsxXVxuICAgICAgZ2EoJ3NlbmQnLCAnc2NlbmVfYWNjZXNzZWQnLCBjdXJyZW50V3JhcHBlclsxXSkgLy8gR29vZ2xlIEFuYWx5dGljc1xuICAgICAgcmVuZGVyVmlkZW8oY3VycmVudFdyYXBwZXIpXG4gICAgICByZW5kZXJBdWRpbyhjdXJyZW50V3JhcHBlcilcbiAgICB9KVxuICB9KVxuXG4gICAgZnVuY3Rpb24gc2hvd0N1cnJlbnRXcmFwcGVycyhwcmV2LCBuZXh0KSB7XG4gICAgICBpZiAocHJldi5jdXJyZW50V3JhcHBlciA9PT0gbmV4dC5jdXJyZW50V3JhcHBlcikgeyByZXR1cm4gZmFsc2UgfVxuICAgICAgLy8gY29uc29sZS5sb2coJ3ByZXZpb3VzJywgcHJldiwgbmV4dClcbiAgICAgICQocHJldi5jdXJyZW50V3JhcHBlcikuaGlkZSgpXG4gICAgICAkKG5leHQuY3VycmVudFdyYXBwZXIpLnNob3coKVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHJlbmRlclZpZGVvKHN0YXRlKSB7XG5cbiAgICAgICAgJCgndmlkZW8nLCBzdGF0ZVswXSkuYW5pbWF0ZSh7XG4gICAgICAgICAgdm9sdW1lOiAwXG4gICAgICAgIH0sIDMwMCwgJ3N3aW5nJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgLy8gcmVhbGx5IHN0b3AgdGhlIHZpZGVvXG4gICAgICAgICAgJCh0aGlzKS5nZXQoMCkucGF1c2UoKVxuICAgICAgICB9KVxuXG4gICAgICAgIGxldCAkbmV3VmlkZW8gPSAkKCd2aWRlbycsIHN0YXRlWzFdKVxuXG4gICAgICAgIGlmICgkbmV3VmlkZW9bMF0pIHtcbiAgICAgICAgICAkbmV3VmlkZW9bMF0ucGxheSgpXG4gICAgICAgICAgJG5ld1ZpZGVvLmFuaW1hdGUoe1xuICAgICAgICAgICAgdm9sdW1lOiAkbmV3VmlkZW8uYXR0cignbWF4LXZvbHVtZScpIHx8IDFcbiAgICAgICAgICB9LCAzMDAsICdzd2luZycpXG4gICAgICAgICAgcmVuZGVyVmlkZW9QbGF5ZXIuc3RhcnQoJG5ld1ZpZGVvKVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJlbmRlclZpZGVvUGxheWVyLnN0b3AoJG5ld1ZpZGVvKVxuICAgICAgICB9XG5cbiAgICB9XG4gICAgZnVuY3Rpb24gcmVuZGVyQXVkaW8oc3RhdGUpIHtcbiAgICAgIHJlbmRlckF1ZGlvUGxheWVyLm5leHQoc3RhdGVbMV0uc3Vic3RyKDEpKTtcbiAgICB9XG5cbiAgLy8gUmVuZGVyIEtleWZyYW1lc1xuXG4gIHNjcm9sbFRvcENoYW5nZWQub25WYWx1ZSgoc3RhdGVkaWZmKSA9PiB7XG5cbiAgICB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKCgpID0+IHtcbiAgICAgICAgbGV0IHByZXYgPSBzdGF0ZWRpZmZbMF1cbiAgICAgICAgbGV0IG5leHQgPSBzdGF0ZWRpZmZbMV1cblxuICAgICAgICBhbmltYXRlRWxlbWVudHMobmV4dClcbiAgICAgICAgYW5pbWF0ZVNjcm9sbEJhcihuZXh0KVxuICAgICAgICAvLyByZW5kZXJNdXNpYyhuZXh0KVxuICAgIH0pXG5cbiAgfSlcblxuICAgIGZ1bmN0aW9uIHJlbmRlck11c2ljKHdyYXBwZXJJZCkge1xuICAgICAgYXVkaW9wbGF5ZXIubmV4dCh3cmFwcGVySWQuc3Vic3RyKDEpKVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGFuaW1hdGVTY3JvbGxCYXIoc3RhdGUpIHtcbiAgICAgIHZhciBwZXJjZW50ID0gKHN0YXRlLnNjcm9sbFRvcCAvIHN0YXRlLmJvZHlIZWlnaHQpLnRvRml4ZWQoMikgKiAxMDBcbiAgICAgICRleHBlcmllbmNlSW5kaWNhdG9yLmNzcyh7XG4gICAgICAgICd0cmFuc2Zvcm0nOiAndHJhbnNsYXRlWSgnICsgcGVyY2VudCArICclKSdcbiAgICAgIH0pXG4gICAgfVxuXG4gICAgZnVuY3Rpb24gYW5pbWF0ZUVsZW1lbnRzKHN0YXRlKSB7XG4gICAgICB2YXIgYW5pbWF0aW9uLCB0cmFuc2xhdGVZLCB0cmFuc2xhdGVYLCBzY2FsZSwgcm90YXRlLCBvcGFjaXR5XG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHN0YXRlLmtleWZyYW1lc1tzdGF0ZS5jdXJyZW50S2V5ZnJhbWVdLmFuaW1hdGlvbnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgYW5pbWF0aW9uID0gc3RhdGUua2V5ZnJhbWVzW3N0YXRlLmN1cnJlbnRLZXlmcmFtZV0uYW5pbWF0aW9uc1tpXVxuICAgICAgICB0cmFuc2xhdGVZID0gY2FsY1Byb3BWYWx1ZShhbmltYXRpb24sICd0cmFuc2xhdGVZJywgc3RhdGUpXG4gICAgICAgIHRyYW5zbGF0ZVggPSBjYWxjUHJvcFZhbHVlKGFuaW1hdGlvbiwgJ3RyYW5zbGF0ZVgnLCBzdGF0ZSlcbiAgICAgICAgc2NhbGUgPSBjYWxjUHJvcFZhbHVlKGFuaW1hdGlvbiwgJ3NjYWxlJywgc3RhdGUpXG4gICAgICAgIHJvdGF0ZSA9IGNhbGNQcm9wVmFsdWUoYW5pbWF0aW9uLCAncm90YXRlJywgc3RhdGUpXG4gICAgICAgIG9wYWNpdHkgPSBjYWxjUHJvcFZhbHVlKGFuaW1hdGlvbiwgJ29wYWNpdHknLCBzdGF0ZSlcbiAgICAgICAgJChhbmltYXRpb24uc2VsZWN0b3IsIHN0YXRlLmN1cnJlbnRXcmFwcGVyKS5jc3Moe1xuICAgICAgICAgICd0cmFuc2Zvcm0nOiAndHJhbnNsYXRlM2QoJyArIHRyYW5zbGF0ZVggKyAncHgsICcgKyB0cmFuc2xhdGVZICsgJ3B4LCAwKSBzY2FsZSgnICsgc2NhbGUgKyAnKSByb3RhdGUoJyArIHJvdGF0ZSArICdkZWcpJyxcbiAgICAgICAgICAnb3BhY2l0eSc6IG9wYWNpdHkudG9GaXhlZCgyKVxuICAgICAgICB9KVxuXG4gICAgICB9XG4gICAgfVxuXG4gICAgICBmdW5jdGlvbiBjYWxjUHJvcFZhbHVlKGFuaW1hdGlvbiwgcHJvcGVydHksIHN0YXRlKSB7XG4gICAgICAgIGxldCB2YWx1ZSA9IGFuaW1hdGlvbltwcm9wZXJ0eV1cbiAgICAgICAgaWYgKHZhbHVlKSB7XG4gICAgICAgICAgdmFsdWUgPSBlYXNlSW5PdXRRdWFkKHN0YXRlLnJlbGF0aXZlU2Nyb2xsVG9wLCB2YWx1ZVswXSwgKHZhbHVlWzFdIC0gdmFsdWVbMF0pLCBzdGF0ZS5rZXlmcmFtZXNbc3RhdGUuY3VycmVudEtleWZyYW1lXS5kdXJhdGlvbilcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB2YWx1ZSA9IHBhZ2VVdGlscy5nZXREZWZhdWx0UHJvcGVydHlWYWx1ZShwcm9wZXJ0eSlcbiAgICAgICAgfVxuICAgICAgICAvLyB2YWx1ZSA9ICt2YWx1ZS50b0ZpeGVkKDIpXG4gICAgICAgIC8vIFRFTVBPUkFSSUxZIFJFTU9WRUQgQ0FVU0UgU0NBTEUgRE9FU04nVCBXT1JLIFdJVEhBIEFHUkVTU0lWRSBST1VORElORyBMSUtFIFRISVNcbiAgICAgICAgcmV0dXJuIHZhbHVlXG4gICAgICB9XG5cbiAgICAgIGZ1bmN0aW9uIGdldERlZmF1bHRQcm9wZXJ0eVZhbHVlKHByb3BlcnR5KSB7XG4gICAgICAgIHN3aXRjaCAocHJvcGVydHkpIHtcbiAgICAgICAgICBjYXNlICd0cmFuc2xhdGVYJzpcbiAgICAgICAgICAgIHJldHVybiAwXG4gICAgICAgICAgY2FzZSAndHJhbnNsYXRlWSc6XG4gICAgICAgICAgICByZXR1cm4gMFxuICAgICAgICAgIGNhc2UgJ3NjYWxlJzpcbiAgICAgICAgICAgIHJldHVybiAxXG4gICAgICAgICAgY2FzZSAncm90YXRlJzpcbiAgICAgICAgICAgIHJldHVybiAwXG4gICAgICAgICAgY2FzZSAnb3BhY2l0eSc6XG4gICAgICAgICAgICByZXR1cm4gMVxuICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICByZXR1cm4gbnVsbFxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGZ1bmN0aW9uIGVhc2VJbk91dFF1YWQodCwgYiwgYywgZCkge1xuICAgICAgICAvL3NpbnVzb2FkaWFsIGluIGFuZCBvdXRcbiAgICAgICAgcmV0dXJuIC1jIC8gMiAqIChNYXRoLmNvcyhNYXRoLlBJICogdCAvIGQpIC0gMSkgKyBiXG4gICAgICB9XG5cblxuXG4vKiogV0VCUEFDSyBGT09URVIgKipcbiAqKiAuL3NjZW5lLW1ha2VyL3JlbmRlci9pbmRleC5qc1xuICoqLyIsImZ1bmN0aW9uIHJlbmRlclNjcm9sbChzY3JvbGwpIHtcbiAgY29uc29sZS5sb2coXCJSRU5ERVJcIiwgc2Nyb2xsLCBNYXRoLmZsb29yKCR3aW5kb3cuc2Nyb2xsVG9wKCkpKVxuICAgICRib2R5aHRtbC5hbmltYXRlKHsgc2Nyb2xsVG9wOiBzY3JvbGwgfSwgMTUwMCwgJ2xpbmVhcicpO1xufVxuXG5mdW5jdGlvbiBhbmltYXRlU2Nyb2xsQmFyKCkge1xuICB2YXIgcGVyY2VudCA9IChzY3JvbGxUb3AgLyBib2R5SGVpZ2h0KS50b0ZpeGVkKDIpICogMTAwO1xuICAkZXhwZXJpZW5jZUluZGljYXRvci5jc3Moe1xuICAgICAgJ3RyYW5zZm9ybSc6ICAgICd0cmFuc2xhdGVZKCcgKyBwZXJjZW50ICsgJyUpJ1xuICAgIH0pO1xufVxuZnVuY3Rpb24gYnVpbGRTY3JvbGxCYXJDZW50ZXJzKCkge1xuICBmcmFtZUZvY3VzXG4gICAgLm1hcCgoY2VudGVyKSA9PiAoY2VudGVyIC8gYm9keUhlaWdodCkudG9GaXhlZCgyKSAqIDEwMClcbiAgICAubWFwKChjZW50ZXJQZXJjZW50KSA9PiBjZW50ZXJQZXJjZW50ICsgXCJ2aFwiIClcbiAgICAubWFwKChjZW50ZXJWaCkgPT4ge1xuICAgICAgJChcIiNleHBlcmllbmNlLXByb2dyZXNzXCIpXG4gICAgICAgIC5hcHBlbmQoJzxkaXYgY2xhc3M9XCJjZW50ZXItbWFya2VyXCIgc3R5bGU9XCJ0b3A6JysgY2VudGVyVmggKydcIj48L2Rpdj4nKTtcbiAgICB9KTtcbn1cblxuXG5cbi8qKiBXRUJQQUNLIEZPT1RFUiAqKlxuICoqIC4vc2NlbmUtbWFrZXIvcmVuZGVyL3Njcm9sbGJhci5qc1xuICoqLyIsIi8vIE5PVEU6IFRoaXMgZmlsZSByZWxpZXMgaGVhdmlseSBvbiB3ZWJwYWNrIGZvciByZXF1aXJlcyBvZiBodG1sIGFuZCBqc29uIGNvbmZpZyBmaWxlcy5cbmNvbnN0IEtlZmlyID0gcmVxdWlyZSgna2VmaXInKTtcblxuLy8gQ29uc3RhbnRzXG5jb25zdCBTQ0VORVNfRElSRUNUT1JZID0gJy4uLy4uL3NjZW5lcy8nOyAvLyBUT0RPOiBTQ0VORVNfRElSRUNUT1JZIGRvZXNuJ3Qgc2VlbSB0byB3b3JrIHdpdGggd2VicGFjaydzIGh0bWwgJiBqc29uIGxvYWRlci5cbmNvbnN0IFNDRU5FX0lOREVYID0gcmVxdWlyZSgnanNvbiEuLi8uLi9zY2VuZXMvaW5kZXguanNvbicpO1xuY29uc3QgU0NFTkVfQ09OVEFJTkVSX0NTU19DTEFTUyA9ICd3cmFwcGVyJztcblxuLypcbiAqIEdlbmVyYXRlcyBhbiBIVE1MIHN0cmluZyBmcm9tIHNjZW5lLmh0bWwgZmlsZXMgdGhlIHNjZW5lcyBmb2xkZXIuXG4gKiBDcmVhdGVzIGEgd3JhcHBlciBkaXYgdGhhdCBwcm92aWRlcyBmZWVkYmFjay5cbiAqL1xubW9kdWxlLmV4cG9ydHMucmVuZGVySFRNTCA9IGZ1bmN0aW9uKCkge1xuXG4gIHJldHVybiBTQ0VORV9JTkRFWFxuICAgIC5tYXAoc2NlbmUgPT4gc2NlbmUuaWQpXG4gICAgLm1hcChmdW5jdGlvbihzY2VuZU5hbWUpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgIGh0bWw6IHJlcXVpcmUoXCJodG1sP2F0dHJzPWZhbHNlIS4uLy4uL3NjZW5lcy9cIiArIHNjZW5lTmFtZSArIFwiL3NjZW5lLmh0bWxcIiksXG4gICAgICAgICAgICAgIG5hbWU6IHNjZW5lTmFtZVxuICAgICAgICAgICAgfVxuICAgIH0pXG4gICAgLm1hcChmdW5jdGlvbihzY2VuZU9iamVjdCkgeyAvLyBDcmVhdGUgd3JhcHBlciBkaXYgZm9yIGh0bWxcbiAgICAgICAgdmFyICR3cmFwcGVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICAgICR3cmFwcGVyLmNsYXNzTGlzdC5hZGQoU0NFTkVfQ09OVEFJTkVSX0NTU19DTEFTUyk7XG4gICAgICAgICR3cmFwcGVyLnNldEF0dHJpYnV0ZSgnaWQnLCBzY2VuZU9iamVjdC5uYW1lKTtcbiAgICAgICAgJHdyYXBwZXIuaW5uZXJIVE1MID0gc2NlbmVPYmplY3QuaHRtbDtcbiAgICAgICAgcmV0dXJuICR3cmFwcGVyLm91dGVySFRNTDtcbiAgICB9KVxuICAgIC5yZWR1Y2UoZnVuY3Rpb24ocHJldiwgbmV4dCkgeyAvLyBDb25jYXQgdG8gMSBodG1sIHN0cmluZ1xuICAgICAgcmV0dXJuIHByZXYgKyBuZXh0O1xuICAgIH0sICcnKTtcblxufVxuXG5tb2R1bGUuZXhwb3J0cy5nZXRTY2VuZXMgPSBjcmVhdGVIVE1MRm9yU2NlbmVzO1xuXG5mdW5jdGlvbiBjcmVhdGVIVE1MRm9yU2NlbmVzKCkge1xuICByZXR1cm4gU0NFTkVfSU5ERVhcbiAgICAubWFwKHNjZW5lID0+IHNjZW5lLmlkKVxuICAgIC5tYXAoZnVuY3Rpb24oc2NlbmVOYW1lKSB7IC8vIGdldCB0aGUgc2NlbmVzKHdoaWNoIGFyZSBpbiBhcnJheXMpXG4gICAgICByZXR1cm4gcmVxdWlyZShcImpzb24hLi4vLi4vc2NlbmVzL1wiICsgc2NlbmVOYW1lICsgXCIvc2NlbmUuanNvblwiKVxuICAgIH0pXG4gICAgLnJlZHVjZShmdW5jdGlvbihwcmV2LCBjdXJyZW50KSB7IC8vIGZsYXR0ZW4gYXJyYXlzIGJ5IGNvbmNhdGluZyBpbnRvIGEgbmV3IGFycmF5XG4gICAgICByZXR1cm4gcHJldi5jb25jYXQoY3VycmVudCk7XG4gICAgfSwgW10pXG59XG5cbm1vZHVsZS5leHBvcnRzLmdldEF1ZGlvQ29uZmlnID0gZnVuY3Rpb24oKSB7XG5cbiAgcmV0dXJuIFNDRU5FX0lOREVYXG4gICAgLm1hcChzY2VuZSA9PiBzY2VuZSlcblxufVxuXG5cblxuLyoqIFdFQlBBQ0sgRk9PVEVSICoqXG4gKiogLi9zY2VuZS1tYWtlci91dGlscy9zY2VuZS11dGlscy5qc1xuICoqLyIsIm1vZHVsZS5leHBvcnRzID0gW1xuXHR7XG5cdFx0XCJpZFwiOiBcImludHJvXCIsXG5cdFx0XCJhdWRpb1wiOiB7XG5cdFx0XHRcInNyY1wiOiBcIjFcIixcblx0XHRcdFwibWF4XCI6IDAuMDFcblx0XHR9XG5cdH0sXG5cdHtcblx0XHRcImlkXCI6IFwiZG95b3VmZWVsbXVzbGltXCIsXG5cdFx0XCJhdWRpb1wiOiB7XG5cdFx0XHRcInNyY1wiOiBcIjFcIixcblx0XHRcdFwibWF4XCI6IDAuNVxuXHRcdH1cblx0fSxcblx0e1xuXHRcdFwiaWRcIjogXCJhYm91dHlvdXJzZWxmXCIsXG5cdFx0XCJhdWRpb1wiOiB7XG5cdFx0XHRcInNyY1wiOiBcIjFcIixcblx0XHRcdFwibWF4XCI6IDAuNVxuXHRcdH1cblx0fSxcblx0e1xuXHRcdFwiaWRcIjogXCJyZWFjdGlvbnN0b3RlcnJvclwiLFxuXHRcdFwiYXVkaW9cIjoge1xuXHRcdFx0XCJzcmNcIjogXCIyXCIsXG5cdFx0XHRcIm1heFwiOiAwLjNcblx0XHR9XG5cdH0sXG5cdHtcblx0XHRcImlkXCI6IFwiZmVlbGluZ2NvbmZ1c2VkXCIsXG5cdFx0XCJhdWRpb1wiOiB7XG5cdFx0XHRcInNyY1wiOiBcIjNcIixcblx0XHRcdFwibWF4XCI6IDAuNVxuXHRcdH1cblx0fSxcblx0e1xuXHRcdFwiaWRcIjogXCJvdXR0b2dldHlvdVwiLFxuXHRcdFwiYXVkaW9cIjoge1xuXHRcdFx0XCJzcmNcIjogXCIzXCIsXG5cdFx0XHRcIm1heFwiOiAwLjVcblx0XHR9XG5cdH0sXG5cdHtcblx0XHRcImlkXCI6IFwic29tZXRoaW5ndG9wcm92ZVwiLFxuXHRcdFwiYXVkaW9cIjoge1xuXHRcdFx0XCJzcmNcIjogXCI0XCIsXG5cdFx0XHRcIm1heFwiOiAwLjVcblx0XHR9XG5cdH0sXG5cdHtcblx0XHRcImlkXCI6IFwiaXRpc250ZWFzeVwiLFxuXHRcdFwiYXVkaW9cIjoge1xuXHRcdFx0XCJzcmNcIjogXCI1XCIsXG5cdFx0XHRcIm1heFwiOiAwLjVcblx0XHR9XG5cdH0sXG5cdHtcblx0XHRcImlkXCI6IFwibWl4ZWRmZWVsaW5nc1wiLFxuXHRcdFwiYXVkaW9cIjoge1xuXHRcdFx0XCJzcmNcIjogXCI2XCIsXG5cdFx0XHRcIm1heFwiOiAwLjVcblx0XHR9XG5cdH0sXG5cdHtcblx0XHRcImlkXCI6IFwiZGlmZmVyZW50cHJhY3RpY2VzXCIsXG5cdFx0XCJhdWRpb1wiOiB7XG5cdFx0XHRcInNyY1wiOiBcIjZcIixcblx0XHRcdFwibWF4XCI6IDAuNVxuXHRcdH1cblx0fSxcblx0e1xuXHRcdFwiaWRcIjogXCJ5ZXR0aGF0c29rYXlcIixcblx0XHRcImF1ZGlvXCI6IHtcblx0XHRcdFwic3JjXCI6IFwiNlwiLFxuXHRcdFx0XCJtYXhcIjogMC41XG5cdFx0fVxuXHR9LFxuXHR7XG5cdFx0XCJpZFwiOiBcIml0c2dvdHRvZW5kXCIsXG5cdFx0XCJhdWRpb1wiOiB7XG5cdFx0XHRcInNyY1wiOiBcIjdcIixcblx0XHRcdFwibWF4XCI6IDAuNVxuXHRcdH1cblx0fSxcblx0e1xuXHRcdFwiaWRcIjogXCJpd2FudG15aXNsYW1iYWNrMVwiLFxuXHRcdFwiYXVkaW9cIjoge1xuXHRcdFx0XCJzcmNcIjogXCI3XCIsXG5cdFx0XHRcIm1heFwiOiAwLjVcblx0XHR9XG5cdH0sXG5cdHtcblx0XHRcImlkXCI6IFwid2hvYXJldGhleVwiLFxuXHRcdFwiYXVkaW9cIjoge1xuXHRcdFx0XCJzcmNcIjogXCI3XCIsXG5cdFx0XHRcIm1heFwiOiAwLjVcblx0XHR9XG5cdH0sXG5cdHtcblx0XHRcImlkXCI6IFwiaXNpc2ZpZ2h0bWlzcXVvdGVcIixcblx0XHRcImF1ZGlvXCI6IHtcblx0XHRcdFwic3JjXCI6IFwiOFwiLFxuXHRcdFx0XCJtYXhcIjogMC41XG5cdFx0fVxuXHR9LFxuXHR7XG5cdFx0XCJpZFwiOiBcImlzaXNhcG9jYWx5cHNlbWlzcXVvdGVcIixcblx0XHRcImF1ZGlvXCI6IHtcblx0XHRcdFwic3JjXCI6IFwiOFwiLFxuXHRcdFx0XCJtYXhcIjogMC41XG5cdFx0fVxuXHR9LFxuXHR7XG5cdFx0XCJpZFwiOiBcImlzaXNhZnRlcmxpZmVmYWxsYWN5XCIsXG5cdFx0XCJhdWRpb1wiOiB7XG5cdFx0XHRcInNyY1wiOiBcIjhcIixcblx0XHRcdFwibWF4XCI6IDAuNVxuXHRcdH1cblx0fSxcblx0e1xuXHRcdFwiaWRcIjogXCJ3aGF0aXNsYW1pY2hpc3RvcnlwcmVmZXJzXCIsXG5cdFx0XCJhdWRpb1wiOiB7XG5cdFx0XHRcInNyY1wiOiBcIjEwXCIsXG5cdFx0XHRcIm1heFwiOiAwLjJcblx0XHR9XG5cdH0sXG5cdHtcblx0XHRcImlkXCI6IFwiaXNpc2JhbmtydXB0XCIsXG5cdFx0XCJhdWRpb1wiOiB7XG5cdFx0XHRcInNyY1wiOiBcIjEwXCIsXG5cdFx0XHRcIm1heFwiOiAwLjVcblx0XHR9XG5cdH0sXG5cdHtcblx0XHRcImlkXCI6IFwiaXNpc3dhbnRzdG9kaXZpZGVcIixcblx0XHRcImF1ZGlvXCI6IHtcblx0XHRcdFwic3JjXCI6IFwiN1wiLFxuXHRcdFx0XCJtYXhcIjogMC41XG5cdFx0fVxuXHR9LFxuXHR7XG5cdFx0XCJpZFwiOiBcImJhdHRsZW9mYWdlbmVyYXRpb25cIixcblx0XHRcImF1ZGlvXCI6IHtcblx0XHRcdFwic3JjXCI6IFwiOVwiLFxuXHRcdFx0XCJtYXhcIjogMC41XG5cdFx0fVxuXHR9LFxuXHR7XG5cdFx0XCJpZFwiOiBcImNvbXBsaWNhdGVkc2l0dWF0aW9uXCIsXG5cdFx0XCJhdWRpb1wiOiB7XG5cdFx0XHRcInNyY1wiOiBcIjhcIixcblx0XHRcdFwibWF4XCI6IDAuNVxuXHRcdH1cblx0fSxcblx0e1xuXHRcdFwiaWRcIjogXCJtdXNsaW1zYmVsaWV2ZWluZGl2aWR1YWxsaWZlXCIsXG5cdFx0XCJhdWRpb1wiOiB7XG5cdFx0XHRcInNyY1wiOiBcIjhcIixcblx0XHRcdFwibWF4XCI6IDAuNVxuXHRcdH1cblx0fSxcblx0e1xuXHRcdFwiaWRcIjogXCJ3ZXdpbGxwcm90ZWN0ZWFjaG90aGVyXCIsXG5cdFx0XCJhdWRpb1wiOiB7XG5cdFx0XHRcInNyY1wiOiBcIjlcIixcblx0XHRcdFwibWF4XCI6IDAuNVxuXHRcdH1cblx0fSxcblx0e1xuXHRcdFwiaWRcIjogXCJ3ZWFyZW5vdGFmcmFpZFwiLFxuXHRcdFwiYXVkaW9cIjoge1xuXHRcdFx0XCJzcmNcIjogXCI4XCIsXG5cdFx0XHRcIm1heFwiOiAwLjVcblx0XHR9XG5cdH0sXG5cdHtcblx0XHRcImlkXCI6IFwid2VhcmVjb21pbmdcIixcblx0XHRcImF1ZGlvXCI6IHtcblx0XHRcdFwic3JjXCI6IFwiOVwiLFxuXHRcdFx0XCJtYXhcIjogMC41XG5cdFx0fVxuXHR9LFxuXHR7XG5cdFx0XCJpZFwiOiBcImxpa2VwZWFjZVwiLFxuXHRcdFwiYXVkaW9cIjoge1xuXHRcdFx0XCJzcmNcIjogXCI5XCIsXG5cdFx0XHRcIm1heFwiOiAwLjAxXG5cdFx0fVxuXHR9XG5dO1xuXG5cbi8qKioqKioqKioqKioqKioqKlxuICoqIFdFQlBBQ0sgRk9PVEVSXG4gKiogLi9+L2pzb24tbG9hZGVyIS4vc2NlbmVzL2luZGV4Lmpzb25cbiAqKiBtb2R1bGUgaWQgPSAxNlxuICoqIG1vZHVsZSBjaHVua3MgPSAwXG4gKiovIiwidmFyIG1hcCA9IHtcblx0XCIuL2Fib3V0eW91cnNlbGYvc2NlbmUuaHRtbFwiOiAxOCxcblx0XCIuL2JhdHRsZW9mYWdlbmVyYXRpb24vc2NlbmUuaHRtbFwiOiAxOSxcblx0XCIuL2NvbXBsaWNhdGVkc2l0dWF0aW9uL3NjZW5lLmh0bWxcIjogMjAsXG5cdFwiLi9kaWZmZXJlbnRwcmFjdGljZXMvc2NlbmUuaHRtbFwiOiAyMSxcblx0XCIuL2RveW91ZmVlbG11c2xpbS9zY2VuZS5odG1sXCI6IDIyLFxuXHRcIi4vZXhwbG9zaW9uL3NjZW5lLmh0bWxcIjogMjMsXG5cdFwiLi9mZWVsaW5nY29uZnVzZWQvc2NlbmUuaHRtbFwiOiAyNCxcblx0XCIuL2ludHJvL3NjZW5lLmh0bWxcIjogMjUsXG5cdFwiLi9pc2lzYWZ0ZXJsaWZlZmFsbGFjeS9zY2VuZS5odG1sXCI6IDI2LFxuXHRcIi4vaXNpc2Fwb2NhbHlwc2VtaXNxdW90ZS9zY2VuZS5odG1sXCI6IDI3LFxuXHRcIi4vaXNpc2JhbmtydXB0L3NjZW5lLmh0bWxcIjogMjgsXG5cdFwiLi9pc2lzZmlnaHRtaXNxdW90ZS9zY2VuZS5odG1sXCI6IDI5LFxuXHRcIi4vaXNpc29iamVjdGl2ZS9zY2VuZS5odG1sXCI6IDMwLFxuXHRcIi4vaXNpc3dhbnRzdG9kaXZpZGUvc2NlbmUuaHRtbFwiOiAzMSxcblx0XCIuL2l0aXNudGVhc3kvc2NlbmUuaHRtbFwiOiAzMixcblx0XCIuL2l0c2dvdHRvZW5kL3NjZW5lLmh0bWxcIjogMzMsXG5cdFwiLi9pd2FudG15aXNsYW1iYWNrMS9zY2VuZS5odG1sXCI6IDM0LFxuXHRcIi4vbGlrZXBlYWNlL3NjZW5lLmh0bWxcIjogMzUsXG5cdFwiLi9taXhlZGZlZWxpbmdzL3NjZW5lLmh0bWxcIjogMzYsXG5cdFwiLi9tdXNsaW1zYmVsaWV2ZWluZGl2aWR1YWxsaWZlL3NjZW5lLmh0bWxcIjogMzcsXG5cdFwiLi9vdXR0b2dldHlvdS9zY2VuZS5odG1sXCI6IDM4LFxuXHRcIi4vcmVhY3Rpb25zdG90ZXJyb3Ivc2NlbmUuaHRtbFwiOiAzOSxcblx0XCIuL3NvbWV0aGluZ3RvcHJvdmUvc2NlbmUuaHRtbFwiOiA0MCxcblx0XCIuL3dlYXJlY29taW5nL3NjZW5lLmh0bWxcIjogNDEsXG5cdFwiLi93ZWFyZW5vdGFmcmFpZC9zY2VuZS5odG1sXCI6IDQyLFxuXHRcIi4vd2V3aWxscHJvdGVjdGVhY2hvdGhlci9zY2VuZS5odG1sXCI6IDQzLFxuXHRcIi4vd2hhdGlzbGFtaWNoaXN0b3J5cHJlZmVycy9zY2VuZS5odG1sXCI6IDQ0LFxuXHRcIi4vd2hhdHRoZXF1cmFucHJlZmVycy9zY2VuZS5odG1sXCI6IDQ1LFxuXHRcIi4vd2hvYXJldGhleS9zY2VuZS5odG1sXCI6IDQ2LFxuXHRcIi4vd2l0aGFsbHRoZWhhdHJlZC9zY2VuZS5odG1sXCI6IDQ3LFxuXHRcIi4veWV0dGhhdHNva2F5L3NjZW5lLmh0bWxcIjogNDhcbn07XG5mdW5jdGlvbiB3ZWJwYWNrQ29udGV4dChyZXEpIHtcblx0cmV0dXJuIF9fd2VicGFja19yZXF1aXJlX18od2VicGFja0NvbnRleHRSZXNvbHZlKHJlcSkpO1xufTtcbmZ1bmN0aW9uIHdlYnBhY2tDb250ZXh0UmVzb2x2ZShyZXEpIHtcblx0cmV0dXJuIG1hcFtyZXFdIHx8IChmdW5jdGlvbigpIHsgdGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIiArIHJlcSArIFwiJy5cIikgfSgpKTtcbn07XG53ZWJwYWNrQ29udGV4dC5rZXlzID0gZnVuY3Rpb24gd2VicGFja0NvbnRleHRLZXlzKCkge1xuXHRyZXR1cm4gT2JqZWN0LmtleXMobWFwKTtcbn07XG53ZWJwYWNrQ29udGV4dC5yZXNvbHZlID0gd2VicGFja0NvbnRleHRSZXNvbHZlO1xubW9kdWxlLmV4cG9ydHMgPSB3ZWJwYWNrQ29udGV4dDtcbndlYnBhY2tDb250ZXh0LmlkID0gMTc7XG5cblxuXG4vKioqKioqKioqKioqKioqKipcbiAqKiBXRUJQQUNLIEZPT1RFUlxuICoqIC4vc2NlbmVzIC4vfi9odG1sLWxvYWRlcj9hdHRycz1mYWxzZSFeXFwuXFwvLipcXC9zY2VuZVxcLmh0bWwkXG4gKiogbW9kdWxlIGlkID0gMTdcbiAqKiBtb2R1bGUgY2h1bmtzID0gMFxuICoqLyIsIm1vZHVsZS5leHBvcnRzID0gXCI8c3R5bGU+XFxuLmFib3V0LXlvdXJzZWxmIHtcXG4gICAgb3BhY2l0eTogMDtcXG59XFxuPC9zdHlsZT5cXG5cXG48ZGl2IGNsYXNzPVxcXCJhYm91dC15b3Vyc2VsZlxcXCI+XFxuICA8ZGl2IGNsYXNzPVxcXCJ0YWJsZVxcXCI+XFxuICAgIDxkaXYgY2xhc3M9XFxcInRhYmxlLWNlbnRlclxcXCI+XFxuICAgICAgPGRpdiBjbGFzcz1cXFwiZGlzcGxheS00IHRleHQtY2VudGVyZWRcXFwiPkhvdyBkbyB5b3UgZmVlbCBhYm91dCB5b3Vyc2VsZj88L2Rpdj5cXG4gICAgPC9kaXY+XFxuICA8L2Rpdj5cXG48L2Rpdj5cIjtcblxuXG4vKioqKioqKioqKioqKioqKipcbiAqKiBXRUJQQUNLIEZPT1RFUlxuICoqIC4vfi9odG1sLWxvYWRlcj9hdHRycz1mYWxzZSEuL3NjZW5lcy9hYm91dHlvdXJzZWxmL3NjZW5lLmh0bWxcbiAqKiBtb2R1bGUgaWQgPSAxOFxuICoqIG1vZHVsZSBjaHVua3MgPSAwXG4gKiovIiwibW9kdWxlLmV4cG9ydHMgPSBcIlxcbjxkaXYgY2xhc3M9XFxcImJhdHRsZS1vZi1hLWdlbmVyYXRpb24gZ3JleS16b25lXFxcIj5cXG5cXHQ8ZGl2IGNsYXNzPVxcXCJ0YWJsZSBcXFwiPlxcbiAgXFx0XFx0PGRpdiBjbGFzcz1cXFwidGFibGUtY2VudGVyXFxcIj5cXG4gICAgXFx0XFx0PGRpdiBjbGFzcz1cXFwiZGlzcGxheS00IHRleHQtY2VudGVyZWRcXFwiPldlIG11c3QgYmVnaW4gb3VyIGZpZ2h0IGZvciB0aGlzIGdlbmVyYXRpb24uPC9kaXY+XFxuICBcXHRcXHQ8L2Rpdj5cXG5cXHQ8L2Rpdj5cXG48L2Rpdj5cXG5cIjtcblxuXG4vKioqKioqKioqKioqKioqKipcbiAqKiBXRUJQQUNLIEZPT1RFUlxuICoqIC4vfi9odG1sLWxvYWRlcj9hdHRycz1mYWxzZSEuL3NjZW5lcy9iYXR0bGVvZmFnZW5lcmF0aW9uL3NjZW5lLmh0bWxcbiAqKiBtb2R1bGUgaWQgPSAxOVxuICoqIG1vZHVsZSBjaHVua3MgPSAwXG4gKiovIiwibW9kdWxlLmV4cG9ydHMgPSBcIlxcbjxzdHlsZT5cXG4gIC5sZWZ0LCAucmlnaHQge1xcbiAgICBmbG9hdDogbGVmdDtcXG4gIH1cXG4gIC50YWJsZSB7XFxuICAgIHBvc2l0aW9uOiByZWxhdGl2ZTtcXG4gIH1cXG4gIC50b28tbG9uZy1xdW90ZSB7XFxuICAgIHBvc2l0aW9uOiBmaXhlZDtcXG4gICAgdG9wOiAwO1xcbiAgICBsZWZ0OiAwO1xcbiAgICBmb250LXNpemU6IDYuNXZtaW47XFxuICAgIHRleHQtYWxpZ246IGNlbnRlcjtcXG4gICAgY29sb3I6IHJnYmEoMjU1LDI1NSwyNTUsMC4zKTtcXG4gICAgd2lkdGg6IDEwMCU7XFxuICAgIGhlaWdodDogMTAwJTtcXG4gICAgb3ZlcmZsb3c6IGhpZGRlbjtcXG4gICAgLypiYWNrZ3JvdW5kOiAjMzMzOyovXFxuICAgIHBhZGRpbmctdG9wOiA0dm1heDtcXG4gICAgLXdlYmtpdC1maWx0ZXI6IGJsdXIoMnB4KTtcXG4gIH1cXG4gIC50ZXh0LWNlbnRlcmVkIHtcXG4gICAgdGV4dC1hbGlnbjogY2VudGVyO1xcbiAgfVxcbiAgLm9uVG9wIHtcXG4gICAgei1pbmRleDogMjAwMDA7XFxuICB9XFxuPC9zdHlsZT5cXG5cXG48ZGl2IGNsYXNzPVxcXCJncmV5LXpvbmVcXFwiPlxcbiAgPGRpdiBjbGFzcz1cXFwidG9vLWxvbmctcXVvdGVcXFwiPlxcbiAgICA8c3Ryb25nPlRoZSBmYWlsdXJlPC9zdHJvbmc+IG9mIHRoZSBwb3N0Y29sb25pYWwgZWxpdGVzIHRvIDxzdHJvbmc+Y3JlYXRlIGdlbnVpbmUgZGVtb2NyYXRpYyBzb2NpZXRpZXM8L3N0cm9uZz4gYW5kIGZvc3RlciBhIHNlbnNlIG9mIG5hdGlvbmFsIHVuaXR5IDxzdHJvbmc+b3B0aW5nIGluc3RlYWQgZm9yIG1pbGl0YXJ5IGRpY3RhdG9yc2hpcHM8L3N0cm9uZz4gdGhhdCA8c3Ryb25nPmVyb2RlZCB0aGUgcG90ZW50aWFsIGZvciBlY29ub21pYyBhbmQgcG9saXRpY2FsIGRldmVsb3BtZW50PC9zdHJvbmc+IGNvdXBsZWQgd2l0aCB0aGUgaGlzdG9yaWMgbWlzdGFrZXMgb2YgQXJhYmljIHByb2dyZXNzaXZlIHBhcnRpZXMgYW5kIHRoZWlyIDxzdHJvbmc+YXBwZWFzZW1lbnQgdG93YXJkcyBhdXRvY3JhdGljIHJ1bGVyczwvc3Ryb25nPiBjb250cmlidXRpbmcgdG8gdGhlIDxzdHJvbmc+Y29tcGxldGUgZXZpc2NlcmF0aW9uIG9mIGFsdGVybmF0aXZlIHBvbGl0aWNhbCBmcmFtZXdvcmtzPC9zdHJvbmc+IHRoYXQgY291bGQgY3JlYXRlIG9yZ2FuaWMgcmVzaXN0YW5jZSB0b3dhcmRzIGV4dGVybmFsIG1lZGRsaW5nLCBoZWdlbW9ueSBhbmQgb3V0cmlnaHQgbWlsaXRhcnkgaW50ZXJ2ZW50aW9ucyBsZWF2aW5nIGEgPHN0cm9uZz5yYWRpY2FsIGludGVycHJldGF0aW9uIG9mIHJlbGlnaW9uIGFzIHRoZSBvbmx5IHJlbWFpbmluZyBpZGVvbG9naWNhbCBwbGF0Zm9ybSBjYXBhYmxlIG9mIG1vYmlsaXNpbmcgdGhlIGRpc2VuZnJhbmNoaXNlZDwvc3Ryb25nPiBleGFjZXJiYXRlZCBieSB0aGUgZ2xvYmFsIGRlY2xpbmUgb2YgdW5pdmVyc2FsIGlkZWFscyBhbmQgdGhlIDxzdHJvbmc+cmlzZSBvZiBpZGVudGl0eSBhcyBhIHByaW1lIG1vYmlsaXNlcjwvc3Ryb25nPiBhbmQgZW5hYmxlZCBieSBwb2xpdGljYWwgYW5kIDxzdHJvbmc+ZmluYW5jaWFsIHN1cHBvcnQgZnJvbSB0aGVvY3JhdGljIHJlZ2ltZXM8L3N0cm9uZz4gYWltaW5nIHRvIHNob3JlIHVwIHRoZWlyIGxlZ2l0aW1hY3kgYW5kIG1hZGUgd29yc2UgYnkgdGhlIDxzdHJvbmc+Y29sbGFwc2Ugb2YgdGhlIHJlZ2lvbmFsIHNlY3VyaXR5PC9zdHJvbmc+IG9yZGVyIGNyZWF0aW5nIHRoZSBjb25kaXRpb25zIGZvciA8c3Ryb25nPnByb3h5IHdhcnM8L3N0cm9uZz4gYW5kIHBvbGl0aWNhbCwgc29jaWFsIGFuZCBlY29ub21pYyB1cGhlYXZhbCBpbnRlbnNpZmllZCBieSBnZW8tcG9saXRpY2FsbHkgPHN0cm9uZz5pbmNvaGVyZW50IGludGVybmF0aW9uYWwgbWVkZGxpbmc8L3N0cm9uZz4gZXNjYWxhdGluZyBjb25mbGljdHMgYW5kIGxlYWRpbmcgdG8gYSA8c3Ryb25nPnBlcnBldHVhbCBzdGF0ZSBvZiBjaGFvczwvc3Ryb25nPiB1bmRlciB3aGljaCB0aGUgYXBwZWFsIG9mIGEgcmV2aXZhbGlzdCByZWxpZ2lvdXMtcG9saXRpY2FsIG9yZGVyIGVtYm9kaWVkIGJ5IHRoZSA8c3Ryb25nPmNhbGlwaGF0ZSBiZWNvbWVzIGF0dHJhY3RpdmU8L3N0cm9uZz4gcGFydGljdWxhcmx5IHdoZW4gY291cGxlZCB3aXRoIGEgbWlsbGVuYXJpYW4gYXBvY2FseXB0aWMgbmFycmF0aXZlLlxcbiAgPC9kaXY+XFxuICA8ZGl2IGNsYXNzPVxcXCJ0YWJsZSBvblRvcCBcXFwiPlxcbiAgICA8ZGl2IGNsYXNzPVxcXCJ0YWJsZS1jZW50ZXJcXFwiPlxcbiAgICAgIDxkaXYgY2xhc3M9XFxcImRpc3BsYXktNCB0ZXh0LWNlbnRlcmVkXFxcIj5UaGUgc2l0dWF0aW9uIG1heSBiZSBjb21wbGljYXRlZC4uLjwvZGl2PlxcbiAgICA8L2Rpdj5cXG4gIDwvZGl2PlxcbjwvZGl2PlxcblwiO1xuXG5cbi8qKioqKioqKioqKioqKioqKlxuICoqIFdFQlBBQ0sgRk9PVEVSXG4gKiogLi9+L2h0bWwtbG9hZGVyP2F0dHJzPWZhbHNlIS4vc2NlbmVzL2NvbXBsaWNhdGVkc2l0dWF0aW9uL3NjZW5lLmh0bWxcbiAqKiBtb2R1bGUgaWQgPSAyMFxuICoqIG1vZHVsZSBjaHVua3MgPSAwXG4gKiovIiwibW9kdWxlLmV4cG9ydHMgPSBcIjxkaXYgY2xhc3M9XFxcInRhYmxlXFxcIj5cXG4gIDxkaXYgY2xhc3M9XFxcInRhYmxlLWNlbnRlclxcXCI+XFxuICAgIDxkaXYgY2xhc3M9XFxcImRpc3BsYXktNCB0ZXh0LWNlbnRlcmVkXFxcIj5UaXJlZCBvZiBzZWVpbmcgYXR0YWNrcyBpbmNyZWFzZS4gPGJyPjxicj5cXG4gICAgICBUaXJlZCBvZiBmZWVsaW5nIGFwb2xvZ2V0aWMuPC9kaXY+XFxuICA8L2Rpdj5cXG48L2Rpdj5cXG5cIjtcblxuXG4vKioqKioqKioqKioqKioqKipcbiAqKiBXRUJQQUNLIEZPT1RFUlxuICoqIC4vfi9odG1sLWxvYWRlcj9hdHRycz1mYWxzZSEuL3NjZW5lcy9kaWZmZXJlbnRwcmFjdGljZXMvc2NlbmUuaHRtbFxuICoqIG1vZHVsZSBpZCA9IDIxXG4gKiogbW9kdWxlIGNodW5rcyA9IDBcbiAqKi8iLCJtb2R1bGUuZXhwb3J0cyA9IFwiPHN0eWxlPlxcbiAgI2RveW91ZmVlbG11c2xpbSAuYW5pbS0yIHtcXG4gICAgb3BhY2l0eTogMDtcXG4gIH1cXG4gIC52aWRlby1iYWNrZ3JvdW5kIHZpZGVvIHtcXG4gICAgd2lkdGg6IDEwMHZ3O1xcbiAgfVxcbiAgLnZpZGVvLWJhY2tncm91bmQge1xcbiAgICBwb3NpdGlvbjogZml4ZWQ7XFxuICAgIHRvcDogMDtcXG4gICAgbGVmdDogMDtcXG4gIH1cXG4gICNkb3lvdWZlZWxtdXNsaW0gLmRpc3BsYXktNCB7XFxuICAgIGJhY2tncm91bmQ6IGJsYWNrO1xcbiAgICBkaXNwbGF5OiBpbmxpbmUtYmxvY2s7XFxuICAgIHBhZGRpbmc6IDAuNXZ3O1xcbiAgfVxcbjwvc3R5bGU+XFxuPGRpdiBjbGFzcz1cXFwidmlkZW8tYmFja2dyb3VuZFxcXCI+XFxuICA8dmlkZW8gbG9vcCBtYXgtdm9sdW1lPVxcXCIwLjE3XFxcIiA+XFxuICAgIDxzb3VyY2Ugc3JjPVxcXCJpbWcvdGVycm9yaXN0LWF0dGFja3MubXA0XFxcIiB0eXBlPVxcXCJ2aWRlby9tcDRcXFwiPlxcbiAgPC92aWRlbz5cXG48L2Rpdj5cXG48ZGl2IGNsYXNzPVxcXCJ0YWJsZVxcXCI+XFxuICA8ZGl2IGNsYXNzPVxcXCJ0YWJsZS1jZW50ZXJcXFwiPlxcbiAgICA8ZGl2IGNsYXNzPVxcXCJkaXNwbGF5LTQgYW5pbS0xXFxcIj5Ib3cgZG8geW91IGZlZWwgYWJvdXQgeW91ciBJc2xhbT88L2Rpdj48YnIgLz48YnIgLz5cXG4gIDwvZGl2PlxcbjwvZGl2PlxcblwiO1xuXG5cbi8qKioqKioqKioqKioqKioqKlxuICoqIFdFQlBBQ0sgRk9PVEVSXG4gKiogLi9+L2h0bWwtbG9hZGVyP2F0dHJzPWZhbHNlIS4vc2NlbmVzL2RveW91ZmVlbG11c2xpbS9zY2VuZS5odG1sXG4gKiogbW9kdWxlIGlkID0gMjJcbiAqKiBtb2R1bGUgY2h1bmtzID0gMFxuICoqLyIsIm1vZHVsZS5leHBvcnRzID0gXCI8cCBjbGFzcz1cXFwiZXhwbG9zaW9uLWJ5bGluZVxcXCI+SGVyZSdzIGFuIGV4YW1wbGUgb2YgMTYgZWxlbWVudHMgc2NhbGluZywgZmFkaW5nIGFuZCBtb3ZpbmcgYXQgb25jZS48L3A+XFxuPHVsIGlkPVxcXCJkb21FeHBsb3Npb25MaXN0XFxcIj5cXG4gIDxsaSBjbGFzcz1cXFwiZG9tLWV4cGxvc2lvbi1pdGVtIGRlaS0xXFxcIj48L2xpPlxcbiAgPGxpIGNsYXNzPVxcXCJkb20tZXhwbG9zaW9uLWl0ZW0gZGVpLTJcXFwiPjwvbGk+XFxuICA8bGkgY2xhc3M9XFxcImRvbS1leHBsb3Npb24taXRlbSBkZWktM1xcXCI+PC9saT5cXG4gIDxsaSBjbGFzcz1cXFwiZG9tLWV4cGxvc2lvbi1pdGVtIGRlaS00XFxcIj48L2xpPlxcbiAgPGxpIGNsYXNzPVxcXCJkb20tZXhwbG9zaW9uLWl0ZW0gZGVpLTVcXFwiPjwvbGk+XFxuICA8bGkgY2xhc3M9XFxcImRvbS1leHBsb3Npb24taXRlbSBkZWktNlxcXCI+PC9saT5cXG4gIDxsaSBjbGFzcz1cXFwiZG9tLWV4cGxvc2lvbi1pdGVtIGRlaS03XFxcIj48L2xpPlxcbiAgPGxpIGNsYXNzPVxcXCJkb20tZXhwbG9zaW9uLWl0ZW0gZGVpLThcXFwiPjwvbGk+XFxuICA8bGkgY2xhc3M9XFxcImRvbS1leHBsb3Npb24taXRlbSBkZWktOVxcXCI+PC9saT5cXG4gIDxsaSBjbGFzcz1cXFwiZG9tLWV4cGxvc2lvbi1pdGVtIGRlaS0xMFxcXCI+PC9saT5cXG4gIDxsaSBjbGFzcz1cXFwiZG9tLWV4cGxvc2lvbi1pdGVtIGRlaS0xMVxcXCI+PC9saT5cXG4gIDxsaSBjbGFzcz1cXFwiZG9tLWV4cGxvc2lvbi1pdGVtIGRlaS0xMlxcXCI+PC9saT5cXG4gIDxsaSBjbGFzcz1cXFwiZG9tLWV4cGxvc2lvbi1pdGVtIGRlaS0xM1xcXCI+PC9saT5cXG4gIDxsaSBjbGFzcz1cXFwiZG9tLWV4cGxvc2lvbi1pdGVtIGRlaS0xNFxcXCI+PC9saT5cXG4gIDxsaSBjbGFzcz1cXFwiZG9tLWV4cGxvc2lvbi1pdGVtIGRlaS0xNVxcXCI+PC9saT5cXG4gIDxsaSBjbGFzcz1cXFwiZG9tLWV4cGxvc2lvbi1pdGVtIGRlaS0xNlxcXCI+PC9saT5cXG48L3VsPlxcblwiO1xuXG5cbi8qKioqKioqKioqKioqKioqKlxuICoqIFdFQlBBQ0sgRk9PVEVSXG4gKiogLi9+L2h0bWwtbG9hZGVyP2F0dHJzPWZhbHNlIS4vc2NlbmVzL2V4cGxvc2lvbi9zY2VuZS5odG1sXG4gKiogbW9kdWxlIGlkID0gMjNcbiAqKiBtb2R1bGUgY2h1bmtzID0gMFxuICoqLyIsIm1vZHVsZS5leHBvcnRzID0gXCI8c3R5bGU+XFxuLnVzLWFnYWluc3QtdGhlbSB7XFxuICAgIG9wYWNpdHk6IDA7XFxufVxcbjwvc3R5bGU+XFxuXFxuPGRpdiBjbGFzcz1cXFwidXMtYWdhaW5zdC10aGVtXFxcIj5cXG5cXHQ8ZGl2IGNsYXNzPVxcXCJ0YWJsZVxcXCI+XFxuXFx0ICA8ZGl2IGNsYXNzPVxcXCJ0YWJsZS1jZW50ZXJcXFwiPlxcblxcdCAgICA8ZGl2IGNsYXNzPVxcXCJkaXNwbGF5LTQgdGV4dC1jZW50ZXJlZFxcXCI+RmVlbHMgbGlrZSBpdCdzIHVzIGFnYWluc3QgdGhlbS4uLjwvZGl2PlxcblxcdCAgPC9kaXY+XFxuXFx0PC9kaXY+XFxuPC9kaXY+XCI7XG5cblxuLyoqKioqKioqKioqKioqKioqXG4gKiogV0VCUEFDSyBGT09URVJcbiAqKiAuL34vaHRtbC1sb2FkZXI/YXR0cnM9ZmFsc2UhLi9zY2VuZXMvZmVlbGluZ2NvbmZ1c2VkL3NjZW5lLmh0bWxcbiAqKiBtb2R1bGUgaWQgPSAyNFxuICoqIG1vZHVsZSBjaHVua3MgPSAwXG4gKiovIiwibW9kdWxlLmV4cG9ydHMgPSBcIjxzdHlsZT5cXG4vKiNpbnRybyB7XFxuICBwb3NpdGlvbjogZml4ZWQ7XFxuICB0b3A6IDE1dmg7XFxuICBsZWZ0OiAxMCU7XFxuICB3aWR0aDogODAlO1xcbiAgY29sb3I6ICNmZmY7XFxuICB0ZXh0LWFsaWduOiBjZW50ZXI7XFxuICB0ZXh0LXRyYW5zZm9ybTogdXBwZXJjYXNlO1xcbn0qL1xcbi5oZWxwLXRleHQge1xcblxcdHBvc2l0aW9uOiBhYnNvbHV0ZTtcXG5cXHRjb2xvcjogIzI5ZDtcXG5cXHRmb250LXNpemU6IDN2bWluO1xcbn1cXG4uaGVscC10ZXh0LXNraW4ge1xcblxcdGNvbG9yOiAjMjlkO1xcblxcdGZvbnQtc2l6ZTogM3ZtaW47XFxufVxcbi8qLmhlbHAtdGV4dCBpIHtcXG5cXHRmb250LXNpemU6IDV2bWluO1xcbn0qL1xcbi5iZXRhIHtcXG5cXHRvcGFjaXR5OiAwLjc7XFxuXFx0Zm9udC1zaXplOiAyLjV2bWluO1xcblxcbn1cXG48L3N0eWxlPlxcbjxkaXYgY2xhc3M9XFxcImludHJvXFxcIj5cXG5cXHQ8ZGl2IGNsYXNzPVxcXCJ0YWJsZSBcXFwiPlxcbiAgXFx0XFx0PGRpdiBjbGFzcz1cXFwidGFibGUtY2VudGVyXFxcIj5cXG4gICAgXFx0XFx0PGRpdiBjbGFzcz1cXFwiZGlzcGxheS0xIHRleHQtY2VudGVyZWRcXFwiPlxcblxcdFxcdFxcdFxcdFxcdDxpIGNsYXNzPVxcXCJmYSBmYS1tdXNpYyBhbmltYXRlZCBmbGFzaCBcXFwiIHN0eWxlPVxcXCJhbmltYXRpb24tZGVsYXk6IDEuNXM7XFxcIj48L2k+PGJyPjxicj5cXG5cXHRcXHRcXHRcXHRcXHRQYXJkb24gT3VyIER1c3QuIFdlIEFyZSBDdXJyZW50bHkgQmV0YSBUZXN0aW5nLiA8YnI+PGEgdGFyZ2V0PVxcXCJfYmxhbmtcXFwiIHN0eWxlPVxcXCJ0ZXh0LWRlY29yYXRpb246dW5kZXJsaW5lXFxcIiBocmVmPVxcXCJtYWlsdG86bXVzbGltc2FnYWluc3Rpc2lzZ3JvdXBAZ21haWwuY29tP3N1YmplY3Q9VGVjaGluY2FsIEZlZWRiYWNrXFxcIj5TdWJtaXQgVGVjaG5pY2FsIEZlZWRiYWNrPC9hPlxcblxcdFxcdFxcdFxcdFxcdDxiciA+PGJyPlxcbiAgICBcXHRcXHRcXHRQbGF5LCBza2lwLCBvciBzY3JvbGwgdG8gYmVnaW4gPGJyID5cXG5cXHRcXHRcXHRcXHRcXHQ8c3BhbiBjbGFzcz1cXFwiaGVscC10ZXh0LXNraW5cXFwiPlxcblxcdFxcdFxcdFxcdFxcdFxcdEFsbCBxdW90ZXMgYW5kIG5ld3Mgc291cmNlcyBhcmUgY2xpY2thYmxlLlxcblxcdFxcdFxcdFxcdFxcdDwvc3Bhbj5cXG5cXHRcXHRcXHQ8L2Rpdj5cXG4gIFxcdFxcdDwvZGl2PlxcblxcdDwvZGl2PlxcbjwvZGl2PlxcblxcbjxkaXYgY2xhc3M9XFxcImhlbHAtdGV4dFxcXCIgc3R5bGU9XFxcInRvcDogNHZtaW47cmlnaHQ6IDE2dm1pbjtcXFwiPlxcblxcdDxzcGFuIGNsYXNzPVxcXCJhbmltYXRlZCAgXFxcIiBzdHlsZT1cXFwiYW5pbWF0aW9uLWRlbGF5OiAycztcXFwiID5QbGF5L1BhdXNlIDxpIGNsYXNzPVxcXCJmYSBmYS1hcnJvdy1jaXJjbGUtcmlnaHRcXFwiPjwvaT48L3NwYW4+XFxuPC9kaXY+XFxuPGRpdiBjbGFzcz1cXFwiaGVscC10ZXh0XFxcIiBzdHlsZT1cXFwidG9wOiAxNC41dmg7cmlnaHQ6IDE2dm1pbjtcXFwiPlxcblxcdDxzcGFuIGNsYXNzPVxcXCJhbmltYXRlZCAgXFxcIiBzdHlsZT1cXFwiYW5pbWF0aW9uLWRlbGF5OiAycztcXFwiID5Ta2lwIDxpIGNsYXNzPVxcXCJmYSBmYS1hcnJvdy1jaXJjbGUtcmlnaHRcXFwiPjwvaT48L3NwYW4+XFxuPC9kaXY+XFxuXFxuPGRpdiBjbGFzcz1cXFwiaGVscC10ZXh0XFxcIiBzdHlsZT1cXFwiYm90dG9tOjN2aDtyaWdodDo0OHZ3O3RleHQtYWxpZ246Y2VudGVyXFxcIj5cXG5cXHQ8ZGl2IGNsYXNzPVxcXCJhbmltYXRlZCAgXFxcIiBzdHlsZT1cXFwiYW5pbWF0aW9uLWRlbGF5OiAycztcXFwiPjxkaXYgc3R5bGU9XFxcInBhZGRpbmctYm90dG9tOiAxdmg7XFxcIj5TY3JvbGw8L2Rpdj4gPGkgY2xhc3M9XFxcImZhIGZhLWFycm93LWNpcmNsZS1kb3duXFxcIj48L2k+PC9kaXY+XFxuPC9kaXY+XFxuXCI7XG5cblxuLyoqKioqKioqKioqKioqKioqXG4gKiogV0VCUEFDSyBGT09URVJcbiAqKiAuL34vaHRtbC1sb2FkZXI/YXR0cnM9ZmFsc2UhLi9zY2VuZXMvaW50cm8vc2NlbmUuaHRtbFxuICoqIG1vZHVsZSBpZCA9IDI1XG4gKiogbW9kdWxlIGNodW5rcyA9IDBcbiAqKi8iLCJtb2R1bGUuZXhwb3J0cyA9IFwiPHN0eWxlPlxcbiAgLnRhYmxlIGlucHV0IHtcXG4gICAgZm9udC1zaXplOiA5LjV2bWluO1xcbiAgICB3aWR0aDogNXZ3O1xcbiAgICBiYWNrZ3JvdW5kOiBibGFjaztcXG4gICAgYm9yZGVyOiBub25lO1xcbiAgICBjb2xvcjogd2hpdGU7XFxuICAgIGZvbnQtd2VpZ2h0OiBib2xkO1xcbiAgfVxcbiAgLmxlZnQtYWxpZ24gLnF1cmFuLXJlYWQge1xcbiAgICB0ZXh0LWFsaWduOiBsZWZ0O1xcbiAgfVxcbiAgLmNhbGN1bGF0b3Ige1xcbiAgICBiYWNrZ3JvdW5kOiBibGFjaztcXG4gICAgd2lkdGg6IDQ4dnc7XFxuICAgIG1hcmdpbjogMCBhdXRvO1xcbiAgICBwYWRkaW5nOiAydnc7XFxuICAgIG9wYWNpdHk6IDA7XFxuICB9XFxuICAjaXNpc2FmdGVybGlmZWZhbGxhY3kgLnF1b3RlIHtcXG4gICAgZm9udC1zdHlsZTogaXRhbGljO1xcbiAgfVxcbiAgLmVxdWFscy1jb250YWluZXIge1xcbiAgICB3aWR0aDogMTAwJTtcXG4gICAgcG9zaXRpb246IHJlbGF0aXZlO1xcbiAgICBwYWRkaW5nOiAzdm1pbiAwO1xcbiAgfVxcbiAgLmVxdWFscyB7XFxuICAgIHdpZHRoOiA4M3ZtaW47XFxuICAgIHBvc2l0aW9uOiBhYnNvbHV0ZTtcXG4gICAgYm9yZGVyOiAwLjJ2dyBzb2xpZDtcXG4gICAgcmlnaHQ6IDA7XFxuICB9XFxuICAuZXF1YWxzOmFmdGVyIHtcXG4gICAgY2xlYXI6IGJvdGg7XFxuICB9XFxuICAudGV4dC1yaWdodCB7XFxuICAgIHRleHQtYWxpZ246IHJpZ2h0O1xcbiAgfVxcbiAgLnRleHQtYm9sZCB7XFxuICAgIGZvbnQtd2VpZ2h0OiA3MDA7XFxuICB9XFxuPC9zdHlsZT5cXG5cXG48ZGl2IGNsYXNzPVxcXCJ0YWJsZVxcXCI+XFxuICA8ZGl2IGNsYXNzPVxcXCJ0YWJsZS1jZW50ZXJcXFwiIHN0eWxlPVxcXCJ3aWR0aDo1MCVcXFwiPlxcbiAgICA8ZGl2IGNsYXNzPVxcXCJkaXNwbGF5LTIgcHJlbWlzZSB0ZXh0LWJvbGRcXFwiPklTSVMgbWF5IGtpbGwgaW5ub2NlbnQgcGVvcGxlIGluZGlzY3JpbWluYXRlbHkuLi48L2Rpdj48YnI+PGJyPlxcbiAgICA8ZGl2IGNsYXNzPVxcXCJkaXNwbGF5LTIgY29uY2x1c2lvbiB0ZXh0LWJvbGRcXFwiPkhhdmUgdGhleSBldmVuIGltYWdpbmVkIGhvdyBoYXJhbSAoc2luZnVsKSB0aGF0IGlzPzwvZGl2PlxcbiAgPC9kaXY+XFxuICA8ZGl2IGNsYXNzPVxcXCJ0YWJsZS1jZW50ZXJcXFwiIHN0eWxlPVxcXCJ3aWR0aDo1MFxcXCI+XFxuICAgIDxkaXYgY2xhc3M9XFxcImRpc3BsYXktMyB0ZXh0LXJpZ2h0IGNhbGN1bGF0b3JcXFwiPlxcbiAgICAgIElmIHlvdSd2ZSBtdXJkZXJlZCA8aW5wdXQgdHlwZT1cXFwibnVtYmVyXFxcIiBpZD1cXFwibXVyZGVybnVtYmVyXFxcIiB2YWx1ZT1cXFwiMVxcXCIgbWluPVxcXCIxXFxcIiBzaXplPVxcXCIyXFxcIiAvPjwvc3Ryb25nPlxcbiAgICAgIDxkaXYgY2xhc3M9XFxcImRpc3BsYXktMSBlbXBoYXNpcyBjb25jbHVzaW9uXFxcIj5cXG4gICAgICAgICAgPGEgaHJlZj1cXFwiaHR0cDovL3F1cmFuLmNvbS81LzMyXFxcIiB0YXJnZXQ9XFxcIl9ibGFua1xcXCI+XFxuICAgICAgICAgICAgPHN0cm9uZz4uLi53aG9ldmVyIGtpbGxzIGEgc291bCAuLi4gaXQgaXMgYXMgaWYgaGUgaGFkIHNsYWluIG1hbmtpbmQgZW50aXJlbHkuPC9zdHJvbmc+XFxuICAgICAgICAgICAgPHNwYW4gY2xhc3M9XFxcInF1b3RlLXNvdXJjZSBjb25jbHVzaW9uXFxcIj5RdXInYW4gNTozMjwvc3Bhbj5cXG4gICAgICAgICAgPC9hPlxcbiAgICAgIDwvZGl2PiAgPGRpdj4qIDcgYmlsbGlvbiBwZW9wbGU8L2Rpdj48YnIgPlxcbiAgICAgIDxkaXYgY2xhc3M9XFxcImVxdWFscy1jb250YWluZXJcXFwiPlxcbiAgICAgICAgPGhyIGNsYXNzPVxcXCJlcXVhbHNcXFwiPjxiciA+XFxuICAgICAgPC9kaXY+XFxuICAgICAgVGhlIHdlaWdodCBvZiBtdXJkZXJpbmcgPGJyPiA8c3Ryb25nPjxzcGFuIGlkPVxcXCJtdXJkZXJ0b3RhbFxcXCI+PC9zcGFuPiBwZW9wbGUuPC9zdHJvbmc+PC9kaXY+XFxuICA8L2Rpdj5cXG48L2Rpdj5cXG5cXG48IS0tIFRPRE86IE1vdmUgdG8gYSBuZXcgc2NyaXB0LiAtLT5cXG5cXG48c2NyaXB0PlxcbiAgJChmdW5jdGlvbigpIHtcXG5cXG4gICAgdmFyIFBPUFVMQVRJT05fVE9UQUwgPSA3MDAwMDAwMDAwO1xcblxcbiAgICAvLyBpbml0aWFsaWF6ZVxcbiAgICB1cGRhdGVNdXJkZXJDYWxjdWxhdG9yKCk7XFxuXFxuICAgICQoXFxcIiNtdXJkZXJudW1iZXJcXFwiKS5vbignY2hhbmdlJywgZnVuY3Rpb24oKSB7XFxuICAgICAgdXBkYXRlTXVyZGVyQ2FsY3VsYXRvcigpXFxuICAgIH0pO1xcblxcbiAgICAkKFxcXCIjbXVyZGVybnVtYmVyXFxcIikub24oJ3Njcm9sbCcsIGZ1bmN0aW9uKCkge1xcbiAgICAgIGNvbnNvbGUubG9nKCdibHVyJylcXG4gICAgICAkKHRoaXMpLmJsdXIoKTtcXG4gICAgfSk7XFxuXFxuICAgIGZ1bmN0aW9uIHVwZGF0ZU11cmRlckNhbGN1bGF0b3IoKSB7XFxuICAgICAgdmFyIG11cmRlcm51bWJlciA9ICQoXFxcIiNtdXJkZXJudW1iZXJcXFwiKS52YWwoKTtcXG4gICAgICB2YXIgbXVyZGVyVG90YWwgID0gbXVyZGVybnVtYmVyICogUE9QVUxBVElPTl9UT1RBTDtcXG4gICAgICByZW5kZXIobXVyZGVyVG90YWwpO1xcbiAgICB9XFxuXFxuICAgIGZ1bmN0aW9uIHJlbmRlcihtdXJkZXJUb3RhbCkge1xcbiAgICAgICQoJyNtdXJkZXJ0b3RhbCcpLmh0bWwobXVyZGVyVG90YWwpO1xcbiAgICB9XFxuXFxuICB9KTtcXG48L3NjcmlwdD5cXG5cIjtcblxuXG4vKioqKioqKioqKioqKioqKipcbiAqKiBXRUJQQUNLIEZPT1RFUlxuICoqIC4vfi9odG1sLWxvYWRlcj9hdHRycz1mYWxzZSEuL3NjZW5lcy9pc2lzYWZ0ZXJsaWZlZmFsbGFjeS9zY2VuZS5odG1sXG4gKiogbW9kdWxlIGlkID0gMjZcbiAqKiBtb2R1bGUgY2h1bmtzID0gMFxuICoqLyIsIm1vZHVsZS5leHBvcnRzID0gXCIgIDxkaXYgY2xhc3M9XFxcInRhYmxlXFxcIj5cXG4gICAgPGRpdiBjbGFzcz1cXFwidGFibGUtY2VudGVyXFxcIiBzdHlsZT1cXFwid2lkdGg6NTAlXFxcIj5cXG4gICAgICA8aDEgY2xhc3M9XFxcInByZW1pc2VcXFwiPklTSVMgbWF5IGJlbGlldmUgdGhlIEFwb2NhbHlwc2UgaXMgbmVhci4uLi48L2gxPjxiciAvPjxiciAvPlxcbiAgICAgIDxoMSBjbGFzcz1cXFwiY29uY2x1c2lvblxcXCI+SGF2ZSB0aGV5IGNvbnN1bHRlZCB0aGUgUXVy4oCZYW4gb24gdGhpcyBtYXR0ZXI/PC9oMT5cXG4gICAgPC9kaXY+XFxuICAgIDxkaXYgY2xhc3M9XFxcInRhYmxlLWNlbnRlclxcXCIgc3R5bGU9XFxcIndpZHRoOjUwXFxcIj5cXG4gICAgICA8aDIgY2xhc3M9XFxcInF1cmFuLXJlYWQgcXVyYW4taGlkZGVuXFxcIj5cXG4gICAgICAgIDxhIGhyZWY9XFxcImh0dHA6Ly9xdXJhbi5jb20vNy8xODdcXFwiIHRhcmdldD1cXFwiX2JsYW5rXFxcIj5UaGV5IGFzayB0aGVlIG9mIHRoZSAoZGVzdGluZWQpIEhvdXIsIHdoZW4gd2lsbCBpdCBjb21lIHRvIHBvcnQuIFNheTogPHN0cm9uZz5Lbm93bGVkZ2UgdGhlcmVvZiBpcyB3aXRoIG15IExvcmQgb25seS4gSGUgYWxvbmUgd2lsbCBtYW5pZmVzdCBpdCBhdCBpdHMgcHJvcGVyIHRpbWUuLi48L3N0cm9uZz48c3BhbiBjbGFzcz1cXFwicXVvdGUtc291cmNlXFxcIj5RdXInYW4gNzoxODc8L3NwYW4+PC9hPjxicj48YnI+XFxuICAgICAgICAgPGEgaHJlZj1cXFwiaHR0cDovL3F1cmFuLmNvbS80MS80N1xcXCIgdGFyZ2V0PVxcXCJfYmxhbmtcXFwiPjxzdHJvbmc+VG8gSGltIFthbG9uZV08L3N0cm9uZz4gaXMgYXR0cmlidXRlZCAgPHN0cm9uZz5rbm93bGVkZ2Ugb2YgdGhlIEhvdXIuPC9zdHJvbmc+PHNwYW4gY2xhc3M9XFxcInF1b3RlLXNvdXJjZVxcXCI+UXVyYW4gNDE6NDc8L3NwYW4+PC9hPlxcbiAgICAgIDwvaDI+XFxuICAgIDwvZGl2PlxcbiAgPC9kaXY+XFxuXCI7XG5cblxuLyoqKioqKioqKioqKioqKioqXG4gKiogV0VCUEFDSyBGT09URVJcbiAqKiAuL34vaHRtbC1sb2FkZXI/YXR0cnM9ZmFsc2UhLi9zY2VuZXMvaXNpc2Fwb2NhbHlwc2VtaXNxdW90ZS9zY2VuZS5odG1sXG4gKiogbW9kdWxlIGlkID0gMjdcbiAqKiBtb2R1bGUgY2h1bmtzID0gMFxuICoqLyIsIm1vZHVsZS5leHBvcnRzID0gXCI8c3R5bGU+XFxuICAubGVmdCB7XFxuICAgIHdpZHRoOiA0MHZ3O1xcbiAgfVxcblxcbiAgLm5ld3Nzb3VyY2UtaG9yLFxcbiAgZ3JleXpvbmUtc3JjIHtcXG4gICAgbWF4LWhlaWdodDogNDB2aDtcXG4gICAgYm94LXNoYWRvdzogMCAxdncgMnZ3IHJnYmEoMCwgMCwgMCwgMC42KTtcXG4gIH1cXG5cXG4gIC5uZXdzc291cmNlcy1ob3Ige1xcbiAgICBwb3NpdGlvbjogYWJzb2x1dGU7XFxuICAgIHRvcDogMzV2aDtcXG4gICAgd2lkdGg6IDIzMHZ3O1xcbiAgICBoZWlnaHQ6IDUwdmg7XFxuICAgIC8qb3ZlcmZsb3c6IGhpZGRlbjsqL1xcbiAgICB0cmFuc2Zvcm06IHRyYW5zbGF0ZVgoMjUwJSk7XFxuICB9XFxuXFxuICAuYmxhY2stem9uZSB7XFxuICAgIGJhY2tncm91bmQ6IGJsYWNrO1xcbiAgICB3aWR0aDogMTAwdnc7XFxuICAgIGhlaWdodDogMTAwdmg7XFxuICB9XFxuLyogICNpdGlzbnRlYXN5IC5kaXNwbGF5LTQge1xcbiAgICBvcGFjaXR5OiAwO1xcbiAgfSovXFxuICAgLmRyb3BkZWFkIHtcXG4gICAgd2lkdGg6IDUwdnc7XFxuICB9XFxuICAuY3VubmluZzEge1xcbiAgICB0b3A6IDR2aDtcXG4gICAgcmlnaHQ6IDZ2dztcXG4gIH1cXG4gIC5jdW5uaW5nMiB7XFxuICAgIHRvcDogNDB2aDtcXG4gICAgcmlnaHQ6IDN2dztcXG4gIH1cXG4gIC5jdW5uaW5nMyB7XFxuICAgIGJvdHRvbTogNHZoO1xcbiAgICByaWdodDogNXZ3O1xcbiAgfVxcbiAgLmN1bm5pbmc0IHtcXG4gICAgYm90dG9tOiA1dmg7XFxuICAgIHJpZ2h0OiAzOXZ3O1xcbiAgfVxcbiAgLmN1bm5pbmc1IHtcXG4gICAgYm90dG9tOiAydmg7XFxuICAgIGxlZnQ6IDR2dztcXG4gIH1cXG4gIC5jdW5uaW5nNiB7XFxuICAgIGJvdHRvbTogMzB2aDtcXG4gICAgcmlnaHQ6IDIwdnc7XFxuICB9XFxuXFxuPC9zdHlsZT5cXG48ZGl2IGNsYXNzPVxcXCJncmV5LXpvbmUgdGFibGVcXFwiPlxcbiAgPGRpdiBjbGFzcz1cXFwiYmxhY2stem9uZSB0YWJsZS1jZW50ZXJcXFwiPlxcbiAgPGRpdiBjbGFzcz1cXFwiZGlzcGxheS00XFxcIiBzdHlsZT1cXFwid2lkdGg6NTAlXFxcIj5cXG4gIElTSVMgaXMgYmFua3J1cHQgYXMgYW4gaWRlb2xvZ3kuLi5cXG4gIDxicj5cXG4gIDxicj5cXG4gIDxzcGFuIGNsYXNzPVxcXCJjb25jbHVzaW9uXFxcIj5idXQgdGhleSBhcmUgY3VubmluZyB3aXRoIHN0cmF0ZWd5Ljwvc3Bhbj5cXG4gIDwvZGl2PlxcbiAgPGRpdiBjbGFzcz1cXFwibmV3c291cmNlc1xcXCI+XFxuICAgIDxhIHRhcmdldD1cXFwiX2JsYW5rXFxcIiBjbGFzcz1cXFwiY3VubmluZzFcXFwiIGhyZWY9XFxcImh0dHA6Ly93d3cubnl0aW1lcy5jb20vMjAxNS8wNi8xMy93b3JsZC9taWRkbGVlYXN0L2lzaXMtaXMtd2lubmluZy1tZXNzYWdlLXdhci11cy1jb25jbHVkZXMuaHRtbD9fcj0wXFxcIj5cXG4gICAgICAgIDxpbWcgY2xhc3M9XFxcIm5ld3Nzb3VyY2UtaG9yXFxcIiBzcmM9XFxcIi4vaW1nL2lzaXMtc3RyYXRlZ3ktc29jaWFsLnBuZ1xcXCI+XFxuICAgICAgPC9hPlxcbiAgICA8YSB0YXJnZXQ9XFxcIl9ibGFua1xcXCIgY2xhc3M9XFxcImN1bm5pbmcyXFxcIiBocmVmPVxcXCJodHRwOi8vbW9uZXkuY25uLmNvbS8yMDE1LzEyLzA2L25ld3MvaXNpcy1mdW5kaW5nL1xcXCI+XFxuICAgICAgICA8aW1nIGNsYXNzPVxcXCJuZXdzc291cmNlLWhvclxcXCIgc3JjPVxcXCIuL2ltZy9pc2lzLXN0cmF0ZWd5LWJpbGxpb25zLnBuZ1xcXCI+XFxuICAgICAgPC9hPlxcbiAgICA8YSB0YXJnZXQ9XFxcIl9ibGFua1xcXCIgY2xhc3M9XFxcImN1bm5pbmczXFxcIiBocmVmPVxcXCJodHRwOi8vbW9uZXkuY25uLmNvbS8yMDE1LzEyLzA2L25ld3MvaXNpcy1mdW5kaW5nL1xcXCI+XFxuICAgICAgICA8aW1nIGNsYXNzPVxcXCJuZXdzc291cmNlLWhvclxcXCIgc3JjPVxcXCIuL2ltZy9pc2lzLXN0cmF0ZWd5LWZsb3cucG5nXFxcIj5cXG4gICAgICA8L2E+XFxuICAgIDxhIHRhcmdldD1cXFwiX2JsYW5rXFxcIiBjbGFzcz1cXFwiY3VubmluZzRcXFwiIGhyZWY9XFxcImh0dHA6Ly93d3cud2FzaGluZ3RvbnRpbWVzLmNvbS9uZXdzLzIwMTYvamFuLzI3L2lzbGFtaWMtc3RhdGVzLWN5YmVyLWFybS1zZWVrcy1yZXZlbmdlLWhhY2tlcnMtZGVhL1xcXCI+XFxuICAgICAgICA8aW1nIGNsYXNzPVxcXCJuZXdzc291cmNlLWhvclxcXCIgc3JjPVxcXCIuL2ltZy9pc2lzLXN0cmF0ZWd5LWhhY2tlcnMucG5nXFxcIj5cXG4gICAgICA8L2E+XFxuICAgIDxhIHRhcmdldD1cXFwiX2JsYW5rXFxcIiBjbGFzcz1cXFwiY3VubmluZzVcXFwiIGhyZWY9XFxcImh0dHA6Ly93d3cudGhlYXRsYW50aWMuY29tL2ludGVybmF0aW9uYWwvYXJjaGl2ZS8yMDE1LzEwL3dhci1pc2lzLXVzLWNvYWxpdGlvbi80MTAwNDQvXFxcIj5cXG4gICAgICAgIDxpbWcgY2xhc3M9XFxcIm5ld3Nzb3VyY2UtaG9yXFxcIiBzcmM9XFxcIi4vaW1nL2lzaXMtc3RyYXRlZ3ktaHVtYW5pdHkucG5nXFxcIj5cXG4gICAgICA8L2E+XFxuICAgPGEgdGFyZ2V0PVxcXCJfYmxhbmtcXFwiIGNsYXNzPVxcXCJjdW5uaW5nNlxcXCIgaHJlZj1cXFwiaHR0cHM6Ly93d3cub3BlbmRlbW9jcmFjeS5uZXQvbmFmZWV6LWFobWVkL2lzaXMtd2FudHMtZGVzdHJveS1ncmV5em9uZS1ob3ctd2UtZGVmZW5kXFxcIj5cXG4gICAgICAgIDxpbWcgY2xhc3M9XFxcIm5ld3Nzb3VyY2UtaG9yIGdyZXl6b25lLXNyY1xcXCIgc3JjPVxcXCIuL2ltZy9pc2lzLXN0cmF0ZWd5LWdyZXl6b25lLnBuZ1xcXCI+XFxuICAgICAgPC9hPlxcbiAgPC9kaXY+XFxuPC9kaXY+XFxuPC9kaXY+XFxuXCI7XG5cblxuLyoqKioqKioqKioqKioqKioqXG4gKiogV0VCUEFDSyBGT09URVJcbiAqKiAuL34vaHRtbC1sb2FkZXI/YXR0cnM9ZmFsc2UhLi9zY2VuZXMvaXNpc2JhbmtydXB0L3NjZW5lLmh0bWxcbiAqKiBtb2R1bGUgaWQgPSAyOFxuICoqIG1vZHVsZSBjaHVua3MgPSAwXG4gKiovIiwibW9kdWxlLmV4cG9ydHMgPSBcIjxzdHlsZT5cXG4gICNpc2lzZmlnaHRtaXNxdW90ZSAucHJlbWlzZSxcXG4gICNpc2lzZmlnaHRtaXNxdW90ZSAuY29uY2x1c2lvblxcbiAgIHtcXG4gICAgIHBvc2l0aW9uOiBhYnNvbHV0ZTtcXG4gICAgIHdpZHRoOiA0MHZ3O1xcbiAgICAgYm90dG9tOiA0MHZoO1xcbiAgICAgb3BhY2l0eTogMDtcXG4gICB9XFxuICAgI21ha2V3aGl0ZXtcXG4gICAgZm9udC1jb2xvcjp3aGl0ZTtcXG4gICB9XFxuXFxuPC9zdHlsZT5cXG48ZGl2IGNsYXNzPVxcXCJ0YWJsZVxcXCI+XFxuICA8ZGl2IGNsYXNzPVxcXCJ0YWJsZS1jZW50ZXJcXFwiIHN0eWxlPVxcXCJ3aWR0aDo1MCVcXFwiPlxcbiAgICA8aDEgY2xhc3M9XFxcInByZW1pc2VcXFwiPklTSVMgbWF5IHF1b3RlIHRoZSBRdXInYW4uLi48L2gxPlxcbiAgICA8aDEgY2xhc3M9XFxcImNvbmNsdXNpb25cXFwiPkJ1dCBkb2VzIElTSVMgcmVhZCB0aGUgUXVyJ2FuPzwvaDE+XFxuICA8L2Rpdj5cXG4gIDxkaXYgY2xhc3M9XFxcInRhYmxlLWNlbnRlclxcXCIgc3R5bGU9XFxcIndpZHRoOjUwXFxcIj5cXG4gICAgPGgyIGNsYXNzPVxcXCJxdXJhbi1yZWFkXFxcIj5cXG4gICAgICA8YSBocmVmPVxcXCJodHRwOi8vcXVyYW4uY29tLzIvMTkwXFxcIiB0YXJnZXQ9XFxcIl9ibGFua1xcXCI+PHNwYW4gY2xhc3M9XFxcInF1cmFuLWhpZGRlblxcXCI+RmlnaHQgaW4gdGhlIGNhdXNlIG9mIEFsbGFoIDxzdHJvbmc+YWdhaW5zdCB0aG9zZSB3aG8gZmlnaHQgeW91PC9zdHJvbmc+LCBhbmQgPHN0cm9uZz5kbyBub3QgY29tbWl0IGFnZ3Jlc3Npb24uPC9zdHJvbmc+IDxzcGFuIGNsYXNzPVxcXCJxdW90ZS1zb3VyY2VcXFwiPlF1cmFuIDI6MTkwPC9zcGFuPjxicj48YnI+PC9zcGFuPjwvYT5cXG4gICAgICA8YSBocmVmPVxcXCJodHRwOi8vcXVyYW4uY29tLzIvMTkxXFxcIiB0YXJnZXQ9XFxcIl9ibGFua1xcXCI+S2lsbCB0aGVtLCB3aGVyZXZlciB5b3UgbWF5IGZpbmQgdGhlbSE8c3BhbiBjbGFzcz1cXFwicXVvdGUtc291cmNlXFxcIj5RdXInYW4gMjoxOTE8L3NwYW4+PGJyPjxicj48L2E+XFxuICAgICAgPGEgaHJlZj1cXFwiaHR0cDovL3F1cmFuLmNvbS8yLzE5M1xcXCIgdGFyZ2V0PVxcXCJfYmxhbmtcXFwiPjxzcGFuIGNsYXNzPVxcXCJxdXJhbi1oaWRkZW5cXFwiPi4uLmlmIHRoZXkgY2Vhc2UsIDxzdHJvbmc+bGV0IHRoZXJlIGJlIG5vIGhvc3RpbGl0eSBleGNlcHQgYWdhaW5zdCBvcHByZXNzb3JzPC9zdHJvbmc+LiA8c3BhbiBjbGFzcz1cXFwicXVvdGUtc291cmNlXFxcIj5RdXJhbiAyOjE5Mzwvc3Bhbj48L3NwYW4+PC9hPlxcbiAgICA8L2gyPlxcbiAgPC9kaXY+XFxuPC9kaXY+XFxuXCI7XG5cblxuLyoqKioqKioqKioqKioqKioqXG4gKiogV0VCUEFDSyBGT09URVJcbiAqKiAuL34vaHRtbC1sb2FkZXI/YXR0cnM9ZmFsc2UhLi9zY2VuZXMvaXNpc2ZpZ2h0bWlzcXVvdGUvc2NlbmUuaHRtbFxuICoqIG1vZHVsZSBpZCA9IDI5XG4gKiogbW9kdWxlIGNodW5rcyA9IDBcbiAqKi8iLCJtb2R1bGUuZXhwb3J0cyA9IFwiVGhleSBoYXMgYSBzaW1wbGUgb2JqZWN0aXZlIHRoZXnigJl2ZSBzdGF0ZWQuXFxuXCI7XG5cblxuLyoqKioqKioqKioqKioqKioqXG4gKiogV0VCUEFDSyBGT09URVJcbiAqKiAuL34vaHRtbC1sb2FkZXI/YXR0cnM9ZmFsc2UhLi9zY2VuZXMvaXNpc29iamVjdGl2ZS9zY2VuZS5odG1sXG4gKiogbW9kdWxlIGlkID0gMzBcbiAqKiBtb2R1bGUgY2h1bmtzID0gMFxuICoqLyIsIm1vZHVsZS5leHBvcnRzID0gXCI8c3R5bGU+XFxuICAjaXNpc3dhbnRzdG9kaXZpZGUgLmFuaW0tMiB7XFxuICAgIG9wYWNpdHk6IDA7XFxuICB9XFxuXFxuICAjaXNpc3dhbnRzdG9kaXZpZGUgLmRpc3BsYXktNCB7XFxuICAgIGJhY2tncm91bmQ6IGJsYWNrO1xcbiAgICBkaXNwbGF5OiBpbmxpbmUtYmxvY2s7XFxuICAgIHBhZGRpbmc6IDAuNXZ3O1xcbiAgfVxcbiAgLmNvbG9yLXpvbmUge1xcbiAgICBwb3NpdGlvbjogYWJzb2x1dGU7XFxuICAgIHdpZHRoOiAxMDB2dztcXG4gICAgaGVpZ2h0OiAxMDB2aDtcXG4gIH1cXG4gIC56b25lcyB7XFxuICAgIGhlaWdodDogMTAwdmg7XFxuICB9XFxuICAudmlvbGVudC16b25lcyB7XFxuICAgIHdpZHRoOiAxMHZ3O1xcbiAgICBwb3NpdGlvbjogcmVsYXRpdmU7XFxuICAgIHotaW5kZXg6IDI7XFxuICB9XFxuICAuZ3JleS16b25lIHtcXG4gICAgYmFja2dyb3VuZDogIzc0N0I4MVxcbiAgfVxcbiAgLndoaXRlLXpvbmUge1xcbiAgICBiYWNrZ3JvdW5kOiB3aGl0ZTtcXG4gICAgZmxvYXQ6bGVmdDtcXG4gIH1cXG4gIC5ibGFjay16b25lIHtcXG4gICAgYmFja2dyb3VuZDogYmxhY2s7XFxuICAgIGZsb2F0OnJpZ2h0O1xcbiAgfVxcbiAgI2lzaXN3YW50c3RvZGl2aWRlIC5kaXNwbGF5LTR7XFxuICAgIHBvc2l0aW9uOiByZWxhdGl2ZTtcXG4gICAgei1pbmRleDogMztcXG4gIH1cXG48L3N0eWxlPlxcbjxkaXYgY2xhc3M9XFxcImNvbG9yLXpvbmVcXFwiPlxcbiAgPGRpdiBjbGFzcz1cXFwiem9uZXMgYmxhY2stem9uZSB2aW9sZW50LXpvbmVzXFxcIj48L2Rpdj5cXG4gIDxkaXYgY2xhc3M9XFxcInpvbmVzIHdoaXRlLXpvbmUgdmlvbGVudC16b25lc1xcXCI+PC9kaXY+XFxuPC9kaXY+XFxuPGRpdiBjbGFzcz1cXFwidGFibGUgZ3JleS16b25lXFxcIj5cXG4gIDxkaXYgY2xhc3M9XFxcInRhYmxlLWNlbnRlclxcXCI+XFxuICAgIDxkaXYgY2xhc3M9XFxcImRpc3BsYXktNCBhbmltLTJcXFwiPlRoZXkgd2FudCB0byBkaXZpZGUgdXMgYWxsLDwvZGl2PjxiciAvPlxcbiAgICA8ZGl2IGNsYXNzPVxcXCJkaXNwbGF5LTQgYW5pbS0yXFxcIj5kZXN0cm95IHRoZSBncmV5IHpvbmUgb2YgY29leGlzdGVuY2UsPC9kaXY+PGJyIC8+XFxuICAgIDxkaXYgY2xhc3M9XFxcImRpc3BsYXktNCBhbmltLTJcXFwiPmFuZCBzdGFydCBhbm90aGVyIGdyZWF0IHdhci48L2Rpdj48YnIgLz48YnIgLz5cXG4gICAgPGRpdiBjbGFzcz1cXFwiZGlzcGxheS00IGFuaW0tMVxcXCI+V2Ugd29uJ3QgbGV0IHRoYXQgaGFwcGVuLjwvZGl2PlxcbiAgPC9kaXY+XFxuPC9kaXY+XFxuXCI7XG5cblxuLyoqKioqKioqKioqKioqKioqXG4gKiogV0VCUEFDSyBGT09URVJcbiAqKiAuL34vaHRtbC1sb2FkZXI/YXR0cnM9ZmFsc2UhLi9zY2VuZXMvaXNpc3dhbnRzdG9kaXZpZGUvc2NlbmUuaHRtbFxuICoqIG1vZHVsZSBpZCA9IDMxXG4gKiogbW9kdWxlIGNodW5rcyA9IDBcbiAqKi8iLCJtb2R1bGUuZXhwb3J0cyA9IFwiPHN0eWxlPlxcbiAgLmxlZnQge1xcbiAgICB3aWR0aDogNDB2dztcXG4gIH1cXG4gIC5uZXdzc291cmNlIHtcXG4gICAgbWF4LWhlaWdodDogNDB2aDtcXG4gICAgZGlzcGxheTogYmxvY2s7XFxuICAgIGJveC1zaGFkb3c6IDAgMXZ3IDJ2dyByZ2JhKDAsMCwwLDAuNik7XFxuICAgIG1hcmdpbi1ib3R0b206IDV2aDtcXG4gIH1cXG4gIC5uZXdzb3VyY2VzIHtcXG4gICAgcG9zaXRpb246IGFic29sdXRlO1xcbiAgICB3aWR0aDogMTAwdnc7XFxuICAgIGhlaWdodDogMTAwdmg7XFxuICAgIHRvcDogMDtcXG4gICAgbGVmdDogMDtcXG4gICAgLypvdmVyZmxvdzogaGlkZGVuOyovXFxuICAgIC8qdHJhbnNmb3JtOiB0cmFuc2xhdGVZKDgwJSk7Ki9cXG4gIH1cXG4gIC5uZXdzb3VyY2VzIGEge1xcbiAgICBtYXgtd2lkdGg6IDQwdnc7XFxuICAgIHBvc2l0aW9uOiBhYnNvbHV0ZTtcXG4gICAgb3BhY2l0eTogMDtcXG4gIH1cXG4vKiAgI2l0aXNudGVhc3kgLmRpc3BsYXktNCB7XFxuICAgIG9wYWNpdHk6IDA7XFxuICB9Ki9cXG4gIC5pc250ZWFzeV8xIHtcXG4gICAgdG9wOiA4dmg7XFxuICAgIHJpZ2h0OiA1dnc7XFxuICB9XFxuICAgLmlzbnRlYXN5XzIge1xcbiAgICB0b3A6IDI4dmg7XFxuICAgIHJpZ2h0OiA1dnc7XFxuICB9XFxuICAuaXNudGVhc3lfMyB7XFxuICAgIHRvcDogNDV2aDtcXG4gICAgcmlnaHQ6IDV2dztcXG4gIH1cXG4gIC5pc250ZWFzeV80IHtcXG4gICAgdG9wOiA2MHZoO1xcbiAgICByaWdodDogNXZ3O1xcbiAgfVxcbiAgLmlzbnRlYXN5XzUge1xcbiAgICB0b3A6IDYwdmg7XFxuICAgIHJpZ2h0OiAyMHZ3O1xcbiAgfVxcbiAgLmlzbnRlYXN5XzYge1xcbiAgICB0b3A6IDY1dmg7XFxuICAgIHJpZ2h0OiAzMnZ3O1xcbiAgfVxcbiAgLmlzbnRlYXN5Xzcge1xcbiAgICB0b3A6IDYydmg7XFxuICAgIHJpZ2h0OiA1MHZ3O1xcbiAgfVxcbiAgLmlzbnRlYXN5Xzgge1xcbiAgICB0b3A6IDY2dmg7XFxuICAgIHJpZ2h0OiA2NXZ3O1xcbiAgfVxcbiAgIC5pc250ZWFzeV85IHtcXG4gICAgdG9wOiA1dmg7XFxuICAgIHJpZ2h0OiA2NXZ3O1xcbiAgfVxcbiAgIC5pc250ZWFzeV8xMCB7XFxuICAgIHRvcDogM3ZoO1xcbiAgICByaWdodDogNTB2dztcXG4gIH1cXG4gICAuaXNudGVhc3lfMTEge1xcbiAgICB0b3A6IDl2aDtcXG4gICAgcmlnaHQ6IDM4dnc7XFxuICB9XFxuICAgLmlzbnRlYXN5XzEyIHtcXG4gICAgdG9wOiA1dmg7XFxuICAgIHJpZ2h0OiAyMHZ3O1xcbiAgfVxcbiAgIC5pc250ZWFzeV8xMyB7XFxuICAgIHRvcDogMzV2aDtcXG4gICAgcmlnaHQ6IDI4dnc7XFxuICB9XFxuPC9zdHlsZT5cXG48ZGl2IGNsYXNzPVxcXCJ0YWJsZVxcXCI+XFxuICA8ZGl2IGNsYXNzPVxcXCJ0YWJsZS1jZW50ZXJcXFwiPlxcbiAgPGRpdiBjbGFzcz1cXFwiZGlzcGxheS00IGxlZnRcXFwiPkl0IGlzbuKAmXQgZWFzeSBiZWluZyBNdXNsaW0gYW55d2hlcmXigKYgPC9kaXY+XFxuICA8ZGl2IGNsYXNzPVxcXCJuZXdzb3VyY2VzXFxcIj5cXG4gICAgPGEgdGFyZ2V0PVxcXCJfYmxhbmtcXFwiIGNsYXNzPVxcXCJpc250ZWFzeV8xXFxcIiBocmVmPVxcXCJodHRwOi8vY29udGVudC50aW1lLmNvbS90aW1lL2NvdmVycy8wLDE2NjQxLDIwMTAwODMwLDAwLmh0bWxcXFwiPlxcbiAgICAgIDxpbWcgY2xhc3M9XFxcIm5ld3Nzb3VyY2VcXFwiIHNyYz1cXFwiLi9pbWcvaGF0ZWNyaW1lLWFtZXJpY2EuanBnXFxcIiA+XFxuICAgIDwvYT5cXG4gICAgPGEgdGFyZ2V0PVxcXCJfYmxhbmtcXFwiIGNsYXNzPVxcXCJpc250ZWFzeV8yXFxcIiBocmVmPVxcXCJodHRwOi8vYW1lcmljYS5hbGphemVlcmEuY29tL2FydGljbGVzLzIwMTUvMTIvOS91cy1tdXNsaW1zLWV4cGVyaWVuY2Utc3VyZ2UtaW4taXNsYW1vcGhvYmljLWF0dGFja3MuaHRtbFxcXCI+XFxuICAgICAgPGltZyBjbGFzcz1cXFwibmV3c3NvdXJjZVxcXCIgc3JjPVxcXCIuL2ltZy9oYXRlY3JpbWUtYW1lcmljYTIucG5nXFxcIiA+XFxuICAgIDwvYT5cXG4gICAgPGEgdGFyZ2V0PVxcXCJfYmxhbmtcXFwiIGNsYXNzPVxcXCJpc250ZWFzeV8zXFxcIiBocmVmPVxcXCJodHRwOi8vd3d3LmlucXVpc2l0ci5jb20vMjYxMDcxNy9oYXRlLWNyaW1lLXN0cmluZy1vZi1hbnRpLW11c2xpbS1hdHRhY2tzLWhpdC1jYW5hZGEuaHRtbFxcXCI+XFxuICAgICAgPGltZyBjbGFzcz1cXFwibmV3c3NvdXJjZVxcXCIgc3JjPVxcXCIuL2ltZy9oYXRlY3JpbWUtY2FuYWRhLnBuZ1xcXCIgPlxcbiAgICA8L2E+XFxuICAgIDxhIHRhcmdldD1cXFwiX2JsYW5rXFxcIiBjbGFzcz1cXFwiaXNudGVhc3lfNFxcXCIgaHJlZj1cXFwiaHR0cDovL2FtZXJpY2EuYWxqYXplZXJhLmNvbS9hcnRpY2xlcy8yMDE1LzIvMTcvdGhyZWF0cy10by1tdXNsaW0tYW1lcmljYW4tY29tbXVuaXR5LWludGVuc2lmaWVzLWFmdGVyLWNoYXBlbC1oaWxsLXNob290aW5nLmh0bWxcXFwiPlxcbiAgICAgIDxpbWcgY2xhc3M9XFxcIm5ld3Nzb3VyY2VcXFwiIHNyYz1cXFwiLi9pbWcvaGF0ZWNyaW1lLWNoYXBlbGhpbGwucG5nXFxcIiA+XFxuICAgIDwvYT5cXG4gICAgPGEgdGFyZ2V0PVxcXCJfYmxhbmtcXFwiIGNsYXNzPVxcXCJpc250ZWFzeV81XFxcIiBocmVmPVxcXCJodHRwOi8vd3d3LnRlbGVncmFwaC5jby51ay9uZXdzL3dvcmxkbmV3cy9ldXJvcGUvZnJhbmNlLzEyMDc1MDE4L0hhdGUtY3JpbWVzLWFnYWluc3QtTXVzbGltcy1hbmQtSmV3cy1zb2FyLWluLUZyYW5jZS5odG1sXFxcIj5cXG4gICAgICA8aW1nIGNsYXNzPVxcXCJuZXdzc291cmNlXFxcIiBzcmM9XFxcIi4vaW1nL2hhdGVjcmltZS1mcmFuY2UucG5nXFxcIiA+XFxuICAgIDwvYT5cXG4gICAgPGEgdGFyZ2V0PVxcXCJfYmxhbmtcXFwiIGNsYXNzPVxcXCJpc250ZWFzeV82XFxcIiBocmVmPVxcXCJodHRwczovL3d3dy53YXNoaW5ndG9ucG9zdC5jb20vd29ybGQvZXVyb3BlL3JlbGlnaW91cy1saWJlcnRpZXMtdW5kZXItc3RyYWluLWZvci1tdXNsaW1zLWluLWZyYW5jZS8yMDE1LzExLzIyLzgzMDU0YzA2LTkxMmYtMTFlNS1iZWZhLTk5Y2VlYmNiYjI3Ml9zdG9yeS5odG1sXFxcIj5cXG4gICAgICA8aW1nIGNsYXNzPVxcXCJuZXdzc291cmNlXFxcIiBzcmM9XFxcIi4vaW1nL2hhdGVjcmltZS1mcmFuY2UyLnBuZ1xcXCIgPlxcbiAgICA8L2E+XFxuICAgIDxhIHRhcmdldD1cXFwiX2JsYW5rXFxcIiBjbGFzcz1cXFwiaXNudGVhc3lfN1xcXCIgaHJlZj1cXFwiaHR0cDovL2xvc2FuZ2VsZXMuY2JzbG9jYWwuY29tLzIwMTUvMTIvMTMvMi1tb3NxdWVzLWluLWhhd3Rob3JuZS12YW5kYWxpemVkLXdpdGgtZ3JhZmZpdGkvXFxcIj5cXG4gICAgICA8aW1nIGNsYXNzPVxcXCJuZXdzc291cmNlXFxcIiBzcmM9XFxcIi4vaW1nL2hhdGVjcmltZS1ncmVuYWRlZ3JhZmZpdGkucG5nXFxcIiA+XFxuICAgIDwvYT5cXG4gICAgPGEgdGFyZ2V0PVxcXCJfYmxhbmtcXFwiIGNsYXNzPVxcXCJpc250ZWFzeV84XFxcIiBocmVmPVxcXCJodHRwOi8va3RsYS5jb20vMjAxNS8xMi8xMS9wb3NzaWJsZS1oYXRlLWNyaW1lLWludmVzdGlnYXRlZC1hZnRlci1tYW4tcHVsbHMtb3V0LWtuaWZlLW9uLW11c2xpbS13b21hbi1pbi1jaGluby1oaWxscy1zaGVyaWZmcy1kZXBhcnRtZW50L1xcXCI+XFxuICAgICAgPGltZyBjbGFzcz1cXFwibmV3c3NvdXJjZVxcXCIgc3JjPVxcXCIuL2ltZy9oYXRlY3JpbWUta25pZmUucG5nXFxcIiA+XFxuICAgIDwvYT5cXG4gICAgPGEgdGFyZ2V0PVxcXCJfYmxhbmtcXFwiIGNsYXNzPVxcXCJpc250ZWFzeV85XFxcIiBocmVmPVxcXCJodHRwOi8vd3d3LmNubi5jb20vMjAxNS8xMi8xMi91cy9jYWxpZm9ybmlhLW1vc3F1ZS1maXJlL1xcXCI+XFxuICAgICAgPGltZyBjbGFzcz1cXFwibmV3c3NvdXJjZVxcXCIgc3JjPVxcXCIuL2ltZy9oYXRlY3JpbWUtbW9zcXVlZmlyZS5wbmdcXFwiID5cXG4gICAgPC9hPlxcbiAgICA8YSB0YXJnZXQ9XFxcIl9ibGFua1xcXCIgY2xhc3M9XFxcImlzbnRlYXN5XzEwXFxcIiBocmVmPVxcXCJodHRwOi8vd3d3LmZveG5ld3MuY29tL3RyYW5zY3JpcHQvMjAxNC8xMC8wNy9iaWxsLW9yZWlsbHktaXNsYW0tZGVzdHJ1Y3RpdmUtZm9yY2Utd29ybGQvXFxcIj5cXG4gICAgICA8aW1nIGNsYXNzPVxcXCJuZXdzc291cmNlXFxcIiBzcmM9XFxcIi4vaW1nL2hhdGVjcmltZS1vcmVpbGx5LnBuZ1xcXCIgPlxcbiAgICA8L2E+XFxuICAgIDxhIHRhcmdldD1cXFwiX2JsYW5rXFxcIiBjbGFzcz1cXFwiaXNudGVhc3lfMTFcXFwiIGhyZWY9XFxcImh0dHA6Ly93d3cubnlkYWlseW5ld3MuY29tL25ld3MvbmF0aW9uYWwvbXVzbGltLWdhLWdpcmwtY2xhc3MtZ2FzcGVkLXRlYWNoZXItYm9tYi1qb2tlLWFydGljbGUtMS4yNDYzNDk1XFxcIj5cXG4gICAgICA8aW1nIGNsYXNzPVxcXCJuZXdzc291cmNlIGhpZGVzb3VyY2VcXFwiIHNyYz1cXFwiLi9pbWcvaGF0ZWNyaW1lLXN0dWRlbnRiYWNrcGFjay5wbmdcXFwiID5cXG4gICAgPC9hPlxcbiAgICA8YSB0YXJnZXQ9XFxcIl9ibGFua1xcXCIgY2xhc3M9XFxcImlzbnRlYXN5XzEyXFxcIiBocmVmPVxcXCJodHRwOi8vdGltZS5jb20vNDEzOTQ3Ni9kb25hbGQtdHJ1bXAtc2h1dGRvd24tbXVzbGltLWltbWlncmF0aW9uL1xcXCI+XFxuICAgICAgPGltZyBjbGFzcz1cXFwibmV3c3NvdXJjZSBoaWRlc291cmNlXFxcIiBzcmM9XFxcIi4vaW1nL2hhdGVjcmltZS10cnVtcC5wbmdcXFwiID5cXG4gICAgPC9hPlxcbiAgICA8YSB0YXJnZXQ9XFxcIl9ibGFua1xcXCIgY2xhc3M9XFxcImlzbnRlYXN5XzEzXFxcIiBocmVmPVxcXCJodHRwczovL3RvZGF5LnlvdWdvdi5jb20vbmV3cy8yMDE1LzEyLzExL3R3by10aGlyZHMtcmVwdWJsaWNhbnMtYmFjay10cnVtcC1wcm9wb3NhbC9cXFwiPlxcbiAgICAgIDxpbWcgY2xhc3M9XFxcIm5ld3Nzb3VyY2UgdHJ1bXBcXFwiIHNyYz1cXFwiLi9pbWcvaGF0ZWNyaW1lLXBvbGwucG5nXFxcIiA+XFxuICAgIDwvYT5cXG4gIDwvZGl2PlxcbjwvZGl2PlxcbjwvZGl2PlxcblwiO1xuXG5cbi8qKioqKioqKioqKioqKioqKlxuICoqIFdFQlBBQ0sgRk9PVEVSXG4gKiogLi9+L2h0bWwtbG9hZGVyP2F0dHJzPWZhbHNlIS4vc2NlbmVzL2l0aXNudGVhc3kvc2NlbmUuaHRtbFxuICoqIG1vZHVsZSBpZCA9IDMyXG4gKiogbW9kdWxlIGNodW5rcyA9IDBcbiAqKi8iLCJtb2R1bGUuZXhwb3J0cyA9IFwiXFxuXFxuPGRpdiBjbGFzcz1cXFwidGFibGVcXFwiPlxcbiAgPGRpdiBjbGFzcz1cXFwidGFibGUtY2VudGVyXFxcIj5cXG4gICAgPGRpdiBjbGFzcz1cXFwiZGlzcGxheS00IHRleHQtYm9sZCB0ZXh0LWNlbnRlcmVkXFxcIj5JU0lTIGlzIDxzcGFuIHN0eWxlPVxcXCJjb2xvcjojQUIyRTJFXFxcIiBpZD1cXFwibXVyZGVyXFxcIj5tdXJkZXJpbmc8L3NwYW4+IElzbGFtJ3MgbmFtZTwvZGl2PlxcbiAgPC9kaXY+XFxuPC9kaXY+XFxuXFxuXFxuPCEtLVxcblZpZXcgb2YgSVNJUyBPdmVyd2hlbG1pbmdseSBOZWdhdGl2ZSAoUGV3IGJhciBncmFwaClcXG5odHRwOi8vd3d3LnBld3Jlc2VhcmNoLm9yZy9mYWN0LXRhbmsvMjAxNS8xMS8xNy9pbi1uYXRpb25zLXdpdGgtc2lnbmlmaWNhbnQtbXVzbGltLXBvcHVsYXRpb25zLW11Y2gtZGlzZGFpbi1mb3ItaXNpcy9mdF8xNS0xMS0xN19pc2lzX3ZpZXdzL1xcbiAtLT5cXG5cIjtcblxuXG4vKioqKioqKioqKioqKioqKipcbiAqKiBXRUJQQUNLIEZPT1RFUlxuICoqIC4vfi9odG1sLWxvYWRlcj9hdHRycz1mYWxzZSEuL3NjZW5lcy9pdHNnb3R0b2VuZC9zY2VuZS5odG1sXG4gKiogbW9kdWxlIGlkID0gMzNcbiAqKiBtb2R1bGUgY2h1bmtzID0gMFxuICoqLyIsIm1vZHVsZS5leHBvcnRzID0gXCI8ZGl2IGNsYXNzPVxcXCJ0YWJsZVxcXCI+XFxuICA8ZGl2IGNsYXNzPVxcXCJ0YWJsZS1jZW50ZXJcXFwiPlxcbiAgICA8ZGl2IGNsYXNzPVxcXCJkaXNwbGF5LTQgdGV4dC1jZW50ZXJlZFxcXCI+QU5EIFRIQVTigJlTIEdPVCBUTyBFTkQuPC9kaXY+XFxuICA8L2Rpdj5cXG48L2Rpdj5cXG5cIjtcblxuXG4vKioqKioqKioqKioqKioqKipcbiAqKiBXRUJQQUNLIEZPT1RFUlxuICoqIC4vfi9odG1sLWxvYWRlcj9hdHRycz1mYWxzZSEuL3NjZW5lcy9pd2FudG15aXNsYW1iYWNrMS9zY2VuZS5odG1sXG4gKiogbW9kdWxlIGlkID0gMzRcbiAqKiBtb2R1bGUgY2h1bmtzID0gMFxuICoqLyIsIm1vZHVsZS5leHBvcnRzID0gXCI8c3R5bGU+XFxuXFxuLmZpcnN0LC5zZWNvbmQsIC50aGlyZCwgLmZvdXJ0aCB7XFxuXFx0b3BhY2l0eTogMFxcbn1cXG4jbGlrZXBlYWNlIC5kaXNwbGF5LTQge1xcblxcdG9wYWNpdHk6IDEhaW1wb3J0YW50O1xcblxcdHRyYW5zZm9ybTogdHJhbnNsYXRlWSgzMCUpO1xcbn1cXG5cXG5cXG4jbGlrZXBlYWNlIGlucHV0IHtcXG5cXHRmb250LXNpemU6IDN2bWluO1xcblxcdGJhY2tncm91bmQ6ICM3NDdCODE7XFxuXFx0Y29sb3I6IHdoaXRlO1xcblxcdHBhZGRpbmc6IDIlO1xcblxcdHdpZHRoOiBhdXRvO1xcblxcdG1hcmdpbjogMC41dm1pbiAwO1xcblxcdHdpZHRoOiA5NiU7XFxufVxcblxcbiNsaWtlcGVhY2UgbGFiZWwge1xcblxcdGNvbG9yOiAjNzQ3QjgxO1xcbn1cXG5cXG4jbGlrZXBlYWNlIGlucHV0W3R5cGU9c3VibWl0XSB7XFxuXFx0Y29sb3I6IHdoaXRlO1xcblxcdGJhY2tncm91bmQ6ICMzQ0EyQ0Q7XFxuXFx0d2lkdGg6IGF1dG87XFxuXFx0bWFyZ2luLXRvcDogMnZtaW47XFxuXFx0Y3Vyc29yOiBwb2ludGVyO1xcbn1cXG5cXG4jbGlrZXBlYWNlIGxhYmVsIHtcXG5cXHRkaXNwbGF5OiBibG9jaztcXG5cXHRtYXJnaW46IDAuMnZtaW4gMC41dm1pbjtcXG5cXHR0ZXh0LXRyYW5zZm9ybTogdXBwZXJjYXNlO1xcblxcdGZvbnQtd2VpZ2h0OiBib2xkO1xcblxcdGZvbnQtc2l6ZTogMi41dm1pbjtcXG59XFxuXFxuI2xpa2VwZWFjZSAjbWNfZW1iZWRfc2lnbnVwIHtcXG5cXHR3aWR0aDogNTB2bWF4O1xcblxcdGJhY2tncm91bmQ6IHdoaXRlO1xcblxcdG1hcmdpbjogMCBhdXRvO1xcblxcdHBhZGRpbmc6IDJ2bWluO1xcbn1cXG5cXG4jbGlrZXBlYWNlIGgyIHtcXG5cXHRjb2xvcjogYmxhY2s7XFxuXFx0bWFyZ2luLWJvdHRvbTogMnZtaW5cXG59XFxuPC9zdHlsZT5cXG48ZGl2IGNsYXNzPVxcXCJ0YWJsZSBncmV5LXpvbmVcXFwiPlxcblxcdFxcdDxkaXYgY2xhc3M9XFxcInRhYmxlLWNlbnRlclxcXCI+XFxuICBcXHRcXHQ8ZGl2IGNsYXNzPVxcXCJkaXNwbGF5LTQgdGV4dC1jZW50ZXJlZFxcXCI+PHNwYW4gY2xhc3M9XFxcImZpcnN0XFxcIj5NVVNMSU1TPC9zcGFuPiA8c3BhbiBjbGFzcz1cXFwic2Vjb25kXFxcIj5BR0FJTlNUPC9zcGFuPiA8c3BhbiBjbGFzcz1cXFwidGhpcmRcXFwiPklTSVM8L3NwYW4+PC9kaXY+XFxuXFx0XFx0XFx0PGRpdiBjbGFzcz1cXFwiZm91cnRoXFxcIj5cXG5cXG5cXHRcXHRcXHRcXHQ8IS0tIEJlZ2luIE1haWxDaGltcCBTaWdudXAgRm9ybSAtLT5cXG5cXHRcXHRcXHRcXHQ8ZGl2IGlkPVxcXCJtY19lbWJlZF9zaWdudXBcXFwiPlxcblxcdFxcdFxcdFxcdDxmb3JtIGFjdGlvbj1cXFwiLy9tdXNsaW1zYWdhaW5zdGlzaXMudXMxMi5saXN0LW1hbmFnZS5jb20vc3Vic2NyaWJlL3Bvc3Q/dT05ZDJkZDgxY2NiMDdiNzEwNTkzNDc1NDIxJmFtcDtpZD04MWE1ZjUyNTBjXFxcIiBtZXRob2Q9XFxcInBvc3RcXFwiIGlkPVxcXCJtYy1lbWJlZGRlZC1zdWJzY3JpYmUtZm9ybVxcXCIgbmFtZT1cXFwibWMtZW1iZWRkZWQtc3Vic2NyaWJlLWZvcm1cXFwiIGNsYXNzPVxcXCJ2YWxpZGF0ZVxcXCIgdGFyZ2V0PVxcXCJfYmxhbmtcXFwiIG5vdmFsaWRhdGU+XFxuXFx0XFx0XFx0XFx0ICAgIDxkaXYgaWQ9XFxcIm1jX2VtYmVkX3NpZ251cF9zY3JvbGxcXFwiPlxcblxcdFxcdFxcdFxcdFxcdDxoMj5VcGRhdGVzIFNvb24uIFN1YnNjcmliZSBOb3cuPC9oMj5cXG5cXHRcXHRcXHRcXHQ8ZGl2IGNsYXNzPVxcXCJtYy1maWVsZC1ncm91cFxcXCI+XFxuXFx0XFx0XFx0XFx0XFx0PGxhYmVsIGZvcj1cXFwibWNlLUVNQUlMXFxcIj5FbWFpbCBBZGRyZXNzIDwvbGFiZWw+XFxuXFx0XFx0XFx0XFx0XFx0PGlucHV0IHR5cGU9XFxcImVtYWlsXFxcIiB2YWx1ZT1cXFwiXFxcIiBuYW1lPVxcXCJFTUFJTFxcXCIgY2xhc3M9XFxcInJlcXVpcmVkIGVtYWlsXFxcIiBpZD1cXFwibWNlLUVNQUlMXFxcIj5cXG5cXHRcXHRcXHRcXHQ8L2Rpdj5cXG5cXHRcXHRcXHRcXHQ8ZGl2IGNsYXNzPVxcXCJtYy1maWVsZC1ncm91cFxcXCI+XFxuXFx0XFx0XFx0XFx0XFx0PGxhYmVsIGZvcj1cXFwibWNlLUZOQU1FXFxcIj5GaXJzdCBOYW1lIDwvbGFiZWw+XFxuXFx0XFx0XFx0XFx0XFx0PGlucHV0IHR5cGU9XFxcInRleHRcXFwiIHZhbHVlPVxcXCJcXFwiIG5hbWU9XFxcIkZOQU1FXFxcIiBjbGFzcz1cXFwicmVxdWlyZWRcXFwiIGlkPVxcXCJtY2UtRk5BTUVcXFwiPlxcblxcdFxcdFxcdFxcdDwvZGl2PlxcblxcdFxcdFxcdFxcdDxkaXYgY2xhc3M9XFxcIm1jLWZpZWxkLWdyb3VwXFxcIj5cXG5cXHRcXHRcXHRcXHRcXHQ8bGFiZWwgZm9yPVxcXCJtY2UtTE5BTUVcXFwiPkxhc3QgTmFtZSA8L2xhYmVsPlxcblxcdFxcdFxcdFxcdFxcdDxpbnB1dCB0eXBlPVxcXCJ0ZXh0XFxcIiB2YWx1ZT1cXFwiXFxcIiBuYW1lPVxcXCJMTkFNRVxcXCIgY2xhc3M9XFxcInJlcXVpcmVkXFxcIiBpZD1cXFwibWNlLUxOQU1FXFxcIj5cXG5cXHRcXHRcXHRcXHQ8L2Rpdj5cXG5cXHRcXHRcXHRcXHQ8ZGl2IGNsYXNzPVxcXCJtYy1maWVsZC1ncm91cFxcXCI+XFxuXFx0XFx0XFx0XFx0XFx0PGxhYmVsIGZvcj1cXFwibWNlLVNLSUxMU1xcXCI+SG93IGNhbiB5b3UgaGVscD8gKFNraWxscykgPC9sYWJlbD5cXG5cXHRcXHRcXHRcXHRcXHQ8aW5wdXQgdHlwZT1cXFwidGV4dFxcXCIgdmFsdWU9XFxcIlxcXCIgbmFtZT1cXFwiU0tJTExTXFxcIiBjbGFzcz1cXFwiXFxcIiBpZD1cXFwibWNlLVNLSUxMU1xcXCI+XFxuXFx0XFx0XFx0XFx0PC9kaXY+XFxuXFx0XFx0XFx0XFx0XFx0PGRpdiBpZD1cXFwibWNlLXJlc3BvbnNlc1xcXCIgY2xhc3M9XFxcImNsZWFyXFxcIj5cXG5cXHRcXHRcXHRcXHRcXHRcXHQ8ZGl2IGNsYXNzPVxcXCJyZXNwb25zZVxcXCIgaWQ9XFxcIm1jZS1lcnJvci1yZXNwb25zZVxcXCIgc3R5bGU9XFxcImRpc3BsYXk6bm9uZVxcXCI+PC9kaXY+XFxuXFx0XFx0XFx0XFx0XFx0XFx0PGRpdiBjbGFzcz1cXFwicmVzcG9uc2VcXFwiIGlkPVxcXCJtY2Utc3VjY2Vzcy1yZXNwb25zZVxcXCIgc3R5bGU9XFxcImRpc3BsYXk6bm9uZVxcXCI+PC9kaXY+XFxuXFx0XFx0XFx0XFx0XFx0PC9kaXY+ICAgIDwhLS0gcmVhbCBwZW9wbGUgc2hvdWxkIG5vdCBmaWxsIHRoaXMgaW4gYW5kIGV4cGVjdCBnb29kIHRoaW5ncyAtIGRvIG5vdCByZW1vdmUgdGhpcyBvciByaXNrIGZvcm0gYm90IHNpZ251cHMtLT5cXG5cXHRcXHRcXHRcXHQgICAgPGRpdiBzdHlsZT1cXFwicG9zaXRpb246IGFic29sdXRlOyBsZWZ0OiAtNTAwMHB4O1xcXCIgYXJpYS1oaWRkZW49XFxcInRydWVcXFwiPjxpbnB1dCB0eXBlPVxcXCJ0ZXh0XFxcIiBuYW1lPVxcXCJiXzlkMmRkODFjY2IwN2I3MTA1OTM0NzU0MjFfODFhNWY1MjUwY1xcXCIgdGFiaW5kZXg9XFxcIi0xXFxcIiB2YWx1ZT1cXFwiXFxcIj48L2Rpdj5cXG5cXHRcXHRcXHRcXHQgICAgPGRpdiBjbGFzcz1cXFwiY2xlYXJcXFwiPjxpbnB1dCB0eXBlPVxcXCJzdWJtaXRcXFwiIHZhbHVlPVxcXCJTdWJzY3JpYmVcXFwiIG5hbWU9XFxcInN1YnNjcmliZVxcXCIgaWQ9XFxcIm1jLWVtYmVkZGVkLXN1YnNjcmliZVxcXCIgY2xhc3M9XFxcImJ1dHRvblxcXCI+XFxuXFx0XFx0XFx0XFx0ICAgIDwvZGl2PlxcblxcbjxhIGhyZWY9XFxcImh0dHBzOi8vdHdpdHRlci5jb20vc2hhcmVcXFwiIGNsYXNzPVxcXCJ0d2l0dGVyLXNoYXJlLWJ1dHRvblxcXCIgZGF0YS11cmw9XFxcImh0dHA6Ly93d3cubXVzbGltc2FnYWluc3Rpc2lzLmNvbVxcXCIgZGF0YS1zaXplPVxcXCJsYXJnZVxcXCIgZGF0YS1oYXNodGFncz1cXFwibXVzbGltc2FnYWluc3Rpc2lzXFxcIiBkYXRhLWRudD1cXFwidHJ1ZVxcXCI+VHdlZXQ8L2E+XFxuXFx0XFx0XFx0XFx0PC9mb3JtPlxcblxcdFxcdFxcdFxcdDwvZGl2PlxcblxcdFxcdFxcdFxcdDwhLS1FbmQgbWNfZW1iZWRfc2lnbnVwLS0+XFxuXFx0XFx0XFx0XFx0PGRpdiBjbGFzcz1cXFwiZmItc2hhcmUtYnV0dG9uXFxcIiBkYXRhLWhyZWY9XFxcImh0dHA6Ly93d3cubXVzbGltc2FnYWluc3Rpc2lzLmNvbVxcXCIgZGF0YS1sYXlvdXQ9XFxcImJ1dHRvblxcXCI+PC9kaXY+XFxuXFx0XFx0XFx0PC9kaXY+XFxuXFx0XFx0PC9kaXY+XFxuXFx0XFx0PC9kaXY+XFxuXFxuPC9kaXY+XCI7XG5cblxuLyoqKioqKioqKioqKioqKioqXG4gKiogV0VCUEFDSyBGT09URVJcbiAqKiAuL34vaHRtbC1sb2FkZXI/YXR0cnM9ZmFsc2UhLi9zY2VuZXMvbGlrZXBlYWNlL3NjZW5lLmh0bWxcbiAqKiBtb2R1bGUgaWQgPSAzNVxuICoqIG1vZHVsZSBjaHVua3MgPSAwXG4gKiovIiwibW9kdWxlLmV4cG9ydHMgPSBcIjxkaXYgY2xhc3M9XFxcInRhYmxlXFxcIj5cXG4gIDxkaXYgY2xhc3M9XFxcInRhYmxlLWNlbnRlclxcXCI+XFxuICAgIDxkaXYgY2xhc3M9XFxcImRpc3BsYXktNCB0ZXh0LWNlbnRlcmVkXFxcIj5XZSBhcmUgdGlyZWQgb2YgdGhlIG5lZ2F0aXZlIHByZXNzLiA8YnI+PGJyPlxcbiAgICAgIFRpcmVkIG9mIHRoZSBoYXRlIGNyaW1lcy48L2Rpdj5cXG4gIDwvZGl2PlxcbjwvZGl2PlxcblwiO1xuXG5cbi8qKioqKioqKioqKioqKioqKlxuICoqIFdFQlBBQ0sgRk9PVEVSXG4gKiogLi9+L2h0bWwtbG9hZGVyP2F0dHJzPWZhbHNlIS4vc2NlbmVzL21peGVkZmVlbGluZ3Mvc2NlbmUuaHRtbFxuICoqIG1vZHVsZSBpZCA9IDM2XG4gKiogbW9kdWxlIGNodW5rcyA9IDBcbiAqKi8iLCJtb2R1bGUuZXhwb3J0cyA9IFwiXFxuPGRpdiBjbGFzcz1cXFwibXVzbGltcy1iZWxpZXZlLWluZGl2aWR1YWwtbGlmZSBncmV5LXpvbmVcXFwiPlxcblxcdDxkaXYgY2xhc3M9XFxcInRhYmxlIFxcXCI+XFxuICBcXHRcXHQ8ZGl2IGNsYXNzPVxcXCJ0YWJsZS1jZW50ZXJcXFwiPlxcbiAgICBcXHRcXHQ8ZGl2IGNsYXNzPVxcXCJkaXNwbGF5LTQgdGV4dC1jZW50ZXJlZFxcXCI+Li4uIGJ1dCB3ZSBhcmUgTXVzbGltcy4gPGJyPjxicj4gTXVzbGltcyB0aGF0IGJlbGlldmUgRVZFUlkgbGlmZSBpcyBzYWNyZWQuPC9kaXY+XFxuICBcXHRcXHQ8L2Rpdj5cXG5cXHQ8L2Rpdj5cXG48L2Rpdj5cXG5cIjtcblxuXG4vKioqKioqKioqKioqKioqKipcbiAqKiBXRUJQQUNLIEZPT1RFUlxuICoqIC4vfi9odG1sLWxvYWRlcj9hdHRycz1mYWxzZSEuL3NjZW5lcy9tdXNsaW1zYmVsaWV2ZWluZGl2aWR1YWxsaWZlL3NjZW5lLmh0bWxcbiAqKiBtb2R1bGUgaWQgPSAzN1xuICoqIG1vZHVsZSBjaHVua3MgPSAwXG4gKiovIiwibW9kdWxlLmV4cG9ydHMgPSBcIjxzdHlsZT5cXG4ub3V0LXRvLWdldC15b3Uge1xcbiAgICBvcGFjaXR5OiAwO1xcbn1cXG48L3N0eWxlPlxcblxcbjxkaXYgY2xhc3M9XFxcIm91dC10by1nZXQteW91XFxcIj5cXG5cXHQ8ZGl2IGNsYXNzPVxcXCJ0YWJsZSBcXFwiPlxcblxcdCAgPGRpdiBjbGFzcz1cXFwidGFibGUtY2VudGVyXFxcIj5cXG5cXHQgICAgPGRpdiBjbGFzcz1cXFwiZGlzcGxheS00IHRleHQtY2VudGVyZWRcXFwiPi4uLmxpa2UgZXZlcnlib2R5J3Mgb3V0IHRvIGdldCB5b3UuLi48L2Rpdj5cXG5cXHQgIDwvZGl2PlxcblxcdDwvZGl2PlxcbjwvZGl2PlwiO1xuXG5cbi8qKioqKioqKioqKioqKioqKlxuICoqIFdFQlBBQ0sgRk9PVEVSXG4gKiogLi9+L2h0bWwtbG9hZGVyP2F0dHJzPWZhbHNlIS4vc2NlbmVzL291dHRvZ2V0eW91L3NjZW5lLmh0bWxcbiAqKiBtb2R1bGUgaWQgPSAzOFxuICoqIG1vZHVsZSBjaHVua3MgPSAwXG4gKiovIiwibW9kdWxlLmV4cG9ydHMgPSBcIjxzdHlsZT5cXG4gICNyZWFjdGlvbnN0b3RlcnJvciAuZGlzcGxheS00IHtcXG4gICAgYmFja2dyb3VuZDogYmxhY2s7XFxuICAgIGRpc3BsYXk6IGlubGluZS1ibG9jaztcXG4gICAgcGFkZGluZzogMC41dnc7XFxuICAgIC8qcG9zaXRpb246IGFic29sdXRlOyovXFxuICAgIC8qYm90dG9tOiA1dmg7Ki9cXG5cXG4gIH1cXG4gICNyZWFjdGlvbnN0b3RlcnJvciAuYW5pbS0xIHtcXG4gICAgb3BhY2l0eTogMDtcXG4gIH1cXG48L3N0eWxlPlxcbjxkaXYgY2xhc3M9XFxcInZpZGVvLWJhY2tncm91bmRcXFwiPlxcbiAgPHZpZGVvIGxvb3AgbWF4LXZvbHVtZT1cXFwiMC40XFxcIj5cXG4gICAgPHNvdXJjZSBzcmM9XFxcImltZy9SZXZpc2VkV29yazIubXA0XFxcIiB0eXBlPVxcXCJ2aWRlby9tcDRcXFwiPlxcbiAgPC92aWRlbz5cXG48L2Rpdj5cXG48ZGl2IGNsYXNzPVxcXCJ0YWJsZVxcXCI+XFxuICAgIDxkaXYgY2xhc3M9XFxcInRhYmxlLWNlbnRlclxcXCI+XFxuICAgICAgPGRpdiBjbGFzcz1cXFwiZGlzcGxheS00IGFuaW0tMVxcXCI+SG93IGRvIHlvdSBmZWVsIGFib3V0IGhvdyBwZW9wbGUgcmVhY3QgdG8gdGhlIGF0dGFja3M/PC9kaXY+PGJyIC8+PGJyIC8+XFxuICAgIDwvZGl2PlxcbjwvZGl2PlxcblwiO1xuXG5cbi8qKioqKioqKioqKioqKioqKlxuICoqIFdFQlBBQ0sgRk9PVEVSXG4gKiogLi9+L2h0bWwtbG9hZGVyP2F0dHJzPWZhbHNlIS4vc2NlbmVzL3JlYWN0aW9uc3RvdGVycm9yL3NjZW5lLmh0bWxcbiAqKiBtb2R1bGUgaWQgPSAzOVxuICoqIG1vZHVsZSBjaHVua3MgPSAwXG4gKiovIiwibW9kdWxlLmV4cG9ydHMgPSBcIjxzdHlsZT5cXG4jc29tZXRoaW5nLXRvLXByb3ZlIC5kaXNwbGF5LTQge1xcbiAgICBvcGFjaXR5OiAwO1xcbn1cXG48L3N0eWxlPlxcbjxkaXYgY2xhc3M9XFxcInNvbWV0aGluZy10by1wcm92ZVxcXCI+XFxuXFx0PGRpdiBjbGFzcz1cXFwidGFibGUgXFxcIj5cXG4gIFxcdFxcdDxkaXYgY2xhc3M9XFxcInRhYmxlLWNlbnRlclxcXCI+XFxuICAgIFxcdFxcdDxkaXYgY2xhc3M9XFxcImRpc3BsYXktNCB0ZXh0LWNlbnRlcmVkXFxcIj4uLi5saWtlIHlvdSBoYXZlIDxzdHJvbmc+c29tZXRoaW5nIHRvIHByb3ZlPC9zdHJvbmc+LjwvZGl2PlxcbiAgXFx0XFx0PC9kaXY+XFxuXFx0PC9kaXY+XFxuPC9kaXY+XCI7XG5cblxuLyoqKioqKioqKioqKioqKioqXG4gKiogV0VCUEFDSyBGT09URVJcbiAqKiAuL34vaHRtbC1sb2FkZXI/YXR0cnM9ZmFsc2UhLi9zY2VuZXMvc29tZXRoaW5ndG9wcm92ZS9zY2VuZS5odG1sXG4gKiogbW9kdWxlIGlkID0gNDBcbiAqKiBtb2R1bGUgY2h1bmtzID0gMFxuICoqLyIsIm1vZHVsZS5leHBvcnRzID0gXCJcXG48ZGl2IGNsYXNzPVxcXCJ3ZS1hcmUtY29taW5nIGdyZXktem9uZVxcXCI+XFxuXFx0PGRpdiBjbGFzcz1cXFwidGFibGUgXFxcIj5cXG4gIFxcdFxcdDxkaXYgY2xhc3M9XFxcInRhYmxlLWNlbnRlclxcXCI+XFxuICAgIFxcdFxcdDxkaXYgY2xhc3M9XFxcImRpc3BsYXktNCB0ZXh0LWNlbnRlcmVkXFxcIj5XZSBhcmUgY29taW5nLjwvZGl2PlxcbiAgXFx0XFx0PC9kaXY+XFxuXFx0PC9kaXY+XFxuPC9kaXY+XFxuXCI7XG5cblxuLyoqKioqKioqKioqKioqKioqXG4gKiogV0VCUEFDSyBGT09URVJcbiAqKiAuL34vaHRtbC1sb2FkZXI/YXR0cnM9ZmFsc2UhLi9zY2VuZXMvd2VhcmVjb21pbmcvc2NlbmUuaHRtbFxuICoqIG1vZHVsZSBpZCA9IDQxXG4gKiogbW9kdWxlIGNodW5rcyA9IDBcbiAqKi8iLCJtb2R1bGUuZXhwb3J0cyA9IFwiXFxuPGRpdiBjbGFzcz1cXFwid2UtYXJlLW5vdC1hZnJhaWQgZ3JleS16b25lXFxcIj5cXG5cXHQ8ZGl2IGNsYXNzPVxcXCJ0YWJsZSBcXFwiPlxcbiAgXFx0XFx0PGRpdiBjbGFzcz1cXFwidGFibGUtY2VudGVyXFxcIj5cXG4gICAgXFx0XFx0PGRpdiBjbGFzcz1cXFwiZGlzcGxheS00IHRleHQtY2VudGVyZWRcXFwiPldlIHdpbGwgZG8gbW9yZS4gV2Ugd2lsbCBzdG9wIHRoaXMgZmFsc2UgaWRlb2xvZ3kuIFdlIGFyZSBub3QgYWZyYWlkLjwvZGl2PlxcbiAgXFx0XFx0PC9kaXY+XFxuXFx0PC9kaXY+XFxuPC9kaXY+XFxuXCI7XG5cblxuLyoqKioqKioqKioqKioqKioqXG4gKiogV0VCUEFDSyBGT09URVJcbiAqKiAuL34vaHRtbC1sb2FkZXI/YXR0cnM9ZmFsc2UhLi9zY2VuZXMvd2VhcmVub3RhZnJhaWQvc2NlbmUuaHRtbFxuICoqIG1vZHVsZSBpZCA9IDQyXG4gKiogbW9kdWxlIGNodW5rcyA9IDBcbiAqKi8iLCJtb2R1bGUuZXhwb3J0cyA9IFwiPHN0eWxlPlxcbi53ZXdpbGxwcm90ZWN0ZWFjaG90aGVyIHtcXG4gICAgb3BhY2l0eTogMDtcXG59XFxuI3dld2lsbHByb3RlY3RlYWNob3RoZXIgaW1nIHtcXG4gIG1heC13aWR0aDogMzV2dztcXG59XFxuI3dld2lsbHByb3RlY3RlYWNob3RoZXIgLmNvbmNsdXNpb24sXFxuI3dld2lsbHByb3RlY3RlYWNob3RoZXIgLnByZW1pc2Uge1xcbiAgb3BhY2l0eTogMDtcXG59XFxuPC9zdHlsZT5cXG48ZGl2IGNsYXNzPVxcXCJ0YWJsZSBncmV5LXpvbmVcXFwiPlxcbiAgPGRpdiBjbGFzcz1cXFwidGFibGUtY2VudGVyXFxcIiBzdHlsZT1cXFwid2lkdGg6NTAlXFxcIj5cXG4gICAgPGRpdiBjbGFzcz1cXFwicHJlbWlzZVxcXCI+XFxuICAgICAgPGRpdiBjbGFzcz1cXFwiZGlzcGxheS0yXFxcIj5XZSB3aWxsIHByb3RlY3QgZXZlcnkgaW5kaXZpZHVhbCBsaWZlLjwvZGl2PlxcbiAgICAgIDxhIGhyZWY9XFxcImh0dHA6Ly9sZWFybmluZ2VuZ2xpc2gudm9hbmV3cy5jb20vY29udGVudC9rZW55YW4tbXVzbGltcy1wcm90ZWN0LWNocmlzdGlhbnMtZnJvbS10ZXJyb3Jpc3QtYXR0YWNrLzMxMTQzMjYuaHRtbFxcXCIgdGFyZ2V0PVxcXCJfYmxhbmtcXFwiPjxpbWcgc3JjPVxcXCIuL2ltZy9LZW55YVByb3RlY3QyLnBuZ1xcXCI+PC9hPlxcbiAgICA8L2Rpdj5cXG4gIDwvZGl2PlxcbiAgPGRpdiBjbGFzcz1cXFwidGFibGUtY2VudGVyXFxcIiBzdHlsZT1cXFwid2lkdGg6NDUlXFxcIj5cXG4gICAgPGgyIGNsYXNzPVxcXCJjb25jbHVzaW9uXFxcIj5cXG4gICAgICA8ZGl2IGNsYXNzPVxcXCJkaXNwbGF5LTJcXFwiPldlIHdpbGwgYXNrIG90aGVycyB0byBoZWxwIHByb3RlY3Qgb3Vycy48L2Rpdj5cXG4gICAgICA8YSBocmVmPVxcXCJodHRwOi8vd3d3LnVzYXRvZGF5LmNvbS9zdG9yeS9uZXdzL25hdGlvbi1ub3cvMjAxNS8xMi8yMi9pd2lsbHByb3RlY3R5b3UtdXMtc2VydmljZS1tZW1iZXJzLXNvb3RoZS1zY2FyZWQtbXVzbGltLWdpcmwvNzc3NDg4NzQvXFxcIiB0YXJnZXQ9XFxcIl9ibGFua1xcXCI+PGltZyBzcmM9XFxcIi4vaW1nL0lXaWxsUHJvdGVjdFlvdS5wbmdcXFwiPjwvYT5cXG4gICAgPC9oMj5cXG4gIDwvZGl2PlxcbjwvZGl2PlxcblwiO1xuXG5cbi8qKioqKioqKioqKioqKioqKlxuICoqIFdFQlBBQ0sgRk9PVEVSXG4gKiogLi9+L2h0bWwtbG9hZGVyP2F0dHJzPWZhbHNlIS4vc2NlbmVzL3dld2lsbHByb3RlY3RlYWNob3RoZXIvc2NlbmUuaHRtbFxuICoqIG1vZHVsZSBpZCA9IDQzXG4gKiogbW9kdWxlIGNodW5rcyA9IDBcbiAqKi8iLCJtb2R1bGUuZXhwb3J0cyA9IFwiPHN0eWxlPlxcbiAgI2RveW91ZmVlbG11c2xpbSAuYW5pbS0yIHtcXG4gICAgb3BhY2l0eTogMDtcXG4gIH1cXG4gIC52aWRlby1iYWNrZ3JvdW5kIHZpZGVvIHtcXG4gICAgd2lkdGg6IDEwMHZ3O1xcbiAgfVxcbiAgLnZpZGVvLWJhY2tncm91bmQge1xcbiAgICBwb3NpdGlvbjogZml4ZWQ7XFxuICAgIHRvcDogMDtcXG4gICAgbGVmdDogMDtcXG4gIH1cXG4gICN3aGF0aXNsYW1pY2hpc3RvcnlwcmVmZXJzIC5kaXNwbGF5LTQgYSxcXG4gIC5pc2xhbWljLWludmVudGlvbnMge1xcbiAgICBjb2xvcjogcmdiYSgyNTUsMjU1LDI1NSwxKTtcXG4gIH1cXG5cXG4gIC5pc2xhbWljLWludmVudGlvbnMge1xcbiAgICBvcGFjaXR5OiAwO1xcbiAgfVxcblxcbjwvc3R5bGU+XFxuPGRpdiBjbGFzcz1cXFwidmlkZW8tYmFja2dyb3VuZFxcXCI+XFxuICA8dmlkZW8gbG9vcCBtYXgtdm9sdW1lPVxcXCIxXFxcIj5cXG4gICAgPHNvdXJjZSBzcmM9XFxcImltZy90eXNvbi5tcDRcXFwiIHR5cGU9XFxcInZpZGVvL21wNFxcXCI+XFxuICA8L3ZpZGVvPlxcbjwvZGl2PlxcbjxkaXYgY2xhc3M9XFxcInRhYmxlXFxcIj5cXG4gIDxkaXYgY2xhc3M9XFxcInRhYmxlLWNlbnRlclxcXCI+XFxuICAgIDxkaXYgY2xhc3M9XFxcImRpc3BsYXktNCBhbmltLTFcXFwiPjxhIGhyZWY9XFxcImh0dHBzOi8vd3d3LnlvdXR1YmUuY29tL3dhdGNoP3Y9V1pDdUY3MzNwODhcXFwiIHRhcmdldD1cXFwiX2JsYW5rXFxcIj5IYXMgSVNJUyBmb3Jnb3R0ZW4gdGhlIGJlc3Qgb2Ygd2hhdCBNdXNsaW1zIGhhdmUgZG9uZT8/PC9hPjwvZGl2PlxcbiAgICA8ZGl2IGNsYXNzPVxcXCJkaXNwbGF5LTMgaXNsYW1pYy1pbnZlbnRpb25zXFxcIj5cXG4gICAgICA8ZGl2PkFsZ2VicmE8L2Rpdj5cXG4gICAgICA8ZGl2PlN1cmdpY2FsIElubm92YXRpb25zPC9kaXY+XFxuICAgICAgPGRpdj5Nb2Rlcm4gSG9zcGl0YWxzPC9kaXY+XFxuICAgICAgPGRpdj5BY2NyZWRpdGVkIFVuaXZlcnNpdGllczwvZGl2PlxcbiAgICAgIDxkaXY+VGhlIEd1aXRhcjwvZGl2PlxcbiAgICA8L2Rpdj5cXG4gIDwvZGl2PlxcbjwvZGl2PlxcblwiO1xuXG5cbi8qKioqKioqKioqKioqKioqKlxuICoqIFdFQlBBQ0sgRk9PVEVSXG4gKiogLi9+L2h0bWwtbG9hZGVyP2F0dHJzPWZhbHNlIS4vc2NlbmVzL3doYXRpc2xhbWljaGlzdG9yeXByZWZlcnMvc2NlbmUuaHRtbFxuICoqIG1vZHVsZSBpZCA9IDQ0XG4gKiogbW9kdWxlIGNodW5rcyA9IDBcbiAqKi8iLCJtb2R1bGUuZXhwb3J0cyA9IFwiXFxuICAgICAgICAgICAgICA8IS0tIHRoZSBRdXLigJlhbiBwcmVmZXJzIGxlYXJuaW5nICjigJhpbG0pIG92ZXIgbXVyZGVyLlxcbiAgICAgICAgICAgICAgTGFzdCB0aW1lIHdlIGNoZWNrZWQsIHRoZSBRdXLigJlhbiB2YWx1ZXMgc2NpZW50aWZpYyBvYnNlcnZhdGlvbiwgZXhwZXJpbWVudGFsIGtub3dsZWRnZSBhbmQgcmF0aW9uYWxpdHksIG92ZXIgYmxpbmQgbGVhZGVyc2hpcCBmb2xsb3dpbmcsIGFzIHNlZW4gaW4gNzUwIFZFUlNFUyAoMTAlKSBvZiB0aGUgUXVy4oCZYW4uIC0tPlxcblxcbjxkaXYgY2xhc3M9XFxcInRhYmxlXFxcIj5cXG4gIDxkaXYgY2xhc3M9XFxcInRhYmxlLWNlbnRlclxcXCI+XFxuICAgIDxkaXYgY2xhc3M9XFxcImRpc3BsYXktNCBhbmltLTFcXFwiPkxhc3QgdGltZSB3ZSBjaGVja2VkLDwvZGl2PjxiciAvPjxiciAvPlxcbiAgICA8ZGl2IGNsYXNzPVxcXCJkaXNwbGF5LTEgYW5pbS0xXFxcIj5UaGUgUXVy4oCZYW4gcHJlZmVycyBmb3JnaXZlbmVzcyBvdmVyIHB1bmlzaG1lbnQuPC9kaXY+PGJyIC8+PGJyIC8+XFxuICAgIDxkaXYgY2xhc3M9XFxcImRpc3BsYXktMSBhbmltLTFcXFwiPlRoZSBRdXLigJlhbiBwcmVmZXJzIHBlYWNlIG92ZXIgb3ZlciB3YXIuPC9kaXY+PGJyIC8+PGJyIC8+XFxuICAgIDxkaXYgY2xhc3M9XFxcImRpc3BsYXktMSBhbmltLTFcXFwiPlRoZSBRdXLigJlhbiBwcmVmZXJzIGtub3dsZWRnZSBvdmVyIGJsaW5kbmVzcy48L2Rpdj48YnIgLz48YnIgLz5cXG4gIDwvZGl2PlxcbjwvZGl2PlxcblwiO1xuXG5cbi8qKioqKioqKioqKioqKioqKlxuICoqIFdFQlBBQ0sgRk9PVEVSXG4gKiogLi9+L2h0bWwtbG9hZGVyP2F0dHJzPWZhbHNlIS4vc2NlbmVzL3doYXR0aGVxdXJhbnByZWZlcnMvc2NlbmUuaHRtbFxuICoqIG1vZHVsZSBpZCA9IDQ1XG4gKiogbW9kdWxlIGNodW5rcyA9IDBcbiAqKi8iLCJtb2R1bGUuZXhwb3J0cyA9IFwiXFxuPGRpdiBjbGFzcz1cXFwidGFibGVcXFwiPlxcbiAgPGRpdiBjbGFzcz1cXFwidGFibGUtY2VudGVyXFxcIj5cXG4gICAgPGRpdiBjbGFzcz1cXFwiZGlzcGxheS00IHRleHQtY2VudGVyZWRcXFwiPldobyBhcmUgdGhleSB0byBkZWNsYXJlIHdobyBpcyBNdXNsaW0gYW5kIHdobyBpcyBub3Q/IFdoYXQgaXMgSXNsYW0gYW5kIHdoYXQgaXMgbm90PzwvZGl2PlxcbiAgPC9kaXY+XFxuPC9kaXY+XFxuXCI7XG5cblxuLyoqKioqKioqKioqKioqKioqXG4gKiogV0VCUEFDSyBGT09URVJcbiAqKiAuL34vaHRtbC1sb2FkZXI/YXR0cnM9ZmFsc2UhLi9zY2VuZXMvd2hvYXJldGhleS9zY2VuZS5odG1sXG4gKiogbW9kdWxlIGlkID0gNDZcbiAqKiBtb2R1bGUgY2h1bmtzID0gMFxuICoqLyIsIm1vZHVsZS5leHBvcnRzID0gXCJcXG48ZGl2IGNsYXNzPVxcXCJ0YWJsZVxcXCI+XFxuICA8ZGl2IGNsYXNzPVxcXCJ0YWJsZS1jZW50ZXJcXFwiPlxcbiAgICA8ZGl2IGNsYXNzPVxcXCJkaXNwbGF5LTRcXFwiPldpdGggYWxsIHRoZSBoYXRyZWQgb24gdGhlIG5ld3MuPC9kaXY+XFxuICA8L2Rpdj5cXG48L2Rpdj5cXG5cIjtcblxuXG4vKioqKioqKioqKioqKioqKipcbiAqKiBXRUJQQUNLIEZPT1RFUlxuICoqIC4vfi9odG1sLWxvYWRlcj9hdHRycz1mYWxzZSEuL3NjZW5lcy93aXRoYWxsdGhlaGF0cmVkL3NjZW5lLmh0bWxcbiAqKiBtb2R1bGUgaWQgPSA0N1xuICoqIG1vZHVsZSBjaHVua3MgPSAwXG4gKiovIiwibW9kdWxlLmV4cG9ydHMgPSBcIjxkaXYgY2xhc3M9XFxcInRhYmxlXFxcIj5cXG4gIDxkaXYgY2xhc3M9XFxcInRhYmxlLWNlbnRlclxcXCI+XFxuICAgIDxkaXYgY2xhc3M9XFxcImRpc3BsYXktNCB0ZXh0LWNlbnRlcmVkXFxcIj5XZSBtYXkgbm90IGFncmVlIG9uIGV2ZXJ5IGFzcGVjdCBvZiBJc2xhbSwgPGJyPiA8YnI+XFxuICAgICAgYnV0IHdlIGNhbiBhZ3JlZSBvbiBvbmUgdGhpbmcuLi48L2Rpdj5cXG4gIDwvZGl2PlxcbjwvZGl2PlxcblwiO1xuXG5cbi8qKioqKioqKioqKioqKioqKlxuICoqIFdFQlBBQ0sgRk9PVEVSXG4gKiogLi9+L2h0bWwtbG9hZGVyP2F0dHJzPWZhbHNlIS4vc2NlbmVzL3lldHRoYXRzb2theS9zY2VuZS5odG1sXG4gKiogbW9kdWxlIGlkID0gNDhcbiAqKiBtb2R1bGUgY2h1bmtzID0gMFxuICoqLyIsInZhciBtYXAgPSB7XG5cdFwiLi9hYm91dHlvdXJzZWxmL3NjZW5lLmpzb25cIjogNTAsXG5cdFwiLi9iYXR0bGVvZmFnZW5lcmF0aW9uL3NjZW5lLmpzb25cIjogNTEsXG5cdFwiLi9jb21wbGljYXRlZHNpdHVhdGlvbi9zY2VuZS5qc29uXCI6IDUyLFxuXHRcIi4vZGlmZmVyZW50cHJhY3RpY2VzL3NjZW5lLmpzb25cIjogNTMsXG5cdFwiLi9kb3lvdWZlZWxtdXNsaW0vc2NlbmUuanNvblwiOiA1NCxcblx0XCIuL2V4cGxvc2lvbi9zY2VuZS5qc29uXCI6IDU1LFxuXHRcIi4vZmVlbGluZ2NvbmZ1c2VkL3NjZW5lLmpzb25cIjogNTYsXG5cdFwiLi9pbnRyby9zY2VuZS5qc29uXCI6IDU3LFxuXHRcIi4vaXNpc2FmdGVybGlmZWZhbGxhY3kvc2NlbmUuanNvblwiOiA1OCxcblx0XCIuL2lzaXNhcG9jYWx5cHNlbWlzcXVvdGUvc2NlbmUuanNvblwiOiA1OSxcblx0XCIuL2lzaXNiYW5rcnVwdC9zY2VuZS5qc29uXCI6IDYwLFxuXHRcIi4vaXNpc2ZpZ2h0bWlzcXVvdGUvc2NlbmUuanNvblwiOiA2MSxcblx0XCIuL2lzaXNvYmplY3RpdmUvc2NlbmUuanNvblwiOiA2Mixcblx0XCIuL2lzaXN3YW50c3RvZGl2aWRlL3NjZW5lLmpzb25cIjogNjMsXG5cdFwiLi9pdGlzbnRlYXN5L3NjZW5lLmpzb25cIjogNjQsXG5cdFwiLi9pdHNnb3R0b2VuZC9zY2VuZS5qc29uXCI6IDY1LFxuXHRcIi4vaXdhbnRteWlzbGFtYmFjazEvc2NlbmUuanNvblwiOiA2Nixcblx0XCIuL2xpa2VwZWFjZS9zY2VuZS5qc29uXCI6IDY3LFxuXHRcIi4vbWl4ZWRmZWVsaW5ncy9zY2VuZS5qc29uXCI6IDY4LFxuXHRcIi4vbXVzbGltc2JlbGlldmVpbmRpdmlkdWFsbGlmZS9zY2VuZS5qc29uXCI6IDY5LFxuXHRcIi4vb3V0dG9nZXR5b3Uvc2NlbmUuanNvblwiOiA3MCxcblx0XCIuL3JlYWN0aW9uc3RvdGVycm9yL3NjZW5lLmpzb25cIjogNzEsXG5cdFwiLi9zb21ldGhpbmd0b3Byb3ZlL3NjZW5lLmpzb25cIjogNzIsXG5cdFwiLi93ZWFyZWNvbWluZy9zY2VuZS5qc29uXCI6IDczLFxuXHRcIi4vd2VhcmVub3RhZnJhaWQvc2NlbmUuanNvblwiOiA3NCxcblx0XCIuL3dld2lsbHByb3RlY3RlYWNob3RoZXIvc2NlbmUuanNvblwiOiA3NSxcblx0XCIuL3doYXRpc2xhbWljaGlzdG9yeXByZWZlcnMvc2NlbmUuanNvblwiOiA3Nixcblx0XCIuL3doYXR0aGVxdXJhbnByZWZlcnMvc2NlbmUuanNvblwiOiA3Nyxcblx0XCIuL3dob2FyZXRoZXkvc2NlbmUuanNvblwiOiA3OCxcblx0XCIuL3dpdGhhbGx0aGVoYXRyZWQvc2NlbmUuanNvblwiOiA3OSxcblx0XCIuL3lldHRoYXRzb2theS9zY2VuZS5qc29uXCI6IDgwXG59O1xuZnVuY3Rpb24gd2VicGFja0NvbnRleHQocmVxKSB7XG5cdHJldHVybiBfX3dlYnBhY2tfcmVxdWlyZV9fKHdlYnBhY2tDb250ZXh0UmVzb2x2ZShyZXEpKTtcbn07XG5mdW5jdGlvbiB3ZWJwYWNrQ29udGV4dFJlc29sdmUocmVxKSB7XG5cdHJldHVybiBtYXBbcmVxXSB8fCAoZnVuY3Rpb24oKSB7IHRocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIgKyByZXEgKyBcIicuXCIpIH0oKSk7XG59O1xud2VicGFja0NvbnRleHQua2V5cyA9IGZ1bmN0aW9uIHdlYnBhY2tDb250ZXh0S2V5cygpIHtcblx0cmV0dXJuIE9iamVjdC5rZXlzKG1hcCk7XG59O1xud2VicGFja0NvbnRleHQucmVzb2x2ZSA9IHdlYnBhY2tDb250ZXh0UmVzb2x2ZTtcbm1vZHVsZS5leHBvcnRzID0gd2VicGFja0NvbnRleHQ7XG53ZWJwYWNrQ29udGV4dC5pZCA9IDQ5O1xuXG5cblxuLyoqKioqKioqKioqKioqKioqXG4gKiogV0VCUEFDSyBGT09URVJcbiAqKiAuL3NjZW5lcyAuL34vanNvbi1sb2FkZXIhXlxcLlxcLy4qXFwvc2NlbmVcXC5qc29uJFxuICoqIG1vZHVsZSBpZCA9IDQ5XG4gKiogbW9kdWxlIGNodW5rcyA9IDBcbiAqKi8iLCJtb2R1bGUuZXhwb3J0cyA9IFtcblx0e1xuXHRcdFwid3JhcHBlclwiOiBcIiNhYm91dHlvdXJzZWxmXCIsXG5cdFx0XCJkdXJhdGlvblwiOiBcIjEwMCVcIixcblx0XHRcImFuaW1hdGlvbnNcIjogW1xuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLmFib3V0LXlvdXJzZWxmXCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MCxcblx0XHRcdFx0XHQxXG5cdFx0XHRcdF1cblx0XHRcdH1cblx0XHRdXG5cdH0sXG5cdHtcblx0XHRcIndyYXBwZXJcIjogXCIjYWJvdXR5b3Vyc2VsZlwiLFxuXHRcdFwiZHVyYXRpb25cIjogXCIxMDAlXCIsXG5cdFx0XCJmb2N1c1wiOiB0cnVlLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXG5cdFx0XHR7fVxuXHRcdF1cblx0fSxcblx0e1xuXHRcdFwid3JhcHBlclwiOiBcIiNhYm91dHlvdXJzZWxmXCIsXG5cdFx0XCJkdXJhdGlvblwiOiBcIjEwMCVcIixcblx0XHRcImFuaW1hdGlvbnNcIjogW1xuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLmFib3V0LXlvdXJzZWxmXCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0Mixcblx0XHRcdFx0XHQwXG5cdFx0XHRcdF1cblx0XHRcdH1cblx0XHRdXG5cdH1cbl07XG5cblxuLyoqKioqKioqKioqKioqKioqXG4gKiogV0VCUEFDSyBGT09URVJcbiAqKiAuL34vanNvbi1sb2FkZXIhLi9zY2VuZXMvYWJvdXR5b3Vyc2VsZi9zY2VuZS5qc29uXG4gKiogbW9kdWxlIGlkID0gNTBcbiAqKiBtb2R1bGUgY2h1bmtzID0gMFxuICoqLyIsIm1vZHVsZS5leHBvcnRzID0gW1xuXHR7XG5cdFx0XCJ3cmFwcGVyXCI6IFwiI2JhdHRsZW9mYWdlbmVyYXRpb25cIixcblx0XHRcImR1cmF0aW9uXCI6IFwiMTAwJVwiLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIuZGlzcGxheS00XCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MCxcblx0XHRcdFx0XHQxXG5cdFx0XHRcdF1cblx0XHRcdH1cblx0XHRdXG5cdH0sXG5cdHtcblx0XHRcIndyYXBwZXJcIjogXCIjYmF0dGxlb2ZhZ2VuZXJhdGlvblwiLFxuXHRcdFwiZHVyYXRpb25cIjogXCIxMDAlXCIsXG5cdFx0XCJmb2N1c1wiOiB0cnVlLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXG5cdFx0XHR7fVxuXHRcdF1cblx0fSxcblx0e1xuXHRcdFwid3JhcHBlclwiOiBcIiNiYXR0bGVvZmFnZW5lcmF0aW9uXCIsXG5cdFx0XCJkdXJhdGlvblwiOiBcIjEwMCVcIixcblx0XHRcImFuaW1hdGlvbnNcIjogW1xuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLmRpc3BsYXktNFwiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDEsXG5cdFx0XHRcdFx0MFxuXHRcdFx0XHRdXG5cdFx0XHR9XG5cdFx0XVxuXHR9XG5dO1xuXG5cbi8qKioqKioqKioqKioqKioqKlxuICoqIFdFQlBBQ0sgRk9PVEVSXG4gKiogLi9+L2pzb24tbG9hZGVyIS4vc2NlbmVzL2JhdHRsZW9mYWdlbmVyYXRpb24vc2NlbmUuanNvblxuICoqIG1vZHVsZSBpZCA9IDUxXG4gKiogbW9kdWxlIGNodW5rcyA9IDBcbiAqKi8iLCJtb2R1bGUuZXhwb3J0cyA9IFtcblx0e1xuXHRcdFwid3JhcHBlclwiOiBcIiNjb21wbGljYXRlZHNpdHVhdGlvblwiLFxuXHRcdFwiZHVyYXRpb25cIjogXCIxMDAlXCIsXG5cdFx0XCJhbmltYXRpb25zXCI6IFtcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5kaXNwbGF5LTRcIixcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQwLFxuXHRcdFx0XHRcdDFcblx0XHRcdFx0XVxuXHRcdFx0fVxuXHRcdF1cblx0fSxcblx0e1xuXHRcdFwid3JhcHBlclwiOiBcIiNjb21wbGljYXRlZHNpdHVhdGlvblwiLFxuXHRcdFwiZHVyYXRpb25cIjogXCIxMDAlXCIsXG5cdFx0XCJmb2N1c1wiOiB0cnVlLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXG5cdFx0XHR7fVxuXHRcdF1cblx0fSxcblx0e1xuXHRcdFwid3JhcHBlclwiOiBcIiNjb21wbGljYXRlZHNpdHVhdGlvblwiLFxuXHRcdFwiZHVyYXRpb25cIjogXCIxMDAlXCIsXG5cdFx0XCJhbmltYXRpb25zXCI6IFtcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5kaXNwbGF5LTRcIixcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQxLFxuXHRcdFx0XHRcdDBcblx0XHRcdFx0XVxuXHRcdFx0fSxcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi50b28tbG9uZy1xdW90ZVwiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDEsXG5cdFx0XHRcdFx0MFxuXHRcdFx0XHRdXG5cdFx0XHR9XG5cdFx0XVxuXHR9XG5dO1xuXG5cbi8qKioqKioqKioqKioqKioqKlxuICoqIFdFQlBBQ0sgRk9PVEVSXG4gKiogLi9+L2pzb24tbG9hZGVyIS4vc2NlbmVzL2NvbXBsaWNhdGVkc2l0dWF0aW9uL3NjZW5lLmpzb25cbiAqKiBtb2R1bGUgaWQgPSA1MlxuICoqIG1vZHVsZSBjaHVua3MgPSAwXG4gKiovIiwibW9kdWxlLmV4cG9ydHMgPSBbXG5cdHtcblx0XHRcIndyYXBwZXJcIjogXCIjZGlmZmVyZW50cHJhY3RpY2VzXCIsXG5cdFx0XCJkdXJhdGlvblwiOiBcIjEwMCVcIixcblx0XHRcImFuaW1hdGlvbnNcIjogW1xuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLmRpc3BsYXktNFwiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDAsXG5cdFx0XHRcdFx0MS4yNVxuXHRcdFx0XHRdXG5cdFx0XHR9XG5cdFx0XVxuXHR9LFxuXHR7XG5cdFx0XCJ3cmFwcGVyXCI6IFwiI2RpZmZlcmVudHByYWN0aWNlc1wiLFxuXHRcdFwiZHVyYXRpb25cIjogXCIxMDAlXCIsXG5cdFx0XCJmb2N1c1wiOiB0cnVlLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXG5cdFx0XHR7fVxuXHRcdF1cblx0fSxcblx0e1xuXHRcdFwid3JhcHBlclwiOiBcIiNkaWZmZXJlbnRwcmFjdGljZXNcIixcblx0XHRcImR1cmF0aW9uXCI6IFwiMTAwJVwiLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIuZGlzcGxheS00XCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0Mixcblx0XHRcdFx0XHQwXG5cdFx0XHRcdF1cblx0XHRcdH1cblx0XHRdXG5cdH1cbl07XG5cblxuLyoqKioqKioqKioqKioqKioqXG4gKiogV0VCUEFDSyBGT09URVJcbiAqKiAuL34vanNvbi1sb2FkZXIhLi9zY2VuZXMvZGlmZmVyZW50cHJhY3RpY2VzL3NjZW5lLmpzb25cbiAqKiBtb2R1bGUgaWQgPSA1M1xuICoqIG1vZHVsZSBjaHVua3MgPSAwXG4gKiovIiwibW9kdWxlLmV4cG9ydHMgPSBbXG5cdHtcblx0XHRcIndyYXBwZXJcIjogXCIjZG95b3VmZWVsbXVzbGltXCIsXG5cdFx0XCJkdXJhdGlvblwiOiBcIjUwJVwiLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIuYW5pbS0xXCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiAxXG5cdFx0XHR9XG5cdFx0XVxuXHR9LFxuXHR7XG5cdFx0XCJ3cmFwcGVyXCI6IFwiI2RveW91ZmVlbG11c2xpbVwiLFxuXHRcdFwiZHVyYXRpb25cIjogXCIxMDAlXCIsXG5cdFx0XCJmb2N1c1wiOiAzLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXG5cdFx0XHR7fVxuXHRcdF1cblx0fSxcblx0e1xuXHRcdFwid3JhcHBlclwiOiBcIiNkb3lvdWZlZWxtdXNsaW1cIixcblx0XHRcImR1cmF0aW9uXCI6IFwiMTAwJVwiLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIuYW5pbS0xXCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MSxcblx0XHRcdFx0XHQwXG5cdFx0XHRcdF0sXG5cdFx0XHRcdFwidHJhbnNsYXRlWVwiOiBbXG5cdFx0XHRcdFx0XCIwJVwiLFxuXHRcdFx0XHRcdFwiLTUlXCJcblx0XHRcdFx0XVxuXHRcdFx0fVxuXHRcdF1cblx0fVxuXTtcblxuXG4vKioqKioqKioqKioqKioqKipcbiAqKiBXRUJQQUNLIEZPT1RFUlxuICoqIC4vfi9qc29uLWxvYWRlciEuL3NjZW5lcy9kb3lvdWZlZWxtdXNsaW0vc2NlbmUuanNvblxuICoqIG1vZHVsZSBpZCA9IDU0XG4gKiogbW9kdWxlIGNodW5rcyA9IDBcbiAqKi8iLCJtb2R1bGUuZXhwb3J0cyA9IFtcblx0e1xuXHRcdFwid3JhcHBlclwiOiBcIiNleHBsb3Npb25cIixcblx0XHRcImR1cmF0aW9uXCI6IFwiMTUwJVwiLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIuZXhwbG9zaW9uLWJ5bGluZVwiLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVlcIjogXCItMjUlXCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MCxcblx0XHRcdFx0XHQxLjc1XG5cdFx0XHRcdF1cblx0XHRcdH0sXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIjZG9tRXhwbG9zaW9uTGlzdFwiLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVlcIjogXCItNzAlXCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MCxcblx0XHRcdFx0XHQxXG5cdFx0XHRcdF1cblx0XHRcdH1cblx0XHRdXG5cdH0sXG5cdHtcblx0XHRcIndyYXBwZXJcIjogXCIjZXhwbG9zaW9uXCIsXG5cdFx0XCJkdXJhdGlvblwiOiBcIjE1MCVcIixcblx0XHRcImFuaW1hdGlvbnNcIjogW1xuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLmRlaS0xXCIsXG5cdFx0XHRcdFwidHJhbnNsYXRlWVwiOiBcIi0xNSVcIixcblx0XHRcdFx0XCJ0cmFuc2xhdGVYXCI6IFwiLTEwJVwiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDEsXG5cdFx0XHRcdFx0MFxuXHRcdFx0XHRdLFxuXHRcdFx0XHRcInNjYWxlXCI6IDJcblx0XHRcdH0sXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIuZGVpLTJcIixcblx0XHRcdFx0XCJ0cmFuc2xhdGVZXCI6IFwiLTUlXCIsXG5cdFx0XHRcdFwidHJhbnNsYXRlWFwiOiBcIi00JVwiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDEsXG5cdFx0XHRcdFx0MFxuXHRcdFx0XHRdXG5cdFx0XHR9LFxuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLmRlaS0zXCIsXG5cdFx0XHRcdFwidHJhbnNsYXRlWVwiOiBcIi05JVwiLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVhcIjogXCIyJVwiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDEsXG5cdFx0XHRcdFx0MFxuXHRcdFx0XHRdLFxuXHRcdFx0XHRcInNjYWxlXCI6IDEuMlxuXHRcdFx0fSxcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5kZWktNFwiLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVlcIjogXCItMTclXCIsXG5cdFx0XHRcdFwidHJhbnNsYXRlWFwiOiBcIjglXCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MSxcblx0XHRcdFx0XHQwXG5cdFx0XHRcdF0sXG5cdFx0XHRcdFwic2NhbGVcIjogMS41XG5cdFx0XHR9LFxuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLmRlaS01XCIsXG5cdFx0XHRcdFwidHJhbnNsYXRlWVwiOiBcIi0yJVwiLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVhcIjogXCItMTUlXCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MSxcblx0XHRcdFx0XHQwXG5cdFx0XHRcdF0sXG5cdFx0XHRcdFwic2NhbGVcIjogMlxuXHRcdFx0fSxcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5kZWktNlwiLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVlcIjogXCItMSVcIixcblx0XHRcdFx0XCJ0cmFuc2xhdGVYXCI6IFwiLTclXCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MSxcblx0XHRcdFx0XHQwXG5cdFx0XHRcdF0sXG5cdFx0XHRcdFwic2NhbGVcIjogMS4yXG5cdFx0XHR9LFxuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLmRlaS03XCIsXG5cdFx0XHRcdFwidHJhbnNsYXRlWVwiOiBcIi00JVwiLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVhcIjogXCIyJVwiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDEsXG5cdFx0XHRcdFx0MFxuXHRcdFx0XHRdLFxuXHRcdFx0XHRcInNjYWxlXCI6IDEuMVxuXHRcdFx0fSxcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5kZWktOFwiLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVlcIjogXCItMyVcIixcblx0XHRcdFx0XCJ0cmFuc2xhdGVYXCI6IFwiMTIlXCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MSxcblx0XHRcdFx0XHQwXG5cdFx0XHRcdF0sXG5cdFx0XHRcdFwic2NhbGVcIjogMS44XG5cdFx0XHR9LFxuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLmRlaS05XCIsXG5cdFx0XHRcdFwidHJhbnNsYXRlWVwiOiBcIjMlXCIsXG5cdFx0XHRcdFwidHJhbnNsYXRlWFwiOiBcIi0xMiVcIixcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQxLFxuXHRcdFx0XHRcdDBcblx0XHRcdFx0XSxcblx0XHRcdFx0XCJzY2FsZVwiOiAxLjVcblx0XHRcdH0sXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIuZGVpLTEwXCIsXG5cdFx0XHRcdFwidHJhbnNsYXRlWVwiOiBcIjUlXCIsXG5cdFx0XHRcdFwidHJhbnNsYXRlWFwiOiBcIi00JVwiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDEsXG5cdFx0XHRcdFx0MFxuXHRcdFx0XHRdXG5cdFx0XHR9LFxuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLmRlaS0xMVwiLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVlcIjogXCI4JVwiLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVhcIjogXCI2JVwiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDEsXG5cdFx0XHRcdFx0MFxuXHRcdFx0XHRdLFxuXHRcdFx0XHRcInNjYWxlXCI6IDEuNFxuXHRcdFx0fSxcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5kZWktMTJcIixcblx0XHRcdFx0XCJ0cmFuc2xhdGVZXCI6IFwiMSVcIixcblx0XHRcdFx0XCJ0cmFuc2xhdGVYXCI6IFwiMjAlXCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MSxcblx0XHRcdFx0XHQwXG5cdFx0XHRcdF0sXG5cdFx0XHRcdFwic2NhbGVcIjogMS45XG5cdFx0XHR9LFxuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLmRlaS0xM1wiLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVlcIjogXCI4JVwiLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVhcIjogXCItMTIlXCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MSxcblx0XHRcdFx0XHQwXG5cdFx0XHRcdF0sXG5cdFx0XHRcdFwic2NhbGVcIjogMS44XG5cdFx0XHR9LFxuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLmRlaS0xNFwiLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVlcIjogXCI0JVwiLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVhcIjogXCItMyVcIixcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQxLFxuXHRcdFx0XHRcdDBcblx0XHRcdFx0XSxcblx0XHRcdFx0XCJzY2FsZVwiOiAxLjNcblx0XHRcdH0sXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIuZGVpLTE1XCIsXG5cdFx0XHRcdFwidHJhbnNsYXRlWVwiOiBcIjE0JVwiLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVhcIjogXCI1JVwiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDEsXG5cdFx0XHRcdFx0MFxuXHRcdFx0XHRdLFxuXHRcdFx0XHRcInNjYWxlXCI6IDEuN1xuXHRcdFx0fSxcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5kZWktMTZcIixcblx0XHRcdFx0XCJ0cmFuc2xhdGVZXCI6IFwiNiVcIixcblx0XHRcdFx0XCJ0cmFuc2xhdGVYXCI6IFwiOSVcIixcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQxLFxuXHRcdFx0XHRcdDBcblx0XHRcdFx0XSxcblx0XHRcdFx0XCJzY2FsZVwiOiAyXG5cdFx0XHR9XG5cdFx0XVxuXHR9LFxuXHR7XG5cdFx0XCJ3cmFwcGVyXCI6IFwiI2V4cGxvc2lvblwiLFxuXHRcdFwiZHVyYXRpb25cIjogXCIxMDAlXCIsXG5cdFx0XCJhbmltYXRpb25zXCI6IFtcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5leHBsb3Npb24tYnlsaW5lXCIsXG5cdFx0XHRcdFwidHJhbnNsYXRlWVwiOiBbXG5cdFx0XHRcdFx0XCItMjUlXCIsXG5cdFx0XHRcdFx0XCItNDAlXCJcblx0XHRcdFx0XSxcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQxLFxuXHRcdFx0XHRcdDBcblx0XHRcdFx0XVxuXHRcdFx0fVxuXHRcdF1cblx0fVxuXTtcblxuXG4vKioqKioqKioqKioqKioqKipcbiAqKiBXRUJQQUNLIEZPT1RFUlxuICoqIC4vfi9qc29uLWxvYWRlciEuL3NjZW5lcy9leHBsb3Npb24vc2NlbmUuanNvblxuICoqIG1vZHVsZSBpZCA9IDU1XG4gKiogbW9kdWxlIGNodW5rcyA9IDBcbiAqKi8iLCJtb2R1bGUuZXhwb3J0cyA9IFtcblx0e1xuXHRcdFwid3JhcHBlclwiOiBcIiNmZWVsaW5nY29uZnVzZWRcIixcblx0XHRcImR1cmF0aW9uXCI6IFwiMTAwJVwiLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIudXMtYWdhaW5zdC10aGVtXCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MCxcblx0XHRcdFx0XHQxXG5cdFx0XHRcdF1cblx0XHRcdH1cblx0XHRdXG5cdH0sXG5cdHtcblx0XHRcIndyYXBwZXJcIjogXCIjZmVlbGluZ2NvbmZ1c2VkXCIsXG5cdFx0XCJkdXJhdGlvblwiOiBcIjEwMCVcIixcblx0XHRcImZvY3VzXCI6IHRydWUsXG5cdFx0XCJhbmltYXRpb25zXCI6IFtcblx0XHRcdHt9XG5cdFx0XVxuXHR9LFxuXHR7XG5cdFx0XCJ3cmFwcGVyXCI6IFwiI2ZlZWxpbmdjb25mdXNlZFwiLFxuXHRcdFwiZHVyYXRpb25cIjogXCIxMDAlXCIsXG5cdFx0XCJhbmltYXRpb25zXCI6IFtcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi51cy1hZ2FpbnN0LXRoZW1cIixcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQyLFxuXHRcdFx0XHRcdDBcblx0XHRcdFx0XVxuXHRcdFx0fVxuXHRcdF1cblx0fVxuXTtcblxuXG4vKioqKioqKioqKioqKioqKipcbiAqKiBXRUJQQUNLIEZPT1RFUlxuICoqIC4vfi9qc29uLWxvYWRlciEuL3NjZW5lcy9mZWVsaW5nY29uZnVzZWQvc2NlbmUuanNvblxuICoqIG1vZHVsZSBpZCA9IDU2XG4gKiogbW9kdWxlIGNodW5rcyA9IDBcbiAqKi8iLCJtb2R1bGUuZXhwb3J0cyA9IFtcblx0e1xuXHRcdFwid3JhcHBlclwiOiBcIiNpbnRyb1wiLFxuXHRcdFwiZHVyYXRpb25cIjogXCIxMDAlXCIsXG5cdFx0XCJmb2N1c1wiOiB0cnVlLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIuZGlzcGxheS0xXCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MSxcblx0XHRcdFx0XHQwXG5cdFx0XHRcdF1cblx0XHRcdH1cblx0XHRdXG5cdH1cbl07XG5cblxuLyoqKioqKioqKioqKioqKioqXG4gKiogV0VCUEFDSyBGT09URVJcbiAqKiAuL34vanNvbi1sb2FkZXIhLi9zY2VuZXMvaW50cm8vc2NlbmUuanNvblxuICoqIG1vZHVsZSBpZCA9IDU3XG4gKiogbW9kdWxlIGNodW5rcyA9IDBcbiAqKi8iLCJtb2R1bGUuZXhwb3J0cyA9IFtcblx0e1xuXHRcdFwid3JhcHBlclwiOiBcIiNpc2lzYWZ0ZXJsaWZlZmFsbGFjeVwiLFxuXHRcdFwiZHVyYXRpb25cIjogXCIxMDAlXCIsXG5cdFx0XCJhbmltYXRpb25zXCI6IFtcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5wcmVtaXNlXCIsXG5cdFx0XHRcdFwidHJhbnNsYXRlWVwiOiBcIjBcIixcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQwLFxuXHRcdFx0XHRcdDEuNzVcblx0XHRcdFx0XVxuXHRcdFx0fSxcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5jb25jbHVzaW9uXCIsXG5cdFx0XHRcdFwidHJhbnNsYXRlWFwiOiBcIi0yNSVcIixcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQwLFxuXHRcdFx0XHRcdDBcblx0XHRcdFx0XVxuXHRcdFx0fSxcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5jYWxjdWxhdG9yXCIsXG5cdFx0XHRcdFwidHJhbnNsYXRlWFwiOiBcIjY1JVwiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDAsXG5cdFx0XHRcdFx0MFxuXHRcdFx0XHRdXG5cdFx0XHR9LFxuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLnF1cmFuLXJlYWRcIixcblx0XHRcdFx0XCJ0cmFuc2xhdGVZXCI6IFwiMCVcIixcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQwLFxuXHRcdFx0XHRcdDBcblx0XHRcdFx0XVxuXHRcdFx0fVxuXHRcdF1cblx0fSxcblx0e1xuXHRcdFwid3JhcHBlclwiOiBcIiNpc2lzYWZ0ZXJsaWZlZmFsbGFjeVwiLFxuXHRcdFwiZHVyYXRpb25cIjogXCIxMDAlXCIsXG5cdFx0XCJmb2N1c1wiOiB0cnVlLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXG5cdFx0XHR7fVxuXHRcdF1cblx0fSxcblx0e1xuXHRcdFwid3JhcHBlclwiOiBcIiNpc2lzYWZ0ZXJsaWZlZmFsbGFjeVwiLFxuXHRcdFwiZHVyYXRpb25cIjogXCIxNTAlXCIsXG5cdFx0XCJhbmltYXRpb25zXCI6IFtcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5jb25jbHVzaW9uXCIsXG5cdFx0XHRcdFwidHJhbnNsYXRlWFwiOiBbXG5cdFx0XHRcdFx0XCItMjUlXCIsXG5cdFx0XHRcdFx0XCIwXCJcblx0XHRcdFx0XSxcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQwLFxuXHRcdFx0XHRcdDFcblx0XHRcdFx0XVxuXHRcdFx0fSxcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5jYWxjdWxhdG9yXCIsXG5cdFx0XHRcdFwidHJhbnNsYXRlWFwiOiBbXG5cdFx0XHRcdFx0XCI2NSVcIixcblx0XHRcdFx0XHRcIjBcIlxuXHRcdFx0XHRdLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDAsXG5cdFx0XHRcdFx0MVxuXHRcdFx0XHRdXG5cdFx0XHR9LFxuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLnF1cmFuLXJlYWRcIixcblx0XHRcdFx0XCJ0cmFuc2xhdGVZXCI6IFtcblx0XHRcdFx0XHRcIjBcIixcblx0XHRcdFx0XHRcIjBcIlxuXHRcdFx0XHRdLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDFcblx0XHRcdFx0XVxuXHRcdFx0fSxcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5xdXJhbi1oaWRkZW5cIixcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQwLFxuXHRcdFx0XHRcdDFcblx0XHRcdFx0XVxuXHRcdFx0fVxuXHRcdF1cblx0fSxcblx0e1xuXHRcdFwid3JhcHBlclwiOiBcIiNpc2lzYWZ0ZXJsaWZlZmFsbGFjeVwiLFxuXHRcdFwiZHVyYXRpb25cIjogXCIxMDAlXCIsXG5cdFx0XCJmb2N1c1wiOiB0cnVlLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXG5cdFx0XHR7fVxuXHRcdF1cblx0fSxcblx0e1xuXHRcdFwid3JhcHBlclwiOiBcIiNpc2lzYWZ0ZXJsaWZlZmFsbGFjeVwiLFxuXHRcdFwiZHVyYXRpb25cIjogXCIxNTAlXCIsXG5cdFx0XCJhbmltYXRpb25zXCI6IFtcblx0XHRcdHt9XG5cdFx0XVxuXHR9LFxuXHR7XG5cdFx0XCJ3cmFwcGVyXCI6IFwiI2lzaXNhZnRlcmxpZmVmYWxsYWN5XCIsXG5cdFx0XCJkdXJhdGlvblwiOiBcIjI1MCVcIixcblx0XHRcImFuaW1hdGlvbnNcIjogW1xuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLmNvbmNsdXNpb25cIixcblx0XHRcdFx0XCJ0cmFuc2xhdGVZXCI6IFtcblx0XHRcdFx0XHRcIjBcIixcblx0XHRcdFx0XHRcIi0yNSVcIlxuXHRcdFx0XHRdLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDEsXG5cdFx0XHRcdFx0MFxuXHRcdFx0XHRdXG5cdFx0XHR9LFxuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLmNhbGN1bGF0b3JcIixcblx0XHRcdFx0XCJ0cmFuc2xhdGVZXCI6IFtcblx0XHRcdFx0XHRcIjBcIixcblx0XHRcdFx0XHRcIi0yNSVcIlxuXHRcdFx0XHRdLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDEsXG5cdFx0XHRcdFx0MFxuXHRcdFx0XHRdXG5cdFx0XHR9LFxuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLnF1cmFuLXJlYWRcIixcblx0XHRcdFx0XCJ0cmFuc2xhdGVZXCI6IFtcblx0XHRcdFx0XHRcIjAlXCIsXG5cdFx0XHRcdFx0XCItMjUlXCJcblx0XHRcdFx0XSxcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQxLFxuXHRcdFx0XHRcdDBcblx0XHRcdFx0XVxuXHRcdFx0fSxcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5wcmVtaXNlXCIsXG5cdFx0XHRcdFwidHJhbnNsYXRlWVwiOiBbXG5cdFx0XHRcdFx0XCIwJVwiLFxuXHRcdFx0XHRcdFwiLTI1JVwiXG5cdFx0XHRcdF0sXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MSxcblx0XHRcdFx0XHQwXG5cdFx0XHRcdF1cblx0XHRcdH1cblx0XHRdXG5cdH1cbl07XG5cblxuLyoqKioqKioqKioqKioqKioqXG4gKiogV0VCUEFDSyBGT09URVJcbiAqKiAuL34vanNvbi1sb2FkZXIhLi9zY2VuZXMvaXNpc2FmdGVybGlmZWZhbGxhY3kvc2NlbmUuanNvblxuICoqIG1vZHVsZSBpZCA9IDU4XG4gKiogbW9kdWxlIGNodW5rcyA9IDBcbiAqKi8iLCJtb2R1bGUuZXhwb3J0cyA9IFtcblx0e1xuXHRcdFwid3JhcHBlclwiOiBcIiNpc2lzYXBvY2FseXBzZW1pc3F1b3RlXCIsXG5cdFx0XCJkdXJhdGlvblwiOiBcIjEwMCVcIixcblx0XHRcImFuaW1hdGlvbnNcIjogW1xuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLnByZW1pc2VcIixcblx0XHRcdFx0XCJ0cmFuc2xhdGVZXCI6IFwiMFwiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDAsXG5cdFx0XHRcdFx0MS43NVxuXHRcdFx0XHRdXG5cdFx0XHR9LFxuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLmNvbmNsdXNpb25cIixcblx0XHRcdFx0XCJ0cmFuc2xhdGVZXCI6IFwiMjUlXCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MCxcblx0XHRcdFx0XHQwXG5cdFx0XHRcdF1cblx0XHRcdH0sXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIucXVyYW4tcmVhZFwiLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVlcIjogXCIwJVwiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDAsXG5cdFx0XHRcdFx0MFxuXHRcdFx0XHRdXG5cdFx0XHR9XG5cdFx0XVxuXHR9LFxuXHR7XG5cdFx0XCJ3cmFwcGVyXCI6IFwiI2lzaXNhcG9jYWx5cHNlbWlzcXVvdGVcIixcblx0XHRcImR1cmF0aW9uXCI6IFwiMTAwJVwiLFxuXHRcdFwiZm9jdXNcIjogdHJ1ZSxcblx0XHRcImFuaW1hdGlvbnNcIjogW1xuXHRcdFx0e31cblx0XHRdXG5cdH0sXG5cdHtcblx0XHRcIndyYXBwZXJcIjogXCIjaXNpc2Fwb2NhbHlwc2VtaXNxdW90ZVwiLFxuXHRcdFwiZHVyYXRpb25cIjogXCIxNTAlXCIsXG5cdFx0XCJhbmltYXRpb25zXCI6IFtcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5jb25jbHVzaW9uXCIsXG5cdFx0XHRcdFwidHJhbnNsYXRlWVwiOiBbXG5cdFx0XHRcdFx0XCIyNSVcIixcblx0XHRcdFx0XHRcIjBcIlxuXHRcdFx0XHRdLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDAsXG5cdFx0XHRcdFx0MVxuXHRcdFx0XHRdXG5cdFx0XHR9LFxuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLnF1cmFuLXJlYWRcIixcblx0XHRcdFx0XCJ0cmFuc2xhdGVZXCI6IFtcblx0XHRcdFx0XHRcIjBcIixcblx0XHRcdFx0XHRcIjBcIlxuXHRcdFx0XHRdLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDFcblx0XHRcdFx0XVxuXHRcdFx0fSxcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5xdXJhbi1oaWRkZW5cIixcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQwLFxuXHRcdFx0XHRcdDFcblx0XHRcdFx0XVxuXHRcdFx0fVxuXHRcdF1cblx0fSxcblx0e1xuXHRcdFwid3JhcHBlclwiOiBcIiNpc2lzYXBvY2FseXBzZW1pc3F1b3RlXCIsXG5cdFx0XCJkdXJhdGlvblwiOiBcIjEwMCVcIixcblx0XHRcImZvY3VzXCI6IHRydWUsXG5cdFx0XCJhbmltYXRpb25zXCI6IFtcblx0XHRcdHt9XG5cdFx0XVxuXHR9LFxuXHR7XG5cdFx0XCJ3cmFwcGVyXCI6IFwiI2lzaXNhcG9jYWx5cHNlbWlzcXVvdGVcIixcblx0XHRcImR1cmF0aW9uXCI6IFwiMTUwJVwiLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXG5cdFx0XHR7fVxuXHRcdF1cblx0fSxcblx0e1xuXHRcdFwid3JhcHBlclwiOiBcIiNpc2lzYXBvY2FseXBzZW1pc3F1b3RlXCIsXG5cdFx0XCJkdXJhdGlvblwiOiBcIjI1MCVcIixcblx0XHRcImFuaW1hdGlvbnNcIjogW1xuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLmNvbmNsdXNpb25cIixcblx0XHRcdFx0XCJ0cmFuc2xhdGVZXCI6IFtcblx0XHRcdFx0XHRcIjBcIixcblx0XHRcdFx0XHRcIi0yNSVcIlxuXHRcdFx0XHRdLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDEsXG5cdFx0XHRcdFx0MFxuXHRcdFx0XHRdXG5cdFx0XHR9LFxuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLnF1cmFuLXJlYWRcIixcblx0XHRcdFx0XCJ0cmFuc2xhdGVZXCI6IFtcblx0XHRcdFx0XHRcIjAlXCIsXG5cdFx0XHRcdFx0XCItMjUlXCJcblx0XHRcdFx0XSxcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQxLFxuXHRcdFx0XHRcdDBcblx0XHRcdFx0XVxuXHRcdFx0fSxcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5wcmVtaXNlXCIsXG5cdFx0XHRcdFwidHJhbnNsYXRlWVwiOiBbXG5cdFx0XHRcdFx0XCIwJVwiLFxuXHRcdFx0XHRcdFwiLTI1JVwiXG5cdFx0XHRcdF0sXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MSxcblx0XHRcdFx0XHQwXG5cdFx0XHRcdF1cblx0XHRcdH1cblx0XHRdXG5cdH1cbl07XG5cblxuLyoqKioqKioqKioqKioqKioqXG4gKiogV0VCUEFDSyBGT09URVJcbiAqKiAuL34vanNvbi1sb2FkZXIhLi9zY2VuZXMvaXNpc2Fwb2NhbHlwc2VtaXNxdW90ZS9zY2VuZS5qc29uXG4gKiogbW9kdWxlIGlkID0gNTlcbiAqKiBtb2R1bGUgY2h1bmtzID0gMFxuICoqLyIsIm1vZHVsZS5leHBvcnRzID0gW1xuXHR7XG5cdFx0XCJ3cmFwcGVyXCI6IFwiI2lzaXNiYW5rcnVwdFwiLFxuXHRcdFwiZHVyYXRpb25cIjogXCIxMDAlXCIsXG5cdFx0XCJhbmltYXRpb25zXCI6IFtcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5kaXNwbGF5LTRcIixcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQwLFxuXHRcdFx0XHRcdDFcblx0XHRcdFx0XVxuXHRcdFx0fVxuXHRcdF1cblx0fSxcblx0e1xuXHRcdFwid3JhcHBlclwiOiBcIiNpc2lzYmFua3J1cHRcIixcblx0XHRcImR1cmF0aW9uXCI6IFwiMTAwJVwiLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIuY3VubmluZzFcIixcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQwLFxuXHRcdFx0XHRcdDFcblx0XHRcdFx0XSxcblx0XHRcdFx0XCJ0cmFuc2xhdGVZXCI6IFtcblx0XHRcdFx0XHRcIi00JVwiLFxuXHRcdFx0XHRcdFwiMCVcIlxuXHRcdFx0XHRdLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVhcIjogW1xuXHRcdFx0XHRcdFwiMyVcIixcblx0XHRcdFx0XHRcIjBcIlxuXHRcdFx0XHRdXG5cdFx0XHR9LFxuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLmNvbmNsdXNpb25cIixcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQwLFxuXHRcdFx0XHRcdDFcblx0XHRcdFx0XVxuXHRcdFx0fVxuXHRcdF1cblx0fSxcblx0e1xuXHRcdFwid3JhcHBlclwiOiBcIiNpc2lzYmFua3J1cHRcIixcblx0XHRcImR1cmF0aW9uXCI6IFwiMTAwJVwiLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIuY3VubmluZzJcIixcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQwLFxuXHRcdFx0XHRcdDFcblx0XHRcdFx0XSxcblx0XHRcdFx0XCJ0cmFuc2xhdGVZXCI6IFtcblx0XHRcdFx0XHRcIjAlXCIsXG5cdFx0XHRcdFx0XCIwJVwiXG5cdFx0XHRcdF0sXG5cdFx0XHRcdFwidHJhbnNsYXRlWFwiOiBbXG5cdFx0XHRcdFx0XCIzJVwiLFxuXHRcdFx0XHRcdFwiMFwiXG5cdFx0XHRcdF1cblx0XHRcdH1cblx0XHRdXG5cdH0sXG5cdHtcblx0XHRcIndyYXBwZXJcIjogXCIjaXNpc2JhbmtydXB0XCIsXG5cdFx0XCJkdXJhdGlvblwiOiBcIjEwMCVcIixcblx0XHRcImFuaW1hdGlvbnNcIjogW1xuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLmN1bm5pbmczXCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MCxcblx0XHRcdFx0XHQxXG5cdFx0XHRcdF0sXG5cdFx0XHRcdFwidHJhbnNsYXRlWVwiOiBbXG5cdFx0XHRcdFx0XCI0JVwiLFxuXHRcdFx0XHRcdFwiMCVcIlxuXHRcdFx0XHRdLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVhcIjogW1xuXHRcdFx0XHRcdFwiMyVcIixcblx0XHRcdFx0XHRcIjBcIlxuXHRcdFx0XHRdXG5cdFx0XHR9XG5cdFx0XVxuXHR9LFxuXHR7XG5cdFx0XCJ3cmFwcGVyXCI6IFwiI2lzaXNiYW5rcnVwdFwiLFxuXHRcdFwiZHVyYXRpb25cIjogXCIxMDAlXCIsXG5cdFx0XCJhbmltYXRpb25zXCI6IFtcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5jdW5uaW5nNFwiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDAsXG5cdFx0XHRcdFx0MVxuXHRcdFx0XHRdLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVlcIjogW1xuXHRcdFx0XHRcdFwiNCVcIixcblx0XHRcdFx0XHRcIjAlXCJcblx0XHRcdFx0XSxcblx0XHRcdFx0XCJ0cmFuc2xhdGVYXCI6IFtcblx0XHRcdFx0XHRcIjAlXCIsXG5cdFx0XHRcdFx0XCIwXCJcblx0XHRcdFx0XVxuXHRcdFx0fVxuXHRcdF1cblx0fSxcblx0e1xuXHRcdFwid3JhcHBlclwiOiBcIiNpc2lzYmFua3J1cHRcIixcblx0XHRcImR1cmF0aW9uXCI6IFwiMTAwJVwiLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIuY3VubmluZzVcIixcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQwLFxuXHRcdFx0XHRcdDFcblx0XHRcdFx0XSxcblx0XHRcdFx0XCJ0cmFuc2xhdGVZXCI6IFtcblx0XHRcdFx0XHRcIjQlXCIsXG5cdFx0XHRcdFx0XCIwJVwiXG5cdFx0XHRcdF0sXG5cdFx0XHRcdFwidHJhbnNsYXRlWFwiOiBbXG5cdFx0XHRcdFx0XCItMyVcIixcblx0XHRcdFx0XHRcIjBcIlxuXHRcdFx0XHRdXG5cdFx0XHR9XG5cdFx0XVxuXHR9LFxuXHR7XG5cdFx0XCJ3cmFwcGVyXCI6IFwiI2lzaXNiYW5rcnVwdFwiLFxuXHRcdFwiZHVyYXRpb25cIjogXCIxMDAlXCIsXG5cdFx0XCJmb2N1c1wiOiB0cnVlLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXVxuXHR9LFxuXHR7XG5cdFx0XCJ3cmFwcGVyXCI6IFwiI2lzaXNiYW5rcnVwdFwiLFxuXHRcdFwiZHVyYXRpb25cIjogXCIxMDAlXCIsXG5cdFx0XCJhbmltYXRpb25zXCI6IFtcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5jdW5uaW5nNlwiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDAsXG5cdFx0XHRcdFx0MVxuXHRcdFx0XHRdLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVlcIjogW1xuXHRcdFx0XHRcdFwiMCVcIixcblx0XHRcdFx0XHRcIjQwJVwiXG5cdFx0XHRcdF0sXG5cdFx0XHRcdFwidHJhbnNsYXRlWFwiOiBbXG5cdFx0XHRcdFx0XCIwJVwiLFxuXHRcdFx0XHRcdFwiMCVcIlxuXHRcdFx0XHRdXG5cdFx0XHR9LFxuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLmN1bm5pbmc2XCIsXG5cdFx0XHRcdFwidHJhbnNsYXRlWVwiOiBbXG5cdFx0XHRcdFx0XCIxMCVcIixcblx0XHRcdFx0XHRcIjAlXCJcblx0XHRcdFx0XSxcblx0XHRcdFx0XCJ0cmFuc2xhdGVYXCI6IFtcblx0XHRcdFx0XHRcIjAlXCIsXG5cdFx0XHRcdFx0XCIwJVwiXG5cdFx0XHRcdF0sXG5cdFx0XHRcdFwic2NhbGVcIjogW1xuXHRcdFx0XHRcdDEsXG5cdFx0XHRcdFx0MS41XG5cdFx0XHRcdF1cblx0XHRcdH0sXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIuY3VubmluZzFcIixcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQxLFxuXHRcdFx0XHRcdDBcblx0XHRcdFx0XVxuXHRcdFx0fSxcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5jdW5uaW5nMlwiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDEsXG5cdFx0XHRcdFx0MFxuXHRcdFx0XHRdXG5cdFx0XHR9LFxuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLmN1bm5pbmczXCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MSxcblx0XHRcdFx0XHQwXG5cdFx0XHRcdF1cblx0XHRcdH0sXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIuY3VubmluZzRcIixcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQxLFxuXHRcdFx0XHRcdDBcblx0XHRcdFx0XVxuXHRcdFx0fSxcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5jdW5uaW5nNVwiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDEsXG5cdFx0XHRcdFx0MFxuXHRcdFx0XHRdXG5cdFx0XHR9XG5cdFx0XVxuXHR9LFxuXHR7XG5cdFx0XCJ3cmFwcGVyXCI6IFwiI2lzaXNiYW5rcnVwdFwiLFxuXHRcdFwiZHVyYXRpb25cIjogXCIxMDAlXCIsXG5cdFx0XCJmb2N1c1wiOiB0cnVlLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXG5cdFx0XHR7fVxuXHRcdF1cblx0fSxcblx0e1xuXHRcdFwid3JhcHBlclwiOiBcIiNpc2lzYmFua3J1cHRcIixcblx0XHRcImR1cmF0aW9uXCI6IFwiMTAwJVwiLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIuY3VubmluZzZcIixcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQxLFxuXHRcdFx0XHRcdDBcblx0XHRcdFx0XSxcblx0XHRcdFx0XCJzY2FsZVwiOiBbXG5cdFx0XHRcdFx0MS41XG5cdFx0XHRcdF1cblx0XHRcdH0sXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIubmV3c3NvdXJjZS1ob3JcIixcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQxLFxuXHRcdFx0XHRcdDBcblx0XHRcdFx0XVxuXHRcdFx0fVxuXHRcdF1cblx0fSxcblx0e1xuXHRcdFwid3JhcHBlclwiOiBcIiNpc2lzYmFua3J1cHRcIixcblx0XHRcImR1cmF0aW9uXCI6IFwiMTAwJVwiLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIuYmxhY2stem9uZVwiLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVhcIjogW1xuXHRcdFx0XHRcdFwiMCVcIixcblx0XHRcdFx0XHRcIjkwJVwiXG5cdFx0XHRcdF1cblx0XHRcdH0sXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIuZGlzcGxheS00XCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MSxcblx0XHRcdFx0XHQwXG5cdFx0XHRcdF1cblx0XHRcdH1cblx0XHRdXG5cdH1cbl07XG5cblxuLyoqKioqKioqKioqKioqKioqXG4gKiogV0VCUEFDSyBGT09URVJcbiAqKiAuL34vanNvbi1sb2FkZXIhLi9zY2VuZXMvaXNpc2JhbmtydXB0L3NjZW5lLmpzb25cbiAqKiBtb2R1bGUgaWQgPSA2MFxuICoqIG1vZHVsZSBjaHVua3MgPSAwXG4gKiovIiwibW9kdWxlLmV4cG9ydHMgPSBbXG5cdHtcblx0XHRcIndyYXBwZXJcIjogXCIjaXNpc2ZpZ2h0bWlzcXVvdGVcIixcblx0XHRcImR1cmF0aW9uXCI6IFwiMTAwJVwiLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIucHJlbWlzZVwiLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVlcIjogXCIwXCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MCxcblx0XHRcdFx0XHQxLjc1XG5cdFx0XHRcdF1cblx0XHRcdH0sXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIuY29uY2x1c2lvblwiLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVlcIjogXCIyNSVcIixcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQwLFxuXHRcdFx0XHRcdDBcblx0XHRcdFx0XVxuXHRcdFx0fSxcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5xdXJhbi1yZWFkXCIsXG5cdFx0XHRcdFwidHJhbnNsYXRlWVwiOiBcIjAlXCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MCxcblx0XHRcdFx0XHQxXG5cdFx0XHRcdF1cblx0XHRcdH1cblx0XHRdXG5cdH0sXG5cdHtcblx0XHRcIndyYXBwZXJcIjogXCIjaXNpc2ZpZ2h0bWlzcXVvdGVcIixcblx0XHRcImR1cmF0aW9uXCI6IFwiMTAwJVwiLFxuXHRcdFwiZm9jdXNcIjogdHJ1ZSxcblx0XHRcImFuaW1hdGlvbnNcIjogW1xuXHRcdFx0e31cblx0XHRdXG5cdH0sXG5cdHtcblx0XHRcIndyYXBwZXJcIjogXCIjaXNpc2ZpZ2h0bWlzcXVvdGVcIixcblx0XHRcImR1cmF0aW9uXCI6IFwiMTUwJVwiLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIucHJlbWlzZVwiLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVlcIjogW1xuXHRcdFx0XHRcdFwiMFwiLFxuXHRcdFx0XHRcdFwiLTI1JVwiXG5cdFx0XHRcdF0sXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MSxcblx0XHRcdFx0XHQwXG5cdFx0XHRcdF1cblx0XHRcdH0sXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIuY29uY2x1c2lvblwiLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVlcIjogW1xuXHRcdFx0XHRcdFwiMjUlXCIsXG5cdFx0XHRcdFx0XCIwXCJcblx0XHRcdFx0XSxcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQwLFxuXHRcdFx0XHRcdDFcblx0XHRcdFx0XVxuXHRcdFx0fSxcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5xdXJhbi1yZWFkXCIsXG5cdFx0XHRcdFwidHJhbnNsYXRlWVwiOiBbXG5cdFx0XHRcdFx0XCIwXCIsXG5cdFx0XHRcdFx0XCIwXCJcblx0XHRcdFx0XSxcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQxXG5cdFx0XHRcdF1cblx0XHRcdH0sXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIucXVyYW4taGlkZGVuXCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MCxcblx0XHRcdFx0XHQxXG5cdFx0XHRcdF1cblx0XHRcdH1cblx0XHRdXG5cdH0sXG5cdHtcblx0XHRcIndyYXBwZXJcIjogXCIjaXNpc2ZpZ2h0bWlzcXVvdGVcIixcblx0XHRcImR1cmF0aW9uXCI6IFwiMTAwJVwiLFxuXHRcdFwiZm9jdXNcIjogdHJ1ZSxcblx0XHRcImFuaW1hdGlvbnNcIjogW1xuXHRcdFx0e31cblx0XHRdXG5cdH0sXG5cdHtcblx0XHRcIndyYXBwZXJcIjogXCIjaXNpc2ZpZ2h0bWlzcXVvdGVcIixcblx0XHRcImR1cmF0aW9uXCI6IFwiMTUwJVwiLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXG5cdFx0XHR7fVxuXHRcdF1cblx0fSxcblx0e1xuXHRcdFwid3JhcHBlclwiOiBcIiNpc2lzZmlnaHRtaXNxdW90ZVwiLFxuXHRcdFwiZHVyYXRpb25cIjogXCIyNTAlXCIsXG5cdFx0XCJhbmltYXRpb25zXCI6IFtcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5jb25jbHVzaW9uXCIsXG5cdFx0XHRcdFwidHJhbnNsYXRlWVwiOiBbXG5cdFx0XHRcdFx0XCIwXCIsXG5cdFx0XHRcdFx0XCItMjUlXCJcblx0XHRcdFx0XSxcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQxLFxuXHRcdFx0XHRcdDBcblx0XHRcdFx0XVxuXHRcdFx0fSxcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5xdXJhbi1yZWFkXCIsXG5cdFx0XHRcdFwidHJhbnNsYXRlWVwiOiBbXG5cdFx0XHRcdFx0XCIwJVwiLFxuXHRcdFx0XHRcdFwiLTI1JVwiXG5cdFx0XHRcdF0sXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MSxcblx0XHRcdFx0XHQwXG5cdFx0XHRcdF1cblx0XHRcdH1cblx0XHRdXG5cdH1cbl07XG5cblxuLyoqKioqKioqKioqKioqKioqXG4gKiogV0VCUEFDSyBGT09URVJcbiAqKiAuL34vanNvbi1sb2FkZXIhLi9zY2VuZXMvaXNpc2ZpZ2h0bWlzcXVvdGUvc2NlbmUuanNvblxuICoqIG1vZHVsZSBpZCA9IDYxXG4gKiogbW9kdWxlIGNodW5rcyA9IDBcbiAqKi8iLCJtb2R1bGUuZXhwb3J0cyA9IFtcblx0e1xuXHRcdFwid3JhcHBlclwiOiBcIiNpc2lzb2JqZWN0aXZlXCIsXG5cdFx0XCJkdXJhdGlvblwiOiBcIjEwMCVcIixcblx0XHRcImFuaW1hdGlvbnNcIjogW1xuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLmRpc3BsYXktNFwiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDEsXG5cdFx0XHRcdFx0MFxuXHRcdFx0XHRdXG5cdFx0XHR9XG5cdFx0XVxuXHR9XG5dO1xuXG5cbi8qKioqKioqKioqKioqKioqKlxuICoqIFdFQlBBQ0sgRk9PVEVSXG4gKiogLi9+L2pzb24tbG9hZGVyIS4vc2NlbmVzL2lzaXNvYmplY3RpdmUvc2NlbmUuanNvblxuICoqIG1vZHVsZSBpZCA9IDYyXG4gKiogbW9kdWxlIGNodW5rcyA9IDBcbiAqKi8iLCJtb2R1bGUuZXhwb3J0cyA9IFtcblx0e1xuXHRcdFwid3JhcHBlclwiOiBcIiNpc2lzd2FudHN0b2RpdmlkZVwiLFxuXHRcdFwiZHVyYXRpb25cIjogXCIxMDAlXCIsXG5cdFx0XCJhbmltYXRpb25zXCI6IFtcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi52aW9sZW50LXpvbmVzXCIsXG5cdFx0XHRcdFwic2NhbGVcIjogW1xuXHRcdFx0XHRcdDEsXG5cdFx0XHRcdFx0NS41NVxuXHRcdFx0XHRdXG5cdFx0XHR9LFxuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLmFuaW0tMlwiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDAsXG5cdFx0XHRcdFx0MS41NVxuXHRcdFx0XHRdXG5cdFx0XHR9XG5cdFx0XVxuXHR9LFxuXHR7XG5cdFx0XCJ3cmFwcGVyXCI6IFwiI2lzaXN3YW50c3RvZGl2aWRlXCIsXG5cdFx0XCJkdXJhdGlvblwiOiBcIjEwMCVcIixcblx0XHRcImZvY3VzXCI6IHRydWUsXG5cdFx0XCJhbmltYXRpb25zXCI6IFtcblx0XHRcdHt9XG5cdFx0XVxuXHR9LFxuXHR7XG5cdFx0XCJ3cmFwcGVyXCI6IFwiI2lzaXN3YW50c3RvZGl2aWRlXCIsXG5cdFx0XCJkdXJhdGlvblwiOiBcIjEwMCVcIixcblx0XHRcImFuaW1hdGlvbnNcIjogW1xuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLnZpb2xlbnQtem9uZXNcIixcblx0XHRcdFx0XCJzY2FsZVwiOiBbXG5cdFx0XHRcdFx0NS41NSxcblx0XHRcdFx0XHQwXG5cdFx0XHRcdF1cblx0XHRcdH0sXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIuYW5pbS0xXCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MCxcblx0XHRcdFx0XHQxLjU1XG5cdFx0XHRcdF1cblx0XHRcdH1cblx0XHRdXG5cdH0sXG5cdHtcblx0XHRcIndyYXBwZXJcIjogXCIjaXNpc3dhbnRzdG9kaXZpZGVcIixcblx0XHRcImR1cmF0aW9uXCI6IFwiMTAwJVwiLFxuXHRcdFwiZm9jdXNcIjogdHJ1ZSxcblx0XHRcImFuaW1hdGlvbnNcIjogW1xuXHRcdFx0e31cblx0XHRdXG5cdH0sXG5cdHtcblx0XHRcIndyYXBwZXJcIjogXCIjaXNpc3dhbnRzdG9kaXZpZGVcIixcblx0XHRcImR1cmF0aW9uXCI6IFwiMTAwJVwiLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIuYW5pbS0xXCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MSxcblx0XHRcdFx0XHQwXG5cdFx0XHRcdF0sXG5cdFx0XHRcdFwidHJhbnNsYXRlWVwiOiBbXG5cdFx0XHRcdFx0XCIwJVwiLFxuXHRcdFx0XHRcdFwiLTIwJVwiXG5cdFx0XHRcdF1cblx0XHRcdH0sXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIuYW5pbS0yXCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MSxcblx0XHRcdFx0XHQwXG5cdFx0XHRcdF0sXG5cdFx0XHRcdFwidHJhbnNsYXRlWVwiOiBbXG5cdFx0XHRcdFx0XCIwJVwiLFxuXHRcdFx0XHRcdFwiLTIwJVwiXG5cdFx0XHRcdF1cblx0XHRcdH1cblx0XHRdXG5cdH1cbl07XG5cblxuLyoqKioqKioqKioqKioqKioqXG4gKiogV0VCUEFDSyBGT09URVJcbiAqKiAuL34vanNvbi1sb2FkZXIhLi9zY2VuZXMvaXNpc3dhbnRzdG9kaXZpZGUvc2NlbmUuanNvblxuICoqIG1vZHVsZSBpZCA9IDYzXG4gKiogbW9kdWxlIGNodW5rcyA9IDBcbiAqKi8iLCJtb2R1bGUuZXhwb3J0cyA9IFtcblx0e1xuXHRcdFwid3JhcHBlclwiOiBcIiNpdGlzbnRlYXN5XCIsXG5cdFx0XCJkdXJhdGlvblwiOiBcIjEwMCVcIixcblx0XHRcImFuaW1hdGlvbnNcIjogW1xuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLmlzbnRlYXN5XzFcIixcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQwLFxuXHRcdFx0XHRcdDFcblx0XHRcdFx0XSxcblx0XHRcdFx0XCJ0cmFuc2xhdGVZXCI6IFtcblx0XHRcdFx0XHRcIi00JVwiLFxuXHRcdFx0XHRcdFwiMCVcIlxuXHRcdFx0XHRdLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVhcIjogW1xuXHRcdFx0XHRcdFwiMyVcIixcblx0XHRcdFx0XHRcIjBcIlxuXHRcdFx0XHRdXG5cdFx0XHR9LFxuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLmRpc3BsYXktNFwiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDAsXG5cdFx0XHRcdFx0MVxuXHRcdFx0XHRdXG5cdFx0XHR9XG5cdFx0XVxuXHR9LFxuXHR7XG5cdFx0XCJ3cmFwcGVyXCI6IFwiI2l0aXNudGVhc3lcIixcblx0XHRcImR1cmF0aW9uXCI6IFwiMTAwJVwiLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIuaXNudGVhc3lfMlwiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDAsXG5cdFx0XHRcdFx0MVxuXHRcdFx0XHRdLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVlcIjogW1xuXHRcdFx0XHRcdFwiMCVcIixcblx0XHRcdFx0XHRcIjAlXCJcblx0XHRcdFx0XSxcblx0XHRcdFx0XCJ0cmFuc2xhdGVYXCI6IFtcblx0XHRcdFx0XHRcIjMlXCIsXG5cdFx0XHRcdFx0XCIwXCJcblx0XHRcdFx0XVxuXHRcdFx0fVxuXHRcdF1cblx0fSxcblx0e1xuXHRcdFwid3JhcHBlclwiOiBcIiNpdGlzbnRlYXN5XCIsXG5cdFx0XCJkdXJhdGlvblwiOiBcIjEwMCVcIixcblx0XHRcImFuaW1hdGlvbnNcIjogW1xuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLmlzbnRlYXN5XzNcIixcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQwLFxuXHRcdFx0XHRcdDFcblx0XHRcdFx0XSxcblx0XHRcdFx0XCJ0cmFuc2xhdGVZXCI6IFtcblx0XHRcdFx0XHRcIjAlXCIsXG5cdFx0XHRcdFx0XCIwJVwiXG5cdFx0XHRcdF0sXG5cdFx0XHRcdFwidHJhbnNsYXRlWFwiOiBbXG5cdFx0XHRcdFx0XCIzJVwiLFxuXHRcdFx0XHRcdFwiMFwiXG5cdFx0XHRcdF1cblx0XHRcdH1cblx0XHRdXG5cdH0sXG5cdHtcblx0XHRcIndyYXBwZXJcIjogXCIjaXRpc250ZWFzeVwiLFxuXHRcdFwiZHVyYXRpb25cIjogXCIxMDAlXCIsXG5cdFx0XCJhbmltYXRpb25zXCI6IFtcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5pc250ZWFzeV80XCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MCxcblx0XHRcdFx0XHQxXG5cdFx0XHRcdF0sXG5cdFx0XHRcdFwidHJhbnNsYXRlWVwiOiBbXG5cdFx0XHRcdFx0XCI0JVwiLFxuXHRcdFx0XHRcdFwiMCVcIlxuXHRcdFx0XHRdLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVhcIjogW1xuXHRcdFx0XHRcdFwiMyVcIixcblx0XHRcdFx0XHRcIjBcIlxuXHRcdFx0XHRdXG5cdFx0XHR9XG5cdFx0XVxuXHR9LFxuXHR7XG5cdFx0XCJ3cmFwcGVyXCI6IFwiI2l0aXNudGVhc3lcIixcblx0XHRcImR1cmF0aW9uXCI6IFwiMTAwJVwiLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIuaXNudGVhc3lfNVwiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDAsXG5cdFx0XHRcdFx0MVxuXHRcdFx0XHRdLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVlcIjogW1xuXHRcdFx0XHRcdFwiNCVcIixcblx0XHRcdFx0XHRcIjAlXCJcblx0XHRcdFx0XSxcblx0XHRcdFx0XCJ0cmFuc2xhdGVYXCI6IFtcblx0XHRcdFx0XHRcIjAlXCIsXG5cdFx0XHRcdFx0XCIwXCJcblx0XHRcdFx0XVxuXHRcdFx0fVxuXHRcdF1cblx0fSxcblx0e1xuXHRcdFwid3JhcHBlclwiOiBcIiNpdGlzbnRlYXN5XCIsXG5cdFx0XCJkdXJhdGlvblwiOiBcIjEwMCVcIixcblx0XHRcImFuaW1hdGlvbnNcIjogW1xuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLmlzbnRlYXN5XzZcIixcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQwLFxuXHRcdFx0XHRcdDFcblx0XHRcdFx0XSxcblx0XHRcdFx0XCJ0cmFuc2xhdGVZXCI6IFtcblx0XHRcdFx0XHRcIjQlXCIsXG5cdFx0XHRcdFx0XCIwJVwiXG5cdFx0XHRcdF0sXG5cdFx0XHRcdFwidHJhbnNsYXRlWFwiOiBbXG5cdFx0XHRcdFx0XCIwJVwiLFxuXHRcdFx0XHRcdFwiMFwiXG5cdFx0XHRcdF1cblx0XHRcdH1cblx0XHRdXG5cdH0sXG5cdHtcblx0XHRcIndyYXBwZXJcIjogXCIjaXRpc250ZWFzeVwiLFxuXHRcdFwiZHVyYXRpb25cIjogXCIxMDAlXCIsXG5cdFx0XCJhbmltYXRpb25zXCI6IFtcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5pc250ZWFzeV83XCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MCxcblx0XHRcdFx0XHQxXG5cdFx0XHRcdF0sXG5cdFx0XHRcdFwidHJhbnNsYXRlWVwiOiBbXG5cdFx0XHRcdFx0XCI0JVwiLFxuXHRcdFx0XHRcdFwiMCVcIlxuXHRcdFx0XHRdLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVhcIjogW1xuXHRcdFx0XHRcdFwiMCVcIixcblx0XHRcdFx0XHRcIjBcIlxuXHRcdFx0XHRdXG5cdFx0XHR9XG5cdFx0XVxuXHR9LFxuXHR7XG5cdFx0XCJ3cmFwcGVyXCI6IFwiI2l0aXNudGVhc3lcIixcblx0XHRcImR1cmF0aW9uXCI6IFwiMTAwJVwiLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIuaXNudGVhc3lfOFwiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDAsXG5cdFx0XHRcdFx0MVxuXHRcdFx0XHRdLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVlcIjogW1xuXHRcdFx0XHRcdFwiNCVcIixcblx0XHRcdFx0XHRcIjAlXCJcblx0XHRcdFx0XSxcblx0XHRcdFx0XCJ0cmFuc2xhdGVYXCI6IFtcblx0XHRcdFx0XHRcIi0zJVwiLFxuXHRcdFx0XHRcdFwiMFwiXG5cdFx0XHRcdF1cblx0XHRcdH1cblx0XHRdXG5cdH0sXG5cdHtcblx0XHRcIndyYXBwZXJcIjogXCIjaXRpc250ZWFzeVwiLFxuXHRcdFwiZHVyYXRpb25cIjogXCIxMDAlXCIsXG5cdFx0XCJhbmltYXRpb25zXCI6IFtcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5pc250ZWFzeV85XCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MCxcblx0XHRcdFx0XHQxXG5cdFx0XHRcdF0sXG5cdFx0XHRcdFwidHJhbnNsYXRlWVwiOiBbXG5cdFx0XHRcdFx0XCItNCVcIixcblx0XHRcdFx0XHRcIjAlXCJcblx0XHRcdFx0XSxcblx0XHRcdFx0XCJ0cmFuc2xhdGVYXCI6IFtcblx0XHRcdFx0XHRcIi0zJVwiLFxuXHRcdFx0XHRcdFwiMFwiXG5cdFx0XHRcdF1cblx0XHRcdH1cblx0XHRdXG5cdH0sXG5cdHtcblx0XHRcIndyYXBwZXJcIjogXCIjaXRpc250ZWFzeVwiLFxuXHRcdFwiZHVyYXRpb25cIjogXCIxMDAlXCIsXG5cdFx0XCJhbmltYXRpb25zXCI6IFtcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5pc250ZWFzeV8xMFwiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDAsXG5cdFx0XHRcdFx0MVxuXHRcdFx0XHRdLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVlcIjogW1xuXHRcdFx0XHRcdFwiLTQlXCIsXG5cdFx0XHRcdFx0XCIwJVwiXG5cdFx0XHRcdF0sXG5cdFx0XHRcdFwidHJhbnNsYXRlWFwiOiBbXG5cdFx0XHRcdFx0XCIwJVwiLFxuXHRcdFx0XHRcdFwiMFwiXG5cdFx0XHRcdF1cblx0XHRcdH1cblx0XHRdXG5cdH0sXG5cdHtcblx0XHRcIndyYXBwZXJcIjogXCIjaXRpc250ZWFzeVwiLFxuXHRcdFwiZHVyYXRpb25cIjogXCIxMDAlXCIsXG5cdFx0XCJhbmltYXRpb25zXCI6IFtcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5pc250ZWFzeV8xMVwiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDAsXG5cdFx0XHRcdFx0MVxuXHRcdFx0XHRdLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVlcIjogW1xuXHRcdFx0XHRcdFwiLTQlXCIsXG5cdFx0XHRcdFx0XCIwJVwiXG5cdFx0XHRcdF0sXG5cdFx0XHRcdFwidHJhbnNsYXRlWFwiOiBbXG5cdFx0XHRcdFx0XCIwJVwiLFxuXHRcdFx0XHRcdFwiMFwiXG5cdFx0XHRcdF1cblx0XHRcdH1cblx0XHRdXG5cdH0sXG5cdHtcblx0XHRcIndyYXBwZXJcIjogXCIjaXRpc250ZWFzeVwiLFxuXHRcdFwiZHVyYXRpb25cIjogXCIxMDAlXCIsXG5cdFx0XCJhbmltYXRpb25zXCI6IFtcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5pc250ZWFzeV8xMlwiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDAsXG5cdFx0XHRcdFx0MVxuXHRcdFx0XHRdLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVlcIjogW1xuXHRcdFx0XHRcdFwiLTQlXCIsXG5cdFx0XHRcdFx0XCIwJVwiXG5cdFx0XHRcdF0sXG5cdFx0XHRcdFwidHJhbnNsYXRlWFwiOiBbXG5cdFx0XHRcdFx0XCIwJVwiLFxuXHRcdFx0XHRcdFwiMFwiXG5cdFx0XHRcdF1cblx0XHRcdH1cblx0XHRdXG5cdH0sXG5cdHtcblx0XHRcIndyYXBwZXJcIjogXCIjaXRpc250ZWFzeVwiLFxuXHRcdFwiZHVyYXRpb25cIjogXCIxMDAlXCIsXG5cdFx0XCJmb2N1c1wiOiB0cnVlLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXVxuXHR9LFxuXHR7XG5cdFx0XCJ3cmFwcGVyXCI6IFwiI2l0aXNudGVhc3lcIixcblx0XHRcImR1cmF0aW9uXCI6IFwiMTAwJVwiLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIuaXNudGVhc3lfMTNcIixcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQwLFxuXHRcdFx0XHRcdDFcblx0XHRcdFx0XSxcblx0XHRcdFx0XCJ0cmFuc2xhdGVZXCI6IFtcblx0XHRcdFx0XHRcIjAlXCIsXG5cdFx0XHRcdFx0XCIwJVwiXG5cdFx0XHRcdF0sXG5cdFx0XHRcdFwidHJhbnNsYXRlWFwiOiBbXG5cdFx0XHRcdFx0XCItODAlXCIsXG5cdFx0XHRcdFx0XCIwXCJcblx0XHRcdFx0XVxuXHRcdFx0fSxcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5pc250ZWFzeV8xXCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MSxcblx0XHRcdFx0XHQwXG5cdFx0XHRcdF0sXG5cdFx0XHRcdFwidHJhbnNsYXRlWVwiOiBbXG5cdFx0XHRcdFx0XCIwJVwiLFxuXHRcdFx0XHRcdFwiLTQwJVwiXG5cdFx0XHRcdF0sXG5cdFx0XHRcdFwidHJhbnNsYXRlWFwiOiBbXG5cdFx0XHRcdFx0XCIwJVwiLFxuXHRcdFx0XHRcdFwiMzAlXCJcblx0XHRcdFx0XVxuXHRcdFx0fSxcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5pc250ZWFzeV8yXCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MSxcblx0XHRcdFx0XHQwXG5cdFx0XHRcdF0sXG5cdFx0XHRcdFwidHJhbnNsYXRlWVwiOiBbXG5cdFx0XHRcdFx0XCIwJVwiLFxuXHRcdFx0XHRcdFwiMCVcIlxuXHRcdFx0XHRdLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVhcIjogW1xuXHRcdFx0XHRcdFwiMCVcIixcblx0XHRcdFx0XHRcIjMwJVwiXG5cdFx0XHRcdF1cblx0XHRcdH0sXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIuaXNudGVhc3lfM1wiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDEsXG5cdFx0XHRcdFx0MFxuXHRcdFx0XHRdLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVlcIjogW1xuXHRcdFx0XHRcdFwiMCVcIixcblx0XHRcdFx0XHRcIjAlXCJcblx0XHRcdFx0XSxcblx0XHRcdFx0XCJ0cmFuc2xhdGVYXCI6IFtcblx0XHRcdFx0XHRcIjAlXCIsXG5cdFx0XHRcdFx0XCIzMCVcIlxuXHRcdFx0XHRdXG5cdFx0XHR9LFxuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLmlzbnRlYXN5XzRcIixcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQxLFxuXHRcdFx0XHRcdDBcblx0XHRcdFx0XSxcblx0XHRcdFx0XCJ0cmFuc2xhdGVZXCI6IFtcblx0XHRcdFx0XHRcIjAlXCIsXG5cdFx0XHRcdFx0XCI0MCVcIlxuXHRcdFx0XHRdLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVhcIjogW1xuXHRcdFx0XHRcdFwiMCVcIixcblx0XHRcdFx0XHRcIjMwJVwiXG5cdFx0XHRcdF1cblx0XHRcdH0sXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIuaXNudGVhc3lfNVwiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDEsXG5cdFx0XHRcdFx0MFxuXHRcdFx0XHRdLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVlcIjogW1xuXHRcdFx0XHRcdFwiMCVcIixcblx0XHRcdFx0XHRcIjQwJVwiXG5cdFx0XHRcdF0sXG5cdFx0XHRcdFwidHJhbnNsYXRlWFwiOiBbXG5cdFx0XHRcdFx0XCIwJVwiLFxuXHRcdFx0XHRcdFwiMCVcIlxuXHRcdFx0XHRdXG5cdFx0XHR9LFxuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLmlzbnRlYXN5XzZcIixcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQxLFxuXHRcdFx0XHRcdDBcblx0XHRcdFx0XSxcblx0XHRcdFx0XCJ0cmFuc2xhdGVZXCI6IFtcblx0XHRcdFx0XHRcIjAlXCIsXG5cdFx0XHRcdFx0XCI0MCVcIlxuXHRcdFx0XHRdLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVhcIjogW1xuXHRcdFx0XHRcdFwiMCVcIixcblx0XHRcdFx0XHRcIjAlXCJcblx0XHRcdFx0XVxuXHRcdFx0fSxcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5pc250ZWFzeV83XCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MSxcblx0XHRcdFx0XHQwXG5cdFx0XHRcdF0sXG5cdFx0XHRcdFwidHJhbnNsYXRlWVwiOiBbXG5cdFx0XHRcdFx0XCIwJVwiLFxuXHRcdFx0XHRcdFwiNDAlXCJcblx0XHRcdFx0XSxcblx0XHRcdFx0XCJ0cmFuc2xhdGVYXCI6IFtcblx0XHRcdFx0XHRcIjAlXCIsXG5cdFx0XHRcdFx0XCIwJVwiXG5cdFx0XHRcdF1cblx0XHRcdH0sXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIuaXNudGVhc3lfOFwiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDEsXG5cdFx0XHRcdFx0MFxuXHRcdFx0XHRdLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVlcIjogW1xuXHRcdFx0XHRcdFwiMCVcIixcblx0XHRcdFx0XHRcIjQwJVwiXG5cdFx0XHRcdF0sXG5cdFx0XHRcdFwidHJhbnNsYXRlWFwiOiBbXG5cdFx0XHRcdFx0XCIwJVwiLFxuXHRcdFx0XHRcdFwiLTMwJVwiXG5cdFx0XHRcdF1cblx0XHRcdH0sXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIuaXNudGVhc3lfOVwiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDEsXG5cdFx0XHRcdFx0MFxuXHRcdFx0XHRdLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVlcIjogW1xuXHRcdFx0XHRcdFwiMCVcIixcblx0XHRcdFx0XHRcIi00MCVcIlxuXHRcdFx0XHRdLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVhcIjogW1xuXHRcdFx0XHRcdFwiMCVcIixcblx0XHRcdFx0XHRcIi0zMCVcIlxuXHRcdFx0XHRdXG5cdFx0XHR9LFxuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLmlzbnRlYXN5XzEwXCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MSxcblx0XHRcdFx0XHQwXG5cdFx0XHRcdF0sXG5cdFx0XHRcdFwidHJhbnNsYXRlWVwiOiBbXG5cdFx0XHRcdFx0XCIwJVwiLFxuXHRcdFx0XHRcdFwiLTQwJVwiXG5cdFx0XHRcdF0sXG5cdFx0XHRcdFwidHJhbnNsYXRlWFwiOiBbXG5cdFx0XHRcdFx0XCIwJVwiLFxuXHRcdFx0XHRcdFwiMCVcIlxuXHRcdFx0XHRdXG5cdFx0XHR9LFxuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLmlzbnRlYXN5XzExXCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MSxcblx0XHRcdFx0XHQwXG5cdFx0XHRcdF0sXG5cdFx0XHRcdFwidHJhbnNsYXRlWVwiOiBbXG5cdFx0XHRcdFx0XCIwJVwiLFxuXHRcdFx0XHRcdFwiLTQwJVwiXG5cdFx0XHRcdF0sXG5cdFx0XHRcdFwidHJhbnNsYXRlWFwiOiBbXG5cdFx0XHRcdFx0XCIwJVwiLFxuXHRcdFx0XHRcdFwiMCVcIlxuXHRcdFx0XHRdXG5cdFx0XHR9LFxuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLmlzbnRlYXN5XzEyXCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MSxcblx0XHRcdFx0XHQwXG5cdFx0XHRcdF0sXG5cdFx0XHRcdFwidHJhbnNsYXRlWVwiOiBbXG5cdFx0XHRcdFx0XCIwJVwiLFxuXHRcdFx0XHRcdFwiLTQwJVwiXG5cdFx0XHRcdF0sXG5cdFx0XHRcdFwidHJhbnNsYXRlWFwiOiBbXG5cdFx0XHRcdFx0XCIwJVwiLFxuXHRcdFx0XHRcdFwiMCVcIlxuXHRcdFx0XHRdXG5cdFx0XHR9XG5cdFx0XVxuXHR9LFxuXHR7XG5cdFx0XCJ3cmFwcGVyXCI6IFwiI2l0aXNudGVhc3lcIixcblx0XHRcImR1cmF0aW9uXCI6IFwiODAlXCIsXG5cdFx0XCJhbmltYXRpb25zXCI6IFtcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5oaWRlc291cmNlXCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MSxcblx0XHRcdFx0XHQwXG5cdFx0XHRcdF1cblx0XHRcdH0sXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIuZGlzcGxheS00XCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MSxcblx0XHRcdFx0XHQwXG5cdFx0XHRcdF1cblx0XHRcdH0sXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIudHJ1bXBcIixcblx0XHRcdFx0XCJ0cmFuc2xhdGVYXCI6IFtcblx0XHRcdFx0XHQwLFxuXHRcdFx0XHRcdFwiLTclXCJcblx0XHRcdFx0XSxcblx0XHRcdFx0XCJzY2FsZVwiOiBbXG5cdFx0XHRcdFx0MSxcblx0XHRcdFx0XHQyXG5cdFx0XHRcdF1cblx0XHRcdH1cblx0XHRdXG5cdH0sXG5cdHtcblx0XHRcIndyYXBwZXJcIjogXCIjaXRpc250ZWFzeVwiLFxuXHRcdFwiZHVyYXRpb25cIjogXCIxMDAlXCIsXG5cdFx0XCJmb2N1c1wiOiB0cnVlLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXG5cdFx0XHR7fVxuXHRcdF1cblx0fSxcblx0e1xuXHRcdFwid3JhcHBlclwiOiBcIiNpdGlzbnRlYXN5XCIsXG5cdFx0XCJkdXJhdGlvblwiOiBcIjMwMCVcIixcblx0XHRcImFuaW1hdGlvbnNcIjogW1xuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLnRydW1wXCIsXG5cdFx0XHRcdFwidHJhbnNsYXRlWFwiOiBbXG5cdFx0XHRcdFx0XCItMjAlXCJcblx0XHRcdFx0XSxcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQxLFxuXHRcdFx0XHRcdDBcblx0XHRcdFx0XVxuXHRcdFx0fVxuXHRcdF1cblx0fVxuXTtcblxuXG4vKioqKioqKioqKioqKioqKipcbiAqKiBXRUJQQUNLIEZPT1RFUlxuICoqIC4vfi9qc29uLWxvYWRlciEuL3NjZW5lcy9pdGlzbnRlYXN5L3NjZW5lLmpzb25cbiAqKiBtb2R1bGUgaWQgPSA2NFxuICoqIG1vZHVsZSBjaHVua3MgPSAwXG4gKiovIiwibW9kdWxlLmV4cG9ydHMgPSBbXG5cdHtcblx0XHRcIndyYXBwZXJcIjogXCIjaXRzZ290dG9lbmRcIixcblx0XHRcImR1cmF0aW9uXCI6IFwiMTAwJVwiLFxuXHRcdFwiZm9jdXNcIjogdHJ1ZSxcblx0XHRcImFuaW1hdGlvbnNcIjogW1xuXHRcdFx0e31cblx0XHRdXG5cdH1cbl07XG5cblxuLyoqKioqKioqKioqKioqKioqXG4gKiogV0VCUEFDSyBGT09URVJcbiAqKiAuL34vanNvbi1sb2FkZXIhLi9zY2VuZXMvaXRzZ290dG9lbmQvc2NlbmUuanNvblxuICoqIG1vZHVsZSBpZCA9IDY1XG4gKiogbW9kdWxlIGNodW5rcyA9IDBcbiAqKi8iLCJtb2R1bGUuZXhwb3J0cyA9IFtcblx0e1xuXHRcdFwid3JhcHBlclwiOiBcIiNpd2FudG15aXNsYW1iYWNrMVwiLFxuXHRcdFwiZHVyYXRpb25cIjogXCIxMDAlXCIsXG5cdFx0XCJhbmltYXRpb25zXCI6IFtcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5kaXNwbGF5LTRcIixcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQyLFxuXHRcdFx0XHRcdDJcblx0XHRcdFx0XVxuXHRcdFx0fVxuXHRcdF1cblx0fSxcblx0e1xuXHRcdFwid3JhcHBlclwiOiBcIiNpd2FudG15aXNsYW1iYWNrMVwiLFxuXHRcdFwiZHVyYXRpb25cIjogXCIxMDAlXCIsXG5cdFx0XCJmb2N1c1wiOiB0cnVlLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIuZGlzcGxheS00XCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MlxuXHRcdFx0XHRdXG5cdFx0XHR9XG5cdFx0XVxuXHR9LFxuXHR7XG5cdFx0XCJ3cmFwcGVyXCI6IFwiI2l3YW50bXlpc2xhbWJhY2sxXCIsXG5cdFx0XCJkdXJhdGlvblwiOiBcIjEwMCVcIixcblx0XHRcImFuaW1hdGlvbnNcIjogW1xuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLmRpc3BsYXktNFwiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDIsXG5cdFx0XHRcdFx0MFxuXHRcdFx0XHRdXG5cdFx0XHR9XG5cdFx0XVxuXHR9XG5dO1xuXG5cbi8qKioqKioqKioqKioqKioqKlxuICoqIFdFQlBBQ0sgRk9PVEVSXG4gKiogLi9+L2pzb24tbG9hZGVyIS4vc2NlbmVzL2l3YW50bXlpc2xhbWJhY2sxL3NjZW5lLmpzb25cbiAqKiBtb2R1bGUgaWQgPSA2NlxuICoqIG1vZHVsZSBjaHVua3MgPSAwXG4gKiovIiwibW9kdWxlLmV4cG9ydHMgPSBbXG5cdHtcblx0XHRcIndyYXBwZXJcIjogXCIjbGlrZXBlYWNlXCIsXG5cdFx0XCJkdXJhdGlvblwiOiBcIjEwMCVcIixcblx0XHRcImFuaW1hdGlvbnNcIjogW1xuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLmRpc3BsYXktNFwiLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVlcIjogXCIzMCVcIlxuXHRcdFx0fVxuXHRcdF1cblx0fSxcblx0e1xuXHRcdFwid3JhcHBlclwiOiBcIiNsaWtlcGVhY2VcIixcblx0XHRcImR1cmF0aW9uXCI6IFwiMTAwJVwiLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIuZmlyc3RcIixcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQwLFxuXHRcdFx0XHRcdDFcblx0XHRcdFx0XVxuXHRcdFx0fVxuXHRcdF1cblx0fSxcblx0e1xuXHRcdFwid3JhcHBlclwiOiBcIiNsaWtlcGVhY2VcIixcblx0XHRcImR1cmF0aW9uXCI6IFwiMTAwJVwiLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIuc2Vjb25kXCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MCxcblx0XHRcdFx0XHQxXG5cdFx0XHRcdF1cblx0XHRcdH1cblx0XHRdXG5cdH0sXG5cdHtcblx0XHRcIndyYXBwZXJcIjogXCIjbGlrZXBlYWNlXCIsXG5cdFx0XCJkdXJhdGlvblwiOiBcIjEwMCVcIixcblx0XHRcImFuaW1hdGlvbnNcIjogW1xuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLnRoaXJkXCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MCxcblx0XHRcdFx0XHQxXG5cdFx0XHRcdF1cblx0XHRcdH1cblx0XHRdXG5cdH0sXG5cdHtcblx0XHRcIndyYXBwZXJcIjogXCIjbGlrZXBlYWNlXCIsXG5cdFx0XCJkdXJhdGlvblwiOiBcIjUwJVwiLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXVxuXHR9LFxuXHR7XG5cdFx0XCJ3cmFwcGVyXCI6IFwiI2xpa2VwZWFjZVwiLFxuXHRcdFwiZHVyYXRpb25cIjogXCIxMDAlXCIsXG5cdFx0XCJhbmltYXRpb25zXCI6IFtcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5maXJzdFwiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogMVxuXHRcdFx0fSxcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5zZWNvbmRcIixcblx0XHRcdFx0XCJvcGFjaXR5XCI6IDFcblx0XHRcdH0sXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIudGhpcmRcIixcblx0XHRcdFx0XCJvcGFjaXR5XCI6IDFcblx0XHRcdH0sXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIuZm91cnRoXCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0LTQsXG5cdFx0XHRcdFx0MVxuXHRcdFx0XHRdXG5cdFx0XHR9LFxuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLmRpc3BsYXktNFwiLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVlcIjogW1xuXHRcdFx0XHRcdFwiMzAlXCIsXG5cdFx0XHRcdFx0XCIwJVwiXG5cdFx0XHRcdF1cblx0XHRcdH1cblx0XHRdXG5cdH0sXG5cdHtcblx0XHRcIndyYXBwZXJcIjogXCIjbGlrZXBlYWNlXCIsXG5cdFx0XCJkdXJhdGlvblwiOiBcIjIwMCVcIixcblx0XHRcImFuaW1hdGlvbnNcIjogW1xuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLmZpcnN0XCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiAxXG5cdFx0XHR9LFxuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLnNlY29uZFwiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogMVxuXHRcdFx0fSxcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi50aGlyZFwiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogMVxuXHRcdFx0fSxcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5mb3VydGhcIixcblx0XHRcdFx0XCJvcGFjaXR5XCI6IDFcblx0XHRcdH0sXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIuZGlzcGxheS00XCIsXG5cdFx0XHRcdFwidHJhbnNsYXRlWVwiOiBcIjAlXCJcblx0XHRcdH1cblx0XHRdXG5cdH0sXG5cdHtcblx0XHRcIndyYXBwZXJcIjogXCIjbGlrZXBlYWNlXCIsXG5cdFx0XCJkdXJhdGlvblwiOiBcIjEwMCVcIixcblx0XHRcImZvY3VzXCI6IHRydWUsXG5cdFx0XCJhbmltYXRpb25zXCI6IFtcblx0XHRcdHt9XG5cdFx0XVxuXHR9XG5dO1xuXG5cbi8qKioqKioqKioqKioqKioqKlxuICoqIFdFQlBBQ0sgRk9PVEVSXG4gKiogLi9+L2pzb24tbG9hZGVyIS4vc2NlbmVzL2xpa2VwZWFjZS9zY2VuZS5qc29uXG4gKiogbW9kdWxlIGlkID0gNjdcbiAqKiBtb2R1bGUgY2h1bmtzID0gMFxuICoqLyIsIm1vZHVsZS5leHBvcnRzID0gW1xuXHR7XG5cdFx0XCJ3cmFwcGVyXCI6IFwiI21peGVkZmVlbGluZ3NcIixcblx0XHRcImR1cmF0aW9uXCI6IFwiMTAwJVwiLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIuZGlzcGxheS00XCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MCxcblx0XHRcdFx0XHQxLjI1XG5cdFx0XHRcdF1cblx0XHRcdH1cblx0XHRdXG5cdH0sXG5cdHtcblx0XHRcIndyYXBwZXJcIjogXCIjbWl4ZWRmZWVsaW5nc1wiLFxuXHRcdFwiZHVyYXRpb25cIjogXCIxMDAlXCIsXG5cdFx0XCJmb2N1c1wiOiB0cnVlLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXG5cdFx0XHR7fVxuXHRcdF1cblx0fSxcblx0e1xuXHRcdFwid3JhcHBlclwiOiBcIiNtaXhlZGZlZWxpbmdzXCIsXG5cdFx0XCJkdXJhdGlvblwiOiBcIjEwMCVcIixcblx0XHRcImFuaW1hdGlvbnNcIjogW1xuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLmRpc3BsYXktNFwiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDIsXG5cdFx0XHRcdFx0MFxuXHRcdFx0XHRdXG5cdFx0XHR9XG5cdFx0XVxuXHR9XG5dO1xuXG5cbi8qKioqKioqKioqKioqKioqKlxuICoqIFdFQlBBQ0sgRk9PVEVSXG4gKiogLi9+L2pzb24tbG9hZGVyIS4vc2NlbmVzL21peGVkZmVlbGluZ3Mvc2NlbmUuanNvblxuICoqIG1vZHVsZSBpZCA9IDY4XG4gKiogbW9kdWxlIGNodW5rcyA9IDBcbiAqKi8iLCJtb2R1bGUuZXhwb3J0cyA9IFtcblx0e1xuXHRcdFwid3JhcHBlclwiOiBcIiNtdXNsaW1zYmVsaWV2ZWluZGl2aWR1YWxsaWZlXCIsXG5cdFx0XCJkdXJhdGlvblwiOiBcIjEwMCVcIixcblx0XHRcImFuaW1hdGlvbnNcIjogW1xuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLmRpc3BsYXktNFwiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDAsXG5cdFx0XHRcdFx0MVxuXHRcdFx0XHRdXG5cdFx0XHR9XG5cdFx0XVxuXHR9LFxuXHR7XG5cdFx0XCJ3cmFwcGVyXCI6IFwiI211c2xpbXNiZWxpZXZlaW5kaXZpZHVhbGxpZmVcIixcblx0XHRcImR1cmF0aW9uXCI6IFwiMTAwJVwiLFxuXHRcdFwiZm9jdXNcIjogdHJ1ZSxcblx0XHRcImFuaW1hdGlvbnNcIjogW1xuXHRcdFx0e31cblx0XHRdXG5cdH0sXG5cdHtcblx0XHRcIndyYXBwZXJcIjogXCIjbXVzbGltc2JlbGlldmVpbmRpdmlkdWFsbGlmZVwiLFxuXHRcdFwiZHVyYXRpb25cIjogXCIxMDAlXCIsXG5cdFx0XCJhbmltYXRpb25zXCI6IFtcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5kaXNwbGF5LTRcIixcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQxLFxuXHRcdFx0XHRcdDBcblx0XHRcdFx0XVxuXHRcdFx0fVxuXHRcdF1cblx0fVxuXTtcblxuXG4vKioqKioqKioqKioqKioqKipcbiAqKiBXRUJQQUNLIEZPT1RFUlxuICoqIC4vfi9qc29uLWxvYWRlciEuL3NjZW5lcy9tdXNsaW1zYmVsaWV2ZWluZGl2aWR1YWxsaWZlL3NjZW5lLmpzb25cbiAqKiBtb2R1bGUgaWQgPSA2OVxuICoqIG1vZHVsZSBjaHVua3MgPSAwXG4gKiovIiwibW9kdWxlLmV4cG9ydHMgPSBbXG5cdHtcblx0XHRcIndyYXBwZXJcIjogXCIjb3V0dG9nZXR5b3VcIixcblx0XHRcImR1cmF0aW9uXCI6IFwiMTAwJVwiLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIub3V0LXRvLWdldC15b3VcIixcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQwLFxuXHRcdFx0XHRcdDFcblx0XHRcdFx0XVxuXHRcdFx0fVxuXHRcdF1cblx0fSxcblx0e1xuXHRcdFwid3JhcHBlclwiOiBcIiNvdXR0b2dldHlvdVwiLFxuXHRcdFwiZHVyYXRpb25cIjogXCIxMDAlXCIsXG5cdFx0XCJmb2N1c1wiOiB0cnVlLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXG5cdFx0XHR7fVxuXHRcdF1cblx0fSxcblx0e1xuXHRcdFwid3JhcHBlclwiOiBcIiNvdXR0b2dldHlvdVwiLFxuXHRcdFwiZHVyYXRpb25cIjogXCIxMDAlXCIsXG5cdFx0XCJhbmltYXRpb25zXCI6IFtcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5vdXQtdG8tZ2V0LXlvdVwiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDIsXG5cdFx0XHRcdFx0MFxuXHRcdFx0XHRdXG5cdFx0XHR9XG5cdFx0XVxuXHR9XG5dO1xuXG5cbi8qKioqKioqKioqKioqKioqKlxuICoqIFdFQlBBQ0sgRk9PVEVSXG4gKiogLi9+L2pzb24tbG9hZGVyIS4vc2NlbmVzL291dHRvZ2V0eW91L3NjZW5lLmpzb25cbiAqKiBtb2R1bGUgaWQgPSA3MFxuICoqIG1vZHVsZSBjaHVua3MgPSAwXG4gKiovIiwibW9kdWxlLmV4cG9ydHMgPSBbXG5cdHtcblx0XHRcIndyYXBwZXJcIjogXCIjcmVhY3Rpb25zdG90ZXJyb3JcIixcblx0XHRcImR1cmF0aW9uXCI6IFwiMTUwJVwiLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXG5cdFx0XHR7fVxuXHRcdF1cblx0fSxcblx0e1xuXHRcdFwid3JhcHBlclwiOiBcIiNyZWFjdGlvbnN0b3RlcnJvclwiLFxuXHRcdFwiZHVyYXRpb25cIjogXCIxMDAlXCIsXG5cdFx0XCJhbmltYXRpb25zXCI6IFtcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5hbmltLTFcIixcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQwLFxuXHRcdFx0XHRcdDFcblx0XHRcdFx0XSxcblx0XHRcdFx0XCJ0cmFuc2xhdGVZXCI6IFtcblx0XHRcdFx0XHRcIi0zOCVcIixcblx0XHRcdFx0XHRcIi0zOCVcIlxuXHRcdFx0XHRdXG5cdFx0XHR9XG5cdFx0XVxuXHR9LFxuXHR7XG5cdFx0XCJ3cmFwcGVyXCI6IFwiI3JlYWN0aW9uc3RvdGVycm9yXCIsXG5cdFx0XCJkdXJhdGlvblwiOiBcIjEwMCVcIixcblx0XHRcImZvY3VzXCI6IHRydWUsXG5cdFx0XCJhbmltYXRpb25zXCI6IFtcblx0XHRcdHt9XG5cdFx0XVxuXHR9LFxuXHR7XG5cdFx0XCJ3cmFwcGVyXCI6IFwiI3JlYWN0aW9uc3RvdGVycm9yXCIsXG5cdFx0XCJkdXJhdGlvblwiOiBcIjEwMCVcIixcblx0XHRcImFuaW1hdGlvbnNcIjogW1xuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLmFuaW0tMVwiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDEsXG5cdFx0XHRcdFx0MFxuXHRcdFx0XHRdLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVlcIjogW1xuXHRcdFx0XHRcdFwiLTM4JVwiLFxuXHRcdFx0XHRcdFwiLTM4JVwiXG5cdFx0XHRcdF1cblx0XHRcdH1cblx0XHRdXG5cdH1cbl07XG5cblxuLyoqKioqKioqKioqKioqKioqXG4gKiogV0VCUEFDSyBGT09URVJcbiAqKiAuL34vanNvbi1sb2FkZXIhLi9zY2VuZXMvcmVhY3Rpb25zdG90ZXJyb3Ivc2NlbmUuanNvblxuICoqIG1vZHVsZSBpZCA9IDcxXG4gKiogbW9kdWxlIGNodW5rcyA9IDBcbiAqKi8iLCJtb2R1bGUuZXhwb3J0cyA9IFtcblx0e1xuXHRcdFwid3JhcHBlclwiOiBcIiNzb21ldGhpbmd0b3Byb3ZlXCIsXG5cdFx0XCJkdXJhdGlvblwiOiBcIjEwMCVcIixcblx0XHRcImFuaW1hdGlvbnNcIjogW1xuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLmRpc3BsYXktNFwiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDAsXG5cdFx0XHRcdFx0MVxuXHRcdFx0XHRdXG5cdFx0XHR9XG5cdFx0XVxuXHR9LFxuXHR7XG5cdFx0XCJ3cmFwcGVyXCI6IFwiI3NvbWV0aGluZ3RvcHJvdmVcIixcblx0XHRcImR1cmF0aW9uXCI6IFwiMTAwJVwiLFxuXHRcdFwiZm9jdXNcIjogdHJ1ZSxcblx0XHRcImFuaW1hdGlvbnNcIjogW1xuXHRcdFx0e31cblx0XHRdXG5cdH0sXG5cdHtcblx0XHRcIndyYXBwZXJcIjogXCIjc29tZXRoaW5ndG9wcm92ZVwiLFxuXHRcdFwiZHVyYXRpb25cIjogXCIxMDAlXCIsXG5cdFx0XCJhbmltYXRpb25zXCI6IFtcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5kaXNwbGF5LTRcIixcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQxLFxuXHRcdFx0XHRcdDBcblx0XHRcdFx0XVxuXHRcdFx0fVxuXHRcdF1cblx0fVxuXTtcblxuXG4vKioqKioqKioqKioqKioqKipcbiAqKiBXRUJQQUNLIEZPT1RFUlxuICoqIC4vfi9qc29uLWxvYWRlciEuL3NjZW5lcy9zb21ldGhpbmd0b3Byb3ZlL3NjZW5lLmpzb25cbiAqKiBtb2R1bGUgaWQgPSA3MlxuICoqIG1vZHVsZSBjaHVua3MgPSAwXG4gKiovIiwibW9kdWxlLmV4cG9ydHMgPSBbXG5cdHtcblx0XHRcIndyYXBwZXJcIjogXCIjd2VhcmVjb21pbmdcIixcblx0XHRcImR1cmF0aW9uXCI6IFwiMTAwJVwiLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIuZGlzcGxheS00XCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MCxcblx0XHRcdFx0XHQxXG5cdFx0XHRcdF1cblx0XHRcdH1cblx0XHRdXG5cdH0sXG5cdHtcblx0XHRcIndyYXBwZXJcIjogXCIjd2VhcmVjb21pbmdcIixcblx0XHRcImR1cmF0aW9uXCI6IFwiMTAwJVwiLFxuXHRcdFwiZm9jdXNcIjogdHJ1ZSxcblx0XHRcImFuaW1hdGlvbnNcIjogW1xuXHRcdFx0e31cblx0XHRdXG5cdH0sXG5cdHtcblx0XHRcIndyYXBwZXJcIjogXCIjd2VhcmVjb21pbmdcIixcblx0XHRcImR1cmF0aW9uXCI6IFwiMTAwJVwiLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIuZGlzcGxheS00XCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0Mixcblx0XHRcdFx0XHQwXG5cdFx0XHRcdF1cblx0XHRcdH1cblx0XHRdXG5cdH1cbl07XG5cblxuLyoqKioqKioqKioqKioqKioqXG4gKiogV0VCUEFDSyBGT09URVJcbiAqKiAuL34vanNvbi1sb2FkZXIhLi9zY2VuZXMvd2VhcmVjb21pbmcvc2NlbmUuanNvblxuICoqIG1vZHVsZSBpZCA9IDczXG4gKiogbW9kdWxlIGNodW5rcyA9IDBcbiAqKi8iLCJtb2R1bGUuZXhwb3J0cyA9IFtcblx0e1xuXHRcdFwid3JhcHBlclwiOiBcIiN3ZWFyZW5vdGFmcmFpZFwiLFxuXHRcdFwiZHVyYXRpb25cIjogXCIxMDAlXCIsXG5cdFx0XCJhbmltYXRpb25zXCI6IFtcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5kaXNwbGF5LTRcIixcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQwLFxuXHRcdFx0XHRcdDFcblx0XHRcdFx0XVxuXHRcdFx0fVxuXHRcdF1cblx0fSxcblx0e1xuXHRcdFwid3JhcHBlclwiOiBcIiN3ZWFyZW5vdGFmcmFpZFwiLFxuXHRcdFwiZHVyYXRpb25cIjogXCIxMDAlXCIsXG5cdFx0XCJmb2N1c1wiOiB0cnVlLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXG5cdFx0XHR7fVxuXHRcdF1cblx0fSxcblx0e1xuXHRcdFwid3JhcHBlclwiOiBcIiN3ZWFyZW5vdGFmcmFpZFwiLFxuXHRcdFwiZHVyYXRpb25cIjogXCIxMDAlXCIsXG5cdFx0XCJhbmltYXRpb25zXCI6IFtcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5kaXNwbGF5LTRcIixcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQxLFxuXHRcdFx0XHRcdDBcblx0XHRcdFx0XVxuXHRcdFx0fVxuXHRcdF1cblx0fVxuXTtcblxuXG4vKioqKioqKioqKioqKioqKipcbiAqKiBXRUJQQUNLIEZPT1RFUlxuICoqIC4vfi9qc29uLWxvYWRlciEuL3NjZW5lcy93ZWFyZW5vdGFmcmFpZC9zY2VuZS5qc29uXG4gKiogbW9kdWxlIGlkID0gNzRcbiAqKiBtb2R1bGUgY2h1bmtzID0gMFxuICoqLyIsIm1vZHVsZS5leHBvcnRzID0gW1xuXHR7XG5cdFx0XCJ3cmFwcGVyXCI6IFwiI3dld2lsbHByb3RlY3RlYWNob3RoZXJcIixcblx0XHRcImR1cmF0aW9uXCI6IFwiMTAwJVwiLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIucHJlbWlzZVwiLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVlcIjogW1xuXHRcdFx0XHRcdFwiMjUlXCIsXG5cdFx0XHRcdFx0XCIwXCJcblx0XHRcdFx0XSxcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQwLFxuXHRcdFx0XHRcdDEuNzVcblx0XHRcdFx0XVxuXHRcdFx0fSxcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5jb25jbHVzaW9uXCIsXG5cdFx0XHRcdFwidHJhbnNsYXRlWVwiOiBcIjI1JVwiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDAsXG5cdFx0XHRcdFx0MFxuXHRcdFx0XHRdXG5cdFx0XHR9XG5cdFx0XVxuXHR9LFxuXHR7XG5cdFx0XCJ3cmFwcGVyXCI6IFwiI3dld2lsbHByb3RlY3RlYWNob3RoZXJcIixcblx0XHRcImR1cmF0aW9uXCI6IFwiNTAlXCIsXG5cdFx0XCJhbmltYXRpb25zXCI6IFtdXG5cdH0sXG5cdHtcblx0XHRcIndyYXBwZXJcIjogXCIjd2V3aWxscHJvdGVjdGVhY2hvdGhlclwiLFxuXHRcdFwiZHVyYXRpb25cIjogXCIxMDAlXCIsXG5cdFx0XCJhbmltYXRpb25zXCI6IFtcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5jb25jbHVzaW9uXCIsXG5cdFx0XHRcdFwidHJhbnNsYXRlWVwiOiBbXG5cdFx0XHRcdFx0XCIyNSVcIixcblx0XHRcdFx0XHRcIjBcIlxuXHRcdFx0XHRdLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDAsXG5cdFx0XHRcdFx0MVxuXHRcdFx0XHRdXG5cdFx0XHR9XG5cdFx0XVxuXHR9LFxuXHR7XG5cdFx0XCJ3cmFwcGVyXCI6IFwiI3dld2lsbHByb3RlY3RlYWNob3RoZXJcIixcblx0XHRcImR1cmF0aW9uXCI6IFwiMTAwJVwiLFxuXHRcdFwiZm9jdXNcIjogdHJ1ZSxcblx0XHRcImFuaW1hdGlvbnNcIjogW1xuXHRcdFx0e31cblx0XHRdXG5cdH0sXG5cdHtcblx0XHRcIndyYXBwZXJcIjogXCIjd2V3aWxscHJvdGVjdGVhY2hvdGhlclwiLFxuXHRcdFwiZHVyYXRpb25cIjogXCIxMDAlXCIsXG5cdFx0XCJhbmltYXRpb25zXCI6IFtcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5wcmVtaXNlXCIsXG5cdFx0XHRcdFwidHJhbnNsYXRlWVwiOiBbXG5cdFx0XHRcdFx0XCIwXCIsXG5cdFx0XHRcdFx0XCItMjUlXCJcblx0XHRcdFx0XSxcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQxLFxuXHRcdFx0XHRcdDBcblx0XHRcdFx0XVxuXHRcdFx0fSxcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5jb25jbHVzaW9uXCIsXG5cdFx0XHRcdFwidHJhbnNsYXRlWVwiOiBbXG5cdFx0XHRcdFx0XCIwXCIsXG5cdFx0XHRcdFx0XCItMjUlXCJcblx0XHRcdFx0XSxcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQxLFxuXHRcdFx0XHRcdDBcblx0XHRcdFx0XVxuXHRcdFx0fVxuXHRcdF1cblx0fVxuXTtcblxuXG4vKioqKioqKioqKioqKioqKipcbiAqKiBXRUJQQUNLIEZPT1RFUlxuICoqIC4vfi9qc29uLWxvYWRlciEuL3NjZW5lcy93ZXdpbGxwcm90ZWN0ZWFjaG90aGVyL3NjZW5lLmpzb25cbiAqKiBtb2R1bGUgaWQgPSA3NVxuICoqIG1vZHVsZSBjaHVua3MgPSAwXG4gKiovIiwibW9kdWxlLmV4cG9ydHMgPSBbXG5cdHtcblx0XHRcIndyYXBwZXJcIjogXCIjd2hhdGlzbGFtaWNoaXN0b3J5cHJlZmVyc1wiLFxuXHRcdFwiZHVyYXRpb25cIjogXCIxMDAlXCIsXG5cdFx0XCJhbmltYXRpb25zXCI6IFtcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5kaXNwbGF5LTRcIixcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQwLFxuXHRcdFx0XHRcdDFcblx0XHRcdFx0XVxuXHRcdFx0fVxuXHRcdF1cblx0fSxcblx0e1xuXHRcdFwid3JhcHBlclwiOiBcIiN3aGF0aXNsYW1pY2hpc3RvcnlwcmVmZXJzXCIsXG5cdFx0XCJkdXJhdGlvblwiOiBcIjEwMCVcIixcblx0XHRcImFuaW1hdGlvbnNcIjogW1xuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLmRpc3BsYXktNFwiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDEsXG5cdFx0XHRcdFx0MVxuXHRcdFx0XHRdXG5cdFx0XHR9LFxuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLmlzbGFtaWMtaW52ZW50aW9uc1wiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDAsXG5cdFx0XHRcdFx0MVxuXHRcdFx0XHRdXG5cdFx0XHR9XG5cdFx0XVxuXHR9LFxuXHR7XG5cdFx0XCJ3cmFwcGVyXCI6IFwiI3doYXRpc2xhbWljaGlzdG9yeXByZWZlcnNcIixcblx0XHRcImR1cmF0aW9uXCI6IFwiMTAwJVwiLFxuXHRcdFwiZm9jdXNcIjogdHJ1ZSxcblx0XHRcImFuaW1hdGlvbnNcIjogW1xuXHRcdFx0e31cblx0XHRdXG5cdH0sXG5cdHtcblx0XHRcIndyYXBwZXJcIjogXCIjd2hhdGlzbGFtaWNoaXN0b3J5cHJlZmVyc1wiLFxuXHRcdFwiZHVyYXRpb25cIjogXCIxMDAlXCIsXG5cdFx0XCJhbmltYXRpb25zXCI6IFtcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5kaXNwbGF5LTRcIixcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQxLFxuXHRcdFx0XHRcdDAuNVxuXHRcdFx0XHRdXG5cdFx0XHR9LFxuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLmlzbGFtaWMtaW52ZW50aW9uc1wiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDEsXG5cdFx0XHRcdFx0MC41XG5cdFx0XHRcdF1cblx0XHRcdH1cblx0XHRdXG5cdH0sXG5cdHtcblx0XHRcIndyYXBwZXJcIjogXCIjd2hhdGlzbGFtaWNoaXN0b3J5cHJlZmVyc1wiLFxuXHRcdFwiZHVyYXRpb25cIjogXCIxMDAlXCIsXG5cdFx0XCJhbmltYXRpb25zXCI6IFtcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5kaXNwbGF5LTRcIixcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQwLjUsXG5cdFx0XHRcdFx0MFxuXHRcdFx0XHRdXG5cdFx0XHR9LFxuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLmlzbGFtaWMtaW52ZW50aW9uc1wiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDAuNSxcblx0XHRcdFx0XHQwXG5cdFx0XHRcdF1cblx0XHRcdH1cblx0XHRdXG5cdH1cbl07XG5cblxuLyoqKioqKioqKioqKioqKioqXG4gKiogV0VCUEFDSyBGT09URVJcbiAqKiAuL34vanNvbi1sb2FkZXIhLi9zY2VuZXMvd2hhdGlzbGFtaWNoaXN0b3J5cHJlZmVycy9zY2VuZS5qc29uXG4gKiogbW9kdWxlIGlkID0gNzZcbiAqKiBtb2R1bGUgY2h1bmtzID0gMFxuICoqLyIsIm1vZHVsZS5leHBvcnRzID0gW1xuXHR7XG5cdFx0XCJ3cmFwcGVyXCI6IFwiI3doYXR0aGVxdXJhbnByZWZlcnNcIixcblx0XHRcImR1cmF0aW9uXCI6IFwiMTAwJVwiLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIuZGlzcGxheS00XCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MSxcblx0XHRcdFx0XHQwXG5cdFx0XHRcdF1cblx0XHRcdH1cblx0XHRdXG5cdH1cbl07XG5cblxuLyoqKioqKioqKioqKioqKioqXG4gKiogV0VCUEFDSyBGT09URVJcbiAqKiAuL34vanNvbi1sb2FkZXIhLi9zY2VuZXMvd2hhdHRoZXF1cmFucHJlZmVycy9zY2VuZS5qc29uXG4gKiogbW9kdWxlIGlkID0gNzdcbiAqKiBtb2R1bGUgY2h1bmtzID0gMFxuICoqLyIsIm1vZHVsZS5leHBvcnRzID0gW1xuXHR7XG5cdFx0XCJ3cmFwcGVyXCI6IFwiI3dob2FyZXRoZXlcIixcblx0XHRcImR1cmF0aW9uXCI6IFwiMTAwJVwiLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIuZGlzcGxheS00XCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MCxcblx0XHRcdFx0XHQxXG5cdFx0XHRcdF1cblx0XHRcdH1cblx0XHRdXG5cdH0sXG5cdHtcblx0XHRcIndyYXBwZXJcIjogXCIjd2hvYXJldGhleVwiLFxuXHRcdFwiZHVyYXRpb25cIjogXCIxMDAlXCIsXG5cdFx0XCJmb2N1c1wiOiB0cnVlLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXG5cdFx0XHR7fVxuXHRcdF1cblx0fSxcblx0e1xuXHRcdFwid3JhcHBlclwiOiBcIiN3aG9hcmV0aGV5XCIsXG5cdFx0XCJkdXJhdGlvblwiOiBcIjEwMCVcIixcblx0XHRcImFuaW1hdGlvbnNcIjogW1xuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLmRpc3BsYXktNFwiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDIsXG5cdFx0XHRcdFx0MFxuXHRcdFx0XHRdXG5cdFx0XHR9XG5cdFx0XVxuXHR9XG5dO1xuXG5cbi8qKioqKioqKioqKioqKioqKlxuICoqIFdFQlBBQ0sgRk9PVEVSXG4gKiogLi9+L2pzb24tbG9hZGVyIS4vc2NlbmVzL3dob2FyZXRoZXkvc2NlbmUuanNvblxuICoqIG1vZHVsZSBpZCA9IDc4XG4gKiogbW9kdWxlIGNodW5rcyA9IDBcbiAqKi8iLCJtb2R1bGUuZXhwb3J0cyA9IFtcblx0e1xuXHRcdFwid3JhcHBlclwiOiBcIiN3aXRoYWxsdGhlaGF0cmVkXCIsXG5cdFx0XCJkdXJhdGlvblwiOiBcIjEwMCVcIixcblx0XHRcImFuaW1hdGlvbnNcIjogW1xuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLmRpc3BsYXktNFwiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDEsXG5cdFx0XHRcdFx0MFxuXHRcdFx0XHRdXG5cdFx0XHR9XG5cdFx0XVxuXHR9XG5dO1xuXG5cbi8qKioqKioqKioqKioqKioqKlxuICoqIFdFQlBBQ0sgRk9PVEVSXG4gKiogLi9+L2pzb24tbG9hZGVyIS4vc2NlbmVzL3dpdGhhbGx0aGVoYXRyZWQvc2NlbmUuanNvblxuICoqIG1vZHVsZSBpZCA9IDc5XG4gKiogbW9kdWxlIGNodW5rcyA9IDBcbiAqKi8iLCJtb2R1bGUuZXhwb3J0cyA9IFtcblx0e1xuXHRcdFwid3JhcHBlclwiOiBcIiN5ZXR0aGF0c29rYXlcIixcblx0XHRcImR1cmF0aW9uXCI6IFwiMTAwJVwiLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIuZGlzcGxheS00XCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MCxcblx0XHRcdFx0XHQxLjI1XG5cdFx0XHRcdF1cblx0XHRcdH1cblx0XHRdXG5cdH0sXG5cdHtcblx0XHRcIndyYXBwZXJcIjogXCIjeWV0dGhhdHNva2F5XCIsXG5cdFx0XCJkdXJhdGlvblwiOiBcIjEwMCVcIixcblx0XHRcImZvY3VzXCI6IHRydWUsXG5cdFx0XCJhbmltYXRpb25zXCI6IFtcblx0XHRcdHt9XG5cdFx0XVxuXHR9LFxuXHR7XG5cdFx0XCJ3cmFwcGVyXCI6IFwiI3lldHRoYXRzb2theVwiLFxuXHRcdFwiZHVyYXRpb25cIjogXCIxMDAlXCIsXG5cdFx0XCJhbmltYXRpb25zXCI6IFtcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5kaXNwbGF5LTRcIixcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQyLFxuXHRcdFx0XHRcdDBcblx0XHRcdFx0XVxuXHRcdFx0fVxuXHRcdF1cblx0fVxuXTtcblxuXG4vKioqKioqKioqKioqKioqKipcbiAqKiBXRUJQQUNLIEZPT1RFUlxuICoqIC4vfi9qc29uLWxvYWRlciEuL3NjZW5lcy95ZXR0aGF0c29rYXkvc2NlbmUuanNvblxuICoqIG1vZHVsZSBpZCA9IDgwXG4gKiogbW9kdWxlIGNodW5rcyA9IDBcbiAqKi8iXSwic291cmNlUm9vdCI6IiJ9