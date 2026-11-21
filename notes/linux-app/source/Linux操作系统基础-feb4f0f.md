# Linux操作系统基础

[飞书原文](https://hcn4ticlccda.feishu.cn/docx/N8MfdPEzXojbytxKefBclWp6nkd)

# Linux学习第一性原理

### 一、先定义：什么是嵌入式 Linux 的第一性原理

第一性原理核心：抛开现成框架、教程、工具链封装，从最底层物理硬件、计算机基础、操作系统本质三个不可推翻的基础原点推导所有知识，不依赖 “别人这么做” 的经验归纳，从根源理解为什么嵌入式 Linux 每一步要这么操作。

嵌入式 Linux 唯一底层原点：CPU 硬件指令集 + 内存 / 外设硬件接口 + 操作系统资源抽象逻辑 所有交叉编译、U-Boot、内核、根文件系统、驱动、应用开发，全部由这三点推导而来。

### 二、三大底层第一性原点（不可拆分、无法简化的基础）

#### 原点 1：硬件层 ——CPU 与外设的物理约束

1. 架构隔离 PC 是 x86，嵌入式是 ARM/RISC-V；二者指令集完全不兼容，二进制代码不能通用。 推导结论：必须交叉编译，不能直接用 PC 编译器；需要对应架构工具链。
2. 内存限制 嵌入式 RAM 小、Flash 代替硬盘，无 BIOS，无统一固件标准。 推导结论：需要 U-Boot 做初始化、内核镜像压缩、轻量化根文件系统、分区管理。
3. 外设直接寄存器操作 没有统一 PC 南桥，每款芯片 GPIO/I2C/SPI/ADC 寄存器地址完全自定义。 推导结论：驱动必须分平台，设备树用于统一描述硬件寄存器资源，免去硬编码。

#### 原点 2：操作系统本质 ——Linux 内核四大核心职责（所有内核操作的根源）

Linux 内核只做 4 件事，嵌入式所有内核配置、裁剪、驱动都是为这四点服务：

1. 进程调度：管理 CPU 时间片（对应多任务、优先级、实时补丁 RT-Linux）
2. 内存管理：虚拟内存、MMU、缓存、内存泄露、OOM
3. 设备管理：硬件寄存器抽象成文件（一切皆文件）
4. 文件系统：块设备抽象、读写权限、挂载机制

推导：

- 驱动 = 把外设寄存器封装成内核标准文件接口
- 根文件系统 = 内核启动后必须挂载的用户态程序、库、配置载体
- 内核裁剪 = 删除不需要的调度 / 文件系统 / 外设驱动代码，节省 Flash/RAM

#### 原点 3：软硬件分层逻辑（固定分层，所有流程都遵循）

从上电到应用运行分层，是嵌入式 Linux 完整流程的第一性逻辑，顺序不可逆：`硬件上电 → 固化Bootloader(U-Boot) → 加载Linux内核zImage → 内核初始化硬件+挂载根文件系统 → 用户态init进程启动 → 业务应用运行` 任意一层缺失、顺序颠倒，系统无法启动，所有调试（串口、启动卡、分区烧录）都是修复该分层链路。

### 三、基于第一性原理拆解全学习链路

#### Bootloader（U-Boot）层推导

底层约束：CPU 上电只能运行 Flash 极小一段固化代码，无法直接加载复杂内核。

- 作用原点：初始化 DDR、串口、Flash、网口，建立基础读写环境；把内核从 Flash 搬运到内存，传递硬件参数给内核。
- 关键知识点根源： 

  - 环境变量：存储启动指令、内核地址、设备树地址
  - bootcmd/bootargs：给内核传硬件内存、根文件系统位置参数
  - 设备树 dtb：U-Boot 加载后传给内核，告知板载硬件寄存器信息

#### Linux 内核层推导

约束 1：内核必须适配当前 CPU 架构、板载外设； 约束 2：RAM 有限，多余功能必须剔除； 约束 3：需要硬件描述表匹配真实电路板。

- 内核编译第一性逻辑：`芯片架构配置 → 板级defconfig配置外设 → make menuconfig裁剪模块 → make zImage 编译压缩内核 → make dtbs生成设备树`
- 驱动开发根源： 内核提供统一驱动框架（字符 / 块 / 网络），开发者只需要填充芯片寄存器读写逻辑，框架自动封装成 /dev 设备文件。

#### 根文件系统 rootfs 推导

底层原点：内核本身只有硬件管理能力，没有任何可执行程序、C 库、命令行，必须依赖用户态文件系统提供运行环境。 分类底层逻辑：

1. ramfs：完全放内存，断电丢失，适合临时调试
2. jffs2/yaffs：Flash 专用文件系统，适配 Flash 擦写特性
3. ext4：大容量存储，SD 卡 / U 盘使用
4. squashfs：只读压缩，量产设备首选，极小占用

构成必备三要素（缺一不可）：

- /bin/sbin：基础命令（ls、cat、ifconfig）
- /lib：交叉编译 C 标准库 glibc/musl/uclibc，所有程序运行依赖
- /etc：开机启动脚本、网络、设备配置

#### 交叉编译与应用开发推导

原点：PC 编译器生成 x86 二进制，嵌入式 CPU 无法识别，必须使用目标架构编译器。

- 工具链本质：一套包含 gcc、ld、libc、objdump 的跨架构编译工具
- 静态编译 vs 动态编译： 动态：程序依赖 /lib 库，体积小，rootfs 必须带对应库； 静态：把库打包进程序，单独可运行，体积大，适合简易调试。

#### 驱动开发第一性逻辑

记住唯一公式：驱动 = 寄存器操作代码 + 内核标准驱动框架绑定

1. 读芯片手册，获取外设寄存器地址、功能位；
2. 通过设备树获取硬件基地址（避免硬编码适配多板卡）；
3. 调用内核 API 封装 open/read/write 接口；
4. 编译进内核或编译成 ko 动态模块。

### 四、第一性原理指导的正确学习顺序（反直觉，但符合底层逻辑）

市面上很多教程先教写应用、再碰内核，违背底层分层原理，正确溯源顺序：

1. 硬件基础：ARM/RISC-V 汇编、寄存器、内存、I2C/SPI/UART 底层通信（第一物理原点）
2. 裸机开发：不依赖任何系统，直接操作 LED、串口，理解 CPU 上电运行逻辑
3. U-Boot 完整流程：看懂上电启动打印，掌握内存搬运、参数传递
4. Linux 内核原理：进程、虚拟内存、中断、文件系统四大内核本职工作
5. 设备树机制：硬件资源抽象原理
6. 驱动开发：字符驱动为入门，遵循 “寄存器 + 框架” 逻辑
7. 根文件系统构建：理解用户态运行环境依赖
8. 应用开发、网络、QT、实时系统：上层业务，依赖前面全部底层基础

### 五、用第一性原理解决常见困惑（举例）

1. 困惑：为什么开发嵌入式一定要交叉编译器？ 第一性解答：PC 与 ARM 指令集架构不同，CPU 只能识别对应架构二进制，原生 gcc 输出 x86 程序，ARM 无法解码。
2. 困惑：为什么启动必须有 U-Boot，不能直接跑内核？ 第一性解答：CPU 上电 DDR 未初始化，内核无法运行在未配置的内存；U-Boot 唯一职责是初始化硬件内存，为内核提供运行环境。
3. 困惑：什么是设备树，能不能不用？ 第一性解答：不同电路板同一款芯片外设地址不同，不使用设备树就要在内核硬编码寄存器地址，换一块板就要改内核代码；设备树把硬件信息剥离成独立 dtb 文件，一套内核适配多块开发板。
4. 困惑：rootfs 挂载失败报错，根源在哪？ 分层逻辑溯源： ① U-Boot bootargs 参数写错，内核找不到分区； ② 文件系统类型不匹配（如 Flash 用 ext4）； ③ 缺少必要动态库，init 程序无法运行。

### 六、学习核心准则（第一性思维习惯）

1. 遇到任何命令 / 配置，不要死记，追问底层根源：它操作了哪层硬件 / 内核资源？
2. 拒绝复制粘贴工程，每一个配置项从 “硬件约束、内核机制” 推导为什么开启 / 关闭；
3. 分层拆解调试：系统启动故障严格按照「Boot→内核→rootfs→应用」分层定位，不跨层乱排查；
4. 底层优先：看不懂裸机寄存器操作，不要深入复杂驱动；不懂内核四大资源管理，不要直接学应用开发。

### 七、进阶延伸：RT-Linux / 实时系统的第一性推导

普通 Linux 为吞吐量设计，调度存在延迟；工业嵌入式需要低延迟。 底层根源：Linux 默认 CFS 公平调度器无硬实时保障。 解决方案推导：

1. PREEMPT_RT 补丁：改造内核自旋锁、中断，全抢占；
2. 优先级隔离：实时进程高于普通后台任务；
3. 屏蔽不必要中断、内存锁页，消除内存换页延迟。

# Linux操作系统基础知识

## Linux操作系统基础知识

**操作系统定义:**

操作系统(Operating System,OS)是管理计算机硬件与软件资源的系统软件,

通过抽象底层硬件复杂性,为用户提供标准化接口,实现对软硬件资源的高效协调与优化利用;

**操作系统作用:**

 硬件资源管理:调度CPU时间片、分配内存空间、管理输入输出设备等等;

进程与任务管理:通过调度算法协调多任务执行,避免资源竞争等等;

文件系统管理:组织和存储数据,提供统一访问接口;

安全与用户接口:通过权限控制保障安全,提供命令行(CLI)或图形界面(GUI)与用户交互;

**当下主流操作系统:**

Linux、Windows、Android、HarmonyOS、macOS、iOS等;

**主流操作系统对比：**


<table v-pre><tbody><tr><td>特性</td><td>Linux</td><td>Windows</td><td>Android</td><td>HarmonyOS</td><td>macOS</td><td>iOS</td></tr><tr><td>是否开源</td><td>是</td><td>否</td><td>部分</td><td>部分</td><td>部分</td><td>否</td></tr><tr><td>核心领域</td><td>服务器</td><td>个人电脑</td><td>移动设备</td><td>全场景</td><td>个人电脑</td><td>苹果手机 / 平板</td></tr><tr><td>软件生态</td><td>免费工具多常用命令操作</td><td>商业软件为主</td><td>Google Play 应用</td><td>鸿蒙专属应用</td><td>应用商店</td><td>App Store 应用</td></tr><tr><td>安全性</td><td>高(严格控制权限)</td><td>中等(依赖使用习惯)</td><td>中等(隔离保护应用)</td><td>高(多设备联合防护)</td><td>高(验证软件身份)</td><td>高(隔离加加密)</td></tr><tr><td>定制性</td><td>极高(可修改系统核心)</td><td>低(难修改)</td><td>中等(厂商可改外观)</td><td>中等(品牌可定制)</td><td>低(系统限制多)</td><td>低(封闭系统难改)</td></tr><tr><td>系统内核</td><td>Linux 内核（GPL 开源）</td><td>Windows NT 内核（闭源）</td><td>基于 Linux 内核深度定制（AOSP 开源，GMS 闭源）</td><td>鸿蒙微内核（分布式架构，部分开源）</td><td>Darwin 内核（基于 BSD + Mach，部分开源）</td><td>基于 Darwin 内核深度定制（闭源，仅适配苹果硬件）</td></tr><tr><td>硬件兼容性</td><td>全架构兼容（x86、ARM、RISC-V 等），适配绝大多数硬件</td><td>主流 x86/x64 架构，ARM 架构适配有限</td><td>以 ARM 架构为主，x86 适配较少</td><td>全场景架构兼容（ARM、x86、RISC-V、LoongArch 等）</td><td>Apple Silicon 架构为主，Intel 架构逐步停止支持</td><td>仅适配苹果自研 Apple Silicon 架构硬件</td></tr><tr><td>多任务 / 多窗口支持</td><td>极强，支持多桌面、多窗口自由排布、后台无限制</td><td>强，原生支持多窗口、虚拟桌面，后台管理完善</td><td>中等，原生支持分屏，后台进程受系统限制</td><td>强，分布式多窗口、跨设备任务流转，后台管理灵活</td><td>强，原生支持多窗口、调度中心，后台管理稳定</td><td>中等，仅支持部分应用分屏，后台进程严格管控</td></tr><tr><td>系统资源占用</td><td>极低，可适配低配置硬件，最小化安装仅需几十 MB 内存</td><td>中高，图形界面和后台服务占用资源较多，对硬件配置有一定要求</td><td>中等，图形渲染和后台应用占用资源，对内存要求逐年提升</td><td>低，分布式架构优化，后台内存管控严格，适配低配置硬件</td><td>中等，图形界面和系统服务占用稳定，对苹果硬件优化到位</td><td>低，系统与硬件深度整合，内存管控严格，资源占用效率高</td></tr><tr><td>学习使用成本</td><td>高，命令行操作为主，图形界面差异大，新手入门门槛高</td><td>低，图形化操作直观，用户基数大，教程和解决方案丰富</td><td>低，触屏操作简单，应用生态完善，用户上手快</td><td>低，全场景统一操作逻辑，触屏 + 键鼠适配，上手门槛低</td><td>中等，图形界面简洁，但操作逻辑与 Windows 差异较大，新手需适应</td><td>低，触屏操作极简，系统逻辑统一，用户上手难度极低</td></tr><tr><td>商业授权模式</td><td>开源免费，绝大多数发行版可免费商用，仅企业级服务收费</td><td>商业闭源，需购买授权许可，企业版按设备 / 用户收费</td><td>AOSP 开源免费，GMS 服务需商业授权，厂商定制需合规</td><td>开源免费，商业使用需获得鸿蒙生态授权，企业级服务收费</td><td>硬件绑定免费，仅随苹果硬件预装，无单独系统授权</td><td>硬件绑定免费，仅随苹果移动硬件预装，无单独系统授权</td></tr><tr><td>多设备协同能力</td><td>弱，原生无统一协同方案，需第三方工具实现跨设备联动</td><td>中等，支持与安卓设备联动，多设备协同能力有限</td><td>中等，支持与同品牌设备联动，跨品牌协同能力弱</td><td>极强，原生分布式架构，支持跨设备任务流转、硬件互助、数据同步</td><td>强，与苹果生态设备（iPhone、iPad、Apple Watch）深度协同</td><td>强，与苹果生态设备（Mac、iPad、Apple Watch）深度协同</td></tr><tr><td>企业级支持能力</td><td>强，开源社区 + 商业厂商（红帽、SUSE 等）提供长期企业级支持，服务器领域占绝对主导</td><td>强，微软提供完整企业级服务、域管理、组策略，企业办公领域占主导</td><td>弱，原生无完善企业级管理方案，仅部分厂商提供定制化企业功能</td><td>中等，提供企业级定制化方案、设备管理、安全合规，政企领域逐步落地</td><td>弱，企业级管理能力有限，仅适配苹果硬件，企业办公领域占比低</td><td>弱，企业级管理能力有限，仅适配苹果移动硬件，企业场景适配少</td></tr><tr><td>系统更新支持周期</td><td>滚动更新发行版无固定周期，长期支持版（LTS）支持周期 5-10 年</td><td>主流版本支持周期 5-10 年，企业版可获得更长扩展支持</td><td>主流机型官方系统更新支持 1-3 年，部分旗舰机型支持 4-5 年</td><td>主流机型官方系统更新支持 3-5 年，旗舰机型可获得更长支持</td><td>每个大版本官方安全更新支持 5-7 年，新系统仅适配近年硬件</td><td>每个大版本官方安全更新支持 5-6 年，新系统仅适配近年苹果硬件</td></tr></tbody></table>


**了解Linux操作系统：**

**从Unix到Linux:**


<table v-pre><tbody><tr><td>年份</td><td>关键事件</td><td>核心影响</td></tr><tr><td>1969</td><td>Unix 诞生</td><td>奠定现代操作系统多用户、多任务架构基础</td></tr><tr><td>1973</td><td>Unix 用 C 语言重写</td><td>实现跨硬件平台移植性，确立 C 语言为系统级开发主流语言</td></tr><tr><td>1977</td><td>BSD Unix 发布</td><td>推动 TCP/IP 协议落地，丰富 Unix 网络生态</td></tr><tr><td>1984</td><td>GNU 项目启动</td><td>为开源操作系统提供关键软件组件，奠定 Linux 生态基础</td></tr><tr><td>1987</td><td>Minix 系统发布</td><td>以教学为目的的迷你 Unix 系统，直接启发 Linux 内核开发</td></tr><tr><td>1991</td><td>Linux 内核诞生</td><td>免费开源操作系统时代开启，形成 GNU/Linux 完整生态</td></tr></tbody></table>


Linux操作系统发展历史


<table v-pre><tbody><tr><td>年份</td><td>关键事件</td><td>核心影响</td></tr><tr><td>1991</td><td>Linux 内核初始版本发布</td><td>林纳斯・托瓦兹发布首个 Linux 内核，以 GPL 协议开源，标志开源操作系统诞生</td></tr><tr><td>1994</td><td>Linux 1.0 正式发布</td><td>集成完整进程调度、文件系统，支持单处理器 x86 架构，Linux 走向成熟</td></tr><tr><td>1996</td><td>Linux 2.0 内核发布</td><td>首次支持多处理器，性能大幅提升，满足企业级服务器需求</td></tr><tr><td>2001</td><td>Linux 2.4 内核发布</td><td>新增 USB 即插即用支持，优化笔记本电源管理，桌面兼容性大幅提升</td></tr><tr><td>2003</td><td>Linux 2.6 内核发布</td><td>重构架构，引入模块化设计与设备树，支持从嵌入式设备到超级计算机的全场景</td></tr><tr><td>2007</td><td>Android 平台发布</td><td>谷歌发布基于 Linux 的 Android 平台，深度优化移动设备内存管理与电源控制</td></tr><tr><td>2011</td><td>Linux 3.0 内核发布</td><td>标志内核进入新阶段，强化了虚拟化和文件系统支持</td></tr><tr><td>2021</td><td>Linux 5.15 LTS 发布</td><td>解决 Windows 分区（NTFS）读写难题，提升文件系统兼容性</td></tr><tr><td>2022</td><td>Linux 6.1 LTS 发布</td><td>优化 ARM 架构支持，新增内存热插拔功能，专为工业物联网、嵌入式设备设计</td></tr><tr><td>2023</td><td>Linux 6.5 内核发布</td><td>改进显卡驱动，支持 USB4 80Gbps 高速传输，桌面图形性能接近 Windows</td></tr><tr><td>2024</td><td>Linux 6.6 内核发布</td><td>持续强化安全机制，优化网络设备驱动，保障云计算 / 数据中心长期稳定运行</td></tr></tbody></table>


linux内核版本和发行版本

**Linux 内核版本**

- 定义:Linux内核是操作系统的核心,由林纳斯·托瓦兹主导开发维护,负责管理硬件(如CPU、内存、磁盘)、进程调度、资源分配等底层操作,如同系统的“心脏”;
- 特点:持续迭代更新,修复漏洞、优化性能、增强新硬件支持;
- 例如,Linux 6.6 内核强化安全机制,优化网络设备驱动,提升系统稳定性与兼容性;

**Linux 发行版本**

- 定义:基于特定内核版本,进一步整合桌面环境(如KDE)、应用程序(办公软件、浏览器)、软件包管理工具等的完整操作系统集合;
- 特点:多样化,满足用户在办公、开发、服务器运维等场景的需求;
- 例如,Ubuntu界面友好,适合桌面新手;

## Linux操作系统目录结构

### Windows 与 Linux 文件系统对比

### Windows 系统文件管理方式

**磁盘管理方式：**通过分配盘符（如 `C:`, `D:` 等）进行磁盘分区管理，不同分区相互独立。

**文件存储逻辑：**各磁盘可存放各类文件或目录，用户可直接按盘符访问和管理数据。

**外部设备接入：**插入 U 盘或外置硬盘时，系统会自动分配新盘符，实现便捷的数据读写操作。

### Linux 系统文件管理方式

**树状层级结构：**以 \*\* 根目录（`/`）\*\* 为核心，采用层级式目录结构，所有存储设备（硬盘、U 盘等）都会被挂载到根目录下的某个子目录中，形成统一的命名空间。

**子目录功能规范：**遵循 FHS（文件系统层次结构标准），每个子目录都有特定用途（例如 `/etc` 存储系统配置文件），逻辑清晰，管理规范。

### FHS 标准详解

定义：Filesystem Hierarchy Standard（文件系统层次结构标准），规范了 Linux 系统中各区域的用途，以及系统运行所需的最小构成文件和目录。

核心作用： 

- 促进不同 Linux 发行版（如 Ubuntu、CentOS、Debian）之间的兼容性；
- 为用户和开发者提供一致的目录结构与使用体验；
- 避免不同软件、发行版之间因目录路径不统一而产生的潜在冲突。


<table v-pre><tbody><tr><td>目录名称</td><td>功能描述</td></tr><tr><td>/bin</td><td>存放系统基础二进制可执行文件，如常用命令 ls、cp 等，所有用户均可执行</td></tr><tr><td>/etc</td><td>存储系统级配置文件，如网络配置、用户信息（/etc/passwd）、服务启动脚本等</td></tr><tr><td>/dev</td><td>包含硬件设备文件（如 /dev/sda 表示硬盘，/dev/tty 表示终端），用于硬件交互</td></tr><tr><td>/home</td><td>普通用户的主目录，每个用户有独立子目录（如 /home/用户名），存放个人文件和配置</td></tr><tr><td>/lib</td><td>保存系统运行必需的共享库文件（如 C 标准库 shturl.）及内核模块，支撑程序运行</td></tr><tr><td>/usr</td><td>存储用户程序和数据，如应用程序、开发工具、库文件、文档等，类似集中的 “程序资源库”</td></tr><tr><td>/root</td><td>超级用户（root）的主目录，存放其专属文件、配置及管理工具</td></tr><tr><td>/tmp</td><td>临时文件存储目录，用于存放系统和应用运行时产生的临时数据，系统重启时内容通常会被清空</td></tr><tr><td>/mnt</td><td>临时挂载点目录，用于手动挂载外部存储设备（如 U 盘、光盘）或其他文件系统</td></tr><tr><td>/opt</td><td>第三方软件或附加应用程序的存放目录，便于集中管理，如 /opt/软件名称</td></tr></tbody></table>


## Linux操作系统应用领域

Linux 凭借开源、稳定、高兼容、低资源消耗等特性，已覆盖几乎所有主流技术领域，以下是核心应用场景的详细梳理：

### 服务器领域

- 核心优势：开源免费、稳定性极强、低资源消耗、高安全性，支持高并发服务
- 典型场景：企业级服务器核心系统、银行 / 金融系统、电商平台、大型网站后端服务
- 地位：全球绝大多数服务器（超 90%）运行 Linux 系统，是互联网基础设施的核心支撑

### 软件开发领域

- 核心优势：提供完整的开源工具链、跨平台支持、强大的软件包管理
- 典型工具：GCC 编译器、Git 版本控制、GDB 调试工具、跨平台 IDE（如 VS Code、JetBrains 系列）
- 典型场景：后端开发、嵌入式开发、开源项目协作、跨平台应用开发
- 地位：开发者首选平台，绝大多数开源软件项目的原生开发环境

### 虚拟化与云计算领域

- 核心优势：原生支持虚拟化技术、容器管理能力、资源灵活分配
- 典型技术：KVM 虚拟化、Docker 容器、Kubernetes 集群管理
- 典型场景：云服务器、云平台底层支撑、数据中心资源调度、企业私有云部署
- 地位：云计算领域的绝对主导，几乎所有主流云服务商都基于 Linux 提供服务

### 嵌入式系统领域

- 核心优势：内核可裁剪、多架构兼容性强、低功耗、高稳定性
- 典型场景：智能座舱、数控机床、工业控制设备、路由器、智能家电
- 地位：嵌入式设备领域的主流系统，适配从低功耗单片机到高端工业设备的全场景

### 物联网（IoT）领域

- 核心优势：轻量级系统支持、丰富的协议兼容性（如 MQTT）、低功耗优化
- 典型场景：智能家居设备、工业物联网终端、传感器网关、智能穿戴设备
- 地位：构建智能物联生态的核心平台，支撑海量设备的联网与数据交互

### 数据分析与科学计算领域

- 核心优势：对高性能计算（HPC）、分布式框架的深度支持，可处理海量数据与复杂计算
- 典型场景：超级计算机、大数据分析平台、人工智能训练、科学实验计算
- 地位：全球超算 TOP500 中，超过 99% 的系统运行 Linux，是科学计算领域的绝对核心

### 补充总结

Linux 的应用领域之所以如此广泛，核心源于它的开源可定制性：你可以根据场景需求裁剪内核、优化性能、定制系统，同时依托开源社区的庞大生态，快速获取工具与解决方案。从手机（Android）到服务器，从嵌入式设备到超级计算机，几乎所有数字场景都有 Linux 的身影。



## 搭建Linux环境

**VMware Player介绍**

VMware Workstation Player（简称 VMware Player）是 VMware 推出的免费桌面虚拟化软件，面向个人非商用用户，可在 Windows/macOS 物理机上创建、运行虚拟机。

**VMware Player安装**

官网下载个人使用免费版，创建专属文件夹

**Ubuntu系统介绍**

Ubuntu 是基于 Linux 内核的开源操作系统，主打简单易用、社区完善，开发高效，企业级稳定，完全免费是新手入门 Linux 首选。

**运行现有的Ubuntu系统**

创建新的虚拟机，导入外部的Ubuntu虚拟机

**Linux终端基础操作快捷键**


<table v-pre><tbody><tr><td>快捷键</td><td>功能说明</td></tr><tr><td>Ctrl + Alt + T</td><td>快速打开终端，进入 Linux 命令行操作界面（最常用）</td></tr><tr><td>Ctrl + Shift + T</td><td>在当前终端窗口新建标签页，同一窗口多会话，不用新开终端窗口</td></tr><tr><td>Ctrl + PgUp</td><td>切换至上一个终端标签页</td></tr><tr><td>Ctrl + PgDn</td><td>切换至下一个终端标签页</td></tr><tr><td>Ctrl + L</td><td>终端清屏，清空屏幕输出内容，光标置顶</td></tr><tr><td>Ctrl + Shift + +</td><td>放大终端内字体大小</td></tr><tr><td>Ctrl + -</td><td>缩小终端内字体大小</td></tr><tr><td>Tab</td><td>命令 / 文件名自动补全：1. 输入一半指令 / 路径，按一下 Tab 自动补全唯一匹配项2. 存在多个匹配内容时，连续按两下 Tab，列出全部可选内容</td></tr></tbody></table>


**创建共享文件夹**

实现 Windows 物理机和 Ubuntu 虚拟机双向文件互通，不用 U 盘、不用网络传输，开发时拷贝代码、文档、安装包极其方便。

`open-vm-tools`（开源版本）的设计选择：享文件夹挂载被视为“可选功能”，由用户自行决定何时、如何挂载，以避免自动挂载可能带来的问题

# Linux操作系统命令

![飞书画板](/feishu-assets/3a5acb1cbd59.jpg)

## Linux 命令基本概念

### 定位与作用

命令是用户与 Linux 系统交互的核心媒介，相比图形界面，**命令行操控系统效率更高**。

执行载体：Shell，命令依靠 Shell 程序解析执行，常见 Shell 类型：**Bash、Zsh**。

命令以纯文本字符串形式输入，能够管理全部系统资源：**文件、进程、网络、硬件设备、内核模块**。

**运行逻辑**：严格遵循固定语法规则，向系统下发指令，驱动操作系统完成各类任务。

**Linux 标准通用语法格式：**命令名 [选项] [参数]

**命令名**（必选，核心主体）

一条命令不能缺少的基础部分；

代表要执行操作的标识；

命名来源：完整英文单词 / 英文缩写。

**选项**（可选，调节命令行为）

作用：自定义修改命令执行逻辑、输出格式，根据需求选择是否添加；

两种格式：

**短选项**：单横线 - + 单个字母，如 -l、-a

**长选项**：双横线 -- + 完整英文，如 --help

**参数**（可选，操作目标）

作用：指定命令操作的对象、数据来源；

常见内容：文件路径、目录名称、文本字符串；

不是所有命令都必须携带参数。

**格式使用注意点：**

书写命令时，命令名、选项、参数之间必须用空格分隔，三者顺序固定不可颠倒。

**实例拆解（辅助理解）**

示例：ls -a /home

命令名：ls —— 核心，功能为列出目录内容

选项：-a —— 短选项，显示全部隐藏文件

参数：/home —— 操作对象，指定查看 /home 目录



## Linux基础命令

### 文件基础信息组成

| 文件类型 | 所有者权限 | 组用户权限 | 其他用户权限 | 硬链接数 | 所有者名称 | 所有者所属组的组名 | 文件大小 | 最后修改时间 | 文件名 |
|-|-|-|-|-|-|-|-|-|-|
| l | rwx | rwx | rwx | 1 | linux | linux | 5.0k | Apr 23 22:10 | Desktop |


<table v-pre><tbody><tr><td>类别</td><td>详情</td><td>核心功能 / 作用</td></tr><tr><td>文件类型</td><td>l: 链接文件<br/>-: 普通文件<br/>d: 目录文件 <br/>p: 管道文件<br/>b: 块设备文件 <br/>c: 字符设备文件<br/>s: 套接字文件</td><td>标识文件的系统类型，决定文件的访问规则、操作逻辑和系统处理方式，是 Linux 文件系统识别文件属性的核心标识</td></tr><tr><td>文件权限</td><td>分为三段：所有者权限、组用户权限、其他用户权限r：读权限 <br/>w：写权限<br/>x：可执行权限 <br/>-：无权限</td><td>定义三类不同用户对文件 / 目录的访问权限，是 Linux 系统多用户权限管理的核心，控制用户对文件的读、写、执行操作，保障系统文件安全与多用户隔离</td></tr><tr><td>硬链接数</td><td>代表指向同一文件索引的路径数量普通文件：被引用次数目录文件：2 + 子目录数量</td><td>记录文件索引节点（inode）被引用的次数，用于判断文件是否被多个路径共享；当硬链接数为 0 时，系统才会真正释放该文件的磁盘空间，是 Linux 文件系统存储管理的核心参数</td></tr><tr><td>所有者</td><td>文件归属的用户名，示例中为 linux</td><td>标记文件的归属用户，该用户对文件拥有最高管理权限，可修改文件权限、属性、内容，是 Linux 文件所有权管理的核心标识</td></tr><tr><td>所属组</td><td>文件归属的用户组名，示例中为 linux</td><td>标记文件归属的用户组，同组内的所有用户可按照组权限规则访问文件，用于多用户场景下的批量权限管理，简化同权限用户的配置</td></tr><tr><td>文件大小</td><td>搭配 -h 参数：单位 K/M/G，易读格式<br/>不加 -h：单位为字节</td><td>记录文件 / 目录占用的磁盘空间大小，用于判断文件的存储占用情况，搭配 - h 参数可实现更直观的可读化展示，是磁盘空间管理的核心参考指标</td></tr><tr><td>最后修改时间</td><td>记录文件内容最后一次修改的时间（月 日 时分）</td><td>记录文件内容最后一次被修改的时间点，用于追溯文件的修改记录、版本变更，也可用于按时间排序筛选文件，是文件管理与版本追溯的核心参数</td></tr><tr><td>文件名</td><td>文件 / 目录名称；链接文件会标注指向路径，例 test -&gt; ./a.c</td><td>作为用户访问文件 / 目录的核心标识，是 Linux 文件系统树形结构的基础节点，用户通过文件名定位、操作对应文件；软链接文件名会标注源文件路径，实现快捷访问</td></tr></tbody></table>


### 常用命令

<table><colgroup><col/><col/><col/><col/><col/><col/></colgroup><tbody><tr><td>命令名</td><td>英文单词</td><td>功能</td><td>常见格式</td><td>常用选项</td><td>加选项后的功能</td></tr><tr><td rowspan="6">ls</td><td rowspan="6">list</td><td rowspan="6">显示目录中文件及其属性信息</td><td rowspan="6">ls [选项] [文件或目录...]</td><td>无</td><td>列出当前工作目录中的文件信息</td></tr><tr><td>-l (长格式 -&gt; &lt;em&gt;long&lt;/em&gt;)</td><td>以长格式显示文件详细信息（权限、所有者、大小、修改时间等）</td></tr><tr><td>-h (人类可读 -&gt; &lt;em&gt;human-readable&lt;/em&gt;)</td><td>与 - l 结合使用，以人类可读格式显示文件大小（如 234M，2G）</td></tr><tr><td>-a (全部 -&gt; &lt;em&gt;all&lt;/em&gt;)</td><td>显示所有文件和目录，包括隐藏文件（以。开头的文件）</td></tr><tr><td>-t (按时间排序 -&gt; &lt;em&gt;time&lt;/em&gt;)</td><td>按修改时间排序，最新的排在前面</td></tr><tr><td>-R (递归 -&gt; &lt;em&gt;recursive&lt;/em&gt;)</td><td>递归列出所有子目录及其内容</td></tr><tr><td rowspan="4">cd</td><td rowspan="4">change directory</td><td rowspan="4">切换目录路径可以是相对路径也可以是绝对路径</td><td rowspan="4">cd [选项] [目录路径]</td><td>无</td><td>切换到当前使用者的家目录</td></tr><tr><td>..</td><td>切换至当前位置的上一级目录</td></tr><tr><td>-</td><td>切换至上次所在目录</td></tr><tr><td>~</td><td>&lt;code&gt;cd ~&lt;/code&gt; 切换到当前使用者的家目录，和单独输入 &lt;code&gt;cd&lt;/code&gt; 效果完全一致</td></tr><tr><td>pwd</td><td>print working directory</td><td>显示当前工作目录的路径</td><td>pwd</td><td>无</td><td>显示所在目录的绝对路径</td></tr><tr><td>clear</td><td>clear</td><td>清除终端界面已有内容</td><td>clear</td><td>无</td><td>清除终端界面已有内容</td></tr><tr><td>exit</td><td>exit</td><td>关闭当前终端</td><td>exit</td><td>无</td><td>关闭当前终端</td></tr><tr><td rowspan="2">touch</td><td rowspan="2">touch</td><td rowspan="2">创建空文件与修改时间戳</td><td rowspan="2">touch [选项] [文件名]</td><td>无</td><td>创建一个空内容的文本文件；如果文件已经存在，则会对文件的时间进行修改操作</td></tr><tr><td>-d</td><td>设置日期，格式:touch -d "YYYY-MM-DD" 文件名</td></tr><tr><td rowspan="2">mkdir</td><td rowspan="2">make directories</td><td rowspan="2">创建目录</td><td rowspan="2">mkdir [选项] [目录名]</td><td>无</td><td>创建一个新的目录文件，若创建的目标目录已经存在，则会提示已存在而不继续创建</td></tr><tr><td>-p</td><td>递归创建多级目录</td></tr><tr><td rowspan="2">rm</td><td rowspan="2">remove</td><td rowspan="2">删除文件或目录</td><td rowspan="2">rm [选项] [文件或目录]</td><td>无</td><td>rm 可删除文件；对于空目录，使用 rmdir 命令删除</td></tr><tr><td>-rf</td><td>-f 强制删除文件而不询问；<br/>-r 通常与 -f 结合使用，以强制递归删除目录及其内容，避免单独使用 -r 时的交互提示或权限问题</td></tr><tr><td rowspan="2">cp</td><td rowspan="2">copy</td><td rowspan="2">复制文件或目录</td><td rowspan="2">cp [选项] 源文件或目录 目标文件或目录</td><td>无</td><td>复制文件</td></tr><tr><td>-rf</td><td>复制目录</td></tr><tr><td>mv</td><td>move</td><td>对文件和目录进行剪切和重命名操作</td><td>mv [选项] [源文件或目录] [目标文件或目录]</td><td>无</td><td>同一目录下对文件和目录进行重命名操作；不同目录下对文件和目录进行剪切操作</td></tr><tr><td rowspan="2">shutdown</td><td rowspan="2">shutdown</td><td rowspan="2">关闭服务器的系统</td><td rowspan="2">shutdown [选项] [时间]</td><td>-r</td><td>将系统立即重启，同时可以设定当前服务器在指定时间自动重启，格式为 “shutdown -r + 分钟” 或者 “shutdown -r 时间”</td></tr><tr><td>-h</td><td>将系统立即关机，同时可以设定当前服务器在指定时间自关机，格式为 “shutdown -h + 分钟” 或者 “shutdown -h 时间”</td></tr><tr><td>reboot</td><td>reboot</td><td>重新启动计算机</td><td>reboot</td><td>无</td><td>用于重启系统，简单快捷</td></tr></tbody></table>

常用的通配符


<table v-pre><tbody><tr><td>命令元素</td><td>含义</td><td>功能</td><td>常见使用场景格式</td><td>举例说明</td></tr><tr><td>*</td><td>星号</td><td>匹配任意数量 (包括零个) 的任意字符</td><td>ls [文件名包含 *]rm [文件名包含 *] 等</td><td>.txt：匹配所有以 .txt 结尾的文件；test：匹配所有以 test 开头的文件或目录名；</td></tr><tr><td>?</td><td>问号</td><td>匹配单个任意字符</td><td>ls [文件名包含？]cp [文件名包含？] 等</td><td>file?.txt：匹配所有以 file 开头，后面跟一个任意字符且以 .txt 结尾的文件名；</td></tr><tr><td>[]</td><td>方括号</td><td>匹配方括号内指定的任意一个字符</td><td>ls [文件名包含 [字符范围]]mv [文件名包含 [字符范围]] 等</td><td>[abc]*：匹配以 a、b 或 c 开头的文件或目录；[0-9].txt：匹配所有文件名由单个数字开头且以 .txt 结尾的文件；</td></tr></tbody></table>


### 用户及用户命令

Linux作为多用户多任务系统,支持同时登录多个用户,各用户拥有独立工作空间与资源访问权限。

**权限管理核心意义:**安全风险、数据保护、底层机制

**典型应用场景：**企业协作、服务器管理


<table v-pre><tbody><tr><td>命令名</td><td>英文单词</td><td>功能</td><td>常见格式</td><td>常用选项</td><td>加选项后的功能</td></tr><tr><td>su</td><td>substitute user</td><td>切换用户，默认切换到 root 下</td><td>su [选项] [用户名]</td><td>-</td><td>以登录方式切换用户，加载目标用户的操作环境设置；</td></tr><tr><td>sudo</td><td>superuser do</td><td>以管理员权限执行命令</td><td>sudo [命令]</td><td>无</td><td>让普通用户以 root 权限执行指定命令</td></tr><tr><td>useradd</td><td>user add</td><td>创建新用户</td><td>useradd [选项] 用户名</td><td>-m</td><td>用户目录不存在时则自动创建</td></tr><tr><td>passwd</td><td>password</td><td>修改用户密码</td><td>passwd [用户名]</td><td>无</td><td>不指定用户名，修改当前用户密码；指定用户名，修改指定用户密码 (只有 root 用户可以修改);</td></tr><tr><td>whoami</td><td>who am i</td><td>显示当前登录用户的用户名</td><td>whoami</td><td>无</td><td>无</td></tr><tr><td>userdel</td><td>user delete</td><td>删除用户</td><td>userdel [选项] 用户名</td><td>-r</td><td>删除用户的同时用户所有资源也会删除</td></tr><tr><td>usermod</td><td>user modify</td><td>修改用户属性</td><td>usermod [选项] 用户名</td><td>-g</td><td>修改用户的初始组；</td></tr><tr><td>groupadd</td><td>group add</td><td>创建新的用户组</td><td>groupadd [选项] 组名</td><td>无</td><td>按默认规则创建组（系统自动分配 GID）</td></tr><tr><td></td><td></td><td></td><td></td><td>-g</td><td>指定新组的 GID（组标识符）</td></tr><tr><td>groupdel</td><td>group delete</td><td>删除用户组</td><td>groupdel 组名</td><td>无</td><td>只能删除空的用户组</td></tr><tr><td>id</td><td>identity</td><td>显示用户 UID、GID 及所属组信息</td><td>id [用户名]</td><td>-u</td><td>仅显示用户 UID (用户标识符);</td></tr><tr><td></td><td></td><td></td><td></td><td>-g</td><td>仅显示用户 GID (组标识符);</td></tr></tbody></table>


### 软件包管理命令

·在现代Linux系统生态中,软件包管理作为系统运维与应用部署的基石,承担着构建标准化软件运行环

境的关键使命.它通过系统化工具集,实现软件从安装、配置到卸载全生命周期的自动化管控,不仅有效

规避手动部署引发的依赖冲突、版本不兼容等问题,更通过安全签名验证与补丁自动化推送机制,确保

系统稳定运行;

当前Linux领域存在两大主流软件包管理机制:以Ubuntu为代表的Debian系列,采用.deb包格式与apt管理体系;以CentOS为典型的Red Hat系列,依托.rpm格式与yum/dnf工具链;

软件包

#### **Linux 软件包类型及命名规则对照表**


<table v-pre><tbody><tr><td>对比维度</td><td>.deb 软件包</td><td>.rpm 软件包</td></tr><tr><td>所属系列</td><td>Debian 系列</td><td>Red Hat 系列</td></tr><tr><td>打包内容</td><td>应用程序的二进制文件、配置文档、帮助页面等整合打包</td><td>采用标准化元数据格式，包含软件版本、依赖关系、安装路径等核心信息</td></tr><tr><td>适用系统</td><td>适用于 Debian、Ubuntu 等基于 Debian 的 Linux 发行版</td><td>适用于 CentOS、Fedora、RHEL 等基于 Red Hat 的 Linux 发行版</td></tr><tr><td>配套管理工具</td><td>1. apt：在线软件包管理，自动处理依赖关系2. dpkg：离线软件包管理，直接操作本地.deb 安装包</td><td>1. yum/dnf：在线软件包管理，自动处理依赖关系2. rpm：离线软件包管理，需手动处理依赖关系</td></tr><tr><td>标准命名规则</td><td>包名_主版本号 - 次版本号_系统架构.deb</td><td>包名 - 主版本号 - 次版本号。发布号。系统架构.rpm</td></tr><tr><td>命名示例</td><td>code_1.99.3-1744761595_amd64.deb</td><td>httpd-2.4.53-1.el8.x86_64.rpm</td></tr></tbody></table>


#### **两种主流软件包管理机制对比表**


<table v-pre><tbody><tr><td>特性</td><td>Debian 系（.deb）</td><td>Red Hat 系（.rpm）</td></tr><tr><td>包格式</td><td>.deb</td><td>.rpm</td></tr><tr><td>依赖管理工具</td><td>apt（或 apt-get）</td><td>yum 或 dnf</td></tr><tr><td>仓库配置</td><td>/etc/apt/sources.list</td><td>/etc/yum.repos.d/*.repo</td></tr><tr><td>适用场景</td><td>桌面环境、开发环境 (如 Ubuntu)</td><td>服务器环境、企业级部署 (如 CentOS)</td></tr><tr><td>依赖处理</td><td>灵活，支持更多社区软件</td><td>稳定，依赖关系严格验证</td></tr></tbody></table>


#### **软件包管理工具**


<table v-pre><tbody><tr><td>分类维度</td><td>Debian 系 (APT)</td><td>Red Hat 系 (YUM/DNF)</td><td>Arch 系 (Pacman)</td></tr><tr><td>包格式</td><td>.deb</td><td>.rpm</td><td>.pkg.tar.zst</td></tr><tr><td>底层工具</td><td>DPKG</td><td>RPM</td><td>N/A（Pacman 直接管理）</td></tr><tr><td>高级工具</td><td>APT (apt、apt-get)</td><td>DNF(dnf install、dnf update)</td><td>Pacman</td></tr><tr><td>依赖处理</td><td>APT 自动处理</td><td>DNF 自动处理</td><td>Pacman 自动处理</td></tr><tr><td>仓库管理</td><td>集中式配置 (sources.list)</td><td>分散式配置 (.repo 文件)</td><td>配置文件 /etc/pacman.conf</td></tr><tr><td>特点</td><td>用户友好，适合桌面环境</td><td>稳定可靠，企业级使用</td><td>滚动更新，轻量高效</td></tr></tbody></table>


#### **dpkg特性与常用命令**


<table v-pre><tbody><tr><td>特性</td><td>说明</td><td>示例场景</td></tr><tr><td>仅支持 .deb 文件</td><td>仅能安装、卸载、查询 .deb 格式的软件包不支持其他格式（如 .rpm、源码包）</td><td>手动下载 .deb 文件后离线安装：sudo dpkg -i package.deb</td></tr><tr><td>离线操作</td><td>无需联网即可操作，但需提前下载所有依赖包</td><td>无网络环境的服务器或设备中批量安装软件包</td></tr><tr><td>依赖需手动解决</td><td>安装时若缺少依赖，直接报错，需用户手动补全依赖包</td><td>安装 wps.deb 时提示缺少 libpng12-0需手动下载并安装该依赖包</td></tr></tbody></table>



<table v-pre><tbody><tr><td>命令名</td><td>英文单词</td><td>功能</td><td>常见格式</td></tr><tr><td>dpkg -i</td><td>install</td><td>安装本地.deb 软件包</td><td>dpkg -i package.deb</td></tr><tr><td>dpkg -r</td><td>remove</td><td>卸载软件包，保留配置文件</td><td>dpkg -r package</td></tr><tr><td>dpkg -P</td><td>purge</td><td>彻底卸载软件包（含配置文件）</td><td>dpkg -P package</td></tr><tr><td>dpkg -l</td><td>list</td><td>列出系统中已安装的所有软件包</td><td>dpkg -l</td></tr><tr><td>dpkg -s</td><td>status</td><td>显示指定软件包的详细状态信息</td><td>dpkg -s package</td></tr><tr><td>dpkg -L</td><td>listfiles</td><td>列出软件包安装到系统中的所有文件路径</td><td>dpkg -L package</td></tr></tbody></table>


#### **apt工作原理与常用命令**

 **用户操作模块**

用户输入 apt 系列命令（安装 / 卸载 / 更新）

程序识别当前命令属于联网类（安装 / 更新）还是本地类（删除 / 清理）

**联网操作模块**（仅安装、更新、升级走此分支）

读取软件源配置文件 `/etc/apt/sources.list`

从远程服务器下载软件源元数据（Release、Packages 索引文件）

更新本地元数据缓存目录 `/var/lib/apt/lists/`

自动解析全部依赖链，确定要下载的软件包与版本

将所有软件包下载至本地缓存 `/var/cache/apt/archives`

转交底层 dpkg 执行安装

**执行操作模块**

安装 / 升级路径：联网下载包 → 调用 dpkg 安装

删除 / 清理路径：不联网，先解析反向依赖 → 调用 dpkg 卸载

**状态更新与完成模块**

操作结束后更新系统本地软件数据库（`/var/lib/apt`、`/var/lib/dpkg`）

整个 apt 流程执行完毕


<table v-pre><tbody><tr><td>命令</td><td>功能</td><td>示例</td></tr><tr><td>apt update</td><td>更新软件源列表和包版本信息（必做）</td><td>安装 / 升级前必须执行</td></tr><tr><td>apt install 软件包名</td><td>安装及依赖（含推荐包）</td><td>sudo apt install git</td></tr><tr><td>apt install -y 软件包名</td><td>静默安装（无需确认）</td><td>sudo apt -y install git</td></tr><tr><td>apt remove 软件包名</td><td>卸载包（保留配置文件）</td><td>sudo apt remove git</td></tr><tr><td>apt purge 软件包名</td><td>彻底卸载（删除包 + 配置文件）</td><td>sudo apt purge git</td></tr></tbody></table>


#### **dpkg和apt的对比**

apt 是上层管理工具，自身不负责真正安装 / 删除文件，所有底层文件操作全部调用`dpkg`；apt 核心价值是联网拉取软件源、自动多层依赖解析，弥补 dpkg 离线、无法自动处理依赖的短板。


<table v-pre><tbody><tr><td>对比维度</td><td>dpkg</td><td>apt (apt-get/apt)</td></tr><tr><td>依赖处理</td><td>完全手动：需提前下载并安装所有依赖包</td><td>自动解析：联网搜索并下载缺失的依赖包（含间接依赖）</td></tr><tr><td>操作模式</td><td>纯离线：仅操作本地 .deb 文件</td><td>在线为主：支持从软件源更新、搜索、安装远程包</td></tr><tr><td>核心命令</td><td>dpkg -i（安装本地包）、dpkg -r（卸载）</td><td>apt install（联网安装）、apt update（更新源）</td></tr><tr><td>网络依赖</td><td>无（不支持联网）</td><td>必须联网（需连接软件源）</td></tr><tr><td>适用场景</td><td>离线环境、本地包调试、系统底层维护</td><td>日常联网安装、更新、管理软件</td></tr><tr><td>依赖风险</td><td>手动处理易导致版本冲突或依赖断裂</td><td>自动匹配兼容版本，风险更低</td></tr><tr><td>与系统交互</td><td>直接操作 /var/lib/dpkg/ 数据库</td><td>间接调用 dpkg 执行底层操作</td></tr></tbody></table>


### 压缩和解压缩命令

### 文件操作命令

### 链接文件命令

### 网络相关命令

### 其他辅助命令

# vim编辑器

在 Linux 系统中,文本编辑器是基础且重要的工具,用于创建、修改和查看各种文本文件,如配置文件、

脚本文件等;

Vim语法高亮、代码折叠、脚本自动化、正则查找替换,可高度定制,插件丰富等

Nano仅基本编辑功能和简单语法高亮

VSCode多语言支持、智能补全、插件丰富等功能;多窗口分屏

Gedit字体行号设置等基本编辑功能,简单插件扩展

**vim编辑器**

· vim由早期的vi 编辑器发展而来,沿用了其核心操作逻辑,并大幅拓展功能。在不少Linux发行版中,

虽默认安装的是vi,但vim凭借语法高亮、脚本自动化等增强特性,以及可高度定制的优势,备受程序

员、系统管理员推崇。只需简单安装配置,就能在文本编辑与代码处理场景中发挥强大作用;

**安装方式:**在终端执行sudo apt install vim

**特点：**多模式、高效操作、高度可定制

## vim编辑器基础使用

启动与文件操作

# gcc与gdb的使用

## gcc介绍

GNU 工具集是由自由软件基金会发起的GNU项目孕育而生,始于20世纪80年代初,旨在构建完全自由

的操作系统,其核心原则强调用户自由使用、修改和分发软件的权利,极大推动了自由软件运动和开源

生态系统发展;


<table v-pre><tbody><tr><td>工具类别</td><td>工具名称</td><td>主要功能</td><td>应用场景</td></tr><tr><td>编译器</td><td>gcc/g++</td><td>将 C/C++ 源代码转换为可执行程序</td><td>各类 C/C++ 项目开发</td></tr><tr><td>调试工具</td><td>gdb</td><td>设置断点、查看变量、分析内存，辅助代码调试</td><td>软件开发调试阶段，排查程序错误</td></tr><tr><td>项目构建工具</td><td>make</td><td>依据 Makefile 自动处理编译依赖</td><td>源文件多、依赖关系复杂的项目</td></tr><tr><td>目标文件分析工具</td><td>objdump</td><td>反汇编目标文件，查看二进制文件内容</td><td>分析程序底层实现，排查目标文件相关问题</td></tr><tr><td>链接工具</td><td>ld</td><td>合并多个目标文件及库文件为可执行文件</td><td>编译流程最后阶段，处理目标文件链接</td></tr><tr><td>静态库管理工具</td><td>ar</td><td>创建、修改和操作.a 静态库文件</td><td>大型项目中复用通用代码模块场景</td></tr></tbody></table>


**gcc介绍：**

**定义:**GCC(GNU Compiler Collection)即GNU编译器集合,开源。起初用于编译C语言,现支持

C++、Java等多种语言,是GNU工具链核心,可跨平台编译。它遵循GNU通用公共许可证(GPL),保

障用户自由使用、修改、分发软件的权利;

**作用:**核心是将源代码转换为可执行文件,同时支持跨平台编译,方便在不同系统环境下进行软件开发;

**应用场景**:在日常软件开发中应用广泛,无论是编写小游戏、工具软件,还是大型系统程序,都需要借

助GCC将代码编译成可执行程序;

**安装**:在Linux系统中,GCC一般为预装软件。若未安装,可通过包管理器安装build -essential包,

该包通常包含GCC及其他相关编译工具;

安装命令为:sudo apt install build-essential

安装完成后,可使用gcc -- version命令来查看GCC的版本信息;

· GCC (GNU Compiler Collection)是一款功能强大的交叉平台编译器,支持几乎所有主流CPU处理器

平台。它能够将C++、C等源文件转换为可在特定硬件上运行的目标代码,在Linux系统中应用广泛;


<table v-pre><tbody><tr><td>文件后缀</td><td>文件类型</td><td>含义说明</td></tr><tr><td>.c</td><td>源代码文件</td><td>采用 C 语言编写的源代码文件</td></tr><tr><td>.cpp</td><td>源代码文件</td><td>使用 C++ 语言编写的源代码文件</td></tr><tr><td>.h</td><td>头文件</td><td>源程序中包含的头文件，用于声明函数、变量等</td></tr><tr><td>.o</td><td>目标文件</td><td>源代码经过编译但尚未链接的中间文件</td></tr><tr><td>.a</td><td>库文件</td><td>由目标文件构成的静态库文件</td></tr><tr><td>.so</td><td>库文件</td><td>动态库文件</td></tr></tbody></table>


## gcc编译过程



## gcc多文件编程

## GDB介绍

## gdb调试命令

# 环境变量

## 环境变量介绍

**定义：**操作系统维护的键值对（变量名 = 值），存储系统 / 用户配置，控制程序运行环境（执行路径、用户目录、语言编码等）。

**三大核心作用：**

全局共享：多程序共用，PATH 是典型代表；

灵活可调：可动态修改程序运行行为；

自动传递：新进程会继承父终端的环境变量。

**两大分类方式：**

按作用范围

- 用户级：仅当前用户生效，无需管理员权限，配置文件：`~/.bashrc`
- 系统级：所有用户生效，需要`sudo`权限，配置文件：`/etc/profile`

按生命周期

- 临时变量：仅当前终端有效，关闭终端失效，`export`命令临时创建
- 永久变量：写入配置文件，重启 / 重登录仍生效，需`source`手动刷新

**常见内置环境变量汇总：**


<table v-pre><tbody><tr><td>变量名</td><td>功能说明</td><td>示例值</td></tr><tr><td>PATH</td><td>可执行文件搜索目录，冒号分隔</td><td>/usr/local/bin:/usr/bin</td></tr><tr><td>HOME</td><td>当前用户主目录</td><td>/home/linux</td></tr><tr><td>USER</td><td>当前登录用户名</td><td>root</td></tr><tr><td>LANG</td><td>系统语言字符编码</td><td>zh_CN.UTF-8</td></tr><tr><td>PWD</td><td>当前所在工作目录（实时更新）</td><td>/home/linux</td></tr><tr><td>SHELL</td><td>当前使用的解释器</td><td>/bin/bash</td></tr><tr><td>EDITOR</td><td>默认文本编辑器</td><td>vim / nano</td></tr></tbody></table>


**查看环境变量 3 种方法**


<table v-pre><tbody><tr><td>命令</td><td>用途</td><td>示例</td><td>特点</td></tr><tr><td>echo $ 变量名</td><td>查看单个变量</td><td>echo $PATH</td><td>最简单，新手首选</td></tr><tr><td>printenv</td><td>查看全部 / 单个变量</td><td>printenv、printenv HOME</td><td>只展示环境变量，不含局部变量</td></tr><tr><td>env</td><td>和 printenv 功能一致</td><td>env</td><td>日常可互换使用</td></tr></tbody></table>


## 环境变量的配置方式

**临时配置：**适用：临时测试、一次性使用，关终端即失效

```bash
# 方式1
export MY_VAL="hello world"
# 方式2
MY_VAL="hello world"
export MY_VAL
```

**永久配置：分为用户级、系统级两类**


<table v-pre><tbody><tr><td>类型</td><td>生效范围</td><td>配置文件</td><td>是否需要 sudo</td><td>刷新生效命令</td></tr><tr><td>用户级</td><td>当前用户</td><td>~/.bashrc</td><td>不需要</td><td>source ~/.bashrc</td></tr><tr><td>系统级</td><td>全部用户</td><td>/etc/profile</td><td>需要</td><td>sudo source /etc/profile</td></tr></tbody></table>


**临时配置 vs 永久配置对比**


<table v-pre><tbody><tr><td>特性</td><td>临时配置</td><td>永久配置</td></tr><tr><td>生效范围</td><td>仅限当前终端，新开终端无效</td><td>所有新终端、重启登录均生效</td></tr><tr><td>存储位置</td><td>命令行直接输入，无文件保存</td><td>写入 shell 配置文件</td></tr><tr><td>撤销方式</td><td>关闭终端自动失效</td><td>删除配置文件内对应 export 行</td></tr><tr><td>使用场景</td><td>短期测试、临时调试程序</td><td>长期开发工具、自定义脚本</td></tr></tbody></table>


## PATH环境变量介绍

###  **PATH 定义：**

由 \*\* 冒号`:`\*\* 分隔的目录列表，系统输入命令时，自动按顺序检索目录找可执行文件；找不到则提示`command not found`。

### **核心工作原理：**

终端输入命令；

按 PATH 目录从前到后依次查找同名可执行文件；

找到直接执行；全部遍历无匹配则报错。

### PATH 内置常用目录作用


<table v-pre><tbody><tr><td>目录</td><td>作用</td></tr><tr><td>/bin/</td><td>基础系统命令（ls、cp、rm），全部用户可用</td></tr><tr><td>/sbin/</td><td>管理员系统命令（reboot、sudo）</td></tr><tr><td>/usr/bin/</td><td>用户常用工具（git、python）</td></tr><tr><td>/usr/local/bin/</td><td>第三方安装程序</td></tr><tr><td>~/.local/bin/</td><td>当前用户私有工具（pip 安装）</td></tr><tr><td>~/bin/</td><td>用户自定义脚本目录，需手动添加 PATH</td></tr></tbody></table>


### 为什么需要配置 PATH

不用输入程序完整绝对路径，简化命令；

新安装软件（Node、Go）可直接调用命令；

自定义脚本全局执行；

多版本软件切换，控制调用优先级。

## PATH环境变量配置

**前置知识点：**

后置添加：`$PATH:新路径` → 系统原有命令优先，安全推荐

前置添加：`新路径:$PATH` → 自定义程序优先，用于版本替换，风险较高

**临时配置 PATH**

```bash
# 后置（推荐）
export PATH="$PATH:/home/linux/mytools"
# 前置（自定义优先）
export PATH="/home/linux/mytools:$PATH"
# 验证
echo $PATH
which 程序名
```

**用户级永久 PATH 配置:**

编辑配置文件

```bash
vim ~/.bashrc
```

文件末尾添加一行

```bash
# 安全后置写法
export PATH="$PATH:/home/linux/mytools"
# 高优先级前置写法
export PATH="/home/linux/mytools:$PATH"
```

立即生效（当前终端）

```bash
source ~/.bashrc
```

**系统级永久 PATH 配置（全部用户）:**

编辑全局配置（需 sudo）

```bash
sudo vim /etc/profile
```

添加 PATH 语句（同上）

```bash
# 安全后置写法
export PATH="$PATH:/home/linux/mytools"
# 高优先级前置写法
export PATH="/home/linux/mytools:$PATH"
```

刷新生效

```bash
sudo source /etc/profile
```

 **PATH 配置通用要点**

冲突优先级：用户级配置 > 系统级配置；

不同 Shell（Bash/Zsh）修改对应配置文件；

撤销配置：删除配置文件中 PATH 那一行；

必加`$PATH`保留原有系统路径，不可直接覆盖；

路径使用绝对路径，不要用相对路径；

路径含空格用双引号包裹：`"$PATH:/home/user/my tools"`。

**速查总结**

临时变量：`export PATH=$PATH:xxx`，关终端失效；

个人永久：写入`~/.bashrc`，`source ~/.bashrc`；

全局永久：写入`/etc/profile`，sudo 刷新；

安全规范：PATH 后置添加，保留`$PATH`，使用绝对路径；

验证命令：`echo $PATH`、`which 命令名`。

## 配置PATH常见错误



# shell编程

## shell介绍

Shell 是 Unix/Linux 系统用户与内核之间的接口程序、命令解释器。

核心定位：充当用户与操作系统内核的桥梁 

- 解析用户输入命令，转为内核可识别指令
- 提供交互式操作界面 + 脚本自动化编程环境，拓展系统能力

语言分类：属于解释型语言

- 编译型：C/C++，需要 gcc/g++ 编译器，提前编译二进制文件
- 解释型：Shell 脚本、Python，边解析边执行，无需编译

Ubuntu 默认解释器：bash；其他主流：ksh、csh、dash、zsh、fish


<table v-pre><tbody><tr><td>Shell</td><td>定位</td><td>核心特点</td><td>使用场景</td><td>Ubuntu 环境</td></tr><tr><td>Bash</td><td>Linux 默认交互式 Shell</td><td>兼容传统 sh 脚本；支持命令补全、历史记录、别名；高度可配置</td><td>日常终端操作、绝大多数运维脚本</td><td>用户登录默认 Shell</td></tr><tr><td>sh</td><td>POSIX 标准基础 Shell</td><td>语法极简、功能少；无交互式增强功能</td><td>系统启动脚本、追求跨系统兼容性脚本</td><td>软链接指向 dash</td></tr><tr><td>Zsh</td><td>现代化增强 Shell</td><td>智能补全、主题美化、插件生态；兼容大部分 bash 语法</td><td>开发人员、追求高效交互</td><td>需要手动安装</td></tr><tr><td>Fish</td><td>轻量化友好交互 Shell</td><td>自动命令提示、语法高亮、开箱即用；语法和 bash 不完全兼容</td><td>Linux 新手、注重交互体验</td><td>需要手动安装</td></tr><tr><td>Dash</td><td>极速轻量 Shell</td><td>启动速度快、占用资源极低；仅实现 POSIX 基础功能</td><td>系统初始化脚本、低资源服务器</td><td>/bin/sh 底层实现</td></tr></tbody></table>


## 第一个shell脚本

- **概念：**Shell 脚本是存储多条系统命令的文本文件，可批量自动化执行重复操作，广泛用于运维自动化、批处理、系统管理。
- **基础结构：**

**文件后缀：**`.sh`仅为习惯标识，非强制，系统识别依靠首行 shebang

**Shebang 行（文件第一行）：**`#!/bin/bash`作用：指定执行该脚本的 Shell 解释器路径，告诉系统用哪个程序解析脚本

**注释规范：**单行注释：`#` 开头，整行 / 行后注释<<EOF EDF

- **三种脚本执行方式对比**


<table v-pre><tbody><tr><td>执行方式</td><td>命令</td><td>优点</td><td>缺点</td><td>适用场景</td></tr><tr><td>赋予权限直接运行</td><td>chmod +x demo.sh &amp;&amp; ./demo.sh</td><td>独立可执行、运行效率高；符合程序执行逻辑</td><td>需要手动添加执行权限；跨环境权限会失效</td><td>线上稳定脚本、频繁执行任务</td></tr><tr><td>指定解释器运行</td><td>bash demo.sh / sh demo.sh</td><td>无需权限；可切换不同解释器测试兼容性</td><td>每次启动解释器，性能开销更大</td><td>开发调试、验证多 shell 兼容性</td></tr><tr><td>source 加载执行</td><td>source demo.sh / . demo.sh</td><td>在当前 Shell 进程运行，不生成子进程；变量 / 函数直接生效</td><td>不能脱离当前终端独立运行；脚本报错会污染当前环境</td><td>加载配置文件（.bashrc）、需要即时生效的配置脚本</td></tr></tbody></table>


## shell中的变量

变量基础规则

作用：存储字符串、数字，复用数据，简化脚本维护

命名规范：字母 / 数字 / 下划线，不能以数字开头

赋值语法：`变量名=值`，等号两侧严禁空格

- `name=test` 正确
- `name = test` 报错

三种赋值引号区别 

- 无引号：纯连续字符串，不能包含空格
- 单引号`' '`：原样输出，不解析变量、转义符
- 双引号`" "`：解析`$`变量、转义字符，支持带空格内容

变量引用 

- 基础：`$变量名`
- 推荐规范：`${变量名}`，避免拼接歧义

## 修饰变量的关键字

## shell中的算术运算

## shell中的数组

## read和echo命令

read命令

# Makefile

Makefile介绍

Makefile核心语法

Makefile函数

# 复习

`ctrl+d`关闭终端、`Ctrl + Shift + W`关闭当前“标签页”、`Ctrl + Shift + Q`直接关闭整个“终端窗口”、`exit`纯命令方式退出



# 问题集

## 安装工具清单

### 检查更新，更新软件

### 安装`open-vm-tools`

功能：鼠标移动、屏幕分辨率、剪贴板共享、文件拖拽、时间同步、共享文件夹（核心）、系统关机

### 挂载共享文件夹

### 安装`net-tools`

`sudo apt install net-tools -y`

- Ubuntu 22.04 默认不再预装 `net-tools`，而是推荐使用 `ip` 命令（`ip addr`、`ip link` 等）作为替代。
- 但嵌入式学习和许多教程中仍然大量使用 `ifconfig`、`netstat` 等传统命令，安装 `net-tools` 可以兼容这些教程，避免“命令未找到”的困惑。
- 它和 `build-essential`、`git`、`gdb` 一样，是嵌入式开发环境中常用的基础工具之一。

### 安装`vim`

`sudo apt install -y vim`

### 安装嵌入式开发最基础的“编译、编辑、调试、下载、网络、版本控制”六件套

`输入命令：sudo apt install -y build-essential gdb make vim curl wget net-tools git`

`build-essential`编译工具全家桶（内含 `gcc` C语言编译器、`g++` C++编译器、`make` 构建工具）。

`gdb`GNU调试器。

`make`自动化构建工具。

`vim`命令行下的文本编辑器

`curl`命令行下载/传输工具（支持HTTP、FTP等）。

`wget`命令行下载器（专注于HTTP/HTTPS/FTP下载）。

`net-tools`经典网络命令套装（包含 `ifconfig`、`netstat`、`route` 等）。

`git`版本控制系统



## 第一次使用Ubuntu安装后初始化操作

- 命令执行顺序逻辑：先刷新包列表→安装工具→重启生效→换源→重新刷新包列表→全量升级→最终重启，是 Ubuntu 系统初始化的标准流程
- 源替换的意义：国内网络环境下，国外官方源下载速度极慢，替换为清华、阿里等国内镜像源，可将下载速度提升 10 倍以上；
- 重启的必要性：内核模块、系统服务、核心配置的变更，必须重启系统才能完全加载，否则功能会失效或异常


<table v-pre><tbody><tr><td>序号</td><td>完整命令</td><td>命令组成拆解（逐关键字说明）</td><td>功能说明</td></tr><tr><td>1</td><td>sudo apt update</td><td>1.sudo：超级用户权限执行，以系统管理员身份运行命令，避免权限不足导致操作失败2. apt：Ubuntu/Debian 系统专属软件包管理工具，负责软件的安装、更新、卸载、依赖管理3. update：apt 的核心子命令，用于刷新本地软件包列表，从软件源获取最新的包版本、依赖关系、下载地址信息</td><td>刷新软件包列表（“去超市拿最新价目表”），为后续安装 / 升级软件做基础准备</td></tr><tr><td>2</td><td>sudo apt install open-vm-tools open-vm-tools-desktop -y</td><td>1.sudo：管理员权限执行，安装系统级软件必须使用最高权限2. apt：软件包管理工具3. install：apt 的核心子命令，用于下载并安装指定的软件包，自动处理依赖关系4. open-vm-tools：VMware 开源虚拟机增强工具核心包，实现虚拟机与主机的硬件适配、性能优化、基础功能对接5. open-vm-tools-desktop：桌面版增强包，额外提供鼠标自由移动、剪贴板共享、自适应分辨率、共享文件夹等桌面专属功能6. -y：自动确认安装过程中的所有提示，无需手动输入y确认，实现无人值守安装</td><td>安装 VMware 增强工具，实现鼠标自由移动、剪贴板共享、自适应分辨率、共享文件夹等核心功能</td></tr><tr><td>3</td><td>sudo reboot</td><td>1.sudo：管理员权限执行，重启系统需要最高系统权限2. reboot：Linux 系统标准重启命令，用于安全关闭当前系统并重新启动，使新安装的内核模块、服务、配置文件完全生效</td><td>重启系统，让刚安装的 VMware 工具内核模块和服务完全加载生效</td></tr><tr><td>4</td><td>sudo tee /etc/apt/sources.list &lt;&lt; &quot;EOF&quot; ... EOF</td><td>1.sudo：管理员权限执行，修改系统级核心配置文件必须使用最高权限2. tee：Linux 标准命令，用于读取标准输入内容，同时写入到指定文件和标准输出，这里用来安全覆盖软件源配置文件3. /etc/apt/sources.list：apt 软件包管理的核心配置文件，存放所有软件源的地址，决定了系统从哪里下载软件包4. &lt;&lt; &quot;EOF&quot; ... EOF：Shell 的 Here Document 语法，将两个EOF之间的所有内容作为标准输入传递给tee命令，实现批量写入文件内容</td><td>替换软件源为清华镜像，用国内高速镜像源替代默认国外源，解决软件下载慢、连接失败的问题</td></tr><tr><td>5</td><td>sudo apt update（第二次）</td><td>1.sudo：管理员权限执行2. apt：软件包管理工具3. update：apt 子命令，刷新软件包列表</td><td>替换清华源后重新更新软件包列表，从新的国内源获取最新的包信息，确保后续安装 / 升级使用新源</td></tr><tr><td>6</td><td>sudo apt upgrade -y</td><td>1.sudo：管理员权限执行，系统级软件升级需要最高权限2. apt：软件包管理工具3. upgrade：apt 的核心子命令，对比本地已安装软件和源里的最新版本，自动升级所有有更新的软件包，同时处理依赖变更4. -y：自动确认所有升级提示，无需手动干预</td><td>升级所有已安装软件包，包含系统安全更新、功能更新和 bug 修复，让系统和所有软件保持最新稳定版本</td></tr><tr><td>7</td><td>sudo reboot（第二次）</td><td>1.sudo：管理员权限执行2. reboot：Linux 系统标准重启命令</td><td>重启系统，使系统内核、核心服务的升级完全生效，确保系统运行在最新的稳定版本</td></tr></tbody></table>


## 共享文件夹失败

原因：`open-vm-tools`（开源版本）的设计选择：

- 它只提供核心的虚拟化功能（鼠标平滑、剪贴板、时间同步等）。
- 共享文件夹挂载被视为“可选功能”，由用户自行决定何时、如何挂载，以避免自动挂载可能带来的问题。


<table v-pre><tbody><tr><td>完整命令</td><td>命令组成拆解（逐关键字说明）</td><td>功能说明</td><td>适用场景</td></tr><tr><td>sudo mkdir -p /mnt/hgfs</td><td>1.sudo：超级用户权限执行，创建系统级目录需要管理员权限，避免权限不足报错2. mkdir：Linux 标准创建目录命令（make directory 缩写）3. -p：mkdir 核心参数（--parents 缩写），递归创建多级目录，父目录不存在也能正常创建，无报错4. /mnt/hgfs：目标目录路径，/mnt 是 Linux 标准临时挂载点目录，hgfs 是 VMware 共享文件夹行业通用专属挂载目录</td><td>创建 /mnt/hgfs 目录作为 VMware 共享文件夹的专属挂载点</td><td>首次操作，/mnt/hgfs 目录不存在时，必须先创建挂载点才能进行后续挂载</td></tr><tr><td>sudo vmhgfs-fuse .host:/ /mnt/hgfs -o allow_other</td><td>1.sudo：超级用户权限执行，挂载文件系统需要管理员权限2. vmhgfs-fuse：VMware 共享文件夹专属挂载工具，open-vm-tools 核心组件，实现主机与虚拟机文件系统互通3. .host:/：VMware 专属主机共享路径标识，.host 代表当前 Windows 物理机，:/ 代表主机所有已配置的共享文件夹4. /mnt/hgfs：挂载点目录，将主机共享文件夹挂载到虚拟机该目录下5. -o：mount 类命令通用参数，用于指定额外挂载选项6. allow_other：挂载选项，允许 root 之外的普通用户读写该挂载目录，避免权限不足无法访问</td><td>手动挂载主机所有共享文件夹到 /mnt/hgfs 目录，并允许普通用户读写访问</td><td>需要立即使用共享文件夹、临时挂载测试，或开机自动挂载未配置时的一次性操作</td></tr><tr><td>ls /mnt/hgfs/</td><td>1.ls：Linux 最基础目录查看命令（list 缩写），列出指定目录下的所有文件和子目录2. /mnt/hgfs/：要查看的目录路径，即共享文件夹的挂载点</td><td>查看挂载后的目录内容，确认主机的共享文件夹是否正常出现在虚拟机中</td><td>挂载操作完成后，验证挂载是否成功，确认共享文件夹是否正常识别</td></tr><tr><td>sudo nano /etc/fstab</td><td>nano：Linux 系统自带轻量级命令行文本编辑器，操作简单，适合新手修改配置文件，替代复杂的 vi/vim 编辑器<br/>/etc/fstab：Linux 系统核心配置文件（file system table 缩写，文件系统表），存放系统开机时需要自动挂载的所有文件系统、挂载点、挂载参数等配置，系统开机时自动读取该文件完成挂载<br/></td><td>用 nano 编辑器打开 Linux 系统的文件系统表核心配置文件，准备添加开机自动挂载配置</td><td>需要配置共享文件夹开机自动挂载，避免每次开机都要手动执行挂载命令时</td></tr><tr><td>在 /etc/fstab 末尾添加行：<br/>.host:/ /mnt/hgfs fuse.vmhgfs-fuse allow_other,defaults 0 0</td><td>严格遵循 fstab 文件标准 6 字段格式，逐字段说明：<br/>1. 第 1 字段（文件系统）：.host:/，VMware 专属主机共享文件系统标识，代表 Windows 物理机上的所有共享文件夹<br/>2. 第 2 字段（挂载点）：/mnt/hgfs，共享文件夹的挂载点目录，和手动挂载的目录保持一致<br/>3. 第 3 字段（文件系统类型）：fuse.vmhgfs-fuse，指定该文件系统的类型为 VMware 共享文件夹的 fuse 文件系统，告诉系统用什么驱动来挂载<br/>4. 第 4 字段（挂载选项）：allow_other,defaults，多个选项用逗号分隔；allow_other 允许普通用户读写，defaults 使用系统默认挂载参数（自动挂载、可读可写等）<br/>5. 第 5 字段（dump 备份）：0，dump 是 Linux 系统备份工具，0 代表不备份该文件系统，共享文件夹无需备份<br/>6. 第 6 字段（fsck 检查）：0，fsck 是 Linux 系统文件系统检查工具，0 代表开机时不检查该文件系统，共享文件夹无需开机检查</td><td>在 /etc/fstab 文件末尾添加开机自动挂载配置，定义共享文件夹的挂载规则，让系统开机时自动完成挂载</td><td>需要实现共享文件夹开机自动挂载，永久生效，无需每次手动操作时</td></tr><tr><td>sudo mount -a</td><td>mount：Linux 标准挂载命令，用于挂载文件系统<br/>-a：mount 命令核心参数（--all 缩写），告诉 mount 命令读取 /etc/fstab 文件中的所有配置，自动挂载所有未挂载的文件系统</td><td>测试 /etc/fstab 文件的配置是否正确，自动挂载所有配置的文件系统，无报错即代表配置语法正确</td><td>修改完 /etc/fstab 文件后，验证配置是否正确，避免重启后系统无法正常开机</td></tr><tr><td>touch test_ubuntu.txt</td><td>1.touch：Linux 标准文件操作命令，用于创建空文本文件，也可修改文件时间戳，此处用于创建测试文件2. test_ubuntu.txt：要创建的自定义测试文件名，.txt 为文本文件后缀，方便识别</td><td>在共享目录中创建测试文本文件，验证 Ubuntu 虚拟机→Windows 主机的双向读写功能是否正常</td><td>挂载成功后，测试虚拟机对共享文件夹的写入权限，验证文件是否能同步到 Windows 主机</td></tr><tr><td>ls /mnt/hgfs/Shared\ Folder/</td><td>1.ls：Linux 目录查看命令（list 缩写）2. /mnt/hgfs/Shared\ Folder/：要查看的共享子目录路径，此处用反斜杠转义空格，也可使用双引号包裹</td><td>查看共享子目录的内容，验证 Windows 主机→Ubuntu 虚拟机的文件同步是否正常</td><td>在 Windows 主机中创建了文件，需要确认该文件是否能同步到虚拟机的共享目录中</td></tr></tbody></table>


ctrl-o保存 ctrl-x退出
