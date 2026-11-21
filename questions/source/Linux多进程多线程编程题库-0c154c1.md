# Linux多进程多线程编程题库

[飞书原文](https://hcn4ticlccda.feishu.cn/docx/GtNTdfDQfoeenuxBQCycgZxsnGf)

# 简答题

## 什么是程序？什么是进程？进程和程序的区别？

程序是静态的存储在磁盘，是可被执行的有序指令集。程序是永久的，程序只占用磁盘空间。一个程序可以有多个进程

进程是动态的是程序的运行过程。进程是暂时的，进程占用系统资源和内存空间，一个进程通常只对应一个程序，通常就是说不一定，因为比如说动态库，是在运行时找其他的需要的可执行文件，但是从操作系统上看属于一个进程但多个程序。静态库是一个进程对应一个程序，在程序运行之前，把多个可执行文件就链接成一个。

## 什么是进程号？什么是父进程号？

进程号是操作系统给进程分配的唯一标识符，也就是进程号。父进程号就是创建当前进程的进程号。

## Linux系统中进程有几种类型？分别是什么？

交互进程：需要和终端进行交互的进程

批处理进程：按照指定的任务流程在后台运行，不需要交互

守护进程：随着系统的启动而启动，关闭而结束

## Linux系统中的进程有几种状态？分别是什么？这几种状态如何切换？

运行态/可运行态，可中断睡眠态，不可中断睡眠态，暂停态，僵尸态，死亡态。

运行态到可中断睡眠态/不可中断睡眠态，可中断睡眠态/不可中断睡眠态到运行态

运行态到暂停态，暂停态到运行态

运行态到僵尸态

僵尸态到死亡态

## 在Linux系统中如何创建一个子进程？描述创建过程？

使用fork函数，如果返回值等于-1就创建失败，等于0就是子进程，大于0就是父进程。

创建过程是先调用fork函数，在调用时就会复制父进程的信息，但会分配新的进程标识符。复制采用的是写时复制，在读的时候是共享同一个实际的物理地址。如果父子进程任何一个需要写入的话就会分配新的物理地址

## 什么是孤儿进程？什么是僵尸进程？如何避免僵尸进程的产生？

孤儿进程：父进程先结束，子进程由一号进程收养的进程

僵尸进程：子进程退出，父进程没有结束，但是没有调用wait和waitpid来回收资源的进程，

避免僵尸进程的产生：1.父进程在子进程退出后调用wait和waitpid来回收子进程资源。

2.在程序中使用信号signal(SIGCHLD,SIG_IGN)，这个信号会在子进程结束时由内核回收

3.两次fork，由子进程创建孙进程，然后子进程退出被父进程回收，然后孙进程就是孤儿进程，被init进程收养，这样init进程会回收它的资源。

## exec函数族中的函数的作用是什么？

作用是用一个程序替换当前的进程，除了PID不变，其余的都被替换。分为execv族是以组的形式替换，和execl族是以列表的形式替换。

## exit()和_exit()的作用是什么？有什么区别？

都是用于终止进程的，exit()是标准C库提供的函数，它会调用用户的清理函数，它会刷新刷新缓冲区，会把缓冲区的内容显示出来

\_exit()是系统调用提供的函数，它是调用内核终止进程，不会刷新缓冲区

## 什么是阻塞函数？什么是非阻塞函数？

阻塞函数是调用后会等待条件满足，条件不满足会进入可中断睡眠态，不执行后续任务

非阻塞函数是无论条件是否满足都是运行态（会占用cpu）,满足会执行任务，不满足会继续执行自己后续的任务

## 什么是守护进程？如何创建一个守护进程（写出创建步骤）

使用fork函数创建子进程，并退出父进程，使用setsid创建新会话，使用chdir改变权限，使用exec族函数替换子进程为指定的程序，关闭3\~1023的进程，重定向012进程到日志文件，使用while循环一直执行。

## 什么是线程？如何创建线程？程序中创建线程需要注意什么？编译有线程的程序时注意什么？

线程是轻量级的进程，是cpu调度的最小单位，同一个进程内线程之间有独立的TID和栈和寄存器，其他的共享进程。创建线程是添加线程相关的头文件，使用pthread_create函数，成功返回0,不成功返回非0错误码。四个参数，保存线程ID，线程属性可选，线程入口函数指针，可选给传不传参数。

创建线程的注意事项：多线程由于共享全局变量和堆因此要加互斥锁，保证同一时间只有一个线程可以使用。线程的栈有限，避免局部变量太大栈溢出。线程默认结合态，结束后需要回收线程资源，分离态会释放资源

编译时要加-pthread，这个看系统，比较新的已经不用加了。

## Linux系统中已经有了进程？为什么还要引入线程？线程和进程的区别有哪些？

因为进程的创建和切换上下文切换开销大，进程之间通信比较复杂，而线程之间的上下文切换开销小，线程之间通信共享数据，进程处理单个的需要稳定和安全的任务，线程处理需要实时响应快的。

区别：进程是最小的资源分配单位，线程是任务调度的最小单位，进程之间是隔离的稳定的可以同时进行互不干扰，线程如果有一个崩溃会导致其他线程崩溃。进程之间通信要用管道，信号，队列灯，线程之间要处理同步和互斥的问题。进程之间资源不共享，线程之间共享资源。

## 线程间的数据通信如何实现？线程间的同步如何实现？线程间的互斥如何实现？

线程间的数据库通信可以使用全局变量，堆。线程间同步可以使用互斥锁加条件变量或者无名信号量。线程间的互斥可以使用互斥锁和信号

## Linux系统中的进程间通信方式有几种？分别是什么？

七种，无名管道，有名管道，信号，消息队列，共享内存，信号量集，套接字

## 什么是同步通信？什么是异步通信？

同步和异步和阻塞与非阻塞是不同的。同步通信就是发出请求后如果条件不满足会等待条件满足，期间阻塞。异步通信就是发出请求后立即返回，条件满足后通过信号再继续执行这任务

## 什么是信号通信？哪些函数可以发出信号？

信号通信是linux内核提供的一种异步的通信机制，内核通过向进程发送信号通知进程，进程收到信号根据三种（默认，忽略，捕获）对信号的处理方式做出执行

kill()是命令可以向进程发送信号,signal()注册信号并设置处理方式,raise()向自身发送信号，alarm()设置定时器到期后发送信号

## 在linux系统中，进程对信号的响应方式有哪些？

默认，按照系统预设的默认执行

忽略，对信号不做任何反应

捕捉，收到信号后跳转到自定义的执行

## 共享内存和消息队列这两种通信方式有何区别？

共享内存是内核申请一块物理内存区域，让多个进程的虚拟地址空间映射到同一块物理内存，可直接读写该内存，无需内核数据拷贝，但需要处理同步，用互斥锁。适合大量数据通信

消息队列是内核维护的消息链表，进程通过消息队列标识符访问，发送时需要先把用户数据拷贝到内核，接受时需要把数据从内核拷贝到另一个用户，内核会自动处理同步，消息都类型，可以按照类型读取，数据大小有限制，适合需要按照类型处理的小数据

## 查看Linux系统进程的方法？

通过命令查询，ps命令是查看进程的快照，pstree是以树状图形查看进程，top是实时查看进程，htop是更高级的实时查看进程

## 讲讲共享内存的优缺点？

优点不需要拷贝速度快，适合数据量大传输

缺点容易发生数据混乱和不安全，必须有同步或者互斥锁的限制，需要手动清理

## 在Linux中造成死锁的3种操作？

第一种，两个线程按照相反顺序加两把锁，造成首尾相连，两个任务互相等待释放锁

第二种，锁在另一个线程，但在释放前已经被销毁，导致无法解锁

第三种，线程加锁后等待条件，忘记释放锁

## 线程join和detach区别？

join是可结合态需要其他线程调用join会阻塞等待线程结束手动回收资源，并获取线程退出状态，只能join一次。

detach是分离态会自动释放资源，调用detach后会不能被jion，无法获取退出状态信息。

## 什么是进程的上下文切换？

内核将cpu从一个进程切换到另一个进程时，会保存当前进程的寄存器的上下文和页表信息，然后执行新的进程的上下文。恢复时cpu要进行查找页表，然后恢复执行

## 并行和并发的区别？

并行是多核同时执行多个任务就是并行

并发是单核cpu通过时间片轮转实现宏观上多个任务同时进行

# Linux编程题

## 使用标准IO实现文件拷贝

```c
//1.打开源文件，以只读的方式
//2.打开目标文件，以只写的方式，若不存在就创建，若存在就清空
//3.读取源文件内容
//4.把源文件内容写入到目标文件
//5.关闭源文件
//6.关闭目标文件

#include <stdio.h>
int main(int argc, const char *argv[])
{
    // 对输入参数的参数个数进行检查
    if (argc != 3)
    {
        printf("输入的参数个数有误\n");
        printf("usage:./a.out filename1 filename2\n");
        return -1;
    }
    // 打开文件 以只读的方式打开源文件
    FILE *fp1 = NULL;
    if (NULL == (fp1 = fopen(argv[1], "rb")))
    {
        perror("打开源文件失败");
        return -1;
    }
    printf("源文件打开成功\n");
    // 打开文件 以只写的方式打开目标文件
    FILE *fp2 = NULL;
    if (NULL == (fp2 = fopen(argv[2], "wb")))
    {
        perror("打开目标文件失败");
        return -1;
    }
    printf("目标文件打开成功\n");
    // 从源文件中读取数据.将读取到的数据写到目标文件中
    // 没有读取文件的末尾和没有发生错误则循环从文件中读取数据
    char buf[BUFSIZ] = {0};
    size_t fread_ret = 0;
    while (!(feof(fp1) || ferror(fp1)))
    {
        // 从源文件中读取数据
        fread_ret = fread(buf, 1, sizeof(buf), fp1);
        // 将读取的数据写入到目标文件中
        // 求缓冲区的大小.并不是读取到实际数据的大小
        // fwrite(buf,1,sizeof(buf),fp2);
        // 需要明确文件中的内容是纯字符串,以\0进行结尾的
        // fwrite(buf,1,strlen(buf),fp2);
        fwrite(buf, 1, fread_ret, fp2);
    }
    // 关闭文件
    fclose(fp1);
    fclose(fp2);
    return 0;
}
```

## 使用文件IO实现文件拷贝

```c
//1.打开源文件，以只读的方式
//2.打开目标文件，以只写的方式，若不存在就创建，若存在就清空
//3.读取源文件内容
//4.把源文件内容写入到目标文件
//5.关闭源文件
//6.关闭目标文件

#include <stdio.h>
#include <sys/types.h>
#include <sys/stat.h>
#include <fcntl.h>
#include <unistd.h>
int main(int argc, const char *argv[])
{
    // 1.对输入参数的参数个数进行检查 argc
    if (argc != 3)
    {
        printf("输入的参数个数有误\n");
        printf("usage: ./a.out src_file dest_file\n");
        return -1;
    }
    // 2.以只读的方式打开源文件 以只写的方式打开目标文件  open
    // argv[1] 源文件的路径
    // argv[2] 目标文件的路径
    int src_fd = 0; //源文件的文件描述符
    //O_RDONLY如果文件不存在则会进行报错,打开文件就会失败
    if(-1 == (src_fd = open(argv[1],O_RDONLY)))
    {
        perror("打开源文件失败");
        return -1;
    }
    printf("打开源文件成功,src_fd=%d\n",src_fd);
    int dest_fd = 0; //目标文件的文件描述符
    //O_WRONLY如果文件不存在则会进行报错.打开文件失败
    //以只写的方式打开文件,如果文件不存在则创建新文件
    //如果文件存在则将文件中原有的内容进行清空操作
    if(-1 == (dest_fd = open(argv[2],O_WRONLY|O_CREAT|O_TRUNC,0666)))
    {
        perror("打开目标文件失败");
        return -1;
    }
    printf("打开目标文件成功,dest_fd=%d\n",dest_fd);
        // 3.循环读取和写入 read 和 write
        char buf[1024] = {0};
        ssize_t ret_read = 0; //用来接收read函数的返回值
        ssize_t ret_write = 0; //用来接收write函数的返回值
        while((ret_read = read(src_fd,buf,sizeof(buf)))>0)
        {
            //循环写入操作
            ret_write = write(dest_fd,buf,ret_read);
            if(ret_write == -1)
            {
                perror("写入目标文件失败");
                return -1;
            }
            //检查写入的字节数与读取的字节数是否一致
            if(ret_read != ret_write)
            {
                printf("写入的字节数与读取的字节数不一致\n");
                return -1;
            }
        }
        // 4.关闭文件 close
        close(src_fd);
        close(dest_fd);
        return 0;
}
```

## 使用无名管道实现进程间通信

```c
//1.创建无名管道
//2.创建子进程
//3.关闭子进程的写端，从无名管道中读取数据，关闭子进程的读端
//4.子进程退出
//5.关闭父进程的读端，从无名管道中写入数据，关闭父进程的写端
//6.回收子进程

#include <stdio.h>
#include <unistd.h>
#include <sys/types.h>
#include <string.h>
#include <sys/wait.h>
#include <stdlib.h>
int main(int argc,const char *argv[])
{
    //1.创建无名管道
    //无名管道是单向的,支持半双工通信方式
    //一端用于读(pipefd[0]).一端用于写(pipefd[1])
    int fd[2] = {0};
    int pipe_ret = 0;
    if(-1 == (pipe_ret = pipe(fd)))
    {
        perror("创建无名管道失败");
        return -1;
    }
    //注意1.pipe的文件描述符跟open函数的文件描述符使用的是同一组
    //注意2.fd[0]表示的是读端,fd[1]表示的是写端
    printf("创建无名管道成功,fd[0]=%d,fd[1]=%d\n",fd[0],fd[1]);
    //2.创建子进程
    pid_t pid = fork();
    if(pid == -1)
    {
        perror("创建子进程失败");
        return -1;
    }
    else if(pid == 0)
    {
        //子进程
        //子进程接收父进程的数据  读数据
        //关闭子进程的写端
        if(-1 == (close(fd[1])))
        {
            perror("关闭子进程写端失败");
            return -1;
        }
        printf("关闭子进程写端成功\n");
        //从无名管道中读取数据
        char buf_str[BUFSIZ] = {0};
        ssize_t read_ret = 0;
        if(-1 == (read_ret = read(fd[0],buf_str,sizeof(buf_str))))
        {
            perror("从无名管道中读取数据失败");
            return -1;
        }
        printf("从无名管道中读取数据成功,读取到的数据为:\n");
        printf("%s\n",buf_str);
        //关闭子进程的读端
        if(-1 == (close(fd[0])))
        {
            perror("关闭子进程读端失败");
            return -1;
        }
        printf("关闭子进程读端成功\n");
        //子进程退出
        exit(EXIT_SUCCESS);
    }
    else if(pid > 0 )
    {
        //父进程
        //父进程给子进程发送数据  写数据
        //关闭父进程的读端
        int close_ret = 0;
        if(-1 == (close_ret = close(fd[0])))
        {
            perror("关闭父进程读端失败");
            return -1;
        }
        printf("关闭父进程读端成功\n");
        //往无名管道中写数据
        char *str = "hello world";
        ssize_t write_ret = 0;
        if(-1 == (write_ret = write(fd[1],str,strlen(str))))
        {
            perror("往无名管道中写数据失败");
            return -1;
        }
        printf("往无名管道中写数据成功\n");
        //关闭父进程的写端
        if(-1 == (close(fd[1])))
        {
            perror("关闭父进程写端失败");
            return -1;
        }
        printf("关闭父进程写端成功,已将数据写入无名管道中\n");
        //等待子进程退出
        wait(NULL);  //不关注子进程的退出状态
    }
    return 0;
}
```

## 使用有名管道实现进程间通信

```c
//1.对输入的参数进行检查
//2.打开有名管道文件，以只写的方式
//3.从有名管道中写入数据
//4.关闭管道文件

//这个进程用于往管道文件中写操作
#include <stdio.h>
#include <sys/types.h>
#include <sys/stat.h>
#include <fcntl.h>
#include <unistd.h>
int main(int argc,const char *argv[])
{
    //1.对输入参数的参数个数进行检查
    if(argc != 2)
    {
        printf("输入的参数个数有误\n");
        printf("usage:./a.out pathname\n");
        return -1;
    }
    //创建管道文件 mkfifo函数  也可以使用mkfifo命令进行创建管道文件
    //针对于创建管道文件是写在读端还是写在写端,要根据实际情况来定
    int mkfifo_ret = 0;
    if(-1 == (mkfifo_ret = mkfifo(argv[1],0664)))
    {
        perror("写端：创建管道文件失败\n");
        return -1;
    }
    printf("写端：创建管道文件成功\n");
    //2.打开管道文件(以只写的方式打开文件)
    //不能使用/*|O_CREAT,0664*/创建管道文件(创建的不是管道文件,是一个普通的文件)
    int fd = 0;
    if(-1 == (fd = open(argv[1],O_WRONLY/*|O_CREAT,0664*/)))
    {
        perror("写端：打开管道文件失败\n");
        return -1;
    }
    printf("写端：打开管道文件成功\n");
    //3.向管道文件中写数据
    char buf[]="123456789";
    ssize_t ret = 0;
    if(-1 == (ret = write(fd,buf,sizeof(buf))))
    {
        perror("写端：向管道文件中写数据失败\n");
        return -1;
    }
    printf("写端：向管道文件中写数据成功\n");
    //4.关闭管道文件
    if(-1 == (close(fd)))
    {
        perror("写端：关闭管道文件失败\n");
        return -1;
    }
    printf("写端：关闭管道文件成功\n");
    //5.使用unlink函数删除管道文件(在写操作中不进行删除管道文件)
    //一般同一个管道文件只删除一次
    //一般是在读操作中进行删除管道文件.因为读操作是最后从管道文件中进行读取数据
    //再次进行关闭管道文件
    return 0;
}
```

```c
//1.对输入参数进行检查
//2.创建有名管道
//3.打开有名管道文件，以只读的方式
//4.从有名管道中读取数据
//5.关闭管道文件
//6.删除管道文件

//这个进程用于从管道文件中进行读操作
#include <stdio.h>
#include <sys/types.h>
#include <sys/stat.h>
#include <fcntl.h>
#include <unistd.h>
int main(int argc,const char *argv[])
{
    //1.对输入参数的参数个数进行检查
    if(argc != 2)
    {
        printf("输入的参数个数有误\n");
        printf("usage:./a.out pathname\n");
        return -1;
    }
    //2.打开管道文件(以只读的方式打开管道文件)
    int fd = 0;
    if(-1 == (fd = open(argv[1],O_RDONLY)))
    {
        perror("读端:打开管道文件失败");
        return -1;
    }
    printf("读端:打开管道文件成功\n");
    //3.从管道文件中读取数据
    char buf_data[BUFSIZ] = {0};
    ssize_t ret = 0;
    if(-1 == (ret = read(fd,buf_data,sizeof(buf_data))))
    {
        perror("读端:从管道文件中读取数据失败");
        return -1;
    }
    printf("读端:从管道文件中读取数据成功\n");
    printf("读端:从管道文件中读取的数据是:%s\n",buf_data);
    //4.关闭管道文件
    if(-1 == (close(fd)))
    {
        perror("读端:关闭管道文件失败");
        return -1;
    }
    printf("读端:关闭管道文件成功\n");
    //5.使用unlink函数删除管道文件
    //针对于同一管道文件,只需要使用一次unlink函数即可
    if(-1 == (unlink(argv[1])))
    {
        perror("读端:删除管道文件失败");
        return -1;
    }
    printf("读端:删除管道文件成功\n");
    return 0;
}
```

## 使用信号通信实现进程间通信

```c
#include <stdio.h>
#include <stdlib.h>
#include <signal.h>
#include <unistd.h>
#include <sys/types.h>
#include <sys/wait.h>

void myfunc(int sig)
{
    printf("子进程收到信号\n");
}

int main(int argc,const char *argv[])
{
    pid_t pid=fork();
    if(pid == -1)
    {
        return -1;
    }
    else if(pid == 0)
    {
        printf("这是子进程\n");
        signal(SIGINT,myfunc);
        while(1)
        {
            printf("hello word\n");
            sleep(1);
        }
        exit(0);
    }
    else if(pid > 0)
    {
        printf("这是父进程");
        sleep(10);
        kill(pid,SIGINT);
        wait(NULL);
        
    }
    return 0;
}
```

## 使用共享内存实现进程间通信

```c
//1.对输入参数进行检查
//2.使用ftok函数生成键值
//3.创建共享内存或者获取已存在共享内存的标识符
//4.将共享内存映射到进程的地址空间
//5.从共享内存中读取数据
//6.取消地址映射

//共享内存的读操作
#include <stdio.h>
#include <sys/types.h>
#include <sys/ipc.h>
#include <sys/shm.h>
#include <string.h>
#include <unistd.h>
#define SHM_SIZE 4096
int main(int argc,const char *argv[])
{
    //1.对输入参数的参数个数进行检查
    if(argc != 2)
    {
        printf("输入参数的参数个数有误\n");
        printf("usage:./a.out pathname\n");
        return -1;
    }
    //2.使用ftok函数生成键值
    key_t key = 0;
    if(-1 == (key = ftok(argv[1],1)))
    {
        perror("通过ftok函数生成键值失败");
        return -1;
    }
    printf("通过ftok函数生成的键值为:%d\n",key);
    //3.创建共享内存或者是获取已存在共享内存的标识符
    //第三个参数表示共享内存的标志，此标志跟消息队列的标志是一致的
    //IPC_CREAT表示创建共享内存
    //如果已有共享内存,那么返回共享内存的标识符,需要跟权限位结合使用
    //IPC_EXCL表示如果共享内存存在,则会进行报错
    int shmget_id = 0;
    if(-1 == (shmget_id = shmget(key,SHM_SIZE,IPC_CREAT|0666)))
    {
        perror("通过shmget函数创建或者是获取共享内存失败");
        return -1;
    }
    printf("通过shmget函数创建或者是获取共享内存成功,");
    printf("共享内存的标识符为:%d\n",shmget_id);
    //4.将共享内存映射到进程的地址空间
    //读端只能从共享内存中进行读取数据,不能往共享内存中写数据
    char *shm_addr = NULL;
    if((void *)-1 == (shm_addr = shmat(shmget_id,NULL,SHM_RDONLY)))
    {
        perror("将共享内存映射到进程的地址空间失败");
        return -1;
    }
    printf("将共享内存映射到进程的地址空间成功\n");
    printf("共享内存的地址为:%p\n",shm_addr);
    //5.从共享内存中读取数据
    while(1)
    {
        sleep(1); //避免CPU占用率过高
        //检查一下从共享内存中读取到的字符串为quit,进行退出
        if(strcmp(shm_addr,"quit") == 0)
        {
            break;
        }
        printf("从共享内存中读取到的数据为:%s\n",shm_addr);
    }
    //6.取消地址映射
    //读端和写端都需要进行取消地址映射
    //因为读端和写端是映射到不同的地址空间
    if(-1 == (shmdt(shm_addr)))
    {
        perror("取消地址映射失败");
        return -1;
    }
    printf("取消地址映射成功\n");
    return 0;
}
```

```c
//1.对输入参数进行检查
//2.使用ftok函数生成键值
//3.创建共享内存或者是获取已存在共享内存的标识符
//4.将共享内存映射到进程的地址空间
//5.将终端上读取到的字符串写入到共享内存当中
//6.取消地址映射
//7.删除共享内存

//共享内存的写操作
#include <stdio.h>
#include <sys/types.h>
#include <sys/ipc.h>
#include <sys/shm.h>
#include <string.h>
#define SHM_SIZE 4096
int main(int argc,const char *argv[])
{
    //1.对输入参数的参数个数进行检查
    if(argc != 2)
    {
        printf("输入参数的参数个数有误\n");
        printf("usage:./a.out pathname\n");
        return -1;
    }
    //2.使用ftok函数生成键值
    key_t key = 0;
    if(-1 == (key = ftok(argv[1],1)))
    {
        perror("通过ftok函数生成键值失败");
        return -1;
    }
    printf("通过ftok函数生成的键值为:%d\n",key);
    //3.创建共享内存或者是获取已存在共享内存的标识符
    //第三个参数表示共享内存的标志，此标志跟消息队列的标志是一致的
    //IPC_CREAT表示创建共享内存
    //如果已有共享内存,那么返回共享内存的标识符,需要跟权限位结合使用
    //IPC_EXCL表示如果共享内存存在,则会进行报错
    int shmget_id = 0;
    if(-1 == (shmget_id = shmget(key,SHM_SIZE,IPC_CREAT|0666)))
    {
        perror("通过shmget函数创建或者是获取共享内存失败");
        return -1;
    }
    printf("通过shmget函数创建或者是获取共享内存成功,");
    printf("共享内存的标识符为:%d\n",shmget_id);
    //4.将共享内存映射到进程的地址空间
    //第二个参数给NULL,说明是系统自动分配共享内存的地址
    //第三个参数：表示指定共享内存的访问权限(0:可读可写 SHM_RDONLY:只读)
    char* shm_addr = NULL;
    if((void *)-1 == (shm_addr = shmat(shmget_id,NULL,0)))
    {
        perror("将共享内存映射到进程的地址空间失败");
        return -1;
    }
    printf("将共享内存映射到进程的地址空间成功\n");
    printf("共享内存的地址为:%p\n",shm_addr);
    //5.将终端上读取到的字符串写入到共享内存当中
    while(1)
    {
        scanf("%s",shm_addr);
        //检查什么时候退出,如果输入的字符串为quit,表示要退出
        if(strcmp(shm_addr,"quit") == 0)
        {
            break;
        }
    }
    //6.取消地址映射
    if(-1 == (shmdt(shm_addr)))
    {
        perror("取消地址映射失败");
        return -1;
    }
    printf("取消地址映射成功\n");
    //7.删除共享内存
    //删除共享内存在写端中进行操作,读端中就不进行删除共享内存
    //因为写端先于读端进行退出.读端就不需要进行删除共享内存.只需要删除地址映射即可
    //只需要在一端进行操作即可.因为删除共享内存只是标记为删除
    //等到所有的进程都取消了地址映射.共享内存才会被删除
    if(-1 == (shmctl(shmget_id,IPC_RMID,NULL)))
    {
        perror("删除共享内存失败");
        return -1;
    }
    printf("删除共享内存成功\n");
    return 0;
}
```

## 使用消息队列实现进程间通信

```c
//1.对输入参数进行检查
//2.使用ftok函数生成键值
//3.使用msgget函数创建或者获取消息队列
//4.使用msgrcv函数从消息队列中读取数据
//5.删除消息队列

// 读端
#include <stdio.h>
#include <sys/types.h>
#include <sys/ipc.h>
#include <sys/msg.h>
#include <string.h>
// 消息队列的结构体
struct recv_data
{
    long mtype;       // 描述消息类型
    char mtext[1024]; // 描述消息的正文
};
int main(int argc, const char *argv[])
{
    // 1.对输入参数的参数个数进行检查
    if (argc != 2)
    {
        printf("输入参数的参数个数有误\n");
        printf("usage:./a.out pathname\n");
        return -1;
    }
    // 2.使用ftok函数生成键值
    key_t key = ftok(argv[1], 1);
    if (key == -1)
    {
        perror("生成键值失败");
        return -1;
    }
    printf("生成键值成功,key = %d\n", key);
    // 3.使用msgget函数创建或者是获取消息队列
    // 如果key不存在,那么就创建消息队列.需要指定权限位来设置文件的访问权限
    // 如果key存在,那么就获取消息队列
    // 第一个参数：IPC_PRIVATE 只能用于亲缘进程之间的通信,不需要使用ftok函数生成键值
    // 第二个参数：IPC_CREAT:如果消息队列存在,则返回存在消息队列的标识符
    // 如果消息队列不存在.则创建新的消息队列,创建的话后面需要跟上权限位
    // IPC_EXCL:如果消息队列存在,则返回错误,返回的是EEXIST错误码
    int msgid = msgget(key, IPC_CREAT | 0666);
    if (msgid == -1)
    {
        perror("创建消息队列失败");
        return -1;
    }
    printf("创建消息队列成功,msgid = %d\n", msgid);
    // 4.使用msgrcv函数从消息队列中读取数据
    // 定义结构体变量并进行初始化
    struct recv_data recvdata;
    recvdata.mtype = 1;       // 消息类型,消息类型必须大于0
    recvdata.mtext[0] = '\0'; // 消息正文
    // 从消息队列中阻塞接收消息
    ssize_t msgrcv_ret = 0;
    if (-1 == (msgrcv_ret = msgrcv(msgid, &recvdata, sizeof(recvdata.mtext),
                                   recvdata.mtype, 0)))
    {
        perror("使用msgrcv函数接收消息失败");
        return -1;
    }
    //将消息正文的最后一个字符设置为'\0'
    if(msgrcv_ret < sizeof(recvdata.mtext))
    {
        //将消息正文的最后一个字符设置为'\0'
        recvdata.mtext[msgrcv_ret] = '\0';
    }
    else
    {
        //如果填满了缓冲区,则手动添加结束符,避免越界
        recvdata.mtext[sizeof(recvdata.mtext) - 1] = '\0';
    }
    printf("使用msgrcv函数接收消息成功,msgrcv_ret=%ld\n", msgrcv_ret);
    printf("接收的消息类型为:%ld,接收的消息正文为:%s\n",recvdata.mtype,recvdata.mtext);
    //5.删除消息队列
    //IPC_RMID:不会立即删除消息队列,只是将消息队列标记为删除状态
    //等待所有的进程都使用完消息队列,才会删除消息队列
    //此宏的删除原则是延时删除
    if(-1 == (msgctl(msgid,IPC_RMID,NULL)))
    {
        perror("使用msgctl函数删除消息队列失败");
        return -1;
    }
    printf("使用msgctl函数删除消息队列成功\n");
    return 0;
}
```

```c
//1.对输入参数进行检查
//2.使用ftok函数生成键值
//3.使用msgget函数创建或者是获取消息队列
//4.使用msgsnd函数往消息队列中写入数据

//写端
#include <stdio.h>
#include <sys/types.h>
#include <sys/ipc.h>
#include <sys/msg.h>
#include <string.h>
//消息队列的结构体
struct send_data
{
    //注意：针对于结构体中的成员没有强制的规定,但是第一个首成员
    //必须是long mtype
    long mtype;  //描述消息的类型 必须大于0
    char mtext[1024];  //字符数组,描述消息的正文
};
int main(int argc,const char *argv[])
{
    //1.对输入参数的参数个数进行检查
    if(argc != 2)
    {
        printf("输入参数的参数个数有误\n");
        printf("usage:./a.out pathname\n");
        return -1;
    }
    //2.使用ftok函数生成键值
    key_t key = ftok(argv[1],1);
    if(key == -1)
    {
        perror("生成键值失败");
        return -1;
    }
    printf("生成键值成功,key = %d\n",key);
    //3.使用msgget函数创建或者是获取消息队列
    //如果key不存在,那么就创建消息队列.需要指定权限位来设置文件的访问权限
    //如果key存在,那么就获取消息队列
    //第一个参数：IPC_PRIVATE 只能用于亲缘进程之间的通信,不需要使用ftok函数生成键值
    //第二个参数：IPC_CREAT:如果消息队列存在,则返回存在消息队列的标识符
    //如果消息队列不存在.则创建新的消息队列,创建的话后面需要跟上权限位
    //IPC_EXCL:如果消息队列存在,则返回错误,返回的是EEXIST错误码
    int msgid = msgget(key,IPC_CREAT|0666);
    if(msgid == -1)
    {
        perror("创建消息队列失败");
        return -1;
    }
    printf("创建消息队列成功,msgid = %d\n",msgid);
    //4.使用msgsnd函数往消息队列中写入数据
    //定义结构体变量
    struct send_data senddata;
    //对结构体变量进行初始化
    senddata.mtype = 1;  //消息的类型必须要大于0
    strcpy(senddata.mtext,"hello world");  //消息的正文
    //msgsnd函数是以阻塞的方式进行发送消息 非阻塞：IPC_NOWAIT
    int msgsnd_ret = 0;
    if(-1 == (msgsnd_ret = msgsnd(msgid,&senddata,strlen(senddata.mtext),0)))
    {
        perror("使用msgsnd函数发送消息失败");
        return -1;
    }
    printf("使用msgsnd函数发送消息成功,msgsnd_ret = %d\n",msgsnd_ret); //0
    return 0;
}
```

## 使用无名信号量实现线程间同步

```c
//1.初始化信号量
//2.创建生产者线程
//3.创建消费者线程
//4.回收生产者线程结束
//5.回收消费者线程
//6.销毁信号量


#include <stdio.h>
#include <pthread.h>
#include <semaphore.h>
#include <stdlib.h>

static int glob = 0;
static sem_t sem; // 定义一个全局信号量

static void* threadFunc(void *arg) {
    int loops = *((int*)arg);
    for (int j = 0; j < loops; j++) {
        // 1. 【P操作】申请资源，进入临界区
        if (sem_wait(&sem) == -1) {
            perror("sem_wait");
            pthread_exit(NULL);
        }

        // --- 临界区开始 (同时只能有一个线程执行) ---
        int loc = glob;
        loc++;
        glob = loc;
        // --- 临界区结束 ---

        // 2. 【V操作】释放资源，离开临界区
        if (sem_post(&sem) == -1) {
            perror("sem_post");
            pthread_exit(NULL);
        }
    }
    return NULL;
}

int main(int argc, char *argv[]) {
    pthread_t t1, t2;
    int loops = (argc > 1) ? atoi(argv[1]) : 1000000;

    // 3. 【初始化信号量】pshared=0 (线程间共享)，初值=1 (同一时刻只允许一个线程进入)
    if (sem_init(&sem, 0, 1) == -1) {
        perror("sem_init");
        exit(EXIT_FAILURE);
    }

    // 创建两个线程
    pthread_create(&t1, NULL, threadFunc, &loops);
    pthread_create(&t2, NULL, threadFunc, &loops);

    // 等待线程结束
    pthread_join(t1, NULL);
    pthread_join(t2, NULL);

    // 4. 【销毁信号量】
    sem_destroy(&sem);

    printf("glob = %d\n", glob);
    return 0;
}

```

```c
消息队列
写端：
1.检查输入的参数
2.生成键值ftok函数
3.创建或者获取消息队列msgget
4.往消息队列中写入数据，创建结构体，msgsnd


读端：
1.检查输入参数
2.生成键值
3.创建或者获取消息队列
4.从消息队列中读取数据创建结构体，msgrcv
5.删除消息队列
```

```c
共享内存
写端：
1.检查输入参数
2.生成键值
3.创建共享内存shmget
4.将共享内存映射到虚拟地址空间shmat
5.往共享内存中写入数据
6.取消地址映射
7.删除共享内存





读端：
```
