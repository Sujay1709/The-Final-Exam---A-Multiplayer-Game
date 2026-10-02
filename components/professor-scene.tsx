"use client";
import { useEffect, useRef, useState } from "react";
import { RotateCcw, RotateCw } from "lucide-react";
import * as THREE from "three";

// Every shape is built locally; there are no remote models or textures.
export default function ProfessorScene({ reducedMotion }: { reducedMotion: boolean }) {
  const container = useRef<HTMLDivElement>(null);
  const aim = useRef({ x: 0, y: 0 });
  const draw = useRef<(() => void) | null>(null);
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    const el = container.current;
    if (!el) return;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); }
    catch { setFailed(true); return; }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    el.appendChild(renderer.domElement);
    renderer.domElement.setAttribute("aria-hidden", "true");
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(33, 1, .1, 50);
    camera.position.set(0, 2.9, 9.5); camera.lookAt(0, 2.05, 0);
    scene.add(new THREE.HemisphereLight(0xffecd8, 0x252733, 2.6));
    const light = new THREE.DirectionalLight(0xffc898, 3); light.position.set(-4, 7, 5); scene.add(light);
    const rim = new THREE.DirectionalLight(0x92bad4, 2); rim.position.set(4, 4, -3); scene.add(rim);
    const mat = (color: string) => new THREE.MeshToonMaterial({ color });
    const coat = mat("#232733"), skin = mat("#d8ac8c"), hair = mat("#dce3e8"), dark = mat("#11131d"), orange = mat("#ff9b42"), white = mat("#f7f1e8");
    const mesh = (g: THREE.BufferGeometry, m: THREE.Material, parent: THREE.Object3D, x=0, y=0, z=0) => {
      const o = new THREE.Mesh(g, m); o.position.set(x,y,z); parent.add(o); return o;
    };
    const box = (w:number,h:number,d:number,m:THREE.Material,p:THREE.Object3D,x=0,y=0,z=0) => mesh(new THREE.BoxGeometry(w,h,d),m,p,x,y,z);
    const orb = (rad:number,m:THREE.Material,p:THREE.Object3D,x=0,y=0,z=0) => mesh(new THREE.SphereGeometry(rad,24,16),m,p,x,y,z);
    const figure = new THREE.Group(); scene.add(figure);
    const torso = new THREE.Group(); torso.position.y=2.2; figure.add(torso);
    mesh(new THREE.CylinderGeometry(.46,.65,1.8,8),coat,torso,0,-.12,0);
    box(.28,1.25,.13,white,torso,0,.1,.44);
    mesh(new THREE.ConeGeometry(.09,.8,4),orange,torso,0,.15,.55).rotation.z=Math.PI;
    [-1,1].forEach(side => {
      mesh(new THREE.CylinderGeometry(.17,.15,1.25,10),dark,figure,side*.25,.71,0);
      box(.36,.22,.62,dark,figure,side*.25,.13,.13);
      const lapel=box(.22,.66,.12,coat,torso,side*.25,.3,.49); lapel.rotation.z=side*-.23;
    });
    const head = new THREE.Group(); head.position.set(0,1.1,0); torso.add(head);
    mesh(new THREE.CylinderGeometry(.13,.14,.3,12),skin,head,0,-.17,0);
    const face=orb(.42,skin,head,0,.3,0); face.scale.set(.82,1.12,.85);
    [-1,1].forEach(side => {
      orb(.09,skin,head,side*.34,.3,0);
      const glasses=mesh(new THREE.TorusGeometry(.18,.027,8,32),dark,head,side*.19,.37,.32);
      glasses.rotation.y=side*.1;
      orb(.035,dark,head,side*.17,.36,.36);
      box(.22,.055,.025,hair,head,side*.18,.59,.3).rotation.z=side*.18;
    });
    box(.09,.024,.03,dark,head,0,.37,.35);
    mesh(new THREE.ConeGeometry(.068,.18,10),skin,head,0,.22,.4).rotation.x=Math.PI/2;
    box(.16,.022,.03,dark,head,0,.1,.33);
    const cap=orb(.43,hair,head,0,.65,-.06); cap.scale.y=.65;
    for(let i=0;i<13;i++) {
      const angle=i*Math.PI*2/13;
      const spike=mesh(new THREE.ConeGeometry(.13,.48,5),hair,head,Math.cos(angle)*.33,.69+Math.sin(angle)*.14,Math.sin(angle)*.27-.08);
      spike.rotation.z=-Math.cos(angle)*.95; spike.rotation.x=Math.sin(angle)*.65;
    }
    const arms: THREE.Group[]=[];
    [-1,1].forEach(side => {
      const arm=new THREE.Group(); arm.position.set(side*.47,.55,0); torso.add(arm); arms.push(arm);
      arm.rotation.z=side*.13;
      mesh(new THREE.CylinderGeometry(.16,.12,.74,10),coat,arm,0,-.36,0);
      const forearm=new THREE.Group(); forearm.position.set(0,-.7,0); arm.add(forearm); forearm.rotation.x=-.5;
      mesh(new THREE.CylinderGeometry(.12,.1,.6,10),coat,forearm,0,-.26,0);
      orb(.125,skin,forearm,0,-.58,0);
      if(side===-1) {
        const book=new THREE.Group(); book.position.set(.02,-.55,.16); forearm.add(book); book.rotation.x=-.3;
        box(.48,.66,.12,orange,book); box(.4,.57,.13,white,book,0,0,.02);
        box(.06,.66,.15,dark,book,-.22,0,0);
      }
    });
    // A small laboratory plinth, desk, glowing flask, and chalkboard complete the silhouette.
    mesh(new THREE.CylinderGeometry(1.15,1.2,.09,48),mat("#36303a"),scene,0,-.03,0);
    box(.65,.09,.55,coat,scene,1.05,1.25,-.3);
    [-.23,.23].forEach(x=>box(.07,1.25,.07,dark,scene,1.05+x,.62,-.3));
    orb(.16,orange,scene,1.05,1.48,-.3);
    mesh(new THREE.CylinderGeometry(.045,.045,.22,12),white,scene,1.05,1.65,-.3);
    const board=box(1.15,.8,.1,mat("#233333"),scene,-1.15,2.25,-.65); board.rotation.y=.2;
    for(let i=0;i<3;i++) box(.65-i*.13,.025,.02,white,board,0,.2-i*.2,.06);
    let frame=0, visible=true, stopped=false;
    const motion=matchMedia("(prefers-reduced-motion: reduce)");
    let osReduced=motion.matches;
    const render=() => {
      if(stopped) return;
      const reduced=reducedMotion || osReduced;
      const x=aim.current.x, y=aim.current.y;
      figure.rotation.y=reduced?x*.45:THREE.MathUtils.lerp(figure.rotation.y,x*.45,.12);
      head.rotation.y=reduced?x*.28:THREE.MathUtils.lerp(head.rotation.y,x*.28,.12);
      head.rotation.x=reduced?y*.12:THREE.MathUtils.lerp(head.rotation.x,y*.12,.12);
      torso.rotation.z=reduced?0:Math.sin(performance.now()/2300)*.012;
      arms[1].rotation.x=reduced?0:Math.sin(performance.now()/1600)*.07;
      renderer.render(scene,camera);
    };
    const loop=()=> { frame=0; if(!visible || document.hidden || stopped) return; render(); if(!reducedMotion&&!osReduced) frame=requestAnimationFrame(loop); };
    const restart=()=>{cancelAnimationFrame(frame); frame=0; if(visible&&!document.hidden) loop();};
    draw.current=restart;
    const resize=new ResizeObserver(()=>{
      const w=el.clientWidth,h=el.clientHeight;
      if(!w||!h)return;
      renderer.setSize(w,h,false); camera.aspect=w/h; camera.updateProjectionMatrix(); restart();
    }); resize.observe(el);
    const intersection=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;restart();}); intersection.observe(el);
    const onMotion=()=>{osReduced=motion.matches;restart();}; motion.addEventListener("change",onMotion);
    document.addEventListener("visibilitychange",restart);
    const onLost=(e:Event)=>{e.preventDefault();setFailed(true);}; renderer.domElement.addEventListener("webglcontextlost",onLost);
    setLoaded(true); restart();
    return ()=>{
      stopped=true; cancelAnimationFrame(frame); draw.current=null;
      resize.disconnect(); intersection.disconnect(); motion.removeEventListener("change",onMotion);
      document.removeEventListener("visibilitychange",restart); renderer.domElement.removeEventListener("webglcontextlost",onLost);
      const geometries=new Set<THREE.BufferGeometry>(), materials=new Set<THREE.Material>();
      scene.traverse(o=>{if(o instanceof THREE.Mesh){geometries.add(o.geometry); (Array.isArray(o.material)?o.material:[o.material]).forEach(m=>materials.add(m));}});
      geometries.forEach(g=>g.dispose()); materials.forEach(m=>m.dispose()); renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove();
    };
  },[reducedMotion]);
  function point(e:React.PointerEvent) {
    if(e.pointerType!=="mouse"&&e.buttons!==1)return;
    const rect=e.currentTarget.getBoundingClientRect();
    aim.current={x:Math.max(-1,Math.min(1,(e.clientX-rect.left)/rect.width*2-1)), y:Math.max(-1,Math.min(1,(e.clientY-rect.top)/rect.height*2-1))};
    draw.current?.();
  }
  function rotate(x:number){aim.current={x:Math.max(-1,Math.min(1,aim.current.x+x)),y:0};draw.current?.();}
  return <>
    {(!loaded||failed)&&<img className="voss-fallback" src="/professor.png" alt="Professor Elias Voss in his laboratory" />}
    <div ref={container} className={`voss-canvas ${failed?"hidden-scene":""}`} role="img" aria-label="Original full-body 3D Professor Voss, holding his notebook beside laboratory equipment" onPointerMove={point} onPointerDown={e=>{aim.current.x=aim.current.x>.3?-.45:.45;draw.current?.();}} />
    <div className="voss-controls"><button type="button" onClick={()=>rotate(-.3)} aria-label="Rotate professor left"><RotateCcw size={18}/></button><span>{failed?"Portrait mode":"Meet Voss · drag or tap"}</span><button type="button" onClick={()=>rotate(.3)} aria-label="Rotate professor right"><RotateCw size={18}/></button><button type="button" onClick={()=>{aim.current={x:0,y:0};draw.current?.();}}>Reset</button></div>
  </>;
}
