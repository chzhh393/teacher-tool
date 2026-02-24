# 更新飞书使用说明书

将 `docs/user-guide.md` 的内容同步到飞书知识库文档。

## 飞书 API 配置

- App ID: `cli_a83a3bc9ac79500c`
- App Secret: `kTdxzjFlcy5sQxndCYVOpgI35kqzfeiw`
- Wiki Token: `VbCGw1MsgiYunBkrWpecRuejnev`
- Document ID: `DBQPdmJmVoirtNx4zHjc2DLrnqb`
- 文档地址: `https://yiolg9aex7.feishu.cn/wiki/VbCGw1MsgiYunBkrWpecRuejnev`
- API Base: `https://open.feishu.cn/open-apis`

## 前置条件

飞书文档的链接分享权限必须设为**「可编辑」**，否则 API 会返回 `1770032 forBidden`。如果遇到此错误，提醒用户去飞书文档「分享」中修改权限。

## 认证流程

```
POST /auth/v3/tenant_access_token/internal
Body: { "app_id": "...", "app_secret": "..." }
Response: { "tenant_access_token": "..." }
```

所有后续请求 Header: `Authorization: Bearer {token}`

## 核心 API

### 1. 获取文档子块
```
GET /docx/v1/documents/{doc_id}/blocks/{doc_id}/children?page_size=500
```

### 2. 批量删除子块（清空文档）
```
DELETE /docx/v1/documents/{doc_id}/blocks/{doc_id}/children/batch_delete
Body: { "start_index": 0, "end_index": N }
```

### 3. 创建子块（写入内容）
```
POST /docx/v1/documents/{doc_id}/blocks/{doc_id}/children
Body: { "children": [...blocks], "index": N }
```
- 每批最多 20 个 block，批次间隔 1 秒
- index 从 0 开始递增

### 4. 更新文本块
```
PATCH /docx/v1/documents/{doc_id}/blocks/{block_id}
Body: { "update_text_elements": { "elements": [...] } }
```

### 5. 更新图片块
```
PATCH /docx/v1/documents/{doc_id}/blocks/{block_id}
Body: { "replace_image": { "token": "file_token", "width": N, "height": N } }
```

## Block 类型对照表

| 类型 | block_type | key | 说明 |
|------|-----------|-----|------|
| 文本段落 | 2 | `text` | 普通文本 |
| 一级标题 | 3 | `heading1` | `##` |
| 二级标题 | 4 | `heading2` | `##` |
| 三级标题 | 5 | `heading3` | `###` |
| 四级标题 | 6 | `heading4` | `####` |
| 无序列表 | 12 | `bullet` | `- xxx` |
| 有序列表 | 13 | `ordered` | `1. xxx` |
| 代码块 | 14 | `code` | ``` |
| 分割线 | 22 | `divider` | `---`，必须带 `"divider": {}` |
| 图片 | 27 | `image` | 需要 3 步流程 |

### Block 结构示例

```json
// 文本
{ "block_type": 2, "text": { "elements": [{ "text_run": { "content": "文本内容" } }] } }

// 加粗文本
{ "block_type": 2, "text": { "elements": [{ "text_run": { "content": "加粗", "text_element_style": { "bold": true } } }] } }

// 标题
{ "block_type": 4, "heading2": { "elements": [{ "text_run": { "content": "二级标题" } }] } }

// 分割线（必须带 divider: {}）
{ "block_type": 22, "divider": {} }

// 空图片占位块
{ "block_type": 27, "image": {} }
```

## 图片插入（3 步流程）

图片不能直接带 token 创建，必须分 3 步：

### 第 1 步：创建空图片块
```
POST /docx/v1/documents/{doc_id}/blocks/{doc_id}/children
Body: { "children": [{ "block_type": 27, "image": {} }], "index": N }
Response → children[0].block_id
```

### 第 2 步：上传图片到该块
```
POST /drive/v1/medias/upload_all
Content-Type: multipart/form-data
Fields:
  - file_name: "xxx.png"
  - parent_type: "docx_image"
  - parent_node: "{block_id}"  ← 第 1 步返回的 block_id
  - size: "文件字节数"
  - file: 二进制文件
Response → data.file_token
```

### 第 3 步：PATCH 关联图片
```
PATCH /docx/v1/documents/{doc_id}/blocks/{block_id}
Body: { "replace_image": { "token": "{file_token}", "width": 800, "height": 500 } }
```

**注意**：如果跳过第 3 步，图片块会显示为 100x100 的空白占位。

## 执行流程

### 场景一：全量同步（用户说"同步说明书"、"全量更新"）

1. 读取 `docs/user-guide.md` 内容
2. 获取 tenant_access_token
3. 获取文档现有子块，批量删除全部内容
4. 将 Markdown 转换为飞书 Block 数组
5. 按每批 20 个写入，批次间隔 1 秒
6. 处理图片：图片在 `docs/user-guide-images/` 目录，按 3 步流程插入
7. 完成后输出文档链接

### 场景二：局部更新（用户说"加个FAQ"、"改一下xxx"）

1. 获取文档所有子块
2. 根据文本内容搜索定位目标块
3. 用 PATCH `update_text_elements` 更新文本
4. 或在指定位置用 POST 插入新块
5. 同步修改本地 `docs/user-guide.md`

### 场景三：仅更新图片

1. 获取文档所有子块，筛选 block_type=27 的图片块
2. 对比 `docs/user-guide-images/` 中的图片
3. 对需要更新的图片执行 3 步流程

## 常见错误

| 错误码 | 含义 | 解决方案 |
|--------|------|----------|
| 1770032 | forBidden | 文档链接分享未设为「可编辑」，提醒用户修改 |
| 1770001 | invalid param | 检查 block 结构，divider 是否带 `"divider": {}`，image 是否用了 3 步流程 |
| 99991672 | scope 不足 | 需要在飞书开发者后台添加 `docx:document` 权限 |

## 关键约束

- 写 Python 脚本到 `/tmp/` 目录执行，不要在项目目录创建临时文件
- 每批最多 20 个 block，过多会超时
- 批次间隔至少 1 秒，避免限流
- 图片必须用 3 步流程（创建空块 → 上传 → PATCH）
- 飞书文档和本地 `docs/user-guide.md` 必须保持同步
- 完成后提供文档链接给用户
