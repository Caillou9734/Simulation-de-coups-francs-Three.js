var scene;
var camera;
var rendu;
var stats;
var gui;

var terrainGroup;
var goalGroup;
var wallGroup;
var keeperGroup;
var ballGroup;
var ballMesh;
var keeperCatchPoint = new THREE.Vector3();

var shotActive = false;
var shotTime = 0;
var shotDuration = 2600;
var nextShotTime = 0;
var shotIndex = 0;
var shotCurve1 = null;
var shotCurve2 = null;
var shotGlobalT = 0;
var shotData = [];
var scoreTotal = 0;

var scoreListItems = [];
var scoreTableRows = [];
var scoreTotalCell = null;

var defaultStart = new THREE.Vector3(0, -22, 0.11);
var currentBallPos = defaultStart.clone();

var cameraParams = {
    x: 0,
    y: -35,
    z: 12,
    lookX: 0,
    lookY: 0,
    lookZ: 1.22
};

var murParams = {
    color: "#b9b9b9",
    emissive: "#000000",
    specular: "#222222",
    shininess: 25,
    opacity: 1.0,
    transparent: false,
    wireframe: false,
    flatShading: false,
    joinCoeff: 0.58
};

var ballParams = {
    color: "#ffffff"
};

var shotParams = {
    mode: "Automatique"
};

var curveParams = {
    quadOffsetX: -4.2,
    quadOffsetZ: 5.4,
    cubicOffsetX: 1.8,
    cubicOffsetZ: 1.4,
    junctionHeight: 2.5
};

var shotTargets = [];

function createColor(hex) {
    return new THREE.Color(hex);
}

function setCameraFromParams() {
    camera.position.set(cameraParams.x, cameraParams.y, cameraParams.z);
    camera.up.set(0, 0, 1);
    camera.lookAt(cameraParams.lookX, cameraParams.lookY, cameraParams.lookZ);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    rendu.setSize(window.innerWidth * 0.98, window.innerHeight * 0.98);
}

function renduAnim() {
    if (stats) stats.update();
    updateBallAnimation(); // Cadencé à 60 FPS synchrones
    rendu.render(scene, camera);
    requestAnimationFrame(renduAnim);
}

function addBoxLine(parent, width, height, x, y, z) {
    var geometry = new THREE.BoxGeometry(width, height, 0.02);
    var material = new THREE.MeshPhongMaterial({ color: 0xffffff });
    var line = new THREE.Mesh(geometry, material);
    line.position.set(x, y, z);
    line.receiveShadow = true;
    parent.add(line);
    return line;
}

function creerArcParabole(scene) {
    var points = [];
    var nbPts = 60;
    var demiLargeur = 7.32;

    for (let i = 0; i <= nbPts; i++) {
        let x = -demiLargeur + (2 * demiLargeur * i) / nbPts;
        let y = -16.5 - 3.65 * (1 - (x * x) / (demiLargeur * demiLargeur));
        points.push(new THREE.Vector3(x, y, 0.01));
    }

    var geometry = new THREE.Geometry();
    geometry.vertices = points;

    var material = new THREE.LineBasicMaterial({ color: 0xffffff });
    var arc = new THREE.Line(geometry, material);
    scene.add(arc);
}

function createTerrain() {
    terrainGroup = new THREE.Group();

    var surface = new THREE.Mesh(
        new THREE.PlaneGeometry(105, 68),
        new THREE.MeshPhongMaterial({ color: 0x2f7d32 })
    );
    surface.receiveShadow = true;
    terrainGroup.add(surface);

    addBoxLine(terrainGroup, 105, 0.12, 0, 0, 0.01);
    addBoxLine(terrainGroup, 0.12, 68, -52.5, 0, 0.01);
    addBoxLine(terrainGroup, 0.12, 68, 52.5, 0, 0.01);

    addBoxLine(terrainGroup, 40.32, 0.12, 0, -16.5, 0.01);
    addBoxLine(terrainGroup, 0.12, 16.5, -20.16, -8.25, 0.01);
    addBoxLine(terrainGroup, 0.12, 16.5, 20.16, -8.25, 0.01);

    addBoxLine(terrainGroup, 18.32, 0.12, 0, -5.5, 0.01);
    addBoxLine(terrainGroup, 0.12, 5.5, -9.16, -2.75, 0.01);
    addBoxLine(terrainGroup, 0.12, 5.5, 9.16, -2.75, 0.01);

    var penaltySpot = new THREE.Mesh(
        new THREE.CylinderGeometry(0.15, 0.15, 0.02, 24),
        new THREE.MeshPhongMaterial({ color: 0xffffff })
    );
    penaltySpot.rotation.x = Math.PI / 2;
    penaltySpot.position.set(0, -11, 0.02);
    terrainGroup.add(penaltySpot);

    creerArcParabole(terrainGroup);

    scene.add(terrainGroup);
}

function createCylinderBetween(start, end, radiusTop, radiusBottom, material) {
    var direction = new THREE.Vector3().subVectors(end, start);
    var length = direction.length();
    var geometry = new THREE.CylinderGeometry(radiusTop, radiusBottom, length, 20, 1, false);
    var mesh = new THREE.Mesh(geometry, material);
    var midpoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
    mesh.position.copy(midpoint);
    mesh.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        direction.clone().normalize()
    );
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
}

/**
 * Construit un coude torique assurant une jointure G1 parfaite (quart de tore)
 * entre un montant vertical et la barre horizontale.
 */
