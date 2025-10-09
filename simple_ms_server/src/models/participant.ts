import { EnhancedEventEmitter } from "mediasoup/extras";

class Participant {
  id: string;
  socketId: string;
  name: string;

  constructor(id: string, name: string, socketId: string) {
    this.id = id;
    this.name = name;
    this.socketId = socketId;
  }
}

export default Participant;
