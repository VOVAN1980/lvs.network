class LVSBrowserNode {
    constructor(nodeId, gatewayUrl, canvasId) {
        this.nodeId = nodeId;
        this.gatewayUrl = gatewayUrl;
        this.ws = null;

        // core state
        this.vu = 100.0;
        this.tc = 0.5;
        this.cycle = 0;

        // drift coefficients (Rust-compatible)
        this.alpha = 0.04;  // entropy influence
        this.beta = 0.12;   // peer diff influence

        // drift memory from peers
        this.peerDiff = 0.0;
        this.peerWeight = 0.0;

        // canvas
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext("2d");

        // start position (center)
        this.x = this.canvas.width / 2;
        this.y = this.canvas.height / 2;
    }


    start() {
        console.log("[LVS] connecting:", this.gatewayUrl);
        this.ws = new WebSocket(this.gatewayUrl);

        this.ws.onopen = () => {
            console.log("[LVS] connected");
            this.sendHello();
            this.requestPeers();
            this.loop();
        };

        this.ws.onmessage = (ev) => this.handleMessage(ev.data);
        this.ws.onerror = (err) => console.error("WS error:", err);
        this.ws.onclose = () => console.warn("[LVS] disconnected");
    }


    send(msg) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
        this.ws.send(JSON.stringify(msg));
    }


    sendHello() {
        this.send({
            type: "hello",
            node_id: this.nodeId,
            payload: {
                kind: "browser",
                version: "0.3.0"
            }
        });
    }


    requestPeers() {
        this.send({
            type: "peers_request",
            node_id: this.nodeId
        });
    }


    // Rust-compatible entropy (1D)
    generateEntropy() {
        return (Math.random() * 2 - 1);
    }


    handleMessage(txt) {
        let msg;
        try {
            msg = JSON.parse(txt);
        } catch {
            return;
        }

        if (msg.node_id === this.nodeId) return; // ignore self

        switch (msg.type) {

            case "sdm":
                this.peerDiff = msg.payload.diff;
                this.peerWeight = msg.payload.weight;
                break;

            case "peers":
                console.log("[LVS] peers:", msg.payload.peers);
                break;

            case "hello":
                console.log("[LVS] hello from:", msg.node_id);
                break;

            default:
                break;
        }
    }


    // Drift from entropy (Rust compatible)
    driftFromEntropy(E) {
        return E * this.alpha;
    }

    // Drift from peers (Rust compatible)
    driftFromPeers() {
        return this.peerDiff * this.beta;
    }

    // Vault Guard: can't go negative
    vaultGuard(d) {
        if (this.vu + d < 0) {
            return -this.vu;
        }
        return d;
    }

    applyDrift(d) {
        this.vu += d;

        // convert 1D drift into 2D motion (main axis: x)
        this.x += d * 4;
        this.y += (Math.random() - 0.5) * 1.2;

        // wrap boundaries horizontally
        if (this.x < 0) this.x = this.canvas.width;
        if (this.x > this.canvas.width) this.x = 0;
    }


    sendEP(E) {
        this.send({
            type: "ep",
            node_id: this.nodeId,
            payload: {
                entropy: E,
                cycle_id: this.cycle
            }
        });
    }


    sendSDM(d) {
        this.send({
            type: "sdm",
            node_id: this.nodeId,
            payload: {
                diff: d,
                weight: this.tc,
                cycle_id: this.cycle
            }
        });
    }


    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.beginPath();
        this.ctx.arc(this.x, this.y, 6, 0, Math.PI * 2);
        this.ctx.fillStyle = "#00d4ff";
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = "#00eaff";
        this.ctx.fill();

        this.ctx.shadowBlur = 0;
    }


    loop() {
        setInterval(() => {
            this.cycle++;

            const E = this.generateEntropy();
            const d1 = this.driftFromEntropy(E);
            const d2 = this.driftFromPeers();

            let D = d1 + d2;
            D = this.vaultGuard(D);

            // send entropy to Rust nodes (THIS ACTIVATES THE WHOLE NETWORK)
            this.sendEP(E);

            // send SDM to Rust nodes
            this.sendSDM(D);

            // apply drift to browser model
            this.applyDrift(D);
            this.draw();

        }, 120);
    }
}
