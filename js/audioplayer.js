const looper = require('./looper.js');

module.exports.next = next;

module.exports.config = (config) => {
  looper.config(config)
};

module.exports.play = () => {
  looper.play()
};


function next(id) {
  looper.next(id);
}