function createGoalCornerG1(xSide, zBarre, rTube, rCoude, material) {
    // TorusGeometry(radiusMajeur, tubeRadius, radialSegments, tubularSegments, arc)
    var torusGeom = new THREE.TorusGeometry(rCoude, rTube, 20, 24, Math.PI / 2);
    var corner = new THREE.Mesh(torusGeom, material);
    corner.castShadow = true;
    corner.receiveShadow = true;

    // Positionnement et orientation au sommet de l'équerre
    if (xSide < 0) {
        // Coin supérieur gauche (x = -3.66)
        corner.position.set(-3.66 + rCoude, 0.0, zBarre - rCoude);
        corner.quaternion.setFromRotationMatrix(
            new THREE.Matrix4().makeBasis(
                new THREE.Vector3(-1, 0, 0),
                new THREE.Vector3(0, 0, 1),
                new THREE.Vector3(0, 1, 0)
            )
        );
    } else {
        // Coin supérieur droit (x = +3.66)
        corner.position.set(3.66 - rCoude, 0.0, zBarre - rCoude);
        corner.quaternion.setFromRotationMatrix(
            new THREE.Matrix4().makeBasis(
                new THREE.Vector3(1, 0, 0),
                new THREE.Vector3(0, 0, 1),
                new THREE.Vector3(0, -1, 0)
            )
        );
    }
    return corner;
}

function createGoal() {
    goalGroup = new THREE.Group();

    var postMaterial = new THREE.MeshPhongMaterial({
        color: 0xf5f5f5,
        specular: 0x444444,
        shininess: 40
    });
    var netMaterial = new THREE.LineBasicMaterial({
        color: 0xdddddd,
        linewidth: 1
    });

    var rTube = 0.06;      // Rayon tubulaire de 6 cm (diamètre réglementaire 12 cm)
    var rCoude = 0.18;     // Rayon de courbure de la jointure G1
    var zBarre = 2.44;     // Hauteur sous barre
    var rearY = 1.50;      // Profondeur conforme au sujet et au rapport

    // 1. Montants verticaux (s'arrêtent à zBarre - rCoude pour laisser place au tore G1)
    var postLeft = createCylinderBetween(
        new THREE.Vector3(-3.66, 0, 0),
        new THREE.Vector3(-3.66, 0, zBarre - rCoude),
        rTube, rTube, postMaterial
    );
    var postRight = createCylinderBetween(
        new THREE.Vector3(3.66, 0, 0),
        new THREE.Vector3(3.66, 0, zBarre - rCoude),
        rTube, rTube, postMaterial
    );
    goalGroup.add(postLeft);
    goalGroup.add(postRight);

    // 2. Barre transversale horizontale (entre les deux coudes)
    var crossBar = createCylinderBetween(
        new THREE.Vector3(-3.66 + rCoude, 0, zBarre),
        new THREE.Vector3(3.66 - rCoude, 0, zBarre),
        rTube, rTube, postMaterial
    );
    goalGroup.add(crossBar);

    // 3. Quarts de tore assurant le raccordement G1 aux deux angles supérieurs
    goalGroup.add(createGoalCornerG1(-1, zBarre, rTube, rCoude, postMaterial));
    goalGroup.add(createGoalCornerG1(1, zBarre, rTube, rCoude, postMaterial));

    // 4. Armature arrière de soutien (tubes plus fins de 3.5 cm)
    var backLeftBase = new THREE.Vector3(-3.66, rearY, 0);
    var backRightBase = new THREE.Vector3(3.66, rearY, 0);
    var backLeftTop = new THREE.Vector3(-3.66, rearY, zBarre);
    var backRightTop = new THREE.Vector3(3.66, rearY, zBarre);

    goalGroup.add(createCylinderBetween(new THREE.Vector3(-3.66, 0, zBarre), backLeftTop, 0.035, 0.035, postMaterial));
    goalGroup.add(createCylinderBetween(new THREE.Vector3(3.66, 0, zBarre), backRightTop, 0.035, 0.035, postMaterial));
    goalGroup.add(createCylinderBetween(backLeftBase, backRightBase, 0.035, 0.035, postMaterial));
    goalGroup.add(createCylinderBetween(backLeftBase, backLeftTop, 0.035, 0.035, postMaterial));
    goalGroup.add(createCylinderBetween(backRightBase, backRightTop, 0.035, 0.035, postMaterial));
    goalGroup.add(createCylinderBetween(backLeftTop, backRightTop, 0.035, 0.035, postMaterial));

    // 5. Les 4 ouvertures de 50 cm x 50 cm
    var holeRects = [
        { name: "Lucarne gauche", x0: -3.66, x1: -3.16, z0: 1.94, z1: 2.44 },
        { name: "Lucarne droite", x0: 3.16,  x1: 3.66,  z0: 1.94, z1: 2.44 },
        { name: "Au sol gauche",  x0: -3.66, x1: -3.16, z0: 0.00, z1: 0.50 },
        { name: "Au sol droite",  x0: 3.16,  x1: 3.66,  z0: 0.00, z1: 0.50 }
    ];

    // Filet arrière avec les 4 ouvertures cibles découpées
    buildBackNetGrid(goalGroup, -3.66, 3.66, 0.0, 2.44, rearY, holeRects, netMaterial);

    // Filets latéraux gauche et droit (plans fermés)
    buildSideNetGrid(goalGroup, -3.66, 0.0, rearY, 2.44, netMaterial);
    buildSideNetGrid(goalGroup, 3.66, 0.0, rearY, 2.44, netMaterial);

    scene.add(goalGroup);
}

function addNetSegment(group, a, b, material) {
    var geometry = new THREE.BufferGeometry().setFromPoints([a, b]);
    var line = new THREE.Line(geometry, material);
    group.add(line);
}

