# SmartSchool - Система управления школой

## 🚀 Быстрый запуск

### Требования
- Node.js (https://nodejs.org/)
- Python 3 (https://python.org/)
- MySQL (https://dev.mysql.com/downloads/ или XAMPP)

### 1. Запуск MySQL
```cmd
# Если MySQL установлен как служба Windows
net start mysql

# Или если установлен через XAMPP
# Запустите XAMPP Control Panel и включите MySQL

# Или если установлен через MySQL Installer
# Запустите MySQL Workbench или командную строку MySQL
```

### 2. Создание базы данных
```cmd
mysql -u root -p < backend/sql/schema.sql
```

### 3. Установка зависимостей
```cmd
npm install
```

### 4. Запуск сервера
```cmd
npm run dev
```

### 5. Запуск фронтенда
```cmd
cd frontend && python -m http.server 8080

# Или если у вас Python 2
cd frontend && python -m SimpleHTTPServer 8080
```

### 6. Открытие приложения
Откройте http://localhost:8080/login.html в браузере

## 📝 Тестовые данные
- Email: `test@example.com`
- Пароль: `123456`

## 🔧 API Endpoints

- `POST /api/auth/register` - Регистрация
- `POST /api/auth/login` - Вход
- `GET /api/auth/me` - Данные пользователя
- `GET /api/chat` - Сообщения
- `POST /api/chat` - Отправка сообщения
- `GET /api/lessons` - Уроки
- `POST /api/lessons` - Добавление урока
- `GET /api/grades` - Оценки
- `POST /api/grades` - Добавление оценки

## 📝 Роли пользователей

- **student** - Обучающийся
- **teacher** - Преподаватель  
- **admin** - Администратор
