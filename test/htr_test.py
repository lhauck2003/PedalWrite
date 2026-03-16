import cv2
import pytesseract

image_path = "sample forms/IMG_2233.jpg"

img = cv2.imread(image_path)

# Load and preprocess: convert to gray and apply Gaussian blur to reduce noise
gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
blurred = cv2.GaussianBlur(gray, (5, 5), 0)

# Apply Canny with thresholds (127, 200)
edges = cv2.Canny(blurred, 127, 200)
cv2.imshow("Canny Edges", edges)
cv2.waitKey(0)

contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
cv2.drawContours(img, contours, -1, (0, 255, 0), 2) # Green contours
cv2.imshow("Contours", img)
cv2.waitKey(0)

# threshold to isolate writing
_, img = cv2.threshold(img, 127, 255, cv2.THRESH_BINARY)

text = pytesseract.image_to_string(img)

print(text)
