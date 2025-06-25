# Google Drive Document Chat

A conversational AI interface that lets you chat with your Google Drive documents. Paste any Google Drive folder link and ask questions about the files inside.

## What it does

- 🔐 **Google Authentication** - Sign in with your Google account to access Google Drive
- 📂 **Folder Processing** - Paste any Google Drive folder link to index documents
- 💬 **Document Chat** - Ask natural language questions about your files
- 📄 **Multiple File Types** - Supports PDFs, Google Docs, spreadsheets, and more
- 🎯 **Smart Citations** - Shows which documents answers came from with relevance scores
- 🔍 **Semantic Search** - Uses AI embeddings to find relevant content across all files

## How to run it

### Prerequisites
- Node.js 18+ 
- Google Cloud Project with Drive API enabled
- OpenAI API key
- LlamaParse API key (for PDF processing)

### Google Cloud Setup
1. **Enable APIs**: In your Google Cloud Console, enable:
   - Google Drive API
   - Google+ API (for OAuth)
2. **Create OAuth Credentials**: 
   - Go to APIs & Services > Credentials
   - Create OAuth 2.0 Client ID for Web Application
   - Add `http://localhost:3000/api/auth/callback/google` to authorized redirect URIs
3. **Configure OAuth Consent Screen**:
   - Set up OAuth consent screen 
   - Add test users in "Test users" section (required for development)
   - Only these test users will be able to sign in during development

### 1. Install dependencies
```bash
npm install
```

### 2. Set up environment variables
Create a `.env.local` file:
```env
# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret

# AI APIs  
OPENAI_API_KEY=your_openai_api_key
LLAMA_CLOUD_API_KEY=your_llamaparse_api_key
```

### 3. Run the development server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Use the app
1. Sign in with your Google account
2. Paste a Google Drive folder link (make sure it's publicly accessible or shared with your account)
3. Wait for documents to be processed
4. Start asking questions about your files!

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Authentication**: NextAuth.js with Google OAuth
- **AI/RAG**: LlamaIndex TypeScript, OpenAI GPT-4
- **Document Processing**: LlamaParse for PDFs, Google Drive API
- **Styling**: Tailwind CSS with shadcn/ui components

## Example Questions

- "What does Xlerate AI do?"
- "Summarize the main points from the quarterly report"
- "What are the action items from the meeting notes?"
- "How much budget is allocated for marketing?" 