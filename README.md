# NPC 垃圾分类器

基于 Next.js + ONNX Runtime Web 的浏览器端垃圾分类演示项目。

## 项目能力

- 图片输入：拍照 / 本地上传 / URL / 剪贴板
- 模型推理：浏览器端 ONNX Runtime Web
- 结果展示：Top 3、低置信度兜底、投放建议
- 管理面板：`/admin` 本地推理日志查看、筛选、CSV 导出
- 中韩双语：中文 / 한국어

## 运行方式

```bash
npm install
npm run dev
```

生产构建：

```bash
npm run build
npm run start
```

## 模型文件位置

请将模型文件放到：

- `public/model/model.onnx`
- `public/model/classes.txt`（推荐，按训练时类别顺序每行一个类名）

前端默认加载地址：`/model/model.onnx?v=model-v1`
前端会优先读取 `/model/classes.txt` 作为输出索引到类别名的映射；若缺失则回退到内置 12 类顺序。

## 数据来源

训练数据来源于 Kaggle：

- https://www.kaggle.com/datasets/mostafaabla/garbage-classification

## 数据增强（离线）

训练前对原始图片做了离线增强，按类别目录遍历并生成以下变体：

- 原图：`_orig`
- 水平翻转：`_flip`
- 旋转：`_rot15`、`_rot-15`
- 亮度增强/减弱：`_bright`、`_dark`
- 高斯模糊：`_blur`

输出目录结构保持 `ImageFolder` 格式（`输出根目录/类别名/*.jpg`），文件名规则为：

- `{class_name}_{count:04d}_{suffix}.jpg`

可直接用于 PyTorch `datasets.ImageFolder` 训练。

## 分类体系（韩国 5 大类）

页面最终输出为 5 类（中韩）：

1. 一般垃圾 / 종량제
2. 厨余垃圾 / 음식물
3. 可回收物 / 재활용
4. 有害/专项回收 / 유해·전용 수거
5. 大件垃圾 / 대형폐기물(申报)

内部分类键（用于模型映射）：

1. `General waste`
2. `Food waste`
3. `Recyclables`
4. `Hazardous waste`
5. `Bulk waste`

## 模型输出兼容

项目兼容两种模型输出格式：

### A) 5 类直出模型

输出长度为 5，顺序：

1. `General waste`
2. `Food waste`
3. `Recyclables`
4. `Hazardous waste`
5. `Bulk waste`

### B) 12 类物体模型（映射到 5 类）

输出长度为 12，顺序必须为：

1. `battery`
2. `biological`
3. `brown-glass`
4. `cardboard`
5. `clothes`
6. `green-glass`
7. `metal`
8. `paper`
9. `plastic`
10. `shoes`
11. `trash`
12. `white-glass`

映射规则：

- `brown-glass / cardboard / green-glass / metal / paper / plastic / white-glass` -> `Recyclables`
- `biological` -> `Food waste`
- `battery` -> `Hazardous waste`
- `clothes / shoes` -> `Recyclables`
- `trash`（及其他兜底）-> `General waste`

## 韩国投放方法（页面文案对应）

- `General waste`：使用 종량제 垃圾袋，避免混入可回收/厨余/有害物。
- `Food waste`：先沥干水分并去包装，再投 음식물 专用桶/袋。
- `Recyclables`：按材质分开（纸/塑料/金属/玻璃/衣物鞋类），尽量清洗并压缩体积。
- `Hazardous waste`：废电池、废灯管等投放到专项回收箱。
- `Bulk waste`：家具家电等需先申报缴费后按预约排出。

## 置信度策略

- 阈值：`LOW_CONFIDENCE_THRESHOLD = 0.45`
- 当 Top1 低于阈值时标记为 `undetermined`

## 日志面板（`/admin`）

日志存储在 `localStorage`：`npc_inference_logs_v1`

主要字段：

- `timestamp`
- `source`（camera/local/url/clipboard）
- `topLabel`
- `topConfidence`
- `undetermined`
- `rawTopClass`
- `latencyMs`

支持功能：

- 汇总统计
- 来源筛选
- 仅看 `undetermined`
- CSV 导出
- 一键清空

## 常见问题

### 1) 模型加载失败

检查：

- `public/model/model.onnx` 是否存在
- 输出长度是否符合 5 类直出或 12 类映射

### 2) 摄像头打不开

检查：

- 浏览器权限是否允许
- 是否在 HTTPS 或 localhost 环境
- 摄像头是否被其他应用占用

### 3) 开发缓存导致异常

```bash
cmd /c "rmdir /s /q .next"
npm run dev
```
