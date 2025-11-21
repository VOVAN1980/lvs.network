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

        // canvas pos
        this.x = this.canvas.width / 2;
        this.y = this.canvas.height / 2;

        // callbacks (UI заполнит)
        this.onStatus = () => {};
        this.onPeers = () => {};
        this.onCycle = () => {};
        this.onHello = () => {};
        this.onSDM = () => {};
    }

    start() {
        this.onStatus("connecting...");
        this.ws = new WebSocket(this.gatewayUrl);

        this.ws.onopen = () => {
            this.onStatus("connected");
            this.sendHello();
            this.requestPeers();
            this.loop();
        };

        this.ws.onclose = () => {
            this.onStatus("disconnected");
            setTimeout(() => this.start(), 1500);
        };

        this.ws.onerror = (err) => {
            this.onStatus("error");
            console.log("WS error:", err);
        };

        this.ws.onmessage = (ev) => this.handleMessage(ev.data);
    }

    // ---------------------------------------------------
    // messaging
    // ---------------------------------------------------
    send(msg) {
        if (this.ws.readyState === 1) {
            this.ws.send(JSON.stringify(msg));
        }
    }

    sendHello() {
        this.send({
            type: "hello",
            node_id: this.nodeId,
            payload: {
                kind: "browser",
                version: "0.2.0"
            }
        });
    }

    requestPeers() {
        this.send({
            type: "peers_request",
            node_id: this.nodeId
        });
    }

    sendSDM(diff) {
        this.send({
            type: "sdm",
            node_id: this.nodeId,
            payload: {
                diff: diff,
                weight: this.tc,
                cycle_id: this.cycle
            }
        });
        this.onSDM(diff[0]);
    }

    // ---------------------------------------------------
    // parsing incoming messages
    // ---------------------------------------------------
    handleMessage(txt) {
        let msg;
        try { msg = JSON.parse(txt); } catch { return; }

        if (msg.type === "hello" && msg.node_id !== this.nodeId) {
            this.onHello(msg.node_id);
        }

        if (msg.type === "peers") {
            this.onPeers(msg.payload.peers);
        }

        if (msg.type === "sdm" && msg.node_id !== this.nodeId) {
            this.lastPeerDiff = msg.payload.diff;
            this.lastPeerWeight = msg.payload.weight;
        }
    }

    // ---------------------------------------------------
    // drift logic
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

        // clamp
        const r = this.canvas;
        this.x = Math.max(0, Math.min(r.width, this.x));
        this.y = Math.max(0, Math.min(r.height, this.y));
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
        ctx.shadowBlur = 12;
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
}
