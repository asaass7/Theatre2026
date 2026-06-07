import os
from flask import Flask, render_template, request, jsonify, redirect, url_for, flash
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, login_required, logout_user, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
import re

basedir = os.path.abspath(os.path.dirname(__file__))

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key-change-this-in-production'
app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{os.path.join(basedir, "database.db")}'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'
login_manager.login_message = 'Пожалуйста, войдите в систему для бронирования билетов'
login_manager.login_message_category = 'info'

# ========== МОДЕЛИ БАЗЫ ДАННЫХ ==========

class User(UserMixin, db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    fullname = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    phone = db.Column(db.String(20), nullable=False)
    password_hash = db.Column(db.String(200), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_admin = db.Column(db.Boolean, default=False)
    
    # Связь с бронированиями
    bookings = db.relationship('Booking', backref='user', lazy=True, cascade='all, delete-orphan')
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

class Performance(db.Model):
    __tablename__ = 'performances'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=False)
    date = db.Column(db.String(50), nullable=False)
    time = db.Column(db.String(10), nullable=False)
    category = db.Column(db.String(50), nullable=False)
    price = db.Column(db.Integer, nullable=False)
    image_url = db.Column(db.String(200), default='placeholder.jpg')
    available_seats = db.Column(db.Integer, default=100)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Связь с бронированиями
    bookings = db.relationship('Booking', backref='performance', lazy=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'date': self.date,
            'time': self.time,
            'category': self.category,
            'price': self.price,
            'image_url': self.image_url,
            'available_seats': self.available_seats
        }

class Booking(db.Model):
    __tablename__ = 'bookings'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    performance_id = db.Column(db.Integer, db.ForeignKey('performances.id'), nullable=False)
    tickets_count = db.Column(db.Integer, default=1)
    total_price = db.Column(db.Integer, nullable=False)
    booking_date = db.Column(db.DateTime, default=datetime.utcnow)
    status = db.Column(db.String(20), default='active')  # active, cancelled, completed
    
    def to_dict(self):
        return {
            'id': self.id,
            'performance_id': self.performance_id,
            'performance_name': self.performance.name if self.performance else 'N/A',
            'tickets_count': self.tickets_count,
            'total_price': self.total_price,
            'booking_date': self.booking_date.strftime('%d.%m.%Y %H:%M'),
            'status': self.status
        }

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

# ========== СОЗДАНИЕ ТАБЛИЦ И ЗАПОЛНЕНИЕ ДАННЫМИ ==========

with app.app_context():
    # Создаем все таблицы
    db.create_all()
    print("✅ Таблицы БД проверены/созданы")
    
    # Проверяем и добавляем спектакли
    if Performance.query.count() == 0:
        performances = [
            Performance(
                name="Герой нашего времени",
                description="Драма о судьбе и преодолении трудностей. Спектакль по мотивам романа М.Ю. Лермонтова.",
                date="23 сентября",
                time="19:00",
                category="drama",
                price=800,
                image_url="Герой1.jpg",
                available_seats=85
            ),
            Performance(
                name="Бал-маскарад",
                description="Классическая комедия с яркими костюмами и живой музыкой.",
                date="24 сентября",
                time="18:00",
                category="comedy",
                price=650,
                image_url="бал.jpg",
                available_seats=120
            ),
            Performance(
                name="Пираты Карибского моря",
                description="Приключенческая история с морскими сражениями и спецэффектами.",
                date="26 сентября",
                time="19:30",
                category="fantasy",
                price=1000,
                image_url="пираты.jpg",
                available_seats=95
            ),
            Performance(
                name="Последний долг",
                description="Детективный спектакль о загадках и тайнах прошлого.",
                date="25 сентября",
                time="20:00",
                category="drama",
                price=750,
                image_url="долг.jpg",
                available_seats=60
            ),
            Performance(
                name="Звездный дождь",
                description="Фантастическая история о любви и космических приключениях.",
                date="27 сентября",
                time="20:30",
                category="fantasy",
                price=900,
                image_url="star.jpg",
                available_seats=110
            ),
            Performance(
                name="Лесная сказка",
                description="Детский спектакль о приключениях в волшебном лесу.",
                date="28 сентября",
                time="18:30",
                category="comedy",
                price=500,
                image_url="лес.jpg",
                available_seats=150
            )
        ]
        db.session.add_all(performances)
        db.session.commit()
        print("✅ Добавлены спектакли в БД")
    
    # Проверяем количество спектаклей
    print(f"📊 В БД {Performance.query.count()} спектаклей")

# ========== МАРШРУТЫ ==========

@app.route('/')
def index():
    performances = Performance.query.order_by(Performance.date).limit(6).all()
    return render_template('index.html', performances=performances)

@app.route('/register', methods=['GET', 'POST'])
def register():
    if current_user.is_authenticated:
        return redirect(url_for('index'))
    
    if request.method == 'POST':
        fullname = request.form.get('fullname')
        email = request.form.get('email')
        phone = request.form.get('phone')
        password = request.form.get('password')
        
        errors = {}
        
        # Валидация имени
        if not fullname or len(fullname) < 3:
            errors['fullname'] = 'Имя должно содержать минимум 3 символа'
        
        # Валидация email
        if not email or not re.match(r'^[^\s@]+@([^\s@]+\.)+[^\s@]+$', email):
            errors['email'] = 'Введите корректный email'
        else:
            # Проверка уникальности email
            if User.query.filter_by(email=email).first():
                errors['email'] = 'Пользователь с таким email уже существует'
        
        # Валидация телефона
        phone_clean = re.sub(r'\D', '', phone)
        if not phone or len(phone_clean) < 11:
            errors['phone'] = 'Введите корректный номер телефона (11 цифр)'
        
        # Валидация пароля
        if not password or len(password) < 6:
            errors['password'] = 'Пароль должен содержать минимум 6 символов'
        
        if errors:
            return render_template('register.html', errors=errors, form_data=request.form)
        
        # Создание пользователя
        user = User(fullname=fullname, email=email, phone=phone)
        user.set_password(password)
        db.session.add(user)
        db.session.commit()
        
        flash('✅ Регистрация успешна! Теперь вы можете войти в свой аккаунт.', 'success')
        return redirect(url_for('login'))
    
    return render_template('register.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('index'))
    
    if request.method == 'POST':
        email = request.form.get('email')
        password = request.form.get('password')
        
        user = User.query.filter_by(email=email).first()
        
        if user and user.check_password(password):
            login_user(user)
            flash(f'🎭 Добро пожаловать, {user.fullname}!', 'success')
            next_page = request.args.get('next')
            return redirect(next_page) if next_page else redirect(url_for('index'))
        else:
            flash('❌ Неверный email или пароль', 'error')
    
    return render_template('login.html')

@app.route('/logout')
@login_required
def logout():
    logout_user()
    flash('👋 Вы вышли из системы', 'info')
    return redirect(url_for('index'))

@app.route('/profile')
@login_required
def profile():
    # Получаем все бронирования пользователя
    bookings = Booking.query.filter_by(user_id=current_user.id).order_by(Booking.booking_date.desc()).all()
    return render_template('profile.html', user=current_user, bookings=bookings)

@app.route('/profile/edit', methods=['POST'])
@login_required
def edit_profile():
    fullname = request.form.get('fullname')
    phone = request.form.get('phone')
    
    if fullname and len(fullname) >= 3:
        current_user.fullname = fullname
    
    if phone:
        phone_clean = re.sub(r'\D', '', phone)
        if len(phone_clean) >= 11:
            current_user.phone = phone
    
    db.session.commit()
    flash('✅ Данные профиля обновлены', 'success')
    return redirect(url_for('profile'))

@app.route('/performances')
def performances_page():
    return render_template('performances.html')

# ========== API ЭНДПОИНТЫ ==========

@app.route('/api/performances', methods=['GET'])
def api_get_performances():
    """Получение списка спектаклей с фильтрацией (доступно всем)"""
    category = request.args.get('category', 'all')
    search = request.args.get('search', '')
    
    query = Performance.query
    
    if category != 'all':
        query = query.filter_by(category=category)
    
    if search:
        query = query.filter(
            db.or_(
                Performance.name.contains(search),
                Performance.description.contains(search)
            )
        )
    
    performances = query.order_by(Performance.date).all()
    return jsonify([p.to_dict() for p in performances])

@app.route('/api/performances/<int:id>', methods=['GET'])
def api_get_performance(id):
    """Получение одного спектакля по ID (доступно всем)"""
    performance = Performance.query.get_or_404(id)
    return jsonify(performance.to_dict())

@app.route('/api/bookings', methods=['GET', 'POST'])
@login_required
def api_bookings():
    """API для работы с бронированиями (только для авторизованных)"""
    
    if request.method == 'GET':
        # Получение всех бронирований пользователя
        bookings = Booking.query.filter_by(user_id=current_user.id).all()
        return jsonify([b.to_dict() for b in bookings])
    
    elif request.method == 'POST':
        # Создание нового бронирования
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'Некорректные данные'}), 400
        
        performance_id = data.get('performance_id')
        tickets_count = data.get('tickets_count', 1)
        
        # Проверка наличия ID спектакля
        if not performance_id:
            return jsonify({'error': 'Не указан спектакль'}), 400
        
        # Проверка количества билетов
        if tickets_count < 1 or tickets_count > 10:
            return jsonify({'error': 'Некорректное количество билетов (от 1 до 10)'}), 400
        
        # Получаем спектакль
        performance = Performance.query.get(performance_id)
        if not performance:
            return jsonify({'error': 'Спектакль не найден'}), 404
        
        # Проверка наличия свободных мест
        if performance.available_seats < tickets_count:
            return jsonify({'error': f'Недостаточно свободных мест. Доступно: {performance.available_seats}'}), 400
        
        # Расчет стоимости
        total_price = performance.price * tickets_count
        
        # Создание бронирования
        booking = Booking(
            user_id=current_user.id,
            performance_id=performance_id,
            tickets_count=tickets_count,
            total_price=total_price
        )
        
        # Уменьшаем количество свободных мест
        performance.available_seats -= tickets_count
        
        db.session.add(booking)
        db.session.commit()
        
        return jsonify({
            'message': f'✅ Билеты успешно забронированы! Сумма: {total_price} ₽',
            'booking': booking.to_dict()
        }), 201

