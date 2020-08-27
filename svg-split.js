'use strict';

const XMLDOMParser = require('xmldom').DOMParser;
const _ = require('lodash');
const SvgPath = require('svgpath');

let quietTags = {};
['desc', 'title', 'metadata', 'defs'].forEach(function(key) {
  quietTags[key] = true;
});






module.exports = function split(sourceXml, allowedColors) {
  // count colors
  // for each color flatten paths
  let error = null;
  let xmlDoc = new XMLDOMParser({
    errorHandler: {
      error(err) { error = err; },
      fatalError(err) { error = err; }
    }
  }).parseFromString(sourceXml, 'application/xml');

  if (error) {return {error: error}; }


  let svg = xmlDoc.getElementsByTagName('svg')[0];
  const colors = findAllFillColors(svg, []);

  let results = [];
  if( colors.includes(allowedColors[0]) && colors.includes(allowedColors[1]) ){
    results[0] = flatten(svg, allowedColors[0]);
    results[1] = flatten(svg, allowedColors[1]);
  }else{
    results[0] = flatten(svg);
  }
  //results.map(v =>  console.log(v.d));
  return {glyphs: results};
};




function flatten(svg, color){

  let result = {  d: '', width: 0, height: 0, x: 0, y: 0  };

  let coords = getCoordinates(svg);

  if (coords.error) {
    result.error = coords.error;
    return result;
  }

  result.d =processSVG(svg, '', '', color);
  result.width = coords.width;
  result.height = coords.height;
  result.x = coords.x;
  result.y = coords.y;
  return result;

}

function findAllFillColors(node, colors) {

  var guaranteed = true;
  _.each(node.childNodes, function(item) {
    if (item.nodeType !== 1) return;
    if (quietTags[item.nodeName]) return;

    // find new color
    const styleAttrVal = item.getAttribute('style')
    if(styleAttrVal){ // style attribute found
      const m = styleAttrVal.match(/fill:\s*([^\s;]+)[\s;]/i);
      if(m){// color found
        let c = m[1];
        if (!colors.includes(c)) colors.push(c); // add if wasn't found before
      }
    }
    //Parse nested tags
    if (item.nodeName === 'g') {
      colors = findAllFillColors(item, colors );
    }
  });
  return colors;
}

function processSVG(node, parentTransforms, path, color) {

  _.each(node.childNodes, function(item) {

    if (item.nodeType !== 1)  return;
    if (quietTags[item.nodeName])  return;

    var transforms = item.getAttribute('transform')
      ? parentTransforms + ' ' + item.getAttribute('transform')
      : parentTransforms;

    // Parse nested tags
    if (item.nodeName === 'g') {
      path = processSVG(item, transforms, path, color );
    }

    switch (item.nodeName) {
      case 'g': break;
      case 'path':

        // if color filtering enabled
        // skip path if fill color do not match
        if(color){
          const styleAttrVal = item.getAttribute('style')
          if(!styleAttrVal) break; // style attribute not found
          const m = styleAttrVal.match(/fill:\s*([^\s;]+)[\s;]/i);
          if(!m)  break; // color not found
          if (m[1] != color ) break; // color do not match
        }

        // flatten transforms and append path
        const d = item.getAttribute('d');
        path += new SvgPath(d).transform(transforms).toString();
        break;

      default: return; // do nothing with not supported nodes
    }


  });
  return path;
}

function getCoordinates(svg) {
  var viewBoxAttr = svg.getAttribute('viewBox');
  var viewBox = _.map((viewBoxAttr || '').split(/(?: *, *| +)/g), function( val ) {
    return parseFloat(val);
  });

  if (viewBoxAttr && viewBox.length < 4) {
    return {  error: new Error('Svg viewbox attr has less than 4 params') };
  }

  var attr = {};
  _.forEach(['x', 'y', 'width', 'height'], function(key) {
    var val = svg.getAttribute(key);

    if (val.length && val[val.length - 1] !== '%') {
      attr[key] = parseFloat(svg.getAttribute(key));
    }
  });

  if (viewBox[2] < 0 || viewBox[3] < 0 || attr.width < 0 || attr.height < 0) {
    return {
      error: new Error('Svg sizes can`t be negative')
    };
  }

  var result = {
    x: attr.x || 0,
    y: attr.y || 0,
    width: attr.width,
    height: attr.height,
    error: null
  };

  if (!viewBoxAttr) {
    if (result.width && result.height) {
      return result;
    }

    result.error = new Error(
      'Not implemented yet. There is no width or height'
    );

    return result;
  }

  if (!result.width && !result.height) {
    result.width = viewBox[2];
    result.height = viewBox[3];
    return result;
  }

  return result;
}