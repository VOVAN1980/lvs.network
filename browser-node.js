class LVSBrowserNode {
    constructor(nodeId, gatewayUrl, canvasId) {
        this.nodeId = nodeId;
        this.gatewayUrl = gatewayUrl;
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext("2d");

        this.ws = null;
        this.vu = 100.0;
        this.tc = 0.5;
        this.cycle = 0;

        this.alpha = 0.05;
        this.beta = 0.10;

        this.x = this.canvas.width / 2;
        this.y = this.canvas.height / 2;

        // UI callbacks
        this.onStatus = () => {};
        this.onPeers = () => {};
        this.onCycle = () => {};
        this.onHello = () => {};
        this.onSDM = () => {};
        this.onEvent = () => {};
    }

    //-------------------------------
    // CONNECT
    //-------------------------------
    start() {
        this.onEvent("connecting…");
        this.onStatus("connecting…");

        this.ws = new WebSocket(this.gatewayUrl);

        this.ws.onopen = () => {
            this.onEvent("connected");
            this.onStatus("connected");
            this.sendHello();
            this.requestPeers();
            this.loop();
        };

        this.ws.onclose = () => {
            this.onEvent("disconnected");
            this.onStatus("disconnected");

            setTimeout(() => this.start(), 2000);
        };

        this.ws.onerror = () => {
            this.onEvent("error");
            this.onStatus("error");
        };

        this.ws.onmessage = (ev) => this.handleMessage(ev.data);
    }

    //-------------------------------
    // SEND
    //-------------------------------
    send(msg) {
        if (this.ws.readyState === 1) {
            this.ws.send(JSON.stringify(msg));
        }
    }

    sendHello() {
        this.send({
            type: "hello",
            node_id: this.nodeId,
            payload: { kind: "browser", version: "0.2.0" }
        });
    }

    requestPeers() {
        this.send({ type: "peers_request", node_id: this.nodeId });
    }

    sendSDM(diff) {
        this.send({
            type: "sdm",
            node_id: this.nodeId,
            payload: { diff, weight: this.tc, cycle_id: this.cycle }
        });
        this.onSDM(diff);
    }

    //-------------------------------
    // RECEIVE
    //-------------------------------
    handleMessage(txt) {
        let msg;
        try { msg = JSON.parse(txt); } catch { return; }

        if (msg.type === "hello" && msg.node_id !== this.nodeId) {
            this.onHello(msg.node_id);
        }

        if (msg.type === "peers") {
            const list = msg.payload.peers.map(p => p.node_id);
            this.onPeers(list);
        }

        if (msg.type === "sdm" && msg.node_id !== this.nodeId) {
            this.lastPeerDiff = msg.payload.diff;
            this.lastPeerWeight = msg.payload.weight;
        }
    }

    //-------------------------------
    // DRIFT
    //-------------------------------
    generateEntropy() {
        return [
            Math.random() * 2 - 1,
            Math.random() * 2 - 1
        ];
    }

    driftFromEntropy(E) {
        const mag = Math.hypot(E[0], E[1]) || 1;
        return [(E[0] / mag) * this.alpha, (E[1] / mag) * this.alpha];
    }

    driftFromPeers() {
        if (!this.lastPeerDiff) return [0, 0];
        return [
            this.lastPeerDiff[0] * this.beta,
            this.lastPeerDiff[1] * this.beta
        ];
    }

    vaultGuard(d) {
        if (this.vu + d[0] < 0) d[0] = -this.vu;
        return d;
    }

    applyDrift(d) {
        this.vu += d[0];
        this.x += d[0] * 2;
        this.y += d[1] * 2;

        // clamp
        const W = this.canvas.width;
        const H = this.canvas.height;

        this.x = Math.max(0, Math.min(W, this.x));
        this.y = Math.max(0, Math.min(H, this.y));
    }

    //-------------------------------
    // DRAW
    //-------------------------------
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

    //-------------------------------
    // LOOP
    //-------------------------------
    loop() {
        setInterval(() => {
            this.cycle++;

            const E = this.generateEntropy();
            const d1 = this.driftFromEntropy(E);
            const d2 = this.driftFromPeers();
            let d = [d1[0] + d2[0], d1[1] + d2[1]];

            d = this.vaultGuard(d);
            this.applyDrift(d);

            this.sendSDM(d);
            this.draw();

            this.onCycle(this.cycle, this.vu, this.tc);
        }, 120);
    }
}
