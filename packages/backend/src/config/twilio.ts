import twilio from 'twilio';

import { env } from '../env.js';

export const twilioClient = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);

export const getVoiceClient = () => twilioClient.calls;

// TODO: expose helpers for creating TwiML, managing media streams, and bridging participants.
