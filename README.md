# resizer-stream

A streaming image resizer, for Node and the browser. Uses [pica](https://github.com/nodeca/pica)
to perform high quality image resizing, and supports options to resize proportionally, stretch,
fit, etc.

## Installation

    npm install resizer-stream


## Example

Here is an example that resizes a JPEG (check out the [jpg-stream](http://github.com/devongovett/jpg-stream) 
module for a streaming JPEG decoder and encoder).

```javascript
var resize = require('resizer-stream');

// scale the image proportionally to fit within a 300x300 square
fs.createReadStream('large.jpg')
  .pipe(new JPEGDecoder)
  .pipe(resize({ width: 300, height: 300, fit: true }))
  .pipe(new JPEGEncoder)
  .pipe(fs.createWriteStream('resized.jpg'));
```

## Options

There are many different combinations of options that resizer-stream understands.

* only `width` provided: image is scaled proportionally to width
* only `height` provided: image is scaled proportionally to height
* both `width` and `height` provided: image is stretched to fill the provided dimensions
* `width`, `height`, and `fit: true` provided: image is scaled proportionally to fit inside the provided dimensions
* `scale` factor provided: image is scaled proportionally by the provided scale factor
* `allowUpscale`: by default, images are not scaled above their intrinsic size. To allow upscaling, set this option to `true`.

## License

MIT
