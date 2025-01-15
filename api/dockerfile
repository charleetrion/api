# Usar una imagen base de Python
FROM python:3.10-alpine

# Establecer el directorio de trabajo dentro del contenedor
WORKDIR /app

# Copiar los archivos de la aplicación al contenedor
COPY . /app

# Crear un archivo requirements.txt con las dependencias necesarias
# Instalar dependencias del sistema necesarias para compilar algunos paquetes Python
RUN apk add --no-cache build-base

# Instalar dependencias de Python desde requirements.txt (es recomendable tener este archivo)
RUN pip install --no-cache-dir -r requirements.txt

# Exponer el puerto 8000
EXPOSE 8000

# Comando para ejecutar la app FastAPI
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