function addNetSegmentsOutsideIntervals(group, start, end, fixedCoordinate, intervals, material, isVertical) {
    var cursor = start;

    for (var i = 0; i < intervals.length; i++) {
        var intervalStart = Math.max(start, intervals[i][0]);
        var intervalEnd = Math.min(end, intervals[i][1]);

        if (intervalStart > cursor) {
            if (isVertical) {
                addNetSegment(
                    group,
                    new THREE.Vector3(fixedCoordinate, material.yPos, cursor),
                    new THREE.Vector3(fixedCoordinate, material.yPos, intervalStart),
                    material.lineMaterial
                );
            } else {
                addNetSegment(
                    group,
                    new THREE.Vector3(cursor, material.yPos, fixedCoordinate),
                    new THREE.Vector3(intervalStart, material.yPos, fixedCoordinate),
                    material.lineMaterial
                );
            }
        }

        cursor = Math.max(cursor, intervalEnd);
    }

    if (cursor < end) {
        if (isVertical) {
            addNetSegment(
                group,
                new THREE.Vector3(fixedCoordinate, material.yPos, cursor),
                new THREE.Vector3(fixedCoordinate, material.yPos, end),
                material.lineMaterial
            );
        } else {
            addNetSegment(
                group,
                new THREE.Vector3(cursor, material.yPos, fixedCoordinate),
                new THREE.Vector3(end, material.yPos, fixedCoordinate),
                material.lineMaterial
            );
        }
    }
}

function getHoleIntervals(holes, fixedCoordinate, firstAxis) {
    var intervals = [];

    for (var i = 0; i < holes.length; i++) {
        var hole = holes[i];
        var fixedMin = firstAxis ? hole.x0 : hole.z0;
        var fixedMax = firstAxis ? hole.x1 : hole.z1;

        if (fixedCoordinate > fixedMin && fixedCoordinate < fixedMax) {
            intervals.push(firstAxis ? [hole.z0, hole.z1] : [hole.x0, hole.x1]);
        }
    }

    intervals.sort(function (a, b) {
        return a[0] - b[0];
    });
    return intervals;
}

/**
 * Tisse le filet arrière à y = rearY en évidant les fenêtres de 50x50 cm.
 */
function buildBackNetGrid(group, xMin, xMax, zMin, zMax, yPos, holes, material) {
    var step = 0.10; // Maille régulière de 10 cm
    var xCount = Math.ceil((xMax - xMin) / step);
    var zCount = Math.ceil((zMax - zMin) / step);
    var netContext = {
        yPos: yPos,
        lineMaterial: material
    };

    // A. Génération des fils verticaux (x fixé, balayage de z)
    for (var i = 0; i <= xCount; i++) {
        var x = Number(Math.min(xMin + i * step, xMax).toFixed(3));
        var verticalIntervals = getHoleIntervals(holes, x, true);
        addNetSegmentsOutsideIntervals(
            group,
            zMin,
            zMax,
            x,
            verticalIntervals,
            netContext,
            true
        );
    }

    // B. Génération des fils horizontaux (z fixé, balayage de x)
    for (var j = 0; j <= zCount; j++) {
        var z = Number(Math.min(zMin + j * step, zMax).toFixed(3));
        var horizontalIntervals = getHoleIntervals(holes, z, false);
        addNetSegmentsOutsideIntervals(
            group,
            xMin,
            xMax,
            z,
            horizontalIntervals,
            netContext,
            false
        );
    }

    // Cadres des ouvertures : les bords ne sont jamais supprimés.
    for (var h = 0; h < holes.length; h++) {
        var hole = holes[h];
        addNetSegment(
            group,
            new THREE.Vector3(hole.x0, yPos, hole.z0),
            new THREE.Vector3(hole.x1, yPos, hole.z0),
            material
        );
        addNetSegment(
            group,
            new THREE.Vector3(hole.x0, yPos, hole.z1),
            new THREE.Vector3(hole.x1, yPos, hole.z1),
            material
        );
        addNetSegment(
            group,
            new THREE.Vector3(hole.x0, yPos, hole.z0),
            new THREE.Vector3(hole.x0, yPos, hole.z1),
            material
        );
        addNetSegment(
            group,
            new THREE.Vector3(hole.x1, yPos, hole.z0),
            new THREE.Vector3(hole.x1, yPos, hole.z1),
            material
        );
    }
}

/**
 * Tisse le filet latéral (x fixe = ±3.66 m) de façon uniforme.
 */
function buildSideNetGrid(group, xFixed, yMin, yMax, zMax, material) {
    var step = 0.10;
    var yCount = Math.ceil((yMax - yMin) / step);
    var zCount = Math.ceil(zMax / step);

    for (var i = 0; i <= yCount; i++) {
        var y = Number(Math.min(yMin + i * step, yMax).toFixed(3));
        addNetSegment(group, new THREE.Vector3(xFixed, y, 0), new THREE.Vector3(xFixed, y, zMax), material);
    }

    for (var j = 0; j <= zCount; j++) {
        var z = Number(Math.min(j * step, zMax).toFixed(3));
        addNetSegment(group, new THREE.Vector3(xFixed, yMin, z), new THREE.Vector3(xFixed, yMax, z), material);
    }
}

/**
 * Évalue un point d'une courbe de Bézier cubique 2D (r, z) pour t dans [0, 1].
 */
function evalBezierCubique2D(p0, p1, p2, p3, t) {
    var mt = 1 - t;
    var mt2 = mt * mt;
    var t2 = t * t;
    var r = mt2 * mt * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t2 * t * p3.x;
    var z = mt2 * mt * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t2 * t * p3.y;
    return new THREE.Vector2(r, z);
}

