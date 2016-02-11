module.exports.convertAllPropsToPx = function(keyframes, windowWidth, windowHeight) {
  var i, j, k;
  for(i=0;i<keyframes.length;i++) { // loop keyframes
    keyframes[i].duration = convertPercentToPx(keyframes[i].duration, 'y', windowWidth, windowHeight);
    for(j=0;j<keyframes[i].animations.length;j++) { // loop animations
      Object.keys(keyframes[i].animations[j]).forEach(function(key) { // loop properties
        var value = keyframes[i].animations[j][key];
        if(key !== 'selector') {
          if(value instanceof Array) { // if its an array
            for(k=0;k<value.length;k++) { // if value in array is %
              if(typeof value[k] === "string") {
                if(key === 'translateY') {
                  value[k] = convertPercentToPx(value[k], 'y', windowWidth, windowHeight);
                } else {
                  value[k] = convertPercentToPx(value[k], 'x', windowWidth, windowHeight);
                }
              }
            }
          } else {
            if(typeof value === "string") { // if single value is a %
              if(key === 'translateY') {
                value = convertPercentToPx(value, 'y', windowWidth, windowHeight);
              } else {
                value = convertPercentToPx(value, 'x', windowWidth, windowHeight);
              }
            }
          }
          keyframes[i].animations[j][key] = value;
        }
      });
    }
  }
  return keyframes;
};



function convertPercentToPx(value, axis, windowWidth, windowHeight) {
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


module.exports.buildPage = function(keyframes, wrappers) {
  var i, j, k, initFrames = [], bodyHeight = 0;
  for(i=0;i<keyframes.length;i++) { // loop keyframes
      if(keyframes[i].focus) {
          if(bodyHeight !== initFrames[initFrames.length - 1]) {
            initFrames.push(bodyHeight);
          }
      }
      bodyHeight += keyframes[i].duration;
      if($.inArray(keyframes[i].wrapper, wrappers) == -1) {
        wrappers.push(keyframes[i].wrapper);
      }
      for(j=0;j<keyframes[i].animations.length;j++) { // loop animations
        Object.keys(keyframes[i].animations[j]).forEach(function(key) { // loop properties
          var value = keyframes[i].animations[j][key];
          if(key !== 'selector' && value instanceof Array === false) {
            var valueSet = [];
            valueSet.push(getDefaultPropertyValue(key), value);
            value = valueSet;
          }
          keyframes[i].animations[j][key] = value;
        });
      }
  }

  return {
    frameFocus: initFrames,
    bodyHeight: bodyHeight,
    wrappers: wrappers
  }
};

module.exports.getDefaultPropertyValue = getDefaultPropertyValue;

function getDefaultPropertyValue(property) {
  switch (property) {
    case 'translateX':
      return 0;
    case 'translateY':
      return 0;
    case 'scale':
      return 1;
    case 'rotate':
      return 0;
    case 'opacity':
      return 1;
    default:
      return null;
  }
}
