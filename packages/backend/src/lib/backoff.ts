export type BackoffPolicy = {
  initialSeconds: number;
  multiplier: number;
  maxSeconds: number;
  jitterRatio: number;
};

export const defaultBackoffPolicy: BackoffPolicy = {
  initialSeconds: 15,
  multiplier: 2,
  maxSeconds: 120,
  jitterRatio: 0.2
};

export const computeBackoffDelayMs = (attemptNumber: number, policy: BackoffPolicy = defaultBackoffPolicy) => {
  const base = Math.min(policy.initialSeconds * Math.pow(policy.multiplier, attemptNumber - 1), policy.maxSeconds);
  const jitter = 1 + (Math.random() * 2 - 1) * policy.jitterRatio;
  return Math.round(base * jitter * 1000);
};
