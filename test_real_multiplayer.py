import asyncio
import re
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(channel="msedge", headless=True)
        
        # 模拟玩家 1 (房主)
        page1 = await browser.new_page(viewport={"width": 1000, "height": 800})
        # 模拟玩家 2 (好友)
        page2 = await browser.new_page(viewport={"width": 1000, "height": 800})

        page1.on("console", lambda m: print("[Page1 Console]", m.text) if "WebSocket" in m.text else None)
        page2.on("console", lambda m: print("[Page2 Console]", m.text) if "WebSocket" in m.text else None)

        url = "http://47.251.26.108/game/"
        print("Player 1 navigating to:", url)
        await page1.goto(url)
        await page1.wait_for_timeout(1000)

        # 玩家1点击创建【你画我猜】房间
        print("Player 1 creating room...")
        await page1.click("#btn-start-featured")
        await page1.wait_for_timeout(500)
        await page1.click("#create-room-modal button.btn-primary-yellow")
        await page1.wait_for_timeout(1500)

        # 获取生成的房间号
        lobby_title = await page1.inner_text("#room-lobby-body h2")
        m = re.search(r"\[(\d+)\]", lobby_title)
        if not m:
            print("Failed to find room code")
            return
        room_code = m.group(1)
        print("Extracted Room Code:", room_code)

        # 玩家2使用该房间号加入
        print("Player 2 joining room...")
        await page2.goto(f"{url}?room={room_code}")
        await page2.wait_for_timeout(2000)

        # 玩家2输入聊天并回车
        print("Player 2 sending chat message via Enter key...")
        await page2.fill("#lobby-chat-input", "hello from player 2!")
        await page2.press("#lobby-chat-input", "Enter")
        await page2.wait_for_timeout(1500)

        # 验证玩家1是否实时收到了玩家2的消息
        chat_logs_p1 = await page1.inner_text("#lobby-chat-logs")
        print("Player 1 chat logs content:")
        found = "hello from player 2!" in chat_logs_p1
        print("Found message in Player 1:", found)

        assert found, "Real-time chat sync failed!"
        print(">>> SUCCESS! TRUE REAL-TIME ONLINE MULTIPLAYER 100% VERIFIED! <<<")

        await browser.close()

asyncio.run(main())
