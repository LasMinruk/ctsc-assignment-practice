# TaskFlow Microservices - Assignment Report
## For CTSE 4th Semester Viva Voce

---

## 📋 Assignment Requirements

Based on the TaskFlow Assignment Guide, the requirements were:

1. **Microservices Architecture** - Build a task management system using microservices
2. **Authentication Service** - JWT-based user authentication
3. **Task Service** - CRUD operations for tasks
4. **Notification Service** - Event-based notifications
5. **API Gateway** - Single entry point for all services
6. **MongoDB Integration** - Database for each service
7. **Docker Containerization** - Containerize all services
8. **OpenAPI Documentation** - API documentation

---

## ✅ How Requirements Were Fulfilled

### 1. Microservices Architecture ✅
- **Implementation**: Created 4 independent microservices
  - Auth Service (Port 3001)
  - Task Service (Port 3002)
  - Notification Service (Port 3003)
  - API Gateway (Port 3004)
- **Communication**: Services communicate via HTTP REST APIs
- **Network**: Docker bridge network for inter-service communication

### 2. Authentication Service (JWT) ✅
- **Features Implemented**:
  - User Registration (`POST /api/auth/register`)
  - User Login (`POST /api/auth/login`)
  - JWT Token Verification (`POST /api/auth/verify`)
  - User Profile (`GET /api/auth/profile`)
- **Technology**: bcryptjs for password hashing, jsonwebtoken for JWT

### 3. Task Service (CRUD) ✅
- **Features Implemented**:
  - Create Task (`POST /api/tasks`)
  - Read Tasks (`GET /api/tasks`)
  - Read Single Task (`GET /api/tasks/:id`)
  - Update Task (`PUT /api/tasks/:id`)
  - Delete Task (`DELETE /api/tasks/:id`)
- **Task Properties**: title, description, status, priority, dueDate, tags
- **Filtering**: Filter by status, priority, pagination support

### 4. Notification Service ✅
- **Features Implemented**:
  - Send Notification (`POST /api/notifications/send`)
  - List Notifications (`GET /api/notifications`)
  - Statistics (`GET /api/notifications/stats`)
- **Integration**: Simulated email notifications using nodemailer
- **Events**: TASK_CREATED, TASK_UPDATED, TASK_DELETED

### 5. API Gateway ✅
- **Features Implemented**:
  - Single entry point at Port 3004
  - Request routing to appropriate services
  - Health checks (`/health`, `/health/all`)
  - Rate limiting
  - CORS support
- **Technology**: http-proxy-middleware, express-rate-limit

### 6. MongoDB Integration ✅
- **Configuration**: 
  - Single MongoDB instance (Port 27017)
  - 3 separate databases: authdb, taskdb, notifdb
  - Authentication enabled (admin/password123)
- **ODM**: Mongoose for schema modeling

### 7. Docker Containerization ✅
- **Containers Created**:
  - taskflow-mongodb
  - taskflow-auth
  - taskflow-tasks
  - taskflow-notifications
  - taskflow-gateway
- **All services**: Node.js 18 Alpine, proper health checks

### 8. OpenAPI Documentation ✅
- **File**: openapi.yaml created
- **Coverage**: All endpoints documented
- **Schemas**: User, Task, Notification, Error

---

## 🏗️ Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        API Gateway (3004)                          │
│                   (Entry Point - Port 3004)                      │
└─────────────────────────────────────────────────────────────────────┘
              │                  │                  │
              ▼                  ▼                  ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ Auth Service     │  │ Task Service    │  │ Notification    │
│ (Port 3001)     │  │ (Port 3002)     │  │ Service (3003)  │
│                 │  │                 │  │                 │
│ - Register      │  │ - Create Task   │  │ - Send Notif    │
│ - Login         │  │ - Read Tasks    │  │ - List Notif    │
│ - Verify Token │  │ - Update Task  │  │ - Stats         │
│ - Profile       │  │ - Delete Task  │  │                 │
└─────────────────┘  └─────────────────┘  └─────────────────┘
         │                    │                    │
         └────────────────────┼────────────────────┘
                              │
              ┌───────────────▼───────────────┐
              │      MongoDB (Port 27017)     │
              │  ┌──────┐ ┌──────┐ ┌─────┐ │
              │  │authdb│ │taskdb│ │notif│ │
              │  └──────┘ └──────┘ └─────┘ │
              └──────────────────────────────┘
