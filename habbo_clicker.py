from pynput import mouse, keyboard

clicks = []

print("Clique pour enregistrer.")
print("Appuie sur ESC pour arrêter.\n")

def on_click(x, y, button, pressed):
    if pressed:
        clicks.append((x, y))
        print(f"Click #{len(clicks)} -> X={x}, Y={y}")

def on_press(key):
    if key == keyboard.Key.esc:
        print("\n=== CLICKS ENREGISTRÉS ===")
        for i, pos in enumerate(clicks, start=1):
            print(f"{i}: {pos}")
        return False

mouse_listener = mouse.Listener(on_click=on_click)
keyboard_listener = keyboard.Listener(on_press=on_press)

mouse_listener.start()
keyboard_listener.start()

keyboard_listener.join()
mouse_listener.stop()