/**
 * Construit un mannequin constitué de 4 surfaces de révolution coaxiales
 * raccordées en G1, avec fermeture rigoureuse en tête (r = 0) et au sol (z = 0).
 */
function createMannequin(height, materialOptions, joinCoeff) {
    var group = new THREE.Group();
    var bodyMaterial = new THREE.MeshPhongMaterial(materialOptions);
    var latheSegments = 32;

    // Repères verticaux fondamentaux
    var z0 = 0.0;
    var z1 = 0.10;
    var zJunction = height * 0.54; // Hauteur de jonction (taille) ~0.95m - 1.00m
    var zCou = height * 0.84;      // Base du cou
    var zSommet = height;          // Sommet de la tête

    var rBase = 0.12;
    var rJunction = 0.22;
    var rCou = 0.085;

    // =========================================================================
    // SURFACE 1 : Base / Socle cylindrique (z0 à z1)
    // Surface de révolution d'axe local Y (qui devient Z après rotation de pi/2)
    // =========================================================================
    var baseGeom = new THREE.CylinderGeometry(rBase, rBase, z1 - z0, latheSegments, 1, true);
    var meshBase = new THREE.Mesh(baseGeom, bodyMaterial);
    meshBase.rotation.x = Math.PI / 2;
    meshBase.position.z = (z0 + z1) / 2;
    meshBase.castShadow = true;
    meshBase.receiveShadow = true;
    group.add(meshBase);

    // =========================================================================
    // SURFACE 2 : Lathe 1 - Jambes et Bassin (Bézier cubique de z1 à zJunction)
    // Continuité G1 en z1 : poignée A1 verticale pour tangenter le cylindre de base
    // =========================================================================
    var A0 = new THREE.Vector2(rBase, z1);
    var A1 = new THREE.Vector2(rBase, z1 + 0.25 * (zJunction - z1));
    var A2 = new THREE.Vector2(rJunction + 0.04, zJunction - 0.20);
    var A3 = new THREE.Vector2(rJunction, zJunction);

    var pointsLathe1 = [];
    var steps = 16;
    for (var i = 0; i <= steps; i++) {
        var t = i / steps;
        pointsLathe1.push(evalBezierCubique2D(A0, A1, A2, A3, t));
    }

    var meshLathe1 = new THREE.Mesh(new THREE.LatheGeometry(pointsLathe1, latheSegments), bodyMaterial);
    meshLathe1.rotation.x = Math.PI / 2;
    meshLathe1.castShadow = true;
    meshLathe1.receiveShadow = true;
    group.add(meshLathe1);

    // =========================================================================
    // SURFACE 3 : Lathe 2 - Buste et Carrure (Bézier cubique de zJunction à zCou)
    // Raccordement G1 parfait : B1 = B0 + joinCoeff * (A3 - A2)
    // =========================================================================
    var B0 = A3.clone();
    var dirTangent = new THREE.Vector2().subVectors(A3, A2);
    var B1 = new THREE.Vector2().addVectors(B0, dirTangent.clone().multiplyScalar(joinCoeff));
    var B2 = new THREE.Vector2(rCou + 0.08, zCou - 0.12);
    var B3 = new THREE.Vector2(rCou, zCou); // Tangente verticale au cou

    var pointsLathe2 = [];
    for (var j = 0; j <= steps; j++) {
        var u = j / steps;
        pointsLathe2.push(evalBezierCubique2D(B0, B1, B2, B3, u));
    }

    var meshLathe2 = new THREE.Mesh(new THREE.LatheGeometry(pointsLathe2, latheSegments), bodyMaterial);
    meshLathe2.rotation.x = Math.PI / 2;
    meshLathe2.castShadow = true;
    meshLathe2.receiveShadow = true;
    group.add(meshLathe2);

    // =========================================================================
    // SURFACE 4 : Tête profilée (Lathe fermée de zCou à zSommet)
    // Raccordement G1 en zCou (tangente verticale) et fermeture en pointe nulle (r = 0)
    // =========================================================================
    var C0 = B3.clone();
    var C1 = new THREE.Vector2(rCou, zCou + 0.08); // Poignée verticale : continuité G1 avec le cou
    var C2 = new THREE.Vector2(0.06, zSommet);      // Poignée horizontale au sommet
    var C3 = new THREE.Vector2(0.00, zSommet);      // Pôle fermé : r = 0 strictement

    var pointsTete = [];
    for (var k = 0; k <= steps; k++) {
        var s = k / steps;
        pointsTete.push(evalBezierCubique2D(C0, C1, C2, C3, s));
    }

    var meshTete = new THREE.Mesh(new THREE.LatheGeometry(pointsTete, latheSegments), bodyMaterial);
    meshTete.rotation.x = Math.PI / 2;
    meshTete.castShadow = true;
    meshTete.receiveShadow = true;
    group.add(meshTete);

    return group;
}

function updateMurMaterial() {
    if (!wallGroup) return;

    for (var i = 0; i < wallGroup.children.length; i++) {
        var mannequin = wallGroup.children[i];
        for (var j = 0; j < mannequin.children.length; j++) {
            var mesh = mannequin.children[j];
            if (mesh.material) {
                mesh.material.color = createColor(murParams.color);
                mesh.material.emissive = createColor(murParams.emissive);
                mesh.material.specular = createColor(murParams.specular);
                mesh.material.shininess = murParams.shininess;
                mesh.material.opacity = murParams.opacity;
                mesh.material.transparent = murParams.transparent;
                mesh.material.wireframe = murParams.wireframe;
                mesh.material.flatShading = murParams.flatShading;
                mesh.material.needsUpdate = true;
            }
        }
    }
}

