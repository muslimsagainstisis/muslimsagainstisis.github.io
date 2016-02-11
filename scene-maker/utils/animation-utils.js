
module.exports.convertPercentToPx = function(value, axis, windowWidth, windowHeight) {
  if(typeof value === "string" && value.match(/%/g)) {
    if(axis === 'y') value = (parseFloat(value) / 100) * windowHeight;
    if(axis === 'x') value = (parseFloat(value) / 100) * windowWidth;
  }
  if(typeof value === "string" && value.match(/v/g)) {
    if(axis === 'y') value = (parseFloat(value) / 100) * windowHeight;
    if(axis === 'x') value = (parseFloat(value) / 100) * windowWidth;
  }
  return value;
};
