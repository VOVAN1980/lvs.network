// assets/lvs-hero-globe.js
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
        shouldAnimate: true
    });

    // отключаем управление, но НЕ трогаем стартовую камеру
    const ctrl = viewer.scene.screenSpaceCameraController;
    ctrl.enableZoom = false;
    ctrl.enableTilt = false;
    ctrl.enableLook = false;
    ctrl.enableTranslate = false;
    ctrl.enableRotate = false;

    // убираем копирайт
    viewer.cesiumWidget.creditContainer.style.display = "none";

    const camera = viewer.camera;
    const scene  = viewer.scene;

    // ===== АВТО РОТАЦИЯ =====
    let last = performance.now();
    let dragging = false;
    let lastX = 0;
    let dragDist = 0;
    let ptr = null;

    const SPEED = 0.25;  // не перебор, всё плавно
    let auto = true;

    scene.preRender.addEventListener(() => {
        const now = performance.now();
        const dt = (now - last) / 1000;
        last = now;
        if (auto) {
            camera.rotate(Cesium.Cartesian3.UNIT_Z, -SPEED * dt);
        }
    });

    // ===== DRAG =====
    container.addEventListener("pointerdown", e => {
        dragging = true;
        ptr = e.pointerId;
        lastX = e.clientX;
        dragDist = 0;
        auto = false;
        container.setPointerCapture(ptr);
    });

    container.addEventListener("pointermove", e => {
        if (!dragging || ptr !== e.pointerId) return;
        const dx = e.clientX - lastX;
        lastX = e.clientX;
        dragDist += Math.abs(dx);

        camera.rotate(Cesium.Cartesian3.UNIT_Z, -dx * 0.002);
    });

    function stop(e) {
        if (ptr !== e.pointerId) return;
        dragging = false;
        container.releasePointerCapture(ptr);

        if (dragDist < 5) {
            window.location.href = "space.html";
        } else {
            setTimeout(() => auto = true, 300);
        }
    }

    container.addEventListener("pointerup", stop);
    container.addEventListener("pointercancel", stop);
})();
