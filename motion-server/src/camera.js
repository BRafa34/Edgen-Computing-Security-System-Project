const NodeWebcam = require('node-webcam');
const Jimp = require('jimp');
const path = require('path');
const fs = require('fs');
const config = require('./config');

const framesDir = path.join(__dirname, '..', 'frames');

if (!fs.existsSync(framesDir)) {
  fs.mkdirSync(framesDir, { recursive: true });
}

const Webcam = NodeWebcam.create({
  width: 320,
  height: 240,
  quality: 50,
  delay: 0,
  saveShots: true,
  output: 'bmp',
  device: config.cameraIndex,
  callbackReturn: 'location',
  verbose: false,
});

async function captureFrame() {
  const bmpPath = path.join(framesDir, `frame_${Date.now()}.bmp`);

  return new Promise((resolve, reject) => {
    Webcam.capture(bmpPath, async (err, location) => {
      if (err) return reject(err);
      try {
        const pngPath = bmpPath.replace('.bmp', '.png');
        const image = await Jimp.read(bmpPath);
        await image.resize(80, 60).grayscale().writeAsync(pngPath);
        try { fs.unlinkSync(bmpPath); } catch { }
        resolve(pngPath);
      } catch (convertErr) {
        reject(convertErr);
      }
    });

    setTimeout(() => {
      const exists = fs.existsSync(bmpPath);
      if (!exists) {
        reject(new Error('Camera capture timeout'));
      }
    }, 5000);
  });
}

function cleanupFrames() {
  const files = fs.readdirSync(framesDir);
  for (const f of files) {
    if (f.endsWith('.png') || f.endsWith('.bmp')) {
      try {
        fs.unlinkSync(path.join(framesDir, f));
      } catch { }
    }
  }
}

module.exports = { captureFrame, cleanupFrames };
