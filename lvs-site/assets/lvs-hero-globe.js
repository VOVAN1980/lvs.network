// assets/lvs-hero-globe.js
// Мини-глобус в hero: дефолтный вид Cesium, авто-вращение, drag влево/вправо, клик -> space.html

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
        // ВАЖНО: imagery и terrain оставляем по умолчанию
    });

    // отключаем лишние контролы, но камеру не трогаем
    const ctrl = viewer.scene.screenSpaceCameraController;
    ctrl.enableTranslate = false;
    ctrl.enableZoom      = false;
    ctrl.enableTilt      = false;
    ctrl.enableLook      = false;
    ctrl.enableRotate    = false;   // сами крутим

    // убираем копирайт Cesium
    if (viewer.cesiumWidget && viewer.cesiumWidget.creditContainer) {
        viewer.cesiumWidget.creditContainer.style.display = "none";
    }

    const scene  = viewer.scene;
    const camera = viewer.camera;

    scene.globe.enableLighting = true;
    scene.skyAtmosphere.show   = true;

    // НИКАКИХ setView / lookAt / frustum — пусть Cesium сам выберет стартовый вид

    // ===== АВТО-ВРАЩЕНИЕ ВОКРУГ ОСИ Z =====
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

    // drag только по горизонтали
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
