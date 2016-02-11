'use strict';
const Howl = require('howler').Howl;

var loops = {};
var loop;

module.exports.config = (config) => {
  loops = config.map(c => {
    let audioConfig = {
      src: ['media/'+ c.audio.src +'.mp3'],
      html5: true,
      volume: 0
    }
    return {
      'id': c.id,
      'vol': c.audio.max,
      'sound1': new Howl(audioConfig),
      'sound2': new Howl(audioConfig)
    }
  }).reduce( (prev,next) =>  {prev[next.id] = next; return prev;}, {})
}

module.exports.next = (id) => {
  // console.log('next', id)
  loop = loops[id];
  // console.log(loop);
}

module.exports.pause = (config) => {

}

module.exports.play = (config) => {
  looper();
}

module.exports.stop = (config) => {

}

function looper() {

  'use strict';
  // console.log('looper', loop.sound1)
  let fadePercent = (loop.sound1.duration() > 5)  ? 0.01 : 0.015; // 2% or 1% depending on if sound is over 5 seconds
  let faderate =  1 - fadePercent;
  let duration = loop.sound1.duration() * 1000 * (1 - fadePercent);
  let volume = loop.vol;
  // console.log(faderate, fadePercent, duration, volume);

  loop.sound1.play();
  loop.sound1.fade(0,volume, duration * fadePercent);

  setTimeout(() => {
    loop.sound1.fade(volume,0, duration * fadePercent);
  }, duration * faderate );

  setTimeout(() => {
    loop.sound2.play();
    loop.sound2.fade(0,volume, duration * fadePercent);
  }, duration * faderate);

  setTimeout(() => {
    loop.sound2.fade(volume,0, duration * fadePercent);
    looper();
  }, duration * 2 * faderate);

}

module.exports.loop = looper;
