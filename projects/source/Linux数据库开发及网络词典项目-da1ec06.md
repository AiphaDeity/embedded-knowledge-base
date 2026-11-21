# Linux数据库开发及网络词典项目

[飞书原文](https://hcn4ticlccda.feishu.cn/docx/MDNpdRTvxo4LhRxeR1lcEinrn2R)

# Linux 数据库开发学习第一性原理

## 据库学习第一性原理

### 1. 核心定义

抛弃死记语法、复制代码、照搬示例，从程序存储数据的 4 个底层刚需公理出发，自上而下推导本章全部知识点：

1. 持久化刚需：程序内存断电丢失，必须落地磁盘保存数据
2. 标准化查询刚需：原生文件读写无统一查询语法，需要 SQL 标准化操作
3. 程序调用刚需：C 语言代码不能直接操作数据库文件，需要语言 API 接口
4. 业务扩容刚需：嵌入式轻量 SQLite 无法支撑多客户端网络并发，需要 MySQL 服务端数据库

本章所有内容，全部是为解决以上 4 个刚需逐层衍生出来。

---

##  数据库基础（第一性原理拆解）

### 1. 底层本源：为什么不能直接用 txt/csv 文件存数据？

三大原生痛点（数据库诞生的底层动因）

1. 持久化混乱：文件无统一读写规范，多程序同时读写会覆盖损坏数据
2. 查询低效：查找指定内容需要逐行遍历，无索引加速
3. 无数据约束：无法限制字段格式、唯一性，数据容易错乱 数据库就是专门解决这三个痛点的标准化工具。

### 2. 数据库两大分类（从使用场景公理推导）

#### （1）嵌入式数据库 SQLite（本章重点）

底层取舍逻辑：优先满足单机、零服务、轻量、嵌入式设备需求

- 底层结构：单文件存储，无独立后台进程，直接本地文件 IO
- 优势推导：无需安装服务、体积小、Linux 系统自带、C 调用简单
- 缺陷推导：全局写锁，多进程 / 多客户端并发写入阻塞，不适合网络多用户场景
- 适用场景：本地客户端、嵌入式 Linux 设备、单机小型程序（本课程前期实验）

#### （2）服务端数据库 MySQL（5.4 扩展内容）

底层取舍逻辑：优先满足网络多客户端、高并发读写、多用户访问需求

- 底层结构：独立后台服务进程，通过 TCP 网络端口接收客户端请求
- 优势推导：行级锁、并发能力强、支持远程网络访问、适合多程序共用一套数据
- 缺陷推导：需要部署启动服务、占用更多系统资源、配置复杂
- 适用场景：服务器网络程序、多客户端项目（对应 5.5 网络词典实战）

### 3. 核心基础概念（从底层公理推导）

1. 库：独立磁盘文件 / 存储区域，隔离不同业务数据
2. 表：二维结构化存储载体，解决文件无规范的问题（行 = 数据条目，列 = 数据字段）
3. 主键：唯一标识单条数据，解决重复数据错乱问题
4. 事务：保障多步写入要么全部成功、要么全部撤销，解决宕机半截写入问题

---

## 常用 SQL 语句（第一性原理推导，无需死记）

### 1. SQL 本质

结构化查询语言，是关系代数对外的统一人机接口，所有数据库（SQLite/MySQL）通用标准语法，目的是统一替代零散文件读写操作。

### 2. 四大基础语句，从业务需求反向推导

#### 1）CREATE 创建（解决 “没有存储容器” 需求）

- 创建数据库：`CREATE DATABASE 库名;`
- 创建数据表：`CREATE TABLE 表名(字段1 类型 约束,字段2 类型 约束);` 底层逻辑：先在磁盘开辟存储区域，再定义数据存储格式约束。

#### 2）INSERT 插入（解决 “写入数据” 需求）

`INSERT INTO 表名(字段1,字段2) VALUES(值1,值2);` 底层逻辑：向二维表新增一行数据，落地磁盘持久保存。

#### 3）SELECT 查询（解决 “读取筛选数据” 需求）

基础模板：`SELECT 展示字段 FROM 表名 WHERE 过滤条件 ORDER BY 排序;` 拆解底层逻辑：

- SELECT：投影，只提取需要的列
- FROM：指定数据来源表
- WHERE：选择，过滤符合条件的行（避免全表扫描）
- ORDER BY：排序，优化读取展示顺序

#### 4）UPDATE / DELETE 修改删除（解决 “更新、清理数据” 需求）

- 修改：`UPDATE 表名 SET 字段=新值 WHERE 条件;`
- 删除：`DELETE FROM 表名 WHERE 条件;` 关键底层约束：必须加 WHERE 条件，否则会全表修改 / 删除，破坏数据一致性。

### 3. 拓展常用语法（底层目的）

1. `PRIMARY KEY` 主键约束：保证每条数据唯一，快速定位数据
2. `INDEX` 索引：空间换时间，减少磁盘 IO，加速 SELECT 查询
3. `TRANSACTION` 事务：多条增删改操作打包，保障故障安全

### 第一性记忆技巧

所有 SQL 语句只对应 4 种数据操作需求：建容器、存数据、查数据、改数据，遇到业务需求直接对应语法，不用背诵完整模板。

---

##  SQLite C 语言接口（第一性原理：C 程序如何操作数据库文件）

### 1. 底层本源

SQLite 是磁盘上的单文件，C 语言程序无法直接解析内部存储格式，官方提供一套 C API，封装文件打开、SQL 执行、结果读取、资源释放逻辑，这就是 SQLite C 接口存在的意义。

### 2. 完整接口流程（从文件操作逻辑推导顺序，不会记混）

文件操作通用逻辑：打开文件 → 读写操作 → 关闭释放资源，SQLite C 接口完全对应这套流程：

1. `sqlite3_open()` 打开数据库文件 底层：打开本地`.db`文件，不存在则自动创建，获取数据库操作句柄
2. `sqlite3_exec()` 执行 SQL 语句（增删改） 底层：传入 SQL 字符串，API 内部解析语句，完成磁盘读写，支持回调函数读取查询结果
3. 预处理接口 `sqlite3_prepare_v2` + `sqlite3_step`（复杂查询推荐） 底层：拆分 SQL 编译、分步读取结果，避免 SQL 注入，适合带参数查询
4. `sqlite3_close()` 关闭数据库 底层：刷新缓冲区数据到磁盘，释放文件句柄、内存资源，防止内存泄漏、文件损坏

### 3. 核心参数与底层原理

- `sqlite3*` 句柄：程序和数据库文件之间的桥梁，所有操作都依赖该指针
- 回调函数：SELECT 查询时，API 每读取一行数据自动调用回调，传递字段名、字段值
- 错误码 / 错误信息：底层文件读写失败、SQL 语法错误时，返回提示，方便排查磁盘 / 语句问题

### 4. 第一性原理避坑推导

1. 操作完必须`sqlite3_close`：不关闭会导致缓冲区数据未刷盘，程序异常丢失数据
2. 多进程并发写入卡顿：源于 SQLite 底层全局写锁，对应 5.1 基础里的缺陷，大型网络项目需要换 MySQL

---

##  MySQL 扩展介绍（第一性原理：解决 SQLite 的并发短板）

### 1. MySQL 诞生的底层需求（SQLite 无法满足的场景）

1. 多客户端远程网络访问：嵌入式 SQLite 只能本地程序读写，MySQL 通过 3306 端口提供网络服务，多台设备同时连接
2. 高并发读写：MySQL 行级锁，不同行写入互不阻塞；SQLite 全局写锁并发阻塞
3. 多用户权限管理：支持账号、密码、访问权限隔离，适合多人 / 多程序共用数据库

### 2. MySQL 与 SQLite 底层共性（不用重新学 SQL）

1. 共用一套标准 SQL 语法：5.2 学的增删改查语句 90% 可直接复用
2. 底层核心逻辑一致：库、表、主键、事务、索引概念完全相通

### 3. C 程序操作 MySQL 的底层差异

SQLite：直接操作本地文件，无网络开销 MySQL：C 程序通过 TCP 网络连接 MySQL 服务端，使用`mysql.h`专属 API，客户端发送 SQL、服务端执行并返回结果，分层架构适配网络项目（对应 5.5 网络词典）

### 4. 选型第一性判断（本章考试高频）

- 单机嵌入式、本地小程序、无多客户端 → SQLite
- Linux 服务器、多客户端网络程序、并发读写 → MySQL

---

##  网络词典（综合实战，用第一性原理串联全章所有知识点）

### 1. 项目底层需求拆解（反向串联全部章节）

需求：客户端通过网络查询单词、存储单词释义，多客户端同时访问

1. 数据持久存储单词库 → 5.1 数据库基础，选择 MySQL（多客户端并发）
2. 单词增删改查操作 → 5.2 标准 SQL 语句
3. 服务端 C 语言程序读写数据库 → 5.4 MySQL C 开发接口
4. 对比方案：如果用 SQLite 做词典服务，多客户端查询写入会严重阻塞，验证 5.1、5.3 中 SQLite 并发缺陷

### 2. 项目分层逻辑（底层推导）

1. 网络层：TCP 服务端接收客户端查询请求
2. 数据库层：C 调用 MySQL 接口，执行 SELECT 查询单词、INSERT 新增单词
3. 数据返回层：将 SQL 查询结果通过网络回传给客户端

### 3. 实战学习第一性思路

不直接复制完整项目代码，分步拆解：

1. 先用 SQL 建单词表、插入测试数据（5.2 知识点）
2. 写 C 代码单独实现 MySQL 查询单词功能（5.4 知识点）
3. 整合 TCP 网络代码，接收客户端指令调用数据库接口
4. 对比替换 SQLite 实现版本，直观感受二者并发性能差距

---

## 本章整体第一性原理学习方法论

1. 先抓底层矛盾：每一节先思考「这个技术解决了什么存储痛点」，所有知识点都是痛点的解决方案
2. 纵向串联通用逻辑

   - 文件操作逻辑：打开→操作→关闭，统一适配 SQLite、MySQL C 接口
   - 数据操作逻辑：创建容器→写入→查询→修改，统一适配所有 SQL 语句
3. 横向对比区分差异 SQLite（本地单文件、全局锁、无网络）vs MySQL（网络服务、行锁、多客户端），只记底层取舍，不用背诵大段优缺点
4. 项目闭环验证：通过 5.5 网络词典，反向验证前面所有理论知识，单元测评的代码题、问答题全部可以从底层逻辑推导作答

## 单元测评答题万能底层思路（第一性答题模板）

遇到简答题 / 代码题，固定三步作答：

1. 底层需求：当前场景要解决什么数据存储问题
2. 方案选择：根据并发 / 单机需求选 SQLite 或 MySQL，说明底层取舍
3. 实现逻辑：对应 SQL 语句 + C 语言 API 完整流程，从文件 / 网络底层解释执行原理

# 数据库基础

## 数据库介绍

### 数据库定义

数据库是结构化数据集合，能够持久存储数据，提供安全、可靠、高效的数据存储、管理、检索访问机制。

### 使用数据库的核心价值

1. 数据持久化：程序关闭、服务器重启后数据不会丢失，区别于内存临时存储
2. 数据共享：支持多用户、多应用并发读写同一份数据
3. 数据一致性：依靠事务 ACID 特性保障增删改查的数据完整可靠
4. 高效查询：内置索引、查询优化器，大幅提升海量数据检索速度

### 数据库发展三阶段（补充拓展）


<table v-pre><tbody><tr><td>阶段</td><td>特点</td><td>缺陷</td><td>适用场景</td></tr><tr><td>人工管理阶段</td><td>纯手工记录，无存储工具</td><td>数据无法长期保存、无统一管理、复用性极差</td><td>早期无计算机时代</td></tr><tr><td>文件系统阶段</td><td>数据以文件形式长期保存，格式多样（txt/csv 等）</td><td>数据冗余高、无统一约束、多文件关联查询困难、并发差</td><td>小型单机简单存储需求</td></tr><tr><td>数据库系统阶段</td><td>结构化数据模型、数据与程序分离、数据独立性高、支持事务 / 并发 / 索引</td><td>需要额外部署数据库服务，有一定学习成本</td><td>绝大多数软件、网站、业务系统</td></tr></tbody></table>


#### 补充概念：数据独立性

- 物理独立性：底层存储文件变更，上层业务代码无需修改
- 逻辑独立性：数据表结构调整，应用程序查询逻辑改动极小

## 数据库分类

### 大类划分

1. 关系型数据库（RDBMS）：数据以二维表（行 + 列）存储，遵循 SQL 标准，支持完整事务、外键关联 代表：MySQL、PostgreSQL、Oracle、SQL Server、SQLite
2. 非关系型数据库（NoSQL）：无固定表结构，弱化多表关联，侧重高并发、海量数据、水平扩展 细分类型：文档型、键值型、图数据库、列式数据库 代表：MongoDB（文档）、Redis/Memcached（键值）、Neo4j（图）

### （一）主流关系型数据库详细对比


<table v-pre><tbody><tr><td>数据库</td><td>核心优势</td><td>缺点</td><td>典型使用场景</td></tr><tr><td>MySQL</td><td>1. 开源免费，社区生态完善<br/>2. 针对高并发读写优化，OLTP 业务友好<br/>3. 轻量化，部署简单、资源占用低</td><td>1. 多表 JOIN 复杂查询性能偏弱2. 高级扩展功能不如 PostgreSQL 完善</td><td>中小型网站、电商、后端业务、互联网通用业务</td></tr><tr><td>PostgreSQL</td><td>1. 功能完备：原生支持 JSON、GIS 地理数据、全文检索<br/>2. 高度自定义：自定义数据类型、存储函数3.ACID 事务严格兼容，数据容错性强</td><td>1. 默认配置高并发吞吐量低于 MySQL2. 内存占用更高，低配机器性能一般</td><td>地理信息系统、数据分析、复杂业务系统、开源后台</td></tr><tr><td>Oracle</td><td>1. 企业级高性能，分布式、高可用成熟<br/>2. 事务、锁机制完善，海量数据稳定<br/>3. 配套商业工具、7×24 官方技术支持</td><td>1. 商业授权价格昂贵，成本高2. 配置、运维复杂，学习门槛高</td><td>大型金融、银行、国企核心业务、大型集团系统</td></tr><tr><td>SQL Server</td><td>1. 深度适配 Windows、.NET、Azure 云生态<br/>2.SSMS 图形化管理工具，上手简单3. 内置 BI 数据分析套件</td><td>1. 跨平台支持有限，Linux 适配不完善2. 免费社区版有功能 / 数据量限制</td><td>Windows 企业内网、微软技术栈项目、传统企业管理系统</td></tr><tr><td>SQLite</td><td>1. 零配置嵌入式，单文件数据库<br/>2. 体积极小，库文件仅数 MB3. 无独立服务进程，直接代码调用</td><td>1. 全局写锁，无法支持高并发写入2. 无用户、权限管理体系3. 大数据量、复杂 SQL 执行效率低</td><td>手机 APP、本地客户端、嵌入式设备、小型单机本地存储</td></tr></tbody></table>


### （二）主流非关系型数据库详细对比（原文 + 补充拓展）

#### MongoDB（文档型 NoSQL）

- 存储结构：数据以 JSON/BSON 文档存储，单条文档字段可灵活自定义，无需统一表结构
- 优势 

  1. 灵活 Schema，业务迭代无需改表结构
  2. 支持分片集群，轻松水平扩容承载海量数据
  3. 查询语法接近 SQL，上手门槛低
  4. 4.0 及以上版本支持多文档事务
- 缺点 

  1. 文档解析占用大量内存，内存消耗高
  2. 多文档复杂关联查询性能远不如关系库
- 适用场景：商品详情、用户画像、内容资讯、需求频繁变更的业务

#### Redis（键值型 NoSQL）

- 存储结构：Key-Value 结构，支持字符串、哈希、列表、集合、有序集合多种数据结构
- 优势 

  1. 全内存操作，读写性能极高，可达 10 万 + QPS
  2. 支持 RDB/AOF 持久化，数据落地磁盘；哨兵 / 集群保证高可用
  3. **可做缓存、分布式锁、消息队列、计数器**
- 缺点 

  1. 数据容量受服务器物理内存限制
  2. 仅支持简单键查询，无复杂多条件关联查询
  3. 异步持久化场景下，极端断电可能丢失少量写入数据
- 适用场景：系统缓存、秒杀限流、会话存储、排行榜、分布式锁

#### Neo4j（图数据库）

- 存储结构：以节点、关系存储实体与关联，原生处理复杂网状关系
- 优势 

  1. 原生图存储，处理多层级关系效率极高
  2. Cypher 专用图查询语言，直观查询人物 / 实体关系
  3. 完整支持 ACID 事务
- 缺点 

  1. 社区版仅支持单机，集群扩容成本高
  2. 存储普通非关系类数据效率低下
- 适用场景：社交好友关系、知识图谱、金融风控链路、推荐系统

#### 补充拓展：Memcached

同属键值缓存数据库，对比 Redis：

1. 仅支持字符串，数据结构单一；Redis 支持多种容器结构
2. 无持久化，断电数据全部丢失
3. 轻量化，纯缓存场景，内存开销更低

## 数据库安装（以 SQLite Linux 部署为例，补充完整操作）

### SQLite 介绍补充

SQLite 是嵌入式零服务数据库，无独立后台进程，直接读写本地单文件，常用于嵌入式、客户端程序，Linux 系统预装，也可手动安装。

### 官方地址

官网：[https://www.sqlite.org](https://link.wtturl.cn/?target=https%3A%2F%2Fwww.sqlite.org&scene=im&aid=582478&lang=zh)

### Ubuntu/Debian 在线安装命令

```bash
# 安装sqlite3客户端工具
sudo apt-get install sqlite3
# 安装C/C++开发函数库（程序开发必须）
sudo apt-get install libsqlite3-dev
```

### 进入 SQLite 交互终端

执行命令：

```text
sqlite3
```

启动成功示例输出：

```bash
SQLite version 3.22.0 2018-01-22 18:45:57
Enter ".help" for usage hints.
Connected to a transient in-memory database.
```

### 常用 SQLite 点命令（补充实操指令）

1. `.help`：查看全部内置命令帮助
2. `.open 数据库文件名`：打开 / 创建本地持久化数据库文件（默认是内存临时库，退出数据清空）
3. `.tables`：查看当前库所有数据表
4. `.schema`：查看表结构
5. `.quit` / `.exit`：退出 sqlite 交互终端
6. `.header on`：开启查询结果表头显示

### 补充：CentOS/RHEL 安装命令

```bash
yum install sqlite sqlite-devel
```

## 拓展补充知识点（原文无，考试 / 实操高频）

### ACID 事务四大特性（数据库一致性核心）

1. 原子性 Atomic：事务全部执行成功，或全部回滚，不会出现半截操作
2. 一致性 Consistent：事务前后数据约束合法（如余额不能为负数）
3. 隔离性 Isolation：多个并发事务互不干扰，分读未提交、读已提交、可重复读、串行化四种隔离级别
4. 持久性 Durable：事务提交后数据永久写入磁盘，宕机不丢失

### OLTP 与 OLAP 区分

- OLTP（联机事务处理）：日常业务读写，高并发、短事务 → MySQL 为主
- OLAP（联机分析处理）：大数据统计、报表分析，大量查询少写入 → PostgreSQL、数据仓库

### 关系型 vs 非关系型选型总结

1. 业务有大量关联、强事务、数据结构固定 → 选 MySQL/PostgreSQL
2. 数据结构频繁变更、海量数据水平扩容、无需复杂关联 → MongoDB
3. 需要高速缓存、计数、分布式锁 → Redis
4. 实体之间存在复杂网状关系（社交、图谱）→ Neo4j
5. 本地客户端、嵌入式设备、单文件存储 → SQLite

### Linux 数据库开发注意点

1. 生产环境数据库禁止使用 root 账号直接运行，新建专用数据库用户
2. SQLite 不适合多进程并发写入，高并发业务优先 MySQL/PostgreSQL
3. Redis 内存需预留足够空间，避免内存溢出触发淘汰策略丢失缓存数据
4. 关系型数据库务必合理建立索引，避免全表扫描拖慢查询性能

# 常用SQL语句

## 数据库及数据表的创建

### SQLite 基础存储数据类型

SQLite 采用动态类型，定义字段时仅作参考，实际存储分 5 大类：


<table v-pre><tbody><tr><td>存储类</td><td>说明</td><td>使用示例</td><td>补充拓展</td></tr><tr><td>NULL</td><td>空值，代表无数据</td><td>age INTEGER NULL</td><td>判断空值用 IS NULL，不能用 =</td></tr><tr><td>INTEGER</td><td>有符号整数，自动适配 1/2/3/4/6/8 字节</td><td>student_id INTEGER</td><td>常用来做主键自增</td></tr><tr><td>REAL</td><td>8 字节 IEEE 标准浮点数（小数）</td><td>score REAL</td><td>不适合高精度金额计算</td></tr><tr><td>TEXT</td><td>UTF-8/UTF-16 文本字符串</td><td>name TEXT NOT NULL</td><td>字符串值必须用单引号包裹</td></tr><tr><td>BLOB</td><td>原始二进制数据</td><td>img BLOB</td><td>存放图片、音频、文件二进制流</td></tr></tbody></table>


### 创建表 CREATE TABLE 完整语法

```sql
CREATE TABLE [IF NOT EXISTS] table_name (
    列名1 数据类型 约束,
    列名2 数据类型 约束,
    ...
);
```

**关键字说明**

1. `IF NOT EXISTS`：可选，表已存在不会报错，避免重复建表异常
2. 约束：限制字段数据规则，常用：`PRIMARY KEY`(主键)、`NOT NULL`（非空）、`UNIQUE`（唯一约束）

**示例 1：单字段主键（自增主键）**

```sql
CREATE TABLE students (
    student_id INTEGER PRIMARY KEY, -- 主键自动唯一自增
    student_name TEXT NOT NULL,
    age INTEGER
);
```

**示例 2：复合主键（多列联合唯一）**

```sql
CREATE TABLE course_registration (
    student_id INTEGER,
    course_id INTEGER,
    PRIMARY KEY (student_id, course_id) -- 两个字段组合作为主键
);
```

**补充拓展常用约束**

- `UNIQUE`：字段值全局唯一（区别主键：一张表可多个 UNIQUE，仅一个主键）
- `CHECK`：自定义字段范围，例 `age INTEGER CHECK(age>0)`
- `DEFAULT`：设置字段默认值，例 `create_time TEXT DEFAULT CURRENT_TIMESTAMP`（创建时间 文本类型 默认值为当前时间戳）

## 数据操作语句（CRUD：增、查、改、删）

### 查询 SELECT（最常用）

基础完整语法

```sql
SELECT 列1,列2,...
FROM 表名 
[WHERE 筛选条件]
[ORDER BY 列名 ASC|DESC];
```

- `*`：代表查询表中全部列
- WHERE：过滤行，只返回满足条件的数据
- ORDER BY：排序，ASC 升序（默认），DESC 降序

示例：查询 20 岁以上学生，按年龄降序

```sql
SELECT student_name, age FROM students WHERE age > 20 ORDER BY age DESC;
```

### 插入 INSERT（新增数据）

**写法 1：插入全部字段（值顺序必须和建表字段顺序一致）**

```sql
INSERT INTO students VALUES (1, 'Alice', 20);
```

**写法 2：指定部分字段插入（推荐，可读性强）**

```sql
INSERT INTO students (student_id, student_name) VALUES (2, 'Bob');
```

补充：主键自增字段可以填 `NULL`，数据库自动生成数字 ID

### 修改 UPDATE（更新数据）

语法

```sql
UPDATE 表名 SET 列1=值1,列2=值2 [WHERE 条件];
```

示例：修改 id=1 学生年龄为 21

```sql
UPDATE students SET age = 21 WHERE student_id = 1;
```

⚠️ 重点避坑：不加 WHERE 会全表更新，覆盖所有数据，生产环境严禁！

###  删除 DELETE（删除数据）

语法

```sql
DELETE FROM 表名 [WHERE 条件];
```

示例：删除 id=2 的学生

```sql
DELETE FROM students WHERE student_id = 2;
```

⚠️ 避坑：无 WHERE 条件会清空整张表所有数据； 拓展：快速清空表 `TRUNCATE`（SQLite 不支持，MySQL 可用）

## 聚合函数、分组、通配符、别名

###  五大基础聚合函数（统计计算）


<table v-pre><tbody><tr><td>函数</td><td>作用</td></tr><tr><td>COUNT()</td><td>统计行数，COUNT (主键) 统计有效数据，COUNT (*) 统计所有行（含 NULL）</td></tr><tr><td>SUM()</td><td>求和，仅数字字段可用</td></tr><tr><td>AVG()</td><td>求平均值</td></tr><tr><td>MAX()</td><td>获取字段最大值</td></tr><tr><td>MIN()</td><td>获取字段最小值</td></tr></tbody></table>


### GROUP BY 分组统计

作用：按指定列分组，对每组单独执行聚合函数 示例：统计每个班级人数

```sql
SELECT class, COUNT(student_id) FROM students GROUP BY class;
```

### HAVING 分组后过滤

WHERE：原始行过滤；HAVING：分组统计后的结果过滤 示例：筛选人数大于 10 人的班级

```sql
SELECT class,COUNT(student_id) FROM students GROUP BY class HAVING COUNT(student_id) > 10;
```

补充区分 WHERE vs HAVING

1. WHERE 在分组前执行，不能使用聚合函数
2. HAVING 在 GROUP BY 分组后执行，可使用 COUNT/SUM 等聚合结果

### LIKE 模糊查询 + 通配符

配合 WHERE 实现模糊匹配，仅 TEXT 文本字段生效

1. `%`：匹配任意长度任意字符（0 个 / 多个）

```sql
-- 查询名字以A开头的学生
SELECT * FROM students WHERE student_name LIKE 'A%';
```

1. `_`：匹配单个任意字符

```sql
-- 名字3位，中间是o，如Bob、Lox
SELECT * FROM students WHERE student_name LIKE '_o_';
```

### 别名 AS（简化书写）

1）列别名：给查询列起临时名字

```sql
SELECT student_name, age AS student_age FROM students;
```

2）表别名：多表联查简化表名

```sql
SELECT s.student_name, g.score
FROM students AS s
JOIN grades AS g ON s.student_id = g.student_id;
```

补充：`AS` 关键字可省略，直接写 `age student_age`

## 事务处理

### 事务定义与 ACID 四大特性

事务：一组绑定在一起的 SQL 操作，是一个不可分割的逻辑单元

1. 原子性 (A)：全部执行成功 或 全部撤销，无中间半完成状态
2. 一致性 (C)：事务执行前后，数据约束（主键、非空、余额）始终合法
3. 隔离性 (I)：多个并发事务互不干扰，SQLite 默认隔离级别 SERIALIZABLE（串行化）
4. 持久性 (D)：执行 COMMIT 提交后，修改永久写入磁盘，宕机不丢失

### 三大事务控制命令

1. `BEGIN TRANSACTION` / `BEGIN`：显式开启事务
2. `COMMIT` / `END TRANSACTION`：提交事务，保存所有修改
3. `ROLLBACK`：回滚事务，撤销本次所有未提交修改

标准转账示例（双账户同步变更）

```sql
BEGIN TRANSACTION;
-- Alice扣款
UPDATE accounts SET balance = balance - 100 WHERE user = 'Alice' AND balance >= 100;
-- Bob收款
UPDATE accounts SET balance = balance + 100 WHERE user = 'Bob';
-- 无异常则提交，出错则ROLLBACK
COMMIT;
```

### 隐式事务 vs 显式事务（SQLite 默认机制）

SQLite 默认：单条 SQL 自动为隐式事务，执行完立刻提交


<table v-pre><tbody><tr><td>对比项</td><td>隐式事务</td><td>显式事务</td></tr><tr><td>语法</td><td>无需 BEGIN/COMMIT，直接单条 SQL</td><td>BEGIN 包裹，手动 COMMIT/ROLLBACK</td></tr><tr><td>提交时机</td><td>语句执行完毕自动提交</td><td>手动调用 COMMIT 才批量落地</td></tr><tr><td>原子范围</td><td>仅单条语句</td><td>多条操作整体原子化</td></tr><tr><td>适用场景</td><td>简单查询、单条增删改</td><td>转账、订单、多表联动业务</td></tr><tr><td>风险</td><td>多条操作会出现部分成功，数据错乱</td><td>失败全部回滚，保证数据一致</td></tr></tbody></table>


隐式事务示例（两条语句独立提交，中途出错会数据不一致）

```sql
INSERT INTO users (name) VALUES ('Alice'); -- 自动提交
INSERT INTO users (name) VALUES ('Bob');  -- 自动提交
```

###  保存点 SAVEPOINT（模拟嵌套事务）

SQLite 不支持真正嵌套事务，通过保存点实现局部回滚 语法流程：

1. `SAVEPOINT 标记名`：创建局部回滚节点
2. `ROLLBACK TO 标记名`：回滚到保存点，不撤销开启事务前操作
3. `RELEASE 标记名`：删除保存点（可选）

示例：

```sql
BEGIN TRANSACTION;
INSERT INTO logs (event) VALUES ('Start import');
SAVEPOINT batch1; -- 创建保存点
INSERT INTO data VALUES (1, 'A');
INSERT INTO data VALUES (2, 'B');
-- 出错，回滚到batch1，仅撤销两条插入数据
ROLLBACK TO batch1;
RELEASE batch1;
COMMIT; -- 最终提交日志记录
```

###  SQLite 专用函数拓展

`changes()`：返回上一条增删改语句影响的数据行数 转账场景判断余额是否充足：扣款后执行 `SELECT changes();`

- 返回 0：余额不足 / 用户不存在，执行 ROLLBACK 回滚
- 返回 1：扣款成功，执行 COMMIT 完成转账

### 补充拓展知识点

1. SQL 大小写不敏感：SELECT/select、FROM/from 效果完全一致，规范建议关键字大写便于阅读
2. 字符串统一使用单引号 `'张三'`，双引号多用于表名 / 列名
3. 事务性能优化：批量插入大量数据时，用显式事务包裹，大幅减少磁盘 IO，速度提升几十倍
4. 并发提醒：SQLite 写锁全局，长事务会阻塞其他写入，业务中事务尽量简短快速提交
5. 多表查询拓展：JOIN、WHERE 多条件 `AND/OR`、取反 `NOT`、范围 `BETWEEN A AND B`、集合 `IN(值1,值2)`

# SQLite3C语言接口

## 数据库连接管理

### sqlite3_open

函数原型：

```c
int sqlite3_open(const char *filename, sqlite3 **ppDb);
```

参数：

filename：数据库文件路径

1. 普通文件路径：文件不存在则自动创建空白数据库；存在则直接打开
2. `":memory:"`：创建内存数据库，进程销毁数据全部丢失，无磁盘文件
3. `""`：临时磁盘数据库，连接关闭自动删除文件
4.  ppDb：二级输出指针，函数内部赋值 sqlite3 数据库句柄，后续所有操作依赖该句柄

返回值：

SQLITE_OK (0)：打开成功 

非 0 错误码：打开失败，此时 db 句柄不可正常使用，可通过`sqlite3_errmsg(db)`获取错误描述

功能：

1. 建立磁盘 / 内存数据库连接，分配底层文件资源、锁资源
2. 自动初始化数据库文件，无需手动执行建库 SQL
3. 支持多线程打开同库（需开启线程安全编译选项）

### sqlite3_close

#### 函数原型

```c
int sqlite3_close(sqlite3 *db);
```

参数：

db：sqlite3_open 获取的有效数据库句柄 禁止传入 NULL、已关闭、非法句柄，会触发未定义行为（程序崩溃）

返回值：

SQLITE_OK (0)：关闭成功，所有资源完全释放 

SQLITE_ERROR (1)：关闭失败 失败常见原因：存在未调用`sqlite3_finalize`释放的预处理 stmt、未提交事务

功能：

1. 释放数据库文件缓存、读写锁、句柄内存
2. 若存在未提交事务，自动执行回滚，丢弃所有未持久化修改
3. 关闭文件句柄，断开磁盘 IO 通道

### 配套拓展接口

#### sqlite3_errmsg

原型：

```c
const char *sqlite3_errmsg(sqlite3 *db);
```

作用：

获取数据库最近一次操作的错误文本，无需手动释放内存

#### sqlite3_errcode

原型：

```c
int sqlite3_errcode(sqlite3 *db);
```

作用：

获取数字类型错误码，用于程序逻辑判断错误类型

## SQL 语句执行

### sqlite3_exec

函数原型：

```c
int sqlite3_exec(sqlite3 *db, const char *sql,int (*callback)(void*,int,char**,char**),void *userdata, char **errmsg);
```

**功能：**

1. 统一执行建表、增删改查、事务等全部 SQL 语句
2. 查询采用流式回调，逐行读取数据，不一次性加载全部结果，适合百万级大数据集
3. 单函数支持批量多条 SQL 一次性执行

**参数：**

db：有效数据库句柄 

sql：SQL 字符串，支持 DDL/DML/DQL，多条语句用`;`分隔

callback：查询结果回调函数指针

- CREATE/INSERT/UPDATE/DELETE 等非查询语句：传 NULL
- SELECT 查询：必须传入回调函数接收每行数据 
- userdata：自定义用户数据指针，原封不动传入回调第一个参数，用于外部传参、传结构体 
- errmsg：char\*\* 二级输出参数
- 执行失败时自动分配内存存储错误字符串
- 使用结束必须调用`sqlite3_free(errmsg)`释放，否则内存泄漏

返回值：

SQLITE_OK (0)：执行成功 

SQLITE_ERROR (1)：SQL 语法错误、表不存在、约束冲突等执行异常

### 配套回调函数 callback

函数原型：

```c
int callback(void *userdata, int argc, char **argv, char **colNames);
```

**参数：**

userdata：sqlite3_exec 传入的自定义数据  
 argc：当前行字段总列数

 argv：字符串数组，argv [i] 为第 i 列字段值；字段为 NULL 时 argv [i] = NULL 

colNames：字符串数组，colNames [i] 对应第 i 列字段名，和 argv 下标一一对应

**返回值：**

0：继续读取下一行数据

 非 0：终止查询，sqlite3_exec 直接返回错误

**功能：**

自定义处理查询结果逻辑，例如打印、存储数据、数据校验

### sqlite3_get_table

函数原型：

```c
int sqlite3_get_table(sqlite3* db,const char *sql,char ***resultp,int *nrow,int *ncolumn,char **errmsg);
```

**参数：**

db：数据库句柄 

sql：仅支持 SELECT 查询语句，不支持增删改、建表语句 

resultp：三级字符串指针，输出完整结果集

- resultp [0]：全部列名数组
- resultp [1] \~ resultp [nrow]：每一行数据
- 内存由 sqlite 内部分配，使用完成必须调用**`sqlite3_free_table(resultp)`释放**
-  nrow：输出 int 指针，存储有效数据行数，不包含表头行 
- ncolumn：输出 int 指针，存储查询字段总列数 
- errmsg：错误信息字符串，失败后手动释放

**返回值：**

SQLITE_OK (0)：查询成功 

其余数字：各类执行错误码

**功能：**

1. 将整张查询结果一次性加载到内存，无需回调函数，代码逻辑简单
2. 仅适合小结果集（几十 / 几百条数据），数据量大时占用大量堆内存，存在 OOM 风险

### 模块补充拓展说明

1. sqlite3_exec 优缺点 优点：流式读取、内存占用低、支持大批量数据 缺点：必须单独定义回调函数，代码拆分多
2. sqlite3_get_table 优缺点 优点：同步返回全部数据，无回调，逻辑线性 缺点：一次性加载全部数据，大数据场景内存溢出
3. 内存强制释放规则 errmsg → sqlite3_free resultp 结果集 → sqlite3_free_table

## 预处理语句

### 完整执行流程

sqlite3_prepare 预编译 → sqlite3_bind_xxx 绑定参数 → sqlite3_step 执行循环 → sqlite3_finalize 释放句柄

### sqlite3_prepare

函数原型：

```c
int sqlite3_prepare( sqlite3 *db ,const char *zSql,int nByte,sqlite3_stmt **ppStmt,const char **pzTail);
```

**参数：**

db：数据库句柄 

zSql：SQL 模板字符串，使用`?`作为占位符接收外部参数，杜绝 SQL 注入 nByte：SQL 字符串字节长度

- 传 - 1：函数自动计算字符串长度，以`\0`截断
- 传正数：手动指定读取字节数，可截断超长 

SQL ppStmt：二级输出指针，接收预处理语句句柄 sqlite3_stmt\*，绑定、执行、读取字段全部依赖该句柄 pzTail：输出字符串指针

- SQL 包含多条语句时，\*pzTail 指向第一条 SQL 之后剩余未解析语句
- 单条 SQL 直接传 NULL 即可

**返回值：**

SQLITE_OK (0)：预编译成功，生成执行计划 

非 0：SQL 语法错误、内存分配失败

**功能：**

1. 预解析 SQL 语法、生成数据库执行计划，重复执行无需重复编译，性能远高于 sqlite3_exec
2. 分离 SQL 模板与业务参数，从底层阻止 SQL 注入攻击
3. 支持批量循环复用同一条 SQL 模板，适用于批量插入、批量更新场景

### 参数绑定系列接口

#### sqlite3_bind_int

**原型：**

```c
int sqlite3_bind_int(sqlite3_stmt *stmt, int idx, int value);
```

**参数：**

stmt：预处理句柄 

idx：占位符下标，从 1 开始，对应 SQL 中第 1 个？、第 2 个？ 

value：待绑定整型数值

**返回值：**

SQLITE_OK：绑定成功

**功能：**

给整型占位符赋值

#### sqlite3_bind_text

**原型：**

```c
int sqlite3_bind_text(sqlite3_stmt *stmt, int idx, const char *value, int len, void(*free)(void*));
```

**参数：**

stmt、idx：同上 value：绑定字符串 

len：字符串字节长度，

-1 自动计算到`\0` 

free：内存释放回调，三种常用宏

1. SQLITE_STATIC：字符串为静态常量 / 全局变量，sqlite 不复制内存，不释放
2. SQLITE_TRANSIENT：sqlite 内部复制一份字符串，绑定完成后外部可随意销毁原字符串
3. 自定义函数指针：执行完语句后自动调用该函数释放 value 内存

**返回值：**

SQLITE_OK：绑定成功

**功能：**

文本类型占位符赋值，灵活管理字符串内存生命周期

#### 拓展绑定接口

1. sqlite3_bind_int64：绑定 64 位长整型

```c
int sqlite3_bind_int64(sqlite3_stmt *stmt, int idx, sqlite3_int64 value);
```

1. sqlite3_bind_double：绑定浮点小数

```c
int sqlite3_bind_double(sqlite3_stmt *stmt, int idx, double value);
```

1. sqlite3_bind_null：给占位符绑定 NULL 空值

```c
int sqlite3_bind_null(sqlite3_stmt *stmt, int idx);
```

### sqlite3_step

**函数原型：**

```c
int sqlite3_step(sqlite3_stmt *stmt);
```

**参数：**

stmt：完成预编译、参数绑定的预处理句柄

**返回值：**

SQLITE_ROW (100)：查询语句读取到一行有效数据，可调用 sqlite3_column_xxx 读取字段 

SQLITE_DONE (101)：语句完整执行完毕

- INSERT/UPDATE/DELETE：执行成功直接返回
- SELECT：代表无更多行数据 其他数值：执行异常错误码

**功能：**

执行预编译后的 SQL，循环调用可逐行遍历查询结果

### 字段读取系列接口

执行 step 返回 SQLITE_ROW 后，读取每行字段数据专用 API

1. sqlite3_column_int

```c
int sqlite3_column_int(sqlite3_stmt *stmt, int iCol);
```

iCol：列下标，从 0 开始，返回 int 整型 2. sqlite3_column_text

```c
const unsigned char *sqlite3_column_text(sqlite3_stmt *stmt, int iCol);
```

返回字符串指针，无需手动释放 3. sqlite3_column_double

```c
double sqlite3_column_double(sqlite3_stmt *stmt, int iCol);
```

读取浮点数值

### sqlite3_reset

**原型：**

```c
int sqlite3_reset(sqlite3_stmt *stmt);
```

**返回值：**

SQLITE_OK 重置成功

**功能：**

重置预处理语句执行状态，保留预编译结果，无需重新调用 prepare；用于循环批量插入、多次查询，大幅提升性能

### sqlite3_finalize

**函数原型：**

```c
int sqlite3_finalize(sqlite3_stmt *stmt);
```

**参数：**

stmt：预处理语句句柄，使用完毕必须调用，不可遗漏

**返回值：**

SQLITE_OK：释放成功；语句执行过程遗留错误会在此返回

**功能：**

1. 释放 stmt 占用的编译缓存、内存资源
2. 未调用 finalize 会内存泄漏，同时 sqlite3_close 关闭数据库失败

## 全局统一补充开发规范

### 内存释放完整清单

1. sqlite3_exec 输出 errmsg：`sqlite3_free(errmsg)`
2. sqlite3_get_table 结果集 resultp：`sqlite3_free_table(resultp)`
3. 预处理 sqlite3_stmt 句柄：`sqlite3_finalize(stmt)`
4. 数据库连接句柄：`sqlite3_close(db)`

### 场景选型标准

1. 大批量数据查询：sqlite3_exec + 回调函数
2. 少量数据快速读取、简单工具程序：sqlite3_get_table
3. 用户输入参数、循环批量增删改、高频重复 SQL：预处理 prepare + bind
4. 嵌入式业务开发优先使用预处理，安全 + 性能最优

### 安全开发强制规范

1. 禁止字符串拼接用户输入构造 SQL 语句，必须使用预处理占位符防注入
2. 所有动态字符串绑定使用 SQLITE_TRANSIENT，避免野指针
3. 程序退出前必须依次释放 stmt、关闭 db，防止文件锁残留、内存泄漏
4. UPDATE/DELETE 语句必须携带 WHERE 条件，避免全表修改 / 删除

### 常见报错补充说明

1. 关闭数据库失败：存在未 finalize 的 stmt
2. bind 绑定无效果：占位符下标从 1 开始，容易写成 0
3. sqlite3_column 获取空值：字段本身为 NULL，需额外判断
4. 内存越界：sqlite3_get_table 遍历行时下标计算错误

# MySQL扩展介绍

## 什么是 MySQL 数据库

### 1.1 MySQL 基础定义

MySQL 是一款开源跨平台关系型数据库管理系统 (RDBMS)，采用标准 SQL 语言实现数据增删改查，遵循 ACID 事务特性，采用经典 C/S 客户端 - 服务器架构，是互联网后端最主流的数据库。

### 1.2 MySQL 三层分层架构

#### 客户端层

各类编程语言客户端、可视化工具、命令行工具，例如 C API、Python、Java、PHP、Navicat 等，通过 TCP/IP 网络与服务端通信。

#### MySQL 服务层（核心调度层）

1. 连接器：校验客户端账号、密码、权限，建立网络连接
2. 查询缓存：缓存高频完整 SQL 查询结果（新版本 8.0 已移除）
3. 分析器：语法词法解析，校验 SQL 语法合法性，生成语法树
4. 优化器：基于索引、统计信息生成最优执行计划
5. 执行器：调用存储引擎接口，执行 SQL 逻辑

#### 存储引擎层

负责底层数据持久化、事务、锁机制，支持多引擎切换，主流引擎：

1. InnoDB（系统默认）：支持事务、行锁、外键、崩溃恢复，生产环境首选
2. MyISAM：无事务、表级锁，查询速度快，不支持崩溃，安全，仅适用于静态只读数据
3. Memory：数据全存内存，断电丢失，适合临时统计、缓存表

### 1.3 C/S 架构工作流程

![图片展示了MySQL与SQLite架构对比图。应用程序可直接读写SQLite3数据库文件，也可通过TCP/IP与MySQL客户端交互。MySQL客户端与MySQL服务进程通过TCP/IP连接，服务进程包含数据文件、内存缓冲池、日志文件等组件。该图直观呈现了MySQL架构中各部分的连接关系及数据流向，与上下文介绍的MySQL架构内容相呼应，帮助理解MySQL服务端的组成及与客户端的交互方式。](/feishu-assets/557963f28075.jpg)

MySQL与SQLite架构对比图

1. 客户端发起 TCP 连接，携带账号密码完成身份校验
2. 服务层解析、优化 SQL 语句，下发指令至存储引擎
3. InnoDB 操作磁盘数据文件、内存缓冲池、redo/undo 事务日志
4. 查询结果沿网络回传给客户端展示

### 1.4 MySQL 核心基础特性

1. ACID 事务四大特性，保证数据一致性
2. 标准 SQL 语法，兼容绝大多数关系型数据库语法
3. 支持远程网络访问，多客户端同时连接服务端
4. 完善日志体系：二进制日志 binlog、事务日志 redo/undo、错误日志、慢查询日志
5. 支持索引、视图、存储过程、触发器、函数高级功能

## 为什么要使用 MySQL

### MySQL 核心优势、说明与适用场景


<table v-pre><tbody><tr><td>优势</td><td>详细说明</td><td>适用业务场景</td></tr><tr><td>开源免费</td><td>社区版完全开源免费，无商用授权成本；企业版提供付费技术支持</td><td>初创公司、个人项目、中小型网站、校园系统</td></tr><tr><td>高性能读写</td><td>InnoDB 缓冲池缓存热点数据，索引优化、批量写入优化，支撑高并发请求</td><td>电商平台、短视频、社交 Web 后端</td></tr><tr><td>数据可靠稳定</td><td>完整事务日志机制，崩溃自动恢复；支持主从备份、数据容灾</td><td>金融支付、订单系统、库存业务</td></tr><tr><td>易用易上手</td><td>官方文档完善，配套可视化工具丰富，部署、运维门槛低</td><td>快速迭代项目、小型后台管理系统</td></tr><tr><td>水平扩展能力</td><td>支持读写分离、分库分表、主从集群，可支撑海量数据</td><td>大型分布式平台、海量用户业务</td></tr></tbody></table>


### 补充短板（选型参考）

1. 依赖独立服务进程，资源占用高于嵌入式 SQLite3
2. 单机离线嵌入式场景部署繁琐，不适合无操作系统小型设备
3. 网络通信会带来少量性能损耗

## MySQL 核心概念与操作

### 3.1 数据库连接操作

#### 命令行登录语法

```sql
mysql -u root -p
```

- `-u`：指定登录用户名，root 为默认管理员账号
- `-p`：触发密码输入提示，回车后手动输入密码（密码不回显）

#### 拓展登录参数

1. 指定远程 IP 与端口：`mysql -u root -p -h 127.0.0.1 -P 3306`

   - `-h`：数据库服务 IP 地址
   - `-P`：MySQL 默认端口 3306，自定义端口需手动填写
2. 直接携带密码（不安全，仅测试使用）：`mysql -u root -p123456`

### 3.2 数据库基础操作

#### 创建数据库

```sql
CREATE DATABASE IF NOT EXISTS school;
```

- `IF NOT EXISTS`：避免数据库已存在时报错

#### 切换使用数据库

```sql
USE school;
```

后续所有表操作均作用于 school 库

#### 配套拓展库操作

1. 查看所有数据库：`SHOW DATABASES;`
2. 删除数据库：`DROP DATABASE IF EXISTS school;`
3. 查看当前使用库：`SELECT DATABASE();`

### 3.3 数据表创建语法

```sql
CREATE TABLE IF NOT EXISTS students (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    age INT,
    gpa DECIMAL(3,2)
);
```

#### 字段参数详解

1. `INT`：标准整型；`AUTO_INCREMENT`：自增主键，插入数据无需手动赋值
2. `PRIMARY KEY`：主键约束，唯一标识每行数据，不允许 NULL、不允许重复
3. `VARCHAR(50)`：可变长度字符串，最大存储 50 字符，节省存储空间
4. `NOT NULL`：非空约束，插入时该字段必须赋值
5. `DECIMAL(3,2)`：定点小数，总长度 3 位，小数位 2 位，范围 `-99.99 ~ 99.99`

#### 配套表操作拓展

1. 查看当前库所有表：`SHOW TABLES;`
2. 查看表结构：`DESC students;`
3. 删除数据表：`DROP TABLE IF EXISTS students;`

### 3.4 标准 CRUD 增删改查语句

#### 新增 INSERT

```sql
INSERT INTO students (name, age, gpa) VALUES ('张三', 20, 3.8);
```

批量插入多条数据：

```sql
INSERT INTO students (name, age, gpa) 
VALUES ('李四',19,3.6),('王五',21,3.9);
```

#### 查询 SELECT

```sql
-- 全字段查询
SELECT * FROM students;
-- 条件过滤查询
SELECT * FROM students WHERE gpa > 3.5;
-- 指定字段、排序、分页
SELECT name,age FROM students WHERE age>=18 ORDER BY gpa DESC LIMIT 0,10;
```

#### 更新 UPDATE

```sql
UPDATE students SET age = 21 WHERE name = '张三';
```

⚠️ 关键警告：省略 WHERE 条件会更新整张表全部数据，生产环境禁止使用

#### 删除 DELETE

```sql
DELETE FROM students WHERE id = 1;
```

⚠️ 省略 WHERE 会清空整张表；仅删除行数据，保留表结构；清空全表推荐`TRUNCATE TABLE students;`（速度更快，重置自增主键）

### 3.5 MySQL 与 SQLite3 核心规则差异

#### 3.5.1 数据类型约束差异

1. SQLite3：动态弱类型，不严格校验字段类型（会进行隐式转换）

```sql
-- SQLite执行无报错，自动将'123abc'转为文本存储
INSERT INTO numbers (int_col) VALUES ('123abc');
```

1. MySQL：严格强类型模式，非法类型直接抛出错误

```sql
-- MySQL执行报错，无法将字符串'123abc'存入整型字段
INSERT INTO numbers (int_col) VALUES ('123abc');
```

#### 3.5.2 主键空值规则差异

1. SQLite3：INTEGER 主键传入 NULL 自动生成自增 ROWID

```sql
CREATE TABLE t(id INTEGER PRIMARY KEY);
INSERT INTO t(id) VALUES (NULL); -- 执行成功
```

1. MySQL：主键字段强制非空，传入 NULL 直接报错

```sql
CREATE TABLE t(id INT PRIMARY KEY);
INSERT INTO t(id) VALUES (NULL); -- 报错：主键不能为空
```

### 3.6 MySQL 与 SQLite3 数据类型完整对照表


<table v-pre><tbody><tr><td>数据分类</td><td>MySQL 类型</td><td>SQLite3 类型</td><td>补充说明</td></tr><tr><td>整数类型</td><td>TINYINT / SMALLINT / INT / BIGINT</td><td>INTEGER</td><td>MySQL 细分长度，SQLite 统一 INTEGER 自适应</td></tr><tr><td>字符串</td><td>CHAR / VARCHAR</td><td>TEXT</td><td>CHAR 固定长度，VARCHAR 可变长度；SQLite 仅 TEXT</td></tr><tr><td>日期时间</td><td>DATETIME / TIMESTAMP / DATE</td><td>TEXT/INTEGER/REAL</td><td>MySQL 专用时间类型；SQLite 用文本或时间戳存储</td></tr><tr><td>二进制</td><td>BLOB / LONGBLOB</td><td>BLOB</td><td>二者均支持二进制文件存储</td></tr><tr><td>特殊枚举</td><td>ENUM、SET</td><td>无原生支持</td><td>SQLite 无枚举类型，只能用 TEXT 模拟</td></tr></tbody></table>


## MySQL vs SQLite3 全方位对比

### 4.1 基础特性对比表


<table v-pre><tbody><tr><td>对比维度</td><td>MySQL</td><td>SQLite3</td></tr><tr><td>整体架构</td><td>C/S 客户端 - 服务器架构，独立后台进程</td><td>嵌入式文件型数据库，无独立进程</td></tr><tr><td>并发能力</td><td>高并发读写，InnoDB 行级锁，支持上千连接</td><td>单写多读，文件锁限制，同一时间仅 1 个写入操作</td></tr><tr><td>存储形式</td><td>多文件存储（数据、日志、索引分离）</td><td>单一文件存储整个数据库</td></tr><tr><td>网络访问</td><td>原生 TCP/IP 远程访问，支持跨服务器连接</td><td>仅本地文件访问，无网络能力，需上层代码封装</td></tr><tr><td>数据类型</td><td>丰富细分，强类型严格校验</td><td>基础类型，动态弱类型，无强制约束</td></tr><tr><td>事务支持</td><td>InnoDB 完整 ACID、redo/undo 日志崩溃恢复</td><td>支持事务，但无完善崩溃恢复日志</td></tr><tr><td>适用场景</td><td>中大型 Web 服务、分布式系统、高并发后台</td><td>嵌入式设备、移动端、本地桌面工具、IoT 单机程序</td></tr></tbody></table>


### 4.2 底层关键执行流程对比

#### SQLite3 执行流程

1. 应用程序进程直接读写本地数据库文件
2. 通过文件读写锁控制多进程并发冲突
3. 无网络 TCP 通信，本地读写性能损耗极低
4. 无独立缓冲池，缓存依托应用进程内存

#### MySQL 执行流程

1. 客户端通过 TCP/IP 与独立 MySQL 服务进程建立连接
2. 服务端内置内存缓冲池缓存热点数据，减少磁盘 IO
3. 配套完整事务日志（redo 日志、undo 日志），保障宕机数据安全
4. 天然支持多客户端远程同时访问，支持集群、主从同步

### 4.3 选型决策补充总结

1. 选择 MySQL：多用户并发访问、远程服务、海量数据、需要事务容灾、分布式业务
2. 选择 SQLite3：单机本地程序、嵌入式设备、低并发、无需网络、轻量化部署

# 网络词典服务器项目C/S架构

##  项目概述

### 1.1 项目定位与核心目标

本项目是基于Linux TCP Socket、多进程并发、SQLite3 C 开发接口、自定义二进制通信协议实现的 C/S 架构在线英汉词典系统，分为独立服务端程序、客户端程序。

1. 核心目标 

   - 实现多客户端同时接入服务，完成账号注册、登录鉴权；
   - 基于本地词典文本实现单词释义检索；
   - 自动持久化用户每一次单词查询记录，支持历史记录查询；
   - 采用轻量化架构，无需 MySQL 等独立数据库服务，仅依赖单文件 SQLite 数据库。
2. 完整技术栈拆解 

   - 网络层：TCP 流式套接字、阻塞 IO、send/recv 二进制结构体传输；
   - 并发层：fork () 多进程模型，一连接一子进程；
   - 数据库层：SQLite3 原生 C API，使用 sqlite3_exec 回调查询历史数据；
   - 文件层：普通文本 IO，逐行读取词典单词库；
   - 协议层：自定义定长 MSG 结构体，解决 TCP 粘包问题。
3. 运行环境 Linux 系统，编译需链接 sqlite3 库（编译参数 `-lsqlite3`）。

### 1.2 业务完整流程总览

客户端启动 → TCP 连接服务端 → 注册 / 登录鉴权 → 登录成功进入功能菜单 可选操作：单词查询 / 查看个人查询历史 / 退出

- 查询单词：客户端上传单词 → 服务端检索词典 → 返回释义，同时写入历史库；
- 查询历史：客户端发起请求 → 服务端 SQLite 回调逐行推送所有历史记录；
- 退出：关闭套接字，客户端程序结束。

## 服务端系统架构详细设计

### 2.1 整体分层架构

1. 网络接入层（主进程）：socket 创建、端口绑定、监听、accept 接收连接、fork 分发子进程；
2. 业务处理层（子进程）：消息解析、注册 / 登录 / 查询 / 历史业务逻辑；
3. 持久化层：SQLite3 数据库（用户、历史记录）、本地词典 txt 文件（单词释义）；
4. 通信协议层：统一 MSG 结构体二进制数据收发。

### 2.2 多进程并发模型细节

#### 主进程工作完整细节

1. 程序启动阶段： 

   - 初始化全局 SQLite 数据库句柄，自动创建用户表、历史记录表；
   - 创建监听 socket，设置端口复用`setsockopt`，避免服务重启端口占用；
   - bind 绑定 0.0.0.0（本机所有网卡）+ 固定端口，listen 开启监听队列；
2. 循环工作逻辑： 

   - 阻塞调用 accept () 等待客户端 TCP 三次握手；
   - 客户端连接到达，得到新连接套接字 connfd；
   - 调用 fork () 创建子进程；
   - 父进程：立即 close (connfd)（父子进程共享 fd，父进程关闭减少引用计数），回到 accept 循环继续等待下一个客户端；
   - 子进程：关闭监听 socket（子进程不需要监听），持有 connfd 独立处理客户端业务。

#### 子进程工作完整细节

1. 资源隔离特性：每个客户端独占一个子进程，进程间内存、数据库句柄完全隔离；
2. 生命周期：客户端未断开则持续循环收发消息；客户端关闭连接（recv 返回 0）、网络异常时，close (connfd) 后子进程退出；
3. 模型优缺点补充细节 

   - 优点：进程独立隔离，单个客户端异常崩溃不会导致整体服务宕机；阻塞 IO 逻辑简单，无需掌握多路复用；
   - 缺点：大量客户端会生成大量进程，占用操作系统内存与进程号；SQLite 为文件级锁，多进程同时写入会串行阻塞，高并发写入性能差。

### 2.3 底层依赖资源详细说明

1. SQLite3 数据库文件 

   - 单文件存储所有账号、历史数据，服务启动自动检测表，不存在则执行建表 SQL；
   - 每个子进程会独立打开数据库句柄，操作完成后关闭；
   - 写入操作（注册、新增历史记录）会触发 SQLite 文件锁，多进程串行执行。
2. 词典文本文件 

   - 固定格式文本，每行存储`单词|中文释义`；
   - 每次单词查询均重新打开文件，逐行遍历匹配，匹配完成立即关闭文件；
   - 无内存缓存，重复查询同一单词会重复遍历全文件。

## SQLite 数据表完整详细设计

### 3.1 用户表 user

#### 表结构


<table v-pre><tbody><tr><td>字段名</td><td>存储类型</td><td>约束</td><td>业务说明</td></tr><tr><td>name</td><td>TEXT</td><td>PRIMARY KEY</td><td>用户名，全局唯一，登录唯一标识，不可重复</td></tr><tr><td>pass</td><td>TEXT</td><td>无约束</td><td>用户登录密码，项目默认明文存储</td></tr></tbody></table>


#### 建表 SQL 语句

```sql
CREATE TABLE IF NOT EXISTS user(name TEXT PRIMARY KEY, pass TEXT);
```

#### 对应业务操作

1. 注册：INSERT INTO user (name,pass) VALUES (?,?)；若用户名重复，SQLite 主键冲突报错，注册失败；
2. 登录：SELECT pass FROM user WHERE name=?；查询结果与客户端传入密码比对，一致则登录成功。

### 3.2 历史记录表 history

#### 表结构


<table v-pre><tbody><tr><td>字段名</td><td>存储类型</td><td>约束</td><td>业务说明</td></tr><tr><td>name</td><td>TEXT</td><td>普通字段</td><td>操作用户名，关联 user 表，区分不同用户的历史</td></tr><tr><td>date</td><td>TEXT</td><td>普通字段</td><td>查询时间，服务端本地格式化字符串（例：2026-07-23 15:30:00）</td></tr><tr><td>word</td><td>TEXT</td><td>普通字段</td><td>用户本次查询的英文单词</td></tr></tbody></table>


#### 建表 SQL 语句

```c
CREATE TABLE IF NOT EXISTS history(name TEXT, date TEXT, word TEXT);
```

#### 对应业务操作

1. 单词查询成功后自动插入：INSERT INTO history (name,date,word) VALUES (?,?,?)；
2. 历史记录查询：SELECT date,word FROM history WHERE name=?，通过 sqlite3_exec 回调逐行推送数据。

### 3.3 数据库操作细节补充

1. 所有动态参数均使用预处理语句 sqlite3_prepare/sqlite3_bind，避免 SQL 注入；
2. 每次数据库操作完成后释放 stmt 句柄，防止内存泄漏；
3. 子进程退出前关闭 sqlite3 数据库句柄，释放文件锁。

## 自定义通信协议 MSG 完整细节

### 4.1 结构体标准定义

```c
#define NAME_LEN 64
#define DATA_LEN 256
typedef struct {
    int type;         // 操作类型标识
    char name[NAME_LEN];     // 用户名缓冲区，固定长度
    char data[DATA_LEN];   // 通用数据缓冲区
} MSG;
```

### 4.2 type 操作类型完整定义


<table v-pre><tbody><tr><td>type 标识</td><td>业务含义</td><td>场景</td></tr><tr><td>R</td><td>Register</td><td>用户注册请求</td></tr><tr><td>L</td><td>Login</td><td>用户登录请求</td></tr><tr><td>Q</td><td>Query</td><td>单词查询请求</td></tr><tr><td>H</td><td>History</td><td>查询个人历史记录请求</td></tr></tbody></table>


### 4.3 各类型消息字段填充规则

1. 注册消息（R） 

   - name：客户端输入用户名
   - data：客户端输入登录密码
2. 登录消息（L） 

   - name：登录用户名
   - data：登录密码
3. 单词查询（Q） 

   - name：当前登录用户名
   - data：待检索英文单词
4. 历史查询（H） 

   - name：当前登录用户名
   - data：无有效数据，填空即可

### 4.4 响应消息填充规则

服务端统一返回 MSG 结构体，data 字段承载返回内容：

1. 注册响应：data="注册成功" / "用户名已存在"
2. 登录响应：data="登录 OK" / "用户名不存在" / "密码错误"
3. 单词查询响应：data="单词释义" / "未找到该单词"
4. 历史记录响应：每条记录单独发送一条 MSG，data="时间：单词"

### 4.5 协议优势细节

1. 定长二进制结构体，收发直接使用`sizeof(MSG)`，无需处理 TCP 粘包、拆包；
2. 单结构体复用，一套结构承载所有业务请求与响应，简化代码；
3. 字段固定缓冲区，防止字符串溢出，边界可控。

![图片展示了客户端与服务器之间的通信流程。客户端发送MSG结构体给服务器，服务器处理请求后返回MSG结构体给客户端，客户端再接收返回的MSG结构体。流程中包含“发送MSG结构体”“处理请求”“返回MSG结构体”等关键步骤，直观呈现了文档中客户端服务端通信流程的完整交互过程，与上下文对通信交互流程的描述相契合。](/feishu-assets/a030063e2506.png)

客户端服务端通信流程

### 4.6 完整通信交互流程

1. 客户端：填充 MSG 结构体所有字段，调用 send 发送完整数据包；
2. 服务端：循环 recv 读取固定长度 MSG，确保完整接收；
3. 服务端解析 type 字段，分发对应业务处理函数；
4. 业务处理完成，组装响应 MSG；
5. send 将响应包发回客户端；
6. 客户端 recv 读取返回 MSG，解析 data 字段打印展示。

## 服务端全流程深度拆解

### 5.1 服务器启动完整流程（分步细节）

1. 程序初始化：定义全局数据库句柄，打开 SQLite 数据库，执行两张表建表 SQL；
2. 创建监听 socket：socket (AF_INET, SOCK_STREAM, 0)，创建 TCP 套接字；
3. 设置端口复用：setsockopt 设置 SO_REUSEADDR，解决服务重启端口占用；
4. 填充 sockaddr_in 结构体：sin_family=AF_INET，sin_port=htons (自定义端口)，sin_addr.s_addr=INADDR_ANY；
5. bind 绑定地址端口，listen 设置监听队列长度；
6. 进入无限循环，阻塞调用 accept 等待客户端连接；
7. accept 返回新连接 fd，fork 创建子进程； 

   - 父进程 close (connfd)，回到 accept 循环；
   - 子进程 close (监听 socket)，进入客户端业务循环；
8. 子进程循环处理客户端消息，直到连接断开。

### 5.2 子进程请求处理循环细节

1. 循环调用 recv (connfd, &msg, sizeof (MSG), 0) 读取客户端消息；
2. 若 recv 返回 0：客户端正常关闭连接，close (connfd)，子进程 exit 退出；
3. 若 recv 返回 - 1：网络异常，关闭 fd，子进程退出；
4. 读取成功后，判断 msg.type 分支处理： 

   - R：注册业务逻辑；
   - L：登录校验逻辑；
   - Q：单词查询 + 写入历史记录；
   - H：SQLite 回调查询历史并逐行推送；
5. 每一项业务处理完成后，组装响应 MSG，send 发送至客户端，回到循环等待下一条请求。

### 5.3 单词查询文件处理完整细节

1. 读取 MSG.data 中待查询单词；
2. 以只读模式 fopen 打开词典 txt 文件；
3. 定义缓冲区，fgets 逐行读取单行数据；
4. 分割每行字符串，拆分单词、释义两部分；
5. 字符串比对，完全匹配则记录释义，跳出循环；
6. 文件遍历完毕： 

   - 匹配成功：释义存入响应 MSG.data；执行 SQL 插入历史记录；
   - 匹配失败：MSG.data 填充提示文本；不写入历史；
7. fclose 关闭词典文件，发送响应 MSG 给客户端。

### 5.4 历史记录查询回调机制（SQLite3_exec 专用）

#### 回调函数完整原型

```sql
int history_callback(void *arg, int f_num, char **f_value, char **f_name);
```

#### 参数逐行详解

1. void \*arg：外部传入的客户端连接套接字指针（&connfd），在回调内可直接发送数据；
2. int f_num：当前查询单条记录的字段总数量，本业务查询为 2 列（date、word）；
3. char \*\*f_value：字符串数组，存储当前行每一列数据 

   - f_value [0] = 查询时间 date
   - f_value [1] = 查询单词 word
4. char \*\*f_name：字符串数组，存储字段名（本项目无业务使用）

#### 回调执行逻辑细节

1. 执行 SQL 语句：`SELECT date,word FROM history WHERE name=?`；
2. SQLite3 每读取到一条历史记录，自动触发该回调函数；
3. 从 arg 取出 connfd，格式化字符串`"%s : %s"`存入 MSG.data；
4. send 将本条历史记录的 MSG 发送至客户端；
5. 返回 0：告知 sqlite3_exec 继续读取下一条记录；若返回非 0，终止查询；

#### 机制优势

流式逐行推送，无需一次性把所有历史记录加载到内存，适合用户大量查询记录场景。

## 客户端完整深度设计

### 6.1 客户端四大核心模块详细说明

1. 用户认证模块 

   - 注册：输入用户名、密码，组装 R 类型 MSG 发送，接收注册结果并打印；校验用户名重复；
   - 登录：输入账号密码，组装 L 类型 MSG，服务端校验后返回登录状态，登录成功切换二级菜单；
2. 单词查询模块 

   - 输入英文单词，组装 Q 类型 MSG 发送；
   - 阻塞等待服务端返回释义，打印结果；
3. 历史记录查询模块 

   - 发送 H 类型请求，循环持续接收服务端回调推送的多条 MSG；
   - 逐条打印每条历史记录（时间 + 单词）；
4. 网络连接管理模块 

   - 程序启动创建 TCP socket，主动连接服务端 IP + 端口；
   - 退出时 close 套接字，释放网络资源；
   - 增加基础异常判断：连接失败提示、断开提示。

### 6.2 两级菜单交互完整逻辑

#### 一级菜单（未登录状态）

```text
************************************
* 1: 注册   2: 登录   3: 退出 *
************************************
请选择模式:
```

1. 选择 1 注册：输入用户名、密码，发送注册请求，接收服务端返回提示；
2. 选择 2 登录：输入账号密码，发送登录请求；若返回登录 OK，跳转二级菜单；账号 / 密码错误停留在一级菜单；
3. 选择 3 退出：关闭 socket，客户端程序结束。

#### 二级菜单（登录成功后）

```text
************************************
* 1: 查询   2: 历史   3: 退出  *
************************************
请选择模式:
```

1. 选择 1 单词查询：提示输入单词，发送查询包，接收并打印释义；
2. 选择 2 历史查询：发送历史请求，循环接收多条 MSG，逐行打印所有历史记录；
3. 选择 3 退出：断开 TCP 连接，返回一级登录菜单。

### 6.3 客户端通信完整细节

1. 客户端 socket 为阻塞 IO，发送消息后会等待服务端返回数据；
2. 发送 MSG 时直接传入 sizeof (MSG)，保证完整结构体传输；
3. 接收历史记录时，需要循环 recv，直到服务端所有记录推送完成；
4. 用户名全程保存在客户端本地变量，后续查询、历史请求自动填充 MSG.name，无需重复输入。

## 项目补充拓展知识点、缺陷与优化方案

### 7.1 项目覆盖核心知识点汇总

1. Linux 网络编程：socket 创建、bind、listen、accept、TCP 连接、send/recv、端口复用；
2. 多进程编程：fork 父子进程资源管理、文件描述符生命周期、进程退出；
3. SQLite3 C 接口：sqlite3_open、sqlite3_exec、回调函数、建表、增删改查、预处理语句；
4. 文件 IO：fopen/fgets/fclose 文本逐行读取、字符串分割匹配；
5. 自定义二进制协议：定长结构体传输、TCP 粘包解决方案；
6. C 程序内存管理：字符串缓冲区、结构体复用、数据库句柄释放。

### 7.2 现有项目存在缺陷（细节补充）

1. 账号安全缺陷 

   - 用户密码明文存储在 SQLite 数据库，泄露后可直接获取所有账号密码；
   - 无输入过滤，用户名、单词可传入特殊字符，存在 SQL 注入风险；
2. 并发性能缺陷 

   - fork 多进程模型，大量客户端会耗尽系统进程资源；
   - SQLite 文件锁，多进程同时写入历史记录会串行阻塞，并发写入卡顿；
   - 每次单词查询重复打开、遍历词典文件，IO 开销高；
3. 异常处理缺陷 

   - 缺少网络断开、数据库打开失败、词典文件缺失的完整容错；
   - 缓冲区无边界判断，超长输入会造成数组越界；
4. 资源释放缺陷 

   - 子进程异常退出时，存在数据库句柄、文件句柄泄漏风险；
   - 未使用 sqlite3_free、sqlite3_finalize 规范释放数据库内存。

### 7.3 针对性优化方案

1. 安全优化 

   - 密码使用 MD5/SHA256 哈希加密后存入数据库，不存储明文；
   - 所有 SQL 操作统一使用预处理 bind 接口，彻底杜绝 SQL 注入；
   - 增加输入长度限制，截断超长字符串，防止缓冲区溢出。
2. 并发性能优化 

   - 替换 fork 多进程模型，使用 epoll IO 多路复用单进程高并发；
   - 程序启动一次性读取词典全部内容存入内存哈希表，查询直接内存匹配，消除重复文件 IO；
   - 使用 SQLite 写事务批量提交历史记录，减少文件锁竞争。
3. 健壮性优化 

   - 增加全流程返回值判断，socket、数据库、文件操作失败均打印错误信息；
   - 封装统一的 MSG 收发函数，统一处理半包、断连场景；
   - 子进程退出前统一关闭数据库、文件、套接字资源。
4. 功能拓展优化 

   - 增加单词模糊查询、分页查询历史记录；
   - 增加用户修改密码、删除历史记录功能；
   - 增加日志文件，记录登录、查询、异常事件。
