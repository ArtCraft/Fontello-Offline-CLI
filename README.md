# Icon Font Generator CLI

This command line tool lets you convert svg image files under the source folder to webfont
(eot, svg, ttf, woff and woff2) with 2-layer icon support 

This tool is built on top of [Fontello](https://github.com/fontello/fontello/).
Forked from [Fontello-Offline-CLI](https://github.com/luchenatwork/Fontello-Offline-CLI).

## Usage
```
$ node icon-font-generator-cli --version
$ node icon-font-generator-cli --help
$ node icon-font-generator-cli -s "src/path" -n thefontname -a "font author" -o "output/path"
$ node icon-font-generator-cli -c conf.json -w
```

## Font development
```bash
md [project_name]
cd [project_name]
npm init -y
npm i -D ArtCraft/Icon-Font-Generator-CLI
md _icons
touch conf.json
```

conf.json
```json
{
  "name": "icon",
  "src": "_icons",
  "output": "_output",
  "preview_size": 24,
  "default_size": 24,
  "author": "Unknown"
}
```

and add following to package.json
```json
  ...
  "scripts": {
    "watch": "node node_modules/icon-font-generator-cli -c conf.json -w",
    "build": "node node_modules/icon-font-generator-cli -c conf.json"
  },
  ....
```

put svg files under `_icons` folder

and run `npm run watch`

This will regenerate a font and open a preview page.
And each time you change something in `_icons` folder font going to be regenerated
and preview reloaded.

Enjoy.