import React,{useEffect,useRef,useState} from 'react';
import * as THREE from 'three';
import {PlayerAvatar} from '../game/player/PlayerAvatar';
import {defaultSkin,loadSkinTexture,normalizeSkin,savedSkin,saveSkin} from '../game/player/Skins';
function SkinPreview({data,rotation}:{data:string|null;rotation:number}){
 const element=useRef<HTMLDivElement>(null),turn=useRef(rotation);turn.current=rotation;
 useEffect(()=>{
  const host=element.current!;const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(35,1,.1,20);camera.position.set(0,1.1,4.3);camera.lookAt(0,.9,0);
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));host.appendChild(renderer.domElement);
  scene.add(new THREE.HemisphereLight(0xfff6db,0x718579,2.6));const light=new THREE.DirectionalLight(0xffffff,2);light.position.set(-2,4,3);scene.add(light);
  let avatar:PlayerAvatar|null=null,disposed=false,frame=0;
  loadSkinTexture(data).catch(()=>loadSkinTexture()).then(texture=>{if(disposed){texture.dispose();return;}avatar=new PlayerAvatar(texture);scene.add(avatar.root);});
  const resize=()=>{const w=host.clientWidth,h=host.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();};
  const observer=new ResizeObserver(resize);observer.observe(host);resize();
  const draw=()=>{frame=requestAnimationFrame(draw);if(avatar)avatar.root.rotation.y=turn.current;renderer.render(scene,camera);};draw();
  return()=>{disposed=true;cancelAnimationFrame(frame);observer.disconnect();avatar?.dispose();renderer.dispose();renderer.domElement.remove();};
 },[data]);
 return <div className="skin-preview" ref={element} aria-label="Character preview"/>;
}
export function CharacterPanel(){
 const [template]=useState(()=>defaultSkin().toDataURL('image/png'));
 const [open,setOpen]=useState(false),[data,setData]=useState<string|null>(null),[rotation,setRotation]=useState(.3),[error,setError]=useState(''),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true);
 useEffect(()=>{let active=true;savedSkin().then(value=>{if(active)setData(value);}).catch(()=>{if(active)setError('Could not read your saved skin.');}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[]);
 const apply=async(file?:File)=>{setBusy(true);setError('');try{const value=file?await normalizeSkin(file):null;await saveSkin(value);setData(value);}catch(e){setError(e instanceof Error?e.message:'Could not save skin.');}finally{setBusy(false);}};
 return <><button onClick={()=>setOpen(true)}>Character</button>{open && <div className="pause-backdrop"><section className="pause-panel character-panel" role="dialog" aria-modal="true" aria-labelledby="character-title"><div><p className="menu-eyebrow">Biome</p><h1 id="character-title">Your character</h1><div className="menu-rule"/><p>Make yourself at home.</p><SkinPreview data={data} rotation={rotation}/><label className="rotation-label">Rotate character<input type="range" min={-Math.PI} max={Math.PI} step={.02} value={rotation} onChange={e=>setRotation(Number(e.target.value))}/></label></div><div className="character-options"><p>Import a 128 x 128 PNG skin. Modern 64 x 64 skins are also supported and scaled without smoothing.</p><label className="skin-import">Choose skin<input aria-label="Choose skin" type="file" accept="image/png,.png" disabled={busy||loading} onChange={e=>{const file=e.target.files?.[0];e.target.value='';if(file)void apply(file);}}/></label><p className="account-note">Your skin is saved on this computer and appears in third-person view. Outer clothing and hat layers are supported.</p><nav className="menu-actions"><a download="Biome-skin-template.png" href={template}>Download skin template</a><button disabled={busy||loading} onClick={()=>void apply()}>Use default skin</button><button disabled={busy} onClick={()=>setOpen(false)}>Done</button></nav>{busy && <p>Saving skin…</p>}{error && <p role="alert" className="world-error">{error}</p>}</div></section></div>}</>;
}
