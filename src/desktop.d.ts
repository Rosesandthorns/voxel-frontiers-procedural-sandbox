export {};
declare global {
  interface Window {
    desktop?: {
      online(action:string,data?:any):Promise<any>;
      friends(action:'list'|'request'|'accept'|'remove'|'invite',data?:string):Promise<any>;
      skin(action: 'read'|'write'|'reset', data?:string):Promise<string|null>;
      account(action: 'status' | 'login' | 'claim' | 'signout' | 'cancel', value?: string): Promise<{id:string;username:string|null}|null>;
      store(action: 'read' | 'write' | 'clear' | 'list' | 'chunkRead' | 'chunkWrite' | 'chunkList', data?: string, id?: string): string | boolean | null;
      chunks?(action: 'read' | 'write', data: unknown, id: string): Promise<any>;
      action(action: 'quit' | 'saves' | 'fullscreen'): Promise<void>;
    };
  }
}
