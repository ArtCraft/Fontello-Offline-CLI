#!/usr/bin/env node

'use strict';

const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const SvgPath = require('svgpath');
const svgSplit = require('./svg-split');
const ArgumentParser = require('argparse').ArgumentParser;
const fontWorker = require('./font-worker');

const parser = new ArgumentParser({
  version: require('./package.json').version,
  addHelp: true,
  description: 'Fontello Batch CLI'
});
parser.addArgument(['-s', '--src'], {
  help: 'Source SVG Files Path, e.g., "C:\\Svg". default: "_icons"',
  required: false
});
parser.addArgument(['-c', '--config'], {
  help: 'Path to config file, e.g., "path/conf.json". All paths inside config file are relative to config file dir',
  required: false
});
parser.addArgument(['-n', '--name'], {
  help: 'Font Name, e.g., "My Font". default value: "untitled"',
  required: false
});
parser.addArgument(['-a', '--author'], {
  help: 'Font Owner, e.g., SomeCompany, "Smith John"',
  required: false
});
parser.addArgument(['-o', '--output'], {
  help: 'Destination Path to save compiled fonts. default value: "_font"',
  required: false
});

const args = parser.parseArgs();

//defaults
const cfg = {
  src: "_icons",
  output: "_font",
  name: "untitled",
  author: "Unknown Author",
  preview_size: 48,
  default_size: 48,

  css_prefix_text: '',
  css_use_suffix: false,
  hinting: false,
  // units_per_em: 1000,
  // ascent: 850,
  units_per_em: 960,
  ascent: 480,
};

// read config file data
if (fs.existsSync(args.config)) {
  const confpath = path.dirname(args.config);// relative path to folder containing config.json
  //var absoluteConfPath = path.resolve(confpath); // absolute path to folder containing config.json

  Object.assign(cfg,  JSON.parse(fs.readFileSync(args.config, 'utf8')));
  cfg.src = path.resolve(confpath, cfg.src);
  cfg.output = path.join(confpath, cfg.output);
}

// read cli vars
if(args.output) cfg.output = args.output;
if(args.name) cfg.name = args.name;
if(args.src) cfg.src = args.src;
if(args.author)  cfg.author = args.author;

cfg.copyright = 'Copyright © ' + cfg.author;
cfg.fontname = String(cfg.name).replace(/[^A-Za-z0-9\-_]+/g, '-').toLowerCase();


let allocatedRefCode = 0xe800;
const svgFilesPath = cfg.src;

const dstFilesPath = cfg.output;
//const dstFilesPath = args.output ?  args.output : "webfonts" ;

const svgFiles = filterSvgFiles(svgFilesPath);
const glyphs = [];
svgFiles.forEach(createGlyph());

cfg.glyphs = glyphs;


// console.log(cfg);
// console.log(glyphs);


const taskInfo = {
  fontId: uid(),
  cfg: cfg,
  builderConfig: fontConfig(),
  tmpDir: path.join(path.resolve(), dstFilesPath),
  timestamp: Date.now(),
  result: null
};

fontWorker(taskInfo).then(_ => {
  console.log('Font generated successfully!');
}).catch(o=>{
  console.log("======== error ========");
  console.log(o);
});



function fontConfig() {

  return {
    cfg: cfg,
    font: {
      fontname: cfg.fontname,
      fullname: cfg.name,
      familyname: cfg.name,
      copyright: cfg.copyright,
      ascent: cfg.ascent,
      descent: cfg.ascent - cfg.units_per_em,
      weight: 400
    },
    hinting: cfg.hinting !== false,
    meta: {
      columns: 4,
      css_prefix_text: cfg.css_prefix_text || '',
      css_use_suffix: Boolean(cfg.css_use_suffix)
    },
    glyphs: collectGlyphsInfo(),
    fonts_list: []
  };
}

// todo this method is wired it apples second transform to glyphs
function collectGlyphsInfo() {
  const result = [];
  const scale = cfg.units_per_em / 1000;

  cfg.glyphs.forEach(glyph => {
    const svgpath = require('svgpath');
    let sp, isLayer2=false;

    if (glyph.src === 'custom_icons') {
      if (!glyph.selected) return;

      sp = svgpath(glyph.svg.path)
        .scale(scale, -scale)
        .translate(0, cfg.ascent)
        .abs()
        .round(0)
        .rel();

      if( glyph.css.indexOf("@")!=-1 ){
        isLayer2=true;
        glyph.css=glyph.css.replace("@", '');
      }
      if(glyph.index==1)isLayer2=true;

      result.push({
        src: glyph.src,
        uid: glyph.uid,
        code: glyph.code,
        css: glyph.css,
        isLayer2:  isLayer2,
        width: +(glyph.svg.width * scale).toFixed(1),
        d: sp.toString(),
        segments: sp.segments.length
      });
    }
  });

  result.sort((a, b) => a.code - b.code);

  return result;
}
function createGlyph() {
  return function(svgFile) {
    const glyphName = path.basename(svgFile, '.svg')
      .replace(/\s/g, '-')
      .replace('---', '-')
      .replace('--', '-')
      .toLowerCase();
    const svgFileData = fs.readFileSync(svgFile, 'utf-8');

    // todo use colors from config
    let result = svgSplit(svgFileData, ["#515151","#ff8000"]);
    // console.log(splitResult.glyphs.length);

    if (result.error) {
      console.error(result.error);
      return;
    }

    result.glyphs.map( (g, index) => {
      const scale = 1000 / g.height;
      const svgPath = new SvgPath(g.d).translate(-g.x, -g.y).scale(scale).abs().round(0).toString();
      if (svgPath === '') {
        console.error(svgFile + ' has no path data!');
        return;
      }
      glyphs.push({
        //uid: uid(),
        css: glyphName,
        code: allocatedRefCode++,
        src: 'custom_icons',
        index: index,
        selected: true,
        svg: {
          path: svgPath,
          width: 1000
        }
      });

    });

  };
}

function uid() {
  return 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'.replace(/[x]/g, function() {
    return ((Math.random() * 16) | 0).toString(16);
  });
}

function filterSvgFiles(svgFolderPath) {
  const files = fs.readdirSync(svgFolderPath, 'utf-8');
  const svgArr = [];
  if (!files) {
    throw new Error(`Error! Svg folder is empty.${svgFolderPath}`);
  }

  for (const file in files) {
    if (
      typeof files[file] !== 'string' ||
      path.extname(files[file]) !== '.svg'
    ) {
      continue;
    }
    if (!~svgArr.indexOf(files[file])) {
      svgArr.push(path.join(svgFolderPath, files[file]));
    }
  }
  return svgArr;
}
