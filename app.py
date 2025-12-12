import os
import io
import time
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from huggingface_hub import InferenceClient
from moviepy.editor import VideoFileClip, ImageSequenceClip
from PIL import Image

# --- 1. कॉन्फ़िगरेशन ---
# Render Environment Variables से टोकन प्राप्त करें
# पिछले चैट के अनुसार, टोकन का नाम 'HUGGINGFACE_ACCESS_TOKEN' है
HF_TOKEN = os.environ.get("HUGGINGFACE_ACCESS_TOKEN")
# Gemini Key का उपयोग अभी नहीं हो रहा है, लेकिन इसे यहाँ प्राप्त किया जा सकता है:
# GEMINI_KEY = os.environ.get("GEMINI_KEY") 

# Hugging Face मॉडल और एंडपॉइंट
IMAGE_TO_IMAGE_MODEL = "autoweeb/Qwen-Image-Edit-2509-Photo-to-Anime"
WAVESPEED_PROVIDER = "wavespeed" # तेज प्रोसेसिंग के लिए

# फ़ाइल पथ
UPLOAD_FOLDER = 'uploads'
CONVERTED_FOLDER = 'converted'

# सुनिश्चित करें कि फ़ोल्डर मौजूद हैं
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(CONVERTED_FOLDER, exist_ok=True)


app = Flask(__name__)
# सभी ओरिजिन्स से CORS सक्षम करें (डेवलपमेंट/टेस्टिंग के लिए)
CORS(app) 


# --- 2. Hugging Face क्लाइंट इनिशियलाइज़ेशन ---
if not HF_TOKEN:
    raise ValueError("HUGGINGFACE_ACCESS_TOKEN environment variable not set.")

try:
    hf_client = InferenceClient(
        provider=WAVESPEED_PROVIDER,
        api_key=HF_TOKEN,
    )
    print("Hugging Face Inference Client Initialized Successfully.")
except Exception as e:
    print(f"Error initializing Hugging Face client: {e}")
    hf_client = None


# --- 3. यूटिलिटी फ़ंक्शन्स ---

def process_frame(frame_image_bytes, style_prompt):
    """एक एकल फ़्रेम को Hugging Face मॉडल का उपयोग करके परिवर्तित करता है।"""
    
    # यह फ़ंक्शन फ़्रेम को Anime में बदलने के लिए इमेज-टू-इमेज API का उपयोग करता है
    # `input_image` को bytes में होना चाहिए।
    try:
        # 1. API कॉल
        # output is a PIL.Image object
        converted_image = hf_client.image_to_image(
            image=frame_image_bytes,
            prompt=f"Transform this video frame into {style_prompt} anime style, maintaining the subject and composition. high quality, cinematic, masterpiece.",
            model=IMAGE_TO_IMAGE_MODEL,
        )
        
        # 2. PIL इमेज को वापस bytes में बदलें
        byte_arr = io.BytesIO()
        converted_image.save(byte_arr, format='JPEG')
        return byte_arr.getvalue()

    except Exception as e:
        print(f"Error processing frame: {e}")
        # त्रुटि होने पर मूल फ़्रेम लौटाएँ
        return frame_image_bytes


# --- 4. मुख्य रूट ---

