var Rx = require('rx');

var videoPlayer = require('./videoplayer.js');

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
        currentKeyframe =          0,
        frameFocus =               [],
        currentFocus =             0;


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
      scrollTop = Math.floor($window.scrollTop());
      windowHeight = $window.height();
      windowWidth = $window.width();
      convertAllPropsToPx();
      buildPage();
      buildScrollBarCenters();
    };

    var buildPage = function() {
      var i, j, k, initFrames = [];
      for(i=0;i<keyframes.length;i++) { // loop keyframes
          if(keyframes[i].focus) {
              if(bodyHeight !== initFrames[initFrames.length - 1]) {
                initFrames.push(bodyHeight);
              }
          }
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
      frameFocus = initFrames.map(function(i){
        return Math.floor(i);
      }).reduce(function(a,b){
        if (a.indexOf(b) < 0 ) a.push(b);
        return a;
      },[]);
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
    function buildScrollBarCenters() {
      frameFocus
        .map(function(center) { return (center / bodyHeight).toFixed(2) * 100 })
        .map(function(centerPercent) { return centerPercent + "vh" })
        .map(function(centerVh) {
          $("#experience-progress")
            .append('<div class="center-marker" style="top:'+ centerVh +'"></div>');
        });
    }
    var setScrollTops = function() {
      scrollTop = Math.floor($window.scrollTop());
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
        var $newVideo = $('video', keyframes[currentKeyframe].wrapper);

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
          $newVideo.animate({ volume: $newVideo.attr('max-volume') || 1 }, 300, 'swing');
          videoPlayer.start($newVideo);
        } else {
          videoPlayer.stop($newVideo);
        }

        currentWrapper = keyframes[currentKeyframe].wrapper;
      }
    };

    module.exports.action = function(action) {
      switch(action) {
        case 'next':
          nextFocus();
          break;
        case 'previous':
          previousFocus();
          break;
        default:
          break;
      }
    }
    function nextFocus() {
      var getScroll = getSlideLocation();
      console.log("NEXT FOCUS", getScroll, getScroll.length, frameFocus[getScroll[1]], frameFocus[getScroll[0]], scrollTop, frameFocus);
      if(getScroll.length === 1) {
        console.log("JUST ONE", frameFocus[getScroll[0] + 1])
        renderScroll(frameFocus[getScroll[0] + 1]);
      } else if(getScroll.length === 2) {
        console.log("TWO")
        renderScroll(frameFocus[getScroll[1]]);
      }
    }

    function previousFocus() {
      var getScroll = getSlideLocation();
      console.log("PREVIOUS FOCUS", getScroll, getScroll.length, frameFocus[getScroll[1]], frameFocus[getScroll[0] - 1], scrollTop);
      if(getScroll.length === 1) {
        console.log("JUST ONE", frameFocus[getScroll[0] - 1])
        renderScroll(frameFocus[getScroll[0] - 1]);
      } else if(getScroll.length === 2) {
        console.log("TWO");
        renderScroll(frameFocus[getScroll[0]]);
      }
    }

    function renderScroll(scroll) {
      console.log("RENDER", scroll, Math.floor($window.scrollTop()))
        $body.animate({ scrollTop: scroll }, 1500, 'linear');
    }

    function getSlideLocation() {
      setScrollTops();
      for(var x=1; x <= frameFocus.length; x++) {
        if(frameFocus[x] === scrollTop) {
          return [x];
        }
        if(scrollTop.between(frameFocus[x-1],frameFocus[x])) {
          return [x-1,x];
        }
      }
      return [0];
    }

    Number.prototype.between = function(a, b) {
      var min = Math.min.apply(Math, [a, b]),
        max = Math.max.apply(Math, [a, b]);
      return this > min && this < max;
    };

    /*  Helpers
    -------------------------------------------------- */

    var convertPercentToPx = function(value, axis) {
      if(typeof value === "string" && value.match(/%/g)) {
        if(axis === 'y') value = (parseFloat(value) / 100) * windowHeight;
        if(axis === 'x') value = (parseFloat(value) / 100) * windowWidth;
      }
      if(typeof value === "string" && value.match(/v/g)) {
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
