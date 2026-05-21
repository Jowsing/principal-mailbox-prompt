#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import path from 'node:path'

const args = parseArgs(process.argv.slice(2))
const mode = args.mode || 'brief'

if (args.help) {
  console.log(`Usage:
node design-fidelity-brief.mjs --mode brief --effect-image ./design.png --answers homepage.answers.json --style-file ui-style.brief.md
node design-fidelity-brief.mjs --mode checklist --effect-image ./design.png

Modes:
  brief      Print the mandatory design-to-code fidelity workflow.
  checklist  Print screenshot comparison acceptance items.

Options:
  --effect-image <path|url> Approved design image reference.
  --answers <file>          Confirmed component-list answers JSON.
  --style-file <file>       UI style brief.`)
  process.exit(0)
}

if (mode === 'brief') {
  console.log(renderBrief())
} else if (mode === 'checklist') {
  console.log(renderChecklist())
} else {
  console.error(`Unknown mode: ${mode}`)
  process.exit(1)
}

function renderBrief() {
  const designRef = args['effect-image'] || args.image || '<approved-design-image>'
  const style = readMaybe(args['style-file'])
  const answers = readMaybe(args.answers)
  return `设计还原强门禁：
- 已确认设计稿：${designRef}
- 代码实现前必须先观察设计稿并写出 design-fidelity.map.md；没有该拆解清单，不得开始写页面 UI。
- design-fidelity.map.md 必须逐项记录：登录页/首页整体框架、首屏比例、左右/上下区块关系、头部/导航、主视觉、模块顺序、卡片数量、列表密度、按钮/表单位置、圆角/阴影/边框倾向、主辅色、字体层级、图片/校徽/校园符号位置、空态/错误态/loading/disabled/验证码倒计时表现。
- 先按 design-fidelity.map.md 搭页面骨架和样式 tokens，再接业务数据；不得先套通用 Ant Design 模板后主观改色。
- Ant Design 只作为组件基础，布局、密度、模块位置、视觉层级必须服从确认设计稿。
- 不允许把设计稿里的两栏布局改成单列卡片堆叠，不允许改变主视觉位置，不允许增删已确认模块，不允许用通用后台模板替代校园门户设计。
- 如果某个设计细节与业务合同冲突，保留业务合同，但必须用最接近设计稿的 UI 方案表达。

已确认风格摘要：
${style || '<style brief not provided to this script>'}

已确认组件清单：
${answers || '<component-list answers not provided to this script>'}

截图校验：
- 实现后必须启动本地预览，用浏览器截图登录页和首页；至少覆盖桌面 1440x900，若启用移动端再覆盖 390x844。
- 将截图与确认设计稿逐项对照；如果首屏框架、模块顺序、比例、颜色气质、卡片密度、头部/主视觉/表单区位置明显不同，继续改代码，不得交付。
- 最终回复必须说明已完成截图对照，并列出仍存在的视觉差异；如果差异会影响设计还原，不能标记完成。`
}

function renderChecklist() {
  return `设计还原截图验收：
- [ ] 已创建 design-fidelity.map.md，且内容来自确认设计稿，不是泛化模板描述。
- [ ] 登录页截图与设计稿的首屏构图、表单位置、认证入口、学校识别、背景/主视觉、按钮状态一致。
- [ ] 首页截图与设计稿的头部、主视觉、模块顺序、模块数量、卡片比例、列表密度、页脚/辅助信息层级一致。
- [ ] 已确认启用的组件槽位全部出现；未选槽位和未确认模块没有出现。
- [ ] 主色、辅助色、背景层次、边框/阴影/圆角倾向、字体层级与设计稿一致，不是通用 Ant Design 默认观感。
- [ ] loading、empty、error、disabled、验证码倒计时、登录后二级我的信件等状态按设计稿风格表达。
- [ ] 桌面 1440x900 截图已对比；移动端启用时 390x844 截图已对比。
- [ ] 发现差异后已迭代修正；没有把明显不一致的问题留到交付后。`
}

function readMaybe(file) {
  if (!file) return ''
  try {
    return readFileSync(path.resolve(file), 'utf8').trim()
  } catch {
    return ''
  }
}

function parseArgs(items) {
  const result = {}
  for (let i = 0; i < items.length; i += 1) {
    const item = items[i]
    if (!item.startsWith('--')) continue
    const key = item.slice(2)
    const next = items[i + 1]
    if (!next || next.startsWith('--')) {
      result[key] = true
    } else {
      result[key] = next
      i += 1
    }
  }
  return result
}
