import asyncio
import os
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        try:
            browser = await p.chromium.launch(channel="msedge", headless=True)
        except Exception:
            try:
                browser = await p.chromium.launch(channel="chrome", headless=True)
            except Exception as e:
                print("Could not launch browser:", e)
                return

        page = await browser.new_page(viewport={"width": 1280, "height": 2000})
        
        errors = []
        page.on("pageerror", lambda err: errors.append(str(err)))
        page.on("console", lambda msg: print(f"CONSOLE [{msg.type}]: {msg.text}") if msg.type in ["error", "warning"] else None)

        file_url = "file:///" + os.path.abspath(r"d:\game\party-game-hub\index.html").replace("\\", "/")
        print("Navigating to:", file_url)
        await page.goto(file_url)
        await page.wait_for_timeout(1000)

        title = await page.title()
        print("Page Title:", title)
        
        cards = await page.query_selector_all(".game-card")
        print(f"Rendered game cards count: {len(cards)}")
        
        screenshot_path = r"d:\game\party-game-hub\screenshot_rendered.png"
        await page.screenshot(path=screenshot_path, full_page=True)
        print("Screenshot saved to:", screenshot_path)

        if errors:
            print("Errors detected:", errors)
        else:
            print("No console or page errors detected! Perfect!")

        await browser.close()

asyncio.run(main())
