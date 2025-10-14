import { Socket } from "socket.io-client";

class MediasoupClient extends EventTarget {
  constructor(socketClient: Socket, config: any) {
    super();
  }
}
