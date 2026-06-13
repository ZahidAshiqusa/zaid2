// Internal notification helper - sends push notifications + WhatsApp messages
const webpush = require('web-push');
const { readFile, writeFile } = require('./_github');

async function sendNotifications(sectionName, entrySummary, entryData) {
  // Send push notifications
  try {
    if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
      console.log('VAPID keys not configured, skipping push notifications');
    } else {
      webpush.setVapidDetails(
        process.env.VAPID_EMAIL || 'mailto:zaid@example.com',
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
      );

      const { data: subscriptions, sha } = await readFile('subscriptions');
      if (subscriptions && subscriptions.length > 0) {
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
              console.log('Removing expired subscription');
            } else {
              validSubs.push(sub);
              console.error('Push error:', err.message);
            }
          }
        });

        await Promise.all(sendPromises);

        if (validSubs.length !== subscriptions.length && sha) {
          await writeFile('subscriptions', validSubs, sha);
        }
      }
    }
  } catch (err) {
    console.error('Push notification error:', err.message);
  }

  // Send WhatsApp notification
  if (entryData) {
    try {
      const baseUrl = process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : 'http://localhost:3000';

      const waRes = await fetch(`${baseUrl}/api/whatsapp-send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          section: sectionName.toLowerCase(),
          entry: entryData
        })
      });
      const waResult = await waRes.json();
      if (waResult.success) {
        console.log('WhatsApp notification sent successfully');
      } else {
        console.log('WhatsApp notification result:', waResult.error || waResult.message);
      }
    } catch (err) {
      console.error('WhatsApp notification error:', err.message);
    }
  }
}

module.exports = { sendNotifications };
