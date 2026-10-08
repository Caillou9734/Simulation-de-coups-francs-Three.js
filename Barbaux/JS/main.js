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
    specular: "#222222",
    shininess: 18,
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
    junctionHeight: 4.8
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
    if (stats) {
        stats.update();
    }

    rendu.render(scene, camera);
    requestAnimationFrame(renduAnim);
}

function gameTick() {
    updateBallAnimation();
}

function addLineSegment(parent, start, end, color, lineWidth) {
    var geometry = new THREE.BufferGeometry().setFromPoints([start, end]);
    var material = new THREE.LineBasicMaterial({ color: color, linewidth: lineWidth || 1 });
    var line = new THREE.Line(geometry, material);
    parent.add(line);
    return line;
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

function createGoal() {
    goalGroup = new THREE.Group();

    var postMaterial = new THREE.MeshPhongMaterial({ color: 0xf2f2f2, shininess: 30 });
    var netMaterial = new THREE.LineBasicMaterial({ color: 0xf0f0f0 });

    var leftPostBase = new THREE.Vector3(-3.66, 0, 0);
    var leftPostTop = new THREE.Vector3(-3.66, 0, 2.44);
    var rightPostBase = new THREE.Vector3(3.66, 0, 0);
    var rightPostTop = new THREE.Vector3(3.66, 0, 2.44);
    var crossLeft = new THREE.Vector3(-3.66, 0, 2.44);
    var crossRight = new THREE.Vector3(3.66, 0, 2.44);

    goalGroup.add(createCylinderBetween(leftPostBase, leftPostTop, 0.07, 0.07, postMaterial));
    goalGroup.add(createCylinderBetween(rightPostBase, rightPostTop, 0.07, 0.07, postMaterial));
    goalGroup.add(createCylinderBetween(crossLeft, crossRight, 0.07, 0.07, postMaterial));

    var rearY = 1.25;
    var upperRearZ = 2.44;
    var lowerRearZ = 0.0;
    var backLeft = new THREE.Vector3(-3.66, rearY, 0);
    var backRight = new THREE.Vector3(3.66, rearY, 0);
    var backLeftTop = new THREE.Vector3(-3.66, rearY, upperRearZ);
    var backRightTop = new THREE.Vector3(3.66, rearY, upperRearZ);

    goalGroup.add(createCylinderBetween(leftPostTop, backLeftTop, 0.03, 0.03, postMaterial));
    goalGroup.add(createCylinderBetween(rightPostTop, backRightTop, 0.03, 0.03, postMaterial));
    goalGroup.add(createCylinderBetween(backLeft, backRight, 0.03, 0.03, postMaterial));
    goalGroup.add(createCylinderBetween(backLeft, backLeftTop, 0.03, 0.03, postMaterial));
    goalGroup.add(createCylinderBetween(backRight, backRightTop, 0.03, 0.03, postMaterial));
    goalGroup.add(createCylinderBetween(backLeftTop, backRightTop, 0.03, 0.03, postMaterial));

    var holeRects = [
        { x0: -3.66, x1: -3.16, z0: 1.94, z1: 2.44 },
        { x0: 3.16, x1: 3.66, z0: 1.94, z1: 2.44 },
        { x0: -3.66, x1: -3.16, z0: 0.00, z1: 0.50 },
        { x0: 3.16, x1: 3.66, z0: 0.00, z1: 0.50 }
    ];

    addNetPanel(goalGroup, -3.66, 3.66, 0.0, 2.44, rearY, holeRects, netMaterial, true);
    addNetSide(goalGroup, -3.66, 0.0, rearY, 2.44, holeRects, netMaterial, -1);
    addNetSide(goalGroup, 3.66, 0.0, rearY, 2.44, holeRects, netMaterial, 1);

    scene.add(goalGroup);
}

function addNetSegment(group, a, b, material) {
    var geometry = new THREE.BufferGeometry().setFromPoints([a, b]);
    var line = new THREE.Line(geometry, material);
    group.add(line);
}

function segmentOverlapsHole(a0, a1, b0, b1, rect) {
    var minA = Math.min(a0, a1);
    var maxA = Math.max(a0, a1);
    var minB = Math.min(b0, b1);
    var maxB = Math.max(b0, b1);
    return !(maxA < rect.x0 || minA > rect.x1 || maxB < rect.z0 || minB > rect.z1);
}

function addNetPanel(group, xMin, xMax, zMin, zMax, yPos, holes, material, isBack) {
    var xStep = 0.5;
    var zStep = 0.5;
    var x;
    var z;
    var xCount = Math.ceil((xMax - xMin) / xStep);
    var zCount = Math.ceil((zMax - zMin) / zStep);

    for (var xIndex = 0; xIndex <= xCount; xIndex++) {
        x = Math.min(xMin + xIndex * xStep, xMax);
        var zCursor = zMin;
        for (var h = 0; h < holes.length; h++) {
            var hole = holes[h];
            if (segmentOverlapsHole(x, x, zCursor, zMax, hole)) {
                if (zCursor < hole.z0) {
                    addNetSegment(
                        group,
                        new THREE.Vector3(x, yPos, zCursor),
                        new THREE.Vector3(x, yPos, hole.z0),
                        material
                    );
                }
                zCursor = hole.z1;
            }
        }
        if (zCursor < zMax) {
            addNetSegment(
                group,
                new THREE.Vector3(x, yPos, zCursor),
                new THREE.Vector3(x, yPos, zMax),
                material
            );
        }
    }

    for (var zIndex = 0; zIndex <= zCount; zIndex++) {
        z = Math.min(zMin + zIndex * zStep, zMax);
        var xCursor = xMin;
        for (var j = 0; j < holes.length; j++) {
            var holeRect = holes[j];
            if (segmentOverlapsHole(xCursor, xMax, z, z, holeRect)) {
                if (xCursor < holeRect.x0) {
                    addNetSegment(
                        group,
                        new THREE.Vector3(xCursor, yPos, z),
                        new THREE.Vector3(holeRect.x0, yPos, z),
                        material
                    );
                }
                xCursor = holeRect.x1;
            }
        }
        if (xCursor < xMax) {
            addNetSegment(
                group,
                new THREE.Vector3(xCursor, yPos, z),
                new THREE.Vector3(xMax, yPos, z),
                material
            );
        }
    }
}

function addNetSide(group, xFixed, yMin, yMax, zMax, holes, material, sideSign) {
    var y;
    var z;
    var yStep = 0.5;
    var zStep = 0.5;
    var yCount = Math.ceil((yMax - yMin) / yStep);
    var zCount = Math.ceil(zMax / zStep);

    for (var yIndex = 0; yIndex <= yCount; yIndex++) {
        y = Math.min(yMin + yIndex * yStep, yMax);
        addNetSegment(
            group,
            new THREE.Vector3(xFixed, y, 0),
            new THREE.Vector3(xFixed, y, zMax),
            material
        );
    }

    for (var zIndex = 0; zIndex <= zCount; zIndex++) {
        z = Math.min(zIndex * zStep, zMax);
        addNetSegment(
            group,
            new THREE.Vector3(xFixed, yMin, z),
            new THREE.Vector3(xFixed, yMax, z),
            material
        );
    }
}

function createLatheProfile(sectionHeight, radiusStart, radiusEnd, bulge, joinCoeff) {
    var points = [];
    var steps = 10;
    var i;
    for (i = 0; i <= steps; i++) {
        var t = i / steps;
        var smooth = t * t * (3 - 2 * t);
        var wave = Math.sin(Math.PI * t) * bulge * joinCoeff;
        var radius = radiusStart + (radiusEnd - radiusStart) * smooth + wave;
        var height = sectionHeight * t;
        points.push(new THREE.Vector2(Math.max(0.03, radius), height));
    }
    return points;
}

function createMannequin(height, materialOptions, joinCoeff) {
    var group = new THREE.Group();
    var bodyMaterial = new THREE.MeshPhongMaterial(materialOptions);
    var zJunction = height * 0.55; // Hauteur de jonction (taille/hanches)
    var rJunction = 0.22;          // Rayon partagé au raccord (continuité C0)
    var steps = 15;
    var i;

    // Profil 1 (Bas) : de z = 0 à zJunction
    // Tangente finale au point de contact : pente slopeJoin
    var slopeJoin = 0.15;
    var pointsBas = [];
    for (i = 0; i <= steps; i++) {
        var t = i / steps;
        var z = zJunction * t;
        var r = 0.12 + (rJunction - 0.12) * t + 0.04 * Math.sin(Math.PI * t);
        pointsBas.push(new THREE.Vector2(r, z));
    }

    // Profil 2 (Haut) : de zJunction à height
    // Tangente initiale colinéaire : pente ajustée par joinCoeff (continuité G1)
    var pointsHaut = [];
    var hautHeight = height - zJunction;
    for (i = 0; i <= steps; i++) {
        var u = i / steps;
        var zH = zJunction + hautHeight * u;
        var rH = rJunction + (slopeJoin * joinCoeff) * (hautHeight * u) 
                 + (0.10 - rJunction - slopeJoin * joinCoeff * hautHeight) * (u * u)
                 + 0.05 * Math.sin(Math.PI * u);
        pointsHaut.push(new THREE.Vector2(Math.max(0.04, rH), zH));
    }

    var latheSettings = 24;
    var meshBas = new THREE.Mesh(new THREE.LatheGeometry(pointsBas, latheSettings), bodyMaterial);
    var meshHaut = new THREE.Mesh(new THREE.LatheGeometry(pointsHaut, latheSettings), bodyMaterial);

    meshBas.rotation.x = Math.PI / 2;
    meshHaut.rotation.x = Math.PI / 2;
    meshBas.castShadow = true;
    meshHaut.castShadow = true;

    group.add(meshBas);
    group.add(meshHaut);

    return group;
}

function updateMurMaterial() {
    if (!wallGroup) {
        return;
    }

    var i;
    for (i = 0; i < wallGroup.children.length; i++) {
        var mannequin = wallGroup.children[i];
        var j;
        for (j = 0; j < mannequin.children.length; j++) {
            var mesh = mannequin.children[j];
            if (mesh.material) {
                mesh.material.color = createColor(murParams.color);
                mesh.material.specular = createColor(murParams.specular);
                mesh.material.shininess = murParams.shininess;
                mesh.material.needsUpdate = true;
            }
        }
    }
}

function createWall(startPoint) {
    wallGroup = new THREE.Group();

    var heights = [1.75, 1.80, 1.86, 1.78, 1.90];
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

    var i;
    for (i = 0; i < 5; i++) {
        var mannequin = createMannequin(heights[i], {
            color: murParams.color,
            specular: murParams.specular,
            shininess: murParams.shininess
        }, murParams.joinCoeff);

        mannequin.position.set(xPositions[i], 0, 0);
        wallGroup.add(mannequin);
    }

    scene.add(wallGroup);
}

function createKeeper() {
    keeperGroup = new THREE.Group();
    var wallCoversRightSide = wallGroup.position.x + 3.6 > 0;
    var keeperSide = wallCoversRightSide ? -1 : 1;
    keeperGroup.position.set(keeperSide * 2.3, -0.3, 0);

    var keeperMaterial = new THREE.MeshPhongMaterial({
        color: 0xeaeaea,
        shininess: 35
    });
    var skinMaterial = new THREE.MeshPhongMaterial({
        color: 0xffddbb,
        shininess: 12
    });

    var bodyBase = new THREE.Vector3(0, 0, 0.15);
    var bodyTop = new THREE.Vector3(0, 0, 1.45);
    var leftLegTop = new THREE.Vector3(-0.18, 0, 0.95);
    var leftLegBase = new THREE.Vector3(-0.38, 0, 0.0);
    var rightLegTop = new THREE.Vector3(0.18, 0, 0.95);
    var rightLegBase = new THREE.Vector3(0.38, 0, 0.0);
    var leftArmTop = new THREE.Vector3(-0.52, 0, 1.3);
    var leftArmBase = new THREE.Vector3(-1.05, 0, 1.0);
    var rightArmTop = new THREE.Vector3(0.52, 0, 1.3);
    var rightArmBase = new THREE.Vector3(1.05, 0, 1.0);

    keeperGroup.add(createCylinderBetween(leftLegBase, leftLegTop, 0.08, 0.09, keeperMaterial));
    keeperGroup.add(createCylinderBetween(rightLegBase, rightLegTop, 0.08, 0.09, keeperMaterial));
    keeperGroup.add(createCylinderBetween(bodyBase, bodyTop, 0.14, 0.16, keeperMaterial));
    keeperGroup.add(createCylinderBetween(leftArmBase, leftArmTop, 0.055, 0.065, keeperMaterial));
    keeperGroup.add(createCylinderBetween(rightArmBase, rightArmTop, 0.055, 0.065, keeperMaterial));

    var head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 20, 16), skinMaterial);
    head.position.set(0, 0, 1.78);
    head.castShadow = true;
    keeperGroup.add(head);

    var gloveLeft = new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 12), keeperMaterial);
    gloveLeft.position.set(-1.12, 0, 1.0);
    keeperGroup.add(gloveLeft);

    var gloveRight = new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 12), keeperMaterial);
    gloveRight.position.set(1.12, 0, 1.0);
    keeperGroup.add(gloveRight);

    keeperCatchPoint.set(keeperSide * 1.12, 0, 1.0).add(keeperGroup.position);
    keeperGroup.userData.catchPoint = keeperCatchPoint.clone();
    scene.add(keeperGroup);
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
        { name: "Lucarne gauche", points: 1, position: new THREE.Vector3(-3.42, 1.25, 2.18) },
        { name: "Lucarne droite", points: 1, position: new THREE.Vector3(3.42, 1.25, 2.18) },
        { name: "Au sol gauche", points: 2, position: new THREE.Vector3(-3.42, 1.25, 0.22) },
        { name: "Au sol droite", points: 2, position: new THREE.Vector3(3.42, 1.25, 0.22) }
    ];
}

