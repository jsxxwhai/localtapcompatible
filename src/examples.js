// 内置示例工作流：可在 文件 → 加载示例 中一键载入画布
// 每个示例的结构与「导出 JSON」完全一致（app/version/nodes/edges），可直接复用导入逻辑
// 载入时 text 节点的提示词会按当前语言从 locales（promptKey）预填，images 素材留空由用户自行选择

export const EXAMPLES = [
  {
    id: 't2i',
    icon: '🖼️',
    key: 'example.t2i.title',
    descKey: 'example.t2i.desc',
    promptKey: 'example.t2i.prompt',
    canvas: {
      app: 'local-tap-compatible',
      version: 1,
      nodes: [
        {
          id: 'text-t2i',
          type: 'text',
          position: { x: 40, y: 220 },
          data: { type: 'text', status: 'idle', error: '', text: '', media: null,
            config: { name: '', baseUrl: '', apiKey: '', model: '', path: '/', method: 'POST', headers: {}, bodyTemplate: { prompt: '{{prompt}}' }, outputExtract: '', outputMediaType: 'auto', outputKind: 'media', timeoutMs: 120000, poll: null } },
        },
        {
          id: 'image-t2i',
          type: 'image',
          position: { x: 420, y: 140 },
          data: { type: 'image', status: 'idle', error: '', text: '', media: null,
            config: { name: '', baseUrl: '', apiKey: '', model: '', path: '/images/generations', method: 'POST', headers: {}, bodyTemplate: { model: '{{model}}', prompt: '{{prompt}}', n: 1, size: '1024x1024' }, outputExtract: 'data[0].url', outputMediaType: 'auto', outputKind: 'media', timeoutMs: 120000, poll: null } },
        },
        {
          id: 'output-t2i',
          type: 'output',
          position: { x: 860, y: 180 },
          data: { type: 'output', status: 'idle', error: '', text: '', media: null,
            config: { name: '', baseUrl: '', apiKey: '', model: '', path: '/', method: 'POST', headers: {}, bodyTemplate: { prompt: '{{prompt}}' }, outputExtract: '', outputMediaType: 'auto', outputKind: 'media', timeoutMs: 120000, poll: null } },
        },
      ],
      edges: [
        { id: 'e1-t2i', source: 'text-t2i', sourceHandle: 'output', target: 'image-t2i', targetHandle: 'prompt' },
        { id: 'e2-t2i', source: 'image-t2i', sourceHandle: 'output', target: 'output-t2i', targetHandle: 'media' },
      ],
    },
  },
  {
    id: 'i2v',
    icon: '🎬',
    key: 'example.i2v.title',
    descKey: 'example.i2v.desc',
    promptKey: 'example.i2v.prompt',
    canvas: {
      app: 'local-tap-compatible',
      version: 1,
      nodes: [
        {
          id: 'asset-i2v',
          type: 'asset',
          position: { x: 40, y: 140 },
          data: { type: 'asset', status: 'idle', error: '', text: '', media: null, images: [],
            config: { name: '', baseUrl: '', apiKey: '', model: '', path: '/', method: 'POST', headers: {}, bodyTemplate: { prompt: '{{prompt}}' }, outputExtract: '', outputMediaType: 'auto', outputKind: 'media', timeoutMs: 120000, poll: null } },
        },
        {
          id: 'text-i2v',
          type: 'text',
          position: { x: 40, y: 420 },
          data: { type: 'text', status: 'idle', error: '', text: '', media: null,
            config: { name: '', baseUrl: '', apiKey: '', model: '', path: '/', method: 'POST', headers: {}, bodyTemplate: { prompt: '{{prompt}}' }, outputExtract: '', outputMediaType: 'auto', outputKind: 'media', timeoutMs: 120000, poll: null } },
        },
        {
          id: 'video-i2v',
          type: 'video',
          position: { x: 460, y: 220 },
          data: { type: 'video', status: 'idle', error: '', text: '', media: null,
            config: { name: '', baseUrl: '', apiKey: '', model: '', path: '/videos/generations', method: 'POST', headers: {}, bodyTemplate: { model: '{{model}}', prompt: '{{prompt}}', image: '{{image}}' }, outputExtract: 'id', outputMediaType: 'video', outputKind: 'media', timeoutMs: 120000, poll: { enabled: true, path: '/videos/generations/{id}', idPath: 'id', statusPath: 'status', doneValues: ['succeeded', 'completed', 'success'], failedValues: ['failed', 'error'], resultExtract: 'output.video_url', intervalMs: 3000, maxAttempts: 200 } } },
        },
        {
          id: 'output-i2v',
          type: 'output',
          position: { x: 900, y: 260 },
          data: { type: 'output', status: 'idle', error: '', text: '', media: null,
            config: { name: '', baseUrl: '', apiKey: '', model: '', path: '/', method: 'POST', headers: {}, bodyTemplate: { prompt: '{{prompt}}' }, outputExtract: '', outputMediaType: 'auto', outputKind: 'media', timeoutMs: 120000, poll: null } },
        },
      ],
      edges: [
        { id: 'e1-i2v', source: 'asset-i2v', sourceHandle: 'output', target: 'video-i2v', targetHandle: 'image' },
        { id: 'e2-i2v', source: 'text-i2v', sourceHandle: 'output', target: 'video-i2v', targetHandle: 'prompt' },
        { id: 'e3-i2v', source: 'video-i2v', sourceHandle: 'output', target: 'output-i2v', targetHandle: 'media' },
      ],
    },
  },
  {
    id: 'rev',
    icon: '🔍',
    key: 'example.rev.title',
    descKey: 'example.rev.desc',
    canvas: {
      app: 'local-tap-compatible',
      version: 1,
      nodes: [
        {
          id: 'asset-rev',
          type: 'asset',
          position: { x: 40, y: 80 },
          data: { type: 'asset', status: 'idle', error: '', text: '', media: null, images: [],
            config: { name: '', baseUrl: '', apiKey: '', model: '', path: '/', method: 'POST', headers: {}, bodyTemplate: { prompt: '{{prompt}}' }, outputExtract: '', outputMediaType: 'auto', outputKind: 'media', timeoutMs: 120000, poll: null } },
        },
        {
          id: 'reverse-rev',
          type: 'reverse',
          position: { x: 420, y: 60 },
          data: { type: 'reverse', status: 'idle', error: '', text: '', media: null,
            config: { name: '', baseUrl: '', apiKey: '', model: '', path: '/chat/completions', method: 'POST', headers: {}, bodyTemplate: { model: '{{model}}', messages: [ { role: 'system', content: '' }, { role: 'user', content: [ { type: 'image_url', image_url: { url: '{{image}}' } } ] } ], max_tokens: 512 }, outputExtract: 'choices[0].message.content', outputMediaType: 'auto', outputKind: 'text', timeoutMs: 120000, poll: null } },
        },
        {
          id: 'image-rev',
          type: 'image',
          position: { x: 820, y: 200 },
          data: { type: 'image', status: 'idle', error: '', text: '', media: null,
            config: { name: '', baseUrl: '', apiKey: '', model: '', path: '/images/generations', method: 'POST', headers: {}, bodyTemplate: { model: '{{model}}', prompt: '{{prompt}}', n: 1, size: '1024x1024' }, outputExtract: 'data[0].url', outputMediaType: 'auto', outputKind: 'media', timeoutMs: 120000, poll: null } },
        },
        {
          id: 'output-rev',
          type: 'output',
          position: { x: 1240, y: 240 },
          data: { type: 'output', status: 'idle', error: '', text: '', media: null,
            config: { name: '', baseUrl: '', apiKey: '', model: '', path: '/', method: 'POST', headers: {}, bodyTemplate: { prompt: '{{prompt}}' }, outputExtract: '', outputMediaType: 'auto', outputKind: 'media', timeoutMs: 120000, poll: null } },
        },
      ],
      edges: [
        { id: 'e1-rev', source: 'asset-rev', sourceHandle: 'output', target: 'reverse-rev', targetHandle: 'image' },
        { id: 'e2-rev', source: 'reverse-rev', sourceHandle: 'output', target: 'image-rev', targetHandle: 'prompt' },
        { id: 'e3-rev', source: 'image-rev', sourceHandle: 'output', target: 'output-rev', targetHandle: 'media' },
      ],
    },
  },
  {
    id: 'multi',
    icon: '📂',
    key: 'example.multi.title',
    descKey: 'example.multi.desc',
    promptKey: 'example.multi.prompt',
    canvas: {
      app: 'local-tap-compatible',
      version: 1,
      nodes: [
        {
          id: 'assetA-multi',
          type: 'asset',
          position: { x: 40, y: 60 },
          data: { type: 'asset', status: 'idle', error: '', text: '', media: null, images: [],
            config: { name: '', baseUrl: '', apiKey: '', model: '', path: '/', method: 'POST', headers: {}, bodyTemplate: { prompt: '{{prompt}}' }, outputExtract: '', outputMediaType: 'auto', outputKind: 'media', timeoutMs: 120000, poll: null } },
        },
        {
          id: 'assetB-multi',
          type: 'asset',
          position: { x: 40, y: 320 },
          data: { type: 'asset', status: 'idle', error: '', text: '', media: null, images: [],
            config: { name: '', baseUrl: '', apiKey: '', model: '', path: '/', method: 'POST', headers: {}, bodyTemplate: { prompt: '{{prompt}}' }, outputExtract: '', outputMediaType: 'auto', outputKind: 'media', timeoutMs: 120000, poll: null } },
        },
        {
          id: 'text-multi',
          type: 'text',
          position: { x: 40, y: 580 },
          data: { type: 'text', status: 'idle', error: '', text: '', media: null,
            config: { name: '', baseUrl: '', apiKey: '', model: '', path: '/', method: 'POST', headers: {}, bodyTemplate: { prompt: '{{prompt}}' }, outputExtract: '', outputMediaType: 'auto', outputKind: 'media', timeoutMs: 120000, poll: null } },
        },
        {
          id: 'image-multi',
          type: 'image',
          position: { x: 480, y: 200 },
          data: { type: 'image', status: 'idle', error: '', text: '', media: null,
            config: { name: '', baseUrl: '', apiKey: '', model: '', path: '/images/edits', method: 'POST', headers: {}, bodyTemplate: { model: '{{model}}', prompt: '{{prompt}}', images: '{{images}}', n: 1, size: '1024x1024' }, outputExtract: 'data[0].url', outputMediaType: 'auto', outputKind: 'media', timeoutMs: 120000, poll: null } },
        },
        {
          id: 'output-multi',
          type: 'output',
          position: { x: 940, y: 240 },
          data: { type: 'output', status: 'idle', error: '', text: '', media: null,
            config: { name: '', baseUrl: '', apiKey: '', model: '', path: '/', method: 'POST', headers: {}, bodyTemplate: { prompt: '{{prompt}}' }, outputExtract: '', outputMediaType: 'auto', outputKind: 'media', timeoutMs: 120000, poll: null } },
        },
      ],
      edges: [
        { id: 'e1-multi', source: 'assetA-multi', sourceHandle: 'output', target: 'image-multi', targetHandle: 'image' },
        { id: 'e2-multi', source: 'assetB-multi', sourceHandle: 'output', target: 'image-multi', targetHandle: 'image' },
        { id: 'e3-multi', source: 'text-multi', sourceHandle: 'output', target: 'image-multi', targetHandle: 'prompt' },
        { id: 'e4-multi', source: 'image-multi', sourceHandle: 'output', target: 'output-multi', targetHandle: 'media' },
      ],
    },
  },
];