class LVSBrowserNode {
  constructor(nodeId, gatewayUrl, canvasId) {
    this.nodeId = nodeId;
    this.gatewayUrl = gatewayUrl;

    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext("2d");

    // геометрия области
    this.centerX = this.canvas.width / 2;
    this.centerY = this.canvas.height / 2;
    this.radius  = Math.min(this.canvas.width, this.canvas.height) / 2 - 30;

    // стартовая позиция точки — в центре
    this.x = this.centerX;
    this.y = this.centerY;

    // состояние
    this.ws = null;
    this.vu = 100.0;
    this.tc = 0.5;
    this.cycle = 0;

    // плавность дрейфа
    this.alpha = 0.04; // локальный шум
    this.beta  = 0.06; // влияние пиров по ΔVU

    // последние данные от пиров
    this.lastPeerDeltaVu = null; // СКАЛЯР ΔVU
    this.lastPeerWeight  = null;
    this.lastPeerId      = null;

    // трек движения (для "кривой")
    this.trail = [];
    this.maxTrail = 140;

    // таймер цикла
    this.loopTimer = null;

    // карта пиров, которых реально видим по hello/sdm
    // { id, kind, role, last_seen }
    this.peers = new Map();

    // колбэки — навешиваются из HTML
    this.onStatus = () => {};
    this.onPeers  = () => {};
    this.onCycle  = () => {};
    this.onHello  = () => {};
    this.onSDM    = () => {};
  }

  // ========= вспомогательное =========

  _registerPeer(id, meta = {}) {
    if (!id || id === this.nodeId) return;

    const prev = this.peers.get(id) || {};
    const next = {
      id,
      kind: meta.kind || prev.kind || "node",
      role: meta.role || prev.role || "",
      last_seen: Date.now(),
    };
    this.peers.set(id, next);

    // всегда отдаём наружу свой snapshot,
    // а не сырое payload от гейтвея
    this.onPeers(Array.from(this.peers.values()));
  }

  // ===================================
  //           запуск / reconnect
  // ===================================

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

