#!/usr/bin/env python3
"""
即梦AI图片生成4.0调试脚本

使用方法:
  1. 确保已安装 volcengine SDK: pip install volcengine
  2. 在下方配置 AK/SK
  3. python3 test.py
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

# 通用前缀和后缀
PROMPT_PREFIX = "3D cute cartoon style, blind box toy style, C4D render, clean white background, high quality, 8k, "
PROMPT_SUFFIX = " --no multiple views, no split screen, no text, no human"

# 测试用的提示词 - 功夫熊猫究极
TEST_PROMPT = "One single Ultimate Kungfu Panda Dragon Warrior God Form, solo, massive divine panda floating in meditation pose, mature serene powerful expression not cute, god-like martial arts presence, colossal body radiating pure golden chi with brilliant blinding constellation patterns, wise ancient piercing eyes with cosmic yin-yang symbols, wearing divine dragon emperor armor with jade crown, golden dragon spirit coiling around body, massive chi explosion creating universe balance, divine martial arts god aura, god-like majestic and enlightened presence, mature and transcendent, low angle epic shot, white background"

# 输出文件名
OUTPUT_FILENAME = "kungfu_panda_5_ultimate.png"

# ============ 主逻辑 ============


def main():
    print("=" * 50)
    print("即梦AI图片生成4.0测试")
    print("=" * 50)
    print()

    # 初始化服务
    visual_service = VisualService()
    visual_service.set_ak(ACCESS_KEY_ID)
    visual_service.set_sk(SECRET_ACCESS_KEY)

    full_prompt = PROMPT_PREFIX + TEST_PROMPT + PROMPT_SUFFIX
    print("📝 完整提示词:")
    print(full_prompt)
    print()

    # 构建请求参数 - 根据官方文档
    form = {
        "req_key": "jimeng_t2i_v40",  # 即梦4.0的服务标识
        "prompt": full_prompt,
        "width": 1024,
        "height": 1024,
        "scale": 0.5,  # 文本影响程度，范围[0,1]
        "force_single": True,  # 强制生成单图，减少耗时
    }

    print("🚀 正在提交生成任务...")

    try:
        # 提交异步任务
        resp = visual_service.cv_sync2async_submit_task(form)
        print("📄 提交响应:", json.dumps(resp, ensure_ascii=False, indent=2))

        # 检查返回
        code = resp.get("code")
        if code != 10000:
            print(
                f"❌ 提交失败: code={code}, message={resp.get('message', '未知错误')}"
            )
            return

        # 获取任务ID
        task_id = resp.get("data", {}).get("task_id")
        if not task_id:
            print("❌ 未获取到任务ID")
            print("完整响应:", json.dumps(resp, ensure_ascii=False, indent=2))
            return

        print(f"✅ 任务已提交，ID: {task_id}")
        print()

        # 轮询获取结果
        print("⏳ 等待图片生成", end="", flush=True)
        for i in range(90):  # 最多等待3分钟
            time.sleep(2)
            print(".", end="", flush=True)

            result_form = {
                "req_key": "jimeng_t2i_v40",
                "task_id": task_id,
                "req_json": json.dumps({"return_url": True}),  # 返回图片URL
            }
            result = visual_service.cv_sync2async_get_result(result_form)

            # 检查状态
            result_code = result.get("code")
            if result_code != 10000:
                # 可能还在处理中，继续等待
                continue

            data = result.get("data", {})
            status = data.get("status")

            if status == "done":
                print()
                print("✅ 生成完成!")

                # 获取图片URL
                image_urls = data.get("image_urls", [])
                if image_urls:
                    image_url = image_urls[0]
                    print(f"🔗 图片URL: {image_url}")

                    # 下载图片
                    print("📥 正在下载图片...")
                    output_dir = os.path.join(
                        os.path.dirname(__file__), "../../app/public/beasts"
                    )
                    output_path = os.path.join(output_dir, OUTPUT_FILENAME)

                    urllib.request.urlretrieve(image_url, output_path)
                    print(f"✅ 图片已保存到: {output_path}")
                    print()
                    print("🎉 测试完成!")
                    return

                print("❌ 未找到图片URL")
                print("完整响应:", json.dumps(result, ensure_ascii=False, indent=2))
                return

            elif status == "not_found":
                print()
                print("❌ 任务未找到")
                return

            elif status == "expired":
                print()
                print("❌ 任务已过期")
                return

            # in_queue 或 generating 状态，继续等待

        print()
        print("❌ 超时，未能获取结果")

    except Exception as e:
        print(f"❌ 错误: {e}")
        import traceback

        traceback.print_exc()


if __name__ == "__main__":
    main()
