const state = require('../state.js');

module.exports = function(action) {
  switch(action) {
    case 'next':
      nextFocus();
      break;
    case 'previous':
      previousFocus();
      break;

    case 'focus:share':

    case 'scroll:down':
    case 'scroll:up':

    case 'volume:up':
    case 'volume:down':

    case 'music:up':
    case 'music:down':
    case 'music:pause':
    case 'music:play':

    case 'auto:play':
    case 'auto:pause':

    case 'video:play':
    case 'video:pause':

    case 'link:select':

    case 'followon:select':

    case 'region:switch':

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