@app.route('/api/bookings/<int:id>', methods=['DELETE'])
@login_required
def cancel_booking(id):
    """Отмена бронирования (только для авторизованных)"""
    
    booking = Booking.query.get_or_404(id)
    
    # Проверка, что бронирование принадлежит текущему пользователю
    if booking.user_id != current_user.id:
        return jsonify({'error': 'Нет доступа к этому бронированию'}), 403
    
    # Проверка, что бронирование еще не отменено
    if booking.status == 'cancelled':
        return jsonify({'error': 'Бронирование уже отменено'}), 400
    
    # Возвращаем места
    performance = Performance.query.get(booking.performance_id)
    if performance:
        performance.available_seats += booking.tickets_count
    
    # Отменяем бронирование
    booking.status = 'cancelled'
    db.session.commit()
    
    return jsonify({'message': '✅ Бронирование отменено, места возвращены'}), 200

if __name__ == '__main__':
    print("\n" + "="*50)
    print("🎭 ТЕАТР ИМ. АЛЕКСАНДРА ГОРБУНОВА")
    print("="*50)
    print("🚀 Сервер запущен!")
    print("📍 Откройте в браузере: http://127.0.0.1:5000")
    print("📝 Для бронирования билетов необходимо зарегистрироваться")
    print("="*50 + "\n")
    app.run(debug=True, port=5000)
