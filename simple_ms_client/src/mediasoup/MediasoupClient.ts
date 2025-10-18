import { Socket } from "socket.io-client";
import { SocketClientController } from "../controller/SocketClientController";

class MediasoupClient extends EventTarget {
  constructor(socketClient: SocketClientController, config: any) {
    super();
  }
}

export default MediasoupClient;