function createWall(startPoint) {
    wallGroup = new THREE.Group();

    var heights = [1.75, 1.80, 1.86, 1.78, 1.90];
    wallGroup.userData.wallTopZ = Math.max.apply(null, heights);
    // Joueurs espacés de 55 cm et centrés autour de 0
    var xPositions = [-1.24, -0.62, 0.0, 0.62, 1.24];
    var goalCenter = new THREE.Vector3(0, 0, 0);
    var wallStart = startPoint || currentBallPos;
    var ballToGoal = new THREE.Vector3().subVectors(goalCenter, wallStart);
    ballToGoal.z = 0;
    ballToGoal.normalize();
    var wallCenter = wallStart.clone().add(ballToGoal.multiplyScalar(9.15));
    wallGroup.position.copy(wallCenter);
    wallGroup.rotation.z = Math.atan2(-ballToGoal.x, -ballToGoal.y);
    wallGroup.userData.busteRadius = 0.22;

    var i;
    for (i = 0; i < 5; i++) {
        var mannequin = createMannequin(heights[i], {
            color: murParams.color,
            emissive: murParams.emissive,
            specular: murParams.specular,
            shininess: murParams.shininess,
            opacity: murParams.opacity,
            transparent: murParams.transparent,
            wireframe: murParams.wireframe,
            flatShading: murParams.flatShading
        }, murParams.joinCoeff);

        mannequin.position.set(xPositions[i], 0, 0);
        wallGroup.add(mannequin);
    }

    scene.add(wallGroup);
}

function createKeeper() {
    keeperGroup = new THREE.Group();

    // Analyse de la zone couverte par le mur pour décaler le gardien sur l'angle ouvert
    var wallX = wallGroup ? wallGroup.position.x : 0;
    // Si le mur couvre la droite (x > 0), le gardien protège la gauche (x < 0), et inversement
    var keeperSide = wallGroup && wallGroup.userData.openSide ?
        wallGroup.userData.openSide :
        ((wallX >= 0) ? -1 : 1);
    var keeperPosX = keeperSide * 1.85;

    // Le gardien est rigoureusement ancré sur la ligne de but : y = 0, z = 0
    keeperGroup.position.set(keeperPosX, 0.0, 0.0);

    var keeperMaterial = new THREE.MeshPhongMaterial({
        color: 0x1565c0, // Maillot distinctif
        specular: 0x333333,
        shininess: 30
    });
    var skinMaterial = new THREE.MeshPhongMaterial({
        color: 0xffccaa,
        shininess: 15
    });

    // 1. Deux cylindres pour les jambes (hauteur 0.90 m, rayon 0.08 m)
    var leftLeg = createCylinderBetween(
        new THREE.Vector3(-0.22, 0, 0.0),
        new THREE.Vector3(-0.15, 0, 0.90),
        0.08, 0.08, keeperMaterial
    );
    var rightLeg = createCylinderBetween(
        new THREE.Vector3(0.22, 0, 0.0),
        new THREE.Vector3(0.15, 0, 0.90),
        0.08, 0.08, keeperMaterial
    );
    keeperGroup.add(leftLeg);
    keeperGroup.add(rightLeg);

    // 2. Un cylindre pour le corps / buste (de z = 0.90 m à z = 1.55 m)
    var body = createCylinderBetween(
        new THREE.Vector3(0, 0, 0.90),
        new THREE.Vector3(0, 0, 1.55),
        0.16, 0.16, keeperMaterial
    );
    keeperGroup.add(body);

    // 3. Une sphère pour la tête (rayon 0.14 m, centrée à z = 1.72 m)
    var headGeom = new THREE.SphereGeometry(0.14, 20, 16);
    var headMesh = new THREE.Mesh(headGeom, skinMaterial);
    headMesh.position.set(0, 0, 1.72);
    headMesh.castShadow = true;
    keeperGroup.add(headMesh);

    // 4. Deux cylindres pour les bras (en extension vers l'avant/côtés pour l'interception)
    var leftArm = createCylinderBetween(
        new THREE.Vector3(-0.18, 0, 1.45),
        new THREE.Vector3(-0.65, -0.20, 1.15),
        0.06, 0.06, keeperMaterial
    );
    var rightArm = createCylinderBetween(
        new THREE.Vector3(0.18, 0, 1.45),
        new THREE.Vector3(0.65, -0.20, 1.15),
        0.06, 0.06, keeperMaterial
    );
    keeperGroup.add(leftArm);
    keeperGroup.add(rightArm);

    // Gants de protection
    var gloveGeom = new THREE.SphereGeometry(0.08, 14, 12);
    var gloveL = new THREE.Mesh(gloveGeom, skinMaterial);
    gloveL.position.set(-0.65, -0.20, 1.15);
    var gloveR = new THREE.Mesh(gloveGeom, skinMaterial);
    gloveR.position.set(0.65, -0.20, 1.15);
    keeperGroup.add(gloveL);
    keeperGroup.add(gloveR);

    scene.add(keeperGroup);

    // Point de capture en coordonnées monde, exactement entre les deux gants.
    keeperCatchPoint.set(0, -0.20, 1.15);
    keeperGroup.updateMatrixWorld(true);
    keeperGroup.localToWorld(keeperCatchPoint);
}

function createBall() {
    ballGroup = new THREE.Group();
    var ballMaterial = new THREE.MeshPhongMaterial({ color: createColor(ballParams.color), shininess: 35 });
    ballMesh = new THREE.Mesh(new THREE.SphereGeometry(0.11, 24, 18), ballMaterial);
    ballMesh.castShadow = true;
    ballMesh.receiveShadow = true;
    ballGroup.add(ballMesh);
    ballGroup.position.copy(defaultStart);
    scene.add(ballGroup);
}

