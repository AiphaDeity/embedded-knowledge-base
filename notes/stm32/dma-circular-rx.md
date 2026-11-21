# STM32F407 DMA 循环接收如何判断新数据

以 UART 接收为例，外设收到数据后产生请求，DMA 把数据搬到内存。CPU 根据 DMA 事件或采样到的写入位置，决定向上层交付哪一段。对应的 Stream 和 Channel 按具体芯片和外设请求查 RM0090。

## 从剩余传输项数推算位置

等宽的字节接收场景里，初始传输项数为 `N`，`NDTR` 给出剩余项数。用 `(N - NDTR) % N` 可以求出循环缓冲区内的写入位置。跨过缓冲区末尾时，先处理旧位置到缓冲末尾的区间，再处理缓冲开头到新位置的区间。

例如缓冲区有 64 个字节，上次处理到索引 60，新写入位置为 4。在两次观察之间写入量小于一整圈的前提下，应分别处理索引 60–63 和 0–3。

## 旧位置和新位置相同

DMA 循环模式在一轮传输完成后重装剩余项数。如果两次观察的位置相同，期间可能没收到数据，也可能正好写完一整圈或多圈。

设计时要给处理任务留下足够的处理时限。可结合半传输、全传输和 UART IDLE 事件推进接收，并明确记录能检测到的溢出。若服务间隔过长，只读一次 `NDTR` 无法恢复被覆盖的数据。IDLE 可以提示接收有停顿，实际帧边界还需要按协议判断。

## 来源与示例

- [飞书原笔记《STM32 DMA控制器及其应用》](https://hcn4ticlccda.feishu.cn/docx/Bi8pdEWOpodSD7x57W4cokiAnqc)
- [ST RM0090 参考手册 · DMA 控制器](https://www.st.com/resource/en/reference_manual/dm00031020-stm32f407-417-427-437-4x9-4a9-4x7-advanced-arm-based-mcus-stmicroelectronics.pdf)
- [代码模板库 · 天空星 UART DMA 接收](https://aiphadeity.github.io/embedded-code-kb/docs/stm32/uart-dma-rx-idle.html)
