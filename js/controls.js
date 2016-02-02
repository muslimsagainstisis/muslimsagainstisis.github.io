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
