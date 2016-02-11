
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
    var percent = (rate * 100).toFixed(2);
    $videoIndicator.css({'width': percent + 'vw'});
    if(videoPlaying) {
      setTimeout( () => {loop()} , 41 )
    }
  })
}
