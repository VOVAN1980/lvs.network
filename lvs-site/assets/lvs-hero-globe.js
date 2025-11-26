// assets/lvs-hero-globe.js
(function () {
    // Cesium ещё не подгрузился
    if (typeof Cesium === "undefined") return;

    const container = document.getElementById("miniGlobe");
    if (!container) return;

    // ТВОЙ REAL TOKEN
    Cesium.Ion.defaultAccessToken =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIxNGJlYzY3MS0wNzg0LTRhMTYtYTg4ZS0wZDk2Njk4MmJkODAiLCJpZCI6MzYzOTE1LCJpYXQiOjE3NjQxMTY4MTd9.mB7rmSUqh2vbP7RDT5B2nQMtOOoRNX0U1e3Z09v5ILM";

    const viewer = new Cesium.Viewer("miniGlobe", {
        imageryProvider: new Cesium.IonImageryProvider({ assetId: 2 }), // нормальная карта
        // terrain убираем, чтобы не было лишних глюков
        terrain: null,

        animation: false,
        timeline: false,
        fullscreenButton: false,
        geocoder: false,
        homeButton: false,
        sceneModePicker: false,
        baseLayerPicker: false,
        navigationHelpButton: false,
        infoBox: false,
        selectionIndicator: false,
        shouldAnimate: true
    });

    const scene  = viewer.scene;
    const camera = viewer.camera;

    // Чуть-чуть атмосферы, но без сильного затемнения
    scene.globe.enableLighting = false;      // ВАЖНО: иначе можно поймать «ночную» сторону и будет тёмный шар
    scene.skyAtmosphere.show   = true;
    scene.skyBox.show          = false;

    // Убираем стандартный даблклик-zoom
    viewer.screenSpaceEventHandler.removeInputAction(
        Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK
    );

    // Стартовая позиция — Европа + Африка, как на нормальном скрине
    camera.setView({
        destination: Cesium.Cartesian3.fromDegrees(10, 20, 13000000),
        orientation: {
            heading: Cesium.Math.toRadians(0),
            pitch:   Cesium.Math.toRadians(-20),
            roll:    0.0
        }
    });

    // Медленное вращение вокруг оси
    const spinRate = Cesium.Math.toRadians(2.0); // 2 градуса в секунду
    viewer.clock.onTick.addEventListener(function (clock) {
        const dt = clock.deltaSeconds;
        camera.rotate(Cesium.Cartesian3.UNIT_Z, -spinRate * dt);
    });

    // Клик по мини-глобусу -> полная карта
    container.style.cursor = "pointer";
    container.addEventListener("click", function () {
        window.location.href = "space.html";
    });
})();
