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
    console.log('DEBUG: Chat - Setting up event listeners');

    const handleMessage = (event: CustomEvent) => {
      if (!widget) return;  // Only handle widget messages if widget exists
      console.log('DEBUG: Chat - Received message event:', event);
      console.log('DEBUG: Chat - Message event detail:', event.detail);
      if (event.detail?.text) {
        console.log('DEBUG: Chat - Adding message to state:', event.detail.text);
        setMessages(prev => {
          const newMessages = [...prev, {
            text: event.detail.text,
            isUser: false,
            timestamp: new Date()
          }];
          console.log('DEBUG: Chat - Updated messages:', newMessages);
          return newMessages;
        });
      }
    };

    const handleUserTranscript = (event: CustomEvent) => {
      console.log('DEBUG: Chat - Received userSpeechTranscript event:', event);
      const { transcript, isFinal } = event.detail;
      console.log('DEBUG: Chat - User transcript:', { transcript, isFinal });
      
      if (isFinal) {
        console.log('DEBUG: Chat - Adding final transcript to messages:', transcript);
        setMessages(prev => {
          const newMessages = [...prev, {
            text: transcript,
            isUser: true,
            timestamp: new Date()
          }];
          console.log('DEBUG: Chat - Updated messages with transcript:', newMessages);
          return newMessages;
        });
        setInterimTranscript('');
      } else {
        console.log('DEBUG: Chat - Updating interim transcript:', transcript);
        setInterimTranscript(transcript);
      }
    };

    // Always set up transcript listener, regardless of widget
    window.addEventListener('userSpeechTranscript', handleUserTranscript as EventListener);
    
    // Only set up widget message listener if widget exists
    if (widget) {
      widget.addEventListener('message', handleMessage as EventListener);
    }

    return () => {
      window.removeEventListener('userSpeechTranscript', handleUserTranscript as EventListener);
      if (widget) {
        widget.removeEventListener('message', handleMessage as EventListener);
      }
    };
  }, [widget]);

  console.log('DEBUG: Chat - Current messages:', messages);
  console.log('DEBUG: Chat - Current interim transcript:', interimTranscript);

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
