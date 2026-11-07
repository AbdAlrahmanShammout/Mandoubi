# Flutter Clean Architecture Template

## Overview

This document describes a scalable Flutter project structure based on Clean Architecture principles with code generation, dependency injection, and state management best practices. This template can be applied to any Flutter project that requires maintainable, testable, and scalable architecture.

## Core Technologies & Libraries

### Essential Dependencies
- **dio** - HTTP client for API calls
- **retrofit** - Type-safe REST client with code generation
- **get_it** - Service locator for dependency injection
- **injectable** - Code generation for dependency injection setup
- **flutter_bloc** - State management using BLoC pattern
- **json_annotation** + **json_serializable** - JSON serialization with code generation
- **shared_preferences** - Local storage for simple key-value pairs

### Development Dependencies
- **build_runner** - Code generation runner
- **retrofit_generator** - Generates Retrofit API client code
- **json_serializable** - Generates JSON serialization code
- **injectable_generator** - Generates dependency injection code

## Project Structure

```
lib/
├── core/                    # Core functionality shared across the app
│   ├── config/             # App configuration (API URLs, constants)
│   ├── di/                 # Dependency Injection setup
│   ├── network/            # Network layer (Dio, interceptors)
│   ├── storage/            # Local storage abstractions
│   └── theme/              # App theme, colors, text styles
│
├── data/                   # Data layer (external data sources)
│   ├── datasource/         # Data source implementations
│   │   ├── remote/        # Remote API clients
│   │   └── local/         # Local database/storage (if needed)
│   ├── dto/               # Data Transfer Objects (API request/response)
│   ├── model/             # Data models (with JSON serialization)
│   └── repository/        # Repository implementations
│
├── domain/                 # Business logic layer (pure Dart)
│   ├── entities/          # Business entities (domain models)
│   ├── repositories/      # Repository interfaces
│   └── usecase/           # Use cases (business logic operations)
│
├── presentation/           # UI layer
│   ├── core/              # Shared presentation components
│   │   ├── app/          # App initialization and routing
│   │   └── widgets/      # Reusable widgets
│   └── features/          # Feature modules
│       └── [feature_name]/
│           ├── bloc/      # BLoC state management
│           ├── pages/     # Screen pages
│           └── widgets/   # Feature-specific widgets
│
└── main.dart              # App entry point
```

---

## Layer Details

### 1. Core Layer (`lib/core/`)

Contains shared functionality used across all layers.

#### **`core/config/`**
- Application configuration files
- API base URLs, environment settings
- App-wide constants and configuration values

**Example:**
```dart
class AppConfig {
  static const String baseUrl = 'https://api.example.com';
  static const String apiVersion = 'v1';
  static const int timeout = 30000;
}
```

#### **`core/di/`**
- Dependency injection setup using `injectable` and `get_it`
- Registration modules for different dependency types
- Generated DI configuration

**Key Files:**
- `injection.dart` - Main DI setup and GetIt instance
- `injection.config.dart` - Auto-generated DI configuration
- `register_module.dart` - Manual registration of third-party dependencies

**Example:**
```dart
// injection.dart
final GetIt getIt = GetIt.instance;

@InjectableInit()
void configureInjection(String environment) {
  initGetIt(getIt, environment: environment);
}

// register_module.dart
@module
abstract class RegisterModule {
  @lazySingleton
  Dio get dio => DioFactory.create();
  
  @lazySingleton
  SharedPreferences get prefs => SharedPreferences.getInstance();
}
```

#### **`core/network/`**
- Network layer setup (Dio configuration)
- Interceptors (authentication, logging, error handling)
- Network-related utilities

**Example:**
```dart
// dio_factory.dart
class DioFactory {
  static Dio create() {
    final dio = Dio(BaseOptions(
      baseUrl: AppConfig.baseUrl,
      connectTimeout: Duration(milliseconds: AppConfig.timeout),
    ));
    
    dio.interceptors.add(AuthInterceptor());
    dio.interceptors.add(LogInterceptor());
    
    return dio;
  }
}

// auth_interceptor.dart
class AuthInterceptor extends Interceptor {
  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    final token = tokenStorage.getToken();
    if (token != null) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    super.onRequest(options, handler);
  }
}
```

