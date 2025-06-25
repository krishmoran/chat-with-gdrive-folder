'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { ScrollArea } from './ui/scroll-area'
import { Badge } from './ui/badge'
import { LoadingSpinner } from './ui/loading-spinner'
import { Avatar, AvatarFallback } from './ui/avatar'
import { toast } from 'sonner'
import { Send, Bot, User, FileText, Sparkles, Brain } from 'lucide-react'
import ReactMarkdown from 'react-markdown'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  citations?: string[]
  timestamp: Date
}

interface ChatInterfaceProps {
  folderId: string
}

export function ChatInterface({ folderId }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    // Add welcome message
    setMessages([{
      id: '1',
      role: 'assistant',
      content: 'Hello! I\'ve successfully indexed your documents. You can now ask me questions about the content in your folder. Try asking me to summarize the documents, find specific information, or explain key concepts.',
      timestamp: new Date()
    }])
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!input.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: input,
          folderId,
          history: messages.slice(-10) // Send last 10 messages for context
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to get response')
      }

      const data = await response.json()
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        citations: data.citations,
        timestamp: new Date()
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error('Chat error:', error)
      toast.error('Failed to get response. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const suggestedQuestions = [
    "Summarize the main points of all documents",
    "What are the key deadlines mentioned?",
    "Find any action items or tasks",
    "What are the main topics covered?"
  ]

  return (
    <div className="flex flex-col h-full bg-white rounded-lg border shadow-sm">
      {/* Header */}
      <div className="p-4 border-b bg-gray-50 rounded-t-lg">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Bot className="h-5 w-5 text-blue-600" />
          AI Assistant
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Ask questions about your documents. Try the suggestions below to get started.
        </p>
      </div>

      {/* Messages Area */}
      <div className="flex-1 min-h-0">
        <ScrollArea className="h-full p-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.role === 'assistant' && (
                  <Avatar className="h-8 w-8 bg-gradient-to-r from-blue-600 to-purple-600 ring-2 ring-blue-200">
                    <AvatarFallback className="text-white bg-transparent">
                      <div className="relative">
                        <Brain className="h-4 w-4" />
                        <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                      </div>
                    </AvatarFallback>
                  </Avatar>
                )}
                
                <div className={`max-w-[80%] ${message.role === 'user' ? 'order-last' : ''}`}>
                  <Card className={`${
                    message.role === 'user' 
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white' 
                      : 'bg-gray-50'
                  }`}>
                    <CardContent className="p-3">
                      {message.role === 'assistant' ? (
                        <div className="text-sm leading-relaxed prose prose-sm max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-strong:text-gray-900 prose-code:bg-gray-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-gray-100 prose-pre:border prose-pre:border-gray-200">
                          <ReactMarkdown>{message.content}</ReactMarkdown>
                        </div>
                      ) : (
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">
                          {message.content}
                        </p>
                      )}
                      
                      {message.citations && message.citations.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <p className="text-xs text-gray-600 mb-2">Sources:</p>
                          <div className="flex flex-wrap gap-1">
                            {message.citations.map((citation, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                <FileText className="h-3 w-3 mr-1" />
                                {citation}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  
                  <p className="text-xs text-gray-500 mt-1 px-3">
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>

                {message.role === 'user' && (
                  <Avatar className="h-8 w-8 bg-gray-200 order-last">
                    <AvatarFallback>
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}

            {/* Loading State */}
            {isLoading && (
              <div className="flex gap-3 justify-start">
                <Avatar className="h-8 w-8 bg-gradient-to-r from-blue-600 to-purple-600 ring-2 ring-blue-200">
                  <AvatarFallback className="text-white bg-transparent">
                    <div className="relative">
                      <Brain className="h-4 w-4 animate-pulse" />
                      <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                    </div>
                  </AvatarFallback>
                </Avatar>
                <Card className="bg-gray-50">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                      <LoadingSpinner size="sm" />
                      <span className="text-sm text-gray-600">Thinking...</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Suggested Questions */}
            {messages.length === 1 && (
              <div className="space-y-3">
                <p className="text-sm text-gray-600 font-medium">Try asking:</p>
                <div className="grid grid-cols-1 gap-2">
                  {suggestedQuestions.map((question, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      className="text-left justify-start h-auto p-3 text-sm"
                      onClick={() => setInput(question)}
                    >
                      <Sparkles className="h-4 w-4 mr-2 text-purple-600" />
                      {question}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div ref={messagesEndRef} />
        </ScrollArea>
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-gray-200">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question about your documents..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button type="submit" disabled={isLoading || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  )
}