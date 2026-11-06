import os
import sys
import time

import pyautogui
import pygetwindow as gw

pyautogui.PAUSE = 0.2

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
IMAGES_DIR = os.path.join(BASE_DIR, "images")

# Pour chaque bouton :
#   - image   : capture du bouton dans images/ (faite avec capture_buttons.py)
#   - coords  : position de secours si l'image est absente ou introuvable
#   - timeout : temps max (s) pour attendre que le bouton apparaisse
#   - delay   : pause fixe utilisée seulement en mode coordonnées (ancien comportement)
STEPS = {
    "play":     {"image": "play.png",     "coords": (1735, 778),  "timeout": 10, "delay": 1.0},
    "visiter":  {"image": "visiter.png",  "coords": (93, 1366),   "timeout": 40, "delay": 4.0},
    "mon_monde": {"image": "mon_monde.png", "coords": (468, 73),  "timeout": 10, "delay": 0.3},
    "appart":   {"image": "appart.png",   "coords": (271, 167),   "timeout": 10, "delay": 0.2},
    "chat":     {"image": "chat.png",     "coords": (1744, 1304), "timeout": 30, "delay": 0.2},
    "confirm":  {"image": "confirm.png",  "coords": (1799, 761),  "timeout": 10, "delay": 0.1},
}

# Tolérance de la reconnaissance (nécessite opencv-python, sinon correspondance exacte)
try:
    import cv2  # noqa: F401
    LOCATE_KWARGS = {"confidence": 0.85, "grayscale": True}
except ImportError:
    LOCATE_KWARGS = {"grayscale": True}


def find_on_screen(image_path):
    try:
        return pyautogui.locateCenterOnScreen(image_path, **LOCATE_KWARGS)
    except pyautogui.ImageNotFoundException:
        return None
    except Exception as e:
        print("  Erreur reconnaissance:", e)
        return None


def click_step(name):
    step = STEPS[name]
    image_path = os.path.join(IMAGES_DIR, step["image"])

    if os.path.isfile(image_path):
        print(f"[{name}] Recherche du bouton (max {step['timeout']}s)...")
        deadline = time.time() + step["timeout"]
        while time.time() < deadline:
            pos = find_on_screen(image_path)
            if pos:
                print(f"[{name}] Trouvé en {pos.x},{pos.y}")
                pyautogui.click(pos.x, pos.y)
                return
            time.sleep(0.3)
        print(f"[{name}] Bouton introuvable, clic sur la position de secours")
    else:
        # Pas d'image : ancien comportement (pause fixe puis coordonnées)
        time.sleep(step["delay"])

    pyautogui.click(*step["coords"])


def get_window_ids():
    return set(w._hWnd for w in gw.getAllWindows())


def get_new_habbo_window(before_ids):
    for w in gw.getAllWindows():
        if w._hWnd not in before_ids and "habbo" in w.title.lower():
            return w
    return None


def main():
    print("Snapshot fenêtres avant Play...")
    before_ids = get_window_ids()

    click_step("play")

    print("Attente nouvelle fenêtre jeu...")
    game_win = None
    for _ in range(30):
        game_win = get_new_habbo_window(before_ids)
        if game_win:
            break
        time.sleep(0.5)

    if not game_win:
        print("Nouvelle fenêtre Habbo introuvable")
        sys.exit(1)

    print("Fenêtre jeu trouvée:", game_win.title)

    try:
        game_win.restore()
    except Exception:
        pass

    try:
        game_win.activate()
    except Exception as e:
        print("Activate ignoré:", e)

    time.sleep(0.5)

    try:
        game_win.moveTo(0, 0)
        time.sleep(0.1)
        game_win.maximize()
    except Exception as e:
        print("Maximize ignoré:", e)

    click_step("visiter")    # attend que le jeu soit chargé
    click_step("mon_monde")
    click_step("appart")
    click_step("chat")       # attend que l'appart soit chargé

    print("Ecriture :pickall")
    pyautogui.write(":pickall")
    pyautogui.press("enter")

    click_step("confirm")

    print("Terminé")


if __name__ == "__main__":
    main()
