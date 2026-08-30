// 顶部工具栏
export default function Toolbar({
  onRunAll,
  onSave,
  onExport,
  onImport,
  onClear,
  onHelp,
  onTour,
  onSettings,
  running,
  saveHint,
}) {
  return (
    <div className="toolbar">
      <div className="brand">
        <span className="brand-logo">◧</span>
        <span className="brand-name">TapNow Local</span>
        <span className="brand-sub">本地 AI 画布</span>
      </div>
      <div className="toolbar-actions">
        <button className="btn btn-primary" onClick={onRunAll} disabled={running}>
          ▶ 运行全部
        </button>
        <button className="btn" onClick={onSave}>💾 保存</button>
        <button className="btn" onClick={onExport}>📤 导出</button>
        <button className="btn" onClick={onImport}>📥 导入</button>
        <button className="btn btn-danger-ghost" onClick={onClear}>✚ 清空</button>
        <button className="btn" onClick={onHelp}>❓ 帮助</button>
        <button className="btn" onClick={onTour}>🚀 新手教程</button>
        <button className="btn" onClick={onSettings} title="板块 API 设置（每个板块可配置多个 API / 模型）">⚙️ 设置</button>
      </div>
      {saveHint && <span className="save-hint">{saveHint}</span>}
    </div>
  )
}
