// --- LVS Browser Testnet Node ----------------------------------------
// Подключается к Rust gateway, общается по JSON (hello / peers / sdm)
// и рисует drift-точку на канвасе.
// ---------------------------------------------------------------------

class LVSBrowserNode {
  constructor(nodeId, gatewayUrl, canvasId) {
    this.nodeId = nodeId;
    this.gatewayUrl = gatewayUrl;
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext("2d");

    // базовое состояние
    this.ws = null;
    this.vu = 100.0;
    this.tc = 0.5;
    this.cycle = 0;

    // параметры дрейфа
    this.alpha = 0.05; // собственный шум
    this.beta  = 0.10; // влияние пиров

    // позиция на канвасе
    this.x = this.canvas.width / 2;
    this.y = this.canvas.height / 2;

    // последнее SDM от пиров
    this.lastPeerDiff   = null;
    this.lastPeerWeight = null;

    // callbacks (UI внизу заполняет)
    this.onStatus = () => {};
    this.onPeers  = () => {};
    this.onCycle  = () => {};
    this.onHello  = () => {};
    this.onSDM    = () => {};

    // внутренний флаг, чтобы не плодить setInterval при реконекте
    this._loopStarted = false;
  }

  // ---------------------------------------------------
  // запуск / reconnection
  // ---------------------------------------------------
  start() {
    this._log("connecting → " + this.gatewayUrl);
    this.onStatus("connecting...");
    this._setStatusPill("pending");

    this.ws = new WebSocket(this.gatewayUrl);

    this.ws.onopen = () => {
      this._log("connected");
      this.onStatus("connected");
      this._setStatusPill("ok");

      this.sendHello();
      this.requestPeers();

      if (!this._loopStarted) {
        this._loopStarted = true;
        this.loop();
      }
    };

    this.ws.onclose = () => {
      this._log("disconnected");
      this.onStatus("disconnected");
      this._setStatusPill("err");

      // мягкий auto-reconnect
      setTimeout(() => this.start(), 1500);
    };

    this.ws.onerror = (err) => {
      this._log("ws error", err);
      this.onStatus("error");
      this._setStatusPill("err");
    };

    this.ws.onmessage = (ev) => this.handleMessage(ev.data);
  }

