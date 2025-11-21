// Lightweight LVS browser node used in the public MVP demo.
// Не зависит от DOM, кроме canvas — всё остальное отдаёт наружу через колбэки.

class LVSBrowserNode {
  constructor(options) {
    this.nodeId     = options.nodeId;
    this.gatewayUrl = options.gatewayUrl;
    this.canvasId   = options.canvasId;

    this.onStatus  = options.onStatus  || (() => {});
    this.onMetrics = options.onMetrics || (() => {});
    this.onPeers   = options.onPeers   || (() => {});
    this.onEvent   = options.onEvent   || (() => {});

    // core state
    this.ws    = null;
    this.vu    = 100.0;
    this.tc    = 0.5;
    this.cycle = 0;

    // drift parameters
    this.alpha = 0.05;
    this.beta  = 0.10;

    // peer state
    this.lastPeerDiff   = null;
    this.lastPeerWeight = null;
    this.peers          = [];

    // reconnect
    this._reconnectTimer = null;
    this._reconnectDelay = 1500; // ms

    // render
    const canvas = document.getElementById(this.canvasId);
    this.canvas = canvas;
    this.ctx    = canvas.getContext('2d');

    this.x = canvas.width  / 2;
    this.y = canvas.height / 2;

    this._loopStarted = false;
  }

  // ---- public API --------------------------------------------------------

  start() {
    this._connect();
    if (!this._loopStarted) {
      this._loopStarted = true;
      this._startLoop();
    }
  }

  // ---- ws lifecycle ------------------------------------------------------

  _connect() {
    this._clearWs();

    this.onStatus('connecting…');

    try {
      this.ws = new WebSocket(this.gatewayUrl);
    } catch (e) {
      this.onStatus('error');
      this.onEvent(`ws constructor error: ${e.message || e}`);
      return this._scheduleReconnect();
    }

    this.ws.onopen = () => {
      this._reconnectDelay = 1500; // сброс backoff
      this.onStatus('connected');
      this._sendHello();
      this._sendPeersRequest();
    };

    this.ws.onclose = () => {
      this.onStatus('disconnected');
      this._scheduleReconnect();
    };

    this.ws.onerror = () => {
      // не спамим в консоль, только в UI
      this.onStatus('error');
    };

    this.ws.onmessage = (ev) => this._handleMessage(ev.data);
  }

  _clearWs() {
    if (this.ws) {
      try { this.ws.close(); } catch (_) {}
      this.ws = null;
    }
  }

  _scheduleReconnect() {
    if (this._reconnectTimer) return;
    const delay = this._reconnectDelay;
    this._reconnectDelay = Math.min(this._reconnectDelay * 1.7, 10000);

    this._reconnectTimer = setTimeout(() => {
      this._reconnectTimer = null;
      this._connect();
    }, delay);
  }

  // ---- outbound messages -------------------------------------------------

  _send(obj) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    try {
      this.ws.send(JSON.stringify(obj));
    } catch (_) {}
  }

  _sendHello() {
    this._send({
      type: 'hello',
      node_id: this.nodeId,
      payload: {
        kind: 'browser',
        version: '0.2.0'
      }
    });
    this.onEvent(`hello sent → ${this.nodeId}`);
  }

  _sendPeersRequest() {
    this._send({
      type: 'peers_request',
      node_id: this.nodeId
    });
  }

  _sendSDM(diff) {
    this._send({
      type: 'sdm',
      node_id: this.nodeId,
      payload: {
        diff,
        weight: this.tc,
        cycle_id: this.cycle
      }
    });
  }

  // ---- inbound messages --------------------------------------------------

  _handleMessage(raw) {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }

    if (!msg || typeof msg !== 'object' || !msg.type) return;

    switch (msg.type) {
      case 'hello':
        if (msg.node_id && msg.node_id !== this.nodeId) {
          this.onEvent(`hello from: ${msg.node_id}`);
        }
        break;

      case 'peers':
        if (msg.payload && Array.isArray(msg.payload.peers)) {
          this.peers = msg.payload.peers;
          this.onPeers(this.peers);
        }
        break;

      case 'sdm':
        if (msg.node_id !== this.nodeId &&
            msg.payload && Array.isArray(msg.payload.diff)) {
          this.lastPeerDiff   = msg.payload.diff;
          this.lastPeerWeight = msg.payload.weight || null;
        }
        break;

      default:
        // можно тихо игнорировать
        break;
    }
  }

  // ---- drift / physics ---------------------------------------------------

  _entropy() {
    return [Math.random() * 2 - 1, Math.random() * 2 - 1];
  }

  _driftFromEntropy(E) {
    const m = Math.hypot(E[0], E[1]) || 1;
    return [ (E[0] / m) * this.alpha, (E[1] / m) * this.alpha ];
  }

  _driftFromPeers() {
    if (!this.lastPeerDiff) return [0, 0];
    return [
      this.lastPeerDiff[0] * this.beta,
      this.lastPeerDiff[1] * this.beta
    ];
  }

  _vaultGuard(d) {
    if (this.vu + d[0] < 0) d[0] = -this.vu;
    return d;
  }

  _applyDrift(d) {
    this.vu += d[0];

    this.x += d[0] * 2.1;
    this.y += d[1] * 2.1;

    // clamp в пределах canvas
    const w = this.canvas.width;
    const h = this.canvas.height;
    this.x = Math.max(12, Math.min(w - 12, this.x));
    this.y = Math.max(12, Math.min(h - 12, this.y));
  }

  // ---- render ------------------------------------------------------------

  _draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.clearRect(0, 0, w, h);

    // мягкое свечение вокруг центра
    const g = ctx.createRadialGradient(
      w / 2, h / 2, 40,
      w / 2, h / 2, Math.max(w, h) / 2
    );
    g.addColorStop(0, 'rgba(15,23,42,0.0)');
    g.addColorStop(1, 'rgba(15,23,42,0.95)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // точка
    ctx.beginPath();
    ctx.arc(this.x, this.y, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#22d3ee';
    ctx.shadowColor = 'rgba(45, 212, 191, 0.9)';
    ctx.shadowBlur = 14;
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  // ---- main loop ---------------------------------------------------------

  _startLoop() {
    const tick = () => {
      this.cycle += 1;

      const E   = this._entropy();
      const d1  = this._driftFromEntropy(E);
      const d2  = this._driftFromPeers();
      let drift = [d1[0] + d2[0], d1[1] + d2[1]];

      drift = this._vaultGuard(drift);
      this._applyDrift(drift);
      this._draw();
      this._sendSDM(drift);

      this.onMetrics({
        cycle: this.cycle,
        vu: this.vu,
        tc: this.tc
      });

      requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  }
}
