## Description

This application is a Node.js/Express proxy server designed to handle user input, prioritize local custom translations, and fall back to the **Google Cloud Translation API (v2)** for all other text. It incorporates specialized server-side libraries to accurately romanize Japanese Kanji/Kana and Korean Hangeul.

---

## Features

* **Custom Overrides:** Exact input matches are served instantly from `overrides.json`, reducing reliance on the API.
* **Google Cloud API Integration:** Handles standard translations for all non-overridden inputs.
* **Japanese Romanization:** Utilizes **`kuromoji.js`** (Morphological Analyzer) and **`wanakana.js`** to convert complex Japanese text (Kanji and Kana) to Romaji, including special handling for topic particle rules (`は` -\> `wa`).
* **Korean Romanization:** Uses the dedicated **`@romanize/korean`** library for accurate Hangeul-to-Latin conversion.
* **Asynchronous Startup:** `kuromoji` dictionary loading is handled asynchronously, ensuring the server only starts listening once the tokenizer is ready.
* **Input Validation:** Ensures the server does not execute empty API calls.

---

## Prerequisites

* **Node.js** (v18 or higher)
* **Google Cloud Project:** An active project with the **Cloud Translation API** enabled.
* **Service Account Key:** A JSON key file downloaded from Google Cloud IAM for authentication.

---

## Installation and Setup

### 1\. Initialize and Install Dependencies

Assuming you are starting in your project directory (`/translator`):

```bash
npm init -y
npm install express body-parser @google-cloud/translate wanakana kuromoji @romanize/korean
```

### 2\. File Placement

Ensure your file structure matches the following, with `index.html` inside the `public` folder:

```ini
translator/
├── node_modules/
├── public/
│   └── index.html 
├── overrides.json
├── package.json
└── server.js 
```

### 3\. Configure Credentials

You must set the `GOOGLE_APPLICATION_CREDENTIALS` environment variable to the file path of your downloaded Google Cloud Service Account JSON key. This must be done in the same terminal session before running the server.

```bash
# Replace the path below with your actual key file path
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/your/keyfile.json"
```

---

## Usage

### 1\. Start the Server

Run the server using Node. The process will display "Kuromoji tokenizer initialized" before "Server running on http://localhost:3000".

```bash
node server.js
```

### 2\. Access the Application

Open your web browser and navigate to: `http://localhost:3000/`

### 3\. Testing Logic

| Input Text | Target | Result (`romanization`) | Logic Used |
| :--- | :--- | :--- | :--- |
| `hello` | `ja` | やあ (`null`) | Local Override (`overrides.json`) |
| `わたしは` | `ja` | わたしは (`watashi wa`) | Kanji/Kana Processing, Topic Particle Rule |
| `안녕` | `ko` | 안녕 (`annyeong`) | Korean Romanization (`@romanize/korean`) |
| `Green` | `ja` | 緑 (`midori`) | Google API + Morphological Analysis |

Limitations:
* The application currently supports only Japanese and Korean romanization.
* Cannot handle Japanese names e.g. Yuuki. May translate to katakana

```bash

```