import { CallAttemptStatus, TaskStatus } from '@prisma/client';
import express, { Router } from 'express';
import { StatusCodes } from 'http-status-codes';
import { twiml } from 'twilio';

import { env } from '../env.js';
import { prisma } from '../lib/prisma.js';
import { bridgeUserCall } from '../lib/twilio.js';
import { evaluateRuleSet, markAttemptMatched, scheduleNextAttempt } from '../services/taskService.js';

const router = Router();
const twilioBodyParser = express.urlencoded({ extended: false });

router.post('/webhooks/twilio/voice', twilioBodyParser, async (req, res) => {
  const callSid = req.body.CallSid as string | undefined;
  const callStatus = (req.body.CallStatus as string | undefined)?.toLowerCase();
  const answeredBy = req.body.AnsweredBy as string | undefined;
  const sipCode = req.body.SipResponseCode ? Number(req.body.SipResponseCode) : undefined;

  if (!callSid || !callStatus) {
    return res.status(StatusCodes.BAD_REQUEST).send('missing CallSid or CallStatus');
  }

  const attempt = await prisma.callAttempt.findUnique({
    where: { callSid },
    include: { task: { include: { ruleSet: true } } }
  });

  if (!attempt || !attempt.task) {
    return res.status(StatusCodes.NOT_FOUND).send('attempt not found');
  }

  const task = attempt.task;
  if (task.status === TaskStatus.STOPPED) {
    return res.status(StatusCodes.OK).send('ignored');
  }

  switch (callStatus) {
    case 'queued':
    case 'initiated':
      await prisma.callAttempt.update({
        where: { id: attempt.id },
        data: { status: CallAttemptStatus.DIALING }
      });
      break;
    case 'ringing':
      await prisma.callAttempt.update({
        where: { id: attempt.id },
        data: { status: CallAttemptStatus.RINGING }
      });
      break;
    case 'in-progress':
    case 'answered': {
      await prisma.callAttempt.update({
        where: { id: attempt.id },
        data: { status: CallAttemptStatus.ANSWERED }
      });

      if (!attempt.matched) {
        const ruleSet = task.ruleSet;
        const shouldMatch = ruleSet ? evaluateRuleSet(ruleSet, { answeredBy }) : false;
        if (shouldMatch) {
          await markAttemptMatched(attempt.id, {
            metadata: { answeredBy },
            reason: 'RULE_MATCH'
          });
          attempt.matched = true;

          if (attempt.callSid) {
            const conferenceName = `task-${task.id}`;
            await bridgeUserCall({
              conferenceName,
              callSid: attempt.callSid,
              userPhone: task.userPhone
            }).catch((error) => {
              // eslint-disable-next-line no-console
              console.error('Failed to bridge user call', error);
            });
          }
        }
      }
      break;
    }
    case 'busy':
      if (!attempt.matched) {
        await scheduleNextAttempt(attempt.id, {
          reason: 'BUSY',
          retriable: true,
          sipCode,
          status: CallAttemptStatus.BUSY
        });
      }
      break;
    case 'no-answer':
      if (!attempt.matched) {
        await scheduleNextAttempt(attempt.id, {
          reason: 'NO_ANSWER',
          retriable: true,
          sipCode,
          status: CallAttemptStatus.NO_ANSWER
        });
      }
      break;
    case 'failed':
      if (!attempt.matched) {
        await scheduleNextAttempt(attempt.id, {
          reason: 'FAILED',
          retriable: true,
          sipCode,
          status: CallAttemptStatus.FAILED
        });
      }
      break;
    case 'canceled':
      if (!attempt.matched) {
        await scheduleNextAttempt(attempt.id, {
          reason: 'CANCELED',
          retriable: false,
          sipCode,
          status: CallAttemptStatus.CANCELED
        });
      }
      break;
    case 'completed':
      if (attempt.matched) {
        await prisma.callAttempt.update({
          where: { id: attempt.id },
          data: { status: CallAttemptStatus.COMPLETED, completedAt: new Date() }
        });
        await prisma.task.update({
          where: { id: attempt.taskId },
          data: { status: TaskStatus.COMPLETED, completedAt: new Date() }
        });
      } else {
        await scheduleNextAttempt(attempt.id, {
          reason: 'COMPLETED_NO_MATCH',
          retriable: false,
          sipCode,
          status: CallAttemptStatus.COMPLETED
        });
      }
      break;
    default:
      // eslint-disable-next-line no-console
      console.warn('Unhandled Twilio status', callStatus);
  }

  return res.status(StatusCodes.OK).send('ok');
});

const answerHandler = async (attemptId: string, res: express.Response) => {
  const attempt = await prisma.callAttempt.findUnique({ where: { id: attemptId } });
  if (!attempt) {
    return res.status(StatusCodes.NOT_FOUND).send('attempt not found');
  }

  const voiceResponse = new twiml.VoiceResponse();
  const streamUrl = env.MEDIA_STREAM_BASE_URL
    ? `${env.MEDIA_STREAM_BASE_URL.replace(/\/$/, '')}/${attemptId}`
    : `${env.PUBLIC_BASE_URL.replace('http', 'ws').replace(/\/$/, '')}/media/${attemptId}`;

  const start = voiceResponse.start();
  start.stream({ url: streamUrl });
  voiceResponse.pause({ length: 30 });
  voiceResponse.hangup();

  res.set('Content-Type', 'text/xml');
  return res.send(voiceResponse.toString());
};

router.get('/webhooks/twilio/answer', async (req, res) => {
  const attemptId = req.query.attemptId as string | undefined;
  if (!attemptId) {
    return res.status(StatusCodes.BAD_REQUEST).send('missing attemptId');
  }
  return answerHandler(attemptId, res);
});

router.post('/webhooks/twilio/answer', async (req, res) => {
  const attemptId = (req.body.attemptId as string | undefined) ?? (req.query.attemptId as string | undefined);
  if (!attemptId) {
    return res.status(StatusCodes.BAD_REQUEST).send('missing attemptId');
  }
  return answerHandler(attemptId, res);
});

export default router;
