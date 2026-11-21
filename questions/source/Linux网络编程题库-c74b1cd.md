# Linux网络编程题库

[飞书原文](https://hcn4ticlccda.feishu.cn/docx/H8YOdLmZPoL4FDxLbSTcPhRvnif)

# 简答题

## 什么是网络体系结构？网络体系结构的分类？

网络体系结构是把网络整体按照不同的功能分成层级，水平层之间按照特定的协议通信，相邻层级之间下层给上层提供服务，上层调用封装底层的接口。主要分成OSI体系和TCP/IP体系

OSI体系是开放系统互连参考模型，是理想的网络模型，因为复杂只用于参考

TCP/IP体系是传输控制协议和网络协议族。是实际中的运用的体系

## OSI体系结构分成几层？分别是什么？

应用层：负责为用户提供网络服务，常见的协议是HTTP/HTTPS，DNS

表示层：负责对数据的格式进行处理，如翻译，压缩等，常见的协议是SSL/TSL

会话层：负责管理应用程序之间的会话，如建立、终止，常见的协议是NetBIOS,RPC

传输层：提供数据从一端到另一端的数据可靠和不可靠通信，主要是数据玩完整性方面。常见的协议是TCP和UDP协议

网络层：负责将数据从一端到另一端的传输，主要是传输路径。常见的协议是IP，ICMP，IGMP，ARP和RARP

数据链路层：主要是负责找局域网内具体的的设备，通过LLC和上层通信，通过MAC与物理层通信

硬件层：把数据转换成物理信号传输。可以转换成光信号，电信号，电磁波信号

## TCP/IP体系结构分成几层？分别是什么？说说各层常见的协议？

应用层：主要是面向用户业务、定义应用交互规则。HTTP,HTTPS,SSH,DNS,SMTP,FTP,TFTP

传输层，端口与端口间通信，提供可靠传输和不可靠传输。TCP,UDP

网络层，跨网段寻址、路由转发、IP 封装。IP,ICMP,IGMP,ARP,RARP

网络接口层，物理层传输比特流，局域网内寻找。以太网，wifi，MAC地址

## 什么是IP地址？ipv4和ipv6的区别？

IP地址是每一个用网设备的唯一身份标识

ipv4：地址长度是32位，使用点分十进制表示，由于公网IPV4地址已经分配完，所以依赖NAT协议，通过私有地址加NAT实现多台设备共用公网IP。报文首部固定20字节加可选最大60字节。安全性性可选IPSec协议，支持广播，组播和任播（但很少用）

ipv6：地址长度是128位，使用冒号加十六进制表示，地址总数很大，不需要依赖NAT协议。报文首部固定40字节，默认IPSec协议加密，不支持广播

## ipv4地址分成几类？对应的地址范围是什么？

A类大型公司1.0.0.0-126.255.255.255

127.0.0.0-127.255.255.255是本地回环地址

B类中型公司128.0.0.0-191.255.255.255

C类小型公司192.0.0.0-223.255.255.255

D类组播224.0.0.0-239.255.255.255

E类保留/科研使用240.0.0.0-255.255.255.255

## 端口号的作用是什么？

端口号是传输层用于标识同一台主机上不同网络进程的唯一数字标识，能够让操作系统知道收到的数据包应该交给哪一个具体的应用程序

## 什么是主机字节序？什么是网络字节序？

主机字节序：是CPU 在内存中存储多字节数据时，字节的排列顺序，这取决于CPU架构，因此有大端和小端之分，大端低地址存放高字节，小端低地址存放低字节

网络字节序：是网络标准中规定的大端序，为了保证不同架构的计算机和服务器能正常通信

## 写程序输出虚拟机的主机字节序是大端还是小端？（至少用两种方法）

```c
//指针法
#include <stdio.h>

int main()
{
    int a = 1;
    char *p = &a;
    if(*p == 1)
    {
        printf("小端");
    }
    else
    {
        printf("大端");
    }
    return 0;
}
```

```c
//联合体法
#include <stdio.h>

union u
{
    int a;
    char b;
};
int main()
{
    union u s;
    s.a=1;
    if(s.b == 1)
    {
        printf("小端");
    }  
    else
    {
        printf("大端");
    }
    return 0;   
}
```

## 写出基于TCP协议的网络客户端和服务端模型（伪代码即可）

```c
//服务器端
//创建流式套接字
int listen_fd = socket(AF_INET, SOCK_STREAM, 0);
//创建服务器地址信息结构体并进行绑定
struct sockaddr_in server_addr;
server_addr.sin_family = AF_INET;
server_addr.sin_port = htons(8888);
server_addr.sin_addr.s_addr = htonl(INADDR_ANY);
bind(listen_fd, (struct sockaddr*)&server_addr, sizeof(server_addr));
//使用listen把套接字改为监听状态
listen(listen_fd, 10);
//配置存储客户端地址信息结构体
struct sockaddr_in client_addr;
socklen_t client_addr_len = sizeof(client_addr);
//然后接收客户端连接，建立通信套接字
int conn_fd = accept(listen_fd, (struct sockaddr*)&client_addr, &client_addr_len);
//循环与客户端通信
while (1) {recv(conn_fd, buf, sizeof(buf), 0);send(conn_fd, buf, nbytes, 0);}
//关闭两个套接字
close(conn_fd);
close(listen_fd);
```

```c
//客户端
//创建流式套接字
int sock_fd = socket(AF_INET, SOCK_STREAM, 0);
//配置目标服务器地址信息结构体
struct sockaddr_in server_addr;
server_addr.sin_family = AF_INET;
server_addr.sin_port = htons(8888);
inet_pton(AF_INET, "192.168.130.100", &server_addr.sin_addr);
//建立客户端与服务器连接
connect(sock_fd, (struct sockaddr*)&server_addr, sizeof(server_addr));
//循环与服务器通讯
while (1) {send(sock_fd, buf, strlen(buf), 0);recv(sock_fd, buf, sizeof(buf), 0);}
//关闭套接字
close(sock_fd);
```

## “TCP”为什么是可靠连接？

面向连接：建立通信必须三次握手，断开连接需要四次挥手

确认重传：每收到一个TCP字段，接收方必须回复ACK，如果在一定时间内没有收到接收方的ACK，发送方就会重传

乱序重组：接收方根据序列号进行重组数据

去重：接收方根据ACK值会判断是不是重复值的

流量控制：接收方会通过滑动窗口告诉发送方自己的缓冲区剩余空间

拥塞控制：通过慢启动，拥塞避免，快速重传，快速恢复等算法，动态调整发送速率，避免网络拥塞崩溃

校验和：TCP 头部可添加校验和，检测IP和传输层的数据完整性，出错则丢弃报文

## 说说三次握手和四次挥手的过程？

三次握手：

第一次：发送端向服务器端发送ISN初始序列号。

第二次：服务器向发送端回复ISN序列号和ACK确认号（发送端的序列号加1）。

第三次：发送端向服务器发送ACK确认号（服务器端的序列号加1）。

四次挥手：

第一次：主动关闭方发送FIN，进入终止等待1的FIN_WAIT_1状态

第二次：被动方收到FIN后，回复ACK报文，被动方进入等待关闭的CLOSE_WAIT状态。主动方收到ACK后进入终止等待2的FIN_WAIT_2状态

第三次：被动方发送FIN，进入LAST_ACK状态

第四次：主动方收到FIN后，发送ACK报文，进入TIME_WAIT状态，通常等待2MSL时间进入关闭状态。被动方收到ACK后进入关闭状态

## 写出基于UDP协议的网络客户端和服务端模型（伪代码即可）

```c
//服务器端
//创建数据报套接字
int sockfd = socket(AF_INET, SOCK_DGRAM, 0);
//配置服务器地址信息结构体并绑定
struct sockaddr_in server_addr;
server_addr.sin_family = AF_INET;
server_addr.sin_port = htons(8888);
server_addr.sin_addr.s_addr = htonl(INADDR_ANY);
bind(sockfd, (struct sockaddr*)&server_addr, sizeof(server_addr));
//配置存储客户端信息结构体
struct sockaddr_in client_addr;
socklen_t client_addr_len = sizeof(client_addr);
char buf[128];
//循环接收信息
while (1) 
{    
    // 接收数据（同时获取客户端地址）
    recvfrom(sockfd, buf, sizeof(buf), 0,(struct sockaddr*)&client_addr, &client_addr_len);        
    // 回显给客户端（用 recvfrom 返回的地址）    
    sendto(sockfd, buf, strlen(buf), 0,(struct sockaddr*)&client_addr, client_addr_len);
}
//关闭文件描述符
close(sockfd);
```

```c
//客户端
//创建数据报套接字
int sockfd = socket(AF_INET, SOCK_DGRAM, 0);
//配置目标服务器地址信息结构体
struct sockaddr_in server_addr;
server_addr.sin_family = AF_INET;
server_addr.sin_port = htons(8888);
inet_pton(AF_INET, "192.168.1.100", &server_addr.sin_addr);
//循环发送信息
while(1)
{
    //发送
    sendto(sockfd, buf, strlen(buf), 0,(struct sockaddr*)&server_addr, sizeof(server_addr));
    //接收
    recvfrom(sockfd, buf, sizeof(buf), 0, NULL, NULL); 
}
//关闭文件描述符
close(sockfd);
```

## “TCP”“UDP”的区别？

TCP是传输控制协议，面向连接，可靠传输，以字节流进行数据传输，有流量控制和拥塞控制，首部固定20字节可扩展到60字节，传输效率慢，主要是应用在HTTP、HTTPS、FTP、SSH、SMTP等协议

UDP是用户数据报协议，无连接，不可靠传输，以数据报的形式进行传输，无流量控制和拥塞控制，首部只有8字节，传输效率快，主要是应用在DNS、TFTP等协议

## “TCP”“UDP”的优缺点？

TCP的优点是数据可靠，但传输速率慢

UDP的优点是实时性好，但数据会出现少量丢包

## “TCP”“UDP”的适用场景？

TCP适用于需要保证数据完整，不能乱的场景，比如网页浏览，邮件收发，远程登陆，支付交易

UDP适用于需要实时性，数据量大，允许少量数据丢失的场景，比如视频通过话，在线游戏

## 使用select实现tcp的并发服务器（伪代码即可）

```c
// 1. 创建监听套接字，bind，listen
int listen_fd = socket(AF_INET, SOCK_STREAM, 0);
//配置服务器结构体并绑定
bind(listen_fd, ...);
//进入监听状态
listen(listen_fd, 10);

// 2. 初始化 fd_set
fd_set read_fds, all_fds;
//清空集合
FD_ZERO(&all_fds);
//把监听套接字加入集合
FD_SET(listen_fd, &all_fds);
int max_fd = listen_fd;

while (1) {
    read_fds = all_fds;  // 每次循环重新拷贝（select 会修改集合）
    
    // 3. 调用 select（阻塞等待事件）
    int ret = select(max_fd + 1, &read_fds, NULL, NULL, NULL);
    if (ret <= 0) continue;

    // 4. 遍历所有 fd（从 0 到 max_fd，逐个检查）
    for (int i = 0; i <= max_fd; i++) {
        if (!FD_ISSET(i, &read_fds)) continue;

        if (i == listen_fd) {
            // 5. 新连接：accept，加入集合
            int conn_fd = accept(listen_fd, ...);
            FD_SET(conn_fd, &all_fds);
            if (conn_fd > max_fd) max_fd = conn_fd;
        } else {
            // 6. 普通 fd：recv 数据
            int n = recv(i, buf, sizeof(buf), 0);
            if (n <= 0) {
                close(i);
                FD_CLR(i, &all_fds);
            } else {
                send(i, buf, n, 0);
            }
        }
    }
}
```

## 使用poll实现tcp的并发服务器（伪代码即可）

```c
// 1. 创建监听套接字，bind，listen
int listen_fd = socket(AF_INET, SOCK_STREAM, 0);
bind(listen_fd, ...);
listen(listen_fd, 10);

// 2. 初始化 pollfd 数组
#define MAX_FDS 1024
struct pollfd fds[MAX_FDS];
for (int i = 0; i < MAX_FDS; i++) {
    fds[i].fd = -1;        // -1 表示空闲槽位
    fds[i].events = 0;
}
fds[0].fd = listen_fd;
fds[0].events = POLLIN;
int nfds = 1;  // 当前有效的 fd 数量

while (1) {
    // 3. 调用 poll（阻塞等待事件）
    int ret = poll(fds, nfds, -1);
    if (ret <= 0) continue;

    // 4. 遍历整个 fds 数组（poll 不区分就绪集合，需检查 revents）
    for (int i = 0; i < nfds; i++) {
        if (fds[i].fd == -1) continue;
        if (!(fds[i].revents & POLLIN)) continue;

        if (fds[i].fd == listen_fd) {
            // 5. 新连接：accept，加入数组
            int conn_fd = accept(listen_fd, ...);
            fds[nfds].fd = conn_fd;
            fds[nfds].events = POLLIN;
            nfds++;
        } else {
            // 6. 普通 fd：recv 数据
            int n = recv(fds[i].fd, buf, sizeof(buf), 0);
            if (n <= 0) {
                close(fds[i].fd);
                fds[i].fd = -1;      // 逻辑删除
                fds[i].events = 0;
            } else {
                send(fds[i].fd, buf, n, 0);
            }
        }
    }
}
```

## 使用epoll实现tcp的并发服务器（伪代码）

```c
// 1. 创建监听套接字，bind，listen
int listen_fd = socket(AF_INET, SOCK_STREAM, 0);
bind(listen_fd, ...);
listen(listen_fd, 10);

// 2. 创建 epoll 实例（红黑树根节点）
int epfd = epoll_create(1);

// 3. 将监听套接字加入 epoll
struct epoll_event ev, events[1024];
ev.events = EPOLLIN;
ev.data.fd = listen_fd;
epoll_ctl(epfd, EPOLL_CTL_ADD, listen_fd, &ev);

while (1) {
    // 4. 调用 epoll_wait（阻塞等待，只返回就绪的 fd）
    int nfds = epoll_wait(epfd, events, 1024, -1);
    if (nfds <= 0) continue;

    // 5. 只遍历就绪的 nfds 个 fd（核心优势：O(1)）
    for (int i = 0; i < nfds; i++) {
        int fd = events[i].data.fd;

        if (fd == listen_fd) {
            // 6. 新连接：accept，加入 epoll 监控
            int conn_fd = accept(listen_fd, ...);
            ev.events = EPOLLIN;
            ev.data.fd = conn_fd;
            epoll_ctl(epfd, EPOLL_CTL_ADD, conn_fd, &ev);
        } else {
            // 7. 普通 fd：recv 数据
            int n = recv(fd, buf, sizeof(buf), 0);
            if (n <= 0) {
                epoll_ctl(epfd, EPOLL_CTL_DEL, fd, NULL);
                close(fd);
            } else {
                send(fd, buf, n, 0);
            }
        }
    }
}
```

## TCP有没有丢包处理？通过什么方法处理丢包？

有，当丢包发生时，发送方在等待ACK回复时，发送缓冲区的数据会被锁定，不能清空，不能覆盖，只有收到ACK确认后才会把这个数据从发送缓冲区中移走。会通过超时重传（一定时间内没收到ACK会重发）和快速重传（4没到5到了，发送方会重复发ACK=4来请求），选择性确认（连续丢包，接收方会在发送包中附加缺少哪些包）来处理

## 为什么三次握手的客户端还需要送一次确认包？

为了确认服务器端的初始序列号，完成同步

防止已经失效的连接请求突然又传到服务器

保证双方的全双工通道能正常

## Linux系统中有几种IO模型？分别是什么？

阻塞IO：进程调用函数后，一直等待条件满足，才进行下一步

非阻塞IO：进程调用O函数后，如果条件不满足，会立即返回，会继续执行下一个任务，进程需要主动轮询直到条件满足

IO多路复用：进程阻塞在select/poll/epoll函数上，同时会监听多个文件描述符，一旦某个文件可读或者可写，函数就会返回，进程再去执行

信号驱动IO：进程先注册一个信号处理函数，然后继续执行，当内核数据准备好时，发送信号通知进程，然后进程再通过函数执行信号处理函数

异步IO：进程发起函数后立即返回，内核将数据处理完成后再通知进程

## 网络通信中阻塞和非阻塞的区别？

阻塞是建立通信连接时会阻塞等待对方的连接，如果没有连接会一直等待，等待数据时一直等待

非阻塞是如果没有连接会立即返回，会执行后续的任务

## 网络服务器模型有几种？分别是什么？

迭代循环服务器模型，一次处理一个会话

多进程并服务器模型，父进程接收然后创建子进程，子进程进行处理

多线程并发服务器模型：主线程接收，创建子线程，通过子线程处理函数处理

IO多路复用模型：通过调用select和poll和epoll同时监听多个文件描述符，哪个就绪处理哪个

## 网络服务器超时检测的方法有哪些？

通过setsockopt设置接收超时，设置发送超时

在select中使用timeout参数，如果在指定的时间内没有任何一个就绪，就返回0

将客户端套接字设置为非阻塞模式，再使用select监控connect完成状态

客户端每隔30秒与服务器通信一次

## 什么是广播？广播地址一般是什么？

广播是一对所有的通信方式，一台设备可以向同一网段内所有其他设备发送数据包，无论是否需要都会收到

广播地址分为全局广播地址255.255.255.255和子网广播地址通常是最后的一段是255

## 什么是组播？组播地址范围？

组播是一对多的通信方式，一台设备向一个组发送消息，只有加入该组的设备才能收到数据包

组播的地址范围是224.000.000.000到239.255.255.255

## 什么是UNIX域套接字？

UNIX域套接字是一种专门用于linux下实现同一台主机上不同进程间通信的套接字。通过文件系统路径名进行寻址

## 你常用的抓包软件是什么？你还知道哪些抓包软件？

最常用Wrieshark

还有Fiddler,Charles,Burp Suite

## 什么是数据库？什么是嵌入式数据库？常见的嵌入式数据库有哪些？

数据库是按照一定的数据结构来组织、存储和管理数据的仓库，通过数据库管理系统来提供增删改查等操作

嵌入式数据库是一种轻量级、无需独立安装、直接作为库链接到应用程序中的数据库，常见的有SQLite

## 什么是SQLite?它的主要特点是什么？

SQLite一个自包含、无服务器、零配置、事务性SQL 数据库引擎，是一个关系型数据库，最大的特点是轻量级、零配置和单文件存储，可以直接作为一个库链接到应用程序当中

## SQLite和MySQL有什么区别？

都是关系型数据库

SQLite是嵌入式架构，直接作为库链接到C程序，零配置直接创建调用，单文件存储，并发读写差，占用内存小，只能本地访问，文件权限少，动态类型（弱类型）

MySQL是C/S 架构，独立的后台服务进程，客户端需要通过服务器连接，需要安装配置，多文件存储，并发读写强，占用内存和硬盘空间大，需要联网，有丰富的权限，强类型，对数据类型检查严格，

## SQLite适用于哪些场景？不适合哪些场景？

SQLite 适用于本地、轻量、低并发的场景，比如：存储设备配置、网络日志或历史数据

不适合高并发写入、需要网络远程访问、数据量大和多用户权限的场景，比如购票抢票、银行交易

## 写出创建表  查询表 插入表 删除表的sql的语句？（例如：创建一张学生信息表   插入多行 各种查询  删除等）

```sql
--创建表
CREATE TABLE IF NOT EXISTS students(
    student_id INTEGER PRIMARY KEY,
    student_name TEXT NOT NULL,
    age INITGER
    ）；
--插入
INSERT INTO students VALUES (1,'alice',21);
--多行插入
INSERT INTO students VALUES (2,'bob',22),
                             (3,'tim',23);
--查询
SELECT student_id，age FROM students;
-- 指定查询
SELECT student_name FROM students WHERE age>20 ORDER BY age ASC

--改变
UPDATE students SET student_name = haha WHERE student_name = alice; 
--删除
DELETE FROM students WHERE student_id=2;
    
```

## 数据库和文件的区别？

文件是裸存储，查询需要逐行读取，只能单进程读写，没有意外数据保护，高效但原始，适合流式数据和大块数据

数据库是按照一定的结构存储数据，可以通过索引增删改查，多个进程可以同时读写，具有断电保护机制，适合历史记录，日志等

## 为什么TIME_WAIT状态需要等待2MSL？

确保最后的ACK确认号能正常到达

避免立即断开后建立新连接，但是旧数据未到达旧端口，可能会导致旧的数据到达新的端口

## TCP的粘包问题是什么？如何解决？

发送端：发送的数据量小但是频率高，并且开启了Nagle算法优化，会导致粘包

接收端：函数从内核接收缓冲区中调用的速度小于接收缓冲区接收的速度，就会导致一次性读取多个数据，导致粘包

第一种：固定长度，发送端和接收端约定每次发送和接收数据量的大小

第二种：特定分隔符，采用协议规定的结束符，但要避免数据中的干扰，使用转义

第三种：长度前缀，先发送数据大小的数据包，再发送数据

## 什么是NAT(网络地址转换)？

是一种在将私有IP地址转换成公网IP地址的技术，可以让内网设备通过公网IP上网，缓解了IPV4网络的枯竭

# 网络编程代码

## TCP通信

### TCP服务器端

```c
// TCP服务器端创建
#include <stdio.h>
#include <sys/types.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <netinet/ip.h>
#include <string.h>
#include <arpa/inet.h>
#include <unistd.h>

int main(int argc, const char *argv[])
{
    // 创建TCP流式套接字,返回文件描述符
    int listen_fd = socket(AF_INET, SOCK_STREAM, 0);
    if (listen_fd == -1)
    {
        perror("创建套接字失败");
        return -1;
    }

    // 配置服务器地址信息
    //  定义 IPv4 专用地址结构体，存储服务器的IP、端口、协议族信息
    struct sockaddr_in serverInfo;
    // 将结构体内存全部清零，避免内存脏数据导致的未知错误
    memset(&serverInfo, 0, sizeof(serverInfo));
    // 设置IPV4地址族，分配处理IPV4网络包的内核资源
    serverInfo.sin_family = AF_INET;
    // 设置端口，主机字节序转成网络字节序
    serverInfo.sin_port = htons(8888);
    // 设置IP地址，将点分十进制的IP字符串，转换为网络字节序的32位整数
    serverInfo.sin_addr.s_addr = inet_addr("192.168.130.100");

    // bind() 将套接字与指定的IP+端口绑定，让客户端可以通过该地址找到本服务
    int ret_bind = bind(listen_fd, (struct sockaddr *)&serverInfo, sizeof(serverInfo));
    if (ret_bind == -1)
    {
        perror("套接字与IP和端口绑定失败");
        return -1;
    }

    // 套接字从主动套接字转为被动监听套接字，内核创建连接队列
    int ret_len = listen(listen_fd, 5);
    if (ret_len == -1)
    {
        perror("监听设置失败");
        return -1;
    }

    // 准备存储客户端信息的结构体
    //  用于存储接入的客户端的IP、端口信息，accept 会自动填充
    struct sockaddr_in clientInfo;
    memset(&clientInfo, 0, sizeof(clientInfo));
    // 地址长度变量，传入accept时是缓冲区大小，传出时是实际地址长度
    socklen_t clientInfo_len = sizeof(clientInfo);
    printf("TCP服务器创建成功");

    // 外层循环：循环接收客户端连接
    while (1)
    {
        // accept() 阻塞等待客户端连接，从全连接队列中取出一个已完成三次握手的连接
        // 参数1：监听套接字fd，只负责接收新连接
        // 参数2：输出参数，填充客户端的地址信息
        // 参数3：输入输出参数，传入缓冲区大小，返回实际地址长度
        // 返回值：新的通信文件描述符 connect_fd，专门用于和该客户端收发数据
        int connect_fd = accept(listen_fd, (struct sockaddr *)&clientInfo, &clientInfo_len);
        if (connect_fd == -1)
        {
            perror("与客户端连接失败");
            return -1;
        }
        printf("客户端[%s,%d]与服务器连接成功", inet_ntoa(clientInfo.sin_addr), ntohs(clientInfo.sin_port));

        // 内层循环：与单个客户端持续通信
        while (1)
        {
            char buf[128] = {0};
            // recv() 从客户端套接字接收数据，默认阻塞模式，无数据时挂起等待
            // 参数1：通信套接字fd（不是监听fd）
            // 参数2：接收数据的缓冲区地址
            // 参数3：缓冲区最大可接收字节数
            // 参数4：标志位，0 表示默认阻塞模式
            // 返回值：
            //   >0：实际读到的字节数
            //   =0：对端正常关闭了连接（四次挥手完成）
            //   -1：读取出错

            int ret_recv = recv(connect_fd, buf, sizeof(buf), 0);
            if (ret_recv == -1)
            {
                perror("读取失败");
                return -1;
            }
            if (ret_recv == 0)
            {
                printf("客户端断开连接");
                break;
            }
            // 打印客户端发来的数据
            printf("客户端[%s,%d]发送的数据是%s\n", inet_ntoa(clientInfo.sin_addr), ntohs(clientInfo.sin_port), buf);

            int i = 0;
            if (strcmp(buf, "quit") == 0)
            {
                printf("客户端发送quit,关闭本次连接\n");
                close(connect_fd); // 先关掉客户端套接字
                close(listen_fd);  // 关闭监听端口
                return 0;
            }
            // 向客户端发送数据
            int ret_send = send(connect_fd, buf, ret_recv, 0);
            if (ret_send == -1)
            {
                perror("向客户端发送数据失败");
                return -1;
            }
        }
        close(connect_fd);
    }
    close(listen_fd);
    return 0;
}
```

### TCB客户端

```c
#include <stdio.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <netinet/ip.h>
#include <unistd.h>
#include <sys/types.h>
#include <arpa/inet.h>
#include <string.h>

int main(int argc, const char *argv[])
{
    // 创建TCP客户端套接字
    int socket_fd = socket(AF_INET, SOCK_STREAM, 0);
    if (socket_fd == -1)
    {
        perror("创建客户端套接字失败");
        return -1;
    }

    // 配置目标服务器地址信息
    struct sockaddr_in serverInfo = {0};
    serverInfo.sin_family = AF_INET;
    serverInfo.sin_port = htons(8888);
    serverInfo.sin_addr.s_addr = inet_addr("192.168.130.100");

    // 建立客户端与服务器连接
    int ret_connect = connect(socket_fd, (struct sockaddr *)&serverInfo, sizeof(serverInfo));
    if (ret_connect == -1)
    {
        perror("建立客户端与服务器连接失败");
        return -1;
    }

    // 客户端与服务器循环通信
    char buf[128] = {0};
    while (1)
    {
        memset(buf, 0, sizeof(buf));
        // 从键盘中读取输入
        fgets(buf, sizeof(buf), stdin);
        int i = 0;
        while (buf[i] != '\0')
        {
            if (buf[i] == '\n')
            {
                buf[i] = '\0';
                break;
            }
            i++;
        }

        if (strcmp(buf, "quit") == 0)
        {
            send(socket_fd, buf, strlen(buf), 0);
            printf("客户端主动断开连接\n");
            close(socket_fd);
            break;
        }

        // 发送数据
        ssize_t ret_send = send(socket_fd, buf, strlen(buf), 0);
        if (ret_send == -1)
        {
            perror("发送失败");
            break;
        }

        // 接收数据
        memset(buf, 0, sizeof(buf));
        ssize_t ret_recv = recv(socket_fd, buf, sizeof(buf), 0);
        if (ret_recv == -1)
        {
            perror("接收数据失败");
            break;
        }
        if (ret_recv == 0)
        {
            printf("服务器关闭");
            break;
        }
        printf("服务器发送的数据是%s\n", buf);
    }
    close(socket_fd);
    return 0;
}
```

## UDP通信

### UDP发送端

```c
#include <stdio.h>
#include <arpa/inet.h>
#include <sys/socket.h>
#include <string.h>
#include <unistd.h>

int main()
{
    // 1. 创建UDP套接字
    int sockfd = socket(AF_INET, SOCK_DGRAM, 0);
    if (sockfd == -1)
    {
        perror("socket创建失败");
        return -1;
    }

    // 2. 配置服务器目标地址
    struct sockaddr_in server_addr = {0};
    server_addr.sin_family = AF_INET;
    server_addr.sin_port = htons(8888);
    server_addr.sin_addr.s_addr = inet_addr("192.168.130.100");

    char buf[128] = {0};
    socklen_t addr_len = sizeof(server_addr);

    while (1)
    {
        memset(buf, 0, sizeof(buf));
        // 读取键盘输入
        fgets(buf, sizeof(buf), stdin);
        // 去掉fgets带入的换行符
        int i = 0;
        while (buf[i] != '\0')
        {
            if (buf[i] == '\n')
            {
                buf[i] = '\0';
                break;
            }
            i++;
        }
        
        if (strcmp(buf, "quit") == 0)
        {
            sendto(sockfd, buf, strlen(buf), 0,
                   (struct sockaddr *)&server_addr, addr_len);
            printf("发送端关闭\n");
            close(sockfd);
            break;
        }

        // 3. 发送数据到服务器
        sendto(sockfd, buf, strlen(buf), 0,
               (struct sockaddr *)&server_addr, addr_len);

        // 4. 接收服务器回显数据
        memset(buf, 0, sizeof(buf));
        int recv_len = recvfrom(sockfd, buf, sizeof(buf), 0, NULL, NULL);
        if (recv_len > 0)
        {
            printf("服务器回显：%s\n", buf);
        }
    }

    close(sockfd);
    return 0;
}
```

### UDP接收端

```c
#include <stdio.h>
#include <arpa/inet.h>
#include <sys/socket.h>
#include <string.h>
#include <unistd.h>

int main()
{
    // 1. 创建UDP套接字：SOCK_DGRAM 对应UDP协议
    int sockfd = socket(AF_INET, SOCK_DGRAM, 0);
    if(sockfd == -1)
    {
        perror("socket创建失败");
        return -1;
    }

    // 2. 绑定本机地址和端口
    struct sockaddr_in server_addr = {0};
    server_addr.sin_family = AF_INET;
    server_addr.sin_port = htons(8888);
    server_addr.sin_addr.s_addr = htonl(INADDR_ANY);

    int ret = bind(sockfd, (struct sockaddr*)&server_addr, sizeof(server_addr));
    if(ret == -1)
    {
        perror("bind绑定失败");
        close(sockfd);
        return -1;
    }
    printf("UDP服务端启动,监听8888端口...\n");

    char buf[128] = {0};
    struct sockaddr_in client_addr;
    socklen_t addr_len = sizeof(client_addr);

    while(1)
    {
        memset(buf, 0, sizeof(buf));
        // 3. 接收数据，同时获取客户端地址信息
        int recv_len = recvfrom(sockfd, buf, sizeof(buf), 0,
                                (struct sockaddr*)&client_addr, &addr_len);
        if(recv_len == -1)
        {
            perror("recvfrom接收失败");
            break;
        }

        printf("客户端[%s:%d]发来：%s\n",
               inet_ntoa(client_addr.sin_addr),
               ntohs(client_addr.sin_port),
               buf);

               
        int i = 0;
        if(strcmp(buf,"quit") == 0)
        {
            printf("服务器端关闭\n");
            close(sockfd);
            break;
        }

        // 4. 回显数据，原样发送给客户端
        sendto(sockfd, buf, recv_len, 0,
               (struct sockaddr*)&client_addr, addr_len);
    }

    close(sockfd);
    return 0;
}
```

### UDP组播发送端

```c
#include <stdio.h>
#include <sys/types.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <netinet/ip.h>
#include <arpa/inet.h>

int main(int argc, const char *argv[])
{
    // 创建UDP套接字
    int socket_fd = socket(AF_INET, SOCK_DGRAM, 0);

    // 配置组播目标地址
    struct sockaddr_in group_addr = {0};
    group_addr.sin_family = AF_INET;
    group_addr.sin_port = htons(8888);
    inet_pton(AF_INET,"224.0.0.251",&group_addr.sin_addr);

    // 设置组播包的TTL（TTL -> Time to Live）
    int ttl = 2;
    setsockopt(socket_fd, IPPROTO_IP,IP_MULTICAST_TTL,&ttl,sizeof(ttl));

    // 发送数据到组播组
    char buf[128] = "hello multicast group";
    ssize_t ret_sendto = sendto(socket_fd,buf,sizeof(buf),0,(struct sockaddr *)&group_addr,sizeof(group_addr));
    if(ret_sendto == -1)
    {
        perror("发送失败");
        close(socket_fd);
        return -1;
    }
    printf("发送%zu字节到组播组224.0.0.251:8888\n",ret_sendto);

    // 关闭
    close(socket_fd);
    return 0;
}
```

### UDP组播接收端

```c
#include <stdio.h>
#include <sys/types.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <netinet/ip.h>
#include <arpa/inet.h>
#include <net/if.h>
#include <unistd.h>

int main(int argc, const char *argv[])
{
    // 创建UDP套接字
    int socket_fd = socket(AF_INET, SOCK_DGRAM, 0);

    // 绑定本机地址和端口
    struct sockaddr_in local_addr = {0};
    local_addr.sin_family = AF_INET;
    local_addr.sin_port = htons(8888);
    local_addr.sin_addr.s_addr = htonl(INADDR_ANY);

    // 绑定套接字到本地端口
    bind(socket_fd, (struct sockaddr *)&local_addr, sizeof(local_addr));

    // 设置组播地址
    struct ip_mreqn mreq = {0};
    inet_pton(AF_INET, "224.0.0.251", &mreq.imr_multiaddr);

    // 加入组播
    int ret_set = setsockopt(socket_fd, IPPROTO_IP, IP_ADD_MEMBERSHIP, &mreq, sizeof(mreq));
    if (ret_set == -1)
    {
        perror("加入组播失败");
        close(socket_fd);
        return -1;
    }
    printf("加入组播：%s,监听端口：%d", "224.0.0.251", ntohs(local_addr.sin_port));

    // 循环接收数据
    char buf[128] = {0};
    while (1)
    {
        int recv_len = recvfrom(socket_fd, buf, sizeof(buf), 0, NULL, NULL);
        if (recv_len > 0)
        {
            printf("收到数据：%s\n", buf);
        }
    }

    close(socket_fd);
    return 0;
}
```

### UDP广播发送端

```c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>

#define BROADCAST_PORT 8888   // 接收端监听的固定端口
#define BROADCAST_IP "255.255.255.255" // 全局广播地址（发向所有网卡）

int main() {
    // 1. 创建 UDP 套接字
    // AF_INET: IPv4, SOCK_DGRAM: UDP, 0: 自动协议
    int sock_fd = socket(AF_INET, SOCK_DGRAM, 0);
    if (sock_fd == -1) {
        perror("socket 创建失败");
        return -1;
    }

    // 2. 【极其重要】开启广播权限（SO_BROADCAST）
    // 默认情况下，Linux 内核禁止发送广播包（为了防止误操作造成网络风暴）。
    // 必须显式告诉内核：我允许这个套接字发送广播包！
    int optval = 1;
    if (setsockopt(sock_fd, SOL_SOCKET, SO_BROADCAST, &optval, sizeof(optval)) == -1) {
        perror("setsockopt 开启广播失败");
        close(sock_fd);
        return -1;
    }

    // 3. 配置目标地址（广播地址）
    // 注意：这里配置的是“发给谁”，不是“绑定自己”
    struct sockaddr_in target_addr;
    memset(&target_addr, 0, sizeof(target_addr));
    target_addr.sin_family = AF_INET;
    target_addr.sin_port = htons(BROADCAST_PORT); // 接收端必须监听这个端口

    // 把字符串 "255.255.255.255" 转换成二进制网络字节序
    // 这个地址会向当前局域网内的所有设备发送数据
    if (inet_pton(AF_INET, BROADCAST_IP, &target_addr.sin_addr) != 1) {
        perror("inet_pton 转换 IP 失败");
        close(sock_fd);
        return -1;
    }

    // 4. 发送广播数据
    // 注意：发送端不需要 bind，系统会自动分配临时源端口
    char buf[128] = "Hello, this is a broadcast message!";
    ssize_t send_len = sendto(sock_fd, buf, strlen(buf), 0,
                              (struct sockaddr *)&target_addr, sizeof(target_addr));
    if (send_len == -1) {
        perror("sendto 发送广播失败");
        close(sock_fd);
        return -1;
    }
    printf("广播消息已发送（%zd 字节） -> 目标: %s:%d\n", 
           send_len, BROADCAST_IP, BROADCAST_PORT);

    // 5. 关闭套接字
    close(sock_fd);
    return 0;
}
```

### UDP广播接收端

```c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>

#define BROADCAST_PORT 8888   // 监听的固定端口（必须和发送端一致）

int main() {
    // 1. 创建 UDP 套接字
    int sock_fd = socket(AF_INET, SOCK_DGRAM, 0);
    if (sock_fd == -1) {
        perror("socket 创建失败");
        return -1;
    }

    // 2. 绑定本机地址和端口
    // 广播接收端必须固定一个端口，告诉内核：所有发往 8888 端口的数据，都交给我。
    struct sockaddr_in local_addr;
    memset(&local_addr, 0, sizeof(local_addr));
    local_addr.sin_family = AF_INET;
    local_addr.sin_port = htons(BROADCAST_PORT);
    // INADDR_ANY = 0.0.0.0，表示监听本机所有网卡（无论是 Wi-Fi 还是有线网卡）
    local_addr.sin_addr.s_addr = htonl(INADDR_ANY);

    if (bind(sock_fd, (struct sockaddr *)&local_addr, sizeof(local_addr)) == -1) {
        perror("bind 绑定失败");
        close(sock_fd);
        return -1;
    }
    printf("广播接收端已启动，监听端口 %d ...\n", BROADCAST_PORT);

    // 3. 循环接收数据
    // 注意：接收端不需要任何 setsockopt 特殊设置，广播包默认就能收到。
    char buf[256] = {0};
    struct sockaddr_in sender_addr;
    socklen_t addr_len = sizeof(sender_addr);

    while (1) {
        memset(buf, 0, sizeof(buf));
        // recvfrom 会阻塞在这里，直到收到数据包
        // 最后一个参数传入 &sender_addr 可以获取发送方的 IP 和端口（方便调试）
        ssize_t recv_len = recvfrom(sock_fd, buf, sizeof(buf) - 1, 0,
                                    (struct sockaddr *)&sender_addr, &addr_len);
        if (recv_len == -1) {
            perror("recvfrom 接收失败");
            break;
        }

        // 打印接收到的数据和发送方信息
        printf("收到广播消息（%zd 字节）来自 %s:%d -> 内容: %s\n",
               recv_len,
               inet_ntoa(sender_addr.sin_addr),  // 发送端 IP
               ntohs(sender_addr.sin_port),      // 发送端临时端口
               buf);
    }

    close(sock_fd);
    return 0;
}
```



## IO模型与并发服务器

### 多线程并发 TCP 服务器



![图片展示了多线程并发TCP服务器的代码流程。主线程先创建监听套接字（listen_fd），然后进入while(1)循环，调用accept阻塞等待新连接，若新客户端连接则返回acceptfd。接着malloc分配msg_t结构体，再通过pthread_create创建子线程，子线程执行deal_read_write函数，拷贝参数到栈上，释放动态内存，进入while(1)循环，调用recv阻塞等待数据，若大于0则处理、回显，等于0则客户端断开，小于0则出错，最后调用send发送回显数据，用strlen计算长度，最后调用close关闭acceptfd并线程退出。](/feishu-assets/9d24467055b1.png)

![这张图片展示了Linux系统下的命令行界面，左侧是TCP服务器端的代码文件，包含select网络编程相关代码，涉及客户端连接处理、数据收发等逻辑。右侧是多个终端窗口，显示了在虚拟机环境下操作网络相关命令的过程，包括进入networtp目录、执行FTP客户端程序，以及客户端连接服务器的日志信息，记录了多个客户端的IP地址、端口及连接状态，完整呈现了TCP网络编程中服务端代码运行和客户端操作的实际场景。](/feishu-assets/d4028e64bcd8.png)



```c
// ============================================================================
// 头文件包含
// ============================================================================
#include <stdio.h>          // perror, printf, fprintf
#include <stdlib.h>         // malloc, free, exit
#include <string.h>         // memset, strlen, strcat
#include <unistd.h>         // close, sleep
#include <sys/types.h>      // socket 相关类型
#include <sys/socket.h>     // socket, bind, listen, accept, send, recv
#include <netinet/in.h>     // struct sockaddr_in, htons, htonl, INADDR_ANY
#include <netinet/ip.h>     // IP 协议相关
#include <arpa/inet.h>      // inet_ntoa, inet_addr
#include <pthread.h>        // pthread_create, pthread_detach

#define PORT 8888
#define BUFFER_SIZE 128

// ----------------------------------------------------------------------------
// 自定义结构体：封装客户端连接信息，用于传递给子线程
// 注意：acceptfd 和 clientaddr 都需要被线程函数使用
// ----------------------------------------------------------------------------
typedef struct {
    int acceptfd;                   // 通信套接字（与客户端收发数据）
    struct sockaddr_in clientaddr;  // 客户端 IP 和端口
} msg_t;

// ============================================================================
// 子线程处理函数：负责与单个客户端进行持续通信
// ============================================================================
void *deal_read_write(void *arg) {
    // 【改进1】从参数中取出数据，并立即释放动态分配的内存（防止内存泄漏）
    msg_t *p_msg = (msg_t *)arg;      // 先转为结构体指针
    msg_t msg = *p_msg;               // 拷贝一份数据到栈上（安全）
    free(p_msg);                      // 释放动态分配的内存

    int acceptfd = msg.acceptfd;
    struct sockaddr_in client_addr = msg.clientaddr;

    char buf[BUFFER_SIZE] = {0};
    int nbytes = 0;

    printf("客户端 [%s:%d] 连接成功（线程 %ld）\n",
           inet_ntoa(client_addr.sin_addr),
           ntohs(client_addr.sin_port),
           pthread_self());

    // 循环接收并回显数据，直到客户端断开或出错
    while (1) {
        // 【改进2】每次循环前清空缓冲区，防止上次数据残留
        memset(buf, 0, sizeof(buf));

        nbytes = recv(acceptfd, buf, sizeof(buf) - 1, 0);
        if (nbytes == -1) {
            perror("recv 接收失败");
            break;      // 出错，退出线程
        } else if (nbytes == 0) {
            // recv 返回 0，表示客户端主动关闭连接
            printf("客户端 [%s:%d] 已断开连接\n",
                   inet_ntoa(client_addr.sin_addr),
                   ntohs(client_addr.sin_port));
            break;      // 退出线程
        }

        // 正常收到数据
        printf("客户端 [%s:%d] 发来数据：%s\n",
               inet_ntoa(client_addr.sin_addr),
               ntohs(client_addr.sin_port),
               buf);

        // 给回显数据添加后缀
        strcat(buf, " -- 来自服务端");

        // 【改进3】发送时使用 strlen(buf)，而不是 BUFFER_SIZE
        // 只发送有效数据，避免发送未初始化的脏数据
        if (send(acceptfd, buf, strlen(buf), 0) == -1) {
            perror("send 回显失败");
            break;
        }
    }

    // 线程退出前关闭通信套接字
    close(acceptfd);
    printf("线程 %ld 结束\n", pthread_self());

    // 线程退出
    pthread_exit(NULL);
}

// ============================================================================
// 主函数（主线程）
// ============================================================================
int main() {
    // ------------------------------------------------------------------------
    // 1. 创建监听套接字
    // ------------------------------------------------------------------------
    int listen_fd = socket(AF_INET, SOCK_STREAM, 0);
    if (listen_fd == -1) {
        perror("socket 创建失败");
        return -1;
    }

    // ------------------------------------------------------------------------
    // 2. 【改进4】设置端口复用（SO_REUSEADDR）
    //    防止服务器崩溃后端口被占用（TIME_WAIT 状态）
    // ------------------------------------------------------------------------
    int reuse = 1;
    if (setsockopt(listen_fd, SOL_SOCKET, SO_REUSEADDR, &reuse, sizeof(reuse)) == -1) {
        perror("setsockopt 设置端口复用失败");
        close(listen_fd);
        return -1;
    }

    // ------------------------------------------------------------------------
    // 3. 配置服务器地址结构体
    // ------------------------------------------------------------------------
    struct sockaddr_in server_addr;
    memset(&server_addr, 0, sizeof(server_addr));
    server_addr.sin_family = AF_INET;
    server_addr.sin_port = htons(PORT);

    // 【改进5】监听所有网卡（INADDR_ANY = 0.0.0.0）
    // 原写法：inet_addr("192.168.136.130") 只监听特定 IP，换环境失效
    server_addr.sin_addr.s_addr = htonl(INADDR_ANY);

    // ------------------------------------------------------------------------
    // 4. 绑定（bind）
    // ------------------------------------------------------------------------
    if (bind(listen_fd, (struct sockaddr *)&server_addr, sizeof(server_addr)) == -1) {
        perror("bind 绑定失败");
        close(listen_fd);
        return -1;
    }

    // ------------------------------------------------------------------------
    // 5. 监听（listen）
    // ------------------------------------------------------------------------
    if (listen(listen_fd, 10) == -1) {
        perror("listen 监听失败");
        close(listen_fd);
        return -1;
    }

    printf("【多线程并发 TCP 服务器】启动，监听端口 %d\n", PORT);
    printf("（使用 Ctrl+C 终止服务器）\n");

    // ------------------------------------------------------------------------
    // 6. 主循环：接受连接，创建子线程
    // ------------------------------------------------------------------------
    struct sockaddr_in client_addr;
    socklen_t client_addr_len = sizeof(client_addr);
    int acceptfd = 0;
    pthread_t tid = 0;
    msg_t *p_msg = NULL;   // 用于动态分配参数结构体

    while (1) {
        // ----------------------------------------------------------------
        // 6.1 接受客户端连接（阻塞）
        // ----------------------------------------------------------------
        acceptfd = accept(listen_fd, (struct sockaddr *)&client_addr, &client_addr_len);
        if (acceptfd == -1) {
            perror("accept 接受连接失败");
            continue;   // 继续等待下一个连接
        }

        // ----------------------------------------------------------------
        // 6.2 【改进6】动态分配内存，用于传递参数给子线程
        //    原因：msg 如果定义在主线程的栈上，循环会覆盖它。
        //    子线程可能还未读取数据，主线程就已经修改了 msg。
        //    使用 malloc 分配的内存，每个线程拥有独立的一份，互不干扰。
        // ----------------------------------------------------------------
        p_msg = (msg_t *)malloc(sizeof(msg_t));
        if (p_msg == NULL) {
            perror("malloc 分配内存失败");
            close(acceptfd);
            continue;
        }
        p_msg->acceptfd = acceptfd;
        p_msg->clientaddr = client_addr;

        // ----------------------------------------------------------------
        // 6.3 创建子线程
        // ----------------------------------------------------------------
        int ret = pthread_create(&tid, NULL, deal_read_write, (void *)p_msg);
        if (ret != 0) {
            // 线程创建失败，释放已分配的内存，关闭套接字
            fprintf(stderr, "pthread_create 失败: %s\n", strerror(ret));
            free(p_msg);
            close(acceptfd);
            continue;
        }

        // ----------------------------------------------------------------
        // 6.4 【改进7】分离线程（detach）
        //    分离后，线程结束后自动回收资源，主线程无需调用 pthread_join
        // ----------------------------------------------------------------
        ret = pthread_detach(tid);
        if (ret != 0) {
            fprintf(stderr, "pthread_detach 失败: %s\n", strerror(ret));
            // 分离失败不影响线程运行，但可能导致资源回收不及时，这里仅打印错误
        }
    }

    // 关闭监听套接字（实际不会执行到这里，因为 while(1) 死循环）
    close(listen_fd);
    return 0;
}
```

### 多进程 fork 并发服务器

![图片展示了多进程fork并发服务器的流程图。父进程注册SIGCHLD信号处理函数，进入循环，先调用accept阻塞等待新连接，新客户端到来返回conn_fd。父进程fork出子进程，子进程关闭listen_fd，进入循环调用recv阻塞等待数据，处理数据后返回，若客户端断开则break，出错也break。父进程关闭conn_fd，回到accept，等待下一个客户端。该图与文档中多进程fork并发服务器内容相关，直观呈现了其工作流程。](/feishu-assets/d16b8247ccd3.png)

![图片展示了多进程fork并发服务器的代码及运行情况。左侧是代码编辑界面，显示了process_server目录下的多个文件，其中process_server.c文件被高亮显示。右侧是终端界面，显示了在alpha@alpha-virtual-machine:/mnt/vserver/process_server下执行命令“python3 server.py”的结果，输出了“\[1\] 10000”等信息。该图片与文档中“多进程fork并发服务器”部分内容对应，直观呈现了代码运行环境。](/feishu-assets/625ad13639f0.png)



```c
// ============================================================================
// 头文件包含（每个头文件的作用都有注释）
// ============================================================================
#include <stdio.h>          // perror, printf, fprintf
#include <stdlib.h>         // exit, EXIT_SUCCESS, EXIT_FAILURE
#include <string.h>         // memset, strlen, strcat
#include <unistd.h>         // close, fork, getpid, sleep
#include <sys/types.h>      // socket 相关类型（pid_t, ssize_t 等）
#include <sys/socket.h>     // socket, bind, listen, accept, send, recv
#include <sys/wait.h>       // waitpid, WNOHANG（用于回收子进程）
#include <netinet/in.h>     // struct sockaddr_in, htons, htonl, INADDR_ANY
#include <netinet/ip.h>     // IP 协议相关（通常由 in.h 包含）
#include <arpa/inet.h>      // inet_ntoa（将二进制 IP 转成点分十进制字符串）
#include <signal.h>         // signal, struct sigaction（信号处理）

#define PORT 8888           // 服务器监听的端口号
#define BUFFER_SIZE 128     // 数据缓冲区大小

// ============================================================================
// 【改进1】信号处理函数（标准做法：用 SIGCHLD 回收子进程）
// ============================================================================
// 功能：当父进程收到 SIGCHLD 信号时，该函数被调用。
//       它循环调用 waitpid，非阻塞地回收所有已经终止的子进程，防止僵尸进程。
// 参数：signum 是信号编号（这里不使用，但必须保留）
// 返回值：无
void sigchld_handler(int signum) {
    // waitpid(-1, NULL, WNOHANG) 的含义：
    //   -1     ：等待任意一个子进程
    //   NULL   ：不关心子进程的退出状态
    //   WNOHANG：如果没有子进程退出，立即返回（非阻塞）
    // 循环直到没有更多已退出的子进程为止
    while (waitpid(-1, NULL, WNOHANG) > 0) {
        // 每次回收一个子进程，循环继续，直到全部回收完毕
    }
    // 注意：使用 while 循环而不是 if，是因为多个子进程可能同时退出，
    // 而 SIGCHLD 信号在排队时可能会合并，导致只触发一次信号处理函数。
    // 循环可以一次性回收所有已经退出的子进程。
}

// ============================================================================
// 主函数
// ============================================================================
int main() {

    // ------------------------------------------------------------------------
    // 1. 创建监听套接字
    // ------------------------------------------------------------------------
    // int socket(int domain, int type, int protocol);
    //   domain:  AF_INET      → IPv4
    //   type:    SOCK_STREAM  → TCP（流式套接字）
    //   protocol: 0            → 自动选择 TCP
    // 返回值：成功返回文件描述符（非负整数），失败返回 -1
    int listen_fd = socket(AF_INET, SOCK_STREAM, 0);
    if (listen_fd == -1) {
        perror("socket 创建失败");
        return -1;
    }

    // ------------------------------------------------------------------------
    // 2. 【改进2】设置端口复用（SO_REUSEADDR）
    // ------------------------------------------------------------------------
    // 为什么要加这一行？
    //   如果服务器程序崩溃或异常退出，操作系统会保持 TIME_WAIT 状态，
    //   默认需要 2MSL（约 1~4 分钟）才能释放端口。
    //   加上 SO_REUSEADDR 可以让程序结束后立即重启，不用等端口释放。
    // 注意：必须在 bind 之前设置！
    int reuse = 1;
    if (setsockopt(listen_fd, SOL_SOCKET, SO_REUSEADDR, &reuse, sizeof(reuse)) == -1) {
        perror("setsockopt 设置端口复用失败");
        close(listen_fd);
        return -1;
    }

    // ------------------------------------------------------------------------
    // 3. 配置服务器地址结构体
    // ------------------------------------------------------------------------
    struct sockaddr_in server_addr;
    memset(&server_addr, 0, sizeof(server_addr));  // 清空结构体，防止脏数据
    server_addr.sin_family = AF_INET;               // IPv4
    server_addr.sin_port = htons(PORT);             // 端口号转网络字节序（大端）

    // 【改进3】监听所有网卡（INADDR_ANY = 0.0.0.0）
    // 原来写法：inet_addr("192.168.26.128")  → 只监听特定 IP，换环境就失效
    // 改进后：htons(INADDR_ANY)              → 监听所有网卡，适应任何环境
    server_addr.sin_addr.s_addr = htonl(INADDR_ANY);

    // ------------------------------------------------------------------------
    // 4. 绑定（bind）
    // ------------------------------------------------------------------------
    // int bind(int sockfd, const struct sockaddr *addr, socklen_t addrlen);
    //   sockfd: 监听套接字
    //   addr:   服务器地址结构体（需要强转为通用 sockaddr* 类型）
    //   addrlen: 结构体的大小
    // 返回值：成功返回 0，失败返回 -1
    if (bind(listen_fd, (struct sockaddr *)&server_addr, sizeof(server_addr)) == -1) {
        perror("bind 绑定失败");
        close(listen_fd);
        return -1;
    }

    // ------------------------------------------------------------------------
    // 5. 监听（listen）
    // ------------------------------------------------------------------------
    // int listen(int sockfd, int backlog);
    //   sockfd:  已经绑定好的套接字
    //   backlog: 全连接队列的最大长度（等待 accept 的最大连接数）
    // 返回值：成功返回 0，失败返回 -1
    if (listen(listen_fd, 10) == -1) {
        perror("listen 监听失败");
        close(listen_fd);
        return -1;
    }

    // ------------------------------------------------------------------------
    // 6. 【改进1】注册 SIGCHLD 信号处理函数（标准做法）
    // ------------------------------------------------------------------------
    // 当子进程退出时，内核会向父进程发送 SIGCHLD 信号。
    // 父进程收到信号后，调用 sigchld_handler 来回收子进程资源。
    // 相比于原来的 SIGUSR1 方式，这是 Linux/Unix 系统下的标准做法。
    signal(SIGCHLD, sigchld_handler);

    printf("【多进程并发 TCP 服务器】启动，监听端口 %d\n", PORT);
    printf("（使用 Ctrl+C 终止服务器）\n");

    // ------------------------------------------------------------------------
    // 7. 主循环：不断接受新连接，为每个连接创建子进程
    // ------------------------------------------------------------------------
    struct sockaddr_in client_addr;          // 用于存储客户端的 IP 和端口
    socklen_t client_addr_len = sizeof(client_addr);
    int conn_fd = 0;                         // 通信套接字（用于与客户端收发数据）
    pid_t pid = 0;                           // 子进程 ID

    while (1) {

        // ----------------------------------------------------------------
        // 7.1 接受客户端连接（accept）
        // ----------------------------------------------------------------
        // int accept(int sockfd, struct sockaddr *addr, socklen_t *addrlen);
        //   sockfd: 监听套接字
        //   addr:   输出参数，内核会把客户端的 IP + 端口填进去
        //   addrlen: 传入地址结构体大小，内核会修改为实际大小
        // 返回值：成功返回新的通信套接字（用于该客户端），失败返回 -1
        // 注意：accept 是阻塞函数，如果没有客户端连接，程序会停在这里。
        conn_fd = accept(listen_fd, (struct sockaddr *)&client_addr, &client_addr_len);
        if (conn_fd == -1) {
            perror("accept 接受连接失败");
            // 如果 accept 出错，不应该直接退出，因为可能是信号中断（EINTR）等临时错误。
            // 这里用 continue 继续循环，而不是 break。
            // 但为了不让代码陷入死循环（如果一直出错），简单起见我们继续。
            continue;
        }

        // ----------------------------------------------------------------
        // 7.2 创建子进程（fork）
        // ----------------------------------------------------------------
        // pid_t fork(void);
        // 调用一次，返回两次：
        //   - 在父进程中：返回子进程的 PID（>0）
        //   - 在子进程中：返回 0
        //   - 如果出错：返回 -1
        pid = fork();

        if (pid == -1) {
            // 创建子进程失败
            perror("fork 创建子进程失败");
            close(conn_fd);     // 关闭当前客户端连接
            continue;           // 继续等待下一个连接
        }

        // ================================================================
        // 情况一：子进程（pid == 0）
        // ================================================================
        if (pid == 0) {

            // 【改进4】子进程必须关闭监听套接字（listen_fd）
            // 原因：子进程从父进程继承了所有文件描述符，包括 listen_fd。
            //       子进程不需要监听新连接，只需要和当前客户端通信。
            //       如果不关闭，会浪费一个文件描述符资源。
            //       注意：关闭子进程的 listen_fd 副本，不影响父进程的 listen_fd。
            close(listen_fd);

            // 打印客户端连接信息（在子进程中打印）
            printf("子进程 [PID: %d] 服务客户端 [%s:%d]\n",
                   getpid(),
                   inet_ntoa(client_addr.sin_addr),
                   ntohs(client_addr.sin_port));

            // 【改进5】子进程循环通信（原先只收一次就退出）
            // 现在改成 while(1) 持续收发，直到客户端断开连接或出错
            char buf[BUFFER_SIZE] = {0};
            int nbytes = 0;

            while (1) {
                // 清空接收缓冲区
                memset(buf, 0, sizeof(buf));

                // 接收客户端发送的数据
                // int recv(int sockfd, void *buf, size_t len, int flags);
                //   sockfd: 通信套接字
                //   buf:    数据缓冲区
                //   len:    缓冲区大小（防止溢出）
                //   flags:  0（阻塞模式）
                // 返回值：>0 表示成功收到的字节数；0 表示客户端主动关闭连接；-1 表示出错
                nbytes = recv(conn_fd, buf, sizeof(buf) - 1, 0);

                if (nbytes == -1) {
                    perror("recv 接收失败");
                    break;  // 出错，退出子进程
                } else if (nbytes == 0) {
                    // recv 返回 0，表示客户端主动调用了 close()，四次挥手完成
                    printf("客户端 [%s:%d] 已断开连接\n",
                           inet_ntoa(client_addr.sin_addr),
                           ntohs(client_addr.sin_port));
                    break;  // 退出子进程
                }

                // 正常收到数据
                printf("客户端 [%s:%d] 发来数据：%s\n",
                       inet_ntoa(client_addr.sin_addr),
                       ntohs(client_addr.sin_port),
                       buf);

                // 给回显数据添加一个后缀，让客户端知道这是服务器的回复
                strcat(buf, " -- 来自服务端");

                // 【改进6】发送时使用 strlen(buf)，而不是 BUFFER_SIZE
                // 原错误写法：send(conn_fd, buf, BUFFER_SIZE, 0)
                //   会把整个 128 字节数组都发出去，包括未初始化的脏数据！
                // 正确写法：只发 strlen(buf) 个字节（即有效字符串长度）
                if (send(conn_fd, buf, strlen(buf), 0) == -1) {
                    perror("send 回显失败");
                    break;
                }
            }

            // 子进程退出前关闭通信套接字
            close(conn_fd);

            // 子进程正常退出
            // 父进程会收到 SIGCHLD 信号，在信号处理函数中用 waitpid 回收。
            exit(0);
        }

        // ================================================================
        // 情况二：父进程（pid > 0）
        // ================================================================
        else {
            // 父进程必须关闭通信套接字（conn_fd）
            // 原因：父进程只需要监听套接字来 accept 新连接，不需要与客户端通信。
            //       通信工作已经交给子进程了。
            //       如果不关闭，父进程会持有 conn_fd，浪费文件描述符资源。
            //       注意：关闭父进程的 conn_fd 副本，不影响子进程的 conn_fd。
            close(conn_fd);

            // 父进程继续 while 循环，回到 accept 等待下一个新客户
        }
    }

    // ==========================================================================
    // 8. 关闭监听套接字（程序正常退出时才会执行到这里）
    // ==========================================================================
    // 实际上上面的 while(1) 是死循环，程序通常用 Ctrl+C 终止。
    // 进程终止时，操作系统会自动回收所有文件描述符。
    // 但写上 close 是一个良好的编程习惯。
    close(listen_fd);
    return 0;
}
```

### IO 多路复用select函数

![图片展示了多线程并发TCP服务器中IO多路复用select函数的工作流程。首先，将readfd_modify_set备份为readfd_save_set。接着调用select函数，内核“卡住”直到有新连接请求、客户端来数据或出错中断。select返回后，修改readfd_modify_set，只剩“就绪”描述符。再遍历event_fd到max_fd，若FD_ISSET为假跳过，为真则处理新连接、读数据或移出总名单等操作。最后回到循环顶部，重新拷贝总名单，再次调用select。](/feishu-assets/2aaa4e68474d.png)

![图片展示了Linux网络编程中IO多路复用select函数的代码及运行结果。左侧代码部分，有对网络相关函数的调用，如`socket()``bind()``listen()`等，以及对`select()`函数的使用。右侧运行结果中，显示了网络地址、端口、进程ID等信息，如“alpha@alpha virtual machine:~/network”“192.168.100.49:49000”“192.168.100.49:49000”等。图片与上下文紧密相关，直观呈现了代码运行效果。](/feishu-assets/e2fc1992a079.png)



```c
#include <stdio.h>          // perror, printf
#include <stdlib.h>         // exit
#include <string.h>         // memset
#include <unistd.h>         // close, read, write
#include <sys/types.h>      // socket 相关类型
#include <sys/socket.h>     // socket, bind, listen, accept, send, recv
#include <sys/select.h>     // select, fd_set, FD_ZERO, FD_SET, FD_CLR, FD_ISSET
#include <netinet/in.h>     // struct sockaddr_in, htons, htonl, INADDR_ANY
#include <netinet/ip.h>     // IP 协议相关（通常由 in.h 包含）
#include <arpa/inet.h>      // inet_ntoa

#define PORT 8888           // 服务器监听的端口号
#define BUFFER_SIZE 128     // 接收数据缓冲区大小

int main() {

    // ===================================================================
    // 第 1 步：创建监听套接字（Socket）
    // ===================================================================
    // int socket(int domain, int type, int protocol);
    //   domain:  AF_INET      → IPv4 地址族
    //   type:    SOCK_STREAM  → 流式套接字（TCP）
    //   protocol: 0           → 自动选择 TCP 协议
    // 返回值：成功返回文件描述符（整数），失败返回 -1
    int listen_fd = socket(AF_INET, SOCK_STREAM, 0);
    if (listen_fd == -1) {
        perror("socket 创建失败");  // perror 会打印系统错误信息
        return -1;
    }

    // ===================================================================
    // 第 2 步：配置服务器地址结构体
    // ===================================================================
    // struct sockaddr_in {
    //     sa_family_t    sin_family;   // 地址族（AF_INET）
    //     in_port_t      sin_port;     // 端口号（网络字节序）
    //     struct in_addr sin_addr;     // IP 地址（网络字节序）
    // };
    struct sockaddr_in server_addr;
    memset(&server_addr, 0, sizeof(server_addr));  // 清空结构体，防止脏数据
    server_addr.sin_family = AF_INET;              // 使用 IPv4
    server_addr.sin_port = htons(PORT);            // htons: 主机字节序 → 网络字节序（大端）
    // 【改进点】htons 将主机字节序转为网络字节序（大端）

    // 【改进点】INADDR_ANY 是 0.0.0.0，表示监听本机所有网卡（Wi-Fi、有线、虚拟网卡）
    // 相比写死 "192.168.26.128"，这样换网络环境无需修改代码
    server_addr.sin_addr.s_addr = htonl(INADDR_ANY);  // htonl: 主机字节序 → 网络字节序（大端）

    // ===================================================================
    // 第 3 步：绑定（Bind）—— 把套接字和 IP + 端口绑定
    // ===================================================================
    // int bind(int sockfd, const struct sockaddr *addr, socklen_t addrlen);
    //   sockfd:  监听套接字
    //   addr:    服务器地址结构体的指针（需要强转为通用 sockaddr*）
    //   addrlen: 结构体的大小
    // 返回值：成功返回 0，失败返回 -1
    if (bind(listen_fd, (struct sockaddr *)&server_addr, sizeof(server_addr)) == -1) {
        perror("bind 绑定失败");
        close(listen_fd);   // 绑定时出错，需要关闭套接字释放资源
        return -1;
    }

    // ===================================================================
    // 第 4 步：监听（Listen）—— 把主动套接字变成被动监听套接字
    // ===================================================================
    // int listen(int sockfd, int backlog);
    //   sockfd:  已绑定的套接字
    //   backlog: 全连接队列的最大长度（等待 accept 的最大连接数）
    // 返回值：成功返回 0，失败返回 -1
    if (listen(listen_fd, 10) == -1) {
        perror("listen 监听失败");
        close(listen_fd);
        return -1;
    }

    // ===================================================================
    // 第 5 步：select 机制的初始化
    // ===================================================================
    // fd_set 是一个位图（bitmap）结构，每一位代表一个文件描述符（0~1023）。
    // 它由内核维护，用来标记哪些描述符需要被监控。
    // 
    // 【两个集合的作用】
    //   readfd_save_set   : 总名单（备份）。所有需要监控的描述符都放在这里，不会被修改。
    //   readfd_modify_set : 临时名单（工作副本）。每次 select 前从总名单拷贝过来，
    //                       select 执行后会修改它（只保留就绪的描述符）。
    //                       下一次循环必须重新拷贝，因为上一次的集合已经被 select 改写了。
    fd_set readfd_save_set;    // 保存所有需要监控的描述符
    fd_set readfd_modify_set;  // 每次 select 用的临时集合

    FD_ZERO(&readfd_save_set);        // 清空总名单（所有位清零）
    FD_SET(listen_fd, &readfd_save_set);  // 把监听套接字加入总名单

    int max_fd = listen_fd;   // 当前被监控的最大文件描述符值
    // select 的第一个参数需要传入 max_fd + 1，内核只检查 0 ~ max_fd 范围内的描述符
    // 这个值如果太大，会浪费内核遍历的时间；如果太小，会漏掉某些描述符

    char buf[BUFFER_SIZE] = {0};  // 数据缓冲区，用于收发数据

    printf("【select 并发 TCP 服务器】启动，监听端口 %d\n", PORT);

    // ===================================================================
    // 第 6 步：主循环 —— 反复调用 select 监听事件
    // ===================================================================
    while (1) {

        // --------------------------------------------------------------
        // 6.1 拷贝总名单到临时名单
        // --------------------------------------------------------------
        // 【重要】每次循环必须重新拷贝！因为 select 会修改 readfd_modify_set
        // （把没有就绪的描述符从集合中移除，只保留就绪的）
        readfd_modify_set = readfd_save_set;

        // --------------------------------------------------------------
        // 6.2 调用 select，阻塞等待事件
        // --------------------------------------------------------------
        // int select(int nfds, fd_set *readfds, fd_set *writefds,
        //            fd_set *exceptfds, struct timeval *timeout);
        //   nfds:     max_fd + 1（内核只检查 0 ~ max_fd 范围内的描述符）
        //   readfds:  可读事件集合（我们只关心读事件）
        //   writefds: 可写事件集合（填 NULL，不关心）
        //   exceptfds:异常事件集合（填 NULL，不关心）
        //   timeout:  超时时间（填 NULL，表示永久等待，直到有事件发生）
        // 返回值：就绪的文件描述符数量（>0），超时返回 0，出错返回 -1
        int fds = select(max_fd + 1, &readfd_modify_set, NULL, NULL, NULL);
        if (fds == -1) {
            perror("select 失败");
            continue;   // 出错后继续循环，不退出进程
        }
        // 注意：select 返回后，readfd_modify_set 中只有就绪的描述符还在集合里

        // --------------------------------------------------------------
        // 6.3 遍历所有可能的文件描述符，找出就绪的
        // --------------------------------------------------------------
        // 【改进前】从 3 开始（默认跳过 0,1,2 标准输入输出），不够严谨。
        // 【改进后】从 0 开始遍历，用 FD_ISSET 判断是否就绪，更通用。
        struct sockaddr_in client_addr;      // 用于 accept 时保存客户端地址
        socklen_t clientaddr_len = sizeof(client_addr);

        for (int event_fd = 0; event_fd <= max_fd; event_fd++) {

            // FD_ISSET(fd, &set) 判断 fd 是否在集合 set 中
            // 这里判断当前 event_fd 是否在就绪集合中
            if (!FD_ISSET(event_fd, &readfd_modify_set)) {
                continue;   // 不在就绪集合中，跳过
            }

            // ===========================================================
            // 情况一：监听套接字就绪 → 有新客户端正在请求连接
            // ===========================================================
            if (event_fd == listen_fd) {

                // int accept(int sockfd, struct sockaddr *addr, socklen_t *addrlen);
                //   sockfd: 监听套接字
                //   addr:   输出参数，内核会把客户端的 IP + 端口填进去
                //   addrlen: 传入地址结构体的大小，内核会修改为实际大小
                // 返回值：成功返回一个新的套接字（通信套接字），失败返回 -1
                int acceptfd = accept(listen_fd,
                                      (struct sockaddr *)&client_addr,
                                      &clientaddr_len);
                if (acceptfd == -1) {
                    perror("accept 失败");
                    continue;   // 本次失败不影响后续连接
                }

                // 【关键】把新客户的通信套接字加入到总名单中
                FD_SET(acceptfd, &readfd_save_set);

                // 更新最大描述符值（如果新的比原来的大）
                if (acceptfd > max_fd) {
                    max_fd = acceptfd;
                }

                printf("客户端 [%s:%d] 已连接\n",
                       inet_ntoa(client_addr.sin_addr),   // 把二进制 IP 转成点分十进制字符串
                       ntohs(client_addr.sin_port));      // 把网络字节序端口转回主机字节序
            }

            // ===========================================================
            // 情况二：普通客户端套接字就绪 → 有数据可读（或连接断开）
            // ===========================================================
            else {

                // ----------------------------------------------------------
                // 【改进3】用 getpeername 实时获取对端地址，避免 client_addr 被覆盖
                // ----------------------------------------------------------
                // 问题：client_addr 是在 accept 时赋值的。如果有新客户端连接，
                //       新的连接会覆盖 client_addr 的值。当旧客户端断开时，
                //       如果直接用 client_addr，打印的 IP/端口就是错的！
                // 解决：getpeername 从内核实时获取该连接的对端地址，100% 准确。
                struct sockaddr_in peer_addr;
                socklen_t peer_len = sizeof(peer_addr);
                if (getpeername(event_fd, (struct sockaddr *)&peer_addr, &peer_len) != 0) {
                    // 如果 getpeername 失败（极低概率），清零避免打印垃圾数据
                    memset(&peer_addr, 0, sizeof(peer_addr));
                }

                // 清空接收缓冲区，准备接收数据
                memset(buf, 0, sizeof(buf));

                // ssize_t recv(int sockfd, void *buf, size_t len, int flags);
                //   sockfd: 通信套接字
                //   buf:    存放数据的缓冲区
                //   len:    缓冲区的大小（防止溢出）
                //   flags:  0（阻塞模式，无特殊标志）
                // 返回值：>0 表示收到的字节数；==0 表示客户端主动关闭连接；
                //        -1 表示出错
                int nbytes = recv(event_fd, buf, BUFFER_SIZE, 0);

                if (nbytes == -1) {
                    perror("recv 失败");
                    continue;
                } else if (nbytes == 0) {
                    // recv 返回 0，说明客户端主动调用了 close()（四次挥手完成）
                    printf("客户端 [%s:%d] 已断开连接\n",
                           inet_ntoa(peer_addr.sin_addr),
                           ntohs(peer_addr.sin_port));

                    // 从总名单中移除该描述符
                    FD_CLR(event_fd, &readfd_save_set);
                    close(event_fd);   // 关闭通信套接字，释放系统资源

                    // ----------------------------------------------------------
                    // 【改进4】重新计算 max_fd（只减不增 → 动态调整）
                    // ----------------------------------------------------------
                    // 问题：如果不重新计算 max_fd，它只会往大了长。
                    //       比如最大描述符是 100 的客户端断开了，max_fd 还是 100，
                    //       下次 select 会检查 0~100，浪费 CPU。
                    // 解决：从大到小倒序遍历，找到当前仍在集合中的最大描述符。
                    int new_max = -1;
                    for (int i = 0; i <= max_fd; i++) {
                        if (FD_ISSET(i, &readfd_save_set)) {
                            new_max = i;
                        }
                    }
                    max_fd = new_max;  // 更新 max_fd（如果只剩 listen_fd，则重新变为 listen_fd）
                    continue;   // 处理完断开，跳过后续的 send 操作
                }

                // ---------- 正常收到数据 ----------
                printf("客户端 [%s:%d] 发来数据：%s\n",
                       inet_ntoa(peer_addr.sin_addr),
                       ntohs(peer_addr.sin_port),
                       buf);

                // 【改进1】发送时用 nbytes，而不是 BUFFER_SIZE
                //  错误写法：send(event_fd, buf, BUFFER_SIZE, 0);
                //     会把整个 128 字节数组都发出去，buf 后面的未初始化数据全是乱码！
                //  正确写法：send(event_fd, buf, nbytes, 0);
                //     只发实际收到的 nbytes 个字节，干净、正确。
                int send_bytes = send(event_fd, buf, nbytes, 0);
                if (send_bytes == -1) {
                    perror("send 回显失败");
                    continue;
                }
                // 注意：send 成功并不代表对方收到，只代表数据成功进入内核发送缓冲区
            }
        }
    }

    // ===================================================================
    // 第 7 步：关闭监听套接字（程序正常退出时才会执行到这里）
    // ===================================================================
    // 实际上，上面的 while(1) 是死循环，程序通常用 Ctrl+C 终止，
    // 此时进程退出，系统会自动回收所有文件描述符。
    // 但写上 close 是一个好习惯。
    close(listen_fd);
    return 0;
}
```

## 合集

````c
====================
TCP客户端
客户端（主动方）：socket → connect → send/recv → close
TCP服务器端
服务器端（被动方）：socket → bind → listen → accept → recv/send → close

```c
// ========== TCP 服务器端 ==========
//1. 创建监听套接字 
int listen_fd = socket(AF_INET, SOCK_STREAM, 0);
//2.配置服务器地址结构体
struct sockaddr_in addr = {0};
addr.sin_family = AF_INET;
addr.sin_port = htons(8888);
addr.sin_addr.s_addr = INADDR_ANY;
//3. 绑定（把套接字和IP+端口绑定）
bind(listen_fd, (struct sockaddr*)&addr, sizeof(addr));
//4. 监听（把主动套接字变成被动监听套接字）
listen(listen_fd, 5);
// 5. 接受客户端连接（阻塞在这里，直到有客户端连进来） 
int conn_fd = accept(listen_fd, NULL, NULL);
// 6. 收发数据
char buf[128];
recv(conn_fd, buf, sizeof(buf), 0);  // 收
send(conn_fd, buf, strlen(buf), 0); // 回显
//7. 关闭套接字
close(conn_fd); close(listen_fd);

// ========== TCP 客户端 ==========
//1. 创建套接字（和服务器一样）
int sock_fd = socket(AF_INET, SOCK_STREAM, 0);
//2.配置目标服务器地址（要连的目标）
struct sockaddr_in server_addr = {0};
server_addr.sin_family = AF_INET;
server_addr.sin_port = htons(8888);
inet_pton(AF_INET, "192.168.1.100", &server_addr.sin_addr);
//3. 发起连接（三次握手）
connect(sock_fd, (struct sockaddr*)&server_addr, sizeof(server_addr));
//4. 收发数据 
send(sock_fd, "hello", 5, 0);
recv(sock_fd, buf, sizeof(buf), 0);
//5. 关闭套接字
close(sock_fd);
```

====================
UDP单播服务器接收端
服务器端（固定端口等待）：socket → bind → recvfrom → sendto → clos
UDP单播客户端发送端
客户端（主动发起）：socket → sendto → recvfrom → close

```c
// ========== UDP 单播 服务器端（接收方） ==========
//1.创建数据报套接字
int sock_fd = socket(AF_INET, SOCK_DGRAM, 0);
///2.绑定本机地址和端口
struct sockaddr_in addr = {0};
addr.sin_family = AF_INET;
addr.sin_port = htons(8888);
addr.sin_addr.s_addr = INADDR_ANY;
bind(sock_fd, (struct sockaddr*)&addr, sizeof(addr));
//3. 接收数据（阻塞等待），同时获取客户端地址信息
char buf[128];
struct sockaddr_in client_addr;
socklen_t len = sizeof(client_addr);
//4.发送数据
recvfrom(sock_fd, buf, sizeof(buf), 0, (struct sockaddr*)&client_addr, &len);
sendto(sock_fd, "ok", 2, 0, (struct sockaddr*)&client_addr, len); //回显
//5.关闭
close(sock_fd);

// ========== UDP 单播 客户端（发送方） ==========
//1. 创建UDP套接字（不需要bind）
int sock_fd = socket(AF_INET, SOCK_DGRAM, 0);
//2. 配置服务器地址
struct sockaddr_in server_addr = {0};
server_addr.sin_family = AF_INET;
server_addr.sin_port = htons(8888);
inet_pton(AF_INET, "192.168.1.100", &server_addr.sin_addr);
//3. 发送数据（系统自动分配源端口）
sendto(sock_fd, "hello", 5, 0, (struct sockaddr*)&server_addr, sizeof(server_addr));
//4. 接收服务器回显（阻塞）
recvfrom(sock_fd, buf, sizeof(buf), 0, NULL, NULL); // 等服务器回显
close(sock_fd);
```

====================
UDP组播发送端
发送端：socket → setsockopt（可选设置TTL）→ sendto（目标填组播IP）→ close（绝对不bind）
UDP组播接收端
接收端：socket → bind（固定端口）→ setsockopt（IP_ADD_MEMBERSHIP加入组）→ recvfrom → close
```c
// ========== UDP 组播 发送端 ==========
// 1. 创建UDP套接字（不需要bind）
int sock_fd = socket(AF_INET, SOCK_DGRAM, 0);
// 3. 配置目标组播地址
struct sockaddr_in group_addr = {0};
group_addr.sin_family = AF_INET;
group_addr.sin_port = htons(8888);
inet_pton(AF_INET, "224.0.0.251", &group_addr.sin_addr);
// 2. 【可选】设置组播TTL（默认1，仅限本地子网）
int ttl = 2;
setsockopt(sock_fd, IPPROTO_IP, IP_MULTICAST_TTL, &ttl, sizeof(ttl));
// 4. 向组播地址发送数据
sendto(sock_fd, "hello group", 11, 0, (struct sockaddr*)&group_addr, sizeof(group_addr));
close(sock_fd);

// ========== UDP 组播 接收端 ==========
// 1. 创建UDP套接字
int sock_fd = socket(AF_INET, SOCK_DGRAM, 0);
// 2. 绑定本地端口
struct sockaddr_in local = {0};
local.sin_family = AF_INET;
local.sin_port = htons(8888);
local.sin_addr.s_addr = INADDR_ANY;
bind(sock_fd, (struct sockaddr*)&local, sizeof(local));

// 3. 【核心】加入组播组 
struct ip_mreq mreq;
inet_pton(AF_INET, "224.0.0.251", &mreq.imr_multiaddr.s_addr);
mreq.imr_interface.s_addr = INADDR_ANY;
setsockopt(sock_fd, IPPROTO_IP, IP_ADD_MEMBERSHIP, &mreq, sizeof(mreq));
//4. 接收组播数据 
char buf[128];
recvfrom(sock_fd, buf, sizeof(buf), 0, NULL, NULL);
printf("收到组播: %s\n", buf);
//5.关闭
close(sock_fd);
```

====================
UDP广播发送端
发送端：socket → setsockopt（开启广播）→ sendto（目标地址填广播地址）→ close
UDP广播接收端
接收端：socket → bind（固定端口）→ recvfrom（被动接收）→ close

```c
// ========== UDP 广播 发送端 ==========
//1. 创建UDP套接字
int sock_fd = socket(AF_INET, SOCK_DGRAM, 0);
//2. 【关键】开启广播权限
int on = 1;
setsockopt(sock_fd, SOL_SOCKET, SO_BROADCAST, &on, sizeof(on)); // 必须开启！
// 3. 配置目标广播地址
struct sockaddr_in broad_addr = {0};
broad_addr.sin_family = AF_INET;
broad_addr.sin_port = htons(8888);
broad_addr.sin_addr.s_addr = htonl(INADDR_BROADCAST); // 255.255.255.255
// 4. 发送广播包 
sendto(sock_fd, "hello all", 9, 0, (struct sockaddr*)&broad_addr, sizeof(broad_addr));
close(sock_fd);

// ========== UDP 广播 接收端 ==========
//1. 创建UDP套接字
int sock_fd = socket(AF_INET, SOCK_DGRAM, 0);
//2.绑定固定端口（收广播包必须bind）
struct sockaddr_in local = {0};
local.sin_family = AF_INET;
local.sin_port = htons(8888);
local.sin_addr.s_addr = INADDR_ANY;
bind(sock_fd, (struct sockaddr*)&local, sizeof(local));
//3. 接收广播包
char buf[128];
recvfrom(sock_fd, buf, sizeof(buf), 0, NULL, NULL); // 收到广播包
printf("收到广播: %s\n", buf);
close(sock_fd);
```

````
