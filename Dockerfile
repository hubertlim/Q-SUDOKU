FROM nginx:alpine
LABEL maintainer="Q-SUDOKU"

RUN rm -rf /usr/share/nginx/html/*
COPY index.html style.css sudoku.js learn.js app.js /usr/share/nginx/html/
RUN chown -R nginx:nginx /usr/share/nginx/html

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:80/ || exit 1

EXPOSE 80
