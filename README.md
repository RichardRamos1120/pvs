# Firebase Firefighter Dashboard

A comprehensive web application for fire departments to manage and track daily activity logs. This application replaces traditional paper-based station logs with a digital solution that enables fire captains and station leadership to record daily activities with audit-grade accuracy and efficiency.

## Features

- **User Authentication**: Secure login and registration with Firebase Authentication
- **Role-Based Access Control**: Different permissions for firefighters, captains, and administrators
- **Daily Activity Logging**: Record and track all activities throughout the day
- **Real-time Database**: All data is stored in Firebase Firestore for instant updates
- **Responsive Design**: Works on all devices - desktops, tablets, and mobile phones
- **Dark Mode**: Comfortable viewing in any lighting conditions
- **PDF Export**: Generate professional PDF reports for sharing and archiving
- **Activity Categories**: Organize activities by type (Admin, Maintenance, Training, etc.)
- **Timeline View**: Chronological display of daily activities
- **Station Management**: Multiple station support with filtering options
- **Activity Analytics**: Visual breakdown of time spent on different activities

## Tech Stack

- React.js
- Firebase (Authentication, Firestore)
- React Router
- Tailwind CSS
- Lucide React (Icons)
- HTML2PDF.js

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Firebase account

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/smfd-fullboxhq.git
   cd smfd-fullboxhq
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file in the root directory with your Firebase configuration:
   ```
   REACT_APP_FIREBASE_API_KEY=your_api_key
   REACT_APP_FIREBASE_AUTH_DOMAIN=your_auth_domain
   REACT_APP_FIREBASE_PROJECT_ID=your_project_id
   REACT_APP_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   REACT_APP_FIREBASE_APP_ID=your_app_id
   ```

4. Start the development server:
   ```
   npm start
   ```

## Firebase Setup

1. Create a new Firebase project at [https://console.firebase.google.com/](https://console.firebase.google.com/)
2. Enable Authentication with Email/Password method
3. Create a Firestore database
4. Set up the following collections:
   - `users` - User profiles with roles
   - `logs` - Daily activity logs
   - `stations` - Station information
   - `firefighters` - Firefighter profiles

## Firestore Data Model

### Users Collection
```
{
  userId: string,
  displayName: string,
  email: string,
  station: string,
  role: string ('firefighter', 'captain', 'admin'),
  createdAt: timestamp
}
```

### Logs Collection
```
{
  date: string,
  rawDate: timestamp,
  captain: string,
  station: string,
  shift: string,
  crew: array,
  activities: array [
    {
      id: string,
      type: string,
      description: string,
      hours: string,
      details: {
        startTime: string,
        endTime: string,
        [other category-specific fields]
      },
      notes: string
    }
  ],
  totalHours: string,
  status: string ('draft', 'complete'),
  notes: string,
  completedAt: timestamp,
  completedBy: string
}
```

### Stations Collection
```
{
  name: string,
  address: string,
  phone: string
}
```

### Firefighters Collection
```
{
  name: string,
  rank: string,
  stationId: string,
  shift: string,
  contact: string
}
```

## Usage

1. Register a new account or log in with existing credentials
2. Navigate to Dashboard to view station activity summary
3. Create a new daily log or continue editing an existing draft
4. Add activities throughout the day
5. Mark the log as complete when finished
6. View past reports and export as needed

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

All rights reserved.