#### **`core/storage/`**
- Local storage abstractions
- Secure storage for tokens and sensitive data
- Key-value storage wrappers

**Example:**
```dart
@lazySingleton
class TokenStorage {
  final SharedPreferences _prefs;
  
  TokenStorage(this._prefs);
  
  Future<void> saveToken(String token) async {
    await _prefs.setString('auth_token', token);
  }
  
  String? getToken() => _prefs.getString('auth_token');
  
  Future<void> clearToken() async {
    await _prefs.remove('auth_token');
  }
}
```

#### **`core/theme/`**
- App theme configuration
- Color schemes
- Text styles and typography
- Theme utilities

---

### 2. Data Layer (`lib/data/`)

Handles all data operations and external data sources.

#### **`data/datasource/remote/`**
- Retrofit API clients (with `@RestApi` annotation)
- Remote data source implementations
- API endpoint definitions

**Example:**
```dart
// auth_api_client.dart
@RestApi()
abstract class AuthApiClient {
  factory AuthApiClient(Dio dio) = _AuthApiClient;
  
  @POST('/auth/login')
  Future<AuthResponseDto> login(@Body() LoginRequestDto request);
  
  @POST('/auth/register')
  Future<AuthResponseDto> register(@Body() RegisterRequestDto request);
  
  @GET('/auth/profile')
  Future<UserDto> getProfile();
}

// auth_remote_data_source.dart
@lazySingleton
class AuthRemoteDataSource {
  final AuthApiClient _apiClient;
  
  AuthRemoteDataSource(this._apiClient);
  
  Future<AuthResponseDto> login(LoginRequestDto request) async {
    return await _apiClient.login(request);
  }
}
```

#### **`data/dto/`**
- Data Transfer Objects for API communication
- JSON serialization with `@JsonSerializable()`
- Request and response models

**Naming Convention:**
- `*_dto.dart` - DTO definition
- `*_dto.g.dart` - Generated serialization code

**Example:**
```dart
@JsonSerializable()
class LoginRequestDto {
  final String email;
  final String password;
  
  LoginRequestDto({required this.email, required this.password});
  
  factory LoginRequestDto.fromJson(Map<String, dynamic> json) =>
      _$LoginRequestDtoFromJson(json);
  
  Map<String, dynamic> toJson() => _$LoginRequestDtoToJson(this);
}
```

#### **`data/model/`**
- Data models that extend domain entities
- Include JSON serialization
- Can contain additional fields not in domain entities

**Example:**
```dart
@JsonSerializable()
class UserModel extends User {
  final String id;
  final String email;
  final String name;
  final DateTime createdAt;
  
  UserModel({
    required this.id,
    required this.email,
    required this.name,
    required this.createdAt,
  }) : super(id: id, email: email, name: name);
  
  factory UserModel.fromJson(Map<String, dynamic> json) =>
      _$UserModelFromJson(json);
  
  Map<String, dynamic> toJson() => _$UserModelToJson(this);
}
```

#### **`data/repository/`**
- Repository implementations (from domain/repositories interfaces)
- Coordinate between remote and local data sources
- Data transformation (DTO → Entity)

**Example:**
```dart
@LazySingleton(as: AuthRepository)
class AuthRepositoryImpl implements AuthRepository {
  final AuthRemoteDataSource _remoteDataSource;
  final TokenStorage _tokenStorage;
  
  AuthRepositoryImpl(this._remoteDataSource, this._tokenStorage);
  
  @override
  Future<Either<Failure, User>> login(String email, String password) async {
    try {
      final dto = LoginRequestDto(email: email, password: password);
      final response = await _remoteDataSource.login(dto);
      
      await _tokenStorage.saveToken(response.token);
      
      return Right(response.user.toEntity());
    } catch (e) {
      return Left(ServerFailure(e.toString()));
    }
  }
}
```

---

### 3. Domain Layer (`lib/domain/`)

Pure business logic layer (no Flutter dependencies).

#### **`domain/entities/`**
- Business entities (domain models)
- Pure Dart classes
- No JSON serialization or external dependencies

**Example:**
```dart
class User {
  final String id;
  final String email;
  final String name;
  
  User({
    required this.id,
    required this.email,
    required this.name,
  });
}
```

