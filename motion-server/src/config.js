require('dotenv').config();

const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  motionThreshold: parseFloat(process.env.MOTION_THRESHOLD || '15'),
  frameIntervalMs: parseInt(process.env.FRAME_INTERVAL_MS || '500', 10),
  expoPushToken: process.env.EXPO_PUSH_TOKEN || null,
  cameraIndex: parseInt(process.env.CAMERA_INDEX || '0', 10),
};

module.exports = config;
