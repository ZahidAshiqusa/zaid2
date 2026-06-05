// Internal notification helper - sends push notifications to all subscribers
const webpush = require('web-push');
const { readFile, writeFile } = require('./_github');

async function sendNotifications(sectionName, entrySummary) {
  try {
    if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
      console.log('VAPID keys not configured, skipping notifications');
      return;
    }

    webpush.setVapidDetails(
      process.env.VAPID_EMAIL || 'mailto:zaid@example.com',
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );

    const { data: subscriptions, sha } = await readFile('subscriptions');
    if (!subscriptions || subscriptions.length === 0) return;

    const payload = JSON.stringify({
      title: 'ZAID BWP STOCK MANAGER',
      body: `New entry in ${sectionName}: ${entrySummary}`,
      icon: '/icons/icon-192.svg',
      badge: '/icons/icon-192.svg',
      tag: sectionName,
      data: { url: '/index.html' }
    });

    const validSubs = [];
    const sendPromises = subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(sub, payload);
        validSubs.push(sub);
      } catch (err) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          // Subscription expired or unsubscribed, remove it
          console.log('Removing expired subscription');
        } else {
          validSubs.push(sub); // Keep if error is not permanent
          console.error('Push error:', err.message);
        }
      }
    });

    await Promise.all(sendPromises);

    // Save cleaned subscriptions list if any were removed
    if (validSubs.length !== subscriptions.length && sha) {
      await writeFile('subscriptions', validSubs, sha);
    }
  } catch (err) {
    console.error('Notification error:', err.message);
    // Don't throw - notifications are best-effort
  }
}

module.exports = { sendNotifications };
