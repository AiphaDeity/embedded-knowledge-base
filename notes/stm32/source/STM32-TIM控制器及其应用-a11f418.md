# STM32 TIM控制器及其应用

[飞书原文](https://hcn4ticlccda.feishu.cn/docx/HNqkdfAVCoknKyxU6ZLcI3L5nRd)

# 总结

### 关于你问的“有几种模式”？

在 STM32 通用定时器中，我们通常讨论的是从模式（Slave Mode）。通过配置 `TIMx_SMCR` 寄存器的 `SMS` 位，可以选择 4 种主要的从模式：

1. 复位模式（Reset Mode）：外部触发信号一旦到来，立刻将计数器（`CNT`）清零，并重新开始计数。
2. 门控模式（Gated Mode）：外部信号的电平（高或低）控制计数器是否计数（启停）。也就是这道题选 A 的由来。
3. 触发模式（Trigger Mode）：外部触发信号一旦到来，将计数器启动（开始计数），但不会清零。
4. 外部时钟模式 1（External Clock Mode 1）：直接把外部触发引脚（如 TI1 或 TI2）当作计数器时钟源（每个脉冲计一次数）。

> 注：除了从模式，定时器还有主模式（Master Mode），用于控制其他定时器或外设（如让 TIM1 触发 ADC 采样）。但题中明确问“门控模式”，属于从模式的一种。

# 定时器概述

## 定时器基本原理

定时器是单片机内部**通过硬件方式实现定时功能**的模块：以**精准的时基**（时钟源）为基准，由硬件自动完成计数，计数达到设定值后产生中断或事件，全程**不占用CPU**。定时器的核心就是**计数器**（CNT）。

### 核心组成：时基单元

定时器能实现“精准定时”，依赖内部由三个寄存器构成的**时基单元**（原理图中的“重装载值”与“计数器”即其中的ARR与CNT）：

| 组成 | 作用 |
|-|-|
| 预分频器 PSC | 对输入时钟分频，得到计数时钟；实际分频系数 = PSC + 1 |
| 计数器 CNT | 在计数时钟驱动下逐脉冲累加，保存当前计数值 |
| 自动重装载寄存器 ARR | 存放计数目标值（重装载值），CNT 达到 ARR 后溢出归零并产生更新中断/事件 |

### 工作流程

定时器的工作流程（对应“时钟 → 计数器 → 中断”原理图）分为四步：

1. **时钟**：为计数器提供精准、稳定的脉冲信号，作为计数的时基；
2. **预分频**：PSC 对时钟分频，把计数频率降到所需档位；
3. **计数**：计数器在分频后的时钟驱动下逐脉冲累加；
4. **溢出中断/事件**：计数值达到重装载值（ARR）时溢出归零，触发更新中断（如翻转LED），或产生硬件事件（如触发DAC转换、启动DMA搬运）。

定时时间的计算公式：$T = (PSC + 1) × (ARR + 1) / f_CLK$

**例：**时钟 72MHz，PSC = 7199、ARR = 9999，则 T = 7200 × 10000 ÷ 72,000,000 = 1s，即每秒产生一次更新中断。

### 硬件定时器 vs 软件延时（补充）

使用定时器而非软件空循环延时的根本原因：

| 对比项 | 软件延时（空循环） | 硬件定时器 |
|-|-|-|
| CPU占用 | 全程占用CPU，无法处理其他任务 | 完全不占用CPU，可后台运行 |
| 定时精度 | 低，受中断、编译优化影响 | 高，精度由晶振/时钟源决定 |
| 可扩展性 | 只能空等延时 | 可同时输出PWM、捕获信号、脉冲计数等 |

## 定时器分类

STM32 的定时器分为**常规定时器、特殊功能定时器、系统定时器**三大类，分类结构如下图所示：

<a href="/embedded-knowledge-base/feishu-assets/diagram-8f5d2bb05d5c046c11.svg" target="_blank" rel="noopener" aria-label="打开流程图大图"><img src="/feishu-assets/diagram-8f5d2bb05d5c046c11.svg" alt="流程图" loading="lazy" decoding="async" style="max-height:420px;width:auto;object-fit:contain;background:#fff"></a>

<details><summary>流程图源内容</summary>

```text
mindmap
  root((STM32定时器类别))
    常规定时器
      基本定时器
        执行简单的定时
      通用定时器
        外部信号测量、PWM生成、电机控制等
      高级定时器
        具备通用定时器全部功能
        死区时间插入
        刹车功能
    特殊功能定时器
      独立看门狗
        用于系统运行时的安全保护
      窗口看门狗
        用于系统运行时的安全保护
      实时时钟RTC
        提供准确的时间和日期
    系统定时器
      SysTick系统滴答
        操作系统的任务切换

```

</details>

- **常规定时器**：

  - **基本定时器**：执行简单的定时；
  - **通用定时器**：外部信号测量、PWM生成、电机控制等；
  - **高级定时器**：具备通用定时器的全部功能，并支持死区时间插入、刹车功能。
- **特殊功能定时器**：

  - **独立看门狗 IWDG**：用于系统运行时的安全保护；
  - **窗口看门狗 WWDG**：用于系统运行时的安全保护；
  - **实时时钟 RTC**：提供准确的时间和日期。
- **系统定时器**：

  - **SysTick 系统滴答**：用于操作系统的任务切换。

## 常规定时器详解

### ① 基本定时器

**特点：**只有计数功能，没有输入捕获和输出比较功能，结构最简单，常用于基础时间基准的生成。

**应用场景：**实现简单的定时、提供 DAC 的转换触发信号。

### ② 通用定时器

**特点：**功能较为灵活，支持输入捕获、输出比较、PWM 等功能，既可以用作普通的时间计时器，也可以处理外部信号。

**应用场景：**外部信号捕获、PWM 信号生成（电机控制、屏幕背光控制等）。

### ③ 高级定时器

**特点：**功能最为强大，除了通用定时器的所有功能外，还支持专门的功能（如死区时间控制和刹车机制），专为复杂控制任务设计，如电机控制。

**应用场景：**专用于电机控制、复杂的功率信号生成，尤其是需要安全机制（刹车）和高精度 PWM 的应用。

### 三类常规定时器功能对比（补充）

| 功能 | 基本定时器 | 通用定时器 | 高级定时器 |
|-|-|-|-|
| 计数与定时中断 | ✓ | ✓ | ✓ |
| 输入捕获（测脉宽/频率） | ✗ | ✓ | ✓ |
| 输出比较 | ✗ | ✓ | ✓ |
| PWM 输出 | ✗ | ✓ | ✓ |
| 死区时间插入 | ✗ | ✗ | ✓ |
| 刹车（制动）机制 | ✗ | ✗ | ✓ |
| 典型应用 | 简单定时、DAC触发 | 信号捕获、PWM生成 | 电机控制、高精度PWM |

**补充（以 STM32F103 为例）：**基本定时器为 TIM6、TIM7；通用定时器为 TIM2\~TIM5；高级定时器为 TIM1、TIM8。

## 特殊功能定时器与系统定时器（补充）

除了常规定时器，STM32 还有三类特殊的定时资源，它们各自负责不同的职责：

| 名称 | 时钟来源 | 核心作用 |
|-|-|-|
| 独立看门狗 IWDG | 独立 LSI 时钟 | 程序跑飞时自动复位系统，保证系统运行安全 |
| 窗口看门狗 WWDG | APB1 时钟 | 必须在上、下窗口之间喂狗，超窗未喂则复位系统 |
| 实时时钟 RTC | 备份域 / 外部 32.768kHz 晶振 | 提供准确的时间和日期，掉电后由备份电源维持 |
| SysTick 系统滴答 | Cortex-M 内核集成 | 24 位递减计数器，用于操作系统任务切换、HAL_Delay 延时 |

## 核心要点小结

- 定时器的本质 = **计数器 + 时基**（时钟源 + 预分频），核心是计数器；
- 定时时间：$T = (PSC + 1) × (ARR + 1) / f_CLK$，改 PSC 与 ARR 即可任意设定定时时长；
- 基本定时器只有时基；通用定时器在基本之上增加输入捕获、输出比较、PWM；高级定时器再增加死区时间与刹车机制；
- 看门狗管“系统不死”，RTC 管“日历时间”，SysTick 管“系统节拍”，常规定时器管“通用定时 / 波形生成 / 信号测量”——各司其职。



# 基本定时器原理

## 基本定时器概述

STM32F4xx 系列的基本定时器有 **TIM6** 和 **TIM7**。除非特别说明，本节内容适用于整个 STM32F4xx 系列器件。

基本定时器的功能：

- **生成时基（定时）**：提供精准的时间基准；
- **驱动数模转换器（DAC）**：作为 DAC 的转换触发源。

## TIM6/TIM7 简介

TIM6 和 TIM7 各包含一个 **16 位自动重载计数器**，由**可编程预分频器**驱动。此类定时器不仅可用作通用定时器以生成时基，还可以专门用于驱动数模转换器（DAC）——实际上，此类定时器内部连接到 DAC，并能够通过其**触发输出（TRGO）**驱动 DAC。

这些定时器彼此**完全独立**，不共享任何资源。

## 主要特性

- **16 位自动重载递增计数器**：计数方向为递增，计数到自动重载值后溢出归零；
- **16 位可编程预分频器**：用于对计数器时钟频率进行分频，支持运行时修改，分频系数介于 1 和 65536 之间；
- **用于触发 DAC 的同步电路**：通过触发输出 TRGO 驱动 DAC 转换；
- **更新事件生成中断/DMA 请求**：计数器上溢时触发。

## 基本定时器结构框图

基本定时器（TIM6/TIM7）的内部结构如下图所示：

<a href="/embedded-knowledge-base/feishu-assets/diagram-0b805bde58d765b26b.svg" target="_blank" rel="noopener" aria-label="打开流程图大图"><img src="/feishu-assets/diagram-0b805bde58d765b26b.svg" alt="流程图" loading="lazy" decoding="async" style="max-height:420px;width:auto;object-fit:contain;background:#fff"></a>

<details><summary>流程图源内容</summary>

```text
flowchart LR
    TIMxCLK["来自 RCC 的 TIMxCLK"] --> CKINT["内部时钟 CK_INT"]
    CKINT --> PSC["预分频器 PSC"]
    PSC --> CKCNT["计数时钟 CK_CNT"]
    CKCNT --> CNT["计数器 CNT（递增）"]
    ARR["自动重载寄存器 ARR"] --> CNT
    CTRL["控制器：复位 / 使能 / 计数"] --> CNT
    CNT -->|"CNT = ARR 上溢"| UEV["更新事件 UEV"]
    UEV --> FLAG["标志"]
    UEV --> EVT["事件"]
    UEV --> DMA["中断和 DMA 输出"]
    CKINT --> TRGO["触发控制器"]
    TRGO --> DAC["到 DAC（TRGO 触发）"]
```

</details>

信号流向说明：

| 信号 / 模块 | 说明 |
|-|-|
| 来自 RCC 的 TIMxCLK | 定时器输入时钟，转换为内部时钟 CK_INT 供各模块使用 |
| 控制器 | 对计数器执行复位、使能、计数等控制 |
| 预分频器 PSC | 对 CK_INT 分频，输出计数时钟（CK_PSC / CK_CNT） |
| 计数器 CNT | 在计数时钟 CK_CNT 驱动下递增计数 |
| 自动重载寄存器 ARR | 设定计数目标值，可对计数器执行停止、清零或递增操作；发生更新事件时，预装载寄存器按控制位传输到活动（影子）寄存器 |
| 触发控制器 TRGO | 产生触发输出，连接到 DAC |
| 更新事件 | 计数器上溢时产生：置标志、输出事件、触发中断和 DMA 请求 |

## 结构细分（TIM6 演示示例）

以 TIM6 为例，基本定时器由四个核心模块组成：

- **1、时钟源**：CNT_EN 计数时钟使能（CEN），内部时钟 CK_INT；
- **2、预分频器**：TIM6_PSC，写入值先存入预装载寄存器，更新到影子寄存器后生效，等待 UEV 事件；
- **3、计数器**：TIM6_CNT，计数时钟 CK_CNT，初始值为 0，计数器上溢（CNT = ARR）后触发比较器；
- **4、自动重装载器**：TIM6_ARR，存在影子寄存器，由 ARPE 使能寄存器缓冲功能，写入值等待 UEV 事件生效。

**演示数值：**CK_INT = 16MHz，PSC 分频系数 = 5（PSC 寄存器值 = 4）→ CK_CNT = 3.2MHz；ARR = 50。

## 补充：影子寄存器与预装载机制

PSC 与 ARR 都带有**影子寄存器（预装载）**机制，这是基本定时器能稳定定时的关键：

| 概念 | 说明 |
|-|-|
| 预装载寄存器 | 软件写入新值时的暂存区，不会立即生效 |
| 影子寄存器（活动寄存器） | 真正参与计数的寄存器，决定实际计数行为 |
| UEV 更新事件 | 计数器上溢（CNT = ARR）时产生，此时预装载值才传输到影子寄存器并生效 |
| ARPE | 自动重载预装载使能位，决定 ARR 是否启用预装载（缓冲）机制 |

作用：避免在计数过程中直接改写生效参数导致定时错乱，保证参数切换在**安全的时间点**（更新事件）统一生效。

## 补充：定时计算与定位

基本定时器的溢出周期计算公式：

$$T_OVF = (ARR + 1) / f_CK_CNT = (ARR + 1) × (PSC + 1) / f_CK_INT$$

代入演示数值：T_OVF = (50 + 1) / 3.2MHz ≈ **15.9μs**，对应溢出频率约 **62.8kHz**，即每 15.9μs 产生一次更新中断。

**定位：**基本定时器没有输入捕获、输出比较通道，**没有外部引脚**，不能直接对外输出 PWM。它是最纯粹的**时基发生器**与 **DAC 触发源**，对外通过中断、事件与触发输出（TRGO）提供功能。

# 基本定时器应用

## 应用场景与原理

基本定时器（TIM6/TIM7）最典型的应用有两类：

- **定时中断**：利用更新事件产生周期中断，在中断回调中执行周期性任务（如 LED 闪烁、软件定时器、调度节拍）；
- **触发 DAC**：利用更新事件经 TRGO 触发 DAC 转换，实现定时采样输出模拟量。

应用原理（对应第 2 章结构框图）：时基单元（PSC + CNT + ARR）计数溢出 → 产生**更新事件 UEV** → 更新事件有两条出路：

1. **中断/DMA 路径**：DIER 使能 UIE/UDE 后，CPU 进入更新中断服务函数（或 DMA 搬运数据）；
2. **触发输出路径**：CR2 配置 MMS 主模式为更新事件，经 TRGO 输出到 DAC，硬件自动触发转换，不占用 CPU。

## 寄存器详解

基本定时器应用涉及的核心寄存器共 8 个：

| 寄存器 | 名称 | 关键位 | 作用 |
|-|-|-|-|
| CR1 | 控制寄存器 1 | CEN(bit0)：计数器使能；ARPE(bit7)：自动重载预装载使能 | 时基单元的总开关，配置计数方向与预装载 |
| CR2 | 控制寄存器 2 | MMS[3:0]：主模式选择 | 选择更新事件作为 TRGO，触发 DAC |
| DIER | DMA/中断使能寄存器 | UIE(bit0)：更新中断使能；UDE(bit8)：更新 DMA 请求使能 | 决定更新事件是否产生中断或 DMA 请求 |
| SR | 状态寄存器 | UIF(bit0)：更新中断标志，上溢置 1，需软件清零 | 查询或中断判定更新事件是否发生 |
| EGR | 事件产生寄存器 | UG(bit0)：软件产生更新事件 | 手动触发更新：加载影子寄存器、清零 CNT |
| CNT | 计数器 | 16 位计数值 | 保存当前计数值 |
| PSC | 预分频器 | 16 位，实际分频系数 = PSC + 1 | 对 CK_INT 分频得到计数时钟 |
| ARR | 自动重载寄存器 | 16 位计数目标值 | CNT 计数到 ARR 后上溢归零，产生更新事件 |

应用时只需关注其中 5 个的位操作：**PSC、ARR 决定定时时长；EGR 负责加载；DIER 使能中断；CR1 启动计数；SR 判定/清标志**。

## 寄存器操作流程（寄存器版）

不借助库，用寄存器实现 TIM6 定时 1 秒（F407，TIM6 时钟 = 84MHz）只需 6 步：

```c
// 1. 使能 TIM6 时钟（TIM6 挂在 APB1 总线）
RCC->APB1ENR |= RCC_APB1ENR_TIM6EN;

// 2. 配置预分频器与自动重载值
TIM6->PSC = 8399;   // 计数频率 = 84MHz / (8399+1) = 10kHz
TIM6->ARR = 9999;   // 计数目标 = 10000 次，溢出周期 = 1s

// 3. 软件产生更新事件：把 PSC/ARR 预装载值加载到影子寄存器，并清零 CNT
TIM6->EGR |= TIM_EGR_UG;

// 4. 使能更新中断 UIE
TIM6->DIER |= TIM_DIER_UIE;

// 5. 使能计数器 CEN，开始计数
TIM6->CR1 |= TIM_CR1_CEN;

// 6. 配置并使能 NVIC 中断（F4 中 TIM6 与 DAC 共用向量 TIM6_DAC_IRQn）
HAL_NVIC_SetPriority(TIM6_DAC_IRQn, 2, 0);
HAL_NVIC_EnableIRQ(TIM6_DAC_IRQn);
```

中断服务函数中处理业务：读 SR 判断 UIF → 执行任务 → 软件清零 UIF。

## HAL 库编程流程

HAL 库把上述寄存器操作封装为固定流程，共 6 步：

1. **定义句柄**：`TIM_HandleTypeDef htim6;`，句柄包含实例指针与时基配置结构体；
2. **填充时基配置**：`htim6.Init` 中设置 Prescaler（预分频）、Period（自动重载值）、CounterMode（计数模式）、ClockDivision、AutoReloadPreload（ARPE）；
3. **初始化**：`HAL_TIM_Base_Init(&htim6)`，内部调用 `HAL_TIM_Base_MspInit` 完成时钟使能与 NVIC 配置；
4. **启动**：`HAL_TIM_Base_Start_IT(&htim6)`，清标志、使能 UIE、置 CEN 开始计数；
5. **中断入口**：实现 `TIM6_DAC_IRQHandler(void)`，内部调用 `HAL_TIM_IRQHandler(&htim6)`（自动读标志并清零）；
6. **业务回调**：重写 `HAL_TIM_PeriodElapsedCallback`，判断 `htim->Instance == TIM6` 后写业务代码。

完整示例（TIM6 定时 1s，更新中断翻转 LED）：

```c
TIM_HandleTypeDef htim6;

// ① 时基初始化（CubeMX 生成的 MX_TIM6_Init）
void MX_TIM6_Init(void)
{
    htim6.Instance = TIM6;
    htim6.Init.Prescaler = 8399;                 // 84MHz / 8400 = 10kHz
    htim6.Init.CounterMode = TIM_COUNTERMODE_UP; // 递增计数
    htim6.Init.Period = 9999;                    // 计数 10000 次 = 1s
    htim6.Init.ClockDivision = TIM_CLOCKDIVISION_DIV1;
    htim6.Init.AutoReloadPreload = TIM_AUTORELOAD_PRELOAD_ENABLE; // ARPE
    if (HAL_TIM_Base_Init(&htim6) != HAL_OK)
    {
        Error_Handler();
    }
    HAL_NVIC_SetPriority(TIM6_DAC_IRQn, 2, 0);
    HAL_NVIC_EnableIRQ(TIM6_DAC_IRQn);
}

// ② 启动定时器并开启更新中断
HAL_TIM_Base_Start_IT(&htim6);

// ③ 中断服务函数（启动文件中断向量跳转到此）
void TIM6_DAC_IRQHandler(void)
{
    HAL_TIM_IRQHandler(&htim6);   // 内部自动清除 UIF 标志
}

// ④ 更新中断回调：每 1s 进入一次
void HAL_TIM_PeriodElapsedCallback(TIM_HandleTypeDef *htim)
{
    if (htim->Instance == TIM6)
    {
        HAL_GPIO_TogglePin(LED_GPIO_Port, LED_Pin);
    }
}
```

## 定时周期计算与实例

通用公式：

$$T_OVF = (PSC + 1) × (ARR + 1) / f_TIM$$

其中 f_TIM 为定时器输入时钟。以 F407 为例：TIM6 挂在 APB1，APB1 定时器时钟 = 84MHz。

**实例：定时 1s**

- 选 PSC = 8399 → 计数频率 = 84MHz / 8400 = 10kHz（每 0.1ms 计一次数）；
- 选 ARR = 9999 → 计数 10000 次后上溢 → T = 10000 × 0.1ms = **1s**；
- 若需定时 1ms：PSC = 83（84MHz/84 = 1MHz），ARR = 999（1000 次 × 1μs = 1ms）。

## 补充：HAL 库内部与寄存器的对应关系

理解 HAL 封装背后的寄存器操作，才能在出问题时排查：

| HAL 调用 | 内部实际操作的寄存器 |
|-|-|
| HAL_TIM_Base_Init | 配置 CR1（计数方向、ARPE），写 PSC、ARR，置 EGR.UG 产生更新 |
| HAL_TIM_Base_MspInit | RCC->APB1ENR 时钟使能、NVIC 中断配置（弱函数，用户重写） |
| HAL_TIM_Base_Start_IT | 清 SR.UIF，置 DIER.UIE，置 CR1.CEN |
| HAL_TIM_IRQHandler | 读 SR.UIF 判断 → 清标志 → 调用 PeriodElapsedCallback |
| HAL_TIM_Base_Stop_IT | 清 CR1.CEN 停计数，清 DIER.UIE 关中断 |

## 补充：注意事项与常见问题

- **中断服务函数名称因芯片而异**：F1 为 TIM6_IRQHandler，F4/F7 为 TIM6_DAC_IRQHandler（TIM6 与 DAC 共用中断向量），以所用芯片启动文件为准；
- **UIF 标志必须软件清零**：不清零会导致中断反复进入；HAL_TIM_IRQHandler 内部已自动处理；
- **回调中不要放耗时操作**：中断回调里应只置标志/翻转 IO，耗时任务放主循环处理，避免影响实时性；
- **使能中断前先清标志**：防止历史遗留的 UIF 置位导致一使能就立刻进中断；
- **修改 PSC/ARR 生效时机**：使能 ARPE 后，写入值在下一个更新事件才加载到影子寄存器；需要立即生效时置 EGR.UG 强制产生一次更新；
- **DAC 触发应用**：将 CR2 的 MMS 配置为更新事件（010），DAC 侧使能定时器触发，即可由硬件定时驱动 DAC 转换。

# 通用定时器内部结构

## 通用定时器概述

STM32F4xx 系列的通用定时器共 **10 个**：**TIM2\~TIM5**（4 个）与 **TIM9\~TIM14**（6 个）。其中 TIM2\~TIM5 是功能最完整的通用定时器，也是后续 PWM、输入捕获等应用的主力。

通用定时器由**自动重载计数器**（16 位或 32 位）和**可编程预分频器**驱动，可用于：测量输入信号的脉冲宽度（**输入捕获**）、生成输出波形（**输出比较与 PWM**）。借助定时器预分频器和 RCC 时钟控制器预分频器，可将脉冲宽度和波形周期从**几微秒调制到几毫秒**。

这些定时器彼此完全独立、不共享任何资源，并且可以**同步操作**（定时器互联）。

### 资源差异一览（TIM2\~5 / TIM9\~14）

| 特性 | TIM2\~TIM5 | TIM9 / TIM12 | TIM10 / TIM11 / TIM13 / TIM14 |
|-|-|-|-|
| 计数器位数 | 16 位（TIM3/4）或 32 位（TIM2/5） | 16 位（中等容量器件） | 16 位 |
| 计数模式 | 递增、递减、递增/递减（中央对齐） | 递增 | 递增 |
| 独立通道数 | 多达 4 个 | 多达 2 个 | 1 个 |
| 通道功能 | 输入捕获、输出比较、PWM（边沿/中心对齐）、单脉冲 | 输入捕获、输出比较、PWM（边沿对齐）、单脉冲 | 输入捕获、输出比较、PWM（边沿对齐）、单脉冲 |
| 中断/DMA | 更新、触发、输入捕获、输出比较（支持 DMA） | 更新、触发、输入捕获、输出比较 | 更新、输入捕获、输出比较 |
| 特色功能 | 正交编码器、霍尔传感器电路、外部时钟触发、逐周期电流管理 | 多定时器互连同步电路 | — |

**结论：**TIM2\~TIM5 是全功能通用定时器；TIM9\~TIM14 是精简版（通道少、仅递增）。学习重点放在 TIM2\~TIM5。

## 计数模式（时基行为）

通用定时器的计数器有三种计数模式，由 CR1 的 DIR、CMS 位决定：

- **递增计数（Up）**：CNT 从 0 递增到 ARR，到达 ARR 后上溢归零，产生更新事件。例：ARR = 9，计数值 0→1→…→9→0 循环；
- **递减计数（Down）**：CNT 从 ARR 递减到 0，到达 0 后下溢回到 ARR，产生更新事件。例：ARR = 9，计数值 9→8→…→0→9 循环；
- **中央对齐计数（Center-aligned）**：先递增到 ARR 再递减到 0，往复循环（0→1→…→ARR→…→1→0），上溢与下溢处均可产生更新事件。例：ARR = 5，0→5→0 循环。

| 对比项 | 递增计数 | 递减计数 | 中央对齐计数 |
|-|-|-|-|
| 计数方向 | 0 → ARR | ARR → 0 | 0 → ARR → 0 |
| 更新事件产生 | 上溢（CNT = ARR） | 下溢（CNT = 0） | 上溢和/或下溢（由 CMS 配置） |
| 典型应用 | 普通定时、PWM 边沿对齐 | 递减定时场景 | PWM 中心对齐（对称波形） |

无论哪种模式，产生更新事件时都会置 **UIF 更新中断标志**，可触发中断或 DMA（与基本定时器一致）。

## 内部结构总览（六大模块）

以全功能的 TIM2\~TIM5 为例，通用定时器内部由**六大模块**组成，结构如下图所示：

<a href="/embedded-knowledge-base/feishu-assets/diagram-c7af75a4fa1610dc05.svg" target="_blank" rel="noopener" aria-label="打开流程图大图"><img src="/feishu-assets/diagram-c7af75a4fa1610dc05.svg" alt="流程图" loading="lazy" decoding="async" style="max-height:420px;width:auto;object-fit:contain;background:#fff"></a>

<details><summary>流程图源内容</summary>

```text
flowchart LR
    CLK["时钟源
CK_INT / TIx / ETR / ITRx"] --> PSC["预分频器 PSC"]
    PSC --> CNT["计数器 CNT"]
    ARR["自动重载寄存器 ARR"] --> CNT
    CNT -->|"上溢 / 下溢"| UEV["更新事件 UEV"]
    UEV --> IRQ["中断 / DMA 输出"]
    CHIN["输入控制
TI1-TI4 → 滤波 → 边沿检测 → 预分频 → ICx"] --> CCR["捕获/比较寄存器 CCR1-4"]
    CNT --> CCR
    CCR --> OUTC["输出控制"]
    OUTC --> CHOUT["OCx → TIMx_CH1-4"]
    CTRL["控制器
触发 / 从模式 / 编码器接口"] --> CNT
    CTRL --> TRGO["TRGO → 其它定时器 / DAC / ADC"]
```

</details>

| 模块 | 组成与作用 |
|-|-|
| 1、时钟源 | 内部时钟 CK_INT、外部输入引脚 TIx、外部触发 ETR、内部触发 ITRx，经极性选择、边沿检测、预分频、输入滤波后送入各模块 |
| 2、控制器 | 触发控制器 + 从模式控制器（复位、使能、递增/递减、计数）+ 编码器接口；输出 TRGO 到其它定时器、DAC/ADC |
| 3、时基单元 | 预分频器 PSC（CK_PSC → CK_CNT）、计数器 CNT、自动重装载寄存器 ARR（停止、清零或递增/递减） |
| 4、输入控制 | TIMx_CH1\~CH4 → TI1\~TI4 → 输入滤波器和边沿检测器 → TIxFPx → 预分频器 → IC1\~IC4 |
| 5、输入捕获/输出比较 | 捕获/比较寄存器 1\~4（CCR1\~CCR4），与 CNT 比较产生 CCxREF 参考信号 |
| 6、输出控制 | 将 CCxREF 转换为 OC1\~OC4，从 TIMx_CH1\~CH4 引脚输出 |

**信号主线：**时钟源产生计数节拍 → 时基单元计数/重载 → 更新事件（中断/DMA）；外部信号经输入控制 → 捕获/比较寄存器 → 输出控制 → 引脚。控制器负责整个定时器的状态机与互联。

## 时钟选择（以 TIM3 为例）

计数器时钟可由 4 种时钟源提供（对应 SMCR 寄存器配置）：

| 时钟源 | 说明 |
|-|-|
| 内部时钟 CK_INT | 默认时钟源，来自 RCC 的 TIMxCLK，最常用 |
| 外部时钟模式 1 | 外部输入引脚 TIx（通道引脚），按引脚边沿计数 |
| 外部时钟模式 2 | 外部触发输入 ETR，仅适用于 TIM2、TIM3、TIM4 |
| 内部触发输入 ITRx | 一个定时器作为另一个定时器的预分频器（定时器级联），如将 TIM1 配置为 TIM2 的预分频器 |

内部时钟适合通用定时；外部时钟适合对外部信号计数；ITRx 用于定时器互联（级联/同步），是后续输入脉冲计数等应用的铺垫。

## 补充：通用定时器寄存器概览

内部结构对应的寄存器（详细位定义在后续章节展开）：

| 寄存器 | 对应模块 / 作用 |
|-|-|
| CR1 | 控制寄存器：CEN 使能、DIR 计数方向、CMS 中央对齐模式、ARPE 预装载 |
| CR2 | 控制寄存器 2：MMS 主模式选择（TRGO 输出到其它定时器/DAC/ADC） |
| SMCR | 从模式控制寄存器：SMS 从模式、TS 触发选择、ECE 外部时钟使能——时钟源选择的核心 |
| DIER / SR / EGR | 中断使能 / 状态标志 / 事件产生（UIE/UIF/UG 等，与基本定时器一致） |
| CCMR1 / CCMR2 | 捕获/比较模式寄存器：配置各通道为捕获或比较、滤波、分频 |
| CCER | 捕获/比较使能寄存器：CCxE 通道使能、CCxP 极性选择 |
| CNT / PSC / ARR | 时基单元三件套：计数器、预分频器、自动重载寄存器 |
| CCR1\~CCR4 | 捕获/比较寄存器：输入捕获的捕获值 / 输出比较的阈值 |

## 补充：通用定时器 vs 基本定时器

| 对比项 | 基本定时器（TIM6/7） | 通用定时器（TIM2\~5） |
|-|-|-|
| 计数模式 | 仅递增 | 递增、递减、中央对齐 |
| 通道 | 无（无外部引脚） | 4 个独立通道（捕获/比较/PWM） |
| 时钟源 | 仅内部时钟 | 内部/外部 TIx/ETR/ITRx 四种 |
| 触发输出 | TRGO 驱动 DAC | TRGO 到其它定时器、DAC/ADC，支持定时器互联 |
| 编码器/霍尔 | 不支持 | 支持正交编码器、霍尔传感器 |
| 定位 | 纯时基 + DAC 触发 | 时基 + 信号测量 + 波形生成，STM32 最常用的定时器 |

通用定时器 = 基本定时器的全部时基能力 + **输入捕获、输出比较、PWM、编码器**，这就是为什么后续章节（PWM、脉宽捕获、脉冲计数）全部基于它展开。

# 通用定时器之定时功能

## 定时功能概述

使用通用定时器（以 TIM3 为例）进行**定时**：计数器时钟经预分频后驱动计数器递增/递减计数，计满自动重载值后产生**更新事件（UEV）**，进而触发中断或 DMA，实现周期性定时。与基本定时器相比，通用定时器定时多了**计数模式选择**（递增/递减/中央对齐）和**更丰富的时钟源**，但定时核心机制（时基单元 PSC→CNT→ARR）完全一致。

课件以 ST 官网仿真器演示 TIM3 定时配置：PSC 预分频 /4、ARR=20、定时器时钟 16 MHz，得到计数节拍 CK_CNT=4 MHz（0.250 μs/拍）。

## 定时配置步骤（寄存器版）

以内部时钟源定时为例，配置流程如下：

<a href="/embedded-knowledge-base/feishu-assets/diagram-cc309cb9824defdede.svg" target="_blank" rel="noopener" aria-label="打开流程图大图"><img src="/feishu-assets/diagram-cc309cb9824defdede.svg" alt="流程图" loading="lazy" decoding="async" style="max-height:420px;width:auto;object-fit:contain;background:#fff"></a>

<details><summary>流程图源内容</summary>

```text
flowchart TD
    S1["① 时钟源
TIMx_SMCR: SMS=000 禁止从模式, ECE=0 → 内部时钟 CK_INT"] --> S2["② 预分频
TIMx_PSC, 实际分频 = PSC + 1"]
    S2 --> S3["③ 计数模式
TIMx_CR1: DIR 方向 + CMS 对齐模式"]
    S3 --> S4["④ 自动重载值
TIMx_ARR, ARPE 决定是否缓冲"]
    S4 --> S5["⑤ 产生更新事件
TIMx_EGR.UG = 1, 装载影子寄存器"]
    S5 --> S6["⑥ 使能计数器
TIMx_CR1.CEN = 1"]
    S6 --> EV["计数上溢 ARR=CNT"]
    EV --> UEV["更新事件 UEV"]
    UEV --> IRQ["更新中断 / DMA"]
```

</details>

| 步骤 | 操作 | 寄存器 |
|-|-|-|
| ① 选择时钟源 | 选择内部时钟源 CK_INT：从模式控制器禁止（SMS=000），且保证 ECE=0 | TIMx_SMCR |
| ② 预分频 | 设置预分频系数，**实际预分频系数 = PSC + 1** | TIMx_PSC |
| ③ 设置计数模式 | DIR（方向）与 CMS（中心对齐模式）共同决定计数模式 | TIMx_CR1 |
| ④ 设置自动重载值 | ARR 值更新到影子寄存器的方式由 ARPE 决定（0 不缓冲 / 1 缓冲，等待 UEV 才生效） | TIMx_ARR、TIMx_CR1.ARPE |
| ⑤ 产生更新事件 | 软件置 UG=1 手动产生一次更新事件，把预装载值装入影子寄存器 | TIMx_EGR.UG |
| ⑥ 使能计数器 | CEN=1，预分频器时钟由 CK_INT 提供，计数器开始运行 | TIMx_CR1.CEN |

内部时钟源说明：当从模式控制器被禁止（SMS=000）时，**CEN、DIR 位是实际控制位**，只能通过软件修改；UG 位除外（写入后仍自动清零）。CEN 写 1 后，预分频器的时钟就由内部时钟 CK_INT 提供。

### 计数模式：CMS 与 DIR 详解

| CMS[1:0] | 模式 | 行为 | 输出比较中断标志置位时机 |
|-|-|-|-|
| 00 | 边沿对齐模式 | 计数器根据 DIR 位递增或递减计数 | — |
| 01 | 中心对齐模式 1 | 交替递增/递减计数 | 仅递减计数时置 1 |
| 10 | 中心对齐模式 2 | 交替递增/递减计数 | 仅递增计数时置 1 |
| 11 | 中心对齐模式 3 | 交替递增/递减计数 | 递增、递减时都置 1 |

DIR：0=递增计数，1=递减计数。**注意：**① 只要计数器处于使能状态（CEN=1），就不得从边沿对齐模式切换为中心对齐模式；② 当定时器配置为中心对齐模式或编码器模式时，DIR 位为只读。

## 补充：定时计算公式与实例

通用定时器定时周期与基本定时器同一公式：

T = (PSC + 1) × (ARR + 1) / f_TIMxCLK

**课件实例演算**（仿真器 TIM3）：定时器时钟 16 MHz，PSC 分频 /4（即 PSC=3），ARR=20：

- 计数节拍 CK_CNT = 16 MHz / (3+1) = 4 MHz，每拍 0.250 μs（与课件标注一致）；
- 定时周期 T = (3+1) × (20+1) / 16 MHz = 84 / 16 MHz ≈ **5.25 μs**。

**反推配置**（以定时 1 ms 为例）：若 f_TIMxCLK = 84 MHz（如 F407 的 APB1 定时器时钟），取 PSC=83（分频 84），则 ARR = 84 MHz/(83+1)/1000 − 1 = 999，T = 84×1000/84 MHz = 1 ms。

**注意：**课件仿真图时钟标注为 16 MHz（ST 官方演示默认值），实际工程中定时器时钟由芯片时钟树决定——如 STM32F407 的 TIM2\~TIM7 挂 APB1，需按实际 APB1 定时器时钟（APB1 分频不为 1 时为其 2 倍）计算，F1 系列 TIM2\~TIM5 同理在 APB1。写代码前先确认 RCC 时钟树。

## 补充：HAL 库定时流程

HAL 库把上述寄存器操作封装为以下流程（与基本定时器同构）：

```c
/* 1. 时基配置：相当于 PSC / ARR / 计数模式 / CR1 配置 */
TIM_HandleTypeDef htim3;
htim3.Instance = TIM3;
htim3.Init.Prescaler     = 83;        // PSC = 83，实际分频 84
htim3.Init.Period        = 999;       // ARR = 999
htim3.Init.CounterMode   = TIM_COUNTERMODE_UP;  // 递增计数
htim3.Init.ClockDivision = TIM_CLOCKDIVISION_DIV1;
htim3.Init.AutoReloadPreload = TIM_AUTORELOAD_PRELOAD_ENABLE; // ARPE=1 缓冲
HAL_TIM_Base_Init(&htim3);
/* 2. MspInit（自动回调）：RCC 时钟使能 + NVIC 中断配置 */
/* 3. 启动定时器更新中断：相当于 CEN=1 + UIE=1 */
HAL_TIM_Base_Start_IT(&htim3);
/* 4. 中断回调：上溢产生 UEV 后周期性进入 */
void HAL_TIM_PeriodElapsedCallback(TIM_HandleTypeDef *htim)
{
    if (htim->Instance == TIM3) {
        HAL_GPIO_TogglePin(GPIOB, GPIO_PIN_1);   // 定时翻转 LED
    }
}
```

对应关系：Prescaler→PSC、Period→ARR、CounterMode→CR1.DIR/CMS、AutoReloadPreload→CR1.ARPE、HAL_TIM_Base_Start_IT→CR1.CEN+DIER.UIE。通用定时器中断入口为 **TIM3_IRQHandler**（F4 系列），由 HAL_TIM_IRQHandler 分发到回调。

## 补充：通用定时器定时 vs 基本定时器定时

| 对比项 | 基本定时器（TIM6/7） | 通用定时器（TIM2\~5） |
|-|-|-|
| 时钟源 | 仅内部时钟 | 内部/外部 TIx/ETR/ITRx 四种（定时场景默认内部） |
| 计数模式 | 仅递增 | 递增、递减、中央对齐（CMS+DIR） |
| PSC 位数 | 16 位 | 16 位（相同） |
| ARR 位数 | 16 位 | 16 位（TIM3/4）或 32 位（TIM2/5） |
| 定时中断 | 更新中断 UIE | 更新中断 UIE（同），另可配 DMA |
| 配置步骤 | PSC→ARR→UG→UIE→CEN | 时钟源→PSC→计数模式→ARR→UG→CEN |
| 附加价值 | 触发 DAC | 同一定时器还可兼做 PWM/捕获（引脚未占用时） |

纯定时需求两者皆可；若后续需要 PWM、输入捕获、编码器，直接选用通用定时器一步到位。

# 通用定时器之PWM输出原理

## PWM 基础知识

**PWM（Pulse Width Modulation，脉冲宽度调制）**：利用微处理器的数字输出来对模拟电路进行控制的一种非常有效的技术，广泛应用在测量、通信、工控等方面。核心思想：通过高频的"开/关"方波，控制高电平在一个周期内的占比，使负载获得等效的平均功率/电压——数字方式输出模拟效果。

| 参数 | 定义 | 关系/示例 |
|-|-|-|
| 频率 f | 1 秒内信号从高电平到低电平再回到高电平的次数（每秒周期数） | 单位 Hz |
| 周期 T | 一个完整脉冲的时间 | T = 1/f；50 Hz → T = 20 ms |
| 占空比 | 一个脉冲周期内高电平时间与整个周期时间的比例 | 0%\~100%；占空比 0% 时 LED 恒灭 |

以脉冲功率为例：峰值功率 Pₚ（脉冲期间功率）、平均功率 Pₐ（周期内平均功率），一个周期 T 由出光时长 t₁ 与关光时长 t₂ 组成，占空比 = t₁/T。PWM 通过改变占空比改变平均功率，如 LED 亮度、电机转速、舵机角度。

## PWM 输出原理（捕获/比较通道）

PWM 由通用定时器的**捕获/比较通道**产生。以通道 1 为例，信号链分两级：

<a href="/embedded-knowledge-base/feishu-assets/diagram-06085bf70b46e96427.svg" target="_blank" rel="noopener" aria-label="打开流程图大图"><img src="/feishu-assets/diagram-06085bf70b46e96427.svg" alt="流程图" loading="lazy" decoding="async" style="max-height:420px;width:auto;object-fit:contain;background:#fff"></a>

<details><summary>流程图源内容</summary>

```text
flowchart LR
    CNT["计数器 CNT"] --> CMP["比较器
CNT=CCR1 / CNT>CCR1"]
    CCR["捕获/比较寄存器 CCR1
（影子寄存器）"] --> CMP
    UEV["更新事件 UEV
（OC1PE 缓冲时装载）"] --> CCR
    CMP --> OC1M["输出模式控制器
OC1M (CCMR1)"]
    OC1M --> REF["oc1ref 参考信号"]
    REF --> POL["极性选择 CC1P
（CCER）"]
    POL --> EN["输出使能 CC1E
（CCER）"]
    EN --> PIN["TIMx_CH1 引脚 OC1"]
```

</details>

**第一级：捕获/比较通道主电路（图 145）**——CNT 与 CCR 比较：

- 输出比较方向：比较器实时比较**计数器 CNT** 与**捕获/比较影子寄存器**，输出 **CNT=CCR1**（匹配）和 **CNT>CCR1** 两个比较结果；
- 预装载机制：CCR1 写的是预装载寄存器，通过 **compare_transfer** 在更新事件（UEV）时装入影子寄存器（OC1PE=1 缓冲时）；捕获方向则相反，影子寄存器捕获值经 capture_transfer 送给读寄存器；
- 通道方向由 **CC1S**（TIMx_CCMR1）选择：00=输出比较，01/10/11=输入捕获。

**第二级：输出阶段（图 146）**——比较结果转换为引脚电平：

- **输出模式控制器**：按 **OC1M[2:0]**（TIMx_CCMR1）把比较结果（CNT=CCR1 / CNT>CCR1）生成参考信号 **oc1ref**；
- oc1ref 还受 **OCREF_CLR** 清除控制（可选，来自 ETRF，由 OCCS 选择，TIMx_SMCR）；
- **极性选择**：**CC1P**（TIMx_CCER）决定有效电平（高/低有效）；
- **输出使能电路**：**CC1E**（TIMx_CCER）决定通道是否输出，最终从 TIMx_CH1 引脚输出 OC1。

**寄存器对照：**OC1M/CC1S/OC1PE → TIMx_CCMR1；CC1P/CC1E → TIMx_CCER；OCREF_CLR 选择 → TIMx_SMCR。

## OC1M 输出比较模式（8 种）

OC1M[2:0]（TIMx_CCMR1）定义 OC1REF 参考信号的行为（OC1REF 高电平有效，引脚有效电平由 CC1P 决定）：

| OC1M | 模式 | 行为 |
|-|-|-|
| 000 | 冻结 | 比较不影响输出（用于生成时基） |
| 001 | 匹配时输出有效电平 | CNT=CCR1 时 OC1REF 强制为高 |
| 010 | 匹配时输出无效电平 | CNT=CCR1 时 OC1REF 强制为低 |
| 011 | 翻转 | CNT=CCR1 时 OC1REF 翻转 |
| 100 | 强制无效电平 | OC1REF 强制为低 |
| 101 | 强制有效电平 | OC1REF 强制为高 |
| 110 | PWM 模式 1 | 见下节 |
| 111 | PWM 模式 2 | 见下节 |

注意：在 PWM 模式 1/2 下，仅当比较结果发生改变，或输出比较模式由"冻结"切换到"PWM"模式时，OCREF 电平才会发生更改。

## PWM 模式 1 与模式 2

| 模式 | 递增计数（CNT 从 0 → ARR） | 递减计数（CNT 从 ARR → 0） |
|-|-|-|
| PWM 模式 1（110） | CNT < CCR1 有效（OCxREF=1），否则无效（0） | CNT > CCR1 无效（0），否则有效（1） |
| PWM 模式 2（111） | CNT < CCR1 无效（0），否则有效（1） | CNT > CCR1 有效（1），否则无效（0） |

最常用 **PWM 模式 1 + 递增计数**：计数值小于 CCR1 时输出有效电平，达到 CCR1 后翻转为无效，上溢归零后进入下一周期，形成方波。

课件时序（ARR=20、CCR1=10）：CNT 从 0 递增，0\~9 输出有效电平、10\~20 输出无效电平，tout2 为两次电平变化间隔，tout1 为计数周期——改变 CCR1 即改变占空比，改变 ARR/PSC 即改变周期（频率）。

## 补充：PWM 参数计算公式

边沿对齐 + PWM 模式 1（递增）下：

f_PWM = f_TIMxCLK / [(PSC + 1) × (ARR + 1)]

占空比 = CCR1 / (ARR + 1) × 100%

**课件实例演算**（TIM3：16 MHz、PSC=3、ARR=20、CCR1=10）：

- 计数节拍 CK_CNT = 16 MHz / 4 = 4 MHz（0.250 μs/拍）；
- f_PWM = 4 MHz / 21 ≈ **190.5 kHz**（周期约 5.25 μs）；
- 占空比 = 10 / 21 ≈ **47.6%**。

**常用实例**：50 Hz 舵机控制（周期 20 ms）——若 f_TIMxCLK = 84 MHz，取 PSC=83、ARR=19999 即得 f=84M/84/20000=50 Hz；CCR 取 500\~2500（0.5\~2.5 ms）对应 0°\~180°。

## 补充：PWM 中断（占空比与频率的硬件基础）

| 状态标志 | 中断控制 | 触发条件 | 作用 |
|-|-|-|-|
| CC1IF | CC1IE | CNT = CCR1（比较匹配） | 决定 PWM 占空比（电平翻转时刻） |
| UIF | UIE | 计数器上溢（UDIS=0 允许 UEV） | 决定 PWM 频率（周期起点） |

CNT=CCR1 时 TIMx_SR.CC1IF 置 1，若 CC1IE 使能则触发捕获/比较中断；计数器溢出时 UIF 置 1，若 UIE 使能则触发更新中断。PWM 输出本身不需要中断，中断用于在占空比/周期关键点执行用户逻辑。

## 补充：HAL 库 PWM 输出流程

```c
/* 1. 时基配置（同定时）：Prescaler / Period / CounterMode */
TIM_HandleTypeDef htim3;
htim3.Instance = TIM3;
htim3.Init.Prescaler     = 83;              // PSC，决定频率
htim3.Init.Period        = 19999;           // ARR，决定频率
htim3.Init.CounterMode   = TIM_COUNTERMODE_UP;
HAL_TIM_PWM_Init(&htim3);
/* 2. 通道配置：OC1M=PWM1、CCR 初值、极性（对应 CCMR1/CCER） */
TIM_OC_InitTypeDef sConfigOC;
sConfigOC.OCMode     = TIM_OCMODE_PWM1;     // OC1M=110
sConfigOC.Pulse      = 1000;                // CCR1，决定占空比
sConfigOC.OCPolarity = TIM_OCPOLARITY_HIGH; // CC1P
HAL_TIM_PWM_ConfigChannel(&htim3, &sConfigOC, TIM_CHANNEL_1);
/* 3. 启动 PWM 输出：相当于 CC1E=1 + CEN=1 */
HAL_TIM_PWM_Start(&htim3, TIM_CHANNEL_1);
/* 4. 运行中动态调占空比：改 CCR1 */
__HAL_TIM_SET_COMPARE(&htim3, TIM_CHANNEL_1, 500);  // 占空比改为 500/20000 = 2.5%
```

对应关系：Pulse→CCR1、OCMode→CCMR1.OC1M、OCPolarity→CCER.CC1P、HAL_TIM_PWM_Start→CCER.CC1E+CR1.CEN、\_\_HAL_TIM_SET_COMPARE→运行时改写 CCR1（占空比动态可调）。

# 通用定时器之PWM输出应用

## PWM 输出应用概述

通用定时器 PWM 输出是 STM32 最常用的应用之一，典型场景：**LED 呼吸灯/亮度调节、直流电机调速、舵机角度控制、蜂鸣器音量调节、模拟量输出（DAC 替代）**。

核心原理一句话：**频率由 PSC/ARR 决定，占空比由 CCR 决定**——PWM 引脚以固定频率输出方波，通过改变 CCR 改变高电平占比，负载获得等效的平均功率/电压。数字引脚即可输出"模拟效果"，无需额外 DAC 电路。

## PWM 输出原理（重点）

### 边沿对齐 PWM（最常用）

配置：递增计数 + PWM 模式 1 + CC1P 高有效。一个周期内的输出规律：

- CNT 从 0 递增到 ARR（重载值），每个计数节拍加 1；
- 当 **CNT < CCR1**：比较器输出 OC1REF 有效（高电平）；
- 当 **CNT ≥ CCR1**：OC1REF 无效（低电平）；
- CNT 到达 ARR 后上溢归零，产生更新事件，进入下一周期。

| CNT 区间 | 比较结果 | OC1REF / 引脚输出 |
|-|-|-|
| 0 \~ CCR1−1 | CNT < CCR1 | 有效电平（高） |
| CCR1 \~ ARR | CNT ≥ CCR1 | 无效电平（低） |
| = ARR（上溢） | 更新事件 UEV | 归零，开始下一周期 |

**两个关键公式**（边沿对齐 + PWM1 + 递增）：

f_PWM = f_TIMxCLK / [(PSC + 1) × (ARR + 1)]

占空比 D = CCR1 / (ARR + 1) × 100%

边界：CCR1=0 → 占空比 0%（恒低）；CCR1=ARR+1 → 占空比 100%（恒高）。

### 中心对齐 PWM

配置：中央对齐计数（CMS=01/10/11）+ PWM 模式 1。计数器先递增到 ARR 再递减到 0，一个完整周期包含**两段计数**，因此：

- 输出频率减半：f_PWM ≈ f_CK_CNT / (2 × ARR)（近似，忽略 ±1 边界）；
- 波形关于周期中点**对称**，高低电平跳变次数更多，谐波/电磁噪声更小，适合电机等对噪声敏感场景；
- 占空比调节：D ≈ CCR1 / ARR（对称关系）。

边沿对齐实现简单、频率公式直观，绝大多数应用默认选它；需要对称波形或降噪时选中心对齐。

### 极性（CC1P）与有效电平

OC1REF 恒为高电平有效，但引脚输出的**有效电平**由 TIMx_CCER.CC1P 决定：CC1P=0 高电平有效（常用），CC1P=1 低电平有效（输出反相）。占空比概念不变，仅高低电平互换。

## HAL 库编程流程（重点）

以 F407 + TIM3_CH1（PA6 复用 AF2）输出 PWM 为例，完整六步：

<a href="/embedded-knowledge-base/feishu-assets/diagram-d77433bb35654cb1e7.svg" target="_blank" rel="noopener" aria-label="打开流程图大图"><img src="/feishu-assets/diagram-d77433bb35654cb1e7.svg" alt="流程图" loading="lazy" decoding="async" style="max-height:420px;width:auto;object-fit:contain;background:#fff"></a>

<details><summary>流程图源内容</summary>

```text
flowchart TD
    A["① 时钟使能
MspInit: GPIOA + TIM3 时钟, NVIC"] --> B["② GPIO 复用
PA6: AF_PP, Alternate=AF2_TIM3"]
    B --> C["③ 时基初始化
HAL_TIM_PWM_Init
PSC / ARR / CounterMode"]
    C --> D["④ 通道配置
HAL_TIM_PWM_ConfigChannel
OCMode=PWM1, Pulse=CCR, 极性"]
    D --> E["⑤ 启动输出
HAL_TIM_PWM_Start
CC1E=1 + CEN=1"]
    E --> F["⑥ 动态调占空比
__HAL_TIM_SET_COMPARE
随时改写 CCR1"]
```

</details>

| 步骤 | HAL 操作 | 底层寄存器 |
|-|-|-|
| ① 时钟使能 | HAL_TIM_PWM_MspInit：GPIO 时钟 + TIM3 时钟 + NVIC（自动回调） | RCC_AHB1/APB1ENR |
| ② GPIO 复用 | GPIO_InitTypeDef：PA6 复用推挽 AF2（TIM3_CH1） | GPIOx_AFRL/MODER/OTYPER |
| ③ 时基初始化 | HAL_TIM_PWM_Init：Prescaler/Period/CounterMode | PSC、ARR、CR1 |
| ④ 通道配置 | HAL_TIM_PWM_ConfigChannel：OCMode=PWM1、Pulse=CCR、极性 | CCMR1(OC1M)、CCR1、CCER(CC1P) |
| ⑤ 启动输出 | HAL_TIM_PWM_Start | CCER.CC1E=1、CR1.CEN=1 |
| ⑥ 动态调占空比 | \_\_HAL_TIM_SET_COMPARE 随时改写 CCR1 | CCR1（运行时写） |

```c
/* ①+②：MspInit 自动回调 + 主函数 GPIO 复用（也可全部放 MspInit） */
void HAL_TIM_PWM_MspInit(TIM_HandleTypeDef *htim)
{
    GPIO_InitTypeDef GPIO_InitStruct = {0};
    __HAL_RCC_TIM3_CLK_ENABLE();
    __HAL_RCC_GPIOA_CLK_ENABLE();
    GPIO_InitStruct.Pin       = GPIO_PIN_6;               // PA6 = TIM3_CH1
    GPIO_InitStruct.Mode      = GPIO_MODE_AF_PP;          // 复用推挽
    GPIO_InitStruct.Pull      = GPIO_NOPULL;
    GPIO_InitStruct.Speed     = GPIO_SPEED_FREQ_HIGH;
    GPIO_InitStruct.Alternate = GPIO_AF2_TIM3;            // 复用功能 AF2
    HAL_GPIO_Init(GPIOA, &GPIO_InitStruct);
}
/* ③+④：时基与通道配置 */
TIM_HandleTypeDef htim3;
TIM_OC_InitTypeDef sConfigOC;
htim3.Instance = TIM3;
htim3.Init.Prescaler     = 83;              // PSC：84MHz/84 = 1MHz 计数节拍
htim3.Init.Period        = 19999;           // ARR：f_PWM = 1MHz/20000 = 50Hz
htim3.Init.CounterMode   = TIM_COUNTERMODE_UP;
HAL_TIM_PWM_Init(&htim3);
sConfigOC.OCMode     = TIM_OCMODE_PWM1;     // PWM 模式 1
sConfigOC.Pulse      = 1500;                // CCR1：1500/20000 = 7.5%（舵机中位）
sConfigOC.OCPolarity = TIM_OCPOLARITY_HIGH; // CC1P=0 高有效
HAL_TIM_PWM_ConfigChannel(&htim3, &sConfigOC, TIM_CHANNEL_1);
/* ⑤ 启动输出 */
HAL_TIM_PWM_Start(&htim3, TIM_CHANNEL_1);
/* ⑥ 运行中动态调整（占空比 = 值/20000） */
__HAL_TIM_SET_COMPARE(&htim3, TIM_CHANNEL_1, 1000);   // 5%：舵机 0.5ms 一侧极限
__HAL_TIM_SET_COMPARE(&htim3, TIM_CHANNEL_1, 2000);   // 10%：舵机 1ms~2.5ms 区间
```

占空比换算：CCR = D × (ARR + 1)，或反推 D = CCR/(ARR+1)。上例 ARR=19999，CCR=1500 → 1500/20000 = 7.5%。

## 补充：寄存器操作流程（对照 HAL）

| 步骤 | 寄存器操作 |
|-|-|
| ① 时钟 | RCC 使能 GPIOA、TIM3 时钟 |
| ② GPIO | PA6 配置为复用功能（AFRL=AF2、MODER=复用） |
| ③ 通道方向 | CCMR1.CC1S=00（输出比较方向） |
| ④ 模式 | CCMR1.OC1M=110（PWM 模式 1）；OC1PE=1 使能缓冲（可选） |
| ⑤ 极性/使能 | CCER.CC1P=0（高有效）、CCER.CC1E=1（通道输出使能） |
| ⑥ 时基 | PSC=83、ARR=19999；CR1.ARPE=1（缓冲）、CR1.CEN=1（启动） |
| ⑦ 占空比 | 写 CCR1=1500（运行中可随时改写） |

对比可见 HAL 六步与寄存器七步一一对应：PWM_Init→时基、ConfigChannel→CCMR1/CCR1/CCER、PWM_Start→CC1E+CEN、SET_COMPARE→写 CCR1。

## 补充：典型应用实例

### LED 呼吸灯

原理：周期性地让占空比从 0% 渐变到接近 100% 再回落，视觉上亮度"呼吸"。频率取 1 kHz 以上（LED 无闪烁），用循环逐步改 CCR：

```c
while (1) {
    for (uint16_t i = 0; i <= 1000; i += 5) {          // 渐亮
        __HAL_TIM_SET_COMPARE(&htim3, TIM_CHANNEL_1, i);
        HAL_Delay(2);
    }
    for (uint16_t i = 1000; i > 0; i -= 5) {           // 渐灭
        __HAL_TIM_SET_COMPARE(&htim3, TIM_CHANNEL_1, i);
        HAL_Delay(2);
    }
}
```

### 舵机控制

标准舵机：50 Hz（周期 20 ms），高电平脉宽 0.5\~2.5 ms 对应 0°\~180°。以 84 MHz、PSC=83（计数节拍 1 MHz，1 拍 = 1 μs）：

- 0°：CCR = 500（0.5 ms）；
- 90°：CCR = 1500（1.5 ms）；
- 180°：CCR = 2500（2.5 ms）。

改变 CCR 即改变角度，响应平滑可加延时。

### 直流电机调速

PWM 频率建议 **10\~20 kHz**（高于人耳可听范围，避免电机啸叫）；占空比越大平均电压越高、转速越快。改变 CCR 即调速，方向控制另接 H 桥/驱动芯片的 DIR 引脚。

## 补充：注意事项

- **GPIO 复用必须配**：漏配 GPIO_AF 会导致引脚无输出或输出电平错误——PWM 不通的排查第一站；
- **频率选择**：LED/舵机 50 Hz\~1 kHz 即可；电机用 10\~20 kHz；过低会闪烁/啸叫，过高增加开关损耗；
- **引脚冲突**：同一引脚被多个外设复用（如 USART、I2C）会互相抢占，用 CubeMX 检查冲突；
- **CCR 边界**：CCR=0 输出恒低、CCR=ARR+1 输出恒高，超出边界无意义；
- **长周期需求**：需要极低频率（如 1 Hz 呼吸）时优先用 32 位定时器 TIM2/TIM5，16 位 ARR 上限 65535 可能不够（84 MHz 下 16 位最小频率约 1.28 kHz）；
- **占空比动态修改**：运行时写 CCR 立即生效；若开启 OC1PE 缓冲则等下一个更新事件生效（更平滑、无毛刺）。

# 通用定时器之输入脉宽捕获原理

## 输入捕获原理

**输入捕获（Input Capture）**：在输入捕获模式下，当 CH 通道上的信号检测到**跳变沿**（上升沿/下降沿）后，硬件自动用捕获/比较寄存器（TIMx_CCRx）**锁存计数器 CNT 的当前值**。通过程序捕获 CH 通道上下降沿与上升沿发生的时刻（CCR 值），两次捕获的时间差即为脉冲的脉宽。

测量步骤：

- ① 配置通道为输入捕获模式（CC1S=输入），选择捕获极性（上升沿/下降沿）；
- ② 信号跳变沿到来 → 硬件把当前 CNT 锁存进 CCR1，同时置 CC1IF 标志（可触发中断）；
- ③ 程序中读取 CCR1，得到该沿发生的"时刻"；
- ④ 捕获下一个沿（如下降沿）再读一次 CCR1；
- ⑤ 两次 CCR 之差（加上中间溢出补偿）换算成时间，即脉冲高电平宽度。

典型应用：测量 PWM 脉宽、测频率（两个同极性沿的时间差）、解码遥控器信号、测量外部脉冲宽度。

## 捕获时间计算公式（重点）

两次捕获之间的真实时间（课件公式）：

t_c = [CCR1(2) − CCR1(1)] / f_CK_CNT + (ARR + 1) × N_UEV / f_CK_CNT

其中：CCR1(1)、CCR1(2) 为两次捕获的计数值；N_UEV 为两次捕获之间计数器**发生上溢的次数**；f_CK_CNT 为计数时钟（= f_TIMxCLK/(PSC+1)）。

**为什么需要 N_UEV 补偿：**CNT 是循环计数的（0→ARR→0），若两次捕获之间计数器溢出过一次或多次，直接做 CCR 差会少算整段周期。上图时序中 CCR1(1)=6、CCR1(2)=2（第二次值反而小，说明中间溢出绕回），N_UEV=1、ARR=20：

t_c = (2 − 6)/4 MHz + (20+1)×1/4 MHz = (−4 + 21)/4 MHz = 17/4 MHz ≈ **4.25 μs**

**简化式**（无溢出时 N_UEV=0）：t_c = [CCR1(2) − CCR1(1)] / f_CK_CNT，直接由计数值差换算时间，每个计数节拍 = 1/f_CK_CNT 秒。

## 输入阶段电路（图 144）

通道信号进入捕获/比较寄存器前的处理链路（以通道 1 为例）：

<a href="/embedded-knowledge-base/feishu-assets/diagram-c5aa9ba6a0d759cd9c.svg" target="_blank" rel="noopener" aria-label="打开流程图大图"><img src="/feishu-assets/diagram-c5aa9ba6a0d759cd9c.svg" alt="流程图" loading="lazy" decoding="async" style="max-height:420px;width:auto;object-fit:contain;background:#fff"></a>

<details><summary>流程图源内容</summary>

```text
flowchart LR
    TI1["TIMx_CH1 引脚 TI1"] --> FILT["输入滤波器 ICF
（抗抖动）"]
    FILT --> TI1F["TI1F"]
    TI1F --> EDGE["边沿检测器
CC1P/CC1NP 选沿"]
    EDGE --> SEL["输入选择 CC1S
TI1 直接 / TI2 交叉 / TRC"]
    SEL --> IC["IC1"]
    IC --> PRE["捕获预分频 ICPS
/1、/2、/4、/8"]
    PRE --> CAP["IC1PS"]
    CAP --> CCR["捕获/比较寄存器
锁存 CNT 当前值"]
    CCR --> IRQ["CC1IF 中断
读 CCR 得捕获时刻"]
    CNT["计数器 CNT"] --> CCR
```

</details>

TI1 → **输入滤波器**（ICF，抗抖）→ TI1F → **边沿检测器**（CC1P/CC1NP 选沿）→ **输入选择**（CC1S 选源）→ **预分频器**（ICPS /1、/2、/4、/8）→ IC1PS → 捕获寄存器

| 环节 | 控制位 | 所在寄存器 | 作用 |
|-|-|-|-|
| 输入滤波 | ICF[3:0] | TIMx_CCMR1 | 数字滤波，滤除毛刺（连续 N 个采样一致才确认跳变） |
| 边沿检测 | CC1P / CC1NP | TIMx_CCER | 选择上升沿/下降沿/双边沿捕获 |
| 输入选择 | CC1S[1:0] | TIMx_CCMR1 | 选输入源：TI1 直接映射 / TI1 交叉（用 TI2）/ TRC |
| 捕获分频 | ICPS[1:0] | TIMx_CCMR1 | /1、/2、/4、/8，降低捕获事件频率 |
| 捕获使能 | CC1E | TIMx_CCER | 允许捕获/比较通道工作 |

另外 TI1F_ED（双边沿）可输出到从模式控制器，用于触发其它定时器；通道 2 的信号（TI2FP1）也可作为通道 1 的输入源（交叉连接）。

## 捕获主电路与软件触发（图 145）

捕获动作发生在**捕获/比较主电路**：

- 输入模式下，**CC1S=输入模式** + **CC1E 捕获使能**后，捕获事件（来自输入阶段的 IC1PS）产生 **capture_transfer** 信号，把计数器 CNT 的当前值锁存进**捕获/比较影子寄存器**；
- CPU 通过 APB 总线读 CCR1H/CCR1L 得到捕获值（读取期间 read_in_progress 保护，16 位值按一次 16 位读即可）；
- 也可用 **CC1G（TIMx_EGR）**软件产生捕获事件，用于测试/校准；
- 输出比较方向则相反：CPU 写 CCR 预装载寄存器，UEV 时装入影子寄存器参与比较（与第 6 章共用同一套 CCR 电路）。

即：**同一个 CCR 寄存器，CC1S 决定方向——输入捕获时硬件写、CPU 读；输出比较时 CPU 写、硬件读。**

## 输入捕获中断

| 状态标志 | 中断控制 | 状态名称 | 含义 |
|-|-|-|-|
| CC1IF | CC1IE | 捕获/比较 1 中断标志 | 发生捕获事件（跳变沿到来、CCR 已锁存） |
| UIF | UIE | 更新中断标志 | 计数器溢出（用于 N_UEV 计数补偿） |

当 CH 通道发生输入捕获时 CC1IF 置 1，若 CC1IE 使能则触发捕获/比较中断（在中断里读 CCR 并切换极性）；计数器溢出时 UIF 置 1（UDIS=0 允许 UEV），若 UIE 使能则触发更新中断——**测长脉宽时必须在更新中断里累计 N_UEV**，否则脉宽计算会少算溢出周期。

## 补充：HAL 库输入捕获流程

以 F407 TIM3_CH1（PA6）测量 PWM 高电平脉宽为例：

```c
/* 1. GPIO 复用（PA6 复用 AF2_TIM3）+ 时基初始化（同 PWM 章节，略） */
/* 2. 输入捕获通道配置 */
TIM_IC_InitTypeDef sConfigIC;
sConfigIC.Channel     = TIM_CHANNEL_1;
sConfigIC.ICPolarity  = TIM_INPUTCHANNELPOLARITY_RISING; // 先捕获上升沿
sConfigIC.ICSelection = TIM_ICSELECTION_DIRECTTI;        // TI1 直接映射（CC1S=01）
sConfigIC.ICPrescaler = TIM_ICPSC_DIV1;                  // 捕获不分频（ICPS=00）
sConfigIC.ICFilter    = 0;                               // 无滤波（ICF=0000）
HAL_TIM_IC_ConfigChannel(&htim3, &sConfigIC, TIM_CHANNEL_1);
/* 3. 启动输入捕获（带中断） */
HAL_TIM_IC_Start_IT(&htim3, TIM_CHANNEL_1);
/* 4. 捕获回调：上升沿记时间，下降沿算脉宽 */
uint32_t cap1 = 0, cap2 = 0, uev_cnt = 0;
void HAL_TIM_IC_CaptureCallback(TIM_HandleTypeDef *htim)
{
    if (htim->Channel == HAL_TIM_ACTIVE_CHANNEL_1) {
        if (htim->Instance->CCER & TIM_CCER_CC1P) {        // 当前是下降沿捕获
            cap2 = HAL_TIM_ReadCapturedValue(htim, TIM_CHANNEL_1);
            /* 高电平脉宽 = (cap2-cap1)/f_CK_CNT + (ARR+1)*uev_cnt/f_CK_CNT */
            TIM_RESET_CAPTUREPOLARITY(&htim3, TIM_CHANNEL_1);        // 改回上升沿
            TIM_SET_CAPTUREPOLARITY(&htim3, TIM_CHANNEL_1, TIM_INPUTCHANNELPOLARITY_RISING);
        } else {                                              // 当前是上升沿捕获
            cap1 = HAL_TIM_ReadCapturedValue(htim, TIM_CHANNEL_1);
            TIM_RESET_CAPTUREPOLARITY(&htim3, TIM_CHANNEL_1);        // 改为下降沿
            TIM_SET_CAPTUREPOLARITY(&htim3, TIM_CHANNEL_1, TIM_INPUTCHANNELPOLARITY_FALLING);
        }
    }
}
/* 5. 更新中断回调：累计溢出次数（测长脉宽必需） */
void HAL_TIM_PeriodElapsedCallback(TIM_HandleTypeDef *htim)
{
    if (htim->Instance == TIM3) uev_cnt++;
}
```

对应关系：ICPolarity→CCER.CC1P/CC1NP（捕获极性）、ICSelection→CCMR1.CC1S（输入源）、ICPrescaler→CCMR1.ICPS、ICFilter→CCMR1.ICF、HAL_TIM_IC_Start_IT→CCER.CC1E+DIER.CC1IE/UIE、ReadCapturedValue→读 CCR1。

## 补充：注意事项

- **溢出补偿不能漏**：被测脉宽可能大于一个计数周期（ARR+1 拍），必须在更新中断中累计 N_UEV，否则结果偏小；
- **极性切换时序**：测量单脉宽需先捕获上升沿再捕获下降沿，回调里要切换 CC1P 极性并注意设置生效时机；
- **分频与滤波**：信号噪声大时开 ICF 滤波（如 0x0F）；捕获事件太频繁可用 ICPS 分频（每 2/4/8 次捕获才触发一次）；
- **捕获标志处理**：读 CCR 会自动清 CC1IF，无需手动清；
- **频率上限**：输入信号频率不能超过 f_CK_CNT/2（奈奎斯特），否则计数不可靠；
- **32 位定时器**：TIM2/TIM5 的 CCR 为 32 位，可测更宽范围/更高分辨率。

# 通用定时器之输入脉宽捕获应用

## 输入捕获应用概述

第八章讲了输入捕获的硬件原理（跳变沿→CCR 锁存 CNT）。本章把原理落到**实际测量**：用定时器输入捕获测量外部信号的**高电平脉宽、周期（频率）、占空比**。典型应用：

- 测量未知 PWM 信号的频率与占空比（电机/舵机调试）；
- 测外部脉冲宽度（传感器输出、遥控器信号解码）；
- 测两个事件的时间间隔（测速、测距）；
- 配合 DMA 批量捕获连续沿，实现协议解码。

核心思想不变：**沿的"时刻"就是 CCR 捕获到的计数值，时刻差 × 计数节拍 = 时间差**，再加溢出补偿。

## 测量原理（重点）

### 三种测量方式

| 测量目标 | 捕获方式 | 计算公式 |
|-|-|-|
| 高电平脉宽 | 上升沿捕获 → 下降沿捕获 | 脉宽 = (CCR_下降 − CCR_上升 + 溢出补偿) / f_CK_CNT |
| 周期 T | 上升沿捕获 → 下一次上升沿捕获 | T = (CCR_第2次 − CCR_第1次 + 溢出补偿) / f_CK_CNT |
| 频率 f | 同上（先得周期） | f = 1 / T |
| 占空比 D | 脉宽 / 周期 | D = 脉宽 / T × 100% |

溢出补偿项 = (ARR + 1) × N_UEV / f_CK_CNT（N_UEV 由更新中断累计，测长周期必需）。

### 一次完整测量流程（测频率+占空比）

<a href="/embedded-knowledge-base/feishu-assets/diagram-78018c26c6352ea2f0.svg" target="_blank" rel="noopener" aria-label="打开流程图大图"><img src="/feishu-assets/diagram-78018c26c6352ea2f0.svg" alt="流程图" loading="lazy" decoding="async" style="max-height:420px;width:auto;object-fit:contain;background:#fff"></a>

<details><summary>流程图源内容</summary>

```text
flowchart TD
    SIG["PWM 输入信号"] --> R1["上升沿 1
捕获 CCR_a（起点）"]
    R1 --> FALL["下降沿
捕获 CCR_b"]
    FALL --> PW["高电平脉宽
= (CCR_b − CCR_a + 补偿) / f_CK_CNT"]
    PW --> R2["上升沿 2
捕获 CCR_c"]
    R2 --> PER["周期 T
= (CCR_c − CCR_a + 补偿) / f_CK_CNT"]
    PER --> FREQ["频率 f = 1 / T"]
    PER --> DUTY["占空比 D = 脉宽 / T × 100%"]
    OVF["更新中断累计 N_UEV
（溢出补偿）"] -.-> PW
    OVF -.-> PER
```

</details>

- ① 捕获上升沿 1，记录 CCR_a；
- ② 极性切到下降沿，捕获下降沿，记录 CCR_b → 高电平脉宽 = (CCR_b − CCR_a + 补偿) / f_CK_CNT；
- ③ 极性切回上升沿，捕获上升沿 2，记录 CCR_c → 周期 = (CCR_c − CCR_a + 补偿) / f_CK_CNT，频率 = 1/周期；
- ④ 占空比 = 脉宽 / 周期。

两次同极性沿之间若计数器溢出过（CCR 变小或差值异常），必须用 N_UEV 补偿——尤其测低频信号时。

**数值实例**：f_CK_CNT = 4 MHz（0.25 μs/拍），CCR_a=100、CCR_b=300、无溢出：脉宽 = (300−100) × 0.25 μs = 50 μs；若 CCR_c=900：周期 = 800 × 0.25 μs = 200 μs，f = 5 kHz，占空比 = 25%。

## 寄存器控制（重点）

### 相关寄存器一览

| 寄存器 | 关键位 | 作用 |
|-|-|-|
| TIMx_CCMR1 | CC1S[1:0] | 通道方向/输入源：00 输出比较；01 TI1 直接映射；10 TI2 交叉；11 TRC |
| TIMx_CCMR1 | ICF[3:0] | 输入滤波（0\~15，抗抖） |
| TIMx_CCMR1 | ICPS[1:0] | 捕获分频 /1、/2、/4、/8 |
| TIMx_CCER | CC1P / CC1NP | 捕获极性：上升沿 / 下降沿 / 双边沿（运行中可切换） |
| TIMx_CCER | CC1E | 捕获/比较通道使能 |
| TIMx_DIER | CC1IE / UIE | 捕获中断使能 / 更新中断使能（溢出计数） |
| TIMx_EGR | CC1G | 软件产生捕获事件（测试用） |
| TIMx_PSC / ARR / CNT | — | 时基：决定 f_CK_CNT 与计数范围（影响测量分辨率与量程） |
| TIMx_CCR1 | — | 捕获值（CPU 只读，读出即清 CC1IF） |

### 寄存器版配置流程

| 步骤 | 操作 |
|-|-|
| ① 时钟 | RCC 使能 GPIOA、TIM3 时钟 |
| ② GPIO | PA6 配置为复用输入（AF2，MODER=复用，上下拉按信号源定） |
| ③ 时基 | PSC=83（84MHz→1MHz）、ARR=0xFFFF（最大量程）、CR1.ARPE=1 |
| ④ 输入捕获配置 | CCMR1：CC1S=01（TI1 直接）、ICF=0、ICPS=00；CCER：CC1P=0（上升沿）、CC1E=1 |
| ⑤ 中断使能 | DIER.CC1IE=1、DIER.UIE=1（要溢出计数则开）；NVIC 使能 TIM3_IRQn |
| ⑥ 启动 | CR1.CEN=1，等待捕获事件 |

运行中改极性只需改 CCER.CC1P（配合 CC1NP），无需停止定时器。

## HAL 库编程流程（重点）

| 步骤 | HAL 操作 | 对应寄存器 |
|-|-|-|
| ① 时钟+GPIO | MspInit：GPIOA/TIM3 时钟，PA6 复用 AF2 | RCC、GPIOx_AFRL |
| ② 时基 | HAL_TIM_IC_Init（Prescaler/Period） | PSC、ARR、CR1 |
| ③ 通道配置 | HAL_TIM_IC_ConfigChannel（ICPolarity/ICSelection/ICPrescaler/ICFilter） | CCMR1、CCER |
| ④ 启动中断捕获 | HAL_TIM_IC_Start_IT | CCER.CC1E、DIER、CR1.CEN |
| ⑤ 捕获回调 | HAL_TIM_IC_CaptureCallback：读 CCR、切换极性、状态机 | 读 CCR1、CCER.CC1P |
| ⑥ 更新回调 | HAL_TIM_PeriodElapsedCallback：累计 N_UEV | UIF |

```c
/* 时基：f_CK_CNT = 1MHz（1 拍 = 1μs），ARR 拉满量程 */
htim3.Instance = TIM3;
htim3.Init.Prescaler     = 83;                 // 84MHz/84 = 1MHz
htim3.Init.Period        = 0xFFFF;             // 65535 拍 ≈ 65.5ms 量程
htim3.Init.CounterMode   = TIM_COUNTERMODE_UP;
HAL_TIM_IC_Init(&htim3);
/* 通道：TI1 直接映射，先捕获上升沿 */
TIM_IC_InitTypeDef sConfigIC;
sConfigIC.ICPolarity  = TIM_INPUTCHANNELPOLARITY_RISING;
sConfigIC.ICSelection = TIM_ICSELECTION_DIRECTTI;
sConfigIC.ICPrescaler = TIM_ICPSC_DIV1;
sConfigIC.ICFilter    = 0;
HAL_TIM_IC_ConfigChannel(&htim3, &sConfigIC, TIM_CHANNEL_1);
HAL_TIM_IC_Start_IT(&htim3, TIM_CHANNEL_1);
/* 捕获回调：三沿状态机（上升沿→下降沿→上升沿） */
volatile uint32_t cap1 = 0, cap2 = 0, cap3 = 0, uev_cnt = 0;
volatile uint8_t  capture_state = 0;   // 0: 等第1个上升沿; 1: 等下降沿; 2: 等第2个上升沿
void HAL_TIM_IC_CaptureCallback(TIM_HandleTypeDef *htim)
{
    if (htim->Channel != HAL_TIM_ACTIVE_CHANNEL_1) return;
    switch (capture_state) {
    case 0:  /* 上升沿 1：记起点，切下降沿 */
        cap1 = HAL_TIM_ReadCapturedValue(htim, TIM_CHANNEL_1);
        uev_cnt = 0;
        TIM_RESET_CAPTUREPOLARITY(htim, TIM_CHANNEL_1);
        TIM_SET_CAPTUREPOLARITY(htim, TIM_CHANNEL_1, TIM_INPUTCHANNELPOLARITY_FALLING);
        capture_state = 1;
        break;
    case 1:  /* 下降沿：记脉宽终点，切回上升沿 */
        cap2 = HAL_TIM_ReadCapturedValue(htim, TIM_CHANNEL_1);
        TIM_RESET_CAPTUREPOLARITY(htim, TIM_CHANNEL_1);
        TIM_SET_CAPTUREPOLARITY(htim, TIM_CHANNEL_1, TIM_INPUTCHANNELPOLARITY_RISING);
        capture_state = 2;
        break;
    case 2:  /* 上升沿 2：计算脉宽、周期、频率、占空比 */
        cap3 = HAL_TIM_ReadCapturedValue(htim, TIM_CHANNEL_1);
        capture_state = 0;
        /* 脉宽/周期计算（溢出用 uev_cnt 补偿） */
        /* pulse_width = (cap2 - cap1 + (ARR+1)*uev_cnt) / 1MHz（μs） */
        /* period      = (cap3 - cap1 + (ARR+1)*uev_cnt) / 1MHz（μs） */
        /* freq        = 1e6 / period（Hz）；duty = pulse_width / period */
        break;
    }
}
void HAL_TIM_PeriodElapsedCallback(TIM_HandleTypeDef *htim)
{
    if (htim->Instance == TIM3) uev_cnt++;   /* 溢出计数，补偿用 */
}
```

注意：capture_state=1 与 =2 之间、跨溢出时的 N_UEV 归零时机要根据实际测量窗口调整；读 CCR 自动清 CC1IF。

## 补充：应用实例

### 测量未知 PWM 频率与占空比

按上述状态机得到：周期 = (cap3 − cap1 + 补偿) / f_CK_CNT，脉宽 = (cap2 − cap1 + 补偿) / f_CK_CNT。若 f_CK_CNT=1 MHz 且无溢出，直接用 μs 数：周期 200 μs → f = 5 kHz，脉宽 50 μs → 占空比 25%。

### 遥控器信号解码

遥控协议（如 NEC：9 ms 引导码 + 0.56 ms/1.69 ms 数据位）本质是**一组不同脉宽的脉冲**。用输入捕获依次记录每个高电平脉宽，按协议表比对即可解码——只需把状态机扩展为"连续捕获每个沿，记录脉宽序列"。

### 批量捕获（DMA）

打开 DIER.CC1DE 后，每次捕获可触发 DMA 把 CCR1 搬运到内存数组，无需逐次进中断，适合高频连续沿（如电机编码器脉冲）。

## 补充：注意事项

- **量程与分辨率权衡**：ARR 越大量程越大、溢出次数越少，但计数节拍固定时分辨率不变；要更高分辨率就提高 f_CK_CNT（减小 PSC），量程相应缩短；
- **溢出补偿边界**：两次捕获间隔内溢出多次时 N_UEV 必须准确，且 N_UEV 应在捕获回调中读、在合适时机清零，避免竞态；
- **极性切换时机**：改 CC1P 后新的捕获从下一个沿生效，状态机要等标志置位后再切换，避免漏沿/多沿；
- **信号电平**：输入必须符合引脚电平（3.3V 逻辑）；外部 5V 信号需电平转换或分压；
- **频率上限**：被测频率 ≤ f_CK_CNT/2，否则沿会被漏计；
- **噪声处理**：信号抖动时开 ICF 滤波（ICF 越大抗抖越强，但会引入相位延迟，测高频要小）；
- **长脉宽场景**：脉宽可能超过 16 位量程时，优先用 32 位定时器（TIM2/TIM5）或把 ARR 设为 0xFFFF + 更新中断续量程。

# 通用定时器之输入脉冲计数原理

## 输入脉冲计数原理（概述）

第八、九章的输入捕获是"外部信号来了，我记下当前时刻"；本章的**输入脉冲计数**则是"外部信号直接驱动/控制计数器本身"——把外部脉冲当作计数器的**时钟源**（来一个脉冲计一个数）或**触发/门控信号**（控制计数启停与清零）。

典型应用：

- 对脉冲计数（流量计、计件、编码器圈数）；
- 外部信号直接测频（外部时钟模式，数单位时间脉冲数）；
- 外部触发同步（信号到来才启动/清零定时器，实现精密时序）；
- 定时器互联级联（一个定时器控制另一个，扩展量程）。

硬件基础：定时器的**从模式控制器**（TIMx_SMCR 的 SMS/TS 位）负责选择"由谁控制计数"。

## 从模式与外部触发同步（原理重点）

### SMS 从模式选择（TIMx_SMCR）

| SMS | 模式 | 行为 |
|-|-|-|
| 000 | 禁止从模式 | CEN=1 时预分频器时钟直接由内部时钟提供（最常用默认） |
| 001 | 编码器模式 1 | 根据 TI1FP1 电平在 TI2FP2 边沿递增/递减计数 |
| 010 | 编码器模式 2 | 根据 TI2FP2 电平在 TI1FP1 边沿递增/递减计数 |
| 011 | 编码器模式 3 | 在 TI1FP1 和 TI2FP2 边沿计数，方向取决于另一信号电平 |
| 100 | 复位模式 | 所选触发输入 TRGI 上升沿时重新初始化计数器并生成更新事件 |
| 101 | 门控模式 | 触发输入为高电平时使能计数时钟，变低立即停止（不复位） |
| 110 | 触发模式 | 触发信号 TRGI 上升沿时启动计数器（不复位） |
| 111 | 外部时钟模式 1 | 由所选触发信号 TRGI 的上升沿提供计数器时钟（来一个沿计一个数） |

注意：若将 TI1F_ED 选作触发输入（TS=100），不得使用门控模式（TI1F_ED 每次转换输出一个脉冲，而门控模式检查的是电平）。

### 三种外部触发同步模式（配置示例）

| 模式 | 行为 | 配置要点 | 标志 |
|-|-|-|-|
| 复位模式（SMS=100） | TI1 上升沿到来 → 计数器清零重新计数 | CC1S=01、CC1P=0/CC1NP=0（上升沿）、TS=101（选 TI1）、CEN=1；URS=0 时还产生 UEV，ARR/CCR 预装载更新 | TIF 置 1 |
| 门控模式（SMS=101） | TI1 为低电平才计数，变高立即停止（不复位） | CC1S=01、CC1P=1（低电平）、TS=101；CEN 必须先置 1（CEN=0 时无论电平如何都不启动） | 启动/停止时 TIF 置 1 |
| 触发模式（SMS=110） | TI2 上升沿到来 → 计数器启动（不复位） | CC2S=01、CC2P=1、TS=110（选 TI2） | 启动时 TIF 置 1 |

共同点：触发源的选择由 **TS[2:0]** 决定（TI1FP1/TI2FP2/ITRx/ETRF/TI1F_ED），从模式行为由 **SMS[2:0]** 决定；TIF 标志可触发中断/DMA（TIE/TDE）。

### 外部时钟链路（图 140，以 TI2 为例）

<a href="/embedded-knowledge-base/feishu-assets/diagram-4d7756234f8c9ea18e.svg" target="_blank" rel="noopener" aria-label="打开流程图大图"><img src="/feishu-assets/diagram-4d7756234f8c9ea18e.svg" alt="流程图" loading="lazy" decoding="async" style="max-height:420px;width:auto;object-fit:contain;background:#fff"></a>

<details><summary>流程图源内容</summary>

```text
flowchart LR
    PIN["TIMx_CH2 引脚 TI2"] --> FILT["输入滤波器 ICF
（TIMx_CCMR1）"]
    FILT --> EDGE["边沿检测器
CC2P 选上升/下降沿
（TIMx_CCER）"]
    EDGE --> SEL["触发源选择 TS[2:0]
TI1FP1 / TI2FP2 / ITRx / ETRF
（TIMx_SMCR）"]
    SEL --> MODE["模式选择
SMS[2:0] + ECE
（TIMx_SMCR）"]
    MODE --> CK["CK_PSC"]
    CK --> PSC["预分频器 PSC"]
    PSC --> CNT["计数器 CNT
来一个沿计一个数"]
    CNT --> OVF["上溢 UIF / 触发 TIF
中断或 DMA"]
```

</details>

TI2 → 滤波器（ICF）→ 边沿检测器（CC2P）→ TS[2:0] 选择 → TRGI → SMS/ECE 选择 → CK_PSC → 预分频器 → CNT。即：**外部脉冲经滤波/选沿后，通过 TS/SMS 配置直接成为计数器时钟或控制信号**。

## 定时器互联（主从同步）

STM32 定时器内部通过 ITRx 级联：主定时器的 TRGO 输出接到从定时器的 ITRx，可对从定时器执行**复位、启动、停止**或**提供时钟**。

表 76 内部触发连接（ITR0\~ITR3 → 主定时器）：

| 从 TIM | ITR0 | ITR1 | ITR2 | ITR3 |
|-|-|-|-|-|
| TIM2 | TIM1 | TIM8 | TIM3 | TIM4 |
| TIM3 | TIM1 | TIM2 | TIM5 | TIM4 |
| TIM4 | TIM1 | TIM2 | TIM3 | TIM8 |
| TIM5 | TIM2 | TIM3 | TIM4 | TIM8 |

**用 TIM1 的更新事件启动 TIM2**（级联示例）：

- ① TIM1 配为主模式：TIM1_CR2.MMS=010，把更新事件 UEV 作为 TRGO 输出；配置 TIM1_ARR 定周期；
- ② TIM2 配为从模式：TIM2_SMCR.TS=000（选 ITR0=TIM1）、TIM2_SMCR.SMS=110（触发模式）；
- ③ TIM1_CR1.CEN=1 启动 TIM1——此后每次 TIM1 更新事件都自动启动 TIM2 计数，实现两个定时器联动（示例中两计数器时钟均为 CK_INT 三分频）。

## 寄存器控制（重点）

### 相关寄存器一览

| 寄存器 | 关键位 | 作用 |
|-|-|-|
| TIMx_SMCR | SMS[2:0] | 从模式选择：编码器/复位/门控/触发/外部时钟 1（本节核心） |
| TIMx_SMCR | TS[2:0] | 触发源选择：TI1FP1 / TI2FP2 / ITR0\~3 / ETRF / TI1F_ED |
| TIMx_SMCR | ECE | 外部时钟模式 2 使能（ETRF 作为时钟） |
| TIMx_CCMR1 | CC1S / CC2S | 通道方向与输入源（触发/计数输入映射） |
| TIMx_CCMR1 | ICF / ICPS | 输入滤波与捕获分频（触发输入前处理） |
| TIMx_CCER | CC1P / CC1NP | 触发输入极性（上升沿/下降沿） |
| TIMx_CR2 | MMS[2:0] | 主模式选择：决定 TRGO 输出什么（复位/使能/更新/CC 等） |
| TIMx_DIER / SR | TIE / TDE / TIF | 触发中断/DMA 使能与触发标志 |
| TIMx_CR1 | CEN / URS | 计数使能；URS 决定复位模式是否同时产生 UEV |

### 寄存器版配置流程（外部时钟模式 1 计数）

| 步骤 | 操作 |
|-|-|
| ① 时钟 | RCC 使能 GPIOA、TIM3 时钟 |
| ② GPIO | PA6 复用输入 AF2（TIM3_CH1=TI1） |
| ③ 输入通道 | CCMR1.CC1S=01（TI1 输入）、ICF=0；CCER.CC1P=0（上升沿计数） |
| ④ 从模式 | SMCR.TS=101（选 TI1FP1）、SMCR.SMS=111（外部时钟模式 1）——TI1 每来一个上升沿，CNT+1 |
| ⑤ 中断（可选） | DIER.TIE=1（触发中断）、UIE=1（溢出中断）；NVIC 使能 |
| ⑥ 启动 | CR1.CEN=1；随时读 CNT 得脉冲数（溢出时用 UIF 补 65536×n） |

## HAL 库编程流程（重点）

| 步骤 | HAL 操作 | 对应寄存器 |
|-|-|-|
| ① 时钟+GPIO | MspInit：GPIOA/TIM3 时钟，PA6 复用 AF2 | RCC、GPIOx_AFRL |
| ② 时基 | HAL_TIM_Base_Init（Prescaler/Period） | PSC、ARR、CR1 |
| ③ 从模式配置 | HAL_TIM_SlaveConfigSynch：SlaveMode / InputTrigger / 极性 / 滤波 | SMCR（SMS/TS）、CCMR1、CCER |
| ④ 启动 | HAL_TIM_Base_Start 或 \_Start_IT | CR1.CEN、DIER |
| ⑤ 读计数 | \_\_HAL_TIM_GET_COUNTER 读 CNT；溢出回调累计高位 | CNT、UIF |

```c
/* ①+② 时钟/GPIO/时基：PA6=TI1，PSC=0、ARR=0xFFFF（满量程） */
htim3.Instance = TIM3;
htim3.Init.Prescaler = 0;
htim3.Init.Period    = 0xFFFF;
HAL_TIM_Base_Init(&htim3);
/* ③ 从模式：TI1 上升沿作为计数时钟（外部时钟模式 1，SMS=111） */
TIM_SlaveConfigTypeDef sSlaveConfig;
sSlaveConfig.SlaveMode        = TIM_SLAVEMODE_EXTERNAL1;  // SMS=111
sSlaveConfig.InputTrigger     = TIM_TS_TI1FP1;            // TS=101 选 TI1FP1
sSlaveConfig.TriggerPolarity  = TIM_INPUTCHANNELPOLARITY_RISING;  // CC1P=0
sSlaveConfig.TriggerFilter    = 0;                        // ICF 无滤波
HAL_TIM_SlaveConfigSynch(&htim3, &sSlaveConfig);
/* ④ 启动并读计数：来一个上升沿 CNT+1 */
HAL_TIM_Base_Start(&htim3);
uint32_t pulses = __HAL_TIM_GET_COUNTER(&htim3);  // 当前脉冲数
/* 变体 A——触发模式（SMS=110）：TI1 上升沿才启动计数，之后按内部时钟走 */
/* sSlaveConfig.SlaveMode = TIM_SLAVEMODE_TRIGGER; */
/* 变体 B——复位模式（SMS=100）：TI1 上升沿清零重新计数 */
/* sSlaveConfig.SlaveMode = TIM_SLAVEMODE_RESET; */
/* 变体 C——门控模式（SMS=101）：TI1 高电平计数、低电平停止 */
/* sSlaveConfig.SlaveMode = TIM_SLAVEMODE_GATED; */
```

对应关系：SlaveMode→SMCR.SMS、InputTrigger→SMCR.TS、TriggerPolarity→CCER.CC1P/CC1NP、TriggerFilter→CCMR1.ICF、HAL_TIM_Base_Start→CR1.CEN。要中断就在 \_Start_IT 基础上配 DIER.TIE/UIE 与 HAL_TIM_TriggerCallback。

## 补充：应用实例与注意事项

### 应用实例

- **外部脉冲计数**：外部时钟模式 1，每个上升沿 CNT+1，读 CNT 得脉冲总数（流量计、计件、编码器圈数）；
- **测频率**：外部时钟模式 1 计 N 个脉冲用内部定时器测时间窗，f = 计数值/时间窗；或门控模式用已知宽度窗口计数；
- **信号到来启动定时**：触发模式，外部沿触发后计数器按内部时钟跑，配合捕获得到精确相对时刻；
- **周期清零同步**：复位模式，每个输入沿把计数器归零，CNT 直接就是"距上一个沿的时间"；
- **量程扩展**：主从级联（TIM1 更新事件→TIM2 触发模式），实现 32/48 位级联计数或联动时序。

### 注意事项

- **频率上限**：外部脉冲频率必须低于定时器接口可承受的最大频率（一般 ≤ f_APB/2 或手册限值），且每个沿需满足最小脉宽；
- **极性别配反**：上升沿/下降沿计数由 CC1P/CC1NP 决定，配反会少计一半；
- **门控模式前提**：CEN 必须先置 1，否则门控电平无效；且 TI1F_ED 不能用于门控；
- **溢出处理**：16 位 CNT 计满 65536 会溢出，要累计 UIF 次数补高位，否则数量大的计数会回绕；
- **TIF 清除**：触发标志 TIF 需软件写 0 清除（读 SR 后写 SR），避免重复进中断；
- **噪声**：计数输入抖动时开 ICF 滤波，但要接受相位延迟。



# 通用定时器之输入脉冲计数应用

## 输入脉冲计数应用概述

第十章讲了输入脉冲计数的硬件原理（从模式、外部时钟、触发/门控/复位）；本章把它落到**实际测量与工程应用**：外部脉冲计数（计件/流量计）、测频率（M 法/T 法）、主从级联扩展量程、外部触发同步。核心不变：**外部脉冲就是计数器时钟，数 CNT 就知道外部发生了多少次事件**。

本章三个重点：

- **原理**：三种测频/计数方法的原理与适用场景；
- **寄存器控制**：SMCR/CCER/CR1 等如何配出计数、测频、级联功能；
- **HAL 库流程**：HAL_TIM_SlaveConfigSynch + HAL_TIM_Base_Start 的标准写法。

## 测量原理（重点）

外部信号的频率/计数测量有四种基本方法，原理与适用频段各不相同：

| 方法 | 原理 | 公式 | 适用 |
|-|-|-|-|
| 计数直读 | 外部时钟模式 1，来一个沿 CNT+1，随时读 CNT | N = CNT + 65536×溢出次数 | 计件、流量计、圈数统计 |
| M 法（测频法） | 固定闸门时间 T 内计外部脉冲数 N | f = N / T | 高频信号（闸门内脉冲多，量化误差小） |
| T 法（测周法） | 测外部信号一个周期的时间 T_sig | f = 1 / T_sig | 低频信号（周期长，计时误差小） |
| M/T 法 | 闸门与外部沿同步，同时计外部脉冲 N_p 与时基脉冲 N_t | f = N_p / N_t × f_clk | 宽范围、高精度（无 ±1 计数误差） |

**量化误差根源**：闸门边沿与外部脉冲不同步时，M 法首尾各损失最多 1 个脉冲（±1 误差）；T 法在时基计数上同样有 ±1 误差。信号频率越高 M 法相对误差越小，越低 T 法相对误差越小。

## 应用一：外部脉冲计数（计数直读）

原理：

TIM3 配为**外部时钟模式 1**（SMS=111、TS=101 选 TI1FP1），PA6（TI1）每来一个上升沿 CNT 自动 +1。CPU 无需进中断，随时读 CNT 即得脉冲总数；CNT 溢出时 UIF 置 1，累计溢出次数补高位。

寄存器配置：

| 步骤 | 操作 |
|-|-|
| ① 时钟 | RCC 使能 GPIOA、TIM3 |
| ② GPIO | PA6 复用 AF2（TIM3_CH1=TI1） |
| ③ 输入通道 | CCMR1.CC1S=01、ICF=0；CCER.CC1P=0（上升沿） |
| ④ 从模式 | SMCR.TS=101（TI1FP1）、SMCR.SMS=111（外部时钟 1） |
| ⑤ 溢出中断（可选） | DIER.UIE=1；NVIC 使能 TIM3_IRQn |
| ⑥ 启动 | CR1.CEN=1 |

HAL 代码：

```c
/* 时基 + 外部时钟模式 1 计数 */
htim3.Instance = TIM3;
htim3.Init.Prescaler = 0;
htim3.Init.Period    = 0xFFFF;
HAL_TIM_Base_Init(&htim3);

TIM_SlaveConfigTypeDef sSlave;
sSlave.SlaveMode       = TIM_SLAVEMODE_EXTERNAL1;  /* SMS=111 */
sSlave.InputTrigger    = TIM_TS_TI1FP1;            /* TS=101 */
sSlave.TriggerPolarity = TIM_INPUTCHANNELPOLARITY_RISING;
sSlave.TriggerFilter   = 0;
HAL_TIM_SlaveConfigSynch(&htim3, &sSlave);
HAL_TIM_Base_Start_IT(&htim3);   /* 开 UIE 用于溢出累计 */

volatile uint32_t overflow_cnt = 0;
void HAL_TIM_PeriodElapsedCallback(TIM_HandleTypeDef *htim)
{
    if (htim->Instance == TIM3) overflow_cnt++;   /* 溢出一次 = 65536 */
}

/* 读取总脉冲数 */
uint32_t get_pulse_count(void)
{
    return __HAL_TIM_GET_COUNTER(&htim3) + 65536UL * overflow_cnt;
}
```

## 应用二：M 法测频（双定时器闸门）

<a href="/embedded-knowledge-base/feishu-assets/diagram-6fbb9e48d0b731469a.svg" target="_blank" rel="noopener" aria-label="打开流程图大图"><img src="/feishu-assets/diagram-6fbb9e48d0b731469a.svg" alt="流程图" loading="lazy" decoding="async" style="max-height:420px;width:auto;object-fit:contain;background:#fff"></a>

<details><summary>流程图源内容</summary>

```text
flowchart LR
    SIG["被测脉冲 f_in"] --> T3["TIM3 外部时钟模式1
SMS=111 TS=TI1FP1
来一个沿 CNT+1"]
    T2["TIM2 定时闸门 100ms
PSC=83 ARR=99999
更新中断 UIE"] --> TRIG["闸门到：读 CNT
清零重新计数"]
    TRIG --> CAL["f = N / 0.1s = N × 10 Hz"]
    CAL --> OUT["刷新 measured_freq"]
    T2 -.->|"每100ms触发"| TRIG
```

</details>

**原理**

用两个定时器配合：**TIM3 做外部计数**（SMS=111，数被测脉冲），**TIM2 做定时闸门**（内部时钟定时 100 ms，更新中断）。闸门到：读 TIM3 CNT、清零、算 f = N / 0.1 s。闸门越长分辨率越高，但刷新率越低。

**寄存器配置**

| 定时器 | 配置 |
|-|-|
| TIM3（计数） | SMCR.TS=101、SMS=111；CCMR1.CC1S=01；CCER.CC1P=0；CR1.CEN=1 |
| TIM2（闸门） | PSC=83（84MHz→1MHz）、ARR=99999（100 ms）；DIER.UIE=1；CR1.CEN=1 |

公式：f = CNT / 0.1 s = CNT × 10 Hz。例：闸门内计到 5 000 个脉冲 → f = 50 kHz。

**HAL 代码**

```c
/* TIM3：外部时钟计数（同上） */
HAL_TIM_Base_Init(&htim3);
HAL_TIM_SlaveConfigSynch(&htim3, &sSlave);
HAL_TIM_Base_Start(&htim3);

/* TIM2：100ms 闸门定时器 */
htim2.Instance = TIM2;
htim2.Init.Prescaler = 83;      /* 84MHz/84 = 1MHz */
htim2.Init.Period    = 99999;   /* 100ms */
HAL_TIM_Base_Init(&htim2);
HAL_TIM_Base_Start_IT(&htim2);

volatile uint32_t measured_freq = 0;
void HAL_TIM_PeriodElapsedCallback(TIM_HandleTypeDef *htim)
{
    if (htim->Instance == TIM2) {                    /* 闸门 100ms 到 */
        uint32_t n = __HAL_TIM_GET_COUNTER(&htim3);  /* 取 N */
        __HAL_TIM_SET_COUNTER(&htim3, 0);            /* 清零重新计 */
        measured_freq = n * 10;                      /* f = N / 0.1s */
    }
}
```

## 应用三：主从级联扩展量程

**原理**

单一定时器只有 16 位计数（65536），高速/长时间计数会溢出。用**定时器互联**：TIM1 每次更新事件（ARR 溢出）作为 TRGO 输出，TIM2 收到 ITR0 触发就 +1——TIM2 成了 TIM1 的"高位计数器"，实现 32 位级联计数，同时 TIM1 的 UEV 还可用作分频节拍。

配置：TIM1_CR2.MMS=010（UEV→TRGO）；TIM2_SMCR.TS=000（ITR0=TIM1）、SMS=110（触发模式，每收到一个 TRGO 沿 CNT+1）；先启 TIM1 再启 TIM2（或只启 TIM1，TIM2 由触发自动启动）。

**HAL 代码**

```c
/* TIM1 主：更新事件作为 TRGO 输出（MMS=010） */
TIM_MasterConfigTypeDef sMaster;
sMaster.MasterOutputTrigger = TIM_TRGO_UPDATE;
HAL_TIMEx_MasterConfigSynchronization(&htim1, &sMaster);
HAL_TIM_Base_Start(&htim1);

/* TIM2 从：ITR0(TIM1) 触发模式，每来一个 TRGO 沿 CNT+1 */
TIM_SlaveConfigTypeDef sSlave2;
sSlave2.SlaveMode    = TIM_SLAVEMODE_TRIGGER;  /* SMS=110 */
sSlave2.InputTrigger = TIM_TS_ITR0;             /* TS=000 选 TIM1 */
HAL_TIM_SlaveConfigSynch(&htim2, &sSlave2);
HAL_TIM_Base_Start(&htim2);

/* 总计数 = TIM2_CNT × (TIM1_ARR+1) + TIM1_CNT */
```

## 寄存器控制（重点）

**相关寄存器一览**

| 寄存器 | 关键位 | 作用 |
|-|-|-|
| TIMx_SMCR | SMS | 从模式：111 外部时钟 1 / 110 触发 / 101 门控 / 100 复位 |
| TIMx_SMCR | TS | 触发源：TI1FP1=101、TI2FP2=110、ITR0\~3=000\~011 |
| TIMx_CCMR1 | CC1S / CC2S | 通道输入映射（计数/触发输入） |
| TIMx_CCMR1 | ICF | 输入滤波（抗抖） |
| TIMx_CCER | CC1P / CC1NP | 计数边沿极性 |
| TIMx_CR2 | MMS | 主模式输出（级联时 TRGO 的内容） |
| TIMx_DIER / SR | UIE / UIF | 溢出中断使能/标志（补高位、闸门定时） |
| TIMx_CNT | — | 计数值（随时读） |
| TIMx_PSC / ARR | — | 闸门定时/级联分频参数 |

**寄存器版通用配置流程**

| 步骤 | 操作 |
|-|-|
| ① 时钟+GPIO | RCC 使能相关定时器与 GPIO；输入引脚配复用 AF |
| ② 时基 | PSC/ARR（计数用 PSC=0、ARR=0xFFFF；闸门用定时值） |
| ③ 输入通道 | CCMR1.CCxS=01、ICF 按需；CCER.CCxP 定极性 |
| ④ 从模式 | SMCR.TS 选源、SMCR.SMS 选行为（111/110/101/100） |
| ⑤ 主模式（级联时） | CR2.MMS 选 TRGO 内容（更新事件=010） |
| ⑥ 中断（可选） | DIER.UIE/TIE 使能；NVIC 配置 |
| ⑦ 启动 | CR1.CEN=1；读 CNT 处理结果 |

## HAL 库编程流程（重点）

| 步骤 | HAL 操作 | 对应寄存器 |
|-|-|-|
| ① 时钟+GPIO | MspInit：使能定时器与 GPIO 时钟，引脚复用 AF | RCC、GPIOx_AFRL |
| ② 时基 | HAL_TIM_Base_Init（Prescaler/Period） | PSC、ARR |
| ③ 从模式 | HAL_TIM_SlaveConfigSynch（SlaveMode/InputTrigger/极性/滤波） | SMCR、CCMR1、CCER |
| ④ 主模式（级联） | HAL_TIMEx_MasterConfigSynchronization（MasterOutputTrigger） | CR2.MMS |
| ⑤ 启动 | HAL_TIM_Base_Start / \_Start_IT | CR1.CEN、DIER |
| ⑥ 读结果 | \_\_HAL_TIM_GET_COUNTER；溢出回调累计高位 | CNT、UIF |

```c
/* ===== 完整示例：M 法测频（TIM3 计数 + TIM2 闸门） ===== */
void MX_GPIO_Init(void)
{
    __HAL_RCC_GPIOA_CLK_ENABLE();
    GPIO_InitTypeDef g = {0};
    g.Pin       = GPIO_PIN_6;
    g.Mode      = GPIO_MODE_AF_PP;
    g.Pull      = GPIO_NOPULL;
    g.Speed     = GPIO_SPEED_FREQ_HIGH;
    g.Alternate = GPIO_AF2_TIM3;          /* PA6 = TIM3_CH1 = TI1 */
    HAL_GPIO_Init(GPIOA, &g);
}
void MX_TIM3_Init(void)
{
    htim3.Instance = TIM3;
    htim3.Init.Prescaler = 0;
    htim3.Init.Period    = 0xFFFF;
    HAL_TIM_Base_Init(&htim3);
    TIM_SlaveConfigTypeDef s = {0};
    s.SlaveMode       = TIM_SLAVEMODE_EXTERNAL1;  /* 外部时钟 1 */
    s.InputTrigger    = TIM_TS_TI1FP1;
    s.TriggerPolarity = TIM_INPUTCHANNELPOLARITY_RISING;
    s.TriggerFilter   = 0;
    HAL_TIM_SlaveConfigSynch(&htim3, &s);
    HAL_TIM_Base_Start(&htim3);
}
void MX_TIM2_Init(void)
{
    htim2.Instance = TIM2;
    htim2.Init.Prescaler = 83;     /* 1MHz */
    htim2.Init.Period    = 99999;  /* 100ms 闸门 */
    HAL_TIM_Base_Init(&htim2);
    HAL_TIM_Base_Start_IT(&htim2);
}
/* 主循环：直接读 measured_freq（更新中断里刷新） */
```

## 补充：应用实例与注意事项

**应用实例**

- **计件/流量计**：外部时钟模式 1 数传感器脉冲，读取值即产量/流量；配 EEPROM 掉电保存累计值；
- **电机测速**：编码器 A 相脉冲接 TI1，M 法测频得转速（f/每转脉冲数 = 转速 r/s）；
- **信号发生器校准**：M/T 法高精度测频，宽频段无需切换方法；
- **红外遥控解码**：外部时钟计数 + 输入捕获配合，数脉冲宽度序列解协议；
- **长时间事件统计**：主从级联 32 位计数，记录设备总动作次数（开机累计）。

**注意事项**

- **频率上限**：外部计数时钟受定时器接口限制，一般 ≤ 定时器时钟/2，超限会漏计；
- **M 法闸门选择**：闸门时间 T 与分辨率矛盾——T 长分辨率高但刷新慢，按被测频率范围折中；
- **溢出累计竞态**：读 CNT 与读溢出计数应关中断进行，避免读到"半更新"状态；
- **级联计数清零**：清零时要把 TIM1、TIM2 的 CNT 和溢出标志一起处理，防止高低位错位；
- **输入毛刺**：计数输入抖动会多计，开 ICF 滤波（注意滤波会限制最大计数频率）；
- **信号电平**：外部脉冲必须符合 3.3V 逻辑电平，5V 信号需转换/分压，否则可能损坏引脚或误计。

## 原文画板

![飞书画板](/feishu-assets/fc9bc86b6b6c.jpg)
![飞书画板](/feishu-assets/4f2f36906310.jpg)
![飞书画板](/feishu-assets/b9e3c4d7b1ed.jpg)
![飞书画板](/feishu-assets/fc2cab901bc6.jpg)
![飞书画板](/feishu-assets/ae720ffc782d.jpg)
![飞书画板](/feishu-assets/4e0e99b9b130.jpg)
![飞书画板](/feishu-assets/6defd9a4606c.jpg)
![飞书画板](/feishu-assets/12fefc31bf0e.jpg)
![飞书画板](/feishu-assets/c786962bcbb8.jpg)
![飞书画板](/feishu-assets/243cfe26e1eb.jpg)
