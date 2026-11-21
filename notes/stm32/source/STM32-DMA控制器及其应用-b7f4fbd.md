# STM32 DMA控制器及其应用

[飞书原文](https://hcn4ticlccda.feishu.cn/docx/Bi8pdEWOpodSD7x57W4cokiAnqc)

# DMA控制器原理

## 1.1 DMA概述

**DMA（Direct Memory Access，直接存储器访问）**是嵌入式系统中用于高效数据传输的机制，它允许外设与存储器、存储器与存储器之间直接进行高速数据传输，**无需CPU干预**。


::: tip

**核心优势：**在大量数据传输场景下，将CPU从数据搬运中解放出来，CPU可同时执行其他任务，显著提升系统整体性能。

:::


**典型应用场景：**

- 串口/UART的大批量数据收发
- ADC多通道连续采样
- SPI/I2S高速音频数据传输
- SDIO/SD卡数据读写
- 存储器间数据拷贝（如内部Flash到RAM）

## 1.2 DMA架构与通道映射

### 1.2.1 硬件架构

以STM32F407为例，芯片内部集成**2个DMA控制器**（DMA1、DMA2），架构如下：

- 每个DMA控制器有 **8个数据流（Stream）**
- 每个数据流有 **8个通道（Channel）**
- **1个数据流每次只能搬运1个通道的数据**


::: tip

**注意：**DMA1仅挂载在APB1总线上，DMA2同时挂载在APB2和AHB总线上。因此**存储器到存储器模式只能使用DMA2**。

:::


### 1.2.2 DMA1请求映射（APB1外设）

| 通道 | 数据流0 | 数据流1 | 数据流2 | 数据流3 | 数据流4 | 数据流5 | 数据流6 | 数据流7 |
|-|-|-|-|-|-|-|-|-|
| 通道0 | SPI3_RX | SPI3_RX | SPI2_RX | SPI2_TX | SPI3_TX | SPI3_TX | — | — |
| 通道1 | I2C1_RX | TIM7_UP | TIM7_UP | I2C1_RX | I2C1_TX | I2C1_TX | — | — |
| 通道2 | TIM4_CH1 | I2S3_EXT_RX | TIM4_CH2 | I2S2_EXT_TX | I2S3_EXT_TX | TIM4_UP | TIM4_CH3 | — |
| 通道3 | I2S3_EXT_RX | TIM2_UP | TIM2_CH3 | I2C3_RX | I2S2_EXT_RX | I2C3_TX | TIM2_CH1 | TIM2_CH2 / TIM2_CH4 / TIM2_UP |
| 通道4 | UART5_RX | USART3_RX | UART4_RX | USART3_TX | UART4_TX | USART2_RX | USART2_TX | UART5_TX |
| 通道5 | UART8_TX | UART7_TX | TIM3_CH4 | TIM3_UP | UART7_RX | TIM3_CH1 | TIM3_TRIG | TIM5_CH2 / TIM5_UP |
| 通道6 | TIM5_CH3 | TIM5_UP | TIM5_CH4 | TIM5_TRIG | TIM5_CH1 | TIM5_CH4 | TIM5_TRIG | — |
| 通道7 | TIM6_UP | I2C2_RX | I2C2_RX | USART3_TX | DAC1 | DAC2 | I2C2_TX | — |

### 1.2.3 DMA2请求映射（APB2/AHB外设）

| 通道 | 数据流0 | 数据流1 | 数据流2 | 数据流3 | 数据流4 | 数据流5 | 数据流6 | 数据流7 |
|-|-|-|-|-|-|-|-|-|
| 通道0 | ADC1 | TIM8_CH1 | TIM8_CH2 | TIM8_CH3 | ADC1 | TIM1_CH1 | TIM1_CH2 | TIM1_CH3 |
| 通道1 | DCMI | ADC2 | ADC2 | SPI6_TX | SPI6_RX | DCMI | — | — |
| 通道2 | ADC3 | ADC3 | SPI5_RX | SPI5_TX | CRYP_OUT | CRYP_IN | HASH_IN | — |
| 通道3 | SPI1_RX | SPI1_RX | SPI1_TX | SPI1_TX | — | — | — | — |
| 通道4 | SPI4_RX | SPI4_TX | USART1_RX | SDIO | USART1_RX | SDIO | USART1_TX | — |
| 通道5 | USART6_RX | USART6_RX | SPI4_RX | SPI4_TX | USART6_TX | USART6_TX | TIM1_UP | TIM1_CH3 |
| 通道6 | TIM1_TRIG | TIM1_CH1 | TIM1_CH2 | TIM1_CH1 | TIM1_CH4 | TIM1_TRIG | TIM1_COM | — |
| 通道7 | TIM8_UP | TIM8_CH1 | TIM8_CH2 | TIM8_CH3 | SPI5_RX | SPI5_TX | TIM8_CH4 | TIM8_TRIG / TIM8_COM |

## 1.3 仲裁机制

DMA仲裁器用于管理多个数据流/通道对系统总线的竞争访问，确保数据传输有序进行。

### 1.3.1 软件优先级

每个数据流的优先级可通过配置寄存器设置，共**4个等级**：

1. **最高优先级（Very High）**
2. **高优先级（High）**
3. **中等优先级（Medium）**
4. **低优先级（Low）**

### 1.3.2 硬件优先级

当两个请求的**软件优先级相同**时，由硬件优先级决定：**编号较低的数据流/通道比编号较高的拥有更高优先权**。


::: tip

**HAL库对应：**在 `DMA_HandleTypeDef.Init.Priority` 中配置，取值为 `DMA_PRIORITY_LOW` / `DMA_PRIORITY_MEDIUM` / `DMA_PRIORITY_HIGH` / `DMA_PRIORITY_VERY_HIGH`。

:::


## 1.4 DMA传输机制

### 1.4.1 DMA事务三要素

每次DMA传输包含以下三项操作：

1. **取数：**从外设数据寄存器或存储器中加载数据（通过DMA_SxPAR或DMA_SxM0AR寻址）
2. **存数：**将加载的数据存储到目标外设或存储器（通过DMA_SxPAR或DMA_SxM0AR寻址）
3. **计数递减：**DMA_SxNDTR计数器在数据存储结束后递减，表示剩余待传输的事务数

要传输的数据项数目及宽度（8位/16位/32位）均可通过软件编程配置。

### 1.4.2 传输方向

数据传输方向由DMA_SxCR寄存器中的DIR[1:0]位配置，共三种模式：

| DIR[1:0] | 模式 | 源地址 | 目标地址 |
|-|-|-|-|
| 00 | 外设到存储器 | 外设控制器（DMA_SxPAR） | 存储器地址（DMA_SxM0AR） |
| 01 | 存储器到外设 | 存储器地址（DMA_SxM0AR） | 外设控制器（DMA_SxPAR） |
| 10 | 存储器到存储器 | 源存储器地址（DMA_SxPAR） | 目标存储器地址（DMA_SxM0AR） |


::: tip

**HAL库对应：**`DMA_HandleTypeDef.Init.Direction`，取值为 `DMA_PERIPH_TO_MEMORY` / `DMA_MEMORY_TO_PERIPH` / `DMA_MEMORY_TO_MEMORY`。

:::


### 1.4.3 指针增量模式

根据DMA_SxCR寄存器中PINC（外设增量）和MINC（存储器增量）位的状态，外设和存储器指针在每次传输后可**自动递增**或**保持常量**。

- **增量模式：**下一次传输地址 = 前一次地址 + 增量值（字节+1，半字+2，字+4）
- **固定模式：**每次传输都访问同一个地址（适用于外设数据寄存器）

增量值由数据宽度决定：PSIZE/MSIZE配置为8位则+1，16位则+2，32位则+4。


::: tip

**HAL库对应：**`Init.PeriphInc`（外设增量）和 `Init.MemInc`（存储器增量），取值为 `DMA_PINC_ENABLE`/`DMA_PINC_DISABLE` 和 `DMA_MINC_ENABLE`/`DMA_MINC_DISABLE`。

:::


### 1.4.4 数据宽度

外设数据宽度（PSIZE）和存储器数据宽度（MSIZE）可独立配置为8位、16位或32位。

- **直接模式下：**源与目标数据宽度必须相等，由PSIZE定义，MSIZE无效
- **FIFO模式下：**源和目标数据宽度可不同，PSIZE和MSIZE独立配置

当PSIZE与MSIZE不相等时，NDTR中配置的传输项数以**外设总线宽度（PSIZE）**为准。例如PSIZE配置为半字（16位），则实际传输字节数 = 2 × NDT。


::: tip

**HAL库对应：**`Init.PeriphDataAlignment` 和 `Init.MemDataAlignment`，取值为 `DMA_PDATAALIGN_BYTE`/`_HALFWORD`/`_WORD`。

:::


## 1.5 FIFO机制

启用FIFO后，每个数据流都有一个独立的**4字（16字节）FIFO**。源地址的数据不会直接搬运到目标地址，而是先存入FIFO，当达到设置的阈值时，DMA再从FIFO中取出数据放入目标。

### 1.5.1 FIFO阈值

FIFO阈值可配置为FIFO容量的1/4、1/2、3/4或满（4/4）。


::: tip

**注意：**存储器到存储器模式**必须使能FIFO**。直接模式（不使用FIFO）下，源和目标数据宽度必须相等。

:::



::: tip

**HAL库对应：**`Init.FIFOMode` 设为 `DMA_FIFOMODE_ENABLE`，`Init.FIFOThreshold` 设为 `DMA_FIFO_THRESHOLD_1QUARTERFULL` / `_HALF` / `_3QUARTERSFULL` / `_FULL`。

:::


## 1.6 传输模式

### 1.6.1 循环模式（Circular Mode）

循环模式用于处理**循环缓冲区**和**连续数据流**（如ADC扫描模式、UART持续接收）。

- 通过DMA_SxCR寄存器中的CIRC位使能
- 激活后，传输数据项数目在数据流配置阶段自动加载初始值，并持续响应DMA请求
- 传输完成后自动重新开始，无需CPU重新配置


::: tip

**HAL库对应：**`Init.Mode = DMA_CIRCULAR`（普通模式为 `DMA_NORMAL`）。

:::


### 1.6.2 双缓冲模式（Double Buffer Mode）

通过将DMA_SxCR寄存器中的DBM位置1使能双缓冲区模式，**存储器到存储器模式不适用**。

- DMA_SxM0AR与DMA_SxM1AR两个存储器地址互相协作
- 每次事务结束时，DMA控制器从一个存储器目标切换为另一个
- 软件在处理一个存储器区域的同时，DMA传输可填充/使用第二个存储器区域
- 实现了"边处理边传输"的流水线效果，特别适合音频、视频等连续数据流


::: tip

**HAL库对应：**`Init.Mode = DMA_DOUBLE_BUFFERING`（需同时配置M0和M1两个地址）。

:::


### 1.6.3 流控制器

控制要传输的数据数目的实体称为流控制器，通过DMA_SxCR寄存器中的PFCTRL位配置：

- **DMA控制器（默认）：**传输数据项数目在使能DMA数据流前由软件写入DMA_SxNDTR寄存器
- **外设流控制器：**当传输数据数目未知时使用，外设通过硬件在最后一个数据时向DMA发出结束信号。仅SDIO等支持此功能的外设可用


::: tip

当外设作为流控制器时，写入DMA_SxNDTR的值无效，使能数据流后硬件会将其强制置为0xFFFF。

:::


## 1.7 搬运模式详解

### 1.7.1 外设到存储器模式

- **源地址：**外设数据寄存器地址（如USART_DR、ADC_DR）
- **目标地址：**存储器中的一段空间（如数组缓冲区）

**直接模式：**每完成一次从外设到存储器的数据传输后，数据立即移出并存储到目标。

**使能FIFO：**每次产生外设请求，数据流启动数据源到FIFO的传输；达到FIFO阈值时，FIFO内容移出并存储到目标。

### 1.7.2 存储器到外设模式

- **源地址：**存储器中的一段空间
- **目标地址：**外设数据寄存器地址

**直接模式：**每完成一次从存储器到外设的数据传输后，数据立即移出并存储到目标。

**使能FIFO：**数据流立即启动传输，从源完全填充FIFO。每次发生外设请求，FIFO内容移出并存储到目标。当FIFO级别小于等于阈值时，使用存储器数据完全重载FIFO。

### 1.7.3 存储器到存储器模式

- **源地址：**存储器中的一段空间
- **目标地址：**存储器中的另一段空间

**必须使能FIFO：**使能数据流后立即开始填充FIFO，达到阈值后FIFO内容移出并存储到目标。此模式下无需外设请求触发，使能后自动连续传输。


::: tip

**注意：**存储器到存储器模式**只能使用DMA2**，且必须使能FIFO，不支持循环模式和双缓冲模式。

:::


## 1.8 常用状态与中断

DMA控制器常用状态标志：

| 状态标志 | 全称 | 说明 |
|-|-|-|
| TCIF | Transfer Complete Interrupt Flag | 传输完成中断标志，全部数据传输完毕时置位 |
| HTIF | Half Transfer Interrupt Flag | 半传输完成中断标志，传输一半数据时置位 |
| TEIF | Transfer Error Interrupt Flag | 数据传输错误中断标志，传输过程中发生总线错误时置位 |
| FEIF | FIFO Error Interrupt Flag | FIFO错误中断标志，FIFO下溢/上溢时置位 |
| DMEIF | Direct Mode Error Interrupt Flag | 直接模式错误中断标志 |


::: tip

**HAL库回调函数：**传输完成调用 `HAL_DMA_XferCpltCallback()`，半传输调用 `HAL_DMA_XferHalfCpltCallback()`，传输错误调用 `HAL_DMA_ErrorCallback()`。外设级回调如 `HAL_UART_RxCpltCallback()`、`HAL_ADC_ConvCpltCallback()` 等由对应外设HAL库在DMA完成后自动调用。

:::


## 1.9 HAL库DMA配置流程

1. 如果使能了数据流,通过重置DMA_SxCR寄存器中的EN位将其禁止。将此位写为0不会立即生效,只有所有当前传输都已完成时才会将其写为0。
2. 在DMA SxPAR寄存器中设置外设端口寄存器地址。
3. 在DMA SxMAOR寄存器(在双缓冲区模式还有DMA SxMA1R寄存器)中设置存储器地址。
4. 在DMA_SxNDTR寄存器中配置要传输的数据项的总数。
5. 使用DMA_SxCR寄存器中的CHSEL[2:0]选择DMA通道(请求),存储器到存储器可跳过。
6. 如果外设用作流控制器而且支持此功能,将DMA_SxCR寄存器中的PFCTRL位置1。
7. 使用DMA_SxCR寄存器中的PL[1:0]位配置数据流优先级。
8. 配置FIFO的使用情况,存储器到存储器必须使能FIFO
9. 配置数据传输方向、外设和存储器增量/固定模式、数据宽度、循环模式、双缓冲区模式和传输完成条件。
10. 通过将DMA_SxCR寄存器中的EN位置1激活数据流。

### 1.9.1 DMA句柄与初始化结构体

HAL库使用 `DMA_HandleTypeDef` 结构体管理DMA，核心初始化字段如下：

```c
typedef struct {
  uint32_t Channel;              // DMA通道（DMA_CHANNEL_0 ~ DMA_CHANNEL_7）
  uint32_t Direction;            // 传输方向
  uint32_t PeriphInc;            // 外设地址增量模式
  uint32_t MemInc;               // 存储器地址增量模式
  uint32_t PeriphDataAlignment;  // 外设数据宽度（字节/半字/字）
  uint32_t MemDataAlignment;     // 存储器数据宽度（字节/半字/字）
  uint32_t Mode;                 // 模式（普通/循环/双缓冲）
  uint32_t Priority;             // 软件优先级
  uint32_t FIFOMode;             // FIFO模式使能/禁用
  uint32_t FIFOThreshold;        // FIFO阈值
  uint32_t MemBurst;             // 存储器突发传输配置
  uint32_t PeriphBurst;          // 外设突发传输配置
} DMA_InitTypeDef;
```

### 1.9.2 配置步骤（HAL库）

1. **使能DMA时钟：**`__HAL_RCC_DMA1_CLK_ENABLE()` 或 `__HAL_RCC_DMA2_CLK_ENABLE()`
2. **配置DMA初始化结构体：**设置通道、方向、增量模式、数据宽度、模式、优先级、FIFO等参数
3. **初始化DMA句柄：**`HAL_DMA_Init(&hdma)`
4. **关联外设句柄：**将DMA句柄关联到对应外设，如 `huart.hdmarx = &hdma`
5. **配置NVIC中断（可选）：**使能DMA数据流中断，设置抢占优先级和子优先级
6. **启动DMA传输：**调用外设HAL函数，如 `HAL_UART_Receive_DMA()`、`HAL_ADC_Start_DMA()`

### 1.9.3 常用HAL库DMA函数

```c
// DMA基础操作
HAL_StatusTypeDef HAL_DMA_Init(DMA_HandleTypeDef *hdma);
HAL_StatusTypeDef HAL_DMA_DeInit(DMA_HandleTypeDef *hdma);
HAL_StatusTypeDef HAL_DMA_Start(DMA_HandleTypeDef *hdma, uint32_t SrcAddress, uint32_t DstAddress, uint32_t DataLength);
HAL_StatusTypeDef HAL_DMA_Start_IT(DMA_HandleTypeDef *hdma, uint32_t SrcAddress, uint32_t DstAddress, uint32_t DataLength);
HAL_StatusTypeDef HAL_DMA_Abort(DMA_HandleTypeDef *hdma);
HAL_StatusTypeDef HAL_DMA_Abort_IT(DMA_HandleTypeDef *hdma);
HAL_StatusTypeDef HAL_DMA_PollForTransfer(DMA_HandleTypeDef *hdma, HAL_DMA_LevelCompleteTypeDef CompleteLevel, uint32_t Timeout);

// 中断处理
void HAL_DMA_IRQHandler(DMA_HandleTypeDef *hdma);

// 回调函数（用户可重写）
void HAL_DMA_XferCpltCallback(DMA_HandleTypeDef *hdma);
void HAL_DMA_XferHalfCpltCallback(DMA_HandleTypeDef *hdma);
void HAL_DMA_ErrorCallback(DMA_HandleTypeDef *hdma);
void HAL_DMA_AbortCpltCallback(DMA_HandleTypeDef *hdma);
```

### 1.9.4 外设级DMA启动函数（常用）

```c
// UART串口DMA
HAL_UART_Transmit_DMA(&huart1, pData, Size);   // DMA发送
HAL_UART_Receive_DMA(&huart1, pData, Size);     // DMA接收
HAL_UART_DMAStop(&huart1);                        // 停止DMA

// ADC DMA
HAL_ADC_Start_DMA(&hadc1, pData, Length);        // 启动ADC DMA转换
HAL_ADC_Stop_DMA(&hadc1);                          // 停止ADC DMA

// SPI DMA
HAL_SPI_Transmit_DMA(&hspi1, pData, Size);       // SPI DMA发送
HAL_SPI_Receive_DMA(&hspi1, pData, Size);        // SPI DMA接收
HAL_SPI_TransmitReceive_DMA(&hspi1, pTxData, pRxData, Size); // 全双工

// TIM DMA
HAL_TIM_PWM_Start_DMA(&htim1, TIM_CHANNEL_1, pData, Length);
HAL_TIM_OC_Start_DMA(&htim1, TIM_CHANNEL_1, pData, Length);
```


::: tip

**学习要点总结：**
1. DMA的核心价值是"解放CPU"，适合大批量、连续数据传输
2. STM32F4有2个DMA控制器，各8个数据流，各8个通道，注意通道映射表
3. 配置三要素：方向（外设↔存储器）、增量模式（指针是否自增）、数据宽度
4. FIFO用于解耦源和目标速率，存储器到存储器必须开FIFO
5. 循环模式适合连续流，双缓冲模式适合"边传边处理"
6. HAL库通过DMA_HandleTypeDef统一管理，外设级函数（如HAL_UART_Receive_DMA）内部自动完成DMA关联和启动

:::




# STM32CubeMX DMA接口介绍

## 2.1 DMA寄存器映射

### 2.1.1 DMA控制器基址

| 控制器 | 基址 | 所属总线 |
|-|-|-|
| DMA1 | 0x40026000 | AHB1 |
| DMA2 | 0x40026400 | AHB1 |

### 2.1.2 寄存器映射表

| 寄存器 | 名称 | 偏移地址 |
|-|-|-|
| DMA_LISR | DMA低中断状态寄存器 | 0x00 |
| DMA_HISR | DMA高中断状态寄存器 | 0x04 |
| DMA_LIFCR | DMA低中断标志清零寄存器 | 0x08 |
| DMA_HIFCR | DMA高中断标志清零寄存器 | 0x0C |
| DMA_SxCR | DMA数据流x配置寄存器 | 0x10 + 0x18×数据流编号 |
| DMA_SxNDTR | DMA数据流x数据项数寄存器 | 0x14 + 0x18×数据流编号 |
| DMA_SxPAR | DMA数据流x外设地址寄存器 | 0x18 + 0x18×数据流编号 |
| DMA_SxM0AR | DMA数据流x存储器0地址寄存器 | 0x1C + 0x18×数据流编号 |
| DMA_SxM1AR | DMA数据流x存储器1地址寄存器 | 0x20 + 0x18×数据流编号 |
| DMA_SxFCR | DMA数据流xFIFO控制寄存器 | 0x24 + 0x18×数据流编号 |


::: tip

**说明：**每个数据流占用0x18（24）字节的寄存器空间，8个数据流连续排列。中断状态寄存器分为低（LISR/LIFCR，数据流0\~3）和高（HISR/HIFCR，数据流4\~7）两组。HAL库已封装所有寄存器操作，日常开发无需直接操作寄存器。

:::


## 2.2 HAL库接口

### 2.2.1 DMA初始化结构体

HAL库使用 `DMA_InitTypeDef` 结构体配置DMA参数，所有字段均需在初始化前赋值：

```c
typedef struct {
  uint32_t Channel;             // 数据流的通道编号（DMA_CHANNEL_0 ~ DMA_CHANNEL_7）
  uint32_t Direction;           // 数据传输方向
  uint32_t PeriphInc;           // 外设地址递增模式
  uint32_t MemInc;              // 存储器地址递增模式
  uint32_t PeriphDataAlignment; // 外设数据宽度
  uint32_t MemDataAlignment;    // 存储器数据宽度
  uint32_t Mode;                // DMA传输模式（普通/循环/双缓冲）
  uint32_t Priority;            // 数据流优先级
  uint32_t FIFOMode;            // 直接模式/FIFO模式
  uint32_t FIFOThreshold;       // FIFO阈值级别
  uint32_t MemBurst;            // 存储器突发传输模式
  uint32_t PeriphBurst;         // 外设突发传输模式
} DMA_InitTypeDef;
```

### 2.2.2 各字段取值速查

| 字段 | 可选值 | 说明 |
|-|-|-|
| Channel | DMA_CHANNEL_0 \~ DMA_CHANNEL_7 | 通道选择，需对照请求映射表 |
| Direction | DMA_PERIPH_TO_MEMORY / DMA_MEMORY_TO_PERIPH / DMA_MEMORY_TO_MEMORY | 传输方向 |
| PeriphInc | DMA_PINC_ENABLE / DMA_PINC_DISABLE | 外设地址是否自增 |
| MemInc | DMA_MINC_ENABLE / DMA_MINC_DISABLE | 存储器地址是否自增 |
| PeriphDataAlignment | DMA_PDATAALIGN_BYTE / \_HALFWORD / \_WORD | 外设数据宽度（8/16/32位） |
| MemDataAlignment | DMA_MDATAALIGN_BYTE / \_HALFWORD / \_WORD | 存储器数据宽度（8/16/32位） |
| Mode | DMA_NORMAL / DMA_CIRCULAR / DMA_DOUBLE_BUFFERING | 传输模式 |
| Priority | DMA_PRIORITY_LOW / \_MEDIUM / \_HIGH / \_VERY_HIGH | 软件优先级 |
| FIFOMode | DMA_FIFOMODE_DISABLE / DMA_FIFOMODE_ENABLE | FIFO使能（禁用即直接模式） |
| FIFOThreshold | DMA_FIFO_THRESHOLD_1QUARTERFULL / \_HALF / \_3QUARTERSFULL / \_FULL | FIFO阈值 |
| MemBurst | DMA_MBURST_SINGLE / \_INCR4 / \_INCR8 / \_INCR16 | 存储器突发传输 |
| PeriphBurst | DMA_PBURST_SINGLE / \_INCR4 / \_INCR8 / \_INCR16 | 外设突发传输 |

### 2.2.3 HAL_DMA_Init — 初始化DMA

```c
HAL_StatusTypeDef HAL_DMA_Init(DMA_HandleTypeDef *hdma);

// 参数：hdma — DMA句柄指针，包含初始化配置和状态信息
// 返回值：HAL_OK（成功）/ HAL_ERROR（失败）/ HAL_BUSY（忙）/ HAL_TIMEOUT（超时）
```

**功能：**根据句柄中Init结构体的配置，初始化对应DMA数据流的所有寄存器，使能DMA时钟，并将句柄与数据流绑定。

### 2.2.4 HAL_DMA_Start — 启动DMA传输（轮询方式）

```c
HAL_StatusTypeDef HAL_DMA_Start(DMA_HandleTypeDef *hdma,
                                 uint32_t SrcAddress,
                                 uint32_t DstAddress,
                                 uint32_t DataLength);

// 参数：
//   hdma       — DMA句柄
//   SrcAddress — 源地址（外设寄存器地址或存储器地址）
//   DstAddress — 目标地址
//   DataLength — 要传输的数据项数目（以NDTR为准，最大65535）
// 返回值：HAL_OK / HAL_ERROR / HAL_BUSY
```

**功能：**配置源地址、目标地址和数据长度，然后使能数据流启动传输。此函数不使用中断，传输完成后需通过 `HAL_DMA_PollForTransfer()` 轮询等待。

### 2.2.5 HAL_DMA_Start_IT — 启动DMA传输（中断方式）

```c
HAL_StatusTypeDef HAL_DMA_Start_IT(DMA_HandleTypeDef *hdma,
                                     uint32_t SrcAddress,
                                     uint32_t DstAddress,
                                     uint32_t DataLength);

// 参数与 HAL_DMA_Start 相同
// 返回值：HAL_OK / HAL_ERROR / HAL_BUSY
```

**功能：**与HAL_DMA_Start类似，但同时使能传输完成中断（TC）、半传输中断（HT）和传输错误中断（TE）。传输完成后自动触发中断，调用对应的回调函数。

### 2.2.6 HAL_UART_Transmit_DMA — 串口DMA发送

```c
HAL_StatusTypeDef HAL_UART_Transmit_DMA(UART_HandleTypeDef *huart,
                                          const uint8_t *pData,
                                          uint16_t Size);

// 参数：
//   huart — UART句柄（需已关联DMA发送句柄）
//   pData — 要发送数据的首地址
//   Size  — 要发送的字节数
// 返回值：HAL_OK / HAL_ERROR / HAL_BUSY
```

**功能：**以DMA方式启动串口发送。函数内部自动配置DMA源地址（pData）、目标地址（UART_DR）和数据长度，使能DMA和UART的DMA发送请求。发送完成后触发中断，调用 `HAL_UART_TxCpltCallback()`。

### 2.2.7 HAL_UART_Receive_DMA — 串口DMA接收

```c
HAL_StatusTypeDef HAL_UART_Receive_DMA(UART_HandleTypeDef *huart,
                                         uint8_t *pData,
                                         uint16_t Size);

// 参数：
//   huart — UART句柄（需已关联DMA接收句柄）
//   pData — 存放接收数据的缓冲区首地址
//   Size  — 要接收的字节数
// 返回值：HAL_OK / HAL_ERROR / HAL_BUSY
```

**功能：**以DMA方式启动串口接收。函数内部自动配置DMA源地址（UART_DR）、目标地址（pData）和数据长度。接收完成后触发中断，调用 `HAL_UART_RxCpltCallback()`。

### 2.2.8 其他常用HAL库DMA函数

```c
// 中止DMA传输
HAL_StatusTypeDef HAL_DMA_Abort(DMA_HandleTypeDef *hdma);
HAL_StatusTypeDef HAL_DMA_Abort_IT(DMA_HandleTypeDef *hdma);  // 中断方式中止

// 轮询等待传输完成
HAL_StatusTypeDef HAL_DMA_PollForTransfer(DMA_HandleTypeDef *hdma,
                                            HAL_DMA_LevelCompleteTypeDef CompleteLevel,
                                            uint32_t Timeout);
// CompleteLevel: HAL_DMA_FULL_TRANSFER（全部完成）/ HAL_DMA_HALF_TRANSFER（半传输）

// 中断服务函数（需在中断向量中调用）
void HAL_DMA_IRQHandler(DMA_HandleTypeDef *hdma);

// 回调函数（用户可重写，__weak 弱定义）
void HAL_DMA_XferCpltCallback(DMA_HandleTypeDef *hdma);       // 传输完成
void HAL_DMA_XferHalfCpltCallback(DMA_HandleTypeDef *hdma);   // 半传输完成
void HAL_DMA_ErrorCallback(DMA_HandleTypeDef *hdma);           // 传输错误
void HAL_DMA_AbortCpltCallback(DMA_HandleTypeDef *hdma);       // 中止完成
```

## 2.3 CubeIDE DMA配置流程


::: tip

**说明：**STM32CubeIDE 内置了 STM32CubeMX 的图形化配置功能（.ioc 文件），配置流程与 CubeMX 完全一致。以下步骤基于 CubeIDE 1.x 版本，以 USART1 的 DMA 收发为例。

:::


### 2.3.1 步骤一：打开 .ioc 配置文件

1. 在 CubeIDE 项目资源管理器中，双击项目根目录下的 `xxx.ioc` 文件
2. 进入 Device Configuration Tool（设备配置工具）界面
3. 左侧为外设列表，中间为芯片引脚视图，右侧为参数配置区

### 2.3.2 步骤二：配置外设并启用DMA

1. 在左侧 **Categories** 中展开 **Connectivity**，点击 **USART1**
2. 在右侧 **Mode** 中选择 **Asynchronous**（异步模式）
3. 切换到 **DMA Settings** 标签页
4. 点击 **Add** 按钮，分别添加：  

   - **USART1_RX**（DMA接收）— 方向：Peripheral To Memory
   - **USART1_TX**（DMA发送）— 方向：Memory To Peripheral
5. CubeIDE 会自动根据DMA请求映射表分配对应的DMA控制器、数据流和通道


::: tip

**提示：**点击 DMA Settings 中的某一项，可以在下方看到自动分配的 DMA 控制器（DMA1/DMA2）、数据流（Stream）和通道（Channel）。如需手动修改，可在下拉框中选择其他可用的数据流/通道组合。

:::


### 2.3.3 步骤三：配置DMA参数

在 DMA Settings 列表中选中某一项，下方会显示详细参数配置：

| 参数 | 推荐配置（串口收发） | 说明 |
|-|-|-|
| Mode | Normal（普通）或 Circular（循环） | 接收不定长数据常用 Circular + IDLE 中断 |
| Memory Address Increment | Increment（增量） | 存储器指针每次传输后自增 |
| Peripheral Address Increment | No Increment（固定） | 外设数据寄存器地址固定 |
| Memory Data Width | Byte（字节） | 串口数据按字节传输 |
| Peripheral Data Width | Byte（字节） | 与存储器宽度一致 |
| Priority | Medium / High | 根据实时性需求选择 |
| Use Fifo | Disable（直接模式） | 串口收发数据宽度一致，直接模式即可 |

### 2.3.4 步骤四：配置NVIC中断

1. 切换到 **NVIC Settings** 标签页（在USART1配置页内）
2. 勾选 **USART1 global interrupt**（使能串口全局中断，用于IDLE等）
3. 在左侧 **System Core** → **NVIC** 中，确认对应的DMA数据流中断已使能：  

   - DMA1 Stream5 global interrupt（USART1_RX，根据实际分配）
   - DMA1 Stream6 global interrupt（USART1_TX，根据实际分配）
4. 设置中断优先级（Preemption Priority 和 Sub Priority）


::: tip

**注意：**如果使用 HAL_UART_Transmit_DMA / HAL_UART_Receive_DMA，CubeIDE 生成代码时会自动使能对应的DMA数据流中断。但如果需要使用串口IDLE中断实现不定长接收，必须手动使能 USART1 global interrupt。

:::


### 2.3.5 步骤五：生成代码

1. 点击右上角 **GENERATE CODE** 按钮（或快捷键 Ctrl+Shift+G）
2. 等待代码生成完成，CubeIDE 会自动更新以下文件：  

   - `main.c` — 新增 MX_DMA_Init() 调用和外设初始化
   - `stm32f4xx_it.c` — 新增DMA数据流中断服务函数
   - `stm32f4xx_hal_msp.c` — 新增DMA初始化和外设MSP初始化代码
3. 生成完成后点击 **Close** 关闭弹窗

### 2.3.6 生成代码结构说明

生成代码后，DMA相关代码分布在以下位置：

```c
/* 全局DMA句柄 */
DMA_HandleTypeDef hdma_usart1_rx;
DMA_HandleTypeDef hdma_usart1_tx;

/* DMA初始化函数（由CubeMX生成） */
static void MX_DMA_Init(void)
{
  /* DMA controller clock enable */
  __HAL_RCC_DMA2_CLK_ENABLE();

  /* DMA interrupt init */
  /* DMA2_Stream2_IRQn interrupt configuration */
  HAL_NVIC_SetPriority(DMA2_Stream2_IRQn, 0, 0);
  HAL_NVIC_EnableIRQ(DMA2_Stream2_IRQn);
  /* DMA2_Stream7_IRQn interrupt configuration */
  HAL_NVIC_SetPriority(DMA2_Stream7_IRQn, 0, 0);
  HAL_NVIC_EnableIRQ(DMA2_Stream7_IRQn);
}
```

```c
void HAL_UART_MspInit(UART_HandleTypeDef* huart)
{
  GPIO_InitTypeDef GPIO_InitStruct = {0};
  if(huart->Instance==USART1)
  {
    /* 使能时钟 */
    __HAL_RCC_USART1_CLK_ENABLE();
    __HAL_RCC_GPIOA_CLK_ENABLE();

    /* 配置GPIO */
    GPIO_InitStruct.Pin = GPIO_PIN_9|GPIO_PIN_10;
    GPIO_InitStruct.Mode = GPIO_MODE_AF_PP;
    GPIO_InitStruct.Pull = GPIO_NOPULL;
    GPIO_InitStruct.Speed = GPIO_SPEED_FREQ_VERY_HIGH;
    GPIO_InitStruct.Alternate = GPIO_AF7_USART1;
    HAL_GPIO_Init(GPIOA, &GPIO_InitStruct);

    /* USART1 DMA 初始化 */
    hdma_usart1_rx.Instance = DMA2_Stream2;
    hdma_usart1_rx.Init.Channel = DMA_CHANNEL_4;
    hdma_usart1_rx.Init.Direction = DMA_PERIPH_TO_MEMORY;
    hdma_usart1_rx.Init.PeriphInc = DMA_PINC_DISABLE;
    hdma_usart1_rx.Init.MemInc = DMA_MINC_ENABLE;
    hdma_usart1_rx.Init.PeriphDataAlignment = DMA_PDATAALIGN_BYTE;
    hdma_usart1_rx.Init.MemDataAlignment = DMA_MDATAALIGN_BYTE;
    hdma_usart1_rx.Init.Mode = DMA_NORMAL;
    hdma_usart1_rx.Init.Priority = DMA_PRIORITY_MEDIUM;
    hdma_usart1_rx.Init.FIFOMode = DMA_FIFOMODE_DISABLE;
    HAL_DMA_Init(&hdma_usart1_rx);

    /* 关联DMA句柄到UART句柄 */
    __HAL_LINKDMA(huart, hdmarx, hdma_usart1_rx);

    /* USART1_TX 类似... */
    hdma_usart1_tx.Instance = DMA2_Stream7;
    hdma_usart1_tx.Init.Channel = DMA_CHANNEL_4;
    hdma_usart1_tx.Init.Direction = DMA_MEMORY_TO_PERIPH;
    /* ... 其他参数 ... */
    HAL_DMA_Init(&hdma_usart1_tx);
    __HAL_LINKDMA(huart, hdmatx, hdma_usart1_tx);
  }
}
```

```c
/* DMA2_Stream2 中断服务函数（USART1_RX） */
void DMA2_Stream2_IRQHandler(void)
{
  HAL_DMA_IRQHandler(&hdma_usart1_rx);
}

/* DMA2_Stream7 中断服务函数（USART1_TX） */
void DMA2_Stream7_IRQHandler(void)
{
  HAL_DMA_IRQHandler(&hdma_usart1_tx);
}
```

## 2.4 代码使用示例

### 2.4.1 串口DMA发送示例

```c
/* 定义发送缓冲区 */
uint8_t tx_buffer[] = "Hello, DMA UART!\r\n";

int main(void)
{
  HAL_Init();
  SystemClock_Config();
  MX_GPIO_Init();
  MX_DMA_Init();       // DMA初始化
  MX_USART1_UART_Init(); // 串口初始化（内部关联DMA）

  /* 启动DMA发送 */
  HAL_UART_Transmit_DMA(&huart1, tx_buffer, sizeof(tx_buffer) - 1);

  while (1)
  {
    /* CPU可以执行其他任务，发送由DMA自动完成 */
  }
}

/* 发送完成回调函数（在main.c中重写） */
void HAL_UART_TxCpltCallback(UART_HandleTypeDef *huart)
{
  if(huart->Instance == USART1)
  {
    /* 发送完成后的处理，例如翻转LED指示 */
    HAL_GPIO_TogglePin(GPIOA, GPIO_PIN_5);
  }
}
```

### 2.4.2 串口DMA接收示例（固定长度）

```c
/* 定义接收缓冲区 */
uint8_t rx_buffer[32];

int main(void)
{
  HAL_Init();
  SystemClock_Config();
  MX_GPIO_Init();
  MX_DMA_Init();
  MX_USART1_UART_Init();

  /* 启动DMA接收，等待接收32字节数据 */
  HAL_UART_Receive_DMA(&huart1, rx_buffer, 32);

  while (1)
  {
    /* CPU可以执行其他任务 */
  }
}

/* 接收完成回调函数 */
void HAL_UART_RxCpltCallback(UART_HandleTypeDef *huart)
{
  if(huart->Instance == USART1)
  {
    /* 32字节数据接收完成，处理rx_buffer中的数据 */
    // ... 数据处理 ...

    /* 重新启动DMA接收（如果需要持续接收） */
    HAL_UART_Receive_DMA(&huart1, rx_buffer, 32);
  }
}
```

### 2.4.3 串口DMA接收示例（不定长 + IDLE中断）


::: tip

**实用技巧：**实际项目中串口接收数据长度往往不固定，推荐使用 **循环DMA + IDLE空闲中断** 方案。DMA循环写入缓冲区，当串口总线空闲（一帧数据结束）时触发IDLE中断，在中断中计算已接收数据长度并处理。

:::


```c
/* 缓冲区定义 */
#define RX_BUF_SIZE  256
uint8_t rx_buffer[RX_BUF_SIZE];
volatile uint16_t rx_len = 0;  // 本次接收数据长度
volatile uint8_t  rx_flag = 0; // 接收完成标志

int main(void)
{
  HAL_Init();
  SystemClock_Config();
  MX_GPIO_Init();
  MX_DMA_Init();
  MX_USART1_UART_Init();

  /* 使能IDLE中断 */
  __HAL_UART_ENABLE_IT(&huart1, UART_IT_IDLE);

  /* 启动循环DMA接收 */
  HAL_UART_Receive_DMA(&huart1, rx_buffer, RX_BUF_SIZE);

  while (1)
  {
    if(rx_flag)
    {
      rx_flag = 0;
      /* 处理 rx_buffer[0..rx_len-1] 的数据 */
      // ... 数据处理 ...
    }
  }
}

/* 重写串口中断服务函数（在stm32f4xx_it.c中） */
void USART1_IRQHandler(void)
{
  /* 判断IDLE中断 */
  if(__HAL_UART_GET_FLAG(&huart1, UART_FLAG_IDLE) != RESET)
  {
    /* 清除IDLE标志（先读SR再读DR） */
    __HAL_UART_CLEAR_IDLEFLAG(&huart1);

    /* 暂停DMA，计算已接收数据长度 */
    HAL_UART_DMAStop(&huart1);
    rx_len = RX_BUF_SIZE - __HAL_DMA_GET_COUNTER(&hdma_usart1_rx);
    rx_flag = 1;

    /* 重新启动循环DMA接收 */
    HAL_UART_Receive_DMA(&huart1, rx_buffer, RX_BUF_SIZE);
  }

  /* HAL库中断处理（处理其他中断源） */
  HAL_UART_IRQHandler(&huart1);
}
```

## 2.5 常见问题与注意事项

1. **DMA传输没有启动？**

   - 检查DMA时钟是否使能（`__HAL_RCC_DMAx_CLK_ENABLE()`）
   - 检查外设是否使能了DMA请求（如 `__HAL_UART_ENABLE_IT()` 或外设CR寄存器的DM位）
   - 检查DMA句柄是否正确关联到外设句柄（`__HAL_LINKDMA()`）
2. **传输完成回调没有触发？**

   - 检查NVIC中对应DMA数据流中断是否使能
   - 检查中断服务函数中是否调用了 `HAL_DMA_IRQHandler()`
   - 确认使用的是 `HAL_DMA_Start_IT()` 或外设级DMA函数（而非 `HAL_DMA_Start()`）
3. **存储器到存储器模式失败？**

   - 存储器到存储器只能使用DMA2，不能使用DMA1
   - 必须使能FIFO（`DMA_FIFOMODE_ENABLE`）
   - 不支持循环模式和双缓冲模式
4. **数据错位或丢失？**

   - 检查PSIZE和MSIZE是否与实际数据宽度匹配
   - 直接模式下PSIZE必须等于MSIZE
   - 检查增量模式配置是否正确（外设通常不增量，存储器通常增量）
5. **CubeIDE生成代码后修改丢失？**

   - 用户代码必须写在 `/* USER CODE BEGIN */` 和 `/* USER CODE END */` 注释之间
   - 回调函数建议写在main.c的USER CODE区域，不要修改生成的初始化代码


::: tip

**本章要点总结：**
1. HAL库通过 DMA_HandleTypeDef 统一管理DMA，初始化结构体覆盖所有配置参数
2. 核心函数：HAL_DMA_Init（初始化）、HAL_DMA_Start_IT（中断启动）、外设级函数如 HAL_UART_Transmit_DMA
3. CubeIDE配置流程：.ioc → 外设Mode → DMA Settings添加 → 参数配置 → NVIC中断 → GENERATE CODE
4. 生成代码自动完成：时钟使能、DMA初始化、句柄关联（\_\_HAL_LINKDMA）、中断服务函数
5. 实际项目推荐：串口接收用 循环DMA + IDLE中断 实现不定长数据接收
6. 用户代码必须写在 USER CODE 注释块内，避免重新生成时被覆盖

:::


# DMA串口接收实验

## 3.1 实验目的

1. 理解DMA串口接收的工作原理和数据流向
2. 掌握CubeIDE中USART + DMA的图形化配置方法
3. 掌握 `HAL_UART_Receive_DMA()` 函数的使用
4. 掌握固定长度接收和不定长接收（循环DMA + IDLE中断）两种方案
5. 理解DMA接收完成回调函数的编写和使用

## 3.2 实验原理

### 3.2.1 DMA串口接收数据流向

DMA串口接收的本质是：当串口收到数据后，硬件自动将数据从USART数据寄存器（DR）搬运到内存缓冲区，**整个过程不需要CPU参与**。


::: tip

**数据流向：**外部设备 → USART_RX引脚 → USART_DR寄存器 → DMA控制器 → 存储器缓冲区（数组）
**传输方向：**外设到存储器（Peripheral To Memory）
**源地址：**USART_DR寄存器地址（固定，不增量）
**目标地址：**存储器缓冲区首地址（自增，每次+1字节）

:::


### 3.2.2 DMA通道选择（以STM32F407 USART1为例）

| 参数 | 配置值 | 说明 |
|-|-|-|
| DMA控制器 | DMA2 | USART1挂载在APB2，对应DMA2 |
| 数据流 | Stream2 | USART1_RX默认映射 |
| 通道 | Channel4 | USART1_RX在Stream2上的通道 |
| 传输方向 | Peripheral To Memory | 外设到存储器 |
| 数据宽度 | Byte（8位） | 串口按字节传输 |
| 外设增量 | Disable（固定） | DR寄存器地址固定 |
| 存储器增量 | Enable（自增） | 缓冲区地址每次+1 |


::: tip

**提示：**不同串口对应的DMA控制器、数据流和通道不同。CubeIDE会在添加DMA时自动分配，也可手动在下拉框中选择其他可用组合。USART2/3对应DMA1，USART1/6对应DMA2。

:::


### 3.2.3 接收完成机制

DMA接收完成有两种触发方式：

- **固定长度完成：**当DMA搬运的字节数达到预设的Size时，触发传输完成中断（TCIF），调用 `HAL_UART_RxCpltCallback()`
- **IDLE空闲中断：**当串口总线检测到空闲帧（一帧数据结束后持续一个字节时间无数据），触发USART IDLE中断，此时可读取DMA剩余计数器计算已接收长度，适用于**不定长数据**接收

## 3.3 硬件设计

### 3.3.1 引脚分配

| 功能 | 引脚 | 复用功能 | 说明 |
|-|-|-|-|
| USART1_TX | PA9 | AF7 | 串口发送（本实验可选） |
| USART1_RX | PA10 | AF7 | 串口接收（本实验使用） |

### 3.3.2 硬件连接

- **方案一（ST-Link虚拟串口）：**开发板上ST-Link的虚拟串口已连接到USART1（PA9/PA10），直接用USB线连接电脑即可
- **方案二（USB转串口模块）：**模块TX接PA10（MCU的RX），模块RX接PA9（MCU的TX），GND共地


::: tip

**注意：**USB转串口模块的TX接MCU的RX，模块的RX接MCU的TX，**交叉连接**。务必共地（GND接GND），否则可能出现乱码或无法通信。

:::


## 3.4 CubeIDE配置步骤

### 3.4.1 配置USART1

1. 双击项目中的 `.ioc` 文件打开设备配置工具
2. 左侧 **Categories → Connectivity → USART1**
3. 右侧 **Mode** 选择 **Asynchronous**（异步模式）
4. **Parameter Settings** 中确认参数：  

   - Baud Rate = 115200
   - Word Length = 8 Bits
   - Parity = None
   - Stop Bits = 1
   - Data Direction = Receive and Transmit

### 3.4.2 添加DMA接收通道

1. 在USART1配置页切换到 **DMA Settings** 标签
2. 点击 **Add** 按钮
3. 在下拉列表中选择 **USART1_RX**
4. CubeIDE自动分配：DMA2、Stream2、Channel4（可手动修改为其他可用组合）

### 3.4.3 配置DMA参数

选中添加的USART1_RX项，在下方配置参数：

| 参数 | 配置值 | 说明 |
|-|-|-|
| Mode | Normal | 普通模式（固定长度接收）；不定长接收选Circular |
| Memory Address Increment | Increment | 存储器地址自增 |
| Peripheral Address Increment | No Increment | 外设地址固定 |
| Memory Data Width | Byte | 存储器数据宽度8位 |
| Peripheral Data Width | Byte | 外设数据宽度8位 |
| Priority | Medium | 中等优先级 |
| Use Fifo | Disable | 直接模式（数据宽度一致，无需FIFO） |

### 3.4.4 配置NVIC中断

1. 切换到 **NVIC Settings** 标签（在USART1配置页内）
2. 勾选 **USART1 global interrupt**（使能串口全局中断，IDLE中断需要）
3. 左侧 **System Core → NVIC** 中确认 **DMA2 Stream2 global interrupt** 已勾选（CubeIDE自动使能）
4. 设置中断优先级（如抢占优先级5，子优先级0）

### 3.4.5 生成代码

1. 点击右上角 **GENERATE CODE**（或 Ctrl+Shift+G）
2. 等待生成完成，点击 **Close**
3. 生成的关键代码位于：  

   - `main.c` — MX_USART1_UART_Init()、MX_DMA_Init()
   - `stm32f4xx_hal_msp.c` — HAL_UART_MspInit()（DMA初始化+句柄关联）
   - `stm32f4xx_it.c` — DMA2_Stream2_IRQHandler()、USART1_IRQHandler()

## 3.5 代码实现

### 3.5.1 方案一：固定长度接收（基础版）

适用于接收数据长度固定的场景，如通信协议中固定长度的指令帧。

```c
/* USER CODE BEGIN PV */
#define RX_LEN  10                 // 固定接收10字节
uint8_t rx_buffer[RX_LEN];         // 接收缓冲区
volatile uint8_t rx_done = 0;      // 接收完成标志
/* USER CODE END PV */

int main(void)
{
  HAL_Init();
  SystemClock_Config();
  MX_GPIO_Init();
  MX_DMA_Init();
  MX_USART1_UART_Init();

  /* 启动DMA接收，等待接收10字节 */
  HAL_UART_Receive_DMA(&huart1, rx_buffer, RX_LEN);

  while (1)
  {
    if(rx_done)
    {
      rx_done = 0;
      /* 接收到10字节数据，处理rx_buffer */
      // ... 数据处理 ...

      /* 重新启动DMA接收（如需持续接收） */
      HAL_UART_Receive_DMA(&huart1, rx_buffer, RX_LEN);
    }
  }
}

/* USER CODE BEGIN 4 */
/* DMA接收完成回调函数 */
void HAL_UART_RxCpltCallback(UART_HandleTypeDef *huart)
{
  if(huart->Instance == USART1)
  {
    rx_done = 1;  // 设置接收完成标志
  }
}
/* USER CODE END 4 */
```


::: tip

**代码说明：**
1. `HAL_UART_Receive_DMA()` 启动后立即返回，CPU继续执行while(1)中的其他任务
2. 当10字节数据全部接收完成后，硬件触发DMA中断，自动调用 `HAL_UART_RxCpltCallback()`
3. 回调函数中设置标志位，在主循环中处理数据（避免在中断中做耗时操作）
4. 处理完成后需重新调用 `HAL_UART_Receive_DMA()` 才能继续接收（Normal模式下传输完成后DMA停止）

:::


### 3.5.2 方案二：循环DMA + IDLE中断（不定长接收，推荐）

适用于实际项目中最常见的**不定长数据接收**场景。DMA循环写入缓冲区，串口空闲时触发IDLE中断，在中断中计算已接收数据长度。

```c
/* USER CODE BEGIN PV */
#define RX_BUF_SIZE  256              // 接收缓冲区大小
uint8_t rx_buffer[RX_BUF_SIZE];       // DMA接收缓冲区
volatile uint16_t rx_len = 0;         // 本次接收数据长度
volatile uint8_t  rx_flag = 0;        // 接收完成标志
/* USER CODE END PV */

int main(void)
{
  HAL_Init();
  SystemClock_Config();
  MX_GPIO_Init();
  MX_DMA_Init();
  MX_USART1_UART_Init();

  /* 使能USART1 IDLE中断 */
  __HAL_UART_ENABLE_IT(&huart1, UART_IT_IDLE);

  /* 启动循环DMA接收 */
  HAL_UART_Receive_DMA(&huart1, rx_buffer, RX_BUF_SIZE);

  while (1)
  {
    if(rx_flag)
    {
      rx_flag = 0;
      /* 处理 rx_buffer[0 .. rx_len-1] 的数据 */
      // 例如：将收到的数据回发
      HAL_UART_Transmit(&huart1, rx_buffer, rx_len, 100);
    }
  }
}

/* USER CODE BEGIN 4 */
/* USART1全局中断服务函数（需在stm32f4xx_it.c中重写） */
/* USER CODE END 4 */
```

```c
/* 在 stm32f4xx_it.c 中找到 USART1_IRQHandler 并修改 */
void USART1_IRQHandler(void)
{
  /* 判断是否为IDLE中断 */
  if(__HAL_UART_GET_FLAG(&huart1, UART_FLAG_IDLE) != RESET)
  {
    /* 清除IDLE中断标志（先读SR再读DR，或用宏清除） */
    __HAL_UART_CLEAR_IDLEFLAG(&huart1);

    /* 暂停DMA传输，读取剩余数据计数器 */
    HAL_UART_DMAStop(&huart1);

    /* 计算已接收数据长度 = 缓冲区总大小 - DMA剩余计数 */
    rx_len = RX_BUF_SIZE - __HAL_DMA_GET_COUNTER(&hdma_usart1_rx);

    /* 设置接收完成标志 */
    rx_flag = 1;

    /* 重新启动循环DMA接收 */
    HAL_UART_Receive_DMA(&huart1, rx_buffer, RX_BUF_SIZE);
  }

  /* HAL库中断处理（处理TXE/TC等其他中断源） */
  HAL_UART_IRQHandler(&huart1);
}
```


::: tip

**IDLE中断原理：**当串口接收完一帧数据后，总线持续空闲超过一个字节的传输时间，硬件自动置位IDLE标志。此时DMA可能还没接满缓冲区，但数据已经发完了，正好可以在IDLE中断里读取DMA计数器算出实际收到了多少字节。

:::



::: tip

**注意事项：**
1. `__HAL_UART_CLEAR_IDLEFLAG()` 宏的本质是先读SR再读DR，必须在DMA Stop之前或之后正确调用，否则可能丢失第一个字节
2. `HAL_UART_DMAStop()` 会同时停止TX和RX的DMA，如果只使用RX可直接操作DMA句柄
3. 循环模式（Circular）下DMA接满缓冲区后自动从头开始，不会停止
4. 缓冲区大小建议大于最大单帧数据长度，避免数据覆盖

:::


### 3.5.3 半传输中断的应用

当使用循环DMA接收大量连续数据时（如音频流），可以利用半传输中断实现"乒乓缓冲"效果：

```c
/* 半传输完成回调（接收一半数据时触发） */
void HAL_UART_RxHalfCpltCallback(UART_HandleTypeDef *huart)
{
  if(huart->Instance == USART1)
  {
    /* 处理前半缓冲区数据 rx_buffer[0 .. RX_BUF_SIZE/2-1] */
    // 此时DMA正在写入后半缓冲区，互不干扰
  }
}

/* 全部传输完成回调 */
void HAL_UART_RxCpltCallback(UART_HandleTypeDef *huart)
{
  if(huart->Instance == USART1)
  {
    /* 处理后半缓冲区数据 rx_buffer[RX_BUF_SIZE/2 .. RX_BUF_SIZE-1] */
    // 此时DMA已从头开始写入前半缓冲区
  }
}
```

## 3.6 实验现象与验证

### 3.6.1 固定长度接收实验步骤

1. 编译并下载程序到开发板
2. 打开串口助手（如SSCOM、XCOM、MobaXterm），配置波特率115200、8位数据、无校验、1停止位
3. 串口助手发送恰好10个字节的数据（如"1234567890"）
4. 观察现象：  

   - 程序中rx_done标志置位
   - rx_buffer中存储了收到的10字节数据
   - 可在调试模式下查看rx_buffer数组内容
   - 如果代码中加了回发，串口助手会收到同样的数据
5. 发送不足10字节（如5字节）：不会触发接收完成回调，DMA继续等待剩余数据
6. 发送超过10字节：前10字节触发回调，后续字节丢失（Normal模式下DMA已停止）

### 3.6.2 不定长接收实验步骤

1. 编译并下载程序
2. 打开串口助手，波特率115200
3. 任意长度的数据（如"Hello"、"DMA UART Test"、"123"）
4. 每次发送后，串口助手会收到开发板回发的同样数据
5. 在调试模式下观察：  

   - rx_len = 实际发送的字节数
   - rx_buffer[0..rx_len-1] = 接收到的数据
   - rx_flag 在IDLE中断后置1

### 3.6.3 调试技巧

- **查看DMA寄存器：**调试模式下在SFRs窗口查看DMA2→Stream2→NDTR（剩余数据数），确认DMA是否在工作
- **查看串口状态：**查看USART1→SR寄存器的IDLE、RXNE标志位
- **断点调试：**在 `HAL_UART_RxCpltCallback()` 或 `USART1_IRQHandler()` 中设断点，确认中断是否触发
- **内存查看：**调试时在Memory窗口输入rx_buffer的地址，实时观察缓冲区数据变化

## 3.7 注意事项与常见问题

1. **DMA接收没有反应？**

   - 检查串口助手波特率、数据位、校验位、停止位是否与程序一致
   - 检查TX/RX是否交叉连接，是否共地
   - 检查 `HAL_UART_Receive_DMA()` 是否被调用
   - 检查DMA时钟是否使能（CubeMX生成代码自动处理）
2. **接收完成回调不触发？**

   - 固定长度模式：确认发送的字节数是否等于设定的Size
   - 检查NVIC中DMA数据流中断是否使能
   - 检查中断服务函数中是否调用了 `HAL_DMA_IRQHandler()`
   - 确认回调函数名拼写正确：`HAL_UART_RxCpltCallback`
3. **IDLE中断不触发？**

   - 确认调用了 `__HAL_UART_ENABLE_IT(&huart1, UART_IT_IDLE)`
   - 确认USART1 global interrupt在NVIC中已使能
   - 确认在 `USART1_IRQHandler()` 中添加了IDLE判断代码
   - 部分HAL库版本中 `__HAL_UART_CLEAR_IDLEFLAG()` 宏定义不同，确认清除方式正确
4. **接收数据乱码？**

   - 波特率不匹配（最常见）
   - 时钟配置错误，导致实际波特率偏差
   - USB转串口模块质量问题或驱动问题
   - 电源噪声干扰，尝试加滤波电容
5. **接收数据丢失第一个字节？**

   - IDLE中断清除标志的顺序问题：应先清除IDLE标志，再处理数据
   - 在重新启动DMA之前，确保DR寄存器中的数据已被读取
6. **循环模式下数据覆盖？**

   - 缓冲区大小不足，单帧数据超过缓冲区大小
   - 数据处理速度太慢，DMA已写入新数据但旧数据还没处理完
   - 建议增大缓冲区，或使用双缓冲模式


::: tip

**实验要点总结：**
1. DMA串口接收 = 外设到存储器传输，源地址固定（DR寄存器），目标地址自增（缓冲区）
2. 固定长度接收用 Normal模式 + HAL_UART_Receive_DMA() + RxCpltCallback，简单但不够灵活
3. 不定长接收用 Circular模式 + IDLE中断，实际项目首选方案
4. IDLE中断中通过 \_\_HAL_DMA_GET_COUNTER() 计算已接收长度 = 总大小 - 剩余计数
5. 回调函数中只设标志位，数据处理放在主循环，避免中断耗时
6. CubeIDE配置：USART异步模式 → DMA Settings添加RX → 参数配置 → NVIC使能 → 生成代码

:::




# DMA串口发送实验

## 4.1 实验目的

1. 理解DMA串口发送的工作原理和数据流向
2. 掌握CubeIDE中USART发送DMA的配置方法
3. 掌握 `HAL_UART_Transmit_DMA()` 函数的使用
4. 掌握DMA发送完成回调函数的编写
5. 理解DMA发送与阻塞发送的区别，以及DMA发送的优势

## 4.2 实验原理

### 4.2.1 DMA串口发送数据流向

DMA串口发送的本质是：DMA自动将内存缓冲区中的数据逐个搬运到USART数据寄存器（DR），串口硬件自动将数据移位发送，**整个过程不需要CPU参与**。


::: tip

**数据流向：**存储器缓冲区（数组）→ DMA控制器 → USART_DR寄存器 → USART_TX引脚 → 外部设备
**传输方向：**存储器到外设（Memory To Peripheral）
**源地址：**存储器缓冲区首地址（自增，每次+1字节）
**目标地址：**USART_DR寄存器地址（固定，不增量）

:::


### 4.2.2 DMA通道选择（以STM32F407 USART1为例）

| 参数 | 配置值 | 说明 |
|-|-|-|
| DMA控制器 | DMA2 | USART1挂载在APB2，对应DMA2 |
| 数据流 | Stream7 | USART1_TX默认映射 |
| 通道 | Channel4 | USART1_TX在Stream7上的通道 |
| 传输方向 | Memory To Peripheral | 存储器到外设 |
| 数据宽度 | Byte（8位） | 串口按字节发送 |
| 外设增量 | Disable（固定） | DR寄存器地址固定 |
| 存储器增量 | Enable（自增） | 缓冲区地址每次+1 |

### 4.2.3 发送完成机制

DMA发送完成涉及两个层面的完成：

- **DMA传输完成（TC）：**DMA将所有数据从内存搬运到USART_DR寄存器，触发DMA中断，调用 `HAL_UART_TxCpltCallback()`。注意：此时最后一个字节可能还在串口移位寄存器中未发送出去
- **串口发送完成（TC）：**USART_SR寄存器的TC位置位，表示移位寄存器中的最后一位也已发送完毕，总线空闲。可通过 `__HAL_UART_GET_FLAG()` 轮询或使能USART TC中断等待


::: tip

**重要：**如果在DMA回调后立即切换串口方向（如RS485收发切换）或关闭串口，可能导致最后一个字节丢失。需要等待USART的TC标志置位后再进行后续操作。

:::


### 4.2.4 DMA发送 vs 阻塞发送 vs 中断发送

| 发送方式 | 函数 | CPU占用 | 适用场景 |
|-|-|-|-|
| 阻塞发送 | HAL_UART_Transmit() | 高（全程等待） | 简单、短数据、对实时性要求不高 |
| 中断发送 | HAL_UART_Transmit_IT() | 中（每字节触发中断） | 中等数据量、需要异步 |
| DMA发送 | HAL_UART_Transmit_DMA() | 极低（仅完成时中断一次） | 大数据量、高频发送、追求性能 |

## 4.3 硬件设计

### 4.3.1 引脚分配

| 功能 | 引脚 | 复用功能 | 说明 |
|-|-|-|-|
| USART1_TX | PA9 | AF7 | 串口发送（本实验使用） |
| USART1_RX | PA10 | AF7 | 串口接收（本实验可选） |

### 4.3.2 硬件连接

- **方案一（ST-Link虚拟串口）：**开发板上ST-Link虚拟串口已连接USART1，USB线直接连电脑
- **方案二（USB转串口模块）：**模块RX接PA9（MCU的TX），模块TX接PA10（MCU的RX），GND共地

## 4.4 CubeIDE配置步骤

### 4.4.1 配置USART1

1. 双击 `.ioc` 文件打开设备配置工具
2. 左侧 **Categories → Connectivity → USART1**
3. 右侧 **Mode** 选择 **Asynchronous**
4. **Parameter Settings**：Baud Rate=115200，Word Length=8，Parity=None，Stop Bits=1

### 4.4.2 添加DMA发送通道

1. 切换到 **DMA Settings** 标签
2. 点击 **Add**，选择 **USART1_TX**
3. CubeIDE自动分配：DMA2、Stream7、Channel4

### 4.4.3 配置DMA参数

| 参数 | 配置值 | 说明 |
|-|-|-|
| Mode | Normal | 普通模式，发送完成后停止 |
| Memory Address Increment | Increment | 存储器地址自增 |
| Peripheral Address Increment | No Increment | 外设地址固定 |
| Memory Data Width | Byte | 8位数据宽度 |
| Peripheral Data Width | Byte | 8位数据宽度 |
| Priority | Medium | 中等优先级 |
| Use Fifo | Disable | 直接模式 |

### 4.4.4 配置NVIC中断

1. 切换到 **NVIC Settings** 标签
2. 确认 **DMA2 Stream7 global interrupt** 已勾选（CubeIDE自动使能）
3. 如需等待串口TC，可勾选 **USART1 global interrupt**
4. 设置中断优先级

### 4.4.5 生成代码

1. 点击 **GENERATE CODE**（Ctrl+Shift+G）
2. 生成代码中包含：MX_USART1_UART_Init()、MX_DMA_Init()、HAL_UART_MspInit()（含DMA发送初始化和\_\_HAL_LINKDMA关联）、DMA2_Stream7_IRQHandler()

## 4.5 代码实现

### 4.5.1 基本DMA发送

```c
/* USER CODE BEGIN PV */
uint8_t tx_buffer[] = "Hello, DMA UART TX!\r\n";  // 发送缓冲区
volatile uint8_t tx_done = 0;                        // 发送完成标志
/* USER CODE END PV */

int main(void)
{
  HAL_Init();
  SystemClock_Config();
  MX_GPIO_Init();
  MX_DMA_Init();
  MX_USART1_UART_Init();

  /* 启动DMA发送 */
  HAL_UART_Transmit_DMA(&huart1, tx_buffer, sizeof(tx_buffer) - 1);

  while (1)
  {
    if(tx_done)
    {
      tx_done = 0;
      /* 发送完成后的处理 */
      HAL_GPIO_TogglePin(GPIOA, GPIO_PIN_5);  // 翻转LED指示
    }
  }
}

/* USER CODE BEGIN 4 */
/* DMA发送完成回调函数 */
void HAL_UART_TxCpltCallback(UART_HandleTypeDef *huart)
{
  if(huart->Instance == USART1)
  {
    tx_done = 1;  // 设置发送完成标志
  }
}
/* USER CODE END 4 */
```

### 4.5.2 等待最后一个字节发送完成

在DMA回调后，如果需要确保最后一个字节完全发送出去（如RS485切换方向），需等待USART的TC标志：

```c
void HAL_UART_TxCpltCallback(UART_HandleTypeDef *huart)
{
  if(huart->Instance == USART1)
  {
    /* 等待最后一个字节完全发送出去（移位寄存器空） */
    while(__HAL_UART_GET_FLAG(huart, UART_FLAG_TC) == RESET);

    /* 此时可以安全地切换RS485方向或关闭串口 */
    // HAL_GPIO_WritePin(RS485_DIR_GPIO_Port, RS485_DIR_Pin, GPIO_PIN_RESET);

    tx_done = 1;
  }
}
```


::: tip

**注意：**在回调函数中使用while等待TC标志会增加中断执行时间。如果对实时性要求高，可使能USART的TC中断，在TC中断中执行后续操作。但大多数场景下等待几个微秒是可接受的。

:::


### 4.5.3 连续多次DMA发送

DMA发送完成后（Normal模式），DMA自动停止。如需再次发送，直接重新调用 `HAL_UART_Transmit_DMA()` 即可，但必须确保上一次发送已完成：

```c
/* 发送多组数据 */
uint8_t msg1[] = "First message\r\n";
uint8_t msg2[] = "Second message\r\n";
uint8_t msg3[] = "Third message\r\n";

int main(void)
{
  // ... 初始化 ...

  /* 发送第一条 */
  HAL_UART_Transmit_DMA(&huart1, msg1, sizeof(msg1) - 1);
  /* 等待发送完成（或在回调中处理） */
  while(HAL_UART_GetState(&huart1) != HAL_UART_STATE_READY);

  /* 发送第二条 */
  HAL_UART_Transmit_DMA(&huart1, msg2, sizeof(msg2) - 1);
  while(HAL_UART_GetState(&huart1) != HAL_UART_STATE_READY);

  /* 发送第三条 */
  HAL_UART_Transmit_DMA(&huart1, msg3, sizeof(msg3) - 1);

  while(1);
}
```


::: tip

**提示：**`HAL_UART_GetState()` 返回 `HAL_UART_STATE_READY` 表示串口空闲，可以启动下一次发送。如果返回 `HAL_UART_STATE_BUSY_TX` 表示正在发送中，此时调用Transmit_DMA会返回HAL_BUSY错误。

:::


### 4.5.4 DMA发送 + DMA接收联合使用（回显实验）

实际项目中通常收发同时使用DMA。以下是一个"收到什么就发回什么"的回显示例：

```c
/* USER CODE BEGIN PV */
#define RX_BUF_SIZE  256
uint8_t rx_buffer[RX_BUF_SIZE];
volatile uint16_t rx_len = 0;
volatile uint8_t  rx_flag = 0;
/* USER CODE END PV */

int main(void)
{
  // ... 初始化 ...

  __HAL_UART_ENABLE_IT(&huart1, UART_IT_IDLE);
  HAL_UART_Receive_DMA(&huart1, rx_buffer, RX_BUF_SIZE);

  while (1)
  {
    if(rx_flag)
    {
      rx_flag = 0;
      /* 将收到的数据通过DMA发回 */
      HAL_UART_Transmit_DMA(&huart1, rx_buffer, rx_len);
      /* 等待发送完成后重新启动接收 */
      while(HAL_UART_GetState(&huart1) != HAL_UART_STATE_READY);
      HAL_UART_Receive_DMA(&huart1, rx_buffer, RX_BUF_SIZE);
    }
  }
}

/* USART1_IRQHandler 中添加IDLE处理（同第3章） */
```

### 4.5.5 printf重定向到DMA发送（可选）

如果希望使用printf格式化输出后通过DMA发送，可以先sprintf到缓冲区再DMA发送：

```c
#include <stdio.h>
#include <stdarg.h>

uint8_t printf_buf[256];

void uart_printf(const char *fmt, ...)
{
  va_list args;
  va_start(args, fmt);
  int len = vsnprintf((char*)printf_buf, sizeof(printf_buf), fmt, args);
  va_end(args);

  if(len > 0)
  {
    /* 等待上一次发送完成 */
    while(HAL_UART_GetState(&huart1) != HAL_UART_STATE_READY);
    HAL_UART_Transmit_DMA(&huart1, printf_buf, len);
  }
}

/* 使用示例 */
// uart_printf("ADC value = %d, temp = %.1f\r\n", adc_val, temperature);
```


::: tip

**注意：**此方案中vsnprintf会占用CPU时间（格式化），但数据搬运由DMA完成。如果需要零CPU占用的格式化输出，需要更复杂的环形缓冲区方案。另外确保printf_buf大小足够，避免格式化后数据截断。

:::


## 4.6 实验现象与验证

### 4.6.1 基本发送实验步骤

1. 编译并下载程序
2. 打开串口助手，波特率115200，8N1
3. 复位开发板，观察串口助手接收区
4. 预期现象：  

   - 串口助手收到 "Hello, DMA UART TX!"
   - 开发板LED翻转（如果代码中加了指示）
   - 调试模式下可观察tx_done标志置位

### 4.6.2 连续发送实验

1. 在while(1)中每隔1秒调用一次DMA发送
2. 串口助手持续收到定时发送的数据
3. 观察CPU占用：在DMA发送期间，CPU可以同时执行其他任务（如翻转LED、处理按键）

### 4.6.3 回显实验

1. 下载收发联合代码
2. 串口助手发送任意数据（如"测试DMA回显"）
3. 串口助手立即收到同样的数据（开发板回发）
4. 验证rx_len等于发送的字节数

### 4.6.4 性能对比验证

可以通过GPIO翻转测量DMA发送和阻塞发送的CPU占用差异：

```c
/* 测试DMA发送CPU占用 */
HAL_GPIO_WritePin(GPIOA, GPIO_PIN_5, GPIO_PIN_SET);   // 拉高
HAL_UART_Transmit_DMA(&huart1, big_buffer, 1000);      // DMA发1000字节
HAL_GPIO_WritePin(GPIOA, GPIO_PIN_5, GPIO_PIN_RESET); // 拉低
// 用示波器测量PA5高电平时间 → 极短（仅函数调用开销）

/* 测试阻塞发送CPU占用 */
HAL_GPIO_WritePin(GPIOA, GPIO_PIN_5, GPIO_PIN_SET);
HAL_UART_Transmit(&huart1, big_buffer, 1000, 1000);   // 阻塞发1000字节
HAL_GPIO_WritePin(GPIOA, GPIO_PIN_5, GPIO_PIN_RESET);
// 高电平时间 ≈ 1000字节 × 10位 / 115200 ≈ 86.8ms（CPU全程阻塞）
```

## 4.7 注意事项与常见问题

1. **DMA发送没有数据输出？**

   - 检查串口助手波特率是否匹配
   - 检查TX/RX是否接反（模块RX接MCU TX）
   - 检查 `HAL_UART_Transmit_DMA()` 返回值是否为HAL_OK
   - 检查DMA句柄是否正确关联（`huart1.hdmatx` 是否非空）
   - 检查发送缓冲区是否在内存中（不能是已被优化掉的局部变量）
2. **发送完成回调不触发？**

   - 检查NVIC中DMA数据流中断是否使能
   - 检查中断服务函数中是否调用了 `HAL_DMA_IRQHandler()`
   - 确认回调函数名正确：`HAL_UART_TxCpltCallback`
   - 确认数据长度Size > 0
3. **最后一个字节丢失或乱码？**

   - DMA回调时最后一个字节可能还在移位寄存器中，立即关闭串口或切换方向会丢失
   - 解决：回调中等待 `UART_FLAG_TC` 置位，或使能USART TC中断
   - RS485场景务必注意DE/RE引脚切换时序
4. **连续发送时返回HAL_BUSY？**

   - 上一次DMA发送还未完成，串口处于BUSY_TX状态
   - 解决：发送前检查 `HAL_UART_GetState()`，或使用环形缓冲区队列
   - 不要在发送完成回调中直接调用下一次Transmit_DMA（会导致状态机异常）
5. **发送缓冲区数据被修改导致发送错误？**

   - DMA发送期间，CPU不能修改发送缓冲区内容，否则会导致数据错乱
   - 解决：使用独立的发送缓冲区，发送完成前不写入；或使用多个缓冲区轮换
   - 局部变量作为发送缓冲区时，确保函数不会在发送完成前返回（变量被栈覆盖）
6. **大数组发送时栈溢出？**

   - 发送缓冲区如果定义为局部变量且较大，可能导致栈溢出
   - 解决：将大缓冲区定义为全局变量或静态变量，或增大栈大小


::: tip

**实验要点总结：**
1. DMA串口发送 = 存储器到外设传输，源地址自增（缓冲区），目标地址固定（DR寄存器）
2. HAL_UART_Transmit_DMA() 启动后立即返回，CPU可执行其他任务，发送完成触发TxCpltCallback
3. DMA回调 ≠ 串口完全发送完成，最后一个字节可能还在移位寄存器，需等待USART TC标志
4. 连续发送前检查HAL_UART_GetState()，确保串口空闲
5. DMA发送期间不能修改发送缓冲区内容
6. 大缓冲区建议定义为全局变量，避免栈溢出
7. DMA发送相比阻塞发送，CPU占用从"全程等待"降为"几乎为零"，大数据量优势明显

:::




# DMA存储器到存储实验

## 5.1 实验目的

1. 理解DMA存储器到存储器（M2M）传输的工作原理
2. 掌握M2M模式的特殊约束（仅DMA2、必须FIFO、无循环/双缓冲）
3. 掌握CubeIDE中M2M模式的DMA配置方法（与外设DMA配置的区别）
4. 掌握 `HAL_DMA_Start()` / `HAL_DMA_Start_IT()` 函数的使用
5. 学会用DMA实现内存块快速拷贝，并与memcpy进行性能对比

## 5.2 实验原理

### 5.2.1 M2M数据流向

存储器到存储器模式下，DMA将数据从一段内存空间直接搬运到另一段内存空间，**不经过任何外设**，也不需要外设请求触发。使能数据流后立即开始传输，直到NDTR计数器减为0。


::: tip

**数据流向：**源存储器缓冲区 → DMA控制器（FIFO） → 目标存储器缓冲区
**传输方向：**存储器到存储器（Memory To Memory）
**源地址：**源存储器首地址（通常自增）
**目标地址：**目标存储器首地址（通常自增）

:::


### 5.2.2 M2M模式的特殊约束


::: tip

**M2M模式有以下硬性约束，配置时必须遵守：**
1. **只能使用DMA2**：DMA1不支持存储器到存储器传输，使用DMA1会导致传输失败
2. **必须使能FIFO**：M2M模式下FIFOMode必须设为ENABLE，直接模式不支持
3. **不支持循环模式**：Mode只能设为Normal，不能设为Circular
4. **不支持双缓冲模式**：不能使用Double Buffering
5. **无需外设请求**：使能数据流后自动开始传输，不需要外设触发
6. **通道选择无效**：M2M模式下Channel参数可任意设置（通常选Channel0），因为不涉及外设请求映射

:::


### 5.2.3 DMA通道选择

| 参数 | 配置值 | 说明 |
|-|-|-|
| DMA控制器 | DMA2 | **必须**，DMA1不支持M2M |
| 数据流 | Stream0 \~ Stream7 任意 | 选择未被占用的数据流即可 |
| 通道 | Channel0（任意） | M2M模式下通道无效 |
| 传输方向 | Memory To Memory | 存储器到存储器 |
| 数据宽度 | Byte / HalfWord / Word | 源和目标可不同（FIFO模式支持） |
| 源增量 | Enable（通常） | 源地址自增 |
| 目标增量 | Enable（通常） | 目标地址自增 |
| FIFO模式 | **Enable（必须）** | M2M必须使能FIFO |
| FIFO阈值 | Full（推荐） | 满阈值传输效率最高 |
| 模式 | Normal（必须） | 不支持循环 |

### 5.2.4 M2M传输 vs memcpy

| 对比项 | DMA M2M | memcpy |
|-|-|-|
| CPU占用 | 极低（启动后CPU可做其他事） | 高（CPU逐字拷贝） |
| 小数据量（<64字节） | 慢（DMA启动开销） | 快 |
| 大数据量（>1KB） | 快且不占CPU | 占用CPU时间长 |
| 使用复杂度 | 较高（需配置DMA、处理中断） | 低（一行代码） |
| 适用场景 | 大数据块搬运、需要CPU并行处理 | 小数据拷贝、简单场景 |


::: tip

**经验：**数据量小于约64字节时，memcpy通常比DMA更快，因为DMA有启动开销（配置寄存器、等待FIFO填充等）。数据量大于1KB时，DMA的优势明显，尤其是需要CPU同时执行其他任务时。

:::


## 5.3 硬件设计

存储器到存储器实验**不需要任何额外硬件**，仅使用MCU内部的SRAM即可。开发板通过ST-Link连接电脑用于下载和调试。


::: tip

**存储器范围说明（STM32F407）：**
主SRAM：0x20000000 \~ 0x2001FFFF（共128KB）
CCM SRAM：0x10000000 \~ 0x1000FFFF（共64KB，**注意：DMA不能访问CCM RAM**）
内部Flash：0x08000000 \~ 0x080FFFFF（共1MB，可作为源地址）
**重要：**DMA2只能访问系统总线矩阵上的存储器（主SRAM、Flash、外部存储器），不能访问仅挂在CPU总线上的CCM RAM。如果目标缓冲区定义在CCM RAM中，DMA传输会失败。

:::


## 5.4 CubeIDE配置步骤


::: tip

**M2M模式配置与外设DMA不同：**外设DMA是在外设配置页（如USART1）的DMA Settings中添加，而M2M模式没有对应的外设，需要在 **System Core → DMA** 中手动添加DMA数据流。

:::


### 5.4.1 添加DMA数据流

1. 双击 `.ioc` 文件打开设备配置工具
2. 左侧 **Categories → System Core → DMA**
3. 右侧点击 **Add** 按钮
4. 在弹出的列表中选择 **DMA2** → 选择一个未被占用的数据流（如 **DMA2 Stream0**）
5. 此时列表中出现DMA2 Stream0项

### 5.4.2 配置DMA参数

选中添加的DMA2 Stream0项，在下方配置参数：

| 参数 | 配置值 | 说明 |
|-|-|-|
| Mode | Normal | 必须，M2M不支持循环 |
| Direction | Memory To Memory | 存储器到存储器 |
| Source Address Increment | Increment | 源地址自增 |
| Destination Address Increment | Increment | 目标地址自增 |
| Source Data Width | Word | 源数据宽度32位（传输效率高） |
| Destination Data Width | Word | 目标数据宽度32位 |
| Priority | High | 高优先级 |
| Use Fifo | **Enable（必须）** | M2M必须使能FIFO |
| FIFO Threshold | Full | 满阈值，传输效率最高 |
| Source Burst | INCR4 或 Single | 源突发传输（可选） |
| Destination Burst | INCR4 或 Single | 目标突发传输（可选） |

### 5.4.3 配置NVIC中断

1. 左侧 **System Core → NVIC**
2. 勾选 **DMA2 Stream0 global interrupt**（如果使用中断方式）
3. 设置中断优先级（如抢占优先级5，子优先级0）
4. 如果仅使用轮询方式（HAL_DMA_PollForTransfer），可以不使能中断

### 5.4.4 生成代码

1. 点击 **GENERATE CODE**（Ctrl+Shift+G）
2. 生成的关键代码：  

   - `main.c` — MX_DMA_Init()，全局DMA句柄 `hdma_memtomem_dma2_stream0`
   - `stm32f4xx_hal_msp.c` — DMA MSP初始化（时钟使能、中断配置）
   - `stm32f4xx_it.c` — DMA2_Stream0_IRQHandler()


::: tip

**注意：**M2M模式生成的DMA句柄名称通常为 `hdma_memtomem_dma2_streamX`，与外设DMA句柄（如hdma_usart1_rx）命名不同。在main.c中可以找到这个全局句柄的声明。

:::


## 5.5 代码实现

### 5.5.1 方案一：轮询方式（阻塞等待）

使用 `HAL_DMA_Start()` 启动传输，然后用 `HAL_DMA_PollForTransfer()` 阻塞等待传输完成。简单但会占用CPU等待。

```c
/* USER CODE BEGIN PV */
#define BUF_SIZE  1024                     // 传输1024个数据项
uint32_t src_buffer[BUF_SIZE];             // 源缓冲区
uint32_t dst_buffer[BUF_SIZE];             // 目标缓冲区
/* USER CODE END PV */

int main(void)
{
  HAL_Init();
  SystemClock_Config();
  MX_GPIO_Init();
  MX_DMA_Init();

  /* 初始化源缓冲区（填充测试数据） */
  for(uint32_t i = 0; i < BUF_SIZE; i++)
  {
    src_buffer[i] = i * 2 + 1;  // 填充递增数据
  }

  /* 清零目标缓冲区 */
  memset(dst_buffer, 0, sizeof(dst_buffer));

  /* 启动DMA M2M传输（轮询方式） */
  HAL_DMA_Start(&hdma_memtomem_dma2_stream0,
                (uint32_t)src_buffer,   // 源地址
                (uint32_t)dst_buffer,   // 目标地址
                BUF_SIZE);               // 数据项数（以Word为单位）

  /* 阻塞等待传输完成，超时1000ms */
  HAL_DMA_PollForTransfer(&hdma_memtomem_dma2_stream0,
                           HAL_DMA_FULL_TRANSFER,
                           1000);

  /* 传输完成，校验数据 */
  uint8_t verify_ok = 1;
  for(uint32_t i = 0; i < BUF_SIZE; i++)
  {
    if(dst_buffer[i] != src_buffer[i])
    {
      verify_ok = 0;
      break;
    }
  }

  while(1)
  {
    if(verify_ok)
    {
      /* 验证通过，LED常亮 */
      HAL_GPIO_WritePin(GPIOA, GPIO_PIN_5, GPIO_PIN_SET);
    }
    else
    {
      /* 验证失败，LED闪烁 */
      HAL_GPIO_TogglePin(GPIOA, GPIO_PIN_5);
      HAL_Delay(200);
    }
  }
}
```


::: tip

**代码说明：**
1. `HAL_DMA_Start()` 的DataLength参数是**数据项数**，不是字节数。如果数据宽度是Word（32位），传输1024个Word = 4096字节
2. 源地址和目标地址直接传入数组名（强制转换为uint32_t）
3. `HAL_DMA_PollForTransfer()` 的第二个参数 `HAL_DMA_FULL_TRANSFER` 表示等待全部传输完成，`HAL_DMA_HALF_TRANSFER` 表示等待半传输
4. 轮询方式下不需要使能NVIC中断

:::


### 5.5.2 方案二：中断方式（非阻塞）

使用 `HAL_DMA_Start_IT()` 启动传输，传输完成后触发中断调用回调函数。CPU在传输期间可以执行其他任务。

```c
/* USER CODE BEGIN PV */
#define BUF_SIZE  2048
uint32_t src_buffer[BUF_SIZE];
uint32_t dst_buffer[BUF_SIZE];
volatile uint8_t dma_done = 0;    // DMA传输完成标志
volatile uint8_t dma_error = 0;   // DMA错误标志
/* USER CODE END PV */

int main(void)
{
  HAL_Init();
  SystemClock_Config();
  MX_GPIO_Init();
  MX_DMA_Init();

  /* 初始化源缓冲区 */
  for(uint32_t i = 0; i < BUF_SIZE; i++)
  {
    src_buffer[i] = i;
  }
  memset(dst_buffer, 0, sizeof(dst_buffer));

  /* 以中断方式启动DMA M2M传输 */
  HAL_DMA_Start_IT(&hdma_memtomem_dma2_stream0,
                    (uint32_t)src_buffer,
                    (uint32_t)dst_buffer,
                    BUF_SIZE);

  while (1)
  {
    if(dma_done)
    {
      dma_done = 0;
      /* 传输完成，校验数据 */
      uint8_t ok = 1;
      for(uint32_t i = 0; i < BUF_SIZE; i++)
      {
        if(dst_buffer[i] != src_buffer[i]) { ok = 0; break; }
      }
      // 根据ok执行后续操作...
    }

    if(dma_error)
    {
      dma_error = 0;
      /* 传输错误处理 */
    }

    /* CPU可以在这里执行其他任务，DMA在后台搬运数据 */
    // ... 其他任务 ...
  }
}

/* USER CODE BEGIN 4 */
/* DMA传输完成回调 */
void HAL_DMA_XferCpltCallback(DMA_HandleTypeDef *hdma)
{
  if(hdma->Instance == DMA2_Stream0)
  {
    dma_done = 1;
  }
}

/* DMA传输错误回调 */
void HAL_DMA_ErrorCallback(DMA_HandleTypeDef *hdma)
{
  if(hdma->Instance == DMA2_Stream0)
  {
    dma_error = 1;
  }
}
/* USER CODE END 4 */
```


::: tip

**注意：**M2M模式使用的是DMA级别的回调函数（`HAL_DMA_XferCpltCallback`），而不是外设级回调（如HAL_UART_RxCpltCallback）。因为M2M传输不经过任何外设，直接由DMA控制器管理。

:::


### 5.5.3 方案三：封装DMA memcpy函数

为了方便使用，可以将DMA M2M传输封装成类似memcpy的函数：

```c
/**
 * @brief  DMA方式内存拷贝（中断方式，非阻塞）
 * @param  dst  目标地址
 * @param  src  源地址
 * @param  len  数据长度（字节数）
 * @retval 0=成功启动，-1=参数错误，-1=DMA忙
 */
int dma_memcpy(void *dst, const void *src, uint32_t len)
{
  /* 参数检查 */
  if(dst == NULL || src == NULL || len == 0)
    return -1;

  /* 检查DMA是否空闲 */
  if(HAL_DMA_GetState(&hdma_memtomem_dma2_stream0) != HAL_DMA_STATE_READY)
    return -2;

  /* 计算数据项数（按Word对齐，向下取整） */
  uint32_t word_count = len / 4;

  /* 启动DMA传输（Word宽度） */
  HAL_DMA_Start_IT(&hdma_memtomem_dma2_stream0,
                    (uint32_t)src,
                    (uint32_t)dst,
                    word_count);

  /* 处理不足4字节的剩余部分（用普通memcpy） */
  uint32_t remainder = len % 4;
  if(remainder > 0)
  {
    /* 注意：需要等DMA传输完成后再拷贝剩余字节，
       或者直接全部用memcpy处理小数据 */
  }

  return 0;
}

/* 使用示例 */
// dma_memcpy(dst_buffer, src_buffer, 4096);  // 拷贝4KB数据
```


::: tip

**提示：**实际项目中建议根据数据量大小自动选择：小数据用memcpy，大数据用DMA。可以设置一个阈值（如256字节），小于阈值用memcpy，大于等于阈值用DMA。

:::


### 5.5.4 性能对比测试（DMA vs memcpy）

```c
/* 性能对比：DMA M2M vs memcpy */
#define TEST_SIZE  8192   // 测试8KB数据

uint32_t src[TEST_SIZE/4];
uint32_t dst[TEST_SIZE/4];
volatile uint32_t dma_time_us = 0;
volatile uint32_t memcpy_time_us = 0;

void performance_test(void)
{
  uint32_t start, end;

  /* 初始化数据 */
  for(uint32_t i = 0; i < TEST_SIZE/4; i++) src[i] = i;

  /* === 测试DMA M2M === */
  start = HAL_GetTick();  // 或用DWT计数器精确测量
  HAL_DMA_Start(&hdma_memtomem_dma2_stream0, (uint32_t)src, (uint32_t)dst, TEST_SIZE/4);
  HAL_DMA_PollForTransfer(&hdma_memtomem_dma2_stream0, HAL_DMA_FULL_TRANSFER, 1000);
  end = HAL_GetTick();
  dma_time_us = (end - start) * 1000;  // 粗略值，建议用DWT

  /* === 测试memcpy === */
  start = HAL_GetTick();
  memcpy(dst, src, TEST_SIZE);
  end = HAL_GetTick();
  memcpy_time_us = (end - start) * 1000;

  /* 通过串口输出结果 */
  // uart_printf("DMA: %lu us, memcpy: %lu us\r\n", dma_time_us, memcpy_time_us);
}
```


::: tip

**精确测量建议：**使用Cortex-M4的DWT（Data Watchpoint and Trace）周期计数器测量，精度可达单个CPU周期。初始化DWT后用 `CYCCNT` 寄存器差值除以CPU主频得到精确时间。HAL_GetTick()精度只有1ms，不适合测量快速的DMA传输。

:::


## 5.6 实验现象与验证

### 5.6.1 基本传输验证

1. 编译并下载程序
2. 调试模式下运行，在传输完成后设置断点
3. 在Expressions或Memory窗口查看：  

   - `src_buffer`：源数据（如0, 1, 2, 3...）
   - `dst_buffer`：目标数据，应与src_buffer完全一致
   - `verify_ok`：应为1（验证通过）
4. LED状态：验证通过时常亮，失败时闪烁

### 5.6.2 寄存器观察

调试模式下在SFRs窗口查看DMA2相关寄存器：

- **DMA2_Stream0→NDTR**：传输过程中从BUF_SIZE递减到0
- **DMA2_Stream0→PAR**：源地址（M2M模式下PAR存源地址）
- **DMA2_Stream0→M0AR**：目标地址
- **DMA2→LISR**：中断状态寄存器，TCIF0位（传输完成）在传输完成后置1
- **DMA2_Stream0→FCR**：FIFO控制寄存器，确认FIFO已使能

### 5.6.3 中断方式验证

1. 下载中断方式代码
2. 在 `HAL_DMA_XferCpltCallback()` 中设置断点
3. 运行程序，确认断点命中（中断触发）
4. 继续运行，观察主循环中dma_done标志处理
5. 在DMA传输期间，主循环中的其他任务应正常执行（CPU不被阻塞）

### 5.6.4 错误场景验证

- **使用DMA1：**将DMA控制器改为DMA1，传输不会启动（M2M不支持DMA1）
- **禁用FIFO：**FIFOMode设为Disable，传输失败或行为异常
- **目标地址在CCM RAM：**定义 `__attribute__((section(".ccmram")))` 的目标缓冲区，DMA无法访问，传输错误
- **数据宽度不匹配：**源和目标数据宽度不同时，NDTR数以源宽度为准，注意字节数换算

## 5.7 注意事项与常见问题

1. **DMA M2M传输没有启动？**

   - 确认使用的是DMA2，不是DMA1
   - 确认FIFO已使能（FIFOMode = ENABLE）
   - 确认Mode为Normal（不能是Circular）
   - 确认DataLength > 0
   - 检查DMA时钟是否使能（`__HAL_RCC_DMA2_CLK_ENABLE()`）
2. **传输完成回调不触发？**

   - 确认使用的是 `HAL_DMA_Start_IT()` 而不是 `HAL_DMA_Start()`
   - 检查NVIC中DMA2 StreamX中断是否使能
   - 检查中断服务函数中是否调用了 `HAL_DMA_IRQHandler()`
   - 确认回调函数名正确：`HAL_DMA_XferCpltCallback`（DMA级别，不是外设级别）
3. **目标数据不正确或乱码？**

   - 检查源地址和目标地址是否传反（HAL_DMA_Start参数顺序：SrcAddress在前，DstAddress在后）
   - 检查DataLength是数据项数还是字节数（数据项数 = 字节数 / 数据宽度）
   - 检查源和目标数据宽度配置是否与实际数据匹配
   - 确认缓冲区不在CCM RAM中（DMA不能访问CCM）
4. **传输错误中断（TEIF）触发？**

   - 目标地址或源地址越界（访问了不存在的内存区域）
   - 地址未对齐（如Word宽度但地址不是4字节对齐，部分场景下会导致错误）
   - 目标缓冲区在CCM RAM中
   - 总线错误（DMA访问了被保护的地址空间）
5. **小数据量DMA比memcpy还慢？**

   - 正常现象：DMA有启动开销（配置寄存器、FIFO填充、总线仲裁等）
   - 经验阈值：小于64\~256字节建议用memcpy，大于1KB建议用DMA
   - 可以封装自动选择函数，根据数据量大小决定用哪种方式
6. **连续M2M传输失败？**

   - 上一次传输未完成时启动新传输会返回HAL_BUSY
   - 传输完成后需要确认DMA状态回到READY（`HAL_DMA_GetState()`）
   - 中断方式下，在回调中设置标志，主循环中检查标志后再启动下一次
7. **Cache一致性问题（F7/H7系列）？**

   - STM32F4没有Cache，无此问题
   - F7/H7系列有D-Cache，DMA修改内存后CPU Cache中的数据可能过时
   - 解决：DMA传输前刷新Cache（SCB_CleanDCache_by_Addr），传输后无效化Cache（SCB_InvalidateDCache_by_Addr），或将缓冲区定义在非Cache区域


::: tip

**实验要点总结：**
1. M2M模式 = 存储器到存储器，无需外设，使能后自动传输
2. 三大硬性约束：只能DMA2、必须使能FIFO、不支持循环/双缓冲
3. CubeIDE中在 System Core → DMA 手动添加数据流，不是在外设配置页
4. HAL_DMA_Start() + PollForTransfer = 轮询方式；HAL_DMA_Start_IT() + XferCpltCallback = 中断方式
5. DataLength是数据项数不是字节数：字节数 = 数据项数 × 数据宽度
6. DMA不能访问CCM RAM，目标缓冲区必须在主SRAM中
7. 小数据用memcpy更快，大数据（>1KB）用DMA优势明显，且不占用CPU
8. M2M用DMA级回调（HAL_DMA_XferCpltCallback），不是外设级回调

:::
