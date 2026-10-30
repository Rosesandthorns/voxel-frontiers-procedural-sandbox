export function saveErrorMessage(error: unknown): string {
 const text=error instanceof Error ? error.message : String(error);
 const code=(error as {code?:string})?.code;
 if(code==='ENOSPC'||/ENOSPC|disk.*full/i.test(text))return 'Storage is full. Free some space, then retry.';
 if(/QuotaExceededError|quota.*exceed/i.test(text)|| (error as {name?:string})?.name==='QuotaExceededError')return 'Browser storage is full. Use the desktop app for larger worlds.';
 if(code==='EACCES'||code==='EPERM'||/EACCES|EPERM/.test(text))return 'The save folder is not writable, or a save file is locked. Check access and retry.';
 if(code==='EBUSY'||/EBUSY|resource busy/.test(text))return 'A save file is busy. Saving will retry automatically.';
 if(code==='EISDIR'||/EISDIR/.test(text))return 'A folder is blocking a save file. Check the saves folder and retry.';
 if(/ENOENT/.test(text))return 'A save file or folder could not be found. Retry saving.';
 return text.replace(/^Error invoking remote method '[^']+': (?:Error: )?/, '').slice(0,240) || 'The save could not be written. Retry saving.';
}
