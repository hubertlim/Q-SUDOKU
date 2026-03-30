FROM nginx:alpine

LABEL maintainer="Q-SUDOKU"
LABEL description="Minimalistic sudoku SPA"

# Remove default nginx content
RUN rm -rf /usr/share/nginx/html/*

# Copy application files
COPY index.html style.css sudoku.js app.js /usr/share/nginx/html/

# Use non-root user for security
RUN chown -R nginx:nginx /usr/share/nginx/html

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:80/ || exit 1

EXPOSE 80
