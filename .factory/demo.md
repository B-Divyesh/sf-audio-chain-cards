# Chain Cards demo sandbox

Open <https://audio-chain-cards.sociobot.in/demo> or choose **Try it with sample data** on the first screen.

The demo opens a realistic three-step spoken-voice repair card. It includes one completed step and three review labels at 0:12, 0:47, and 1:18. The card covers light room-sound reduction, an 80 Hz high-pass filter, and loudness finishing.

Demo changes use the `demo:chain-cards` session-storage namespace. The demo never opens or writes the real `chain-cards-local` IndexedDB database. **Reset demo** restores the bundled sample. **Start for real** deletes the demo namespace before opening the real card box.

The bundled sample and app shell are cached for offline use. Audio remains user-selected because browsers do not allow a web app to keep access to a local file after reload.
