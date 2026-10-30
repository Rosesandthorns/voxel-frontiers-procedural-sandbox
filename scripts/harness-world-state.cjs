const online=require('../desktop/online.cjs');
if(process.env.BIOME_TEST_ONLINE==='1')online.createOnline=()=>({command:async action=>action==='status'?{mode:'host',players:[]}:action==='poll'?[]:undefined,close(){}});
require('../desktop/main.cjs');
