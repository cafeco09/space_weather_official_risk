cat > docs/app.js <<'EOF'
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.164.1/build/three.module.js";

const canvas = document.getElementById("globe");
const stage = document.querySelector(".stage");
const tooltip = document.getElementById("tooltip");

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(45, stage.clientWidth / stage.clientHeight, 0.1, 1000);
camera.position.set(0, 0.6, 8);

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: true
});

renderer.setSize(stage.clientWidth, stage.clientHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const ambient = new THREE.AmbientLight(0xffffff, 1.4);
scene.add(ambient);

const sun = new THREE.DirectionalLight(0xffffff, 3.2);
sun.position.set(5, 3, 5);
scene.add(sun);

const rim = new THREE.PointLight(0x64d9ff, 4, 18);
rim.position.set(-4, 2, 3);
scene.add(rim);

function createStars() {
  const geometry = new THREE.BufferGeometry();
  const vertices = [];

  for (let i = 0; i < 1200; i++) {
    vertices.push(
      (Math.random() - 0.5) * 55,
      (Math.random() - 0.5) * 55,
      (Math.random() - 0.5) * 55
    );
  }

  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));

  const material = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.035,
    transparent: true,
    opacity: 0.75
  });

  const stars = new THREE.Points(geometry, material);
  scene.add(stars);
  return stars;
}

const stars = createStars();

const earthGroup = new THREE.Group();
scene.add(earthGroup);

const earthGeometry = new THREE.SphereGeometry(2, 96, 96);

const earthMaterial = new THREE.MeshStandardMaterial({
  color: 0x1d75d8,
  roughness: 0.8,
  metalness: 0.02
});

const earth = new THREE.Mesh(earthGeometry, earthMaterial);
earthGroup.add(earth);

const landMaterial = new THREE.MeshStandardMaterial({
  color: 0x2fb16d,
  roughness: 0.9,
  metalness: 0
});

function addLand(lat, lon, sx, sy, rot = 0) {
  const shape = new THREE.Mesh(
    new THREE.SphereGeometry(2.012, 24, 12, 0, Math.PI * sx, 0, Math.PI * sy),
    landMaterial
  );

  const phi = (90 - lat) * Math.PI / 180;
  const theta = (lon + 180) * Math.PI / 180;

  shape.position.set(
    -Math.sin(phi) * Math.cos(theta) * 0.01,
    Math.cos(phi) * 0.01,
    Math.sin(phi) * Math.sin(theta) * 0.01
  );

  shape.rotation.set(phi + rot, theta, rot);
  shape.scale.set(1.0, 0.55, 0.18);
  earthGroup.add(shape);
}

addLand(22, -30, 0.42, 0.36, 0.4);
addLand(5, 35, 0.36, 0.32, -0.2);
addLand(-20, 120, 0.3, 0.28, 0.8);
addLand(48, 75, 0.34, 0.24, 0.1);
addLand(-35, -65, 0.28, 0.33, -0.5);

const atmosphere = new THREE.Mesh(
  new THREE.SphereGeometry(2.08, 96, 96),
  new THREE.MeshBasicMaterial({
    color: 0x5ccfff,
    transparent: true,
    opacity: 0.12
  })
);
earthGroup.add(atmosphere);

const orbitGroup = new THREE.Group();
scene.add(orbitGroup);

const satellites = [];
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

const riskColours = {
  Low: 0x77f7d2,
  Medium: 0xffd166,
  High: 0xff6b6b
};

const riskWeights = ["Low", "Low", "Low", "Low", "Medium", "Medium", "High"];

function makeOrbit(radius, tiltX, tiltY, opacity) {
  const curve = new THREE.EllipseCurve(0, 0, radius, radius, 0, Math.PI * 2);
  const points = curve.getPoints(160);
  const geometry = new THREE.BufferGeometry().setFromPoints(
    points.map(p => new THREE.Vector3(p.x, 0, p.y))
  );

  const material = new THREE.LineBasicMaterial({
    color: 0x79dcff,
    transparent: true,
    opacity
  });

  const line = new THREE.LineLoop(geometry, material);
  line.rotation.x = tiltX;
  line.rotation.y = tiltY;
  orbitGroup.add(line);

  return line;
}

for (let i = 0; i < 64; i++) {
  const radius = 2.65 + Math.random() * 1.15;
  const tiltX = Math.random() * Math.PI;
  const tiltY = Math.random() * Math.PI;
  const speed = 0.22 + Math.random() * 0.45;
  const phase = Math.random() * Math.PI * 2;
  const risk = riskWeights[Math.floor(Math.random() * riskWeights.length)];
  const altitude = Math.round(410 + Math.random() * 340);

  makeOrbit(radius, tiltX, tiltY, 0.06);

  const satGeometry = new THREE.SphereGeometry(risk === "High" ? 0.055 : 0.043, 16, 16);
  const satMaterial = new THREE.MeshBasicMaterial({
    color: riskColours[risk]
  });

  const sat = new THREE.Mesh(satGeometry, satMaterial);

  const glow = new THREE.PointLight(riskColours[risk], risk === "High" ? 1.8 : 0.9, 1.8);
  sat.add(glow);

  sat.userData = {
    name: "LEO-SAT-" + String(i + 1).padStart(3, "0"),
    risk,
    altitude: altitude + " km",
    radius,
    tiltX,
    tiltY,
    speed,
    phase
  };

  satellites.push(sat);
  orbitGroup.add(sat);
}

function updateSatellitePosition(sat, t) {
  const data = sat.userData;
  const angle = data.phase + t * data.speed;

  const x = Math.cos(angle) * data.radius;
  const z = Math.sin(angle) * data.radius;
  const y = 0;

  const vector = new THREE.Vector3(x, y, z);

  vector.applyAxisAngle(new THREE.Vector3(1, 0, 0), data.tiltX);
  vector.applyAxisAngle(new THREE.Vector3(0, 1, 0), data.tiltY);

  sat.position.copy(vector);
}

function animate(time) {
  const t = time * 0.001;

  earthGroup.rotation.y += 0.0025;
  atmosphere.rotation.y -= 0.0015;
  orbitGroup.rotation.y += 0.0006;
  stars.rotation.y += 0.00015;

  satellites.forEach(sat => {
    updateSatellitePosition(sat, t);
    const pulse = 0.8 + Math.sin(t * 4 + sat.userData.phase) * 0.25;
    sat.scale.setScalar(pulse);
  });

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

requestAnimationFrame(animate);

function onPointerMove(event) {
  const rect = renderer.domElement.getBoundingClientRect();

  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  const hits = raycaster.intersectObjects(satellites);

  if (hits.length) {
    const sat = hits[0].object;
    const data = sat.userData;

    tooltip.style.display = "block";
    tooltip.style.left = event.clientX - rect.left + 18 + "px";
    tooltip.style.top = event.clientY - rect.top - 18 + "px";
    tooltip.innerHTML = `
      <strong>${data.name}</strong>
      Risk: ${data.risk}<br/>
      Altitude: ${data.altitude}
    `;
  } else {
    tooltip.style.display = "none";
  }
}

stage.addEventListener("pointermove", onPointerMove);
stage.addEventListener("pointerleave", () => {
  tooltip.style.display = "none";
});

function resize() {
  camera.aspect = stage.clientWidth / stage.clientHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(stage.clientWidth, stage.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
}

window.addEventListener("resize", resize);
EOF
