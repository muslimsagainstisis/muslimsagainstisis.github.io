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
      var ua = navigator.userAgent;
      // if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile/i.test(ua))
        //  $('#unsupported').show();
      // else if (/Chrome/i.test(ua))
        init();
      // else
        //  $('#unsupported').show();
});

function init() {

  Pace.on('done', (e) => {

    $('.container-inner').html(sceneHtmlString)

    obscene.init(sceneMotionMap)
    controls.init()

    $('.loading').delay(300).fadeOut()
    audioplayer.next('intro');
    audioplayer.play();

  })

}
