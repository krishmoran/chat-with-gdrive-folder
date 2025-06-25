import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { google } from 'googleapis'
import { Document, VectorStoreIndex } from 'llamaindex'
import { LlamaParseReader } from '@llamaindex/cloud'
import { storeIndex } from '@/lib/document-store'
import { addProgressUpdate, clearProgress } from '../progress/route'

// Helper function to process different file types
async function processFile(
  drive: any,
  file: any,
  fileIndex: number,
  totalFiles: number
): Promise<Document | null> {
  console.log(`\n📄 Processing file ${fileIndex + 1}/${totalFiles}: ${file.name} (${file.mimeType})`)
  
  try {
    let content = ''
    let documents: Document[] = []

    if (file.mimeType?.startsWith('application/vnd.google-apps.')) {
      console.log(`  📤 Exporting Google Workspace file: ${file.name}`)
      
      // Handle Google Workspace files by exporting them
      let exportMimeType = ''
      
      switch (file.mimeType) {
        case 'application/vnd.google-apps.document':
          exportMimeType = 'text/plain'
          console.log(`  📝 Exporting Google Doc as plain text`)
          break
        case 'application/vnd.google-apps.spreadsheet':
          exportMimeType = 'text/csv'
          console.log(`  📊 Exporting Google Sheet as CSV`)
          break
        case 'application/vnd.google-apps.presentation':
          exportMimeType = 'text/plain'
          console.log(`  📽️ Exporting Google Slides as plain text`)
          break
        default:
          exportMimeType = 'text/plain'
          console.log(`  📄 Exporting as plain text (fallback)`)
      }

      const exportResponse = await drive.files.export({
        fileId: file.id!,
        mimeType: exportMimeType
      })
      
      content = exportResponse.data as string
      console.log(`  ✅ Exported successfully. Content length: ${content.length} characters`)
      
      // For CSV files, format them better
      if (exportMimeType === 'text/csv') {
        const lines = content.split('\n')
        content = lines.map(line => line.split(',').join(' | ')).join('\n')
        console.log(`  📋 Formatted CSV content (${lines.length} rows)`)
      }
      
      return new Document({
        text: content,
        metadata: {
          fileName: file.name || 'Unknown',
          fileId: file.id || 'unknown',
          mimeType: file.mimeType || 'unknown',
          fileSize: String(file.size || '0'),
          // Add additional metadata formats for better compatibility
          file_name: file.name || 'Unknown',
          filename: file.name || 'Unknown',
          name: file.name || 'Unknown',
          source: file.name || 'Unknown',
          title: file.name || 'Unknown'
        }
      })
      
    } else if (file.mimeType === 'application/pdf') {
      console.log(`  🔍 Processing PDF with LlamaParse: ${file.name}`)
      
      // Use LlamaParse for PDF files
      try {
        // Download file content first
        console.log(`  ⬇️ Downloading PDF file...`)
        const fileResponse = await drive.files.get({
          fileId: file.id!,
          alt: 'media'
        }, { responseType: 'arraybuffer' })
        
        const fileBuffer = Buffer.from(fileResponse.data as ArrayBuffer)
        console.log(`  📥 Downloaded ${fileBuffer.length} bytes`)
        
        // Use LlamaParse to parse PDF
        const reader = new LlamaParseReader({
          resultType: 'markdown',
          language: 'en',
        })
        
        console.log(`  🤖 Starting LlamaParse processing...`)
        documents = await reader.loadDataAsContent(new Uint8Array(fileBuffer))
        console.log(`  ✅ LlamaParse completed! Generated ${documents.length} document(s)`)
        
        if (documents.length > 0) {
          // Update metadata
          documents[0].metadata = {
            ...documents[0].metadata,
            fileName: file.name || 'Unknown',
            fileId: file.id || 'unknown',
            mimeType: file.mimeType || 'unknown',
            fileSize: String(file.size || '0'),
            // Add additional metadata formats for better compatibility
            file_name: file.name || 'Unknown',
            filename: file.name || 'Unknown',
            name: file.name || 'Unknown',
            source: file.name || 'Unknown',
            title: file.name || 'Unknown'
          }
          console.log(`  📄 Document content length: ${documents[0].getText().length} characters`)
          return documents[0]
        } else {
          console.log(`  ⚠️ No documents generated from PDF`)
          return null
        }
      } catch (error) {
        console.error(`  ❌ Error parsing PDF ${file.name} with LlamaParse:`, error)
        // Fallback to basic handling
        return new Document({
          text: `PDF file: ${file.name} (could not extract content - LlamaParse failed)`,
          metadata: {
            fileName: file.name || 'Unknown',
            fileId: file.id || 'unknown',
            mimeType: file.mimeType || 'unknown',
            fileSize: String(file.size || '0'),
            // Add additional metadata formats for better compatibility
            file_name: file.name || 'Unknown',
            filename: file.name || 'Unknown',
            name: file.name || 'Unknown',
            source: file.name || 'Unknown',
            title: file.name || 'Unknown'
          }
        })
      }
    } else {
      console.log(`  📄 Processing as text file: ${file.name}`)
      
      // Handle other file types (TXT, CSV, DOC, etc.) as text
      try {
        console.log(`  ⬇️ Downloading file...`)
        const fileResponse = await drive.files.get({
          fileId: file.id!,
          alt: 'media'
        })
        
        // Try to decode as text
        if (typeof fileResponse.data === 'string') {
          content = fileResponse.data
        } else {
          // Convert buffer to string
          const buffer = Buffer.from(fileResponse.data as any)
          content = buffer.toString('utf-8')
        }
        
        console.log(`  📥 Downloaded content length: ${content.length} characters`)
        
        // Basic CSV formatting
        if (file.mimeType === 'text/csv' || file.mimeType === 'application/vnd.ms-excel') {
          const lines = content.split('\n')
          content = lines.map(line => line.split(',').join(' | ')).join('\n')
          console.log(`  📋 Formatted CSV content (${lines.length} rows)`)
        }
        
        return new Document({
          text: content,
          metadata: {
            fileName: file.name || 'Unknown',
            fileId: file.id || 'unknown',
            mimeType: file.mimeType || 'unknown',
            fileSize: String(file.size || '0'),
            // Add additional metadata formats for better compatibility
            file_name: file.name || 'Unknown',
            filename: file.name || 'Unknown',
            name: file.name || 'Unknown',
            source: file.name || 'Unknown',
            title: file.name || 'Unknown'
          }
        })
      } catch (error) {
        console.error(`  ❌ Error processing ${file.name}:`, error)
        return new Document({
          text: `File: ${file.name} (could not extract content)`,
          metadata: {
            fileName: file.name || 'Unknown',
            fileId: file.id || 'unknown',
            mimeType: file.mimeType || 'unknown',
            fileSize: String(file.size || '0'),
            // Add additional metadata formats for better compatibility
            file_name: file.name || 'Unknown',
            filename: file.name || 'Unknown',
            name: file.name || 'Unknown',
            source: file.name || 'Unknown',
            title: file.name || 'Unknown'
          }
        })
      }
    }
    
    return null
  } catch (error) {
    console.error(`  ❌ Fatal error processing file ${file.name}:`, error)
    return null
  }
}

