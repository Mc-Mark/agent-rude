// Speech Recognition types
export interface SpeechRecognitionEvent extends Event {
  results: {
    [key: number]: {
      [key: number]: {
        transcript: string;
      };
      isFinal: boolean;
      length: number;
    };
    length: number;
  };
}

export interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

export interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
  onstop: (() => void) | null;
  onaudiostart: (() => void) | null;
  onaudioend: (() => void) | null;
  onspeechstart: (() => void) | null;
  onspeechend: (() => void) | null;
  abort: () => void;
  start: () => void;
  stop: () => void;
}

// Convai Widget types
export interface ConvaiMessageEvent extends CustomEvent {
  detail: {
    text: string;
  };
}

export interface ConvaiErrorEvent extends CustomEvent {
  detail: {
    error: string;
  };
}

export interface ConvaiWidgetConfig {
  apiKey: string;
  agentId: string;
  voiceId: string;
  initialMessage: string;
  container: HTMLElement;
}

export interface ConvaiWidget extends HTMLElement {
  addEventListener(type: 'message', listener: (event: ConvaiMessageEvent) => void): void;
  addEventListener(type: 'error', listener: (event: ConvaiErrorEvent) => void): void;
  addEventListener(type: 'convai-start' | 'convai-end', listener: () => void): void;
  addEventListener(type: string, listener: EventListener): void;
  removeEventListener(type: string, listener: EventListener): void;
}

export type ConvaiEventMap = {
  message: ConvaiMessageEvent;
  error: ConvaiErrorEvent;
  start: Event;
  end: Event;
  audiostart: Event;
  audioend: Event;
  speechstart: Event;
  speechend: Event;
  result: Event;
  microphoneState: CustomEvent<{ state: 'on' | 'off' }>;
};

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'elevenlabs-convai': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
        'agent-id': string;
        'class'?: string;
        'debug'?: string;
        'voice-id'?: string;
        'api-key'?: string;
        'initial-message'?: string;
      }, HTMLElement>;
    }
  }

  interface Window {
    webkitSpeechRecognition: new () => SpeechRecognition;
    webkitAudioContext: typeof AudioContext;
    ConvaiWidget: {
      new(config: ConvaiWidgetConfig): ConvaiWidget;
    };
  }
}
