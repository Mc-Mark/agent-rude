import React, { useEffect, useState } from 'react';
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

  useEffect(() => {
    console.log('Chat - Setting up event listeners');

    const handleMessage = (event: CustomEvent) => {
      if (!widget) return;  // Only handle widget messages if widget exists
      if (event.detail?.text) {
        // Only update the visual chat display, don't process audio
        setMessages(prev => [...prev, {
          text: event.detail.text,
          isUser: false,
          timestamp: new Date()
        }]);
      }
    };

    const handleUserTranscript = (event: CustomEvent) => {
      const { transcript, isFinal } = event.detail;
      
      if (isFinal) {
        setMessages(prev => [...prev, {
          text: transcript,
          isUser: true,
          timestamp: new Date()
        }]);
        setInterimTranscript('');
      } else {
        setInterimTranscript(transcript);
      }
    };

    // Always set up transcript listener, regardless of widget
    window.addEventListener('userSpeechTranscript', handleUserTranscript as EventListener);
    console.log('Chat - Added userSpeechTranscript event listener');
    
    // Only set up widget message listener if widget exists
    if (widget) {
      widget.addEventListener('message', handleMessage as EventListener);
      console.log('Chat - Added widget message event listener');
    }

    return () => {
      window.removeEventListener('userSpeechTranscript', handleUserTranscript as EventListener);
      if (widget) {
        widget.removeEventListener('message', handleMessage as EventListener);
      }
      console.log('Chat - Removed event listeners');
    };
  }, [widget]);

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
