import { Canvas, useFrame } from '@react-three/fiber';
import { ContactShadows, Environment, OrbitControls, Float } from '@react-three/drei';
import { Suspense, useRef } from 'react';
import * as THREE from 'three';

type Props = { equipped?: string[]; decor?: string[]; mood?: number; wallColor?: string; floorColor?: string; onPetTap?: () => void; place?: 'room'|'garden'|'playroom'|'cafe'|'forest'|'lake'|'market'; visitor?: boolean };

function Bunny({ equipped = [], mood = 80, onPetTap, walking = false, offset = 0 }: { equipped?: string[]; mood?: number; onPetTap?: () => void; walking?: boolean; offset?: number }) {
  const root = useRef<THREE.Group>(null);
  const ears = useRef<THREE.Group>(null);
  const blink = useRef<THREE.Group>(null);
  const legs = useRef<THREE.Group>(null);
  const tapUntil = useRef(0);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (root.current) {
      root.current.position.y = -0.12 + Math.sin(t * (walking ? 10 : 2.1)) * (walking ? 0.075 : 0.035);
      root.current.position.x = offset + (walking ? Math.sin(t * 1.15) * 0.72 : 0);
      root.current.rotation.y = walking ? Math.cos(t * 1.15) * 0.22 : Math.sin(t * 0.45) * 0.10;
      if (legs.current) legs.current.children.forEach((leg, i) => { leg.rotation.x = walking ? Math.sin(t * 12 + i * Math.PI) * 0.55 : 0; });
      const reacting = performance.now() < tapUntil.current;
      const pulse = reacting ? 1 + Math.sin(t * 28) * 0.055 : 1;
      root.current.scale.set(pulse, reacting ? pulse * 1.035 : 1, pulse);
    }
    if (ears.current) ears.current.rotation.z = Math.sin(t * 1.7) * 0.035;
    if (blink.current) {
      const phase = t % 4.2;
      const scale = phase > 3.92 ? 0.12 : 1;
      blink.current.scale.y = THREE.MathUtils.lerp(blink.current.scale.y, scale, 0.45);
    }
  });
  const has = (id: string) => equipped.includes(id);
  return <group ref={root} position={[0, -0.12, 0]} onPointerDown={(e) => { e.stopPropagation(); tapUntil.current = performance.now() + 520; onPetTap?.(); }}>
    <Float speed={1.2} rotationIntensity={0.025} floatIntensity={0.12}>
      <mesh position={[0, .46, -.02]} scale={[1, .94, .9]} castShadow><sphereGeometry args={[.58, 40, 32]}/><meshStandardMaterial color="#fffaf3" roughness={.92}/></mesh>
      <mesh position={[0, .88, -.02]} castShadow><sphereGeometry args={[.16, 24, 20]}/><meshStandardMaterial color="#fffaf3"/></mesh>
      <mesh position={[0, 1.08, .12]} scale={[1, 1.02, .9]} castShadow><sphereGeometry args={[.43, 40, 32]}/><meshStandardMaterial color="#fffaf3" roughness={.86}/></mesh>
      <group ref={ears}>
        {[-.22,.22].map((x,i)=><group key={i} position={[x,1.48,.08]} rotation={[0,0,i===0?-.18:.18]}>
          <mesh castShadow><capsuleGeometry args={[.105,.62,8,20]}/><meshStandardMaterial color="#fffaf3"/></mesh>
          <mesh position={[0,0,.095]} scale={[.58,.82,.22]}><capsuleGeometry args={[.1,.57,8,20]}/><meshStandardMaterial color="#eeb7b8" roughness={.9}/></mesh>
        </group>)}
      </group>
      <group ref={blink} position={[0,0,0]}>
        {[-.16,.16].map(x=><group key={x} position={[x,1.12,.505]}><mesh><sphereGeometry args={[.052,20,16]}/><meshStandardMaterial color="#352c2a"/></mesh><mesh position={[-.012,.018,.04]}><sphereGeometry args={[.014,10,10]}/><meshBasicMaterial color="white"/></mesh></group>)}
      </group>
      <mesh position={[0,.98,.53]}><sphereGeometry args={[.043,16,12]}/><meshStandardMaterial color="#e99da4"/></mesh>
      <mesh position={[0,.91,.515]} rotation={[.1,0,0]}><torusGeometry args={[.035,.009,6,16,Math.PI]}/><meshStandardMaterial color="#9c7773"/></mesh>
      {[-.31,.31].map(x=><group key={x} position={[x,.08,.31]}><mesh scale={[1,.66,1.22]} castShadow><sphereGeometry args={[.19,24,18]}/><meshStandardMaterial color="#fffaf3"/></mesh><mesh position={[0,-.055,.145]} scale={[.5,.2,.12]}><sphereGeometry args={[.11,16,12]}/><meshStandardMaterial color="#edc0bd"/></mesh></group>)}
      <group ref={legs}>{[-.22,.22].map((x,i)=><mesh key={i} position={[x,.02,.02]} scale={[.72,1,.9]} castShadow><sphereGeometry args={[.13,18,14]}/><meshStandardMaterial color="#fffaf3"/></mesh>)}</group>
      <mesh position={[.49,.42,-.26]} castShadow><sphereGeometry args={[.17,24,18]}/><meshStandardMaterial color="#fffaf3"/></mesh>
      <mesh position={[-.38,1.02,.34]}><sphereGeometry args={[.075,18,14]}/><meshStandardMaterial color="#f4c7c4"/></mesh>
      {has('pink_bow') && <group position={[.24,1.39,.08]}><mesh position={[-.09,0,0]} rotation={[0,0,.35]} scale={[1,.72,.35]}><sphereGeometry args={[.14,20,16]}/><meshStandardMaterial color="#ed91a6"/></mesh><mesh position={[.09,0,0]} rotation={[0,0,-.35]} scale={[1,.72,.35]}><sphereGeometry args={[.14,20,16]}/><meshStandardMaterial color="#ed91a6"/></mesh><mesh><sphereGeometry args={[.065,16,12]}/><meshStandardMaterial color="#bd657f"/></mesh></group>}
      {has('flower_crown') && <group position={[0,1.43,.12]}>{Array.from({length:7},(_,i)=><mesh key={i} position={[Math.cos(i/7*Math.PI*2)*.3,.015,Math.sin(i/7*Math.PI*2)*.18]}><sphereGeometry args={[.07,12,10]}/><meshStandardMaterial color={i%2?'#f4b6c2':'#f5d98d'}/></mesh>)}</group>}
      {has('round_glasses') && <group position={[0,1.12,.53]}><mesh position={[-.16,0,0]}><torusGeometry args={[.105,.018,8,24]}/><meshStandardMaterial color="#8d6a48" metalness={.6}/></mesh><mesh position={[.16,0,0]}><torusGeometry args={[.105,.018,8,24]}/><meshStandardMaterial color="#8d6a48" metalness={.6}/></mesh><mesh><boxGeometry args={[.12,.025,.025]}/><meshStandardMaterial color="#8d6a48"/></mesh></group>}
      {has('blue_scarf') && <mesh position={[0,.72,.32]} rotation={[.15,0,0]}><torusGeometry args={[.27,.065,10,32]}/><meshStandardMaterial color="#8bb9d7"/></mesh>}
    </Float>
  </group>;
}
function Room({ decor = [], wallColor = '#f4e7dc', floorColor = '#e8d6c5', place = 'room' }: { decor?: string[]; wallColor?: string; floorColor?: string; place?: 'room'|'garden'|'playroom'|'cafe'|'forest'|'lake'|'market' }) {
  const outdoor = place === 'garden' || place === 'forest' || place === 'lake' || place === 'market';
  const outdoorGround = place === 'forest' ? '#78956f' : place === 'lake' ? '#8fc4cf' : place === 'market' ? '#d8ba92' : '#a9c99a';
  const themedFloor = place === 'playroom' ? '#e8dff1' : place === 'cafe' ? '#d8c3a9' : floorColor;
  return <>
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,-.08,0]} receiveShadow><planeGeometry args={[20,20]}/><meshStandardMaterial color={outdoor ? outdoorGround : themedFloor} roughness={1}/></mesh>
    {outdoor ? <><mesh position={[0,1.5,-3]}><planeGeometry args={[20,8]}/><meshStandardMaterial color={place==='forest'?'#b7d3c0':place==='market'?'#ead7bd':'#c7e4ef'}/></mesh>{place==='lake' && <mesh rotation={[-Math.PI/2,0,0]} position={[0,-.045,-1.8]}><planeGeometry args={[12,5]}/><meshStandardMaterial color="#6eafc1" roughness={.25} metalness={.08}/></mesh>}{(place==='lake'?[-3.5,3.5]:[-3,-2,2.7,3.5]).map((x,i)=><group key={x} position={[x,.1,-1.2-(i%2)*.7]}><mesh position={[0,.75,0]}><cylinderGeometry args={[.12,.18,1.5,10]}/><meshStandardMaterial color="#9a704e"/></mesh><mesh position={[0,1.55,0]}><sphereGeometry args={[.72,18,14]}/><meshStandardMaterial color={i%2?'#7eae79':'#8dbb83'}/></mesh></group>)}{[-1.7,1.8].map(x=><group key={x} position={[x,.02,1]}><mesh position={[0,.18,0]}><cylinderGeometry args={[.18,.2,.36,12]}/><meshStandardMaterial color="#e8a6a7"/></mesh><mesh position={[0,.42,0]}><sphereGeometry args={[.18,12,10]}/><meshStandardMaterial color="#f4c6cc"/></mesh></group>)}</> : <><mesh position={[0,1.5,-2.3]} receiveShadow><boxGeometry args={[7,3.2,.12]}/><meshStandardMaterial color={place==='playroom'?'#e8ddf5':place==='cafe'?'#ead9c1':(decor.includes('cloud_wallpaper') ? '#dceaf4' : wallColor)}/></mesh>
    <mesh position={[0,1.1,-2.22]}><boxGeometry args={[6.8,.035,.03]}/><meshStandardMaterial color="#e4cfc0"/></mesh>
    <mesh position={[-2.25,.65,-1.4]} castShadow><boxGeometry args={[1.15,1.2,.65]}/><meshStandardMaterial color="#d8b79d"/></mesh>
    <mesh position={[-2.25,1.28,-1.4]} castShadow><boxGeometry args={[1.28,.12,.72]}/><meshStandardMaterial color="#c89e82"/></mesh>
    <mesh position={[2.15,.42,-1.3]} castShadow><cylinderGeometry args={[.48,.48,.14,32]}/><meshStandardMaterial color="#dba9b0"/></mesh>
    <mesh position={[2.15,.52,-1.3]} castShadow><cylinderGeometry args={[.28,.28,.1,32]}/><meshStandardMaterial color="#f4d9d9"/></mesh>
    {decor.includes('soft_bed') && <group position={[-1.35,.02,.55]}><mesh position={[0,.12,0]} castShadow><boxGeometry args={[.95,.22,.68]}/><meshStandardMaterial color="#e9aeb8"/></mesh><mesh position={[0,.25,-.24]}><boxGeometry args={[.95,.22,.12]}/><meshStandardMaterial color="#f6d5d8"/></mesh></group>}
    {decor.includes('carrot_lamp') && <group position={[1.75,.02,.4]}><mesh position={[0,.55,0]}><cylinderGeometry args={[.23,.3,.55,24]}/><meshStandardMaterial color="#f0b65e" emissive="#d98c35" emissiveIntensity={.12}/></mesh><mesh position={[0,.84,0]}><coneGeometry args={[.3,.2,24]}/><meshStandardMaterial color="#f7d99b"/></mesh><pointLight position={[0,.6,0]} color="#ffd69a" intensity={.7} distance={2.5}/></group>}
    {decor.includes('tiny_plant') && <group position={[-2,.02,.3]}><mesh position={[0,.18,0]}><cylinderGeometry args={[.17,.22,.34,20]}/><meshStandardMaterial color="#d59c82"/></mesh>{[0,1,2].map(i=><mesh key={i} position={[(i-1)*.13,.48,0]} rotation={[0,0,(i-1)*.35]}><sphereGeometry args={[.16,16,12]}/><meshStandardMaterial color="#88aa83"/></mesh>)}</group>}
    {decor.includes('star_rug') && <mesh rotation={[-Math.PI/2,0,0]} position={[0,-.055,1.25]}><circleGeometry args={[1.05,48]}/><meshStandardMaterial color="#d9b7d4"/></mesh>}
    {decor.includes('bookshelf') && <group position={[2.6,.7,-1.9]}><mesh><boxGeometry args={[.65,1.35,.28]}/><meshStandardMaterial color="#bd9477"/></mesh>{[-.35,0,.35].map(y=><mesh key={y} position={[0,y,.16]}><boxGeometry args={[.58,.035,.32]}/><meshStandardMaterial color="#e7c6a7"/></mesh>)}</group>}
    {decor.includes('bunny_sofa') && <group position={[1.25,.02,.9]}><mesh position={[0,.22,0]} castShadow><boxGeometry args={[1.15,.38,.58]}/><meshStandardMaterial color="#d99da8"/></mesh><mesh position={[0,.48,-.2]} castShadow><boxGeometry args={[1.15,.48,.18]}/><meshStandardMaterial color="#e9b9bd"/></mesh>{[-.43,.43].map(x=><mesh key={x} position={[x,.35,0]}><boxGeometry args={[.18,.48,.6]}/><meshStandardMaterial color="#d99da8"/></mesh>)}</group>}
    {decor.includes('carrot_table') && <group position={[-1.7,.02,1.05]}><mesh position={[0,.38,0]} castShadow><cylinderGeometry args={[.42,.42,.12,24]}/><meshStandardMaterial color="#c99a73"/></mesh>{[-.25,.25].map(x=><mesh key={x} position={[x,.18,0]}><cylinderGeometry args={[.035,.035,.38,10]}/><meshStandardMaterial color="#a77b5d"/></mesh>)}</group>}
    {decor.includes('moon_mobile') && <group position={[0,2.15,-1.8]}><mesh><torusGeometry args={[.42,.018,8,32]}/><meshStandardMaterial color="#c9a6c8"/></mesh>{[-.32,0,.32].map((x,i)=><group key={i} position={[x,-.18,0]}><mesh><cylinderGeometry args={[.008,.008,.35,8]}/><meshStandardMaterial color="#c9a6c8"/></mesh><mesh position={[0,-.22,0]}><sphereGeometry args={[.09,16,12]}/><meshStandardMaterial color={i===1?'#f2d48c':'#e9c5d4'}/></mesh></group>)}</group>}
    {place==='playroom' && <group position={[0,.02,-1.2]}><mesh position={[0,.45,0]}><boxGeometry args={[1.4,.9,.25]}/><meshStandardMaterial color="#d5a5c7"/></mesh>{[-.45,0,.45].map((x,i)=><mesh key={x} position={[x,1.05,0]}><sphereGeometry args={[.22,18,14]}/><meshStandardMaterial color={i===0?'#f4c76c':i===1?'#9dc8dd':'#d99aa6'}/></mesh>)}</group>}
    {place==='cafe' && <group position={[0,.02,-1]}><mesh position={[0,.65,0]}><boxGeometry args={[2.2,.12,.65]}/><meshStandardMaterial color="#b98561"/></mesh>{[-.85,.85].map(x=><mesh key={x} position={[x,.32,0]}><cylinderGeometry args={[.06,.06,.62,12]}/><meshStandardMaterial color="#8c634b"/></mesh>)}<mesh position={[0,.76,.03]}><torusGeometry args={[.16,.035,8,24]}/><meshStandardMaterial color="#f1d6a4"/></mesh></group>}
    </>}
  </>;
}
export default function RabbitScene({ equipped = [], decor = [], mood = 80, wallColor, floorColor, onPetTap, place='room', visitor=false }: Props) {
  return <div className="scene"> 
    <Canvas shadows dpr={[1,1.6]} camera={{position:[0,2.35,5.2],fov:42}}>
      <color attach="background" args={['#f7eee5']}/><fog attach="fog" args={['#f7eee5',8,16]}/>
      <ambientLight intensity={1.1}/><directionalLight position={[3,6,4]} intensity={2.1} castShadow shadow-mapSize={1024}/>
      <Suspense fallback={null}><Room decor={decor} wallColor={wallColor} floorColor={floorColor} place={place}/><Bunny equipped={equipped} mood={mood} onPetTap={onPetTap} walking={place==='garden'}/>{visitor && <group position={[1.25,-.12,-.55]} scale={.72}><Bunny equipped={[]} mood={90} walking={false} offset={0}/></group>}<ContactShadows position={[0,-.065,0]} opacity={.32} scale={5} blur={2.5}/><Environment preset="apartment"/></Suspense>
      <OrbitControls enablePan={false} minDistance={3.5} maxDistance={7} minPolarAngle={.9} maxPolarAngle={1.65}/>
    </Canvas><div className="scene-hint">{place==='garden'?'Прогулка по саду · Плюша исследует полянку':place==='forest'?'Тихий лес · ищем редкие находки':place==='lake'?'Озеро · слушаем плеск воды':place==='market'?'Кроличья площадь · маленькие лавки':place==='playroom'?'Игровая комната · время веселиться':place==='cafe'?'Кроличье кафе · уютная встреча':'Потяни, чтобы осмотреть комнату · Плюша уже ожила ✨'}</div>
  </div>;
}
