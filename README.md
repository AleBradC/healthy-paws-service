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

### Setup & Running the Project

This project is configured to run exclusively via Docker Compose alongside the frontend and database. You should run the full stack using the [Healthy Paws Wrapper](https://github.com/AleBradC/healthy-paws-wrapper) repository.

1. Clone and navigate to the wrapper repository:
   ```bash
   git clone https://github.com/AleBradC/healthy-paws-wrapper.git
   cd healthy-paws-wrapper
   ```
2. Start the entire stack:
   ```bash
   docker-compose up --build
   ```

### Accessing the Application

Once the Docker stack is running, the Nginx gateway routes traffic automatically on port 80:

- **Frontend App:** [http://localhost](http://localhost)
- **Apollo Server (GraphQL Sandbox):** [http://localhost/graphql](http://localhost/graphql)

Open the Apollo Server URL in a browser to launch the **Apollo Sandbox** — an interactive playground where you can:

- Write and execute GraphQL **queries** and **mutations**
- Browse the full schema with auto-complete
- Set HTTP headers (e.g., `Authorization: Bearer <token>`) for authenticated requests
- View response data and errors in real time

---

## ⚙️ CI/CD

- **Backend CI:** Automatically checks code quality and verifies that the TypeScript project builds correctly on every push to the `dev` branch.
- **Security Audit:** Runs `npm audit` on every push to check for vulnerabilities in backend packages.
- **Dependabot:** Keeps backend dependencies updated and secure.
