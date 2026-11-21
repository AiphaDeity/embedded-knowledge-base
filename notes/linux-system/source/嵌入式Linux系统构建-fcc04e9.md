# 嵌入式Linux系统构建

[飞书原文](https://hcn4ticlccda.feishu.cn/docx/WAtedPMmyoTmHixAzpuc5Xr9nSb)

::: tip

本篇讲嵌入式Linux系统的完整组成：BootROM→U-Boot→Kernel→RootFS，以及如何编译和烧写启动。

:::


# 嵌入式Linux系统基本构成

## 系统组成

**嵌入式Linux系统**：由引导程序、内核、根文件系统三部分组成，上电后按顺序依次执行。

| 组件 | 作用 |
|-|-|
| **BootROM** | 芯片内置的固化程序，上电最先执行，负责初始化DDR、加载U-Boot |
| **U-Boot** | 引导加载程序，初始化硬件、加载Linux内核到内存、启动内核 |
| **Linux Kernel** | 操作系统内核，管理进程、内存、设备驱动 |
| **RootFS** | 根文件系统，存放库、应用程序、配置文件，内核启动后挂载 |

# 系统源码编译

## U-Boot编译

**U-Boot（Universal Boot Loader）**：开源引导加载程序，支持多种架构和外设，是嵌入式Linux最常用的Bootloader。

```bash
# 配置
make ARCH=arm CROSS_COMPILE=arm-fs6ull-linux-gnueabihf- mx6ull_fs6ull_defconfig

# 编译
make ARCH=arm CROSS_COMPILE=arm-fs6ull-linux-gnueabihf- -j4

```

## Linux内核编译

```bash
# 配置
make ARCH=arm CROSS_COMPILE=arm-fs6ull-linux-gnueabihf- imx_v7_defconfig

# 图形化配置（可选）
make ARCH=arm CROSS_COMPILE=arm-fs6ull-linux-gnueabihf- menuconfig

# 编译
make ARCH=arm CROSS_COMPILE=arm-fs6ull-linux-gnueabihf- -j4 zImage dtbs

```

## 根文件系统制作

**根文件系统（Root Filesystem）**：Linux启动后挂载的第一个文件系统，包含系统运行所需的库、工具、配置文件。

常用制作方式：

- **BusyBox**：手工编译制作最小根文件系统
- **Buildroot**：一键自动化构建完整根文件系统

# 系统镜像启动方式

## 三种启动方式对比

| 方式 | 说明 |
|-|-|
| **eMMC启动** | 系统全部烧写到板载eMMC，开发板独立运行 |
| **TFTP+NFS** | 内核通过TFTP下载，根文件系统通过NFS挂载到PC，开发阶段常用 |
| **SD卡启动** | 系统烧写到SD卡，插卡启动 |

## bootargs参数

**bootargs**：U-Boot传递给Linux内核的启动参数，指定内核挂载哪个根文件系统、控制台用哪个串口等。

```text
console=ttymxc0,115200 root=/dev/nfs nfsroot=192.168.1.100:/nfs/rootfs ip=192.168.1.200

```

| 参数 | 作用 |
|-|-|
| `console=` | 指定控制台串口和波特率 |
| `root=` | 指定根文件系统位置 |
| `nfsroot=` | NFS根文件系统路径 |
| `ip=` | 开发板IP地址 |

# U-Boot常用指令

| 命令 | 作用 |
|-|-|
| `printenv` | 查看环境变量 |
| `setenv` | 设置环境变量 |
| `saveenv` | 保存环境变量 |
| `tftpboot` | 通过TFTP下载文件到内存 |
| `nfs` | 通过NFS下载文件 |
| `bootz` | 启动zImage内核 |
| `md` / `mw` | 查看/修改内存 |

---

系统构建核心脉络：编译U-Boot→编译内核→制作根文件系统→配置启动参数→烧写启动。开发阶段常用TFTP+NFS方式，不用每次烧写eMMC。
