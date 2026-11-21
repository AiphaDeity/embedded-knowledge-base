# STM32 SPI控制器及其应用

[飞书原文](https://hcn4ticlccda.feishu.cn/docx/BokTdDGi3oVXixxFiwyc0Grhnsb)

# SPI概述

## 什么是SPI

SPI（Serial Peripheral Interface，串行外设接口）是一种由 Motorola 公司提出的**同步串行全双工**通信协议，用于在微控制器与外部设备之间进行高速短距离通信。

典型应用场景包括：连接传感器、存储器（Flash/EEPROM）、外部 ADC/DAC、显示屏、无线模块等。


::: tip

**补充：**SPI 没有官方的标准编号，各厂商实现略有差异，但核心的四线结构和主从架构是通用的。与 I2C 相比，SPI 速度更快、协议更简单，但引脚占用更多，且没有内置的应答和仲裁机制。

:::


## SPI核心特性

| 特性 | 说明 |
|-|-|
| 通信方式 | 同步、串行、全双工 |
| 总线引脚 | SCK、MOSI、MISO、CS（NSS） |
| 拓扑结构 | 一主多从 / 一主一从 |
| 从机选择 | CS 片选信号线（低电平有效） |
| 通信速率 | 一般 50MHz 以下（取决于具体器件） |
| 数据帧长度 | 8bit 或 16bit |
| 数据传输格式 | MSB 优先 或 LSB 优先 |

## SPI通信引脚

SPI 总线通常由四根线组成：

| 引脚 | 全称 | 功能说明 |
|-|-|-|
| **SCK** | Serial Clock | 串行时钟，由**主设备**产生，用于同步数据传输。时钟频率决定通信速率。 |
| **MOSI** | Master Out, Slave In | 主设备数据输出 → 从设备数据输入。主机通过此线向从机发送数据。 |
| **MISO** | Master In, Slave Out | 从设备数据输出 → 主设备数据输入。从机通过此线向主机返回数据。 |
| **CS / NSS** | Chip Select | 片选信号，由主机控制。**拉低**表示选中该从机可通信；**拉高**表示通信结束或未选中。一主多从时每个从机需要独立的 CS 线。 |


::: tip

**记忆口诀：**MOSI = 主发从收，MISO = 从发主收。两条数据线同时工作，因此是全双工。

:::


## 数据传输原理

**通信过程**

1. 主机将目标从机的 **CS 线拉低**，选中该从机。
2. 主机通过 **SCK** 输出时钟脉冲。
3. 在每个时钟周期内，主机通过 **MOSI** 发送 1 位数据，同时从机通过 **MISO** 返回 1 位数据。
4. 发送完 8 位（或 16 位）后，一个数据帧传输完成。
5. 主机将 **CS 线拉高**，结束通信。

**关键要点**

- 通信**始终由主器件发起**，从机不能主动发送数据。
- 数据输出和输入由**同一个时钟同步**，是全双工过程。
- 如果只是**写操作**，主机忽略接收到的字节即可。
- 如果只是**读操作**，主机必须发送 dummy 数据来引发从机的传输（因为时钟由主机产生）。

**STM32相关寄存器**

| 寄存器 | 关键位 | 作用 |
|-|-|-|
| **SPI_DR** | — | 数据寄存器。发送缓冲区和接收缓冲区共用此寄存器，通过读/写操作区分。写 DR = 发送，读 DR = 接收。 |
| **SPI_CR1** | DFF 位 | 数据帧长度控制：0 = 8bit，1 = 16bit。 |
| **SPI_CR1** | MSTR 位 | 主从模式选择：1 = 主模式，0 = 从模式。 |
| **SPI_CR1** | LSBFIRST 位 | 数据帧格式：0 = MSB 优先，1 = LSB 优先。 |
| **SPI_SR** | TXE / RXNE | 发送缓冲区空 / 接收缓冲区非空标志位。 |

## 主从设备

**主设备（Master）**

- SPI 总线上的**主控制设备**。
- 负责产生 **SCK 时钟信号**，控制通信速率。
- 负责**发起通信**和控制 CS 片选。
- 通过 SPI_CR1 寄存器的 **MSTR 位置 1** 配置为主模式。

**从设备（Slave）**

- SPI 总线上的**被动设备**。
- 只能**被动响应**主设备的指令。
- 按照主设备提供的时钟信号进行数据传输。
- 通过 SPI_CR1 寄存器的 **MSTR 位清 0** 配置为从模式。


::: tip

**注意：**一条 SPI 总线上只能有一个主设备，但可以挂多个从设备。每个从设备需要独立的 CS 线，主机同一时刻只能与一个从机通信。

:::


## SPI的四种工作模式

SPI 的工作模式由 **CPOL（时钟极性）**和 **CPHA（时钟相位）**两个参数组合决定，共 4 种模式。这是原 PDF 未涉及但非常重要的知识点。

| 模式 | CPOL | CPHA | 说明 |
|-|-|-|-|
| **Mode 0** | 0 | 0 | 空闲时 SCK 为低电平；数据在**上升沿采样**，下降沿移出。**最常用**。 |
| **Mode 1** | 0 | 1 | 空闲时 SCK 为低电平；数据在**下降沿采样**，上升沿移出。 |
| **Mode 2** | 1 | 0 | 空闲时 SCK 为高电平；数据在**下降沿采样**，上升沿移出。 |
| **Mode 3** | 1 | 1 | 空闲时 SCK 为高电平；数据在**上升沿采样**，下降沿移出。 |

在 STM32 中，CPOL 和 CPHA 均由 **SPI_CR1** 寄存器配置：

- **CPOL 位**：0 = 空闲时 SCK 为低，1 = 空闲时 SCK 为高。
- **CPHA 位**：0 = 第一个时钟沿采样，1 = 第二个时钟沿采样。


::: tip

**关键：**主设备和从设备必须使用**相同的 SPI 模式**（CPOL 和 CPHA 一致）才能正常通信。使用前务必查阅从机数据手册确认其支持的模式。

:::


## SPI的传输方式

SPI 总线支持三种传输方式：**全双工、半双工、单工**。

**全双工传输**

- 同一时刻可以**同时发送和接收**数据。
- 使用 MOSI 和 MISO 两条独立数据线。
- SPI_CR1.BIDIMODE = 0，SPI_CR1.RXONLY = 0（默认配置）。
- 这是最常用的传输方式。

**半双工传输**

- 同一时刻**只能一个方向**传输，但可以切换方向。
- 将 SPI_CR1 寄存器的 **BIDIMODE 位置 1** 使能半双工模式。
- 通过 SPI_CR1 寄存器的 **BIDIOE 位**选择方向：

  - BIDIOE = 1：数据**发送**（输出）。
  - BIDIOE = 0：数据**接收**（输入）。
- 半双工模式下，主模式使用 **MOSI** 线传输数据，从模式使用 **MISO** 线传输数据，SCK 仍用于时钟输出。
- 优点：节省一根数据线。

**单工传输**

同一时刻**只有一个传输方向**，只能发送或只能接收。通过 SPI_CR1.BIDIMODE 和 SPI_CR1.RXONLY 组合控制：

| 模式 | BIDIMODE | RXONLY | 说明 |
|-|-|-|-|
| **只发送模式** | 0 | 0 | 即全双工模式。在发送引脚（主模式 MOSI / 从模式 MISO）上发送数据，接收引脚可用作通用 IO，应用程序忽略接收缓冲区数据即可。 |
| **只接收模式** | 0 | 1 | 主模式下：片选拉低且使能 SPI 后通信立即开始，直到 SPI 控制器被关闭且当前接收结束才停止。  <br/>从模式下：片选拉低且一直有 SCK 输入时持续接收。 |

## SPI与I2C对比

| 对比项 | SPI | I2C |
|-|-|-|
| 信号线数量 | 4 线（SCK, MOSI, MISO, CS） | 2 线（SCL, SDA） |
| 通信方式 | 全双工 | 半双工 |
| 通信速率 | 高（可达几十 MHz） | 较低（标准 100kHz，快速 400kHz，高速 3.4MHz） |
| 从机寻址 | 硬件 CS 片选，无地址 | 软件地址寻址（7位/10位） |
| 多主机支持 | 不支持（单主架构） | 支持多主机和仲裁 |
| 应答机制 | 无（需软件实现） | 有 ACK/NACK |
| 协议复杂度 | 简单 | 较复杂 |
| 适用场景 | 高速数据传输（Flash、显示屏、ADC） | 低速控制、多设备挂载（传感器、EEPROM） |

## STM32 SPI配置步骤

1. **使能时钟**：使能 SPI 外设时钟和对应 GPIO 端口时钟（RCC_APBxENR）。
2. **配置 GPIO**：SCK、MOSI 配置为复用推挽输出；MISO 配置为浮空/上拉输入；CS 配置为通用推挽输出。
3. **配置 SPI_CR1**：

   - MSTR = 1（主模式）
   - BR[2:0]：设置波特率分频系数（决定 SCK 频率）
   - CPOL / CPHA：选择 SPI 工作模式
   - DFF：选择 8bit 或 16bit 数据帧
   - LSBFIRST：选择 MSB/LSB 优先
   - SSM = 1（软件片选管理），SSI = 1
4. **使能 SPI**：SPI_CR1 的 SPE 位置 1。
5. **数据收发**：拉低 CS → 写 DR 发送数据 → 等待 RXNE → 读 DR 接收数据 → 拉高 CS。


::: tip

**学习提示：**SPI 的核心在于理解"时钟驱动一切"——没有时钟就没有数据传输。读操作时主机必须发送 dummy 字节来产生时钟，这是初学者最容易困惑的地方。建议结合逻辑分析仪观察实际波形来加深理解。

:::


# SPI通信协议

## SPI时钟频率

SPI 是一种**同步通信**，数据传输需要主从设备保持同步。时钟信号由**主设备产生**，通过 SCK 引脚输出，主从设备依据 SCK 上的时钟脉冲进行数据收发。

**时钟来源与分频**

- SPI 控制器挂载在 **APB2 时钟总线**上，使用 APB2 提供的时钟。
- SPI 控制器内部有一个**时钟分频器**，将 APB2 总线时钟分频后输出为 SCK。
- 分频系数由 **SPI_CR1 寄存器的 BR[2:0] 位**控制。

**BR 分频系数表（补充）**

| BR[2:0] | 分频系数 | SCK 频率（APB2=84MHz 时） |
|-|-|-|
| 000 | 2 | 42 MHz |
| 001 | 4 | 21 MHz |
| 010 | 8 | 10.5 MHz |
| 011 | 16 | 5.25 MHz |
| 100 | 32 | 2.625 MHz |
| 101 | 64 | 1.3125 MHz |
| 110 | 128 | 656.25 kHz |
| 111 | 256 | 328.125 kHz |


::: tip

**注意：**时钟频率不是越快越好，必须考虑从设备能接受的最大时钟频率。例如 TMP125 温度传感器最快支持 10MHz，主设备分频后的 SCK 就不能超过 10MHz。使用前务必查阅从机数据手册。

:::


## NSS引脚管理

SPI 控制器的片选（NSS/CS）引脚有两种管理方式，由 **SPI_CR1 寄存器的 SSM 位**控制：

**软件管理片选（SSM = 1）**

- 不使用 SPI 控制器自身的 NSS 引脚，而是使用**普通 GPIO 引脚**来控制片选。
- 需要同时设置 **SSI 位 = 1**（内部从选择），否则 SPI 会被误认为处于从模式而产生错误。
- 优点：灵活，一个 GPIO 控制一个从机，适合一主多从场景。
- 这是**最常用**的片选方式。

**硬件管理片选（SSM = 0）**

使用 SPI 控制器自身的 NSS 引脚进行设备片选。根据 **SPI_CR2 寄存器的 SSOE 位**又分为两种模式：

| 模式 | SSM | SSOE | 说明 |
|-|-|-|-|
| **NSS 输出使能** | 0 | 1 | 仅**主模式**可用。开始通信时 NSS 自动拉低，保持到 SPI 被禁止为止。适合单主单从场景。 |
| **NSS 输出禁止** | 0 | 0 | 主模式下支持**多主模式**（NSS 作为仲裁输入）；从模式下 NSS 为低时被选中，为高时取消选中。 |


::: tip

**补充：多主模式**当多个 SPI 设备都配置为主模式时，NSS 输出禁止模式可用于总线仲裁。如果某个主设备的 NSS 被拉低（被另一个主机选中），它会自动切换为从模式并产生 MODF 错误，避免总线冲突。

:::


## 数据帧格式

**数据帧长度**

- 每个数据帧的长度为 **8 位**或 **16 位**。
- 由 **SPI_CR1 寄存器的 DFF 位**配置：DFF = 0 为 8 位，DFF = 1 为 16 位。
- 8 位是最常用的配置，适合大多数传感器和存储器。

**数据帧发送顺序**

- **MSB 优先**（LSBFIRST = 0）：从最高有效位开始发送，大多数器件默认使用此方式。
- **LSB 优先**（LSBFIRST = 1）：从最低有效位开始发送，部分特殊器件使用。
- 由 **SPI_CR1 寄存器的 LSBFIRST 位**配置。


::: tip

**关键：**主设备和从设备的数据帧长度和发送顺序必须一致，否则数据会错位。配置前务必确认从机要求。

:::


## 时钟极性与相位

**时钟极性 CPOL**

CPOL（Clock Polarity）决定 SCK 在**空闲状态**（无数据传输时）的电平：

- **CPOL = 0**：SCK 空闲时为**低电平**。
- **CPOL = 1**：SCK 空闲时为**高电平**。

**时钟相位 CPHA**

CPHA（Clock Phase）决定数据的**采样时刻**：

- **CPHA = 0**：数据在时钟的**第一个边沿**采样（CPOL=0 时为上升沿，CPOL=1 时为下降沿）。
- **CPHA = 1**：数据在时钟的**第二个边沿**采样（CPOL=0 时为下降沿，CPOL=1 时为上升沿）。

**四种时序模式组合**

通过 SPI_CR1 寄存器的 CPOL 和 CPHA 位，可以组合出四种时序关系：

| 模式 | CPOL | CPHA | 空闲电平 | 采样沿 |
|-|-|-|-|-|
| **Mode 0** | 0 | 0 | 低电平 | 上升沿（第一个边沿） |
| **Mode 1** | 0 | 1 | 低电平 | 下降沿（第二个边沿） |
| **Mode 2** | 1 | 0 | 高电平 | 下降沿（第一个边沿） |
| **Mode 3** | 1 | 1 | 高电平 | 上升沿（第二个边沿） |


::: tip

**记忆技巧：**CPOL 决定"空闲是什么电平"，CPHA 决定"第几个边沿采样"。Mode 0（CPOL=0, CPHA=0）是最常用的模式，大部分 Flash 和传感器都支持。

:::


## 协议时序图解读

原 PDF 列出了 5 种时序配置的波形图，以下逐一解读（补充）：

**CPOL=0, CPHA=0, MSB（Mode 0，最常用）**

- SCK 空闲为低，第一个上升沿采样数据。
- CS 拉低后，主机在 SCK 下降沿更新 MOSI 数据，从机在上升沿读取。
- 同时从机在 SCK 下降沿更新 MISO 数据，主机在上升沿读取。
- MSB 优先：先发送最高位。

**CPOL=0, CPHA=0, LSB（Mode 0 + LSB 优先）**

- 时序与 Mode 0 相同，但数据从最低位开始发送。
- 适用于要求 LSB 优先的特殊器件（如部分编码器、LED 驱动芯片）。

**CPOL=0, CPHA=1, MSB（Mode 1）**

- SCK 空闲为低，第一个下降沿采样数据。
- CS 拉低后，主机在 SCK 上升沿更新 MOSI 数据，从机在下降沿读取。
- 注意：CS 拉低后的第一个 SCK 周期是"半个周期"，用于准备第一位数据。

**CPOL=1, CPHA=0, MSB（Mode 2）**

- SCK 空闲为高，第一个下降沿采样数据。
- 相当于 Mode 0 的 SCK 反相版本。

**CPOL=1, CPHA=1, MSB（Mode 3）**

- SCK 空闲为高，第一个上升沿采样数据。
- 相当于 Mode 1 的 SCK 反相版本，部分高速器件使用。


::: tip

**学习提示：**理解时序图的关键是抓住三个信号的关系：CS（什么时候开始/结束）、SCK（什么时候采样/更新）、MOSI/MISO（数据在哪个沿变化、哪个沿稳定）。建议用逻辑分析仪抓实际波形对照学习，比看静态图直观得多。

:::


# SPI与TMP125传感器

## TMP125传感器简介

TMP125 是一种 **SPI 兼容**的温度传感器，分辨率为 **0.25°C**。微控制器想要获取 TMP125 采集的温度数据，必须先了解其通信时序（极性、相位、可接受的时钟频率、MSB/LSB 等）。

### 通信时序分析

由 TMP125 的时序图可知：数据的**采集**在 SCK 的**上升沿**进行，数据的**变化**在 SCK 的**下降沿**进行。

在上升沿采集数据的 SPI 模式有两种：

- **CPOL = 0，CPHA = 0**（Mode 0）：空闲时 SCK 为低，第一个上升沿采样。
- **CPOL = 1，CPHA = 1**（Mode 3）：空闲时 SCK 为高，第二个上升沿采样。


::: tip

**关键：**TMP125 支持 Mode 0 和 Mode 3 两种模式，实际使用时任选其一即可，但主从设备必须一致。大多数开发中选择 Mode 0（CPOL=0, CPHA=0）。

:::


### 时序参数与最大时钟频率

TMP125 支持的最快时钟周期为 100ns，因此最大时钟频率为 **10MHz**。

| 参数 | 符号 | 最小值 | 最大值 | 单位 |
|-|-|-|-|-|
| SCK 周期 | t1 | 100 | — | ns |
| 数据输入到 SCK 上升沿建立时间 | t2 | 20 | — | ns |
| SCK 下降沿到输出数据延迟 | t3 | — | 30 | ns |
| SCK 上升沿到输入数据保持时间 | t4 | 20 | — | ns |
| CS 到 SCK 上升沿建立时间 | t5 | 40 | — | ns |
| CS 到输出数据延迟 | t6 | — | 30 | ns |
| CS 上升沿到输出高阻态 | t7 | — | 30 | ns |


::: tip

**补充：**配置 SPI 波特率分频系数时，必须确保分频后的 SCK 频率不超过 10MHz。例如 APB2 = 84MHz 时，BR = 010（8分频）得到 10.5MHz 略超，应选 BR = 011（16分频）得到 5.25MHz。

:::


### 数据帧格式

TMP125 的数据传输采用 **MSB 优先**（最高有效位先传），16 位数据字以符号位开头，后跟 MSB。

### 数据寄存器格式

TMP125 的温度寄存器是一个 **16 位只读寄存器**，用于存储最近一次转换的结果。但实际有效的温度数据仅有 **10 位**，以**补码**形式存储。

| 位 | D15 | D14 | D12 | D11 | D10 | D9 | D8 |
|-|-|-|-|-|-|-|-|
| 含义 | 前导 0 | T9（符号位） | T7 | T6 | T5 | T4 | T3 |

| 位 | D7 | D6 | D5 | D4 | D3 | D2 | D1 | D0 |
|-|-|-|-|-|-|-|-|-|
| 含义 | T2 | T1 | T0 | T0（复制） | T0（复制） | T0（复制） | T0（复制） | T0（复制） |

- **D15**：前导 0，恒为 0，非数据位。
- **D14～D5**：实际的 10 位温度数据，其中 **D14 是符号位**（0 表示零上，1 表示零下）。
- **D4～D0**：数值与 D5 相同，为扩展位，不是有效温度数据。

### 温度计算方法

读取 16 位数据寄存器后，需要提取 D14～D5 的 10 位温度数字值，然后乘以分辨率 0.25°C 得到实际温度：

**实际温度 = 10位温度数字值 × 0.25°C**

由于是补码形式，零下温度需要先对 10 位数据求补码再计算。

| 温度（°C） | 10位二进制（D14～D5） |
|-|-|
| +25 | 00 0110 0100 |
| +10 | 00 0010 1000 |
| +0.25 | 00 0000 0001 |
| 0 | 00 0000 0000 |
| -0.25 | 11 1111 1111 |
| -25 | 11 1001 1100 |


::: tip

**学习提示：**提取 10 位数据的常用做法是：将读到的 16 位数据右移 5 位，然后与 0x3FF 进行按位与，即可得到 10 位有效数据。判断符号位后，若为负数则对结果取补码。

:::


### 掉电模式（Shutdown Mode）

TMP125 支持掉电模式。进入掉电模式的条件是：**MOSI（SI）在 SCK 的第三位上升沿为高电平**。

也就是说，当主设备向 TMP125 发送的数据为以下值时，会导致 TMP125 进入掉电模式：

- **0x2000**
- **0xA000**
- **0x6000**
- **0xE000**

掉电模式下，TMP125 不再进行温度转换，读取数据寄存器得到的是掉电前最后一次转换的温度值（保持不变）。


::: tip

**注意：**全双工模式下读取 TMP125 时，主设备必须发送 dummy 数据来产生时钟。如果不小心发送了上述四个值之一，会意外触发掉电模式！建议发送 0x0000 作为 dummy 数据，避免误触发。

:::


### 温度转换周期

TMP125 完成一次温度转换至少需要 **120ms**。连续读取时需注意间隔，否则可能读到相同的旧数据。

## 访问TMP125传感器

### SPI控制器引脚配置

本实验使用 SPI1，引脚对应关系如下：

| 功能 | 引脚 | 复用功能 |
|-|-|-|
| SCK（串行时钟） | PA5 | AF5 |
| MISO（主入从出） | PA6 | AF5 |
| MOSI（主出从入） | PA7 | AF5 |
| CS（片选，从机1） | PA4 | 通用输出 |
| CS（片选，从机2） | PF8 | 通用输出 |

#### 使能GPIO时钟

SCK/MISO/MOSI 使用 GPIOA，片选可能用到 GPIOF，因此需要使能 GPIOA 和 GPIOF 的时钟。由 **RCC_AHB1ENR** 寄存器的 GPIOAEN 和 GPIOFEN 位控制。

#### GPIO引脚复用配置

将 GPIOA_MODER 寄存器的 MODER5、MODER6、MODER7 设置为 **10**（复用功能模式）。根据芯片数据手册，SPI1 的复用标号为 **AF5**，因此将 GPIOA_AFRL 寄存器的 AFRL5、AFRL6、AFRL7 设置为 **0101**（AF5）。

#### 片选引脚设置（软片选）

将 GPIOA_MODER 的 MODER4 或 GPIOF_MODER 的 MODER8 设置为 **01**（通用输出模式），用软件控制片选电平。

### SPI控制器配置

| 配置项 | 设置值 | 寄存器/位 | 说明 |
|-|-|-|-|
| 使能 SPI1 时钟 | 使能 | RCC_APB2ENR.SPI1EN | SPI1 挂载在 APB2 总线上 |
| SPI/I2S 模式 | SPI 模式 | SPI_I2SCFGR.I2SMOD | 选择 SPI 协议而非 I2S 音频协议 |
| 主从模式 | **主模式** | SPI_CR1.MSTR | TMP125 只能做从机，MCU 必须为主机 |
| 通信帧模式 | Motorola 模式 | SPI_CR2.FRF | 标准 SPI 协议 |
| 数据帧长度 | 8 位 | SPI_CR1.DFF | 分两次发送/接收，凑成 16 位 |
| 通信模式 | 全双工 | SPI_CR1.BIDIMODE / RXONLY | BIDIMODE=0, RXONLY=0 |
| CRC 计算 | 禁止 | SPI_CR1.CRCEN | TMP125 不支持 CRC |
| NSS 管理 | 软件管理 | SPI_CR1.SSM | **SSM=1，同时 SSI=1** |
| 时钟极性 CPOL | 0 或 1 | SPI_CR1.CPOL | 与 CPHA 配合，选 Mode 0 或 Mode 3 |
| 时钟相位 CPHA | 0 或 1 | SPI_CR1.CPHA | CPOL=0,CPHA=0 或 CPOL=1,CPHA=1 |
| 时钟频率 | ≤ 10MHz | SPI_CR1.BR[2:0] | 设置分频系数，不超过 TMP125 上限 |
| 数据帧传输格式 | **MSB 优先** | SPI_CR1.LSBFIRST | LSBFIRST = 0 |
| 使能 SPI 控制器 | 使能 | SPI_CR1.SPE | 配置完成后置 1 启动 |


::: tip

**补充：Motorola 模式 vs TI 模式**两者主要区别：① 片选方式——Motorola 模式拉低片选开始传输，完成后拉高；TI 模式片选是一个脉冲（至少一个时钟周期）。② 时钟相位——TI 模式的时钟极性和相位通常是固定的。TMP125 使用 Motorola 模式。

:::


### 通信仿真与状态位

#### 通信流程

1. **拉低片选**：将对应 CS 引脚拉低，选中 TMP125。
2. **发送 dummy 数据诱发时钟**：全双工模式下，主设备必须先向 DR 写入数据，才能产生 SCK 时钟，从而诱发从设备输出数据。
3. **等待接收完成**：等待 RXNE 标志置位，读取接收到的数据。
4. **重复**：因为数据帧是 8 位，需要收发两次才能凑齐 16 位温度数据。
5. **拉高片选**：通信结束，拉高 CS。


::: tip

**关键理解：**SPI 全双工模式下，"读"操作本质上是"写"驱动的——没有写就没有时钟，没有时钟就没有从机数据。读取 TMP125 时发送的 dummy 字节建议用 0x00，避免误触发掉电模式。

:::


#### SPI状态位

| 状态位 | 寄存器 | = 1 时含义 | = 0 时含义 |
|-|-|-|-|
| **TXE** | SPI_SR | 发送缓冲区 DR 为空，可以写入新数据 | 发送缓冲区已有数据，不允许写入 |
| **RXNE** | SPI_SR | 接收缓冲区 DR 中有数据，可以读取 | 接收缓冲区为空 |
| **BSY** | SPI_SR | 总线通信中，或发送缓冲区非空，总线繁忙 | 总线空闲 |
| **OVR** | SPI_SR | 发生上溢错误（新数据覆盖了未读的旧数据） | 无上溢错误 |


::: tip

**上溢错误（OVR）：**当接收缓冲区已有数据但未被读取时，又接收到了新数据，就会产生上溢错误，导致新数据丢失。读取 TMP125 时要及时读走 DR 中的数据，或者先读 DR 再发起下一次发送。

:::


### SPI总线的多从设备

SPI 总线允许一个主设备控制多个从设备，但在**同一时刻只能与一个从设备通信**。每个从设备需要独立的 CS 片选线，主机通过拉低对应从机的 CS 来选择通信对象，其他从机的 CS 保持高电平（未选中）。


::: tip

**学习提示：**TMP125 的学习重点在于理解"读温度 = 发 dummy 产生时钟 + 收 16 位数据 + 软件解析补码"这一完整链路。建议先用逻辑分析仪观察 CS、SCK、MOSI、MISO 四路波形，确认时序符合 Mode 0/3，再写代码解析温度值。

:::


# SPI中断和DMA

## SPI中断

SPI 外设可以在多种状态发生时产生中断请求。当发送缓冲区为空（TXE）、接收缓冲区非空（RXNE）、溢出错误（OVR）等状态位被置位时，若对应中断使能位已开启，就会向 NVIC 发出中断申请。通过使能单独的中断使能位，可以灵活地按需开启各类中断。

### 中断源与使能位总览

所有 SPI 中断的使能均由 **SPI_CR2** 寄存器控制，下表汇总了三类中断使能位及其触发条件：

| 使能位 | 全称 | 触发状态位 | 说明 |
|-|-|-|-|
| RXNEIE | 接收缓冲区非空中断使能 | RXNEIE = 1 | 接收到数据、接收缓冲区非空时触发 |
| TXEIE | 发送缓冲区为空中断使能 | TXEIE = 1 | 发送缓冲区已空、可写入新数据时触发 |
| ERRIE | 错误中断使能 | MODF / OVR / CRCERR / FRE | 主模式故障、溢出、CRC错误、TI帧格式错误统一使能 |

### RXNEIE — 接收缓冲区非空中断

RXNEIE（Receive buffer Not Empty Interrupt Enable）是接收缓冲区非空中断使能位。将 RXNEIE 位置 1，即可使能接收缓冲区非空中断；当 SPI_SR 寄存器中的 RXNE 位被置 1 时，就会产生接收缓冲区非空的中断申请。

该中断由 **SPI_CR2** 寄存器下的 RXNEIE 位控制。在中断服务程序中读取 SPI_DR 寄存器，即可清除 RXNE 标志位。


::: tip

**补充：**RXNE 中断适合需要及时处理接收到数据的场景，例如逐字节解析协议帧。与轮询方式相比，中断方式可以让 CPU 在等待数据时执行其他任务，提高系统效率。

:::


### TXEIE — 发送缓冲区为空中断

TXEIE（Transmit buffer Empty Interrupt Enable）是发送缓冲区为空中断使能位。将 TXEIE 位置 1，即可使能发送缓冲区为空中断；当 SPI_SR 寄存器中的 TXE 位被置 1 时，就会产生发送缓冲区为空的中断申请。

该中断由 **SPI_CR2** 寄存器下的 TXEIE 位控制。在中断服务程序中向 SPI_DR 寄存器写入数据，即可清除 TXE 标志位。


::: tip

**使用提示：**TXE 中断在发送缓冲区为空时会持续触发，如果没有更多数据要发送，应在中断服务程序中关闭 TXEIE 位，否则会反复进入中断导致 CPU 占用率过高。

:::


### ERRIE — 错误中断

ERRIE（Error Interrupt Enable）是错误中断使能位。以下四类错误的中断都由 ERRIE 位统一控制使能：

- **MODF**（主模式故障）：主设备的 NSS 引脚被意外拉低，导致多主冲突
- **OVR**（溢出错误）：接收缓冲区已有数据未被读取，又接收到了新数据
- **CRCERR**（CRC 错误）：接收到的 CRC 值与计算值不匹配
- **FRE**（TI 帧格式错误）：TI 模式下帧格式异常

其中最常见的是**溢出错误（OVR）**。该中断由 **SPI_CR2** 寄存器下的 ERRIE 位控制。清除 OVR 标志需要先读 SPI_DR，再读 SPI_SR。


::: tip

**溢出错误（OVR）的成因与预防：**当接收缓冲区中已有数据但 CPU 未及时读取时，SPI 又接收到了新数据，就会产生上溢错误，导致新数据丢失。预防方法包括：及时在中断中读走 DR 数据、使用 DMA 自动搬运数据、或在发送前先读取 DR 清空接收缓冲区。

:::


## SPI的DMA申请

DMA（Direct Memory Access，直接存储器访问）可以在不经过 CPU 的情况下，直接在内存与 SPI 数据寄存器之间搬运数据，适合大批量、高速率的数据传输场景。

### DMA 使能控制位

SPI 的 DMA 申请使能由 **SPI_CR2** 寄存器中的两个控制位决定：

| 控制位 | 全称 | 作用 |
|-|-|-|
| TXDMAEN | 发送缓冲区 DMA 使能 | 置1后，TXE 置位时发出 DMA 请求，由 DMA 向 SPI_DR 写入数据 |
| RXDMAEN | 接收缓冲区 DMA 使能 | 置1后，RXNE 置位时发出 DMA 请求，由 DMA 从 SPI_DR 读取数据 |

当置位 SPI_CR2 寄存器中的 DMA 使能位时，将请求 DMA 访问，发送缓冲区和接收缓冲区会各自发出独立的 DMA 请求。

### 发送 DMA 流程

在发送过程中，DMA 与 SPI 的协作流程如下：

1. SPI 发送缓冲区中的数据被移位寄存器移出后，**TXE 位置 1**
2. TXE 置位触发一次 **DMA 请求**
3. DMA 控制器响应请求，将内存中的数据**写入 SPI_DR 寄存器**
4. 写 SPI_DR 的操作会自动**将 TXE 标志清 0**
5. 重复上述过程，直到 DMA 传输计数器减为 0

### 接收 DMA 流程

在接收过程中，DMA 与 SPI 的协作流程如下：

1. SPI 接收到一个数据帧后，数据从移位寄存器转入接收缓冲区，**RXNE 位置 1**
2. RXNE 置位触发一次 **DMA 请求**
3. DMA 控制器响应请求，从 **SPI_DR 寄存器读取数据**并写入内存
4. 读 SPI_DR 的操作会自动**将 RXNE 标志清 0**
5. 重复上述过程，直到 DMA 传输计数器减为 0

### 双向 DMA 协同工作

由于 SPI 是全双工通信，发送和接收可以同时进行。当发送和接收 DMA 皆使能时，两者协同工作：

- **发送方向：**若 SPI 发送缓冲区为空（TXE = 1），发出一次 DMA 申请，内存中的数据被 DMA 写入到 SPI_DR 寄存器
- **接收方向：**若接收缓冲区收到数据（RXNE = 1），发出一次 DMA 申请，接收缓冲区中的数据被 DMA 读取到内存中

两个方向的 DMA 请求相互独立，可以分别配置不同的 DMA 通道、内存地址和传输长度。


::: tip

**补充：DMA 与中断的选择**
• **小数据量、低频率**传输：使用中断方式即可，配置简单，CPU 开销可接受
• **大数据量、高频率**传输（如显示屏刷屏、Flash 读写、音频流）：优先使用 DMA，可大幅降低 CPU 占用
• DMA 传输完成后也可以通过 DMA 通道的传输完成中断（TCIF）通知 CPU，实现"DMA 搬运 + 中断通知"的组合模式

:::



::: tip

**学习提示：**SPI 中断和 DMA 的核心在于理解"状态位 → 中断/DMA 请求 → 清除标志"这一闭环。TXE/RXNE 既是中断的触发源，也是 DMA 请求的触发源；区别在于中断由 CPU 响应并读写 DR，DMA 由硬件自动完成读写。建议结合逻辑分析仪和调试器，观察不同方式下 CS、SCK 波形与 CPU 占用率的差异。

:::


# 温度采集（SPI轮询）

## 轮询方式原理

轮询（Polling）方式是指 CPU 通过不断读取 SPI 状态寄存器（SPI_SR）中的标志位，来判断发送和接收是否完成。在数据传输过程中，CPU 被阻塞在等待循环中，直到标志位满足条件才继续执行后续代码。

对于 TMP125 温度采集，轮询方式的核心流程是：拉低 CS 片选 → 发送 dummy 数据产生时钟 → 同时接收 16 位温度数据 → 等待传输完成 → 拉高 CS → 软件解析温度值。整个过程中 CPU 全程参与，不响应其他任务。

### 轮询方式涉及的状态位

| 状态位 | 含义 | 轮询中的作用 |
|-|-|-|
| TXE | 发送缓冲区为空 | 置1表示可以写入下一个字节到 DR |
| RXNE | 接收缓冲区非空 | 置1表示可以从 DR 读取接收到的字节 |
| BSY | SPI 总线忙 | 置1表示正在通信，需等待清零后才能拉高 CS |


::: tip

**补充：**HAL 库的 `HAL_SPI_TransmitReceive()` 函数内部已经封装了 TXE/RXNE/BSY 的轮询逻辑，用户无需手动操作状态位，只需传入发送/接收缓冲区和数据长度即可。但理解底层状态位有助于排查超时和数据丢失问题。

:::


## HAL 库实现步骤

### 步骤一：GPIO 初始化

配置 SPI1 的 SCK（PA5）、MISO（PA6）、MOSI（PA7）为复用功能 AF5，CS（PA4）为通用推挽输出。

```c
void SPI1_GPIO_Init(void)
{
    GPIO_InitTypeDef GPIO_InitStruct = {0};

    __HAL_RCC_GPIOA_CLK_ENABLE();

    /* SCK=PA5, MISO=PA6, MOSI=PA7 复用功能 */
    GPIO_InitStruct.Pin   = GPIO_PIN_5 | GPIO_PIN_6 | GPIO_PIN_7;
    GPIO_InitStruct.Mode  = GPIO_MODE_AF_PP;
    GPIO_InitStruct.Pull  = GPIO_NOPULL;
    GPIO_InitStruct.Speed = GPIO_SPEED_FREQ_HIGH;
    GPIO_InitStruct.Alternate = GPIO_AF5_SPI1;
    HAL_GPIO_Init(GPIOA, &GPIO_InitStruct);

    /* CS=PA4 通用推挽输出，默认拉高 */
    GPIO_InitStruct.Pin   = GPIO_PIN_4;
    GPIO_InitStruct.Mode  = GPIO_MODE_OUTPUT_PP;
    GPIO_InitStruct.Pull  = GPIO_NOPULL;
    GPIO_InitStruct.Speed = GPIO_SPEED_FREQ_HIGH;
    HAL_GPIO_Init(GPIOA, &GPIO_InitStruct);
    HAL_GPIO_WritePin(GPIOA, GPIO_PIN_4, GPIO_PIN_SET);
}
```

### 步骤二：SPI 初始化

配置 SPI1 为主模式、8 位数据帧、Mode 0（CPOL=0, CPHA=0）、MSB 优先、软件片选。时钟频率不超过 TMP125 的 10MHz 上限。

```c
SPI_HandleTypeDef hspi1;

void SPI1_Init(void)
{
    hspi1.Instance               = SPI1;
    hspi1.Init.Mode              = SPI_MODE_MASTER;        /* 主模式 */
    hspi1.Init.Direction         = SPI_DIRECTION_2LINES;   /* 全双工 */
    hspi1.Init.DataSize          = SPI_DATASIZE_8BIT;      /* 8位帧 */
    hspi1.Init.CLKPolarity       = SPI_POLARITY_LOW;       /* CPOL=0 */
    hspi1.Init.CLKPhase          = SPI_PHASE_1EDGE;        /* CPHA=0 */
    hspi1.Init.NSS               = SPI_NSS_SOFT;            /* 软件片选 */
    hspi1.Init.BaudRatePrescaler = SPI_BAUDRATEPRESCALER_16; /* 5.25MHz */
    hspi1.Init.FirstBit          = SPI_FIRSTBIT_MSB;        /* MSB优先 */
    hspi1.Init.TIMode            = SPI_TIMODE_DISABLE;
    hspi1.Init.CRCCalculation    = SPI_CRCCALCULATION_DISABLE;
    hspi1.Init.CRCPolynomial     = 10;

    if (HAL_SPI_Init(&hspi1) != HAL_OK) {
        Error_Handler();
    }
}
```

### 步骤三：读取温度（轮询方式核心函数）

拉低 CS 后，通过 `HAL_SPI_TransmitReceive()` 发送 2 字节 dummy（0x00）产生时钟，同时接收 2 字节温度数据。等待 BSY 清零后拉高 CS，最后解析 16 位原始数据得到实际温度。

```c
/* 读取 TMP125 温度，返回单位为摄氏度 */
float TMP125_ReadTemp_Polling(void)
{
    uint8_t tx_buf[2] = {0x00, 0x00};  /* dummy 数据 */
    uint8_t rx_buf[2] = {0};
    uint16_t raw;
    int16_t  temp_raw;
    float    temperature;

    /* 1. 拉低 CS，选中 TMP125 */
    HAL_GPIO_WritePin(GPIOA, GPIO_PIN_4, GPIO_PIN_RESET);

    /* 2. 发送 2 字节 dummy，同时接收 2 字节温度数据（阻塞式） */
    HAL_SPI_TransmitReceive(&hspi1, tx_buf, rx_buf, 2, 100);

    /* 3. 等待 SPI 总线不忙 */
    while (HAL_SPI_GetState(&hspi1) != HAL_SPI_STATE_READY);

    /* 4. 拉高 CS，结束通信 */
    HAL_GPIO_WritePin(GPIOA, GPIO_PIN_4, GPIO_PIN_SET);

    /* 5. 组合 16 位原始数据 */
    raw = ((uint16_t)rx_buf[0] << 8) | rx_buf[1];

    /* 6. 提取 D14~D5 共 10 位有效数据 */
    temp_raw = (int16_t)((raw >> 5) & 0x03FF);

    /* 7. 符号扩展：若第 9 位（符号位）为 1，说明是负数 */
    if (temp_raw & 0x0200) {
        temp_raw |= 0xFC00;  /* 扩展为 16 位补码 */
    }

    /* 8. 乘以分辨率 0.25°C */
    temperature = temp_raw * 0.25f;

    return temperature;
}
```

### 步骤四：主函数中周期性调用

```c
int main(void)
{
    HAL_Init();
    SystemClock_Config();
    SPI1_GPIO_Init();
    SPI1_Init();

    float temp;

    while (1) {
        temp = TMP125_ReadTemp_Polling();
        /* 此处可通过串口打印 temp，或送入显示屏 */
        HAL_Delay(200);  /* 间隔大于 120ms，确保温度已更新 */
    }
}
```

## 轮询方式的优缺点

| 维度 | 优点 | 缺点 |
|-|-|-|
| 实现难度 | 代码简单，无需配置 NVIC 和中断回调 | — |
| CPU 占用 | — | 传输期间 CPU 被阻塞，无法执行其他任务 |
| 实时性 | 调用后立即返回结果，时序确定 | 若超时设置不当可能卡死在等待循环中 |
| 适用场景 | 低速、低频、对 CPU 占用不敏感的场合 | 不适合高吞吐、多任务并发系统 |


::: tip

**学习提示：**轮询方式是学习 SPI 通信的最佳起点。建议先用轮询方式调通 TMP125 的温度读取，用逻辑分析仪确认 CS、SCK、MOSI、MISO 四路波形符合 Mode 0 时序，再切换到中断方式。注意 `HAL_SPI_TransmitReceive()` 的超时参数要合理设置（如 100ms），避免硬件异常时程序卡死。

:::




# 温度采集（SPI中断）

## 中断方式原理

中断（Interrupt）方式是指 CPU 启动 SPI 传输后，不再轮询状态位，而是继续执行其他任务；当 SPI 完成发送或接收时，通过 TXE/RXNE 中断请求 CPU，在中断服务程序（ISR）中完成数据的读写和后续处理。

对于 TMP125 温度采集，中断方式的核心流程是：拉低 CS → 调用 `HAL_SPI_TransmitReceive_IT()` 启动非阻塞传输 → CPU 继续执行其他任务 → 每发完/收完一个字节触发 TXE/RXNE 中断，HAL 库在中断中自动搬运数据 → 全部 2 字节传输完成后触发传输完成中断 → 在回调函数中拉高 CS 并解析温度。

### 中断方式与轮询方式的核心区别

| 对比项 | 轮询方式 | 中断方式 |
|-|-|-|
| CPU 状态 | 传输期间阻塞等待 | 传输期间可执行其他任务 |
| 数据搬运 | CPU 在循环中读写 DR | HAL 在 ISR 中自动读写 DR |
| 完成通知 | 函数返回即完成 | 通过回调函数异步通知 |
| 需要配置 | 仅需 GPIO + SPI 初始化 | 需额外配置 NVIC 中断优先级 |
| HAL 函数 | HAL_SPI_TransmitReceive() | HAL_SPI_TransmitReceive_IT() |


::: tip

**补充：**HAL 库的中断式传输内部会使能 TXEIE 和 RXNEIE。TXE 中断触发时，HAL 从发送缓冲区取下一个字节写入 DR；RXNE 中断触发时，HAL 从 DR 读取字节存入接收缓冲区。当发送和接收计数都归零时，HAL 关闭中断并调用 `HAL_SPI_TxRxCpltCallback()` 回调函数。用户无需手动操作中断使能位和状态位。

:::


## HAL 库实现步骤

### 步骤一：GPIO 和 SPI 初始化

GPIO 初始化和 SPI 初始化与轮询方式完全相同（SPI1、PA5/6/7 复用 AF5、PA4 软件片选、主模式、8 位帧、Mode 0、MSB 优先），此处不再重复。

### 步骤二：配置 NVIC 中断优先级

中断方式必须在 NVIC 中使能 SPI1 全局中断，并设置抢占优先级和子优先级。该配置通常在 `HAL_SPI_MspInit()` 回调中完成。

```c
void HAL_SPI_MspInit(SPI_HandleTypeDef* hspi)
{
    if (hspi->Instance == SPI1) {
        __HAL_RCC_SPI1_CLK_ENABLE();

        /* GPIO 配置省略，同轮询方式 */

        /* 配置 SPI1 中断优先级并使能 */
        HAL_NVIC_SetPriority(SPI1_IRQn, 1, 0);  /* 抢占优先级1，子优先级0 */
        HAL_NVIC_EnableIRQ(SPI1_IRQn);
    }
}
```

### 步骤三：编写中断服务函数

在中断向量表对应的 SPI1 中断服务函数中，调用 HAL 库的中断处理函数 `HAL_SPI_IRQHandler()`，由它内部判断 TXE/RXNE/OVR 等中断源并分发处理。

```c
void SPI1_IRQHandler(void)
{
    HAL_SPI_IRQHandler(&hspi1);
}
```

### 步骤四：启动中断方式读取温度

拉低 CS 后，调用 `HAL_SPI_TransmitReceive_IT()` 启动非阻塞传输。该函数立即返回，传输在后台由中断驱动完成。

```c
/* 全局缓冲区，中断回调中需访问 */
uint8_t it_tx_buf[2] = {0x00, 0x00};
uint8_t it_rx_buf[2] = {0};
volatile uint8_t temp_ready = 0;  /* 温度数据就绪标志 */
float it_temperature = 0.0f;

/* 启动一次中断方式温度读取 */
void TMP125_ReadTemp_IT_Start(void)
{
    /* 拉低 CS，选中 TMP125 */
    HAL_GPIO_WritePin(GPIOA, GPIO_PIN_4, GPIO_PIN_RESET);

    /* 启动非阻塞收发，函数立即返回 */
    HAL_SPI_TransmitReceive_IT(&hspi1, it_tx_buf, it_rx_buf, 2);
}
```

### 步骤五：传输完成回调函数

当 2 字节全部收发完成后，HAL 库自动调用 `HAL_SPI_TxRxCpltCallback()`。在回调中拉高 CS、解析温度数据、设置就绪标志。

```c
void HAL_SPI_TxRxCpltCallback(SPI_HandleTypeDef *hspi)
{
    if (hspi->Instance == SPI1) {
        uint16_t raw;
        int16_t  temp_raw;

        /* 1. 拉高 CS，结束通信 */
        HAL_GPIO_WritePin(GPIOA, GPIO_PIN_4, GPIO_PIN_SET);

        /* 2. 组合 16 位原始数据 */
        raw = ((uint16_t)it_rx_buf[0] << 8) | it_rx_buf[1];

        /* 3. 提取 D14~D5 共 10 位有效数据 */
        temp_raw = (int16_t)((raw >> 5) & 0x03FF);

        /* 4. 符号扩展 */
        if (temp_raw & 0x0200) {
            temp_raw |= 0xFC00;
        }

        /* 5. 计算温度 */
        it_temperature = temp_raw * 0.25f;

        /* 6. 设置就绪标志，通知主循环 */
        temp_ready = 1;
    }
}
```

### 步骤六：主函数中的异步处理

主循环通过定时器或任务调度周期性启动读取，然后轮询就绪标志获取结果。在等待传输完成期间，CPU 可以处理其他任务。

```c
int main(void)
{
    HAL_Init();
    SystemClock_Config();
    SPI1_GPIO_Init();
    SPI1_Init();

    uint32_t last_read = 0;

    while (1) {
        /* 每隔 200ms 启动一次中断方式读取 */
        if (HAL_GetTick() - last_read >= 200) {
            last_read = HAL_GetTick();
            TMP125_ReadTemp_IT_Start();
        }

        /* 检查温度是否就绪 */
        if (temp_ready) {
            temp_ready = 0;
            /* 此处可通过串口打印 it_temperature，或送入显示屏 */
        }

        /* CPU 在此期间可以执行其他任务 */
        Other_Task();
    }
}
```

## 中断方式的优缺点与注意事项

### 优缺点总结

| 维度 | 优点 | 缺点 |
|-|-|-|
| CPU 效率 | 传输期间 CPU 可执行其他任务，系统吞吐率高 | — |
| 实现复杂度 | — | 需配置 NVIC、编写 ISR 和回调，异步逻辑较难调试 |
| 实时响应 | 传输完成后立即通过中断通知，延迟低 | 频繁中断会增加上下文切换开销 |
| 数据安全 | — | 全局缓冲区在中断和主循环间共享，需注意 volatile 和竞态 |

### 关键注意事项


::: tip

**1. 缓冲区必须为全局或静态：**`HAL_SPI_TransmitReceive_IT()` 是异步函数，调用返回后缓冲区仍在被中断使用。如果缓冲区是局部变量，函数返回后栈空间被释放，中断中访问会导致数据损坏或 HardFault。

:::



::: tip

**2. 回调中不要执行耗时操作：**`HAL_SPI_TxRxCpltCallback()` 运行在中断上下文中，应只做拉高 CS、解析数据、设置标志等轻量操作。不要在回调中调用 `HAL_Delay()`、串口打印或其他阻塞函数。

:::



::: tip

**3. 防止重复启动传输：**在上一次传输完成之前，不要再次调用 `HAL_SPI_TransmitReceive_IT()`，否则 HAL 会返回 `HAL_BUSY` 状态。可以通过 `HAL_SPI_GetState()` 检查是否为 `HAL_SPI_STATE_READY` 后再启动。

:::



::: tip

**学习提示：**中断方式的调试建议先用一个 LED 或 GPIO 翻转在回调中标记传输完成，用示波器观察 CS 拉低到拉高的时间间隔是否符合预期（2 字节 × 8 位 / 5.25MHz ≈ 3μs）。确认时序正确后再加入温度解析逻辑。如果遇到数据全 0 或全 FF，优先检查 CS 时序、dummy 数据是否误触发掉电模式、以及中断优先级是否被更高优先级中断抢占。

:::
