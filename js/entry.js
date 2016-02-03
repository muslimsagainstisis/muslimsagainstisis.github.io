var animator = require('./picasso.js');
var controls = require('./controls.js');

var sceneUtils = require('./scene-utils.js');

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
