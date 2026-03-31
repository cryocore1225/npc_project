# TensorFlow 2 + MobileNetV2 -> TensorFlow.js (Web)

## 1) 安装依赖

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r ml\requirements.txt
```

## 2) 准备数据

推荐先下载这 3 个数据源（你说的 1/2/4）：

- 1) Garbage Classification V2: https://www.kaggle.com/datasets/sumn2u/garbage-classification-v2
- 2) waste_pictures: https://www.kaggle.com/datasets/wangziang/waste-pictures
- 4) RealWaste: https://archive.ics.uci.edu/dataset/908/realwaste

下载后可先合并整理到 `raw_data/<class_name>/*.jpg`，再执行下方切分命令。

把原始数据整理为：

```text
raw_data/
  class_a/*.jpg
  class_b/*.jpg
  ...
```

切分为 train/val/test：

```powershell
python ml\split_dataset.py --input-dir raw_data --output-dir dataset --train-ratio 0.8 --val-ratio 0.1 --clean
```

输出结构：

```text
dataset/
  train/<class_name>/*
  val/<class_name>/*
  test/<class_name>/*
```

## 3) 训练模型

```powershell
python ml\train.py --data-root dataset --output-dir ml\artifacts --epochs-head 12 --epochs-finetune 8 --batch-size 32 --image-size 224
```

训练完成会生成：

- `ml/artifacts/saved_model/`
- `ml/artifacts/model.keras`
- `ml/artifacts/labels.txt`
- `ml/artifacts/val_metrics.json`

## 4) 导出 TensorFlow.js 模型

```powershell
python ml\export_tfjs.py --saved-model ml\artifacts\saved_model --labels ml\artifacts\labels.txt --output-dir ml\artifacts\tfjs_model --quantization float16
```

导出目录：

- `ml/artifacts/tfjs_model/model.json`
- `ml/artifacts/tfjs_model/group1-shard*.bin`
- `ml/artifacts/tfjs_model/labels.txt`

## 5) 放到前端项目

复制到你的静态目录（例如 `public/model/`）：

- `model.json`
- `group1-shard*.bin`
- `labels.txt`

## 6) 前端加载示例

```ts
import * as tf from '@tensorflow/tfjs'

const model = await tf.loadGraphModel('/model/model.json')
const labelsText = await fetch('/model/labels.txt').then((r) => r.text())
const labels = labelsText.split(/\r?\n/).map((s) => s.trim()).filter(Boolean)

function preprocess(imageData: ImageData) {
  return tf.tidy(() => {
    const x = tf.browser.fromPixels(imageData).toFloat()
    const resized = tf.image.resizeBilinear(x, [224, 224])
    const normalized = resized.div(127.5).sub(1) // MobileNetV2 preprocess_input
    return normalized.expandDims(0)
  })
}

const input = preprocess(imageData)
const output = model.predict(input) as tf.Tensor
const probs = tf.softmax(output).dataSync()
```
