import { EnhancedEventEmitter } from "mediasoup/extras";
import Conference from "../models/conference";
import { AppState, ConferenceMap, joinConferenceParams } from "../types";
import Participant from "../models/participant";
import * as mediasoup from "mediasoup";
import WorkerService from "../workers/WorkerService";

class MediasoupState extends EnhancedEventEmitter implements AppState {
  conferences: ConferenceMap;
  workerService: WorkerService;
  constructor(workerService: WorkerService) {
    super();
    this.conferences = new Map();
    this.workerService = workerService;
  }
  getConferences(): ConferenceMap {
    return this.conferences;
  }
  async joinConference(params: joinConferenceParams) {
    const {
      conferenceId,
      conferenceName,
      participantId,
      participantName,
      socketId,
    } = params;
    const conference = this.conferences.get(conferenceId);
    if (!conference) {
      await this.createConference(conferenceId, conferenceName);
    }
    let participant = conference?.getParticipant(participantId);
    if (!participant) {
      participant = conference?.createParticipant(
        participantId,
        participantName,
        socketId
      );
    }
    conference?.addParticipant(participant!);
    return conference;
  }
  async createConference(conferenceId: string, name: string) {
    const worker = await this.workerService.getWorker();
    const newConference = new Conference(
      name || "Default",
      new Map(),
      conferenceId,
      worker
    );
    this.conferences.set(conferenceId, newConference);
    this.emit("conferenceCreated", newConference);
  }
  getConference(conferenceId: string): Conference | undefined {
    return this.conferences.get(conferenceId);
  }
  removeFromConference(conferenceId: string, participantId: string) {
    const conference = this.conferences.get(conferenceId);
    if (conference) {
      conference.removeParticipant(participantId);
    }
  }
  userRemoveWithSocketId(socketId: string) {
    this.conferences.forEach((conference) => {
      if (
        conference
          .getParticipants()
          .some((participant: Participant) => participant.socketId === socketId)
      ) {
        conference.removeWithSocketId(socketId);
      }
    });
  }
  isConferenceExists(conferenceId: string): boolean {
    return this.conferences.has(conferenceId);
  }
}

export default MediasoupState;