```

---

## 📁 Project Structure

```
files/
├── docker-compose.yml          # Docker Compose configuration
├── openapi.yaml               # API Documentation
├── auth-service/              # Authentication Service
│   ├── src/app.js            # Main application
│   ├── package.json          # Dependencies
│   └── Dockerfile             # Container definition
├── task-service/             # Task Management Service
│   ├── src/app.js
│   ├── package.json
│   └── Dockerfile
├── notification-service/      # Notification Service
│   ├── src/app.js
│   ├── package.json
│   └── Dockerfile
└── api-gateway/              # API Gateway
    ├── src/app.js
    ├── package.json
    └── Dockerfile
```

---

## 🚀 Running Instructions

### Prerequisites
- Docker Desktop installed
- At least 4GB RAM allocated to Docker

### Step-by-Step Commands

#### 1. Navigate to Project Directory
```
bash
cd C:\Users\REDTECH\Desktop\4th Sem01\CTSE\Assignment\files
```

#### 2. Start All Services
```
bash
docker compose up -d
```

#### 3. Verify All Containers Running
```
bash
docker ps
```

Expected output:
```
CONTAINER ID   IMAGE                        STATUS
taskflow-gateway         Up ...   0.0.0.0:3004->3004/tcp
taskflow-tasks           Up ...   0.0.0.0:3002->3002/tcp
taskflow-notifications   Up ...   0.0.0.0:3003->3003/tcp
taskflow-auth            Up ...   0.0.0.0:3001->3001/tcp
taskflow-mongodb         Up ...   0.0.0.0:27017->27017/tcp
```

#### 4. Test API Gateway Health
```
bash
curl http://localhost:3004/health
```

#### 5. Test Full Health Check
```
bash
curl http://localhost:3004/health/all
```

---

## 📝 API Testing Examples

### 1. Register a New User
```
bash
curl -X POST http://localhost:3004/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"password123"}'
```

### 2. Login (Get JWT Token)
```
bash
curl -X POST http://localhost:3004/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

### 3. Create a Task (Using JWT Token)
```
bash
curl -X POST http://localhost:3004/api/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"title":"Complete Assignment","description":"Finish CTSE assignment","priority":"high"}'
```

