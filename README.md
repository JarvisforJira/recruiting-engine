# Recruiting Engine

AI-powered sourcing, scoring, messaging, and outreach coordination. Claude does the thinking. You do the sending.

## Stack
- **Backend**: FastAPI + Motor (async MongoDB) + Anthropic Claude
- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Database**: MongoDB

## Setup

### 1. MongoDB
Make sure MongoDB is running locally on port 27017, or update the URI.

### 2. Backend
```bash
cd backend
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### 3. Frontend
```bash
cd frontend
npm install
npm run dev
```

Or use the convenience script from the project root:
```bash
./start.sh
```

Then open **http://localhost:5173**

---

## How to use it

### Step 1 — Create a Role
Go to **Roles → New Role**. Paste in the job title, description, requirements, comp, and location.

### Step 2 — Generate a Targeting Plan
Open the role and click **Generate**. Claude will produce:
- Ideal candidate background
- Target titles and companies
- Adjacent profiles
- Exclusion rules
- Best outreach angles
- LinkedIn boolean search strings

### Step 3 — Add Prospects
Go to **Prospects → Add Prospect**. Paste in LinkedIn profile text (copy from the browser). You can add multiple at once.

### Step 4 — Score Them
Click **Score All** or the ⚡ icon per prospect. Claude scores each 0–100, assigns priority (high/medium/low/skip), explains the reasoning, and picks the best outreach angle for that person.

### Step 5 — Use the Daily Queue
Go to **Queue → Daily Queue**. Your top prospects appear ranked by priority with a personalized first message already written. Copy the message, send it on LinkedIn, then click **Mark Sent**.

### Step 6 — Follow-ups
Check **Queue → Follow-up Queue** for prospects contacted 7+ days ago without a reply. Click **Write Follow-up** to get a new message.

### Step 7 — When Someone Replies
Go to the prospect's detail page → **Response Assist** tab. Paste their message. Claude summarizes it, detects intent, and drafts your response.

### Step 8 — Analytics
Check **Analytics** for reply rates by role, pipeline breakdown, and AI insights on what to improve.

---

## Key Constraint
This tool does **not** automate LinkedIn actions. You copy messages and send them yourself. This keeps you compliant with LinkedIn's terms of service.
