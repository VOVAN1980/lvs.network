// assets/space/space.js — CesiumJS глобус + города

(function () {
    if (typeof Cesium === "undefined") return;

    // !!! СЮДА ВСТАВЬ СВОЙ CESIUM ION TOKEN !!!
    // Зарегаться: https://cesium.com
    Cesium.Ion.defaultAccessToken = "YOUR_CESIUM_ION_TOKEN_HERE";

    const backBtn = document.getElementById("space-back-btn");

    function goBack() {
        window.location.href = "index.html#work";
    }

    if (backBtn) {
        backBtn.addEventListener("click", goBack);
    }

    // ----- ИНИЦИАЛИЗАЦИЯ VIEWER -----
    const viewer = new Cesium.Viewer("cesiumContainer", {
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
        shouldAnimate: false,
        imageryProvider: Cesium.createWorldImagery(),
        terrain: Cesium.Terrain.fromWorldTerrain()
    });

    const scene = viewer.scene;
    scene.globe.enableLighting = true;
    scene.skyAtmosphere.show = true;
    scene.skyBox.show = true;

    // отключаем дефолтный даблклик-zoom и правую кнопку
    viewer.screenSpaceEventHandler.removeInputAction(
        Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK
    );
    viewer.screenSpaceEventHandler.removeInputAction(
        Cesium.ScreenSpaceEventType.RIGHT_CLICK
    );

    // стартовая позиция — Европа
    viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(10, 50, 15000000) // lon, lat, height (м)
    });

    // ----- ГОРОДА ДЛЯ ВЫБОРА РАБОТЫ -----
    const CITY_DATA = [
        // Германия / твой регион
        { name: "Bad Kreuznach",   lat: 49.8454, lon: 7.8670 },
        { name: "Mainz",           lat: 49.9929, lon: 8.2473 },
        { name: "Frankfurt",       lat: 50.1109, lon: 8.6821 },
        { name: "Berlin",          lat: 52.5200, lon: 13.4050 },
        { name: "Hamburg",         lat: 53.5511, lon: 9.9937 },
        { name: "Munich",          lat: 48.1351, lon: 11.5820 },

        // Европа
        { name: "Paris",           lat: 48.8566, lon: 2.3522 },
        { name: "London",          lat: 51.5074, lon: -0.1278 },
        { name: "Warsaw",          lat: 52.2297, lon: 21.0122 },
        { name: "Prague",          lat: 50.0755, lon: 14.4378 },
        { name: "Vienna",          lat: 48.2082, lon: 16.3738 },
        { name: "Rome",            lat: 41.9028, lon: 12.4964 },
        { name: "Madrid",          lat: 40.4168, lon: -3.7038 },

        // мир
        { name: "New York",        lat: 40.7128, lon: -74.0060 },
        { name: "Los Angeles",     lat: 34.0522, lon: -118.2437 },
        { name: "Tokyo",           lat: 35.6762, lon: 139.6503 },
        { name: "Seoul",           lat: 37.5665, lon: 126.9780 },
        { name: "Singapore",       lat: 1.3521,  lon: 103.8198 },
        { name: "Sydney",          lat: -33.8688, lon: 151.2093 },
        { name: "São Paulo",       lat: -23.5505, lon: -46.6333 }
    ];

    const cityEntities = [];

    CITY_DATA.forEach(city => {
        const entity = viewer.entities.add({
            position: Cesium.Cartesian3.fromDegrees(city.lon, city.lat, 0),
            point: {
                pixelSize: 8,
                color: Cesium.Color.YELLOW.withAlpha(0.95),
                outlineColor: Cesium.Color.BLACK,
                outlineWidth: 1
            },
            label: {
                text: city.name,
                font: "12px 'Segoe UI', sans-serif",
                fillColor: Cesium.Color.WHITE,
                outlineColor: Cesium.Color.BLACK,
                outlineWidth: 2,
                style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                pixelOffset: new Cesium.Cartesian2(0, -18),
                disableDepthTestDistance: Number.POSITIVE_INFINITY
            },
            properties: {
                cityName: city.name,
                lat: city.lat,
                lon: city.lon
            }
        });

        cityEntities.push(entity);
    });

    // ----- ОБРАБОТКА ДВОЙНОГО КЛИКА -----
    const handler = new Cesium.ScreenSpaceEventHandler(viewer.canvas);

    handler.setInputAction(function (click) {
        const picked = scene.pick(click.position);

        if (Cesium.defined(picked) && picked.id && picked.id.properties) {
            const props = picked.id.properties;
            const cityName = props.cityName && props.cityName.getValue();
            const lat      = props.lat && props.lat.getValue();
            const lon      = props.lon && props.lon.getValue();

            if (cityName && typeof lat === "number" && typeof lon === "number") {
                // плавно подлететь к городу
                viewer.camera.flyTo({
                    destination: Cesium.Cartesian3.fromDegrees(lon, lat, 800000), // высота ~800км
                    duration: 0.9
                });

                // открыть страницу города
                const url =
                    "/lvs-site/region.html?city=" +
                    encodeURIComponent(cityName) +
                    "&lat=" + lat.toFixed(4) +
                    "&lon=" + lon.toFixed(4);

                // небольшая задержка, чтобы анимация успела стартовать
                setTimeout(() => {
                    window.location.href = url;
                }, 400);

                return;
            }
        }

        // если кликнули не по entity — просто фокус по координатам
        const ellipsoid = scene.globe.ellipsoid;
        const cartesian = viewer.camera.pickEllipsoid(click.position, ellipsoid);
        if (!cartesian) return;

        const cartographic = ellipsoid.cartesianToCartographic(cartesian);
        const latDeg = Cesium.Math.toDegrees(cartographic.latitude);
        const lonDeg = Cesium.Math.toDegrees(cartographic.longitude);

        viewer.camera.flyTo({
            destination: Cesium.Cartesian3.fromDegrees(lonDeg, latDeg, 1600000),
            duration: 0.9
        });
    }, Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);

    // ----- ПРАВАЯ КНОПКА / ESC = НАЗАД -----
    window.addEventListener("keydown", function (e) {
        if (e.key === "Escape") {
            goBack();
        }
    });
})();

