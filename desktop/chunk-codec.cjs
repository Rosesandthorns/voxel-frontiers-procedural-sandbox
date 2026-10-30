function encodeRuns(values) {
 const runs=[];
 for(let i=0;i<values.length;){const value=values[i];let end=i+1;while(end<values.length&&values[end]===value)end++;runs.push(end-i,value);i=end;}
 return runs;
}
function decodeRuns(runs, Type, size=40960) {
 const result=new Type(size);let offset=0;
 if(!Array.isArray(runs)||runs.length%2)throw new Error('Invalid chunk runs');
 for(let i=0;i<runs.length;i+=2){const count=runs[i],value=runs[i+1];if(!Number.isInteger(count)||count<=0||offset+count>size||!Number.isInteger(value)||value<0||value>(Type===Uint8Array?255:65535))throw new Error('Invalid chunk run');result.fill(value,offset,offset+count);offset+=count;}
 if(offset!==size)throw new Error('Incomplete chunk');return result;
}
module.exports={encodeRuns,decodeRuns};

function unpackSnapshot(value){if(![1,2].includes(value.format))throw new Error('Unsupported chunk');const height=value.format===1?160:value.height;if(!Number.isSafeInteger(height)||height<16||height%16||height>65536)throw new Error('Invalid dense height');const {blocks,water,sections,...header}=value;return {...header,height,voxels:decodeRuns(blocks,Uint16Array,height*256),waterValues:decodeRuns(water,Uint8Array,height*256),sections:(sections??[]).map(s=>{if(!Number.isSafeInteger(s.y)||s.y<height/16)throw new Error('Invalid section');return {y:s.y,blocks:decodeRuns(s.blocks,Uint16Array,4096),water:decodeRuns(s.water,Uint8Array,4096)};})};}
function packPayload(value){let last=value.voxels.length-1;while(last>=0&&!value.voxels[last]&&!value.waterValues[last])last--;const height=Math.max(16,Math.ceil((Math.floor(last/256)+1)/16)*16);const {voxels,waterValues,sections,...header}=value;return {...header,format:2,height,blocks:encodeRuns(voxels.subarray(0,height*256)),water:encodeRuns(waterValues.subarray(0,height*256)),sections:(sections??[]).map(s=>({y:s.y,blocks:encodeRuns(s.blocks),water:encodeRuns(s.water)}))};}
module.exports.unpackSnapshot=unpackSnapshot;module.exports.packPayload=packPayload;
