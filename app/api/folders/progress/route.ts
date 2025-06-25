import { NextRequest } from 'next/server'

// Store for progress updates - in production, use Redis or similar
const progressStore = new Map<string, string[]>()

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const folderId = searchParams.get('folderId')

  if (!folderId) {
    return new Response('Missing folderId', { status: 400 })
  }

  // Set up Server-Sent Events
  const stream = new ReadableStream({
    start(controller) {
      const sendUpdate = (message: string) => {
        controller.enqueue(`data: ${JSON.stringify({ message, timestamp: Date.now() })}\n\n`)
      }

      // Send initial message
      sendUpdate('🔗 Connected to progress stream...')

      // Send any existing progress for this folder
      const existingProgress = progressStore.get(folderId) || []
      existingProgress.forEach(message => sendUpdate(message))

      // Set up interval to check for new progress
      const interval = setInterval(() => {
        const currentProgress = progressStore.get(folderId) || []
        if (currentProgress.length > existingProgress.length) {
          // Send new messages
          const newMessages = currentProgress.slice(existingProgress.length)
          newMessages.forEach(message => sendUpdate(message))
          existingProgress.push(...newMessages)
        }

        // Clean up if processing is complete
        if (currentProgress.some(msg => msg.includes('🎉 Folder processing completed'))) {
          sendUpdate('✅ Processing complete!')
          clearInterval(interval)
          controller.close()
        }
      }, 100) // Check every 100ms

      // Clean up on connection close
      request.signal.addEventListener('abort', () => {
        clearInterval(interval)
        controller.close()
      })
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}

// Helper function to add progress update
export function addProgressUpdate(folderId: string, message: string) {
  if (!progressStore.has(folderId)) {
    progressStore.set(folderId, [])
  }
  const progress = progressStore.get(folderId)!
  progress.push(message)
  
  // Keep only last 100 messages to prevent memory issues
  if (progress.length > 100) {
    progress.splice(0, progress.length - 100)
  }
}

// Helper function to clear progress
export function clearProgress(folderId: string) {
  progressStore.delete(folderId)
} 