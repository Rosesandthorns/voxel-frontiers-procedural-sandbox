import type {ItemDef} from '../../types';
const cache=new Map<string,string>();
/** Hand-drawn pixel silhouettes, rendered from a 16px grid at 32px. No external assets. */
export function pixelItemIcon(item:Pick<ItemDef,'id'|'name'|'type'|'blockId'>){
 const key=`${item.id}:${item.blockId??''}`;if(cache.has(key))return cache.get(key)!;
 const pixels=new Map<string,string>();let hash=0;for(const ch of item.id)hash=(Math.imul(hash,31)+ch.charCodeAt(0))|0;const seed=Math.abs(hash),palette=['#bda672','#9cbea1','#b087a4','#b9b9a4','#bb9571','#8eacb6'];const base=palette[seed%palette.length],dark='#34302b',wood='#906641',light='#e0cda0';
 const put=(x:number,y:number,c:string)=>{if(x>=0&&x<16&&y>=0&&y<16)pixels.set(`${x},${y}`,c);};
 const rect=(x:number,y:number,w:number,h:number,c:string)=>{for(let dy=0;dy<h;dy++)for(let dx=0;dx<w;dx++)put(x+dx,y+dy,c);};
 const shape=(rows:string[],colors:Record<string,string>,ox=0,oy=0)=>rows.forEach((row,y)=>[...row].forEach((p,x)=>{if(colors[p])put(ox+x,oy+y,colors[p]);}));
 const id=item.id.toLowerCase();
 if(/boat/.test(id)){
  shape(['......wwww......','...wwwllllwww...','.wwllllllllllww.','wllllllllllllllw','.wbbwwwwwwwwbbw.','..wbbbbbbbbbbw..','...wwwwwwwwww...'],{w:dark,l:'#ba945e',b:wood},0,6);rect(1,2,1,7,wood);rect(0,1,3,3,light);rect(14,3,1,6,wood);rect(13,2,3,3,light);
 }else if(/chest|cache/.test(id)){
  rect(2,4,12,10,dark);rect(3,3,10,2,wood);rect(3,5,10,7,'#a9804e');rect(3,7,10,1,dark);rect(7,7,3,4,'#d6bd75');rect(8,8,1,2,dark);rect(4,4,7,1,light);rect(3,12,10,1,'#714d32');
 }else if(/drying_rack/.test(id)){
  rect(2,2,2,13,wood);rect(12,2,2,13,wood);rect(1,2,14,2,light);rect(4,5,8,1,dark);rect(5,6,6,5,'#a87556');rect(6,11,4,2,'#81543d');put(5,6,light);put(10,6,light);
 }else if(/cauldron/.test(id)){
  rect(2,5,12,7,dark);rect(3,6,10,5,'#65736e');rect(3,3,10,3,'#89928a');rect(4,4,8,2,'#252e2d');rect(4,12,2,2,dark);rect(10,12,2,2,dark);rect(4,7,1,3,'#a5afa3');
 }else if(/hide|leather/.test(id)){
  shape(['..aa....aa..','.aaabbbbaaa.','..abbbbbba..','...bbbbbb...','..bbbbbbbb..','.abbbbbbbba.','aa.bbbbbb.aa','....bbbb....','...aa..aa...'],{a:dark,b:/leather/.test(id)?'#ae784d':'#c5a27a'},2,3);rect(5,5,2,5,'#ddbd8c');
 }else if(/vinegar|bucket/.test(id)){
  rect(5,1,6,2,wood);rect(6,3,4,3,light);rect(4,6,8,8,dark);rect(5,7,6,6,/water/.test(id)?'#619fbc':'#bca26b');rect(5,7,1,5,'#e1d6a8');rect(6,9,4,2,'#ddd2ad');
 }else if(/jerky/.test(id)){
  for(let i=0;i<3;i++){rect(3+i*4,3+i%2,3,10,dark);rect(4+i*4,4+i%2,1,8,'#985e3d');put(4+i*4,7,light);}
 }else if(/chalk/.test(id)){
  const colors:Record<string,string>={red:'#c75b50',blue:'#7296d2',yellow:'#e7cb67',green:'#85ab6d',black:'#51515d',pink:'#d99bb1',purple:'#aa89be',orange:'#dca160',cyan:'#79c5c8',brown:'#a0805d',gray:'#9a9b9a'};const c=colors[id.split('_').at(-1)??'']??'#eee8d7';for(let y=3;y<14;y++){const x=3+Math.floor((13-y)/2);rect(x,y,4,1,dark);rect(x+1,y,2,1,c);}rect(7,2,4,2,c);
 }else if(/raw_|cooked_|meat|beef|pork|mutton|fish/.test(id)){
  shape(['....aaaaaa....','..aabbbbbbaa..','.abbbbbbbbbba.','abbbbbbbbbbbba','abbbbccbbbbbbb','abbbccccbbbbba','.abbbccbbbbaa.','..aabbbbbaaa..','....aaaaa.....'],{a:dark,b:id.startsWith('cooked_')?'#a36a44':'#c37877',c:'#e3c6a3'},1,4);rect(3,5,3,1,id.startsWith('cooked_')?'#c38b58':'#e8a29c');
 }else if(/seed|grain/.test(id)){
  for(let i=0;i<6;i++){const x=3+(i*5+seed)%9,y=4+(i*3)%9;rect(x,y,2,3,dark);rect(x,y,1,2,'#d2b56a');}
 }else if(item.type==='food'){
  const green=/leaf|cabbage|lettuce|kelp|seaweed/.test(id),root=/carrot|root|potato|turnip/.test(id);const color=green?'#7aab58':root?'#cc9854':/berry|apple|fruit/.test(id)?'#c35e54':base;
  shape(['...aaaaaa...','..abbbbbba..','.abbbbbbbba.','abbbbbbbbbba','abbbbbbbbbba','abbbbbbbbbba','.abbbbbbbba.','..aabbbbaa..','....aaaa....'],{a:dark,b:color},2,5);rect(5,6,2,3,green?'#a8c375':'#dfa77b');rect(7,2,2,3,wood);rect(9,2,3,2,'#709657');
 }else if(item.type==='tool'||item.type==='weapon'||/head|blade|mold/.test(id)){
  for(let i=0;i<10;i++)rect(3+i,13-i,2,2,wood);const metal=/iron|steel/.test(id)?'#b5c6cb':/gold/.test(id)?'#d4b65e':/stone/.test(id)?'#a5a39a':/wood/.test(id)?'#b58e5c':base;rect(6,2,8,3,dark);rect(7,2,6,2,metal);rect(12,4,2,3,metal);put(6,4,light);
 }else if(/ingot|ore|iron|gold|copper|flint|shard|crystal/.test(id)){
  shape(['.....aaaa.....','...aabbbbaa...','..abbbbcbbba..','.abbbbcbbbbba.','abbbbcbbbbbbba','.abbbbbbbbbba.','..aaaaaaaaaa..'],{a:dark,b:/gold/.test(id)?'#d9bc61':/iron/.test(id)?'#a8bcc2':base,c:light},1,4);
 }else if(item.blockId!==undefined){
  // Isometric pixel cube used until the world's texture atlas is ready.
  for(let y=0;y<5;y++)for(let x=0;x<12;x++){const px=2+x,py=2+y;if(x>=5-y&&x<=6+y)put(px,py,light);}rect(2,7,6,6,base);rect(8,7,6,6,wood);for(let y=0;y<6;y++){put(2,7+y,dark);put(13,7+y,dark);}rect(4,13,8,1,dark);
 }else{
  shape(['.....aa.....','...aabbaa...','..abbbcba...','.abbbcccba..','abbbccbbbba.','.abbbbb bba.'.replace(' ',''),'..abbbbbaa..','...aaaaa....'],{a:dark,b:base,c:light},2,4);rect(4,12,8,2,wood);
 }
 const rects=[...pixels].map(([xy,c])=>{const [x,y]=xy.split(',');return `<rect x="${x}" y="${y}" width="1" height="1" fill="${c}"/>`;}).join('');
 const url='data:image/svg+xml,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 16 16" shape-rendering="crispEdges">${rects}</svg>`);cache.set(key,url);return url;
}
