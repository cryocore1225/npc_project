# NPC 垃圾分类器

Next.js + TensorFlow.js 浏览器端图片分类项目。

## 1. 项目定位

本仓库（`npc_project`）只负责前端推理与展示：

- 图片输入：拍照 / 本地上传 / URL / 剪贴板
- 浏览器端模型推理：TensorFlow.js
- 结果展示：Top3、置信度、原始类别名
- 管理页：`/admin` 本地日志筛选与 CSV 导出
- 多语言：中文 / 한국어

训练与数据处理放在独立仓库：`D:\Code\Python\Docker_project`。

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

## 3. 模型文件放置规范

把 TFJS 模型放到：

- `public/model/model.json`
- `public/model/group1-shard*.bin`
- `public/model/labels.txt`

前端加载地址：

- `/model/model.json?v=MODEL_VERSION`

说明：

- `labels.txt` 一行一个类别名，顺序必须与训练输出一致。
- 页面支持任意类别数模型：当模型输出不是 5 类时，会先按原始类别做推理，再聚合到五大类展示（General/Food/Recyclables/Hazardous/Bulk）。

## 4. 与训练仓库联动（推荐）

训练仓库：`D:\Code\Python\Docker_project`

推荐训练命令（三目录参与，按原始类别训练）：

```powershell
cd /d D:\Code\Python\Docker_project
docker compose run --rm my_app python /opt/project/ml/run_pipeline.py --use-all-three --all-classes --low-memory
```

训练结束后，同步模型到前端：

```powershell
Copy-Item -Force D:\Code\Python\Docker_project\ml\artifacts\all_classes\tfjs_model\* D:\Code\npc_project\public\model\
```

再更新前端缓存版本：

- 文件：`app/page.tsx`
- 常量：`MODEL_VERSION = 'model-vX'`

## 5. Python 数据/训练代码说明（Docker_project）

Python 相关代码在：`D:\Code\Python\Docker_project\ml`

核心脚本：

- `run_pipeline.py`
  - 训练入口脚本，串联“数据准备 -> 切分 -> 训练 -> 导出 TFJS”。
  - 常用参数：
    - `--use-all-three`：使用三个数据目录
    - `--all-classes`：不做12类映射，按原始类别训练
    - `--low-memory`：低内存参数（更稳）

- `prepare_all3_raw_dataset.py`
  - 三数据源全类别合并（推荐模式）。
  - 会规范化类别名，并复制到统一目录。

- `prepare_all3_coarse_dataset.py`
  - 三数据源映射到 12 类再训练（兼容旧模式）。

- `prepare_coarse_dataset.py`
  - 仅 `garbage_classification + realwaste` 的粗类合并脚本。

- `split_dataset.py`
  - 把统一数据切分成 `train/val/test`。

- `train.py`
  - TensorFlow 训练脚本。
  - 已支持：
    - 坏图扫描与清单导出（`bad_images_report.json/txt`）
    - 坏图跳过不中断
    - repeat + 动态 `steps_per_epoch`，避免提前结束
    - SavedModel 稳健导出

- `export_tfjs.py`
  - 将 SavedModel 导出为 TFJS 模型。

训练产物目录：

- 全类别：`ml/artifacts/all_classes`
- 12类：`ml/artifacts/coarse`

中间数据目录（每次带时间戳，不覆盖历史）：

- `E:\dataset\pipeline_runs\YYYYMMDD_HHMMSS\...`

## 6. 当前仓库目录职责

- `app/`：页面与业务逻辑（模型加载、推理、展示）
- `public/model/`：前端推理模型文件
- `app/i18n/`：中韩文案
- `app/admin/`：日志管理页

## 7. 常见问题

### 7.1 `no configuration file provided: not found`

在 `cmd` 里请用：

```cmd
cd /d D:\Code\Python\Docker_project
```

### 7.2 模型加载失败

检查：

- `public/model/model.json` 是否存在
- `group1-shard*.bin` 是否齐全
- `labels.txt` 是否与输出维度匹配

### 7.3 页面仍是旧模型结果

- 修改 `MODEL_VERSION`
- 强刷浏览器缓存

### 7.4 摄像头打不开

检查：

- 权限是否允许
- 是否 HTTPS / localhost
- 是否被其他程序占用
