export type LexieEventName =
  | "speech_started"
  | "speech_stopped"
  | "transcript_partial"
  | "transcript_final"
  | "llm_request_started"
  | "llm_request_completed"
  | "llm_response_streaming"
  | "llm_error"
  | "tts_started"
  | "tts_streaming"
  | "tts_completed"
  | "tts_error"
  | "session_started"
  | "session_ended"
  | "user_interrupted";

export interface LexieEvent<TPayload = unknown> {
  name: LexieEventName;
  sessionId: string;
  timestamp: string;
  payload?: TPayload;
}

export type LexieEventHandler<TPayload = unknown> = (
  event: LexieEvent<TPayload>,
) => void;
