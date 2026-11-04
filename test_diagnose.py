import asyncio
import re
import sys
sys.stdout.reconfigure(encoding='utf-8')
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(channel="msedge", headless=True)
        
        # Context 1: Player 1 (Host)
        ctx1 = await browser.new_context(viewport={"width": 1000, "height": 800})
        page1 = await ctx1.new_page()
        
        # Context 2: Player 2 (Friend)
        ctx2 = await browser.new_context(viewport={"width": 1000, "height": 800})
        page2 = await ctx2.new_page()

        page1.on("console", lambda m: print(f"[P1 Console {m.type}]: {m.text}"))
        page2.on("console", lambda m: print(f"[P2 Console {m.type}]: {m.text}"))
        page1.on("pageerror", lambda err: print(f"[P1 PageError]: {err}"))
        page2.on("pageerror", lambda err: print(f"[P2 PageError]: {err}"))

        url = "http://47.251.26.108/game/"
        print("--- Step 1: Host opens site ---")
        await page1.goto(url)
        await page1.wait_for_timeout(1000)

        print("--- Step 2: Host creates room for Draw & Guess ---")
        await page1.click("#btn-start-featured")
        await page1.wait_for_timeout(400)
        await page1.click("#create-room-modal button.btn-primary-yellow")
        await page1.wait_for_timeout(1000)

        share_val = await page1.input_value("#share-link-input")
        print("Share link on P1:", share_val)
        m = re.search(r"room=(\d+)", share_val)
        room_code = m.group(1)

        print("--- Step 3: Friend opens homepage ---")
        await page2.goto(url)
        await page2.wait_for_timeout(1000)

        active_rooms_p2 = await page2.inner_text("#active-rooms-container")
        print("Active rooms visible on P2 homepage:\n", active_rooms_p2)

        print("--- Step 4: Friend joins via clicking room or typing code ---")
        await page2.fill("#quick-room-code", room_code)
        await page2.click("#btn-quick-join")
        await page2.wait_for_timeout(1500)

        # Check lobby on both
        p1_lobby = await page1.inner_text("#room-lobby-body")
        p2_lobby = await page2.inner_text("#room-lobby-body")
        print("P1 lobby players count check:\n", p1_lobby)
        print("P2 lobby players count check:\n", p2_lobby)

        print("--- Step 5: Host clicks '开始游戏' ---")
        await page1.click("#room-lobby-body button.btn-primary-blue")
        await page1.wait_for_timeout(1500)

        # Check if game modal is open on both
        p1_draw_open = await page1.is_visible("#draw-guess-modal.active")
        p2_draw_open = await page2.is_visible("#draw-guess-modal.active")
        print(f"P1 Draw Modal Open: {p1_draw_open}, P2 Draw Modal Open: {p2_draw_open}")

        # Check who is drawer and what each sees
        p1_word = await page1.inner_text("#dg-word")
        p2_word = await page2.inner_text("#dg-word")
        print(f"P1 sees word: '{p1_word}'")
        print(f"P2 sees word: '{p2_word}'")

        # Let Host draw on canvas
        print("--- Step 6: Host drawing a line ---")
        canvas1 = await page1.query_selector("#dg-canvas")
        box1 = await canvas1.bounding_box()
        await page1.mouse.move(box1["x"] + 50, box1["y"] + 50)
        await page1.mouse.down()
        await page1.mouse.move(box1["x"] + 150, box1["y"] + 150)
        await page1.mouse.up()
        await page1.wait_for_timeout(1000)

        # Let Friend guess
        print(f"--- Step 7: Friend guesses exact word '{p1_word}' ---")
        await page2.fill("#dg-guess-input", p1_word)
        await page2.press("#dg-guess-input", "Enter")
        await page2.wait_for_timeout(2000)

        # Check chat logs on both
        p1_chat = await page1.inner_text("#dg-chat-logs")
        p2_chat = await page2.inner_text("#dg-chat-logs")
        print("P1 Chat Logs:\n", p1_chat)
        print("P2 Chat Logs:\n", p2_chat)

        await browser.close()

asyncio.run(main())
