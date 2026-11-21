# 嵌入式Linux开发环境搭建

[飞书原文](https://hcn4ticlccda.feishu.cn/docx/JxoZdmNr1oVPJ4xe7DycJ8SknHe)

::: tip

本笔记基于华清远见《环境搭建手册——基于嵌入式Linux虚拟仿真 V1.0》整理。不是抄操作步骤，而是讲清**每一步在干什么、为什么这么干、出问题怎么查**。原始手册 166 页，本笔记只留技术核心。

:::


# 先搞懂：这套环境到底是什么

在动手点"下一步"之前，必须先建立一张全景图。你后面遇到的所有网络不通、编译不过、串口没输出，本质都是这张图里某一段没接上。

## 三层结构

| 层 | 是什么 | 在这套环境里对应什么 |
|-|-|-|
| **你的 Windows PC** | 宿主机 Host，跑 VMware | Windows 上装：VMware Workstation、虚拟仿真本地服务、VS Code、Xshell |
| **Ubuntu 虚拟机** | 开发机，x86 架构，用来写代码、编译 | VMware 里跑 Ubuntu 24.04，装交叉编译器、VS Code/Trae、bear/clangd |
| **i.MX6ULL 仿真板** | 目标机 Target，ARM 架构，跑 Linux | "虚拟仿真本地服务"软件里虚拟出来的 FS-6ULL，和真板行为一致 |

## 为什么要搞这么复杂

一句话：**目标机（i.MX6ULL）太弱，跑不动编译器；宿主机（PC）太强，不能直接跑 ARM 程序。**所以中间用 Ubuntu 当"翻译官"——在 Ubuntu 上用 ARM 交叉编译器把代码编成 ARM 二进制，再丢给仿真板跑。

这就是后面反复出现的两个概念：

- **宿主机（Host）**：x86 PC，编译代码的地方
- **目标机（Target）**：ARM i.MX6ULL，运行代码的地方

# 需要装哪些软件

按安装顺序列，每个都写清楚为什么需要。

| 软件 | 装在哪 | 为什么需要 |
|-|-|-|
| 嵌入式Linux虚拟仿真本地服务 | Windows | 华清远见自研，在 PC 上虚拟出一颗 i.MX6ULL CPU，支持加载 U-Boot/内核镜像、GDB 调试。这是整个仿真的核心。 |
| VMware Workstation | Windows | 跑 Ubuntu 虚拟机。用 Player（免费）或 Pro 都行。 |
| Ubuntu 24.04 | VMware 里 | 开发机。直接用机构提供的 `ubuntu-24.04-64bit_farsight.rar` 镜像，别自己装。 |
| Xshell | Windows | SSH 连 Ubuntu，或串口连仿真板。可选，VS Code Remote-SSH 能替代一部分。 |
| VS Code 或 Trae | Windows + Ubuntu | 写代码。Trae 是带 AI 的 VS Code fork。 |
| 交叉编译工具链 | Ubuntu /opt | arm-fs6ull-linux-gnueabihf-gcc，把 x86 代码编成 ARM 二进制。 |

# VMware 网络：三种模式必须搞懂

这是环境搭建里**最容易踩坑、也最值得理解**的部分。后面网络不通，90% 是这里没配对。

| 模式 | 原理 | 谁能 ping 通谁 | 本课程用途 |
|-|-|-|-|
| **桥接 Bridge** | 虚拟机像一台独立电脑，直接接到物理网卡上 | 虚拟机 ↔ 局域网其他机器 | 上网、和真板通信。IP 随路由器 DHCP 变。 |
| **NAT** | 虚拟机共享 Windows 的 IP 上网 | 虚拟机 → 外网；Windows → 虚拟机（默认不通） | 虚拟机上网装包用。 |
| **仅主机 Host-Only** | Windows 和虚拟机组成一个封闭小网 | Windows ↔ 虚拟机（固定 IP） | Windows 用 VS Code Remote-SSH 连 Ubuntu。IP 固定不变。 |


::: tip

**为什么要同时配桥接 + Host-Only 两张网卡？**
桥接网卡用来上网和连真板，但 IP 会随外部网络变；Host-Only 网卡 IP 固定（192.168.20.x），Windows 永远能通过这个 IP SSH 到 Ubuntu。两张网卡各司其职。

:::


## 具体配置

**第一步：给 Host-Only 网卡设静态 IP（Windows 端）**

- 控制面板 → 网络连接 → `VMware Network Adapter VMnet1` → 属性 → IPv4
- IP：`192.168.20.1`，子网掩码：`255.255.255.0`

**第二步：虚拟机加两张网卡**

- 网卡1：桥接模式（上网用）
- 网卡2：仅主机模式（VMnet1，固定 IP 用）

**第三步：Ubuntu 里给 Host-Only 网卡设静态 IP**

编辑 netplan 配置：

```bash
sudo vi /etc/netplan/01-network-manager-all.yaml

# 找到 ens33（桥接，DHCP 自动获取）和 ens38（仅主机，静态 IP）
# ens38 配成：
ens38:
  dhcp4: false
  addresses:
    - 192.168.20.17/24

sudo netplan apply

```

配完后 Windows 上 `ping 192.168.20.17` 能通，VS Code Remote-SSH 就能连了。

# Ubuntu 镜像使用要点

直接用机构提供的 `ubuntu-24.04-64bit_farsight.rar`，不要自己装。解压后用 VMware"打开虚拟机"选 `.vmx` 文件。

## 关键配置

- **内存/CPU**：根据你笔记本配置调，建议 2 核 / 4GB。你 12GB 内存分 4GB 给虚拟机刚好。
- **共享文件夹**：虚拟机设置 → 选项 → 共享文件夹 → 启用，选 Windows 上一个目录（比如 `D:\linux_share`）。Ubuntu 里访问路径是 `/mnt/hgfs/linux_share/`。这是 Windows 和 Ubuntu 传文件的主通道。
- **关闭 3D 加速**：虚拟机设置里别勾"加速3D图形"，否则卡成 PPT。
- **第一次启动选"我已复制该虚拟机"**，不是"我已移动"。
- **登录密码是 `1`**。


::: tip

**中文输入法**：系统语言改中文后，装 fcitx：`sudo apt install fcitx-bin fcitx-table`，然后在"语言支持"里把键盘输入法系统改成 Fcitx，重启后 Ctrl+空格切换。家目录文件夹名保持英文，别改成中文，否则后面命令行路径全是坑。

:::


# 交叉编译工具链配置

这是整个环境里**最关键的一步**。配不好，后面所有编译都报错。

## 是什么

交叉编译器是一个跑在 x86 Ubuntu 上、但能生成 ARM 二进制的 gcc。它的名字很长：`arm-fs6ull-linux-gnueabihf-gcc`。拆解一下：

- `arm`：目标架构是 ARM
- `fs6ull`：华清远见 FS-6ULL 板子定制
- `linux`：目标系统是 Linux（不是裸机）
- `gnueabihf`：GNU EABI + 硬件浮点

## 配置步骤

```bash
# 1. 工具链压缩包先放到 Windows 共享文件夹里
#    然后在 Ubuntu 里：

# 2. 拷贝到 /opt（系统级目录，所有用户可用）
sudo cp /mnt/hgfs/linux_share/arm-fs6ull-linux-gnueabihf_sdk-buildroot.tar.gz /opt/

# 3. 解压
cd /opt
sudo tar -vxf arm-fs6ull-linux-gnueabihf_sdk-buildroot.tar.gz

# 4. 把 bin 目录加到 PATH（永久生效）
#    编辑 ~/.bashrc，最后一行加：
export PATH=$PATH:/opt/arm-fs6ull-linux-gnueabihf_sdk-buildroot/bin/

# 5. 生效
source ~/.bashrc

# 6. 验证
arm-fs6ull-linux-gnueabihf-gcc -v
# 看到 gcc version 信息就成功了

```

## PATH 临时 vs 永久的区别

| 方式 | 做法 | 生效范围 |
|-|-|-|
| **临时** | 终端里直接 `export PATH=...` | 只对当前这个终端窗口有效，关了就没 |
| **永久** | 写进 `~/.bashrc`，再 `source` | 以后每次开终端都自动生效 |

**为什么是 .bashrc？**它是 bash 每次启动时自动执行的脚本。把 PATH 写在这里，等于每次开终端都自动 export 一遍。

# VS Code / Trae 配置

## Ubuntu 端必装的两个命令行工具

```bash
sudo apt update
sudo apt install -y bear clangd-19

```

**为什么需要这两个？**

- `bear`：编译时拦截 gcc 命令，生成 `compile_commands.json`。clangd 靠这个文件知道每个 .c 文件用了哪些头文件路径、宏定义，才能做代码跳转和补全。没有它，clangd 就是瞎猜。
- `clangd-19`：比微软 C/C++ 插件快得多的代码索引引擎。

## VS Code 必装插件

| 插件 | 干什么用 |
|-|-|
| Chinese (Simplified) | 汉化界面 |
| C/C++（微软） | 基础 C/C++ 支持，但代码跳转要禁用，和 clangd 冲突 |
| clangd | 真正的代码补全/跳转引擎。设置里 clangd:Path 填 `/usr/bin/clangd-19` |
| Arm Assembly | 写 ARM 汇编时语法高亮 |
| Cortex-Debug | 调试 ARM Cortex-A 程序 |
| MemoryView | 调试时可视化看内存 |
| Remote-SSH | Windows 上 VS Code 远程连 Ubuntu 用（只在 Windows 端装） |


::: tip

**坑：clangd 和微软 C/C++ 插件冲突**。装了 clangd 后，要在扩展设置里把微软 C/C++ 插件的"IntelliSense"改成 `disabled`，否则两个引擎同时抢，代码跳转时灵时不灵。

:::


## Windows 远程连 Ubuntu（推荐）

直接在 Ubuntu 虚拟机里开 VS Code 会卡（虚拟机渲染窗口慢）。推荐方式：

1. Windows 装 VS Code + Remote-SSH 插件
2. 点"远程资源管理器" → 添加主机 → 输入 `linux@192.168.20.17`（就是 Host-Only 网卡那个固定 IP）
3. 密码 `1`
4. 连上后，代码文件实际在 Ubuntu 上，但界面操作跟在 Windows 本地一样快

# 虚拟仿真网络配置（TAP0 / VMnet2）

这是最后一步，也是最绕的一步。目的：**让 Ubuntu 虚拟机里的代码能通过网络下载到 i.MX6ULL 仿真板上**（后面 TFTP/NFS 全靠它）。

## 拓扑

虚拟仿真本地服务软件内部也跑了一个虚拟机（就是那台 i.MX6ULL）。它和你的 Ubuntu 开发机之间，通过 Windows 上的一张虚拟网卡 `VMnet2` 通信：

```text
Ubuntu 虚拟机 (192.168.137.240)
    ↕  通过 VMnet2 虚拟网卡
i.MX6ULL 仿真板 (192.168.137.x)

```

## 配置步骤

1. Windows 上打开"网络连接"，确认 `VMware Network Adapter VMnet2` 存在（装虚拟仿真软件时会创建）
2. VMware 虚拟机设置 → 添加第三张网卡 → 选"自定义" → 选 `VMnet2`
3. Ubuntu 里 `ifconfig` 看新网卡名（一般是 `ens38`）
4. 给 ens38 设静态 IP：`192.168.137.240/24`

```bash
sudo vi /etc/netplan/01-network-manager-all.yaml

# 在 ens33/ens38 下面再加一段：
ens39:
  dhcp4: false
  addresses:
    - 192.168.137.240/24

sudo netplan apply

```


::: tip

**关键：这个网络只有虚拟仿真本地服务开着时才通。**仿真软件一关，VMnet2 就断了，Ubuntu ping 不通仿真板。以后遇到"为什么 TFTP 传不上去"，先看仿真软件是不是开着。

:::


# 验收清单

环境装完后，按这个顺序逐条验证。全过了再开始学后面的内容。

- [ ] Windows 能打开"嵌入式Linux虚拟仿真本地服务"，能启动 FS-6ULL

- [ ] Ubuntu 虚拟机正常启动，密码 `1` 能登录

- [ ] Windows 上 `ping 192.168.20.17` 通（Host-Only）

- [ ] Windows VS Code 通过 Remote-SSH 连上 Ubuntu

- [ ] Ubuntu 终端跑 `arm-fs6ull-linux-gnueabihf-gcc -v` 能看到版本信息

- [ ] Ubuntu 里 `ls /mnt/hgfs/linux_share/` 能看到 Windows 共享文件夹内容

- [ ] 仿真板启动后，Ubuntu 里 `ping 192.168.137.x` 通（第三张网卡）

# 常见坑速查

| 症状 | 排查方向 |
|-|-|
| VS Code Remote-SSH 连不上 Ubuntu | 先 Windows ping 192.168.20.17；不通就查 Host-Only 网卡是不是 VMnet1、Ubuntu 里 ens38 静态 IP 对不对 |
| 换了终端 arm-gcc 就找不到 | PATH 只 export 了没写进 .bashrc。重新 `source ~/.bashrc` 或开新终端验证 |
| 代码跳转失效/补全全红 | 没跑 bear 生成 compile_commands.json，或 clangd path 没配，或和微软 C/C++ 插件冲突 |
| TFTP 传不到仿真板 | 先看仿真软件开没开；再 Ubuntu ping 仿真板 IP；再查 VMnet2 网卡和 ens39 的 192.168.137.240 |
| Ubuntu 里共享文件夹是空的 | VMware 里共享文件夹没启用，或没选"总是启用"。路径一定是 /mnt/hgfs/linux_share/ |
| 虚拟机特别卡 | 3D 加速没关；内存分太少（至少 4GB）；Windows 本身内存不够（你 12GB，别分超 4GB） |

---

**下一步**：环境通了之后，进模块 03（Linux 基础与应用）——学 shell 命令、gcc、Makefile，这些是后面写驱动和编译内核的基本功。
