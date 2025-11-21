class LVSBrowserNode {
    constructor(nodeId, gatewayUrl, canvasId) {
        this.nodeId = nodeId;
        this.gatewayUrl = gatewayUrl;
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext("2d");

        // baseline state
        this.ws = null;
        this.vu = 100.0;
        this.tc = 0.5;
        this.cycle = 0;

        // drift parameters
        this.alpha = 0.05;
        this.beta = 0.10;

        // canvas pos (центр)
        this.x = this.canvas.width / 2;
        this.y = this.canvas.height / 2;

        // внешние колбэки для UI
        this.onStatus = () => {};
        this.onPeers  = () => {};
        this.onCycle  = () => {};
        this.onHello  = () => {};
        this.onSDM    = () => {};

        this.lastPeerDiff = null;
        this.lastPeerWeight = 0;
    }

    // ---------------------------------------------------
    // lifecycle
    // ---------------------------------------------------
    start() {
        console.log("[LVS] connecting:", this.gatewayUrl);
        this.onStatus("connecting");

        this.ws = new WebSocket(this.gatewayUrl);

        this.ws.onopen = () => {
            console.log("[LVS] connected");
            this.onStatus("connected");
            this.sendHello();
            this.requestPeers();
            this.startLoop();
        };

        this.ws.onclose = () => {
            console.log("[LVS] disconnected");
            this.onStatus("disconnected");
            // мягкий автопереподключ
            setTimeout(() => this.start(), 1500);
        };

        this.ws.onerror = (err) => {
            console.log("[LVS] ws error:", err);
            this.onStatus("error");
        };

        this.ws.onmessage = (ev) => this.handleMessage(ev.data);
    }

    // ---------------------------------------------------
    // messaging
    // ---------------------------------------------------
    send(msg) {
        if (!this.ws) return;
        if (this.ws.readyState !== WebSocket.OPEN) return;
        this.ws.send(JSON.stringify(msg));
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
        console.log("[LVS] → hello", msg);
        this.send(msg);
        this.onHello(this.nodeId);
    }

    requestPeers() {
        const msg = {
            type: "peers_request",
            node_id: this.nodeId
        };
        console.log("[LVS] → peers_request");
        this.send(msg);
    }

    sendSDM(diff) {
        const payload = {
            diff: diff,
            weight: this.tc,
            cycle_id: this.cycle
        };
        const msg = {
            type: "sdm",
            node_id: this.nodeId,
            payload
        };
        this.send(msg);
        this.onSDM(diff[0]);
    }

    // ---------------------------------------------------
    // incoming messages
    // ---------------------------------------------------
    handleMessage(txt) {
        let msg;
        try {
            msg = JSON.parse(txt);
        } catch {
            return;
        }

        // console.log("[LVS] ←", msg);

        switch (msg.type) {
            case "hello":
                if (msg.node_id !== this.nodeId) {
                    console.log("[LVS] hello from:", msg.node_id);
                    this.onHello(msg.node_id);
                }
                break;

            case "peers":
                if (msg.payload && Array.isArray(msg.payload.peers)) {
                    this.onPeers(msg.payload.peers);
                    console.log("[LVS] peers:", msg.payload.peers);
                }
                break;

            case "sdm":
                if (msg.node_id !== this.nodeId && msg.payload) {
                    this.lastPeerDiff = msg.payload.diff;
                    this.lastPeerWeight = msg.payload.weight;
                }
                break;

            default:
                // игнорим остальное
                break;
        }
    }

    // ---------------------------------------------------
    // drift
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
        if (this.vu + drift[0] < 0) {
            drift[0] = -this.vu;
        }
        return drift;
    }

    applyDrift(d) {
        this.vu += d[0];
        this.x += d[0] * 2;
        this.y += d[1] * 2;

        // clamp в пределах канвы
        const w = this.canvas.width;
        const h = this.canvas.height;
        this.x = Math.max(10, Math.min(w - 10, this.x));
        this.y = Math.max(10, Math.min(h - 10, this.y));
    }

    // ---------------------------------------------------
    // draw
    // ---------------------------------------------------
    draw() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        ctx.beginPath();
        ctx.arc(this.x, this.y, 6, 0, Math.PI * 2);
        ctx.fillStyle = "#00d4ff";
        ctx.shadowColor = "rgba(0,180,255,0.6)";
        ctx.shadowBlur = 14;
        ctx.fill();
        ctx.shadowBlur = 0;
    }

    // ---------------------------------------------------
    // main loop
    // ---------------------------------------------------
    startLoop() {
        if (this._loopHandle) return; // не плодим интервалы

        this._loopHandle = setInterval(() => {
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
}
