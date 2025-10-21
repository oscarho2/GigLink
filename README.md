# GigLink

GigLink is a social media platform designed specifically for professional musicians to connect, communicate, find gigs, and share work opportunities.

## Features

- **User Profiles**: Create detailed profiles showcasing your musical skills and portfolio
- **Media Uploads**: Share videos of performances and recordings
- **Gig Board**: Post and search for gig opportunities
- **Dep Network**: Find substitute musicians or offer your services
- **Messaging System**: Direct communication between musicians

## Tech Stack

- **Frontend**: React.js, Material-UI
- **Backend**: Node.js, Express
- **Database**: MongoDB
- **Authentication**: JWT
- **Media Storage**: AWS S3 (for video uploads)

## Getting Started

### Prerequisites

- Node.js (v14+)
- npm or yarn
- MongoDB

### Installation

1. Clone the repository
```
git clone https://github.com/yourusername/giglink.git
```

2. Install dependencies for both frontend and backend
```
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

3. Set up environment variables
Create `.env` files in both frontend and backend directories with the necessary environment variables.

4. Start the development servers
```
# Start backend server
cd backend
npm run dev

# Start frontend server
cd ../frontend
npm start
```

## Project Structure

```
giglink/
├── backend/           # Node.js Express backend
│   ├── controllers/   # Request handlers
│   ├── models/        # Database models
│   ├── routes/        # API routes
│   └── middleware/    # Custom middleware
├── frontend/          # React.js frontend
│   ├── public/        # Static files
│   └── src/           # React components and logic
│       ├── components/# Reusable components
│       ├── pages/     # Page components
│       ├── services/  # API services
│       └── context/   # React context
└── README.md          # Project documentation
```

### Android Trusted Web Activity

If you distribute the PWA through the Google Play Store, follow the steps in `docs/trusted-web-activity.md` to configure Digital Asset Links so the Trusted Web Activity launches without the browser address bar.
