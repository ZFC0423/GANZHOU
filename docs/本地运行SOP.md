# 本地运行 SOP

这份文档是给项目维护阶段反复使用的“本地启动说明”。

目标只有一个：

1. 你以后想看前台页面时，能自己把服务稳定挂起来。
2. 你以后想看后台页面时，能自己把服务稳定挂起来。
3. 你遇到“页面打不开”“接口报错”“数据加载失败”时，知道先查哪里。

## 1. 项目结构

本仓库一共有 3 个需要关注的服务：

- `server/`：后端接口服务
- `client-web/`：前台游客端
- `admin-web/`：后台管理端

如果你只是想看前台网站，至少要启动：

- `server`
- `client-web`

如果你还想看后台管理页，就再启动：

- `admin-web`

## 2. 第一次准备

### 2.1 安装依赖

第一次拉仓库，或者删除过 `node_modules` 后，需要重新安装依赖。

分别在 3 个目录执行：

```powershell
cd C:\Users\Administrator\Desktop\ganzhou-travel-platform\server
npm install
```

```powershell
cd C:\Users\Administrator\Desktop\ganzhou-travel-platform\client-web
npm install
```

```powershell
cd C:\Users\Administrator\Desktop\ganzhou-travel-platform\admin-web
npm install
```

如果你的系统里直接输入 `npm` 提示找不到命令，就改用：

```powershell
D:\npm.cmd install
```

### 2.2 准备数据库

先保证 MySQL 已启动，然后导入数据库脚本：

1. 导入 [schema.sql](C:\Users\Administrator\Desktop\ganzhou-travel-platform\sql\schema.sql)
2. 数据库名统一使用 `ganzhou_travel_platform`

### 2.3 配置后端环境变量

把 [server/.env.example](C:\Users\Administrator\Desktop\ganzhou-travel-platform\server\.env.example) 复制为 `server/.env`。

重点检查这几个字段：

```env
PORT=3000
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=ganzhou_travel_platform
DB_USER=root
DB_PASSWORD=123456
```

如果数据库用户名或密码和你本机不一样，一定要改成你自己的。

## 3. 标准启动顺序

以后每次本地看网站，都按这个顺序来。

### 第 1 步：先启动后端

新开一个终端窗口，执行：

```powershell
cd C:\Users\Administrator\Desktop\ganzhou-travel-platform\server
npm run dev
```

正常启动后，终端里应该能看到类似：

```text
[database] connection established successfully
[server] ganzhou-travel-platform-server is running at http://localhost:3000
```

这一步最重要。

只要后端没起来，前端页面就很容易出现：

- 首页数据加载失败
- 请求报错
- 登录失败
- AI 页面无响应

### 第 2 步：启动前台

再开第二个终端窗口，执行：

```powershell
cd C:\Users\Administrator\Desktop\ganzhou-travel-platform\client-web
npm run dev -- --host 127.0.0.1 --port 4173
```

启动后在浏览器打开：