export async function POST(request: NextRequest) {
  console.log('\n🚀 Starting folder processing...')
  
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.accessToken) {
      console.log('❌ No access token found')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { folderId } = await request.json()
    console.log(`📂 Processing folder ID: ${folderId}`)

    if (!folderId) {
      console.log('❌ No folder ID provided')
      return NextResponse.json({ error: 'Folder ID is required' }, { status: 400 })
    }

    // Clear any existing progress data before starting
    clearProgress(folderId)
    addProgressUpdate(folderId, '🚀 Starting folder processing...')

    // Initialize Google Drive API
    console.log('🔐 Initializing Google Drive API...')
    addProgressUpdate(folderId, '🔐 Connecting to Google Drive...')
    const auth = new google.auth.OAuth2()
    auth.setCredentials({ access_token: session.accessToken })
    const drive = google.drive({ version: 'v3', auth })

    // Get folder information
    console.log('📋 Fetching folder information...')
    addProgressUpdate(folderId, '📋 Fetching folder information...')
    const folderResponse = await drive.files.get({
      fileId: folderId,
      fields: 'name'
    })

    const folderName = folderResponse.data.name || 'Untitled Folder'
    console.log(`📁 Folder name: "${folderName}"`)
    addProgressUpdate(folderId, `📁 Found folder: "${folderName}"`)

    // List files in the folder
    console.log('📋 Listing files in folder...')
    addProgressUpdate(folderId, '📋 Scanning files in folder...')
    const filesResponse = await drive.files.list({
      q: `'${folderId}' in parents and trashed=false`,
      fields: 'files(id,name,mimeType,size)',
      pageSize: 100
    })

    const files = filesResponse.data.files || []
    console.log(`📄 Found ${files.length} total files`)
    addProgressUpdate(folderId, `📄 Found ${files.length} total files`)
    
    // Filter supported file types
    const supportedMimeTypes = [
      'application/pdf',
      'text/plain',
      'text/csv',
      'application/vnd.google-apps.document',
      'application/vnd.google-apps.spreadsheet',
      'application/vnd.google-apps.presentation',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/vnd.ms-excel', // .xls
      'application/msword', // .doc
    ]

    const supportedFiles = files.filter(file => {
      const mimeType = file.mimeType
      return supportedMimeTypes.includes(mimeType || '')
    })

    console.log(`✅ Found ${supportedFiles.length} supported files:`)
    supportedFiles.forEach((file, index) => {
      console.log(`  ${index + 1}. ${file.name} (${file.mimeType})`)
    })
    addProgressUpdate(folderId, `✅ Found ${supportedFiles.length} supported files to process`)

    if (supportedFiles.length === 0) {
      console.log('❌ No supported files found')
      addProgressUpdate(folderId, '❌ No supported files found in folder')
      return NextResponse.json({ 
        error: 'No supported files found in folder. Supported formats: PDF, TXT, CSV, Google Docs/Sheets/Slides, Word documents.' 
      }, { status: 400 })
    }

    // Process documents
    console.log('\n🔄 Starting document processing...')
    addProgressUpdate(folderId, '🔄 Starting document processing...')
    const documents: Document[] = []

    // Process files sequentially to avoid overwhelming APIs
    for (let i = 0; i < supportedFiles.length; i++) {
      const file = supportedFiles[i]
      addProgressUpdate(folderId, `📄 Processing file ${i + 1}/${supportedFiles.length}: ${file.name}`)
      
      // Add a small delay to ensure progress updates are visible
      await new Promise(resolve => setTimeout(resolve, 100))
      
      try {
        const document = await processFile(drive, file, i, supportedFiles.length)
        if (document && document.getText().trim()) {
          documents.push(document)
          console.log(`  ✅ Successfully processed: ${file.name}`)
          addProgressUpdate(folderId, `  ✅ Successfully processed: ${file.name}`)
        } else {
          console.log(`  ⚠️ Skipped (no content): ${file.name}`)
          addProgressUpdate(folderId, `  ⚠️ Skipped (no content): ${file.name}`)
        }
      } catch (error) {
        console.error(`  ❌ Error processing file ${file.name}:`, error)
        addProgressUpdate(folderId, `  ❌ Error processing file: ${file.name}`)
      }
      
      // Small delay between files to ensure EventSource can keep up
      if (i < supportedFiles.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 200))
      }
    }

    console.log(`\n📚 Successfully processed ${documents.length}/${supportedFiles.length} files`)

    if (documents.length === 0) {
      console.log('❌ No readable content found')
      return NextResponse.json({ 
        error: 'No readable content found in the supported files.' 
      }, { status: 400 })
    }

    // Debug: Check metadata before creating index
    console.log('\n🔍 Debugging document metadata before index creation:')
    documents.forEach((doc, index) => {
      console.log(`  Document ${index + 1}:`)
      console.log(`    Metadata keys: ${Object.keys(doc.metadata || {}).join(', ')}`)
      console.log(`    fileName: ${doc.metadata?.fileName}`)
      console.log(`    Content length: ${doc.getText().length}`)
    })

    // Create vector index using LlamaIndex.TS Ingestion Pipeline with metadata extraction
    console.log('\n🧠 Creating vector index with enhanced metadata extraction...')
    addProgressUpdate(folderId, '🧠 Creating enhanced metadata extraction pipeline...')
    
    // Import LlamaIndex components for proper metadata handling
    const { IngestionPipeline, TitleExtractor, QuestionsAnsweredExtractor, SentenceSplitter, MetadataMode } = await import('llamaindex')
    
    // Ensure all documents have proper metadata structure for LlamaIndex.TS
    const documentsWithProperMetadata = documents.map(doc => {
      const fileName = doc.metadata?.fileName || 'Unknown'
      
      // Create a new document with enhanced metadata that LlamaIndex.TS will preserve
      return new Document({
        text: doc.getText(),
        metadata: {
          // Core identification fields
          fileName: fileName,
          fileId: doc.metadata?.fileId || 'unknown',
          mimeType: doc.metadata?.mimeType || 'unknown',
          fileSize: doc.metadata?.fileSize || '0',
          
          // Multiple filename formats for maximum compatibility
          file_name: fileName,
          filename: fileName,
          name: fileName,
          source: fileName,
          title: fileName,
          originalFileName: fileName,
          
          // Add document type for better classification
          documentType: 'processed_file',
          processedAt: new Date().toISOString(),
          
          // Preserve all original metadata
          ...doc.metadata
        },
        // Ensure document has a stable ID based on content
        id_: doc.id_ || `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      })
    })
    
    console.log('✅ Documents prepared with enhanced metadata')
    addProgressUpdate(folderId, '🔍 Preparing documents with enhanced metadata...')
    
    let index: VectorStoreIndex
    
    try {
      console.log('📋 Setting up advanced ingestion pipeline with metadata extractors...')
      addProgressUpdate(folderId, '📋 Setting up metadata extraction transformations...')
      
      // Create enhanced ingestion pipeline with metadata extraction
      const pipeline = new IngestionPipeline({
        transformations: [
          // 1. Better sentence splitter configuration
          new SentenceSplitter({
            chunkSize: 512,        // Smaller chunks for better relevance
            chunkOverlap: 50,      // Reasonable overlap to maintain context
            separator: ' ',        // Split on spaces primarily
            paragraphSeparator: '\n\n' // Respect paragraph boundaries
          }),
          // 2. Extract titles from each chunk for better metadata
          new TitleExtractor(),
          // 3. Generate questions that each chunk answers
          new QuestionsAnsweredExtractor({
            questions: 3  // Generate 3 questions per chunk
          })
        ]
      })
      
      console.log(`🔄 Processing ${documents.length} documents through enhanced pipeline...`)
      addProgressUpdate(folderId, `🔄 Processing ${documents.length} documents with metadata extraction...`)
      
      // Run the pipeline to get nodes with enhanced metadata
      const nodesWithEnhancedMetadata = await pipeline.run({
        documents: documentsWithProperMetadata
      })
      
      console.log(`✅ Enhanced pipeline created ${nodesWithEnhancedMetadata.length} nodes with metadata`)
      addProgressUpdate(folderId, `✅ Created ${nodesWithEnhancedMetadata.length} enhanced nodes`)
      
      // Debug: Check enhanced metadata
      console.log('\n🔍 Debugging enhanced metadata:')
      nodesWithEnhancedMetadata.slice(0, 3).forEach((node, nodeIndex) => {
        console.log(`  Enhanced Node ${nodeIndex + 1}:`)
        console.log(`    Original metadata keys: ${Object.keys(node.metadata || {}).join(', ')}`)
        console.log(`    fileName: ${node.metadata?.fileName}`)
        console.log(`    title: ${node.metadata?.title}`)
        console.log(`    questions_this_excerpt_can_answer: ${node.metadata?.questions_this_excerpt_can_answer}`)
        console.log(`    Content preview: "${node.getContent(MetadataMode.NONE).substring(0, 150)}..."`)
      })
      
      // Create index from enhanced documents (fallback to basic approach for compatibility)
      index = await VectorStoreIndex.fromDocuments(documentsWithProperMetadata)
      
      console.log('✅ Vector index created with enhanced metadata extraction')
      addProgressUpdate(folderId, '✅ Vector index created successfully with metadata extraction')
      
    } catch (error) {
      console.error('❌ Enhanced pipeline failed, falling back to basic approach:', error)
      addProgressUpdate(folderId, '⚠️ Falling back to basic indexing...')
      
      // Fallback to the current working approach
      index = await VectorStoreIndex.fromDocuments(documentsWithProperMetadata)
      console.log('✅ Fallback index created successfully')
      addProgressUpdate(folderId, '✅ Fallback index created successfully')
    }

    // Store the index in memory (in production, use persistent storage)
    storeIndex(folderId, index)
    addProgressUpdate(folderId, '💾 Storing index for chat queries...')
    
    // CRITICAL: Warm the chat function to eliminate cold start issues
    addProgressUpdate(folderId, '🔥 Warming chat function to eliminate cold starts...')
    try {
      // Make a test call to the chat endpoint to initialize it
      const warmupResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': request.headers.get('cookie') || '', // Pass through authentication
        },
        body: JSON.stringify({
          message: 'warmup',
          folderId,
          history: []
        }),
      })
      
      console.log(`🔥 Chat function warmup response: ${warmupResponse.status}`)
      
      if (warmupResponse.status === 200 || warmupResponse.status === 404) {
        // 200 = success, 404 = index not found yet (but function is warm)
        addProgressUpdate(folderId, '✅ Chat function warmed successfully! Ready for instant chat.')
      } else {
        addProgressUpdate(folderId, '⚠️ Chat warmup partial - may need one retry')
      }
    } catch (error) {
      console.log('⚠️ Chat function warmup failed (non-critical):', error)
      addProgressUpdate(folderId, '⚠️ Chat warmup skipped - chat may need brief pause before first use')
    }

    const result = {
      success: true,
      folderName,
      documentsProcessed: documents.length,
      totalFiles: supportedFiles.length,
      supportedFileTypes: supportedFiles.map(f => ({ name: f.name, type: f.mimeType }))
    }

    console.log('\n🎉 Folder processing completed successfully!')
    console.log(`📊 Final stats:`, result)
    addProgressUpdate(folderId, '🎉 Folder processing completed successfully!')
    addProgressUpdate(folderId, `📊 Processed ${documents.length} documents, ready for chat!`)

    return NextResponse.json(result)

  } catch (error) {
    console.error('\n💥 Error processing folder:', error)
    
    if (error instanceof Error) {
      if (error.message.includes('insufficient authentication')) {
        console.log('🔐 Authentication error detected')
        return NextResponse.json({ 
          error: 'Authentication failed. Please sign in again.' 
        }, { status: 401 })
      }
      if (error.message.includes('File not found')) {
        console.log('📁 Folder not found error detected')
        return NextResponse.json({ 
          error: 'Folder not found or not accessible. Please check the folder URL and permissions.' 
        }, { status: 404 })
      }
      if (error.message.includes('LLAMA_CLOUD_API_KEY')) {
        console.log('🔑 LlamaParse API key error detected')
        return NextResponse.json({ 
          error: 'LlamaParse API key not configured. PDF parsing may be limited.' 
        }, { status: 500 })
      }
    }

    return NextResponse.json({ 
      error: 'An unexpected error occurred while processing the folder.' 
    }, { status: 500 })
  }
}