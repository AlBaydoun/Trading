"use client";

import * as React from "react";
import * as THREE from "three";

/**
 * =============================================================================
 * CAPITAL GLOBE
 * =============================================================================
 * A hand-written WebGL scene — no scene-graph wrapper library — so the whole
 * thing is ~40KB of three.js core plus four small shaders instead of a React
 * renderer and a helper pack.
 *
 * What it depicts: a sphere of market nodes, a wireframe lattice, a rim of
 * atmosphere, and arcs of capital moving between nodes. Every arc carries a
 * travelling pulse whose phase is seeded per-arc, so the motion never looks
 * like a loop.
 *
 * Behaviour it must get right:
 *   · Never render while off-screen (IntersectionObserver pauses the RAF loop)
 *   · Never render while the tab is hidden
 *   · Honour `prefers-reduced-motion` — draws one static frame and stops
 *   · Degrade to a CSS gradient when WebGL is unavailable
 *   · Release every GPU resource on unmount
 * =============================================================================
 */

const GLOBE_RADIUS = 1.0;
const NODE_COUNT = 3800;
const DUST_COUNT = 900;
const ARC_COUNT = 26;
const ARC_SEGMENTS = 56;

const COLOR_DEEP = "#2f55c9";
const COLOR_BRAND = "#5b8cff";
const COLOR_MINT = "#00e5b0";
const COLOR_VIOLET = "#8b5cf6";

function srgb(hex: string): THREE.Color {
  return new THREE.Color(hex).convertSRGBToLinear();
}

/** Evenly distributes points on a sphere — no clustering at the poles. */
function fibonacciSphere(count: number, radius: number): Float32Array {
  const positions = new Float32Array(count * 3);
  const golden = Math.PI * (3 - Math.sqrt(5));

  for (let i = 0; i < count; i += 1) {
    const y = 1 - (i / (count - 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = golden * i;

    positions[i * 3] = Math.cos(theta) * r * radius;
    positions[i * 3 + 1] = y * radius;
    positions[i * 3 + 2] = Math.sin(theta) * r * radius;
  }

  return positions;
}

function supportsWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext("webgl2") || canvas.getContext("webgl")),
    );
  } catch {
    return false;
  }
}

/* -------------------------------------------------------------------------- */
/* Shaders                                                                     */
/* -------------------------------------------------------------------------- */

const NODE_VERT = /* glsl */ `
  uniform float uTime;
  uniform float uSize;
  uniform float uPixelRatio;

  attribute float aScale;
  attribute float aPhase;

  varying float vShimmer;
  varying vec3 vNormalDir;

  void main() {
    vNormalDir = normalize(position);

    // Nodes breathe outward very slightly, out of phase with each other, so
    // the surface reads as alive rather than as a rigid mesh.
    float pulse = sin(uTime * 0.7 + aPhase * 6.2831853);
    vec3 displaced = position * (1.0 + pulse * 0.014);

    vec4 mvPosition = modelViewMatrix * vec4(displaced, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    gl_PointSize = uSize * aScale * uPixelRatio * (260.0 / -mvPosition.z);

    vShimmer = pulse * 0.5 + 0.5;
  }
`;

const NODE_FRAG = /* glsl */ `
  uniform vec3 uColorLow;
  uniform vec3 uColorHigh;
  uniform vec3 uColorAccent;

  varying float vShimmer;
  varying vec3 vNormalDir;

  void main() {
    // Round out the square point sprite and feather the edge.
    vec2 uv = gl_PointCoord - 0.5;
    float dist = length(uv);
    if (dist > 0.5) discard;
    float alpha = smoothstep(0.5, 0.04, dist);

    float latitude = vNormalDir.y * 0.5 + 0.5;
    vec3 color = mix(uColorLow, uColorHigh, latitude);
    color = mix(color, uColorAccent, smoothstep(0.62, 1.0, vShimmer));

    gl_FragColor = vec4(color, alpha * (0.30 + vShimmer * 0.70));
  }
`;