function rebuildDefenders(startPoint) {
    if (wallGroup) {
        scene.remove(wallGroup);
    }
    if (keeperGroup) {
        scene.remove(keeperGroup);
    }
    createWall(startPoint);
    createKeeper();
}

function chooseShotOutcome(target) {
    var wallHit = Math.random() < 0.25;
    var keeperSave = !wallHit && Math.random() < 0.3;
    var outcome = {
        targetName: target.name,
        result: "But",
        points: target.points,
        finishPoint: target.position.clone()
    };

    if (wallHit) {
        outcome.result = "Mur";
        outcome.points = 0;
        // Le ballon est repoussé par le mur et retombe au sol (Z = 0.11 m, rayon de la balle)
        // Le mur étant à Y ≈ -12.8 m, le contre retombe devant le mur à Y ≈ -13.5 m
        outcome.finishPoint = new THREE.Vector3(1.1, -15.2, 0.11);

    } else if (keeperSave) {
        outcome.result = "Arret gardien";
        outcome.points = 0;
        // Le ballon arrive directement dans les gants du gardien
        outcome.finishPoint = keeperCatchPoint.clone();
    }

    return outcome;
}

function buildShotPath(startPoint, finishPoint, isWallHit) {
    // 1. Cas du tir contré par le mur : le ballon tape le torse et rebondit vers l'avant
    if (isWallHit) {
        // Point d'impact sur le mur (torse d'un mannequin à 1,35 m de haut)
        var p2 = new THREE.Vector3(0.55, -12.8, 1.35);
        var p1 = new THREE.Vector3(
            startPoint.x + (p2.x - startPoint.x) * 0.5,
            startPoint.y + (p2.y - startPoint.y) * 0.5,
            0.8
        );

        // Rebond géométrique vers l'avant (vers le tireur, Y plus négatif)
        var q1 = new THREE.Vector3(0.8, -13.8, 1.1);
        var q2 = new THREE.Vector3(1.0, -14.6, 0.4);

        var curve1 = new THREE.QuadraticBezierCurve3(startPoint, p1, p2);
        var curve2 = new THREE.CubicBezierCurve3(p2, q1, q2, finishPoint);
        return {
            curve1: curve1,
            curve2: curve2
        };
    }

    // 2. Cas normal (But ou Arrêt gardien) : passage fluide au-dessus du mur avec continuité C1/G1
    var p2 = new THREE.Vector3(
        THREE.Math.clamp(finishPoint.x * 0.18, -1.2, 1.2),
        -12,
        THREE.Math.clamp(curveParams.junctionHeight * 0.5, 2.2, 2.6)
    );
    var p1 = new THREE.Vector3(
        startPoint.x + (p2.x - startPoint.x) * 0.58 + THREE.Math.clamp(curveParams.quadOffsetX * 0.08, -0.5, 0.5),
        startPoint.y + (p2.y - startPoint.y) * 0.48,
        THREE.Math.clamp(3.0 + curveParams.quadOffsetZ * 0.04, 2.8, 3.2)
    );
    let Q1 = p2.clone().add(new THREE.Vector3().subVectors(p2, p1).multiplyScalar(2 / 3));
    var q2 = new THREE.Vector3(
        finishPoint.x * 0.72 + p2.x * 0.28 + THREE.Math.clamp(curveParams.cubicOffsetX * 0.08, -0.35, 0.35),
        -4,
        THREE.Math.clamp(p2.z * 0.52 + finishPoint.z * 0.48 + curveParams.cubicOffsetZ * 0.03, 0.15, 2.4)
    );

    var curve1 = new THREE.QuadraticBezierCurve3(startPoint, p1, p2);
    var curve2 = new THREE.CubicBezierCurve3(p2, Q1, q2, finishPoint);
    return {
        curve1: curve1,
        curve2: curve2
    };
}

