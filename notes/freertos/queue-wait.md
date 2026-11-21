# FreeRTOS 任务等待队列时如何执行

看串口接收代码时，先找谁产生数据、谁负责解析、中间通过什么接口交接。下面以一个任务负责接收并入队、另一个任务解析为例。

## 从等待到再次运行

1. 解析任务调用 `xQueueReceive()`。队列为空且指定非零等待时间时，任务进入阻塞态，调度器可以运行其他就绪任务。
2. 接收方把数据写入队列，等待数据的任务可以从阻塞态转到就绪态。调度器结合优先级与调度配置，决定它什么时候真正运行。
3. 解析任务获得数据后消费它。如果等待超时且未收到数据，调用返回失败。调用方根据用途选择继续等待、更新状态或记录故障。

如果生产方在中断里，调用使用 `FromISR` 版本。发送把更高优先级任务唤醒后，应按移植层约定在退出中断前请求调度。

## 队列里的数据由谁持有

FreeRTOS 队列复制的是创建队列时指定大小的元素。元素是小结构体时，写入成功后调用者可以复用自己的结构体。如果元素是指针，复制的是指针值。需要约定底层缓冲区何时交给消费者、处理完由谁归还，以及队列满时生产方怎样处理。

## 来源与示例

- [飞书原笔记《FreeRTOS 操作系统》](https://hcn4ticlccda.feishu.cn/docx/OqLvduSWUoL9jAxGzeKcgRcontg)
- [FreeRTOS 文档 · 任务状态](https://rtai.freertos.org/Documentation/02-Kernel/02-Kernel-features/01-Tasks-and-co-routines/02-Task-states)
- [FreeRTOS 文档 · 队列](https://1.freertos.org/Documentation/02-Kernel/02-Kernel-features/02-Queues-mutexes-and-semaphores/01-Queues)
- [代码模板库 · 队列交接串口数据](https://aiphadeity.github.io/embedded-code-kb/docs/freertos/queue-message.html)
