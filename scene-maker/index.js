'use strict';

const obscene = require('./ob-scene.js');
const controls = require('./user/controls.js');
const render = require('./render/index.js');

const sceneUtils = require('./utils/scene-utils.js');
const audioplayer = require('./render/audioplayer.js');

const sceneHtmlString = sceneUtils.renderHTML();
const sceneMotionMap = sceneUtils.getScenes();
let sceneAudioConfig =  sceneUtils.getAudioConfig();

audioplayer.config(sceneAudioConfig);

$(function() {
        init();
});

function init() {

  Pace.on('done', (e) => {

    var ua = navigator.userAgent;
    if (isTouchDevice()) {
      $('#unsupported').show();
      $(".container").hide();
      $(".loading").hide();

    } else {

      $('.container-inner').html(sceneHtmlString)

      obscene.init(sceneMotionMap)
      controls.init()

      $('.loading').delay(300).fadeOut()
      audioplayer.next('intro');
      audioplayer.play();


    }

  })

}

function isTouchDevice() {
  return 'ontouchstart' in window // works on most browsers
    || 'onmsgesturechange' in window // works on ie10
}