- 前台地址：[http://127.0.0.1:4173/](http://127.0.0.1:4173/)

### 第 3 步：启动后台

如果你还要看管理端，再开第三个终端窗口：

```powershell
cd C:\Users\Administrator\Desktop\ganzhou-travel-platform\admin-web
npm run dev -- --host 127.0.0.1 --port 4174
```

启动后在浏览器打开：

- 后台地址：[http://127.0.0.1:4174/admin/login](http://127.0.0.1:4174/admin/login)

默认管理员账号：

- 用户名：`admin`
- 密码：`Admin@123456`

## 4. 推荐的终端分工

为了不混乱，建议你固定用 3 个终端窗口：

### 终端 1：后端

```powershell
cd C:\Users\Administrator\Desktop\ganzhou-travel-platform\server
npm run dev
```

### 终端 2：前台

```powershell
cd C:\Users\Administrator\Desktop\ganzhou-travel-platform\client-web
npm run dev -- --host 127.0.0.1 --port 4173
```

### 终端 3：后台

```powershell
cd C:\Users\Administrator\Desktop\ganzhou-travel-platform\admin-web
npm run dev -- --host 127.0.0.1 --port 4174
```

这样做的好处是：

- 后端报错时你能立刻看到
- 前台报错和后台报错不会混在一起
- 关闭某个服务时，直接关对应窗口就行

## 5. 每次启动后的最小检查

建议按下面顺序检查。

### 5.1 先看后端终端

确认后端窗口里已经出现：

```text
running at http://localhost:3000
```

如果没有这一句，就先不要去看前端页面。

### 5.2 直接测后端接口

浏览器打开：

- [http://localhost:3000/api/front/home](http://localhost:3000/api/front/home)

如果看到 JSON 数据，说明后端接口是通的。

### 5.3 再看前台

打开：

- [http://127.0.0.1:4173/](http://127.0.0.1:4173/)

### 5.4 再看后台

打开：

- [http://127.0.0.1:4174/admin/login](http://127.0.0.1:4174/admin/login)

## 6. 常见问题排查 SOP

### 6.1 前台页面能打开，但显示“主页数据加载失败”

优先检查这 3 件事：

1. `server` 是否真的启动成功
2. MySQL 是否真的启动
3. [server/.env](C:\Users\Administrator\Desktop\ganzhou-travel-platform\server\.env) 数据库配置是否正确

这是最常见情况。

前台页面能打开，只说明 `client-web` 启动了。
页面里的数据能不能显示，取决于后端接口是否正常。

### 6.2 浏览器提示 CORS 错误

建议你本地固定用：

- 前台：`127.0.0.1:4173`
- 后端：`localhost:3000`
- 后台：`127.0.0.1:4174`

不要今天用 `localhost:5173`，明天又换成 `127.0.0.1:4173`。

前端地址一变，后端 CORS 白名单就可能不匹配。

### 6.3 后端启动时报数据库连接失败

先检查：

- MySQL 是否启动
- 数据库 `ganzhou_travel_platform` 是否存在
- [server/.env](C:\Users\Administrator\Desktop\ganzhou-travel-platform\server\.env) 里的账号密码是否正确

如果终端里没有看到：

```text
[database] connection established successfully
```

那就说明后端还没连上数据库。

### 6.4 前台请求地址不对

这里有一个容易踩坑的地方：

[client-web/src/api/request.js](C:\Users\Administrator\Desktop\ganzhou-travel-platform\client-web\src\api\request.js) 里读取的是：

```js
VITE_API_BASE
```

而根目录 [.env.example](C:\Users\Administrator\Desktop\ganzhou-travel-platform\.env.example) 里写的是：

```env
VITE_CLIENT_API_BASE
```

也就是说，如果你以后要单独给前台配环境变量，建议在 `client-web` 里使用：

```env
VITE_API_BASE=http://localhost:3000
```

后台则使用：

```env
VITE_ADMIN_API_BASE=http://localhost:3000
```

### 6.5 端口被占用

如果运行 `npm run dev` 时提示端口被占用：

1. 先看是不是你之前已经开过一个同样的服务
2. 直接关闭旧的终端窗口
3. 再重新启动

对于初学阶段，不建议上来就用复杂的进程杀死命令。
最简单的方法就是：

- 哪个窗口启动的服务，就关闭哪个窗口

## 7. 最稳定的使用习惯

以后尽量固定以下地址：

- 后端：`http://localhost:3000`
- 前台：`http://127.0.0.1:4173`
- 后台：`http://127.0.0.1:4174`

以后尽量固定以下顺序：

1. 先开 `server`
2. 再开 `client-web`
3. 最后开 `admin-web`

以后尽量固定以下排查顺序：

1. 先看后端终端有没有报错
2. 再测 `http://localhost:3000/api/front/home`
3. 再去看前台页面

## 8. 一套最短口令版

如果你只想快速照着敲，记住下面这三段就够了。

```powershell
cd C:\Users\Administrator\Desktop\ganzhou-travel-platform\server
npm run dev
```

```powershell
cd C:\Users\Administrator\Desktop\ganzhou-travel-platform\client-web
npm run dev -- --host 127.0.0.1 --port 4173
```

```powershell
cd C:\Users\Administrator\Desktop\ganzhou-travel-platform\admin-web
npm run dev -- --host 127.0.0.1 --port 4174
```

然后分别打开：

- [http://localhost:3000/api/front/home](http://localhost:3000/api/front/home)
- [http://127.0.0.1:4173/](http://127.0.0.1:4173/)
- [http://127.0.0.1:4174/admin/login](http://127.0.0.1:4174/admin/login)
