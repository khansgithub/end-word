# Page snapshot

```yaml
- generic [ref=e1]:
  - button "Switch to light mode" [ref=e2]: ☀️
  - main [ref=e3]:
    - button "Switch to light mode" [ref=e4]: ☀️
    - generic [ref=e5]:
      - generic [ref=e7]:
        - heading "End Word" [level=1] [ref=e8]: End Word
        - generic [ref=e10]: Join a game room
      - generic [ref=e12]:
        - generic [ref=e14]:
          - generic [ref=e15]: Players
          - generic [ref=e16]: 0/5
        - generic [ref=e17]:
          - generic [ref=e19]: Your Name
          - textbox "Your Name" [active] [ref=e20]:
            - /placeholder: Enter your name
        - button "▶ Join Game" [ref=e21] [cursor=pointer]:
          - generic [ref=e22]: ▶
          - text: Join Game
  - button "Open Next.js Dev Tools" [ref=e28] [cursor=pointer]:
    - img [ref=e29]
  - alert [ref=e32]
```