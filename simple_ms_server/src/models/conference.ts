import { EnhancedEventEmitter } from "mediasoup/extras";
import { ParticipantsMap, participantsMapToArray } from "../types";
import Participant from "./participant";
import * as mediasoup from "mediasoup";

class Conference {
  private name: string;
  private participants: ParticipantsMap;
  private conferenceId: string;
  private router: mediasoup.types.Router | null = null;
  private socketIds: string[] = [];
  private worker: mediasoup.types.Worker;

  constructor(
    name: string,
    participants: ParticipantsMap,
    conferenceId: string,
    worker: mediasoup.types.Worker
  ) {
    this.name = name;
    this.participants = participants;
    this.conferenceId = conferenceId;
    this.worker = worker;
  }
  addParticipant(participant: Participant) {
    this.participants.set(participant.id, participant);
    this.socketIds.push(participant.socketId);
  }
  removeParticipant(participantId: string) {
    this.participants.delete(participantId);
  }
  removeWithSocketId(socketId: string) {
    for (const [participantId, participant] of this.participants) {
      if (participant.socketId === socketId) {
        this.participants.delete(participantId);
      }
    }
  }
  getParticipants(): Participant[] {
    return participantsMapToArray(this.participants);
  }
  getParticipant(participantId: string): Participant | undefined {
    return this.participants.get(participantId);
  }
  getName(): string {
    return this.name;
  }
  getConferenceId(): string {
    return this.conferenceId;
  }
  createParticipant(
    participantId: string,
    participantName: string,
    socketId: string
  ): Participant {
    return new Participant(participantId, participantName, socketId);
  }
}

export default Conference;
