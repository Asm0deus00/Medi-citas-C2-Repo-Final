# Medi-Citas API

API REST para la gestión académica de citas médicas. El proyecto permite administrar pacientes, profesionales de salud, horarios, citas, reseñas y resultados médicos mediante endpoints HTTP documentados con OpenAPI y Swagger UI.

> **Alcance académico:** esta versión se desarrolló para el Corte 2 de Bases de Datos. No incluye una interfaz web para pacientes ni debe utilizarse con información clínica real.

## Funcionalidades

- **Pacientes y usuarios:** registro y consulta de pacientes, inicio de sesión y control de acceso según rol.
- **Profesionales y especialidades:** consulta de médicos activos, su especialidad y los horarios registrados.
- **Disponibilidad y citas:** consulta de franjas disponibles, programación de citas, validación de horarios y prevención de cruces.
- **Agenda:** consulta de citas con filtros por fecha, con restricciones de acceso para pacientes y administradores.
- **Reseñas:** calificación de citas atendidas, comentarios y etiquetas asociadas.
- **Resultados médicos:** gestión de resultados numéricos, cualitativos y de imagenología, con control de acceso a los recursos privados.
- **Documentación de API:** especificación OpenAPI y exploración de endpoints mediante Swagger UI.

## Tecnologías

- Node.js
- Express 5
- MySQL
- `mysql2` para la conexión con la base de datos
- Swagger UI y OpenAPI 3.0 para la documentación
- Autenticación mediante token Bearer

## Arquitectura

La aplicación separa responsabilidades por capas:

```text
src/
├── config/        # Configuración y conexión con MySQL
├── controllers/   # Manejo de solicitudes y respuestas HTTP
├── middleware/    # Autenticación, autorización y manejo de errores
├── repositories/  # Acceso a los datos
├── routes/        # Definición de endpoints
├── services/      # Reglas de negocio
└── utils/         # Validaciones y utilidades compartidas
```

El esquema de base de datos se encuentra en `database/medicita.sql`; el contrato de la API está en `docs/openapi.yaml`, y la colección de solicitudes de Postman está en `postman/MediCita.postman_collection.json`.

## Requisitos

- Node.js y npm
- MySQL en ejecución
- Git para clonar el repositorio

## Instalación y ejecución

1. Clona el repositorio y entra en la carpeta del proyecto:

   ```bash
   git clone https://github.com/Asm0deus00/Medi-citas-Proyecto-C2.git
   cd Medi-citas-Proyecto-C2
   ```

2. Crea el esquema y las tablas ejecutando `database/medicita.sql` en MySQL Workbench o desde el cliente de MySQL. El script crea la base de datos `medicita_db` e inserta algunas especialidades iniciales.

3. Instala las dependencias:

   ```bash
   npm install
   ```

4. Copia `.env.example` como `.env` y configura los valores de tu entorno local. Como mínimo, revisa la conexión de MySQL y cambia `SESSION_SECRET` por una cadena aleatoria de al menos 32 caracteres.

   ```env
   PORT=5000
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=tu_clave_local
   DB_NAME=medicita_db
   SESSION_SECRET=usa_un_secreto_aleatorio_de_32_caracteres_o_mas
   ```

5. Inicia el servidor:

   ```bash
   npm start
   ```

6. Abre Swagger UI en [http://localhost:5000/api-docs](http://localhost:5000/api-docs).

La dirección de Swagger indicada es local: solo estará disponible mientras el servidor se encuentre en ejecución en tu equipo. Para utilizar la API, MySQL debe estar activo y las variables de entorno deben corresponder a tu instalación.

## Autenticación y uso de la API

El endpoint de inicio de sesión es `POST /api/auth/login`. Cuando las credenciales son válidas, la API devuelve un token Bearer con una duración de una hora. En Swagger UI, utiliza el botón **Authorize** para introducir el token y probar los endpoints protegidos.

Algunos endpoints principales son:

| Método | Endpoint | Propósito |
|---|---|---|
| `POST` | `/api/auth/login` | Iniciar sesión |
| `GET` | `/api/doctors` | Consultar profesionales activos |
| `GET` | `/api/doctors/{id}/availability?date=YYYY-MM-DD` | Consultar disponibilidad de un profesional |
| `GET` | `/api/appointments` | Consultar citas permitidas para el usuario autenticado |
| `POST` | `/api/appointments` | Solicitar una cita |
| `GET` | `/api/patients?search=texto` | Buscar pacientes; requiere permisos administrativos |
| `GET` | `/api/medical-results/{id}/image` | Consultar una imagen asociada a un resultado, si el archivo existe y el usuario tiene permiso |

La autorización depende del rol y de la relación del usuario con el paciente. Consulta `docs/openapi.yaml` o Swagger UI para revisar los parámetros, esquemas y respuestas de cada endpoint.

## Base de datos y cuentas de prueba

El archivo `database/medicita.sql` crea el esquema principal y datos iniciales de especialidades. Si necesitas configurar un usuario administrador para pruebas locales, revisa `database/admin_setup_example.sql` y reemplaza los datos de ejemplo por credenciales ficticias propias.

Utiliza exclusivamente pacientes y credenciales ficticias. No subas el archivo `.env`, contraseñas reales, tokens ni datos personales a GitHub.

## Pruebas

El proyecto incluye pruebas automatizadas con el ejecutor de pruebas integrado de Node.js. Para ejecutarlas:

```bash
npm test
```

Estas pruebas no sustituyen una validación integral de la API con MySQL. Antes de considerar una ejecución verificada, inicia la base de datos y prueba en Swagger o Postman los flujos principales, tanto los casos exitosos como las respuestas de error.

## Alcance y limitaciones conocidas

- Las contraseñas se almacenan en texto plano únicamente porque así lo exige la instrucción académica de este corte. Esta decisión es insegura para un sistema real; no reutilices credenciales ni información personal.
- La API no incorpora una interfaz web.
- Para imagenología se contempla una referencia a un archivo local privado, pero no se implementa la carga de archivos. La consulta de una imagen requiere que el archivo de prueba exista en el entorno local y que el usuario tenga autorización.
- Las pruebas contra MySQL y los recorridos completos de cada endpoint deben verificarse en el entorno donde se ejecute la aplicación.

## Documentos del proyecto

- [Especificación OpenAPI](docs/openapi.yaml)
- [Modelo entidad-relación](docs/modelo_er.png)
- [Colección de Postman](postman/MediCita.postman_collection.json)
- [Esquema SQL](database/medicita.sql)

---

Proyecto académico de Bases de Datos — Corte 2.
