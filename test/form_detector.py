import cv2
import numpy as np

image = cv2.imread("sample forms/IMG_2236.jpg")
y, x, h, w = 100, 100, 50, 50  # Example coordinates; replace with actual values

checkbox = image[y:y+h, x:x+w]

gray = cv2.cvtColor(checkbox, cv2.COLOR_BGR2GRAY)
thresh = cv2.threshold(gray, 150, 255, cv2.THRESH_BINARY_INV)[1]
cv2.imshow("Checkbox", thresh)
cv2.waitKey(0)

filled_ratio = np.sum(thresh) / 255 / (w*h)

if filled_ratio > 0.9:
    print("checked")
else:
    print("empty")
