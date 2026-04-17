# Healthy Paws - Backend Service

The backend API service for the Healthy Paws platform, providing a GraphQL API for clinic management, patient records, and appointments.

## 🚀 Tech Stack

- **Core:** Node.js, Express, TypeScript
- **API:** Apollo Server (GraphQL)
- **Database:** PostgreSQL
- **Authentication:** Passport.js (JWT & Local Strategy)
- **Mailing:** Nodemailer

## 🛠️ Getting Started

### Prerequisites

- **Node.js:** v20 or later
- **PostgreSQL:** Running locally or remotely
- **npm:** v10 or later

### Installation

1. Clone the repository
2. Navigate to the service directory:
   ```bash
   cd healthy-paws-service
   ```
3. Install dependencies:
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

Create a `.env` file in the root directory and configure the following variables (see `.env.example` if available):

```env
PORT=8080
DB_USER=your_user
DB_HOST=localhost
DB_DATABASE=healthypaws
DB_PASSWORD=your_password
DB_PORT=5432
JWT_SECRET=your_secret_key
MAIL_HOST=your_smtp_host
MAIL_PORT=587
MAIL_USER=your_smtp_user
MAIL_PASSWORD=your_smtp_password
MAIL_FROM=no-reply@healthypaws.com
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

## ⚙️ CI/CD

- **Backend CI:** Automatically checks code quality and verifies that the TypeScript project builds correctly on every push to the `dev` branch.
- **Security Audit:** Runs `npm audit` on every push to check for vulnerabilities in backend packages.
- **Dependabot:** Keeps backend dependencies updated and secure.
