# Linux驱动开发

[飞书原文](https://hcn4ticlccda.feishu.cn/docx/WK1pdrR87ocGzixaixYcTuVunEH)

# 内核模块

## 内核模块

**内核模块（Loadable Kernel Module, LKM）**：可动态加载到内核空间运行的目标文件，无需重新编译内核即可扩展内核功能。

## 模块基本组成

| 组成部分 | 作用 |
|-|-|
| **入口函数** | 模块加载时执行，完成初始化 |
| **出口函数** | 模块卸载时执行，完成资源释放 |
| **许可证声明** | 声明模块许可证，必须为GPL |

## 标准模块模板

```c
#include &lt;linux/module.h&gt;
#include &lt;linux/init.h&gt;

static int __init my_init(void)
{
    printk("module loaded\n");
    return 0;
}

static void __exit my_exit(void)
{
    printk("module unloaded\n");
}

module_init(my_init);
module_exit(my_exit);

MODULE_LICENSE("GPL");
MODULE_AUTHOR("fs6ull");
MODULE_DESCRIPTION("test module");

```

## \_\_init / \_\_exit

**\_\_init / \_\_exit**：编译器属性宏，标记函数仅在初始化/卸载阶段使用，执行后内存可回收。

## 模块编译与命令

```makefile
KERNEL_DIR = /home/linux/linux-imx
obj-m += hello.o

all:
	make -C $(KERNEL_DIR) M=$(PWD) modules
clean:
	make -C $(KERNEL_DIR) M=$(PWD) clean

```

```bash
insmod hello.ko    # 加载模块
rmmod hello        # 卸载模块
lsmod              # 列出已加载模块
dmesg              # 查看printk输出

```

# 字符设备驱动

## 字符设备

**字符设备（Character Device）**：按字节流顺序访问的设备，如串口、LED、按键。对应/dev/下设备文件，用户态通过open/read/write操作。

## file_operations结构体

**file_operations**：字符设备驱动核心结构体，将内核操作函数与用户态系统调用对应起来。

| 成员 | 对应用户态调用 |
|-|-|
| `.open` | open() |
| `.read` | read() |
| `.write` | write() |
| `.release` | close() |
| `.unlocked_ioctl` | ioctl() |

## 设备号

**设备号**：字符设备的唯一标识，由主设备号（标识驱动）和次设备号（标识具体设备）组成。

## 完整字符设备驱动模板

```c
#include &lt;linux/module.h&gt;
#include &lt;linux/fs.h&gt;
#include &lt;linux/cdev.h&gt;
#include &lt;linux/uaccess.h&gt;
#include &lt;linux/device.h&gt;

static int major;
static dev_t devid;
static struct cdev *my_cdev;
static struct class *my_class;
static char mem[100];

static int my_open(struct inode *inode, struct file *file)
{
    return 0;
}

static ssize_t my_read(struct file *file, char __user *buf, size_t cnt, loff_t *off)
{
    copy_to_user(buf, mem, cnt);
    return cnt;
}

static ssize_t my_write(struct file *file, const char __user *buf, size_t cnt, loff_t *off)
{
    copy_from_user(mem, buf, cnt);
    return cnt;
}

static struct file_operations fops = {
    .owner = THIS_MODULE,
    .open = my_open,
    .read = my_read,
    .write = my_write,
};

static int __init my_init(void)
{
    alloc_chrdev_region(&devid, 0, 1, "mydev");
    major = MAJOR(devid);
    my_cdev = cdev_alloc();
    my_cdev->ops = &fops;
    cdev_add(my_cdev, devid, 1);
    my_class = class_create(THIS_MODULE, "mydev");
    device_create(my_class, NULL, devid, NULL, "mydev");
    return 0;
}

static void __exit my_exit(void)
{
    device_destroy(my_class, devid);
    class_destroy(my_class);
    cdev_del(my_cdev);
    unregister_chrdev_region(devid, 1);
}

module_init(my_init);
module_exit(my_exit);
MODULE_LICENSE("GPL");

```


::: tip

**copy_to_user/copy_from_user**：内核空间与用户空间内存隔离，不能直接互相访问，必须通过专用函数安全拷贝。

:::


# 内存访问

## ioremap

**ioremap**：将物理寄存器地址映射为内核虚拟地址，驱动通过虚拟地址访问硬件寄存器。

## LED驱动示例

```c
#define GPIO_DR   0x0209C000
#define GPIO_GDIR 0x0209C004

static void __iomem *dr_reg, *gdir_reg;

static int __init led_init(void)
{
    gdir_reg = ioremap(GPIO_GDIR, 4);
    dr_reg = ioremap(GPIO_DR, 4);
    writel(readl(gdir_reg) | (1 << 3), gdir_reg);
    return 0;
}

static void __exit led_exit(void)
{
    iounmap(gdir_reg);
    iounmap(dr_reg);
}

```

# IO模型

| 模型 | 原理 |
|-|-|
| **阻塞IO** | 无数据时进程挂起，数据就绪后唤醒 |
| **非阻塞IO** | 无数据时立即返回错误，进程轮询 |
| **多路复用** | select/poll同时监听多个fd |
| **信号驱动IO** | 数据就绪时内核发送信号通知进程 |

# Platform总线

## 总线设备驱动模型

**Platform总线**：Linux虚拟总线，用于描述无法枚举的硬件设备（如板载平台设备），实现驱动与设备信息分离。

## 匹配机制

设备树中compatible字符串与驱动中of_match_table匹配成功后，调用probe函数。

```c
static int led_probe(struct platform_device *pdev)
{
    printk("probe\n");
    return 0;
}

static const struct of_device_id led_of_match[] = {
    { .compatible = "fs6ull,led" },
    { }
};

static struct platform_driver led_driver = {
    .probe = led_probe,
    .driver = { .of_match_table = led_of_match },
};

module_platform_driver(led_driver);

```

# 设备树

## 设备树

**设备树（Device Tree, DTS）**：描述硬件资源的数据结构文件，内核启动时解析，替代硬编码板级信息。

| 属性 | 含义 |
|-|-|
| `compatible` | 驱动匹配字符串 |
| `status` | 设备状态（okay/disabled） |
| `reg` | 寄存器地址范围 |
| `interrupts` | 中断号与触发方式 |

# 并发与竞争

| 机制 | 特点 |
|-|-|
| **原子操作** | 不可分割的操作，用于简单计数 |
| **自旋锁** | 忙等，不能睡眠，适用于短临界区与中断上下文 |
| **信号量** | 可睡眠，适用于长临界区 |
| **互斥体mutex** | 可睡眠，保护共享资源最常用 |


::: tip

**自旋锁约束**：持有自旋锁期间不得睡眠、不得调度，否则可能引发死锁。

:::


# 中断子系统

## 中断处理

```c
request_irq(irq_num, handler, IRQF_TRIGGER_FALLING, "key", NULL);

static irqreturn_t handler(int irq, void *dev_id)
{
    return IRQ_HANDLED;
}

free_irq(irq_num, NULL);

```

## 底半部机制

**底半部**：中断处理中紧急部分在顶半部完成，耗时工作推后到底半部执行，减少中断关闭时间。

| 机制 | 特点 |
|-|-|
| **tasklet** | 软中断上下文，不能睡眠 |
| **workqueue** | 进程上下文，可以睡眠 |

# 其他子系统概览

| 子系统 | 功能 |
|-|-|
| **GPIO子系统** | 统一GPIO操作API，替代直接寄存器操作 |
| **PWM子系统** | 脉冲宽度调制，LED调光、电机调速 |
| **Input子系统** | 按键/触摸屏事件统一上报 |
| **I2C子系统** | I2C设备驱动框架 |
| **SPI子系统** | SPI设备驱动框架 |
| **块设备** | 存储设备驱动框架 |
| **网络设备** | 以太网设备驱动框架 |

---

驱动开发核心脉络：编写内核模块→注册字符设备→实现文件操作接口→映射硬件寄存器→基于Platform与设备树标准化→加中断与同步保护。各子系统均为此基础上的标准化封装。
