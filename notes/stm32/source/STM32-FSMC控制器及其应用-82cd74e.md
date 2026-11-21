# STM32 FSMC控制器及其应用

[飞书原文](https://hcn4ticlccda.feishu.cn/docx/ZSEMdH5HaoBuwyxRz0ScsbtEnwg)

# FSMC控制器与SRAM

## 一、FSMC 简

**FSMC**（Flexible Static Memory Controller，灵活静态存储控制器）是 STM32 中用于扩展外部存储器的控制器，核心特点：

- **支持访问多种存储器类型**：SRAM、ROM、NOR Flash、NAND Flash、PC 卡设备
- **时序可编程**：读写时序可通过寄存器灵活配置，适配不同器件

使用 FSMC 的基本流程：

1. 初始化配置 FSMC（选择存储区域、数据宽度、时序参数）
2. 定义指针（指向对应 Bank 的映射地址）
3. 操作指针修改存储单元内容
4. FSMC 自动完成读和写访问操作

### 1.1 FSMC 内部结构

FSMC 控制器包含的主要模块：

- **NOR/PSRAM 存储器控制器**：可驱动异步 SRAM 和 ROM、PSRAM、NOR Flash
- **NAND/PC 卡存储器控制器**：可驱动 NAND Flash、16 位 PC 卡兼容设备
- **配置寄存器**：通过 AHB 总线访问，输入时钟为 HCLK；FSMC 中断可连接至 NVIC

### 1.2 通信引脚（N 表示低电平有效）

| 分类 | 引脚 | 功能说明 |
|-|-|-|
| 共享信号 | FSMC_A[25:0] | 地址总线 |
| 共享信号 | FSMC_D[15:0] | 双向数据总线 |
| 共享信号 | FSMC_NOE | 输出使能（数据读取） |
| 共享信号 | FSMC_NWE | 写入使能 |
| 共享信号 | FSMC_NWAIT | PSRAM 发送给 FSMC 的等待输入信号 |
| NOR/PSRAM | FSMC_NE[4:1] | 片选信号，4 根，用于区分不同存储设备 |
| NOR/PSRAM | FSMC_NL（或 NADV） | 仅用于 PSRAM 输入地址的有效信号 |
| NOR/PSRAM | FSMC_NBL[1:0] | NBL[0] 低字节使能、NBL[1] 高字节使能 |
| NOR/PSRAM | FSMC_CLK | 时钟（仅用于 PSRAM 同步突发） |

### 1.3 实例：IS61LV25616 SRAM

寻址范围 256K，每个地址空间的数据大小为 16bit（2 字节），容量 = 256K × 2 = 512K 字节（512KB）。

主要引脚：A0\~A17 地址输入；I/O0\~I/O15 数据输入/输出；CE 片选使能；OE 输出使能；WE 写使能；LB/UB 低/高字节控制；VDD/GND 电源。

## 二、外部器件地址映射

从 FSMC 的角度，外部存储器被划分为 **4 个固定大小的存储区域，每个区域 256MB**：

- **Bank1**（存储区域1）：可连接多达 4 个 NOR Flash 或 PSRAM 存储器器件，带 4 个专用片选信号，分为 4 个 64MB 子区域
- **Bank2、Bank3**（存储区域2、3）：用于连接 NAND Flash 器件，每个存储区域一个器件
- **Bank4**（存储区域4）：用于连接 PC 卡设备

### 2.1 Bank1 四个子区域与地址范围

| Bank1 的区域 | 片选信号 | 地址范围 |
|-|-|-|
| 区域1 | FSMC_NE1 | 0x6000 0000 - 0x63FF FFFF |
| 区域2 | FSMC_NE2 | 0x6400 0000 - 0x67FF FFFF |
| 区域3 | FSMC_NE3 | 0x6800 0000 - 0x6BFF FFFF |
| 区域4 | FSMC_NE4 | 0x6C00 0000 - 0x6FFF FFFF |

### 2.2 HADDR 与 FSMC 地址信号线

- HADDR 总线是转换到外部存储器的内部 AHB 总线；每个 Bank 的大小是 256MB，由 28 根 HADDR[27:0] 总线寻址
- **HADDR[27:26] 用于确定片选**：00→区域1、01→区域2、10→区域3、11→区域4
- **HADDR[25:0] 包含外部存储器地址**：HADDR 为字节地址，当地址空间存储的数据大小是字节、外部 SRAM 数据宽度也是字节时，HADDR 与外部 SRAM 地址一一对应

**数据宽度 16 位时**：初始化 FSMC 设置外部 SRAM 数据宽度为 16 位后，FSMC 向外部 SRAM 发地址时会自动将 HADDR[25:0] 右移 1 位（HADDR[25:0] >> 1）。例如向 0x6800 0000 与 0x6800 0001 写数据，外部 SRAM 看到的都是地址 0，写入的高/低字节由 **NBL[1:0] 字节使能信号**区分（NBL[0] 低字节、NBL[1] 高字节）。

## 三、NOR/PSRAM 控制器访问模式

### 3.1 控制器寄存器

FSMC 的 NOR/PSRAM 控制器有三类寄存器（x 的范围是 1\~4）：

| 寄存器 | 作用 | 偏移地址 |
|-|-|-|
| FSMC_BCRx | 片选控制寄存器 | 0xA000 0000 + 8 × (x-1) |
| FSMC_BTRx | 片选时序寄存器（读时序） | 0xA000 0000 + 0x04 + 8 × (x-1) |
| FSMC_BWTRx | 写入时序寄存器 | 0xA000 0000 + 0x104 + 8 × (x-1) |

### 3.2 异步事务访问模式

- **模式1**：SRAM/PSRAM (CRAM)
- **模式A**：SRAM/PSRAM (CRAM) OE 切换
- **模式2/B**：NOR Flash
- **模式C**：NOR Flash OE 切换
- **模式D**：扩展地址异步访问bank
- **复用模式**：复用异步访问 NOR Flash
- **异步访问中的 WAIT 管理**

### 3.3 扩展模式

扩展模式简单来说，就是存储器的读和写是否需要不同的时序参数；若读数据和写数据所需时序参数相差太大，则需要使能扩展模式。扩展模式由 **FSMC_BCRx 的 EXTMOD 位**控制。

- **禁止扩展模式**：存储器类型为 SRAM/CRAM 时为模式1，为 NOR 时为模式2；存储器类型由 FSMC_BCRx 的 **MTYP 位**控制
- **使能扩展模式**：最多可提供 4 种扩展模式（A、B、C、D），可混合使用，例如读用模式A、写用模式B；读模式由 **FSMC_BTRx.ACCMOD** 控制，写模式由 **FSMC_BWTRx.ACCMOD** 控制

### 3.4 时序参数（以 HCLK 为单位）

| 参数 | 含义 | 设置范围 |
|-|-|-|
| ADDSET | 地址建立时间：发出地址信号到给出有效数据（读）/ 写使能信号发出（写）的时间 | 0\~15 个 HCLK |
| DATAST | 数据阶段持续时间：读使能信号到给出有效数据 / 写使能信号到数据采集的时间 | 1\~255 个 HCLK |
| BUSTURN | 总线周转阶段持续时间 | — |

### 3.5 时序参数与 IS61LV25616 的对应

- 读时序：ADDSET → tAA（Max = 10ns）、DATAST → tDOE（Max = 4ns）
- 写时序：**ADDSET** → tSA（Min = 0ns）、DATAST → tPWE1（Min = 8ns）

以 168MHz 的 AHB 总线时钟计算，1 个 HCLK 周期约 5.95ns：读时序 ADDSET 合理范围 1\~15、DATAST 2\~255；写时序 ADDSET 合理范围 0\~15、DATAST 2\~255。

### 3.6 使用模式1访问 IS61LV25616 的配置流程

**GPIO 初始化（寄存器配置）**：

1. 使能涉及到的 IO 引脚的时钟
2. 将 SRAM 涉及的所有信号引脚初始化为复用功能模式，复用给 FSMC 控制器。例如外部 SRAM 片选 CE 连接到 FSMC_NE3，FSMC_NE3 对应 GPIOG10，需将 GPIOG10 设置为复用模式、功能复用为 FSMC（复用标号 AF12，可通过数据手册查看）

**FSMC 控制器初始化（寄存器配置）**：

1. 使能 FSMC 控制器时钟
2. 配置使用模式1（不开启扩展模式，且将访问的存储器类型设置为 SRAM）
3. 配置存储器数据总线宽度为 16 位
4. 使能存储区域
5. 写入使能
6. 时序参数配置（ADDSET、DATAST、BUSTURN）

**访问方式**：支持按字节写入/读取、按半字写入/读取、按字写入/读取。

**对齐访问**：对齐指数据访问地址为 SRAM 存储单元的自然对齐地址（地址是存储单元大小的整数倍）。IS61LV25616 为 16 位宽，访问地址应为 16 位对齐（偶数地址，如 0x6C00 0000、0x6C00 0002、0x6C00 0004）；若用非对齐方式按字访问，会产生异常结果。

### 3.7 模式A（OE 切换）

模式A 与模式1 类似，区别在于读时序中输出使能（NOE/OE）在数据阶段提前拉高（OE 切换），时序参数同样由 ADDSET、DATAST、BUSTURN 配置，读写参数对应关系与模式1一致（读 ADDSET→tAA、DATAST→tDOE；写 ADDSET→tSA、DATAST→tPWE1）。

# LCD显示屏原理（MCU接口）

## 一、LCD 显示原理

### 1.1 RGB 三原色与像素

光学三原色为 RGB（红、绿、蓝），三色光混合后组成显示屏显示的颜色；屏幕由大量像素组成，每个像素由 R、G、B 三个子像素构成，放大屏幕即可看到像素网格。

### 1.2 LCD 与 OLED 的色彩显示结构

- **LCD**：由背光层、正极电路、液晶层、水平/垂直偏光片、彩色滤光片、负极电路等组成。背光发出光线，液晶分子在电压下偏转控制透光量，光线穿透彩色滤光片后分解为 RGB 颜色
- **OLED**：全称有机自发光二极管，每个子像素由发光二极管直接发光，无需背光层

### 1.3 图像数据存储格式

| 格式 | 通道位分配 | 色深 | 可显示颜色数 |
|-|-|-|-|
| RGB888 | R8 + G8 + B8 | 24 位 | ≈1677 万色（256×256×256） |
| RGB565 | R5 + G6 + B5 | 16 位 | ≈65536 色（32×64×32） |

### 1.4 LCD 与 OLED 优缺对比

| 屏幕类型 | 应用场景 | 优点 | 缺点 |
|-|-|-|-|
| LCD | 手机屏幕、电视屏等 | 成本低、使用寿命长 | 无法显示纯黑色、漏光等 |
| OLED | 手机屏幕、电视屏等 | 可做息屏提醒、对比度高（可显示纯黑）、薄 | 寿命短、色彩不均匀、成本高等 |

## 二、LCD 屏幕组成与控制

### 2.1 LCD 屏幕组成

LCD 屏幕主要由 LCD 面板（玻璃基板）、背光板、控制 IC 组成：

- **LCD 面板（玻璃基板）**：表面极其平整的薄玻璃片，保证光线能够透过，决定显示屏的质量和画面的感官体验
- **背光板**：提供光源，使光线穿透滤光片变成不同颜色的光线
- **控制 IC**：用户可通过控制 IC 调整施加到像素电极上的电压、频率、时序等

### 2.2 常用接口类型

LCD 液晶屏的接口类型非常丰富，最常用的主要有 RGB、MCU、LVDS、MIPI 等。

- **MCU(CPU)接口**：主要针对单片机领域；标准是 Intel 提出的 8080 总线标准，很多文档中用 I80 指代 MCU 接口屏；数据传输位数有 8 位、16 位、24 位；控制 IC 带 GRAM(SRAM)，所以难以做大屏——屏幕越大，所需 SRAM 存储空间越大
- **RGB 接口**：不需要 GRAM，显存由系统内存充当，大小只受限于系统内存，因此可做较大尺寸屏幕，但驱动较复杂

### 2.3 控制 IC 实例：OTM8009A

系统接口（System interfaces）：MIPI DSI（1/2 data lane，每通道传输速率最高 550Mb/s）、MDDI（2 lane，550Mb/s）、CPU（8/16/24 位）、RGB（16/18/24 位）、SPI/I2C 接口。

## 三、MCU 接口通信时序（I80 协议）

### 3.1 接口信号定义

| 引脚信号 | 名称 | 控制状态 | 作用 |
|-|-|-|-|
| CS | 片选 | 低电平 | 器件选择，低电平有效 |
| WR | 写信号 | 上升沿 | 命令/数据写入信号，上升沿有效 |
| RD | 读信号 | 上升沿 | 命令/数据读取信号，上升沿有效 |
| RS | 数据/命令切换信号 | 低电平：命令信号；高电平：数据信号 | 区分当前的读写操作是命令还是数据 |
| D[15:0] | 数据线 | — | 双向数据线，用于数据传输 |

### 3.2 写时序（Write cycle）

1. 拉低 CS 片选线（写时序，RD 信号全程保持高电平即可）
2. 通过 RS(DCX) 信号线确定当前需要写入的是命令还是数据
3. 拉低 WR 写信号线，将需要写入的数据发送到 D[15:0] 数据线上
4. 拉高 WR 写信号线，数据线上的数据被写入到 LCD 的驱动 IC 中

每个写周期为 WRX 高-低-高序列：主机在 WRX 下降沿开始输出 DB 数据，显示屏在 WRX 上升沿写入数据。DCX 为控制信号：低电平表示命令（CMD: Write command code），高电平表示数据（PA: Parameter or RAM data）。

### 3.3 读时序（Read cycle）

1. 拉低 CS 片选线（读时序，WR 信号全程保持高电平即可）
2. 通过 RS(DCX) 信号线确定命令/数据
3. 拉低 RD 读信号线，等待 LCD 驱动 IC 将数据发送到 D[15:0] 数据线上
4. 拉高 RD 读信号线，CPU 进行数据读取

读周期为 RDX 高-低-高序列：显示屏在 RDX 下降沿开始控制 DB 数据线，主机在 RDX 上升沿读取数据；读时序中可能出现 DM（Dummy，空操作）阶段。

## 四、LCD 驱动 IC 与常用指令

LCD 驱动 IC 用于控制 LCD 的各种显示功能和效果，常见型号有 OTM8009A、NT35510、ILI9341 等；一般只需掌握其中 5\~6 条指令即可完成对 LCD 的基本使用。

| 地址（命令） | 作用 |
|-|-|
| 0x3600 | 控制屏幕的显示/扫描方向（MADCTL：MX、MY、MV 共同控制扫描方向，RGB 位控制 RGB/BGR 显示顺序） |
| 0x2A00\~0x2A03 | 列地址设置（CASET）：设置 X 光标位置（XS 起始、XE 结束） |
| 0x2B00\~0x2B03 | 行地址设置（RASET）：设置 Y 光标位置（YS 起始、YE 结束） |
| 0x2C00 | 写入 GRAM 指令（RAMWR）：开始写入 GRAM 数据，即像素的 RGB565 颜色值 |
| 0x2E00 | 读取 GRAM 指令 |

其中 0x2A00\~0x2A03 分别对应：X 光标起始位置高 8 位、X 起始低 8 位、X 结束高 8 位、X 结束低 8 位；0x2B00\~0x2B03 同理对应 Y 光标的起始/结束高低位。

## 五、MCU 接口与 FSMC 的衔接

I80 接口信号与 FSMC（NOR/PSRAM 子控制器）信号一一对应，这就是把 LCD 当作外部 SRAM 挂到 FSMC Bank1 的原理基础：

- CS（片选）↔ FSMC_NE[4:1]（Bank1 区域片选）
- WR（写信号）↔ FSMC_NWE；RD（读信号）↔ FSMC_NOE
- RS（命令/数据切换）↔ FSMC_A[x]（用地址线区分命令/数据）
- D[15:0] ↔ FSMC_D[15:0]

I80 协议的写/读周期与 FSMC 异步访问的模式1、模式A 时序高度相似（ADDSET/DATAST 对应地址建立与数据阶段），因此可用 FSMC 直接驱动 LCD。配置 FSMC 时序时需对照 LCD 控制 IC 的 8080 并行接口参数（如 OTM8009A：写周期 TWC≈66ns、数据建立时间 TDST≈10ns、读周期 TRC≈160ns 等，详见课件 Fig.7.3.3.1 与 OTM8009A 时序参数表）。

# 应用实战之LCD屏幕刷新

> 本节为补充内容：基于 FSMC 驱动 8080 接口 LCD 的通用实战流程整理，具体引脚与命令以实际板卡和 LCD 控制器手册为准。

## 一、硬件连接：把 LCD 当作外部 SRAM

| LCD 引脚 | 连接 | 说明 |
|-|-|-|
| CS（片选） | FSMC_NE1（Bank1 区域1） | LCD 被映射到 0x6000 0000 起始空间 |
| RS / DC（命令/数据） | FSMC_A[16] | 用地址线区分命令与数据 |
| WR | FSMC_NWE | 写使能 |
| RD | FSMC_NOE  <br/> | 读使能 |
| DB[15:0] | FSMC_D[15:0] | 16 位数据总线 |
| RST | 任意 GPIO | 软件控制复位时序 |

## 二、命令/数据地址计算

RS 接在 A16 上：A16=0 写命令，A16=1 写数据。因此可用两个宏直接访问：

```c
#define LCD_CMD_ADDR  (*(volatile uint16_t *)0x60000000)  /* A16=0，写命令 */
#define LCD_DATA_ADDR (*(volatile uint16_t *)0x60020000)  /* A16=1，写数据 */
```

## 三、初始化与刷屏流程

1. **GPIO 配置**：使能 GPIO 时钟，把 FSMC 相关引脚（地址、数据、控制）设为复用功能（如 AF12）
2. **FSMC 配置**：选择 Bank1、16 位数据宽度、异步访问模式（模式1或模式A）、按 LCD 控制器手册配置 ADDSET/DATAST/BUSTURN 时序、使能存储区域
3. **LCD 控制器初始化**：硬件/软件复位 → Sleep Out → 设置像素格式（如 RGB565）→ 关闭/开启显示等初始化命令序列（以 ILI9341 等控制器手册为准）
4. **刷屏**：设置显示窗口（Column Address / Page Address 命令）→ 连续向 GRAM 写入像素数据 → 显示控制器自动输出到屏幕

```c
/* 画点：先写命令设置坐标，再写数据 */
void LCD_DrawPoint(uint16_t x, uint16_t y, uint16_t color)
{
    LCD_CMD_ADDR = 0x2A;            /* 列地址命令 */
    LCD_DATA_ADDR = x >> 8;  LCD_DATA_ADDR = x & 0xFF;
    LCD_CMD_ADDR = 0x2B;            /* 页地址命令 */
    LCD_DATA_ADDR = y >> 8;  LCD_DATA_ADDR = y & 0xFF;
    LCD_CMD_ADDR = 0x2C;            /* 写 GRAM 命令 */
    LCD_DATA_ADDR = color;
}
```

## 四、刷新优化建议

- **16 位数据总线 + 连续写**：减少命令开销，提高写 GRAM 吞吐
- **DMA 搬运**：整屏或区域刷新用 DMA 连续写帧缓冲，释放 CPU
- **局部刷新**：仅更新变化的窗口区域，降低带宽需求
- **双缓冲**：后台绘制、前台切换，避免画面撕裂
- **时序收敛**：在保证稳定的前提下尽量压缩 ADDSET/DATAST（参考 HCLK 周期与 LCD 手册要求计算）

## 五、FSMC 相关寄存器（LCD 场景）

驱动 8080 接口 LCD 时，FSMC 走 NOR/PSRAM 控制器的 Bank1（NE1），真正用到的是 **FSMC_BCR1、FSMC_BTR1**（读/写时序）与可选的 **FSMC_BWTR1**（扩展模式下独立写时序）。

### 5.1 关键寄存器与位定义

| 寄存器 | 关键位 | 作用（LCD 场景取值） |
|-|-|-|
| FSMC_BCR1 | MBKEN | 存储区使能，置 1 使能 Bank1 区域1 |
| FSMC_BCR1 | MTYP[1:0] | 存储器类型：LCD 按 SRAM 访问（00 = SRAM/ROM） |
| FSMC_BCR1 | MWID[1:0] | 数据总线宽度：01 = 16 位，与 D[15:0] 对应 |
| FSMC_BCR1 | WREN | 写使能，置 1 允许向 LCD 写命令/数据 |
| FSMC_BCR1 | EXTMOD | 扩展模式：读/写时序不同时置 1（启用 BWTR1） |
| FSMC_BTR1 | ADDSET[3:0] | 地址建立时间（HCLK 数） |
| FSMC_BTR1 | DATAST[7:0] | 数据建立时间（HCLK 数），决定读写脉冲宽度 |
| FSMC_BTR1 | BUSTURN[3:0] | 总线周转周期（HCLK 数） |
| FSMC_BTR1 | ACCMOD[1:0] | 访问模式：00 = 模式A（与 I80 时序匹配） |
| FSMC_BWTR1 | 同 BTR1 | 扩展模式下的独立写时序寄存器 |

模式A 下，一个完整访问周期 ≈ (ADDSET + DATAST + BUSTURN) × HCLK。需按 LCD 手册参数核算：例如 OTM8009A 要求写周期 **TWC ≥ 66ns**、读周期 **TRC ≥ 160ns**（课件参数表），据此反推 ADDSET/DATAST/BUSTURN 的 HCLK 数。

### 5.2 HAL 库寄存器组合规则（课件原文）

> 以下内容对照《02_LCD屏幕显示》课件「HAL库FSMC寄存器定义」整理。

HAL 库寄存器定义中没有单独的 FSMC_BCRx、FSMC_BTRx、FSMC_BWTRx，而是组合成寄存器组，规则如下：

<table><colgroup><col/><col/><col/></colgroup><thead><tr><th>寄存器组</th><th>组合关系</th><th>说明</th></tr></thead><tbody><tr><td rowspan="4">BTCR[8]</td><td>BTCR[0] ↔ FSMC_BCR1，BTCR[1] ↔ FSMC_BTR1</td><td>Bank1：控制 + 读时序</td></tr><tr><td>BTCR[2] ↔ FSMC_BCR2，BTCR[3] ↔ FSMC_BTR2</td><td>Bank2</td></tr><tr><td>BTCR[4] ↔ FSMC_BCR3，BTCR[5] ↔ FSMC_BTR3</td><td>Bank3</td></tr><tr><td>BTCR[6] ↔ FSMC_BCR4，BTCR[7] ↔ FSMC_BTR4</td><td>Bank4</td></tr><tr><td rowspan="5">BWTR[7]</td><td>BWTR[0] ↔ FSMC_BWTR1</td><td>Bank1 写时序</td></tr><tr><td>BWTR[2] ↔ FSMC_BWTR2</td><td>Bank2</td></tr><tr><td>BWTR[4] ↔ FSMC_BWTR3</td><td>Bank3</td></tr><tr><td>BWTR[6] ↔ FSMC_BWTR4</td><td>Bank4</td></tr><tr><td>BWTR[1]、BWTR[3]、BWTR[5]</td><td>保留，未使用</td></tr></tbody></table>

即：Bank1 的配置入口是 **BTCR[0]（BCR1）**、**BTCR[1]（BTR1）**，需要独立写时序时再配 **BWTR[0]（BWTR1）**。

## 六、HAL 库驱动流程（CubeMX + HAL）

以下流程以 STM32F4 系列 HAL 库为例（HAL_SRAM 接口），与课件第五章「应用实战」配套使用。

### 6.1 CubeMX 图形化配置

1. 选择外设 FSMC，勾选 NOR/PSRAM Controller
2. 设置 Bank1 区域1（NE1）、存储器类型 SRAM/PSRAM、16 位数据总线、Write operation = Enabled
3. 根据 LCD 手册时序填写 AddressSetup（ADDSET）与 DataSetup（DATAST），访问模式选 Mode A
4. 生成代码后自动得到 fsmc.c / stm32f4xx_hal_msp.c 的引脚与时钟初始化

### 6.2 HAL 初始化流程

1. GPIO 时钟使能 + 引脚复用（HAL_GPIO_Init，AF 选 FSMC 复用功能）
2. 填充 FSMC_NORSRAM_TimingTypeDef（ADDSET/DATAST/BUSTURN/ACCMOD）
3. 填充 FSMC_NORSRAM_InitTypeDef（NSBank=FSMC_NORSRAM_BANK1、MemoryType=SRAM、DataWidth=16bit、WriteOperation=ENABLE 等）
4. 调用 HAL_SRAM_Init(&hsram, &Init, &Timing) 完成寄存器写入（内部写 BCR1/BTR1）

```c
FSMC_NORSRAM_TimingTypeDef Timing = {0};
Timing.AddressSetupTime = 0;      /* ADDSET，模式A */
Timing.DataSetupTime   = 4;       /* DATAST，≥ TWC 要求 */
Timing.BusTurnAroundDuration = 1;
Timing.AccessMode      = FSMC_ACCESS_MODE_A;

FSMC_NORSRAM_InitTypeDef Init = {0};
Init.NSBank            = FSMC_NORSRAM_BANK1;
Init.MemoryType        = FSMC_MEMORY_TYPE_SRAM;
Init.MemoryDataWidth   = FSMC_NORSRAM_MEM_BUS_WIDTH_16;
Init.WriteOperation    = FSMC_WRITE_OPERATION_ENABLE;

HAL_SRAM_Init(&hsram, &Init, &Timing);
```

### 6.3 地址宏与 LCD 命令读写（HAL 工程内）

```c
#define LCD_CMD_ADDR  (*(volatile uint16_t *)0x60000000)  /* A16=0 → 命令 */
#define LCD_DATA_ADDR (*(volatile uint16_t *)0x60020000)  /* A16=1 → 数据 */
```

HAL_SRAM_Init 之后 FSMC 已就绪，无需再用 HAL_SRAM_Write_16b 之类的慢接口，直接对地址宏赋值即可触发 FSMC 写周期：

```c
void LCD_WriteCmd(uint16_t cmd) { LCD_CMD_ADDR = cmd; }
void LCD_WriteData(uint16_t data) { LCD_DATA_ADDR = data; }
```

### 6.4 LCD 初始化与刷屏主流程

1. 上电后 GPIO 控制 RST 复位 LCD，延时等待就绪
2. 发初始化序列：0x3600 设显示/扫描方向（MX/MY/MV）→ 0x3A 设像素格式 RGB565 → Sleep Out 等
3. 刷屏：0x2A 设列地址窗口（XS/XE）→ 0x2B 设行地址窗口（YS/YE）→ 0x2C 开始连续写 GRAM（RGB565）
4. 整屏/局部刷新：清屏可循环写 0 或指定颜色；批量数据建议 DMA 直写 LCD_DATA_ADDR

> 注：不同 LCD 控制器（OTM8009A / NT35510 / ILI9341）初始化命令序列不同，应以各自手册与驱动源码为准。
