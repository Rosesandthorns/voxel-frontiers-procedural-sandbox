import * as THREE from 'three';
export function defaultSkin():HTMLCanvasElement {
 const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
 const ctx=canvas.getContext('2d')!;ctx.scale(2,2);
 const rect=(x:number,y:number,w:number,h:number,color:string)=>{ctx.fillStyle=color;ctx.fillRect(x,y,w,h);};
 rect(0,0,32,16,'#bc8b67');rect(0,0,32,8,'#47372b');rect(8,8,8,3,'#47372b');
 rect(9,12,2,1,'#243b38');rect(13,12,2,1,'#243b38');rect(11,14,2,1,'#80513c');
 rect(16,16,24,16,'#536b54');rect(20,20,8,2,'#bdab7c');rect(23,22,2,8,'#354839');
 for(const [x,y] of [[40,16],[32,48]]){rect(x,y,16,16,'#bc8b67');rect(x,y,16,8,'#536b54');}
 for(const [x,y] of [[0,16],[16,48]]){rect(x,y,16,16,'#4c5049');rect(x,y+13,16,3,'#362f29');}
 return canvas;
}
export async function normalizeSkin(file:File):Promise<string>{
 if(file.size>1024*1024)throw new Error('Choose a PNG smaller than 1 MB.');
 const bytes=new Uint8Array(await file.arrayBuffer());
 if(bytes.length<24 || ![137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v))throw new Error('Choose a PNG skin.');
 const view=new DataView(bytes.buffer),width=view.getUint32(16),height=view.getUint32(20);
 if(width!==height || ![64,128].includes(width))throw new Error('Use a 128 x 128 skin, or a modern 64 x 64 skin.');
 const bitmap=await createImageBitmap(file);
 try{
  const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
  const ctx=canvas.getContext('2d')!;ctx.imageSmoothingEnabled=false;ctx.drawImage(bitmap,0,0,128,128);
  return canvas.toDataURL('image/png');
 }finally{bitmap.close();}
}
export async function loadSkinTexture(data?:string|null):Promise<THREE.Texture>{
 const texture=data?await new THREE.TextureLoader().loadAsync(data):new THREE.CanvasTexture(defaultSkin());
 texture.colorSpace=THREE.SRGBColorSpace;texture.magFilter=THREE.NearestFilter;texture.minFilter=THREE.NearestFilter;
 texture.generateMipmaps=false;return texture;
}
export async function savedSkin():Promise<string|null>{
 return window.desktop?.skin ? window.desktop.skin('read') : localStorage.getItem('biome-skin');
}
export async function saveSkin(data:string|null){
 if(window.desktop?.skin)await window.desktop.skin(data?'write':'reset',data??undefined);
 else if(data)localStorage.setItem('biome-skin',data);else localStorage.removeItem('biome-skin');
}
