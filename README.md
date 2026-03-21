# YouTube ChatBot with RAG

A modern, intelligent YouTube video chatbot powered by Retrieval-Augmented Generation (RAG) that allows users to ask questions about YouTube video content and get accurate, context-aware responses.

## 🌟 Features

- **🎥 YouTube Video Analysis**: Automatically fetches and processes YouTube video transcripts
- **💬 Intelligent Chat**: Ask questions about video content with context-aware responses
- **🔍 Vector Search**: Uses advanced vector embeddings for efficient content retrieval
- **📝 Transcript Processing**: Splits transcripts into searchable chunks
- **🎨 Modern UI**: Clean, dark-themed interface with responsive design
- **⚡ Real-time**: Fast responses with loading states and error handling

## 🏗️ Architecture

### Frontend (React + TypeScript + Vite)
- **React 19.2.0** with TypeScript for type safety
- **Vite** for fast development and building
- **Modern CSS** with custom properties and animations
- **Responsive design** that works on all devices

### Backend (Node.js + Express)
- **Express.js** server for API endpoints
- **LangChain** for AI agent orchestration
- **Google Gemini** for language understanding and generation
- **PostgreSQL + pgvector** for vector storage and similarity search
- **YouTube Transcript API** for video content extraction

### AI Agent
- **Tool-based architecture** with specialized tools
- **Video Loader Tool**: Automatically detects and loads YouTube videos
- **Retrieval Tool**: Searches vector database for relevant content
- **Memory Management**: Maintains conversation context

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL database with pgvector extension
- Google AI API key
- YouTube video URLs for testing

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/aryaman144/Youtube-ChatBot.git
   cd Youtube-ChatBot
   ```

2. **Install dependencies**
   ```bash
   # Install server dependencies
   cd server
   npm install
   
   # Install client dependencies
   cd ../client
   npm install
   ```

3. **Environment Setup**
   ```bash
   # In server directory, create .env file
   cp .env.example .env
   
   # Add your API keys
   GOOGLE_API_KEY=your_google_api_key_here
   DATABASE_URL=your_postgresql_connection_string_here
   ```

4. **Database Setup**
   ```sql
   -- Create database with pgvector extension
   CREATE DATABASE youtube_chatbot;
   CREATE EXTENSION IF NOT EXISTS vector;
   
   -- Create transcripts table
   CREATE TABLE transcripts (
     id SERIAL PRIMARY KEY,
     content TEXT NOT NULL,
     vector vector(1536) NOT NULL,
     metadata JSONB DEFAULT '{}'
   );
   
   -- Create vector index for similarity search
   CREATE INDEX ON transcripts USING ivfflat (vector vector_cosine_ops);
   ```

### Running the Application

1. **Start the backend server**
   ```bash
   cd server
   npm start
   ```
   Server will run on `http://localhost:3000`

2. **Start the frontend development server**
   ```bash
   cd client
   npm run dev
   ```
   Frontend will run on `http://localhost:5173`

## 📖 Usage

1. **Open the application** in your browser at `http://localhost:5173`
2. **Share a YouTube video** by pasting a URL in the chat
3. **Ask questions** about the video content:
   - "What are the main points discussed?"
   - "Explain the concept mentioned at 2:30"
   - "Summarize this video in bullet points"
4. **Get intelligent responses** based on the actual video content

## 🛠️ Development

### Project Structure
```
rag-2/
├── client/                 # React frontend
│   ├── src/
│   │   ├── App.tsx        # Main application component
│   │   └── index.css       # Global styles
│   └── package.json
├── server/                 # Node.js backend
│   ├── agent.js           # AI agent with tools
│   ├── embeddings.js       # Vector database operations
│   ├── index.js           # Express server
│   └── package.json
└── README.md
```

### Key Components

**AI Agent (`server/agent.js`)**
- `videoLoaderTool`: Extracts YouTube video IDs and loads transcripts
- `retrieveTool`: Searches vector database for relevant content
- Automatic tool selection based on user queries

**Vector Storage (`server/embeddings.js`)**
- Text splitting with overlap for better context
- Embedding generation using Google's models
- Similarity search with cosine distance

**Frontend (`client/src/App.tsx`)**
- Modern dark theme interface
- Real-time chat with typing indicators
- YouTube-specific suggested prompts
- Responsive design with animations

### Environment Variables

**Server (.env)**
```env
GOOGLE_API_KEY=your_google_ai_api_key
DATABASE_URL=postgresql://username:password@localhost:5432/dbname
PORT=3000
```

**Client (.env)**
```env
VITE_API_URL=http://localhost:3000
```

## 🔧 API Endpoints

### POST /generate
Processes user queries and returns AI responses.

**Request:**
```json
{
  "query": "What is this video about?",
  "thread_id": 1234567890,
  "video_id": "JljlsOJmlCA"
}
```

**Response:**
```json
{
  "messages": [
    {
      "role": "assistant",
      "content": "This video discusses..."
    }
  ]
}
```

## 🎨 Customization

### Adding New Tools
To add new capabilities to the AI agent:

1. **Create a new tool** in `server/agent.js`
2. **Add to agent tools array**
3. **Update tool descriptions** for better AI selection

### Styling
- Modify `client/src/index.css` for visual changes
- Uses CSS custom properties for theming
- Responsive breakpoints at 768px and 480px

## 🐛 Troubleshooting

### Common Issues

**Vector Database Errors**
- Ensure pgvector extension is installed
- Check database connection string
- Verify table schema matches expectations

**YouTube Transcript Issues**
- Some videos may not have transcripts available
- Check video privacy settings
- Verify YouTube API access

**API Rate Limits**
- Google AI API has rate limits
- Monitor usage in Google Cloud Console
- Consider upgrading to paid tier for production

### Debug Mode
Enable additional logging by setting:
```env
DEBUG=true
```

## 📄 License

This project is licensed under the ISC License.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 🙏 Acknowledgments

- **LangChain** for the powerful AI framework
- **Google Gemini** for language model capabilities
- **YouTube Transcript API** for content access
- **Vite** for the excellent development experience
- **PostgreSQL + pgvector** for efficient vector storage

---

Built with ❤️ using modern web technologies and AI capabilities.
