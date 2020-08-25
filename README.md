# Icon Font Generator CLI

This command line tool lets you convert svg image files under the source folder to webfont
(eot, svg, ttf, woff and woff2) with 2-layer icon support 

This tool is built on top of [Fontello](https://github.com/fontello/fontello/).
and [Fontello-Offline-CLI](https://github.com/luchenatwork/Fontello-Offline-CLI).


## Usage
```
$ node fg --help
$ node fg --version
$ node fg -p "src/folder/path" -n thefontname -a "font author" -o "destination/folder/path"
```