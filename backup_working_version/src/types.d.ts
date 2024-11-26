// Speech Recognition types
interface SpeechRecognitionEvent extends Event {
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

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognition extends EventTarget {
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
interface ConvaiMessageEvent extends CustomEvent {
  detail: {
    text: string;
  };
}

interface ConvaiErrorEvent extends CustomEvent {
  detail: {
    error: string;
  };
}

interface ConvaiWidgetConfig {
  apiKey: string;
  agentId: string;
  voiceId: string;
  initialMessage: string;
  container: HTMLElement;
}

interface ConvaiWidget extends HTMLElement {
  addEventListener(type: 'message', listener: (event: ConvaiMessageEvent) => void): void;
  addEventListener(type: 'error', listener: (event: ConvaiErrorEvent) => void): void;
  addEventListener(type: 'convai-start' | 'convai-end', listener: () => void): void;
  removeEventListener(type: string, listener: EventListener): void;
  setAttribute(name: string, value: string): void;
  getAttribute(name: string): string | null;
}

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

export {};