  // ---------------------------------------------------
  // messaging
  // ---------------------------------------------------
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
        version: "0.2.0"
      }
    };
    this._log("send → hello");
    this.send(msg);
  }

  requestPeers() {
    const msg = {
      type: "peers_request",
      node_id: this.nodeId
    };
    this._log("send → peers_request");
    this.send(msg);
  }

  sendSDM(diff) {
    const msg = {
      type: "sdm",
      node_id: this.nodeId,
      payload: {
        diff: diff,
        weight: this.tc,
        cycle_id: this.cycle
      }
    };
    this.send(msg);
    this.onSDM(diff[0]);
  }

  // ---------------------------------------------------
  // входящие сообщения
  // ---------------------------------------------------
  handleMessage(txt) {
    let msg;
    try {
      msg = JSON.parse(txt);
    } catch {
      return;
    }

    // console.log("[LVS] msg", msg);

    if (msg.type === "hello") {
      this._log(`hello from: ${msg.node_id}`);
      if (msg.node_id !== this.nodeId) {
        this.onHello(msg.node_id);
      }
      return;
    }

    if (msg.type === "peers") {
      const peers = msg.payload?.peers || [];
      this._log(
        "peers → " +
          (peers.map((p) => p.node_id).join(", ") || "none")
      );
      this.onPeers(peers);
      return;
    }

    if (msg.type === "sdm") {
      if (msg.node_id !== this.nodeId) {
        this.lastPeerDiff = msg.payload?.diff || null;
        this.lastPeerWeight = msg.payload?.weight ?? null;
      }
      return;
    }
  }

  // ---------------------------------------------------
  // drift / vault
  // ---------------------------------------------------
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
      this.lastPeerDiff[1] * this.beta
    ];
  }

  vaultGuard(drift) {
    if (this.vu + drift[0] < 0) drift[0] = -this.vu;
    return drift;
  }

  applyDrift(d) {
    this.vu += d[0];
    this.x += d[0] * 2;
    this.y += d[1] * 2;

    // clamp в пределах канваса
    const r = this.canvas;
    this.x = Math.max(10, Math.min(r.width - 10, this.x));
    this.y = Math.max(10, Math.min(r.height - 10, this.y));
  }

  // ---------------------------------------------------
  // отрисовка
  // ---------------------------------------------------
  draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.clearRect(0, 0, w, h);

    // лёгкое свечение фона
    const g = ctx.createRadialGradient(
      this.x, this.y, 4,
      this.x, this.y, 80
    );
    g.addColorStop(0, "rgba(56,189,248,0.18)");
    g.addColorStop(1, "rgba(15,23,42,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // сама точка
    ctx.beginPath();
    ctx.arc(this.x, this.y, 6, 0, Math.PI * 2);
    ctx.fillStyle = "#22d3ee";
    ctx.shadowColor = "rgba(45,212,191,0.8)";
    ctx.shadowBlur = 16;
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  // ---------------------------------------------------
  // main loop
  // ---------------------------------------------------
  loop() {
    setInterval(() => {
      this.cycle++;

      const E = this.generateEntropy();
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

  // ---------------------------------------------------
  // служебные
  // ---------------------------------------------------
  _log(...args) {
    console.log("[LVS]", ...args);
    if (window.__lvsLog) {
      window.__lvsLog(args.join(" "));
    }
  }

  _setStatusPill(kind) {
    // kind: "ok" | "err" | "pending"
    if (!window.__lvsSetStatusPill) return;
    window.__lvsSetStatusPill(kind);
  }
}

// -----------------------------------------------------
// UI wiring (подключение к DOM)
// -----------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  const statusEl = document.getElementById("statusText");
  const nodeIdEl = document.getElementById("nodeIdText");
  const cycleEl  = document.getElementById("cycleText");
  const vuEl     = document.getElementById("vuText");
  const tcEl     = document.getElementById("tcText");
  const peersEl  = document.getElementById("peersText");
  const logEl    = document.getElementById("logBody");

  // логгер в текстовый блок
  function appendLog(msg) {
    const ts = new Date();
    const hh = String(ts.getHours()).padStart(2, "0");
    const mm = String(ts.getMinutes()).padStart(2, "0");
    const ss = String(ts.getSeconds()).padStart(2, "0");

    const line = document.createElement("div");

    const spanTs = document.createElement("span");
    spanTs.className = "ts";
    spanTs.textContent = `[${hh}:${mm}:${ss}] `;

    const spanMsg = document.createElement("span");
    spanMsg.className = "msg";
    spanMsg.textContent = msg;

    line.appendChild(spanTs);
    line.appendChild(spanMsg);

    logEl.appendChild(line);
    logEl.scrollTop = logEl.scrollHeight;
  }

  // экспортируем, чтобы класс мог писать
  window.__lvsLog = appendLog;
  window.__lvsSetStatusPill = (kind) => {
    statusEl.classList.remove("ok", "err", "pending");
    statusEl.classList.add(kind);
  };

  const GATEWAY_URL = "ws://127.0.0.1:9001/ws"; // локальный гейтвей
  const NODE_ID = "browser-node-1";

  nodeIdEl.textContent = NODE_ID;
  appendLog("browser node UI initialized");

  const node = new LVSBrowserNode(NODE_ID, GATEWAY_URL, "lvsCanvas");

  node.onStatus = (s) => {
    statusEl.textContent = s;
    appendLog("status → " + s);
  };

  node.onPeers = (peers) => {
    const list = peers.map((p) => p.node_id).join(", ") || "—";
    peersEl.textContent = list;
    appendLog("peers → " + list);
  };

  node.onCycle = (cycle, vu, tc) => {
    cycleEl.textContent = cycle.toString();
    vuEl.textContent = vu.toFixed(2);
    tcEl.textContent = tc.toFixed(2);
  };

  node.onHello = (fromId) => {
    appendLog("hello from: " + fromId);
  };

  node.onSDM = (dx) => {
    // если захочешь — сюда можно добавить детальный лог diff
    // appendLog("sdm diff[0] → " + dx.toFixed(4));
  };

  node.start();
});
