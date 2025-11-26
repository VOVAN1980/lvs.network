// assets/lvs-hero-globe.js
// Мини-глобус на главной странице (index.html → #miniGlobe)

(function () {
    // Cesium ещё не подгрузился или нет контейнера — тихо выходим
    if (typeof Cesium === "undefined") return;

    var container = document.getElementById("miniGlobe");
    if (!container) return;

    // ТВОЙ реальный токен (как в space.js)
    Cesium.Ion.defaultAccessToken =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIxNGJlYzY3MS0wNzg0LTRhMTYtYTg4ZS0wZDk2Njk4MmJkODAiLCJpZCI6MzYzOTE1LCJpYXQiOjE3NjQxMTY4MTd9.mB7rmSUqh2vbP7RDT5B2nQMtOOoRNX0U1e3Z09v5ILM";

    // Создаём мини-viewer прямо в div#miniGlobe
    var viewer = new Cesium.Viewer(container, {
        imageryProvider: new Cesium.IonImageryProvider({ assetId: 2 }), // нормальная текстура земли
        terrain: Cesium.Terrain.fromWorldTerrain(),

        animation: false,
        timeline: false,
        baseLayerPicker: false,
        geocoder: false,
        homeButton: false,
        sceneModePicker: false,
        navigationHelpButton: false,
        fullscreenButton: false,
        infoBox: false,
        selectionIndicator: false,
        shouldAnimate: true
    });

    var scene = viewer.scene;

    // Космический вид: свет, атмосфера, прозрачный фон (чтобы шар был чистый в круге)
    scene.globe.enableLighting = true;
    scene.skyAtmosphere.show = true;
    scene.skyBox.show = false;
    scene.backgroundColor = Cesium.Color.TRANSPARENT;

    // Начальная позиция камеры — Европа / Африка
    viewer.camera.setView({
        destination: Cesium.Cartesian3.fromDegrees(10.0, 15.0, 16000000.0)
    });

    // Убираем даблклик-зум, чтобы не дёргался
    viewer.screenSpaceEventHandler.removeInputAction(
        Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK
    );

    // Медленное авто-вращение
    var lastTime = viewer.clock.currentTime.clone();
    var spinRate = 0.03; // скорость вращения

    viewer.clock.onTick.addEventListener(function (clock) {
        var currentTime = clock.currentTime;
        var deltaSeconds = Cesium.JulianDate.secondsDifference(
            currentTime,
            lastTime
        );
        lastTime = currentTime;

        // Плавный поворот вокруг оси Z (долгота)
        viewer.scene.camera.rotate(Cesium.Cartesian3.UNIT_Z, -spinRate * deltaSeconds);
    });

    // Клик по мини-глобусу → перейти на полную карту (space.html)
    container.style.cursor = "pointer";
    container.addEventListener("click", function () {
        window.location.href = "space.html";
    });
})();
