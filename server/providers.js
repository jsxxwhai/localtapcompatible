// 提供方预设：用于快速填充节点配置，前端与后端共用
export const PROVIDER_PRESETS = [
  {
    id: 'custom',
    label: '自定义（完全手动）',
    hint: '所有字段自己填，适合任意 HTTP 接口',
    config: {},
  },
  {
    id: 'openai-image',
    label: 'OpenAI 文生图（gpt-image-1 / dall-e-3）',
    hint: '官方 OpenAI Images API',
    config: {
      baseUrl: 'https://api.openai.com/v1',
      path: '/images/generations',
      method: 'POST',
      model: 'gpt-image-1',
      bodyTemplate: {
        model: '{{model}}',
        prompt: '{{prompt}}',
        n: 1,
        size: '1024x1024',
      },
      outputExtract: 'data[0].url',
      outputMediaType: 'auto',
    },
  },
  {
    id: 'openai-compatible-image',
    label: 'OpenAI 兼容文生图（SiliconFlow / 国内中转等）',
    hint: '接口格式与 OpenAI /images/generations 一致的服务',
    config: {
      baseUrl: 'https://api.siliconflow.cn/v1',
      path: '/images/generations',
      method: 'POST',
      model: 'Kwai-Kolors/Kolors',
      bodyTemplate: {
        model: '{{model}}',
        prompt: '{{prompt}}',
        n: 1,
        size: '1024x1024',
      },
      outputExtract: 'data[0].url',
      outputMediaType: 'auto',
    },
  },
  {
    id: 'openai-agent',
    label: 'OpenAI Agent（画布掌控）',
    hint: 'GPT-4o 等模型，返回 JSON 指令操控画布',
    config: {
      baseUrl: 'https://api.openai.com/v1',
      path: '/chat/completions',
      method: 'POST',
      model: 'gpt-4o-mini',
      bodyTemplate: {
        model: '{{model}}',
        messages: [
          { role: 'system', content: '{{system}}' },
          { role: 'user', content: '{{prompt}}' },
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      },
      outputExtract: 'choices[0].message.content',
      outputKind: 'text',
    },
  },
  {
    id: 'openai-compatible-agent',
    label: 'OpenAI 兼容 Agent（Qwen 等）',
    hint: '兼容 chat/completions 的模型（SiliconFlow 等）',
    config: {
      baseUrl: 'https://api.siliconflow.cn/v1',
      path: '/chat/completions',
      method: 'POST',
      model: 'Qwen/Qwen2.5-72B-Instruct',
      bodyTemplate: {
        model: '{{model}}',
        messages: [
          { role: 'system', content: '{{system}}' },
          { role: 'user', content: '{{prompt}}' },
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      },
      outputExtract: 'choices[0].message.content',
      outputKind: 'text',
    },
  },
  {
    id: 'openai-vision',
    label: 'OpenAI 视觉（倒推提示词）',
    hint: 'GPT-4o 系列多模态模型，把图片描述成提示词',
    config: {
      baseUrl: 'https://api.openai.com/v1',
      path: '/chat/completions',
      method: 'POST',
      model: 'gpt-4o-mini',
      bodyTemplate: {
        model: '{{model}}',
        messages: [
          { role: 'system', content: '你是专业的提示词工程师。请用中文详细描述图片的内容、风格、构图、光线与细节，输出一段可直接用于文生图/文生视频的提示词。' },
          { role: 'user', content: [{ type: 'image_url', image_url: { url: '{{image}}' } }] },
        ],
        max_tokens: 512,
      },
      outputExtract: 'choices[0].message.content',
      outputKind: 'text',
    },
  },
  {
    id: 'openai-compatible-vision',
    label: 'OpenAI 兼容视觉（Qwen-VL / 国内中转等）',
    hint: '兼容 chat/completions 的视觉模型（SiliconFlow 等）',
    config: {
      baseUrl: 'https://api.siliconflow.cn/v1',
      path: '/chat/completions',
      method: 'POST',
      model: 'Qwen/Qwen2.5-VL-72B-Instruct',
      bodyTemplate: {
        model: '{{model}}',
        messages: [
          { role: 'system', content: '你是专业的提示词工程师。请用中文详细描述图片的内容、风格、构图、光线与细节，输出一段可直接用于文生图/文生视频的提示词。' },
          { role: 'user', content: [{ type: 'image_url', image_url: { url: '{{image}}' } }] },
        ],
        max_tokens: 512,
      },
      outputExtract: 'choices[0].message.content',
      outputKind: 'text',
    },
  },
  {
    id: 'async-video',
    label: '通用异步视频（提交任务 + 轮询）',
    hint: '适用于“提交任务拿 job id，再轮询状态直到完成”的视频 API（可灵、Seedance、Runway 等）。提交/查询的路径、字段名需按服务文档修改。',
    config: {
      baseUrl: 'https://your-api.example.com/v1',
      path: '/videos/generations',
      method: 'POST',
      model: 'your-video-model',
      bodyTemplate: {
        model: '{{model}}',
        prompt: '{{prompt}}',
        image: '{{image}}',
      },
      outputExtract: 'id',
      outputMediaType: 'video',
      poll: {
        enabled: true,
        path: '/videos/generations/{id}',
        idPath: 'id',
        statusPath: 'status',
        doneValues: ['succeeded', 'completed', 'success'],
        failedValues: ['failed', 'error'],
        resultExtract: 'output.video_url',
        intervalMs: 3000,
        maxAttempts: 200,
      },
    },
  },
]

export function getPreset(id) {
  return PROVIDER_PRESETS.find((p) => p.id === id) ?? PROVIDER_PRESETS[0]
}
