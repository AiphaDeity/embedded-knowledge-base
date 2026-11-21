# 复习提纲

[飞书原文](https://hcn4ticlccda.feishu.cn/docx/S9gsdXXENooVI6xJZK1ckXJUnDf)

# GPIO

## 一、GPIO 是什么？—— 芯片与物理世界的“数字边界”

- GPIO = General Purpose Input/Output（通用输入输出）
- 物理本质：芯片外部的一根根金属引脚（PA0、PB5……）
- 控制器本质：芯片内部一组寄存器（MODER、IDR、ODR、BSRR、PUPDR、OTYPER、OSPEEDR、AFRL/AFRH）
- 核心作用：CPU 通过写寄存器来控制引脚电平，或通过读寄存器来感知外部电平

一句话：CPU 不直接碰引脚，CPU 只读写寄存器，由 GPIO 控制器去驱动引脚。

## 二、MODER 决定“大模式”（4 种）


<table v-pre><tbody><tr><td>MODER 值</td><td>模式</td><td>含义</td></tr><tr><td>0</td><td>输入模式</td><td>引脚听外部的话，CPU 读 IDR</td></tr><tr><td>1</td><td>通用输出模式</td><td>CPU 写 ODR/BSRR，引脚输出电平</td></tr><tr><td>10</td><td>复用功能模式</td><td>引脚交给内部外设（UART/SPI/I2C/TIM）</td></tr><tr><td>11</td><td>模拟模式</td><td>引脚直通 ADC/DAC，数字电路断开</td></tr></tbody></table>


关键：MODER 每 2 位控制一个引脚，16 个引脚 × 2 = 32 位。

## 三、输入模式（MODER=00）—— 听外部的话

### 3.1 三种子配置（由 PUPDR 决定）


<table v-pre><tbody><tr><td>PUPDR 值</td><td>配置</td><td>悬空默认电平</td><td>典型场景</td></tr><tr><td>0</td><td>浮空输入</td><td>不确定（高阻态，易受干扰）</td><td>外部已有强驱动信号（UART_RX）</td></tr><tr><td>1</td><td>上拉输入</td><td>高电平（1）</td><td>按键接 GND（低电平有效）</td></tr><tr><td>10</td><td>下拉输入</td><td>低电平（0）</td><td>按键接 VCC（高电平有效）</td></tr></tbody></table>


### 3.2 核心寄存器：IDR（输入数据寄存器）

- CPU 读 IDR 的对应位，就知道引脚当前是高还是低
- 施密特触发器负责把外部电压整形为干净的 0 或 1

### 3.3 高阻态理解

- 浮空 = 内部上下拉全断开 = 高阻态
- 引脚像一根悬空的天线，电压由外部决定，易受干扰乱跳
- 高阻态的本质：不输出电流，也不吸收电流，隐身模式

## 四、通用输出模式（MODER=01）—— 主动控制外部

### 4.1 两种子配置（由 OTYPER 决定）


<table v-pre><tbody><tr><td>OTYPER 值</td><td>配置</td><td>内部结构</td><td>高电平来源</td><td>低电平来源</td></tr><tr><td>0</td><td>推挽输出</td><td>P-MOS + N-MOS</td><td>内部 VDD（强推）</td><td>内部 GND（强拉）</td></tr><tr><td>1</td><td>开漏输出</td><td>只有 N-MOS</td><td>外部上拉电阻</td><td>内部 GND（强拉）</td></tr></tbody></table>


### 4.2 推挽输出（Push-Pull）

- 高电平：上管导通，引脚强推到 VDD（3.3V）
- 低电平：下管导通，引脚强拉到 GND（0V）
- 优点：驱动能力强，边沿陡峭，速度快
- 缺点：不能多个推挽引脚直接连在一起（会电源短路）
- 典型场景：LED、蜂鸣器、SPI 的 SCK/MOSI、UART_TX

### 4.3 开漏输出（Open-Drain）

- 低电平：N-MOS 导通，强拉到 GND
- 高电平：N-MOS 截止，进入高阻态，靠外部上拉电阻拉到 VDD
- 核心优势：

  - 线与逻辑：多个设备共享一根线，谁拉低谁赢
  - 电平转换：上拉电阻接 5V，就能输出 5V 高电平
  - 防止短路：外部有电阻限流，永远不会电源直通短路
- 典型场景：I2C 的 SCL/SDA、多个中断引脚共享一根线

### 4.4 输出速度（OSPEEDR）

- 控制引脚电平翻转的压摆率（上升/下降沿陡峭程度）
- 速度越高，功耗和 EMI 越大
- 够用就行，不是越大越好

### 4.5 核心寄存器：ODR 和 BSRR


<table v-pre><tbody><tr><td>寄存器</td><td>操作方式</td><td>特点</td></tr><tr><td>ODR</td><td>读-改-写（ODR |= (1&lt;&lt;5)）</td><td>有被中断打断导致“位冲刷”的风险</td></tr><tr><td>BSRR</td><td>只写（低16位置1，高16位清0）</td><td>原子操作，中断安全，推荐使用</td></tr></tbody></table>


BSRR 口诀：低16位写1置高，高16位写1拉低，写0全都不影响。

## 五、复用功能模式（MODER=10）—— 引脚交给外设

### 5.1 核心逻辑

- 引脚控制权从 GPIO 控制器移交给内部外设（UART/SPI/I2C/TIM）
- 此时写 ODR 无效，引脚由外设硬件自动控制

### 5.2 关键寄存器：AFRL / AFRH

- AFRL：控制 Pin 0 \~ Pin 7
- AFRH：控制 Pin 8 \~ Pin 15
- 每 4 位选择一个 AF 编号（AF0 \~ AF15），查数据手册确定

### 5.3 常见外设的复用配置


<table v-pre><tbody><tr><td>外设</td><td>输出类型</td><td>上下拉</td><td>外部元件</td></tr><tr><td>USART</td><td>推挽</td><td>RX 可上拉</td><td>无</td></tr><tr><td>I2C</td><td>开漏</td><td>无</td><td>必须外部上拉电阻</td></tr><tr><td>SPI</td><td>推挽</td><td>无/CS上拉</td><td>无</td></tr><tr><td>TIM PWM</td><td>推挽</td><td>无</td><td>无</td></tr><tr><td>CAN</td><td>推挽</td><td>无</td><td>需 CAN 收发器</td></tr></tbody></table>


## 六、模拟模式（MODER=11）—— 模拟信号直通

- 数字电路（施密特触发器、上下拉）全部断开
- 引脚直通 ADC（输入）或 DAC（输出）
- 没有“模拟输出”这个叫法，统一叫“模拟模式”
- 典型场景：光敏电阻、土壤湿度传感器、麦克风 → ADC；音频波形、可调电压 → DAC

## 七、寄存器全图（速查表）


<table v-pre><tbody><tr><td>寄存器</td><td>作用</td><td>关键位</td></tr><tr><td>MODER</td><td>模式选择</td><td>每2位控制1个引脚（00/01/10/11）</td></tr><tr><td>OTYPER</td><td>输出类型</td><td>每1位控制1个引脚（0=推挽，1=开漏）</td></tr><tr><td>OSPEEDR</td><td>输出速度</td><td>每2位控制1个引脚</td></tr><tr><td>PUPDR</td><td>上下拉</td><td>每2位控制1个引脚（00=浮空，01=上拉，10=下拉）</td></tr><tr><td>IDR</td><td>输入数据</td><td>低16位对应16个引脚，只读</td></tr><tr><td>ODR</td><td>输出数据</td><td>低16位对应16个引脚，可读写</td></tr><tr><td>BSRR</td><td>置位/复位</td><td>低16位置位，高16位复位，只写，原子操作</td></tr><tr><td>AFRL/AFRH</td><td>复用功能选择</td><td>每4位选择一个AF编号</td></tr><tr><td>LCKR</td><td>配置锁定</td><td>锁定引脚配置，防止误改</td></tr></tbody></table>


## 八、实战决策流程图

拿到一个外设，按顺序问：

1. 是模拟量？ → 模拟模式 + ADC/DAC
2. 走协议（I2C/SPI/UART）？ → 复用模式（I2C开漏，SPI/串口推挽）
3. 是简单开关/传感器？ → 输入模式（接GND用上拉，接VCC用下拉）
4. 是执行器（LED/继电器）？ → 通用输出模式（推挽）
5. 需要多个设备共享一根线？ → 开漏输出 + 外部上拉

## 九、终极口诀

> “MODER 定方向，OTYPER 定性格，OSPEEDR 定快慢，PUPDR 定默认，IDR 是眼睛，ODR 是手，BSRR 是快刀，AFR 是变脸专家。”
> 
> “推挽强推强拉，开漏只拉不推，高阻隐身听令，上下拉定默认。”
> 
> “上拉默认高，按键接地跑；下拉默认低，按键接电好；外部有电阻，内部就浮空。”



# 时钟信号