function createShotTargets() {
    shotTargets = [
        { name: "Lucarne gauche", points: 1, position: new THREE.Vector3(-3.41, 1.50, 2.19) },
        { name: "Lucarne droite", points: 1, position: new THREE.Vector3(3.41, 1.50, 2.19) },
        { name: "Au sol gauche",  points: 2, position: new THREE.Vector3(-3.41, 1.50, 0.25) },
        { name: "Au sol droite",  points: 2, position: new THREE.Vector3(3.41, 1.50, 0.25) }
    ];
}

function rebuildDefenders(startPoint, openSide) {
    if (wallGroup) {
        scene.remove(wallGroup);
    }
    if (keeperGroup) {
        scene.remove(keeperGroup);
    }
    createWall(startPoint);
    wallGroup.userData.openSide = openSide || -1;
    createKeeper();
}

function chooseShotOutcome(target) {
    var wallHit = Math.random() < 0.25;
    var keeperSave = !wallHit && Math.random() < 0.30;

    var outcome = {
        targetName: target.name,
        result: "But",
        points: target.points,
        finishPoint: target.position.clone()
    };

    if (wallHit) {
        outcome.result = "Mur";
        outcome.points = 0;
        // Calculé dynamiquement dans buildShotPath selon le mannequin touché
    } else if (keeperSave) {
        outcome.result = "Arret gardien";
        outcome.points = 0;
        outcome.finishPoint = keeperCatchPoint.clone();
    }

    return outcome;
}

function buildShotPath(startPoint, finishPoint, isWallHit) {
    var goalCenter = new THREE.Vector3(0, 0, 0);
    var ballToGoal = new THREE.Vector3().subVectors(goalCenter, startPoint).normalize();

    // =========================================================================
    // CAS 1 : TIR CONTRÉ PAR LE MUR (Rupture C1, zéro pénétration, arrêt au sol)
    // =========================================================================
    if (isWallHit) {
        // Choix du défenseur heurté (mannequin central du mur)
        var hitDummyLocalX = 0.0;
        var wallNormal = new THREE.Vector3(-ballToGoal.y, ballToGoal.x, 0);

        // Position du centre du buste du mannequin cible
        var dummyCenter = wallGroup.position.clone().add(wallNormal.clone().multiplyScalar(hitDummyLocalX));
        dummyCenter.z = 1.30; // Altitude du buste

        // Impact sur l'enveloppe extérieure avant (rayon torse 0.22m + rayon balle 0.11m)
        var busteRadius = wallGroup.userData.busteRadius || 0.22;
        var ballRadius = 0.11;
        var impactPoint = dummyCenter.clone().sub(
            ballToGoal.clone().multiplyScalar(busteRadius + ballRadius)
        );

        // Arc 1 (Bézier quadratique vers le point d'impact)
        var p1 = new THREE.Vector3(
            startPoint.x + (impactPoint.x - startPoint.x) * 0.5,
            startPoint.y + (impactPoint.y - startPoint.y) * 0.5,
            0.95
        );
        var curve1 = new THREE.QuadraticBezierCurve3(startPoint, p1, impactPoint);

        // Arc 2 (Bézier cubique de renvoi : rebond vers l'avant et retombée au sol)
        // Point d'arrêt final au sol (z = 0.11 m) à ~3m en avant du mur
        var groundRestPoint = impactPoint.clone()
            .sub(ballToGoal.clone().multiplyScalar(3.2))
            .add(wallNormal.clone().multiplyScalar(0.6));
        groundRestPoint.z = 0.11; // Arrêt net sur la pelouse

        // Points de contrôle assurant une redescente naturelle
        var q1 = impactPoint.clone().sub(ballToGoal.clone().multiplyScalar(0.8));
        q1.z = impactPoint.z + 0.15; // Léger cabrement initial au rebond

        var q2 = groundRestPoint.clone().add(new THREE.Vector3(0, 0, 0.45));

        var curve2 = new THREE.CubicBezierCurve3(impactPoint, q1, q2, groundRestPoint);

        return { curve1: curve1, curve2: curve2, finishPoint: groundRestPoint };
    }

    // =========================================================================
    // CAS 2 : TRAJECTOIRE NORMALE (But ou Arrêt gardien avec continuité C1/G1)
    // =========================================================================
    var minClearanceZ = (wallGroup && wallGroup.userData.wallTopZ ?
        wallGroup.userData.wallTopZ : 1.90) + 0.35;
    var p2Z = Math.max(minClearanceZ, curveParams.junctionHeight);

    var p2 = new THREE.Vector3(
        THREE.Math.clamp(finishPoint.x * 0.25, -1.0, 1.0),
        wallGroup ? wallGroup.position.y : -12.85,
        p2Z
    );

    var p1 = new THREE.Vector3(
        startPoint.x + (p2.x - startPoint.x) * 0.55 + THREE.Math.clamp(curveParams.quadOffsetX * 0.08, -0.6, 0.6),
        startPoint.y + (p2.y - startPoint.y) * 0.48,
        THREE.Math.clamp(3.10 + curveParams.quadOffsetZ * 0.04, 2.85, 3.35)
    );

    // Formule exacte de raccordement différentiel C1 : Q1 = P2 + (2/3)*(P2 - P1)
    var Q1 = p2.clone().add(new THREE.Vector3().subVectors(p2, p1).multiplyScalar(2 / 3));

    var q2 = new THREE.Vector3(
        finishPoint.x * 0.70 + p2.x * 0.30 + THREE.Math.clamp(curveParams.cubicOffsetX * 0.08, -0.4, 0.4),
        -4.0,
        THREE.Math.clamp(p2.z * 0.50 + finishPoint.z * 0.50 + curveParams.cubicOffsetZ * 0.03, 0.25, 2.40)
    );

    return {
        curve1: new THREE.QuadraticBezierCurve3(startPoint, p1, p2),
        curve2: new THREE.CubicBezierCurve3(p2, Q1, q2, finishPoint),
        finishPoint: finishPoint
    };
}

