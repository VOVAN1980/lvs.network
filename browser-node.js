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

    // экранная позиция частицы
    this.x = this.centerX;
    this.y = this.centerY;

    // состояние
    this.ws = null;
    this.vu = 100.0;
    this.tc = 0.5;
    this.cycle = 0;

    // параметры “сырого” дрейфа по VU
    this.alpha = 0.04; // шум
    this.beta  = 0.06; // вклад пиров в ΔVU

    // короткая память по сети
    this.lastPeerId      = null;
    this.lastPeerDeltaVu = 0.0;

    // --- физика центра в value-space ---
    // центр сидит около (0,0) и вибрирует на пружине
    this.centerPos = { x: 0, y: 0 };
    this.centerVel = { x: 0, y: 0 };

    // энергия "сердцебиения" и счётчик SDM за кадр
    this.centerBeat        = 0;    // 0..~0.8
    this.centerSdmCounter  = 0;    // сколько SDM пришло с прошлого тика

    // общая фаза пульса (делим её с нодами по окружности)
    this.pulsePhase = 0;

    // след
    this.trail = [];
    this.maxTrail = 90;

    this.loopTimer = null;
    this.lastFrameTime = performance.now() / 1000;

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

  // стабильно сортируем пиров по id → угол на круге
  _peerAngle(nodeId) {
    const arr = Array.from(this.peers.values()).sort((a, b) =>
      a.id.localeCompare(b.id)
    );
    const idx = arr.findIndex((p) => p.id === nodeId);
    if (idx === -1 || arr.length === 0) {
      return -Math.PI / 2; // по умолчанию сверху
    }
    const n = arr.length;
    return (idx / n) * Math.PI * 2 - Math.PI / 2;
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
        version: "0.4.0",
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
      if (!Array.isArray(diff) || diff.length < 1) return;

      const deltaVu = diff[0]; // реальный ΔVU от ноды
      const weight  = msg.payload?.weight ?? 0.5;
      const fromId  = msg.node_id;

      this.lastPeerId      = fromId;
      this.lastPeerDeltaVu = deltaVu;

      // считаем сетевую активность
      this.centerSdmCounter += 1;

      // небольшой "пинок" центра в сторону этой ноды
      const angle        = this._peerAngle(fromId);
      const baseStrength = Math.abs(deltaVu) * weight;
      const kick         = baseStrength * 0.4;

      this.centerVel.x += Math.cos(angle) * kick;
      this.centerVel.y += Math.sin(angle) * kick;

      // энергия сердцебиения растёт от активности
      this.centerBeat = Math.min(0.8, this.centerBeat + baseStrength * 2.5);
    }
  }

  // ---------- дрейф / обновление состояния ----------

  generateEntropy() {
    return [Math.random() * 2 - 1, Math.random() * 2 - 1];
  }

  driftFromEntropy(E) {
    const m = Math.hypot(E[0], E[1]) || 1;
    return [(E[0] / m) * this.alpha, (E[1] / m) * this.alpha];
  }

  driftFromPeers() {
    // browser-нода сама по себе: чуть реагирует на последний ΔVU
    const k = this.lastPeerDeltaVu * this.beta;
    return [k, 0];
  }

  vaultGuard(drift) {
    if (this.vu + drift[0] < 0) drift[0] = -this.vu;
    return drift;
  }

  applyDrift(d) {
    // обновляем VU
    this.vu += d[0];

    // чуть подмешиваем энергии сердцебиения от собственного дрейфа
    const add = Math.abs(d[0]) * 0.5;
    this.centerBeat = Math.min(0.8, this.centerBeat + add);
  }

  // dt — в секундах
  updateMotion(dt) {
    if (!Number.isFinite(dt) || dt <= 0) dt = 0.1;

    // 0) SDM → энергия
    const BEAT_PER_SDM = 0.03;
    this.centerBeat += this.centerSdmCounter * BEAT_PER_SDM;
    this.centerSdmCounter = 0;

    // 1) физика пружины вокруг (0,0)
    const targetX = 0;
    const targetY = 0;

    const STIFFNESS = 4.0; // жёсткость пружины
    const DAMPING   = 3.0; // демпфирование

    const ax = (targetX - this.centerPos.x) * STIFFNESS;
    const ay = (targetY - this.centerPos.y) * STIFFNESS;

    this.centerVel.x += ax * dt;
    this.centerVel.y += ay * dt;

    const dampingFactor = Math.exp(-DAMPING * dt);
    this.centerVel.x *= dampingFactor;
    this.centerVel.y *= dampingFactor;

    this.centerPos.x += this.centerVel.x * dt;
    this.centerPos.y += this.centerVel.y * dt;

    // ограничим разброс центра (на всякий)
    const maxRad = 1.5;
    const r = Math.hypot(this.centerPos.x, this.centerPos.y);
    if (r > maxRad) {
      this.centerPos.x = (this.centerPos.x / r) * maxRad;
      this.centerPos.y = (this.centerPos.y / r) * maxRad;
    }

    // 2) затухание энергии сердцебиения
    const BEAT_DECAY = 2.0;
    this.centerBeat *= Math.exp(-BEAT_DECAY * dt);
    if (this.centerBeat < 0) this.centerBeat = 0;
    if (this.centerBeat > 0.8) this.centerBeat = 0.8;

    // 3) общая фаза пульса (делим её с нодами на кольце)
    const BASE_PULSE_FREQ = 4.0; // Гц
    this.pulsePhase += BASE_PULSE_FREQ * dt;
    if (this.pulsePhase > Math.PI * 2) this.pulsePhase -= Math.PI * 2;

    // 4) переход в экранные координаты
    const wobbleScale = 0.02 * this.radius; // 2% радиуса по каждой оси
    const visualX = this.centerX + this.centerPos.x * wobbleScale;
    const visualY = this.centerY + this.centerPos.y * wobbleScale;

    this.x = visualX;
    this.y = visualY;

    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > this.maxTrail) this.trail.shift();
  }

  // ---------- отрисовка ----------

  draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.clearRect(0, 0, w, h);

    // общая "яркость" от синуса + энергии сети
    const sinBeat = 0.5 + 0.5 * Math.sin(this.pulsePhase);
    let globalGlow = sinBeat * 0.6 + this.centerBeat * 1.0;
    if (globalGlow < 0) globalGlow = 0;
    if (globalGlow > 1.2) globalGlow = 1.2;

    const visRadius  = this.radius * (0.96 + 0.05 * globalGlow);

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

    // круг
    ctx.beginPath();
    ctx.arc(this.centerX, this.centerY, visRadius, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(148,163,184,0.45)";
    ctx.lineWidth = 1.3;
    ctx.setLineDash([4, 6]);
    ctx.stroke();
    ctx.setLineDash([]);

    // ноды по окружности
    const peersArr = Array.from(this.peers.values()).sort((a, b) =>
      a.id.localeCompare(b.id)
    );
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
          0.5 + 0.5 * Math.sin(this.pulsePhase + idx * 0.5);
        const glow = 0.4 + 0.6 * (globalGlow * 0.7 + localBeat * 0.3);

        const baseR = isActive ? 5 : 4;
        const nodeR = baseR + glow * (isActive ? 2.0 : 1.2);

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

    // луч от геометрического центра к частице
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

    // центральная частица (сердце)
    const coreR = 6 + globalGlow * 3.0;

    ctx.beginPath();
    ctx.arc(this.x, this.y, coreR, 0, Math.PI * 2);
    ctx.fillStyle = "#00d4ff";
    ctx.shadowColor = "rgba(0,180,255,0.9)";
    ctx.shadowBlur = 12 + globalGlow * 10;
    ctx.fill();
    ctx.shadowBlur = 0;

    // яркое ядро внутри
    ctx.beginPath();
    ctx.arc(this.x - 2, this.y - 2, 2.6, 0, Math.PI * 2);
    ctx.fillStyle = "#e0f2fe";
    ctx.fill();
  }

  // ---------- основной цикл ----------

  loop() {
    if (this.loopTimer) return;

    this.loopTimer = setInterval(() => {
      const now = performance.now() / 1000;
      let dt = now - this.lastFrameTime;
      if (!Number.isFinite(dt) || dt <= 0 || dt > 0.5) dt = 0.12;
      this.lastFrameTime = now;

      this.cycle++;

      const E  = this.generateEntropy();
      const d1 = this.driftFromEntropy(E);
      const d2 = this.driftFromPeers();

      let drift = [d1[0] + d2[0], d1[1] + d2[1]];
      drift = this.vaultGuard(drift);

      this.applyDrift(drift);
      this.updateMotion(dt);
      this.draw();

      this.onCycle(this.cycle, this.vu, this.tc);
      this.sendSDM(drift);
    }, 120);
  }
}

window.LVSBrowserNode = LVSBrowserNode;
