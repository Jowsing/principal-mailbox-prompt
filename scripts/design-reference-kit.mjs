#!/usr/bin/env node
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const args = parseArgs(process.argv.slice(2))
const mode = args.mode || 'scheme'

const universitySources = [
  {
    name: 'MIT homepage',
    url: 'https://www.mit.edu/',
    learn: '紧凑全局导航、Spotlight 信息入口、研究/教育故事流、地图/访问/联系人等实用页脚。'
  },
  {
    name: 'Stanford homepage',
    url: 'https://www.stanford.edu/',
    learn: '按受众分层的入口、使命型首屏、Campus News、Academics/Research/Campus Life 分区、指标与人物故事穿插。'
  },
  {
    name: 'Harvard homepage',
    url: 'https://www.harvard.edu/',
    learn: '强搜索和 quick links、按 Academics/About/News 等主题组织的 mega navigation、学院/历史/新闻/事件的层级化入口。'
  },
  {
    name: 'University of Oxford homepage',
    url: 'https://www.ox.ac.uk/',
    learn: '招生搜索、图片驱动的主题卡片、学生故事、研究/课程/学院资源的纵深组织。'
  },
  {
    name: 'University of Cambridge homepage',
    url: 'https://www.cam.ac.uk/',
    learn: '主图新闻、学习入口、Why/How to apply、图书馆/博物馆/研究等资源入口、新闻/事件/社媒联动。'
  },
  {
    name: 'Yale homepage',
    url: 'https://www.yale.edu/',
    learn: '主导航+受众导航、毕业/专题 hero、新闻分类、Topic explorer、访问资源和 helpful links。'
  },
  {
    name: 'Princeton homepage',
    url: 'https://www.princeton.edu/',
    learn: '大事件主图、University News、Research Roundup、Exceptional Faculty、Upcoming Events、Study/Work 入口。'
  },
  {
    name: 'UC Berkeley homepage',
    url: 'https://www.berkeley.edu/',
    learn: '受众入口、地图/目录/新闻工具入口、校园影像、About/Admissions/Academics/Research/Campus Life mega nav。'
  },
  {
    name: 'ETH Zurich homepage',
    url: 'https://ethz.ch/en.html/',
    learn: '服务入口、新闻流、部门列表、Student portal/Staffnet/Login 等实用入口，适合理工型信息架构。'
  }
]

const crossDomainSources = [
  {
    name: 'Ant Design Layout',
    url: 'https://ant.design/components/layout/',
    learn: '导航靠近 logo、顶栏/二级导航高度规范、导航层级可视化、当前项优先级。'
  },
  {
    name: 'Ant Design Pro Layout',
    url: 'https://beta-pro.ant.design/docs/layout/',
    learn: '全局 layout 抽象、主题色/导航模式/内容宽度配置、右上角用户区、footer、自定义 layout 和权限路由。'
  },
  {
    name: 'GOV.UK Design System',
    url: 'https://design-system.service.gov.uk/',
    learn: '服务设计优先、样式/组件/模式复用、可访问性、减少重复工作；适合校长信箱这种公共服务。'
  },
  {
    name: 'GOV.UK Government Design Principles',
    url: 'https://www.gov.uk/guidance/government-design-principles',
    learn: '从用户需求出发、少做但做好、用数据、把复杂问题做简单、一致但不一模一样。'
  },
  {
    name: 'Stripe app design guidance',
    url: 'https://docs.stripe.com/stripe-apps/design',
    learn: '有限但一致的自定义、品牌标识、核心工作流概览、平台内 UI 组件和设计模式。'
  },
  {
    name: 'Vercel Design',
    url: 'https://vercel.com/design',
    learn: '品牌系统、web interface guidelines、Geist design system、精细动效和工程化设计表达。'
  },
  {
    name: 'Linear homepage',
    url: 'https://linear.app/homepage/',
    learn: '高密度产品叙事、精确间距、暗色/亮色层次、微交互和模块过渡的专业感。'
  }
]

const patterns = [
  ['audienceGateway', '受众入口', '在页头或首屏提供学生/教职工/访客/校友等受众入口；校长信箱可映射为我要写信、我的信件、来信选登、服务电话。'],
  ['missionHero', '使命首屏', '用校名、校训、服务承诺和校园主图建立可信感；避免空洞营销口号。'],
  ['storyFeed', '故事与公开信流', '用来信选登承载真实案例感，结构上参考高校 news/story feed，但内容仍按 registerLetters 接口。'],
  ['serviceSearch', '服务搜索', '把课程搜索/站内搜索模式转译为来信搜索、服务电话搜索、我的信件筛选。'],
  ['metricTrust', '可信指标', '在不新增业务接口的前提下，可用处理状态、进度、阅读量等已有字段表达透明度。'],
  ['imageCards', '图片卡片', '用校园图像承载模块识别，不用抽象渐变球或廉价插画。'],
  ['proLayoutShell', 'AntD 专业壳', '用 ConfigProvider + Layout + Row/Col/Flex/Space 搭壳，用 Card/List/Tabs/Form/Drawer/Modal 承载业务。'],
  ['serviceFirst', '公共服务优先', '学习 GOV.UK：先让用户完成任务，再考虑装饰；所有入口、反馈和错误都要清楚。'],
  ['craftSystem', '产品级 craft', '学习 Vercel/Linear/Stripe：间距、对齐、动效、品牌 token 和组件状态必须系统化。']
]

