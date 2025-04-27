export type ApiProvider = 'openai' | 'ollama' | 'custom';

// API 提供商帮助信息
export const API_HELP: Record<ApiProvider, string> = {
    openai: '使用 OpenAI API，例如 GPT-4',
    ollama: '使用本地运行的 Ollama 服务',
    custom: '配置自定义 API 端点'
};
  
// 默认 API URLs
export const API_URLS: Record<ApiProvider, string> = {
    openai: 'https://api.openai.com/v1/chat/completions',
    ollama: 'http://localhost:11434/api/generate',  // 确保使用 /api/generate 端点
    custom: ''
};

export const PROVIDER_KEY: Record<ApiProvider, ApiProvider> = {
    openai: 'openai',
    ollama: 'ollama',
    custom: 'custom'
};

// 默认 API URLs
export const DEFAULT_LLM: Record<string, string> = {
    provider: PROVIDER_KEY.openai,
    apiUrl: API_URLS.openai,
    apiKey: '',
    model: 'gpt-4'
};

// 默认 API URLs
export const DEFAULT_OLLAMA_LLM: Record<string, string> = {
    provider: PROVIDER_KEY.ollama,
    apiUrl: API_URLS.ollama,
    apiKey: '',
    model: 'llama2'
};