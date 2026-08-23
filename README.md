# AI Risk Manager

## Overview
The AI Risk Manager is a web application designed to help organizations manage and analyze risks associated with transactions, vendors, and alerts. The application is built using a modern tech stack, ensuring scalability and maintainability.

## Tech Stack
- **Frontend**: React, Vite, JavaScript, Tailwind CSS
- **Backend**: Node.js 22, Express.js
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: JWT, bcrypt

## Project Structure
```
ai-risk-manager
├── client                # Frontend application
│   ├── src
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── .env.example
├── server                # Backend application
│   ├── src
│   ├── prisma
│   ├── package.json
│   └── .env.example
├── ai-service            # Future AI/ML service
│   └── README.md
├── README.md             # Project documentation
└── .gitignore
```

## Getting Started

### Prerequisites
- Node.js (version 22 or higher)
- PostgreSQL
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ai-risk-manager
   ```

2. **Setup the Backend**
   - Navigate to the server directory:
     ```bash
     cd server
     ```
   - Install dependencies:
     ```bash
     npm install
     ```
   - Create a `.env` file based on the `.env.example` file and configure your database connection and JWT secrets.
   - Run database migrations and seed the database:
     ```bash
     npx prisma migrate dev
     npx prisma db seed
     ```
   - Start the server:
     ```bash
     npm start
     ```

3. **Setup the Frontend**
   - Navigate to the client directory:
     ```bash
     cd ../client
     ```
   - Install dependencies:
     ```bash
     npm install
     ```
   - Create a `.env` file based on the `.env.example` file and configure your API base URL.
   - Start the development server:
     ```bash
     npm run dev
     ```

### Usage
- Access the application at `http://localhost:3000` (or the port specified in your Vite configuration).
- Use the login and registration pages to create an account and access the dashboard.

### Features
- User authentication with JWT
- Role-based access control (ADMIN, ANALYST, USER)
- Dashboard with transaction and alert summaries
- CRUD operations for transactions, vendors, and alerts
- Modular risk scoring engine

### Future Enhancements
- Integration of AI/ML services for advanced risk analysis
- Anomaly detection and fraud prediction capabilities

## Contributing
Contributions are welcome! Please open an issue or submit a pull request for any enhancements or bug fixes.

## License
This project is licensed under the MIT License. See the LICENSE file for details.