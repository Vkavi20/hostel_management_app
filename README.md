# hostel_management_app
Hostel Management App Setup Instructions
Prerequisites

Node.js and npm installed.
MongoDB installed and running locally on mongodb://localhost:27017.
A modern web browser (Chrome, Firefox, Edge).
Python 3 or npx serve for serving the frontend.

Setup Steps
1. Backend Setup

Create a new directory for the project:
mkdir hostel-management-app
cd hostel-management-app


Initialize a Node.js project:
npm init -y


Install dependencies:
npm install express mongoose cors bcryptjs jsonwebtoken


Create a file named server.js and copy the contents of the provided server.js artifact.

Create a file named models.js and copy the contents of the provided models.js artifact.

Start the MongoDB server (if not already running):
mongod


Run the backend server:
node server.js

The backend should be running on http://localhost:5000.


2. Frontend Setup

Create a directory named frontend and create a file named index.html inside it:
mkdir frontend
cd frontend
touch index.html


Copy the contents of the provided index.html artifact into frontend/index.html.

Serve the frontend using a simple HTTP server on port 3001 (since port 3000 is in use):
python3 -m http.server 3001

Alternatively, use npx to serve it:
npx serve -p 3001


Open your browser and navigate to http://localhost:3001.


Note: If port 3001 is in use, try another port (e.g., 3002) by replacing 3001 with the desired port number. To check for port conflicts, use:

macOS/Linux: lsof -i :3001
Windows: netstat -aon | findstr :3001

3. Using the App

Register: Create an account by selecting a role (student, staff, or admin).
Login: Use your credentials to log in.
Dashboards:
Student Dashboard: View rooms, submit maintenance requests, check events (calendar view), fees, lost & found, visitors, chat (auto-refreshed), and submit feedback via modals.
Staff Dashboard: Manage maintenance requests (with progress bars) and view visitors.
Admin Dashboard: Manage rooms, events, fees, and view feedback and maintenance requests.


Navigation: Use the sidebar to jump to dashboard sections or the bell icon to view notification history.
Notifications: Toast notifications appear for actions, with a log accessible via the bell icon.

Notes

The app uses a local MongoDB instance. Ensure MongoDB is running before starting the backend.
Push notifications are simulated as in-app toast notifications due to local hosting constraints.
Community chat uses polling (every 10 seconds) for updates. For real-time chat, consider WebSocket support (e.g., Socket.IO) in production.
The frontend uses plain HTML, CSS, and JavaScript with no external dependencies, featuring a modern UI with modals, animations, and a responsive design.

Troubleshooting

If the backend fails to connect to MongoDB, ensure the MongoDB server is running and the connection string is correct.
If the frontend doesn’t load, check that the backend is running and CORS is properly configured.
For CORS issues, ensure the cors middleware is correctly set up in server.js.
If the frontend page is blank, open the browser’s developer tools (F12 → Console) to check for JavaScript or network errors.
Ensure you’re visiting http://localhost:3001 (not https or a different port).
If data doesn’t load, ensure you’ve added data via the admin dashboard (e.g., rooms, events, fees).


