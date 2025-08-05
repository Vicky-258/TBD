# Ship Dashboard UI - Retro Maritime Control Interface

A retro-styled, DOS-terminal inspired ship control dashboard built with Electron, featuring a mechanical ship control feel reminiscent of vintage naval command centers and 80s computer terminals.

## 🚢 Overview

This Ship Dashboard UI provides a comprehensive maritime control interface with a distinctive retro aesthetic. The interface combines the nostalgic charm of DOS-era terminals with modern functionality, creating an immersive experience that feels like operating actual ship control systems from classic naval vessels.

## 🎨 Design Philosophy

### Retro Aesthetic Elements
- **DOS-Terminal Color Palette**: Dark grays, amber text, and muted teal accents
- **Pixelated Typography**: 'Press Start 2P' font for authentic retro computing feel
- **Mechanical Controls**: Buttons with raised/pressed visual feedback mimicking physical switches
- **Grid Overlays**: Subtle grid patterns reminiscent of radar screens and navigation displays
- **Vintage Animations**: Smooth fade-ins and mechanical button presses

### Maritime Control Feel
- **Ship Control Metaphors**: All UI elements designed to feel like actual ship instruments
- **Navigation-Focused**: Interface prioritizes maritime operations and voyage management
- **Command Center Layout**: Strategic placement of controls mimicking real ship bridges
- **Audio Recording**: Voice command capabilities for hands-free operation during critical maneuvers

## 🛠️ Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn package manager

### Installation Steps

