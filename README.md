# NPC 垃圾分类器

Next.js + TensorFlow.js 浏览器端图片分类项目。

## 1. 项目定位

本仓库（`npc_project`）只负责前端推理与展示：

- 图片输入：拍照 / 本地上传 / URL / 剪贴板
- 浏览器端模型推理：TensorFlow.js
- 结果展示：Top3、置信度、原始类别名、五大类聚合
- 管理页：`/admin` 本地日志筛选与 CSV 导出
- 多语言：中文 / 한국어

训练与数据处理在独立仓库：`D:\Code\Python\Docker_project`。

## 2. 快速启动

```bash
npm install
npm run dev
```

生产构建：

```bash
npm run build
npm run start
```

## 3. 模型放置规范

将 TFJS 模型文件放到：

- `public/model/model.json`
- `public/model/group1-shard*.bin`
- `public/model/labels.txt`

前端加载地址：

- `/model/model.json?v=MODEL_VERSION`

说明：

- `labels.txt` 必须和模型输出顺序一致（一行一个类别名）。
- 支持“原始多类别 -> 五大类”展示逻辑。
- `background` 类会显示为“不可判定/背景”。

## 4. 与训练仓库联动

训练仓库：`D:\Code\Python\Docker_project`

推荐完整训练命令（三数据目录 + TACO + 全类别）：

```powershell
cd /d D:\Code\Python\Docker_project
docker compose run --rm my_app python /opt/project/ml/run_pipeline.py --use-all-three --all-classes --use-taco --taco-dir E:\dataset\taco_cls_raw --low-memory
```

训练完成后拷贝模型：

```powershell
Copy-Item -Force D:\Code\Python\Docker_project\ml\artifacts\all_classes\tfjs_model\* D:\Code\npc_project\public\model\
```

更新前端模型缓存版本：

- 文件：`app/page.tsx`
- 常量：`MODEL_VERSION = 'model-vX'`

## 5. 数据来源（训练仓库使用）

- Garbage Classification（12类）  
  https://www.kaggle.com/datasets/mostafaabla/garbage-classification
- Waste Pictures（34类）  
  https://www.kaggle.com/datasets/wangziang/waste-pictures
- RealWaste  
  https://archive.ics.uci.edu/dataset/908/realwaste
- TACO（Trash Annotations in Context）  
  https://github.com/pedropro/TACO

## 6. 当前状态（2026-04-08）

- Pipeline 已完整成功：`Pipeline finished successfully.`
- TFJS 导出成功：`ml/artifacts/all_classes/tfjs_model/model.json`
- 前端已支持动态类别与中韩类别翻译。
- 当前页面使用全类别模型（`labels.txt` 决定具体类别数）。

## 7. 常见问题

### 7.1 `no configuration file provided: not found`

在 `cmd` 里使用：

```cmd
cd /d D:\Code\Python\Docker_project
```

### 7.2 模型加载失败

检查：

- `public/model/model.json` 是否存在
- `group1-shard*.bin` 是否齐全
- `labels.txt` 是否与输出维度匹配

### 7.3 页面还是旧结果

- 修改 `MODEL_VERSION`
- 强制刷新浏览器缓存

### 7.4 控制台出现 NUMA / iCCP 警告

- 多数是环境或 PNG 元数据提示，通常不影响训练和导出成功。
