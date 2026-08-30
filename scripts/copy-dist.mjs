// 把前端构建产物复制到桌面应用的 wwwroot
import { rmSync, cpSync } from 'node:fs'

rmSync('desktop/wwwroot', { recursive: true, force: true })
cpSync('dist', 'desktop/wwwroot', { recursive: true })
console.log('[desktop] 前端产物已复制到 desktop/wwwroot')
