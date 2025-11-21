class LVSBrowserNode {
    constructor(nodeId, gatewayUrl, canvasId) {
        this.nodeId = nodeId;
        this.gatewayUrl = gatewayUrl;
        this.ws = null;

        // Core state
        this.vu = 100.0;
        this.tc = 0.5;
        this.cycle = 0;

        // Drift params
        this.alpha = 0.05;
        this.beta = 0.10;

        // Canvas
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext("2d");
        this.x = 200;
        this.y = 200;
    }

    start() {
        this.ws = new WebSocket(this.gatewayUrl);

        this.ws.onopen = () => {
            this.sendHello();
            this.requestPeers();
            this.loop();
        };

        this.ws.onmessage = (ev) => this.handleMessage(ev.data);
        this.ws.onerror = (err) => console.log("WS error:", err);
    }

    send(msg) {
        this.ws.send(JSON.stringify(msg));
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

    generateEntropy() {
        return [Math.random() * 2 - 1, Math.random() * 2 - 1];
    }

    handleMessage(txt) {
        let msg;
        try {
            msg = JSON.parse(txt);
        } catch {
            return;
        }

        if (msg.type === "sdm" && msg.node_id !== this.nodeId) {
            // incoming diff from peers
            this.lastPeerDiff = msg.payload.diff;
            this.lastPeerWeight = msg.payload.weight;
        }
    }

    driftFromEntropy(E) {
        const mag = Math.sqrt(E[0] * E[0] + E[1] * E[1]) || 1;
        return [(E[0] / mag) * this.alpha, (E[1] / mag) * this.alpha];
    }

    driftFromPeers() {
        if (!this.lastPeerDiff) {
            return [0, 0];
        }
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

    applyDrift(drift) {
        this.vu += drift[0];
        // Move dot on canvas
        this.x += drift[0] * 2;
        this.y += drift[1] * 2;
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
    }

    draw() {
        this.ctx.clearRect(0, 0, 400, 400);
        this.ctx.beginPath();
        this.ctx.arc(this.x, this.y, 6, 0, Math.PI * 2);
        this.ctx.fillStyle = "#00d4ff";
        this.ctx.fill();
    }

    loop() {
        setInterval(() => {
            this.cycle++;

            const E = this.generateEntropy();
            const d1 = this.driftFromEntropy(E);
            const d2 = this.driftFromPeers();
            let D = [d1[0] + d2[0], d1[1] + d2[1]];

            D = this.vaultGuard(D);

            this.applyDrift(D);
            this.sendSDM(D);
            this.draw();
        }, 120);
    }
}
