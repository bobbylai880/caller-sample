import { GoogleAuth } from 'google-auth-library';

import { env } from '../env.js';

export type MatchNotificationPayload = {
  taskId: string;
  number: string;
  match: boolean;
};

let accessToken: { token: string; expiresAt: number } | undefined;

const getAccessToken = async () => {
  if (!env.FCM_SERVICE_ACCOUNT) {
    return undefined;
  }

  const credentials = JSON.parse(env.FCM_SERVICE_ACCOUNT);
  const auth = new GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/firebase.messaging']
  });

  if (accessToken && accessToken.expiresAt > Date.now() + 60_000) {
    return accessToken.token;
  }

  const client = await auth.getClient();
  const tokenResponse = await client.getAccessToken();

  if (!tokenResponse || !tokenResponse.token) {
    throw new Error('Failed to acquire FCM access token');
  }

  accessToken = {
    token: tokenResponse.token,
    expiresAt: Date.now() + 45 * 60 * 1000
  };

  return accessToken.token;
};

export const sendMatchNotification = async (payload: MatchNotificationPayload) => {
  if (!env.FCM_SERVICE_ACCOUNT) {
    // eslint-disable-next-line no-console
    console.warn('FCM_SERVICE_ACCOUNT not configured, skipping notification');
    return;
  }

  const credentials = JSON.parse(env.FCM_SERVICE_ACCOUNT);
  const projectId = credentials.project_id;
  if (!projectId) {
    throw new Error('FCM service account must include project_id');
  }

  const token = await getAccessToken();
  if (!token) {
    return;
  }

  const response = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message: {
        topic: 'apps/android',
        data: {
          taskId: payload.taskId,
          number: payload.number,
          match: payload.match ? 'true' : 'false'
        }
      }
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to send FCM notification: ${response.status} ${text}`);
  }
};
