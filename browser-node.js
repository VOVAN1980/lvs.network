class LVSBrowserNode {
  constructor(nodeId, gatewayUrl, canvasId) {
    this.nodeId = nodeId;
    this.gatewayUrl = gatewayUrl;

    // аккаунт пользователя (может быть null)
    this.accountId = null;

    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext("2d");

    this.width  = this.canvas.width;
    this.height = this.canvas.height;

    this.centerX = this.width / 2;
    this.centerY = this.height / 2;
    this.radius  = Math.min(this.width, this.height) / 2 - 40;

    // состояние браузер-ноды
    this.ws    = null;
    this.vu    = 100.0;
    this.tc    = 0.5;
    this.cycle = 0;

    // дрейф
    this.alpha = 0.04;   // шум (энтропия)
    this.beta  = 0.06;   // чувствительность к пиру

    this.lastPeerDiff   = null;
    this.lastPeerWeight = null;

    // peers на кольце
    // [{ id, angle, x, y, pulse, lastSdmTime, isLeaving, fade }]
    this.peers = [];
    this.peerRingRadius = this.radius * 0.86;

    // ядро сети
    this.corePulse = 0;  // пульсация ядра от нагрузки

    // позиция самой browser-ноды (внутри круга)
    this.selfX = this.centerX;
    this.selfY = this.centerY;
    this.selfTrail = [];
    this.maxTrail  = 80;
    this.selfPulse = 0;

    // пружина к центру — чтобы self не "падал"
    this.springK = 0.015;

    // таймер цикла
    this.loopTimer = null;

    // флаг ручной остановки (чтобы не было автореконнекта после logout)
    this.manualStop = false;

    // колбэки для UI
    this.onStatus = () => {};
    this.onPeers  = () => {};
    this.onCycle  = () => {};
    this.onHello  = () => {};
    this.onSDM    = () => {};
  }

  // ===========================
  //   Публичные методы
  // ===========================

  start() {
    this.onStatus("connecting...");
    console.log("[LVS] connecting:", this.gatewayUrl);

    this.manualStop = false;

    // если вдруг что-то уже открыто — аккуратно закрываем
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try { this.ws.close(); } catch (e) {}
    }

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

      // если нас не остановили вручную — пробуем переподключиться
      if (!this.manualStop) {
        setTimeout(() => this.start(), 1500);
      }
    };

    this.ws.onerror = (err) => {
      this.onStatus("error");
      console.log("[LVS] ws error:", err);
    };

    this.ws.onmessage = (ev) => this.handleMessage(ev.data);
  }

  stop() {
    // ручная остановка: больше не автореконнектимся
    this.manualStop = true;

    if (this.loopTimer) {
      clearInterval(this.loopTimer);
      this.loopTimer = null;
    }

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.close();
      } catch (e) {
        console.warn("[LVS] stop(): ws close error", e);
      }
    }
  }

  // ===========================
  //   Вспомогательные send
  // ===========================

  send(msg) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  sendHello() {
    const msg = {
      type: "hello",
      node_id: this.nodeId,
      account_id: this.accountId || null,
      payload: {
        kind: "browser",
        version: "0.5.0",
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

    // вспышка для собственной точки
    this.selfPulse = Math.min(1.3, this.selfPulse + 0.6);
    this.onSDM(diff[0]);
  }

  // ===========================
  //   Handle incoming messages
  // ===========================

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

  // ===========================
  //   Peers ring (c fade-out)
  // ===========================

  updatePeers(peersRaw) {
    // забираем node_id, но отбрасываем self
    const ids = peersRaw
      .map((p) => (typeof p === "string" ? p : (p.node_id || p.id || "")))
      .filter((id) => id && id !== this.nodeId);

    const existing = new Map(this.peers.map((p) => [p.id, p]));
    const usedIds  = new Set();
    const count    = ids.length || 1;

    const newPeers = [];

    // актуальные (живые) ноды
    ids.sort().forEach((id, index) => {
      usedIds.add(id);
      let peer = existing.get(id);
      const baseAngle = (index / count) * Math.PI * 2 - Math.PI / 2;

      if (!peer) {
        peer = {
          id,
          angle: baseAngle,
          x: 0,
          y: 0,
          pulse: 0,
          lastSdmTime: 0,
          isLeaving: false,
          fade: 1.0,
        };
      } else {
        peer.angle     = baseAngle;
        peer.isLeaving = false;
        peer.fade      = 1.0; // вернулся в онлайн
      }

      peer.x = this.centerX + Math.cos(peer.angle) * this.peerRingRadius;
      peer.y = this.centerY + Math.sin(peer.angle) * this.peerRingRadius;

      newPeers.push(peer);
    });

    // старые ноды, которых больше нет в списке → помечаем как "уходящие"
    existing.forEach((peer, id) => {
      if (!usedIds.has(id)) {
        if (!peer.isLeaving) {
          peer.isLeaving = true;
          if (peer.fade == null) peer.fade = 1.0;
        }
        newPeers.push(peer);
      }
    });

    this.peers = newPeers;
  }

  registerSdmVisual(nodeId, diff, weight) {
    // свои SDM визуально НЕ считаем в ядро/peers
    if (!nodeId || nodeId === this.nodeId) {
      return;
    }

    const mag = Math.hypot(diff[0] || 0, diff[1] || 0);
    const baseBoost = 0.15 + mag * 3.0 + (weight || 0) * 0.2;
    const boost = Math.min(1.5, baseBoost);

    // ядро чувствует внешнюю активность
    this.corePulse = Math.min(3.0, this.corePulse + boost * 0.7);

    const peer = this.peers.find((p) => p.id === nodeId);
    if (peer) {
      peer.pulse = Math.min(1.6, peer.pulse + boost);
      peer.lastSdmTime = performance.now();
    }
  }

  // ===========================
  //   Value drift
  // ===========================

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
    // пружина к центру
    const dxCenter = this.centerX - this.selfX;
    const dyCenter = this.centerY - this.selfY;
    d[0] += dxCenter * this.springK;
    d[1] += dyCenter * this.springK;

    // ограничиваем скорость
    const MAX = 0.4;
    if (d[0] >  MAX) d[0] =  MAX;
    if (d[0] < -MAX) d[0] = -MAX;
    if (d[1] >  MAX) d[1] =  MAX;
    if (d[1] < -MAX) d[1] = -MAX;

    // обновляем VU
    this.vu += d[0];

    // сдвиг точки
    const POS_SCALE = 16;
    this.selfX += d[0] * POS_SCALE;
    this.selfY += d[1] * POS_SCALE;

    // жёсткий предел: 70% радиуса
    const vx = this.selfX - this.centerX;
    const vy = this.selfY - this.centerY;
    const dist = Math.hypot(vx, vy) || 1;
    const maxR = this.radius * 0.7;

    if (dist > maxR) {
      const k = maxR / dist;
      this.selfX = this.centerX + vx * k;
      this.selfY = this.centerY + vy * k;
    }

    this.selfTrail.push({ x: this.selfX, y: this.selfY });
    if (this.selfTrail.length > this.maxTrail) this.selfTrail.shift();
  }

  // ===========================
  //   Rendering
  // ===========================

  drawBackground() {
    const ctx = this.ctx;

    const g = ctx.createRadialGradient(
      this.centerX,
      this.centerY,
      this.radius * 0.15,
      this.centerX,
      this.centerY,
      this.radius * 1.2
    );
    g.addColorStop(0, "#020617");
    g.addColorStop(1, "#000000");

    ctx.fillStyle = g;
    ctx.fillRect(0, 0, this.width, this.height);

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

    const baseBreath = Math.sin(t) * 0.4 + 0.6;

    this.corePulse *= 0.92;
    const pulseLevel = this.corePulse;

    const size =
      9 +
      baseBreath * 3 +
      pulseLevel * 6 +
      Math.min(6, this.peers.length * 0.02) +
      this.tc * 4;

    ctx.beginPath();
    ctx.arc(this.centerX, this.centerY, size, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(14,199,255,0.96)";
    ctx.shadowColor = "rgba(14,199,255,0.95)";
    ctx.shadowBlur = 22 + pulseLevel * 14;
    ctx.fill();
    ctx.shadowBlur = 0;

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
    if (n > 800) baseSize = 1.4;

    const nextPeers = [];

    for (const peer of this.peers) {
      // медленная орбита вокруг ядра
      peer.angle += 0.0006;
      peer.x = this.centerX + Math.cos(peer.angle) * this.peerRingRadius;
      peer.y = this.centerY + Math.sin(peer.angle) * this.peerRingRadius;

      // глобальная прозрачность для fade-out
      if (peer.isLeaving) {
        peer.fade = (peer.fade ?? 1.0) * 0.88;   // скорость затухания
        if (peer.fade < 0.03) {
          // полностью исчез → не кладём в nextPeers
          continue;
        }
      } else {
        peer.fade = 1.0;
      }

      // лёгкая вибрация
      const vibAmp = 1.0 + peer.pulse * 1.2;
      const offsetX = Math.sin(t * 3.1 + peer.angle * 4.3) * vibAmp;
      const offsetY = Math.cos(t * 2.6 + peer.angle * 3.7) * vibAmp;

      const x = peer.x + offsetX;
      const y = peer.y + offsetY;

      // луч к ядру при активности
      if (peer.pulse > 0.06) {
        ctx.beginPath();
        ctx.moveTo(this.centerX, this.centerY);
        ctx.lineTo(x, y);
        const alphaLine = (0.15 + peer.pulse * 0.6) * peer.fade;
        ctx.strokeStyle = `rgba(56,189,248,${alphaLine})`;
        ctx.lineWidth = (0.8 + peer.pulse * 2.0) * peer.fade;
        ctx.stroke();
      }

      peer.pulse *= 0.9;
      const size = (baseSize + peer.pulse * 4.0) * peer.fade;

      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      const alphaDot = (0.5 + peer.pulse * 0.5) * peer.fade;
      ctx.fillStyle = `rgba(59,199,255,${alphaDot})`;
      ctx.fill();

      // оставляем peer в списке, если он ещё видим
      nextPeers.push(peer);
    }

    this.peers = nextPeers;
  }

  drawSelf() {
    const ctx = this.ctx;

    // хвост движения browser-ноды
    if (this.selfTrail.length > 1) {
      ctx.beginPath();
      for (let i = 0; i < this.selfTrail.length; i++) {
        const p = this.selfTrail[i];
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      ctx.strokeStyle = "rgba(96,165,250,0.38)";
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

  // ===========================
  //   Main loop
  // ===========================

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
    }, 90); // ~11 FPS
  }
}

// экспорт в window
window.LVSBrowserNode = LVSBrowserNode;
