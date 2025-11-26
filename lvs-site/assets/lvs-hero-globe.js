(function () {
    if (typeof Cesium === "undefined") return;

    Cesium.Ion.defaultAccessToken =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIxNGJlYzY3MS0wNzg0LTRhMTYtYTg4ZS0wZDk2Njk4MmJkODAiLCJpZCI6MzYzOTE1LCJpYXQiOjE3NjQxMTY4MTd9.mB7rmSUqh2vbP7RDT5B2nQMtOOoRNX0U1e3Z09v5ILM";

    const container = document.getElementById("lvs-hero-globe");
    if (!container) return;

    const viewer = new Cesium.Viewer(container, {
        animation: false,
        timeline: false,
        fullscreenButton: false,
        baseLayerPicker: false,
        geocoder: false,
        homeButton: false,
        infoBox: false,
        sceneModePicker: false,
        navigationHelpButton: false,
        selectionIndicator: false,
        shouldAnimate: false,
        imageryProvider: Cesium.createWorldImagery(),
        terrainProvider: Cesium.createWorldTerrain()
    });

    if (viewer.cesiumWidget.creditContainer) {
        viewer.cesiumWidget.creditContainer.style.display = "none";
    }

    const scene = viewer.scene;
    const camera = viewer.camera;

    scene.skyBox.show = false;
    scene.skyAtmosphere.show = true;
    scene.globe.enableLighting = true;

    // === точное вписывание шара в круг ===
    const fov = camera.frustum.fov;
    const earthRadius = 6378137; // метр
    const distance = earthRadius / Math.sin(fov / 2);

    camera.lookAt(
        Cesium.Cartesian3.ZERO,
        new Cesium.Cartesian3(0, -distance, 0)
    );
    camera.lookAtTransform(Cesium.Matrix4.IDENTITY);

    // ===== авто-вращение =====
    let auto = true;
    let last = performance.now();

    scene.preRender.addEventListener(() => {
        const now = performance.now();
        const dt = (now - last) / 1000;
        last = now;
        if (auto) camera.rotate(Cesium.Cartesian3.UNIT_Z, -0.1 * dt);
    });

    // ===== drag =====
    let drag = false;
    let lastX = 0;
    let moved = 0;
    let active = null;

    container.addEventListener("pointerdown", e => {
        drag = true;
        active = e.pointerId;
        lastX = e.clientX;
        moved = 0;
        auto = false;
        container.setPointerCapture(active);
    });

    container.addEventListener("pointermove", e => {
        if (!drag || e.pointerId !== active) return;
        const dx = e.clientX - lastX;
        lastX = e.clientX;
        moved += Math.abs(dx);
        camera.rotate(Cesium.Cartesian3.UNIT_Z, -dx * 0.003);
    });

    function endDrag(e) {
        if (e.pointerId !== active) return;
        drag = false;

        if (moved < 4) {
            window.location.href = "space.html";
        }

        setTimeout(() => auto = true, 300);
    }

    container.addEventListener("pointerup", endDrag);
    container.addEventListener("pointercancel", endDrag);
})();
