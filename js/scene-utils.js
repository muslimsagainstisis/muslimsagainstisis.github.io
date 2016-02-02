// NOTE: This file relies heavily on webpack for requires of html and json config files.

// Constants
var SCENE_INDEX = require('json!../scenes/index.json');
var SCENE_CONTAINER_CSS_CLASS = 'wrapper';

/*
 * Generates an HTML string from scene.html files the scenes folder.
 * Creates a wrapper div that provides feedback.
 */
module.exports.renderHTML = function() {

  return SCENE_INDEX
    .map(function(sceneName) {
      return {
              html: require("html?attrs=false!../scenes/" + sceneName + "/scene.html"),
              name: sceneName
            }
    })
    .map(function(sceneObject) { // Create wrapper div for html
        var $wrapper = document.createElement('div');
        $wrapper.classList.add(SCENE_CONTAINER_CSS_CLASS);
        $wrapper.setAttribute('id', sceneObject.name);
        $wrapper.innerHTML = sceneObject.html;
        return $wrapper.outerHTML;
    })
    .reduce(function(prev, next) { // Concat to 1 html string
      return prev + next;
    }, '');

}

module.exports.getScenes = function() {

  return SCENE_INDEX
    .map(function(sceneName) { // get the scenes(which are in arrays)
      return require("json!../scenes/" + sceneName + "/scene.json")
    })
    .reduce(function(prev, current) { // flatten arrays by concating into a new array
      return prev.concat(current);
    }, []);

}
