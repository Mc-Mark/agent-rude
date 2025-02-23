import React, { useEffect, useRef, useCallback, useState } from 'react';
import { MessageCircle } from 'lucide-react';
import type { 
  SpeechRecognition, 
  ConvaiWidget, 
  ConvaiMessageEvent, 
  ConvaiErrorEvent, 
  ConvaiEventMap, 
  SpeechRecognitionEvent,
  ConvaiConfig 
} from './components/types';
import Chat from './components/Chat';

declare global {
  interface Window {
    webkitSpeechRecognition: new () => SpeechRecognition;
    webkitAudioContext: typeof AudioContext;
  }
}

const AHMED_INTRO = "Ik ben Achmed wat moet je";

const isMobileBrowser = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

const isIOSSafari = () => {
  const ua = window.navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(ua);
  const webkit = /WebKit/.test(ua);
  const notChrome = !/Chrome/.test(ua);
  
  return iOS && webkit && notChrome;
};

function App() {
  // Refs for managing state
  const mounted = useRef(true);
  const hasUserInteracted = useRef(false);
  const audioStream = useRef<MediaStream | null>(null);
  const recognition = useRef<SpeechRecognition | null>(null);
  const isListening = useRef(false);
  const shouldRestart = useRef(false);
  const widgetContainer = useRef<HTMLDivElement>(null);
  const widgetCleanup = useRef<(() => void) | null>(null);
  const widget = useRef<ConvaiWidget | null>(null);
  const restartTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restartAttempts = useRef(0);
  const MAX_RESTART_ATTEMPTS = 3;
  const isInitialized = useRef(false);
  const debugHandlers = useRef<{ event: keyof ConvaiEventMap; handler: EventListener }[]>([]);
  const eventHandlers = useRef<{
    message: (event: ConvaiMessageEvent) => void;
    error: (event: ConvaiErrorEvent) => void;
    microphoneState: (event: CustomEvent<{ state: 'on' | 'off' }>) => void;
  }>({
    message: () => {},
    error: () => {},
    microphoneState: () => {}
  });
  const isMicrophoneActive = useRef(false);
  const isProcessingMicrophoneClick = useRef(false);
  const [isRecording, setIsRecording] = useState(false);

  // Audio monitoring functions
  const stopAudioMonitoring = async () => {
    if (audioStream.current) {
      audioStream.current.getTracks().forEach(track => track.stop());
      audioStream.current = null;
    }
  };

  const startAudioMonitoring = async () => {
    try {
      audioStream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (error) {
      await stopAudioMonitoring();
      throw error;
    }
  };

  const restartRecognition = useCallback(async () => {
    if (!shouldRestart.current || !mounted.current) {
      return;
    }

    if (restartAttempts.current >= MAX_RESTART_ATTEMPTS) {
      shouldRestart.current = false;
      restartAttempts.current = 0;
      return;
    }

    try {
      if (recognition.current) {
        await recognition.current.start();
        restartAttempts.current = 0;
      } else {
        console.error('Cannot restart - recognition not initialized');
        shouldRestart.current = false;
      }
    } catch (error) {
      console.error('Error restarting recognition:', error);
      restartAttempts.current++;
      
      if (restartAttempts.current < MAX_RESTART_ATTEMPTS) {
        restartTimeout.current = setTimeout(() => {
          void restartRecognition();
        }, 1000);
      } else {
        console.log('Max restart attempts reached during error recovery');
        shouldRestart.current = false;
        restartAttempts.current = 0;
      }
    }
  }, []);

  const startListening = async () => {
    shouldRestart.current = true;
    
    try {
      await startAudioMonitoring();
    } catch (error) {
      console.error('Failed to get audio permissions:', error);
      return;
    }

    if (!recognition.current) {
      initializeRecognition();
    }

    if (recognition.current) {
      try {
        await recognition.current.start();
        isListening.current = true;
      } catch (error) {
        console.error('Failed to start speech recognition:', error);
        isListening.current = false;
        await stopAudioMonitoring();
      }
    } else {
      console.error('Failed to initialize speech recognition');
      await stopAudioMonitoring();
    }
  };

  const stopListening = async () => {
    shouldRestart.current = false;
    
    if (recognition.current) {
      try {
        recognition.current.stop();
      } catch (error) {
        console.error('Error stopping speech recognition:', error);
      }
    }
    
    isListening.current = false;
    await stopAudioMonitoring();
  };

  // Initialize recognition instance
  const initializeRecognition = useCallback(() => {
    if (recognition.current) {
      return;
    }

    try {
      const SpeechRecognition = window.webkitSpeechRecognition;
      recognition.current = new SpeechRecognition();

      if (!recognition.current) {
        throw new Error('Speech recognition not supported');
      }

      recognition.current.continuous = true;
      recognition.current.interimResults = true;
      recognition.current.lang = 'nl-NL';

      recognition.current.onstart = () => {
        isListening.current = true;
      };

      recognition.current.onend = () => {
        isListening.current = false;
        if (shouldRestart.current && mounted.current) {
          void restartRecognition();
        }
      };

      recognition.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        console.error('Full error event:', event);
        isListening.current = false;
        
        if (event.error === 'not-allowed') {
          console.error('Microphone permission denied');
          shouldRestart.current = false;
        } else if (event.error === 'network' || event.error === 'service-not-allowed') {
          shouldRestart.current = false;
          console.log('Not restarting due to critical error');
        }
      };

      recognition.current.onnomatch = () => {
        console.log('No speech was recognized');
      };

      recognition.current.onaudiostart = () => {
        console.log('Audio capturing started');
      };

      recognition.current.onaudioend = () => {
        console.log('Audio capturing ended');
      };

      recognition.current.onsoundstart = () => {
        console.log('Sound detected');
      };

      recognition.current.onsoundend = () => {
        console.log('Sound ended');
      };

      recognition.current.onspeechstart = () => {
        console.log('Speech started');
      };

      recognition.current.onspeechend = () => {
        console.log('Speech ended');
      };

      recognition.current.onresult = (event: SpeechRecognitionEvent) => {
        if (!event.results) {
          return;
        }

        const results = Array.from(event.results);
        for (let i = event.resultIndex; i < results.length; i++) {
          const result = results[i];
          let transcript = result[0].transcript;
          const isFinal = result.isFinal;

          if (isFinal) {
            console.log('Final transcript received:', transcript);
            
            // Process the transcript to add punctuation and capitalization
            transcript = transcript
              // Add space after punctuation if missing
              .replace(/([.!?])([A-Za-z])/g, '$1 $2')
              // Ensure proper spacing around punctuation
              .replace(/\s+([.!?,])/g, '$1')
              // Add period if sentence doesn't end with punctuation
              .replace(/([^.!?])$/g, '$1.')
              // Capitalize first letter of each sentence
              .replace(/(^|[.!?]\s+)([a-z])/g, (match, p1, p2) => p1 + p2.toUpperCase())
              // Ensure first letter of transcript is capitalized
              .replace(/^[a-z]/g, letter => letter.toUpperCase());

            console.log('Processed final transcript:', transcript);
            
            const transcriptEvent = new CustomEvent('userSpeechTranscript', {
              detail: { transcript, isFinal }
            });

            console.log('Dispatching final transcript event:', { transcript });
            window.dispatchEvent(transcriptEvent);
          } else {
            // Still dispatch interim results but don't log them
            const transcriptEvent = new CustomEvent('userSpeechTranscript', {
              detail: { transcript, isFinal }
            });
            window.dispatchEvent(transcriptEvent);
          }
        }
      };
    } catch (error) {
      console.error('Error initializing speech recognition:', error);
      recognition.current = null;
    }
  }, [restartRecognition]);

  // Define handlers at component level
  const handleMicrophoneState = useCallback((event: CustomEvent<{ state: 'on' | 'off' }>) => {
    const state = event.detail?.state;
    
    if (isProcessingMicrophoneClick.current) {
      return;
    }

    isMicrophoneActive.current = state === 'on';
    
    if (state === 'on') {
      void startListening();
    } else if (state === 'off') {
      void stopListening();
    }
  }, []);

  const handleWidgetMessage = useCallback((event: ConvaiMessageEvent) => {
    console.log('Widget message event received:', event);
    
    let messageText = '';
    
    // Try to get text from different possible locations
    if (event.detail?.text) {
      messageText = event.detail.text;
    } else if (event instanceof CustomEvent && event.detail?.text) {
      messageText = event.detail.text;
    } else if (event instanceof MessageEvent && event.data?.text) {
      messageText = event.data.text;
    } else if (widget.current) {
      messageText = widget.current.getAttribute('text') || '';
    }
    
    if (messageText) {
      console.log('Processing widget message:', messageText);
      
      // Try multiple ways to dispatch the message
      try {
        // 1. Try the global handler
        if ((window as any).handleAhmedMessage) {
          console.log('Using global message handler');
          (window as any).handleAhmedMessage(messageText);
        }

        // 2. Dispatch custom event
        const messageEvent = new CustomEvent('widgetMessage', {
          detail: { 
            text: messageText,
            timestamp: new Date().toISOString(),
            source: 'ahmed'
          },
          bubbles: true,
          cancelable: true
        });

        console.log('Dispatching widget message event');
        window.dispatchEvent(messageEvent);
        
        // 3. Try standard message event
        const standardEvent = new MessageEvent('message', {
          data: { text: messageText, source: 'ahmed' },
          origin: window.location.origin
        });

        console.log('Dispatching standard message event');
        window.dispatchEvent(standardEvent);

        // 4. Update widget if available
        if (widget.current) {
          console.log('Dispatching to widget');
          widget.current.dispatchEvent(messageEvent);
        }
      } catch (error) {
        console.error('Error dispatching message:', error);
      }
    } else {
      console.log('No message text found in event');
    }
  }, []);

  const handleWidgetError = useCallback((event: ConvaiErrorEvent) => {
    console.error('Widget error:', event.detail?.error);
  }, []);

  // Widget event handlers
  const handleWidgetMicrophoneState = (event: CustomEvent) => {
    console.log('Widget microphone state changed:', event.detail);
    const { isActive } = event.detail;
    
    if (isActive) {
      console.log('Widget microphone activated');
    } else {
      console.log('Widget microphone deactivated');
    }
  };

  const handleWidgetStart = () => {
    console.log('Widget interaction started');
  };

  const handleWidgetEnd = () => {
    console.log('Widget interaction ended');
  };

  const handleWidgetAudioStart = () => {
    console.log('Widget audio started');
  };

  const handleWidgetAudioEnd = () => {
    console.log('Widget audio ended');
  };

  const handleWidgetMessageEvent = (event: ConvaiMessageEvent) => {
    console.log('Widget message event:', event);
    console.log('Widget message detail:', event.detail);
    
    if (event.detail?.text) {
      console.log('Processing widget message:', event.detail.text);
      console.log('Widget message received:', event.detail.text);
    }
  };

  // Initialize widget
  const initializeWidget = useCallback(() => {
    if (!mounted.current || widget.current) {
      return;
    }

    try {
      console.log('Initializing widget...');
      
      const widgetConfig: ConvaiConfig = {
        apiKey: import.meta.env.VITE_ELEVENLABS_API_KEY,
        agentId: 'akUQ3jWHilChfhFfPsPM',
        voiceId: 'pNInz6obpgDQGcFmaJgB',
        backgroundColor: '#1f2937',
        textColor: '#ffffff',
        debug: true,
        enableAudio: true,
        enableText: false,
        language: 'nl-NL',
        tts: {
          voiceId: 'pNInz6obpgDQGcFmaJgB',
          modelId: 'eleven_multilingual_v2',
          stability: 0.5,
          similarityBoost: 0.8,
          style: 0.5,
          useSSML: true
        },
        stt: {
          continuous: true,
          interimResults: true,
          silenceDetectionConfig: {
            minSpeechActivity: 0.3,
            timeBeforeSilence: 1500,
            silenceThreshold: 0.15,
            minSilenceDuration: 1000,
            maxSpeechDuration: 30000
          }
        }
      };

      const widgetElement = document.createElement('elevenlabs-convai');
      
      // Set configuration
      Object.entries(widgetConfig).forEach(([key, value]) => {
        if (typeof value === 'object') {
          widgetElement.setAttribute(key, JSON.stringify(value));
        } else {
          widgetElement.setAttribute(key, String(value));
        }
        console.log(`Set widget attribute: ${key}`);
      });

      widget.current = widgetElement as ConvaiWidget;

      // Add event listeners before appending
      const addListener = <K extends keyof ConvaiEventMap>(
        eventName: K,
        handler: (event: ConvaiEventMap[K]) => void
      ) => {
        if (widget.current) {
          widget.current.addEventListener(eventName, handler as EventListener);
          console.log(`Added ${eventName} listener`);
        }
      };

      // Handle widget responses
      addListener('message', handleWidgetMessage);
      addListener('error', handleWidgetError);

      // Add specific audio event listeners
      addListener('audiostart', () => {
        console.log('Widget audio started');
        let currentText = '';
        
        // Create a MutationObserver to watch for text changes
        const observer = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' && mutation.attributeName === 'text') {
              const newText = (mutation.target as HTMLElement).getAttribute('text') || '';
              if (newText && newText !== currentText) {
                currentText = newText;
                console.log('Widget text updated:', newText);
                
                // Dispatch the text as a message
                const messageEvent = new CustomEvent('widgetMessage', {
                  detail: { 
                    text: newText,
                    timestamp: new Date().toISOString(),
                    source: 'ahmed'
                  },
                  bubbles: true,
                  cancelable: true
                });
                window.dispatchEvent(messageEvent);
              }
            }
          });
        });

        // Start observing the widget element
        if (widget.current) {
          observer.observe(widget.current, {
            attributes: true,
            attributeFilter: ['text']
          });
        }
      });

      addListener('audioend', () => {
        console.log('Widget audio ended');
      });

      addListener('start', () => {
        console.log('Widget started');
      });

      addListener('end', () => {
        console.log('Widget ended');
      });

      // Log all widget events for debugging
      ['convai-start', 'convai-end', 'speechstart', 'speechend', 'result'].forEach(eventName => {
        addListener(eventName as keyof ConvaiEventMap, (event) => {
          console.log(`Widget ${eventName} event:`, event);
        });
      });

      // Append to container
      if (widgetContainer.current) {
        console.log('Appending widget to container');
        widgetContainer.current.appendChild(widgetElement);
        console.log('Widget appended successfully');
      }

    } catch (error) {
      console.error('Widget initialization error:', error);
    }
  }, [handleWidgetMessage]);

  useEffect(() => {
    mounted.current = true;
    isInitialized.current = false;
    
    return () => {
      const strictModeRemount = document.contains(widgetContainer.current);
      if (!strictModeRemount) {
        mounted.current = false;
        void stopListening();
      }
    };
  }, []);

  useEffect(() => {
    if (!recognition.current) {
      initializeRecognition();
    }
    return () => {
      const strictModeRemount = document.contains(widgetContainer.current);
      if (!strictModeRemount && recognition.current) {
        recognition.current.stop();
        recognition.current = null;
      }
    };
  }, [initializeRecognition]);

  useEffect(() => {
    const strictModeMount = widget.current && document.contains(widgetContainer.current);
    
    if (!strictModeMount && widgetContainer.current && !widget.current) {
      initializeWidget();
    }
    
    return () => {
      const strictModeRemount = document.contains(widgetContainer.current);
      if (!strictModeRemount) {
        if (widgetCleanup.current) {
          widgetCleanup.current();
        }
        if (restartTimeout.current) {
          clearTimeout(restartTimeout.current);
        }
      }
    };
  }, [initializeWidget]);

  useEffect(() => {
    const handleGlobalClick = async (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      
      if (target.tagName === 'ELEVENLABS-CONVAI') {
        const widget = target as HTMLElement;
        const shadowRoot = widget.shadowRoot;
        if (shadowRoot) {
          const micButton = shadowRoot.querySelector('button, [role="button"]');
          if (micButton) {
            if (!isListening.current) {
              try {
                await startListening();
              } catch (error) {
                console.error('Error starting speech recognition:', error);
              }
            } else {
              try {
                await stopListening();
              } catch (error) {
                console.error('Error stopping speech recognition:', error);
              }
            }
          }
        }
      }
    };
    
    document.addEventListener('click', handleGlobalClick, true);
    return () => document.removeEventListener('click', handleGlobalClick, true);
  }, []);

  useEffect(() => {
    widget.current?.addEventListener('microphoneState', handleWidgetMicrophoneState as EventListener);
    widget.current?.addEventListener('start', handleWidgetStart);
    widget.current?.addEventListener('end', handleWidgetEnd);
    widget.current?.addEventListener('audiostart', handleWidgetAudioStart);
    widget.current?.addEventListener('audioend', handleWidgetAudioEnd);
    widget.current?.addEventListener('message', handleWidgetMessageEvent as EventListener);

    return () => {
      if (widget.current) {
        widget.current.removeEventListener('microphoneState', handleWidgetMicrophoneState as EventListener);
        widget.current.removeEventListener('start', handleWidgetStart);
        widget.current.removeEventListener('end', handleWidgetEnd);
        widget.current.removeEventListener('audiostart', handleWidgetAudioStart);
        widget.current.removeEventListener('audioend', handleWidgetAudioEnd);
        widget.current.removeEventListener('message', handleWidgetMessageEvent as EventListener);
      }
    };
  }, [widget.current]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white flex flex-col">
      {/* Fixed header and photo section */}
      <div className="fixed top-0 left-0 right-0 z-10 bg-gradient-to-b from-gray-900 to-gray-800">
        <div className="container mx-auto px-4 py-8">
          <header className="text-center mb-8">
            <h1 className="text-5xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-orange-500">
              Vraag Ahmed
            </h1>
            <div className="flex items-center justify-center gap-2 text-gray-300">
              <MessageCircle className="w-5 h-5" />
              <p className="text-lg">Druk op de telefoon knop en stel je vraag</p>
            </div>
          </header>

          <div className="max-w-4xl mx-auto">
            <div className="relative rounded-lg overflow-hidden shadow-2xl">
              <img
                src="https://i.postimg.cc/XNz7xdT2/Agent-Rude-at-Desk.gif"
                alt="Ahmed at Desk"
                className="w-full object-cover"
                style={{ maxHeight: '400px' }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent opacity-30"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Spacer to prevent content from being hidden behind fixed header */}
      <div className="h-[700px]"></div>

      {/* Main content container */}
      <div className="container mx-auto px-4 relative z-0">
        {/* Chat section */}
        <div className="max-w-4xl mx-auto mb-4">
          <Chat widget={widget.current} />
        </div>

        {/* Widget section */}
        <div className="max-w-4xl mx-auto bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
          <elevenlabs-convai
            ref={widget}
            api-key={import.meta.env.VITE_ELEVENLABS_API_KEY}
            agent-id="akUQ3jWHilChfhFfPsPM"
            voice-id="pNInz6obpgDQGcFmaJgB"
            class="convai-widget"
            debug="true"
            style={{ width: '100%', height: '400px' }}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
