#!/usr/bin/env python3
"""
批量生成甜点九尾狐 (Dessert Fox) 的5个进化阶段图片
"""

import json
import time
import os
import urllib.request
from volcengine.visual.VisualService import VisualService

# ============ 配置区域 ============

# 从 .env 文件读取凭证
def load_env():
    env_path = os.path.join(os.path.dirname(__file__), ".env")
    if os.path.exists(env_path):
        with open(env_path) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, value = line.split("=", 1)
                    os.environ.setdefault(key.strip(), value.strip())

load_env()
ACCESS_KEY_ID = os.getenv("VOLC_ACCESS_KEY_ID", "")
SECRET_ACCESS_KEY = os.getenv("VOLC_SECRET_ACCESS_KEY", "")

PROMPT_PREFIX = "3D cute cartoon style, blind box toy style, C4D render, clean white background, high quality, 8k, "
PROMPT_SUFFIX = " --no multiple views, no split screen, no text, no human"

# 甜点九尾狐 5个阶段
STAGES = [
    {
        "filename": "dessert_fox_3_juvenile_v2.png",
        "label": "少年v2 (Juvenile - 粉色奶油版)",
        "prompt": "One single Young Dessert Fox, solo, playful prancing pose, three swirling tails made of pink whipped cream and strawberry candy swirls, soft pink cream colored fur with sprinkles pattern, wearing a cupcake beret with strawberry on top, developing pastry magic, cookie and wafer accessories, pink and cream white and rose gold colors, dynamic pose, white background",
    },
]

# ============ 主逻辑 ============

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "../../app/public/beasts")


def generate_one(visual_service, stage):
    """生成单个阶段的图片"""
    filename = stage["filename"]
    label = stage["label"]
    prompt = stage["prompt"]

    print(f"\n{'='*50}")
    print(f"  生成: {label} -> {filename}")
    print(f"{'='*50}")

    full_prompt = PROMPT_PREFIX + prompt + PROMPT_SUFFIX
    print(f"提示词: {prompt[:80]}...")

    form = {
        "req_key": "jimeng_t2i_v40",
        "prompt": full_prompt,
        "width": 1024,
        "height": 1024,
        "scale": 0.5,
        "force_single": True,
    }

    try:
        resp = visual_service.cv_sync2async_submit_task(form)
        code = resp.get("code")
        if code != 10000:
            print(f"  提交失败: code={code}, message={resp.get('message')}")
            return False

        task_id = resp.get("data", {}).get("task_id")
        if not task_id:
            print("  未获取到任务ID")
            return False

        print(f"  任务ID: {task_id}")
        print("  等待生成", end="", flush=True)

        for i in range(90):
            time.sleep(2)
            print(".", end="", flush=True)

            result_form = {
                "req_key": "jimeng_t2i_v40",
                "task_id": task_id,
                "req_json": json.dumps({"return_url": True}),
            }
            result = visual_service.cv_sync2async_get_result(result_form)

            result_code = result.get("code")
            if result_code != 10000:
                continue

            data = result.get("data", {})
            status = data.get("status")

            if status == "done":
                print()
                image_urls = data.get("image_urls", [])
                if image_urls:
                    output_path = os.path.join(OUTPUT_DIR, filename)
                    urllib.request.urlretrieve(image_urls[0], output_path)
                    print(f"  已保存: {output_path}")
                    return True
                print("  未找到图片URL")
                return False

            elif status in ("not_found", "expired"):
                print(f"\n  任务{status}")
                return False

        print("\n  超时")
        return False

    except Exception as e:
        print(f"\n  错误: {e}")
        return False


def main():
    print("=" * 50)
    print("  甜点九尾狐 (Dessert Fox) 批量生成")
    print(f"  共 {len(STAGES)} 个阶段")
    print("=" * 50)

    visual_service = VisualService()
    visual_service.set_ak(ACCESS_KEY_ID)
    visual_service.set_sk(SECRET_ACCESS_KEY)

    results = []
    for i, stage in enumerate(STAGES):
        success = generate_one(visual_service, stage)
        results.append((stage["label"], stage["filename"], success))

        # 阶段间等待5秒，避免频率限制
        if i < len(STAGES) - 1:
            print("\n  等待5秒后继续...")
            time.sleep(5)

    # 汇总
    print(f"\n\n{'='*50}")
    print("  生成结果汇总")
    print(f"{'='*50}")
    for label, filename, success in results:
        status = "成功" if success else "失败"
        print(f"  {label}: {filename} - {status}")

    success_count = sum(1 for _, _, s in results if s)
    print(f"\n  总计: {success_count}/{len(STAGES)} 成功")


if __name__ == "__main__":
    main()
