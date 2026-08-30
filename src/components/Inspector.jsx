import { ApiSelect } from '../nodes/CanvasNode.jsx'
import { CATEGORY_MAP, GEN_CATS } from '../categorySettings.js'

// 节点配置面板：API 已上收到“板块设置”（右上角 ⚙️），这里只负责查看与选择当前板块使用的 API/模型
export default function Inspector({ node, settings, onSelectApi, onOpenSettings, onTest, onClose, testing }) {
  if (!node) {
    return (
      <div className="inspector">
        <div className="panel-title">节点配置</div>
        <div className="inspector-empty">
          在画布中选择一个节点，
          <br />
          可在这里切换该板块使用的 API / 模型。
          <br />
          所有 API 在右上角 <b>⚙️ 设置</b> 里统一管理。
        </div>
      </div>
    )
  }

  const isGen = GEN_CATS.has(node.type)
  const cat = CATEGORY_MAP[node.type]
  const catSet = settings?.[node.type]

  return (
    <div className="inspector">
      <div className="panel-title">
        {node.type === 'text' ? '提示词节点' : node.type === 'upload' ? '上传节点' : node.type === 'output' ? '输出节点' : '生成节点'}
        <button className="btn-icon" onClick={onClose} title="关闭">×</button>
      </div>

      {!isGen ? (
        <div className="inspector-empty">
          该节点无需 API 配置。
          <br />
          把它连接到图片/视频生成节点的输入即可。
        </div>
      ) : (
        <div className="inspector-body">
          <div className="inspector-cat-info">
            <span className="inspector-cat-label">{cat?.icon} {cat?.label}板块</span>
            <span className="inspector-cat-current">当前模型：{catSet?.model || '未设置'}</span>
          </div>
          <label className="field">
            <span className="field-label">使用的 API / 模型（默认是上次运行用的那个）</span>
            <ApiSelect
              apiOptions={catSet?.apis || []}
              currentApiId={catSet?.currentApiId || ''}
              onSelect={(apiId) => onSelectApi(node.type, apiId)}
              onOpenSettings={onOpenSettings}
            />
          </label>
          <div className="inspector-actions">
            <button className="btn btn-primary" onClick={() => onTest(node.id)} disabled={testing}>
              {testing ? '测试中…' : '🔌 测试接口'}
            </button>
            <button className="btn" onClick={onOpenSettings}>⚙️ 打开板块设置</button>
          </div>
        </div>
      )}
    </div>
  )
}