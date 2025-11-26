// assets/lvs-hero-globe.js
// Мини-глобус в hero: шар вплотную в круге, только горизонтальный drag, клик = space.html

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

    // выключаем все стандартные контроли камеры
    const ctrl = viewer.scene.screenSpaceCameraController;
    ctrl.enableRotate    = false;
    ctrl.enableTranslate = false;
    ctrl.enableZoom      = false;
    ctrl.enableTilt      = false;
    ctrl.enableLook      = false;

    // убираем копирайт Cesium
    if (viewer.cesiumWidget && viewer.cesiumWidget.creditContainer) {
        viewer.cesiumWidget.creditContainer.style.display = "none";
    }

    const scene  = viewer.scene;
    const camera = viewer.camera;

    scene.globe.enableLighting = true;
    scene.skyAtmosphere.show   = true;

    // ===== КАМЕРА: шар вплотную в круге =====
    // Делаем узкий FOV и ставим камеру ~на 2 радиуса от центра
        // ===== КАМЕРА: шар зафиксирован в круге =====
    // Узкий FOV + расстояние ~4.7 радиуса = шар почти до края, но не режется
    camera.frustum.fov  = Cesium.Math.toRadians(28.0);
    camera.frustum.near = 100000.0;
    camera.frustum.far  = 80000000.0;

    const earthRadius = 6378137.0;
    const distance    = earthRadius * 4.7;   // БЫЛО 2.1 → делаем 4.7, шар меньше

    const center = Cesium.Cartesian3.fromDegrees(0, 0, 0);
    const offset = new Cesium.Cartesian3(0.0, 0.0, distance);

    camera.lookAt(center, offset);

    // ===== АВТО-ВРАЩЕНИЕ + DRAG ТОЛЬКО ВЛЕВО/ВПРАВО =====
    let autoRotate   = true;
    let lastTime     = performance.now();
    let dragging     = false;
    let lastX        = 0;
    let dragDistance = 0;
    let activePtr    = null;

    const ROT_SPEED = 0.003;

    scene.preRender.addEventListener(function () {
        const now   = performance.now();
        const delta = (now - lastTime) / 1000;
        lastTime    = now;

        if (autoRotate) {
            camera.rotate(Cesium.Cartesian3.UNIT_Z, -0.08 * delta);
        }
    });

    container.addEventListener("pointerdown", function (e) {
        dragging     = true;
        lastX        = e.clientX;
        dragDistance = 0;
        activePtr    = e.pointerId;
        autoRotate   = false;
        container.setPointerCapture(e.pointerId);
    });

    container.addEventListener("pointermove", function (e) {
        if (!dragging || e.pointerId !== activePtr) return;
        const dx = e.clientX - lastX;
        lastX    = e.clientX;
        dragDistance += Math.abs(dx);

        const rot = dx * ROT_SPEED;
        camera.rotate(Cesium.Cartesian3.UNIT_Z, -rot);
    });

    function endDrag(e) {
        if (e.pointerId !== activePtr) return;
        dragging  = false;
        activePtr = null;
        try { container.releasePointerCapture(e.pointerId); } catch (_) {}

        // почти не двигали — считаем кликом
        if (dragDistance < 5) {
            window.location.href = "space.html";
        } else {
            setTimeout(() => { autoRotate = true; }, 400);
        }
    }

    container.addEventListener("pointerup", endDrag);
    container.addEventListener("pointercancel", endDrag);
})();
