# Linux IO编程

[飞书原文](https://hcn4ticlccda.feishu.cn/docx/Ypd5dUy49oopFNx2uAtcYUEMn7d)

# Linux IO编程学习第一性原理


<a href="/embedded-knowledge-base/feishu-assets/diagram-caa315d7dce240e77a.svg" target="_blank" rel="noopener" aria-label="打开思维导图大图"><img src="/feishu-assets/diagram-caa315d7dce240e77a.svg" alt="思维导图" loading="lazy" decoding="async" style="max-height:420px;width:auto;object-fit:contain;background:#fff"></a>

<details><summary>图表源内容</summary>

~~~text
markmap

# Linux IO编程第一性原理
## 一、底层三大核心公理（IO本源）
### 1. 一切皆文件
- 统一抽象：所有资源映射文件描述符fd
- 覆盖资源类型
  - 磁盘文件、目录
  - Socket网络套接字
  - Pipe/FIFO管道
  - 终端、串口硬件设备
  - eventfd、信号fd、匿名内存
- 设计价值：一套read/write系统调用兼容全部设备

### 2. 用户态/内核态内存隔离
- 权限划分
  - 用户态：应用代码，禁止直接操作硬件/内核缓存
  - 内核态：管理驱动、页缓存、TCP缓冲区
- IO必然触发系统调用
- 性能损耗根源：上下文切换

### 3. 分层缓存架构
#### （1）内核层：Page Cache页缓存
- 读：优先读缓存，缺页才下发磁盘IO
- 写：写入缓存即返回，内核异步刷盘
- O_DIRECT：绕过页缓存，直写磁盘

#### （2）用户层：stdio标准库缓冲
- fopen/fread/fwrite封装
- 减少频繁syscall，提升读写效率
#### （3）裸系统调用open/read/write
- 无用户缓冲，仅依赖内核缓存

## 二、IO底层基础机制
### 1. 文件描述符fd本质
- fd：用户态数组下标，仅句柄
- 内核真实资源：struct file结构体
- 生命周期操作
  - open：分配fd，创建file，绑定inode
  - dup/dup2：复制fd，引用计数+1
  - close：引用计数-1，归零释放资源
  - fork：子进程复制全部fd，共享file
  - exec：FD_CLOEXEC标记自动关闭fd

### 2. 阻塞与非阻塞IO
#### 阻塞IO（默认属性）
- read无数据/write缓冲区满 → 进程休眠TASK_INTERRUPTIBLE
- 数据就绪内核唤醒进程
#### 非阻塞IO O_NONBLOCK
- 无数据时调用立刻返回，不休眠
- 缺点：循环轮询造成CPU空转

### 3. IO数据拷贝模型
- 传统同步IO三次拷贝：网卡→内核缓冲区→用户缓冲区
- 性能瓶颈：内核态↔用户态CPU拷贝
- 零拷贝目标：消除跨态内存复制

## 三、五大IO模型（由公理推导）
### 1. 阻塞IO
- 逻辑：单fd阻塞等待
- 并发方案：多线程/多进程
- 短板：高并发资源开销巨大

### 2. 非阻塞轮询IO
- 逻辑：O_NONBLOCK + while循环read
- 短板：大量无效系统调用，CPU满负载

### 3. IO多路复用 select/poll/epoll（工业主流）
- 核心：单次syscall批量监听多fd就绪事件
#### select
- 位图存储fd，有最大数量限制，遍历全部fd
#### poll
- 数组存储fd，无上限，仍需全量遍历
#### epoll Linux专属高性能
- 内核红黑树管理fd，就绪链表存储活跃fd
- 无全量遍历开销，支持万级并发连接
- 触发模式：水平LT / 边缘ET

### 4. 信号驱动IO SIGIO
- 逻辑：fd就绪内核发送信号通知进程
- 缺陷：信号处理竞态，工程极少使用

### 5. 异步IO
#### 老旧libaio：局限多，淘汰
#### io_uring Linux5.0+新一代异步IO
- 提交IO任务立刻返回，无需阻塞等待
- 内核完成读写后主动通知应用
- 唯一真正异步IO模型，大幅减少syscall

## 四、网络Socket IO特殊逻辑（继承一切皆文件）
### 1. TCP双缓冲区
- 发送缓冲区：write仅写入内核缓冲，不代表对方接收
- 接收缓冲区：缓冲区空时recv阻塞
### 2. 常见问题底层原理
- TCP粘包：内核缓冲区为无边界字节流，上层需自定义分包协议
- 惊群效应：多线程监听同一fd全部唤醒，epoll EPOLLEXCLUSIVE解决

## 五、高性能IO优化方向（由底层约束推导）
### 1. 减少用户/内核态切换
- 多路复用批量监听fd
- io_uring批量提交IO任务，合并多次syscall
### 2. 消除内存拷贝开销
- mmap、sendfile、splice 零拷贝技术
### 3. 降低进程频繁休眠唤醒
- epoll边缘触发ET、批量读写缓冲区
### 4. 减少慢速磁盘硬件IO
- Page Cache预读、批量延迟刷盘
### 5. 削减线程调度开销
- Reactor单线程epoll处理海量连接，替代多线程阻塞IO

## 六、完整学习递进路线
1. 吃透三大底层公理
2. 基础系统调用 open/read/write/close/dup
3. 阻塞/非阻塞IO，理解轮询弊端
4. 多路复用 select→poll→epoll 对比内核实现
5. 零拷贝全套技术原理与使用场景
6. 异步io：io_uring核心机制
7. 事件驱动框架 Reactor/Proactor 工程落地
8. Linux内核IO参数调优、缓冲区、触发模式选型

## 七、核心总结（第一性总纲）
所有Linux IO API、并发模型、性能优化，全部源于三条底层约束：
1. 资源统一抽象为fd，读写接口标准化
2. 用户态隔离内核资源，IO存在切换、拷贝双重开销
3. 无数据时进程休眠；高并发核心：批量监听、降低切换与拷贝损耗
~~~

</details>


## 核心第一性公理（所有 IO 行为的根源）

### 公理 1：一切皆文件（Linux IO 最底层基石）

Linux 内核把所有可读写资源统一抽象为「文件描述符 fd」，不存在独立的磁盘、网卡、终端、管道设备概念：

1. 普通磁盘文件、目录
2. 网络套接字 socket
3. 管道 pipe、命名管道 FIFO
4. 终端 /dev/tty、串口、外设
5. 匿名共享内存、eventfd、信号 fd

本质：内核统一提供一套读写系统调用（read/write），上层不用区分设备类型，这是 IO 编程统一接口的根本。

### 公理 2：用户态 ↔ 内核态 内存隔离

CPU 分两种运行权限：

- 用户态：应用程序代码，无法直接操作硬件、内核缓冲区
- 内核态：操作系统内核，持有硬件驱动、页缓存、TCP 缓冲区

IO 必然产生系统调用（切换态）：read/write/socket/connect 都会触发 CPU 上下文切换，切换是 IO 性能损耗的核心来源，所有高性能 IO（epoll/io_uring）都是为了减少态切换、减少系统调用次数。

### 公理 3：IO 分两类：缓冲 IO（标准）/ 非缓冲 IO，分层缓存架构

Linux 存在两级缓存，决定读写延迟逻辑：

1. 内核页缓存（Page Cache） 磁盘文件读写必经，write 仅写到页缓存就返回，内核后台异步刷盘；read 优先读缓存，缺页才下发磁盘 IO。
2. 用户态缓冲区（stdio 库 fopen/fread） C 标准库封装，减少频繁调用 read/write 系统调用，是上层缓冲。
3. 裸系统调用 open/read/write：无用户缓冲，只有内核缓冲。

关键结论：普通 write 写完数据不代表落盘；O_DIRECT 绕过页缓存，直接操作磁盘，牺牲性能换取实时持久化。

### 公理 4：阻塞是 fd 的默认属性，IO 等待本质是进程休眠

默认所有文件描述符是阻塞 IO：

- read 无数据、write 缓冲区满时，进程进入 TASK_INTERRUPTIBLE 休眠，让出 CPU；
- 内核数据就绪后唤醒进程，继续执行。 非阻塞 IO (O_NONBLOCK)：无数据时系统调用立刻返回 - 1，不休眠，需要循环轮询。

### 公理 5：IO 多路复用本质：内核批量监听 fd 就绪事件

单进程处理多 fd 只有两条路：

1. 多进程 / 多线程：每个 fd 单独阻塞，成本高（栈、上下文切换、调度）
2. IO 多路复用（select/poll/epoll）：一次系统调用传入一堆 fd，内核批量检测就绪状态 底层逻辑统一：内核维护 fd 等待队列，数据到达时标记 fd 就绪，一次性返回给用户态，大幅降低系统调用次数。

### 公理 6：数据拷贝是 IO 开销核心（三次拷贝模型）

以网络 recv 为例：

1. 网卡硬件 → 内核 socket 缓冲区（DMA 硬件拷贝，无 CPU 参与）
2. 内核缓冲区 → 用户态应用缓冲区（CPU 拷贝） 传统阻塞 IO / 多路复用都存在内核→用户态拷贝； 零拷贝（sendfile/mmap/io_uring）第一目标：消除内核态与用户态之间的数据复制。

## IO 模型推导（由第一公理自然推导 4+1 种 IO 模型）

基于「是否阻塞」「是否内核批量监听」「是否异步回调」推导全部 IO 模型：

### 阻塞 IO（默认模型）

原理：单 fd 阻塞等待，简单低效，多并发只能多线程。

### 非阻塞轮询 IO

原理：O_NONBLOCK + while 循环反复调用 read，大量无效系统调用，CPU 空转。

### IO 多路复用（select/poll/epoll，工业主流）

原理：一次系统调用监听千级 fd，内核筛选就绪 fd，解决轮询 CPU 浪费，同步 IO（用户主动调用 read 拿数据）。 epoll 是 Linux 专属优化：红黑树存 fd、就绪链表，无遍历开销，高并发最优同步方案。

### 信号驱动 IO（SIGIO）

原理：fd 就绪内核发信号通知进程，极少使用，信号处理有竞态缺陷。

### 异步 IO（AIO/io_uring，真正异步）

原理：用户态提交 IO 任务后立刻返回，内核完成全部读写后主动通知应用；全程不用用户反复调用 read/write，唯一真正异步模型。 io_uring 是 Linux 5.0 + 新一代异步 IO 框架，替代老旧 libaio，解决同步 IO 拷贝、系统调用开销。

## 高性能 IO 的第一性推导（优化方向全部来自底层公理）

从底层约束反推所有优化手段，不用死记硬背：

1. 减少用户 / 内核态切换 方案：多路复用批量 fd、io_uring 批量提交 IO 任务，合并多次 syscall。
2. 减少数据内存拷贝 方案：mmap、sendfile、splice 零拷贝，绕过内核 / 用户缓冲区复制。
3. 避免进程频繁休眠唤醒 方案：epoll 水平 / 边缘触发、缓冲区批量读写，减少频繁就绪通知。
4. 规避磁盘慢速硬件 IO 方案：利用 Page Cache 预读、批量写、延迟刷盘，减少真实磁盘访问。
5. 降低线程调度开销 方案：单线程 epoll 处理万级连接（Reactor 模式），代替多线程阻塞 IO。

## 文件描述符生命周期底层原理

1. open：分配 fd，内核创建 file 结构体，绑定 inode / 驱动；
2. dup/dup2：复制 fd，引用计数 + 1；
3. close：引用计数 - 1，计数归 0 时释放内核资源；
4. fork：子进程复制父进程全部 fd，共享 file 结构体；
5. exec：默认保留 fd，FD_CLOEXEC 标记会在 exec 自动关闭。

本质：fd 只是用户态数组下标，真正管理资源的是内核 file 结构体。

## 网络 IO 特殊底层逻辑（套接字 fd 扩展）

套接字依然遵守「一切皆文件」公理，额外增加 TCP 协议栈缓冲区：

1. 发送缓冲区：write 只是把数据放入内核 send buffer，不代表对方收到；
2. 接收缓冲区：recv 读取内核 recv buffer，缓冲区空则阻塞；
3. 惊群效应：早期 select/poll 多线程监听同一 fd，就绪后全部唤醒，epoll+EPOLLEXCLUSIVE 解决；
4. TCP 粘包：内核缓冲区无消息边界，IO 层只负责字节流，分包逻辑必须上层实现。

## 学习路线（基于第一性原理的递进顺序）

1. 夯实基础公理：一切皆文件、用户 / 内核态、缓冲区、fd 机制
2. 基础系统调用：open/read/write/close/dup，区分缓冲 / 非缓冲 IO
3. 阻塞 / 非阻塞 IO，手动轮询理解弊端
4. 多路复用：select→poll→epoll，对比三者内核实现差异
5. 零拷贝技术：mmap、sendfile、splice，理解数据拷贝开销
6. 异步 io：libaio 过时方案，重点 io_uring 完整原理
7. 工程封装：Reactor/Proactor 事件驱动框架，结合底层 API 落地
8. 性能调优：内核参数、缓冲区大小、触发模式、零拷贝选型

## 一句话总结 Linux IO 第一性原理

Linux IO 的所有行为、API、性能优化、并发模型，全部源于三条底层约束：

1. 所有资源统一抽象为文件描述符，共用一套读写接口；
2. 用户态无法直接访问内核资源，IO 必须付出系统调用与内存拷贝开销；
3. 进程等待数据时会休眠，高并发核心是批量监听就绪事件、降低切换与拷贝损耗。

# Linux系统分层结构

1. Linux系统分层结构


<a href="/embedded-knowledge-base/feishu-assets/diagram-e13646774e65e83ac9.svg" target="_blank" rel="noopener" aria-label="打开思维导图大图"><img src="/feishu-assets/diagram-e13646774e65e83ac9.svg" alt="思维导图" loading="lazy" decoding="async" style="max-height:420px;width:auto;object-fit:contain;background:#fff"></a>

<details><summary>图表源内容</summary>

~~~text
markmap

# 1 应用层（用户态，无硬件权限，依赖系统调用访问内核）
## 1.1 标准运行库
### 1.1.1 glibc C 标准库
#### 1.1.1.1 文件 IO 封装：fopen/fread/printf（自带用户缓冲区）
#### 1.1.1.2 进程 / 内存 / 网络封装函数
### 1.1.2 高性能 IO 第三方库
#### 1.1.2.1 libuv、libevent、libaio
## 1.2 Shell & 系统基础工具
### 1.2.1 终端解释器：bash、zsh
#### 1.2.1.1 管道 |、IO 重定向 > >>
### 1.2.2 coreutils 系统工具
#### 1.2.2.1 ls、cp、cat、grep、top、vim
## 1.3 后台守护进程 Daemon
### 1.3.1 systemd、sshd、nginx、rsyslog 日志服务
## 1.4 业务应用程序
### 1.4.1 开发工具：gcc、cmake、各类脚本
### 1.4.2 网络服务：MySQL、Redis、消息队列
### 1.4.3 高级语言运行时：Python、Java 程序
## 层级关系
### 纯用户态，所有 IO、进程、网络操作必须发起系统调用进入内核层
# 2 内核层（内核态，承上启下，内部 3 大子模块）
## 2.1 系统调用接口（应用与内核唯一交互通道）
### 2.1.1 文件 IO 类系统调用
#### 2.1.1.1 open/read/write、epoll、mmap、splice 零拷贝
### 2.1.2 进程管理系统调用
#### 2.1.2.1 fork、execve、wait、kill
### 2.1.3 网络 Socket 系统调用
#### 2.1.3.1 socket、bind、listen、send、recv
### 2.1.4 内存、权限、异步 AIO 调用
## 2.2 内核核心子系统
### 2.2.1 VFS 虚拟文件系统（统一 IO 抽象）
#### 2.2.1.1 磁盘文件系统：ext4、xfs、btrfs
#### 2.2.1.2 伪文件系统：/proc、/sys、tmpfs
### 2.2.2 块 IO 子系统（磁盘读写）
#### 2.2.2.1 Page Cache 页缓存、IO 调度器、Buffer 缓冲
### 2.2.3 字符 TTY 子系统（键鼠、显示器、串口）
### 2.2.4 TCP/IP 内核协议栈
### 2.2.5 进程调度、内存管理子系统
## 2.3 设备驱动层（内核对接底层硬件）
### 2.3.1 块设备驱动：SSD、机械硬盘、U 盘
### 2.3.2 字符设备驱动：键盘、鼠标、串口、USB
### 2.3.3 网络设备驱动：有线 / 无线网卡
## 层级关系
### 接收上层系统调用，内部处理缓存、IO、资源调度，向下通过驱动操控硬件
# 3 硬件层（最底层物理设备，所有 IO 最终载体）
## 3.1 计算硬件
### 3.1.1 CPU、物理内存 RAM
## 3.2 存储 IO 硬件
### 3.2.1 HDD 机械硬盘、SSD、移动 U 盘
## 3.3 字符外设硬件
### 3.3.1 显示器、键盘、鼠标、串口设备
## 3.4 网络硬件
### 3.4.1 有线网卡、无线网卡
## 层级关系
### 无软件逻辑，仅提供物理资源；仅内核驱动可直接访问，应用层无法直连
IO 完整调用链路
# 数据流：应用程序 → glibc 用户缓冲 → 系统调用 → 内核 VFS/PageCache → 设备驱动 → 物理硬件
~~~

</details>


###  第1层：用户空间应用程序（User Space Apps）

这是你的代码（如C/C++、Java、Python程序）。你通常使用标准库函数（如`fopen`/`fread`）或系统封装库（如glibc）来发起读写请求。

- 学习I/O的重点：此时你操作的是文件描述符（fd，File Descriptor）和用户态缓冲区。

### 🚪 第2层：系统调用接口（System Call Interface）

这是用户态进入内核态的唯一大门。glibc会将你的库函数转换为Linux内核提供的`open`、`read`、`write`、`close`等系统调用。

- 学习I/O的重点：这里发生上下文切换（CPU从用户态切换到内核态），这是I/O性能损耗的第一个来源。

### 📂 第3层：虚拟文件系统（VFS，Virtual File System）

内核接收到系统调用后，并不直接操作硬盘，而是先经过VFS层。它提供了一个通用抽象接口，让上层统一处理所有文件类型（普通文件、目录、socket、管道）。

- 学习I/O的重点：VFS会通过`dentry`（目录项）和`inode`（索引节点）查找文件，并判断数据是否已经在页缓存（Page Cache）中。如果命中缓存，读操作在此层就直接返回，不会往下走了！

### 🗄️ 第4层：具体文件系统（Specific File System）

VFS将请求转交给具体的文件系统（如ext4、XFS、NTFS）。这一层负责处理文件在磁盘上的逻辑结构（如数据块分配、文件碎片、日志`journal`）。

- 学习I/O的重点：如果数据不在缓存中，文件系统会计算出要读取的数据对应磁盘上的哪个逻辑块号（Block Number）。

### 🧱 第5层：通用块层（Block Layer）

文件系统将逻辑块号提交给块层。为了统一管理机械硬盘、SSD等不同块设备，内核在此层将请求封装成统一的“块I/O请求（bio，Block I/O）”。

- 学习I/O的重点：此处会进行I/O合并（将相邻的多个小请求合并成一个大请求）和I/O排队。高性能场景常提到的io_uring，也在此层进行深度优化。

### ⏱️ 第6层：I/O调度层（I/O Scheduler）

这是Linux I/O栈中最具策略性的一层（重要！）。它负责决定将块请求以什么顺序发给硬件。

- 对于机械硬盘（HDD）：调度器（如`mq-deadline`）会执行电梯算法，对请求进行排序和延迟，尽量减少磁头来回移动。
- 对于固态硬盘（SSD）：通常使用`none`（或`noop`）调度器，不做排序，直接将请求下发以减少CPU开销。

### 💾 第7层：块设备驱动 + 硬件（Block Device Drivers & Hardware）

这是最底层。驱动程序根据调度器排好的队列，通过DMA（直接内存访问）将数据从内存拷贝到磁盘控制器，或者反过来。最终由磁盘盘片/闪存颗粒完成物理读写。

---

### 💡 给准备学I/O的你：两条至关重要的“路径”

搞懂分层后，你必须立刻分清这两条路径，这决定了你以后写代码的性能：

1. 缓冲I/O（标准I/O）：数据在 第3层（页缓存） 停留。应用写入时，先写到缓存就返回（异步写），由内核后台刷盘。应用读取时，若缓存命中则极快。这是Linux默认的方式。
2. 直接I/O（Direct I/O）：应用打开文件时携带`O_DIRECT`标志，数据绕过页缓存，直接从第4层文件系统直达硬件。数据库（如MySQL、PostgreSQL）常用，因为它们要自己管理缓存，避免操作系统缓存带来的双倍内存开销和数据丢失风险。

---

### 🚀 进阶学习路线建议

顺着分层结构，你的学习可以按这个顺序来，效率最高：

1. 先学第1、2层：搞懂`read`/`write`系统调用的阻塞与非阻塞（Blocking/Non-blocking）。
2. 再攻第3层：深入研究页缓存（Page Cache）的工作机制，理解脏页回写（Flusher线程）。这是Linux I/O性能的灵魂。
3. 掌握第6层：查看你服务器的I/O调度器（`cat /sys/block/sda/queue/scheduler`），理解不同调度器的适用场景。
4. 终极进阶：学习零拷贝（Zero-copy）技术（如`sendfile`）如何跨越第2层和第3层，以及io_uring如何重构从第2层到第5层的整个异步I/O流程。

# 搭建开发环境

## 配置Ubuntu NAT联网

虚拟机网络模式：

## 配置Ubuntu SSH免密登录

## 安装VS Code软件

## VS Code远程连接Ubuntu

# 标准IO概念

### man手册使用方式：

Man（Manual）是Linux/Unix系统内置的官方权威手册，无需联网、零依赖，是运维、开发人员查询命令、系统调用、配置文件、库函数的核心工具。本笔记从**基础认知、核心语法、章节体系、页面解读、高阶技巧、实战场景、故障排查**全维度讲解，零基础可入门，老手可精进。

### 一、Man手册核心基础认知

#### 1.1 什么是Man手册？

man 是 Linux 系统默认自带的帮助文档工具，所有系统内置命令、系统函数、配置文件、内核接口都有对应的官方手册页（man page）。相较于 `--help` 简短提示，man 手册内容完整、权威，包含**参数详解、使用示例、注意事项、错误码、关联文件**等全套信息。

核心优势：本地离线、官方权威、覆盖系统全组件、适配所有Linux发行版。

#### 1.2 基础语法结构

通用命令格式：

```text
man [可选章节号] [可选参数] 目标名称
```

- 章节号：可选，用于精准区分同名不同类型的手册（核心重点，后文详解）
- 目标名称：命令名、系统调用名、库函数名、配置文件名等
- 默认规则：不指定章节时，按系统默认优先级匹配第一个手册页

#### 1.3 基础最简用法

```text
# 查看ls命令官方手册
man ls

# 查看cp命令手册
man cp

# 退出手册页面：按 q 键（最基础操作）
```

### 二、Man手册核心章节体系（必考重点）

man 手册分为9个标准章节，不同章节对应不同类型的文档，**同名内容可能分布在多个章节**，精准查询必须掌握章节区分。例如 `time` 既是系统命令（章节1），也是系统时间概念规范（章节7）。

| 章节号 | 作用范围 | 典型示例 |
|-|-|-|
| 1 | 普通用户可执行的**系统命令**（最常用） | ls、cd、mkdir、time、ping |
| 2 | Linux **系统调用**（内核提供的接口，开发常用） | open、read、write、fork、exit |
| 3 | C语言**库函数**（标准库、系统库函数） | printf、malloc、strlen、socket |
| 4 | **设备文件与特殊文件**（/dev目录下设备） | /dev/sda、/dev/tty、null设备 |
| 5 | **配置文件格式与规范**（运维高频） | /etc/passwd、/etc/fstab、crontab格式 |
| 6 | 系统游戏、娱乐程序（极少用） | 系统内置小游戏手册 |
| 7 | **杂项、协议、标准、宏定义** | time时间规范、inode、tcp协议、信号量 |
| 8 | **管理员系统命令**（需root权限，运维核心） | mount、umount、iptables、systemctl |
| 9 | Linux内核内部接口、内核函数（内核开发专用） | 内核驱动相关函数 |

### 章节精准查询实战

```text
# 默认查询time命令（章节1）
man time

# 精准查询time系统规范（章节7）
man 7 time

# 精准查询open系统调用（章节2，而非命令）
man 2 open

# 精准查询passwd配置文件格式（章节5，而非passwd命令）
man 5 passwd
```

### 三、Man手册页面操作快捷键（高效浏览）

打开man页面后，默认进入less阅读器，掌握快捷键可大幅提升查询效率，无需反复退出重查。

#### 3.1 基础翻页操作

- **q**：退出手册页面（必记）
- **空格**：向下翻一整页
- **回车**：向下翻一行
- **b**：向上翻一整页
- **k**：向上翻一行
- **g**：跳转到页面顶部
- **G**：跳转到页面底部

#### 3.2 精准搜索操作（核心高频）

- **/关键词**：向下搜索指定关键词（例：`/example` 搜索示例）
- **?关键词**：向上搜索指定关键词
- **n**：跳转到下一个匹配结果
- **N**：跳转到上一个匹配结果
- **&关键词**：只显示包含关键词的行

### 四、Man常用参数（进阶核心）

除了基础查询，man 自带丰富参数，支持搜索、定位、列出所有手册、更新缓存等实用功能。

#### 4.1 常用核心参数

```text
# 1. -f：精准匹配，列出目标所有对应手册页（等价whatis）
man -f time

# 2. -k：模糊搜索，匹配所有含关键字的手册（等价apropos，万能查找）
man -k port

# 3. -w：查看手册文件的真实存储路径
man -w ls
# 输出示例：/usr/share/man/man1/ls.1.gz

# 4. -a：依次查看目标所有章节的手册页（逐个切换）
man -a time

# 5. -l：直接查看指定手册文件
man -l /usr/share/man/man1/ls.1.gz

# 6. -C：指定自定义配置文件
man -C /etc/man.config

# 7. -V：查看man版本信息
man -V
```

#### 4.2 万能模糊搜索实战

忘记完整命令名时，用 `man -k` 关键词检索，是Linux排错、查命令的神器。

```text
# 查找所有和“端口”相关的命令、配置、函数
man -k port

# 查找所有和“进程”相关的手册
man -k process
```

### 五、标准Man手册页面结构解读

所有man手册页都是标准化结构，固定模块分布，读懂结构可快速抓取核心信息，无需逐行阅读。

#### 5.1 标准九大模块

1. **NAME（名称）**：命令/函数的名称+极简功能描述
2. **SYNOPSIS（语法概要）**：标准使用格式，参数规则  
        

   - `[]`：可选参数
   - `<>`：必选参数
   - `...`：可多个参数
   - `|`：参数互斥，二选一
3. **DESCRIPTION（详细描述）**：核心功能、工作原理、详细说明（最核心模块）
4. **OPTIONS（参数选项）**：所有参数的详细释义，含用法、场景
5. **EXAMPLES（示例）**：实战使用案例，直接照搬可用
6. **FILES（关联文件）**：命令关联的配置文件、日志文件、依赖文件
7. **ERRORS（错误码）**：执行失败对应的错误原因、码值说明
8. **SEE ALSO（关联参考）**：相关命令、函数、手册跳转
9. **AUTHOR/BUGS（作者/已知问题）**：维护者、已知缺陷

#### 5.2 符号规则速记

- 无括号参数：固定必填项
- 中括号 `[]`：可选，可省略
- 竖线 `|`：多选一，不能同时使用
- 省略号 `...`：支持多个连续参数

### 六、高阶精通技巧（运维/开发必备）

#### 6.1 手册缓存更新

系统新增命令、安装软件后，man可能检索不到手册，需更新缓存数据库：

```text
# CentOS/RHEL 系统
makewhatis

# Ubuntu/Debian 系统
mandb

# 强制更新所有手册缓存
mandb -f
```

#### 6.2 导出man手册为文本文件

默认man页面无法直接复制全部内容，可导出为txt文件永久保存、查阅：

```text
# 导出ls命令手册到ls_manual.txt
man ls > ls_manual.txt

# 过滤空行，精简导出
man ls | grep -v ^$ > ls_clean.txt
```

#### 6.3 自定义Man手册路径

系统默认手册路径为 `/usr/share/man`，可通过环境变量扩展自定义路径：

```text
# 查看当前man手册搜索路径
manpath

# 临时添加自定义手册路径
export MANPATH=/home/user/man:$MANPATH

# 永久生效：写入/etc/profile或~/.bashrc
```

#### 6.4 中英文手册切换

多数系统默认英文手册，可切换中文（需安装中文包）：

```text
# Ubuntu安装中文man手册
apt install manpages-zh

# CentOS安装中文man手册
yum install man-pages-zh-CN

# 临时切换中文
export LANG=zh_CN.UTF-8

# 临时切换英文（排查翻译歧义必备）
export LANG=en_US.UTF-8
```

### 底层原理与面试高频考点（精通必备）

#### 10.1 man、--help、info 三者核心区别（面试必考）

很多新手会混淆三种帮助方式，三者在内容体量、适用场景、完备性上差异极大，具体区别如下：

| 查询方式 | 内容体量 | 完备性 | 适用场景 |
|-|-|-|-|
| **--help** | 极简 | 只展示常用参数，无原理、无错误码、无示例细节 | 临时快速查简单参数，日常快速使用 |
| **man** | 完整 | 官方标准文档，含语法、参数、示例、错误码、关联文件、注意事项 | 正式运维、开发查标准用法、排错、学习底层规范 |
| **info** | 最全 | GNU官方超详细文档，比man更细致，含完整原理、拓展用法 | 深度学习GNU工具，man文档内容不足时使用 |

#### 10.2 man 底层工作原理

man 并非直接读取明文文档，而是读取系统预编译的**.gz 压缩手册文件**，配合缓存数据库实现快速检索，完整流程如下：

1. **文件存储**：所有手册文件默认存放于 `/usr/share/man/man[1-9]/` 目录，以 `命令.章节.gz` 格式压缩存储，节省磁盘空间；
2. **缓存索引**：系统通过 `mandb/makewhatis` 生成索引缓存，避免每次检索遍历全部目录，大幅提升查询速度；
3. **解析渲染**：执行 man 命令后，系统自动解压压缩文件，通过 less 阅读器渲染页面，展示标准化文档；
4. **匹配规则**：无指定章节时，按 1→8→3→2→5→7→4→6→9 的系统默认优先级匹配首个手册页。

#### 10.3 whatis / apropos 底层关联关系

这两个命令是 man 工具的衍生命令，底层共享同一套缓存数据库，是高频面试细节点：

- `whatis` = `man -f`：精准全词匹配，严格匹配命令/函数全名，只返回完全一致的手册条目；
- `apropos` = `man -k`：模糊正则匹配，匹配手册**名称+描述**中包含关键词的所有条目；
- 核心前提：两个命令依赖 man 缓存，缓存失效会查询为空，需执行 `mandb` 更新。

#### 10.4 自定义个人 man 手册（进阶实操）

工作中可自定义私有命令的man手册，适配个人/项目私有工具，步骤极简：

```text
# 1. 新建自定义手册目录
mkdir -p ~/my_man/man1

# 2. 编写自定义手册文件（遵循man标准格式）
# 文件名格式：自定义命令名.1
vim ~/my_man/man1/mycmd.1

# 3. 临时生效自定义手册路径
export MANPATH=~/my_man:$MANPATH

# 4. 更新缓存，生效手册
mandb

# 5. 测试查询自定义手册
man mycmd
```

#### 10.5 面试高频真题+标准答案

#### 真题1：为什么有时候 man 查不到新安装的命令？

**标准答案**：man 依赖本地索引缓存，新安装软件/命令后，缓存数据库未更新，系统无法检索到新的手册文件。解决方案：Debian/Ubuntu 执行 `mandb`，CentOS/RHEL 执行 `makewhatis` 更新缓存。

#### 真题2：time 命令执行 man time 和 man 7 time 结果为什么不一样？

**标准答案**：man 多章节隔离同名资源。`man time` 默认查询章节1，是用户可执行的time命令工具；`man 7 time` 查询章节7，是Linux系统时间标准、协议规范，二者属于完全不同的文档资源。

#### 真题3：--help 和 man 核心区别是什么？工作中优先用哪个？

**标准答案**：--help 是命令自带的简易帮助，仅展示常用参数，内容精简不完整；man 是系统官方完整手册，包含语法、参数、示例、错误码、关联文件等全套内容。工作中**简单查参数用--help，正式使用、排错、学原理优先man**。

#### 真题4：如何查看一个命令所有可用的man手册章节？

**标准答案**：使用 `man -f 命令名`（或 whatis 命令名），可列出该命令所有对应的章节手册，再按需精准查询对应章节。

#### 十一、终极学习总结

1. **入门核心**：掌握基础查询、页面快捷键、9大章节划分，解决90%日常查询需求；

2. **进阶核心**：熟练使用 `-k/-f/-w/-a` 参数，读懂man标准文档结构，快速抓取关键信息；

3. **精通核心**：理解man底层压缩存储+缓存机制、区分三类帮助工具、掌握自定义手册、解决各类报错问题；

4. **工作准则**：遇命令不会用、参数不懂、报错看不懂，优先查man官方手册，权威且零误差。

# 标准IO函数

## 汇总

文件打开与关闭类 

- fopen / fclose / freopen

单字符读写类 

- fgetc / getc / getchar / fputc / putc / putchar

按行读写类 

- fgets / fputs / puts

块（二进制）读写类 

- fread / fwrite

文件定位（偏移）类 

- fseek / ftell / rewind / fgetpos / fsetpos

文件结束与错误判断类 

- feof / ferror / clearerr / perror

缓冲区管理类 

- setbuf / setvbuf / fflush

格式化读写类 

- printf / fprintf / snprintf / scanf / fscanf / sscanf

文件管理与临时文件类 

- remove / rename / tmpfile


<table v-pre><tbody><tr><td>函数类别</td><td>读写单位</td><td>典型函数</td><td>核心适用场景</td><td>执行效率</td><td>缓冲区特性</td><td>核心注意事项</td></tr><tr><td>单字符读写</td><td>单个字节（字符）</td><td>fgetc / fputc</td><td>逐字符解析、精细字符处理、简单循环读写</td><td>较低</td><td>受缓冲区机制影响，实际仍是批量读写</td><td>适合逻辑复杂的逐字节处理，不适合大批量数据</td></tr><tr><td>行式读写</td><td>一行（遇换行符停止）</td><td>fgets / fputs</td><td>文本文件按行读取、配置文件解析、日志处理</td><td>中等</td><td>行缓冲模式下效率友好</td><td>仅适合文本文件，不可用于二进制文件；换行符会被读入缓冲区</td></tr><tr><td>块（二进制）读写</td><td>指定大小的字节块</td><td>fread / fwrite</td><td>二进制文件读写、结构体 / 数组批量读写、大文件拷贝</td><td>最高</td><td>全缓冲模式下性能最优，减少系统调用次数</td><td>不自动追加 \0，不识别换行符；返回值是「项数」不是字节数</td></tr><tr><td>格式化读写</td><td>格式化字符串</td><td>printf / scanf</td><td>人机交互输出、文本格式化拼接、按格式解析文本</td><td>最低</td><td>内部做字符串解析与拼接，开销大</td><td>输入类存在缓冲区溢出风险，推荐用 snprintf 替代 sprintf</td></tr><tr><td>文件定位类</td><td>操作读写位置指针</td><td>fseek / ftell</td><td>随机读写、指定位置读写、获取文件大小</td><td>-</td><td>不改变缓冲机制，仅移动指针</td><td>文本模式下慎用 fseek，推荐二进制模式使用</td></tr><tr><td>缓冲管理类</td><td>控制缓冲区行为</td><td>setvbuf / fflush</td><td>优化 IO 性能、强制实时输出、自定义缓冲</td><td>-</td><td>直接控制缓冲模式与大小</td><td>缓冲设置必须在文件打开后、首次读写前调用</td></tr></tbody></table>


## 易混淆高频考点辨析

1. fgetc 与 getc 对比


<table v-pre><tbody><tr><td>对比项</td><td>fgetc</td><td>getc</td></tr><tr><td>实现方式</td><td>标准函数</td><td>通常为宏实现</td></tr><tr><td>调用开销</td><td>函数调用，开销略大</td><td>宏展开，无函数调用开销，速度更快</td></tr><tr><td>参数副作用</td><td>安全，参数只会被计算一次</td><td>宏可能导致参数被多次计算，有副作用风险</td></tr><tr><td>使用场景</td><td>通用场景，参数是复杂表达式时优先</td><td>追求性能、参数为简单变量时使用</td></tr></tbody></table>


1. fgets 与 gets 对比


<table v-pre><tbody><tr><td>对比项</td><td>fgets</td><td>gets</td></tr><tr><td>缓冲区长度检查</td><td>有，指定 size 参数，最多读 size-1 个字符</td><td>无，完全不检查长度</td></tr><tr><td>换行符处理</td><td>换行符会被存入缓冲区</td><td>换行符会被丢弃，不存入缓冲区</td></tr><tr><td>安全性</td><td>安全，不会溢出缓冲区</td><td>极度危险，必然存在缓冲区溢出漏洞</td></tr><tr><td>标准状态</td><td>C 标准保留，推荐使用</td><td>C11 标准已彻底移除，禁止使用</td></tr></tbody></table>


1. sprintf 与 snprintf 对比


<table v-pre><tbody><tr><td>对比项</td><td>sprintf</td><td>snprintf</td></tr><tr><td>长度限制</td><td>无，可能造成缓冲区溢出</td><td>有，第二个参数指定缓冲区总大小</td></tr><tr><td>结尾 \0</td><td>自动追加</td><td>自动追加，最多写入 size-1 个字符</td></tr><tr><td>返回值含义</td><td>成功写入的字符数</td><td>预期写入的字符数（不含 \0）；大于等于 size 表示发生截断</td></tr><tr><td>推荐程度</td><td>不推荐，存在安全隐患</td><td>强烈推荐，安全版本</td></tr></tbody></table>


1. fread 与 fgets 对比


<table v-pre><tbody><tr><td>对比项</td><td>fread</td><td>fgets</td></tr><tr><td>读取规则</td><td>按固定字节数读取，不识别任何特殊字符</td><td>读到换行符或 EOF 停止，识别 \n</td></tr><tr><td>适用文件</td><td>二进制文件、文本文件通用</td><td>仅适合文本文件</td></tr><tr><td>结尾 \0</td><td>不自动追加，纯字节拷贝</td><td>自动在末尾追加 \0</td></tr><tr><td>典型用途</td><td>结构体、数组、图片等二进制数据</td><td>日志、配置、代码等文本行读取</td></tr></tbody></table>


1. feof 经典易错点说明

- 错误用法：`while (!feof(fp)) { 读文件 }`

  - 原因：`feof` 是在读操作失败后判断是否因到达文件尾而失败，提前判断会导致最后一次读取失败时仍处理无效数据。
- 正确用法：先执行读操作，判断读操作返回值，返回异常时再用 `feof` / `ferror` 区分原因。

```text
while (fread(buf, 1, 10, fp) > 0) {
    // 处理数据
}
if (feof(fp)) {
    // 正常读到文件末尾
} else if (ferror(fp)) {
    // 读取出错
}
```

## 分函数详细说明

### 文件打开与关闭类

> 本类功能：负责文件与标准 IO 流的建立、关联、重定向与资源释放，是所有文件操作的入口与出口。所有读写操作必须先打开文件流，结束后及时关闭以避免资源泄漏。

#### 1.1 fopen 函数


<table v-pre><tbody><tr><td>项目</td><td>说明</td></tr><tr><td>所需头文件</td><td>#include &lt;stdio.h&gt;</td></tr><tr><td>原型</td><td>FILE *fopen(const char *pathname, const char *mode);</td></tr><tr><td>功能</td><td>以指定模式打开 pathname 对应的文件，返回关联的文件流指针</td></tr><tr><td>参数</td><td>pathname：要打开的文件路径（相对路径 / 绝对路径）<br/>mode：文件打开模式，常用取值：<br/>- &quot;r&quot;：只读，文件必须存在<br/>- &quot;w&quot;：只写，文件不存在则创建，存在则清空内容<br/>- &quot;a&quot;：追加写，文件不存在则创建，写入内容追加到末尾<br/>- &quot;r+&quot;：读写，文件必须存在- 追加字符b表示二进制模式（如&quot;rb&quot;、&quot;wb+&quot;）</td></tr><tr><td>返回值</td><td>成功：返回指向该文件的 FILE* 文件指针<br/>失败：返回 NULL，并设置 errno 标识错误原因</td></tr></tbody></table>


#### 1.2 fclose 函数


<table v-pre><tbody><tr><td>项目</td><td>说明</td></tr><tr><td>所需头文件</td><td>#include &lt;stdio.h&gt;</td></tr><tr><td>原型</td><td>int fclose(FILE *stream);</td></tr><tr><td>功能</td><td>关闭已打开的文件流，刷新缓冲区并释放系统资源</td></tr><tr><td>参数</td><td>stream：要关闭的文件指针</td></tr><tr><td>返回值</td><td>成功：返回 0<br/>失败：返回 EOF，并设置 errno</td></tr></tbody></table>


#### 1.3 freopen 函数


<table v-pre><tbody><tr><td>项目</td><td>说明</td></tr><tr><td>所需头文件</td><td>#include &lt;stdio.h&gt;</td></tr><tr><td>原型</td><td>FILE *freopen(const char *pathname, const char *mode, FILE *stream);</td></tr><tr><td>功能</td><td>将已有文件流重定向到新文件，常用于标准输入 / 输出 / 错误的重定向</td></tr><tr><td>参数</td><td>pathname：新的目标文件路径mode：打开模式，同 fopenstream：要重定向的已有文件流</td></tr><tr><td>返回值</td><td>成功：返回重定向后的文件指针（即原 stream）失败：返回 NULL，并设置 errno</td></tr></tbody></table>


---

### 单字符读写类

> 本类功能：以单个字节为单位进行读写，粒度最细，适合字符级别的精细处理、简单循环输入输出场景。

#### 2.1 fgetc 函数


<table v-pre><tbody><tr><td>项目</td><td>说明</td></tr><tr><td>项目</td><td>说明</td></tr><tr><td>所需头文件</td><td>#include &lt;stdio.h&gt;</td></tr><tr><td>原型</td><td>int fgetc(FILE *stream);</td></tr><tr><td>功能</td><td>从文件流中读取一个字符</td></tr><tr><td>参数</td><td>stream：目标文件指针</td></tr><tr><td>返回值</td><td>成功：返回读取到的字符（以 unsigned char 转 int 的形式）<br/>到达文件末尾或出错：返回 EOF，需配合 feof/ferror 区分场景</td></tr></tbody></table>


#### 2.2 getc 函数


<table v-pre><tbody><tr><td>项目</td><td>说明</td></tr><tr><td>所需头文件</td><td>#include &lt;stdio.h&gt;</td></tr><tr><td>原型</td><td>int getc(FILE *stream);</td></tr><tr><td>功能</td><td>功能与 fgetc 完全一致，通常以宏的形式实现，执行效率更高</td></tr><tr><td>参数</td><td>stream：目标文件指针</td></tr><tr><td>返回值</td><td>同 fgetc</td></tr></tbody></table>


#### 2.3 getchar 函数


<table v-pre><tbody><tr><td>项目</td><td>说明</td></tr><tr><td>所需头文件</td><td>#include &lt;stdio.h&gt;</td></tr><tr><td>原型</td><td>int getchar(void);</td></tr><tr><td>功能</td><td>从标准输入 stdin 读取一个字符，等价于 fgetc(stdin)</td></tr><tr><td>参数</td><td>无</td></tr><tr><td>返回值</td><td>同 fgetc</td></tr></tbody></table>


#### 2.4 fputc 函数


<table v-pre><tbody><tr><td>项目</td><td>说明</td></tr><tr><td>所需头文件</td><td>#include &lt;stdio.h&gt;</td></tr><tr><td>原型</td><td>int fputc(int c, FILE *stream);</td></tr><tr><td>功能</td><td>将一个字符写入指定文件流</td></tr><tr><td>参数</td><td>c：要写入的字符（会被转换为 unsigned char）stream：目标文件指针</td></tr><tr><td>返回值</td><td>成功：返回写入的字符失败：返回 EOF，并设置 errno</td></tr></tbody></table>


#### 2.5 putc 函数


<table v-pre><tbody><tr><td>项目</td><td>说明</td></tr><tr><td>项目</td><td>说明</td></tr><tr><td>所需头文件</td><td>#include &lt;stdio.h&gt;</td></tr><tr><td>原型</td><td>int putc(int c, FILE *stream);</td></tr><tr><td>功能</td><td>功能与 fputc 完全一致，通常以宏的形式实现，执行效率更高</td></tr><tr><td>参数</td><td>同 fputc</td></tr><tr><td>返回值</td><td>同 fputc</td></tr></tbody></table>


#### 2.6 putchar 函数


<table v-pre><tbody><tr><td>项目</td><td>说明</td></tr><tr><td>所需头文件</td><td>#include &lt;stdio.h&gt;</td></tr><tr><td>原型</td><td>int putchar(int c);</td></tr><tr><td>功能</td><td>将一个字符写入标准输出 stdout，等价于 fputc(c, stdout)</td></tr><tr><td>参数</td><td>c：要写入的字符</td></tr><tr><td>返回值</td><td>同 fputc</td></tr></tbody></table>


---

### 按行读写类

> 本类功能：以「行」为单位处理文本数据，自动识别换行符，是文本文件、配置文件、日志处理的最常用方式。

#### 3.1 fgets 函数


<table v-pre><tbody><tr><td>项目</td><td>说明</td></tr><tr><td>所需头文件</td><td>#include &lt;stdio.h&gt;</td></tr><tr><td>原型</td><td>char *fgets(char *s, int size, FILE *stream);</td></tr><tr><td>功能</td><td>从文件流中读取一行字符，存入缓冲区；最多读取 size-1 个字符，末尾自动补 &#x27;\0&#x27;；遇到换行符或 EOF 停止，换行符会被存入缓冲区</td></tr><tr><td>参数</td><td>s：存储读取内容的缓冲区首地址size：缓冲区总大小stream：目标文件指针</td></tr><tr><td>返回值</td><td>成功：返回缓冲区首地址 s到达文件末尾且未读取到任何字符：返回 NULL出错：返回 NULL，并设置 errno</td></tr></tbody></table>


#### 3.2 fputs 函数


<table v-pre><tbody><tr><td>项目</td><td>说明</td></tr><tr><td>所需头文件</td><td>#include &lt;stdio.h&gt;</td></tr><tr><td>原型</td><td>int fputs(const char *s, FILE *stream);</td></tr><tr><td>功能</td><td>将字符串写入指定文件流，不写入字符串结尾的 &#x27;\0&#x27;</td></tr><tr><td>参数</td><td>s：待写入字符串的首地址stream：目标文件指针</td></tr><tr><td>返回值</td><td>成功：返回非负整数失败：返回 EOF，并设置 errno</td></tr></tbody></table>


#### 3.3 puts 函数


<table v-pre><tbody><tr><td>项目</td><td>说明</td></tr><tr><td>所需头文件</td><td>#include &lt;stdio.h&gt;</td></tr><tr><td>原型</td><td>int puts(const char *s);</td></tr><tr><td>功能</td><td>将字符串写入标准输出 stdout，并自动在末尾追加一个换行符；不写入 &#x27;\0&#x27;</td></tr><tr><td>参数</td><td>s：待输出的字符串首地址</td></tr><tr><td>返回值</td><td>成功：返回非负整数失败：返回 EOF，并设置 errno</td></tr></tbody></table>


> 补充：`gets` 函数已在 C11 标准中被移除，存在严重缓冲区溢出风险，禁止使用，请统一使用 fgets 替代。

---

### 块（二进制）读写类

> 本类功能：按指定字节块大小批量读写，不识别任何特殊字符，效率最高，是二进制文件、结构体、数组数据读写的首选。

#### 4.1 fread 函数


<table v-pre><tbody><tr><td>项目</td><td>说明</td></tr><tr><td>所需头文件</td><td>#include &lt;stdio.h&gt;</td></tr><tr><td>原型</td><td>size_t fread(void *ptr, size_t size, size_t nmemb, FILE *stream);</td></tr><tr><td>功能</td><td>从 stream 中读取 nmemb 项数据，每项大小为 size，将它们存入 ptr 指向的位置中</td></tr><tr><td>参数</td><td>ptr：存储读取到的数据首地址size：每个数据项的大小 (单位是字节)，一般将其置为 1，让项目数表示字节数nmemb：要读取的数据项的最大数量stream：文件指针</td></tr><tr><td>返回值</td><td>成功：返回实际读取的数据项数量返回值小于 nmemb 时，可能是遇到了文件结束 (EOF) 或者是出现了错误返回值为 0，就是没有读取到任何的数据fread 不区分文件结束 (EOF) 或者是读取错误，调用者必须使用 feof 函数或者 ferror 函数来区分场景</td></tr></tbody></table>


#### 4.2 fwrite 函数


<table v-pre><tbody><tr><td>项目</td><td>说明</td></tr><tr><td>所需头文件</td><td>#include &lt;stdio.h&gt;</td></tr><tr><td>原型</td><td>size_t fwrite(const void *ptr, size_t size, size_t nmemb, FILE *stream);</td></tr><tr><td>功能</td><td>将 ptr 指向的 nmemb 项数据写入 stream 中，每项数据大小为 size 字节</td></tr><tr><td>参数</td><td>ptr：待写入数据的首地址size：每个数据项的大小 (单位是字节)，一般置为 1，让项目数表示字节数nmemb：要写入的数据项数量stream：目标文件指针</td></tr><tr><td>返回值</td><td>成功：返回实际成功写入的数据项数量返回值小于 nmemb 时，表示写入出错，需通过 ferror 检查错误原因</td></tr></tbody></table>


---

### 文件定位（偏移）类

> 本类功能：控制文件流内部的读写位置指针，实现随机读写、指定位置跳转、获取文件大小等操作。

#### 5.1 fseek 函数


<table v-pre><tbody><tr><td>项目</td><td>说明</td></tr><tr><td>所需头文件</td><td>#include &lt;stdio.h&gt;</td></tr><tr><td>原型</td><td>int fseek(FILE *stream, long offset, int whence);</td></tr><tr><td>功能</td><td>设置文件流的读写位置指针，以 whence 为基准，偏移 offset 个字节</td></tr><tr><td>参数</td><td>stream：目标文件指针<br/>offset：偏移量，正数向后偏移，负数向前偏移<br/>whence：基准位置，取值：<br/>- SEEK_SET：文件开头<br/>- SEEK_CUR：当前位置<br/>- SEEK_END：文件末尾</td></tr><tr><td>返回值</td><td>成功：返回 0失败：返回 -1，并设置 errno</td></tr></tbody></table>


#### 5.2 ftell 函数


<table v-pre><tbody><tr><td>项目</td><td>说明</td></tr><tr><td>所需头文件</td><td>#include &lt;stdio.h&gt;</td></tr><tr><td>原型</td><td>long ftell(FILE *stream);</td></tr><tr><td>功能</td><td>获取文件流当前读写位置相对于文件开头的偏移字节数</td></tr><tr><td>参数</td><td>stream：目标文件指针</td></tr><tr><td>返回值</td><td>成功：返回当前位置的偏移字节数失败：返回 -1，并设置 errno</td></tr></tbody></table>


#### 5.3 rewind 函数


<table v-pre><tbody><tr><td>项目</td><td>说明</td></tr><tr><td>所需头文件</td><td>#include &lt;stdio.h&gt;</td></tr><tr><td>原型</td><td>void rewind(FILE *stream);</td></tr><tr><td>功能</td><td>将文件读写位置重置到文件开头，并清除 EOF 标志和错误标志</td></tr><tr><td>参数</td><td>stream：目标文件指针</td></tr><tr><td>返回值</td><td>无返回值</td></tr></tbody></table>


#### 5.4 fgetpos 函数


<table v-pre><tbody><tr><td>项目</td><td>说明</td></tr><tr><td>所需头文件</td><td>#include &lt;stdio.h&gt;</td></tr><tr><td>原型</td><td>int fgetpos(FILE *stream, fpos_t *pos);</td></tr><tr><td>功能</td><td>获取文件当前位置，存入 fpos_t 类型变量，支持超出 long 范围的超大文件</td></tr><tr><td>参数</td><td>stream：目标文件指针pos：存储位置信息的变量地址</td></tr><tr><td>返回值</td><td>成功：返回 0失败：返回非 0 值，并设置 errno</td></tr></tbody></table>


#### 5.5 fsetpos 函数


<table v-pre><tbody><tr><td>项目</td><td>说明</td></tr><tr><td>所需头文件</td><td>#include &lt;stdio.h&gt;</td></tr><tr><td>原型</td><td>int fsetpos(FILE *stream, const fpos_t *pos);</td></tr><tr><td>功能</td><td>将文件读写位置设置为 pos 指定的位置（需配合 fgetpos 使用）</td></tr><tr><td>参数</td><td>stream：目标文件指针pos：目标位置信息的地址</td></tr><tr><td>返回值</td><td>成功：返回 0失败：返回非 0 值，并设置 errno</td></tr></tbody></table>


---

### 文件结束与错误判断类

> 本类功能：用于区分读写操作异常的原因 —— 是正常到达文件末尾，还是发生了 IO 错误，是健壮文件操作的必备辅助函数。

#### 6.1 feof 函数


<table v-pre><tbody><tr><td>项目</td><td>说明</td></tr><tr><td>所需头文件</td><td>#include &lt;stdio.h&gt;</td></tr><tr><td>原型</td><td>int feof(FILE *stream);</td></tr><tr><td>功能</td><td>测试文件流是否到达了文件末尾（EOF）</td></tr><tr><td>参数</td><td>stream：目标文件指针</td></tr><tr><td>返回值</td><td>已到达文件末尾：返回非 0 值（真）<br/>未到达文件末尾：返回 0（假）</td></tr></tbody></table>


#### 6.2 ferror 函数


<table v-pre><tbody><tr><td>项目</td><td>说明</td></tr><tr><td>所需头文件</td><td>#include &lt;stdio.h&gt;</td></tr><tr><td>原型</td><td>int ferror(FILE *stream);</td></tr><tr><td>功能</td><td>测试文件流是否发生了读写错误</td></tr><tr><td>参数</td><td>stream：目标文件指针</td></tr><tr><td>返回值</td><td>发生错误：返回非 0 值（真）<br/>未发生错误：返回 0（假）</td></tr></tbody></table>


#### 6.3 clearerr 函数


<table v-pre><tbody><tr><td>项目</td><td>说明</td></tr><tr><td>所需头文件</td><td>#include &lt;stdio.h&gt;</td></tr><tr><td>原型</td><td>void clearerr(FILE *stream);</td></tr><tr><td>功能</td><td>清除文件流的文件结束标志 (EOF) 和错误标志</td></tr><tr><td>参数</td><td>stream：目标文件指针</td></tr><tr><td>返回值</td><td>无返回值</td></tr></tbody></table>


#### 6.4 perror 函数


<table v-pre><tbody><tr><td>项目</td><td>说明</td></tr><tr><td>所需头文件</td><td>#include &lt;stdio.h&gt;</td></tr><tr><td>原型</td><td>void perror(const char *s);</td></tr><tr><td>功能</td><td>先输出自定义字符串 s，再输出冒号和当前 errno 对应的错误描述（输出到标准错误 stderr）</td></tr><tr><td>参数</td><td>s：自定义错误提示前缀，可为 NULL</td></tr><tr><td>返回值</td><td>无返回值</td></tr></tbody></table>


---

### 缓冲区管理类

> 本类功能：标准 IO 的核心优势就是通过用户态缓冲区减少系统调用次数。本类函数用于自定义缓冲模式、大小，以及强制刷新缓冲区。

#### 7.1 setbuf 函数


<table v-pre><tbody><tr><td>项目</td><td>说明</td></tr><tr><td>所需头文件</td><td>#include &lt;stdio.h&gt;</td></tr><tr><td>原型</td><td>void setbuf(FILE *stream, char *buf);</td></tr><tr><td>功能</td><td>设置文件流的缓冲区；buf 为 NULL 时关闭缓冲，非 NULL 时使用该数组作为缓冲区</td></tr><tr><td>参数</td><td>stream：目标文件指针<br/>buf：缓冲区首地址，NULL 表示无缓冲</td></tr><tr><td>返回值</td><td>无返回值</td></tr></tbody></table>


#### 7.2 setvbuf 函数


<table v-pre><tbody><tr><td>项目</td><td>说明</td></tr><tr><td>所需头文件</td><td>#include &lt;stdio.h&gt;</td></tr><tr><td>原型</td><td>int setvbuf(FILE *stream, char *buf, int mode, size_t size);</td></tr><tr><td>功能</td><td>自定义文件流的缓冲模式、缓冲区地址和大小，必须在文件打开后、读写前调用</td></tr><tr><td>参数</td><td>stream：目标文件指针buf：缓冲区首地址，NULL 时系统自动分配mode：缓冲模式：- _IOFBF：全缓冲- _IOLBF：行缓冲- _IONBF：无缓冲size：缓冲区大小（字节）</td></tr><tr><td>返回值</td><td>成功：返回 0失败：返回非 0 值</td></tr></tbody></table>


#### 7.3 fflush 函数


<table v-pre><tbody><tr><td>项目</td><td>说明</td></tr><tr><td>所需头文件</td><td>#include &lt;stdio.h&gt;</td></tr><tr><td>原型</td><td>int fflush(FILE *stream);</td></tr><tr><td>功能</td><td>强制刷新输出缓冲区，将缓冲数据写入底层文件；传入 NULL 时刷新所有打开的输出流</td></tr><tr><td>参数</td><td>stream：目标文件指针</td></tr><tr><td>返回值</td><td>成功：返回 0失败：返回 EOF，并设置 errno</td></tr></tbody></table>


---

### 格式化读写类

> 本类功能：按照指定格式字符串完成数据的格式化输出与解析，是人机交互、日志打印、文本解析最常用的函数，功能强大但开销较高。

#### 8.1 printf 函数


<table v-pre><tbody><tr><td>项目</td><td>说明</td></tr><tr><td>所需头文件</td><td>#include &lt;stdio.h&gt;</td></tr><tr><td>原型</td><td>int printf(const char *format, ...);</td></tr><tr><td>功能</td><td>按格式字符串将内容格式化后输出到标准输出 stdout</td></tr><tr><td>参数</td><td>format：格式控制字符串（含 % d、% s 等格式符）...：可变参数，对应格式符的待输出数据</td></tr><tr><td>返回值</td><td>成功：返回实际输出的字符数失败：返回负值</td></tr></tbody></table>


#### 8.2 fprintf 函数


<table v-pre><tbody><tr><td>项目</td><td>说明</td></tr><tr><td>所需头文件</td><td>#include &lt;stdio.h&gt;</td></tr><tr><td>原型</td><td>int fprintf(FILE *stream, const char *format, ...);</td></tr><tr><td>功能</td><td>按格式字符串将内容格式化后输出到指定文件流</td></tr><tr><td>参数</td><td>stream：目标文件指针format：格式控制字符串...：可变参数</td></tr><tr><td>返回值</td><td>成功：返回实际输出的字符数失败：返回负值</td></tr></tbody></table>


#### 8.3 snprintf 函数


<table v-pre><tbody><tr><td>项目</td><td>说明</td></tr><tr><td>所需头文件</td><td>#include &lt;stdio.h&gt;</td></tr><tr><td>原型</td><td>int snprintf(char *str, size_t size, const char *format, ...);</td></tr><tr><td>功能</td><td>安全地将格式化后的字符串写入缓冲区，最多写入 size-1 个字符，末尾自动补 &#x27;\0&#x27;</td></tr><tr><td>参数</td><td>str：目标缓冲区首地址size：缓冲区总大小format：格式控制字符串...：可变参数</td></tr><tr><td>返回值</td><td>成功：返回预期要写入的字符数（不含 &#x27;\0&#x27;）；返回值 &gt;= size 表示发生截断</td></tr></tbody></table>


> 补充：`sprintf` 不检查缓冲区长度，存在溢出风险，推荐统一使用 snprintf 替代。

#### 8.4 scanf 函数


<table v-pre><tbody><tr><td>项目</td><td>说明</td></tr><tr><td>所需头文件</td><td>#include &lt;stdio.h&gt;</td></tr><tr><td>原型</td><td>int scanf(const char *format, ...);</td></tr><tr><td>功能</td><td>从标准输入 stdin 读取数据，按格式解析后存入对应地址参数</td></tr><tr><td>参数</td><td>format：格式控制字符串...：可变参数，必须是变量的地址（指针）</td></tr><tr><td>返回值</td><td>成功：返回成功匹配并赋值的项数到达文件末尾 / 出错：返回 EOF</td></tr></tbody></table>


#### 8.5 fscanf 函数


<table v-pre><tbody><tr><td>项目</td><td>说明</td></tr><tr><td>所需头文件</td><td>#include &lt;stdio.h&gt;</td></tr><tr><td>原型</td><td>int scanf(const char *format, ...);</td></tr><tr><td>功能</td><td>从标准输入 stdin 读取数据，按格式解析后存入对应地址参数</td></tr><tr><td>参数</td><td>format：格式控制字符串...：可变参数，必须是变量的地址（指针）</td></tr><tr><td>返回值</td><td>成功：返回成功匹配并赋值的项数到达文件末尾 / 出错：返回 EOF</td></tr></tbody></table>


#### 8.6 sscanf 函数


<table v-pre><tbody><tr><td>项目</td><td>说明</td></tr><tr><td>所需头文件</td><td>#include &lt;stdio.h&gt;</td></tr><tr><td>原型</td><td>int fscanf(FILE *stream, const char *format, ...);</td></tr><tr><td>功能</td><td>从指定文件流读取数据，按格式解析存入对应地址</td></tr><tr><td>参数</td><td>stream：目标文件指针format：格式控制字符串...：可变参数（地址）</td></tr><tr><td>返回值</td><td>同 scanf</td></tr></tbody></table>


---

### 文件管理与临时文件类

> 本类功能：不依赖文件流，直接对文件系统进行操作，包括文件删除、重命名、临时文件创建等。

#### 9.1 remove 函数


<table v-pre><tbody><tr><td>项目</td><td>说明</td></tr><tr><td>所需头文件</td><td>#include &lt;stdio.h&gt;</td></tr><tr><td>原型</td><td>int remove(const char *pathname);</td></tr><tr><td>功能</td><td>删除指定路径的文件或空目录</td></tr><tr><td>参数</td><td>pathname：要删除的文件 / 空目录路径</td></tr><tr><td>返回值</td><td>成功：返回 0失败：返回 -1，并设置 errno</td></tr></tbody></table>


#### 9.2 rename 函数


<table v-pre><tbody><tr><td>项目</td><td>说明</td></tr><tr><td>所需头文件</td><td>#include &lt;stdio.h&gt;</td></tr><tr><td>原型</td><td>int rename(const char *oldpath, const char *newpath);</td></tr><tr><td>功能</td><td>将文件 / 目录重命名或移动到新路径</td></tr><tr><td>参数</td><td>oldpath：原文件 / 目录路径newpath：新的文件 / 目录路径</td></tr><tr><td>返回值</td><td>成功：返回 0失败：返回 -1，并设置 errno</td></tr></tbody></table>


#### 9.3 tmpfile 函数


<table v-pre><tbody><tr><td>项目</td><td>说明</td></tr><tr><td>所需头文件</td><td>#include &lt;stdio.h&gt;</td></tr><tr><td>原型</td><td>FILE *tmpfile(void);</td></tr><tr><td>功能</td><td>创建一个临时二进制文件，以 &quot;wb+&quot; 模式打开，文件关闭或程序结束时自动删除</td></tr><tr><td>参数</td><td>无</td></tr><tr><td>返回值</td><td>成功：返回临时文件的文件指针失败：返回 NULL</td></tr></tbody></table>


# 标准IO的缓冲区

## 标准IO的缓冲区

定义:标准I/O 中的缓冲区是C语言标准库为化文件读写效率设计的内存机制,本质上就是一段由FILE结构体管理的内存空间;

作用:

缓冲策略：

数据流动流程图：

![飞书画板](/feishu-assets/053126004f5d.jpg)

## 缓冲区刷新时机



## 手动设置缓冲区（setbuf函数）

void setbuf(FILE\*stream, char \*buf)

## 手动设置缓冲区（setvbuf函数）

Int setvbuf(FILE\*stream, char \*buf,int mode,size_t size)



# 文件IO

## 文件IO概念与文件描述符：

### 文件IO：

**定义：**文件IO是在POSIX(可移植操作系统接口)中定义的一组输入输出的函数，涉及操作系统和应用程序之间的交互，用于读取和写入存储在永久性存储介质(如硬盘、SSD、USB闪存盘等)上的数据；

**跨平台性：**不同操作系统(如UNIX、Windows、Linux)的文件IO机制存在差异，接口、调用方式和底层实现逻辑各有特点；

如Windows下有CreateFile等专属函数，Linux则基于open、read等系统调用；

**高效实现原理：**

•直接交互硬件/文件系统：绕过高级缓冲，直接发起系统调用访问磁盘等设备，数据传输路径短，适合对实时性、精准控制要求高的场景(如设备驱动开发)；

•无用户态缓冲：不依赖用户态缓冲机制，每次读写更贴近硬件真实操作，但频繁调用会增加系统开销，需开发者按需优化(如手动合并读写请求)；

**易用性设计:**

· 贴近底层逻辑:需开发者熟悉操作系统API、文件权限、设备特性等,直接处理缓冲区管理、错误码解析(如Linux中errno),对开发经验要求高;

· 灵活但复杂:可精准控制文件打开模式(只读、读写等)、数据传输细节,却也因需手动处理资源释放(如close函数)、并发冲突等问题,增加开发复杂度;

**特点:**

· 没有缓冲机制,每次调用都会引起系统调用;

· 围绕文件描述符进行操作,相当于标准IO中的流(FILE\*),文件描述符是正整数;

· 默认打开三个描述符:标准输入(O) 标准输出(1) 标准错误(2)

· 除目录文件,其他类型文件都可以操作;

· 可移植性相对较弱;

### 文件描述符：

#### 一、定义

文件描述符（File Descriptor，简称 fd）是操作系统内核为每个打开的文件 / 设备分配的唯一整数标识符，用于标识和跟踪进程与文件的交互。 在 Linux/Unix 系统中，它是底层文件 IO 操作（open/read/write 等系统调用）的核心参数。

---

#### 二、本质

1. 它是进程内的索引值，指向内核中维护的文件表（File Table），文件表中记录了文件的打开状态、读写位置指针、访问模式等信息。
2. 每个进程都拥有自己独立的文件描述符表，编号从 0 开始分配，进程之间相互独立、互不干扰。
3. Linux 系统中，普通进程默认的文件描述符取值范围是 0\~1023，该上限可通过 `ulimit` 命令调整，一般场景使用默认值即可。

---

#### 三、核心作用

##### 连接用户进程与内核资源

进程通过文件描述符向内核发起文件读写、设备操作等请求，无需关心底层硬件与内核的实现细节，实现了用户态与内核态的解耦。

##### 资源管理与回收

操作系统通过文件描述符跟踪文件的打开状态、被哪些进程占用；当进程关闭文件或进程退出时，内核会自动回收对应的文件资源，避免资源泄漏。

---

#### 四、核心特点

1. 唯一性：同一个进程内，每个文件描述符对应唯一的打开文件；不同进程的相同编号 fd，可能对应不同的文件。
2. 非负整数：始终是大于等于 0 的整数；0、1、2 为系统默认占用的标准文件描述符，新打开的文件会自动分配当前最小的可用编号。
3. 跨函数 / 跨调用传递：在进程的生命周期内，同一个 fd 可在不同系统调用、不同函数间传递，代表对同一个打开文件的持续操作。

---

#### 五、标准文件描述符（进程默认打开）

每个进程启动时默认自动打开 3 个文件描述符，无需手动打开：


<table v-pre><tbody><tr><td>编号</td><td>宏定义</td><td>用途</td><td>对应设备</td></tr><tr><td>0</td><td>STDIN_FILENO</td><td>标准输入（Standard Input）</td><td>通常对应键盘</td></tr><tr><td>1</td><td>STDOUT_FILENO</td><td>标准输出（Standard Output）</td><td>通常对应终端屏幕</td></tr><tr><td>2</td><td>STDERR_FILENO</td><td>标准错误（Standard Error）</td><td>通常对应终端屏幕</td></tr></tbody></table>


---

#### 六、补充关键规则

- 分配规则：遵循「最小可用」原则，新打开文件时，内核会分配当前未被占用的、数值最小的文件描述符。
- 生命周期：文件描述符仅在当前进程内有效，进程退出后自动失效；子进程会继承父进程的文件描述符。
- 与标准 IO 的关联：C 语言标准 IO 的 `FILE*` 文件流，底层封装了对应的文件描述符，可通过 `fileno()` 函数从文件流中获取底层 fd。

## 总目录

1. 文件打开与关闭类 

   - open / close / creat
2. 文件读写类 

   - read / write
3. 文件定位类 

   - lseek
4. 文件同步刷新类 

   - fsync / fdatasync / sync
5. 文件属性查询类 

   - stat / fstat / lstat
6. 文件控制类 

   - fcntl / ioctl
7. 目录操作类 

   - opendir / readdir / closedir
8. 文件管理类 

   - unlink / rename / mkdir / rmdir
9. 错误处理辅助类 

   - perror / strerror

## 核心函数功能与适用场景对比总表


<table v-pre><tbody><tr><td>函数类别</td><td>操作单位</td><td>典型函数</td><td>核心适用场景</td><td>系统调用开销</td><td>缓冲特性</td><td>核心注意事项</td></tr><tr><td>打开关闭类</td><td>建立 / 释放文件描述符</td><td>open / close</td><td>文件操作入口，关联文件与 fd</td><td>一次调用一次内核切换</td><td>不涉及缓冲</td><td>创建文件时必须指定权限 mode；默认打开 3 个标准 fd：0 标准输入、1 标准输出、2 标准错误</td></tr><tr><td>读写类</td><td>字节块</td><td>read / write</td><td>原始数据读写，二进制 / 文本通用</td><td>每次调用都陷入内核</td><td>无用户态缓冲，仅内核有页缓存</td><td>小数据频繁读写性能差；返回值是实际读写字节数，可能小于请求值</td></tr><tr><td>定位类</td><td>字节偏移</td><td>lseek</td><td>随机读写、获取文件大小、文件空洞</td><td>仅操作内核指针，开销极低</td><td>不影响缓冲</td><td>仅对普通文件有效，管道 / 套接字不支持定位</td></tr><tr><td>同步类</td><td>磁盘落盘</td><td>fsync / sync</td><td>强制数据写入物理磁盘，保证持久化</td><td>开销极高，触发磁盘 IO</td><td>刷内核页缓存到磁盘</td><td>日常开发不建议频繁调用，仅关键数据落盘时使用</td></tr><tr><td>属性查询类</td><td>文件元数据</td><td>stat 系列</td><td>获取文件大小、权限、修改时间等信息</td><td>单次系统调用</td><td>不涉及数据缓冲</td><td>三个函数核心区别在于是否跟随符号链接、是否通过 fd 操作</td></tr><tr><td>文件控制类</td><td>文件描述符属性</td><td>fcntl</td><td>修改文件状态、设置非阻塞、加文件锁</td><td>单次系统调用</td><td>不涉及数据缓冲</td><td>功能极多，是文件 IO 的「万能控制函数」</td></tr><tr><td>目录操作类</td><td>目录项</td><td>opendir / readdir</td><td>遍历目录、读取文件名列表</td><td>内部封装多次系统调用</td><td>有内核目录缓存</td><td>读取到末尾和出错都返回 NULL，需配合 errno 区分</td></tr><tr><td>文件管理类</td><td>文件系统操作</td><td>unlink / rename</td><td>删除、重命名、创建 / 删除目录</td><td>单次系统调用</td><td>不涉及数据缓冲</td><td>unlink 是减少硬链接计数，计数为 0 才真正删除文件</td></tr></tbody></table>


## 易混淆高频考点辨析

### open 与 fopen 对比


<table v-pre><tbody><tr><td>对比项</td><td>open（文件 IO）</td><td>fopen（标准 IO）</td></tr><tr><td>标准归属</td><td>POSIX 系统调用</td><td>C 语言标准库函数</td></tr><tr><td>操作句柄</td><td>int 类型文件描述符 fd</td><td>FILE* 类型文件流指针</td></tr><tr><td>用户态缓冲</td><td>无</td><td>有，分全缓冲 / 行缓冲 / 无缓冲</td></tr><tr><td>跨平台性</td><td>仅类 Unix 系统通用</td><td>全平台通用（Windows/Linux/ 嵌入式）</td></tr><tr><td>功能粒度</td><td>仅打开文件，可设置非阻塞、文件锁等高级属性</td><td>封装打开 + 缓冲初始化，使用更便捷</td></tr><tr><td>底层关系</td><td>内核原生接口</td><td>内部调用 open 实现</td></tr></tbody></table>


### lseek 与 fseek 对比


<table v-pre><tbody><tr><td>对比项</td><td>lseek（文件 IO）</td><td>fseek（标准 IO）</td></tr><tr><td>操作对象</td><td>文件描述符 fd</td><td>文件流 FILE*</td></tr><tr><td>偏移类型</td><td>off_t 有符号整型</td><td>long 有符号整型</td></tr><tr><td>基准位置</td><td>SEEK_SET / SEEK_CUR / SEEK_END</td><td>SEEK_SET / SEEK_CUR / SEEK_END</td></tr><tr><td>返回值</td><td>成功返回新的偏移位置（相对于文件开头）</td><td>成功返回 0，失败返回 -1</td></tr><tr><td>缓冲影响</td><td>直接操作内核文件指针</td><td>操作前会先刷新缓冲区</td></tr></tbody></table>


### stat /fstat/lstat 三者区别


<table v-pre><tbody><tr><td>函数</td><td>入参类型</td><td>是否跟随符号链接</td><td>典型使用场景</td></tr><tr><td>stat</td><td>文件路径字符串</td><td>是</td><td>获取目标文件的真实属性</td></tr><tr><td>fstat</td><td>文件描述符 fd</td><td>是</td><td>已打开的文件，无需路径</td></tr><tr><td>lstat</td><td>文件路径字符串</td><td>否</td><td>获取符号链接本身的属性，而非指向的文件</td></tr></tbody></table>


### fsync /fdatasync/sync 区别

表格


<table v-pre><tbody><tr><td>函数</td><td>作用范围</td><td>同步内容</td><td>阻塞特性</td></tr><tr><td>fsync</td><td>单个文件</td><td>文件数据 + 文件元数据（权限、时间等）</td><td>阻塞直到落盘完成</td></tr><tr><td>fdatasync</td><td>单个文件</td><td>仅文件数据，不同步非必要元数据</td><td>阻塞直到落盘完成，性能略好</td></tr><tr><td>sync</td><td>整个系统所有文件缓存</td><td>所有脏页数据 + 元数据</td><td>仅提交刷新请求，不等待完成就返回</td></tr></tbody></table>


### 文件描述符 fd 与 文件流 FILE\* 转换

- `fileno(FILE *stream)`：从标准 IO 流获取底层文件描述符，POSIX 扩展函数
- `fdopen(int fd, const char *mode)`：将已有文件描述符包装为标准 IO 流，POSIX 扩展函数





## 分函数详细说明

### 文件打开与关闭类

> 本类功能：负责建立文件与文件描述符的关联、释放文件描述符资源，是所有文件 IO 操作的入口与出口。程序启动时默认打开 3 个文件描述符：0 (标准输入)、1 (标准输出)、2 (标准错误)。

1.1 **open 函数**


<table v-pre><tbody><tr><td>项目</td><td>说明</td></tr><tr><td>所需头文件</td><td>#include &lt;sys/types.h&gt;<br/>#include &lt;sys/stat.h&gt;<br/>#include &lt;fcntl.h&gt;</td></tr><tr><td>原型</td><td>int open(const char *pathname, int flags);<br/>int open(const char *pathname, int flags, mode_t mode);</td></tr><tr><td>功能</td><td>打开或创建一个文件，返回对应的文件描述符</td></tr><tr><td>参数</td><td>pathname：文件路径（相对 / 绝对路径）<br/>flags：文件打开方式标志，必选一项读写模式：<br/>- O_RDONLY：只读<br/>- O_WRONLY：只写<br/>- O_RDWR：读写可选附加标志<br/>（可位或组合）：<br/>- O_CREAT：文件不存在则创建，此时必须指定 mode 参数<br/>- O_TRUNC：文件存在则清空内容<br/>- O_APPEND：追加写入，每次写都定位到文件末尾<br/>- O_EXCL：配合 O_CREAT 使用，文件已存在则报错，保证原子创建<br/>- O_NONBLOCK：非阻塞模式<br/>mode：新建文件的权限，如 0644，仅 O_CREAT 时有效</td></tr><tr><td>返回值</td><td>成功：返回非负整数文件描述符失败：返回 -1，并设置 errno</td></tr></tbody></table>


1.2 **close 函数**


<table v-pre><tbody><tr><td>项目</td><td>说明</td></tr><tr><td>所需头文件</td><td>#include &lt;unistd.h&gt;</td></tr><tr><td>原型</td><td>int close(int fd);</td></tr><tr><td>功能</td><td>关闭指定的文件描述符，释放关联的内核资源</td></tr><tr><td>参数</td><td>fd：要关闭的文件描述符</td></tr><tr><td>返回值</td><td>成功：返回 0失败：返回 -1，并设置 errno</td></tr></tbody></table>


1.3 creat 函数


<table v-pre><tbody><tr><td>项目</td><td>说明</td><td></td><td></td></tr><tr><td>所需头文件</td><td>#include &lt;sys/types.h&gt;#include &lt;sys/stat.h&gt;#include &lt;fcntl.h&gt;</td><td></td><td></td></tr><tr><td>原型</td><td>int creat(const char *pathname, mode_t mode);</td><td></td><td></td></tr><tr><td>功能</td><td>创建一个新文件并以只写模式打开，等价于 `open (pathname, O_WRONLY</td><td>O_CREAT</td><td>O_TRUNC, mode)`</td></tr><tr><td>参数</td><td>pathname：文件路径mode：新建文件的权限</td><td></td><td></td></tr><tr><td>返回值</td><td>成功：返回文件描述符失败：返回 -1，并设置 errno</td><td></td><td></td></tr></tbody></table>


### 文件读写类

> 本类功能：最核心的读写接口，以字节块为单位进行原始数据传输，不区分文本与二进制，不做任何格式解析。

#### 2.1 read 函数


<table v-pre><tbody><tr><td>项目</td><td>说明</td></tr><tr><td>所需头文件</td><td>#include &lt;unistd.h&gt;</td></tr><tr><td>原型</td><td>ssize_t read(int fd, void *buf, size_t count);</td></tr><tr><td>功能</td><td>从文件描述符 fd 中读取最多 count 字节的数据，存入 buf 指向的缓冲区</td></tr><tr><td>参数</td><td>fd：文件描述符<br/>buf：存储读取数据的缓冲区首地址<br/>count：请求读取的最大字节数</td></tr><tr><td>返回值</td><td>成功：返回实际读取到的字节数（可能小于 count）；<br/>返回 0 表示到达文件末尾 (EOF)失败：返回 -1，并设置 errno</td></tr></tbody></table>


#### 2.2 write 函数


<table v-pre><tbody><tr><td>项目</td><td>说明</td></tr><tr><td>所需头文件</td><td>#include &lt;unistd.h&gt;</td></tr><tr><td>原型</td><td>ssize_t write(int fd, const void *buf, size_t count);</td></tr><tr><td>功能</td><td>将 buf 指向的 count 字节数据写入文件描述符 fd</td></tr><tr><td>参数</td><td>fd：文件描述符<br/>buf：待写入数据的首地址<br/>count：请求写入的字节数</td></tr><tr><td>返回值</td><td>成功：返回实际写入的字节数（可能小于 count）失败：返回 -1，并设置 errno</td></tr></tbody></table>


---

### 文件定位类

> 本类功能：操作内核中的文件读写位置指针，实现随机读写，也可用于获取文件大小、创建文件空洞。

#### 3.1 lseek 函数


<table v-pre><tbody><tr><td>项目</td><td>说明</td></tr><tr><td>所需头文件</td><td>#include &lt;sys/types.h&gt;#include &lt;unistd.h&gt;</td></tr><tr><td>原型</td><td>off_t lseek(int fd, off_t offset, int whence);</td></tr><tr><td>功能</td><td>移动文件读写指针，以 whence 为基准偏移 offset 字节</td></tr><tr><td>参数</td><td>fd：文件描述符<br/>offset：偏移量，正数向后，负数向前<br/>whence：基准位置：<br/>- SEEK_SET：文件开头<br/>- SEEK_CUR：当前位置<br/>- SEEK_END：文件末尾</td></tr><tr><td>返回值</td><td>成功：返回新位置相对于文件开头的偏移字节数失败：返回 -1，并设置 errno</td></tr></tbody></table>


---

### 文件同步刷新类

> 本类功能：强制将内核页缓存中的脏数据写入物理磁盘，保证数据持久化，防止系统掉电丢失数据。日常读写无需手动调用，内核会自动刷盘。

#### 4.1 fsync 函数


<table v-pre><tbody><tr><td>项目</td><td>说明</td></tr><tr><td>所需头文件</td><td>#include &lt;unistd.h&gt;</td></tr><tr><td>原型</td><td>int fsync(int fd);</td></tr><tr><td>功能</td><td>同步单个文件的所有数据和元数据到物理磁盘，阻塞直到落盘完成</td></tr><tr><td>参数</td><td>fd：文件描述符</td></tr><tr><td>返回值</td><td>成功：返回 0失败：返回 -1，并设置 errno</td></tr></tbody></table>


#### 4.2 fdatasync 函数


<table v-pre><tbody><tr><td>项目</td><td>说明</td></tr><tr><td>所需头文件</td><td>#include &lt;unistd.h&gt;</td></tr><tr><td>原型</td><td>int fdatasync(int fd);</td></tr><tr><td>功能</td><td>仅同步文件数据到磁盘，不同步修改时间等非必要元数据，性能优于 fsync</td></tr><tr><td>参数</td><td>fd：文件描述符</td></tr><tr><td>返回值</td><td>成功：返回 0失败：返回 -1，并设置 errno</td></tr></tbody></table>


#### 4.3 sync 函数


<table v-pre><tbody><tr><td>项目</td><td>说明</td></tr><tr><td>所需头文件</td><td>#include &lt;unistd.h&gt;</td></tr><tr><td>原型</td><td>void sync(void);</td></tr><tr><td>功能</td><td>提交所有内核缓冲区的刷新请求，不等待落盘完成就返回</td></tr><tr><td>参数</td><td>无</td></tr><tr><td>返回值</td><td>无返回值</td></tr></tbody></table>


---

### 文件属性查询类

> 本类功能：获取文件的元数据信息，包括大小、权限、所有者、时间戳、inode 号等。

#### 5.1 stat 函数


<table v-pre><tbody><tr><td>项目</td><td>说明</td></tr><tr><td>所需头文件</td><td>#include &lt;sys/types.h&gt;<br/>#include &lt;sys/stat.h&gt;<br/>#include &lt;unistd.h&gt;</td></tr><tr><td>原型</td><td>int stat(const char *pathname, struct stat *buf);</td></tr><tr><td>功能</td><td>根据文件路径获取文件属性，自动跟随符号链接</td></tr><tr><td>参数</td><td>pathname：文件路径buf：存储文件属性的结构体指针</td></tr><tr><td>返回值</td><td>成功：返回 0，属性信息写入 buf失败：返回 -1，并设置 errno</td></tr></tbody></table>


#### 5.2 fstat 函数


<table v-pre><tbody><tr><td>项目</td><td>说明</td></tr><tr><td>所需头文件</td><td>#include &lt;sys/types.h&gt;<br/>#include &lt;sys/stat.h&gt;<br/>#include &lt;unistd.h&gt;</td></tr><tr><td>原型</td><td>int fstat(int fd, struct stat *buf);</td></tr><tr><td>功能</td><td>根据已打开的文件描述符获取文件属性</td></tr><tr><td>参数</td><td>fd：文件描述符<br/>buf：存储文件属性的结构体指针</td></tr><tr><td>返回值</td><td>成功：返回 0失败：返回 -1，并设置 errno</td></tr></tbody></table>


#### 5.3 lstat 函数


<table v-pre><tbody><tr><td>项目</td><td>说明</td></tr><tr><td>所需头文件</td><td>#include &lt;sys/types.h&gt;<br/>#include &lt;sys/stat.h&gt;<br/>#include &lt;unistd.h&gt;</td></tr><tr><td>原型</td><td>int lstat(const char *pathname, struct stat *buf);</td></tr><tr><td>功能</td><td>根据文件路径获取属性，不跟随符号链接，可读取符号链接本身的信息</td></tr><tr><td>参数</td><td>pathname：文件路径buf：存储文件属性的结构体指针</td></tr><tr><td>返回值</td><td>成功：返回 0失败：返回 -1，并设置 errno</td></tr></tbody></table>


---

### 文件控制类

> 本类功能：文件 IO 的万能控制接口，可实现文件描述符复制、状态修改、文件锁等多种高级操作。

#### 6.1 fcntl 函数


<table v-pre><tbody><tr><td>项目</td><td>说明</td></tr><tr><td>所需头文件</td><td>#include &lt;unistd.h&gt;<br/>#include &lt;fcntl.h&gt;</td></tr><tr><td>原型</td><td>int fcntl(int fd, int cmd, ... /* arg */ );</td></tr><tr><td>功能</td><td>对文件描述符执行各种控制操作，具体功能由 cmd 决定</td></tr><tr><td>参数</td><td>fd：文件描述符<br/>cmd：操作命令，常用取值：<br/>- F_DUPFD：复制文件描述符，返回新的 fd<br/>- F_GETFL：获取文件状态标志<br/>- F_SETFL：设置文件状态标志（如 O_NONBLOCK）<br/>- F_GETLK / F_SETLK：获取 / 设置文件锁<br/>arg：可选参数，配合不同 cmd 使用</td></tr><tr><td>返回值</td><td>成功：返回值取决于 cmd，如 F_DUPFD 返回新 fd，F_GETFL 返回状态标志失败：返回 -1，并设置 errno</td></tr></tbody></table>


#### 6.2 ioctl 函数


<table v-pre><tbody><tr><td>项目</td><td>说明</td></tr><tr><td>所需头文件</td><td>#include &lt;sys/ioctl.h&gt;</td></tr><tr><td>原型</td><td>int ioctl(int fd, unsigned long request, ...);</td></tr><tr><td>功能</td><td>设备文件专属控制接口，用于操作特殊设备（终端、网卡、磁盘等）的非标准 IO 功能</td></tr><tr><td>参数</td><td>fd：设备文件描述符request：设备控制命令...：可选参数，配合命令使用</td></tr><tr><td>返回值</td><td>成功：通常返回 0，部分命令返回非负值失败：返回 -1，并设置 errno</td></tr></tbody></table>


---

### 目录操作类

> 本类功能：用于目录的打开、遍历与关闭，底层封装了目录项读取的系统调用。

#### 7.1 opendir 函数


<table v-pre><tbody><tr><td>项目</td><td>说明</td></tr><tr><td>所需头文件</td><td>#include &lt;sys/types.h&gt;<br/>#include &lt;dirent.h&gt;</td></tr><tr><td>原型</td><td>DIR *opendir(const char *name);</td></tr><tr><td>功能</td><td>打开一个目录，返回目录流指针</td></tr><tr><td>参数</td><td>name：目录路径</td></tr><tr><td>返回值</td><td>成功：返回 DIR* 目录流指针失败：返回 NULL，并设置 errno</td></tr></tbody></table>


#### 7.2 readdir 函数


<table v-pre><tbody><tr><td>项目</td><td>说明</td></tr><tr><td>所需头文件</td><td>#include &lt;dirent.h&gt;</td></tr><tr><td>原型</td><td>struct dirent *readdir(DIR *dirp);</td></tr><tr><td>功能</td><td>读取目录流中的下一个目录项，自动后移读取指针</td></tr><tr><td>参数</td><td>dirp：目录流指针</td></tr><tr><td>返回值</td><td>成功：返回目录项结构体指针，包含文件名等信息到达目录末尾：返回 NULL，errno 不变出错：返回 NULL，并设置 errno</td></tr></tbody></table>


#### 7.3 closedir 函数


<table v-pre><tbody><tr><td>项目</td><td>说明</td></tr><tr><td>所需头文件</td><td>#include &lt;sys/types.h&gt;<br/>#include &lt;dirent.h&gt;</td></tr><tr><td>原型</td><td>int closedir(DIR *dirp);</td></tr><tr><td>功能</td><td>关闭目录流，释放相关资源</td></tr><tr><td>参数</td><td>dirp：目录流指针</td></tr><tr><td>返回值</td><td>成功：返回 0失败：返回 -1，并设置 errno</td></tr></tbody></table>


---

### 文件管理类

> 本类功能：直接对文件系统进行操作，包括文件删除、重命名、目录创建与删除。

#### 8.1 unlink 函数


<table v-pre><tbody><tr><td>项目</td><td>说明</td></tr><tr><td>所需头文件</td><td>#include &lt;unistd.h&gt;</td></tr><tr><td>原型</td><td>int unlink(const char *pathname);</td></tr><tr><td>功能</td><td>删除文件的一个硬链接，硬链接计数减 1；计数为 0 且无进程打开时，真正释放磁盘空间</td></tr><tr><td>参数</td><td>pathname：文件路径</td></tr><tr><td>返回值</td><td>成功：返回 0失败：返回 -1，并设置 errno</td></tr></tbody></table>


#### 8.2 rename 函数


<table v-pre><tbody><tr><td>项目</td><td>说明</td></tr><tr><td>所需头文件</td><td>#include &lt;stdio.h&gt;</td></tr><tr><td>原型</td><td>int rename(const char *oldpath, const char *newpath);</td></tr><tr><td>功能</td><td>重命名或移动文件 / 目录，同文件系统内为原子操作</td></tr><tr><td>参数</td><td>oldpath：原路径newpath：目标路径</td></tr><tr><td>返回值</td><td>成功：返回 0失败：返回 -1，并设置 errno</td></tr></tbody></table>


#### 8.3 mkdir 函数


<table v-pre><tbody><tr><td>项目</td><td>说明</td></tr><tr><td>所需头文件</td><td>#include &lt;sys/stat.h&gt;<br/>#include &lt;sys/types.h&gt;</td></tr><tr><td>原型</td><td>int mkdir(const char *pathname, mode_t mode);</td></tr><tr><td>功能</td><td>创建一个新的空目录</td></tr><tr><td>参数</td><td>pathname：目录路径mode：目录权限，如 0755</td></tr><tr><td>返回值</td><td>成功：返回 0失败：返回 -1，并设置 errno</td></tr></tbody></table>


#### 8.4 rmdir 函数


<table v-pre><tbody><tr><td>项目</td><td>说明</td></tr><tr><td>所需头文件</td><td>#include &lt;unistd.h&gt;</td></tr><tr><td>原型</td><td>int rmdir(const char *pathname);</td></tr><tr><td>功能</td><td>删除一个空目录，目录非空则删除失败</td></tr><tr><td>参数</td><td>pathname：目录路径</td></tr><tr><td>返回值</td><td>成功：返回 0失败：返回 -1，并设置 errno</td></tr></tbody></table>


---

### 错误处理辅助类

> 本类功能：配合系统调用的 errno 错误码使用，将错误码转换为人类可读的错误描述。

#### 9.1 perror 函数


<table v-pre><tbody><tr><td>项目</td><td>说明</td></tr><tr><td>所需头文件</td><td>#include &lt;stdio.h&gt;</td></tr><tr><td>原型</td><td>void perror(const char *s);</td></tr><tr><td>功能</td><td>先输出自定义字符串 s，再输出冒号和当前 errno 对应的错误描述，输出到标准错误 stderr</td></tr><tr><td>参数</td><td>s：自定义错误前缀，可为 NULL</td></tr><tr><td>返回值</td><td>无返回值</td></tr></tbody></table>


#### 9.2 strerror 函数


<table v-pre><tbody><tr><td>项目</td><td>说明</td></tr><tr><td>所需头文件</td><td>#include &lt;string.h&gt;</td></tr><tr><td>原型</td><td>char *strerror(int errnum);</td></tr><tr><td>功能</td><td>将错误码 errnum 转换为对应的错误描述字符串</td></tr><tr><td>参数</td><td>errnum：错误码，通常传入全局变量 errno</td></tr><tr><td>返回值</td><td>返回错误描述字符串的首地址</td></tr></tbody></table>


# 标准IO（stdio）和文件IO（系统调用）全对比

标准 IO（Standard I/O）是 C 语言标准库提供的高层封装，核心特性是自带用户态缓冲区；文件 IO（File I/O，即系统调用 IO）是 Linux/POSIX （可移植操作系统接口）提供的内核级接口，直接操作文件描述符，无用户态缓冲。两者是「封装层」与「底层实现」的关系：标准 IO 内部最终都会调用文件 IO 的系统调用。

## 核心维度对比总表


<table v-pre><tbody><tr><td>对比维度</td><td>标准 IO（stdio 库）</td><td>文件 IO（系统调用）</td></tr><tr><td>本质归属</td><td>C 语言标准库函数，运行在用户态，是对系统调用的二次封装</td><td>Linux 内核提供的系统调用，直接陷入内核执行，属于 POSIX 标准接口</td></tr><tr><td>缓冲机制</td><td>自带用户态缓冲区，分三种模式：<br/>- 全缓冲（普通文件）<br/>- 行缓冲（标准输出 stdout）<br/>- 无缓冲（标准错误 stderr）</td><td>无用户态缓冲区，数据直接传递给内核；内核自身有页缓存（Page Cache），不属于调用者可控的缓冲</td></tr><tr><td>操作句柄</td><td>FILE * 文件流指针（结构体指针，包含文件描述符、缓冲区、状态标志等信息）</td><td>int 类型的文件描述符 fd（非负整数，内核中文件表的索引）</td></tr><tr><td>核心函数</td><td>打开：fopen / freopen<br/>读写：fgetc / fgets / fread / fwrite / printf <br/>系列定位：fseek / ftell / rewind<br/>关闭：fclose</td><td>打开：open / creat<br/>读写：read / write<br/>定位：lseek<br/>关闭：close</td></tr><tr><td>跨平台性</td><td>完全跨平台，所有符合 C 标准的系统（Windows、Linux、嵌入式）均可用</td><td>遵循 POSIX 标准，类 Unix 系统（Linux、macOS）通用；Windows 不兼容原生接口</td></tr><tr><td>系统调用次数</td><td>少：缓冲区攒满才触发一次系统调用，大幅减少用户态 / 内核态切换开销</td><td>多：每次调用都直接陷入内核，频繁小数据读写时切换开销极高</td></tr><tr><td>执行效率</td><td>小批量、逐字节 / 逐行读写时效率远高于系统调用；<br/>大批量读写时性能接近</td><td>小数据读写效率低；<br/>大块数据顺序读写性能与标准 IO 相当，甚至更优</td></tr><tr><td>操作粒度</td><td>封装度高，支持字符、行、块、格式化多种读写粒度，使用便捷</td><td>粒度单一，仅支持按字节块读写，所有逻辑需自行实现</td></tr><tr><td>错误处理</td><td>通过 feof / ferror 区分文件结束与 IO 错误；<br/>返回值多为状态码 / 数据量</td><td>出错返回 -1，并设置全局 errno；<br/>需自行判断返回值区分异常场景</td></tr><tr><td>原子性与并发</td><td>非原子操作，多进程 / 线程并发写可能出现数据穿插；<br/>部分平台加锁保证线程安全</td><td>write 等调用在特定条件下具备原子性；可通过 fcntl 加文件锁实现并发控制</td></tr><tr><td>大文件支持</td><td>默认 long 型偏移，32 位系统有 2GB 限制；需 fgetpos / fsetpos 支持大文件</td><td>可通过 O_LARGEFILE 标志直接支持超大文件，64 位系统无天然限制</td></tr><tr><td>典型适用场景</td><td>文本处理、格式化输出、普通文件读写、跨平台程序、日常业务开发</td><td>底层系统开发、驱动交互、网络套接字操作、需要精细控制 IO 行为的场景、对性能极致要求的大块数据传输</td></tr></tbody></table>


## 核心功能函数一一对应表


<table v-pre><tbody><tr><td>功能描述</td><td>标准 IO 函数</td><td>文件 IO 系统调用</td></tr><tr><td>打开文件</td><td>fopen</td><td>open</td></tr><tr><td>关闭文件</td><td>fclose</td><td>close</td></tr><tr><td>读取数据</td><td>fread</td><td>read</td></tr><tr><td>写入数据</td><td>fwrite</td><td>write</td></tr><tr><td>移动读写指针</td><td>fseek</td><td>lseek</td></tr><tr><td>获取当前偏移</td><td>ftell</td><td>lseek(..., SEEK_CUR)</td></tr><tr><td>重置指针到开头</td><td>rewind</td><td>lseek(fd, 0, SEEK_SET)</td></tr><tr><td>刷新缓冲区</td><td>fflush（仅刷用户态缓冲到内核）</td><td>fsync / fdatasync（强制刷内核缓存到磁盘）</td></tr></tbody></table>


##  关键易混淆点辨析

#### 用户态缓冲 ≠ 内核页缓存

很多人误以为 “文件 IO 没有缓冲”，这个说法不准确：

- 标准 IO 的缓冲在用户空间，由 stdio 库管理，目的是减少系统调用的次数；
- 文件 IO 没有用户态缓冲，但 Linux 内核会通过页缓存（Page Cache） 缓存磁盘数据，目的是减少磁盘 IO 次数；
- `fflush` 只是把标准 IO 缓冲区的数据写到内核页缓存，并没有真正落盘；要强制写入物理磁盘，需要调用 `fsync` 系统调用。

#### 行缓冲的换行触发特性

标准 IO 的 `stdout` 默认是行缓冲，只有遇到换行符 `\n`、缓冲区满、或者手动 `fflush` 时才会真正输出；而文件 IO 的 `write` 会直接把数据交给内核，不存在换行触发的逻辑。这也是为什么有时候 `printf` 不加 `\n` 会迟迟不打印内容的根本原因。

#### 返回值的差异

- `fread` 返回值是「成功读取的项数」，单位由 `size` 参数决定，无法直接表示字节数（除非 size=1）；
- `read` 返回值是 `ssize_t` 类型，直接表示成功读取的字节数，出错返回 -1，读到文件尾返回 0。

---

##  选型建议

**优先使用标准 IO 的场景：**

1. 开发跨平台程序，需要兼容 Windows 和 Linux；
2. 处理文本文件、配置文件、日志，需要按行读写或格式化输出；
3. 小数据量频繁读写，利用缓冲区减少系统调用开销；
4. 普通业务逻辑开发，追求代码简洁和可维护性。

**优先使用文件 IO（系统调用）的场景：**

1. 底层系统编程、驱动开发、网络编程（套接字只能用文件 IO 操作）；
2. 需要精细控制 IO 行为，比如文件锁、非阻塞 IO、原子写入；
3. 超大文件、特殊设备文件操作；
4. 对性能极致敏感的大块数据顺序读写，省去用户态缓冲区的一次内存拷贝

# 库的制作

库文件是Linux C/C++开发核心基础，也是面试、实操高频考点，程序开发本质就是**调用系统库 + 自定义库 + 自研代码**的过程。本章整合全套库原理、制作流程、实操命令、区别对比、报错解决方案，零基础可直接上手。

## 12.1 库文件核心基础认知

### 12.1.1 库的定义与本质

库文件是**一组预先编译好的二进制函数、类、数据的集合**，以独立文件形式存在，专门用于被其他程序调用。

本质：**封装好的可复用二进制代码**，无需重复编译，是代码复用、工程模块化的核心方案。

### 12.1.2 库的核心作用

- **提升开发效率**：通用功能（加减、读写、网络、算法）无需重复编写，直接调用库接口。
- **简化代码维护**：功能统一封装，升级、修复Bug只需更新库文件，无需修改所有调用程序。
- **保护核心源码**：库仅对外暴露调用接口，隐藏底层实现细节，有效保护商业核心代码。
- **减小工程体积**：公共代码统一复用，避免大量冗余重复代码。

### 12.1.3 库的跨平台特性

库文件**不支持跨平台通用**，不同系统指令集、二进制格式、系统调用不同，完全不兼容：

- Linux库（.a/.so）无法在Windows/Mac运行
- Windows库（.dll）无法在Linux/Mac运行

### 12.1.4 Linux库命名规范

所有Linux标准库统一遵循 **lib+库名+后缀** 格式：

- **静态库**：`libxxx.a`（例：libmyadd.a、libtest.a）
- **动态库**：`libxxx.so`
- **动态库版本扩展**：`libxxx.so.x.y.z`x（主版本号）：接口不兼容旧版本，升级后需重新适配程序
- y（次版本号）：兼容旧版本，新增功能不改动原有接口
- z（发行版本号）：纯Bug修复，无功能、接口变动

## 12.2 静态库（.a）完全精讲

### 12.2.1 静态库核心原理

静态库链接发生在**编译链接阶段**，编译器会将静态库中的核心代码**完整复制拷贝**到最终可执行文件中。

编译完成后，可执行文件与静态库彻底绑定，**运行阶段不再依赖原静态库文件**。

### 12.2.2 静态库核心特点

- **独立性强**：程序编译完成后，可独立运行，无需外部库依赖
- **运行效率高**：代码直接嵌入程序，运行时无需加载外部文件
- **程序体积大**：库代码全部拷贝进可执行文件，文件体积膨胀
- **维护成本高**：静态库更新后，**必须重新编译链接**所有依赖程序

### 12.2.3 跨平台静态库后缀

- Linux / Mac：`.a`
- Windows：`.lib`

### 12.2.4 静态库完整制作+使用实操流程

整体流程：

编写源码 → 编译生成目标文件(.o) → ar工具打包静态库 → 链接库编译主程序

```text
# 步骤1：编写功能源码 add.c
# 示例：实现加法功能
int add(int a, int b)
{
    return a + b;
}

# 步骤2：只编译不链接，生成目标文件 .o
gcc -c add.c -o add.o

# 步骤3：ar工具打包生成静态库 libmyadd.a
# 参数-c：创建归档库  -r：替换/追加目标文件
ar -cr libmyadd.a add.o

# 步骤4：编写主程序 main.c 调用库函数
#include <stdio.h>
int add(int a, int b);
int main()
{
    printf("%d\n",add(10,20));
    return 0;
}

# 步骤5：编译主程序并链接静态库
# -L：指定库所在路径  -l：指定库名（省略lib和.a）
gcc main.c  -lmyadd -L. -o main_static

# 步骤6：运行程序（无需依赖任何库文件）
./main_static
```

### 12.2.5 静态库核心命令参数速查表

| 工具 | 参数 | 功能说明 | 示例命令 |
|-|-|-|-|
| gcc | -c | 只编译、不链接，生成.o目标文件 | gcc -c add.c -o add.o |
| gcc | -o | 指定输出文件名称 | gcc main.c -o main |
| gcc | -L | 指定库文件搜索路径 | gcc main.c -L./lib |
| gcc | -l | 指定库名（省略lib、后缀） | gcc main.c -lmyadd |
| ar | -c | 创建新的静态库归档文件 | ar -cr libmyadd.a add.o |
| ar | -r | 追加/替换库中的目标文件 | ar -cr libmyadd.a add.o |

## 12.3 动态库（.so）完全精讲

### 12.3.1 动态库核心原理

动态库又称**共享库**，编译阶段仅记录依赖关系，**不拷贝库代码**；在程序**运行阶段**才动态加载库文件到内存，支持多程序共享同一份库。

### 12.3.2 动态库核心特点

- **运行依赖**：程序运行必须依赖对应动态库文件，缺失则程序无法启动
- **程序体积小**：不拷贝库代码，可执行文件轻量化
- **节省内存**：多个程序可共享内存中同一份动态库，无多副本冗余
- **维护灵活**：仅更新动态库文件，**无需重新编译程序**（接口不变即可）

### 12.3.3 跨平台动态库后缀

- Linux：`.so`
- Windows：`.dll`
- Mac：`.dylib`

### 12.3.4 动态库完整制作+使用实操流程

整体流程：编写源码 → 生成位置无关代码(.o) → 链接生成.so动态库 → 编译主程序 → 配置库路径运行

```text
# 步骤1：同样使用 add.c 源码
# 步骤2：生成位置无关代码 PIC（动态库必需参数）
gcc -c -fPIC add.c -o add.o

# 步骤3：-shared 生成动态库
gcc -shared add.o -o libmyadd.so

# 步骤4：编译主程序，链接动态库
gcc main.c -lmyadd -L. -o main_dynamic

# 步骤5：配置动态库路径（三种方式任选其一）
# 方式1：临时环境变量（当前终端生效）
export LD_LIBRARY_PATH=$PWD

# 方式2：系统配置文件（永久生效）
sudo vim /etc/ld.so.conf
# 文件末尾添加库所在绝对路径
sudo ldconfig  # 更新系统动态库缓存

# 方式3：放入系统默认库目录
sudo cp libmyadd.so /usr/local/lib
sudo ldconfig

# 步骤6：运行程序
./main_dynamic
```

### 12.3.5 动态库核心命令参数速查表

| 阶段 | 参数/命令 | 功能说明 |
|-|-|-|
| 编译 | -fPIC | 生成位置无关代码，适配动态库内存任意加载 |
| 链接 | -shared | 核心参数，将.o打包为.so动态库 |
| 编译链接 | -L / -l | 指定库路径、库名，用法同静态库 |
| 系统配置 | ldconfig | 更新系统动态库缓存，识别新库 |
| 临时生效 | LD_LIBRARY_PATH | 临时指定动态库搜索路径 |

## 12.4 静态库 & 动态库 终极对比（面试必考）

| 对比维度 | 静态库(.a) | 动态库(.so) |
|-|-|-|
| 链接时机 | 编译链接阶段 | 程序运行阶段 |
| 可执行文件体积 | 大（库代码完全拷贝） | 小（仅记录依赖） |
| 内存占用 | 高，多程序多副本，冗余严重 | 低，多程序共享单副本 |
| 运行依赖 | 无依赖，独立运行 | 强依赖库文件，缺库报错 |
| 更新维护 | 更新库后必须重新编译程序 | 替换库即可，无需重编译 |
| 运行速度 | 更快（无动态加载过程） | 略慢（运行时加载库） |
| 适用场景 | 追求独立、启动快、库不常更新 | 库频繁迭代、多程序共享、控体积 |

## 12.5 库制作高频报错 & 终极解决方案

### 问题1：静态库链接报错：未定义的引用

**报错原因**：库路径填写错误、库名拼写错误、库中无对应函数实现、编译顺序错误。

**解决方案**：

- 核对 `-L` 库路径、`-l` 库名是否正确
- 确认静态库中已实现对应函数
- 编译规则：**源码在前，库在后**

### 问题2：动态库运行报错：error while loading shared libraries

**报错原因**：系统无法检索到.so动态库，未配置库搜索路径、未更新缓存。

**解决方案**：

- 临时方案：设置 `LD_LIBRARY_PATH`=\$PWD 环境变量
- 永久方案：写入 `/etc/ld.so.conf` 并执行 `sudo ldconfig`
- 极简方案：将库放入 mv 动态库 `/usr/local/lib` 并更新缓存

### 问题3：动态库版本冲突

**报错原因**：程序依赖的库版本与系统现有库版本不兼容（主版本号不一致）。

**解决方案**：

- 安装程序适配的指定版本动态库
- 重新编译程序，适配系统当前库版本

## 12.6 面试高频真题（背诵版）

**Q1：静态库和动态库的核心区别？**

答：静态库编译时链接拷贝代码，程序独立、体积大、更新需重编译；动态库运行时动态加载，多程序共享、体积小、维护灵活、运行依赖库文件。

**Q2：动态库为什么必须加 -fPIC 参数？**

答：-fPIC 生成**位置无关代码**，让动态库可以被加载到内存任意地址运行，是Linux动态库的强制要求。

**Q3：动态库编译成功但运行找不到库是什么原因？**

答：编译时通过-L指定路径可找到库，但运行时依赖系统动态库检索路径，未配置环境变量/系统配置，导致无法加载，配置LD_LIBRARY_PATH或ldconfig更新缓存即可。

**Q4：动态库更新后需要重新编译程序吗？**

答：接口不变无需重编译，直接替换库文件即可；主版本号变更、接口改动则需要重新编译适配。

## 12.7 核心命令速记清单（考场/工作直接用）

```text
# 静态库一条龙
gcc -c xxx.c -o xxx.o
ar -cr libxxx.a xxx.o
gcc main.c -L路径 -l库名 -o 可执行文件

# 动态库一条龙
gcc -c -fPIC xxx.c -o xxx.o
gcc -shared xxx.o -o libxxx.so
export LD_LIBRARY_PATH=$PWD
gcc main.c -L路径 -l库名 -o 可执行文件
```

```c
#include <stdio.h>
#include <unistd.h>

int main(int argc,const char *argv[])
{
    //检查参数是否合法
    if(argc != 3)
    {
        printf("参数不符合要求\n");
        printf("usge:/a.out src.c ret.c\n");
        return -1;
    }
    //以读的当时打开源文件
    int src_fd = 0;
    if(-1 == (src_fd = open(argv[1], "O_RDONLY")))
    {
        perror("文件打开失败");
        return -1;
    }
    printf("文件打开成功");
    //以写的方式打开目标文件
    int ret_fd = 0;
    if(-1 == (ret_fd = open(argv[2], "O_WRONLY")))
    {
        perror("文件打开失败");
        return -1;
    }
    printf("文件打开成功");
    
    //使用read读取源文件
    char buf[BUFSIZE] = {0};
    ssize_t src_read = 0;
    ssize_t ret_write = 0;
    //循环读取和写入read和write
    while(src_read = read(src_fd,buf,sizeof(buf)))
    {
        ret_write=write(ret_fd,buf,src_read);
        if(ret_write == -1)
            {
                perror("写入目标文件失败");
                return -1;
            }
        //检查写入的字节数与读取的字节数是否一致
            if(src_read != ret_write)
            {
                printf("写入的字节数与读取的字节数不一致\n");
                return -1;
            }
    }
    write()
    //关闭源文件/目标文件
    return 0;
}
```
