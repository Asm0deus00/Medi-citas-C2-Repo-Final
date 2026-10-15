# Diseño técnico — MediCita, corte 2

## Origen de los requisitos

El modelo y las operaciones se derivan del caso 7, MediCita, suministrado en el enunciado. El documento completo del corte 1 no está incluido en los materiales de esta entrega; cuando se integre el informe, deberán verificarse nombres y alcance de las historias de usuario originales.

## Modelo relacional y normalización

El modelo separa `patients`, `users`, `doctors`, `specialties` y `appointments` para evitar repetir datos del paciente o del médico por cita. Cada entidad tiene clave primaria `id` y las asociaciones usan claves foráneas. `doctor_schedules` representa múltiples jornadas por médico sin columnas repetitivas. La relación muchos a muchos entre reseñas y etiquetas se representa con `review_tag_assignments`, cuyo par de claves es la clave primaria compuesta.

Las reseñas se relacionan con una cita atendida y mantienen `rating` como atributo obligatorio. `comment` y `wait_minutes` son opcionales. Los exámenes se separan en `medical_results` y las tablas especializadas `numeric_results`, `qualitative_results` e `imaging_results`. Cada detalle usa como clave primaria y foránea `result_id`, estableciendo una relación uno a cero/uno. El tipo guardado en `medical_results` selecciona el detalle correspondiente desde el servicio.

El diseño alcanza **tercera forma normal (3FN)**: los atributos son atómicos (1FN), no existen dependencias parciales de claves compuestas en las tablas de datos principales (2FN), y los atributos descriptivos de especialidades, pacientes y médicos no se duplican en tablas dependientes (3FN). Las tablas de asociación solo contienen sus identificadores, evitando dependencias transitivas.

La **desnormalización deliberada** es `appointments.price_at_booking`. Conserva el precio acordado en el momento de la reserva aunque `doctors.consultation_price` se actualice posteriormente. La duplicación evita distorsionar los reportes históricos de ingresos.

## Recursos REST

- `/api/patients`, `/api/doctors`, `/api/specialties`, `/api/doctor_schedules`: listados, lectura individual, creación, actualización parcial y eliminación.
- `/api/users`: alta de cuenta de paciente y consultas; modificación y eliminación de credenciales están restringidas en este corte.
- `/api/auth/login`: verifica correo y contraseña, devuelve datos no sensibles del usuario.
- `/api/appointments`: registra citas; `GET ?patientId=...` resuelve «mis citas» filtrando por paciente y su `status` separa pendientes, atendidas o canceladas. `PATCH /:id` actualiza estado.
- `/api/reviews`: reseñas por cita atendida. `/api/reviews/:id/tags` obtiene o reemplaza sus etiquetas.
- `/api/review_tags`: catálogo de etiquetas administrable.
- `/api/medical-results`: registra y filtra por paciente/tipo; `/api/medical-results/:id` devuelve los atributos comunes y el detalle especializado.

Se prefieren sustantivos plurales y operaciones HTTP GET/POST/PATCH/PUT/DELETE según la intención. Las relaciones se representan mediante identificadores foráneos en el JSON y rutas hijas únicamente cuando se opera sobre asociaciones, como etiquetas de una reseña.

## Arquitectura

`routes` establece rutas, `controllers` traduce las solicitudes y respuestas HTTP, `services` ejecuta las reglas de negocio, `repositories` concentra el CRUD SQL básico y `config/database.js` contiene un pool MySQL2. `middleware/errors.js` transforma errores de negocio y de SQL en respuestas de la API. Las consultas usan parámetros de MySQL2.

## Reglas de negocio

- Una cita solo se registra si paciente y médico existen y el médico está activo.
- La reserva usa una transacción y bloqueo de fila del médico para serializar solicitudes simultáneas de ese mismo profesional. Se rechazan solapamientos de horas con código 409.
- Se guarda el precio vigente al registrar la cita.
- La reseña se permite únicamente para una cita con estado `completed` y la restricción UNIQUE impide dos reseñas de la misma cita.
- El resultado médico se inserta con su subtipo en la misma transacción.

## Limitaciones académicas declaradas

En el corte 2 el enunciado especifica **contraseñas en texto plano**; se mantiene únicamente para cumplir la actividad. No se deben utilizar usuarios reales. El inicio de sesión emite un token Bearer con firma HMAC y expiración de una hora. Las rutas privadas exigen ese token y aplican reglas de autorización por paciente y administrador; antes de operar con datos reales todavía se requerirían hashing de contraseñas, revocación de tokens, auditoría y almacenamiento privado de archivos. También faltan gestión de horarios excepcionales, subida física de imágenes y acceso externo desplegado. Son funciones fuera del alcance de este prototipo local, no garantías de producción.

La reserva valida que la duración completa pertenezca a una franja de `doctor_schedules`, usando lunes=1 y domingo=0. Los exámenes numéricos admiten valores negativos y exigen un rango de referencia ordenado.
