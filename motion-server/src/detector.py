import cv2
import os
import sys
import json
import signal
import time

running = False
cam = None
frame1 = None
frame2 = None
capturas_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'capturas')
os.makedirs(capturas_dir, exist_ok=True)
ultimo_guardado = 0
cooldown = 2

def open_camera():
    global cam
    if cam is not None:
        cam.release()
    cam = cv2.VideoCapture(0)
    if not cam.isOpened():
        return False
    return True

def process_line(line):
    global running, cam, frame1, frame2, ultimo_guardado
    cmd = line.strip()
    if cmd == 'start' and not running:
        if not open_camera():
            print(json.dumps({"error": "No se pudo abrir la cámara"}), flush=True)
            return
        ret, frame1 = cam.read()
        ret, frame2 = cam.read()
        if not ret:
            print(json.dumps({"error": "Error al leer cámara"}), flush=True)
            return
        running = True
        print(json.dumps({"status": "detecting"}), flush=True)
    elif cmd == 'stop' and running:
        running = False
        if cam:
            cam.release()
            cam = None
        print(json.dumps({"status": "stopped"}), flush=True)

def detect():
    global running, cam, frame1, frame2, ultimo_guardado
    if not running or cam is None:
        return

    ret, new_frame = cam.read()
    if not ret:
        print(json.dumps({"error": "Error al leer frame"}), flush=True)
        running = False
        return

    frame2 = new_frame
    diff = cv2.absdiff(frame1, frame2)
    gray = cv2.cvtColor(diff, cv2.COLOR_BGR2GRAY)
    blur = cv2.GaussianBlur(gray, (5, 5), 0)
    _, thresh = cv2.threshold(blur, 20, 255, cv2.THRESH_BINARY)
    dilated = cv2.dilate(thresh, None, iterations=3)
    contours, _ = cv2.findContours(dilated, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)

    max_area = 0
    for contour in contours:
        area = cv2.contourArea(contour)
        if area > max_area:
            max_area = area

    motion = max_area > 4000
    if motion:
        ahora = time.time()
        if ahora - ultimo_guardado > cooldown:
            timestamp = time.strftime("%H-%M-%S")
            nombre = f"capturas/movimiento_{timestamp}.jpg"
            cv2.imwrite(os.path.join(capturas_dir, f"movimiento_{timestamp}.jpg"), frame1)
            ultimo_guardado = ahora

    print(json.dumps({"motion": motion, "score": round(max_area, 1)}), flush=True)
    frame1 = frame2

if __name__ == '__main__':
    signal.signal(signal.SIGINT, lambda s, f: sys.exit(0))
    try:
        for line in sys.stdin:
            process_line(line)
            detect()
    except SystemExit:
        pass
    finally:
        if cam:
            cam.release()
