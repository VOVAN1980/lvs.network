class LVSBrowserNode {
  constructor(nodeId, gatewayUrl, canvasId) {
    this.nodeId = nodeId;
    this.gatewayUrl = gatewayUrl;

    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext("2d");

    // геометрия
    this.centerX = this.canvas.width / 2;
    this.centerY = this.canvas.height / 2;
    this.radius  = Math.min(this.canvas.width, this.canvas.height) / 2 - 30;

    // позиция (будет вокруг центра)
    this.x = this.centerX;
    this.y = this.centerY;

    // состояние
    this.ws = null;
    this.vu = 100.0;
    this.tc = 0.5;
    this.cycle = 0;

    // параметры дрейфа (по VU)
    this.alpha = 0.04; // шум
    this.beta  = 0.06; // вклад пиров в ΔVU

    // последние данные от пиров
    this.lastPeerDeltaVu = null;
    this.lastPeerWeight  = null;
    this.lastPeerId      = null;

    // "сердцебиение"
    this.pulsePhase  = 0;      // фаза
    this.pulseEnergy = 0.3;    // 0..1 — сколько энергии в сети
    this.jitterPhase = Math.random() * Math.PI * 2; // для индивидуального рисунка

    // след
    this.trail = [];
    this.maxTrail = 90;

    this.loopTimer = null;

    // peers: Map<id, { id, kind, role, last_seen }>
    this.peers = new Map();

    // колбэки
    this.onStatus = () => {};
    this.onPeers  = () => {};
    this.onCycle  = () => {};
    this.onHello  = () => {};
    this.onSDM    = () => {};
  }

  // ---------- peers helper ----------

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

    this.onPeers(Array.from(this.peers.values()));
  }

  // ---------- запуск / reconnect ----------

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

  // ---------- отправка ----------

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

  sendSDM(drift) {
    const deltaVu = drift[0];

    const msg = {
      type: "sdm",
      node_id: this.nodeId,
      payload: {
        diff: [deltaVu, this.tc, this.vu],
        weight: this.tc,
        cycle_id: this.cycle,
      },
    };
    this.send(msg);
    this.onSDM(deltaVu);
  }

  // ---------- приём ----------

  handleMessage(txt) {
    let msg;
    try {
      msg = JSON.parse(txt);
    } catch {
      return;
    }

    if (msg.type === "hello" && msg.node_id !== this.nodeId) {
      const kind = msg.payload?.kind || "node";
      this._registerPeer(msg.node_id, { kind });
      this.onHello(msg.node_id);
    }

    if (msg.type === "peers") {
      const peersPayload = msg.payload?.peers || [];
      peersPayload.forEach((p) => {
        const id = p.node_id;
        this._registerPeer(id, { kind: "node" });
      });
      return;
    }

    if (msg.type === "sdm" && msg.node_id !== this.nodeId) {
      const diff = msg.payload?.diff;
      if (Array.isArray(diff) && diff.length >= 1) {
        this.lastPeerDeltaVu = diff[0]; // скаляр ΔVU
      } else {
        this.lastPeerDeltaVu = null;
      }
      this.lastPeerWeight = msg.payload?.weight;
      this.lastPeerId     = msg.node_id;
    }
  }

  // ---------- дрейф / "сердцебиение" ----------

  generateEntropy() {
    return [Math.random() * 2 - 1, Math.random() * 2 - 1];
  }

  driftFromEntropy(E) {
    const m = Math.hypot(E[0], E[1]) || 1;
    return [(E[0] / m) * this.alpha, (E[1] / m) * this.alpha];
  }

  driftFromPeers() {
    if (this.lastPeerDeltaVu == null) return [0, 0];
    return [this.lastPeerDeltaVu * this.beta, 0];
  }

  vaultGuard(drift) {
    if (this.vu + drift[0] < 0) drift[0] = -this.vu;
    return drift;
  }

  applyDrift(d) {
    // VU обновляем, но позицию больше не двигаем от дрифта
    this.vu += d[0];

    // энергия сети затухает
    this.pulseEnergy *= 0.92;

    // и подпитывается от активности (модуль ΔVU)
    const dv = Math.abs(d[0] || 0);
    const boost = Math.min(dv * 10, 0.35);
    this.pulseEnergy = Math.min(1, this.pulseEnergy + boost);
  }

  updateMotion() {
    // на каждый тик — продвигаем фазу
    this.pulsePhase += 0.18;
    if (this.pulsePhase > Math.PI * 2) {
      this.pulsePhase -= Math.PI * 2;
    }

    const beat = 0.5 + 0.5 * Math.sin(this.pulsePhase); // 0..1
    const baseAmp = this.radius * 0.06;

    // итоговая амплитуда — смесь "энергии сети" и самого биения
    const amp =
      baseAmp *
      (0.3 +
        0.9 * (this.pulseEnergy * 0.7 + beat * 0.3));

    // маленькая фигура Лиссажу вокруг центра
    const ox =
      Math.cos(this.pulsePhase * 1.7 + this.jitterPhase) *
      amp *
      0.9;
    const oy =
      Math.sin(this.pulsePhase * 1.1 + this.jitterPhase * 0.6) *
      amp;

    this.x = this.centerX + ox;
    this.y = this.centerY + oy;

    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > this.maxTrail) this.trail.shift();
  }

  // ---------- отрисовка ----------

  draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.clearRect(0, 0, w, h);

    const beat     = 0.5 + 0.5 * Math.sin(this.pulsePhase); // 0..1
    const globalGlow = this.pulseEnergy * 0.7 + beat * 0.3;  // 0..1
    const visRadius  = this.radius * (0.96 + 0.04 * globalGlow);

    // фон
    const g = ctx.createRadialGradient(
      this.centerX,
      this.centerY,
      visRadius * 0.1,
      this.centerX,
      this.centerY,
      visRadius
    );
    g.addColorStop(0, "#020617");
    g.addColorStop(1, "#000000");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // внешний круг
    ctx.beginPath();
    ctx.arc(this.centerX, this.centerY, visRadius, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(148,163,184,0.45)";
    ctx.lineWidth = 1.3;
    ctx.setLineDash([4, 6]);
    ctx.stroke();
    ctx.setLineDash([]);

    // ноды по окружности, пульсируют вместе с центром
    const peersArr = Array.from(this.peers.values());
    const n = peersArr.length;
    if (n > 0) {
      const rRing = visRadius - 10;
      peersArr.forEach((p, idx) => {
        const kind = (p.kind || "").toLowerCase();
        const angle = (idx / n) * Math.PI * 2 - Math.PI / 2;

        const px = this.centerX + Math.cos(angle) * rRing;
        const py = this.centerY + Math.sin(angle) * rRing;

        const isActive = this.lastPeerId === p.id;

        const localBeat =
          0.5 + 0.5 * Math.sin(this.pulsePhase + idx * 0.4);
        const glow = 0.4 + 0.6 * (globalGlow * 0.7 + localBeat * 0.3);

        const baseR = isActive ? 5 : 4;
        const nodeR = baseR + glow * (isActive ? 2.2 : 1.4);

        ctx.beginPath();
        ctx.arc(px, py, nodeR, 0, Math.PI * 2);

        const baseColor =
          kind === "rust"
            ? "rgba(74, 222, 128,"
            : "rgba(56, 189, 248,";

        ctx.fillStyle = `${baseColor}${0.4 + 0.6 * glow})`;
        ctx.shadowColor = "rgba(56,189,248,0.7)";
        ctx.shadowBlur = 6 + glow * 10;
        ctx.fill();
        ctx.shadowBlur = 0;
      });
    }

    // луч от центра
    ctx.beginPath();
    ctx.moveTo(this.centerX, this.centerY);
    ctx.lineTo(this.x, this.y);
    ctx.strokeStyle = "rgba(56,189,248,0.25)";
    ctx.lineWidth = 1.1;
    ctx.stroke();

    // хвост
    if (this.trail.length > 1) {
      ctx.beginPath();
      for (let i = 0; i < this.trail.length; i++) {
        const p = this.trail[i];
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      const tailGrad = ctx.createLinearGradient(0, 0, w, h);
      tailGrad.addColorStop(0, "rgba(56,189,248,0.05)");
      tailGrad.addColorStop(1, "rgba(56,189,248,0.45)");
      ctx.strokeStyle = tailGrad;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // центральный шарик
    const coreR = 6 + globalGlow * 2.5;

    ctx.beginPath();
    ctx.arc(this.x, this.y, coreR, 0, Math.PI * 2);
    ctx.fillStyle = "#00d4ff";
    ctx.shadowColor = "rgba(0,180,255,0.9)";
    ctx.shadowBlur = 12 + globalGlow * 10;
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.beginPath();
    ctx.arc(this.x - 2, this.y - 2, 2.8, 0, Math.PI * 2);
    ctx.fillStyle = "#e0f2fe";
    ctx.fill();
  }

  // ---------- основной цикл ----------

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
      this.updateMotion();
      this.draw();

      this.onCycle(this.cycle, this.vu, this.tc);
      this.sendSDM(drift);
    }, 120);
  }
}

window.LVSBrowserNode = LVSBrowserNode;
