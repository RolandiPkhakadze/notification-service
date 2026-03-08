import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { FIREBASE_VAPID_KEY, FIREBASE_WEB_CONFIG } from './common/config/firebase-web.config';
import { DbExceptionFilter } from './common/filters/db-exception.filter';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });

  app.use(
    helmet({
      contentSecurityPolicy: false,
    }),
  );

  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') ?? '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    credentials: true,
  });

  app.enableShutdownHooks();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter(), new DbExceptionFilter());

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Notification Service')
    .setDescription('Multi-channel notification API — email, SMS, and push via a single endpoint')
    .setVersion('1.0')
    .addTag('Notifications')
    .addTag('Templates')
    .addTag('Webhooks')
    .addTag('Health')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);

  const pushTestJs = `
    const FIREBASE_CONFIG = ${JSON.stringify(FIREBASE_WEB_CONFIG)};
    const VAPID_KEY = "${FIREBASE_VAPID_KEY}";

    async function initPushTest() {
      await new Promise(r => setTimeout(r, 1500));

      const banner = document.createElement('div');
      banner.id = 'push-test-banner';
      banner.style.cssText = 'background:#1b1b1b;color:#fff;padding:16px 24px;font-family:sans-serif;font-size:14px;border-bottom:2px solid #49cc90;display:flex;align-items:center;gap:12px;flex-wrap:wrap;';
      banner.innerHTML = \`
        <span style="font-size:18px;">Push Notification Tester</span>
        <button id="push-enable-btn" onclick="enablePush()" style="background:#49cc90;color:#fff;border:none;padding:8px 16px;border-radius:4px;cursor:pointer;font-size:13px;font-weight:bold;">Enable Push Notifications</button>
        <span id="push-status" style="color:#aaa;">Click the button to get an FCM token</span>
      \`;

      const wrapper = document.querySelector('.swagger-ui');
      if (wrapper) wrapper.parentNode.insertBefore(banner, wrapper);
    }

    async function enablePush() {
      const statusEl = document.getElementById('push-status');
      const btn = document.getElementById('push-enable-btn');

      try {
        statusEl.textContent = 'Loading Firebase...';

        const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js');
        const { getMessaging, getToken, onMessage } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging.js');

        const app = initializeApp(FIREBASE_CONFIG);
        const messaging = getMessaging(app);

        statusEl.textContent = 'Requesting permission...';
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          statusEl.textContent = 'Permission denied. Please allow notifications.';
          statusEl.style.color = '#f93e3e';
          return;
        }

        const swReg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        statusEl.textContent = 'Getting token...';

        const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: swReg });

        btn.style.display = 'none';
        statusEl.style.color = '#49cc90';
        statusEl.innerHTML = \`
          <strong>FCM Token (use in send-push):</strong>
          <input readonly value="\${token}" style="width:340px;padding:4px 8px;font-size:12px;background:#2b2b2b;color:#49cc90;border:1px solid #49cc90;border-radius:3px;font-family:monospace;" onclick="this.select()"/>
          <span style="color:#aaa;font-size:12px;">  Click token to copy, then use in POST /notifications/push</span>
        \`;

        onMessage(messaging, (payload) => {
          new Notification(payload.notification.title, { body: payload.notification.body });

          // Overlay notification
          const overlay = document.createElement('div');
          overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.6);z-index:99999;display:flex;align-items:center;justify-content:center;';
          overlay.onclick = () => overlay.remove();

          const card = document.createElement('div');
          card.style.cssText = 'background:#fff;border-radius:12px;padding:32px 40px;max-width:420px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,0.3);text-align:center;font-family:sans-serif;animation:popIn 0.3s ease;';
          card.innerHTML = \`
            <div style="font-size:48px;margin-bottom:12px;">&#x1F514;</div>
            <div style="font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#49cc90;font-weight:700;margin-bottom:8px;">Push Notification Received</div>
            <div style="font-size:22px;font-weight:700;color:#1b1b1b;margin-bottom:8px;">\${payload.notification.title}</div>
            <div style="font-size:15px;color:#555;margin-bottom:20px;">\${payload.notification.body}</div>
            <div style="font-size:11px;color:#aaa;">Delivered via Firebase Cloud Messaging</div>
            <div style="margin-top:16px;"><button onclick="this.closest('div[style*=fixed]').remove()" style="background:#49cc90;color:#fff;border:none;padding:10px 28px;border-radius:6px;cursor:pointer;font-size:14px;font-weight:600;">Dismiss</button></div>
          \`;

          overlay.appendChild(card);
          document.body.appendChild(overlay);

          // Also show persistent banner
          const alert = document.createElement('div');
          alert.style.cssText = 'background:linear-gradient(135deg,#49cc90,#38b278);color:#fff;padding:14px 24px;font-family:sans-serif;font-size:14px;font-weight:600;display:flex;align-items:center;gap:10px;justify-content:center;';
          alert.innerHTML = '<span style="font-size:20px;">&#x2705;</span> Push received: ' + payload.notification.title + ' — ' + payload.notification.body;
          document.getElementById('push-test-banner').after(alert);
          setTimeout(() => alert.remove(), 8000);
        });
      } catch (err) {
        statusEl.textContent = 'Error: ' + err.message;
        statusEl.style.color = '#f93e3e';
      }
    }

    initPushTest();
  `;

  SwaggerModule.setup('api/docs', app, document, {
    customJsStr: [pushTestJs],
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`Application running on port ${port}`);
  console.log(`Swagger docs at /api/docs`);
}

bootstrap();
