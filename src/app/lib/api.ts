"use client";

import { generateDiffMarkup } from "./utils";
import { GenerateRequest, WritingRequest, ApiResponse, PolishRequest, PolishResponse, OcrRequest, OcrResponse } from './types';

export * from './utils';

export async function generate(request: GenerateRequest): Promise<ApiResponse> {
  try {
    const { apiUrl, apiKey, prompt, model, messages, handler, temperature = 0.7 } = request;
    const stream = request.stream ?? true;
    
    // Detect API provider type from URL (simple detection)
    const isOllamaApi = model.includes('ollama') || model.includes('11434');
    
    // Prepare request body based on API provider
    let requestBody: Record<string, unknown>;
    
    if (isOllamaApi) {
      // Ollama API format
      requestBody = {
        model: model || 'llama2',
        prompt,
        stream
      };
      console.log('使用 Ollama API 格式, 生成内容请求:', JSON.stringify(requestBody));
    } else {
      // OpenAI-compatible API format (default)
      requestBody = {
        model: model || 'gpt-4',
        messages,
        stream,
        temperature
      };
      if (request.response_format) {
        requestBody.response_format = request.response_format;
      }
    }
    
    try {
      const proxyResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(requestBody)
      });
      
      if (!proxyResponse.ok) {
        const errorData = await proxyResponse.json().catch(() => ({ error: { message: `代理服务错误: ${proxyResponse.status}` } }));
        throw new Error(errorData.error?.message || `代理服务错误: ${proxyResponse.status}: ${proxyResponse.statusText}`);
      }
      
      if (stream) {
        let content = '';
        if (!proxyResponse.body) {
            throw new Error("Response body is empty for streaming.");
        }
        const reader = proxyResponse.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) {
                break;
            }
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // Keep partial line in buffer

            for (const line of lines) {
                if (line.trim() === '') continue;

                if (isOllamaApi) {
                    try {
                        const parsed = JSON.parse(line);
                        if (parsed.response) {
                            content += parsed.response;
                            handler?.(content);
                        }
                    } catch (e) {
                        console.error("Failed to parse Ollama stream chunk:", line, e);
                    }
                } else { // OpenAI-compatible
                    if (line.startsWith('data: ')) {
                        const jsonStr = line.substring(6);
                        if (jsonStr.trim() === '[DONE]') {
                            continue;
                        }
                        try {
                            const parsed = JSON.parse(jsonStr);
                            if (parsed.choices && parsed.choices[0].delta && parsed.choices[0].delta.content) {
                                content += parsed.choices[0].delta.content;
                                handler?.(content);
                            }
                        } catch (e) {
                            console.error("Failed to parse OpenAI stream chunk:", jsonStr, e);
                        }
                    }
                }
            }
        }
        content = content.replace(/```json\s*|```/g, '').trim();
        return { content };
      } else {
        const data = await proxyResponse.json();      
        // 保存原始响应用于调试
        // console.log('原始 API 响应:', JSON.stringify(data, null, 2));
        
        // 以与测试页面相同的方式尝试不同方法提取内容
        let content = '';
        
        if (data.choices && data.choices.length > 0 && data.choices[0].message && data.choices[0].message.content) {
          // 标准格式
          content = data.choices[0].message.content;
          content = content.replace(/```json\s*|```/g, '').trim();
          console.log('提取内容:', content);
        } else if (data.error) {
          // 有明确的错误信息
          throw new Error(`API 错误: ${data.error.message || JSON.stringify(data.error)}`);
        } else {
          // 无法解析的响应
          throw new Error(`无法从API响应中提取内容: ${JSON.stringify(data)}`);
        }
        
        return { content };
      }
    } catch (proxyError) {
      console.error('请求失败:', proxyError);
      throw proxyError;
    }
  } catch (error) {
    console.error('生成内容错误:', error);
    return {
      content: '',
      error: error instanceof Error ? error.message : '未知错误'
    }
  }
}

export async function generateContent(request: WritingRequest): Promise<ApiResponse> {
  try {
    const { prompt, topic, keywords, wordCount, llmApiUrl, llmApiKey, model } = request;
    
    // Format the prompt template
    const promptTemplate = formatPromptTemplate(topic, keywords, wordCount, prompt);

    const data = await generate({
      apiUrl: llmApiUrl,
      apiKey: llmApiKey,
      model: model || 'gpt-4',
      prompt: promptTemplate,
      messages: [
        {
          role: 'user',
          content: promptTemplate
        }
      ],
      temperature: 0.7,
      stream: false
    })
    
    return data;
  } catch (error) {
    console.error('生成内容错误:', error);
    return {
      content: '',
      error: error instanceof Error ? error.message : '未知错误'
    };
  }
}

export async function generateOcr(request: OcrRequest): Promise<OcrResponse> {
  try {
    const { file, apiUrl, apiKey, model } = request;
    const buffer = Buffer.from(await file.arrayBuffer());
    const payload = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: 'gemini-2.0-flash-exp',
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: "只提取文本，不需要任何解释",
                        },
                        {
                            type: "image_url",
                            image_url: {
                                url: `data:${file.type};base64,${buffer.toString('base64')}`,
                            },
                        },
                    ],
                },
            ],
            temperature: 0,
            stream: false,
        }),
    };
    const response = await fetch(apiUrl, payload);

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `API request failed with status ${response.status}`);
    }

    const data = await response.json();
    return {
      text: data.choices[0].message.content
    };
  } catch (error) {
    console.error('OCR请求失败:', error);
    return {
      text: '',
      error: error instanceof Error ? error.message : '未知错误'
    };
  }
}

export function formatPromptTemplate(
  topic: string, 
  keywords: string[], 
  wordCount: number,
  prompt?: string
): string {
  // Format the keywords as a comma-separated list
  const keywordsStr = keywords.join('、');
  
  // Construct the complete prompt
  return `${prompt || ''}

---
遵循以上风格为我编写一篇${wordCount}字的文章，主题是${topic}，输出格式为markdown。
关键词：${keywordsStr}，不需要任何解释`;
}

// 文章润色API
export async function polishContent(request: PolishRequest): Promise<PolishResponse> {
  try {
    const { originalText, llmApiUrl, llmApiKey, model, polishType } = request;
    
    // 生成润色提示词
    const promptTemplate = `请帮我润色以下文章，保持主要内容不变，但提升表达效果和语言流畅度。${polishType === 'academic' 
      ? '使用更加学术和专业的语言。' 
      : polishType === 'business' 
        ? '使用更加商业和专业的语言。' 
        : polishType === 'creative' 
          ? '使用更加生动和有创意的语言，增加趣味性和吸引力。' 
          : '使用更加流畅和自然的语言。'}
    
以下是原文：
${originalText}

请提供润色后的文本。只返回润色后的完整文本，不要添加任何说明或解释。`;

      const data = await generate({
        apiUrl: llmApiUrl,
        apiKey: llmApiKey,
        model: model || 'gpt-4',
        prompt: promptTemplate,
        messages: [
          {
            role: 'user',
            content: promptTemplate
          }
        ],
        temperature: 0.7,
        stream: false
      })
      const polishedText = data.content || data.error || '';
      
      // 生成差异标记
      const diffMarkup = generateDiffMarkup(originalText, polishedText);
      
      return {
        originalText,
        polishedText,
        diffMarkup
      };
  } catch (error) {
    console.error('润色请求失败:', error);
    return {
      originalText: request.originalText,
      polishedText: '',
      diffMarkup: '',
      error: error instanceof Error ? error.message : '未知错误'
    };
  }
}