# NPC 垃圾分类器

基于 Next.js + TensorFlow.js 的浏览器端图片分类项目。

## 项目能力

- 图片输入：拍照 / 本地上传 / URL / 剪贴板
- 模型推理：浏览器端 TensorFlow.js
- 结果展示：Top 3、置信度、原始类别名
- 管理面板：`/admin`（本地日志筛选、CSV 导出）
- 多语言：中文 / 한국어

## 快速启动

```bash
npm install
npm run dev
```

生产：

```bash
npm run build
npm run start
```

## 模型文件规范

将 TFJS 模型放到：

- `public/model/model.json`
- `public/model/group1-shard*.bin`
- `public/model/labels.txt`

说明：

- 前端默认加载：`/model/model.json?v=MODEL_VERSION`
- `labels.txt` 每行一个类别名，顺序必须和训练输出一致
- 当模型输出不是固定 5 类时，页面会直接显示原始类别名（不强制映射）

## 与训练项目联动

训练项目目录：`D:\Code\Python\Docker_project`

推荐训练命令（3个数据目录全部参与，按原始类别直接多分类）：

```powershell
cd D:\Code\Python\Docker_project
docker compose run --rm my_app python /opt/project/ml/run_pipeline.py --use-all-three --all-classes --low-memory
```

训练完成后复制模型到本项目：

```powershell
Copy-Item -Force D:\Code\Python\Docker_project\ml\artifacts\all_classes\tfjs_model\* D:\Code\npc_project\public\model\
```

然后修改版本号防止浏览器缓存旧模型：

- 文件：`app/page.tsx`
- 常量：`MODEL_VERSION`

## 输出兼容策略

前端兼容两类输出：

1. 固定 5 类输出
- 直接使用 5 类标签展示

2. 任意 N 类输出（推荐）
- 按 `labels.txt` 显示 Top3 原始类别
- 不再强制回落到旧的固定映射类别

## 日志面板（/admin）

日志存储在 `localStorage`（键：`npc_inference_logs_v1`），字段包括：

- `timestamp`
- `source`
- `topLabel`
- `topConfidence`
- `undetermined`
- `rawTopClass`
- `latencyMs`

支持：刷新、筛选、导出 CSV、清空。

## 常见问题

### 1) 模型加载失败

检查：

- `public/model/model.json` 是否存在
- `group1-shard*.bin` 是否齐全
- `labels.txt` 是否与模型输出维度一致

### 2) 页面仍显示旧模型结果

- 更新 `app/page.tsx` 的 `MODEL_VERSION`
- 强刷浏览器缓存后重试

### 3) 摄像头打不开

检查：

- 浏览器权限
- HTTPS 或 localhost
- 是否被其他应用占用
