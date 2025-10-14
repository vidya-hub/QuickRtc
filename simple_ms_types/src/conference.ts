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
  removeFromConference(conferenceId: string, participantId: string): void;
  userRemoveWithSocketId(socketId: string): void;
  isConferenceExists(conferenceId: string): boolean;
}
