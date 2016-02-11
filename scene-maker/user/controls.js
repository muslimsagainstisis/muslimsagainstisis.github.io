const Kefir = require('kefir')

const obscene = require('../ob-scene.js')

module.exports.init = function() {

  var PLAY_SPEED = 10;

  var isPlaying = false;
  var isPlayingInterval;
  var bodyHeight = $('body').height();
  var na=0;

  const keyUpPressed = Kefir.fromEvents(document, 'keyup', function(e){
    e.preventDefault();
    return e;
  });

  const backKey = keyUpPressed
    .filter(e => e.keyCode === 38)
  const nextKey = keyUpPressed
    .filter(e => e.keyCode === 40)

  const toggleUpClicked = Kefir.fromEvents($("#toggleUp"), 'click')
  const toggleDownClicked = Kefir.fromEvents($("#toggleDown"), 'click')

  Kefir.merge([nextKey, toggleDownClicked])
    .onValue(e => {
      obscene.action('next')
    })

  Kefir.merge([backKey, toggleUpClicked])
    .onValue(e => {
      obscene.action('previous')
    })

  $("#togglePlay").on('click', function(e) {
    console.log("CLICK");
    if(isPlaying) { pause() } else { play() }
  })

  keyUpPressed
    .filter(e => e.keyCode === 80 || e.keyCode === 32)
    .onValue(e => {
      if (isPlaying) { pause() } else { play() }
    })

  function play() {
    console.log("PLAY")
    isPlayingInterval = setInterval(function() {
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
