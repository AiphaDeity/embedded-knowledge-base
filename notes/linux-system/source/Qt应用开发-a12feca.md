# Qt应用开发

[飞书原文](https://hcn4ticlccda.feishu.cn/docx/XhpUdAEcOoz8D4x9bMFc2iYhnlh)

# Qt概述

## Qt

**Qt**：跨平台C++图形用户界面应用程序开发框架，支持嵌入式Linux、Windows、macOS等多平台。

# 信号与槽

**信号与槽（Signals & Slots）**：Qt的对象间通信机制，信号在事件触发时发射，槽函数接收并处理。

```cpp
connect(button, SIGNAL(clicked()), this, SLOT(onClick()));

```

# 常用控件

| 控件 | 用途 |
|-|-|
| **QLabel** | 显示文本/图片 |
| **QPushButton** | 按钮 |
| **QLineEdit** | 单行输入框 |
| **QTextEdit** | 多行文本编辑 |
| **QLCDNumber** | 数字显示 |
| **QSlider** | 滑块 |

# 布局管理

**布局管理器**：Qt自动排列控件位置的机制，无需手动指定坐标。

| 布局 | 方向 |
|-|-|
| **QHBoxLayout** | 水平布局 |
| **QVBoxLayout** | 垂直布局 |
| **QGridLayout** | 网格布局 |

# 网络编程

**QTcpSocket**：TCP客户端套接字，实现与服务器通信。

# 三个实战项目

| 项目 | 功能 |
|-|-|
| **智能灯光控制** | 界面控制LED开关、亮度调节 |
| **智能大棚温控** | 温湿度采集、阈值报警 |
| **火灾报警系统** | 烟雾检测、声光报警 |

---

Qt开发核心：信号槽做通信→布局管理器排控件→串口/网络接硬件→做界面交互。
