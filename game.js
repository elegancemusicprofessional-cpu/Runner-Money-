// ============================================================
// RUNNER MONEY - MOTOR 3D (Three.js)
// Archivo: game.js
// Conexión: #gameContainer en index.html
// ============================================================

(function () {
    'use strict';

    // ============================================================
    // CONFIGURACIÓN GLOBAL DEL JUEGO
    // ============================================================
    const CONFIG = {
        lanes: [-3, 0, 3],
        laneWidth: 3,
        startSpeed: 0.35,
        maxSpeed: 0.85,
        speedIncrement: 0.00008,
        jumpForce: 0.32,
        gravity: 0.016,
        obstacleSpawnRate: 0.025,
        coinSpawnRate: 0.04,
        coinValue: 10,
        playerZ: 5,
        cameraOffsetY: 5,
        cameraOffsetZ: 10,
        fogColor: 0x1a0a2e,
        fogDensity: 0.025,
        skillDuration: 15000, // 15 segundos en ms
        adsgramUnitId: '52617'
    };

    // ============================================================
    // ESTADO DEL JUEGO
    // ============================================================
    const game = {
        scene: null,
        camera: null,
        renderer: null,
        clock: null,
        player: null,
        playerParts: {},
        obstacles: [],
        coins: [],
        particles: [],
        buildings: [],
        zombies: [],
        policeLights: { red: null, blue: null },
        graffitiWall: null,
        decorativeCoins: [],

        isPlaying: false,
        isPreGame: true,
        isPaused: false,
        lives: 3,
        currentCoins: 0,
        distance: 0,
        speed: CONFIG.startSpeed,
        currentLane: 1,
        targetLane: 1,
        playerY: 0,
        jumpVelocity: 0,
        isJumping: false,
        isSliding: false,
        slideTimer: 0,
        invincibleTimer: 0,
        animationId: null,
        spawnInterval: null,
        policeInterval: null,
        skillTimers: {},
        activeSkills: {
            jetpack: false,
            jump: false,
            shield: false,
            magnet: false,
            double: false
        },
        touchStartX: 0,
        touchStartY: 0,
        hudElements: {},
        gameOverElements: {},
        skillsPanel: null
    };

    // ============================================================
    // INICIALIZACIÓN PRINCIPAL
    // ============================================================
    function initGame() {
        const container = document.getElementById('gameContainer');
        if (!container) {
            console.warn('game.js: #gameContainer no encontrado');
            return;
        }

        // Escena
        game.scene = new THREE.Scene();
        game.scene.background = new THREE.Color(0x0f0a1c);
        game.scene.fog = new THREE.FogExp2(CONFIG.fogColor, CONFIG.fogDensity);

        // Cámara
        game.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            200
        );
        game.camera.position.set(0, CONFIG.cameraOffsetY, CONFIG.cameraOffsetZ);
        game.camera.lookAt(0, 2, 0);

        // Renderer
        game.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
            powerPreference: 'high-performance'
        });
        game.renderer.setSize(window.innerWidth, window.innerHeight);
        game.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        game.renderer.shadowMap.enabled = true;
        game.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        game.renderer.outputColorSpace = THREE.SRGBColorSpace;
        container.appendChild(game.renderer.domElement);

        // Reloj
        game.clock = new THREE.Clock();

        // Luces
        setupLights();

        // Entorno
        createEnvironment();

        // Jugador
        createPlayer();

        // Pared de grafiti (pre-juego)
        createGraffitiWall();

        // Controles
        setupControls();

        // Resize
        window.addEventListener('resize', onWindowResize);

        // Conectar botones del index.html
        connectUIButtons();

        // Crear HUD y Game Over
        createHUD();
        createGameOverScreen();
        createSkillsPanel();

        // Iniciar animación pre-juego
        animatePreGame();

        console.log('✅ game.js: Motor 3D inicializado correctamente');
    }

    // ============================================================
    // SISTEMA DE LUCES
    // ============================================================
    function setupLights() {
        // Luz ambiental
        const ambient = new THREE.AmbientLight(0x404040, 0.6);
        game.scene.add(ambient);

        // Luz direccional (luna)
        const moonLight = new THREE.DirectionalLight(0x8888ff, 0.8);
        moonLight.position.set(10, 25, 15);
        moonLight.castShadow = true;
        moonLight.shadow.camera.left = -25;
        moonLight.shadow.camera.right = 25;
        moonLight.shadow.camera.top = 25;
        moonLight.shadow.camera.bottom = -25;
        moonLight.shadow.mapSize.width = 2048;
        moonLight.shadow.mapSize.height = 2048;
        game.scene.add(moonLight);

        // Luces de policía (se activan al iniciar carrera)
        game.policeLights.red = new THREE.PointLight(0xff0000, 0, 30);
        game.policeLights.red.position.set(-5, 10, -15);
        game.scene.add(game.policeLights.red);

        game.policeLights.blue = new THREE.PointLight(0x0000ff, 0, 30);
        game.policeLights.blue.position.set(5, 10, -15);
        game.scene.add(game.policeLights.blue);

        // Luz puntual naranja (ambientación Halloween)
        const halloweenLight = new THREE.PointLight(0xff6b00, 0.5, 50);
        halloweenLight.position.set(0, 8, -20);
        game.scene.add(halloweenLight);
    }

    // ============================================================
    // ENTORNO URBANO HALLOWEEN
    // ============================================================
    function createEnvironment() {
        // Suelo principal
        const groundGeo = new THREE.PlaneGeometry(30, 300);
        const groundMat = new THREE.MeshStandardMaterial({
            color: 0x111111,
            roughness: 0.9,
            metalness: 0.1
        });
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.position.z = -100;
        ground.receiveShadow = true;
        game.scene.add(ground);

        // Carretera
        const roadGeo = new THREE.PlaneGeometry(12, 300);
        const roadMat = new THREE.MeshStandardMaterial({
            color: 0x1a1a1a,
            roughness: 0.6,
            metalness: 0.3
        });
        const road = new THREE.Mesh(roadGeo, roadMat);
        road.rotation.x = -Math.PI / 2;
        road.position.set(0, 0.01, -100);
        road.receiveShadow = true;
        game.scene.add(road);

        // Líneas de carril
        const lineMat = new THREE.MeshBasicMaterial({ color: 0xff6b00 });
        for (let i = -1; i <= 1; i++) {
            const lineGeo = new THREE.PlaneGeometry(0.15, 300);
            const line = new THREE.Mesh(lineGeo, lineMat);
            line.rotation.x = -Math.PI / 2;
            line.position.set(i * CONFIG.laneWidth, 0.02, -100);
            game.scene.add(line);
        }

        // Bordes de carretera
        for (let side of [-1, 1]) {
            const edgeGeo = new THREE.PlaneGeometry(0.3, 300);
            const edgeMat = new THREE.MeshBasicMaterial({ color: 0xff6b00 });
            const edge = new THREE.Mesh(edgeGeo, edgeMat);
            edge.rotation.x = -Math.PI / 2;
            edge.position.set(side * 6, 0.02, -100);
            game.scene.add(edge);
        }

        // Edificios
        createBuildings();

        // Zombies decorativos
        createZombies();
    }

    function createBuildings() {
        const buildingColors = [0x1a1530, 0x221a40, 0x15102a, 0x2a2040];
        const windowMat = new THREE.MeshBasicMaterial({
            color: 0xffcc00,
            emissive: 0xffcc00,
            emissiveIntensity: 0.6
        });

        for (let i = 0; i < 30; i++) {
            const side = i % 2 === 0 ? -1 : 1;
            const height = 8 + Math.random() * 14;
            const width = 3 + Math.random() * 3;
            const depth = 3 + Math.random() * 3;

            const geo = new THREE.BoxGeometry(width, height, depth);
            const mat = new THREE.MeshStandardMaterial({
                color: buildingColors[Math.floor(Math.random() * buildingColors.length)],
                roughness: 0.7,
                metalness: 0.3
            });

            const building = new THREE.Mesh(geo, mat);
            building.position.set(
                side * (9 + Math.random() * 4),
                height / 2,
                -i * 12 - 15
            );
            building.castShadow = true;
            building.receiveShadow = true;

            // Ventanas
            const winGeo = new THREE.PlaneGeometry(0.5, 0.6);
            const rows = Math.floor(height / 2.5);
            const cols = Math.floor(width / 1.8);
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    if (Math.random() > 0.35) {
                        const win = new THREE.Mesh(winGeo, windowMat);
                        win.position.set(
                            -width / 2 + (c + 0.5) * (width / cols),
                            -height / 2 + (r + 0.5) * (height / rows),
                            depth / 2 + 0.02
                        );
                        building.add(win);
                    }
                }
            }

            game.buildings.push(building);
            game.scene.add(building);
        }
    }

    function createZombies() {
        for (let i = 0; i < 20; i++) {
            const side = i % 2 === 0 ? -1 : 1;

            const zombie = new THREE.Group();

            // Cuerpo
            const bodyGeo = new THREE.CylinderGeometry(0.3, 0.4, 1.6, 8);
            const bodyMat = new THREE.MeshStandardMaterial({
                color: 0x2a4a2a,
                roughness: 0.9
            });
            const body = new THREE.Mesh(bodyGeo, bodyMat);
            body.position.y = 0.8;
            zombie.add(body);

            // Cabeza
            const headGeo = new THREE.SphereGeometry(0.35, 8, 8);
            const headMat = new THREE.MeshStandardMaterial({
                color: 0x3a5a3a,
                roughness: 0.9
            });
            const head = new THREE.Mesh(headGeo, headMat);
            head.position.y = 1.9;
            zombie.add(head);

            // Ojos brillantes
            const eyeGeo = new THREE.SphereGeometry(0.08, 6, 6);
            const eyeMat = new THREE.MeshBasicMaterial({
                color: 0xff0000,
                emissive: 0xff0000,
                emissiveIntensity: 1
            });
            const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
            leftEye.position.set(-0.12, 1.95, 0.3);
            zombie.add(leftEye);
            const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
            rightEye.position.set(0.12, 1.95, 0.3);
            zombie.add(rightEye);

            zombie.position.set(
                side * (7 + Math.random() * 2),
                0,
                -i * 18 - 8
            );
            zombie.rotation.y = side > 0 ? -Math.PI / 4 : Math.PI / 4;

            game.zombies.push(zombie);
            game.scene.add(zombie);
        }
    }

    // ============================================================
    // JUGADOR (CALAVERA 3D)
    // ============================================================
    function createPlayer() {
        game.player = new THREE.Group();
        const isBoy = GameState.selectedCharacter === 'boy';
        const bodyColor = isBoy ? 0x111111 : 0x222222;
        const eyeColor = isBoy ? 0x00ff00 : 0x8b00ff;

        // Cuerpo
        const bodyGeo = new THREE.CylinderGeometry(0.35, 0.45, 1.1, 12);
        const bodyMat = new THREE.MeshStandardMaterial({
            color: bodyColor,
            roughness: 0.6,
            metalness: 0.4
        });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 0.85;
        body.castShadow = true;
        game.player.add(body);
        game.playerParts.body = body;

        // Cabeza (calavera)
        const headGeo = new THREE.SphereGeometry(0.45, 16, 16);
        const headMat = new THREE.MeshStandardMaterial({
            color: 0xeeeeee,
            roughness: 0.5,
            metalness: 0.1
        });
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.y = 1.75;
        head.castShadow = true;
        game.player.add(head);
        game.playerParts.head = head;

        // Mandíbula
        const jawGeo = new THREE.BoxGeometry(0.35, 0.15, 0.25);
        const jawMat = new THREE.MeshStandardMaterial({ color: 0xdddddd });
        const jaw = new THREE.Mesh(jawGeo, jawMat);
        jaw.position.set(0, 1.5, 0.25);
        game.player.add(jaw);

        // Ojos brillantes
        const eyeGeo = new THREE.SphereGeometry(0.12, 8, 8);
        const eyeMat = new THREE.MeshBasicMaterial({
            color: eyeColor,
            emissive: eyeColor,
            emissiveIntensity: 1.5
        });

        const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
        leftEye.position.set(-0.18, 1.8, 0.35);
        game.player.add(leftEye);
        game.playerParts.leftEye = leftEye;

        const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
        rightEye.position.set(0.18, 1.8, 0.35);
        game.player.add(rightEye);
        game.playerParts.rightEye = rightEye;

        // Gorra o peinado
        if (isBoy) {
            const hatGeo = new THREE.CylinderGeometry(0.35, 0.48, 0.25, 12);
            const hatMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
            const hat = new THREE.Mesh(hatGeo, hatMat);
            hat.position.y = 2.1;
            hat.rotation.x = -0.3;
            hat.rotation.z = Math.PI;
            game.player.add(hat);

            const brimGeo = new THREE.BoxGeometry(0.4, 0.05, 0.5);
            const brim = new THREE.Mesh(brimGeo, hatMat);
            brim.position.set(0, 2.05, -0.35);
            game.player.add(brim);
        } else {
            const hairGeo = new THREE.CylinderGeometry(0.08, 0.12, 0.9, 8);
            const hairMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });
            const hair = new THREE.Mesh(hairGeo, hairMat);
            hair.position.set(0, 1.9, -0.4);
            hair.rotation.x = Math.PI / 4;
            game.player.add(hair);

            const bowGeo = new THREE.SphereGeometry(0.1, 8, 8);
            const bowMat = new THREE.MeshStandardMaterial({ color: 0x8b00ff });
            const bow = new THREE.Mesh(bowGeo, bowMat);
            bow.position.set(0, 2.15, -0.2);
            game.player.add(bow);
        }

        // Brazos
        const armGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.7, 8);
        const armMat = new THREE.MeshStandardMaterial({ color: bodyColor });

        const leftArm = new THREE.Mesh(armGeo, armMat);
        leftArm.position.set(-0.5, 0.9, 0);
        leftArm.rotation.z = 0.3;
        leftArm.castShadow = true;
        game.player.add(leftArm);
        game.playerParts.leftArm = leftArm;

        const rightArm = new THREE.Mesh(armGeo, armMat);
        rightArm.position.set(0.5, 0.9, 0);
        rightArm.rotation.z = -0.3;
        rightArm.castShadow = true;
        game.player.add(rightArm);
        game.playerParts.rightArm = rightArm;

        // Piernas
        const legGeo = new THREE.CylinderGeometry(0.13, 0.13, 0.75, 8);
        const legMat = new THREE.MeshStandardMaterial({ color: 0x222222 });

        const leftLeg = new THREE.Mesh(legGeo, legMat);
        leftLeg.position.set(-0.2, 0.35, 0);
        leftLeg.castShadow = true;
        game.player.add(leftLeg);
        game.playerParts.leftLeg = leftLeg;

        const rightLeg = new THREE.Mesh(legGeo, legMat);
        rightLeg.position.set(0.2, 0.35, 0);
        rightLeg.castShadow = true;
        game.player.add(rightLeg);
        game.playerParts.rightLeg = rightLeg;

        // Tenis
        const shoeGeo = new THREE.BoxGeometry(0.22, 0.12, 0.35);
        const shoeMat = new THREE.MeshStandardMaterial({ color: 0x111111 });

        const leftShoe = new THREE.Mesh(shoeGeo, shoeMat);
        leftShoe.position.set(-0.2, 0.02, 0.05);
        game.player.add(leftShoe);
        game.playerParts.leftShoe = leftShoe;

        const rightShoe = new THREE.Mesh(shoeGeo, shoeMat);
        rightShoe.position.set(0.2, 0.02, 0.05);
        game.player.add(rightShoe);
        game.playerParts.rightShoe = rightShoe;

        game.player.position.set(0, 0, CONFIG.playerZ);
        game.scene.add(game.player);
    }

    // ============================================================
    // PARED DE GRAFITI (PRE-JUEGO)
    // ============================================================
    function createGraffitiWall() {
        // Pared
        const wallGeo = new THREE.BoxGeometry(10, 6, 0.5);
        const wallMat = new THREE.MeshStandardMaterial({
            color: 0x333333,
            roughness: 0.95
        });
        game.graffitiWall = new THREE.Mesh(wallGeo, wallMat);
        game.graffitiWall.position.set(0, 3, -3);
        game.graffitiWall.castShadow = true;
        game.graffitiWall.receiveShadow = true;
        game.scene.add(game.graffitiWall);

        // Texto "EleganceCoin" como textura en canvas
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');

        // Fondo transparente
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Texto con estilo grafiti
        ctx.font = 'bold 90px Impact, Arial Black, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Sombra
        ctx.shadowColor = '#ff6b00';
        ctx.shadowBlur = 20;
        ctx.shadowOffsetX = 3;
        ctx.shadowOffsetY = 3;

        // Gradiente
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
        gradient.addColorStop(0, '#00ff00');
        gradient.addColorStop(0.5, '#ffd700');
        gradient.addColorStop(1, '#8b00ff');
        ctx.fillStyle = gradient;
        ctx.fillText('EleganceCoin', canvas.width / 2, canvas.height / 2);

        // Contorno
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeText('EleganceCoin', canvas.width / 2, canvas.height / 2);

        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;

        const textGeo = new THREE.PlaneGeometry(8, 2);
        const textMat = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            side: THREE.DoubleSide
        });
        const textMesh = new THREE.Mesh(textGeo, textMat);
        textMesh.position.set(0, 3.5, -2.74);
        game.scene.add(textMesh);
        game.graffitiText = textMesh;

        // Monedas decorativas saltando
        for (let i = 0; i < 8; i++) {
            const coin = createCoinMesh();
            coin.position.set(
                -5 + Math.random() * 10,
                1 + Math.random() * 4,
                -2.5 + Math.random() * 1.5
            );
            coin.userData.isDecorative = true;
            coin.userData.baseY = coin.position.y;
            coin.userData.phase = Math.random() * Math.PI * 2;
            coin.userData.bounceSpeed = 2 + Math.random() * 2;
            game.decorativeCoins.push(coin);
            game.scene.add(coin);
        }

        // Spray can en mano del jugador (animación de grafiti)
        const sprayGeo = new THREE.CylinderGeometry(0.06, 0.08, 0.25, 8);
        const sprayMat = new THREE.MeshStandardMaterial({
            color: 0x00ff00,
            metalness: 0.7,
            roughness: 0.3
        });
        const spray = new THREE.Mesh(sprayGeo, sprayMat);
        spray.position.set(0.55, 1.0, 0.15);
        spray.rotation.z = -0.5;
        game.player.add(spray);
        game.playerParts.spray = spray;
    }

    function createCoinMesh() {
        const geo = new THREE.CylinderGeometry(0.35, 0.35, 0.08, 20);
        const mat = new THREE.MeshStandardMaterial({
            color: 0xffd700,
            metalness: 0.9,
            roughness: 0.1,
            emissive: 0xffd700,
            emissiveIntensity: 0.3
        });
        const coin = new THREE.Mesh(geo, mat);
        coin.rotation.x = Math.PI / 2;
        coin.castShadow = true;
        return coin;
    }

    // ============================================================
    // OBSTÁCULOS
    // ============================================================
    function createObstacle(type, lane) {
        let obstacle;

        if (type === 'train') {
            obstacle = new THREE.Group();

            const bodyGeo = new THREE.BoxGeometry(2.2, 3, 8);
            const bodyMat = new THREE.MeshStandardMaterial({
                color: 0xcc0000,
                metalness: 0.5,
                roughness: 0.4
            });
            const body = new THREE.Mesh(bodyGeo, bodyMat);
            body.position.y = 1.5;
            body.castShadow = true;
            obstacle.add(body);

            // Techo
            const roofGeo = new THREE.BoxGeometry(2.4, 0.3, 8.2);
            const roofMat = new THREE.MeshStandardMaterial({ color: 0x990000 });
            const roof = new THREE.Mesh(roofGeo, roofMat);
            roof.position.y = 3.1;
            obstacle.add(roof);

            // Ventanas
            const winGeo = new THREE.PlaneGeometry(0.8, 0.6);
            const winMat = new THREE.MeshBasicMaterial({
                color: 0xffcc00,
                emissive: 0xffcc00,
                emissiveIntensity: 0.4
            });
            for (let i = 0; i < 3; i++) {
                const win = new THREE.Mesh(winGeo, winMat);
                win.position.set(0, 2, -3 + i * 3);
                win.rotation.y = Math.PI / 2;
                obstacle.add(win);
            }

            obstacle.userData.height = 3;

        } else if (type === 'barrier') {
            obstacle = new THREE.Group();

            const barGeo = new THREE.BoxGeometry(2.8, 1.2, 0.4);
            const barMat = new THREE.MeshStandardMaterial({
                color: 0xff4444,
                metalness: 0.3,
                roughness: 0.6
            });
            const bar = new THREE.Mesh(barGeo, barMat);
            bar.position.y = 0.6;
            bar.castShadow = true;
            obstacle.add(bar);

            // Rayas amarillas
            const stripeGeo = new THREE.BoxGeometry(0.35, 1.2, 0.42);
            const stripeMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
            for (let i = -1; i <= 1; i++) {
                const stripe = new THREE.Mesh(stripeGeo, stripeMat);
                stripe.position.set(i * 0.9, 0.6, 0);
                obstacle.add(stripe);
            }

            // Postes
            const poleGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.2, 8);
            const poleMat = new THREE.MeshStandardMaterial({ color: 0x666666 });
            const leftPole = new THREE.Mesh(poleGeo, poleMat);
            leftPole.position.set(-1.3, 0.6, 0);
            obstacle.add(leftPole);
            const rightPole = new THREE.Mesh(poleGeo, poleMat);
            rightPole.position.set(1.3, 0.6, 0);
            obstacle.add(rightPole);

            obstacle.userData.height = 1.2;

        } else {
            // Calabaza
            obstacle = new THREE.Group();

            const pumpkinGeo = new THREE.SphereGeometry(0.9, 16, 16);
            pumpkinGeo.scale(1, 0.8, 1);
            const pumpkinMat = new THREE.MeshStandardMaterial({
                color: 0xff6b00,
                roughness: 0.7
            });
            const pumpkin = new THREE.Mesh(pumpkinGeo, pumpkinMat);
            pumpkin.position.y = 0.8;
            pumpkin.castShadow = true;
            obstacle.add(pumpkin);

            // Tallo
            const stemGeo = new THREE.CylinderGeometry(0.08, 0.12, 0.3, 8);
            const stemMat = new THREE.MeshStandardMaterial({ color: 0x2a5a0a });
            const stem = new THREE.Mesh(stemGeo, stemMat);
            stem.position.y = 1.6;
            obstacle.add(stem);

            // Ojos brillantes
            const eyeGeo = new THREE.SphereGeometry(0.15, 8, 8);
            const eyeMat = new THREE.MeshBasicMaterial({
                color: 0x00ff00,
                emissive: 0x00ff00,
                emissiveIntensity: 2
            });
            const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
            leftEye.position.set(-0.35, 0.95, 0.7);
            obstacle.add(leftEye);
            const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
            rightEye.position.set(0.35, 0.95, 0.7);
            obstacle.add(rightEye);

            // Boca
            const mouthGeo = new THREE.BoxGeometry(0.6, 0.2, 0.1);
            const mouthMat = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
            const mouth = new THREE.Mesh(mouthGeo, mouthMat);
            mouth.position.set(0, 0.55, 0.8);
            obstacle.add(mouth);

            obstacle.userData.height = 1.6;
        }

        obstacle.position.set(CONFIG.lanes[lane], 0, -120);
        obstacle.userData.lane = lane;
        obstacle.userData.type = type;
        obstacle.userData.passed = false;

        return obstacle;
    }

    // ============================================================
    // CONTROLES
    // ============================================================
    function setupControls() {
        // Teclado
        document.addEventListener('keydown', (e) => {
            if (!game.isPlaying || game.isPaused) return;

            switch (e.key) {
                case 'ArrowLeft':
                case 'a':
                case 'A':
                    moveLeft();
                    break;
                case 'ArrowRight':
                case 'd':
                case 'D':
                    moveRight();
                    break;
                case 'ArrowUp':
                case 'w':
                case 'W':
                case ' ':
                    jump();
                    break;
                case 'ArrowDown':
                case 's':
                case 'S':
                    slide();
                    break;
            }
        });

        // Táctil
        const canvas = game.renderer.domElement;

        canvas.addEventListener('touchstart', (e) => {
            if (!game.isPlaying) return;
            game.touchStartX = e.touches[0].clientX;
            game.touchStartY = e.touches[0].clientY;
        }, { passive: true });

        canvas.addEventListener('touchend', (e) => {
            if (!game.isPlaying || game.isPaused) return;

            const touchEndX = e.changedTouches[0].clientX;
            const touchEndY = e.changedTouches[0].clientY;
            const diffX = touchEndX - game.touchStartX;
            const diffY = touchEndY - game.touchStartY;
            const threshold = 40;

            if (Math.abs(diffX) > Math.abs(diffY)) {
                if (diffX > threshold) moveRight();
                else if (diffX < -threshold) moveLeft();
            } else {
                if (diffY < -threshold) jump();
                else if (diffY > threshold) slide();
            }
        }, { passive: true });
    }

    function moveLeft() {
        if (game.currentLane > 0) {
            game.targetLane = game.currentLane - 1;
        }
    }

    function moveRight() {
        if (game.currentLane < 2) {
            game.targetLane = game.currentLane + 1;
        }
    }

    function jump() {
        if (!game.isJumping && !game.isSliding) {
            game.isJumping = true;
            game.jumpVelocity = CONFIG.jumpForce;

            if (GameState.settings.sfx) {
                playSound('jump');
            }
        }
    }

    function slide() {
        if (!game.isJumping && !game.isSliding) {
            game.isSliding = true;
            game.slideTimer = 30;

            if (GameState.settings.sfx) {
                playSound('slide');
            }
        }
    }

    // ============================================================
    // CONEXIÓN CON UI DEL INDEX.HTML
    // ============================================================
    function connectUIButtons() {
        const startBtn = document.getElementById('startRunBtn');
        if (startBtn) {
            startBtn.addEventListener('click', startRace);
        }

        const leftBtn = document.getElementById('leftBtn');
        if (leftBtn) {
            leftBtn.addEventListener('click', moveLeft);
        }

        const rightBtn = document.getElementById('rightBtn');
        if (rightBtn) {
            rightBtn.addEventListener('click', moveRight);
        }

        const jumpBtn = document.getElementById('jumpBtn');
        if (jumpBtn) {
            jumpBtn.addEventListener('click', jump);
        }

        const getSkillsBtn = document.getElementById('getSkillsBtn');
        if (getSkillsBtn) {
            getSkillsBtn.addEventListener('click', () => {
                showAd(() => {
                    Object.keys(GameState.skills).forEach(key => {
                        GameState.skills[key] += 3;
                    });
                    saveGameState();
                    updateSkillsUI();
                    showToast('¡+3 habilidades de cada tipo!');
                });
            });
        }

        // Skills selector
        document.querySelectorAll('.skill-option').forEach(opt => {
            opt.addEventListener('click', () => {
                opt.classList.toggle('selected');
            });
        });
    }

    function updateSkillsUI() {
        Object.keys(GameState.skills).forEach(skill => {
            const el = document.querySelector(`[data-skill="${skill}"] .skill-count`);
            if (el) el.textContent = GameState.skills[skill];
        });
    }

    // ============================================================
    // PANTALLA DE INICIO (PRE-JUEGO)
    // ============================================================
    function animatePreGame() {
        if (game.isPlaying) return;

        game.animationId = requestAnimationFrame(animatePreGame);
        const time = game.clock.getElapsedTime();

        // Animación del jugador haciendo grafiti
        if (game.player) {
            game.player.rotation.y = Math.sin(time * 1.5) * 0.15;

            // Brazo derecho moviendo spray
            if (game.playerParts.rightArm) {
                game.playerParts.rightArm.rotation.z = -0.3 + Math.sin(time * 3) * 0.3;
                game.playerParts.rightArm.rotation.x = Math.sin(time * 2) * 0.2;
            }

            // Piernas
            if (game.playerParts.leftLeg && game.playerParts.rightLeg) {
                game.playerParts.leftLeg.rotation.x = Math.sin(time * 2) * 0.1;
                game.playerParts.rightLeg.rotation.x = Math.sin(time * 2 + Math.PI) * 0.1;
            }

            // Ojos brillando
            if (game.playerParts.leftEye && game.playerParts.rightEye) {
                const intensity = 1 + Math.sin(time * 4) * 0.5;
                game.playerParts.leftEye.material.emissiveIntensity = intensity;
                game.playerParts.rightEye.material.emissiveIntensity = intensity;
            }
        }

        // Monedas decorativas saltando
        game.decorativeCoins.forEach(coin => {
            coin.rotation.y += 0.03;
            coin.position.y = coin.userData.baseY +
                Math.abs(Math.sin(time * coin.userData.bounceSpeed + coin.userData.phase)) * 1.5;
        });

        // Texto brillando
        if (game.graffitiText) {
            game.graffitiText.material.opacity = 0.8 + Math.sin(time * 2) * 0.2;
        }

        // Cámara suave
        game.camera.position.x = Math.sin(time * 0.5) * 0.5;
        game.camera.lookAt(0, 2, -3);

        game.renderer.render(game.scene, game.camera);
    }

    // ============================================================
    // INICIO DE CARRERA
    // ============================================================
    function startRace() {
        if (game.isPlaying) return;

        console.log('🏁 Iniciando carrera...');

        // Limpiar pre-juego
        cancelAnimationFrame(game.animationId);

        // Remover pared de grafiti
        if (game.graffitiWall) {
            game.scene.remove(game.graffitiWall);
            game.graffitiWall = null;
        }
        if (game.graffitiText) {
            game.scene.remove(game.graffitiText);
            game.graffitiText = null;
        }

        // Remover spray del jugador
        if (game.playerParts.spray) {
            game.player.remove(game.playerParts.spray);
            game.playerParts.spray = null;
        }

        // Remover monedas decorativas
        game.decorativeCoins.forEach(coin => {
            game.scene.remove(coin);
        });
        game.decorativeCoins = [];

        // Ocultar overlay del menú
        const overlay = document.querySelector('.game-overlay');
        if (overlay) {
            overlay.style.display = 'none';
        }

        // Reset estado de juego
        game.isPlaying = true;
        game.isPreGame = false;
        game.lives = 3;
        game.currentCoins = 0;
        game.distance = 0;
        game.speed = CONFIG.startSpeed;
        game.currentLane = 1;
        game.targetLane = 1;
        game.playerY = 0;
        game.jumpVelocity = 0;
        game.isJumping = false;
        game.isSliding = false;
        game.invincibleTimer = 0;
        game.obstacles = [];
        game.coins = [];
        game.particles = [];

        // Reset habilidades activas
        Object.keys(game.activeSkills).forEach(key => {
            game.activeSkills[key] = false;
        });

        // Posicionar jugador
        game.player.position.set(0, 0, CONFIG.playerZ);
        game.player.rotation.y = 0;
        game.player.scale.set(1, 1, 1);

        // Activar luces de policía
        activatePoliceLights();

        // Mostrar HUD
        showHUD();

        // Iniciar spawning
        startSpawning();

        // Iniciar game loop
        game.clock.getDelta(); // Reset delta
        gameLoop();

        if (GameState.settings.sfx) {
            playSound('start');
        }
    }

    function activatePoliceLights() {
        let flash = false;
        clearInterval(game.policeInterval);
        game.policeInterval = setInterval(() => {
            flash = !flash;
            game.policeLights.red.intensity = flash ? 3 : 0;
            game.policeLights.blue.intensity = flash ? 0 : 3;
        }, 350);
    }

    function startSpawning() {
        clearInterval(game.spawnInterval);
        game.spawnInterval = setInterval(() => {
            if (!game.isPlaying) return;

            // Obstáculos
            if (Math.random() < CONFIG.obstacleSpawnRate + game.distance * 0.00001) {
                const lane = Math.floor(Math.random() * 3);
                const types = ['train', 'barrier', 'pumpkin'];
                const type = types[Math.floor(Math.random() * types.length)];
                const obstacle = createObstacle(type, lane);
                game.obstacles.push(obstacle);
                game.scene.add(obstacle);
            }

            // Monedas
            if (Math.random() < CONFIG.coinSpawnRate) {
                const lane = Math.floor(Math.random() * 3);
                const count = 3 + Math.floor(Math.random() * 4);
                for (let i = 0; i < count; i++) {
                    const coin = createCoinMesh();
                    coin.position.set(
                        CONFIG.lanes[lane],
                        1.2 + Math.sin(i * 0.5) * 0.5,
                        -120 - i * 2.5
                    );
                    coin.userData.lane = lane;
                    game.coins.push(coin);
                    game.scene.add(coin);
                }
            }
        }, 120);
    }

    // ============================================================
    // GAME LOOP PRINCIPAL
    // ============================================================
    function gameLoop() {
        if (!game.isPlaying) return;

        game.animationId = requestAnimationFrame(gameLoop);
        const delta = Math.min(game.clock.getDelta(), 0.05);
        const time = game.clock.getElapsedTime();

        // Actualizar distancia y velocidad
        game.distance += game.speed;
        game.speed = Math.min(CONFIG.maxSpeed, CONFIG.startSpeed + game.distance * CONFIG.speedIncrement);

        // Movimiento lateral suave
        const targetX = CONFIG.lanes[game.targetLane];
        game.player.position.x += (targetX - game.player.position.x) * 0.12;
        game.currentLane = game.targetLane;

        // Física de salto
        if (game.isJumping) {
            game.playerY += game.jumpVelocity;
            game.jumpVelocity -= CONFIG.gravity;

            if (game.playerY <= 0) {
                game.playerY = 0;
                game.isJumping = false;
                game.jumpVelocity = 0;
            }
        }

        // Jetpack skill
        if (game.activeSkills.jetpack) {
            game.playerY = Math.max(game.playerY, 4);
        }

        game.player.position.y = game.playerY;

        // Slide
        if (game.isSliding) {
            game.slideTimer--;
            game.player.scale.y = 0.5;
            if (game.slideTimer <= 0) {
                game.isSliding = false;
                game.player.scale.y = 1;
            }
        } else {
            game.player.scale.y = 1;
        }

        // Animación de piernas al correr
        if (!game.isJumping && !game.isSliding) {
            const runSpeed = game.speed * 25;
            if (game.playerParts.leftLeg && game.playerParts.rightLeg) {
                game.playerParts.leftLeg.rotation.x = Math.sin(game.distance * runSpeed) * 0.6;
                game.playerParts.rightLeg.rotation.x = Math.sin(game.distance * runSpeed + Math.PI) * 0.6;
            }
            if (game.playerParts.leftArm && game.playerParts.rightArm) {
                game.playerParts.leftArm.rotation.x = Math.sin(game.distance * runSpeed + Math.PI) * 0.4;
                game.playerParts.rightArm.rotation.x = Math.sin(game.distance * runSpeed) * 0.4;
            }
        }

        // Ojos brillando
        if (game.playerParts.leftEye && game.playerParts.rightEye) {
            const glow = 1.5 + Math.sin(time * 5) * 0.5;
            game.playerParts.leftEye.material.emissiveIntensity = glow;
            game.playerParts.rightEye.material.emissiveIntensity = glow;
        }

        // Invencibilidad visual
        if (game.invincibleTimer > 0) {
            game.invincibleTimer--;
            game.player.visible = Math.floor(game.invincibleTimer / 4) % 2 === 0;
        } else {
            game.player.visible = true;
        }

        // Mover obstáculos
        for (let i = game.obstacles.length - 1; i >= 0; i--) {
            const obs = game.obstacles[i];
            obs.position.z += game.speed;

            if (obs.position.z > 15) {
                game.scene.remove(obs);
                game.obstacles.splice(i, 1);
            }
        }

        // Mover monedas
        for (let i = game.coins.length - 1; i >= 0; i--) {
            const coin = game.coins[i];
            coin.position.z += game.speed;
            coin.rotation.y += 0.06;

            // Efecto imán
            if (game.activeSkills.magnet) {
                const dx = game.player.position.x - coin.position.x;
                const dz = game.player.position.z - coin.position.z;
                const dist = Math.sqrt(dx * dx + dz * dz);
                if (dist < 8) {
                    coin.position.x += dx * 0.1;
                    coin.position.z += dz * 0.1;
                    coin.position.y += (game.player.position.y + 1 - coin.position.y) * 0.1;
                }
            }

            if (coin.position.z > 15) {
                game.scene.remove(coin);
                game.coins.splice(i, 1);
            }
        }

        // Actualizar partículas
        updateParticles();

        // Colisiones
        checkCollisions();

        // Cámara
        game.camera.position.x = game.player.position.x * 0.5;
        game.camera.position.y = CONFIG.cameraOffsetY + game.playerY * 0.3;
        game.camera.position.z = game.player.position.z + CONFIG.cameraOffsetZ;
        game.camera.lookAt(
            game.player.position.x,
            2 + game.playerY,
            game.player.position.z - 5
        );

        // Render
        game.renderer.render(game.scene, game.camera);
    }

    // ============================================================
    // COLISIONES
    // ============================================================
    function checkCollisions() {
        const playerBox = new THREE.Box3();
        playerBox.setFromObject(game.player);
        playerBox.expandByScalar(-0.25);

        // Obstáculos
        for (let i = game.obstacles.length - 1; i >= 0; i--) {
            const obs = game.obstacles[i];
            if (obs.userData.passed) continue;

            const obsBox = new THREE.Box3().setFromObject(obs);

            if (playerBox.intersectsBox(obsBox)) {
                if (game.activeSkills.shield) {
                    // Escudo protege
                    obs.userData.passed = true;
                    game.scene.remove(obs);
                    game.obstacles.splice(i, 1);
                    createParticles(obs.position.clone(), 0x00ff00, 15);
                    if (GameState.settings.sfx) playSound('shield');
                } else if (game.invincibleTimer <= 0) {
                    // Golpe
                    game.lives--;
                    updateHUD();
                    obs.userData.passed = true;
                    game.invincibleTimer = 60;

                    createParticles(game.player.position.clone(), 0xff0000, 20);

                    if (GameState.settings.sfx) playSound('hit');

                    if (game.lives <= 0) {
                        gameOver();
                        return;
                    }
                }
            }
        }

        // Monedas
        for (let i = game.coins.length - 1; i >= 0; i--) {
            const coin = game.coins[i];
            const coinBox = new THREE.Box3().setFromObject(coin);

            if (playerBox.intersectsBox(coinBox)) {
                const multiplier = game.activeSkills.double ? 2 : 1;
                game.currentCoins += CONFIG.coinValue * multiplier;
                updateHUD();

                createParticles(coin.position.clone(), 0xffd700, 8);

                game.scene.remove(coin);
                game.coins.splice(i, 1);

                if (GameState.settings.sfx) playSound('coin');
            }
        }
    }

    // ============================================================
    // PARTÍCULAS
    // ============================================================
    function createParticles(position, color, count) {
        for (let i = 0; i < count; i++) {
            const geo = new THREE.SphereGeometry(0.08, 6, 6);
            const mat = new THREE.MeshBasicMaterial({
                color: color,
                transparent: true,
                opacity: 1
            });
            const particle = new THREE.Mesh(geo, mat);
            particle.position.copy(position);
            particle.userData.velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 0.3,
                Math.random() * 0.25,
                (Math.random() - 0.5) * 0.3
            );
            particle.userData.life = 1;
            game.particles.push(particle);
            game.scene.add(particle);
        }
    }

    function updateParticles() {
        for (let i = game.particles.length - 1; i >= 0; i--) {
            const p = game.particles[i];
            p.position.add(p.userData.velocity);
            p.userData.velocity.y -= 0.008;
            p.userData.life -= 0.025;
            p.material.opacity = p.userData.life;

            if (p.userData.life <= 0) {
                game.scene.remove(p);
                game.particles.splice(i, 1);
            }
        }
    }

    // ============================================================
    // HUD
    // ============================================================
    function createHUD() {
        const hud = document.createElement('div');
        hud.id = 'gameHUD';
        hud.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            padding: 15px;
            display: none;
            justify-content: space-between;
            align-items: flex-start;
            z-index: 200;
            pointer-events: none;
        `;

        hud.innerHTML = `
            <div id="hudHearts" style="font-size: 26px; text-shadow: 0 0 10px rgba(255,0,0,0.5);">❤️❤️❤️</div>
            <div id="hudDistance" style="font-size: 14px; background: rgba(0,0,0,0.7); padding: 6px 12px; border-radius: 8px;">0m</div>
            <div id="hudCoins" style="font-size: 20px; font-weight: bold; background: rgba(0,0,0,0.7); padding: 6px 14px; border-radius: 10px; color: #ffd700;">0 🪙</div>
        `;

        document.body.appendChild(hud);
        game.hudElements.container = hud;
    }

    function showHUD() {
        game.hudElements.container.style.display = 'flex';
        updateHUD();
    }

    function hideHUD() {
        game.hudElements.container.style.display = 'none';
    }

    function updateHUD() {
        const heartsEl = document.getElementById('hudHearts');
        const coinsEl = document.getElementById('hudCoins');
        const distEl = document.getElementById('hudDistance');

        if (heartsEl) {
            let hearts = '';
            for (let i = 0; i < 3; i++) {
                hearts += i < game.lives ? '❤️' : '💔';
            }
            heartsEl.textContent = hearts;
        }

        if (coinsEl) {
            coinsEl.textContent = game.currentCoins + ' 🪙';
        }

        if (distEl) {
            distEl.textContent = Math.floor(game.distance) + 'm';
        }
    }

    // ============================================================
    // PANEL DE HABILIDADES (LATERAL)
    // ============================================================
    function createSkillsPanel() {
        // Botón desplegable
        const toggleBtn = document.createElement('div');
        toggleBtn.id = 'skillsToggleBtn';
        toggleBtn.style.cssText = `
            position: fixed;
            right: 8px;
            top: 50%;
            transform: translateY(-50%);
            width: 42px;
            height: 42px;
            background: rgba(255, 107, 0, 0.3);
            border: 2px solid #ff6b00;
            border-radius: 50%;
            display: none;
            align-items: center;
            justify-content: center;
            font-size: 18px;
            cursor: pointer;
            z-index: 201;
            transition: all 0.3s;
            box-shadow: 0 0 15px rgba(255, 107, 0, 0.4);
        `;
        toggleBtn.textContent = '⚡';
        document.body.appendChild(toggleBtn);

        // Panel
        const panel = document.createElement('div');
        panel.id = 'skillsPanel';
        panel.style.cssText = `
            position: fixed;
            right: 55px;
            top: 50%;
            transform: translateY(-50%);
            background: rgba(26, 21, 48, 0.95);
            border: 2px solid #ff6b00;
            border-radius: 15px;
            padding: 12px;
            display: none;
            flex-direction: column;
            gap: 8px;
            z-index: 201;
            box-shadow: 0 0 25px rgba(255, 107, 0, 0.3);
        `;

        const skills = [
            { key: 'jetpack', icon: '🚀', name: 'Jetpack' },
            { key: 'jump', icon: '🦘', name: 'Super Salto' },
            { key: 'shield', icon: '🛡️', name: 'Escudo' },
            { key: 'magnet', icon: '🧲', name: 'Imán' },
            { key: 'double', icon: '✨', name: 'x2 Monedas' }
        ];

        skills.forEach(skill => {
            const btn = document.createElement('div');
            btn.dataset.skillBtn = skill.key;
            btn.style.cssText = `
                width: 44px;
                height: 44px;
                border-radius: 10px;
                background: rgba(255, 255, 255, 0.08);
                border: 2px solid #2a2540;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 20px;
                cursor: pointer;
                position: relative;
                transition: all 0.3s;
            `;
            btn.textContent = skill.icon;
            btn.title = skill.name;

            const count = document.createElement('span');
            count.style.cssText = `
                position: absolute;
                top: -5px;
                right: -5px;
                background: #ff6b00;
                color: #fff;
                font-size: 9px;
                font-weight: bold;
                padding: 1px 4px;
                border-radius: 8px;
                min-width: 16px;
                text-align: center;
            `;
            count.textContent = GameState.skills[skill.key] || 0;
            btn.appendChild(count);

            btn.addEventListener('click', () => activateSkill(skill.key));
            panel.appendChild(btn);
        });

        document.body.appendChild(panel);
        game.skillsPanel = panel;

        // Toggle
        toggleBtn.addEventListener('click', () => {
            const isVisible = panel.style.display === 'flex';
            panel.style.display = isVisible ? 'none' : 'flex';
            toggleBtn.textContent = isVisible ? '⚡' : '✖';
            updateSkillsPanelCounts();
        });

        game.skillsToggleBtn = toggleBtn;
    }

    function updateSkillsPanelCounts() {
        Object.keys(GameState.skills).forEach(skill => {
            const btn = document.querySelector(`[data-skill-btn="${skill}"] span`);
            if (btn) btn.textContent = GameState.skills[skill];
        });
    }

    function activateSkill(skillKey) {
        if (GameState.skills[skillKey] <= 0) {
            showToast('No tienes esa habilidad. ¡Ve un video!');
            return;
        }

        if (game.activeSkills[skillKey]) {
            showToast('Esa habilidad ya está activa');
            return;
        }

        GameState.skills[skillKey]--;
        saveGameState();
        updateSkillsUI();
        updateSkillsPanelCounts();

        game.activeSkills[skillKey] = true;

        // Timer de habilidad
        clearTimeout(game.skillTimers[skillKey]);
        game.skillTimers[skillKey] = setTimeout(() => {
            game.activeSkills[skillKey] = false;
            showToast(`Habilidad ${skillKey} terminada`);
        }, CONFIG.skillDuration);

        // Efectos visuales por habilidad
        if (GameState.settings.sfx) playSound(skillKey);

        if (skillKey === 'jetpack') {
            createParticles(game.player.position.clone(), 0xff6b00, 20);
        } else if (skillKey === 'shield') {
            // Añadir visual de escudo
            const shieldGeo = new THREE.SphereGeometry(1.2, 16, 16);
            const shieldMat = new THREE.MeshBasicMaterial({
                color: 0x00ff00,
                transparent: true,
                opacity: 0.3,
                side: THREE.DoubleSide
            });
            const shield = new THREE.Mesh(shieldGeo, shieldMat);
            shield.name = 'shieldVisual';
            game.player.add(shield);
        }

        showToast(`¡${skillKey} activada! (15s)`);
    }

    // ============================================================
    // GAME OVER
    // ============================================================
    function createGameOverScreen() {
        const overlay = document.createElement('div');
        overlay.id = 'gameOverOverlay';
        overlay.style.cssText = `
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.92);
            display: none;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            z-index: 300;
            backdrop-filter: blur(5px);
        `;

        overlay.innerHTML = `
            <div style="
                background: #1a1530;
                border: 2px solid #ff0000;
                border-radius: 20px;
                padding: 30px;
                text-align: center;
                max-width: 320px;
                width: 90%;
                box-shadow: 0 0 50px rgba(255, 0, 0, 0.4);
            ">
                <h2 style="font-size: 36px; color: #ff0000; margin-bottom: 10px; text-shadow: 0 0 20px #ff0000;">💀 GAME OVER</h2>
                <p style="font-size: 22px; margin-bottom: 8px;">Monedas: <span id="goCoins" style="color: #ffd700; font-weight: bold;">0</span> 🪙</p>
                <p style="font-size: 16px; color: #8a8a8a; margin-bottom: 20px;">Distancia: <span id="goDistance">0</span>m</p>

                <button id="goReviveBtn" style="
                    width: 100%;
                    padding: 14px;
                    background: linear-gradient(135deg, #00ff00, #00aa00);
                    border: none;
                    border-radius: 12px;
                    color: #0f0a1c;
                    font-weight: bold;
                    font-size: 15px;
                    cursor: pointer;
                    margin-bottom: 10px;
                    box-shadow: 0 4px 15px rgba(0, 255, 0, 0.4);
                ">🎬 REVIVIR (Ver Video)</button>

                <button id="goDoubleBtn" style="
                    width: 100%;
                    padding: 14px;
                    background: linear-gradient(135deg, #ffd700, #ffaa00);
                    border: none;
                    border-radius: 12px;
                    color: #0f0a1c;
                    font-weight: bold;
                    font-size: 15px;
                    cursor: pointer;
                    margin-bottom: 10px;
                    box-shadow: 0 4px 15px rgba(255, 215, 0, 0.4);
                ">✨ MULTIPLICAR x2 (Ver Video)</button>

                <button id="goExitBtn" style="
                    width: 100%;
                    padding: 14px;
                    background: linear-gradient(135deg, #666, #444);
                    border: none;
                    border-radius: 12px;
                    color: #fff;
                    font-weight: bold;
                    font-size: 15px;
                    cursor: pointer;
                ">🚪 SALIR</button>
            </div>
        `;

        document.body.appendChild(overlay);
        game.gameOverElements.overlay = overlay;

        // Eventos
        document.getElementById('goReviveBtn').addEventListener('click', revive);
        document.getElementById('goDoubleBtn').addEventListener('click', multiplyCoins);
        document.getElementById('goExitBtn').addEventListener('click', exitGame);
    }

    function gameOver() {
        game.isPlaying = false;
        cancelAnimationFrame(game.animationId);
        clearInterval(game.spawnInterval);
        clearInterval(game.policeInterval);

        game.policeLights.red.intensity = 0;
        game.policeLights.blue.intensity = 0;

        hideHUD();
        game.skillsToggleBtn.style.display = 'none';
        game.skillsPanel.style.display = 'none';

        document.getElementById('goCoins').textContent = game.currentCoins;
        document.getElementById('goDistance').textContent = Math.floor(game.distance);
        game.gameOverElements.overlay.style.display = 'flex';

        if (GameState.settings.sfx) playSound('gameover');
    }

    function revive() {
        showAd(() => {
            game.gameOverElements.overlay.style.display = 'none';
            game.lives = 3;
            game.invincibleTimer = 90;

            // Limpiar obstáculos cercanos
            game.obstacles.forEach(obs => {
                if (obs.position.z > -20) {
                    game.scene.remove(obs);
                }
            });
            game.obstacles = game.obstacles.filter(obs => obs.position.z <= -20);

            showHUD();
            game.skillsToggleBtn.style.display = 'flex';
            game.isPlaying = true;
            activatePoliceLights();
            startSpawning();
            game.clock.getDelta();
            gameLoop();

            showToast('¡Revivido! Tienes 3 corazones');
        });
    }

    function multiplyCoins() {
        showAd(() => {
            game.currentCoins *= 2;
            exitGame();
            showToast(`¡Monedas multiplicadas! +${game.currentCoins} 🪙`);
        });
    }

    function exitGame() {
        game.isPlaying = false;
        cancelAnimationFrame(game.animationId);
        clearInterval(game.spawnInterval);
        clearInterval(game.policeInterval);

        game.policeLights.red.intensity = 0;
        game.policeLights.blue.intensity = 0;

        // Limpiar objetos del juego
        game.obstacles.forEach(obs => game.scene.remove(obs));
        game.coins.forEach(coin => game.scene.remove(coin));
        game.particles.forEach(p => game.scene.remove(p));
        game.obstacles = [];
        game.coins = [];
        game.particles = [];

        // Reset jugador
        game.player.position.set(0, 0, CONFIG.playerZ);
        game.player.rotation.y = 0;
        game.player.scale.set(1, 1, 1);
        game.player.visible = true;
        game.playerY = 0;
        game.isJumping = false;
        game.isSliding = false;
        game.currentLane = 1;
        game.targetLane = 1;

        // Remover shield visual si existe
        const shield = game.player.getObjectByName('shieldVisual');
        if (shield) game.player.remove(shield);

        // Ocultar game over y HUD
        game.gameOverElements.overlay.style.display = 'none';
        hideHUD();
        game.skillsToggleBtn.style.display = 'none';
        game.skillsPanel.style.display = 'none';

        // Sumar monedas al balance global
        if (game.currentCoins > 0) {
            GameState.balance += game.currentCoins;
            saveGameState();

            // Actualizar balance en header
            const balEl = document.getElementById('balanceAmount');
            if (balEl) {
                balEl.textContent = formatNumber(GameState.balance);
            }

            showToast(`+${formatNumber(game.currentCoins)} monedas añadidas a tu balance`);
        }

        // Mostrar overlay del menú
        const overlay = document.querySelector('.game-overlay');
        if (overlay) {
            overlay.style.display = 'flex';
        }

        // Recrear pared de grafiti y volver a pre-juego
        game.isPreGame = true;
        game.currentCoins = 0;
        game.distance = 0;
        game.speed = CONFIG.startSpeed;
        createGraffitiWall();

        // Reiniciar animación pre-juego
        animatePreGame();
    }

    // ============================================================
    // SONIDOS (Web Audio API - Generados proceduralmente)
    // ============================================================
    let audioCtx = null;

    function getAudioContext() {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        return audioCtx;
    }

    function playSound(type) {
        if (!GameState.settings.sfx) return;

        try {
            const ctx = getAudioContext();
            const now = ctx.currentTime;

            switch (type) {
                case 'coin': {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(1200, now);
                    osc.frequency.exponentialRampToValueAtTime(2400, now + 0.08);
                    gain.gain.setValueAtTime(0.15, now);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start(now);
                    osc.stop(now + 0.2);
                    break;
                }
                case 'jump': {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(300, now);
                    osc.frequency.exponentialRampToValueAtTime(900, now + 0.15);
                    gain.gain.setValueAtTime(0.12, now);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start(now);
                    osc.stop(now + 0.2);
                    break;
                }
                case 'hit': {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = 'sawtooth';
                    osc.frequency.setValueAtTime(200, now);
                    osc.frequency.exponentialRampToValueAtTime(50, now + 0.3);
                    gain.gain.setValueAtTime(0.2, now);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start(now);
                    osc.stop(now + 0.3);
                    break;
                }
                case 'gameover': {
                    const notes = [400, 350, 300, 200];
                    notes.forEach((freq, i) => {
                        const osc = ctx.createOscillator();
                        const gain = ctx.createGain();
                        osc.type = 'square';
                        osc.frequency.value = freq;
                        gain.gain.setValueAtTime(0.1, now + i * 0.2);
                        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.2 + 0.3);
                        osc.connect(gain);
                        gain.connect(ctx.destination);
                        osc.start(now + i * 0.2);
                        osc.stop(now + i * 0.2 + 0.3);
                    });
                    break;
                }
                case 'start': {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(400, now);
                    osc.frequency.exponentialRampToValueAtTime(800, now + 0.3);
                    gain.gain.setValueAtTime(0.15, now);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start(now);
                    osc.stop(now + 0.4);
                    break;
                }
                case 'jetpack': {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = 'sawtooth';
                    osc.frequency.setValueAtTime(150, now);
                    osc.frequency.exponentialRampToValueAtTime(600, now + 0.5);
                    gain.gain.setValueAtTime(0.1, now);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start(now);
                    osc.stop(now + 0.6);
                    break;
                }
                case 'shield': {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = 'triangle';
                    osc.frequency.setValueAtTime(500, now);
                    osc.frequency.exponentialRampToValueAtTime(1000, now + 0.2);
                    gain.gain.setValueAtTime(0.12, now);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start(now);
                    osc.stop(now + 0.3);
                    break;
                }
                case 'magnet': {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(200, now);
                    osc.frequency.linearRampToValueAtTime(600, now + 0.3);
                    osc.frequency.linearRampToValueAtTime(200, now + 0.6);
                    gain.gain.setValueAtTime(0.1, now);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start(now);
                    osc.stop(now + 0.6);
                    break;
                }
                case 'double': {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(800, now);
                    osc.frequency.exponentialRampToValueAtTime(1600, now + 0.15);
                    gain.gain.setValueAtTime(0.12, now);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start(now);
                    osc.stop(now + 0.25);
                    break;
                }
                case 'slide': {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(600, now);
                    osc.frequency.exponentialRampToValueAtTime(200, now + 0.2);
                    gain.gain.setValueAtTime(0.1, now);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start(now);
                    osc.stop(now + 0.25);
                    break;
                }
            }
        } catch (e) {
            console.warn('Audio error:', e);
        }
    }

    // ============================================================
    // INTEGRACIÓN CON ADSGRAM
    // ============================================================
    function showAd(callback) {
        // Usar la función del index.html si existe
        if (typeof showRewardedAd === 'function') {
            showRewardedAd(callback);
            return;
        }

        // Fallback: intentar Adsgram SDK directamente
        if (window.Adsgram) {
            try {
                const adController = window.Adsgram.init({
                    blockId: CONFIG.adsgramUnitId
                });

                adController.show().then(() => {
                    if (callback) callback();
                }).catch((error) => {
                    console.warn('Adsgram error:', error);
                    // Fallback: simular anuncio
                    simulateAd(callback);
                });
            } catch (e) {
                simulateAd(callback);
            }
        } else {
            simulateAd(callback);
        }
    }

    function simulateAd(callback) {
        const overlay = document.getElementById('adOverlay');
        const progressFill = document.getElementById('adProgressFill');
        const timer = document.getElementById('adTimer');
        const closeBtn = document.getElementById('adCloseBtn');

        if (!overlay) {
            if (callback) callback();
            return;
        }

        overlay.classList.add('active');
        progressFill.style.width = '0%';
        closeBtn.style.display = 'none';

        let seconds = 30;
        timer.textContent = seconds + 's';

        setTimeout(() => {
            progressFill.style.width = '100%';
        }, 100);

        const interval = setInterval(() => {
            seconds--;
            timer.textContent = seconds + 's';

            if (seconds <= 0) {
                clearInterval(interval);
                timer.textContent = '¡Completado!';
                closeBtn.style.display = 'inline-block';
            }
        }, 1000);

        closeBtn.onclick = () => {
            overlay.classList.remove('active');
            closeBtn.onclick = null;
            if (callback) callback();
        };
    }

    // ============================================================
    // UTILIDADES
    // ============================================================
    function formatNumber(num) {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
    }

    function showToast(message) {
        const existing = document.querySelector('.toast');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3500);
    }

    function onWindowResize() {
        game.camera.aspect = window.innerWidth / window.innerHeight;
        game.camera.updateProjectionMatrix();
        game.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    // ============================================================
    // INICIALIZACIÓN AL CARGAR
    // ============================================================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initGame);
    } else {
        initGame();
    }

    console.log('📦 game.js cargado. Motor 3D listo para Runner Money.');

})();
