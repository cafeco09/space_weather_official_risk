import "./style.css";
import * as THREE from "three";

const canvas = document.getElementById("scene");

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.1, 1000);
camera.position.z = 7;

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));

scene.add(new THREE.AmbientLight(0xffffff, 1.2));

const light = new THREE.DirectionalLight(0xffffff, 3);
light.position.set(5, 3, 5);
scene.add(light);

const loader = new THREE.TextureLoader();
const earthTexture = loader.load("https://threejs.org/examples/textures/land_ocean_ice_cloud_2048.jpg");

const earth = new THREE.Mesh(
  new THREE.SphereGeometry(2, 96, 96),
  new THREE.MeshStandardMaterial({ map: earthTexture })
);
scene.add(earth);

const atmosphere = new THREE.Mesh(
  new THREE.SphereGeometry(2.12, 96, 96),
  new THREE.MeshBasicMaterial({
    color: 0x4fc3ff,
    transparent: true,
    opacity: 0.15,
    side: THREE.BackSide
  })
);
scene.add(atmosphere);

const starsGeo = new THREE.BufferGeometry();
const stars = [];

for (let i = 0; i < 1500; i++) {
  stars.push((Math.random() - 0.5) * 70);
  stars.push((Math.random() - 0.5) * 70);
  stars.push((Math.random() - 0.5) * 70);
}

starsGeo.setAttribute("position", new THREE.Float32BufferAttribute(stars, 3));

const starField = new THREE.Points(
  starsGeo,
  new THREE.PointsMaterial({ color: 0xffffff, size: 0.025 })
);
scene.add(starField);

const satellites = [];
const colours = [0x77f7d2, 0xffd166, 0xff6b6b];

for (let i = 0; i < 18; i++) {
  const sat = new THREE.Mesh(
    new THREE.SphereGeometry(0.045, 16, 16),
    new THREE.MeshBasicMaterial({ color: colours[i % colours.length] })
  );

  sat.userData = {
    radius: 2.7 + Math.random() * 0.9,
    speed: 0.25 + Math.random() * 0.4,
    phase: Math.random() * Math.PI * 2,
    tilt: Math.random() * Math.PI
  };

  satellites.push(sat);
  scene.add(sat);
}

function animate(time) {
  const t = time * 0.001;

  earth.rotation.y += 0.002;
  atmosphere.rotation.y -= 0.001;
  starField.rotation.y += 0.0001;

  satellites.forEach((sat) => {
    const d = sat.userData;
    const a = d.phase + t * d.speed;

    sat.position.set(
      Math.cos(a) * d.radius,
      Math.sin(a + d.tilt) * 0.8,
      Math.sin(a) * d.radius
    );

    sat.scale.setScalar(1 + Math.sin(t * 5 + d.phase) * 0.25);
  });

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

animate();

addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
