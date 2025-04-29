# 环境变量使用说明

## 概述

本项目支持通过环境变量配置API设置，使您可以更安全地管理API密钥和其他敏感信息，而不必将它们硬编码在代码中或存储在浏览器的localStorage中。

## 支持的环境变量

### OpenAI API配置
- `NEXT_PUBLIC_OPENAI_API_KEY` - OpenAI API密钥
- `NEXT_PUBLIC_OPENAI_API_URL` - OpenAI API地址（默认为：https://api.openai.com/v1/chat/completions）
- `NEXT_PUBLIC_OPENAI_MODEL` - 使用的模型名称（默认为：gpt-4）

### Ollama API配置
- `NEXT_PUBLIC_OLLAMA_API_URL` - Ollama API地址（默认为：http://localhost:11434/api/generate）
- `NEXT_PUBLIC_OLLAMA_MODEL` - 使用的模型名称（默认为：llama2）

### 自定义API配置
- `NEXT_PUBLIC_CUSTOM_API_KEY` - 自定义API密钥
- `NEXT_PUBLIC_CUSTOM_API_URL` - 自定义API地址
- `NEXT_PUBLIC_CUSTOM_MODEL` - 自定义模型名称

## 使用方法

1. 在项目根目录创建一个`.env.local`文件（该文件已被添加到.gitignore中，不会被提交到版本控制系统）

2. 参考`.env.example`文件中的格式，添加您需要的环境变量：

```
NEXT_PUBLIC_OPENAI_API_KEY=your_api_key_here
NEXT_PUBLIC_OPENAI_MODEL=gpt-4
```

3. 重启开发服务器，环境变量将被自动加载

## 优先级

配置加载优先级如下：

1. 浏览器localStorage中保存的配置（最高优先级）
2. 环境变量中的配置
3. 代码中的默认配置（最低优先级）

这意味着用户在界面中设置并保存的配置会覆盖环境变量中的配置。如果用户清除了保存的配置，系统将回退到使用环境变量中的配置。

## 注意事项

- 所有环境变量都必须以`NEXT_PUBLIC_`开头才能在客户端代码中访问
- 在生产环境中，建议使用更安全的方式管理API密钥，如服务器端API代理
- 环境变量在构建时被嵌入到JavaScript包中，因此在更改环境变量后需要重新构建应用