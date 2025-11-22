class LVSBrowserNode {
  constructor(nodeId, gatewayUrl, canvasId) {
    this.nodeId = nodeId;
    this.gatewayUrl = gatewayUrl;

    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext("2d");

    // Геометрия value-space
    this.centerX = this.canvas.width / 2;
    this.centerY = this.canvas.height / 2;
    this.radius  = Math.min(this.canvas.width, this.canvas.height) / 2 - 30;

    // Позиция и скорость браузер-ноды
    this.x  = this.centerX;
    this.y  = this.centerY;
    this.vx = 0;
    this.vy = 0;

    // Состояние
    this.ws    = null;
    this.vu    = 100.0;
    this.tc    = 0.5;
    this.cycle = 0;

    // Параметры дрейфа
    this.alpha = 0.03;  // сила локального шума
    this.beta  = 0.045; // влияние пиров (масштаб peer-сил)

    // Последние данные от пиров
    this.lastPeerDeltaVu = null; // ΔVU от последней rust-ноды
    this.lastPeerWeight  = null;
    this.lastPeerId      = null;

    // Трек движения ("хвост")
    this.trail    = [];
    this.maxTrail = 180;

    this.loopTimer = null;

    // peers: Map<node_id, {id, kind, role, last_seen}>
    this.peers = new Map();

    // Колбэки навешиваются снаружи
    this.onStatus = () => {};
    this.onPeers  = () => {};
    this.onCycle  = () => {};
    this.onHello  = () => {};
    this.onSDM    = () => {};
  }

  // ---------- helpers для peers ----------

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

  // ---------- старт / reconnect ----------

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

  sendSDM(localDeltaVu) {
    const msg = {
      type: "sdm",
      node_id: this.nodeId,
      payload: {
        // наш локальный SDM в том же формате, что и у Rust-нод
        diff: [localDeltaVu, this.tc, this.vu],
        weight: this.tc,
        cycle_id: this.cycle,
      },
    };
    this.send(msg);
    this.onSDM(localDeltaVu);
  }

  // ---------- приём ----------

  handleMessage(txt) {
    let msg;
    try {
      msg = JSON.parse(txt);
    } catch {
      return;
    }

    // HELLO от других нод
    if (msg.type === "hello" && msg.node_id !== this.nodeId) {
      const kind = msg.payload?.kind || "node";
      this._registerPeer(msg.node_id, { kind });
      this.onHello(msg.node_id);
    }

    // Список пиров от gateway
    if (msg.type === "peers") {
      const peersPayload = msg.payload?.peers || [];
      peersPayload.forEach((p) => {
        const id = p.node_id;
        this._registerPeer(id, { kind: "node" });
      });
      return;
    }

    // SDM от Rust-нод
    if (msg.type === "sdm" && msg.node_id !== this.nodeId) {
      const diff = msg.payload?.diff;
      if (Array.isArray(diff) && diff.length >= 1) {
        this.lastPeerDeltaVu = diff[0]; // ΔVU rust-ноды
      } else {
        this.lastPeerDeltaVu = null;
      }
      this.lastPeerWeight = msg.payload?.weight ?? null;
      this.lastPeerId     = msg.node_id;
    }
  }

  // ---------- дрейф / физика ----------

  generateEntropy() {
    const ex = Math.random() * 2 - 1;
    const ey = Math.random() * 2 - 1;
    const m = Math.hypot(ex, ey) || 1;
    return [ex / m, ey / m];
  }

  driftFromEntropy(E) {
    return [E[0] * this.alpha, E[1] * this.alpha];
  }

  driftFromPeers() {
    if (!this.lastPeerId || this.lastPeerDeltaVu == null) return [0, 0];

    // позиция rust-ноды на окружности
    const angle = this._hashAngle(this.lastPeerId) - Math.PI / 2;
    const r     = this.radius * 0.75;

    const px = this.centerX + Math.cos(angle) * r;
    const py = this.centerY + Math.sin(angle) * r;

    const dx = px - this.x;
    const dy = py - this.y;
    const dist = Math.hypot(dx, dy) || 1;

    const dirX = dx / dist;
    const dirY = dy / dist;

    // масштаб по модулю ΔVU rust-ноды
    const amp = Math.min(1.5, Math.abs(this.lastPeerDeltaVu) * 0.5);
    const mag = this.beta * (0.4 + 0.6 * amp); // от 0.4*beta до ~beta

    return [dirX * mag, dirY * mag];
  }

  vaultGuard(drift) {
    // VU не уходим ниже нуля
    if (this.vu + drift[0] < 0) drift[0] = -this.vu;
    return drift;
  }

  applyStep(drift) {
    // ограничиваем дрейф
    const MAX_D = 0.5;
    drift[0] = Math.max(-MAX_D, Math.min(MAX_D, drift[0]));
    drift[1] = Math.max(-MAX_D, Math.min(MAX_D, drift[1]));

    // Обновляем VU по ΔX компонента
    const localDeltaVu = drift[0];
    this.vu += localDeltaVu;

    // дрейф → ускорение
    const ACCEL = 0.9;
    this.vx += drift[0] * ACCEL;
    this.vy += drift[1] * ACCEL;

    // мягкая сила к центру (чтобы не улетал)
    const cx = this.centerX - this.x;
    const cy = this.centerY - this.y;
    this.vx += cx * 0.0006;
    this.vy += cy * 0.0006;

    // лёгкое трение
    const FRICTION = 0.94;
    this.vx *= FRICTION;
    this.vy *= FRICTION;

    // нормализация скорости — чтобы не превращалось в прямую
    const MAX_SPEED = 0.9;
    const speed = Math.hypot(this.vx, this.vy);
    if (speed > MAX_SPEED) {
      this.vx = (this.vx / speed) * MAX_SPEED;
      this.vy = (this.vy / speed) * MAX_SPEED;
    }

    // переносим позицию
    const POS = 18;
    this.x += this.vx * POS;
    this.y += this.vy * POS;

    // отражение от границы value-space
    const dx = this.x - this.centerX;
    const dy = this.y - this.centerY;
    const dist = Math.hypot(dx, dy) || 1;

    if (dist > this.radius) {
      const nx = dx / dist;
      const ny = dy / dist;

      this.x = this.centerX + nx * this.radius;
      this.y = this.centerY + ny * this.radius;

      const dot = this.vx * nx + this.vy * ny;
      this.vx = this.vx - 2 * dot * nx;
      this.vy = this.vy - 2 * dot * ny;

      this.vx *= 0.7;
      this.vy *= 0.7;
    }

    // хвост
    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > this.maxTrail) this.trail.shift();

    return localDeltaVu;
  }

  // ---------- детерминированный угол по node_id ----------

  _hashAngle(id) {
    let h = 0;
    for (let i = 0; i < id.length; i++) {
      h = (h * 31 + id.charCodeAt(i)) >>> 0;
    }
    const angle = (h % 360) * Math.PI / 180;
    return angle;
  }

  // ---------- отрисовка ----------

  draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.clearRect(0, 0, w, h);

    const pulse = 1 + 0.04 * Math.sin(this.cycle * 0.08);
    const visRadius = this.radius * pulse;

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

    // ноды по окружности (фиксированные позиции)
    const peersArr = Array.from(this.peers.values());
    if (peersArr.length > 0) {
      const r = visRadius - 10;
      peersArr.forEach((p) => {
        const kind = (p.kind || "").toLowerCase();
        const angle = this._hashAngle(p.id) - Math.PI / 2;
        const px = this.centerX + Math.cos(angle) * r;
        const py = this.centerY + Math.sin(angle) * r;

        const isActive = this.lastPeerId === p.id;

        ctx.beginPath();
        ctx.arc(px, py, isActive ? 5 : 4, 0, Math.PI * 2);
        ctx.fillStyle =
          kind === "rust" || kind === "rust-node"
            ? "rgba(74, 222, 128, 0.95)"
            : "rgba(56, 189, 248, 0.9)";

        ctx.shadowColor = isActive
          ? "rgba(74, 222, 128, 0.9)"
          : "rgba(56,189,248,0.6)";
        ctx.shadowBlur = isActive ? 14 : 8;
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
      tailGrad.addColorStop(1, "rgba(56,189,248,0.35)");
      ctx.strokeStyle = tailGrad;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // сам шарик
    ctx.beginPath();
    ctx.arc(this.x, this.y, 6, 0, Math.PI * 2);
    ctx.fillStyle = "#00d4ff";
    ctx.shadowColor = "rgba(0,180,255,0.85)";
    ctx.shadowBlur = 14;
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.beginPath();
    ctx.arc(this.x - 2, this.y - 2, 2.5, 0, Math.PI * 2);
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

      const localDeltaVu = this.applyStep(drift);
      this.sendSDM(localDeltaVu);
      this.draw();

      this.onCycle(this.cycle, this.vu, this.tc);
    }, 120);
  }
}

// экспорт в глобал
window.LVSBrowserNode = LVSBrowserNode;
