import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { VectorStoreIndex, MetadataMode } from 'llamaindex'
import { getIndex } from '@/lib/document-store'

export async function POST(request: NextRequest) {
  console.log('\n💬 Chat request received...')
  
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      console.log('❌ No session found')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { message, folderId, history } = await request.json()
    console.log(`📝 Message: "${message}"`)
    console.log(`📂 Folder ID: ${folderId}`)
    console.log(`📚 History length: ${history?.length || 0}`)

    // Handle function warmup requests
    if (message === 'warmup') {
      console.log('🔥 Function warmup request received - initializing chat function...')
      
      // Try to get the index (this initializes everything)
      const index = getIndex(folderId)
      
      if (index) {
        console.log('✅ Function warmed successfully - index found and loaded')
        return NextResponse.json({ 
          response: 'Function warmed successfully',
          warmed: true 
        })
      } else {
        console.log('⚠️ Function warmed but index not yet available (timing)')
        return NextResponse.json({ 
          response: 'Function warmed, index pending',
          warmed: true 
        }, { status: 404 })
      }
    }

    if (!message || !folderId) {
      console.log('❌ Missing message or folderId')
      return NextResponse.json({ error: 'Message and folderId are required' }, { status: 400 })
    }

    // Get the document index for this folder
    const index = getIndex(folderId)
    
    if (!index) {
      console.log('❌ No index found for this folder - likely serverless cold start')
      return NextResponse.json({ 
        error: 'Your folder index was not found. This can happen in serverless environments when the server restarts. Please process your folder again to continue chatting.',
        code: 'INDEX_NOT_FOUND',
        needsReprocessing: true
      }, { status: 404 })
    }

    console.log('✅ Index found, creating retriever and query engine...')

    // Use hybrid approach: retriever for metadata + query engine for response
    // 1. Create retriever directly from index to get metadata-preserved nodes
    const retriever = index.asRetriever({
      similarityTopK: 5
    })

    // 2. Also create query engine for response generation
    const queryEngine = index.asQueryEngine({
      similarityTopK: 5
    })

    console.log('✅ Retriever and query engine created')

    // Build context from conversation history - but separate retrieval from response context
    let contextualMessage = message
    let retrievalQuery = message  // Use ONLY the current question for retrieval
    
    if (history && history.length > 0) {
      const recentHistory = history.slice(-4) // Last 4 messages for context
      const conversationContext = recentHistory
        .map((msg: any) => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
        .join('\n')
      
      // Only use context for response generation, NOT for retrieval
      contextualMessage = `Previous conversation:\n${conversationContext}\n\nCurrent question: ${message}`
      console.log('📝 Using contextual message for RESPONSE generation only')
      console.log('🔍 Using original message for RETRIEVAL only')
    }

    console.log('🤖 Retrieving relevant nodes and generating response...')
    
    // Debug: Log the actual queries being sent
    console.log('🔍 DEBUGGING QUERIES:')
    console.log(`  Original message: "${message}"`)
    console.log(`  Retrieval query: "${retrievalQuery}"`)
    console.log(`  Response context length: ${contextualMessage.length}`)

    // 1. Get nodes with metadata from retriever using ONLY the current question
    const nodesWithScore = await retriever.retrieve({
      query: retrievalQuery  // Use clean query without conversation history
    })

    // 2. Get response from query engine using contextual message  
    const response = await queryEngine.query({
      query: contextualMessage  // Use full context for better response
    })

    console.log('✅ Retrieval and response completed')
    console.log(`📄 Retrieved ${nodesWithScore.length} nodes via retriever`)
    console.log(`📄 Response length: ${response.response?.length || 0} characters`)

    // Debug: Check metadata on retrieved nodes from direct retriever
    console.log('🔍 Debugging retriever nodes metadata:')
    nodesWithScore.forEach((nodeWithScore, index) => {
      console.log(`  Retriever Node ${index + 1}:`)
      console.log(`    NodeId: ${nodeWithScore.node.id_}`)
      console.log(`    Metadata keys: ${Object.keys(nodeWithScore.node.metadata || {}).join(', ')}`)
      console.log(`    fileName: ${nodeWithScore.node.metadata?.fileName}`)
      console.log(`    Score: ${nodeWithScore.score}`)
      console.log(`    Content preview: "${nodeWithScore.node.getContent(MetadataMode.NONE).substring(0, 200)}..."`)
      console.log(`    Content length: ${nodeWithScore.node.getContent(MetadataMode.NONE).length}`)
    })

    // Enhanced citation extraction with in-text citation generation
    const citations: string[] = []
    const inTextCitations: { [key: string]: string } = {} // Map filename to citation number
    const seenFileNames = new Set<string>()
    let citationCounter = 1
    
    console.log('📚 Processing nodes for enhanced citations...')
    
    for (const nodeWithScore of nodesWithScore) {
      const node = nodeWithScore.node
      const score = nodeWithScore.score || 0
      
      console.log('🔍 Debugging retriever node for citation:', {
        nodeId: node.id_,
        metadata: node.metadata,
        metadataKeys: Object.keys(node.metadata || {}),
        score: score,
        scorePercentage: `${(score * 100).toFixed(1)}%`
      })
      
      // Skip nodes with low relevance scores (below 70% to filter out weak semantic matches)
      if (score < 0.70) {
        console.log(`⚠️ Skipping node with low relevance: ${(score * 100).toFixed(1)}%`)
        continue
      }
      
      console.log(`✅ Node passes relevance threshold: ${(score * 100).toFixed(1)}%`)
      
      // Extract filename from metadata using preserved metadata from retriever
      let fileName = ''
      
      if (node.metadata && Object.keys(node.metadata).length > 0) {
        // Try multiple metadata field names for maximum compatibility
        fileName = node.metadata.fileName || 
                  node.metadata.file_name ||
                  node.metadata.filename ||
                  node.metadata.name ||
                  node.metadata.source ||
                  node.metadata.title ||
                  node.metadata.originalFileName
        
        if (fileName) {
          console.log(`✅ Found filename in retriever node metadata: ${fileName}`)
        } else {
          console.log('⚠️ No filename found in metadata fields:', Object.keys(node.metadata))
        }
      } else {
        console.log('⚠️ No metadata found on retriever node')
      }
      
      // Fallback to node ID if no filename found
      if (!fileName) {
        fileName = `Document ${node.id_?.slice(0, 8) || 'Unknown'}`
        console.log(`⚠️ Using fallback filename: ${fileName}`)
      }
      
      // Skip if we've already seen this filename (deduplicate)
      if (seenFileNames.has(fileName)) {
        console.log(`⚠️ Skipping duplicate filename: ${fileName}`)
        continue
      }
      
      // Assign citation number and store mapping
      const citationNumber = `[${citationCounter}]`
      inTextCitations[fileName] = citationNumber
      citationCounter++
      
      // Add score information for better transparency
      const scoreText = nodeWithScore.score !== undefined ? `(relevance: ${(nodeWithScore.score * 100).toFixed(1)}%)` : '(relevance: unknown)'
      const citationWithScore = `${fileName} ${scoreText}`
      
      seenFileNames.add(fileName)
      citations.push(`${citationNumber} ${citationWithScore}`)
      console.log(`✅ Added unique citation: ${citationNumber} ${citationWithScore}`)
    }
    
    // Generate clean response without duplicate source information
    // The citations array will be handled by the component separately
    const enhancedResponse = response.response // Keep original response clean
    
    if (citations.length > 0) {
      console.log('✅ Citations prepared for component rendering')
    }

    const result = {
      response: enhancedResponse,
      citations: citations.slice(0, 5) // Limit to 5 citations
    }

    console.log('✅ Chat response prepared successfully')
    return NextResponse.json(result)

  } catch (error) {
    console.error('\n💥 Chat error:', error)
    
    if (error instanceof Error) {
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
      
      if (error.message.includes('API key')) {
        console.log('🔑 OpenAI API key issue detected')
        return NextResponse.json({ 
          error: 'OpenAI API configuration error. Please check your API key.' 
        }, { status: 500 })
      }
    }

    return NextResponse.json({ 
      error: 'An error occurred while processing your question. Please try again.' 
    }, { status: 500 })
  }
}