# If you want to use all features such as document parsing, 
# document understanding, document translation, key information extraction, etc.:
# 
# python -m pip install "paddleocr[all]"
# import subprocess
# 
# result = subprocess.run(["python3 -m pip install \"paddleocr[all]\""], shell=True, check=True)

from paddleocr import PaddleOCR
import os, argparse

DEFAULT_TEST_IMAGE = "https://paddle-model-ecology.bj.bcebos.com/paddlex/imgs/demo_image/general_ocr_002.png"

def parse_image(img, auto_orient=False, auto_unwarp=False, textline_orientation=False):
    ocr = PaddleOCR(
        use_doc_orientation_classify=auto_orient,
        use_doc_unwarping=auto_unwarp,
        use_textline_orientation=textline_orientation)

    # Run OCR inference on a sample image 
    result = ocr.predict(
        input=img)

    # Visualize the results and save the JSON results
    for res in result:
        res.print()
        res.save_to_img("output")
        res.save_to_json("output")
    
    return f"Successfully Parsed Image {img}"

def main():
    parser = argparse.ArgumentParser(
        description = "Image to Text Recognition Tool"
    )

    parser.add_argument(
        "--image", 
        nargs="+", 
        type=str,
        dest="img", 
        default = DEFAULT_TEST_IMAGE,
        help="image(s) to parse"
    )

    parser.set_defaults(img=DEFAULT_TEST_IMAGE)
    
    args = parser.parse_args()

    print("WARNING: Uses significant amount of application memory")

    while(input("Enter \'c\' to continue: ") not in 'c'):
        continue

    images = args.img
    
    for img in images:
        try:
            result = parse_image(img)
        except Exception as e:
            result = f"Exception {e} caught during parse_image"
        
        print(result)

if __name__=="__main__":
    main()
    

