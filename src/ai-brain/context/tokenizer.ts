// Approximate tokenizer: ~4 chars per token for English text.
// Production systems would plug in tiktoken; this keeps zero dependencies
// while remaining monotonic and safe for budgeting.
export function estimateTokens(text: string): number {
  if (!text) return 0;
  const chars = text.length;
  const words = text.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(Math.max(chars / 4, words * 0.75)));
}

export function estimateMessagesTokens(messages: Array<{ content: string }>): number {
  // +3 tokens per message overhead (role markers), matching OpenAI guidance.
  return messages.reduce((sum, m) => sum + estimateTokens(m.content) + 3, 0) + 3;
}
