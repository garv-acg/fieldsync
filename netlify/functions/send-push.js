const webpush = require('web-push');

// VAPID public key is intentionally hardcoded (it is not a secret)
const VAPID_PUBLIC = 'BNIZohQ7q12o5w1j0MCLxqjvuKwjkyBiNgl0x_uXMcmhmfaCCWAW84DySKbo-hSYyCYtsbDipfog78mGC4Azvlk';

webpush.setVapidDetails(
  'mailto:agarver20@outlook.com',
  VAPID_PUBLIC,
  process.env.VAPID_PRIVATE_KEY
);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: 'Invalid JSON' };
  }

  const { subscriptions, title, message, url } = body;
  if (!subscriptions?.length || !title) {
    return { statusCode: 400, body: 'Missing subscriptions or title' };
  }

  const payload = JSON.stringify({ title, message: message || '', url: url || '/' });

  const results = await Promise.allSettled(
    subscriptions.map(sub => webpush.sendNotification(sub, payload))
  );

  const sent = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;

  return {
    statusCode: 200,
    body: JSON.stringify({ sent, failed }),
  };
};