#### **`domain/repositories/`**
- Repository interfaces (abstract classes)
- Define contracts for data operations
- Used by use cases

**Example:**
```dart
abstract class AuthRepository {
  Future<Either<Failure, User>> login(String email, String password);
  Future<Either<Failure, User>> register(String email, String password, String name);
  Future<Either<Failure, void>> logout();
  Future<Either<Failure, User>> getCurrentUser();
}
```

#### **`domain/usecase/`**
- Use cases (business logic operations)
- Single responsibility (one action per use case)
- Interact with repositories

**Example:**
```dart
@lazySingleton
class LoginUseCase {
  final AuthRepository _repository;
  
  LoginUseCase(this._repository);
  
  Future<Either<Failure, User>> call(String email, String password) async {
    // Validation logic
    if (email.isEmpty || password.isEmpty) {
      return Left(ValidationFailure('Email and password are required'));
    }
    
    // Business logic
    return await _repository.login(email, password);
  }
}
```

---

### 4. Presentation Layer (`lib/presentation/`)

UI layer with state management.

#### **`presentation/core/`**
- Shared presentation components
- **`app/`** - App initialization, routing, theme setup
- **`widgets/`** - Reusable widgets across features

#### **`presentation/features/[feature_name]/`**

Each feature follows this structure:

##### **`bloc/`**
- BLoC state management files
- Events, states, and bloc implementation

**Example:**
```dart
// auth_event.dart
abstract class AuthEvent {}
class LoginRequested extends AuthEvent {
  final String email;
  final String password;
  LoginRequested(this.email, this.password);
}

// auth_state.dart
abstract class AuthState {}
class AuthInitial extends AuthState {}
class AuthLoading extends AuthState {}
class AuthSuccess extends AuthState {
  final User user;
  AuthSuccess(this.user);
}
class AuthError extends AuthState {
  final String message;
  AuthError(this.message);
}

// auth_bloc.dart
@injectable
class AuthBloc extends Bloc<AuthEvent, AuthState> {
  final LoginUseCase _loginUseCase;
  
  AuthBloc(this._loginUseCase) : super(AuthInitial()) {
    on<LoginRequested>(_onLoginRequested);
  }
  
  Future<void> _onLoginRequested(
    LoginRequested event,
    Emitter<AuthState> emit,
  ) async {
    emit(AuthLoading());
    
    final result = await _loginUseCase(event.email, event.password);
    
    result.fold(
      (failure) => emit(AuthError(failure.message)),
      (user) => emit(AuthSuccess(user)),
    );
  }
}
```

##### **`pages/`**
- Screen pages (full-screen widgets)
- Connected to BLoC for state management

**Example:**
```dart
class LoginPage extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (context) => getIt<AuthBloc>(),
      child: BlocConsumer<AuthBloc, AuthState>(
        listener: (context, state) {
          if (state is AuthSuccess) {
            Navigator.pushReplacementNamed(context, '/home');
          } else if (state is AuthError) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text(state.message)),
            );
          }
        },
        builder: (context, state) {
          if (state is AuthLoading) {
            return Center(child: CircularProgressIndicator());
          }
          return LoginForm();
        },
      ),
    );
  }
}
```

##### **`widgets/`**
- Feature-specific reusable widgets
- Smaller components used within pages

---

## Code Generation

This architecture relies heavily on code generation to reduce boilerplate.

### Running Code Generation

```bash
# Generate all code
flutter pub run build_runner build --delete-conflicting-outputs

# Watch mode (regenerates on file changes)
flutter pub run build_runner watch --delete-conflicting-outputs

# Clean and rebuild
flutter pub run build_runner clean
flutter pub run build_runner build --delete-conflicting-outputs
```

### Generated Files

- `*.g.dart` - JSON serialization code
- `*.config.dart` - Dependency injection configuration
- `*_api_client.dart` files - Retrofit API clients

**Important:** Add `*.g.dart` and `*.config.dart` to version control as they're part of the build output.

---

## Dependency Injection Setup

### 1. Mark Classes for Injection

```dart
// Singleton (single instance)
@lazySingleton
class AuthRepository {}

// Factory (new instance each time)
@injectable
class LoginUseCase {}

// Named instances
@Named('authDio')
@singleton
Dio get authDio => Dio();
```