@app.route('/anime-convert', methods=['POST'])
def anime_convert():
    """वीडियो अपलोड स्वीकार करता है, फ़्रेम-बाय-फ़्रेम प्रोसेसिंग करता है, और डाउनलोड लिंक देता है।"""
    
    if not hf_client:
        return jsonify({"message": "Hugging Face client not initialized."}), 503

    if 'video' not in request.files:
        return jsonify({"message": "No video file part"}), 400

    video_file = request.files['video']
    style = request.form.get('style', 'jujutsu-kaisen') # डिफ़ॉल्ट स्टाइल

    if video_file.filename == '':
        return jsonify({"message": "No selected file"}), 400

    # फ़ाइल सेव करें
    timestamp = int(time.time())
    input_filename = f"{timestamp}_input.mp4"
    output_filename = f"{timestamp}_anime_{style}.mp4"
    input_path = os.path.join(UPLOAD_FOLDER, input_filename)
    output_path = os.path.join(CONVERTED_FOLDER, output_filename)
    
    video_file.save(input_path)
    
    # स्टाइल के लिए एक अधिक प्राकृतिक प्रॉम्प्ट सेट करें
    style_prompt_map = {
        'what-if': 'Marvel What If style, comic book shading',
        'ben-10-classic': 'Ben 10 classic cartoon style, vibrant, thick outlines',
        'jujutsu-kaisen': 'Jujutsu Kaisen anime style, dark shadows, high detail',
    }
    style_prompt = style_prompt_map.get(style, 'classic Japanese anime')

    try:
        # 1. वीडियो लोड करें और फ़्रेम दर निर्धारित करें
        clip = VideoFileClip(input_path)
        
        # 0.2 FPS (प्रति 5 सेकंड में 1 फ़्रेम) पर प्रोसेसिंग करने के लिए
        # यह बहुत धीमा होगा और स्थिर एनीमे जैसा लगेगा। 
        # बेहतर परिणामों के लिए, 1-2 FPS का उपयोग करें या पूरे वीडियो को process करें, लेकिन वह बहुत धीमा होगा।
        # हम यहाँ 2 FPS (0.5 सेकंड में 1 फ़्रेम) का उपयोग करेंगे ताकि प्रोसेसिंग गति और एनीमेशन की गुणवत्ता में संतुलन बना रहे।
        target_fps = 2
        
        # 2. फ़्रेम एक्सट्रैक्ट करें और प्रोसेस करें
        processed_frames_bytes = []
        duration = clip.duration
        
        # प्रति फ़्रेम की प्रोसेसिंग के लिए समय की आवश्यकता बहुत अधिक होती है, 
        # इसलिए हम केवल target_fps पर फ़्रेम निकालते हैं।
        
        # clip.iter_frames() को 0.2 FPS पर चलाने के लिए, हम `fps=target_fps` पास करते हैं
        print(f"Starting conversion for {input_filename} at {target_fps} FPS...")
        
        for frame_array in clip.iter_frames(fps=target_fps, dtype="uint8"):
            # फ़्रेम को PIL इमेज में बदलें
            frame_img = Image.fromarray(frame_array)
            
            # PIL इमेज को bytes में बदलें
            frame_byte_arr = io.BytesIO()
            frame_img.save(frame_byte_arr, format='JPEG')
            
            # Hugging Face API को कॉल करें
            converted_frame_bytes = process_frame(frame_byte_arr.getvalue(), style_prompt)
            
            # वापस PIL इमेज में बदलें
            converted_frame_img = Image.open(io.BytesIO(converted_frame_bytes))
            
            # moviepy के लिए वापस numpy array में बदलें
            processed_frames_bytes.append(converted_frame_img) 

            # छोटे वीडियो के लिए प्रगति संदेश दिखाएँ
            print(f"Processed 1 frame...")
            
        clip.close()
        
        # 3. फ़्रेम को वापस वीडियो में जोड़ें
        if not processed_frames_bytes:
             return jsonify({"message": "No frames processed."}), 500

        # ImageSequenceClip का उपयोग करते समय, हमें PIL Images या NumPy arrays का उपयोग करना होता है, 
        # हमने ऊपर PIL Images का उपयोग किया है।
        anime_clip = ImageSequenceClip(list(processed_frames_bytes), fps=target_fps)
        anime_clip.write_videofile(
            output_path, 
            codec='libx264', 
            audio_codec='aac', 
            temp_audiofile='temp-audio.m4a', 
            remove_temp=True,
            logger=None
        )
        
        anime_clip.close()

        # 4. सफल प्रतिक्रिया
        # क्लाइंट-साइड कोड के अनुसार, हम डाउनलोड पाथ भेजते हैं
        download_url = f"/{CONVERTED_FOLDER}/{output_filename}"
        
        return jsonify({
            "message": "Conversion complete!", 
            "downloadUrl": download_url, 
            "styleUsed": style
        }), 200

    except Exception as e:
        print(f"A critical error occurred: {e}")
        return jsonify({"message": f"Conversion failed: {str(e)}"}), 500
    finally:
        # क्लीनअप: अपलोड फ़ाइल को हटाएँ
        if os.path.exists(input_path):
            os.remove(input_path)


# --- 5. डाउनलोड रूट ---

@app.route(f'/{CONVERTED_FOLDER}/<filename>', methods=['GET'])
def download_file(filename):
    """कनवर्ट की गई फ़ाइलों को सीधे एक्सेस करने की अनुमति देता है।"""
    full_path = os.path.join(CONVERTED_FOLDER, filename)
    if os.path.exists(full_path):
        return send_file(full_path, as_attachment=False)
    return jsonify({"message": "File not found"}), 404

# --- 6. रनिंग द ऐप (Render के लिए आवश्यक) ---
if __name__ == '__main__':
    # Gunicorn का उपयोग करके चलाएँ
    # Render पर, Gunicorn आमतौर पर `Procfile` के माध्यम से हैंडल किया जाता है
    # लेकिन स्थानीय परीक्षण के लिए, आप इसका उपयोग कर सकते हैं।
    app.run(debug=True, port=os.environ.get('PORT', 5000))

# ध्यान दें: Render को चलाने के लिए, आपको एक `Procfile` की आवश्यकता होगी:
# web: gunicorn app:app
