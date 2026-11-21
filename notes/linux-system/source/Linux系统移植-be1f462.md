# Linux系统移植

[飞书原文](https://hcn4ticlccda.feishu.cn/docx/TqHcdvteqoAjgnxT8xSc17jCn7b)

# 系统移植概述

## 系统移植

**系统移植**：将U-Boot、Linux内核、根文件系统适配到目标硬件平台，使其能够正常启动并驱动所有外设。

# U-Boot移植

## U-Boot启动流程

U-Boot启动分为SPL（Secondary Program Loader）和U-Boot两阶段：

1. **SPL阶段**：初始化DDR，加载U-Boot到内存
2. **U-Boot阶段**：初始化外设、加载内核、启动内核

## 移植内容

| 移植项 | 内容 |
|-|-|
| **DDR配置** | 修改DDR初始化参数，匹配实际DDR芯片型号 |
| **引脚配置** | 修改板级引脚复用配置 |
| **网络驱动** | 适配板载PHY芯片 |
| **启动方式** | 配置从eMMC/SD/NAND启动 |

# Linux内核移植

## 内核移植步骤

1. 添加单板配置文件
2. 修改设备树，添加板载外设描述
3. 使能所需外设驱动
4. 编译内核与设备树

## 设备树修改

根据实际硬件修改设备树节点：引脚配置、外设地址、中断号等。

# 根文件系统制作

## 根文件系统结构

| 目录 | 内容 |
|-|-|
| `/bin` | 基础命令工具 |
| `/etc` | 配置文件 |
| `/lib` | 动态库 |
| `/dev` | 设备文件 |
| `/proc` | 虚拟文件系统（内核状态） |
| `/sys` | 虚拟文件系统（设备树） |

## BusyBox制作

**BusyBox**：将常用Linux命令集成到单个可执行文件，是制作最小根文件系统的标准工具。

```bash
# 配置并编译BusyBox
make defconfig
make install

# 生成根文件系统目录
cd _install
mkdir etc dev proc sys

```

## Buildroot

**Buildroot**：自动化根文件系统构建工具，一键配置编译生成完整根文件系统镜像。

---

系统移植核心：U-Boot适配DDR与启动方式→内核加单板配设备树→制作根文件系统→三者配合启动。
