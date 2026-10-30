const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('desktop', {
  store(action, data, id) {
    const result = ipcRenderer.sendSync('save-store', action, data, id);
    if (result.error) { const error=new Error(result.error); error.code=result.code; throw error; }
    return result.value;
  },
  online:async(action,data)=>{const r=await ipcRenderer.invoke('biome-online',action,data);if(r.error)throw new Error(r.error);return r.value;},
  friends:async(action,data)=>{const r=await ipcRenderer.invoke('biome-friends',action,data);if(r.error)throw new Error(r.error);return r.value;},
  skin:(action,data)=>ipcRenderer.invoke('biome-skin',action,data),
  account: async (action,value) => {const result=await ipcRenderer.invoke('biome-account',action,value);if(result.error)throw new Error(result.error);return result.value;},
  chunks: (action,data,id) => ipcRenderer.invoke('chunk-store-async',action,data,id),
  action: action => ipcRenderer.invoke('desktop-action', action)
});
