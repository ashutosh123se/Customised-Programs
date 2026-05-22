# Customised Programs by Sajan Shah

This project features a high-impact, bespoke landing page and integrated Express/Nodemailer backend for **Customised Programs by Sajan Shah**.

## Features

- **23 Elite Sections**: An immersive journey tailored for schools, colleges, corporates, and organizations.
- **Dynamic Frontend Animations**:
  - Interactive Canvas particle network background on the Hero section (60 floating nodes).
  - Typewriter effect cycling through core messages.
  - Interactive counters animating with `requestAnimationFrame` and `easeOutQuad`.
  - Strikethrough scroll animation on generic program limitations.
  - Category-based filtering for 13 customized programs with reflow transitions.
  - Staggered checklists, SVG drawing timelines, accordion FAQs, and dynamic duration selectors.
  - Mobile swipe-ready autoplay testimonial carousel with indicators and progress indicators.
- **Robust Registration Form**: Searchable multi-select program pills, participant counters, dynamic mode options, date validation, and detailed client-side checks.
- **Production-Ready Backend**:
  - Auto-generated Request Reference IDs (`REQ-YYYYMMDD-XXXX`).
  - Rate limiting of 5 requests per IP per hour to prevent spam.
  - Server-side parameter validation.
  - Parallel email dispatch via SMTP:
    - Custom requester branded confirmation email.
    - Tabular admin summary sent directly to the team.

---

## Getting Started

Follow these 4 simple steps to run this application locally:

### 1. Install Dependencies
Ensure you have [Node.js](https://nodejs.org) installed, then run:
```bash
npm install
```

### 2. Configure Environment Variables
Copy the `.env.example` file to create a `.env` file:
```bash
copy .env.example .env
```
Open `.env` and enter your SMTP credential values:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-gmail-app-password
ADMIN_EMAIL=info@sajanshah.com
PORT=3000
FRONTEND_ORIGIN=http://localhost:3000
```
> **Note**: For Gmail, it is recommended to use an [App Password](https://support.google.com/accounts/answer/185833) rather than your main account password.

### 3. Run the Server
Launch the server in development mode (with auto-reload on changes):
```bash
npm run dev
```
Or for production deployment:
```bash
npm start
```

### 4. View in Browser
Open your browser and navigate to:
```
http://localhost:3000
```

---

## File Structure

- `index.html`: Holds the HTML, CSS custom design variables, responsive grid styling, inline SVG icons, and vanilla JavaScript logic for interactive components.
- `server.js`: Implements the Express server routing, static file hosting, `/api/request` validation, rate limiting, and dual Nodemailer SMTP mail templates.
- `package.json`: Manages NPM scripts and server dependencies.
- `.env.example`: Provides a template for local configurations.
