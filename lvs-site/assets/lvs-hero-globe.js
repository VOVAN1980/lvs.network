// assets/lvs-hero-globe.js
// Мини-глобус в hero: только горизонтальный drag, клик = переход в космос.

(function () {
    if (typeof Cesium === "undefined") return;

    // тот же токен, что в space.js
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

    // вырубаем ВСЕ стандартные взаимодействия камеры
    const ctrl = viewer.scene.screenSpaceCameraController;
    ctrl.enableRotate    = false;
    ctrl.enableTranslate = false;
    ctrl.enableZoom      = false;
    ctrl.enableTilt      = false;
    ctrl.enableLook      = false;

    // убираем кредит
    if (viewer.cesiumWidget && viewer.cesiumWidget.creditContainer) {
        viewer.cesiumWidget.creditContainer.style.display = "none";
    }

    const scene  = viewer.scene;
    const camera = viewer.camera;

    scene.globe.enableLighting = true;
    scene.skyAtmosphere.show   = true;

    // стартовая позиция — просто красиво
    camera.setView({
        destination: Cesium.Cartesian3.fromDegrees(10, 20, 20000000)
    });

    // авто-вращение, пока юзер не крутит сам
    let autoRotate = true;
    let lastTime   = performance.now();

    scene.preRender.addEventListener(function () {
        const now   = performance.now();
        const delta = (now - lastTime) / 1000;
        lastTime    = now;

        if (autoRotate) {
            camera.rotate(Cesium.Cartesian3.UNIT_Z, -0.08 * delta);
        }
    });

    // свой drag по оси Z
    let dragging      = false;
    let lastX         = 0;
    let dragDistance  = 0;
    let activePointer = null;

    const ROT_SPEED = 0.003; // чувствительность вращения

    container.addEventListener("pointerdown", function (e) {
        dragging      = true;
        lastX         = e.clientX;
        dragDistance  = 0;
        activePointer = e.pointerId;
        autoRotate    = false;
        container.setPointerCapture(e.pointerId);
    });

    container.addEventListener("pointermove", function (e) {
        if (!dragging || e.pointerId !== activePointer) return;
        const dx = e.clientX - lastX;
        lastX    = e.clientX;
        dragDistance += Math.abs(dx);

        // крутим только вокруг оси Z (горизонт)
        const rot = dx * ROT_SPEED;
        camera.rotate(Cesium.Cartesian3.UNIT_Z, -rot);
    });

    container.addEventListener("pointerup", function (e) {
        if (e.pointerId !== activePointer) return;
        dragging      = false;
        activePointer = null;
        container.releasePointerCapture(e.pointerId);

        // если почти не двигали — считаем это кликом → в космос
        if (dragDistance < 5) {
            window.location.href = "space.html";
        } else {
            // чуть подождали — снова включили авто-вращение
            setTimeout(() => { autoRotate = true; }, 400);
        }
    });

    container.addEventListener("pointercancel", function (e) {
        if (e.pointerId !== activePointer) return;
        dragging      = false;
        activePointer = null;
        container.releasePointerCapture(e.pointerId);
        setTimeout(() => { autoRotate = true; }, 400);
    });
})();
