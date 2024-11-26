import React, { useEffect, useRef, useCallback, useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { SpeechRecognition, ConvaiWidget, ConvaiErrorEvent, SpeechRecognitionEvent, ConvaiEventMap, ConvaiMessageEvent } from './components/types';
import Chat from './components/Chat';

declare global {
  interface Window {
    webkitSpeechRecognition: new () => SpeechRecognition;
    webkitAudioContext: typeof AudioContext;
  }
}

const AHMED_INTRO = "Ik ben Achmed wat moet je";

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
          }
          
          const transcriptEvent = new CustomEvent('userSpeechTranscript', {
            detail: { transcript, isFinal }
          });

          window.dispatchEvent(transcriptEvent);
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
    console.log('Widget message received:', event.detail?.text);
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
    if (!mounted.current) {
      return;
    }
    
    if (widget.current) {
      return;
    }

    try {
      const apiKey = import.meta.env.VITE_ELEVENLABS_API_KEY;
      if (!apiKey) {
        throw new Error('ElevenLabs API key not found');
      }

      const widgetElement = document.createElement('elevenlabs-convai');
      widgetElement.setAttribute('agent-id', 'akUQ3jWHilChfhFfPsPM');
      widgetElement.setAttribute('voice-id', 'pNInz6obpgDQGcFmaJgB');
      widgetElement.setAttribute('api-key', apiKey);
      widgetElement.setAttribute('stability', '0.7');
      widgetElement.setAttribute('similarity-boost', '0.7');

      widget.current = widgetElement as ConvaiWidget;

      const debugEvents = [
        'message', 'error', 'microphoneState',
        'start', 'end', 'audiostart', 'audioend',
        'speechstart', 'speechend', 'result'
      ] satisfies (keyof ConvaiEventMap)[];

      debugEvents.forEach((eventName: keyof ConvaiEventMap) => {
        const debugHandler = (event: ConvaiEventMap[typeof eventName]) => {
          console.log(`Widget ${eventName} event:`, event);
        };
        widget.current?.addEventListener(eventName, debugHandler as EventListener);
        debugHandlers.current.push({ event: eventName, handler: debugHandler as EventListener });
      });

      const messageHandler = (event: ConvaiMessageEvent) => {
        console.log('Processing widget message:', event.detail?.text);
        handleWidgetMessage(event);
      };
      
      const errorHandler = (event: ConvaiErrorEvent) => {
        console.error('Processing widget error:', event.detail?.error);
        handleWidgetError(event);
      };
      
      const micStateHandler = (event: CustomEvent<{ state: 'on' | 'off' }>) => {
        console.log('Processing microphone state change:', event.detail?.state);
        
        const state = event.detail.state;
        
        isMicrophoneActive.current = state === 'on';
        
        if (state === 'on') {
          console.log('Starting speech recognition from widget');
          void startListening();
        } else if (state === 'off') {
          console.log('Stopping speech recognition from widget');
          void stopListening();
        }
      };

      widget.current.addEventListener('message', messageHandler as EventListener);
      widget.current.addEventListener('error', errorHandler as EventListener);
      widget.current.addEventListener('microphoneState', micStateHandler as EventListener);

      const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          if (mutation.type === 'childList') {
            const micButton = widgetElement.querySelector('.microphone-button');
            if (micButton) {
              const oldHandler = micButton.getAttribute('data-mic-handler');
              if (oldHandler) {
                const oldHandlerFn = new Function(oldHandler) as EventListener;
                micButton.removeEventListener('click', oldHandlerFn);
              }
              
              const handleMicClick = async (event: Event) => {
                event.preventDefault();
                event.stopPropagation();
                
                const isActive = (event.target as Element).classList.contains('active');
                
                if (!isActive) {
                  try {
                    await startListening();
                    (event.target as Element).classList.add('active');
                  } catch (error) {
                    console.error('Error starting speech recognition:', error);
                  }
                } else {
                  try {
                    await stopListening();
                    (event.target as Element).classList.remove('active');
                  } catch (error) {
                    console.error('Error stopping speech recognition:', error);
                  }
                }
              };
              
              micButton.addEventListener('click', handleMicClick);
              observer.disconnect();
            }
          }
        }
      });

      observer.observe(widgetElement, { childList: true, subtree: true });

      if (widgetContainer.current) {
        widgetContainer.current.appendChild(widgetElement);
      }

      // Enhanced audio monitoring
      const handleAudioStart = () => {
        console.log('Audio output started - Voice playback beginning');
      };

      const handleAudioEnd = () => {
        console.log('Audio output ended - Voice playback completed');
      };

      const handleAudioError = (event: any) => {
        console.error('Audio playback error:', event.detail);
      };

      widget.current.addEventListener('audiostart', handleAudioStart);
      widget.current.addEventListener('audioend', handleAudioEnd);
      widget.current.addEventListener('error', handleAudioError);

      // Add cleanup for new audio monitoring
      widgetCleanup.current = () => {
        if (widget.current) {
          widget.current.removeEventListener('audiostart', handleAudioStart);
          widget.current.removeEventListener('audioend', handleAudioEnd);
          widget.current.removeEventListener('error', handleAudioError);
        }
      };
    } catch (error) {
      console.error('Error initializing widget:', error);
    }
  }, [startListening, stopListening]);

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
                src="https://i.postimg.cc/WpmzKtYT/Portrait-Agent-Rude.png"
                alt="Ahmed Portrait"
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

      {/* Scrollable chat section */}
      <div className="flex-grow container mx-auto px-4 relative z-0 mb-[400px]">
        <div className="max-w-4xl mx-auto">
          <Chat widget={widget.current} />
        </div>
      </div>

      {/* Fixed widget section at the bottom */}
      <div className="fixed bottom-0 left-0 right-0 z-20 bg-gray-800 border-t border-gray-700">
        <div className="max-w-4xl mx-auto">
          <elevenlabs-convai
            ref={widget}
            api-key={import.meta.env.VITE_ELEVENLABS_API_KEY}
            agent-id="akUQ3jWHilChfhFfPsPM"
            voice-id="pNInz6obpgDQGcFmaJgB"
            stability="0.7"
            similarity-boost="0.7"
            style={{ width: '100%', height: '400px' }}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
