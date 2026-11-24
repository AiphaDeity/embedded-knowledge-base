import { defineConfig } from 'vitepress'

// 站点挂在自定义域根目录（kb.aiphadeity.cn）时 base 为 '/'；仍部署在 GitHub Pages
// 子路径时由 VITEPRESS_BASE 注入 '/embedded-knowledge-base/'。
const siteBase = process.env.VITEPRESS_BASE ?? '/'
const assetBase = siteBase.endsWith('/') ? siteBase : `${siteBase}/`

const topics = [
  ['知识重构', 'review'],
  ['计算机基础知识', 'computing'],
  ['C 语言与数据结构', 'c'],
  ['C++', 'cpp'],
  ['Linux 应用开发', 'linux-app'],
  ['电路原理图与 PCB 设计', 'hardware'],
  ['STM32 嵌入式开发', 'stm32'],
  ['FreeRTOS', 'freertos'],
  ['LVGL', 'lvgl'],
  ['Qt', 'qt'],
  ['嵌入式 Linux 底层开发', 'linux-system'],
  ['嵌入式开发工具', 'tools'],
]

export default defineConfig({
  lang: 'zh-CN',
  title: '嵌入式开发知识库',
  description: '按技术主题查学习笔记，按项目回看经验。',
  base: siteBase,
  markdown: {
    math: true,
    image: { lazyLoading: true },
    config(md) {
      const render = md.renderer.render.bind(md.renderer)
      md.renderer.render = (tokens, options, env) => {
        const html = render(tokens, options, env)
        // 正文里写死的 /feishu-assets/ 和 /embedded-knowledge-base/feishu-assets/ 统一按 base 重写，
        // 换部署根路径后图片、大图链接和附件不会 404。
        const withAssets = html.replace(
          /(href|src)="\/(?:embedded-knowledge-base\/)?feishu-assets\//g,
          `$1="${assetBase}feishu-assets/`,
        )
        // Imported expressions are document text. Keep brace pairs out of Vue's template parser.
        return env.relativePath?.split('/').includes('source')
          ? withAssets.replaceAll('{{', '&#123;&#123;')
          : withAssets
      }
    },
  },
  srcExclude: ['README.md', 'AGENTS.md'],
  themeConfig: {
    nav: [
      { text: '学习笔记', link: '/notes/' },
      { text: '题库', link: '/questions/' },
      { text: '项目经验', link: '/projects/' },
      { text: '技术文档', link: '/reference/' },
    ],
    sidebar: [
      {
        text: '学习笔记',
        link: '/notes/',
        collapsed: true,
        items: topics.map(([text, path]) => ({
          text,
          link: '/notes/' + path + '/',
        })),
      },
      { text: '题库', link: '/questions/' },
      { text: '项目经验', link: '/projects/' },
      { text: '技术文档', link: '/reference/' },
    ],
    outline: { label: '本页目录' },
    sidebarMenuLabel: '目录',
    returnToTopLabel: '回到顶部',
    docFooter: { prev: '上一篇', next: '下一篇' },
    darkModeSwitchLabel: '主题',
    search: {
      provider: 'local',
      options: {
        translations: {
          button: { buttonText: '搜索知识库', buttonAriaLabel: '搜索知识库' },
          modal: {
            displayDetails: '显示详情',
            resetButtonTitle: '清除搜索',
            backButtonTitle: '返回',
            noResultsText: '没有找到相关条目',
            footer: { selectText: '打开', navigateText: '切换', closeText: '关闭' },
          },
        },
        miniSearch: {
          options: {
            tokenize(text) {
              const words = new Intl.Segmenter('zh-CN', { granularity: 'word' }).segment(text)
              return Array.from(words, word => word.segment).filter(word => /[\p{L}\p{N}]/u.test(word))
            },
          },
        },
      },
    },
  },
})


