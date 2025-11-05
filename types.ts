export enum CallState {
  IDLE,
  AGENT_CONNECTING, // Connecting to the selected agent
  CONNECTED,      // Speaking with an agent
  TRANSFERRING,
  DISCONNECTED,
  ERROR,
}
