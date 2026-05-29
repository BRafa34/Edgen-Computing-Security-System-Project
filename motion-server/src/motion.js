const Jimp = require('jimp');
const config = require('./config');

async function detectMotion(framePath1, framePath2) {
  const [img1, img2] = await Promise.all([
    Jimp.read(framePath1),
    Jimp.read(framePath2),
  ]);

  const w = img1.bitmap.width;
  const h = img1.bitmap.height;
  let diffSum = 0;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const gray1 = Jimp.intToRGBA(img1.getPixelColor(x, y)).r;
      const gray2 = Jimp.intToRGBA(img2.getPixelColor(x, y)).r;
      diffSum += Math.abs(gray1 - gray2);
    }
  }

  const avgDiff = diffSum / (w * h);
  const motionDetected = avgDiff > config.motionThreshold;

  return {
    motionDetected,
    score: avgDiff,
    threshold: config.motionThreshold,
  };
}

module.exports = { detectMotion };
