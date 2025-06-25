'use client'

import { useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { FolderInput } from './folder-input'
import { ChatInterface } from './chat-interface'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { FileText, LogOut, MessageCircle, Folder } from 'lucide-react'

export function MainApp() {
  const { data: session } = useSession()
  const [folderId, setFolderId] = useState<string | null>(null)
  const [folderName, setFolderName] = useState<string>('')
  const [isIndexing, setIsIndexing] = useState(false)

  const handleFolderProcessed = (id: string, name: string) => {
    setFolderId(id)
    setFolderName(name)
  }

  const handleReset = () => {
    setFolderId(null)
    setFolderName('')
    setIsIndexing(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <header className="bg-white/70 backdrop-blur-sm border-b border-white/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-2 rounded-lg">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Talk-to-a-Folder</h1>
                {folderName && (
                  <p className="text-sm text-gray-600 flex items-center gap-1">
                    <Folder className="h-3 w-3" />
                    {folderName}
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={session?.user?.image || ''} alt={session?.user?.name || ''} />
                  <AvatarFallback>{session?.user?.name?.[0]}</AvatarFallback>
                </Avatar>
                <div className="hidden sm:block">
                  <p className="text-sm font-medium text-gray-900">{session?.user?.name}</p>
                  <p className="text-xs text-gray-500">{session?.user?.email}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => signOut({ callbackUrl: '/auth/signin' })}
                className="text-gray-600 hover:text-gray-900"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!folderId ? (
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Start Chatting with Your Documents
              </h2>
              <p className="text-lg text-gray-600">
                Paste a Google Drive folder link to begin analyzing your documents with AI
              </p>
            </div>

            <Card className="backdrop-blur-sm bg-white/70 border-white/20 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Folder className="h-5 w-5" />
                  Google Drive Folder
                </CardTitle>
                <CardDescription>
                  Make sure your folder is publicly accessible or shared with your Google account
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FolderInput 
                  onFolderProcessed={handleFolderProcessed}
                  isIndexing={isIndexing}
                  setIsIndexing={setIsIndexing}
                />
              </CardContent>
            </Card>

            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="text-center">
                <CardContent className="pt-6">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FileText className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="font-semibold mb-2">Supported Files</h3>
                  <p className="text-sm text-gray-600">PDFs, Google Docs/Sheets/Slides, Word, Excel, CSV, TXT</p>
                </CardContent>
              </Card>
              <Card className="text-center">
                <CardContent className="pt-6">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MessageCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <h3 className="font-semibold mb-2">AI Conversations</h3>
                  <p className="text-sm text-gray-600">Ask questions about your documents</p>
                </CardContent>
              </Card>
              <Card className="text-center">
                <CardContent className="pt-6">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FileText className="h-6 w-6 text-purple-600" />
                  </div>
                  <h3 className="font-semibold mb-2">Source Citations</h3>
                  <p className="text-sm text-gray-600">Get references to original files</p>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Chat with Documents</h2>
                <p className="text-gray-600">Ask questions about the content in your folder</p>
              </div>
              <Button onClick={handleReset} variant="outline">
                <Folder className="h-4 w-4 mr-2" />
                Change Folder
              </Button>
            </div>
            
            <div className="h-[calc(100vh-200px)]">
              <ChatInterface folderId={folderId} />
            </div>
          </div>
        )}
      </main>
    </div>
  )
}