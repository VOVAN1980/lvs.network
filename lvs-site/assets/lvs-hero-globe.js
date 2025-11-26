// assets/lvs-hero-globe.js
(function () {
    if (typeof Cesium === "undefined") {
        return;
    }

    const container = document.getElementById("miniGlobe");
    if (!container) {
        return;
    }

    // Твой реальный токен
    Cesium.Ion.defaultAccessToken =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIxNGJlYzY3MS0wNzg0LTRhMTYtYTg4ZS0wZDk2Njk4MmJkODAiLCJpZCI6MzYzOTE1LCJpYXQiOjE3NjQxMTY4MTd9.mB7rmSUqh2vbP7RDT5B2nQMtOOoRNX0U1e3Z09v5ILM";

    // Создаём viewer прямо в miniGlobe
    const viewer = new Cesium.Viewer("miniGlobe", {
        imageryProvider: new Cesium.IonImageryProvider({ assetId: 2 }), // как на space.html
        terrain: Cesium.Terrain.fromWorldTerrain(),

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
        shouldAnimate: true    // нужно для onTick
    });

    const scene  = viewer.scene;
    const globe  = scene.globe;
    const camera = viewer.camera;

    // Немного космической атмосферы
    globe.enableLighting     = true;
    scene.skyAtmosphere.show = true;
    scene.skyBox.show        = false;

    // убираем даблклик-zoom, чтобы не «улетать» при клике
    viewer.screenSpaceEventHandler.removeInputAction(
        Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK
    );

    // Стартовая позиция – как в хорошем скрине
    camera.setView({
        destination: Cesium.Cartesian3.fromDegrees(10, 20, 13000000),
        orientation: {
            heading: Cesium.Math.toRadians(0),
            pitch:   Cesium.Math.toRadians(-20),
            roll:    0.0
        }
    });

    // Медленное вращение Земли
    const spinRate = Cesium.Math.toRadians(2.0); // градусов в секунду
    viewer.clock.onTick.addEventListener(function (clock) {
        const dt = clock.deltaSeconds;
        camera.rotate(Cesium.Cartesian3.UNIT_Z, -spinRate * dt);
    });

    // Клик по мини-глобусу → полная карта
    container.addEventListener("click", function () {
        window.location.href = "space.html";
    });

    // На всякий случай: делаем контейнер круглым и без тулбаров
    try {
        viewer.cesiumWidget.container.style.borderRadius = "999px";
    } catch (e) {
        // не критично
    }
})();
