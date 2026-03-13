import cv2
import numpy as np
import pytesseract

def detect_page_borders(image_path):
    image = cv2.imread(image_path)
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) # 1. Grayscale
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)    # 2. Blur
    edged = cv2.Canny(blurred, 127, 200)            # 3. Edge detection

    # 4. Find and sort contours
    cnts, _ = cv2.findContours(edged, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE) #
    cnts = sorted(cnts, key=cv2.contourArea, reverse=True)

    # 5. Approximate shape
    shapes = [] # Store detected shapes
    for c in cnts:
        peri = cv2.arcLength(c, True) #
        approx = cv2.approxPolyDP(c, 0.005 * peri, True) #
        print(f"{approx}")
        if len(approx) == 4: # Found 4-point contour
            shapes.append(approx) # Store shape for later use
            cv2.drawContours(image, [approx], -1, (0, 255, 0), 2) #
            #break
    #cv2.drawContours(image, cnts, -1, (0, 255, 0), 2) # Draw all contours for debugging
    #cv2.imshow("Outline", image)
    #cv2.waitKey(0)
    return shapes

def order_points(pts):
    rect = np.zeros((4, 2), dtype="float32")

    s = pts.sum(axis=1)
    rect[0] = pts[np.argmin(s)]  # top-left
    rect[2] = pts[np.argmax(s)]  # bottom-right

    diff = np.diff(pts, axis=1)
    rect[1] = pts[np.argmin(diff)]  # top-right
    rect[3] = pts[np.argmax(diff)]  # bottom-left

    return rect


def four_point_transform(image, pts):
    rect = order_points(pts)

    (tl, tr, br, bl) = rect

    widthA = np.linalg.norm(br - bl)
    widthB = np.linalg.norm(tr - tl)
    maxWidth = int(max(widthA, widthB))

    heightA = np.linalg.norm(tr - br)
    heightB = np.linalg.norm(tl - bl)
    maxHeight = int(max(heightA, heightB))

    dst = np.array([
        [0, 0],
        [maxWidth - 1, 0],
        [maxWidth - 1, maxHeight - 1],
        [0, maxHeight - 1]
    ], dtype="float32")

    M = cv2.getPerspectiveTransform(rect, dst)
    warped = cv2.warpPerspective(image, M, (maxWidth, maxHeight))

    return warped


def htr(image_path, shape):
    image = cv2.imread(image_path)

    pts = shape.reshape(4, 2)
    warped = four_point_transform(image, pts)

    gray = cv2.cvtColor(warped, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)


    # improve OCR quality
    _, thresh = cv2.threshold(
        blurred, 127, 255, cv2.THRESH_BINARY
    )

    #cv2.imshow("Isolated Form", thresh)
    #cv2.waitKey(0)

    text = pytesseract.image_to_string(thresh)

    print("Extracted Text:")
    print(text)

    return text

# Run: detect_page_borders('path_to_image.jpg')
def main():
    image_path = "sample forms/IMG_2236.jpg"
    shapes = detect_page_borders(image_path)
    form = ""
    for shape in shapes:
        form += htr(image_path, shape)
    print("Final Form Text:")
    print(form)
if __name__ == "__main__":
    main()