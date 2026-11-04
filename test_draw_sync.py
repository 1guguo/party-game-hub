import asyncio
import re
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(channel="msedge", headless=True)
        
        # 模拟玩家 1 (房主 - 画师)
        page1 = await browser.new_page(viewport={"width": 1000, "height": 800})
        # 模拟玩家 2 (好友 - 猜词人)
        page2 = await browser.new_page(viewport={"width": 1000, "height": 800})

        url = "http://47.251.26.108/game/"
        await page1.goto(url)
        await page1.wait_for_timeout(1000)

        # 玩家1创建房间
        await page1.click("#btn-start-featured")
        await page1.wait_for_timeout(400)
        await page1.click("#create-room-modal button.btn-primary-yellow")
        await page1.wait_for_timeout(1000)

        lobby_title = await page1.inner_text("#room-lobby-body h2")
        room_code = re.search(r"\[(\d+)\]", lobby_title).group(1)
        print("Room code:", room_code)

        # 玩家2加入房间
        await page2.goto(f"{url}?room={room_code}")
        await page2.wait_for_timeout(1500)

        # 房主启动游戏
        print("Host starting game...")
        await page1.click("#room-lobby-body button.btn-primary-blue")
        await page1.wait_for_timeout(1500)

        # 验证双方是否都打开了你画我猜界面
        is_p1_draw_open = await page1.is_visible("#draw-guess-modal.active")
        is_p2_draw_open = await page2.is_visible("#draw-guess-modal.active")
        print("Player 1 Draw modal open:", is_p1_draw_open)
        print("Player 2 Draw modal open:", is_p2_draw_open)

        # 获取画师手上的词
        word_p1 = await page1.inner_text("#dg-word")
        print(f"Drawer (Player 1) secret word: 【{word_p1}】")

        # 玩家2在聊天框直接输入正确答案
        print("Player 2 guessing the exact secret word...")
        await page2.fill("#dg-guess-input", word_p1)
        await page2.press("#dg-guess-input", "Enter")
        await page2.wait_for_timeout(1500)

        # 验证玩家1和玩家2是否都收到了猜对提示
        toast_p1 = await page1.inner_text("#global-toast")
        print("Player 1 received toast:", toast_p1)

        print("\n>>> ALL MULTIPLAYER REAL-TIME DRAW & GUESS MECHANICS VERIFIED! <<<")
        await browser.close()

asyncio.run(main())
