# NPC 垃圾分类器

基于 Next.js + TensorFlow.js 的浏览器端垃圾分类演示项目。

## 项目概览

本项目支持“拍照/上传 -> 模型推理 -> 垃圾类别建议”的完整流程，提供中韩双语界面与本地统计看板。

核心流程：

1. 接收图片输入（相机、本地文件、URL、剪贴板）。
2. 模型推理并输出分类分数。
3. 生成 Top3 结果与投放建议。
4. 当置信度过低时标记 `undetermined`（不可判定），避免误导。

## 功能清单

- 相机拍照识别（拍后确认：`retake` / `use photo`）
- 相机前后摄切换（移动端）
- 上传识别（本地文件 / 图片 URL / 剪贴板）
- 低置信度兜底（阈值 45%）
- 结果展示：映射 Top3、原始物体 Top3、判定依据
- 模型按需加载 + 首次加载进度条
- 中韩双语切换（`npc_lang`）
- `/admin` 推理日志统计、筛选、CSV 导出

## 技术栈

- Next.js 15（App Router）
- React 19
- TypeScript
- TensorFlow.js（`@tensorflow/tfjs`）

## 页面路由

- `/` 主分类页面
- `/admin` 本地统计看板

## 运行方式

```bash
npm install
npm run dev
```

生产环境：

```bash
npm run build
npm run start
```

## 模型文件与版本

将模型文件放置到：

- `public/model/model.json`
- `public/model/weights.bin`

当前通过版本参数加载模型（防缓存）：

- `MODEL_VERSION = "model-v2"`（`app/page.tsx`）
- 实际地址：`/model/model.json?v=model-v2`

发布新模型时，请同步更新 `MODEL_VERSION`。

## 模型输出格式（重要）

项目当前同时兼容两种输出格式：

### A. 5 类直出模型

若模型输出长度为 5，按以下顺序直接解释为垃圾类别：

1. `General waste`
2. `Food waste`
3. `Recyclables`
4. `Hazardous waste`
5. `Bulk waste`

### B. 8 类物体模型（再映射到 5 类）

若模型输出长度为 8，顺序必须严格为：

1. `can`
2. `bottle`
3. `food`
4. `battery`
5. `paper`
6. `plastic`
7. `furniture`
8. `background`

映射规则：

- `can / bottle / paper / plastic` -> `Recyclables`
- `food` -> `Food waste`
- `battery` -> `Hazardous waste`
- `furniture` -> `Bulk waste`
- 其他（含 `background`）-> `General waste`

## 置信度策略

- 阈值：`LOW_CONFIDENCE_THRESHOLD = 0.45`
- 映射后 Top1 < 45% 时：
  - 标记为 `undetermined`
  - 引导用户重拍/调整角度
  - 不强行给出高风险分类建议

## 上传与相机说明

### 上传方式

- 本地图片：文件选择器
- 图片 URL：支持 `http/https` 且扩展名匹配常见图片后缀（如 `jpg/png/webp/gif/bmp/svg`）
- 剪贴板：支持粘贴截图（`Ctrl/Cmd + V`）和主动读取剪贴板

### 相机能力

- 支持浏览器相机调用（需 HTTPS 或 localhost）
- 常见错误（权限拒绝、设备不存在、设备占用）会弹窗提示
- 前置摄像头画面会做非镜像校正提示

## 管理看板（`/admin`）

日志存储：`localStorage` -> `npc_inference_logs_v1`

每条日志字段：

- `id`
- `timestamp`
- `source`（`camera/local/url/clipboard`）
- `latencyMs`
- `topLabel`
- `topConfidence`
- `undetermined`
- `rawTopClass`

看板功能：

- 总请求数
- 低置信度占比
- 平均耗时
- 按来源筛选
- 仅看 `undetermined`
- 导出当前筛选结果为 CSV

日志上限：`LOG_LIMIT = 200`（超过后按最新优先保留）。

## 语言设置

- 首页将语言保存到 `localStorage` 的 `npc_lang`
- `/admin` 自动沿用同一语言

## 常见问题

### 1) 运行时报错 `Cannot find module './xxx.js'`

通常是开发缓存导致：

```bash
cmd /c "rmdir /s /q .next"
npm run dev
```

### 2) 相机无法打开

- 检查浏览器权限
- 确认运行环境为 HTTPS 或 localhost
- 关闭占用相机的其他应用

### 3) 模型加载失败

- 检查 `model.json` 与 `weights.bin` 是否存在
- 检查输出格式是否符合“5 类直出”或“8 类映射”要求

## 备注

- `src/App.tsx` 为模板兼容保留文件。
- 主页面实现位于 `app/page.tsx`。
