# iOS MobileConfig for lmarena.ai Web Clip

This repository contains an iOS configuration profile that installs a Web Clip
shortcut pointing directly to the Code chat experience at
`https://lmarena.ai/c/new?mode=direct&chat-modality=code`.

## Contents
- `profiles/lmarena-webclip.mobileconfig` – signed-ready configuration profile
  that can be distributed over the air or via AirDrop/Files.
- `README.md` – usage instructions and profile details.

## Installation
1. Transfer `lmarena-webclip.mobileconfig` to an iOS/iPadOS device (via AirDrop,
   email, or Files app).
2. Open the profile. iOS will prompt to review the configuration profile under
   Settings → Profile Downloaded.
3. Tap *Install*, review the permissions (only a home screen Web Clip is
   created), then confirm installation.
4. A new icon named **LM Arena Code** appears on the home screen. Launching this
   clip opens the requested web experience in a standalone full-screen web view
   without bouncing through Safari tabs. After you send a message, LM Arena
   generates a persistent chat link in the format
   `https://lmarena.ai/c/<conversation-id>` (for example,
   `https://lmarena.ai/c/019a97c1-89f9-7dba-8c21-eaf55d828e9b`) that you can
   revisit directly.

## Profile properties
- Configures a full-screen Web Clip with a stable HTTPS target URL.
- Disables user removal to keep the shortcut available (changeable by editing
  `IsRemovable`).
- Uses a dedicated payload UUID/identifier for easy MDM tracking.

Feel free to customize the profile identifiers or icon metadata to fit your
organization before distribution.
