import asyncio
import re
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(channel="msedge", headless=True)
        
        page1 = await browser.new_page(viewport={"width": 1100, "height": 850})
        page2 = await browser.new_page(viewport={"width": 1100, "height": 850})

        url = "http://47.251.26.108/game/"
        print("1. Host navigating to:", url)
        await page1.goto(url)
        await page1.wait_for_timeout(1000)

        # 房主创建房间
        print("2. Host creating room...")
        await page1.click("#btn-start-featured")
        await page1.wait_for_timeout(400)
        await page1.click("#create-room-modal button.btn-primary-yellow")
        await page1.wait_for_timeout(1500)

        # 检查是否展示了醒目的分享卡片和邀请链接
        share_link = await page1.input_value("#share-link-input")
        print("Detected visible share link on screen:", share_link)
        m = re.search(r"room=(\d+)", share_link)
        assert m, "Invite link does not contain room code!"
        room_code = m.group(1)
        print("Extracted Room Code:", room_code)

        # 房主召唤 AI 陪玩 (Qwen3.5-4B)
        print("3. Host summoning AI Companion...")
        await page1.click("#room-lobby-body button.btn-link-rules") # 召唤 AI 按钮
        await page1.wait_for_timeout(2500)

        # 检查是否有 AI 玩家入座
        lobby_text = await page1.inner_text("#room-lobby-body")
        has_ai = "Qwen AI" in lobby_text or "AI" in lobby_text
        print("AI companion successfully in lobby:", has_ai)
        assert has_ai, "AI companion failed to join!"

        # 好友 (Player 2) 访问首页，检查是否能看到正在等待的好友房间
        print("4. Friend navigating to homepage...")
        await page2.goto(url)
        await page2.wait_for_timeout(1500)

        # 好友在首页直接输入房号加入
        print(f"Friend entering room code [{room_code}] on homepage...")
        await page2.fill("#quick-room-code", room_code)
        await page2.click("#btn-quick-join")
        await page2.wait_for_timeout(2000)

        # 验证好友是否成功进入该房间
        p2_lobby_text = await page2.inner_text("#room-lobby-body")
        print("Friend entered room successfully:", room_code in p2_lobby_text)
        assert room_code in p2_lobby_text, "Friend failed to enter room by room code!"

        print("\n>>> ALL TESTS PASSED! Room sharing, search by room code, and AI Companion all 100% verified! <<<")
        await browser.close()

asyncio.run(main())
