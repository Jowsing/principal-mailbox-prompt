#!/usr/bin/env node
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const args = parseArgs(process.argv.slice(2))
const mode = args.mode || 'catalog'

const slots = [
  ['appShell', '页面外壳', 'HeaderBrand + page-stage/page-header/page-main/page-content + footer'],
  ['loginBlock', '登录页组件', 'HeaderBrand + LoginCard + 背景/主视觉/页脚'],
  ['actionCards', '快捷入口卡片', 'ActionCard: 我要写信、我的信件'],
  ['publicLettersBlock', '来信选登组件组', 'SliderTabs + LetterCard + search + empty/loading + load more'],
  ['servicePhoneBlock', '校园服务电话组件组', 'ServicePhoneCard + ServicePhoneDrawer'],
  ['noticeDialog', '来信须知弹窗', 'LetterNoticeDialog'],
  ['mailListBlock', '我的信件二级视图组件组', 'MailListFilters + MailListCard + MailProgressSteps + MailAttachmentList + MailEvaluateDialog'],
  ['userMenu', '登录入口与用户菜单', 'UserInfoDropdown + 登录按钮 + logoutPortal'],
  ['decorativeAssets', '装饰与品牌资产', 'logo/background/action card images/OverlapSquaresIcon/avatar'],
  ['mobile', '移动端组件', 'mobile views + MobileMailCard/MobileProgressSteps/MobilePublicLetterCard/MobileServicePhoneDrawer']
]

const layoutVariants = [
  ['campusGateway', '校园门户首屏', '大校园图像主视觉 + 右侧登录/服务入口 + 下方模块网格，适合综合型大学门户'],
  ['landmarkSplit', '地标分屏', '校园地标图片与业务模块左右分屏，写信/我的信件入口贴近主视觉，适合有强建筑识别的学校'],
  ['serviceDashboard', '服务仪表盘', '顶部品牌栏 + 数据/状态摘要 + 多列服务卡片，适合事务服务型、信息密集型页面'],
  ['academicMagazine', '学术杂志式', '大图/校训/公告式标题 + 错落模块区，适合强调文化气质和国际化表达的学校'],
  ['noticeBoard', '公告栏式', '校园公告栏/服务台构图 + 来信选登优先，适合朴素可信的公共服务场景']
]

if (args.help) {
  console.log(`Usage:
node component-template-kit.mjs --mode catalog
node component-template-kit.mjs --mode questions
node component-template-kit.mjs --mode variants
node component-template-kit.mjs --mode quality
node component-template-kit.mjs --mode template
node component-template-kit.mjs --mode write --out principal-mailbox-component-template

Modes:
  catalog    Print existing-project component slot catalog.
  questions  Print the component-list question.
  variants   Print layout variants for school-specific page frames.
  quality    Print Ant Design, image, alignment, and visual-quality rules.
  template   Print React + Ant Design slot template code.
  css        Print template CSS.
  write      Write PrincipalMailboxTemplate.tsx and principal-mailbox-template.css to --out.`)
  process.exit(0)
}

if (mode === 'catalog') {
  console.log(renderCatalog())
} else if (mode === 'questions') {
  console.log(renderQuestions())
} else if (mode === 'variants') {
  console.log(renderLayoutVariants())
} else if (mode === 'quality') {
  console.log(renderQualityRules())
} else if (mode === 'template') {
  console.log(templateTsx().trim())
} else if (mode === 'css') {
  console.log(templateCss().trim())
} else if (mode === 'write') {
  writeTemplate()
} else {
  console.error(`Unknown mode: ${mode}`)
  process.exit(1)
}

function renderCatalog() {
  return `现有项目组件槽位目录：
${slots.map(([key, title, components]) => `- ${key}: ${title} -> ${components}`).join('\n')}

使用规则：
- 用户样式描述只决定 layout frame、视觉层级、tokens、密度、品牌感。
- 用户组件清单决定哪些槽位可见；未选择槽位不得出现在设计稿或代码中。
- 组件槽位来自当前项目结构，不能自由新增模块名；确需新增必须先询问用户。
- 每个学校必须先选一个布局变体或生成等价新变体；不能所有学校都用同一个首页骨架。
- decorativeAssets=yes 时，设计稿和代码必须包含真实或生成的学校视觉资产槽：校徽/Logo、校园主图、地标/建筑/文化纹理至少两类。
- React 项目必须用 Ant Design 的 Layout、Grid、Form、Input、Button、Card、Tabs、List、Drawer、Modal、Message/App、Empty/Spin/Alert/Tag 等组件承载对应 UI；不能用 div/span 伪造。
- 固定接口、window globals、payload、跳转、登录 data redirect、交互状态仍以合同为准。`
}

