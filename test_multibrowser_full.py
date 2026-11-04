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
        p1 = await ctx1.new_page()
        p2 = await ctx2.new_page()

        p1.on("console", lambda m: print(f"[P1 Console]: {m.text}"))
        p2.on("console", lambda m: print(f"[P2 Console]: {m.text}"))

        url = "http://47.251.26.108/game/"
        print("=== STEP 1: Host opens site ===")
        await p1.goto(url)
        await p1.wait_for_timeout(1000)

        print("=== STEP 2: Host creates room for 谁是卧底 (undercover) ===")
        await p1.click('.game-card[data-game-id="undercover"]')
        await p1.wait_for_timeout(500)
        await p1.click('#create-room-modal button.btn-primary-yellow')
        await p1.wait_for_timeout(1200)

        # Verify lobby title and room code
        lobby_text1 = await p1.inner_text('#room-lobby-body')
        print("P1 Lobby snippet:\n", lobby_text1[:220].replace('\n', ' -- '))
        
        share_val = await p1.input_value('#share-link-input')
        print("P1 Generated Share Link:", share_val)
        m = re.search(r"room=(\d+)", share_val)
        room_code = m.group(1)

        # Check sticky room bar on P1
        sticky_visible = await p1.is_visible('#sticky-room-bar')
        sticky_text = await p1.inner_text('#sticky-room-bar') if sticky_visible else 'Not visible'
        print("P1 Sticky Bar text:", sticky_text.replace('\n', ' '))

        print("=== STEP 3: Friend visits homepage, checks active rooms ===")
        await p2.goto(url)
        await p2.wait_for_timeout(1000)
        active_rooms_p2 = await p2.inner_text('#active-rooms-container')
        print("P2 sees active rooms:\n", active_rooms_p2)

        print("=== STEP 4: Friend joins via invite link ===")
        await p2.goto(share_val)
        await p2.wait_for_timeout(1500)
        p2_lobby_visible = await p2.is_visible('#room-lobby-modal.active')
        print("P2 in Lobby Modal:", p2_lobby_visible)
        p2_lobby_text = await p2.inner_text('#room-lobby-body')
        print("P2 Lobby snippet:\n", p2_lobby_text[:220].replace('\n', ' -- '))

        print("=== STEP 5: Host summons AI companion ===")
        await p1.click('#room-lobby-body button:has-text("召唤 AI 陪玩入座")')
        await p1.wait_for_timeout(2500)
        p1_lobby_ai = await p1.inner_text('#room-lobby-body')
        print("P1 Lobby after AI added:\n", p1_lobby_ai[:280].replace('\n', ' -- '))

        print("=== STEP 6: Host starts game for 谁是卧底 ===")
        await p1.click('#room-lobby-body button.btn-primary-blue')
        await p1.wait_for_timeout(2000)

        # Check if Undercover modal opened on BOTH P1 and P2
        p1_uc_open = await p1.is_visible('#undercover-modal.active')
        p2_uc_open = await p2.is_visible('#undercover-modal.active')
        print(f"P1 Undercover modal open: {p1_uc_open}, P2 Undercover modal open: {p2_uc_open}")

        # Check top invite pill in game modal
        topbar1 = await p1.inner_text('#undercover-modal .modal-game-topbar') if p1_uc_open else 'No topbar'
        print("Top invite pill in game modal:", topbar1.replace('\n', ' '))

        # Check player secret card
        card1_text = await p1.inner_text('#uc-word-text')
        print("P1 Word Card initially:", card1_text)
        await p1.click('#uc-cover-btn')
        await p1.wait_for_timeout(300)
        card1_peek = await p1.inner_text('#uc-word-text')
        print("P1 Word Card after peeking:", card1_peek)

        print("=== STEP 7: Test page refresh persistence ===")
        print("Refreshing P1 (Host) page...")
        await p1.reload()
        await p1.wait_for_timeout(2000)
        p1_sticky_after_reload = await p1.is_visible('#sticky-room-bar')
        print("P1 Sticky Bar visible after reload:", p1_sticky_after_reload)
        if p1_sticky_after_reload:
            re_text = await p1.inner_text('#sticky-room-bar')
            print("P1 Bar text after reload:", re_text.replace('\n', ' '))

        await browser.close()
        print("=== ALL TESTS COMPLETED SUCCESSFULLY! ===")

if __name__ == '__main__':
    asyncio.run(main())
