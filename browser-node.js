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

    // Положение браузер-ноды в полярных координатах
    this.angle = -Math.PI / 2; // старт — вверх
    this.r     = 0;            // почти центр
    this.vr    = 0;            // радиальная скорость

    // Состояние
    this.ws    = null;
    this.vu    = 100.0;
    this.tc    = 0.5;
    this.cycle = 0;

    // Параметры "ценности"
    this.noiseScale   = 0.03;   // шум ΔVU
    this.peerVuScale  = 0.12;   // вклад ΔVU от rust-нод
    this.maxDeltaVu   = 0.6;    // ограничение ΔVU за тик

    // Параметры движения (визуал)
    this.springK      = 0.02;   // возврат к центру
    this.friction     = 0.86;   // трение
    this.spikeScale   = 12.0;   // насколько ΔVU превращается в "выплеск"
    this.maxR         = this.radius * 0.78; // максимальный вылет луча
    this.angleJitter  = 0.04;   // шум угла, когда нет пиров
    this.alignFactor  = 0.25;   // скорость поворота к активной ноде

    // Последние данные от SDM rust-нод
    this.lastPeerDeltaVu = null;
    this.lastPeerId      = null;

    // След
    this.trail    = [];
    this.maxTrail = 220;

    this.loopTimer = null;

    // peers: Map<node_id, {id, kind, role, last_seen}>
    this.peers = new Map();

    // Колбэки из HTML
    this.onStatus = () => {};
    this.onPeers  = () => {};
    this.onCycle  = () => {};
    this.onHello  = () => {};
    this.onSDM    = () => {};
  }

  // ---------- peers helpers ----------

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

  send(obj) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(obj));
    }
  }

  sendHello() {
    const msg = {
      type: "hello",
      node_id: this.nodeId,
      payload: {
        kind: "browser",
        version: "0.5.0",
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

    if (msg.type === "hello" && msg.node_id !== this.nodeId) {
      const kind = msg.payload?.kind || "node";
      this._registerPeer(msg.node_id, { kind });
      this.onHello(msg.node_id);
    }

    if (msg.type === "peers") {
      const list = msg.payload?.peers || [];
      list.forEach((p) => {
        const id = p.node_id;
        this._registerPeer(id, { kind: "node" });
      });
      return;
    }

    if (msg.type === "sdm" && msg.node_id !== this.nodeId) {
      const diff = msg.payload?.diff;
      if (Array.isArray(diff) && diff.length >= 1) {
        this.lastPeerDeltaVu = diff[0];
      } else {
        this.lastPeerDeltaVu = null;
      }
      this.lastPeerId = msg.node_id;
    }
  }

  // ---------- хелпер для угла по node_id ----------

  _hashAngle(id) {
    let h = 0;
    for (let i = 0; i < id.length; i++) {
      h = (h * 31 + id.charCodeAt(i)) >>> 0;
    }
    // 0..2π
    return (h % 360) * Math.PI / 180;
  }

  _angleLerp(from, to, t) {
    let diff = ((to - from + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    return from + diff * t;
  }

  // ---------- обновление "ценности" и геометрии ----------

  step() {
    // 1) считаем ΔVU
    const noise = (Math.random() * 2 - 1) * this.noiseScale;

    let peerComponent = 0;
    if (this.lastPeerDeltaVu != null) {
      peerComponent = this.lastPeerDeltaVu * this.peerVuScale;
    }

    let deltaVu = noise + peerComponent;
    if (deltaVu >  this.maxDeltaVu) deltaVu =  this.maxDeltaVu;
    if (deltaVu < -this.maxDeltaVu) deltaVu = -this.maxDeltaVu;

    this.vu += deltaVu;
    if (this.vu < 0) this.vu = 0;

    // 2) геометрия — "нейронный" выстрел по лучу

    // угол
    if (this.lastPeerId) {
      const targetAngle = this._hashAngle(this.lastPeerId) - Math.PI / 2;
      this.angle = this._angleLerp(this.angle, targetAngle, this.alignFactor);
    } else {
      // лёгкое дрожание угла вокруг текущего направления
      this.angle += (Math.random() - 0.5) * this.angleJitter;
    }

    // радиальный "спайк"
    let spike = 0;
    if (this.lastPeerId) {
      const base = Math.abs(deltaVu) * this.spikeScale;
      spike = Math.min(0.55, base);  // ограничение силы
    }

    this.vr += spike;
    // пружина к центру
    this.vr -= this.r * this.springK;
    // трение
    this.vr *= this.friction;

    this.r += this.vr;
    if (this.r < 0) {
      this.r = 0;
      this.vr = 0;
    }
    if (this.r > this.maxR) {
      this.r = this.maxR;
      this.vr *= 0.4;
    }

    // чуть-чуть шума по радиусу, чтобы не было идеально ровных линий
    this.r += (Math.random() - 0.5) * 0.3;
    if (this.r < 0) this.r = 0;
    if (this.r > this.maxR) this.r = this.maxR;

    const x = this.centerX + Math.cos(this.angle) * this.r;
    const y = this.centerY + Math.sin(this.angle) * this.r;

    // обновляем след
    this.trail.push({ x, y });
    if (this.trail.length > this.maxTrail) this.trail.shift();

    return { deltaVu, x, y };
  }

  // ---------- отрисовка ----------

  draw(x, y) {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.clearRect(0, 0, w, h);

    const pulse = 1 + 0.05 * Math.sin(this.cycle * 0.08);
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

    // окружность value-space
    ctx.beginPath();
    ctx.arc(this.centerX, this.centerY, visRadius, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(148,163,184,0.45)";
    ctx.lineWidth = 1.3;
    ctx.setLineDash([4, 6]);
    ctx.stroke();
    ctx.setLineDash([]);

    // rust-ноды по кругу
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
            ? "rgba(74,222,128,0.95)"
            : "rgba(56,189,248,0.9)";
        ctx.shadowColor = isActive
          ? "rgba(74,222,128,0.9)"
          : "rgba(56,189,248,0.6)";
        ctx.shadowBlur = isActive ? 14 : 8;
        ctx.fill();
        ctx.shadowBlur = 0;
      });
    }

    // луч от центра (текущий)
    ctx.beginPath();
    ctx.moveTo(this.centerX, this.centerY);
    ctx.lineTo(x, y);
    ctx.strokeStyle = "rgba(56,189,248,0.35)";
    ctx.lineWidth = 1.15;
    ctx.stroke();

    // след как "нейронные вспышки"
    if (this.trail.length > 1) {
      ctx.beginPath();
      for (let i = 0; i < this.trail.length; i++) {
        const p = this.trail[i];
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      const tailGrad = ctx.createLinearGradient(0, 0, w, h);
      tailGrad.addColorStop(0, "rgba(56,189,248,0.05)");
      tailGrad.addColorStop(1, "rgba(56,189,248,0.4)");
      ctx.strokeStyle = tailGrad;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // точка в текущей позиции
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fillStyle = "#00d4ff";
    ctx.shadowColor = "rgba(0,180,255,0.85)";
    ctx.shadowBlur = 14;
    ctx.fill();
    ctx.shadowBlur = 0;

    // лёгкий бликовый центр
    ctx.beginPath();
    ctx.arc(x - 1.5, y - 1.5, 2.4, 0, Math.PI * 2);
    ctx.fillStyle = "#e0f2fe";
    ctx.fill();
  }

  // ---------- основной цикл ----------

  loop() {
    if (this.loopTimer) return;

    this.loopTimer = setInterval(() => {
      this.cycle++;

      const { deltaVu, x, y } = this.step();
      this.sendSDM(deltaVu);
      this.draw(x, y);

      this.onCycle(this.cycle, this.vu, this.tc);
    }, 120);
  }
}

// экспортируем в глобал
window.LVSBrowserNode = LVSBrowserNode;