function renderQuestions() {
  return `请用户提供组件清单，必须从下面现有项目槽位中选择：
${slots.map(([key, title]) => `- ${key}: ${title}`).join('\n')}

默认清单：appShell, loginBlock, actionCards, publicLettersBlock, servicePhoneBlock, noticeDialog, mailListBlock, userMenu, decorativeAssets, mobile。

拿到用户清单后：
1. 先从 layout variants 中选择最适合学校特色的页面框架；不同学校不得默认复用同一框架。
2. 再把 UI 风格描述落成 style tokens、学校视觉资产和模块密度。
3. 再把用户选择的组件槽位填入布局框架。
4. 未选择组件不得出现在设计稿或代码里。
5. 代码必须基于模板结构和 Ant Design 组件矩阵，不要重新发明页面模块。`
}

function renderLayoutVariants() {
  return `学校差异化 layout variants：
${layoutVariants.map(([key, title, description]) => `- ${key}: ${title} -> ${description}`).join('\n')}

选择规则：
- 设计稿生成前必须明确一个 layoutVariant，并写入 design-fidelity.map.md。
- 不同学校不得长期复用同一 variant；如果同一 variant 连续使用，必须至少改变主视觉构图、模块顺序、色彩系统、校园图像处理、组件密度中的三项。
- 用户给出校名、校徽、校训、校园建筑、地域文化、学校类型时，layoutVariant 必须围绕这些特征选择。
- 缺少学校信息时，使用 campusGateway 作为兜底，但仍要生成校园主图和品牌识别位，不允许纯白卡片堆叠。`
}

function renderQualityRules() {
  return `UI 质量硬规则：
- 学校视觉资产：decorativeAssets=yes 时，登录页和首页至少使用两类学校视觉资产：校徽/Logo、校园主图、地标建筑、校园纹理、学院色图案、校训字标。缺用户素材时，用 imagegen2 生成校园主图/地标图，不要只用渐变背景。
- Layout 差异化：每次生成必须选择 layoutVariant；不同学校模板相似度不得高于 50%，至少改变首页框架、主视觉构图、模块顺序、色彩系统、校园符号、组件处理六项中的四项。
- Ant Design 组件矩阵：页面外壳用 ConfigProvider + Layout；栅格用 Row/Col 或 Flex/Space；登录用 Form/Input/Button/Alert；入口用 Card/Button/Tag/Badge；来信选登用 Tabs/List/Card/Empty/Spin；服务电话用 Card/List/Drawer/Input.Search；我的信件用 Form/Select/List/Card/Steps/Tag/Button；须知/评价用 Modal/Rate/Input.TextArea；反馈用 App/message/Alert。
- 禁止伪组件：不要用 div/span 手写输入框、按钮、下拉、弹窗、抽屉、标签页、列表 loading/empty/error；Ant Design 有对应组件时必须使用。
- 对齐标准：所有小组件必须在同一 24px 栅格和 8px 子栅格内；卡片同一行等高；按钮高度统一；表单 label/input/error 对齐；列表 tag/code/date/action 区域有固定列宽；移动端单列重排不挤压文本。
- 状态完整：设计稿和代码都要表现 loading、empty、error、disabled、验证码倒计时、字段错误、接口错误、二级我的信件登录态。
- 还原标准：代码实现后截图对比设计稿；若卡片高度不齐、按钮基线不齐、表单错误位置漂移、列表列宽混乱、AntD 组件被伪造，必须修复后交付。`
}

