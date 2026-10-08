# ⚽ Simulation Interactive d'une Séance de Coups Francs — Michel Platini

Application web interactive 3D simulant une séance de cinq coups francs directs face à un mur défensif et un gardien dynamique, développée en **JavaScript Vanilla** et **Three.js** dans le cadre du cursus universitaire de Licence 2 Informatique & Électronique (UFR Sciences et Techniques, Université de Bourgogne).

## 📌 Contexte Académique

* **Établissement :** Université de Bourgogne (Dijon, France)

* **Formation :** Licence 2 Informatique & Électronique

* **Module :** Informatique Graphique & Synthèse d'Images 3D (Info3Ba)

* **Enseignant référent :** M. Lionel Garnier

* **Auteur :** Cyprien Barbaux

* **Année universitaire :** 2026-2027

## 🎯 Fonctionnalités et Contraintes Techniques

Le projet respecte rigoureusement le cahier des charges académique imposé :

1. **Repère physique direct à cote** $Z$ **verticale (**$Z$**-up) :**

   * L'axe $Z$ modélise l'altitude physique (pelouse plane à $z = 0$).

   * Réorientation explicite de la caméra : `camera.up.set(0, 0, 1)`.

2. **Conformité algorithmique stricte :**

   * **Zéro mot-clé `break`** dans les boucles de parcours algorithmique.

   * Discrétisation spatiale par compteurs entiers stricts ($i \in \llbracket 0, N \rrbracket$) et fractions rationnelles, évitant l'accumulation d'erreurs d'arrondi flottant (norme IEEE 754).

3. **Modélisation géométrique avancée :**

   * **Arc de surface de réparation :** Approximation par une parabole plane calculée analytiquement.

   * **Cages réglementaires (**$7{,}32\text{ m} \times 2{,}44\text{ m} \times 1{,}50\text{ m}$**) :** Montants tubulaires reliés à la barre transversale par des raccords toriques assurant une continuité $G^1$.

   * **Filet ajouré algorithmique :** Maillage régulier ($10\text{ cm}$) fenêtré de 4 cibles rectangulaires ($50\text{ cm} \times 50\text{ cm}$ : deux lucarnes, deux au ras du sol) obtenues par partitionnement d'intervalles sans rupture de boucle.

   * **Mannequins du mur (5 silhouettes) :** Assemblage coaxial de 4 surfaces de révolution (`LatheGeometry` et cylindre) avec continuité géométrique $G^1$ au niveau de la taille, paramétrée par un coefficient de tension $k$.

   * **Gardien réactif :** Modélisé par primitives géométriques lisses, positionné sur sa ligne de but ($y = 0$) avec anticipation latérale sur l'angle ouvert non masqué par le mur.

4. **Cinématique de tir par courbes de Bézier raccordées :**

   * Courbe composite combinant un arc quadratique $B_1(t)$ ($P_0, P_1, P_2$) et un arc cubique $B_2(u)$ ($Q_0, Q_1, Q_2, Q_3$).

   * Continuité de position $C^0$ ($P_2 = Q_0$) et continuité différentielle/géométrique $C^1 / G^1$ par calcul vectoriel analytique de $Q_1$.

   * Verrouillage dans l'interface des points critiques : $P_0$ (ballon au sol), $Q_1$ (dérivé formellement) et $Q_3$ (cible dans le filet).

5. **Gestion du choc contre le mur :**

   * Réflexion cinématique simplifiée sans interpénétration.

   * Rupture différentielle nette au point d'impact écartant toute boucle rentrante dans le buste.

   * Retombée amortie et arrêt net du ballon au sol ($z = 0{,}11\text{ m}$).

