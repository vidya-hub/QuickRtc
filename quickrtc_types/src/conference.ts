/**
 * Parameters for joining a conference
 */
export type JoinConferenceParams = {
  conferenceId: string;
  conferenceName: string;
  participantId: string;
  participantName: string;
  socketId: string;
};

/**
 * Application state interface that manages conferences and participants
 */
export interface AppState {
  conferences: Map<string, any>; // Using any to avoid circular dependencies
  getConferences(): Map<string, any>;
  joinConference(params: JoinConferenceParams): Promise<any> | any;
  createConference(conferenceId: string, name: string): Promise<void> | void;
  getConference(conferenceId: string): any | undefined;
  removeFromConference(
    conferenceId: string,
    participantId: string
  ): Promise<{
    closedProducerIds: string[];
    closedConsumerIds: string[];
  }>;
  userRemoveWithSocketId(socketId: string): Promise<{
    conferenceId: string | null;
    participantId: string | null;
    closedProducerIds: string[];
    closedConsumerIds: string[];
  }>;
  isConferenceExists(conferenceId: string): boolean;
  resumeProducer(params: {
    conferenceId: string;
    participantId: string;
    producerId: string;
  }): Promise<void> | void;
}
