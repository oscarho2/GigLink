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

#### Apple Sign-In configuration

If you support Sign in with Apple on web and native builds, be sure to configure the backend `.env` with:

- `APPLE_CLIENT_ID`: Your Services ID (required for the JavaScript flow and token exchange).
- `APPLE_IOS_BUNDLE_ID` (or `APPLE_IOS_CLIENT_ID`): The native app bundle identifier so Apple identity tokens issued to the app are accepted.
- `APPLE_ADDITIONAL_CLIENT_IDS`: Optional comma-separated list for any other allowed audiences/domains.
- `APPLE_PRIVATE_KEY`, `APPLE_TEAM_ID`, `APPLE_KEY_ID`: Credentials used to mint the client secret Apple requires.

The React app (`frontend/.env`) should keep `REACT_APP_APPLE_CLIENT_ID` aligned with the Services ID.

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

## Safety & Moderation

- All user-generated text (posts, comments, replies, gigs, gig applications, direct messages) is validated by the backend profanity/CSAE/hate-speech filter before it is accepted.
- Every gig and community post exposes a built-in “Report” action that feeds `GigReport`/`PostReport`, hides high-severity content immediately, and emails the safety inbox so the team can respond within 24 hours.
- Administrators can review and action reports through `/api/moderation` endpoints, which support marking content safe, removing it, or suspending an offending account. Critical reports also trigger automatic suspensions.

See `docs/CONTENT_MODERATION.md` for the full workflow and guidance to include in App Review responses.