function startShot() {
    if (shotIndex >= 5) {
        shotActive = false;
        return;
    }

    var target = shotTargets[Math.floor(Math.random() * shotTargets.length)];
    var outcome = chooseShotOutcome(target);
    var startPoint = currentBallPos.clone();
    rebuildDefenders(startPoint);

    // On passe l'information du choc mur au générateur de courbe
    var curves = buildShotPath(startPoint, outcome.finishPoint.clone(), outcome.result === "Mur");
    shotCurve1 = curves.curve1;
    shotCurve2 = curves.curve2;
    shotGlobalT = 0;
    shotActive = true;
    shotTime = performance.now();

    shotData.push(outcome);
    updateScoreboard(shotIndex, outcome);
    shotIndex += 1;
}

    var target = shotTargets[Math.floor(Math.random() * shotTargets.length)];
    var outcome = chooseShotOutcome(target);
    var startPoint = currentBallPos.clone();
    rebuildDefenders(startPoint);

    var curves = buildShotPath(startPoint, outcome.finishPoint.clone());
    shotCurve1 = curves.curve1;
    shotCurve2 = curves.curve2;
    shotGlobalT = 0;
    shotActive = true;
    shotTime = performance.now();

    shotData.push(outcome);
    updateScoreboard(shotIndex, outcome);
    shotIndex += 1;


