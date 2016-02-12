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

	module.exports = "<style>\n/*#intro {\n  position: fixed;\n  top: 15vh;\n  left: 10%;\n  width: 80%;\n  color: #fff;\n  text-align: center;\n  text-transform: uppercase;\n}*/\n.help-text {\n\tposition: absolute;\n\tcolor: #29d;\n\tfont-size: 3vmin;\n}\n.help-text-skin {\n\tcolor: #29d;\n\tfont-size: 3vmin;\n}\n/*.help-text i {\n\tfont-size: 5vmin;\n}*/\n.beta {\n\topacity: 0.7;\n\tfont-size: 2.5vmin;\n\n}\n</style>\n<div class=\"intro\">\n\t<div class=\"table \">\n  \t\t<div class=\"table-center\">\n    \t\t<div class=\"display-1 text-centered\">\n\t\t\t\t\t<i class=\"fa fa-music animated flash \" style=\"animation-delay: 1.5s;\"></i><br></br>\n\t\t\t\t\t<br >\n    \t\t\tPlay, skip, or scroll to begin <a target=\"_blank\" href=\"mailto:muslimsagainstisisgroup@gmail.com\"><sup class=\"beta\">(BETA)</sup></a><br >\n\t\t\t\t\t<span class=\"help-text-skin\">\n\t\t\t\t\t\tAll quotes and news sources are clickable.\n\t\t\t\t\t</span>\n\t\t\t</div>\n  \t\t</div>\n\t</div>\n</div>\n\n<div class=\"help-text\" style=\"top: 4vmin;right: 16vmin;\">\n\t<span class=\"animated  \" style=\"animation-delay: 2s;\" >Play/Pause <i class=\"fa fa-arrow-circle-right\"></i></span>\n</div>\n<div class=\"help-text\" style=\"top: 14.5vh;right: 16vmin;\">\n\t<span class=\"animated  \" style=\"animation-delay: 2s;\" >Skip <i class=\"fa fa-arrow-circle-right\"></i></span>\n</div>\n\n<div class=\"help-text\" style=\"bottom:3vh;right:48vw;text-align:center\">\n\t<div class=\"animated  \" style=\"animation-delay: 2s;\"><div style=\"padding-bottom: 1vh;\">Scroll</div> <i class=\"fa fa-arrow-circle-down\"></i></div>\n</div>\n";

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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly8vd2VicGFjay9ib290c3RyYXAgODBiMDkwNTY5YTkzYzRhZGJlNzUiLCJ3ZWJwYWNrOi8vLy4vanMvZW50cnkuanMiLCJ3ZWJwYWNrOi8vLy4vc2NlbmUtbWFrZXIvaW5kZXguanMiLCJ3ZWJwYWNrOi8vLy4vc2NlbmUtbWFrZXIvb2Itc2NlbmUuanMiLCJ3ZWJwYWNrOi8vLy4vfi9rZWZpci9kaXN0L2tlZmlyLmpzIiwid2VicGFjazovLy8uL3NjZW5lLW1ha2VyL3JlbmRlci9hdWRpb3BsYXllci5qcyIsIndlYnBhY2s6Ly8vLi9zY2VuZS1tYWtlci9yZW5kZXIvbG9vcGVyLmpzIiwid2VicGFjazovLy8uL34vaG93bGVyL2hvd2xlci5qcyIsIndlYnBhY2s6Ly8vKHdlYnBhY2spL2J1aWxkaW4vYW1kLW9wdGlvbnMuanMiLCJ3ZWJwYWNrOi8vLy4vc2NlbmUtbWFrZXIvcmVuZGVyL3ZpZGVvcGxheWVyLmpzIiwid2VicGFjazovLy8uL3NjZW5lLW1ha2VyL3V0aWxzL3BhZ2UtdXRpbHMuanMiLCJ3ZWJwYWNrOi8vLy4vc2NlbmUtbWFrZXIvdXNlci9jb250cm9scy5qcyIsIndlYnBhY2s6Ly8vLi9zY2VuZS1tYWtlci9yZW5kZXIvaW5kZXguanMiLCJ3ZWJwYWNrOi8vLy4vc2NlbmUtbWFrZXIvcmVuZGVyL3Njcm9sbGJhci5qcyIsIndlYnBhY2s6Ly8vLi9zY2VuZS1tYWtlci91dGlscy9zY2VuZS11dGlscy5qcyIsIndlYnBhY2s6Ly8vLi9zY2VuZXMvaW5kZXguanNvbiIsIndlYnBhY2s6Ly8vXlxcLlxcLy4qXFwvc2NlbmVcXC5odG1sJCIsIndlYnBhY2s6Ly8vLi9zY2VuZXMvYWJvdXR5b3Vyc2VsZi9zY2VuZS5odG1sIiwid2VicGFjazovLy8uL3NjZW5lcy9iYXR0bGVvZmFnZW5lcmF0aW9uL3NjZW5lLmh0bWwiLCJ3ZWJwYWNrOi8vLy4vc2NlbmVzL2NvbXBsaWNhdGVkc2l0dWF0aW9uL3NjZW5lLmh0bWwiLCJ3ZWJwYWNrOi8vLy4vc2NlbmVzL2RpZmZlcmVudHByYWN0aWNlcy9zY2VuZS5odG1sIiwid2VicGFjazovLy8uL3NjZW5lcy9kb3lvdWZlZWxtdXNsaW0vc2NlbmUuaHRtbCIsIndlYnBhY2s6Ly8vLi9zY2VuZXMvZXhwbG9zaW9uL3NjZW5lLmh0bWwiLCJ3ZWJwYWNrOi8vLy4vc2NlbmVzL2ZlZWxpbmdjb25mdXNlZC9zY2VuZS5odG1sIiwid2VicGFjazovLy8uL3NjZW5lcy9pbnRyby9zY2VuZS5odG1sIiwid2VicGFjazovLy8uL3NjZW5lcy9pc2lzYWZ0ZXJsaWZlZmFsbGFjeS9zY2VuZS5odG1sIiwid2VicGFjazovLy8uL3NjZW5lcy9pc2lzYXBvY2FseXBzZW1pc3F1b3RlL3NjZW5lLmh0bWwiLCJ3ZWJwYWNrOi8vLy4vc2NlbmVzL2lzaXNiYW5rcnVwdC9zY2VuZS5odG1sIiwid2VicGFjazovLy8uL3NjZW5lcy9pc2lzZmlnaHRtaXNxdW90ZS9zY2VuZS5odG1sIiwid2VicGFjazovLy8uL3NjZW5lcy9pc2lzb2JqZWN0aXZlL3NjZW5lLmh0bWwiLCJ3ZWJwYWNrOi8vLy4vc2NlbmVzL2lzaXN3YW50c3RvZGl2aWRlL3NjZW5lLmh0bWwiLCJ3ZWJwYWNrOi8vLy4vc2NlbmVzL2l0aXNudGVhc3kvc2NlbmUuaHRtbCIsIndlYnBhY2s6Ly8vLi9zY2VuZXMvaXRzZ290dG9lbmQvc2NlbmUuaHRtbCIsIndlYnBhY2s6Ly8vLi9zY2VuZXMvaXdhbnRteWlzbGFtYmFjazEvc2NlbmUuaHRtbCIsIndlYnBhY2s6Ly8vLi9zY2VuZXMvbGlrZXBlYWNlL3NjZW5lLmh0bWwiLCJ3ZWJwYWNrOi8vLy4vc2NlbmVzL21peGVkZmVlbGluZ3Mvc2NlbmUuaHRtbCIsIndlYnBhY2s6Ly8vLi9zY2VuZXMvbXVzbGltc2JlbGlldmVpbmRpdmlkdWFsbGlmZS9zY2VuZS5odG1sIiwid2VicGFjazovLy8uL3NjZW5lcy9vdXR0b2dldHlvdS9zY2VuZS5odG1sIiwid2VicGFjazovLy8uL3NjZW5lcy9yZWFjdGlvbnN0b3RlcnJvci9zY2VuZS5odG1sIiwid2VicGFjazovLy8uL3NjZW5lcy9zb21ldGhpbmd0b3Byb3ZlL3NjZW5lLmh0bWwiLCJ3ZWJwYWNrOi8vLy4vc2NlbmVzL3dlYXJlY29taW5nL3NjZW5lLmh0bWwiLCJ3ZWJwYWNrOi8vLy4vc2NlbmVzL3dlYXJlbm90YWZyYWlkL3NjZW5lLmh0bWwiLCJ3ZWJwYWNrOi8vLy4vc2NlbmVzL3dld2lsbHByb3RlY3RlYWNob3RoZXIvc2NlbmUuaHRtbCIsIndlYnBhY2s6Ly8vLi9zY2VuZXMvd2hhdGlzbGFtaWNoaXN0b3J5cHJlZmVycy9zY2VuZS5odG1sIiwid2VicGFjazovLy8uL3NjZW5lcy93aGF0dGhlcXVyYW5wcmVmZXJzL3NjZW5lLmh0bWwiLCJ3ZWJwYWNrOi8vLy4vc2NlbmVzL3dob2FyZXRoZXkvc2NlbmUuaHRtbCIsIndlYnBhY2s6Ly8vLi9zY2VuZXMvd2l0aGFsbHRoZWhhdHJlZC9zY2VuZS5odG1sIiwid2VicGFjazovLy8uL3NjZW5lcy95ZXR0aGF0c29rYXkvc2NlbmUuaHRtbCIsIndlYnBhY2s6Ly8vXlxcLlxcLy4qXFwvc2NlbmVcXC5qc29uJCIsIndlYnBhY2s6Ly8vLi9zY2VuZXMvYWJvdXR5b3Vyc2VsZi9zY2VuZS5qc29uIiwid2VicGFjazovLy8uL3NjZW5lcy9iYXR0bGVvZmFnZW5lcmF0aW9uL3NjZW5lLmpzb24iLCJ3ZWJwYWNrOi8vLy4vc2NlbmVzL2NvbXBsaWNhdGVkc2l0dWF0aW9uL3NjZW5lLmpzb24iLCJ3ZWJwYWNrOi8vLy4vc2NlbmVzL2RpZmZlcmVudHByYWN0aWNlcy9zY2VuZS5qc29uIiwid2VicGFjazovLy8uL3NjZW5lcy9kb3lvdWZlZWxtdXNsaW0vc2NlbmUuanNvbiIsIndlYnBhY2s6Ly8vLi9zY2VuZXMvZXhwbG9zaW9uL3NjZW5lLmpzb24iLCJ3ZWJwYWNrOi8vLy4vc2NlbmVzL2ZlZWxpbmdjb25mdXNlZC9zY2VuZS5qc29uIiwid2VicGFjazovLy8uL3NjZW5lcy9pbnRyby9zY2VuZS5qc29uIiwid2VicGFjazovLy8uL3NjZW5lcy9pc2lzYWZ0ZXJsaWZlZmFsbGFjeS9zY2VuZS5qc29uIiwid2VicGFjazovLy8uL3NjZW5lcy9pc2lzYXBvY2FseXBzZW1pc3F1b3RlL3NjZW5lLmpzb24iLCJ3ZWJwYWNrOi8vLy4vc2NlbmVzL2lzaXNiYW5rcnVwdC9zY2VuZS5qc29uIiwid2VicGFjazovLy8uL3NjZW5lcy9pc2lzZmlnaHRtaXNxdW90ZS9zY2VuZS5qc29uIiwid2VicGFjazovLy8uL3NjZW5lcy9pc2lzb2JqZWN0aXZlL3NjZW5lLmpzb24iLCJ3ZWJwYWNrOi8vLy4vc2NlbmVzL2lzaXN3YW50c3RvZGl2aWRlL3NjZW5lLmpzb24iLCJ3ZWJwYWNrOi8vLy4vc2NlbmVzL2l0aXNudGVhc3kvc2NlbmUuanNvbiIsIndlYnBhY2s6Ly8vLi9zY2VuZXMvaXRzZ290dG9lbmQvc2NlbmUuanNvbiIsIndlYnBhY2s6Ly8vLi9zY2VuZXMvaXdhbnRteWlzbGFtYmFjazEvc2NlbmUuanNvbiIsIndlYnBhY2s6Ly8vLi9zY2VuZXMvbGlrZXBlYWNlL3NjZW5lLmpzb24iLCJ3ZWJwYWNrOi8vLy4vc2NlbmVzL21peGVkZmVlbGluZ3Mvc2NlbmUuanNvbiIsIndlYnBhY2s6Ly8vLi9zY2VuZXMvbXVzbGltc2JlbGlldmVpbmRpdmlkdWFsbGlmZS9zY2VuZS5qc29uIiwid2VicGFjazovLy8uL3NjZW5lcy9vdXR0b2dldHlvdS9zY2VuZS5qc29uIiwid2VicGFjazovLy8uL3NjZW5lcy9yZWFjdGlvbnN0b3RlcnJvci9zY2VuZS5qc29uIiwid2VicGFjazovLy8uL3NjZW5lcy9zb21ldGhpbmd0b3Byb3ZlL3NjZW5lLmpzb24iLCJ3ZWJwYWNrOi8vLy4vc2NlbmVzL3dlYXJlY29taW5nL3NjZW5lLmpzb24iLCJ3ZWJwYWNrOi8vLy4vc2NlbmVzL3dlYXJlbm90YWZyYWlkL3NjZW5lLmpzb24iLCJ3ZWJwYWNrOi8vLy4vc2NlbmVzL3dld2lsbHByb3RlY3RlYWNob3RoZXIvc2NlbmUuanNvbiIsIndlYnBhY2s6Ly8vLi9zY2VuZXMvd2hhdGlzbGFtaWNoaXN0b3J5cHJlZmVycy9zY2VuZS5qc29uIiwid2VicGFjazovLy8uL3NjZW5lcy93aGF0dGhlcXVyYW5wcmVmZXJzL3NjZW5lLmpzb24iLCJ3ZWJwYWNrOi8vLy4vc2NlbmVzL3dob2FyZXRoZXkvc2NlbmUuanNvbiIsIndlYnBhY2s6Ly8vLi9zY2VuZXMvd2l0aGFsbHRoZWhhdHJlZC9zY2VuZS5qc29uIiwid2VicGFjazovLy8uL3NjZW5lcy95ZXR0aGF0c29rYXkvc2NlbmUuanNvbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0EsdUJBQWU7QUFDZjtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7O0FBR0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTs7Ozs7OztBQ3RDQTs7Ozs7OztBQ0FBOztBQUVBLEtBQU0sVUFBVSxvQkFBUSxDQUFSLENBQVY7QUFDTixLQUFNLFdBQVcsb0JBQVEsRUFBUixDQUFYO0FBQ04sS0FBTSxTQUFTLG9CQUFRLEVBQVIsQ0FBVDs7QUFFTixLQUFNLGFBQWEsb0JBQVEsRUFBUixDQUFiO0FBQ04sS0FBTSxjQUFjLG9CQUFRLENBQVIsQ0FBZDs7QUFFTixLQUFNLGtCQUFrQixXQUFXLFVBQVgsRUFBbEI7QUFDTixLQUFNLGlCQUFpQixXQUFXLFNBQVgsRUFBakI7QUFDTixLQUFJLG1CQUFvQixXQUFXLGNBQVgsRUFBcEI7O0FBRUosYUFBWSxNQUFaLENBQW1CLGdCQUFuQjs7QUFFQSxHQUFFLFlBQVc7QUFDUCxPQUFJLEtBQUssVUFBVSxTQUFWOzs7O0FBREYsT0FLTDs7O0FBTEssRUFBWCxDQUFGOztBQVVBLFVBQVMsSUFBVCxHQUFnQjs7QUFFZCxRQUFLLEVBQUwsQ0FBUSxNQUFSLEVBQWdCLFVBQUMsQ0FBRCxFQUFPOztBQUVyQixPQUFFLGtCQUFGLEVBQXNCLElBQXRCLENB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Q0FBc0MsRUFBRSw0QkFBNEIsRUFBRTtBQUNwRjtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUEsZ0JBQWU7QUFDZjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUEsZ0JBQWU7QUFDZjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7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Q0E7O0FBRUEsR0FBRTs7QUFFRixvQkFBbUI7O0FBRW5CLFFBQU87QUFDUDtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxlQUFjLFlBQVk7QUFDMUI7QUFDQTtBQUNBO0FBQ0EsZUFBYyxZQUFZO0FBQzFCO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsZUFBYyxZQUFZO0FBQzFCO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLGVBQWMsWUFBWTtBQUMxQjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsZUFBYyxZQUFZO0FBQzFCO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGVBQWMsWUFBWTtBQUMxQjtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsT0FBTTtBQUNOO0FBQ0EsMEJBQXlCLFlBQVk7QUFDckM7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFJO0FBQ0o7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGVBQWMsWUFBWTtBQUMxQjtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxlQUFjLFlBQVk7QUFDMUI7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLGVBQWMsWUFBWTtBQUMxQjtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxvQkFBbUIsWUFBWTtBQUMvQjtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUEsUUFBTztB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OztBQUVBLFFBQU87QUFDUDtBQUNBOztBQUVBOztBQUVBOztBQUVBOztBQUVBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsU0FBUTtBQUNSO0FBQ0E7QUFDQSxLQUFJO0FBQ0o7O0FBRUEsUUFBTztBQUNQO0FBQ0E7O0FBRUE7O0FBRUE7O0FBRUE7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSTs7QUFFSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSTs7QUFFSjtBQUNBO0FBQ0EsS0FBSTs7QUFFSjtBQUNBO0FBQ0E7QUFDQTs7QUFFQSxHQUFFOztBQUVGO0FBQ0E7QUFDQTs7QUFFQSxRQUFPO0FBQ1A7QUFDQTs7QUFFQTs7QUFFQTs7QUFFQTs7QUFFQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFdBQVU7QUFDVjtBQUNBO0FBQ0E7QUFDQSxTQUFRO0FBQ1I7QUFDQTtBQUNBLEtBQUk7QUFDSjs7QUFFQSxRQUFPO0FBQ1A7QUFDQTs7QUFFQTs7QUFFQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUEsbUJBQWtCLGtCQUFrQjtBQUNwQztBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQSxLQUFJO0FBQ0o7QUFDQSxLQUFJO0FBQ0o7O0FBRUEsUUFBTztBQUNQO0FBQ0E7O0FBRUE7O0FBRUE7O0FBRUE7O0FBRUE7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0EsT0FBTTtBQUNOO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFJO0FBQ0o7O0FBRUEsUUFBTztBQUNQO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUk7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBLG9CQUFtQjs7QUFFbkIsUUFBTztBQUNQO0FBQ0E7O0FBRUE7O0FBRUE7O0FBRUE7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQSwwQkFBeUI7QUFDekI7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFFOztBQUVGO0FBQ0E7QUFDQTs7QUFFQSxRQUFPO0FBQ1A7QUFDQTs7QUFFQTs7QUFFQTs7QUFFQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBLDBCQUF5QjtBQUN6Qjs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUU7O0FBRUY7QUFDQTtBQUNBOztBQUVBLFFBQU87QUFDUDtBQUNBOztBQUVBOztBQUVBOztBQUVBOztBQUVBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQSxLQUFJOztBQUVKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSwyQ0FBMEM7QUFDMUM7O0FBRUEsR0FBRTs7QUFFRjtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLHVCQUFzQixTQUFTO0FBQy9COztBQUVBLFFBQU87QUFDUDtBQUNBOztBQUVBOztBQUVBO0FBQ0E7O0FBRUE7O0FBRUE7O0FBRUE7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQSxnQ0FBK0I7QUFDL0IsZ0NBQStCOztBQUUvQjtBQUNBO0FBQ0EsT0FBTTtBQUNOO0FBQ0E7QUFDQSxPQUFNO0FBQ047QUFDQTtBQUNBLE9BQU07O0FBRU47QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsT0FBTTs7QUFFTjtBQUNBO0FBQ0EsT0FBTTtBQUNOO0FBQ0E7QUFDQSxPQUFNOztBQUVOO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQSxvQkFBbUI7O0FBRW5CLFFBQU87QUFDUDtBQUNBOztBQUVBOztBQUVBOztBQUVBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSTs7QUFFSjtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBLEdBQUU7O0FBRUY7QUFDQTtBQUNBOztBQUVBLFFBQU87QUFDUDtBQUNBOztBQUVBOztBQUVBO0FBQ0E7O0FBRUE7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0EsS0FBSTs7QUFFSjtBQUNBOztBQUVBLFFBQU87QUFDUDtBQUNBOztBQUVBOztBQUVBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsS0FBSTtBQUNKO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFNBQVE7QUFDUjtBQUNBO0FBQ0EsT0FBTTtBQUNOLEtBQUk7QUFDSjs7QUFFQSxRQUFPO0FBQ1A7QUFDQTs7QUFFQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsU0FBUTtBQUNSO0FBQ0E7QUFDQSxTQUFRO0FBQ1I7QUFDQTtBQUNBO0FBQ0EsT0FBTTs7QUFFTjtBQUNBO0FBQ0E7QUFDQTtBQUNBLE9BQU07QUFDTjtBQUNBO0FBQ0EsS0FBSTtBQUNKOztBQUVBLFFBQU87QUFDUDtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLEtBQUk7QUFDSjtBQUNBLEtBQUk7QUFDSjtBQUNBO0FBQ0E7O0FBRUEsUUFBTztBQUNQO0FBQ0E7O0FBRUE7O0FBRUE7O0FBRUE7O0FBRUE7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsU0FBUTtBQUNSO0FBQ0EsU0FBUTtBQUNSO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRTs7QUFFRjtBQUNBO0FBQ0E7O0FBRUEsUUFBTztBQUNQO0FBQ0E7O0FBRUE7O0FBRUE7O0FBRUE7QUFDQTs7QUFFQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0EsS0FBSTs7QUFFSjtBQUNBO0FBQ0EsS0FBSTs7QUFFSjtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBLDZDQUE0QyxTQUFTO0FBQ3JEOztBQUVBLFFBQU87QUFDUDtBQUNBOztBQUVBOztBQUVBOztBQUVBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTs7QUFFQTtBQUNBLEtBQUk7O0FBRUo7QUFDQTtBQUNBLEtBQUk7O0FBRUo7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUEsNkNBQTRDLFNBQVM7QUFDckQ7O0FBRUEsUUFBTztBQUNQO0FBQ0E7O0FBRUE7O0FBRUE7O0FBRUE7QUFDQTs7QUFFQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSTs7QUFFSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0EsNkNBQTRDLE9BQU87QUFDbkQ7O0FBRUEsUUFBTztBQUNQO0FBQ0E7O0FBRUE7O0FBRUE7O0FBRUE7QUFDQTs7QUFFQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSTs7QUFFSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0EsNkNBQTRDLE9BQU87QUFDbkQ7O0FBRUEsUUFBTztBQUNQO0FBQ0E7O0FBRUE7O0FBRUE7O0FBRUE7QUFDQTs7QUFFQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0EsS0FBSTs7QUFFSjtBQUNBO0FBQ0EsS0FBSTs7QUFFSjtBQUNBO0FBQ0E7QUFDQTtBQUNBLE9BQU07QUFDTjtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQSw2Q0FBNEMsU0FBUztBQUNyRDs7QUFFQSxRQUFPO0FBQ1A7QUFDQTs7QUFFQTs7QUFFQTs7QUFFQTtBQUNBOztBQUVBOztBQUVBOztBQUVBOztBQUVBO0FBQ0E7QUFDQSxLQUFJOztBQUVKO0FBQ0E7QUFDQSxLQUFJOztBQUVKO0FBQ0E7QUFDQSxLQUFJOztBQUVKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQSxRQUFPO0FBQ1A7QUFDQTs7QUFFQTs7QUFFQTs7QUFFQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQSxLQUFJOztBQUVKO0FBQ0E7QUFDQTtBQUNBLE9BQU07QUFDTjtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTs7QUFFQTtBQUNBLDZDQUE0QyxPQUFPO0FBQ25EOztBQUVBLFFBQU87QUFDUDtBQUNBOztBQUVBOztBQUVBOztBQUVBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTs7QUFFQTtBQUNBLEtBQUk7O0FBRUo7QUFDQTtBQUNBLEtBQUk7O0FBRUo7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUEsNkNBQTRDLFNBQVM7QUFDckQ7O0FBRUEsUUFBTztBQUNQO0FBQ0E7O0FBRUE7O0FBRUE7O0FBRUE7QUFDQTs7QUFFQTs7QUFFQTs7QUFFQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQSxLQUFJOztBQUVKO0FBQ0E7QUFDQTtBQUNBLEtBQUk7O0FBRUo7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQSw2Q0FBNEMsU0FBUztBQUNyRDs7QUFFQSxRQUFPO0FBQ1A7QUFDQTs7QUFFQTs7QUFFQTs7QUFFQTtBQUNBOztBQUVBOztBQUVBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0EsS0FBSTs7QUFFSjtBQUNBO0FBQ0E7QUFDQSxLQUFJOztBQUVKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUEsNkNBQTRDLGtDQUFrQztBQUM5RTs7QUFFQSxRQUFPO0FBQ1A7QUFDQTs7QUFFQTs7QUFFQTs7QUFFQTs7QUFFQTs7QUFFQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSTs7QUFFSjtBQUNBO0FBQ0E7QUFDQSxLQUFJOztBQUVKO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsT0FBTTtBQUNOO0FBQ0E7QUFDQTs7QUFFQSxHQUFFOztBQUVGO0FBQ0E7O0FBRUEsdUJBQXNCLHFCQUFxQjtBQUMzQzs7QUFFQSxRQUFPO0FBQ1A7QUFDQTs7QUFFQTs7QUFFQTs7QUFFQTs7QUFFQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0EsS0FBSTs7QUFFSjtBQUNBO0FBQ0EsS0FBSTs7QUFFSjtBQUNBO0FBQ0E7QUFDQSxxQkFBb0IsZUFBZTtBQUNuQztBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUEsdUJBQXNCLFNBQVM7QUFDL0I7O0FBRUEsUUFBTztBQUNQO0FBQ0E7O0FBRUE7O0FBRUE7O0FBRUE7QUFDQTs7QUFFQTs7QUFFQTs7QUFFQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFNBQVE7QUFDUjtBQUNBO0FBQ0E7QUFDQSxLQUFJOztBQUVKO0FBQ0E7QUFDQTtBQUNBLEtBQUk7O0FBRUo7QUFDQTtBQUNBO0FBQ0EsT0FBTTtBQUNOO0FBQ0E7QUFDQTtBQUNBLEtBQUk7O0FBRUo7QUFDQTtBQUNBO0FBQ0EsT0FBTTtBQUNOO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQSw2Q0FBNEMsYUFBYTtBQUN6RDs7QUFFQSxRQUFPO0FBQ1A7QUFDQTs7QUFFQTs7QUFFQTs7QUFFQTtBQUNBOztBQUVBOztBQUVBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSTs7QUFFSjtBQUNBO0FBQ0E7QUFDQSxLQUFJOztBQUVKO0FBQ0E7QUFDQTtBQUNBLE9BQU07QUFDTjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxTQUFRO0FBQ1I7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUk7O0FBRUo7QUFDQTtBQUNBO0FBQ0EsT0FBTTtBQUNOO0FBQ0E7QUFDQSxTQUFRO0FBQ1I7QUFDQTtBQUNBO0FBQ0EsS0FBSTs7QUFFSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSTs7QUFFSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTs7QUFFQTtBQUNBLHdFQUF1RTs7QUFFdkU7QUFDQTtBQUNBO0FBQ0E7O0FBRUEsNkNBQTRDLG1EQUFtRDtBQUMvRjs7QUFFQSxRQUFPO0FBQ1A7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0EsR0FBRTtBQUNGO0FBQ0E7O0FBRUEsUUFBTztBQUNQO0FBQ0E7O0FBRUE7O0FBRUE7O0FBRUE7QUFDQTs7QUFFQTs7QUFFQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSTs7QUFFSjtBQUNBO0FBQ0E7QUFDQSxLQUFJOztBQUVKO0FBQ0E7QUFDQTtBQUNBLE9BQU07QUFDTjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSTs7QUFFSjtBQUNBO0FBQ0E7QUFDQSxPQUFNO0FBQ047QUFDQTtBQUNBLFNBQVE7QUFDUjtBQUNBO0FBQ0E7QUFDQSxLQUFJOztBQUVKO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsT0FBTTtBQUNOO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQSx3RUFBdUU7O0FBRXZFO0FBQ0E7O0FBRUEsNkNBQTRDLG1DQUFtQztBQUMvRTs7QUFFQSxRQUFPO0FBQ1A7QUFDQTs7QUFFQTs7QUFFQTs7QUFFQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQSxLQUFJOztBQUVKO0FBQ0E7QUFDQSxLQUFJOztBQUVKO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUEsNkNBQTRDLFNBQVM7QUFDckQ7O0FBRUEsUUFBTztBQUNQO0FBQ0E7O0FBRUE7O0FBRUE7O0FBRUE7QUFDQTs7QUFFQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0EsS0FBSTs7QUFFSjtBQUNBO0FBQ0EsS0FBSTs7QUFFSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQSw2Q0FBNEMsU0FBUztBQUNyRDs7QUFFQSxRQUFPO0FBQ1A7QUFDQTs7QUFFQTs7QUFFQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQSxRQUFPO0FBQ1A7QUFDQTs7QUFFQTs7QUFFQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQSxRQUFPO0FBQ1A7QUFDQTs7QUFFQTs7QUFFQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQSxRQUFPO0FBQ1A7QUFDQTs7QUFFQTs7QUFFQTs7QUFFQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQSxLQUFJOztBQUVKO0FBQ0E7QUFDQSxLQUFJOztBQUVKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTs7QUFFQTtBQUNBLDZDQUE0QyxTQUFTO0FBQ3JEOztBQUVBLFFBQU87QUFDUDtBQUNBOztBQUVBOztBQUVBOztBQUVBO0FBQ0E7O0FBRUE7O0FBRUE7O0FBRUE7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLEtBQUk7O0FBRUo7QUFDQTtBQUNBLEtBQUk7O0FBRUo7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQSw2Q0FBNEMscUJBQXFCO0FBQ2pFOztBQUVBLFFBQU87QUFDUDtBQUNBOztBQUVBOztBQUVBOztBQUVBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLEtBQUk7O0FBRUo7QUFDQTtBQUNBLEtBQUk7O0FBRUo7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUk7O0FBRUo7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSTs7QUFFSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQSx3RUFBdUU7O0FBRXZFO0FBQ0E7O0FBRUEsNkNBQTRDLHVDQUF1QztBQUNuRjs7QUFFQSxRQUFPO0FBQ1A7QUFDQTs7QUFFQTs7QUFFQTs7QUFFQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxLQUFJOztBQUVKO0FBQ0E7QUFDQSxLQUFJOztBQUVKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFJOztBQUVKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFJOztBQUVKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0Esd0VBQXVFOztBQUV2RTtBQUNBOztBQUVBLDZDQUE0Qyx1Q0FBdUM7QUFDbkY7O0FBRUEsUUFBTztBQUNQO0FBQ0E7O0FBRUE7O0FBRUE7O0FBRUE7QUFDQTs7QUFFQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSTs7QUFFSjtBQUNBO0FBQ0E7QUFDQSxLQUFJOztBQUVKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFJOztBQUVKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSTs7QUFFSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSTs7QUFFSjtBQUNBLDJDQUEwQztBQUMxQztBQUNBLEtBQUk7O0FBRUo7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLDRDQUEyQztBQUMzQzs7QUFFQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0Esd0VBQXVFOztBQUV2RTtBQUNBOztBQUVBLDZDQUE0QyxtREFBbUQ7QUFDL0Y7O0FBRUEsUUFBTztBQUNQO0FBQ0E7O0FBRUE7O0FBRUE7O0FBRUE7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLE9BQU07O0FBRU47QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0EsS0FBSTs7QUFFSjtBQUNBO0FBQ0EsS0FBSTs7QUFFSjtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUk7O0FBRUo7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQSw2Q0FBNEMs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QUNBLEtBQUk7O0FBRUo7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBLEdBQUU7O0FBRUY7QUFDQTtBQUNBOztBQUVBLFFBQU87QUFDUDtBQUNBOztBQUVBOztBQUVBOztBQUVBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxLQUFJOztBQUVKO0FBQ0E7QUFDQTtBQUNBOztBQUVBLEdBQUU7O0FBRUY7O0FBRUEsUUFBTztBQUNQO0FBQ0E7O0FBRUE7O0FBRUE7O0FBRUE7QUFDQTtBQUNBOztBQUVBOztBQUVBOztBQUVBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFJOztBQUVKO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSTs7QUFFSjs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLFNBQVE7QUFDUjtBQUNBO0FBQ0E7QUFDQSxLQUFJOztBQUVKO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSTs7QUFFSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUEsR0FBRTs7QUFFRjs7QUFFQSxRQUFPO0FBQ1A7QUFDQTs7QUFFQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7O0FBRUE7O0FBRUE7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsU0FBUTtBQUNSO0FBQ0E7QUFDQTtBQUNBOztBQUVBLEdBQUU7O0FBRUY7O0FBRUEsUUFBTztBQUNQO0FBQ0E7O0FBRUE7O0FBRUE7O0FBRUE7QUFDQTs7QUFFQTs7QUFFQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUk7O0FBRUo7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQSxRQUFPO0FBQ1A7QUFDQTs7QUFFQTs7QUFFQTtBQUNBOztBQUVBOztBQUVBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQSxnQ0FBK0I7QUFDL0IsZ0NBQStCOztBQUUvQjtBQUNBO0FBQ0EsT0FBTTtBQUNOO0FBQ0E7QUFDQSxPQUFNO0FBQ047QUFDQTtBQUNBLE9BQU07O0FBRU47QUFDQTtBQUNBLE9BQU07QUFDTjtBQUNBO0FBQ0EsT0FBTTtBQUNOLDREQUEyRDs7QUFFM0Q7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsT0FBTTtBQUNOO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsT0FBTTs7QUFFTjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxPQUFNOztBQUVOO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsT0FBTTtBQUNOO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxPQUFNOztBQUVOO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQSxvQkFBbUI7O0FBRW5CLFFBQU87QUFDUDtBQUNBOztBQUVBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxLQUFJO0FBQ0o7QUFDQTs7QUFFQSxRQUFPO0FBQ1A7QUFDQTs7QUFFQTs7QUFFQTs7QUFFQTtBQUNBOztBQUVBOztBQUVBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSTs7QUFFSjtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBLFFBQU87QUFDUDtBQUNBOztBQUVBOztBQUVBOztBQUVBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBLFFBQU87QUFDUDtBQUNBOztBQUVBOztBQUVBOztBQUVBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQSx5RUFBd0U7O0FBRXhFO0FBQ0E7O0FBRUE7QUFDQTtBQUNBLEtBQUk7O0FBRUo7QUFDQTtBQUNBLEtBQUk7O0FBRUo7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUk7O0FBRUo7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUk7O0FBRUo7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUk7O0FBRUo7QUFDQTtBQUNBLEtBQUk7O0FBRUo7QUFDQTtBQUNBLEtBQUk7O0FBRUo7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQSxRQUFPO0FBQ1A7QUFDQTs7QUFFQTs7QUFFQTs7QUFFQTtBQUNBOztBQUVBOztBQUVBOztBQUVBOztBQUVBO0FBQ0EseUVBQXdFOztBQUV4RTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxLQUFJOztBQUVKO0FBQ0E7QUFDQSxLQUFJOztBQUVKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFJOztBQUVKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFJOztBQUVKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFJOztBQUVKO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSTs7QUFFSjtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUEsUUFBTztB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O0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRTtBQUNGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRTtBQUNGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSTtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEc7Ozs7OztBQzFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUU7QUFDRjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUU7QUFDRjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEc7Ozs7OztBQ25DQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUU7QUFDRjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUU7QUFDRjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsRzs7Ozs7O0FDcENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUk7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFFO0FBQ0Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFJO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUk7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFJO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSTtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUk7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFJO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSTtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUk7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFJO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUk7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFJO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSTtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUk7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFJO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSTtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFFO0FBQ0Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEc7Ozs7OztBQzVNQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUU7QUFDRjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUU7QUFDRjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEc7Ozs7OztBQ25DQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHOzs7Ozs7QUNmQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFJO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFJO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFJO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRTtBQUNGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRTtBQUNGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFJO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFJO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSTtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFFO0FBQ0Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFFO0FBQ0Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRTtBQUNGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFJO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFJO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFJO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHOzs7Ozs7QUM3SkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSTtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSTtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUU7QUFDRjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUU7QUFDRjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSTtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUk7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRTtBQUNGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRTtBQUNGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUU7QUFDRjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSTtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSTtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsRzs7Ozs7O0FDL0hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRTtBQUNGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUk7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRTtBQUNGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFFO0FBQ0Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUU7QUFDRjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRTtBQUNGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFFO0FBQ0Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUU7QUFDRjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFJO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUk7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFJO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSTtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUk7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFJO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUU7QUFDRjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUU7QUFDRjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUk7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRTtBQUNGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSTtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEc7Ozs7OztBQzlQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFJO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFJO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRTtBQUNGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRTtBQUNGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFJO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFJO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSTtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFFO0FBQ0Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFFO0FBQ0Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRTtBQUNGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFJO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHOzs7Ozs7QUMvSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEc7Ozs7OztBQ2RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFJO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUU7QUFDRjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUU7QUFDRjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUk7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRTtBQUNGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRTtBQUNGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFJO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHOzs7Ozs7QUNyRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFJO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUU7QUFDRjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRTtBQUNGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFFO0FBQ0Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUU7QUFDRjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRTtBQUNGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFFO0FBQ0Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUU7QUFDRjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRTtBQUNGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFFO0FBQ0Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUU7QUFDRjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRTtBQUNGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFFO0FBQ0Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUU7QUFDRjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFJO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUk7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSTtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFJO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUk7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSTtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFJO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUk7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSTtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFJO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUk7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSTtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRTtBQUNGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSTtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUk7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFFO0FBQ0Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFFO0FBQ0Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHOzs7Ozs7QUMxZ0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEc7Ozs7OztBQ1RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRTtBQUNGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUU7QUFDRjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEc7Ozs7OztBQ3hDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUU7QUFDRjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFFO0FBQ0Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRTtBQUNGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUU7QUFDRjtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUU7QUFDRjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUk7QUFDSjtBQUNBO0FBQ0E7QUFDQSxLQUFJO0FBQ0o7QUFDQTtBQUNBO0FBQ0EsS0FBSTtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUk7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRTtBQUNGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSTtBQUNKO0FBQ0E7QUFDQTtBQUNBLEtBQUk7QUFDSjtBQUNBO0FBQ0E7QUFDQSxLQUFJO0FBQ0o7QUFDQTtBQUNBO0FBQ0EsS0FBSTtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFFO0FBQ0Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEc7Ozs7OztBQ3pIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUU7QUFDRjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUU7QUFDRjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEc7Ozs7OztBQ25DQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUU7QUFDRjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUU7QUFDRjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEc7Ozs7OztBQ25DQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUU7QUFDRjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUU7QUFDRjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEc7Ozs7OztBQ25DQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUU7QUFDRjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUU7QUFDRjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUU7QUFDRjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsRzs7Ozs7O0FDbERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRTtBQUNGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRTtBQUNGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsRzs7Ozs7O0FDbkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRTtBQUNGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRTtBQUNGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsRzs7Ozs7O0FDbkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRTtBQUNGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRTtBQUNGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsRzs7Ozs7O0FDbkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUk7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFFO0FBQ0Y7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFFO0FBQ0Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFFO0FBQ0Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFFO0FBQ0Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUk7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEc7Ozs7OztBQ3BGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUU7QUFDRjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUk7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRTtBQUNGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRTtBQUNGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSTtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFFO0FBQ0Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFJO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsRzs7Ozs7O0FDbEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHOzs7Ozs7QUNkQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUU7QUFDRjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUU7QUFDRjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEc7Ozs7OztBQ25DQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsRzs7Ozs7O0FDZEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFFO0FBQ0Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFFO0FBQ0Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHIiwiZmlsZSI6ImJ1aWxkLmpzIiwic291cmNlc0NvbnRlbnQiOlsiIFx0Ly8gVGhlIG1vZHVsZSBjYWNoZVxuIFx0dmFyIGluc3RhbGxlZE1vZHVsZXMgPSB7fTtcblxuIFx0Ly8gVGhlIHJlcXVpcmUgZnVuY3Rpb25cbiBcdGZ1bmN0aW9uIF9fd2VicGFja19yZXF1aXJlX18obW9kdWxlSWQpIHtcblxuIFx0XHQvLyBDaGVjayBpZiBtb2R1bGUgaXMgaW4gY2FjaGVcbiBcdFx0aWYoaW5zdGFsbGVkTW9kdWxlc1ttb2R1bGVJZF0pXG4gXHRcdFx0cmV0dXJuIGluc3RhbGxlZE1vZHVsZXNbbW9kdWxlSWRdLmV4cG9ydHM7XG5cbiBcdFx0Ly8gQ3JlYXRlIGEgbmV3IG1vZHVsZSAoYW5kIHB1dCBpdCBpbnRvIHRoZSBjYWNoZSlcbiBcdFx0dmFyIG1vZHVsZSA9IGluc3RhbGxlZE1vZHVsZXNbbW9kdWxlSWRdID0ge1xuIFx0XHRcdGV4cG9ydHM6IHt9LFxuIFx0XHRcdGlkOiBtb2R1bGVJZCxcbiBcdFx0XHRsb2FkZWQ6IGZhbHNlXG4gXHRcdH07XG5cbiBcdFx0Ly8gRXhlY3V0ZSB0aGUgbW9kdWxlIGZ1bmN0aW9uXG4gXHRcdG1vZHVsZXNbbW9kdWxlSWRdLmNhbGwobW9kdWxlLmV4cG9ydHMsIG1vZHVsZSwgbW9kdWxlLmV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pO1xuXG4gXHRcdC8vIEZsYWcgdGhlIG1vZHVsZSBhcyBsb2FkZWRcbiBcdFx0bW9kdWxlLmxvYWRlZCA9IHRydWU7XG5cbiBcdFx0Ly8gUmV0dXJuIHRoZSBleHBvcnRzIG9mIHRoZSBtb2R1bGVcbiBcdFx0cmV0dXJuIG1vZHVsZS5leHBvcnRzO1xuIFx0fVxuXG5cbiBcdC8vIGV4cG9zZSB0aGUgbW9kdWxlcyBvYmplY3QgKF9fd2VicGFja19tb2R1bGVzX18pXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLm0gPSBtb2R1bGVzO1xuXG4gXHQvLyBleHBvc2UgdGhlIG1vZHVsZSBjYWNoZVxuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5jID0gaW5zdGFsbGVkTW9kdWxlcztcblxuIFx0Ly8gX193ZWJwYWNrX3B1YmxpY19wYXRoX19cbiBcdF9fd2VicGFja19yZXF1aXJlX18ucCA9IFwiXCI7XG5cbiBcdC8vIExvYWQgZW50cnkgbW9kdWxlIGFuZCByZXR1cm4gZXhwb3J0c1xuIFx0cmV0dXJuIF9fd2VicGFja19yZXF1aXJlX18oMCk7XG5cblxuXG4vKiogV0VCUEFDSyBGT09URVIgKipcbiAqKiB3ZWJwYWNrL2Jvb3RzdHJhcCA4MGIwOTA1NjlhOTNjNGFkYmU3NVxuICoqLyIsInJlcXVpcmUoJy4uL3NjZW5lLW1ha2VyL2luZGV4LmpzJyk7XG5cblxuXG4vKioqKioqKioqKioqKioqKipcbiAqKiBXRUJQQUNLIEZPT1RFUlxuICoqIC4vanMvZW50cnkuanNcbiAqKiBtb2R1bGUgaWQgPSAwXG4gKiogbW9kdWxlIGNodW5rcyA9IDBcbiAqKi8iLCIndXNlIHN0cmljdCc7XG5cbmNvbnN0IG9ic2NlbmUgPSByZXF1aXJlKCcuL29iLXNjZW5lLmpzJyk7XG5jb25zdCBjb250cm9scyA9IHJlcXVpcmUoJy4vdXNlci9jb250cm9scy5qcycpO1xuY29uc3QgcmVuZGVyID0gcmVxdWlyZSgnLi9yZW5kZXIvaW5kZXguanMnKTtcblxuY29uc3Qgc2NlbmVVdGlscyA9IHJlcXVpcmUoJy4vdXRpbHMvc2NlbmUtdXRpbHMuanMnKTtcbmNvbnN0IGF1ZGlvcGxheWVyID0gcmVxdWlyZSgnLi9yZW5kZXIvYXVkaW9wbGF5ZXIuanMnKTtcblxuY29uc3Qgc2NlbmVIdG1sU3RyaW5nID0gc2NlbmVVdGlscy5yZW5kZXJIVE1MKCk7XG5jb25zdCBzY2VuZU1vdGlvbk1hcCA9IHNjZW5lVXRpbHMuZ2V0U2NlbmVzKCk7XG5sZXQgc2NlbmVBdWRpb0NvbmZpZyA9ICBzY2VuZVV0aWxzLmdldEF1ZGlvQ29uZmlnKCk7XG5cbmF1ZGlvcGxheWVyLmNvbmZpZyhzY2VuZUF1ZGlvQ29uZmlnKTtcblxuJChmdW5jdGlvbigpIHtcbiAgICAgIHZhciB1YSA9IG5hdmlnYXRvci51c2VyQWdlbnQ7XG4gICAgICAvLyBpZiAoL0FuZHJvaWR8d2ViT1N8aVBob25lfGlQYWR8aVBvZHxCbGFja0JlcnJ5fElFTW9iaWxlfE9wZXJhIE1pbml8TW9iaWxlfG1vYmlsZS9pLnRlc3QodWEpKVxuICAgICAgICAvLyAgJCgnI3Vuc3VwcG9ydGVkJykuc2hvdygpO1xuICAgICAgLy8gZWxzZSBpZiAoL0Nocm9tZS9pLnRlc3QodWEpKVxuICAgICAgICBpbml0KCk7XG4gICAgICAvLyBlbHNlXG4gICAgICAgIC8vICAkKCcjdW5zdXBwb3J0ZWQnKS5zaG93KCk7XG59KTtcblxuZnVuY3Rpb24gaW5pdCgpIHtcblxuICBQYWNlLm9uKCdkb25lJywgKGUpID0+IHtcblxuICAgICQoJy5jb250YWluZXItaW5uZXInKS5odG1sKHNjZW5lSHRtbFN0cmluZylcblxuICAgIG9ic2NlbmUuaW5pdChzY2VuZU1vdGlvbk1hcClcbiAgICBjb250cm9scy5pbml0KClcblxuICAgICQoJy5sb2FkaW5nJykuZGVsYXkoMzAwKS5mYWRlT3V0KClcbiAgICBhdWRpb3BsYXllci5uZXh0KCdpbnRybycpO1xuICAgIGF1ZGlvcGxheWVyLnBsYXkoKTtcblxuICB9KVxuXG59XG5cblxuXG4vKiogV0VCUEFDSyBGT09URVIgKipcbiAqKiAuL3NjZW5lLW1ha2VyL2luZGV4LmpzXG4gKiovIiwiLypcbiAqICBEZXBlbmRlbmNpZXNcbiovXG5cbiAgY29uc3QgS2VmaXIgPSByZXF1aXJlKCdrZWZpcicpXG5cbiAgY29uc3QgYXVkaW9wbGF5ZXIgPSByZXF1aXJlKCcuL3JlbmRlci9hdWRpb3BsYXllci5qcycpXG4gIGNvbnN0IHZpZGVvUGxheWVyID0gcmVxdWlyZSgnLi9yZW5kZXIvdmlkZW9wbGF5ZXIuanMnKVxuXG4gIGNvbnN0IHBhZ2VVdGlscyA9IHJlcXVpcmUoJy4vdXRpbHMvcGFnZS11dGlscy5qcycpXG5cbi8qXG4gKiAgR2xvYmFsc1xuKi9cblxuICBjb25zdCBQUk9QRVJUSUVTID0gWyd0cmFuc2xhdGVYJywgJ3RyYW5zbGF0ZVknLCAnb3BhY2l0eScsICdyb3RhdGUnLCAnc2NhbGUnXVxuICBjb25zdCBBTklNQVRJT05fVElNRSA9IDQxXG5cbiAgY29uc3QgJHdpbmRvdyA9ICQod2luZG93KVxuICBjb25zdCAkYm9keWh0bWwgPSAkKCdib2R5LGh0bWwnKVxuXG4vKlxuICogIEluaXRpYWxpemVcbiovXG5cbiAgY29uc3Qgc3RhdGVJbml0aWFsaXplZCA9IG5ldyBLZWZpci5wb29sKClcblxuICBjb25zdCBJTklUX1NUQVRFID0ge1xuICAgIHdyYXBwZXJzOiBbXSxcbiAgICBjdXJyZW50V3JhcHBlcjogbnVsbCxcblxuICAgIHNjcm9sbFRvcDogJHdpbmRvdy5zY3JvbGxUb3AoKSxcbiAgICByZWxhdGl2ZVNjcm9sbFRvcDogMCxcblxuICAgIGtleWZyYW1lczogdW5kZWZpbmVkLFxuICAgIHByZXZLZXlmcmFtZXNEdXJhdGlvbnM6IDAsXG4gICAgY3VycmVudEtleWZyYW1lOiAwLFxuXG4gICAgZnJhbWVGb2N1czogW10sXG4gICAgY3VycmVudEZvY3VzOiAwLFxuICAgIGN1cnJlbnRGcmFtZTogWzBdLFxuXG4gICAgc2Nyb2xsVGltZW91dElEOiAwLFxuXG4gICAgYm9keUhlaWdodDogMCxcbiAgICB3aW5kb3dIZWlnaHQ6IDAsXG4gICAgd2luZG93V2lkdGg6IDBcbiAgfVxuXG4gIGNvbnN0IGluaXRTdGF0ZSA9IEtlZmlyLnN0cmVhbShlbWl0dGVyID0+IHtcbiAgICBlbWl0dGVyLmVtaXQoSU5JVF9TVEFURSlcbiAgfSlcblxuICBtb2R1bGUuZXhwb3J0cy5pbml0ID0gKGtleWZyYW1lcykgPT4ge1xuXG4gICAgY29uc3Qga2V5RnJhbWVzUmV0cmVpdmVkID0gS2VmaXIuc3RyZWFtKGVtaXR0ZXIgPT4ge1xuICAgICAgZW1pdHRlci5lbWl0KGtleWZyYW1lcylcbiAgICB9KVxuXG4gICAgY29uc3Qga2V5RnJhbWVzTWFwcGVkVG9TdGF0ZSA9IGtleUZyYW1lc1JldHJlaXZlZFxuICAgICAgLmZsYXRNYXAoa2V5ZnJhbWVzID0+IHtcbiAgICAgICAgcmV0dXJuIGluaXRTdGF0ZS5tYXAoc3RhdGUgPT4ge1xuICAgICAgICAgIHN0YXRlLmtleWZyYW1lcyA9IGtleWZyYW1lc1xuICAgICAgICAgIHJldHVybiBzdGF0ZVxuICAgICAgICB9KVxuICAgICAgfSlcbiAgICAgIC5tYXAoc3RhdGUgPT4ge1xuICAgICAgICBzdGF0ZS5jdXJyZW50V3JhcHBlciA9IHN0YXRlLndyYXBwZXJzWzBdXG4gICAgICAgIHN0YXRlLnNjcm9sbFRvcCA9IDBcbiAgICAgICAgcmV0dXJuIHN0YXRlXG4gICAgICB9KVxuXG4gICAgc3RhdGVJbml0aWFsaXplZC5wbHVnKGtleUZyYW1lc01hcHBlZFRvU3RhdGUpXG5cbiAgfVxuXG4vKlxuICogIEJ1aWxkIFBhZ2VcbiovXG5cbiAgY29uc3Qgd2luZG93UmVzaXplZCA9IHN0YXRlSW5pdGlhbGl6ZWRcbiAgICAuZmxhdE1hcCgocykgPT4ge1xuICAgICAgcmV0dXJuIEtlZmlyLmZyb21FdmVudHMoJHdpbmRvdywgJ3Jlc2l6ZScsICgpID0+IHtyZXR1cm4gc30gKVxuICAgIH0pXG4gICAgLnRocm90dGxlKEFOSU1BVElPTl9USU1FKVxuXG4gIGNvbnN0IGRpbWVuc2lvbnNDYWxjdWxhdGVkID0gS2VmaXIubWVyZ2UoW3N0YXRlSW5pdGlhbGl6ZWQsIHdpbmRvd1Jlc2l6ZWRdKVxuICAgIC5tYXAoY2FsY3VsYXRlRGltZW5zaW9ucylcbiAgICAubWFwKGNhbGN1bGF0ZUtleUZyYW1lcylcbiAgICAubWFwKGNhbGN1bGF0ZUV4dHJhcylcbiAgICAubWFwKHN0YXRlID0+IHtcbiAgICAgIHN0YXRlLmN1cnJlbnRXcmFwcGVyID0gc3RhdGUud3JhcHBlcnNbMF1cbiAgICAgIHJldHVybiBzdGF0ZVxuICAgIH0pXG5cbiAgICAgIGZ1bmN0aW9uIGNhbGN1bGF0ZURpbWVuc2lvbnMoc3RhdGUpIHtcbiAgICAgICAgc3RhdGUuc2Nyb2xsVG9wID0gTWF0aC5mbG9vcigkd2luZG93LnNjcm9sbFRvcCgpKVxuICAgICAgICBzdGF0ZS53aW5kb3dIZWlnaHQgPSAkd2luZG93LmhlaWdodCgpXG4gICAgICAgIHN0YXRlLndpbmRvd1dpZHRoID0gJHdpbmRvdy53aWR0aCgpXG4gICAgICAgIHJldHVybiBzdGF0ZVxuICAgICAgfVxuXG4gICAgICBmdW5jdGlvbiBjYWxjdWxhdGVLZXlGcmFtZXMoc3RhdGUpIHtcbiAgICAgICAgc3RhdGUua2V5ZnJhbWVzID0gcGFnZVV0aWxzLmNvbnZlcnRBbGxQcm9wc1RvUHgoc3RhdGUua2V5ZnJhbWVzLCBzdGF0ZS53aW5kb3dXaWR0aCwgc3RhdGUud2luZG93SGVpZ2h0KVxuICAgICAgICByZXR1cm4gc3RhdGVcbiAgICAgIH1cblxuICAgICAgZnVuY3Rpb24gY2FsY3VsYXRlRXh0cmFzKHN0YXRlKSB7XG4gICAgICAgIGxldCBwYWdlSW5mbyA9IHBhZ2VVdGlscy5idWlsZFBhZ2Uoc3RhdGUua2V5ZnJhbWVzLCBzdGF0ZS53cmFwcGVycylcblxuICAgICAgICBzdGF0ZS5ib2R5SGVpZ2h0ID0gcGFnZUluZm8uYm9keUhlaWdodFxuICAgICAgICBzdGF0ZS53cmFwcGVycyA9IHBhZ2VJbmZvLndyYXBwZXJzXG4gICAgICAgIHN0YXRlLmZyYW1lRm9jdXMgPSBwYWdlSW5mby5mcmFtZUZvY3VzXG4gICAgICAgICAgLm1hcChpID0+IE1hdGguZmxvb3IoaSkpXG4gICAgICAgICAgLnJlZHVjZSgoYSwgYikgPT4geyAvLyBjbGVhcnMgYW55IGZyYW1lIGR1cGxpY2F0ZXMuIFRPRE86IGZpbmQgYnVnIHRoYXQgbWFrZXMgZnJhbWUgZHVwbGljYXRlc1xuICAgICAgICAgICAgaWYgKGEuaW5kZXhPZihiKSA8IDApIGEucHVzaChiKVxuICAgICAgICAgICAgcmV0dXJuIGFcbiAgICAgICAgICB9LCBbXSlcblxuICAgICAgICByZXR1cm4gc3RhdGVcbiAgICAgIH1cblxuICBtb2R1bGUuZXhwb3J0cy5kaW1lbnNpb25zQ2FsY3VsYXRlZCA9IGRpbWVuc2lvbnNDYWxjdWxhdGVkXG5cbi8qXG4gKiAgUG9zaXRpb24gbW92ZWRcbiovXG5cbiAgY29uc3Qgd2luZG93U2Nyb2xsZWQgPSBLZWZpci5mcm9tRXZlbnRzKCR3aW5kb3csICdzY3JvbGwnKVxuICAgIC50aHJvdHRsZShBTklNQVRJT05fVElNRSlcblxuICBjb25zdCBzb21ldGhpbmdNb3ZlZCA9IEtlZmlyLmZyb21FdmVudHMod2luZG93LCAnUE9TSVRJT05fQ0hBTkdFRCcpXG5cbiAgY29uc3QgZXZlbnRzSGFwcGVuZWQgPSBkaW1lbnNpb25zQ2FsY3VsYXRlZFxuICAgIC5mbGF0TWFwKHN0YXRlID0+IHtcbiAgICAgIHJldHVybiBLZWZpci5tZXJnZShbd2luZG93U2Nyb2xsZWQsIHNvbWV0aGluZ01vdmVkXSlcbiAgICAgICAgICAgICAgLm1hcChlID0+IHtcbiAgICAgICAgICAgICAgICBzdGF0ZS5jaGFuZ2VkID0gZVxuICAgICAgICAgICAgICAgIHJldHVybiBzdGF0ZVxuICAgICAgICAgICAgICB9KVxuICAgIH0pXG5cbiAgY29uc3QgcG9zaXRpb25DaGFuZ2VkID0gS2VmaXJcbiAgICAubWVyZ2UoW2RpbWVuc2lvbnNDYWxjdWxhdGVkLCBldmVudHNIYXBwZW5lZF0pXG5cbi8qXG4gKiAgU3RhdGUgQ2hhbmdlZFxuKi9cblxuICAvLyBDYWxjdWxhdGUgY3VycmVudCBzdGF0ZVxuICBjb25zdCBjYWxjdWxhdGVkQ3VycmVudFN0YXRlID0gS2VmaXJcbiAgICAubWVyZ2UoW2RpbWVuc2lvbnNDYWxjdWxhdGVkLCBwb3NpdGlvbkNoYW5nZWRdKVxuICAgIC5tYXAoc2V0VG9wcylcbiAgICAubWFwKHNldEtleWZyYW1lKVxuICAgIC5tYXAoZ2V0U2xpZGVMb2NhdGlvbilcbiAgICAubWFwKHN0YXRlID0+IHtcbiAgICAgIHN0YXRlLmN1cnJlbnRXcmFwcGVyID0gc3RhdGUua2V5ZnJhbWVzW3N0YXRlLmN1cnJlbnRLZXlmcmFtZV0ud3JhcHBlclxuICAgICAgcmV0dXJuIHN0YXRlXG4gICAgfSlcblxuICAgICAgZnVuY3Rpb24gc2V0VG9wcyhzdGF0ZSkge1xuICAgICAgICBzdGF0ZS5zY3JvbGxUb3AgPSBNYXRoLmZsb29yKCR3aW5kb3cuc2Nyb2xsVG9wKCkpXG4gICAgICAgIHN0YXRlLnJlbGF0aXZlU2Nyb2xsVG9wID0gc3RhdGUuc2Nyb2xsVG9wIC0gc3RhdGUucHJldktleWZyYW1lc0R1cmF0aW9uc1xuICAgICAgICByZXR1cm4gc3RhdGVcbiAgICAgIH1cblxuICAgICAgZnVuY3Rpb24gc2V0S2V5ZnJhbWUoc3RhdGUpIHtcbiAgICAgICAgaWYoc3RhdGUuc2Nyb2xsVG9wID4gKHN0YXRlLmtleWZyYW1lc1tzdGF0ZS5jdXJyZW50S2V5ZnJhbWVdLmR1cmF0aW9uICsgc3RhdGUucHJldktleWZyYW1lc0R1cmF0aW9ucykpIHtcbiAgICAgICAgICAgIHN0YXRlLnByZXZLZXlmcmFtZXNEdXJhdGlvbnMgKz0gc3RhdGUua2V5ZnJhbWVzW3N0YXRlLmN1cnJlbnRLZXlmcmFtZV0uZHVyYXRpb25cbiAgICAgICAgICAgIHN0YXRlLmN1cnJlbnRLZXlmcmFtZSsrXG4gICAgICAgIH0gZWxzZSBpZihzdGF0ZS5zY3JvbGxUb3AgPCBzdGF0ZS5wcmV2S2V5ZnJhbWVzRHVyYXRpb25zKSB7XG4gICAgICAgICAgICBzdGF0ZS5jdXJyZW50S2V5ZnJhbWUtLVxuICAgICAgICAgICAgc3RhdGUucHJldktleWZyYW1lc0R1cmF0aW9ucyAtPSBzdGF0ZS5rZXlmcmFtZXNbc3RhdGUuY3VycmVudEtleWZyYW1lXS5kdXJhdGlvblxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzdGF0ZVxuICAgICAgfVxuXG4gICAgICBmdW5jdGlvbiBnZXRTbGlkZUxvY2F0aW9uKHN0YXRlKSB7XG4gICAgICAgIGZvciAobGV0IHggPSAxOyB4IDw9IHN0YXRlLmZyYW1lRm9jdXMubGVuZ3RoOyB4KyspIHtcbiAgICAgICAgICBpZiAoc3RhdGUuZnJhbWVGb2N1c1t4XSA9PT0gc3RhdGUuc2Nyb2xsVG9wKSB7XG4gICAgICAgICAgICBzdGF0ZS5jdXJyZW50RnJhbWUgPSBbeF1cbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHN0YXRlLnNjcm9sbFRvcC5iZXR3ZWVuKHN0YXRlLmZyYW1lRm9jdXNbeCAtIDFdLCBzdGF0ZS5mcmFtZUZvY3VzW3hdKSkge1xuICAgICAgICAgICAgc3RhdGUuY3VycmVudEZyYW1lID0gW3ggLSAxLCB4XVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc3RhdGVcbiAgICAgIH1cblxuICBjb25zdCB3cmFwcGVyQ2hhbmdlZCA9IGNhbGN1bGF0ZWRDdXJyZW50U3RhdGVcbiAgICAubWFwKHN0YXRlID0+IHN0YXRlLmN1cnJlbnRXcmFwcGVyKVxuICAgIC5kaWZmKG51bGwsICcnKVxuICAgIC5maWx0ZXIoY3VycmVudFdyYXBwZXIgPT4gY3VycmVudFdyYXBwZXJbMF0gIT09IGN1cnJlbnRXcmFwcGVyWzFdKVxuICAgIC8vIC5kZWxheShBTklNQVRJT05fVElNRSoyKSAvLyBUbyB3YWl0IGZvciBmaXJzdCBhbmltYXRpb24gZnJhbWUgdG8gc3RhcnQgYmVmb3JlIHN3aXRjaGluZ1xuXG4gIG1vZHVsZS5leHBvcnRzLndyYXBwZXJDaGFuZ2VkID0gd3JhcHBlckNoYW5nZWQ7XG5cbiAgY29uc3Qgc2Nyb2xsVG9wQ2hhbmdlZCA9IGNhbGN1bGF0ZWRDdXJyZW50U3RhdGVcbiAgICAuZGlmZihudWxsICwgeyAvLyBIYWNrLCBmb3Igc29tZSByZWFzb24gSU5JVF9TVEFURSBpc24ndCBjb21pbmcgaW4gcHJvcGVybHlcbiAgICAgIHdyYXBwZXJzOiBbXSxcbiAgICAgIGN1cnJlbnRXcmFwcGVyOiB1bmRlZmluZWQsXG5cbiAgICAgIHNjcm9sbFRvcDogMCxcbiAgICAgIHJlbGF0aXZlU2Nyb2xsVG9wOiAwLFxuXG4gICAgICBrZXlmcmFtZXM6IHVuZGVmaW5lZCxcbiAgICAgIHByZXZLZXlmcmFtZXNEdXJhdGlvbnM6IDAsXG4gICAgICBjdXJyZW50S2V5ZnJhbWU6IDAsXG5cbiAgICAgIGZyYW1lRm9jdXM6IFtdLFxuICAgICAgY3VycmVudEZvY3VzOiAwLFxuICAgICAgY3VycmVudEludGVydmFsOiAwLFxuXG4gICAgICBzY3JvbGxUaW1lb3V0SUQ6IDAsXG5cbiAgICAgIGJvZHlIZWlnaHQ6IDAsXG4gICAgICB3aW5kb3dIZWlnaHQ6IDAsXG4gICAgICB3aW5kb3dXaWR0aDogMFxuICAgIH0pXG5cbiAgbW9kdWxlLmV4cG9ydHMuc2Nyb2xsVG9wQ2hhbmdlZCA9IHNjcm9sbFRvcENoYW5nZWRcbiAgLy8gc2Nyb2xsVG9wQ2hhbmdlZC5sb2coKVxuXG4vKlxuICogIEFjdGlvbnNcbiovXG5cbiAgbW9kdWxlLmV4cG9ydHMuZ2V0ID0gKCkgPT4ge1xuICAgIHJldHVybiBzdGF0ZVxuICB9XG5cbiAgbW9kdWxlLmV4cG9ydHMuYWN0aW9uID0gKGFjdGlvbikgPT4ge1xuICAgIHN3aXRjaCAoYWN0aW9uKSB7XG4gICAgICBjYXNlICduZXh0JzpcbiAgICAgICAgJHdpbmRvdy50cmlnZ2VyKCdGT0NVU19ORVhUJylcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgJ3ByZXZpb3VzJzpcbiAgICAgICAgJHdpbmRvdy50cmlnZ2VyKCdGT0NVU19QUkVWSU9VUycpXG4gICAgICAgIGJyZWFrXG4gICAgICBkZWZhdWx0OlxuICAgICAgICBicmVha1xuICAgIH1cbiAgfVxuXG4gIGNvbnN0IGFjdGlvbl9mb2N1c05leHQgPSBzY3JvbGxUb3BDaGFuZ2VkXG4gICAgICAuZmxhdE1hcEZpcnN0KChzdGF0ZSkgPT4ge1xuICAgICAgICByZXR1cm4gS2VmaXIuZnJvbUV2ZW50cygkd2luZG93LCAnRk9DVVNfTkVYVCcsICgpID0+IHN0YXRlKVxuICAgICAgfSlcbiAgICAgIC5tYXAoc3RhdGUgPT4gc3RhdGVbMV0pXG4gICAgICAubWFwKG5leHRGb2N1cylcblxuICBjb25zdCBhY3Rpb25fZm9jdXNQcmV2aW91cyA9IHNjcm9sbFRvcENoYW5nZWRcbiAgICAgIC5mbGF0TWFwRmlyc3QoKHN0YXRlKSA9PiB7XG4gICAgICAgIHJldHVybiBLZWZpci5mcm9tRXZlbnRzKCR3aW5kb3csICdGT0NVU19QUkVWSU9VUycsICgpID0+IHN0YXRlKVxuICAgICAgfSlcbiAgICAgIC5tYXAoc3RhdGUgPT4gc3RhdGVbMV0pXG4gICAgICAubWFwKHByZXZpb3VzRm9jdXMpXG5cbiAgICBmdW5jdGlvbiBuZXh0Rm9jdXMoc3RhdGUpIHtcbiAgICAgIHN3aXRjaChzdGF0ZS5jdXJyZW50RnJhbWUubGVuZ3RoKSB7XG4gICAgICAgIGNhc2UgMTpcbiAgICAgICAgICByZXR1cm4gc3RhdGUuZnJhbWVGb2N1c1tzdGF0ZS5jdXJyZW50RnJhbWVbMF0gKyAxXVxuICAgICAgICBjYXNlIDI6XG4gICAgICAgICAgcmV0dXJuIHN0YXRlLmZyYW1lRm9jdXNbc3RhdGUuY3VycmVudEZyYW1lWzFdXVxuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgIHJldHVybiBmYWxzZVxuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHByZXZpb3VzRm9jdXMoc3RhdGUpIHtcbiAgICAgIHN3aXRjaChzdGF0ZS5jdXJyZW50RnJhbWUubGVuZ3RoKSB7XG4gICAgICAgIGNhc2UgMTpcbiAgICAgICAgICByZXR1cm4gc3RhdGUuZnJhbWVGb2N1c1tzdGF0ZS5jdXJyZW50RnJhbWVbMF0gLSAxXVxuICAgICAgICBjYXNlIDI6XG4gICAgICAgICAgcmV0dXJuIHN0YXRlLmZyYW1lRm9jdXNbc3RhdGUuY3VycmVudEZyYW1lWzBdXVxuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgIHJldHVybiBmYWxzZVxuICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IGZvY3VzQ2hhbmdlZCA9IEtlZmlyLm1lcmdlKFthY3Rpb25fZm9jdXNQcmV2aW91cywgYWN0aW9uX2ZvY3VzTmV4dF0pXG4gICAgICAub25WYWx1ZShyZW5kZXJTY3JvbGwpXG5cbiAgICBmb2N1c0NoYW5nZWQubG9nKCk7XG4gICAgZnVuY3Rpb24gcmVuZGVyU2Nyb2xsKHNjcm9sbCkge1xuICAgICAgLy8gY29uc29sZS5sb2coXCJSRU5ERVJcIiwgc2Nyb2xsLCBNYXRoLmZsb29yKCR3aW5kb3cuc2Nyb2xsVG9wKCkpKVxuICAgICAgJGJvZHlodG1sLmFuaW1hdGUoe1xuICAgICAgICBzY3JvbGxUb3A6IHNjcm9sbFxuICAgICAgfSwgMTUwMCwgJ2xpbmVhcicpXG4gICAgfVxuXG4gICAgTnVtYmVyLnByb3RvdHlwZS5iZXR3ZWVuID0gZnVuY3Rpb24oYSwgYikge1xuICAgICAgdmFyIG1pbiA9IE1hdGgubWluLmFwcGx5KE1hdGgsIFthLCBiXSksXG4gICAgICAgIG1heCA9IE1hdGgubWF4LmFwcGx5KE1hdGgsIFthLCBiXSlcbiAgICAgIHJldHVybiB0aGlzID4gbWluICYmIHRoaXMgPCBtYXhcbiAgICB9XG5cblxuLypcbiAqICBIZWxwZXJzXG4qL1xuXG4gIGZ1bmN0aW9uIHRocm93RXJyb3IoKSB7XG4gICAgJGJvZHlodG1sLmFkZENsYXNzKCdwYWdlLWVycm9yJylcbiAgfVxuXG4gIGZ1bmN0aW9uIGlzVG91Y2hEZXZpY2UoKSB7XG4gICAgcmV0dXJuICdvbnRvdWNoc3RhcnQnIGluIHdpbmRvdyAvLyB3b3JrcyBvbiBtb3N0IGJyb3dzZXJzXG4gICAgICB8fCAnb25tc2dlc3R1cmVjaGFuZ2UnIGluIHdpbmRvdyAvLyB3b3JrcyBvbiBpZTEwXG4gIH1cblxuXG5cbi8qKiBXRUJQQUNLIEZPT1RFUiAqKlxuICoqIC4vc2NlbmUtbWFrZXIvb2Itc2NlbmUuanNcbiAqKi8iLCIvKiEgS2VmaXIuanMgdjMuMi4wXG4gKiAgaHR0cHM6Ly9naXRodWIuY29tL3Jwb21pbm92L2tlZmlyXG4gKi9cblxuKGZ1bmN0aW9uIHdlYnBhY2tVbml2ZXJzYWxNb2R1bGVEZWZpbml0aW9uKHJvb3QsIGZhY3RvcnkpIHtcblx0aWYodHlwZW9mIGV4cG9ydHMgPT09ICdvYmplY3QnICYmIHR5cGVvZiBtb2R1bGUgPT09ICdvYmplY3QnKVxuXHRcdG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeSgpO1xuXHRlbHNlIGlmKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZClcblx0XHRkZWZpbmUoW10sIGZhY3RvcnkpO1xuXHRlbHNlIGlmKHR5cGVvZiBleHBvcnRzID09PSAnb2JqZWN0Jylcblx0XHRleHBvcnRzW1wiS2VmaXJcIl0gPSBmYWN0b3J5KCk7XG5cdGVsc2Vcblx0XHRyb290W1wiS2VmaXJcIl0gPSBmYWN0b3J5KCk7XG59KSh0aGlzLCBmdW5jdGlvbigpIHtcbnJldHVybiAvKioqKioqLyAoZnVuY3Rpb24obW9kdWxlcykgeyAvLyB3ZWJwYWNrQm9vdHN0cmFwXG4vKioqKioqLyBcdC8vIFRoZSBtb2R1bGUgY2FjaGVcbi8qKioqKiovIFx0dmFyIGluc3RhbGxlZE1vZHVsZXMgPSB7fTtcblxuLyoqKioqKi8gXHQvLyBUaGUgcmVxdWlyZSBmdW5jdGlvblxuLyoqKioqKi8gXHRmdW5jdGlvbiBfX3dlYnBhY2tfcmVxdWlyZV9fKG1vZHVsZUlkKSB7XG5cbi8qKioqKiovIFx0XHQvLyBDaGVjayBpZiBtb2R1bGUgaXMgaW4gY2FjaGVcbi8qKioqKiovIFx0XHRpZihpbnN0YWxsZWRNb2R1bGVzW21vZHVsZUlkXSlcbi8qKioqKiovIFx0XHRcdHJldHVybiBpbnN0YWxsZWRNb2R1bGVzW21vZHVsZUlkXS5leHBvcnRzO1xuXG4vKioqKioqLyBcdFx0Ly8gQ3JlYXRlIGEgbmV3IG1vZHVsZSAoYW5kIHB1dCBpdCBpbnRvIHRoZSBjYWNoZSlcbi8qKioqKiovIFx0XHR2YXIgbW9kdWxlID0gaW5zdGFsbGVkTW9kdWxlc1ttb2R1bGVJZF0gPSB7XG4vKioqKioqLyBcdFx0XHRleHBvcnRzOiB7fSxcbi8qKioqKiovIFx0XHRcdGlkOiBtb2R1bGVJZCxcbi8qKioqKiovIFx0XHRcdGxvYWRlZDogZmFsc2Vcbi8qKioqKiovIFx0XHR9O1xuXG4vKioqKioqLyBcdFx0Ly8gRXhlY3V0ZSB0aGUgbW9kdWxlIGZ1bmN0aW9uXG4vKioqKioqLyBcdFx0bW9kdWxlc1ttb2R1bGVJZF0uY2FsbChtb2R1bGUuZXhwb3J0cywgbW9kdWxlLCBtb2R1bGUuZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXyk7XG5cbi8qKioqKiovIFx0XHQvLyBGbGFnIHRoZSBtb2R1bGUgYXMgbG9hZGVkXG4vKioqKioqLyBcdFx0bW9kdWxlLmxvYWRlZCA9IHRydWU7XG5cbi8qKioqKiovIFx0XHQvLyBSZXR1cm4gdGhlIGV4cG9ydHMgb2YgdGhlIG1vZHVsZVxuLyoqKioqKi8gXHRcdHJldHVybiBtb2R1bGUuZXhwb3J0cztcbi8qKioqKiovIFx0fVxuXG5cbi8qKioqKiovIFx0Ly8gZXhwb3NlIHRoZSBtb2R1bGVzIG9iamVjdCAoX193ZWJwYWNrX21vZHVsZXNfXylcbi8qKioqKiovIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5tID0gbW9kdWxlcztcblxuLyoqKioqKi8gXHQvLyBleHBvc2UgdGhlIG1vZHVsZSBjYWNoZVxuLyoqKioqKi8gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLmMgPSBpbnN0YWxsZWRNb2R1bGVzO1xuXG4vKioqKioqLyBcdC8vIF9fd2VicGFja19wdWJsaWNfcGF0aF9fXG4vKioqKioqLyBcdF9fd2VicGFja19yZXF1aXJlX18ucCA9IFwiXCI7XG5cbi8qKioqKiovIFx0Ly8gTG9hZCBlbnRyeSBtb2R1bGUgYW5kIHJldHVybiBleHBvcnRzXG4vKioqKioqLyBcdHJldHVybiBfX3dlYnBhY2tfcmVxdWlyZV9fKDApO1xuLyoqKioqKi8gfSlcbi8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG4vKioqKioqLyAoW1xuLyogMCAqL1xuLyoqKi8gZnVuY3Rpb24obW9kdWxlLCBleHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKSB7XG5cblx0J3VzZSBzdHJpY3QnO1xuXG5cdHZhciBLZWZpciA9IG1vZHVsZS5leHBvcnRzID0ge307XG5cdEtlZmlyLktlZmlyID0gS2VmaXI7XG5cblx0dmFyIE9ic2VydmFibGUgPSBLZWZpci5PYnNlcnZhYmxlID0gX193ZWJwYWNrX3JlcXVpcmVfXygxKTtcblx0S2VmaXIuU3RyZWFtID0gX193ZWJwYWNrX3JlcXVpcmVfXyg2KTtcblx0S2VmaXIuUHJvcGVydHkgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDcpO1xuXG5cdC8vIENyZWF0ZSBhIHN0cmVhbVxuXHQvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5cdC8vICgpIC0+IFN0cmVhbVxuXHRLZWZpci5uZXZlciA9IF9fd2VicGFja19yZXF1aXJlX18oOCk7XG5cblx0Ly8gKG51bWJlciwgYW55KSAtPiBTdHJlYW1cblx0S2VmaXIubGF0ZXIgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDkpO1xuXG5cdC8vIChudW1iZXIsIGFueSkgLT4gU3RyZWFtXG5cdEtlZmlyLmludGVydmFsID0gX193ZWJwYWNrX3JlcXVpcmVfXygxMSk7XG5cblx0Ly8gKG51bWJlciwgQXJyYXk8YW55PikgLT4gU3RyZWFtXG5cdEtlZmlyLnNlcXVlbnRpYWxseSA9IF9fd2VicGFja19yZXF1aXJlX18oMTIpO1xuXG5cdC8vIChudW1iZXIsIEZ1bmN0aW9uKSAtPiBTdHJlYW1cblx0S2VmaXIuZnJvbVBvbGwgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDEzKTtcblxuXHQvLyAobnVtYmVyLCBGdW5jdGlvbikgLT4gU3RyZWFtXG5cdEtlZmlyLndpdGhJbnRlcnZhbCA9IF9fd2VicGFja19yZXF1aXJlX18oMTQpO1xuXG5cdC8vIChGdW5jdGlvbikgLT4gU3RyZWFtXG5cdEtlZmlyLmZyb21DYWxsYmFjayA9IF9fd2VicGFja19yZXF1aXJlX18oMTYpO1xuXG5cdC8vIChGdW5jdGlvbikgLT4gU3RyZWFtXG5cdEtlZmlyLmZyb21Ob2RlQ2FsbGJhY2sgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDE4KTtcblxuXHQvLyBUYXJnZXQgPSB7YWRkRXZlbnRMaXN0ZW5lciwgcmVtb3ZlRXZlbnRMaXN0ZW5lcn18e2FkZExpc3RlbmVyLCByZW1vdmVMaXN0ZW5lcn18e29uLCBvZmZ9XG5cdC8vIChUYXJnZXQsIHN0cmluZywgRnVuY3Rpb258dW5kZWZpbmVkKSAtPiBTdHJlYW1cblx0S2VmaXIuZnJvbUV2ZW50cyA9IF9fd2VicGFja19yZXF1aXJlX18oMTkpO1xuXG5cdC8vIChGdW5jdGlvbikgLT4gU3RyZWFtXG5cdEtlZmlyLnN0cmVhbSA9IF9fd2VicGFja19yZXF1aXJlX18oMTcpO1xuXG5cdC8vIENyZWF0ZSBhIHByb3BlcnR5XG5cdC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cblx0Ly8gKGFueSkgLT4gUHJvcGVydHlcblx0S2VmaXIuY29uc3RhbnQgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDIyKTtcblxuXHQvLyAoYW55KSAtPiBQcm9wZXJ0eVxuXHRLZWZpci5jb25zdGFudEVycm9yID0gX193ZWJwYWNrX3JlcXVpcmVfXygyMyk7XG5cblx0Ly8gQ29udmVydCBvYnNlcnZhYmxlc1xuXHQvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5cdC8vIChTdHJlYW18UHJvcGVydHksIEZ1bmN0aW9ufHVuZGVmaW5lZCkgLT4gUHJvcGVydHlcblx0dmFyIHRvUHJvcGVydHkgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDI0KTtcblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUudG9Qcm9wZXJ0eSA9IGZ1bmN0aW9uIChmbikge1xuXHQgIHJldHVybiB0b1Byb3BlcnR5KHRoaXMsIGZuKTtcblx0fTtcblxuXHQvLyAoU3RyZWFtfFByb3BlcnR5KSAtPiBTdHJlYW1cblx0dmFyIGNoYW5nZXMgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDI2KTtcblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUuY2hhbmdlcyA9IGZ1bmN0aW9uICgpIHtcblx0ICByZXR1cm4gY2hhbmdlcyh0aGlzKTtcblx0fTtcblxuXHQvLyBJbnRlcm9wZXJhdGlvbiB3aXRoIG90aGVyIGltcGxpbWVudGF0aW9uc1xuXHQvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5cdC8vIChQcm9taXNlKSAtPiBQcm9wZXJ0eVxuXHRLZWZpci5mcm9tUHJvbWlzZSA9IF9fd2VicGFja19yZXF1aXJlX18oMjcpO1xuXG5cdC8vIChTdHJlYW18UHJvcGVydHksIEZ1bmN0aW9ufHVuZGVmaW5lZCkgLT4gUHJvbWlzZVxuXHR2YXIgdG9Qcm9taXNlID0gX193ZWJwYWNrX3JlcXVpcmVfXygyOCk7XG5cdE9ic2VydmFibGUucHJvdG90eXBlLnRvUHJvbWlzZSA9IGZ1bmN0aW9uIChQcm9taXNlKSB7XG5cdCAgcmV0dXJuIHRvUHJvbWlzZSh0aGlzLCBQcm9taXNlKTtcblx0fTtcblxuXHQvLyAoRVNPYnNlcnZhYmxlKSAtPiBTdHJlYW1cblx0S2VmaXIuZnJvbUVTT2JzZXJ2YWJsZSA9IF9fd2VicGFja19yZXF1aXJlX18oMjkpO1xuXG5cdC8vIChTdHJlYW18UHJvcGVydHkpIC0+IEVTNyBPYnNlcnZhYmxlXG5cdHZhciB0b0VTT2JzZXJ2YWJsZSA9IF9fd2VicGFja19yZXF1aXJlX18oMzEpO1xuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS50b0VTT2JzZXJ2YWJsZSA9IHRvRVNPYnNlcnZhYmxlO1xuXHRPYnNlcnZhYmxlLnByb3RvdHlwZVtfX3dlYnBhY2tfcmVxdWlyZV9fKDMwKSgnb2JzZXJ2YWJsZScpXSA9IHRvRVNPYnNlcnZhYmxlO1xuXG5cdC8vIE1vZGlmeSBhbiBvYnNlcnZhYmxlXG5cdC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cblx0Ly8gKFN0cmVhbSwgRnVuY3Rpb258dW5kZWZpbmVkKSAtPiBTdHJlYW1cblx0Ly8gKFByb3BlcnR5LCBGdW5jdGlvbnx1bmRlZmluZWQpIC0+IFByb3BlcnR5XG5cdHZhciBtYXAgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDMyKTtcblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUubWFwID0gZnVuY3Rpb24gKGZuKSB7XG5cdCAgcmV0dXJuIG1hcCh0aGlzLCBmbik7XG5cdH07XG5cblx0Ly8gKFN0cmVhbSwgRnVuY3Rpb258dW5kZWZpbmVkKSAtPiBTdHJlYW1cblx0Ly8gKFByb3BlcnR5LCBGdW5jdGlvbnx1bmRlZmluZWQpIC0+IFByb3BlcnR5XG5cdHZhciBmaWx0ZXIgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDMzKTtcblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUuZmlsdGVyID0gZnVuY3Rpb24gKGZuKSB7XG5cdCAgcmV0dXJuIGZpbHRlcih0aGlzLCBmbik7XG5cdH07XG5cblx0Ly8gKFN0cmVhbSwgbnVtYmVyKSAtPiBTdHJlYW1cblx0Ly8gKFByb3BlcnR5LCBudW1iZXIpIC0+IFByb3BlcnR5XG5cdHZhciB0YWtlID0gX193ZWJwYWNrX3JlcXVpcmVfXygzNCk7XG5cdE9ic2VydmFibGUucHJvdG90eXBlLnRha2UgPSBmdW5jdGlvbiAobikge1xuXHQgIHJldHVybiB0YWtlKHRoaXMsIG4pO1xuXHR9O1xuXG5cdC8vIChTdHJlYW0sIG51bWJlcikgLT4gU3RyZWFtXG5cdC8vIChQcm9wZXJ0eSwgbnVtYmVyKSAtPiBQcm9wZXJ0eVxuXHR2YXIgdGFrZUVycm9ycyA9IF9fd2VicGFja19yZXF1aXJlX18oMzUpO1xuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS50YWtlRXJyb3JzID0gZnVuY3Rpb24gKG4pIHtcblx0ICByZXR1cm4gdGFrZUVycm9ycyh0aGlzLCBuKTtcblx0fTtcblxuXHQvLyAoU3RyZWFtLCBGdW5jdGlvbnx1bmRlZmluZWQpIC0+IFN0cmVhbVxuXHQvLyAoUHJvcGVydHksIEZ1bmN0aW9ufHVuZGVmaW5lZCkgLT4gUHJvcGVydHlcblx0dmFyIHRha2VXaGlsZSA9IF9fd2VicGFja19yZXF1aXJlX18oMzYpO1xuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS50YWtlV2hpbGUgPSBmdW5jdGlvbiAoZm4pIHtcblx0ICByZXR1cm4gdGFrZVdoaWxlKHRoaXMsIGZuKTtcblx0fTtcblxuXHQvLyAoU3RyZWFtKSAtPiBTdHJlYW1cblx0Ly8gKFByb3BlcnR5KSAtPiBQcm9wZXJ0eVxuXHR2YXIgbGFzdCA9IF9fd2VicGFja19yZXF1aXJlX18oMzcpO1xuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS5sYXN0ID0gZnVuY3Rpb24gKCkge1xuXHQgIHJldHVybiBsYXN0KHRoaXMpO1xuXHR9O1xuXG5cdC8vIChTdHJlYW0sIG51bWJlcikgLT4gU3RyZWFtXG5cdC8vIChQcm9wZXJ0eSwgbnVtYmVyKSAtPiBQcm9wZXJ0eVxuXHR2YXIgc2tpcCA9IF9fd2VicGFja19yZXF1aXJlX18oMzgpO1xuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS5za2lwID0gZnVuY3Rpb24gKG4pIHtcblx0ICByZXR1cm4gc2tpcCh0aGlzLCBuKTtcblx0fTtcblxuXHQvLyAoU3RyZWFtLCBGdW5jdGlvbnx1bmRlZmluZWQpIC0+IFN0cmVhbVxuXHQvLyAoUHJvcGVydHksIEZ1bmN0aW9ufHVuZGVmaW5lZCkgLT4gUHJvcGVydHlcblx0dmFyIHNraXBXaGlsZSA9IF9fd2VicGFja19yZXF1aXJlX18oMzkpO1xuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS5za2lwV2hpbGUgPSBmdW5jdGlvbiAoZm4pIHtcblx0ICByZXR1cm4gc2tpcFdoaWxlKHRoaXMsIGZuKTtcblx0fTtcblxuXHQvLyAoU3RyZWFtLCBGdW5jdGlvbnx1bmRlZmluZWQpIC0+IFN0cmVhbVxuXHQvLyAoUHJvcGVydHksIEZ1bmN0aW9ufHVuZGVmaW5lZCkgLT4gUHJvcGVydHlcblx0dmFyIHNraXBEdXBsaWNhdGVzID0gX193ZWJwYWNrX3JlcXVpcmVfXyg0MCk7XG5cdE9ic2VydmFibGUucHJvdG90eXBlLnNraXBEdXBsaWNhdGVzID0gZnVuY3Rpb24gKGZuKSB7XG5cdCAgcmV0dXJuIHNraXBEdXBsaWNhdGVzKHRoaXMsIGZuKTtcblx0fTtcblxuXHQvLyAoU3RyZWFtLCBGdW5jdGlvbnxmYWxzZXksIGFueXx1bmRlZmluZWQpIC0+IFN0cmVhbVxuXHQvLyAoUHJvcGVydHksIEZ1bmN0aW9ufGZhbHNleSwgYW55fHVuZGVmaW5lZCkgLT4gUHJvcGVydHlcblx0dmFyIGRpZmYgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDQxKTtcblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUuZGlmZiA9IGZ1bmN0aW9uIChmbiwgc2VlZCkge1xuXHQgIHJldHVybiBkaWZmKHRoaXMsIGZuLCBzZWVkKTtcblx0fTtcblxuXHQvLyAoU3RyZWFtfFByb3BlcnR5LCBGdW5jdGlvbiwgYW55fHVuZGVmaW5lZCkgLT4gUHJvcGVydHlcblx0dmFyIHNjYW4gPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDQyKTtcblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUuc2NhbiA9IGZ1bmN0aW9uIChmbiwgc2VlZCkge1xuXHQgIHJldHVybiBzY2FuKHRoaXMsIGZuLCBzZWVkKTtcblx0fTtcblxuXHQvLyAoU3RyZWFtLCBGdW5jdGlvbnx1bmRlZmluZWQpIC0+IFN0cmVhbVxuXHQvLyAoUHJvcGVydHksIEZ1bmN0aW9ufHVuZGVmaW5lZCkgLT4gUHJvcGVydHlcblx0dmFyIGZsYXR0ZW4gPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDQzKTtcblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUuZmxhdHRlbiA9IGZ1bmN0aW9uIChmbikge1xuXHQgIHJldHVybiBmbGF0dGVuKHRoaXMsIGZuKTtcblx0fTtcblxuXHQvLyAoU3RyZWFtLCBudW1iZXIpIC0+IFN0cmVhbVxuXHQvLyAoUHJvcGVydHksIG51bWJlcikgLT4gUHJvcGVydHlcblx0dmFyIGRlbGF5ID0gX193ZWJwYWNrX3JlcXVpcmVfXyg0NCk7XG5cdE9ic2VydmFibGUucHJvdG90eXBlLmRlbGF5ID0gZnVuY3Rpb24gKHdhaXQpIHtcblx0ICByZXR1cm4gZGVsYXkodGhpcywgd2FpdCk7XG5cdH07XG5cblx0Ly8gT3B0aW9ucyA9IHtsZWFkaW5nOiBib29sZWFufHVuZGVmaW5lZCwgdHJhaWxpbmc6IGJvb2xlYW58dW5kZWZpbmVkfVxuXHQvLyAoU3RyZWFtLCBudW1iZXIsIE9wdGlvbnN8dW5kZWZpbmVkKSAtPiBTdHJlYW1cblx0Ly8gKFByb3BlcnR5LCBudW1iZXIsIE9wdGlvbnN8dW5kZWZpbmVkKSAtPiBQcm9wZXJ0eVxuXHR2YXIgdGhyb3R0bGUgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDQ1KTtcblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUudGhyb3R0bGUgPSBmdW5jdGlvbiAod2FpdCwgb3B0aW9ucykge1xuXHQgIHJldHVybiB0aHJvdHRsZSh0aGlzLCB3YWl0LCBvcHRpb25zKTtcblx0fTtcblxuXHQvLyBPcHRpb25zID0ge2ltbWVkaWF0ZTogYm9vbGVhbnx1bmRlZmluZWR9XG5cdC8vIChTdHJlYW0sIG51bWJlciwgT3B0aW9uc3x1bmRlZmluZWQpIC0+IFN0cmVhbVxuXHQvLyAoUHJvcGVydHksIG51bWJlciwgT3B0aW9uc3x1bmRlZmluZWQpIC0+IFByb3BlcnR5XG5cdHZhciBkZWJvdW5jZSA9IF9fd2VicGFja19yZXF1aXJlX18oNDcpO1xuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS5kZWJvdW5jZSA9IGZ1bmN0aW9uICh3YWl0LCBvcHRpb25zKSB7XG5cdCAgcmV0dXJuIGRlYm91bmNlKHRoaXMsIHdhaXQsIG9wdGlvbnMpO1xuXHR9O1xuXG5cdC8vIChTdHJlYW0sIEZ1bmN0aW9ufHVuZGVmaW5lZCkgLT4gU3RyZWFtXG5cdC8vIChQcm9wZXJ0eSwgRnVuY3Rpb258dW5kZWZpbmVkKSAtPiBQcm9wZXJ0eVxuXHR2YXIgbWFwRXJyb3JzID0gX193ZWJwYWNrX3JlcXVpcmVfXyg0OCk7XG5cdE9ic2VydmFibGUucHJvdG90eXBlLm1hcEVycm9ycyA9IGZ1bmN0aW9uIChmbikge1xuXHQgIHJldHVybiBtYXBFcnJvcnModGhpcywgZm4pO1xuXHR9O1xuXG5cdC8vIChTdHJlYW0sIEZ1bmN0aW9ufHVuZGVmaW5lZCkgLT4gU3RyZWFtXG5cdC8vIChQcm9wZXJ0eSwgRnVuY3Rpb258dW5kZWZpbmVkKSAtPiBQcm9wZXJ0eVxuXHR2YXIgZmlsdGVyRXJyb3JzID0gX193ZWJwYWNrX3JlcXVpcmVfXyg0OSk7XG5cdE9ic2VydmFibGUucHJvdG90eXBlLmZpbHRlckVycm9ycyA9IGZ1bmN0aW9uIChmbikge1xuXHQgIHJldHVybiBmaWx0ZXJFcnJvcnModGhpcywgZm4pO1xuXHR9O1xuXG5cdC8vIChTdHJlYW0pIC0+IFN0cmVhbVxuXHQvLyAoUHJvcGVydHkpIC0+IFByb3BlcnR5XG5cdHZhciBpZ25vcmVWYWx1ZXMgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDUwKTtcblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUuaWdub3JlVmFsdWVzID0gZnVuY3Rpb24gKCkge1xuXHQgIHJldHVybiBpZ25vcmVWYWx1ZXModGhpcyk7XG5cdH07XG5cblx0Ly8gKFN0cmVhbSkgLT4gU3RyZWFtXG5cdC8vIChQcm9wZXJ0eSkgLT4gUHJvcGVydHlcblx0dmFyIGlnbm9yZUVycm9ycyA9IF9fd2VicGFja19yZXF1aXJlX18oNTEpO1xuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS5pZ25vcmVFcnJvcnMgPSBmdW5jdGlvbiAoKSB7XG5cdCAgcmV0dXJuIGlnbm9yZUVycm9ycyh0aGlzKTtcblx0fTtcblxuXHQvLyAoU3RyZWFtKSAtPiBTdHJlYW1cblx0Ly8gKFByb3BlcnR5KSAtPiBQcm9wZXJ0eVxuXHR2YXIgaWdub3JlRW5kID0gX193ZWJwYWNrX3JlcXVpcmVfXyg1Mik7XG5cdE9ic2VydmFibGUucHJvdG90eXBlLmlnbm9yZUVuZCA9IGZ1bmN0aW9uICgpIHtcblx0ICByZXR1cm4gaWdub3JlRW5kKHRoaXMpO1xuXHR9O1xuXG5cdC8vIChTdHJlYW0sIEZ1bmN0aW9uKSAtPiBTdHJlYW1cblx0Ly8gKFByb3BlcnR5LCBGdW5jdGlvbikgLT4gUHJvcGVydHlcblx0dmFyIGJlZm9yZUVuZCA9IF9fd2VicGFja19yZXF1aXJlX18oNTMpO1xuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS5iZWZvcmVFbmQgPSBmdW5jdGlvbiAoZm4pIHtcblx0ICByZXR1cm4gYmVmb3JlRW5kKHRoaXMsIGZuKTtcblx0fTtcblxuXHQvLyAoU3RyZWFtLCBudW1iZXIsIG51bWJlcnx1bmRlZmluZWQpIC0+IFN0cmVhbVxuXHQvLyAoUHJvcGVydHksIG51bWJlciwgbnVtYmVyfHVuZGVmaW5lZCkgLT4gUHJvcGVydHlcblx0dmFyIHNsaWRpbmdXaW5kb3cgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDU0KTtcblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUuc2xpZGluZ1dpbmRvdyA9IGZ1bmN0aW9uIChtYXgsIG1pbikge1xuXHQgIHJldHVybiBzbGlkaW5nV2luZG93KHRoaXMsIG1heCwgbWluKTtcblx0fTtcblxuXHQvLyBPcHRpb25zID0ge2ZsdXNoT25FbmQ6IGJvb2xlYW58dW5kZWZpbmVkfVxuXHQvLyAoU3RyZWFtLCBGdW5jdGlvbnxmYWxzZXksIE9wdGlvbnN8dW5kZWZpbmVkKSAtPiBTdHJlYW1cblx0Ly8gKFByb3BlcnR5LCBGdW5jdGlvbnxmYWxzZXksIE9wdGlvbnN8dW5kZWZpbmVkKSAtPiBQcm9wZXJ0eVxuXHR2YXIgYnVmZmVyV2hpbGUgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDU1KTtcblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUuYnVmZmVyV2hpbGUgPSBmdW5jdGlvbiAoZm4sIG9wdGlvbnMpIHtcblx0ICByZXR1cm4gYnVmZmVyV2hpbGUodGhpcywgZm4sIG9wdGlvbnMpO1xuXHR9O1xuXG5cdC8vIChTdHJlYW0sIG51bWJlcikgLT4gU3RyZWFtXG5cdC8vIChQcm9wZXJ0eSwgbnVtYmVyKSAtPiBQcm9wZXJ0eVxuXHR2YXIgYnVmZmVyV2l0aENvdW50ID0gX193ZWJwYWNrX3JlcXVpcmVfXyg1Nik7XG5cdE9ic2VydmFibGUucHJvdG90eXBlLmJ1ZmZlcldpdGhDb3VudCA9IGZ1bmN0aW9uIChjb3VudCwgb3B0aW9ucykge1xuXHQgIHJldHVybiBidWZmZXJXaXRoQ291bnQodGhpcywgY291bnQsIG9wdGlvbnMpO1xuXHR9O1xuXG5cdC8vIE9wdGlvbnMgPSB7Zmx1c2hPbkVuZDogYm9vbGVhbnx1bmRlZmluZWR9XG5cdC8vIChTdHJlYW0sIG51bWJlciwgbnVtYmVyLCBPcHRpb25zfHVuZGVmaW5lZCkgLT4gU3RyZWFtXG5cdC8vIChQcm9wZXJ0eSwgbnVtYmVyLCBudW1iZXIsIE9wdGlvbnN8dW5kZWZpbmVkKSAtPiBQcm9wZXJ0eVxuXHR2YXIgYnVmZmVyV2l0aFRpbWVPckNvdW50ID0gX193ZWJwYWNrX3JlcXVpcmVfXyg1Nyk7XG5cdE9ic2VydmFibGUucHJvdG90eXBlLmJ1ZmZlcldpdGhUaW1lT3JDb3VudCA9IGZ1bmN0aW9uICh3YWl0LCBjb3VudCwgb3B0aW9ucykge1xuXHQgIHJldHVybiBidWZmZXJXaXRoVGltZU9yQ291bnQodGhpcywgd2FpdCwgY291bnQsIG9wdGlvbnMpO1xuXHR9O1xuXG5cdC8vIChTdHJlYW0sIEZ1bmN0aW9uKSAtPiBTdHJlYW1cblx0Ly8gKFByb3BlcnR5LCBGdW5jdGlvbikgLT4gUHJvcGVydHlcblx0dmFyIHRyYW5zZHVjZSA9IF9fd2VicGFja19yZXF1aXJlX18oNTgpO1xuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS50cmFuc2R1Y2UgPSBmdW5jdGlvbiAodHJhbnNkdWNlcikge1xuXHQgIHJldHVybiB0cmFuc2R1Y2UodGhpcywgdHJhbnNkdWNlcik7XG5cdH07XG5cblx0Ly8gKFN0cmVhbSwgRnVuY3Rpb24pIC0+IFN0cmVhbVxuXHQvLyAoUHJvcGVydHksIEZ1bmN0aW9uKSAtPiBQcm9wZXJ0eVxuXHR2YXIgd2l0aEhhbmRsZXIgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDU5KTtcblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUud2l0aEhhbmRsZXIgPSBmdW5jdGlvbiAoZm4pIHtcblx0ICByZXR1cm4gd2l0aEhhbmRsZXIodGhpcywgZm4pO1xuXHR9O1xuXG5cdC8vIENvbWJpbmUgb2JzZXJ2YWJsZXNcblx0Ly8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuXHQvLyAoQXJyYXk8U3RyZWFtfFByb3BlcnR5PiwgRnVuY3Rpb258dW5kZWZpZW5kKSAtPiBTdHJlYW1cblx0Ly8gKEFycmF5PFN0cmVhbXxQcm9wZXJ0eT4sIEFycmF5PFN0cmVhbXxQcm9wZXJ0eT4sIEZ1bmN0aW9ufHVuZGVmaWVuZCkgLT4gU3RyZWFtXG5cdHZhciBjb21iaW5lID0gS2VmaXIuY29tYmluZSA9IF9fd2VicGFja19yZXF1aXJlX18oNjApO1xuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS5jb21iaW5lID0gZnVuY3Rpb24gKG90aGVyLCBjb21iaW5hdG9yKSB7XG5cdCAgcmV0dXJuIGNvbWJpbmUoW3RoaXMsIG90aGVyXSwgY29tYmluYXRvcik7XG5cdH07XG5cblx0Ly8gKEFycmF5PFN0cmVhbXxQcm9wZXJ0eT4sIEZ1bmN0aW9ufHVuZGVmaWVuZCkgLT4gU3RyZWFtXG5cdHZhciB6aXAgPSBLZWZpci56aXAgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDYxKTtcblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUuemlwID0gZnVuY3Rpb24gKG90aGVyLCBjb21iaW5hdG9yKSB7XG5cdCAgcmV0dXJuIHppcChbdGhpcywgb3RoZXJdLCBjb21iaW5hdG9yKTtcblx0fTtcblxuXHQvLyAoQXJyYXk8U3RyZWFtfFByb3BlcnR5PikgLT4gU3RyZWFtXG5cdHZhciBtZXJnZSA9IEtlZmlyLm1lcmdlID0gX193ZWJwYWNrX3JlcXVpcmVfXyg2Mik7XG5cdE9ic2VydmFibGUucHJvdG90eXBlLm1lcmdlID0gZnVuY3Rpb24gKG90aGVyKSB7XG5cdCAgcmV0dXJuIG1lcmdlKFt0aGlzLCBvdGhlcl0pO1xuXHR9O1xuXG5cdC8vIChBcnJheTxTdHJlYW18UHJvcGVydHk+KSAtPiBTdHJlYW1cblx0dmFyIGNvbmNhdCA9IEtlZmlyLmNvbmNhdCA9IF9fd2VicGFja19yZXF1aXJlX18oNjQpO1xuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS5jb25jYXQgPSBmdW5jdGlvbiAob3RoZXIpIHtcblx0ICByZXR1cm4gY29uY2F0KFt0aGlzLCBvdGhlcl0pO1xuXHR9O1xuXG5cdC8vICgpIC0+IFBvb2xcblx0dmFyIFBvb2wgPSBLZWZpci5Qb29sID0gX193ZWJwYWNrX3JlcXVpcmVfXyg2Nik7XG5cdEtlZmlyLnBvb2wgPSBmdW5jdGlvbiAoKSB7XG5cdCAgcmV0dXJuIG5ldyBQb29sKCk7XG5cdH07XG5cblx0Ly8gKEZ1bmN0aW9uKSAtPiBTdHJlYW1cblx0S2VmaXIucmVwZWF0ID0gX193ZWJwYWNrX3JlcXVpcmVfXyg2NSk7XG5cblx0Ly8gT3B0aW9ucyA9IHtjb25jdXJMaW06IG51bWJlcnx1bmRlZmluZWQsIHF1ZXVlTGltOiBudW1iZXJ8dW5kZWZpbmVkLCBkcm9wOiAnb2xkJ3wnbmV3J3x1bmRlZmllbmR9XG5cdC8vIChTdHJlYW18UHJvcGVydHksIEZ1bmN0aW9ufGZhbHNleSwgT3B0aW9uc3x1bmRlZmluZWQpIC0+IFN0cmVhbVxuXHR2YXIgRmxhdE1hcCA9IF9fd2VicGFja19yZXF1aXJlX18oNjcpO1xuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS5mbGF0TWFwID0gZnVuY3Rpb24gKGZuKSB7XG5cdCAgcmV0dXJuIG5ldyBGbGF0TWFwKHRoaXMsIGZuKS5zZXROYW1lKHRoaXMsICdmbGF0TWFwJyk7XG5cdH07XG5cdE9ic2VydmFibGUucHJvdG90eXBlLmZsYXRNYXBMYXRlc3QgPSBmdW5jdGlvbiAoZm4pIHtcblx0ICByZXR1cm4gbmV3IEZsYXRNYXAodGhpcywgZm4sIHsgY29uY3VyTGltOiAxLCBkcm9wOiAnb2xkJyB9KS5zZXROYW1lKHRoaXMsICdmbGF0TWFwTGF0ZXN0Jyk7XG5cdH07XG5cdE9ic2VydmFibGUucHJvdG90eXBlLmZsYXRNYXBGaXJzdCA9IGZ1bmN0aW9uIChmbikge1xuXHQgIHJldHVybiBuZXcgRmxhdE1hcCh0aGlzLCBmbiwgeyBjb25jdXJMaW06IDEgfSkuc2V0TmFtZSh0aGlzLCAnZmxhdE1hcEZpcnN0Jyk7XG5cdH07XG5cdE9ic2VydmFibGUucHJvdG90eXBlLmZsYXRNYXBDb25jYXQgPSBmdW5jdGlvbiAoZm4pIHtcblx0ICByZXR1cm4gbmV3IEZsYXRNYXAodGhpcywgZm4sIHsgcXVldWVMaW06IC0xLCBjb25jdXJMaW06IDEgfSkuc2V0TmFtZSh0aGlzLCAnZmxhdE1hcENvbmNhdCcpO1xuXHR9O1xuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS5mbGF0TWFwQ29uY3VyTGltaXQgPSBmdW5jdGlvbiAoZm4sIGxpbWl0KSB7XG5cdCAgcmV0dXJuIG5ldyBGbGF0TWFwKHRoaXMsIGZuLCB7IHF1ZXVlTGltOiAtMSwgY29uY3VyTGltOiBsaW1pdCB9KS5zZXROYW1lKHRoaXMsICdmbGF0TWFwQ29uY3VyTGltaXQnKTtcblx0fTtcblxuXHQvLyAoU3RyZWFtfFByb3BlcnR5LCBGdW5jdGlvbnxmYWxzZXkpIC0+IFN0cmVhbVxuXHR2YXIgRmxhdE1hcEVycm9ycyA9IF9fd2VicGFja19yZXF1aXJlX18oNjgpO1xuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS5mbGF0TWFwRXJyb3JzID0gZnVuY3Rpb24gKGZuKSB7XG5cdCAgcmV0dXJuIG5ldyBGbGF0TWFwRXJyb3JzKHRoaXMsIGZuKS5zZXROYW1lKHRoaXMsICdmbGF0TWFwRXJyb3JzJyk7XG5cdH07XG5cblx0Ly8gQ29tYmluZSB0d28gb2JzZXJ2YWJsZXNcblx0Ly8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuXHQvLyAoU3RyZWFtLCBTdHJlYW18UHJvcGVydHkpIC0+IFN0cmVhbVxuXHQvLyAoUHJvcGVydHksIFN0cmVhbXxQcm9wZXJ0eSkgLT4gUHJvcGVydHlcblx0dmFyIGZpbHRlckJ5ID0gX193ZWJwYWNrX3JlcXVpcmVfXyg2OSk7XG5cdE9ic2VydmFibGUucHJvdG90eXBlLmZpbHRlckJ5ID0gZnVuY3Rpb24gKG90aGVyKSB7XG5cdCAgcmV0dXJuIGZpbHRlckJ5KHRoaXMsIG90aGVyKTtcblx0fTtcblxuXHQvLyAoU3RyZWFtLCBTdHJlYW18UHJvcGVydHksIEZ1bmN0aW9ufHVuZGVmaWVuZCkgLT4gU3RyZWFtXG5cdC8vIChQcm9wZXJ0eSwgU3RyZWFtfFByb3BlcnR5LCBGdW5jdGlvbnx1bmRlZmllbmQpIC0+IFByb3BlcnR5XG5cdHZhciBzYW1wbGVkQnkyaXRlbXMgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDcxKTtcblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUuc2FtcGxlZEJ5ID0gZnVuY3Rpb24gKG90aGVyLCBjb21iaW5hdG9yKSB7XG5cdCAgcmV0dXJuIHNhbXBsZWRCeTJpdGVtcyh0aGlzLCBvdGhlciwgY29tYmluYXRvcik7XG5cdH07XG5cblx0Ly8gKFN0cmVhbSwgU3RyZWFtfFByb3BlcnR5KSAtPiBTdHJlYW1cblx0Ly8gKFByb3BlcnR5LCBTdHJlYW18UHJvcGVydHkpIC0+IFByb3BlcnR5XG5cdHZhciBza2lwVW50aWxCeSA9IF9fd2VicGFja19yZXF1aXJlX18oNzIpO1xuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS5za2lwVW50aWxCeSA9IGZ1bmN0aW9uIChvdGhlcikge1xuXHQgIHJldHVybiBza2lwVW50aWxCeSh0aGlzLCBvdGhlcik7XG5cdH07XG5cblx0Ly8gKFN0cmVhbSwgU3RyZWFtfFByb3BlcnR5KSAtPiBTdHJlYW1cblx0Ly8gKFByb3BlcnR5LCBTdHJlYW18UHJvcGVydHkpIC0+IFByb3BlcnR5XG5cdHZhciB0YWtlVW50aWxCeSA9IF9fd2VicGFja19yZXF1aXJlX18oNzMpO1xuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS50YWtlVW50aWxCeSA9IGZ1bmN0aW9uIChvdGhlcikge1xuXHQgIHJldHVybiB0YWtlVW50aWxCeSh0aGlzLCBvdGhlcik7XG5cdH07XG5cblx0Ly8gT3B0aW9ucyA9IHtmbHVzaE9uRW5kOiBib29sZWFufHVuZGVmaW5lZH1cblx0Ly8gKFN0cmVhbSwgU3RyZWFtfFByb3BlcnR5LCBPcHRpb25zfHVuZGVmaW5lZCkgLT4gU3RyZWFtXG5cdC8vIChQcm9wZXJ0eSwgU3RyZWFtfFByb3BlcnR5LCBPcHRpb25zfHVuZGVmaW5lZCkgLT4gUHJvcGVydHlcblx0dmFyIGJ1ZmZlckJ5ID0gX193ZWJwYWNrX3JlcXVpcmVfXyg3NCk7XG5cdE9ic2VydmFibGUucHJvdG90eXBlLmJ1ZmZlckJ5ID0gZnVuY3Rpb24gKG90aGVyLCBvcHRpb25zKSB7XG5cdCAgcmV0dXJuIGJ1ZmZlckJ5KHRoaXMsIG90aGVyLCBvcHRpb25zKTtcblx0fTtcblxuXHQvLyBPcHRpb25zID0ge2ZsdXNoT25FbmQ6IGJvb2xlYW58dW5kZWZpbmVkfVxuXHQvLyAoU3RyZWFtLCBTdHJlYW18UHJvcGVydHksIE9wdGlvbnN8dW5kZWZpbmVkKSAtPiBTdHJlYW1cblx0Ly8gKFByb3BlcnR5LCBTdHJlYW18UHJvcGVydHksIE9wdGlvbnN8dW5kZWZpbmVkKSAtPiBQcm9wZXJ0eVxuXHR2YXIgYnVmZmVyV2hpbGVCeSA9IF9fd2VicGFja19yZXF1aXJlX18oNzUpO1xuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS5idWZmZXJXaGlsZUJ5ID0gZnVuY3Rpb24gKG90aGVyLCBvcHRpb25zKSB7XG5cdCAgcmV0dXJuIGJ1ZmZlcldoaWxlQnkodGhpcywgb3RoZXIsIG9wdGlvbnMpO1xuXHR9O1xuXG5cdC8vIERlcHJlY2F0ZWRcblx0Ly8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuXHRmdW5jdGlvbiB3YXJuKG1zZykge1xuXHQgIGlmIChLZWZpci5ERVBSRUNBVElPTl9XQVJOSU5HUyAhPT0gZmFsc2UgJiYgY29uc29sZSAmJiB0eXBlb2YgY29uc29sZS53YXJuID09PSAnZnVuY3Rpb24nKSB7XG5cdCAgICB2YXIgbXNnMiA9ICdcXG5IZXJlIGlzIGFuIEVycm9yIG9iamVjdCBmb3IgeW91IGNvbnRhaW5pbmcgdGhlIGNhbGwgc3RhY2s6Jztcblx0ICAgIGNvbnNvbGUud2Fybihtc2csIG1zZzIsIG5ldyBFcnJvcigpKTtcblx0ICB9XG5cdH1cblxuXHQvLyAoU3RyZWFtfFByb3BlcnR5LCBTdHJlYW18UHJvcGVydHkpIC0+IFByb3BlcnR5XG5cdHZhciBhd2FpdGluZyA9IF9fd2VicGFja19yZXF1aXJlX18oNzYpO1xuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS5hd2FpdGluZyA9IGZ1bmN0aW9uIChvdGhlcikge1xuXHQgIHdhcm4oJ1lvdSBhcmUgdXNpbmcgZGVwcmVjYXRlZCAuYXdhaXRpbmcoKSBtZXRob2QsIHNlZSBodHRwczovL2dpdGh1Yi5jb20vcnBvbWlub3Yva2VmaXIvaXNzdWVzLzE0NScpO1xuXHQgIHJldHVybiBhd2FpdGluZyh0aGlzLCBvdGhlcik7XG5cdH07XG5cblx0Ly8gKFN0cmVhbSwgRnVuY3Rpb258dW5kZWZpbmVkKSAtPiBTdHJlYW1cblx0Ly8gKFByb3BlcnR5LCBGdW5jdGlvbnx1bmRlZmluZWQpIC0+IFByb3BlcnR5XG5cdHZhciB2YWx1ZXNUb0Vycm9ycyA9IF9fd2VicGFja19yZXF1aXJlX18oNzcpO1xuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS52YWx1ZXNUb0Vycm9ycyA9IGZ1bmN0aW9uIChmbikge1xuXHQgIHdhcm4oJ1lvdSBhcmUgdXNpbmcgZGVwcmVjYXRlZCAudmFsdWVzVG9FcnJvcnMoKSBtZXRob2QsIHNlZSBodHRwczovL2dpdGh1Yi5jb20vcnBvbWlub3Yva2VmaXIvaXNzdWVzLzE0OScpO1xuXHQgIHJldHVybiB2YWx1ZXNUb0Vycm9ycyh0aGlzLCBmbik7XG5cdH07XG5cblx0Ly8gKFN0cmVhbSwgRnVuY3Rpb258dW5kZWZpbmVkKSAtPiBTdHJlYW1cblx0Ly8gKFByb3BlcnR5LCBGdW5jdGlvbnx1bmRlZmluZWQpIC0+IFByb3BlcnR5XG5cdHZhciBlcnJvcnNUb1ZhbHVlcyA9IF9fd2VicGFja19yZXF1aXJlX18oNzgpO1xuXHRPYnNlcnZhYmxlLnByb3RvdHlwZS5lcnJvcnNUb1ZhbHVlcyA9IGZ1bmN0aW9uIChmbikge1xuXHQgIHdhcm4oJ1lvdSBhcmUgdXNpbmcgZGVwcmVjYXRlZCAuZXJyb3JzVG9WYWx1ZXMoKSBtZXRob2QsIHNlZSBodHRwczovL2dpdGh1Yi5jb20vcnBvbWlub3Yva2VmaXIvaXNzdWVzLzE0OScpO1xuXHQgIHJldHVybiBlcnJvcnNUb1ZhbHVlcyh0aGlzLCBmbik7XG5cdH07XG5cblx0Ly8gKFN0cmVhbSkgLT4gU3RyZWFtXG5cdC8vIChQcm9wZXJ0eSkgLT4gUHJvcGVydHlcblx0dmFyIGVuZE9uRXJyb3IgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDc5KTtcblx0T2JzZXJ2YWJsZS5wcm90b3R5cGUuZW5kT25FcnJvciA9IGZ1bmN0aW9uICgpIHtcblx0ICB3YXJuKCdZb3UgYXJlIHVzaW5nIGRlcHJlY2F0ZWQgLmVuZE9uRXJyb3IoKSBtZXRob2QsIHNlZSBodHRwczovL2dpdGh1Yi5jb20vcnBvbWlub3Yva2VmaXIvaXNzdWVzLzE1MCcpO1xuXHQgIHJldHVybiBlbmRPbkVycm9yKHRoaXMpO1xuXHR9O1xuXG4vKioqLyB9LFxuLyogMSAqL1xuLyoqKi8gZnVuY3Rpb24obW9kdWxlLCBleHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKSB7XG5cblx0J3VzZSBzdHJpY3QnO1xuXG5cdHZhciBfcmVxdWlyZSA9IF9fd2VicGFja19yZXF1aXJlX18oMik7XG5cblx0dmFyIGV4dGVuZCA9IF9yZXF1aXJlLmV4dGVuZDtcblxuXHR2YXIgX3JlcXVpcmUyID0gX193ZWJwYWNrX3JlcXVpcmVfXygzKTtcblxuXHR2YXIgVkFMVUUgPSBfcmVxdWlyZTIuVkFMVUU7XG5cdHZhciBFUlJPUiA9IF9yZXF1aXJlMi5FUlJPUjtcblx0dmFyIEFOWSA9IF9yZXF1aXJlMi5BTlk7XG5cdHZhciBFTkQgPSBfcmVxdWlyZTIuRU5EO1xuXG5cdHZhciBfcmVxdWlyZTMgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDQpO1xuXG5cdHZhciBEaXNwYXRjaGVyID0gX3JlcXVpcmUzLkRpc3BhdGNoZXI7XG5cdHZhciBjYWxsU3Vic2NyaWJlciA9IF9yZXF1aXJlMy5jYWxsU3Vic2NyaWJlcjtcblxuXHR2YXIgX3JlcXVpcmU0ID0gX193ZWJwYWNrX3JlcXVpcmVfXyg1KTtcblxuXHR2YXIgZmluZEJ5UHJlZCA9IF9yZXF1aXJlNC5maW5kQnlQcmVkO1xuXG5cdGZ1bmN0aW9uIE9ic2VydmFibGUoKSB7XG5cdCAgdGhpcy5fZGlzcGF0Y2hlciA9IG5ldyBEaXNwYXRjaGVyKCk7XG5cdCAgdGhpcy5fYWN0aXZlID0gZmFsc2U7XG5cdCAgdGhpcy5fYWxpdmUgPSB0cnVlO1xuXHQgIHRoaXMuX2FjdGl2YXRpbmcgPSBmYWxzZTtcblx0ICB0aGlzLl9sb2dIYW5kbGVycyA9IG51bGw7XG5cdH1cblxuXHRleHRlbmQoT2JzZXJ2YWJsZS5wcm90b3R5cGUsIHtcblxuXHQgIF9uYW1lOiAnb2JzZXJ2YWJsZScsXG5cblx0ICBfb25BY3RpdmF0aW9uOiBmdW5jdGlvbiBfb25BY3RpdmF0aW9uKCkge30sXG5cdCAgX29uRGVhY3RpdmF0aW9uOiBmdW5jdGlvbiBfb25EZWFjdGl2YXRpb24oKSB7fSxcblxuXHQgIF9zZXRBY3RpdmU6IGZ1bmN0aW9uIF9zZXRBY3RpdmUoYWN0aXZlKSB7XG5cdCAgICBpZiAodGhpcy5fYWN0aXZlICE9PSBhY3RpdmUpIHtcblx0ICAgICAgdGhpcy5fYWN0aXZlID0gYWN0aXZlO1xuXHQgICAgICBpZiAoYWN0aXZlKSB7XG5cdCAgICAgICAgdGhpcy5fYWN0aXZhdGluZyA9IHRydWU7XG5cdCAgICAgICAgdGhpcy5fb25BY3RpdmF0aW9uKCk7XG5cdCAgICAgICAgdGhpcy5fYWN0aXZhdGluZyA9IGZhbHNlO1xuXHQgICAgICB9IGVsc2Uge1xuXHQgICAgICAgIHRoaXMuX29uRGVhY3RpdmF0aW9uKCk7XG5cdCAgICAgIH1cblx0ICAgIH1cblx0ICB9LFxuXG5cdCAgX2NsZWFyOiBmdW5jdGlvbiBfY2xlYXIoKSB7XG5cdCAgICB0aGlzLl9zZXRBY3RpdmUoZmFsc2UpO1xuXHQgICAgdGhpcy5fZGlzcGF0Y2hlci5jbGVhbnVwKCk7XG5cdCAgICB0aGlzLl9kaXNwYXRjaGVyID0gbnVsbDtcblx0ICAgIHRoaXMuX2xvZ0hhbmRsZXJzID0gbnVsbDtcblx0ICB9LFxuXG5cdCAgX2VtaXQ6IGZ1bmN0aW9uIF9lbWl0KHR5cGUsIHgpIHtcblx0ICAgIHN3aXRjaCAodHlwZSkge1xuXHQgICAgICBjYXNlIFZBTFVFOlxuXHQgICAgICAgIHJldHVybiB0aGlzLl9lbWl0VmFsdWUoeCk7XG5cdCAgICAgIGNhc2UgRVJST1I6XG5cdCAgICAgICAgcmV0dXJuIHRoaXMuX2VtaXRFcnJvcih4KTtcblx0ICAgICAgY2FzZSBFTkQ6XG5cdCAgICAgICAgcmV0dXJuIHRoaXMuX2VtaXRFbmQoKTtcblx0ICAgIH1cblx0ICB9LFxuXG5cdCAgX2VtaXRWYWx1ZTogZnVuY3Rpb24gX2VtaXRWYWx1ZSh2YWx1ZSkge1xuXHQgICAgaWYgKHRoaXMuX2FsaXZlKSB7XG5cdCAgICAgIHRoaXMuX2Rpc3BhdGNoZXIuZGlzcGF0Y2goeyB0eXBlOiBWQUxVRSwgdmFsdWU6IHZhbHVlIH0pO1xuXHQgICAgfVxuXHQgIH0sXG5cblx0ICBfZW1pdEVycm9yOiBmdW5jdGlvbiBfZW1pdEVycm9yKHZhbHVlKSB7XG5cdCAgICBpZiAodGhpcy5fYWxpdmUpIHtcblx0ICAgICAgdGhpcy5fZGlzcGF0Y2hlci5kaXNwYXRjaCh7IHR5cGU6IEVSUk9SLCB2YWx1ZTogdmFsdWUgfSk7XG5cdCAgICB9XG5cdCAgfSxcblxuXHQgIF9lbWl0RW5kOiBmdW5jdGlvbiBfZW1pdEVuZCgpIHtcblx0ICAgIGlmICh0aGlzLl9hbGl2ZSkge1xuXHQgICAgICB0aGlzLl9hbGl2ZSA9IGZhbHNlO1xuXHQgICAgICB0aGlzLl9kaXNwYXRjaGVyLmRpc3BhdGNoKHsgdHlwZTogRU5EIH0pO1xuXHQgICAgICB0aGlzLl9jbGVhcigpO1xuXHQgICAgfVxuXHQgIH0sXG5cblx0ICBfb246IGZ1bmN0aW9uIF9vbih0eXBlLCBmbikge1xuXHQgICAgaWYgKHRoaXMuX2FsaXZlKSB7XG5cdCAgICAgIHRoaXMuX2Rpc3BhdGNoZXIuYWRkKHR5cGUsIGZuKTtcblx0ICAgICAgdGhpcy5fc2V0QWN0aXZlKHRydWUpO1xuXHQgICAgfSBlbHNlIHtcblx0ICAgICAgY2FsbFN1YnNjcmliZXIodHlwZSwgZm4sIHsgdHlwZTogRU5EIH0pO1xuXHQgICAgfVxuXHQgICAgcmV0dXJuIHRoaXM7XG5cdCAgfSxcblxuXHQgIF9vZmY6IGZ1bmN0aW9uIF9vZmYodHlwZSwgZm4pIHtcblx0ICAgIGlmICh0aGlzLl9hbGl2ZSkge1xuXHQgICAgICB2YXIgY291bnQgPSB0aGlzLl9kaXNwYXRjaGVyLnJlbW92ZSh0eXBlLCBmbik7XG5cdCAgICAgIGlmIChjb3VudCA9PT0gMCkge1xuXHQgICAgICAgIHRoaXMuX3NldEFjdGl2ZShmYWxzZSk7XG5cdCAgICAgIH1cblx0ICAgIH1cblx0ICAgIHJldHVybiB0aGlzO1xuXHQgIH0sXG5cblx0ICBvblZhbHVlOiBmdW5jdGlvbiBvblZhbHVlKGZuKSB7XG5cdCAgICByZXR1cm4gdGhpcy5fb24oVkFMVUUsIGZuKTtcblx0ICB9LFxuXHQgIG9uRXJyb3I6IGZ1bmN0aW9uIG9uRXJyb3IoZm4pIHtcblx0ICAgIHJldHVybiB0aGlzLl9vbihFUlJPUiwgZm4pO1xuXHQgIH0sXG5cdCAgb25FbmQ6IGZ1bmN0aW9uIG9uRW5kKGZuKSB7XG5cdCAgICByZXR1cm4gdGhpcy5fb24oRU5ELCBmbik7XG5cdCAgfSxcblx0ICBvbkFueTogZnVuY3Rpb24gb25BbnkoZm4pIHtcblx0ICAgIHJldHVybiB0aGlzLl9vbihBTlksIGZuKTtcblx0ICB9LFxuXG5cdCAgb2ZmVmFsdWU6IGZ1bmN0aW9uIG9mZlZhbHVlKGZuKSB7XG5cdCAgICByZXR1cm4gdGhpcy5fb2ZmKFZBTFVFLCBmbik7XG5cdCAgfSxcblx0ICBvZmZFcnJvcjogZnVuY3Rpb24gb2ZmRXJyb3IoZm4pIHtcblx0ICAgIHJldHVybiB0aGlzLl9vZmYoRVJST1IsIGZuKTtcblx0ICB9LFxuXHQgIG9mZkVuZDogZnVuY3Rpb24gb2ZmRW5kKGZuKSB7XG5cdCAgICByZXR1cm4gdGhpcy5fb2ZmKEVORCwgZm4pO1xuXHQgIH0sXG5cdCAgb2ZmQW55OiBmdW5jdGlvbiBvZmZBbnkoZm4pIHtcblx0ICAgIHJldHVybiB0aGlzLl9vZmYoQU5ZLCBmbik7XG5cdCAgfSxcblxuXHQgIC8vIEEgYW5kIEIgbXVzdCBiZSBzdWJjbGFzc2VzIG9mIFN0cmVhbSBhbmQgUHJvcGVydHkgKG9yZGVyIGRvZXNuJ3QgbWF0dGVyKVxuXHQgIF9vZlNhbWVUeXBlOiBmdW5jdGlvbiBfb2ZTYW1lVHlwZShBLCBCKSB7XG5cdCAgICByZXR1cm4gQS5wcm90b3R5cGUuZ2V0VHlwZSgpID09PSB0aGlzLmdldFR5cGUoKSA/IEEgOiBCO1xuXHQgIH0sXG5cblx0ICBzZXROYW1lOiBmdW5jdGlvbiBzZXROYW1lKHNvdXJjZU9icywgLyogb3B0aW9uYWwgKi9zZWxmTmFtZSkge1xuXHQgICAgdGhpcy5fbmFtZSA9IHNlbGZOYW1lID8gc291cmNlT2JzLl9uYW1lICsgJy4nICsgc2VsZk5hbWUgOiBzb3VyY2VPYnM7XG5cdCAgICByZXR1cm4gdGhpcztcblx0ICB9LFxuXG5cdCAgbG9nOiBmdW5jdGlvbiBsb2coKSB7XG5cdCAgICB2YXIgbmFtZSA9IGFyZ3VtZW50cy5sZW5ndGggPD0gMCB8fCBhcmd1bWVudHNbMF0gPT09IHVuZGVmaW5lZCA/IHRoaXMudG9TdHJpbmcoKSA6IGFyZ3VtZW50c1swXTtcblxuXHQgICAgdmFyIGlzQ3VycmVudCA9IHVuZGVmaW5lZDtcblx0ICAgIHZhciBoYW5kbGVyID0gZnVuY3Rpb24gaGFuZGxlcihldmVudCkge1xuXHQgICAgICB2YXIgdHlwZSA9ICc8JyArIGV2ZW50LnR5cGUgKyAoaXNDdXJyZW50ID8gJzpjdXJyZW50JyA6ICcnKSArICc+Jztcblx0ICAgICAgaWYgKGV2ZW50LnR5cGUgPT09IEVORCkge1xuXHQgICAgICAgIGNvbnNvbGUubG9nKG5hbWUsIHR5cGUpO1xuXHQgICAgICB9IGVsc2Uge1xuXHQgICAgICAgIGNvbnNvbGUubG9nKG5hbWUsIHR5cGUsIGV2ZW50LnZhbHVlKTtcblx0ICAgICAgfVxuXHQgICAgfTtcblxuXHQgICAgaWYgKHRoaXMuX2FsaXZlKSB7XG5cdCAgICAgIGlmICghdGhpcy5fbG9nSGFuZGxlcnMpIHtcblx0ICAgICAgICB0aGlzLl9sb2dIYW5kbGVycyA9IFtdO1xuXHQgICAgICB9XG5cdCAgICAgIHRoaXMuX2xvZ0hhbmRsZXJzLnB1c2goeyBuYW1lOiBuYW1lLCBoYW5kbGVyOiBoYW5kbGVyIH0pO1xuXHQgICAgfVxuXG5cdCAgICBpc0N1cnJlbnQgPSB0cnVlO1xuXHQgICAgdGhpcy5vbkFueShoYW5kbGVyKTtcblx0ICAgIGlzQ3VycmVudCA9IGZhbHNlO1xuXG5cdCAgICByZXR1cm4gdGhpcztcblx0ICB9LFxuXG5cdCAgb2ZmTG9nOiBmdW5jdGlvbiBvZmZMb2coKSB7XG5cdCAgICB2YXIgbmFtZSA9IGFyZ3VtZW50cy5sZW5ndGggPD0gMCB8fCBhcmd1bWVudHNbMF0gPT09IHVuZGVmaW5lZCA/IHRoaXMudG9TdHJpbmcoKSA6IGFyZ3VtZW50c1swXTtcblxuXHQgICAgaWYgKHRoaXMuX2xvZ0hhbmRsZXJzKSB7XG5cdCAgICAgIHZhciBoYW5kbGVySW5kZXggPSBmaW5kQnlQcmVkKHRoaXMuX2xvZ0hhbmRsZXJzLCBmdW5jdGlvbiAob2JqKSB7XG5cdCAgICAgICAgcmV0dXJuIG9iai5uYW1lID09PSBuYW1lO1xuXHQgICAgICB9KTtcblx0ICAgICAgaWYgKGhhbmRsZXJJbmRleCAhPT0gLTEpIHtcblx0ICAgICAgICB0aGlzLm9mZkFueSh0aGlzLl9sb2dIYW5kbGVyc1toYW5kbGVySW5kZXhdLmhhbmRsZXIpO1xuXHQgICAgICAgIHRoaXMuX2xvZ0hhbmRsZXJzLnNwbGljZShoYW5kbGVySW5kZXgsIDEpO1xuXHQgICAgICB9XG5cdCAgICB9XG5cblx0ICAgIHJldHVybiB0aGlzO1xuXHQgIH1cblx0fSk7XG5cblx0Ly8gZXh0ZW5kKCkgY2FuJ3QgaGFuZGxlIGB0b1N0cmluZ2AgaW4gSUU4XG5cdE9ic2VydmFibGUucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24gKCkge1xuXHQgIHJldHVybiAnWycgKyB0aGlzLl9uYW1lICsgJ10nO1xuXHR9O1xuXG5cdG1vZHVsZS5leHBvcnRzID0gT2JzZXJ2YWJsZTtcblxuLyoqKi8gfSxcbi8qIDIgKi9cbi8qKiovIGZ1bmN0aW9uKG1vZHVsZSwgZXhwb3J0cykge1xuXG5cdFwidXNlIHN0cmljdFwiO1xuXG5cdGZ1bmN0aW9uIGNyZWF0ZU9iaihwcm90bykge1xuXHQgIHZhciBGID0gZnVuY3Rpb24gRigpIHt9O1xuXHQgIEYucHJvdG90eXBlID0gcHJvdG87XG5cdCAgcmV0dXJuIG5ldyBGKCk7XG5cdH1cblxuXHRmdW5jdGlvbiBleHRlbmQodGFyZ2V0IC8qLCBtaXhpbjEsIG1peGluMi4uLiovKSB7XG5cdCAgdmFyIGxlbmd0aCA9IGFyZ3VtZW50cy5sZW5ndGgsXG5cdCAgICAgIGkgPSB1bmRlZmluZWQsXG5cdCAgICAgIHByb3AgPSB1bmRlZmluZWQ7XG5cdCAgZm9yIChpID0gMTsgaSA8IGxlbmd0aDsgaSsrKSB7XG5cdCAgICBmb3IgKHByb3AgaW4gYXJndW1lbnRzW2ldKSB7XG5cdCAgICAgIHRhcmdldFtwcm9wXSA9IGFyZ3VtZW50c1tpXVtwcm9wXTtcblx0ICAgIH1cblx0ICB9XG5cdCAgcmV0dXJuIHRhcmdldDtcblx0fVxuXG5cdGZ1bmN0aW9uIGluaGVyaXQoQ2hpbGQsIFBhcmVudCAvKiwgbWl4aW4xLCBtaXhpbjIuLi4qLykge1xuXHQgIHZhciBsZW5ndGggPSBhcmd1bWVudHMubGVuZ3RoLFxuXHQgICAgICBpID0gdW5kZWZpbmVkO1xuXHQgIENoaWxkLnByb3RvdHlwZSA9IGNyZWF0ZU9iaihQYXJlbnQucHJvdG90eXBlKTtcblx0ICBDaGlsZC5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBDaGlsZDtcblx0ICBmb3IgKGkgPSAyOyBpIDwgbGVuZ3RoOyBpKyspIHtcblx0ICAgIGV4dGVuZChDaGlsZC5wcm90b3R5cGUsIGFyZ3VtZW50c1tpXSk7XG5cdCAgfVxuXHQgIHJldHVybiBDaGlsZDtcblx0fVxuXG5cdG1vZHVsZS5leHBvcnRzID0geyBleHRlbmQ6IGV4dGVuZCwgaW5oZXJpdDogaW5oZXJpdCB9O1xuXG4vKioqLyB9LFxuLyogMyAqL1xuLyoqKi8gZnVuY3Rpb24obW9kdWxlLCBleHBvcnRzKSB7XG5cblx0J3VzZSBzdHJpY3QnO1xuXG5cdGV4cG9ydHMuTk9USElORyA9IFsnPG5vdGhpbmc+J107XG5cdGV4cG9ydHMuRU5EID0gJ2VuZCc7XG5cdGV4cG9ydHMuVkFMVUUgPSAndmFsdWUnO1xuXHRleHBvcnRzLkVSUk9SID0gJ2Vycm9yJztcblx0ZXhwb3J0cy5BTlkgPSAnYW55JztcblxuLyoqKi8gfSxcbi8qIDQgKi9cbi8qKiovIGZ1bmN0aW9uKG1vZHVsZSwgZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXykge1xuXG5cdCd1c2Ugc3RyaWN0JztcblxuXHR2YXIgX3JlcXVpcmUgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDIpO1xuXG5cdHZhciBleHRlbmQgPSBfcmVxdWlyZS5leHRlbmQ7XG5cblx0dmFyIF9yZXF1aXJlMiA9IF9fd2VicGFja19yZXF1aXJlX18oMyk7XG5cblx0dmFyIFZBTFVFID0gX3JlcXVpcmUyLlZBTFVFO1xuXHR2YXIgRVJST1IgPSBfcmVxdWlyZTIuRVJST1I7XG5cdHZhciBBTlkgPSBfcmVxdWlyZTIuQU5ZO1xuXG5cdHZhciBfcmVxdWlyZTMgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDUpO1xuXG5cdHZhciBjb25jYXQgPSBfcmVxdWlyZTMuY29uY2F0O1xuXHR2YXIgZmluZEJ5UHJlZCA9IF9yZXF1aXJlMy5maW5kQnlQcmVkO1xuXHR2YXIgX3JlbW92ZSA9IF9yZXF1aXJlMy5yZW1vdmU7XG5cdHZhciBjb250YWlucyA9IF9yZXF1aXJlMy5jb250YWlucztcblxuXHRmdW5jdGlvbiBjYWxsU3Vic2NyaWJlcih0eXBlLCBmbiwgZXZlbnQpIHtcblx0ICBpZiAodHlwZSA9PT0gQU5ZKSB7XG5cdCAgICBmbihldmVudCk7XG5cdCAgfSBlbHNlIGlmICh0eXBlID09PSBldmVudC50eXBlKSB7XG5cdCAgICBpZiAodHlwZSA9PT0gVkFMVUUgfHwgdHlwZSA9PT0gRVJST1IpIHtcblx0ICAgICAgZm4oZXZlbnQudmFsdWUpO1xuXHQgICAgfSBlbHNlIHtcblx0ICAgICAgZm4oKTtcblx0ICAgIH1cblx0ICB9XG5cdH1cblxuXHRmdW5jdGlvbiBEaXNwYXRjaGVyKCkge1xuXHQgIHRoaXMuX2l0ZW1zID0gW107XG5cdCAgdGhpcy5faW5Mb29wID0gMDtcblx0ICB0aGlzLl9yZW1vdmVkSXRlbXMgPSBudWxsO1xuXHR9XG5cblx0ZXh0ZW5kKERpc3BhdGNoZXIucHJvdG90eXBlLCB7XG5cblx0ICBhZGQ6IGZ1bmN0aW9uIGFkZCh0eXBlLCBmbikge1xuXHQgICAgdGhpcy5faXRlbXMgPSBjb25jYXQodGhpcy5faXRlbXMsIFt7IHR5cGU6IHR5cGUsIGZuOiBmbiB9XSk7XG5cdCAgICByZXR1cm4gdGhpcy5faXRlbXMubGVuZ3RoO1xuXHQgIH0sXG5cblx0ICByZW1vdmU6IGZ1bmN0aW9uIHJlbW92ZSh0eXBlLCBmbikge1xuXHQgICAgdmFyIGluZGV4ID0gZmluZEJ5UHJlZCh0aGlzLl9pdGVtcywgZnVuY3Rpb24gKHgpIHtcblx0ICAgICAgcmV0dXJuIHgudHlwZSA9PT0gdHlwZSAmJiB4LmZuID09PSBmbjtcblx0ICAgIH0pO1xuXG5cdCAgICAvLyBpZiB3ZSdyZSBjdXJyZW50bHkgaW4gYSBub3RpZmljYXRpb24gbG9vcCxcblx0ICAgIC8vIHJlbWVtYmVyIHRoaXMgc3Vic2NyaWJlciB3YXMgcmVtb3ZlZFxuXHQgICAgaWYgKHRoaXMuX2luTG9vcCAhPT0gMCAmJiBpbmRleCAhPT0gLTEpIHtcblx0ICAgICAgaWYgKHRoaXMuX3JlbW92ZWRJdGVtcyA9PT0gbnVsbCkge1xuXHQgICAgICAgIHRoaXMuX3JlbW92ZWRJdGVtcyA9IFtdO1xuXHQgICAgICB9XG5cdCAgICAgIHRoaXMuX3JlbW92ZWRJdGVtcy5wdXNoKHRoaXMuX2l0ZW1zW2luZGV4XSk7XG5cdCAgICB9XG5cblx0ICAgIHRoaXMuX2l0ZW1zID0gX3JlbW92ZSh0aGlzLl9pdGVtcywgaW5kZXgpO1xuXHQgICAgcmV0dXJuIHRoaXMuX2l0ZW1zLmxlbmd0aDtcblx0ICB9LFxuXG5cdCAgZGlzcGF0Y2g6IGZ1bmN0aW9uIGRpc3BhdGNoKGV2ZW50KSB7XG5cdCAgICB0aGlzLl9pbkxvb3ArKztcblx0ICAgIGZvciAodmFyIGkgPSAwLCBpdGVtcyA9IHRoaXMuX2l0ZW1zOyBpIDwgaXRlbXMubGVuZ3RoOyBpKyspIHtcblxuXHQgICAgICAvLyBjbGVhbnVwIHdhcyBjYWxsZWRcblx0ICAgICAgaWYgKHRoaXMuX2l0ZW1zID09PSBudWxsKSB7XG5cdCAgICAgICAgYnJlYWs7XG5cdCAgICAgIH1cblxuXHQgICAgICAvLyB0aGlzIHN1YnNjcmliZXIgd2FzIHJlbW92ZWRcblx0ICAgICAgaWYgKHRoaXMuX3JlbW92ZWRJdGVtcyAhPT0gbnVsbCAmJiBjb250YWlucyh0aGlzLl9yZW1vdmVkSXRlbXMsIGl0ZW1zW2ldKSkge1xuXHQgICAgICAgIGNvbnRpbnVlO1xuXHQgICAgICB9XG5cblx0ICAgICAgY2FsbFN1YnNjcmliZXIoaXRlbXNbaV0udHlwZSwgaXRlbXNbaV0uZm4sIGV2ZW50KTtcblx0ICAgIH1cblx0ICAgIHRoaXMuX2luTG9vcC0tO1xuXHQgICAgaWYgKHRoaXMuX2luTG9vcCA9PT0gMCkge1xuXHQgICAgICB0aGlzLl9yZW1vdmVkSXRlbXMgPSBudWxsO1xuXHQgICAgfVxuXHQgIH0sXG5cblx0ICBjbGVhbnVwOiBmdW5jdGlvbiBjbGVhbnVwKCkge1xuXHQgICAgdGhpcy5faXRlbXMgPSBudWxsO1xuXHQgIH1cblxuXHR9KTtcblxuXHRtb2R1bGUuZXhwb3J0cyA9IHsgY2FsbFN1YnNjcmliZXI6IGNhbGxTdWJzY3JpYmVyLCBEaXNwYXRjaGVyOiBEaXNwYXRjaGVyIH07XG5cbi8qKiovIH0sXG4vKiA1ICovXG4vKioqLyBmdW5jdGlvbihtb2R1bGUsIGV4cG9ydHMpIHtcblxuXHRcInVzZSBzdHJpY3RcIjtcblxuXHRmdW5jdGlvbiBjb25jYXQoYSwgYikge1xuXHQgIHZhciByZXN1bHQgPSB1bmRlZmluZWQsXG5cdCAgICAgIGxlbmd0aCA9IHVuZGVmaW5lZCxcblx0ICAgICAgaSA9IHVuZGVmaW5lZCxcblx0ICAgICAgaiA9IHVuZGVmaW5lZDtcblx0ICBpZiAoYS5sZW5ndGggPT09IDApIHtcblx0ICAgIHJldHVybiBiO1xuXHQgIH1cblx0ICBpZiAoYi5sZW5ndGggPT09IDApIHtcblx0ICAgIHJldHVybiBhO1xuXHQgIH1cblx0ICBqID0gMDtcblx0ICByZXN1bHQgPSBuZXcgQXJyYXkoYS5sZW5ndGggKyBiLmxlbmd0aCk7XG5cdCAgbGVuZ3RoID0gYS5sZW5ndGg7XG5cdCAgZm9yIChpID0gMDsgaSA8IGxlbmd0aDsgaSsrLCBqKyspIHtcblx0ICAgIHJlc3VsdFtqXSA9IGFbaV07XG5cdCAgfVxuXHQgIGxlbmd0aCA9IGIubGVuZ3RoO1xuXHQgIGZvciAoaSA9IDA7IGkgPCBsZW5ndGg7IGkrKywgaisrKSB7XG5cdCAgICByZXN1bHRbal0gPSBiW2ldO1xuXHQgIH1cblx0ICByZXR1cm4gcmVzdWx0O1xuXHR9XG5cblx0ZnVuY3Rpb24gY2lyY2xlU2hpZnQoYXJyLCBkaXN0YW5jZSkge1xuXHQgIHZhciBsZW5ndGggPSBhcnIubGVuZ3RoLFxuXHQgICAgICByZXN1bHQgPSBuZXcgQXJyYXkobGVuZ3RoKSxcblx0ICAgICAgaSA9IHVuZGVmaW5lZDtcblx0ICBmb3IgKGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcblx0ICAgIHJlc3VsdFsoaSArIGRpc3RhbmNlKSAlIGxlbmd0aF0gPSBhcnJbaV07XG5cdCAgfVxuXHQgIHJldHVybiByZXN1bHQ7XG5cdH1cblxuXHRmdW5jdGlvbiBmaW5kKGFyciwgdmFsdWUpIHtcblx0ICB2YXIgbGVuZ3RoID0gYXJyLmxlbmd0aCxcblx0ICAgICAgaSA9IHVuZGVmaW5lZDtcblx0ICBmb3IgKGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcblx0ICAgIGlmIChhcnJbaV0gPT09IHZhbHVlKSB7XG5cdCAgICAgIHJldHVybiBpO1xuXHQgICAgfVxuXHQgIH1cblx0ICByZXR1cm4gLTE7XG5cdH1cblxuXHRmdW5jdGlvbiBmaW5kQnlQcmVkKGFyciwgcHJlZCkge1xuXHQgIHZhciBsZW5ndGggPSBhcnIubGVuZ3RoLFxuXHQgICAgICBpID0gdW5kZWZpbmVkO1xuXHQgIGZvciAoaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuXHQgICAgaWYgKHByZWQoYXJyW2ldKSkge1xuXHQgICAgICByZXR1cm4gaTtcblx0ICAgIH1cblx0ICB9XG5cdCAgcmV0dXJuIC0xO1xuXHR9XG5cblx0ZnVuY3Rpb24gY2xvbmVBcnJheShpbnB1dCkge1xuXHQgIHZhciBsZW5ndGggPSBpbnB1dC5sZW5ndGgsXG5cdCAgICAgIHJlc3VsdCA9IG5ldyBBcnJheShsZW5ndGgpLFxuXHQgICAgICBpID0gdW5kZWZpbmVkO1xuXHQgIGZvciAoaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuXHQgICAgcmVzdWx0W2ldID0gaW5wdXRbaV07XG5cdCAgfVxuXHQgIHJldHVybiByZXN1bHQ7XG5cdH1cblxuXHRmdW5jdGlvbiByZW1vdmUoaW5wdXQsIGluZGV4KSB7XG5cdCAgdmFyIGxlbmd0aCA9IGlucHV0Lmxlbmd0aCxcblx0ICAgICAgcmVzdWx0ID0gdW5kZWZpbmVkLFxuXHQgICAgICBpID0gdW5kZWZpbmVkLFxuXHQgICAgICBqID0gdW5kZWZpbmVkO1xuXHQgIGlmIChpbmRleCA+PSAwICYmIGluZGV4IDwgbGVuZ3RoKSB7XG5cdCAgICBpZiAobGVuZ3RoID09PSAxKSB7XG5cdCAgICAgIHJldHVybiBbXTtcblx0ICAgIH0gZWxzZSB7XG5cdCAgICAgIHJlc3VsdCA9IG5ldyBBcnJheShsZW5ndGggLSAxKTtcblx0ICAgICAgZm9yIChpID0gMCwgaiA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuXHQgICAgICAgIGlmIChpICE9PSBpbmRleCkge1xuXHQgICAgICAgICAgcmVzdWx0W2pdID0gaW5wdXRbaV07XG5cdCAgICAgICAgICBqKys7XG5cdCAgICAgICAgfVxuXHQgICAgICB9XG5cdCAgICAgIHJldHVybiByZXN1bHQ7XG5cdCAgICB9XG5cdCAgfSBlbHNlIHtcblx0ICAgIHJldHVybiBpbnB1dDtcblx0ICB9XG5cdH1cblxuXHRmdW5jdGlvbiByZW1vdmVCeVByZWQoaW5wdXQsIHByZWQpIHtcblx0ICByZXR1cm4gcmVtb3ZlKGlucHV0LCBmaW5kQnlQcmVkKGlucHV0LCBwcmVkKSk7XG5cdH1cblxuXHRmdW5jdGlvbiBtYXAoaW5wdXQsIGZuKSB7XG5cdCAgdmFyIGxlbmd0aCA9IGlucHV0Lmxlbmd0aCxcblx0ICAgICAgcmVzdWx0ID0gbmV3IEFycmF5KGxlbmd0aCksXG5cdCAgICAgIGkgPSB1bmRlZmluZWQ7XG5cdCAgZm9yIChpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG5cdCAgICByZXN1bHRbaV0gPSBmbihpbnB1dFtpXSk7XG5cdCAgfVxuXHQgIHJldHVybiByZXN1bHQ7XG5cdH1cblxuXHRmdW5jdGlvbiBmb3JFYWNoKGFyciwgZm4pIHtcblx0ICB2YXIgbGVuZ3RoID0gYXJyLmxlbmd0aCxcblx0ICAgICAgaSA9IHVuZGVmaW5lZDtcblx0ICBmb3IgKGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcblx0ICAgIGZuKGFycltpXSk7XG5cdCAgfVxuXHR9XG5cblx0ZnVuY3Rpb24gZmlsbEFycmF5KGFyciwgdmFsdWUpIHtcblx0ICB2YXIgbGVuZ3RoID0gYXJyLmxlbmd0aCxcblx0ICAgICAgaSA9IHVuZGVmaW5lZDtcblx0ICBmb3IgKGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcblx0ICAgIGFycltpXSA9IHZhbHVlO1xuXHQgIH1cblx0fVxuXG5cdGZ1bmN0aW9uIGNvbnRhaW5zKGFyciwgdmFsdWUpIHtcblx0ICByZXR1cm4gZmluZChhcnIsIHZhbHVlKSAhPT0gLTE7XG5cdH1cblxuXHRmdW5jdGlvbiBzbGlkZShjdXIsIG5leHQsIG1heCkge1xuXHQgIHZhciBsZW5ndGggPSBNYXRoLm1pbihtYXgsIGN1ci5sZW5ndGggKyAxKSxcblx0ICAgICAgb2Zmc2V0ID0gY3VyLmxlbmd0aCAtIGxlbmd0aCArIDEsXG5cdCAgICAgIHJlc3VsdCA9IG5ldyBBcnJheShsZW5ndGgpLFxuXHQgICAgICBpID0gdW5kZWZpbmVkO1xuXHQgIGZvciAoaSA9IG9mZnNldDsgaSA8IGxlbmd0aDsgaSsrKSB7XG5cdCAgICByZXN1bHRbaSAtIG9mZnNldF0gPSBjdXJbaV07XG5cdCAgfVxuXHQgIHJlc3VsdFtsZW5ndGggLSAxXSA9IG5leHQ7XG5cdCAgcmV0dXJuIHJlc3VsdDtcblx0fVxuXG5cdG1vZHVsZS5leHBvcnRzID0ge1xuXHQgIGNvbmNhdDogY29uY2F0LFxuXHQgIGNpcmNsZVNoaWZ0OiBjaXJjbGVTaGlmdCxcblx0ICBmaW5kOiBmaW5kLFxuXHQgIGZpbmRCeVByZWQ6IGZpbmRCeVByZWQsXG5cdCAgY2xvbmVBcnJheTogY2xvbmVBcnJheSxcblx0ICByZW1vdmU6IHJlbW92ZSxcblx0ICByZW1vdmVCeVByZWQ6IHJlbW92ZUJ5UHJlZCxcblx0ICBtYXA6IG1hcCxcblx0ICBmb3JFYWNoOiBmb3JFYWNoLFxuXHQgIGZpbGxBcnJheTogZmlsbEFycmF5LFxuXHQgIGNvbnRhaW5zOiBjb250YWlucyxcblx0ICBzbGlkZTogc2xpZGVcblx0fTtcblxuLyoqKi8gfSxcbi8qIDYgKi9cbi8qKiovIGZ1bmN0aW9uKG1vZHVsZSwgZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXykge1xuXG5cdCd1c2Ugc3RyaWN0JztcblxuXHR2YXIgX3JlcXVpcmUgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDIpO1xuXG5cdHZhciBpbmhlcml0ID0gX3JlcXVpcmUuaW5oZXJpdDtcblxuXHR2YXIgT2JzZXJ2YWJsZSA9IF9fd2VicGFja19yZXF1aXJlX18oMSk7XG5cblx0ZnVuY3Rpb24gU3RyZWFtKCkge1xuXHQgIE9ic2VydmFibGUuY2FsbCh0aGlzKTtcblx0fVxuXG5cdGluaGVyaXQoU3RyZWFtLCBPYnNlcnZhYmxlLCB7XG5cblx0ICBfbmFtZTogJ3N0cmVhbScsXG5cblx0ICBnZXRUeXBlOiBmdW5jdGlvbiBnZXRUeXBlKCkge1xuXHQgICAgcmV0dXJuICdzdHJlYW0nO1xuXHQgIH1cblxuXHR9KTtcblxuXHRtb2R1bGUuZXhwb3J0cyA9IFN0cmVhbTtcblxuLyoqKi8gfSxcbi8qIDcgKi9cbi8qKiovIGZ1bmN0aW9uKG1vZHVsZSwgZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXykge1xuXG5cdCd1c2Ugc3RyaWN0JztcblxuXHR2YXIgX3JlcXVpcmUgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDIpO1xuXG5cdHZhciBpbmhlcml0ID0gX3JlcXVpcmUuaW5oZXJpdDtcblxuXHR2YXIgX3JlcXVpcmUyID0gX193ZWJwYWNrX3JlcXVpcmVfXygzKTtcblxuXHR2YXIgVkFMVUUgPSBfcmVxdWlyZTIuVkFMVUU7XG5cdHZhciBFUlJPUiA9IF9yZXF1aXJlMi5FUlJPUjtcblx0dmFyIEVORCA9IF9yZXF1aXJlMi5FTkQ7XG5cblx0dmFyIF9yZXF1aXJlMyA9IF9fd2VicGFja19yZXF1aXJlX18oNCk7XG5cblx0dmFyIGNhbGxTdWJzY3JpYmVyID0gX3JlcXVpcmUzLmNhbGxTdWJzY3JpYmVyO1xuXG5cdHZhciBPYnNlcnZhYmxlID0gX193ZWJwYWNrX3JlcXVpcmVfXygxKTtcblxuXHRmdW5jdGlvbiBQcm9wZXJ0eSgpIHtcblx0ICBPYnNlcnZhYmxlLmNhbGwodGhpcyk7XG5cdCAgdGhpcy5fY3VycmVudEV2ZW50ID0gbnVsbDtcblx0fVxuXG5cdGluaGVyaXQoUHJvcGVydHksIE9ic2VydmFibGUsIHtcblxuXHQgIF9uYW1lOiAncHJvcGVydHknLFxuXG5cdCAgX2VtaXRWYWx1ZTogZnVuY3Rpb24gX2VtaXRWYWx1ZSh2YWx1ZSkge1xuXHQgICAgaWYgKHRoaXMuX2FsaXZlKSB7XG5cdCAgICAgIHRoaXMuX2N1cnJlbnRFdmVudCA9IHsgdHlwZTogVkFMVUUsIHZhbHVlOiB2YWx1ZSB9O1xuXHQgICAgICBpZiAoIXRoaXMuX2FjdGl2YXRpbmcpIHtcblx0ICAgICAgICB0aGlzLl9kaXNwYXRjaGVyLmRpc3BhdGNoKHsgdHlwZTogVkFMVUUsIHZhbHVlOiB2YWx1ZSB9KTtcblx0ICAgICAgfVxuXHQgICAgfVxuXHQgIH0sXG5cblx0ICBfZW1pdEVycm9yOiBmdW5jdGlvbiBfZW1pdEVycm9yKHZhbHVlKSB7XG5cdCAgICBpZiAodGhpcy5fYWxpdmUpIHtcblx0ICAgICAgdGhpcy5fY3VycmVudEV2ZW50ID0geyB0eXBlOiBFUlJPUiwgdmFsdWU6IHZhbHVlIH07XG5cdCAgICAgIGlmICghdGhpcy5fYWN0aXZhdGluZykge1xuXHQgICAgICAgIHRoaXMuX2Rpc3BhdGNoZXIuZGlzcGF0Y2goeyB0eXBlOiBFUlJPUiwgdmFsdWU6IHZhbHVlIH0pO1xuXHQgICAgICB9XG5cdCAgICB9XG5cdCAgfSxcblxuXHQgIF9lbWl0RW5kOiBmdW5jdGlvbiBfZW1pdEVuZCgpIHtcblx0ICAgIGlmICh0aGlzLl9hbGl2ZSkge1xuXHQgICAgICB0aGlzLl9hbGl2ZSA9IGZhbHNlO1xuXHQgICAgICBpZiAoIXRoaXMuX2FjdGl2YXRpbmcpIHtcblx0ICAgICAgICB0aGlzLl9kaXNwYXRjaGVyLmRpc3BhdGNoKHsgdHlwZTogRU5EIH0pO1xuXHQgICAgICB9XG5cdCAgICAgIHRoaXMuX2NsZWFyKCk7XG5cdCAgICB9XG5cdCAgfSxcblxuXHQgIF9vbjogZnVuY3Rpb24gX29uKHR5cGUsIGZuKSB7XG5cdCAgICBpZiAodGhpcy5fYWxpdmUpIHtcblx0ICAgICAgdGhpcy5fZGlzcGF0Y2hlci5hZGQodHlwZSwgZm4pO1xuXHQgICAgICB0aGlzLl9zZXRBY3RpdmUodHJ1ZSk7XG5cdCAgICB9XG5cdCAgICBpZiAodGhpcy5fY3VycmVudEV2ZW50ICE9PSBudWxsKSB7XG5cdCAgICAgIGNhbGxTdWJzY3JpYmVyKHR5cGUsIGZuLCB0aGlzLl9jdXJyZW50RXZlbnQpO1xuXHQgICAgfVxuXHQgICAgaWYgKCF0aGlzLl9hbGl2ZSkge1xuXHQgICAgICBjYWxsU3Vic2NyaWJlcih0eXBlLCBmbiwgeyB0eXBlOiBFTkQgfSk7XG5cdCAgICB9XG5cdCAgICByZXR1cm4gdGhpcztcblx0ICB9LFxuXG5cdCAgZ2V0VHlwZTogZnVuY3Rpb24gZ2V0VHlwZSgpIHtcblx0ICAgIHJldHVybiAncHJvcGVydHknO1xuXHQgIH1cblxuXHR9KTtcblxuXHRtb2R1bGUuZXhwb3J0cyA9IFByb3BlcnR5O1xuXG4vKioqLyB9LFxuLyogOCAqL1xuLyoqKi8gZnVuY3Rpb24obW9kdWxlLCBleHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKSB7XG5cblx0J3VzZSBzdHJpY3QnO1xuXG5cdHZhciBTdHJlYW0gPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDYpO1xuXG5cdHZhciBuZXZlclMgPSBuZXcgU3RyZWFtKCk7XG5cdG5ldmVyUy5fZW1pdEVuZCgpO1xuXHRuZXZlclMuX25hbWUgPSAnbmV2ZXInO1xuXG5cdG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gbmV2ZXIoKSB7XG5cdCAgcmV0dXJuIG5ldmVyUztcblx0fTtcblxuLyoqKi8gfSxcbi8qIDkgKi9cbi8qKiovIGZ1bmN0aW9uKG1vZHVsZSwgZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXykge1xuXG5cdCd1c2Ugc3RyaWN0JztcblxuXHR2YXIgdGltZUJhc2VkID0gX193ZWJwYWNrX3JlcXVpcmVfXygxMCk7XG5cblx0dmFyIFMgPSB0aW1lQmFzZWQoe1xuXG5cdCAgX25hbWU6ICdsYXRlcicsXG5cblx0ICBfaW5pdDogZnVuY3Rpb24gX2luaXQoX3JlZikge1xuXHQgICAgdmFyIHggPSBfcmVmLng7XG5cblx0ICAgIHRoaXMuX3ggPSB4O1xuXHQgIH0sXG5cblx0ICBfZnJlZTogZnVuY3Rpb24gX2ZyZWUoKSB7XG5cdCAgICB0aGlzLl94ID0gbnVsbDtcblx0ICB9LFxuXG5cdCAgX29uVGljazogZnVuY3Rpb24gX29uVGljaygpIHtcblx0ICAgIHRoaXMuX2VtaXRWYWx1ZSh0aGlzLl94KTtcblx0ICAgIHRoaXMuX2VtaXRFbmQoKTtcblx0ICB9XG5cblx0fSk7XG5cblx0bW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBsYXRlcih3YWl0LCB4KSB7XG5cdCAgcmV0dXJuIG5ldyBTKHdhaXQsIHsgeDogeCB9KTtcblx0fTtcblxuLyoqKi8gfSxcbi8qIDEwICovXG4vKioqLyBmdW5jdGlvbihtb2R1bGUsIGV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pIHtcblxuXHQndXNlIHN0cmljdCc7XG5cblx0dmFyIF9yZXF1aXJlID0gX193ZWJwYWNrX3JlcXVpcmVfXygyKTtcblxuXHR2YXIgaW5oZXJpdCA9IF9yZXF1aXJlLmluaGVyaXQ7XG5cblx0dmFyIFN0cmVhbSA9IF9fd2VicGFja19yZXF1aXJlX18oNik7XG5cblx0bW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiB0aW1lQmFzZWQobWl4aW4pIHtcblxuXHQgIGZ1bmN0aW9uIEFub255bW91c1N0cmVhbSh3YWl0LCBvcHRpb25zKSB7XG5cdCAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG5cdCAgICBTdHJlYW0uY2FsbCh0aGlzKTtcblx0ICAgIHRoaXMuX3dhaXQgPSB3YWl0O1xuXHQgICAgdGhpcy5faW50ZXJ2YWxJZCA9IG51bGw7XG5cdCAgICB0aGlzLl8kb25UaWNrID0gZnVuY3Rpb24gKCkge1xuXHQgICAgICByZXR1cm4gX3RoaXMuX29uVGljaygpO1xuXHQgICAgfTtcblx0ICAgIHRoaXMuX2luaXQob3B0aW9ucyk7XG5cdCAgfVxuXG5cdCAgaW5oZXJpdChBbm9ueW1vdXNTdHJlYW0sIFN0cmVhbSwge1xuXG5cdCAgICBfaW5pdDogZnVuY3Rpb24gX2luaXQoKSB7fSxcblx0ICAgIF9mcmVlOiBmdW5jdGlvbiBfZnJlZSgpIHt9LFxuXG5cdCAgICBfb25UaWNrOiBmdW5jdGlvbiBfb25UaWNrKCkge30sXG5cblx0ICAgIF9vbkFjdGl2YXRpb246IGZ1bmN0aW9uIF9vbkFjdGl2YXRpb24oKSB7XG5cdCAgICAgIHRoaXMuX2ludGVydmFsSWQgPSBzZXRJbnRlcnZhbCh0aGlzLl8kb25UaWNrLCB0aGlzLl93YWl0KTtcblx0ICAgIH0sXG5cblx0ICAgIF9vbkRlYWN0aXZhdGlvbjogZnVuY3Rpb24gX29uRGVhY3RpdmF0aW9uKCkge1xuXHQgICAgICBpZiAodGhpcy5faW50ZXJ2YWxJZCAhPT0gbnVsbCkge1xuXHQgICAgICAgIGNsZWFySW50ZXJ2YWwodGhpcy5faW50ZXJ2YWxJZCk7XG5cdCAgICAgICAgdGhpcy5faW50ZXJ2YWxJZCA9IG51bGw7XG5cdCAgICAgIH1cblx0ICAgIH0sXG5cblx0ICAgIF9jbGVhcjogZnVuY3Rpb24gX2NsZWFyKCkge1xuXHQgICAgICBTdHJlYW0ucHJvdG90eXBlLl9jbGVhci5jYWxsKHRoaXMpO1xuXHQgICAgICB0aGlzLl8kb25UaWNrID0gbnVsbDtcblx0ICAgICAgdGhpcy5fZnJlZSgpO1xuXHQgICAgfVxuXG5cdCAgfSwgbWl4aW4pO1xuXG5cdCAgcmV0dXJuIEFub255bW91c1N0cmVhbTtcblx0fTtcblxuLyoqKi8gfSxcbi8qIDExICovXG4vKioqLyBmdW5jdGlvbihtb2R1bGUsIGV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pIHtcblxuXHQndXNlIHN0cmljdCc7XG5cblx0dmFyIHRpbWVCYXNlZCA9IF9fd2VicGFja19yZXF1aXJlX18oMTApO1xuXG5cdHZhciBTID0gdGltZUJhc2VkKHtcblxuXHQgIF9uYW1lOiAnaW50ZXJ2YWwnLFxuXG5cdCAgX2luaXQ6IGZ1bmN0aW9uIF9pbml0KF9yZWYpIHtcblx0ICAgIHZhciB4ID0gX3JlZi54O1xuXG5cdCAgICB0aGlzLl94ID0geDtcblx0ICB9LFxuXG5cdCAgX2ZyZWU6IGZ1bmN0aW9uIF9mcmVlKCkge1xuXHQgICAgdGhpcy5feCA9IG51bGw7XG5cdCAgfSxcblxuXHQgIF9vblRpY2s6IGZ1bmN0aW9uIF9vblRpY2soKSB7XG5cdCAgICB0aGlzLl9lbWl0VmFsdWUodGhpcy5feCk7XG5cdCAgfVxuXG5cdH0pO1xuXG5cdG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gaW50ZXJ2YWwod2FpdCwgeCkge1xuXHQgIHJldHVybiBuZXcgUyh3YWl0LCB7IHg6IHggfSk7XG5cdH07XG5cbi8qKiovIH0sXG4vKiAxMiAqL1xuLyoqKi8gZnVuY3Rpb24obW9kdWxlLCBleHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKSB7XG5cblx0J3VzZSBzdHJpY3QnO1xuXG5cdHZhciB0aW1lQmFzZWQgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDEwKTtcblxuXHR2YXIgX3JlcXVpcmUgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDUpO1xuXG5cdHZhciBjbG9uZUFycmF5ID0gX3JlcXVpcmUuY2xvbmVBcnJheTtcblxuXHR2YXIgbmV2ZXIgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDgpO1xuXG5cdHZhciBTID0gdGltZUJhc2VkKHtcblxuXHQgIF9uYW1lOiAnc2VxdWVudGlhbGx5JyxcblxuXHQgIF9pbml0OiBmdW5jdGlvbiBfaW5pdChfcmVmKSB7XG5cdCAgICB2YXIgeHMgPSBfcmVmLnhzO1xuXG5cdCAgICB0aGlzLl94cyA9IGNsb25lQXJyYXkoeHMpO1xuXHQgIH0sXG5cblx0ICBfZnJlZTogZnVuY3Rpb24gX2ZyZWUoKSB7XG5cdCAgICB0aGlzLl94cyA9IG51bGw7XG5cdCAgfSxcblxuXHQgIF9vblRpY2s6IGZ1bmN0aW9uIF9vblRpY2soKSB7XG5cdCAgICBpZiAodGhpcy5feHMubGVuZ3RoID09PSAxKSB7XG5cdCAgICAgIHRoaXMuX2VtaXRWYWx1ZSh0aGlzLl94c1swXSk7XG5cdCAgICAgIHRoaXMuX2VtaXRFbmQoKTtcblx0ICAgIH0gZWxzZSB7XG5cdCAgICAgIHRoaXMuX2VtaXRWYWx1ZSh0aGlzLl94cy5zaGlmdCgpKTtcblx0ICAgIH1cblx0ICB9XG5cblx0fSk7XG5cblx0bW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBzZXF1ZW50aWFsbHkod2FpdCwgeHMpIHtcblx0ICByZXR1cm4geHMubGVuZ3RoID09PSAwID8gbmV2ZXIoKSA6IG5ldyBTKHdhaXQsIHsgeHM6IHhzIH0pO1xuXHR9O1xuXG4vKioqLyB9LFxuLyogMTMgKi9cbi8qKiovIGZ1bmN0aW9uKG1vZHVsZSwgZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXykge1xuXG5cdCd1c2Ugc3RyaWN0JztcblxuXHR2YXIgdGltZUJhc2VkID0gX193ZWJwYWNrX3JlcXVpcmVfXygxMCk7XG5cblx0dmFyIFMgPSB0aW1lQmFzZWQoe1xuXG5cdCAgX25hbWU6ICdmcm9tUG9sbCcsXG5cblx0ICBfaW5pdDogZnVuY3Rpb24gX2luaXQoX3JlZikge1xuXHQgICAgdmFyIGZuID0gX3JlZi5mbjtcblxuXHQgICAgdGhpcy5fZm4gPSBmbjtcblx0ICB9LFxuXG5cdCAgX2ZyZWU6IGZ1bmN0aW9uIF9mcmVlKCkge1xuXHQgICAgdGhpcy5fZm4gPSBudWxsO1xuXHQgIH0sXG5cblx0ICBfb25UaWNrOiBmdW5jdGlvbiBfb25UaWNrKCkge1xuXHQgICAgdmFyIGZuID0gdGhpcy5fZm47XG5cdCAgICB0aGlzLl9lbWl0VmFsdWUoZm4oKSk7XG5cdCAgfVxuXG5cdH0pO1xuXG5cdG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gZnJvbVBvbGwod2FpdCwgZm4pIHtcblx0ICByZXR1cm4gbmV3IFMod2FpdCwgeyBmbjogZm4gfSk7XG5cdH07XG5cbi8qKiovIH0sXG4vKiAxNCAqL1xuLyoqKi8gZnVuY3Rpb24obW9kdWxlLCBleHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKSB7XG5cblx0J3VzZSBzdHJpY3QnO1xuXG5cdHZhciB0aW1lQmFzZWQgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDEwKTtcblx0dmFyIGVtaXR0ZXIgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDE1KTtcblxuXHR2YXIgUyA9IHRpbWVCYXNlZCh7XG5cblx0ICBfbmFtZTogJ3dpdGhJbnRlcnZhbCcsXG5cblx0ICBfaW5pdDogZnVuY3Rpb24gX2luaXQoX3JlZikge1xuXHQgICAgdmFyIGZuID0gX3JlZi5mbjtcblxuXHQgICAgdGhpcy5fZm4gPSBmbjtcblx0ICAgIHRoaXMuX2VtaXR0ZXIgPSBlbWl0dGVyKHRoaXMpO1xuXHQgIH0sXG5cblx0ICBfZnJlZTogZnVuY3Rpb24gX2ZyZWUoKSB7XG5cdCAgICB0aGlzLl9mbiA9IG51bGw7XG5cdCAgICB0aGlzLl9lbWl0dGVyID0gbnVsbDtcblx0ICB9LFxuXG5cdCAgX29uVGljazogZnVuY3Rpb24gX29uVGljaygpIHtcblx0ICAgIHZhciBmbiA9IHRoaXMuX2ZuO1xuXHQgICAgZm4odGhpcy5fZW1pdHRlcik7XG5cdCAgfVxuXG5cdH0pO1xuXG5cdG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gd2l0aEludGVydmFsKHdhaXQsIGZuKSB7XG5cdCAgcmV0dXJuIG5ldyBTKHdhaXQsIHsgZm46IGZuIH0pO1xuXHR9O1xuXG4vKioqLyB9LFxuLyogMTUgKi9cbi8qKiovIGZ1bmN0aW9uKG1vZHVsZSwgZXhwb3J0cykge1xuXG5cdFwidXNlIHN0cmljdFwiO1xuXG5cdG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gZW1pdHRlcihvYnMpIHtcblxuXHQgIGZ1bmN0aW9uIHZhbHVlKHgpIHtcblx0ICAgIG9icy5fZW1pdFZhbHVlKHgpO1xuXHQgICAgcmV0dXJuIG9icy5fYWN0aXZlO1xuXHQgIH1cblxuXHQgIGZ1bmN0aW9uIGVycm9yKHgpIHtcblx0ICAgIG9icy5fZW1pdEVycm9yKHgpO1xuXHQgICAgcmV0dXJuIG9icy5fYWN0aXZlO1xuXHQgIH1cblxuXHQgIGZ1bmN0aW9uIGVuZCgpIHtcblx0ICAgIG9icy5fZW1pdEVuZCgpO1xuXHQgICAgcmV0dXJuIG9icy5fYWN0aXZlO1xuXHQgIH1cblxuXHQgIGZ1bmN0aW9uIGV2ZW50KGUpIHtcblx0ICAgIG9icy5fZW1pdChlLnR5cGUsIGUudmFsdWUpO1xuXHQgICAgcmV0dXJuIG9icy5fYWN0aXZlO1xuXHQgIH1cblxuXHQgIHJldHVybiB7IHZhbHVlOiB2YWx1ZSwgZXJyb3I6IGVycm9yLCBlbmQ6IGVuZCwgZXZlbnQ6IGV2ZW50LCBlbWl0OiB2YWx1ZSwgZW1pdEV2ZW50OiBldmVudCB9O1xuXHR9O1xuXG4vKioqLyB9LFxuLyogMTYgKi9cbi8qKiovIGZ1bmN0aW9uKG1vZHVsZSwgZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXykge1xuXG5cdCd1c2Ugc3RyaWN0JztcblxuXHR2YXIgc3RyZWFtID0gX193ZWJwYWNrX3JlcXVpcmVfXygxNyk7XG5cblx0bW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBmcm9tQ2FsbGJhY2soY2FsbGJhY2tDb25zdW1lcikge1xuXG5cdCAgdmFyIGNhbGxlZCA9IGZhbHNlO1xuXG5cdCAgcmV0dXJuIHN0cmVhbShmdW5jdGlvbiAoZW1pdHRlcikge1xuXG5cdCAgICBpZiAoIWNhbGxlZCkge1xuXHQgICAgICBjYWxsYmFja0NvbnN1bWVyKGZ1bmN0aW9uICh4KSB7XG5cdCAgICAgICAgZW1pdHRlci5lbWl0KHgpO1xuXHQgICAgICAgIGVtaXR0ZXIuZW5kKCk7XG5cdCAgICAgIH0pO1xuXHQgICAgICBjYWxsZWQgPSB0cnVlO1xuXHQgICAgfVxuXHQgIH0pLnNldE5hbWUoJ2Zyb21DYWxsYmFjaycpO1xuXHR9O1xuXG4vKioqLyB9LFxuLyogMTcgKi9cbi8qKiovIGZ1bmN0aW9uKG1vZHVsZSwgZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXykge1xuXG5cdCd1c2Ugc3RyaWN0JztcblxuXHR2YXIgX3JlcXVpcmUgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDIpO1xuXG5cdHZhciBpbmhlcml0ID0gX3JlcXVpcmUuaW5oZXJpdDtcblxuXHR2YXIgU3RyZWFtID0gX193ZWJwYWNrX3JlcXVpcmVfXyg2KTtcblx0dmFyIGVtaXR0ZXIgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDE1KTtcblxuXHRmdW5jdGlvbiBTKGZuKSB7XG5cdCAgU3RyZWFtLmNhbGwodGhpcyk7XG5cdCAgdGhpcy5fZm4gPSBmbjtcblx0ICB0aGlzLl91bnN1YnNjcmliZSA9IG51bGw7XG5cdH1cblxuXHRpbmhlcml0KFMsIFN0cmVhbSwge1xuXG5cdCAgX25hbWU6ICdzdHJlYW0nLFxuXG5cdCAgX29uQWN0aXZhdGlvbjogZnVuY3Rpb24gX29uQWN0aXZhdGlvbigpIHtcblx0ICAgIHZhciBmbiA9IHRoaXMuX2ZuO1xuXHQgICAgdmFyIHVuc3Vic2NyaWJlID0gZm4oZW1pdHRlcih0aGlzKSk7XG5cdCAgICB0aGlzLl91bnN1YnNjcmliZSA9IHR5cGVvZiB1bnN1YnNjcmliZSA9PT0gJ2Z1bmN0aW9uJyA/IHVuc3Vic2NyaWJlIDogbnVsbDtcblxuXHQgICAgLy8gZml4IGh0dHBzOi8vZ2l0aHViLmNvbS9ycG9taW5vdi9rZWZpci9pc3N1ZXMvMzVcblx0ICAgIGlmICghdGhpcy5fYWN0aXZlKSB7XG5cdCAgICAgIHRoaXMuX2NhbGxVbnN1YnNjcmliZSgpO1xuXHQgICAgfVxuXHQgIH0sXG5cblx0ICBfY2FsbFVuc3Vic2NyaWJlOiBmdW5jdGlvbiBfY2FsbFVuc3Vic2NyaWJlKCkge1xuXHQgICAgaWYgKHRoaXMuX3Vuc3Vic2NyaWJlICE9PSBudWxsKSB7XG5cdCAgICAgIHRoaXMuX3Vuc3Vic2NyaWJlKCk7XG5cdCAgICAgIHRoaXMuX3Vuc3Vic2NyaWJlID0gbnVsbDtcblx0ICAgIH1cblx0ICB9LFxuXG5cdCAgX29uRGVhY3RpdmF0aW9uOiBmdW5jdGlvbiBfb25EZWFjdGl2YXRpb24oKSB7XG5cdCAgICB0aGlzLl9jYWxsVW5zdWJzY3JpYmUoKTtcblx0ICB9LFxuXG5cdCAgX2NsZWFyOiBmdW5jdGlvbiBfY2xlYXIoKSB7XG5cdCAgICBTdHJlYW0ucHJvdG90eXBlLl9jbGVhci5jYWxsKHRoaXMpO1xuXHQgICAgdGhpcy5fZm4gPSBudWxsO1xuXHQgIH1cblxuXHR9KTtcblxuXHRtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIHN0cmVhbShmbikge1xuXHQgIHJldHVybiBuZXcgUyhmbik7XG5cdH07XG5cbi8qKiovIH0sXG4vKiAxOCAqL1xuLyoqKi8gZnVuY3Rpb24obW9kdWxlLCBleHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKSB7XG5cblx0J3VzZSBzdHJpY3QnO1xuXG5cdHZhciBzdHJlYW0gPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDE3KTtcblxuXHRtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGZyb21Ob2RlQ2FsbGJhY2soY2FsbGJhY2tDb25zdW1lcikge1xuXG5cdCAgdmFyIGNhbGxlZCA9IGZhbHNlO1xuXG5cdCAgcmV0dXJuIHN0cmVhbShmdW5jdGlvbiAoZW1pdHRlcikge1xuXG5cdCAgICBpZiAoIWNhbGxlZCkge1xuXHQgICAgICBjYWxsYmFja0NvbnN1bWVyKGZ1bmN0aW9uIChlcnJvciwgeCkge1xuXHQgICAgICAgIGlmIChlcnJvcikge1xuXHQgICAgICAgICAgZW1pdHRlci5lcnJvcihlcnJvcik7XG5cdCAgICAgICAgfSBlbHNlIHtcblx0ICAgICAgICAgIGVtaXR0ZXIuZW1pdCh4KTtcblx0ICAgICAgICB9XG5cdCAgICAgICAgZW1pdHRlci5lbmQoKTtcblx0ICAgICAgfSk7XG5cdCAgICAgIGNhbGxlZCA9IHRydWU7XG5cdCAgICB9XG5cdCAgfSkuc2V0TmFtZSgnZnJvbU5vZGVDYWxsYmFjaycpO1xuXHR9O1xuXG4vKioqLyB9LFxuLyogMTkgKi9cbi8qKiovIGZ1bmN0aW9uKG1vZHVsZSwgZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXykge1xuXG5cdCd1c2Ugc3RyaWN0JztcblxuXHR2YXIgZnJvbVN1YlVuc3ViID0gX193ZWJwYWNrX3JlcXVpcmVfXygyMCk7XG5cblx0dmFyIHBhaXJzID0gW1snYWRkRXZlbnRMaXN0ZW5lcicsICdyZW1vdmVFdmVudExpc3RlbmVyJ10sIFsnYWRkTGlzdGVuZXInLCAncmVtb3ZlTGlzdGVuZXInXSwgWydvbicsICdvZmYnXV07XG5cblx0bW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBmcm9tRXZlbnRzKHRhcmdldCwgZXZlbnROYW1lLCB0cmFuc2Zvcm1lcikge1xuXHQgIHZhciBzdWIgPSB1bmRlZmluZWQsXG5cdCAgICAgIHVuc3ViID0gdW5kZWZpbmVkO1xuXG5cdCAgZm9yICh2YXIgaSA9IDA7IGkgPCBwYWlycy5sZW5ndGg7IGkrKykge1xuXHQgICAgaWYgKHR5cGVvZiB0YXJnZXRbcGFpcnNbaV1bMF1dID09PSAnZnVuY3Rpb24nICYmIHR5cGVvZiB0YXJnZXRbcGFpcnNbaV1bMV1dID09PSAnZnVuY3Rpb24nKSB7XG5cdCAgICAgIHN1YiA9IHBhaXJzW2ldWzBdO1xuXHQgICAgICB1bnN1YiA9IHBhaXJzW2ldWzFdO1xuXHQgICAgICBicmVhaztcblx0ICAgIH1cblx0ICB9XG5cblx0ICBpZiAoc3ViID09PSB1bmRlZmluZWQpIHtcblx0ICAgIHRocm93IG5ldyBFcnJvcigndGFyZ2V0IGRvblxcJ3Qgc3VwcG9ydCBhbnkgb2YgJyArICdhZGRFdmVudExpc3RlbmVyL3JlbW92ZUV2ZW50TGlzdGVuZXIsIGFkZExpc3RlbmVyL3JlbW92ZUxpc3RlbmVyLCBvbi9vZmYgbWV0aG9kIHBhaXInKTtcblx0ICB9XG5cblx0ICByZXR1cm4gZnJvbVN1YlVuc3ViKGZ1bmN0aW9uIChoYW5kbGVyKSB7XG5cdCAgICByZXR1cm4gdGFyZ2V0W3N1Yl0oZXZlbnROYW1lLCBoYW5kbGVyKTtcblx0ICB9LCBmdW5jdGlvbiAoaGFuZGxlcikge1xuXHQgICAgcmV0dXJuIHRhcmdldFt1bnN1Yl0oZXZlbnROYW1lLCBoYW5kbGVyKTtcblx0ICB9LCB0cmFuc2Zvcm1lcikuc2V0TmFtZSgnZnJvbUV2ZW50cycpO1xuXHR9O1xuXG4vKioqLyB9LFxuLyogMjAgKi9cbi8qKiovIGZ1bmN0aW9uKG1vZHVsZSwgZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXykge1xuXG5cdCd1c2Ugc3RyaWN0JztcblxuXHR2YXIgc3RyZWFtID0gX193ZWJwYWNrX3JlcXVpcmVfXygxNyk7XG5cblx0dmFyIF9yZXF1aXJlID0gX193ZWJwYWNrX3JlcXVpcmVfXygyMSk7XG5cblx0dmFyIGFwcGx5ID0gX3JlcXVpcmUuYXBwbHk7XG5cblx0bW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBmcm9tU3ViVW5zdWIoc3ViLCB1bnN1YiwgdHJhbnNmb3JtZXIgLyogRnVuY3Rpb24gfCBmYWxzZXkgKi8pIHtcblx0ICByZXR1cm4gc3RyZWFtKGZ1bmN0aW9uIChlbWl0dGVyKSB7XG5cblx0ICAgIHZhciBoYW5kbGVyID0gdHJhbnNmb3JtZXIgPyBmdW5jdGlvbiAoKSB7XG5cdCAgICAgIGVtaXR0ZXIuZW1pdChhcHBseSh0cmFuc2Zvcm1lciwgdGhpcywgYXJndW1lbnRzKSk7XG5cdCAgICB9IDogZnVuY3Rpb24gKHgpIHtcblx0ICAgICAgZW1pdHRlci5lbWl0KHgpO1xuXHQgICAgfTtcblxuXHQgICAgc3ViKGhhbmRsZXIpO1xuXHQgICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcblx0ICAgICAgcmV0dXJuIHVuc3ViKGhhbmRsZXIpO1xuXHQgICAgfTtcblx0ICB9KS5zZXROYW1lKCdmcm9tU3ViVW5zdWInKTtcblx0fTtcblxuLyoqKi8gfSxcbi8qIDIxICovXG4vKioqLyBmdW5jdGlvbihtb2R1bGUsIGV4cG9ydHMpIHtcblxuXHRcInVzZSBzdHJpY3RcIjtcblxuXHRmdW5jdGlvbiBzcHJlYWQoZm4sIGxlbmd0aCkge1xuXHQgIHN3aXRjaCAobGVuZ3RoKSB7XG5cdCAgICBjYXNlIDA6XG5cdCAgICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG5cdCAgICAgICAgcmV0dXJuIGZuKCk7XG5cdCAgICAgIH07XG5cdCAgICBjYXNlIDE6XG5cdCAgICAgIHJldHVybiBmdW5jdGlvbiAoYSkge1xuXHQgICAgICAgIHJldHVybiBmbihhWzBdKTtcblx0ICAgICAgfTtcblx0ICAgIGNhc2UgMjpcblx0ICAgICAgcmV0dXJuIGZ1bmN0aW9uIChhKSB7XG5cdCAgICAgICAgcmV0dXJuIGZuKGFbMF0sIGFbMV0pO1xuXHQgICAgICB9O1xuXHQgICAgY2FzZSAzOlxuXHQgICAgICByZXR1cm4gZnVuY3Rpb24gKGEpIHtcblx0ICAgICAgICByZXR1cm4gZm4oYVswXSwgYVsxXSwgYVsyXSk7XG5cdCAgICAgIH07XG5cdCAgICBjYXNlIDQ6XG5cdCAgICAgIHJldHVybiBmdW5jdGlvbiAoYSkge1xuXHQgICAgICAgIHJldHVybiBmbihhWzBdLCBhWzFdLCBhWzJdLCBhWzNdKTtcblx0ICAgICAgfTtcblx0ICAgIGRlZmF1bHQ6XG5cdCAgICAgIHJldHVybiBmdW5jdGlvbiAoYSkge1xuXHQgICAgICAgIHJldHVybiBmbi5hcHBseShudWxsLCBhKTtcblx0ICAgICAgfTtcblx0ICB9XG5cdH1cblxuXHRmdW5jdGlvbiBhcHBseShmbiwgYywgYSkge1xuXHQgIHZhciBhTGVuZ3RoID0gYSA/IGEubGVuZ3RoIDogMDtcblx0ICBpZiAoYyA9PSBudWxsKSB7XG5cdCAgICBzd2l0Y2ggKGFMZW5ndGgpIHtcblx0ICAgICAgY2FzZSAwOlxuXHQgICAgICAgIHJldHVybiBmbigpO1xuXHQgICAgICBjYXNlIDE6XG5cdCAgICAgICAgcmV0dXJuIGZuKGFbMF0pO1xuXHQgICAgICBjYXNlIDI6XG5cdCAgICAgICAgcmV0dXJuIGZuKGFbMF0sIGFbMV0pO1xuXHQgICAgICBjYXNlIDM6XG5cdCAgICAgICAgcmV0dXJuIGZuKGFbMF0sIGFbMV0sIGFbMl0pO1xuXHQgICAgICBjYXNlIDQ6XG5cdCAgICAgICAgcmV0dXJuIGZuKGFbMF0sIGFbMV0sIGFbMl0sIGFbM10pO1xuXHQgICAgICBkZWZhdWx0OlxuXHQgICAgICAgIHJldHVybiBmbi5hcHBseShudWxsLCBhKTtcblx0ICAgIH1cblx0ICB9IGVsc2Uge1xuXHQgICAgc3dpdGNoIChhTGVuZ3RoKSB7XG5cdCAgICAgIGNhc2UgMDpcblx0ICAgICAgICByZXR1cm4gZm4uY2FsbChjKTtcblx0ICAgICAgZGVmYXVsdDpcblx0ICAgICAgICByZXR1cm4gZm4uYXBwbHkoYywgYSk7XG5cdCAgICB9XG5cdCAgfVxuXHR9XG5cblx0bW9kdWxlLmV4cG9ydHMgPSB7IHNwcmVhZDogc3ByZWFkLCBhcHBseTogYXBwbHkgfTtcblxuLyoqKi8gfSxcbi8qIDIyICovXG4vKioqLyBmdW5jdGlvbihtb2R1bGUsIGV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pIHtcblxuXHQndXNlIHN0cmljdCc7XG5cblx0dmFyIF9yZXF1aXJlID0gX193ZWJwYWNrX3JlcXVpcmVfXygyKTtcblxuXHR2YXIgaW5oZXJpdCA9IF9yZXF1aXJlLmluaGVyaXQ7XG5cblx0dmFyIFByb3BlcnR5ID0gX193ZWJwYWNrX3JlcXVpcmVfXyg3KTtcblxuXHQvLyBIQUNLOlxuXHQvLyAgIFdlIGRvbid0IGNhbGwgcGFyZW50IENsYXNzIGNvbnN0cnVjdG9yLCBidXQgaW5zdGVhZCBwdXR0aW5nIGFsbCBuZWNlc3Nhcnlcblx0Ly8gICBwcm9wZXJ0aWVzIGludG8gcHJvdG90eXBlIHRvIHNpbXVsYXRlIGVuZGVkIFByb3BlcnR5XG5cdC8vICAgKHNlZSBQcm9wcGVydHkgYW5kIE9ic2VydmFibGUgY2xhc3NlcykuXG5cblx0ZnVuY3Rpb24gUCh2YWx1ZSkge1xuXHQgIHRoaXMuX2N1cnJlbnRFdmVudCA9IHsgdHlwZTogJ3ZhbHVlJywgdmFsdWU6IHZhbHVlLCBjdXJyZW50OiB0cnVlIH07XG5cdH1cblxuXHRpbmhlcml0KFAsIFByb3BlcnR5LCB7XG5cdCAgX25hbWU6ICdjb25zdGFudCcsXG5cdCAgX2FjdGl2ZTogZmFsc2UsXG5cdCAgX2FjdGl2YXRpbmc6IGZhbHNlLFxuXHQgIF9hbGl2ZTogZmFsc2UsXG5cdCAgX2Rpc3BhdGNoZXI6IG51bGwsXG5cdCAgX2xvZ0hhbmRsZXJzOiBudWxsXG5cdH0pO1xuXG5cdG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gY29uc3RhbnQoeCkge1xuXHQgIHJldHVybiBuZXcgUCh4KTtcblx0fTtcblxuLyoqKi8gfSxcbi8qIDIzICovXG4vKioqLyBmdW5jdGlvbihtb2R1bGUsIGV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pIHtcblxuXHQndXNlIHN0cmljdCc7XG5cblx0dmFyIF9yZXF1aXJlID0gX193ZWJwYWNrX3JlcXVpcmVfXygyKTtcblxuXHR2YXIgaW5oZXJpdCA9IF9yZXF1aXJlLmluaGVyaXQ7XG5cblx0dmFyIFByb3BlcnR5ID0gX193ZWJwYWNrX3JlcXVpcmVfXyg3KTtcblxuXHQvLyBIQUNLOlxuXHQvLyAgIFdlIGRvbid0IGNhbGwgcGFyZW50IENsYXNzIGNvbnN0cnVjdG9yLCBidXQgaW5zdGVhZCBwdXR0aW5nIGFsbCBuZWNlc3Nhcnlcblx0Ly8gICBwcm9wZXJ0aWVzIGludG8gcHJvdG90eXBlIHRvIHNpbXVsYXRlIGVuZGVkIFByb3BlcnR5XG5cdC8vICAgKHNlZSBQcm9wcGVydHkgYW5kIE9ic2VydmFibGUgY2xhc3NlcykuXG5cblx0ZnVuY3Rpb24gUCh2YWx1ZSkge1xuXHQgIHRoaXMuX2N1cnJlbnRFdmVudCA9IHsgdHlwZTogJ2Vycm9yJywgdmFsdWU6IHZhbHVlLCBjdXJyZW50OiB0cnVlIH07XG5cdH1cblxuXHRpbmhlcml0KFAsIFByb3BlcnR5LCB7XG5cdCAgX25hbWU6ICdjb25zdGFudEVycm9yJyxcblx0ICBfYWN0aXZlOiBmYWxzZSxcblx0ICBfYWN0aXZhdGluZzogZmFsc2UsXG5cdCAgX2FsaXZlOiBmYWxzZSxcblx0ICBfZGlzcGF0Y2hlcjogbnVsbCxcblx0ICBfbG9nSGFuZGxlcnM6IG51bGxcblx0fSk7XG5cblx0bW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBjb25zdGFudEVycm9yKHgpIHtcblx0ICByZXR1cm4gbmV3IFAoeCk7XG5cdH07XG5cbi8qKiovIH0sXG4vKiAyNCAqL1xuLyoqKi8gZnVuY3Rpb24obW9kdWxlLCBleHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKSB7XG5cblx0J3VzZSBzdHJpY3QnO1xuXG5cdHZhciBfcmVxdWlyZSA9IF9fd2VicGFja19yZXF1aXJlX18oMjUpO1xuXG5cdHZhciBjcmVhdGVQcm9wZXJ0eSA9IF9yZXF1aXJlLmNyZWF0ZVByb3BlcnR5O1xuXG5cdHZhciBQID0gY3JlYXRlUHJvcGVydHkoJ3RvUHJvcGVydHknLCB7XG5cblx0ICBfaW5pdDogZnVuY3Rpb24gX2luaXQoX3JlZikge1xuXHQgICAgdmFyIGZuID0gX3JlZi5mbjtcblxuXHQgICAgdGhpcy5fZ2V0SW5pdGlhbEN1cnJlbnQgPSBmbjtcblx0ICB9LFxuXG5cdCAgX29uQWN0aXZhdGlvbjogZnVuY3Rpb24gX29uQWN0aXZhdGlvbigpIHtcblx0ICAgIGlmICh0aGlzLl9nZXRJbml0aWFsQ3VycmVudCAhPT0gbnVsbCkge1xuXHQgICAgICB2YXIgZ2V0SW5pdGlhbCA9IHRoaXMuX2dldEluaXRpYWxDdXJyZW50O1xuXHQgICAgICB0aGlzLl9lbWl0VmFsdWUoZ2V0SW5pdGlhbCgpKTtcblx0ICAgIH1cblx0ICAgIHRoaXMuX3NvdXJjZS5vbkFueSh0aGlzLl8kaGFuZGxlQW55KTsgLy8gY29waWVkIGZyb20gcGF0dGVybnMvb25lLXNvdXJjZVxuXHQgIH1cblxuXHR9KTtcblxuXHRtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIHRvUHJvcGVydHkob2JzKSB7XG5cdCAgdmFyIGZuID0gYXJndW1lbnRzLmxlbmd0aCA8PSAxIHx8IGFyZ3VtZW50c1sxXSA9PT0gdW5kZWZpbmVkID8gbnVsbCA6IGFyZ3VtZW50c1sxXTtcblxuXHQgIGlmIChmbiAhPT0gbnVsbCAmJiB0eXBlb2YgZm4gIT09ICdmdW5jdGlvbicpIHtcblx0ICAgIHRocm93IG5ldyBFcnJvcignWW91IHNob3VsZCBjYWxsIHRvUHJvcGVydHkoKSB3aXRoIGEgZnVuY3Rpb24gb3Igbm8gYXJndW1lbnRzLicpO1xuXHQgIH1cblx0ICByZXR1cm4gbmV3IFAob2JzLCB7IGZuOiBmbiB9KTtcblx0fTtcblxuLyoqKi8gfSxcbi8qIDI1ICovXG4vKioqLyBmdW5jdGlvbihtb2R1bGUsIGV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pIHtcblxuXHQndXNlIHN0cmljdCc7XG5cblx0dmFyIFN0cmVhbSA9IF9fd2VicGFja19yZXF1aXJlX18oNik7XG5cdHZhciBQcm9wZXJ0eSA9IF9fd2VicGFja19yZXF1aXJlX18oNyk7XG5cblx0dmFyIF9yZXF1aXJlID0gX193ZWJwYWNrX3JlcXVpcmVfXygyKTtcblxuXHR2YXIgaW5oZXJpdCA9IF9yZXF1aXJlLmluaGVyaXQ7XG5cblx0dmFyIF9yZXF1aXJlMiA9IF9fd2VicGFja19yZXF1aXJlX18oMyk7XG5cblx0dmFyIFZBTFVFID0gX3JlcXVpcmUyLlZBTFVFO1xuXHR2YXIgRVJST1IgPSBfcmVxdWlyZTIuRVJST1I7XG5cdHZhciBFTkQgPSBfcmVxdWlyZTIuRU5EO1xuXG5cdGZ1bmN0aW9uIGNyZWF0ZUNvbnN0cnVjdG9yKEJhc2VDbGFzcywgbmFtZSkge1xuXHQgIHJldHVybiBmdW5jdGlvbiBBbm9ueW1vdXNPYnNlcnZhYmxlKHNvdXJjZSwgb3B0aW9ucykge1xuXHQgICAgdmFyIF90aGlzID0gdGhpcztcblxuXHQgICAgQmFzZUNsYXNzLmNhbGwodGhpcyk7XG5cdCAgICB0aGlzLl9zb3VyY2UgPSBzb3VyY2U7XG5cdCAgICB0aGlzLl9uYW1lID0gc291cmNlLl9uYW1lICsgJy4nICsgbmFtZTtcblx0ICAgIHRoaXMuX2luaXQob3B0aW9ucyk7XG5cdCAgICB0aGlzLl8kaGFuZGxlQW55ID0gZnVuY3Rpb24gKGV2ZW50KSB7XG5cdCAgICAgIHJldHVybiBfdGhpcy5faGFuZGxlQW55KGV2ZW50KTtcblx0ICAgIH07XG5cdCAgfTtcblx0fVxuXG5cdGZ1bmN0aW9uIGNyZWF0ZUNsYXNzTWV0aG9kcyhCYXNlQ2xhc3MpIHtcblx0ICByZXR1cm4ge1xuXG5cdCAgICBfaW5pdDogZnVuY3Rpb24gX2luaXQoKSB7fSxcblx0ICAgIF9mcmVlOiBmdW5jdGlvbiBfZnJlZSgpIHt9LFxuXG5cdCAgICBfaGFuZGxlVmFsdWU6IGZ1bmN0aW9uIF9oYW5kbGVWYWx1ZSh4KSB7XG5cdCAgICAgIHRoaXMuX2VtaXRWYWx1ZSh4KTtcblx0ICAgIH0sXG5cdCAgICBfaGFuZGxlRXJyb3I6IGZ1bmN0aW9uIF9oYW5kbGVFcnJvcih4KSB7XG5cdCAgICAgIHRoaXMuX2VtaXRFcnJvcih4KTtcblx0ICAgIH0sXG5cdCAgICBfaGFuZGxlRW5kOiBmdW5jdGlvbiBfaGFuZGxlRW5kKCkge1xuXHQgICAgICB0aGlzLl9lbWl0RW5kKCk7XG5cdCAgICB9LFxuXG5cdCAgICBfaGFuZGxlQW55OiBmdW5jdGlvbiBfaGFuZGxlQW55KGV2ZW50KSB7XG5cdCAgICAgIHN3aXRjaCAoZXZlbnQudHlwZSkge1xuXHQgICAgICAgIGNhc2UgVkFMVUU6XG5cdCAgICAgICAgICByZXR1cm4gdGhpcy5faGFuZGxlVmFsdWUoZXZlbnQudmFsdWUpO1xuXHQgICAgICAgIGNhc2UgRVJST1I6XG5cdCAgICAgICAgICByZXR1cm4gdGhpcy5faGFuZGxlRXJyb3IoZXZlbnQudmFsdWUpO1xuXHQgICAgICAgIGNhc2UgRU5EOlxuXHQgICAgICAgICAgcmV0dXJuIHRoaXMuX2hhbmRsZUVuZCgpO1xuXHQgICAgICB9XG5cdCAgICB9LFxuXG5cdCAgICBfb25BY3RpdmF0aW9uOiBmdW5jdGlvbiBfb25BY3RpdmF0aW9uKCkge1xuXHQgICAgICB0aGlzLl9zb3VyY2Uub25BbnkodGhpcy5fJGhhbmRsZUFueSk7XG5cdCAgICB9LFxuXHQgICAgX29uRGVhY3RpdmF0aW9uOiBmdW5jdGlvbiBfb25EZWFjdGl2YXRpb24oKSB7XG5cdCAgICAgIHRoaXMuX3NvdXJjZS5vZmZBbnkodGhpcy5fJGhhbmRsZUFueSk7XG5cdCAgICB9LFxuXG5cdCAgICBfY2xlYXI6IGZ1bmN0aW9uIF9jbGVhcigpIHtcblx0ICAgICAgQmFzZUNsYXNzLnByb3RvdHlwZS5fY2xlYXIuY2FsbCh0aGlzKTtcblx0ICAgICAgdGhpcy5fc291cmNlID0gbnVsbDtcblx0ICAgICAgdGhpcy5fJGhhbmRsZUFueSA9IG51bGw7XG5cdCAgICAgIHRoaXMuX2ZyZWUoKTtcblx0ICAgIH1cblxuXHQgIH07XG5cdH1cblxuXHRmdW5jdGlvbiBjcmVhdGVTdHJlYW0obmFtZSwgbWl4aW4pIHtcblx0ICB2YXIgUyA9IGNyZWF0ZUNvbnN0cnVjdG9yKFN0cmVhbSwgbmFtZSk7XG5cdCAgaW5oZXJpdChTLCBTdHJlYW0sIGNyZWF0ZUNsYXNzTWV0aG9kcyhTdHJlYW0pLCBtaXhpbik7XG5cdCAgcmV0dXJuIFM7XG5cdH1cblxuXHRmdW5jdGlvbiBjcmVhdGVQcm9wZXJ0eShuYW1lLCBtaXhpbikge1xuXHQgIHZhciBQID0gY3JlYXRlQ29uc3RydWN0b3IoUHJvcGVydHksIG5hbWUpO1xuXHQgIGluaGVyaXQoUCwgUHJvcGVydHksIGNyZWF0ZUNsYXNzTWV0aG9kcyhQcm9wZXJ0eSksIG1peGluKTtcblx0ICByZXR1cm4gUDtcblx0fVxuXG5cdG1vZHVsZS5leHBvcnRzID0geyBjcmVhdGVTdHJlYW06IGNyZWF0ZVN0cmVhbSwgY3JlYXRlUHJvcGVydHk6IGNyZWF0ZVByb3BlcnR5IH07XG5cbi8qKiovIH0sXG4vKiAyNiAqL1xuLyoqKi8gZnVuY3Rpb24obW9kdWxlLCBleHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKSB7XG5cblx0J3VzZSBzdHJpY3QnO1xuXG5cdHZhciBfcmVxdWlyZSA9IF9fd2VicGFja19yZXF1aXJlX18oMjUpO1xuXG5cdHZhciBjcmVhdGVTdHJlYW0gPSBfcmVxdWlyZS5jcmVhdGVTdHJlYW07XG5cblx0dmFyIFMgPSBjcmVhdGVTdHJlYW0oJ2NoYW5nZXMnLCB7XG5cblx0ICBfaGFuZGxlVmFsdWU6IGZ1bmN0aW9uIF9oYW5kbGVWYWx1ZSh4KSB7XG5cdCAgICBpZiAoIXRoaXMuX2FjdGl2YXRpbmcpIHtcblx0ICAgICAgdGhpcy5fZW1pdFZhbHVlKHgpO1xuXHQgICAgfVxuXHQgIH0sXG5cblx0ICBfaGFuZGxlRXJyb3I6IGZ1bmN0aW9uIF9oYW5kbGVFcnJvcih4KSB7XG5cdCAgICBpZiAoIXRoaXMuX2FjdGl2YXRpbmcpIHtcblx0ICAgICAgdGhpcy5fZW1pdEVycm9yKHgpO1xuXHQgICAgfVxuXHQgIH1cblxuXHR9KTtcblxuXHRtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGNoYW5nZXMob2JzKSB7XG5cdCAgcmV0dXJuIG5ldyBTKG9icyk7XG5cdH07XG5cbi8qKiovIH0sXG4vKiAyNyAqL1xuLyoqKi8gZnVuY3Rpb24obW9kdWxlLCBleHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKSB7XG5cblx0J3VzZSBzdHJpY3QnO1xuXG5cdHZhciBzdHJlYW0gPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDE3KTtcblx0dmFyIHRvUHJvcGVydHkgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDI0KTtcblxuXHRtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGZyb21Qcm9taXNlKHByb21pc2UpIHtcblxuXHQgIHZhciBjYWxsZWQgPSBmYWxzZTtcblxuXHQgIHZhciByZXN1bHQgPSBzdHJlYW0oZnVuY3Rpb24gKGVtaXR0ZXIpIHtcblx0ICAgIGlmICghY2FsbGVkKSB7XG5cdCAgICAgIHZhciBvblZhbHVlID0gZnVuY3Rpb24gb25WYWx1ZSh4KSB7XG5cdCAgICAgICAgZW1pdHRlci5lbWl0KHgpO1xuXHQgICAgICAgIGVtaXR0ZXIuZW5kKCk7XG5cdCAgICAgIH07XG5cdCAgICAgIHZhciBvbkVycm9yID0gZnVuY3Rpb24gb25FcnJvcih4KSB7XG5cdCAgICAgICAgZW1pdHRlci5lcnJvcih4KTtcblx0ICAgICAgICBlbWl0dGVyLmVuZCgpO1xuXHQgICAgICB9O1xuXHQgICAgICB2YXIgX3Byb21pc2UgPSBwcm9taXNlLnRoZW4ob25WYWx1ZSwgb25FcnJvcik7XG5cblx0ICAgICAgLy8gcHJldmVudCBsaWJyYXJpZXMgbGlrZSAnUScgb3IgJ3doZW4nIGZyb20gc3dhbGxvd2luZyBleGNlcHRpb25zXG5cdCAgICAgIGlmIChfcHJvbWlzZSAmJiB0eXBlb2YgX3Byb21pc2UuZG9uZSA9PT0gJ2Z1bmN0aW9uJykge1xuXHQgICAgICAgIF9wcm9taXNlLmRvbmUoKTtcblx0ICAgICAgfVxuXG5cdCAgICAgIGNhbGxlZCA9IHRydWU7XG5cdCAgICB9XG5cdCAgfSk7XG5cblx0ICByZXR1cm4gdG9Qcm9wZXJ0eShyZXN1bHQsIG51bGwpLnNldE5hbWUoJ2Zyb21Qcm9taXNlJyk7XG5cdH07XG5cbi8qKiovIH0sXG4vKiAyOCAqL1xuLyoqKi8gZnVuY3Rpb24obW9kdWxlLCBleHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKSB7XG5cblx0J3VzZSBzdHJpY3QnO1xuXG5cdHZhciBfcmVxdWlyZSA9IF9fd2VicGFja19yZXF1aXJlX18oMyk7XG5cblx0dmFyIFZBTFVFID0gX3JlcXVpcmUuVkFMVUU7XG5cdHZhciBFTkQgPSBfcmVxdWlyZS5FTkQ7XG5cblx0ZnVuY3Rpb24gZ2V0R2xvZGFsUHJvbWlzZSgpIHtcblx0ICBpZiAodHlwZW9mIFByb21pc2UgPT09ICdmdW5jdGlvbicpIHtcblx0ICAgIHJldHVybiBQcm9taXNlO1xuXHQgIH0gZWxzZSB7XG5cdCAgICB0aHJvdyBuZXcgRXJyb3IoJ1RoZXJlIGlzblxcJ3QgZGVmYXVsdCBQcm9taXNlLCB1c2Ugc2hpbSBvciBwYXJhbWV0ZXInKTtcblx0ICB9XG5cdH1cblxuXHRtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChvYnMpIHtcblx0ICB2YXIgUHJvbWlzZSA9IGFyZ3VtZW50cy5sZW5ndGggPD0gMSB8fCBhcmd1bWVudHNbMV0gPT09IHVuZGVmaW5lZCA/IGdldEdsb2RhbFByb21pc2UoKSA6IGFyZ3VtZW50c1sxXTtcblxuXHQgIHZhciBsYXN0ID0gbnVsbDtcblx0ICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuXHQgICAgb2JzLm9uQW55KGZ1bmN0aW9uIChldmVudCkge1xuXHQgICAgICBpZiAoZXZlbnQudHlwZSA9PT0gRU5EICYmIGxhc3QgIT09IG51bGwpIHtcblx0ICAgICAgICAobGFzdC50eXBlID09PSBWQUxVRSA/IHJlc29sdmUgOiByZWplY3QpKGxhc3QudmFsdWUpO1xuXHQgICAgICAgIGxhc3QgPSBudWxsO1xuXHQgICAgICB9IGVsc2Uge1xuXHQgICAgICAgIGxhc3QgPSBldmVudDtcblx0ICAgICAgfVxuXHQgICAgfSk7XG5cdCAgfSk7XG5cdH07XG5cbi8qKiovIH0sXG4vKiAyOSAqL1xuLyoqKi8gZnVuY3Rpb24obW9kdWxlLCBleHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKSB7XG5cblx0J3VzZSBzdHJpY3QnO1xuXG5cdHZhciBzdHJlYW0gPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDE3KTtcblx0dmFyIHN5bWJvbCA9IF9fd2VicGFja19yZXF1aXJlX18oMzApKCdvYnNlcnZhYmxlJyk7XG5cblx0bW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBmcm9tRVNPYnNlcnZhYmxlKF9vYnNlcnZhYmxlKSB7XG5cdCAgdmFyIG9ic2VydmFibGUgPSBfb2JzZXJ2YWJsZVtzeW1ib2xdID8gX29ic2VydmFibGVbc3ltYm9sXSgpIDogX29ic2VydmFibGU7XG5cdCAgcmV0dXJuIHN0cmVhbShmdW5jdGlvbiAoZW1pdHRlcikge1xuXHQgICAgdmFyIHVuc3ViID0gb2JzZXJ2YWJsZS5zdWJzY3JpYmUoe1xuXHQgICAgICBlcnJvcjogZnVuY3Rpb24gZXJyb3IoX2Vycm9yKSB7XG5cdCAgICAgICAgZW1pdHRlci5lcnJvcihfZXJyb3IpO1xuXHQgICAgICAgIGVtaXR0ZXIuZW5kKCk7XG5cdCAgICAgIH0sXG5cdCAgICAgIG5leHQ6IGZ1bmN0aW9uIG5leHQodmFsdWUpIHtcblx0ICAgICAgICBlbWl0dGVyLmVtaXQodmFsdWUpO1xuXHQgICAgICB9LFxuXHQgICAgICBjb21wbGV0ZTogZnVuY3Rpb24gY29tcGxldGUoKSB7XG5cdCAgICAgICAgZW1pdHRlci5lbmQoKTtcblx0ICAgICAgfVxuXHQgICAgfSk7XG5cblx0ICAgIGlmICh1bnN1Yi51bnN1YnNjcmliZSkge1xuXHQgICAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuXHQgICAgICAgIHVuc3ViLnVuc3Vic2NyaWJlKCk7XG5cdCAgICAgIH07XG5cdCAgICB9IGVsc2Uge1xuXHQgICAgICByZXR1cm4gdW5zdWI7XG5cdCAgICB9XG5cdCAgfSkuc2V0TmFtZSgnZnJvbUVTT2JzZXJ2YWJsZScpO1xuXHR9O1xuXG4vKioqLyB9LFxuLyogMzAgKi9cbi8qKiovIGZ1bmN0aW9uKG1vZHVsZSwgZXhwb3J0cykge1xuXG5cdCd1c2Ugc3RyaWN0JztcblxuXHRtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChrZXkpIHtcblx0ICBpZiAodHlwZW9mIFN5bWJvbCAhPT0gJ3VuZGVmaW5lZCcgJiYgU3ltYm9sW2tleV0pIHtcblx0ICAgIHJldHVybiBTeW1ib2xba2V5XTtcblx0ICB9IGVsc2UgaWYgKHR5cGVvZiBTeW1ib2wgIT09ICd1bmRlZmluZWQnICYmIHR5cGVvZiBTeW1ib2xbJ2ZvciddID09PSAnZnVuY3Rpb24nKSB7XG5cdCAgICByZXR1cm4gU3ltYm9sWydmb3InXShrZXkpO1xuXHQgIH0gZWxzZSB7XG5cdCAgICByZXR1cm4gJ0BAJyArIGtleTtcblx0ICB9XG5cdH07XG5cbi8qKiovIH0sXG4vKiAzMSAqL1xuLyoqKi8gZnVuY3Rpb24obW9kdWxlLCBleHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKSB7XG5cblx0J3VzZSBzdHJpY3QnO1xuXG5cdHZhciBfcmVxdWlyZSA9IF9fd2VicGFja19yZXF1aXJlX18oMik7XG5cblx0dmFyIGV4dGVuZCA9IF9yZXF1aXJlLmV4dGVuZDtcblxuXHR2YXIgX3JlcXVpcmUyID0gX193ZWJwYWNrX3JlcXVpcmVfXygzKTtcblxuXHR2YXIgVkFMVUUgPSBfcmVxdWlyZTIuVkFMVUU7XG5cdHZhciBFUlJPUiA9IF9yZXF1aXJlMi5FUlJPUjtcblx0dmFyIEVORCA9IF9yZXF1aXJlMi5FTkQ7XG5cblx0ZnVuY3Rpb24gRVNPYnNlcnZhYmxlKG9ic2VydmFibGUpIHtcblx0ICB0aGlzLl9vYnNlcnZhYmxlID0gb2JzZXJ2YWJsZS50YWtlRXJyb3JzKDEpO1xuXHR9XG5cblx0ZXh0ZW5kKEVTT2JzZXJ2YWJsZS5wcm90b3R5cGUsIHtcblx0ICBzdWJzY3JpYmU6IGZ1bmN0aW9uIHN1YnNjcmliZShvYnNlcnZlcikge1xuXHQgICAgdmFyIF90aGlzID0gdGhpcztcblxuXHQgICAgdmFyIGZuID0gZnVuY3Rpb24gZm4oZXZlbnQpIHtcblx0ICAgICAgaWYgKGV2ZW50LnR5cGUgPT09IFZBTFVFICYmIG9ic2VydmVyLm5leHQpIHtcblx0ICAgICAgICBvYnNlcnZlci5uZXh0KGV2ZW50LnZhbHVlKTtcblx0ICAgICAgfSBlbHNlIGlmIChldmVudC50eXBlID09PSBFUlJPUiAmJiBvYnNlcnZlci5lcnJvcikge1xuXHQgICAgICAgIG9ic2VydmVyLmVycm9yKGV2ZW50LnZhbHVlKTtcblx0ICAgICAgfSBlbHNlIGlmIChldmVudC50eXBlID09PSBFTkQgJiYgb2JzZXJ2ZXIuY29tcGxldGUpIHtcblx0ICAgICAgICBvYnNlcnZlci5jb21wbGV0ZShldmVudC52YWx1ZSk7XG5cdCAgICAgIH1cblx0ICAgIH07XG5cblx0ICAgIHRoaXMuX29ic2VydmFibGUub25BbnkoZm4pO1xuXHQgICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcblx0ICAgICAgcmV0dXJuIF90aGlzLl9vYnNlcnZhYmxlLm9mZkFueShmbik7XG5cdCAgICB9O1xuXHQgIH1cblx0fSk7XG5cblx0bW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiB0b0VTT2JzZXJ2YWJsZSgpIHtcblx0ICByZXR1cm4gbmV3IEVTT2JzZXJ2YWJsZSh0aGlzKTtcblx0fTtcblxuLyoqKi8gfSxcbi8qIDMyICovXG4vKioqLyBmdW5jdGlvbihtb2R1bGUsIGV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pIHtcblxuXHQndXNlIHN0cmljdCc7XG5cblx0dmFyIF9yZXF1aXJlID0gX193ZWJwYWNrX3JlcXVpcmVfXygyNSk7XG5cblx0dmFyIGNyZWF0ZVN0cmVhbSA9IF9yZXF1aXJlLmNyZWF0ZVN0cmVhbTtcblx0dmFyIGNyZWF0ZVByb3BlcnR5ID0gX3JlcXVpcmUuY3JlYXRlUHJvcGVydHk7XG5cblx0dmFyIG1peGluID0ge1xuXG5cdCAgX2luaXQ6IGZ1bmN0aW9uIF9pbml0KF9yZWYpIHtcblx0ICAgIHZhciBmbiA9IF9yZWYuZm47XG5cblx0ICAgIHRoaXMuX2ZuID0gZm47XG5cdCAgfSxcblxuXHQgIF9mcmVlOiBmdW5jdGlvbiBfZnJlZSgpIHtcblx0ICAgIHRoaXMuX2ZuID0gbnVsbDtcblx0ICB9LFxuXG5cdCAgX2hhbmRsZVZhbHVlOiBmdW5jdGlvbiBfaGFuZGxlVmFsdWUoeCkge1xuXHQgICAgdmFyIGZuID0gdGhpcy5fZm47XG5cdCAgICB0aGlzLl9lbWl0VmFsdWUoZm4oeCkpO1xuXHQgIH1cblxuXHR9O1xuXG5cdHZhciBTID0gY3JlYXRlU3RyZWFtKCdtYXAnLCBtaXhpbik7XG5cdHZhciBQID0gY3JlYXRlUHJvcGVydHkoJ21hcCcsIG1peGluKTtcblxuXHR2YXIgaWQgPSBmdW5jdGlvbiBpZCh4KSB7XG5cdCAgcmV0dXJuIHg7XG5cdH07XG5cblx0bW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBtYXAob2JzKSB7XG5cdCAgdmFyIGZuID0gYXJndW1lbnRzLmxlbmd0aCA8PSAxIHx8IGFyZ3VtZW50c1sxXSA9PT0gdW5kZWZpbmVkID8gaWQgOiBhcmd1bWVudHNbMV07XG5cblx0ICByZXR1cm4gbmV3IChvYnMuX29mU2FtZVR5cGUoUywgUCkpKG9icywgeyBmbjogZm4gfSk7XG5cdH07XG5cbi8qKiovIH0sXG4vKiAzMyAqL1xuLyoqKi8gZnVuY3Rpb24obW9kdWxlLCBleHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKSB7XG5cblx0J3VzZSBzdHJpY3QnO1xuXG5cdHZhciBfcmVxdWlyZSA9IF9fd2VicGFja19yZXF1aXJlX18oMjUpO1xuXG5cdHZhciBjcmVhdGVTdHJlYW0gPSBfcmVxdWlyZS5jcmVhdGVTdHJlYW07XG5cdHZhciBjcmVhdGVQcm9wZXJ0eSA9IF9yZXF1aXJlLmNyZWF0ZVByb3BlcnR5O1xuXG5cdHZhciBtaXhpbiA9IHtcblxuXHQgIF9pbml0OiBmdW5jdGlvbiBfaW5pdChfcmVmKSB7XG5cdCAgICB2YXIgZm4gPSBfcmVmLmZuO1xuXG5cdCAgICB0aGlzLl9mbiA9IGZuO1xuXHQgIH0sXG5cblx0ICBfZnJlZTogZnVuY3Rpb24gX2ZyZWUoKSB7XG5cdCAgICB0aGlzLl9mbiA9IG51bGw7XG5cdCAgfSxcblxuXHQgIF9oYW5kbGVWYWx1ZTogZnVuY3Rpb24gX2hhbmRsZVZhbHVlKHgpIHtcblx0ICAgIHZhciBmbiA9IHRoaXMuX2ZuO1xuXHQgICAgaWYgKGZuKHgpKSB7XG5cdCAgICAgIHRoaXMuX2VtaXRWYWx1ZSh4KTtcblx0ICAgIH1cblx0ICB9XG5cblx0fTtcblxuXHR2YXIgUyA9IGNyZWF0ZVN0cmVhbSgnZmlsdGVyJywgbWl4aW4pO1xuXHR2YXIgUCA9IGNyZWF0ZVByb3BlcnR5KCdmaWx0ZXInLCBtaXhpbik7XG5cblx0dmFyIGlkID0gZnVuY3Rpb24gaWQoeCkge1xuXHQgIHJldHVybiB4O1xuXHR9O1xuXG5cdG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gZmlsdGVyKG9icykge1xuXHQgIHZhciBmbiA9IGFyZ3VtZW50cy5sZW5ndGggPD0gMSB8fCBhcmd1bWVudHNbMV0gPT09IHVuZGVmaW5lZCA/IGlkIDogYXJndW1lbnRzWzFdO1xuXG5cdCAgcmV0dXJuIG5ldyAob2JzLl9vZlNhbWVUeXBlKFMsIFApKShvYnMsIHsgZm46IGZuIH0pO1xuXHR9O1xuXG4vKioqLyB9LFxuLyogMzQgKi9cbi8qKiovIGZ1bmN0aW9uKG1vZHVsZSwgZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXykge1xuXG5cdCd1c2Ugc3RyaWN0JztcblxuXHR2YXIgX3JlcXVpcmUgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDI1KTtcblxuXHR2YXIgY3JlYXRlU3RyZWFtID0gX3JlcXVpcmUuY3JlYXRlU3RyZWFtO1xuXHR2YXIgY3JlYXRlUHJvcGVydHkgPSBfcmVxdWlyZS5jcmVhdGVQcm9wZXJ0eTtcblxuXHR2YXIgbWl4aW4gPSB7XG5cblx0ICBfaW5pdDogZnVuY3Rpb24gX2luaXQoX3JlZikge1xuXHQgICAgdmFyIG4gPSBfcmVmLm47XG5cblx0ICAgIHRoaXMuX24gPSBuO1xuXHQgICAgaWYgKG4gPD0gMCkge1xuXHQgICAgICB0aGlzLl9lbWl0RW5kKCk7XG5cdCAgICB9XG5cdCAgfSxcblxuXHQgIF9oYW5kbGVWYWx1ZTogZnVuY3Rpb24gX2hhbmRsZVZhbHVlKHgpIHtcblx0ICAgIHRoaXMuX24tLTtcblx0ICAgIHRoaXMuX2VtaXRWYWx1ZSh4KTtcblx0ICAgIGlmICh0aGlzLl9uID09PSAwKSB7XG5cdCAgICAgIHRoaXMuX2VtaXRFbmQoKTtcblx0ICAgIH1cblx0ICB9XG5cblx0fTtcblxuXHR2YXIgUyA9IGNyZWF0ZVN0cmVhbSgndGFrZScsIG1peGluKTtcblx0dmFyIFAgPSBjcmVhdGVQcm9wZXJ0eSgndGFrZScsIG1peGluKTtcblxuXHRtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIHRha2Uob2JzLCBuKSB7XG5cdCAgcmV0dXJuIG5ldyAob2JzLl9vZlNhbWVUeXBlKFMsIFApKShvYnMsIHsgbjogbiB9KTtcblx0fTtcblxuLyoqKi8gfSxcbi8qIDM1ICovXG4vKioqLyBmdW5jdGlvbihtb2R1bGUsIGV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pIHtcblxuXHQndXNlIHN0cmljdCc7XG5cblx0dmFyIF9yZXF1aXJlID0gX193ZWJwYWNrX3JlcXVpcmVfXygyNSk7XG5cblx0dmFyIGNyZWF0ZVN0cmVhbSA9IF9yZXF1aXJlLmNyZWF0ZVN0cmVhbTtcblx0dmFyIGNyZWF0ZVByb3BlcnR5ID0gX3JlcXVpcmUuY3JlYXRlUHJvcGVydHk7XG5cblx0dmFyIG1peGluID0ge1xuXG5cdCAgX2luaXQ6IGZ1bmN0aW9uIF9pbml0KF9yZWYpIHtcblx0ICAgIHZhciBuID0gX3JlZi5uO1xuXG5cdCAgICB0aGlzLl9uID0gbjtcblx0ICAgIGlmIChuIDw9IDApIHtcblx0ICAgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgICAgfVxuXHQgIH0sXG5cblx0ICBfaGFuZGxlRXJyb3I6IGZ1bmN0aW9uIF9oYW5kbGVFcnJvcih4KSB7XG5cdCAgICB0aGlzLl9uLS07XG5cdCAgICB0aGlzLl9lbWl0RXJyb3IoeCk7XG5cdCAgICBpZiAodGhpcy5fbiA9PT0gMCkge1xuXHQgICAgICB0aGlzLl9lbWl0RW5kKCk7XG5cdCAgICB9XG5cdCAgfVxuXG5cdH07XG5cblx0dmFyIFMgPSBjcmVhdGVTdHJlYW0oJ3Rha2VFcnJvcnMnLCBtaXhpbik7XG5cdHZhciBQID0gY3JlYXRlUHJvcGVydHkoJ3Rha2VFcnJvcnMnLCBtaXhpbik7XG5cblx0bW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiB0YWtlRXJyb3JzKG9icywgbikge1xuXHQgIHJldHVybiBuZXcgKG9icy5fb2ZTYW1lVHlwZShTLCBQKSkob2JzLCB7IG46IG4gfSk7XG5cdH07XG5cbi8qKiovIH0sXG4vKiAzNiAqL1xuLyoqKi8gZnVuY3Rpb24obW9kdWxlLCBleHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKSB7XG5cblx0J3VzZSBzdHJpY3QnO1xuXG5cdHZhciBfcmVxdWlyZSA9IF9fd2VicGFja19yZXF1aXJlX18oMjUpO1xuXG5cdHZhciBjcmVhdGVTdHJlYW0gPSBfcmVxdWlyZS5jcmVhdGVTdHJlYW07XG5cdHZhciBjcmVhdGVQcm9wZXJ0eSA9IF9yZXF1aXJlLmNyZWF0ZVByb3BlcnR5O1xuXG5cdHZhciBtaXhpbiA9IHtcblxuXHQgIF9pbml0OiBmdW5jdGlvbiBfaW5pdChfcmVmKSB7XG5cdCAgICB2YXIgZm4gPSBfcmVmLmZuO1xuXG5cdCAgICB0aGlzLl9mbiA9IGZuO1xuXHQgIH0sXG5cblx0ICBfZnJlZTogZnVuY3Rpb24gX2ZyZWUoKSB7XG5cdCAgICB0aGlzLl9mbiA9IG51bGw7XG5cdCAgfSxcblxuXHQgIF9oYW5kbGVWYWx1ZTogZnVuY3Rpb24gX2hhbmRsZVZhbHVlKHgpIHtcblx0ICAgIHZhciBmbiA9IHRoaXMuX2ZuO1xuXHQgICAgaWYgKGZuKHgpKSB7XG5cdCAgICAgIHRoaXMuX2VtaXRWYWx1ZSh4KTtcblx0ICAgIH0gZWxzZSB7XG5cdCAgICAgIHRoaXMuX2VtaXRFbmQoKTtcblx0ICAgIH1cblx0ICB9XG5cblx0fTtcblxuXHR2YXIgUyA9IGNyZWF0ZVN0cmVhbSgndGFrZVdoaWxlJywgbWl4aW4pO1xuXHR2YXIgUCA9IGNyZWF0ZVByb3BlcnR5KCd0YWtlV2hpbGUnLCBtaXhpbik7XG5cblx0dmFyIGlkID0gZnVuY3Rpb24gaWQoeCkge1xuXHQgIHJldHVybiB4O1xuXHR9O1xuXG5cdG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gdGFrZVdoaWxlKG9icykge1xuXHQgIHZhciBmbiA9IGFyZ3VtZW50cy5sZW5ndGggPD0gMSB8fCBhcmd1bWVudHNbMV0gPT09IHVuZGVmaW5lZCA/IGlkIDogYXJndW1lbnRzWzFdO1xuXG5cdCAgcmV0dXJuIG5ldyAob2JzLl9vZlNhbWVUeXBlKFMsIFApKShvYnMsIHsgZm46IGZuIH0pO1xuXHR9O1xuXG4vKioqLyB9LFxuLyogMzcgKi9cbi8qKiovIGZ1bmN0aW9uKG1vZHVsZSwgZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXykge1xuXG5cdCd1c2Ugc3RyaWN0JztcblxuXHR2YXIgX3JlcXVpcmUgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDI1KTtcblxuXHR2YXIgY3JlYXRlU3RyZWFtID0gX3JlcXVpcmUuY3JlYXRlU3RyZWFtO1xuXHR2YXIgY3JlYXRlUHJvcGVydHkgPSBfcmVxdWlyZS5jcmVhdGVQcm9wZXJ0eTtcblxuXHR2YXIgX3JlcXVpcmUyID0gX193ZWJwYWNrX3JlcXVpcmVfXygzKTtcblxuXHR2YXIgTk9USElORyA9IF9yZXF1aXJlMi5OT1RISU5HO1xuXG5cdHZhciBtaXhpbiA9IHtcblxuXHQgIF9pbml0OiBmdW5jdGlvbiBfaW5pdCgpIHtcblx0ICAgIHRoaXMuX2xhc3RWYWx1ZSA9IE5PVEhJTkc7XG5cdCAgfSxcblxuXHQgIF9mcmVlOiBmdW5jdGlvbiBfZnJlZSgpIHtcblx0ICAgIHRoaXMuX2xhc3RWYWx1ZSA9IG51bGw7XG5cdCAgfSxcblxuXHQgIF9oYW5kbGVWYWx1ZTogZnVuY3Rpb24gX2hhbmRsZVZhbHVlKHgpIHtcblx0ICAgIHRoaXMuX2xhc3RWYWx1ZSA9IHg7XG5cdCAgfSxcblxuXHQgIF9oYW5kbGVFbmQ6IGZ1bmN0aW9uIF9oYW5kbGVFbmQoKSB7XG5cdCAgICBpZiAodGhpcy5fbGFzdFZhbHVlICE9PSBOT1RISU5HKSB7XG5cdCAgICAgIHRoaXMuX2VtaXRWYWx1ZSh0aGlzLl9sYXN0VmFsdWUpO1xuXHQgICAgfVxuXHQgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgIH1cblxuXHR9O1xuXG5cdHZhciBTID0gY3JlYXRlU3RyZWFtKCdsYXN0JywgbWl4aW4pO1xuXHR2YXIgUCA9IGNyZWF0ZVByb3BlcnR5KCdsYXN0JywgbWl4aW4pO1xuXG5cdG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gbGFzdChvYnMpIHtcblx0ICByZXR1cm4gbmV3IChvYnMuX29mU2FtZVR5cGUoUywgUCkpKG9icyk7XG5cdH07XG5cbi8qKiovIH0sXG4vKiAzOCAqL1xuLyoqKi8gZnVuY3Rpb24obW9kdWxlLCBleHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKSB7XG5cblx0J3VzZSBzdHJpY3QnO1xuXG5cdHZhciBfcmVxdWlyZSA9IF9fd2VicGFja19yZXF1aXJlX18oMjUpO1xuXG5cdHZhciBjcmVhdGVTdHJlYW0gPSBfcmVxdWlyZS5jcmVhdGVTdHJlYW07XG5cdHZhciBjcmVhdGVQcm9wZXJ0eSA9IF9yZXF1aXJlLmNyZWF0ZVByb3BlcnR5O1xuXG5cdHZhciBtaXhpbiA9IHtcblxuXHQgIF9pbml0OiBmdW5jdGlvbiBfaW5pdChfcmVmKSB7XG5cdCAgICB2YXIgbiA9IF9yZWYubjtcblxuXHQgICAgdGhpcy5fbiA9IE1hdGgubWF4KDAsIG4pO1xuXHQgIH0sXG5cblx0ICBfaGFuZGxlVmFsdWU6IGZ1bmN0aW9uIF9oYW5kbGVWYWx1ZSh4KSB7XG5cdCAgICBpZiAodGhpcy5fbiA9PT0gMCkge1xuXHQgICAgICB0aGlzLl9lbWl0VmFsdWUoeCk7XG5cdCAgICB9IGVsc2Uge1xuXHQgICAgICB0aGlzLl9uLS07XG5cdCAgICB9XG5cdCAgfVxuXG5cdH07XG5cblx0dmFyIFMgPSBjcmVhdGVTdHJlYW0oJ3NraXAnLCBtaXhpbik7XG5cdHZhciBQID0gY3JlYXRlUHJvcGVydHkoJ3NraXAnLCBtaXhpbik7XG5cblx0bW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBza2lwKG9icywgbikge1xuXHQgIHJldHVybiBuZXcgKG9icy5fb2ZTYW1lVHlwZShTLCBQKSkob2JzLCB7IG46IG4gfSk7XG5cdH07XG5cbi8qKiovIH0sXG4vKiAzOSAqL1xuLyoqKi8gZnVuY3Rpb24obW9kdWxlLCBleHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKSB7XG5cblx0J3VzZSBzdHJpY3QnO1xuXG5cdHZhciBfcmVxdWlyZSA9IF9fd2VicGFja19yZXF1aXJlX18oMjUpO1xuXG5cdHZhciBjcmVhdGVTdHJlYW0gPSBfcmVxdWlyZS5jcmVhdGVTdHJlYW07XG5cdHZhciBjcmVhdGVQcm9wZXJ0eSA9IF9yZXF1aXJlLmNyZWF0ZVByb3BlcnR5O1xuXG5cdHZhciBtaXhpbiA9IHtcblxuXHQgIF9pbml0OiBmdW5jdGlvbiBfaW5pdChfcmVmKSB7XG5cdCAgICB2YXIgZm4gPSBfcmVmLmZuO1xuXG5cdCAgICB0aGlzLl9mbiA9IGZuO1xuXHQgIH0sXG5cblx0ICBfZnJlZTogZnVuY3Rpb24gX2ZyZWUoKSB7XG5cdCAgICB0aGlzLl9mbiA9IG51bGw7XG5cdCAgfSxcblxuXHQgIF9oYW5kbGVWYWx1ZTogZnVuY3Rpb24gX2hhbmRsZVZhbHVlKHgpIHtcblx0ICAgIHZhciBmbiA9IHRoaXMuX2ZuO1xuXHQgICAgaWYgKHRoaXMuX2ZuICE9PSBudWxsICYmICFmbih4KSkge1xuXHQgICAgICB0aGlzLl9mbiA9IG51bGw7XG5cdCAgICB9XG5cdCAgICBpZiAodGhpcy5fZm4gPT09IG51bGwpIHtcblx0ICAgICAgdGhpcy5fZW1pdFZhbHVlKHgpO1xuXHQgICAgfVxuXHQgIH1cblxuXHR9O1xuXG5cdHZhciBTID0gY3JlYXRlU3RyZWFtKCdza2lwV2hpbGUnLCBtaXhpbik7XG5cdHZhciBQID0gY3JlYXRlUHJvcGVydHkoJ3NraXBXaGlsZScsIG1peGluKTtcblxuXHR2YXIgaWQgPSBmdW5jdGlvbiBpZCh4KSB7XG5cdCAgcmV0dXJuIHg7XG5cdH07XG5cblx0bW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBza2lwV2hpbGUob2JzKSB7XG5cdCAgdmFyIGZuID0gYXJndW1lbnRzLmxlbmd0aCA8PSAxIHx8IGFyZ3VtZW50c1sxXSA9PT0gdW5kZWZpbmVkID8gaWQgOiBhcmd1bWVudHNbMV07XG5cblx0ICByZXR1cm4gbmV3IChvYnMuX29mU2FtZVR5cGUoUywgUCkpKG9icywgeyBmbjogZm4gfSk7XG5cdH07XG5cbi8qKiovIH0sXG4vKiA0MCAqL1xuLyoqKi8gZnVuY3Rpb24obW9kdWxlLCBleHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKSB7XG5cblx0J3VzZSBzdHJpY3QnO1xuXG5cdHZhciBfcmVxdWlyZSA9IF9fd2VicGFja19yZXF1aXJlX18oMjUpO1xuXG5cdHZhciBjcmVhdGVTdHJlYW0gPSBfcmVxdWlyZS5jcmVhdGVTdHJlYW07XG5cdHZhciBjcmVhdGVQcm9wZXJ0eSA9IF9yZXF1aXJlLmNyZWF0ZVByb3BlcnR5O1xuXG5cdHZhciBfcmVxdWlyZTIgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDMpO1xuXG5cdHZhciBOT1RISU5HID0gX3JlcXVpcmUyLk5PVEhJTkc7XG5cblx0dmFyIG1peGluID0ge1xuXG5cdCAgX2luaXQ6IGZ1bmN0aW9uIF9pbml0KF9yZWYpIHtcblx0ICAgIHZhciBmbiA9IF9yZWYuZm47XG5cblx0ICAgIHRoaXMuX2ZuID0gZm47XG5cdCAgICB0aGlzLl9wcmV2ID0gTk9USElORztcblx0ICB9LFxuXG5cdCAgX2ZyZWU6IGZ1bmN0aW9uIF9mcmVlKCkge1xuXHQgICAgdGhpcy5fZm4gPSBudWxsO1xuXHQgICAgdGhpcy5fcHJldiA9IG51bGw7XG5cdCAgfSxcblxuXHQgIF9oYW5kbGVWYWx1ZTogZnVuY3Rpb24gX2hhbmRsZVZhbHVlKHgpIHtcblx0ICAgIHZhciBmbiA9IHRoaXMuX2ZuO1xuXHQgICAgaWYgKHRoaXMuX3ByZXYgPT09IE5PVEhJTkcgfHwgIWZuKHRoaXMuX3ByZXYsIHgpKSB7XG5cdCAgICAgIHRoaXMuX3ByZXYgPSB4O1xuXHQgICAgICB0aGlzLl9lbWl0VmFsdWUoeCk7XG5cdCAgICB9XG5cdCAgfVxuXG5cdH07XG5cblx0dmFyIFMgPSBjcmVhdGVTdHJlYW0oJ3NraXBEdXBsaWNhdGVzJywgbWl4aW4pO1xuXHR2YXIgUCA9IGNyZWF0ZVByb3BlcnR5KCdza2lwRHVwbGljYXRlcycsIG1peGluKTtcblxuXHR2YXIgZXEgPSBmdW5jdGlvbiBlcShhLCBiKSB7XG5cdCAgcmV0dXJuIGEgPT09IGI7XG5cdH07XG5cblx0bW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBza2lwRHVwbGljYXRlcyhvYnMpIHtcblx0ICB2YXIgZm4gPSBhcmd1bWVudHMubGVuZ3RoIDw9IDEgfHwgYXJndW1lbnRzWzFdID09PSB1bmRlZmluZWQgPyBlcSA6IGFyZ3VtZW50c1sxXTtcblxuXHQgIHJldHVybiBuZXcgKG9icy5fb2ZTYW1lVHlwZShTLCBQKSkob2JzLCB7IGZuOiBmbiB9KTtcblx0fTtcblxuLyoqKi8gfSxcbi8qIDQxICovXG4vKioqLyBmdW5jdGlvbihtb2R1bGUsIGV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pIHtcblxuXHQndXNlIHN0cmljdCc7XG5cblx0dmFyIF9yZXF1aXJlID0gX193ZWJwYWNrX3JlcXVpcmVfXygyNSk7XG5cblx0dmFyIGNyZWF0ZVN0cmVhbSA9IF9yZXF1aXJlLmNyZWF0ZVN0cmVhbTtcblx0dmFyIGNyZWF0ZVByb3BlcnR5ID0gX3JlcXVpcmUuY3JlYXRlUHJvcGVydHk7XG5cblx0dmFyIF9yZXF1aXJlMiA9IF9fd2VicGFja19yZXF1aXJlX18oMyk7XG5cblx0dmFyIE5PVEhJTkcgPSBfcmVxdWlyZTIuTk9USElORztcblxuXHR2YXIgbWl4aW4gPSB7XG5cblx0ICBfaW5pdDogZnVuY3Rpb24gX2luaXQoX3JlZikge1xuXHQgICAgdmFyIGZuID0gX3JlZi5mbjtcblx0ICAgIHZhciBzZWVkID0gX3JlZi5zZWVkO1xuXG5cdCAgICB0aGlzLl9mbiA9IGZuO1xuXHQgICAgdGhpcy5fcHJldiA9IHNlZWQ7XG5cdCAgfSxcblxuXHQgIF9mcmVlOiBmdW5jdGlvbiBfZnJlZSgpIHtcblx0ICAgIHRoaXMuX3ByZXYgPSBudWxsO1xuXHQgICAgdGhpcy5fZm4gPSBudWxsO1xuXHQgIH0sXG5cblx0ICBfaGFuZGxlVmFsdWU6IGZ1bmN0aW9uIF9oYW5kbGVWYWx1ZSh4KSB7XG5cdCAgICBpZiAodGhpcy5fcHJldiAhPT0gTk9USElORykge1xuXHQgICAgICB2YXIgZm4gPSB0aGlzLl9mbjtcblx0ICAgICAgdGhpcy5fZW1pdFZhbHVlKGZuKHRoaXMuX3ByZXYsIHgpKTtcblx0ICAgIH1cblx0ICAgIHRoaXMuX3ByZXYgPSB4O1xuXHQgIH1cblxuXHR9O1xuXG5cdHZhciBTID0gY3JlYXRlU3RyZWFtKCdkaWZmJywgbWl4aW4pO1xuXHR2YXIgUCA9IGNyZWF0ZVByb3BlcnR5KCdkaWZmJywgbWl4aW4pO1xuXG5cdGZ1bmN0aW9uIGRlZmF1bHRGbihhLCBiKSB7XG5cdCAgcmV0dXJuIFthLCBiXTtcblx0fVxuXG5cdG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gZGlmZihvYnMsIGZuKSB7XG5cdCAgdmFyIHNlZWQgPSBhcmd1bWVudHMubGVuZ3RoIDw9IDIgfHwgYXJndW1lbnRzWzJdID09PSB1bmRlZmluZWQgPyBOT1RISU5HIDogYXJndW1lbnRzWzJdO1xuXG5cdCAgcmV0dXJuIG5ldyAob2JzLl9vZlNhbWVUeXBlKFMsIFApKShvYnMsIHsgZm46IGZuIHx8IGRlZmF1bHRGbiwgc2VlZDogc2VlZCB9KTtcblx0fTtcblxuLyoqKi8gfSxcbi8qIDQyICovXG4vKioqLyBmdW5jdGlvbihtb2R1bGUsIGV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pIHtcblxuXHQndXNlIHN0cmljdCc7XG5cblx0dmFyIF9yZXF1aXJlID0gX193ZWJwYWNrX3JlcXVpcmVfXygyNSk7XG5cblx0dmFyIGNyZWF0ZVByb3BlcnR5ID0gX3JlcXVpcmUuY3JlYXRlUHJvcGVydHk7XG5cblx0dmFyIF9yZXF1aXJlMiA9IF9fd2VicGFja19yZXF1aXJlX18oMyk7XG5cblx0dmFyIEVSUk9SID0gX3JlcXVpcmUyLkVSUk9SO1xuXHR2YXIgTk9USElORyA9IF9yZXF1aXJlMi5OT1RISU5HO1xuXG5cdHZhciBQID0gY3JlYXRlUHJvcGVydHkoJ3NjYW4nLCB7XG5cblx0ICBfaW5pdDogZnVuY3Rpb24gX2luaXQoX3JlZikge1xuXHQgICAgdmFyIGZuID0gX3JlZi5mbjtcblx0ICAgIHZhciBzZWVkID0gX3JlZi5zZWVkO1xuXG5cdCAgICB0aGlzLl9mbiA9IGZuO1xuXHQgICAgdGhpcy5fc2VlZCA9IHNlZWQ7XG5cdCAgICBpZiAoc2VlZCAhPT0gTk9USElORykge1xuXHQgICAgICB0aGlzLl9lbWl0VmFsdWUoc2VlZCk7XG5cdCAgICB9XG5cdCAgfSxcblxuXHQgIF9mcmVlOiBmdW5jdGlvbiBfZnJlZSgpIHtcblx0ICAgIHRoaXMuX2ZuID0gbnVsbDtcblx0ICAgIHRoaXMuX3NlZWQgPSBudWxsO1xuXHQgIH0sXG5cblx0ICBfaGFuZGxlVmFsdWU6IGZ1bmN0aW9uIF9oYW5kbGVWYWx1ZSh4KSB7XG5cdCAgICB2YXIgZm4gPSB0aGlzLl9mbjtcblx0ICAgIGlmICh0aGlzLl9jdXJyZW50RXZlbnQgPT09IG51bGwgfHwgdGhpcy5fY3VycmVudEV2ZW50LnR5cGUgPT09IEVSUk9SKSB7XG5cdCAgICAgIHRoaXMuX2VtaXRWYWx1ZSh0aGlzLl9zZWVkID09PSBOT1RISU5HID8geCA6IGZuKHRoaXMuX3NlZWQsIHgpKTtcblx0ICAgIH0gZWxzZSB7XG5cdCAgICAgIHRoaXMuX2VtaXRWYWx1ZShmbih0aGlzLl9jdXJyZW50RXZlbnQudmFsdWUsIHgpKTtcblx0ICAgIH1cblx0ICB9XG5cblx0fSk7XG5cblx0bW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBzY2FuKG9icywgZm4pIHtcblx0ICB2YXIgc2VlZCA9IGFyZ3VtZW50cy5sZW5ndGggPD0gMiB8fCBhcmd1bWVudHNbMl0gPT09IHVuZGVmaW5lZCA/IE5PVEhJTkcgOiBhcmd1bWVudHNbMl07XG5cblx0ICByZXR1cm4gbmV3IFAob2JzLCB7IGZuOiBmbiwgc2VlZDogc2VlZCB9KTtcblx0fTtcblxuLyoqKi8gfSxcbi8qIDQzICovXG4vKioqLyBmdW5jdGlvbihtb2R1bGUsIGV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pIHtcblxuXHQndXNlIHN0cmljdCc7XG5cblx0dmFyIF9yZXF1aXJlID0gX193ZWJwYWNrX3JlcXVpcmVfXygyNSk7XG5cblx0dmFyIGNyZWF0ZVN0cmVhbSA9IF9yZXF1aXJlLmNyZWF0ZVN0cmVhbTtcblxuXHR2YXIgbWl4aW4gPSB7XG5cblx0ICBfaW5pdDogZnVuY3Rpb24gX2luaXQoX3JlZikge1xuXHQgICAgdmFyIGZuID0gX3JlZi5mbjtcblxuXHQgICAgdGhpcy5fZm4gPSBmbjtcblx0ICB9LFxuXG5cdCAgX2ZyZWU6IGZ1bmN0aW9uIF9mcmVlKCkge1xuXHQgICAgdGhpcy5fZm4gPSBudWxsO1xuXHQgIH0sXG5cblx0ICBfaGFuZGxlVmFsdWU6IGZ1bmN0aW9uIF9oYW5kbGVWYWx1ZSh4KSB7XG5cdCAgICB2YXIgZm4gPSB0aGlzLl9mbjtcblx0ICAgIHZhciB4cyA9IGZuKHgpO1xuXHQgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB4cy5sZW5ndGg7IGkrKykge1xuXHQgICAgICB0aGlzLl9lbWl0VmFsdWUoeHNbaV0pO1xuXHQgICAgfVxuXHQgIH1cblxuXHR9O1xuXG5cdHZhciBTID0gY3JlYXRlU3RyZWFtKCdmbGF0dGVuJywgbWl4aW4pO1xuXG5cdHZhciBpZCA9IGZ1bmN0aW9uIGlkKHgpIHtcblx0ICByZXR1cm4geDtcblx0fTtcblxuXHRtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGZsYXR0ZW4ob2JzKSB7XG5cdCAgdmFyIGZuID0gYXJndW1lbnRzLmxlbmd0aCA8PSAxIHx8IGFyZ3VtZW50c1sxXSA9PT0gdW5kZWZpbmVkID8gaWQgOiBhcmd1bWVudHNbMV07XG5cblx0ICByZXR1cm4gbmV3IFMob2JzLCB7IGZuOiBmbiB9KTtcblx0fTtcblxuLyoqKi8gfSxcbi8qIDQ0ICovXG4vKioqLyBmdW5jdGlvbihtb2R1bGUsIGV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pIHtcblxuXHQndXNlIHN0cmljdCc7XG5cblx0dmFyIF9yZXF1aXJlID0gX193ZWJwYWNrX3JlcXVpcmVfXygyNSk7XG5cblx0dmFyIGNyZWF0ZVN0cmVhbSA9IF9yZXF1aXJlLmNyZWF0ZVN0cmVhbTtcblx0dmFyIGNyZWF0ZVByb3BlcnR5ID0gX3JlcXVpcmUuY3JlYXRlUHJvcGVydHk7XG5cblx0dmFyIEVORF9NQVJLRVIgPSB7fTtcblxuXHR2YXIgbWl4aW4gPSB7XG5cblx0ICBfaW5pdDogZnVuY3Rpb24gX2luaXQoX3JlZikge1xuXHQgICAgdmFyIF90aGlzID0gdGhpcztcblxuXHQgICAgdmFyIHdhaXQgPSBfcmVmLndhaXQ7XG5cblx0ICAgIHRoaXMuX3dhaXQgPSBNYXRoLm1heCgwLCB3YWl0KTtcblx0ICAgIHRoaXMuX2J1ZmYgPSBbXTtcblx0ICAgIHRoaXMuXyRzaGlmdEJ1ZmYgPSBmdW5jdGlvbiAoKSB7XG5cdCAgICAgIHZhciB2YWx1ZSA9IF90aGlzLl9idWZmLnNoaWZ0KCk7XG5cdCAgICAgIGlmICh2YWx1ZSA9PT0gRU5EX01BUktFUikge1xuXHQgICAgICAgIF90aGlzLl9lbWl0RW5kKCk7XG5cdCAgICAgIH0gZWxzZSB7XG5cdCAgICAgICAgX3RoaXMuX2VtaXRWYWx1ZSh2YWx1ZSk7XG5cdCAgICAgIH1cblx0ICAgIH07XG5cdCAgfSxcblxuXHQgIF9mcmVlOiBmdW5jdGlvbiBfZnJlZSgpIHtcblx0ICAgIHRoaXMuX2J1ZmYgPSBudWxsO1xuXHQgICAgdGhpcy5fJHNoaWZ0QnVmZiA9IG51bGw7XG5cdCAgfSxcblxuXHQgIF9oYW5kbGVWYWx1ZTogZnVuY3Rpb24gX2hhbmRsZVZhbHVlKHgpIHtcblx0ICAgIGlmICh0aGlzLl9hY3RpdmF0aW5nKSB7XG5cdCAgICAgIHRoaXMuX2VtaXRWYWx1ZSh4KTtcblx0ICAgIH0gZWxzZSB7XG5cdCAgICAgIHRoaXMuX2J1ZmYucHVzaCh4KTtcblx0ICAgICAgc2V0VGltZW91dCh0aGlzLl8kc2hpZnRCdWZmLCB0aGlzLl93YWl0KTtcblx0ICAgIH1cblx0ICB9LFxuXG5cdCAgX2hhbmRsZUVuZDogZnVuY3Rpb24gX2hhbmRsZUVuZCgpIHtcblx0ICAgIGlmICh0aGlzLl9hY3RpdmF0aW5nKSB7XG5cdCAgICAgIHRoaXMuX2VtaXRFbmQoKTtcblx0ICAgIH0gZWxzZSB7XG5cdCAgICAgIHRoaXMuX2J1ZmYucHVzaChFTkRfTUFSS0VSKTtcblx0ICAgICAgc2V0VGltZW91dCh0aGlzLl8kc2hpZnRCdWZmLCB0aGlzLl93YWl0KTtcblx0ICAgIH1cblx0ICB9XG5cblx0fTtcblxuXHR2YXIgUyA9IGNyZWF0ZVN0cmVhbSgnZGVsYXknLCBtaXhpbik7XG5cdHZhciBQID0gY3JlYXRlUHJvcGVydHkoJ2RlbGF5JywgbWl4aW4pO1xuXG5cdG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gZGVsYXkob2JzLCB3YWl0KSB7XG5cdCAgcmV0dXJuIG5ldyAob2JzLl9vZlNhbWVUeXBlKFMsIFApKShvYnMsIHsgd2FpdDogd2FpdCB9KTtcblx0fTtcblxuLyoqKi8gfSxcbi8qIDQ1ICovXG4vKioqLyBmdW5jdGlvbihtb2R1bGUsIGV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pIHtcblxuXHQndXNlIHN0cmljdCc7XG5cblx0dmFyIF9yZXF1aXJlID0gX193ZWJwYWNrX3JlcXVpcmVfXygyNSk7XG5cblx0dmFyIGNyZWF0ZVN0cmVhbSA9IF9yZXF1aXJlLmNyZWF0ZVN0cmVhbTtcblx0dmFyIGNyZWF0ZVByb3BlcnR5ID0gX3JlcXVpcmUuY3JlYXRlUHJvcGVydHk7XG5cblx0dmFyIG5vdyA9IF9fd2VicGFja19yZXF1aXJlX18oNDYpO1xuXG5cdHZhciBtaXhpbiA9IHtcblxuXHQgIF9pbml0OiBmdW5jdGlvbiBfaW5pdChfcmVmKSB7XG5cdCAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG5cdCAgICB2YXIgd2FpdCA9IF9yZWYud2FpdDtcblx0ICAgIHZhciBsZWFkaW5nID0gX3JlZi5sZWFkaW5nO1xuXHQgICAgdmFyIHRyYWlsaW5nID0gX3JlZi50cmFpbGluZztcblxuXHQgICAgdGhpcy5fd2FpdCA9IE1hdGgubWF4KDAsIHdhaXQpO1xuXHQgICAgdGhpcy5fbGVhZGluZyA9IGxlYWRpbmc7XG5cdCAgICB0aGlzLl90cmFpbGluZyA9IHRyYWlsaW5nO1xuXHQgICAgdGhpcy5fdHJhaWxpbmdWYWx1ZSA9IG51bGw7XG5cdCAgICB0aGlzLl90aW1lb3V0SWQgPSBudWxsO1xuXHQgICAgdGhpcy5fZW5kTGF0ZXIgPSBmYWxzZTtcblx0ICAgIHRoaXMuX2xhc3RDYWxsVGltZSA9IDA7XG5cdCAgICB0aGlzLl8kdHJhaWxpbmdDYWxsID0gZnVuY3Rpb24gKCkge1xuXHQgICAgICByZXR1cm4gX3RoaXMuX3RyYWlsaW5nQ2FsbCgpO1xuXHQgICAgfTtcblx0ICB9LFxuXG5cdCAgX2ZyZWU6IGZ1bmN0aW9uIF9mcmVlKCkge1xuXHQgICAgdGhpcy5fdHJhaWxpbmdWYWx1ZSA9IG51bGw7XG5cdCAgICB0aGlzLl8kdHJhaWxpbmdDYWxsID0gbnVsbDtcblx0ICB9LFxuXG5cdCAgX2hhbmRsZVZhbHVlOiBmdW5jdGlvbiBfaGFuZGxlVmFsdWUoeCkge1xuXHQgICAgaWYgKHRoaXMuX2FjdGl2YXRpbmcpIHtcblx0ICAgICAgdGhpcy5fZW1pdFZhbHVlKHgpO1xuXHQgICAgfSBlbHNlIHtcblx0ICAgICAgdmFyIGN1clRpbWUgPSBub3coKTtcblx0ICAgICAgaWYgKHRoaXMuX2xhc3RDYWxsVGltZSA9PT0gMCAmJiAhdGhpcy5fbGVhZGluZykge1xuXHQgICAgICAgIHRoaXMuX2xhc3RDYWxsVGltZSA9IGN1clRpbWU7XG5cdCAgICAgIH1cblx0ICAgICAgdmFyIHJlbWFpbmluZyA9IHRoaXMuX3dhaXQgLSAoY3VyVGltZSAtIHRoaXMuX2xhc3RDYWxsVGltZSk7XG5cdCAgICAgIGlmIChyZW1haW5pbmcgPD0gMCkge1xuXHQgICAgICAgIHRoaXMuX2NhbmNlbFRyYWlsaW5nKCk7XG5cdCAgICAgICAgdGhpcy5fbGFzdENhbGxUaW1lID0gY3VyVGltZTtcblx0ICAgICAgICB0aGlzLl9lbWl0VmFsdWUoeCk7XG5cdCAgICAgIH0gZWxzZSBpZiAodGhpcy5fdHJhaWxpbmcpIHtcblx0ICAgICAgICB0aGlzLl9jYW5jZWxUcmFpbGluZygpO1xuXHQgICAgICAgIHRoaXMuX3RyYWlsaW5nVmFsdWUgPSB4O1xuXHQgICAgICAgIHRoaXMuX3RpbWVvdXRJZCA9IHNldFRpbWVvdXQodGhpcy5fJHRyYWlsaW5nQ2FsbCwgcmVtYWluaW5nKTtcblx0ICAgICAgfVxuXHQgICAgfVxuXHQgIH0sXG5cblx0ICBfaGFuZGxlRW5kOiBmdW5jdGlvbiBfaGFuZGxlRW5kKCkge1xuXHQgICAgaWYgKHRoaXMuX2FjdGl2YXRpbmcpIHtcblx0ICAgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgICAgfSBlbHNlIHtcblx0ICAgICAgaWYgKHRoaXMuX3RpbWVvdXRJZCkge1xuXHQgICAgICAgIHRoaXMuX2VuZExhdGVyID0gdHJ1ZTtcblx0ICAgICAgfSBlbHNlIHtcblx0ICAgICAgICB0aGlzLl9lbWl0RW5kKCk7XG5cdCAgICAgIH1cblx0ICAgIH1cblx0ICB9LFxuXG5cdCAgX2NhbmNlbFRyYWlsaW5nOiBmdW5jdGlvbiBfY2FuY2VsVHJhaWxpbmcoKSB7XG5cdCAgICBpZiAodGhpcy5fdGltZW91dElkICE9PSBudWxsKSB7XG5cdCAgICAgIGNsZWFyVGltZW91dCh0aGlzLl90aW1lb3V0SWQpO1xuXHQgICAgICB0aGlzLl90aW1lb3V0SWQgPSBudWxsO1xuXHQgICAgfVxuXHQgIH0sXG5cblx0ICBfdHJhaWxpbmdDYWxsOiBmdW5jdGlvbiBfdHJhaWxpbmdDYWxsKCkge1xuXHQgICAgdGhpcy5fZW1pdFZhbHVlKHRoaXMuX3RyYWlsaW5nVmFsdWUpO1xuXHQgICAgdGhpcy5fdGltZW91dElkID0gbnVsbDtcblx0ICAgIHRoaXMuX3RyYWlsaW5nVmFsdWUgPSBudWxsO1xuXHQgICAgdGhpcy5fbGFzdENhbGxUaW1lID0gIXRoaXMuX2xlYWRpbmcgPyAwIDogbm93KCk7XG5cdCAgICBpZiAodGhpcy5fZW5kTGF0ZXIpIHtcblx0ICAgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgICAgfVxuXHQgIH1cblxuXHR9O1xuXG5cdHZhciBTID0gY3JlYXRlU3RyZWFtKCd0aHJvdHRsZScsIG1peGluKTtcblx0dmFyIFAgPSBjcmVhdGVQcm9wZXJ0eSgndGhyb3R0bGUnLCBtaXhpbik7XG5cblx0bW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiB0aHJvdHRsZShvYnMsIHdhaXQpIHtcblx0ICB2YXIgX3JlZjIgPSBhcmd1bWVudHMubGVuZ3RoIDw9IDIgfHwgYXJndW1lbnRzWzJdID09PSB1bmRlZmluZWQgPyB7fSA6IGFyZ3VtZW50c1syXTtcblxuXHQgIHZhciBfcmVmMiRsZWFkaW5nID0gX3JlZjIubGVhZGluZztcblx0ICB2YXIgbGVhZGluZyA9IF9yZWYyJGxlYWRpbmcgPT09IHVuZGVmaW5lZCA/IHRydWUgOiBfcmVmMiRsZWFkaW5nO1xuXHQgIHZhciBfcmVmMiR0cmFpbGluZyA9IF9yZWYyLnRyYWlsaW5nO1xuXHQgIHZhciB0cmFpbGluZyA9IF9yZWYyJHRyYWlsaW5nID09PSB1bmRlZmluZWQgPyB0cnVlIDogX3JlZjIkdHJhaWxpbmc7XG5cblx0ICByZXR1cm4gbmV3IChvYnMuX29mU2FtZVR5cGUoUywgUCkpKG9icywgeyB3YWl0OiB3YWl0LCBsZWFkaW5nOiBsZWFkaW5nLCB0cmFpbGluZzogdHJhaWxpbmcgfSk7XG5cdH07XG5cbi8qKiovIH0sXG4vKiA0NiAqL1xuLyoqKi8gZnVuY3Rpb24obW9kdWxlLCBleHBvcnRzKSB7XG5cblx0XCJ1c2Ugc3RyaWN0XCI7XG5cblx0bW9kdWxlLmV4cG9ydHMgPSBEYXRlLm5vdyA/IGZ1bmN0aW9uICgpIHtcblx0ICByZXR1cm4gRGF0ZS5ub3coKTtcblx0fSA6IGZ1bmN0aW9uICgpIHtcblx0ICByZXR1cm4gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG5cdH07XG5cbi8qKiovIH0sXG4vKiA0NyAqL1xuLyoqKi8gZnVuY3Rpb24obW9kdWxlLCBleHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKSB7XG5cblx0J3VzZSBzdHJpY3QnO1xuXG5cdHZhciBfcmVxdWlyZSA9IF9fd2VicGFja19yZXF1aXJlX18oMjUpO1xuXG5cdHZhciBjcmVhdGVTdHJlYW0gPSBfcmVxdWlyZS5jcmVhdGVTdHJlYW07XG5cdHZhciBjcmVhdGVQcm9wZXJ0eSA9IF9yZXF1aXJlLmNyZWF0ZVByb3BlcnR5O1xuXG5cdHZhciBub3cgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDQ2KTtcblxuXHR2YXIgbWl4aW4gPSB7XG5cblx0ICBfaW5pdDogZnVuY3Rpb24gX2luaXQoX3JlZikge1xuXHQgICAgdmFyIF90aGlzID0gdGhpcztcblxuXHQgICAgdmFyIHdhaXQgPSBfcmVmLndhaXQ7XG5cdCAgICB2YXIgaW1tZWRpYXRlID0gX3JlZi5pbW1lZGlhdGU7XG5cblx0ICAgIHRoaXMuX3dhaXQgPSBNYXRoLm1heCgwLCB3YWl0KTtcblx0ICAgIHRoaXMuX2ltbWVkaWF0ZSA9IGltbWVkaWF0ZTtcblx0ICAgIHRoaXMuX2xhc3RBdHRlbXB0ID0gMDtcblx0ICAgIHRoaXMuX3RpbWVvdXRJZCA9IG51bGw7XG5cdCAgICB0aGlzLl9sYXRlclZhbHVlID0gbnVsbDtcblx0ICAgIHRoaXMuX2VuZExhdGVyID0gZmFsc2U7XG5cdCAgICB0aGlzLl8kbGF0ZXIgPSBmdW5jdGlvbiAoKSB7XG5cdCAgICAgIHJldHVybiBfdGhpcy5fbGF0ZXIoKTtcblx0ICAgIH07XG5cdCAgfSxcblxuXHQgIF9mcmVlOiBmdW5jdGlvbiBfZnJlZSgpIHtcblx0ICAgIHRoaXMuX2xhdGVyVmFsdWUgPSBudWxsO1xuXHQgICAgdGhpcy5fJGxhdGVyID0gbnVsbDtcblx0ICB9LFxuXG5cdCAgX2hhbmRsZVZhbHVlOiBmdW5jdGlvbiBfaGFuZGxlVmFsdWUoeCkge1xuXHQgICAgaWYgKHRoaXMuX2FjdGl2YXRpbmcpIHtcblx0ICAgICAgdGhpcy5fZW1pdFZhbHVlKHgpO1xuXHQgICAgfSBlbHNlIHtcblx0ICAgICAgdGhpcy5fbGFzdEF0dGVtcHQgPSBub3coKTtcblx0ICAgICAgaWYgKHRoaXMuX2ltbWVkaWF0ZSAmJiAhdGhpcy5fdGltZW91dElkKSB7XG5cdCAgICAgICAgdGhpcy5fZW1pdFZhbHVlKHgpO1xuXHQgICAgICB9XG5cdCAgICAgIGlmICghdGhpcy5fdGltZW91dElkKSB7XG5cdCAgICAgICAgdGhpcy5fdGltZW91dElkID0gc2V0VGltZW91dCh0aGlzLl8kbGF0ZXIsIHRoaXMuX3dhaXQpO1xuXHQgICAgICB9XG5cdCAgICAgIGlmICghdGhpcy5faW1tZWRpYXRlKSB7XG5cdCAgICAgICAgdGhpcy5fbGF0ZXJWYWx1ZSA9IHg7XG5cdCAgICAgIH1cblx0ICAgIH1cblx0ICB9LFxuXG5cdCAgX2hhbmRsZUVuZDogZnVuY3Rpb24gX2hhbmRsZUVuZCgpIHtcblx0ICAgIGlmICh0aGlzLl9hY3RpdmF0aW5nKSB7XG5cdCAgICAgIHRoaXMuX2VtaXRFbmQoKTtcblx0ICAgIH0gZWxzZSB7XG5cdCAgICAgIGlmICh0aGlzLl90aW1lb3V0SWQgJiYgIXRoaXMuX2ltbWVkaWF0ZSkge1xuXHQgICAgICAgIHRoaXMuX2VuZExhdGVyID0gdHJ1ZTtcblx0ICAgICAgfSBlbHNlIHtcblx0ICAgICAgICB0aGlzLl9lbWl0RW5kKCk7XG5cdCAgICAgIH1cblx0ICAgIH1cblx0ICB9LFxuXG5cdCAgX2xhdGVyOiBmdW5jdGlvbiBfbGF0ZXIoKSB7XG5cdCAgICB2YXIgbGFzdCA9IG5vdygpIC0gdGhpcy5fbGFzdEF0dGVtcHQ7XG5cdCAgICBpZiAobGFzdCA8IHRoaXMuX3dhaXQgJiYgbGFzdCA+PSAwKSB7XG5cdCAgICAgIHRoaXMuX3RpbWVvdXRJZCA9IHNldFRpbWVvdXQodGhpcy5fJGxhdGVyLCB0aGlzLl93YWl0IC0gbGFzdCk7XG5cdCAgICB9IGVsc2Uge1xuXHQgICAgICB0aGlzLl90aW1lb3V0SWQgPSBudWxsO1xuXHQgICAgICBpZiAoIXRoaXMuX2ltbWVkaWF0ZSkge1xuXHQgICAgICAgIHRoaXMuX2VtaXRWYWx1ZSh0aGlzLl9sYXRlclZhbHVlKTtcblx0ICAgICAgICB0aGlzLl9sYXRlclZhbHVlID0gbnVsbDtcblx0ICAgICAgfVxuXHQgICAgICBpZiAodGhpcy5fZW5kTGF0ZXIpIHtcblx0ICAgICAgICB0aGlzLl9lbWl0RW5kKCk7XG5cdCAgICAgIH1cblx0ICAgIH1cblx0ICB9XG5cblx0fTtcblxuXHR2YXIgUyA9IGNyZWF0ZVN0cmVhbSgnZGVib3VuY2UnLCBtaXhpbik7XG5cdHZhciBQID0gY3JlYXRlUHJvcGVydHkoJ2RlYm91bmNlJywgbWl4aW4pO1xuXG5cdG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gZGVib3VuY2Uob2JzLCB3YWl0KSB7XG5cdCAgdmFyIF9yZWYyID0gYXJndW1lbnRzLmxlbmd0aCA8PSAyIHx8IGFyZ3VtZW50c1syXSA9PT0gdW5kZWZpbmVkID8ge30gOiBhcmd1bWVudHNbMl07XG5cblx0ICB2YXIgX3JlZjIkaW1tZWRpYXRlID0gX3JlZjIuaW1tZWRpYXRlO1xuXHQgIHZhciBpbW1lZGlhdGUgPSBfcmVmMiRpbW1lZGlhdGUgPT09IHVuZGVmaW5lZCA/IGZhbHNlIDogX3JlZjIkaW1tZWRpYXRlO1xuXG5cdCAgcmV0dXJuIG5ldyAob2JzLl9vZlNhbWVUeXBlKFMsIFApKShvYnMsIHsgd2FpdDogd2FpdCwgaW1tZWRpYXRlOiBpbW1lZGlhdGUgfSk7XG5cdH07XG5cbi8qKiovIH0sXG4vKiA0OCAqL1xuLyoqKi8gZnVuY3Rpb24obW9kdWxlLCBleHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKSB7XG5cblx0J3VzZSBzdHJpY3QnO1xuXG5cdHZhciBfcmVxdWlyZSA9IF9fd2VicGFja19yZXF1aXJlX18oMjUpO1xuXG5cdHZhciBjcmVhdGVTdHJlYW0gPSBfcmVxdWlyZS5jcmVhdGVTdHJlYW07XG5cdHZhciBjcmVhdGVQcm9wZXJ0eSA9IF9yZXF1aXJlLmNyZWF0ZVByb3BlcnR5O1xuXG5cdHZhciBtaXhpbiA9IHtcblxuXHQgIF9pbml0OiBmdW5jdGlvbiBfaW5pdChfcmVmKSB7XG5cdCAgICB2YXIgZm4gPSBfcmVmLmZuO1xuXG5cdCAgICB0aGlzLl9mbiA9IGZuO1xuXHQgIH0sXG5cblx0ICBfZnJlZTogZnVuY3Rpb24gX2ZyZWUoKSB7XG5cdCAgICB0aGlzLl9mbiA9IG51bGw7XG5cdCAgfSxcblxuXHQgIF9oYW5kbGVFcnJvcjogZnVuY3Rpb24gX2hhbmRsZUVycm9yKHgpIHtcblx0ICAgIHZhciBmbiA9IHRoaXMuX2ZuO1xuXHQgICAgdGhpcy5fZW1pdEVycm9yKGZuKHgpKTtcblx0ICB9XG5cblx0fTtcblxuXHR2YXIgUyA9IGNyZWF0ZVN0cmVhbSgnbWFwRXJyb3JzJywgbWl4aW4pO1xuXHR2YXIgUCA9IGNyZWF0ZVByb3BlcnR5KCdtYXBFcnJvcnMnLCBtaXhpbik7XG5cblx0dmFyIGlkID0gZnVuY3Rpb24gaWQoeCkge1xuXHQgIHJldHVybiB4O1xuXHR9O1xuXG5cdG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gbWFwRXJyb3JzKG9icykge1xuXHQgIHZhciBmbiA9IGFyZ3VtZW50cy5sZW5ndGggPD0gMSB8fCBhcmd1bWVudHNbMV0gPT09IHVuZGVmaW5lZCA/IGlkIDogYXJndW1lbnRzWzFdO1xuXG5cdCAgcmV0dXJuIG5ldyAob2JzLl9vZlNhbWVUeXBlKFMsIFApKShvYnMsIHsgZm46IGZuIH0pO1xuXHR9O1xuXG4vKioqLyB9LFxuLyogNDkgKi9cbi8qKiovIGZ1bmN0aW9uKG1vZHVsZSwgZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXykge1xuXG5cdCd1c2Ugc3RyaWN0JztcblxuXHR2YXIgX3JlcXVpcmUgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDI1KTtcblxuXHR2YXIgY3JlYXRlU3RyZWFtID0gX3JlcXVpcmUuY3JlYXRlU3RyZWFtO1xuXHR2YXIgY3JlYXRlUHJvcGVydHkgPSBfcmVxdWlyZS5jcmVhdGVQcm9wZXJ0eTtcblxuXHR2YXIgbWl4aW4gPSB7XG5cblx0ICBfaW5pdDogZnVuY3Rpb24gX2luaXQoX3JlZikge1xuXHQgICAgdmFyIGZuID0gX3JlZi5mbjtcblxuXHQgICAgdGhpcy5fZm4gPSBmbjtcblx0ICB9LFxuXG5cdCAgX2ZyZWU6IGZ1bmN0aW9uIF9mcmVlKCkge1xuXHQgICAgdGhpcy5fZm4gPSBudWxsO1xuXHQgIH0sXG5cblx0ICBfaGFuZGxlRXJyb3I6IGZ1bmN0aW9uIF9oYW5kbGVFcnJvcih4KSB7XG5cdCAgICB2YXIgZm4gPSB0aGlzLl9mbjtcblx0ICAgIGlmIChmbih4KSkge1xuXHQgICAgICB0aGlzLl9lbWl0RXJyb3IoeCk7XG5cdCAgICB9XG5cdCAgfVxuXG5cdH07XG5cblx0dmFyIFMgPSBjcmVhdGVTdHJlYW0oJ2ZpbHRlckVycm9ycycsIG1peGluKTtcblx0dmFyIFAgPSBjcmVhdGVQcm9wZXJ0eSgnZmlsdGVyRXJyb3JzJywgbWl4aW4pO1xuXG5cdHZhciBpZCA9IGZ1bmN0aW9uIGlkKHgpIHtcblx0ICByZXR1cm4geDtcblx0fTtcblxuXHRtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGZpbHRlckVycm9ycyhvYnMpIHtcblx0ICB2YXIgZm4gPSBhcmd1bWVudHMubGVuZ3RoIDw9IDEgfHwgYXJndW1lbnRzWzFdID09PSB1bmRlZmluZWQgPyBpZCA6IGFyZ3VtZW50c1sxXTtcblxuXHQgIHJldHVybiBuZXcgKG9icy5fb2ZTYW1lVHlwZShTLCBQKSkob2JzLCB7IGZuOiBmbiB9KTtcblx0fTtcblxuLyoqKi8gfSxcbi8qIDUwICovXG4vKioqLyBmdW5jdGlvbihtb2R1bGUsIGV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pIHtcblxuXHQndXNlIHN0cmljdCc7XG5cblx0dmFyIF9yZXF1aXJlID0gX193ZWJwYWNrX3JlcXVpcmVfXygyNSk7XG5cblx0dmFyIGNyZWF0ZVN0cmVhbSA9IF9yZXF1aXJlLmNyZWF0ZVN0cmVhbTtcblx0dmFyIGNyZWF0ZVByb3BlcnR5ID0gX3JlcXVpcmUuY3JlYXRlUHJvcGVydHk7XG5cblx0dmFyIG1peGluID0ge1xuXHQgIF9oYW5kbGVWYWx1ZTogZnVuY3Rpb24gX2hhbmRsZVZhbHVlKCkge31cblx0fTtcblxuXHR2YXIgUyA9IGNyZWF0ZVN0cmVhbSgnaWdub3JlVmFsdWVzJywgbWl4aW4pO1xuXHR2YXIgUCA9IGNyZWF0ZVByb3BlcnR5KCdpZ25vcmVWYWx1ZXMnLCBtaXhpbik7XG5cblx0bW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBpZ25vcmVWYWx1ZXMob2JzKSB7XG5cdCAgcmV0dXJuIG5ldyAob2JzLl9vZlNhbWVUeXBlKFMsIFApKShvYnMpO1xuXHR9O1xuXG4vKioqLyB9LFxuLyogNTEgKi9cbi8qKiovIGZ1bmN0aW9uKG1vZHVsZSwgZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXykge1xuXG5cdCd1c2Ugc3RyaWN0JztcblxuXHR2YXIgX3JlcXVpcmUgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDI1KTtcblxuXHR2YXIgY3JlYXRlU3RyZWFtID0gX3JlcXVpcmUuY3JlYXRlU3RyZWFtO1xuXHR2YXIgY3JlYXRlUHJvcGVydHkgPSBfcmVxdWlyZS5jcmVhdGVQcm9wZXJ0eTtcblxuXHR2YXIgbWl4aW4gPSB7XG5cdCAgX2hhbmRsZUVycm9yOiBmdW5jdGlvbiBfaGFuZGxlRXJyb3IoKSB7fVxuXHR9O1xuXG5cdHZhciBTID0gY3JlYXRlU3RyZWFtKCdpZ25vcmVFcnJvcnMnLCBtaXhpbik7XG5cdHZhciBQID0gY3JlYXRlUHJvcGVydHkoJ2lnbm9yZUVycm9ycycsIG1peGluKTtcblxuXHRtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGlnbm9yZUVycm9ycyhvYnMpIHtcblx0ICByZXR1cm4gbmV3IChvYnMuX29mU2FtZVR5cGUoUywgUCkpKG9icyk7XG5cdH07XG5cbi8qKiovIH0sXG4vKiA1MiAqL1xuLyoqKi8gZnVuY3Rpb24obW9kdWxlLCBleHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKSB7XG5cblx0J3VzZSBzdHJpY3QnO1xuXG5cdHZhciBfcmVxdWlyZSA9IF9fd2VicGFja19yZXF1aXJlX18oMjUpO1xuXG5cdHZhciBjcmVhdGVTdHJlYW0gPSBfcmVxdWlyZS5jcmVhdGVTdHJlYW07XG5cdHZhciBjcmVhdGVQcm9wZXJ0eSA9IF9yZXF1aXJlLmNyZWF0ZVByb3BlcnR5O1xuXG5cdHZhciBtaXhpbiA9IHtcblx0ICBfaGFuZGxlRW5kOiBmdW5jdGlvbiBfaGFuZGxlRW5kKCkge31cblx0fTtcblxuXHR2YXIgUyA9IGNyZWF0ZVN0cmVhbSgnaWdub3JlRW5kJywgbWl4aW4pO1xuXHR2YXIgUCA9IGNyZWF0ZVByb3BlcnR5KCdpZ25vcmVFbmQnLCBtaXhpbik7XG5cblx0bW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBpZ25vcmVFbmQob2JzKSB7XG5cdCAgcmV0dXJuIG5ldyAob2JzLl9vZlNhbWVUeXBlKFMsIFApKShvYnMpO1xuXHR9O1xuXG4vKioqLyB9LFxuLyogNTMgKi9cbi8qKiovIGZ1bmN0aW9uKG1vZHVsZSwgZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXykge1xuXG5cdCd1c2Ugc3RyaWN0JztcblxuXHR2YXIgX3JlcXVpcmUgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDI1KTtcblxuXHR2YXIgY3JlYXRlU3RyZWFtID0gX3JlcXVpcmUuY3JlYXRlU3RyZWFtO1xuXHR2YXIgY3JlYXRlUHJvcGVydHkgPSBfcmVxdWlyZS5jcmVhdGVQcm9wZXJ0eTtcblxuXHR2YXIgbWl4aW4gPSB7XG5cblx0ICBfaW5pdDogZnVuY3Rpb24gX2luaXQoX3JlZikge1xuXHQgICAgdmFyIGZuID0gX3JlZi5mbjtcblxuXHQgICAgdGhpcy5fZm4gPSBmbjtcblx0ICB9LFxuXG5cdCAgX2ZyZWU6IGZ1bmN0aW9uIF9mcmVlKCkge1xuXHQgICAgdGhpcy5fZm4gPSBudWxsO1xuXHQgIH0sXG5cblx0ICBfaGFuZGxlRW5kOiBmdW5jdGlvbiBfaGFuZGxlRW5kKCkge1xuXHQgICAgdmFyIGZuID0gdGhpcy5fZm47XG5cdCAgICB0aGlzLl9lbWl0VmFsdWUoZm4oKSk7XG5cdCAgICB0aGlzLl9lbWl0RW5kKCk7XG5cdCAgfVxuXG5cdH07XG5cblx0dmFyIFMgPSBjcmVhdGVTdHJlYW0oJ2JlZm9yZUVuZCcsIG1peGluKTtcblx0dmFyIFAgPSBjcmVhdGVQcm9wZXJ0eSgnYmVmb3JlRW5kJywgbWl4aW4pO1xuXG5cdG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gYmVmb3JlRW5kKG9icywgZm4pIHtcblx0ICByZXR1cm4gbmV3IChvYnMuX29mU2FtZVR5cGUoUywgUCkpKG9icywgeyBmbjogZm4gfSk7XG5cdH07XG5cbi8qKiovIH0sXG4vKiA1NCAqL1xuLyoqKi8gZnVuY3Rpb24obW9kdWxlLCBleHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKSB7XG5cblx0J3VzZSBzdHJpY3QnO1xuXG5cdHZhciBfcmVxdWlyZSA9IF9fd2VicGFja19yZXF1aXJlX18oMjUpO1xuXG5cdHZhciBjcmVhdGVTdHJlYW0gPSBfcmVxdWlyZS5jcmVhdGVTdHJlYW07XG5cdHZhciBjcmVhdGVQcm9wZXJ0eSA9IF9yZXF1aXJlLmNyZWF0ZVByb3BlcnR5O1xuXG5cdHZhciBfcmVxdWlyZTIgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDUpO1xuXG5cdHZhciBzbGlkZSA9IF9yZXF1aXJlMi5zbGlkZTtcblxuXHR2YXIgbWl4aW4gPSB7XG5cblx0ICBfaW5pdDogZnVuY3Rpb24gX2luaXQoX3JlZikge1xuXHQgICAgdmFyIG1pbiA9IF9yZWYubWluO1xuXHQgICAgdmFyIG1heCA9IF9yZWYubWF4O1xuXG5cdCAgICB0aGlzLl9tYXggPSBtYXg7XG5cdCAgICB0aGlzLl9taW4gPSBtaW47XG5cdCAgICB0aGlzLl9idWZmID0gW107XG5cdCAgfSxcblxuXHQgIF9mcmVlOiBmdW5jdGlvbiBfZnJlZSgpIHtcblx0ICAgIHRoaXMuX2J1ZmYgPSBudWxsO1xuXHQgIH0sXG5cblx0ICBfaGFuZGxlVmFsdWU6IGZ1bmN0aW9uIF9oYW5kbGVWYWx1ZSh4KSB7XG5cdCAgICB0aGlzLl9idWZmID0gc2xpZGUodGhpcy5fYnVmZiwgeCwgdGhpcy5fbWF4KTtcblx0ICAgIGlmICh0aGlzLl9idWZmLmxlbmd0aCA+PSB0aGlzLl9taW4pIHtcblx0ICAgICAgdGhpcy5fZW1pdFZhbHVlKHRoaXMuX2J1ZmYpO1xuXHQgICAgfVxuXHQgIH1cblxuXHR9O1xuXG5cdHZhciBTID0gY3JlYXRlU3RyZWFtKCdzbGlkaW5nV2luZG93JywgbWl4aW4pO1xuXHR2YXIgUCA9IGNyZWF0ZVByb3BlcnR5KCdzbGlkaW5nV2luZG93JywgbWl4aW4pO1xuXG5cdG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gc2xpZGluZ1dpbmRvdyhvYnMsIG1heCkge1xuXHQgIHZhciBtaW4gPSBhcmd1bWVudHMubGVuZ3RoIDw9IDIgfHwgYXJndW1lbnRzWzJdID09PSB1bmRlZmluZWQgPyAwIDogYXJndW1lbnRzWzJdO1xuXG5cdCAgcmV0dXJuIG5ldyAob2JzLl9vZlNhbWVUeXBlKFMsIFApKShvYnMsIHsgbWluOiBtaW4sIG1heDogbWF4IH0pO1xuXHR9O1xuXG4vKioqLyB9LFxuLyogNTUgKi9cbi8qKiovIGZ1bmN0aW9uKG1vZHVsZSwgZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXykge1xuXG5cdCd1c2Ugc3RyaWN0JztcblxuXHR2YXIgX3JlcXVpcmUgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDI1KTtcblxuXHR2YXIgY3JlYXRlU3RyZWFtID0gX3JlcXVpcmUuY3JlYXRlU3RyZWFtO1xuXHR2YXIgY3JlYXRlUHJvcGVydHkgPSBfcmVxdWlyZS5jcmVhdGVQcm9wZXJ0eTtcblxuXHR2YXIgbWl4aW4gPSB7XG5cblx0ICBfaW5pdDogZnVuY3Rpb24gX2luaXQoX3JlZikge1xuXHQgICAgdmFyIGZuID0gX3JlZi5mbjtcblx0ICAgIHZhciBmbHVzaE9uRW5kID0gX3JlZi5mbHVzaE9uRW5kO1xuXG5cdCAgICB0aGlzLl9mbiA9IGZuO1xuXHQgICAgdGhpcy5fZmx1c2hPbkVuZCA9IGZsdXNoT25FbmQ7XG5cdCAgICB0aGlzLl9idWZmID0gW107XG5cdCAgfSxcblxuXHQgIF9mcmVlOiBmdW5jdGlvbiBfZnJlZSgpIHtcblx0ICAgIHRoaXMuX2J1ZmYgPSBudWxsO1xuXHQgIH0sXG5cblx0ICBfZmx1c2g6IGZ1bmN0aW9uIF9mbHVzaCgpIHtcblx0ICAgIGlmICh0aGlzLl9idWZmICE9PSBudWxsICYmIHRoaXMuX2J1ZmYubGVuZ3RoICE9PSAwKSB7XG5cdCAgICAgIHRoaXMuX2VtaXRWYWx1ZSh0aGlzLl9idWZmKTtcblx0ICAgICAgdGhpcy5fYnVmZiA9IFtdO1xuXHQgICAgfVxuXHQgIH0sXG5cblx0ICBfaGFuZGxlVmFsdWU6IGZ1bmN0aW9uIF9oYW5kbGVWYWx1ZSh4KSB7XG5cdCAgICB0aGlzLl9idWZmLnB1c2goeCk7XG5cdCAgICB2YXIgZm4gPSB0aGlzLl9mbjtcblx0ICAgIGlmICghZm4oeCkpIHtcblx0ICAgICAgdGhpcy5fZmx1c2goKTtcblx0ICAgIH1cblx0ICB9LFxuXG5cdCAgX2hhbmRsZUVuZDogZnVuY3Rpb24gX2hhbmRsZUVuZCgpIHtcblx0ICAgIGlmICh0aGlzLl9mbHVzaE9uRW5kKSB7XG5cdCAgICAgIHRoaXMuX2ZsdXNoKCk7XG5cdCAgICB9XG5cdCAgICB0aGlzLl9lbWl0RW5kKCk7XG5cdCAgfVxuXG5cdH07XG5cblx0dmFyIFMgPSBjcmVhdGVTdHJlYW0oJ2J1ZmZlcldoaWxlJywgbWl4aW4pO1xuXHR2YXIgUCA9IGNyZWF0ZVByb3BlcnR5KCdidWZmZXJXaGlsZScsIG1peGluKTtcblxuXHR2YXIgaWQgPSBmdW5jdGlvbiBpZCh4KSB7XG5cdCAgcmV0dXJuIHg7XG5cdH07XG5cblx0bW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBidWZmZXJXaGlsZShvYnMsIGZuKSB7XG5cdCAgdmFyIF9yZWYyID0gYXJndW1lbnRzLmxlbmd0aCA8PSAyIHx8IGFyZ3VtZW50c1syXSA9PT0gdW5kZWZpbmVkID8ge30gOiBhcmd1bWVudHNbMl07XG5cblx0ICB2YXIgX3JlZjIkZmx1c2hPbkVuZCA9IF9yZWYyLmZsdXNoT25FbmQ7XG5cdCAgdmFyIGZsdXNoT25FbmQgPSBfcmVmMiRmbHVzaE9uRW5kID09PSB1bmRlZmluZWQgPyB0cnVlIDogX3JlZjIkZmx1c2hPbkVuZDtcblxuXHQgIHJldHVybiBuZXcgKG9icy5fb2ZTYW1lVHlwZShTLCBQKSkob2JzLCB7IGZuOiBmbiB8fCBpZCwgZmx1c2hPbkVuZDogZmx1c2hPbkVuZCB9KTtcblx0fTtcblxuLyoqKi8gfSxcbi8qIDU2ICovXG4vKioqLyBmdW5jdGlvbihtb2R1bGUsIGV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pIHtcblxuXHQndXNlIHN0cmljdCc7XG5cblx0dmFyIF9yZXF1aXJlID0gX193ZWJwYWNrX3JlcXVpcmVfXygyNSk7XG5cblx0dmFyIGNyZWF0ZVN0cmVhbSA9IF9yZXF1aXJlLmNyZWF0ZVN0cmVhbTtcblx0dmFyIGNyZWF0ZVByb3BlcnR5ID0gX3JlcXVpcmUuY3JlYXRlUHJvcGVydHk7XG5cblx0dmFyIG1peGluID0ge1xuXG5cdCAgX2luaXQ6IGZ1bmN0aW9uIF9pbml0KF9yZWYpIHtcblx0ICAgIHZhciBjb3VudCA9IF9yZWYuY291bnQ7XG5cdCAgICB2YXIgZmx1c2hPbkVuZCA9IF9yZWYuZmx1c2hPbkVuZDtcblxuXHQgICAgdGhpcy5fY291bnQgPSBjb3VudDtcblx0ICAgIHRoaXMuX2ZsdXNoT25FbmQgPSBmbHVzaE9uRW5kO1xuXHQgICAgdGhpcy5fYnVmZiA9IFtdO1xuXHQgIH0sXG5cblx0ICBfZnJlZTogZnVuY3Rpb24gX2ZyZWUoKSB7XG5cdCAgICB0aGlzLl9idWZmID0gbnVsbDtcblx0ICB9LFxuXG5cdCAgX2ZsdXNoOiBmdW5jdGlvbiBfZmx1c2goKSB7XG5cdCAgICBpZiAodGhpcy5fYnVmZiAhPT0gbnVsbCAmJiB0aGlzLl9idWZmLmxlbmd0aCAhPT0gMCkge1xuXHQgICAgICB0aGlzLl9lbWl0VmFsdWUodGhpcy5fYnVmZik7XG5cdCAgICAgIHRoaXMuX2J1ZmYgPSBbXTtcblx0ICAgIH1cblx0ICB9LFxuXG5cdCAgX2hhbmRsZVZhbHVlOiBmdW5jdGlvbiBfaGFuZGxlVmFsdWUoeCkge1xuXHQgICAgdGhpcy5fYnVmZi5wdXNoKHgpO1xuXHQgICAgaWYgKHRoaXMuX2J1ZmYubGVuZ3RoID49IHRoaXMuX2NvdW50KSB7XG5cdCAgICAgIHRoaXMuX2ZsdXNoKCk7XG5cdCAgICB9XG5cdCAgfSxcblxuXHQgIF9oYW5kbGVFbmQ6IGZ1bmN0aW9uIF9oYW5kbGVFbmQoKSB7XG5cdCAgICBpZiAodGhpcy5fZmx1c2hPbkVuZCkge1xuXHQgICAgICB0aGlzLl9mbHVzaCgpO1xuXHQgICAgfVxuXHQgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgIH1cblxuXHR9O1xuXG5cdHZhciBTID0gY3JlYXRlU3RyZWFtKCdidWZmZXJXaXRoQ291bnQnLCBtaXhpbik7XG5cdHZhciBQID0gY3JlYXRlUHJvcGVydHkoJ2J1ZmZlcldpdGhDb3VudCcsIG1peGluKTtcblxuXHRtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGJ1ZmZlcldoaWxlKG9icywgY291bnQpIHtcblx0ICB2YXIgX3JlZjIgPSBhcmd1bWVudHMubGVuZ3RoIDw9IDIgfHwgYXJndW1lbnRzWzJdID09PSB1bmRlZmluZWQgPyB7fSA6IGFyZ3VtZW50c1syXTtcblxuXHQgIHZhciBfcmVmMiRmbHVzaE9uRW5kID0gX3JlZjIuZmx1c2hPbkVuZDtcblx0ICB2YXIgZmx1c2hPbkVuZCA9IF9yZWYyJGZsdXNoT25FbmQgPT09IHVuZGVmaW5lZCA/IHRydWUgOiBfcmVmMiRmbHVzaE9uRW5kO1xuXG5cdCAgcmV0dXJuIG5ldyAob2JzLl9vZlNhbWVUeXBlKFMsIFApKShvYnMsIHsgY291bnQ6IGNvdW50LCBmbHVzaE9uRW5kOiBmbHVzaE9uRW5kIH0pO1xuXHR9O1xuXG4vKioqLyB9LFxuLyogNTcgKi9cbi8qKiovIGZ1bmN0aW9uKG1vZHVsZSwgZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXykge1xuXG5cdCd1c2Ugc3RyaWN0JztcblxuXHR2YXIgX3JlcXVpcmUgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDI1KTtcblxuXHR2YXIgY3JlYXRlU3RyZWFtID0gX3JlcXVpcmUuY3JlYXRlU3RyZWFtO1xuXHR2YXIgY3JlYXRlUHJvcGVydHkgPSBfcmVxdWlyZS5jcmVhdGVQcm9wZXJ0eTtcblxuXHR2YXIgbWl4aW4gPSB7XG5cblx0ICBfaW5pdDogZnVuY3Rpb24gX2luaXQoX3JlZikge1xuXHQgICAgdmFyIF90aGlzID0gdGhpcztcblxuXHQgICAgdmFyIHdhaXQgPSBfcmVmLndhaXQ7XG5cdCAgICB2YXIgY291bnQgPSBfcmVmLmNvdW50O1xuXHQgICAgdmFyIGZsdXNoT25FbmQgPSBfcmVmLmZsdXNoT25FbmQ7XG5cblx0ICAgIHRoaXMuX3dhaXQgPSB3YWl0O1xuXHQgICAgdGhpcy5fY291bnQgPSBjb3VudDtcblx0ICAgIHRoaXMuX2ZsdXNoT25FbmQgPSBmbHVzaE9uRW5kO1xuXHQgICAgdGhpcy5faW50ZXJ2YWxJZCA9IG51bGw7XG5cdCAgICB0aGlzLl8kb25UaWNrID0gZnVuY3Rpb24gKCkge1xuXHQgICAgICByZXR1cm4gX3RoaXMuX2ZsdXNoKCk7XG5cdCAgICB9O1xuXHQgICAgdGhpcy5fYnVmZiA9IFtdO1xuXHQgIH0sXG5cblx0ICBfZnJlZTogZnVuY3Rpb24gX2ZyZWUoKSB7XG5cdCAgICB0aGlzLl8kb25UaWNrID0gbnVsbDtcblx0ICAgIHRoaXMuX2J1ZmYgPSBudWxsO1xuXHQgIH0sXG5cblx0ICBfZmx1c2g6IGZ1bmN0aW9uIF9mbHVzaCgpIHtcblx0ICAgIGlmICh0aGlzLl9idWZmICE9PSBudWxsKSB7XG5cdCAgICAgIHRoaXMuX2VtaXRWYWx1ZSh0aGlzLl9idWZmKTtcblx0ICAgICAgdGhpcy5fYnVmZiA9IFtdO1xuXHQgICAgfVxuXHQgIH0sXG5cblx0ICBfaGFuZGxlVmFsdWU6IGZ1bmN0aW9uIF9oYW5kbGVWYWx1ZSh4KSB7XG5cdCAgICB0aGlzLl9idWZmLnB1c2goeCk7XG5cdCAgICBpZiAodGhpcy5fYnVmZi5sZW5ndGggPj0gdGhpcy5fY291bnQpIHtcblx0ICAgICAgY2xlYXJJbnRlcnZhbCh0aGlzLl9pbnRlcnZhbElkKTtcblx0ICAgICAgdGhpcy5fZmx1c2goKTtcblx0ICAgICAgdGhpcy5faW50ZXJ2YWxJZCA9IHNldEludGVydmFsKHRoaXMuXyRvblRpY2ssIHRoaXMuX3dhaXQpO1xuXHQgICAgfVxuXHQgIH0sXG5cblx0ICBfaGFuZGxlRW5kOiBmdW5jdGlvbiBfaGFuZGxlRW5kKCkge1xuXHQgICAgaWYgKHRoaXMuX2ZsdXNoT25FbmQgJiYgdGhpcy5fYnVmZi5sZW5ndGggIT09IDApIHtcblx0ICAgICAgdGhpcy5fZmx1c2goKTtcblx0ICAgIH1cblx0ICAgIHRoaXMuX2VtaXRFbmQoKTtcblx0ICB9LFxuXG5cdCAgX29uQWN0aXZhdGlvbjogZnVuY3Rpb24gX29uQWN0aXZhdGlvbigpIHtcblx0ICAgIHRoaXMuX3NvdXJjZS5vbkFueSh0aGlzLl8kaGFuZGxlQW55KTsgLy8gY29waWVkIGZyb20gcGF0dGVybnMvb25lLXNvdXJjZVxuXHQgICAgdGhpcy5faW50ZXJ2YWxJZCA9IHNldEludGVydmFsKHRoaXMuXyRvblRpY2ssIHRoaXMuX3dhaXQpO1xuXHQgIH0sXG5cblx0ICBfb25EZWFjdGl2YXRpb246IGZ1bmN0aW9uIF9vbkRlYWN0aXZhdGlvbigpIHtcblx0ICAgIGlmICh0aGlzLl9pbnRlcnZhbElkICE9PSBudWxsKSB7XG5cdCAgICAgIGNsZWFySW50ZXJ2YWwodGhpcy5faW50ZXJ2YWxJZCk7XG5cdCAgICAgIHRoaXMuX2ludGVydmFsSWQgPSBudWxsO1xuXHQgICAgfVxuXHQgICAgdGhpcy5fc291cmNlLm9mZkFueSh0aGlzLl8kaGFuZGxlQW55KTsgLy8gY29waWVkIGZyb20gcGF0dGVybnMvb25lLXNvdXJjZVxuXHQgIH1cblxuXHR9O1xuXG5cdHZhciBTID0gY3JlYXRlU3RyZWFtKCdidWZmZXJXaXRoVGltZU9yQ291bnQnLCBtaXhpbik7XG5cdHZhciBQID0gY3JlYXRlUHJvcGVydHkoJ2J1ZmZlcldpdGhUaW1lT3JDb3VudCcsIG1peGluKTtcblxuXHRtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGJ1ZmZlcldpdGhUaW1lT3JDb3VudChvYnMsIHdhaXQsIGNvdW50KSB7XG5cdCAgdmFyIF9yZWYyID0gYXJndW1lbnRzLmxlbmd0aCA8PSAzIHx8IGFyZ3VtZW50c1szXSA9PT0gdW5kZWZpbmVkID8ge30gOiBhcmd1bWVudHNbM107XG5cblx0ICB2YXIgX3JlZjIkZmx1c2hPbkVuZCA9IF9yZWYyLmZsdXNoT25FbmQ7XG5cdCAgdmFyIGZsdXNoT25FbmQgPSBfcmVmMiRmbHVzaE9uRW5kID09PSB1bmRlZmluZWQgPyB0cnVlIDogX3JlZjIkZmx1c2hPbkVuZDtcblxuXHQgIHJldHVybiBuZXcgKG9icy5fb2ZTYW1lVHlwZShTLCBQKSkob2JzLCB7IHdhaXQ6IHdhaXQsIGNvdW50OiBjb3VudCwgZmx1c2hPbkVuZDogZmx1c2hPbkVuZCB9KTtcblx0fTtcblxuLyoqKi8gfSxcbi8qIDU4ICovXG4vKioqLyBmdW5jdGlvbihtb2R1bGUsIGV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pIHtcblxuXHQndXNlIHN0cmljdCc7XG5cblx0dmFyIF9yZXF1aXJlID0gX193ZWJwYWNrX3JlcXVpcmVfXygyNSk7XG5cblx0dmFyIGNyZWF0ZVN0cmVhbSA9IF9yZXF1aXJlLmNyZWF0ZVN0cmVhbTtcblx0dmFyIGNyZWF0ZVByb3BlcnR5ID0gX3JlcXVpcmUuY3JlYXRlUHJvcGVydHk7XG5cblx0ZnVuY3Rpb24geGZvcm1Gb3JPYnMob2JzKSB7XG5cdCAgcmV0dXJuIHtcblxuXHQgICAgJ0BAdHJhbnNkdWNlci9zdGVwJzogZnVuY3Rpb24gdHJhbnNkdWNlclN0ZXAocmVzLCBpbnB1dCkge1xuXHQgICAgICBvYnMuX2VtaXRWYWx1ZShpbnB1dCk7XG5cdCAgICAgIHJldHVybiBudWxsO1xuXHQgICAgfSxcblxuXHQgICAgJ0BAdHJhbnNkdWNlci9yZXN1bHQnOiBmdW5jdGlvbiB0cmFuc2R1Y2VyUmVzdWx0KCkge1xuXHQgICAgICBvYnMuX2VtaXRFbmQoKTtcblx0ICAgICAgcmV0dXJuIG51bGw7XG5cdCAgICB9XG5cblx0ICB9O1xuXHR9XG5cblx0dmFyIG1peGluID0ge1xuXG5cdCAgX2luaXQ6IGZ1bmN0aW9uIF9pbml0KF9yZWYpIHtcblx0ICAgIHZhciB0cmFuc2R1Y2VyID0gX3JlZi50cmFuc2R1Y2VyO1xuXG5cdCAgICB0aGlzLl94Zm9ybSA9IHRyYW5zZHVjZXIoeGZvcm1Gb3JPYnModGhpcykpO1xuXHQgIH0sXG5cblx0ICBfZnJlZTogZnVuY3Rpb24gX2ZyZWUoKSB7XG5cdCAgICB0aGlzLl94Zm9ybSA9IG51bGw7XG5cdCAgfSxcblxuXHQgIF9oYW5kbGVWYWx1ZTogZnVuY3Rpb24gX2hhbmRsZVZhbHVlKHgpIHtcblx0ICAgIGlmICh0aGlzLl94Zm9ybVsnQEB0cmFuc2R1Y2VyL3N0ZXAnXShudWxsLCB4KSAhPT0gbnVsbCkge1xuXHQgICAgICB0aGlzLl94Zm9ybVsnQEB0cmFuc2R1Y2VyL3Jlc3VsdCddKG51bGwpO1xuXHQgICAgfVxuXHQgIH0sXG5cblx0ICBfaGFuZGxlRW5kOiBmdW5jdGlvbiBfaGFuZGxlRW5kKCkge1xuXHQgICAgdGhpcy5feGZvcm1bJ0BAdHJhbnNkdWNlci9yZXN1bHQnXShudWxsKTtcblx0ICB9XG5cblx0fTtcblxuXHR2YXIgUyA9IGNyZWF0ZVN0cmVhbSgndHJhbnNkdWNlJywgbWl4aW4pO1xuXHR2YXIgUCA9IGNyZWF0ZVByb3BlcnR5KCd0cmFuc2R1Y2UnLCBtaXhpbik7XG5cblx0bW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiB0cmFuc2R1Y2Uob2JzLCB0cmFuc2R1Y2VyKSB7XG5cdCAgcmV0dXJuIG5ldyAob2JzLl9vZlNhbWVUeXBlKFMsIFApKShvYnMsIHsgdHJhbnNkdWNlcjogdHJhbnNkdWNlciB9KTtcblx0fTtcblxuLyoqKi8gfSxcbi8qIDU5ICovXG4vKioqLyBmdW5jdGlvbihtb2R1bGUsIGV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pIHtcblxuXHQndXNlIHN0cmljdCc7XG5cblx0dmFyIF9yZXF1aXJlID0gX193ZWJwYWNrX3JlcXVpcmVfXygyNSk7XG5cblx0dmFyIGNyZWF0ZVN0cmVhbSA9IF9yZXF1aXJlLmNyZWF0ZVN0cmVhbTtcblx0dmFyIGNyZWF0ZVByb3BlcnR5ID0gX3JlcXVpcmUuY3JlYXRlUHJvcGVydHk7XG5cblx0dmFyIGVtaXR0ZXIgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDE1KTtcblxuXHR2YXIgbWl4aW4gPSB7XG5cblx0ICBfaW5pdDogZnVuY3Rpb24gX2luaXQoX3JlZikge1xuXHQgICAgdmFyIGZuID0gX3JlZi5mbjtcblxuXHQgICAgdGhpcy5faGFuZGxlciA9IGZuO1xuXHQgICAgdGhpcy5fZW1pdHRlciA9IGVtaXR0ZXIodGhpcyk7XG5cdCAgfSxcblxuXHQgIF9mcmVlOiBmdW5jdGlvbiBfZnJlZSgpIHtcblx0ICAgIHRoaXMuX2hhbmRsZXIgPSBudWxsO1xuXHQgICAgdGhpcy5fZW1pdHRlciA9IG51bGw7XG5cdCAgfSxcblxuXHQgIF9oYW5kbGVBbnk6IGZ1bmN0aW9uIF9oYW5kbGVBbnkoZXZlbnQpIHtcblx0ICAgIHRoaXMuX2hhbmRsZXIodGhpcy5fZW1pdHRlciwgZXZlbnQpO1xuXHQgIH1cblxuXHR9O1xuXG5cdHZhciBTID0gY3JlYXRlU3RyZWFtKCd3aXRoSGFuZGxlcicsIG1peGluKTtcblx0dmFyIFAgPSBjcmVhdGVQcm9wZXJ0eSgnd2l0aEhhbmRsZXInLCBtaXhpbik7XG5cblx0bW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiB3aXRoSGFuZGxlcihvYnMsIGZuKSB7XG5cdCAgcmV0dXJuIG5ldyAob2JzLl9vZlNhbWVUeXBlKFMsIFApKShvYnMsIHsgZm46IGZuIH0pO1xuXHR9O1xuXG4vKioqLyB9LFxuLyogNjAgKi9cbi8qKiovIGZ1bmN0aW9uKG1vZHVsZSwgZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXykge1xuXG5cdCd1c2Ugc3RyaWN0JztcblxuXHR2YXIgU3RyZWFtID0gX193ZWJwYWNrX3JlcXVpcmVfXyg2KTtcblxuXHR2YXIgX3JlcXVpcmUgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDMpO1xuXG5cdHZhciBWQUxVRSA9IF9yZXF1aXJlLlZBTFVFO1xuXHR2YXIgRVJST1IgPSBfcmVxdWlyZS5FUlJPUjtcblx0dmFyIE5PVEhJTkcgPSBfcmVxdWlyZS5OT1RISU5HO1xuXG5cdHZhciBfcmVxdWlyZTIgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDIpO1xuXG5cdHZhciBpbmhlcml0ID0gX3JlcXVpcmUyLmluaGVyaXQ7XG5cblx0dmFyIF9yZXF1aXJlMyA9IF9fd2VicGFja19yZXF1aXJlX18oNSk7XG5cblx0dmFyIGNvbmNhdCA9IF9yZXF1aXJlMy5jb25jYXQ7XG5cdHZhciBmaWxsQXJyYXkgPSBfcmVxdWlyZTMuZmlsbEFycmF5O1xuXG5cdHZhciBfcmVxdWlyZTQgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDIxKTtcblxuXHR2YXIgc3ByZWFkID0gX3JlcXVpcmU0LnNwcmVhZDtcblxuXHR2YXIgbmV2ZXIgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDgpO1xuXG5cdGZ1bmN0aW9uIGRlZmF1bHRFcnJvcnNDb21iaW5hdG9yKGVycm9ycykge1xuXHQgIHZhciBsYXRlc3RFcnJvciA9IHVuZGVmaW5lZDtcblx0ICBmb3IgKHZhciBpID0gMDsgaSA8IGVycm9ycy5sZW5ndGg7IGkrKykge1xuXHQgICAgaWYgKGVycm9yc1tpXSAhPT0gdW5kZWZpbmVkKSB7XG5cdCAgICAgIGlmIChsYXRlc3RFcnJvciA9PT0gdW5kZWZpbmVkIHx8IGxhdGVzdEVycm9yLmluZGV4IDwgZXJyb3JzW2ldLmluZGV4KSB7XG5cdCAgICAgICAgbGF0ZXN0RXJyb3IgPSBlcnJvcnNbaV07XG5cdCAgICAgIH1cblx0ICAgIH1cblx0ICB9XG5cdCAgcmV0dXJuIGxhdGVzdEVycm9yLmVycm9yO1xuXHR9XG5cblx0ZnVuY3Rpb24gQ29tYmluZShhY3RpdmUsIHBhc3NpdmUsIGNvbWJpbmF0b3IpIHtcblx0ICB2YXIgX3RoaXMgPSB0aGlzO1xuXG5cdCAgU3RyZWFtLmNhbGwodGhpcyk7XG5cdCAgdGhpcy5fYWN0aXZlQ291bnQgPSBhY3RpdmUubGVuZ3RoO1xuXHQgIHRoaXMuX3NvdXJjZXMgPSBjb25jYXQoYWN0aXZlLCBwYXNzaXZlKTtcblx0ICB0aGlzLl9jb21iaW5hdG9yID0gY29tYmluYXRvciA/IHNwcmVhZChjb21iaW5hdG9yLCB0aGlzLl9zb3VyY2VzLmxlbmd0aCkgOiBmdW5jdGlvbiAoeCkge1xuXHQgICAgcmV0dXJuIHg7XG5cdCAgfTtcblx0ICB0aGlzLl9hbGl2ZUNvdW50ID0gMDtcblx0ICB0aGlzLl9sYXRlc3RWYWx1ZXMgPSBuZXcgQXJyYXkodGhpcy5fc291cmNlcy5sZW5ndGgpO1xuXHQgIHRoaXMuX2xhdGVzdEVycm9ycyA9IG5ldyBBcnJheSh0aGlzLl9zb3VyY2VzLmxlbmd0aCk7XG5cdCAgZmlsbEFycmF5KHRoaXMuX2xhdGVzdFZhbHVlcywgTk9USElORyk7XG5cdCAgdGhpcy5fZW1pdEFmdGVyQWN0aXZhdGlvbiA9IGZhbHNlO1xuXHQgIHRoaXMuX2VuZEFmdGVyQWN0aXZhdGlvbiA9IGZhbHNlO1xuXHQgIHRoaXMuX2xhdGVzdEVycm9ySW5kZXggPSAwO1xuXG5cdCAgdGhpcy5fJGhhbmRsZXJzID0gW107XG5cblx0ICB2YXIgX2xvb3AgPSBmdW5jdGlvbiAoaSkge1xuXHQgICAgX3RoaXMuXyRoYW5kbGVycy5wdXNoKGZ1bmN0aW9uIChldmVudCkge1xuXHQgICAgICByZXR1cm4gX3RoaXMuX2hhbmRsZUFueShpLCBldmVudCk7XG5cdCAgICB9KTtcblx0ICB9O1xuXG5cdCAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLl9zb3VyY2VzLmxlbmd0aDsgaSsrKSB7XG5cdCAgICBfbG9vcChpKTtcblx0ICB9XG5cdH1cblxuXHRpbmhlcml0KENvbWJpbmUsIFN0cmVhbSwge1xuXG5cdCAgX25hbWU6ICdjb21iaW5lJyxcblxuXHQgIF9vbkFjdGl2YXRpb246IGZ1bmN0aW9uIF9vbkFjdGl2YXRpb24oKSB7XG5cdCAgICB0aGlzLl9hbGl2ZUNvdW50ID0gdGhpcy5fYWN0aXZlQ291bnQ7XG5cblx0ICAgIC8vIHdlIG5lZWQgdG8gc3VzY3JpYmUgdG8gX3Bhc3NpdmVfIHNvdXJjZXMgYmVmb3JlIF9hY3RpdmVfXG5cdCAgICAvLyAoc2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9ycG9taW5vdi9rZWZpci9pc3N1ZXMvOTgpXG5cdCAgICBmb3IgKHZhciBpID0gdGhpcy5fYWN0aXZlQ291bnQ7IGkgPCB0aGlzLl9zb3VyY2VzLmxlbmd0aDsgaSsrKSB7XG5cdCAgICAgIHRoaXMuX3NvdXJjZXNbaV0ub25BbnkodGhpcy5fJGhhbmRsZXJzW2ldKTtcblx0ICAgIH1cblx0ICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5fYWN0aXZlQ291bnQ7IGkrKykge1xuXHQgICAgICB0aGlzLl9zb3VyY2VzW2ldLm9uQW55KHRoaXMuXyRoYW5kbGVyc1tpXSk7XG5cdCAgICB9XG5cblx0ICAgIGlmICh0aGlzLl9lbWl0QWZ0ZXJBY3RpdmF0aW9uKSB7XG5cdCAgICAgIHRoaXMuX2VtaXRBZnRlckFjdGl2YXRpb24gPSBmYWxzZTtcblx0ICAgICAgdGhpcy5fZW1pdElmRnVsbCgpO1xuXHQgICAgfVxuXHQgICAgaWYgKHRoaXMuX2VuZEFmdGVyQWN0aXZhdGlvbikge1xuXHQgICAgICB0aGlzLl9lbWl0RW5kKCk7XG5cdCAgICB9XG5cdCAgfSxcblxuXHQgIF9vbkRlYWN0aXZhdGlvbjogZnVuY3Rpb24gX29uRGVhY3RpdmF0aW9uKCkge1xuXHQgICAgdmFyIGxlbmd0aCA9IHRoaXMuX3NvdXJjZXMubGVuZ3RoLFxuXHQgICAgICAgIGkgPSB1bmRlZmluZWQ7XG5cdCAgICBmb3IgKGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcblx0ICAgICAgdGhpcy5fc291cmNlc1tpXS5vZmZBbnkodGhpcy5fJGhhbmRsZXJzW2ldKTtcblx0ICAgIH1cblx0ICB9LFxuXG5cdCAgX2VtaXRJZkZ1bGw6IGZ1bmN0aW9uIF9lbWl0SWZGdWxsKCkge1xuXHQgICAgdmFyIGhhc0FsbFZhbHVlcyA9IHRydWU7XG5cdCAgICB2YXIgaGFzRXJyb3JzID0gZmFsc2U7XG5cdCAgICB2YXIgbGVuZ3RoID0gdGhpcy5fbGF0ZXN0VmFsdWVzLmxlbmd0aDtcblx0ICAgIHZhciB2YWx1ZXNDb3B5ID0gbmV3IEFycmF5KGxlbmd0aCk7XG5cdCAgICB2YXIgZXJyb3JzQ29weSA9IG5ldyBBcnJheShsZW5ndGgpO1xuXG5cdCAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG5cdCAgICAgIHZhbHVlc0NvcHlbaV0gPSB0aGlzLl9sYXRlc3RWYWx1ZXNbaV07XG5cdCAgICAgIGVycm9yc0NvcHlbaV0gPSB0aGlzLl9sYXRlc3RFcnJvcnNbaV07XG5cblx0ICAgICAgaWYgKHZhbHVlc0NvcHlbaV0gPT09IE5PVEhJTkcpIHtcblx0ICAgICAgICBoYXNBbGxWYWx1ZXMgPSBmYWxzZTtcblx0ICAgICAgfVxuXG5cdCAgICAgIGlmIChlcnJvcnNDb3B5W2ldICE9PSB1bmRlZmluZWQpIHtcblx0ICAgICAgICBoYXNFcnJvcnMgPSB0cnVlO1xuXHQgICAgICB9XG5cdCAgICB9XG5cblx0ICAgIGlmIChoYXNBbGxWYWx1ZXMpIHtcblx0ICAgICAgdmFyIGNvbWJpbmF0b3IgPSB0aGlzLl9jb21iaW5hdG9yO1xuXHQgICAgICB0aGlzLl9lbWl0VmFsdWUoY29tYmluYXRvcih2YWx1ZXNDb3B5KSk7XG5cdCAgICB9XG5cdCAgICBpZiAoaGFzRXJyb3JzKSB7XG5cdCAgICAgIHRoaXMuX2VtaXRFcnJvcihkZWZhdWx0RXJyb3JzQ29tYmluYXRvcihlcnJvcnNDb3B5KSk7XG5cdCAgICB9XG5cdCAgfSxcblxuXHQgIF9oYW5kbGVBbnk6IGZ1bmN0aW9uIF9oYW5kbGVBbnkoaSwgZXZlbnQpIHtcblxuXHQgICAgaWYgKGV2ZW50LnR5cGUgPT09IFZBTFVFIHx8IGV2ZW50LnR5cGUgPT09IEVSUk9SKSB7XG5cblx0ICAgICAgaWYgKGV2ZW50LnR5cGUgPT09IFZBTFVFKSB7XG5cdCAgICAgICAgdGhpcy5fbGF0ZXN0VmFsdWVzW2ldID0gZXZlbnQudmFsdWU7XG5cdCAgICAgICAgdGhpcy5fbGF0ZXN0RXJyb3JzW2ldID0gdW5kZWZpbmVkO1xuXHQgICAgICB9XG5cdCAgICAgIGlmIChldmVudC50eXBlID09PSBFUlJPUikge1xuXHQgICAgICAgIHRoaXMuX2xhdGVzdFZhbHVlc1tpXSA9IE5PVEhJTkc7XG5cdCAgICAgICAgdGhpcy5fbGF0ZXN0RXJyb3JzW2ldID0ge1xuXHQgICAgICAgICAgaW5kZXg6IHRoaXMuX2xhdGVzdEVycm9ySW5kZXgrKyxcblx0ICAgICAgICAgIGVycm9yOiBldmVudC52YWx1ZVxuXHQgICAgICAgIH07XG5cdCAgICAgIH1cblxuXHQgICAgICBpZiAoaSA8IHRoaXMuX2FjdGl2ZUNvdW50KSB7XG5cdCAgICAgICAgaWYgKHRoaXMuX2FjdGl2YXRpbmcpIHtcblx0ICAgICAgICAgIHRoaXMuX2VtaXRBZnRlckFjdGl2YXRpb24gPSB0cnVlO1xuXHQgICAgICAgIH0gZWxzZSB7XG5cdCAgICAgICAgICB0aGlzLl9lbWl0SWZGdWxsKCk7XG5cdCAgICAgICAgfVxuXHQgICAgICB9XG5cdCAgICB9IGVsc2Uge1xuXHQgICAgICAvLyBFTkRcblxuXHQgICAgICBpZiAoaSA8IHRoaXMuX2FjdGl2ZUNvdW50KSB7XG5cdCAgICAgICAgdGhpcy5fYWxpdmVDb3VudC0tO1xuXHQgICAgICAgIGlmICh0aGlzLl9hbGl2ZUNvdW50ID09PSAwKSB7XG5cdCAgICAgICAgICBpZiAodGhpcy5fYWN0aXZhdGluZykge1xuXHQgICAgICAgICAgICB0aGlzLl9lbmRBZnRlckFjdGl2YXRpb24gPSB0cnVlO1xuXHQgICAgICAgICAgfSBlbHNlIHtcblx0ICAgICAgICAgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgICAgICAgICAgfVxuXHQgICAgICAgIH1cblx0ICAgICAgfVxuXHQgICAgfVxuXHQgIH0sXG5cblx0ICBfY2xlYXI6IGZ1bmN0aW9uIF9jbGVhcigpIHtcblx0ICAgIFN0cmVhbS5wcm90b3R5cGUuX2NsZWFyLmNhbGwodGhpcyk7XG5cdCAgICB0aGlzLl9zb3VyY2VzID0gbnVsbDtcblx0ICAgIHRoaXMuX2xhdGVzdFZhbHVlcyA9IG51bGw7XG5cdCAgICB0aGlzLl9sYXRlc3RFcnJvcnMgPSBudWxsO1xuXHQgICAgdGhpcy5fY29tYmluYXRvciA9IG51bGw7XG5cdCAgICB0aGlzLl8kaGFuZGxlcnMgPSBudWxsO1xuXHQgIH1cblxuXHR9KTtcblxuXHRtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGNvbWJpbmUoYWN0aXZlLCBwYXNzaXZlLCBjb21iaW5hdG9yKSB7XG5cdCAgaWYgKHBhc3NpdmUgPT09IHVuZGVmaW5lZCkgcGFzc2l2ZSA9IFtdO1xuXG5cdCAgaWYgKHR5cGVvZiBwYXNzaXZlID09PSAnZnVuY3Rpb24nKSB7XG5cdCAgICBjb21iaW5hdG9yID0gcGFzc2l2ZTtcblx0ICAgIHBhc3NpdmUgPSBbXTtcblx0ICB9XG5cdCAgcmV0dXJuIGFjdGl2ZS5sZW5ndGggPT09IDAgPyBuZXZlcigpIDogbmV3IENvbWJpbmUoYWN0aXZlLCBwYXNzaXZlLCBjb21iaW5hdG9yKTtcblx0fTtcblxuLyoqKi8gfSxcbi8qIDYxICovXG4vKioqLyBmdW5jdGlvbihtb2R1bGUsIGV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pIHtcblxuXHQndXNlIHN0cmljdCc7XG5cblx0dmFyIFN0cmVhbSA9IF9fd2VicGFja19yZXF1aXJlX18oNik7XG5cblx0dmFyIF9yZXF1aXJlID0gX193ZWJwYWNrX3JlcXVpcmVfXygzKTtcblxuXHR2YXIgVkFMVUUgPSBfcmVxdWlyZS5WQUxVRTtcblx0dmFyIEVSUk9SID0gX3JlcXVpcmUuRVJST1I7XG5cdHZhciBFTkQgPSBfcmVxdWlyZS5FTkQ7XG5cblx0dmFyIF9yZXF1aXJlMiA9IF9fd2VicGFja19yZXF1aXJlX18oMik7XG5cblx0dmFyIGluaGVyaXQgPSBfcmVxdWlyZTIuaW5oZXJpdDtcblxuXHR2YXIgX3JlcXVpcmUzID0gX193ZWJwYWNrX3JlcXVpcmVfXyg1KTtcblxuXHR2YXIgbWFwID0gX3JlcXVpcmUzLm1hcDtcblx0dmFyIGNsb25lQXJyYXkgPSBfcmVxdWlyZTMuY2xvbmVBcnJheTtcblxuXHR2YXIgX3JlcXVpcmU0ID0gX193ZWJwYWNrX3JlcXVpcmVfXygyMSk7XG5cblx0dmFyIHNwcmVhZCA9IF9yZXF1aXJlNC5zcHJlYWQ7XG5cblx0dmFyIG5ldmVyID0gX193ZWJwYWNrX3JlcXVpcmVfXyg4KTtcblxuXHR2YXIgaXNBcnJheSA9IEFycmF5LmlzQXJyYXkgfHwgZnVuY3Rpb24gKHhzKSB7XG5cdCAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh4cykgPT09ICdbb2JqZWN0IEFycmF5XSc7XG5cdH07XG5cblx0ZnVuY3Rpb24gWmlwKHNvdXJjZXMsIGNvbWJpbmF0b3IpIHtcblx0ICB2YXIgX3RoaXMgPSB0aGlzO1xuXG5cdCAgU3RyZWFtLmNhbGwodGhpcyk7XG5cblx0ICB0aGlzLl9idWZmZXJzID0gbWFwKHNvdXJjZXMsIGZ1bmN0aW9uIChzb3VyY2UpIHtcblx0ICAgIHJldHVybiBpc0FycmF5KHNvdXJjZSkgPyBjbG9uZUFycmF5KHNvdXJjZSkgOiBbXTtcblx0ICB9KTtcblx0ICB0aGlzLl9zb3VyY2VzID0gbWFwKHNvdXJjZXMsIGZ1bmN0aW9uIChzb3VyY2UpIHtcblx0ICAgIHJldHVybiBpc0FycmF5KHNvdXJjZSkgPyBuZXZlcigpIDogc291cmNlO1xuXHQgIH0pO1xuXG5cdCAgdGhpcy5fY29tYmluYXRvciA9IGNvbWJpbmF0b3IgPyBzcHJlYWQoY29tYmluYXRvciwgdGhpcy5fc291cmNlcy5sZW5ndGgpIDogZnVuY3Rpb24gKHgpIHtcblx0ICAgIHJldHVybiB4O1xuXHQgIH07XG5cdCAgdGhpcy5fYWxpdmVDb3VudCA9IDA7XG5cblx0ICB0aGlzLl8kaGFuZGxlcnMgPSBbXTtcblxuXHQgIHZhciBfbG9vcCA9IGZ1bmN0aW9uIChpKSB7XG5cdCAgICBfdGhpcy5fJGhhbmRsZXJzLnB1c2goZnVuY3Rpb24gKGV2ZW50KSB7XG5cdCAgICAgIHJldHVybiBfdGhpcy5faGFuZGxlQW55KGksIGV2ZW50KTtcblx0ICAgIH0pO1xuXHQgIH07XG5cblx0ICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuX3NvdXJjZXMubGVuZ3RoOyBpKyspIHtcblx0ICAgIF9sb29wKGkpO1xuXHQgIH1cblx0fVxuXG5cdGluaGVyaXQoWmlwLCBTdHJlYW0sIHtcblxuXHQgIF9uYW1lOiAnemlwJyxcblxuXHQgIF9vbkFjdGl2YXRpb246IGZ1bmN0aW9uIF9vbkFjdGl2YXRpb24oKSB7XG5cblx0ICAgIC8vIGlmIGFsbCBzb3VyY2VzIGFyZSBhcnJheXNcblx0ICAgIHdoaWxlICh0aGlzLl9pc0Z1bGwoKSkge1xuXHQgICAgICB0aGlzLl9lbWl0KCk7XG5cdCAgICB9XG5cblx0ICAgIHZhciBsZW5ndGggPSB0aGlzLl9zb3VyY2VzLmxlbmd0aDtcblx0ICAgIHRoaXMuX2FsaXZlQ291bnQgPSBsZW5ndGg7XG5cdCAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aCAmJiB0aGlzLl9hY3RpdmU7IGkrKykge1xuXHQgICAgICB0aGlzLl9zb3VyY2VzW2ldLm9uQW55KHRoaXMuXyRoYW5kbGVyc1tpXSk7XG5cdCAgICB9XG5cdCAgfSxcblxuXHQgIF9vbkRlYWN0aXZhdGlvbjogZnVuY3Rpb24gX29uRGVhY3RpdmF0aW9uKCkge1xuXHQgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLl9zb3VyY2VzLmxlbmd0aDsgaSsrKSB7XG5cdCAgICAgIHRoaXMuX3NvdXJjZXNbaV0ub2ZmQW55KHRoaXMuXyRoYW5kbGVyc1tpXSk7XG5cdCAgICB9XG5cdCAgfSxcblxuXHQgIF9lbWl0OiBmdW5jdGlvbiBfZW1pdCgpIHtcblx0ICAgIHZhciB2YWx1ZXMgPSBuZXcgQXJyYXkodGhpcy5fYnVmZmVycy5sZW5ndGgpO1xuXHQgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLl9idWZmZXJzLmxlbmd0aDsgaSsrKSB7XG5cdCAgICAgIHZhbHVlc1tpXSA9IHRoaXMuX2J1ZmZlcnNbaV0uc2hpZnQoKTtcblx0ICAgIH1cblx0ICAgIHZhciBjb21iaW5hdG9yID0gdGhpcy5fY29tYmluYXRvcjtcblx0ICAgIHRoaXMuX2VtaXRWYWx1ZShjb21iaW5hdG9yKHZhbHVlcykpO1xuXHQgIH0sXG5cblx0ICBfaXNGdWxsOiBmdW5jdGlvbiBfaXNGdWxsKCkge1xuXHQgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLl9idWZmZXJzLmxlbmd0aDsgaSsrKSB7XG5cdCAgICAgIGlmICh0aGlzLl9idWZmZXJzW2ldLmxlbmd0aCA9PT0gMCkge1xuXHQgICAgICAgIHJldHVybiBmYWxzZTtcblx0ICAgICAgfVxuXHQgICAgfVxuXHQgICAgcmV0dXJuIHRydWU7XG5cdCAgfSxcblxuXHQgIF9oYW5kbGVBbnk6IGZ1bmN0aW9uIF9oYW5kbGVBbnkoaSwgZXZlbnQpIHtcblx0ICAgIGlmIChldmVudC50eXBlID09PSBWQUxVRSkge1xuXHQgICAgICB0aGlzLl9idWZmZXJzW2ldLnB1c2goZXZlbnQudmFsdWUpO1xuXHQgICAgICBpZiAodGhpcy5faXNGdWxsKCkpIHtcblx0ICAgICAgICB0aGlzLl9lbWl0KCk7XG5cdCAgICAgIH1cblx0ICAgIH1cblx0ICAgIGlmIChldmVudC50eXBlID09PSBFUlJPUikge1xuXHQgICAgICB0aGlzLl9lbWl0RXJyb3IoZXZlbnQudmFsdWUpO1xuXHQgICAgfVxuXHQgICAgaWYgKGV2ZW50LnR5cGUgPT09IEVORCkge1xuXHQgICAgICB0aGlzLl9hbGl2ZUNvdW50LS07XG5cdCAgICAgIGlmICh0aGlzLl9hbGl2ZUNvdW50ID09PSAwKSB7XG5cdCAgICAgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgICAgICB9XG5cdCAgICB9XG5cdCAgfSxcblxuXHQgIF9jbGVhcjogZnVuY3Rpb24gX2NsZWFyKCkge1xuXHQgICAgU3RyZWFtLnByb3RvdHlwZS5fY2xlYXIuY2FsbCh0aGlzKTtcblx0ICAgIHRoaXMuX3NvdXJjZXMgPSBudWxsO1xuXHQgICAgdGhpcy5fYnVmZmVycyA9IG51bGw7XG5cdCAgICB0aGlzLl9jb21iaW5hdG9yID0gbnVsbDtcblx0ICAgIHRoaXMuXyRoYW5kbGVycyA9IG51bGw7XG5cdCAgfVxuXG5cdH0pO1xuXG5cdG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gemlwKG9ic2VydmFibGVzLCBjb21iaW5hdG9yIC8qIEZ1bmN0aW9uIHwgZmFsc2V5ICovKSB7XG5cdCAgcmV0dXJuIG9ic2VydmFibGVzLmxlbmd0aCA9PT0gMCA/IG5ldmVyKCkgOiBuZXcgWmlwKG9ic2VydmFibGVzLCBjb21iaW5hdG9yKTtcblx0fTtcblxuLyoqKi8gfSxcbi8qIDYyICovXG4vKioqLyBmdW5jdGlvbihtb2R1bGUsIGV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pIHtcblxuXHQndXNlIHN0cmljdCc7XG5cblx0dmFyIF9yZXF1aXJlID0gX193ZWJwYWNrX3JlcXVpcmVfXygyKTtcblxuXHR2YXIgaW5oZXJpdCA9IF9yZXF1aXJlLmluaGVyaXQ7XG5cblx0dmFyIEFic3RyYWN0UG9vbCA9IF9fd2VicGFja19yZXF1aXJlX18oNjMpO1xuXHR2YXIgbmV2ZXIgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDgpO1xuXG5cdGZ1bmN0aW9uIE1lcmdlKHNvdXJjZXMpIHtcblx0ICBBYnN0cmFjdFBvb2wuY2FsbCh0aGlzKTtcblx0ICB0aGlzLl9hZGRBbGwoc291cmNlcyk7XG5cdCAgdGhpcy5faW5pdGlhbGlzZWQgPSB0cnVlO1xuXHR9XG5cblx0aW5oZXJpdChNZXJnZSwgQWJzdHJhY3RQb29sLCB7XG5cblx0ICBfbmFtZTogJ21lcmdlJyxcblxuXHQgIF9vbkVtcHR5OiBmdW5jdGlvbiBfb25FbXB0eSgpIHtcblx0ICAgIGlmICh0aGlzLl9pbml0aWFsaXNlZCkge1xuXHQgICAgICB0aGlzLl9lbWl0RW5kKCk7XG5cdCAgICB9XG5cdCAgfVxuXG5cdH0pO1xuXG5cdG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gbWVyZ2Uob2JzZXJ2YWJsZXMpIHtcblx0ICByZXR1cm4gb2JzZXJ2YWJsZXMubGVuZ3RoID09PSAwID8gbmV2ZXIoKSA6IG5ldyBNZXJnZShvYnNlcnZhYmxlcyk7XG5cdH07XG5cbi8qKiovIH0sXG4vKiA2MyAqL1xuLyoqKi8gZnVuY3Rpb24obW9kdWxlLCBleHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKSB7XG5cblx0J3VzZSBzdHJpY3QnO1xuXG5cdHZhciBTdHJlYW0gPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDYpO1xuXG5cdHZhciBfcmVxdWlyZSA9IF9fd2VicGFja19yZXF1aXJlX18oMyk7XG5cblx0dmFyIFZBTFVFID0gX3JlcXVpcmUuVkFMVUU7XG5cdHZhciBFUlJPUiA9IF9yZXF1aXJlLkVSUk9SO1xuXG5cdHZhciBfcmVxdWlyZTIgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDIpO1xuXG5cdHZhciBpbmhlcml0ID0gX3JlcXVpcmUyLmluaGVyaXQ7XG5cblx0dmFyIF9yZXF1aXJlMyA9IF9fd2VicGFja19yZXF1aXJlX18oNSk7XG5cblx0dmFyIGNvbmNhdCA9IF9yZXF1aXJlMy5jb25jYXQ7XG5cdHZhciBmb3JFYWNoID0gX3JlcXVpcmUzLmZvckVhY2g7XG5cdHZhciBmaW5kQnlQcmVkID0gX3JlcXVpcmUzLmZpbmRCeVByZWQ7XG5cdHZhciBmaW5kID0gX3JlcXVpcmUzLmZpbmQ7XG5cdHZhciByZW1vdmUgPSBfcmVxdWlyZTMucmVtb3ZlO1xuXHR2YXIgY2xvbmVBcnJheSA9IF9yZXF1aXJlMy5jbG9uZUFycmF5O1xuXG5cdHZhciBpZCA9IGZ1bmN0aW9uIGlkKHgpIHtcblx0ICByZXR1cm4geDtcblx0fTtcblxuXHRmdW5jdGlvbiBBYnN0cmFjdFBvb2woKSB7XG5cdCAgdmFyIF90aGlzID0gdGhpcztcblxuXHQgIHZhciBfcmVmID0gYXJndW1lbnRzLmxlbmd0aCA8PSAwIHx8IGFyZ3VtZW50c1swXSA9PT0gdW5kZWZpbmVkID8ge30gOiBhcmd1bWVudHNbMF07XG5cblx0ICB2YXIgX3JlZiRxdWV1ZUxpbSA9IF9yZWYucXVldWVMaW07XG5cdCAgdmFyIHF1ZXVlTGltID0gX3JlZiRxdWV1ZUxpbSA9PT0gdW5kZWZpbmVkID8gMCA6IF9yZWYkcXVldWVMaW07XG5cdCAgdmFyIF9yZWYkY29uY3VyTGltID0gX3JlZi5jb25jdXJMaW07XG5cdCAgdmFyIGNvbmN1ckxpbSA9IF9yZWYkY29uY3VyTGltID09PSB1bmRlZmluZWQgPyAtMSA6IF9yZWYkY29uY3VyTGltO1xuXHQgIHZhciBfcmVmJGRyb3AgPSBfcmVmLmRyb3A7XG5cdCAgdmFyIGRyb3AgPSBfcmVmJGRyb3AgPT09IHVuZGVmaW5lZCA/ICduZXcnIDogX3JlZiRkcm9wO1xuXG5cdCAgU3RyZWFtLmNhbGwodGhpcyk7XG5cblx0ICB0aGlzLl9xdWV1ZUxpbSA9IHF1ZXVlTGltIDwgMCA/IC0xIDogcXVldWVMaW07XG5cdCAgdGhpcy5fY29uY3VyTGltID0gY29uY3VyTGltIDwgMCA/IC0xIDogY29uY3VyTGltO1xuXHQgIHRoaXMuX2Ryb3AgPSBkcm9wO1xuXHQgIHRoaXMuX3F1ZXVlID0gW107XG5cdCAgdGhpcy5fY3VyU291cmNlcyA9IFtdO1xuXHQgIHRoaXMuXyRoYW5kbGVTdWJBbnkgPSBmdW5jdGlvbiAoZXZlbnQpIHtcblx0ICAgIHJldHVybiBfdGhpcy5faGFuZGxlU3ViQW55KGV2ZW50KTtcblx0ICB9O1xuXHQgIHRoaXMuXyRlbmRIYW5kbGVycyA9IFtdO1xuXHQgIHRoaXMuX2N1cnJlbnRseUFkZGluZyA9IG51bGw7XG5cblx0ICBpZiAodGhpcy5fY29uY3VyTGltID09PSAwKSB7XG5cdCAgICB0aGlzLl9lbWl0RW5kKCk7XG5cdCAgfVxuXHR9XG5cblx0aW5oZXJpdChBYnN0cmFjdFBvb2wsIFN0cmVhbSwge1xuXG5cdCAgX25hbWU6ICdhYnN0cmFjdFBvb2wnLFxuXG5cdCAgX2FkZDogZnVuY3Rpb24gX2FkZChvYmosIHRvT2JzIC8qIEZ1bmN0aW9uIHwgZmFsc2V5ICovKSB7XG5cdCAgICB0b09icyA9IHRvT2JzIHx8IGlkO1xuXHQgICAgaWYgKHRoaXMuX2NvbmN1ckxpbSA9PT0gLTEgfHwgdGhpcy5fY3VyU291cmNlcy5sZW5ndGggPCB0aGlzLl9jb25jdXJMaW0pIHtcblx0ICAgICAgdGhpcy5fYWRkVG9DdXIodG9PYnMob2JqKSk7XG5cdCAgICB9IGVsc2Uge1xuXHQgICAgICBpZiAodGhpcy5fcXVldWVMaW0gPT09IC0xIHx8IHRoaXMuX3F1ZXVlLmxlbmd0aCA8IHRoaXMuX3F1ZXVlTGltKSB7XG5cdCAgICAgICAgdGhpcy5fYWRkVG9RdWV1ZSh0b09icyhvYmopKTtcblx0ICAgICAgfSBlbHNlIGlmICh0aGlzLl9kcm9wID09PSAnb2xkJykge1xuXHQgICAgICAgIHRoaXMuX3JlbW92ZU9sZGVzdCgpO1xuXHQgICAgICAgIHRoaXMuX2FkZChvYmosIHRvT2JzKTtcblx0ICAgICAgfVxuXHQgICAgfVxuXHQgIH0sXG5cblx0ICBfYWRkQWxsOiBmdW5jdGlvbiBfYWRkQWxsKG9ic3MpIHtcblx0ICAgIHZhciBfdGhpczIgPSB0aGlzO1xuXG5cdCAgICBmb3JFYWNoKG9ic3MsIGZ1bmN0aW9uIChvYnMpIHtcblx0ICAgICAgcmV0dXJuIF90aGlzMi5fYWRkKG9icyk7XG5cdCAgICB9KTtcblx0ICB9LFxuXG5cdCAgX3JlbW92ZTogZnVuY3Rpb24gX3JlbW92ZShvYnMpIHtcblx0ICAgIGlmICh0aGlzLl9yZW1vdmVDdXIob2JzKSA9PT0gLTEpIHtcblx0ICAgICAgdGhpcy5fcmVtb3ZlUXVldWUob2JzKTtcblx0ICAgIH1cblx0ICB9LFxuXG5cdCAgX2FkZFRvUXVldWU6IGZ1bmN0aW9uIF9hZGRUb1F1ZXVlKG9icykge1xuXHQgICAgdGhpcy5fcXVldWUgPSBjb25jYXQodGhpcy5fcXVldWUsIFtvYnNdKTtcblx0ICB9LFxuXG5cdCAgX2FkZFRvQ3VyOiBmdW5jdGlvbiBfYWRkVG9DdXIob2JzKSB7XG5cdCAgICBpZiAodGhpcy5fYWN0aXZlKSB7XG5cblx0ICAgICAgLy8gSEFDSzpcblx0ICAgICAgLy9cblx0ICAgICAgLy8gV2UgaGF2ZSB0d28gb3B0aW1pemF0aW9ucyBmb3IgY2FzZXMgd2hlbiBgb2JzYCBpcyBlbmRlZC4gV2UgZG9uJ3Qgd2FudFxuXHQgICAgICAvLyB0byBhZGQgc3VjaCBvYnNlcnZhYmxlIHRvIHRoZSBsaXN0LCBidXQgb25seSB3YW50IHRvIGVtaXQgZXZlbnRzXG5cdCAgICAgIC8vIGZyb20gaXQgKGlmIGl0IGhhcyBzb21lKS5cblx0ICAgICAgLy9cblx0ICAgICAgLy8gSW5zdGVhZCBvZiB0aGlzIGhhY2tzLCB3ZSBjb3VsZCBqdXN0IGRpZCBmb2xsb3dpbmcsXG5cdCAgICAgIC8vIGJ1dCBpdCB3b3VsZCBiZSA1LTggdGltZXMgc2xvd2VyOlxuXHQgICAgICAvL1xuXHQgICAgICAvLyAgICAgdGhpcy5fY3VyU291cmNlcyA9IGNvbmNhdCh0aGlzLl9jdXJTb3VyY2VzLCBbb2JzXSk7XG5cdCAgICAgIC8vICAgICB0aGlzLl9zdWJzY3JpYmUob2JzKTtcblx0ICAgICAgLy9cblxuXHQgICAgICAvLyAjMVxuXHQgICAgICAvLyBUaGlzIG9uZSBmb3IgY2FzZXMgd2hlbiBgb2JzYCBhbHJlYWR5IGVuZGVkXG5cdCAgICAgIC8vIGUuZy4sIEtlZmlyLmNvbnN0YW50KCkgb3IgS2VmaXIubmV2ZXIoKVxuXHQgICAgICBpZiAoIW9icy5fYWxpdmUpIHtcblx0ICAgICAgICBpZiAob2JzLl9jdXJyZW50RXZlbnQpIHtcblx0ICAgICAgICAgIHRoaXMuX2VtaXQob2JzLl9jdXJyZW50RXZlbnQudHlwZSwgb2JzLl9jdXJyZW50RXZlbnQudmFsdWUpO1xuXHQgICAgICAgIH1cblx0ICAgICAgICByZXR1cm47XG5cdCAgICAgIH1cblxuXHQgICAgICAvLyAjMlxuXHQgICAgICAvLyBUaGlzIG9uZSBpcyBmb3IgY2FzZXMgd2hlbiBgb2JzYCBnb2luZyB0byBlbmQgc3luY2hyb25vdXNseSBvblxuXHQgICAgICAvLyBmaXJzdCBzdWJzY3JpYmVyIGUuZy4sIEtlZmlyLnN0cmVhbShlbSA9PiB7ZW0uZW1pdCgxKTsgZW0uZW5kKCl9KVxuXHQgICAgICB0aGlzLl9jdXJyZW50bHlBZGRpbmcgPSBvYnM7XG5cdCAgICAgIG9icy5vbkFueSh0aGlzLl8kaGFuZGxlU3ViQW55KTtcblx0ICAgICAgdGhpcy5fY3VycmVudGx5QWRkaW5nID0gbnVsbDtcblx0ICAgICAgaWYgKG9icy5fYWxpdmUpIHtcblx0ICAgICAgICB0aGlzLl9jdXJTb3VyY2VzID0gY29uY2F0KHRoaXMuX2N1clNvdXJjZXMsIFtvYnNdKTtcblx0ICAgICAgICBpZiAodGhpcy5fYWN0aXZlKSB7XG5cdCAgICAgICAgICB0aGlzLl9zdWJUb0VuZChvYnMpO1xuXHQgICAgICAgIH1cblx0ICAgICAgfVxuXHQgICAgfSBlbHNlIHtcblx0ICAgICAgdGhpcy5fY3VyU291cmNlcyA9IGNvbmNhdCh0aGlzLl9jdXJTb3VyY2VzLCBbb2JzXSk7XG5cdCAgICB9XG5cdCAgfSxcblxuXHQgIF9zdWJUb0VuZDogZnVuY3Rpb24gX3N1YlRvRW5kKG9icykge1xuXHQgICAgdmFyIF90aGlzMyA9IHRoaXM7XG5cblx0ICAgIHZhciBvbkVuZCA9IGZ1bmN0aW9uIG9uRW5kKCkge1xuXHQgICAgICByZXR1cm4gX3RoaXMzLl9yZW1vdmVDdXIob2JzKTtcblx0ICAgIH07XG5cdCAgICB0aGlzLl8kZW5kSGFuZGxlcnMucHVzaCh7IG9iczogb2JzLCBoYW5kbGVyOiBvbkVuZCB9KTtcblx0ICAgIG9icy5vbkVuZChvbkVuZCk7XG5cdCAgfSxcblxuXHQgIF9zdWJzY3JpYmU6IGZ1bmN0aW9uIF9zdWJzY3JpYmUob2JzKSB7XG5cdCAgICBvYnMub25BbnkodGhpcy5fJGhhbmRsZVN1YkFueSk7XG5cblx0ICAgIC8vIGl0IGNhbiBiZWNvbWUgaW5hY3RpdmUgaW4gcmVzcG9uY2Ugb2Ygc3Vic2NyaWJpbmcgdG8gYG9icy5vbkFueWAgYWJvdmVcblx0ICAgIGlmICh0aGlzLl9hY3RpdmUpIHtcblx0ICAgICAgdGhpcy5fc3ViVG9FbmQob2JzKTtcblx0ICAgIH1cblx0ICB9LFxuXG5cdCAgX3Vuc3Vic2NyaWJlOiBmdW5jdGlvbiBfdW5zdWJzY3JpYmUob2JzKSB7XG5cdCAgICBvYnMub2ZmQW55KHRoaXMuXyRoYW5kbGVTdWJBbnkpO1xuXG5cdCAgICB2YXIgb25FbmRJID0gZmluZEJ5UHJlZCh0aGlzLl8kZW5kSGFuZGxlcnMsIGZ1bmN0aW9uIChvYmopIHtcblx0ICAgICAgcmV0dXJuIG9iai5vYnMgPT09IG9icztcblx0ICAgIH0pO1xuXHQgICAgaWYgKG9uRW5kSSAhPT0gLTEpIHtcblx0ICAgICAgb2JzLm9mZkVuZCh0aGlzLl8kZW5kSGFuZGxlcnNbb25FbmRJXS5oYW5kbGVyKTtcblx0ICAgICAgdGhpcy5fJGVuZEhhbmRsZXJzLnNwbGljZShvbkVuZEksIDEpO1xuXHQgICAgfVxuXHQgIH0sXG5cblx0ICBfaGFuZGxlU3ViQW55OiBmdW5jdGlvbiBfaGFuZGxlU3ViQW55KGV2ZW50KSB7XG5cdCAgICBpZiAoZXZlbnQudHlwZSA9PT0gVkFMVUUpIHtcblx0ICAgICAgdGhpcy5fZW1pdFZhbHVlKGV2ZW50LnZhbHVlKTtcblx0ICAgIH0gZWxzZSBpZiAoZXZlbnQudHlwZSA9PT0gRVJST1IpIHtcblx0ICAgICAgdGhpcy5fZW1pdEVycm9yKGV2ZW50LnZhbHVlKTtcblx0ICAgIH1cblx0ICB9LFxuXG5cdCAgX3JlbW92ZVF1ZXVlOiBmdW5jdGlvbiBfcmVtb3ZlUXVldWUob2JzKSB7XG5cdCAgICB2YXIgaW5kZXggPSBmaW5kKHRoaXMuX3F1ZXVlLCBvYnMpO1xuXHQgICAgdGhpcy5fcXVldWUgPSByZW1vdmUodGhpcy5fcXVldWUsIGluZGV4KTtcblx0ICAgIHJldHVybiBpbmRleDtcblx0ICB9LFxuXG5cdCAgX3JlbW92ZUN1cjogZnVuY3Rpb24gX3JlbW92ZUN1cihvYnMpIHtcblx0ICAgIGlmICh0aGlzLl9hY3RpdmUpIHtcblx0ICAgICAgdGhpcy5fdW5zdWJzY3JpYmUob2JzKTtcblx0ICAgIH1cblx0ICAgIHZhciBpbmRleCA9IGZpbmQodGhpcy5fY3VyU291cmNlcywgb2JzKTtcblx0ICAgIHRoaXMuX2N1clNvdXJjZXMgPSByZW1vdmUodGhpcy5fY3VyU291cmNlcywgaW5kZXgpO1xuXHQgICAgaWYgKGluZGV4ICE9PSAtMSkge1xuXHQgICAgICBpZiAodGhpcy5fcXVldWUubGVuZ3RoICE9PSAwKSB7XG5cdCAgICAgICAgdGhpcy5fcHVsbFF1ZXVlKCk7XG5cdCAgICAgIH0gZWxzZSBpZiAodGhpcy5fY3VyU291cmNlcy5sZW5ndGggPT09IDApIHtcblx0ICAgICAgICB0aGlzLl9vbkVtcHR5KCk7XG5cdCAgICAgIH1cblx0ICAgIH1cblx0ICAgIHJldHVybiBpbmRleDtcblx0ICB9LFxuXG5cdCAgX3JlbW92ZU9sZGVzdDogZnVuY3Rpb24gX3JlbW92ZU9sZGVzdCgpIHtcblx0ICAgIHRoaXMuX3JlbW92ZUN1cih0aGlzLl9jdXJTb3VyY2VzWzBdKTtcblx0ICB9LFxuXG5cdCAgX3B1bGxRdWV1ZTogZnVuY3Rpb24gX3B1bGxRdWV1ZSgpIHtcblx0ICAgIGlmICh0aGlzLl9xdWV1ZS5sZW5ndGggIT09IDApIHtcblx0ICAgICAgdGhpcy5fcXVldWUgPSBjbG9uZUFycmF5KHRoaXMuX3F1ZXVlKTtcblx0ICAgICAgdGhpcy5fYWRkVG9DdXIodGhpcy5fcXVldWUuc2hpZnQoKSk7XG5cdCAgICB9XG5cdCAgfSxcblxuXHQgIF9vbkFjdGl2YXRpb246IGZ1bmN0aW9uIF9vbkFjdGl2YXRpb24oKSB7XG5cdCAgICBmb3IgKHZhciBpID0gMCwgc291cmNlcyA9IHRoaXMuX2N1clNvdXJjZXM7IGkgPCBzb3VyY2VzLmxlbmd0aCAmJiB0aGlzLl9hY3RpdmU7IGkrKykge1xuXHQgICAgICB0aGlzLl9zdWJzY3JpYmUoc291cmNlc1tpXSk7XG5cdCAgICB9XG5cdCAgfSxcblxuXHQgIF9vbkRlYWN0aXZhdGlvbjogZnVuY3Rpb24gX29uRGVhY3RpdmF0aW9uKCkge1xuXHQgICAgZm9yICh2YXIgaSA9IDAsIHNvdXJjZXMgPSB0aGlzLl9jdXJTb3VyY2VzOyBpIDwgc291cmNlcy5sZW5ndGg7IGkrKykge1xuXHQgICAgICB0aGlzLl91bnN1YnNjcmliZShzb3VyY2VzW2ldKTtcblx0ICAgIH1cblx0ICAgIGlmICh0aGlzLl9jdXJyZW50bHlBZGRpbmcgIT09IG51bGwpIHtcblx0ICAgICAgdGhpcy5fdW5zdWJzY3JpYmUodGhpcy5fY3VycmVudGx5QWRkaW5nKTtcblx0ICAgIH1cblx0ICB9LFxuXG5cdCAgX2lzRW1wdHk6IGZ1bmN0aW9uIF9pc0VtcHR5KCkge1xuXHQgICAgcmV0dXJuIHRoaXMuX2N1clNvdXJjZXMubGVuZ3RoID09PSAwO1xuXHQgIH0sXG5cblx0ICBfb25FbXB0eTogZnVuY3Rpb24gX29uRW1wdHkoKSB7fSxcblxuXHQgIF9jbGVhcjogZnVuY3Rpb24gX2NsZWFyKCkge1xuXHQgICAgU3RyZWFtLnByb3RvdHlwZS5fY2xlYXIuY2FsbCh0aGlzKTtcblx0ICAgIHRoaXMuX3F1ZXVlID0gbnVsbDtcblx0ICAgIHRoaXMuX2N1clNvdXJjZXMgPSBudWxsO1xuXHQgICAgdGhpcy5fJGhhbmRsZVN1YkFueSA9IG51bGw7XG5cdCAgICB0aGlzLl8kZW5kSGFuZGxlcnMgPSBudWxsO1xuXHQgIH1cblxuXHR9KTtcblxuXHRtb2R1bGUuZXhwb3J0cyA9IEFic3RyYWN0UG9vbDtcblxuLyoqKi8gfSxcbi8qIDY0ICovXG4vKioqLyBmdW5jdGlvbihtb2R1bGUsIGV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pIHtcblxuXHQndXNlIHN0cmljdCc7XG5cblx0dmFyIHJlcGVhdCA9IF9fd2VicGFja19yZXF1aXJlX18oNjUpO1xuXG5cdG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gY29uY2F0KG9ic2VydmFibGVzKSB7XG5cdCAgcmV0dXJuIHJlcGVhdChmdW5jdGlvbiAoaW5kZXgpIHtcblx0ICAgIHJldHVybiBvYnNlcnZhYmxlcy5sZW5ndGggPiBpbmRleCA/IG9ic2VydmFibGVzW2luZGV4XSA6IGZhbHNlO1xuXHQgIH0pLnNldE5hbWUoJ2NvbmNhdCcpO1xuXHR9O1xuXG4vKioqLyB9LFxuLyogNjUgKi9cbi8qKiovIGZ1bmN0aW9uKG1vZHVsZSwgZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXykge1xuXG5cdCd1c2Ugc3RyaWN0JztcblxuXHR2YXIgX3JlcXVpcmUgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDIpO1xuXG5cdHZhciBpbmhlcml0ID0gX3JlcXVpcmUuaW5oZXJpdDtcblxuXHR2YXIgU3RyZWFtID0gX193ZWJwYWNrX3JlcXVpcmVfXyg2KTtcblxuXHR2YXIgX3JlcXVpcmUyID0gX193ZWJwYWNrX3JlcXVpcmVfXygzKTtcblxuXHR2YXIgRU5EID0gX3JlcXVpcmUyLkVORDtcblxuXHRmdW5jdGlvbiBTKGdlbmVyYXRvcikge1xuXHQgIHZhciBfdGhpcyA9IHRoaXM7XG5cblx0ICBTdHJlYW0uY2FsbCh0aGlzKTtcblx0ICB0aGlzLl9nZW5lcmF0b3IgPSBnZW5lcmF0b3I7XG5cdCAgdGhpcy5fc291cmNlID0gbnVsbDtcblx0ICB0aGlzLl9pbkxvb3AgPSBmYWxzZTtcblx0ICB0aGlzLl9pdGVyYXRpb24gPSAwO1xuXHQgIHRoaXMuXyRoYW5kbGVBbnkgPSBmdW5jdGlvbiAoZXZlbnQpIHtcblx0ICAgIHJldHVybiBfdGhpcy5faGFuZGxlQW55KGV2ZW50KTtcblx0ICB9O1xuXHR9XG5cblx0aW5oZXJpdChTLCBTdHJlYW0sIHtcblxuXHQgIF9uYW1lOiAncmVwZWF0JyxcblxuXHQgIF9oYW5kbGVBbnk6IGZ1bmN0aW9uIF9oYW5kbGVBbnkoZXZlbnQpIHtcblx0ICAgIGlmIChldmVudC50eXBlID09PSBFTkQpIHtcblx0ICAgICAgdGhpcy5fc291cmNlID0gbnVsbDtcblx0ICAgICAgdGhpcy5fZ2V0U291cmNlKCk7XG5cdCAgICB9IGVsc2Uge1xuXHQgICAgICB0aGlzLl9lbWl0KGV2ZW50LnR5cGUsIGV2ZW50LnZhbHVlKTtcblx0ICAgIH1cblx0ICB9LFxuXG5cdCAgX2dldFNvdXJjZTogZnVuY3Rpb24gX2dldFNvdXJjZSgpIHtcblx0ICAgIGlmICghdGhpcy5faW5Mb29wKSB7XG5cdCAgICAgIHRoaXMuX2luTG9vcCA9IHRydWU7XG5cdCAgICAgIHZhciBnZW5lcmF0b3IgPSB0aGlzLl9nZW5lcmF0b3I7XG5cdCAgICAgIHdoaWxlICh0aGlzLl9zb3VyY2UgPT09IG51bGwgJiYgdGhpcy5fYWxpdmUgJiYgdGhpcy5fYWN0aXZlKSB7XG5cdCAgICAgICAgdGhpcy5fc291cmNlID0gZ2VuZXJhdG9yKHRoaXMuX2l0ZXJhdGlvbisrKTtcblx0ICAgICAgICBpZiAodGhpcy5fc291cmNlKSB7XG5cdCAgICAgICAgICB0aGlzLl9zb3VyY2Uub25BbnkodGhpcy5fJGhhbmRsZUFueSk7XG5cdCAgICAgICAgfSBlbHNlIHtcblx0ICAgICAgICAgIHRoaXMuX2VtaXRFbmQoKTtcblx0ICAgICAgICB9XG5cdCAgICAgIH1cblx0ICAgICAgdGhpcy5faW5Mb29wID0gZmFsc2U7XG5cdCAgICB9XG5cdCAgfSxcblxuXHQgIF9vbkFjdGl2YXRpb246IGZ1bmN0aW9uIF9vbkFjdGl2YXRpb24oKSB7XG5cdCAgICBpZiAodGhpcy5fc291cmNlKSB7XG5cdCAgICAgIHRoaXMuX3NvdXJjZS5vbkFueSh0aGlzLl8kaGFuZGxlQW55KTtcblx0ICAgIH0gZWxzZSB7XG5cdCAgICAgIHRoaXMuX2dldFNvdXJjZSgpO1xuXHQgICAgfVxuXHQgIH0sXG5cblx0ICBfb25EZWFjdGl2YXRpb246IGZ1bmN0aW9uIF9vbkRlYWN0aXZhdGlvbigpIHtcblx0ICAgIGlmICh0aGlzLl9zb3VyY2UpIHtcblx0ICAgICAgdGhpcy5fc291cmNlLm9mZkFueSh0aGlzLl8kaGFuZGxlQW55KTtcblx0ICAgIH1cblx0ICB9LFxuXG5cdCAgX2NsZWFyOiBmdW5jdGlvbiBfY2xlYXIoKSB7XG5cdCAgICBTdHJlYW0ucHJvdG90eXBlLl9jbGVhci5jYWxsKHRoaXMpO1xuXHQgICAgdGhpcy5fZ2VuZXJhdG9yID0gbnVsbDtcblx0ICAgIHRoaXMuX3NvdXJjZSA9IG51bGw7XG5cdCAgICB0aGlzLl8kaGFuZGxlQW55ID0gbnVsbDtcblx0ICB9XG5cblx0fSk7XG5cblx0bW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoZ2VuZXJhdG9yKSB7XG5cdCAgcmV0dXJuIG5ldyBTKGdlbmVyYXRvcik7XG5cdH07XG5cbi8qKiovIH0sXG4vKiA2NiAqL1xuLyoqKi8gZnVuY3Rpb24obW9kdWxlLCBleHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKSB7XG5cblx0J3VzZSBzdHJpY3QnO1xuXG5cdHZhciBfcmVxdWlyZSA9IF9fd2VicGFja19yZXF1aXJlX18oMik7XG5cblx0dmFyIGluaGVyaXQgPSBfcmVxdWlyZS5pbmhlcml0O1xuXG5cdHZhciBBYnN0cmFjdFBvb2wgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDYzKTtcblxuXHRmdW5jdGlvbiBQb29sKCkge1xuXHQgIEFic3RyYWN0UG9vbC5jYWxsKHRoaXMpO1xuXHR9XG5cblx0aW5oZXJpdChQb29sLCBBYnN0cmFjdFBvb2wsIHtcblxuXHQgIF9uYW1lOiAncG9vbCcsXG5cblx0ICBwbHVnOiBmdW5jdGlvbiBwbHVnKG9icykge1xuXHQgICAgdGhpcy5fYWRkKG9icyk7XG5cdCAgICByZXR1cm4gdGhpcztcblx0ICB9LFxuXG5cdCAgdW5wbHVnOiBmdW5jdGlvbiB1bnBsdWcob2JzKSB7XG5cdCAgICB0aGlzLl9yZW1vdmUob2JzKTtcblx0ICAgIHJldHVybiB0aGlzO1xuXHQgIH1cblxuXHR9KTtcblxuXHRtb2R1bGUuZXhwb3J0cyA9IFBvb2w7XG5cbi8qKiovIH0sXG4vKiA2NyAqL1xuLyoqKi8gZnVuY3Rpb24obW9kdWxlLCBleHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKSB7XG5cblx0J3VzZSBzdHJpY3QnO1xuXG5cdHZhciBfcmVxdWlyZSA9IF9fd2VicGFja19yZXF1aXJlX18oMyk7XG5cblx0dmFyIFZBTFVFID0gX3JlcXVpcmUuVkFMVUU7XG5cdHZhciBFUlJPUiA9IF9yZXF1aXJlLkVSUk9SO1xuXHR2YXIgRU5EID0gX3JlcXVpcmUuRU5EO1xuXG5cdHZhciBfcmVxdWlyZTIgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDIpO1xuXG5cdHZhciBpbmhlcml0ID0gX3JlcXVpcmUyLmluaGVyaXQ7XG5cblx0dmFyIEFic3RyYWN0UG9vbCA9IF9fd2VicGFja19yZXF1aXJlX18oNjMpO1xuXG5cdGZ1bmN0aW9uIEZsYXRNYXAoc291cmNlLCBmbiwgb3B0aW9ucykge1xuXHQgIHZhciBfdGhpcyA9IHRoaXM7XG5cblx0ICBBYnN0cmFjdFBvb2wuY2FsbCh0aGlzLCBvcHRpb25zKTtcblx0ICB0aGlzLl9zb3VyY2UgPSBzb3VyY2U7XG5cdCAgdGhpcy5fZm4gPSBmbjtcblx0ICB0aGlzLl9tYWluRW5kZWQgPSBmYWxzZTtcblx0ICB0aGlzLl9sYXN0Q3VycmVudCA9IG51bGw7XG5cdCAgdGhpcy5fJGhhbmRsZU1haW4gPSBmdW5jdGlvbiAoZXZlbnQpIHtcblx0ICAgIHJldHVybiBfdGhpcy5faGFuZGxlTWFpbihldmVudCk7XG5cdCAgfTtcblx0fVxuXG5cdGluaGVyaXQoRmxhdE1hcCwgQWJzdHJhY3RQb29sLCB7XG5cblx0ICBfb25BY3RpdmF0aW9uOiBmdW5jdGlvbiBfb25BY3RpdmF0aW9uKCkge1xuXHQgICAgQWJzdHJhY3RQb29sLnByb3RvdHlwZS5fb25BY3RpdmF0aW9uLmNhbGwodGhpcyk7XG5cdCAgICBpZiAodGhpcy5fYWN0aXZlKSB7XG5cdCAgICAgIHRoaXMuX3NvdXJjZS5vbkFueSh0aGlzLl8kaGFuZGxlTWFpbik7XG5cdCAgICB9XG5cdCAgfSxcblxuXHQgIF9vbkRlYWN0aXZhdGlvbjogZnVuY3Rpb24gX29uRGVhY3RpdmF0aW9uKCkge1xuXHQgICAgQWJzdHJhY3RQb29sLnByb3RvdHlwZS5fb25EZWFjdGl2YXRpb24uY2FsbCh0aGlzKTtcblx0ICAgIHRoaXMuX3NvdXJjZS5vZmZBbnkodGhpcy5fJGhhbmRsZU1haW4pO1xuXHQgICAgdGhpcy5faGFkTm9FdlNpbmNlRGVhY3QgPSB0cnVlO1xuXHQgIH0sXG5cblx0ICBfaGFuZGxlTWFpbjogZnVuY3Rpb24gX2hhbmRsZU1haW4oZXZlbnQpIHtcblxuXHQgICAgaWYgKGV2ZW50LnR5cGUgPT09IFZBTFVFKSB7XG5cdCAgICAgIC8vIElzIGxhdGVzdCB2YWx1ZSBiZWZvcmUgZGVhY3RpdmF0aW9uIHN1cnZpdmVkLCBhbmQgbm93IGlzICdjdXJyZW50JyBvbiB0aGlzIGFjdGl2YXRpb24/XG5cdCAgICAgIC8vIFdlIGRvbid0IHdhbnQgdG8gaGFuZGxlIHN1Y2ggdmFsdWVzLCB0byBwcmV2ZW50IHRvIGNvbnN0YW50bHkgYWRkXG5cdCAgICAgIC8vIHNhbWUgb2JzZXJ2YWxlIG9uIGVhY2ggYWN0aXZhdGlvbi9kZWFjdGl2YXRpb24gd2hlbiBvdXIgbWFpbiBzb3VyY2Vcblx0ICAgICAgLy8gaXMgYSBgS2VmaXIuY29uYXRhbnQoKWAgZm9yIGV4YW1wbGUuXG5cdCAgICAgIHZhciBzYW1lQ3VyciA9IHRoaXMuX2FjdGl2YXRpbmcgJiYgdGhpcy5faGFkTm9FdlNpbmNlRGVhY3QgJiYgdGhpcy5fbGFzdEN1cnJlbnQgPT09IGV2ZW50LnZhbHVlO1xuXHQgICAgICBpZiAoIXNhbWVDdXJyKSB7XG5cdCAgICAgICAgdGhpcy5fYWRkKGV2ZW50LnZhbHVlLCB0aGlzLl9mbik7XG5cdCAgICAgIH1cblx0ICAgICAgdGhpcy5fbGFzdEN1cnJlbnQgPSBldmVudC52YWx1ZTtcblx0ICAgICAgdGhpcy5faGFkTm9FdlNpbmNlRGVhY3QgPSBmYWxzZTtcblx0ICAgIH1cblxuXHQgICAgaWYgKGV2ZW50LnR5cGUgPT09IEVSUk9SKSB7XG5cdCAgICAgIHRoaXMuX2VtaXRFcnJvcihldmVudC52YWx1ZSk7XG5cdCAgICB9XG5cblx0ICAgIGlmIChldmVudC50eXBlID09PSBFTkQpIHtcblx0ICAgICAgaWYgKHRoaXMuX2lzRW1wdHkoKSkge1xuXHQgICAgICAgIHRoaXMuX2VtaXRFbmQoKTtcblx0ICAgICAgfSBlbHNlIHtcblx0ICAgICAgICB0aGlzLl9tYWluRW5kZWQgPSB0cnVlO1xuXHQgICAgICB9XG5cdCAgICB9XG5cdCAgfSxcblxuXHQgIF9vbkVtcHR5OiBmdW5jdGlvbiBfb25FbXB0eSgpIHtcblx0ICAgIGlmICh0aGlzLl9tYWluRW5kZWQpIHtcblx0ICAgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgICAgfVxuXHQgIH0sXG5cblx0ICBfY2xlYXI6IGZ1bmN0aW9uIF9jbGVhcigpIHtcblx0ICAgIEFic3RyYWN0UG9vbC5wcm90b3R5cGUuX2NsZWFyLmNhbGwodGhpcyk7XG5cdCAgICB0aGlzLl9zb3VyY2UgPSBudWxsO1xuXHQgICAgdGhpcy5fbGFzdEN1cnJlbnQgPSBudWxsO1xuXHQgICAgdGhpcy5fJGhhbmRsZU1haW4gPSBudWxsO1xuXHQgIH1cblxuXHR9KTtcblxuXHRtb2R1bGUuZXhwb3J0cyA9IEZsYXRNYXA7XG5cbi8qKiovIH0sXG4vKiA2OCAqL1xuLyoqKi8gZnVuY3Rpb24obW9kdWxlLCBleHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKSB7XG5cblx0J3VzZSBzdHJpY3QnO1xuXG5cdHZhciBfcmVxdWlyZSA9IF9fd2VicGFja19yZXF1aXJlX18oMyk7XG5cblx0dmFyIFZBTFVFID0gX3JlcXVpcmUuVkFMVUU7XG5cdHZhciBFUlJPUiA9IF9yZXF1aXJlLkVSUk9SO1xuXHR2YXIgRU5EID0gX3JlcXVpcmUuRU5EO1xuXG5cdHZhciBfcmVxdWlyZTIgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDIpO1xuXG5cdHZhciBpbmhlcml0ID0gX3JlcXVpcmUyLmluaGVyaXQ7XG5cblx0dmFyIEZsYXRNYXAgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDY3KTtcblxuXHRmdW5jdGlvbiBGbGF0TWFwRXJyb3JzKHNvdXJjZSwgZm4pIHtcblx0ICBGbGF0TWFwLmNhbGwodGhpcywgc291cmNlLCBmbik7XG5cdH1cblxuXHRpbmhlcml0KEZsYXRNYXBFcnJvcnMsIEZsYXRNYXAsIHtcblxuXHQgIC8vIFNhbWUgYXMgaW4gRmxhdE1hcCwgb25seSBWQUxVRS9FUlJPUiBmbGlwcGVkXG5cdCAgX2hhbmRsZU1haW46IGZ1bmN0aW9uIF9oYW5kbGVNYWluKGV2ZW50KSB7XG5cblx0ICAgIGlmIChldmVudC50eXBlID09PSBFUlJPUikge1xuXHQgICAgICB2YXIgc2FtZUN1cnIgPSB0aGlzLl9hY3RpdmF0aW5nICYmIHRoaXMuX2hhZE5vRXZTaW5jZURlYWN0ICYmIHRoaXMuX2xhc3RDdXJyZW50ID09PSBldmVudC52YWx1ZTtcblx0ICAgICAgaWYgKCFzYW1lQ3Vycikge1xuXHQgICAgICAgIHRoaXMuX2FkZChldmVudC52YWx1ZSwgdGhpcy5fZm4pO1xuXHQgICAgICB9XG5cdCAgICAgIHRoaXMuX2xhc3RDdXJyZW50ID0gZXZlbnQudmFsdWU7XG5cdCAgICAgIHRoaXMuX2hhZE5vRXZTaW5jZURlYWN0ID0gZmFsc2U7XG5cdCAgICB9XG5cblx0ICAgIGlmIChldmVudC50eXBlID09PSBWQUxVRSkge1xuXHQgICAgICB0aGlzLl9lbWl0VmFsdWUoZXZlbnQudmFsdWUpO1xuXHQgICAgfVxuXG5cdCAgICBpZiAoZXZlbnQudHlwZSA9PT0gRU5EKSB7XG5cdCAgICAgIGlmICh0aGlzLl9pc0VtcHR5KCkpIHtcblx0ICAgICAgICB0aGlzLl9lbWl0RW5kKCk7XG5cdCAgICAgIH0gZWxzZSB7XG5cdCAgICAgICAgdGhpcy5fbWFpbkVuZGVkID0gdHJ1ZTtcblx0ICAgICAgfVxuXHQgICAgfVxuXHQgIH1cblxuXHR9KTtcblxuXHRtb2R1bGUuZXhwb3J0cyA9IEZsYXRNYXBFcnJvcnM7XG5cbi8qKiovIH0sXG4vKiA2OSAqL1xuLyoqKi8gZnVuY3Rpb24obW9kdWxlLCBleHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKSB7XG5cblx0J3VzZSBzdHJpY3QnO1xuXG5cdHZhciBfcmVxdWlyZSA9IF9fd2VicGFja19yZXF1aXJlX18oNzApO1xuXG5cdHZhciBjcmVhdGVTdHJlYW0gPSBfcmVxdWlyZS5jcmVhdGVTdHJlYW07XG5cdHZhciBjcmVhdGVQcm9wZXJ0eSA9IF9yZXF1aXJlLmNyZWF0ZVByb3BlcnR5O1xuXG5cdHZhciBfcmVxdWlyZTIgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDMpO1xuXG5cdHZhciBOT1RISU5HID0gX3JlcXVpcmUyLk5PVEhJTkc7XG5cblx0dmFyIG1peGluID0ge1xuXG5cdCAgX2hhbmRsZVByaW1hcnlWYWx1ZTogZnVuY3Rpb24gX2hhbmRsZVByaW1hcnlWYWx1ZSh4KSB7XG5cdCAgICBpZiAodGhpcy5fbGFzdFNlY29uZGFyeSAhPT0gTk9USElORyAmJiB0aGlzLl9sYXN0U2Vjb25kYXJ5KSB7XG5cdCAgICAgIHRoaXMuX2VtaXRWYWx1ZSh4KTtcblx0ICAgIH1cblx0ICB9LFxuXG5cdCAgX2hhbmRsZVNlY29uZGFyeUVuZDogZnVuY3Rpb24gX2hhbmRsZVNlY29uZGFyeUVuZCgpIHtcblx0ICAgIGlmICh0aGlzLl9sYXN0U2Vjb25kYXJ5ID09PSBOT1RISU5HIHx8ICF0aGlzLl9sYXN0U2Vjb25kYXJ5KSB7XG5cdCAgICAgIHRoaXMuX2VtaXRFbmQoKTtcblx0ICAgIH1cblx0ICB9XG5cblx0fTtcblxuXHR2YXIgUyA9IGNyZWF0ZVN0cmVhbSgnZmlsdGVyQnknLCBtaXhpbik7XG5cdHZhciBQID0gY3JlYXRlUHJvcGVydHkoJ2ZpbHRlckJ5JywgbWl4aW4pO1xuXG5cdG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gZmlsdGVyQnkocHJpbWFyeSwgc2Vjb25kYXJ5KSB7XG5cdCAgcmV0dXJuIG5ldyAocHJpbWFyeS5fb2ZTYW1lVHlwZShTLCBQKSkocHJpbWFyeSwgc2Vjb25kYXJ5KTtcblx0fTtcblxuLyoqKi8gfSxcbi8qIDcwICovXG4vKioqLyBmdW5jdGlvbihtb2R1bGUsIGV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pIHtcblxuXHQndXNlIHN0cmljdCc7XG5cblx0dmFyIFN0cmVhbSA9IF9fd2VicGFja19yZXF1aXJlX18oNik7XG5cdHZhciBQcm9wZXJ0eSA9IF9fd2VicGFja19yZXF1aXJlX18oNyk7XG5cblx0dmFyIF9yZXF1aXJlID0gX193ZWJwYWNrX3JlcXVpcmVfXygyKTtcblxuXHR2YXIgaW5oZXJpdCA9IF9yZXF1aXJlLmluaGVyaXQ7XG5cblx0dmFyIF9yZXF1aXJlMiA9IF9fd2VicGFja19yZXF1aXJlX18oMyk7XG5cblx0dmFyIFZBTFVFID0gX3JlcXVpcmUyLlZBTFVFO1xuXHR2YXIgRVJST1IgPSBfcmVxdWlyZTIuRVJST1I7XG5cdHZhciBFTkQgPSBfcmVxdWlyZTIuRU5EO1xuXHR2YXIgTk9USElORyA9IF9yZXF1aXJlMi5OT1RISU5HO1xuXG5cdGZ1bmN0aW9uIGNyZWF0ZUNvbnN0cnVjdG9yKEJhc2VDbGFzcywgbmFtZSkge1xuXHQgIHJldHVybiBmdW5jdGlvbiBBbm9ueW1vdXNPYnNlcnZhYmxlKHByaW1hcnksIHNlY29uZGFyeSwgb3B0aW9ucykge1xuXHQgICAgdmFyIF90aGlzID0gdGhpcztcblxuXHQgICAgQmFzZUNsYXNzLmNhbGwodGhpcyk7XG5cdCAgICB0aGlzLl9wcmltYXJ5ID0gcHJpbWFyeTtcblx0ICAgIHRoaXMuX3NlY29uZGFyeSA9IHNlY29uZGFyeTtcblx0ICAgIHRoaXMuX25hbWUgPSBwcmltYXJ5Ll9uYW1lICsgJy4nICsgbmFtZTtcblx0ICAgIHRoaXMuX2xhc3RTZWNvbmRhcnkgPSBOT1RISU5HO1xuXHQgICAgdGhpcy5fJGhhbmRsZVNlY29uZGFyeUFueSA9IGZ1bmN0aW9uIChldmVudCkge1xuXHQgICAgICByZXR1cm4gX3RoaXMuX2hhbmRsZVNlY29uZGFyeUFueShldmVudCk7XG5cdCAgICB9O1xuXHQgICAgdGhpcy5fJGhhbmRsZVByaW1hcnlBbnkgPSBmdW5jdGlvbiAoZXZlbnQpIHtcblx0ICAgICAgcmV0dXJuIF90aGlzLl9oYW5kbGVQcmltYXJ5QW55KGV2ZW50KTtcblx0ICAgIH07XG5cdCAgICB0aGlzLl9pbml0KG9wdGlvbnMpO1xuXHQgIH07XG5cdH1cblxuXHRmdW5jdGlvbiBjcmVhdGVDbGFzc01ldGhvZHMoQmFzZUNsYXNzKSB7XG5cdCAgcmV0dXJuIHtcblx0ICAgIF9pbml0OiBmdW5jdGlvbiBfaW5pdCgpIHt9LFxuXHQgICAgX2ZyZWU6IGZ1bmN0aW9uIF9mcmVlKCkge30sXG5cblx0ICAgIF9oYW5kbGVQcmltYXJ5VmFsdWU6IGZ1bmN0aW9uIF9oYW5kbGVQcmltYXJ5VmFsdWUoeCkge1xuXHQgICAgICB0aGlzLl9lbWl0VmFsdWUoeCk7XG5cdCAgICB9LFxuXHQgICAgX2hhbmRsZVByaW1hcnlFcnJvcjogZnVuY3Rpb24gX2hhbmRsZVByaW1hcnlFcnJvcih4KSB7XG5cdCAgICAgIHRoaXMuX2VtaXRFcnJvcih4KTtcblx0ICAgIH0sXG5cdCAgICBfaGFuZGxlUHJpbWFyeUVuZDogZnVuY3Rpb24gX2hhbmRsZVByaW1hcnlFbmQoKSB7XG5cdCAgICAgIHRoaXMuX2VtaXRFbmQoKTtcblx0ICAgIH0sXG5cblx0ICAgIF9oYW5kbGVTZWNvbmRhcnlWYWx1ZTogZnVuY3Rpb24gX2hhbmRsZVNlY29uZGFyeVZhbHVlKHgpIHtcblx0ICAgICAgdGhpcy5fbGFzdFNlY29uZGFyeSA9IHg7XG5cdCAgICB9LFxuXHQgICAgX2hhbmRsZVNlY29uZGFyeUVycm9yOiBmdW5jdGlvbiBfaGFuZGxlU2Vjb25kYXJ5RXJyb3IoeCkge1xuXHQgICAgICB0aGlzLl9lbWl0RXJyb3IoeCk7XG5cdCAgICB9LFxuXHQgICAgX2hhbmRsZVNlY29uZGFyeUVuZDogZnVuY3Rpb24gX2hhbmRsZVNlY29uZGFyeUVuZCgpIHt9LFxuXG5cdCAgICBfaGFuZGxlUHJpbWFyeUFueTogZnVuY3Rpb24gX2hhbmRsZVByaW1hcnlBbnkoZXZlbnQpIHtcblx0ICAgICAgc3dpdGNoIChldmVudC50eXBlKSB7XG5cdCAgICAgICAgY2FzZSBWQUxVRTpcblx0ICAgICAgICAgIHJldHVybiB0aGlzLl9oYW5kbGVQcmltYXJ5VmFsdWUoZXZlbnQudmFsdWUpO1xuXHQgICAgICAgIGNhc2UgRVJST1I6XG5cdCAgICAgICAgICByZXR1cm4gdGhpcy5faGFuZGxlUHJpbWFyeUVycm9yKGV2ZW50LnZhbHVlKTtcblx0ICAgICAgICBjYXNlIEVORDpcblx0ICAgICAgICAgIHJldHVybiB0aGlzLl9oYW5kbGVQcmltYXJ5RW5kKGV2ZW50LnZhbHVlKTtcblx0ICAgICAgfVxuXHQgICAgfSxcblx0ICAgIF9oYW5kbGVTZWNvbmRhcnlBbnk6IGZ1bmN0aW9uIF9oYW5kbGVTZWNvbmRhcnlBbnkoZXZlbnQpIHtcblx0ICAgICAgc3dpdGNoIChldmVudC50eXBlKSB7XG5cdCAgICAgICAgY2FzZSBWQUxVRTpcblx0ICAgICAgICAgIHJldHVybiB0aGlzLl9oYW5kbGVTZWNvbmRhcnlWYWx1ZShldmVudC52YWx1ZSk7XG5cdCAgICAgICAgY2FzZSBFUlJPUjpcblx0ICAgICAgICAgIHJldHVybiB0aGlzLl9oYW5kbGVTZWNvbmRhcnlFcnJvcihldmVudC52YWx1ZSk7XG5cdCAgICAgICAgY2FzZSBFTkQ6XG5cdCAgICAgICAgICB0aGlzLl9oYW5kbGVTZWNvbmRhcnlFbmQoZXZlbnQudmFsdWUpO1xuXHQgICAgICAgICAgdGhpcy5fcmVtb3ZlU2Vjb25kYXJ5KCk7XG5cdCAgICAgIH1cblx0ICAgIH0sXG5cblx0ICAgIF9yZW1vdmVTZWNvbmRhcnk6IGZ1bmN0aW9uIF9yZW1vdmVTZWNvbmRhcnkoKSB7XG5cdCAgICAgIGlmICh0aGlzLl9zZWNvbmRhcnkgIT09IG51bGwpIHtcblx0ICAgICAgICB0aGlzLl9zZWNvbmRhcnkub2ZmQW55KHRoaXMuXyRoYW5kbGVTZWNvbmRhcnlBbnkpO1xuXHQgICAgICAgIHRoaXMuXyRoYW5kbGVTZWNvbmRhcnlBbnkgPSBudWxsO1xuXHQgICAgICAgIHRoaXMuX3NlY29uZGFyeSA9IG51bGw7XG5cdCAgICAgIH1cblx0ICAgIH0sXG5cblx0ICAgIF9vbkFjdGl2YXRpb246IGZ1bmN0aW9uIF9vbkFjdGl2YXRpb24oKSB7XG5cdCAgICAgIGlmICh0aGlzLl9zZWNvbmRhcnkgIT09IG51bGwpIHtcblx0ICAgICAgICB0aGlzLl9zZWNvbmRhcnkub25BbnkodGhpcy5fJGhhbmRsZVNlY29uZGFyeUFueSk7XG5cdCAgICAgIH1cblx0ICAgICAgaWYgKHRoaXMuX2FjdGl2ZSkge1xuXHQgICAgICAgIHRoaXMuX3ByaW1hcnkub25BbnkodGhpcy5fJGhhbmRsZVByaW1hcnlBbnkpO1xuXHQgICAgICB9XG5cdCAgICB9LFxuXHQgICAgX29uRGVhY3RpdmF0aW9uOiBmdW5jdGlvbiBfb25EZWFjdGl2YXRpb24oKSB7XG5cdCAgICAgIGlmICh0aGlzLl9zZWNvbmRhcnkgIT09IG51bGwpIHtcblx0ICAgICAgICB0aGlzLl9zZWNvbmRhcnkub2ZmQW55KHRoaXMuXyRoYW5kbGVTZWNvbmRhcnlBbnkpO1xuXHQgICAgICB9XG5cdCAgICAgIHRoaXMuX3ByaW1hcnkub2ZmQW55KHRoaXMuXyRoYW5kbGVQcmltYXJ5QW55KTtcblx0ICAgIH0sXG5cblx0ICAgIF9jbGVhcjogZnVuY3Rpb24gX2NsZWFyKCkge1xuXHQgICAgICBCYXNlQ2xhc3MucHJvdG90eXBlLl9jbGVhci5jYWxsKHRoaXMpO1xuXHQgICAgICB0aGlzLl9wcmltYXJ5ID0gbnVsbDtcblx0ICAgICAgdGhpcy5fc2Vjb25kYXJ5ID0gbnVsbDtcblx0ICAgICAgdGhpcy5fbGFzdFNlY29uZGFyeSA9IG51bGw7XG5cdCAgICAgIHRoaXMuXyRoYW5kbGVTZWNvbmRhcnlBbnkgPSBudWxsO1xuXHQgICAgICB0aGlzLl8kaGFuZGxlUHJpbWFyeUFueSA9IG51bGw7XG5cdCAgICAgIHRoaXMuX2ZyZWUoKTtcblx0ICAgIH1cblxuXHQgIH07XG5cdH1cblxuXHRmdW5jdGlvbiBjcmVhdGVTdHJlYW0obmFtZSwgbWl4aW4pIHtcblx0ICB2YXIgUyA9IGNyZWF0ZUNvbnN0cnVjdG9yKFN0cmVhbSwgbmFtZSk7XG5cdCAgaW5oZXJpdChTLCBTdHJlYW0sIGNyZWF0ZUNsYXNzTWV0aG9kcyhTdHJlYW0pLCBtaXhpbik7XG5cdCAgcmV0dXJuIFM7XG5cdH1cblxuXHRmdW5jdGlvbiBjcmVhdGVQcm9wZXJ0eShuYW1lLCBtaXhpbikge1xuXHQgIHZhciBQID0gY3JlYXRlQ29uc3RydWN0b3IoUHJvcGVydHksIG5hbWUpO1xuXHQgIGluaGVyaXQoUCwgUHJvcGVydHksIGNyZWF0ZUNsYXNzTWV0aG9kcyhQcm9wZXJ0eSksIG1peGluKTtcblx0ICByZXR1cm4gUDtcblx0fVxuXG5cdG1vZHVsZS5leHBvcnRzID0geyBjcmVhdGVTdHJlYW06IGNyZWF0ZVN0cmVhbSwgY3JlYXRlUHJvcGVydHk6IGNyZWF0ZVByb3BlcnR5IH07XG5cbi8qKiovIH0sXG4vKiA3MSAqL1xuLyoqKi8gZnVuY3Rpb24obW9kdWxlLCBleHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKSB7XG5cblx0J3VzZSBzdHJpY3QnO1xuXG5cdHZhciBjb21iaW5lID0gX193ZWJwYWNrX3JlcXVpcmVfXyg2MCk7XG5cblx0dmFyIGlkMiA9IGZ1bmN0aW9uIGlkMihfLCB4KSB7XG5cdCAgcmV0dXJuIHg7XG5cdH07XG5cblx0bW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBzYW1wbGVkQnkocGFzc2l2ZSwgYWN0aXZlLCBjb21iaW5hdG9yKSB7XG5cdCAgdmFyIF9jb21iaW5hdG9yID0gY29tYmluYXRvciA/IGZ1bmN0aW9uIChhLCBiKSB7XG5cdCAgICByZXR1cm4gY29tYmluYXRvcihiLCBhKTtcblx0ICB9IDogaWQyO1xuXHQgIHJldHVybiBjb21iaW5lKFthY3RpdmVdLCBbcGFzc2l2ZV0sIF9jb21iaW5hdG9yKS5zZXROYW1lKHBhc3NpdmUsICdzYW1wbGVkQnknKTtcblx0fTtcblxuLyoqKi8gfSxcbi8qIDcyICovXG4vKioqLyBmdW5jdGlvbihtb2R1bGUsIGV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pIHtcblxuXHQndXNlIHN0cmljdCc7XG5cblx0dmFyIF9yZXF1aXJlID0gX193ZWJwYWNrX3JlcXVpcmVfXyg3MCk7XG5cblx0dmFyIGNyZWF0ZVN0cmVhbSA9IF9yZXF1aXJlLmNyZWF0ZVN0cmVhbTtcblx0dmFyIGNyZWF0ZVByb3BlcnR5ID0gX3JlcXVpcmUuY3JlYXRlUHJvcGVydHk7XG5cblx0dmFyIF9yZXF1aXJlMiA9IF9fd2VicGFja19yZXF1aXJlX18oMyk7XG5cblx0dmFyIE5PVEhJTkcgPSBfcmVxdWlyZTIuTk9USElORztcblxuXHR2YXIgbWl4aW4gPSB7XG5cblx0ICBfaGFuZGxlUHJpbWFyeVZhbHVlOiBmdW5jdGlvbiBfaGFuZGxlUHJpbWFyeVZhbHVlKHgpIHtcblx0ICAgIGlmICh0aGlzLl9sYXN0U2Vjb25kYXJ5ICE9PSBOT1RISU5HKSB7XG5cdCAgICAgIHRoaXMuX2VtaXRWYWx1ZSh4KTtcblx0ICAgIH1cblx0ICB9LFxuXG5cdCAgX2hhbmRsZVNlY29uZGFyeUVuZDogZnVuY3Rpb24gX2hhbmRsZVNlY29uZGFyeUVuZCgpIHtcblx0ICAgIGlmICh0aGlzLl9sYXN0U2Vjb25kYXJ5ID09PSBOT1RISU5HKSB7XG5cdCAgICAgIHRoaXMuX2VtaXRFbmQoKTtcblx0ICAgIH1cblx0ICB9XG5cblx0fTtcblxuXHR2YXIgUyA9IGNyZWF0ZVN0cmVhbSgnc2tpcFVudGlsQnknLCBtaXhpbik7XG5cdHZhciBQID0gY3JlYXRlUHJvcGVydHkoJ3NraXBVbnRpbEJ5JywgbWl4aW4pO1xuXG5cdG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gc2tpcFVudGlsQnkocHJpbWFyeSwgc2Vjb25kYXJ5KSB7XG5cdCAgcmV0dXJuIG5ldyAocHJpbWFyeS5fb2ZTYW1lVHlwZShTLCBQKSkocHJpbWFyeSwgc2Vjb25kYXJ5KTtcblx0fTtcblxuLyoqKi8gfSxcbi8qIDczICovXG4vKioqLyBmdW5jdGlvbihtb2R1bGUsIGV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pIHtcblxuXHQndXNlIHN0cmljdCc7XG5cblx0dmFyIF9yZXF1aXJlID0gX193ZWJwYWNrX3JlcXVpcmVfXyg3MCk7XG5cblx0dmFyIGNyZWF0ZVN0cmVhbSA9IF9yZXF1aXJlLmNyZWF0ZVN0cmVhbTtcblx0dmFyIGNyZWF0ZVByb3BlcnR5ID0gX3JlcXVpcmUuY3JlYXRlUHJvcGVydHk7XG5cblx0dmFyIG1peGluID0ge1xuXG5cdCAgX2hhbmRsZVNlY29uZGFyeVZhbHVlOiBmdW5jdGlvbiBfaGFuZGxlU2Vjb25kYXJ5VmFsdWUoKSB7XG5cdCAgICB0aGlzLl9lbWl0RW5kKCk7XG5cdCAgfVxuXG5cdH07XG5cblx0dmFyIFMgPSBjcmVhdGVTdHJlYW0oJ3Rha2VVbnRpbEJ5JywgbWl4aW4pO1xuXHR2YXIgUCA9IGNyZWF0ZVByb3BlcnR5KCd0YWtlVW50aWxCeScsIG1peGluKTtcblxuXHRtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIHRha2VVbnRpbEJ5KHByaW1hcnksIHNlY29uZGFyeSkge1xuXHQgIHJldHVybiBuZXcgKHByaW1hcnkuX29mU2FtZVR5cGUoUywgUCkpKHByaW1hcnksIHNlY29uZGFyeSk7XG5cdH07XG5cbi8qKiovIH0sXG4vKiA3NCAqL1xuLyoqKi8gZnVuY3Rpb24obW9kdWxlLCBleHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKSB7XG5cblx0J3VzZSBzdHJpY3QnO1xuXG5cdHZhciBfcmVxdWlyZSA9IF9fd2VicGFja19yZXF1aXJlX18oNzApO1xuXG5cdHZhciBjcmVhdGVTdHJlYW0gPSBfcmVxdWlyZS5jcmVhdGVTdHJlYW07XG5cdHZhciBjcmVhdGVQcm9wZXJ0eSA9IF9yZXF1aXJlLmNyZWF0ZVByb3BlcnR5O1xuXG5cdHZhciBtaXhpbiA9IHtcblxuXHQgIF9pbml0OiBmdW5jdGlvbiBfaW5pdCgpIHtcblx0ICAgIHZhciBfcmVmID0gYXJndW1lbnRzLmxlbmd0aCA8PSAwIHx8IGFyZ3VtZW50c1swXSA9PT0gdW5kZWZpbmVkID8ge30gOiBhcmd1bWVudHNbMF07XG5cblx0ICAgIHZhciBfcmVmJGZsdXNoT25FbmQgPSBfcmVmLmZsdXNoT25FbmQ7XG5cdCAgICB2YXIgZmx1c2hPbkVuZCA9IF9yZWYkZmx1c2hPbkVuZCA9PT0gdW5kZWZpbmVkID8gdHJ1ZSA6IF9yZWYkZmx1c2hPbkVuZDtcblxuXHQgICAgdGhpcy5fYnVmZiA9IFtdO1xuXHQgICAgdGhpcy5fZmx1c2hPbkVuZCA9IGZsdXNoT25FbmQ7XG5cdCAgfSxcblxuXHQgIF9mcmVlOiBmdW5jdGlvbiBfZnJlZSgpIHtcblx0ICAgIHRoaXMuX2J1ZmYgPSBudWxsO1xuXHQgIH0sXG5cblx0ICBfZmx1c2g6IGZ1bmN0aW9uIF9mbHVzaCgpIHtcblx0ICAgIGlmICh0aGlzLl9idWZmICE9PSBudWxsKSB7XG5cdCAgICAgIHRoaXMuX2VtaXRWYWx1ZSh0aGlzLl9idWZmKTtcblx0ICAgICAgdGhpcy5fYnVmZiA9IFtdO1xuXHQgICAgfVxuXHQgIH0sXG5cblx0ICBfaGFuZGxlUHJpbWFyeUVuZDogZnVuY3Rpb24gX2hhbmRsZVByaW1hcnlFbmQoKSB7XG5cdCAgICBpZiAodGhpcy5fZmx1c2hPbkVuZCkge1xuXHQgICAgICB0aGlzLl9mbHVzaCgpO1xuXHQgICAgfVxuXHQgICAgdGhpcy5fZW1pdEVuZCgpO1xuXHQgIH0sXG5cblx0ICBfb25BY3RpdmF0aW9uOiBmdW5jdGlvbiBfb25BY3RpdmF0aW9uKCkge1xuXHQgICAgdGhpcy5fcHJpbWFyeS5vbkFueSh0aGlzLl8kaGFuZGxlUHJpbWFyeUFueSk7XG5cdCAgICBpZiAodGhpcy5fYWxpdmUgJiYgdGhpcy5fc2Vjb25kYXJ5ICE9PSBudWxsKSB7XG5cdCAgICAgIHRoaXMuX3NlY29uZGFyeS5vbkFueSh0aGlzLl8kaGFuZGxlU2Vjb25kYXJ5QW55KTtcblx0ICAgIH1cblx0ICB9LFxuXG5cdCAgX2hhbmRsZVByaW1hcnlWYWx1ZTogZnVuY3Rpb24gX2hhbmRsZVByaW1hcnlWYWx1ZSh4KSB7XG5cdCAgICB0aGlzLl9idWZmLnB1c2goeCk7XG5cdCAgfSxcblxuXHQgIF9oYW5kbGVTZWNvbmRhcnlWYWx1ZTogZnVuY3Rpb24gX2hhbmRsZVNlY29uZGFyeVZhbHVlKCkge1xuXHQgICAgdGhpcy5fZmx1c2goKTtcblx0ICB9LFxuXG5cdCAgX2hhbmRsZVNlY29uZGFyeUVuZDogZnVuY3Rpb24gX2hhbmRsZVNlY29uZGFyeUVuZCgpIHtcblx0ICAgIGlmICghdGhpcy5fZmx1c2hPbkVuZCkge1xuXHQgICAgICB0aGlzLl9lbWl0RW5kKCk7XG5cdCAgICB9XG5cdCAgfVxuXG5cdH07XG5cblx0dmFyIFMgPSBjcmVhdGVTdHJlYW0oJ2J1ZmZlckJ5JywgbWl4aW4pO1xuXHR2YXIgUCA9IGNyZWF0ZVByb3BlcnR5KCdidWZmZXJCeScsIG1peGluKTtcblxuXHRtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGJ1ZmZlckJ5KHByaW1hcnksIHNlY29uZGFyeSwgb3B0aW9ucyAvKiBvcHRpb25hbCAqLykge1xuXHQgIHJldHVybiBuZXcgKHByaW1hcnkuX29mU2FtZVR5cGUoUywgUCkpKHByaW1hcnksIHNlY29uZGFyeSwgb3B0aW9ucyk7XG5cdH07XG5cbi8qKiovIH0sXG4vKiA3NSAqL1xuLyoqKi8gZnVuY3Rpb24obW9kdWxlLCBleHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKSB7XG5cblx0J3VzZSBzdHJpY3QnO1xuXG5cdHZhciBfcmVxdWlyZSA9IF9fd2VicGFja19yZXF1aXJlX18oNzApO1xuXG5cdHZhciBjcmVhdGVTdHJlYW0gPSBfcmVxdWlyZS5jcmVhdGVTdHJlYW07XG5cdHZhciBjcmVhdGVQcm9wZXJ0eSA9IF9yZXF1aXJlLmNyZWF0ZVByb3BlcnR5O1xuXG5cdHZhciBfcmVxdWlyZTIgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDMpO1xuXG5cdHZhciBOT1RISU5HID0gX3JlcXVpcmUyLk5PVEhJTkc7XG5cblx0dmFyIG1peGluID0ge1xuXG5cdCAgX2luaXQ6IGZ1bmN0aW9uIF9pbml0KCkge1xuXHQgICAgdmFyIF9yZWYgPSBhcmd1bWVudHMubGVuZ3RoIDw9IDAgfHwgYXJndW1lbnRzWzBdID09PSB1bmRlZmluZWQgPyB7fSA6IGFyZ3VtZW50c1swXTtcblxuXHQgICAgdmFyIF9yZWYkZmx1c2hPbkVuZCA9IF9yZWYuZmx1c2hPbkVuZDtcblx0ICAgIHZhciBmbHVzaE9uRW5kID0gX3JlZiRmbHVzaE9uRW5kID09PSB1bmRlZmluZWQgPyB0cnVlIDogX3JlZiRmbHVzaE9uRW5kO1xuXHQgICAgdmFyIF9yZWYkZmx1c2hPbkNoYW5nZSA9IF9yZWYuZmx1c2hPbkNoYW5nZTtcblx0ICAgIHZhciBmbHVzaE9uQ2hhbmdlID0gX3JlZiRmbHVzaE9uQ2hhbmdlID09PSB1bmRlZmluZWQgPyBmYWxzZSA6IF9yZWYkZmx1c2hPbkNoYW5nZTtcblxuXHQgICAgdGhpcy5fYnVmZiA9IFtdO1xuXHQgICAgdGhpcy5fZmx1c2hPbkVuZCA9IGZsdXNoT25FbmQ7XG5cdCAgICB0aGlzLl9mbHVzaE9uQ2hhbmdlID0gZmx1c2hPbkNoYW5nZTtcblx0ICB9LFxuXG5cdCAgX2ZyZWU6IGZ1bmN0aW9uIF9mcmVlKCkge1xuXHQgICAgdGhpcy5fYnVmZiA9IG51bGw7XG5cdCAgfSxcblxuXHQgIF9mbHVzaDogZnVuY3Rpb24gX2ZsdXNoKCkge1xuXHQgICAgaWYgKHRoaXMuX2J1ZmYgIT09IG51bGwpIHtcblx0ICAgICAgdGhpcy5fZW1pdFZhbHVlKHRoaXMuX2J1ZmYpO1xuXHQgICAgICB0aGlzLl9idWZmID0gW107XG5cdCAgICB9XG5cdCAgfSxcblxuXHQgIF9oYW5kbGVQcmltYXJ5RW5kOiBmdW5jdGlvbiBfaGFuZGxlUHJpbWFyeUVuZCgpIHtcblx0ICAgIGlmICh0aGlzLl9mbHVzaE9uRW5kKSB7XG5cdCAgICAgIHRoaXMuX2ZsdXNoKCk7XG5cdCAgICB9XG5cdCAgICB0aGlzLl9lbWl0RW5kKCk7XG5cdCAgfSxcblxuXHQgIF9oYW5kbGVQcmltYXJ5VmFsdWU6IGZ1bmN0aW9uIF9oYW5kbGVQcmltYXJ5VmFsdWUoeCkge1xuXHQgICAgdGhpcy5fYnVmZi5wdXNoKHgpO1xuXHQgICAgaWYgKHRoaXMuX2xhc3RTZWNvbmRhcnkgIT09IE5PVEhJTkcgJiYgIXRoaXMuX2xhc3RTZWNvbmRhcnkpIHtcblx0ICAgICAgdGhpcy5fZmx1c2goKTtcblx0ICAgIH1cblx0ICB9LFxuXG5cdCAgX2hhbmRsZVNlY29uZGFyeUVuZDogZnVuY3Rpb24gX2hhbmRsZVNlY29uZGFyeUVuZCgpIHtcblx0ICAgIGlmICghdGhpcy5fZmx1c2hPbkVuZCAmJiAodGhpcy5fbGFzdFNlY29uZGFyeSA9PT0gTk9USElORyB8fCB0aGlzLl9sYXN0U2Vjb25kYXJ5KSkge1xuXHQgICAgICB0aGlzLl9lbWl0RW5kKCk7XG5cdCAgICB9XG5cdCAgfSxcblxuXHQgIF9oYW5kbGVTZWNvbmRhcnlWYWx1ZTogZnVuY3Rpb24gX2hhbmRsZVNlY29uZGFyeVZhbHVlKHgpIHtcblx0ICAgIGlmICh0aGlzLl9mbHVzaE9uQ2hhbmdlICYmICF4KSB7XG5cdCAgICAgIHRoaXMuX2ZsdXNoKCk7XG5cdCAgICB9XG5cblx0ICAgIC8vIGZyb20gZGVmYXVsdCBfaGFuZGxlU2Vjb25kYXJ5VmFsdWVcblx0ICAgIHRoaXMuX2xhc3RTZWNvbmRhcnkgPSB4O1xuXHQgIH1cblxuXHR9O1xuXG5cdHZhciBTID0gY3JlYXRlU3RyZWFtKCdidWZmZXJXaGlsZUJ5JywgbWl4aW4pO1xuXHR2YXIgUCA9IGNyZWF0ZVByb3BlcnR5KCdidWZmZXJXaGlsZUJ5JywgbWl4aW4pO1xuXG5cdG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gYnVmZmVyV2hpbGVCeShwcmltYXJ5LCBzZWNvbmRhcnksIG9wdGlvbnMgLyogb3B0aW9uYWwgKi8pIHtcblx0ICByZXR1cm4gbmV3IChwcmltYXJ5Ll9vZlNhbWVUeXBlKFMsIFApKShwcmltYXJ5LCBzZWNvbmRhcnksIG9wdGlvbnMpO1xuXHR9O1xuXG4vKioqLyB9LFxuLyogNzYgKi9cbi8qKiovIGZ1bmN0aW9uKG1vZHVsZSwgZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXykge1xuXG5cdCd1c2Ugc3RyaWN0JztcblxuXHR2YXIgbWVyZ2UgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDYyKTtcblx0dmFyIG1hcCA9IF9fd2VicGFja19yZXF1aXJlX18oMzIpO1xuXHR2YXIgc2tpcER1cGxpY2F0ZXMgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDQwKTtcblx0dmFyIHRvUHJvcGVydHkgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDI0KTtcblxuXHR2YXIgZiA9IGZ1bmN0aW9uIGYoKSB7XG5cdCAgcmV0dXJuIGZhbHNlO1xuXHR9O1xuXHR2YXIgdCA9IGZ1bmN0aW9uIHQoKSB7XG5cdCAgcmV0dXJuIHRydWU7XG5cdH07XG5cblx0bW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBhd2FpdGluZyhhLCBiKSB7XG5cdCAgdmFyIHJlc3VsdCA9IG1lcmdlKFttYXAoYSwgdCksIG1hcChiLCBmKV0pO1xuXHQgIHJlc3VsdCA9IHNraXBEdXBsaWNhdGVzKHJlc3VsdCk7XG5cdCAgcmVzdWx0ID0gdG9Qcm9wZXJ0eShyZXN1bHQsIGYpO1xuXHQgIHJldHVybiByZXN1bHQuc2V0TmFtZShhLCAnYXdhaXRpbmcnKTtcblx0fTtcblxuLyoqKi8gfSxcbi8qIDc3ICovXG4vKioqLyBmdW5jdGlvbihtb2R1bGUsIGV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pIHtcblxuXHQndXNlIHN0cmljdCc7XG5cblx0dmFyIF9yZXF1aXJlID0gX193ZWJwYWNrX3JlcXVpcmVfXygyNSk7XG5cblx0dmFyIGNyZWF0ZVN0cmVhbSA9IF9yZXF1aXJlLmNyZWF0ZVN0cmVhbTtcblx0dmFyIGNyZWF0ZVByb3BlcnR5ID0gX3JlcXVpcmUuY3JlYXRlUHJvcGVydHk7XG5cblx0dmFyIG1peGluID0ge1xuXG5cdCAgX2luaXQ6IGZ1bmN0aW9uIF9pbml0KF9yZWYpIHtcblx0ICAgIHZhciBmbiA9IF9yZWYuZm47XG5cblx0ICAgIHRoaXMuX2ZuID0gZm47XG5cdCAgfSxcblxuXHQgIF9mcmVlOiBmdW5jdGlvbiBfZnJlZSgpIHtcblx0ICAgIHRoaXMuX2ZuID0gbnVsbDtcblx0ICB9LFxuXG5cdCAgX2hhbmRsZVZhbHVlOiBmdW5jdGlvbiBfaGFuZGxlVmFsdWUoeCkge1xuXHQgICAgdmFyIGZuID0gdGhpcy5fZm47XG5cdCAgICB2YXIgcmVzdWx0ID0gZm4oeCk7XG5cdCAgICBpZiAocmVzdWx0LmNvbnZlcnQpIHtcblx0ICAgICAgdGhpcy5fZW1pdEVycm9yKHJlc3VsdC5lcnJvcik7XG5cdCAgICB9IGVsc2Uge1xuXHQgICAgICB0aGlzLl9lbWl0VmFsdWUoeCk7XG5cdCAgICB9XG5cdCAgfVxuXG5cdH07XG5cblx0dmFyIFMgPSBjcmVhdGVTdHJlYW0oJ3ZhbHVlc1RvRXJyb3JzJywgbWl4aW4pO1xuXHR2YXIgUCA9IGNyZWF0ZVByb3BlcnR5KCd2YWx1ZXNUb0Vycm9ycycsIG1peGluKTtcblxuXHR2YXIgZGVmRm4gPSBmdW5jdGlvbiBkZWZGbih4KSB7XG5cdCAgcmV0dXJuIHsgY29udmVydDogdHJ1ZSwgZXJyb3I6IHggfTtcblx0fTtcblxuXHRtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIHZhbHVlc1RvRXJyb3JzKG9icykge1xuXHQgIHZhciBmbiA9IGFyZ3VtZW50cy5sZW5ndGggPD0gMSB8fCBhcmd1bWVudHNbMV0gPT09IHVuZGVmaW5lZCA/IGRlZkZuIDogYXJndW1lbnRzWzFdO1xuXG5cdCAgcmV0dXJuIG5ldyAob2JzLl9vZlNhbWVUeXBlKFMsIFApKShvYnMsIHsgZm46IGZuIH0pO1xuXHR9O1xuXG4vKioqLyB9LFxuLyogNzggKi9cbi8qKiovIGZ1bmN0aW9uKG1vZHVsZSwgZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXykge1xuXG5cdCd1c2Ugc3RyaWN0JztcblxuXHR2YXIgX3JlcXVpcmUgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDI1KTtcblxuXHR2YXIgY3JlYXRlU3RyZWFtID0gX3JlcXVpcmUuY3JlYXRlU3RyZWFtO1xuXHR2YXIgY3JlYXRlUHJvcGVydHkgPSBfcmVxdWlyZS5jcmVhdGVQcm9wZXJ0eTtcblxuXHR2YXIgbWl4aW4gPSB7XG5cblx0ICBfaW5pdDogZnVuY3Rpb24gX2luaXQoX3JlZikge1xuXHQgICAgdmFyIGZuID0gX3JlZi5mbjtcblxuXHQgICAgdGhpcy5fZm4gPSBmbjtcblx0ICB9LFxuXG5cdCAgX2ZyZWU6IGZ1bmN0aW9uIF9mcmVlKCkge1xuXHQgICAgdGhpcy5fZm4gPSBudWxsO1xuXHQgIH0sXG5cblx0ICBfaGFuZGxlRXJyb3I6IGZ1bmN0aW9uIF9oYW5kbGVFcnJvcih4KSB7XG5cdCAgICB2YXIgZm4gPSB0aGlzLl9mbjtcblx0ICAgIHZhciByZXN1bHQgPSBmbih4KTtcblx0ICAgIGlmIChyZXN1bHQuY29udmVydCkge1xuXHQgICAgICB0aGlzLl9lbWl0VmFsdWUocmVzdWx0LnZhbHVlKTtcblx0ICAgIH0gZWxzZSB7XG5cdCAgICAgIHRoaXMuX2VtaXRFcnJvcih4KTtcblx0ICAgIH1cblx0ICB9XG5cblx0fTtcblxuXHR2YXIgUyA9IGNyZWF0ZVN0cmVhbSgnZXJyb3JzVG9WYWx1ZXMnLCBtaXhpbik7XG5cdHZhciBQID0gY3JlYXRlUHJvcGVydHkoJ2Vycm9yc1RvVmFsdWVzJywgbWl4aW4pO1xuXG5cdHZhciBkZWZGbiA9IGZ1bmN0aW9uIGRlZkZuKHgpIHtcblx0ICByZXR1cm4geyBjb252ZXJ0OiB0cnVlLCB2YWx1ZTogeCB9O1xuXHR9O1xuXG5cdG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gZXJyb3JzVG9WYWx1ZXMob2JzKSB7XG5cdCAgdmFyIGZuID0gYXJndW1lbnRzLmxlbmd0aCA8PSAxIHx8IGFyZ3VtZW50c1sxXSA9PT0gdW5kZWZpbmVkID8gZGVmRm4gOiBhcmd1bWVudHNbMV07XG5cblx0ICByZXR1cm4gbmV3IChvYnMuX29mU2FtZVR5cGUoUywgUCkpKG9icywgeyBmbjogZm4gfSk7XG5cdH07XG5cbi8qKiovIH0sXG4vKiA3OSAqL1xuLyoqKi8gZnVuY3Rpb24obW9kdWxlLCBleHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKSB7XG5cblx0J3VzZSBzdHJpY3QnO1xuXG5cdHZhciBfcmVxdWlyZSA9IF9fd2VicGFja19yZXF1aXJlX18oMjUpO1xuXG5cdHZhciBjcmVhdGVTdHJlYW0gPSBfcmVxdWlyZS5jcmVhdGVTdHJlYW07XG5cdHZhciBjcmVhdGVQcm9wZXJ0eSA9IF9yZXF1aXJlLmNyZWF0ZVByb3BlcnR5O1xuXG5cdHZhciBtaXhpbiA9IHtcblxuXHQgIF9oYW5kbGVFcnJvcjogZnVuY3Rpb24gX2hhbmRsZUVycm9yKHgpIHtcblx0ICAgIHRoaXMuX2VtaXRFcnJvcih4KTtcblx0ICAgIHRoaXMuX2VtaXRFbmQoKTtcblx0ICB9XG5cblx0fTtcblxuXHR2YXIgUyA9IGNyZWF0ZVN0cmVhbSgnZW5kT25FcnJvcicsIG1peGluKTtcblx0dmFyIFAgPSBjcmVhdGVQcm9wZXJ0eSgnZW5kT25FcnJvcicsIG1peGluKTtcblxuXHRtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGVuZE9uRXJyb3Iob2JzKSB7XG5cdCAgcmV0dXJuIG5ldyAob2JzLl9vZlNhbWVUeXBlKFMsIFApKShvYnMpO1xuXHR9O1xuXG4vKioqLyB9XG4vKioqKioqLyBdKVxufSk7XG47XG5cblxuLyoqKioqKioqKioqKioqKioqXG4gKiogV0VCUEFDSyBGT09URVJcbiAqKiAuL34va2VmaXIvZGlzdC9rZWZpci5qc1xuICoqIG1vZHVsZSBpZCA9IDNcbiAqKiBtb2R1bGUgY2h1bmtzID0gMFxuICoqLyIsImNvbnN0IGxvb3BlciA9IHJlcXVpcmUoJy4vbG9vcGVyLmpzJyk7XG5cbm1vZHVsZS5leHBvcnRzLm5leHQgPSBuZXh0O1xuXG5tb2R1bGUuZXhwb3J0cy5jb25maWcgPSAoY29uZmlnKSA9PiB7XG4gIGxvb3Blci5jb25maWcoY29uZmlnKVxufTtcblxubW9kdWxlLmV4cG9ydHMucGxheSA9ICgpID0+IHtcbiAgbG9vcGVyLnBsYXkoKVxufTtcblxuXG5mdW5jdGlvbiBuZXh0KGlkKSB7XG4gIGxvb3Blci5uZXh0KGlkKTtcbn1cblxuXG5cbi8qKiBXRUJQQUNLIEZPT1RFUiAqKlxuICoqIC4vc2NlbmUtbWFrZXIvcmVuZGVyL2F1ZGlvcGxheWVyLmpzXG4gKiovIiwiJ3VzZSBzdHJpY3QnO1xuY29uc3QgSG93bCA9IHJlcXVpcmUoJ2hvd2xlcicpLkhvd2w7XG5cbnZhciBsb29wcyA9IHt9O1xudmFyIGxvb3A7XG5cbm1vZHVsZS5leHBvcnRzLmNvbmZpZyA9IChjb25maWcpID0+IHtcbiAgbG9vcHMgPSBjb25maWcubWFwKGMgPT4ge1xuICAgIGxldCBhdWRpb0NvbmZpZyA9IHtcbiAgICAgIHNyYzogWydtZWRpYS8nKyBjLmF1ZGlvLnNyYyArJy5tcDMnXSxcbiAgICAgIGh0bWw1OiB0cnVlLFxuICAgICAgdm9sdW1lOiAwXG4gICAgfVxuICAgIHJldHVybiB7XG4gICAgICAnaWQnOiBjLmlkLFxuICAgICAgJ3ZvbCc6IGMuYXVkaW8ubWF4LFxuICAgICAgJ3NvdW5kMSc6IG5ldyBIb3dsKGF1ZGlvQ29uZmlnKSxcbiAgICAgICdzb3VuZDInOiBuZXcgSG93bChhdWRpb0NvbmZpZylcbiAgICB9XG4gIH0pLnJlZHVjZSggKHByZXYsbmV4dCkgPT4gIHtwcmV2W25leHQuaWRdID0gbmV4dDsgcmV0dXJuIHByZXY7fSwge30pXG59XG5cbm1vZHVsZS5leHBvcnRzLm5leHQgPSAoaWQpID0+IHtcbiAgLy8gY29uc29sZS5sb2coJ25leHQnLCBpZClcbiAgbG9vcCA9IGxvb3BzW2lkXTtcbiAgLy8gY29uc29sZS5sb2cobG9vcCk7XG59XG5cbm1vZHVsZS5leHBvcnRzLnBhdXNlID0gKGNvbmZpZykgPT4ge1xuXG59XG5cbm1vZHVsZS5leHBvcnRzLnBsYXkgPSAoY29uZmlnKSA9PiB7XG4gIGxvb3BlcigpO1xufVxuXG5tb2R1bGUuZXhwb3J0cy5zdG9wID0gKGNvbmZpZykgPT4ge1xuXG59XG5cbmZ1bmN0aW9uIGxvb3BlcigpIHtcblxuICAndXNlIHN0cmljdCc7XG4gIC8vIGNvbnNvbGUubG9nKCdsb29wZXInLCBsb29wLnNvdW5kMSlcbiAgbGV0IGZhZGVQZXJjZW50ID0gKGxvb3Auc291bmQxLmR1cmF0aW9uKCkgPiA1KSAgPyAwLjAxIDogMC4wMTU7IC8vIDIlIG9yIDElIGRlcGVuZGluZyBvbiBpZiBzb3VuZCBpcyBvdmVyIDUgc2Vjb25kc1xuICBsZXQgZmFkZXJhdGUgPSAgMSAtIGZhZGVQZXJjZW50O1xuICBsZXQgZHVyYXRpb24gPSBsb29wLnNvdW5kMS5kdXJhdGlvbigpICogMTAwMCAqICgxIC0gZmFkZVBlcmNlbnQpO1xuICBsZXQgdm9sdW1lID0gbG9vcC52b2w7XG4gIC8vIGNvbnNvbGUubG9nKGZhZGVyYXRlLCBmYWRlUGVyY2VudCwgZHVyYXRpb24sIHZvbHVtZSk7XG5cbiAgbG9vcC5zb3VuZDEucGxheSgpO1xuICBsb29wLnNvdW5kMS5mYWRlKDAsdm9sdW1lLCBkdXJhdGlvbiAqIGZhZGVQZXJjZW50KTtcblxuICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICBsb29wLnNvdW5kMS5mYWRlKHZvbHVtZSwwLCBkdXJhdGlvbiAqIGZhZGVQZXJjZW50KTtcbiAgfSwgZHVyYXRpb24gKiBmYWRlcmF0ZSApO1xuXG4gIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgIGxvb3Auc291bmQyLnBsYXkoKTtcbiAgICBsb29wLnNvdW5kMi5mYWRlKDAsdm9sdW1lLCBkdXJhdGlvbiAqIGZhZGVQZXJjZW50KTtcbiAgfSwgZHVyYXRpb24gKiBmYWRlcmF0ZSk7XG5cbiAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgbG9vcC5zb3VuZDIuZmFkZSh2b2x1bWUsMCwgZHVyYXRpb24gKiBmYWRlUGVyY2VudCk7XG4gICAgbG9vcGVyKCk7XG4gIH0sIGR1cmF0aW9uICogMiAqIGZhZGVyYXRlKTtcblxufVxuXG5tb2R1bGUuZXhwb3J0cy5sb29wID0gbG9vcGVyO1xuXG5cblxuLyoqIFdFQlBBQ0sgRk9PVEVSICoqXG4gKiogLi9zY2VuZS1tYWtlci9yZW5kZXIvbG9vcGVyLmpzXG4gKiovIiwiLyohIGhvd2xlci5qcyB2Mi4wLjAtYmV0YTcgfCAoYykgMjAxMy0yMDE2LCBKYW1lcyBTaW1wc29uIG9mIEdvbGRGaXJlIFN0dWRpb3MgfCBNSVQgTGljZW5zZSB8IGhvd2xlcmpzLmNvbSAqL1xuIWZ1bmN0aW9uKCl7XCJ1c2Ugc3RyaWN0XCI7ZnVuY3Rpb24gZSgpe3RyeXtcInVuZGVmaW5lZFwiIT10eXBlb2YgQXVkaW9Db250ZXh0P249bmV3IEF1ZGlvQ29udGV4dDpcInVuZGVmaW5lZFwiIT10eXBlb2Ygd2Via2l0QXVkaW9Db250ZXh0P249bmV3IHdlYmtpdEF1ZGlvQ29udGV4dDpvPSExfWNhdGNoKGUpe289ITF9aWYoIW8paWYoXCJ1bmRlZmluZWRcIiE9dHlwZW9mIEF1ZGlvKXRyeXt2YXIgZD1uZXcgQXVkaW87XCJ1bmRlZmluZWRcIj09dHlwZW9mIGQub25jYW5wbGF5dGhyb3VnaCYmKHU9XCJjYW5wbGF5XCIpfWNhdGNoKGUpe3Q9ITB9ZWxzZSB0PSEwO3RyeXt2YXIgZD1uZXcgQXVkaW87ZC5tdXRlZCYmKHQ9ITApfWNhdGNoKGUpe312YXIgYT0vaVAoaG9uZXxvZHxhZCkvLnRlc3QobmF2aWdhdG9yLnBsYXRmb3JtKSxpPW5hdmlnYXRvci5hcHBWZXJzaW9uLm1hdGNoKC9PUyAoXFxkKylfKFxcZCspXz8oXFxkKyk/LyksXz1pP3BhcnNlSW50KGlbMV0sMTApOm51bGw7aWYoYSYmXyYmOT5fKXt2YXIgcz0vc2FmYXJpLy50ZXN0KHdpbmRvdy5uYXZpZ2F0b3IudXNlckFnZW50LnRvTG93ZXJDYXNlKCkpOyh3aW5kb3cubmF2aWdhdG9yLnN0YW5kYWxvbmUmJiFzfHwhd2luZG93Lm5hdmlnYXRvci5zdGFuZGFsb25lJiYhcykmJihvPSExKX1vJiYocj1cInVuZGVmaW5lZFwiPT10eXBlb2Ygbi5jcmVhdGVHYWluP24uY3JlYXRlR2Fpbk5vZGUoKTpuLmNyZWF0ZUdhaW4oKSxyLmdhaW4udmFsdWU9MSxyLmNvbm5lY3Qobi5kZXN0aW5hdGlvbikpfXZhciBuPW51bGwsbz0hMCx0PSExLHI9bnVsbCx1PVwiY2FucGxheXRocm91Z2hcIjtlKCk7dmFyIGQ9ZnVuY3Rpb24oKXt0aGlzLmluaXQoKX07ZC5wcm90b3R5cGU9e2luaXQ6ZnVuY3Rpb24oKXt2YXIgZT10aGlzfHxhO3JldHVybiBlLl9jb2RlY3M9e30sZS5faG93bHM9W10sZS5fbXV0ZWQ9ITEsZS5fdm9sdW1lPTEsZS5zdGF0ZT1uP24uc3RhdGV8fFwicnVubmluZ1wiOlwicnVubmluZ1wiLGUuYXV0b1N1c3BlbmQ9ITAsZS5fYXV0b1N1c3BlbmQoKSxlLm1vYmlsZUF1dG9FbmFibGU9ITAsZS5ub0F1ZGlvPXQsZS51c2luZ1dlYkF1ZGlvPW8sZS5jdHg9bix0fHxlLl9zZXR1cENvZGVjcygpLGV9LHZvbHVtZTpmdW5jdGlvbihlKXt2YXIgbj10aGlzfHxhO2lmKGU9cGFyc2VGbG9hdChlKSxcInVuZGVmaW5lZFwiIT10eXBlb2YgZSYmZT49MCYmMT49ZSl7bi5fdm9sdW1lPWUsbyYmKHIuZ2Fpbi52YWx1ZT1lKTtmb3IodmFyIHQ9MDt0PG4uX2hvd2xzLmxlbmd0aDt0KyspaWYoIW4uX2hvd2xzW3RdLl93ZWJBdWRpbylmb3IodmFyIHU9bi5faG93bHNbdF0uX2dldFNvdW5kSWRzKCksZD0wO2Q8dS5sZW5ndGg7ZCsrKXt2YXIgaT1uLl9ob3dsc1t0XS5fc291bmRCeUlkKHVbZF0pO2kmJmkuX25vZGUmJihpLl9ub2RlLnZvbHVtZT1pLl92b2x1bWUqZSl9cmV0dXJuIG59cmV0dXJuIG4uX3ZvbHVtZX0sbXV0ZTpmdW5jdGlvbihlKXt2YXIgbj10aGlzfHxhO24uX211dGVkPWUsbyYmKHIuZ2Fpbi52YWx1ZT1lPzA6bi5fdm9sdW1lKTtmb3IodmFyIHQ9MDt0PG4uX2hvd2xzLmxlbmd0aDt0KyspaWYoIW4uX2hvd2xzW3RdLl93ZWJBdWRpbylmb3IodmFyIHU9bi5faG93bHNbdF0uX2dldFNvdW5kSWRzKCksZD0wO2Q8dS5sZW5ndGg7ZCsrKXt2YXIgaT1uLl9ob3dsc1t0XS5fc291bmRCeUlkKHVbZF0pO2kmJmkuX25vZGUmJihpLl9ub2RlLm11dGVkPWU/ITA6aS5fbXV0ZWQpfXJldHVybiBufSx1bmxvYWQ6ZnVuY3Rpb24oKXtmb3IodmFyIG89dGhpc3x8YSx0PW8uX2hvd2xzLmxlbmd0aC0xO3Q+PTA7dC0tKW8uX2hvd2xzW3RdLnVubG9hZCgpO3JldHVybiBvLnVzaW5nV2ViQXVkaW8mJlwidW5kZWZpbmVkXCIhPXR5cGVvZiBuLmNsb3NlJiYoby5jdHg9bnVsbCxuLmNsb3NlKCksZSgpLG8uY3R4PW4pLG99LGNvZGVjczpmdW5jdGlvbihlKXtyZXR1cm4odGhpc3x8YSkuX2NvZGVjc1tlXX0sX3NldHVwQ29kZWNzOmZ1bmN0aW9uKCl7dmFyIGU9dGhpc3x8YSxuPW5ldyBBdWRpbyxvPW4uY2FuUGxheVR5cGUoXCJhdWRpby9tcGVnO1wiKS5yZXBsYWNlKC9ebm8kLyxcIlwiKSx0PS9PUFJcXC8vLnRlc3QobmF2aWdhdG9yLnVzZXJBZ2VudCk7cmV0dXJuIGUuX2NvZGVjcz17bXAzOiEodHx8IW8mJiFuLmNhblBsYXlUeXBlKFwiYXVkaW8vbXAzO1wiKS5yZXBsYWNlKC9ebm8kLyxcIlwiKSksbXBlZzohIW8sb3B1czohIW4uY2FuUGxheVR5cGUoJ2F1ZGlvL29nZzsgY29kZWNzPVwib3B1c1wiJykucmVwbGFjZSgvXm5vJC8sXCJcIiksb2dnOiEhbi5jYW5QbGF5VHlwZSgnYXVkaW8vb2dnOyBjb2RlY3M9XCJ2b3JiaXNcIicpLnJlcGxhY2UoL15ubyQvLFwiXCIpLG9nYTohIW4uY2FuUGxheVR5cGUoJ2F1ZGlvL29nZzsgY29kZWNzPVwidm9yYmlzXCInKS5yZXBsYWNlKC9ebm8kLyxcIlwiKSx3YXY6ISFuLmNhblBsYXlUeXBlKCdhdWRpby93YXY7IGNvZGVjcz1cIjFcIicpLnJlcGxhY2UoL15ubyQvLFwiXCIpLGFhYzohIW4uY2FuUGxheVR5cGUoXCJhdWRpby9hYWM7XCIpLnJlcGxhY2UoL15ubyQvLFwiXCIpLG00YTohIShuLmNhblBsYXlUeXBlKFwiYXVkaW8veC1tNGE7XCIpfHxuLmNhblBsYXlUeXBlKFwiYXVkaW8vbTRhO1wiKXx8bi5jYW5QbGF5VHlwZShcImF1ZGlvL2FhYztcIikpLnJlcGxhY2UoL15ubyQvLFwiXCIpLG1wNDohIShuLmNhblBsYXlUeXBlKFwiYXVkaW8veC1tcDQ7XCIpfHxuLmNhblBsYXlUeXBlKFwiYXVkaW8vbXA0O1wiKXx8bi5jYW5QbGF5VHlwZShcImF1ZGlvL2FhYztcIikpLnJlcGxhY2UoL15ubyQvLFwiXCIpLHdlYmE6ISFuLmNhblBsYXlUeXBlKCdhdWRpby93ZWJtOyBjb2RlY3M9XCJ2b3JiaXNcIicpLnJlcGxhY2UoL15ubyQvLFwiXCIpLHdlYm06ISFuLmNhblBsYXlUeXBlKCdhdWRpby93ZWJtOyBjb2RlY3M9XCJ2b3JiaXNcIicpLnJlcGxhY2UoL15ubyQvLFwiXCIpLGRvbGJ5OiEhbi5jYW5QbGF5VHlwZSgnYXVkaW8vbXA0OyBjb2RlY3M9XCJlYy0zXCInKS5yZXBsYWNlKC9ebm8kLyxcIlwiKX0sZX0sX2VuYWJsZU1vYmlsZUF1ZGlvOmZ1bmN0aW9uKCl7dmFyIGU9dGhpc3x8YSxvPS9pUGhvbmV8aVBhZHxpUG9kfEFuZHJvaWR8QmxhY2tCZXJyeXxCQjEwfFNpbGsvaS50ZXN0KG5hdmlnYXRvci51c2VyQWdlbnQpLHQ9ISEoXCJvbnRvdWNoZW5kXCJpbiB3aW5kb3d8fG5hdmlnYXRvci5tYXhUb3VjaFBvaW50cz4wfHxuYXZpZ2F0b3IubXNNYXhUb3VjaFBvaW50cz4wKTtpZighbnx8IWUuX21vYmlsZUVuYWJsZWQmJm8mJnQpe2UuX21vYmlsZUVuYWJsZWQ9ITE7dmFyIHI9ZnVuY3Rpb24oKXt2YXIgbz1uLmNyZWF0ZUJ1ZmZlcigxLDEsMjIwNTApLHQ9bi5jcmVhdGVCdWZmZXJTb3VyY2UoKTt0LmJ1ZmZlcj1vLHQuY29ubmVjdChuLmRlc3RpbmF0aW9uKSxcInVuZGVmaW5lZFwiPT10eXBlb2YgdC5zdGFydD90Lm5vdGVPbigwKTp0LnN0YXJ0KDApLHQub25lbmRlZD1mdW5jdGlvbigpe3QuZGlzY29ubmVjdCgwKSxlLl9tb2JpbGVFbmFibGVkPSEwLGUubW9iaWxlQXV0b0VuYWJsZT0hMSxkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKFwidG91Y2hlbmRcIixyLCEwKX19O3JldHVybiBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFwidG91Y2hlbmRcIixyLCEwKSxlfX0sX2F1dG9TdXNwZW5kOmZ1bmN0aW9uKCl7dmFyIGU9dGhpcztpZihlLmF1dG9TdXNwZW5kJiZuJiZcInVuZGVmaW5lZFwiIT10eXBlb2Ygbi5zdXNwZW5kJiZvKXtmb3IodmFyIHQ9MDt0PGUuX2hvd2xzLmxlbmd0aDt0KyspaWYoZS5faG93bHNbdF0uX3dlYkF1ZGlvKWZvcih2YXIgcj0wO3I8ZS5faG93bHNbdF0uX3NvdW5kcy5sZW5ndGg7cisrKWlmKCFlLl9ob3dsc1t0XS5fc291bmRzW3JdLl9wYXVzZWQpcmV0dXJuIGU7cmV0dXJuIGUuX3N1c3BlbmRUaW1lcj1zZXRUaW1lb3V0KGZ1bmN0aW9uKCl7ZS5hdXRvU3VzcGVuZCYmKGUuX3N1c3BlbmRUaW1lcj1udWxsLGUuc3RhdGU9XCJzdXNwZW5kaW5nXCIsbi5zdXNwZW5kKCkudGhlbihmdW5jdGlvbigpe2Uuc3RhdGU9XCJzdXNwZW5kZWRcIixlLl9yZXN1bWVBZnRlclN1c3BlbmQmJihkZWxldGUgZS5fcmVzdW1lQWZ0ZXJTdXNwZW5kLGUuX2F1dG9SZXN1bWUoKSl9KSl9LDNlNCksZX19LF9hdXRvUmVzdW1lOmZ1bmN0aW9uKCl7dmFyIGU9dGhpcztpZihuJiZcInVuZGVmaW5lZFwiIT10eXBlb2Ygbi5yZXN1bWUmJm8pcmV0dXJuXCJydW5uaW5nXCI9PT1lLnN0YXRlJiZlLl9zdXNwZW5kVGltZXI/KGNsZWFyVGltZW91dChlLl9zdXNwZW5kVGltZXIpLGUuX3N1c3BlbmRUaW1lcj1udWxsKTpcInN1c3BlbmRlZFwiPT09ZS5zdGF0ZT8oZS5zdGF0ZT1cInJlc3VtaW5nXCIsbi5yZXN1bWUoKS50aGVuKGZ1bmN0aW9uKCl7ZS5zdGF0ZT1cInJ1bm5pbmdcIn0pLGUuX3N1c3BlbmRUaW1lciYmKGNsZWFyVGltZW91dChlLl9zdXNwZW5kVGltZXIpLGUuX3N1c3BlbmRUaW1lcj1udWxsKSk6XCJzdXNwZW5kaW5nXCI9PT1lLnN0YXRlJiYoZS5fcmVzdW1lQWZ0ZXJTdXNwZW5kPSEwKSxlfX07dmFyIGE9bmV3IGQsaT1mdW5jdGlvbihlKXt2YXIgbj10aGlzO3JldHVybiBlLnNyYyYmMCE9PWUuc3JjLmxlbmd0aD92b2lkIG4uaW5pdChlKTp2b2lkIGNvbnNvbGUuZXJyb3IoXCJBbiBhcnJheSBvZiBzb3VyY2UgZmlsZXMgbXVzdCBiZSBwYXNzZWQgd2l0aCBhbnkgbmV3IEhvd2wuXCIpfTtpLnByb3RvdHlwZT17aW5pdDpmdW5jdGlvbihlKXt2YXIgdD10aGlzO3JldHVybiB0Ll9hdXRvcGxheT1lLmF1dG9wbGF5fHwhMSx0Ll9mb3JtYXQ9XCJzdHJpbmdcIiE9dHlwZW9mIGUuZm9ybWF0P2UuZm9ybWF0OltlLmZvcm1hdF0sdC5faHRtbDU9ZS5odG1sNXx8ITEsdC5fbXV0ZWQ9ZS5tdXRlfHwhMSx0Ll9sb29wPWUubG9vcHx8ITEsdC5fcG9vbD1lLnBvb2x8fDUsdC5fcHJlbG9hZD1cImJvb2xlYW5cIj09dHlwZW9mIGUucHJlbG9hZD9lLnByZWxvYWQ6ITAsdC5fcmF0ZT1lLnJhdGV8fDEsdC5fc3ByaXRlPWUuc3ByaXRlfHx7fSx0Ll9zcmM9XCJzdHJpbmdcIiE9dHlwZW9mIGUuc3JjP2Uuc3JjOltlLnNyY10sdC5fdm9sdW1lPXZvaWQgMCE9PWUudm9sdW1lP2Uudm9sdW1lOjEsdC5fZHVyYXRpb249MCx0Ll9sb2FkZWQ9ITEsdC5fc291bmRzPVtdLHQuX2VuZFRpbWVycz17fSx0Ll9xdWV1ZT1bXSx0Ll9vbmVuZD1lLm9uZW5kP1t7Zm46ZS5vbmVuZH1dOltdLHQuX29uZmFkZT1lLm9uZmFkZT9be2ZuOmUub25mYWRlfV06W10sdC5fb25sb2FkPWUub25sb2FkP1t7Zm46ZS5vbmxvYWR9XTpbXSx0Ll9vbmxvYWRlcnJvcj1lLm9ubG9hZGVycm9yP1t7Zm46ZS5vbmxvYWRlcnJvcn1dOltdLHQuX29ucGF1c2U9ZS5vbnBhdXNlP1t7Zm46ZS5vbnBhdXNlfV06W10sdC5fb25wbGF5PWUub25wbGF5P1t7Zm46ZS5vbnBsYXl9XTpbXSx0Ll9vbnN0b3A9ZS5vbnN0b3A/W3tmbjplLm9uc3RvcH1dOltdLHQuX29ubXV0ZT1lLm9ubXV0ZT9be2ZuOmUub25tdXRlfV06W10sdC5fb252b2x1bWU9ZS5vbnZvbHVtZT9be2ZuOmUub252b2x1bWV9XTpbXSx0Ll9vbnJhdGU9ZS5vbnJhdGU/W3tmbjplLm9ucmF0ZX1dOltdLHQuX29uc2Vlaz1lLm9uc2Vlaz9be2ZuOmUub25zZWVrfV06W10sdC5fd2ViQXVkaW89byYmIXQuX2h0bWw1LFwidW5kZWZpbmVkXCIhPXR5cGVvZiBuJiZuJiZhLm1vYmlsZUF1dG9FbmFibGUmJmEuX2VuYWJsZU1vYmlsZUF1ZGlvKCksYS5faG93bHMucHVzaCh0KSx0Ll9wcmVsb2FkJiZ0LmxvYWQoKSx0fSxsb2FkOmZ1bmN0aW9uKCl7dmFyIGU9dGhpcyxuPW51bGw7aWYodClyZXR1cm4gdm9pZCBlLl9lbWl0KFwibG9hZGVycm9yXCIsbnVsbCxcIk5vIGF1ZGlvIHN1cHBvcnQuXCIpO1wic3RyaW5nXCI9PXR5cGVvZiBlLl9zcmMmJihlLl9zcmM9W2UuX3NyY10pO2Zvcih2YXIgbz0wO288ZS5fc3JjLmxlbmd0aDtvKyspe3ZhciByLHU7aWYoZS5fZm9ybWF0JiZlLl9mb3JtYXRbb10/cj1lLl9mb3JtYXRbb106KHU9ZS5fc3JjW29dLHI9L15kYXRhOmF1ZGlvXFwvKFteOyxdKyk7L2kuZXhlYyh1KSxyfHwocj0vXFwuKFteLl0rKSQvLmV4ZWModS5zcGxpdChcIj9cIiwxKVswXSkpLHImJihyPXJbMV0udG9Mb3dlckNhc2UoKSkpLGEuY29kZWNzKHIpKXtuPWUuX3NyY1tvXTticmVha319cmV0dXJuIG4/KGUuX3NyYz1uLFwiaHR0cHM6XCI9PT13aW5kb3cubG9jYXRpb24ucHJvdG9jb2wmJlwiaHR0cDpcIj09PW4uc2xpY2UoMCw1KSYmKGUuX2h0bWw1PSEwLGUuX3dlYkF1ZGlvPSExKSxuZXcgXyhlKSxlLl93ZWJBdWRpbyYmbChlKSxlKTp2b2lkIGUuX2VtaXQoXCJsb2FkZXJyb3JcIixudWxsLFwiTm8gY29kZWMgc3VwcG9ydCBmb3Igc2VsZWN0ZWQgYXVkaW8gc291cmNlcy5cIil9LHBsYXk6ZnVuY3Rpb24oZSl7dmFyIG89dGhpcyx0PWFyZ3VtZW50cyxyPW51bGw7aWYoXCJudW1iZXJcIj09dHlwZW9mIGUpcj1lLGU9bnVsbDtlbHNlIGlmKFwidW5kZWZpbmVkXCI9PXR5cGVvZiBlKXtlPVwiX19kZWZhdWx0XCI7Zm9yKHZhciBkPTAsaT0wO2k8by5fc291bmRzLmxlbmd0aDtpKyspby5fc291bmRzW2ldLl9wYXVzZWQmJiFvLl9zb3VuZHNbaV0uX2VuZGVkJiYoZCsrLHI9by5fc291bmRzW2ldLl9pZCk7MT09PWQ/ZT1udWxsOnI9bnVsbH12YXIgXz1yP28uX3NvdW5kQnlJZChyKTpvLl9pbmFjdGl2ZVNvdW5kKCk7aWYoIV8pcmV0dXJuIG51bGw7aWYociYmIWUmJihlPV8uX3Nwcml0ZXx8XCJfX2RlZmF1bHRcIiksIW8uX2xvYWRlZCYmIW8uX3Nwcml0ZVtlXSlyZXR1cm4gby5fcXVldWUucHVzaCh7ZXZlbnQ6XCJwbGF5XCIsYWN0aW9uOmZ1bmN0aW9uKCl7by5wbGF5KG8uX3NvdW5kQnlJZChfLl9pZCk/Xy5faWQ6dm9pZCAwKX19KSxfLl9pZDtpZihyJiYhXy5fcGF1c2VkKXJldHVybiBfLl9pZDtvLl93ZWJBdWRpbyYmYS5fYXV0b1Jlc3VtZSgpO3ZhciBzPV8uX3NlZWs+MD9fLl9zZWVrOm8uX3Nwcml0ZVtlXVswXS8xZTMsbD0oby5fc3ByaXRlW2VdWzBdK28uX3Nwcml0ZVtlXVsxXSkvMWUzLXMsZj0xZTMqbC9NYXRoLmFicyhfLl9yYXRlKTtmIT09MS8wJiYoby5fZW5kVGltZXJzW18uX2lkXT1zZXRUaW1lb3V0KG8uX2VuZGVkLmJpbmQobyxfKSxmKSksXy5fcGF1c2VkPSExLF8uX2VuZGVkPSExLF8uX3Nwcml0ZT1lLF8uX3NlZWs9cyxfLl9zdGFydD1vLl9zcHJpdGVbZV1bMF0vMWUzLF8uX3N0b3A9KG8uX3Nwcml0ZVtlXVswXStvLl9zcHJpdGVbZV1bMV0pLzFlMyxfLl9sb29wPSEoIV8uX2xvb3AmJiFvLl9zcHJpdGVbZV1bMl0pO3ZhciBjPV8uX25vZGU7aWYoby5fd2ViQXVkaW8pe3ZhciBwPWZ1bmN0aW9uKCl7by5fcmVmcmVzaEJ1ZmZlcihfKTt2YXIgZT1fLl9tdXRlZHx8by5fbXV0ZWQ/MDpfLl92b2x1bWUqYS52b2x1bWUoKTtjLmdhaW4uc2V0VmFsdWVBdFRpbWUoZSxuLmN1cnJlbnRUaW1lKSxfLl9wbGF5U3RhcnQ9bi5jdXJyZW50VGltZSxcInVuZGVmaW5lZFwiPT10eXBlb2YgYy5idWZmZXJTb3VyY2Uuc3RhcnQ/Xy5fbG9vcD9jLmJ1ZmZlclNvdXJjZS5ub3RlR3JhaW5PbigwLHMsODY0MDApOmMuYnVmZmVyU291cmNlLm5vdGVHcmFpbk9uKDAscyxsKTpfLl9sb29wP2MuYnVmZmVyU291cmNlLnN0YXJ0KDAscyw4NjQwMCk6Yy5idWZmZXJTb3VyY2Uuc3RhcnQoMCxzLGwpLG8uX2VuZFRpbWVyc1tfLl9pZF18fGY9PT0xLzB8fChvLl9lbmRUaW1lcnNbXy5faWRdPXNldFRpbWVvdXQoby5fZW5kZWQuYmluZChvLF8pLGYpKSx0WzFdfHxzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7by5fZW1pdChcInBsYXlcIixfLl9pZCl9LDApfTtvLl9sb2FkZWQ/cCgpOihvLm9uY2UoXCJsb2FkXCIscCxfLl9pZCksby5fY2xlYXJUaW1lcihfLl9pZCkpfWVsc2V7dmFyIG09ZnVuY3Rpb24oKXtjLmN1cnJlbnRUaW1lPXMsYy5tdXRlZD1fLl9tdXRlZHx8by5fbXV0ZWR8fGEuX211dGVkfHxjLm11dGVkLGMudm9sdW1lPV8uX3ZvbHVtZSphLnZvbHVtZSgpLGMucGxheWJhY2tSYXRlPV8uX3JhdGUsc2V0VGltZW91dChmdW5jdGlvbigpe2MucGxheSgpLHRbMV18fG8uX2VtaXQoXCJwbGF5XCIsXy5faWQpfSwwKX07aWYoND09PWMucmVhZHlTdGF0ZXx8IWMucmVhZHlTdGF0ZSYmbmF2aWdhdG9yLmlzQ29jb29uSlMpbSgpO2Vsc2V7dmFyIHY9ZnVuY3Rpb24oKXtmIT09MS8wJiYoby5fZW5kVGltZXJzW18uX2lkXT1zZXRUaW1lb3V0KG8uX2VuZGVkLmJpbmQobyxfKSxmKSksbSgpLGMucmVtb3ZlRXZlbnRMaXN0ZW5lcih1LHYsITEpfTtjLmFkZEV2ZW50TGlzdGVuZXIodSx2LCExKSxvLl9jbGVhclRpbWVyKF8uX2lkKX19cmV0dXJuIF8uX2lkfSxwYXVzZTpmdW5jdGlvbihlKXt2YXIgbj10aGlzO2lmKCFuLl9sb2FkZWQpcmV0dXJuIG4uX3F1ZXVlLnB1c2goe2V2ZW50OlwicGF1c2VcIixhY3Rpb246ZnVuY3Rpb24oKXtuLnBhdXNlKGUpfX0pLG47Zm9yKHZhciBvPW4uX2dldFNvdW5kSWRzKGUpLHQ9MDt0PG8ubGVuZ3RoO3QrKyl7bi5fY2xlYXJUaW1lcihvW3RdKTt2YXIgcj1uLl9zb3VuZEJ5SWQob1t0XSk7aWYociYmIXIuX3BhdXNlZCl7aWYoci5fc2Vlaz1uLnNlZWsob1t0XSksci5fcGF1c2VkPSEwLG4uX3N0b3BGYWRlKG9bdF0pLHIuX25vZGUpaWYobi5fd2ViQXVkaW8pe2lmKCFyLl9ub2RlLmJ1ZmZlclNvdXJjZSlyZXR1cm4gbjtcInVuZGVmaW5lZFwiPT10eXBlb2Ygci5fbm9kZS5idWZmZXJTb3VyY2Uuc3RvcD9yLl9ub2RlLmJ1ZmZlclNvdXJjZS5ub3RlT2ZmKDApOnIuX25vZGUuYnVmZmVyU291cmNlLnN0b3AoMCksci5fbm9kZS5idWZmZXJTb3VyY2U9bnVsbH1lbHNlIGlzTmFOKHIuX25vZGUuZHVyYXRpb24pJiZyLl9ub2RlLmR1cmF0aW9uIT09MS8wfHxyLl9ub2RlLnBhdXNlKCk7YXJndW1lbnRzWzFdfHxuLl9lbWl0KFwicGF1c2VcIixyLl9pZCl9fXJldHVybiBufSxzdG9wOmZ1bmN0aW9uKGUpe3ZhciBuPXRoaXM7aWYoIW4uX2xvYWRlZClyZXR1cm5cInVuZGVmaW5lZFwiIT10eXBlb2Ygbi5fc291bmRzWzBdLl9zcHJpdGUmJm4uX3F1ZXVlLnB1c2goe2V2ZW50Olwic3RvcFwiLGFjdGlvbjpmdW5jdGlvbigpe24uc3RvcChlKX19KSxuO2Zvcih2YXIgbz1uLl9nZXRTb3VuZElkcyhlKSx0PTA7dDxvLmxlbmd0aDt0Kyspe24uX2NsZWFyVGltZXIob1t0XSk7dmFyIHI9bi5fc291bmRCeUlkKG9bdF0pO2lmKHImJiFyLl9wYXVzZWQpe2lmKHIuX3NlZWs9ci5fc3RhcnR8fDAsci5fcGF1c2VkPSEwLHIuX2VuZGVkPSEwLG4uX3N0b3BGYWRlKG9bdF0pLHIuX25vZGUpaWYobi5fd2ViQXVkaW8pe2lmKCFyLl9ub2RlLmJ1ZmZlclNvdXJjZSlyZXR1cm4gbjtcInVuZGVmaW5lZFwiPT10eXBlb2Ygci5fbm9kZS5idWZmZXJTb3VyY2Uuc3RvcD9yLl9ub2RlLmJ1ZmZlclNvdXJjZS5ub3RlT2ZmKDApOnIuX25vZGUuYnVmZmVyU291cmNlLnN0b3AoMCksci5fbm9kZS5idWZmZXJTb3VyY2U9bnVsbH1lbHNlIGlzTmFOKHIuX25vZGUuZHVyYXRpb24pJiZyLl9ub2RlLmR1cmF0aW9uIT09MS8wfHwoci5fbm9kZS5wYXVzZSgpLHIuX25vZGUuY3VycmVudFRpbWU9ci5fc3RhcnR8fDApO24uX2VtaXQoXCJzdG9wXCIsci5faWQpfX1yZXR1cm4gbn0sbXV0ZTpmdW5jdGlvbihlLG8pe3ZhciB0PXRoaXM7aWYoIXQuX2xvYWRlZClyZXR1cm4gdC5fcXVldWUucHVzaCh7ZXZlbnQ6XCJtdXRlXCIsYWN0aW9uOmZ1bmN0aW9uKCl7dC5tdXRlKGUsbyl9fSksdDtpZihcInVuZGVmaW5lZFwiPT10eXBlb2Ygbyl7aWYoXCJib29sZWFuXCIhPXR5cGVvZiBlKXJldHVybiB0Ll9tdXRlZDt0Ll9tdXRlZD1lfWZvcih2YXIgcj10Ll9nZXRTb3VuZElkcyhvKSx1PTA7dTxyLmxlbmd0aDt1Kyspe3ZhciBkPXQuX3NvdW5kQnlJZChyW3VdKTtkJiYoZC5fbXV0ZWQ9ZSx0Ll93ZWJBdWRpbyYmZC5fbm9kZT9kLl9ub2RlLmdhaW4uc2V0VmFsdWVBdFRpbWUoZT8wOmQuX3ZvbHVtZSphLnZvbHVtZSgpLG4uY3VycmVudFRpbWUpOmQuX25vZGUmJihkLl9ub2RlLm11dGVkPWEuX211dGVkPyEwOmUpLHQuX2VtaXQoXCJtdXRlXCIsZC5faWQpKX1yZXR1cm4gdH0sdm9sdW1lOmZ1bmN0aW9uKCl7dmFyIGUsbyx0PXRoaXMscj1hcmd1bWVudHM7aWYoMD09PXIubGVuZ3RoKXJldHVybiB0Ll92b2x1bWU7aWYoMT09PXIubGVuZ3RoKXt2YXIgdT10Ll9nZXRTb3VuZElkcygpLGQ9dS5pbmRleE9mKHJbMF0pO2Q+PTA/bz1wYXJzZUludChyWzBdLDEwKTplPXBhcnNlRmxvYXQoclswXSl9ZWxzZSByLmxlbmd0aD49MiYmKGU9cGFyc2VGbG9hdChyWzBdKSxvPXBhcnNlSW50KHJbMV0sMTApKTt2YXIgaTtpZighKFwidW5kZWZpbmVkXCIhPXR5cGVvZiBlJiZlPj0wJiYxPj1lKSlyZXR1cm4gaT1vP3QuX3NvdW5kQnlJZChvKTp0Ll9zb3VuZHNbMF0saT9pLl92b2x1bWU6MDtpZighdC5fbG9hZGVkKXJldHVybiB0Ll9xdWV1ZS5wdXNoKHtldmVudDpcInZvbHVtZVwiLGFjdGlvbjpmdW5jdGlvbigpe3Qudm9sdW1lLmFwcGx5KHQscil9fSksdDtcInVuZGVmaW5lZFwiPT10eXBlb2YgbyYmKHQuX3ZvbHVtZT1lKSxvPXQuX2dldFNvdW5kSWRzKG8pO2Zvcih2YXIgXz0wO188by5sZW5ndGg7XysrKWk9dC5fc291bmRCeUlkKG9bX10pLGkmJihpLl92b2x1bWU9ZSxyWzJdfHx0Ll9zdG9wRmFkZShvW19dKSx0Ll93ZWJBdWRpbyYmaS5fbm9kZSYmIWkuX211dGVkP2kuX25vZGUuZ2Fpbi5zZXRWYWx1ZUF0VGltZShlKmEudm9sdW1lKCksbi5jdXJyZW50VGltZSk6aS5fbm9kZSYmIWkuX211dGVkJiYoaS5fbm9kZS52b2x1bWU9ZSphLnZvbHVtZSgpKSx0Ll9lbWl0KFwidm9sdW1lXCIsaS5faWQpKTtyZXR1cm4gdH0sZmFkZTpmdW5jdGlvbihlLG8sdCxyKXt2YXIgdT10aGlzO2lmKCF1Ll9sb2FkZWQpcmV0dXJuIHUuX3F1ZXVlLnB1c2goe2V2ZW50OlwiZmFkZVwiLGFjdGlvbjpmdW5jdGlvbigpe3UuZmFkZShlLG8sdCxyKX19KSx1O3Uudm9sdW1lKGUscik7Zm9yKHZhciBkPXUuX2dldFNvdW5kSWRzKHIpLGE9MDthPGQubGVuZ3RoO2ErKyl7dmFyIGk9dS5fc291bmRCeUlkKGRbYV0pO2lmKGkpaWYocnx8dS5fc3RvcEZhZGUoZFthXSksdS5fd2ViQXVkaW8mJiFpLl9tdXRlZCl7dmFyIF89bi5jdXJyZW50VGltZSxzPV8rdC8xZTM7aS5fdm9sdW1lPWUsaS5fbm9kZS5nYWluLnNldFZhbHVlQXRUaW1lKGUsXyksaS5fbm9kZS5nYWluLmxpbmVhclJhbXBUb1ZhbHVlQXRUaW1lKG8scyksaS5fdGltZW91dD1zZXRUaW1lb3V0KGZ1bmN0aW9uKGUsdCl7ZGVsZXRlIHQuX3RpbWVvdXQsc2V0VGltZW91dChmdW5jdGlvbigpe3QuX3ZvbHVtZT1vLHUuX2VtaXQoXCJmYWRlXCIsZSl9LHMtbi5jdXJyZW50VGltZT4wP01hdGguY2VpbCgxZTMqKHMtbi5jdXJyZW50VGltZSkpOjApfS5iaW5kKHUsZFthXSxpKSx0KX1lbHNle3ZhciBsPU1hdGguYWJzKGUtbyksZj1lPm8/XCJvdXRcIjpcImluXCIsYz1sLy4wMSxwPXQvYzshZnVuY3Rpb24oKXt2YXIgbj1lO2kuX2ludGVydmFsPXNldEludGVydmFsKGZ1bmN0aW9uKGUsdCl7bis9XCJpblwiPT09Zj8uMDE6LS4wMSxuPU1hdGgubWF4KDAsbiksbj1NYXRoLm1pbigxLG4pLG49TWF0aC5yb3VuZCgxMDAqbikvMTAwLHUudm9sdW1lKG4sZSwhMCksbj09PW8mJihjbGVhckludGVydmFsKHQuX2ludGVydmFsKSxkZWxldGUgdC5faW50ZXJ2YWwsdS5fZW1pdChcImZhZGVcIixlKSl9LmJpbmQodSxkW2FdLGkpLHApfSgpfX1yZXR1cm4gdX0sX3N0b3BGYWRlOmZ1bmN0aW9uKGUpe3ZhciBvPXRoaXMsdD1vLl9zb3VuZEJ5SWQoZSk7cmV0dXJuIHQuX2ludGVydmFsPyhjbGVhckludGVydmFsKHQuX2ludGVydmFsKSxkZWxldGUgdC5faW50ZXJ2YWwsby5fZW1pdChcImZhZGVcIixlKSk6dC5fdGltZW91dCYmKGNsZWFyVGltZW91dCh0Ll90aW1lb3V0KSxkZWxldGUgdC5fdGltZW91dCx0Ll9ub2RlLmdhaW4uY2FuY2VsU2NoZWR1bGVkVmFsdWVzKG4uY3VycmVudFRpbWUpLG8uX2VtaXQoXCJmYWRlXCIsZSkpLG99LGxvb3A6ZnVuY3Rpb24oKXt2YXIgZSxuLG8sdD10aGlzLHI9YXJndW1lbnRzO2lmKDA9PT1yLmxlbmd0aClyZXR1cm4gdC5fbG9vcDtpZigxPT09ci5sZW5ndGgpe2lmKFwiYm9vbGVhblwiIT10eXBlb2YgclswXSlyZXR1cm4gbz10Ll9zb3VuZEJ5SWQocGFyc2VJbnQoclswXSwxMCkpLG8/by5fbG9vcDohMTtlPXJbMF0sdC5fbG9vcD1lfWVsc2UgMj09PXIubGVuZ3RoJiYoZT1yWzBdLG49cGFyc2VJbnQoclsxXSwxMCkpO2Zvcih2YXIgdT10Ll9nZXRTb3VuZElkcyhuKSxkPTA7ZDx1Lmxlbmd0aDtkKyspbz10Ll9zb3VuZEJ5SWQodVtkXSksbyYmKG8uX2xvb3A9ZSx0Ll93ZWJBdWRpbyYmby5fbm9kZSYmby5fbm9kZS5idWZmZXJTb3VyY2UmJihvLl9ub2RlLmJ1ZmZlclNvdXJjZS5sb29wPWUpKTtyZXR1cm4gdH0scmF0ZTpmdW5jdGlvbigpe3ZhciBlLG4sbz10aGlzLHQ9YXJndW1lbnRzO2lmKDA9PT10Lmxlbmd0aCluPW8uX3NvdW5kc1swXS5faWQ7ZWxzZSBpZigxPT09dC5sZW5ndGgpe3ZhciByPW8uX2dldFNvdW5kSWRzKCksdT1yLmluZGV4T2YodFswXSk7dT49MD9uPXBhcnNlSW50KHRbMF0sMTApOmU9cGFyc2VGbG9hdCh0WzBdKX1lbHNlIDI9PT10Lmxlbmd0aCYmKGU9cGFyc2VGbG9hdCh0WzBdKSxuPXBhcnNlSW50KHRbMV0sMTApKTt2YXIgZDtpZihcIm51bWJlclwiIT10eXBlb2YgZSlyZXR1cm4gZD1vLl9zb3VuZEJ5SWQobiksZD9kLl9yYXRlOm8uX3JhdGU7aWYoIW8uX2xvYWRlZClyZXR1cm4gby5fcXVldWUucHVzaCh7ZXZlbnQ6XCJyYXRlXCIsYWN0aW9uOmZ1bmN0aW9uKCl7by5yYXRlLmFwcGx5KG8sdCl9fSksbztcInVuZGVmaW5lZFwiPT10eXBlb2YgbiYmKG8uX3JhdGU9ZSksbj1vLl9nZXRTb3VuZElkcyhuKTtmb3IodmFyIGE9MDthPG4ubGVuZ3RoO2ErKylpZihkPW8uX3NvdW5kQnlJZChuW2FdKSl7ZC5fcmF0ZT1lLG8uX3dlYkF1ZGlvJiZkLl9ub2RlJiZkLl9ub2RlLmJ1ZmZlclNvdXJjZT9kLl9ub2RlLmJ1ZmZlclNvdXJjZS5wbGF5YmFja1JhdGUudmFsdWU9ZTpkLl9ub2RlJiYoZC5fbm9kZS5wbGF5YmFja1JhdGU9ZSk7dmFyIGk9by5zZWVrKG5bYV0pLF89KG8uX3Nwcml0ZVtkLl9zcHJpdGVdWzBdK28uX3Nwcml0ZVtkLl9zcHJpdGVdWzFdKS8xZTMtaSxzPTFlMypfL01hdGguYWJzKGQuX3JhdGUpO28uX2NsZWFyVGltZXIoblthXSksby5fZW5kVGltZXJzW25bYV1dPXNldFRpbWVvdXQoby5fZW5kZWQuYmluZChvLGQpLHMpLG8uX2VtaXQoXCJyYXRlXCIsZC5faWQpfXJldHVybiBvfSxzZWVrOmZ1bmN0aW9uKCl7dmFyIGUsbyx0PXRoaXMscj1hcmd1bWVudHM7aWYoMD09PXIubGVuZ3RoKW89dC5fc291bmRzWzBdLl9pZDtlbHNlIGlmKDE9PT1yLmxlbmd0aCl7dmFyIHU9dC5fZ2V0U291bmRJZHMoKSxkPXUuaW5kZXhPZihyWzBdKTtkPj0wP289cGFyc2VJbnQoclswXSwxMCk6KG89dC5fc291bmRzWzBdLl9pZCxlPXBhcnNlRmxvYXQoclswXSkpfWVsc2UgMj09PXIubGVuZ3RoJiYoZT1wYXJzZUZsb2F0KHJbMF0pLG89cGFyc2VJbnQoclsxXSwxMCkpO2lmKFwidW5kZWZpbmVkXCI9PXR5cGVvZiBvKXJldHVybiB0O2lmKCF0Ll9sb2FkZWQpcmV0dXJuIHQuX3F1ZXVlLnB1c2goe2V2ZW50Olwic2Vla1wiLGFjdGlvbjpmdW5jdGlvbigpe3Quc2Vlay5hcHBseSh0LHIpfX0pLHQ7dmFyIGE9dC5fc291bmRCeUlkKG8pO2lmKGEpe2lmKCEoZT49MCkpcmV0dXJuIHQuX3dlYkF1ZGlvP2EuX3NlZWsrKHQucGxheWluZyhvKT9uLmN1cnJlbnRUaW1lLWEuX3BsYXlTdGFydDowKTphLl9ub2RlLmN1cnJlbnRUaW1lO3ZhciBpPXQucGxheWluZyhvKTtpJiZ0LnBhdXNlKG8sITApLGEuX3NlZWs9ZSx0Ll9jbGVhclRpbWVyKG8pLGkmJnQucGxheShvLCEwKSx0Ll9lbWl0KFwic2Vla1wiLG8pfXJldHVybiB0fSxwbGF5aW5nOmZ1bmN0aW9uKGUpe3ZhciBuPXRoaXMsbz1uLl9zb3VuZEJ5SWQoZSl8fG4uX3NvdW5kc1swXTtyZXR1cm4gbz8hby5fcGF1c2VkOiExfSxkdXJhdGlvbjpmdW5jdGlvbigpe3JldHVybiB0aGlzLl9kdXJhdGlvbn0sdW5sb2FkOmZ1bmN0aW9uKCl7Zm9yKHZhciBlPXRoaXMsbj1lLl9zb3VuZHMsbz0wO288bi5sZW5ndGg7bysrKXtuW29dLl9wYXVzZWR8fChlLnN0b3AobltvXS5faWQpLGUuX2VtaXQoXCJlbmRcIixuW29dLl9pZCkpLGUuX3dlYkF1ZGlvfHwobltvXS5fbm9kZS5zcmM9XCJcIixuW29dLl9ub2RlLnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJlcnJvclwiLG5bb10uX2Vycm9yRm4sITEpLG5bb10uX25vZGUucmVtb3ZlRXZlbnRMaXN0ZW5lcih1LG5bb10uX2xvYWRGbiwhMSkpLGRlbGV0ZSBuW29dLl9ub2RlLGUuX2NsZWFyVGltZXIobltvXS5faWQpO3ZhciB0PWEuX2hvd2xzLmluZGV4T2YoZSk7dD49MCYmYS5faG93bHMuc3BsaWNlKHQsMSl9cmV0dXJuIHMmJmRlbGV0ZSBzW2UuX3NyY10sZS5fc291bmRzPVtdLGU9bnVsbCxudWxsfSxvbjpmdW5jdGlvbihlLG4sbyx0KXt2YXIgcj10aGlzLHU9cltcIl9vblwiK2VdO3JldHVyblwiZnVuY3Rpb25cIj09dHlwZW9mIG4mJnUucHVzaCh0P3tpZDpvLGZuOm4sb25jZTp0fTp7aWQ6byxmbjpufSkscn0sb2ZmOmZ1bmN0aW9uKGUsbixvKXt2YXIgdD10aGlzLHI9dFtcIl9vblwiK2VdO2lmKG4pe2Zvcih2YXIgdT0wO3U8ci5sZW5ndGg7dSsrKWlmKG49PT1yW3VdLmZuJiZvPT09clt1XS5pZCl7ci5zcGxpY2UodSwxKTticmVha319ZWxzZSBpZihlKXRbXCJfb25cIitlXT1bXTtlbHNlIGZvcih2YXIgZD1PYmplY3Qua2V5cyh0KSx1PTA7dTxkLmxlbmd0aDt1KyspMD09PWRbdV0uaW5kZXhPZihcIl9vblwiKSYmQXJyYXkuaXNBcnJheSh0W2RbdV1dKSYmKHRbZFt1XV09W10pO3JldHVybiB0fSxvbmNlOmZ1bmN0aW9uKGUsbixvKXt2YXIgdD10aGlzO3JldHVybiB0Lm9uKGUsbixvLDEpLHR9LF9lbWl0OmZ1bmN0aW9uKGUsbixvKXtmb3IodmFyIHQ9dGhpcyxyPXRbXCJfb25cIitlXSx1PXIubGVuZ3RoLTE7dT49MDt1LS0pclt1XS5pZCYmclt1XS5pZCE9PW4mJlwibG9hZFwiIT09ZXx8KHNldFRpbWVvdXQoZnVuY3Rpb24oZSl7ZS5jYWxsKHRoaXMsbixvKX0uYmluZCh0LHJbdV0uZm4pLDApLHJbdV0ub25jZSYmdC5vZmYoZSxyW3VdLmZuLHJbdV0uaWQpKTtyZXR1cm4gdH0sX2xvYWRRdWV1ZTpmdW5jdGlvbigpe3ZhciBlPXRoaXM7aWYoZS5fcXVldWUubGVuZ3RoPjApe3ZhciBuPWUuX3F1ZXVlWzBdO2Uub25jZShuLmV2ZW50LGZ1bmN0aW9uKCl7ZS5fcXVldWUuc2hpZnQoKSxlLl9sb2FkUXVldWUoKX0pLG4uYWN0aW9uKCl9cmV0dXJuIGV9LF9lbmRlZDpmdW5jdGlvbihlKXt2YXIgbz10aGlzLHQ9ZS5fc3ByaXRlLHI9ISghZS5fbG9vcCYmIW8uX3Nwcml0ZVt0XVsyXSk7aWYoby5fZW1pdChcImVuZFwiLGUuX2lkKSwhby5fd2ViQXVkaW8mJnImJm8uc3RvcChlLl9pZCkucGxheShlLl9pZCksby5fd2ViQXVkaW8mJnIpe28uX2VtaXQoXCJwbGF5XCIsZS5faWQpLGUuX3NlZWs9ZS5fc3RhcnR8fDAsZS5fcGxheVN0YXJ0PW4uY3VycmVudFRpbWU7dmFyIHU9MWUzKihlLl9zdG9wLWUuX3N0YXJ0KS9NYXRoLmFicyhlLl9yYXRlKTtvLl9lbmRUaW1lcnNbZS5faWRdPXNldFRpbWVvdXQoby5fZW5kZWQuYmluZChvLGUpLHUpfXJldHVybiBvLl93ZWJBdWRpbyYmIXImJihlLl9wYXVzZWQ9ITAsZS5fZW5kZWQ9ITAsZS5fc2Vlaz1lLl9zdGFydHx8MCxvLl9jbGVhclRpbWVyKGUuX2lkKSxlLl9ub2RlLmJ1ZmZlclNvdXJjZT1udWxsLGEuX2F1dG9TdXNwZW5kKCkpLG8uX3dlYkF1ZGlvfHxyfHxvLnN0b3AoZS5faWQpLG99LF9jbGVhclRpbWVyOmZ1bmN0aW9uKGUpe3ZhciBuPXRoaXM7cmV0dXJuIG4uX2VuZFRpbWVyc1tlXSYmKGNsZWFyVGltZW91dChuLl9lbmRUaW1lcnNbZV0pLGRlbGV0ZSBuLl9lbmRUaW1lcnNbZV0pLG59LF9zb3VuZEJ5SWQ6ZnVuY3Rpb24oZSl7Zm9yKHZhciBuPXRoaXMsbz0wO288bi5fc291bmRzLmxlbmd0aDtvKyspaWYoZT09PW4uX3NvdW5kc1tvXS5faWQpcmV0dXJuIG4uX3NvdW5kc1tvXTtyZXR1cm4gbnVsbH0sX2luYWN0aXZlU291bmQ6ZnVuY3Rpb24oKXt2YXIgZT10aGlzO2UuX2RyYWluKCk7Zm9yKHZhciBuPTA7bjxlLl9zb3VuZHMubGVuZ3RoO24rKylpZihlLl9zb3VuZHNbbl0uX2VuZGVkKXJldHVybiBlLl9zb3VuZHNbbl0ucmVzZXQoKTtyZXR1cm4gbmV3IF8oZSl9LF9kcmFpbjpmdW5jdGlvbigpe3ZhciBlPXRoaXMsbj1lLl9wb29sLG89MCx0PTA7aWYoIShlLl9zb3VuZHMubGVuZ3RoPG4pKXtmb3IodD0wO3Q8ZS5fc291bmRzLmxlbmd0aDt0KyspZS5fc291bmRzW3RdLl9lbmRlZCYmbysrO2Zvcih0PWUuX3NvdW5kcy5sZW5ndGgtMTt0Pj0wO3QtLSl7aWYobj49bylyZXR1cm47ZS5fc291bmRzW3RdLl9lbmRlZCYmKGUuX3dlYkF1ZGlvJiZlLl9zb3VuZHNbdF0uX25vZGUmJmUuX3NvdW5kc1t0XS5fbm9kZS5kaXNjb25uZWN0KDApLGUuX3NvdW5kcy5zcGxpY2UodCwxKSxvLS0pfX19LF9nZXRTb3VuZElkczpmdW5jdGlvbihlKXt2YXIgbj10aGlzO2lmKFwidW5kZWZpbmVkXCI9PXR5cGVvZiBlKXtmb3IodmFyIG89W10sdD0wO3Q8bi5fc291bmRzLmxlbmd0aDt0Kyspby5wdXNoKG4uX3NvdW5kc1t0XS5faWQpO3JldHVybiBvfXJldHVybltlXX0sX3JlZnJlc2hCdWZmZXI6ZnVuY3Rpb24oZSl7dmFyIG89dGhpcztyZXR1cm4gZS5fbm9kZS5idWZmZXJTb3VyY2U9bi5jcmVhdGVCdWZmZXJTb3VyY2UoKSxlLl9ub2RlLmJ1ZmZlclNvdXJjZS5idWZmZXI9c1tvLl9zcmNdLGUuX25vZGUuYnVmZmVyU291cmNlLmNvbm5lY3QoZS5fcGFubmVyP2UuX3Bhbm5lcjplLl9ub2RlKSxlLl9ub2RlLmJ1ZmZlclNvdXJjZS5sb29wPWUuX2xvb3AsZS5fbG9vcCYmKGUuX25vZGUuYnVmZmVyU291cmNlLmxvb3BTdGFydD1lLl9zdGFydHx8MCxlLl9ub2RlLmJ1ZmZlclNvdXJjZS5sb29wRW5kPWUuX3N0b3ApLGUuX25vZGUuYnVmZmVyU291cmNlLnBsYXliYWNrUmF0ZS52YWx1ZT1vLl9yYXRlLG99fTt2YXIgXz1mdW5jdGlvbihlKXt0aGlzLl9wYXJlbnQ9ZSx0aGlzLmluaXQoKX07aWYoXy5wcm90b3R5cGU9e2luaXQ6ZnVuY3Rpb24oKXt2YXIgZT10aGlzLG49ZS5fcGFyZW50O3JldHVybiBlLl9tdXRlZD1uLl9tdXRlZCxlLl9sb29wPW4uX2xvb3AsZS5fdm9sdW1lPW4uX3ZvbHVtZSxlLl9tdXRlZD1uLl9tdXRlZCxlLl9yYXRlPW4uX3JhdGUsZS5fc2Vlaz0wLGUuX3BhdXNlZD0hMCxlLl9lbmRlZD0hMCxlLl9zcHJpdGU9XCJfX2RlZmF1bHRcIixlLl9pZD1NYXRoLnJvdW5kKERhdGUubm93KCkqTWF0aC5yYW5kb20oKSksbi5fc291bmRzLnB1c2goZSksZS5jcmVhdGUoKSxlfSxjcmVhdGU6ZnVuY3Rpb24oKXt2YXIgZT10aGlzLG89ZS5fcGFyZW50LHQ9YS5fbXV0ZWR8fGUuX211dGVkfHxlLl9wYXJlbnQuX211dGVkPzA6ZS5fdm9sdW1lKmEudm9sdW1lKCk7cmV0dXJuIG8uX3dlYkF1ZGlvPyhlLl9ub2RlPVwidW5kZWZpbmVkXCI9PXR5cGVvZiBuLmNyZWF0ZUdhaW4/bi5jcmVhdGVHYWluTm9kZSgpOm4uY3JlYXRlR2FpbigpLGUuX25vZGUuZ2Fpbi5zZXRWYWx1ZUF0VGltZSh0LG4uY3VycmVudFRpbWUpLGUuX25vZGUucGF1c2VkPSEwLGUuX25vZGUuY29ubmVjdChyKSk6KGUuX25vZGU9bmV3IEF1ZGlvLGUuX2Vycm9yRm49ZS5fZXJyb3JMaXN0ZW5lci5iaW5kKGUpLGUuX25vZGUuYWRkRXZlbnRMaXN0ZW5lcihcImVycm9yXCIsZS5fZXJyb3JGbiwhMSksZS5fbG9hZEZuPWUuX2xvYWRMaXN0ZW5lci5iaW5kKGUpLGUuX25vZGUuYWRkRXZlbnRMaXN0ZW5lcih1LGUuX2xvYWRGbiwhMSksZS5fbm9kZS5zcmM9by5fc3JjLGUuX25vZGUucHJlbG9hZD1cImF1dG9cIixlLl9ub2RlLnZvbHVtZT10LGUuX25vZGUubG9hZCgpKSxlfSxyZXNldDpmdW5jdGlvbigpe3ZhciBlPXRoaXMsbj1lLl9wYXJlbnQ7cmV0dXJuIGUuX211dGVkPW4uX211dGVkLGUuX2xvb3A9bi5fbG9vcCxlLl92b2x1bWU9bi5fdm9sdW1lLGUuX211dGVkPW4uX211dGVkLGUuX3JhdGU9bi5fcmF0ZSxlLl9zZWVrPTAsZS5fcGF1c2VkPSEwLGUuX2VuZGVkPSEwLGUuX3Nwcml0ZT1cIl9fZGVmYXVsdFwiLGUuX2lkPU1hdGgucm91bmQoRGF0ZS5ub3coKSpNYXRoLnJhbmRvbSgpKSxlfSxfZXJyb3JMaXN0ZW5lcjpmdW5jdGlvbigpe3ZhciBlPXRoaXM7ZS5fbm9kZS5lcnJvciYmND09PWUuX25vZGUuZXJyb3IuY29kZSYmKGEubm9BdWRpbz0hMCksZS5fcGFyZW50Ll9lbWl0KFwibG9hZGVycm9yXCIsZS5faWQsZS5fbm9kZS5lcnJvcj9lLl9ub2RlLmVycm9yLmNvZGU6MCksZS5fbm9kZS5yZW1vdmVFdmVudExpc3RlbmVyKFwiZXJyb3JcIixlLl9lcnJvckxpc3RlbmVyLCExKX0sX2xvYWRMaXN0ZW5lcjpmdW5jdGlvbigpe3ZhciBlPXRoaXMsbj1lLl9wYXJlbnQ7bi5fZHVyYXRpb249TWF0aC5jZWlsKDEwKmUuX25vZGUuZHVyYXRpb24pLzEwLDA9PT1PYmplY3Qua2V5cyhuLl9zcHJpdGUpLmxlbmd0aCYmKG4uX3Nwcml0ZT17X19kZWZhdWx0OlswLDFlMypuLl9kdXJhdGlvbl19KSxuLl9sb2FkZWR8fChuLl9sb2FkZWQ9ITAsbi5fZW1pdChcImxvYWRcIiksbi5fbG9hZFF1ZXVlKCkpLG4uX2F1dG9wbGF5JiZuLnBsYXkoKSxlLl9ub2RlLnJlbW92ZUV2ZW50TGlzdGVuZXIodSxlLl9sb2FkRm4sITEpfX0sbyl2YXIgcz17fSxsPWZ1bmN0aW9uKGUpe3ZhciBuPWUuX3NyYztpZihzW25dKXJldHVybiBlLl9kdXJhdGlvbj1zW25dLmR1cmF0aW9uLHZvaWQgcChlKTtpZigvXmRhdGE6W147XSs7YmFzZTY0LC8udGVzdChuKSl7d2luZG93LmF0b2I9d2luZG93LmF0b2J8fGZ1bmN0aW9uKGUpe2Zvcih2YXIgbixvLHQ9XCJBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWmFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6MDEyMzQ1Njc4OSsvPVwiLHI9U3RyaW5nKGUpLnJlcGxhY2UoLz0rJC8sXCJcIiksdT0wLGQ9MCxhPVwiXCI7bz1yLmNoYXJBdChkKyspO35vJiYobj11JTQ/NjQqbitvOm8sdSsrJTQpP2ErPVN0cmluZy5mcm9tQ2hhckNvZGUoMjU1Jm4+PigtMip1JjYpKTowKW89dC5pbmRleE9mKG8pO3JldHVybiBhfTtmb3IodmFyIG89YXRvYihuLnNwbGl0KFwiLFwiKVsxXSksdD1uZXcgVWludDhBcnJheShvLmxlbmd0aCkscj0wO3I8by5sZW5ndGg7KytyKXRbcl09by5jaGFyQ29kZUF0KHIpO2ModC5idWZmZXIsZSl9ZWxzZXt2YXIgdT1uZXcgWE1MSHR0cFJlcXVlc3Q7dS5vcGVuKFwiR0VUXCIsbiwhMCksdS5yZXNwb25zZVR5cGU9XCJhcnJheWJ1ZmZlclwiLHUub25sb2FkPWZ1bmN0aW9uKCl7Yyh1LnJlc3BvbnNlLGUpfSx1Lm9uZXJyb3I9ZnVuY3Rpb24oKXtlLl93ZWJBdWRpbyYmKGUuX2h0bWw1PSEwLGUuX3dlYkF1ZGlvPSExLGUuX3NvdW5kcz1bXSxkZWxldGUgc1tuXSxlLmxvYWQoKSl9LGYodSl9fSxmPWZ1bmN0aW9uKGUpe3RyeXtlLnNlbmQoKX1jYXRjaChuKXtlLm9uZXJyb3IoKX19LGM9ZnVuY3Rpb24oZSxvKXtuLmRlY29kZUF1ZGlvRGF0YShlLGZ1bmN0aW9uKGUpe2UmJm8uX3NvdW5kcy5sZW5ndGg+MCYmKHNbby5fc3JjXT1lLHAobyxlKSl9LGZ1bmN0aW9uKCl7by5fZW1pdChcImxvYWRlcnJvclwiLG51bGwsXCJEZWNvZGluZyBhdWRpbyBkYXRhIGZhaWxlZC5cIil9KX0scD1mdW5jdGlvbihlLG4pe24mJiFlLl9kdXJhdGlvbiYmKGUuX2R1cmF0aW9uPW4uZHVyYXRpb24pLDA9PT1PYmplY3Qua2V5cyhlLl9zcHJpdGUpLmxlbmd0aCYmKGUuX3Nwcml0ZT17X19kZWZhdWx0OlswLDFlMyplLl9kdXJhdGlvbl19KSxlLl9sb2FkZWR8fChlLl9sb2FkZWQ9ITAsZS5fZW1pdChcImxvYWRcIiksZS5fbG9hZFF1ZXVlKCkpLGUuX2F1dG9wbGF5JiZlLnBsYXkoKX07XCJmdW5jdGlvblwiPT10eXBlb2YgZGVmaW5lJiZkZWZpbmUuYW1kJiZkZWZpbmUoW10sZnVuY3Rpb24oKXtyZXR1cm57SG93bGVyOmEsSG93bDppfX0pLFwidW5kZWZpbmVkXCIhPXR5cGVvZiBleHBvcnRzJiYoZXhwb3J0cy5Ib3dsZXI9YSxleHBvcnRzLkhvd2w9aSksXCJ1bmRlZmluZWRcIiE9dHlwZW9mIHdpbmRvdz8od2luZG93Lkhvd2xlckdsb2JhbD1kLHdpbmRvdy5Ib3dsZXI9YSx3aW5kb3cuSG93bD1pLHdpbmRvdy5Tb3VuZD1fKTpcInVuZGVmaW5lZFwiIT10eXBlb2YgZ2xvYmFsJiYoZ2xvYmFsLkhvd2xlckdsb2JhbD1kLGdsb2JhbC5Ib3dsZXI9YSxnbG9iYWwuSG93bD1pLGdsb2JhbC5Tb3VuZD1fKX0oKTtcbi8qISBFZmZlY3RzIFBsdWdpbiAqL1xuIWZ1bmN0aW9uKCl7XCJ1c2Ugc3RyaWN0XCI7SG93bGVyR2xvYmFsLnByb3RvdHlwZS5fcG9zPVswLDAsMF0sSG93bGVyR2xvYmFsLnByb3RvdHlwZS5fb3JpZW50YXRpb249WzAsMCwtMSwwLDEsMF0sSG93bGVyR2xvYmFsLnByb3RvdHlwZS5fdmVsb2NpdHk9WzAsMCwwXSxIb3dsZXJHbG9iYWwucHJvdG90eXBlLl9saXN0ZW5lckF0dHI9e2RvcHBsZXJGYWN0b3I6MSxzcGVlZE9mU291bmQ6MzQzLjN9LEhvd2xlckdsb2JhbC5wcm90b3R5cGUucG9zPWZ1bmN0aW9uKGUsbix0KXt2YXIgbz10aGlzO3JldHVybiBvLmN0eCYmby5jdHgubGlzdGVuZXI/KG49XCJudW1iZXJcIiE9dHlwZW9mIG4/by5fcG9zWzFdOm4sdD1cIm51bWJlclwiIT10eXBlb2YgdD9vLl9wb3NbMl06dCxcIm51bWJlclwiIT10eXBlb2YgZT9vLl9wb3M6KG8uX3Bvcz1bZSxuLHRdLG8uY3R4Lmxpc3RlbmVyLnNldFBvc2l0aW9uKG8uX3Bvc1swXSxvLl9wb3NbMV0sby5fcG9zWzJdKSxvKSk6b30sSG93bGVyR2xvYmFsLnByb3RvdHlwZS5vcmllbnRhdGlvbj1mdW5jdGlvbihlLG4sdCxvLHIsaSl7dmFyIGE9dGhpcztpZighYS5jdHh8fCFhLmN0eC5saXN0ZW5lcilyZXR1cm4gYTt2YXIgcD1hLl9vcmllbnRhdGlvbjtyZXR1cm4gbj1cIm51bWJlclwiIT10eXBlb2Ygbj9wWzFdOm4sdD1cIm51bWJlclwiIT10eXBlb2YgdD9wWzJdOnQsbz1cIm51bWJlclwiIT10eXBlb2Ygbz9wWzNdOm8scj1cIm51bWJlclwiIT10eXBlb2Ygcj9wWzRdOnIsaT1cIm51bWJlclwiIT10eXBlb2YgaT9wWzVdOmksXCJudW1iZXJcIiE9dHlwZW9mIGU/cDooYS5fb3JpZW50YXRpb249W2Usbix0LG8scixpXSxhLmN0eC5saXN0ZW5lci5zZXRPcmllbnRhdGlvbihlLG4sdCxvLHIsaSksYSl9LEhvd2xlckdsb2JhbC5wcm90b3R5cGUudmVsb2NpdHk9ZnVuY3Rpb24oZSxuLHQpe3ZhciBvPXRoaXM7cmV0dXJuIG8uY3R4JiZvLmN0eC5saXN0ZW5lcj8obj1cIm51bWJlclwiIT10eXBlb2Ygbj9vLl92ZWxvY2l0eVsxXTpuLHQ9XCJudW1iZXJcIiE9dHlwZW9mIHQ/by5fdmVsb2NpdHlbMl06dCxcIm51bWJlclwiIT10eXBlb2YgZT9vLl92ZWxvY2l0eTooby5fdmVsb2NpdHk9W2Usbix0XSxvLmN0eC5saXN0ZW5lci5zZXRWZWxvY2l0eShvLl92ZWxvY2l0eVswXSxvLl92ZWxvY2l0eVsxXSxvLl92ZWxvY2l0eVsyXSksbykpOm99LEhvd2xlckdsb2JhbC5wcm90b3R5cGUubGlzdGVuZXJBdHRyPWZ1bmN0aW9uKGUpe3ZhciBuPXRoaXM7aWYoIW4uY3R4fHwhbi5jdHgubGlzdGVuZXIpcmV0dXJuIG47dmFyIHQ9bi5fbGlzdGVuZXJBdHRyO3JldHVybiBlPyhuLl9saXN0ZW5lckF0dHI9e2RvcHBsZXJGYWN0b3I6XCJ1bmRlZmluZWRcIiE9dHlwZW9mIGUuZG9wcGxlckZhY3Rvcj9lLmRvcHBsZXJGYWN0b3I6dC5kb3BwbGVyRmFjdG9yLHNwZWVkT2ZTb3VuZDpcInVuZGVmaW5lZFwiIT10eXBlb2YgZS5zcGVlZE9mU291bmQ/ZS5zcGVlZE9mU291bmQ6dC5zcGVlZE9mU291bmR9LG4uY3R4Lmxpc3RlbmVyLmRvcHBsZXJGYWN0b3I9dC5kb3BwbGVyRmFjdG9yLG4uY3R4Lmxpc3RlbmVyLnNwZWVkT2ZTb3VuZD10LnNwZWVkT2ZTb3VuZCxuKTp0fSxIb3dsLnByb3RvdHlwZS5pbml0PWZ1bmN0aW9uKGUpe3JldHVybiBmdW5jdGlvbihuKXt2YXIgdD10aGlzO3JldHVybiB0Ll9vcmllbnRhdGlvbj1uLm9yaWVudGF0aW9ufHxbMSwwLDBdLHQuX3Bvcz1uLnBvc3x8bnVsbCx0Ll92ZWxvY2l0eT1uLnZlbG9jaXR5fHxbMCwwLDBdLHQuX3Bhbm5lckF0dHI9e2NvbmVJbm5lckFuZ2xlOlwidW5kZWZpbmVkXCIhPXR5cGVvZiBuLmNvbmVJbm5lckFuZ2xlP24uY29uZUlubmVyQW5nbGU6MzYwLGNvbmVPdXRlckFuZ2xlOlwidW5kZWZpbmVkXCIhPXR5cGVvZiBuLmNvbmVPdXRlckFuZ2xlP24uY29uZU91dGVyQW5nbGU6MzYwLGNvbmVPdXRlckdhaW46XCJ1bmRlZmluZWRcIiE9dHlwZW9mIG4uY29uZU91dGVyR2Fpbj9uLmNvbmVPdXRlckdhaW46MCxkaXN0YW5jZU1vZGVsOlwidW5kZWZpbmVkXCIhPXR5cGVvZiBuLmRpc3RhbmNlTW9kZWw/bi5kaXN0YW5jZU1vZGVsOlwiaW52ZXJzZVwiLG1heERpc3RhbmNlOlwidW5kZWZpbmVkXCIhPXR5cGVvZiBuLm1heERpc3RhbmNlP24ubWF4RGlzdGFuY2U6MWU0LHBhbm5pbmdNb2RlbDpcInVuZGVmaW5lZFwiIT10eXBlb2Ygbi5wYW5uaW5nTW9kZWw/bi5wYW5uaW5nTW9kZWw6XCJIUlRGXCIscmVmRGlzdGFuY2U6XCJ1bmRlZmluZWRcIiE9dHlwZW9mIG4ucmVmRGlzdGFuY2U/bi5yZWZEaXN0YW5jZToxLHJvbGxvZmZGYWN0b3I6XCJ1bmRlZmluZWRcIiE9dHlwZW9mIG4ucm9sbG9mZkZhY3Rvcj9uLnJvbGxvZmZGYWN0b3I6MX0sZS5jYWxsKHRoaXMsbil9fShIb3dsLnByb3RvdHlwZS5pbml0KSxIb3dsLnByb3RvdHlwZS5wb3M9ZnVuY3Rpb24obix0LG8scil7dmFyIGk9dGhpcztpZighaS5fd2ViQXVkaW8pcmV0dXJuIGk7aWYoIWkuX2xvYWRlZClyZXR1cm4gaS5vbmNlKFwicGxheVwiLGZ1bmN0aW9uKCl7aS5wb3Mobix0LG8scil9KSxpO2lmKHQ9XCJudW1iZXJcIiE9dHlwZW9mIHQ/MDp0LG89XCJudW1iZXJcIiE9dHlwZW9mIG8/LS41Om8sXCJ1bmRlZmluZWRcIj09dHlwZW9mIHIpe2lmKFwibnVtYmVyXCIhPXR5cGVvZiBuKXJldHVybiBpLl9wb3M7aS5fcG9zPVtuLHQsb119Zm9yKHZhciBhPWkuX2dldFNvdW5kSWRzKHIpLHA9MDtwPGEubGVuZ3RoO3ArKyl7dmFyIGw9aS5fc291bmRCeUlkKGFbcF0pO2lmKGwpe2lmKFwibnVtYmVyXCIhPXR5cGVvZiBuKXJldHVybiBsLl9wb3M7bC5fcG9zPVtuLHQsb10sbC5fbm9kZSYmKGwuX3Bhbm5lcnx8ZShsKSxsLl9wYW5uZXIuc2V0UG9zaXRpb24obix0LG8pKX19cmV0dXJuIGl9LEhvd2wucHJvdG90eXBlLm9yaWVudGF0aW9uPWZ1bmN0aW9uKG4sdCxvLHIpe3ZhciBpPXRoaXM7aWYoIWkuX3dlYkF1ZGlvKXJldHVybiBpO2lmKCFpLl9sb2FkZWQpcmV0dXJuIGkub25jZShcInBsYXlcIixmdW5jdGlvbigpe2kub3JpZW50YXRpb24obix0LG8scil9KSxpO2lmKHQ9XCJudW1iZXJcIiE9dHlwZW9mIHQ/aS5fb3JpZW50YXRpb25bMV06dCxvPVwibnVtYmVyXCIhPXR5cGVvZiBvP2kuX29yaWVudGF0aW9uWzJdOm8sXCJ1bmRlZmluZWRcIj09dHlwZW9mIHIpe2lmKFwibnVtYmVyXCIhPXR5cGVvZiBuKXJldHVybiBpLl9vcmllbnRhdGlvbjtpLl9vcmllbnRhdGlvbj1bbix0LG9dfWZvcih2YXIgYT1pLl9nZXRTb3VuZElkcyhyKSxwPTA7cDxhLmxlbmd0aDtwKyspe3ZhciBsPWkuX3NvdW5kQnlJZChhW3BdKTtpZihsKXtpZihcIm51bWJlclwiIT10eXBlb2YgbilyZXR1cm4gbC5fb3JpZW50YXRpb247bC5fb3JpZW50YXRpb249W24sdCxvXSxsLl9ub2RlJiYobC5fcGFubmVyfHxlKGwpLGwuX3Bhbm5lci5zZXRPcmllbnRhdGlvbihuLHQsbykpfX1yZXR1cm4gaX0sSG93bC5wcm90b3R5cGUudmVsb2NpdHk9ZnVuY3Rpb24obix0LG8scil7dmFyIGk9dGhpcztpZighaS5fd2ViQXVkaW8pcmV0dXJuIGk7aWYoIWkuX2xvYWRlZClyZXR1cm4gaS5vbmNlKFwicGxheVwiLGZ1bmN0aW9uKCl7aS52ZWxvY2l0eShuLHQsbyxyKX0pLGk7aWYodD1cIm51bWJlclwiIT10eXBlb2YgdD9pLl92ZWxvY2l0eVsxXTp0LG89XCJudW1iZXJcIiE9dHlwZW9mIG8/aS5fdmVsb2NpdHlbMl06byxcInVuZGVmaW5lZFwiPT10eXBlb2Ygcil7aWYoXCJudW1iZXJcIiE9dHlwZW9mIG4pcmV0dXJuIGkuX3ZlbG9jaXR5O2kuX3ZlbG9jaXR5PVtuLHQsb119Zm9yKHZhciBhPWkuX2dldFNvdW5kSWRzKHIpLHA9MDtwPGEubGVuZ3RoO3ArKyl7dmFyIGw9aS5fc291bmRCeUlkKGFbcF0pO2lmKGwpe2lmKFwibnVtYmVyXCIhPXR5cGVvZiBuKXJldHVybiBsLl92ZWxvY2l0eTtsLl92ZWxvY2l0eT1bbix0LG9dLGwuX25vZGUmJihsLl9wYW5uZXJ8fGUobCksbC5fcGFubmVyLnNldFZlbG9jaXR5KG4sdCxvKSl9fXJldHVybiBpfSxIb3dsLnByb3RvdHlwZS5wYW5uZXJBdHRyPWZ1bmN0aW9uKCl7dmFyIG4sdCxvLHI9dGhpcyxpPWFyZ3VtZW50cztpZighci5fd2ViQXVkaW8pcmV0dXJuIHI7aWYoMD09PWkubGVuZ3RoKXJldHVybiByLl9wYW5uZXJBdHRyO2lmKDE9PT1pLmxlbmd0aCl7aWYoXCJvYmplY3RcIiE9dHlwZW9mIGlbMF0pcmV0dXJuIG89ci5fc291bmRCeUlkKHBhcnNlSW50KGlbMF0sMTApKSxvP28uX3Bhbm5lckF0dHI6ci5fcGFubmVyQXR0cjtuPWlbMF0sXCJ1bmRlZmluZWRcIj09dHlwZW9mIHQmJihyLl9wYW5uZXJBdHRyPXtjb25lSW5uZXJBbmdsZTpcInVuZGVmaW5lZFwiIT10eXBlb2Ygbi5jb25lSW5uZXJBbmdsZT9uLmNvbmVJbm5lckFuZ2xlOnIuX2NvbmVJbm5lckFuZ2xlLGNvbmVPdXRlckFuZ2xlOlwidW5kZWZpbmVkXCIhPXR5cGVvZiBuLmNvbmVPdXRlckFuZ2xlP24uY29uZU91dGVyQW5nbGU6ci5fY29uZU91dGVyQW5nbGUsY29uZU91dGVyR2FpbjpcInVuZGVmaW5lZFwiIT10eXBlb2Ygbi5jb25lT3V0ZXJHYWluP24uY29uZU91dGVyR2FpbjpyLl9jb25lT3V0ZXJHYWluLGRpc3RhbmNlTW9kZWw6XCJ1bmRlZmluZWRcIiE9dHlwZW9mIG4uZGlzdGFuY2VNb2RlbD9uLmRpc3RhbmNlTW9kZWw6ci5fZGlzdGFuY2VNb2RlbCxtYXhEaXN0YW5jZTpcInVuZGVmaW5lZFwiIT10eXBlb2Ygbi5tYXhEaXN0YW5jZT9uLm1heERpc3RhbmNlOnIuX21heERpc3RhbmNlLHBhbm5pbmdNb2RlbDpcInVuZGVmaW5lZFwiIT10eXBlb2Ygbi5wYW5uaW5nTW9kZWw/bi5wYW5uaW5nTW9kZWw6ci5fcGFubmluZ01vZGVsLHJlZkRpc3RhbmNlOlwidW5kZWZpbmVkXCIhPXR5cGVvZiBuLnJlZkRpc3RhbmNlP24ucmVmRGlzdGFuY2U6ci5fcmVmRGlzdGFuY2Uscm9sbG9mZkZhY3RvcjpcInVuZGVmaW5lZFwiIT10eXBlb2Ygbi5yb2xsb2ZmRmFjdG9yP24ucm9sbG9mZkZhY3RvcjpyLl9yb2xsb2ZmRmFjdG9yfSl9ZWxzZSAyPT09aS5sZW5ndGgmJihuPWlbMF0sdD1wYXJzZUludChpWzFdLDEwKSk7Zm9yKHZhciBhPXIuX2dldFNvdW5kSWRzKHQpLHA9MDtwPGEubGVuZ3RoO3ArKylpZihvPXIuX3NvdW5kQnlJZChhW3BdKSl7dmFyIGw9by5fcGFubmVyQXR0cjtsPXtjb25lSW5uZXJBbmdsZTpcInVuZGVmaW5lZFwiIT10eXBlb2Ygbi5jb25lSW5uZXJBbmdsZT9uLmNvbmVJbm5lckFuZ2xlOmwuY29uZUlubmVyQW5nbGUsY29uZU91dGVyQW5nbGU6XCJ1bmRlZmluZWRcIiE9dHlwZW9mIG4uY29uZU91dGVyQW5nbGU/bi5jb25lT3V0ZXJBbmdsZTpsLmNvbmVPdXRlckFuZ2xlLGNvbmVPdXRlckdhaW46XCJ1bmRlZmluZWRcIiE9dHlwZW9mIG4uY29uZU91dGVyR2Fpbj9uLmNvbmVPdXRlckdhaW46bC5jb25lT3V0ZXJHYWluLGRpc3RhbmNlTW9kZWw6XCJ1bmRlZmluZWRcIiE9dHlwZW9mIG4uZGlzdGFuY2VNb2RlbD9uLmRpc3RhbmNlTW9kZWw6bC5kaXN0YW5jZU1vZGVsLG1heERpc3RhbmNlOlwidW5kZWZpbmVkXCIhPXR5cGVvZiBuLm1heERpc3RhbmNlP24ubWF4RGlzdGFuY2U6bC5tYXhEaXN0YW5jZSxwYW5uaW5nTW9kZWw6XCJ1bmRlZmluZWRcIiE9dHlwZW9mIG4ucGFubmluZ01vZGVsP24ucGFubmluZ01vZGVsOmwucGFubmluZ01vZGVsLHJlZkRpc3RhbmNlOlwidW5kZWZpbmVkXCIhPXR5cGVvZiBuLnJlZkRpc3RhbmNlP24ucmVmRGlzdGFuY2U6bC5yZWZEaXN0YW5jZSxyb2xsb2ZmRmFjdG9yOlwidW5kZWZpbmVkXCIhPXR5cGVvZiBuLnJvbGxvZmZGYWN0b3I/bi5yb2xsb2ZmRmFjdG9yOmwucm9sbG9mZkZhY3Rvcn07dmFyIGM9by5fcGFubmVyO2M/KGMuY29uZUlubmVyQW5nbGU9bC5jb25lSW5uZXJBbmdsZSxjLmNvbmVPdXRlckFuZ2xlPWwuY29uZU91dGVyQW5nbGUsYy5jb25lT3V0ZXJHYWluPWwuY29uZU91dGVyR2FpbixjLmRpc3RhbmNlTW9kZWw9bC5kaXN0YW5jZU1vZGVsLGMubWF4RGlzdGFuY2U9bC5tYXhEaXN0YW5jZSxjLnBhbm5pbmdNb2RlbD1sLnBhbm5pbmdNb2RlbCxjLnJlZkRpc3RhbmNlPWwucmVmRGlzdGFuY2UsYy5yb2xsb2ZmRmFjdG9yPWwucm9sbG9mZkZhY3Rvcik6KG8uX3Bvc3x8KG8uX3Bvcz1yLl9wb3N8fFswLDAsLS41XSksZShvKSl9cmV0dXJuIHJ9LFNvdW5kLnByb3RvdHlwZS5pbml0PWZ1bmN0aW9uKGUpe3JldHVybiBmdW5jdGlvbigpe3ZhciBuPXRoaXMsdD1uLl9wYXJlbnQ7bi5fb3JpZW50YXRpb249dC5fb3JpZW50YXRpb24sbi5fcG9zPXQuX3BvcyxuLl92ZWxvY2l0eT10Ll92ZWxvY2l0eSxuLl9wYW5uZXJBdHRyPXQuX3Bhbm5lckF0dHIsZS5jYWxsKHRoaXMpLG4uX3BvcyYmdC5wb3Mobi5fcG9zWzBdLG4uX3Bvc1sxXSxuLl9wb3NbMl0sbi5faWQpfX0oU291bmQucHJvdG90eXBlLmluaXQpLFNvdW5kLnByb3RvdHlwZS5yZXNldD1mdW5jdGlvbihlKXtyZXR1cm4gZnVuY3Rpb24oKXt2YXIgbj10aGlzLHQ9bi5fcGFyZW50O3JldHVybiBuLl9vcmllbnRhdGlvbj10Ll9vcmllbnRhdGlvbixuLl9wb3M9dC5fcG9zLG4uX3ZlbG9jaXR5PXQuX3ZlbG9jaXR5LG4uX3Bhbm5lckF0dHI9dC5fcGFubmVyQXR0cixlLmNhbGwodGhpcyl9fShTb3VuZC5wcm90b3R5cGUucmVzZXQpO3ZhciBlPWZ1bmN0aW9uKGUpe2UuX3Bhbm5lcj1Ib3dsZXIuY3R4LmNyZWF0ZVBhbm5lcigpLGUuX3Bhbm5lci5jb25lSW5uZXJBbmdsZT1lLl9wYW5uZXJBdHRyLmNvbmVJbm5lckFuZ2xlLGUuX3Bhbm5lci5jb25lT3V0ZXJBbmdsZT1lLl9wYW5uZXJBdHRyLmNvbmVPdXRlckFuZ2xlLGUuX3Bhbm5lci5jb25lT3V0ZXJHYWluPWUuX3Bhbm5lckF0dHIuY29uZU91dGVyR2FpbixlLl9wYW5uZXIuZGlzdGFuY2VNb2RlbD1lLl9wYW5uZXJBdHRyLmRpc3RhbmNlTW9kZWwsZS5fcGFubmVyLm1heERpc3RhbmNlPWUuX3Bhbm5lckF0dHIubWF4RGlzdGFuY2UsZS5fcGFubmVyLnBhbm5pbmdNb2RlbD1lLl9wYW5uZXJBdHRyLnBhbm5pbmdNb2RlbCxlLl9wYW5uZXIucmVmRGlzdGFuY2U9ZS5fcGFubmVyQXR0ci5yZWZEaXN0YW5jZSxlLl9wYW5uZXIucm9sbG9mZkZhY3Rvcj1lLl9wYW5uZXJBdHRyLnJvbGxvZmZGYWN0b3IsZS5fcGFubmVyLnNldFBvc2l0aW9uKGUuX3Bvc1swXSxlLl9wb3NbMV0sZS5fcG9zWzJdKSxlLl9wYW5uZXIuc2V0T3JpZW50YXRpb24oZS5fb3JpZW50YXRpb25bMF0sZS5fb3JpZW50YXRpb25bMV0sZS5fb3JpZW50YXRpb25bMl0pLGUuX3Bhbm5lci5zZXRWZWxvY2l0eShlLl92ZWxvY2l0eVswXSxlLl92ZWxvY2l0eVsxXSxlLl92ZWxvY2l0eVsyXSksZS5fcGFubmVyLmNvbm5lY3QoZS5fbm9kZSksZS5fcGF1c2VkfHxlLl9wYXJlbnQucGF1c2UoZS5faWQpLnBsYXkoZS5faWQpfX0oKTtcblxuXG5cbi8qKioqKioqKioqKioqKioqKlxuICoqIFdFQlBBQ0sgRk9PVEVSXG4gKiogLi9+L2hvd2xlci9ob3dsZXIuanNcbiAqKiBtb2R1bGUgaWQgPSA2XG4gKiogbW9kdWxlIGNodW5rcyA9IDBcbiAqKi8iLCJtb2R1bGUuZXhwb3J0cyA9IF9fd2VicGFja19hbWRfb3B0aW9uc19fO1xyXG5cblxuXG4vKioqKioqKioqKioqKioqKipcbiAqKiBXRUJQQUNLIEZPT1RFUlxuICoqICh3ZWJwYWNrKS9idWlsZGluL2FtZC1vcHRpb25zLmpzXG4gKiogbW9kdWxlIGlkID0gN1xuICoqIG1vZHVsZSBjaHVua3MgPSAwXG4gKiovIiwiXG52YXIgJHZpZGVvSW5kaWNhdG9yID0gJCgnI3ZpZGVvLXByb2dyZXNzIC5wcm9ncmVzcycpO1xudmFyIHZpZGVvUGxheWluZztcbnZhciAkZWw7XG5cbiR2aWRlb0luZGljYXRvci5oaWRlKCk7XG5tb2R1bGUuZXhwb3J0cy5zdGFydCA9IGZ1bmN0aW9uKCRuZXdWaWRlbykge1xuICAkZWwgPSAkbmV3VmlkZW9bMF07XG4gICR2aWRlb0luZGljYXRvci5zaG93KCk7XG4gIHZpZGVvUGxheWluZyA9IHRydWU7XG4gIGxvb3AoKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzLnN0b3AgPSBmdW5jdGlvbigpIHtcbiAgdmlkZW9QbGF5aW5nID0gZmFsc2U7XG4gICQoJyN2aWRlby1wcm9ncmVzcyAucHJvZ3Jlc3MnKS5oaWRlKCk7XG59O1xuXG5mdW5jdGlvbiBsb29wKCkge1xuICB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKGZ1bmN0aW9uKCkge1xuICAgIHZhciByYXRlID0gKCRlbC5jdXJyZW50VGltZSAvICRlbC5kdXJhdGlvbik7XG4gICAgdmFyIHBlcmNlbnQgPSAocmF0ZSAqIDEwMCkudG9GaXhlZCgyKTtcbiAgICAkdmlkZW9JbmRpY2F0b3IuY3NzKHsnd2lkdGgnOiBwZXJjZW50ICsgJ3Z3J30pO1xuICAgIGlmKHZpZGVvUGxheWluZykge1xuICAgICAgc2V0VGltZW91dCggKCkgPT4ge2xvb3AoKX0gLCA0MSApXG4gICAgfVxuICB9KVxufVxuXG5cblxuLyoqIFdFQlBBQ0sgRk9PVEVSICoqXG4gKiogLi9zY2VuZS1tYWtlci9yZW5kZXIvdmlkZW9wbGF5ZXIuanNcbiAqKi8iLCJtb2R1bGUuZXhwb3J0cy5jb252ZXJ0QWxsUHJvcHNUb1B4ID0gZnVuY3Rpb24oa2V5ZnJhbWVzLCB3aW5kb3dXaWR0aCwgd2luZG93SGVpZ2h0KSB7XG4gIHZhciBpLCBqLCBrO1xuICBmb3IoaT0wO2k8a2V5ZnJhbWVzLmxlbmd0aDtpKyspIHsgLy8gbG9vcCBrZXlmcmFtZXNcbiAgICBrZXlmcmFtZXNbaV0uZHVyYXRpb24gPSBjb252ZXJ0UGVyY2VudFRvUHgoa2V5ZnJhbWVzW2ldLmR1cmF0aW9uLCAneScsIHdpbmRvd1dpZHRoLCB3aW5kb3dIZWlnaHQpO1xuICAgIGZvcihqPTA7ajxrZXlmcmFtZXNbaV0uYW5pbWF0aW9ucy5sZW5ndGg7aisrKSB7IC8vIGxvb3AgYW5pbWF0aW9uc1xuICAgICAgT2JqZWN0LmtleXMoa2V5ZnJhbWVzW2ldLmFuaW1hdGlvbnNbal0pLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7IC8vIGxvb3AgcHJvcGVydGllc1xuICAgICAgICB2YXIgdmFsdWUgPSBrZXlmcmFtZXNbaV0uYW5pbWF0aW9uc1tqXVtrZXldO1xuICAgICAgICBpZihrZXkgIT09ICdzZWxlY3RvcicpIHtcbiAgICAgICAgICBpZih2YWx1ZSBpbnN0YW5jZW9mIEFycmF5KSB7IC8vIGlmIGl0cyBhbiBhcnJheVxuICAgICAgICAgICAgZm9yKGs9MDtrPHZhbHVlLmxlbmd0aDtrKyspIHsgLy8gaWYgdmFsdWUgaW4gYXJyYXkgaXMgJVxuICAgICAgICAgICAgICBpZih0eXBlb2YgdmFsdWVba10gPT09IFwic3RyaW5nXCIpIHtcbiAgICAgICAgICAgICAgICBpZihrZXkgPT09ICd0cmFuc2xhdGVZJykge1xuICAgICAgICAgICAgICAgICAgdmFsdWVba10gPSBjb252ZXJ0UGVyY2VudFRvUHgodmFsdWVba10sICd5Jywgd2luZG93V2lkdGgsIHdpbmRvd0hlaWdodCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgIHZhbHVlW2tdID0gY29udmVydFBlcmNlbnRUb1B4KHZhbHVlW2tdLCAneCcsIHdpbmRvd1dpZHRoLCB3aW5kb3dIZWlnaHQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZih0eXBlb2YgdmFsdWUgPT09IFwic3RyaW5nXCIpIHsgLy8gaWYgc2luZ2xlIHZhbHVlIGlzIGEgJVxuICAgICAgICAgICAgICBpZihrZXkgPT09ICd0cmFuc2xhdGVZJykge1xuICAgICAgICAgICAgICAgIHZhbHVlID0gY29udmVydFBlcmNlbnRUb1B4KHZhbHVlLCAneScsIHdpbmRvd1dpZHRoLCB3aW5kb3dIZWlnaHQpO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHZhbHVlID0gY29udmVydFBlcmNlbnRUb1B4KHZhbHVlLCAneCcsIHdpbmRvd1dpZHRoLCB3aW5kb3dIZWlnaHQpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGtleWZyYW1lc1tpXS5hbmltYXRpb25zW2pdW2tleV0gPSB2YWx1ZTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICB9XG4gIHJldHVybiBrZXlmcmFtZXM7XG59O1xuXG5cblxuZnVuY3Rpb24gY29udmVydFBlcmNlbnRUb1B4KHZhbHVlLCBheGlzLCB3aW5kb3dXaWR0aCwgd2luZG93SGVpZ2h0KSB7XG4gIGlmKHR5cGVvZiB2YWx1ZSA9PT0gXCJzdHJpbmdcIiAmJiB2YWx1ZS5tYXRjaCgvJS9nKSkge1xuICAgIGlmKGF4aXMgPT09ICd5JykgdmFsdWUgPSAocGFyc2VGbG9hdCh2YWx1ZSkgLyAxMDApICogd2luZG93SGVpZ2h0O1xuICAgIGlmKGF4aXMgPT09ICd4JykgdmFsdWUgPSAocGFyc2VGbG9hdCh2YWx1ZSkgLyAxMDApICogd2luZG93V2lkdGg7XG4gIH1cbiAgaWYodHlwZW9mIHZhbHVlID09PSBcInN0cmluZ1wiICYmIHZhbHVlLm1hdGNoKC92L2cpKSB7XG4gICAgaWYoYXhpcyA9PT0gJ3knKSB2YWx1ZSA9IChwYXJzZUZsb2F0KHZhbHVlKSAvIDEwMCkgKiB3aW5kb3dIZWlnaHQ7XG4gICAgaWYoYXhpcyA9PT0gJ3gnKSB2YWx1ZSA9IChwYXJzZUZsb2F0KHZhbHVlKSAvIDEwMCkgKiB3aW5kb3dXaWR0aDtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59O1xuXG5cbm1vZHVsZS5leHBvcnRzLmJ1aWxkUGFnZSA9IGZ1bmN0aW9uKGtleWZyYW1lcywgd3JhcHBlcnMpIHtcbiAgdmFyIGksIGosIGssIGluaXRGcmFtZXMgPSBbXSwgYm9keUhlaWdodCA9IDA7XG4gIGZvcihpPTA7aTxrZXlmcmFtZXMubGVuZ3RoO2krKykgeyAvLyBsb29wIGtleWZyYW1lc1xuICAgICAgaWYoa2V5ZnJhbWVzW2ldLmZvY3VzKSB7XG4gICAgICAgICAgaWYoYm9keUhlaWdodCAhPT0gaW5pdEZyYW1lc1tpbml0RnJhbWVzLmxlbmd0aCAtIDFdKSB7XG4gICAgICAgICAgICBpbml0RnJhbWVzLnB1c2goYm9keUhlaWdodCk7XG4gICAgICAgICAgfVxuICAgICAgfVxuICAgICAgYm9keUhlaWdodCArPSBrZXlmcmFtZXNbaV0uZHVyYXRpb247XG4gICAgICBpZigkLmluQXJyYXkoa2V5ZnJhbWVzW2ldLndyYXBwZXIsIHdyYXBwZXJzKSA9PSAtMSkge1xuICAgICAgICB3cmFwcGVycy5wdXNoKGtleWZyYW1lc1tpXS53cmFwcGVyKTtcbiAgICAgIH1cbiAgICAgIGZvcihqPTA7ajxrZXlmcmFtZXNbaV0uYW5pbWF0aW9ucy5sZW5ndGg7aisrKSB7IC8vIGxvb3AgYW5pbWF0aW9uc1xuICAgICAgICBPYmplY3Qua2V5cyhrZXlmcmFtZXNbaV0uYW5pbWF0aW9uc1tqXSkuZm9yRWFjaChmdW5jdGlvbihrZXkpIHsgLy8gbG9vcCBwcm9wZXJ0aWVzXG4gICAgICAgICAgdmFyIHZhbHVlID0ga2V5ZnJhbWVzW2ldLmFuaW1hdGlvbnNbal1ba2V5XTtcbiAgICAgICAgICBpZihrZXkgIT09ICdzZWxlY3RvcicgJiYgdmFsdWUgaW5zdGFuY2VvZiBBcnJheSA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgIHZhciB2YWx1ZVNldCA9IFtdO1xuICAgICAgICAgICAgdmFsdWVTZXQucHVzaChnZXREZWZhdWx0UHJvcGVydHlWYWx1ZShrZXkpLCB2YWx1ZSk7XG4gICAgICAgICAgICB2YWx1ZSA9IHZhbHVlU2V0O1xuICAgICAgICAgIH1cbiAgICAgICAgICBrZXlmcmFtZXNbaV0uYW5pbWF0aW9uc1tqXVtrZXldID0gdmFsdWU7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBmcmFtZUZvY3VzOiBpbml0RnJhbWVzLFxuICAgIGJvZHlIZWlnaHQ6IGJvZHlIZWlnaHQsXG4gICAgd3JhcHBlcnM6IHdyYXBwZXJzXG4gIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzLmdldERlZmF1bHRQcm9wZXJ0eVZhbHVlID0gZ2V0RGVmYXVsdFByb3BlcnR5VmFsdWU7XG5cbmZ1bmN0aW9uIGdldERlZmF1bHRQcm9wZXJ0eVZhbHVlKHByb3BlcnR5KSB7XG4gIHN3aXRjaCAocHJvcGVydHkpIHtcbiAgICBjYXNlICd0cmFuc2xhdGVYJzpcbiAgICAgIHJldHVybiAwO1xuICAgIGNhc2UgJ3RyYW5zbGF0ZVknOlxuICAgICAgcmV0dXJuIDA7XG4gICAgY2FzZSAnc2NhbGUnOlxuICAgICAgcmV0dXJuIDE7XG4gICAgY2FzZSAncm90YXRlJzpcbiAgICAgIHJldHVybiAwO1xuICAgIGNhc2UgJ29wYWNpdHknOlxuICAgICAgcmV0dXJuIDE7XG4gICAgZGVmYXVsdDpcbiAgICAgIHJldHVybiBudWxsO1xuICB9XG59XG5cblxuXG4vKiogV0VCUEFDSyBGT09URVIgKipcbiAqKiAuL3NjZW5lLW1ha2VyL3V0aWxzL3BhZ2UtdXRpbHMuanNcbiAqKi8iLCJjb25zdCBLZWZpciA9IHJlcXVpcmUoJ2tlZmlyJylcblxuY29uc3Qgb2JzY2VuZSA9IHJlcXVpcmUoJy4uL29iLXNjZW5lLmpzJylcblxubW9kdWxlLmV4cG9ydHMuaW5pdCA9IGZ1bmN0aW9uKCkge1xuXG4gIHZhciBQTEFZX1NQRUVEID0gMTA7XG5cbiAgdmFyIGlzUGxheWluZyA9IGZhbHNlO1xuICB2YXIgaXNQbGF5aW5nSW50ZXJ2YWw7XG4gIHZhciBib2R5SGVpZ2h0ID0gJCgnYm9keScpLmhlaWdodCgpO1xuICB2YXIgbmE9MDtcblxuICBjb25zdCBrZXlVcFByZXNzZWQgPSBLZWZpci5mcm9tRXZlbnRzKGRvY3VtZW50LCAna2V5dXAnLCBmdW5jdGlvbihlKXtcbiAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgcmV0dXJuIGU7XG4gIH0pO1xuXG4gIGNvbnN0IGJhY2tLZXkgPSBrZXlVcFByZXNzZWRcbiAgICAuZmlsdGVyKGUgPT4gZS5rZXlDb2RlID09PSAzOClcbiAgY29uc3QgbmV4dEtleSA9IGtleVVwUHJlc3NlZFxuICAgIC5maWx0ZXIoZSA9PiBlLmtleUNvZGUgPT09IDQwKVxuXG4gIGNvbnN0IHRvZ2dsZVVwQ2xpY2tlZCA9IEtlZmlyLmZyb21FdmVudHMoJChcIiN0b2dnbGVVcFwiKSwgJ2NsaWNrJylcbiAgY29uc3QgdG9nZ2xlRG93bkNsaWNrZWQgPSBLZWZpci5mcm9tRXZlbnRzKCQoXCIjdG9nZ2xlRG93blwiKSwgJ2NsaWNrJylcblxuICBLZWZpci5tZXJnZShbbmV4dEtleSwgdG9nZ2xlRG93bkNsaWNrZWRdKVxuICAgIC5vblZhbHVlKGUgPT4ge1xuICAgICAgb2JzY2VuZS5hY3Rpb24oJ25leHQnKVxuICAgIH0pXG5cbiAgS2VmaXIubWVyZ2UoW2JhY2tLZXksIHRvZ2dsZVVwQ2xpY2tlZF0pXG4gICAgLm9uVmFsdWUoZSA9PiB7XG4gICAgICBvYnNjZW5lLmFjdGlvbigncHJldmlvdXMnKVxuICAgIH0pXG5cbiAgJChcIiN0b2dnbGVQbGF5XCIpLm9uKCdjbGljaycsIGZ1bmN0aW9uKGUpIHtcbiAgICBjb25zb2xlLmxvZyhcIkNMSUNLXCIpO1xuICAgIGlmKGlzUGxheWluZykgeyBwYXVzZSgpIH0gZWxzZSB7IHBsYXkoKSB9XG4gIH0pXG5cbiAga2V5VXBQcmVzc2VkXG4gICAgLmZpbHRlcihlID0+IGUua2V5Q29kZSA9PT0gODAgfHwgZS5rZXlDb2RlID09PSAzMilcbiAgICAub25WYWx1ZShlID0+IHtcbiAgICAgIGlmIChpc1BsYXlpbmcpIHsgcGF1c2UoKSB9IGVsc2UgeyBwbGF5KCkgfVxuICAgIH0pXG5cbiAgZnVuY3Rpb24gcGxheSgpIHtcbiAgICBjb25zb2xlLmxvZyhcIlBMQVlcIilcbiAgICBpc1BsYXlpbmdJbnRlcnZhbCA9IHNldEludGVydmFsKGZ1bmN0aW9uKCkge1xuICAgICAgb2JzY2VuZS5hY3Rpb24oJ25leHQnKTtcbiAgICB9LCA1MDAwKTtcbiAgICAkKFwiI3RvZ2dsZVBsYXlcIikucmVtb3ZlQ2xhc3MoJ2ZhLXBsYXknKS5hZGRDbGFzcygnZmEtcGF1c2UnKTtcbiAgICBpc1BsYXlpbmcgPSB0cnVlO1xuICB9XG5cbiAgZnVuY3Rpb24gcGF1c2UoKSB7XG4gICAgY29uc29sZS5sb2coXCJQQVVTRVwiKTtcbiAgICBjbGVhckludGVydmFsKGlzUGxheWluZ0ludGVydmFsKTtcbiAgICBpc1BsYXlpbmcgPSBmYWxzZTtcbiAgICAkKFwiI3RvZ2dsZVBsYXlcIikucmVtb3ZlQ2xhc3MoJ2ZhLXBhdXNlJykuYWRkQ2xhc3MoJ2ZhLXBsYXknKTtcbiAgfVxufTtcblxuXG5cbi8qKiBXRUJQQUNLIEZPT1RFUiAqKlxuICoqIC4vc2NlbmUtbWFrZXIvdXNlci9jb250cm9scy5qc1xuICoqLyIsIi8qXG4gKiAgRGVwZW5kZW5jaWVzXG4qL1xuXG4gIGNvbnN0IG9ic2NlbmUgPSByZXF1aXJlKCcuLi9vYi1zY2VuZS5qcycpXG4gIGNvbnN0IHBhZ2VVdGlscyA9IHJlcXVpcmUoJy4uL3V0aWxzL3BhZ2UtdXRpbHMuanMnKVxuXG4vKlxuICogIFN0cmVhbXNcbiovXG5cbiAgY29uc3Qgc2Nyb2xsVG9wQ2hhbmdlZCA9IG9ic2NlbmUuc2Nyb2xsVG9wQ2hhbmdlZFxuICBjb25zdCBkaW1lbnNpb25zQ2FsY3VsYXRlZCA9IG9ic2NlbmUuZGltZW5zaW9uc0NhbGN1bGF0ZWRcbiAgY29uc3Qgd3JhcHBlckNoYW5nZWQgPSBvYnNjZW5lLndyYXBwZXJDaGFuZ2VkXG5cbi8qXG4gKiAgRE9NIEVsZW1lbnRzXG4qL1xuXG4gIGNvbnN0ICR3aW5kb3cgPSAkKHdpbmRvdylcbiAgY29uc3QgJGJvZHkgPSAkKCdib2R5JylcbiAgY29uc3QgJGJvZHlodG1sID0gJCgnYm9keSxodG1sJylcbiAgY29uc3QgJGV4cGVyaWVuY2VJbmRpY2F0b3IgPSAkKCcjZXhwZXJpZW5jZS1wcm9ncmVzcyAucHJvZ3Jlc3MnKVxuXG4vKlxuICogIENoaWxkIFJlbmRlcnNcbiovXG5cbiAgY29uc3QgcmVuZGVyV3JhcHBlciA9IHJlcXVpcmUoJy4vd3JhcHBlci5qcycpXG4gIGNvbnN0IHJlbmRlclNjcm9sbGJhciA9IHJlcXVpcmUoJy4vc2Nyb2xsYmFyLmpzJylcbiAgY29uc3QgcmVuZGVyQXVkaW9QbGF5ZXIgPSByZXF1aXJlKCcuL2F1ZGlvcGxheWVyLmpzJylcbiAgY29uc3QgcmVuZGVyVmlkZW9QbGF5ZXIgPSByZXF1aXJlKCcuL3ZpZGVvcGxheWVyLmpzJylcbiAgY29uc3QgcmVuZGVyRXJyb3IgPSByZXF1aXJlKCcuL2Vycm9yLmpzJylcblxuLypcbiAqICBSZW5kZXJcbiovXG5cbiAgLy8gSGFjayB0byBmb3JjZSByZXNpemUgb25jZS4gRm9yIHNvbWVcbiAgLy8gcmVhc29uIHRoaXMgcHJldmVudHMgdGhlIGFuaW1hdGlvbnMgZnJvbSBibGlua2luZyBvbiBDaHJvbWVcbiAgc2Nyb2xsVG9wQ2hhbmdlZC50YWtlKDEpLmRlbGF5KDUwMCkub25WYWx1ZSgoKSA9PiB7XG4gICAgJHdpbmRvdy50cmlnZ2VyKCdyZXNpemUnKVxuICB9KVxuXG4gIC8vIFJlbmRlciBEaW1lbnNpb25zXG4gIGRpbWVuc2lvbnNDYWxjdWxhdGVkLm9uVmFsdWUoc3RhdGUgPT4ge1xuICAgICRib2R5LmhlaWdodChzdGF0ZS5ib2R5SGVpZ2h0KVxuICAgIHJlbmRlclNjcm9sbEJhckZvY3VzQmFycyhzdGF0ZSlcbiAgfSlcblxuICAgIGZ1bmN0aW9uIHJlbmRlclNjcm9sbEJhckZvY3VzQmFycyhzdGF0ZSkge1xuICAgICAgc3RhdGUuZnJhbWVGb2N1c1xuICAgICAgICAubWFwKChmb2N1cykgPT4gKGZvY3VzIC8gc3RhdGUuYm9keUhlaWdodCkudG9GaXhlZCgyKSAqIDEwMCkgLy8gQ29udmVydCB0byBwZXJjZW50XG4gICAgICAgIC5tYXAoKGZvY3VzUGVyY2VudCkgPT4gZm9jdXNQZXJjZW50ICsgXCJ2aFwiKSAvLyBDb252ZXJ0IHRvIHZoXG4gICAgICAgIC5tYXAoKGZvY3VzVmgpID0+IHtcbiAgICAgICAgICAkKFwiI2V4cGVyaWVuY2UtcHJvZ3Jlc3NcIilcbiAgICAgICAgICAgIC5hcHBlbmQoJzxkaXYgY2xhc3M9XCJjZW50ZXItbWFya2VyXCIgc3R5bGU9XCJ0b3A6JyArIGZvY3VzVmggKyAnXCI+PC9kaXY+JylcbiAgICAgICAgfSlcbiAgICB9XG5cbiAgLy8gUmVuZGVyIFdyYXBwZXJcbiAgd3JhcHBlckNoYW5nZWQub25WYWx1ZSgoY3VycmVudFdyYXBwZXIpID0+IHtcbiAgICAvLyBjb25zb2xlLmxvZyhcIldSQVBQRVIgQ0hBTkdFRFwiKTtcbiAgICB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKCgpID0+IHtcbiAgICAgICQoY3VycmVudFdyYXBwZXJbMF0pLmhpZGUoKVxuICAgICAgJChjdXJyZW50V3JhcHBlclsxXSkuc2hvdygpXG5cbiAgICAgIHdpbmRvdy5sb2NhdGlvbi5oYXNoID0gY3VycmVudFdyYXBwZXJbMV1cbiAgICAgIGdhKCdzZW5kJywgJ3NjZW5lX2FjY2Vzc2VkJywgY3VycmVudFdyYXBwZXJbMV0pIC8vIEdvb2dsZSBBbmFseXRpY3NcbiAgICAgIHJlbmRlclZpZGVvKGN1cnJlbnRXcmFwcGVyKVxuICAgICAgcmVuZGVyQXVkaW8oY3VycmVudFdyYXBwZXIpXG4gICAgfSlcbiAgfSlcblxuICAgIGZ1bmN0aW9uIHNob3dDdXJyZW50V3JhcHBlcnMocHJldiwgbmV4dCkge1xuICAgICAgaWYgKHByZXYuY3VycmVudFdyYXBwZXIgPT09IG5leHQuY3VycmVudFdyYXBwZXIpIHsgcmV0dXJuIGZhbHNlIH1cbiAgICAgIC8vIGNvbnNvbGUubG9nKCdwcmV2aW91cycsIHByZXYsIG5leHQpXG4gICAgICAkKHByZXYuY3VycmVudFdyYXBwZXIpLmhpZGUoKVxuICAgICAgJChuZXh0LmN1cnJlbnRXcmFwcGVyKS5zaG93KClcbiAgICB9XG5cbiAgICBmdW5jdGlvbiByZW5kZXJWaWRlbyhzdGF0ZSkge1xuXG4gICAgICAgICQoJ3ZpZGVvJywgc3RhdGVbMF0pLmFuaW1hdGUoe1xuICAgICAgICAgIHZvbHVtZTogMFxuICAgICAgICB9LCAzMDAsICdzd2luZycsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIC8vIHJlYWxseSBzdG9wIHRoZSB2aWRlb1xuICAgICAgICAgICQodGhpcykuZ2V0KDApLnBhdXNlKClcbiAgICAgICAgfSlcblxuICAgICAgICBsZXQgJG5ld1ZpZGVvID0gJCgndmlkZW8nLCBzdGF0ZVsxXSlcblxuICAgICAgICBpZiAoJG5ld1ZpZGVvWzBdKSB7XG4gICAgICAgICAgJG5ld1ZpZGVvWzBdLnBsYXkoKVxuICAgICAgICAgICRuZXdWaWRlby5hbmltYXRlKHtcbiAgICAgICAgICAgIHZvbHVtZTogJG5ld1ZpZGVvLmF0dHIoJ21heC12b2x1bWUnKSB8fCAxXG4gICAgICAgICAgfSwgMzAwLCAnc3dpbmcnKVxuICAgICAgICAgIHJlbmRlclZpZGVvUGxheWVyLnN0YXJ0KCRuZXdWaWRlbylcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZW5kZXJWaWRlb1BsYXllci5zdG9wKCRuZXdWaWRlbylcbiAgICAgICAgfVxuXG4gICAgfVxuICAgIGZ1bmN0aW9uIHJlbmRlckF1ZGlvKHN0YXRlKSB7XG4gICAgICByZW5kZXJBdWRpb1BsYXllci5uZXh0KHN0YXRlWzFdLnN1YnN0cigxKSk7XG4gICAgfVxuXG4gIC8vIFJlbmRlciBLZXlmcmFtZXNcblxuICBzY3JvbGxUb3BDaGFuZ2VkLm9uVmFsdWUoKHN0YXRlZGlmZikgPT4ge1xuXG4gICAgd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSgoKSA9PiB7XG4gICAgICAgIGxldCBwcmV2ID0gc3RhdGVkaWZmWzBdXG4gICAgICAgIGxldCBuZXh0ID0gc3RhdGVkaWZmWzFdXG5cbiAgICAgICAgYW5pbWF0ZUVsZW1lbnRzKG5leHQpXG4gICAgICAgIGFuaW1hdGVTY3JvbGxCYXIobmV4dClcbiAgICAgICAgLy8gcmVuZGVyTXVzaWMobmV4dClcbiAgICB9KVxuXG4gIH0pXG5cbiAgICBmdW5jdGlvbiByZW5kZXJNdXNpYyh3cmFwcGVySWQpIHtcbiAgICAgIGF1ZGlvcGxheWVyLm5leHQod3JhcHBlcklkLnN1YnN0cigxKSlcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBhbmltYXRlU2Nyb2xsQmFyKHN0YXRlKSB7XG4gICAgICB2YXIgcGVyY2VudCA9IChzdGF0ZS5zY3JvbGxUb3AgLyBzdGF0ZS5ib2R5SGVpZ2h0KS50b0ZpeGVkKDIpICogMTAwXG4gICAgICAkZXhwZXJpZW5jZUluZGljYXRvci5jc3Moe1xuICAgICAgICAndHJhbnNmb3JtJzogJ3RyYW5zbGF0ZVkoJyArIHBlcmNlbnQgKyAnJSknXG4gICAgICB9KVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGFuaW1hdGVFbGVtZW50cyhzdGF0ZSkge1xuICAgICAgdmFyIGFuaW1hdGlvbiwgdHJhbnNsYXRlWSwgdHJhbnNsYXRlWCwgc2NhbGUsIHJvdGF0ZSwgb3BhY2l0eVxuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBzdGF0ZS5rZXlmcmFtZXNbc3RhdGUuY3VycmVudEtleWZyYW1lXS5hbmltYXRpb25zLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGFuaW1hdGlvbiA9IHN0YXRlLmtleWZyYW1lc1tzdGF0ZS5jdXJyZW50S2V5ZnJhbWVdLmFuaW1hdGlvbnNbaV1cbiAgICAgICAgdHJhbnNsYXRlWSA9IGNhbGNQcm9wVmFsdWUoYW5pbWF0aW9uLCAndHJhbnNsYXRlWScsIHN0YXRlKVxuICAgICAgICB0cmFuc2xhdGVYID0gY2FsY1Byb3BWYWx1ZShhbmltYXRpb24sICd0cmFuc2xhdGVYJywgc3RhdGUpXG4gICAgICAgIHNjYWxlID0gY2FsY1Byb3BWYWx1ZShhbmltYXRpb24sICdzY2FsZScsIHN0YXRlKVxuICAgICAgICByb3RhdGUgPSBjYWxjUHJvcFZhbHVlKGFuaW1hdGlvbiwgJ3JvdGF0ZScsIHN0YXRlKVxuICAgICAgICBvcGFjaXR5ID0gY2FsY1Byb3BWYWx1ZShhbmltYXRpb24sICdvcGFjaXR5Jywgc3RhdGUpXG4gICAgICAgICQoYW5pbWF0aW9uLnNlbGVjdG9yLCBzdGF0ZS5jdXJyZW50V3JhcHBlcikuY3NzKHtcbiAgICAgICAgICAndHJhbnNmb3JtJzogJ3RyYW5zbGF0ZTNkKCcgKyB0cmFuc2xhdGVYICsgJ3B4LCAnICsgdHJhbnNsYXRlWSArICdweCwgMCkgc2NhbGUoJyArIHNjYWxlICsgJykgcm90YXRlKCcgKyByb3RhdGUgKyAnZGVnKScsXG4gICAgICAgICAgJ29wYWNpdHknOiBvcGFjaXR5LnRvRml4ZWQoMilcbiAgICAgICAgfSlcblxuICAgICAgfVxuICAgIH1cblxuICAgICAgZnVuY3Rpb24gY2FsY1Byb3BWYWx1ZShhbmltYXRpb24sIHByb3BlcnR5LCBzdGF0ZSkge1xuICAgICAgICBsZXQgdmFsdWUgPSBhbmltYXRpb25bcHJvcGVydHldXG4gICAgICAgIGlmICh2YWx1ZSkge1xuICAgICAgICAgIHZhbHVlID0gZWFzZUluT3V0UXVhZChzdGF0ZS5yZWxhdGl2ZVNjcm9sbFRvcCwgdmFsdWVbMF0sICh2YWx1ZVsxXSAtIHZhbHVlWzBdKSwgc3RhdGUua2V5ZnJhbWVzW3N0YXRlLmN1cnJlbnRLZXlmcmFtZV0uZHVyYXRpb24pXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdmFsdWUgPSBwYWdlVXRpbHMuZ2V0RGVmYXVsdFByb3BlcnR5VmFsdWUocHJvcGVydHkpXG4gICAgICAgIH1cbiAgICAgICAgLy8gdmFsdWUgPSArdmFsdWUudG9GaXhlZCgyKVxuICAgICAgICAvLyBURU1QT1JBUklMWSBSRU1PVkVEIENBVVNFIFNDQUxFIERPRVNOJ1QgV09SSyBXSVRIQSBBR1JFU1NJVkUgUk9VTkRJTkcgTElLRSBUSElTXG4gICAgICAgIHJldHVybiB2YWx1ZVxuICAgICAgfVxuXG4gICAgICBmdW5jdGlvbiBnZXREZWZhdWx0UHJvcGVydHlWYWx1ZShwcm9wZXJ0eSkge1xuICAgICAgICBzd2l0Y2ggKHByb3BlcnR5KSB7XG4gICAgICAgICAgY2FzZSAndHJhbnNsYXRlWCc6XG4gICAgICAgICAgICByZXR1cm4gMFxuICAgICAgICAgIGNhc2UgJ3RyYW5zbGF0ZVknOlxuICAgICAgICAgICAgcmV0dXJuIDBcbiAgICAgICAgICBjYXNlICdzY2FsZSc6XG4gICAgICAgICAgICByZXR1cm4gMVxuICAgICAgICAgIGNhc2UgJ3JvdGF0ZSc6XG4gICAgICAgICAgICByZXR1cm4gMFxuICAgICAgICAgIGNhc2UgJ29wYWNpdHknOlxuICAgICAgICAgICAgcmV0dXJuIDFcbiAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgcmV0dXJuIG51bGxcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBmdW5jdGlvbiBlYXNlSW5PdXRRdWFkKHQsIGIsIGMsIGQpIHtcbiAgICAgICAgLy9zaW51c29hZGlhbCBpbiBhbmQgb3V0XG4gICAgICAgIHJldHVybiAtYyAvIDIgKiAoTWF0aC5jb3MoTWF0aC5QSSAqIHQgLyBkKSAtIDEpICsgYlxuICAgICAgfVxuXG5cblxuLyoqIFdFQlBBQ0sgRk9PVEVSICoqXG4gKiogLi9zY2VuZS1tYWtlci9yZW5kZXIvaW5kZXguanNcbiAqKi8iLCJmdW5jdGlvbiByZW5kZXJTY3JvbGwoc2Nyb2xsKSB7XG4gIGNvbnNvbGUubG9nKFwiUkVOREVSXCIsIHNjcm9sbCwgTWF0aC5mbG9vcigkd2luZG93LnNjcm9sbFRvcCgpKSlcbiAgICAkYm9keWh0bWwuYW5pbWF0ZSh7IHNjcm9sbFRvcDogc2Nyb2xsIH0sIDE1MDAsICdsaW5lYXInKTtcbn1cblxuZnVuY3Rpb24gYW5pbWF0ZVNjcm9sbEJhcigpIHtcbiAgdmFyIHBlcmNlbnQgPSAoc2Nyb2xsVG9wIC8gYm9keUhlaWdodCkudG9GaXhlZCgyKSAqIDEwMDtcbiAgJGV4cGVyaWVuY2VJbmRpY2F0b3IuY3NzKHtcbiAgICAgICd0cmFuc2Zvcm0nOiAgICAndHJhbnNsYXRlWSgnICsgcGVyY2VudCArICclKSdcbiAgICB9KTtcbn1cbmZ1bmN0aW9uIGJ1aWxkU2Nyb2xsQmFyQ2VudGVycygpIHtcbiAgZnJhbWVGb2N1c1xuICAgIC5tYXAoKGNlbnRlcikgPT4gKGNlbnRlciAvIGJvZHlIZWlnaHQpLnRvRml4ZWQoMikgKiAxMDApXG4gICAgLm1hcCgoY2VudGVyUGVyY2VudCkgPT4gY2VudGVyUGVyY2VudCArIFwidmhcIiApXG4gICAgLm1hcCgoY2VudGVyVmgpID0+IHtcbiAgICAgICQoXCIjZXhwZXJpZW5jZS1wcm9ncmVzc1wiKVxuICAgICAgICAuYXBwZW5kKCc8ZGl2IGNsYXNzPVwiY2VudGVyLW1hcmtlclwiIHN0eWxlPVwidG9wOicrIGNlbnRlclZoICsnXCI+PC9kaXY+Jyk7XG4gICAgfSk7XG59XG5cblxuXG4vKiogV0VCUEFDSyBGT09URVIgKipcbiAqKiAuL3NjZW5lLW1ha2VyL3JlbmRlci9zY3JvbGxiYXIuanNcbiAqKi8iLCIvLyBOT1RFOiBUaGlzIGZpbGUgcmVsaWVzIGhlYXZpbHkgb24gd2VicGFjayBmb3IgcmVxdWlyZXMgb2YgaHRtbCBhbmQganNvbiBjb25maWcgZmlsZXMuXG5jb25zdCBLZWZpciA9IHJlcXVpcmUoJ2tlZmlyJyk7XG5cbi8vIENvbnN0YW50c1xuY29uc3QgU0NFTkVTX0RJUkVDVE9SWSA9ICcuLi8uLi9zY2VuZXMvJzsgLy8gVE9ETzogU0NFTkVTX0RJUkVDVE9SWSBkb2Vzbid0IHNlZW0gdG8gd29yayB3aXRoIHdlYnBhY2sncyBodG1sICYganNvbiBsb2FkZXIuXG5jb25zdCBTQ0VORV9JTkRFWCA9IHJlcXVpcmUoJ2pzb24hLi4vLi4vc2NlbmVzL2luZGV4Lmpzb24nKTtcbmNvbnN0IFNDRU5FX0NPTlRBSU5FUl9DU1NfQ0xBU1MgPSAnd3JhcHBlcic7XG5cbi8qXG4gKiBHZW5lcmF0ZXMgYW4gSFRNTCBzdHJpbmcgZnJvbSBzY2VuZS5odG1sIGZpbGVzIHRoZSBzY2VuZXMgZm9sZGVyLlxuICogQ3JlYXRlcyBhIHdyYXBwZXIgZGl2IHRoYXQgcHJvdmlkZXMgZmVlZGJhY2suXG4gKi9cbm1vZHVsZS5leHBvcnRzLnJlbmRlckhUTUwgPSBmdW5jdGlvbigpIHtcblxuICByZXR1cm4gU0NFTkVfSU5ERVhcbiAgICAubWFwKHNjZW5lID0+IHNjZW5lLmlkKVxuICAgIC5tYXAoZnVuY3Rpb24oc2NlbmVOYW1lKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICBodG1sOiByZXF1aXJlKFwiaHRtbD9hdHRycz1mYWxzZSEuLi8uLi9zY2VuZXMvXCIgKyBzY2VuZU5hbWUgKyBcIi9zY2VuZS5odG1sXCIpLFxuICAgICAgICAgICAgICBuYW1lOiBzY2VuZU5hbWVcbiAgICAgICAgICAgIH1cbiAgICB9KVxuICAgIC5tYXAoZnVuY3Rpb24oc2NlbmVPYmplY3QpIHsgLy8gQ3JlYXRlIHdyYXBwZXIgZGl2IGZvciBodG1sXG4gICAgICAgIHZhciAkd3JhcHBlciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgICAgICAkd3JhcHBlci5jbGFzc0xpc3QuYWRkKFNDRU5FX0NPTlRBSU5FUl9DU1NfQ0xBU1MpO1xuICAgICAgICAkd3JhcHBlci5zZXRBdHRyaWJ1dGUoJ2lkJywgc2NlbmVPYmplY3QubmFtZSk7XG4gICAgICAgICR3cmFwcGVyLmlubmVySFRNTCA9IHNjZW5lT2JqZWN0Lmh0bWw7XG4gICAgICAgIHJldHVybiAkd3JhcHBlci5vdXRlckhUTUw7XG4gICAgfSlcbiAgICAucmVkdWNlKGZ1bmN0aW9uKHByZXYsIG5leHQpIHsgLy8gQ29uY2F0IHRvIDEgaHRtbCBzdHJpbmdcbiAgICAgIHJldHVybiBwcmV2ICsgbmV4dDtcbiAgICB9LCAnJyk7XG5cbn1cblxubW9kdWxlLmV4cG9ydHMuZ2V0U2NlbmVzID0gY3JlYXRlSFRNTEZvclNjZW5lcztcblxuZnVuY3Rpb24gY3JlYXRlSFRNTEZvclNjZW5lcygpIHtcbiAgcmV0dXJuIFNDRU5FX0lOREVYXG4gICAgLm1hcChzY2VuZSA9PiBzY2VuZS5pZClcbiAgICAubWFwKGZ1bmN0aW9uKHNjZW5lTmFtZSkgeyAvLyBnZXQgdGhlIHNjZW5lcyh3aGljaCBhcmUgaW4gYXJyYXlzKVxuICAgICAgcmV0dXJuIHJlcXVpcmUoXCJqc29uIS4uLy4uL3NjZW5lcy9cIiArIHNjZW5lTmFtZSArIFwiL3NjZW5lLmpzb25cIilcbiAgICB9KVxuICAgIC5yZWR1Y2UoZnVuY3Rpb24ocHJldiwgY3VycmVudCkgeyAvLyBmbGF0dGVuIGFycmF5cyBieSBjb25jYXRpbmcgaW50byBhIG5ldyBhcnJheVxuICAgICAgcmV0dXJuIHByZXYuY29uY2F0KGN1cnJlbnQpO1xuICAgIH0sIFtdKVxufVxuXG5tb2R1bGUuZXhwb3J0cy5nZXRBdWRpb0NvbmZpZyA9IGZ1bmN0aW9uKCkge1xuXG4gIHJldHVybiBTQ0VORV9JTkRFWFxuICAgIC5tYXAoc2NlbmUgPT4gc2NlbmUpXG5cbn1cblxuXG5cbi8qKiBXRUJQQUNLIEZPT1RFUiAqKlxuICoqIC4vc2NlbmUtbWFrZXIvdXRpbHMvc2NlbmUtdXRpbHMuanNcbiAqKi8iLCJtb2R1bGUuZXhwb3J0cyA9IFtcblx0e1xuXHRcdFwiaWRcIjogXCJpbnRyb1wiLFxuXHRcdFwiYXVkaW9cIjoge1xuXHRcdFx0XCJzcmNcIjogXCIxXCIsXG5cdFx0XHRcIm1heFwiOiAwLjAxXG5cdFx0fVxuXHR9LFxuXHR7XG5cdFx0XCJpZFwiOiBcImRveW91ZmVlbG11c2xpbVwiLFxuXHRcdFwiYXVkaW9cIjoge1xuXHRcdFx0XCJzcmNcIjogXCIxXCIsXG5cdFx0XHRcIm1heFwiOiAwLjVcblx0XHR9XG5cdH0sXG5cdHtcblx0XHRcImlkXCI6IFwiYWJvdXR5b3Vyc2VsZlwiLFxuXHRcdFwiYXVkaW9cIjoge1xuXHRcdFx0XCJzcmNcIjogXCIxXCIsXG5cdFx0XHRcIm1heFwiOiAwLjVcblx0XHR9XG5cdH0sXG5cdHtcblx0XHRcImlkXCI6IFwicmVhY3Rpb25zdG90ZXJyb3JcIixcblx0XHRcImF1ZGlvXCI6IHtcblx0XHRcdFwic3JjXCI6IFwiMlwiLFxuXHRcdFx0XCJtYXhcIjogMC4zXG5cdFx0fVxuXHR9LFxuXHR7XG5cdFx0XCJpZFwiOiBcImZlZWxpbmdjb25mdXNlZFwiLFxuXHRcdFwiYXVkaW9cIjoge1xuXHRcdFx0XCJzcmNcIjogXCIzXCIsXG5cdFx0XHRcIm1heFwiOiAwLjVcblx0XHR9XG5cdH0sXG5cdHtcblx0XHRcImlkXCI6IFwib3V0dG9nZXR5b3VcIixcblx0XHRcImF1ZGlvXCI6IHtcblx0XHRcdFwic3JjXCI6IFwiM1wiLFxuXHRcdFx0XCJtYXhcIjogMC41XG5cdFx0fVxuXHR9LFxuXHR7XG5cdFx0XCJpZFwiOiBcInNvbWV0aGluZ3RvcHJvdmVcIixcblx0XHRcImF1ZGlvXCI6IHtcblx0XHRcdFwic3JjXCI6IFwiNFwiLFxuXHRcdFx0XCJtYXhcIjogMC41XG5cdFx0fVxuXHR9LFxuXHR7XG5cdFx0XCJpZFwiOiBcIml0aXNudGVhc3lcIixcblx0XHRcImF1ZGlvXCI6IHtcblx0XHRcdFwic3JjXCI6IFwiNVwiLFxuXHRcdFx0XCJtYXhcIjogMC41XG5cdFx0fVxuXHR9LFxuXHR7XG5cdFx0XCJpZFwiOiBcIm1peGVkZmVlbGluZ3NcIixcblx0XHRcImF1ZGlvXCI6IHtcblx0XHRcdFwic3JjXCI6IFwiNlwiLFxuXHRcdFx0XCJtYXhcIjogMC41XG5cdFx0fVxuXHR9LFxuXHR7XG5cdFx0XCJpZFwiOiBcImRpZmZlcmVudHByYWN0aWNlc1wiLFxuXHRcdFwiYXVkaW9cIjoge1xuXHRcdFx0XCJzcmNcIjogXCI2XCIsXG5cdFx0XHRcIm1heFwiOiAwLjVcblx0XHR9XG5cdH0sXG5cdHtcblx0XHRcImlkXCI6IFwieWV0dGhhdHNva2F5XCIsXG5cdFx0XCJhdWRpb1wiOiB7XG5cdFx0XHRcInNyY1wiOiBcIjZcIixcblx0XHRcdFwibWF4XCI6IDAuNVxuXHRcdH1cblx0fSxcblx0e1xuXHRcdFwiaWRcIjogXCJpdHNnb3R0b2VuZFwiLFxuXHRcdFwiYXVkaW9cIjoge1xuXHRcdFx0XCJzcmNcIjogXCI3XCIsXG5cdFx0XHRcIm1heFwiOiAwLjVcblx0XHR9XG5cdH0sXG5cdHtcblx0XHRcImlkXCI6IFwiaXdhbnRteWlzbGFtYmFjazFcIixcblx0XHRcImF1ZGlvXCI6IHtcblx0XHRcdFwic3JjXCI6IFwiN1wiLFxuXHRcdFx0XCJtYXhcIjogMC41XG5cdFx0fVxuXHR9LFxuXHR7XG5cdFx0XCJpZFwiOiBcIndob2FyZXRoZXlcIixcblx0XHRcImF1ZGlvXCI6IHtcblx0XHRcdFwic3JjXCI6IFwiN1wiLFxuXHRcdFx0XCJtYXhcIjogMC41XG5cdFx0fVxuXHR9LFxuXHR7XG5cdFx0XCJpZFwiOiBcImlzaXNmaWdodG1pc3F1b3RlXCIsXG5cdFx0XCJhdWRpb1wiOiB7XG5cdFx0XHRcInNyY1wiOiBcIjhcIixcblx0XHRcdFwibWF4XCI6IDAuNVxuXHRcdH1cblx0fSxcblx0e1xuXHRcdFwiaWRcIjogXCJpc2lzYXBvY2FseXBzZW1pc3F1b3RlXCIsXG5cdFx0XCJhdWRpb1wiOiB7XG5cdFx0XHRcInNyY1wiOiBcIjhcIixcblx0XHRcdFwibWF4XCI6IDAuNVxuXHRcdH1cblx0fSxcblx0e1xuXHRcdFwiaWRcIjogXCJpc2lzYWZ0ZXJsaWZlZmFsbGFjeVwiLFxuXHRcdFwiYXVkaW9cIjoge1xuXHRcdFx0XCJzcmNcIjogXCI4XCIsXG5cdFx0XHRcIm1heFwiOiAwLjVcblx0XHR9XG5cdH0sXG5cdHtcblx0XHRcImlkXCI6IFwid2hhdGlzbGFtaWNoaXN0b3J5cHJlZmVyc1wiLFxuXHRcdFwiYXVkaW9cIjoge1xuXHRcdFx0XCJzcmNcIjogXCIxMFwiLFxuXHRcdFx0XCJtYXhcIjogMC4yXG5cdFx0fVxuXHR9LFxuXHR7XG5cdFx0XCJpZFwiOiBcImlzaXNiYW5rcnVwdFwiLFxuXHRcdFwiYXVkaW9cIjoge1xuXHRcdFx0XCJzcmNcIjogXCIxMFwiLFxuXHRcdFx0XCJtYXhcIjogMC41XG5cdFx0fVxuXHR9LFxuXHR7XG5cdFx0XCJpZFwiOiBcImlzaXN3YW50c3RvZGl2aWRlXCIsXG5cdFx0XCJhdWRpb1wiOiB7XG5cdFx0XHRcInNyY1wiOiBcIjdcIixcblx0XHRcdFwibWF4XCI6IDAuNVxuXHRcdH1cblx0fSxcblx0e1xuXHRcdFwiaWRcIjogXCJiYXR0bGVvZmFnZW5lcmF0aW9uXCIsXG5cdFx0XCJhdWRpb1wiOiB7XG5cdFx0XHRcInNyY1wiOiBcIjlcIixcblx0XHRcdFwibWF4XCI6IDAuNVxuXHRcdH1cblx0fSxcblx0e1xuXHRcdFwiaWRcIjogXCJjb21wbGljYXRlZHNpdHVhdGlvblwiLFxuXHRcdFwiYXVkaW9cIjoge1xuXHRcdFx0XCJzcmNcIjogXCI4XCIsXG5cdFx0XHRcIm1heFwiOiAwLjVcblx0XHR9XG5cdH0sXG5cdHtcblx0XHRcImlkXCI6IFwibXVzbGltc2JlbGlldmVpbmRpdmlkdWFsbGlmZVwiLFxuXHRcdFwiYXVkaW9cIjoge1xuXHRcdFx0XCJzcmNcIjogXCI4XCIsXG5cdFx0XHRcIm1heFwiOiAwLjVcblx0XHR9XG5cdH0sXG5cdHtcblx0XHRcImlkXCI6IFwid2V3aWxscHJvdGVjdGVhY2hvdGhlclwiLFxuXHRcdFwiYXVkaW9cIjoge1xuXHRcdFx0XCJzcmNcIjogXCI5XCIsXG5cdFx0XHRcIm1heFwiOiAwLjVcblx0XHR9XG5cdH0sXG5cdHtcblx0XHRcImlkXCI6IFwid2VhcmVub3RhZnJhaWRcIixcblx0XHRcImF1ZGlvXCI6IHtcblx0XHRcdFwic3JjXCI6IFwiOFwiLFxuXHRcdFx0XCJtYXhcIjogMC41XG5cdFx0fVxuXHR9LFxuXHR7XG5cdFx0XCJpZFwiOiBcIndlYXJlY29taW5nXCIsXG5cdFx0XCJhdWRpb1wiOiB7XG5cdFx0XHRcInNyY1wiOiBcIjlcIixcblx0XHRcdFwibWF4XCI6IDAuNVxuXHRcdH1cblx0fSxcblx0e1xuXHRcdFwiaWRcIjogXCJsaWtlcGVhY2VcIixcblx0XHRcImF1ZGlvXCI6IHtcblx0XHRcdFwic3JjXCI6IFwiOVwiLFxuXHRcdFx0XCJtYXhcIjogMC4wMVxuXHRcdH1cblx0fVxuXTtcblxuXG4vKioqKioqKioqKioqKioqKipcbiAqKiBXRUJQQUNLIEZPT1RFUlxuICoqIC4vfi9qc29uLWxvYWRlciEuL3NjZW5lcy9pbmRleC5qc29uXG4gKiogbW9kdWxlIGlkID0gMTZcbiAqKiBtb2R1bGUgY2h1bmtzID0gMFxuICoqLyIsInZhciBtYXAgPSB7XG5cdFwiLi9hYm91dHlvdXJzZWxmL3NjZW5lLmh0bWxcIjogMTgsXG5cdFwiLi9iYXR0bGVvZmFnZW5lcmF0aW9uL3NjZW5lLmh0bWxcIjogMTksXG5cdFwiLi9jb21wbGljYXRlZHNpdHVhdGlvbi9zY2VuZS5odG1sXCI6IDIwLFxuXHRcIi4vZGlmZmVyZW50cHJhY3RpY2VzL3NjZW5lLmh0bWxcIjogMjEsXG5cdFwiLi9kb3lvdWZlZWxtdXNsaW0vc2NlbmUuaHRtbFwiOiAyMixcblx0XCIuL2V4cGxvc2lvbi9zY2VuZS5odG1sXCI6IDIzLFxuXHRcIi4vZmVlbGluZ2NvbmZ1c2VkL3NjZW5lLmh0bWxcIjogMjQsXG5cdFwiLi9pbnRyby9zY2VuZS5odG1sXCI6IDI1LFxuXHRcIi4vaXNpc2FmdGVybGlmZWZhbGxhY3kvc2NlbmUuaHRtbFwiOiAyNixcblx0XCIuL2lzaXNhcG9jYWx5cHNlbWlzcXVvdGUvc2NlbmUuaHRtbFwiOiAyNyxcblx0XCIuL2lzaXNiYW5rcnVwdC9zY2VuZS5odG1sXCI6IDI4LFxuXHRcIi4vaXNpc2ZpZ2h0bWlzcXVvdGUvc2NlbmUuaHRtbFwiOiAyOSxcblx0XCIuL2lzaXNvYmplY3RpdmUvc2NlbmUuaHRtbFwiOiAzMCxcblx0XCIuL2lzaXN3YW50c3RvZGl2aWRlL3NjZW5lLmh0bWxcIjogMzEsXG5cdFwiLi9pdGlzbnRlYXN5L3NjZW5lLmh0bWxcIjogMzIsXG5cdFwiLi9pdHNnb3R0b2VuZC9zY2VuZS5odG1sXCI6IDMzLFxuXHRcIi4vaXdhbnRteWlzbGFtYmFjazEvc2NlbmUuaHRtbFwiOiAzNCxcblx0XCIuL2xpa2VwZWFjZS9zY2VuZS5odG1sXCI6IDM1LFxuXHRcIi4vbWl4ZWRmZWVsaW5ncy9zY2VuZS5odG1sXCI6IDM2LFxuXHRcIi4vbXVzbGltc2JlbGlldmVpbmRpdmlkdWFsbGlmZS9zY2VuZS5odG1sXCI6IDM3LFxuXHRcIi4vb3V0dG9nZXR5b3Uvc2NlbmUuaHRtbFwiOiAzOCxcblx0XCIuL3JlYWN0aW9uc3RvdGVycm9yL3NjZW5lLmh0bWxcIjogMzksXG5cdFwiLi9zb21ldGhpbmd0b3Byb3ZlL3NjZW5lLmh0bWxcIjogNDAsXG5cdFwiLi93ZWFyZWNvbWluZy9zY2VuZS5odG1sXCI6IDQxLFxuXHRcIi4vd2VhcmVub3RhZnJhaWQvc2NlbmUuaHRtbFwiOiA0Mixcblx0XCIuL3dld2lsbHByb3RlY3RlYWNob3RoZXIvc2NlbmUuaHRtbFwiOiA0Myxcblx0XCIuL3doYXRpc2xhbWljaGlzdG9yeXByZWZlcnMvc2NlbmUuaHRtbFwiOiA0NCxcblx0XCIuL3doYXR0aGVxdXJhbnByZWZlcnMvc2NlbmUuaHRtbFwiOiA0NSxcblx0XCIuL3dob2FyZXRoZXkvc2NlbmUuaHRtbFwiOiA0Nixcblx0XCIuL3dpdGhhbGx0aGVoYXRyZWQvc2NlbmUuaHRtbFwiOiA0Nyxcblx0XCIuL3lldHRoYXRzb2theS9zY2VuZS5odG1sXCI6IDQ4XG59O1xuZnVuY3Rpb24gd2VicGFja0NvbnRleHQocmVxKSB7XG5cdHJldHVybiBfX3dlYnBhY2tfcmVxdWlyZV9fKHdlYnBhY2tDb250ZXh0UmVzb2x2ZShyZXEpKTtcbn07XG5mdW5jdGlvbiB3ZWJwYWNrQ29udGV4dFJlc29sdmUocmVxKSB7XG5cdHJldHVybiBtYXBbcmVxXSB8fCAoZnVuY3Rpb24oKSB7IHRocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIgKyByZXEgKyBcIicuXCIpIH0oKSk7XG59O1xud2VicGFja0NvbnRleHQua2V5cyA9IGZ1bmN0aW9uIHdlYnBhY2tDb250ZXh0S2V5cygpIHtcblx0cmV0dXJuIE9iamVjdC5rZXlzKG1hcCk7XG59O1xud2VicGFja0NvbnRleHQucmVzb2x2ZSA9IHdlYnBhY2tDb250ZXh0UmVzb2x2ZTtcbm1vZHVsZS5leHBvcnRzID0gd2VicGFja0NvbnRleHQ7XG53ZWJwYWNrQ29udGV4dC5pZCA9IDE3O1xuXG5cblxuLyoqKioqKioqKioqKioqKioqXG4gKiogV0VCUEFDSyBGT09URVJcbiAqKiAuL3NjZW5lcyAuL34vaHRtbC1sb2FkZXI/YXR0cnM9ZmFsc2UhXlxcLlxcLy4qXFwvc2NlbmVcXC5odG1sJFxuICoqIG1vZHVsZSBpZCA9IDE3XG4gKiogbW9kdWxlIGNodW5rcyA9IDBcbiAqKi8iLCJtb2R1bGUuZXhwb3J0cyA9IFwiPHN0eWxlPlxcbi5hYm91dC15b3Vyc2VsZiB7XFxuICAgIG9wYWNpdHk6IDA7XFxufVxcbjwvc3R5bGU+XFxuXFxuPGRpdiBjbGFzcz1cXFwiYWJvdXQteW91cnNlbGZcXFwiPlxcbiAgPGRpdiBjbGFzcz1cXFwidGFibGVcXFwiPlxcbiAgICA8ZGl2IGNsYXNzPVxcXCJ0YWJsZS1jZW50ZXJcXFwiPlxcbiAgICAgIDxkaXYgY2xhc3M9XFxcImRpc3BsYXktNCB0ZXh0LWNlbnRlcmVkXFxcIj5Ib3cgZG8geW91IGZlZWwgYWJvdXQgeW91cnNlbGY/PC9kaXY+XFxuICAgIDwvZGl2PlxcbiAgPC9kaXY+XFxuPC9kaXY+XCI7XG5cblxuLyoqKioqKioqKioqKioqKioqXG4gKiogV0VCUEFDSyBGT09URVJcbiAqKiAuL34vaHRtbC1sb2FkZXI/YXR0cnM9ZmFsc2UhLi9zY2VuZXMvYWJvdXR5b3Vyc2VsZi9zY2VuZS5odG1sXG4gKiogbW9kdWxlIGlkID0gMThcbiAqKiBtb2R1bGUgY2h1bmtzID0gMFxuICoqLyIsIm1vZHVsZS5leHBvcnRzID0gXCJcXG48ZGl2IGNsYXNzPVxcXCJiYXR0bGUtb2YtYS1nZW5lcmF0aW9uIGdyZXktem9uZVxcXCI+XFxuXFx0PGRpdiBjbGFzcz1cXFwidGFibGUgXFxcIj5cXG4gIFxcdFxcdDxkaXYgY2xhc3M9XFxcInRhYmxlLWNlbnRlclxcXCI+XFxuICAgIFxcdFxcdDxkaXYgY2xhc3M9XFxcImRpc3BsYXktNCB0ZXh0LWNlbnRlcmVkXFxcIj5XZSBtdXN0IGJlZ2luIG91ciBmaWdodCBmb3IgdGhpcyBnZW5lcmF0aW9uLjwvZGl2PlxcbiAgXFx0XFx0PC9kaXY+XFxuXFx0PC9kaXY+XFxuPC9kaXY+XFxuXCI7XG5cblxuLyoqKioqKioqKioqKioqKioqXG4gKiogV0VCUEFDSyBGT09URVJcbiAqKiAuL34vaHRtbC1sb2FkZXI/YXR0cnM9ZmFsc2UhLi9zY2VuZXMvYmF0dGxlb2ZhZ2VuZXJhdGlvbi9zY2VuZS5odG1sXG4gKiogbW9kdWxlIGlkID0gMTlcbiAqKiBtb2R1bGUgY2h1bmtzID0gMFxuICoqLyIsIm1vZHVsZS5leHBvcnRzID0gXCJcXG48c3R5bGU+XFxuICAubGVmdCwgLnJpZ2h0IHtcXG4gICAgZmxvYXQ6IGxlZnQ7XFxuICB9XFxuICAudGFibGUge1xcbiAgICBwb3NpdGlvbjogcmVsYXRpdmU7XFxuICB9XFxuICAudG9vLWxvbmctcXVvdGUge1xcbiAgICBwb3NpdGlvbjogZml4ZWQ7XFxuICAgIHRvcDogMDtcXG4gICAgbGVmdDogMDtcXG4gICAgZm9udC1zaXplOiA2LjV2bWluO1xcbiAgICB0ZXh0LWFsaWduOiBjZW50ZXI7XFxuICAgIGNvbG9yOiByZ2JhKDI1NSwyNTUsMjU1LDAuMyk7XFxuICAgIHdpZHRoOiAxMDAlO1xcbiAgICBoZWlnaHQ6IDEwMCU7XFxuICAgIG92ZXJmbG93OiBoaWRkZW47XFxuICAgIC8qYmFja2dyb3VuZDogIzMzMzsqL1xcbiAgICBwYWRkaW5nLXRvcDogNHZtYXg7XFxuICAgIC13ZWJraXQtZmlsdGVyOiBibHVyKDJweCk7XFxuICB9XFxuICAudGV4dC1jZW50ZXJlZCB7XFxuICAgIHRleHQtYWxpZ246IGNlbnRlcjtcXG4gIH1cXG4gIC5vblRvcCB7XFxuICAgIHotaW5kZXg6IDIwMDAwO1xcbiAgfVxcbjwvc3R5bGU+XFxuXFxuPGRpdiBjbGFzcz1cXFwiZ3JleS16b25lXFxcIj5cXG4gIDxkaXYgY2xhc3M9XFxcInRvby1sb25nLXF1b3RlXFxcIj5cXG4gICAgPHN0cm9uZz5UaGUgZmFpbHVyZTwvc3Ryb25nPiBvZiB0aGUgcG9zdGNvbG9uaWFsIGVsaXRlcyB0byA8c3Ryb25nPmNyZWF0ZSBnZW51aW5lIGRlbW9jcmF0aWMgc29jaWV0aWVzPC9zdHJvbmc+IGFuZCBmb3N0ZXIgYSBzZW5zZSBvZiBuYXRpb25hbCB1bml0eSA8c3Ryb25nPm9wdGluZyBpbnN0ZWFkIGZvciBtaWxpdGFyeSBkaWN0YXRvcnNoaXBzPC9zdHJvbmc+IHRoYXQgPHN0cm9uZz5lcm9kZWQgdGhlIHBvdGVudGlhbCBmb3IgZWNvbm9taWMgYW5kIHBvbGl0aWNhbCBkZXZlbG9wbWVudDwvc3Ryb25nPiBjb3VwbGVkIHdpdGggdGhlIGhpc3RvcmljIG1pc3Rha2VzIG9mIEFyYWJpYyBwcm9ncmVzc2l2ZSBwYXJ0aWVzIGFuZCB0aGVpciA8c3Ryb25nPmFwcGVhc2VtZW50IHRvd2FyZHMgYXV0b2NyYXRpYyBydWxlcnM8L3N0cm9uZz4gY29udHJpYnV0aW5nIHRvIHRoZSA8c3Ryb25nPmNvbXBsZXRlIGV2aXNjZXJhdGlvbiBvZiBhbHRlcm5hdGl2ZSBwb2xpdGljYWwgZnJhbWV3b3Jrczwvc3Ryb25nPiB0aGF0IGNvdWxkIGNyZWF0ZSBvcmdhbmljIHJlc2lzdGFuY2UgdG93YXJkcyBleHRlcm5hbCBtZWRkbGluZywgaGVnZW1vbnkgYW5kIG91dHJpZ2h0IG1pbGl0YXJ5IGludGVydmVudGlvbnMgbGVhdmluZyBhIDxzdHJvbmc+cmFkaWNhbCBpbnRlcnByZXRhdGlvbiBvZiByZWxpZ2lvbiBhcyB0aGUgb25seSByZW1haW5pbmcgaWRlb2xvZ2ljYWwgcGxhdGZvcm0gY2FwYWJsZSBvZiBtb2JpbGlzaW5nIHRoZSBkaXNlbmZyYW5jaGlzZWQ8L3N0cm9uZz4gZXhhY2VyYmF0ZWQgYnkgdGhlIGdsb2JhbCBkZWNsaW5lIG9mIHVuaXZlcnNhbCBpZGVhbHMgYW5kIHRoZSA8c3Ryb25nPnJpc2Ugb2YgaWRlbnRpdHkgYXMgYSBwcmltZSBtb2JpbGlzZXI8L3N0cm9uZz4gYW5kIGVuYWJsZWQgYnkgcG9saXRpY2FsIGFuZCA8c3Ryb25nPmZpbmFuY2lhbCBzdXBwb3J0IGZyb20gdGhlb2NyYXRpYyByZWdpbWVzPC9zdHJvbmc+IGFpbWluZyB0byBzaG9yZSB1cCB0aGVpciBsZWdpdGltYWN5IGFuZCBtYWRlIHdvcnNlIGJ5IHRoZSA8c3Ryb25nPmNvbGxhcHNlIG9mIHRoZSByZWdpb25hbCBzZWN1cml0eTwvc3Ryb25nPiBvcmRlciBjcmVhdGluZyB0aGUgY29uZGl0aW9ucyBmb3IgPHN0cm9uZz5wcm94eSB3YXJzPC9zdHJvbmc+IGFuZCBwb2xpdGljYWwsIHNvY2lhbCBhbmQgZWNvbm9taWMgdXBoZWF2YWwgaW50ZW5zaWZpZWQgYnkgZ2VvLXBvbGl0aWNhbGx5IDxzdHJvbmc+aW5jb2hlcmVudCBpbnRlcm5hdGlvbmFsIG1lZGRsaW5nPC9zdHJvbmc+IGVzY2FsYXRpbmcgY29uZmxpY3RzIGFuZCBsZWFkaW5nIHRvIGEgPHN0cm9uZz5wZXJwZXR1YWwgc3RhdGUgb2YgY2hhb3M8L3N0cm9uZz4gdW5kZXIgd2hpY2ggdGhlIGFwcGVhbCBvZiBhIHJldml2YWxpc3QgcmVsaWdpb3VzLXBvbGl0aWNhbCBvcmRlciBlbWJvZGllZCBieSB0aGUgPHN0cm9uZz5jYWxpcGhhdGUgYmVjb21lcyBhdHRyYWN0aXZlPC9zdHJvbmc+IHBhcnRpY3VsYXJseSB3aGVuIGNvdXBsZWQgd2l0aCBhIG1pbGxlbmFyaWFuIGFwb2NhbHlwdGljIG5hcnJhdGl2ZS5cXG4gIDwvZGl2PlxcbiAgPGRpdiBjbGFzcz1cXFwidGFibGUgb25Ub3AgXFxcIj5cXG4gICAgPGRpdiBjbGFzcz1cXFwidGFibGUtY2VudGVyXFxcIj5cXG4gICAgICA8ZGl2IGNsYXNzPVxcXCJkaXNwbGF5LTQgdGV4dC1jZW50ZXJlZFxcXCI+VGhlIHNpdHVhdGlvbiBtYXkgYmUgY29tcGxpY2F0ZWQuLi48L2Rpdj5cXG4gICAgPC9kaXY+XFxuICA8L2Rpdj5cXG48L2Rpdj5cXG5cIjtcblxuXG4vKioqKioqKioqKioqKioqKipcbiAqKiBXRUJQQUNLIEZPT1RFUlxuICoqIC4vfi9odG1sLWxvYWRlcj9hdHRycz1mYWxzZSEuL3NjZW5lcy9jb21wbGljYXRlZHNpdHVhdGlvbi9zY2VuZS5odG1sXG4gKiogbW9kdWxlIGlkID0gMjBcbiAqKiBtb2R1bGUgY2h1bmtzID0gMFxuICoqLyIsIm1vZHVsZS5leHBvcnRzID0gXCI8ZGl2IGNsYXNzPVxcXCJ0YWJsZVxcXCI+XFxuICA8ZGl2IGNsYXNzPVxcXCJ0YWJsZS1jZW50ZXJcXFwiPlxcbiAgICA8ZGl2IGNsYXNzPVxcXCJkaXNwbGF5LTQgdGV4dC1jZW50ZXJlZFxcXCI+VGlyZWQgb2Ygc2VlaW5nIGF0dGFja3MgaW5jcmVhc2UuIDxicj48YnI+XFxuICAgICAgVGlyZWQgb2YgZmVlbGluZyBhcG9sb2dldGljLjwvZGl2PlxcbiAgPC9kaXY+XFxuPC9kaXY+XFxuXCI7XG5cblxuLyoqKioqKioqKioqKioqKioqXG4gKiogV0VCUEFDSyBGT09URVJcbiAqKiAuL34vaHRtbC1sb2FkZXI/YXR0cnM9ZmFsc2UhLi9zY2VuZXMvZGlmZmVyZW50cHJhY3RpY2VzL3NjZW5lLmh0bWxcbiAqKiBtb2R1bGUgaWQgPSAyMVxuICoqIG1vZHVsZSBjaHVua3MgPSAwXG4gKiovIiwibW9kdWxlLmV4cG9ydHMgPSBcIjxzdHlsZT5cXG4gICNkb3lvdWZlZWxtdXNsaW0gLmFuaW0tMiB7XFxuICAgIG9wYWNpdHk6IDA7XFxuICB9XFxuICAudmlkZW8tYmFja2dyb3VuZCB2aWRlbyB7XFxuICAgIHdpZHRoOiAxMDB2dztcXG4gIH1cXG4gIC52aWRlby1iYWNrZ3JvdW5kIHtcXG4gICAgcG9zaXRpb246IGZpeGVkO1xcbiAgICB0b3A6IDA7XFxuICAgIGxlZnQ6IDA7XFxuICB9XFxuICAjZG95b3VmZWVsbXVzbGltIC5kaXNwbGF5LTQge1xcbiAgICBiYWNrZ3JvdW5kOiBibGFjaztcXG4gICAgZGlzcGxheTogaW5saW5lLWJsb2NrO1xcbiAgICBwYWRkaW5nOiAwLjV2dztcXG4gIH1cXG48L3N0eWxlPlxcbjxkaXYgY2xhc3M9XFxcInZpZGVvLWJhY2tncm91bmRcXFwiPlxcbiAgPHZpZGVvIGxvb3AgbWF4LXZvbHVtZT1cXFwiMC4xN1xcXCIgPlxcbiAgICA8c291cmNlIHNyYz1cXFwiaW1nL3RlcnJvcmlzdC1hdHRhY2tzLm1wNFxcXCIgdHlwZT1cXFwidmlkZW8vbXA0XFxcIj5cXG4gIDwvdmlkZW8+XFxuPC9kaXY+XFxuPGRpdiBjbGFzcz1cXFwidGFibGVcXFwiPlxcbiAgPGRpdiBjbGFzcz1cXFwidGFibGUtY2VudGVyXFxcIj5cXG4gICAgPGRpdiBjbGFzcz1cXFwiZGlzcGxheS00IGFuaW0tMVxcXCI+SG93IGRvIHlvdSBmZWVsIGFib3V0IHlvdXIgSXNsYW0/PC9kaXY+PGJyIC8+PGJyIC8+XFxuICA8L2Rpdj5cXG48L2Rpdj5cXG5cIjtcblxuXG4vKioqKioqKioqKioqKioqKipcbiAqKiBXRUJQQUNLIEZPT1RFUlxuICoqIC4vfi9odG1sLWxvYWRlcj9hdHRycz1mYWxzZSEuL3NjZW5lcy9kb3lvdWZlZWxtdXNsaW0vc2NlbmUuaHRtbFxuICoqIG1vZHVsZSBpZCA9IDIyXG4gKiogbW9kdWxlIGNodW5rcyA9IDBcbiAqKi8iLCJtb2R1bGUuZXhwb3J0cyA9IFwiPHAgY2xhc3M9XFxcImV4cGxvc2lvbi1ieWxpbmVcXFwiPkhlcmUncyBhbiBleGFtcGxlIG9mIDE2IGVsZW1lbnRzIHNjYWxpbmcsIGZhZGluZyBhbmQgbW92aW5nIGF0IG9uY2UuPC9wPlxcbjx1bCBpZD1cXFwiZG9tRXhwbG9zaW9uTGlzdFxcXCI+XFxuICA8bGkgY2xhc3M9XFxcImRvbS1leHBsb3Npb24taXRlbSBkZWktMVxcXCI+PC9saT5cXG4gIDxsaSBjbGFzcz1cXFwiZG9tLWV4cGxvc2lvbi1pdGVtIGRlaS0yXFxcIj48L2xpPlxcbiAgPGxpIGNsYXNzPVxcXCJkb20tZXhwbG9zaW9uLWl0ZW0gZGVpLTNcXFwiPjwvbGk+XFxuICA8bGkgY2xhc3M9XFxcImRvbS1leHBsb3Npb24taXRlbSBkZWktNFxcXCI+PC9saT5cXG4gIDxsaSBjbGFzcz1cXFwiZG9tLWV4cGxvc2lvbi1pdGVtIGRlaS01XFxcIj48L2xpPlxcbiAgPGxpIGNsYXNzPVxcXCJkb20tZXhwbG9zaW9uLWl0ZW0gZGVpLTZcXFwiPjwvbGk+XFxuICA8bGkgY2xhc3M9XFxcImRvbS1leHBsb3Npb24taXRlbSBkZWktN1xcXCI+PC9saT5cXG4gIDxsaSBjbGFzcz1cXFwiZG9tLWV4cGxvc2lvbi1pdGVtIGRlaS04XFxcIj48L2xpPlxcbiAgPGxpIGNsYXNzPVxcXCJkb20tZXhwbG9zaW9uLWl0ZW0gZGVpLTlcXFwiPjwvbGk+XFxuICA8bGkgY2xhc3M9XFxcImRvbS1leHBsb3Npb24taXRlbSBkZWktMTBcXFwiPjwvbGk+XFxuICA8bGkgY2xhc3M9XFxcImRvbS1leHBsb3Npb24taXRlbSBkZWktMTFcXFwiPjwvbGk+XFxuICA8bGkgY2xhc3M9XFxcImRvbS1leHBsb3Npb24taXRlbSBkZWktMTJcXFwiPjwvbGk+XFxuICA8bGkgY2xhc3M9XFxcImRvbS1leHBsb3Npb24taXRlbSBkZWktMTNcXFwiPjwvbGk+XFxuICA8bGkgY2xhc3M9XFxcImRvbS1leHBsb3Npb24taXRlbSBkZWktMTRcXFwiPjwvbGk+XFxuICA8bGkgY2xhc3M9XFxcImRvbS1leHBsb3Npb24taXRlbSBkZWktMTVcXFwiPjwvbGk+XFxuICA8bGkgY2xhc3M9XFxcImRvbS1leHBsb3Npb24taXRlbSBkZWktMTZcXFwiPjwvbGk+XFxuPC91bD5cXG5cIjtcblxuXG4vKioqKioqKioqKioqKioqKipcbiAqKiBXRUJQQUNLIEZPT1RFUlxuICoqIC4vfi9odG1sLWxvYWRlcj9hdHRycz1mYWxzZSEuL3NjZW5lcy9leHBsb3Npb24vc2NlbmUuaHRtbFxuICoqIG1vZHVsZSBpZCA9IDIzXG4gKiogbW9kdWxlIGNodW5rcyA9IDBcbiAqKi8iLCJtb2R1bGUuZXhwb3J0cyA9IFwiPHN0eWxlPlxcbi51cy1hZ2FpbnN0LXRoZW0ge1xcbiAgICBvcGFjaXR5OiAwO1xcbn1cXG48L3N0eWxlPlxcblxcbjxkaXYgY2xhc3M9XFxcInVzLWFnYWluc3QtdGhlbVxcXCI+XFxuXFx0PGRpdiBjbGFzcz1cXFwidGFibGVcXFwiPlxcblxcdCAgPGRpdiBjbGFzcz1cXFwidGFibGUtY2VudGVyXFxcIj5cXG5cXHQgICAgPGRpdiBjbGFzcz1cXFwiZGlzcGxheS00IHRleHQtY2VudGVyZWRcXFwiPkZlZWxzIGxpa2UgaXQncyB1cyBhZ2FpbnN0IHRoZW0uLi48L2Rpdj5cXG5cXHQgIDwvZGl2PlxcblxcdDwvZGl2PlxcbjwvZGl2PlwiO1xuXG5cbi8qKioqKioqKioqKioqKioqKlxuICoqIFdFQlBBQ0sgRk9PVEVSXG4gKiogLi9+L2h0bWwtbG9hZGVyP2F0dHJzPWZhbHNlIS4vc2NlbmVzL2ZlZWxpbmdjb25mdXNlZC9zY2VuZS5odG1sXG4gKiogbW9kdWxlIGlkID0gMjRcbiAqKiBtb2R1bGUgY2h1bmtzID0gMFxuICoqLyIsIm1vZHVsZS5leHBvcnRzID0gXCI8c3R5bGU+XFxuLyojaW50cm8ge1xcbiAgcG9zaXRpb246IGZpeGVkO1xcbiAgdG9wOiAxNXZoO1xcbiAgbGVmdDogMTAlO1xcbiAgd2lkdGg6IDgwJTtcXG4gIGNvbG9yOiAjZmZmO1xcbiAgdGV4dC1hbGlnbjogY2VudGVyO1xcbiAgdGV4dC10cmFuc2Zvcm06IHVwcGVyY2FzZTtcXG59Ki9cXG4uaGVscC10ZXh0IHtcXG5cXHRwb3NpdGlvbjogYWJzb2x1dGU7XFxuXFx0Y29sb3I6ICMyOWQ7XFxuXFx0Zm9udC1zaXplOiAzdm1pbjtcXG59XFxuLmhlbHAtdGV4dC1za2luIHtcXG5cXHRjb2xvcjogIzI5ZDtcXG5cXHRmb250LXNpemU6IDN2bWluO1xcbn1cXG4vKi5oZWxwLXRleHQgaSB7XFxuXFx0Zm9udC1zaXplOiA1dm1pbjtcXG59Ki9cXG4uYmV0YSB7XFxuXFx0b3BhY2l0eTogMC43O1xcblxcdGZvbnQtc2l6ZTogMi41dm1pbjtcXG5cXG59XFxuPC9zdHlsZT5cXG48ZGl2IGNsYXNzPVxcXCJpbnRyb1xcXCI+XFxuXFx0PGRpdiBjbGFzcz1cXFwidGFibGUgXFxcIj5cXG4gIFxcdFxcdDxkaXYgY2xhc3M9XFxcInRhYmxlLWNlbnRlclxcXCI+XFxuICAgIFxcdFxcdDxkaXYgY2xhc3M9XFxcImRpc3BsYXktMSB0ZXh0LWNlbnRlcmVkXFxcIj5cXG5cXHRcXHRcXHRcXHRcXHQ8aSBjbGFzcz1cXFwiZmEgZmEtbXVzaWMgYW5pbWF0ZWQgZmxhc2ggXFxcIiBzdHlsZT1cXFwiYW5pbWF0aW9uLWRlbGF5OiAxLjVzO1xcXCI+PC9pPjxicj48L2JyPlxcblxcdFxcdFxcdFxcdFxcdDxiciA+XFxuICAgIFxcdFxcdFxcdFBsYXksIHNraXAsIG9yIHNjcm9sbCB0byBiZWdpbiA8YSB0YXJnZXQ9XFxcIl9ibGFua1xcXCIgaHJlZj1cXFwibWFpbHRvOm11c2xpbXNhZ2FpbnN0aXNpc2dyb3VwQGdtYWlsLmNvbVxcXCI+PHN1cCBjbGFzcz1cXFwiYmV0YVxcXCI+KEJFVEEpPC9zdXA+PC9hPjxiciA+XFxuXFx0XFx0XFx0XFx0XFx0PHNwYW4gY2xhc3M9XFxcImhlbHAtdGV4dC1za2luXFxcIj5cXG5cXHRcXHRcXHRcXHRcXHRcXHRBbGwgcXVvdGVzIGFuZCBuZXdzIHNvdXJjZXMgYXJlIGNsaWNrYWJsZS5cXG5cXHRcXHRcXHRcXHRcXHQ8L3NwYW4+XFxuXFx0XFx0XFx0PC9kaXY+XFxuICBcXHRcXHQ8L2Rpdj5cXG5cXHQ8L2Rpdj5cXG48L2Rpdj5cXG5cXG48ZGl2IGNsYXNzPVxcXCJoZWxwLXRleHRcXFwiIHN0eWxlPVxcXCJ0b3A6IDR2bWluO3JpZ2h0OiAxNnZtaW47XFxcIj5cXG5cXHQ8c3BhbiBjbGFzcz1cXFwiYW5pbWF0ZWQgIFxcXCIgc3R5bGU9XFxcImFuaW1hdGlvbi1kZWxheTogMnM7XFxcIiA+UGxheS9QYXVzZSA8aSBjbGFzcz1cXFwiZmEgZmEtYXJyb3ctY2lyY2xlLXJpZ2h0XFxcIj48L2k+PC9zcGFuPlxcbjwvZGl2PlxcbjxkaXYgY2xhc3M9XFxcImhlbHAtdGV4dFxcXCIgc3R5bGU9XFxcInRvcDogMTQuNXZoO3JpZ2h0OiAxNnZtaW47XFxcIj5cXG5cXHQ8c3BhbiBjbGFzcz1cXFwiYW5pbWF0ZWQgIFxcXCIgc3R5bGU9XFxcImFuaW1hdGlvbi1kZWxheTogMnM7XFxcIiA+U2tpcCA8aSBjbGFzcz1cXFwiZmEgZmEtYXJyb3ctY2lyY2xlLXJpZ2h0XFxcIj48L2k+PC9zcGFuPlxcbjwvZGl2PlxcblxcbjxkaXYgY2xhc3M9XFxcImhlbHAtdGV4dFxcXCIgc3R5bGU9XFxcImJvdHRvbTozdmg7cmlnaHQ6NDh2dzt0ZXh0LWFsaWduOmNlbnRlclxcXCI+XFxuXFx0PGRpdiBjbGFzcz1cXFwiYW5pbWF0ZWQgIFxcXCIgc3R5bGU9XFxcImFuaW1hdGlvbi1kZWxheTogMnM7XFxcIj48ZGl2IHN0eWxlPVxcXCJwYWRkaW5nLWJvdHRvbTogMXZoO1xcXCI+U2Nyb2xsPC9kaXY+IDxpIGNsYXNzPVxcXCJmYSBmYS1hcnJvdy1jaXJjbGUtZG93blxcXCI+PC9pPjwvZGl2PlxcbjwvZGl2PlxcblwiO1xuXG5cbi8qKioqKioqKioqKioqKioqKlxuICoqIFdFQlBBQ0sgRk9PVEVSXG4gKiogLi9+L2h0bWwtbG9hZGVyP2F0dHJzPWZhbHNlIS4vc2NlbmVzL2ludHJvL3NjZW5lLmh0bWxcbiAqKiBtb2R1bGUgaWQgPSAyNVxuICoqIG1vZHVsZSBjaHVua3MgPSAwXG4gKiovIiwibW9kdWxlLmV4cG9ydHMgPSBcIjxzdHlsZT5cXG4gIC50YWJsZSBpbnB1dCB7XFxuICAgIGZvbnQtc2l6ZTogOS41dm1pbjtcXG4gICAgd2lkdGg6IDV2dztcXG4gICAgYmFja2dyb3VuZDogYmxhY2s7XFxuICAgIGJvcmRlcjogbm9uZTtcXG4gICAgY29sb3I6IHdoaXRlO1xcbiAgICBmb250LXdlaWdodDogYm9sZDtcXG4gIH1cXG4gIC5sZWZ0LWFsaWduIC5xdXJhbi1yZWFkIHtcXG4gICAgdGV4dC1hbGlnbjogbGVmdDtcXG4gIH1cXG4gIC5jYWxjdWxhdG9yIHtcXG4gICAgYmFja2dyb3VuZDogYmxhY2s7XFxuICAgIHdpZHRoOiA0OHZ3O1xcbiAgICBtYXJnaW46IDAgYXV0bztcXG4gICAgcGFkZGluZzogMnZ3O1xcbiAgICBvcGFjaXR5OiAwO1xcbiAgfVxcbiAgI2lzaXNhZnRlcmxpZmVmYWxsYWN5IC5xdW90ZSB7XFxuICAgIGZvbnQtc3R5bGU6IGl0YWxpYztcXG4gIH1cXG4gIC5lcXVhbHMtY29udGFpbmVyIHtcXG4gICAgd2lkdGg6IDEwMCU7XFxuICAgIHBvc2l0aW9uOiByZWxhdGl2ZTtcXG4gICAgcGFkZGluZzogM3ZtaW4gMDtcXG4gIH1cXG4gIC5lcXVhbHMge1xcbiAgICB3aWR0aDogODN2bWluO1xcbiAgICBwb3NpdGlvbjogYWJzb2x1dGU7XFxuICAgIGJvcmRlcjogMC4ydncgc29saWQ7XFxuICAgIHJpZ2h0OiAwO1xcbiAgfVxcbiAgLmVxdWFsczphZnRlciB7XFxuICAgIGNsZWFyOiBib3RoO1xcbiAgfVxcbiAgLnRleHQtcmlnaHQge1xcbiAgICB0ZXh0LWFsaWduOiByaWdodDtcXG4gIH1cXG4gIC50ZXh0LWJvbGQge1xcbiAgICBmb250LXdlaWdodDogNzAwO1xcbiAgfVxcbjwvc3R5bGU+XFxuXFxuPGRpdiBjbGFzcz1cXFwidGFibGVcXFwiPlxcbiAgPGRpdiBjbGFzcz1cXFwidGFibGUtY2VudGVyXFxcIiBzdHlsZT1cXFwid2lkdGg6NTAlXFxcIj5cXG4gICAgPGRpdiBjbGFzcz1cXFwiZGlzcGxheS0yIHByZW1pc2UgdGV4dC1ib2xkXFxcIj5JU0lTIG1heSBraWxsIGlubm9jZW50IHBlb3BsZSBpbmRpc2NyaW1pbmF0ZWx5Li4uPC9kaXY+PGJyPjxicj5cXG4gICAgPGRpdiBjbGFzcz1cXFwiZGlzcGxheS0yIGNvbmNsdXNpb24gdGV4dC1ib2xkXFxcIj5IYXZlIHRoZXkgZXZlbiBpbWFnaW5lZCBob3cgaGFyYW0gKHNpbmZ1bCkgdGhhdCBpcz88L2Rpdj5cXG4gIDwvZGl2PlxcbiAgPGRpdiBjbGFzcz1cXFwidGFibGUtY2VudGVyXFxcIiBzdHlsZT1cXFwid2lkdGg6NTBcXFwiPlxcbiAgICA8ZGl2IGNsYXNzPVxcXCJkaXNwbGF5LTMgdGV4dC1yaWdodCBjYWxjdWxhdG9yXFxcIj5cXG4gICAgICBJZiB5b3UndmUgbXVyZGVyZWQgPGlucHV0IHR5cGU9XFxcIm51bWJlclxcXCIgaWQ9XFxcIm11cmRlcm51bWJlclxcXCIgdmFsdWU9XFxcIjFcXFwiIG1pbj1cXFwiMVxcXCIgc2l6ZT1cXFwiMlxcXCIgLz48L3N0cm9uZz5cXG4gICAgICA8ZGl2IGNsYXNzPVxcXCJkaXNwbGF5LTEgZW1waGFzaXMgY29uY2x1c2lvblxcXCI+XFxuICAgICAgICAgIDxhIGhyZWY9XFxcImh0dHA6Ly9xdXJhbi5jb20vNS8zMlxcXCIgdGFyZ2V0PVxcXCJfYmxhbmtcXFwiPlxcbiAgICAgICAgICAgIDxzdHJvbmc+Li4ud2hvZXZlciBraWxscyBhIHNvdWwgLi4uIGl0IGlzIGFzIGlmIGhlIGhhZCBzbGFpbiBtYW5raW5kIGVudGlyZWx5Ljwvc3Ryb25nPlxcbiAgICAgICAgICAgIDxzcGFuIGNsYXNzPVxcXCJxdW90ZS1zb3VyY2UgY29uY2x1c2lvblxcXCI+UXVyJ2FuIDU6MzI8L3NwYW4+XFxuICAgICAgICAgIDwvYT5cXG4gICAgICA8L2Rpdj4gIDxkaXY+KiA3IGJpbGxpb24gcGVvcGxlPC9kaXY+PGJyID5cXG4gICAgICA8ZGl2IGNsYXNzPVxcXCJlcXVhbHMtY29udGFpbmVyXFxcIj5cXG4gICAgICAgIDxociBjbGFzcz1cXFwiZXF1YWxzXFxcIj48YnIgPlxcbiAgICAgIDwvZGl2PlxcbiAgICAgIFRoZSB3ZWlnaHQgb2YgbXVyZGVyaW5nIDxicj4gPHN0cm9uZz48c3BhbiBpZD1cXFwibXVyZGVydG90YWxcXFwiPjwvc3Bhbj4gcGVvcGxlLjwvc3Ryb25nPjwvZGl2PlxcbiAgPC9kaXY+XFxuPC9kaXY+XFxuXFxuPCEtLSBUT0RPOiBNb3ZlIHRvIGEgbmV3IHNjcmlwdC4gLS0+XFxuXFxuPHNjcmlwdD5cXG4gICQoZnVuY3Rpb24oKSB7XFxuXFxuICAgIHZhciBQT1BVTEFUSU9OX1RPVEFMID0gNzAwMDAwMDAwMDtcXG5cXG4gICAgLy8gaW5pdGlhbGlhemVcXG4gICAgdXBkYXRlTXVyZGVyQ2FsY3VsYXRvcigpO1xcblxcbiAgICAkKFxcXCIjbXVyZGVybnVtYmVyXFxcIikub24oJ2NoYW5nZScsIGZ1bmN0aW9uKCkge1xcbiAgICAgIHVwZGF0ZU11cmRlckNhbGN1bGF0b3IoKVxcbiAgICB9KTtcXG5cXG4gICAgJChcXFwiI211cmRlcm51bWJlclxcXCIpLm9uKCdzY3JvbGwnLCBmdW5jdGlvbigpIHtcXG4gICAgICBjb25zb2xlLmxvZygnYmx1cicpXFxuICAgICAgJCh0aGlzKS5ibHVyKCk7XFxuICAgIH0pO1xcblxcbiAgICBmdW5jdGlvbiB1cGRhdGVNdXJkZXJDYWxjdWxhdG9yKCkge1xcbiAgICAgIHZhciBtdXJkZXJudW1iZXIgPSAkKFxcXCIjbXVyZGVybnVtYmVyXFxcIikudmFsKCk7XFxuICAgICAgdmFyIG11cmRlclRvdGFsICA9IG11cmRlcm51bWJlciAqIFBPUFVMQVRJT05fVE9UQUw7XFxuICAgICAgcmVuZGVyKG11cmRlclRvdGFsKTtcXG4gICAgfVxcblxcbiAgICBmdW5jdGlvbiByZW5kZXIobXVyZGVyVG90YWwpIHtcXG4gICAgICAkKCcjbXVyZGVydG90YWwnKS5odG1sKG11cmRlclRvdGFsKTtcXG4gICAgfVxcblxcbiAgfSk7XFxuPC9zY3JpcHQ+XFxuXCI7XG5cblxuLyoqKioqKioqKioqKioqKioqXG4gKiogV0VCUEFDSyBGT09URVJcbiAqKiAuL34vaHRtbC1sb2FkZXI/YXR0cnM9ZmFsc2UhLi9zY2VuZXMvaXNpc2FmdGVybGlmZWZhbGxhY3kvc2NlbmUuaHRtbFxuICoqIG1vZHVsZSBpZCA9IDI2XG4gKiogbW9kdWxlIGNodW5rcyA9IDBcbiAqKi8iLCJtb2R1bGUuZXhwb3J0cyA9IFwiICA8ZGl2IGNsYXNzPVxcXCJ0YWJsZVxcXCI+XFxuICAgIDxkaXYgY2xhc3M9XFxcInRhYmxlLWNlbnRlclxcXCIgc3R5bGU9XFxcIndpZHRoOjUwJVxcXCI+XFxuICAgICAgPGgxIGNsYXNzPVxcXCJwcmVtaXNlXFxcIj5JU0lTIG1heSBiZWxpZXZlIHRoZSBBcG9jYWx5cHNlIGlzIG5lYXIuLi4uPC9oMT48YnIgLz48YnIgLz5cXG4gICAgICA8aDEgY2xhc3M9XFxcImNvbmNsdXNpb25cXFwiPkhhdmUgdGhleSBjb25zdWx0ZWQgdGhlIFF1cuKAmWFuIG9uIHRoaXMgbWF0dGVyPzwvaDE+XFxuICAgIDwvZGl2PlxcbiAgICA8ZGl2IGNsYXNzPVxcXCJ0YWJsZS1jZW50ZXJcXFwiIHN0eWxlPVxcXCJ3aWR0aDo1MFxcXCI+XFxuICAgICAgPGgyIGNsYXNzPVxcXCJxdXJhbi1yZWFkIHF1cmFuLWhpZGRlblxcXCI+XFxuICAgICAgICA8YSBocmVmPVxcXCJodHRwOi8vcXVyYW4uY29tLzcvMTg3XFxcIiB0YXJnZXQ9XFxcIl9ibGFua1xcXCI+VGhleSBhc2sgdGhlZSBvZiB0aGUgKGRlc3RpbmVkKSBIb3VyLCB3aGVuIHdpbGwgaXQgY29tZSB0byBwb3J0LiBTYXk6IDxzdHJvbmc+S25vd2xlZGdlIHRoZXJlb2YgaXMgd2l0aCBteSBMb3JkIG9ubHkuIEhlIGFsb25lIHdpbGwgbWFuaWZlc3QgaXQgYXQgaXRzIHByb3BlciB0aW1lLi4uPC9zdHJvbmc+PHNwYW4gY2xhc3M9XFxcInF1b3RlLXNvdXJjZVxcXCI+UXVyJ2FuIDc6MTg3PC9zcGFuPjwvYT48YnI+PGJyPlxcbiAgICAgICAgIDxhIGhyZWY9XFxcImh0dHA6Ly9xdXJhbi5jb20vNDEvNDdcXFwiIHRhcmdldD1cXFwiX2JsYW5rXFxcIj48c3Ryb25nPlRvIEhpbSBbYWxvbmVdPC9zdHJvbmc+IGlzIGF0dHJpYnV0ZWQgIDxzdHJvbmc+a25vd2xlZGdlIG9mIHRoZSBIb3VyLjwvc3Ryb25nPjxzcGFuIGNsYXNzPVxcXCJxdW90ZS1zb3VyY2VcXFwiPlF1cmFuIDQxOjQ3PC9zcGFuPjwvYT5cXG4gICAgICA8L2gyPlxcbiAgICA8L2Rpdj5cXG4gIDwvZGl2PlxcblwiO1xuXG5cbi8qKioqKioqKioqKioqKioqKlxuICoqIFdFQlBBQ0sgRk9PVEVSXG4gKiogLi9+L2h0bWwtbG9hZGVyP2F0dHJzPWZhbHNlIS4vc2NlbmVzL2lzaXNhcG9jYWx5cHNlbWlzcXVvdGUvc2NlbmUuaHRtbFxuICoqIG1vZHVsZSBpZCA9IDI3XG4gKiogbW9kdWxlIGNodW5rcyA9IDBcbiAqKi8iLCJtb2R1bGUuZXhwb3J0cyA9IFwiPHN0eWxlPlxcbiAgLmxlZnQge1xcbiAgICB3aWR0aDogNDB2dztcXG4gIH1cXG5cXG4gIC5uZXdzc291cmNlLWhvcixcXG4gIGdyZXl6b25lLXNyYyB7XFxuICAgIG1heC1oZWlnaHQ6IDQwdmg7XFxuICAgIGJveC1zaGFkb3c6IDAgMXZ3IDJ2dyByZ2JhKDAsIDAsIDAsIDAuNik7XFxuICB9XFxuXFxuICAubmV3c3NvdXJjZXMtaG9yIHtcXG4gICAgcG9zaXRpb246IGFic29sdXRlO1xcbiAgICB0b3A6IDM1dmg7XFxuICAgIHdpZHRoOiAyMzB2dztcXG4gICAgaGVpZ2h0OiA1MHZoO1xcbiAgICAvKm92ZXJmbG93OiBoaWRkZW47Ki9cXG4gICAgdHJhbnNmb3JtOiB0cmFuc2xhdGVYKDI1MCUpO1xcbiAgfVxcblxcbiAgLmJsYWNrLXpvbmUge1xcbiAgICBiYWNrZ3JvdW5kOiBibGFjaztcXG4gICAgd2lkdGg6IDEwMHZ3O1xcbiAgICBoZWlnaHQ6IDEwMHZoO1xcbiAgfVxcbi8qICAjaXRpc250ZWFzeSAuZGlzcGxheS00IHtcXG4gICAgb3BhY2l0eTogMDtcXG4gIH0qL1xcbiAgIC5kcm9wZGVhZCB7XFxuICAgIHdpZHRoOiA1MHZ3O1xcbiAgfVxcbiAgLmN1bm5pbmcxIHtcXG4gICAgdG9wOiA0dmg7XFxuICAgIHJpZ2h0OiA2dnc7XFxuICB9XFxuICAuY3VubmluZzIge1xcbiAgICB0b3A6IDQwdmg7XFxuICAgIHJpZ2h0OiAzdnc7XFxuICB9XFxuICAuY3VubmluZzMge1xcbiAgICBib3R0b206IDR2aDtcXG4gICAgcmlnaHQ6IDV2dztcXG4gIH1cXG4gIC5jdW5uaW5nNCB7XFxuICAgIGJvdHRvbTogNXZoO1xcbiAgICByaWdodDogMzl2dztcXG4gIH1cXG4gIC5jdW5uaW5nNSB7XFxuICAgIGJvdHRvbTogMnZoO1xcbiAgICBsZWZ0OiA0dnc7XFxuICB9XFxuICAuY3VubmluZzYge1xcbiAgICBib3R0b206IDMwdmg7XFxuICAgIHJpZ2h0OiAyMHZ3O1xcbiAgfVxcblxcbjwvc3R5bGU+XFxuPGRpdiBjbGFzcz1cXFwiZ3JleS16b25lIHRhYmxlXFxcIj5cXG4gIDxkaXYgY2xhc3M9XFxcImJsYWNrLXpvbmUgdGFibGUtY2VudGVyXFxcIj5cXG4gIDxkaXYgY2xhc3M9XFxcImRpc3BsYXktNFxcXCIgc3R5bGU9XFxcIndpZHRoOjUwJVxcXCI+XFxuICBJU0lTIGlzIGJhbmtydXB0IGFzIGFuIGlkZW9sb2d5Li4uXFxuICA8YnI+XFxuICA8YnI+XFxuICA8c3BhbiBjbGFzcz1cXFwiY29uY2x1c2lvblxcXCI+YnV0IHRoZXkgYXJlIGN1bm5pbmcgd2l0aCBzdHJhdGVneS48L3NwYW4+XFxuICA8L2Rpdj5cXG4gIDxkaXYgY2xhc3M9XFxcIm5ld3NvdXJjZXNcXFwiPlxcbiAgICA8YSB0YXJnZXQ9XFxcIl9ibGFua1xcXCIgY2xhc3M9XFxcImN1bm5pbmcxXFxcIiBocmVmPVxcXCJodHRwOi8vd3d3Lm55dGltZXMuY29tLzIwMTUvMDYvMTMvd29ybGQvbWlkZGxlZWFzdC9pc2lzLWlzLXdpbm5pbmctbWVzc2FnZS13YXItdXMtY29uY2x1ZGVzLmh0bWw/X3I9MFxcXCI+XFxuICAgICAgICA8aW1nIGNsYXNzPVxcXCJuZXdzc291cmNlLWhvclxcXCIgc3JjPVxcXCIuL2ltZy9pc2lzLXN0cmF0ZWd5LXNvY2lhbC5wbmdcXFwiPlxcbiAgICAgIDwvYT5cXG4gICAgPGEgdGFyZ2V0PVxcXCJfYmxhbmtcXFwiIGNsYXNzPVxcXCJjdW5uaW5nMlxcXCIgaHJlZj1cXFwiaHR0cDovL21vbmV5LmNubi5jb20vMjAxNS8xMi8wNi9uZXdzL2lzaXMtZnVuZGluZy9cXFwiPlxcbiAgICAgICAgPGltZyBjbGFzcz1cXFwibmV3c3NvdXJjZS1ob3JcXFwiIHNyYz1cXFwiLi9pbWcvaXNpcy1zdHJhdGVneS1iaWxsaW9ucy5wbmdcXFwiPlxcbiAgICAgIDwvYT5cXG4gICAgPGEgdGFyZ2V0PVxcXCJfYmxhbmtcXFwiIGNsYXNzPVxcXCJjdW5uaW5nM1xcXCIgaHJlZj1cXFwiaHR0cDovL21vbmV5LmNubi5jb20vMjAxNS8xMi8wNi9uZXdzL2lzaXMtZnVuZGluZy9cXFwiPlxcbiAgICAgICAgPGltZyBjbGFzcz1cXFwibmV3c3NvdXJjZS1ob3JcXFwiIHNyYz1cXFwiLi9pbWcvaXNpcy1zdHJhdGVneS1mbG93LnBuZ1xcXCI+XFxuICAgICAgPC9hPlxcbiAgICA8YSB0YXJnZXQ9XFxcIl9ibGFua1xcXCIgY2xhc3M9XFxcImN1bm5pbmc0XFxcIiBocmVmPVxcXCJodHRwOi8vd3d3Lndhc2hpbmd0b250aW1lcy5jb20vbmV3cy8yMDE2L2phbi8yNy9pc2xhbWljLXN0YXRlcy1jeWJlci1hcm0tc2Vla3MtcmV2ZW5nZS1oYWNrZXJzLWRlYS9cXFwiPlxcbiAgICAgICAgPGltZyBjbGFzcz1cXFwibmV3c3NvdXJjZS1ob3JcXFwiIHNyYz1cXFwiLi9pbWcvaXNpcy1zdHJhdGVneS1oYWNrZXJzLnBuZ1xcXCI+XFxuICAgICAgPC9hPlxcbiAgICA8YSB0YXJnZXQ9XFxcIl9ibGFua1xcXCIgY2xhc3M9XFxcImN1bm5pbmc1XFxcIiBocmVmPVxcXCJodHRwOi8vd3d3LnRoZWF0bGFudGljLmNvbS9pbnRlcm5hdGlvbmFsL2FyY2hpdmUvMjAxNS8xMC93YXItaXNpcy11cy1jb2FsaXRpb24vNDEwMDQ0L1xcXCI+XFxuICAgICAgICA8aW1nIGNsYXNzPVxcXCJuZXdzc291cmNlLWhvclxcXCIgc3JjPVxcXCIuL2ltZy9pc2lzLXN0cmF0ZWd5LWh1bWFuaXR5LnBuZ1xcXCI+XFxuICAgICAgPC9hPlxcbiAgIDxhIHRhcmdldD1cXFwiX2JsYW5rXFxcIiBjbGFzcz1cXFwiY3VubmluZzZcXFwiIGhyZWY9XFxcImh0dHBzOi8vd3d3Lm9wZW5kZW1vY3JhY3kubmV0L25hZmVlei1haG1lZC9pc2lzLXdhbnRzLWRlc3Ryb3ktZ3JleXpvbmUtaG93LXdlLWRlZmVuZFxcXCI+XFxuICAgICAgICA8aW1nIGNsYXNzPVxcXCJuZXdzc291cmNlLWhvciBncmV5em9uZS1zcmNcXFwiIHNyYz1cXFwiLi9pbWcvaXNpcy1zdHJhdGVneS1ncmV5em9uZS5wbmdcXFwiPlxcbiAgICAgIDwvYT5cXG4gIDwvZGl2PlxcbjwvZGl2PlxcbjwvZGl2PlxcblwiO1xuXG5cbi8qKioqKioqKioqKioqKioqKlxuICoqIFdFQlBBQ0sgRk9PVEVSXG4gKiogLi9+L2h0bWwtbG9hZGVyP2F0dHJzPWZhbHNlIS4vc2NlbmVzL2lzaXNiYW5rcnVwdC9zY2VuZS5odG1sXG4gKiogbW9kdWxlIGlkID0gMjhcbiAqKiBtb2R1bGUgY2h1bmtzID0gMFxuICoqLyIsIm1vZHVsZS5leHBvcnRzID0gXCI8c3R5bGU+XFxuICAjaXNpc2ZpZ2h0bWlzcXVvdGUgLnByZW1pc2UsXFxuICAjaXNpc2ZpZ2h0bWlzcXVvdGUgLmNvbmNsdXNpb25cXG4gICB7XFxuICAgICBwb3NpdGlvbjogYWJzb2x1dGU7XFxuICAgICB3aWR0aDogNDB2dztcXG4gICAgIGJvdHRvbTogNDB2aDtcXG4gICAgIG9wYWNpdHk6IDA7XFxuICAgfVxcbiAgICNtYWtld2hpdGV7XFxuICAgIGZvbnQtY29sb3I6d2hpdGU7XFxuICAgfVxcblxcbjwvc3R5bGU+XFxuPGRpdiBjbGFzcz1cXFwidGFibGVcXFwiPlxcbiAgPGRpdiBjbGFzcz1cXFwidGFibGUtY2VudGVyXFxcIiBzdHlsZT1cXFwid2lkdGg6NTAlXFxcIj5cXG4gICAgPGgxIGNsYXNzPVxcXCJwcmVtaXNlXFxcIj5JU0lTIG1heSBxdW90ZSB0aGUgUXVyJ2FuLi4uPC9oMT5cXG4gICAgPGgxIGNsYXNzPVxcXCJjb25jbHVzaW9uXFxcIj5CdXQgZG9lcyBJU0lTIHJlYWQgdGhlIFF1cidhbj88L2gxPlxcbiAgPC9kaXY+XFxuICA8ZGl2IGNsYXNzPVxcXCJ0YWJsZS1jZW50ZXJcXFwiIHN0eWxlPVxcXCJ3aWR0aDo1MFxcXCI+XFxuICAgIDxoMiBjbGFzcz1cXFwicXVyYW4tcmVhZFxcXCI+XFxuICAgICAgPGEgaHJlZj1cXFwiaHR0cDovL3F1cmFuLmNvbS8yLzE5MFxcXCIgdGFyZ2V0PVxcXCJfYmxhbmtcXFwiPjxzcGFuIGNsYXNzPVxcXCJxdXJhbi1oaWRkZW5cXFwiPkZpZ2h0IGluIHRoZSBjYXVzZSBvZiBBbGxhaCA8c3Ryb25nPmFnYWluc3QgdGhvc2Ugd2hvIGZpZ2h0IHlvdTwvc3Ryb25nPiwgYW5kIDxzdHJvbmc+ZG8gbm90IGNvbW1pdCBhZ2dyZXNzaW9uLjwvc3Ryb25nPiA8c3BhbiBjbGFzcz1cXFwicXVvdGUtc291cmNlXFxcIj5RdXJhbiAyOjE5MDwvc3Bhbj48YnI+PGJyPjwvc3Bhbj48L2E+XFxuICAgICAgPGEgaHJlZj1cXFwiaHR0cDovL3F1cmFuLmNvbS8yLzE5MVxcXCIgdGFyZ2V0PVxcXCJfYmxhbmtcXFwiPktpbGwgdGhlbSwgd2hlcmV2ZXIgeW91IG1heSBmaW5kIHRoZW0hPHNwYW4gY2xhc3M9XFxcInF1b3RlLXNvdXJjZVxcXCI+UXVyJ2FuIDI6MTkxPC9zcGFuPjxicj48YnI+PC9hPlxcbiAgICAgIDxhIGhyZWY9XFxcImh0dHA6Ly9xdXJhbi5jb20vMi8xOTNcXFwiIHRhcmdldD1cXFwiX2JsYW5rXFxcIj48c3BhbiBjbGFzcz1cXFwicXVyYW4taGlkZGVuXFxcIj4uLi5pZiB0aGV5IGNlYXNlLCA8c3Ryb25nPmxldCB0aGVyZSBiZSBubyBob3N0aWxpdHkgZXhjZXB0IGFnYWluc3Qgb3BwcmVzc29yczwvc3Ryb25nPi4gPHNwYW4gY2xhc3M9XFxcInF1b3RlLXNvdXJjZVxcXCI+UXVyYW4gMjoxOTM8L3NwYW4+PC9zcGFuPjwvYT5cXG4gICAgPC9oMj5cXG4gIDwvZGl2PlxcbjwvZGl2PlxcblwiO1xuXG5cbi8qKioqKioqKioqKioqKioqKlxuICoqIFdFQlBBQ0sgRk9PVEVSXG4gKiogLi9+L2h0bWwtbG9hZGVyP2F0dHJzPWZhbHNlIS4vc2NlbmVzL2lzaXNmaWdodG1pc3F1b3RlL3NjZW5lLmh0bWxcbiAqKiBtb2R1bGUgaWQgPSAyOVxuICoqIG1vZHVsZSBjaHVua3MgPSAwXG4gKiovIiwibW9kdWxlLmV4cG9ydHMgPSBcIlRoZXkgaGFzIGEgc2ltcGxlIG9iamVjdGl2ZSB0aGV54oCZdmUgc3RhdGVkLlxcblwiO1xuXG5cbi8qKioqKioqKioqKioqKioqKlxuICoqIFdFQlBBQ0sgRk9PVEVSXG4gKiogLi9+L2h0bWwtbG9hZGVyP2F0dHJzPWZhbHNlIS4vc2NlbmVzL2lzaXNvYmplY3RpdmUvc2NlbmUuaHRtbFxuICoqIG1vZHVsZSBpZCA9IDMwXG4gKiogbW9kdWxlIGNodW5rcyA9IDBcbiAqKi8iLCJtb2R1bGUuZXhwb3J0cyA9IFwiPHN0eWxlPlxcbiAgI2lzaXN3YW50c3RvZGl2aWRlIC5hbmltLTIge1xcbiAgICBvcGFjaXR5OiAwO1xcbiAgfVxcblxcbiAgI2lzaXN3YW50c3RvZGl2aWRlIC5kaXNwbGF5LTQge1xcbiAgICBiYWNrZ3JvdW5kOiBibGFjaztcXG4gICAgZGlzcGxheTogaW5saW5lLWJsb2NrO1xcbiAgICBwYWRkaW5nOiAwLjV2dztcXG4gIH1cXG4gIC5jb2xvci16b25lIHtcXG4gICAgcG9zaXRpb246IGFic29sdXRlO1xcbiAgICB3aWR0aDogMTAwdnc7XFxuICAgIGhlaWdodDogMTAwdmg7XFxuICB9XFxuICAuem9uZXMge1xcbiAgICBoZWlnaHQ6IDEwMHZoO1xcbiAgfVxcbiAgLnZpb2xlbnQtem9uZXMge1xcbiAgICB3aWR0aDogMTB2dztcXG4gICAgcG9zaXRpb246IHJlbGF0aXZlO1xcbiAgICB6LWluZGV4OiAyO1xcbiAgfVxcbiAgLmdyZXktem9uZSB7XFxuICAgIGJhY2tncm91bmQ6ICM3NDdCODFcXG4gIH1cXG4gIC53aGl0ZS16b25lIHtcXG4gICAgYmFja2dyb3VuZDogd2hpdGU7XFxuICAgIGZsb2F0OmxlZnQ7XFxuICB9XFxuICAuYmxhY2stem9uZSB7XFxuICAgIGJhY2tncm91bmQ6IGJsYWNrO1xcbiAgICBmbG9hdDpyaWdodDtcXG4gIH1cXG4gICNpc2lzd2FudHN0b2RpdmlkZSAuZGlzcGxheS00e1xcbiAgICBwb3NpdGlvbjogcmVsYXRpdmU7XFxuICAgIHotaW5kZXg6IDM7XFxuICB9XFxuPC9zdHlsZT5cXG48ZGl2IGNsYXNzPVxcXCJjb2xvci16b25lXFxcIj5cXG4gIDxkaXYgY2xhc3M9XFxcInpvbmVzIGJsYWNrLXpvbmUgdmlvbGVudC16b25lc1xcXCI+PC9kaXY+XFxuICA8ZGl2IGNsYXNzPVxcXCJ6b25lcyB3aGl0ZS16b25lIHZpb2xlbnQtem9uZXNcXFwiPjwvZGl2PlxcbjwvZGl2PlxcbjxkaXYgY2xhc3M9XFxcInRhYmxlIGdyZXktem9uZVxcXCI+XFxuICA8ZGl2IGNsYXNzPVxcXCJ0YWJsZS1jZW50ZXJcXFwiPlxcbiAgICA8ZGl2IGNsYXNzPVxcXCJkaXNwbGF5LTQgYW5pbS0yXFxcIj5UaGV5IHdhbnQgdG8gZGl2aWRlIHVzIGFsbCw8L2Rpdj48YnIgLz5cXG4gICAgPGRpdiBjbGFzcz1cXFwiZGlzcGxheS00IGFuaW0tMlxcXCI+ZGVzdHJveSB0aGUgZ3JleSB6b25lIG9mIGNvZXhpc3RlbmNlLDwvZGl2PjxiciAvPlxcbiAgICA8ZGl2IGNsYXNzPVxcXCJkaXNwbGF5LTQgYW5pbS0yXFxcIj5hbmQgc3RhcnQgYW5vdGhlciBncmVhdCB3YXIuPC9kaXY+PGJyIC8+PGJyIC8+XFxuICAgIDxkaXYgY2xhc3M9XFxcImRpc3BsYXktNCBhbmltLTFcXFwiPldlIHdvbid0IGxldCB0aGF0IGhhcHBlbi48L2Rpdj5cXG4gIDwvZGl2PlxcbjwvZGl2PlxcblwiO1xuXG5cbi8qKioqKioqKioqKioqKioqKlxuICoqIFdFQlBBQ0sgRk9PVEVSXG4gKiogLi9+L2h0bWwtbG9hZGVyP2F0dHJzPWZhbHNlIS4vc2NlbmVzL2lzaXN3YW50c3RvZGl2aWRlL3NjZW5lLmh0bWxcbiAqKiBtb2R1bGUgaWQgPSAzMVxuICoqIG1vZHVsZSBjaHVua3MgPSAwXG4gKiovIiwibW9kdWxlLmV4cG9ydHMgPSBcIjxzdHlsZT5cXG4gIC5sZWZ0IHtcXG4gICAgd2lkdGg6IDQwdnc7XFxuICB9XFxuICAubmV3c3NvdXJjZSB7XFxuICAgIG1heC1oZWlnaHQ6IDQwdmg7XFxuICAgIGRpc3BsYXk6IGJsb2NrO1xcbiAgICBib3gtc2hhZG93OiAwIDF2dyAydncgcmdiYSgwLDAsMCwwLjYpO1xcbiAgICBtYXJnaW4tYm90dG9tOiA1dmg7XFxuICB9XFxuICAubmV3c291cmNlcyB7XFxuICAgIHBvc2l0aW9uOiBhYnNvbHV0ZTtcXG4gICAgd2lkdGg6IDEwMHZ3O1xcbiAgICBoZWlnaHQ6IDEwMHZoO1xcbiAgICB0b3A6IDA7XFxuICAgIGxlZnQ6IDA7XFxuICAgIC8qb3ZlcmZsb3c6IGhpZGRlbjsqL1xcbiAgICAvKnRyYW5zZm9ybTogdHJhbnNsYXRlWSg4MCUpOyovXFxuICB9XFxuICAubmV3c291cmNlcyBhIHtcXG4gICAgbWF4LXdpZHRoOiA0MHZ3O1xcbiAgICBwb3NpdGlvbjogYWJzb2x1dGU7XFxuICAgIG9wYWNpdHk6IDA7XFxuICB9XFxuLyogICNpdGlzbnRlYXN5IC5kaXNwbGF5LTQge1xcbiAgICBvcGFjaXR5OiAwO1xcbiAgfSovXFxuICAuaXNudGVhc3lfMSB7XFxuICAgIHRvcDogOHZoO1xcbiAgICByaWdodDogNXZ3O1xcbiAgfVxcbiAgIC5pc250ZWFzeV8yIHtcXG4gICAgdG9wOiAyOHZoO1xcbiAgICByaWdodDogNXZ3O1xcbiAgfVxcbiAgLmlzbnRlYXN5XzMge1xcbiAgICB0b3A6IDQ1dmg7XFxuICAgIHJpZ2h0OiA1dnc7XFxuICB9XFxuICAuaXNudGVhc3lfNCB7XFxuICAgIHRvcDogNjB2aDtcXG4gICAgcmlnaHQ6IDV2dztcXG4gIH1cXG4gIC5pc250ZWFzeV81IHtcXG4gICAgdG9wOiA2MHZoO1xcbiAgICByaWdodDogMjB2dztcXG4gIH1cXG4gIC5pc250ZWFzeV82IHtcXG4gICAgdG9wOiA2NXZoO1xcbiAgICByaWdodDogMzJ2dztcXG4gIH1cXG4gIC5pc250ZWFzeV83IHtcXG4gICAgdG9wOiA2MnZoO1xcbiAgICByaWdodDogNTB2dztcXG4gIH1cXG4gIC5pc250ZWFzeV84IHtcXG4gICAgdG9wOiA2NnZoO1xcbiAgICByaWdodDogNjV2dztcXG4gIH1cXG4gICAuaXNudGVhc3lfOSB7XFxuICAgIHRvcDogNXZoO1xcbiAgICByaWdodDogNjV2dztcXG4gIH1cXG4gICAuaXNudGVhc3lfMTAge1xcbiAgICB0b3A6IDN2aDtcXG4gICAgcmlnaHQ6IDUwdnc7XFxuICB9XFxuICAgLmlzbnRlYXN5XzExIHtcXG4gICAgdG9wOiA5dmg7XFxuICAgIHJpZ2h0OiAzOHZ3O1xcbiAgfVxcbiAgIC5pc250ZWFzeV8xMiB7XFxuICAgIHRvcDogNXZoO1xcbiAgICByaWdodDogMjB2dztcXG4gIH1cXG4gICAuaXNudGVhc3lfMTMge1xcbiAgICB0b3A6IDM1dmg7XFxuICAgIHJpZ2h0OiAyOHZ3O1xcbiAgfVxcbjwvc3R5bGU+XFxuPGRpdiBjbGFzcz1cXFwidGFibGVcXFwiPlxcbiAgPGRpdiBjbGFzcz1cXFwidGFibGUtY2VudGVyXFxcIj5cXG4gIDxkaXYgY2xhc3M9XFxcImRpc3BsYXktNCBsZWZ0XFxcIj5JdCBpc27igJl0IGVhc3kgYmVpbmcgTXVzbGltIGFueXdoZXJl4oCmIDwvZGl2PlxcbiAgPGRpdiBjbGFzcz1cXFwibmV3c291cmNlc1xcXCI+XFxuICAgIDxhIHRhcmdldD1cXFwiX2JsYW5rXFxcIiBjbGFzcz1cXFwiaXNudGVhc3lfMVxcXCIgaHJlZj1cXFwiaHR0cDovL2NvbnRlbnQudGltZS5jb20vdGltZS9jb3ZlcnMvMCwxNjY0MSwyMDEwMDgzMCwwMC5odG1sXFxcIj5cXG4gICAgICA8aW1nIGNsYXNzPVxcXCJuZXdzc291cmNlXFxcIiBzcmM9XFxcIi4vaW1nL2hhdGVjcmltZS1hbWVyaWNhLmpwZ1xcXCIgPlxcbiAgICA8L2E+XFxuICAgIDxhIHRhcmdldD1cXFwiX2JsYW5rXFxcIiBjbGFzcz1cXFwiaXNudGVhc3lfMlxcXCIgaHJlZj1cXFwiaHR0cDovL2FtZXJpY2EuYWxqYXplZXJhLmNvbS9hcnRpY2xlcy8yMDE1LzEyLzkvdXMtbXVzbGltcy1leHBlcmllbmNlLXN1cmdlLWluLWlzbGFtb3Bob2JpYy1hdHRhY2tzLmh0bWxcXFwiPlxcbiAgICAgIDxpbWcgY2xhc3M9XFxcIm5ld3Nzb3VyY2VcXFwiIHNyYz1cXFwiLi9pbWcvaGF0ZWNyaW1lLWFtZXJpY2EyLnBuZ1xcXCIgPlxcbiAgICA8L2E+XFxuICAgIDxhIHRhcmdldD1cXFwiX2JsYW5rXFxcIiBjbGFzcz1cXFwiaXNudGVhc3lfM1xcXCIgaHJlZj1cXFwiaHR0cDovL3d3dy5pbnF1aXNpdHIuY29tLzI2MTA3MTcvaGF0ZS1jcmltZS1zdHJpbmctb2YtYW50aS1tdXNsaW0tYXR0YWNrcy1oaXQtY2FuYWRhLmh0bWxcXFwiPlxcbiAgICAgIDxpbWcgY2xhc3M9XFxcIm5ld3Nzb3VyY2VcXFwiIHNyYz1cXFwiLi9pbWcvaGF0ZWNyaW1lLWNhbmFkYS5wbmdcXFwiID5cXG4gICAgPC9hPlxcbiAgICA8YSB0YXJnZXQ9XFxcIl9ibGFua1xcXCIgY2xhc3M9XFxcImlzbnRlYXN5XzRcXFwiIGhyZWY9XFxcImh0dHA6Ly9hbWVyaWNhLmFsamF6ZWVyYS5jb20vYXJ0aWNsZXMvMjAxNS8yLzE3L3RocmVhdHMtdG8tbXVzbGltLWFtZXJpY2FuLWNvbW11bml0eS1pbnRlbnNpZmllcy1hZnRlci1jaGFwZWwtaGlsbC1zaG9vdGluZy5odG1sXFxcIj5cXG4gICAgICA8aW1nIGNsYXNzPVxcXCJuZXdzc291cmNlXFxcIiBzcmM9XFxcIi4vaW1nL2hhdGVjcmltZS1jaGFwZWxoaWxsLnBuZ1xcXCIgPlxcbiAgICA8L2E+XFxuICAgIDxhIHRhcmdldD1cXFwiX2JsYW5rXFxcIiBjbGFzcz1cXFwiaXNudGVhc3lfNVxcXCIgaHJlZj1cXFwiaHR0cDovL3d3dy50ZWxlZ3JhcGguY28udWsvbmV3cy93b3JsZG5ld3MvZXVyb3BlL2ZyYW5jZS8xMjA3NTAxOC9IYXRlLWNyaW1lcy1hZ2FpbnN0LU11c2xpbXMtYW5kLUpld3Mtc29hci1pbi1GcmFuY2UuaHRtbFxcXCI+XFxuICAgICAgPGltZyBjbGFzcz1cXFwibmV3c3NvdXJjZVxcXCIgc3JjPVxcXCIuL2ltZy9oYXRlY3JpbWUtZnJhbmNlLnBuZ1xcXCIgPlxcbiAgICA8L2E+XFxuICAgIDxhIHRhcmdldD1cXFwiX2JsYW5rXFxcIiBjbGFzcz1cXFwiaXNudGVhc3lfNlxcXCIgaHJlZj1cXFwiaHR0cHM6Ly93d3cud2FzaGluZ3RvbnBvc3QuY29tL3dvcmxkL2V1cm9wZS9yZWxpZ2lvdXMtbGliZXJ0aWVzLXVuZGVyLXN0cmFpbi1mb3ItbXVzbGltcy1pbi1mcmFuY2UvMjAxNS8xMS8yMi84MzA1NGMwNi05MTJmLTExZTUtYmVmYS05OWNlZWJjYmIyNzJfc3RvcnkuaHRtbFxcXCI+XFxuICAgICAgPGltZyBjbGFzcz1cXFwibmV3c3NvdXJjZVxcXCIgc3JjPVxcXCIuL2ltZy9oYXRlY3JpbWUtZnJhbmNlMi5wbmdcXFwiID5cXG4gICAgPC9hPlxcbiAgICA8YSB0YXJnZXQ9XFxcIl9ibGFua1xcXCIgY2xhc3M9XFxcImlzbnRlYXN5XzdcXFwiIGhyZWY9XFxcImh0dHA6Ly9sb3NhbmdlbGVzLmNic2xvY2FsLmNvbS8yMDE1LzEyLzEzLzItbW9zcXVlcy1pbi1oYXd0aG9ybmUtdmFuZGFsaXplZC13aXRoLWdyYWZmaXRpL1xcXCI+XFxuICAgICAgPGltZyBjbGFzcz1cXFwibmV3c3NvdXJjZVxcXCIgc3JjPVxcXCIuL2ltZy9oYXRlY3JpbWUtZ3JlbmFkZWdyYWZmaXRpLnBuZ1xcXCIgPlxcbiAgICA8L2E+XFxuICAgIDxhIHRhcmdldD1cXFwiX2JsYW5rXFxcIiBjbGFzcz1cXFwiaXNudGVhc3lfOFxcXCIgaHJlZj1cXFwiaHR0cDovL2t0bGEuY29tLzIwMTUvMTIvMTEvcG9zc2libGUtaGF0ZS1jcmltZS1pbnZlc3RpZ2F0ZWQtYWZ0ZXItbWFuLXB1bGxzLW91dC1rbmlmZS1vbi1tdXNsaW0td29tYW4taW4tY2hpbm8taGlsbHMtc2hlcmlmZnMtZGVwYXJ0bWVudC9cXFwiPlxcbiAgICAgIDxpbWcgY2xhc3M9XFxcIm5ld3Nzb3VyY2VcXFwiIHNyYz1cXFwiLi9pbWcvaGF0ZWNyaW1lLWtuaWZlLnBuZ1xcXCIgPlxcbiAgICA8L2E+XFxuICAgIDxhIHRhcmdldD1cXFwiX2JsYW5rXFxcIiBjbGFzcz1cXFwiaXNudGVhc3lfOVxcXCIgaHJlZj1cXFwiaHR0cDovL3d3dy5jbm4uY29tLzIwMTUvMTIvMTIvdXMvY2FsaWZvcm5pYS1tb3NxdWUtZmlyZS9cXFwiPlxcbiAgICAgIDxpbWcgY2xhc3M9XFxcIm5ld3Nzb3VyY2VcXFwiIHNyYz1cXFwiLi9pbWcvaGF0ZWNyaW1lLW1vc3F1ZWZpcmUucG5nXFxcIiA+XFxuICAgIDwvYT5cXG4gICAgPGEgdGFyZ2V0PVxcXCJfYmxhbmtcXFwiIGNsYXNzPVxcXCJpc250ZWFzeV8xMFxcXCIgaHJlZj1cXFwiaHR0cDovL3d3dy5mb3huZXdzLmNvbS90cmFuc2NyaXB0LzIwMTQvMTAvMDcvYmlsbC1vcmVpbGx5LWlzbGFtLWRlc3RydWN0aXZlLWZvcmNlLXdvcmxkL1xcXCI+XFxuICAgICAgPGltZyBjbGFzcz1cXFwibmV3c3NvdXJjZVxcXCIgc3JjPVxcXCIuL2ltZy9oYXRlY3JpbWUtb3JlaWxseS5wbmdcXFwiID5cXG4gICAgPC9hPlxcbiAgICA8YSB0YXJnZXQ9XFxcIl9ibGFua1xcXCIgY2xhc3M9XFxcImlzbnRlYXN5XzExXFxcIiBocmVmPVxcXCJodHRwOi8vd3d3Lm55ZGFpbHluZXdzLmNvbS9uZXdzL25hdGlvbmFsL211c2xpbS1nYS1naXJsLWNsYXNzLWdhc3BlZC10ZWFjaGVyLWJvbWItam9rZS1hcnRpY2xlLTEuMjQ2MzQ5NVxcXCI+XFxuICAgICAgPGltZyBjbGFzcz1cXFwibmV3c3NvdXJjZSBoaWRlc291cmNlXFxcIiBzcmM9XFxcIi4vaW1nL2hhdGVjcmltZS1zdHVkZW50YmFja3BhY2sucG5nXFxcIiA+XFxuICAgIDwvYT5cXG4gICAgPGEgdGFyZ2V0PVxcXCJfYmxhbmtcXFwiIGNsYXNzPVxcXCJpc250ZWFzeV8xMlxcXCIgaHJlZj1cXFwiaHR0cDovL3RpbWUuY29tLzQxMzk0NzYvZG9uYWxkLXRydW1wLXNodXRkb3duLW11c2xpbS1pbW1pZ3JhdGlvbi9cXFwiPlxcbiAgICAgIDxpbWcgY2xhc3M9XFxcIm5ld3Nzb3VyY2UgaGlkZXNvdXJjZVxcXCIgc3JjPVxcXCIuL2ltZy9oYXRlY3JpbWUtdHJ1bXAucG5nXFxcIiA+XFxuICAgIDwvYT5cXG4gICAgPGEgdGFyZ2V0PVxcXCJfYmxhbmtcXFwiIGNsYXNzPVxcXCJpc250ZWFzeV8xM1xcXCIgaHJlZj1cXFwiaHR0cHM6Ly90b2RheS55b3Vnb3YuY29tL25ld3MvMjAxNS8xMi8xMS90d28tdGhpcmRzLXJlcHVibGljYW5zLWJhY2stdHJ1bXAtcHJvcG9zYWwvXFxcIj5cXG4gICAgICA8aW1nIGNsYXNzPVxcXCJuZXdzc291cmNlIHRydW1wXFxcIiBzcmM9XFxcIi4vaW1nL2hhdGVjcmltZS1wb2xsLnBuZ1xcXCIgPlxcbiAgICA8L2E+XFxuICA8L2Rpdj5cXG48L2Rpdj5cXG48L2Rpdj5cXG5cIjtcblxuXG4vKioqKioqKioqKioqKioqKipcbiAqKiBXRUJQQUNLIEZPT1RFUlxuICoqIC4vfi9odG1sLWxvYWRlcj9hdHRycz1mYWxzZSEuL3NjZW5lcy9pdGlzbnRlYXN5L3NjZW5lLmh0bWxcbiAqKiBtb2R1bGUgaWQgPSAzMlxuICoqIG1vZHVsZSBjaHVua3MgPSAwXG4gKiovIiwibW9kdWxlLmV4cG9ydHMgPSBcIlxcblxcbjxkaXYgY2xhc3M9XFxcInRhYmxlXFxcIj5cXG4gIDxkaXYgY2xhc3M9XFxcInRhYmxlLWNlbnRlclxcXCI+XFxuICAgIDxkaXYgY2xhc3M9XFxcImRpc3BsYXktNCB0ZXh0LWJvbGQgdGV4dC1jZW50ZXJlZFxcXCI+SVNJUyBpcyA8c3BhbiBzdHlsZT1cXFwiY29sb3I6I0FCMkUyRVxcXCIgaWQ9XFxcIm11cmRlclxcXCI+bXVyZGVyaW5nPC9zcGFuPiBJc2xhbSdzIG5hbWU8L2Rpdj5cXG4gIDwvZGl2PlxcbjwvZGl2PlxcblxcblxcbjwhLS1cXG5WaWV3IG9mIElTSVMgT3ZlcndoZWxtaW5nbHkgTmVnYXRpdmUgKFBldyBiYXIgZ3JhcGgpXFxuaHR0cDovL3d3dy5wZXdyZXNlYXJjaC5vcmcvZmFjdC10YW5rLzIwMTUvMTEvMTcvaW4tbmF0aW9ucy13aXRoLXNpZ25pZmljYW50LW11c2xpbS1wb3B1bGF0aW9ucy1tdWNoLWRpc2RhaW4tZm9yLWlzaXMvZnRfMTUtMTEtMTdfaXNpc192aWV3cy9cXG4gLS0+XFxuXCI7XG5cblxuLyoqKioqKioqKioqKioqKioqXG4gKiogV0VCUEFDSyBGT09URVJcbiAqKiAuL34vaHRtbC1sb2FkZXI/YXR0cnM9ZmFsc2UhLi9zY2VuZXMvaXRzZ290dG9lbmQvc2NlbmUuaHRtbFxuICoqIG1vZHVsZSBpZCA9IDMzXG4gKiogbW9kdWxlIGNodW5rcyA9IDBcbiAqKi8iLCJtb2R1bGUuZXhwb3J0cyA9IFwiPGRpdiBjbGFzcz1cXFwidGFibGVcXFwiPlxcbiAgPGRpdiBjbGFzcz1cXFwidGFibGUtY2VudGVyXFxcIj5cXG4gICAgPGRpdiBjbGFzcz1cXFwiZGlzcGxheS00IHRleHQtY2VudGVyZWRcXFwiPkFORCBUSEFU4oCZUyBHT1QgVE8gRU5ELjwvZGl2PlxcbiAgPC9kaXY+XFxuPC9kaXY+XFxuXCI7XG5cblxuLyoqKioqKioqKioqKioqKioqXG4gKiogV0VCUEFDSyBGT09URVJcbiAqKiAuL34vaHRtbC1sb2FkZXI/YXR0cnM9ZmFsc2UhLi9zY2VuZXMvaXdhbnRteWlzbGFtYmFjazEvc2NlbmUuaHRtbFxuICoqIG1vZHVsZSBpZCA9IDM0XG4gKiogbW9kdWxlIGNodW5rcyA9IDBcbiAqKi8iLCJtb2R1bGUuZXhwb3J0cyA9IFwiPHN0eWxlPlxcblxcbi5maXJzdCwuc2Vjb25kLCAudGhpcmQsIC5mb3VydGgge1xcblxcdG9wYWNpdHk6IDBcXG59XFxuI2xpa2VwZWFjZSAuZGlzcGxheS00IHtcXG5cXHRvcGFjaXR5OiAxIWltcG9ydGFudDtcXG5cXHR0cmFuc2Zvcm06IHRyYW5zbGF0ZVkoMzAlKTtcXG59XFxuXFxuXFxuI2xpa2VwZWFjZSBpbnB1dCB7XFxuXFx0Zm9udC1zaXplOiAzdm1pbjtcXG5cXHRiYWNrZ3JvdW5kOiAjNzQ3QjgxO1xcblxcdGNvbG9yOiB3aGl0ZTtcXG5cXHRwYWRkaW5nOiAyJTtcXG5cXHR3aWR0aDogYXV0bztcXG5cXHRtYXJnaW46IDAuNXZtaW4gMDtcXG5cXHR3aWR0aDogOTYlO1xcbn1cXG5cXG4jbGlrZXBlYWNlIGxhYmVsIHtcXG5cXHRjb2xvcjogIzc0N0I4MTtcXG59XFxuXFxuI2xpa2VwZWFjZSBpbnB1dFt0eXBlPXN1Ym1pdF0ge1xcblxcdGNvbG9yOiB3aGl0ZTtcXG5cXHRiYWNrZ3JvdW5kOiAjM0NBMkNEO1xcblxcdHdpZHRoOiBhdXRvO1xcblxcdG1hcmdpbi10b3A6IDJ2bWluO1xcblxcdGN1cnNvcjogcG9pbnRlcjtcXG59XFxuXFxuI2xpa2VwZWFjZSBsYWJlbCB7XFxuXFx0ZGlzcGxheTogYmxvY2s7XFxuXFx0bWFyZ2luOiAwLjJ2bWluIDAuNXZtaW47XFxuXFx0dGV4dC10cmFuc2Zvcm06IHVwcGVyY2FzZTtcXG5cXHRmb250LXdlaWdodDogYm9sZDtcXG5cXHRmb250LXNpemU6IDIuNXZtaW47XFxufVxcblxcbiNsaWtlcGVhY2UgI21jX2VtYmVkX3NpZ251cCB7XFxuXFx0d2lkdGg6IDUwdm1heDtcXG5cXHRiYWNrZ3JvdW5kOiB3aGl0ZTtcXG5cXHRtYXJnaW46IDAgYXV0bztcXG5cXHRwYWRkaW5nOiAydm1pbjtcXG59XFxuXFxuI2xpa2VwZWFjZSBoMiB7XFxuXFx0Y29sb3I6IGJsYWNrO1xcblxcdG1hcmdpbi1ib3R0b206IDJ2bWluXFxufVxcbjwvc3R5bGU+XFxuPGRpdiBjbGFzcz1cXFwidGFibGUgZ3JleS16b25lXFxcIj5cXG5cXHRcXHQ8ZGl2IGNsYXNzPVxcXCJ0YWJsZS1jZW50ZXJcXFwiPlxcbiAgXFx0XFx0PGRpdiBjbGFzcz1cXFwiZGlzcGxheS00IHRleHQtY2VudGVyZWRcXFwiPjxzcGFuIGNsYXNzPVxcXCJmaXJzdFxcXCI+TVVTTElNUzwvc3Bhbj4gPHNwYW4gY2xhc3M9XFxcInNlY29uZFxcXCI+QUdBSU5TVDwvc3Bhbj4gPHNwYW4gY2xhc3M9XFxcInRoaXJkXFxcIj5JU0lTPC9zcGFuPjwvZGl2PlxcblxcdFxcdFxcdDxkaXYgY2xhc3M9XFxcImZvdXJ0aFxcXCI+XFxuXFxuXFx0XFx0XFx0XFx0PCEtLSBCZWdpbiBNYWlsQ2hpbXAgU2lnbnVwIEZvcm0gLS0+XFxuXFx0XFx0XFx0XFx0PGRpdiBpZD1cXFwibWNfZW1iZWRfc2lnbnVwXFxcIj5cXG5cXHRcXHRcXHRcXHQ8Zm9ybSBhY3Rpb249XFxcIi8vbXVzbGltc2FnYWluc3Rpc2lzLnVzMTIubGlzdC1tYW5hZ2UuY29tL3N1YnNjcmliZS9wb3N0P3U9OWQyZGQ4MWNjYjA3YjcxMDU5MzQ3NTQyMSZhbXA7aWQ9ODFhNWY1MjUwY1xcXCIgbWV0aG9kPVxcXCJwb3N0XFxcIiBpZD1cXFwibWMtZW1iZWRkZWQtc3Vic2NyaWJlLWZvcm1cXFwiIG5hbWU9XFxcIm1jLWVtYmVkZGVkLXN1YnNjcmliZS1mb3JtXFxcIiBjbGFzcz1cXFwidmFsaWRhdGVcXFwiIHRhcmdldD1cXFwiX2JsYW5rXFxcIiBub3ZhbGlkYXRlPlxcblxcdFxcdFxcdFxcdCAgICA8ZGl2IGlkPVxcXCJtY19lbWJlZF9zaWdudXBfc2Nyb2xsXFxcIj5cXG5cXHRcXHRcXHRcXHRcXHQ8aDI+VXBkYXRlcyBTb29uLiBTdWJzY3JpYmUgTm93LjwvaDI+XFxuXFx0XFx0XFx0XFx0PGRpdiBjbGFzcz1cXFwibWMtZmllbGQtZ3JvdXBcXFwiPlxcblxcdFxcdFxcdFxcdFxcdDxsYWJlbCBmb3I9XFxcIm1jZS1FTUFJTFxcXCI+RW1haWwgQWRkcmVzcyA8L2xhYmVsPlxcblxcdFxcdFxcdFxcdFxcdDxpbnB1dCB0eXBlPVxcXCJlbWFpbFxcXCIgdmFsdWU9XFxcIlxcXCIgbmFtZT1cXFwiRU1BSUxcXFwiIGNsYXNzPVxcXCJyZXF1aXJlZCBlbWFpbFxcXCIgaWQ9XFxcIm1jZS1FTUFJTFxcXCI+XFxuXFx0XFx0XFx0XFx0PC9kaXY+XFxuXFx0XFx0XFx0XFx0PGRpdiBjbGFzcz1cXFwibWMtZmllbGQtZ3JvdXBcXFwiPlxcblxcdFxcdFxcdFxcdFxcdDxsYWJlbCBmb3I9XFxcIm1jZS1GTkFNRVxcXCI+Rmlyc3QgTmFtZSA8L2xhYmVsPlxcblxcdFxcdFxcdFxcdFxcdDxpbnB1dCB0eXBlPVxcXCJ0ZXh0XFxcIiB2YWx1ZT1cXFwiXFxcIiBuYW1lPVxcXCJGTkFNRVxcXCIgY2xhc3M9XFxcInJlcXVpcmVkXFxcIiBpZD1cXFwibWNlLUZOQU1FXFxcIj5cXG5cXHRcXHRcXHRcXHQ8L2Rpdj5cXG5cXHRcXHRcXHRcXHQ8ZGl2IGNsYXNzPVxcXCJtYy1maWVsZC1ncm91cFxcXCI+XFxuXFx0XFx0XFx0XFx0XFx0PGxhYmVsIGZvcj1cXFwibWNlLUxOQU1FXFxcIj5MYXN0IE5hbWUgPC9sYWJlbD5cXG5cXHRcXHRcXHRcXHRcXHQ8aW5wdXQgdHlwZT1cXFwidGV4dFxcXCIgdmFsdWU9XFxcIlxcXCIgbmFtZT1cXFwiTE5BTUVcXFwiIGNsYXNzPVxcXCJyZXF1aXJlZFxcXCIgaWQ9XFxcIm1jZS1MTkFNRVxcXCI+XFxuXFx0XFx0XFx0XFx0PC9kaXY+XFxuXFx0XFx0XFx0XFx0PGRpdiBjbGFzcz1cXFwibWMtZmllbGQtZ3JvdXBcXFwiPlxcblxcdFxcdFxcdFxcdFxcdDxsYWJlbCBmb3I9XFxcIm1jZS1TS0lMTFNcXFwiPkhvdyBjYW4geW91IGhlbHA/IChTa2lsbHMpIDwvbGFiZWw+XFxuXFx0XFx0XFx0XFx0XFx0PGlucHV0IHR5cGU9XFxcInRleHRcXFwiIHZhbHVlPVxcXCJcXFwiIG5hbWU9XFxcIlNLSUxMU1xcXCIgY2xhc3M9XFxcIlxcXCIgaWQ9XFxcIm1jZS1TS0lMTFNcXFwiPlxcblxcdFxcdFxcdFxcdDwvZGl2PlxcblxcdFxcdFxcdFxcdFxcdDxkaXYgaWQ9XFxcIm1jZS1yZXNwb25zZXNcXFwiIGNsYXNzPVxcXCJjbGVhclxcXCI+XFxuXFx0XFx0XFx0XFx0XFx0XFx0PGRpdiBjbGFzcz1cXFwicmVzcG9uc2VcXFwiIGlkPVxcXCJtY2UtZXJyb3ItcmVzcG9uc2VcXFwiIHN0eWxlPVxcXCJkaXNwbGF5Om5vbmVcXFwiPjwvZGl2PlxcblxcdFxcdFxcdFxcdFxcdFxcdDxkaXYgY2xhc3M9XFxcInJlc3BvbnNlXFxcIiBpZD1cXFwibWNlLXN1Y2Nlc3MtcmVzcG9uc2VcXFwiIHN0eWxlPVxcXCJkaXNwbGF5Om5vbmVcXFwiPjwvZGl2PlxcblxcdFxcdFxcdFxcdFxcdDwvZGl2PiAgICA8IS0tIHJlYWwgcGVvcGxlIHNob3VsZCBub3QgZmlsbCB0aGlzIGluIGFuZCBleHBlY3QgZ29vZCB0aGluZ3MgLSBkbyBub3QgcmVtb3ZlIHRoaXMgb3IgcmlzayBmb3JtIGJvdCBzaWdudXBzLS0+XFxuXFx0XFx0XFx0XFx0ICAgIDxkaXYgc3R5bGU9XFxcInBvc2l0aW9uOiBhYnNvbHV0ZTsgbGVmdDogLTUwMDBweDtcXFwiIGFyaWEtaGlkZGVuPVxcXCJ0cnVlXFxcIj48aW5wdXQgdHlwZT1cXFwidGV4dFxcXCIgbmFtZT1cXFwiYl85ZDJkZDgxY2NiMDdiNzEwNTkzNDc1NDIxXzgxYTVmNTI1MGNcXFwiIHRhYmluZGV4PVxcXCItMVxcXCIgdmFsdWU9XFxcIlxcXCI+PC9kaXY+XFxuXFx0XFx0XFx0XFx0ICAgIDxkaXYgY2xhc3M9XFxcImNsZWFyXFxcIj48aW5wdXQgdHlwZT1cXFwic3VibWl0XFxcIiB2YWx1ZT1cXFwiU3Vic2NyaWJlXFxcIiBuYW1lPVxcXCJzdWJzY3JpYmVcXFwiIGlkPVxcXCJtYy1lbWJlZGRlZC1zdWJzY3JpYmVcXFwiIGNsYXNzPVxcXCJidXR0b25cXFwiPlxcblxcdFxcdFxcdFxcdCAgICA8L2Rpdj5cXG5cXG48YSBocmVmPVxcXCJodHRwczovL3R3aXR0ZXIuY29tL3NoYXJlXFxcIiBjbGFzcz1cXFwidHdpdHRlci1zaGFyZS1idXR0b25cXFwiIGRhdGEtdXJsPVxcXCJodHRwOi8vd3d3Lm11c2xpbXNhZ2FpbnN0aXNpcy5jb21cXFwiIGRhdGEtc2l6ZT1cXFwibGFyZ2VcXFwiIGRhdGEtaGFzaHRhZ3M9XFxcIm11c2xpbXNhZ2FpbnN0aXNpc1xcXCIgZGF0YS1kbnQ9XFxcInRydWVcXFwiPlR3ZWV0PC9hPlxcblxcdFxcdFxcdFxcdDwvZm9ybT5cXG5cXHRcXHRcXHRcXHQ8L2Rpdj5cXG5cXHRcXHRcXHRcXHQ8IS0tRW5kIG1jX2VtYmVkX3NpZ251cC0tPlxcblxcdFxcdFxcdFxcdDxkaXYgY2xhc3M9XFxcImZiLXNoYXJlLWJ1dHRvblxcXCIgZGF0YS1ocmVmPVxcXCJodHRwOi8vd3d3Lm11c2xpbXNhZ2FpbnN0aXNpcy5jb21cXFwiIGRhdGEtbGF5b3V0PVxcXCJidXR0b25cXFwiPjwvZGl2PlxcblxcdFxcdFxcdDwvZGl2PlxcblxcdFxcdDwvZGl2PlxcblxcdFxcdDwvZGl2PlxcblxcbjwvZGl2PlwiO1xuXG5cbi8qKioqKioqKioqKioqKioqKlxuICoqIFdFQlBBQ0sgRk9PVEVSXG4gKiogLi9+L2h0bWwtbG9hZGVyP2F0dHJzPWZhbHNlIS4vc2NlbmVzL2xpa2VwZWFjZS9zY2VuZS5odG1sXG4gKiogbW9kdWxlIGlkID0gMzVcbiAqKiBtb2R1bGUgY2h1bmtzID0gMFxuICoqLyIsIm1vZHVsZS5leHBvcnRzID0gXCI8ZGl2IGNsYXNzPVxcXCJ0YWJsZVxcXCI+XFxuICA8ZGl2IGNsYXNzPVxcXCJ0YWJsZS1jZW50ZXJcXFwiPlxcbiAgICA8ZGl2IGNsYXNzPVxcXCJkaXNwbGF5LTQgdGV4dC1jZW50ZXJlZFxcXCI+V2UgYXJlIHRpcmVkIG9mIHRoZSBuZWdhdGl2ZSBwcmVzcy4gPGJyPjxicj5cXG4gICAgICBUaXJlZCBvZiB0aGUgaGF0ZSBjcmltZXMuPC9kaXY+XFxuICA8L2Rpdj5cXG48L2Rpdj5cXG5cIjtcblxuXG4vKioqKioqKioqKioqKioqKipcbiAqKiBXRUJQQUNLIEZPT1RFUlxuICoqIC4vfi9odG1sLWxvYWRlcj9hdHRycz1mYWxzZSEuL3NjZW5lcy9taXhlZGZlZWxpbmdzL3NjZW5lLmh0bWxcbiAqKiBtb2R1bGUgaWQgPSAzNlxuICoqIG1vZHVsZSBjaHVua3MgPSAwXG4gKiovIiwibW9kdWxlLmV4cG9ydHMgPSBcIlxcbjxkaXYgY2xhc3M9XFxcIm11c2xpbXMtYmVsaWV2ZS1pbmRpdmlkdWFsLWxpZmUgZ3JleS16b25lXFxcIj5cXG5cXHQ8ZGl2IGNsYXNzPVxcXCJ0YWJsZSBcXFwiPlxcbiAgXFx0XFx0PGRpdiBjbGFzcz1cXFwidGFibGUtY2VudGVyXFxcIj5cXG4gICAgXFx0XFx0PGRpdiBjbGFzcz1cXFwiZGlzcGxheS00IHRleHQtY2VudGVyZWRcXFwiPi4uLiBidXQgd2UgYXJlIE11c2xpbXMuIDxicj48YnI+IE11c2xpbXMgdGhhdCBiZWxpZXZlIEVWRVJZIGxpZmUgaXMgc2FjcmVkLjwvZGl2PlxcbiAgXFx0XFx0PC9kaXY+XFxuXFx0PC9kaXY+XFxuPC9kaXY+XFxuXCI7XG5cblxuLyoqKioqKioqKioqKioqKioqXG4gKiogV0VCUEFDSyBGT09URVJcbiAqKiAuL34vaHRtbC1sb2FkZXI/YXR0cnM9ZmFsc2UhLi9zY2VuZXMvbXVzbGltc2JlbGlldmVpbmRpdmlkdWFsbGlmZS9zY2VuZS5odG1sXG4gKiogbW9kdWxlIGlkID0gMzdcbiAqKiBtb2R1bGUgY2h1bmtzID0gMFxuICoqLyIsIm1vZHVsZS5leHBvcnRzID0gXCI8c3R5bGU+XFxuLm91dC10by1nZXQteW91IHtcXG4gICAgb3BhY2l0eTogMDtcXG59XFxuPC9zdHlsZT5cXG5cXG48ZGl2IGNsYXNzPVxcXCJvdXQtdG8tZ2V0LXlvdVxcXCI+XFxuXFx0PGRpdiBjbGFzcz1cXFwidGFibGUgXFxcIj5cXG5cXHQgIDxkaXYgY2xhc3M9XFxcInRhYmxlLWNlbnRlclxcXCI+XFxuXFx0ICAgIDxkaXYgY2xhc3M9XFxcImRpc3BsYXktNCB0ZXh0LWNlbnRlcmVkXFxcIj4uLi5saWtlIGV2ZXJ5Ym9keSdzIG91dCB0byBnZXQgeW91Li4uPC9kaXY+XFxuXFx0ICA8L2Rpdj5cXG5cXHQ8L2Rpdj5cXG48L2Rpdj5cIjtcblxuXG4vKioqKioqKioqKioqKioqKipcbiAqKiBXRUJQQUNLIEZPT1RFUlxuICoqIC4vfi9odG1sLWxvYWRlcj9hdHRycz1mYWxzZSEuL3NjZW5lcy9vdXR0b2dldHlvdS9zY2VuZS5odG1sXG4gKiogbW9kdWxlIGlkID0gMzhcbiAqKiBtb2R1bGUgY2h1bmtzID0gMFxuICoqLyIsIm1vZHVsZS5leHBvcnRzID0gXCI8c3R5bGU+XFxuICAjcmVhY3Rpb25zdG90ZXJyb3IgLmRpc3BsYXktNCB7XFxuICAgIGJhY2tncm91bmQ6IGJsYWNrO1xcbiAgICBkaXNwbGF5OiBpbmxpbmUtYmxvY2s7XFxuICAgIHBhZGRpbmc6IDAuNXZ3O1xcbiAgICAvKnBvc2l0aW9uOiBhYnNvbHV0ZTsqL1xcbiAgICAvKmJvdHRvbTogNXZoOyovXFxuXFxuICB9XFxuICAjcmVhY3Rpb25zdG90ZXJyb3IgLmFuaW0tMSB7XFxuICAgIG9wYWNpdHk6IDA7XFxuICB9XFxuPC9zdHlsZT5cXG48ZGl2IGNsYXNzPVxcXCJ2aWRlby1iYWNrZ3JvdW5kXFxcIj5cXG4gIDx2aWRlbyBsb29wIG1heC12b2x1bWU9XFxcIjAuNFxcXCI+XFxuICAgIDxzb3VyY2Ugc3JjPVxcXCJpbWcvUmV2aXNlZFdvcmsyLm1wNFxcXCIgdHlwZT1cXFwidmlkZW8vbXA0XFxcIj5cXG4gIDwvdmlkZW8+XFxuPC9kaXY+XFxuPGRpdiBjbGFzcz1cXFwidGFibGVcXFwiPlxcbiAgICA8ZGl2IGNsYXNzPVxcXCJ0YWJsZS1jZW50ZXJcXFwiPlxcbiAgICAgIDxkaXYgY2xhc3M9XFxcImRpc3BsYXktNCBhbmltLTFcXFwiPkhvdyBkbyB5b3UgZmVlbCBhYm91dCBob3cgcGVvcGxlIHJlYWN0IHRvIHRoZSBhdHRhY2tzPzwvZGl2PjxiciAvPjxiciAvPlxcbiAgICA8L2Rpdj5cXG48L2Rpdj5cXG5cIjtcblxuXG4vKioqKioqKioqKioqKioqKipcbiAqKiBXRUJQQUNLIEZPT1RFUlxuICoqIC4vfi9odG1sLWxvYWRlcj9hdHRycz1mYWxzZSEuL3NjZW5lcy9yZWFjdGlvbnN0b3RlcnJvci9zY2VuZS5odG1sXG4gKiogbW9kdWxlIGlkID0gMzlcbiAqKiBtb2R1bGUgY2h1bmtzID0gMFxuICoqLyIsIm1vZHVsZS5leHBvcnRzID0gXCI8c3R5bGU+XFxuI3NvbWV0aGluZy10by1wcm92ZSAuZGlzcGxheS00IHtcXG4gICAgb3BhY2l0eTogMDtcXG59XFxuPC9zdHlsZT5cXG48ZGl2IGNsYXNzPVxcXCJzb21ldGhpbmctdG8tcHJvdmVcXFwiPlxcblxcdDxkaXYgY2xhc3M9XFxcInRhYmxlIFxcXCI+XFxuICBcXHRcXHQ8ZGl2IGNsYXNzPVxcXCJ0YWJsZS1jZW50ZXJcXFwiPlxcbiAgICBcXHRcXHQ8ZGl2IGNsYXNzPVxcXCJkaXNwbGF5LTQgdGV4dC1jZW50ZXJlZFxcXCI+Li4ubGlrZSB5b3UgaGF2ZSA8c3Ryb25nPnNvbWV0aGluZyB0byBwcm92ZTwvc3Ryb25nPi48L2Rpdj5cXG4gIFxcdFxcdDwvZGl2PlxcblxcdDwvZGl2PlxcbjwvZGl2PlwiO1xuXG5cbi8qKioqKioqKioqKioqKioqKlxuICoqIFdFQlBBQ0sgRk9PVEVSXG4gKiogLi9+L2h0bWwtbG9hZGVyP2F0dHJzPWZhbHNlIS4vc2NlbmVzL3NvbWV0aGluZ3RvcHJvdmUvc2NlbmUuaHRtbFxuICoqIG1vZHVsZSBpZCA9IDQwXG4gKiogbW9kdWxlIGNodW5rcyA9IDBcbiAqKi8iLCJtb2R1bGUuZXhwb3J0cyA9IFwiXFxuPGRpdiBjbGFzcz1cXFwid2UtYXJlLWNvbWluZyBncmV5LXpvbmVcXFwiPlxcblxcdDxkaXYgY2xhc3M9XFxcInRhYmxlIFxcXCI+XFxuICBcXHRcXHQ8ZGl2IGNsYXNzPVxcXCJ0YWJsZS1jZW50ZXJcXFwiPlxcbiAgICBcXHRcXHQ8ZGl2IGNsYXNzPVxcXCJkaXNwbGF5LTQgdGV4dC1jZW50ZXJlZFxcXCI+V2UgYXJlIGNvbWluZy48L2Rpdj5cXG4gIFxcdFxcdDwvZGl2PlxcblxcdDwvZGl2PlxcbjwvZGl2PlxcblwiO1xuXG5cbi8qKioqKioqKioqKioqKioqKlxuICoqIFdFQlBBQ0sgRk9PVEVSXG4gKiogLi9+L2h0bWwtbG9hZGVyP2F0dHJzPWZhbHNlIS4vc2NlbmVzL3dlYXJlY29taW5nL3NjZW5lLmh0bWxcbiAqKiBtb2R1bGUgaWQgPSA0MVxuICoqIG1vZHVsZSBjaHVua3MgPSAwXG4gKiovIiwibW9kdWxlLmV4cG9ydHMgPSBcIlxcbjxkaXYgY2xhc3M9XFxcIndlLWFyZS1ub3QtYWZyYWlkIGdyZXktem9uZVxcXCI+XFxuXFx0PGRpdiBjbGFzcz1cXFwidGFibGUgXFxcIj5cXG4gIFxcdFxcdDxkaXYgY2xhc3M9XFxcInRhYmxlLWNlbnRlclxcXCI+XFxuICAgIFxcdFxcdDxkaXYgY2xhc3M9XFxcImRpc3BsYXktNCB0ZXh0LWNlbnRlcmVkXFxcIj5XZSB3aWxsIGRvIG1vcmUuIFdlIHdpbGwgc3RvcCB0aGlzIGZhbHNlIGlkZW9sb2d5LiBXZSBhcmUgbm90IGFmcmFpZC48L2Rpdj5cXG4gIFxcdFxcdDwvZGl2PlxcblxcdDwvZGl2PlxcbjwvZGl2PlxcblwiO1xuXG5cbi8qKioqKioqKioqKioqKioqKlxuICoqIFdFQlBBQ0sgRk9PVEVSXG4gKiogLi9+L2h0bWwtbG9hZGVyP2F0dHJzPWZhbHNlIS4vc2NlbmVzL3dlYXJlbm90YWZyYWlkL3NjZW5lLmh0bWxcbiAqKiBtb2R1bGUgaWQgPSA0MlxuICoqIG1vZHVsZSBjaHVua3MgPSAwXG4gKiovIiwibW9kdWxlLmV4cG9ydHMgPSBcIjxzdHlsZT5cXG4ud2V3aWxscHJvdGVjdGVhY2hvdGhlciB7XFxuICAgIG9wYWNpdHk6IDA7XFxufVxcbiN3ZXdpbGxwcm90ZWN0ZWFjaG90aGVyIGltZyB7XFxuICBtYXgtd2lkdGg6IDM1dnc7XFxufVxcbiN3ZXdpbGxwcm90ZWN0ZWFjaG90aGVyIC5jb25jbHVzaW9uLFxcbiN3ZXdpbGxwcm90ZWN0ZWFjaG90aGVyIC5wcmVtaXNlIHtcXG4gIG9wYWNpdHk6IDA7XFxufVxcbjwvc3R5bGU+XFxuPGRpdiBjbGFzcz1cXFwidGFibGUgZ3JleS16b25lXFxcIj5cXG4gIDxkaXYgY2xhc3M9XFxcInRhYmxlLWNlbnRlclxcXCIgc3R5bGU9XFxcIndpZHRoOjUwJVxcXCI+XFxuICAgIDxkaXYgY2xhc3M9XFxcInByZW1pc2VcXFwiPlxcbiAgICAgIDxkaXYgY2xhc3M9XFxcImRpc3BsYXktMlxcXCI+V2Ugd2lsbCBwcm90ZWN0IGV2ZXJ5IGluZGl2aWR1YWwgbGlmZS48L2Rpdj5cXG4gICAgICA8YSBocmVmPVxcXCJodHRwOi8vbGVhcm5pbmdlbmdsaXNoLnZvYW5ld3MuY29tL2NvbnRlbnQva2VueWFuLW11c2xpbXMtcHJvdGVjdC1jaHJpc3RpYW5zLWZyb20tdGVycm9yaXN0LWF0dGFjay8zMTE0MzI2Lmh0bWxcXFwiIHRhcmdldD1cXFwiX2JsYW5rXFxcIj48aW1nIHNyYz1cXFwiLi9pbWcvS2VueWFQcm90ZWN0Mi5wbmdcXFwiPjwvYT5cXG4gICAgPC9kaXY+XFxuICA8L2Rpdj5cXG4gIDxkaXYgY2xhc3M9XFxcInRhYmxlLWNlbnRlclxcXCIgc3R5bGU9XFxcIndpZHRoOjQ1JVxcXCI+XFxuICAgIDxoMiBjbGFzcz1cXFwiY29uY2x1c2lvblxcXCI+XFxuICAgICAgPGRpdiBjbGFzcz1cXFwiZGlzcGxheS0yXFxcIj5XZSB3aWxsIGFzayBvdGhlcnMgdG8gaGVscCBwcm90ZWN0IG91cnMuPC9kaXY+XFxuICAgICAgPGEgaHJlZj1cXFwiaHR0cDovL3d3dy51c2F0b2RheS5jb20vc3RvcnkvbmV3cy9uYXRpb24tbm93LzIwMTUvMTIvMjIvaXdpbGxwcm90ZWN0eW91LXVzLXNlcnZpY2UtbWVtYmVycy1zb290aGUtc2NhcmVkLW11c2xpbS1naXJsLzc3NzQ4ODc0L1xcXCIgdGFyZ2V0PVxcXCJfYmxhbmtcXFwiPjxpbWcgc3JjPVxcXCIuL2ltZy9JV2lsbFByb3RlY3RZb3UucG5nXFxcIj48L2E+XFxuICAgIDwvaDI+XFxuICA8L2Rpdj5cXG48L2Rpdj5cXG5cIjtcblxuXG4vKioqKioqKioqKioqKioqKipcbiAqKiBXRUJQQUNLIEZPT1RFUlxuICoqIC4vfi9odG1sLWxvYWRlcj9hdHRycz1mYWxzZSEuL3NjZW5lcy93ZXdpbGxwcm90ZWN0ZWFjaG90aGVyL3NjZW5lLmh0bWxcbiAqKiBtb2R1bGUgaWQgPSA0M1xuICoqIG1vZHVsZSBjaHVua3MgPSAwXG4gKiovIiwibW9kdWxlLmV4cG9ydHMgPSBcIjxzdHlsZT5cXG4gICNkb3lvdWZlZWxtdXNsaW0gLmFuaW0tMiB7XFxuICAgIG9wYWNpdHk6IDA7XFxuICB9XFxuICAudmlkZW8tYmFja2dyb3VuZCB2aWRlbyB7XFxuICAgIHdpZHRoOiAxMDB2dztcXG4gIH1cXG4gIC52aWRlby1iYWNrZ3JvdW5kIHtcXG4gICAgcG9zaXRpb246IGZpeGVkO1xcbiAgICB0b3A6IDA7XFxuICAgIGxlZnQ6IDA7XFxuICB9XFxuICAjd2hhdGlzbGFtaWNoaXN0b3J5cHJlZmVycyAuZGlzcGxheS00IGEsXFxuICAuaXNsYW1pYy1pbnZlbnRpb25zIHtcXG4gICAgY29sb3I6IHJnYmEoMjU1LDI1NSwyNTUsMSk7XFxuICB9XFxuXFxuICAuaXNsYW1pYy1pbnZlbnRpb25zIHtcXG4gICAgb3BhY2l0eTogMDtcXG4gIH1cXG5cXG48L3N0eWxlPlxcbjxkaXYgY2xhc3M9XFxcInZpZGVvLWJhY2tncm91bmRcXFwiPlxcbiAgPHZpZGVvIGxvb3AgbWF4LXZvbHVtZT1cXFwiMVxcXCI+XFxuICAgIDxzb3VyY2Ugc3JjPVxcXCJpbWcvdHlzb24ubXA0XFxcIiB0eXBlPVxcXCJ2aWRlby9tcDRcXFwiPlxcbiAgPC92aWRlbz5cXG48L2Rpdj5cXG48ZGl2IGNsYXNzPVxcXCJ0YWJsZVxcXCI+XFxuICA8ZGl2IGNsYXNzPVxcXCJ0YWJsZS1jZW50ZXJcXFwiPlxcbiAgICA8ZGl2IGNsYXNzPVxcXCJkaXNwbGF5LTQgYW5pbS0xXFxcIj48YSBocmVmPVxcXCJodHRwczovL3d3dy55b3V0dWJlLmNvbS93YXRjaD92PVdaQ3VGNzMzcDg4XFxcIiB0YXJnZXQ9XFxcIl9ibGFua1xcXCI+SGFzIElTSVMgZm9yZ290dGVuIHRoZSBiZXN0IG9mIHdoYXQgTXVzbGltcyBoYXZlIGRvbmU/PzwvYT48L2Rpdj5cXG4gICAgPGRpdiBjbGFzcz1cXFwiZGlzcGxheS0zIGlzbGFtaWMtaW52ZW50aW9uc1xcXCI+XFxuICAgICAgPGRpdj5BbGdlYnJhPC9kaXY+XFxuICAgICAgPGRpdj5TdXJnaWNhbCBJbm5vdmF0aW9uczwvZGl2PlxcbiAgICAgIDxkaXY+TW9kZXJuIEhvc3BpdGFsczwvZGl2PlxcbiAgICAgIDxkaXY+QWNjcmVkaXRlZCBVbml2ZXJzaXRpZXM8L2Rpdj5cXG4gICAgICA8ZGl2PlRoZSBHdWl0YXI8L2Rpdj5cXG4gICAgPC9kaXY+XFxuICA8L2Rpdj5cXG48L2Rpdj5cXG5cIjtcblxuXG4vKioqKioqKioqKioqKioqKipcbiAqKiBXRUJQQUNLIEZPT1RFUlxuICoqIC4vfi9odG1sLWxvYWRlcj9hdHRycz1mYWxzZSEuL3NjZW5lcy93aGF0aXNsYW1pY2hpc3RvcnlwcmVmZXJzL3NjZW5lLmh0bWxcbiAqKiBtb2R1bGUgaWQgPSA0NFxuICoqIG1vZHVsZSBjaHVua3MgPSAwXG4gKiovIiwibW9kdWxlLmV4cG9ydHMgPSBcIlxcbiAgICAgICAgICAgICAgPCEtLSB0aGUgUXVy4oCZYW4gcHJlZmVycyBsZWFybmluZyAo4oCYaWxtKSBvdmVyIG11cmRlci5cXG4gICAgICAgICAgICAgIExhc3QgdGltZSB3ZSBjaGVja2VkLCB0aGUgUXVy4oCZYW4gdmFsdWVzIHNjaWVudGlmaWMgb2JzZXJ2YXRpb24sIGV4cGVyaW1lbnRhbCBrbm93bGVkZ2UgYW5kIHJhdGlvbmFsaXR5LCBvdmVyIGJsaW5kIGxlYWRlcnNoaXAgZm9sbG93aW5nLCBhcyBzZWVuIGluIDc1MCBWRVJTRVMgKDEwJSkgb2YgdGhlIFF1cuKAmWFuLiAtLT5cXG5cXG48ZGl2IGNsYXNzPVxcXCJ0YWJsZVxcXCI+XFxuICA8ZGl2IGNsYXNzPVxcXCJ0YWJsZS1jZW50ZXJcXFwiPlxcbiAgICA8ZGl2IGNsYXNzPVxcXCJkaXNwbGF5LTQgYW5pbS0xXFxcIj5MYXN0IHRpbWUgd2UgY2hlY2tlZCw8L2Rpdj48YnIgLz48YnIgLz5cXG4gICAgPGRpdiBjbGFzcz1cXFwiZGlzcGxheS0xIGFuaW0tMVxcXCI+VGhlIFF1cuKAmWFuIHByZWZlcnMgZm9yZ2l2ZW5lc3Mgb3ZlciBwdW5pc2htZW50LjwvZGl2PjxiciAvPjxiciAvPlxcbiAgICA8ZGl2IGNsYXNzPVxcXCJkaXNwbGF5LTEgYW5pbS0xXFxcIj5UaGUgUXVy4oCZYW4gcHJlZmVycyBwZWFjZSBvdmVyIG92ZXIgd2FyLjwvZGl2PjxiciAvPjxiciAvPlxcbiAgICA8ZGl2IGNsYXNzPVxcXCJkaXNwbGF5LTEgYW5pbS0xXFxcIj5UaGUgUXVy4oCZYW4gcHJlZmVycyBrbm93bGVkZ2Ugb3ZlciBibGluZG5lc3MuPC9kaXY+PGJyIC8+PGJyIC8+XFxuICA8L2Rpdj5cXG48L2Rpdj5cXG5cIjtcblxuXG4vKioqKioqKioqKioqKioqKipcbiAqKiBXRUJQQUNLIEZPT1RFUlxuICoqIC4vfi9odG1sLWxvYWRlcj9hdHRycz1mYWxzZSEuL3NjZW5lcy93aGF0dGhlcXVyYW5wcmVmZXJzL3NjZW5lLmh0bWxcbiAqKiBtb2R1bGUgaWQgPSA0NVxuICoqIG1vZHVsZSBjaHVua3MgPSAwXG4gKiovIiwibW9kdWxlLmV4cG9ydHMgPSBcIlxcbjxkaXYgY2xhc3M9XFxcInRhYmxlXFxcIj5cXG4gIDxkaXYgY2xhc3M9XFxcInRhYmxlLWNlbnRlclxcXCI+XFxuICAgIDxkaXYgY2xhc3M9XFxcImRpc3BsYXktNCB0ZXh0LWNlbnRlcmVkXFxcIj5XaG8gYXJlIHRoZXkgdG8gZGVjbGFyZSB3aG8gaXMgTXVzbGltIGFuZCB3aG8gaXMgbm90PyBXaGF0IGlzIElzbGFtIGFuZCB3aGF0IGlzIG5vdD88L2Rpdj5cXG4gIDwvZGl2PlxcbjwvZGl2PlxcblwiO1xuXG5cbi8qKioqKioqKioqKioqKioqKlxuICoqIFdFQlBBQ0sgRk9PVEVSXG4gKiogLi9+L2h0bWwtbG9hZGVyP2F0dHJzPWZhbHNlIS4vc2NlbmVzL3dob2FyZXRoZXkvc2NlbmUuaHRtbFxuICoqIG1vZHVsZSBpZCA9IDQ2XG4gKiogbW9kdWxlIGNodW5rcyA9IDBcbiAqKi8iLCJtb2R1bGUuZXhwb3J0cyA9IFwiXFxuPGRpdiBjbGFzcz1cXFwidGFibGVcXFwiPlxcbiAgPGRpdiBjbGFzcz1cXFwidGFibGUtY2VudGVyXFxcIj5cXG4gICAgPGRpdiBjbGFzcz1cXFwiZGlzcGxheS00XFxcIj5XaXRoIGFsbCB0aGUgaGF0cmVkIG9uIHRoZSBuZXdzLjwvZGl2PlxcbiAgPC9kaXY+XFxuPC9kaXY+XFxuXCI7XG5cblxuLyoqKioqKioqKioqKioqKioqXG4gKiogV0VCUEFDSyBGT09URVJcbiAqKiAuL34vaHRtbC1sb2FkZXI/YXR0cnM9ZmFsc2UhLi9zY2VuZXMvd2l0aGFsbHRoZWhhdHJlZC9zY2VuZS5odG1sXG4gKiogbW9kdWxlIGlkID0gNDdcbiAqKiBtb2R1bGUgY2h1bmtzID0gMFxuICoqLyIsIm1vZHVsZS5leHBvcnRzID0gXCI8ZGl2IGNsYXNzPVxcXCJ0YWJsZVxcXCI+XFxuICA8ZGl2IGNsYXNzPVxcXCJ0YWJsZS1jZW50ZXJcXFwiPlxcbiAgICA8ZGl2IGNsYXNzPVxcXCJkaXNwbGF5LTQgdGV4dC1jZW50ZXJlZFxcXCI+V2UgbWF5IG5vdCBhZ3JlZSBvbiBldmVyeSBhc3BlY3Qgb2YgSXNsYW0sIDxicj4gPGJyPlxcbiAgICAgIGJ1dCB3ZSBjYW4gYWdyZWUgb24gb25lIHRoaW5nLi4uPC9kaXY+XFxuICA8L2Rpdj5cXG48L2Rpdj5cXG5cIjtcblxuXG4vKioqKioqKioqKioqKioqKipcbiAqKiBXRUJQQUNLIEZPT1RFUlxuICoqIC4vfi9odG1sLWxvYWRlcj9hdHRycz1mYWxzZSEuL3NjZW5lcy95ZXR0aGF0c29rYXkvc2NlbmUuaHRtbFxuICoqIG1vZHVsZSBpZCA9IDQ4XG4gKiogbW9kdWxlIGNodW5rcyA9IDBcbiAqKi8iLCJ2YXIgbWFwID0ge1xuXHRcIi4vYWJvdXR5b3Vyc2VsZi9zY2VuZS5qc29uXCI6IDUwLFxuXHRcIi4vYmF0dGxlb2ZhZ2VuZXJhdGlvbi9zY2VuZS5qc29uXCI6IDUxLFxuXHRcIi4vY29tcGxpY2F0ZWRzaXR1YXRpb24vc2NlbmUuanNvblwiOiA1Mixcblx0XCIuL2RpZmZlcmVudHByYWN0aWNlcy9zY2VuZS5qc29uXCI6IDUzLFxuXHRcIi4vZG95b3VmZWVsbXVzbGltL3NjZW5lLmpzb25cIjogNTQsXG5cdFwiLi9leHBsb3Npb24vc2NlbmUuanNvblwiOiA1NSxcblx0XCIuL2ZlZWxpbmdjb25mdXNlZC9zY2VuZS5qc29uXCI6IDU2LFxuXHRcIi4vaW50cm8vc2NlbmUuanNvblwiOiA1Nyxcblx0XCIuL2lzaXNhZnRlcmxpZmVmYWxsYWN5L3NjZW5lLmpzb25cIjogNTgsXG5cdFwiLi9pc2lzYXBvY2FseXBzZW1pc3F1b3RlL3NjZW5lLmpzb25cIjogNTksXG5cdFwiLi9pc2lzYmFua3J1cHQvc2NlbmUuanNvblwiOiA2MCxcblx0XCIuL2lzaXNmaWdodG1pc3F1b3RlL3NjZW5lLmpzb25cIjogNjEsXG5cdFwiLi9pc2lzb2JqZWN0aXZlL3NjZW5lLmpzb25cIjogNjIsXG5cdFwiLi9pc2lzd2FudHN0b2RpdmlkZS9zY2VuZS5qc29uXCI6IDYzLFxuXHRcIi4vaXRpc250ZWFzeS9zY2VuZS5qc29uXCI6IDY0LFxuXHRcIi4vaXRzZ290dG9lbmQvc2NlbmUuanNvblwiOiA2NSxcblx0XCIuL2l3YW50bXlpc2xhbWJhY2sxL3NjZW5lLmpzb25cIjogNjYsXG5cdFwiLi9saWtlcGVhY2Uvc2NlbmUuanNvblwiOiA2Nyxcblx0XCIuL21peGVkZmVlbGluZ3Mvc2NlbmUuanNvblwiOiA2OCxcblx0XCIuL211c2xpbXNiZWxpZXZlaW5kaXZpZHVhbGxpZmUvc2NlbmUuanNvblwiOiA2OSxcblx0XCIuL291dHRvZ2V0eW91L3NjZW5lLmpzb25cIjogNzAsXG5cdFwiLi9yZWFjdGlvbnN0b3RlcnJvci9zY2VuZS5qc29uXCI6IDcxLFxuXHRcIi4vc29tZXRoaW5ndG9wcm92ZS9zY2VuZS5qc29uXCI6IDcyLFxuXHRcIi4vd2VhcmVjb21pbmcvc2NlbmUuanNvblwiOiA3Myxcblx0XCIuL3dlYXJlbm90YWZyYWlkL3NjZW5lLmpzb25cIjogNzQsXG5cdFwiLi93ZXdpbGxwcm90ZWN0ZWFjaG90aGVyL3NjZW5lLmpzb25cIjogNzUsXG5cdFwiLi93aGF0aXNsYW1pY2hpc3RvcnlwcmVmZXJzL3NjZW5lLmpzb25cIjogNzYsXG5cdFwiLi93aGF0dGhlcXVyYW5wcmVmZXJzL3NjZW5lLmpzb25cIjogNzcsXG5cdFwiLi93aG9hcmV0aGV5L3NjZW5lLmpzb25cIjogNzgsXG5cdFwiLi93aXRoYWxsdGhlaGF0cmVkL3NjZW5lLmpzb25cIjogNzksXG5cdFwiLi95ZXR0aGF0c29rYXkvc2NlbmUuanNvblwiOiA4MFxufTtcbmZ1bmN0aW9uIHdlYnBhY2tDb250ZXh0KHJlcSkge1xuXHRyZXR1cm4gX193ZWJwYWNrX3JlcXVpcmVfXyh3ZWJwYWNrQ29udGV4dFJlc29sdmUocmVxKSk7XG59O1xuZnVuY3Rpb24gd2VicGFja0NvbnRleHRSZXNvbHZlKHJlcSkge1xuXHRyZXR1cm4gbWFwW3JlcV0gfHwgKGZ1bmN0aW9uKCkgeyB0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiICsgcmVxICsgXCInLlwiKSB9KCkpO1xufTtcbndlYnBhY2tDb250ZXh0LmtleXMgPSBmdW5jdGlvbiB3ZWJwYWNrQ29udGV4dEtleXMoKSB7XG5cdHJldHVybiBPYmplY3Qua2V5cyhtYXApO1xufTtcbndlYnBhY2tDb250ZXh0LnJlc29sdmUgPSB3ZWJwYWNrQ29udGV4dFJlc29sdmU7XG5tb2R1bGUuZXhwb3J0cyA9IHdlYnBhY2tDb250ZXh0O1xud2VicGFja0NvbnRleHQuaWQgPSA0OTtcblxuXG5cbi8qKioqKioqKioqKioqKioqKlxuICoqIFdFQlBBQ0sgRk9PVEVSXG4gKiogLi9zY2VuZXMgLi9+L2pzb24tbG9hZGVyIV5cXC5cXC8uKlxcL3NjZW5lXFwuanNvbiRcbiAqKiBtb2R1bGUgaWQgPSA0OVxuICoqIG1vZHVsZSBjaHVua3MgPSAwXG4gKiovIiwibW9kdWxlLmV4cG9ydHMgPSBbXG5cdHtcblx0XHRcIndyYXBwZXJcIjogXCIjYWJvdXR5b3Vyc2VsZlwiLFxuXHRcdFwiZHVyYXRpb25cIjogXCIxMDAlXCIsXG5cdFx0XCJhbmltYXRpb25zXCI6IFtcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5hYm91dC15b3Vyc2VsZlwiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDAsXG5cdFx0XHRcdFx0MVxuXHRcdFx0XHRdXG5cdFx0XHR9XG5cdFx0XVxuXHR9LFxuXHR7XG5cdFx0XCJ3cmFwcGVyXCI6IFwiI2Fib3V0eW91cnNlbGZcIixcblx0XHRcImR1cmF0aW9uXCI6IFwiMTAwJVwiLFxuXHRcdFwiZm9jdXNcIjogdHJ1ZSxcblx0XHRcImFuaW1hdGlvbnNcIjogW1xuXHRcdFx0e31cblx0XHRdXG5cdH0sXG5cdHtcblx0XHRcIndyYXBwZXJcIjogXCIjYWJvdXR5b3Vyc2VsZlwiLFxuXHRcdFwiZHVyYXRpb25cIjogXCIxMDAlXCIsXG5cdFx0XCJhbmltYXRpb25zXCI6IFtcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5hYm91dC15b3Vyc2VsZlwiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDIsXG5cdFx0XHRcdFx0MFxuXHRcdFx0XHRdXG5cdFx0XHR9XG5cdFx0XVxuXHR9XG5dO1xuXG5cbi8qKioqKioqKioqKioqKioqKlxuICoqIFdFQlBBQ0sgRk9PVEVSXG4gKiogLi9+L2pzb24tbG9hZGVyIS4vc2NlbmVzL2Fib3V0eW91cnNlbGYvc2NlbmUuanNvblxuICoqIG1vZHVsZSBpZCA9IDUwXG4gKiogbW9kdWxlIGNodW5rcyA9IDBcbiAqKi8iLCJtb2R1bGUuZXhwb3J0cyA9IFtcblx0e1xuXHRcdFwid3JhcHBlclwiOiBcIiNiYXR0bGVvZmFnZW5lcmF0aW9uXCIsXG5cdFx0XCJkdXJhdGlvblwiOiBcIjEwMCVcIixcblx0XHRcImFuaW1hdGlvbnNcIjogW1xuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLmRpc3BsYXktNFwiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDAsXG5cdFx0XHRcdFx0MVxuXHRcdFx0XHRdXG5cdFx0XHR9XG5cdFx0XVxuXHR9LFxuXHR7XG5cdFx0XCJ3cmFwcGVyXCI6IFwiI2JhdHRsZW9mYWdlbmVyYXRpb25cIixcblx0XHRcImR1cmF0aW9uXCI6IFwiMTAwJVwiLFxuXHRcdFwiZm9jdXNcIjogdHJ1ZSxcblx0XHRcImFuaW1hdGlvbnNcIjogW1xuXHRcdFx0e31cblx0XHRdXG5cdH0sXG5cdHtcblx0XHRcIndyYXBwZXJcIjogXCIjYmF0dGxlb2ZhZ2VuZXJhdGlvblwiLFxuXHRcdFwiZHVyYXRpb25cIjogXCIxMDAlXCIsXG5cdFx0XCJhbmltYXRpb25zXCI6IFtcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5kaXNwbGF5LTRcIixcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQxLFxuXHRcdFx0XHRcdDBcblx0XHRcdFx0XVxuXHRcdFx0fVxuXHRcdF1cblx0fVxuXTtcblxuXG4vKioqKioqKioqKioqKioqKipcbiAqKiBXRUJQQUNLIEZPT1RFUlxuICoqIC4vfi9qc29uLWxvYWRlciEuL3NjZW5lcy9iYXR0bGVvZmFnZW5lcmF0aW9uL3NjZW5lLmpzb25cbiAqKiBtb2R1bGUgaWQgPSA1MVxuICoqIG1vZHVsZSBjaHVua3MgPSAwXG4gKiovIiwibW9kdWxlLmV4cG9ydHMgPSBbXG5cdHtcblx0XHRcIndyYXBwZXJcIjogXCIjY29tcGxpY2F0ZWRzaXR1YXRpb25cIixcblx0XHRcImR1cmF0aW9uXCI6IFwiMTAwJVwiLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIuZGlzcGxheS00XCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MCxcblx0XHRcdFx0XHQxXG5cdFx0XHRcdF1cblx0XHRcdH1cblx0XHRdXG5cdH0sXG5cdHtcblx0XHRcIndyYXBwZXJcIjogXCIjY29tcGxpY2F0ZWRzaXR1YXRpb25cIixcblx0XHRcImR1cmF0aW9uXCI6IFwiMTAwJVwiLFxuXHRcdFwiZm9jdXNcIjogdHJ1ZSxcblx0XHRcImFuaW1hdGlvbnNcIjogW1xuXHRcdFx0e31cblx0XHRdXG5cdH0sXG5cdHtcblx0XHRcIndyYXBwZXJcIjogXCIjY29tcGxpY2F0ZWRzaXR1YXRpb25cIixcblx0XHRcImR1cmF0aW9uXCI6IFwiMTAwJVwiLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIuZGlzcGxheS00XCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MSxcblx0XHRcdFx0XHQwXG5cdFx0XHRcdF1cblx0XHRcdH0sXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIudG9vLWxvbmctcXVvdGVcIixcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQxLFxuXHRcdFx0XHRcdDBcblx0XHRcdFx0XVxuXHRcdFx0fVxuXHRcdF1cblx0fVxuXTtcblxuXG4vKioqKioqKioqKioqKioqKipcbiAqKiBXRUJQQUNLIEZPT1RFUlxuICoqIC4vfi9qc29uLWxvYWRlciEuL3NjZW5lcy9jb21wbGljYXRlZHNpdHVhdGlvbi9zY2VuZS5qc29uXG4gKiogbW9kdWxlIGlkID0gNTJcbiAqKiBtb2R1bGUgY2h1bmtzID0gMFxuICoqLyIsIm1vZHVsZS5leHBvcnRzID0gW1xuXHR7XG5cdFx0XCJ3cmFwcGVyXCI6IFwiI2RpZmZlcmVudHByYWN0aWNlc1wiLFxuXHRcdFwiZHVyYXRpb25cIjogXCIxMDAlXCIsXG5cdFx0XCJhbmltYXRpb25zXCI6IFtcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5kaXNwbGF5LTRcIixcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQwLFxuXHRcdFx0XHRcdDEuMjVcblx0XHRcdFx0XVxuXHRcdFx0fVxuXHRcdF1cblx0fSxcblx0e1xuXHRcdFwid3JhcHBlclwiOiBcIiNkaWZmZXJlbnRwcmFjdGljZXNcIixcblx0XHRcImR1cmF0aW9uXCI6IFwiMTAwJVwiLFxuXHRcdFwiZm9jdXNcIjogdHJ1ZSxcblx0XHRcImFuaW1hdGlvbnNcIjogW1xuXHRcdFx0e31cblx0XHRdXG5cdH0sXG5cdHtcblx0XHRcIndyYXBwZXJcIjogXCIjZGlmZmVyZW50cHJhY3RpY2VzXCIsXG5cdFx0XCJkdXJhdGlvblwiOiBcIjEwMCVcIixcblx0XHRcImFuaW1hdGlvbnNcIjogW1xuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLmRpc3BsYXktNFwiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDIsXG5cdFx0XHRcdFx0MFxuXHRcdFx0XHRdXG5cdFx0XHR9XG5cdFx0XVxuXHR9XG5dO1xuXG5cbi8qKioqKioqKioqKioqKioqKlxuICoqIFdFQlBBQ0sgRk9PVEVSXG4gKiogLi9+L2pzb24tbG9hZGVyIS4vc2NlbmVzL2RpZmZlcmVudHByYWN0aWNlcy9zY2VuZS5qc29uXG4gKiogbW9kdWxlIGlkID0gNTNcbiAqKiBtb2R1bGUgY2h1bmtzID0gMFxuICoqLyIsIm1vZHVsZS5leHBvcnRzID0gW1xuXHR7XG5cdFx0XCJ3cmFwcGVyXCI6IFwiI2RveW91ZmVlbG11c2xpbVwiLFxuXHRcdFwiZHVyYXRpb25cIjogXCI1MCVcIixcblx0XHRcImFuaW1hdGlvbnNcIjogW1xuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLmFuaW0tMVwiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogMVxuXHRcdFx0fVxuXHRcdF1cblx0fSxcblx0e1xuXHRcdFwid3JhcHBlclwiOiBcIiNkb3lvdWZlZWxtdXNsaW1cIixcblx0XHRcImR1cmF0aW9uXCI6IFwiMTAwJVwiLFxuXHRcdFwiZm9jdXNcIjogMyxcblx0XHRcImFuaW1hdGlvbnNcIjogW1xuXHRcdFx0e31cblx0XHRdXG5cdH0sXG5cdHtcblx0XHRcIndyYXBwZXJcIjogXCIjZG95b3VmZWVsbXVzbGltXCIsXG5cdFx0XCJkdXJhdGlvblwiOiBcIjEwMCVcIixcblx0XHRcImFuaW1hdGlvbnNcIjogW1xuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLmFuaW0tMVwiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDEsXG5cdFx0XHRcdFx0MFxuXHRcdFx0XHRdLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVlcIjogW1xuXHRcdFx0XHRcdFwiMCVcIixcblx0XHRcdFx0XHRcIi01JVwiXG5cdFx0XHRcdF1cblx0XHRcdH1cblx0XHRdXG5cdH1cbl07XG5cblxuLyoqKioqKioqKioqKioqKioqXG4gKiogV0VCUEFDSyBGT09URVJcbiAqKiAuL34vanNvbi1sb2FkZXIhLi9zY2VuZXMvZG95b3VmZWVsbXVzbGltL3NjZW5lLmpzb25cbiAqKiBtb2R1bGUgaWQgPSA1NFxuICoqIG1vZHVsZSBjaHVua3MgPSAwXG4gKiovIiwibW9kdWxlLmV4cG9ydHMgPSBbXG5cdHtcblx0XHRcIndyYXBwZXJcIjogXCIjZXhwbG9zaW9uXCIsXG5cdFx0XCJkdXJhdGlvblwiOiBcIjE1MCVcIixcblx0XHRcImFuaW1hdGlvbnNcIjogW1xuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLmV4cGxvc2lvbi1ieWxpbmVcIixcblx0XHRcdFx0XCJ0cmFuc2xhdGVZXCI6IFwiLTI1JVwiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDAsXG5cdFx0XHRcdFx0MS43NVxuXHRcdFx0XHRdXG5cdFx0XHR9LFxuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiI2RvbUV4cGxvc2lvbkxpc3RcIixcblx0XHRcdFx0XCJ0cmFuc2xhdGVZXCI6IFwiLTcwJVwiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDAsXG5cdFx0XHRcdFx0MVxuXHRcdFx0XHRdXG5cdFx0XHR9XG5cdFx0XVxuXHR9LFxuXHR7XG5cdFx0XCJ3cmFwcGVyXCI6IFwiI2V4cGxvc2lvblwiLFxuXHRcdFwiZHVyYXRpb25cIjogXCIxNTAlXCIsXG5cdFx0XCJhbmltYXRpb25zXCI6IFtcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5kZWktMVwiLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVlcIjogXCItMTUlXCIsXG5cdFx0XHRcdFwidHJhbnNsYXRlWFwiOiBcIi0xMCVcIixcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQxLFxuXHRcdFx0XHRcdDBcblx0XHRcdFx0XSxcblx0XHRcdFx0XCJzY2FsZVwiOiAyXG5cdFx0XHR9LFxuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLmRlaS0yXCIsXG5cdFx0XHRcdFwidHJhbnNsYXRlWVwiOiBcIi01JVwiLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVhcIjogXCItNCVcIixcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQxLFxuXHRcdFx0XHRcdDBcblx0XHRcdFx0XVxuXHRcdFx0fSxcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5kZWktM1wiLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVlcIjogXCItOSVcIixcblx0XHRcdFx0XCJ0cmFuc2xhdGVYXCI6IFwiMiVcIixcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQxLFxuXHRcdFx0XHRcdDBcblx0XHRcdFx0XSxcblx0XHRcdFx0XCJzY2FsZVwiOiAxLjJcblx0XHRcdH0sXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIuZGVpLTRcIixcblx0XHRcdFx0XCJ0cmFuc2xhdGVZXCI6IFwiLTE3JVwiLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVhcIjogXCI4JVwiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDEsXG5cdFx0XHRcdFx0MFxuXHRcdFx0XHRdLFxuXHRcdFx0XHRcInNjYWxlXCI6IDEuNVxuXHRcdFx0fSxcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5kZWktNVwiLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVlcIjogXCItMiVcIixcblx0XHRcdFx0XCJ0cmFuc2xhdGVYXCI6IFwiLTE1JVwiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDEsXG5cdFx0XHRcdFx0MFxuXHRcdFx0XHRdLFxuXHRcdFx0XHRcInNjYWxlXCI6IDJcblx0XHRcdH0sXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIuZGVpLTZcIixcblx0XHRcdFx0XCJ0cmFuc2xhdGVZXCI6IFwiLTElXCIsXG5cdFx0XHRcdFwidHJhbnNsYXRlWFwiOiBcIi03JVwiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDEsXG5cdFx0XHRcdFx0MFxuXHRcdFx0XHRdLFxuXHRcdFx0XHRcInNjYWxlXCI6IDEuMlxuXHRcdFx0fSxcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5kZWktN1wiLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVlcIjogXCItNCVcIixcblx0XHRcdFx0XCJ0cmFuc2xhdGVYXCI6IFwiMiVcIixcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQxLFxuXHRcdFx0XHRcdDBcblx0XHRcdFx0XSxcblx0XHRcdFx0XCJzY2FsZVwiOiAxLjFcblx0XHRcdH0sXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIuZGVpLThcIixcblx0XHRcdFx0XCJ0cmFuc2xhdGVZXCI6IFwiLTMlXCIsXG5cdFx0XHRcdFwidHJhbnNsYXRlWFwiOiBcIjEyJVwiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDEsXG5cdFx0XHRcdFx0MFxuXHRcdFx0XHRdLFxuXHRcdFx0XHRcInNjYWxlXCI6IDEuOFxuXHRcdFx0fSxcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5kZWktOVwiLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVlcIjogXCIzJVwiLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVhcIjogXCItMTIlXCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MSxcblx0XHRcdFx0XHQwXG5cdFx0XHRcdF0sXG5cdFx0XHRcdFwic2NhbGVcIjogMS41XG5cdFx0XHR9LFxuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLmRlaS0xMFwiLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVlcIjogXCI1JVwiLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVhcIjogXCItNCVcIixcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQxLFxuXHRcdFx0XHRcdDBcblx0XHRcdFx0XVxuXHRcdFx0fSxcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5kZWktMTFcIixcblx0XHRcdFx0XCJ0cmFuc2xhdGVZXCI6IFwiOCVcIixcblx0XHRcdFx0XCJ0cmFuc2xhdGVYXCI6IFwiNiVcIixcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQxLFxuXHRcdFx0XHRcdDBcblx0XHRcdFx0XSxcblx0XHRcdFx0XCJzY2FsZVwiOiAxLjRcblx0XHRcdH0sXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIuZGVpLTEyXCIsXG5cdFx0XHRcdFwidHJhbnNsYXRlWVwiOiBcIjElXCIsXG5cdFx0XHRcdFwidHJhbnNsYXRlWFwiOiBcIjIwJVwiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDEsXG5cdFx0XHRcdFx0MFxuXHRcdFx0XHRdLFxuXHRcdFx0XHRcInNjYWxlXCI6IDEuOVxuXHRcdFx0fSxcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5kZWktMTNcIixcblx0XHRcdFx0XCJ0cmFuc2xhdGVZXCI6IFwiOCVcIixcblx0XHRcdFx0XCJ0cmFuc2xhdGVYXCI6IFwiLTEyJVwiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDEsXG5cdFx0XHRcdFx0MFxuXHRcdFx0XHRdLFxuXHRcdFx0XHRcInNjYWxlXCI6IDEuOFxuXHRcdFx0fSxcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5kZWktMTRcIixcblx0XHRcdFx0XCJ0cmFuc2xhdGVZXCI6IFwiNCVcIixcblx0XHRcdFx0XCJ0cmFuc2xhdGVYXCI6IFwiLTMlXCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MSxcblx0XHRcdFx0XHQwXG5cdFx0XHRcdF0sXG5cdFx0XHRcdFwic2NhbGVcIjogMS4zXG5cdFx0XHR9LFxuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLmRlaS0xNVwiLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVlcIjogXCIxNCVcIixcblx0XHRcdFx0XCJ0cmFuc2xhdGVYXCI6IFwiNSVcIixcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQxLFxuXHRcdFx0XHRcdDBcblx0XHRcdFx0XSxcblx0XHRcdFx0XCJzY2FsZVwiOiAxLjdcblx0XHRcdH0sXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIuZGVpLTE2XCIsXG5cdFx0XHRcdFwidHJhbnNsYXRlWVwiOiBcIjYlXCIsXG5cdFx0XHRcdFwidHJhbnNsYXRlWFwiOiBcIjklXCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MSxcblx0XHRcdFx0XHQwXG5cdFx0XHRcdF0sXG5cdFx0XHRcdFwic2NhbGVcIjogMlxuXHRcdFx0fVxuXHRcdF1cblx0fSxcblx0e1xuXHRcdFwid3JhcHBlclwiOiBcIiNleHBsb3Npb25cIixcblx0XHRcImR1cmF0aW9uXCI6IFwiMTAwJVwiLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIuZXhwbG9zaW9uLWJ5bGluZVwiLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVlcIjogW1xuXHRcdFx0XHRcdFwiLTI1JVwiLFxuXHRcdFx0XHRcdFwiLTQwJVwiXG5cdFx0XHRcdF0sXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MSxcblx0XHRcdFx0XHQwXG5cdFx0XHRcdF1cblx0XHRcdH1cblx0XHRdXG5cdH1cbl07XG5cblxuLyoqKioqKioqKioqKioqKioqXG4gKiogV0VCUEFDSyBGT09URVJcbiAqKiAuL34vanNvbi1sb2FkZXIhLi9zY2VuZXMvZXhwbG9zaW9uL3NjZW5lLmpzb25cbiAqKiBtb2R1bGUgaWQgPSA1NVxuICoqIG1vZHVsZSBjaHVua3MgPSAwXG4gKiovIiwibW9kdWxlLmV4cG9ydHMgPSBbXG5cdHtcblx0XHRcIndyYXBwZXJcIjogXCIjZmVlbGluZ2NvbmZ1c2VkXCIsXG5cdFx0XCJkdXJhdGlvblwiOiBcIjEwMCVcIixcblx0XHRcImFuaW1hdGlvbnNcIjogW1xuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLnVzLWFnYWluc3QtdGhlbVwiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDAsXG5cdFx0XHRcdFx0MVxuXHRcdFx0XHRdXG5cdFx0XHR9XG5cdFx0XVxuXHR9LFxuXHR7XG5cdFx0XCJ3cmFwcGVyXCI6IFwiI2ZlZWxpbmdjb25mdXNlZFwiLFxuXHRcdFwiZHVyYXRpb25cIjogXCIxMDAlXCIsXG5cdFx0XCJmb2N1c1wiOiB0cnVlLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXG5cdFx0XHR7fVxuXHRcdF1cblx0fSxcblx0e1xuXHRcdFwid3JhcHBlclwiOiBcIiNmZWVsaW5nY29uZnVzZWRcIixcblx0XHRcImR1cmF0aW9uXCI6IFwiMTAwJVwiLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIudXMtYWdhaW5zdC10aGVtXCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0Mixcblx0XHRcdFx0XHQwXG5cdFx0XHRcdF1cblx0XHRcdH1cblx0XHRdXG5cdH1cbl07XG5cblxuLyoqKioqKioqKioqKioqKioqXG4gKiogV0VCUEFDSyBGT09URVJcbiAqKiAuL34vanNvbi1sb2FkZXIhLi9zY2VuZXMvZmVlbGluZ2NvbmZ1c2VkL3NjZW5lLmpzb25cbiAqKiBtb2R1bGUgaWQgPSA1NlxuICoqIG1vZHVsZSBjaHVua3MgPSAwXG4gKiovIiwibW9kdWxlLmV4cG9ydHMgPSBbXG5cdHtcblx0XHRcIndyYXBwZXJcIjogXCIjaW50cm9cIixcblx0XHRcImR1cmF0aW9uXCI6IFwiMTAwJVwiLFxuXHRcdFwiZm9jdXNcIjogdHJ1ZSxcblx0XHRcImFuaW1hdGlvbnNcIjogW1xuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLmRpc3BsYXktMVwiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDEsXG5cdFx0XHRcdFx0MFxuXHRcdFx0XHRdXG5cdFx0XHR9XG5cdFx0XVxuXHR9XG5dO1xuXG5cbi8qKioqKioqKioqKioqKioqKlxuICoqIFdFQlBBQ0sgRk9PVEVSXG4gKiogLi9+L2pzb24tbG9hZGVyIS4vc2NlbmVzL2ludHJvL3NjZW5lLmpzb25cbiAqKiBtb2R1bGUgaWQgPSA1N1xuICoqIG1vZHVsZSBjaHVua3MgPSAwXG4gKiovIiwibW9kdWxlLmV4cG9ydHMgPSBbXG5cdHtcblx0XHRcIndyYXBwZXJcIjogXCIjaXNpc2FmdGVybGlmZWZhbGxhY3lcIixcblx0XHRcImR1cmF0aW9uXCI6IFwiMTAwJVwiLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIucHJlbWlzZVwiLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVlcIjogXCIwXCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MCxcblx0XHRcdFx0XHQxLjc1XG5cdFx0XHRcdF1cblx0XHRcdH0sXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIuY29uY2x1c2lvblwiLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVhcIjogXCItMjUlXCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MCxcblx0XHRcdFx0XHQwXG5cdFx0XHRcdF1cblx0XHRcdH0sXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIuY2FsY3VsYXRvclwiLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVhcIjogXCI2NSVcIixcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQwLFxuXHRcdFx0XHRcdDBcblx0XHRcdFx0XVxuXHRcdFx0fSxcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5xdXJhbi1yZWFkXCIsXG5cdFx0XHRcdFwidHJhbnNsYXRlWVwiOiBcIjAlXCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MCxcblx0XHRcdFx0XHQwXG5cdFx0XHRcdF1cblx0XHRcdH1cblx0XHRdXG5cdH0sXG5cdHtcblx0XHRcIndyYXBwZXJcIjogXCIjaXNpc2FmdGVybGlmZWZhbGxhY3lcIixcblx0XHRcImR1cmF0aW9uXCI6IFwiMTAwJVwiLFxuXHRcdFwiZm9jdXNcIjogdHJ1ZSxcblx0XHRcImFuaW1hdGlvbnNcIjogW1xuXHRcdFx0e31cblx0XHRdXG5cdH0sXG5cdHtcblx0XHRcIndyYXBwZXJcIjogXCIjaXNpc2FmdGVybGlmZWZhbGxhY3lcIixcblx0XHRcImR1cmF0aW9uXCI6IFwiMTUwJVwiLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIuY29uY2x1c2lvblwiLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVhcIjogW1xuXHRcdFx0XHRcdFwiLTI1JVwiLFxuXHRcdFx0XHRcdFwiMFwiXG5cdFx0XHRcdF0sXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MCxcblx0XHRcdFx0XHQxXG5cdFx0XHRcdF1cblx0XHRcdH0sXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIuY2FsY3VsYXRvclwiLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVhcIjogW1xuXHRcdFx0XHRcdFwiNjUlXCIsXG5cdFx0XHRcdFx0XCIwXCJcblx0XHRcdFx0XSxcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQwLFxuXHRcdFx0XHRcdDFcblx0XHRcdFx0XVxuXHRcdFx0fSxcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5xdXJhbi1yZWFkXCIsXG5cdFx0XHRcdFwidHJhbnNsYXRlWVwiOiBbXG5cdFx0XHRcdFx0XCIwXCIsXG5cdFx0XHRcdFx0XCIwXCJcblx0XHRcdFx0XSxcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQxXG5cdFx0XHRcdF1cblx0XHRcdH0sXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIucXVyYW4taGlkZGVuXCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MCxcblx0XHRcdFx0XHQxXG5cdFx0XHRcdF1cblx0XHRcdH1cblx0XHRdXG5cdH0sXG5cdHtcblx0XHRcIndyYXBwZXJcIjogXCIjaXNpc2FmdGVybGlmZWZhbGxhY3lcIixcblx0XHRcImR1cmF0aW9uXCI6IFwiMTAwJVwiLFxuXHRcdFwiZm9jdXNcIjogdHJ1ZSxcblx0XHRcImFuaW1hdGlvbnNcIjogW1xuXHRcdFx0e31cblx0XHRdXG5cdH0sXG5cdHtcblx0XHRcIndyYXBwZXJcIjogXCIjaXNpc2FmdGVybGlmZWZhbGxhY3lcIixcblx0XHRcImR1cmF0aW9uXCI6IFwiMTUwJVwiLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXG5cdFx0XHR7fVxuXHRcdF1cblx0fSxcblx0e1xuXHRcdFwid3JhcHBlclwiOiBcIiNpc2lzYWZ0ZXJsaWZlZmFsbGFjeVwiLFxuXHRcdFwiZHVyYXRpb25cIjogXCIyNTAlXCIsXG5cdFx0XCJhbmltYXRpb25zXCI6IFtcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5jb25jbHVzaW9uXCIsXG5cdFx0XHRcdFwidHJhbnNsYXRlWVwiOiBbXG5cdFx0XHRcdFx0XCIwXCIsXG5cdFx0XHRcdFx0XCItMjUlXCJcblx0XHRcdFx0XSxcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQxLFxuXHRcdFx0XHRcdDBcblx0XHRcdFx0XVxuXHRcdFx0fSxcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5jYWxjdWxhdG9yXCIsXG5cdFx0XHRcdFwidHJhbnNsYXRlWVwiOiBbXG5cdFx0XHRcdFx0XCIwXCIsXG5cdFx0XHRcdFx0XCItMjUlXCJcblx0XHRcdFx0XSxcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQxLFxuXHRcdFx0XHRcdDBcblx0XHRcdFx0XVxuXHRcdFx0fSxcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5xdXJhbi1yZWFkXCIsXG5cdFx0XHRcdFwidHJhbnNsYXRlWVwiOiBbXG5cdFx0XHRcdFx0XCIwJVwiLFxuXHRcdFx0XHRcdFwiLTI1JVwiXG5cdFx0XHRcdF0sXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MSxcblx0XHRcdFx0XHQwXG5cdFx0XHRcdF1cblx0XHRcdH0sXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIucHJlbWlzZVwiLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVlcIjogW1xuXHRcdFx0XHRcdFwiMCVcIixcblx0XHRcdFx0XHRcIi0yNSVcIlxuXHRcdFx0XHRdLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDEsXG5cdFx0XHRcdFx0MFxuXHRcdFx0XHRdXG5cdFx0XHR9XG5cdFx0XVxuXHR9XG5dO1xuXG5cbi8qKioqKioqKioqKioqKioqKlxuICoqIFdFQlBBQ0sgRk9PVEVSXG4gKiogLi9+L2pzb24tbG9hZGVyIS4vc2NlbmVzL2lzaXNhZnRlcmxpZmVmYWxsYWN5L3NjZW5lLmpzb25cbiAqKiBtb2R1bGUgaWQgPSA1OFxuICoqIG1vZHVsZSBjaHVua3MgPSAwXG4gKiovIiwibW9kdWxlLmV4cG9ydHMgPSBbXG5cdHtcblx0XHRcIndyYXBwZXJcIjogXCIjaXNpc2Fwb2NhbHlwc2VtaXNxdW90ZVwiLFxuXHRcdFwiZHVyYXRpb25cIjogXCIxMDAlXCIsXG5cdFx0XCJhbmltYXRpb25zXCI6IFtcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5wcmVtaXNlXCIsXG5cdFx0XHRcdFwidHJhbnNsYXRlWVwiOiBcIjBcIixcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQwLFxuXHRcdFx0XHRcdDEuNzVcblx0XHRcdFx0XVxuXHRcdFx0fSxcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5jb25jbHVzaW9uXCIsXG5cdFx0XHRcdFwidHJhbnNsYXRlWVwiOiBcIjI1JVwiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDAsXG5cdFx0XHRcdFx0MFxuXHRcdFx0XHRdXG5cdFx0XHR9LFxuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLnF1cmFuLXJlYWRcIixcblx0XHRcdFx0XCJ0cmFuc2xhdGVZXCI6IFwiMCVcIixcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQwLFxuXHRcdFx0XHRcdDBcblx0XHRcdFx0XVxuXHRcdFx0fVxuXHRcdF1cblx0fSxcblx0e1xuXHRcdFwid3JhcHBlclwiOiBcIiNpc2lzYXBvY2FseXBzZW1pc3F1b3RlXCIsXG5cdFx0XCJkdXJhdGlvblwiOiBcIjEwMCVcIixcblx0XHRcImZvY3VzXCI6IHRydWUsXG5cdFx0XCJhbmltYXRpb25zXCI6IFtcblx0XHRcdHt9XG5cdFx0XVxuXHR9LFxuXHR7XG5cdFx0XCJ3cmFwcGVyXCI6IFwiI2lzaXNhcG9jYWx5cHNlbWlzcXVvdGVcIixcblx0XHRcImR1cmF0aW9uXCI6IFwiMTUwJVwiLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIuY29uY2x1c2lvblwiLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVlcIjogW1xuXHRcdFx0XHRcdFwiMjUlXCIsXG5cdFx0XHRcdFx0XCIwXCJcblx0XHRcdFx0XSxcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQwLFxuXHRcdFx0XHRcdDFcblx0XHRcdFx0XVxuXHRcdFx0fSxcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5xdXJhbi1yZWFkXCIsXG5cdFx0XHRcdFwidHJhbnNsYXRlWVwiOiBbXG5cdFx0XHRcdFx0XCIwXCIsXG5cdFx0XHRcdFx0XCIwXCJcblx0XHRcdFx0XSxcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQxXG5cdFx0XHRcdF1cblx0XHRcdH0sXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIucXVyYW4taGlkZGVuXCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MCxcblx0XHRcdFx0XHQxXG5cdFx0XHRcdF1cblx0XHRcdH1cblx0XHRdXG5cdH0sXG5cdHtcblx0XHRcIndyYXBwZXJcIjogXCIjaXNpc2Fwb2NhbHlwc2VtaXNxdW90ZVwiLFxuXHRcdFwiZHVyYXRpb25cIjogXCIxMDAlXCIsXG5cdFx0XCJmb2N1c1wiOiB0cnVlLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXG5cdFx0XHR7fVxuXHRcdF1cblx0fSxcblx0e1xuXHRcdFwid3JhcHBlclwiOiBcIiNpc2lzYXBvY2FseXBzZW1pc3F1b3RlXCIsXG5cdFx0XCJkdXJhdGlvblwiOiBcIjE1MCVcIixcblx0XHRcImFuaW1hdGlvbnNcIjogW1xuXHRcdFx0e31cblx0XHRdXG5cdH0sXG5cdHtcblx0XHRcIndyYXBwZXJcIjogXCIjaXNpc2Fwb2NhbHlwc2VtaXNxdW90ZVwiLFxuXHRcdFwiZHVyYXRpb25cIjogXCIyNTAlXCIsXG5cdFx0XCJhbmltYXRpb25zXCI6IFtcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5jb25jbHVzaW9uXCIsXG5cdFx0XHRcdFwidHJhbnNsYXRlWVwiOiBbXG5cdFx0XHRcdFx0XCIwXCIsXG5cdFx0XHRcdFx0XCItMjUlXCJcblx0XHRcdFx0XSxcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQxLFxuXHRcdFx0XHRcdDBcblx0XHRcdFx0XVxuXHRcdFx0fSxcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5xdXJhbi1yZWFkXCIsXG5cdFx0XHRcdFwidHJhbnNsYXRlWVwiOiBbXG5cdFx0XHRcdFx0XCIwJVwiLFxuXHRcdFx0XHRcdFwiLTI1JVwiXG5cdFx0XHRcdF0sXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MSxcblx0XHRcdFx0XHQwXG5cdFx0XHRcdF1cblx0XHRcdH0sXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIucHJlbWlzZVwiLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVlcIjogW1xuXHRcdFx0XHRcdFwiMCVcIixcblx0XHRcdFx0XHRcIi0yNSVcIlxuXHRcdFx0XHRdLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDEsXG5cdFx0XHRcdFx0MFxuXHRcdFx0XHRdXG5cdFx0XHR9XG5cdFx0XVxuXHR9XG5dO1xuXG5cbi8qKioqKioqKioqKioqKioqKlxuICoqIFdFQlBBQ0sgRk9PVEVSXG4gKiogLi9+L2pzb24tbG9hZGVyIS4vc2NlbmVzL2lzaXNhcG9jYWx5cHNlbWlzcXVvdGUvc2NlbmUuanNvblxuICoqIG1vZHVsZSBpZCA9IDU5XG4gKiogbW9kdWxlIGNodW5rcyA9IDBcbiAqKi8iLCJtb2R1bGUuZXhwb3J0cyA9IFtcblx0e1xuXHRcdFwid3JhcHBlclwiOiBcIiNpc2lzYmFua3J1cHRcIixcblx0XHRcImR1cmF0aW9uXCI6IFwiMTAwJVwiLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIuZGlzcGxheS00XCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MCxcblx0XHRcdFx0XHQxXG5cdFx0XHRcdF1cblx0XHRcdH1cblx0XHRdXG5cdH0sXG5cdHtcblx0XHRcIndyYXBwZXJcIjogXCIjaXNpc2JhbmtydXB0XCIsXG5cdFx0XCJkdXJhdGlvblwiOiBcIjEwMCVcIixcblx0XHRcImFuaW1hdGlvbnNcIjogW1xuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLmN1bm5pbmcxXCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MCxcblx0XHRcdFx0XHQxXG5cdFx0XHRcdF0sXG5cdFx0XHRcdFwidHJhbnNsYXRlWVwiOiBbXG5cdFx0XHRcdFx0XCItNCVcIixcblx0XHRcdFx0XHRcIjAlXCJcblx0XHRcdFx0XSxcblx0XHRcdFx0XCJ0cmFuc2xhdGVYXCI6IFtcblx0XHRcdFx0XHRcIjMlXCIsXG5cdFx0XHRcdFx0XCIwXCJcblx0XHRcdFx0XVxuXHRcdFx0fSxcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5jb25jbHVzaW9uXCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MCxcblx0XHRcdFx0XHQxXG5cdFx0XHRcdF1cblx0XHRcdH1cblx0XHRdXG5cdH0sXG5cdHtcblx0XHRcIndyYXBwZXJcIjogXCIjaXNpc2JhbmtydXB0XCIsXG5cdFx0XCJkdXJhdGlvblwiOiBcIjEwMCVcIixcblx0XHRcImFuaW1hdGlvbnNcIjogW1xuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLmN1bm5pbmcyXCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MCxcblx0XHRcdFx0XHQxXG5cdFx0XHRcdF0sXG5cdFx0XHRcdFwidHJhbnNsYXRlWVwiOiBbXG5cdFx0XHRcdFx0XCIwJVwiLFxuXHRcdFx0XHRcdFwiMCVcIlxuXHRcdFx0XHRdLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVhcIjogW1xuXHRcdFx0XHRcdFwiMyVcIixcblx0XHRcdFx0XHRcIjBcIlxuXHRcdFx0XHRdXG5cdFx0XHR9XG5cdFx0XVxuXHR9LFxuXHR7XG5cdFx0XCJ3cmFwcGVyXCI6IFwiI2lzaXNiYW5rcnVwdFwiLFxuXHRcdFwiZHVyYXRpb25cIjogXCIxMDAlXCIsXG5cdFx0XCJhbmltYXRpb25zXCI6IFtcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5jdW5uaW5nM1wiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDAsXG5cdFx0XHRcdFx0MVxuXHRcdFx0XHRdLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVlcIjogW1xuXHRcdFx0XHRcdFwiNCVcIixcblx0XHRcdFx0XHRcIjAlXCJcblx0XHRcdFx0XSxcblx0XHRcdFx0XCJ0cmFuc2xhdGVYXCI6IFtcblx0XHRcdFx0XHRcIjMlXCIsXG5cdFx0XHRcdFx0XCIwXCJcblx0XHRcdFx0XVxuXHRcdFx0fVxuXHRcdF1cblx0fSxcblx0e1xuXHRcdFwid3JhcHBlclwiOiBcIiNpc2lzYmFua3J1cHRcIixcblx0XHRcImR1cmF0aW9uXCI6IFwiMTAwJVwiLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIuY3VubmluZzRcIixcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQwLFxuXHRcdFx0XHRcdDFcblx0XHRcdFx0XSxcblx0XHRcdFx0XCJ0cmFuc2xhdGVZXCI6IFtcblx0XHRcdFx0XHRcIjQlXCIsXG5cdFx0XHRcdFx0XCIwJVwiXG5cdFx0XHRcdF0sXG5cdFx0XHRcdFwidHJhbnNsYXRlWFwiOiBbXG5cdFx0XHRcdFx0XCIwJVwiLFxuXHRcdFx0XHRcdFwiMFwiXG5cdFx0XHRcdF1cblx0XHRcdH1cblx0XHRdXG5cdH0sXG5cdHtcblx0XHRcIndyYXBwZXJcIjogXCIjaXNpc2JhbmtydXB0XCIsXG5cdFx0XCJkdXJhdGlvblwiOiBcIjEwMCVcIixcblx0XHRcImFuaW1hdGlvbnNcIjogW1xuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLmN1bm5pbmc1XCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MCxcblx0XHRcdFx0XHQxXG5cdFx0XHRcdF0sXG5cdFx0XHRcdFwidHJhbnNsYXRlWVwiOiBbXG5cdFx0XHRcdFx0XCI0JVwiLFxuXHRcdFx0XHRcdFwiMCVcIlxuXHRcdFx0XHRdLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVhcIjogW1xuXHRcdFx0XHRcdFwiLTMlXCIsXG5cdFx0XHRcdFx0XCIwXCJcblx0XHRcdFx0XVxuXHRcdFx0fVxuXHRcdF1cblx0fSxcblx0e1xuXHRcdFwid3JhcHBlclwiOiBcIiNpc2lzYmFua3J1cHRcIixcblx0XHRcImR1cmF0aW9uXCI6IFwiMTAwJVwiLFxuXHRcdFwiZm9jdXNcIjogdHJ1ZSxcblx0XHRcImFuaW1hdGlvbnNcIjogW11cblx0fSxcblx0e1xuXHRcdFwid3JhcHBlclwiOiBcIiNpc2lzYmFua3J1cHRcIixcblx0XHRcImR1cmF0aW9uXCI6IFwiMTAwJVwiLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIuY3VubmluZzZcIixcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQwLFxuXHRcdFx0XHRcdDFcblx0XHRcdFx0XSxcblx0XHRcdFx0XCJ0cmFuc2xhdGVZXCI6IFtcblx0XHRcdFx0XHRcIjAlXCIsXG5cdFx0XHRcdFx0XCI0MCVcIlxuXHRcdFx0XHRdLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVhcIjogW1xuXHRcdFx0XHRcdFwiMCVcIixcblx0XHRcdFx0XHRcIjAlXCJcblx0XHRcdFx0XVxuXHRcdFx0fSxcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5jdW5uaW5nNlwiLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVlcIjogW1xuXHRcdFx0XHRcdFwiMTAlXCIsXG5cdFx0XHRcdFx0XCIwJVwiXG5cdFx0XHRcdF0sXG5cdFx0XHRcdFwidHJhbnNsYXRlWFwiOiBbXG5cdFx0XHRcdFx0XCIwJVwiLFxuXHRcdFx0XHRcdFwiMCVcIlxuXHRcdFx0XHRdLFxuXHRcdFx0XHRcInNjYWxlXCI6IFtcblx0XHRcdFx0XHQxLFxuXHRcdFx0XHRcdDEuNVxuXHRcdFx0XHRdXG5cdFx0XHR9LFxuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLmN1bm5pbmcxXCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MSxcblx0XHRcdFx0XHQwXG5cdFx0XHRcdF1cblx0XHRcdH0sXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIuY3VubmluZzJcIixcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQxLFxuXHRcdFx0XHRcdDBcblx0XHRcdFx0XVxuXHRcdFx0fSxcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5jdW5uaW5nM1wiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDEsXG5cdFx0XHRcdFx0MFxuXHRcdFx0XHRdXG5cdFx0XHR9LFxuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLmN1bm5pbmc0XCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MSxcblx0XHRcdFx0XHQwXG5cdFx0XHRcdF1cblx0XHRcdH0sXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIuY3VubmluZzVcIixcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQxLFxuXHRcdFx0XHRcdDBcblx0XHRcdFx0XVxuXHRcdFx0fVxuXHRcdF1cblx0fSxcblx0e1xuXHRcdFwid3JhcHBlclwiOiBcIiNpc2lzYmFua3J1cHRcIixcblx0XHRcImR1cmF0aW9uXCI6IFwiMTAwJVwiLFxuXHRcdFwiZm9jdXNcIjogdHJ1ZSxcblx0XHRcImFuaW1hdGlvbnNcIjogW1xuXHRcdFx0e31cblx0XHRdXG5cdH0sXG5cdHtcblx0XHRcIndyYXBwZXJcIjogXCIjaXNpc2JhbmtydXB0XCIsXG5cdFx0XCJkdXJhdGlvblwiOiBcIjEwMCVcIixcblx0XHRcImFuaW1hdGlvbnNcIjogW1xuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLmN1bm5pbmc2XCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MSxcblx0XHRcdFx0XHQwXG5cdFx0XHRcdF0sXG5cdFx0XHRcdFwic2NhbGVcIjogW1xuXHRcdFx0XHRcdDEuNVxuXHRcdFx0XHRdXG5cdFx0XHR9LFxuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLm5ld3Nzb3VyY2UtaG9yXCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MSxcblx0XHRcdFx0XHQwXG5cdFx0XHRcdF1cblx0XHRcdH1cblx0XHRdXG5cdH0sXG5cdHtcblx0XHRcIndyYXBwZXJcIjogXCIjaXNpc2JhbmtydXB0XCIsXG5cdFx0XCJkdXJhdGlvblwiOiBcIjEwMCVcIixcblx0XHRcImFuaW1hdGlvbnNcIjogW1xuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLmJsYWNrLXpvbmVcIixcblx0XHRcdFx0XCJ0cmFuc2xhdGVYXCI6IFtcblx0XHRcdFx0XHRcIjAlXCIsXG5cdFx0XHRcdFx0XCI5MCVcIlxuXHRcdFx0XHRdXG5cdFx0XHR9LFxuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLmRpc3BsYXktNFwiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDEsXG5cdFx0XHRcdFx0MFxuXHRcdFx0XHRdXG5cdFx0XHR9XG5cdFx0XVxuXHR9XG5dO1xuXG5cbi8qKioqKioqKioqKioqKioqKlxuICoqIFdFQlBBQ0sgRk9PVEVSXG4gKiogLi9+L2pzb24tbG9hZGVyIS4vc2NlbmVzL2lzaXNiYW5rcnVwdC9zY2VuZS5qc29uXG4gKiogbW9kdWxlIGlkID0gNjBcbiAqKiBtb2R1bGUgY2h1bmtzID0gMFxuICoqLyIsIm1vZHVsZS5leHBvcnRzID0gW1xuXHR7XG5cdFx0XCJ3cmFwcGVyXCI6IFwiI2lzaXNmaWdodG1pc3F1b3RlXCIsXG5cdFx0XCJkdXJhdGlvblwiOiBcIjEwMCVcIixcblx0XHRcImFuaW1hdGlvbnNcIjogW1xuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLnByZW1pc2VcIixcblx0XHRcdFx0XCJ0cmFuc2xhdGVZXCI6IFwiMFwiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDAsXG5cdFx0XHRcdFx0MS43NVxuXHRcdFx0XHRdXG5cdFx0XHR9LFxuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLmNvbmNsdXNpb25cIixcblx0XHRcdFx0XCJ0cmFuc2xhdGVZXCI6IFwiMjUlXCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MCxcblx0XHRcdFx0XHQwXG5cdFx0XHRcdF1cblx0XHRcdH0sXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIucXVyYW4tcmVhZFwiLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVlcIjogXCIwJVwiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDAsXG5cdFx0XHRcdFx0MVxuXHRcdFx0XHRdXG5cdFx0XHR9XG5cdFx0XVxuXHR9LFxuXHR7XG5cdFx0XCJ3cmFwcGVyXCI6IFwiI2lzaXNmaWdodG1pc3F1b3RlXCIsXG5cdFx0XCJkdXJhdGlvblwiOiBcIjEwMCVcIixcblx0XHRcImZvY3VzXCI6IHRydWUsXG5cdFx0XCJhbmltYXRpb25zXCI6IFtcblx0XHRcdHt9XG5cdFx0XVxuXHR9LFxuXHR7XG5cdFx0XCJ3cmFwcGVyXCI6IFwiI2lzaXNmaWdodG1pc3F1b3RlXCIsXG5cdFx0XCJkdXJhdGlvblwiOiBcIjE1MCVcIixcblx0XHRcImFuaW1hdGlvbnNcIjogW1xuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLnByZW1pc2VcIixcblx0XHRcdFx0XCJ0cmFuc2xhdGVZXCI6IFtcblx0XHRcdFx0XHRcIjBcIixcblx0XHRcdFx0XHRcIi0yNSVcIlxuXHRcdFx0XHRdLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDEsXG5cdFx0XHRcdFx0MFxuXHRcdFx0XHRdXG5cdFx0XHR9LFxuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLmNvbmNsdXNpb25cIixcblx0XHRcdFx0XCJ0cmFuc2xhdGVZXCI6IFtcblx0XHRcdFx0XHRcIjI1JVwiLFxuXHRcdFx0XHRcdFwiMFwiXG5cdFx0XHRcdF0sXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MCxcblx0XHRcdFx0XHQxXG5cdFx0XHRcdF1cblx0XHRcdH0sXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIucXVyYW4tcmVhZFwiLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVlcIjogW1xuXHRcdFx0XHRcdFwiMFwiLFxuXHRcdFx0XHRcdFwiMFwiXG5cdFx0XHRcdF0sXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MVxuXHRcdFx0XHRdXG5cdFx0XHR9LFxuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLnF1cmFuLWhpZGRlblwiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDAsXG5cdFx0XHRcdFx0MVxuXHRcdFx0XHRdXG5cdFx0XHR9XG5cdFx0XVxuXHR9LFxuXHR7XG5cdFx0XCJ3cmFwcGVyXCI6IFwiI2lzaXNmaWdodG1pc3F1b3RlXCIsXG5cdFx0XCJkdXJhdGlvblwiOiBcIjEwMCVcIixcblx0XHRcImZvY3VzXCI6IHRydWUsXG5cdFx0XCJhbmltYXRpb25zXCI6IFtcblx0XHRcdHt9XG5cdFx0XVxuXHR9LFxuXHR7XG5cdFx0XCJ3cmFwcGVyXCI6IFwiI2lzaXNmaWdodG1pc3F1b3RlXCIsXG5cdFx0XCJkdXJhdGlvblwiOiBcIjE1MCVcIixcblx0XHRcImFuaW1hdGlvbnNcIjogW1xuXHRcdFx0e31cblx0XHRdXG5cdH0sXG5cdHtcblx0XHRcIndyYXBwZXJcIjogXCIjaXNpc2ZpZ2h0bWlzcXVvdGVcIixcblx0XHRcImR1cmF0aW9uXCI6IFwiMjUwJVwiLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIuY29uY2x1c2lvblwiLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVlcIjogW1xuXHRcdFx0XHRcdFwiMFwiLFxuXHRcdFx0XHRcdFwiLTI1JVwiXG5cdFx0XHRcdF0sXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MSxcblx0XHRcdFx0XHQwXG5cdFx0XHRcdF1cblx0XHRcdH0sXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIucXVyYW4tcmVhZFwiLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVlcIjogW1xuXHRcdFx0XHRcdFwiMCVcIixcblx0XHRcdFx0XHRcIi0yNSVcIlxuXHRcdFx0XHRdLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDEsXG5cdFx0XHRcdFx0MFxuXHRcdFx0XHRdXG5cdFx0XHR9XG5cdFx0XVxuXHR9XG5dO1xuXG5cbi8qKioqKioqKioqKioqKioqKlxuICoqIFdFQlBBQ0sgRk9PVEVSXG4gKiogLi9+L2pzb24tbG9hZGVyIS4vc2NlbmVzL2lzaXNmaWdodG1pc3F1b3RlL3NjZW5lLmpzb25cbiAqKiBtb2R1bGUgaWQgPSA2MVxuICoqIG1vZHVsZSBjaHVua3MgPSAwXG4gKiovIiwibW9kdWxlLmV4cG9ydHMgPSBbXG5cdHtcblx0XHRcIndyYXBwZXJcIjogXCIjaXNpc29iamVjdGl2ZVwiLFxuXHRcdFwiZHVyYXRpb25cIjogXCIxMDAlXCIsXG5cdFx0XCJhbmltYXRpb25zXCI6IFtcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5kaXNwbGF5LTRcIixcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQxLFxuXHRcdFx0XHRcdDBcblx0XHRcdFx0XVxuXHRcdFx0fVxuXHRcdF1cblx0fVxuXTtcblxuXG4vKioqKioqKioqKioqKioqKipcbiAqKiBXRUJQQUNLIEZPT1RFUlxuICoqIC4vfi9qc29uLWxvYWRlciEuL3NjZW5lcy9pc2lzb2JqZWN0aXZlL3NjZW5lLmpzb25cbiAqKiBtb2R1bGUgaWQgPSA2MlxuICoqIG1vZHVsZSBjaHVua3MgPSAwXG4gKiovIiwibW9kdWxlLmV4cG9ydHMgPSBbXG5cdHtcblx0XHRcIndyYXBwZXJcIjogXCIjaXNpc3dhbnRzdG9kaXZpZGVcIixcblx0XHRcImR1cmF0aW9uXCI6IFwiMTAwJVwiLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIudmlvbGVudC16b25lc1wiLFxuXHRcdFx0XHRcInNjYWxlXCI6IFtcblx0XHRcdFx0XHQxLFxuXHRcdFx0XHRcdDUuNTVcblx0XHRcdFx0XVxuXHRcdFx0fSxcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5hbmltLTJcIixcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQwLFxuXHRcdFx0XHRcdDEuNTVcblx0XHRcdFx0XVxuXHRcdFx0fVxuXHRcdF1cblx0fSxcblx0e1xuXHRcdFwid3JhcHBlclwiOiBcIiNpc2lzd2FudHN0b2RpdmlkZVwiLFxuXHRcdFwiZHVyYXRpb25cIjogXCIxMDAlXCIsXG5cdFx0XCJmb2N1c1wiOiB0cnVlLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXG5cdFx0XHR7fVxuXHRcdF1cblx0fSxcblx0e1xuXHRcdFwid3JhcHBlclwiOiBcIiNpc2lzd2FudHN0b2RpdmlkZVwiLFxuXHRcdFwiZHVyYXRpb25cIjogXCIxMDAlXCIsXG5cdFx0XCJhbmltYXRpb25zXCI6IFtcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi52aW9sZW50LXpvbmVzXCIsXG5cdFx0XHRcdFwic2NhbGVcIjogW1xuXHRcdFx0XHRcdDUuNTUsXG5cdFx0XHRcdFx0MFxuXHRcdFx0XHRdXG5cdFx0XHR9LFxuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLmFuaW0tMVwiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDAsXG5cdFx0XHRcdFx0MS41NVxuXHRcdFx0XHRdXG5cdFx0XHR9XG5cdFx0XVxuXHR9LFxuXHR7XG5cdFx0XCJ3cmFwcGVyXCI6IFwiI2lzaXN3YW50c3RvZGl2aWRlXCIsXG5cdFx0XCJkdXJhdGlvblwiOiBcIjEwMCVcIixcblx0XHRcImZvY3VzXCI6IHRydWUsXG5cdFx0XCJhbmltYXRpb25zXCI6IFtcblx0XHRcdHt9XG5cdFx0XVxuXHR9LFxuXHR7XG5cdFx0XCJ3cmFwcGVyXCI6IFwiI2lzaXN3YW50c3RvZGl2aWRlXCIsXG5cdFx0XCJkdXJhdGlvblwiOiBcIjEwMCVcIixcblx0XHRcImFuaW1hdGlvbnNcIjogW1xuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLmFuaW0tMVwiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDEsXG5cdFx0XHRcdFx0MFxuXHRcdFx0XHRdLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVlcIjogW1xuXHRcdFx0XHRcdFwiMCVcIixcblx0XHRcdFx0XHRcIi0yMCVcIlxuXHRcdFx0XHRdXG5cdFx0XHR9LFxuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLmFuaW0tMlwiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDEsXG5cdFx0XHRcdFx0MFxuXHRcdFx0XHRdLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVlcIjogW1xuXHRcdFx0XHRcdFwiMCVcIixcblx0XHRcdFx0XHRcIi0yMCVcIlxuXHRcdFx0XHRdXG5cdFx0XHR9XG5cdFx0XVxuXHR9XG5dO1xuXG5cbi8qKioqKioqKioqKioqKioqKlxuICoqIFdFQlBBQ0sgRk9PVEVSXG4gKiogLi9+L2pzb24tbG9hZGVyIS4vc2NlbmVzL2lzaXN3YW50c3RvZGl2aWRlL3NjZW5lLmpzb25cbiAqKiBtb2R1bGUgaWQgPSA2M1xuICoqIG1vZHVsZSBjaHVua3MgPSAwXG4gKiovIiwibW9kdWxlLmV4cG9ydHMgPSBbXG5cdHtcblx0XHRcIndyYXBwZXJcIjogXCIjaXRpc250ZWFzeVwiLFxuXHRcdFwiZHVyYXRpb25cIjogXCIxMDAlXCIsXG5cdFx0XCJhbmltYXRpb25zXCI6IFtcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5pc250ZWFzeV8xXCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MCxcblx0XHRcdFx0XHQxXG5cdFx0XHRcdF0sXG5cdFx0XHRcdFwidHJhbnNsYXRlWVwiOiBbXG5cdFx0XHRcdFx0XCItNCVcIixcblx0XHRcdFx0XHRcIjAlXCJcblx0XHRcdFx0XSxcblx0XHRcdFx0XCJ0cmFuc2xhdGVYXCI6IFtcblx0XHRcdFx0XHRcIjMlXCIsXG5cdFx0XHRcdFx0XCIwXCJcblx0XHRcdFx0XVxuXHRcdFx0fSxcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5kaXNwbGF5LTRcIixcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQwLFxuXHRcdFx0XHRcdDFcblx0XHRcdFx0XVxuXHRcdFx0fVxuXHRcdF1cblx0fSxcblx0e1xuXHRcdFwid3JhcHBlclwiOiBcIiNpdGlzbnRlYXN5XCIsXG5cdFx0XCJkdXJhdGlvblwiOiBcIjEwMCVcIixcblx0XHRcImFuaW1hdGlvbnNcIjogW1xuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLmlzbnRlYXN5XzJcIixcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQwLFxuXHRcdFx0XHRcdDFcblx0XHRcdFx0XSxcblx0XHRcdFx0XCJ0cmFuc2xhdGVZXCI6IFtcblx0XHRcdFx0XHRcIjAlXCIsXG5cdFx0XHRcdFx0XCIwJVwiXG5cdFx0XHRcdF0sXG5cdFx0XHRcdFwidHJhbnNsYXRlWFwiOiBbXG5cdFx0XHRcdFx0XCIzJVwiLFxuXHRcdFx0XHRcdFwiMFwiXG5cdFx0XHRcdF1cblx0XHRcdH1cblx0XHRdXG5cdH0sXG5cdHtcblx0XHRcIndyYXBwZXJcIjogXCIjaXRpc250ZWFzeVwiLFxuXHRcdFwiZHVyYXRpb25cIjogXCIxMDAlXCIsXG5cdFx0XCJhbmltYXRpb25zXCI6IFtcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5pc250ZWFzeV8zXCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MCxcblx0XHRcdFx0XHQxXG5cdFx0XHRcdF0sXG5cdFx0XHRcdFwidHJhbnNsYXRlWVwiOiBbXG5cdFx0XHRcdFx0XCIwJVwiLFxuXHRcdFx0XHRcdFwiMCVcIlxuXHRcdFx0XHRdLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVhcIjogW1xuXHRcdFx0XHRcdFwiMyVcIixcblx0XHRcdFx0XHRcIjBcIlxuXHRcdFx0XHRdXG5cdFx0XHR9XG5cdFx0XVxuXHR9LFxuXHR7XG5cdFx0XCJ3cmFwcGVyXCI6IFwiI2l0aXNudGVhc3lcIixcblx0XHRcImR1cmF0aW9uXCI6IFwiMTAwJVwiLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIuaXNudGVhc3lfNFwiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDAsXG5cdFx0XHRcdFx0MVxuXHRcdFx0XHRdLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVlcIjogW1xuXHRcdFx0XHRcdFwiNCVcIixcblx0XHRcdFx0XHRcIjAlXCJcblx0XHRcdFx0XSxcblx0XHRcdFx0XCJ0cmFuc2xhdGVYXCI6IFtcblx0XHRcdFx0XHRcIjMlXCIsXG5cdFx0XHRcdFx0XCIwXCJcblx0XHRcdFx0XVxuXHRcdFx0fVxuXHRcdF1cblx0fSxcblx0e1xuXHRcdFwid3JhcHBlclwiOiBcIiNpdGlzbnRlYXN5XCIsXG5cdFx0XCJkdXJhdGlvblwiOiBcIjEwMCVcIixcblx0XHRcImFuaW1hdGlvbnNcIjogW1xuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLmlzbnRlYXN5XzVcIixcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQwLFxuXHRcdFx0XHRcdDFcblx0XHRcdFx0XSxcblx0XHRcdFx0XCJ0cmFuc2xhdGVZXCI6IFtcblx0XHRcdFx0XHRcIjQlXCIsXG5cdFx0XHRcdFx0XCIwJVwiXG5cdFx0XHRcdF0sXG5cdFx0XHRcdFwidHJhbnNsYXRlWFwiOiBbXG5cdFx0XHRcdFx0XCIwJVwiLFxuXHRcdFx0XHRcdFwiMFwiXG5cdFx0XHRcdF1cblx0XHRcdH1cblx0XHRdXG5cdH0sXG5cdHtcblx0XHRcIndyYXBwZXJcIjogXCIjaXRpc250ZWFzeVwiLFxuXHRcdFwiZHVyYXRpb25cIjogXCIxMDAlXCIsXG5cdFx0XCJhbmltYXRpb25zXCI6IFtcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5pc250ZWFzeV82XCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MCxcblx0XHRcdFx0XHQxXG5cdFx0XHRcdF0sXG5cdFx0XHRcdFwidHJhbnNsYXRlWVwiOiBbXG5cdFx0XHRcdFx0XCI0JVwiLFxuXHRcdFx0XHRcdFwiMCVcIlxuXHRcdFx0XHRdLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVhcIjogW1xuXHRcdFx0XHRcdFwiMCVcIixcblx0XHRcdFx0XHRcIjBcIlxuXHRcdFx0XHRdXG5cdFx0XHR9XG5cdFx0XVxuXHR9LFxuXHR7XG5cdFx0XCJ3cmFwcGVyXCI6IFwiI2l0aXNudGVhc3lcIixcblx0XHRcImR1cmF0aW9uXCI6IFwiMTAwJVwiLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIuaXNudGVhc3lfN1wiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDAsXG5cdFx0XHRcdFx0MVxuXHRcdFx0XHRdLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVlcIjogW1xuXHRcdFx0XHRcdFwiNCVcIixcblx0XHRcdFx0XHRcIjAlXCJcblx0XHRcdFx0XSxcblx0XHRcdFx0XCJ0cmFuc2xhdGVYXCI6IFtcblx0XHRcdFx0XHRcIjAlXCIsXG5cdFx0XHRcdFx0XCIwXCJcblx0XHRcdFx0XVxuXHRcdFx0fVxuXHRcdF1cblx0fSxcblx0e1xuXHRcdFwid3JhcHBlclwiOiBcIiNpdGlzbnRlYXN5XCIsXG5cdFx0XCJkdXJhdGlvblwiOiBcIjEwMCVcIixcblx0XHRcImFuaW1hdGlvbnNcIjogW1xuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLmlzbnRlYXN5XzhcIixcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQwLFxuXHRcdFx0XHRcdDFcblx0XHRcdFx0XSxcblx0XHRcdFx0XCJ0cmFuc2xhdGVZXCI6IFtcblx0XHRcdFx0XHRcIjQlXCIsXG5cdFx0XHRcdFx0XCIwJVwiXG5cdFx0XHRcdF0sXG5cdFx0XHRcdFwidHJhbnNsYXRlWFwiOiBbXG5cdFx0XHRcdFx0XCItMyVcIixcblx0XHRcdFx0XHRcIjBcIlxuXHRcdFx0XHRdXG5cdFx0XHR9XG5cdFx0XVxuXHR9LFxuXHR7XG5cdFx0XCJ3cmFwcGVyXCI6IFwiI2l0aXNudGVhc3lcIixcblx0XHRcImR1cmF0aW9uXCI6IFwiMTAwJVwiLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIuaXNudGVhc3lfOVwiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDAsXG5cdFx0XHRcdFx0MVxuXHRcdFx0XHRdLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVlcIjogW1xuXHRcdFx0XHRcdFwiLTQlXCIsXG5cdFx0XHRcdFx0XCIwJVwiXG5cdFx0XHRcdF0sXG5cdFx0XHRcdFwidHJhbnNsYXRlWFwiOiBbXG5cdFx0XHRcdFx0XCItMyVcIixcblx0XHRcdFx0XHRcIjBcIlxuXHRcdFx0XHRdXG5cdFx0XHR9XG5cdFx0XVxuXHR9LFxuXHR7XG5cdFx0XCJ3cmFwcGVyXCI6IFwiI2l0aXNudGVhc3lcIixcblx0XHRcImR1cmF0aW9uXCI6IFwiMTAwJVwiLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIuaXNudGVhc3lfMTBcIixcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQwLFxuXHRcdFx0XHRcdDFcblx0XHRcdFx0XSxcblx0XHRcdFx0XCJ0cmFuc2xhdGVZXCI6IFtcblx0XHRcdFx0XHRcIi00JVwiLFxuXHRcdFx0XHRcdFwiMCVcIlxuXHRcdFx0XHRdLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVhcIjogW1xuXHRcdFx0XHRcdFwiMCVcIixcblx0XHRcdFx0XHRcIjBcIlxuXHRcdFx0XHRdXG5cdFx0XHR9XG5cdFx0XVxuXHR9LFxuXHR7XG5cdFx0XCJ3cmFwcGVyXCI6IFwiI2l0aXNudGVhc3lcIixcblx0XHRcImR1cmF0aW9uXCI6IFwiMTAwJVwiLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIuaXNudGVhc3lfMTFcIixcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQwLFxuXHRcdFx0XHRcdDFcblx0XHRcdFx0XSxcblx0XHRcdFx0XCJ0cmFuc2xhdGVZXCI6IFtcblx0XHRcdFx0XHRcIi00JVwiLFxuXHRcdFx0XHRcdFwiMCVcIlxuXHRcdFx0XHRdLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVhcIjogW1xuXHRcdFx0XHRcdFwiMCVcIixcblx0XHRcdFx0XHRcIjBcIlxuXHRcdFx0XHRdXG5cdFx0XHR9XG5cdFx0XVxuXHR9LFxuXHR7XG5cdFx0XCJ3cmFwcGVyXCI6IFwiI2l0aXNudGVhc3lcIixcblx0XHRcImR1cmF0aW9uXCI6IFwiMTAwJVwiLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIuaXNudGVhc3lfMTJcIixcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQwLFxuXHRcdFx0XHRcdDFcblx0XHRcdFx0XSxcblx0XHRcdFx0XCJ0cmFuc2xhdGVZXCI6IFtcblx0XHRcdFx0XHRcIi00JVwiLFxuXHRcdFx0XHRcdFwiMCVcIlxuXHRcdFx0XHRdLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVhcIjogW1xuXHRcdFx0XHRcdFwiMCVcIixcblx0XHRcdFx0XHRcIjBcIlxuXHRcdFx0XHRdXG5cdFx0XHR9XG5cdFx0XVxuXHR9LFxuXHR7XG5cdFx0XCJ3cmFwcGVyXCI6IFwiI2l0aXNudGVhc3lcIixcblx0XHRcImR1cmF0aW9uXCI6IFwiMTAwJVwiLFxuXHRcdFwiZm9jdXNcIjogdHJ1ZSxcblx0XHRcImFuaW1hdGlvbnNcIjogW11cblx0fSxcblx0e1xuXHRcdFwid3JhcHBlclwiOiBcIiNpdGlzbnRlYXN5XCIsXG5cdFx0XCJkdXJhdGlvblwiOiBcIjEwMCVcIixcblx0XHRcImFuaW1hdGlvbnNcIjogW1xuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLmlzbnRlYXN5XzEzXCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MCxcblx0XHRcdFx0XHQxXG5cdFx0XHRcdF0sXG5cdFx0XHRcdFwidHJhbnNsYXRlWVwiOiBbXG5cdFx0XHRcdFx0XCIwJVwiLFxuXHRcdFx0XHRcdFwiMCVcIlxuXHRcdFx0XHRdLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVhcIjogW1xuXHRcdFx0XHRcdFwiLTgwJVwiLFxuXHRcdFx0XHRcdFwiMFwiXG5cdFx0XHRcdF1cblx0XHRcdH0sXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIuaXNudGVhc3lfMVwiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDEsXG5cdFx0XHRcdFx0MFxuXHRcdFx0XHRdLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVlcIjogW1xuXHRcdFx0XHRcdFwiMCVcIixcblx0XHRcdFx0XHRcIi00MCVcIlxuXHRcdFx0XHRdLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVhcIjogW1xuXHRcdFx0XHRcdFwiMCVcIixcblx0XHRcdFx0XHRcIjMwJVwiXG5cdFx0XHRcdF1cblx0XHRcdH0sXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIuaXNudGVhc3lfMlwiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDEsXG5cdFx0XHRcdFx0MFxuXHRcdFx0XHRdLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVlcIjogW1xuXHRcdFx0XHRcdFwiMCVcIixcblx0XHRcdFx0XHRcIjAlXCJcblx0XHRcdFx0XSxcblx0XHRcdFx0XCJ0cmFuc2xhdGVYXCI6IFtcblx0XHRcdFx0XHRcIjAlXCIsXG5cdFx0XHRcdFx0XCIzMCVcIlxuXHRcdFx0XHRdXG5cdFx0XHR9LFxuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLmlzbnRlYXN5XzNcIixcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQxLFxuXHRcdFx0XHRcdDBcblx0XHRcdFx0XSxcblx0XHRcdFx0XCJ0cmFuc2xhdGVZXCI6IFtcblx0XHRcdFx0XHRcIjAlXCIsXG5cdFx0XHRcdFx0XCIwJVwiXG5cdFx0XHRcdF0sXG5cdFx0XHRcdFwidHJhbnNsYXRlWFwiOiBbXG5cdFx0XHRcdFx0XCIwJVwiLFxuXHRcdFx0XHRcdFwiMzAlXCJcblx0XHRcdFx0XVxuXHRcdFx0fSxcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5pc250ZWFzeV80XCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MSxcblx0XHRcdFx0XHQwXG5cdFx0XHRcdF0sXG5cdFx0XHRcdFwidHJhbnNsYXRlWVwiOiBbXG5cdFx0XHRcdFx0XCIwJVwiLFxuXHRcdFx0XHRcdFwiNDAlXCJcblx0XHRcdFx0XSxcblx0XHRcdFx0XCJ0cmFuc2xhdGVYXCI6IFtcblx0XHRcdFx0XHRcIjAlXCIsXG5cdFx0XHRcdFx0XCIzMCVcIlxuXHRcdFx0XHRdXG5cdFx0XHR9LFxuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLmlzbnRlYXN5XzVcIixcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQxLFxuXHRcdFx0XHRcdDBcblx0XHRcdFx0XSxcblx0XHRcdFx0XCJ0cmFuc2xhdGVZXCI6IFtcblx0XHRcdFx0XHRcIjAlXCIsXG5cdFx0XHRcdFx0XCI0MCVcIlxuXHRcdFx0XHRdLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVhcIjogW1xuXHRcdFx0XHRcdFwiMCVcIixcblx0XHRcdFx0XHRcIjAlXCJcblx0XHRcdFx0XVxuXHRcdFx0fSxcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5pc250ZWFzeV82XCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MSxcblx0XHRcdFx0XHQwXG5cdFx0XHRcdF0sXG5cdFx0XHRcdFwidHJhbnNsYXRlWVwiOiBbXG5cdFx0XHRcdFx0XCIwJVwiLFxuXHRcdFx0XHRcdFwiNDAlXCJcblx0XHRcdFx0XSxcblx0XHRcdFx0XCJ0cmFuc2xhdGVYXCI6IFtcblx0XHRcdFx0XHRcIjAlXCIsXG5cdFx0XHRcdFx0XCIwJVwiXG5cdFx0XHRcdF1cblx0XHRcdH0sXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIuaXNudGVhc3lfN1wiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDEsXG5cdFx0XHRcdFx0MFxuXHRcdFx0XHRdLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVlcIjogW1xuXHRcdFx0XHRcdFwiMCVcIixcblx0XHRcdFx0XHRcIjQwJVwiXG5cdFx0XHRcdF0sXG5cdFx0XHRcdFwidHJhbnNsYXRlWFwiOiBbXG5cdFx0XHRcdFx0XCIwJVwiLFxuXHRcdFx0XHRcdFwiMCVcIlxuXHRcdFx0XHRdXG5cdFx0XHR9LFxuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLmlzbnRlYXN5XzhcIixcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQxLFxuXHRcdFx0XHRcdDBcblx0XHRcdFx0XSxcblx0XHRcdFx0XCJ0cmFuc2xhdGVZXCI6IFtcblx0XHRcdFx0XHRcIjAlXCIsXG5cdFx0XHRcdFx0XCI0MCVcIlxuXHRcdFx0XHRdLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVhcIjogW1xuXHRcdFx0XHRcdFwiMCVcIixcblx0XHRcdFx0XHRcIi0zMCVcIlxuXHRcdFx0XHRdXG5cdFx0XHR9LFxuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLmlzbnRlYXN5XzlcIixcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQxLFxuXHRcdFx0XHRcdDBcblx0XHRcdFx0XSxcblx0XHRcdFx0XCJ0cmFuc2xhdGVZXCI6IFtcblx0XHRcdFx0XHRcIjAlXCIsXG5cdFx0XHRcdFx0XCItNDAlXCJcblx0XHRcdFx0XSxcblx0XHRcdFx0XCJ0cmFuc2xhdGVYXCI6IFtcblx0XHRcdFx0XHRcIjAlXCIsXG5cdFx0XHRcdFx0XCItMzAlXCJcblx0XHRcdFx0XVxuXHRcdFx0fSxcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5pc250ZWFzeV8xMFwiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDEsXG5cdFx0XHRcdFx0MFxuXHRcdFx0XHRdLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVlcIjogW1xuXHRcdFx0XHRcdFwiMCVcIixcblx0XHRcdFx0XHRcIi00MCVcIlxuXHRcdFx0XHRdLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVhcIjogW1xuXHRcdFx0XHRcdFwiMCVcIixcblx0XHRcdFx0XHRcIjAlXCJcblx0XHRcdFx0XVxuXHRcdFx0fSxcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5pc250ZWFzeV8xMVwiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDEsXG5cdFx0XHRcdFx0MFxuXHRcdFx0XHRdLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVlcIjogW1xuXHRcdFx0XHRcdFwiMCVcIixcblx0XHRcdFx0XHRcIi00MCVcIlxuXHRcdFx0XHRdLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVhcIjogW1xuXHRcdFx0XHRcdFwiMCVcIixcblx0XHRcdFx0XHRcIjAlXCJcblx0XHRcdFx0XVxuXHRcdFx0fSxcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5pc250ZWFzeV8xMlwiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDEsXG5cdFx0XHRcdFx0MFxuXHRcdFx0XHRdLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVlcIjogW1xuXHRcdFx0XHRcdFwiMCVcIixcblx0XHRcdFx0XHRcIi00MCVcIlxuXHRcdFx0XHRdLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVhcIjogW1xuXHRcdFx0XHRcdFwiMCVcIixcblx0XHRcdFx0XHRcIjAlXCJcblx0XHRcdFx0XVxuXHRcdFx0fVxuXHRcdF1cblx0fSxcblx0e1xuXHRcdFwid3JhcHBlclwiOiBcIiNpdGlzbnRlYXN5XCIsXG5cdFx0XCJkdXJhdGlvblwiOiBcIjgwJVwiLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIuaGlkZXNvdXJjZVwiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDEsXG5cdFx0XHRcdFx0MFxuXHRcdFx0XHRdXG5cdFx0XHR9LFxuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLmRpc3BsYXktNFwiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDEsXG5cdFx0XHRcdFx0MFxuXHRcdFx0XHRdXG5cdFx0XHR9LFxuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLnRydW1wXCIsXG5cdFx0XHRcdFwidHJhbnNsYXRlWFwiOiBbXG5cdFx0XHRcdFx0MCxcblx0XHRcdFx0XHRcIi03JVwiXG5cdFx0XHRcdF0sXG5cdFx0XHRcdFwic2NhbGVcIjogW1xuXHRcdFx0XHRcdDEsXG5cdFx0XHRcdFx0MlxuXHRcdFx0XHRdXG5cdFx0XHR9XG5cdFx0XVxuXHR9LFxuXHR7XG5cdFx0XCJ3cmFwcGVyXCI6IFwiI2l0aXNudGVhc3lcIixcblx0XHRcImR1cmF0aW9uXCI6IFwiMTAwJVwiLFxuXHRcdFwiZm9jdXNcIjogdHJ1ZSxcblx0XHRcImFuaW1hdGlvbnNcIjogW1xuXHRcdFx0e31cblx0XHRdXG5cdH0sXG5cdHtcblx0XHRcIndyYXBwZXJcIjogXCIjaXRpc250ZWFzeVwiLFxuXHRcdFwiZHVyYXRpb25cIjogXCIzMDAlXCIsXG5cdFx0XCJhbmltYXRpb25zXCI6IFtcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi50cnVtcFwiLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVhcIjogW1xuXHRcdFx0XHRcdFwiLTIwJVwiXG5cdFx0XHRcdF0sXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MSxcblx0XHRcdFx0XHQwXG5cdFx0XHRcdF1cblx0XHRcdH1cblx0XHRdXG5cdH1cbl07XG5cblxuLyoqKioqKioqKioqKioqKioqXG4gKiogV0VCUEFDSyBGT09URVJcbiAqKiAuL34vanNvbi1sb2FkZXIhLi9zY2VuZXMvaXRpc250ZWFzeS9zY2VuZS5qc29uXG4gKiogbW9kdWxlIGlkID0gNjRcbiAqKiBtb2R1bGUgY2h1bmtzID0gMFxuICoqLyIsIm1vZHVsZS5leHBvcnRzID0gW1xuXHR7XG5cdFx0XCJ3cmFwcGVyXCI6IFwiI2l0c2dvdHRvZW5kXCIsXG5cdFx0XCJkdXJhdGlvblwiOiBcIjEwMCVcIixcblx0XHRcImZvY3VzXCI6IHRydWUsXG5cdFx0XCJhbmltYXRpb25zXCI6IFtcblx0XHRcdHt9XG5cdFx0XVxuXHR9XG5dO1xuXG5cbi8qKioqKioqKioqKioqKioqKlxuICoqIFdFQlBBQ0sgRk9PVEVSXG4gKiogLi9+L2pzb24tbG9hZGVyIS4vc2NlbmVzL2l0c2dvdHRvZW5kL3NjZW5lLmpzb25cbiAqKiBtb2R1bGUgaWQgPSA2NVxuICoqIG1vZHVsZSBjaHVua3MgPSAwXG4gKiovIiwibW9kdWxlLmV4cG9ydHMgPSBbXG5cdHtcblx0XHRcIndyYXBwZXJcIjogXCIjaXdhbnRteWlzbGFtYmFjazFcIixcblx0XHRcImR1cmF0aW9uXCI6IFwiMTAwJVwiLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIuZGlzcGxheS00XCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0Mixcblx0XHRcdFx0XHQyXG5cdFx0XHRcdF1cblx0XHRcdH1cblx0XHRdXG5cdH0sXG5cdHtcblx0XHRcIndyYXBwZXJcIjogXCIjaXdhbnRteWlzbGFtYmFjazFcIixcblx0XHRcImR1cmF0aW9uXCI6IFwiMTAwJVwiLFxuXHRcdFwiZm9jdXNcIjogdHJ1ZSxcblx0XHRcImFuaW1hdGlvbnNcIjogW1xuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLmRpc3BsYXktNFwiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDJcblx0XHRcdFx0XVxuXHRcdFx0fVxuXHRcdF1cblx0fSxcblx0e1xuXHRcdFwid3JhcHBlclwiOiBcIiNpd2FudG15aXNsYW1iYWNrMVwiLFxuXHRcdFwiZHVyYXRpb25cIjogXCIxMDAlXCIsXG5cdFx0XCJhbmltYXRpb25zXCI6IFtcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5kaXNwbGF5LTRcIixcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQyLFxuXHRcdFx0XHRcdDBcblx0XHRcdFx0XVxuXHRcdFx0fVxuXHRcdF1cblx0fVxuXTtcblxuXG4vKioqKioqKioqKioqKioqKipcbiAqKiBXRUJQQUNLIEZPT1RFUlxuICoqIC4vfi9qc29uLWxvYWRlciEuL3NjZW5lcy9pd2FudG15aXNsYW1iYWNrMS9zY2VuZS5qc29uXG4gKiogbW9kdWxlIGlkID0gNjZcbiAqKiBtb2R1bGUgY2h1bmtzID0gMFxuICoqLyIsIm1vZHVsZS5leHBvcnRzID0gW1xuXHR7XG5cdFx0XCJ3cmFwcGVyXCI6IFwiI2xpa2VwZWFjZVwiLFxuXHRcdFwiZHVyYXRpb25cIjogXCIxMDAlXCIsXG5cdFx0XCJhbmltYXRpb25zXCI6IFtcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5kaXNwbGF5LTRcIixcblx0XHRcdFx0XCJ0cmFuc2xhdGVZXCI6IFwiMzAlXCJcblx0XHRcdH1cblx0XHRdXG5cdH0sXG5cdHtcblx0XHRcIndyYXBwZXJcIjogXCIjbGlrZXBlYWNlXCIsXG5cdFx0XCJkdXJhdGlvblwiOiBcIjEwMCVcIixcblx0XHRcImFuaW1hdGlvbnNcIjogW1xuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLmZpcnN0XCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MCxcblx0XHRcdFx0XHQxXG5cdFx0XHRcdF1cblx0XHRcdH1cblx0XHRdXG5cdH0sXG5cdHtcblx0XHRcIndyYXBwZXJcIjogXCIjbGlrZXBlYWNlXCIsXG5cdFx0XCJkdXJhdGlvblwiOiBcIjEwMCVcIixcblx0XHRcImFuaW1hdGlvbnNcIjogW1xuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLnNlY29uZFwiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDAsXG5cdFx0XHRcdFx0MVxuXHRcdFx0XHRdXG5cdFx0XHR9XG5cdFx0XVxuXHR9LFxuXHR7XG5cdFx0XCJ3cmFwcGVyXCI6IFwiI2xpa2VwZWFjZVwiLFxuXHRcdFwiZHVyYXRpb25cIjogXCIxMDAlXCIsXG5cdFx0XCJhbmltYXRpb25zXCI6IFtcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi50aGlyZFwiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDAsXG5cdFx0XHRcdFx0MVxuXHRcdFx0XHRdXG5cdFx0XHR9XG5cdFx0XVxuXHR9LFxuXHR7XG5cdFx0XCJ3cmFwcGVyXCI6IFwiI2xpa2VwZWFjZVwiLFxuXHRcdFwiZHVyYXRpb25cIjogXCI1MCVcIixcblx0XHRcImFuaW1hdGlvbnNcIjogW11cblx0fSxcblx0e1xuXHRcdFwid3JhcHBlclwiOiBcIiNsaWtlcGVhY2VcIixcblx0XHRcImR1cmF0aW9uXCI6IFwiMTAwJVwiLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIuZmlyc3RcIixcblx0XHRcdFx0XCJvcGFjaXR5XCI6IDFcblx0XHRcdH0sXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIuc2Vjb25kXCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiAxXG5cdFx0XHR9LFxuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLnRoaXJkXCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiAxXG5cdFx0XHR9LFxuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLmZvdXJ0aFwiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdC00LFxuXHRcdFx0XHRcdDFcblx0XHRcdFx0XVxuXHRcdFx0fSxcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5kaXNwbGF5LTRcIixcblx0XHRcdFx0XCJ0cmFuc2xhdGVZXCI6IFtcblx0XHRcdFx0XHRcIjMwJVwiLFxuXHRcdFx0XHRcdFwiMCVcIlxuXHRcdFx0XHRdXG5cdFx0XHR9XG5cdFx0XVxuXHR9LFxuXHR7XG5cdFx0XCJ3cmFwcGVyXCI6IFwiI2xpa2VwZWFjZVwiLFxuXHRcdFwiZHVyYXRpb25cIjogXCIyMDAlXCIsXG5cdFx0XCJhbmltYXRpb25zXCI6IFtcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5maXJzdFwiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogMVxuXHRcdFx0fSxcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5zZWNvbmRcIixcblx0XHRcdFx0XCJvcGFjaXR5XCI6IDFcblx0XHRcdH0sXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIudGhpcmRcIixcblx0XHRcdFx0XCJvcGFjaXR5XCI6IDFcblx0XHRcdH0sXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIuZm91cnRoXCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiAxXG5cdFx0XHR9LFxuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLmRpc3BsYXktNFwiLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVlcIjogXCIwJVwiXG5cdFx0XHR9XG5cdFx0XVxuXHR9LFxuXHR7XG5cdFx0XCJ3cmFwcGVyXCI6IFwiI2xpa2VwZWFjZVwiLFxuXHRcdFwiZHVyYXRpb25cIjogXCIxMDAlXCIsXG5cdFx0XCJmb2N1c1wiOiB0cnVlLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXG5cdFx0XHR7fVxuXHRcdF1cblx0fVxuXTtcblxuXG4vKioqKioqKioqKioqKioqKipcbiAqKiBXRUJQQUNLIEZPT1RFUlxuICoqIC4vfi9qc29uLWxvYWRlciEuL3NjZW5lcy9saWtlcGVhY2Uvc2NlbmUuanNvblxuICoqIG1vZHVsZSBpZCA9IDY3XG4gKiogbW9kdWxlIGNodW5rcyA9IDBcbiAqKi8iLCJtb2R1bGUuZXhwb3J0cyA9IFtcblx0e1xuXHRcdFwid3JhcHBlclwiOiBcIiNtaXhlZGZlZWxpbmdzXCIsXG5cdFx0XCJkdXJhdGlvblwiOiBcIjEwMCVcIixcblx0XHRcImFuaW1hdGlvbnNcIjogW1xuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLmRpc3BsYXktNFwiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDAsXG5cdFx0XHRcdFx0MS4yNVxuXHRcdFx0XHRdXG5cdFx0XHR9XG5cdFx0XVxuXHR9LFxuXHR7XG5cdFx0XCJ3cmFwcGVyXCI6IFwiI21peGVkZmVlbGluZ3NcIixcblx0XHRcImR1cmF0aW9uXCI6IFwiMTAwJVwiLFxuXHRcdFwiZm9jdXNcIjogdHJ1ZSxcblx0XHRcImFuaW1hdGlvbnNcIjogW1xuXHRcdFx0e31cblx0XHRdXG5cdH0sXG5cdHtcblx0XHRcIndyYXBwZXJcIjogXCIjbWl4ZWRmZWVsaW5nc1wiLFxuXHRcdFwiZHVyYXRpb25cIjogXCIxMDAlXCIsXG5cdFx0XCJhbmltYXRpb25zXCI6IFtcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5kaXNwbGF5LTRcIixcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQyLFxuXHRcdFx0XHRcdDBcblx0XHRcdFx0XVxuXHRcdFx0fVxuXHRcdF1cblx0fVxuXTtcblxuXG4vKioqKioqKioqKioqKioqKipcbiAqKiBXRUJQQUNLIEZPT1RFUlxuICoqIC4vfi9qc29uLWxvYWRlciEuL3NjZW5lcy9taXhlZGZlZWxpbmdzL3NjZW5lLmpzb25cbiAqKiBtb2R1bGUgaWQgPSA2OFxuICoqIG1vZHVsZSBjaHVua3MgPSAwXG4gKiovIiwibW9kdWxlLmV4cG9ydHMgPSBbXG5cdHtcblx0XHRcIndyYXBwZXJcIjogXCIjbXVzbGltc2JlbGlldmVpbmRpdmlkdWFsbGlmZVwiLFxuXHRcdFwiZHVyYXRpb25cIjogXCIxMDAlXCIsXG5cdFx0XCJhbmltYXRpb25zXCI6IFtcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5kaXNwbGF5LTRcIixcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQwLFxuXHRcdFx0XHRcdDFcblx0XHRcdFx0XVxuXHRcdFx0fVxuXHRcdF1cblx0fSxcblx0e1xuXHRcdFwid3JhcHBlclwiOiBcIiNtdXNsaW1zYmVsaWV2ZWluZGl2aWR1YWxsaWZlXCIsXG5cdFx0XCJkdXJhdGlvblwiOiBcIjEwMCVcIixcblx0XHRcImZvY3VzXCI6IHRydWUsXG5cdFx0XCJhbmltYXRpb25zXCI6IFtcblx0XHRcdHt9XG5cdFx0XVxuXHR9LFxuXHR7XG5cdFx0XCJ3cmFwcGVyXCI6IFwiI211c2xpbXNiZWxpZXZlaW5kaXZpZHVhbGxpZmVcIixcblx0XHRcImR1cmF0aW9uXCI6IFwiMTAwJVwiLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIuZGlzcGxheS00XCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MSxcblx0XHRcdFx0XHQwXG5cdFx0XHRcdF1cblx0XHRcdH1cblx0XHRdXG5cdH1cbl07XG5cblxuLyoqKioqKioqKioqKioqKioqXG4gKiogV0VCUEFDSyBGT09URVJcbiAqKiAuL34vanNvbi1sb2FkZXIhLi9zY2VuZXMvbXVzbGltc2JlbGlldmVpbmRpdmlkdWFsbGlmZS9zY2VuZS5qc29uXG4gKiogbW9kdWxlIGlkID0gNjlcbiAqKiBtb2R1bGUgY2h1bmtzID0gMFxuICoqLyIsIm1vZHVsZS5leHBvcnRzID0gW1xuXHR7XG5cdFx0XCJ3cmFwcGVyXCI6IFwiI291dHRvZ2V0eW91XCIsXG5cdFx0XCJkdXJhdGlvblwiOiBcIjEwMCVcIixcblx0XHRcImFuaW1hdGlvbnNcIjogW1xuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLm91dC10by1nZXQteW91XCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MCxcblx0XHRcdFx0XHQxXG5cdFx0XHRcdF1cblx0XHRcdH1cblx0XHRdXG5cdH0sXG5cdHtcblx0XHRcIndyYXBwZXJcIjogXCIjb3V0dG9nZXR5b3VcIixcblx0XHRcImR1cmF0aW9uXCI6IFwiMTAwJVwiLFxuXHRcdFwiZm9jdXNcIjogdHJ1ZSxcblx0XHRcImFuaW1hdGlvbnNcIjogW1xuXHRcdFx0e31cblx0XHRdXG5cdH0sXG5cdHtcblx0XHRcIndyYXBwZXJcIjogXCIjb3V0dG9nZXR5b3VcIixcblx0XHRcImR1cmF0aW9uXCI6IFwiMTAwJVwiLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIub3V0LXRvLWdldC15b3VcIixcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQyLFxuXHRcdFx0XHRcdDBcblx0XHRcdFx0XVxuXHRcdFx0fVxuXHRcdF1cblx0fVxuXTtcblxuXG4vKioqKioqKioqKioqKioqKipcbiAqKiBXRUJQQUNLIEZPT1RFUlxuICoqIC4vfi9qc29uLWxvYWRlciEuL3NjZW5lcy9vdXR0b2dldHlvdS9zY2VuZS5qc29uXG4gKiogbW9kdWxlIGlkID0gNzBcbiAqKiBtb2R1bGUgY2h1bmtzID0gMFxuICoqLyIsIm1vZHVsZS5leHBvcnRzID0gW1xuXHR7XG5cdFx0XCJ3cmFwcGVyXCI6IFwiI3JlYWN0aW9uc3RvdGVycm9yXCIsXG5cdFx0XCJkdXJhdGlvblwiOiBcIjE1MCVcIixcblx0XHRcImFuaW1hdGlvbnNcIjogW1xuXHRcdFx0e31cblx0XHRdXG5cdH0sXG5cdHtcblx0XHRcIndyYXBwZXJcIjogXCIjcmVhY3Rpb25zdG90ZXJyb3JcIixcblx0XHRcImR1cmF0aW9uXCI6IFwiMTAwJVwiLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIuYW5pbS0xXCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MCxcblx0XHRcdFx0XHQxXG5cdFx0XHRcdF0sXG5cdFx0XHRcdFwidHJhbnNsYXRlWVwiOiBbXG5cdFx0XHRcdFx0XCItMzglXCIsXG5cdFx0XHRcdFx0XCItMzglXCJcblx0XHRcdFx0XVxuXHRcdFx0fVxuXHRcdF1cblx0fSxcblx0e1xuXHRcdFwid3JhcHBlclwiOiBcIiNyZWFjdGlvbnN0b3RlcnJvclwiLFxuXHRcdFwiZHVyYXRpb25cIjogXCIxMDAlXCIsXG5cdFx0XCJmb2N1c1wiOiB0cnVlLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXG5cdFx0XHR7fVxuXHRcdF1cblx0fSxcblx0e1xuXHRcdFwid3JhcHBlclwiOiBcIiNyZWFjdGlvbnN0b3RlcnJvclwiLFxuXHRcdFwiZHVyYXRpb25cIjogXCIxMDAlXCIsXG5cdFx0XCJhbmltYXRpb25zXCI6IFtcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5hbmltLTFcIixcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQxLFxuXHRcdFx0XHRcdDBcblx0XHRcdFx0XSxcblx0XHRcdFx0XCJ0cmFuc2xhdGVZXCI6IFtcblx0XHRcdFx0XHRcIi0zOCVcIixcblx0XHRcdFx0XHRcIi0zOCVcIlxuXHRcdFx0XHRdXG5cdFx0XHR9XG5cdFx0XVxuXHR9XG5dO1xuXG5cbi8qKioqKioqKioqKioqKioqKlxuICoqIFdFQlBBQ0sgRk9PVEVSXG4gKiogLi9+L2pzb24tbG9hZGVyIS4vc2NlbmVzL3JlYWN0aW9uc3RvdGVycm9yL3NjZW5lLmpzb25cbiAqKiBtb2R1bGUgaWQgPSA3MVxuICoqIG1vZHVsZSBjaHVua3MgPSAwXG4gKiovIiwibW9kdWxlLmV4cG9ydHMgPSBbXG5cdHtcblx0XHRcIndyYXBwZXJcIjogXCIjc29tZXRoaW5ndG9wcm92ZVwiLFxuXHRcdFwiZHVyYXRpb25cIjogXCIxMDAlXCIsXG5cdFx0XCJhbmltYXRpb25zXCI6IFtcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5kaXNwbGF5LTRcIixcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQwLFxuXHRcdFx0XHRcdDFcblx0XHRcdFx0XVxuXHRcdFx0fVxuXHRcdF1cblx0fSxcblx0e1xuXHRcdFwid3JhcHBlclwiOiBcIiNzb21ldGhpbmd0b3Byb3ZlXCIsXG5cdFx0XCJkdXJhdGlvblwiOiBcIjEwMCVcIixcblx0XHRcImZvY3VzXCI6IHRydWUsXG5cdFx0XCJhbmltYXRpb25zXCI6IFtcblx0XHRcdHt9XG5cdFx0XVxuXHR9LFxuXHR7XG5cdFx0XCJ3cmFwcGVyXCI6IFwiI3NvbWV0aGluZ3RvcHJvdmVcIixcblx0XHRcImR1cmF0aW9uXCI6IFwiMTAwJVwiLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIuZGlzcGxheS00XCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MSxcblx0XHRcdFx0XHQwXG5cdFx0XHRcdF1cblx0XHRcdH1cblx0XHRdXG5cdH1cbl07XG5cblxuLyoqKioqKioqKioqKioqKioqXG4gKiogV0VCUEFDSyBGT09URVJcbiAqKiAuL34vanNvbi1sb2FkZXIhLi9zY2VuZXMvc29tZXRoaW5ndG9wcm92ZS9zY2VuZS5qc29uXG4gKiogbW9kdWxlIGlkID0gNzJcbiAqKiBtb2R1bGUgY2h1bmtzID0gMFxuICoqLyIsIm1vZHVsZS5leHBvcnRzID0gW1xuXHR7XG5cdFx0XCJ3cmFwcGVyXCI6IFwiI3dlYXJlY29taW5nXCIsXG5cdFx0XCJkdXJhdGlvblwiOiBcIjEwMCVcIixcblx0XHRcImFuaW1hdGlvbnNcIjogW1xuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLmRpc3BsYXktNFwiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDAsXG5cdFx0XHRcdFx0MVxuXHRcdFx0XHRdXG5cdFx0XHR9XG5cdFx0XVxuXHR9LFxuXHR7XG5cdFx0XCJ3cmFwcGVyXCI6IFwiI3dlYXJlY29taW5nXCIsXG5cdFx0XCJkdXJhdGlvblwiOiBcIjEwMCVcIixcblx0XHRcImZvY3VzXCI6IHRydWUsXG5cdFx0XCJhbmltYXRpb25zXCI6IFtcblx0XHRcdHt9XG5cdFx0XVxuXHR9LFxuXHR7XG5cdFx0XCJ3cmFwcGVyXCI6IFwiI3dlYXJlY29taW5nXCIsXG5cdFx0XCJkdXJhdGlvblwiOiBcIjEwMCVcIixcblx0XHRcImFuaW1hdGlvbnNcIjogW1xuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLmRpc3BsYXktNFwiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDIsXG5cdFx0XHRcdFx0MFxuXHRcdFx0XHRdXG5cdFx0XHR9XG5cdFx0XVxuXHR9XG5dO1xuXG5cbi8qKioqKioqKioqKioqKioqKlxuICoqIFdFQlBBQ0sgRk9PVEVSXG4gKiogLi9+L2pzb24tbG9hZGVyIS4vc2NlbmVzL3dlYXJlY29taW5nL3NjZW5lLmpzb25cbiAqKiBtb2R1bGUgaWQgPSA3M1xuICoqIG1vZHVsZSBjaHVua3MgPSAwXG4gKiovIiwibW9kdWxlLmV4cG9ydHMgPSBbXG5cdHtcblx0XHRcIndyYXBwZXJcIjogXCIjd2VhcmVub3RhZnJhaWRcIixcblx0XHRcImR1cmF0aW9uXCI6IFwiMTAwJVwiLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIuZGlzcGxheS00XCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MCxcblx0XHRcdFx0XHQxXG5cdFx0XHRcdF1cblx0XHRcdH1cblx0XHRdXG5cdH0sXG5cdHtcblx0XHRcIndyYXBwZXJcIjogXCIjd2VhcmVub3RhZnJhaWRcIixcblx0XHRcImR1cmF0aW9uXCI6IFwiMTAwJVwiLFxuXHRcdFwiZm9jdXNcIjogdHJ1ZSxcblx0XHRcImFuaW1hdGlvbnNcIjogW1xuXHRcdFx0e31cblx0XHRdXG5cdH0sXG5cdHtcblx0XHRcIndyYXBwZXJcIjogXCIjd2VhcmVub3RhZnJhaWRcIixcblx0XHRcImR1cmF0aW9uXCI6IFwiMTAwJVwiLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIuZGlzcGxheS00XCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MSxcblx0XHRcdFx0XHQwXG5cdFx0XHRcdF1cblx0XHRcdH1cblx0XHRdXG5cdH1cbl07XG5cblxuLyoqKioqKioqKioqKioqKioqXG4gKiogV0VCUEFDSyBGT09URVJcbiAqKiAuL34vanNvbi1sb2FkZXIhLi9zY2VuZXMvd2VhcmVub3RhZnJhaWQvc2NlbmUuanNvblxuICoqIG1vZHVsZSBpZCA9IDc0XG4gKiogbW9kdWxlIGNodW5rcyA9IDBcbiAqKi8iLCJtb2R1bGUuZXhwb3J0cyA9IFtcblx0e1xuXHRcdFwid3JhcHBlclwiOiBcIiN3ZXdpbGxwcm90ZWN0ZWFjaG90aGVyXCIsXG5cdFx0XCJkdXJhdGlvblwiOiBcIjEwMCVcIixcblx0XHRcImFuaW1hdGlvbnNcIjogW1xuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLnByZW1pc2VcIixcblx0XHRcdFx0XCJ0cmFuc2xhdGVZXCI6IFtcblx0XHRcdFx0XHRcIjI1JVwiLFxuXHRcdFx0XHRcdFwiMFwiXG5cdFx0XHRcdF0sXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MCxcblx0XHRcdFx0XHQxLjc1XG5cdFx0XHRcdF1cblx0XHRcdH0sXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIuY29uY2x1c2lvblwiLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVlcIjogXCIyNSVcIixcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQwLFxuXHRcdFx0XHRcdDBcblx0XHRcdFx0XVxuXHRcdFx0fVxuXHRcdF1cblx0fSxcblx0e1xuXHRcdFwid3JhcHBlclwiOiBcIiN3ZXdpbGxwcm90ZWN0ZWFjaG90aGVyXCIsXG5cdFx0XCJkdXJhdGlvblwiOiBcIjUwJVwiLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXVxuXHR9LFxuXHR7XG5cdFx0XCJ3cmFwcGVyXCI6IFwiI3dld2lsbHByb3RlY3RlYWNob3RoZXJcIixcblx0XHRcImR1cmF0aW9uXCI6IFwiMTAwJVwiLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIuY29uY2x1c2lvblwiLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVlcIjogW1xuXHRcdFx0XHRcdFwiMjUlXCIsXG5cdFx0XHRcdFx0XCIwXCJcblx0XHRcdFx0XSxcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQwLFxuXHRcdFx0XHRcdDFcblx0XHRcdFx0XVxuXHRcdFx0fVxuXHRcdF1cblx0fSxcblx0e1xuXHRcdFwid3JhcHBlclwiOiBcIiN3ZXdpbGxwcm90ZWN0ZWFjaG90aGVyXCIsXG5cdFx0XCJkdXJhdGlvblwiOiBcIjEwMCVcIixcblx0XHRcImZvY3VzXCI6IHRydWUsXG5cdFx0XCJhbmltYXRpb25zXCI6IFtcblx0XHRcdHt9XG5cdFx0XVxuXHR9LFxuXHR7XG5cdFx0XCJ3cmFwcGVyXCI6IFwiI3dld2lsbHByb3RlY3RlYWNob3RoZXJcIixcblx0XHRcImR1cmF0aW9uXCI6IFwiMTAwJVwiLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIucHJlbWlzZVwiLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVlcIjogW1xuXHRcdFx0XHRcdFwiMFwiLFxuXHRcdFx0XHRcdFwiLTI1JVwiXG5cdFx0XHRcdF0sXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MSxcblx0XHRcdFx0XHQwXG5cdFx0XHRcdF1cblx0XHRcdH0sXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIuY29uY2x1c2lvblwiLFxuXHRcdFx0XHRcInRyYW5zbGF0ZVlcIjogW1xuXHRcdFx0XHRcdFwiMFwiLFxuXHRcdFx0XHRcdFwiLTI1JVwiXG5cdFx0XHRcdF0sXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MSxcblx0XHRcdFx0XHQwXG5cdFx0XHRcdF1cblx0XHRcdH1cblx0XHRdXG5cdH1cbl07XG5cblxuLyoqKioqKioqKioqKioqKioqXG4gKiogV0VCUEFDSyBGT09URVJcbiAqKiAuL34vanNvbi1sb2FkZXIhLi9zY2VuZXMvd2V3aWxscHJvdGVjdGVhY2hvdGhlci9zY2VuZS5qc29uXG4gKiogbW9kdWxlIGlkID0gNzVcbiAqKiBtb2R1bGUgY2h1bmtzID0gMFxuICoqLyIsIm1vZHVsZS5leHBvcnRzID0gW1xuXHR7XG5cdFx0XCJ3cmFwcGVyXCI6IFwiI3doYXRpc2xhbWljaGlzdG9yeXByZWZlcnNcIixcblx0XHRcImR1cmF0aW9uXCI6IFwiMTAwJVwiLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIuZGlzcGxheS00XCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MCxcblx0XHRcdFx0XHQxXG5cdFx0XHRcdF1cblx0XHRcdH1cblx0XHRdXG5cdH0sXG5cdHtcblx0XHRcIndyYXBwZXJcIjogXCIjd2hhdGlzbGFtaWNoaXN0b3J5cHJlZmVyc1wiLFxuXHRcdFwiZHVyYXRpb25cIjogXCIxMDAlXCIsXG5cdFx0XCJhbmltYXRpb25zXCI6IFtcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5kaXNwbGF5LTRcIixcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQxLFxuXHRcdFx0XHRcdDFcblx0XHRcdFx0XVxuXHRcdFx0fSxcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5pc2xhbWljLWludmVudGlvbnNcIixcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQwLFxuXHRcdFx0XHRcdDFcblx0XHRcdFx0XVxuXHRcdFx0fVxuXHRcdF1cblx0fSxcblx0e1xuXHRcdFwid3JhcHBlclwiOiBcIiN3aGF0aXNsYW1pY2hpc3RvcnlwcmVmZXJzXCIsXG5cdFx0XCJkdXJhdGlvblwiOiBcIjEwMCVcIixcblx0XHRcImZvY3VzXCI6IHRydWUsXG5cdFx0XCJhbmltYXRpb25zXCI6IFtcblx0XHRcdHt9XG5cdFx0XVxuXHR9LFxuXHR7XG5cdFx0XCJ3cmFwcGVyXCI6IFwiI3doYXRpc2xhbWljaGlzdG9yeXByZWZlcnNcIixcblx0XHRcImR1cmF0aW9uXCI6IFwiMTAwJVwiLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIuZGlzcGxheS00XCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MSxcblx0XHRcdFx0XHQwLjVcblx0XHRcdFx0XVxuXHRcdFx0fSxcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5pc2xhbWljLWludmVudGlvbnNcIixcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQxLFxuXHRcdFx0XHRcdDAuNVxuXHRcdFx0XHRdXG5cdFx0XHR9XG5cdFx0XVxuXHR9LFxuXHR7XG5cdFx0XCJ3cmFwcGVyXCI6IFwiI3doYXRpc2xhbWljaGlzdG9yeXByZWZlcnNcIixcblx0XHRcImR1cmF0aW9uXCI6IFwiMTAwJVwiLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIuZGlzcGxheS00XCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0MC41LFxuXHRcdFx0XHRcdDBcblx0XHRcdFx0XVxuXHRcdFx0fSxcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5pc2xhbWljLWludmVudGlvbnNcIixcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQwLjUsXG5cdFx0XHRcdFx0MFxuXHRcdFx0XHRdXG5cdFx0XHR9XG5cdFx0XVxuXHR9XG5dO1xuXG5cbi8qKioqKioqKioqKioqKioqKlxuICoqIFdFQlBBQ0sgRk9PVEVSXG4gKiogLi9+L2pzb24tbG9hZGVyIS4vc2NlbmVzL3doYXRpc2xhbWljaGlzdG9yeXByZWZlcnMvc2NlbmUuanNvblxuICoqIG1vZHVsZSBpZCA9IDc2XG4gKiogbW9kdWxlIGNodW5rcyA9IDBcbiAqKi8iLCJtb2R1bGUuZXhwb3J0cyA9IFtcblx0e1xuXHRcdFwid3JhcHBlclwiOiBcIiN3aGF0dGhlcXVyYW5wcmVmZXJzXCIsXG5cdFx0XCJkdXJhdGlvblwiOiBcIjEwMCVcIixcblx0XHRcImFuaW1hdGlvbnNcIjogW1xuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLmRpc3BsYXktNFwiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDEsXG5cdFx0XHRcdFx0MFxuXHRcdFx0XHRdXG5cdFx0XHR9XG5cdFx0XVxuXHR9XG5dO1xuXG5cbi8qKioqKioqKioqKioqKioqKlxuICoqIFdFQlBBQ0sgRk9PVEVSXG4gKiogLi9+L2pzb24tbG9hZGVyIS4vc2NlbmVzL3doYXR0aGVxdXJhbnByZWZlcnMvc2NlbmUuanNvblxuICoqIG1vZHVsZSBpZCA9IDc3XG4gKiogbW9kdWxlIGNodW5rcyA9IDBcbiAqKi8iLCJtb2R1bGUuZXhwb3J0cyA9IFtcblx0e1xuXHRcdFwid3JhcHBlclwiOiBcIiN3aG9hcmV0aGV5XCIsXG5cdFx0XCJkdXJhdGlvblwiOiBcIjEwMCVcIixcblx0XHRcImFuaW1hdGlvbnNcIjogW1xuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLmRpc3BsYXktNFwiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDAsXG5cdFx0XHRcdFx0MVxuXHRcdFx0XHRdXG5cdFx0XHR9XG5cdFx0XVxuXHR9LFxuXHR7XG5cdFx0XCJ3cmFwcGVyXCI6IFwiI3dob2FyZXRoZXlcIixcblx0XHRcImR1cmF0aW9uXCI6IFwiMTAwJVwiLFxuXHRcdFwiZm9jdXNcIjogdHJ1ZSxcblx0XHRcImFuaW1hdGlvbnNcIjogW1xuXHRcdFx0e31cblx0XHRdXG5cdH0sXG5cdHtcblx0XHRcIndyYXBwZXJcIjogXCIjd2hvYXJldGhleVwiLFxuXHRcdFwiZHVyYXRpb25cIjogXCIxMDAlXCIsXG5cdFx0XCJhbmltYXRpb25zXCI6IFtcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5kaXNwbGF5LTRcIixcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQyLFxuXHRcdFx0XHRcdDBcblx0XHRcdFx0XVxuXHRcdFx0fVxuXHRcdF1cblx0fVxuXTtcblxuXG4vKioqKioqKioqKioqKioqKipcbiAqKiBXRUJQQUNLIEZPT1RFUlxuICoqIC4vfi9qc29uLWxvYWRlciEuL3NjZW5lcy93aG9hcmV0aGV5L3NjZW5lLmpzb25cbiAqKiBtb2R1bGUgaWQgPSA3OFxuICoqIG1vZHVsZSBjaHVua3MgPSAwXG4gKiovIiwibW9kdWxlLmV4cG9ydHMgPSBbXG5cdHtcblx0XHRcIndyYXBwZXJcIjogXCIjd2l0aGFsbHRoZWhhdHJlZFwiLFxuXHRcdFwiZHVyYXRpb25cIjogXCIxMDAlXCIsXG5cdFx0XCJhbmltYXRpb25zXCI6IFtcblx0XHRcdHtcblx0XHRcdFx0XCJzZWxlY3RvclwiOiBcIi5kaXNwbGF5LTRcIixcblx0XHRcdFx0XCJvcGFjaXR5XCI6IFtcblx0XHRcdFx0XHQxLFxuXHRcdFx0XHRcdDBcblx0XHRcdFx0XVxuXHRcdFx0fVxuXHRcdF1cblx0fVxuXTtcblxuXG4vKioqKioqKioqKioqKioqKipcbiAqKiBXRUJQQUNLIEZPT1RFUlxuICoqIC4vfi9qc29uLWxvYWRlciEuL3NjZW5lcy93aXRoYWxsdGhlaGF0cmVkL3NjZW5lLmpzb25cbiAqKiBtb2R1bGUgaWQgPSA3OVxuICoqIG1vZHVsZSBjaHVua3MgPSAwXG4gKiovIiwibW9kdWxlLmV4cG9ydHMgPSBbXG5cdHtcblx0XHRcIndyYXBwZXJcIjogXCIjeWV0dGhhdHNva2F5XCIsXG5cdFx0XCJkdXJhdGlvblwiOiBcIjEwMCVcIixcblx0XHRcImFuaW1hdGlvbnNcIjogW1xuXHRcdFx0e1xuXHRcdFx0XHRcInNlbGVjdG9yXCI6IFwiLmRpc3BsYXktNFwiLFxuXHRcdFx0XHRcIm9wYWNpdHlcIjogW1xuXHRcdFx0XHRcdDAsXG5cdFx0XHRcdFx0MS4yNVxuXHRcdFx0XHRdXG5cdFx0XHR9XG5cdFx0XVxuXHR9LFxuXHR7XG5cdFx0XCJ3cmFwcGVyXCI6IFwiI3lldHRoYXRzb2theVwiLFxuXHRcdFwiZHVyYXRpb25cIjogXCIxMDAlXCIsXG5cdFx0XCJmb2N1c1wiOiB0cnVlLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXG5cdFx0XHR7fVxuXHRcdF1cblx0fSxcblx0e1xuXHRcdFwid3JhcHBlclwiOiBcIiN5ZXR0aGF0c29rYXlcIixcblx0XHRcImR1cmF0aW9uXCI6IFwiMTAwJVwiLFxuXHRcdFwiYW5pbWF0aW9uc1wiOiBbXG5cdFx0XHR7XG5cdFx0XHRcdFwic2VsZWN0b3JcIjogXCIuZGlzcGxheS00XCIsXG5cdFx0XHRcdFwib3BhY2l0eVwiOiBbXG5cdFx0XHRcdFx0Mixcblx0XHRcdFx0XHQwXG5cdFx0XHRcdF1cblx0XHRcdH1cblx0XHRdXG5cdH1cbl07XG5cblxuLyoqKioqKioqKioqKioqKioqXG4gKiogV0VCUEFDSyBGT09URVJcbiAqKiAuL34vanNvbi1sb2FkZXIhLi9zY2VuZXMveWV0dGhhdHNva2F5L3NjZW5lLmpzb25cbiAqKiBtb2R1bGUgaWQgPSA4MFxuICoqIG1vZHVsZSBjaHVua3MgPSAwXG4gKiovIl0sInNvdXJjZVJvb3QiOiIifQ==