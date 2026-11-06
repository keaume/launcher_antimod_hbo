"""
Capture les images des boutons utilisées par habbo_auto.py.

Utilisation :
    python capture_buttons.py            -> capture tous les boutons
    python capture_buttons.py chat       -> capture seulement "chat"

Pour chaque bouton :
    1. Place la souris sur le coin HAUT-GAUCHE du bouton, appuie sur F8
    2. Place la souris sur le coin BAS-DROIT du bouton, appuie sur F8
    F9 = passer ce bouton, Échap = quitter
"""
import os
import sys
import threading

import pyautogui
from pynput import keyboard

from habbo_auto import IMAGES_DIR, STEPS

HINTS = {
    "play":      "le bouton PLAY du launcher Habbo",
    "visiter":   "le bouton « À visiter » en bas du jeu",
    "mon_monde": "l'onglet « Mon monde »",
    "appart":    "ton appart dans la liste",
    "chat":      "la barre de chat (une fois dans l'appart)",
    "confirm":   "le bouton de confirmation après :pickall",
}


def wait_key():
    """Attend F8, F9 ou Échap et renvoie la touche."""
    result = {}
    done = threading.Event()

    def on_press(key):
        if key in (keyboard.Key.f8, keyboard.Key.f9, keyboard.Key.esc):
            result["key"] = key
            done.set()
            return False

    with keyboard.Listener(on_press=on_press):
        done.wait()
    return result["key"]


def capture(name):
    print(f"\n=== {name} : {HINTS.get(name, '')}")
    print("Coin HAUT-GAUCHE puis F8 (F9 = passer, Échap = quitter)")
    key = wait_key()
    if key == keyboard.Key.esc:
        sys.exit(0)
    if key == keyboard.Key.f9:
        print("Passé.")
        return
    x1, y1 = pyautogui.position()

    print("Coin BAS-DROIT puis F8")
    key = wait_key()
    if key == keyboard.Key.esc:
        sys.exit(0)
    if key == keyboard.Key.f9:
        print("Passé.")
        return
    x2, y2 = pyautogui.position()

    left, top = min(x1, x2), min(y1, y2)
    width, height = abs(x2 - x1), abs(y2 - y1)
    if width < 5 or height < 5:
        print("Zone trop petite, bouton ignoré.")
        return

    os.makedirs(IMAGES_DIR, exist_ok=True)
    path = os.path.join(IMAGES_DIR, STEPS[name]["image"])
    pyautogui.screenshot(region=(left, top, width, height)).save(path)
    print(f"Enregistré : {path}")


def main():
    names = sys.argv[1:] or list(STEPS)
    for name in names:
        if name not in STEPS:
            print(f"Bouton inconnu : {name} (possibles : {', '.join(STEPS)})")
            continue
        capture(name)
    print("\nTerminé.")


if __name__ == "__main__":
    main()
