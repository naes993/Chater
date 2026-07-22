# Chater (ChatEBT)

Mobile-first persona chat. Packs, threads, and optional live agent replies.

## Use

Open [https://naes993.github.io/Chater/](https://naes993.github.io/Chater/) or serve this folder locally.

- **Browse** — discover personas in packs (cast grid)
- **+** — add your own persona (My Personas), start a chat, or import JSON
- **Admin** — 10 taps or hold 10s on the logo (pack management + backup)

## Optional Hermes / OpenClaw bridge

Static hosting can’t talk to a local CLI directly. Run a tiny bridge on your machine:

```bash
node agent-bridge.js
# or with Hermes:
CHATER_AGENT_CMD='hermes' node agent-bridge.js
```

Then create/edit a persona and set **agent endpoint** to:

`http://127.0.0.1:8787/reply`

If the bridge is down, ChatEBT falls back to canned replies.
