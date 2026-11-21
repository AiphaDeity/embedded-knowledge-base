# 数据结构与算法总结版

[飞书原文](https://hcn4ticlccda.feishu.cn/docx/OC3Ddo8QSoIHfvxSt5NcYP14nzf)

# 数据结构与算法基础知识

![飞书画板](/feishu-assets/adc22d7ff7fa.jpg)

![飞书画板](/feishu-assets/72ebfdcc4f1f.jpg)


<table v-pre><tbody><tr><td>数据结构时间复杂度</td><td></td><td></td><td></td><td></td><td></td></tr><tr><td></td><td>随机访问</td><td>按值查找</td><td>插入</td><td>删除</td><td>备注</td></tr><tr><td>顺序表</td><td>O(1) </td><td>O(n) 无序<br/>O(log n)有序</td><td>O(n)（需移动）</td><td>O(n)（需移动）</td><td><br/>按值查找二分需有序</td></tr><tr><td>单向链表（无尾指针）</td><td>O(n)</td><td>O(n)</td><td>O(n)（需找前驱）</td><td>O(n)（需找前驱）</td><td><br/>尾插/尾删需遍历</td></tr><tr><td>单向链表（有尾指针）</td><td>O(n)</td><td>O(n)</td><td>O(n)（中间）</td><td>O(n)（中间）</td><td>尾删仍缺前驱</td></tr><tr><td>双向链表</td><td>O(n)</td><td>O(n)</td><td>O(1)（已知节点）</td><td>O(1)（已知节点）</td><td>需提前持有节点指针</td></tr><tr><td></td><td></td><td></td><td></td><td></td><td></td></tr><tr><td></td><td>压栈</td><td>弹栈</td><td>备注</td><td></td><td></td></tr><tr><td>顺序栈</td><td>O(1)（压栈）</td><td>O(1)（弹栈）</td><td>取栈顶 O(1)</td><td></td><td></td></tr><tr><td>链栈</td><td>O(1)（压栈）</td><td>O(1)（弹栈）</td><td>头插/头删实现，取栈顶 O(1)</td><td></td><td></td></tr><tr><td>普通顺序队列</td><td>O(1)（入队尾）</td><td>O(n)（出队首）</td><td>假溢出，出队需移动元素</td><td></td><td></td></tr><tr><td>循环队列</td><td>O(1)（入队尾）</td><td>O(1)（出队首）</td><td>取队首 O(1)</td><td></td><td></td></tr><tr><td>链队列（头尾指针）</td><td>O(1)（入队尾）</td><td>O(1)（出队首）</td><td>取队首 O(1)</td><td></td><td></td></tr><tr><td></td><td></td><td></td><td></td><td></td><td></td></tr><tr><td></td><td>按值查找</td><td>插入</td><td>删除</td><td>备注</td><td></td></tr><tr><td>哈希表</td><td>平均 O(1)<br/>最坏 O(n)</td><td>O(1) </td><td>O(1) </td><td>最坏由冲突引起</td><td></td></tr><tr><td>二叉搜索树（普通）</td><td>平均 O(log n)<br/>最坏 O(n)</td><td>平均 O(log n)<br/>最坏 O(n)</td><td>平均 O(log n)<br/>最坏 O(n)</td><td>中序遍历 O(n)</td><td></td></tr><tr><td>平衡二叉树（AVL/红黑树）</td><td>O(log n)  </td><td>O(log n)</td><td>O(log n)</td><td>保证平衡</td><td></td></tr><tr><td>堆</td><td>O(n)（任意值）</td><td><br/>O(log n)（插入）</td><td>O(log n)（删堆顶）</td><td><br/>取堆顶 O(1)；建堆 O(n)</td><td></td></tr></tbody></table>


# 线性表

## 顺序表

顺序表：

顺序表用一组地址连续的存储单元依次存储线性表中的数据元素，元素的物理顺序与逻辑顺序一致，顺序表通常用数组实现，支持随机访问（O(1)），但插入、删除需要移动大量元素（O(n)）。

```c
#ifndef SQLIST_H_
#define SQLIST_H_

//宏定义
#define LIST_INIT_SIZE 100 //定义初始分配内存大小
#define LISTINCREMENT 10 //列表增量10
#define ElemType int //定义元素类型是int类型
#define OVERFLOW 0 
#define OK 1 
#define ERROR 0 //失败，不满足插入条件

//结构体/枚举/类型别名声明
typedef struct
{
    ElemType *elem; //指向动态内存分配的指针
    int length; //当前已存储元素个数
    int listsize; //当前分配的内存最大可容纳的元素数
}SqList; //给这个结构体类型起名叫SqList

//函数声明
int InitList_Sq(SqList *L); //函数功能：初始化一个动态分配的顺序表
int AssignInitialValues_Sq(SqList *L, ElemType*values, int count); //函数功能：实现给顺序表赋初始值
int ListInsert_Sq(SqList *L, int i, ElemType e); //函数功能：实现顺序表的插入
int ListDelete_Sq(SqList*L, int i, ElemType *e); //函数功能：实现顺序表的删除
void MergeList_Sq(SqList*La, SqList*Lb, SqList*Lc); //函数功能：实现两个顺序表的合并

#endif
```

```c
#include "sqlist.h"
#include <stdlib.h>

/*
函数功能：初始化一个动态分配的顺序表
参数：一个指向结构体的指针L
*/
int InitList_Sq(SqList *L)
{
    //分配内存空间大小
    L->elem = (ElemType *)malloc(LIST_INIT_SIZE * sizeof(ElemType)); 
    if (L->elem == NULL)
    {
        return OVERFLOW; // 内存溢出或不足
    }
    L->length = 0; // 初始化顺序表长度0
    L->listsize = LIST_INIT_SIZE; // 初始化顺序表大小
    return OK;   // 初始化成功
}

/*
函数功能：实现给顺序表赋初始值
参数：指向顺序表的指针L，指向数组的指针，元素的个数
返回：int类型，OVERFLOW，内存不足。OK，成功
*/
int AssignInitialValues_Sq(SqList *L, ElemType *values, int count)
{
    //判断需要存储的元素个数是否大于当前顺序表的最大容量，如果不够就扩容
    while (count > L->listsize)
    {
        //重新分配内存
        L->elem = (ElemType *)realloc(L->elem, (L->listsize + LISTINCREMENT) * sizeof(ElemType));
        L->listsize += LISTINCREMENT;
    }
    if (L->elem == NULL)
    {
        return OVERFLOW;
    }
    for (int i = 0; i < count; i++)
    {
        L->elem[i] = values[i];
    }
    L->length = count;
    return OK;
}

/*
函数功能：实现顺序表的插入
参数：顺序表指针*L、位序i、待插入的元素
*/
int ListInsert_Sq(SqList *L, int i, ElemType e)
{
    if (i < 1 || i > L->length + 1) // 插入范围是1 <= i <= length+1
    {
        return ERROR; // 超出范围报错
    }
    if (L->length >= L->listsize) // 如果插入的容量不够，就扩容
    {
        // 在原有的基础上进行扩容，重新分配一块空间
        ElemType *newbase = (ElemType *)realloc(L->elem, (L->length + LISTINCREMENT) * sizeof(ElemType));
        if (!newbase)
        {
            exit(OVERFLOW); 
        }
        L->elem = newbase;
        L->listsize += LISTINCREMENT;
    }
    ElemType *q = &(L->elem[i - 1]);
    for (ElemType *p = &(L->elem[L->length - 1]); p >= q; --p)
    {
        *(p + 1) = *p;
    }
    *q = e;
    ++L->length;
    return OK;
}

/*
函数功能：实现顺序表的删除
参数：指向目标顺序表的指针，删除的位数，删除的位置
*/
int ListDelete_Sq(SqList *L, int i, ElemType *e)
{
    if (i < 1 || i > L->length)
    {
        return ERROR;
    }
    ElemType *p = &(L->elem[i - 1]);
    *e = *p;
    ElemType *q = L->elem + L->length - 1;
    for (++p; p <= q; ++p)
    {
        *(p - 1) = *p;
    }
    --L->length;
}

/*
函数功能：实现两个顺序表的合并
参数：指向第一个顺序表的指针，指向第二个顺序表的指针，指向合并后的顺序表的指针
*/
void MergeList_Sq(SqList *La, SqList *Lb, SqList *Lc)
{
    ElemType *pa, *pb, *pc;
    ElemType *pa_last, *pb_last;
    pa = La->elem;
    pb = Lb->elem;
    Lc->listsize = Lc->length = La->length + Lb->length;
    Lc->elem = (ElemType *)malloc(Lc->listsize * sizeof(ElemType));
    if (Lc->elem == NULL)
    {
        exit(OVERFLOW);
    }
    pc = Lc->elem;
    pa_last = La->elem + La->length - 1; // 首地址加上元素个数=末尾位置
    pb_last = Lb->elem + Lb->length - 1;
    while (pa <= pa_last && pb <= pb_last)
    {
        if (*pa <= *pb)
        {
            *pc++ = *pa++;
        }
        else
        {
            *pc++ = *pb++;
        }
    }
    while (pa <= pa_last)
    {
        *pc++ = *pa++;
    }
    while (pb <= pb_last)
    {
        *pc++ = *pb++;
    }
}
```

```c
#include "sqlist.h"
#include <stdio.h>

int main()
{
    SqList List; //
    InitList_Sq(&List);
    printf("指针的大小：%zu\n", sizeof(List.elem));
    printf("元素的个数：%d\n", List.length);
    printf("最大存的元素数量:%d\n", List.listsize);

    ElemType values[] = {10, 20, 30, 40, 50};
    int count = sizeof(values) / sizeof(ElemType);

    AssignInitialValues_Sq(&List, values, count);
    printf("AssignInitialValues:\n");
    for (int i = 0; i < List.length; i++)
    {
        printf("%3d", List.elem[i]);
    }
    printf("\n");

    ListInsert_Sq(&List, 5, 45);
    printf("插入后的顺序表是：\n");
    for (int i = 0; i < List.length; i++)
    {
        printf("%3d", List.elem[i]);
    }
    printf("\n");

    int a = 22;
    int *o = &a;
    ListDelete_Sq(&List, 4, o);
    printf("删除后的顺序表是：\n");
    for (int i = 0; i < List.length; i++)
    {
        printf("%3d", List.elem[i]);
    }
    printf("\n");

    SqList arr1;                                     // 创建一个结构体变量
    InitList_Sq(&arr1);                              // 创建一个arr1的顺序表并初始化
    ElemType values1[] = {7, 14, 23, 33, 65};        // 创建一个ElemType类型的数组
    int count1 = sizeof(values1) / sizeof(ElemType); // 数组的一共有count1个元素
    AssignInitialValues_Sq(&arr1, values1, count1);  // 调用初始化赋值函数

    SqList arr2;
    InitList_Sq(&arr2);
    ElemType values2[] = {1, 3, 6, 66, 77};
    int count2 = sizeof(values2) / sizeof(ElemType);
    AssignInitialValues_Sq(&arr2, values2, count2);

    SqList arr_res;
    InitList_Sq(&arr_res);

    MergeList_Sq(&arr1, &arr2, &arr_res);
    printf("两个顺序表合并后的顺序是：\n");
    for (int i = 0; i < arr_res.length; i++)
    {
        printf("%3d", arr_res.elem[i]);
    }
    return 0;
}
```

## 单向链表

单向链表：

通过指针将数据存储在不连续的内存空间内。每个节点包含数据域和指针域（指向下一个节点）。只能从头节点开始单向遍历。插入/删除（已知前驱）为 O(1)，但按位查找为 O(n)。

```c
/*
本头文件为单向链表头文件
文件包含宏定义，类型别名，链表结构体
*/

#ifndef LINKEDLIST_H_
#define LINKEDLIST_H_

#include <stdio.h>

//类型别名定义
typedef int ElemType; 

//描述链表的节点的结构体
typedef struct LNode 
{
    ElemType data; //数据域：存储当前节点的值
    struct LNode *next; //指针域，指向下一个节点
}LNode, *LinkList;
/*
LNode是struct LNode的别名，所以LNode node;定义了一个结构体变量
LNode是为了访问节点用的,就叫链表的节点

LinList是struct LNode *的别名 所以LinkList List;定义了一个结构体指针
为了指向头节点的,头节点就代表整个链表,因为找到头,就可以访问整个链表
所以struct LNode *别名才叫LinkList就是链表的意思
*/

//用枚举表示所有可能返回的状态
typedef enum
{
    SUCCESS = 0, //操作成功
    ERR_MALLOC = -1, //返回内存不足错误
    ERR_POS_INVALID = -2, //返回错误：位置无效
}ListStatus; 

//函数声明
//初始化头节点，并将新节点插入到
ListStatus CreateList_L(LinkList *L, ElemType n);
//打印函数，用于打印链表里面的值
void PrintfList_L(LinkList L);
//插入函数
ListStatus InsertList_L(LinkList L, int i, ElemType e);
//查找函数
ListStatus GetList_L(LinkList L, int i, ElemType *e);
//删除函数，删除链表中的节点i
ListStatus DeleteList_L(LinkList L, int i, ElemType *e);
//将两个链表进行合并
ListStatus MergeList_L(LinkList *L, LinkList *L1, LinkList *L2);

#endif
```



```c
#include "linkedlist.h"
#include <stdlib.h>

//创建一个有头节点的链表，有n个节点
ListStatus CreateList_L(LinkList *L, ElemType n)
{
    //给头节点分配空间
    //LinkList 是 LNode* 的别名，因此 LinkList *L 等价于 LNode** L
    *L = (LinkList)malloc(sizeof(LNode));
    if(*L == NULL)
    {
        return ERR_MALLOC;
    }
    //初始化头节点的指针域
    (*L)->next = NULL;
    //带头节点的链表中使用头插法插入n个元素
    for(int i = 0; i < n; i ++)
    {
        //给链表p申请一段空间
        LinkList p = (LinkList)malloc(sizeof(LNode));
        if(p == NULL)
        {
            return ERR_MALLOC;
        }
        scanf("%d", &p->data);
        p->next = (*L)->next;
        (*L)->next = p;
    }
    return SUCCESS;
}

//打印函数，用于打印链表里面的值
void PrintfList_L(LinkList L)
{
    //定义一个指针指向第一个元素
    LinkList p = L->next;
    while(p != NULL)
    {
        printf("%3d", p->data); 
        p = p->next; //移动到下一个节点
    }
    printf("\n");
}

//在链表的i位置中，插入一个节点并添加数据
ListStatus InsertList_L(LinkList L, int i, ElemType e)
{
    //定义一个指针指向头节点，然后判断位置是否有效，再遍历
    LinkList p = L;
    int j = 0;
    while(p && j<i-1)
    {
        p = p->next;
        j++;
    }
    if(!p || j>i-1)
    {
        return ERR_POS_INVALID;
    }    
    LinkList s = (LinkList)malloc(sizeof(LNode));
    if(s == NULL)
    {
        return ERR_MALLOC;
    }
    s->data = e;
    s->next = p->next;
    p->next = s;
    return SUCCESS;
}

//查找函数：输入需要查找的链表，位序，和一个承接值
ListStatus GetList_L(LinkList L, int i, ElemType *e)
{
    LinkList p = L;
    int j = 0;
     while(p && j<i-1)
    {
        p = p->next;
        j++;
    }
     // 如果遍历到链表末尾，说明 i 的值不合法，返回 ERROR
    if (!p || j > i - 1) 
    {
        return ERR_POS_INVALID;
    }
    *e = p->next->data;   //将找到的节点的数据域的值赋值给e
    return SUCCESS;
}

//删除函数，删除链表中的节点i
ListStatus DeleteList_L(LinkList L, int i, ElemType *e)
{
    LinkList p = L;
    LinkList q = NULL;
    int j = 0;
    while(p && j< i-1)
    {
        p = p->next;
        j++;
    }
      // 如果遍历到链表末尾，说明 i 的值不合法，返回 ERROR
    if (!p || j > i - 1) 
    {
        return ERR_POS_INVALID;
    }
    q = p->next;  //将需要删除的节点地址赋值给q
    p->next = q->next; //将p的指针域等于q（也就是被删除节点）的下一个节点地址
    *e = q->data;  //将被删除节点的数据传入e中
    free(q);//使用完空间及时释放，避免内存泄漏
    return SUCCESS;
}

//将两个链表进行合并
ListStatus MergeList_L(LinkList *L1, LinkList *L2, LinkList *L3)
{
    if(L3 == NULL)
    {
        return ERR_POS_INVALID;
    }
    if (*L1 == NULL || (*L1)->next == NULL || *L2 == NULL || (*L2)->next == NULL)
    {
        return ERR_POS_INVALID;
    }
    *L3 = (LinkList)malloc(sizeof(LNode));
    if (*L3 == NULL)
    {
        return ERR_MALLOC;
    }
    (*L3)->next = NULL;

    LinkList p1 = (*L1)->next;
    LinkList p2 = (*L2)->next;
    LinkList p3 = *L3;
    while(p1 != NULL && p2 != NULL)
    {
        if(p1->data <= p2->data)
        {
            p3->next = p1;
            p3 = p1;
            p1 = p1->next;
        }
        else
        {
            p3->next = p2;
            p3 = p2;
            p2 = p2->next;
        }
    } 
    p3->next = (p1 != NULL) ? (p1) : (p2);
    return SUCCESS;
}
```

```c
#include "linkedlist.h"

int main()
{
    LinkList L1, L2, L3;
    //创建一个新链表
    printf("enter 5 nubers of list:");
    CreateList_L(&L1, 5);
    printf("list1:");
    //打印函数，用于打印链表里面的值
    PrintfList_L(L1);
    
    //给链表L1的a的位置插入b值
    printf("enter xuhao and int numbers:");
    int a, b;
    scanf("%d %d", &a, &b);
    InsertList_L(L1, a, b);
    PrintfList_L(L1);

    //查找链表L1的i的位置的值e
    int i = 3;
    ElemType e = 0;
    GetList_L(L1, i, &e);
    printf("num = %d\n", e);

    //删除节点i
    int c = 4;
    ElemType d = 0;
    DeleteList_L(L1, c, &d);
    PrintfList_L(L1);
    
    //创建新的链表L2
    printf("enter 5 nubers of list:");
    CreateList_L(&L2, 5);
    printf("list2:");
    //打印函数，用于打印链表里面的值
    PrintfList_L(L2);

    //将两个链表合并
    //将两个链表进行合并
    MergeList_L(&L1, &L2, &L3);
    printf("list3:\n");
    PrintfList_L(L3);
    return 0;
}
```



## 双向链表

双向链表：

双向链表的每个节点都有一个前驱指针和后继指针，支持双向遍历，在已知节点自身的情况下，删除或插入为 O(1)。比单向链表多占用一个指针的存储空间。

## 循环链表（也可分为单向和双向）

单向循环链表：尾节点的指针指向头节点。

双向循环链表：头节点的前驱指向尾节点，尾节点的后继指向头节点。

常用于需要循环遍历的场景（如约瑟夫环、操作系统调度）。



# 栈和队列

顺序栈

链栈

顺序队列



# 数组

# 树和二叉树

# 图

# 查找算法

|  | 定义 | 特点 | 举例 | 优点 | 缺点 |
|-|-|-|-|-|-|
| 静态查找 | 静态查找是指查找过程中数据集在查找过程中是**不发生变化**的。即数据集在查找开始前就已经完全确定,并且在查找过程中不会有插入、删除或修改操作。 | ·数据集是固定的,查找过程中不允许修改(例如,不允许插入或删除元素)。  <br/>·查找操作的效率通常只依赖于数据集的结构和查找算法。  <br/>·常见的数据结构包括**顺序表**等。 | ·查找一个学生在某个班级中的位置,或者查找书籍在图书馆中的编号等。 | ·因为数据固定不变,所以可以使用一些专门为静态数据设计的高效查找算法(如二分查找)来加速查找过程 | ·不适用于数据在查找过程中需要频繁更新的场景。 |
| 动态查找 | 动态查找是指查找过程中数据集**会发生变化**,即数据集在查找过程中可能会有插入、删除或更新操作。因此,查找方法需要处理这些变化,保证在插入、删除元素时仍能高效地进行查找。 | ·数据集是动态变化的,查找过程中可能会进行插入、删除或修改操作。  <br/>·需要一种能够动态更新的数据结构,常见的有**二叉搜索树、哈希表**等。  <br/>·查找效率不仅取决于查找算法,还与数据如何变化、如何组织和更新数据有关。 | ·在线购物网站的库存管理、社交网络中的好友关系查询等。 | ·能够适应频繁修改数据的场景,灵活性更高。  <br/>·适合处理实时变化的数据集,如数据库操作。 | ·动态更新数据结构可能会使查找效率降低,需要特别优化。  <br/>·动态数据结构的实现较复杂,可能需要额外的存储和计算开销。 |

## 静态查找

### 静态查找表之顺序表的查找

静态查找表SSTable(Static Search Table )

顺序查找在静态顺序表中的实现

```c
typedef struct
{
    ElemType *elem; //指向数组数组的指针
    int length; //数组的长度
}SSTable;
```

给定一个静态顺序表 `ST`,查找关键字 `key`

```c
int Seq_Search_Sentinel(SSTable ST, ElemType key)
{
    ST.elem[0] = key; //数组的首元素作为哨兵
    int i;
    for(i = ST.length; ST.elem[i] != key; i--); //从数组最后端开始查找
    return i;
}
```

### 静态查找表之有序表的查找

折半查找（二分查找）

```c
typedef int KeyType;

typedef struct  
{
    KeyType key;
}ElemType; //结构体存储元素

typedef struct
{
    ElemType *R; //指向数组的指针
    int length; //元素的个数
}SSTable;
```

```c
int BinarySearch(SSTable ST, ElemType key)
{
    int low = 1;
    int high = ST.length;
    int mid;
    
    while(low <= high)
    {
        mid = (low + high)/2;
        if(ST.R[mid].key == key)
        {
            return mid;
        }
        else if(ST.R[mid].key < key)
        {
            low = mid + 1;  
        }
        else
        {
            high = mid - 1;
        }
    }
    return 0;
}

```

静态树表的查找

### 静态查找表之索引顺序表

## 动态查找

### 动态查找表之二叉排序树

### 动态查找表之平衡二叉树

### 动态查找表之B-树和B+树

### 哈希表（Hash table）

#### 哈希表的概念：

**散列表（哈希表）**，是根据关键码值（key value）而直接访问的数据结构。也就是说，它通过把关键码值映射到表中一个位置来访问记录，以加快查找的速度。这个映射函数叫做**散列函数（哈希函数）**，存放记录的数组叫做**散列表（哈希表）**，计算得到的存储位置叫做**散列地址（哈希地址）**。

哈希函数：Hash(key) = key%capacity

对不同的关键字可能得到同一个哈希地址，这种现象称为**冲突**（collision）。具有相同函数值的关键字对该哈希函数来说称作**同义词**（Synonym）。

若对于关键字集合中的任意一个关键字，经哈希函数映像到地址集合中任何一个地址的概率是相等的，则称此类哈希函数为**均匀的**（Uniform）哈希函数。换句话说，就是使关键字经过哈希函数的得到一个“随机的地址”，以便使一组关键字的哈希地址均匀分布在整个区间内，从而减少冲突。

#### 构建哈希表的方法：

- **直接取余法**：
- **直接定址法**：取关键字的某个线性函数为散列地址：hash(key)=A\*key+B
- 特点：面对较大范围容易造成空间浪费，灵活性差
- **数字分析法**：分析关键字的特性，选择使用哪些位（通常取随机性比较强的数）来作为哈希函数的输入参数
- **平方取中法**：通常在选定哈希函数时不一定能知道关键字的全部情况，取其中哪几位也不一定合适，而数平方后的中间几位数和数的每一位都相关，由此使随机分布的关键字得到的哈希地址也是随机的。
- **折叠法**：分割关键字，再加到一起（减少位数，增加随机性）
- **除留余数法**：取关键字被某个不大于哈希表表长m的数p除后所得余数为哈希地址。即H(key)=key MOD p(表长)。
- **随机数法**：选择一个随机函数。取关键字的随机函数值为它的哈希地址，即H(key)=random(key)。适合关键字长度不等

#### 构建哈希函数的考虑因素

- 计算哈希函数所需要时间（包括硬件指令的因素）
- 关键字的长度
- 哈希表的大小
- 关键字的分布情况
- 记录的查找频率

#### 处理冲突的方法

##### 开放定址法：

其基本思想是：当发生冲突时，通过某种探测（probe）序列在哈希表中寻找下一个空闲位置，将关键字存入。整个过程都在原哈希表数组内进行，不借助额外的链表结构。

1. 线性探测hi(key)=(h(key)+di) modm,其中di=1,2,3,…冲突后顺序查看下一个槽位,直到找到空位。优点:实现简单,对缓存友好。缺点:容易产生”一次聚集”,即大量连续槽位被占用,导致探测序列变长。
2. 二次探测hi(key)=(h(key)+i)mod m(或加上(-1)i·i2等变体)跳跃式地探测,避免线性探测的一次聚集,但可能无法探测到所有槽位(若m是素数且满足m≡3(mod 4)时,能探测到一半位置)。优点:减少聚集。缺点:产生”二次聚集”,即不同关键字映射到同一初始地址时,探测序列完全相同。
3. 伪随机探测再散列：di = 伪随机数列 
4. 双重哈希(再哈希)hi(key) =(h(key) +i.h2(key)) mod m使用第二个哈希函数h2(key)决定探测步长。○优点:使不同关键字的探测序列几乎独立,几乎避免聚集。○要求:h2(key)与m互质,通常取h2(key)=1+(key mod(m-1))或类似设计。

##### 链地址法：

链地址法（Separate Chaining，也称拉链法），它与开放定址法的核心区别在于：不试图在哈希表内部寻找空位置，而是让每个表项都成为一个链表的头指针（或动态容器），所有哈希地址相同的关键字都存入同一个链表。

基本原理

1. 哈希表是一个指针数组（或容器数组），长度为 m。
2. 插入时：计算 index=h(key)，将新结点插入到该索引对应的链表中（通常采用头插法或尾插法）。
3. 查找时：计算 index，然后在该链表中顺序查找。
4. 删除时：计算 index，在链表中找到并删除结点。

#### 哈希表的查找

无论采用哪种冲突处理方法,哈希表查找的逻辑都可以归纳为:

1. 计算哈希地址

给定关键字 key,通过哈希函数 h()计算出桶(槽)的索引:

index=h(key) mod m(m 为哈希表长度)

1. 在对应位置寻找匹配元素

- 若该位置为空→查找失败
- 若该位置非空且存储的关键字等于 key →查找成功
- 若该位置非空但关键字不等于key→发生了冲突,需要按照设定的冲突处理规则继续探测下一个可能的位置,直到找到key 或确定不存在

1. 返回结果

找到则返回对应的值(或结点),否则返回“不存在”。

#### 决定哈希表查找的ASL的因素

选用的哈希函数

选用的处理冲突的方法

哈希表饱和的程度,装载因子a=n/m值的大小(n——记录数,m——表的长度)a越大,表中记录数越多,说明表装得越满,发生冲突的可能性就越大,查找时比较次数就越多



# 排序算法

## 内部排序之直接插入排序

直接插入排序的实现

```c
#define MAX_SIZE 100
typedef int KeyType;

typedef struct  
{
    KeyType key;
}ElemType; //结构体存储元素

typedef struct
{
    ElemType r[MAX_SIZE]; //数组
    int length; //数组的长度
}SqList; //结构体数组
```

```c
void InsertSort(SqList *L)
{
    int i,j;
    //从第二个元素开始插入
    for(i = 2; i <= L->length; i++)
    {
        //如果当前元素大于前一个元素，就说明有序
        if(L->r[i].key < L->r[i-1].key)
        {
            //暂存当前元素
            L->r[0] = L->r[i];
            //将后面的元素和前面已经排序的元素相比，小于前移
            for(j = i -1; j >= 0 &&L->r[0].key < L->r[j].key; j --)
            {
                L->r[j + 1] = L->r[j] //向后移动
            }
        L->r[j+1] = L->r[0];
        }
    }
}
```

## 内部排序之冒泡排序

冒泡排序的实现

最佳情况：比较次数n-1次无移动。最差情：比较次数n(n-1)/2，等数量级移动。

时间复杂度 O(n2)

```c
#define MAX_SIZE 100
typedef int KeyType;

typedef struct  
{
    KeyType key;
}ElemType; //结构体存储元素

typedef struct
{
    ElemType r[MAX_SIZE]; //数组
    int length; //数组的长度
}SqList; //结构体数组
```

```c
void BubbleSort(SqList *L)
{
    int i,j;
    //控制外层循环次数
    for(i = 0; i < L->length - 1; i ++)
    {
        //内层循环
        for(j = 0; j < L->length - 1 - i; j++)
        {
            if(L->r[j].key > L->r[j + 1].key)
            {
                int temp = L ->r[j].key;
                L->r[j].key = L->r[j + 1].key;
                L->r[j + 1].key = temp;
            }
        }
    }
}
```

## 内部排序之快速排序

快速排序的实现。

平均时间复杂度：（nlogn）

```c

```

```c

```

## 内部排序之简单选择排序

简单选择排序的实现

所需进行记录移动的操作次数最少为0,最多为3(n-1),比较次数均为n(n-1)/2。

平均时间复杂是（n∧2）

```c

```

```c

```

## 内部排序之树形选择排序

## 内部排序之归并排序

# 问题

顺序查找的操作就是遍历，为啥叫查找？

- 遍历强调的是过程：把每个元素都过一遍，通常做同样的事（比如打印、累加）。
- 查找强调的是目的：我关心的是“是否存在某个值”以及“它的位置”。
