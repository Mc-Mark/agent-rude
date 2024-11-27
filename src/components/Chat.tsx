import React, { useEffect, useState, useRef } from 'react';
import { MessageCircle, User } from 'lucide-react';
import { ConvaiWidget } from './types';

interface Message {
  text: string;
  isUser: boolean;
  timestamp: Date;
}

interface ChatProps {
  widget: ConvaiWidget | null;
}

const Chat: React.FC<ChatProps> = ({ widget }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  const messageHandlerRef = useRef<((event: CustomEvent) => void) | null>(null);

  useEffect(() => {
    console.log('Chat - Setting up event listeners');

    const handleMessage = (event: CustomEvent) => {
      console.log('Chat - Received message event:', event);
      if (!widget) return;  // Only handle widget messages if widget exists
      
      const text = event.detail?.text;
      if (text) {
        console.log('Chat - Processing message:', text);
        // Only update the visual chat display, don't process audio
        setMessages(prev => [...prev, {
          text: text,
          isUser: false,
          timestamp: new Date()
        }]);
        console.log('Chat - Message added to state');
      }
    };

    const handleUserTranscript = (event: CustomEvent) => {
      console.log('Chat - Received user transcript event:', event);
      const { transcript, isFinal } = event.detail;
      
      if (isFinal) {
        console.log('Chat - Processing final transcript:', transcript);
        setMessages(prev => [...prev, {
          text: transcript,
          isUser: true,
          timestamp: new Date()
        }]);
        setInterimTranscript('');
        console.log('Chat - Final transcript added to state');
      } else {
        setInterimTranscript(transcript);
      }
    };

    // Set up message handler reference
    messageHandlerRef.current = handleMessage;

    // Always set up transcript listener, regardless of widget
    window.addEventListener('userSpeechTranscript', handleUserTranscript as EventListener);
    console.log('Chat - Added userSpeechTranscript event listener');

    // Add both standard and custom message event listeners
    window.addEventListener('message', handleMessage as EventListener);
    window.addEventListener('widgetMessage', handleMessage as EventListener);
    console.log('Chat - Added message event listeners');

    if (widget) {
      widget.addEventListener('message', handleMessage as EventListener);
      console.log('Chat - Added widget message event listener');
    }

    return () => {
      window.removeEventListener('userSpeechTranscript', handleUserTranscript as EventListener);
      window.removeEventListener('message', handleMessage as EventListener);
      window.removeEventListener('widgetMessage', handleMessage as EventListener);
      if (widget && messageHandlerRef.current) {
        widget.removeEventListener('message', messageHandlerRef.current as EventListener);
      }
      console.log('Chat - Removed event listeners');
    };
  }, [widget]);

  // Add a message handler that can be called from outside
  useEffect(() => {
    (window as any).handleAhmedMessage = (text: string) => {
      console.log('Chat - Handling external Ahmed message:', text);
      setMessages(prev => [...prev, {
        text,
        isUser: false,
        timestamp: new Date()
      }]);
    };

    return () => {
      delete (window as any).handleAhmedMessage;
    };
  }, []);

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <div className="space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`flex items-start space-x-2 max-w-[80%] ${message.isUser ? 'flex-row-reverse space-x-reverse' : 'flex-row'}`}>
              <div className={`rounded-full p-2 ${message.isUser ? 'bg-orange-500' : 'bg-gray-700'}`}>
                {message.isUser ? (
                  <User className="w-4 h-4 text-white" />
                ) : (
                  <MessageCircle className="w-4 h-4 text-white" />
                )}
              </div>
              <div>
                <div className={`rounded-lg p-3 ${message.isUser ? 'bg-orange-500' : 'bg-gray-700'}`}>
                  <p className="text-white">{message.text}</p>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {message.timestamp.toLocaleTimeString()}
                </p>
              </div>
            </div>
          </div>
        ))}
        
        {interimTranscript && (
          <div className="flex justify-end">
            <div className="bg-gray-700 rounded-lg p-3 max-w-[80%] opacity-50">
              <p className="text-white">{interimTranscript}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;
