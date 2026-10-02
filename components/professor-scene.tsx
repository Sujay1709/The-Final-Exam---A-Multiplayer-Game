"use client";
import { useEffect, useRef, useState } from "react";
import { RotateCcw, RotateCw } from "lucide-react";
import * as THREE from "three";

// Every shape is built locally; there are no remote models or textures.
export default function ProfessorScene({
  reducedMotion,
}: {
  reducedMotion: boolean;
}) {
  const container = useRef<HTMLDivElement>(null);
  const aim = useRef({ x: 0, y: 0 });
  const draw = useRef<(() => void) | null>(null);
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    const el = container.current;
    if (!el) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      setFailed(true);
      return;
    }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    el.appendChild(renderer.domElement);
    renderer.domElement.setAttribute("aria-hidden", "true");
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(33, 1, 0.1, 50);
    camera.position.set(0, 2.9, 9.5);
    camera.lookAt(0, 2.05, 0);
    scene.add(new THREE.HemisphereLight(0xffecd8, 0x252733, 2.6));
    const light = new THREE.DirectionalLight(0xffc898, 3);
    light.position.set(-4, 7, 5);
    scene.add(light);
    const rim = new THREE.DirectionalLight(0x92bad4, 2);
    rim.position.set(4, 4, -3);
    scene.add(rim);
    const mat = (color: string) => new THREE.MeshToonMaterial({ color });
    const coat = mat("#232733"),
      skin = mat("#d8ac8c"),
      hair = mat("#dce3e8"),
      dark = mat("#11131d"),
      orange = mat("#ff9b42"),
      white = mat("#f7f1e8");
    const mesh = (
      g: THREE.BufferGeometry,
      m: THREE.Material,
      parent: THREE.Object3D,
      x = 0,
      y = 0,
      z = 0,
    ) => {
      const o = new THREE.Mesh(g, m);
      o.position.set(x, y, z);
      parent.add(o);
      return o;
    };
    const box = (
      w: number,
      h: number,
      d: number,
      m: THREE.Material,
      p: THREE.Object3D,
      x = 0,
      y = 0,
      z = 0,
    ) => mesh(new THREE.BoxGeometry(w, h, d), m, p, x, y, z);
    const orb = (
      rad: number,
      m: THREE.Material,
      p: THREE.Object3D,
      x = 0,
      y = 0,
      z = 0,
    ) => mesh(new THREE.SphereGeometry(rad, 24, 16), m, p, x, y, z);
    const figure = new THREE.Group();
    scene.add(figure);
    const torso = new THREE.Group();
    torso.position.y = 2.2;
    figure.add(torso);
    mesh(
      new THREE.CylinderGeometry(0.46, 0.65, 1.8, 8),
      coat,
      torso,
      0,
      -0.12,
      0,
    );
    box(0.28, 1.25, 0.13, white, torso, 0, 0.1, 0.44);
    mesh(
      new THREE.ConeGeometry(0.09, 0.8, 4),
      orange,
      torso,
      0,
      0.15,
      0.55,
    ).rotation.z = Math.PI;
    [-1, 1].forEach((side) => {
      mesh(
        new THREE.CylinderGeometry(0.17, 0.15, 1.25, 10),
        dark,
        figure,
        side * 0.25,
        0.71,
        0,
      );
      box(0.36, 0.22, 0.62, dark, figure, side * 0.25, 0.13, 0.13);
      const lapel = box(0.22, 0.66, 0.12, coat, torso, side * 0.25, 0.3, 0.49);
      lapel.rotation.z = side * -0.23;
    });
    const head = new THREE.Group();
    head.position.set(0, 1.1, 0);
    torso.add(head);
    mesh(
      new THREE.CylinderGeometry(0.13, 0.14, 0.3, 12),
      skin,
      head,
      0,
      -0.17,
      0,
    );
    const face = orb(0.42, skin, head, 0, 0.3, 0);
    face.scale.set(0.82, 1.12, 0.85);
    [-1, 1].forEach((side) => {
      orb(0.09, skin, head, side * 0.34, 0.3, 0);
      const glasses = mesh(
        new THREE.TorusGeometry(0.18, 0.027, 8, 32),
        dark,
        head,
        side * 0.19,
        0.37,
        0.32,
      );
      glasses.rotation.y = side * 0.1;
      orb(0.035, dark, head, side * 0.17, 0.36, 0.36);
      box(0.22, 0.055, 0.025, hair, head, side * 0.18, 0.59, 0.3).rotation.z =
        side * 0.18;
    });
    box(0.09, 0.024, 0.03, dark, head, 0, 0.37, 0.35);
    mesh(
      new THREE.ConeGeometry(0.068, 0.18, 10),
      skin,
      head,
      0,
      0.22,
      0.4,
    ).rotation.x = Math.PI / 2;
    box(0.16, 0.022, 0.03, dark, head, 0, 0.1, 0.33);
    const cap = orb(0.43, hair, head, 0, 0.65, -0.06);
    cap.scale.y = 0.65;
    for (let i = 0; i < 13; i++) {
      const angle = (i * Math.PI * 2) / 13;
      const spike = mesh(
        new THREE.ConeGeometry(0.13, 0.48, 5),
        hair,
        head,
        Math.cos(angle) * 0.33,
        0.69 + Math.sin(angle) * 0.14,
        Math.sin(angle) * 0.27 - 0.08,
      );
      spike.rotation.z = -Math.cos(angle) * 0.95;
      spike.rotation.x = Math.sin(angle) * 0.65;
    }
    const arms: THREE.Group[] = [];
    [-1, 1].forEach((side) => {
      const arm = new THREE.Group();
      arm.position.set(side * 0.47, 0.55, 0);
      torso.add(arm);
      arms.push(arm);
      arm.rotation.z = side * 0.13;
      mesh(
        new THREE.CylinderGeometry(0.16, 0.12, 0.74, 10),
        coat,
        arm,
        0,
        -0.36,
        0,
      );
      const forearm = new THREE.Group();
      forearm.position.set(0, -0.7, 0);
      arm.add(forearm);
      forearm.rotation.x = -0.5;
      mesh(
        new THREE.CylinderGeometry(0.12, 0.1, 0.6, 10),
        coat,
        forearm,
        0,
        -0.26,
        0,
      );
      orb(0.125, skin, forearm, 0, -0.58, 0);
      if (side === -1) {
        const book = new THREE.Group();
        book.position.set(0.02, -0.55, 0.16);
        forearm.add(book);
        book.rotation.x = -0.3;
        box(0.48, 0.66, 0.12, orange, book);
        box(0.4, 0.57, 0.13, white, book, 0, 0, 0.02);
        box(0.06, 0.66, 0.15, dark, book, -0.22, 0, 0);
      }
    });
    // A small laboratory plinth, desk, glowing flask, and chalkboard complete the silhouette.
    mesh(
      new THREE.CylinderGeometry(1.15, 1.2, 0.09, 48),
      mat("#36303a"),
      scene,
      0,
      -0.03,
      0,
    );
    box(0.65, 0.09, 0.55, coat, scene, 1.05, 1.25, -0.3);
    [-0.23, 0.23].forEach((x) =>
      box(0.07, 1.25, 0.07, dark, scene, 1.05 + x, 0.62, -0.3),
    );
    orb(0.16, orange, scene, 1.05, 1.48, -0.3);
    mesh(
      new THREE.CylinderGeometry(0.045, 0.045, 0.22, 12),
      white,
      scene,
      1.05,
      1.65,
      -0.3,
    );
    const board = box(
      1.15,
      0.8,
      0.1,
      mat("#233333"),
      scene,
      -1.15,
      2.25,
      -0.65,
    );
    board.rotation.y = 0.2;
    for (let i = 0; i < 3; i++)
      box(0.65 - i * 0.13, 0.025, 0.02, white, board, 0, 0.2 - i * 0.2, 0.06);
    let frame = 0,
      visible = true,
      stopped = false;
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    let osReduced = motion.matches;
    const render = () => {
      if (stopped) return;
      const reduced = reducedMotion || osReduced;
      const x = aim.current.x,
        y = aim.current.y;
      figure.rotation.y = reduced
        ? x * 0.45
        : THREE.MathUtils.lerp(figure.rotation.y, x * 0.45, 0.12);
      head.rotation.y = reduced
        ? x * 0.28
        : THREE.MathUtils.lerp(head.rotation.y, x * 0.28, 0.12);
      head.rotation.x = reduced
        ? y * 0.12
        : THREE.MathUtils.lerp(head.rotation.x, y * 0.12, 0.12);
      torso.rotation.z = reduced
        ? 0
        : Math.sin(performance.now() / 2300) * 0.012;
      arms[1].rotation.x = reduced
        ? 0
        : Math.sin(performance.now() / 1600) * 0.07;
      renderer.render(scene, camera);
    };
    const loop = () => {
      frame = 0;
      if (!visible || document.hidden || stopped) return;
      render();
      if (!reducedMotion && !osReduced) frame = requestAnimationFrame(loop);
    };
    const restart = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      if (visible && !document.hidden) loop();
    };
    draw.current = restart;
    const resize = new ResizeObserver(() => {
      const w = el.clientWidth,
        h = el.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      restart();
    });
    resize.observe(el);
    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      restart();
    });
    intersection.observe(el);
    const onMotion = () => {
      osReduced = motion.matches;
      restart();
    };
    motion.addEventListener("change", onMotion);
    document.addEventListener("visibilitychange", restart);
    const onLost = (e: Event) => {
      e.preventDefault();
      setFailed(true);
    };
    renderer.domElement.addEventListener("webglcontextlost", onLost);
    setLoaded(true);
    restart();
    return () => {
      stopped = true;
      cancelAnimationFrame(frame);
      draw.current = null;
      resize.disconnect();
      intersection.disconnect();
      motion.removeEventListener("change", onMotion);
      document.removeEventListener("visibilitychange", restart);
      renderer.domElement.removeEventListener("webglcontextlost", onLost);
      const geometries = new Set<THREE.BufferGeometry>(),
        materials = new Set<THREE.Material>();
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          geometries.add(o.geometry);
          (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) =>
            materials.add(m),
          );
        }
      });
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }, [reducedMotion]);
  function point(e: React.PointerEvent) {
    if (e.pointerType !== "mouse" && e.buttons !== 1) return;
    const rect = e.currentTarget.getBoundingClientRect();
    aim.current = {
      x: Math.max(
        -1,
        Math.min(1, ((e.clientX - rect.left) / rect.width) * 2 - 1),
      ),
      y: Math.max(
        -1,
        Math.min(1, ((e.clientY - rect.top) / rect.height) * 2 - 1),
      ),
    };
    draw.current?.();
  }
  function rotate(x: number) {
    aim.current = { x: Math.max(-1, Math.min(1, aim.current.x + x)), y: 0 };
    draw.current?.();
  }
  return (
    <>
      {(!loaded || failed) && (
        <img
          className="voss-fallback"
          src="/professor.png"
          alt="Professor Elias Voss in his laboratory"
        />
      )}
      <div
        ref={container}
        className={`voss-canvas ${failed ? "hidden-scene" : ""}`}
        role="img"
        aria-label="Original full-body 3D Professor Voss, holding his notebook beside laboratory equipment"
        onPointerMove={point}
        onPointerDown={(e) => {
          aim.current.x = aim.current.x > 0.3 ? -0.45 : 0.45;
          draw.current?.();
        }}
      />
      <div className="voss-controls">
        <button
          type="button"
          onClick={() => rotate(-0.3)}
          aria-label="Rotate professor left"
        >
          <RotateCcw size={18} />
        </button>
        <span>{failed ? "Portrait mode" : "Meet Voss · drag or tap"}</span>
        <button
          type="button"
          onClick={() => rotate(0.3)}
          aria-label="Rotate professor right"
        >
          <RotateCw size={18} />
        </button>
        <button
          type="button"
          onClick={() => {
            aim.current = { x: 0, y: 0 };
            draw.current?.();
          }}
        >
          Reset
        </button>
      </div>
    </>
  );
}
