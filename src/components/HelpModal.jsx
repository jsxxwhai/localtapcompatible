// 帮助弹窗
export default function HelpModal({ onClose, onTour }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <span>使用帮助</span>
          {onTour && (
            <button className="btn btn-small btn-primary" onClick={onTour}>📖 图文新手教程</button>
          )}
          <button className="btn-icon" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <h4>工作流</h4>
          <ol>
            <li>从左侧「节点库」添加节点：<b>提示词 → 图片生成 → 预览输出</b></li>
            <li>从节点右侧输出点拖线，连接到下一节点左侧输入点</li>
            <li>点击图片/视频生成节点，在右侧「配置面板」填 API 信息</li>
            <li>点节点上的 <b>▶ 运行</b>（会自动先跑完它的上游依赖链）或顶部 <b>运行全部</b>，结果会缓存在节点上并自动传给下游</li>
          </ol>

          <h4>接口配置要点</h4>
          <ul>
            <li><b>Base URL + 路径</b>：拼接后即实际请求地址，例如 <code>https://api.openai.com/v1</code> + <code>/images/generations</code></li>
            <li><b>请求体模板</b>：JSON 模板，可用占位符 <code>{'{{prompt}}'}</code>（上游提示词）、<code>{'{{image}}'}</code>（上游参考图 URL）、<code>{'{{model}}'}</code>、<code>{'{{apiKey}}'}</code></li>
            <li><b>输出提取路径</b>：从返回 JSON 中取媒体地址，如 OpenAI 返回 <code>{'data[0].url'}</code></li>
            <li><b>异步轮询</b>：视频接口通常先提交任务拿 job id，再查询状态；开启轮询后配置查询路径与状态/结果字段</li>
            <li><b>API Key</b> 只保存在本地浏览器 localStorage，不会上传；请求由本地后端 <code>localhost:3001</code> 发出，避免浏览器跨域限制</li>
          </ul>

          <h4>示例</h4>
          <pre>{`// OpenAI 文生图
预设：OpenAI 文生图
模型：gpt-image-1
请求体：{ "model": "{{model}}", "prompt": "{{prompt}}", "n": 1, "size": "1024x1024" }
提取：data[0].url

// 通用异步视频
预设：通用异步视频（提交任务 + 轮询）
提交：POST {baseUrl}/videos/generations
查询：GET {baseUrl}/videos/generations/{id}   ← 填在“查询路径”
状态字段：status（succeeded 为完成）
结果字段：output.video_url`}</pre>

          <h4>快速添加与连接</h4>
          <ul>
            <li><b>从输出点拖线</b>：从节点右侧输出点（或左侧输入点）拖出一条线；松手停在空白处会弹出下一步菜单（图生图 / 图生视频 / 倒推提示词 / 预览输出，随节点类型变化）；直接拖到另一节点输入口则直接连线</li>
            <li><b>框选与删除</b>：在画布空白处按住左键拖动即可拉出选框（像桌面一样），框住多个节点后按 <b>Delete / Backspace</b> 一键删除，或右键选中节点在菜单里选「删除选中的 N 个节点」</li>
            <li><b>画布空白处右键</b>：弹出添加节点菜单，可顺便运行全部</li>
            <li><b>节点上右键</b>：可运行、快速连接下一步、删除该节点</li>
            <li><b>左侧节点库</b>：点击添加，或按住直接拖到画布任意位置</li>
            <li><b>倒推提示词节点</b>：把图片喂给视觉模型，输出可直接用于文生图/文生视频的提示词（OpenAI 视觉或 Qwen-VL 等）</li>
            <li><b>平移画布</b>：滚轮缩放；按住鼠标中键拖动平移（左键拖动是框选）</li>
          </ul>

          <h4>数据</h4>
          <ul>
            <li>画布自动保存在浏览器 localStorage，也可用顶部「导出 / 导入」备份为 JSON 文件</li>
            <li>「清空」会删除当前画布并重置（会先自动备份一次）</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
