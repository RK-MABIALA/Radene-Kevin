declare module 'ws' {
  import { EventEmitter } from 'events';

  export class WebSocket extends EventEmitter {
    static Server: any;
    static createWebSocketStream: any;
    static WebSocketServer: any;
    [key: string]: any;
  }

  export default WebSocket;
}
