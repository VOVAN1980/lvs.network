// Мини-глобус на главной. Нормальный, светлый, стандартный Cesium.
// Земля видна полностью и ровно вписана в круг.

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
        shouldAnimate: false
    });

    // убрать кредит Cesium
    if (viewer.cesiumWidget.creditContainer) {
        viewer.cesiumWidget.creditContainer.style.display = "none";
    }

    const camera = viewer.camera;
    const scene  = viewer.scene;

    scene.globe.enableLighting = true;
    scene.skyAtmosphere.show   = true;

    // *** ВОТ ЭТО ДЕЛАЕТ ЗЕМЛЮ ИДЕАЛЬНО ВИДИМОЙ КАК НА ПЕРВОМ СКРИНЕ ***
    camera.setView({
        destination: Cesium.Cartesian3.fromDegrees(0, 20, 21000000) // идеальная дистанция!
    });

    // запрещаем масштабирование и т.п.
    const ctrl = viewer.scene.screenSpaceCameraController;
    ctrl.enableZoom = false;
    ctrl.enableTilt = false;
    ctrl.enableRotate = false;
    ctrl.enableLook = false;
    ctrl.enableTranslate = false;

    // авто вращение
    let last = performance.now();
    scene.preRender.addEventListener(() => {
        const now = performance.now();
        const dt = (now - last) / 1000;
        last = now;
        camera.rotate(Cesium.Cartesian3.UNIT_Z, -0.08 * dt);
    });

    // drag → только горизонталь
    let isDrag = false;
    let lastX = 0;
    let moved = 0;

    container.addEventListener("pointerdown", e => {
        isDrag = true;
        lastX = e.clientX;
        moved = 0;
        container.setPointerCapture(e.pointerId);
    });

    container.addEventListener("pointermove", e => {
        if (!isDrag) return;
        const dx = e.clientX - lastX;
        lastX = e.clientX;
        moved += Math.abs(dx);
        camera.rotate(Cesium.Cartesian3.UNIT_Z, -dx * 0.0025);
    });

    function end(e) {
        if (!isDrag) return;
        isDrag = false;
        try { container.releasePointerCapture(e.pointerId) } catch (_) {}

        if (moved < 5) {
            window.location.href = "space.html";
        }
    }

    container.addEventListener("pointerup", end);
    container.addEventListener("pointercancel", end);
})();
