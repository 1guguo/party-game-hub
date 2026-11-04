import asyncio
import os
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(channel="msedge", headless=True)
        page = await browser.new_page(viewport={"width": 1280, "height": 900})
        
        file_url = "file:///" + os.path.abspath(r"d:\game\party-game-hub\index.html").replace("\\", "/")
        await page.goto(file_url)
        await page.wait_for_timeout(500)

        # 1. Test clicking "先看玩法"
        await page.click("#btn-featured-rules")
        await page.wait_for_timeout(400)
        await page.screenshot(path=r"d:\game\party-game-hub\screenshot_modal_rules.png")
        print("Rules modal opened successfully!")

        # Close modal
        await page.click("#rule-modal .modal-close-btn")
        await page.wait_for_timeout(300)

        # 2. Test clicking "+ 开一局你画我猜"
        await page.click("#btn-start-featured")
        await page.wait_for_timeout(500)
        await page.screenshot(path=r"d:\game\party-game-hub\screenshot_modal_draw.png")
        print("Draw & Guess game modal opened successfully!")

        await browser.close()

asyncio.run(main())
