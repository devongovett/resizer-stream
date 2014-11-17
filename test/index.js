var resize = require('../');
var fs = require('fs');
var assert = require('assert');
var concat = require('concat-frames');
var PassThrough = require('stream').PassThrough;

describe('resizer-stream', function() {
  function stream() {
    var s = fs.createReadStream(__dirname + '/trees.pixels');
    s.width = 400;
    s.height = 533;
    s.colorSpace = 'rgb';
    return s;
  }
    
  it('should resize an image to an exact width and height', function(done) {
    stream()
      .pipe(resize({ width: 300, height: 300 }))
      .pipe(concat(function(frames) {
        assert.equal(frames.length, 1);
        assert.equal(frames[0].width, 300);
        assert.equal(frames[0].height, 300);
        assert.equal(frames[0].colorSpace, 'rgb');
        assert.equal(frames[0].pixels.length, 300 * 300 * 3);
        done();
      }));
  });
  
  it('should resize up', function(done) {
    stream()
      .pipe(resize({ width: 700, height: 700 }))
      .pipe(concat(function(frames) {
        assert.equal(frames.length, 1);
        assert.equal(frames[0].width, 700);
        assert.equal(frames[0].height, 700);
        assert.equal(frames[0].colorSpace, 'rgb');
        assert.equal(frames[0].pixels.length, 700 * 700 * 3);
        done();
      }));
  });
  
  it('should resize proportional to width', function(done) {
    stream()
      .pipe(resize({ width: 100 }))
      .pipe(concat(function(frames) {
        assert.equal(frames.length, 1);
        assert.equal(frames[0].width, 100);
        assert.equal(frames[0].height, 133);
        assert.equal(frames[0].colorSpace, 'rgb');
        assert.equal(frames[0].pixels.length, 100 * 133 * 3);
        done();
      }));
  });
  
  it('should resize proportional to height', function(done) {
    stream()
      .pipe(resize({ height: 100 }))
      .pipe(concat(function(frames) {
        assert.equal(frames.length, 1);
        assert.equal(frames[0].width, 75);
        assert.equal(frames[0].height, 100);
        assert.equal(frames[0].colorSpace, 'rgb');
        assert.equal(frames[0].pixels.length, 75 * 100 * 3);
        done();
      }));
  });
  
  it('should scale', function(done) {
    stream()
      .pipe(resize({ scale: 0.5 }))
      .pipe(concat(function(frames) {
        assert.equal(frames.length, 1);
        assert.equal(frames[0].width, 200);
        assert.equal(frames[0].height, 266);
        assert.equal(frames[0].colorSpace, 'rgb');
        assert.equal(frames[0].pixels.length, 200 * 266 * 3);
        done();
      }));
  });
  
  it('should resize to fit inside width and height', function(done) {
    stream()
      .pipe(resize({ width: 200, height: 200, fit: true }))
      .pipe(concat(function(frames) {
        assert.equal(frames.length, 1);
        assert.equal(frames[0].width, 150);
        assert.equal(frames[0].height, 200);
        assert.equal(frames[0].colorSpace, 'rgb');
        assert.equal(frames[0].pixels.length, 150 * 200 * 3);
        done();
      }));
  });
  
  it('should not scale up by default', function(done) {
    stream()
      .pipe(resize({ width: 1000, height: 1000, fit: true }))
      .pipe(concat(function(frames) {
        assert.equal(frames.length, 1);
        assert.equal(frames[0].width, 400);
        assert.equal(frames[0].height, 533);
        assert.equal(frames[0].colorSpace, 'rgb');
        assert.equal(frames[0].pixels.length, 400 * 533 * 3);
        done();
      }));
  });
  
  it('should scale up if requested', function(done) {
    stream()
      .pipe(resize({ width: 1000, height: 1000, fit: true, allowUpscale: true }))
      .pipe(concat(function(frames) {
        assert.equal(frames.length, 1);
        assert.equal(frames[0].width, 750);
        assert.equal(frames[0].height, 1000);
        assert.equal(frames[0].colorSpace, 'rgb');
        assert.equal(frames[0].pixels.length, 750 * 1000 * 3);
        done();
      }));
  });
  
  it('should scale frames of different sizes using same scalefactor', function(done) {
    var s = new PassThrough;
    s.width = 500;
    s.height = 400;
    s.colorSpace = 'rgb';
    
    s.pipe(resize({ width: 100 }))
     .pipe(concat(function(frames) {
       assert.equal(frames.length, 2);
       assert.equal(frames[0].width, 100);
       assert.equal(frames[0].height, 80);
       assert.equal(frames[0].colorSpace, 'rgb');
       assert.equal(frames[0].pixels.length, 100 * 80 * 3);
       assert.equal(frames[1].width, 40);
       assert.equal(frames[1].height, 60);
       assert.equal(frames[1].colorSpace, 'rgb');
       assert.equal(frames[1].pixels.length, 40 * 60 * 3);
       done();
     }));
    
    s.emit('frame', { width: 500, height: 400 });
    s.write(new Buffer(500 * 400 * 3));
    s.emit('frame', { width: 200, height: 300 });
    s.end(new Buffer(200 * 300 * 3));
  });
  
  it('should not convert back to cmyk', function(done) {
    // color-transform can't currently transform rgba -> cmyk, so just convert to rgb instead
    var stream = new PassThrough;
    stream.width = 620;
    stream.height = 371;
    stream.colorSpace = 'cmyk';
    
    stream
      .pipe(resize({ width: 300 }))
      .pipe(concat(function(frames) {
        assert.equal(frames.length, 1);
        assert.equal(frames[0].width, 300);
        assert.equal(frames[0].height, 179);
        assert.equal(frames[0].colorSpace, 'rgb');
        assert.equal(frames[0].pixels.length, 300 * 179 * 3);
        done();
      }));
      
    stream.end(new Buffer(620 * 371 * 4));
  });
  
  it('should not convert data already in rgba', function(done) {
    var stream = new PassThrough;
    stream.width = 500;
    stream.height = 400;
    stream.colorSpace = 'rgba';
    
    stream
      .pipe(resize({ width: 300 }))
      .pipe(concat(function(frames) {
        assert.equal(frames.length, 1);
        assert.equal(frames[0].width, 300);
        assert.equal(frames[0].height, 240);
        assert.equal(frames[0].colorSpace, 'rgba');
        assert.equal(frames[0].pixels.length, 300 * 240 * 4);
        done();
      }));
      
    stream.end(new Buffer(500 * 400 * 4));
  });
  
  it('should error when given invalid options', function() {
    assert.throws(function() {
      stream().pipe(resize())
    }, /Invalid resizing options/);
  });
});
