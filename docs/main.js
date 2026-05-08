cat > src/main.js <<'EOF'
import "./style.css";
import * as THREE from "three";

const canvas = document.getElementById("scene");
const tooltip = document.getElementById("tooltip");

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x020713, 0.035);

const camera = new THREE.PerspectiveCamera(
  38,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

camera.position.set(0.7, 1.1, 8.6);

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: true,
});

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const ambient = new THREE.AmbientLight(0xffffff, 1.1);
scene.add(ambient);

const sun = new THREE.DirectionalLight(0xffffff, 4);
sun.position.set(6, 3, 5);
scene.add(sun);

const blueRim = new THREE.PointLight(0x4fc3ff, 8, 18);
blueRim.position.set(-4, 2.4, 3);
scene.add(blueRim);

function createStars() {
  const geometry = new THREE.BufferGeometry();
  const vertices = [];

  for (let i = 0; i < 1800; i++) {
    vertices.push(
      (Math.random() - 0.5) * 70,
      (Math.random() - 0.5) * 70,
      (Math.random() - 0.5) * 70
    );
  }

  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));

  const material = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.025,
    transparent: true,
    opacity: 0.8,
  });

  const stars = new THREE.Points(geometry, material);
  scene.add(stars);
  return stars;
}

const stars = createStars();

const earthGroup = new THREE.Group();
earthGroup.position.set(1.3, 0, 0);
scene.add(earthGroup);

const loader = new THREE.TextureLoader();

const earthTexture = loader.load(
  "https://threejs.org/examples/textures/land_ocean_ice_cloud_2048.jpg"
);

const earth = new THREE.Mesh(
  new THREE.SphereGeometry(2.05, 96, 96),
  new THREE.MeshStandardMaterial({
    map: earthTexture,
    roughness: 0.85,
    metalness: 0.02,
  })
);

earthGroup.add(earth);

const atmosphere = new THREE.Mesh(
  new THREE.SphereGeometry(2.16, 96, 96),
  new THREE.MeshBasicMaterial({
    color: 0x4fc3ff,
    transparent: true,
    opacity: 0.11,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
  })
);

earthGroup.add(atmosphere);

const orbitGroup = new THREE.Group();
earthGroup.add(orbitGroup);

const satellites = [];
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

const risks = [
  { label: "Low", colour: 0x77f7d2 },
  { label: "Low", colour: 0x77f7d2 },
  { label: "Medium", colour: 0xffd166 },
  { label: "High", colour: 0xff6b6b },
];

function createOrbit(radius, tilt, opacity) {
  const curve = new THREE.EllipseCurve(0, 0, radius, radius, 0, Math.PI * 2);
  const points = curve.getPoints(180);

  const geometry = new THREE.BufferGeometry().setFromPoints(
    points.map((p) => new THREE.Vector3(p.x, 0, p.y))
  );

  const material = new THREE.LineBasicMaterial({
    color: 0x7ee7ff,
    transparent: true,
    opacity,
  });

  const line = new THREE.LineLoop(geometry, material);
  line.rotation.x = tilt.x;
  line.rotation.y = tilt.y;
  line.rotation.z = tilt.z;

  orbitGroup.add(line);
}

for (let i = 0; i < 18; i++) {
  const radius = 2.75 + Math.random() * 0.9;

  const tilt = {
    x: THREE.MathUtils.degToRad(-65 + Math.random() * 130),
    y: THREE.MathUtils.degToRad(-20 + Math.random() * 40),
    z: THREE.MathUtils.degToRad(Math.random() * 180),
  };

  createOrbit(radius, tilt, 0.08);

  const risk = risks[Math.floor(Math.random() * risks.length)];

  const sat = new THREE.Mesh(
    new THREE.SphereGeometry(risk.label === "High" ? 0.06 : 0.045, 18, 18),
    new THREE.MeshBasicMaterial({ color: risk.colour })
  );

  sat.add(new THREE.PointLight(risk.colour, risk.label === "High" ? 2.2 : 1.1, 1.8));

  sat.userData = {
    name: "LEO-SAT-" + String(i + 1).padStart(3, "0"),
    risk: risk.label,
    altitude: Math.round(420 + Math.random() * 340) + " km",
    radius,
    tilt,
    phase: Math.random() * Math.PI * 2,
    speed: 0.2 + Math.random() * 0.35,
  };

  satellites.push(sat);
  orbitGroup.add(sat);
}

function setSatellitePosition(sat, t) {
  const d = sat.userData;
  const angle = d.phase + t * d.speed;

  const v = new THREE.Vector3(
    Math.cos(angle) * d.radius,
    0,
    Math.sin(angle) * d.radius
  );

  v.applyEuler(new THREE.Euler(d.tilt.x, d.tilt.y, d.tilt.z));
  sat.position.copy(v);
}

function animate(now) {
  const t = now * 0.001;

  stars.rotation.y += 0.00012;
  earth.rotation.y += 0.0018;
  atmosphere.rotation.y -= 0.001;
  earthGroup.rotation.y = Math.sin(t * 0.12) * 0.12;
  earthGroup.rotation.x = Math.sin(t * 0.08) * 0.04;

  satellites.forEach((sat) => {
    setSatellitePosition(sat, t);
    const pulse = 1 + Math.sin(t * 5 + sat.userData.phase) * 0.18;
    sat.scale.setScalar(pulse);
  });

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

requestAnimationFrame(animate);

window.addEventListener("pointermove", (event) => {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  const hits = raycaster.intersectObjects(satellites);

  if (hits.length) {
    const d = hits[0].object.userData;
    tooltip.style.display = "block";
    tooltip.style.left = event.clientX + 18 + "px";
    tooltip.style.top = event.clientY - 18 + "px";
    tooltip.innerHTML = `
      <strong>${d.name}</strong>
      Risk: ${d.risk}<br/>
      Altitude: ${d.altitude}
    `;
  } else {
    tooltip.style.display = "none";
  }
});

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});
EOF
