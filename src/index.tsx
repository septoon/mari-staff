import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import 'primereact/resources/primereact.min.css';
import 'primereact/resources/themes/lara-light-blue/theme.css';
import 'react-spring-bottom-sheet/dist/style.css';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';

function isIosStandalonePwa() {
  const ua = window.navigator.userAgent;
  const isIosDevice = /iPhone|iPad|iPod/i.test(ua);
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  return isIosDevice && isStandalone;
}

function resolveIosStandaloneScale() {
  const shortSide = Math.min(window.screen.width, window.screen.height);
  if (shortSide <= 390) {
    return 0.68;
  }
  if (shortSide <= 480) {
    return 0.72;
  }
  return 0.8;
}

if (isIosStandalonePwa()) {
  const scale = resolveIosStandaloneScale();
  const viewportMeta = document.querySelector('meta[name="viewport"]');
  if (viewportMeta) {
    viewportMeta.setAttribute(
      'content',
      `width=device-width, initial-scale=${scale}, maximum-scale=${scale}, user-scalable=no, viewport-fit=cover`,
    );
  }
  document.documentElement.setAttribute('data-ios-standalone-pwa', 'true');
}

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
serviceWorkerRegistration.register();