const schemes = [
  {
    variant: 'campusGateway',
    structure: 'Header + campus hero + right-side login/action cluster + two-column public letters/service area + footer.',
    useWhen: '综合型大学、信息门户、学校特色信息较少时。',
    keyMove: '用大校园图像避免朴素空白；ActionCard 和 LoginCard 放在首屏右侧或下沿，保持服务入口明显。'
  },
  {
    variant: 'landmarkSplit',
    structure: 'Left landmark image panel + right service workspace + below public letters timeline.',
    useWhen: '学校有强地标、校门、图书馆、主楼等视觉资产时。',
    keyMove: '地标图片贯穿登录页和首页，形成品牌一致性；业务卡片贴近图片边界但不压图。'
  },
  {
    variant: 'serviceDashboard',
    structure: 'Top brand bar + compact status/service dashboard + searchable letter list + drawer/modals.',
    useWhen: '用户强调效率、信息密集、办事平台感时。',
    keyMove: 'AntD Row/Col、Card、List、Tabs、Steps 要成体系；每个小组件固定高度和列宽。'
  },
  {
    variant: 'academicMagazine',
    structure: 'Editorial hero + school quote/motto + staggered action cards + story-like public letters.',
    useWhen: '学校强调学术、文化、国际化和精致视觉时。',
    keyMove: '允许更强图片和排版，但业务模块不能丢；所有模块仍来自组件槽位。'
  },
  {
    variant: 'noticeBoard',
    structure: 'Campus notice board metaphor + public letters priority + service phone/action cards in side rail.',
    useWhen: '学校希望稳重、公告栏、公共服务可信感时。',
    keyMove: '用信息公告秩序感替代花哨效果；分割线、标签、状态和列表对齐要精细。'
  }
]

if (args.help) {
  console.log(`Usage:
node design-reference-kit.mjs --mode study
node design-reference-kit.mjs --mode scheme
node design-reference-kit.mjs --mode checklist
node design-reference-kit.mjs --mode write --out principal-mailbox-design-reference

Modes:
  study      Print learned patterns from world university sites and non-school excellent projects.
  scheme     Print the refined implementation scheme for beautiful 校长信箱 pages.
  checklist  Print acceptance checklist for design/reference quality.
  write      Write study.md, scheme.md, checklist.md to --out.`)
  process.exit(0)
}

if (mode === 'study') {
  console.log(renderStudy())
} else if (mode === 'scheme') {
  console.log(renderScheme())
} else if (mode === 'checklist') {
  console.log(renderChecklist())
} else if (mode === 'write') {
  writeReference()
} else {
  console.error(`Unknown mode: ${mode}`)
  process.exit(1)
}

function renderStudy() {
  return `优秀项目学习摘要：

世界名校官网参考：
${universitySources.map((source) => `- ${source.name}: ${source.url}\n  可学习：${source.learn}`).join('\n')}

跨行业优秀网站/设计系统参考：
${crossDomainSources.map((source) => `- ${source.name}: ${source.url}\n  可学习：${source.learn}`).join('\n')}

提炼出的可复用模式：
${patterns.map(([key, title, description]) => `- ${key}: ${title} -> ${description}`).join('\n')}

使用边界：
- 不局限于学校官网；也要学习公共服务、产品官网、设计系统和后台产品的成熟做法。
- 只学习信息架构、节奏、组件组织、服务流程、品牌系统和视觉资产使用方式，不复制任何网站的具体页面、文案、图像或模板。
- 所有模式必须回落到校长信箱固定业务：登录页、首页、来信选登、我要写信、我的信件二级视图、须知、服务电话、评价。
- 参考学习不得覆盖固定接口、window globals、payload、跳转、登录 data redirect、产物格式和预览/生产隔离。`
}