function finishShot() {
    shotActive = false;
    currentBallPos = defaultStart.clone();
    ballGroup.position.copy(currentBallPos);
}

function updateBallAnimation() {
    var now = performance.now();

    if (shotParams.mode === "Automatique" && !shotActive && shotIndex < 5 && now >= nextShotTime) {
        startShot();
    }

    if (!shotActive) {
        return;
    }

    var elapsed = now - shotTime;
    shotGlobalT = (elapsed / shotDuration) * 2;
    if (shotGlobalT >= 2) {
        shotGlobalT = 2;
    }

    if (shotCurve1 && shotCurve2) {
        if (shotGlobalT <= 1) {
            currentBallPos.copy(shotCurve1.getPoint(shotGlobalT));
        } else {
            currentBallPos.copy(shotCurve2.getPoint(shotGlobalT - 1));
        }
        ballGroup.position.copy(currentBallPos);
    }

    if (shotGlobalT >= 2) {
        finishShot();
        nextShotTime = now + 650;
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
    murFolder.addColor(murParams, "color").name("Couleur").onChange(updateMurMaterial);
    murFolder.addColor(murParams, "specular").name("Speculaire").onChange(updateMurMaterial);
    murFolder.add(murParams, "shininess", 1, 100).step(1).name("Brillance").onChange(updateMurMaterial);
    murFolder.add(murParams, "joinCoeff", 0.1, 1.2).step(0.05).name("Jointure G1").onChange(function () {
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
    window.setInterval(gameTick, 33);
    nextShotTime = shotParams.mode === "Automatique" ? performance.now() + 900 : Infinity;
}
