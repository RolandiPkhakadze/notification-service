import { Controller, Get, Header } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { FIREBASE_WEB_CONFIG } from '../common/config/firebase-web.config';

@ApiExcludeController()
@Controller()
export class FirebaseController {
  @Get('firebase-messaging-sw.js')
  @Header('Content-Type', 'application/javascript')
  @Header('Service-Worker-Allowed', '/')
  serviceWorker() {
    return `
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp(${JSON.stringify(FIREBASE_WEB_CONFIG)});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  self.registration.showNotification(payload.notification.title, {
    body: payload.notification.body,
    icon: '/favicon.ico',
  });
});
`;
  }
}
