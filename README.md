# NPC Trash Classifier

基于 **Next.js 15 + TensorFlow.js** 的浏览器端垃圾分类项目。  
核心流程是：

1. 模型输出 8 类物体概率
2. 前端映射为 5 类垃圾
3. 低置信度进入“不可判定”兜底

---

## 1. 功能清单

- 相机识别（前后摄切换、拍后“重拍/使用照片”确认）
- 上传识别（本地文件 / 图片 URL / 剪贴板截图）
- 8 类物体 Top3 + 5 类垃圾 Top3 同时展示
- 低置信度兜底（Top1 < 45% -> 不可判定）
- 判定依据文案（根据原始 Top1 类别解释）
- 中韩双语界面
- 模型加载进度条
- `/admin` 本地埋点统计页

---

## 2. 技术栈

- Next.js 15 (App Router)
- React 19
- TypeScript
- TensorFlow.js (`@tensorflow/tfjs`)

---

## 3. 目录结构

```text
app/
  page.tsx           # 主页面（上传/相机/识别/映射/埋点）
  admin/page.tsx     # 管理页（埋点统计）
  globals.css        # 全局样式
public/
  model/
    model.json
    weights.bin
```

---

## 4. 快速启动

```bash
npm install
npm run dev
```

开发地址：`http://localhost:3000`  
管理页：`http://localhost:3000/admin`

生产构建：

```bash
npm run build
npm run start
```

---

## 5. 模型放置与版本控制

模型固定路径：

- `public/model/model.json`
- `public/model/weights.bin`

代码使用版本化地址加载模型：

- `app/page.tsx` 中 `MODEL_VERSION = 'model-v2'`
- 实际加载：`/model/model.json?v=model-v2`

更新模型时，建议同步修改 `MODEL_VERSION`，强制浏览器拉取新缓存。

---

## 6. 训练类别顺序（必须一致）

输出顺序必须为：

1. `can`
2. `bottle`
3. `food`
4. `battery`
5. `paper`
6. `plastic`
7. `furniture`
8. `background`

项目按“索引位置”读取模型输出，顺序不一致会导致映射错位。

---

## 7. 映射规则（8 -> 5）

- `can / bottle / paper / plastic` -> `Recyclables`
- `food` -> `Food waste`
- `battery` -> `Hazardous waste`
- `furniture` -> `Bulk waste`
- 其他（含 `background`）-> `General waste`

实现位置：

- `mapToTrash()`
- `mapScoresToTrashPredictions()`

均在 [app/page.tsx](/D:/Code/npc_project/app/page.tsx) 中。

---

## 8. 结果可信度策略

- 置信度阈值：`LOW_CONFIDENCE_THRESHOLD = 0.45`
- 若映射后 Top1 < 45%：
  - 显示“不可判定”
  - 提示重拍/换角度
  - 不强制给出垃圾类别

---

## 9. 上传与相机交互

### 上传方式窗口

- 点击“上传图片”弹出居中窗口（非底部抽屉）
- 支持三种来源：
  - 本地文件
  - URL
  - 剪贴板截图

### 相机流程

- 顶部：关闭 / 切换摄像头
- 中间：实时预览
- 底部：快门
- 拍照后进入二次确认：
  - 重拍
  - 使用照片（确认后才开始识别）

### 错误提示

- 相机打开失败时会弹出居中错误模态（PC 端更明显）

---

## 10. 预览清晰度策略

- 预览图使用 `next/image`
- 预览样式使用 `object-fit: contain`
- 显示原图分辨率（宽 x 高）

---

## 11. 埋点与 Admin

识别成功后写入 `localStorage`（key: `npc_inference_logs_v1`）：

- 输入来源（camera/local/url/clipboard）
- 推理耗时（ms）
- Top1 类别与置信度
- 是否低置信度兜底
- 原始 Top1 类别

`/admin` 页面提供：

- 总请求数
- 低置信度占比
- 平均耗时
- 明细表（时间、来源、Top1、状态）

---

## 12. 常见问题

### 12.1 `Cannot find module './xxx.js'`（Next dev 运行时）

一般是 `.next` 缓存损坏。执行：

```bash
cmd /c "rmdir /s /q .next"
npm run dev
```

### 12.2 相机被占用 / 打不开

- 关闭占用摄像头的其他应用（会议软件、系统相机等）
- 检查浏览器权限
- 使用 `https` 或 `localhost`

### 12.3 模型加载失败

- 检查 `public/model/model.json` 与 `weights.bin` 是否成对、版本一致
- 检查模型输出类别顺序是否符合第 6 节

---

## 13. 评审/答辩建议

演示顺序建议：

1. 本地上传识别（稳定演示）
2. 相机识别 + 拍后确认
3. 展示“原始8类 Top3 + 映射5类”
4. 故意用难图触发“不可判定”
5. 打开 `/admin` 展示统计能力

