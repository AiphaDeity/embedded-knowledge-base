# Markdown 语法从入门到精通

[飞书原文](https://hcn4ticlccda.feishu.cn/docx/CLbedbRVboD2NnxZJq7cH4CNnsc)

版本：v2.1更新时间：2026-05-27适用范围：飞书文档 / 知识库 / 多维表格、GitHub、GitLab、语雀

---

## 📖 前言

Markdown 是一种轻量级标记语言，用纯文本编写结构化文档，语法简洁、兼容性强，是程序员、产品经理、内容创作者的必备技能。

本教程优势：

- ✅ 100% 飞书文档实测兼容
- ✅ 每个语法点「代码示例 + 实际效果」对照
- ✅ 从零基础到高级技巧全覆盖
- ✅ 包含飞书专属扩展语法
- ✅ 附赠常用语法速查表（可打印）

---

## 🔧 飞书文档使用 Markdown 的 3 种方式

1. 直接输入（推荐）：输入标记后按回车 / 空格自动渲染
2. 粘贴导入：复制纯 Markdown 文本直接粘贴到文档
3. 文件导入：右上角「...」→「导入」→「Markdown 文件」

---

## 📚 基础语法（必学，10 分钟掌握）

### 标题（6 级）

`#` 数量对应级别，与文字间必须有空格

```text
# 一级标题（文档主标题）
## 二级标题（大章节）
### 三级标题（小节）
#### 四级标题（子小节）
##### 五级标题（极少用）
###### 六级标题（极少用）
```

### 段落与换行

- 段落：两个段落间用一个空行分隔
- 换行：行尾加两个空格或使用 `<br>`

```text
这是第一段。

这是第二段，
这一行和上一段同属一个段落。

这是第三段。<br>
这一行是强制换行后的内容。
```

### 文本强调

标记与文字间不能有空格，支持嵌套

```text
**粗体**（重要内容）
*斜体*（次要强调）
***粗斜体***（特别强调）
~~删除线~~（过时内容）
==高亮==（飞书专属，重点标记）
**粗体中包含*斜体*文字**（嵌套示例）
```

### 列表

#### 4.1 无序列表

使用 `-`/`*`/`+`，按`Tab`缩进生成子列表

```text
- 列表项1
- 列表项2
  - 子列表项1（缩进2个空格）
  - 子列表项2
- 列表项3
```

#### 4.2 有序列表

数字 + 英文句点，数字顺序不影响渲染

```text
1. 第一步
2. 第二步
   1. 子步骤1
   2. 子步骤2
3. 第三步
```

### 链接

markdown

```text
[链接文字](https://www.feishu.cn "可选：鼠标悬停提示")
https://www.feishu.cn（自动链接）
[跳转到基础语法](#基础语法必学10分钟掌握)（锚点链接，空格用-代替）
```

### 图片

```text
![图片描述](图片地址 "可选：图片标题")
```

> 飞书技巧：直接拖入图片或粘贴截图，自动上传云端

### 代码

#### 7.1 行内代码

单个反引号包裹

```text
Python中使用 `print()` 函数输出内容
```

#### 7.2 代码块（带语法高亮）

三个反引号包裹，指定编程语言

```text
# Python代码示例
def hello_world():
    print("Hello, Markdown!")

hello_world()
```

### 分割线

三个及以上 `-`/`*`/`_`，单独占一行

```text
---
***
___
```

### 引用

`>` 表示引用，支持嵌套

```text
> 一级引用
> > 二级引用（嵌套）
> > > 三级引用
>
> 回到一级引用
```

---

## 🚀 进阶语法（选学，提升文档专业性）

### 表格

`|` 分隔单元格，`-` 分隔表头和表体

```text
| 姓名 | 年龄 | 职业 |
|------|------|------|
| 张三 | 25 | 程序员 |
| 李四 | 30 | 产品经理 |
| 王五 | 28 | 设计师 |
```

对齐方式设置：

```text
| 左对齐 | 居中对齐 | 右对齐 |
|:------|:--------:|-------:|
| 内容1 | 内容2 | 内容3 |
| 内容4 | 内容5 | 内容6 |
```

### 任务列表

```text
- [x] 已完成任务
- [ ] 未完成任务
  - [ ] 子任务1
  - [x] 子任务2
```

> 飞书技巧：点击复选框可直接切换状态

### 脚注

```text
Markdown由John Gruber于2004年创建[^1]

[^1]: 参考资料：https://daringfireball.net/projects/markdown/
```

### 数学公式（LaTeX）

```text
行内公式：勾股定理 $a^2 + b^2 = c^2$

块级公式：
$$
\int_{0}^{\infty} e^{-x^2} dx = \frac{\sqrt{\pi}}{2}
$$
```

### Mermaid 图表（飞书原生支持）

#### 5.1 流程图

豆包

你的 AI 助手，助力每日工作学习

#### 5.2 时序图

豆包

你的 AI 助手，助力每日工作学习

---

## ✨ 飞书文档专属扩展语法

### 表情符号

输入 `:` 自动弹出选择器

```text
:smile: :laughing: :blush: :heart: :thumbsup:
```

### 团队协作

```text
@张三 （提醒成员）
@2026-06-01 （插入日期）
@项目需求文档 （引用其他飞书文档）
```

### 折叠块（隐藏长内容）

````text
<details>
<summary>点击展开查看详细内容</summary>

这里是折叠起来的内容，可以包含：
- 列表
- 代码块
- 表格等所有Markdown语法

```python
print("折叠块中的代码")
````

&lt;/details&gt; \`\`\`

---

## ❓ 常见问题解决方案

1. 如何输入 Markdown 标记本身？

```text
\*这不是斜体\*
\#这不是标题
```

1. 如何在代码块中输入三个反引号？使用四个反引号包裹

````text
```python
print("Hello")
```
````

1. 如何调整图片大小？

   - 飞书内直接拖动边框
   - 使用 HTML 标签：`<img src="图片地址" width="200">`
2. 如何设置文字颜色？

```text
<span style="color:red">红色文字</span>
<span style="background-color:yellow">黄色背景</span>
```

1. 如何导出 Markdown 文件？右上角「...」→「导出为」→「Markdown」

---

## 📋 常用语法速查表（可打印）

表格


<table v-pre><tbody><tr><td>语法类型</td><td>代码示例</td><td>实际效果</td><td>备注</td></tr><tr><td>一级标题</td><td># 标题</td><td>&lt;h1&gt;标题&lt;/h1&gt;</td><td>文档主标题</td></tr><tr><td>二级标题</td><td>## 标题</td><td>&lt;h2&gt;标题&lt;/h2&gt;</td><td>大章节</td></tr><tr><td>三级标题</td><td>### 标题</td><td>&lt;h3&gt;标题&lt;/h3&gt;</td><td>小节</td></tr><tr><td>粗体</td><td>**文字**</td><td>文字</td><td>重要内容</td></tr><tr><td>斜体</td><td>*文字*</td><td>文字</td><td>次要强调</td></tr><tr><td>删除线</td><td>~~文字~~</td><td>文字</td><td>过时内容</td></tr><tr><td>高亮</td><td>==文字==</td><td>== 文字 ==</td><td>飞书专属</td></tr><tr><td>无序列表</td><td>- 列表项</td><td>- 列表项</td><td>按 Tab 缩进</td></tr><tr><td>有序列表</td><td>1. 列表项</td><td>1. 列表项</td><td>数字顺序无关</td></tr><tr><td>任务列表</td><td>- [ ] 任务</td><td>- [ ] 任务</td><td>点击切换状态</td></tr><tr><td>链接</td><td>[百度](https://www.baidu.com)</td><td>百度</td><td>可加悬停提示</td></tr><tr><td>图片</td><td>![描述](地址)</td><td>图片</td><td>直接拖入更方便</td></tr><tr><td>行内代码</td><td>`代码`</td><td>代码</td><td>单个反引号</td></tr><tr><td>代码块</td><td>python 代码 </td><td>代码块</td><td>支持语法高亮</td></tr><tr><td>引用</td><td>&gt; 引用内容</td><td>&gt; 引用内容</td><td>支持嵌套</td></tr><tr><td>分割线</td><td>---</td><td>---</td><td>单独占一行</td></tr><tr><td>表格</td><td>| 表头 |</td><td>表格</td><td>支持对齐设置</td></tr><tr><td>脚注</td><td>文字[^1]</td><td>文字 [^1]</td><td>文末定义</td></tr><tr><td>行内公式</td><td>$公式$</td><td>a2+b2=c2</td><td>LaTeX 语法</td></tr><tr><td>块级公式</td><td>$$公式$$</td><td>块级公式</td><td>居中显示</td></tr><tr><td>折叠块</td><td>&lt;details&gt;...&lt;/details&gt;</td><td>折叠块</td><td>隐藏长内容</td></tr><tr><td>提醒</td><td>@张三</td><td>@张三</td><td>飞书专属</td></tr><tr><td>日期</td><td>@2026-06-01</td><td>@2026-06-01</td><td>飞书专属</td></tr></tbody></table>


---

## 🛠️ 实用工具推荐

- Typora：所见即所得 Markdown 编辑器
- VS Code：安装 Markdown All in One 插件
- Mermaid Live Editor：在线绘制图表 [https://mermaid.live/](https://mermaid.live/)
- Markdown 表格生成器：[https://www.tablesgenerator.com/markdown_tables](https://www.tablesgenerator.com/markdown_tables)

---

## 📝 最佳实践

1. 最多使用 3 级标题，保持文档结构清晰
2. 统一使用 `-` 作为无序列表标记
3. 代码块必须指定编程语言以获得语法高亮
4. 长内容使用折叠块隐藏，提升阅读体验
5. 重要内容用粗体或高亮标记，避免过度格式化

---

## 🎯 导入飞书文档步骤

1. 复制本文全部内容（从标题到参考资料）
2. 打开飞书文档，新建空白文档
3. 直接粘贴内容，系统会自动渲染所有格式
4. 或：将本文保存为 `markdown教程.md` 文件，通过「导入」功能上传

---

## 📚 参考资料

- [Markdown 官方文档](https://daringfireball.net/projects/markdown/)
- [飞书文档 Markdown 帮助中心](https://www.feishu.cn/hc/zh-CN/articles/943600213284562953)
- [Mermaid 官方文档](https://mermaid.js.org/)