### 2. Initialize DI in main.dart

```dart
void main() {
  configureInjection(Environment.prod);
  runApp(MyApp());
}
```

### 3. Retrieve Dependencies

```dart
// Get instance
final authBloc = getIt<AuthBloc>();

// Get named instance
final dio = getIt<Dio>(instanceName: 'authDio');
```

---

## Feature Development Workflow

### Creating a New Feature

1. **Domain Layer** (bottom-up approach)
   - Create entity in `domain/entities/[feature_name]/`
   - Create repository interface in `domain/repositories/`
   - Create use cases in `domain/usecase/[feature_name]/`

2. **Data Layer**
   - Create DTOs in `data/dto/[feature_name]/`
   - Create API client in `data/datasource/remote/`
   - Create repository implementation in `data/repository/`
   - Run code generation

3. **Presentation Layer**
   - Create BLoC (events, states, bloc) in `presentation/features/[feature_name]/bloc/`
   - Create pages in `presentation/features/[feature_name]/pages/`
   - Create widgets in `presentation/features/[feature_name]/widgets/`

4. **Run Code Generation**
   ```bash
   flutter pub run build_runner build --delete-conflicting-outputs
   ```

---

## Best Practices

### Naming Conventions

- **Files:** Use `snake_case` (e.g., `auth_repository.dart`)
- **Classes:** Use `PascalCase` (e.g., `AuthRepository`)
- **Variables/Functions:** Use `camelCase` (e.g., `getUserProfile`)
- **Constants:** Use `UPPER_SNAKE_CASE` (e.g., `BASE_URL`)

### Feature Organization

```
features/
└── feature_name/
    ├── bloc/
    │   ├── feature_name_bloc.dart
    │   ├── feature_name_event.dart
    │   └── feature_name_state.dart
    ├── pages/
    │   ├── feature_name_page.dart
    │   └── feature_detail_page.dart
    └── widgets/
        ├── feature_name_form.dart
        └── feature_name_card.dart
```

### Dependency Rules

- **Domain layer** must NOT depend on data or presentation layers
- **Data layer** can depend on domain layer only
- **Presentation layer** can depend on domain layer only (not data layer directly)
- Use dependency injection to provide implementations

### Error Handling

Use functional error handling with `Either` type (from `dartz` package):

```dart
// Success: Right(value)
// Failure: Left(failure)
Future<Either<Failure, User>> login();
```

### Testing

Structure tests to mirror the main code:

```
test/
├── core/
├── data/
├── domain/
└── presentation/
```

---

## Environment Configuration

Support multiple environments (dev, staging, prod):

```dart
// main.dart
void main() {
  const environment = String.fromEnvironment(
    'ENV',
    defaultValue: Environment.prod,
  );
  
  configureInjection(environment);
  runApp(MyApp());
}

// Run with environment
// flutter run --dart-define=ENV=dev
```

---

## Common Issues & Solutions

### Issue: Code generation not working
**Solution:** Ensure all dependencies are added and run:
```bash
flutter pub get
flutter pub run build_runner clean
flutter pub run build_runner build --delete-conflicting-outputs
```

### Issue: Dependency injection not finding class
**Solution:** 
- Ensure class has `@injectable`, `@lazySingleton`, or `@singleton` annotation
- Run code generation
- Check if abstract class has `as: InterfaceType` specified

### Issue: Retrofit API not generating
**Solution:**
- Verify `@RestApi()` annotation on abstract class
- Check if `factory` constructor with `Dio` parameter exists
- Ensure `retrofit_generator` is in `dev_dependencies`

---

## Summary

This Clean Architecture template provides:

✅ **Separation of Concerns** - Clear layer boundaries  
✅ **Testability** - Each layer can be tested independently  
✅ **Scalability** - Easy to add new features  
✅ **Maintainability** - Organized and predictable structure  
✅ **Code Generation** - Reduces boilerplate significantly  
✅ **Dependency Injection** - Loose coupling and easy mocking  
✅ **State Management** - BLoC pattern for predictable state  

Use this template as a starting point for any Flutter project that requires a robust, maintainable architecture.