1. **Navigate to the UI directory:**
   ```bash
   cd UI
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Install required packages:**
   ```bash
   npm install electron electron-reload express multer path fs child_process
   ```

4. **Start the application:**
   ```bash
   npm start
   ```

### Package Dependencies

```json
{
  "electron": "^latest",
  "electron-reload": "^latest",
  "express": "^4.18.0",
  "multer": "^1.4.5"
}
```

## 📁 File Structure & Functionality

### Core Application Files

#### `main.js`
**Primary Electron Process**
- Initializes the Electron application window
- Manages window controls (minimize, maximize, close)
- Spawns the audio recording server process
- Handles IPC communication between renderer and main process
- Creates the `audio-recordings` directory for voice commands
- Implements hot-reload during development

#### `index.html`
**Main Interface Structure**
- **Loading Screen**: Animated grid background with ship initialization sequence
- **Video Introduction**: Cinematic intro with watermark removal
- **Mode Selection**: Three operational modes (Departure Prep, Sailing Mode, Voyage History)
- **Interactive Screens**: Multiple dashboard views with retro styling
- **Window Controls**: Custom minimize/maximize/close buttons
- **Navigation Elements**: Carousel-based feature selection

#### `script.js`
**Frontend Logic & Interactions**
- **Audio Recording System**: WebRTC-based voice recording with WAV conversion
- **Screen Transitions**: Smooth animations between different interface modes
- **Chat Interface**: AI assistant integration for ship operations
- **Carousel Navigation**: Interactive feature box navigation
- **Permission Management**: Microphone access handling
- **Quote Slideshow**: Dynamic maritime quotes rotation
- **File Upload Handlers**: Document management for voyage preparation

#### `styles.css`
**Retro Styling System**
- **Color Variables**: DOS-terminal inspired color scheme
- **Retro Buttons**: 3D-effect buttons with mechanical press animations
- **Grid Backgrounds**: Radar-style grid overlays
- **Typography**: Pixelated fonts for authentic retro feel
- **Window Controls**: Custom-styled minimize/maximize/close buttons
- **Responsive Design**: Adaptive layouts for different screen sizes
- **Animation Keyframes**: Smooth transitions and hover effects

### Server Components

#### `audio-server.js`
**Audio Recording Backend**
- **Express Server**: Handles audio file uploads on port 3001
- **Multer Integration**: File upload middleware for audio processing
- **CORS Configuration**: Cross-origin resource sharing for frontend communication
- **Audio Storage**: Manages `audio-recordings` directory
- **File Endpoints**: `/upload-audio` and `/current-audio` routes
- **Health Monitoring**: Server status checking with `/ping` endpoint

#### `databaseManager.js`
**Data Management System**
- Database operations for voyage data
- Chat history persistence
- Document upload tracking
- User preference storage

#### `server-manager.js`
**Server Coordination**
- Manages multiple server processes
- Handles server lifecycle events
- Coordinates between audio and database servers

### Supporting Files

#### `package.json`
**Project Configuration**
- Application metadata and dependencies
- Electron-specific configurations
- Build and development scripts
- Cross-platform compatibility settings

#### `assets/`
**Media Resources**
- `intro.mp4`: Cinematic introduction video
- `weatherforecasting.jpg`: Weather system interface preview
- `shiprouting.jpg`: Navigation system preview
- `checklist.jpg`: Crew management interface preview
- `party.jpg`: Recreational mode interface preview

#### `audio-recordings/`
**Voice Command Storage**
- Runtime-created directory for audio files
- Stores WAV-format voice recordings
- Automatically managed by the audio server
- Excluded from version control

## 🎮 User Interface Features

### Operating Modes

#### 1. Departure Prep Mode
- **Document Upload**: PDF upload for voyage documentation
- **Logistics Management**: Cargo and supply tracking
- **Crew Log Integration**: Personnel management
- **Weather Retrieval**: Real-time weather data integration

#### 2. Sailing Mode (Primary Dashboard)
- **Ship Routing Summary**: Navigation overview panel
- **Feature Carousel**: Interactive system access (Weather, Routing, Crew, Party Mode)
- **AI Chat Assistant**: Voice and text-based ship operations assistant
- **Real-time Controls**: Live ship system monitoring

#### 3. Voyage History
- **Completed Voyages**: Historical voyage data
- **Ongoing Operations**: Current voyage status
- **Tabbed Interface**: Organized voyage information

### Interactive Elements

#### Voice Recording System
- **Push-to-Talk**: Click-and-hold recording functionality
- **Auto-timeout**: 30-second maximum recording length
- **Visual Feedback**: Recording indicator with pulsing animation
- **Format Conversion**: Automatic WebM to WAV conversion
- **Server Upload**: Seamless audio file transmission

#### Chat Interface
- **Text Input**: Traditional typing interface
- **Voice Commands**: Audio-based interaction
- **Message History**: Persistent conversation log
- **AI Integration**: Intelligent response system

#### Window Management
- **Custom Controls**: Retro-styled window buttons
- **Minimize**: Taskbar minimization
- **Maximize/Restore**: Window size toggling
- **Close**: Application termination with confirmation

## 🔧 Technical Implementation

### Electron Architecture
- **Main Process**: Window management and system integration
- **Renderer Process**: UI rendering and user interaction
- **IPC Communication**: Secure inter-process messaging
- **Node.js Integration**: Direct system access capabilities

### Audio Processing Pipeline
1. **WebRTC Capture**: Browser-based microphone access
2. **MediaRecorder API**: Real-time audio encoding
3. **Format Conversion**: WebM to WAV transformation
4. **Server Upload**: HTTP POST to Express endpoint
5. **File Storage**: Disk-based audio persistence

### Styling Architecture
- **CSS Variables**: Centralized color management
- **Component-based**: Modular style organization
- **Animation System**: Keyframe-based transitions
- **Responsive Design**: Mobile-friendly adaptations

## 🚀 Development Features

### Hot Reload System
- **Automatic Refresh**: File change detection
- **Selective Ignoring**: Excludes audio recordings and dependencies
- **Development Efficiency**: Instant feedback during coding

### Error Handling
- **Permission Checks**: Microphone access validation
- **Network Resilience**: Graceful server connection failures
- **User Feedback**: Clear error messaging and guidance

## 🎯 Future Enhancements

- **Real-time Ship Data**: Integration with actual maritime systems
- **Advanced Voice Commands**: Natural language processing
- **Multi-language Support**: International maritime operations
- **Mobile Companion**: Tablet-based remote control
- **Weather Integration**: Live meteorological data feeds
- **GPS Navigation**: Real-time position tracking

## 🐛 Troubleshooting

### Common Issues

**Audio Recording Not Working**
- Verify microphone permissions in browser
- Check if audio-server.js is running on port 3001
- Ensure `audio-recordings` folder has write permissions

**Application Won't Start**
- Run `npm install` to ensure all dependencies are installed
- Check Node.js version compatibility
- Verify Electron installation

**Window Controls Not Responding**
- Ensure IPC handlers are properly registered in main.js
- Check for JavaScript errors in DevTools console
- Verify Electron security settings

## 📄 License

This project is part of the TBD maritime system suite. All rights reserved.

---

*Built with ⚓ for the modern maritime industry, combining classic nautical tradition with cutting-edge technology.*
