const webpush = require('web-push');

webpush.setVapidDetails(
  'mailto:agarver20@outlook.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  // Simple auth check — only the app itself can call this
  const auth = event.headers['x-fieldsync-key'];
  if (auth !== process.env.PUSH_SECRET) {
    return { statusCode: 401, body: 'Unauthorized' };
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
