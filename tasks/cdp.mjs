// Minimal CDP driver used for ad-hoc UI verification of the running Vite app.
// Node >= 22 (global WebSocket). Not part of the app bundle.

const BROWSER_WS = process.env.CDP_WS || 'ws://127.0.0.1:9222/devtools/browser';

export class Cdp {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.nextId = 1;
    this.pending = new Map();
  }

  async connect() {
    this.ws = new WebSocket(this.wsUrl);
    await new Promise((resolve, reject) => {
      this.ws.addEventListener('open', resolve, { once: true });
      this.ws.addEventListener('error', (e) => reject(new Error('ws error: ' + (e.message || 'unknown'))), { once: true });
    });
    this.ws.addEventListener('message', (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(JSON.stringify(msg.error)));
        else resolve(msg.result);
      }
    });
    return this;
  }

  send(method, params = {}, sessionId) {
    const id = this.nextId++;
    const payload = { id, method, params };
    if (sessionId) payload.sessionId = sessionId;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify(payload));
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error(`CDP timeout: ${method}`));
        }
      }, 30000);
    });
  }

  async newPage(url) {
    const { targetId } = await this.send('Target.createTarget', { url });
    const { sessionId } = await this.send('Target.attachToTarget', {
      targetId,
      flatten: true,
    });
    await this.send('Page.enable', {}, sessionId);
    await this.send('Runtime.enable', {}, sessionId);
    this.sessionId = sessionId;
    this.targetId = targetId;
    return sessionId;
  }

  async eval(expression) {
    const result = await this.send(
      'Runtime.evaluate',
      {
        expression,
        awaitPromise: true,
        returnByValue: true,
      },
      this.sessionId,
    );
    if (result.exceptionDetails) {
      throw new Error(
        'eval threw: ' + JSON.stringify(result.exceptionDetails.exception?.description || result.exceptionDetails.text),
      );
    }
    return result.result.value;
  }

  async navigate(url) {
    await this.send('Page.navigate', { url }, this.sessionId);
  }

  async screenshot(path) {
    const { data } = await this.send(
      'Page.captureScreenshot',
      { format: 'png', captureBeyondViewport: true },
      this.sessionId,
    );
    const fs = await import('node:fs');
    fs.writeFileSync(path, Buffer.from(data, 'base64'));
    return path;
  }

  close() {
    try {
      this.ws.close();
    } catch {
      /* ignore */
    }
  }
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function findBrowserWs() {
  const res = await fetch('http://127.0.0.1:9222/json/version');
  const json = await res.json();
  return json.webSocketDebuggerUrl;
}