6. **Interface et restitution synchrone :**

   * Panneau de contrôle `dat.GUI` complet (caméra, paramètres d'éclairage de Phong, courbure du tir, coefficient $G^1$).

   * Mise à jour en temps réel des résultats dans le DOM : liste ordonnée (`<ol>`) et tableau récapitulatif (`<table>`) avec total calculé dans `<tfoot>`.

## 📐 Fondements Mathématiques

### 1. Raccordement différentiel $C^1$ / $G^1$ de la trajectoire

La trajectoire est formée par l'union de deux courbes de Bézier raccordées au sommet du mur :

* **Arc 1 (quadratique) :** $B_1(t) = (1-t)^2 P_0 + 2t(1-t) P_1 + t^2 P_2, \quad t \in [0, 1]$

* **Arc 2 (cubique) :** $B_2(u) = (1-u)^3 Q_0 + 3u(1-u)^2 Q_1 + 3u^2(1-u) Q_2 + u^3 Q_3, \quad u \in [0, 1]$

Au point de bascule ($t=1, u=0$), la continuité $C^0$ impose $Q_0 = P_2$. La continuité de tangence $C^1$ (pour une vitesse cinématique uniforme $\Delta t_1 = \Delta t_2 = 1$) impose l'égalité des vecteurs vitesse :

$$
B_1'(1) = B_2'(0)
$$

Sachant que :

$$
B_1'(1) = 2(P_2 - P_1)
$$

$$
B_2'(0) = 3(Q_1 - Q_0) = 3(Q_1 - P_2)
$$

On en déduit la relation analytique exacte permettant de verrouiller $Q_1$ :

$$
3(Q_1 - P_2) = 2(P_2 - P_1) \iff Q_1 = P_2 + \frac{2}{3}(P_2 - P_1)
$$

Cette formulation garantit également l'alignement colinéaire des points $P_1$, $P_2$ et $Q_1$, assurant une continuité géométrique $G^1$.

### 2. Continuité géométrique $G^1$ des mannequins de révolution

Chaque mannequin défensif associe deux surfaces de révolution centrales à profil méridien paramétré par Bézier cubique dans le plan $(r, z)$ :

* Profil inférieur $\gamma_1(t)$ piloté par $(A_0, A_1, A_2, A_3)$, avec $t \in [0, 1]$.

* Profil supérieur $\gamma_2(u)$ piloté par $(B_0, B_1, B_2, B_3)$, avec $u \in [0, 1]$.

Au point de jonction à la taille ($z_j \approx 0{,}98\text{ m}$), nous imposons $B_0 = A_3$ ($C^0$). Pour garantir l'absence d'arête vive sous l'éclairage de Phong, les vecteurs tangents méridiens doivent être colinéaires et de même sens :

$$
\vec{T}_2 = k \cdot \vec{T}_1 \quad \text{avec } k > 0
$$

$$
\gamma_2'(0) = k \cdot \gamma_1'(1) \iff 3(B_1 - B_0) = 3k(A_3 - A_2) \iff B_1 = B_0 + k(A_3 - A_2)
$$

Le coefficient $k$ (`joinCoeff`), ajustable via le menu `dat.GUI`, permet de moduler la tension de courbure sans jamais briser la continuité du champ de normales.

### 3. Modélisation analytique de l'arc de surface

L'arc entourant le point de réparation est calculé sous forme d'une parabole plane surélevée de $\Delta z = 0{,}01\text{ m}$ :

$$
y(x) = y_0 - h \left(1 - \frac{x^2}{L^2}\right)
$$

Avec $y_0 = -16{,}50\text{ m}$, une flèche $h = 3{,}65\text{ m}$, une demi-largeur $L = 7{,}32\text{ m}$, et discrétisé pour $i \in \llbracket 0, 60 \rrbracket$ par :

$$
x_i = -L + \frac{2L \cdot i}{60}
$$

## 📂 Structure du Répertoire

Conformément aux normes d'organisation du module :

```
Barbaux/
├── Barbaux.pdf              # Rapport technique complet (15 pages)
└── Barbaux/
    ├── HTML/
    │   └── index.html       # Structure DOM (rendu WebGL, liste ordonnée, tableau récapitulatif)
    ├── CSS/
    │   └── style.css        # Styles visuels et mise en forme du tableau de bord
    └── JS/
        └── main.js          # Moteur graphique Three.js, cinématique et interface dat.GUI

```

> **Note relative aux dépendances :** Le projet exploite les bibliothèques pédagogiques Three.js fournies dans l'archive du cours, accessibles via le chemin relatif `../../libs/`.

## 🚀 Installation et Exécution

1. **Cloner le dépôt :**

   ```
   git clone https://github.com/votre-utilisateur/simulation-coups-francs-threejs.git
   cd simulation-coups-francs-threejs
   
   ```

2. **Structure des librairies :**
   Assurez-vous que le répertoire `libs/` (contenant `three/three.js`, `util/dat.gui.js`, `util/Stats.js` et `util/util.js`) est présent à la racine relative requise :

   ```
   racine/
   ├── libs/
   └── Barbaux/
       └── Barbaux/
           └── HTML/index.html
   
   ```

3. **Lancer un serveur local :**
   Pour éviter les restrictions de sécurité CORS liées au chargement de scripts locaux, utilisez un serveur HTTP statique (par exemple `Live Server` sous VS Code ou `python3`) :

   ```
   # Via Python 3
   python3 -m http.server 8080
   
   ```

   Ouvrez ensuite votre navigateur à l'adresse suivante :

   ```
   http://localhost:8080/Barbaux/Barbaux/HTML/index.html
   
   ```

## 🎮 Commandes et Interface Utilisateur (`dat.GUI`)

* **Caméra :**

  * Position $(X, Y, Z)$ et orientation du point de visée.

* **Mannequins (Phong) :**

  * Couleur diffuse, émissive, spéculaire et brillance (`shininess`).

  * Modes opacité, transparence, ombrage plat (`flatShading`) et fil de fer (`wireframe`).

  * Réglage interactif du coefficient de raccordement $G^1$ ($k$).

* **Ballon & Tirs :**

  * Couleur du ballon.

  * Sélection du mode : **Automatique** (enchaînement des 5 tirs) ou **Manuel**.

  * Boutons : *Déclencher un tir* / *Réinitialiser les 5 tirs*.

* **Trajectoire (Bézier) :**

  * Ajustement fin des courbures $X$ et $Z$ des points de passage intermédiaires ($P_1$, $P_2$, $Q_2$).

## 📊 Barème et Décompte des Points

* **But en lucarne (gauche ou droite) :** $1\text{ point}$

* **But au ras du sol (gauche ou droite) :** $2\text{ points}$

* **Arrêt du gardien :** $0\text{ point}$

* **Tir contré par le mur :** $0\text{ point}$

## 📄 Licence

Projet réalisé à des fins pédagogiques et académiques. Code libre d'accès pour étude et démonstration sous réserve de citation de l'auteur.
