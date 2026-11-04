import asyncio
import re
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

        page1.on("console", lambda m: print(f"[P1 Console]: {m.text}"))
        page2.on("console", lambda m: print(f"[P2 Console]: {m.text}"))

        url = 'http://47.251.26.108/game/'
        
        print('=== TEST 1: Host creates room for gomoku ===')
        await page1.goto(url)
        await page1.wait_for_timeout(1000)
        
        # Click gomoku card
        await page1.click('.game-card[data-game-id="gomoku"]')
        await page1.wait_for_timeout(500)
        await page1.click('#create-room-modal button.btn-primary-yellow')
        await page1.wait_for_timeout(1500)
        
        share_val = await page1.input_value('#share-link-input')
        print('Generated Share link:', share_val)
        lobby1 = await page1.inner_text('#room-lobby-body')
        print('Host lobby text:\n', lobby1[:200].replace('\n', ' -- '))
        
        print('=== TEST 2: Friend joins via invite link ===')
        await page2.goto(share_val)
        await page2.wait_for_timeout(2000)
        
        p2_lobby_visible = await page2.is_visible('#room-lobby-modal.active')
        print('Friend Lobby visible:', p2_lobby_visible)
        if p2_lobby_visible:
            lobby2 = await page2.inner_text('#room-lobby-body')
            print('Friend lobby text:\n', lobby2[:200].replace('\n', ' -- '))
        else:
            print('Friend Lobby modal is NOT active!')
            
        print('=== TEST 3: Host clicks start game ===')
        await page1.click('#room-lobby-body button.btn-primary-blue')
        await page1.wait_for_timeout(2000)
        
        p1_gomoku = await page1.is_visible('#gomoku-modal.active')
        p2_gomoku = await page2.is_visible('#gomoku-modal.active')
        print(f'P1 Gomoku open: {p1_gomoku}, P2 Gomoku open: {p2_gomoku}')
        
        await browser.close()

if __name__ == '__main__':
    asyncio.run(main())
