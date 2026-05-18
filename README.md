# Healthy Paws - Backend Service

The backend API service for the Healthy Paws platform, providing a GraphQL API for clinic management, patient records, and appointments.

## 🚀 Tech Stack

- **Core:** Node.js, Express, TypeScript
- **API:** Apollo Server (GraphQL)
- **Database:** PostgreSQL
- **Authentication:** Passport.js (JWT & Local Strategy)
- **Mailing:** Nodemailer

---

## 🛠️ Getting Started

This service can be run standalone for development or as part of the [Healthy Paws Wrapper](https://github.com/AleBradC/healthy-paws-wrapper) which includes the frontend and Nginx gateway.

### Prerequisites

- **Node.js:** v20 or later
- **PostgreSQL:** Running locally or remotely
- **npm:** v10 or later

### Setup Options

#### Option A: Running with Docker (Recommended)
If you want to run the full stack (Frontend + Backend + DB), use the [Wrapper Repository](https://github.com/AleBradC/healthy-paws-wrapper):
```bash
docker-compose up --build
```

#### Option B: Standalone Development

1. Navigate to the service directory:
   ```bash
   cd healthy-paws-service
   ```
2. Install dependencies:
   ```bash
   npm install
   ```

### Database Setup

1. Create a PostgreSQL database (e.g., `healthypaws`).
2. Run the initialization script:
   ```bash
   psql -d healthypaws -f database.sql
   ```

### Configuration

Create a `.env` file in the root directory and configure the following variables:

```env
PORT=8080
DB_USER=your_user
DB_HOST=localhost
DB_DATABASE=healthypaws
DB_PASSWORD=your_password
DB_PORT=5432
JWT_SECRET=your_secret_key
# Resend SMTP key (https://resend.com). Leave empty for local dev — the
# mailer falls back to printing emails to stdout in that case.
RESEND_API_KEY=
MAIL_FROM=onboarding@resend.dev
```

### Running the Service

- **Development Mode (Auto-reload):**
  ```bash
  npm run watch
  ```
- **Build for Production:**
  ```bash
  npm run build
  ```
- **Start Production Server:**
  ```bash
  npm start
  ```

---

## ⚙️ CI/CD

- **Backend CI:** Automatically checks code quality and verifies that the TypeScript project builds correctly on every push to the `dev` branch.
- **Security Audit:** Runs `npm audit` on every push to check for vulnerabilities in backend packages.
- **Dependabot:** Keeps backend dependencies updated and secure.
