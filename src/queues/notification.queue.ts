export const NOTIFICATION_QUEUE = 'notifications';

export const QUEUE_JOBS = {
  SEND_EMAIL: 'send_email',
  SEND_SMS: 'send_sms',
  SEND_PUSH: 'send_push',
} as const;

export interface EmailJobPayload {
  notificationId: string;
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export interface SmsJobPayload {
  notificationId: string;
  to: string;
  body: string;
}

export interface PushJobPayload {
  notificationId: string;
  token?: string;
  topic?: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}
