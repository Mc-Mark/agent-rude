# Vraag Ahmed - Interactive Speech Recognition Web Application

A React-based web application that enables natural conversation with an AI assistant using speech recognition and the ElevenLabs Convai widget.

## Features

- Real-time speech recognition in Dutch (nl-NL)
- Interactive AI responses using ElevenLabs Convai
- Beautiful gradient-based UI with fixed header and scrollable chat interface
- Automatic punctuation and capitalization of transcribed text
- Continuous speech recognition with interim results

## Tech Stack

- React with TypeScript
- Vite build tool
- Tailwind CSS for styling
- Web Speech API for speech recognition
- ElevenLabs Convai widget for AI interaction

## Prerequisites

- Node.js (latest LTS version)
- npm or yarn
- Modern web browser with Web Speech API support
- ElevenLabs API key

## Installation

1. Clone the repository:
```bash
git clone https://github.com/Mc-Mark/vraag-ahmed.git
cd vraag-ahmed
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory and add your ElevenLabs API key:
```env
VITE_ELEVENLABS_API_KEY=your_api_key_here
```

4. Start the development server:
```bash
npm run dev
```

## Usage

1. Open the application in your browser
2. Click the telephone icon to start speaking
3. Speak your question in Dutch
4. The AI assistant will respond through the ElevenLabs widget

## Configuration

The application uses the following default configurations:

- Speech Recognition Language: Dutch (nl-NL)
- ElevenLabs Voice Settings:
  - Stability: 0.7
  - Similarity Boost: 0.7

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- ElevenLabs for providing the Convai widget
- Web Speech API for speech recognition capabilities
