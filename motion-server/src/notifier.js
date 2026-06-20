const { Expo } = require('expo-server-sdk');
const config = require('./config');

const expo = new Expo();

async function sendPushNotification(title, body) {
  if (!config.expoPushToken) {
    console.log('[NOTIFIER] No Expo push token configured. Skipping notification.');
    return false;
  }

  if (!Expo.isExpoPushToken(config.expoPushToken)) {
    console.log('[NOTIFIER] Invalid Expo push token format.');
    return false;
  }

  const message = {
    to: config.expoPushToken,
    sound: 'default',
    title: title || '🚨 Movimiento Detectado',
    body: body || 'Se ha detectado movimiento en la cámara.',
    data: { type: 'motion_alert', timestamp: Date.now() },
    priority: 'high',
  };

  try {
    const ticket = await expo.sendPushNotificationsAsync([message]);
    console.log('[NOTIFIER] Notification sent:', JSON.stringify(ticket));
    return ticket;
  } catch (err) {
    console.error('[NOTIFIER] Error sending notification:', err.message);
    return false;
  }
}

module.exports = { sendPushNotification };
