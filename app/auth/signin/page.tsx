'use client'

import { signIn, getSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Chrome, FileText, MessageCircle, Zap } from 'lucide-react'

export default function SignIn() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const checkSession = async () => {
      const session = await getSession()
      if (session) {
        router.push('/')
      }
    }
    checkSession()
  }, [router])

  const handleGoogleSignIn = async () => {
    setLoading(true)
    try {
      const result = await signIn('google', { 
        callbackUrl: '/',
        redirect: false 
      })
      if (result?.ok) {
        router.push('/')
      }
    } catch (error) {
      console.error('Sign in error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-3 rounded-full">
              <FileText className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Talk-to-a-Folder</h1>
          <p className="text-gray-600">Chat with your Google Drive documents using AI</p>
        </div>

        <Card className="backdrop-blur-sm bg-white/70 border-white/20 shadow-xl">
          <CardHeader className="text-center">
            <CardTitle className="text-xl font-semibold">Welcome Back</CardTitle>
            <CardDescription>
              Sign in with Google to access your Drive folders and start chatting
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <Chrome className="h-4 w-4 text-blue-600" />
                </div>
                <span>Secure Google OAuth authentication</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <FileText className="h-4 w-4 text-green-600" />
                </div>
                <span>Access your Google Drive folders</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                  <MessageCircle className="h-4 w-4 text-purple-600" />
                </div>
                <span>AI-powered document conversations</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                  <Zap className="h-4 w-4 text-orange-600" />
                </div>
                <span>Instant answers with citations</span>
              </div>
            </div>

            <Button 
              onClick={handleGoogleSignIn} 
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium py-2.5 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  Signing in...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Chrome className="h-4 w-4" />
                  Continue with Google
                </div>
              )}
            </Button>

            <p className="text-xs text-gray-500 text-center">
              By signing in, you agree to our terms of service and privacy policy.
              We only request read-only access to your Google Drive.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}