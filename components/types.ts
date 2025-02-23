// Speech Recognition types
export interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

export interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

export interface SpeechRecognitionResult {
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

export interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

export interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

export interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onstart: (() => void) | null;
  onstop: (() => void) | null;
  onaudiostart: (() => void) | null;
  onaudioend: (() => void) | null;
  onspeechstart: (() => void) | null;
  onspeechend: (() => void) | null;
  onnomatch: (() => void) | null;
  onsoundstart: (() => void) | null;
  onsoundend: (() => void) | null;
}

// Convai Widget types
export interface ConvaiMessageEvent extends CustomEvent<{ text: string }> {}

export type ConvaiErrorEvent = CustomEvent<{ error: string }>;

export type ConvaiMicrophoneEvent = CustomEvent<{ state: 'on' | 'off' }>;

export interface ConvaiEventMap {
  'message': ConvaiMessageEvent;
  'error': ConvaiErrorEvent;
  'convai-start': Event;
  'convai-end': Event;
  'microphoneState': ConvaiMicrophoneEvent;
  'start': Event;
  'end': Event;
  'audiostart': Event;
  'audioend': Event;
  'speechstart': Event;
  'speechend': Event;
  'result': Event;
  'click': MouseEvent;
}

export interface ConvaiWidget extends HTMLElement {
  addEventListener<K extends keyof ConvaiEventMap>(type: K, listener: (event: ConvaiEventMap[K]) => void): void;
  removeEventListener<K extends keyof ConvaiEventMap>(type: K, listener: (event: ConvaiEventMap[K]) => void): void;
  setAttribute(name: string, value: string): void;
  getAttribute(name: string): string | null;
  dispatchEvent(event: Event): boolean;
}
