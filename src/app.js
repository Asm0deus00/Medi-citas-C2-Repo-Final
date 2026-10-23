require('dotenv').config();
const path = require('node:path');
const express = require('express');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const apiRoutes = require('./routes/api.routes');
const errorHandler = require('./middleware/errors');
const { JSON_BODY_LIMIT } = require('./config/constants');

const openApiDocument = YAML.load(path.join(__dirname, '../docs/openapi.yaml'));
const app = express();

app.use(express.json({ limit: JSON_BODY_LIMIT }));
app.get('/', (req, res) => res.redirect('/api-docs'));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openApiDocument));
app.use('/api', apiRoutes);
app.use((req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));
app.use(errorHandler);

module.exports = app;