function finishShot() {
    shotActive = false;
    currentBallPos = defaultStart.clone();
    ballGroup.position.copy(currentBallPos);
}

var shotResting = false;
var restStartTime = 0;
var restDuration = 1200; // 1,2 seconde d'arrêt visible net au sol ou dans les bras

function startShot() {
    if (shotIndex >= 5) {
        shotActive = false;
        return;
    }

    var target = shotTargets[Math.floor(Math.random() * shotTargets.length)];
    var outcome = chooseShotOutcome(target);
    var startPoint = currentBallPos.clone();

    // Le gardien couvre la cible en cas d'arrêt et anticipe le mauvais côté en cas de but.
    var targetSide = target.position.x >= 0 ? 1 : -1;
    var keeperSide = outcome.result === "Arret gardien" ? targetSide : -targetSide;
    rebuildDefenders(startPoint, keeperSide);

    // Le point d'arrivée d'un arrêt est celui des gants du gardien repositionné.
    if (outcome.result === "Arret gardien") {
        outcome.finishPoint = keeperCatchPoint.clone();
    }

    var curves = buildShotPath(startPoint, outcome.finishPoint, outcome.result === "Mur");
    shotCurve1 = curves.curve1;
    shotCurve2 = curves.curve2;
    outcome.finishPoint = curves.finishPoint; // Coordonnées exactes synchronisées

    shotGlobalT = 0;
    shotActive = true;
    shotResting = false;
    shotTime = performance.now();

    shotData.push(outcome);
    updateScoreboard(shotIndex, outcome);
    shotIndex += 1;
}

function updateBallAnimation() {
    var now = performance.now();

    // Mode automatique : enchaînement après repos complet
    if (shotParams.mode === "Automatique" && !shotActive && shotIndex < 5 && now >= nextShotTime) {
        startShot();
    }

    if (!shotActive) return;

    // Phase 1 : Trajectoire en vol (t de 0 à 2)
    if (!shotResting) {
        var elapsed = now - shotTime;
        shotGlobalT = (elapsed / shotDuration) * 2;

        if (shotGlobalT >= 2) {
            shotGlobalT = 2;
            currentBallPos.copy(shotCurve2.getPoint(1));
            ballGroup.position.copy(currentBallPos);

            // Début de la phase d'arrêt obligatoire
            shotResting = true;
            restStartTime = now;
            return;
        }

        if (shotCurve1 && shotCurve2) {
            if (shotGlobalT <= 1) {
                currentBallPos.copy(shotCurve1.getPoint(shotGlobalT));
            } else {
                currentBallPos.copy(shotCurve2.getPoint(shotGlobalT - 1));
            }
            ballGroup.position.copy(currentBallPos);
        }
    }
    // Phase 2 : Le ballon est immobile au sol ou dans les gants
    else {
        if (now - restStartTime >= restDuration) {
            finishShot();
            shotResting = false;
            nextShotTime = now + 600;
        }
    }
}

function initScoreboard() {
    var i;
    for (i = 1; i <= 5; i++) {
        scoreListItems.push(document.getElementById("tir-" + i));
    }

    var tbody = document.querySelector("#tableau-scores tbody");
    if (tbody) {
        scoreTableRows = tbody.querySelectorAll("tr");
    }
    scoreTotalCell = document.getElementById("score-total");
}

function updateScoreboard(shotNumber, outcome) {
    var listItem = scoreListItems[shotNumber];
    if (listItem) {
        listItem.textContent = "Tir " + (shotNumber + 1) + " : " + outcome.targetName + " - " + outcome.result + " (" + outcome.points + " pt)";
    }

    var row = scoreTableRows[shotNumber];
    if (row && row.children.length >= 4) {
        row.children[1].textContent = outcome.targetName;
        row.children[2].textContent = outcome.result;
        row.children[3].textContent = String(outcome.points);
    }

    scoreTotal += outcome.points;
    if (scoreTotalCell) {
        scoreTotalCell.textContent = scoreTotal + " pt";
    }
}

function triggerShotFromGui() {
    if (!shotActive && shotIndex < 5) {
        startShot();
    }
}

function updateShotMode() {
    if (shotParams.mode === "Manuel") {
        nextShotTime = Infinity;
    } else if (!shotActive && shotIndex < 5) {
        nextShotTime = performance.now();
    }
}

function resetShotsFromGui() {
    shotActive = false;
    shotIndex = 0;
    shotData = [];
    scoreTotal = 0;
    shotCurve1 = null;
    shotCurve2 = null;
    shotGlobalT = 0;
    shotResting = false;
    currentBallPos.copy(defaultStart);
    ballGroup.position.copy(currentBallPos);

    var i;
    for (i = 0; i < scoreListItems.length; i++) {
        if (scoreListItems[i]) {
            scoreListItems[i].textContent = "Tir " + (i + 1) + " : En attente...";
        }
    }

    for (i = 0; i < scoreTableRows.length; i++) {
        if (scoreTableRows[i] && scoreTableRows[i].children.length >= 4) {
            scoreTableRows[i].children[1].textContent = "-";
            scoreTableRows[i].children[2].textContent = "-";
            scoreTableRows[i].children[3].textContent = "0";
        }
    }

    if (scoreTotalCell) {
        scoreTotalCell.textContent = "0 pt";
    }
    nextShotTime = shotParams.mode === "Automatique" ? performance.now() + 250 : Infinity;
}