const ARC_VERT = /* glsl */ `
  attribute float aT;
  varying float vT;

  void main() {
    vT = aT;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const ARC_FRAG = /* glsl */ `
  uniform float uTime;
  uniform float uSeed;
  uniform float uSpeed;
  uniform vec3 uColor;

  varying float vT;

  void main() {
    // A single bright head travelling from origin to destination, wrapped so
    // it re-enters at the start without a visible jump.
    float head = fract(uTime * uSpeed + uSeed);
    float delta = vT - head;
    delta -= floor(delta + 0.5);

    float pulse = smoothstep(0.14, 0.0, abs(delta));
    // Fade both ends so arcs melt into the globe instead of stopping dead.
    float ends = smoothstep(0.0, 0.12, vT) * smoothstep(1.0, 0.88, vT);

    float alpha = (0.055 + pulse * 0.85) * ends;
    gl_FragColor = vec4(uColor + pulse * 0.35, alpha);
  }
`;

const ATMOSPHERE_VERT = /* glsl */ `
  varying vec3 vNormalView;

  void main() {
    vNormalView = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const ATMOSPHERE_FRAG = /* glsl */ `
  uniform vec3 uColor;
  varying vec3 vNormalView;

  void main() {
    // Rendered on the back faces: the rim is where the surface turns away
    // from the camera, which is exactly where the fresnel term peaks.
    float fresnel = pow(1.0 - abs(dot(vNormalView, vec3(0.0, 0.0, 1.0))), 3.2);
    gl_FragColor = vec4(uColor, fresnel * 0.55);
  }
`;

/* -------------------------------------------------------------------------- */

export interface CapitalGlobeProps {
  className?: string;
  /** Multiplies the auto-rotation speed. 0 stops it. */
  speed?: number;
}

export function CapitalGlobe({ className, speed = 1 }: CapitalGlobeProps) {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const [failed, setFailed] = React.useState(false);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (!supportsWebGL()) {
      setFailed(true);
      return;
    }

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      });
    } catch {
      setFailed(true);
      return;
    }

    const parent = canvas.parentElement!;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(0, 0, 3.35);

    // The whole scene lives under one group so parallax and tilt are a single
    // transform rather than something each object has to know about.
    const world = new THREE.Group();
    world.rotation.z = -0.22;
    scene.add(world);

    const disposables: { dispose(): void }[] = [];

    /* --- Nodes ------------------------------------------------------------ */

    const nodeGeometry = new THREE.BufferGeometry();
    const nodePositions = fibonacciSphere(NODE_COUNT, GLOBE_RADIUS);
    const scales = new Float32Array(NODE_COUNT);
    const phases = new Float32Array(NODE_COUNT);

    for (let i = 0; i < NODE_COUNT; i += 1) {
      // A few large "hub" nodes among many small ones reads as a market:
      // most participants small, a handful dominant.
      scales[i] = Math.random() < 0.06 ? 2.6 + Math.random() * 2.2 : 0.55 + Math.random() * 0.75;
      phases[i] = Math.random();
    }

    nodeGeometry.setAttribute("position", new THREE.BufferAttribute(nodePositions, 3));
    nodeGeometry.setAttribute("aScale", new THREE.BufferAttribute(scales, 1));
    nodeGeometry.setAttribute("aPhase", new THREE.BufferAttribute(phases, 1));

    const nodeMaterial = new THREE.ShaderMaterial({
      vertexShader: NODE_VERT,
      fragmentShader: NODE_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uSize: { value: 5.5 },
        uPixelRatio: { value: 1 },
        uColorLow: { value: srgb(COLOR_DEEP) },
        uColorHigh: { value: srgb(COLOR_BRAND) },
        uColorAccent: { value: srgb(COLOR_MINT) },
      },
    });

    const nodes = new THREE.Points(nodeGeometry, nodeMaterial);
    world.add(nodes);
    disposables.push(nodeGeometry, nodeMaterial);

    /* --- Wireframe lattice ------------------------------------------------ */

    const latticeSource = new THREE.IcosahedronGeometry(GLOBE_RADIUS * 0.995, 2);
    const latticeGeometry = new THREE.WireframeGeometry(latticeSource);
    const latticeMaterial = new THREE.LineBasicMaterial({
      color: srgb(COLOR_BRAND),
      transparent: true,
      opacity: 0.085,
      depthWrite: false,
    });
    const lattice = new THREE.LineSegments(latticeGeometry, latticeMaterial);
    world.add(lattice);
    latticeSource.dispose();
    disposables.push(latticeGeometry, latticeMaterial);

    /* --- Atmosphere ------------------------------------------------------- */

    const atmosphereGeometry = new THREE.SphereGeometry(GLOBE_RADIUS * 1.16, 64, 64);
    const atmosphereMaterial = new THREE.ShaderMaterial({
      vertexShader: ATMOSPHERE_VERT,
      fragmentShader: ATMOSPHERE_FRAG,
      uniforms: { uColor: { value: srgb(COLOR_BRAND) } },
      transparent: true,
      side: THREE.BackSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    world.add(new THREE.Mesh(atmosphereGeometry, atmosphereMaterial));
    disposables.push(atmosphereGeometry, atmosphereMaterial);

    /* --- Capital arcs ----------------------------------------------------- */

    const arcMaterials: THREE.ShaderMaterial[] = [];
    const arcPalette = [srgb(COLOR_MINT), srgb(COLOR_BRAND), srgb(COLOR_VIOLET)];

    for (let i = 0; i < ARC_COUNT; i += 1) {
      const from = randomSurfacePoint();
      const to = randomSurfacePoint();

      // Skip near-antipodal pairs — their control point sits at the origin and
      // the resulting curve cuts through the globe.
      if (from.dot(to) < -0.72) continue;

      const mid = from.clone().add(to).multiplyScalar(0.5);
      const lift = 1 + from.distanceTo(to) * 0.42;
      mid.normalize().multiplyScalar(GLOBE_RADIUS * lift);

      const curve = new THREE.QuadraticBezierCurve3(from, mid, to);
      const points = curve.getPoints(ARC_SEGMENTS);

      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const ts = new Float32Array(points.length);
      for (let p = 0; p < points.length; p += 1) ts[p] = p / (points.length - 1);
      geometry.setAttribute("aT", new THREE.BufferAttribute(ts, 1));

      const material = new THREE.ShaderMaterial({
        vertexShader: ARC_VERT,
        fragmentShader: ARC_FRAG,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uTime: { value: 0 },
          uSeed: { value: Math.random() },
          uSpeed: { value: 0.09 + Math.random() * 0.13 },
          uColor: { value: arcPalette[i % arcPalette.length] },
        },
      });

      world.add(new THREE.Line(geometry, material));
      arcMaterials.push(material);
      disposables.push(geometry, material);
    }

    function randomSurfacePoint(): THREE.Vector3 {
      const theta = Math.random() * Math.PI * 2;
      // Weighted toward the equator, where the visible surface actually is.
      const phi = Math.acos(2 * Math.random() - 1) * 0.82 + 0.17;
      return new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta),
        Math.cos(phi),
        Math.sin(phi) * Math.sin(theta),
      ).multiplyScalar(GLOBE_RADIUS);
    }

    /* --- Dust ------------------------------------------------------------- */

    const dustGeometry = new THREE.BufferGeometry();
    const dustPositions = new Float32Array(DUST_COUNT * 3);
    const dustScales = new Float32Array(DUST_COUNT);
    const dustPhases = new Float32Array(DUST_COUNT);

    for (let i = 0; i < DUST_COUNT; i += 1) {
      const radius = 1.7 + Math.random() * 2.6;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      dustPositions[i * 3] = Math.sin(phi) * Math.cos(theta) * radius;
      dustPositions[i * 3 + 1] = Math.cos(phi) * radius * 0.62;
      dustPositions[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * radius;
      dustScales[i] = 0.3 + Math.random() * 0.6;
      dustPhases[i] = Math.random();
    }

    dustGeometry.setAttribute("position", new THREE.BufferAttribute(dustPositions, 3));
    dustGeometry.setAttribute("aScale", new THREE.BufferAttribute(dustScales, 1));
    dustGeometry.setAttribute("aPhase", new THREE.BufferAttribute(dustPhases, 1));

    const dustMaterial = new THREE.ShaderMaterial({
      vertexShader: NODE_VERT,
      fragmentShader: NODE_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uSize: { value: 3.2 },
        uPixelRatio: { value: 1 },
        uColorLow: { value: srgb("#1e3a8a") },
        uColorHigh: { value: srgb(COLOR_BRAND) },
        uColorAccent: { value: srgb(COLOR_VIOLET) },
      },
    });

    const dust = new THREE.Points(dustGeometry, dustMaterial);
    scene.add(dust);
    disposables.push(dustGeometry, dustMaterial);

    /* --- Sizing ----------------------------------------------------------- */

    function resize() {
      const { clientWidth, clientHeight } = parent;
      if (clientWidth === 0 || clientHeight === 0) return;

      // Cap DPR at 2: beyond that the extra pixels cost real frame time and
      // buy nothing the eye can see on a soft, additive scene like this.
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      renderer.setPixelRatio(dpr);
      renderer.setSize(clientWidth, clientHeight, false);

      camera.aspect = clientWidth / clientHeight;
      // Pull the camera back on narrow screens so the globe still fits.
      camera.position.z = clientWidth < 640 ? 4.3 : clientWidth < 1024 ? 3.8 : 3.35;
      camera.updateProjectionMatrix();

      nodeMaterial.uniforms.uPixelRatio.value = dpr;
      dustMaterial.uniforms.uPixelRatio.value = dpr;
    }

    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(parent);

    /* --- Input ------------------------------------------------------------ */

    const pointer = { x: 0, y: 0 };
    const smoothed = { x: 0, y: 0 };

    function onPointerMove(event: PointerEvent) {
      pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
      pointer.y = (event.clientY / window.innerHeight) * 2 - 1;
    }

    if (!reducedMotion) {
      window.addEventListener("pointermove", onPointerMove, { passive: true });
    }

    /* --- Loop ------------------------------------------------------------- */

    const clock = new THREE.Clock();
    let frame = 0;
    let visible = true;
    let running = true;

    const intersectionObserver = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible && running && !reducedMotion && frame === 0) {
          clock.getDelta(); // discard the time spent paused
          frame = requestAnimationFrame(tick);
        }
      },
      { threshold: 0 },
    );
    intersectionObserver.observe(parent);

    function onVisibilityChange() {
      running = !document.hidden;
      if (running && visible && !reducedMotion && frame === 0) {
        clock.getDelta();
        frame = requestAnimationFrame(tick);
      }
    }
    document.addEventListener("visibilitychange", onVisibilityChange);

    function render(elapsed: number) {
      nodeMaterial.uniforms.uTime.value = elapsed;
      dustMaterial.uniforms.uTime.value = elapsed;
      for (const material of arcMaterials) {
        material.uniforms.uTime.value = elapsed;
      }
      renderer.render(scene, camera);
    }

    function tick() {
      if (!visible || !running) {
        frame = 0;
        return;
      }

      const delta = Math.min(clock.getDelta(), 0.05);
      const elapsed = clock.getElapsedTime();

      world.rotation.y += delta * 0.075 * speed;
      dust.rotation.y -= delta * 0.012 * speed;

      // Ease toward the pointer rather than tracking it — an exponential
      // follow at ~2.2/s feels responsive without any jitter.
      const ease = 1 - Math.exp(-2.2 * delta);
      smoothed.x += (pointer.x - smoothed.x) * ease;
      smoothed.y += (pointer.y - smoothed.y) * ease;

      world.rotation.x = smoothed.y * 0.16;
      world.position.x = smoothed.x * 0.09;

      render(elapsed);
      frame = requestAnimationFrame(tick);
    }

    if (reducedMotion) {
      // One frame, then nothing moves. The composition still reads.
      render(1.2);
    } else {
      frame = requestAnimationFrame(tick);
    }

    /* --- Teardown --------------------------------------------------------- */

    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pointermove", onPointerMove);
      for (const item of disposables) item.dispose();
      renderer.dispose();
    };
  }, [speed]);

  if (failed) {
    return (
      <div
        className={className}
        aria-hidden="true"
        // A calm radial wash stands in when WebGL is unavailable, so the hero
        // still has depth instead of a hole where the canvas would be.
        style={{
          background:
            "radial-gradient(circle at 50% 45%, rgba(91,140,255,0.30) 0%, rgba(139,92,246,0.16) 32%, rgba(0,229,176,0.06) 55%, transparent 72%)",
        }}
      />
    );
  }

  return (
    <canvas
      ref={canvasRef}
      className={className}
      aria-hidden="true"
      role="presentation"
    />
  );
}

export default CapitalGlobe;
