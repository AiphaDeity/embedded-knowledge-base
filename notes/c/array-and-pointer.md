# C 数组和指针的区别

读到 `arr` 时，先问它出现在哪里。数组声明决定对象本来的类型，表达式的使用方式决定是否发生数组到指针的转换。

## 用同一个数组观察三种写法

| 表达式 | 在这个例子中的含义 |
| --- | --- |
| `arr` 用作赋值右侧 | 转成指向首元素的 `int *` |
| `&arr` | 取得整个数组的地址，类型为 `int (*)[5]` |
| `sizeof arr` | 直接取数组对象的大小，结果为 `5 * sizeof(int)` |

```c
int arr[5] = {1, 2, 3, 4, 5};
int *first = arr;
int (*whole)[5] = &arr;
```

`first + 1` 指向下一个元素。对 `whole` 做 `whole + 1`，步长是整个五元素数组的大小，结果位于该数组之后，不能解引用。

## 传给函数以后长度从哪里来

参数声明 `void read_samples(int arr[5]);` 会调整成 `int *arr`。在函数体里用 `sizeof arr` 得到指针大小。调试缓冲区时，回到调用点检查长度由哪个参数传入，再查循环使用的是元素个数还是字节数。

对二维数组 `int rows[2][3]`，`rows` 在转换后指向第一行，类型为 `int (*)[3]`。加一会跨过一整行，所以函数接口需要知道每行有多少列。

## 来源与练习

- [飞书原笔记《C语言指针》](https://hcn4ticlccda.feishu.cn/docx/OJ8CdWvlToXjXux4GotcmRJvng3)
- [C11 委员会草案 N1570，6.3.2.1 与 6.7.6.3](https://www.open-std.org/jtc1/sc22/wg14/www/docs/n1570.pdf)
- [代码模板库 · 嵌入式 C 代码跟读](https://aiphadeity.github.io/embedded-code-kb/docs/c-reading/)
