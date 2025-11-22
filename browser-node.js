class LVSBrowserNode {
  constructor(nodeId, gatewayUrl, canvasId) {
    this.nodeId = nodeId;
    this.gatewayUrl = gatewayUrl;

    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext("2d");

    this.width  = this.canvas.width;
    this.height = this.canvas.height;

    this.centerX = this.width / 2;
    this.centerY = this.height / 2;
    this.radius  = Math.min(this.width, this.height) / 2 - 40;

    // состояние ноды
    this.ws    = null;
    this.vu    = 100.0;
    this.tc    = 0.5;
    this.cycle = 0;

    // дрейф
    this.alpha = 0.04;
    this.beta  = 0.06;
    this.lastPeerDiff   = null;
    this.lastPeerWeight = null;

    // peers (массив объектов {id, angle, x, y, pulse, lastSdmTime})
    this.peers = [];

    // ядро
    this.corePulse = 0;         // пульсация ядра от активности
    this.lastTs    = performance.now();

    // self-позиция в value-space (можно считать "локальная оценка")
    this.selfX = this.centerX;
    this.selfY = this.centerY;
    this.selfTrail = [];
    this.maxTrail  = 80;
    this.selfPulse = 0;         // вспышка когда мы шлём SDM

    // таймер цикла, чтобы не плодить интервалы при реконнекте
    this.loopTimer = null;

    // колбэки для UI
    this.onStatus = () => {};
    this.onPeers  = () => {};
    this.onCycle  = () => {};
    this.onHello  = () => {};
    this.onSDM    = () => {};
  }

  /* ===========================
   *   WS lifecycle
   * ===========================
   */

  start() {
    this.onStatus("connecting...");
    console.log("[LVS] connecting:", this.gatewayUrl);

    this.ws = new WebSocket(this.gatewayUrl);

    this.ws.onopen = () => {
      this.onStatus("connected");
      console.log("[LVS] connected");
      this.sendHello();
      this.requestPeers();

      if (!this.loopTimer) {
        this.loop();
      }
    };

    this.ws.onclose = () => {
      this.onStatus("disconnected");
      console.log("[LVS] disconnected");
      setTimeout(() => this.start(), 1500);
    };

    this.ws.onerror = (err) => {
      this.onStatus("error");
      console.log("[LVS] ws error:", err);
    };

    this.ws.onmessage = (ev) => this.handleMessage(ev.data);
  }

  send(msg) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  sendHello() {
    const msg = {
      type: "hello",
      node_id: this.nodeId,
      payload: {
        kind: "browser",
        version: "0.3.0",
      },
    };
    this.send(msg);
  }

  requestPeers() {
    const msg = {
      type: "peers_request",
      node_id: this.nodeId,
    };
    this.send(msg);
  }

  sendSDM(diff) {
    const msg = {
      type: "sdm",
      node_id: this.nodeId,
      payload: {
        diff,
        weight: this.tc,
        cycle_id: this.cycle,
      },
    };
    this.send(msg);
    this.selfPulse = Math.min(1.3, this.selfPulse + 0.6);
    this.onSDM(diff[0]);
  }

  /* ===========================
   *   Handle incoming messages
   * ===========================
   */

  handleMessage(txt) {
    let msg;
    try {
      msg = JSON.parse(txt);
    } catch {
      return;
    }

    if (msg.type === "hello" && msg.node_id !== this.nodeId) {
      this.onHello(msg.node_id);
    }

    if (msg.type === "peers" || msg.type === "peers_response") {
      const peersRaw = (msg.payload && msg.payload.peers) || [];
      this.updatePeers(peersRaw);
      this.onPeers(peersRaw);
      return;
    }

    if (msg.type === "sdm") {
      const diff   = msg.payload?.diff   || [0, 0];
      const weight = msg.payload?.weight ?? 0.5;

      // для дрейфа учитываем только чужие ноды
      if (msg.node_id && msg.node_id !== this.nodeId) {
        this.lastPeerDiff   = diff;
        this.lastPeerWeight = weight;
      }

      this.registerSdmVisual(msg.node_id, diff, weight);
    }
  }

  /* ===========================
   *   Peers management
   * ===========================
   */

  updatePeers(peersRaw) {
    // превращаем payload PeersPayload { peers: [ {node_id}, ... ] }
    const ids = peersRaw
      .map((p) => (typeof p === "string" ? p : (p.node_id || p.id || "")))
      .filter(Boolean);

    if (!ids.length) {
      this.peers = [];
      return;
    }

    // сортируем, чтобы углы не прыгали каждый раз
    ids.sort();

    const existing = new Map(this.peers.map((p) => [p.id, p]));
    const count = ids.length;
    const baseR = this.radius * 0.86;

    const newPeers = ids.map((id, index) => {
      const angle = (index / count) * Math.PI * 2 - Math.PI / 2;
      let peer = existing.get(id);
      if (!peer) {
        peer = {
          id,
          angle,
          x: 0,
          y: 0,
          pulse: 0,
          lastSdmTime: 0,
        };
      }
      peer.angle = angle;
      peer.x = this.centerX + Math.cos(angle) * baseR;
      peer.y = this.centerY + Math.sin(angle) * baseR;
      return peer;
    });

    this.peers = newPeers;
  }

  registerSdmVisual(nodeId, diff, weight) {
    const mag = Math.hypot(diff[0] || 0, diff[1] || 0);
    const baseBoost = 0.15 + mag * 3.0 + (weight || 0) * 0.2;
    const boost = Math.min(1.5, baseBoost);

    // ядро чувствует любой SDM
    this.corePulse = Math.min(3.0, this.corePulse + boost * 0.7);

    // если это один из пиров — он вспыхивает
    const peer = this.peers.find((p) => p.id === nodeId);
    if (peer) {
      peer.pulse = Math.min(1.6, peer.pulse + boost);
      peer.lastSdmTime = performance.now();
    }
  }

  /* ===========================
   *   Drift / value dynamics
   * ===========================
   */

  generateEntropy() {
    return [Math.random() * 2 - 1, Math.random() * 2 - 1];
  }

  driftFromEntropy(E) {
    const m = Math.hypot(E[0], E[1]) || 1;
    return [(E[0] / m) * this.alpha, (E[1] / m) * this.alpha];
  }

  driftFromPeers() {
    if (!this.lastPeerDiff) return [0, 0];
    return [
      this.lastPeerDiff[0] * this.beta,
      this.lastPeerDiff[1] * this.beta,
    ];
  }

  vaultGuard(drift) {
    if (this.vu + drift[0] < 0) drift[0] = -this.vu;
    return drift;
  }

  applyDrift(d) {
    const MAX = 0.5;
    if (d[0] >  MAX) d[0] =  MAX;
    if (d[0] < -MAX) d[0] = -MAX;
    if (d[1] >  MAX) d[1] =  MAX;
    if (d[1] < -MAX) d[1] = -MAX;

    this.vu += d[0];

    const POS_SCALE = 18;
    this.selfX += d[0] * POS_SCALE;
    this.selfY += d[1] * POS_SCALE;

    const vx = this.selfX - this.centerX;
    const vy = this.selfY - this.centerY;
    const dist = Math.hypot(vx, vy) || 1;

    if (dist > this.radius * 0.7) {
      const k = (this.radius * 0.7) / dist;
      this.selfX = this.centerX + vx * k;
      this.selfY = this.centerY + vy * k;
    }

    this.selfTrail.push({ x: this.selfX, y: this.selfY });
    if (this.selfTrail.length > this.maxTrail) this.selfTrail.shift();
  }

  /* ===========================
   *   Rendering
   * ===========================
   */

  drawBackground() {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    const g = ctx.createRadialGradient(
      this.centerX,
      this.centerY,
      this.radius * 0.15,
      this.centerX,
      this.centerY,
      this.radius * 1.1
    );
    g.addColorStop(0, "#020617");
    g.addColorStop(1, "#000000");

    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // кольцо value-space
    ctx.beginPath();
    ctx.arc(this.centerX, this.centerY, this.radius, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(148,163,184,0.35)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 7]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  drawCore() {
    const ctx = this.ctx;
    const t = performance.now() * 0.004;

    // легкое фоновое дыхание
    const baseBreath = Math.sin(t) * 0.4 + 0.6;

    // затухание пульса ядра
    this.corePulse *= 0.92;
    const pulseLevel = this.corePulse;

    const size =
      9 + baseBreath * 3 + pulseLevel * 6 +
      Math.min(5, this.peers.length * 0.02); // чуть растёт с количеством нод

    ctx.beginPath();
    ctx.arc(this.centerX, this.centerY, size, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(14, 199, 255, 0.95)";
    ctx.shadowColor = "rgba(14, 199, 255, 0.9)";
    ctx.shadowBlur = 22 + pulseLevel * 14;
    ctx.fill();
    ctx.shadowBlur = 0;

    // маленький бликовый центр
    ctx.beginPath();
    ctx.arc(this.centerX - 2, this.centerY - 2, 3.2, 0, Math.PI * 2);
    ctx.fillStyle = "#e0f2fe";
    ctx.fill();
  }

  drawPeers() {
    const ctx = this.ctx;
    const t = performance.now() * 0.003;

    if (!this.peers.length) return;

    const n = this.peers.length;
    let baseSize = 4;
    if (n > 60)  baseSize = 3;
    if (n > 250) baseSize = 2;
    if (n > 800) baseSize = 1.5;

    for (const peer of this.peers) {
      // лёгкая вибрация вокруг своей точки
      const vibAmp = 1.0 + peer.pulse * 1.5;
      const offsetX = Math.sin(t * 3.1 + peer.angle * 4.3) * vibAmp;
      const offsetY = Math.cos(t * 2.6 + peer.angle * 3.7) * vibAmp;

      const x = peer.x + offsetX;
      const y = peer.y + offsetY;

      // луч к ядру при активности
      if (peer.pulse > 0.06) {
        ctx.beginPath();
        ctx.moveTo(this.centerX, this.centerY);
        ctx.lineTo(x, y);
        ctx.strokeStyle = `rgba(56,189,248,${0.15 + peer.pulse * 0.6})`;
        ctx.lineWidth = 0.8 + peer.pulse * 2.0;
        ctx.stroke();
      }

      // сама нода
      peer.pulse *= 0.9;

      const size = baseSize + peer.pulse * 4.0;

      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(59, 199, 255, ${0.5 + peer.pulse * 0.5})`;
      ctx.fill();
    }
  }

  drawSelf() {
    const ctx = this.ctx;

    // trail
    if (this.selfTrail.length > 1) {
      ctx.beginPath();
      for (let i = 0; i < this.selfTrail.length; i++) {
        const p = this.selfTrail[i];
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      ctx.strokeStyle = "rgba(96, 165, 250, 0.35)";
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    this.selfPulse *= 0.9;
    const size = 6 + this.selfPulse * 5;

    ctx.beginPath();
    ctx.arc(this.selfX, this.selfY, size, 0, Math.PI * 2);
    ctx.fillStyle = "#00d4ff";
    ctx.shadowColor = "rgba(0,180,255,0.9)";
    ctx.shadowBlur = 16 + this.selfPulse * 10;
    ctx.fill();
    ctx.shadowBlur = 0;

    // маленький блик
    ctx.beginPath();
    ctx.arc(this.selfX - 1.5, this.selfY - 1.5, 2.2, 0, Math.PI * 2);
    ctx.fillStyle = "#e0f2fe";
    ctx.fill();
  }

  redraw() {
    this.drawBackground();
    this.drawPeers();
    this.drawCore();
    this.drawSelf();
  }

  /* ===========================
   *   Main loop
   * ===========================
   */

  loop() {
    if (this.loopTimer) return;

    this.loopTimer = setInterval(() => {
      this.cycle++;

      const E  = this.generateEntropy();
      const d1 = this.driftFromEntropy(E);
      const d2 = this.driftFromPeers();

      let drift = [d1[0] + d2[0], d1[1] + d2[1]];
      drift = this.vaultGuard(drift);

      this.applyDrift(drift);
      this.sendSDM(drift);
      this.redraw();

      this.onCycle(this.cycle, this.vu, this.tc);
    }, 90); // ~11 fps, достаточно плавно и не грузит ЦП
  }
}

// экспорт
window.LVSBrowserNode = LVSBrowserNode;
