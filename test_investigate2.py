import asyncio
import sys
sys.stdout.reconfigure(encoding='utf-8')
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(channel='msedge', headless=True)
        ctx1 = await browser.new_context()
        ctx2 = await browser.new_context()
        page1 = await ctx1.new_page()
        page2 = await ctx2.new_page()

        url = 'http://47.251.26.108/game/'
        await page1.goto(url)
        await page1.wait_for_timeout(1000)
        
        # Click undercover card (谁是卧底)
        await page1.click('.game-card[data-game-id="undercover"]')
        await page1.wait_for_timeout(500)
        await page1.click('#create-room-modal button.btn-primary-yellow')
        await page1.wait_for_timeout(1000)
        
        share_val = await page1.input_value('#share-link-input')
        print('Created room for undercover:', share_val)
        
        await page2.goto(share_val)
        await page2.wait_for_timeout(1500)
        
        print('Host clicking start game...')
        await page1.click('#room-lobby-body button.btn-primary-blue')
        await page1.wait_for_timeout(2000)
        
        p1_modals = await page1.evaluate('Array.from(document.querySelectorAll(".modal-overlay.active")).map(el => el.id)')
        p2_modals = await page2.evaluate('Array.from(document.querySelectorAll(".modal-overlay.active")).map(el => el.id)')
        print('P1 Active Modals:', p1_modals)
        print('P2 Active Modals:', p2_modals)
        
        await browser.close()

if __name__ == '__main__':
    asyncio.run(main())
