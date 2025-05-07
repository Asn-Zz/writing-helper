export type ApiProvider = 'openai' | 'ollama' | 'custom';

// API 提供商帮助信息
export const API_HELP: Record<ApiProvider, string> = {
    openai: '使用 OpenAI API，例如 GPT-4',
    ollama: '使用本地运行的 Ollama 服务',
    custom: '配置自定义 API 端点'
};

// 默认提供商
export const OPENAI_API: Record<string, string> = {
    URL: 'https://api.openai.com/v1/chat/completions',
    KEY: '',
    MODEL: 'gpt-4'
};

// 默认提供商
export const OLLAMA_API: Record<string, string> = {
    URL: 'http://localhost:11434/api/generate',
    KEY: '',
    MODEL: 'llama2'
};
  
// 默认 API URLs
export const API_URLS: Record<ApiProvider, string> = {
    openai: OPENAI_API.URL,
    ollama: OLLAMA_API.URL,
    custom: ''
};

export const PROVIDER_KEY: Record<ApiProvider, ApiProvider> = {
    openai: 'openai',
    ollama: 'ollama',
    custom: 'custom'
};

// 默认 API URLs
export const DEFAULT_LLM = {
    apiProvider: PROVIDER_KEY.openai as ApiProvider,
    apiUrl: OPENAI_API.URL,
    apiKey: OPENAI_API.KEY,
    model: OPENAI_API.MODEL
};

// 默认 API URLs
export const DEFAULT_ADMIN_LLM = {
    apiProvider: PROVIDER_KEY.openai,
    apiUrl: process.env.NEXT_PUBLIC_OPENAI_API_URL || OPENAI_API.URL,
    apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY || OPENAI_API.KEY,
    model: process.env.NEXT_PUBLIC_OPENAI_MODEL || OPENAI_API.MODEL
};

// 默认 API URLs
export const DEFAULT_OLLAMA_LLM = {
    apiProvider: PROVIDER_KEY.ollama,
    apiUrl: process.env.NEXT_PUBLIC_OLLAMA_API_URL || OLLAMA_API.URL,
    apiKey: '',
    model: process.env.NEXT_PUBLIC_OLLAMA_MODEL || OLLAMA_API.MODEL
};