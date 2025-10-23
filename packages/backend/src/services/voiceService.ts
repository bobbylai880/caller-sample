import { Queue } from 'bullmq';
import { connection } from '../lib/bullmq.js';

export type OutboundCallJob = {
  to: string;
  metadata?: Record<string, string>;
  mediaStreamWebhookUrl?: string;
  transcription?: {
    provider: 'deepgram' | 'gcp';
    language: string;
  };
};

export const voiceQueue = new Queue<OutboundCallJob>('voice:outbound', {
  connection,
  defaultJobOptions: {
    removeOnFail: true
  }
});

// TODO: implement worker(s) that consume jobs from the queue, call Twilio Programmable Voice,
// establish media streams, and pipe audio into the chosen transcription provider.
// The worker should handle retries, exponential backoff, and report status updates back to clients.

// Placeholder function to enqueue a cancellation request from mobile override.
export const cancelActiveCall = async (callSid: string) => {
  // TODO: propagate cancellation to Twilio and update internal state.
  throw new Error(`cancelActiveCall not implemented for ${callSid}`);
};
