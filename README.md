# Multi-Restaurant Server Platform

A comprehensive backend server for managing multiple restaurant locations with real-time ordering, analytics, and QR code-based menu system.

## 🚀 Features

- **Multi-Location Management**: Support for multiple restaurant locations
- **Real-time Ordering**: Socket.IO integration for live order updates
- **QR Code System**: Generate and manage QR codes for tables/locations
- **User Authentication**: JWT-based authentication system
- **Menu Management**: Dynamic menu system with customizations
- **Order Tracking**: Complete order lifecycle management
- **Analytics Dashboard**: Revenue and performance analytics
- **Secure API**: Rate limiting, CORS, and security middleware

## 🛠 Tech Stack

- **Backend**: Node.js, Express.js, TypeScript
- **Database**: SQLite with Prisma ORM
- **Real-time**: Socket.IO
- **Authentication**: JWT, bcrypt
- **Security**: Helmet, CORS, Rate limiting
- **File Upload**: Multer
- **Email**: Nodemailer
- **Payments**: Stripe integration
- **QR Codes**: QRCode generation

## 📋 Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Git

## 🔧 Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd server
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your configuration:
   ```env
   # Database
   DATABASE_URL="file:./dev.db"
   
   # JWT
   JWT_SECRET="your-super-secret-jwt-key"
   JWT_EXPIRES_IN="24h"
   
   # Server
   PORT=3001
   NODE_ENV="development"
   
   # CORS
   CORS_ORIGIN="http://localhost:3000"
   
   # Email Configuration
   SMTP_HOST="smtp.gmail.com"
   SMTP_PORT=587
   SMTP_USER="your-email@gmail.com"
   SMTP_PASS="your-app-password"
   
   # Stripe
   STRIPE_SECRET_KEY="sk_test_..."
   STRIPE_PUBLISHABLE_KEY="pk_test_..."
   STRIPE_WEBHOOK_SECRET="whsec_..."
   ```

4. **Database Setup**
   ```bash
   npm run prisma:generate
   npm run prisma:migrate
   npm run prisma:seed
   ```

5. **Build the project**
   ```bash
   npm run build
   ```

## 🚀 Running the Application

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

### Database Management
```bash
# Open Prisma Studio
npm run prisma:studio

# Generate Prisma Client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Seed database
npm run prisma:seed
```

## 📚 API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh JWT token

### Location Endpoints
- `GET /api/locations` - Get all locations
- `POST /api/locations` - Create new location
- `PUT /api/locations/:id` - Update location
- `DELETE /api/locations/:id` - Delete location

### Menu Endpoints
- `GET /api/menu/:locationId` - Get menu for location
- `POST /api/menu` - Create menu item
- `PUT /api/menu/:id` - Update menu item
- `DELETE /api/menu/:id` - Delete menu item

### Order Endpoints
- `GET /api/orders` - Get orders
- `POST /api/orders` - Create new order
- `PUT /api/orders/:id` - Update order status
- `GET /api/orders/:id` - Get order details

### QR Code Endpoints
- `GET /api/qr/:locationId` - Get QR codes for location
- `POST /api/qr` - Generate new QR code

### Analytics Endpoints (Protected)
- `GET /api/analytics/:locationId` - Get analytics data

## 🧪 Testing

```bash
npm test
```

## 📝 Database Schema

The application uses the following main entities:

- **User**: Customer information and authentication
- **Location**: Restaurant locations
- **Menu**: Menu items per location
- **Order**: Customer orders
- **OrderItem**: Individual items in orders
- **QRCode**: QR codes for tables/locations
- **Analytics**: Performance metrics

## 🔐 Security Features

- JWT authentication
- Password hashing with bcrypt
- Rate limiting
- CORS protection
- Helmet security headers
- Input validation

## 🌐 Socket.IO Events

- `order:created` - New order notification
- `order:updated` - Order status updates
- `order:cancelled` - Order cancellation

## 📱 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 3001 |
| `NODE_ENV` | Environment | development |
| `DATABASE_URL` | Database connection | file:./dev.db |
| `JWT_SECRET` | JWT signing secret | - |
| `CORS_ORIGIN` | Allowed CORS origin | http://localhost:3000 |

## 🚀 Deployment

### Using PM2
```bash
npm install -g pm2
pm2 start dist/index.js --name "restaurant-server"
```

### Using Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3001
CMD ["npm", "start"]
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🐛 Issues

If you encounter any issues, please [create an issue](https://github.com/yourusername/multi-restaurant-server/issues) on GitHub.

## 📞 Support

For support, email your-email@example.com or join our Slack channel.

---

**Made with ❤️ for restaurant management**
