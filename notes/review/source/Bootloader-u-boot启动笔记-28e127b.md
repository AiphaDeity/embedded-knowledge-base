# Bootloader-u-boot启动笔记

[飞书原文](https://hcn4ticlccda.feishu.cn/docx/DTUbdJWxDoIJ5zxW5m4c1e0In3b)

::: tip

本笔记整理自《嵌入式u-boot最全面试题》核心内容，共 **30 组** 问答，覆盖u-boot功能、启动流程、配置、阶段加载等考点。

:::


## 1. u-boot的主要功能

u-boot，全称Universal Bootloader，是一个主要用于嵌入式系统的引导加载程序。它的主要功能包括： 系统引导：u-boot最基本的功能是引导操作系统内核到RAM中，并跳转到内核的入口点，从而完成操作系统的启动过程。		硬件初始化：在引导内核之前，u-boot会对硬件平台进行必要的初始化，包括设置CPU时钟、初始化内存、配置存储设备等。		配置管理：u-boot提供了丰富的配置选项，允许开发者根据不同的硬件平台和项目需求进行定制。		命令行界面：u-boot提供了一个命令行界面，允许用户在没有操作系统的环境下执行各种命令，如内存测试、硬件检测、文件操作等。		

## 2. u-boot是如何引导Linux内核的

u-boot引导Linux内核的过程通常包括以下几个步骤：  硬件初始化：u-boot首先会对硬件进行初始化，包括设置CPU频率、初始化SDRAM、检测并配置存储设备等。		加载内核映像：u-boot会从存储设备（如Flash、硬盘、网络等）中加载Linux内核映像到SDRAM中。		解析内核参数：u-boot会解析内核映像中的参数，如根文件系统位置、启动参数等，并将这些参数传递给内核。		跳转到内核入口：最后，u-boot会将控制权交给内核的入口点（即start_kernel函数），从而完成内核的启动过程。

## 3. u-boot支持哪些启动方式

u-boot支持多种启动方式，主要包括以下几种： 启动方式说明NAND Flash启动从NAND Flash中直接加载内核映像NOR Flash启动从NOR Flash中直接加载内核映像SDRAM启动将内核映像加载到SDRAM中再执行网络启动通过网络协议（如TFTP、NFS等）从服务器加载内核映像USB启动通过USB设备（如U盘、移动硬盘等）加载内核映像SD卡启动从SD卡中加载内核映像 u-boot的配置文件有哪些？它们的作用是什么？

## 4. u-boot的配置文件有哪些？它们的作用是什么？

u-boot的              配置文件               主要包括以下几个： Makefile：用于构建u-boot的Makefile文件，定义了编译过程中所需的各种变量和规则。		config.mk：包含了特定于平台的配置选项，如CPU类型、存储设备类型等。		include/configs/\*.h：这些头文件定义了特定平台的配置选项，如启动参数、硬件特性等。		board/vendor/model/u-boot.c：这个文件包含了特定平台的初始化代码和配置函数。		include/u-boot.h：这是u-boot的核心头文件，包含了u-boot的

## 5. 如何理解u-boot的阶段性加载

u-boot的阶段性加载是指将引导过程分为多个阶段进行，每个阶段完成特定的任务，逐步引导系统启动。这种设计可以提高引导过程的灵活性和可维护性。u-boot的阶段性加载通常包括以下几个阶段： 阶段一（Stage 1）：这是引导过程的第一步，通常由固化在CPU或ROM中的最小引导程序执行。阶段一负责初始化最基本的硬件设备，如时钟、内存等，并加载阶段二的引导加载程序到内存中。		阶段二（Stage 2）：阶段二由阶段一加载到内存中的引导加载程序执行。阶段二负责更复杂的硬件初始化和配置，以及加载和启动操作系统内核。在这个阶段，u-boot通常会提供命令行界面，允许用户进行各种配置和调试操作。	

## 6. u-boot中的make menuconfig命令是做什么用的？

make menuconfig命令是u-boot构建过程中用于配置u-boot选项的命令。它会启动一个基于文本的图形界面，允许用户通过菜单选择的方式配置u-boot的各种选项。这些选项包括但不限于硬件配置、启动参数、网络设置、              文件系统               支持等。通过make menuconfig命令，用户可以根据自己的硬件平台和项目需求定制u-boot，确保u-boot能够正确地引导操作系统内核并满足项目需求。 u-boot支持哪些文件系统？ u-boot支持多种文件系统，以便与不同的              存储               设

## 7. u-boot支持哪些文件系统？

u-boot支持多种文件系统，以便与不同的              存储               设备进行交互。以下是u-boot支持的一些常见文件系统： FAT：文件分配表（File Allocation Table）文件系统，广泛应用于Windows系统和可移动存储设备。		EXT2/EXT3/EXT4：扩展文件系统（Extended File System），是Linux系统中常用的文件系统。		JFFS2：Java闪存文件系统版本2，专为NAND Flash存储设备设计。		YAFFS：Yet Another Flash File System，另一种为NAND 

## 8. u-boot中的bootcmd和bootargs分别是什么？

bootcmd和bootargs是u-boot中两个重要的环境变量，它们在引导过程中起着关键作用。 bootcmd：这个环境变量定义了u-boot在自动启动时执行的命令序列。当u-boot完成硬件初始化和配置后，会自动执行bootcmd中定义的命令，以加载并启动操作系统内核。例如，bootcmd可能包含以下命令序列：tftp 0x40008000 uImage; bootm 0x40008000，这表示首先通过网络从TFTP服务器下载内核映像到内存地址0x40008000，然后从该地址启动内核。		bootargs：这个环境变量定义了传递给操作系统内核的启动参数。这些参数对于内核正确启动和

## 9. u-boot如何识别和使用Flash设备

u-boot识别和使用Flash设备的过程主要包括以下几个步骤： 硬件初始化：在引导过程中，u-boot首先会对硬件进行初始化，包括检测Flash设备的存在和类型。		Flash驱动加载：u-boot会根据检测到的Flash设备类型加载相应的Flash驱动程序。常见的Flash类型包括NAND Flash和NOR Flash，每种类型的Flash都需要特定的驱动程序来支持。		分区信息获取：一旦Flash驱动加载成功，u-boot会尝试获取Flash设备的分区信息。这通常涉及到解析Flash上的分区表，以确定各个分区的起始地址和大小。		文件系统识别：如果Flash设备上存在文件系

## 10. u-boot中的环境变量是如何设置的？

u-boot中的环境变量是在引导过程中设置的，可以通过多种方式进行配置： 默认环境变量：u-boot在编译时会定义一组默认的环境变量，这些变量存储在u-boot的代码中。		配置文件：u-boot可以从特定的配置文件中读取环境变量的值。这些配置文件通常位于非易失性存储设备上，如Flash设备或EEPROM。		命令行界面：在u-boot的命令行界面中，用户可以直接设置或修改环境变量的值。例如，使用setenv命令可以设置环境变量，如setenv bootcmd "tftp 0x40008000 uImage; bootm 0x40008000"。		自动配置：在某些情况下，u-bo

## 11. u-boot的Makefile结构是怎样的？如何添加新的源文件？

u-boot的Makefile结构是高度模块化的，它由多个子目录和文件组成，每个子目录负责特定的功能模块。以下是u-boot Makefile的主要组成部分： 顶层Makefile：位于u-boot项目的根目录，定义了全局的编译选项和目标。		config.mk：包含了特定于平台的配置选项。		Makefile：位于各个子目录中，定义了该目录下文件的编译规则。		rules.make：包含了一些通用的编译规则，用于生成目标文件。 要添加新的源文件到u-boot项目中，需要遵循以下步骤：

## 12. u-boot中的BOARD_CONFIG宏用于什么？

BOARD_CONFIG宏在u-boot中用于指定当前项目的硬件平台配置。这个宏在编译过程中被用来选择正确的硬件初始化代码和配置选项。每个硬件平台都应该有一个唯一的BOARD_CONFIG宏定义，以便u-boot能够识别并正确处理该平台的硬件特性。 例如，当编译针对某个特定开发板的u-boot时，可以在Makefile中设置BOARD_CONFIG宏，如下所示：

## 13. 如何在u-boot中禁用或启用特定的硬件支持？

在u-boot中，可以通过配置选项来禁用或启用特定的硬件支持。这些配置选项通常定义在include/configs/目录下的配置头文件中，或者在构建过程中通过命令行参数指定。 要禁用某个硬件支持，可以在配置文件中注释掉相应的配置选项，或者在构建时使用-符号前缀来排除该选项。例如，如果要禁用MTD子系统，可以在配置文件中注释掉CONFIG_MTD选项，或者在构建时使用make menuconfig命令取消选中MTD相关的选项。 相反，要启用某个硬件支持，可以确保相应的配置选项在配置文件中被正确设置，或者在构建时选中相应的选项。

## 14. u-boot中的CONFIG_SYS_TEXT_BASE是什么含义？

CONFIG_SYS_TEXT_BASE是一个配置选项，用于指定u-boot第二阶段加载到内存中的起始地址。这个地址通常是Flash设备的某个偏移量，表示u-boot第二阶段代码应该从该地址开始执行。 在编译u-boot时，CONFIG_SYS_TEXT_BASE的值会被嵌入到生成的二进制文件中，并在引导过程中被u-boot的第一阶段代码使用，以确保第二阶段代码被加载到正确的内存位置。 u-boot如何通过环境变量进行配置？

## 15. u-boot如何通过环境变量进行配置？

u-boot允许通过环境变量来进行配置，这使得开发者可以根据不同的硬件平台和项目需求灵活地调整u-boot的行为。环境变量可以在u-boot的命令行界面中设置，也可以通过配置文件读取。 以下是一些常见的环境变量及其用途： 环境变量用途BOOTCMD定义自动启动时执行的命令序列BOOTARGS定义传递给内核的启动参数ETHADDR定义网络接口的MAC地址IPADDR定义网络接口的IP地址SERVERIP定义TFTP或NFS服务器的IP地址ROOTPATH定义根文件系统的路径

## 16. u-boot中的printenv命令如何打印环境变量？

printenv命令在u-boot中用于打印当前设置的环境变量。这个命令可以帮助开发者和用户了解当前系统的配置信息，包括启动参数、网络设置等。使用printenv命令时，可以选择打印所有环境变量，也可以指定打印特定的环境变量。 使用printenv命令的语法如下：

## 17. u-boot中的setenv命令如何设置环境变量？

setenv命令在u-boot中用于设置或修改环境变量。这个命令允许开发者根据项目的实际需求调整u-boot的行为，例如更改启动命令、网络配置等。 使用setenv命令的语法如下：

## 18. u-boot中的saveenv命令如何保存修改后的环境变量？

saveenv命令在u-boot中用于将当前的环境变量保存到非易失性存储设备上，如Flash、              EEPROM               或SD卡。这样，在下次引导时，u-boot可以自动加载这些保存的环境变量，无需手动重新配置。 使用saveenv命令的语法如下： saveenvAI写代码

## 19. u-boot如何识别和配置SD卡？

u-boot识别和配置SD卡的步骤如下： 硬件初始化：u-boot首先会检测系统中是否存在SD卡接口，并初始化该接口。		SD卡检测：u-boot会尝试与SD卡进行通信，检测SD卡是否存在以及其类型（如SD、MMC等）。		分区信息获取：一旦检测到SD卡，u-boot会尝试获取SD卡的分区信息，包括分区的起始地址和大小。		文件系统识别：如果SD卡上有文件系统，u-boot会尝试识别并挂载该文件系统，以便通过文件系统访问SD卡上的文件和目录。		数据读写操作：通过文件系统或直接对SD卡的读写操作，u-boot可以执行数据的读写任务，如加载内核映像、保存环境变量等。		环境变

## 20. u-boot中的mmc命令有哪些功能？

mmc命令在u-boot中用于与MMC（MultiMediaCard）或SD卡进行交互。MMC是一种广泛使用的闪存卡标准，SD卡是基于MMC标准的扩展。mmc命令提供了多种功能，包括但不限于： mmc命令功能描述mmc init初始化MMC/SD卡接口mmc list列出系统中可用的MMC/SD卡mmc dev选择要使用的MMC/SD卡设备mmc read从MMC/SD卡读取数据到内存mmc write将内存中的数据写入MMC/SD卡mmc erase擦除MMC/SD卡上的数据mmc rescan重新扫描MMC/SD卡接口 u-boot如何识别和配置U盘？

## 21. u-boot如何识别和配置U盘？

u-boot识别和配置U盘的过程与SD卡类似，主要包括以下步骤： 硬件初始化：u-boot首先会检测系统中是否存在USB接口，并初始化该接口。		U盘检测：u-boot会尝试与U盘进行通信，检测U盘是否存在以及其类型（如USB Mass Storage设备）。		分区信息获取：一旦检测到U盘，u-boot会尝试获取U盘的分区信息，包括分区的起始地址和大小。		文件系统识别：如果U盘上有文件系统，u-boot会尝试识别并挂载该文件系统，以便通过文件系统访问U盘上的文件和目录。		数据读写操作：通过文件系统或直接对U盘的读写操作，u-boot可以执行数据的读写任务，如加载内核映像、

## 22. u-boot中的usb命令有哪些功能？

usb命令在u-boot中用于与USB设备进行交互。usb命令提供了多种功能，包括但不限于： usb命令功能描述usb init初始化USB接口usb start启动USB设备usb stop停止USB设备usb reset重置USB设备usb tree显示USB设备树usb storage列出USB存储设备usb massstorage配置USB Mass Storage功能

## 23. u-boot中的usb start命令如何启动USB设备？

usb start命令在u-boot中用于启动USB设备。这个命令会初始化USB接口，并尝试识别连接到USB端口的外部设备。执行usb start命令后，u-boot会扫描USB总线上的设备，并根据设备的类型和配置进行相应的处理。 例如，如果USB端口上连接了一个U盘，执行usb start命令后，u-boot会识别该U盘，并将其作为USB Mass Storage设备进行处理。同样，如果连接了一个支持USB HID协议的设备（如键盘或鼠标），u-boot会将其识别为USB HID设备。 u-boot如何实现USB Mass Storage功能？

## 24. u-boot如何实现USB Mass Storage功能？

USB Mass Storage功能允许USB设备（如U盘、移动硬盘等）被计算机识别为一个标准的存储设备，从而可以像操作本地硬盘一样对其进行读写操作。 在u-boot中实现USB Mass Storage功能通常涉及以下步骤： 硬件初始化：确保USB接口和相关的存储设备控制器已正确初始化。		USB Mass Storage协议栈：加载并初始化USB Mass Storage协议栈，这是实现USB Mass Storage功能所必需的软件组件。		设备注册：将USB设备注册到USB Mass Storage子系统中，以便操作系统能够识别并访问它。		数据传输：实现数据在USB设备和

## 25. u-boot中的ums命令有哪些功能？

ums命令在u-boot中用于实现USB Mass Storage功能。具体来说，ums命令可以将USB设备（如U盘）作为一个标准的Mass Storage设备挂载到计算机上。通过ums命令，用户可以在没有操作系统的环境下访问USB存储设备的内容。 ums命令的功能包括： ums enable：启用USB Mass Storage功能。ums disable：禁用USB Mass Storage功能。ums scan：扫描并列出所有可用的USB Mass Storage设备。ums mount：挂载指定的USB Mass Storage设备到指定目录。ums umount：卸载已挂载的USB 

## 26. u-boot如何实现USB HID功能？

USB HID（Human Interface Device）功能允许USB设备（如键盘、鼠标等）作为人机接口设备与计算机进行通信。在u-boot中实现USB HID功能通常涉及以下步骤： 硬件初始化：确保USB接口和相关的人机接口设备控制器已正确初始化。		USB HID协议栈：加载并初始化USB HID协议栈，这是实现USB HID功能所必需的软件组件。		设备注册：将USB设备注册到USB HID子系统中，以便操作系统能够识别并访问它。		事件处理：实现USB HID设备的事件处理，这通常涉及到按键或鼠标移动等输入事件的捕获和处理。 u-boot中的hid命令有哪些功能？

## 27. u-boot中的hid命令有哪些功能？

hid命令在u-boot中用于实现USB HID功能。具体来说，hid命令可以用于配置和控制USB HID设备的行为。 hid命令的功能包括： hid enable：启用USB HID功能。hid disable：禁用USB HID功能。hid scan：扫描并列出所有可用的USB HID设备。hid set_protocol：设置USB HID设备的通信协议。hid set_idle：设置USB HID设备的空闲时间。

## 28. u-boot如何实现USB OTG功能？

USB OTG（On-The-Go）功能允许USB设备在没有计算机的情况下直接相互通信。在u-boot中实现USB OTG功能通常涉及以下步骤： 硬件初始化：确保USB OTG控制器和相关的外围设备已正确初始化。		USB OTG协议栈：加载并初始化USB OTG协议栈，这是实现USB OTG功能所必需的软件组件。	角色切换：配置USB OTG控制器以确定设备角色（主机或外设）。设备连接与断开：实现设备的动态连接和断开管理。数据传输：支持OTG设备间的数据传输。 u-boot中的otg命令有哪些功能？

## 29. u-boot中的otg命令有哪些功能？

otg命令在u-boot中用于实现USB OTG功能。具体来说，otg命令可以用于配置和控制USB OTG设备的行为。 otg命令的功能包括： otg enable：启用USB OTG功能。otg disable：禁用USB OTG功能。otg host：将当前设备设置为USB OTG主机。otg device：将当前设备设置为USB OTG外设。otg mode：设置USB OTG的工作模式。otg status：显示USB OTG的状态信息。

## 30. u-boot如何实现USB Tethering功能？

USB Tethering功能允许通过USB连接将一个设备的互联网连接共享给另一个设备。在u-boot中实现USB Tethering功能通常涉及以下步骤： 硬件初始化：确保USB接口和网络控制器已正确初始化。		网络配置：配置网络接口以支持Tethering功能。		USB Tethering协议栈：加载并初始化USB Tethering协议栈，这是实现USB Tethering功能所必需的软件组件。		连接管理：管理USB Tethering连接的建立和断开。		数据路由：实现数据在两个设备间的正确路由。 u-boot中的tether命令有哪些功能？