function writeTemplate() {
  const outDir = path.resolve(args.out || 'principal-mailbox-component-template')
  mkdirSync(outDir, { recursive: true })
  writeFileSync(path.join(outDir, 'PrincipalMailboxTemplate.tsx'), `${templateTsx().trim()}\n`, 'utf8')
  writeFileSync(path.join(outDir, 'principal-mailbox-template.css'), `${templateCss().trim()}\n`, 'utf8')
  writeFileSync(path.join(outDir, 'component-slots.md'), `${renderCatalog().trim()}\n`, 'utf8')
  writeFileSync(path.join(outDir, 'layout-variants.md'), `${renderLayoutVariants().trim()}\n`, 'utf8')
  writeFileSync(path.join(outDir, 'ui-quality-rules.md'), `${renderQualityRules().trim()}\n`, 'utf8')
  console.log(`Component template written: ${outDir}`)
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

function templateTsx() {
  return `
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  Col,
  ConfigProvider,
  Drawer,
  Dropdown,
  Empty,
  Flex,
  Form,
  Input,
  Layout,
  List,
  Modal,
  Rate,
  Row,
  Select,
  Space,
  Spin,
  Steps,
  Tabs,
  Tag,
  Typography,
  message
} from 'antd'
import type { CSSProperties, ReactNode } from 'react'
import './principal-mailbox-template.css'

const { Header, Content, Footer } = Layout
const { Title, Text, Paragraph } = Typography

export type PrincipalMailboxSlot =
  | 'appShell'
  | 'loginBlock'
  | 'actionCards'
  | 'publicLettersBlock'
  | 'servicePhoneBlock'
  | 'noticeDialog'
  | 'mailListBlock'
  | 'userMenu'
  | 'decorativeAssets'
  | 'mobile'

export type PrincipalMailboxLayoutVariant =
  | 'campusGateway'
  | 'landmarkSplit'
  | 'serviceDashboard'
  | 'academicMagazine'
  | 'noticeBoard'

export type PrincipalMailboxAssets = {
  logoUrl?: string
  heroImageUrl?: string
  landmarkImageUrl?: string
  campusTextureUrl?: string
  actionWriteImageUrl?: string
  actionMailImageUrl?: string
  avatarUrl?: string
}

export type PrincipalMailboxStyleBrief = {
  schoolName?: string
  schoolMotto?: string
  campusTagline?: string
  layoutVariant?: PrincipalMailboxLayoutVariant
  logoUrl?: string // legacy alias; prefer assets.logoUrl
  heroImageUrl?: string // legacy alias; prefer assets.heroImageUrl
  primaryColor?: string
  accentColor?: string
  background?: string
  density?: 'compact' | 'balanced' | 'spacious'
  radius?: number
  assets?: PrincipalMailboxAssets
}

export type PrincipalMailboxTemplateProps = {
  styleBrief: PrincipalMailboxStyleBrief
  enabledSlots: PrincipalMailboxSlot[]
  loggedIn?: boolean
  userName?: string
  countdown?: number
  loading?: boolean
  children?: ReactNode
}

const hasSlot = (slots: PrincipalMailboxSlot[], slot: PrincipalMailboxSlot) => slots.includes(slot)

export function PrincipalMailboxTemplate({
  styleBrief,
  enabledSlots,
  loggedIn = false,
  userName = '用户',
  countdown = 0,
  loading = false
}: PrincipalMailboxTemplateProps) {
  const assets = {
    ...styleBrief.assets,
    logoUrl: styleBrief.assets?.logoUrl || styleBrief.logoUrl,
    heroImageUrl: styleBrief.assets?.heroImageUrl || styleBrief.heroImageUrl
  }
  const activeVariant = styleBrief.layoutVariant || 'campusGateway'
  const showDecor = hasSlot(enabledSlots, 'decorativeAssets')
  const heroImage = assets.heroImageUrl || assets.landmarkImageUrl
  const themeStyle = {
    '--pm-primary': styleBrief.primaryColor || '#1769e0',
    '--pm-accent': styleBrief.accentColor || '#0f9f75',
    '--pm-bg': styleBrief.background || '#f4f8ff',
    '--pm-radius': \`\${styleBrief.radius ?? 12}px\`
  } as CSSProperties

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: styleBrief.primaryColor || '#1769e0',
          colorSuccess: styleBrief.accentColor || '#0f9f75',
          borderRadius: styleBrief.radius ?? 12
        }
      }}
    >
    <Layout className={\`pm-template density-\${styleBrief.density || 'balanced'} variant-\${activeVariant}\`} style={themeStyle}>
      {hasSlot(enabledSlots, 'appShell') && (
        <Header className="pm-header">
          <Flex align="center" gap={12} className="pm-brand">
            {showDecor && assets.logoUrl ? <Avatar size={44} src={assets.logoUrl} /> : <span className="pm-logo-mark" />}
            <div>
              <Text className="pm-brand-title">{styleBrief.schoolName || '校长信箱'}</Text>
              <Text className="pm-brand-subtitle">{styleBrief.schoolMotto || '师生诉求服务平台'}</Text>
            </div>
          </Flex>
          {hasSlot(enabledSlots, 'userMenu') && (
            loggedIn ? (
              <Dropdown menu={{ items: [{ key: 'profile', label: userName }, { key: 'logout', label: '退出登录' }] }}>
                <Button type="text">
                  <Space><Avatar src={showDecor ? assets.avatarUrl : undefined}>{userName.slice(0, 1)}</Avatar>{userName}</Space>
                </Button>
              </Dropdown>
            ) : (
              <Button type="primary">登录</Button>
            )
          )}
        </Header>
      )}

      <Content className="pm-main">
        <section className="pm-hero">
          <Row gutter={[32, 24]} align="middle" className="pm-hero-row">
            <Col xs={24} lg={activeVariant === 'serviceDashboard' ? 14 : 15}>
              <Space direction="vertical" size={16} className="pm-hero-copy">
                <Tag color="processing">Principal Mailbox</Tag>
                <Title level={1}>倾听您的声音，共建美好校园</Title>
                <Paragraph>{styleBrief.campusTagline || '围绕师生诉求、公开信件、进度查询和服务电话组织校园公共服务。'}</Paragraph>
                <Space wrap>
                  <Badge color="var(--pm-accent)" text="公开透明" />
                  <Badge color="var(--pm-primary)" text="按进度流转" />
                  <Badge color="#8b5cf6" text="师生服务" />
                </Space>
              </Space>
            </Col>
            <Col xs={24} lg={activeVariant === 'serviceDashboard' ? 10 : 9}>
              {showDecor && heroImage ? (
                <img className="pm-hero-image" src={heroImage} alt="" />
              ) : (
                <div className="pm-campus-image-placeholder">校园主图 / 地标建筑 / 学校文化纹理</div>
              )}
            </Col>
          </Row>
        </section>

        {hasSlot(enabledSlots, 'loginBlock') && (
          <Card className="pm-login-card">
            <Space direction="vertical" size={18} className="pm-fill">
              <Title level={3}>欢迎登录</Title>
              <Alert className="pm-state-sample" type="error" showIcon message="接口错误和网络错误展示在统一反馈区" />
            </Space>
            <Form layout="vertical" requiredMark={false}>
              <Form.Item label="手机号" required validateStatus="error" help="请输入正确的手机号">
                <Input size="large" placeholder="请输入手机号" />
              </Form.Item>
              <Form.Item label="验证码" required>
                <Input
                  size="large"
                  placeholder="请输入6位验证码"
                  suffix={<Button disabled={countdown > 0}>{countdown > 0 ? \`\${countdown}s后重发\` : '获取验证码'}</Button>}
                />
              </Form.Item>
              <Space direction="vertical" size={12} className="pm-fill">
                <Button type="primary" size="large" block loading={loading}>登录（校外人员）</Button>
                <Button size="large" block>统一身份认证登录</Button>
              </Space>
            </Form>
          </Card>
        )}

        {hasSlot(enabledSlots, 'actionCards') && (
          <Row gutter={[24, 24]} className="pm-action-grid">
            <Col xs={24} md={12}>
              <Card className="pm-action-card" hoverable cover={showDecor && assets.actionWriteImageUrl ? <img alt="" src={assets.actionWriteImageUrl} /> : undefined}>
                <Space direction="vertical"><Tag color="success">写信入口</Tag><Title level={3}>我要写信</Title><Paragraph>向学校表达意见、建议或问题</Paragraph><Button type="primary">开始写信</Button></Space>
              </Card>
            </Col>
            <Col xs={24} md={12}>
              <Card className="pm-action-card" hoverable cover={showDecor && assets.actionMailImageUrl ? <img alt="" src={assets.actionMailImageUrl} /> : undefined}>
                <Space direction="vertical"><Tag color="processing">进度查询</Tag><Title level={3}>我的信件</Title><Paragraph>查看已提交信件、流转进度和回复评价</Paragraph><Button>查看信件</Button></Space>
              </Card>
            </Col>
          </Row>
        )}

        {hasSlot(enabledSlots, 'publicLettersBlock') && (
          <section className="pm-section pm-public-letters">
            <Flex className="pm-section-header" align="center" justify="space-between" gap={16}>
              <Title level={2}>来信选登</Title>
              <Input.Search className="pm-search" placeholder="请输入" />
            </Flex>
            <Tabs items={[{ key: 'all', label: '全部' }, { key: 'consult', label: '咨询' }, { key: 'suggest', label: '建议' }]} />
            <Spin spinning={loading}>
              <List
                grid={{ gutter: 24, xs: 1, md: 2 }}
                dataSource={[1, 2, 3, 4]}
                locale={{ emptyText: <Empty description="暂无记录" /> }}
                renderItem={(item) => (
                  <List.Item key={item}>
                    <Card className="pm-letter-card" hoverable>
                      <Space direction="vertical" size={10} className="pm-fill">
                        <Flex align="center" justify="space-between"><Tag color="success">建议</Tag><Text type="secondary">阅读 128</Text></Flex>
                        <Title level={4}>关于校园服务体验的建议</Title>
                        <Paragraph>这里放置信件摘要和回复摘要，真实项目接入 registerLetters 数据。</Paragraph>
                      </Space>
                    </Card>
                  </List.Item>
                )}
              />
            </Spin>
          </section>
        )}

        {hasSlot(enabledSlots, 'servicePhoneBlock') && (
          <Card className="pm-service-card" title="校园服务电话" extra={<Button type="link">更多</Button>}>
            <List
              grid={{ gutter: 16, xs: 1, md: 2 }}
              dataSource={[['党委办公室', '025-00000000'], ['后勤服务', '025-00000001']]}
              renderItem={([name, phone]) => <List.Item><Flex justify="space-between" className="pm-phone-row"><Text>{name}</Text><Text strong>{phone}</Text></Flex></List.Item>}
            />
            <Drawer title="校园服务电话" open={false} onClose={() => message.info('close')}><Input.Search placeholder="搜索部门或电话" /></Drawer>
          </Card>
        )}

        {hasSlot(enabledSlots, 'mailListBlock') && loggedIn && (
          <section className="pm-section pm-mail-view">
            <Flex className="pm-section-header" align="center" justify="space-between" gap={16}>
              <Title level={2}>我的信件</Title>
              <Form layout="inline" className="pm-filter-row">
                <Form.Item><Input placeholder="信件标题" /></Form.Item>
                <Form.Item><Select placeholder="信件状态" options={[{ value: 'reviewed', label: '已回复' }]} /></Form.Item>
                <Form.Item><Button type="primary">查询</Button></Form.Item>
              </Form>
            </Flex>
            <Card className="pm-mail-card">
              <Flex align="start" justify="space-between" gap={16}><Title level={4}>关于校园环境的建议</Title><Tag color="success">已回复</Tag></Flex>
              <Steps size="small" current={2} items={[{ title: '信件提交' }, { title: '信件分派' }, { title: '信件回复' }, { title: '信件评价' }]} />
              <div className="pm-attachment-list"><span>附件：</span><Button type="link">问题说明.pdf</Button></div>
              <Space><Button>查看</Button><Button>评价</Button></Space>
            </Card>
          </section>
        )}
      </Content>

      {hasSlot(enabledSlots, 'noticeDialog') && <Modal title="来信须知" open={false} okText="同意并开始写信"><p>这里展示 getConfig.noticeContent。</p></Modal>}
      {hasSlot(enabledSlots, 'mailListBlock') && <Modal title="信件评价" open={false}><Rate defaultValue={5} /><Input.TextArea maxLength={500} placeholder="评价意见" /></Modal>}
      {hasSlot(enabledSlots, 'appShell') && <Footer className="pm-footer">校园公共服务平台</Footer>}
    </Layout>
    </ConfigProvider>
  )
}
`
}

function templateCss() {
  return `
.pm-template {
  min-height: 100vh;
  background: var(--pm-bg);
  color: #152033;
  font-family: Inter, "PingFang SC", "Microsoft YaHei", Arial, sans-serif;
}

.pm-header {
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 clamp(20px, 4vw, 56px);
  border-bottom: 1px solid rgba(23, 105, 224, .12);
  background: rgba(255, 255, 255, .88);
  backdrop-filter: blur(14px);
}

.pm-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 20px;
  font-weight: 600;
}

.pm-brand > div {
  display: grid;
  gap: 2px;
}

.pm-brand-title {
  color: #10233f;
  font-size: 20px;
  font-weight: 700;
}

.pm-brand-subtitle {
  color: #64748b;
  font-size: 12px;
}

.pm-logo-mark {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--pm-primary);
}

.pm-main {
  width: min(1200px, calc(100% - 48px));
  margin: 0 auto;
  display: grid;
  gap: 24px;
  padding: 28px 0 48px;
}

.pm-fill {
  width: 100%;
}

.pm-hero,
.pm-section,
.pm-login-card,
.pm-service-card,
.pm-mail-card {
  border-radius: var(--pm-radius);
}

.pm-hero {
  position: relative;
  overflow: hidden;
  min-height: 320px;
  padding: 32px;
  border: 1px solid rgba(23, 105, 224, .12);
  background:
    linear-gradient(135deg, rgba(255,255,255,.96), rgba(255,255,255,.76)),
    radial-gradient(circle at 20% 20%, rgba(23,105,224,.12), transparent 36%);
}

.pm-hero-copy h1 {
  max-width: 720px;
  margin: 0;
  color: #0f2342;
  font-size: clamp(36px, 5vw, 56px);
  line-height: 1.08;
}

.pm-hero-copy .ant-typography {
  font-size: 16px;
  line-height: 1.8;
}

.pm-hero-image,
.pm-campus-image-placeholder {
  width: 100%;
  height: 260px;
  border-radius: calc(var(--pm-radius) + 8px);
  object-fit: cover;
}

.pm-campus-image-placeholder {
  display: grid;
  place-items: center;
  border: 1px dashed rgba(23, 105, 224, .32);
  background: linear-gradient(135deg, rgba(23,105,224,.12), rgba(15,159,117,.10));
  color: #48627f;
  text-align: center;
}

.pm-eyebrow,
.pm-tag {
  color: var(--pm-primary);
  font-weight: 600;
}

.pm-action-grid {
  align-items: stretch;
}

.pm-action-card,
.pm-letter-card {
  height: 100%;
  border-radius: var(--pm-radius);
}

.pm-action-card .ant-card-cover img {
  height: 144px;
  object-fit: cover;
}

.pm-section {
  padding: 20px;
  border: 1px solid rgba(15, 35, 66, .08);
  background: rgba(255,255,255,.94);
}

.pm-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.pm-search {
  width: 260px;
}

.pm-phone-row {
  width: 100%;
  min-height: 36px;
  padding: 0 4px;
}

.pm-filter-row {
  justify-content: flex-end;
}

.pm-filter-row .ant-form-item {
  margin-inline-end: 8px;
}

.pm-mail-card {
  display: grid;
  gap: 16px;
}

.pm-attachment-list {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 8px 0 12px;
  color: #505266;
}

.pm-state-sample {
  margin-bottom: 4px;
}

.pm-footer {
  padding: 24px;
  text-align: center;
  color: #64748b;
  background: transparent;
}

.variant-landmarkSplit .pm-hero {
  min-height: 380px;
}

.variant-landmarkSplit .pm-hero-row {
  flex-direction: row-reverse;
}

.variant-serviceDashboard .pm-main {
  width: min(1280px, calc(100% - 48px));
}

.variant-serviceDashboard .pm-hero {
  min-height: 260px;
}

.variant-academicMagazine .pm-hero {
  border-radius: 0 0 calc(var(--pm-radius) * 2) calc(var(--pm-radius) * 2);
}

.variant-academicMagazine .pm-action-grid {
  margin-top: -48px;
}

.variant-noticeBoard .pm-hero {
  background:
    linear-gradient(135deg, rgba(255,255,255,.98), rgba(255,255,255,.84)),
    repeating-linear-gradient(90deg, rgba(23,105,224,.08) 0, rgba(23,105,224,.08) 1px, transparent 1px, transparent 24px);
}

@media (max-width: 768px) {
  .pm-header {
    height: auto;
    min-height: 64px;
    padding: 12px 16px;
  }

  .pm-main {
    width: min(100% - 32px, 480px);
  }

  .pm-hero {
    min-height: auto;
    padding: 22px;
  }

  .pm-hero-copy h1 {
    font-size: 32px;
  }

  .pm-filter-row {
    width: 100%;
    justify-content: flex-start;
  }

  .pm-filter-row .ant-form-item {
    width: 100%;
  }
}
`
}