### 4. Get All Tasks
```
bash
curl -X GET http://localhost:3004/api/tasks \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 5. Update Task Status
```
bash
curl -X PUT http://localhost:3004/api/tasks/TASK_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"status":"done"}'
```

---

## 🔧 Common Docker Commands

### View Logs
```
bash
docker logs taskflow-gateway
docker logs taskflow-auth
docker logs taskflow-tasks
docker logs taskflow-notifications
docker logs taskflow-mongodb
```

### Stop All Services
```
bash
docker compose down
```

### Rebuild Services (after code changes)
```
bash
docker compose build
docker compose up -d
```

### Remove Volumes (reset database)
```
bash
docker compose down -v
```

---

## 🎯 Key Features for Viva Questions

### Q: What is the purpose of API Gateway?
**A**: The API Gateway provides a single entry point for all client requests. It handles routing, rate limiting, and shields internal services from direct external access.

### Q: How do services communicate?
**A**: Services communicate via REST APIs over HTTP. The API Gateway routes requests to appropriate services based on URL paths.

### Q: How is authentication handled?
**A**: JWT (JSON Web Tokens) are used. When a user logs in, they receive a token which is included in subsequent request headers.

### Q: Why use separate databases?
**A**: Each service has its own database to ensure loose coupling. Services can evolve independently without affecting others.

### Q: What is the benefit of Docker?
**A**: Docker ensures consistent environments across development and production. All dependencies are packaged together, eliminating "works on my machine" issues.

---

## 📊 Service Health Status

All services should show as "healthy" when running:
- MongoDB: ✓ Healthy
- Auth Service: ✓ Healthy  
- Task Service: ✓ Running
- Notification Service: ✓ Running
- API Gateway: ✓ Running

---

## 🔐 Configuration & Environment Variables

All sensitive configurations are managed through environment variables in Docker Compose:

### MongoDB Configuration
| Variable | Value | Description |
|----------|-------|-------------|
| MONGO_INITDB_ROOT_USERNAME | admin | Database admin username |
| MONGO_INITDB_ROOT_PASSWORD | password123 | Database admin password |
| MONGO_URI (Auth Service) | mongodb://admin:password123@mongodb:27017/authdb?authSource=admin | Auth service database connection |
| MONGO_URI (Task Service) | mongodb://admin:password123@mongodb:27017/taskdb?authSource=admin | Task service database connection |
| MONGO_URI (Notification Service) | mongodb://admin:password123@mongodb:27017/notifdb?authSource=admin | Notification service database connection |

### JWT Configuration
| Variable | Value | Description |
|----------|-------|-------------|
| JWT_SECRET | supersecret_change_in_prod | Secret key for signing JWT tokens |
| JWT_EXPIRY | 24h (default) | Token expiration time |

### Email/Notification Configuration (Optional - Uses Ethereal by default)
| Variable | Example Value | Description |
|----------|---------------|-------------|
| EMAIL_HOST | smtp.gmail.com | SMTP server host |
| EMAIL_PORT | 587 | SMTP server port |
| EMAIL_USER | your-email@gmail.com | SMTP authentication username |
| EMAIL_APP_PASSWORD | xxxx xxxx xxxx xxxx | Gmail App Password (16 characters) |
| EMAIL_FROM | noreply@taskflow.app | Default sender email address |

### Azure Cloud Configuration (Optional)
| Variable | Example Value | Description |
|----------|---------------|-------------|
| AZURE_STORAGE_CONNECTION_STRING | DefaultEndpointsProtocol=https;... | Azure Blob Storage connection string |
| AZURE_CONTAINER_NAME | taskflow-attachments | Azure container name for file uploads |
| AZURE_SAS_TOKEN | sv=2021-06-08&... | Azure Shared Access Signature token |

### Service URLs (Internal Docker Network)
| Variable | Value |
|----------|-------|
| AUTH_SERVICE_URL | http://auth-service:3001 |
| TASK_SERVICE_URL | http://task-service:3002 |
| NOTIFICATION_SERVICE_URL | http://notification-service:3003 |
| NOTIF_SERVICE_URL | http://notification-service:3003 |

### Node Environment
| Variable | Value |
|----------|-------|
| NODE_ENV | production |
| PORT (Auth) | 3001 |
| PORT (Task) | 3002 |
| PORT (Notification) | 3003 |
| PORT (API Gateway) | 3004 |

---

## 📝 Dependencies Used

### Auth Service
- express, mongoose, helmet, cors, bcryptjs, jsonwebtoken, dotenv

### Task Service
- express, mongoose, helmet, cors, axios, dotenv

### Notification Service
- express, mongoose, helmet, cors, nodemailer, dotenv

### API Gateway
- express, http-proxy-middleware, helmet, cors, express-rate-limit, morgan, dotenv

---

## 🎓 Conclusion

This project successfully demonstrates:
1. ✅ Microservices architecture with 4 services
2. ✅ JWT authentication with bcrypt password hashing
3. ✅ Complete CRUD operations for task management
4. ✅ Event-based notification system
5. ✅ API Gateway pattern for unified access
6. ✅ MongoDB integration with separate databases
7. ✅ Docker containerization with health checks
8. ✅ OpenAPI documentation

**The TaskFlow system is fully functional and ready for demonstration!**

---

*Report generated for CTSE 4th Semester Assignment*
*All services running on Docker with proper health checks*
