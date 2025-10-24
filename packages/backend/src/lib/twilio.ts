import Twilio from 'twilio';

import { env } from '../env.js';

export const twilioClient = Twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);

export const createOutboundCall = async ({
  to,
  statusCallback,
  answerUrl,
  metadata
}: {
  to: string;
  statusCallback: string;
  answerUrl: string;
  metadata?: Record<string, string>;
}) => {
  return twilioClient.calls.create({
    to,
    from: env.TWILIO_FROM,
    statusCallback,
    statusCallbackMethod: 'POST',
    statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed', 'busy', 'failed', 'no-answer'],
    url: answerUrl,
    machineDetection: 'Enable',
    recordingStatusCallbackMethod: 'POST',
    sendDigits: metadata?.sendDigits,
    record: false,
    sipAuthUsername: metadata?.sipAuthUsername,
    sipAuthPassword: metadata?.sipAuthPassword,
    timeout: 30,
    callerId: env.TWILIO_FROM,
    trim: 'do-not-trim'
  });
};

export const bridgeUserCall = async ({
  conferenceName,
  callSid,
  userPhone
}: {
  conferenceName: string;
  callSid: string;
  userPhone: string;
}) => {
  await twilioClient.calls(callSid).update({
    twiml: `<Response><Dial><Conference>${conferenceName}</Conference></Dial></Response>`
  });

  await twilioClient.calls.create({
    to: userPhone,
    from: env.TWILIO_FROM,
    twiml: `<Response><Dial><Conference>${conferenceName}</Conference></Dial></Response>`
  });
};

export const hangupCall = async (callSid: string) => {
  await twilioClient.calls(callSid).update({ status: 'completed' });
};
