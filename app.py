import os
import openai
import requests
import pandas as pd
from flask import Flask, render_template, request, jsonify
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")

if not OPENROUTER_API_KEY:
    print("❌ OPENROUTER_API_KEY not found. Check your .env file.")
else:
    print("✅ Loaded OpenRouter key:", OPENROUTER_API_KEY[:12] + "...")

# Load medical terms dataset
df = pd.read_csv("data/medical_terms.csv")

def search_dataset(prompt):
    prompt_lower = prompt.lower()
    matches = df[df['term'].str.lower().str.contains(prompt_lower)]
    if not matches.empty:
        return matches.iloc[0]['definition']
    return None

# Flask app
app = Flask(__name__)

@app.route("/")
def index():
    return render_template("index.html", project_name="My Medical Technology")

@app.route("/api/hello", methods=["GET"])
def hello():
    return jsonify({"msg": "Hello, world!"})

@app.route("/api/ask", methods=["POST"])
def ask():
    data = request.get_json()
    prompt = data.get("prompt", "")

    # First try dataset search
    dataset_answer = search_dataset(prompt)
    if dataset_answer:
        return jsonify({"response": dataset_answer})

    # Otherwise, use OpenRouter AI
    try:
        response = requests.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                "Content-Type": "application/json",
                "HTTP-Referer": "http://localhost:5000",
                "X-Title": "MyMedicalTechnology",
            },
            json={
                "model": "openai/gpt-3.5-turbo",
                "messages": [
                    {"role": "system", "content": "You are a helpful medical technology assistant."},
                    {"role": "user", "content": prompt}
                ]
            },
        )
        if response.status_code == 200:
            answer = response.json()["choices"][0]["message"]["content"]
            return jsonify({"response": answer})
        else:
            return jsonify({"error": response.text}), response.status_code

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    print("Starting Flask app...")
    app.run(debug=True)





###   python app.py                  # To run the app, use the command: