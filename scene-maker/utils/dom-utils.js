module.exports.getScrollTops = function() {
  return {
    scrollTop: Math.floor($(window).scrollTop())
    relativeScrollTop: scrollTop - prevKeyframesDurations;
  }
}
