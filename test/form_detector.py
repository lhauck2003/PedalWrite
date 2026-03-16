import cv2
import numpy as np
from edge_detection import htr, four_point_transform, detect_page_borders

def align_form(template_path, form_path):
    template = cv2.imread(template_path, cv2.IMREAD_GRAYSCALE)
    form = cv2.imread(form_path, cv2.IMREAD_GRAYSCALE)

    # ORB feature detector
    orb = cv2.ORB_create(5000)

    kp1, des1 = orb.detectAndCompute(template, None)
    kp2, des2 = orb.detectAndCompute(form, None)

    # Match features
    matcher = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True)
    matches = matcher.match(des1, des2)

    matches = sorted(matches, key=lambda x: x.distance)

    # Take best matches
    matches = matches[:200]

    pts_template = np.float32([kp1[m.queryIdx].pt for m in matches])
    pts_form = np.float32([kp2[m.trainIdx].pt for m in matches])

    # Compute homography
    H, mask = cv2.findHomography(pts_form, pts_template, cv2.RANSAC)

    height, width = template.shape

    aligned = cv2.warpPerspective(form, H, (width, height))

    return aligned

def extract_field(image, shape) -> bool:
    warped = four_point_transform(image, shape)
    gray = cv2.cvtColor(warped, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)

    return checkbox_checked(blurred)

def extract_fields(image, shapes):
    fields = {}
    for shape in shapes:
        try:
            field_name = identify_field(image, shape)
        except Exception as e:
            print(f"Error identifying field: {e}")
            field_name = input("Enter field name: ")

        try:
            fields[field_name] = extract_field(image, shape)
        except Exception as e:
            print(f"Error extracting {field_name}: {e}")
            fields[field_name] = input(f"Is {field_name} checked? (y/n): ").lower() == 'y'
    return fields

def identify_field(image, shape) -> str:
    return htr(image, shape)

def checkbox_checked(image) -> bool:
    thresh = cv2.threshold(image,150,255,cv2.THRESH_BINARY_INV)[1]
    filled_ratio = np.sum(thresh)/255/(image.shape[0]*image.shape[1])

    return filled_ratio > 0.2


def main():
    template_path = "sample forms/IMG_2234.jpg"
    form_path = "sample forms/IMG_2236.jpg"

    aligned_form = align_form(template_path, form_path)

    cv2.imshow("Aligned Form", aligned_form)
    cv2.waitKey(0)

    shapes = detect_page_borders(aligned_form)

    fields = extract_fields(aligned_form, shapes)
    print("Extracted Fields:")
    for field, value in fields.items():
        print(f"{field}: {value}")


if __name__ == "__main__":
    main()