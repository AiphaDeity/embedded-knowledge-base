# Gitee仓库基础配置

[飞书原文](https://hcn4ticlccda.feishu.cn/docx/M4eGdcmlZokl4BxY9Lrc7zGVnbg)

# 本地无项目

建立本地项目文件夹，建立gitee仓库

用VS Code打开本地项目文件夹，打开终端

在终端输入代码：`git clone Gitee仓库HTTPS地址`

# 本地已有项目

用VS Code打开本地项目文件夹

终端初始化本地仓库：`git init`    反馈：Initialized empty Git repository in 本地文件夹/.git

把本地仓库和Gitee仓库关联：`git remote add origin Gitee仓库HTTPS地址`

把所有文件加入暂存区：`git add .`

提交本次修改：`git commit -m "初始化内容，例如XX项目代码"`    反馈：这一步会显示你提交了多少文件，多少行改动

推送到Gitee远程仓库：git push - u origin main

---

---

---

# 豆包版本地项目绑定Gitee仓库指南：

### 本地项目绑定 Gitee 仓库指南

作者：楚歌 | 更新日期：今天

---

### 一、准备工作

1. 提前在 Gitee 官网新建一个**空仓库**（不要勾选 “初始化 README”“添加.gitignore”）
2. 复制仓库的 **HTTPS 地址（**格式：`https://gitee.com/``你的用户名/你的仓库名.git`）
3. 确保 VS Code 终端已经切换到你的项目文件夹目录（可以用 `cd 你的项目路径` 切换）

---

### 二、场景 1：本地无项目

适合：还没写代码，想直接把远程仓库拉到本地开发

1. 新建本地项目文件夹，用 VS Code 打开，打开终端
2. 执行克隆命令：`git clone 你的Gitee仓库HTTPS地址`
3. 执行成功后，会自动生成一个和仓库同名的文件夹，里面已经包含 `.git` 配置
4. 进入该文件夹，就可以直接写代码、提交推送了

---

### 三、场景 2：本地已有项目

适合：本地已经写好代码，要绑定到 Gitee 仓库

1. 用 VS Code 打开本地项目文件夹，打开终端
2. 初始化本地 Git 仓库（只会生成隐藏的 `.git` 文件夹，不会修改任何文件）：`git init`

     反馈：`Initialized empty Git repository in 本地文件夹/.git`

1. 关联本地仓库和 Gitee 远程仓库：`git remote add origin 你的Gitee仓库HTTPS地址`

     验证关联：可以执行 `git remote -v`，能看到远程仓库的地址就说明绑定成功

1. 把所有文件加入暂存区（`.` 代表当前目录下的所有文件）：`git add .`

     提示：如果提示 `nothing added`，检查命令里的 `git add` 和 `.` 之间有没有空格

1. 提交本次修改（`-m` 后面写清楚提交说明，方便以后回溯）`git commit -m "初始化内容，例如STM32项目代码"`

     反馈：会显示提交了多少文件、多少行改动

1. 推送到 Gitee 远程仓库（**注意是 `main` 不是 `master`**，Gitee 默认分支是 `main`）：`git push -u origin main`

     反馈：`[new branch] main -> main` 代表推送成功

---

### 四、常见报错处理

#### 报错 1：`error: src refspec master does not match any`

- 原因：本地默认分支是 `master`，但 Gitee 仓库默认分支是 `main`，分支名不匹配
- 解决：把推送命令里的 `master` 改成 `main`，执行 `git push -u origin main`

#### 报错 2：`fatal: couldn't find remote ref master`

- 原因：远程仓库里没有 `master` 分支，只有 `main` 分支
- 解决：直接推送到 `main` 分支，命令同上

#### 报错 3：`git add` 执行后提示 `Nothing specified, nothing added`

- 原因：命令写错了，`git add` 后面没有跟文件路径，或者少了空格
- 解决：正确写法是 `git add .`（`git add` 和 `.` 之间必须有空格）

#### 报错 4：推送时提示需要输入账号密码

- 原因：第一次推送需要身份验证
- 解决：

  1. 输入你的 Gitee 用户名
  2. 密码栏输入**个人访问令牌（Token）**（不是你的登录密码，需要在 Gitee 设置里生成）

---

### 五、后续日常提交流程（固定三步）

以后每次改完代码，只需要执行这三条命令，就能把更新推送到 Gitee：

`git add .`

`git commit -m "本次修改说明，比如‘实现LED闪烁功能’"`

`` git push` ``

（因为第一次已经用 `-u` 绑定了 `origin/main`，后面不用再写 `origin main`）

---

### 六、补充小贴士

1. 建议在项目根目录新建 `.gitignore` 文件，过滤掉临时文件、编译产物（比如 STM32 项目的 `.build` 文件夹、`*.o` 文件），避免仓库被垃圾文件占满
2. 提交说明尽量写得清晰，比如 “修复电机驱动 BUG”“添加超声波测距功能”，以后回溯代码时能快速知道每一步改了什么
3. 不要用 `git push -f` 强制推送，除非你能确定本地代码是最新的，强制推送会覆盖远程仓库的内容
