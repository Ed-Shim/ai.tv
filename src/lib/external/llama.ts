import LlamaAPIClient from 'llama-api-client';

export const client = new LlamaAPIClient({
  apiKey: process.env.LLAMA_API_KEY,
});