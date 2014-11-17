var util = require('util');
var PixelStream = require('pixel-stream');
var pica = require('pica');
var toBuffer = require('typedarray-to-buffer');
var ColorTransform = require('color-transform');

function ResizeStream(srcWidth, srcHeight, options) {
  if (!(this instanceof ResizeStream))
    return new ResizeStream(srcWidth, srcHeight, options);
  
  PixelStream.call(this);
  
  if (typeof srcWidth === 'object') {
    options = srcWidth;
    srcWidth = 0;
    srcHeight = 0;
  }
  
  this.srcWidth = srcWidth;
  this.srcHeight = srcHeight;
  this._computeSize(options);
  
  this._buffers = [];
  this._len = 0;
  this._colorTransform = null;
  this._inverseColorTransform = null;
  
  this.once('format', function() {
    this.srcWidth = this.width;
    this.srcHeight = this.height;
    this._computeSize(options);
    
    // if the color space isn't rgba, we need to convert to rgba
    // first for pica, then convert back after the resize is done
    if (this.colorSpace !== 'rgba') {
      try {
        this._colorTransform = ColorTransform.getTransformFunction(this.colorSpace, 'rgba');
        
        // we can't convert back to cmyk yet, and it's lossy anyway, so
        // just get rid of the alpha channel and output rgb after resizing
        if (this.colorSpace === 'cmyk')
          this.colorSpace = 'rgb';
          
        this._inverseColorTransform = ColorTransform.getTransformFunction('rgba', this.colorSpace);
      } catch (e) {
        return this.emit('error', e);
      }
    }
  });
}

util.inherits(ResizeStream, PixelStream);

ResizeStream.prototype._computeSize = function(options) {
  if (!options) options = {};
  var scale = 0;
  
  // scale proportionally to width
  if (options.width && !options.height) {
    scale = options.width / this.srcWidth;
    
  // scale proportionally to height
  } else if (options.height && !options.width) {
    scale = options.height / this.srcHeight;
    
  // scale factor given
  } else if (options.scale) {
    scale = options.scale;
    
  // fit within provided width and height
  } else if (options.width && options.height && options.fit) {
    scale = Math.min(options.width / this.srcWidth, options.height / this.srcHeight);
  }
  
  // unless allowUpscale option set, don't scale up
  if (scale && !options.allowUpscale)
    scale = Math.min(1, scale);
  
  // compute output width and height
  if (scale) {
    this.width = this.srcWidth * scale | 0;
    this.height = this.srcHeight * scale | 0;
    this.scale = scale;
  } else if (options.width && options.height) {
    this.width = options.width;
    this.height = options.height;
  } else {
    return this.emit('error', new Error('Invalid resizing options'));
  }
};

ResizeStream.prototype._startFrame = function(frame, done) {
  this._buffers = [];
  this._len = 0;
  
  // if frame width and height are provided, and we have a scalefactor,
  // scale the frame size by the scalefactor. otherwise, use global width and height.
  if (frame.width && frame.height && this.scale) {
    this._frameWidth = frame.width * this.scale | 0;
    this._frameHeight = frame.height * this.scale | 0;
  } else {
    this._frameWidth = this.width;
    this._frameHeight = this.height;
  }
  
  frame.width = this._frameWidth;
  frame.height = this._frameHeight;
  
  done();
};

ResizeStream.prototype._writePixels = function(data, done) {
  // act as a passthrough stream if no resize is necessary
  if (this.srcWidth === this._frameWidth && this.srcHeight === this._frameHeight) {
    this.push(data);
    return done();
  }
  
  if (this._colorTransform)
    data = this._colorTransform(data);
  
  this._len += data.length;
  this._buffers.push(data);
  
  done();
};

ResizeStream.prototype._endFrame = function(done) {
  var self = this;
    
  // ignore if no resize is necessary
  if (this.srcWidth === this._frameWidth && this.srcHeight === this._frameHeight)
    return done();
  
  // concatenate all of the buffers together
  var buf = new Uint8Array(this._len);
  var pos = 0;
  for (var i = 0; i < this._buffers.length; i++) {
    var b = this._buffers[i];
    buf.set(b, pos);
    pos += b.length;
  }
            
  pica.resizeBuffer({
    src: buf,
    width: this.srcWidth,
    height: this.srcHeight,
    toWidth: this._frameWidth,
    toHeight: this._frameHeight,
    transferable: true,
    alpha: true
  }, function(err, output) {
    if (err) return done(err);
        
    var buf = toBuffer(output);
    if (self._inverseColorTransform)
      buf = self._inverseColorTransform(buf);
    
    self.push(buf);
    done();
  });
};

module.exports = ResizeStream;
