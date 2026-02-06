# 部署文档（静态网站托管）

> 版本：v1.0  
> 最后更新：2026-02-06  
> 适用环境：cloud1-3g9mi825a3a27f25  

---

## 1. 前置条件

- Node.js + npm 已安装
- 项目路径：`app/`
- 构建输出目录：`app/dist/`

## 2. 安装 CloudBase CLI

```bash
npm install -g @cloudbase/cli
```

若首次使用 CLI，需要登录：

```bash
tcb login
```

## 3. 构建产物

在 `app/` 目录执行：

```bash
npm run build
```

产物输出到 `app/dist/`。

## 4. 部署到静态网站托管

将 `dist` 上传到根目录：

```bash
tcb hosting deploy "app/dist" / -e cloud1-3g9mi825a3a27f25
```

部署完成后，访问地址：

```
https://cloud1-3g9mi825a3a27f25-1368265332.tcloudbaseapp.com/
```

建议带缓存刷新参数：

```
https://cloud1-3g9mi825a3a27f25-1368265332.tcloudbaseapp.com/?v=YYYYMMDD-xxxx
```

## 5. 查看托管文件

```bash
tcb hosting list -e cloud1-3g9mi825a3a27f25
```

## 6. 删除托管文件

删除指定文件或目录：

```bash
tcb hosting delete <cloudPath> -e cloud1-3g9mi825a3a27f25
```

删除全部文件（谨慎）：

```bash
tcb hosting delete -e cloud1-3g9mi825a3a27f25
```

## 7. admin 目录不部署

当前构建产物不包含 `admin/` 目录；若托管中已存在，可手动删除：

```bash
tcb hosting delete /admin -e cloud1-3g9mi825a3a27f25
```

若后续构建产物里意外包含 `admin/`，请检查构建配置或路由输出后再部署。

## 8. 控制台入口

- 静态网站托管：`https://tcb.cloud.tencent.com/dev?envId=cloud1-3g9mi825a3a27f25#/static-hosting`