  // ===================================
  //                отправка
  // ===================================

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
        version: "0.2.3",
      },
    };
    console.log("[LVS] → hello", msg);
    this.send(msg);
  }

  requestPeers() {
    const msg = {
      type: "peers_request",
      node_id: this.nodeId,
    };
    console.log("[LVS] → peers_request");
    this.send(msg);
  }

  /**
   * diffLocal — наш локальный ΔVU (первый компонент 2D-дрейфа)
   */
  sendSDM(diffLocal) {
    const deltaVu = diffLocal[0];

    const msg = {
      type: "sdm",
      node_id: this.nodeId,
      payload: {
        // протокольный формат: [ΔVU, TC, VU]
        diff: [deltaVu, this.tc, this.vu],
        weight: this.tc,
        cycle_id: this.cycle,
      },
    };
    this.send(msg);
    this.onSDM(deltaVu);
  }

  // ===================================
  //                 приём
  // ===================================

  handleMessage(txt) {
    let msg;
    try {
      msg = JSON.parse(txt);
    } catch {
      return;
    }

    // hello от других нод
    if (msg.type === "hello" && msg.node_id !== this.nodeId) {
      this._registerPeer(msg.node_id, {
        kind: msg.payload?.kind || "node",
        role: msg.payload?.role || "",
      });
      this.onHello(msg.node_id);
    }

    // список пиров от гейтвея — используем как подсказку,
    // но всё равно регистрируем в своей peers-Map
    if (msg.type === "peers" || msg.type === "peers_response") {
      const peers = msg.payload?.peers || [];
      peers.forEach((p) => {
        if (typeof p === "string") {
          this._registerPeer(p, { kind: "node" });
        } else if (p) {
          const id   = p.id || p.node_id;
          const kind = p.kind || p.role || "node";
          this._registerPeer(id, { kind });
        }
      });
      return;
    }

    // входящие SDM от других нод
    if (msg.type === "sdm" && msg.node_id !== this.nodeId) {
      const diff = msg.payload?.diff;
      if (Array.isArray(diff) && diff.length >= 1) {
        this.lastPeerDeltaVu = diff[0]; // только ΔVU
      } else {
        this.lastPeerDeltaVu = null;
      }
      this.lastPeerWeight = msg.payload.weight;
      this.lastPeerId     = msg.node_id;

      // считаем этого отправителя peer'ом
      this._registerPeer(msg.node_id, { kind: "core" });
    }
  }

  // ===================================
  //                дрейф
  // ===================================

  generateEntropy() {
    // чисто локальный 2D-шум
    return [Math.random() * 2 - 1, Math.random() * 2 - 1];
  }

  driftFromEntropy(E) {
    const m = Math.hypot(E[0], E[1]) || 1;
    return [(E[0] / m) * this.alpha, (E[1] / m) * this.alpha];
  }

  /**
   * peer-дрейф — только по X (ΔVU),
   * Y от пиров не берём, иначе всё плывёт.
   */
  driftFromPeers() {
    if (this.lastPeerDeltaVu == null) return [0, 0];
    return [
      this.lastPeerDeltaVu * this.beta,
      0,
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

    // VU меняется только по X-компоненте
    this.vu += d[0];

    const POS_SCALE = 22;
    this.x += d[0] * POS_SCALE;
    this.y += d[1] * POS_SCALE;

    // держим точку внутри круга
    const vx = this.x - this.centerX;
    const vy = this.y - this.centerY;
    const dist = Math.hypot(vx, vy) || 1;

    if (dist > this.radius) {
      const k = this.radius / dist;
      this.x = this.centerX + vx * k;
      this.y = this.centerY + vy * k;
    }

    // агрессивная центровка по Y, чтобы не залипало снизу/сверху
    this.y += (this.centerY - this.y) * 0.08;
    // лёгкая центровка по X, чтобы VU не висел на краю вечно
    this.x += (this.centerX - this.x) * 0.01;

    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > this.maxTrail) this.trail.shift();
  }

  // ===================================
  //              отрисовка
  // ===================================

  draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.clearRect(0, 0, w, h);

    const g = ctx.createRadialGradient(
      this.centerX,
      this.centerY,
      this.radius * 0.1,
      this.centerX,
      this.centerY,
      this.radius
    );
    g.addColorStop(0, "#020617");
    g.addColorStop(1, "#000000");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    ctx.beginPath();
    ctx.arc(this.centerX, this.centerY, this.radius, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(148,163,184,0.45)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 6]);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.beginPath();
    ctx.moveTo(this.centerX, this.centerY);
    ctx.lineTo(this.x, this.y);
    ctx.strokeStyle = "rgba(56,189,248,0.25)";
    ctx.lineWidth = 1.2;
    ctx.stroke();

    if (this.trail.length > 1) {
      ctx.beginPath();
      for (let i = 0; i < this.trail.length; i++) {
        const p = this.trail[i];
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      const tailGrad = ctx.createLinearGradient(0, 0, w, h);
      tailGrad.addColorStop(0, "rgba(56,189,248,0.05)");
      tailGrad.addColorStop(1, "rgba(56,189,248,0.35)");
      ctx.strokeStyle = tailGrad;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.arc(this.x, this.y, 6, 0, Math.PI * 2);
    ctx.fillStyle = "#00d4ff";
    ctx.shadowColor = "rgba(0,180,255,0.8)";
    ctx.shadowBlur = 14;
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.beginPath();
    ctx.arc(this.x - 2, this.y - 2, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = "#e0f2fe";
    ctx.fill();
  }

  // ===================================
  //             основной цикл
  // ===================================

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
      this.draw();

      this.onCycle(this.cycle, this.vu, this.tc);
    }, 120);
  }
}

window.LVSBrowserNode = LVSBrowserNode;
