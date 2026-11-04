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
        
        # P1 creates Draw & Guess room
        await page1.click('#btn-start-featured')
        await page1.wait_for_timeout(500)
        await page1.click('#create-room-modal button.btn-primary-yellow')
        await page1.wait_for_timeout(1000)
        
        share_val = await page1.input_value('#share-link-input')
        print('Created room link:', share_val)
        
        # Extract 4-digit code
        import re
        code = re.search(r'room=(\d+)', share_val).group(1)
        print('Room code:', code)
        
        # P2 goes to homepage
        await page2.goto(url)
        await page2.wait_for_timeout(1000)
        
        # Case A: P2 types code with spaces '  ' + code + '  '
        print('Testing join with spaces...')
        await page2.fill('#quick-room-code', f'  {code}  ')
        await page2.click('#btn-quick-join')
        await page2.wait_for_timeout(1500)
        p2_lobby_a = await page2.is_visible('#room-lobby-modal.active')
        print('Join with spaces success:', p2_lobby_a)
        
        # Case B: What if P2 pastes the whole URL into #quick-room-code?
        await page2.goto(url)
        await page2.wait_for_timeout(1000)
        print('Testing join with full URL pasted into input...')
        await page2.fill('#quick-room-code', share_val)
        await page2.click('#btn-quick-join')
        await page2.wait_for_timeout(1500)
        p2_lobby_b = await page2.is_visible('#room-lobby-modal.active')
        print('Join with full URL pasted success:', p2_lobby_b)
        
        # Case C: What if P2 pastes text like '朋友来玩 房号：1234'
        await page2.goto(url)
        await page2.wait_for_timeout(1000)
        print('Testing join with text snippet...')
        await page2.fill('#quick-room-code', f'快来一起玩，房号: {code}')
        await page2.click('#btn-quick-join')
        await page2.wait_for_timeout(1500)
        p2_lobby_c = await page2.is_visible('#room-lobby-modal.active')
        print('Join with text snippet success:', p2_lobby_c)

        await browser.close()

if __name__ == '__main__':
    asyncio.run(main())
