# CityShield -  Your Safety, Your City, Your Voice

**CityShield** is a comprehensive **React + Django-based safety management platform** that connects citizens, police departments, and community volunteers for **rapid emergency response**.  
It features **real-time SOS alerts, live video streaming, interactive safety mapping, intelligent incident management, and advanced analytics**—all aimed at building safer and smarter communities.

## 🎥 Demo
- **Video Preview**: [▶️ Watch Demo](https://www.linkedin.com/posts/themeetshahh_cityshield-yoursafetyyourcityyourvoice-react-activity-7367627669175246849-vn2E)

## 🚀 Features

### 🚨 Emergency SOS System
- One-touch **emergency alerts** with GPS location tracking  
- **Live video streaming** from emergency scenes to police dashboard  

### 👮 Police Dashboard
- Real-time **emergency monitoring** with a unified card interface  
- **Interactive incident map** with live positioning  
- **Video feed integration** for emergency situations  
- Team management & resource allocation  
- **Analytics & reporting** for incident trends  

### 🗺️ Safety Map for Citizens
- Interactive **incident visualization** on maps  
- **Community incident reporting** with photo/video evidence  
- **Safe route recommendations** based on real-time data  
- Emergency **contact integration**  

### 📹 Live Video Streaming
- Automatic **10-second video chunks** sent to police during emergencies  
- **Mini video player** with live feed preview for users  
- **Video feed modal** for police to view emergency streams  
- Timeline navigation for multiple video chunks  

### 👥 Community Features
- Volunteer **network coordination**  
- **Community feedback system**  
- Safety **alerts & notifications**  
- **Role-based access control** (Citizen, Police, Volunteer, Admin)  

### 📱 Advanced Capabilities
- Fully **responsive design**  
- **GPS-based location tracking**  
- Location-based **filtering & search**  
- **Incident report management system**  

## 📁 Project Structure

```
cityshield/
│── backend/ # Django backend
│ │── cityshield_backend/ # Main Django project configuration
│ │── media/ # User uploaded files & media
│ │ │── report_media/ # Report attachments & evidence
│ │ └── sos_videos/ # Live feed storage
│ │── police/ # Police dashboard & management features
│ │── reports/ # Incident reporting system
│ │── safety/ # Safety map & community features
│ │── sos/ # Emergency SOS system
│ │── users/ # User management & authentication
│ │── requirements.txt
│ └── manage.py
│
│── frontend/ # React frontend
│ │── src/
│ │── components/
│ │ ├── auth/
│ │ ├── common/
│ │ ├── dashboard/
│ │ ├── landing/
│ │ └── sos/
│ │── context/
│ │── pages/
│ │── services/
│ └── package.json
│
└── README.md
```

## 🛠️ Installation

### ✅ Prerequisites
- **Node.js** 16+ & npm
- **Python** 3.9+  
- **SQLite** (bundled with Python)  

### ⚙️ Setup Instructions

1. **Clone the repository**
   ```bash
   git clone https://github.com/themeetshah/cityshield.git
   cd cityshield
    ```

2. **Backend Setup**
    ```bash
    cd backend
    python -m venv venv
    source venv/bin/activate   # On Windows: venv\Scripts\activate
    pip install -r requirements.txt
    ```

    **Run migrations**
    ```bash
    python manage.py migrate
    python manage.py createsuperuser
    ```

    **Start backend server**
    ```bash
    python manage.py runserver
    ```

3. **Frontend Setup**
    ```bash
    cd frontend
    npm install
    npm run dev
    ```

4. **Access the application**
    - **Frontend**: http://localhost:5173
    - **Backend API**: http://localhost:8000
    - **Admin Panel**: http://localhost:8000/admin

## 📌 Technologies Used

- **Frontend**: React 18, Vite, Tailwind CSS, Framer Motion, Leaflet
- **Backend**: Django 4.2, Django REST Framework, SQLite
- **Authentication**: JWT, Django Auth
- **Real-time Context**: React Context API
- **Video Streaming**: MediaRecorder API, Blob handling
- **Mapping**: React Leaflet, Leaflet Routing Machine
- **Charts**: Recharts
- **UI Styling**: Tailwind CSS, Lucide Icons

## 🤝 Contribute to CityShield

Contributions are welcomed! Feel free to contribute by creating [**pull requests**](https://github.com/themeetshah/cityshield/pulls) or [submitting issues](https://github.com/themeetshah/cityshield/issues).

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.