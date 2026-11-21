# Vs Code文件基础配置

[飞书原文](https://hcn4ticlccda.feishu.cn/docx/B1Vddpc0YoXzNlxqgQncJ6nVnMh)

你的项目文件夹/  
├─ .vscode/        ← VS Code 配置目录（IDE 侧）  
│  ├─ settings.json         ← 编辑器设置  
│  ├─ tasks.json         ← 构建/烧录任务  
│  ├─ launch.json           ← 调试配置  
│  ├─ c_cpp_properties.json ← 代码分析配置  
│  └─ extensions.json     ← 推荐扩展  
├─ src/               ← 源代码（开发者侧）  
│  └─ \*.c  
├─ include/        ← 头文件（开发者侧）  
│  └─ \*.h  
├─ Makefile     ← 构建脚本（编译器侧）  
└─ ...                    ← 其他辅助文件  
\`\`\`  
  
总结:  
1.vscode/ VS Code 的项目配置文件夹，存放所有局部设置  
2settings.json 项目专属的编辑器设置，控制代码提示、格式化等行为  
3tasks.json 项目专属的任务脚本，定义编译、烧录等可一键执行的命令  
4launch.json 项目专属的调试配置，定义如何连接调试器和启动调试  
5c_cpp_properties.json C/C++ 插件的语言分析配置，告诉 IntelliSense 头文件路径和编译器信息  
6extensions.json 推荐扩展列表，提示团队成员安装必要的插件  
7src/ 源代码文件夹，存放所有 .c 源文件  
8include/ 头文件文件夹，存放所有 .h 头文件  
9Makefile 构建脚本，定义编译规则和依赖关系，执行 make 命令时使用  
... 其他项目文件（如 README.md、.gitignore、链接脚本、配置文件等）  
  
每个文件的作用和用途:  
1. .vscode/ 文件夹  
作用： 存放当前项目的所有 VS Code 局部配置文件的容器文件夹。  
用途：  
· VS Code 会自动识别项目根目录下的 .vscode 文件夹  
· 文件夹内的配置文件仅对当前项目生效，不会影响其他项目  
· 可以将该文件夹提交到 Git，让团队成员共享相同的开发环境配置  
· 文件夹名称以点开头，在某些操作系统中默认隐藏，但 VS Code 文件管理器中正常显示  
---  
2. settings.json  
作用： 项目级别的 VS Code 设置，覆盖全局设置。  
主要用途：  
· 关闭或开启特定语言的代码提示（如你之前设置的 "C_Cpp.autocomplete": "disabled"）  
· 指定项目的编译器路径（如 "C_Cpp.default.compilerPath": "/usr/bin/arm-none-eabi-gcc"）  
· 设置代码格式化规则（缩进空格数、是否保存时自动格式化）  
· 配置头文件搜索路径，让 IntelliSense 正确识别  
· 排除不需要搜索的文件夹（如 build/、out/），提高搜索速度  
· 配置文件的关联（如让 .s 文件被识别为汇编语言）  
示例片段：  
\`\`\`json  
{  
    "C_Cpp.default.compilerPath": "/usr/bin/arm-none-eabi-gcc",  
    "C_Cpp.autocomplete": "disabled",  
    "files.associations": {  
        "\*.s": "asm"  
    },  
    "search.exclude": {  
        "build/": true,  
        "\*.o": true  
    }  
}  
\`\`\`  
---  
3. tasks.json  
作用： 定义可以在 VS Code 中一键运行的自动化任务。  
主要用途：  
· 编译任务：调用 make、cmake 或直接执行编译器命令  
· 烧录任务：执行 openocd、pyocd、jlink 等工具将固件下载到芯片  
· 清理任务：执行 make clean 删除编译中间文件  
· 组合任务：使用 dependsOn 属性串联多个任务（如先编译再烧录）  
· 快捷键 Ctrl+Shift+B 执行默认构建任务  
示例片段：  
\`\`\`json  
{  
    "version": "2.0.0",  
    "tasks": [  
        {  
            "label": "Build",  
            "type": "shell",  
            "command": "make",  
            "group": {  
                "kind": "build",  
                "isDefault": true  
            },  
            "problemMatcher": ["\$gcc"]  
        },  
        {  
            "label": "Clean",  
            "type": "shell",  
            "command": "make",  
            "args": ["clean"]  
        },  
        {  
            "label": "Build and Flash",  
            "dependsOn": ["Build"],  
            "command": "openocd",  
            "args": ["-f", "interface/stlink.cfg", "-c", "program build/firmware.elf verify reset exit"]  
        }  
    ]  
}  
\`\`\`  
---  
4. launch.json  
作用： 配置调试器如何启动和附加到程序。  
主要用途：  
· 指定要调试的 .elf 或 .out 文件路径  
· 配置调试器类型（如 cortex-debug、cppdbg）  
· 设置调试接口（SWD/JTAG）和调试器设备（J-Link、ST-Link、OpenOCD）  
· 指定芯片型号和 SVD 文件路径，支持寄存器和外设查看  
· 使用 preLaunchTask 在调试前自动编译  
· 设置断点条件、环境变量、命令行参数  
示例片段：  
\`\`\`json  
{  
    "version": "0.2.0",  
    "configurations": [  
        {  
            "name": "Cortex Debug",  
            "cwd": "\${workspaceFolder}",  
            "executable": "./build/firmware.elf",  
            "request": "launch",  
            "type": "cortex-debug",  
            "servertype": "openocd",  
            "configFiles": [  
                "interface/stlink.cfg",  
                "target/stm32f1x.cfg"  
            ],  
            "svdFile": "./.vscode/STM32F103.svd",  
            "preLaunchTask": "Build"  
        }  
    ]  
}  
\`\`\`  
---  
5. c_cpp_properties.json  
作用： 配置 Microsoft C/C++ 扩展的 IntelliSense 代码分析引擎。  
主要用途：  
· 指定编译器路径，让 IntelliSense 知道使用哪个编译器的内建宏和头文件  
· 配置头文件搜索路径（includePath），解决找不到头文件的问题  
· 定义预处理宏（defines），如 STM32F103xB、USE_HAL_DRIVER  
· 设置 C/C++ 语言标准（如 c17、gnu99、c++17）  
· 配置浏览路径（browse.path），控制符号搜索范围  
示例片段：  
\`\`\`json  
{  
    "configurations": [  
        {  
            "name": "STM32",  
            "compilerPath": "/usr/bin/arm-none-eabi-gcc",  
            "includePath": [  
                "\${workspaceFolder}/include",  
                "\${workspaceFolder}/Drivers/CMSIS/Include",  
                "\${workspaceFolder}/Drivers/STM32F1xx_HAL_Driver/Inc"  
            ],  
            "defines": [  
                "STM32F103xB",  
                "USE_HAL_DRIVER"  
            ],  
            "cStandard": "c17",  
            "cppStandard": "c++17",  
            "intelliSenseMode": "linux-gcc-arm"  
        }  
    ],  
    "version": 4  
}  
\`\`\`  
注意： 如果项目使用 clangd 替代默认 IntelliSense，可以不配置此文件，改用 compile_commands.json。  
---  
6. extensions.json  
作用： 推荐团队成员安装的扩展列表。  
主要用途：  
· 统一团队开发环境，确保每个人都使用相同的插件  
· 新成员打开项目时，VS Code 会自动提示安装缺少的推荐扩展  
· 避免因插件版本或功能差异导致的问题  
示例片段：  
\`\`\`json  
{  
    "recommendations": [  
        "ms-vscode.cpptools",  
        "marus25.cortex-debug",  
        "cschlosser.doxdocgen",  
        "xaver.clang-format",  
        "github.copilot"  
    ],  
    "unwantedRecommendations": [  
        "ms-vscode.cpptools-extension-pack"  
    ]  
}  
\`\`\`  
  
· recommendations：推荐安装的扩展  
· unwantedRecommendations：建议禁用/不安装的扩展  
---  
7. src/ 文件夹  
作用： 存放项目的所有源代码（.c 文件）。  
主要用途：  
· 存放 main.c 以及各功能模块的实现文件（如 led.c、uart.c、timer.c）  
· 编译器从该文件夹读取源文件进行编译  
· 通常按照功能模块拆分为多个 .c 文件，便于维护  
· 构建系统（Makefile）会扫描该文件夹获取需要编译的文件列表  
典型结构：  
\`\`\`  
src/  
├─ main.c  
├─ led.c  
├─ uart.c  
├─ timer.c  
└─ gpio.c  
\`\`\`  
---  
8. include/ 文件夹  
作用： 存放项目的所有头文件（.h 文件）。  
主要用途：  
· 存放函数声明、宏定义、数据类型定义、全局变量声明  
· 作为模块间的“接口说明书”，告知其他模块如何使用该功能  
· 通过 #include "led.h" 在源文件中引用  
· 支持模块化开发，降低代码耦合度  
· 通常与 src/ 中的 .c 文件一一对应  
典型结构：  
\`\`\`  
include/  
├─ main.h  
├─ led.h  
├─ uart.h  
├─ timer.h  
└─ gpio.h  
\`\`\`  
---  
9. Makefile  
作用： 自动化构建脚本，定义编译规则和依赖关系。  
主要用途：  
· 指定编译器（CC）、编译选项（CFLAGS）、链接选项（LDFLAGS）  
· 定义源文件列表和目标文件名  
· 指定头文件搜索路径（-I./include）  
· 定义编译规则（.c → .o 的转换规则）  
· 管理依赖关系，只重新编译修改过的文件  
· 提供常用目标：all（编译）、clean（清理）、flash（烧录）  
· 执行 make 命令即可完成编译  
简化示例：  
\`\`\`makefile  
CC = arm-none-eabi-gcc  
CFLAGS = -mcpu=cortex-m3 -mthumb -I./include  
SRCS = \$(wildcard src/\*.c)  
OBJS = \$(SRCS:.c=.o)  
TARGET = build/firmware.elf  
  
all: \$(TARGET)  
  
\$(TARGET): \$(OBJS)  
        \$(CC) \$(CFLAGS) -o \$@ \$^  
  
%.o: %.c  
        \$(CC) \$(CFLAGS) -c -o \$@ \$<  
  
clean:  
        rm -f \$(OBJS) \$(TARGET)  
  
flash: all  
        openocd -f interface/stlink.cfg -f target/stm32f1x.cfg -c "program \$(TARGET) verify reset exit"  
  
.PHONY: all clean flash  
\`\`\`  
---  
10. ...（其他文件）  
作用： 存放项目其他的辅助文件。  
常见文件类型：  
· README.md：项目说明文档  
· .gitignore：Git 版本控制忽略文件列表  
· .clang-format：代码格式化规则  
· .clang-tidy：静态代码分析规则  
· STM32F103.svd：芯片外设寄存器描述文件（供调试器使用）  
· STM32F103x8.ld：链接脚本（定义内存布局）  
· LICENSE：开源许可证文件  
---  
· .vscode/：给 IDE 看的  
· src/ + include/：给 开发者 和 编译器 看的  
· Makefile：给 编译器/构建系统 看的  
· ...：给 团队协作 或 工具链 用的
