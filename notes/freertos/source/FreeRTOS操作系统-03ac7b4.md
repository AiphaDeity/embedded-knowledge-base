# FreeRTOS操作系统

[飞书原文](https://hcn4ticlccda.feishu.cn/docx/OqLvduSWUoL9jAxGzeKcgRcontg)

# RreeRTOS操作系统思维导图

<a href="/embedded-knowledge-base/feishu-assets/diagram-3ff23d658c75a0fcd1.svg" target="_blank" rel="noopener" aria-label="打开流程图大图"><img src="/feishu-assets/diagram-3ff23d658c75a0fcd1.svg" alt="流程图" loading="lazy" decoding="async" style="max-height:420px;width:auto;object-fit:contain;background:#fff"></a>

<details><summary>流程图源内容</summary>

```text
mindmap
  root((FreeRTOS))
    入门与背景
      轮询方式
      前后台系统
      裸机编程结构
      RTOS 引入
    任务管理
      任务创建
      参数传递
      优先级
      任务状态机
      删除任务
      任务句柄
      CMSIS-RTOS 封装
    时间管理
      SysTick 滴答
      相对延时
      绝对延时
      空闲钩子函数
    调度与上下文切换
      上下文概念
      Cortex-M 操作模式
      AAPCS 寄存器规则
      PendSV 与 SVC
      异常栈帧与对齐
      三种调度算法
    队列
      队列基础
      传输结构体
      队列集
    信号量与互斥
      二值信号量
      计数信号量
      互斥量
        优先级继承
      守门任务
    事件与通知
      事件组
      任务通知
        替代二值信号量
        替代计数信号量
    软件定时器
      单次定时器
      周期定时器
      定时器服务任务
    内存管理
      heap_1 至 heap_5
    中断管理
      中断安全 API
      中断延迟与推迟处理
      中断嵌套与 BASEPRI
```

</details>

# FreeRTOS入门

## 从生活中的例子去看嵌入式系统

**1. 从泡茶故事说起**

本讲从数学家华罗庚先生的《统筹方法》（语文课《时间统筹法》）引入：通过合理安排做事的流程来节约时间，这背后与嵌入式系统“用软件管理硬件资源、协调多个任务”的思路一脉相承。

泡茶需要 5 个步骤：洗水壶、烧开水、洗茶壶、洗茶杯、拿茶叶，各自耗时 1 分钟、15 分钟、1 分钟、1 分钟、2 分钟。不同的执行顺序会得到完全不同的总耗时——这就是“统筹”要解决的问题。

**2. 嵌入式系统的四层架构**

把泡茶过程与嵌入式系统对照，可以直观理解嵌入式系统的分层结构：

| 泡茶（生活类比） | 嵌入式系统 | 层级 |
|-|-|-|
| 聊天、品茶 | 应用程序1、应用程序2 | 应用层 |
| 邀请、泡茶（过程组织） | RTOS、文件系统、GUI 图形系统等中间件 | 操作系统与中间件层 |
| 洗水壶、洗茶壶、洗茶杯、拿茶叶 | HAL 库、Flash 驱动、LCD 驱动、触摸驱动 | 驱动层 |
| 水壶、茶壶、茶杯、茶叶 | ARM、Flash、LCD、Touch | 硬件设备层 |

理解要点：上层“调用”下层的能力，下层为上层提供接口——应用层不用关心寄存器怎么操作，就像品茶的人不用关心水壶怎么烧水。这种分层让每一层都可以独立替换和升级。

**3. 有限状态机与泡茶过程**

把泡茶的 6 个过程换成“状态”来理解，就得到状态机的基本模型：

- 状态：泡茶的每个过程（如洗水壶、烧开水……）就是一个状态，程序在某一时刻只能处于一个状态。
- 事件：某一时刻发生的“有意义的事情”（如：水开了），它触发状态的迁移。
- 动作：状态迁移过程中需要做出的行为，动作是对事件的响应。
- 条件：事件发生后，还要满足一定条件才能发生状态迁移——并不是“有求必应”。

以“泡茶喝茶”为例：A、B 两人分别完成洗开水壶、烧开水、洗茶壶、洗茶杯、拿茶叶，每个步骤都有“没洗好 / 水没开 / 没准备好”等判定条件，只有双方全部准备好（条件满足），才进入“泡茶喝茶”状态。

**4. 有限状态机的定义与应用**

嵌入式状态机是一种基于状态转移的程序设计模式：把程序的执行过程分成一系列状态，并描述状态转移的规则，从而实现复杂问题的分步解决。

为什么用它：复杂控制逻辑直接写会非常混乱（大量 if 嵌套、难以维护）；状态机把“当前处于什么状态”显式化，行为只取决于“当前状态 + 到来的事件”，逻辑清晰、可预测。

在嵌入式系统中，状态机常用来实现复杂控制逻辑、事件处理和通信协议等功能，其简单灵活的设计在嵌入式系统应用中得到了广泛的运用。

## 采用轮询方式的程序设优缺点

**1. 什么是轮询**

轮询是最简单的程序结构：main 函数初始化硬件后进入无限循环，按固定顺序依次调用各个任务函数，一个任务执行完再执行下一个，周而复始。

```c
int main(void)
{
    /* 硬件相关初始化 */
    HardwareInit();

    /* 无限循环 */
    while(1)
    {
        /* 任务1 */
        Task1();

        /* 任务2 */
        Task2();

        /* 任务3 */
        Task3();
    }
}
```

**2. 实验任务**

- 实验平台：嵌入式虚拟仿真平台、STM32G0/F1/F4/U5 开发板。
- 软件平台：STM32CubeMX、MDK-ARM、STM32CubeIDE。
- 完成任务：配置指示灯 / 蜂鸣器 / 串口 / 按键；指示灯每 250ms 闪烁；按键按下后蜂鸣器响 1S；串口输出按键按压次数。

**3. 优缺点分析**

| 优点 | 缺点 |
|-|-|
| 程序设计简单，顺序执行用户代码 | 系统的实时性差 |
| 外设测试阶段较长使用 | 实用性不高 |

**4. 原理与适用判断**

- 为什么实时性差：CPU 只能顺序执行，若任务1耗时较长，任务2、任务3 的响应就被推迟；按键按下时如果 CPU 正在执行其他任务，事件不会被立刻处理，可能被忽略。
- 为什么“外设测试阶段常用”：功能简单、流程固定，适合逐个验证外设是否工作正常。
- 怎么判断：适合任务数量少、单个任务耗时短、对实时性要求不高的场景（如外设自测、学习入门）；一旦出现“必须及时响应的外部事件”，就应考虑中断（前后台）或 RTOS。

## 采用轮询方式的实验

**1. 实验目的**

通过一个综合小实验（指示灯、蜂鸣器、串口、按键），实践轮询方式的程序设计：体会“主循环顺序扫描所有任务”的结构，并观察其在实时性上的局限。

**2. 实验平台与任务**

- 实验平台：嵌入式虚拟仿真平台、STM32G0/F1/F4/U5 开发板。
- 软件平台：STM32CubeMX、MDK-ARM、STM32CubeIDE。
- 实验任务：配置指示灯 / 蜂鸣器 / 串口 / 按键。指示灯每 250ms 闪烁；按键按下后，蜂鸣器响 1S；串口输出按键按压次数。

**3. 实现思路（轮询结构）**

main 函数初始化硬件后进入 while(1)，按固定顺序轮询各个任务：

- 指示灯任务：每次进入循环都检查计时，满 250ms 翻转一次 LED 电平，实现闪烁。
- 按键任务：轮询读取按键 GPIO 电平，检测到按下动作则把“按下标记”置位。
- 蜂鸣器任务：若“按下标记”有效，驱动蜂鸣器并计时 1S 后关闭。
- 串口任务：按键计数 +1，并通过串口打印按压次数。

```c
int main(void)
{
    HardwareInit();          /* 硬件初始化 */

    while(1)
    {
        LedFlash_Task();     /* 任务1：指示灯250ms闪烁 */
        KeyScan_Task();      /* 任务2：轮询按键 */
        Beep_Task();         /* 任务3：蜂鸣器响1S */
        UartReport_Task();   /* 任务4：串口输出按压次数 */
    }
}
```

**4. 实验步骤**

1. 在 STM32CubeMX 中创建工程，配置 GPIO（LED、按键、蜂鸣器）、串口（UART）及必要外设时钟。
2. 用 MDK-ARM / STM32CubeIDE 编写轮询主循环与四个任务函数。
3. 编译并下载到开发板，观察指示灯是否每 250ms 闪烁。
4. 按下按键，观察蜂鸣器是否响 1S、串口是否输出按压次数。

**5. 预期结果与验证要点**

- 指示灯稳定 250ms 闪烁，说明计时与翻转逻辑正确。
- 按键按下时蜂鸣器响 1S，串口每次输出递增的按压次数。
- 重点观察：连续快速按按键时，是否偶尔“丢次数”——这正是轮询实时性差的体现（CPU 正在执行其他任务时，按键事件没有被及时记录）。

**6. 轮询方式小结**

轮询适合任务少、耗时短、实时性要求低的场景（外设自测、入门验证）；一旦出现必须及时响应的外部事件，就应改用中断（前后台）方案。

## 采用前后台的程序设计优缺点

**1. 前后台系统概述**

前后台系统是在轮询的基础上加入中断：外部事件的“记录”在中断中操作，对事件的“响应”在轮询（主循环）中完成。中断处理过程称为前台，main 函数中的轮询称为后台。

为什么这样设计：轮询的痛点是“事件来了没人记”——CPU 正忙时按键按下可能被忽略。中断可以在事件发生的瞬间打断主循环，把“事件发生”这件事记下来（置标志位）；主循环回头再统一处理，事件不会丢失。

**2. 前后台程序伪代码**

```c
/**
 * Task1的中断服务程序
**/
void Task1_Handler(void)
{
    Task1标志为真;
}

/**
 * Task2的中断服务程序
**/
void Task2_Handler(void)
{
    Task2标志为真;
}

/**
 * Task3的中断服务程序
**/
void Task3_Handler(void)
{
    Task3标志为真;
}
```

```c
int main(void)
{
    /* 硬件相关初始化 */
    HardwareInit();

    /* 无限循环 */
    while(1)
    {
        /* 任务1 */
        if(Task1标志)
        {
            Task1();
            Task1标志为假;
        }
        /* 任务2 */
        if(Task2标志)
        {
            Task2();
            Task2标志为假;
        }
        /* 任务3 */
        if(Task3标志)
        {
            Task3();
            Task3标志为假;
        }
    }
}
```

**3. 实验任务**

- 实验平台：嵌入式虚拟仿真平台、STM32G0/F1/F4/U5 开发板。
- 软件平台：STM32CubeMX、MDK-ARM、STM32CubeIDE。
- 完成任务：配置指示灯 / 蜂鸣器 / 串口 / 按键；指示灯每 250ms 闪烁；按键按下后蜂鸣器响 1S；串口输出按键按压次数。

**4. 优缺点分析**

| 优点 | 缺点 |
|-|-|
| 优秀的程序架构设计，可确保事件不会丢失，提高实时性 | 后台任务依赖编程经验，需避免单个任务长时间占用处理器资源 |
| 基于 Cortex-M 内核的 MCU 对异常具有优先级、中断嵌套、末尾连锁以及延迟到达等功能，进一步提高实时性 | 任务逻辑复杂时，任务拆分难度增加；随着中断增多，整个程序的设计与响应实时性将会降低 |

**5. 原理与适用判断**

- 为什么实时性提高：中断具备抢占能力，事件到达立即“登记”，不会因为主循环忙而丢失；Cortex-M 的异常优先级、中断嵌套、末尾连锁、延迟到达等硬件机制进一步缩短了中断响应时间。
- 风险点：后台仍是单线程顺序执行，若某个任务长时间占用 CPU，其他任务依然会被“饿死”；中断数量增加后，标志位管理、共享变量保护都会变复杂。
- 怎么判断：适用于中断数量不多、任务逻辑清晰的中小型嵌入式系统；当任务数量多、逻辑复杂、对实时性要求高时，应升级到 RTOS。

## 采用前后台的程序实验

**1. 实验目的**

在同样的实验任务（指示灯 250ms 闪烁、按键蜂鸣器响 1S、串口输出按压次数）下，改用前后台结构：事件在中断中记录（前台），响应在主循环中完成（后台），对比轮询方式体会实时性的提升。

**2. 实验平台与任务**

- 实验平台：嵌入式虚拟仿真平台、STM32G0/F1/F4/U5 开发板。
- 软件平台：STM32CubeMX、MDK-ARM、STM32CubeIDE。
- 实验任务：配置指示灯 / 蜂鸣器 / 串口 / 按键。指示灯每 250ms 闪烁；按键按下后，蜂鸣器响 1S；串口输出按键按压次数。

**3. 实现思路（前后台结构）**

把“事件记录”放到中断（前台），把“事件响应”放到主循环（后台）：

- 按键中断：按键按下触发 GPIO 外部中断，中断服务程序里只做两件事——置“按键标志”、按压计数 +1。
- 定时器中断：用定时器（如 250ms 周期中断）置“闪烁标志”，保证 LED 翻转节拍稳定。
- 主循环（后台）：依次查询各标志位，标志有效才执行对应任务，执行后清标志。

```c
/* 按键外部中断服务程序 */
void EXTI_IRQHandler(void)
{
    if(按键按下)
    {
        KeyFlag = 1;      /* 只记录事件，不在中断里做耗时处理 */
        PressCnt++;
    }
}

/* 定时器中断：250ms 产生一次 */
void TIM_IRQHandler(void)
{
    if(计数达到250ms)
    {
        LedFlag = 1;
    }
}
```

```c
int main(void)
{
    HardwareInit();

    while(1)
    {
        if(LedFlag)   { LedToggle();   LedFlag = 0; }   /* 闪烁 */
        if(KeyFlag)   { BeepOn1S();    KeyFlag = 0; }   /* 蜂鸣器响1S */
        if(PressCnt)  { UartPrint(PressCnt); }          /* 串口输出次数 */
    }
}
```

**4. 实验步骤**

1. 在 STM32CubeMX 中配置 GPIO 外部中断（按键）、定时器（250ms）、GPIO 输出（LED、蜂鸣器）、串口。
2. 编写中断服务程序（只置标志）与主循环响应逻辑。
3. 编译下载后，验证指示灯 250ms 闪烁、按键蜂鸣器 1S、串口输出按压次数。

**5. 预期结果与验证要点**

- 功能表现与轮询版一致，但连续快速按键时按压次数不再丢失。
- 中断只做“记录”，耗时操作（蜂鸣器计时、串口打印）都在主循环完成，符合前后台设计原则。
- 可对比两版代码，体会“事件记录”与“事件响应”分离带来的实时性提升。

**6. 前后台方式小结**

前后台在轮询基础上用中断“记住”事件，解决了漏检问题；但后台仍是顺序执行，任务多、逻辑复杂时响应会被长任务拖累，这正是后续引入 RTOS（FreeRTOS）的原因。

## 一种实用性的裸机编程结构

**1. 函数指针数组介绍**

函数指针是指向函数的指针变量，可以用来调用相应的函数。函数指针数组的作用是根据需要动态地选择并调用不同的函数。

语法格式：返回值类型 (\*指针数组名[数组大小])(参数列表);

示例：void (\* g_OSTaskList[OS_TASKLISTCNT])(void);

常见使用场景：

- 回调机制：某个事件发生时，根据不同情况选择调用相应的回调函数。
- 状态机：根据当前状态选择并调用相应的处理函数。
- 命令分发：根据接收到的命令选择并调用相应的处理函数。
- 策略模式：根据不同的策略选择并调用相应的处理函数。

**2. 函数指针数组代码**

```c
/* user_app.h中宏定义系统任务数量 */
#define OS_TASKLISTCNT 8

/* user_app.c中的函数指针数组 */
void (* g_OSTaskList[OS_TASKLISTCNT])(void);
```

```c
int main(void)
{
    /* 硬件相关初始化 */
    HardwareInit();

    /* 无限循环 */
    while (1)
    {
        for (gTaskIndex = 0; gTaskIndex < OS_TASKLISTCNT; gTaskIndex++)
        {
            if ((*g_OSTaskList[gTaskIndex]) != NULL)
            {
                g_OSTaskList[gTaskIndex]();
                g_OSTaskList[gTaskIndex] = NULL;
            }
        }
    }
}
```

```c
/* 定时器16/17的任务分配 */
void HAL_TIM_PeriodElapsedCallback(TIM_HandleTypeDef *htim)
{
    static uint8_t p-Time16Cnt = 0, p-Time17Cnt = 0;

    /* 定时器16进行5ms任务中断 */
    if (htim->Instance == htim16.Instance)
    {
        p-Time16Cnt++;
        if (!(p-Time16Cnt % 4)) /* 20ms(50Hz)进行触发刷新 */
        {
            touchgfx_signalVSynTimer(); /* touchgfx用户接口 */
        }
        if (!(p-Time16Cnt % 20)) /* 100ms进行一次窗口更新 */
        {
            if (gTaskEnMark.UPDATE_FIVEKEY_EN)
            {
                g_OSTaskList[eUPDATE_FIVEKEY] = Update_FiveKey_Value; /* 更新五向键数据 */
            }
        }
    }
}
```

**3. 可穿戴设备案例**

该结构常用于可穿戴设备：多个定时器按不同周期（20ms、1s、100ms、500ms、200ms、300ms、2s、3s）触发，向“任务标志组”登记任务；主循环按标志调度执行各类系统任务（TouchGFX 任务、系统时间获取、五向按键读取、芯片参数获取、姿态信息获取、WiFi 网络连接、环境信息获取、健康信息获取）；任务输出汇聚到 Model，由 Presenter、View 构成 MVC 交互架构，活动屏幕产生的事件再反馈回任务标志组，形成闭环调度。

**4. 原理与适用判断**

- 为什么用函数指针数组：把“任务清单”变成一张数据表，主调度循环与具体任务解耦——新增任务只需往数组里注册，主循环代码不用改。
- 为什么执行后置 NULL：任务执行完就从调度队列中摘除，避免同一次登记被反复执行；要再次执行需由中断重新登记（一次性任务机制）。
- 本质：这是“中断记录事件、主循环响应”（前后台思想）的结构化实现——中断只负责“登记”，耗时的处理统一放到主循环，避免在中断里做重活。
- 怎么判断：适用于任务数量固定、周期明确、希望用“一张任务表”管理调度的裸机工程；如果任务需要优先级抢占、阻塞等待，则应换 RTOS。

## FreeRTOS入门简介

**1. FreeRTOS 是什么**

“Free”意味着免费、自由和不受约束，源代码可以免费获取和使用；“RTOS”即实时操作系统（Real Time Operating System）。

**2. FreeRTOS 的特点**

- 支持抢占式 / 协程式 / 时间片流转等任务调度方式。
- 小巧与灵活：在 MCU 中运行，可定制和配置功能。
- 支持多种处理器架构，并能在不同的硬件平台上运行。
- 实时性：提供严格任务调度机制，确保任务按照预定优先级和时间约束执行。
- 提供任务管理、消息队列、内存管理、软件定时器、信号量 / 互斥、事件组、任务通知、协程等多种功能。

**3. 应用领域**

FreeRTOS 的应用领域非常广泛，包括但不限于工业控制、汽车电子、智能家居、医疗设备、航空航天等需要实时响应和稳定运行的领域。

**4. 学习资料**

- 官网：[FreeRTOS 官网](https://www.freertos.org/zh-cn-cmn-s/)。
- 官方：《FreeRTOS_Reference_Manual_V10.0.0》API 参考指导。
- 基础：HAL 库开发教程以及 Cortex-M 架构相关知识——《手把手玩转STM32G0/F1/F4/U5软件开发》《Cortex-M0/M3/M4 权威指南》。
- 入门：《FreeRTOS实时内核应用指南V1.8》教程，新手入门必备。
- 重磅：元宇宙实验中心-尊贵 VIP——嵌入式C语言、嵌入式电子电路、处理器原理与汇编、单片机开发、RTOS 开发、GUI 开发、原理图与 PCB 设计、综合项目开发到微信小程序，完整的嵌入式体系学习路线。

# FreeRTOS基础与使用

## 多任务、并发与调度原理

**1. 多任务操作系统**

内核（kernel）是操作系统的核心组件，诸如 Linux 系统所采用的内核，允许多用户同时访问计算机，并可以同时执行多个程序。每个执行程序都是受操作系统控制的任务。如果操作系统能够以这种方式执行多任务，可称为多任务操作系统。

**2. 并发执行的假象**

单核处理器中，多任务操作系统可以通过**任务间的快速切换制造并发执行**的假象。

多任务系统的任务是具有优先级的，高优先级任务可抢占低优先级任务的 CPU 使用权。相同优先级的任务各自轮流运行一段极短的时间（时间片），从而产生“同时”运行的错觉，这也是抢占式调度和时间片调度的基本原理。

**3. 调度原理**

调度器（scheduler）是内核中负责决定在任何特定时间应执行哪些任务的部分。调度策略是调度器用来决定在任何时间点执行哪个任务的算法。FreeRTOS 支持三种调度方式：

- **抢占式调度**：每个任务都有优先级，高优先级任务可抢占低优先级任务；只有当高优先级任务发生阻塞或被挂起，低优先级任务才可以运行。
- **时间片调度**：当多个任务的优先级相同时，调度器会在系统时钟节拍到来时切换任务，CPU 轮流运行相同优先级的任务，每个任务运行的时间为一个系统时钟节拍。
- **协程式调度**：任务之间主动让出 CPU 的协作式调度（非抢占），需要任务自觉放弃执行权。

**4. 任务的四种状态**

FreeRTOS 中任务在运行过程中会在不同状态间转换：

- **就绪态**：任务已具备运行条件，等待调度器分配 CPU。
- **运行态**：任务正在占用 CPU 执行。
- **阻塞态**：任务因等待事件或调用会发生阻塞的 API（如延时、等待信号量）而暂停执行。
- **挂起态**：任务被调用 vTaskSuspend() 挂起，只能通过 vTaskResume() 恢复。

**状态转换关系**：

运行态任务调用 vTaskSuspend() 进入挂起态，调用 vTaskResume() 恢复；调用会发生阻塞的 API 进入阻塞态，等待的事件到达后回到就绪态；就绪态任务被调度器选中进入运行态。

**5. 例子：外设资源的独占访问**

Task 2 正在执行时锁定一个处理器外围设备；Task 3 尝试访问相同的外围设备，发现被锁定而无法继续，于是挂起；Task 2 执行完成对外围设备的访问后解锁，Task 3 才能继续。这正是多任务系统需要“资源管理/互斥”的原因——后续 FreeRTOS 互斥量章节会详细展开。

## 上下文切换原理(上集)

**1. 存储-加载体系结构**

加载-存储体系结构（load-store architecture）的定义：只有取数型和存数型指令可以访问存储器，运算型指令的源操作数都来自寄存器，运算结果也写到寄存器的一种计算机体系结构。Cortex-M 处理器基于加载-存储架构。

**2. 什么是上下文**

当一个任务执行时，它会利用处理器/微控制器寄存器，并像其他程序一样访问 RAM 和 ROM。这些资源（处理器寄存器、堆栈等）一起组成了任务执行上下文。

为什么需要上下文：任务是一段有顺序的代码，它不知道什么时候会被内核挂起或恢复。为了防止上下文被更改，任务在恢复时必须有一个与挂起之前相同的上下文。通过保存/恢复上下文，内核保证任务恢复后能“无缝”继续执行。

**3. Cortex-M 状态与操作模式**

- **线程模式**（Thread Mode）：执行普通代码；可以处于特权级或用户级。
- **处理模式**（Handler Mode）：执行异常处理程序；总是特权级的。
- **复位后处理器进入线程模式 + 特权级**。特权级下的代码可通过置位 CONTROL[0] 进入用户级；任何异常处理器都以特权级运行，异常返回后回到产生异常之前的特权级。

把代码按特权级和用户级分开对待，有利于使架构更加安全和健壮：用户级代码禁止写特殊功能寄存器和 NVIC 中的寄存器；如果还配有 MPU，甚至可以阻止用户代码访问不属于它的内存区域。

**4. 关键寄存器组**

- 通用寄存器：R0-R7（低寄存器）、R8-R12（高寄存器）。
- R13：堆栈指针（SP），包含主堆栈指针（MSP）和进程堆栈指针（PSP）。
- R14：连接寄存器（LR），保存子程序/异常返回地址。
- R15：程序计数器（PC），指向当前执行指令。
- xPSR：程序状态寄存器，内部分为 APSR（应用程序 PSR）、IPSR（中断号 PSR）、EPSR（执行 PSR）三个子寄存器，可通过 MRS/MSR 指令单独或组合（xPSR）访问。

**5. 寄存器保存规则（AAPCS）**

- callee-saved（被调函数保存）：R4-R8、R10、R11、SP 等，被调函数若使用这些寄存器，需在函数入口保存、出口恢复，保证调用者看到的值不变。
- caller-saved（调用者保存）：进入异常前硬件自动保存 R0-R3、R12、R14、R15 和 xPSR（按顺序从后往前压，即先压 xPSR）。

**AAPCS 是什么：**AAPCS（ARM Architecture Procedure Call Standard，ARM 架构过程调用标准，新版改称 PCSAE）是 ARM 规定的一套"函数调用约定"——规定子程序之间如何传递参数、返回值放在哪个寄存器、哪些寄存器由调用者保护、哪些由被调用者保护，以及栈指针必须如何对齐。C 编译器、手写汇编和 RTOS 上下文切换都必须遵守同一套约定，否则不同语言/模块编译出的代码无法互相调用。

**各寄存器在调用约定中的角色：**

- R0-R3：参数传递寄存器，R0 同时承担返回值；调用者若想在函数返回后继续使用它们，必须自己先压栈。
- R12（IP）：子程序间调用的临时中转寄存器，属于 caller-saved。
- R14（LR）：保存子程序/异常返回地址；R15（PC）：程序计数器。
- R4-R11：局部变量寄存器，属于 callee-saved（非易失）；其中 R9 在 AAPCS 中被保留为平台寄存器（PR），故原文 callee-saved 列表里跳过了 R9。
- R13（SP）：栈指针，必须始终保持有效并按约定对齐。

**caller-saved 与 callee-saved 的本质区别：**"谁来保存"取决于被调函数是否可以破坏该寄存器。caller-saved（易失寄存器：R0-R3、R12、R14、R15、xPSR）意味着被调函数可以随意使用、无需恢复，因此调用者若想在调用后继续用这些值，必须在调用前自己压栈；callee-saved（非易失寄存器：R4-R11、SP）意味着被调函数若要使用这些寄存器，必须在入口 push、出口 pop，保证调用者看到的值不变。

**与 Cortex-M 异常入栈的对应关系：**Cortex-M 响应异常时，硬件自动把 xPSR、PC、LR、R12、R3、R2、R1、R0 这 8 个字压入当前栈——这恰好就是 caller-saved 集合。而 R4-R11 属于 callee-saved，硬件不负责保存，必须由异常处理程序（在 FreeRTOS 中即 PendSV）手动用 stmdb/ldmia 压入/弹出任务栈。这正是上下文切换时"硬件压一半、软件压另一半"的原因，也是后文 PendSV 汇编中 `stmdb r0!, {r4-r11}` 的由来。

**6. 异常入口栈帧与双字栈对齐**

压栈时保存到栈里的数据被统称为栈帧（stack frame）。

Cortex-M 处理器的栈帧总是双字（8 字节）对齐，确保栈的使用遵循 AAPCS 标准；压入栈的 xPSR 寄存器第 9 位标志表明是否发生双字栈调整。

浮点扩展时：FPU 的状态需要保存，FPSCR 也需要存储，因此进入异常时需多压入 17 个寄存器（68 字节）；

**AAPCS 规定子例程调用必须保存 S16-S31**。

## 上下文切换原理(下集)

**1. 上下文切换的定义**

**保存被挂起的任务的上下文和恢复被恢复的任务的上下文的过程**被称为上下文切换。任务挂起时内核保存其上下文，任务恢复时在执行之前由内核恢复保存的上下文，从而保证任务对切换过程“无感”，能继续执行。

**2. SysTick 与 PendSV（可悬起系统调用）**

SysTick 定期触发产生上下文切换。除此之外，上下文切换也会在任务放弃占用 CPU 时发生（portYIELD()），两种方式最终都会触发 PendSV 异常。

```c
void xPortSysTickHandler(void)
{
    vPortRaiseBASEPRI();   /* 提高BASEPRI，屏蔽除最低优先级外的所有中断 */

    if (xTaskIncrementTick() != pdFALSE)
    {
        /* 设置ICSR触发PendSV中断 */
        portNVIC_INT_CTRL_REG = portNVIC_PENDSVSET_BIT;
    }

    vPortClearBASEPRIFromISR();  /* 恢复BASEPRI，重新允许中断 */
}
```

**3. SVC（系统服务调用）**

SVC 用于产生系统函数的调用请求。操作系统不让用户程序直接访问硬件，而是提供系统服务函数，用户程序使用 SVC 发出对系统服务函数的呼叫请求，以此间接访问硬件。SVC 不能挂起，将立即被执行。

**4. PendSV 的作用**

PendSV 与 SVC 协同工作：PendSV 可以暂时挂起异常，通过向 NVIC 中的 PENDSVSET 置 1 来产生。PendSV 异常会自动延迟上下文切换的请求，直到其它的 ISR 都完成处理后才放行。为实现这个机制，需要把 PendSV 编程为最低优先级的异常。

为什么需要 PendSV：若产生 SysTick 异常时正在响应一个中断，SysTick 会抢占其 ISR，此时 OS 不得执行上下文切换，否则会使中断请求被延迟；如果 OS 在某中断活跃时尝试切入线程模式，将触犯用法 fault 异常。把 PendSV 设为最低优先级，可保证上下文切换在所有中断处理完成之后才进行。

**5. PendSV 汇编实现要点**

- 保存当前任务：mrs r0, psp 获取当前任务的进程栈指针；stmdb r0!, {r4-r11} 将 r4-r11 压入任务栈；str r0, [r2] 更新 TCB 中的栈指针。
- 切换任务：调用 vTaskSwitchContext()——更新当前任务运行时间、检查任务堆栈是否溢出，然后调用宏 taskSELECT_HIGHEST_PRIORITY_TASK() 选出最高优先级任务。
- 恢复新任务：从新 TCB 取出栈顶指针，ldmia r0!, {r4-r11} 恢复寄存器，msr psp, r0 恢复进程栈指针，最后 bx r14 返回；硬件自动将 R0-R3、R12、LR（R14）、PC（R15）和 xPSR 出栈。

## 实时应用、实时调度与滴答计数

**1. 实时应用概述**

设计实时/嵌入式系统是为了对现实世界事件作出及时响应。现实世界中发生的事件存在截止时间，因此实时/嵌入式系统必须在此之前响应，RTOS 调度策略必须确保遵守这些截止时间的要求。

软件工程师必须为每个任务分配优先级（注意与硬件中断优先级区别）。RTOS 的调度策略确保能够执行的最高优先级任务是被给予处理时间的任务；如果相同优先级的任务准备同时运行，需要确保任务能够“公平”地分享处理时间。

**2. 例子：实时响应（键盘与 LCD）**

用户应在合理时间内收到按键的视觉反馈。如最长接受时间为 100 毫秒，则任何介于 0 和 100 毫秒之间的响应都是可接受的。按键处理任务通过 vTaskDelay(pdMS_TO_TICKS(10)) 每 10ms 检查一次按键状态。

```c
void vKeyHandlerTask(void *pvParameters)
{
    for (;;)
    {
        if (checkIfKeyPressed())
        {
            char key = getKeyValue();
            processKey(key);
        }
        vTaskDelay(pdMS_TO_TICKS(10)); /* 每10ms检查一次 */
    }
}
```

**3. 例子：周期控制**

假设实时系统执行依赖数字过滤输入的控制功能：必须对输入进行采样、过滤并每 2 毫秒执行一次控制周期，采样时间规则必须精确到 0.5 毫秒。可用 0.5ms 周期的软件定时器执行采样-过滤-控制-输出，控制任务每 2ms（4 个 0.5ms 周期）更新控制逻辑。

```c
void sampleInputTimerCallback(TimerHandle_t timer)
{
    float rawInput = sampleInput();        /* 采样输入 */
    filteredInput = filterInput(rawInput); /* 过滤 */
    controlOutput = performControlAlgorithm(filteredInput);
    outputResult(controlOutput);           /* 输出结果 */
}

void vControlTask(void *pvParameters)
{
    xSampleTimer = xTimerCreate("SampleTimer",
                                pdMS_TO_TICKS(0.5), pdTRUE, NULL,
                                sampleInputTimerCallback);
    xTimerStart(xSampleTimer, 0);
    for (;;)
    {
        vTaskDelay(pdMS_TO_TICKS(2)); /* 每2ms执行控制周期 */
    }
}
```

**4. 任务调度过程与空闲任务**

RTOS 自身创建了一个任务：空闲任务（Idle Task），该任务仅在没有其他任务执行时才会执行，空闲任务总是处于就绪态。调度器在任务运行过程中根据事件（按键按下、定时器事件等）触发切换，保证高优先级任务及时运行。

**5. 滴答计数的作用**

RTOS 时间基于周期性的滴答中断。可以通过调用 vTaskDelay() 函数等待时间，或等待事件发生。宏 pdMS_TO_TICKS() 将毫秒转换为滴答计数。

请求的阻塞时间始于调用 API 时，也就是两个滴答中断之间。滴答数是一个整数，不能计算部分滴答周期，因此从调用 API 到下一个滴答中断之间的时间被算作延迟（阻塞）周期的第一个滴答——这就是相对延时的“取整”行为。

Tick ISR 的伪代码逻辑：TickISR() { 递增滴答计数；若滴答递增使任务就绪，则切换到该任务执行；从 ISR 返回 }。

## 堆内存管理基础

**1. 堆内存管理概述**

创建任务、队列、信号量、互斥锁、软件定时器等对象时，可以从 FreeRTOS 管理的内存堆中动态申请所需的 RAM，提高内存使用效率，但存在内存碎片的问题。

除动态内存分配外，还支持静态内存分配：用户自行定义所需的 RAM，并在创建对象时指定这些内存空间，保证设备的可靠性，但需要考虑内存上限，且内存使用效率可能较低。

FreeRTOS 提供一套内存管理 API，如 pvPortMalloc() / vPortFree() 函数，替代标准 C 库中的 malloc() 和 free() 函数——因为它们在嵌入式系统上可能并不总是可用，且可能占用大量代码空间、非线程安全、执行时间具有不确定性。

**2. 动态分配与静态分配 API**

| 动态分配（configSUPPORT_DYNAMIC_ALLOCATION = 1） | 静态分配（configSUPPORT_STATIC_ALLOCATION = 1） |
|-|-|
| xTaskCreate() | xTaskCreateStatic() |
| xQueueCreate() | xQueueCreateStatic() |
| xTimerCreate() | xTimerCreateStatic() |
| xEventGroupCreate() | xEventGroupCreateStatic() |
| xSemaphoreCreateBinary() / xSemaphoreCreateCounting() / xSemaphoreCreateMutex() / xSemaphoreCreateRecursiveMutex() | 对应的 xSemaphoreCreate...Static() 版本 |

**3. 五种堆内存管理算法**

| 方案 | 特点 | 适用场景 |
|-|-|-|
| heap_1 | 最简单，只允许申请内存、不允许释放 | 小型深度嵌入式应用：系统启动时创建所需全部对象并全程使用 |
| heap_2 | 允许申请和释放，但不能合并相邻的空闲内存块（最佳适应算法），会产生碎片 | 分配和释放的内存块大小固定的场景，碎片不成问题 |
| heap_3 | 简单封装 C 库 malloc()/free() 并确保线程安全；configTOTAL_HEAP_SIZE 不起作用，堆大小由编译器在启动文件中设置（STM32 中单位为字节） | 使用标准 C 库、堆在启动文件配置的工程 |
| heap_4 | 允许申请和释放，并能合并相邻的空闲内存块（首次匹配算法），碎片风险最低 | 最常用的通用方案 |
| heap_5 | 能管理多个非连续内存区域的 heap_4（最佳匹配 + 合并），用 HeapRegion_t 数组描述各区域 | 芯片有多个不连续 RAM 区域的场景 |

**4. heap_5 多区域配置示例**

```c
/* 定义链接器未使用两个RAM区域的起始地址和大小 */
#define RAM2_START_ADDRESS ((uint8_t *) 0x00020000)
#define RAM2_SIZE (32 * 1024)

#define RAM3_START_ADDRESS ((uint8_t *) 0x00030000)
#define RAM3_SIZE (32 * 1024)

/* 声明数组，该数组将成为heap_5使用的堆的一部分，该数组将被链接器放在RAM1中 */
#define RAM1_HEAP_SIZE (30 * 1024)
static uint8_t ucHeap[RAM1_HEAP_SIZE];

const HeapRegion_t xHeapRegions[] =
{
    { ucHeap, RAM1_HEAP_SIZE },
    { RAM2_START_ADDRESS, RAM2_SIZE },
    { RAM3_START_ADDRESS, RAM3_SIZE },
    { NULL, 0 } /* 标记数组的结束 */
};
```

HeapRegion_t 结构体必须按起始地址顺序出现，具有最低起始地址的结构体首先出现。

**5. 怎么选堆算法**

- 对象创建后不再删除 → heap_1，最简单。
- 会动态创建/删除对象，且块大小固定 → heap_2。
- 工程已在用标准 C 库且希望线程安全 → heap_3。
- 通用推荐 → heap_4，可合并碎片、稳定性好。
- RAM 不连续（如芯片有多块 RAM）→ heap_5。

## STM32CubeMX多核心配置实验

**1. 实验目的**

通过 STM32CubeMX 为不同系列的开发板（STM32F103、STM32F405、STM32G070、STM32U575 等）创建基础工程，熟悉芯片选型、引脚配置、时钟配置与代码生成流程，为后续 FreeRTOS 实验搭建工程基础。

**2. 实验平台**

- 硬件：华清远见嵌入式开发板（STM32F103RET6 / F405 / G070 / U575 核心板 + 外设底板，底板含 ESP-12F WiFi 模块、USB 接口、按键、指示灯等）。
- 软件：STM32CubeMX、MDK-ARM / STM32CubeIDE。

**3. 实验内容**

使用 STM32CubeMX 分别建立多个工程的开发配置（DevConfig）：

- 02-10_stm32u575_DevConfig（STM32U575 系列）
- 02-10_stm32g070_DevConfig（STM32G070 系列）
- 02-10_stm32f103_DevConfig（STM32F103 系列）
- 02-10_stm32f405_DevConfig（STM32F405 系列）

不同系列的差异主要在芯片选型、引脚封装与部分外设资源；通过同一套 CubeMX 操作流程配置 RCC、GPIO、串口等基础外设，生成工程后再用 MDK-ARM / STM32CubeIDE 编译验证。

**4. 实验步骤（以任一工程为例）**

1. 打开 STM32CubeMX，选择对应芯片型号（如 STM32F103RET6）。
2. 配置时钟树（RCC）与调试口（SWD）。
3. 按板卡原理图配置 GPIO（LED、按键、蜂鸣器）、USART 等外设。
4. 设置工程名称与路径（如 02-10_stm32f103_DevConfig），工具链选择 MDK-ARM。
5. 生成代码，用 MDK-ARM 打开工程，编译下载验证。

**5. 验证要点**

- 工程能否编译通过并下载到开发板。
- 基础外设（时钟、串口、GPIO）是否按配置正常工作。
- 为后续章节的 FreeRTOS 实验（任务、队列、信号量等）准备好可用的工程骨架。

## 嵌入式虚拟仿真平台配置

**1. 实验目的**

在嵌入式虚拟仿真平台上完成 STM32F407 开发环境的配置实验，熟悉虚拟仿真平台的工程创建、外设配置与运行验证流程。

**2. 实验平台与工程**

- 工程名称：02-11_stm32f407_DevConfig。
- 硬件：STM32F407 核心板（集成 MCU、SRAM、NOR FLASH）+ 外设底板。

板载外设：智控风扇执行器模块（PWM 调速驱动器、5V 风扇+测速、脉冲反馈 CAPTURE）、显示屏、TF Card 卡槽、指示灯、按键、蜂鸣器、蓝牙模块、电源开关（OFF/ON）、DC 电源输入（6-12V）等。

**3. 配置要点**

- 电源：DC 输入 6-12V，经板载电源管理供电。
- 风扇模块：PWM 输出调速、脉冲反馈（CAPTURE）测速。
- 通信外设：蓝牙模块（TXD/RXD）、USB（USB MCU / USB WIFI 切换）。
- 人机外设：按键（KEY2/KEY3/KEY4）、蜂鸣器（BUZ1）、指示灯（D1-D4）、显示屏、TF Card。

**4. 实验步骤**

1. 在虚拟仿真平台 / STM32CubeMX 中建立 02-11_stm32f407_DevConfig 工程。
2. 按板卡原理图配置 GPIO、PWM 定时器、输入捕获（CAPTURE）、UART、I2C 等外设。
3. 生成代码，编译并部署到虚拟仿真平台运行。
4. 验证外设初始化正常（如风扇 PWM 输出、按键输入、串口打印）。

**5. 验证要点**

- 工程能在虚拟仿真平台正常启动运行。
- 风扇模块 PWM 调速与测速反馈正常。
- 为后续 FreeRTOS 实验提供完整的 STM32F407 工程环境。

# FreeRTOS任务创建方法

## FreeRTOS任务基础概述

**1. 程序镜像的构成**

程序镜像（Image）是编译链接后烧写到程序存储器中的完整代码与数据集合。Cortex-M 的程序存储器从地址 0x00000000 开始，自低地址到高地址依次为：

| 向量表项 | 地址 | 用途 |
|-|-|-|
| MSP 初始值 | 0x00000000 | 主堆栈指针初始值 |
| 复位向量 | 0x00000004  <br/>（实际存储地址 0x00000008，含 Thumb 位） | 复位后第一条指令入口 |
| NMI / 硬件错误向量 | 0x00000008 / 0x0000000C | 不可屏蔽中断、硬件错误入口 |
| SVC 向量 | 0x0000002C  <br/>（保留区之后） | 系统服务调用入口 |
| PendSV / SysTick 向量 | 0x00000038 / 0x0000003C | 可悬起系统调用、滴答中断入口 |
| 中断向量 | 0x00000040 起 | 外设中断入口 |

向量表存放各异常/中断服务程序的入口地址（第 0 项是 MSP 初始值），复位后处理器通过向量表找到第一条要执行的代码。

**2. 复位与启动过程**

启动过程分硬件复位取指与软件初始化两个阶段：

- 硬件复位：读取地址 0x00000000 得到 MSP 初始值；读取 0x00000004 得到复位向量；按复位向量指向的地址取第一条指令，随后继续取指执行。
- 软件初始化（C 库）：镜像入口指向 C 库的 \_\_main——完成代码与数据拷贝、RW 数据复制/解压、ZI 数据清零；随后进入 \_\_rt_entry——配置应用栈与堆、初始化库函数、调用 C++ 顶层构造函数，最终调用用户代码的 main()。

为什么需要这个过程：C 语言假设“已初始化变量有初值、未初始化变量为 0、栈和堆可用”，而 Flash 中的镜像默认不具备这些运行时状态，必须由启动代码在 main() 之前建立起来。关键点：main() 的存在会促使链接器自动链接库初始化代码。

**3. 栈与内存映射**

向量表第 0 项是 MSP 初始值，指向栈顶（如 0x20008000）；栈向下生长，压入的第一个条目存放在栈顶地址减 4 处（0x20007FFC），后续条目依次向低地址延伸。

默认内存映射：镜像被链接并加载到指定运行地址（ARM 标准工具链默认 0x8000，实际工程以链接脚本/分散加载文件为准）。所有只读段（RO）首先放置，接着是读/写段（RW），然后是零初始化段（ZI）；堆紧跟在 ZI 的顶部之后，确切位置在链接时决定；在应用程序启动时，栈基位置由半主机操作提供，返回值取决于调试环境。

**4. 分散加载机制**

armclang 编译器默认生成若干命名段，链接器通过分散加载描述文件把它们放到指定的内存区域。常用段名与内容：

| 默认段名 | 分散加载选择器 | 内容举例 |
|-|-|-|
| .bss | .bss / ZI / BSS | 零初始化数据 int b=0; 与未初始化数据 int a; |
| .data | .data / RW / RW-DATA / DATA | 读/写数据 int z=5; |
| .constdata | .constdata / RO / RO-DATA / CONST | 只读常量 |
| .rodata | .rodata / RO / RO-DATA / CONST | 只读数字常量 int const x=5; |
| .rodata.str1.1 | .rodata.str1.1 / RO / RO-DATA / CONST | 字符串字面量 printf("const string"); |
| .text | .text / RO / RO-CODE / CODE | 指令代码 |

**5. RTOS 中的任务**

在 FreeRTOS 中，每个执行线程都被称为“任务”。使用 RTOS 的实时应用程序可以被构建为一组独立的任务，每个任务在自己的上下文中执行，不依赖于系统内的其他任务或 RTOS 调度器本身。

为什么每个任务要有独立堆栈：单核 MCU 在任意时间点只能执行一个任务，调度器负责决定执行哪个任务，并重复启停每个任务。任务调出时，执行上下文（寄存器值、堆栈内容等）被保存到该任务自己的堆栈；再次调入时从堆栈恢复，保证上下文与调出时完全相同，任务才能“无感”地继续执行。

**6. 任务函数的构成**

任务由 C 语言函数实现，函数原型必须返回 void，并带一个 void 指针参数。每个任务本身是一个小程序：有入口点，通常在无限循环中永远运行、不会退出；不允许以任何方式从函数中返回（不能包含 return 语句）。

```c
void vATaskFunction(void *pvParameters)
{
    /* 栈分配变量：每个任务实例各有一份 */
    long lStackVariable = 0;

    /* static 变量：链接器分配到固定位置，只有一个副本，被所有任务实例共享 */
    static long lStaticVariable = 0;

    for (;;)
    {
        /* 任务功能代码 */
    }

    /* 若任务从循环退出，必须在到达函数末尾前删除任务；
       vTaskDelete(NULL) 表示删除当前任务 */
    vTaskDelete(NULL);
}
```

变量作用域要点：普通局部变量存在任务栈上，每个任务实例各有一份；static 变量存在固定内存地址，整个系统只有一份副本，所有任务实例共享——多任务共享数据时要注意这一点。

**7. 任务的状态**

单核 MCU 在任意给定时刻实际只执行一个任务，因此一个任务可以有两个基本状态：

- 运行状态：当前占用 CPU 的任务，任何时候只能有一个。
- 非运行状态：当前没有运行的所有其他任务。

FreeRTOS 调度器是唯一可以切换任务进入/退出运行状态的实体（任务还有阻塞、挂起等更细状态，后续章节展开）。

**8. 创建任务的 API**

| 任务函数 | 函数描述 |
|-|-|
| xTaskCreate() | 动态方式创建任务 |
| xTaskCreateStatic() | 静态方式创建任务 |
| xTaskCreateRestricted() | 动态方式创建使用 MPU 限制的任务 |
| xTaskCreateRestrictedStatic() | 静态方式创建使用 MPU 限制的任务 |
| xTaskCreateAffinitySet() | 动态创建带关联掩码的任务（SMP 多核开发） |
| xTaskCreateStaticAffinitySet() | 静态创建带关联掩码的任务（SMP 多核开发） |

命名规则：

名称含“Static”的使用作为参数传入的预分配 RAM 块（TCB 与栈由用户提供）；

不含“Static”的运行时从系统堆动态分配；

含“Restricted”的创建对系统内存访问有限制的任务；

含“Affinity”的指定任务在哪个核心上运行（多核）。

每个任务都需要两块 RAM：一块保存任务控制块（TCB），另一块存储任务栈空间。

**9. xTaskCreate() 动态创建**

参数说明：

pvTaskCode 指向实现任务的函数；

pcName 任务的描述性名称（辅助调试，最好可读）；

usStackDepth 栈大小（字，不是字节，configSTACK_DEPTH_TYPE 默认 uint16_t）；

pvParameters 传给任务的参数（void\*）；

uxPriority 优先级（最低 0 到最高 configMAX_PRIORITIES-1）；pxCreatedTask 传出创建的任务句柄。

```c
void vOtherFunction(void)
{
    BaseType_t xReturned;
    TaskHandle_t xHandle = NULL;

    /* 创建任务，并存储句柄 */
    xReturned = xTaskCreate(
        vTaskCode,      /* 实现任务的函数 */
        "NAME",         /* 任务的文本名称 */
        STACK_SIZE,     /* 栈大小以字为单位，不是字节 */
        (void *)1,      /* 传递给任务的参数 */
        tskIDLE_PRIORITY, /* 创建任务时的优先级 */
        &xHandle);     /* 用于传出任务句柄 */

    if (xReturned == pdPASS)
    {
        /* 任务创建成功，可用句柄删除任务 */
        vTaskDelete(xHandle);
    }
}
```

**10. xTaskCreateStatic() 静态创建**

与动态版本的区别：需要用户提供两块永久内存——puxStackBuffer 必须指向至少 ulStackDepth 个元素的 StackType_t 数组（作为任务栈），pxTaskBuffer 必须指向 StaticTask_t 类型的变量（保存 TCB，即任务控制块结构）。静态方式不依赖堆，适合不允许动态内存分配的场景。

```c
#define STACK_SIZE 200   /* 栈的字的数量，32位栈项时=800字节 */

StaticTask_t xTaskBuffer;            /* 保存任务 TCB 的结构体 */
StackType_t xStack[STACK_SIZE];      /* 作为任务堆栈的数组 */

void vTaskCode(void *pvParameters)
{
    configASSERT((uint32_t)pvParameters == 1UL);
    for (;;) { /* 任务代码 */ }
}

void vOtherFunction(void)
{
    TaskHandle_t xHandle = NULL;

    xHandle = xTaskCreateStatic(
        vTaskCode,       /* 实现任务的函数 */
        "NAME",          /* 任务的文本名称 */
        STACK_SIZE,      /* xStack 数组中的索引数 */
        (void *)1,       /* 传递给任务的参数 */
        tskIDLE_PRIORITY,/* 任务创建的优先级 */
        xStack,          /* 作为任务堆栈使用的数组 */
        &xTaskBuffer);  /* 保存任务数据结构的变量 */

    /* puxStackBuffer 和 pxTaskBuffer 不为 NULL，任务应已创建 */
    vTaskSuspend(xHandle);
}
```

## FreeRTOS任务配置实验

**1. 实验基础**

本案例在实验代码 02-11_stm32f407_DevConfig 基础上进行任务的创建（沿用第二章“嵌入式虚拟仿真平台配置”实验生成的 STM32F407 工程）。

**2. 案例中任务的配置**

案例创建两个任务，配置如下：

| 配置项 | 第一个任务 | 第二个任务 |
|-|-|-|
| 函数的名称 | Task1 | Task2 |
| 函数优先级 | osPriorityLow | osPriorityLow |
| 任务栈大小 | 128 | 128 |
| 函数的入口 | vTask1 | vTask2 |
| 任务的参数 | NULL | NULL |

两个任务优先级相同（osPriorityLow 低优先级）、栈大小同为 128（字），入口函数分别为 vTask1 与 vTask2，均不传参数。

**3. 任务的执行模式（时间片调度）**

两个任务优先级相同，RTOS 按时间片轮流调度：

- 时间 t1：Task1 进入运行状态，并执行到 t2。
- 时间 t2：Task2 进入运行状态，并执行到 t3；此时 Task1 重新进入运行状态。

关键点：两个同优先级任务交替占用 CPU，看起来“同时”在运行，实际是调度器按时间片快速切换——这正是单核上并发执行的假象。同优先级任务之间靠时间片轮流获得 CPU；只有不同优先级时才存在“高优先级抢占低优先级”。

## CMSIS与任务的执行模式

**1. CMSIS 是什么**

CMSIS（Cortex Microcontroller Software Interface Standard，通用微控制器软件接口标准）是一组 API、软件组件、工具和工作流程，有助于简化软件重用，缩短微控制器开发人员的学习曲线，加快项目构建和调试，从而缩短新应用的上市时间。

CMSIS 最初是独立于供应商的硬件抽象层，基于 Cortex-M 处理器，后来扩展到支持基于 Cortex-A 的入门级处理器。它定义了通用工具接口，通过向处理器和外设提供简单的软件接口，实现一致的设备支持。注意：CMSIS 不是一个庞大的软件层，不会带来明显开销，并且不定义标准外设。

**2. CMSIS 工具与规范**

| 工具/组件 | 用途 |
|-|-|
| CMSIS-Toolbox | 为软件开发工作流提供实用工具（独立 GitHub 仓库维护） |
| CMSIS-Pack | 软件组件与设备支持的打包、交付机制 |
| CMSIS-SVD | 外设寄存器描述（用于调试器/工具低视图描述设备） |
| CMSIS-DAP | 调试接口（CMSIS-DAP 调试探针协议） |
| CMSIS-Zone | 资源分区与安全分区配置 |
| CMSIS-Stream | 数据流处理组件 |

CMSIS 规范定义了嵌入式软件开发的方法和工作流程。

**3. CMSIS-RTOS2 架构**

CMSIS-RTOS2 指定了在基于 Arm Cortex 处理器设备上运行的实时操作系统内核的通用 RTOS 接口。架构分层：

- 应用程序/中间件：通过通用 RTOS 操作调用 CMSIS-RTOS2 API（头文件 cmsis_os2.h）；内核特定操作直接对接实时内核。
- 实时内核：如 CMSIS-RTX、FreeRTOS、Zephyr 等，各自提供内核实现。
- 内核滴答定时器：对应 OS Tick API（os_tick.h）及实现文件（os_systick.c 等）。
- 底层：Arm Cortex 处理器。

好处：应用程序与具体 RTOS 内核解耦——更换内核不需要改应用代码，中间件也能在各种软件生态中更简单地集成，实现更好的代码重用。

**4. CMSIS-RTOS2 支持的内核**

| 内核 | 说明 |
|-|-|
| CMSIS-RTX（Keil RTX5） | 对 CMSIS-RTOS2 API 提供最完整的支持，并将其用作本机接口 |
| FreeRTOS | 在 CMSIS-FreeRTOS 变体中启用 CMSIS-RTOS2 API（本课程使用） |
| Zephyr RTOS | Linux 基金会管理，支持 CMSIS-RTOS2 API |
| embOS | Segger 设计的抢占式 RTOS |
| ThreadX（STM32） | STMicroelectronics 集成到 STM32 中间件的 Azure RTOS |
| Micrium OS | Silicon Labs 开发和维护 |

**5. 工程启动流程**

CubeMX 生成的 FreeRTOS 工程按三步启动：

1. **初始化外设**：MX_GPIO_Init()、MX_ICACHE_Init()、MX_USART1_UART_Init() 等（配置时钟、引脚、外设）。
2. **初始化内核**：osKernelInitialize() 初始化 FreeRTOS 内核对象，MX_FREERTOS_Init() 创建任务、队列、信号量等对象。
3. **启动调度**：osKernelStart() 启动 FreeRTOS 任务调度；此后控制权被调度器接管，理论上不会执行到 while(1)。

```c
/* 1. 初始化外设 */
MX_GPIO_Init();
MX_USART1_UART_Init();

/* 2. 初始化内核并创建对象 */
osKernelInitialize();   /* 初始化 FreeRTOS 内核对象 */
MX_FREERTOS_Init();     /* 创建任务等对象 */

/* 3. 启动调度器 */
osKernelStart();        /* 开始 FreeRTOS 任务调度 */

/* 控制权已被调度器接管，理论上不会执行到这里 */
while (1) { }
```

osKernelInitialize() 内部逻辑：若在中断上下文（IRQ Context）中返回 osErrorISR；否则查询 FreeRTOS 调度器状态——只有“调度器尚未启动且内核处于未初始化”时才初始化（使用 heap_5 时先调用 vPortDefineHeapRegions 配置内存区域），并把内核状态置为就绪；否则返回 osError。

**6. 任务的创建（osThreadNew）**

MX_FREERTOS_Init() 中通过 CMSIS-RTOS2 的 osThreadNew 创建任务：

```c
/* 在 MX_FREERTOS_Init() 中创建任务 */
defaultTaskHandle = osThreadNew(StartDefaultTask, NULL, &defaultTask_attributes);
Task1Handle = osThreadNew(vTask1, NULL, &Task1_attributes);
Task2Handle = osThreadNew(vTask2, NULL, &Task2_attributes);
```

osThreadNew 内部按内存分配方式分派：静态分配（attr 提供 stack_mem 与 cb_mem）走 xTaskCreateStatic；动态分配走 xTaskCreate，创建失败（返回不为 pdPASS）时句柄置 NULL。这就是 CMSIS 层与 FreeRTOS 层 API 的桥接关系。

**7. 启动调度器（osKernelStart）**

osKernelStart() 内部流程：若在中断上下文中则返回 osErrorISR；否则检查调度器状态——调度器未启动且内核已就绪时，先调用 SVC_Setup() 确保 SVC 中断的优先级处于复位值，再把内核状态置为 osKernelRunning，最后调用 vTaskStartScheduler() 真正启动内核调度器；条件不满足则返回 osError。

**8. 案例任务的执行模式**

与“FreeRTOS任务配置实验”相同：两个同优先级任务（Task1、Task2）按时间片轮流执行——t1 时 Task1 进入运行状态执行到 t2；t2 时 Task2 进入运行状态执行到 t3；t3 时 Task1 重新进入运行状态，如此循环。

**9. 在任务 1 中创建任务 2**

任务代码也可以在运行时创建其他任务：vTask1 在进入无限循环之前调用 xTaskCreate(vTask2, "Task 2", 1000, NULL, 1, NULL) 创建 Task 2（栈 1000 字、优先级 1）；循环内打印任务名，并用空转循环做粗糙延迟——后续章节会改用 vTaskDelay 等真正的延时函数。

```c
void vTask1(void *pvParameters)
{
    const char *pcTaskName = "Task 1 is running\r\n";
    volatile unsigned long ul;   /* volatile 防止被优化 */

    /* 调度器已启动；进入无限循环之前创建名为 "Task 2" 的新任务 */
    xTaskCreate(vTask2, "Task 2", 1000, NULL, 1, NULL);

    for (;;)
    {
        vPrintLine(pcTaskName);  /* 打印此任务的名称 */

        /* 空转延迟：后续示例将使用真正的延迟/休眠函数替换 */
        for (ul = 0; ul < mainDELAY_LOOP_COUNT; ul++)
        {
        }
    }
}
```

# FreeRTOS任务参数使用

## FreeRTOS任务参数使用

**1. void 与 void\* 的概念**

void 在英文中作名词解释为“空虚、空间、空隙”，在 C 语言中被翻译为“无类型”，相应的 void\* 为“无类型指针”。void 的常见作用有两种：

- 对函数返回的限定：当函数不需要返回值时，必须使用 void 限定，例如 void func(int a, char \*b)。
- 对函数参数的限定：当函数不允许接受参数时，必须使用 void 限定，例如 int func(void)。

**2. void 指针的使用规则 1：任意类型指针赋值**

void 指针可以指向任意类型的数据，即可以用任意类型的指针对 void 指针赋值（不需要转换）：

```c
int *a;
void *p;
p = a;   /* 任意类型指针直接赋给 void*，无需类型转换 */
```

反过来，把 void 指针赋给其他类型的指针时，则需要强制类型转换：a = (int \*)p。

典型例子：内存分配 malloc() 函数返回的指针是 void\* 型，使用这个指针时必须强制类型转换，显式说明该指针指向的内存中存放的是什么类型的数据：(int \*)malloc(1024)。

**3. void 指针的使用规则 2：不允许算术运算**

ANSI C 标准中，不允许对 void 指针进行算术运算（如 p++ 或 p+=1）。原因：既然 void 是无类型，那么每次算术运算不知道该操作几个字节——char 型操作 sizeof(char) 字节，int 型则要操作 sizeof(int) 字节。

GNU 扩展中允许这种运算：默认情况下 GNU 认为 void\* 和 char\* 一样（此时 sizeof(\*p) == sizeof(char)），既然类型确定，当然可以进行算术操作。

总体而言，GNU 比 ANSI 更“开放”，提供更多语法支持。判断规则：如果函数的参数可以是任意类型指针，就应把参数声明为 void\*。

**4. 与任务参数的关系**

任务函数的原型是 void vATaskFunction(void \*pvParameters)——参数被设计为 void\* 正是为了“通用接口”：任何类型的数据（整数、结构体指针、字符串指针……）都可以传入，任务内部再强制转回原类型使用。下一节实验用 (void\*)pcTextForTask1 / (void\*)pcTextForTask2 向同一个入口函数传递不同的字符串指针。

## FreeRTOS任务参数使用实验

**1. 实验基础**

本案例在实验代码 02-11_stm32f407_DevConfig 基础上进行任务的创建，演示如何通过任务参数（pvParameters）向任务函数传递数据。

**2. 案例中任务的配置**

案例创建两个任务，配置如下：

| 配置项 | 第一个任务 | 第二个任务 |
|-|-|-|
| 函数的名称 | Task1 | Task2 |
| 函数优先级 | osPriorityLow | osPriorityLow |
| 任务栈大小 | 128 | 128 |
| 函数的入口 | vTaskFunction | vTaskFunction |
| 任务的参数 | (void \*)pcTextForTask1 | (void \*)pcTextForTask2 |

与第三章实验的关键区别：两个任务共用同一个入口函数 vTaskFunction，仅通过任务参数区分——参数分别是字符串指针 pcTextForTask1 与 pcTextForTask2 的强制转换。

**3. 任务参数传递示意**

```c
static const char *pcTextForTask1 = "Task 1 is running\r\n";
static const char *pcTextForTask2 = "Task 2 is running\r\n";

/* 任务入口：通过 pvParameters 接收参数，强转回原类型 */
void vTaskFunction(void *pvParameters)
{
    char *pcTaskName = (char *)pvParameters;

    for (;;)
    {
        vPrintLine(pcTaskName);
        vTaskDelay(pdMS_TO_TICKS(1000));
    }
}

/* 创建两个任务，传入不同参数 */
xTaskCreate(vTaskFunction, "Task 1", 128, (void *)pcTextForTask1, 1, NULL);
xTaskCreate(vTaskFunction, "Task 2", 128, (void *)pcTextForTask2, 1, NULL);
```

**4. 任务参数的作用**

在函数参数中使用 void \*pvParameters 的目的主要是实现一种通用的接口：这个接口可以接受任何类型的参数。这种设计常见于需要处理不同类型数据的函数或 API 中，比如操作系统中的线程创建函数（xTaskCreate / osThreadNew）、事件处理函数等。

**5. 设计要点**

- 一个入口函数 + 不同参数 = 多个功能相似但行为不同的任务实例，避免为每个任务复制粘贴近乎相同的代码。
- 参数类型不限于字符串：整数、结构体指针、句柄等都能通过 void\* 传入，任务内按需强转。
- 注意被传递数据的生命周期：若传入指向局部变量的指针，任务可能在该变量销毁后才读取，导致未定义行为——建议传全局/静态变量或动态分配的、生命周期明确的内存。

# FreeRTOS任务的优先级

## FreeRTOS任务优先级

**1. 任务优先级介绍**

- 调度器始终确保可以运行的最高优先级任务是被选中进入运行状态的任务；具有相同优先级的任务会依次进入和退出运行状态。
- 用于创建任务的 xTaskCreate() API 函数的 uxPriority 参数为任务分配其初始优先级；vTaskPrioritySet() API 函数在任务创建后改变其优先级。
- 最大优先级数量由 FreeRTOSConfig.h 中定义的 configMAX_PRIORITIES 编译时配置常量设置。数值较低的优先级表示低优先级任务，其中优先级 0 是最低优先级；可以使用的优先级范围是从 0 到 (configMAX_PRIORITIES - 1)。

**2. 优先级实现方式：通用方法**

通用方法采用 C 语言编写，适用于 FreeRTOS 在所有处理器架构上的移植。使用通用方法时，FreeRTOS 并不限制 configMAX_PRIORITIES 的最大设置值。一般来说，还是建议将 configMAX_PRIORITIES 的值保持在必要的最小值——其值越大，消耗的 RAM 就越多，并且会导致最坏情况下的执行时间更长。

启用条件：FreeRTOSConfig.h 中 configUSE_PORT_OPTIMIZED_TASK_SELECTION 设置为 0；如果没有定义该宏，或者通用方法是为正在使用的 FreeRTOS 移植提供的唯一方法，也会使用通用方法。

**3. 优先级实现方式：架构优化方法**

架构优化方法使用少量特定于处理器架构的汇编代码编写，比通用的 C 语言实现性能更高。架构优化实现对于 32 位架构的 configMAX_PRIORITIES 施加了一个最大值为 32 的限制；与通用方法一样，建议把 configMAX_PRIORITIES 保持在尽可能低的实际值，因为更高的值需要更多的 RAM。

启用条件：FreeRTOSConfig.h 中 configUSE_PORT_OPTIMISED_TASK_SELECTION 设置为 1；注意，并非所有的 FreeRTOS 移植都提供了架构优化方法。

**4. 时间片与滴答中断**

以相同优先级创建的两个任务看起来总是能够运行：每个任务执行一个“时间片”，在时间片开始时进入运行状态，在时间片结束时退出运行状态。每个时间片结束时，调度器会执行选择下一个要运行的任务；为此使用一个周期性中断，称为“滴答中断”（Tick Interrupt）。

调度时序：t1 发生滴答中断 → 内核在滴答中断里运行以选择下一个任务 → 滴答中断完成时，新选择的任务开始运行。

**5. 时间片长度与滴答频率**

时间片长度由滴答中断频率设置，由 FreeRTOSConfig.h 中定义的 configTICK_RATE_HZ 编译时配置常量设置。例如，将 configTICK_RATE_HZ 设置为 100，每个时间片将持续 10 毫秒。两个滴答中断之间的时间称为“滴答周期”，即一个时间片等于一个滴答周期。

configTICK_RATE_HZ 的最佳值取决于应用程序，通常使用 1000 这个典型值。FreeRTOS API 函数调用总是以滴答周期的倍数来指定时间，通常被称为“滴答”。

pdMS_TO_TICKS() 宏把以毫秒为单位的时间转换为以滴答为单位的时间。可用的分辨率取决于定义的滴答频率：如果滴答频率高于 1kHz（即 configTICK_RATE_HZ 大于 1000），则不能使用 pdMS_TO_TICKS() 宏。

```c
/* pdMS_TO_TICKS() 唯一参数是以毫秒为单位的时间，
   返回等效的滴答周期数 */
TickType_t xTimeInTicks = pdMS_TO_TICKS(200); /* 200ms 对应的 tick 数 */
```

## FreeRTOS任务优先级实验

**1. 实验基础**

本案例在实验代码 02-11_stm32f407_DevConfig 基础上创建两个任务，通过设置不同的优先级观察抢占式调度的行为。

**2. 案例中任务的配置**

案例创建两个任务，配置如下：

| 配置项 | 第一个任务 | 第二个任务 |
|-|-|-|
| 函数的名称 | Task1 | Task2 |
| 函数优先级 | osPriorityLow | osPriorityLow1 |
| 任务栈大小 | 128 | 128 |
| 函数的入口 | vTaskFunction | vTaskFunction |
| 任务的参数 | (void \*)pcTextForTask1 | (void \*)pcTextForTask2 |

与第四章实验的关键区别：两个任务仍然共用入口函数 vTaskFunction 并通过参数区分，但 Task2 的优先级（osPriorityLow1）比 Task1（osPriorityLow）高一级。

**3. 观察到的调度现象**

任务优先级不同（Task2 高于 Task1）时，调度行为与同优先级完全不同：

- 发生滴答中断时，调度器在滴答中断里运行，但选择同样的任务——始终是优先级最高的那个。
- Task2 始终处于运行状态，Task1 始终处于非运行状态。

原因：只要高优先级任务 Task2 处于就绪态（未阻塞、未挂起），调度器就永远选择它；低优先级任务 Task1 只有在 Task2 阻塞或挂起时才有机会运行——这正是抢占式调度的核心表现。

**4. 验证与思考**

- 如果给 Task2 的任务循环加入阻塞延时（如 vTaskDelay），Task2 进入阻塞态后 Task1 才有机会运行，两个任务才会交替出现。
- 优先级数量上限在 FreeRTOSConfig.h 的 configMAX_PRIORITIES 中配置；CMSIS 层的 osPriorityLow / osPriorityLow1 会映射到 FreeRTOS 的优先级数值。
- 高优先级任务永远不让出 CPU（无阻塞）会导致低优先级任务“饿死”——优先级分配要结合任务实时需求与运行时间综合考虑。

# FreeRTOS相对延时函数

## FreeRTOS相对延时函数

**1. 事件驱动型任务**

到目前为止，创建的任务总是需要执行处理操作，并且从未需要等待任何东西，因此总是能够进入运行状态。“连续处理”类型的任务用途有限，任务只能在最低优先级下创建——如果这些任务以其他优先级运行，就会阻止优先级更低的任务运行。

必须将任务重新编写成事件驱动型的任务：事件驱动型的任务（可以具有不同的优先级）只有在触发事件发生后才有工作要执行，在事件发生前不会进入运行状态。

调度器始终选择可以运行的最高优先级任务。如果无法选择高优先级任务——例如它正在等待某个事件——则调度器必须选择可以运行的优先级较低的任务。

**2. 任务的阻塞状态**

正在等待事件的任务称为处于“阻塞”状态，这是“非运行”状态的一个子状态。任务可以进入阻塞状态以等待两种不同类型的事件：

- 时间性事件：这些事件发生在延迟期到期或达到绝对时间时。例如，任务可能会进入阻塞状态，以等待 10 毫秒过去。
- 同步事件：这些事件来自另一个任务或中断。例如，任务可能会进入阻塞状态，等待队列中的数据到达。同步事件涵盖了广泛的事件类型。

队列、二进制/计数信号量、互斥量、递归互斥量、事件组、流缓冲区、消息缓冲区和直接任务通知都可以创建同步事件。任务也可以在同步事件上设置超时，从而有效地同时阻塞两种类型的事件。

**3. 挂起状态与就绪状态**

挂起状态也是非运行状态的一个子状态。处于挂起状态的任务对调度器不可用：

- 进入挂起状态的唯一方法是调用 vTaskSuspend() API 函数。
- 退出挂起状态的唯一方法是调用 vTaskResume() 或 xTaskResumeFromISR() API 函数。
- 大多数应用程序不使用挂起状态。

处于非运行状态且未阻塞或挂起的任务被称为处于就绪状态——它们可以运行、准备运行，但当前不在运行状态。

**4. 完整的任务状态机**

结合以上内容，FreeRTOS 任务共有四种状态，转换关系如下：

- 运行（Running）：任务正在使用 CPU。
- 就绪（Ready）：任务可运行但未获得 CPU，等待调度器选中。
- 阻塞（Blocked）：任务在等待时间性事件或同步事件，不占用处理时间。
- 挂起（Suspended）：任务对调度器不可用，只有 vTaskResume() / xTaskResumeFromISR() 能唤醒。

关键转换：运行→就绪（时间片耗尽或被高优先级抢占）；运行→阻塞（调用阻塞 API，如 vTaskDelay()）；运行→挂起（调用 vTaskSuspend()）；阻塞→就绪（事件发生或超时到期）；挂起→就绪（调用 vTaskResume()）。

**5. vTaskDelay() 函数**

vTaskDelay() API 函数将调用任务置于阻塞状态，直到滴答中断次数达到某个固定数。任务处于阻塞状态时，不占用任何处理时间，所以任务只在有实际工作时才占用处理时间——这正是事件驱动型任务的基础。

```c
void vTaskDelay(TickType_t xTicksToDelay);
```

| 参数名称 | 说明 |
|-|-|
| xTicksToDelay | 调用任务在进入就绪状态之前，将在阻塞状态中保持的滴答中断次数。可以使用 pdMS_TO_TICKS() 宏将以毫秒为单位指定的时间转换为以滴答为单位指定的时间。 |

示例：当滴答计数为 10000 时，如果一个任务调用了 vTaskDelay(100)，那么任务将立即进入阻塞状态，并保持在阻塞状态，直到滴答计数达到 10100。调用 vTaskDelay(pdMS_TO_TICKS(100)) 将导致调用任务在阻塞状态中保持 100 毫秒。

## FreeRTOS相对延时函数实验

**1. 实验基础**

本案例在前几章工程基础上，为两个任务加入 vTaskDelay() 阻塞延时，观察高优先级任务、低优先级任务与空闲任务的完整调度顺序。

**2. 案例中任务的配置**

案例创建两个任务，配置如下：

| 配置项 | 第一个任务 | 第二个任务 |
|-|-|-|
| 函数的名称 | Task1 | Task2 |
| 函数优先级 | osPriorityLow | osPriorityLow1 |
| 任务栈大小 | 128 | 128 |
| 函数的入口 | vTaskFunction | vTaskFunction |
| 任务的参数 | (void \*)pcTextForTask1 | (void \*)pcTextForTask2 |

任务配置与第五章相同（Task2 优先级更高），任务函数中引入 vTaskDelay() 阻塞，执行顺序发生根本变化。

**3. 示例的执行顺序**

两个任务与空闲任务（Idle）的调度过程分四步：

1. Task2 的优先级最高，所以先运行。首先打印其字符串，然后调用 vTaskDelay()，这样就进入阻塞状态，允许低优先级的 Task1 执行。
2. Task1 打印其字符串，然后通过调用 vTaskDelay() 进入阻塞状态。
3. 此时，两个应用任务都在阻塞状态，所以空闲任务（Idle）运行。
4. 延时到期时，调度器会将任务转换回就绪状态，此时两个任务都会被执行，再次调用 vTaskDelay() 会导致调用任务进入阻塞状态。Task2 先执行，因为其优先级更高。

**4. 与第五章对比：阻塞的意义**

第五章中高优先级 Task2 执行空循环不阻塞，低优先级 Task1 被“饿死”；本章加入 vTaskDelay() 后：

- 高优先级任务在等待期间主动让出 CPU，低优先级任务得以执行。
- 两个任务都阻塞时，空闲任务运行——CPU 不再被空循环浪费。
- 每次延时到期，仍是高优先级任务先恢复运行（抢占式调度不变）。

# FreeRTOS绝对延时函数

## FreeRTOS绝对延时函数

**1. 相对延时与绝对延时的理解**

vTaskDelay() 是“相对”延时：调用任务解除阻塞的时间是相对于函数调用的时间计算的。任务自身的执行耗时不定（可能被更高优先级任务抢占、代码分支耗时不同），因此用 vTaskDelay(x) 实现“周期性执行”时，实际周期会不断漂移。

图示对比：任务 1 使用 vTaskDelay(6) 阻塞 6 个滴答，但加上自身执行时间，实际每轮分别耗时 13、14 个滴答周期——执行频率不稳定；任务 2 使用 vTaskDelayUntil(x, 5)，每轮固定占用 5 个滴答周期，执行频率精确稳定。

结论：当希望任务以固定的频率周期性地执行时，应使用 vTaskDelayUntil() 这个 API 函数，因为调用任务解除阻塞的时间是绝对的，而不是相对于函数调用的时间（vTaskDelay()）。

**2. vTaskDelayUntil() 函数原型**

vTaskDelayUntil() 函数的参数指定了调用任务应从阻塞状态进入就绪状态的精确滴答计数值。

```c
void vTaskDelayUntil(TickType_t *pxPreviousWakeTime, TickType_t xTimeIncrement);
```

**3. vTaskDelayUntil() 函数参数**

| 参数名称 | 说明 |
|-|-|
| pxPreviousWakeTime | 这个参数的命名是假设调用 vTaskDelayUntil() API 函数用于实现一个以固定频率周期性执行的任务。在这种情况下，pxPreviousWakeTime 保存了任务上一次离开阻塞状态（被“唤醒”）的时间。将这个时间作为参考点，来计算任务下一次应该离开阻塞状态的时间。 |
| xTimeIncrement | 这个参数的命名也是假设用于实现固定频率周期性执行的任务，固定频率由 xTimeIncrement 设置。xTimeIncrement 的单位是“滴答”。可以使用 pdMS_TO_TICKS() 宏将以毫秒为单位的时间转换为以滴答为单位的时间。 |

注意：pxPreviousWakeTime 所指向的变量在 vTaskDelayUntil() 函数中会自动更新，通常不会被应用程序代码修改，但必须在首次使用之前初始化为当前的滴答计数值。

**4. 函数示例：每 250ms 精确执行一次**

```c
void vTaskFunction(void *pvParameters)
{
    char *pcTaskName;
    TickType_t xLastWakeTime;
    const TickType_t xDelay250ms = pdMS_TO_TICKS(250UL);

    /* 要打印的字符串通过参数传入，将其转换为字符指针 */
    pcTaskName = (char *)pvParameters;

    /* xLastWakeTime 初始化为当前滴答计数值。
       这是唯一一次访问这个变量，此后由 vTaskDelayUntil() 自动管理 */
    xLastWakeTime = xTaskGetTickCount();

    for (;;)
    {
        vPrintString(pcTaskName);

        /* 每 250 毫秒精确执行一次；
           xLastWakeTime 在函数内部自动更新，无需任务代码更新 */
        vTaskDelayUntil(&xLastWakeTime, xDelay250ms);
    }
}
```

## FreeRTOS绝对延时函数实验

**1. 实验基础**

本案例创建四个任务（两个连续处理任务、一个周期任务、一个预留空位），演示 vTaskDelayUntil() 实现固定频率的周期任务，并观察它与同优先级连续任务的调度关系。

**2. 案例中任务的配置**

案例创建任务，配置如下：

| 配置项 | Task1 | Task2 | Task3 | Task4 |
|-|-|-|-|-|
| 函数的名称 | Task1 | Task2 | Task3 | — |
| 函数优先级 | osPriorityLow | osPriorityLow | osPriorityLow1 | — |
| 任务栈大小 | 128 | 128 | 128 | — |
| 函数的入口 | vContinuousProcessingTask | vContinuousProcessingTask | vPeriodicTask | — |
| 任务的参数 | (void \*)pcTextForTask1 | (void \*)pcTextForTask2 | (void \*)pcTextForPeriodicTask | — |

角色分工：Task1/Task2 是“连续处理”任务（同优先级，共享时间片）；Task3 是“周期任务”（优先级高一档，用 vTaskDelayUntil() 固定节拍执行）；Task4 预留空位。

**3. 执行模式**

Periodic 周期任务优先级最高，每隔固定间隔被唤醒一次；两个 Continuous 连续任务同优先级，共享时间片。完整过程如下：

1. Continuous task1 运行一个完整的滴答周期（时间 t1 和 t2 之间的时间片），在此期间可能多次打印其字符串。
2. 滴答中断发生期间，调度器选择一个新的任务运行。由于两个连续任务具有相同的优先级而且能够运行，调度器在两者之间共享处理时间，因此 Continuous task2 进入运行状态，并在整个滴答周期内保持运行，在此期间可能多次打印其字符串。
3. 在时间 t3，滴答中断再次运行，导致任务切换到 Continuous task1，如此不断循环。
4. 在时间 t5，滴答中断发现周期任务的阻塞周期已经到期，所以将周期任务转到就绪状态。周期任务是最高优先级任务，因此立即进入运行状态，在那里准确地打印其字符串一次，然后调用 vTaskDelayUntil() 返回阻塞状态。
5. 周期任务进入阻塞状态意味着调度器已选择一个任务进入运行状态，在这种情况下，选择了 Continuous task1，该任务运行到下一个滴答中断，在此期间可能多次打印其字符串。

**4. 关键结论**

- 周期任务每次唤醒后“准确地打印一次”，执行频率由 xTimeIncrement 精确固定，不受任务自身执行时间影响——这是绝对延时区别于相对延时的核心。
- 空闲任务从未进入运行状态，因为总是有优先级较高的任务能够进入运行状态。
- 连续任务打印次数不固定（取决于时间片内能执行多少轮循环），周期任务打印次数固定——适合需要精确节拍的应用（如周期性采样、心跳信号）。

# FreeRTOS空闲钩子函数

## FreeRTOS空闲钩子函数

**1. 空闲任务的概述**

当任务处于阻塞状态时，任务无法运行，因此调度器无法选择这些任务。必须始终至少有一个任务可以进入运行状态——即使在 FreeRTOS 的特殊低功耗功能时也是如此（在这种情况下，执行 FreeRTOS 的微控制器将被置于低功耗模式）。

为了确保这种情况，当调用 vTaskStartScheduler() 时，调度器会自动创建一个空闲任务。空闲任务除了在一个循环中等待之外几乎不执行其他任何操作。

空闲任务具有尽可能低的优先级（优先级为 0），以确保它永远不会阻止更高优先级的应用程序任务进入运行状态。然而，这并不妨碍应用程序设计者根据需要创建与空闲任务共享优先级的任务。

**2. 空闲优先级任务的行为**

FreeRTOSConfig.h 中的 configIDLE_SHOULD_YIELD 编译时配置常量，决定空闲任务是否让出处理时间给同优先级的应用程序任务。

使用它需要满足两个条件：**①使用抢占式调度器；②应用程序创建了运行在空闲优先级的任务。**

如果 configIDLE_SHOULD_YIELD 设置为 1：当其他空闲优先级任务准备运行时，空闲任务将立即挂起。这确保当有应用程序任务可调度时，空闲任务花费的时间最少。然而，这种行为可能产生不良效应——空闲任务与其他空闲优先级任务反复交替占用时间片，切换开销增大、处理时间分配不均衡。

如果设置为 0：阻止空闲任务让出处理时间，直到其时间片结束。这可以确保所有空闲优先级任务分配相同的处理时间（如果没有任务被抢占），但代价是分配给空闲任务更高比例的处理时间。

**3. 如何避免不良效应**

通过以下方式避免上述不良效应：

- **可以使用空闲钩子代替单独的空闲优先级任务**。
- **以高于空闲的优先级创建所有应用程序任务**。
- **将 configIDLE_SHOULD_YIELD 设置为 0**。

**4. 空闲任务钩子函数的用途**

通过使用空闲钩子（或空闲回调）函数，直接在空闲任务中添加应用程序的相关功能。空闲钩子函数是一种函数，它在空闲任务循环的每次迭代中自动由空闲任务调用。空闲任务钩子的常见用途包括：

- **执行低优先级、后台或连续处理功能**，而无需为此目的创建应用程序任务，避免带来额外的 RAM 开销。
- **测量空闲处理能力**：仅在所有更高优先级的应用程序任务没有工作要执行时，空闲任务才会运行。测量分配给空闲任务的处理时间，就可以测量空闲处理能力。
- **将处理器置于低功耗模式**：提供了一种简单且自动的方法，在没有应用程序处理要执行时节省功耗。

**5. 空闲任务钩子函数的限制**

- 空闲任务钩子函数绝对不能阻塞或挂起自己。

注意：以任何方式阻塞空闲任务都可能导致没有任务可以进入运行状态的情况。

- 如果一个应用程序任务使用 vTaskDelete() API 函数删除自己，必须在合理的时间段内将空闲任务钩子返回给调用者。

这是因为任务被删除后，空闲任务负责清理内核资源；如果空闲任务永久保持在空闲钩子函数中，则无法进行这种清理。

空闲任务钩子函数必须具有下面代码所示的名称和原型：

```c
void vApplicationIdleHook(void);
```

## FreeRTOS空闲钩子实验

**1. 实验基础**

本案例在 CubeMX 中启用空闲钩子函数，并在 vApplicationIdleHook() 中统计空闲任务的运行情况，观察空闲任务只在没有高优先级任务可运行时才执行。

**2. 空闲钩子函数配置**

在 CubeMX 的 FreeRTOS 配置界面中，相关配置项如下：

| 配置项 | 状态 |
|-|-|
| ENABLE_BACKWARD_COMPATIBILITY | Enabled |
| USE_PORT_OPTIMISED_TASK_SELECTION | Disabled |
| USE_TICKLESS_IDLE | Disabled |
| USE_TASK_NOTIFICATIONS | Enabled |
| RECORD_STACK_HIGH_ADDRESS | Disabled |
| Memory Allocation | Dynamic / Static |
| TOTAL_HEAP_SIZE | 8192 |
| STACK_ALLOCATION_FROM_SEPARATE_HEAP | Disabled |
| USE_IDLE_HOOK | Enabled（关键） |
| USE_TICK_HOOK | Disabled |
| USE_MALLOC_FAILED_HOOK | Disabled |
| USE_DAEMON_TASK_STARTUP_HOOK | Disabled |

关键项：USE_IDLE_HOOK 设为 Enabled，才会生成空闲钩子回调 vApplicationIdleHook()。

**3. 实验任务的配置**

案例创建两个任务，配置如下：

| 配置项 | 第一个任务 | 第二个任务 |
|-|-|-|
| 函数的名称 | Task1 | Task2 |
| 函数优先级 | osPriorityLow | osPriorityLow1 |
| 任务栈大小 | 128 | 128 |
| 函数的入口 | vTaskFunction | vTaskFunction |
| 任务的参数 | (void \*)pcTextForTask1 | (void \*)pcTextForTask2 |

**4. 钩子函数的实现**

```c
/* 空闲任务循环的每次迭代都会被调用 */
void vApplicationIdleHook(void)
{
    /* 后台统计：空闲任务运行次数 */
    ulIdleCycleCount++;
}
```

验证方式：让 Task1/Task2 在循环中调用 vTaskDelay() 阻塞，则延时期间空闲任务运行、钩子被反复调用；若去掉阻塞让高优先级任务持续占用 CPU，空闲钩子几乎不被调用。

**5. 小结**

空闲钩子的执行时机，就是“系统没有其他工作可做”的时刻。它适合放置低功耗、后台统计、资源清理等低优先级工作，但绝不能在钩子中阻塞或挂起。

# FreeRTOS任务句柄使用

## FreeRTOS任务句柄使用

**1. xTaskCreate() / xTaskCreateStatic() 的返回值**

创建任务时，除了代码入口、优先级等参数外，还可以**通过返回值或输出参数拿到任务的句柄（TaskHandle_t）**，供后续操作该任务使用：

```c
BaseType_t xTaskCreate(TaskFunction_t pvTaskCode,
                       const char * const pcName,
                       configSTACK_DEPTH_TYPE usStackDepth,
                       void *pvParameters,
                       UBaseType_t uxPriority,
                       TaskHandle_t *pxCreatedTask);
```

- pxCreatedTask 参数：输出参数，返回所创建任务的句柄。
- 返回值：pdPASS 表示创建成功；pdFAIL 表示创建失败（通常是堆内存不足）。

```c
TaskHandle_t xTaskCreateStatic(TaskFunction_t pxTaskCode,
                               const char * const pcName,
                               const uint32_t ulStackDepth,
                               void * const pvParameters,
                               UBaseType_t uxPriority,
                               StackType_t * const puxStackBuffer,
                               StaticTask_t * const pxTaskBuffer);
```

- 静态创建：栈和任务控制块由调用者提供（puxStackBuffer / pxTaskBuffer），不依赖堆。
- 返回值：其他值 = 任务句柄；NULL = 创建失败。

**2. 任务优先级的设置：vTaskPrioritySet()**

vTaskPrioritySet() API 函数用于在调度器启动后更改任务的优先级。只有将 FreeRTOSConfig.h 中的 INCLUDE_vTaskPrioritySet 设置为 1 时该函数才可用。原型如下：

```c
void vTaskPrioritySet(TaskHandle_t xTask, UBaseType_t uxNewPriority);
```

| 参数名称 | 参数说明 |
|-|-|
| pxTask | 被修改优先级的任务的句柄（即目标任务）。获取方式：xTaskCreate() 的 pxCreatedTask 参数，或 xTaskCreateStatic() 的返回值。任务可以通过传递 NULL 代替有效的任务句柄，来改变自己的优先级。 |
| uxNewPriority | 任务优先级将被设置为这个值，该值上限为最大可用优先级 (configMAX_PRIORITIES - 1)，其中 configMAX_PRIORITIES 是在 FreeRTOSConfig.h 头文件中设置的编译时常量。 |

**3. 任务优先级的获取：uxTaskPriorityGet()**

uxTaskPriorityGet() 函数用于查询任务的优先级。只有在 FreeRTOSConfig.h 中将 INCLUDE_uxTaskPriorityGet 设置为 1 时，该 API 函数才可用。原型如下：

```c
UBaseType_t uxTaskPriorityGet(TaskHandle_t xTask);
```

| 参数名称 | 参数说明 |
|-|-|
| pxTask | 被查询优先级任务（即目标任务）的句柄。获取方式参考 xTaskCreate() 的 pxCreatedTask 参数。任务可以通过在有效任务句柄的位置传入 NULL 来查询自己的优先级。 |
| 返回值 | 当前分配给被查询任务的优先级。 |

**4. 任务句柄与优先级 API 小结**

- 任务句柄是操作任务的“身份证”：改优先级、删任务、挂起/恢复等 API 都要用到。
- 句柄获取方式：xTaskCreate() 的输出参数、xTaskCreateStatic() 的返回值等。
- 传 NULL 表示“操作自己”，是 FreeRTOS 多个任务 API 的通用约定。

## FreeRTOS任务句柄实验

**1. 实验基础**

本案例通过两个任务互相修改优先级（使用任务句柄 + 优先级设置/获取 API），演示任务句柄在实际调度控制中的使用。

**2. 案例中任务的配置**

案例创建两个任务，配置如下：

| 配置项 | 第一个任务 | 第二个任务 |
|-|-|-|
| 函数的名称 | Task1 | Task2 |
| 函数优先级 | osPriorityLow1 | osPriorityLow |
| 任务栈大小 | 128 | 128 |
| 函数的入口 | vTask1 | vTask2 |
| 任务的参数 | NULL | NULL |

与前面章节不同：两个任务使用不同的入口函数（vTask1 / vTask2），参数都传 NULL，初始优先级 Task1 高于 Task2。

**3. 执行过程**

1. Task1 首先运行，因为它有最高的优先级（osPriorityLow1）。
2. Task1 运行时，通过 vTaskPrioritySet() 将 Task2 的优先级设置为最高——Task2 被提升后立即抢占 CPU 运行。
3. Task2 运行后，通过 vTaskPrioritySet() 把自己的优先级降低到低于 Task1——Task1 再次运行，如此持续不断。

**4. 要点分析**

- 任务句柄让“一个任务控制另一个任务”成为可能：本实验中 Task1 用句柄修改 Task2 的优先级。
- NULL 约定：Task2 降低自己优先级时，可以直接传入 NULL 表示自己。
- 运行结果：两个任务轮流获得 CPU，但切换节奏由 Task1 主导——这是动态调整优先级的典型应用。

# FreeRTOS删除任务函数

## FreeRTOS删除任务函数

**1. vTaskDelete() 函数概述**

使用 vTaskDelete() API 函数用于删除自己或者其他任务。需要的注意事项：

- 只有将 FreeRTOSConfig.h 文件中的 INCLUDE_vTaskDelete 设置为 1 时，该 API 函数才可以使用。
- 运行时不断创建和删除任务可能会产生内存碎片的风险。

如果通过动态内存分配创建的任务后来自行删除，那么空闲任务将负责释放用于该任务的内存，例如已删除任务的数据结构和堆栈。在这种情况下，应用程序不应完全剥夺空闲任务的所有处理时间，这一点非常重要。

- 当任务被删除时，由内核本身分配给任务的内存才会自动释放。

**2. vTaskDelete() 函数原型**

```c
void vTaskDelete(TaskHandle_t xTaskToDelete);
```

参数说明：被删除任务的句柄（即目标任务）。获取方式：xTaskCreate() 函数的 pxCreatedTask 参数，以及 xTaskCreateStatic() 函数的返回值。通过传递 NULL 代替有效的任务句柄，任务可以删除自己。

**3. 与空闲任务的关系**

任务被删除后，其内存回收由空闲任务完成：动态分配的任务栈和 TCB（任务控制块）由空闲任务负责释放。因此：

- 被删除任务不能是空闲任务本身。
- 删除任务后要保证空闲任务有机会运行（例如通过 vTaskDelay 让出 CPU），否则内存无法回收。

## FreeRTOS删除任务函数实验

**1. 实验基础**

本案例演示任务删除：一个任务运行时创建更高优先级的任务，被创建的任务打印后删除自己，观察任务生命周期与空闲任务的回收过程。

**2. 案例中任务的配置**

案例创建任务，配置如下：

| 配置项 | 第一个任务 |
|-|-|
| 函数的名称 | Task1 |
| 函数优先级 | osPriorityLow |
| 任务栈大小 | 128 |
| 函数的入口 | vTask1 |
| 任务的参数 | NULL |

Task2 由 vTask1 在运行时动态创建，且优先级高于 Task1。

**3. 执行过程**

1. vTask1 运行并创建 vTask2。vTask2 立即开始运行，因为 vTask2 具有更高的优先级。
2. vTask2 除了打印字符串和删除自己之外，没有做其他事，允许执行返回 vTask1。
3. vTask1 调用 vTaskDelay() 函数，允许空闲任务运行到延时到期为止（空闲任务负责清理 vTask2 被删除后留下的内核资源）。然后整个执行顺序再次重复。

**4. 要点分析**

- 删除自己：调用 vTaskDelete(NULL)（或传自己的句柄）。
- vTask2 被删除后，vTask1 再次成为最高优先级任务并恢复运行。
- vTask2 每次被创建又删除，其内存都由空闲任务回收——所以实验中 vTask1 必须 vTaskDelay 给空闲任务让出 CPU。

## FreeRTOS的3种任务调度算法

**1. 任务调度算法概述**

在单核处理器上，任何时候都只能有一个任务处于运行状态。也可以在多个核心上运行 FreeRTOS（非对称多处理，或 AMP），或者让 FreeRTOS 在多个核心之间调度任务（对称多处理，或 SMP）。

实际没有运行但既不在阻塞状态也不在挂起状态的任务处于就绪状态。处于就绪状态的任务可供调度器选择，以进入运行状态。调度器将始终选择优先级最高的就绪状态任务进入运行状态。

任务可以在阻塞状态等待事件的发生，当事件发生时，调度器会自动将任务返回到就绪状态。

时间性事件在特定的时间发生（周期性或超时）；

任务或 ISR 使用任务通知、队列、事件组或信号量中的一种发送信息时，就会发生同步事件。

**2. 调度算法的配置**

调度算法是决定哪个就绪状态任务转换到运行状态的软件程序。可以使用 **configUSE_PREEMPTION** 和 **configUSE_TIME_SLICING** 配置常量来更改算法，这两个常量在 FreeRTOSConfig.h 中定义：

| 调度算法 | 是否优先 | configUSE_PREEMPTION | configUSE_TIME_SLICING |
|-|-|-|-|
| 抢占式带时间片 | 是 | 1 | 1 |
| 抢占式不带时间片 | 是 | 1 | 0 |
| 协作式 | 否 | 0 | 任意值 |

configUSE_TICKLESS_IDLE 配置常量也会影响调度算法：使用该配置常量可能会导致在较长一段时间内完全关闭滴答中断。configUSE_TICKLESS_IDLE 是**专为必须尽量减少功耗的应用程序准备**的一种高级选项。

**3. 带时间片的抢占式调度**

这种算法有三个特征：

- **固定优先级**：调度算法不会改变被调度任务的优先级，也不会阻止任务本身改变其自己的优先级或其他任务的优先级。
- **抢占式**：如果一个任务的优先级高于运行状态的任务，而且该高优先级任务已经进入就绪状态，抢占式调度算法会立即“抢占”运行状态的任务。被抢占意味着任务会被强制从运行状态转换到就绪状态，以便允许另一个任务进入运行状态。任务抢占可以在任何时候发生，而不仅仅是在 RTOS 的滴答中断时。
- 时间片（滴答中断之间的时间）：**用于在优先级相同的任务之间共享处理时间**，即使任务没有显式地放弃或进入阻塞状态。调度算法会在每个时间片结束时，如果有其他具有相同优先级的“就绪状态”任务，则选择新的任务进入“运行状态”。

相同优先级任务的执行模式还与 configIDLE_SHOULD_YIELD 相关：设置为 0 时，空闲任务将在其整个时间片内保持运行状态，除非它被更高优先级的任务抢占；设置为 1 时，在循环的每次迭代中，如果还有其他处于就绪状态的空闲优先级任务，空闲任务将放弃其分配的时间片中剩余的时间。

**4. 无时间片的抢占式调度**

如果使用时间分片，并且存在多个处于就绪状态且能够运行的最高优先级任务，那么调度器将在每个 RTOS 滴答中断期间选择一个新任务进入运行状态。

如果不使用时间分片，调度器仅会在以下情况中选择一个新任务进入运行状态：

- 更高优先级的任务进入就绪状态。
- 处于运行状态的任务进入阻塞状态或挂起状态。

注意：不使用时间片时，任务上下文切换的次数比使用时间分片时要少，因此关闭时间片功能可以减少调度器的处理开销。然而，关闭时间片功能也可能导致具有相同优先级的任务获得的处理时间差异很大（configIDLE_SHOULD_YIELD = 0 的情况）。

**5. 协作式调度的执行模式**

协作式调度（configUSE_PREEMPTION=0）下，任务不会因为更高优先级任务就绪而被立即抢占，切换只发生在任务主动放弃 CPU 时：

- 运行任务进入阻塞状态（等待时间性事件或同步事件）。
- 运行任务显式调用 taskYIELD() 让出 CPU。

典型时序：Task3（低优先级）向队列写入使 Task2 解除阻塞 → 中断向信号量写入使 Task1 解除阻塞 → Task3 调用 taskYIELD() 函数，允许 Task1 进入运行状态 → Task1 进入阻塞状态，允许 Task2 进入运行状态。

适用场景：协作式调度切换点可控、确定性更强，但高优先级任务的实时性依赖低优先级任务主动让出，需要任务设计配合。

# FreeRTOS队列

## FreeRTOS队列的基础概念

**1. 队列的特点**

**队列是 RTOS 中的基本通信机制**，设置队列的目的是为了实现任务间的安全通信、资源管理、任务调度与协调、中断处理与任务交互，以及提高系统的可靠性和可维护性。

**2. 数据存储**

队列可以保存有限数量的**固定大小**的数据项。把队列能够保存的数据项的最大数量称为队列的“**长度**”。在创建队列时，会设置其长度以及每个数据项的大小。

队列通常用作先入先出（FIFO）缓冲区：数据被写入队列的末尾（尾部），并从队列的前端（头部）移除。

传递示意：Task A 向队列写入数据（如整型值），Task B 从队列读取数据项；数据项被读取后即从队列移除，空位随之释放。

**3. 多任务访问**

队列本身就是对象，可以被任何知道该队列的任务或中断服务程序访问。

任意数量的任务都可以向同一个队列写入数据，同样地，任意数量的任务也可以从同一个队列读取数据。

**4. 队列读取阻塞**

当任务试图从队列中读取数据时，可以选择性地指定一个“阻塞”时间。如果队列已经清空，这个任务将保持在阻塞状态，以等待队列中有数据可用，这个等待的时间就是阻塞时间。

当另一个任务或中断将数据放入队列时，处于阻塞状态等待队列中数据可用的任务将自动转移到就绪状态。如果在数据可用之前，指定的阻塞时间已到期，任务也将自动从阻塞状态转移到就绪状态。

**5. 队列写入阻塞**

与从队列中读取时一样，任务向队列写入时也可以选择性地指定阻塞时间。在这种情况下，阻塞时间是指：如果队列已经满了，任务在阻塞状态下等待队列空间可用的最长时间。

队列可以有多个写入者，因此一个队列可能有多个任务阻塞在该队列上等待完成发送操作。当这种情况发生时，只有当队列上有空间可用时，才会解除一个任务的阻塞：

- 被解除阻塞的任务始终是等待空间的最高优先级任务。
- 如果两个或多个被阻塞的任务具有相同的优先级，那么被解除阻塞的任务是等待时间最长的任务。

**6. 多队列阻塞**

队列可以被分组成集（队列集），允许任务进入阻塞状态，以等待队列集中的任意一个队列的数据变得可用。

**7. 队列的创建函数：xQueueCreate() / xQueueCreateStatic()**

```c
/* 动态创建 */
QueueHandle_t xQueueCreate(UBaseType_t uxQueueLength, UBaseType_t uxItemSize);
/* 静态创建 */
QueueHandle_t xQueueCreateStatic(UBaseType_t uxQueueLength, UBaseType_t uxItemSize,
                                 uint8_t *pucQueueStorageBuffer,
                                 StaticQueue_t *pxQueueBuffer);
```

| 参数名称 | 参数说明 |
|-|-|
| uxQueueLength | 正在创建的队列可以容纳的数据项的最大数量。 |
| uxItemSize | 存储在队列中的每个数据项的大小，以字节为单位。 |
| 返回值 | 返回 NULL 表示无法创建队列（堆内存不足）；返回非 NULL 值表示队列已成功创建，应将返回值作为已创建队列的句柄存储起来。 |

静态创建补充：

- 如果 uxItemSize 非零，pucQueueStorageBuffer 必须指向至少 (uxQueueLength \* uxItemSize) 字节的 uint8_t 数组；
- 如果 uxItemSize 为零，pucQueueStorageBuffer 可以为 NULL。pxQueueBuffer 必须指向 StaticQueue_t 类型的变量；
- 如果 pxQueueBuffer 为 NULL，则返回 NULL。

**8. 队列的发送函数：xQueueSendToBack() / xQueueSendToFront()**

| 参数名称 | 参数说明 |
|-|-|
| xQueue | 正在将数据发送（写入）到的队列的句柄，来自 xQueueCreate() 或 xQueueCreateStatic() 的返回值。 |
| pvItemToQueue | 指向要被复制到队列中的数据的指针。pvItemToQueue 指向的数据将被复制到队列的存储区。 |
| xTicksToWait | 如果队列已满，任务应进入阻塞态等待队列上出现可用空间的最大时间；设置为 0 则调用立即返回。时间以滴答周期为单位，可用 pdMS_TO_TICKS() 把毫秒转换为滴答。如果 INCLUDE_vTaskSuspend 为 1，将阻塞时间指定为 portMAX_DELAY 会导致任务无限期地阻塞。 |
| 返回值 | 发送成功返回 pdPASS；队列已满返回 errQUEUE_FULL。 |

**9. 队列的接收函数：xQueueReceive()**

xQueueReceive() 从队列中接收（读取）数据项，接收到的数据项会从队列中移除。

注意：不要在中断服务程序中调用 xQueueReceive()，应使用中断安全的 xQueueReceiveFromISR()。

| 参数名称 | 参数说明 |
|-|-|
| xQueue | 正在从队列中接收（读取）数据的队列句柄。 |
| pvBuffer | 指向接收到的数据项的缓冲区的指针，必须足够大以容纳队列中存储的每个数据项。 |
| xTicksToWait | 如果调用时队列为空，任务应阻塞等待项目接收的最长时间；设置为 0 则立即返回。时间以滴答周期为单位，可用 pdMS_TO_TICKS() 转换；INCLUDE_vTaskSuspend 为 1 时 portMAX_DELAY 表示无限期阻塞。 |
| 返回值 | 成功接收返回 pdPASS；调用时队列为空返回 errQUEUE_EMPTY。 |

**10. 队列查询函数：uxQueueMessagesWaiting()**

用于查询队列中当前数据项的数量。

注意：不要在中断服务程序中调用，应使用中断安全版本的 uxQueueMessagesWaitingFromISR()。

```c
UBaseType_t uxQueueMessagesWaiting(QueueHandle_t xQueue);
```

返回值：被查询队列当前的数据项的数量；返回 0 表示队列为空。

## FreeRTOS队列的配置实验

**1. 实验基础**

本案例创建两个发送任务与一个接收任务，通过共享队列实现任务间通信，观察阻塞与抢占的完整过程。

**2. 案例中任务的配置**

案例创建三个任务，配置如下：

| 配置项 | 第一个任务 | 第二个任务 | 第三个任务 |
|-|-|-|-|
| 函数的名称 | Sender1 | Sender2 | Receiver |
| 函数优先级 | osPriorityLow | osPriorityLow | osPriorityLow1 |
| 任务栈大小 | 250 | 250 | 250 |
| 函数的入口 | vSenderTask | vSenderTask | vReceiverTask |
| 任务的参数 | (void \*)100 | (void \*)200 | NULL |

**3. 队列的配置**

| 队列配置 | 参数配置 |
|-|-|
| 队列的名称 | QueueRecSend |
| 队列的长度 | 5 |
| 队列的元素大小 | uint32_t |

**4. 案例中任务的执行模式**

1. Receiver 任务首先运行，因为优先级最高。该任务试图从队列中读取数据。队列是空的，所以 Receiver 任务进入阻塞状态以等待有可用数据。Sender2 任务在 Receiver 任务阻塞后运行。
2. Sender2 任务向队列写入数据，导致 Receiver 任务退出阻塞状态。Receiver 任务具有最高优先级，所以抢占了 Sender2 任务。
3. Receiver 任务清空队列，然后再次进入阻塞状态。这次 Sender1 任务在 Receiver 任务阻塞后运行。
4. Sender1 任务向队列写入数据，导致 Receiver 任务退出阻塞，并抢占 Sender1 任务，如此持续不断。

**5. 要点分析**

- 高优先级任务“等待数据 → 被唤醒 → 抢占运行”的循环，是队列 + 阻塞机制的典型用法。
- 两个 Sender 传入的参数不同（100 / 200），Receiver 读到的数值不同，可据此区分数据来源。
- 本实验中 Receiver 每次都能等到数据（写者不断投递），形成经典的生产者-消费者模型。

## FreeRTOS队列传输结构体实验

**1. 实验基础**

本案例与 24 号实验结构相同，但通过队列传输的是结构体数据，演示队列传输自定义类型数据的能力。

**2. 案例中任务的配置**

案例创建三个任务，配置如下：

| 配置项 | 第一个任务 | 第二个任务 | 第三个任务 |
|-|-|-|-|
| 函数的名称 | Sender1 | Sender2 | Receiver |
| 函数优先级 | osPriorityLow1 | osPriorityLow1 | osPriorityLow |
| 任务栈大小 | 250 | 250 | 250 |
| 函数的入口 | vSenderTask | vSenderTask | vReceiverTask |
| 任务的参数 | (void \*)&(xStructsToSend[0]) | (void \*)&(xStructsToSend[1]) | NULL |

与 24 号实验不同：本实验中两个 Sender 的优先级（osPriorityLow1）高于 Receiver（osPriorityLow）。

**3. 队列的配置**

| 队列配置 | 参数配置 |
|-|-|
| 队列的名称 | QueueRecSend |
| 队列的长度 | 3 |
| 队列的元素大小 | uint32_t |

说明：本实验实际传输的是结构体，队列元素大小应按结构体 Data_t 的大小（sizeof(Data_t)）设置（PDF 原文配置表为 uint32_t，工程中以实际结构体尺寸为准）。

**4. 传输的结构体类型**

```c
/* 定义队列将要传输的结构体类型 */
typedef struct
{
    uint8_t ucValue;
    DataSource_t eDataSource;
} Data_t;

/* 声明两个 Data_t 类型的变量，将在队列中传输 */
static const Data_t xStructsToSend[2] =
{
    {100, eSender1},  /* 由 Sender1 使用 */
    {200, eSender2}   /* 由 Sender2 使用 */
};
```

**5. 要点分析**

- 结构体作为队列元素时，队列“元素大小”必须不小于结构体的 sizeof，队列拷贝的是结构体副本（值传递语义）。
- Sender 通过任务参数拿到不同结构体元素的地址，向队列发送整个结构体。
- Receiver 接收后得到结构体副本，可同时使用 ucValue 与 eDataSource 两个字段。

## FreeRTOS队列集的配置实验

**1. 实验基础**

本案例创建两个队列并把它们组成队列集，Receiver 任务在队列集上阻塞，任一队列有数据到达即被唤醒——演示“多队列阻塞”。

**2. 案例中任务的配置**

案例创建三个任务，配置如下：

| 配置项 | 第一个任务 | 第二个任务 | 第三个任务 |
|-|-|-|-|
| 函数的名称 | Sender1 | Sender2 | Receiver |
| 函数优先级 | osPriorityLow | osPriorityLow | osPriorityLow1 |
| 任务栈大小 | 250 | 250 | 250 |
| 函数的入口 | vSenderTask1 | vSenderTask2 | vReceiverTask |
| 任务的参数 | NULL | NULL | NULL |

**3. 队列的配置**

案例创建两个队列，配置如下：

| 第一个队列 | 第二个队列 |
|-|-|
| 队列的名称：xQueue1 | 队列的名称：xQueue2 |
| 队列的长度：1 | 队列的长度：1 |
| 队列的元素大小：char \* | 队列的元素大小：char \* |

两个队列都被加入同一个队列集（Queue Set）。Receiver 通过 xQueueSelectFromSet() 在队列集上阻塞：只要 xQueue1 或 xQueue2 中任意一个队列有数据，Receiver 就会被唤醒。

**4. 执行模式**

1. Receiver 优先级最高，先运行并在队列集上阻塞等待。
2. Sender1 向 xQueue1 写入数据，Receiver 被唤醒并抢占 Sender1，读取并处理数据。
3. Sender2 向 xQueue2 写入数据，Receiver 再次被唤醒并处理。

**5. 要点分析**

- 队列集让一个任务同时“监听”多个队列，减少任务数量。
- 队列集不仅支持队列，还支持信号量、事件组等对象（统称“可附加对象”）。
- 使用时配合 xQueueSelectFromSet() 查询“哪个对象有数据”，再对具体队列/信号量进行读取。

# FreeRTOS定时器

## FreeRTOS软件定时器基础概念

**1. 软件定时器的回调函数**

软件定时器用于在未来的某个设定时间进行调度函数的执行，或者按照固定的频率周期性执行。将软件定时器执行的函数称为软件定时器的回调函数。

软件定时器由 FreeRTOS 内核实现并受其控制，它们不需要硬件支持，也与硬件定时器或硬件计数器无关。

软件定时器的回调函数是通过 C 函数来实现的。唯一特别的地方是回调函数的原型必须返回 void，并且仅将软件定时器的句柄作为唯一的参数，原型如下：

```c
void ATimerCallback(TimerHandle_t xTimer);
```

软件定时器回调函数从开始执行到结束、以及退出都以正常方式进行。回调函数应该保持简短，并且绝对不能进入阻塞状态。

**2. 软件定时器的两种类型**

- 一次性定时器：一旦启动，一次性定时器只执行一次回调函数。一次性定时器可以手动重新启动，但不会自动重启。
- 自动重载定时器：一旦启动，自动重载定时器将在每次到期时自动重新启动，从而导致回调函数的周期性执行。

示意：一次性定时器（周期 6）在 t1 启动后仅在 t7 执行一次；自动重载定时器（周期 5）在 t1 启动后以固定周期重复执行（如 t11、t16……）。

**3. 软件定时器的状态**

- 休眠状态：休眠状态的软件定时器是存在的，可通过其句柄引用，但没有运行，因此其回调函数不会执行。
- 运行状态：软件定时器进入运行状态或最后一次重置后，将在与其周期相等的时间过去后执行其回调函数。

状态转换：

xTimerCreate() 创建后处于休眠；xTimerStart() / xTimerReset() / xTimerChangePeriod() 使其进入运行；xTimerStop() 使其回到休眠；

定时器到期并执行回调函数——一次性定时器执行后回到休眠，自动重载定时器执行后重新开始计时。

**4. RTOS 守护（定时器服务）任务**

所有软件定时器的回调函数都在同一个 RTOS 守护任务（该任务过去被称为“定时器服务任务”）的上下文中执行。

- 守护任务是标准的 FreeRTOS 任务，当调度器启动时会自动创建。
- 其优先级和堆栈大小分别由编译时配置常量 configTIMER_TASK_PRIORITY 和 configTIMER_TASK_STACK_DEPTH 设置。
- 软件定时器回调函数不得调用会导致调用任务进入阻塞状态的 FreeRTOS API 函数（例如 vTaskDelay()），因为这样做会导致守护任务进入阻塞状态。

**5. 定时器命令队列**

软件定时器 API 函数通过名为“定时器命令队列”的队列，将命令从调用任务发送到守护任务。命令示例包括“启动定时器”“停止定时器”和“重置定时器”。

- 定时器命令队列是标准的 FreeRTOS 队列，在调度器启动时会自动创建。
- 队列长度由 FreeRTOSConfig.h 文件中的 configTIMER_QUEUE_LENGTH 编译时配置常量设置。
- 发送到命令队列的命令包含时间戳，用于计算从应用程序任务发送命令到守护任务处理同一命令之间所经过的时间。

**6. 守护任务的调度**

守护任务像其他 FreeRTOS 任务一样进行调度：只有当守护任务是能够运行的最高优先级任务时，它才会处理命令或执行定时器回调函数。configTIMER_TASK_PRIORITY 的设置将影响执行模式。

**7. 函数 xTimerCreate() / xTimerCreateStatic()**

| 参数名称 | 参数说明 |
|-|-|
| pcTimerName | 定时器的描述性名称。FreeRTOS 并不会以任何方式使用它，纯粹作为辅助调试工具。 |
| xTimerPeriodInTicks | 定时器的周期，以滴答为单位。可以使用 pdMS_TO_TICKS() 宏将毫秒为单位的时间转换为以滴答为单位的时间。不能为 0。 |
| uxAutoReload | 设置为 pdTRUE 创建自动重载定时器；设置为 pdFALSE 创建一次性定时器。 |
| pvTimerID | 每个软件定时器都有 ID 值。该 ID 是一个空指针，可以由编程人员随意使用。当相同回调函数被多个软件定时器使用时，可以使用 ID 来提供与定时器相关的存储。 |
| pxCallbackFunction | 软件定时器的回调函数（void ATimerCallback(TimerHandle_t xTimer)）是 C 语言函数。pxCallbackFunction 参数是指向函数的指针（实际上只是函数名），用来作为正在创建的软件定时器的回调函数。 |
| 返回值 | 返回 NULL 表示无法创建软件定时器（堆内存不足）；返回非 NULL 值表示创建成功，返回值是已创建定时器的句柄。 |

**8. 函数 xTimerStart()**

xTimerStart() API 函数用于启动处于休眠状态的软件定时器，或重置处于运行状态的软件定时器。

| 参数名称 | 参数说明 |
|-|-|
| xTimer | 正在启动的软件定时器的句柄。 |
| xTicksToWait | xTimerStart() 使用定时器命令队列将“启动定时器”命令发送给守护任务。xTicksToWait 指定了在定时器命令队列已满时，调用任务在阻塞状态下等待队列空间可用的最大时间。xTicksToWait 为 0 且队列已满时立即返回。如果在调度器启动之前调用 xTimerStart()，则忽略 xTicksToWait 的值。 |
| 返回值 | pdPASS：软件定时器启动成功。pdFAIL：经过 xTicksToWait 个滴答时间后，启动命令仍无法发送到定时器命令队列。 |

**9. 函数 xTimerDelete()**

xTimerDelete() API 函数用于删除定时器，可以在任何时候删除定时器。

```c
BaseType_t xTimerDelete(TimerHandle_t xTimer, TickType_t xBlockTime);
```

| 参数名称 | 参数说明 |
|-|-|
| xTimer | 正在删除的软件定时器的句柄。 |
| xBlockTime | 在调用 xTimerDelete() 时队列已满的情况下，指定调用任务应保持阻塞状态以等待删除命令成功发送到定时器命令队列的时间（以滴答为单位）。如果启动 RTOS 调度器之前调用，则忽略 xBlockTime。 |
| 返回值 | pdPASS：软件定时器删除成功。pdFAIL：经过 xBlockTime 个滴答时间后，删除命令仍无法发送到定时器命令队列。 |

## FreeRTOS创建软件定时器实验

**1. 实验基础**

本案例创建两个软件定时器：一个一次性定时器、一个自动重载定时器，观察两种定时器回调的执行差异。

**2. 案例中定时器的配置**

案例创建两个定时器，配置如下：

| 配置项 | 一次性定时器 | 自动重载定时器 |
|-|-|-|
| 定时器名称 | xOneShotTimer | xAutoReloadTimer |
| 回调的函数 | prvOneShotTimerCallback | prvAutoReloadTimerCallback |
| 定时器类型 | osTimerOnce | osTimerPeriodic |
| 定时器参数 | NULL | NULL |

**3. 要点分析**

- osTimerOnce（一次性）对应 FreeRTOS 层的 uxAutoReload = pdFALSE；osTimerPeriodic（周期）对应 pdTRUE。
- 一次性定时器的回调只执行一次；自动重载定时器的回调按周期反复执行。
- CMSIS-RTOS2 层（osTimerNew）与 FreeRTOS 层（xTimerCreate）通过定时器句柄衔接。

## FreeRTOS定时器ID的配置实验

**1. 实验基础**

本案例创建两个定时器（一个单次、一个自动重载），它们共用同一个回调函数 prvTimerCallback，通过定时器 ID 与句柄区分定时器来源。

**2. 创建定时器：定时器 ID 的使用**

```c
/* 创建一个单次定时器，句柄存储在 xOneShotTimer 中：
   pdFALSE = 单次，ID 初始化为 0 */
xOneShotTimer = xTimerCreate("OneShot",
                              mainONE_SHOT_TIMER_PERIOD,
                              pdFALSE,
                              0,
                              prvTimerCallback);

/* 创建自动重载定时器，句柄存储在 xAutoReloadTimer 中：
   pdTRUE = 自动重载，ID 初始化为 0 */
xAutoReloadTimer = xTimerCreate("AutoReload",
                                mainAUTO_RELOAD_TIMER_PERIOD,
                                pdTRUE,
                                0,
                                prvTimerCallback);
```

两个定时器共用回调 prvTimerCallback，ID 都初始化为 0。

**3. 回调函数：用 ID 记录执行次数**

```c
void prvTimerCallback(TimerHandle_t xTimer)
{
    TickType_t xTimeNow;
    uint32_t ulExecutionCount;

    /* 软件定时器超时的次数存储在定时器的 ID 中：
       获取 ID、递增、再保存为新 ID（ID 是空指针，强转为 uint32_t） */
    ulExecutionCount = (uint32_t)pvTimerGetTimerID(xTimer);
    ulExecutionCount++;
    vTimerSetTimerID(xTimer, (void *)ulExecutionCount);

    /* 获取当前滴答计数值 */
    xTimeNow = xTaskGetTickCount();

    if (xTimer == xOneShotTimer)
    {
        vPrintStringAndNumber("One-shot timer callback executing", xTimeNow);
        /* 翻转输出蓝色 LED */
        HAL_GPIO_TogglePin(BLUE_LED_GPIO_Port, BLUE_LED_Pin);
    }
    else
    {
        /* xTimer 不等于 xOneShotTimer，所以它必须是到期的自动重载定时器 */
        vPrintStringAndNumber("Auto-reload timer callback executing", xTimeNow);
        if (ulExecutionCount == 5)
        {
            xTimerStop(xTimer, 0);  /* 第 5 次执行后停止定时器 */
        }
        /* 翻转输出绿色 LED */
        HAL_GPIO_TogglePin(GREEN_LED_GPIO_Port, GREEN_LED_Pin);
    }
}
```

**4. 要点分析**

- 定时器 ID 是空指针（void\*），可以存放任意数据（整数、结构体指针等）。
- pvTimerGetTimerID() / vTimerSetTimerID() 读写 ID；相同回调被多个定时器复用时，用 ID 区分各自上下文。
- 本实验用 ID 记录超时次数：自动重载定时器第 5 次到期时调用 xTimerStop() 停止自己。
- 句柄比较（xTimer == xOneShotTimer）也是区分定时器的常用手段。

## FreeRTOS定时器周期更改与重置实验

**1. 实验基础**

本案例模拟手机背光灯的行为，演示一次性定时器的“重置”用法。背光灯具有以下特点：

- 当按键被按下时，打开背光灯。
- 只要在一定时间内持续有按键被按下，背光灯就会保持亮起状态。
- 如果在一定时间内没有按键被按下，背光灯会自动熄灭。

**2. 案例中定时器的配置**

案例创建一次性定时器，配置如下：

| 配置项 | 一次性定时器 |
|-|-|
| 定时器名称 | xBacklightTimer |
| 回调的函数 | prvBacklightTimerCallback |
| 定时器类型 | osTimerOnce |
| 定时器参数 | NULL |

**3. 实现原理**

为了实现背光灯行为，使用一次性触发的软件定时器：

1. 当按键被按下时，打开背光灯（模拟），并且启动软件定时器：定时器到期时在回调函数中关闭背光灯。
2. 每次按键被按下时，软件定时器都会被重置——重新从完整周期开始计时。
3. 为了防止关闭背光灯，必须确保按下按键的时间段等于或小于软件定时器的周期；如果软件定时器在到期前没有按键按下重置它，那么定时器的回调函数会执行，关闭背光灯。

**4. 要点分析**

- 一次性定时器 + 每次事件重置 = “看门狗式”超时控制（事件持续刷新截止时间）。
- xTimerReset() 相当于重新启动：运行中的定时器从当前时刻重新计算完整周期。
- 该模式广泛用于按键消抖、操作超时、连接保活等场景。

# FreeRTOS信号量

## FreeRTOS中断管理与中断安全API

**1. 任务的优先级和中断的优先级**

区分任务的优先级和中断的优先级非常重要，原因如下：

- 任务是与 FreeRTOS 运行所在的硬件无关的软件功能。任务的优先级由编程人员在软件中分配，软件算法（即调度器）决定哪个任务将进入运行状态。
- 尽管中断服务程序由软件编写，但中断具备硬件特性，由硬件控制哪个中断服务程序将运行以及何时运行。只有在没有 ISR 运行时任务才会运行，因此最低优先级的中断也会中断最高优先级的任务，任务无法抢占 ISR。

运行 FreeRTOS 的所有架构都具备处理中断的能力，但与中断进入和中断优先级分配相关的细节，会因架构而有所不同。

**2. 中断安全 API**

通常需要在中断服务程序（ISR）中使用 FreeRTOS API 函数提供的功能，但许多 API 函数执行的操作在 ISR 内部是无效的。其中最显著的一点：将调用 API 函数的任务置于阻塞状态——如果 API 函数是从 ISR 调用的，就没有可以置于阻塞状态的调用任务。

FreeRTOS 通过提供具有两种版本的 API 函数来解决这个问题：

一种版本在任务中使用，另一种版本在 ISR 中使用；用于 ISR 的函数会在其名称后附加“FromISR”。

注意：不要在 ISR 中调用名称后面没有“FromISR”后缀的 FreeRTOS API 函数。

**3. 使用单独中断安全 API 的好处**

单独的 API 函数用于中断，可以提高任务代码的效率，也可以提高 ISR 代码的效率，并且中断入口更加简单。如果 API 函数的同一版本既可以从任务中调用，也可以从 ISR 中调用，会出现以下问题：

- API 函数将需要额外的逻辑来确定是由任务还是由 ISR 调用的，这些额外逻辑会使函数更复杂、更难测试。
- 当从任务中调用函数时，一些 API 参数将变得多余；当从 ISR 中调用时，其他一些参数也将变得多余。
- 每种 FreeRTOS 移植都需要提供用于确定执行上下文（任务或 ISR）的机制。在不容易确定执行上下文的架构上，将需要额外的、浪费的、更复杂的、非标准的中断入口代码。

**4. 使用单独中断安全 API 的缺点与解决**

有时需要从任务和 ISR 中调用不属于 FreeRTOS API 的函数，但该函数又使用了 FreeRTOS API。如果确实出现这个问题，可以使用以下技术解决：

- 将中断处理推迟到任务中进行，这样就只在任务的上下文中调用 API 函数。
- 如果使用的是支持中断嵌套的 FreeRTOS 移植，请使用以“FromISR”结尾的 API 函数——可以在任务和 ISR 中调用该函数（反之则不然，不能在 ISR 中调用不以“FromISR”结尾的 API 函数）。
- 第三方代码通常包含 RTOS 抽象层，可以对调用函数的上下文（任务或中断）进行测试，然后调用适合上下文的 API 函数。

**5. 参数 xHigherPriorityTaskWoken**

如果上下文切换是由中断执行的，那么当中断退出时，正在运行的任务可能与进入中断时正在运行的任务不同。如果被 FreeRTOS API 函数解除阻塞的任务的优先级高于正在运行任务的优先级，根据调度策略应该切换到优先级更高的任务。实际切换时间取决于调用上下文：

- 从任务中调用：如果 configUSE_PREEMPTION 设置为 1，切换到更高优先级的任务会在 API 函数中自动发生（API 函数退出之前）。
- 从中断中调用：切换不会在中断内部自动发生，取而代之的是设置一个变量来通知编程人员应该执行上下文切换——中断安全 API 函数有名为 pxHigherPriorityTaskWoken 的指针参数用于此目的：如果应该执行上下文切换，函数将把 \*pxHigherPriorityTaskWoken 设置为 pdTRUE。

要点：pxHigherPriorityTaskWoken 所指向的变量必须在使用之前初始化为 pdFALSE。如果 ISR 调用多个 FreeRTOS API 函数，每次调用都可以传递同一个变量作为参数，首次使用前只需初始化为 pdFALSE。

**6. 宏 portYIELD_FROM_ISR() 和 portEND_SWITCHING_ISR()**

taskYIELD() 是可以在任务中调用的宏，用于请求上下文切换。portYIELD_FROM_ISR() 和 portEND_SWITCHING_ISR() 是 taskYIELD() 的中断安全版本：

```c
portEND_SWITCHING_ISR(xHigherPriorityTaskWoken);
portYIELD_FROM_ISR(xHigherPriorityTaskWoken);
```

两者的用法相同、功能也相同；有些 FreeRTOS 移植只提供其中一个，较新的移植提供两个。可以把中断安全 API 函数传递出来的 xHigherPriorityTaskWoken 参数直接作为调用参数。该参数为 pdFALSE 时不会请求上下文切换，宏也不会起作用。

**7. 推迟中断处理**

通常认为，最好的做法是保持 ISR 尽量短小精悍，原因如下：

- 即使给任务分配很高的优先级，任务也只有在硬件没有服务中断的情况下才会运行。
- ISR 可能会破坏任务的启动时间和执行时间（增加“抖动”）。
- 取决于 FreeRTOS 运行的架构，在 ISR 执行期间可能无法接收任何新的中断，或至少无法接收新中断的子集。
- 需要考虑资源（如变量、外设和内存缓冲区）被任务和 ISR 同时访问的后果，并采取相应的保护措施。
- 一些 FreeRTOS 移植允许中断嵌套，但中断嵌套会增加复杂性并降低可预测性；中断越短，嵌套的可能性就越小。

推迟中断处理时序：1. 当中断发生时，Task1 正在运行；2. ISR 执行，处理产生中断的外设、清除中断，然后解除 Task2 的阻塞；3. Task2 的优先级高于 Task1，所以 ISR 直接返回到 Task2，在 Task2 中完成中断处理；4. Task2 进入阻塞状态，等待下一个中断，允许 Task1 重新进入运行状态。

## FreeRTOS二进制信号量基础概念

**1. 使用二进制信号量实现推迟中断处理**

可以使用二进制信号量 API 的中断安全版本，在每次发生特定中断时解除对任务的阻塞，从而有效地将任务与中断同步。这允许在同步任务中实现大部分的中断事件处理，而将非常快速和简短的部分直接保留在 ISR 中。

时序：

1. 当中断发生时，Task1 正在运行，而 Task2 在阻塞状态下等待信号量；

2. ISR 执行，处理产生中断的外设、清除中断，然后释放信号量以解除 Task2 的阻塞；

3. Task2 完成中断所需的进一步处理，然后阻塞在信号量上，等待被下一次中断再次解除阻塞。

如果中断处理始终优先，确保使用 portYIELD_FROM_ISR() 宏进行上下文切换。

**2. 信号量的获取与释放机制**

推迟处理任务使用对信号量的阻塞“获取”调用（xSemaphoreTake），来进入阻塞状态以等待事件发生。当事件发生时，ISR 对相同的信号量执行“归还”操作（xSemaphoreGiveFromISR），以解除对任务的阻塞，以便进行所需的事件处理。完整的循环如下：

- 信号量不可用时：任务调用 xSemaphoreTake() → 任务被阻塞，等待信号量。
- 信号量可用时：任务成功“获取”信号量 → 信号量再次变为不可用。
- 中断发生时：ISR 调用 xSemaphoreGiveFromISR() 释放信号量 → 解除任务的阻塞（信号量现在可用）。
- 任务执行其动作后，再次尝试“获取”信号量 → 任务重新进入阻塞状态。

**3. 函数 xSemaphoreCreateBinary()**

```c
SemaphoreHandle_t xSemaphore;  /* 信号量句柄 */

void vATask(void *pvParameters)
{
    /* 尝试创建一个信号量 */
    xSemaphore = xSemaphoreCreateBinary();
    if (xSemaphore == NULL)
    {
        /* FreeRTOS 的可用堆内存不足以成功创建信号量 */
    }
    else
    {
        /* 现在可以使用信号量了。在这个位置上，调用 xSemaphoreTake()
           获取信号量会失败，直到信号量首先被给出（归还） */
    }
}
```

**4. 函数 xSemaphoreTake()**

xSemaphoreTake() 用于获取（Take）信号量，可以指定等待超时时间（阻塞时间，单位滴答）：

```c
if (xSemaphoreTake(xSemaphore, (TickType_t)10) == pdTRUE)
{
    /* 成功获取信号量，现在可以访问共享资源了 */
    ...
    /* 完成访问后归还信号量 */
    xSemaphoreGive(xSemaphore);
}
else
{
    /* 无法获取信号量，无法安全地访问共享资源 */
}
```

如果信号量不可用，任务将阻塞等待最多 10 个滴答周期，看它是否变得可用。

**5. 函数 xSemaphoreGiveFromISR()**

中断安全的“归还”函数，在 ISR 中释放信号量：

```c
#define LONG_TIME 0xffff
#define TICKS_TO_WAIT 10

/* 定时器中断服务程序（ISR） */
void vTimerISR(void *pvParameters)
{
    static unsigned char ucLocalTickCount = 0;
    BaseType_t xHigherPriorityTaskWoken = pdFALSE;

    xHigherPriorityTaskWoken = pdFALSE;
    ucLocalTickCount++;
    if (ucLocalTickCount >= TICKS_TO_WAIT)
    {
        /* 通过归还信号量来解锁任务 */
        xSemaphoreGiveFromISR(xSemaphore, &xHigherPriorityTaskWoken);
        ucLocalTickCount = 0;
    }

    /* 如果 xHigherPriorityTaskWoken 为真，则让出 CPU */
    portYIELD_FROM_ISR(xHigherPriorityTaskWoken);
}
```

要点：当以这种方式使用信号量与中断服务程序进行同步时，无需“归还”信号量——同步任务每次被唤醒执行完动作后，直接再次 xSemaphoreTake() 阻塞等待即可。

## FreeRTOS二进制信号量配置实验

**1. 实验基础**

本案例用周期性任务触发中断，中断通过二进制信号量唤醒高优先级处理任务，演示“推迟中断处理”的标准模型。

**2. 案例中任务的配置**

案例创建任务，配置如下：

| 配置项 | 第一个任务 | 第二个任务 |
|-|-|-|
| 函数的名称 | Periodic | Task1 |
| 函数优先级 | osPriorityNormal | osPriorityNormal1 |
| 任务栈大小 | 128 | 128 |
| 函数的入口 | vPeriodicTask | vHandlerTask |
| 任务的参数 | NULL | NULL |

**3. 信号量的配置**

| 配置项 | 参数配置 |
|-|-|
| 信号量名称 | xBinarySemaphore |
| 初始状态 | Depleted（已耗尽） |
| 分配方式 | Dynamic |

说明：二进制信号量创建后默认“已耗尽”——任务 take 会阻塞，直到 ISR 先 give。

**4. 案例中任务的执行模式**

1. 大部分时间在运行空闲任务。每隔 500 毫秒，空闲任务就会被周期性任务抢占。
2. 周期性任务打印其第一条消息，然后强制中断，中断服务程序（ISR）立即执行。
3. ISR “释放”信号量，导致 vHandlerTask() 解除阻塞。然后，ISR 直接返回 vHandlerTask()，因为该任务是最高优先级的就绪状态任务。vHandlerTask() 打印其消息，然后再次回到阻塞状态等待下一个中断。
4. 周期性任务再次成为最高优先级的任务，打印其第二条消息，然后再次进入阻塞状态以等待下一个周期。这样就只剩下空闲任务能够运行了。

**5. 要点分析**

- vHandlerTask 优先级（osPriorityNormal1）高于 Periodic（osPriorityNormal），保证 ISR 退出后直接回到处理任务。
- 二进制信号量的“耗尽 → 释放 → 再耗尽”循环，对应中断事件的一次性通知。
- 周期性任务每 500ms 触发一次中断，处理任务只在中断到来时才运行——CPU 利用率高。

## FreeRTOS计数型信号量配置实验

**1. 实验基础**

本案例与 33 号实验结构相同，但使用计数型信号量（xCountingSemaphore），演示可累计多个事件的信号量用法。

**2. 案例中任务的配置**

案例创建任务，配置如下：

| 配置项 | 第一个任务 | 第二个任务 |
|-|-|-|
| 函数的名称 | Periodic | Task1 |
| 函数优先级 | osPriorityNormal | osPriorityNormal1 |
| 任务栈大小 | 128 | 128 |
| 函数的入口 | vPeriodicTask | vHandlerTask |
| 任务的参数 | NULL | NULL |

**3. 信号量的配置**

| 配置项 | 参数配置 |
|-|-|
| 信号量名称 | xCountingSemaphore |
| 最大计数值 | 10 |
| 初始计数值 | 0 |

**4. 计数型信号量要点**

- 计数型信号量维护一个计数值：xSemaphoreGive() 使计数值 +1（不超过最大值）；xSemaphoreTake() 使计数值 -1。
- 与二进制的区别：二进制信号量只有“0 / 1”两态，计数型可以累计多个未处理事件（例如记录中断发生了多少次）。
- 最大计数值限制信号量最多能累计的事件数；初始计数值通常设为 0（无事件待处理）或资源数量（资源管理场景）。

**5. 典型应用场景**

- 事件计数：多个中断/任务产生事件，处理任务一次处理一个，计数型信号量记录积压数量。
- 资源管理：初始计数值 = 可用资源数量，take 占用一个资源，give 归还一个资源。

# FreeRTOS中断延迟

## FreeRTOS推迟处理至守护任务实验

**1. 实验基础**

本案例演示“推迟中断处理至守护任务”：ISR 不直接完成处理，而是通过 xTimerPendFunctionCallFromISR() 把函数调用“挂起”到守护任务中执行。

**2. 案例中任务的配置**

案例创建任务，配置如下：

| 配置项 | 第一个任务 |
|-|-|
| 函数的名称 | Periodic |
| 函数优先级 | osPriorityLow |
| 任务栈大小 | 128 |
| 函数的入口 | vPeriodicTask |
| 任务的参数 | NULL |

注意事项：守护任务的优先级（configTIMER_TASK_PRIORITY，本例为 10）需要大于任务优先级；需要使能 xTimerPendFunctionCall（configUSE_TIMERS 为 1）。

**3. 案例中任务的执行模式**

1. 大部分时间在运行空闲任务，每隔 500 毫秒，空闲任务就会被周期性任务抢占。
2. 周期性任务打印其第一条消息，然后强制中断，中断服务程序立即执行。
3. 中断服务程序调用 xTimerPendFunctionCallFromISR() API 函数，向定时器命令队列写入，导致守护任务解除阻塞。然后中断服务程序直接返回守护任务，因为守护任务是最高优先级的就绪状态任务。守护任务打印其消息（包括递增的参数值），在返回阻塞状态之前，等待另一条消息到达定时器命令队列或者软件定时器过期。
4. 周期性任务再次成为最高优先级任务，打印其第二条消息，然后进入阻塞状态以等待下一个时间周期，这样就只剩下空闲任务能够运行。

**4. 要点分析**

- xTimerPendFunctionCallFromISR() 可以在 ISR 中“挂起”一个普通函数到守护任务上下文执行——允许在任务上下文（守护任务）中调用非 FromISR 的 API。
- 与信号量/队列不同，该机制不传递数据本身，而是传递“要执行的函数 + 参数”。
- 这解决了“第三方函数需要从任务和 ISR 调用”的问题：ISR 只做挂起，真正的调用都在任务上下文中完成。

## FreeRTOS在ISR中使用队列实验

**1. 实验基础**

本案例演示 ISR 中读写队列的中断安全用法（xQueueSendFromISR / xQueueReceiveFromISR），以及队列在中断与任务之间传递数据。

**2. 案例中任务的配置**

案例创建任务，配置如下：

| 配置项 | 第一个任务 | 第二个任务 |
|-|-|-|
| 函数的名称 | IntGen | String |
| 函数优先级 | osPriorityLow | osPriorityLow1 |
| 任务栈大小 | 128 | 128 |
| 函数的入口 | vIntegerGenerator | vStringPrinter |
| 任务的参数 | NULL | NULL |

**3. 队列的配置**

| 配置项 | 队列1配置 | 队列2配置 |
|-|-|-|
| 队列的名称 | xIntegerQueue | xStringQueue |
| 队列的长度 | 10 | 10 |
| 队列的元素大小 | uint32_t | char \* |

**4. 案例中任务的执行模式**

1. 大部分时间在运行空闲任务。每 200ms 空闲任务被 IntegerGenerator 任务抢占。
2. 整数产生任务向队列写入 5 个数值，然后强制中断。
3. 中断服务程序既从队列读取又向队列写入：为从另外队列接收的每个整数向队列写入一个字符串。向队列写入字符串解除了 StringPrinter 任务的阻塞。
4. StringPrinter 任务是最高优先级的任务，所以在中断服务程序之后立即运行。该任务打印通过队列接收到的每个字符串，当队列为空时就进入阻塞状态，允许低优先级的 IntegerGenerator 任务再次运行。
5. IntegerGenerator 任务是周期性任务，所以会阻塞以等待下一个时间周期，空闲任务再次成为唯一能够运行的任务。在空闲任务最后一次开始执行 200ms 后，整个执行顺序重复。

**5. 要点分析**

- ISR 中写队列用 xQueueSendFromISR()，读队列用 xQueueReceiveFromISR()，均带 xHigherPriorityTaskWoken 参数。
- 队列元素可以是任意数据类型（uint32_t、char\* 等），大小在创建时指定。
- StringPrinter 优先级高于 IntegerGenerator，保证 ISR 之后立即处理字符串。

## FreeRTOS的中断嵌套及注意事项

**1. 中断中使用队列的注意事项**

队列提供了一种简单且方便的方式，用于将数据从中断传递到任务中，但是，如果数据以高频率到达，使用队列则不是高效的。在演示程序中使用队列有两个原因：演示如何在 ISR 中使用队列；为了测试 FreeRTOS 移植而故意给系统增加负担。

适用于实际产品代码的更高效技术包括：

- 使用 DMA 硬件来接收和缓冲字符，这种方法几乎没有软件开销。然后可以使用直接任务通知来解除阻塞任务，该任务只有在检测到传输中断后才会处理缓冲区。
- 将接收到的字符复制到线程安全的 RAM 缓冲区。同样，可以使用直接任务通知来解除阻塞任务，该任务将在接收到完整的消息或检测到传输中断后处理缓冲区。
- 在中断服务程序（ISR）中直接处理接收到的字符，然后使用队列仅将数据处理结果发送到任务。

**2. 中断嵌套**

任务优先级和中断优先级之间常常会出现混淆：分配给任务的优先级与分配给中断的优先级没有任何关系。硬件决定何时执行 ISR，而软件决定何时执行任务。响应硬件中断而执行的 ISR 会中断任务，但任务不能抢占 ISR。FreeRTOS 控制中断嵌套的常量如下表所示。

| 常量 | 说明 |
|-|-|
| configMAX_SYSCALL_INTERRUPT_PRIORITY 或 configMAX_API_CALL_INTERRUPT_PRIORITY | 设置了可以从其中调用中断安全的 FreeRTOS API 函数的最高中断优先级。 |
| configKERNEL_INTERRUPT_PRIORITY | 设置滴答中断使用的中断优先级，并且必须始终设置为可能的最低中断优先级。如果正在使用的 FreeRTOS 移植没有使用 configMAX_SYSCALL_INTERRUPT_PRIORITY 常量，那么任何使用中断安全 API 函数的中断也必须以 configKERNEL_INTERRUPT_PRIORITY 定义的优先级执行。 |

**3. 优先级的含义和关系**

每个中断源都有一个数字优先级和一个逻辑优先级，两种优先级的含义和关系如下：

- 数字优先级：数字优先级就是分配给中断优先级的数字。例如，如果一个中断被分配了 7 的优先级，那么它的数字优先级就是 7。
- 逻辑优先级：中断的逻辑优先级描述了该中断相对于其他中断的优先级。如果两个优先级不同的中断同时发生，处理器将先执行具有更高逻辑优先级的中断的 ISR。
- 一个中断可以中断（嵌套）任何具有较低逻辑优先级的中断，但不能中断（嵌套）具有相同或更高逻辑优先级的中断。
- 中断的数字优先级和逻辑优先级之间的关系取决于处理器架构：在某些处理器上，分配给中断的数字优先级越高，该中断的逻辑优先级就越高；在其他架构上则相反。

**4. FreeRTOS 的中断嵌套行为**

```c
/* Cortex-M 特定定义。 */
#ifdef __NVIC_PRIO_BITS
/* 当使用 CMSIS 时，将指定 __NVIC_PRIO_BITS。 */
#define configPRIO_BITS __NVIC_PRIO_BITS
#else
#define configPRIO_BITS 4
#endif

/* 调用“设置优先级”函数时能够使用的最低中断优先级。 */
#define configLIBRARY_LOWEST_INTERRUPT_PRIORITY 15

/* 任何调用中断安全 FreeRTOS API 函数的中断服务例程能够使用的最高中断优先级。 */
#define configLIBRARY_MAX_SYSCALL_INTERRUPT_PRIORITY 5

/* 内核端口层本身使用的中断优先级。 */
#define configKERNEL_INTERRUPT_PRIORITY (configLIBRARY_LOWEST_INTERRUPT_PRIORITY << (8 - configPRIO_BITS))

/* !!! configMAX_SYSCALL_INTERRUPT_PRIORITY 绝不能设置为零 !!! */
#define configMAX_SYSCALL_INTERRUPT_PRIORITY (configLIBRARY_MAX_SYSCALL_INTERRUPT_PRIORITY << (8 - configPRIO_BITS))
```

把 configMAX_SYSCALL_INTERRUPT_PRIORITY 设置为比 configKERNEL_INTERRUPT_PRIORITY 更高的逻辑中断优先级，可以创建完整的中断嵌套模型。

# FreeRTOS互斥量

## FreeRTOS资源管理基础概念

**1. 资源的访问**

在多任务系统中，如果任务开始访问某个资源，但在完成访问之前被切换出运行状态，那么就有可能发生错误。如果任务使资源处于不一致的状态，那么其他任务或中断对同一资源的访问可能会导致数据损坏或其他类似问题。

LCD 示例：任务 A 开始向 LCD 写入“Hello world”，输出到“Hello w”后被任务 B 抢占；任务 B 在进入阻塞状态之前向 LCD 写入“Abort, Retry, Fail?”；任务 A 从被抢占的位置继续执行，输出剩余字符“orld”——现在 LCD 上显示的是损坏的字符串“Hello wAbort, Retry, Fail?orld”。

**2. 读取、修改、写入操作**

```c
/* 正在编译的 C 代码 */
PORTA |= 0x01;

/* 当 C 代码被编译时产生的汇编代码 */
LOAD R1,[#PORTA];   /* 从 PORTA 读取端口值到 R1 寄存器 */
MOVE R2,#0x01;      /* 将绝对常量 1 移动到 R2 寄存器 */
OR   R1,R2;         /* 对 R1（PORTA）和 R2（常量1）进行按位或运算 */
STORE R1,[#PORTA];  /* 将新值存回 PORTA */
```

这是一个“非原子”操作，因为需要多条指令才能完成，并可能被中断。假设任务 B 在第 7 行代码处抢占该任务并修改了 PORTA 寄存器的值，则会产生问题。

**3. 变量的非原子访问与函数重入性**

- 更新结构体中的多个成员，或者更新大于架构字大小的变量（例如在 16 位机器上更新 32 位的变量），都是非原子操作的例子。如果这些操作被中断，可能会导致数据丢失或损坏。
- 函数重入性：如果函数可以安全地在多个任务中调用，或者既可以从任务中又可以从中断中安全地调用，那么该函数就是“可重入的”。可重入函数被认为是“线程安全”的，因为它们可以从多个执行线程中访问，而不会导致数据或逻辑操作损坏的风险。
- 每个任务都维护着自己的栈和一套处理器（硬件）寄存器值。如果函数只访问存储在栈上或保存在寄存器中的数据，而不访问其他数据，那么该函数就是可重入的。

```c
long lVar1;   /* 全局变量：每个调用 lNonsenseFunction 的任务都访问同一副本 */
long lNonsenseFunction(void)
{
    static long lState = 0;  /* 静态变量：不会被分配到栈上，同样共享同一副本 */
    long lReturn;
    switch (lState)
    {
        case 0: lReturn = lVar1 + 10; lState = 1; break;
        case 1: lReturn = lVar1 + 20; lState = 0; break;
    }
    return lReturn;
}
```

**4. 临界区与暂停调度器**

临界区是一个访问共用资源（例如共用设备或共用存储器）的程序片段，这些资源无法同时被多个任务访问。当任务进入临界区时，其他任务必须等待，以确保这些共用资源是互斥获得的。

- 暂停调度器通常与临界区操作相关。当需要确保某个代码段在执行时不会被其他任务或中断打断时，可以暂停调度器。好处是代码段在执行期间不会被高优先级任务抢占；但需要注意的是，暂停调度器并不关闭任何中断，所以中断仍然可以正常执行。
- 在临界区中使用暂停调度器时，需要特别注意代码段的长度。临界区中的代码应该尽可能短小，否则可能会影响系统的实时性。

FreeRTOS 实现临界区操作有临界段操作和调度器操作两种方法。

**5. 基本的临界区**

基本临界区是指分别由调用 taskENTER_CRITICAL() 宏和 taskEXIT_CRITICAL() 宏所包围起来的代码区域，临界区也被称为关键区域。两个宏不接受任何参数，也没有返回值，用法如下：

```c
/* 进入临界区：确保在临界区内访问 PORTA 寄存器时不会被中断 */
taskENTER_CRITICAL();

/* 在调用 taskENTER_CRITICAL() 和 taskEXIT_CRITICAL() 之间，不会发生切换到另一个任务的情况 */
PORTA |= 0x01;

/* 对 PORTA 的访问已经完成，现在可以安全地退出临界区 */
taskEXIT_CRITICAL();
```

基本的临界区工作方式是禁用中断，这取决于 FreeRTOS 移植：可以是完全禁用中断，或者禁用到由 configMAX_SYSCALL_INTERRUPT_PRIORITY 设定的中断优先级。原理：抢占式的上下文切换只能在中断内部发生，因此只要将中断保持在禁用状态，调用 taskENTER_CRITICAL() 的任务就保证会保持在运行状态，直到退出临界区。

使用临界区的注意事项：

- 基本临界区必须保持短小，否则将对中断响应时间产生不利影响。每次调用 taskENTER_CRITICAL() 都必须与 taskEXIT_CRITICAL() 的调用紧密配对。
- 临界区可以嵌套，内核会跟踪嵌套的深度。只有当嵌套深度返回到零时，临界区才会退出。
- 调用 taskENTER_CRITICAL() 宏和 taskEXIT_CRITICAL() 宏是任务改变处理器中断使能状态的唯一合法方式。通过其他方式改变中断使能状态将导致宏的嵌套计数失效。

**6. ISR 中的临界区**

```c
void vAnInterruptServiceRoutine(void)
{
    /* 声明变量，保存 taskENTER_CRITICAL_FROM_ISR() 的返回值 */
    UBaseType_t uxSavedInterruptStatus;

    /* ISR 的这一部分可以被任何更高优先级的中断打断 */

    uxSavedInterruptStatus = taskENTER_CRITICAL_FROM_ISR();
    /* 此处位于两个调用之间，只能被优先级高于
       configMAX_SYSCALL_INTERRUPT_PRIORITY 设定的中断打断 */

    taskEXIT_CRITICAL_FROM_ISR(uxSavedInterruptStatus);

    /* ISR 的这一部分可以被任何更高优先级的中断打断 */
}
```

**7. 暂停调度器**

可以通过暂停调度器来创建临界区，暂停调度器有时也被称为“锁定”调度器。基本的临界区保护代码不被其他任务和中断访问；通过暂停调度器实现的临界区，仅保护代码区域不被其他任务访问，因为中断是保持使能的。如果临界区太长，无法通过简单的禁用中断来实现，那么可以通过暂停调度器来实现。然而，当调度器被暂停时，中断活动可能使恢复调度器成为一个相对较长的操作。

```c
void vPrintString(const char *pcString)
{
    /* 将字符串写入标准输出，通过挂起调度器实现互斥 */
    vTaskSuspendScheduler();
    {
        printf("%s", pcString);
        fflush(stdout);
    }
    xTaskResumeScheduler();
}
```

**8. 互斥量**

两个任务都想访问资源，但是不允许任务访问，除非该任务是互斥量（令牌）的持有者。完整流程：

- TaskA 试图获取互斥量（xSemaphoreTake）。因为互斥量可用，TaskA 成功成为互斥量持有者，被允许访问资源。
- TaskB 执行并试图获取相同的互斥量。TaskA 仍然持有互斥量，所以尝试失败，不允许 TaskB 访问受保护的资源。
- TaskA 归还互斥量（xSemaphoreGive）导致 TaskB 退出阻塞状态（互斥量现在可用）。TaskB 现在能够成功获取互斥量，得到互斥量后被允许访问资源。
- 当 TaskB 访问完资源后，归还互斥量。现在互斥量对两个任务都是可用的。

在使用互斥量之前，必须先创建。要创建一个互斥量类型的信号量，可以使用 xSemaphoreCreateMutex() API 函数。互斥量是一种类型的信号量，所有不同类型的 FreeRTOS 信号量的句柄都存储在类型为 SemaphoreHandle_t 的变量中。

```c
void prvNewPrintString(const char *pcString)
{
    /* 尝试获取互斥锁，如果互斥锁不可用，则无限期地阻塞等待 */
    xSemaphoreTake(xMutexHandle, portMAX_DELAY);
    {
        /* 只有当互斥锁成功获取后，下面的代码行才会执行。
           因为现在一次只有一个任务可以持有互斥锁，
           所以此时可以自由访问 UART 输出 */
        printf("%s", pcString);
    }
    /* 归还互斥锁，使其他任务可以访问 UART 输出 */
    xSemaphoreGive(xMutexHandle);
}
```

## FreeRTOS互斥量使用实验

**1. 实验基础**

本案例演示互斥量保护共享资源（UART 输出）：两个打印任务竞争同一互斥量，保证字符串不会被交错输出。

**2. 案例中任务的配置**

案例创建任务，配置如下：

| 配置项 | 第一个任务 | 第二个任务 |
|-|-|-|
| 函数的名称 | Print1 | Print2 |
| 函数优先级 | osPriorityLow | osPriorityLow1 |
| 任务栈大小 | 128 | 128 |
| 函数的入口 | prvPrintTask | prvPrintTask |
| 任务的参数 | (void \*)pcTextForTask1 | (void \*)pcTextForTask2 |

**3. 互斥量的配置**

| 配置项 | 参数配置 |
|-|-|
| 互斥量名称 | xMutex |

**4. 案例中任务的执行模式**

1. Task1 的延时时间结束，所以 Task1 抢占了空闲任务。
2. Task1 获取互斥量并开始输出其字符串。在输出整个字符串之前，Task1 被优先级更高的 Task2 抢占。
3. Task2 试图获取互斥量，但互斥量仍被 Task1 持有，所以 Task2 进入阻塞状态，允许 Task1 再次执行。
4. Task1 输出其字符串，然后归还互斥量，导致 Task2 退出阻塞状态。Task2 再次抢占 Task1。
5. Task2 输出其字符串，归还信号量，然后进入阻塞状态，等待下一次执行时间。这允许 Task1 再次运行，Task1 也进入阻塞状态，等待下一次执行时间，只留下空闲任务在运行。

**5. 要点分析**

- 两个任务共用同一个任务入口 prvPrintTask，通过任务参数 (void \*)pcTextForTask1 / (void \*)pcTextForTask2 区分要打印的内容。
- 互斥量保证一次只有一个任务持有并访问 UART，输出不会交错。
- 优先级更高的 Task2 即便抢占成功，也必须在获取到互斥量后才能输出——体现“资源保护优先于任务优先级”。

## FreeRTOS互斥量相关问题概述

**1. 优先级反转**

高优先级的 Task2（HP）必须等待低优先级的 Task1（LP）放弃对互斥量的控制。这种高优先级任务被低优先级任务延迟的情况被称为“优先级反转”。

无优先级继承时的过程：

1. LP 任务在被 HP 任务抢占之前，LP 任务获取了互斥量。
2. HP 任务试图获取信号量，但却不能，因为互斥量仍被 LP 任务持有。HP 任务进入阻塞状态，以等待又可用的互斥量。
3. LP 任务继续执行，但在归还互斥量之前，被 MP 任务抢占。
4. 现在 MP 任务在运行。HP 任务还在等待 LP 任务归还互斥量，但 LP 任务根本没有执行。

**2. 优先级继承**

互斥量（而非二进制信号量）提供优先级继承机制，过程如下：

1. LP 任务在被 HP 任务抢占前获取了互斥量。
2. HP 任务试图获取互斥量但没有成功，因为互斥量仍被 LP 任务持有。HP 任务进入阻塞状态以等待有可用的互斥量。
3. LP 任务阻止 HP 任务执行，所以继承了 HP 任务的优先级。LP 任务不能被 MP 任务抢占，所以优先级反转的总时间是最小的；当 LP 任务归还互斥量时，就返回其最初的优先级。
4. LP 任务归还互斥量导致 HP 任务作为互斥量持有者退出阻塞状态。当 HP 任务使用完互斥量时，归还该互斥量。MP 任务仅在 HP 任务返回阻塞状态时才执行，所以 MP 任务永远不会阻止 HP 任务。

**3. 死锁**

“死锁”是使用互斥量实现互斥访问时可能面临的另一个潜在陷阱。当两个任务都在等待对方持有的资源，而无法继续执行时，就会发生死锁。考虑以下场景：任务 A 和任务 B 都需要获取互斥量 X 和互斥量 Y 才能执行某个操作：

1. 任务 A 执行并成功获取互斥量 X。
2. 任务 A 被任务 B 抢占。
3. 任务 B 尝试获取互斥量 X 之前成功获取了互斥量 Y，但互斥量 X 被任务 A 持有，因此任务 B 无法获取。任务 B 选择进入阻塞状态以等待互斥量 X 被归还。
4. 任务 A 继续执行。它尝试获取互斥量 Y，但互斥量 Y 被任务 B 持有，因此任务 A 无法获取。任务 A 选择进入阻塞状态以等待互斥量 Y 被归还。

在这个场景中，任务 A 正在等待任务 B 持有的互斥量，而任务 B 正在等待任务 A 持有的互斥量。死锁已经发生，因为两个任务都无法继续执行。

**4. 递归互斥量**

任务也有可能与自己发生死锁。这种情况会发生在任务尝试多次获取同一个互斥量，而没有先归还该互斥量时。例如：任务成功获取互斥量后调用了一个库函数，而库函数的实现尝试获取同一个互斥量，并进入阻塞状态以等待互斥量变得可用。

这种死锁可以通过使用递归互斥量代替标准互斥量来避免。递归互斥量可以被同一个任务多次“获取”，并且只有在对每次先执行的“获取”调用都执行对应的“归还”调用后，才会被归还。

| 函数 | 用途 |
|-|-|
| xSemaphoreCreateMutex() | 创建标准互斥量 |
| xSemaphoreCreateRecursiveMutex() | 创建递归互斥量 |
| xSemaphoreTake() | “获取”标准互斥量 |
| xSemaphoreTakeRecursive() | “获取”递归互斥量 |
| xSemaphoreGive() | “归还”标准互斥量 |
| xSemaphoreGiveRecursive() | “归还”递归互斥量 |

**5. 守门（Gatekeeper）任务**

守门任务模式：只有一个任务（守门任务）被允许直接访问共享资源（如 UART），其他任务不直接访问资源，而是把要输出的消息通过队列发送给守门任务。因为只有一个任务写入标准输出，所以守门任务本身内部不需要考虑互斥或序列化问题。

```c
void prvStdioGatekeeperTask(void *pvParameters)
{
    char *pcMessageToPrint;

    /* 这是唯一被允许写入 UART 输出的任务。
       任何其他想要写入输出的任务都不会直接访问 UART，
       而是将输出发送给此任务。 */

    for (;;)
    {
        /* 等待消息到达 */
        xQueueReceive(xPrintQueueHandle, &pcMessageToPrint, portMAX_DELAY);

        /* 不需要检查返回值，因为任务会无限期地阻塞，
           并且只有在消息到达时才会再次运行 */
        printf("%s", pcMessageToPrint);

        /* 返回等待下一条消息 */
    }
}
```

## FreeRTOS守门任务访问资源实验

**1. 实验基础**

本案例演示“守门任务”模式：打印任务不直接访问 UART，而是把消息通过队列发送给唯一的守门任务，由守门任务统一输出，从根本上避免资源竞争。

**2. 案例中任务的配置**

案例创建任务，配置如下：

| 配置项 | 第一个任务 | 第二个任务 | 第三个任务 |
|-|-|-|-|
| 函数的名称 | Print1 | Print2 | Gatekeeper |
| 函数优先级 | osPriorityLow1 | osPriorityLow2 | osPriorityLow |
| 任务栈大小 | 128 | 128 | 128 |
| 函数的入口 | prvPrintTask | prvPrintTask | prvStdioGatekeeperTask |
| 任务的参数 | (void \*)0 | (void \*)1 | NULL |

**3. 队列的配置**

| 配置项 | 参数配置 |
|-|-|
| 队列的名称 | xPrintQueue |
| 队列的长度 | 5 |
| 队列的元素大小 | char \* |

**4. 要点分析**

- 守门任务优先级（osPriorityLow）低于两个打印任务：打印任务负责生产消息，守门任务负责消费输出，避免互斥量带来的优先级反转/死锁问题。
- 两个打印任务共用 prvPrintTask 入口，通过参数 (void \*)0 / (void \*)1 区分文本。
- 守门模式适用于“资源访问者众多、且每次访问很短暂”的场景——把资源访问串行化到单一任务中。

# FreeRTOS事件组

## FreeRTOS事件组相关概念

**1. 事件组与事件位**

事件组是 FreeRTOS 的另一个特性，允许将事件传达给任务。事件组与队列和信号量的区别如下：

- 事件组允许任务在阻塞状态下等待一个或多个事件组合的发生。
- 事件发生时，事件组会解除所有等待相同事件或事件组合的任务的阻塞状态。

这些独特属性使得事件组在以下场景非常有用：同步多个任务、向多个任务广播事件、允许任务在阻塞状态下等待一组事件中的某个事件发生、允许任务在阻塞状态下等待多个操作完成。事件组还提供了降低应用程序使用 RAM 的机会，通常可以将多个二进制信号量替换为一个事件组。

**2. 事件组、事件标志和事件位**

事件“标志”是一个布尔值（1 或 0），用于指示某个事件是否已发生。事件“组”是一组事件标志的集合。编程人员需要为事件组中的各个位分配意义。

- 事件标志只能是 1 或 0，因此事件标志的状态可以存储在一个位中，而事件组中所有事件标志的状态则可以存储在一个变量中。
- 事件组中每个事件标志的状态由 EventBits_t 类型变量中的一个位表示，因此事件标志也被称为事件“位”。
- 如果 EventBits_t 变量中的某一位被设置为 1，则表示由该位所代表的事件已发生；被设置为 0，则表示未发生。

例如：事件组的值为 0x92，那么只有事件位 1、4 和 7 被设置，同时代表事件发生。

**3. EventBits_t 数据类型的更多信息**

FreeRTOSConfig.h 中 configTICK_TYPE_WIDTH_IN_BITS 编译时配置常量的设置影响事件组中的事件位数：

| configTICK_TYPE_WIDTH_IN_BITS 取值 | 每个事件组的可用事件位数 |
|-|-|
| TICK_TYPE_WIDTH_16_BITS | 8 个可用的事件位 |
| TICK_TYPE_WIDTH_32_BITS | 24 个可用的事件位 |
| TICK_TYPE_WIDTH_64_BITS | 56 个可用的事件位 |

**4. 函数 xEventGroupCreate()**

```c
/* 声明 EventGroupHandle_t 类型的变量来保存创建的事件组 */
EventGroupHandle_t xCreatedEventGroup;

/* 尝试创建事件组 */
xCreatedEventGroup = xEventGroupCreate();

/* 事件组是否创建成功？ */
if (xCreatedEventGroup == NULL)
{
    /* 事件组未创建，因为 FreeRTOS 可用的堆内存不足 */
}
```

**5. 函数 xEventGroupSetBits()**

xEventGroupSetBits() API 函数用于在事件组中设置一个或多个位，通常用于通知任务：任务所设置的位或位组表示的事件已经发生。

注意：不要在中断服务程序中调用 xEventGroupSetBits() API 函数，应该使用中断安全版本的 xEventGroupSetBitsFromISR() API 函数来代替。

```c
#define BIT_0 (1 << 0)
#define BIT_4 (1 << 4)

void aFunction(EventGroupHandle_t xEventGroup)
{
    EventBits_t uxBits;

    /* 在 xEventGroup 中设置位 0 和位 4 */
    uxBits = xEventGroupSetBits(xEventGroup, BIT_0 | BIT_4);
    if ((uxBits & (BIT_0 | BIT_4)) == (BIT_0 | BIT_4))
    {
        /* 当函数返回时，位 0 仍然被设置，但位 4 被清除了。
           这可能是因为等待位 4 的任务被从阻塞状态移除后，位 4 被自动清除了 */
    }
    else if ((uxBits & BIT_4) != 0)
    {
        /* 当函数返回时，位 4 仍然被设置，但位 0 被清除了 */
    }
    else
    {
        /* 位 0 和位 4 都没有被设置。
           这可能是因为有一个任务正在等待这两个位都被设置，
           当这个任务离开阻塞状态时，这两个位被清除了 */
    }
}
```

**6. 函数 xEventGroupSetBitsFromISR()**

| 参数名称 | 参数说明 |
|-|-|
| xEventGroup | 设置位的事件组的句柄，从 xEventGroupCreate() 调用中返回。 |
| uxBitsToSet | 位掩码，用于指定在事件组中需要设置为 1 的事件位或事件位组。事件组的值通过按位或操作更新（现有值与 uxBitsToSet 按位或）。 |
| pxHigherPriorityTaskWoken | 如果函数将此值设置为 pdTRUE，那么在退出中断之前应该执行上下文切换。 |
| 返回值 | 只有当数据成功发送到定时器命令队列时，才会返回 pdPASS。如果因为队列已满，“设置位”命令无法写入定时器命令队列，则返回 pdFALSE。 |

注意事项：

- 从中断服务程序中设置事件位会将设置操作推迟到 RTOS 守护任务（定时器服务任务）。RTOS 守护任务与其他 RTOS 任务一样按优先级调度，因此如果置位操作必须立即完成，RTOS 守护任务的优先级必须要高于其他使用事件组的任务。
- RTOS 守护任务的优先级由 configTIMER_TASK_PRIORITY 在 FreeRTOSConfig.h 中定义。
- INCLUDE_xEventGroupSetBitFromISR、configUSE_TIMERS 和 INCLUDE_xTimerPendFunctionCall 必须在 FreeRTOSConfig.h 中全部被设置为 1，才能使用 xEventGroupSetBitsFromISR() 函数。

**7. 函数 xEventGroupWaitBits()**

xEventGroupWaitBits() API 函数允许任务读取事件组的值，并且如果事件位尚未设置，则可以选择在阻塞状态下等待事件组中的一个或多个事件位被设置。

```c
EventBits_t xEventGroupWaitBits(EventGroupHandle_t xEventGroup,
                                const EventBits_t uxBitsToWaitFor,
                                const BaseType_t xClearOnExit,
                                const BaseType_t xWaitForAllBits,
                                TickType_t xTicksToWait);
```

调度器用来确定任务是否将进入阻塞状态、以及任务何时离开阻塞状态的条件被称为“解除阻塞条件”。解除阻塞条件由 uxBitsToWaitFor 和 xWaitForAllBits 参数值的组合指定：uxBitsToWaitFor 指定要测试的事件组中的哪些事件位；xWaitForAllBits 指定是使用按位或测试（任一被设置即可）还是按位与测试（全部被设置才行）。

| 事件组现有值 | uxBitsToWaitFor 值 | xWaitForAllBits 值 | 由此导致的行为 |
|-|-|-|-|
| 0000 | 0101 | pdFALSE | 调用任务将进入阻塞状态，因为事件组中既没有设置位 0 也没有设置位 2；当事件组中设置了位 0 或位 2 时，将离开阻塞状态。 |
| 0100 | 0101 | pdTRUE | 调用任务将进入阻塞状态，因为位 0 和位 2 没有同时设置；当事件组中同时设置了位 0 与位 2 时，将离开阻塞状态。 |
| 0100 | 0110 | pdFALSE | 调用任务不会进入阻塞状态，因为 xWaitForAllBits 是 pdFALSE，并且由 uxBitsToWaitFor 指定的两个位中已经有一个在事件组中设置了。 |
| 0100 | 0110 | pdTRUE | 调用任务将进入阻塞状态，因为 xWaitForAllBits 是 pdTRUE，并且指定的两个位中只有一个已经设置。当事件组中同时设置了位 1 与位 2 时，任务将离开阻塞状态。 |

## FreeRTOS事件组配置实验

**1. 实验基础**

本案例创建三个任务配合一个事件组：BitSetter 任务设置事件位，BitReader 任务读取/等待事件位，IntGen 任务产生整数，演示事件组在任务之间传递事件。

**2. 案例中任务的配置**

案例创建任务，配置如下：

| 配置项 | 第一个任务 | 第二个任务 | 第三个任务 |
|-|-|-|-|
| 函数的名称 | BitSetter | BitReader | IntGen |
| 函数优先级 | osPriorityLow1 | osPriorityLow2 | osPriorityLow3 |
| 任务栈大小 | 128 | 128 | 128 |
| 函数的入口 | vEventBitSettingTask | vEventBitReadingTask | vIntegerGenerator |
| 任务的参数 | NULL | NULL | NULL |

**3. 事件组的配置**

| 配置项 | 参数配置 |
|-|-|
| 事件组名称 | xEventGroup |

**4. 要点分析**

- BitReader 优先级（osPriorityLow2）高于 BitSetter（osPriorityLow1）：事件位一旦被设置，读取任务立即被唤醒执行。
- IntGen 优先级最低（osPriorityLow3），作为事件来源周期性产生数据/事件。
- 事件组可以实现“一对多”广播：一个任务设置位，多个等待该位的任务同时解除阻塞。

## FreeRTOS事件组同步任务实验

**1. 实验基础**

本案例演示事件组的“同步”（会合）用法：三个任务分别完成各自工作后，等待其他任务也完成，全部到达后再一起继续执行。

**2. 案例中任务的配置**

案例创建任务，配置如下：

| 配置项 | 第一个任务 | 第二个任务 | 第三个任务 |
|-|-|-|-|
| 函数的名称 | Task1 | Task2 | Task3 |
| 函数优先级 | osPriorityLow1 | osPriorityLow1 | osPriorityLow1 |
| 任务栈大小 | 128 | 128 | 128 |
| 函数的入口 | vSyncingTask | vSyncingTask | vSyncingTask |
| 任务的参数 | (void \*)mainFIRST_TASK_BIT | (void \*)mainSECOND_TASK_BIT | (void \*)mainTHIRD_TASK_BIT |

**3. 事件组的配置**

| 配置项 | 参数配置 |
|-|-|
| 事件组名称 | xEventGroup |

**4. 同步（会合）机制**

三个任务共用同一个入口 vSyncingTask，各自通过任务参数持有自己的事件位：

1. 每个任务执行自己的工作（如打印自身标识）。
2. 完成后设置自己的事件位（如 xEventGroupSetBits(xEventGroup, 自己的位)）。
3. 然后调用 xEventGroupWaitBits() 等待所有三个事件位都被设置（xWaitForAllBits = pdTRUE），可配合 xClearOnExit 在退出时清除位。
4. 只有三个任务都到达后，所有任务才会一起解除阻塞——这就是“同步”：谁先完成谁等待，全部到齐才放行。

**5. 要点分析**

- 与二进制信号量不同，事件组让多个任务在同一事件组合上会合，天然支持“多任务同步”。
- 任务参数 (void \*)mainFIRST_TASK_BIT 等把“各自的事件位”传给共用入口，任务代码只需写一份。
- 该模式可用于周期性任务“栅栏”（barrier）同步、流水线阶段同步等场景。

# FreeRTOS任务通知

## FreeRTOS任务通知

**1. 使用任务通知在任务间通信**

当使用通信对象时，事件和数据不会直接发送给接收任务或接收的中断服务程序，而是发送给通信对象；同样，任务和 ISR 从通信对象接收事件和数据，而不是直接从发送方接收。

“**任务通知**”允许任务与其他任务进行交互、并与中断服务程序（ISR）进行同步，而无需单独的通信对象——任务或 ISR 可以直接将事件发送给接收任务（中间没有通信对象）。

**2. 任务通知的优势**

- 使用任务通知向任务发送事件或数据所需的 RAM 显著少于使用队列、信号量或事件组执行等效操作所需的 RAM。
- 每个通信对象（队列、信号量或事件组）在使用之前都必须被创建，而启用任务通知功能的开销是固定的。
- 任务通知的 RAM 大小由配置常量 configTASK_NOTIFICATION_ARRAY_ENTRIES \* 5 字节设置。configTASK_NOTIFICATION_ARRAY_ENTRIES 的默认值是 1，因此任务通知的默认大小是每个任务 5 字节。

**3. 任务通知的局限性**

**任务通知比通信对象更快且使用更少的 RAM**，但并非在所有场景中都能使用。**无法使用任务通知的场景**：

- 发送事件或数据到 ISR：任务通知可用于从 ISR 向任务发送事件和数据，但不能用于从任务向 ISR 发送事件或数据。
- 启用多个接收任务：任何知道通信对象句柄的任务或 ISR 都可以访问通信对象；而任务通知直接发送到接收任务，因此只能由接收通知的任务处理。
- 缓冲多个数据项：任务通知通过更新接收任务的通知值来向任务发送数据，而任务的通知值一次只能保持一个值。
- 向多个任务广播：事件组可以同时向多个任务发送事件；任务通知只能由接收任务处理。
- 在阻塞状态下等待发送完成：如果任务尝试向已经有待定通知的任务发送任务通知，发送任务无法在阻塞状态下等待接收任务重置其通知状态。

**4. 函数 xTaskNotifyGive()**

每个任务都有一组“任务通知”，每个通知都包含状态和一个 32 位值。直达任务通知是直接发送至任务的事件，可以取消阻塞接收任务，并可以选择通过多种方式更新接收任务的某个通知值。

| 参数名称 | 参数说明 |
|-|-|
| xTaskToNotify | 接收通知的 RTOS 任务的句柄，通知值会递增。 |
| uxIndexToNotify | **目标任务通知值数组中要发送通知的索引**。xTaskNotifyGive() 没有该参数，并总将通知发送到索引 0。uxIndexToNotify 必须小于 configTASK_NOTIFICATION_ARRAY_ENTRIES。 |
| 返回值 | xTaskNotifyGive() 实际上是调用 xTaskNotify() API 函数的宏，参数被设置为只能返回 pdPASS 的返回值。 |

**5. 函数 vTaskNotifyGiveFromISR()**

vTaskNotifyGiveFromISR() 是 xTaskNotifyGive() 的中断安全版本，可以在中断服务程序中使用。

```c
void vTaskNotifyGiveFromISR(TaskHandle_t xTaskToNotify,
                            BaseType_t *pxHigherPriorityTaskWoken);
```

| 参数名称 | 参数说明 |
|-|-|
| xTaskToNotify | 接收通知的 RTOS 任务的句柄，通知值会递增。 |
| pxHigherPriorityTaskWoken | 如果调用导致任务离开阻塞状态，且解除阻塞的任务优先级高于当前正在执行的任务（被中断的任务）的优先级，那么函数会将 \*pxHigherPriorityTaskWoken 设置为 pdTRUE，退出中断之前应该执行上下文切换。 |

**6. 函数 ulTaskNotifyTake()**

ulTaskNotifyTake() 允许任务在阻塞状态下等待，直到其通知值大于 0。在返回之前，该函数可以将任务的通知值递减（减 1）或者清除。

| 参数名称 | 参数说明 |
|-|-|
| xClearCountOnExit | 设置为 pdTRUE 时，返回前调用任务的通知值将被清零；设置为 pdFALSE 且通知值大于 0 时，返回前通知值将被递减。 |
| xTicksToWait | 调用任务在阻塞状态下等待其通知值大于 0 的最长时间。 |
| uxIndexToWaitOn | 调用任务在其通知值数组中的哪个索引上等待通知变为非 0。xTaskNotifyTake() 没有该参数，总是在索引 0 处等待。 |
| 返回值 | 返回值是调用任务的通知值在清零或递减之前的值，由 xClearCountOnExit 参数决定。 |

**7. 函数 xTaskNotify() 和 xTaskNotifyFromISR()**

xTaskNotify() 是 xTaskNotifyGive() 的更强大版本，可以通过以下任意方式更新接收任务的通知值：

- 递增（加 1）接收任务的通知值，此时相当于 xTaskNotifyGive()。
- 在接收任务的通知值中设置一个或多个位——允许任务的通知值用作事件组的更轻量且更快的替代方案。
- 将一个全新的数字写入接收任务的通知值，但仅在接收任务自上次更新以来已经读取了其通知值的情况下才进行——提供与长度为 1 的队列类似的功能。
- 将一个全新的数字写入接收任务的通知值，即使接收任务自上次更新以来尚未读取其通知值也进行。

```c
BaseType_t xTaskNotify(TaskHandle_t xTaskToNotify,
                       uint32_t ulValue,
                       eNotifyAction eAction);

BaseType_t xTaskNotifyFromISR(TaskHandle_t xTaskToNotify,
                              uint32_t ulValue,
                              eNotifyAction eAction,
                              BaseType_t *pxHigherPriorityTaskWoken);
```

| 参数名称 | 参数说明 |
|-|-|
| xTaskToNotify | 任务句柄，将通知发往该句柄引用的任务。 |
| ulValue | ulValue 的使用方式取决于 eNotifyAction 的值。 |
| eNotifyAction | 枚举类型，用于指定如何更新接收任务的通知值。 |
| 返回值 | xTaskNotify() 将返回 pdPASS，但以下列出的一个例外情况除外。 |

**8. eNotifyAction 参数值及其影响**

| eNotifyAction 参数值 | 对接收任务通知值的影响 |
|-|-|
| eNoAction | **将接收任务的通知状态设置为待定，任务通知值不会被更新**。uValue 参数不会被使用。 |
| eSetBits | **接收任务的通知值将与 uValue 参数中传递的值进行按位或（OR）运算**。例如 uValue 为 0x01 时第 0 位被设置；uValue 为 0x06（二进制 0110）时第 1 位和第 2 位被设置。 |
| eIncrement | **接收任务的通知值将被增加**。uValue 参数在这里不会被使用。 |
| eSetValueWithoutOverwrite | 如果在调用之前接收任务已经有待处理的通知，则不采取任何行动并返回 pdFAIL；如果没有待处理的通知，通知值将被设置为 uValue 中传递的值。 |
| eSetValueWithOverwrite | 无论接收任务在调用之前是否已有待处理的通知，通知值都将被设置为 uValue 中传递的值。 |

**9. 函数 xTaskNotifyWait() 和 xTaskNotifyWaitIndexed()**

两者是等效宏，唯一区别是 xTaskNotifyWaitIndexed() 可以在数组内的任何任务通知上运行，而 xTaskNotifyWait() 始终在数组索引 0 处的任务通知上运行。

```c
BaseType_t xTaskNotifyWait(uint32_t ulBitsToClearOnEntry,
                           uint32_t ulBitsToClearOnExit,
                           uint32_t *pulNotificationValue,
                           TickType_t xTicksToWait);
```

| 参数名称 | 参数说明 |
|-|-|
| uxIndexToWaitOn | 调用任务的通知值数组中的索引，调用任务将在该通知值上等待接收通知。 |
| ulBitsToClearOnEntry | 如果调用任务在调用前没有待处理的通知，进入时清除该参数设置的位所对应的通知值中的位。例如 0x01 清除第 0 位；0xffffffff 清除所有位，实际上将该值清零。 |
| ulBitsToClearOnExit | 如果调用任务因收到通知而退出（或调用时已有待定通知），在退出之前清除该参数设置的位。例如 0x03 清除第 0 位和第 1 位。 |
| pulNotificationValue | 用于传出任务的通知值。复制到 \*pulNotificationValue 的值是任务在清除对应位之前的通知值。可选参数，不需要时可以设置为 NULL。 |
| xTicksToWait | 调用任务在阻塞状态下等待其通知状态变为待定状态的最大时间。 |
| 返回值 | pdTRUE：因收到通知而返回，或调用时已有待定通知。pdFALSE：在没有收到任务通知的情况下返回。 |

## FreeRTOS任务通知替代二值信号量实验

**1. 实验基础**

本案例演示用任务通知替代二进制信号量实现“推迟中断处理”：ISR 直接通知任务，免去创建信号量的 RAM 开销。

**2. 案例中任务的配置**

案例创建任务，配置如下：

| 配置项 | 第一个任务 | 第二个任务  |
|-|-|-|
| 函数的名称 | Periodic | Task1 |
| 函数优先级 | osPriorityNormal | osPriorityNormal1 |
| 任务栈大小 | 128 | 128 |
| 函数的入口 | vPeriodicTask | vHandlerTask |
| 任务的参数 | NULL | NULL |

**3. 案例中任务的执行模式**

1. 大部分时间运行空闲任务。每隔 500ms，就会被周期性任务抢占。
2. 周期性任务打印其第一条消息，然后强制中断。中断服务程序立即执行。
3. ISR 直接向 vHandlerTask() 任务函数发送通知，使任务解除阻塞。然后 ISR 直接返回 vHandlerTask()，因为任务是此时最高优先级的就绪状态任务。
4. vHandlerTask() 打印其消息，然后再返回阻塞状态，等待下一个通知。
5. 周期性任务再次成为最高优先级的任务，打印第二条消息，然后再次进入阻塞状态，等待下一周期。这样就只剩下空闲任务能够运行了。

**4. 与二进制信号量的对比**

| 方案 | ISR 端 | 任务端 | 额外开销 |
|-|-|-|-|
| 二进制信号量 | xSemaphoreGiveFromISR() | xSemaphoreTake() | 需先 xSemaphoreCreateBinary() 创建 |
| 任务通知 | vTaskNotifyGiveFromISR() | ulTaskNotifyTake() | 无需创建，通知值是每任务固有的 |

**5. 要点分析**

- ulTaskNotifyTake(..., pdFALSE) 在返回前递减通知值，行为类似二进制信号量的 take；xClearCountOnExit 为 pdTRUE 时则清零。
- 由于通知值/状态内嵌在每个任务中，比二进制信号量少一个内核对象，省 RAM、执行更快。
- 注意任务通知不能替代“多个接收任务 / 向 ISR 发送”等场景。

## FreeRTOS任务通知替代计数信号量实验

**1. 实验基础**

本案例演示用任务通知替代计数型信号量：通知值本身就是一个“计数器”，天然支持累计多个未处理的通知。

**2. 案例中任务的配置**

案例创建任务，配置如下：

| 配置项 | 第一个任务 | 第二个任务 |
|-|-|-|
| 函数的名称 | Periodic | Task1 |
| 函数优先级 | osPriorityNormal | osPriorityNormal1 |
| 任务栈大小 | 128 | 128 |
| 函数的入口 | vPeriodicTask | vHandlerTask |
| 任务的参数 | NULL | NULL |

**3. 替代计数信号量的原理**

- ISR 每次调用 vTaskNotifyGiveFromISR() 使通知值 +1——等效于计数信号量的 xSemaphoreGive()。
- 任务调用 ulTaskNotifyTake(pdFALSE, ...) 在返回前把通知值减 1——等效于计数信号量的 xSemaphoreTake()（每取走一个计数）。
- 如果中断连续发生多次而任务来不及处理，通知值会累积（受 32 位上限约束），记录“积压事件数”。

**4. 与计数信号量的对比**

| 方案 | 创建 | 计数增加 | 计数减少 |
|-|-|-|-|
| 计数信号量 | xSemaphoreCreateCounting(最大计数值, 初始值) | xSemaphoreGive() | xSemaphoreTake() |
| 任务通知 | 无需创建 | vTaskNotifyGiveFromISR()（ISR 端） | ulTaskNotifyTake(pdFALSE)（计数上限为通知值位宽，如 32 位） |

**5. 要点分析**

- xClearCountOnExit = pdFALSE 时 ulTaskNotifyTake() 递减（计数型行为）；= pdTRUE 时清零（二值型行为）。
- 任务通知做计数没有显式的“最大计数值”配置，溢出保护需自行考虑。
- 事件计数场景（多个中断产生事件、处理任务一次处理一个）用任务通知替代计数信号量更省 RAM。

# FreeRTOS本质串讲与查漏补缺

**1. FreeRTOS 的本质**

把前面 17 章归成一句话：FreeRTOS 是一个“基于优先级的抢占式实时内核”。它只做四件事：调度器（决定哪个任务使用 CPU）、任务（使用 CPU 的实体）、同步与通信原语（任务之间、任务与中断之间协作的桥梁）、对时间与资源的约束管理。其余所有 API 都是这四件事的展开。

**2. 串讲主线一：为什么需要内核**

| 方案 | 特点 | 局限 |
|-|-|-|
| 裸机轮询（1.2/1.3） | 主循环顺序检查各标志位 | 一个任务耗时则全部卡死，实时性差 |
| 前后台（1.4/1.5） | 中断（前台）+ 主循环（后台） | 实时响应靠中断，后台仍是串行大循环 |
| 裸机状态机（1.6） | 模块化 + 状态机，结构更清晰 | 多路并发与复杂时序仍难维护 |
| RTOS（1.7 起） | 把“谁在什么时候做什么”交给调度器 | 代价：额外 RAM/ROM 与调度开销 |

**3. 串讲主线二：任务与调度**

- 任务 = 无限循环函数 + 独立栈 + TCB（任务控制块）；创建后进入就绪态，由调度器选择运行（第 3 章）。
- 三种调度策略（10.3）：抢占式（高优先级随时打断低优先级）、时间片（同优先级轮流）、协作式（任务主动让出）。
- 上下文切换（2.2/2.3）：SysTick 滴答触发 → 保存当前任务寄存器与栈 → 恢复新任务上下文 → 继续执行。
- 任务状态机：运行 / 就绪 / 阻塞 / 挂起。阻塞不是“空转”，而是“等事件”——CPU 让给其他任务，这是 RTOS 既及时又省电的关键（第 6\~7 章）。
- 任务控制全家桶：创建（3）、参数（4）、优先级（5）、相对/绝对延时（6/7）、空闲钩子（8）、句柄与动态调整（9）、删除（10）。

**4. 串讲主线三：同步与通信原语对比（第 11\~17 章核心）**

| 原语 | 数据能力 | 方向 | 特点 | 典型场景 |
|-|-|-|-|-|
| 队列 | 任意大小数据、可缓冲多个 | 任务↔任务、任务↔ISR | FIFO、可阻塞、多对多 | 数据流、命令传递、生产者-消费者 |
| 二进制信号量 | 无数据、0/1 | ISR→任务为主 | 一次性事件通知 | 推迟中断处理、事件唤醒 |
| 计数信号量 | 无数据、可计数 | ISR→任务为主 | 累计多个事件 | 事件计数、资源统计 |
| 互斥量 | 无数据、0/1 + 优先级继承 | 任务之间 | 防止优先级反转 | 保护共享资源 |
| 事件组 | 多位标志 | 任务↔任务 | 等待“任一个/全部”、可广播 | 多条件同步、会合（栅栏） |
| 任务通知 | 32 位值 + 状态 | 1 对 1、ISR→任务 | 最省 RAM（每任务 5 字节） | 轻量信号量/计数/队列的替代 |
| 软件定时器 | 回调函数 | 任务→守护任务 | 在守护任务上下文执行 | 周期任务、超时控制、看门狗式重置 |

**5. 串讲主线四：中断与时间**

- 中断安全 API（13.1）：ISR 内不能阻塞，用 \*FromISR 版本 + xHigherPriorityTaskWoken + portYIELD_FROM_ISR。
- 推迟中断处理（13.2/14 章）：ISR 只做最短工作（清中断标志、give 信号量），重活交给任务或守护任务。
- 中断优先级 vs 任务优先级：硬件决定 ISR、软件决定任务；任务永远不能抢占 ISR（37 号）。
- 时间观：滴答（tick）驱动一切调度与延时；相对延时会累积漂移，绝对延时（vTaskDelayUntil）保证定周期（6/7 章）。

**6. 补一：堆内存管理方案 heap_1\~heap_5 怎么选**

| 方案 | 行为 | 适用场景 |
|-|-|-|
| heap_1 | 只分配、不释放 | 永不删除任务/内核对象的极简场景 |
| heap_2 | 可分配可释放，空闲块不合并 | 旧版推荐；新代码用 heap_4 替代 |
| heap_3 | 包装 C 库 malloc/free | 编译器提供运行时库，线程安全包装 |
| heap_4 | 空闲块按地址排序并合并，减少碎片 | 通用默认推荐 |
| heap_5 | 支持多段不连续内存区 | 内存分布在多块（如内部 + 外部 SRAM） |

选择建议：默认用 heap_4；确认系统从不删除内核对象用 heap_1；多段内存布局用 heap_5。堆大小由 configTOTAL_HEAP_SIZE 决定，动态创建的一切对象（任务栈、队列、信号量、定时器）都从这里分配。

**7. 补二：栈溢出检测与调试手段**

- configCHECK_FOR_STACK_OVERFLOW = 1/2：切换任务时检测栈溢出，触发 vApplicationStackOverflowHook()。
- vTaskList()：打印各任务状态（运行/就绪/阻塞/挂起）、优先级、栈高水位；需 configUSE_TRACE_FACILITY = 1。
- vTaskGetRunTimeStats()：输出各任务 CPU 占用率；需 configGENERATE_RUN_TIME_STATS = 1 并提供时基计数。
- configASSERT()：断言，内核参数错误或致命错误时立即暴露，而不是让程序诡异跑飞。

**8. 补三：FreeRTOSConfig.h 关键配置速览**

| 配置项 | 作用 |
|-|-|
| configUSE_PREEMPTION | 抢占（1）/ 协作（0）调度 |
| configTICK_RATE_HZ | 滴答频率，决定时间分辨率与调度开销 |
| configMAX_PRIORITIES | 可用优先级数量上限 |
| configMINIMAL_STACK_SIZE | 空闲任务栈大小 |
| configTOTAL_HEAP_SIZE | 堆内存总量（heap_x 方案） |
| configUSE_IDLE_HOOK / configUSE_TICK_HOOK | 空闲/滴答钩子开关 |
| configUSE_TIMERS / configTIMER_TASK_PRIORITY / configTIMER_QUEUE_LENGTH | 软件定时器相关配置 |
| configMAX_SYSCALL_INTERRUPT_PRIORITY / configKERNEL_INTERRUPT_PRIORITY | 中断安全边界（可调用 API 的优先级范围） |
| configTASK_NOTIFICATION_ARRAY_ENTRIES | 每任务通知条目数（每条约 5 字节） |
| configCHECK_FOR_STACK_OVERFLOW | 栈溢出检测等级（0/1/2） |

**9. 补四：二进制信号量 vs 互斥量怎么选**

- 同步（中断唤醒任务、事件通知）→ 二进制信号量（或更省的任务通知）。
- 保护共享资源（互斥访问）→ 互斥量：自带优先级继承，防止优先级反转（40 号）。
- 用二进制信号量做互斥是常见错误：它没有优先级继承，高优先级任务可能被低优先级任务“卡”很久。

**10. 补五：Cortex-M 中断优先级分组（NVIC）**

37 号讲了数字/逻辑优先级，这里补分组概念：Cortex-M 的优先级数值通常分成两组——抢占优先级（可以嵌套更低抢占级的中断）和子优先级（只在抢占级相同且同时挂起时决定先后）。

- 滴答/内核中断：配置在最低逻辑优先级（数字最大），避免临界区外停留时间过长。
- 调用中断安全 API 的中断：逻辑优先级必须低于 configMAX_SYSCALL_INTERRUPT_PRIORITY（即数字优先级大于等于该值）才安全。
- 优先级分组（NVIC_SetPriorityGrouping）一旦确定，运行期不要改动；中断优先级配置应在调度器启动前完成。

**11. 补六：从 0 到 1 设计一个 FreeRTOS 应用的套路**

1. 拆任务：把系统拆成“周期性动作”（如传感器采集）、“事件响应”（如按键）、“耗时流程”（如协议处理）三类。
2. 选原语：数据流→队列；事件→信号量/任务通知；共享资源→互斥量；多条件组合→事件组；周期超时→软件定时器。
3. 定配置：堆大小、滴答频率、优先级数量、功能开关。
4. 守铁律：ISR 只用 FromISR 版本；回调/临界区里不阻塞；守护任务回调里不调用阻塞 API。
5. 验资源：开栈溢出检测，用 vTaskList 看栈水位、vTaskGetRunTimeStats 看 CPU 占用。

## 原文画板

![飞书画板](/feishu-assets/e0d5a900aaf3.jpg)
