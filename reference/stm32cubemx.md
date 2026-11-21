# STM32CubeMX 配置核对清单

适用于为已有原理图配置 STM32 工程。开始前准备完整芯片型号、硬件版本和需要启用的接口。

| 配置位置 | 核对项 |
| --- | --- |
| Pinout & Configuration | MCU 管脚与原理图网络名对应。串口 TX/RX 方向、GPIO 上拉或下拉和复用功能符合接线 |
| Clock Configuration | 外部时钟源与板卡一致。外设时钟、波特率和定时周期具备可核对的输入频率 |
| 外设配置 | 根据业务选择轮询、中断或 DMA。用 DMA 时记录请求映射、方向、数据宽度和模式 |
| Project Manager | 选定工程名、工具链和输出目录，保存 `.ioc` 并记录芯片型号 |
| 生成后 | 对照 `.ioc` 检查初始化调用顺序、回调接入处和中断服务函数。先验证单项外设，再接业务逻辑 |

## 来源

- [飞书原笔记《STM32CubeMX配置指南》](https://hcn4ticlccda.feishu.cn/docx/BKGxd6S0jozVDVxSvfdcuEaingh)