function buildGui() {
    gui = new dat.GUI();
    gui.width = 330;

    var cameraFolder = gui.addFolder("Camera");
    cameraFolder.add(cameraParams, "x", -60, 60).step(0.5).name("Position X").onChange(setCameraFromParams);
    cameraFolder.add(cameraParams, "y", -80, 40).step(0.5).name("Position Y").onChange(setCameraFromParams);
    cameraFolder.add(cameraParams, "z", 2, 40).step(0.5).name("Position Z").onChange(setCameraFromParams);
    cameraFolder.add(cameraParams, "lookX", -40, 40).step(0.5).name("Visee X").onChange(setCameraFromParams);
    cameraFolder.add(cameraParams, "lookY", -40, 20).step(0.5).name("Visee Y").onChange(setCameraFromParams);
    cameraFolder.add(cameraParams, "lookZ", 0, 15).step(0.5).name("Visee Z").onChange(setCameraFromParams);
    cameraFolder.close();

    var murFolder = gui.addFolder("Mannequins (Phong)");

    // Couleurs et reflets (Phong)
    murFolder.addColor(murParams, "color").name("Couleur").onChange(updateMurMaterial);
    murFolder.addColor(murParams, "emissive").name("Émissive").onChange(updateMurMaterial);
    murFolder.addColor(murParams, "specular").name("Spéculaire").onChange(updateMurMaterial);
    murFolder.add(murParams, "shininess", 1, 100).step(1).name("Brillance").onChange(updateMurMaterial);

    // Rendu, transparence et fil de fer
    murFolder.add(murParams, "opacity", 0.0, 1.0).step(0.05).name("Opacité").onChange(function (val) {
        // Active automatiquement la transparence si l'opacité passe sous 1.0
        if (val < 1.0) murParams.transparent = true;
        updateMurMaterial();
    });
    murFolder.add(murParams, "transparent").name("Transparence").onChange(updateMurMaterial);
    murFolder.add(murParams, "wireframe").name("Fil de fer").onChange(updateMurMaterial);
    murFolder.add(murParams, "flatShading").name("Ombrage plat").onChange(updateMurMaterial);

    // Contrôle du raccordement géométrique G1
    murFolder.add(murParams, "joinCoeff", 0.1, 1.5).step(0.05).name("Jointure G1 (k)").onChange(function () {
        rebuildDefenders(currentBallPos.clone());
    });
    murFolder.close();

    var ballFolder = gui.addFolder("Ballon & Tirs");
    ballFolder.addColor(ballParams, "color").name("Couleur du ballon").onChange(function () {
        if (ballMesh && ballMesh.material) {
            ballMesh.material.color = createColor(ballParams.color);
            ballMesh.material.needsUpdate = true;
        }
    });
    ballFolder.add(shotParams, "mode", ["Automatique", "Manuel"]).name("Mode").onChange(updateShotMode);
    ballFolder.add({ tirer: triggerShotFromGui }, "tirer").name("Declencher un tir");
    ballFolder.add({ reinitialiser: resetShotsFromGui }, "reinitialiser").name("Reinitialiser les 5 tirs");
    ballFolder.close();

    var curveFolder = gui.addFolder("Trajectoire (Bezier)");
    curveFolder.add(curveParams, "quadOffsetX", -10, 10).step(0.1).name("Courbure X");
    curveFolder.add(curveParams, "quadOffsetZ", 0, 10).step(0.1).name("Hauteur P1");
    curveFolder.add(curveParams, "cubicOffsetX", -6, 6).step(0.1).name("Guidage X");
    curveFolder.add(curveParams, "cubicOffsetZ", 0, 8).step(0.1).name("Guidage Z");
    curveFolder.add(curveParams, "junctionHeight", 2.25, 4.5).step(0.05).name("Hauteur sommet P2");
    curveFolder.close();

    cameraFolder.close();
    murFolder.close();
    ballFolder.close();
    curveFolder.close();
}

function init() {
    stats = initStats();

    rendu = new THREE.WebGLRenderer({ antialias: true });
    rendu.shadowMap.enabled = true;
    rendu.shadowMap.type = THREE.PCFSoftShadowMap;
    rendu.setClearColor(new THREE.Color(0xffffff));
    rendu.setSize(window.innerWidth * 0.98, window.innerHeight * 0.98);
    rendu.setPixelRatio(window.devicePixelRatio || 1);

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);

    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    setCameraFromParams();

    var ambient = new THREE.AmbientLight(0x666666);
    scene.add(ambient);

    var directional = new THREE.DirectionalLight(0xffffff, 0.95);
    directional.position.set(14, -16, 25);
    directional.castShadow = true;
    directional.shadow.mapSize.width = 2048;
    directional.shadow.mapSize.height = 2048;
    scene.add(directional);

    var helper = new THREE.AxesHelper(4);
    scene.add(helper);

    createTerrain();
    createGoal();
    rebuildDefenders(currentBallPos.clone());
    createBall();
    createShotTargets();
    initScoreboard();
    buildGui();

    document.getElementById("webgl").appendChild(rendu.domElement);

    window.addEventListener("resize", onWindowResize, false);

    renduAnim();
    nextShotTime = shotParams.mode === "Automatique" ? performance.now() + 900 : Infinity;
}
