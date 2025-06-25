'use client'

import { useState } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Progress } from './ui/progress'
import { LoadingSpinner } from './ui/loading-spinner'
import { toast } from 'sonner'
import { Folder, Link, CheckCircle, AlertCircle } from 'lucide-react'

interface FolderInputProps {
  onFolderProcessed: (folderId: string, folderName: string) => void
  isIndexing: boolean
  setIsIndexing: (indexing: boolean) => void
}

export function FolderInput({ onFolderProcessed, isIndexing, setIsIndexing }: FolderInputProps) {
  const [folderUrl, setFolderUrl] = useState('')
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState<string>('')
  const [progressLogs, setProgressLogs] = useState<string[]>([])
  const [isRetrying, setIsRetrying] = useState(false)
  const [lastFailedFolderId, setLastFailedFolderId] = useState<string | null>(null)

  const extractFolderId = (url: string): string | null => {
    const regex = /\/folders\/([a-zA-Z0-9-_]+)/
    const match = url.match(regex)
    return match ? match[1] : null
  }

  const processFolder = async (folderId: string, isRetry: boolean = false) => {
    setIsIndexing(true)
    setProgress(0)
    setStatus('Initializing...')
    setProgressLogs([])
    
    const eventSourceRef = { current: null as EventSource | null }

    try {
      // Start the processing request first
      const processingPromise = fetch('/api/folders/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ folderId }),
      })

      // Wait a moment before connecting to progress stream to avoid race condition
      setTimeout(() => {
        // Set up Server-Sent Events for real-time progress
        eventSourceRef.current = new EventSource(`/api/folders/progress?folderId=${folderId}`)
        let currentProgress = 0
        
        eventSourceRef.current.onmessage = (event) => {
          const data = JSON.parse(event.data)
          const message = data.message
          
          setProgressLogs(prev => [...prev, message])
          setStatus(message)
          
          // Update progress based on key milestones
          if (message.includes('🔐 Connecting')) currentProgress = 10
          else if (message.includes('📋 Fetching folder')) currentProgress = 20
          else if (message.includes('📄 Found') && message.includes('files')) currentProgress = 30
          else if (message.includes('🔄 Starting document')) currentProgress = 40
          else if (message.includes('Processing file')) {
            // Extract file number for granular progress
            const match = message.match(/(\d+)\/(\d+)/)
            if (match) {
              const current = parseInt(match[1])
              const total = parseInt(match[2])
              currentProgress = 40 + ((current / total) * 30) // 40-70% for file processing
            }
          }
          else if (message.includes('🧠 Creating vector')) currentProgress = 80
          else if (message.includes('✅ Vector index created')) currentProgress = 90
          else if (message.includes('🎉 Folder processing completed')) currentProgress = 100
          
          setProgress(currentProgress)
        }
        
        eventSourceRef.current.onerror = () => {
          console.warn('EventSource error occurred')
          eventSourceRef.current?.close()
        }
      }, 500) // 500ms delay to ensure processing starts first
      
      const response = await processingPromise

      eventSourceRef.current?.close()

      if (!response.ok) {
        const error = await response.json()
        
        // Handle specific error types
        if (response.status === 401) {
          throw new Error('Authentication failed. Please sign in again.')
        } else if (response.status === 404) {
          throw new Error('Folder not found. Please check the URL and permissions.')
        } else if (error.error?.includes('serverless cold start')) {
          throw new Error('Index was lost due to server restart. Please try processing again.')
        } else {
          throw new Error(error.error || error.message || 'Failed to process folder')
        }
      }

      const data = await response.json()
      
      setProgress(100)
      setStatus('Folder indexed successfully!')
      setLastFailedFolderId(null) // Clear failed folder ID on success
      
      setTimeout(() => {
        onFolderProcessed(folderId, data.folderName)
        setIsIndexing(false)
        
        if (isRetry) {
          toast.success('Retry successful! Folder processed.')
        } else {
          toast.success('Folder processed successfully!')
        }
      }, 1000)

    } catch (error) {
      console.error('Error processing folder:', error)
      
      eventSourceRef.current?.close()
      
      setIsIndexing(false)
      setProgress(0)
      setStatus('')
      setLastFailedFolderId(folderId) // Store failed folder ID for retry
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to process folder'
      
      if (isRetry) {
        toast.error(`Retry failed: ${errorMessage}`)
      } else {
        toast.error(errorMessage, {
          action: {
            label: 'Retry',
            onClick: () => handleRetry(folderId)
          },
          duration: 8000 // Longer duration for retry option
        })
      }
    }
  }

  const handleRetry = async (folderId: string) => {
    setIsRetrying(true)
    toast.info('Retrying folder processing...')
    await processFolder(folderId, true)
    setIsRetrying(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!folderUrl.trim()) {
      toast.error('Please enter a folder URL')
      return
    }

    const folderId = extractFolderId(folderUrl)
    if (!folderId) {
      toast.error('Invalid Google Drive folder URL')
      return
    }

    await processFolder(folderId, false)
  }

  if (isIndexing) {
    return (
      <Card className="w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <LoadingSpinner size="lg" className="text-blue-600" />
            </div>
          </div>
          <CardTitle>Processing Your Folder</CardTitle>
          <CardDescription>
            We're indexing your documents to enable AI conversations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">{status}</span>
              <span className="text-gray-600">{progress}%</span>
            </div>
            <Progress value={progress} className="w-full" />
          </div>
          
          {/* Real-time progress logs */}
          <div className="bg-gray-50 p-4 rounded-lg max-h-60 overflow-y-auto">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Processing Log:</h4>
            <div className="space-y-1 text-xs font-mono">
              {progressLogs.map((log, index) => (
                <div key={index} className="text-gray-700">
                  {log}
                </div>
              ))}
              {progressLogs.length === 0 && (
                <div className="text-gray-500">Waiting for updates...</div>
              )}
            </div>
          </div>
          
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-800">
              This may take a few minutes depending on the number of documents in your folder.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="folder-url" className="text-sm font-medium text-gray-700">
          Google Drive Folder URL
        </label>
        <div className="relative">
          <Link className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            id="folder-url"
            type="url"
            placeholder="https://drive.google.com/drive/folders/..."
            value={folderUrl}
            onChange={(e) => setFolderUrl(e.target.value)}
            className="pl-10"
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
          <Folder className="h-4 w-4 mr-2" />
          Process Folder
        </Button>
        
        {lastFailedFolderId && (
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => handleRetry(lastFailedFolderId)}
            disabled={isRetrying}
            className="w-full"
          >
            {isRetrying ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Retrying...
              </>
            ) : (
              <>
                <AlertCircle className="h-4 w-4 mr-2" />
                Retry Last Failed Processing
              </>
            )}
          </Button>
        )}
      </div>

      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          How to get your folder URL:
        </h4>
        <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
          <li>Open Google Drive in your browser</li>
          <li>Navigate to the folder you want to analyze</li>
          <li>Click "Share" and make sure it's accessible</li>
          <li>Copy the folder URL from your browser's address bar</li>
          <li>Paste it above and click "Process Folder"</li>
        </ol>
      </div>
    </form>
  )
}