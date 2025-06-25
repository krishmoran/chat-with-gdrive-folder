import { VectorStoreIndex } from 'llamaindex'

// Use global singleton pattern for Next.js hot reloading
// This ensures the same Map instance is shared across all compilations
declare global {
  var __documentIndices: Map<string, VectorStoreIndex> | undefined
}

// Shared in-memory storage for document indices
// In production, this should use Redis or a database
export const documentIndices = globalThis.__documentIndices ?? new Map<string, VectorStoreIndex>()

if (process.env.NODE_ENV === 'development') {
  globalThis.__documentIndices = documentIndices
}

export function storeIndex(folderId: string, index: VectorStoreIndex) {
  documentIndices.set(folderId, index)
  console.log(`💾 Index stored for folder: ${folderId}`)
  console.log(`📊 Total stored indices: ${documentIndices.size}`)
  console.log(`🔍 All stored folder IDs: [${Array.from(documentIndices.keys()).join(', ')}]`)
}

export function getIndex(folderId: string): VectorStoreIndex | undefined {
  const index = documentIndices.get(folderId)
  console.log(`🔍 Looking for index for folder: ${folderId}`)
  console.log(`📊 Available indices: ${Array.from(documentIndices.keys()).join(', ')}`)
  console.log(`📊 Map size: ${documentIndices.size}`)
  console.log(`✅ Index found: ${index ? 'Yes' : 'No'}`)
  return index
}

export function listIndices(): string[] {
  return Array.from(documentIndices.keys())
} 