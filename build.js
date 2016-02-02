/******/ (function(modules) { // webpackBootstrap
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

	var animator = __webpack_require__(1);
	var controls = __webpack_require__(65);

	var sceneUtils = __webpack_require__(3);

	var sceneHtmlString = sceneUtils.renderHTML();
	var sceneMotionMap = sceneUtils.getScenes();

	$(function() {

	      var ua = navigator.userAgent;

	      if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile/i.test(ua))
	         $('#unsupported').show();

	      else if (/Chrome/i.test(ua))
	        init();

	      else
	         $('#unsupported').show();

	});

	function init() {
	  $(window).on("load", function() {
	    $('.container-inner').html(sceneHtmlString);
	    animator.init(sceneMotionMap);
	    controls.init();
	    $('.loading').hide();
	  });
	}


/***/ },
/* 1 */
/***/ function(module, exports, __webpack_require__) {

	var videoPlayer = __webpack_require__(2);

	    /*  Globals
	    -------------------------------------------------- */
	    var PROPERTIES =               ['translateX', 'translateY', 'opacity', 'rotate', 'scale'],
	        $window =                  $(window),
	        $body =                    $('body'),
	        $experienceIndicator =     $('#experience-progress .progress'),
	        wrappers =                 [],
	        currentWrapper =           null,
	        scrollTimeoutID =          0,
	        bodyHeight =               0,
	        windowHeight =             0,
	        windowWidth =              0,
	        prevKeyframesDurations =   0,
	        scrollTop =                0,
	        relativeScrollTop =        0,
	        currentKeyframe =          0;


	    /*  Construction
	    -------------------------------------------------- */
	    module.exports.init = function(message) {
	      keyframes = message;
	      updatePage();
	      setupValues();
	      $window.resize(throwError)
	      if(isTouchDevice) {
	        $window.resize(throwError)
	      }
	    };

	    var setupValues = function() {
	      scrollTop = $window.scrollTop();
	      windowHeight = $window.height();
	      windowWidth = $window.width();
	      convertAllPropsToPx();
	      buildPage();
	    };

	    var buildPage = function() {
	      var i, j, k;
	      for(i=0;i<keyframes.length;i++) { // loop keyframes
	          bodyHeight += keyframes[i].duration;
	          if($.inArray(keyframes[i].wrapper, wrappers) == -1) {
	            wrappers.push(keyframes[i].wrapper);
	          }
	          for(j=0;j<keyframes[i].animations.length;j++) { // loop animations
	            Object.keys(keyframes[i].animations[j]).forEach(function(key) { // loop properties
	              value = keyframes[i].animations[j][key];
	              if(key !== 'selector' && value instanceof Array === false) {
	                var valueSet = [];
	                valueSet.push(getDefaultPropertyValue(key), value);
	                value = valueSet;
	              }
	              keyframes[i].animations[j][key] = value;
	            });
	          }
	      }
	      $body.height(bodyHeight);
	      $window.scroll(0);
	      currentWrapper = wrappers[0];
	      $(wrappers[0]).show();
	      showCurrentWrappers(true);
	    };

	    var convertAllPropsToPx = function() {
	      var i, j, k;
	      for(i=0;i<keyframes.length;i++) { // loop keyframes
	        keyframes[i].duration = convertPercentToPx(keyframes[i].duration, 'y');
	        for(j=0;j<keyframes[i].animations.length;j++) { // loop animations
	          Object.keys(keyframes[i].animations[j]).forEach(function(key) { // loop properties
	            value = keyframes[i].animations[j][key];
	            if(key !== 'selector') {
	              if(value instanceof Array) { // if its an array
	                for(k=0;k<value.length;k++) { // if value in array is %
	                  if(typeof value[k] === "string") {
	                    if(key === 'translateY') {
	                      value[k] = convertPercentToPx(value[k], 'y');
	                    } else {
	                      value[k] = convertPercentToPx(value[k], 'x');
	                    }
	                  }
	                }
	              } else {
	                if(typeof value === "string") { // if single value is a %
	                  if(key === 'translateY') {
	                    value = convertPercentToPx(value, 'y');
	                  } else {
	                    value = convertPercentToPx(value, 'x');
	                  }
	                }
	              }
	              keyframes[i].animations[j][key] = value;
	            }
	          });
	        }
	      }
	    };

	    var getDefaultPropertyValue = function(property) {
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
	    };

	    /*  Animation/Scrolling
	    -------------------------------------------------- */
	    var updatePage = function() {
	      window.requestAnimationFrame(function() {
	        setScrollTops();
	        if(scrollTop > 0 && scrollTop <= (bodyHeight - windowHeight)) {
	          animateElements();
	          setKeyframe();
	          animateScrollBar();
	        }
	        updatePage();
	      });
	    };
	    function animateScrollBar() {
	      var percent = (scrollTop / bodyHeight).toFixed(2) * 100;
	      $experienceIndicator.css({
	          'transform':    'translateY(' + percent + '%)'
	        });
	    }
	    var setScrollTops = function() {
	      scrollTop = $window.scrollTop();
	      relativeScrollTop = scrollTop - prevKeyframesDurations;
	    };

	    var animateElements = function() {
	      var animation, translateY, translateX, scale, rotate, opacity;
	      for(var i=0;i<keyframes[currentKeyframe].animations.length;i++) {
	        animation   = keyframes[currentKeyframe].animations[i];
	        translateY  = calcPropValue(animation, 'translateY');
	        translateX  = calcPropValue(animation, 'translateX');
	        scale       = calcPropValue(animation, 'scale');
	        rotate      = calcPropValue(animation, 'rotate');
	        opacity     = calcPropValue(animation, 'opacity');

	        $(animation.selector).css({
	          'transform':    'translate3d(' + translateX +'px, ' + translateY + 'px, 0) scale('+ scale +') rotate('+ rotate +'deg)',
	          'opacity' : opacity
	        });

	      }
	    };

	    var calcPropValue = function(animation, property) {
	      var value = animation[property];
	      if(value) {
	        value = easeInOutQuad(relativeScrollTop, value[0], (value[1]-value[0]), keyframes[currentKeyframe].duration);
	      } else {
	        value = getDefaultPropertyValue(property);
	      }
	      // value = +value.toFixed(2)
	      // TEMPORARILY REMOVED CAUSE SCALE DOESN'T WORK WITHA AGRESSIVE ROUNDING LIKE THIS
	      return value;
	    };

	    var easeInOutQuad = function (t, b, c, d) {
	      //sinusoadial in and out
	      return -c/2 * (Math.cos(Math.PI*t/d) - 1) + b;
	    };

	    var setKeyframe = function() {
	      if(scrollTop > (keyframes[currentKeyframe].duration + prevKeyframesDurations)) {
	          prevKeyframesDurations += keyframes[currentKeyframe].duration;
	          currentKeyframe++;
	          showCurrentWrappers();
	      } else if(scrollTop < prevKeyframesDurations) {
	          currentKeyframe--;
	          prevKeyframesDurations -= keyframes[currentKeyframe].duration;
	          showCurrentWrappers();
	      }
	    };

	    var showCurrentWrappers = function(init) {
	      var i;
	      if(init) {
	        $newVideo = $('video', keyframes[currentKeyframe].wrapper);

	        if($newVideo[0]) {
	          $newVideo[0].play();
	          $newVideo.animate({volume: 1}, 300, 'swing');
	          requestVideo();
	        }
	      }
	      if(keyframes[currentKeyframe].wrapper != currentWrapper) {
	        $(currentWrapper).hide();

	        $('video', currentWrapper).animate({volume: 0}, 300, 'swing', function() {
	          // really stop the music
	          $(this).get(0).pause();
	        });


	        $(keyframes[currentKeyframe].wrapper).show();

	        $newVideo = $('video', keyframes[currentKeyframe].wrapper);

	        if($newVideo[0]) {
	          $newVideo[0].play();
	          $newVideo.animate({volume: 1}, 300, 'swing');
	          videoPlayer.start($newVideo);
	        } else {
	          videoPlayer.stop($newVideo);
	        }

	        currentWrapper = keyframes[currentKeyframe].wrapper;
	      }
	    };

	    /*  Helpers
	    -------------------------------------------------- */

	    var convertPercentToPx = function(value, axis) {
	      if(typeof value === "string" && value.match(/%/g)) {
	        if(axis === 'y') value = (parseFloat(value) / 100) * windowHeight;
	        if(axis === 'x') value = (parseFloat(value) / 100) * windowWidth;
	      }
	      return value;
	    };

	    var throwError = function() {
	      $body.addClass('page-error')
	    };

	    var isTouchDevice = function() {
	      return 'ontouchstart' in window // works on most browsers
	      || 'onmsgesturechange' in window; // works on ie10
	    };


/***/ },
/* 2 */
/***/ function(module, exports) {

	
	var $videoIndicator = $('#video-progress .progress');
	var videoPlaying;
	var $el;

	$videoIndicator.hide();
	module.exports.start = function($newVideo) {
	  $el = $newVideo[0];
	  $videoIndicator.show();
	  videoPlaying = true;
	  loop();
	};

	module.exports.stop = function() {
	  videoPlaying = false;
	  $('#video-progress .progress').hide();
	};

	function loop() {
	  window.requestAnimationFrame(function() {
	    var rate = ($el.currentTime / $el.duration);
	    var percent = rate * 100;
	    $videoIndicator.css({'width': percent + 'vw'});
	    if(videoPlaying) {loop()}
	  })
	}


/***/ },
/* 3 */
/***/ function(module, exports, __webpack_require__) {

	// NOTE: This file relies heavily on webpack for requires of html and json config files.

	// Constants
	var SCENE_INDEX = __webpack_require__(4);
	var SCENE_CONTAINER_CSS_CLASS = 'wrapper';

	/*
	 * Generates an HTML string from scene.html files the scenes folder.
	 * Creates a wrapper div that provides feedback.
	 */
	module.exports.renderHTML = function() {

	  return SCENE_INDEX
	    .map(function(sceneName) {
	      return {
	              html: __webpack_require__(5)("./" + sceneName + "/scene.html"),
	              name: sceneName
	            }
	    })
	    .map(function(sceneObject) { // Create wrapper div for html
	        var $wrapper = document.createElement('div');
	        $wrapper.classList.add(SCENE_CONTAINER_CSS_CLASS);
	        $wrapper.setAttribute('id', sceneObject.name);
	        $wrapper.innerHTML = sceneObject.html;
	        return $wrapper.outerHTML;
	    })
	    .reduce(function(prev, next) { // Concat to 1 html string
	      return prev + next;
	    }, '');

	}

	module.exports.getScenes = function() {

	  return SCENE_INDEX
	    .map(function(sceneName) { // get the scenes(which are in arrays)
	      return __webpack_require__(34)("./" + sceneName + "/scene.json")
	    })
	    .reduce(function(prev, current) { // flatten arrays by concating into a new array
	      return prev.concat(current);
	    }, []);

	}


/***/ },
/* 4 */
/***/ function(module, exports) {

	module.exports = [
		"intro",
		"doyoufeelmuslim",
		"reactionstoterror",
		"feelingconfused",
		"outtogetyou",
		"somethingtoprove",
		"itisnteasy",
		"mixedfeelings",
		"differentpractices",
		"yetthatsokay",
		"itsgottoend",
		"iwantmyislamback1",
		"whoarethey",
		"isisfightmisquote",
		"isisapocalypsemisquote",
		"isisafterlifefallacy",
		"whatislamichistoryprefers",
		"isisbankrupt",
		"isiswantstodivide",
		"complicatedsituation",
		"battleofageneration",
		"muslimsbelieveindividuallife",
		"wewillprotecteachother",
		"wearenotafraid",
		"wearecoming",
		"likepeace"
	];

/***/ },
/* 5 */
/***/ function(module, exports, __webpack_require__) {

	var map = {
		"./battleofageneration/scene.html": 6,
		"./complicatedsituation/scene.html": 7,
		"./differentpractices/scene.html": 63,
		"./doyoufeelmuslim/scene.html": 8,
		"./explosion/scene.html": 9,
		"./feelingconfused/scene.html": 10,
		"./intro/scene.html": 11,
		"./isisafterlifefallacy/scene.html": 12,
		"./isisapocalypsemisquote/scene.html": 13,
		"./isisbankrupt/scene.html": 14,
		"./isisfightmisquote/scene.html": 15,
		"./isisobjective/scene.html": 16,
		"./isiswantstodivide/scene.html": 17,
		"./itisnteasy/scene.html": 18,
		"./itsgottoend/scene.html": 19,
		"./iwantmyislamback1/scene.html": 20,
		"./likepeace/scene.html": 21,
		"./mixedfeelings/scene.html": 22,
		"./muslimsbelieveindividuallife/scene.html": 23,
		"./outtogetyou/scene.html": 24,
		"./reactionstoterror/scene.html": 25,
		"./somethingtoprove/scene.html": 26,
		"./wearecoming/scene.html": 27,
		"./wearenotafraid/scene.html": 28,
		"./wewillprotecteachother/scene.html": 29,
		"./whatislamichistoryprefers/scene.html": 30,
		"./whatthequranprefers/scene.html": 31,
		"./whoarethey/scene.html": 32,
		"./withallthehatred/scene.html": 33,
		"./yetthatsokay/scene.html": 66
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
	webpackContext.id = 5;


/***/ },
/* 6 */
/***/ function(module, exports) {

	module.exports = "\n<div class=\"battle-of-a-generation grey-zone\">\n\t<div class=\"table \">\n  \t\t<div class=\"table-center\">\n    \t\t<div class=\"display-4 text-centered\">...but we must begin our fight for this generation.</div>\n  \t\t</div>\n\t</div>\n</div>";

/***/ },
/* 7 */
/***/ function(module, exports) {

	module.exports = "\n<style>\n  .left, .right {\n    float: left;\n  }\n  .table {\n    position: relative;\n  }\n  .too-long-quote {\n    position: fixed;\n    top: 0;\n    left: 0;\n    font-size: 2.5vmax;\n    text-align: center;\n    color: rgba(255,255,255,0.3);\n    width: 100%;\n    height: 100%;\n    overflow: hidden;\n    /*background: #333;*/\n    padding-top: 4vmax;\n    -webkit-filter: blur(2px);\n  }\n  .text-centered {\n    text-align: center;\n  }\n  .onTop {\n    z-index: 20000;\n  }\n</style>\n\n<div class=\"grey-zone\">\n  <div class=\"too-long-quote\">\n    <strong>The failure</strong> of the postcolonial elites to <strong>create genuine democratic societies</strong> and foster a sense of national unity <strong>opting instead for military dictatorships</strong> that <strong>eroded the potential for economic and political development</strong> coupled with the historic mistakes of Arabic progressive parties and their <strong>appeasement towards autocratic rulers</strong> contributing to the <strong>complete evisceration of alternative political frameworks</strong> that could create organic resistance towards external meddling, hegemony and outright military interventions leaving a <strong>radical interpretation of religion as the only remaining ideological platform capable of mobilising the disenfranchised</strong> exacerbated by the global decline of universal ideals and the <strong>rise of identity as a prime mobiliser</strong> and enabled by political and <strong>financial support from theocratic regimes</strong> aiming to shore up their legitimacy and made worse by the <strong>collapse of the regional security</strong> order creating the conditions for <strong>proxy wars</strong> and political, social and economic upheaval intensified by geo-politically <strong>incoherent international meddling</strong> escalating conflicts and leading to a <strong>perpetual state of chaos</strong> under which the appeal of a revivalist religious-political order embodied by the <strong>caliphate becomes attractive</strong> particularly when coupled with a millenarian apocalyptic narrative.\n  </div>\n  <div class=\"table onTop \">\n    <div class=\"table-center\">\n      <div class=\"display-4 text-centered\">The situation may be complicated...</div>\n    </div>\n  </div>\n</div>\n";

/***/ },
/* 8 */
/***/ function(module, exports) {

	module.exports = "<style>\n  #doyoufeelmuslim .anim-2 {\n    opacity: 0;\n  }\n  .video-background video {\n    width: 100vw;\n  }\n  .video-background {\n    position: fixed;\n    top: 0;\n    left: 0;\n  }\n  #doyoufeelmuslim .display-4 {\n    background: black;\n    display: inline-block;\n    padding: 0.5vw;\n  }\n</style>\n<div class=\"video-background\">\n  <video loop>\n    <source src=\"img/terrorist-attacks.mp4\" type=\"video/mp4\">\n  </video>\n</div>\n<div class=\"table\">\n  <div class=\"table-center\">\n    <div class=\"display-4 anim-1\">How do you feel about your Islam?</div><br /><br />\n    <div class=\"display-4 anim-2\">How do you feel about yourself?</div>\n  </div>\n</div>\n";

/***/ },
/* 9 */
/***/ function(module, exports) {

	module.exports = "<p class=\"explosion-byline\">Here's an example of 16 elements scaling, fading and moving at once.</p>\n<ul id=\"domExplosionList\">\n  <li class=\"dom-explosion-item dei-1\"></li>\n  <li class=\"dom-explosion-item dei-2\"></li>\n  <li class=\"dom-explosion-item dei-3\"></li>\n  <li class=\"dom-explosion-item dei-4\"></li>\n  <li class=\"dom-explosion-item dei-5\"></li>\n  <li class=\"dom-explosion-item dei-6\"></li>\n  <li class=\"dom-explosion-item dei-7\"></li>\n  <li class=\"dom-explosion-item dei-8\"></li>\n  <li class=\"dom-explosion-item dei-9\"></li>\n  <li class=\"dom-explosion-item dei-10\"></li>\n  <li class=\"dom-explosion-item dei-11\"></li>\n  <li class=\"dom-explosion-item dei-12\"></li>\n  <li class=\"dom-explosion-item dei-13\"></li>\n  <li class=\"dom-explosion-item dei-14\"></li>\n  <li class=\"dom-explosion-item dei-15\"></li>\n  <li class=\"dom-explosion-item dei-16\"></li>\n</ul>\n";

/***/ },
/* 10 */
/***/ function(module, exports) {

	module.exports = "<style>\n.us-against-them {\n    opacity: 0;\n}\n</style>\n\n<div class=\"us-against-them\">\n\t<div class=\"table\">\n\t  <div class=\"table-center\">\n\t    <div class=\"display-4 text-centered\">Feels like it's us against them...</div>\n\t  </div>\n\t</div>\n</div>";

/***/ },
/* 11 */
/***/ function(module, exports) {

	module.exports = "<style>\n/*#intro {\n  position: fixed;\n  top: 15vh;\n  left: 10%;\n  width: 80%;\n  color: #fff;\n  text-align: center;\n  text-transform: uppercase;\n}*/\n</style>\n<div class=\"intro\">\n\t<div class=\"table \">\n  \t\t<div class=\"table-center\">\n    \t\t<div class=\"display-1 text-centered\">For the best user experience, please plug in headphones.<br></br>\n    \t\tThis is an interactive experience. All sources and quotes are real links.<br></br>\n    \t\tScroll down to begin. Keep scrolling to continue.</div>\n  \t\t</div>\n\t</div>\n</div>\n";

/***/ },
/* 12 */
/***/ function(module, exports) {

	module.exports = "<style>\n  .table input {\n    font-size: 6.5vw;\n    width: 5vw;\n    background: black;\n    border: none;\n    color: white;\n    font-weight: bold;\n  }\n  .left-align .quran-read {\n    text-align: left;\n  }\n  .calculator {\n    background: black;\n    width: 50vw;\n    margin: 0 auto;\n    padding: 2vw;\n    opacity: 0;\n  }\n  #isisafterlifefallacy .quote {\n    font-style: italic;\n  }\n  .equals {\n    width: 95%;\n    float: right;\n    border: 0.2vw solid\n  }\n  .text-right {\n    text-align: right;\n  }\n  .text-bold {\n    font-weight: 700;\n  }\n</style>\n\n<div class=\"table\">\n  <div class=\"table-center\" style=\"width:50%\">\n    <div class=\"display-2 premise text-bold\">ISIS may kill innocent people indiscriminately...</div><br><br>\n    <div class=\"display-2 conclusion text-bold\">Have they even imagined how haram (sinful) that is?</div>\n    <div class=\"display-1 emphasis conclusion\">  <strong>...whoever kills a soul ... it is as if he had slain mankind entirely.</strong></div><span class=\"quote-source conclusion\"><a href=\"http://quran.com/5/32\">Qur'an 5:32</a></span>\n  </div>\n  <div class=\"table-center\" style=\"width:50\">\n    <div class=\"display-3 text-right calculator\">\n      If you've murdered <input type=\"number\" id=\"murdernumber\" value=\"1\" min=\"1\" size=\"2\" /></strong>\n      <br > * <span>7 billion people</span><br >\n      <hr class=\"equals\">\n      The weight of murdering <br> <strong><span id=\"murdertotal\"></span> people.</strong></div>\n  </div>\n</div>\n\n<!-- TODO: Move to a new script. -->\n\n<script>\n  $(function() {\n\n    var POPULATION_TOTAL = 7000000000;\n\n    // initialiaze\n    updateMurderCalculator();\n\n    $(\"#murdernumber\").on('change', function() {\n      updateMurderCalculator()\n    });\n\n    $(\"#murdernumber\").on('scroll', function() {\n      console.log('blur')\n      $(this).blur();\n    });\n\n    function updateMurderCalculator() {\n      var murdernumber = $(\"#murdernumber\").val();\n      var murderTotal  = murdernumber * POPULATION_TOTAL;\n      render(murderTotal);\n    }\n\n    function render(murderTotal) {\n      $('#murdertotal').html(murderTotal);\n    }\n\n  });\n</script>\n";

/***/ },
/* 13 */
/***/ function(module, exports) {

	module.exports = "  <div class=\"table\">\n    <div class=\"table-center\" style=\"width:50%\">\n      <h1 class=\"premise\">ISIS may believe the Apocalypse is near....</h1><br /><br />\n      <h1 class=\"conclusion\">Have they consulted the Qur’an on this matter?</h1>\n    </div>\n    <div class=\"table-center\" style=\"width:50\">\n      <h2 class=\"quran-read quran-hidden\">\n        They ask thee of the (destined) Hour, when will it come to port. Say: <strong>Knowledge thereof is with my Lord only. He alone will manifest it at its proper time...</strong><span class=\"quote-source\"><a href=\"http://quran.com/7/187\">Qur'an 7:187</a></span><br><br>\n         <strong>To Him [alone]</strong> is attributed  <strong>knowledge of the Hour.</strong><span class=\"quote-source\"><a href=\"http://quran.com/41/47\">Quran 41:47</a></span>\n      </h2>\n    </div>\n  </div>\n";

/***/ },
/* 14 */
/***/ function(module, exports) {

	module.exports = "<style>\n  .left {\n    width: 40vw;\n  }\n\n  .newssource-hor,\n  greyzone-src {\n    max-height: 40vh;\n    box-shadow: 0 1vw 2vw rgba(0, 0, 0, 0.6);\n  }\n\n  #isisbankrupt .newsources {\n    position: absolute;\n    top: 35vh;\n    width: 230vw;\n    height: 50vh;\n    /*overflow: hidden;*/\n    transform: translateX(250%);\n  }\n\n  .hide-later {\n    opacity: 1;\n  }\n\n  #isisbankrupt .newsources img {\n    display: inline;\n    margin: 3vw;\n  }\n\n  #isisbankrupt .newsource-hor {\n    display: inline;\n    opacity: 1;\n  }\n\n  #isisbankrupt .conclusion {\n    opacity: 0;\n  }\n\n  #isisbankrupt .text-content {\n    margin: 3vw;\n  }\n\n  .black-zone {\n    background: black;\n    width: 100vw;\n    height: 100vh;\n  }\n\n</style>\n<div class=\"grey-zone table\">\n  <div class=\"black-zone\">\n    <div class=\"display-4  text-content\">\n      ISIS is bankrupt as an ideology…\n      <br>\n      <br>\n      <span class=\"conclusion\">but they are cunning with strategy.</span>\n    </div>\n    <div class=\"newsources\">\n      <a href=\"http://www.nytimes.com/2015/06/13/world/middleeast/isis-is-winning-message-war-us-concludes.html?_r=0\"><img class=\"newssource-hor\" src=\"./img/isis-strategy-social.png\"></a>\n      <a href=\"http://money.cnn.com/2015/12/06/news/isis-funding/\"><img class=\"newssource-hor\" src=\"./img/isis-strategy-billions.png\"></a>\n      <a href=\"http://money.cnn.com/2015/12/06/news/isis-funding/\"><img class=\"newssource-hor\" src=\"./img/isis-strategy-flow.png\"></a>\n      <a href=\"http://www.washingtontimes.com/news/2016/jan/27/islamic-states-cyber-arm-seeks-revenge-hackers-dea/\"><img class=\"newssource-hor\" src=\"./img/isis-strategy-hackers.png\"></a>\n      <a href=\"http://www.theatlantic.com/international/archive/2015/10/war-isis-us-coalition/410044/\"><img class=\"newssource-hor\" src=\"./img/isis-strategy-humanity.png\"></a>\n      <a href=\"https://www.opendemocracy.net/nafeez-ahmed/isis-wants-destroy-greyzone-how-we-defend\"><img class=\"newssource-hor greyzone-src\" src=\"./img/isis-strategy-greyzone.png\"></a>\n    </div>\n  </div>\n</div>\n</div>\n";

/***/ },
/* 15 */
/***/ function(module, exports) {

	module.exports = "<style>\n  #isisfightmisquote .premise,\n  #isisfightmisquote .conclusion\n   {\n     position: absolute;\n     width: 40vw;\n     bottom: 40vh;\n   }\n</style>\n<div class=\"table\">\n  <div class=\"table-center\" style=\"width:50%\">\n    <h1 class=\"premise\">ISIS may quote the Qur'an...</h1>\n    <h1 class=\"conclusion\">But does ISIS read the Qur'an?</h1>\n  </div>\n  <div class=\"table-center\" style=\"width:50\">\n    <h2 class=\"quran-read\">\n      <span class=\"quran-hidden\">Fight in the cause of Allah <strong>against those who fight you</strong>, and <strong>do not commit aggression.</strong> <span class=\"quote-source\"><a href=\"http://quran.com/2/190\">Quran 2:190</a></span><br><br></span>\n      Kill them, wherever you may find them! <span class=\"quote-source\"><a href=\"http://quran.com/2/191\">Qur'an 2:191</a></span><br><br>\n      <span class=\"quran-hidden\">...if they cease, <strong>let there be no hostility except against oppressors</strong>. <span class=\"quote-source\"><a href=\"http://quran.com/2/193\">Quran 2:193</a></span></span>\n    </h2>\n  </div>\n</div>\n";

/***/ },
/* 16 */
/***/ function(module, exports) {

	module.exports = "They has a simple objective they’ve stated.\n";

/***/ },
/* 17 */
/***/ function(module, exports) {

	module.exports = "<style>\n  #isiswantstodivide .anim-2 {\n    opacity: 0;\n  }\n\n  #isiswantstodivide .display-4 {\n    background: black;\n    display: inline-block;\n    padding: 0.5vw;\n  }\n  .color-zone {\n    position: absolute;\n    width: 100vw;\n    height: 100vh;\n  }\n  .zones {\n    height: 100vh;\n  }\n  .violent-zones {\n    width: 10vw;\n    position: relative;\n    z-index: 2;\n  }\n  .grey-zone {\n    background: #747B81\n  }\n  .white-zone {\n    background: white;\n    float:left;\n  }\n  .black-zone {\n    background: black;\n    float:right;\n  }\n  #isiswantstodivide .display-4{\n    position: relative;\n    z-index: 3;\n  }\n</style>\n<div class=\"color-zone\">\n  <div class=\"zones black-zone violent-zones\"></div>\n  <div class=\"zones white-zone violent-zones\"></div>\n</div>\n<div class=\"table grey-zone\">\n  <div class=\"table-center\">\n    <div class=\"display-4 anim-2\">They want to divide us all</div><br />\n    <div class=\"display-4 anim-2\">And start another great war.</div><br /><br />\n    <div class=\"display-4 anim-1\">We won't let that happen.</div>\n  </div>\n</div>\n";

/***/ },
/* 18 */
/***/ function(module, exports) {

	module.exports = "<style>\n  .left {\n    width: 40vw;\n  }\n  .newssource {\n    max-height: 40vh;\n    display: block;\n    box-shadow: 0 1vw 2vw rgba(0,0,0,0.6);\n    margin-bottom: 5vh;\n  }\n  .newsources {\n    position: absolute;\n    top: 5vh;\n    right: 5vh;\n    width: 45vw;\n    height: 80vh;\n    /*overflow: hidden;*/\n    transform: translateY(80%);\n  }\n  .newsources img {\n    max-width: 40vw;\n  }\n</style>\n<div class=\"table\">\n  <div class=\"table-center\">\n  <div class=\"display-4 left\">It isn’t easy being Muslim anywhere… </div>\n  <div class=\"newsources\">\n    <a target=\"_blank\" href=\"http://content.time.com/time/covers/0,16641,20100830,00.html\"><img class=\"newssource\" src=\"./img/hatecrime-america.jpg\" ></a>\n    <a target=\"_blank\" href=\"http://america.aljazeera.com/articles/2015/12/9/us-muslims-experience-surge-in-islamophobic-attacks.html\"><img class=\"newssource\" src=\"./img/hatecrime-america2.png\" ></a>\n    <a target=\"_blank\" href=\"http://www.inquisitr.com/2610717/hate-crime-string-of-anti-muslim-attacks-hit-canada.html\"><img class=\"newssource\" src=\"./img/hatecrime-canada.png\" ></a>\n    <a target=\"_blank\" href=\"http://america.aljazeera.com/articles/2015/2/17/threats-to-muslim-american-community-intensifies-after-chapel-hill-shooting.html\"><img class=\"newssource\" src=\"./img/hatecrime-chapelhill.png\" ></a>\n    <a target=\"_blank\" href=\"http://www.telegraph.co.uk/news/worldnews/europe/france/12075018/Hate-crimes-against-Muslims-and-Jews-soar-in-France.html\"><img class=\"newssource\" src=\"./img/hatecrime-france.png\" ></a>\n    <a target=\"_blank\" href=\"https://www.washingtonpost.com/world/europe/religious-liberties-under-strain-for-muslims-in-france/2015/11/22/83054c06-912f-11e5-befa-99ceebcbb272_story.html\"><img class=\"newssource\" src=\"./img/hatecrime-france2.png\" ></a>\n    <a target=\"_blank\" href=\"http://losangeles.cbslocal.com/2015/12/13/2-mosques-in-hawthorne-vandalized-with-graffiti/\"><img class=\"newssource\" src=\"./img/hatecrime-grenadegraffiti.png\" ></a>\n    <a target=\"_blank\" href=\"http://ktla.com/2015/12/11/possible-hate-crime-investigated-after-man-pulls-out-knife-on-muslim-woman-in-chino-hills-sheriffs-department/\"><img class=\"newssource\" src=\"./img/hatecrime-knife.png\" ></a>\n    <a target=\"_blank\" href=\"http://www.cnn.com/2015/12/12/us/california-mosque-fire/\"><img class=\"newssource\" src=\"./img/hatecrime-mosquefire.png\" ></a>\n    <a target=\"_blank\" href=\"http://www.foxnews.com/transcript/2014/10/07/bill-oreilly-islam-destructive-force-world/\"><img class=\"newssource\" src=\"./img/hatecrime-oreilly.png\" ></a>\n    <a target=\"_blank\" href=\"http://www.nydailynews.com/news/national/muslim-ga-girl-class-gasped-teacher-bomb-joke-article-1.2463495\"><img class=\"newssource hidesource\" src=\"./img/hatecrime-studentbackpack.png\" ></a>\n    <a target=\"_blank\" href=\"http://time.com/4139476/donald-trump-shutdown-muslim-immigration/\"><img class=\"newssource hidesource\" src=\"./img/hatecrime-trump.png\" ></a>\n    <a target=\"_blank\" href=\"https://today.yougov.com/news/2015/12/11/two-thirds-republicans-back-trump-proposal/\"><img class=\"newssource trump\" src=\"./img/hatecrime-poll.png\" ></a>\n  </div>\n</div>\n</div>\n";

/***/ },
/* 19 */
/***/ function(module, exports) {

	module.exports = "\n\n<div class=\"table\">\n  <div class=\"table-center\">\n    <div class=\"display-3 text-centered\">While we may not agree on everything,</div>\n    <div class=\"display-3 text-centered\">we can agree on one thing:</div>\n    <div class=\"display-4 text-bold text-centered\">ISIS is murdering Islam's name</div>\n  </div>\n</div>\n\n\n<!--\nView of ISIS Overwhelmingly Negative (Pew bar graph)\nhttp://www.pewresearch.org/fact-tank/2015/11/17/in-nations-with-significant-muslim-populations-much-disdain-for-isis/ft_15-11-17_isis_views/\n -->\n";

/***/ },
/* 20 */
/***/ function(module, exports) {

	module.exports = "<div class=\"table\">\n  <div class=\"table-center\">\n    <div class=\"display-4 text-centered\">AND THAT’S GOT TO END.</div>\n  </div>\n</div>\n";

/***/ },
/* 21 */
/***/ function(module, exports) {

	module.exports = "<style>\n.first,.second, .third, .fourth {\n\topacity: 0\n}\n#likepeace .display-4 {\n\topacity: 1!important;\n\ttransform: translateY(30%);\n}\n\n\n#likepeace input {\n\tfont-size: 3vmin;\n\tbackground: #747B81;\n\tcolor: white;\n\tpadding: 2%;\n\twidth: auto;\n\tmargin: 0.5vmin 0;\n\twidth: 96%;\n}\n\n#likepeace label {\n\tcolor: #747B81;\n}\n\n#likepeace input[type=submit] {\n\tcolor: white;\n\tbackground: #3CA2CD;\n\twidth: auto;\n\tmargin-top: 2vmin\n}\n\n#likepeace label {\n\tdisplay: block;\n\tmargin: 0.2vmin 0.5vmin;\n\ttext-transform: uppercase;\n\tfont-weight: bold;\n\tfont-size: 2.5vmin;\n}\n\n#likepeace #mc_embed_signup {\n\twidth: 50vw;\n\tbackground: white;\n\tmargin: 0 auto;\n\tpadding: 2vmin;\n}\n\n#likepeace h2 {\n\tcolor: black;\n\tmargin-bottom: 2vmin\n}\n</style>\n<div class=\"table grey-zone\">\n\t\t<div class=\"table-center\">\n  \t\t<div class=\"display-4 text-centered\"><span class=\"first\">MUSLIMS</span> <span class=\"second\">AGAINST</span> <span class=\"third\">ISIS</span></div>\n\t\t\t<div class=\"fourth\">\n\n\t\t\t\t<!-- Begin MailChimp Signup Form -->\n\t\t\t\t<div id=\"mc_embed_signup\">\n\t\t\t\t<form action=\"//muslimsagainstisis.us12.list-manage.com/subscribe/post?u=9d2dd81ccb07b710593475421&amp;id=81a5f5250c\" method=\"post\" id=\"mc-embedded-subscribe-form\" name=\"mc-embedded-subscribe-form\" class=\"validate\" target=\"_blank\" novalidate>\n\t\t\t\t    <div id=\"mc_embed_signup_scroll\">\n\t\t\t\t\t<h2>Updates Soon. Subscribe Now.</h2>\n\t\t\t\t<div class=\"mc-field-group\">\n\t\t\t\t\t<label for=\"mce-EMAIL\">Email Address </label>\n\t\t\t\t\t<input type=\"email\" value=\"\" name=\"EMAIL\" class=\"required email\" id=\"mce-EMAIL\">\n\t\t\t\t</div>\n\t\t\t\t<div class=\"mc-field-group\">\n\t\t\t\t\t<label for=\"mce-FNAME\">First Name </label>\n\t\t\t\t\t<input type=\"text\" value=\"\" name=\"FNAME\" class=\"required\" id=\"mce-FNAME\">\n\t\t\t\t</div>\n\t\t\t\t<div class=\"mc-field-group\">\n\t\t\t\t\t<label for=\"mce-LNAME\">Last Name </label>\n\t\t\t\t\t<input type=\"text\" value=\"\" name=\"LNAME\" class=\"required\" id=\"mce-LNAME\">\n\t\t\t\t</div>\n\t\t\t\t\t<div id=\"mce-responses\" class=\"clear\">\n\t\t\t\t\t\t<div class=\"response\" id=\"mce-error-response\" style=\"display:none\"></div>\n\t\t\t\t\t\t<div class=\"response\" id=\"mce-success-response\" style=\"display:none\"></div>\n\t\t\t\t\t</div>    <!-- real people should not fill this in and expect good things - do not remove this or risk form bot signups-->\n\t\t\t\t    <div style=\"position: absolute; left: -5000px;\" aria-hidden=\"true\"><input type=\"text\" name=\"b_9d2dd81ccb07b710593475421_81a5f5250c\" tabindex=\"-1\" value=\"\"></div>\n\t\t\t\t    <div class=\"clear\"><input type=\"submit\" value=\"Subscribe\" name=\"subscribe\" id=\"mc-embedded-subscribe\" class=\"button\"></div>\n\t\t\t\t    </div>\n\t\t\t\t</form>\n\t\t\t\t</div>\n\n\t\t\t\t<!--End mc_embed_signup-->\n\n\t\t\t</div>\n\t\t</div>\n</div>\n";

/***/ },
/* 22 */
/***/ function(module, exports) {

	module.exports = "<div class=\"table\">\n  <div class=\"table-center\">\n    <div class=\"display-4 text-centered\">And we may be feeling many different emotions about the situation.</div>\n  </div>\n</div>\n";

/***/ },
/* 23 */
/***/ function(module, exports) {

	module.exports = "\n<div class=\"muslims-believe-individual-life grey-zone\">\n\t<div class=\"table \">\n  \t\t<div class=\"table-center\">\n    \t\t<div class=\"display-4 text-centered\">We are Muslims. Muslims that believe EVERY individual life is sacred.</div>\n  \t\t</div>\n\t</div>\n</div>\n";

/***/ },
/* 24 */
/***/ function(module, exports) {

	module.exports = "<style>\n.out-to-get-you {\n    opacity: 0;\n}\n</style>\n\n<div class=\"out-to-get-you\">\n\t<div class=\"table \">\n\t  <div class=\"table-center\">\n\t    <div class=\"display-4 text-centered\">...like everybody's out to get you...</div>\n\t  </div>\n\t</div>\n</div>";

/***/ },
/* 25 */
/***/ function(module, exports) {

	module.exports = "<style>\n  #reactionstoterror .display-4 {\n    background: black;\n    display: inline-block;\n    padding: 0.5vw;\n  }\n</style>\n<div class=\"video-background\">\n  <video loop >\n    <source src=\"img/RevisedWork2.mp4\" type=\"video/mp4\">\n  </video>\n</div>\n<div class=\"table\">\n    <div class=\"display-4 anim-1\">How do you feel about how people react to the attacks?</div><br /><br />\n</div>\n";

/***/ },
/* 26 */
/***/ function(module, exports) {

	module.exports = "<style>\n.something-to-prove {\n    opacity: 0;\n}\n</style>\n<div class=\"something-to-prove\">\n\t<div class=\"table \">\n  \t\t<div class=\"table-center\">\n    \t\t<div class=\"display-4 text-centered\">...like you have <strong>something to prove</strong>.</div>\n  \t\t</div>\n\t</div>\n</div>";

/***/ },
/* 27 */
/***/ function(module, exports) {

	module.exports = "\n<div class=\"we-are-coming grey-zone\">\n\t<div class=\"table \">\n  \t\t<div class=\"table-center\">\n    \t\t<div class=\"display-4 text-centered\">We are coming.</div>\n  \t\t</div>\n\t</div>\n</div>\n";

/***/ },
/* 28 */
/***/ function(module, exports) {

	module.exports = "\n<div class=\"we-are-not-afraid grey-zone\">\n\t<div class=\"table \">\n  \t\t<div class=\"table-center\">\n    \t\t<div class=\"display-4 text-centered\">We will do more. We will stop this false ideology. We are not afraid.</div>\n  \t\t</div>\n\t</div>\n</div>\n";

/***/ },
/* 29 */
/***/ function(module, exports) {

	module.exports = "<style>\n.wewillprotecteachother {\n    opacity: 0;\n}\n#wewillprotecteachother img {\n  max-width: 35vw;\n}\n#wewillprotecteachother .conclusion,\n#wewillprotecteachother .premise {\n  opacity: 0;\n}\n</style>\n<div class=\"table grey-zone\">\n  <div class=\"table-center\" style=\"width:50%\">\n    <div class=\"premise\">\n      <div class=\"display-2\">We will protect every individual life.</div>\n      <a href=\"http://learningenglish.voanews.com/content/kenyan-muslims-protect-christians-from-terrorist-attack/3114326.html\"><img src=\"./img/KenyaProtect2.png\"></a>\n    </div>\n  </div>\n  <div class=\"table-center\" style=\"width:45%\">\n    <h2 class=\"conclusion\">\n      <div class=\"display-2\">We will ask others to help protect ours.</div>\n      <a href=\"http://www.usatoday.com/story/news/nation-now/2015/12/22/iwillprotectyou-us-service-members-soothe-scared-muslim-girl/77748874/\"><img src=\"./img/IWillProtectYou.png\"></a>\n    </h2>\n  </div>\n</div>\n";

/***/ },
/* 30 */
/***/ function(module, exports) {

	module.exports = "<style>\n  #doyoufeelmuslim .anim-2 {\n    opacity: 0;\n  }\n  .video-background video {\n    width: 100vw;\n  }\n  .video-background {\n    position: fixed;\n    top: 0;\n    left: 0;\n  }\n  #whatislamichistoryprefers .display-4 a,\n  .islamic-inventions {\n    color: rgba(255,255,255,1);\n  }\n\n  .islamic-inventions {\n    opacity: 0;\n  }\n\n</style>\n<div class=\"video-background\">\n  <video loop>\n    <source src=\"img/tyson.mp4\" type=\"video/mp4\">\n  </video>\n</div>\n<div class=\"table\">\n  <div class=\"table-center\">\n    <div class=\"display-4 anim-1\"><a href=\"https://www.youtube.com/watch?v=WZCuF733p88\">Has ISIS forgotten the best of what Muslims have done??</a></div>\n    <div class=\"display-3 islamic-inventions\">\n      <div>Algebra</div>\n      <div>Surgical Innovations</div>\n      <div>Modern Hospitals</div>\n      <div>Accredited Universities</div>\n      <div>The Guitar</div>\n    </div>\n  </div>\n</div>\n";

/***/ },
/* 31 */
/***/ function(module, exports) {

	module.exports = "\n              <!-- the Qur’an prefers learning (‘ilm) over murder.\n              Last time we checked, the Qur’an values scientific observation, experimental knowledge and rationality, over blind leadership following, as seen in 750 VERSES (10%) of the Qur’an. -->\n\n<div class=\"table\">\n  <div class=\"table-center\">\n    <div class=\"display-4 anim-1\">Last time we checked,</div><br /><br />\n    <div class=\"display-1 anim-1\">The Qur’an prefers forgiveness over punishment.</div><br /><br />\n    <div class=\"display-1 anim-1\">The Qur’an prefers peace over over war.</div><br /><br />\n    <div class=\"display-1 anim-1\">The Qur’an prefers knowledge over blindness.</div><br /><br />\n  </div>\n</div>\n";

/***/ },
/* 32 */
/***/ function(module, exports) {

	module.exports = "\n<div class=\"table\">\n  <div class=\"table-center\">\n    <div class=\"display-4 text-centered\">Who are they to declare who is Muslim and who is not? What is Islam and what is not?</div>\n  </div>\n</div>\n";

/***/ },
/* 33 */
/***/ function(module, exports) {

	module.exports = "\n<div class=\"table\">\n  <div class=\"table-center\">\n    <div class=\"display-4\">With all the hatred on the news.</div>\n  </div>\n</div>\n";

/***/ },
/* 34 */
/***/ function(module, exports, __webpack_require__) {

	var map = {
		"./battleofageneration/scene.json": 35,
		"./complicatedsituation/scene.json": 36,
		"./differentpractices/scene.json": 64,
		"./doyoufeelmuslim/scene.json": 37,
		"./explosion/scene.json": 38,
		"./feelingconfused/scene.json": 39,
		"./intro/scene.json": 40,
		"./isisafterlifefallacy/scene.json": 41,
		"./isisapocalypsemisquote/scene.json": 42,
		"./isisbankrupt/scene.json": 43,
		"./isisfightmisquote/scene.json": 44,
		"./isisobjective/scene.json": 45,
		"./isiswantstodivide/scene.json": 46,
		"./itisnteasy/scene.json": 47,
		"./itsgottoend/scene.json": 48,
		"./iwantmyislamback1/scene.json": 49,
		"./likepeace/scene.json": 50,
		"./mixedfeelings/scene.json": 51,
		"./muslimsbelieveindividuallife/scene.json": 52,
		"./outtogetyou/scene.json": 53,
		"./reactionstoterror/scene.json": 54,
		"./somethingtoprove/scene.json": 55,
		"./wearecoming/scene.json": 56,
		"./wearenotafraid/scene.json": 57,
		"./wewillprotecteachother/scene.json": 58,
		"./whatislamichistoryprefers/scene.json": 59,
		"./whatthequranprefers/scene.json": 60,
		"./whoarethey/scene.json": 61,
		"./withallthehatred/scene.json": 62,
		"./yetthatsokay/scene.json": 67
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
	webpackContext.id = 34;


/***/ },
/* 35 */
/***/ function(module, exports) {

	module.exports = [
		{
			"wrapper": "#battleofageneration",
			"duration": "50%",
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
			"duration": "120%",
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
/* 36 */
/***/ function(module, exports) {

	module.exports = [
		{
			"wrapper": "#complicatedsituation",
			"duration": "150%",
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
			"animations": [
				{
					"selector": ".display-4",
					"opacity": [
						2,
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
/* 37 */
/***/ function(module, exports) {

	module.exports = [
		{
			"wrapper": "#doyoufeelmuslim",
			"duration": "50%",
			"animations": [
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
/* 38 */
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
/* 39 */
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
						2
					]
				}
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
/* 40 */
/***/ function(module, exports) {

	module.exports = [
		{
			"wrapper": "#intro",
			"duration": "100%",
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
/* 41 */
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
/* 42 */
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
/* 43 */
/***/ function(module, exports) {

	module.exports = [
		{
			"wrapper": "#isisbankrupt",
			"duration": "25%",
			"animations": [
				{
					"selector": ".display-4",
					"opacity": [
						0,
						1
					]
				},
				{
					"selector": ".newsources",
					"translateX": [
						"300%"
					]
				}
			]
		},
		{
			"wrapper": "#isisbankrupt",
			"duration": "380%",
			"animations": [
				{
					"selector": ".conclusion",
					"opacity": [
						0,
						1
					]
				},
				{
					"selector": ".newsources",
					"translateX": [
						"300%",
						"-20%"
					],
					"opacity": [
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
					"selector": ".greyzone-src",
					"scale": [
						1,
						2
					],
					"translateY": [
						0,
						"-20%"
					]
				}
			]
		},
		{
			"wrapper": "#isisbankrupt",
			"duration": "100%",
			"animations": [
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
						0,
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
/* 44 */
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
/* 45 */
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
/* 46 */
/***/ function(module, exports) {

	module.exports = [
		{
			"wrapper": "#isiswantstodivide",
			"duration": "150%",
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
			"duration": "150%",
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
/* 47 */
/***/ function(module, exports) {

	module.exports = [
		{
			"wrapper": "#itisnteasy",
			"duration": "25%",
			"animations": [
				{
					"selector": ".display-4",
					"opacity": [
						0,
						1
					]
				},
				{
					"selector": ".newsources",
					"translateY": [
						"80%"
					]
				}
			]
		},
		{
			"wrapper": "#itisnteasy",
			"duration": "500%",
			"animations": [
				{
					"selector": ".newsources",
					"translateY": [
						"80%",
						"-450%"
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
						"-20%"
					],
					"translateY": [
						0,
						"10%"
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
/* 48 */
/***/ function(module, exports) {

	module.exports = [
		{
			"wrapper": "#itsgottoend",
			"duration": "150%",
			"animations": [
				{
					"selector": ".display-4",
					"opacity": [
						0,
						1
					]
				}
			]
		}
	];

/***/ },
/* 49 */
/***/ function(module, exports) {

	module.exports = [
		{
			"wrapper": "#iwantmyislamback1",
			"duration": "130%",
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
/* 50 */
/***/ function(module, exports) {

	module.exports = [
		{
			"wrapper": "#likepeace",
			"duration": "10%",
			"animations": [
				{
					"selector": ".display-4",
					"translateY": "30%"
				}
			]
		},
		{
			"wrapper": "#likepeace",
			"duration": "50%",
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
			"duration": "50%",
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
			"duration": "50%",
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
		}
	];

/***/ },
/* 51 */
/***/ function(module, exports) {

	module.exports = [
		{
			"wrapper": "#mixedfeelings",
			"duration": "80%",
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
			"wrapper": "#mixedfeelings",
			"duration": "150%",
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
/* 52 */
/***/ function(module, exports) {

	module.exports = [
		{
			"wrapper": "#muslimsbelieveindividuallife",
			"duration": "50%",
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
			"duration": "150%",
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
/* 53 */
/***/ function(module, exports) {

	module.exports = [
		{
			"wrapper": "#outtogetyou",
			"duration": "50%",
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
/* 54 */
/***/ function(module, exports) {

	module.exports = [
		{
			"wrapper": "#reactionstoterror",
			"duration": "150%",
			"animations": [
				{
					"selector": ".anim-1",
					"opacity": [
						0,
						1
					]
				}
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
						"0%",
						"-20%"
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
			"wrapper": "#somethingtoprove",
			"duration": "50%",
			"animations": [
				{
					"selector": ".something-to-prove",
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
			"animations": [
				{
					"selector": ".something-to-prove",
					"opacity": [
						2,
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
			"wrapper": "#wearecoming",
			"duration": "50%",
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
/* 57 */
/***/ function(module, exports) {

	module.exports = [
		{
			"wrapper": "#wearenotafraid",
			"duration": "50%",
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
			"duration": "120%",
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
/* 58 */
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
/* 59 */
/***/ function(module, exports) {

	module.exports = [
		{
			"wrapper": "#whatislamichistoryprefers",
			"duration": "310%",
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
			"animations": [
				{
					"selector": ".display-4",
					"opacity": [
						1,
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
						0
					]
				},
				{
					"selector": ".islamic-inventions",
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
/* 61 */
/***/ function(module, exports) {

	module.exports = [
		{
			"wrapper": "#whoarethey",
			"duration": "50%",
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
			"duration": "160%",
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
/* 62 */
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
/* 63 */
/***/ function(module, exports) {

	module.exports = "<div class=\"table\">\n  <div class=\"table-center\">\n    <div class=\"display-4 text-centered\">No one has the complete answer, and we all have different ways of practicing Islam.</div>\n  </div>\n</div>\n";

/***/ },
/* 64 */
/***/ function(module, exports) {

	module.exports = [
		{
			"wrapper": "#differentpractices",
			"duration": "80%",
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
			"wrapper": "#differentpractices",
			"duration": "150%",
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
/* 65 */
/***/ function(module, exports) {

	// https://github.com/IanLunn/scrollIntent/blob/master/js/scrollIntent-min.js
	var ScrollIntent=function(){"use strict";function a(a,b){for(var c in b)a[c]=b[c];return a}function b(a){var b={32:"space",38:"up",40:"down"},c=b[a];return void 0===c&&(c=!1),c}function c(a){a()}function d(a){switch(typeof a){case"number":return a;case"string":return parseFloat(a)/100}}function e(a){var b;return b=a===window?window.innerHeight||document.documentElement.clientHeight:a.clientHeight}function f(a,b,c,f,g){var h;switch(h=void 0!==g?g:a,void 0!==c&&(a=c),typeof b){case"number":var i=b;break;case"string":var j=d(b),i=e(a)*j}if(void 0!==f)switch(typeof f){case"number":i+=f;break;case"string":var k=d(f);i+=e(h)*k}return i}function g(a,b,c){var d;if(b){if(b.indexOf)return b.indexOf.call(b,a,c);for(d=b.length,c=c?0>c?Math.max(0,d+c):c:0;d>c;c++)if(c in b&&b[c]===a)return c}return-1}function h(a,b,c){return a.addEventListener?(a.addEventListener(b,c,!1),!0):a.attachEvent?a.attachEvent("on"+b,c):(b="on"+b,"function"==typeof a[b]&&(c=function(a,b){return function(){a.apply(this,arguments),b.apply(this,arguments)}}(a[b],c)),a[b]=c,!0)}function i(){var a,b;switch(typeof l.scrollYOffset){case"number":a=l.scrollYOffset;break;case"string":b=d(k.settings.scrollYOffset),a=e(k.element)*b}return a}function j(a,b){var c,d;return a===window?(d=document.body.scrollTop||document.documentElement.scrollTop||window.pageYOffset,c=d+b):c=a.scrollTop+b,isNaN(c)===!0&&(c=0),c}var k,l={namespace:"scrollIntent",scrollYOffset:0,scrollThreshold:250,callbacksPerActions:void 0,resetCallbacksPerActionOnDirectionChange:!0,resetDurationOnDirectionChange:!1,developerIndicators:!1},m=void 0,n=void 0,o=[];return ScrollIntent=function(b,c,d){k=this,k.element=b,k.actions=c,k.initComplete=function(){},k.scrolling=function(){},k.scrollingStopped=function(){},c instanceof Array||(k.actions=[c]),k.settings=a(l,d),k.numberOfActions=void 0===k.actions.length?1:k.actions.length,k.scrollY=void 0,k.scrollYPrev=void 0,k.isScrolling=!1,k.direction=void 0,k.scrollYStart=0,k.scrollAmount=0,k.keyPressesPerEvent=0,k.init()},ScrollIntent.prototype.init=function(){var a=this;return a.computedScrollYOffset=i(),a.scrollY=j(a.element,a.computedScrollYOffset),a.setUpActions(),a.setupDeveloperIndicators(!0,!0),a.element.onscroll=function(){a.scrollY=j(a.element,a.computedScrollYOffset),a.isScrolling===!1&&(a.isScrolling=!0,a.scrollYStart=a.scrollYPrev,a.startTime=+new Date,void 0===a.scrollMethod&&(a.scrollMethod="scrollbar"),a.scrollCheckTimer=setInterval(function(){a.scrollY===a.scrollYPrev?a.stopScrollCheck():a.whenScrolling(),a.scrollYPrev=a.scrollY},a.settings.scrollThreshold))},h(a.element,"mousewheel",function(){a.scrollMethod="mousewheel"}),h(a.element,"DOMMouseScroll",function(){a.scrollMethod="mousewheel"}),h(window,"onmousewheel",function(){a.scrollMethod="mousewheel"}),h(a.element,"mousedown",function(){a.mousedown=!0}),h(a.element,"mouseup",function(){a.mousedown=!1}),h(a.element,"keydown",function(c){c=c||window.event;var d=c.charCode||c.keyCode;a.scrollMethod=b(d),a.keyPressesPerEvent++}),window.onresize=function(){this.resizeTO&&clearTimeout(this.resizeTO),this.resizeTO=setTimeout(function(){c(function(){for(var b=0;b<a.numberOfActions;b++){var c=a.actions[b];c.computedWaypoint=f(a.element,c.waypoint,c.waypointRelativeTo,c.waypointOffset,c.waypointOffsetRelativeTo)}a.computedScrollYOffset=i(),a.setupDeveloperIndicators(!0,!0)})},200)},a.initComplete(a),!1},ScrollIntent.prototype.destroy=function(){return!1},ScrollIntent.prototype.checkConditions=function(){for(var a=this,b=0;b<a.numberOfActions;b++){var c=a.actions[b];c.computedWaypoint!==c.previousComputedWaypoint&&(c.noOfWaypointsTriggered=0),a.nowTime=+new Date,a.currentScrollDuration=a.nowTime-a.startTime,void 0!==c.computedWaypoint&&(a.scrollY>c.computedWaypoint?(c.waypointPassed=c.afterWaypoint===!1?!0:!1,c.afterWaypoint=!0):(c.waypointPassed=c.afterWaypoint===!0?!0:!1,c.afterWaypoint=!1)),void 0!==c.direction&&a.direction!==c.direction||void 0!==c.callbacksPerAction&&c.noOfCallbacksTriggered>c.callbacksPerAction||void 0!==c.minSpeed&&a.scrollAmount<=c.minSpeed||void 0!==c.maxSpeed&&a.scrollAmount>c.maxSpeed||void 0!==c.computedWaypoint&&(c.waypointPassed===!1||0===a.scrollAmount&&"scrollbar"===a.scrollMethod)||void 0!==c.minWaypoint&&a.scrollY<c.minWaypoint||void 0!==c.maxWaypoint&&a.scrollY>c.maxWaypoint||void 0!==c.scrollMethod&&-1===g(a.scrollMethod,c.scrollMethod)||void 0!==c.keyPressesPerEvent&&a.keyPressesPerEvent!==c.keyPressesPerEvent||void 0!==c.minDuration&&a.currentScrollDuration<c.minDuration||void 0!==c.maxDuration&&a.currentScrollDuration>c.maxDuration||void 0!==c.custom&&c.custom(a)!==!0||(c.previousComputedWaypoint=c.computedWaypoint,c.callback(a),c.noOfCallbacksTriggered++,c.noOfWaypointsTriggered=1,c.computedWaypoint=f(a.element,c.waypoint,c.waypointRelativeTo,c.waypointOffset,c.waypointOffsetRelativeTo),a.computedScrollYOffset=i(),a.setupDeveloperIndicators(!0,!0))}return!1},ScrollIntent.prototype.whenScrolling=function(){var a=this;if(a.newDirection=a.scrollY>a.scrollYPrev?"down":"up",void 0!==a.scrollYPrev){for(var b=0;b<a.numberOfActions;b++){var c=a.actions[b];c.computedWaypoint=f(a.element,c.waypoint,c.waypointRelativeTo,c.waypointOffset,c.waypointOffsetRelativeTo),a.computedScrollYOffset=i(),a.setupDeveloperIndicators(!0,!0)}if(a.direction!==a.newDirection){if(a.settings.resetCallbacksPerActionOnDirectionChange===!0){for(var b=0;b<a.numberOfActions;b++)a.actions[b].noOfCallbacksTriggered=1,a.actions[b].noOfWaypointsTriggered=0;a.scrollYStart=a.scrollYPrev}a.settings.resetDurationOnDirectionChange===!0&&(a.startTime=+new Date)}a.direction=a.newDirection,a.checkConditions(),a.scrollAmount=Math.round(Math.abs(a.scrollY-a.scrollYPrev))}return a.scrolling(a),!1},ScrollIntent.prototype.stopScrollCheck=function(){var a=this;clearInterval(a.scrollCheckTimer),a.isScrolling=!1,a.scrollAmount=0,a.scrollMethod=void 0,a.keyPressesPerEvent=0;for(var b=0;b<a.numberOfActions;b++){var c=a.actions[b];c.noOfCallbacksTriggered=1,c.noOfWaypointsTriggered=0}return a.scrollingStopped(a),!1},ScrollIntent.prototype.setupDeveloperIndicators=function(a,b){var c=this;if(l.developerIndicators===!0){var d="",e="";if(void 0!==m&&m.parentNode.removeChild(m),a===!0){if(0!==o.length)for(var f=o.length,g=0;f>g;g++)o[g].parentNode.removeChild(o[g]);for(var g=0;g<c.numberOfActions;g++)if(void 0!==c.actions[g].computedWaypoint){var h=g+1;d+="."+l.namespace+"-waypoint"+h+"{position: absolute; z-index: 99999; top:"+c.actions[g].computedWaypoint+"px; border: red solid 2px; left: 0; right: 0;}."+c.settings.namespace+"-waypoint"+h+':after{position: absolute; top: 0; text-align: center; width: 200px; height: 20px; content: "ScrollIntent: Waypoint '+h+'"; background: black; background: rgba(0,0,0,.8); color: white; padding: 12px; left: 20px; border: none;}',o[g]=document.createElement("div"),o[g].className=c.settings.namespace+"-waypoint"+h+" "+c.settings.namespace+"-indicator",document.body.appendChild(o[g])}}b===!0&&(e="."+c.settings.namespace+"-scrolly{position: fixed; z-index: 99999; top: "+c.computedScrollYOffset+"px; border: blue solid 2px; left: 0; right: 0;}",void 0!==n&&n.parentNode.removeChild(n),n=document.createElement("div"),n.className=c.settings.namespace+"-scrolly "+c.settings.namespace+"-indicator",document.body.appendChild(n)),m=document.createElement("style");var i=d+e;m.className=c.settings.namespace+"-indicator-styles",m.type="text/css",m.styleSheet?m.styleSheet.cssText=i:m.appendChild(document.createTextNode(i));var j=document.head||document.getElementsByTagName("head")[0];j.appendChild(m)}return!1},ScrollIntent.prototype.setUpActions=function(){for(var a=this,b=0;b<a.numberOfActions;b++){var c=a.actions[b];c.noOfCallbacksTriggered=0,c.noOfWaypointsTriggered=0,c.computedWaypoint=f(a.element,c.waypoint,c.waypointRelativeTo,c.waypointOffset,c.waypointOffsetRelativeTo),c.afterWaypoint=a.scrollY>c.computedWaypoint?!0:!1,void 0===c.scrollMethod||c.scrollMethod instanceof Array||(c.scrollMethod=[c.scrollMethod])}return!1},ScrollIntent}();

	module.exports.init = function() {

	    var PLAY_SPEED = 14;

	    var isPlaying = false;
	    var isPlayingInterval;
	    var bodyHeight = $('body').height();
	    var na=0;

	    $("#togglePlay").on('click', function(e) {
	      console.log("CLICK");
	      if(isPlaying) { pause() } else { play() }
	    });

	    $('body').on('keyup', function(e) {
	      console.log("KEYUP");
	      if(e.keyCode !== 80 || e.keyCode !== 32) return false;

	      if (isPlaying) { pause() } else { play() }
	    });

	    function play() {
	      console.log("PLAY")
	      na = $(window).scrollTop();

	      isPlayingInterval = setInterval(function() {
	        $("html, body").animate({ scrollTop: na }, 0);
	        na = na+PLAY_SPEED;
	        if(na >= bodyHeight) {
	          pause();
	        }
	      }, 16);

	      $("#togglePlay").removeClass('fa-play').addClass('fa-pause');
	      isPlaying = true;
	    }

	    function pause() {
	      console.log("PAUSE");
	      clearInterval(isPlayingInterval);
	      $("#togglePlay").removeClass('fa-pause').addClass('fa-play');
	      isPlaying = false;
	    }

	};


/***/ },
/* 66 */
/***/ function(module, exports) {

	module.exports = "<div class=\"table\">\n  <div class=\"table-center\">\n    <div class=\"display-4 text-centered\">But that's okay.</div>\n  </div>\n</div>\n";

/***/ },
/* 67 */
/***/ function(module, exports) {

	module.exports = [
		{
			"wrapper": "#yetthatsokay",
			"duration": "80%",
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
			"wrapper": "#yetthatsokay",
			"duration": "150%",
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