function renderScheme() {
  return `优美实现方案：

1. 学校 DNA 输入
- 提取校名、校徽、校训、品牌色、校园地标、学校类型、地域文化、服务对象。
- 缺校徽/校园图时，用 imagegen2 生成校园主图、地标建筑或文化纹理；不要用纯渐变兜底。

2. 参考学习转译
- 名校官网负责提供校园气质、影像组织、受众入口、新闻/故事流、资源导航和学术可信感。
- GOV.UK 负责提供公共服务任务流、清晰错误反馈、可访问性和“少做但做好”的信息优先级。
- Ant Design/Pro Layout 负责提供工程化布局、组件矩阵、主题 token、用户区、footer 和状态组件。
- Stripe/Vercel/Linear 负责提供精致视觉 craft、品牌系统、微交互、对齐纪律和产品级组件密度。
- 上述参考只能转译为校长信箱组件槽位，不能新增无业务依据的宣传模块。

3. 选择 layoutVariant
${schemes.map((item) => `- ${item.variant}: ${item.structure}\n  适用：${item.useWhen}\n  关键做法：${item.keyMove}`).join('\n')}

4. 组织首屏
- 登录页：学校识别 + 校园图像 + LoginCard；Form/Input/Button/Alert 负责字段、验证码、错误、loading。
- 首页：HeaderBrand/UserInfoDropdown + campus hero + ActionCard 入口 + public letters + service phone + logged-in mail view。
- 首屏必须有学校视觉信号和业务入口，不能只有空白卡片。

5. 组件落地
- 外壳：ConfigProvider + Layout + Header/Content/Footer。
- 栅格：Row/Col 或 Flex/Space，24px 主栅格、8px 子栅格。
- 登录：Form、Input、Button、Alert、message。
- 入口：Card、Button、Tag、Badge。
- 来信选登：Tabs、Input.Search、List、Card、Empty、Spin。
- 服务电话：Card、List、Drawer、Input.Search。
- 我的信件：Form、Select、List/Card、Steps、Tag、Button、Popconfirm/Modal。
- 评价：Modal、Rate、Input.TextArea。

6. 视觉细化
- 图片：hero/landmark/action card cover 至少两处；图片裁切比例固定，避免拉伸。
- 卡片：同排等高，标题/摘要/按钮基线一致；不做卡片套卡片。
- 列表：tag/code/date/action 固定列宽；摘要统一行数；loading/empty/error 高度稳定。
- 表单：label/input/error 三层对齐；验证码按钮宽度稳定；错误不挤乱布局。

7. 设计到代码
- design-fidelity.map.md 必须记录 layoutVariant、学校视觉资产、AntD 组件映射、栅格、状态和截图对照项。
- 代码先搭 layout 和组件骨架，再接接口；不要先写业务再随便套样式。
- 预览截图发现同学校模板化、缺图片、AntD 伪组件、小组件不齐，必须回炉。`
}

function renderChecklist() {
  return `优秀项目参考验收：
- [ ] 已运行或阅读 design-reference-kit.mjs --mode study。
- [ ] 已从学校 DNA 选择 layoutVariant，不是默认套同一个骨架。
- [ ] 至少使用两类学校视觉资产，缺素材时已生成校园图/地标图。
- [ ] 首屏同时有学校识别和核心业务入口。
- [ ] Ant Design 组件矩阵真实落地，没有用 div/span 伪造控件。
- [ ] 24px/8px 栅格、卡片等高、表单错误位、验证码按钮、列表列宽均稳定。
- [ ] 设计稿不是复制 MIT/Stanford/Harvard/Oxford/AntD Pro 任一具体模板，只吸收模式。
- [ ] 已吸收非学校优秀项目：公共服务任务流、产品级组件密度、品牌系统、微交互或设计系统规范至少两类。
- [ ] design-fidelity.map.md 已记录参考模式如何转译到校长信箱组件槽位。
- [ ] 截图对照确认：学校图片、layout 差异化、AntD 组件质感和小组件对齐都达标。`
}

function writeReference() {
  const outDir = path.resolve(args.out || 'principal-mailbox-design-reference')
  mkdirSync(outDir, { recursive: true })
  writeFileSync(path.join(outDir, 'study.md'), `${renderStudy().trim()}\n`, 'utf8')
  writeFileSync(path.join(outDir, 'scheme.md'), `${renderScheme().trim()}\n`, 'utf8')
  writeFileSync(path.join(outDir, 'checklist.md'), `${renderChecklist().trim()}\n`, 'utf8')
  console.log(`Design reference written: ${outDir}`)
}

function parseArgs(items) {
  const result = {}
  for (let i = 0; i < items.length; i += 1) {
    const key = items[i]
    if (!key.startsWith('--')) continue
    const name = key.slice(2)
    const value = items[i + 1]
    if (!value || value.startsWith('--')) {
      result[name] = true
    } else {
      result[name] = value
      i += 1
    }
  }
  return result
}
